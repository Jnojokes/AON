#!/usr/bin/env node
/**
 * build-report.mjs — genera il PDF "Stato SEO & GEO" da scripts/report/report.html.
 *
 * Stessa impostazione di scripts/guide/build-pdf.mjs: la pagina viene caricata
 * dal server locale (non da file://) perche' i font self-hosted e gli screenshot
 * sono referenziati con percorsi assoluti.
 *
 * Prerequisito: npm run serve   (in un altro terminale)
 * Uso:          node scripts/report/build-report.mjs
 * Output:       Stato-SEO-GEO-AON.pdf
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.AON_BASE || 'http://localhost:4000';
const OUT = path.join(ROOT, 'Stato-SEO-GEO-AON.pdf');

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const missing = [];
page.on('response', (r) => {
  if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) missing.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${BASE}/scripts/report/report.html`, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluateHandle('document.fonts.ready');
await new Promise((r) => setTimeout(r, 800));

const broken = await page.evaluate(() =>
  [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src'))
);
if (broken.length) { console.warn('⚠︎ immagini non caricate:'); broken.forEach((s) => console.warn('   ' + s)); }
if (missing.length) { console.warn('⚠︎ risorse mancanti:'); missing.forEach((s) => console.warn('   ' + s)); }

await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;font-family:-apple-system,sans-serif;font-size:7pt;color:#8a8a8a;
                padding:0 15mm;display:flex;justify-content:space-between;">
      <span>Andrea Onori — Stato SEO &amp; GEO</span>
      <span class="pageNumber"></span>
    </div>`,
});

await browser.close();
console.log(`\n✓ ${path.basename(OUT)} — ${Math.round(fs.statSync(OUT).size / 1024)} KB\n`);
process.exit(broken.length || missing.length ? 2 : 0);
