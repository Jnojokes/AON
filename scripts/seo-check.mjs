#!/usr/bin/env node
/**
 * seo-check.mjs — controllo tecnico SEO/GEO di un sito già online.
 *
 * Non misura il posizionamento (quello sta in Search Console e nel tempo):
 * misura le PRECONDIZIONI, cioè tutto ciò che deve essere a posto perché il
 * posizionamento sia possibile. È la parte che si può verificare in modo
 * oggettivo e ripetibile, e quella che si rompe in silenzio dopo un deploy.
 *
 * Uso:  node scripts/seo-check.mjs [url]
 *       node scripts/seo-check.mjs http://localhost:4000
 * Default: https://www.andreaonori.com
 */
const BASE = (process.argv[2] || 'https://www.andreaonori.com').replace(/\/$/, '');

let pass = 0, warn = 0, fail = 0;
const ok   = (m, x = '') => { pass++; console.log(`  ✅ ${m}${x ? `  ${x}` : ''}`); };
const wn   = (m, x = '') => { warn++; console.log(`  ⚠️  ${m}${x ? `  ${x}` : ''}`); };
const no   = (m, x = '') => { fail++; console.log(`  ❌ ${m}${x ? `  ${x}` : ''}`); };
const head = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

const get = async (path) => {
  const r = await fetch(BASE + path, { redirect: 'follow', headers: { 'User-Agent': 'AON-seo-check' } });
  return { status: r.status, headers: r.headers, body: await r.text(), url: r.url };
};

console.log(`\nControllo SEO/GEO — ${BASE}`);

// ── 1. Raggiungibilità e header ──────────────────────────────────────────────
head('1. Risposta e header');
const home = await get('/');
home.status === 200 ? ok('la home risponde 200') : no(`la home risponde ${home.status}`);

const H = (k) => home.headers.get(k);
H('content-security-policy') ? ok('Content-Security-Policy presente') : wn('CSP assente');
H('strict-transport-security') ? ok('HSTS presente') : wn('HSTS assente');
(H('x-frame-options') || /frame-ancestors/.test(H('content-security-policy') || ''))
  ? ok('protezione contro il framing') : wn('manca X-Frame-Options / frame-ancestors');
H('x-robots-tag') && /noindex/i.test(H('x-robots-tag'))
  ? no('la home ha X-Robots-Tag: noindex') : ok('nessun noindex negli header');

// ── 2. Meta essenziali ───────────────────────────────────────────────────────
head('2. Meta della home');
const pick = (re) => (home.body.match(re) || [])[1];
const title = pick(/<title>([\s\S]*?)<\/title>/i);
const desc  = pick(/<meta\s+name=["']description["']\s+content=["']([^"']+)/i);
const canon = pick(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i);
const robots= pick(/<meta\s+name=["']robots["']\s+content=["']([^"']+)/i);
const lang  = pick(/<html[^>]*\blang=["']([^"']+)/i);

title ? (title.length <= 60 ? ok('title', `${title.length} car.`) : wn('title lungo', `${title.length} car. (>60)`)) : no('title assente');
desc  ? (desc.length <= 160 ? ok('description', `${desc.length} car.`) : wn('description lunga', `${desc.length} car. (>160)`)) : no('description assente');
// In locale il canonical punta giustamente alla produzione: confrontarlo con
// BASE darebbe un falso allarme a ogni esecuzione su localhost.
const LOCALE = /^https?:\/\/(localhost|127\.)/.test(BASE);
if (!canon) no('canonical assente');
else if (LOCALE) ok('canonical', `${canon} (test in locale, non confrontato)`);
else canon === BASE + '/' ? ok('canonical corretto', canon) : wn('canonical inatteso', canon);
robots && !/noindex/.test(robots) ? ok('meta robots indicizzabile') : (robots ? no('meta robots', robots) : wn('meta robots assente'));
lang ? ok('lang dichiarato', lang) : wn('lang assente');
/<meta\s+property=["']og:image/i.test(home.body) ? ok('immagine Open Graph presente') : wn('og:image assente');

// ── 3. Dati strutturati ──────────────────────────────────────────────────────
head('3. Dati strutturati (JSON-LD)');
const ld = [...home.body.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
if (!ld.length) no('nessun blocco JSON-LD');
else {
  let nodes = [], bad = 0;
  for (const m of ld) {
    try {
      const j = JSON.parse(m[1]);
      nodes = nodes.concat(j['@graph'] || [j]);
    } catch { bad++; }
  }
  bad ? no(`${bad} blocco/i JSON-LD non validi`) : ok(`${ld.length} blocco/i JSON-LD, JSON valido`);
  const types = {};
  nodes.forEach((n) => { const t = n['@type']; if (t) types[t] = (types[t] || 0) + 1; });
  ok(`${nodes.length} nodi`, Object.entries(types).map(([k, v]) => `${k}×${v}`).join(', '));

  const person = nodes.find((n) => n['@type'] === 'Person');
  if (!person) wn('nessun nodo Person');
  else {
    const sa = [].concat(person.sameAs || []);
    // sameAs e' il segnale che collega le menzioni sparse a una sola entita'.
    // Con un solo profilo, un motore non ha modo di disambiguare un omonimo.
    sa.length >= 3 ? ok('sameAs', `${sa.length} profili`)
      : wn(`sameAs debole: ${sa.length} profilo/i`, 'servono almeno 3 per disambiguare un omonimo');
    person.description ? ok('Person.description presente') : wn('Person.description assente');
  }
}

// ── 4. robots.txt ────────────────────────────────────────────────────────────
head('4. robots.txt');
const rb = await get('/robots.txt');
if (rb.status !== 200) no(`robots.txt risponde ${rb.status}`);
else {
  ok('robots.txt raggiungibile');
  /^\s*Sitemap:/mi.test(rb.body) ? ok('direttiva Sitemap presente') : wn('manca la direttiva Sitemap');
  const blocks = rb.body.split(/\n\s*\n/);
  const state = (ua) => {
    const b = blocks.find((x) => new RegExp(`^User-agent:\\s*${ua}\\s*$`, 'mi').test(x));
    if (!b) return 'non citato';
    return /^\s*Disallow:\s*\/\s*$/mi.test(b) ? 'BLOCCATO' : 'consentito';
  };
  for (const ua of ['Googlebot', 'OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot'])
    (state(ua) !== 'BLOCCATO') ? ok(`${ua} (ricerca/citazione)`, state(ua)) : no(`${ua} è BLOCCATO`);
  for (const ua of ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended'])
    console.log(`  ·  ${ua} (addestramento): ${state(ua)}`);
}

// ── 5. sitemap.xml ───────────────────────────────────────────────────────────
head('5. sitemap.xml');
const sm = await get('/sitemap.xml');
if (sm.status !== 200) no(`sitemap risponde ${sm.status}`);
else {
  const locs = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const imgs = [...sm.body.matchAll(/<image:loc>/g)].length;
  // Un'immagine puo' comparire sia sulla home sia sulla pagina del progetto:
  // il titolo ripetuto fra URL diversi e' corretto. Quella che conta e' la
  // ripetizione dentro lo stesso <url>, che segnala titoli generici.
  const perUrl = sm.body.split('<url>').slice(1);
  let titles = [], dup = 0;
  for (const blocco of perUrl) {
    const t = [...blocco.matchAll(/<image:title>([^<]*)<\/image:title>/g)].map((m) => m[1]);
    titles = titles.concat(t);
    dup += t.length - new Set(t).size;
  }
  ok(`${locs.length} URL, ${imgs} immagini`);
  locs.length >= 5 ? ok('superficie indicizzabile sufficiente')
    : wn(`solo ${locs.length} URL`, 'poche pagine = poco da citare per un motore generativo');
  dup > titles.length * 0.3 ? wn(`${dup} titoli immagine ripetuti`, 'titoli generici aiutano poco Google Images')
    : ok('titoli immagine sufficientemente distinti');
  const lm = (sm.body.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1];
  if (lm) {
    const giorni = Math.floor((Date.now() - Date.parse(lm)) / 86400000);
    giorni < 120 ? ok('lastmod recente', `${giorni} giorni fa`) : wn('lastmod vecchio', `${giorni} giorni fa`);
  }
  // ogni URL dichiarato deve rispondere: un 404 in sitemap e' un segnale di sciatteria
  let rotti = 0;
  for (const u of locs.slice(0, 20)) {
    // La sitemap contiene sempre URL assoluti di produzione. Se stiamo
    // testando un altro host (localhost, un'anteprima), vanno riscritti:
    // altrimenti si finirebbe per controllare la produzione credendo di
    // controllare la copia in prova.
    const target = LOCALE || !u.startsWith(BASE) ? BASE + new URL(u).pathname : u;
    const r = await fetch(target, { method: 'HEAD' }).catch(() => null);
    if (!r || r.status >= 400) { rotti++; console.log(`     ↳ ${r ? r.status : 'errore'} ${target}`); }
  }
  rotti ? no(`${rotti} URL della sitemap non rispondono`) : ok('tutti gli URL della sitemap rispondono');
}

// ── 6. llms.txt ──────────────────────────────────────────────────────────────
head('6. llms.txt (motori generativi)');
const lt = await get('/llms.txt');
if (lt.status !== 200) wn(`llms.txt risponde ${lt.status}`);
else {
  ok('llms.txt raggiungibile');
  /text\/plain/.test(lt.headers.get('content-type') || '')
    ? ok('Content-Type text/plain') : wn('Content-Type', lt.headers.get('content-type'));
  const parole = lt.body.trim().split(/\s+/).length;
  parole >= 150 ? ok('contenuto', `${parole} parole`) : wn('contenuto scarno', `${parole} parole`);
  /^#\s/m.test(lt.body) ? ok('struttura markdown con titolo') : wn('manca un titolo H1');
}

// ── 7. Contenuto citabile ────────────────────────────────────────────────────
head('7. Contenuto leggibile senza JavaScript');
const testo = home.body
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ').trim();
const parole = testo.split(' ').filter(Boolean).length;
parole >= 300 ? ok('testo statico', `${parole} parole`) : no('testo statico insufficiente', `${parole} parole`);
const h1 = [...home.body.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
h1.length === 1 ? ok('un solo <h1>') : wn(`${h1.length} <h1>`, 'uno solo è la forma preferita');
parole >= 800 ? ok('abbastanza testo per essere citato per esteso')
  : wn('testo breve per il GEO', 'un LLM cita volentieri pagine con 800+ parole di prosa');

// ── 8. Peso e terze parti ────────────────────────────────────────────────────
head('8. Peso e dipendenze esterne');
const kb = Math.round(home.body.length / 1024);
kb <= 100 ? ok('peso HTML', `${kb} KB`) : wn('HTML pesante', `${kb} KB`);
// Solo le RISORSE caricate dalla pagina (src, e href dei soli <link>): un
// normale collegamento a Instagram non e' una dipendenza e non va contato.
const origins = new Set([
  ...[...home.body.matchAll(/\bsrc=["']https?:\/\/([^/"']+)/g)].map((m) => m[1]),
  ...[...home.body.matchAll(/<link\b[^>]*\bhref=["']https?:\/\/([^/"']+)/g)].map((m) => m[1]),
].filter((h) => !h.includes('andreaonori.com')));
origins.size === 0 ? ok('nessuna risorsa esterna caricata dall\'HTML')
  : wn(`${origins.size} risorse esterne`, [...origins].join(', '));

console.log(`\n${'─'.repeat(58)}`);
console.log(`  ${pass} ok · ${warn} avvisi · ${fail} problemi`);
console.log(`${'─'.repeat(58)}\n`);
process.exit(fail ? 1 : 0);
