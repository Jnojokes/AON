#!/usr/bin/env node
/**
 * build.mjs — la build del sito.
 *
 * Fino a settembre 2026 non esisteva una build: index.html e admin-edits.html
 * contenevano la JSX in chiaro dentro <script type="text/babel">, e il browser
 * di ogni visitatore scaricava @babel/standalone (3,1 MB) per compilarla al
 * volo, piu' React e ReactDOM da unpkg e il compilatore Tailwind da un altro
 * CDN. Erano ~3,6 MB di JavaScript bloccante prima del primo pixel, e il sito
 * diventava una pagina bianca se uno di quei CDN non rispondeva.
 *
 * Ora:
 *   1. esbuild compila src/app.jsx   -> assets/app.js    (React incluso)
 *   2. esbuild compila src/admin.jsx -> assets/admin.js
 *   3. Tailwind compila src/tailwind.css -> assets/tailwind.css
 *   4. si verifica che ogni classe Tailwind usata abbia la sua regola
 *   5. i riferimenti agli asset negli HTML ricevono un ?v=<hash>
 *   6. prerender.mjs rigenera blocco statico, JSON-LD, sitemap e llms.txt
 *
 * Uso: node scripts/build.mjs   (e' il buildCommand di vercel.json)
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

// ── 1-2. bundle ──────────────────────────────────────────────────────────────
const BUNDLES = [
  { in: 'src/app.jsx',   out: 'assets/app.js',   label: 'sito' },
  { in: 'src/admin.jsx', out: 'assets/admin.js', label: 'pannello' },
];

for (const b of BUNDLES) {
  if (!existsSync(join(ROOT, b.in))) {
    console.error(`✗ manca ${b.in}`);
    process.exit(1);
  }
  await build({
    entryPoints: [join(ROOT, b.in)],
    outfile: join(ROOT, b.out),
    bundle: true,
    minify: true,
    format: 'iife',
    target: ['es2020', 'safari14'],
    jsx: 'transform',                 // classico: il sorgente importa React esplicitamente
    define: { 'process.env.NODE_ENV': '"production"' },
    legalComments: 'none',
    logLevel: 'warning',
  });
  console.log(`✓ ${b.out.padEnd(18)} ${kb(statSync(join(ROOT, b.out)).size).padStart(9)}  (${b.label})`);
}

// ── 3. Tailwind ──────────────────────────────────────────────────────────────
// Sostituisce cdn.tailwindcss.com, che scaricava il compilatore nel browser e
// rigenerava questo stesso CSS a ogni visita di ogni utente.
execFileSync(
  process.execPath,
  [
    join(ROOT, 'node_modules/tailwindcss/lib/cli.js'),
    '-c', join(ROOT, 'tailwind.config.js'),
    '-i', join(ROOT, 'src/tailwind.css'),
    '-o', join(ROOT, 'assets/tailwind.css'),
    '--minify',
  ],
  { stdio: ['ignore', 'ignore', 'inherit'], cwd: ROOT }
);

// ── 4. copertura ─────────────────────────────────────────────────────────────
// Rete di sicurezza: se una classe Tailwind usata nel sorgente non finisce nel
// CSS (content mal configurato, classe costruita a runtime in un template
// literal), l'elemento si romperebbe in silenzio. Meglio far fallire la build.
const css = readFileSync(join(ROOT, 'assets/tailwind.css'), 'utf8');
const src = readFileSync(join(ROOT, 'index.html'), 'utf8') + readFileSync(join(ROOT, 'src/app.jsx'), 'utf8');

const used = new Set();
for (const re of [/className\s*=\s*"([^"]+)"/g, /class\s*=\s*"([^"]+)"/g]) {
  for (const m of src.matchAll(re)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
}
// Il terminatore non e' solo "{" o ",": utility come space-y-* generano
// ".space-y-1 > :not([hidden]) ~ :not([hidden])", quindi dopo il nome puo'
// esserci uno spazio, un combinatore o una pseudo-classe.
const generated = new Set(
  [...css.matchAll(/\.((?:[a-zA-Z0-9_-]|\\.)+)(?=[\s,{:>~+])/g)].map((m) => m[1].replace(/\\/g, ''))
);
const LOOKS_TAILWIND =
  /^(flex|grid|gap-|m[xytblre]?-|p[xytblre]?-|w-|h-|max-w-|min-|text-|bg-|border|rounded|items-|justify-|inline|block|hidden|relative|absolute|fixed|cursor-|object-|overflow-|z-|opacity-|leading-|tracking-|uppercase|font-|space-|order-)/;

const missing = [...used].filter((c) => LOOKS_TAILWIND.test(c) && !generated.has(c));
if (missing.length) {
  console.error(`\n✗ classi Tailwind usate nel sorgente ma non compilate:\n   ${missing.join(', ')}`);
  console.error(`   Controlla il campo "content" in tailwind.config.js.\n`);
  process.exit(1);
}
console.log(`✓ assets/tailwind.css ${kb(css.length).padStart(6)}  (${generated.size} selettori)`);

// ── 5. versione dei bundle ───────────────────────────────────────────────────
// I bundle hanno nomi fissi (app.js, admin.js, tailwind.css), quindi con una
// cache lunga un browser continuerebbe a servire la versione vecchia dopo un
// deploy. Si aggiunge un ?v=<hash del contenuto> ai riferimenti negli HTML:
// il nome del file resta stabile, ma l'URL cambia quando cambia il contenuto —
// il che rende sicuro dichiararli immutable in vercel.json.
const stamp = (file) =>
  createHash('sha256').update(readFileSync(join(ROOT, file))).digest('hex').slice(0, 8);

const VERSIONED = [
  { html: 'index.html',       assets: ['assets/app.js', 'assets/tailwind.css'] },
  { html: 'admin-edits.html', assets: ['assets/admin.js'] },
];

for (const { html, assets } of VERSIONED) {
  const file = join(ROOT, html);
  let doc = readFileSync(file, 'utf8');
  for (const a of assets) {
    const v = stamp(a);
    // sostituisce sia "/assets/app.js" sia "/assets/app.js?v=vecchio"
    const re = new RegExp(`(["'])/${a.replace('.', '\\.')}(\\?v=[a-f0-9]+)?\\1`, 'g');
    doc = doc.replace(re, `$1/${a}?v=${v}$1`);
  }
  writeFileSync(file, doc);
  console.log(`✓ ${html.padEnd(18)} riferimenti versionati`);
}

// ── 6. prerender ─────────────────────────────────────────────────────────────
console.log('');
execFileSync(process.execPath, [join(ROOT, 'scripts/prerender.mjs')], { stdio: 'inherit' });
