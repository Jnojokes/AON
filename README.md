# Andrea Onori — Portfolio + CMS

Sito portfolio (versione **bold / nera**) con un piccolo **CMS** integrato (`/admin-edits`) e salvataggio sicuro su GitHub tramite una funzione serverless su Vercel.

Tutto il contenuto del sito vive in un unico file dati, `media.json`, editabile dal pannello admin senza toccare il codice.

---

## Struttura

```
AON/
├── index.html          ← sito (versione bold nera, legge media.json)
├── admin-edits.html    ← CMS, login admin/on2026
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

`media.json` ha quattro sezioni: `feed`, `motion`, `series`, `index`. Modificandolo (a mano o dal CMS) cambia ciò che appare sul sito.

`/admin-edits` è un CMS hard-coded protetto da login (`admin` / `on2026`). Da qui puoi: riordinare i media (↑ / ↓), caricare nuove immagini in `/media`, rimuovere media (✕), modificare titoli/anni/location/format, e salvare tutto con **Salva tutto**. La pagina è `noindex, nofollow`.

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
| `ADMIN_PASSWORD` | una password tua | opzionale (default `on2026`) |

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

---

## Media

Le **51 immagini** (foto + storyboard) sono in `media/` con nomi puliti, e `media.json` punta a loro. La cartella `asset/` originale (~1.6 GB) **non va su GitHub**: tienila in locale come archivio.

I **video** (~1.5 GB, fino a 624 MB l'uno) **non possono stare nel repo**: GitHub ha un limite di 100 MB per file. Vanno su hosting esterno (Cloudinary, Mux, Bunny CDN, Vimeo) o ricompressi. La griglia **MOTION** mostra al momento immagini/storyboard, non video veri; per i video 9:16 serve una piccola modifica al codice (tag `<video>`).

Dettagli completi in `BRIEF.md`.

---

## Note tecniche

Sito single-page in React 18 (CDN) + Babel standalone, CSS inline, zero build. `api/save.js` è una funzione serverless ESM (Node ≥18). `package.json` ha `"type": "module"`.
