// =============================================================================
//  AON — server locale con /api/save simulato
// -----------------------------------------------------------------------------
//  Serve a due cose:
//    1. verificare il sito in locale (consenso, font, CSP) senza deploy;
//    2. catturare gli screenshot della guida admin senza mai toccare
//       la produzione, GitHub o le credenziali reali.
//
//  /api/save qui NON scrive nulla da nessuna parte. Riproduce solo i codici di
//  stato che il pannello si aspetta:
//     password sbagliata            -> 401
//     password giusta + azione ignota -> 400   (e' cosi' che il CMS valida il login)
//     save / upload                 -> 200
//
//  Uso:  node scripts/guide/serve-mock.mjs [--port 4000] [--fixtures]
//        --fixtures  serve scripts/guide/fixtures/media.json al posto di quello vero,
//                    cosi' negli screenshot non compare lavoro dei clienti.
// =============================================================================
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const PORT = Number(args[args.indexOf("--port") + 1]) || 4000;
const USE_FIXTURES = args.includes("--fixtures");
// --no-csp: serve per catturare la baseline visiva della versione PRE-migrazione,
// che caricava React e Tailwind da CDN esterni ora giustamente vietati dalla CSP.
// Senza questo flag il confronto prima/dopo misurerebbe la CSP, non il rendering.
const NO_CSP = args.includes("--no-csp");
export const DEMO_PASSWORD = "demo1234";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8", ".woff2": "font/woff2",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Le immagini caricate durante la cattura restano qui, in memoria: il punto e'
// che il pannello si comporti in modo realistico, non che il file sopravviva.
const uploads = new Map();

function readBody(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => { try { resolve(JSON.parse(b || "{}")); } catch { resolve({}); } });
  });
}

// Applica in locale gli stessi header di vercel.json. Serve soprattutto per la
// CSP: una direttiva sbagliata non da' errori visibili in sviluppo, ma in
// produzione lascia una pagina bianca. Meglio scoprirlo qui.
const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
const globalHeaders = (vercel.headers || [])
  .filter((h) => h.source === "/(.*)")
  .flatMap((h) => h.headers || []);

const server = http.createServer(async (req, res) => {
  for (const h of globalHeaders) {
    // HSTS su http://localhost bloccherebbe il browser su https: inutile qui.
    if (h.key === "Strict-Transport-Security") continue;
    if (h.key === "Content-Security-Policy" && NO_CSP) continue;
    if (h.key === "Content-Security-Policy") {
      // upgrade-insecure-requests trasformerebbe ogni sottorisorsa in https://
      // su un server che parla http: le richieste non risolvono e la pagina non
      // finisce mai di caricare. In produzione la direttiva e' giusta e resta.
      res.setHeader(h.key, h.value.replace(/;\s*upgrade-insecure-requests/, ""));
      continue;
    }
    res.setHeader(h.key, h.value);
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === "/api/save") {
    if (req.method !== "POST") { res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" })); return; }
    const body = await readBody(req);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    if (body.password !== DEMO_PASSWORD) { res.writeHead(401).end(JSON.stringify({ error: "Non autorizzato" })); return; }
    if (body.action === "upload") {
      const name = `media/demo-${uploads.size + 1}-${String(body.filename || "foto.jpg").replace(/[^a-z0-9.]+/gi, "-").toLowerCase()}`;
      uploads.set(name, true);
      res.writeHead(200).end(JSON.stringify({ ok: true, path: name })); return;
    }
    if (body.action === "save") { res.writeHead(200).end(JSON.stringify({ ok: true })); return; }
    // Qualsiasi altra azione (incluso il "__ping" del login) => 400 con password valida.
    res.writeHead(400).end(JSON.stringify({ error: "Azione sconosciuta" })); return;
  }

  if (USE_FIXTURES && (pathname === "/media.json" || pathname === "/./media.json")) {
    const fx = path.join(ROOT, "scripts/guide/fixtures/media.json");
    if (fs.existsSync(fx)) {
      res.writeHead(200, { "Content-Type": TYPES[".json"], "Cache-Control": "no-store" });
      res.end(fs.readFileSync(fx)); return;
    }
  }

  // cleanUrls generico, come su Vercel: qualsiasi percorso senza estensione che
  // corrisponda a un .html viene servito. Prima le tre rotte erano elencate a
  // mano e /note-legali dava 404 in locale pur funzionando in produzione.
  if (pathname === "/") pathname = "/index.html";
  else if (!path.extname(pathname) && fs.existsSync(path.join(ROOT, pathname + ".html"))) {
    pathname += ".html";
  }

  const file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("404");
    return;
  }
  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`mock server → http://localhost:${PORT}${USE_FIXTURES ? "  (fixtures)" : ""}`);
  console.log(`password demo → ${DEMO_PASSWORD}`);
});
