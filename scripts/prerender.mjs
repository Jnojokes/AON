#!/usr/bin/env node
/**
 * prerender.mjs — genera il contenuto statico del sito a partire da media.json.
 *
 * PERCHÉ ESISTE
 * Il sito è renderizzato interamente client-side (React + @babel/standalone che
 * compila JSX nel browser). Nel sorgente HTML `<div id="root">` è vuoto: chi non
 * esegue JavaScript vede una pagina bianca. Googlebot renderizza il JS e se la
 * cava, ma Bingbot e TUTTI i crawler AI (GPTBot, OAI-SearchBot, ClaudeBot,
 * Claude-SearchBot, PerplexityBot, …) no. Per ChatGPT, Claude, Perplexity e le
 * AI Overviews il sito era, letteralmente, vuoto.
 *
 * COSA FA
 * Legge media.json e riscrive quattro cose:
 *   1. il blocco HTML statico dentro #root  (marker PRERENDER:START/END)
 *   2. il JSON-LD @graph nell'<head>        (marker JSONLD:START/END)
 *   3. sitemap.xml, con image sitemap
 *   4. llms.txt, la versione pulita per i motori generativi
 *
 * React sostituisce i figli di #root al mount, quindi chi ha JS vede l'app
 * identica a prima. Il blocco statico NON è nascosto (niente display:none o
 * opacity:0): sarebbe indistinguibile dal cloaking per i sistemi antispam, ed è
 * comunque meglio così — l'utente su rete lenta vede i contenuti subito.
 *
 * SINCRONIA
 * Gira a ogni build Vercel. Ogni "Salva tutto" dal pannello /admin-edits
 * committa media.json → Vercel ridistribuisce → questo script rigenera tutto.
 * Il contenuto statico non può andare fuori sincrono con quello dinamico.
 *
 * Idempotente: rieseguirlo sullo stesso file dà lo stesso risultato.
 * Uso: node scripts/prerender.mjs
 */

import { readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Identità del sito ────────────────────────────────────────────────────────
// Fonte unica di verità: questi valori devono restare identici a quelli del
// footer, del JSON-LD e di llms.txt. La coerenza dell'entità (stesso nome,
// stessa città, stessi contatti ovunque) è ciò che permette a un LLM di
// collegare le menzioni sparse a una sola persona.
const SITE = {
  origin: 'https://www.andreaonori.com',
  name: 'Andrea Onori',
  role: 'Photographer & Filmmaker',
  email: 'video@andreaonori.com',
  instagram: 'https://www.instagram.com/andrea__onori',
  instagramHandle: '@andrea__onori',
  city: 'Milan',
  region: 'Lombardy',
  country: 'IT',
  // Le stesse coordinate mostrate nell'HUD del sito. Servono a "fotografo a
  // Milano" e alle risposte AI su base geografica: senza geo, un
  // LocalBusiness/ProfessionalService è collocato solo dal testo dell'indirizzo.
  geo: { lat: 45.4642, lon: 9.19 },
  since: '2018',
  // P. IVA: l'art. 7 del D.Lgs. 70/2003 la vuole facilmente accessibile.
  // Stava solo dentro l'informativa privacy; ora e' anche nel footer.
  vat: '02491850448',
  avatar: '/andrea.jpg',
  ogImage: '/media/og-cover.jpg',
  // Testate confermate dal cliente (settembre 2026). Compaiono nell'header del
  // sito, nella bio e nei dati strutturati: sono un segnale E-E-A-T, quindi la
  // fonte di verita' e' settings.seo.bio dal pannello e questo resta il
  // fallback se la bio venisse svuotata.
  published: ['Vogue Italia', 'Numéro', 'Domus'],
  disciplines: [
    'Fashion Photography',
    'Editorial Photography',
    'Campaign Photography',
    'Portrait Photography',
    'Motion',
    'Filmmaking',
  ],
};

// ── Utility ──────────────────────────────────────────────────────────────────

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const abs = (p) => {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  return SITE.origin + '/' + String(p).replace(/^\.?\//, '');
};

/** Stessa forma dell'helper altOf in index.html — gli alt devono coincidere
 *  tra versione statica e versione React. */
const altOf = (p) =>
  [p.title, p.film, p.location || p.loc, p.year].filter(Boolean).join(' — ');

const VIDEO_RE = /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/i;

/** Slug di un progetto. Usato per l'@id nel JSON-LD, per l'URL della pagina
 *  dedicata e per la voce in sitemap: deve essere calcolato in un posto solo,
 *  altrimenti le tre cose divergono e i riferimenti si rompono. */
const slugify = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Ricava un titolo leggibile dal nome del file. Serve dove il pannello non
 *  fornisce un titolo: meglio "GRETA STORYBOARD" che "Motion frame 03".
 *  Scarta il suffisso base-36 che il CMS aggiunge agli upload
 *  ("greta-storyboard-story-final-mqunwp71.jpeg" -> "GRETA STORYBOARD STORY FINAL"). */
const titleFromFilename = (src) => {
  if (!src) return '';
  const base = String(src).split('/').pop().replace(/\.[a-z0-9]+$/i, '');
  const words = base
    .split(/[-_]+/)
    .filter((w) => w && !/^m[a-z0-9]{7,}$/i.test(w) && !/^\d+$/.test(w))
    .filter((w) => !['story', 'final'].includes(w.toLowerCase()) || true);
  if (!words.length) return '';
  return words.join(' ').toUpperCase();
};

/** media.json ammette stringhe o oggetti; qui serve solo l'immagine di copertina. */
const coverOf = (item) => {
  if (!item) return '';
  if (typeof item === 'string') return VIDEO_RE.test(item) ? '' : item;
  if (item.poster) return item.poster;
  if (item.image) return item.image;
  if (item.url && !VIDEO_RE.test(item.url)) return item.url;
  if (Array.isArray(item.images) && item.images.length) return coverOf(item.images[0]);
  if (item.src && !VIDEO_RE.test(item.src)) return item.src;
  return '';
};

/** Sostituisce il testo tra due marker. Se i marker mancano, lascia il file
 *  intatto e avvisa: meglio un no-op rumoroso che una build che corrompe l'HTML. */
const replaceBetween = (source, startMarker, endMarker, replacement, label) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || end < start) {
    console.warn(`⚠️  marker ${label} non trovati — blocco saltato`);
    return source;
  }
  return (
    source.slice(0, start + startMarker.length) + '\n' + replacement + '\n        ' + source.slice(end)
  );
};

// ── Lettura dati ─────────────────────────────────────────────────────────────
//
// Da qui in poi tutto gira dentro build(), che è chiamata in fondo dentro un
// try/catch che esce SEMPRE con codice 0.
//
// Il motivo è una regressione che questo script introdurrebbe altrimenti: prima
// di adesso un media.json malformato rompeva solo il render lato client. Ora
// farebbe fallire la build, quindi il deploy non avverrebbe affatto, e il
// pannello direbbe "salvato" mentre il sito resta fermo alla versione
// precedente — senza che nessuno se ne accorga.
// Regola: questo script può rinunciare a rigenerare, mai bloccare un deploy.

function build() {

const media = JSON.parse(readFileSync(join(ROOT, 'media.json'), 'utf8'));

// ── Testi dal pannello ───────────────────────────────────────────────────────
// media.settings è ciò che /admin-edits salva. Qui interessano solo i campi che
// definiscono l'identità: nome, ruolo, contatti. Devono coincidere con quelli
// mostrati a schermo, altrimenti JSON-LD e pagina descrivono due entità diverse
// e nessun motore le collega. Un campo vuoto o assente lascia il default.
const settings = (media.settings && typeof media.settings === 'object') ? media.settings : {};
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

SITE.name = str((settings.seo || {}).author) || str((settings.footer || {}).name) || SITE.name;
SITE.email = str((settings.profile || {}).ctaEmail) || str((settings.footer || {}).emailValue) || SITE.email;
SITE.instagram = str((settings.footer || {}).socialUrl) || SITE.instagram;
SITE.instagramHandle = str((settings.footer || {}).socialValue) || SITE.instagramHandle;

const feed = Array.isArray(media.feed) ? media.feed : [];
const motion = Array.isArray(media.motion) ? media.motion : [];
const series = Array.isArray(media.series) ? media.series : [];
const indexList = Array.isArray(media.index) ? media.index : [];

/** Titoli di progetto distinti, nell'ordine in cui compaiono. Serve sia per le
 *  frasi dell'about sia per llms.txt: feed[] contiene ripetizioni (SANTONI BTO
 *  compare tre volte, come tre servizi diversi dello stesso progetto). */
const projectTitles = [...new Set([...indexList, ...feed].map((p) => p.title).filter(Boolean))];

const locations = [...new Set(feed.map((p) => p.loc || p.location).filter(Boolean))];
const years = [...new Set([...feed, ...indexList].map((p) => p.year).filter(Boolean))].sort();

// ── Testo "answer capsule" ───────────────────────────────────────────────────
// Frasi brevi, fattuali e autoconclusive: è la forma che i modelli linguistici
// estraggono e citano meglio. Niente prosa di marketing, niente frasi che
// dipendono dal contesto della frase precedente.

const yearRange = years.length
  ? years.length === 1
    ? years[0]
    : `${years[0]}–${years[years.length - 1]}`
  : '';

// "Descrizione per SEO & Motori AI" dal pannello: ogni riga non vuota diventa
// un paragrafo. Se il campo è vuoto si torna al testo generato dai progetti,
// che resta un default sensato ma non dice nulla che i dati non dicano già.
const customBio = String(((settings.seo || {}).bio) || '')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

const autoSentences = [
  `${SITE.name} is a photographer and filmmaker based in ${SITE.city}, Italy.`,
  `He works across fashion, editorial and campaign imagery, producing both stills and motion for brands and magazines.`,
  `He has been working professionally since ${SITE.since}.`,
  SITE.published.length
    ? `His work has been selected by ${SITE.published.join(', ')}.`
    : '',
  projectTitles.length
    ? `Recent projects include ${projectTitles.slice(0, 6).join(', ')}.`
    : '',
  locations.length
    ? `Shoots have taken place in ${locations.join(', ')}.`
    : '',
  `He is available for commissions and can be reached at ${SITE.email}.`,
].filter(Boolean);

const aboutSentences = customBio.length ? customBio : autoSentences;

// ── 1. Blocco HTML statico ───────────────────────────────────────────────────

const projectArticle = (p, aspect) => {
  const cover = coverOf(p);
  const alt = altOf(p);
  const meta = [p.location || p.loc, p.year, p.film].filter(Boolean);
  // Il titolo e' un link alla pagina del progetto. Senza questo le pagine in
  // work/ sarebbero orfane: raggiungibili solo dalla sitemap, che i crawler
  // usano come suggerimento, non come percorso. Un link vero dalla home e'
  // il modo in cui vengono davvero scoperte e a cui viene passata autorita'.
  const slug = slugify(p.title);
  const titleHtml = slug
    ? `<a href="/work/${slug}">${esc(p.title || 'Untitled')}</a>`
    : esc(p.title || 'Untitled');
  return `            <article class="pf-item">
              ${cover ? `<img src="${esc(abs(cover))}" alt="${esc(alt)}" style="aspect-ratio:${aspect}" loading="lazy" decoding="async">` : ''}
              <h3>${titleHtml}</h3>
              ${meta.length ? `<p class="pf-meta">${esc(meta.join(' · '))}</p>` : ''}
            </article>`;
};

const staticBlock = `        <div class="prerender-fallback">
          <header class="pf-header">
            <p class="pf-eyebrow">Photographer · Based in ${esc(SITE.city)}</p>
            <h1>${esc(SITE.name)}</h1>
            <p class="pf-role">${esc(SITE.role)} — Editorial · Portrait · Personal work</p>
            <div class="pf-about">
${aboutSentences.map((s) => `              <p>${esc(s)}</p>`).join('\n')}
            </div>
            <p class="pf-contact">
              <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>
              <span aria-hidden="true"> · </span>
              <a href="${esc(SITE.instagram)}" rel="me noopener" target="_blank">${esc(SITE.instagramHandle)}</a>
            </p>
          </header>

          <main class="pf-main">
${feed.length ? `            <section class="pf-section" aria-labelledby="pf-work">
              <h2 id="pf-work">Selected work</h2>
              <div class="pf-grid">
${feed.map((p) => projectArticle(p, '4 / 5')).join('\n')}
              </div>
            </section>` : ''}

${series.length ? `            <section class="pf-section" aria-labelledby="pf-series">
              <h2 id="pf-series">Series</h2>
              <div class="pf-grid">
${series
  .map((s) => {
    const cover = coverOf(s);
    const count = (s.images || []).length;
    return `            <article class="pf-item">
              ${cover ? `<img src="${esc(abs(cover))}" alt="${esc(s.label || s.id)} — series by ${esc(SITE.name)}" style="aspect-ratio:1 / 1" loading="lazy" decoding="async">` : ''}
              <h3>${esc(s.label || s.id)}</h3>
              ${count ? `<p class="pf-meta">${count} image${count === 1 ? '' : 's'}</p>` : ''}
            </article>`;
  })
  .join('\n')}
              </div>
            </section>` : ''}

${motion.length ? `            <section class="pf-section" aria-labelledby="pf-motion">
              <h2 id="pf-motion">Motion</h2>
              <div class="pf-grid">
${motion
  .map((m, i) => {
    const cover = coverOf(m);
    // Se il pannello non da' un titolo, si ricava dal nome del file: quasi
    // sempre contiene il progetto ("story-greta.png" -> "GRETA"). Un alt come
    // "Motion frame 03" non dice nulla ne' a un motore ne' a chi usa uno
    // screen reader; il nome del file, almeno, e' informazione vera.
    const title =
      (typeof m === 'object' && m.title) ||
      titleFromFilename(cover) ||
      `Motion frame ${String(i + 1).padStart(2, '0')}`;
    return `            <article class="pf-item">
              ${cover ? `<img src="${esc(abs(cover))}" alt="${esc(title)} — motion still by ${esc(SITE.name)}, ${esc(SITE.city)}" style="aspect-ratio:9 / 16" loading="lazy" decoding="async">` : ''}
              <h3>${esc(title)}</h3>
            </article>`;
  })
  .join('\n')}
              </div>
            </section>` : ''}

${indexList.length ? `            <section class="pf-section" aria-labelledby="pf-index">
              <h2 id="pf-index">Index</h2>
              <table class="pf-table">
                <thead><tr><th scope="col">No.</th><th scope="col">Title</th><th scope="col">Location</th><th scope="col">Year</th></tr></thead>
                <tbody>
${indexList
  .map(
    (p) =>
      `                  <tr><td>${esc(p.num || '')}</td><td>${esc(p.title || '')}</td><td>${esc(p.location || p.loc || '')}</td><td>${esc(p.year || '')}</td></tr>`
  )
  .join('\n')}
                </tbody>
              </table>
            </section>` : ''}
          </main>

          <footer class="pf-footer">
            <p>© ${new Date().getFullYear()} ${esc(SITE.name)} — Studio ${esc(SITE.city)}, Italy</p>
            <p>P. IVA ${esc(SITE.vat)}</p>
            <p>
              <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>
              <span aria-hidden="true"> · </span>
              <a href="${esc(SITE.instagram)}" rel="me noopener" target="_blank">${esc(SITE.instagramHandle)}</a>
              <span aria-hidden="true"> · </span>
              <a href="/privacy">Privacy &amp; Cookie Policy</a>
              <span aria-hidden="true"> · </span>
              <a href="/note-legali">Note legali</a>
            </p>
          </footer>
        </div>`;

// ── 2. JSON-LD @graph ────────────────────────────────────────────────────────
// Un solo grafo con nodi collegati per @id, invece di blocchi scollegati: è così
// che Google e i motori generativi capiscono che Person, WebSite e servizio sono
// la stessa entità.
//
// Volutamente NON incluso:
//  · SearchAction — il sito non ha una ricerca interna, dichiararla sarebbe falso
//  · FAQPage / AggregateRating — non ci sono FAQ né recensioni reali
//  · BreadcrumbList — è un sito monopagina
//  · VideoObject — motion[] oggi contiene PNG, non video. Si aggiunge da solo
//    quando i video Aruba entreranno nei dati (vedi il ramo condizionale sotto).

const personId = `${SITE.origin}/#person`;
const siteId = `${SITE.origin}/#website`;
const pageId = `${SITE.origin}/#webpage`;

const graph = [
  {
    '@type': 'Person',
    '@id': personId,
    name: SITE.name,
    url: SITE.origin + '/',
    image: abs(SITE.avatar),
    jobTitle: SITE.role,
    description: aboutSentences.slice(0, 3).join(' '),
    email: `mailto:${SITE.email}`,
    nationality: { '@type': 'Country', name: 'Italy' },
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    sameAs: [SITE.instagram],
    knowsAbout: SITE.disciplines,
  },
  {
    '@type': 'WebSite',
    '@id': siteId,
    url: SITE.origin + '/',
    name: `${SITE.name} — ${SITE.role}`,
    inLanguage: 'en',
    publisher: { '@id': personId },
  },
  {
    '@type': 'WebPage',
    '@id': pageId,
    url: SITE.origin + '/',
    name: `${SITE.name} — Fashion Photographer & Filmmaker, Milan`,
    isPartOf: { '@id': siteId },
    about: { '@id': personId },
    description: aboutSentences.slice(0, 3).join(' '),
    primaryImageOfPage: abs(SITE.ogImage),
    inLanguage: 'en',
  },
  {
    // ProfessionalService è una sottoclasse di LocalBusiness: dichiararlo qui
    // copre sia le ricerche "fotografo a Milano" sia le risposte AI su base
    // geografica, senza duplicare un secondo nodo per la stessa entità.
    '@type': 'ProfessionalService',
    '@id': `${SITE.origin}/#service`,
    name: `${SITE.name} — Photography & Motion`,
    description: aboutSentences.join(' '),
    url: SITE.origin + '/',
    image: abs(SITE.ogImage),
    founder: { '@id': personId },
    employee: { '@id': personId },
    email: `mailto:${SITE.email}`,
    priceRange: '$$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: SITE.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE.geo.lat,
      longitude: SITE.geo.lon,
    },
    areaServed: [
      { '@type': 'City', name: 'Milan' },
      { '@type': 'AdministrativeArea', name: 'Lombardy' },
      { '@type': 'Country', name: 'Italy' },
    ],
    serviceType: SITE.disciplines,
    sameAs: [SITE.instagram],
  },
];

// Vocabolario IPTC per il tipo di sorgente digitale: è lo standard con cui si
// dichiara che un'immagine è stata generata o rielaborata con AI. schema.org non
// ha una proprietà dedicata, quindi passa da additionalProperty/PropertyValue.
const AI_PROPERTY = {
  '@type': 'PropertyValue',
  propertyID: 'https://cv.iptc.org/newscodes/digitalsourcetype/',
  name: 'digitalSourceType',
  value: 'compositeWithTrainedAlgorithmicMedia',
};
// La provenienza è una proprietà del FILE, non del post: la stessa foto può
// comparire in più post (la copertina di feed[1] e quella di index[1] sono lo
// stesso file), e non può essere AI in uno e non nell'altro. Quindi le
// copertine marcate si raccolgono prima, e poi si applicano ovunque quel file
// compaia — così il grafo non contiene mai due affermazioni opposte sullo
// stesso contentUrl.
const aiCovers = new Set(
  [...feed, ...indexList]
    .filter((p) => p.ai)
    .map((p) => abs(coverOf(p)))
    .filter(Boolean)
);
// contentUrl già dichiarate, per non emettere due volte lo stesso file.
const aiStamped = new Set();

// Un CreativeWork per progetto distinto — collegato all'autore via @id.
for (const title of projectTitles) {
  const entries = [...feed, ...indexList].filter((p) => p.title === title);
  const first = entries[0];
  if (!first) continue;
  const cover = coverOf(first);
  const work = {
    '@type': 'Photograph',
    '@id': `${SITE.origin}/work/${slugify(title)}#work`,
    name: title,
    // Solo creator, non copyrightHolder: la paternita' dello scatto e' sempre di
    // Andrea, la titolarita' dei diritti economici sul lavoro commissionato e'
    // spesso ceduta al brand per contratto. Dichiararla a macchina su ogni opera
    // sarebbe un'affermazione che il sito non puo' sostenere.
    creator: { '@id': personId },
    isPartOf: { '@id': siteId },
  };
  const year = entries.map((e) => e.year).find(Boolean);
  if (year) work.dateCreated = String(year);
  const loc = entries.map((e) => e.location || e.loc).find(Boolean);
  if (loc) work.contentLocation = { '@type': 'Place', name: loc };
  const genre = entries.map((e) => e.film).find(Boolean);
  if (genre) work.genre = genre;
  if (cover) {
    work.image = {
      '@type': 'ImageObject',
      contentUrl: abs(cover),
      creator: { '@id': personId },
      creditText: SITE.name,
      license: SITE.origin + '/note-legali',
    };
  }
  // Spunta "Contenuto Enhanced con AI" nel pannello. Dichiararla nei dati
  // strutturati non è un vezzo: è la stessa informazione che la dicitura
  // mostra all'utente, in forma leggibile dalle macchine.
  //
  // Il confronto è sulla copertina effettiva del nodo, non su entries.some():
  // i titoli si ripetono (SANTONI BTO sono tre servizi diversi) mentre
  // work.image punta a UNA copertina sola. Aggregando sul gruppo, spuntare uno
  // scatto marchiava come AI la foto di un altro — con tanto di contentUrl:
  // una dichiarazione di provenienza falsa su un file specifico, per giunta
  // contraddetta dalla griglia e da llms.txt, che ragionano per singolo post.
  if (work.image && aiCovers.has(work.image.contentUrl)) {
    work.additionalProperty = AI_PROPERTY;
    work.image.additionalProperty = AI_PROPERTY;
    aiStamped.add(work.image.contentUrl);
  }
  graph.push(work);
}

// I nodi Photograph sono per titolo, il flag AI è per post: un post marcato che
// non sia il primo del suo gruppo non avrebbe dove essere dichiarato, e la
// dichiarazione sparirebbe dai dati strutturati pur restando sul sito e in
// llms.txt. Qui ogni copertina marcata e non ancora coperta sopra ottiene il
// proprio ImageObject: un nodo per file reale, nessuna attribuzione allargata.
for (const p of [...feed, ...indexList]) {
  if (!p.ai) continue;
  const cover = coverOf(p);
  if (!cover) continue;
  const url = abs(cover);
  if (aiStamped.has(url)) continue;
  aiStamped.add(url);
  graph.push({
    '@type': 'ImageObject',
    '@id': `${url}#ai`,
    contentUrl: url,
    name: altOf(p) || p.title || '',
    creator: { '@id': personId },
    creditText: SITE.name,
    license: SITE.origin + '/note-legali',
    additionalProperty: AI_PROPERTY,
  });
}

const jsonLd = { '@context': 'https://schema.org', '@graph': graph };

const jsonLdBlock = `        <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c').split('\n').map((l) => '        ' + l).join('\n')}
        </script>`;

// ── 2b. Blocco sr-only con la descrizione ────────────────────────────────────
// Sta fuori da #root, quindi React non lo cancella al mount: è l'unica copia
// della descrizione che resta nel DOM anche dopo il render dell'app.
// È nascosto alla vista (.visually-hidden) ma NON a screen reader e crawler, ed
// è lo stesso testo che il blocco statico qui sopra mostra in chiaro a chi non
// esegue JavaScript. Nessuno vede una versione della pagina che gli altri non
// possono vedere: è la differenza fra testo fuori schermo e cloaking.

// Blocco di riferimento fuori da #root. NON contiene piu' la bio: quella e' ora
// resa visibile dal componente <About/> in index.html, dallo stesso
// settings.seo.bio. Prima le frasi vivevano solo qui, clippate a 1x1px, quindi
// leggibili dai crawler e da nessun visitatore — testo nascosto a tutti gli
// effetti. Qui restano solo dati di riferimento gia' visibili altrove nella
// pagina (contatti nel footer, progetti nelle griglie): un riepilogo compatto
// per i crawler che non eseguono JS, non contenuto esclusivo.
const seoBioBlock = `    <section class="visually-hidden" id="aon-seo-bio" aria-label="Reference — ${esc(SITE.name)}">
      <h2>${esc(SITE.name)} — ${esc(SITE.role)}, ${esc(SITE.city)}, Italy</h2>
      <p>Contact: <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a> · <a href="${esc(SITE.instagram)}" rel="me noopener">${esc(SITE.instagramHandle)}</a></p>
      <p>Disciplines: ${esc(SITE.disciplines.join(', '))}.</p>
${projectTitles.length ? `      <p>Projects: ${esc(projectTitles.join(', '))}.</p>` : ''}
${locations.length ? `      <p>Locations: ${esc(locations.join(', '))}.</p>` : ''}
    </section>`;

// ── 2-bis. Pagine per progetto ───────────────────────────────────────────────
//
// Il sito era una pagina sola: due URL in tutto e circa 400 parole. Per un
// motore di ricerca e' poca superficie; per un motore generativo e' quasi
// nulla, perche' non c'e' un solo testo lungo che possa essere citato per
// esteso. Una pagina per progetto risolve entrambe le cose con lo stesso
// contenuto che il portfolio ha gia'.
//
// Sono pagine statiche pure, senza React: non hanno bisogno di interattivita',
// e cosi' sono leggibili da chiunque, anche dai crawler che non eseguono JS.

const projectPages = projectTitles
  .map((title) => {
    const entries = [...feed, ...indexList].filter((p) => p.title === title);
    const first = entries[0];
    if (!first) return null;
    const slug = slugify(title);
    if (!slug) return null;

    // Tutte le immagini del progetto, senza duplicati e senza i video.
    const images = [...new Set(
      entries.flatMap((e) => [coverOf(e), ...((e.images || []).map(coverOf))]).filter(Boolean)
    )];

    const year = entries.map((e) => e.year).find(Boolean) || '';
    const loc = entries.map((e) => e.location || e.loc).find(Boolean) || '';
    const film = entries.map((e) => e.film).find(Boolean) || '';
    const desc = entries.map((e) => e.description).find((d) => typeof d === 'string' && d.trim());
    const ai = entries.some((e) => e.ai);

    // Senza descrizione dal pannello si genera una frase fattuale dai dati che
    // ci sono. E' poco, e il pannello lo dice a chi scrive — ma e' meglio di
    // una pagina muta, ed e' comunque vero.
    // Senza descrizione dal pannello si compone un testo con i soli fatti
    // disponibili. Non e' riempitivo: ogni frase e' verificabile dai dati del
    // sito. Resta comunque una pagina piu' povera, e il pannello lo dice a chi
    // scrive — ma e' meglio di una pagina muta.
    const paragraphs = desc
      ? desc.split(/\n+/).map((t) => t.trim()).filter(Boolean)
      : [
          [
            `${title} is a ${film ? film.toLowerCase().replace(/\s*—\s*/g, ' ') + ' ' : ''}project`,
            ` by ${SITE.name}, ${SITE.role.toLowerCase()} based in ${SITE.city}, Italy`,
            loc ? `, photographed in ${loc}` : '',
            year ? ` in ${year}` : '',
            '.',
          ].join(''),
          `${SITE.name} works across fashion, editorial and campaign imagery, producing both stills and motion for brands and magazines. He has been working professionally since ${SITE.since}.`,
          images.length
            ? `This project page collects ${images.length} image${images.length === 1 ? '' : 's'} from the shoot.`
            : '',
          `For licensing, full production credits or commissions, contact ${SITE.email}.`,
        ].filter(Boolean);

    return { title, slug, images, year, loc, film, ai, paragraphs, hasDesc: Boolean(desc) };
  })
  .filter(Boolean);

const projectPageHtml = (pg, others = []) => {
  const url = `${SITE.origin}/work/${pg.slug}`;
  const cover = pg.images[0] || SITE.ogImage;
  const testo = pg.paragraphs.join(' ');
  const metaDesc = (testo.length > 155 ? testo.slice(0, 152).replace(/\s+\S*$/, '') + '…' : testo);

  // Un grafo per pagina: l'opera, il suo autore, la briciola di navigazione.
  // BreadcrumbList qui e' legittimo — prima non lo era, perche' non esisteva
  // una gerarchia di pagine.
  const graph = [
    {
      '@type': 'CreativeWork',
      '@id': `${url}#work`,
      name: pg.title,
      url,
      description: testo,
      creator: { '@id': `${SITE.origin}/#person` },
      isPartOf: { '@id': `${SITE.origin}/#website` },
      ...(pg.year ? { dateCreated: String(pg.year) } : {}),
      ...(pg.loc ? { contentLocation: { '@type': 'Place', name: pg.loc } } : {}),
      ...(pg.film ? { genre: pg.film } : {}),
      ...(pg.images.length ? {
        image: pg.images.slice(0, 12).map((src) => ({
          '@type': 'ImageObject',
          contentUrl: abs(src),
          creditText: SITE.name,
          license: `${SITE.origin}/note-legali`,
        })),
      } : {}),
      ...(pg.ai ? { additionalProperty: AI_PROPERTY } : {}),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE.name, item: `${SITE.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Work', item: `${SITE.origin}/#work` },
        { '@type': 'ListItem', position: 3, name: pg.title },
      ],
    },
  ];

  const meta = [pg.loc, pg.year, pg.film].filter(Boolean);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(pg.title)} — ${esc(SITE.name)}</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#000000">
<meta name="tdm-reservation" content="1">
<meta name="tdm-policy" content="${SITE.origin}/note-legali">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="${esc(pg.title)} — ${esc(SITE.name)}">
<meta property="og:description" content="${esc(metaDesc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(abs(cover))}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
  :root{--bg:#000;--fg:#fff;--mute:#8a8a8a;--line:rgba(255,255,255,0.14);--accent:#ff4a1c}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:var(--bg);color:var(--fg)}
  body{font-family:'Bricolage Grotesque',sans-serif;line-height:1.6}
  .wrap{max-width:1100px;margin:0 auto;padding:40px 24px 96px}
  .mono{font-family:'JetBrains Mono',monospace;letter-spacing:.12em;text-transform:uppercase}
  a{color:var(--fg)}
  .back{font-size:10px;color:var(--mute);text-decoration:none;border-bottom:1px solid var(--line);padding-bottom:2px}
  h1{font-family:'Archivo Black',sans-serif;font-size:clamp(34px,7vw,74px);line-height:.95;text-transform:uppercase;margin:22px 0 10px}
  .meta{font-size:10px;color:var(--mute);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:26px}
  .meta span:not(:last-child)::after{content:" ·";color:var(--line)}
  .lede{max-width:68ch;margin-bottom:34px}
  .lede p{font-size:15px;color:var(--mute);margin-bottom:10px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
  .grid img{width:100%;height:auto;display:block;background:#0a0a0a}
  .ai{display:inline-block;font-size:9px;border:1px solid var(--accent);color:var(--accent);padding:2px 6px;margin-bottom:14px}
  .altri{margin-top:52px;padding-top:20px;border-top:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap}
  .altri a{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute);text-decoration:none;border:1px solid var(--line);padding:7px 11px}
  .altri a:hover{color:var(--fg);border-color:var(--fg)}
  footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--line);font-size:10px;color:var(--mute);display:flex;gap:16px;flex-wrap:wrap}
  footer a{color:var(--mute);text-decoration:none}
</style>
<script type="application/ld+json">
${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2)}
</script>
</head>
<body>
<div class="wrap">
  <a class="back mono" href="/">← ${esc(SITE.name)}</a>
  <h1>${esc(pg.title)}</h1>
  <div class="meta mono">${meta.map((m) => `<span>${esc(m)}</span>`).join('')}</div>
  ${pg.ai ? '<div class="ai mono">◇ AI-enhanced</div>' : ''}
  <div class="lede">
${pg.paragraphs.map((t) => `    <p>${esc(t)}</p>`).join('\n')}
  </div>
  <div class="grid">
${pg.images.map((src, i) => `    <img src="${esc(abs(src))}" alt="${esc(pg.title)}${pg.film ? ' — ' + esc(pg.film) : ''}${pg.loc ? ' — ' + esc(pg.loc) : ''}${pg.year ? ' — ' + esc(pg.year) : ''}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">`).join('\n')}
  </div>
  ${others.length ? `<nav class="altri">
    <div class="mono" style="font-size:10px;color:var(--mute);margin-bottom:10px">Altri progetti</div>
    ${others.map((o) => `<a href="/work/${o.slug}">${esc(o.title)}</a>`).join('\n    ')}
  </nav>` : ''}
  <footer>
    <a href="/">← Tutti i progetti</a>
    <a href="mailto:${esc(SITE.email)}?subject=${encodeURIComponent('Inquiry — ' + pg.title)}">${esc(SITE.email)}</a>
    <a href="${esc(SITE.instagram)}" rel="me noopener">${esc(SITE.instagramHandle)}</a>
    <a href="/note-legali">Note legali</a>
    <span>© ${new Date().getFullYear()} ${esc(SITE.name)} — P. IVA ${esc(SITE.vat)}</span>
  </footer>
</div>
</body>
</html>
`;
};

// ── 3. sitemap.xml ───────────────────────────────────────────────────────────
// Con image sitemap: per un portfolio fotografico Google Images è un canale
// reale, e le immagini non sono raggiungibili senza eseguire il JS.

// lastmod viene da media.updatedAt, che api/save.js stampa lato server a ogni
// salvataggio dal pannello. NON dal mtime del file: su Vercel il repo è appena
// clonato, quindi il mtime è l'ora del clone e ogni deploy produrrebbe un
// lastmod nuovo anche senza modifiche ai contenuti. Google riconosce i lastmod
// inaffidabili e smette di considerarli.
// Fallback al mtime solo per il primo giro, finché updatedAt non esiste.
const lastmod = (
  typeof media.updatedAt === 'string' && /^\d{4}-\d{2}-\d{2}/.test(media.updatedAt)
    ? media.updatedAt
    : statSync(join(ROOT, 'media.json')).mtime.toISOString()
).slice(0, 10);

const sitemapImages = [...new Set(
  [
    ...feed.flatMap((p) => [coverOf(p), ...(p.images || []).map(coverOf)]),
    ...series.flatMap((s) => [coverOf(s), ...(s.images || []).map(coverOf)]),
    ...motion.map(coverOf),
    ...indexList.map(coverOf),
    SITE.avatar,
  ].filter(Boolean)
)];

const titleForImage = (src) => {
  const hit = [...feed, ...indexList].find(
    (p) => coverOf(p) === src || (p.images || []).map(coverOf).includes(src)
  );
  if (hit) return altOf(hit);

  // Le slide delle serie e i motion non stanno in feed/indexList: prima
  // cadevano tutte sul generico "Andrea Onori — Milan", 19 immagini su 49.
  // Un titolo ripetuto identico su decine di immagini non aiuta Google Images.
  const serie = series.find(
    (s) => coverOf(s) === src || (s.images || []).map(coverOf).includes(src)
  );
  if (serie && serie.label) return `${serie.label} — series by ${SITE.name}, ${SITE.city}`;

  const mo = motion.find((m) => coverOf(m) === src);
  if (mo) {
    const t = (typeof mo === 'object' && mo.title) || titleFromFilename(src);
    if (t) return `${t} — motion still by ${SITE.name}, ${SITE.city}`;
  }

  const guess = titleFromFilename(src);
  return guess ? `${guess} — ${SITE.name}, ${SITE.city}` : `${SITE.name} — ${SITE.city}`;
};

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE.origin}/</loc>
    <lastmod>${lastmod}</lastmod>
${sitemapImages
  .map(
    (src) => `    <image:image>
      <image:loc>${esc(abs(src))}</image:loc>
      <image:title>${esc(titleForImage(src))}</image:title>
    </image:image>`
  )
  .join('\n')}
  </url>
  <url>
    <loc>${SITE.origin}/privacy</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
  <url>
    <loc>${SITE.origin}/note-legali</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
${projectPages.map((pg) => `  <url>
    <loc>${SITE.origin}/work/${pg.slug}</loc>
    <lastmod>${lastmod}</lastmod>
${pg.images.slice(0, 12).map((src, i) => `    <image:image>
      <image:loc>${esc(abs(src))}</image:loc>
      <image:title>${esc(titleForImage(src))}${pg.images.length > 1 ? ` — frame ${String(i + 1).padStart(2, '0')}` : ''}</image:title>
    </image:image>`).join('\n')}
  </url>`).join('\n')}
</urlset>
`;

// ── 4. llms.txt ──────────────────────────────────────────────────────────────
// Versione pulita e strutturata per i motori generativi: nessuna navigazione,
// nessun markup, solo fatti in markdown. È la forma che gli LLM estraggono
// meglio, e resta sincronizzata perché è generata dalla stessa fonte.

const llms = `# ${SITE.name}

> ${SITE.role} based in ${SITE.city}, Italy. Fashion, editorial and campaign imagery — stills and motion for brands and magazines.

${aboutSentences.join('\n\n')}

## Contact

- Email: ${SITE.email}
- Instagram: ${SITE.instagram}
- Website: ${SITE.origin}/
- Studio: ${SITE.city}, Italy

## Disciplines

${SITE.disciplines.map((d) => `- ${d}`).join('\n')}

## Project pages
${yearRange ? `\nAll projects listed below: ${yearRange}.\n` : ''}
${projectPages
  .map(
    (pg) =>
      `- [${pg.title}](${SITE.origin}/work/${pg.slug}): ${[pg.loc, pg.year, pg.film].filter(Boolean).join(', ')}${pg.hasDesc ? '' : ' (no written description yet)'}`
  )
  .join('\n')}

## Selected projects
${indexList
  .map(
    (p) =>
      `- **${p.title}** — ${[p.location || p.loc, p.year].filter(Boolean).join(', ')}`
  )
  .join('\n')}

## Work index

| No. | Project | Location | Year | Format | AI-enhanced |
| --- | ------- | -------- | ---- | ------ | ----------- |
${feed
  .map(
    (p, i) =>
      `| ${String(i + 1).padStart(2, '0')} | ${p.title || ''} | ${p.location || p.loc || ''} | ${p.year || ''} | ${p.film || ''} | ${p.ai ? 'yes' : 'no'} |`
  )
  .join('\n')}

## Series

${series.map((s) => `- **${s.label || s.id}** — ${(s.images || []).length} images`).join('\n')}

---

Generated from media.json. Canonical source: ${SITE.origin}/
`;

// ── Scrittura ────────────────────────────────────────────────────────────────

const indexPath = join(ROOT, 'index.html');
const original = readFileSync(indexPath, 'utf8');

let html = original;
html = replaceBetween(html, '<!-- PRERENDER:START -->', '<!-- PRERENDER:END -->', staticBlock, 'PRERENDER');
html = replaceBetween(html, '<!-- SEOBIO:START -->', '<!-- SEOBIO:END -->', seoBioBlock, 'SEOBIO');
html = replaceBetween(html, '<!-- JSONLD:START -->', '<!-- JSONLD:END -->', jsonLdBlock, 'JSONLD');

// Controlli di sanità prima di toccare il disco. Se uno solo fallisce non
// scriviamo niente: index.html resta quello committato, che è comunque valido.
const checks = [
  [html.includes('id="root"'), 'il div #root è sparito'],
  [(html.match(/<!-- PRERENDER:START -->/g) || []).length === 1, 'marker PRERENDER duplicati o mancanti'],
  [(html.match(/<!-- JSONLD:START -->/g) || []).length === 1, 'marker JSONLD duplicati o mancanti'],
  [(html.match(/<!-- SEOBIO:START -->/g) || []).length === 1, 'marker SEOBIO duplicati o mancanti'],
  [html.includes('class="visually-hidden" id="aon-seo-bio"'), 'blocco sr-only della descrizione non generato'],
  [html.includes('<h1>'), 'nessun h1 nel blocco statico'],
  [html.length > original.length * 0.9, 'output sospettosamente più corto del sorgente'],
  [feed.length > 0 || indexList.length > 0, 'media.json non contiene progetti'],
];
const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg);
if (failed.length) throw new Error('controlli falliti: ' + failed.join('; '));

writeFileSync(indexPath, html, 'utf8');
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(join(ROOT, 'llms.txt'), llms, 'utf8');

// Le pagine progetto: una cartella work/ con un file per progetto.
// cleanUrls di Vercel le serve come /work/<slug>, senza estensione.
mkdirSync(join(ROOT, 'work'), { recursive: true });
for (const pg of projectPages) {
  const others = projectPages.filter((o) => o.slug !== pg.slug).slice(0, 6);
  writeFileSync(join(ROOT, 'work', `${pg.slug}.html`), projectPageHtml(pg, others), 'utf8');
}

const words = staticBlock.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
console.log(`✓ prerender — ${feed.length} progetti, ${series.length} serie, ${motion.length} motion`);
console.log(`✓ index.html — blocco statico di ~${words} parole leggibili senza JS`);
console.log(`✓ JSON-LD   — ${graph.length} nodi nel @graph`);
console.log(`✓ about     — ${aboutSentences.length} frasi ${customBio.length ? '(dal pannello)' : '(generate dai progetti)'}`);
console.log(`✓ sitemap   — ${sitemapImages.length} immagini, lastmod ${lastmod}`);
console.log(`✓ llms.txt  — ${llms.split('\n').length} righe`);
const conDesc = projectPages.filter((p) => p.hasDesc).length;
console.log(
  `✓ work/     — ${projectPages.length} pagine progetto` +
  (conDesc < projectPages.length
    ? ` (${conDesc} con descrizione, ${projectPages.length - conDesc} da scrivere dal pannello)`
    : ' (tutte con descrizione)')
);

} // fine build()

// ── Entrypoint ───────────────────────────────────────────────────────────────
// Esce sempre 0. Un errore qui deve degradare la qualità SEO del deploy,
// non impedire il deploy.
try {
  build();
} catch (err) {
  console.error('');
  console.error('╭─────────────────────────────────────────────────────────────╮');
  console.error('│  PRERENDER NON ESEGUITO — il deploy prosegue comunque.       │');
  console.error('│  Il sito resta online con l\'ultimo index.html committato,    │');
  console.error('│  ma senza contenuto aggiornato per i crawler senza JS.       │');
  console.error('╰─────────────────────────────────────────────────────────────╯');
  console.error(String(err && err.stack ? err.stack : err));
  console.error('');
  process.exit(0);
}
