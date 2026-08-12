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

const GH_API = "https://api.github.com";

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
  if (!body.password || body.password !== c.adminPassword) {
    return res.status(401).json({ error: "Non autorizzato" });
  }

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
