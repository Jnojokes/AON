// =============================================================================
//  AON — invio del form di contatto (Vercel Serverless Function)
// -----------------------------------------------------------------------------
//  Perche' esiste: i pulsanti di contatto erano link mailto:. Non fanno nulla
//  per chi non ha un client di posta configurato — chi usa Gmail o Outlook dal
//  browser clicca e non succede niente, senza alcun messaggio. Su un sito il
//  cui unico obiettivo e' farsi contattare, era il difetto piu' costoso.
//
//  L'email parte dalla casella Aruba che il dominio ha gia': nessun fornitore
//  terzo, nessun dato che esce verso servizi esterni. E' la scelta coerente con
//  il resto dell'impostazione privacy del sito.
//
//  Variabili d'ambiente su Vercel (tutte obbligatorie tranne dove indicato):
//    SMTP_HOST   smtps.aruba.it        (default se non impostata)
//    SMTP_PORT   465                   (default se non impostata)
//    SMTP_USER   video@andreaonori.com  la casella che AUTENTICA e INVIA
//    SMTP_PASS   la password di quella casella
//    CONTACT_TO  destinatario          (default: SMTP_USER)
// =============================================================================
import nodemailer from "nodemailer";

const MAX = { name: 100, email: 254, message: 4000, subject: 200 };

// --- Limite di frequenza ------------------------------------------------------
//  Il contatore vive nella memoria dell'istanza serverless: copre le raffiche
//  da una singola istanza calda, che e' la forma di un invio automatizzato.
//  Non e' una difesa distribuita; se servisse, la sede giusta e' Vercel Firewall.
const RL_WINDOW_MS = 60 * 60 * 1000;   // 1 ora
const RL_MAX = 5;                       // invii per IP
const inviati = new Map();

function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

function rlCheck(ip) {
  const now = Date.now();
  if (inviati.size > 500) {
    for (const [k, v] of inviati) if (now - v.first > RL_WINDOW_MS) inviati.delete(k);
  }
  const rec = inviati.get(ip);
  if (!rec || now - rec.first > RL_WINDOW_MS) return { blocked: false };
  if (rec.count >= RL_MAX) {
    return { blocked: true, retryAfter: Math.ceil((RL_WINDOW_MS - (now - rec.first)) / 1000) };
  }
  return { blocked: false };
}

function rlBump(ip) {
  const now = Date.now();
  const rec = inviati.get(ip);
  if (!rec || now - rec.first > RL_WINDOW_MS) inviati.set(ip, { count: 1, first: now });
  else rec.count += 1;
}

// Un Origin estraneo significa che la richiesta parte dalla pagina di qualcun
// altro. Origin assente (curl, server-to-server) non viene bloccato: li' le
// altre difese restano attive.
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let host;
  try { host = new URL(origin).hostname; } catch { return false; }
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".vercel.app")) return true;
  const self = String(req.headers.host || "").split(":")[0];
  return Boolean(self) && (host === self || host.endsWith("." + self));
}

// Rimuove CR/LF da qualunque valore che finisca in un'intestazione del
// messaggio. Senza questo, un "Mario\nBcc: vittima@..." nel campo nome
// permetterebbe di iniettare intestazioni e usare il form come relay di spam.
const inline = (v, max) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);

const emailValida = (v) =>
  typeof v === "string" && v.length <= MAX.email && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = clientIp(req);

  if (!originAllowed(req)) {
    console.error(`[contact] origine rifiutata origin=${req.headers.origin} ip=${ip}`);
    return res.status(403).json({ error: "Origine non consentita" });
  }

  // Fail closed: senza credenziali l'endpoint non finge di funzionare.
  const cfg = {
    host: process.env.SMTP_HOST || "smtps.aruba.it",
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  };
  cfg.to = process.env.CONTACT_TO || cfg.user;
  if (!cfg.user || !cfg.pass) {
    console.error("[contact] mancano SMTP_USER / SMTP_PASS");
    return res.status(500).json({
      error: "Il modulo non e' ancora configurato sul server. Scrivi direttamente all'indirizzo email indicato qui sotto.",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Richiesta non valida" }); }
  }
  body = body || {};

  // --- Anti-spam senza CAPTCHA -----------------------------------------------
  // Un CAPTCHA sarebbe attrito per l'utente e un fornitore terzo in piu' da
  // dichiarare. Due controlli invisibili fermano la quasi totalita' dei bot:
  //
  // 1. Honeypot: un campo nascosto che una persona non vede e non compila.
  // 2. Trappola temporale: un modulo compilato in meno di 3 secondi non e'
  //    stato compilato da una persona.
  //
  // In entrambi i casi si risponde 200 come se fosse andato tutto bene: dire
  // "sei un bot" insegna solo a chi scrive i bot come aggirare il controllo.
  if (String(body.website || "").trim() !== "") {
    console.error(`[contact] honeypot ip=${ip}`);
    return res.status(200).json({ ok: true });
  }
  const eta = Number(body.elapsed);
  if (!Number.isFinite(eta) || eta < 3000) {
    console.error(`[contact] troppo veloce (${eta}ms) ip=${ip}`);
    return res.status(200).json({ ok: true });
  }

  const rl = rlCheck(ip);
  if (rl.blocked) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    return res.status(429).json({
      error: "Hai gia' inviato diversi messaggi. Riprova piu' tardi, oppure scrivi direttamente all'indirizzo email.",
    });
  }

  // --- Validazione -----------------------------------------------------------
  const nome = inline(body.name, MAX.name);
  const email = inline(body.email, MAX.email);
  const oggetto = inline(body.subject, MAX.subject) || "Richiesta dal sito";
  const messaggio = String(body.message ?? "").trim().slice(0, MAX.message);

  if (!nome) return res.status(400).json({ error: "Manca il nome." });
  if (!emailValida(email)) return res.status(400).json({ error: "L'indirizzo email non sembra valido." });
  if (messaggio.length < 10) return res.status(400).json({ error: "Scrivi un messaggio un po' piu' lungo." });
  if (body.privacy !== true) return res.status(400).json({ error: "Serve il consenso al trattamento dei dati." });

  try {
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.port === 465,     // 465 = SSL implicito, 587 = STARTTLS
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { minVersion: "TLSv1.2" },   // richiesto da Aruba
    });

    await transporter.sendMail({
      // Il mittente DEVE essere la casella autenticata: mettere l'indirizzo di
      // chi scrive farebbe fallire SPF e il messaggio finirebbe nello spam.
      // Il suo indirizzo va in replyTo, cosi' "Rispondi" scrive a lui.
      from: `"${nome} (dal sito)" <${cfg.user}>`,
      replyTo: `"${nome}" <${email}>`,
      to: cfg.to,
      subject: oggetto,
      text: [
        `Da:       ${nome} <${email}>`,
        `Oggetto:  ${oggetto}`,
        ``,
        messaggio,
        ``,
        `— inviato dal modulo di contatto di andreaonori.com`,
      ].join("\n"),
    });

    rlBump(ip);
    console.log(`[contact] inviato ip=${ip}`);
    return res.status(200).json({ ok: true });
  } catch (err) {
    // Il messaggio tecnico resta nei log, non va all'utente: non gli serve e
    // potrebbe rivelare dettagli dell'infrastruttura.
    console.error(`[contact] invio fallito ip=${ip}: ${String(err && err.message || err)}`);
    return res.status(502).json({
      error: "Non e' stato possibile inviare il messaggio. Riprova, oppure scrivi direttamente all'indirizzo email.",
    });
  }
}
