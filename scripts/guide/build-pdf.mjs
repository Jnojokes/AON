// =============================================================================
//  AON — genera la guida PDF del pannello admin
// -----------------------------------------------------------------------------
//  Stampa scripts/guide/guide.html in A4 usando il Chrome gia' installato.
//  La pagina viene caricata dal server locale (non da file://) perche' i font
//  self-hosted e gli screenshot sono referenziati con percorsi assoluti.
//
//  Prerequisiti:
//    node scripts/guide/serve-mock.mjs --port 4000 --fixtures   (in un terminale)
//    node scripts/guide/capture.mjs                             (una volta)
//  Uso:
//    node scripts/guide/build-pdf.mjs
//  Output:
//    Guida-Pannello-Admin-AON.pdf  (nella radice del progetto)
// =============================================================================
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.AON_BASE || "http://localhost:4000";
const OUT = path.join(ROOT, "Guida-Pannello-Admin-AON.pdf");

const shots = path.join(ROOT, "scripts/guide/shots");
if (!fs.existsSync(shots) || fs.readdirSync(shots).filter((f) => /\.(png|jpe?g)$/i.test(f)).length === 0) {
  console.error("✗ Nessuno screenshot in scripts/guide/shots — esegui prima capture.mjs");
  process.exit(1);
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

const missing = [];
page.on("response", (r) => {
  // favicon.ico la chiede il browser da solo, non e' referenziata dalla guida.
  if (r.status() >= 400 && !/favicon\.ico$/.test(r.url())) missing.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${BASE}/scripts/guide/guide.html`, { waitUntil: "networkidle0", timeout: 60000 });

// I font sono self-hosted: senza questa attesa la prima pagina puo' finire in
// PDF con il fallback di sistema, e l'impaginazione salta.
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 800));

// Controllo che ogni <img> abbia caricato davvero: un'immagine rotta in un PDF
// e' un buco bianco che nessuno nota finche' non e' in mano al cliente.
const broken = await page.evaluate(() =>
  [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute("src"))
);
if (broken.length) { console.warn("⚠︎ immagini non caricate:"); broken.forEach((s) => console.warn("   " + s)); }
if (missing.length) { console.warn("⚠︎ risorse mancanti:"); missing.forEach((s) => console.warn("   " + s)); }

await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,   // rispetta la @page del CSS invece dei margini di Chrome
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate: `
    <div style="width:100%;font-family:-apple-system,sans-serif;font-size:7pt;color:#8a8a8a;
                padding:0 15mm;display:flex;justify-content:space-between;">
      <span>Andrea Onori — Guida al pannello admin</span>
      <span class="pageNumber"></span>
    </div>`,
});

await browser.close();
const kb = Math.round(fs.statSync(OUT).size / 1024);
console.log(`\n✓ ${path.basename(OUT)} — ${kb} KB`);
console.log(`  ${OUT}\n`);
process.exit(broken.length || missing.length ? 2 : 0);
