// =============================================================================
//  AON — sorgente del pannello admin
// -----------------------------------------------------------------------------
//  Come src/app.jsx: prima viveva dentro admin-edits.html in un
//  <script type="text/babel"> compilato nel browser. Qui il costo era anche
//  peggiore che sul sito pubblico — se unpkg non risponde, Andrea si trova un
//  pannello bianco e non puo' pubblicare nulla.
//
//  Compilato da scripts/build.mjs verso assets/admin.js.
// =============================================================================
import React from 'react';
import * as ReactDOM from 'react-dom/client';

const { useState, useEffect, useRef, useCallback } = React;

const API = "/api/save";

// Il body di una funzione serverless Vercel è limitato a ~4.5 MB e il base64
// gonfia il file del ~33%: oltre i 3 MB l'upload fallirebbe, quindi lo fermiamo
// prima con un messaggio chiaro invece di far vedere un 413 criptico.
const MAX_UPLOAD = 3 * 1024 * 1024;

// ── Modello media (identico a quello di src/app.jsx) ────────────────────────
//   "media/foto.jpg"                        → immagine nel repo
//   "https://…/clip.mp4"                    → video esterno
//   { video, poster, title, ratio }         → video esterno + copertina
//                                             (+ proporzioni, es. "16/9")
const VIDEO_RE = /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/i;

// ── Bunny Stream ────────────────────────────────────────────────────────────
// Lo storage dei video. Sul sito un video Bunny si vede nel player di Bunny,
// incorporato con il link Embed:
//     https://player.mediadelivery.net/embed/<libreria>/<id del video>
// (il vecchio iframe.mediadelivery.net e l'indirizzo /play/ valgono uguale).
// Il CDN della libreria serve, senza chiavi, la miniatura e gli MP4 di ripiego:
//     https://<cdn>/<id>/thumbnail.jpg      https://<cdn>/<id>/play_720p.mp4
// Da lì il pannello ricava da solo proporzioni e copertina. Il CDN dipende
// dalla libreria: una libreria nuova va aggiunta qui.
const BUNNY_CDN = { "788231": "vz-13c73ffe-e6a.b-cdn.net" };   // libreria "andreaonori"
const BUNNY_RE = /^https?:\/\/(?:player|iframe)\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-f-]{36})/i;
const bunnyInfo = (u) => {
  const m = String(u || "").trim().match(BUNNY_RE);
  if (!m) return null;
  const library = m[1], guid = m[2].toLowerCase(), cdn = BUNNY_CDN[library] || "";
  return {
    library, guid, cdn,
    embed: `https://player.mediadelivery.net/embed/${library}/${guid}`,
    thumb: cdn ? `https://${cdn}/${guid}/thumbnail.jpg` : "",
    mp4: (q) => cdn ? `https://${cdn}/${guid}/play_${q}p.mp4` : "",
  };
};

// Proporzioni leggibili da larghezza e altezza: 1920×1080 → "16/9",
// 1080×1350 → "4/5". Se non sono tra quelle comuni, la frazione ridotta.
const RAPPORTI = [[16,9],[9,16],[4,3],[3,4],[4,5],[5,4],[1,1],[3,2],[2,3],[21,9],[2,1],[1,2]];
const ratioLabel = (w, h) => {
  if (!w || !h) return "";
  const r = w / h;
  for (const [a, b] of RAPPORTI) if (Math.abs(r - a / b) / (a / b) < 0.01) return a + "/" + b;
  const mcd = (x, y) => y ? mcd(y, x % y) : x;
  const d = mcd(w, h);
  return (w / d <= 64 && h / d <= 64) ? (w / d) + "/" + (h / d) : String(Math.round(r * 1000) / 1000);
};

// ── Jumpshare ───────────────────────────────────────────────────────────────
// Lo storage di prima: il sito non lo usa più (la CSP blocca i suoi player),
// il riconoscimento resta per avvisare chi incolla un vecchio link.
// Il link che dà il pulsante "Copy link" apre una
// PAGINA di anteprima, non il file: un tag <video> non ci può fare nulla, ed è
// il motivo per cui "Verifica link" lo rifiutava.
//
// Jumpshare offre due suffissi da aggiungere in fondo all'indirizzo:
//     -   file diretto, salta il visualizzatore
//     +   anteprima diretta, senza la cornice di Jumpshare
//
// Quale dei due sia riproducibile in un <video> dipende da come Jumpshare serve
// il file, e non è documentato. Quindi non si indovina: si normalizza a "-" e,
// se la verifica fallisce, si riprova con "+" (vedi CANDIDATI_VIDEO).
const JUMPSHARE_RE = /^(https?:\/\/(?:www\.)?(?:jumpshare\.com\/(?:share|embed|v)\/[A-Za-z0-9_-]{4,}|jmp\.sh\/[A-Za-z0-9_-]{4,}))[+-]?\/?$/i;

/** Estrae l'indirizzo dal codice di incorporamento.
 *  Da Bunny (come prima da Jumpshare) si puo' copiare un <iframe src="…">.
 *  Invece di chiedere di isolare l'indirizzo a mano, lo si ricava dal codice
 *  incollato: cosi' il formato dell'embed lo detta il servizio e non una
 *  nostra ipotesi su come sia fatto, che e' l'unico modo di non sbagliarlo. */
const estraiSrc = (v) => {
  const t = String(v || "").trim();
  const m = t.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return m ? m[1].trim() : t;
};

/** Toglie un eventuale suffisso e restituisce la base dell'indirizzo Jumpshare. */
const jumpshareBase = (u) => {
  const m = String(u || "").trim().match(JUMPSHARE_RE);
  return m ? m[1] : null;
};

/** Gli indirizzi da provare, in ordine di preferenza. Per Jumpshare sono due
 *  varianti dello stesso file; per tutto il resto è l'indirizzo così com'è. */
const CANDIDATI_VIDEO = (u) => {
  const base = jumpshareBase(u);
  return base ? [base + "-", base + "+"] : [String(u || "").trim()];
};

const isVideoUrl = (u) =>
  typeof u === "string" && (VIDEO_RE.test(u) || BUNNY_RE.test(u) || JUMPSHARE_RE.test(u));

const normMedia = (v) => {
  if (!v) return { image:"", video:"", title:"", ratio:"", link:"", linkLabel:"" };
  if (typeof v === "string") {
    return isVideoUrl(v)
      ? { image:"", video:v, title:"", ratio:"", link:"", linkLabel:"" }
      : { image:v, video:"", title:"", ratio:"", link:"", linkLabel:"" };
  }
  const src = v.src || "";
  const video = v.video || (isVideoUrl(src) ? src : "");
  const image = v.poster || v.image || (isVideoUrl(src) ? "" : src) || v.url || "";
  return { image, video, title: v.title || "", ratio: v.ratio || "", link: v.link || "", linkLabel: v.linkLabel || "",
    videoWide: v.videoWide || "", ratioWide: v.ratioWide || "", posterWide: v.posterWide || "" };
};

// Riscrive un media nella forma più semplice possibile: stringa se è solo una
// foto (così media.json resta identico a prima), oggetto se c'è un video.
// Le proporzioni e il link esterno si salvano solo se ci sono. Una foto con
// link diventa { image, link, linkLabel }; senza link resta una stringa.
// videoWide (+ ratioWide, posterWide): la versione orizzontale di un video
// delle storie, per gli schermi larghi; si salva solo se c'e'.
const toRaw = ({ image, video, title, ratio, link, linkLabel, videoWide, ratioWide, posterWide }) => {
  const extra = {
    ...(link ? { link, ...(linkLabel ? { linkLabel } : {}) } : {}),
    ...(video && videoWide ? { videoWide, ...(ratioWide ? { ratioWide } : {}), ...(posterWide ? { posterWide } : {}) } : {}),
  };
  if (video || title) return { poster: image || "", video: video || "", title: title || "", ...(ratio ? { ratio } : {}), ...extra };
  if (link) return { image: image || "", ...extra };
  return image || "";
};

const firstImage = (arr) => {
  for (const it of (arr || [])) { const m = normMedia(it); if (m.image) return m.image; }
  return "";
};
// Prima FOTO del carosello: una slide video non conta, anche se ha la sua
// copertina. E' l'immagine della cella quando il post non ha una Copertina
// propria, e quella che Google associa al progetto (campo url). Come
// firstPhotoOf in src/app.jsx.
const firstPhoto = (arr) => {
  for (const it of (arr || [])) { const m = normMedia(it); if (m.image && !m.video) return m.image; }
  return firstImage(arr);
};
const srcOf = (v) => v ? (v.startsWith("http") ? v : "/" + v.replace(/^\/+/, "")) : "";
const fmtMB = (b) => (b / 1048576).toFixed(1) + " MB";
const fmtDur = (s) => {
  if (!isFinite(s)) return "—";
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m + "'" + String(r).padStart(2, "0") + '"';
};

// ── Helpers ────────────────────────────────────────────────────────────────
function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const splitFiles = (files) => ({
  imgs: files.filter(f => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(f.name)),
  vids: files.filter(f => /^video\//.test(f.type) || VIDEO_RE.test(f.name)),
});

// ── API call with clear, server-aware error messages ────────────────────────
// Distinguishes: rete giù, endpoint inesistente (sito non su Vercel),
// password errata (401), GITHUB_TOKEN mancante (500), permessi token (502).
async function apiPost(payload){
  let res;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    throw new Error("Rete non raggiungibile: impossibile contattare /api/save. Verifica la connessione e che il sito sia pubblicato su Vercel.");
  }

  // Read as text first: a non-Vercel host (es. GitHub Pages) risponde con HTML,
  // non JSON, e res.json() esploderebbe con un errore criptico.
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

  if (res.ok) {
    if (!data) throw new Error("Risposta non-JSON dal server: /api/save potrebbe non essere attivo.");
    return data;
  }

  // Errore senza corpo JSON → quasi certamente non è la funzione serverless a rispondere.
  if (!data) {
    throw new Error("Endpoint /api/save non trovato (HTTP " + res.status + "). La funzione serverless non risponde: probabile sito NON su Vercel — su hosting statico /api/save non esiste. Su Vercel verifica che api/save.js sia deployato.");
  }

  const serverMsg = data.error || "errore sconosciuto";
  if (res.status === 401) {
    throw new Error("Password errata (401). Se su Vercel hai impostato una ADMIN_PASSWORD personalizzata (diversa dal default), entra con quella.");
  }
  if (res.status === 429) {
    throw new Error("Troppi tentativi falliti (429). Per sicurezza l'accesso e' bloccato per qualche minuto: aspetta e riprova con la password giusta.");
  }
  if (res.status === 413) {
    throw new Error("File troppo grande per l'upload (413). Comprimi l'immagine: lato lungo 2000px, qualità 80, sotto i 3 MB.");
  }
  if (res.status === 500) {
    const tokenHint = /GITHUB_TOKEN/i.test(serverMsg) ? " → imposta la env var GITHUB_TOKEN su Vercel e rifai il deploy." : "";
    throw new Error("Errore di configurazione server (500): " + serverMsg + tokenHint);
  }
  if (res.status === 502) {
    throw new Error("GitHub ha rifiutato la scrittura (502): " + serverMsg + " → spesso il token non ha permesso Contents: Read and write sul repo, oppure owner/repo/branch sono errati.");
  }
  throw new Error("HTTP " + res.status + ": " + serverMsg);
}

async function uploadImage(file, password){
  if (file.size > MAX_UPLOAD) {
    throw new Error('"' + file.name + '" pesa ' + fmtMB(file.size) + ": il limite dal pannello è 3 MB. Comprimila (lato lungo 2000px, qualità 80) e riprova.");
  }
  const dataUrl = await fileToBase64(file);
  const j = await apiPost({ action:"upload", password, filename:file.name, contentBase64:dataUrl });
  return j.path;
}

async function uploadDataUrl(dataUrl, filename, password){
  const j = await apiPost({ action:"upload", password, filename, contentBase64:dataUrl });
  return j.path;
}

// Vero se il file e' una WebP o una GIF animata. Si leggono solo i primi byte:
// la WebP lo dichiara nell'intestazione (blocco VP8X, flag animazione), la GIF
// che va in loop contiene l'estensione NETSCAPE2.0 prima del primo fotogramma.
async function isAnimated(file){
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const str = (a, b) => String.fromCharCode(...head.subarray(a, b));
  if (str(0, 4) === "RIFF" && str(8, 12) === "WEBP") return str(12, 16) === "VP8X" && (head[20] & 0x02) !== 0;
  if (str(0, 3) === "GIF") return str(0, head.length).includes("NETSCAPE2.0");
  return false;
}

// Primo fotogramma di un'immagine (anche animata) come JPEG, alla sua misura:
// disegnata su un canvas, un'immagine animata da' il fotogramma di partenza.
// Serve solo per il fermo immagine: la copertina vera si carica cosi' com'e'.
function firstFrame(file){
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        cv.getContext("2d").drawImage(img, 0, 0);
        resolve(cv.toDataURL("image/jpeg", 0.92));
      } catch (e) { reject(e); }
      finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("immagine non leggibile")); };
    img.src = url;
  });
}

// Valida la password contro il server senza modificare api/save.js:
// save.js risponde 401 se la password è sbagliata e 400 ("Azione sconosciuta")
// se la password è giusta ma l'azione non esiste.
async function checkPassword(p){
  let res;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action:"__ping", password:p }),
    });
  } catch (e) { return { offline:true }; }
  if (res.status === 401) return { ok:false };
  if (res.status === 400) return { ok:true };
  // 429 = rate limit del server dopo troppi tentativi falliti. Senza questo
  // ramo finirebbe nel caso ">= 404" e mostrerebbe "non riesco a contattare
  // /api/save", che manderebbe l'utente a cercare un problema di deploy
  // inesistente.
  if (res.status === 429) return { blocked:true };
  // 403 = Origin rifiutato dal server. Senza questo ramo cadrebbe nel
  // "return { ok:true }" finale e farebbe entrare nel pannello chi non
  // potra' poi salvare nulla.
  if (res.status === 403) return { offline:true };
  if (res.status >= 404) return { offline:true };
  return { ok:true };
}

// ── Verifica di un link video esterno (Bunny, file .mp4 & co.) ──────────────
function mediaErrMsg(code, url){
  const httpHint = /^http:\/\//i.test(url)
    ? " ⚠ Il link è in http:// — su un sito https i video in http vengono bloccati dal browser: usa https://."
    : "";
  if (/\.m3u8(\?|#|$)/i.test(url)) {
    return "Link HLS (.m3u8): si vede su Safari/iPhone ma non su Chrome senza un player dedicato. Meglio un file .mp4 diretto." + httpHint;
  }
  switch (code) {
    case 1: return "Caricamento interrotto." + httpHint;
    case 2: return "File non raggiungibile: controlla che sullo storage sia impostato come PUBBLICO." + httpHint;
    case 3: return "Il browser non riesce a decodificare il file: esportalo in MP4 (H.264 + AAC)." + httpHint;
    case 4: return "Il link non apre un file video diretto, o il formato non è supportato. Per un video su Bunny Stream incolla il link Embed; da altri storage serve un indirizzo che, aperto in una scheda nuova, fa partire il video — non una pagina di anteprima." + httpHint;
    default: return "Link non verificabile." + httpHint;
  }
}

// Stacca la src da un <video> temporaneo: senza questo il browser continua a
// scaricare in background dopo la verifica.
function stopVideo(el){
  try { el.pause(); el.removeAttribute("src"); el.load(); } catch (e) {}
}

function probeVideo(url, withCors){
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    if (withCors) v.crossOrigin = "anonymous";
    let done = false;
    const to = setTimeout(() => {
      if (done) return; done = true;
      reject(new Error("Timeout: lo storage non ha risposto entro 20 secondi (file molto grande o server lento)."));
    }, 20000);
    v.onloadedmetadata = () => {
      if (done) return; done = true; clearTimeout(to);
      resolve({ el:v, duration:v.duration, w:v.videoWidth, h:v.videoHeight });
    };
    v.onerror = () => {
      if (done) return; done = true; clearTimeout(to);
      reject(new Error(mediaErrMsg(v.error && v.error.code, url)));
    };
    v.src = url;
  });
}

// Proporzioni e durata di un video Bunny dai metadati dell'MP4 di ripiego
// (il browser scarica solo l'intestazione). Larghezza e altezza si leggono
// anche senza permessi CORS. Se manca la versione a 360p si prova le altre.
async function bunnyMeta(info){
  let ultimo = null;
  for (const q of [360, 240, 480, 720]) {
    try {
      const v = await probeVideo(info.mp4(q), false);
      stopVideo(v.el);
      return v;
    } catch (e) { ultimo = e; }
  }
  throw ultimo || new Error("video non raggiungibile");
}

// Estrae un frame dal video e lo restituisce come data URL JPEG.
// Richiede che lo storage mandi gli header CORS: se non li manda, il canvas
// è "tainted" e si ricade sul drag&drop manuale della copertina.
async function grabPoster(url){
  let el;
  try {
    ({ el } = await probeVideo(url, true));
  } catch (e) {
    throw new Error("Impossibile leggere il video con i permessi CORS (" + e.message + ") → la copertina automatica non è disponibile su questo storage: trascina tu una foto nel riquadro qui a fianco.");
  }
  await new Promise((res) => {
    el.onseeked = res;
    const t = setTimeout(res, 6000);
    el.onerror = () => { clearTimeout(t); res(); };
    try { el.currentTime = Math.min(1.5, (el.duration || 2) * 0.1); } catch (e) { res(); }
  });
  const maxW = 1080;
  const vw = el.videoWidth || 720, vh = el.videoHeight || 1280;
  const scale = Math.min(1, maxW / vw);
  const cv = document.createElement("canvas");
  cv.width = Math.max(2, Math.round(vw * scale));
  cv.height = Math.max(2, Math.round(vh * scale));
  cv.getContext("2d").drawImage(el, 0, 0, cv.width, cv.height);
  let out;
  try {
    out = cv.toDataURL("image/jpeg", 0.82);
  } catch (e) {
    stopVideo(el);
    throw new Error("Lo storage non invia gli header CORS, quindi il browser vieta di leggere il frame: trascina tu una foto come copertina.");
  }
  stopVideo(el);
  return out;
}

const posterName = (url) => {
  try {
    const base = decodeURIComponent(new URL(url, location.href).pathname.split("/").pop() || "video");
    return "poster-" + base.replace(/\.[a-z0-9]+$/i, "") + ".jpg";
  } catch (e) { return "poster.jpg"; }
};

function move(arr, from, to){
  const copy = arr.slice();
  if (to < 0 || to >= copy.length) return copy;
  const [it] = copy.splice(from, 1);
  copy.splice(to, 0, it);
  return copy;
}

// Voci dei crediti con cui nasce un post nuovo. Sono vuote, quindi sul sito non
// si vedono finché non le compili.
const DEFAULT_CREDITS = () =>
  ["CLIENT", "YEAR", "FORMAT", "ART DIRECTION", "PRODUCTION"].map(label => ({ label, value:"" }));

// Default empty shapes per section
const BLANKS = {
  feed:   () => ({ url:"", images:[], title:"NUOVO", year:"2025", loc:"", film:"", credits: DEFAULT_CREDITS() }),
  motion: () => "",
  series: () => ({ id:"nuovo", label:"NUOVA SERIE", image:"", images:[] }),
  index:  () => ({ num:"00", title:"NUOVO", location:"", year:"2025", image:"" }),
};

const SECTIONS = [
  { key:"feed",   label:"FEED",   help:"Griglia principale (celle 4:5). La Copertina è l'immagine della cella e si vede solo nella griglia: può essere una WebP o GIF animata, si carica così com'è (max 3 MB) e, se è piccola, il sito la ingrandisce a pixel netti. Senza Copertina la cella mostra la prima foto del carosello. Il Logo (PNG o SVG trasparente) compare centrato sopra la copertina. Il carosello è quello che si sfoglia aprendo il post: trascina le foto e, con “+ Link video”, aggiungi un film ospitato su Bunny Stream: incolla il link Embed e proporzioni e copertina si compilano da sole. Il titolo è il nome del video; sotto, nella scheda, compaiono i Crediti: etichetta e valore liberi, nell'ordine che scegli, e le voci vuote non si vedono. Il valore di CLIENT compare anche passando col mouse sulla griglia. Anno, luogo e formato non si vedono nella scheda: servono a Google e alle pagine dei progetti." },
  { key:"motion", label:"MOTION", help:"Reel verticali 9:16. Copertina (foto leggera, trascinabile) + link Embed del video su Bunny Stream: il video parte solo al click, quindi la griglia resta veloce. Se la copertina manca, il pannello mette la miniatura di Bunny." },
  { key:"series", label:"SERIES", help:"Storie in evidenza (cerchi). Ogni serie è una cartella: copertina + slide che si sfogliano. Le slide possono essere foto o video." },
  { key:"index",  label:"INDEX",  help:"Indice tabellare numerato dei lavori." },
  { key:"about", label:"ABOUT", single:true, help:"Si apre cliccando la storia ABOUT ME: una pagina a tutto schermo con il video verticale a sinistra e, a destra, titolo, testi, i bottoni LET'S FILM e INSTAGRAM e due foto. La copertina rotonda della storia si cambia nella sezione SERIES." },
  { key:"settings", label:"IMPOSTAZIONI", single:true, help:"Tutti i testi del sito, la barra scorrevole in cima, lo showreel in cima alla home e la descrizione per Google e i motori AI." },
];

// ── Schema dei testi del sito ───────────────────────────────────────────────
// Deve restare allineato a TEXT_DEFAULTS in src/app.jsx: là ci sono i valori di
// default, qui le etichette con cui il pannello li presenta. Un campo assente
// qui esiste comunque nel sito, semplicemente non è modificabile da qui.
// Aggiungere una voce = aggiungerla in entrambi i file.
const SETTINGS_SCHEMA = [
  {
    key: "profile",
    title: "Intestazione — nome e presentazione",
    hint: "Il blocco in cima alla pagina, accanto alla foto profilo. Sotto il nome ci sono tre righe, nell'ordine qui sotto. Un campo lasciato vuoto non compare sul sito.",
    fields: [
      ["nameFirst",   "Nome (1ª riga del titolo)"],
      ["nameLast",    "Cognome (2ª riga del titolo)"],
      ["eyebrow",     "1ª riga sotto il nome"],
      ["handle",      "2ª riga sotto il nome"],
      ["disciplines", "3ª riga sotto il nome (discipline)"],
      ["badge",       "Etichetta sulla foto profilo"],
      ["siteLabel",   "Testo del link al sito"],
      ["siteUrl",     "Indirizzo del link al sito"],
      ["ctaPrimary",  "Pulsante principale (riga in alto, es. CONTACT ME)"],
      ["ctaIdle",     "Pulsante · riga sotto, a riposo (es. STAND BY)"],
      ["ctaHover",    "Pulsante · riga sotto, col mouse sopra (es. REC)"],
      ["ctaEmail",    "Email di contatto"],
      ["ctaSubject",  "Oggetto dell'email"],
      ["ctaSecondary","Pulsante secondario"],
    ],
  },
  {
    key: "contact",
    title: "Modulo di contatto",
    hint: "Con un ID Tally il pulsante apre quel modulo e le richieste finiscono anche nel cruscotto Tally. Lasciando il campo vuoto si usa il modulo interno, che invia per email.",
    fields: [
      ["tallyId", "ID del modulo Tally (es. wA1bC2)"],
    ],
  },
  {
    key: "topbar",
    title: "Barra sotto il marquee",
    hint: "La riga sottile con handle a sinistra e volume a destra.",
    fields: [["left", "Testo a sinistra"], ["right", "Testo a destra"]],
  },
  {
    key: "sections",
    title: "Sezioni e tab",
    hint: "Nomi delle tab e intestazioni delle liste. Rinominare una tab cambia solo l'etichetta: la sezione resta la stessa. Con titolo e unità delle serie vuoti, la riga sopra i cerchi non compare.",
    fields: [
      ["tabFeed",       "Tab 1"],
      ["tabMotion",     "Tab 2"],
      ["tabIndex",      "Tab 3 — INDEX (ora nascosta)"],
      ["seriesTitle",   "Titolo blocco serie"],
      ["seriesUnit",    "Unità di misura serie"],
      ["indexNo",       "Colonna indice — N."],
      ["indexTitle",    "Colonna indice — titolo"],
      ["indexLocation", "Colonna indice — luogo"],
      ["indexYear",     "Colonna indice — anno"],
      ["motionPrefix",  "Prefisso reel senza titolo"],
      ["motionYear",    "Anno mostrato sui reel senza video"],
      ["empty",         "Messaggio sezione vuota ({SECTION})"],
    ],
  },
  {
    key: "post",
    title: "Scheda del progetto",
    hint: "Le etichette dentro la finestra che si apre cliccando una foto.",
    fields: [
      ["year",     "Etichetta anno (post senza crediti)"],
      ["format",   "Etichetta formato (post senza crediti)"],
      ["prev",     "Pulsante precedente"],
      ["next",     "Pulsante successivo"],
      ["inquire",  "Pulsante contatto"],
      ["inquireSubject", "Oggetto dell'email di richiesta ({TITLE})"],
      ["carousel", "Dicitura carosello"],
      ["video",    "Dicitura video"],
      ["play",     "Dicitura play sui reel"],
      ["aiShort",  "Marchio AI sulla griglia"],
      ["aiLabel",  "Dicitura AI nella scheda"],
    ],
  },
  {
    key: "footer",
    title: "Piè di pagina",
    hint: "L'anno del copyright è automatico.",
    fields: [
      ["name",        "Nome"],
      ["studioLabel", "Etichetta città"],
      ["studioValue", "Città"],
      ["emailLabel",  "Etichetta email"],
      ["emailValue",  "Email"],
      ["socialLabel", "Etichetta social"],
      ["socialValue", "Handle social"],
      ["socialUrl",   "Link al profilo social"],
      ["release",     "Riga finale a sinistra"],
      ["vat",         "Partita IVA (mostrata nel footer)"],
      ["privacy",     "Link privacy"],
      ["legal",       "Link note legali"],
      ["cookie",      "Link cookie"],
      ["edition",     "Riga finale a destra"],
    ],
  },
  {
    key: "consent",
    title: "Banner cookie",
    hint: "Testo informativo mostrato al primo accesso. È un obbligo di legge: cambiare le parole va bene, toglierle no.",
    fields: [
      ["text",   "Testo", "area"],
      ["link",   "Testo del link all'informativa"],
      ["accept", "Pulsante accetta"],
      ["reject", "Pulsante rifiuta"],
    ],
  },
  {
    key: "seo",
    title: "SEO",
    hint: "Testi che i visitatori non vedono ma che descrivono le immagini a Google.",
    fields: [
      ["author",    "Autore citato negli alt delle foto"],
      ["avatarAlt", "Descrizione della foto profilo"],
    ],
  },
];

// ── Drag & drop hook ────────────────────────────────────────────────────────
function useDrop(onFiles){
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const handlers = {
    onDragEnter: (e) => { e.preventDefault(); e.stopPropagation(); depth.current++; setOver(true); },
    onDragOver:  (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; },
    onDragLeave: (e) => { e.preventDefault(); e.stopPropagation(); depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); },
    onDrop: (e) => {
      e.preventDefault(); e.stopPropagation();
      depth.current = 0; setOver(false);
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (files.length) onFiles(files);
    },
  };
  return [over, handlers];
}

const VIDEO_DROP_MSG = (name) =>
  '"' + name + '" è un video: i video non vanno caricati nel sito (lo appesantirebbero e GitHub li rifiuta). Caricalo su Bunny Stream, copia il link Embed e incollalo nel campo “Link video”.';

// ── Login gate ──────────────────────────────────────────────────────────────
function Login({ onAuth }){
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (u.trim() !== "admin"){ setErr("Utente non valido."); return; }
    if (!p){ setErr("Inserisci la password."); return; }
    setBusy(true);
    const r = await checkPassword(p);
    setBusy(false);
    if (r.offline){
      // Nessun /api/save raggiungibile (anteprima locale o hosting statico).
      // Qui prima si entrava con una password di default scritta nel codice:
      // rimossa, perché admin-edits.html è servito in chiaro e il repo è
      // pubblico. Senza API non si può validare nulla e comunque non si
      // potrebbe salvare, quindi non si entra.
      setErr("Non riesco a contattare /api/save per validare la password. Se il sito è su Vercel controlla il deploy e che la env var ADMIN_PASSWORD sia impostata.");
      return;
    }
    if (r.blocked){
      setErr("Troppi tentativi falliti. Per sicurezza l'accesso e' bloccato per qualche minuto: aspetta e riprova.");
      return;
    }
    if (r.ok) onAuth(p);
    else setErr("Password errata.");
  };

  return (
    <div className="fade" style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:360}}>
        <div className="mono uline" style={{fontSize:10,color:"var(--accent)",marginBottom:16}}>AON · CMS</div>
        <h1 className="display" style={{fontSize:38,marginBottom:6}}>ADMIN<br/>EDITS</h1>
        <p className="mono" style={{fontSize:11,color:"var(--mute)",marginBottom:28}}>Accesso riservato alla gestione dei contenuti.</p>
        <form onSubmit={submit}>
          <div style={{marginBottom:14}}>
            <label className="lbl">Utente</label>
            <input className="field mono" value={u} onChange={e=>setU(e.target.value)} autoFocus placeholder="admin" />
          </div>
          <div style={{marginBottom:20}}>
            <label className="lbl">Password</label>
            <input className="field mono" type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="••••••" />
          </div>
          {err && <div className="mono" style={{fontSize:11,color:"var(--accent)",marginBottom:16,lineHeight:1.5}}>{err}</div>}
          <button className="btn btn-accent" style={{width:"100%"}} type="submit" disabled={busy}>{busy ? "Verifico…" : "Entra"}</button>
        </form>
        <a href="/" className="mono" style={{display:"inline-block",marginTop:22,fontSize:10,color:"var(--mute)",textDecoration:"none"}}>← Torna al sito</a>
      </div>
    </div>
  );
}

// ── Image picker: click o drag&drop, carica in /media via API ────────────────
function ImageField({ value, password, onChange, onStatus, aspect, allowUrl }){
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    setBusy(true);
    onStatus && onStatus("Carico " + file.name + "…", "info");
    try {
      const path = await uploadImage(file, password);
      onChange(path);
      onStatus && onStatus("Caricata: " + path, "ok");
    } catch (err) {
      onStatus && onStatus("Upload fallito: " + err.message, "err");
    } finally { setBusy(false); }
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) upload(file);
  };

  const [over, dropHandlers] = useDrop((files) => {
    const { imgs, vids } = splitFiles(files);
    if (!imgs.length && vids.length){ onStatus && onStatus(VIDEO_DROP_MSG(vids[0].name), "err"); return; }
    if (!imgs.length){ onStatus && onStatus("Trascina un file immagine (jpg, png, webp).", "err"); return; }
    upload(imgs[0]);
  });

  const preview = value ? srcOf(value) : "";
  const thumbStyle = aspect ? { aspectRatio: aspect } : null;

  return (
    <div>
      <div className={"drop" + (over ? " over" : "")} data-hint="Rilascia la foto" {...dropHandlers} style={{position:"relative"}}>
        {preview
          ? <img className="thumb" style={thumbStyle} src={preview} alt="" onError={(e)=>{e.target.style.opacity=0.2;}} onLoad={(e)=>{e.target.style.opacity=1;}} />
          : <div className="thumb" style={{...(thumbStyle||{}),display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4}}>
              <span className="mono" style={{fontSize:9,color:"#555",letterSpacing:"0.14em"}}>TRASCINA QUI</span>
              <span className="mono" style={{fontSize:8,color:"#3d3d3d"}}>oppure usa il pulsante</span>
            </div>}
        {busy && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:5}}>
            <div className="spin" style={{width:22,height:22,border:"2px solid #444",borderTopColor:"var(--accent)",borderRadius:"50%"}} />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{display:"none"}} />
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <button className="btn btn-ghost" style={{flex:1}} onClick={()=>inputRef.current && inputRef.current.click()} disabled={busy}>
          {busy ? "Carico…" : (value ? "Sostituisci" : "Scegli foto")}
        </button>
        {value && <button className="btn btn-ghost btn-xs" onClick={()=>onChange("")} title="Rimuovi copertina">✕</button>}
      </div>
      {allowUrl && (
        <input className="field sm mono" style={{marginTop:6}}
          value={isVideoUrl(value) ? "" : (value || "")}
          onChange={e=>{
            const v = e.target.value.trim();
            // Un link video incollato qui romperebbe la copertina (<img> su un .mp4).
            if (isVideoUrl(v)){
              onStatus && onStatus("Quello è un link video: incollalo nel campo “Link video esterno”, non nella copertina.", "err");
              return;
            }
            onChange(v);
          }}
          placeholder="…oppure incolla un URL immagine" />
      )}
    </div>
  );
}

// ── Copertina e logo di un post del feed ────────────────────────────────────
// Due riquadri accanto, con l'anteprima della cella com'è sul sito.
//   Copertina: si vede solo nella griglia, non nel carosello. Puo' essere una
//              WebP o GIF animata, quindi il file si carica cosi' com'e' (nessuna
//              ricompressione, che fermerebbe l'animazione). Per un file
//              animato si carica anche un fermo immagine, il primo fotogramma,
//              che il sito mostra a chi ha chiesto al sistema meno animazioni.
//   Logo:      PNG o SVG trasparente, centrato sopra la copertina.
function CellAssetField({ kind, item, password, onPatch, onStatus }){
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const isCover = kind === "cover";
  const value = isCover ? item.cover : item.logo;
  // L'upload dura qualche secondo: alla fine si applica la modifica al post
  // com'e' in quel momento, non com'era quando e' partito, cosi' un titolo
  // scritto nel frattempo non va perso.
  const patchRef = useRef(onPatch);
  patchRef.current = onPatch;

  const upload = async (file) => {
    setBusy(true);
    onStatus && onStatus("Carico " + file.name + "…", "info");
    try {
      const path = await uploadImage(file, password);
      if (!isCover) {
        patchRef.current({ logo: path });
        onStatus && onStatus("Logo caricato: " + path, "ok");
        return;
      }
      let fermo;
      if (await isAnimated(file)) {
        try {
          fermo = await uploadDataUrl(await firstFrame(file), file.name.replace(/\.[^.]+$/, "") + "-poster.jpg", password);
        } catch (e) { fermo = undefined; }
      }
      patchRef.current({ cover: path, coverPoster: fermo });
      onStatus && onStatus("Copertina caricata: " + path + (fermo ? " · con fermo immagine" : ""), "ok");
    } catch (err) {
      onStatus && onStatus("Upload fallito: " + err.message, "err");
    } finally { setBusy(false); }
  };

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (file) upload(file);
  };

  const [over, dropHandlers] = useDrop((files) => {
    const { imgs, vids } = splitFiles(files);
    if (!imgs.length && vids.length){ onStatus && onStatus(VIDEO_DROP_MSG(vids[0].name), "err"); return; }
    if (!imgs.length){ onStatus && onStatus(isCover ? "Trascina un'immagine: WebP o GIF animata, jpg, png." : "Trascina il logo: PNG o SVG trasparente.", "err"); return; }
    upload(imgs[0]);
  });

  const remove = () => onPatch(isCover ? { cover: undefined, coverPoster: undefined } : { logo: undefined });
  // Nel riquadro Copertina il logo si vede sopra, come sulla cella; nel
  // riquadro Logo si vede da solo, sullo sfondo scuro della cella vuota.
  const showLogo = item.logo && (isCover ? item.cover : true);

  return (
    <div>
      <div className={"drop cell-prev" + (over ? " over" : "")} data-hint={isCover ? "Rilascia la copertina" : "Rilascia il logo"} {...dropHandlers}>
        {isCover && item.cover && <img className="cell-cover" src={srcOf(item.cover)} alt="" />}
        {showLogo && <img className="cell-logo" src={srcOf(item.logo)} alt="" />}
        {!value && (
          <div className="cell-idle">
            <span>Trascina qui</span>
            <span style={{color:"#3d3d3d"}}>{isCover ? "webp/gif animata o foto" : "png o svg trasparente"}</span>
          </div>
        )}
        {busy && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:5}}>
            <div className="spin" style={{width:22,height:22,border:"2px solid #444",borderTopColor:"var(--accent)",borderRadius:"50%"}} />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{display:"none"}} />
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <button className="btn btn-ghost" style={{flex:1}} onClick={()=>inputRef.current && inputRef.current.click()} disabled={busy}>
          {busy ? "Carico…" : (value ? "Sostituisci" : "Scegli")}
        </button>
        {value && <button className="btn btn-ghost btn-xs" onClick={remove} title={isCover ? "Rimuovi copertina" : "Rimuovi logo"}>✕</button>}
      </div>
    </div>
  );
}

// ── Campo link video (Bunny Stream) + proporzioni + copertina automatica ─────
// Si incolla il link Embed di Bunny (o tutto il codice <iframe>): il campo lo
// ripulisce, legge proporzioni e durata dal video e, se la slide non ha
// ancora una copertina, mette la miniatura di Bunny. Le proporzioni restano
// modificabili a mano. Un file .mp4 diretto continua a funzionare.
// onPatch riceve più campi insieme ({ video, ratio, image }): applicarli uno
// alla volta farebbe perdere i precedenti.
function VideoLinkField({ value, poster, ratio, password, onChange, onPoster, onPatch, onStatus, compact }){
  const [state, setState] = useState(null); // {kind:'ok'|'err', msg}
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState(false);
  // Dopo un'attesa (la lettura del video) si usano le funzioni del genitore
  // aggiornate: la modifica si applica alla slide com'è in quel momento.
  const latest = useRef({});
  latest.current = { onChange, onPatch, poster };
  const applica = (p) => {
    const l = latest.current;
    if (l.onPatch) l.onPatch(p);
    else if ("video" in p) l.onChange(p.video);
  };

  // Il messaggio sotto il campo si azzera quando il link cambia a mano, non
  // quando è il pannello a ripulirlo (lì il messaggio è la conferma).
  const tieni = useRef(false);
  useEffect(() => { if (tieni.current) { tieni.current = false; return; } setState(null); }, [value]);

  const clean = (raw) => {
    // Se e' stato incollato un codice di incorporamento, si prende l'indirizzo
    // che contiene; altrimenti si ripulisce quello che c'e'.
    let u = estraiSrc(raw).replace(/^["'<]+|["'>]+$/g, "");
    if (/^\/\//.test(u)) u = "https:" + u;
    return u;
  };

  const info = bunnyInfo(clean(value || ""));
  const jumpshare = Boolean(jumpshareBase(clean(value || "")));

  // Proporzioni e copertina di un video Bunny. forzaCopertina: anche se la
  // slide ne ha già una (pulsante "Copertina auto").
  const autoBunny = async (b, forzaCopertina) => {
    if (!b.cdn) {
      setState({ kind:"err", msg:"Video di una libreria Bunny che il pannello non conosce (" + b.library + "): scrivi a mano proporzioni e copertina." });
      return;
    }
    setBusy(true);
    try {
      const meta = await bunnyMeta(b);
      const p = { ratio: ratioLabel(meta.w, meta.h) };
      if (forzaCopertina || !latest.current.poster) p.image = b.thumb;
      applica(p);
      setState({ kind:"ok", msg: "Video Bunny · " + fmtDur(meta.duration) + " · " + meta.w + "×" + meta.h + " → proporzioni " + p.ratio + (p.image ? " · copertina: la miniatura di Bunny" : "") });
    } catch (e) {
      setState({ kind:"err", msg:"Non riesco a leggere il video su Bunny: controlla che il link sia giusto e che Bunny abbia finito di elaborarlo. Le proporzioni si possono scrivere a mano." });
    } finally { setBusy(false); }
  };

  const onInput = (raw) => {
    const t = raw.trim();
    const b = bunnyInfo(clean(t));
    if (b) {
      // Nel campo resta il link pulito, senza parametri: quelli li aggiunge il sito.
      applica({ video: b.embed });
      autoBunny(b, false);
      return;
    }
    applica({ video: t });
  };

  const verify = async () => {
    const url = clean(value);
    if (!url){ setState({ kind:"err", msg:"Incolla prima un link." }); return; }
    if (info) { await autoBunny(info, false); return; }
    if (jumpshare) {
      setState({ kind:"err", msg:"Jumpshare non è più usato: il sito blocca i suoi video. Carica il video su Bunny Stream e incolla qui il link Embed." });
      return;
    }
    setBusy(true); setState(null);
    // Un iframe di un altro dominio non espone durata ne' risoluzione: il
    // browser non lo consente. Per gli embed la verifica si limita quindi a
    // riconoscere la forma dell'indirizzo — la prova vera e' guardare il video
    // sul sito dopo il salvataggio.
    if (/\/embed\//i.test(url)) {
      if (url !== value) { tieni.current = true; applica({ video: url }); }
      setState({ kind:"ok", msg:"Link di incorporamento riconosciuto. Salva e controlla il video sul sito: da un iframe durata e risoluzione non sono leggibili." });
      setBusy(false);
      return;
    }
    let ultimo = null;
    for (const c of CANDIDATI_VIDEO(url)) {
      try {
        const v = await probeVideo(c, false);
        if (c !== value) tieni.current = true;
        applica({ video: c, ratio: ratioLabel(v.w, v.h) });
        setState({ kind:"ok", msg: "Link valido · " + fmtDur(v.duration) + " · " + v.w + "×" + v.h + " → proporzioni " + ratioLabel(v.w, v.h) });
        stopVideo(v.el); // niente buffering in background dopo il controllo
        setBusy(false);
        return;
      } catch (e) { ultimo = e; }
    }
    setState({ kind:"err", msg: (ultimo && ultimo.message) || "Link non verificabile." });
    setBusy(false);
  };

  const makePoster = async () => {
    const url = clean(value);
    if (!url){ setState({ kind:"err", msg:"Incolla prima un link." }); return; }
    if (info) { await autoBunny(info, true); return; }
    setGen(true);
    onStatus && onStatus("Estraggo un fotogramma dal video…", "info");
    try {
      const dataUrl = await grabPoster(url);
      const path = await uploadDataUrl(dataUrl, posterName(url), password);
      if (onPatch) onPatch({ image: path }); else onPoster && onPoster(path);
      onStatus && onStatus("Copertina generata dal video: " + path, "ok");
    } catch (e) {
      onStatus && onStatus(e.message, "err");
    } finally { setGen(false); }
  };

  const httpWarn = /^http:\/\//i.test(value || "");

  return (
    <div>
      <label className="lbl">Link video · Bunny Stream (incolla il link Embed)</label>
      <input className="field mono" value={value || ""} onChange={e=>onInput(e.target.value)}
        placeholder="https://player.mediadelivery.net/embed/788231/…" />
      <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
        <button className="btn btn-ghost btn-xs" onClick={verify} disabled={busy || !value}>{busy ? "Leggo il video…" : "Verifica link"}</button>
        <button className="btn btn-ghost btn-xs" onClick={makePoster} disabled={gen || busy || !value}
          title={info ? "Usa la miniatura di Bunny come copertina" : "Prova a generare la copertina prendendo un fotogramma dal video"}>
          {gen ? "Genero…" : "Copertina auto"}
        </button>
        {value && <button className="btn btn-ghost btn-xs" onClick={()=>applica({ video:"", ratio:"" })}>Rimuovi video</button>}
      </div>
      {value && onPatch && (
        <div style={{marginTop:8}}>
          <label className="lbl">Proporzioni · es. 16/9, 4/3, 4/5, 9/16</label>
          <input className="field sm mono" value={ratio || ""} placeholder={info ? "si compilano da sole" : "16/9"}
            onChange={e=>onPatch({ ratio: e.target.value.trim() })} />
        </div>
      )}
      {httpWarn && <div className="chip err" style={{marginTop:6}}>usa https://</div>}
      {jumpshare && (
        <div className="mono" style={{marginTop:6,fontSize:10,lineHeight:1.5,color:"var(--accent)"}}>
          ✕ Link Jumpshare: il sito non li mostra più. Carica il video su Bunny Stream e incolla qui il link Embed.
        </div>
      )}
      {state && (
        <div className="mono" style={{
          marginTop:6,fontSize:10,lineHeight:1.5,
          color: state.kind === "ok" ? "var(--ok)" : "var(--accent)",
        }}>{state.kind === "ok" ? "✓ " : "✕ "}{state.msg}</div>
      )}
      {!compact && (
        <p className="mono" style={{marginTop:6,fontSize:9,color:"#555",lineHeight:1.6}}>
          Il video resta su Bunny: il sito ne mostra solo la copertina e lo carica al click.
        </p>
      )}
    </div>
  );
}

// ── Editor di una singola slide (foto e/o video) ─────────────────────────────
function SlideEditor({ item, password, onChange, onStatus, onDone, aspect, wide }){
  const m = normMedia(item);
  const patch = (p) => onChange(toRaw({ ...m, ...p }));
  return (
    <div className="panel fade" style={{marginTop:10,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,alignItems:"start"}}>
      <div style={{minWidth:0}}>
        <label className="lbl">{m.video ? "Copertina del video" : "Immagine"}</label>
        <ImageField value={m.image} password={password} aspect={aspect}
          onChange={(v)=>patch({ image:v })} onStatus={onStatus} allowUrl />
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,minWidth:0}}>
        <VideoLinkField value={m.video} poster={m.image} ratio={m.ratio} password={password} compact
          onChange={(v)=>patch({ video:v })}
          onPoster={(p)=>patch({ image:p })}
          onPatch={patch}
          onStatus={onStatus} />
        {wide && m.video && (
          <div>
            <label className="lbl">Link video orizzontale (desktop) · opzionale</label>
            {/* Stesso campo del video normale, ma scrive videoWide /
                ratioWide / posterWide: su schermi larghi la storia usa questo. */}
            <VideoLinkField value={m.videoWide} poster={m.posterWide} ratio={m.ratioWide} password={password} compact
              onChange={(v)=>patch({ videoWide:v })}
              onPoster={(p)=>patch({ posterWide:p })}
              onPatch={(p)=>patch({
                ...("video" in p ? { videoWide:p.video } : {}),
                ...("ratio" in p ? { ratioWide:p.ratio } : {}),
                ...("image" in p ? { posterWide:p.image } : {}),
              })}
              onStatus={onStatus} />
          </div>
        )}
        <div>
          <label className="lbl">Titolo slide (opzionale)</label>
          <input className="field sm" value={m.title} onChange={e=>patch({ title:e.target.value })} placeholder="es. SANTONI BACK TO OFFICE — FILM" />
        </div>
        <div>
          <label className="lbl">Link (opzionale)</label>
          <input className="field sm" value={m.link} onChange={e=>patch({ link:e.target.value.trim() })} placeholder="https://www.youtube.com/watch?v=…" />
        </div>
        <div>
          <label className="lbl">Etichetta link</label>
          <input className="field sm" value={m.linkLabel} onChange={e=>patch({ linkLabel:e.target.value })} placeholder="Watch on YouTube ↗" disabled={!m.link} />
        </div>
        <button className="btn btn-ghost btn-xs" style={{alignSelf:"flex-start"}} onClick={onDone}>Chiudi slide</button>
      </div>
    </div>
  );
}

// ── Galleria: foto (drag&drop multiplo) + slide video ───────────────────────
// coverIndex: la slide da segnare COVER, cioe' quella che la cella del feed
// mostra quando il post non ha una Copertina propria (-1 = nessuna).
function GalleryField({ images, password, onChange, onStatus, aspect, coverIndex = 0, wide }){
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(-1);
  const list = Array.isArray(images) ? images : [];

  const moveImg = (from, to) => {
    if (to < 0 || to >= list.length) return;
    const c = list.slice(); const [x] = c.splice(from, 1); c.splice(to, 0, x);
    onChange(c); setEdit(-1);
  };
  const removeImg = (i) => { onChange(list.filter((_, idx) => idx !== i)); setEdit(-1); };

  const addImages = async (files) => {
    if (!files.length) return;
    setBusy(true);
    const added = [];
    try {
      for (const file of files) {
        onStatus && onStatus("Carico " + file.name + "…", "info");
        added.push(await uploadImage(file, password));
      }
      onChange(list.concat(added));
      onStatus && onStatus(added.length + " immagine/i caricate", "ok");
    } catch (err) {
      if (added.length) onChange(list.concat(added));
      onStatus && onStatus("Upload fallito: " + err.message, "err");
    } finally { setBusy(false); }
  };

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    addImages(files);
  };

  const [over, dropHandlers] = useDrop((files) => {
    const { imgs, vids } = splitFiles(files);
    if (vids.length) onStatus && onStatus(VIDEO_DROP_MSG(vids[0].name), "err");
    if (imgs.length) addImages(imgs);
    else if (!vids.length) onStatus && onStatus("Trascina file immagine (jpg, png, webp).", "err");
  });

  const addVideoSlide = () => {
    onChange(list.concat([{ video:"", poster:"", title:"" }]));
    setEdit(list.length);
  };

  return (
    <div>
      <div className={"drop" + (over ? " over" : "")} data-hint="Rilascia le foto qui" {...dropHandlers}>
        {list.length > 0 ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(88px,1fr))",gap:6}}>
            {list.map((v, i) => {
              const m = normMedia(v);
              return (
                <div key={i} style={{position:"relative",outline: i === edit ? "1px solid var(--accent)" : "none"}}>
                  {m.image
                    ? <img src={srcOf(m.image)} alt="" style={{width:"100%",aspectRatio:aspect||"4/5",objectFit:"cover",background:"#111",display:"block"}} onError={(e)=>{e.target.style.opacity=0.2;}} onLoad={(e)=>{e.target.style.opacity=1;}} />
                    : <div style={{width:"100%",aspectRatio:aspect||"4/5",background:"#111",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span className="mono" style={{fontSize:8,color:"#555"}}>{m.video ? "VIDEO" : "VUOTO"}</span>
                      </div>}
                  {i === coverIndex && <span className="mono" style={{position:"absolute",top:2,left:2,background:"var(--accent)",color:"#000",fontSize:7,padding:"1px 3px",letterSpacing:"0.1em",zIndex:3}}>COVER</span>}
                  {m.video && <span className="vbadge">▶</span>}
                  <div style={{position:"absolute",bottom:2,left:2,right:2,display:"flex",justifyContent:"space-between",gap:2,zIndex:3}}>
                    <button className="btn btn-ghost" style={{padding:"1px 4px",fontSize:9}} onClick={()=>moveImg(i,i-1)} disabled={i===0} title="Sposta a sinistra">←</button>
                    <button className="btn btn-ghost" style={{padding:"1px 4px",fontSize:9}} onClick={()=>setEdit(edit===i?-1:i)} title="Modifica slide (foto / link video)">⋯</button>
                    <button className="btn btn-ghost" style={{padding:"1px 4px",fontSize:9,color:"var(--accent)",borderColor:"rgba(255,61,0,0.4)"}} onClick={()=>removeImg(i)} title="Rimuovi">✕</button>
                    <button className="btn btn-ghost" style={{padding:"1px 4px",fontSize:9}} onClick={()=>moveImg(i,i+1)} disabled={i===list.length-1} title="Sposta a destra">→</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="drop-idle">Trascina qui le foto<br/><span style={{color:"#3d3d3d"}}>jpg · png · webp — max 3 MB ciascuna</span></div>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple onChange={onPick} style={{display:"none"}} />
      <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
        <button className="btn btn-ghost" style={{flex:1}} onClick={()=>inputRef.current && inputRef.current.click()} disabled={busy}>
          {busy ? "Carico…" : (list.length ? "+ Aggiungi foto" : "Scegli foto")}
        </button>
        <button className="btn btn-ghost" onClick={addVideoSlide} disabled={busy} title="Aggiunge una slide che punta a un video su Bunny Stream">+ Link video</button>
      </div>

      {edit >= 0 && edit < list.length && (
        <SlideEditor
          item={list[edit]}
          password={password}
          aspect={aspect}
          wide={wide}
          onChange={(next)=>onChange(list.map((it,i)=> i===edit ? next : it))}
          onStatus={onStatus}
          onDone={()=>setEdit(-1)} />
      )}
    </div>
  );
}

// ── Barra scorrevole (marquee) ──────────────────────────────────────────────
// Ogni voce è una coppia etichetta/valore: l'etichetta è la parola grigia, il
// valore quella bianca. Svuotare la lista fa sparire la barra dal sito.
function MarqueeEditor({ items, onChange }){
  const list = Array.isArray(items) ? items : [];
  const set = (i, k, v) => onChange(list.map((it, j) => j === i ? { ...it, [k]: v } : it));
  return (
    <div className="set-group">
      <h3>Barra scorrevole in cima al sito</h3>
      <p className="hint">
        Il nastro che scorre sopra all'intestazione. Ogni riga è una voce: a sinistra
        l'etichetta grigia, a destra il testo bianco. L'ordine è quello di scorrimento.
        Senza voci la barra non compare.
      </p>
      {/* Lista assente e lista vuota non sono la stessa cosa: senza la chiave
          il sito mostra la barra di default, con la lista vuota la nasconde. */}
      {list.length === 0 && (
        <p className="mono" style={{fontSize:11,color:"var(--mute)",marginBottom:10,lineHeight:1.6}}>
          {Array.isArray(items)
            ? "Barra disattivata: senza voci il nastro non compare sul sito."
            : "Nessuna barra personalizzata: il sito mostra le voci predefinite. Aggiungine una per sostituirle."}
        </p>
      )}
      {list.map((it, i) => (
        <div className="row-mq" key={i}>
          <input className="field sm mono" value={(it && it.label) || ""} placeholder="ETICHETTA"
            onChange={e => set(i, "label", e.target.value)} />
          <input className="field sm mono" value={(it && it.value) || ""} placeholder="Testo"
            onChange={e => set(i, "value", e.target.value)} />
          <div style={{display:"flex",gap:4}}>
            <button className="btn btn-ghost btn-xs" onClick={() => onChange(move(list, i, i-1))} disabled={i===0} title="Su">↑</button>
            <button className="btn btn-ghost btn-xs" onClick={() => onChange(move(list, i, i+1))} disabled={i===list.length-1} title="Giù">↓</button>
            <button className="btn btn-ghost btn-xs" style={{color:"var(--accent)",borderColor:"rgba(255,61,0,0.4)"}}
              onClick={() => onChange(list.filter((_, j) => j !== i))} title="Elimina">✕</button>
          </div>
        </div>
      ))}
      <button className="btn btn-ghost" style={{marginTop:10}}
        onClick={() => onChange(list.concat([{ label:"NUOVA", value:"" }]))}>+ Aggiungi voce</button>
    </div>
  );
}

// ── Crediti di un post del feed ─────────────────────────────────────────────
// Coppie etichetta/valore libere, nell'ordine scelto: sul sito compaiono sotto
// il titolo, nella scheda del progetto. Stessa logica della barra scorrevole.
// Una voce col valore vuoto resta qui, pronta da compilare, ma non si vede.
function CreditsEditor({ items, onChange }){
  const list = Array.isArray(items) ? items : [];
  const set = (i, k, v) => onChange(list.map((it, j) => j === i ? { ...it, [k]: v } : it));
  return (
    <div>
      <label className="lbl">Crediti · nella scheda, sotto il titolo · le voci vuote non si vedono</label>
      {!Array.isArray(items) && (
        <p className="mono" style={{fontSize:10,color:"var(--mute)",margin:"2px 0 8px",lineHeight:1.6}}>
          Nessun credito: la scheda mostra anno e formato presi dai campi qui sotto.
        </p>
      )}
      {list.map((it, i) => (
        <div className="row-cr" key={i}>
          <input className="field sm mono" value={(it && it.label) || ""} placeholder="ETICHETTA"
            onChange={e => set(i, "label", e.target.value)} />
          <input className="field sm" value={(it && it.value) || ""} placeholder="Valore"
            onChange={e => set(i, "value", e.target.value)} />
          <div style={{display:"flex",gap:4}}>
            <button className="btn btn-ghost btn-xs" onClick={() => onChange(move(list, i, i-1))} disabled={i===0} title="Su">↑</button>
            <button className="btn btn-ghost btn-xs" onClick={() => onChange(move(list, i, i+1))} disabled={i===list.length-1} title="Giù">↓</button>
            <button className="btn btn-ghost btn-xs" style={{color:"var(--accent)",borderColor:"rgba(255,61,0,0.4)"}}
              onClick={() => onChange(list.filter((_, j) => j !== i))} title="Elimina">✕</button>
          </div>
        </div>
      ))}
      <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
        <button className="btn btn-ghost btn-xs" onClick={() => onChange(list.concat([{ label:"", value:"" }]))}>+ Aggiungi voce</button>
        {list.length === 0 && (
          <button className="btn btn-ghost btn-xs" onClick={() => onChange(DEFAULT_CREDITS())}>Usa le voci predefinite</button>
        )}
      </div>
    </div>
  );
}

// ── Gruppo di campi testuali ────────────────────────────────────────────────
function TextGroup({ group, values, onChange }){
  const v = values || {};
  return (
    <div className="set-group">
      <h3>{group.title}</h3>
      {group.hint && <p className="hint">{group.hint}</p>}
      <div className="set-grid">
        {group.fields.map(([k, lbl, kind]) => (
          <div key={k} style={ kind === "area" ? { gridColumn:"1 / -1" } : null }>
            <label className="lbl">{lbl}</label>
            {kind === "area"
              ? <textarea className="field" style={{minHeight:70}} value={v[k] != null ? v[k] : ""}
                  onChange={e => onChange({ ...v, [k]: e.target.value })} />
              : <input className="field" value={v[k] != null ? v[k] : ""}
                  onChange={e => onChange({ ...v, [k]: e.target.value })} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Showreel in cima alla home ──────────────────────────────────────────────
// Il video in loop in cima alla home, sopra il nome (settings.feedReel). Serve un file video diretto: un <video> in loop non sa riprodurre
// il player di Bunny, che funziona solo dentro un iframe. Se si incolla il
// link Embed di Bunny, il pannello lo converte nell'MP4 diretto dello stesso
// video (1080p) e, se manca, mette la miniatura come copertina.
function FeedReelEditor({ value, password, onChange, onStatus }){
  const v = value || {};
  const set = (k, x) => onChange({ ...v, [k]: x });
  const [nota, setNota] = useState("");
  const onVideo = (raw) => {
    const b = bunnyInfo(estraiSrc(raw.trim()));
    if (b && b.cdn) {
      onChange({ ...v, video: b.mp4(1080), poster: v.poster || b.thumb });
      setNota("Link Bunny convertito nel file MP4 diretto a 1080p" + (v.poster ? "." : ", con la miniatura di Bunny come copertina."));
      return;
    }
    setNota("");
    set("video", raw.trim());
  };
  const video = String(v.video || "").trim();
  const embed = Boolean(video) && (JUMPSHARE_RE.test(video) || /\/embed\//i.test(video) || /<iframe/i.test(video));
  // L'anteprima si accende solo su un indirizzo che finisce come un file
  // video: altrimenti, mentre si scrive, ogni lettera ("h", "ht", …) farebbe
  // partire una richiesta a vuoto.
  const file = Boolean(video) && !embed && VIDEO_RE.test(video);
  const strano = Boolean(video) && !embed && !file;
  const avviso = { marginTop:6, fontSize:10, lineHeight:1.5, color:"var(--accent)" };

  return (
    <div className="set-group">
      <h3>Showreel in cima alla home (video in loop)</h3>
      <p className="hint">
        Il video a tutta larghezza in cima alla home, sopra il nome (21:9 da computer, 16:9 da telefono,
        tagliato al centro): si vede sia nel Feed sia nei Motion, parte da solo, muto, e gira in loop.
        Serve l'indirizzo di un file video diretto (.mp4): un file del sito come
        media/showreel.mp4, oppure l'MP4 di un video su Bunny Stream. Puoi incollare
        anche il link Embed di Bunny: il pannello lo converte da solo nell'MP4 a 1080p
        (per un file più leggero cambia 1080 in 720). Con il campo video vuoto il blocco non compare.
      </p>
      <div className="set-grid">
        <div style={{ gridColumn:"1 / -1" }}>
          <label className="lbl">Video (.mp4)</label>
          <input className="field mono" value={v.video || ""} placeholder="media/showreel.mp4"
            onChange={e => onVideo(e.target.value)} />
          {nota && <div className="mono" style={{ ...avviso, color:"var(--ok)" }}>✓ {nota}</div>}
          {embed && <div className="mono" style={avviso}>✕ Questo è un link da incorporare: qui serve il file .mp4 diretto. Così com'è, sul sito il blocco non compare.</div>}
          {strano && <div className="mono" style={avviso}>Non sembra un file video: l'indirizzo dovrebbe finire in .mp4 (o .webm, .mov). Il sito proverà comunque a riprodurlo.</div>}
        </div>
        <div>
          <label className="lbl">Copertina · si vede finché il video carica</label>
          <ImageField value={v.poster || ""} password={password} aspect="16/9"
            onChange={(x) => set("poster", x)} onStatus={onStatus} allowUrl />
        </div>
        <div>
          <label className="lbl">Anteprima</label>
          {file
            ? <video key={video} src={srcOf(video)} poster={v.poster ? srcOf(v.poster) : undefined}
                controls muted playsInline preload="metadata"
                style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", background:"#000", display:"block" }} />
            : <div className="mono" style={{ width:"100%", aspectRatio:"16/9", background:"#111", display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:9, color:"#555", letterSpacing:"0.14em" }}>NESSUN VIDEO</div>}
          <label className="lbl" style={{ marginTop:12 }}>Scritta in basso a sinistra</label>
          <input className="field" value={v.label != null ? v.label : ""} placeholder="SHOWREEL"
            onChange={e => set("label", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

// ── Pagina About ────────────────────────────────────────────────────────────
// media.json → "about". Il sito la apre cliccando la storia ABOUT ME.
// Il video e' un file MP4 diretto (un <video> in loop non sa riprodurre il
// player di Bunny): o un link, o un file caricato dal pannello (max 3 MB).
const ABOUT_BLANK = () => ({ video:"", poster:"", caption:"", title:"", lead:"", body:"", photos:[{ src:"", caption:"" }, { src:"", caption:"" }] });

function AboutVideoField({ value, password, onChange, onStatus }){
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [nota, setNota] = useState("");
  const video = String(value || "").trim();

  const onLink = (raw) => {
    const b = bunnyInfo(estraiSrc(raw.trim()));
    if (b && b.cdn) {
      onChange(b.mp4(720));
      setNota("Link Bunny convertito nel file MP4 diretto a 720p.");
      return;
    }
    setNota("");
    onChange(raw.trim());
  };
  const upload = async (file) => {
    if (!/^video\/mp4$/i.test(file.type) && !/\.mp4$/i.test(file.name)) {
      onStatus && onStatus('"' + file.name + '" non è un MP4: qui serve un file .mp4 (oppure incolla un link).', "err");
      return;
    }
    if (file.size > MAX_UPLOAD) {
      onStatus && onStatus('"' + file.name + '" pesa ' + fmtMB(file.size) + ": il limite dal pannello è 3 MB. Accorcialo o esportalo più leggero, oppure caricalo su Bunny e incolla qui il link.", "err");
      return;
    }
    setBusy(true);
    onStatus && onStatus("Carico " + file.name + "…", "info");
    try {
      const path = await uploadDataUrl(await fileToBase64(file), file.name, password);
      onChange(path);
      setNota("");
      onStatus && onStatus("Video caricato: " + path, "ok");
    } catch (err) {
      onStatus && onStatus("Upload fallito: " + err.message, "err");
    } finally { setBusy(false); }
  };
  const [over, dropHandlers] = useDrop((files) => { if (files[0]) upload(files[0]); });
  const embed = Boolean(video) && (/\/embed\//i.test(video) || /<iframe/i.test(video));
  const file = Boolean(video) && !embed && VIDEO_RE.test(video);
  const avviso = { marginTop:6, fontSize:10, lineHeight:1.5, color:"var(--accent)" };

  return (
    <div>
      <div className={"drop" + (over ? " over" : "")} data-hint="Rilascia l'MP4" {...dropHandlers} style={{ position:"relative" }}>
        {file
          ? <video key={video} src={srcOf(video)} controls muted playsInline preload="metadata"
              style={{ width:"100%", aspectRatio:"9/16", objectFit:"cover", background:"#000", display:"block" }} />
          : <div className="thumb mono" style={{ aspectRatio:"9/16", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:4, fontSize:9, color:"#555", letterSpacing:"0.14em" }}>
              <span>TRASCINA QUI L'MP4</span>
              <span style={{ fontSize:8, color:"#3d3d3d" }}>max 3 MB · oppure incolla un link</span>
            </div>}
        {busy && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:5 }}>
            <div className="spin" style={{ width:22, height:22, border:"2px solid #444", borderTopColor:"var(--accent)", borderRadius:"50%" }} />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="video/mp4,.mp4" style={{ display:"none" }}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) upload(f); }} />
      <div style={{ display:"flex", gap:6, marginTop:6 }}>
        <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => inputRef.current && inputRef.current.click()} disabled={busy}>
          {busy ? "Carico…" : (video ? "Sostituisci MP4" : "Carica MP4")}
        </button>
        {video && <button className="btn btn-ghost btn-xs" onClick={() => { onChange(""); setNota(""); }} title="Rimuovi video">✕</button>}
      </div>
      <input className="field sm mono" style={{ marginTop:6 }} value={video}
        placeholder="https://vz-…b-cdn.net/{guid}/play_720p.mp4"
        onChange={(e) => onLink(e.target.value)} />
      {nota && <div className="mono" style={{ ...avviso, color:"var(--ok)" }}>✓ {nota}</div>}
      {embed && <div className="mono" style={avviso}>✕ Questo è un link da incorporare: qui serve il file .mp4 diretto. Il link Embed di Bunny viene convertito da solo; un altro player no.</div>}
    </div>
  );
}

function AboutEditor({ value, password, onChange, onStatus }){
  const v = { ...ABOUT_BLANK(), ...(value || {}) };
  const photos = [0, 1].map((i) => ({ src:"", caption:"", ...((v.photos || [])[i] || {}) }));
  const set = (k, x) => onChange({ ...v, [k]: x });
  const setPhoto = (i, patch) => set("photos", photos.map((p, j) => j === i ? { ...p, ...patch } : p));
  const text = (k, lbl, area, hint, minH) => (
    <div style={area ? { gridColumn:"1 / -1" } : null}>
      <label className="lbl">{lbl}</label>
      {area
        ? <textarea className="field" style={{ minHeight: minH || 70 }} value={v[k] || ""} onChange={(e) => set(k, e.target.value)} />
        : <input className="field" value={v[k] || ""} onChange={(e) => set(k, e.target.value)} />}
      {hint && <p className="mono" style={{ fontSize:10, color:"#555", marginTop:6 }}>{hint}</p>}
    </div>
  );

  return (
    <div>
      <div className="set-group">
        <h3>Video</h3>
        <p className="hint">
          Il video verticale a sinistra: parte da solo, muto, e gira in loop. Meglio un montaggio
          verticale 9:16; un video orizzontale viene tagliato al centro. Carica un MP4 (max 3 MB)
          oppure incolla il link diretto di Bunny, per esempio
          https://vz-13c73ffe-e6a.b-cdn.net/&#123;guid&#125;/play_720p.mp4 (anche il link Embed
          viene convertito da solo). Da telefono si vede in 4:5. Senza video compare la copertina;
          senza nessuno dei due, il testo prende tutta la larghezza.
        </p>
        <div className="set-grid">
          <div>
            <label className="lbl">Video (.mp4)</label>
            <AboutVideoField value={v.video} password={password} onStatus={onStatus} onChange={(x) => set("video", x)} />
          </div>
          <div>
            <label className="lbl">Copertina · si vede finché il video carica</label>
            <ImageField value={v.poster || ""} password={password} aspect="9/16" allowUrl
              onChange={(x) => set("poster", x)} onStatus={onStatus} />
            <label className="lbl" style={{ marginTop:12 }}>Scritta sul video (una riga)</label>
            <input className="field" value={v.caption || ""} placeholder="Super 8 · Stromboli, 2025"
              onChange={(e) => set("caption", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="set-group">
        <h3>Testi</h3>
        <div className="set-grid">
          {text("title", "Titolo", true, "Vai a capo dove vuoi spezzare il titolo: la prima riga non va mai a capo da sola.", 60)}
          {text("lead", "Lead (testo grande)", true)}
          {text("body", "Testo", true, "Una riga vuota o un a capo separa i paragrafi.", 100)}
        </div>
      </div>

      <div className="set-group">
        <h3>Foto</h3>
        <p className="hint">Due foto 4:5 affiancate sotto i bottoni, con una didascalia corta. Si caricano così come sono (max 3 MB). Se ne togli una, l'altra prende tutta la larghezza.</p>
        <div className="set-grid">
          {photos.map((p, i) => (
            <div key={i}>
              <label className="lbl">Foto {i + 1}</label>
              <ImageField value={p.src} password={password} aspect="4/5"
                onChange={(x) => setPhoto(i, { src: x })} onStatus={onStatus} />
              <label className="lbl" style={{ marginTop:12 }}>Didascalia</label>
              <input className="field" value={p.caption || ""} onChange={(e) => setPhoto(i, { caption: e.target.value })} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Pannello "Impostazioni generali" ────────────────────────────────────────
function SettingsEditor({ settings, password, onChange, onStatus }){
  const s = settings || {};
  const patch = (k, v) => onChange({ ...s, [k]: v });
  const seo = s.seo || {};

  return (
    <div>
      <MarqueeEditor items={s.marquee} onChange={(v) => patch("marquee", v)} />

      {/* Bio SEO: il campo più importante di questa pagina, quindi sta in alto
          e ha una spiegazione lunga. Non è un testo di facciata, è ciò che
          Google e ChatGPT leggono per capire chi è Andrea. */}
      <div className="set-group" style={{borderColor:"var(--accent)"}}>
        <h3>Descrizione per SEO &amp; Motori AI</h3>
        <p className="hint">
          Questo testo <b>non compare sul sito</b>: nessun visitatore lo legge.
          Finisce nei dati strutturati della pagina e in un blocco nascosto che
          Google, Bing, ChatGPT, Claude e Perplexity leggono per capire chi sei,
          cosa fai e dove lavori.<br /><br />
          Scrivi <b>frasi brevi, complete e in terza persona</b> — “Andrea Onori è
          un fotografo…”, non “Sono un fotografo…”: i modelli citano frammenti
          isolati, e una frase che si regge da sola viene ripresa meglio.
          Vai a capo per separare i concetti: ogni riga diventa un paragrafo.
          Inserisci città, discipline, clienti e contatto.<br /><br />
          <b>Se lasci vuoto</b>, la descrizione viene generata automaticamente
          dai progetti presenti nel sito.
        </p>
        <textarea className="field" style={{minHeight:200}} value={seo.bio || ""}
          onChange={e => patch("seo", { ...seo, bio: e.target.value })}
          placeholder={"Andrea Onori è un fotografo e filmmaker con base a Milano.\nLavora tra moda, editoriale e campagne, producendo foto e video per brand e magazine.\n…"} />
        <p className="mono" style={{fontSize:10,color:"#555",marginTop:8}}>
          {(seo.bio || "").trim().split(/\s+/).filter(Boolean).length} parole ·{" "}
          {(seo.bio || "").split(/\r?\n/).filter(l => l.trim()).length} paragrafi
        </p>
      </div>

      <FeedReelEditor value={s.feedReel} password={password} onStatus={onStatus}
        onChange={(v) => patch("feedReel", v)} />

      {SETTINGS_SCHEMA.map(g => (
        <TextGroup key={g.key} group={g} values={s[g.key]} onChange={(v) => patch(g.key, v)} />
      ))}
    </div>
  );
}

// ── Editable card for object-based sections ──────────────────────────────────
function Card({ section, item, idx, total, password, onChange, onMove, onDelete, onStatus }){
  const set = (k, v) => onChange({ ...item, [k]: v });

  const fieldsFor = {
    feed:   [["title","Titolo · nome del video"],["year","Anno · per Google"],["loc","Luogo · per Google"],["film","Pellicola / Formato · per Google"]],
    series: [["label","Etichetta"],["id","ID (slug)"]],
    index:  [["num","N."],["title","Titolo"],["location","Luogo"],["year","Anno"]],
  }[section] || [];

  return (
    <div className="card fade" style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span className="mono" style={{fontSize:10,color:"var(--mute)"}}>#{String(idx+1).padStart(2,"0")}</span>
        <div style={{display:"flex",gap:4}}>
          <button className="btn btn-ghost" style={{padding:"5px 9px"}} onClick={()=>onMove(idx,idx-1)} disabled={idx===0} title="Su">↑</button>
          <button className="btn btn-ghost" style={{padding:"5px 9px"}} onClick={()=>onMove(idx,idx+1)} disabled={idx===total-1} title="Giù">↓</button>
          <button className="btn btn-ghost" style={{padding:"5px 9px",color:"var(--accent)",borderColor:"rgba(255,61,0,0.4)"}} onClick={()=>onDelete(idx)} title="Elimina">✕</button>
        </div>
      </div>
      {section === "feed" && (() => {
        const slides = (item.images && item.images.length) ? item.images : (item.url ? [item.url] : []);
        // Senza Copertina la cella usa la prima foto del carosello (o, in un
        // post di soli video, la prima copertina di video): e' quella che si
        // segna COVER. Con la Copertina il segno sparisce.
        const foto = slides.findIndex(s => { const m = normMedia(s); return m.image && !m.video; });
        const coverIdx = item.cover ? -1 : (foto >= 0 ? foto : slides.findIndex(s => normMedia(s).image));
        return (
          <>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{minWidth:0}}>
                <label className="lbl">Copertina · solo griglia</label>
                <CellAssetField kind="cover" item={item} password={password} onStatus={onStatus}
                  onPatch={(p)=>onChange({ ...item, ...p })} />
              </div>
              <div style={{minWidth:0}}>
                <label className="lbl">Logo · sopra la copertina</label>
                <CellAssetField kind="logo" item={item} password={password} onStatus={onStatus}
                  onPatch={(p)=>onChange({ ...item, ...p })} />
              </div>
            </div>
            <div>
              <label className="lbl">Carosello della scheda · foto e video · ⋯ per il link video</label>
              <GalleryField
                images={slides}
                password={password}
                coverIndex={coverIdx}
                onChange={(arr)=>onChange({ ...item, images: arr, url: firstPhoto(arr) })}
                onStatus={onStatus} />
            </div>
          </>
        );
      })()}
      {section === "series" && (
        <>
          <div>
            <label className="lbl">Copertina (cerchio)</label>
            <ImageField value={item.image} password={password} onChange={(v)=>set("image",v)} onStatus={onStatus} allowUrl />
          </div>
          <div>
            <label className="lbl">Slide della cartella · foto o video (⋯)</label>
            <GalleryField images={item.images || []} password={password} onChange={(arr)=>set("images",arr)} onStatus={onStatus} aspect="9/16" wide />
          </div>
        </>
      )}
      {section === "index" && (
        <ImageField value={item.image} password={password} onChange={(v)=>set("image",v)} onStatus={onStatus} allowUrl />
      )}
      {fieldsFor.map(([k,lbl]) => (
        <React.Fragment key={k}>
          <div>
            <label className="lbl">{lbl}</label>
            <input className="field" value={item[k] || ""} onChange={e=>set(k,e.target.value)} />
          </div>
          {/* I crediti stanno subito sotto il titolo, come nella scheda sul sito. */}
          {section === "feed" && k === "title" && (
            <CreditsEditor items={item.credits} onChange={(v)=>set("credits", v)} />
          )}
        </React.Fragment>
      ))}
      {/* Descrizione del progetto. Alimenta la pagina dedicata /work/<progetto>,
          che e' l'unico posto del sito con testo abbastanza lungo da poter
          essere citato per esteso da Google e dagli assistenti IA. Senza
          descrizione la pagina viene generata lo stesso, ma con le sole
          didascalie: molto meno utile. */}
      {section === "feed" && (
        <div>
          <label className="lbl">Descrizione del progetto · alimenta la pagina dedicata</label>
          <textarea
            className="field"
            style={{minHeight:110, resize:"vertical", lineHeight:1.5}}
            value={item.description || ""}
            onChange={e=>set("description", e.target.value || undefined)}
            placeholder={"Cosa era il progetto, per chi, dove e come e' stato realizzato.\n\nScrivi in terza persona e in frasi complete: 3-4 paragrafi bastano.\nVa a capo per separare i concetti — ogni riga diventa un paragrafo."}
          />
          <div className="mono" style={{fontSize:9,color:"var(--mute)",marginTop:4}}>
            {(() => {
              const t = String(item.description || "").trim();
              const w = t ? t.split(/\s+/).length : 0;
              return w === 0
                ? "nessuna descrizione — la pagina del progetto sara' molto scarna"
                : `${w} parole${w < 120 ? " · sotto le 120 un motore fatica a citarla" : ""}`;
            })()}
          </div>
        </div>
      )}
      {/* Dichiarazione di contenuto generato o ritoccato con AI. Sul sito
          diventa un marchio discreto sulla cella e una dicitura nella scheda
          del progetto. */}
      {(section === "feed" || section === "index") && (
        <label className={"check" + (item.ai ? " on" : "")}>
          <input type="checkbox" checked={!!item.ai}
            onChange={e => set("ai", e.target.checked ? true : undefined)} />
          <span>Contenuto Enhanced con AI</span>
        </label>
      )}
    </div>
  );
}

// ── Motion card: copertina + link al video su Bunny Stream ──────────────────
function MotionCard({ item, idx, total, password, onChange, onMove, onDelete, onStatus }){
  const m = normMedia(item);
  const logo = item && typeof item === "object" ? item.logo : undefined;
  // Il logo non fa parte della slide: si rimette accanto a ogni modifica, cosi'
  // cambiare titolo o video non lo cancella.
  const withLogo = (raw, lg) => {
    if (!lg) return raw;
    return typeof raw === "string" ? { image: raw, logo: lg } : { ...raw, logo: lg };
  };
  const patch = (p) => onChange(withLogo(toRaw({ ...m, ...p }), logo));
  const patchLogo = (p) => onChange(withLogo(toRaw(m), p.logo));
  return (
    <div className="card fade" style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span className="mono" style={{fontSize:10,color:"var(--mute)"}}>#{String(idx+1).padStart(2,"0")}</span>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {m.video && <span className="chip err" style={{borderColor:"var(--accent)"}}>▶ video</span>}
          <button className="btn btn-ghost" style={{padding:"5px 9px"}} onClick={()=>onMove(idx,idx-1)} disabled={idx===0}>↑</button>
          <button className="btn btn-ghost" style={{padding:"5px 9px"}} onClick={()=>onMove(idx,idx+1)} disabled={idx===total-1}>↓</button>
          <button className="btn btn-ghost" style={{padding:"5px 9px",color:"var(--accent)",borderColor:"rgba(255,61,0,0.4)"}} onClick={()=>onDelete(idx)}>✕</button>
        </div>
      </div>
      <div>
        <label className="lbl">Copertina 9:16 · trascina qui la foto</label>
        <ImageField value={m.image} password={password} aspect="9/16"
          onChange={(v)=>patch({ image:v })} onStatus={onStatus} allowUrl />
      </div>
      <div>
        <label className="lbl">Logo · sopra la copertina (opzionale)</label>
        <CellAssetField kind="logo" item={{ logo }} password={password} onStatus={onStatus}
          onPatch={patchLogo} />
      </div>
      <VideoLinkField value={m.video} poster={m.image} ratio={m.ratio} password={password}
        onChange={(v)=>patch({ video:v })}
        onPoster={(p)=>patch({ image:p })}
        onPatch={patch}
        onStatus={onStatus} />
      <div>
        <label className="lbl">Titolo (opzionale)</label>
        <input className="field" value={m.title} onChange={e=>patch({ title:e.target.value })} placeholder="es. SANTONI BACK TO OFFICE" />
      </div>
    </div>
  );
}

// ── Guida rapida: i video su Bunny Stream ───────────────────────────────────
function HelpBox(){
  return (
    <details className="help" style={{marginBottom:18}}>
      <summary>▶ Come si mette un video (Bunny Stream) — 4 passi</summary>
      <ol>
        <li>Carica il video su <b>Bunny Stream</b>, nella libreria <b>andreaonori</b>, e aspetta che finisca l'elaborazione.</li>
        <li>Su Bunny apri il video, scegli <b>Embed</b> e copia il link (<code>player.mediadelivery.net/embed/788231/…</code>). Va bene anche tutto il codice <code>&lt;iframe&gt;</code>.</li>
        <li>Qui nel pannello incollalo: in un post del Feed con <b>“+ Link video”</b>, in un reel nel campo <b>“Link video”</b>. Il pannello legge il video e compila da solo <b>proporzioni</b> e, se manca, la <b>copertina</b> (la miniatura di Bunny).</li>
        <li>Se vuoi una copertina tua trascina una foto nel riquadro. Poi <b>Salva tutto</b>.</li>
      </ol>
      <p className="mono" style={{fontSize:10,color:"#666",marginTop:12,lineHeight:1.7}}>
        I video non vengono mai copiati nel sito: restano su Bunny e il sito li carica al click, nel player di Bunny.
        Le <b>foto</b> invece si trascinano direttamente qui (max 3 MB l'una) e finiscono nella cartella <code>/media</code> del sito.
      </p>
    </details>
  );
}

// ── Main CMS ─────────────────────────────────────────────────────────────────
function CMS({ password }){
  const [media, setMedia] = useState(null);
  const [tab, setTab] = useState("feed");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const status = useCallback((msg, kind) => {
    setToast({ msg, kind: kind || "info" });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), kind === "err" ? 12000 : 3800);
  }, []);

  useEffect(() => {
    fetch("./media.json", { cache:"no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("media.json non trovato")))
      .then(d => { setMedia({ feed:[], motion:[], series:[], index:[], settings:{}, ...d }); })
      .catch(err => { status("Impossibile caricare media.json: " + err.message, "err"); setMedia({ feed:[], motion:[], series:[], index:[], settings:{} }); })
      .finally(() => setLoading(false));
  }, [status]);

  // Avviso prima di chiudere la pagina con modifiche non salvate.
  useEffect(() => {
    const onLeave = (e) => { if (dirty){ e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  // Vale sia per gli array delle sezioni sia per l'oggetto settings.
  const update = (key, next) => { setMedia(m => ({ ...m, [key]: next })); setDirty(true); };

  const onItemChange = (key, idx, nextItem) => update(key, media[key].map((it,i)=> i===idx ? nextItem : it));
  const onItemMove   = (key, from, to)     => update(key, move(media[key], from, to));
  const onItemDelete = (key, idx)          => update(key, media[key].filter((_,i)=> i!==idx));
  const onItemAdd    = (key)               => { update(key, media[key].concat([BLANKS[key]()])); status("Elemento aggiunto in fondo a " + key.toUpperCase(), "ok"); };

  const saveAll = async () => {
    setSaving(true);
    status("Salvo media.json su GitHub…", "info");
    try {
      await apiPost({ action:"save", password, media });
      setDirty(false);
      status("Salvato. Vercel pubblicherà tra pochi secondi.", "ok");
    } catch (err) {
      status("Salvataggio fallito: " + err.message, "err");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !media){
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div className="spin" style={{width:26,height:26,border:"2px solid #333",borderTopColor:"var(--accent)",borderRadius:"50%"}} />
      </div>
    );
  }

  const meta = SECTIONS.find(s => s.key === tab);
  const list = meta.single ? [] : (media[tab] || []);
  const nVideo = (arr) => (arr || []).reduce((n, it) => {
    if (tab === "motion") return n + (normMedia(it).video ? 1 : 0);
    const slides = (it && it.images) ? it.images : [];
    return n + slides.filter(s => normMedia(s).video).length + (it && it.video ? 1 : 0);
  }, 0);

  return (
    <div style={{minHeight:"100vh"}}>
      {/* Header */}
      <header style={{position:"sticky",top:0,zIndex:30,background:"rgba(0,0,0,0.92)",backdropFilter:"blur(10px)",borderBottom:"1px solid var(--line)"}}>
        <div style={{maxWidth:1160,margin:"0 auto",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}>
            <span className="display" style={{fontSize:18}}>AON</span>
            <span className="mono uline" style={{fontSize:9,color:"var(--mute)"}}>Admin · Edits</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {dirty && <span className="mono" style={{fontSize:10,color:"var(--accent)"}}>● modifiche non salvate</span>}
            <a href="/" className="btn btn-ghost">Sito</a>
            <button className="btn btn-accent" onClick={saveAll} disabled={saving || !dirty}>
              {saving ? "Salvo…" : "Salva tutto"}
            </button>
          </div>
        </div>
        {/* Tabs */}
        <div style={{maxWidth:1160,margin:"0 auto",padding:"0 24px",display:"flex",gap:24,overflowX:"auto"}}>
          {SECTIONS.map(s => (
            <button key={s.key} className={"tab" + (tab===s.key ? " active":"")} onClick={()=>setTab(s.key)}>
              {s.label}{!s.single && <span style={{color:"#555"}}> {(media[s.key]||[]).length}</span>}
            </button>
          ))}
        </div>
      </header>

      {/* Body */}
      <main style={{maxWidth:1160,margin:"0 auto",padding:"24px"}}>
        {!meta.single && <HelpBox />}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:16,marginBottom:18,flexWrap:"wrap"}}>
          <div>
            <h2 className="display" style={{fontSize:30,marginBottom:6}}>{meta.label}</h2>
            <p className="mono" style={{fontSize:11,color:"var(--mute)",maxWidth:600,lineHeight:1.6}}>{meta.help}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {!meta.single && nVideo(list) > 0 && <span className="chip err">▶ {nVideo(list)} video</span>}
            {!meta.single && <button className="btn" onClick={()=>onItemAdd(tab)}>+ Aggiungi</button>}
          </div>
        </div>

        {tab === "about" ? (
          <AboutEditor value={media.about} password={password} onStatus={status}
            onChange={(v)=>update("about", v)} />
        ) : meta.single ? (
          <SettingsEditor settings={media.settings} password={password} onStatus={status}
            onChange={(v)=>update("settings", v)} />
        ) : list.length === 0 ? (
          <div className="card" style={{padding:40,textAlign:"center"}}>
            <p className="mono" style={{fontSize:12,color:"var(--mute)"}}>Nessun elemento. Usa “+ Aggiungi” per iniziare.</p>
          </div>
        ) : (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14,alignItems:"start"}}>
            {tab === "motion"
              ? list.map((it,i)=>(
                  <MotionCard key={i} item={it} idx={i} total={list.length} password={password}
                    onChange={(v)=>onItemChange("motion",i,v)}
                    onMove={(f,t)=>onItemMove("motion",f,t)}
                    onDelete={(idx)=>onItemDelete("motion",idx)}
                    onStatus={status} />
                ))
              : list.map((it,i)=>(
                  <Card key={i} section={tab} item={it} idx={i} total={list.length} password={password}
                    onChange={(v)=>onItemChange(tab,i,v)}
                    onMove={(f,t)=>onItemMove(tab,f,t)}
                    onDelete={(idx)=>onItemDelete(tab,idx)}
                    onStatus={status} />
                ))}
          </div>
        )}

        <div style={{marginTop:28,paddingTop:18,borderTop:"1px solid var(--line)",display:"flex",justifyContent:"flex-end"}}>
          <button className="btn btn-accent" onClick={saveAll} disabled={saving || !dirty}>
            {saving ? "Salvo…" : "Salva tutto su GitHub"}
          </button>
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:50,
          background: toast.kind==="err" ? "#2a0a00" : (toast.kind==="ok" ? "#06200d" : "#111"),
          border:"1px solid " + (toast.kind==="err" ? "var(--accent)" : (toast.kind==="ok" ? "#1f7a3a" : "var(--line-strong)")),
          padding:"12px 18px",maxWidth:"min(90vw,620px)",display:"flex",gap:12,alignItems:"flex-start"}}>
          <span className="mono" style={{fontSize:11,lineHeight:1.6}}>{toast.msg}</span>
          <button className="btn btn-ghost btn-xs" onClick={()=>setToast(null)} style={{flexShrink:0}}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
function App(){
  const [password, setPassword] = useState(null);
  return password ? <CMS password={password} /> : <Login onAuth={setPassword} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
