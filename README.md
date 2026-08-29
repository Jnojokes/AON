# Andrea Onori — Portfolio + CMS

Sito portfolio (versione **bold / nera**) con un piccolo **CMS** integrato (`/admin-edits`) e salvataggio sicuro su GitHub tramite una funzione serverless su Vercel.

Tutto il contenuto del sito vive in un unico file dati, `media.json`, editabile dal pannello admin senza toccare il codice.

---

## Struttura

```
AON/
├── index.html          ← sito (versione bold nera, legge media.json)
├── admin-edits.html    ← CMS, login admin + ADMIN_PASSWORD
├── media.json          ← TUTTI i contenuti del sito (editabile dal CMS)
├── api/
│   └── save.js         ← funzione serverless: salva su GitHub (token via env var)
├── media/              ← le 51 immagini reali (foto + storyboard)
├── vercel.json         ← routing + cache headers
├── package.json
└── README.md

(asset/  → solo in locale, NON su GitHub)
(bold.html, archive.html → vecchie versioni, eliminabili)
```

---

## Come funziona

`index.html` carica i contenuti da `media.json` ad ogni apertura:

```js
fetch('./media.json', { cache: 'no-store' })
```

`media.json` ha cinque sezioni: `feed`, `motion`, `series`, `index` e `settings`. Le prime quattro sono i media, `settings` sono **tutti i testi del sito**. Modificandolo (a mano o dal CMS) cambia ciò che appare sul sito.

`/admin-edits` è un CMS hard-coded protetto da login (`admin` / la password impostata in `ADMIN_PASSWORD` su Vercel). Da qui puoi: riordinare i media (↑ / ↓), caricare nuove immagini in `/media`, rimuovere media (✕), modificare titoli/anni/location/format, e salvare tutto con **Salva tutto**. La pagina è `noindex, nofollow`.

Il salvataggio NON usa la chiave GitHub dal browser. Passa per `/api/save.js` (serverless su Vercel) che legge il token **solo** dalla Environment Variable `GITHUB_TOKEN`. Il token non sta mai nel repo, nel browser, o in chiaro.

---

## Setup su Vercel (una volta sola)

In **Settings → Environment Variables** aggiungi:

| Nome | Valore | Obbligatorio |
|------|--------|--------------|
| `GITHUB_TOKEN` | un nuovo token (fine-grained, Contents: Read+Write su `AON`) | ✅ sì |
| `GITHUB_OWNER` | `Jnojokes` | opzionale (default) |
| `GITHUB_REPO` | `AON` | opzionale (default) |
| `GITHUB_BRANCH` | `main` | opzionale (default) |
| `ADMIN_PASSWORD` | una password robusta a tua scelta | ✅ sì — non esiste più un default |

Dopo aver salvato le variabili, fai un **redeploy** perché vengano lette.

> ⚠️ Il token GitHub inviato in chat va considerato compromesso: revocalo e generane uno nuovo. Vedi `BRIEF.md` sezione 2.

---

## Deploy

```bash
npm i -g vercel
cd AON
vercel --prod
```

Dopo il setup, il flusso normale è: `/admin-edits` → login → modifica → **Salva tutto** → il CMS scrive su `media.json` via GitHub → Vercel rifà il deploy in automatico (~20s).

### Puntare `andreaonori.com` su Vercel (da fare)

Oggi il dominio risolve su **62.149.128.40**, cioè lo spazio web condiviso Aruba: finché resta così `/api/save` non esiste e **il CMS non può salvare** (è una funzione serverless, gira solo su Vercel).

Cosa cambiare nel **Gestione DNS di Aruba** (non spostare i nameserver):

- record **A** di `@` → l'IP mostrato nella *domain card* del progetto Vercel (non riusare `76.76.21.21` preso dalle guide: i progetti nuovi ricevono un anycast IP diverso)
- record **CNAME** di `www` → il target indicato nella stessa domain card

⚠️ **Non** spostare i nameserver su Vercel e **non** toccare i record **MX**: le caselle email del dominio (webmail Aruba, `hello@andreaonori.com`) restano su Aruba e si romperebbero. Cambiando solo A e CNAME, mail e DNS restano dove sono.

Conseguenza sui video: una volta repuntato il dominio, lo **spazio web Aruba non è più raggiungibile da nessun hostname** (Aruba non consente di puntare un terzo livello a un hosting condiviso), quindi i video vanno su **Aruba Cloud Object Storage** — vedi `VIDEO-ARUBA.md`.

---

## Media

Le **51 immagini** (foto + storyboard) sono in `media/` con nomi puliti, e `media.json` punta a loro. La cartella `asset/` originale (~1.6 GB) **non va su GitHub**: tienila in locale come archivio.

I **video** non stanno nel repo (GitHub ha un limite di 100 MB per file): vivono su uno **storage esterno** — nel nostro caso lo spazio **Aruba** del cliente — e in `media.json` finisce solo il loro **URL**. Il sito mostra la copertina e scarica il video **solo al click**, quindi la griglia resta leggera.

Guida operativa per il cliente: **`VIDEO-ARUBA.md`**.

### Modello dati di un media

Ogni elemento di `feed[].images`, `motion[]` e `series[].images` può essere:

```jsonc
"media/foto.jpg"                    // immagine nel repo (forma usata per le sole foto)
"https://…/clip.mp4"                // video esterno senza copertina (retrocompatibile)
{ "video": "https://…/clip.mp4",    // video esterno + copertina + titolo
  "poster": "media/cover.jpg",
  "title": "SANTONI BTO" }
```

`src` è accettato come alias (`video` se ha estensione video, altrimenti `poster`). In più un item di `feed[]`/`index[]` può avere i campi opzionali `video` + `poster` a livello di post: diventano la prima slide del carosello.

Il CMS scrive sempre la forma **più semplice possibile**: una foto resta una stringa, così i contenuti già esistenti in `media.json` non cambiano forma.

### Comportamento nel sito

- **Griglia (FEED / MOTION):** solo la copertina, con badge ▶ sulle celle che contengono un video. Se una cella non ha copertina, il primo fotogramma viene caricato in lazy (IntersectionObserver) quando la cella si avvicina allo schermo. Nessun video parte da solo.
- **Viewer a schermo intero:** riproduzione con `controls`, autoplay e poster.
- **Carosello del post:** foto e video mescolati; i pallini dei video sono in accento e si alzano per non coprire i controlli.
- **Story viewer (SERIES):** su una slide video il timer automatico si ferma, la barra di avanzamento segue la riproduzione e si passa alla slide successiva a fine video; le aree di navigazione a tutto schermo lasciano il posto alle frecce ‹ › per non coprire i controlli.

### Cosa fa il pannello `/admin-edits`

- **Drag & drop** delle foto su ogni campo immagine e su ogni galleria (upload in `/media` via `api/save.js`, limite 3 MB per file: oltre, il body della funzione serverless Vercel non passa).
- **Campo link video** con **"Verifica link"**: carica i metadati e riporta durata/risoluzione, oppure l'errore esatto (file non pubblico, link non diretto, codec non supportato, `http://`).
- **"Copertina auto"**: estrae un fotogramma dal video via canvas e lo committa come poster. Richiede gli header CORS sullo storage; se mancano, il messaggio indirizza al drag & drop manuale.
- Trascinare un **video** viene intercettato con la spiegazione del flusso Aruba, invece di fallire con un errore tecnico.
- **Tab IMPOSTAZIONI** — tutti i testi del sito, senza toccare il codice (vedi sotto).
- Il login valida la password **contro il server** (`ADMIN_PASSWORD` su Vercel), non più contro una costante nel browser.

### Tab IMPOSTAZIONI — i testi del sito

Tutte le stringhe visibili stanno in `media.json → settings` e si modificano dalla quinta tab del pannello. Nel codice i valori di partenza sono in `TEXT_DEFAULTS` (`index.html`): un campo assente o non salvato usa il default, un campo **svuotato di proposito** toglie quel testo dal sito.

| Gruppo | Cosa contiene |
|--------|---------------|
| `marquee` | le voci del nastro che scorre in cima — coppie etichetta/valore, riordinabili. Lista vuota = barra nascosta |
| `profile` | intestazione: nome, riga sopra, handle, discipline, pulsanti, email di contatto |
| `topbar`, `hud` | la riga sotto il marquee e il riquadro con ora e coordinate |
| `sections` | nomi delle tab, intestazioni di colonna dell'indice, messaggio di sezione vuota |
| `post` | etichette della scheda progetto e diciture carosello / video / AI |
| `showreel`, `footer`, `consent` | showreel, piè di pagina, banner cookie |
| `seo` | autore negli `alt`, descrizione della foto profilo e la **descrizione per SEO & motori AI** |

> Aggiungere un nuovo testo modificabile richiede due modifiche coordinate: la voce in `TEXT_DEFAULTS` (`index.html`) e la sua etichetta in `SETTINGS_SCHEMA` (`admin-edits.html`).

**Descrizione per SEO & Motori AI** (`settings.seo.bio`) — la vecchia sezione ABOUT. **Non è più renderizzata a schermo**: `scripts/prerender.mjs` la scrive nel JSON-LD (`Person`, `WebPage`, `ProfessionalService`) e in un `<section class="visually-hidden">` fuori da `#root`, così React non la cancella al mount. Google, Bing e i crawler generativi la leggono, gli screen reader pure, i visitatori no. Ogni riga non vuota diventa un paragrafo; lasciando il campo vuoto il testo torna a essere generato dai progetti presenti nel sito.

**Contenuto Enhanced con AI** — spunta booleana (`ai: true`) sulle card di FEED e INDEX. Sul sito diventa un marchio `◇ AI` sulla cella e una dicitura `◇ AI-ENHANCED` nella scheda del progetto; nei dati strutturati diventa un `additionalProperty` con il codice IPTC `digitalSourceType`, e una colonna in `llms.txt`.

Dettagli di consegna in `BRIEF.md`.

---

## Note tecniche

Sito single-page in React 18 (CDN) + Babel standalone, CSS inline, zero build. `api/save.js` è una funzione serverless ESM (Node ≥18). `package.json` ha `"type": "module"`.
