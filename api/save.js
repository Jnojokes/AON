// =============================================================================
//  AON — Secure save endpoint (Vercel Serverless Function)
// -----------------------------------------------------------------------------
//  The GitHub token NEVER lives in client code or in the repo. It is read here,
//  server-side, from the Vercel Environment Variable GITHUB_TOKEN.
//
//  Two actions, sent as JSON in the POST body:
//    { action: "upload", password, filename, contentBase64 }
//        -> commits a single image into  media/<filename>  in the repo
//        -> responds { path: "media/<filename>" }
//    { action: "save", password, media }
//        -> commits the full media.json (the site's data source)
//
//  Auth: the admin password (same one used by /admin-edits) is checked against
//  the ADMIN_PASSWORD env var. There is NO fallback value — if the env var is
//  missing the endpoint refuses every request with a 500.
//
//  Required Vercel Environment Variables:
//    GITHUB_TOKEN     (required)  a fine-grained PAT with Contents: Read+Write
//    ADMIN_PASSWORD   (required)  the /admin-edits password — no default
//    GITHUB_OWNER     (optional)  defaults to "Jnojokes"
//    GITHUB_REPO      (optional)  defaults to "AON"
//    GITHUB_BRANCH    (optional)  defaults to "main"
// =============================================================================

import { timingSafeEqual } from "node:crypto";

const GH_API = "https://api.github.com";

// --- Brute-force protection --------------------------------------------------
//  /api/save è l'unica porta d'ingresso al repo: una password indovinata vale
//  Contents: Read+Write. Il pannello, per validare il login, manda una POST con
//  action "__ping" — comodo per l'utente, comodo anche per chi prova password a
//  raffica, perché fallisce senza effetti collaterali.
//
//  Il contatore vive nella memoria dell'istanza serverless. Su Vercel questo
//  copre le raffiche da una singola istanza calda, che è esattamente la forma
//  che ha un attacco automatizzato; NON è una difesa distribuita. Se un giorno
//  servisse davvero, la sede giusta è Vercel Firewall o un KV store — non
//  questo file.
const RL_WINDOW_MS = 15 * 60 * 1000; // 15 minuti
const RL_MAX_FAILS = 10;             // tentativi falliti tollerati per IP
const rlFails = new Map();           // ip -> { count, first }

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

// Scade le finestre chiuse e tiene la Map piccola: senza questo, un'istanza
// calda a lungo accumulerebbe una entry per ogni IP visto.
function rlSweep(now) {
  for (const [ip, rec] of rlFails) {
    if (now - rec.first > RL_WINDOW_MS) rlFails.delete(ip);
  }
}

function rlCheck(ip) {
  const now = Date.now();
  if (rlFails.size > 500) rlSweep(now);
  const rec = rlFails.get(ip);
  if (!rec || now - rec.first > RL_WINDOW_MS) return { blocked: false };
  if (rec.count >= RL_MAX_FAILS) {
    return {
      blocked: true,
      retryAfter: Math.ceil((RL_WINDOW_MS - (now - rec.first)) / 1000),
    };
  }
  return { blocked: false };
}

function rlFail(ip) {
  const now = Date.now();
  const rec = rlFails.get(ip);
  if (!rec || now - rec.first > RL_WINDOW_MS) rlFails.set(ip, { count: 1, first: now });
  else rec.count += 1;
}

function rlReset(ip) {
  rlFails.delete(ip);
}

// Confronto a tempo costante: con !== il tempo di risposta dipende da quanti
// caratteri iniziali coincidono, il che si misura da remoto.
function samePassword(given, expected) {
  const a = Buffer.from(String(given ?? ""), "utf8");
  const b = Buffer.from(String(expected ?? ""), "utf8");
  if (a.length !== b.length) return false;   // la lunghezza trapela comunque
  return timingSafeEqual(a, b);
}

function cfg() {
  return {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER || "Jnojokes",
    repo: process.env.GITHUB_REPO || "AON",
    branch: process.env.GITHUB_BRANCH || "main",
    // Nessun fallback: una password di default hardcoded è una porta aperta.
    // Se ADMIN_PASSWORD non è impostata su Vercel l'endpoint si rifiuta di
    // funzionare (vedi il controllo in handler) invece di accettare un valore noto.
    adminPassword: process.env.ADMIN_PASSWORD,
  };
}

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "AON-CMS",
  };
}

// Get the current blob SHA for a path (needed to update an existing file).
// Returns null if the file does not yet exist.
async function getSha({ token, owner, repo, branch }, path) {
  const url = `${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(
    path
  )}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: ghHeaders(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`getSha ${path}: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.sha || null;
}

// Create or update a file via the GitHub Contents API.
async function putFile(c, path, base64Content, message) {
  const sha = await getSha(c, path);
  const url = `${GH_API}/repos/${c.owner}/${c.repo}/contents/${encodeURIComponent(
    path
  )}`;
  const body = {
    message,
    content: base64Content,
    branch: c.branch,
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(c.token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`putFile ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

// Sanitize an uploaded filename: keep it simple, safe, and collision-resistant.
function safeName(name) {
  const dot = name.lastIndexOf(".");
  const ext = (dot >= 0 ? name.slice(dot + 1) : "jpg")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 5);
  const base = (dot >= 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "media";
  const stamp = Date.now().toString(36);
  return `${base}-${stamp}.${ext || "jpg"}`;
}

// Un Origin estraneo significa che la richiesta parte dalla pagina di qualcun
// altro. La password nel body rende il CSRF classico impossibile (il browser
// non la conoscerebbe), ma senza questo controllo una pagina malevola potrebbe
// usare i propri visitatori come rete distribuita per provare password,
// aggirando il rate limit per IP. Origin assente (curl, server-to-server) non
// viene bloccato: li' la password resta l'unica difesa, ed e' voluto.
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let host;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".vercel.app")) return true;          // deploy di preview
  const self = String(req.headers.host || "").split(":")[0];
  return Boolean(self) && (host === self || host.endsWith("." + self));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const c = cfg();
  if (!c.token) {
    return res
      .status(500)
      .json({ error: "Server not configured: missing GITHUB_TOKEN env var." });
  }
  // Fail closed: senza ADMIN_PASSWORD l'endpoint non accetta nulla. Meglio un
  // CMS che non salva finché non si configura la env var, che un CMS che
  // accetta una password di default nota a chiunque.
  if (!c.adminPassword) {
    return res
      .status(500)
      .json({ error: "Server not configured: missing ADMIN_PASSWORD env var." });
  }

  // Body may arrive parsed (Vercel) or as a raw string.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  body = body || {};

  // --- Auth -----------------------------------------------------------------
  const ip = clientIp(req);

  if (!originAllowed(req)) {
    console.error(`[auth] blocked origin=${req.headers.origin} ip=${ip}`);
    return res.status(403).json({ error: "Origine non consentita" });
  }

  const rl = rlCheck(ip);
  if (rl.blocked) {
    console.error(`[auth] rate-limited ip=${ip} action=${body.action || "?"}`);
    res.setHeader("Retry-After", String(rl.retryAfter));
    return res.status(429).json({
      error:
        "Troppi tentativi falliti. Riprova tra qualche minuto: per sicurezza l'accesso e' temporaneamente bloccato.",
    });
  }

  if (!samePassword(body.password, c.adminPassword)) {
    rlFail(ip);
    // Traccia del tentativo fallito nei log Vercel. Non registra mai la
    // password provata: serve sapere che e' successo e da dove, non cosa.
    console.error(`[auth] failed ip=${ip} action=${body.action || "?"}`);
    return res.status(401).json({ error: "Non autorizzato" });
  }
  rlReset(ip);

  try {
    // --- Upload a single image -------------------------------------------
    if (body.action === "upload") {
      if (!body.contentBase64 || !body.filename) {
        return res.status(400).json({ error: "filename e contentBase64 richiesti" });
      }
      // Accept either a bare base64 string or a data: URL.
      let b64 = String(body.contentBase64);
      const comma = b64.indexOf(",");
      if (b64.startsWith("data:") && comma >= 0) b64 = b64.slice(comma + 1);

      const path = `media/${safeName(body.filename)}`;
      await putFile(c, path, b64, `cms: upload ${path}`);
      return res.status(200).json({ ok: true, path });
    }

    // --- Save media.json --------------------------------------------------
    if (body.action === "save") {
      if (!body.media || typeof body.media !== "object") {
        return res.status(400).json({ error: "media object richiesto" });
      }
      // Timestamp del contenuto, stampato qui e non in fase di build.
      // Serve al <lastmod> della sitemap: il mtime dei file su Vercel è l'ora
      // del git clone, quindi userebbe una data nuova a ogni deploy anche
      // quando nulla è cambiato — e Google ignora i lastmod inaffidabili.
      // Sta lato server perché il pannello ricostruisce l'oggetto e potrebbe
      // scartare campi che non conosce.
      body.media.updatedAt = new Date().toISOString();

      const json = JSON.stringify(body.media, null, 2) + "\n";
      const b64 = Buffer.from(json, "utf8").toString("base64");
      await putFile(c, "media.json", b64, "cms: update media.json");
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Azione sconosciuta" });
  } catch (err) {
    return res.status(502).json({ error: String(err.message || err) });
  }
}
