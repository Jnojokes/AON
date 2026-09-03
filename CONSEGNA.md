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

### 1.2 ✅ `ADMIN_PASSWORD` — rotazione già fatta

**Verificato il 3 settembre 2026:** la vecchia password `on2026`, leggibile nella
cronologia pubblica del repo, **non funziona più in produzione** (`/api/save`
risponde 401). La rotazione era già stata fatta. Punto chiuso.

L'attuale è una stringa casuale di 28 caratteri. Quando si cambia, ricordare che
va impostata su Vercel → Environment Variables e che serve un **redeploy**: le
env var vengono lette solo al deploy.

### 1.3 Completare l'indirizzo nella privacy policy

`privacy.html` riporta solo «Milano, Italia». L'art. 13 GDPR chiede l'indirizzo
del titolare. Serve via e CAP da inserire in `privacy.html` (§1) e in
`note-legali.html` (§1).

### 1.4 🔴 Search Console e Bing — il sito oggi è INVISIBILE

**Verificato il 3 settembre 2026.** Non è un'ipotesi: le ricerche danno zero.

| Query | Risultato |
|---|---|
| `site:andreaonori.com` | **nessuna pagina indicizzata** |
| `"Andrea Onori" fotografo filmmaker Milano` | escono un omonimo attore/regista (andreaonori**.it**, MYmovies, RBCasting, filmmakers.eu) e altri fotografi. Il sito non compare |
| `andreaonori.com portfolio fotografo` | il sito non compare |
| progetti (`Santoni BTO`, `Greta Boldini`) | il sito non compare |

Non è un problema tecnico: il sito risponde **200 a Googlebot e a Bingbot**, il
`robots.txt` li consente, non c'è alcun `noindex`, la sitemap è valida e il
dominio esiste dal **gennaio 2022**. Il controllo `npm run seo:check` passa con
0 problemi.

È un problema di **scoperta**: nessuno ha mai dichiarato il sito ai motori, e non
esiste un solo link esterno che ci porti. Senza un segnale, un crawler può
ignorare un dominio per mesi.

C'è anche un **omonimo ingombrante**: un altro Andrea Onori, attore e regista, ha
`andreaonori.it` e schede su MYmovies, RBCasting e filmmakers.eu. Sul nome
proprio si compete contro di lui, ed è il motivo per cui il `sameAs` con un solo
profilo Instagram (segnalato da `seo:check`) è una debolezza concreta e non
un dettaglio teorico.

**Cosa fare, in quest'ordine:**

1. **Google Search Console** — `search.google.com/search-console`
   - Aggiungi una proprietà di tipo **Dominio** (`andreaonori.com`): copre www,
     apex e tutti i sottodomini in un colpo solo.
   - Verifica con il record **TXT nel DNS** (dove è gestito il dominio). È
     preferibile al meta tag perché non dipende dal codice del sito.
   - In alternativa: scommenta la riga `google-site-verification` in
     `index.html` (~riga 25) e incolla il token.
   - Poi **Sitemap → invia** `https://www.andreaonori.com/sitemap.xml`.
   - E **Controllo URL** sulla home → *Richiedi indicizzazione*. È la scorciatoia
     che di solito porta la home nell'indice in pochi giorni invece che in
     settimane.

2. **Bing Webmaster Tools** — `bing.com/webmasters`
   - Si può **importare direttamente da Search Console** (un clic, nessuna
     verifica separata). Altrimenti c'è il meta `msvalidate.01`, già predisposto.
   - Bing conta doppio: alimenta anche **ChatGPT Search** e **Copilot**.

3. **Primi link in entrata.** Anche solo tre o quattro, ma reali: il profilo
   Instagram (link in bio), una scheda su Behance o Vimeo, il sito delle agenzie
   o dei brand con cui ha lavorato. Servono a due cose insieme — dare a Google un
   percorso per arrivare al sito, e popolare il `sameAs` che oggi ha un solo
   profilo.

> Ordine di grandezza: dopo l'invio della sitemap e la richiesta di
> indicizzazione, la home compare di solito in **3-10 giorni**. Le citazioni da
> parte degli assistenti IA arrivano più tardi, perché molti si appoggiano
> all'indice di Bing o a crawl periodici: da qualche settimana a un paio di mesi.

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
2. Aggiungere **una seconda sorgente**: *Google Search Console* → proprietà
   `andreaonori.com` (richiede il punto 1.4). GA4 dice cosa fanno le persone una
   volta arrivate; Search Console dice **come ci arrivano** e per quali ricerche.
   Per un portfolio che deve farsi trovare, la seconda metà è quella che conta.
3. Costruire le pagine:

   | Pagina | Sorgente | Metriche | Dimensioni |
   |---|---|---|---|
   | **Traffico** | GA4 | Utenti attivi, Sessioni, Durata media | Mese, Primo canale |
   | **Come ci trovano** | Search Console | Impressioni, Clic, CTR, Posizione media | Query, Pagina |
   | **Provenienza** | GA4 | Sessioni | Sorgente/mezzo, Canale |
   | **Progetti più visti** | GA4 | Conteggio eventi (`project_view`) | **Titolo progetto** ← serve il punto 2.1 |
   | **Contatti generati** | GA4 | Eventi chiave (`contact_click`) | **Metodo**, **Posizione** ← serve il punto 2.1 |
   | **Coinvolgimento** | GA4 | Conteggio eventi (`scroll_depth`) | **Percentuale scroll** |
   | **Pubblico** | GA4 | Utenti attivi | Paese, Città, Categoria dispositivo |
4. *Condividi* → **Pianifica consegna email** → frequenza **mensile**, giorno 1,
   destinatario Andrea.

**Le tre domande a cui il report deve rispondere**, per non essere solo grafici:
quante persone sono arrivate e da dove · quali progetti hanno guardato ·
quanti hanno scritto. Tutto il resto è contorno.

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

### 6.1 ✅ Babel e Tailwind tolti dal browser — fatto

Prima ogni visita scaricava ed eseguiva **3,1 MB di `@babel/standalone`** per
compilare la JSX nel browser, più il compilatore Tailwind (407 KB) e React da
unpkg: tutto bloccante in `<head>`. Se uno di quei CDN non rispondeva, il sito
era una pagina bianca.

Ora c'è una build vera (`scripts/build.mjs`, che è il `buildCommand` di Vercel):

| | prima | dopo |
|---|---|---|
| Sito | 3,65 MB | **251 KB** (−93%) |
| Pannello admin | 3,34 MB | **189 KB** (−94%) |
| `index.html` | 138 KB | 72 KB |
| Origini esterne | 4 CDN | **nessuna** |

- `src/app.jsx` e `src/admin.jsx` sono i sorgenti; esbuild produce
  `assets/app.js` e `assets/admin.js` con React incluso.
- Tailwind è compilato in `assets/tailwind.css` (9 KB) e la build **fallisce**
  se una classe usata nel sorgente non ha una regola generata.
- I riferimenti agli asset portano un `?v=<hash del contenuto>`, così la cache
  può essere `immutable` senza rischiare di servire codice vecchio dopo un deploy.
- Dalla CSP sono spariti `'unsafe-eval'`, `unpkg.com` e `cdn.tailwindcss.com`.

**Verificato**: confronto pixel prima/dopo su desktop, tablet e mobile alle
stesse condizioni — altezza pagina identica (3441 / 3020 / 2886 px), stesse
parole, stesso layout. Le uniche differenze residue sono l'orologio in pagina e
il fatto che la versione nuova, essendo più veloce, carica *più* immagini nello
stesso tempo. Test funzionale superato su sito e pannello: React monta, i modali
si aprono e si chiudono, il login e le cinque sezioni funzionano, zero errori JS
e zero violazioni CSP.

### 6.2 Pagine per progetto
Il sito ha **3 URL**. Non esiste alcun testo lungo che un motore generativo possa
citare: nessun case study, nessuna pagina progetto. Estendendo `prerender.mjs`
per generare `/work/<slug>` da `media.json` — con 150-250 parole di descrizione
per progetto, editabili dal pannello — si passa a ~15 URL e oltre 3.000 parole.
È l'intervento a maggior ritorno GEO del piano.

### 6.3 ✅ Immagini convertite in WebP — fatto

`media/` pesava **101,5 MB**: JPEG fino a 4 MB e 4032×3024 px, serviti a un sito
che li mostra a circa 700 px. Era il singolo costo più grosso per chi visita il
sito, più del JavaScript.

    101,49 MB  →  7,77 MB     −92%     (66 immagini)

`scripts/optimize-images.mjs` (`npm run images`) genera un `.webp` accanto a
ogni originale, a lato lungo 2000 px e qualità 82, e riscrive i percorsi in
`media.json`.

**Nessun originale è stato cancellato.** I file a piena risoluzione restano in
`media/` e nel repository come archivio: a cambiare è solo *cosa viene
pubblicato*. `.vercelignore` esclude dal deploy `media/*.jpg|jpeg|png`, con
un'eccezione per `og-cover.jpg` — diverse piattaforme social non renderizzano
il WebP nelle anteprime, quindi quella deve restare JPEG.

Verificato in browser: home 17/17 immagini caricate, pagina progetto 10/10,
tutti i riferimenti in HTML e sitemap risolvono su disco.

> Nota sul peso del *repository*: sostituire le immagini non lo riduce. Il pack
> di git è 93 MB e conserva i blob originali nella cronologia; chi clona li
> scarica comunque. Solo una riscrittura della cronologia lo cambierebbe, e non
> ne vale la pena. Il guadagno qui è per **chi visita il sito**, che è ciò che
> conta.

Resta da fare, se si vuole spingere oltre: `srcset` per servire misure diverse a
telefono e desktop, e la deduplica di tre coppie di PNG identici byte per byte.

### 6.4 Profili collegati
`sameAs` nel JSON-LD contiene **solo Instagram**. È il segnale di entità più
debole del sito: aggiungere Vimeo, Behance, LinkedIn o le pagine delle uscite su
Vogue/Numéro/Domus aiuterebbe i motori a collegare le menzioni sparse a una sola
persona — ed è esattamente ciò che rende citabile un claim.
