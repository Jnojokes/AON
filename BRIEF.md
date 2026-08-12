# ANDREA ONORI — BRIEF DI CONSEGNA

Versione **BOLD / NERA** + **CMS `/admin-edits`** + **salvataggio sicuro via GitHub**.
Tutto il contenuto del sito ora vive in un unico file dati (`media.json`) editabile dal pannello admin senza toccare il codice.

---

## 1. COSA È STATO FATTO

**`index.html` → ora è la versione BOLD nera.**
Lo splash con la scelta tra le due edition è stato rimosso. La root del dominio (`tuodominio.com/`) apre direttamente la versione nera. Il sito legge i contenuti da `media.json` a ogni caricamento (`fetch('./media.json', { cache: 'no-store' })`), quindi ogni modifica salvata dal CMS è subito live dopo il redeploy.

**Nuova pagina `/admin-edits`** — CMS hard-coded.
Login: **`admin` / la password impostata in `ADMIN_PASSWORD` su Vercel**. Da qui si può:
- riordinare i media (frecce ↑ / ↓)
- caricare nuove immagini (upload diretto nel repo `/media`)
- rimuovere media (✕)
- modificare titoli, anni, location, format
- salvare tutto con un solo bottone ("Salva tutto")

La pagina è `noindex, nofollow` (non finisce su Google).

**Salvataggio sicuro — la chiave GitHub NON è nel codice.**
Il CMS non parla direttamente con GitHub dal browser. Passa per una funzione serverless (`/api/save.js`) che gira su Vercel. La chiave (token GitHub) vive **solo** come Environment Variable su Vercel, mai nel repo, mai nel browser, mai in chiaro.

**I media reali sono stati posizionati.**
Le 51 immagini (foto + storyboard) sono già state spostate nella cartella `/media` con nomi puliti, e `media.json` punta a loro.

---

## 2. ⚠️ AZIONE OBBLIGATORIA: REVOCA LA CHIAVE CHE MI HAI MANDATO

La chiave GitHub che mi hai inviato in chat (`ghp_…`) **va considerata compromessa**: è transitata in un messaggio, quindi non è più sicura. Non l'ho scritta da nessuna parte nel codice apposta.

Devi fare così:

1. Vai su **GitHub → Settings → Developer settings → Personal access tokens**.
2. **Revoca / cancella** il token `ghp_…` che mi hai mandato.
3. **Genera un nuovo token** (consigliato: *fine-grained*), con permesso **Contents: Read and write** limitato al solo repository `AON`.
4. **Copia** il nuovo token (lo vedi una volta sola).
5. Incollalo **solo** come Environment Variable su Vercel (passo 3 qui sotto). Non incollarlo in nessun file.

---

## 3. SETUP SU VERCEL (una volta sola)

Nel progetto Vercel di `AON`, vai su **Settings → Environment Variables** e aggiungi:

| Nome | Valore | Obbligatorio |
|------|--------|--------------|
| `GITHUB_TOKEN` | il **nuovo** token generato al passo 2 | ✅ sì |
| `GITHUB_OWNER` | `Jnojokes` | opzionale (è già il default) |
| `GITHUB_REPO` | `AON` | opzionale (è già il default) |
| `GITHUB_BRANCH` | `main` | opzionale (è già il default) |
| `ADMIN_PASSWORD` | una password robusta a tua scelta | ✅ sì — non esiste più un default |

> `ADMIN_PASSWORD` è ora obbligatoria: senza, `/api/save` risponde 500 e il CMS non salva. Usa questa password per entrare in `/admin-edits`.

Dopo aver salvato le variabili, fai un **redeploy** perché vengano lette.

---

## 4. POSIZIONAMENTO DEI MEDIA NELLA CARTELLA AON

Questa è la parte che mi hai chiesto: **dove vanno i file dentro la cartella AON** (quella connessa a GitHub).

### Le immagini → già fatto ✅

Le 51 immagini sono già nella cartella `AON/media/` con nomi puliti. Non devi spostare nulla a mano. Questa è la mappatura usata (dal tuo `asset/` → `media/`):

```
asset/SANTONI BTO/Santoni_BTO_*.jpg        →  media/santoni-01.jpg … santoni-17.jpg
asset/GRETA BOLDINI/Greta_Boldini_*.jpg    →  media/greta-01.jpg … greta-08.jpg
asset/FABIANA FILIPPI/Fabiana*.jpg         →  media/fabiana-01.jpg … fabiana-03.jpg
asset/OK GIORGIO/OkGiorgio_*.jpg           →  media/okgiorgio-01.jpg … okgiorgio-07.jpg
asset/YPSUM/YPSUM_screen_*.jpg             →  media/ypsum-01.jpg … ypsum-05.jpg
asset/MUGSHOT/backstage mugshot_1.JPG      →  media/mugshot-backstage.jpg
asset/STORIE/*_STORY_*.png                 →  media/story-*.png
asset/*/*_CAROUSEL*.png                    →  media/*-carousel.png
```

> Importante: la cartella `asset/` originale (~1.6 GB) **non va caricata su GitHub**. Tienila in locale come archivio. Su GitHub deve salire solo `/media`.

### I video → NON possono andare su GitHub ❌

Qui c'è un limite tecnico reale di cui devi essere consapevole. I tuoi 21 video pesano **~1.5 GB in totale**, e GitHub ha un **limite rigido di 100 MB per singolo file**. In particolare:

- `EST_Mugshot_XSITO.mp4` = **624 MB** → da solo sfora 6 volte il limite.
- `Mosaiq_Group_XSITO.mp4` = 89 MB, `Mandarina Duck 16_9.mp4` = 80 MB, `Mandarina Duck SHORT 9_16.mp4` = 80 MB → vicini o oltre il limite.

**I video non possono stare nel repo.** Le opzioni sono:

1. **Hosting esterno (consigliato):** carica i video su un servizio video (Cloudinary, Mux, Bunny CDN, o anche Vimeo) e usa i link esterni. È la scelta giusta per le performance: i video si caricano più veloci e non appesantiscono il sito.
2. **Compressione:** se vuoi davvero portarli nel repo, vanno ricompressi sotto i 100 MB ciascuno (e idealmente molto meno). Per `EST_Mugshot` significherebbe ridurlo di ~85%, con perdita di qualità.

### Nota sulla sezione MOTION

Attualmente la griglia **MOTION** del sito mostra **immagini** (gli storyboard verticali story-*.png e i carousel), non video veri. Se vuoi che MOTION riproduca i tuoi video 9:16 reali, serve una piccola modifica al codice per inserire i tag `<video>` — fammi sapere e la faccio. Per ora MOTION è popolata con gli storyboard, che funzionano subito senza problemi di peso.

---

## 5. COME PUBBLICARE LE MODIFICHE

Flusso normale, dopo il setup:

1. Vai su `tuodominio.com/admin-edits`
2. Login `admin` + la password impostata in `ADMIN_PASSWORD` su Vercel
3. Riordina / carica / rimuovi / modifica i media
4. Premi **Salva tutto**
5. Il CMS scrive su `media.json` (e sulle immagini caricate) tramite GitHub → Vercel rifà il deploy in automatico in ~20 secondi → il sito è aggiornato.

Deploy iniziale, se serve da CLI:

```bash
npm i -g vercel
cd AON
vercel --prod
```

---

## 6. STRUTTURA FINALE DELLA CARTELLA AON

```
AON/
├── index.html          ← sito (versione bold nera, legge media.json)
├── admin-edits.html    ← CMS, login admin + ADMIN_PASSWORD
├── media.json          ← TUTTI i contenuti del sito (editabile dal CMS)
├── api/
│   └── save.js         ← funzione serverless: salva su GitHub (token via env var)
├── media/              ← le 51 immagini reali (foto + storyboard)
│   ├── santoni-01.jpg … santoni-17.jpg
│   ├── greta-01.jpg … greta-08.jpg
│   ├── fabiana-01.jpg … fabiana-03.jpg
│   ├── okgiorgio-01.jpg … okgiorgio-07.jpg
│   ├── ypsum-01.jpg … ypsum-05.jpg
│   ├── mugshot-backstage.jpg
│   ├── story-*.png  /  *-carousel.png
├── vercel.json         ← routing + cache headers
├── package.json
└── README.md

(asset/  → solo in locale, NON su GitHub)
(bold.html, archive.html → vecchie versioni, puoi cancellarle quando vuoi)
```

---

## 7. NOTA SUI FEEDBACK DI ANDREA

Mi avevi indicato 3 immagini con i feedback / le indicazioni di Andrea su come ha sistemato il sito. **Non le trovo nella cartella di lavoro** (la cartella upload è vuota e non sono in `asset/`).

Ho quindi impostato il sito con un'organizzazione editoriale sensata dei media reali (Santoni, Greta, Fabiana, Ok Giorgio, Ypsum, Mugshot). **Se mi rimandi le 3 immagini di feedback**, applico le sue indicazioni specifiche (ordine esatto, quali foto in evidenza, copy, ecc.) al `media.json` e ai dettagli grafici.
