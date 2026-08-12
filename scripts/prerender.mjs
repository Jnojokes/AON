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

import { readFileSync, writeFileSync, statSync } from 'node:fs';
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
  email: 'hello@andreaonori.com',
  instagram: 'https://www.instagram.com/andrea__onori',
  instagramHandle: '@andrea__onori',
  city: 'Milan',
  region: 'Lombardy',
  country: 'IT',
  since: '2018',
  avatar: '/andrea.jpg',
  ogImage: '/media/og-cover.jpg',
  // Le testate citate sono quelle già dichiarate nell'header del sito
  // ("SELECTED BY VOGUE ITALIA · NUMÉRO · DOMUS"). Da confermare col cliente
  // prima di trattarle come fatto verificato nei dati strutturati.
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

const aboutSentences = [
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

// ── 1. Blocco HTML statico ───────────────────────────────────────────────────

const projectArticle = (p, aspect) => {
  const cover = coverOf(p);
  const alt = altOf(p);
  const meta = [p.location || p.loc, p.year, p.film].filter(Boolean);
  return `            <article class="pf-item">
              ${cover ? `<img src="${esc(abs(cover))}" alt="${esc(alt)}" style="aspect-ratio:${aspect}" loading="lazy" decoding="async">` : ''}
              <h3>${esc(p.title || 'Untitled')}</h3>
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
    const title = (typeof m === 'object' && m.title) || `Motion frame ${String(i + 1).padStart(2, '0')}`;
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
            <p>
              <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>
              <span aria-hidden="true"> · </span>
              <a href="${esc(SITE.instagram)}" rel="me noopener" target="_blank">${esc(SITE.instagramHandle)}</a>
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
    primaryImageOfPage: abs(SITE.ogImage),
    inLanguage: 'en',
  },
  {
    '@type': 'ProfessionalService',
    '@id': `${SITE.origin}/#service`,
    name: `${SITE.name} — Photography & Motion`,
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
    areaServed: [
      { '@type': 'City', name: 'Milan' },
      { '@type': 'AdministrativeArea', name: 'Lombardy' },
      { '@type': 'Country', name: 'Italy' },
    ],
    serviceType: SITE.disciplines,
    sameAs: [SITE.instagram],
  },
];

// Un CreativeWork per progetto distinto — collegato all'autore via @id.
for (const title of projectTitles) {
  const entries = [...feed, ...indexList].filter((p) => p.title === title);
  const first = entries[0];
  if (!first) continue;
  const cover = coverOf(first);
  const work = {
    '@type': 'Photograph',
    '@id': `${SITE.origin}/#work-${encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''))}`,
    name: title,
    creator: { '@id': personId },
    copyrightHolder: { '@id': personId },
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
      copyrightHolder: { '@id': personId },
      creditText: SITE.name,
      license: SITE.origin + '/',
    };
  }
  graph.push(work);
}

const jsonLd = { '@context': 'https://schema.org', '@graph': graph };

const jsonLdBlock = `        <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c').split('\n').map((l) => '        ' + l).join('\n')}
        </script>`;

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
  return hit ? altOf(hit) : `${SITE.name} — ${SITE.city}`;
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

## Selected projects
${yearRange ? `\nAll projects listed below: ${yearRange}.\n` : ''}
${indexList
  .map(
    (p) =>
      `- **${p.title}** — ${[p.location || p.loc, p.year].filter(Boolean).join(', ')}`
  )
  .join('\n')}

## Work index

| No. | Project | Location | Year | Format |
| --- | ------- | -------- | ---- | ------ |
${feed
  .map(
    (p, i) =>
      `| ${String(i + 1).padStart(2, '0')} | ${p.title || ''} | ${p.location || p.loc || ''} | ${p.year || ''} | ${p.film || ''} |`
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

// Le stesse frasi finiscono nel blocco statico E in window.AON_ABOUT, da cui il
// componente React <About/> renderizza. Un'unica sorgente per entrambi i render:
// è ciò che tiene il sito fuori dal territorio del cloaking.
const aboutBlock = `    <script>window.AON_ABOUT = ${JSON.stringify(aboutSentences).replace(/</g, '\\u003c')};</script>`;

let html = original;
html = replaceBetween(html, '<!-- PRERENDER:START -->', '<!-- PRERENDER:END -->', staticBlock, 'PRERENDER');
html = replaceBetween(html, '<!-- ABOUT:START -->', '<!-- ABOUT:END -->', aboutBlock, 'ABOUT');
html = replaceBetween(html, '<!-- JSONLD:START -->', '<!-- JSONLD:END -->', jsonLdBlock, 'JSONLD');

// Controlli di sanità prima di toccare il disco. Se uno solo fallisce non
// scriviamo niente: index.html resta quello committato, che è comunque valido.
const checks = [
  [html.includes('id="root"'), 'il div #root è sparito'],
  [(html.match(/<!-- PRERENDER:START -->/g) || []).length === 1, 'marker PRERENDER duplicati o mancanti'],
  [(html.match(/<!-- JSONLD:START -->/g) || []).length === 1, 'marker JSONLD duplicati o mancanti'],
  [html.includes('<h1>'), 'nessun h1 nel blocco statico'],
  [html.length > original.length * 0.9, 'output sospettosamente più corto del sorgente'],
  [feed.length > 0 || indexList.length > 0, 'media.json non contiene progetti'],
];
const failed = checks.filter(([ok]) => !ok).map(([, msg]) => msg);
if (failed.length) throw new Error('controlli falliti: ' + failed.join('; '));

writeFileSync(indexPath, html, 'utf8');
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap, 'utf8');
writeFileSync(join(ROOT, 'llms.txt'), llms, 'utf8');

const words = staticBlock.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
console.log(`✓ prerender — ${feed.length} progetti, ${series.length} serie, ${motion.length} motion`);
console.log(`✓ index.html — blocco statico di ~${words} parole leggibili senza JS`);
console.log(`✓ JSON-LD   — ${graph.length} nodi nel @graph`);
console.log(`✓ sitemap   — ${sitemapImages.length} immagini, lastmod ${lastmod}`);
console.log(`✓ llms.txt  — ${llms.split('\n').length} righe`);

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
