# SETUP SEO / GEO — cosa resta da fare insieme

Il codice è pronto. Mancano solo gli inserimenti che richiedono account o dati del cliente.
Questo file non viene pubblicato: `.vercelignore` esclude tutti i `.md`.

---

## ⚠️ 0. PRIMA DI TUTTO — sicurezza

Durante il lavoro è emerso che **la password del pannello admin era pubblica**.

`https://www.andreaonori.com/BRIEF.md` rispondeva 200 e conteneva utente e password in chiaro.
La stessa stringa era il valore di fallback dentro `api/save.js`, quindi se la env var
`ADMIN_PASSWORD` non fosse mai stata impostata su Vercel, chiunque avesse letto quel file
avrebbe potuto scrivere sul repository GitHub tramite `/api/save`.
Il repo `Jnojokes/AON` è **pubblico**, quindi la password era leggibile anche da lì.

**Già corretto nel codice:**

- `.vercelignore` esclude dal deploy `*.md`, `POST/`, `asset/`, `scripts/`
- rimosso il valore di fallback hardcoded da `api/save.js` — senza `ADMIN_PASSWORD` l'endpoint risponde 500
- rimossa la password hardcoded dal ramo offline di `admin-edits.html`
- ripulita da tutti i documenti

**Da fare tu, appena possibile:**

1. Vercel → progetto AON → **Settings → Environment Variables**
2. Imposta (o cambia) **`ADMIN_PASSWORD`** con una password nuova e robusta
3. **Redeploy** — senza questa variabile il CMS non salva più, per scelta
4. Verifica anche che `GITHUB_TOKEN` sia un token *fine-grained* limitato al solo repo `AON`

> La vecchia password resta nella cronologia git. Cambiarla è l'unica cosa che la neutralizza.

---

## 1. Google Analytics 4

**Cosa serve:** il Measurement ID, formato `G-XXXXXXXXXX`.

1. [analytics.google.com](https://analytics.google.com) → Amministrazione → **Crea proprietà**
2. Nome `Andrea Onori`, fuso `Europa/Roma`, valuta EUR
3. Flusso di dati → **Web** → URL `https://www.andreaonori.com` → nome `Sito`
4. Copia il **Measurement ID**

**Dove incollarlo:** `index.html`, nell'`<head>`, cerca

```js
window.AON_GA4_ID = '';
```

e diventa

```js
window.AON_GA4_ID = 'G-XXXXXXXXXX';
```

Finché la stringa è vuota gtag.js non viene nemmeno scaricato e **il banner cookie non compare**
— giustamente: nessuna misurazione, nessun cookie, nessun consenso da chiedere.

**Subito dopo, nel pannello GA4:**

- Amministrazione → **Eventi principali** → segna `contact_click` come Key Event.
  Su un portfolio è l'unico esito che conta davvero.
- Amministrazione → **Traffico interno** → aggiungi il tuo IP e quello di Andrea,
  altrimenti i numeri di un sito con 12 progetti sono dominati da chi lo gestisce.
- Conservazione dati → 14 mesi.

**Eventi già cablati nel codice:** `project_view`, `series_open`, `showreel_play`,
`motion_play`, `tab_switch`, `contact_click`, `banner_consent`.
Sono tutti bloccati finché l'utente non accetta.

> Nota: non generiamo pageview finte sui cambi di tab o sull'apertura dei progetti.
> Gonfierebbero sessioni e pagine/sessione rendendo i dati incomparabili con qualunque
> riferimento. Per sapere quale progetto viene aperto di più si usa un'esplorazione
> libera su `project_view` segmentata per `project_title`.

---

## 2. Google Search Console

**Metodo consigliato: proprietà di dominio via DNS.** Copre `www`, l'apex, http e https
in un'unica proprietà, e non dipende dal codice.

1. [search.google.com/search-console](https://search.google.com/search-console) → Aggiungi proprietà → **Dominio**
2. Inserisci `andreaonori.com`
3. Google fornisce un record **TXT** — va aggiunto nel pannello DNS del dominio
   (i nameserver sembrano essere su Aruba: l'SPF è `include:_spf.aruba.it`)
4. Attendi la propagazione e premi Verifica

**Piano B se il DNS non è accessibile:** in `index.html` c'è già il meta pronto, commentato:

```html
<!-- <meta name="google-site-verification" content="INCOLLA_QUI_IL_TOKEN_GOOGLE"> -->
```

Togli il commento e incolla il token. Copre però solo `https://www.andreaonori.com/`.

**Dopo la verifica:**

1. **Sitemap** → invia `sitemap.xml`
2. **Controllo URL** su `https://www.andreaonori.com/` → *Testa URL pubblicato* →
   **Visualizza pagina testata → HTML**

Quest'ultimo passaggio è la prova decisiva di tutto il lavoro: nell'HTML grezzo devono
comparire i nomi dei progetti. Se ci sono, il sito non è più vuoto per i crawler.

**Cosa guardare, e quando:** a 3 giorni, 2 settimane, 6 settimane →
Indicizzazione pagine (la home deve risultare "Indicizzata"), Dati strutturati
non analizzabili (deve essere vuoto), Prestazioni sulle query di brand.

---

## 3. Bing Webmaster Tools

**Strada rapida:** [bing.com/webmasters](https://www.bing.com/webmasters) →
**Importa da Google Search Console**. Un click, importa proprietà e sitemap.

**Piano B:** in `index.html` c'è il meta pronto, commentato:

```html
<!-- <meta name="msvalidate.01" content="INCOLLA_QUI_IL_TOKEN_BING"> -->
```

Bing qui conta più della sua quota di mercato: alimenta **Copilot**, DuckDuckGo e parte
del recupero di ChatGPT. Con il prerender attivo, Bing vedrà finalmente dei contenuti.

Usa **URL Inspection → Fetch as Bingbot**: è la cosa più vicina a "cosa vede davvero
un crawler AI", perché Bingbot non esegue JavaScript.

---

## 4. Dati che servono da Andrea

Questi migliorano concretamente i dati strutturati e il testo che i modelli citano.

| Cosa | Perché serve | Dove finisce |
|---|---|---|
| **Conferma su "Vogue Italia · Numéro · Domus"** | è già scritto sul sito e ora anche in `llms.txt` e nel testo About. Se non è verificabile va tolto: è esattamente la frase che un'AI ripeterà | `scripts/prerender.mjs` → `SITE.published` |
| **Anno di inizio attività** | oggi dedotto da "ESTABLISHED MMXVIII" → 2018 | `SITE.since` |
| **Altri profili** (Vimeo, Behance, LinkedIn, IMDb) | il `sameAs` è il segnale più forte per far capire ai motori che le menzioni sparse sono la stessa persona. Oggi c'è solo Instagram | `SITE.instagram` / `sameAs` |
| **Quali progetti sono clienti e quali lavori personali** | cambia come vanno descritti | testo About |
| **Indirizzo studio e P. IVA** | per l'informativa privacy (obbligatorio) e per valutare se `ProfessionalService` è legittimo | `privacy.html` §1 |
| **Immagine OG disegnata 1200×630** | ora è un crop di `santoni-01.jpg`: funziona ma è senza nome e senza logo | `media/og-cover.jpg` |

---

## 5. Privacy — da completare prima di attivare GA4

`privacy.html` è scritta e pubblicata su `/privacy`, ma ha tre campi `[…]` da riempire
con i dati del titolare del trattamento (indirizzo, P. IVA / CF).

**Senza quelli l'informativa non è conforme all'art. 13 GDPR.** L'ordine giusto è:
prima completare la privacy, poi inserire il Measurement ID. Non il contrario.

Se in futuro si vuole una CMP certificata con registro dei consensi opponibile al
Garante (Cookiebot o Iubenda, quest'ultima più diffusa in Italia): si elimina il blocco
`#aon-consent` in fondo a `index.html` e si lascia tutto il resto. L'unico contratto è
la chiamata `gtag('consent','update',…)`, che ogni CMP sa fare.

---

## 6. Verifica dopo il deploy

```bash
S=https://www.andreaonori.com

# Il contenuto esiste senza JavaScript — la verifica che conta
curl -s $S/ | grep -c "SANTONI BTO"                    # deve essere > 0

# Nessun cloaking: i tre hash devono essere identici
for ua in "Mozilla/5.0" \
          "GPTBot/1.2 (+https://openai.com/gptbot)" \
          "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"; do
  printf '%-60s %s\n' "$ua" "$(curl -s -A "$ua" $S/ | shasum | cut -c1-12)"
done

# La password non è più pubblica
curl -so /dev/null -w "BRIEF.md  → %{http_code} (atteso 404)\n" $S/BRIEF.md
curl -so /dev/null -w "POST/     → %{http_code} (atteso 404)\n" "$S/POST/GRETA%20BOLDINI/GretaBoldini_2.png"

# Il CMS è ancora vivo
curl -so /dev/null -w "api/save  → %{http_code} (atteso 401 o 500)\n" -X POST $S/api/save

# GEO
curl -s $S/llms.txt | head -20
curl -s $S/robots.txt | grep -c "User-agent"
```

**Baseline GEO da fare adesso, prima che l'effetto si veda:** chiedi a ChatGPT, Claude e
Perplexity *"Chi è Andrea Onori, fotografo a Milano?"* usando chat temporanee, e salva le
risposte. Serve il "prima" per poter dimostrare il "dopo".

---

## 7. Tempi realistici

| Cosa | Quando |
|---|---|
| Contenuto visibile a `curl` | subito al deploy |
| Bing ricrawl | ore / giorni |
| Google ricrawl e indicizzazione | giorni / ~3 settimane |
| Immagini in Google Images | 4–8 settimane |
| Citazioni nei motori generativi | settimane / mesi |

Sull'ultima riga serve onestà: il markup rende Andrea **citabile**, non **conosciuto**.
Che ChatGPT lo nomini per "fotografo di moda a Milano" dipende soprattutto da quante fonti
indipendenti lo citano — profilo Google Business, crediti sulle testate, interviste,
coerenza di nome e contatti ovunque. Quello è lavoro fuori dal sito, e pesa più di metà
di quanto fatto qui dentro.

---

## 8. Cosa NON è incluso — i due limiti successivi

Entrambi hanno impatto alto sui Core Web Vitals, entrambi sono progetti a sé.

**Tailwind CDN + Babel nel browser.** Il sito scarica `@babel/standalone` (~2.9 MB) e
compila l'intera app JSX a ogni caricamento, più Tailwind che genera il CSS a runtime.
Si risolvono precompilando in fase di build.

**Immagini non ottimizzate.** 101 MB in `/media`, servite grezze: `okgiorgio-01…05.jpg`
sono **3840×2160 da ~4 MB ciascuna**, mostrate in celle di griglia di poche centinaia di
pixel. Nessun WebP/AVIF, nessun `srcset`. Su mobile vale secondi di LCP.
L'ottimizzazione immagini di Vercel risulta disattivata (`/_vercel/image` risponde 404).

Dopo il prerender, questi diventano il collo di bottiglia principale.
