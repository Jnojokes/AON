// =============================================================================
//  AON — cattura degli screenshot per la guida del pannello admin
// -----------------------------------------------------------------------------
//  Pilota il Chrome gia' installato sul Mac (niente Chromium da scaricare) e
//  fotografa il pannello passo per passo, contro il server finto di
//  serve-mock.mjs con i dati di scripts/guide/fixtures/media.json.
//
//  Nessuna credenziale reale, nessun contatto con GitHub, nessun lavoro di
//  clienti negli screenshot.
//
//  Prerequisito:  node scripts/guide/serve-mock.mjs --port 4000 --fixtures
//  Uso:           node scripts/guide/capture.mjs
//  Output:        scripts/guide/shots/*.png
// =============================================================================
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = path.join(HERE, "shots");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.AON_BASE || "http://localhost:4000";
const PASSWORD = "demo1234";

fs.mkdirSync(SHOTS, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let n = 0;

// JPEG e non PNG: sono schermate a 2x di un'interfaccia scura e piena di
// fotografie. In PNG la guida pesava 11,6 MB — troppo per mandarla via email.
// A qualita' 92 la differenza non si vede in stampa e il file cala di due terzi.
async function shot(page, name, opts = {}) {
  n += 1;
  const file = path.join(SHOTS, `${String(n).padStart(2, "0")}-${name}.jpg`);
  const png = { path: file, type: "jpeg", quality: 92 };
  await wait(opts.settle ?? 450);
  if (opts.selector) {
    const el = await page.$(opts.selector);
    if (el) { await el.screenshot(png); console.log("  ▸", path.basename(file)); return; }
  }
  await page.screenshot({ ...png, fullPage: !!opts.full });
  console.log("  ▸", path.basename(file));
}

// Evidenzia un elemento con un contorno arancione prima dello scatto: in una
// guida stampata, una freccia disegnata dopo non si allinea mai. Meglio che sia
// la pagina stessa a indicare dove guardare.
async function highlight(page, selector) {
  await page.evaluate((sel) => {
    document.querySelectorAll("[data-aon-hl]").forEach((e) => {
      e.style.outline = ""; e.style.outlineOffset = ""; e.removeAttribute("data-aon-hl");
    });
    if (!sel) return;
    let el = null;
    try { el = document.querySelector(sel); } catch { return; }
    if (!el) return;
    el.setAttribute("data-aon-hl", "1");
    el.style.outline = "3px solid #ff5722";
    el.style.outlineOffset = "3px";
  }, selector);
}
const clearHighlight = (page) => highlight(page, null);

// Evidenzia il bottone che contiene un certo testo, che e' il modo in cui la
// guida si riferisce ai comandi ("premi Salva tutto").
async function highlightText(page, text, tag = "button") {
  await page.evaluate((t, g) => {
    document.querySelectorAll("[data-aon-hl]").forEach((e) => {
      e.style.outline = ""; e.style.outlineOffset = ""; e.removeAttribute("data-aon-hl");
    });
    const el = [...document.querySelectorAll(g)].find(
      (b) => (b.textContent || "").trim().toLowerCase().includes(t.toLowerCase())
    );
    if (!el) return;
    el.setAttribute("data-aon-hl", "1");
    el.style.outline = "3px solid #ff5722";
    el.style.outlineOffset = "3px";
    el.scrollIntoView({ block: "center" });
  }, text, tag);
}

// Il pannello non ha id sui bottoni: si cercano per testo, che e' anche il modo
// in cui li cerchera' chi legge la guida.
async function clickText(page, text, tag = "button") {
  const ok = await page.evaluate((t, g) => {
    const el = [...document.querySelectorAll(g)].find(
      (b) => (b.textContent || "").trim().toLowerCase().includes(t.toLowerCase())
    );
    if (!el) return false;
    el.click(); return true;
  }, text, tag);
  if (!ok) console.warn(`    ⚠︎ bottone "${text}" non trovato`);
  await wait(350);
  return ok;
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=2"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.warn("    ⚠︎ errore pagina:", e.message));

console.log("\nCattura screenshot della guida\n");

// ── 1. Login ─────────────────────────────────────────────────────────────────
// Viewport piu' stretta per il login: il form e' un riquadro piccolo al centro
// di una pagina nera, e a 1440x900 lo screenshot sarebbe quasi tutto vuoto.
await page.setViewport({ width: 820, height: 720, deviceScaleFactor: 2 });
await page.goto(`${BASE}/admin-edits`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[placeholder="admin"]', { timeout: 20000 });
await shot(page, "login-vuoto");

await page.type('input[placeholder="admin"]', "admin", { delay: 25 });
await page.type('input[type="password"]', "password-sbagliata", { delay: 15 });
await clickText(page, "Entra");
await wait(1200);
await shot(page, "login-errore");

// ── 2. Login corretto ────────────────────────────────────────────────────────
const pw = await page.$('input[type="password"]');
await pw.click({ clickCount: 3 });
await pw.type(PASSWORD, { delay: 25 });
await clickText(page, "Entra");
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });   // torna alla piena larghezza
await page.waitForSelector(".card, [class*='card']", { timeout: 25000 }).catch(() => {});
await wait(1500);
await shot(page, "panoramica-feed", { settle: 800 });

// Barra in alto: e' li' che vivono "Salva tutto" e l'indicatore di modifiche.
await highlight(page, "header");
await shot(page, "barra-superiore");
await clearHighlight(page);

// ── 3. Le cinque tab ─────────────────────────────────────────────────────────
for (const [label, slug] of [["MOTION","tab-motion"],["SERIES","tab-series"],["INDEX","tab-index"],["IMPOSTAZIONI","tab-impostazioni"]]) {
  const ok = await clickText(page, label);
  if (!ok) continue;
  await wait(700);
  await shot(page, slug, { settle: 600 });
}

// IMPOSTAZIONI: il riquadro SEO arancione merita uno scatto dedicato, e' il
// campo che piu' facilmente viene frainteso.
await page.evaluate(() => {
  const h = [...document.querySelectorAll("h3, h2")].find((x) => /SEO/i.test(x.textContent || ""));
  if (h) h.scrollIntoView({ block: "center" });
});
await shot(page, "impostazioni-seo", { settle: 700 });

// ── 4. Torna su FEED e mostra le operazioni ──────────────────────────────────
await clickText(page, "FEED");
await wait(700);

// "+ Aggiungi" evidenziato, poi premuto: la guida mostra prima dove sta il
// comando e subito dopo che cosa produce.
await highlightText(page, "Aggiungi");
await shot(page, "bottone-aggiungi", { settle: 500 });
await clearHighlight(page);
await clickText(page, "+ Aggiungi");
await wait(800);
await shot(page, "elemento-aggiunto", { settle: 900 });

// Toast + indicatore "modifiche non salvate"
await shot(page, "modifiche-non-salvate", { selector: "header", settle: 300 });

// Prima card: campi, galleria, frecce di riordino
await page.evaluate(() => {
  const c = document.querySelector("main [class*='card'], main > div > div");
  if (c) c.scrollIntoView({ block: "center" });
});
await shot(page, "scheda-progetto", { settle: 700 });

// ── 5. Salvataggio ───────────────────────────────────────────────────────────
await highlightText(page, "Salva tutto");
await shot(page, "bottone-salva", { selector: "header", settle: 400 });
await clearHighlight(page);
await clickText(page, "Salva tutto");
await wait(1600);
await shot(page, "salvato", { settle: 600 });

// ── 6. Il sito pubblico, per il confronto admin ↔ risultato ─────────────────
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await wait(3000);
await page.evaluate(() => { const b = document.querySelector("#consentAccept"); if (b) b.click(); });
await wait(1200);
await shot(page, "sito-pubblico", { settle: 1200 });

await browser.close();
console.log(`\n✓ ${n} screenshot in scripts/guide/shots/\n`);
process.exit(0);
