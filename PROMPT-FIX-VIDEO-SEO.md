# PROMPT — Fix player video + pannello upload video + integrazione media POST/MOTION + SEO

> **Come usarlo:** incolla tutto questo prompt a un agente AI (es. Claude Code) che ha accesso diretto a questa cartella `AON/`. È pensato per essere operativo: contiene la diagnosi reale del codice, i path veri dei file e le modifiche puntuali da applicare. Lavora un TASK alla volta e alla fine verifica i criteri di accettazione.

---

## CONTESTO DEL PROGETTO

Portfolio di **Andrea Onori** (fotografo e filmmaker, Milano — dominio `andreaonori.com`, repo GitHub `Jnojokes/AON`, deploy su **Vercel**).

Stack e file chiave:

- **`index.html`** — sito single-page in **React 18 via CDN + Babel standalone** (nessuna build). Legge i contenuti da `media.json` a ogni caricamento con `fetch('./media.json', { cache: 'no-store' })`. Tre tab: `FEED`, `MOTION`, `INDEX` + sezione `SERIES` (storie a cerchi).
- **`media.json`** — unica fonte dati del sito. Sezioni: `feed` (array di oggetti immagine 4:5), `motion` (array di stringhe URL, celle 9:16), `series` (cartelle di foto sfogliabili), `index` (tabella numerata).
- **`admin-edits.html`** — CMS hard-coded (login `admin` / la password impostata in `ADMIN_PASSWORD` su Vercel), scrive su GitHub tramite `/api/save.js`. Pagina `noindex, nofollow`.
- **`api/save.js`** — funzione serverless Vercel. Due azioni: `upload` (committa una singola immagine in `/media` via GitHub Contents API) e `save` (committa `media.json`). Il token GitHub è **solo** nella env var `GITHUB_TOKEN`.
- **`vercel.json`** — `cleanUrls`, rewrite `/admin-edits`, cache `no-store` su `media.json`, header `X-Robots-Tag: noindex` su `/admin-edits`.
- **Cartelle nuove `POST/` e `MOTION/`** — contengono i media reali corretti (video + foto) da mettere online. **NON sono ancora usate dal sito.**

---

## DIAGNOSI — perché oggi non funziona (verificata sul codice)

1. **I player video non compaiono sul sito.**
   Il codice di `index.html` **già supporta i video**: c'è l'helper `isVideo()` (riga ~677, regex `\.(mp4|mov|webm|m4v)`), `MotionGrid` renderizza `<video>` se l'URL è un video (riga ~688) e `MotionViewer` riproduce a schermo intero (riga ~722). **Il problema è nei dati**: `media.json → motion[]` punta a **PNG** (`media/story-*.png`), non a video veri. Quindi nessun `<video>` viene mai renderizzato. Inoltre `FeedGrid` (riga ~645) renderizza **solo `<img>`**: non ha alcun supporto video.

2. **Il pannello di upload video non funziona.**
   In `admin-edits.html` gli input file hanno `accept="image/*"` (righe ~245 e ~305): **non si può nemmeno selezionare un video**. E anche potendo, l'upload passa da `fileToBase64` → `/api/save.js` → **GitHub Contents API**, che ha un limite di ~100 MB/file; per di più il body della funzione serverless Vercel è limitato a ~4.5 MB. Un video da decine/centinaia di MB **non può** passare da lì. L'unico campo che oggi accetta un video è il campo URL testuale di MOTION (riga ~382, "URL — immagine o video esterno .mp4/.webm").

3. **I video non possono stare nel repo.**
   `POST/` pesa ~1.1 GB e `MOTION/` ~393 MB. In particolare `POST/EST MUGSHOT/MUGSHOT_1.mp4` = **624 MB** (6× il limite GitHub). Vanno su **hosting video esterno**.

---

## VINCOLO CENTRALE + SOLUZIONE SCELTA: Bunny Stream

I video **non vanno committati su Git**. Si usa **Bunny Stream** (scelto dal cliente):

- Bunny **transcodifica in automatico** (risolve il master da 624 MB), genera thumbnail/poster e serve da CDN.
- Ogni video caricato ha un **GUID**; con l'opzione **"MP4 Fallback" attiva** nella library si ottengono URL diretti compatibili col tag `<video>` già presente nel sito:
  - Poster: `https://{pullZone}.b-cdn.net/{guid}/thumbnail.jpg`
  - MP4: `https://{pullZone}.b-cdn.net/{guid}/play_720p.mp4` (e `play_480p.mp4`, `play_1080p.mp4`)
  - HLS (adaptive, opzionale): `https://{pullZone}.b-cdn.net/{guid}/playlist.m3u8`
- `{pullZone}` è l'hostname della library Bunny (tipo `vz-xxxxxxxx-xxx`).

**Strategia:** usare gli URL **MP4** nel `<video src>` (funzionano su tutti i browser, così il codice attuale resta valido) e la `thumbnail.jpg` come `poster`. HLS + `hls.js` come upgrade opzionale nel viewer a schermo intero.

Env var da impostare su Vercel (per il TASK 4):

| Nome | Valore |
|------|--------|
| `BUNNY_STREAM_API_KEY` | AccessKey della video library (Bunny → Stream → Library → API) |
| `BUNNY_LIBRARY_ID` | ID numerico della library |
| `BUNNY_PULLZONE` | hostname pull zone, es. `vz-xxxxxxxx-xxx` |

---

## TASK 1 — Caricare i video su Bunny Stream

Obiettivo: portare i video di `POST/` e `MOTION/` su Bunny e ottenere per ciascuno `{guid}` + URL MP4 + poster.

1. Creare (se non esiste) una **Video Library** su Bunny Stream. Nelle impostazioni della library: **abilitare "MP4 Fallback"** e le risoluzioni 480p/720p/1080p; abilitare la generazione automatica di thumbnail.
2. Caricare i file. Fornisci uno **script Node riutilizzabile** `scripts/bunny-upload.mjs` che:
   - legge `BUNNY_STREAM_API_KEY` e `BUNNY_LIBRARY_ID` dall'ambiente;
   - per ogni file: `POST https://video.bunnycdn.com/library/{lib}/videos` con body `{ "title": "<nome progetto>" }` → ottiene `guid`; poi `PUT https://video.bunnycdn.com/library/{lib}/videos/{guid}` con il binario del file (header `AccessKey`);
   - per file grandi (es. Mugshot 624 MB) usa upload **TUS resumable** (`tus-js-client`) verso `https://video.bunnycdn.com/tusupload`;
   - stampa una tabella `file → guid → URL MP4 → poster`.
3. Salvare la mappatura `file → guid` in `scripts/bunny-map.json` così da rigenerare gli URL per `media.json`.

> Se l'agente non ha le credenziali Bunny, deve comunque **produrre lo script pronto all'uso** e lasciare in `media.json` dei placeholder chiari (`"BUNNY_URL_santoni_reel"`, ecc.) da sostituire, documentando la corrispondenza.

---

## TASK 2 — Aggiornare `media.json` (modello dati video + contenuti reali)

### 2a. Estendere il modello dati

- **`motion[]`**: oggi sono stringhe (URL). Mantieni la retrocompatibilità (stringa = solo media), ma consenti anche l'oggetto `{ "src": "...mp4", "poster": "...jpg", "title": "..." }`. Il player deve gestire entrambi.
- **`feed[]`**: aggiungi campi **opzionali** `"video"` (URL MP4 Bunny) e `"poster"` (URL thumbnail). Se `video` è presente, la cella FEED mostra il video (muted/loop) invece dell'immagine statica; `poster`/`url` resta la copertina.

### 2b. Popolare `motion[]` con i 7 reel verticali reali (sostituendo i PNG storyboard)

Usa i file di `MOTION/` (9:16). Esempio di forma finale (URL Bunny da TASK 1):

```json
"motion": [
  { "src": "https://{pz}.b-cdn.net/{guid_santoni}/play_720p.mp4",  "poster": "https://{pz}.b-cdn.net/{guid_santoni}/thumbnail.jpg",  "title": "SANTONI BTO" },
  { "src": "https://{pz}.b-cdn.net/{guid_ypsum}/play_720p.mp4",    "poster": "https://{pz}.b-cdn.net/{guid_ypsum}/thumbnail.jpg",    "title": "YPSUM" },
  { "src": "https://{pz}.b-cdn.net/{guid_fabiana}/play_720p.mp4",  "poster": "https://{pz}.b-cdn.net/{guid_fabiana}/thumbnail.jpg",  "title": "FABIANA FILIPPI" },
  { "src": "https://{pz}.b-cdn.net/{guid_okgiorgio}/play_720p.mp4","poster": "https://{pz}.b-cdn.net/{guid_okgiorgio}/thumbnail.jpg","title": "OK GIORGIO" },
  { "src": "https://{pz}.b-cdn.net/{guid_mandarina}/play_720p.mp4","poster": "https://{pz}.b-cdn.net/{guid_mandarina}/thumbnail.jpg","title": "MANDARINA DUCK" },
  { "src": "https://{pz}.b-cdn.net/{guid_mosaiq}/play_720p.mp4",   "poster": "https://{pz}.b-cdn.net/{guid_mosaiq}/thumbnail.jpg",   "title": "MOSAIQ GROUP" },
  { "src": "https://{pz}.b-cdn.net/{guid_prada}/play_720p.mp4",    "poster": "https://{pz}.b-cdn.net/{guid_prada}/thumbnail.jpg",    "title": "PRADA — WOMAN 26" }
]
```

### 2c. Arricchire `feed[]`, `series[]`, `index[]` con i video POST e i nuovi progetti

- Ai progetti esistenti (Santoni, Ypsum, Fabiana, Greta, Ok Giorgio, Mugshot) aggiungi `video`+`poster` dal film 16:9 di `POST/`.
- Aggiungi i **4 nuovi progetti**: **Prada**, **Mandarina Duck**, **Mosaiq Group**, **Audemars Piguet** (in `feed`, `index` e, dove ha senso, `series`).
- Le **foto** nelle sottocartelle di `POST/` (FABIANA FILIPPI, GRETA BOLDINI, OKGIORGIO, EST MUGSHOT, AUDEMARS PIGUET) vanno **ottimizzate** (max lato ~2000px, JPEG qualità ~80, < 400 KB) e **committate in `/media`** con nomi puliti (es. `greta-09.jpg`…), poi referenziate nelle `images[]` delle rispettive serie/feed.

### Mappatura completa dei media (fonte → destinazione)

**`MOTION/` → sezione `motion` del sito (reel verticali 9:16, su Bunny):**

| File locale | Progetto |
|---|---|
| `MOTION/Santoni BTO_Short 9_16.mp4` | Santoni BTO |
| `MOTION/Ypsum Video 9_16.mp4` | Ypsum |
| `MOTION/Fabiana Filippi DW Montaggio V3 9_16.mp4` | Fabiana Filippi |
| `MOTION/Ok Giorgio Teaser 9_16.mp4` | Ok Giorgio |
| `MOTION/Mandarina Duck SHORT VERSION Audio V2 9_16.mp4` | Mandarina Duck |
| `MOTION/Mosaiq Group SHORT VERSION 9_16.mp4` | Mosaiq Group |
| `MOTION/Teaser Woman 26 Prada.mp4` | Prada |

**`POST/` → film 16:9 (su Bunny) + foto (in `/media`):**

| File locale | Peso | Progetto | Uso |
|---|---|---|---|
| `POST/Santoni.mp4` | 52 MB | Santoni BTO | video feed/detail |
| `POST/YPSUM.mp4` | 48 MB | Ypsum | video feed/detail |
| `POST/Prada.mp4` | 41 MB | Prada *(nuovo)* | video feed/detail |
| `POST/MANDARINA DUCK.mp4` | 80 MB | Mandarina Duck *(nuovo)* | video feed/detail |
| `POST/Mosaiq Group.mp4` | 89 MB | Mosaiq Group *(nuovo)* | video feed/detail |
| `POST/FABIANA FILIPPI/FF_1.mp4` + `FF_2..4.jpg` | 46 MB + 3 foto | Fabiana Filippi | video + 3 stills |
| `POST/GRETA BOLDINI/GretaBoldini_1.mp4` + `_2..10` | 48 MB + 9 foto | Greta Boldini | video + stills |
| `POST/EST MUGSHOT/MUGSHOT_1.mp4` + `_2.png`, `_3.JPG` | **624 MB** + 2 foto | Mugshot | video (TUS + transcodifica) + 2 stills |
| `POST/OKGIORGIO/OkGiorgio_1.mp4` + `_2..4.jpg` | 20 MB + 3 foto | Ok Giorgio | video + 3 stills |
| `POST/AUDEMARS PIGUET/Audemar 1..4.mp4` | 7–13 MB ×4 | Audemars Piguet *(nuovo)* | 4 clip video |

---

## TASK 3 — Far funzionare i player nel sito (`index.html`)

1. **`MotionGrid`** (riga ~679): supporta già `<video>`. Miglioralo per performance (7 reel che partono insieme sono pesanti):
   - accetta sia stringa sia oggetto `{src, poster, title}`;
   - aggiungi `poster={poster}` e `preload="none"`;
   - avvia la riproduzione **solo quando la cella è visibile** (IntersectionObserver) e mettila in pausa quando esce; su mobile parti da poster + play on tap.
2. **`FeedGrid`** (riga ~645): aggiungi il supporto video. Se l'item ha `video`, renderizza `<video muted loop playsInline preload="none" poster={item.poster||item.url}>` che parte **all'hover** (desktop) o quando in-view (mobile) e torna al poster quando fermo; badge "▶" sulla cella. Fallback a `<img>` se non c'è `video`.
3. **`MotionViewer`** (riga ~707) e il viewer dei post: a schermo intero riproduci con `controls`. Opzionale: se usi l'URL HLS `.m3u8`, integra **`hls.js`** da CDN (`<video>` nativo regge HLS solo su Safari) con attach `if (Hls.isSupported()) { ... } else { video.src = mp4 }`.
4. Aggiungi `loading="lazy"` alle immagini della griglia e `decoding="async"` per alleggerire il primo caricamento.

---

## TASK 4 — Far funzionare il pannello upload video (`admin-edits.html` + nuovo endpoint)

**Non far più passare i video da GitHub.** Due livelli:

### 4a. Fix minimo (da spedire subito)

- Cambia il flusso video così che l'admin **incolli l'URL Bunny** invece di caricare il file nel repo. Per FEED aggiungi due campi: **"Video URL (Bunny)"** e **"Poster URL"**; per MOTION il campo URL esiste già (riga ~382) — chiarisci nell'help che accetta l'URL MP4 Bunny.
- Correggi comunque gli input: dove serve caricare video lascia perdere `accept="image/*"`; gli input immagine restano com'erano.

### 4b. Fix completo — upload diretto browser → Bunny (bypassa il limite serverless)

Crea `api/video-upload.js` (serverless Vercel) che:

1. verifica la `password` admin (come `save.js`);
2. crea l'oggetto video su Bunny: `POST https://video.bunnycdn.com/library/{BUNNY_LIBRARY_ID}/videos` con header `AccessKey: BUNNY_STREAM_API_KEY`, body `{ "title": <nome> }` → ottiene `guid`;
3. calcola la **signature TUS** lato server: `sha256(BUNNY_LIBRARY_ID + BUNNY_STREAM_API_KEY + expire + guid)` (l'API key **non** viene mai esposta al browser);
4. risponde `{ guid, signature, expire, libraryId: BUNNY_LIBRARY_ID, pullZone: BUNNY_PULLZONE }`.

In `admin-edits.html`, un nuovo `VideoField`:
- input `accept="video/*"`;
- chiama `/api/video-upload` per ottenere i parametri, poi carica il file **direttamente su Bunny** con **`tus-js-client`** verso `https://video.bunnycdn.com/tusupload` (header `AuthorizationSignature`, `AuthorizationExpire`, `LibraryId`, `VideoId`), mostrando una **barra di avanzamento** (fondamentale per file grandi);
- a fine upload costruisce l'URL riproducibile `https://{pullZone}.b-cdn.net/{guid}/play_720p.mp4` + poster `.../thumbnail.jpg` e li salva in `media.json` (ricorda: Bunny impiega qualche minuto a transcodificare prima che l'MP4 sia pronto — gestisci uno stato "in elaborazione").

> Questo è il flusso corretto per video pesanti (incluso il Mugshot da 624 MB): resumable, nessun limite di body serverless, token mai nel browser.

---

## TASK 5 — SEO / indicizzazione

**Già applicato in questa cartella** (non rifarlo, verifica soltanto):

- `index.html <head>`: `<title>` descrittivo ("Andrea Onori — Fashion Photographer & Filmmaker, Milan"), `meta description`, `keywords`, `author`, `robots (index,follow,max-image-preview:large)`, `canonical` `https://andreaonori.com/`, `theme-color`, **Open Graph** completo, **Twitter Card** `summary_large_image`, **JSON-LD** `Person`.
- **`robots.txt`** (allow all, disallow `/admin-edits` e `/api/`, link alla sitemap) e **`sitemap.xml`** creati in root.
- `lang="en"` lasciato invariato: **corretto**, perché il testo visibile del sito è in inglese.

**Da completare (residuo):**

1. **Immagine OG dedicata 1200×630** (oggi `og:image` punta a `andrea.jpg`, verticale). Crea `media/og-cover.jpg` (landscape, con nome + "Photographer & Filmmaker · Milan") e aggiorna `og:image`/`twitter:image` + `og:image:width`/`height`.
2. **Crawlability del contenuto (rischio SEO più serio):** il sito è renderizzato **client-side da Babel standalone** in `index.html`. I meta nell'`<head>` sono statici e vengono letti dai crawler, ma **i progetti nel body sono generati da JS** e Babel-in-browser è lento/fragile per l'indicizzazione e per i Core Web Vitals. Raccomandato: **pre-compilare il JSX in fase di build** (niente Babel standalone in produzione) e/o iniettare un **fallback statico** in HTML con la lista dei progetti (titoli, luoghi, anni da `media.json`) dentro un `<noscript>` o pre-render, così i contenuti sono indicizzabili anche senza JS.
3. **`alt` descrittivi** su tutte le immagini/video della griglia (usa `title`+`loc`+`year`, es. `alt="Santoni BTO — campaign, Milano 2025"`) al posto di `alt="Motion 1"`.
4. Dopo il deploy: **Google Search Console** → verifica proprietà, invia `sitemap.xml`, controlla l'indicizzazione e i Core Web Vitals.

---

## CRITERI DI ACCETTAZIONE (checklist finale)

- [ ] I **7 reel verticali** di `MOTION/` partono nella tab **MOTION** (muted/loop, poster prima del play) e si aprono a schermo intero con audio/controlli.
- [ ] Almeno i progetti con film 16:9 mostrano il **video nella FEED** (hover/in-view) con fallback immagine.
- [ ] Nessun file video è stato committato nel repo Git; i video sono su **Bunny Stream**; il **Mugshot 624 MB** è riproducibile e transcodificato.
- [ ] Dal pannello `/admin-edits` si riesce a **caricare un video** (o via URL Bunny, o via upload diretto TUS con barra di avanzamento) e appare sul sito dopo "Salva tutto".
- [ ] Le **foto** delle sottocartelle POST sono ottimizzate e in `/media`; i **4 nuovi progetti** (Prada, Mandarina Duck, Mosaiq Group, Audemars Piguet) sono in `media.json`.
- [ ] `view-source` della home mostra `<title>` corretto, OG, canonical e JSON-LD; `sitemap.xml` e `robots.txt` rispondono 200; `/admin-edits` resta `noindex`.
- [ ] Nessuna regressione: il sito continua a leggere `media.json` e il CMS continua a salvare via `/api/save.js`.

## VINCOLI — cosa NON fare

- Non committare `POST/`, `MOTION/`, `asset/` o qualsiasi video nel repo (restano solo in locale / su Bunny).
- Non mettere mai token o API key (`GITHUB_TOKEN`, `BUNNY_STREAM_API_KEY`) nel codice o nel browser: **solo env var su Vercel**.
- Non rompere il contratto dati di `media.json` (retrocompatibilità stringa/oggetto in `motion`).
- Mantenere `/admin-edits` `noindex, nofollow`.
