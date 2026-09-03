// Cattura di riferimento per il confronto prima/dopo la migrazione del build.
// Serve a dimostrare che togliere Babel e il CDN di Tailwind non cambia una
// virgola di come appare il sito. Uso: node scripts/guide/visual-baseline.mjs <cartella>
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const OUT = process.argv[2];
if (!OUT) { console.error("uso: visual-baseline.mjs <cartella>"); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.AON_BASE || "http://localhost:4000";

const b = await puppeteer.launch({ executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless:"new", args:["--no-sandbox","--hide-scrollbars"] });
const VIEWPORTS = [["desktop",1440,900],["tablet",834,1112],["mobile",390,844]];

for (const [name,w,h] of VIEWPORTS) {
  const ctx = await b.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width:w, height:h, deviceScaleFactor:1 });
  await p.goto(BASE + "/", { waitUntil:"domcontentloaded", timeout:40000 });
  // attende che React abbia montato e che i font siano pronti
  await p.waitForFunction(() => document.querySelector("#root")?.children?.length > 0, { timeout:30000 });
  await p.evaluateHandle("document.fonts.ready");
  // consenso via, altrimenti il banner copre il fondo pagina
  await p.evaluate(() => { const x=document.querySelector("#consentReject"); if(x) x.click(); });
  // ferma animazioni e marquee: senza questo due scatti non sono mai identici
  await p.addStyleTag({ content:`*,*::before,*::after{animation:none!important;transition:none!important}` });
  // Le immagini sono loading="lazy": senza scorrere tutta la pagina e aspettare
  // che finiscano, due catture della stessa pagina differiscono fra loro per
  // quali immagini hanno fatto in tempo a caricarsi — e il confronto prima/dopo
  // diventa rumore invece che segnale.
  await p.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise(r => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await p.evaluate(() => Promise.all(
    [...document.images].filter(i => !i.complete).map(i => new Promise(res => {
      i.addEventListener("load", res, { once:true });
      i.addEventListener("error", res, { once:true });
      setTimeout(res, 8000);
    }))
  ));
  await new Promise(r=>setTimeout(r,2500));
  await p.screenshot({ path:`${OUT}/${name}.png`, fullPage:true });
  const m = await p.evaluate(() => ({
    altezza: document.documentElement.scrollHeight,
    nodi: document.querySelectorAll("*").length,
    parole: document.body.innerText.trim().split(/\s+/).length,
  }));
  console.log(`  ${name.padEnd(8)} ${w}×${h}  h=${m.altezza}px  nodi=${m.nodi}  parole=${m.parole}`);
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify(m,null,2));
  await ctx.close();
}
await b.close(); process.exit(0);
