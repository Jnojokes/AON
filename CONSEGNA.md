# Consegna — andreaonori.com

Stato al 2 settembre 2026. I file `.md` sono esclusi dal deploy (`.vercelignore`),
quindi questo documento non è pubblico.

---

## 1. Da fare a mano, prima della consegna

Sono cose che non si possono fare dal codice. Le prime due sono **bloccanti**.

### 1.1 🔴 Rendere privato il repository GitHub

`github.com/Jnojokes/AON` è **pubblico**. Contiene:

- `POST/` — 17 file, 28 MB di originali ad alta risoluzione di Fabiana Filippi,
  Greta Boldini, Mugshot, OkGiorgio. Scaricabili da chiunque.
- La vecchia password admin `on2026` nella cronologia dei commit
  (`git log --all -S"on2026"` → `f167aed`, `9ab6d2b`, `45e876e`).

`.vercelignore` e `robots.txt` li escludono dal *sito*, ma non da GitHub.

**Cosa fare:** GitHub → Settings → Danger Zone → *Change visibility* → **Private**.
Risolve entrambe le esposizioni senza riscrivere la cronologia. Il CMS continua a
funzionare identico: il token ha `Contents: Read+Write`, che opera su repo privati.

`POST/` è già stato tolto dal tracking git e aggiunto a `.gitignore` (i file
restano sul disco). Resta nella cronologia finché il repo non diventa privato.

### 1.2 🔴 Ruotare `ADMIN_PASSWORD` su Vercel

La produzione risponde 401 a una password sbagliata, quindi *una* password è
impostata — ma questo non prova che sia diversa da `on2026`, che è leggibile
nella cronologia pubblica.

**Cosa fare:** Vercel → Settings → Environment Variables → nuova `ADMIN_PASSWORD`
→ **Redeploy** (le env var si leggono solo al deploy).

### 1.3 Completare l'indirizzo nella privacy policy

`privacy.html` riporta solo «Milano, Italia». L'art. 13 GDPR chiede l'indirizzo
del titolare. Serve via e CAP da inserire in `privacy.html` (§1) e in
`note-legali.html` (§1).

### 1.4 Verificare la proprietà del sito

`index.html` ha i tag di verifica ancora commentati (righe ~24-25).

- **Google Search Console** → aggiungere `www.andreaonori.com`, verificare via DNS
  o scommentando il meta, poi inviare `https://www.andreaonori.com/sitemap.xml`.
- **Bing Webmaster Tools** → stessa cosa.

Senza questo non si sa se Google indicizza il sito né quali query lo intercettano.

---

## 2. Google Analytics — cosa manca davvero

Property **`549740168`** (account *Andrea Onori*, `406741098`), ID `G-EG1T5HLFSX`.
Il tag è installato e i dati arrivano.

Il problema **non è il codice**: gli eventi ci sono e sono ben fatti. È che nella
console GA4 sono quasi tutti invisibili.

### 2.1 Registrare le dimensioni personalizzate — il passo indispensabile

In GA4, **un parametro evento non registrato non compare in nessun report**.
Oggi `project_title` viene raccolto ma non è interrogabile: un report «progetti
più visti» è letteralmente impossibile da costruire.

Admin → *Definizioni personalizzate* → *Crea dimensione personalizzata*, ambito
**Evento**, per ognuna:

| Nome da mostrare | Parametro evento |
|---|---|
| Titolo progetto | `project_title` |
| Luogo progetto | `project_location` |
| Anno progetto | `project_year` |
| Formato progetto | `project_format` |
| Sezione di partenza | `source_tab` |
| Metodo di contatto | `method` |
| Posizione nel sito | `location` |
| Etichetta reel | `reel_label` |
| Etichetta serie | `series_label` |
| Nome sezione | `tab_name` |
| Dominio esterno | `link_domain` |
| Percentuale scroll | `percent_scrolled` |

I dati si popolano **dal momento della registrazione in avanti**: non è
retroattivo. È il motivo per cui conviene farlo subito.

### 2.2 Marcare `contact_click` come evento chiave

Admin → *Eventi chiave* → contrassegna **`contact_click`**. È l'unica conversione
reale del sito: qualcuno che scrive ad Andrea. Senza questo, nessun report può
dire quanti contatti ha generato il sito.

### 2.3 Impostare la conservazione dei dati a 14 mesi

Admin → *Impostazioni dei dati* → *Conservazione dei dati* → **14 mesi**.
La privacy policy dichiara 14 mesi: se in console ne sono impostati 2 (il
default), l'informativa afferma il falso.

### 2.4 Eliminare la property di test

Nello stesso account c'è una property **`552553524` («dddd»)**, apparentemente di
prova. Va rimossa, così il cliente trova un account pulito.

### 2.5 Eventi già raccolti

| Evento | Quando parte | Parametri |
|---|---|---|
| `contact_click` | click su email o «Inquire» | `method`, `location`, `project_title` |
| `project_view` | apertura scheda progetto | `project_title`, `project_location`, `project_year`, `project_format`, `source_tab` |
| `motion_play` | apertura di un reel | `reel_label`, `reel_index` |
| `series_open` | apertura di una serie | `series_label` |
| `showreel_play` | avvio showreel | `source` |
| `tab_switch` | cambio sezione | `tab_name` |
| `scroll_depth` | 25 / 50 / 75 / 100 % | `percent_scrolled` |
| `outbound_click` | click su Instagram | `link_domain`, `location` |
| `banner_consent` | **solo** se si accetta | `choice` |

Correzioni fatte in questa sessione:

- `tab_switch` non parte più al caricamento della pagina. Prima sparava un evento
  fantasma per sessione, falsando il confronto fra le tre sezioni.
- Il click su Instagram è ora `outbound_click`, non più `contact_click`: si
  sovrapponeva al tracciamento automatico dei link esterni e contava doppio.
- `banner_consent` non parte più su rifiuto: era un hit a Google inviato
  esattamente a chi aveva appena detto di no.
- Aggiunto `scroll_depth`: in un sito monopagina è l'unico modo per distinguere
  un rimbalzo da una visita che ha davvero guardato il portfolio.

---

## 3. Report mensile automatico via email

**Raccomandato: Looker Studio + consegna programmata.** Gratuito, nessun codice,
nessuna manutenzione, e Andrea riceve un PDF senza mai entrare in GA4.

1. `lookerstudio.google.com` → *Crea* → *Report* → sorgente **Google Analytics** →
   property `549740168`.
2. Costruire le pagine:
   - **Traffico** — utenti, sessioni, andamento mese su mese
   - **Provenienza** — canali e sorgenti, quanto pesa davvero Instagram
   - **Progetti** — `project_view` per *Titolo progetto* ← richiede il punto 2.1
   - **Contatti** — `contact_click` per *Metodo* e *Posizione*
   - **Pubblico** — paese, città, dispositivo
3. *Condividi* → **Pianifica consegna email** → frequenza **mensile**, giorno 1,
   destinatario Andrea.

> Le dimensioni personalizzate del punto 2.1 sono il prerequisito: senza,
> il report mostra numeri anonimi invece dei nomi dei progetti.

**Alternativa rapida:** in GA4, qualsiasi report → *Condividi* → *Pianifica email*.
Più veloce da impostare, ma il layout è rigido e poco leggibile per un non
addetto ai lavori. Va bene come rete di sicurezza, non come deliverable.

**Alternativa su misura:** un endpoint `api/report-mensile.js` schedulato con
Vercel Cron che interroga la Data API e invia un'email HTML in italiano. Massimo
controllo, ma introduce un service account, una API key email e codice da
mantenere. Da valutare solo se il report brandizzato fa parte dell'offerta.

---

## 4. Cosa è stato fatto in questa sessione

### Sicurezza
- `api/save.js`: rate limit per IP (10 tentativi / 15 min), confronto password a
  tempo costante, log dei tentativi falliti, controllo dell'`Origin`.
  Prima `/api/save` era un oracolo di brute-force gratuito verso il repo.
- Il pannello spiega il blocco invece di dire «non riesco a contattare il server».
- CSP, HSTS, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy` in `vercel.json`.
- `POST/` tolto dal tracking git; `.env*` aggiunto a `.gitignore`.

### Privacy
- **Blocco preventivo**: `gtag.js` non viene più caricato prima del consenso.
  Verificato in browser: zero richieste a Google prima della scelta.
- **Font self-hosted** (`/fonts`): Google Fonts spariti da tutte le pagine,
  inclusa la privacy policy, che chiamava Google prima ancora di essere letta.
- Banner: categorie granulari («Preferenze»), *Accetta* e *Rifiuta* con la stessa
  prominenza, `Escape` = rifiuto, `aria-modal` e gestione del focus.
- Consenso registrato con data e versione, scadenza a 6 mesi, migrazione dal
  vecchio formato. Prima era una stringa nuda valida per sempre.
- I segnali pubblicitari restano `denied` anche su accettazione: non esiste
  alcun servizio di advertising e l'informativa non li dichiarava.
- `privacy.html`: dichiarati l'ID di misurazione e i sette eventi raccolti,
  corretto il pulsante di revoca, aggiornata la data.
- Nuova pagina **`/note-legali`**: identificazione, diritti sulle immagini,
  diritto all'immagine, marchi, riserva TDM, procedura di rimozione, e la
  dichiarazione esplicita che **nessun contenuto del sito è generato da IA**.
- P. IVA nel footer di ogni pagina (art. 7 D.Lgs. 70/2003).
- `robots.txt`: crawler di **addestramento** esclusi (19 user-agent), crawler di
  **ricerca e citazione** mantenuti. Il sito resta citabile da ChatGPT e
  Perplexity, le immagini dei clienti non finiscono nei dataset.

### SEO / GEO
- **Rimosso il rischio di testo nascosto**: la bio era servita ai crawler in un
  blocco da 1×1 px che nessun visitatore vedeva mai. Ora è una sezione **About
  visibile**, alimentata dallo stesso campo del pannello.
- Testo visibile passato da ~0 a **438 parole** per chi ha JavaScript attivo.
- `copyrightHolder` rimosso dal JSON-LD: resta `creator`. Dichiarare la
  titolarità dei diritti economici su lavoro commissionato era un'affermazione
  che il sito non può sostenere.
- `license` ora punta a `/note-legali`, che contiene termini reali, invece che
  alla homepage.
- Alt dei reel: da «Motion frame 03» a titoli ricavati dal contenuto.
- Titoli delle immagini in sitemap: **da 19 generici su 49 a zero**.
- Favicon, apple-touch-icon e manifest reali al posto del quadrato nero.
- Claim stampa (Vogue Italia · Numéro · Domus), confermato dal cliente,
  reso coerente: ora la fonte unica è `settings.seo.bio` dal pannello.
  Era rimasto solo nell'HTML committato e sarebbe sparito al deploy successivo.

### Guida
- `Guida-Pannello-Admin-AON.pdf` — 16 pagine, italiano, 16 screenshot reali.

---

## 5. Rigenerare la guida

```bash
npm run serve:demo      # server locale con dati finti, in un terminale
npm run guide:shots     # cattura gli screenshot
npm run guide:pdf       # produce il PDF
```

Gli screenshot sono presi in locale, con dati inventati e password `demo1234`:
nessuna credenziale reale, nessun lavoro di clienti, nessun contatto con GitHub.
`scripts/guide/shots/` e il PDF non sono versionati: si rigenerano.

Per modificare i testi della guida: `scripts/guide/guide.html`, poi `guide:pdf`.

---

## 6. Cosa resta dal piano

In ordine di ritorno.

### 6.1 Eliminare Babel e Tailwind dal browser
Oggi ogni visita scarica ed esegue **3,1 MB di `@babel/standalone`** per
compilare la JSX nel browser, più Tailwind Play CDN e React da unpkg — tutto
bloccante in `<head>`. È la causa principale di LCP e INP scadenti, e il motivo
per cui `unpkg.com` e `cdn.tailwindcss.com` sono ancora nel grafo delle
richieste. Se unpkg è irraggiungibile, il sito è una pagina bianca.

Serve un build step reale (esbuild o Vite, ~30 righe): JSX precompilata,
Tailwind compilato, React nel bundle. `vercel.json` esegue già un `buildCommand`:
basta incatenarlo prima di `prerender.mjs`. A quel punto si può togliere
`'unsafe-eval'` dalla CSP.

### 6.2 Pagine per progetto
Il sito ha **3 URL**. Non esiste alcun testo lungo che un motore generativo possa
citare: nessun case study, nessuna pagina progetto. Estendendo `prerender.mjs`
per generare `/work/<slug>` da `media.json` — con 150-250 parole di descrizione
per progetto, editabili dal pannello — si passa a ~15 URL e oltre 3.000 parole.
È l'intervento a maggior ritorno GEO del piano.

### 6.3 Immagini
`media/` pesa **97 MB**: nessun WebP/AVIF, JPEG fino a 3840×2160 e 4,5 MB,
nessun `srcset`. Ci sono anche tre coppie di PNG identici byte per byte
(~5,5 MB sprecati).

### 6.4 Profili collegati
`sameAs` nel JSON-LD contiene **solo Instagram**. È il segnale di entità più
debole del sito: aggiungere Vimeo, Behance, LinkedIn o le pagine delle uscite su
Vogue/Numéro/Domus aiuterebbe i motori a collegare le menzioni sparse a una sola
persona — ed è esattamente ciò che rende citabile un claim.
