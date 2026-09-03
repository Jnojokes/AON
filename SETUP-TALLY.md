# Impostare il modulo di contatto (Tally) — da zero

Procedura completa: creazione dell'account, del modulo, e collegamento al sito.
Tempo richiesto: **circa 15 minuti**, una volta sola.

Il codice del sito è già pronto: serve solo l'**ID del modulo** da incollare nel
pannello admin. Nessun deploy, nessuna modifica al codice.

---

## 0. Prima decisione: chi possiede l'account

Va deciso adesso, perché cambiarlo dopo significa rifare il modulo.

| Opzione | Conseguenza |
|---|---|
| **Account intestato ad Andrea** (`video@andreaonori.com`) | È lui il titolare dei dati raccolti, coerente con l'informativa privacy che lo indica come Titolare del trattamento. Vede le richieste nel suo cruscotto e non dipende da nessuno. **Raccomandato.** |
| Account intestato all'agenzia | Più comodo nell'immediato, ma i dati personali dei clienti di Andrea stanno in un account di terzi. Va formalizzato come rapporto di responsabile del trattamento, e alla fine del rapporto il modulo va migrato. |

> **Stato al 3 settembre 2026:** l'account è stato creato dall'agenzia
> (workspace «Niccolò»). Due conseguenze da non perdere di vista:
>
> 1. Il punto 4 — inoltro delle notifiche a `video@andreaonori.com` — diventa
>    **obbligatorio**, non opzionale: il destinatario predefinito è l'email
>    dell'account, quindi senza modificarlo Andrea non riceve nulla.
> 2. Va concordato il **passaggio di proprietà** alla consegna, oppure Andrea va
>    invitato come membro del workspace. Finché l'account è dell'agenzia, i dati
>    personali di chi scrive ad Andrea stanno in un account di terzi, mentre
>    l'informativa indica Andrea come Titolare del trattamento.

---

## 1. Creare l'account

1. Vai su **`tally.so`** → **Sign up**
2. Registrati con **`video@andreaonori.com`** (o con Google, se la casella è
   collegata a un account Google)
3. Non serve carta di credito. Il piano gratuito include **moduli e risposte
   illimitati**, che per un portfolio è largamente sufficiente.

---

## 2. Creare il modulo

**New form** → **Start from scratch**.

Nomina il modulo, in alto: `Contatti — andreaonori.com`. Il nome è interno, non
lo vede chi scrive: serve a ritrovarlo e compare nell'oggetto delle notifiche.

### I tre campi visibili

Nell'editor si scrive premendo `/` per scegliere il tipo di campo.

| # | Domanda | Tipo di campo | Obbligatorio |
|---|---|---|---|
| 1 | `Nome` | Short answer | ✅ sì |
| 2 | `Email` | **Email** (non Short answer) | ✅ sì |
| 3 | `Messaggio` | Long answer | ✅ sì |

Il tipo **Email** non è un dettaglio: valida l'indirizzo mentre viene scritto, e
un indirizzo storto significa una richiesta a cui non si può rispondere.

Per rendere un campo obbligatorio: clicca il campo → nel pannello a destra
attiva **Required**.

### Il campo nascosto

Questo è il passaggio che si dimentica, ed è quello che fa arrivare ad Andrea
l'informazione più utile: **da quale progetto** arriva la richiesta.

1. Nell'editor, in una riga vuota, scrivi **`/hidden`**
2. Scegli **Hidden field**
3. Chiamalo esattamente **`progetto`** — tutto minuscolo

> ⚠️ I campi nascosti di Tally sono **sensibili alle maiuscole**. Se lo chiami
> `Progetto` o `project` il valore non arriva, e il campo resta vuoto senza
> alcun errore. Deve essere `progetto`.

Quando un visitatore apre il modulo dalla scheda di un progetto (pulsante
`INQUIRE`), il sito passa il titolo in quel campo. Aprendolo dal pulsante
principale (`GET IN TOUCH`) il campo resta vuoto: è normale.

---

## 3. Adattare l'aspetto

Il modulo compare dentro un pannello nero. Con il tema chiaro di default stona.

**Pannello di destra → Theme** (o l'icona del pennello):

- **Background:** trasparente, oppure nero `#000000`
- **Text:** bianco `#FFFFFF`
- **Primary / Button:** l'arancione del sito, `#FF4A1C`
- **Font:** se c'è, un carattere a spaziatura fissa; altrimenti va bene il predefinito

Lo sfondo trasparente lo richiede già il sito tramite un parametro, ma i colori
del testo vanno impostati qui: senza, si vedrebbe testo scuro su fondo scuro.

---

## 4. Le notifiche via email — e un limite del piano gratuito

Senza notifiche le richieste arrivano **solo** nel cruscotto Tally, e bisogna
ricordarsi di controllarlo. Le notifiche vanno quindi attivate:

**Icona ⚙ in alto** (nell'editor del modulo, a sinistra di *Customize*) → scorri
fino a **Email notifications** → attiva **Self email notifications**.

> ⚠️ **VERIFICATO IL 3 SETTEMBRE 2026 — il destinatario NON è modificabile sul
> piano gratuito.**
>
> I campi *To*, *Subject* e *From name* esistono e si compilano, e l'API li
> memorizza anche — ma **Tally li ignora**: la personalizzazione delle email è
> una funzione Pro. Le notifiche arrivano sempre all'email dell'account, con
> oggetto e mittente predefiniti.
>
> Lo abbiamo scoperto con un invio di prova: pur avendo impostato
> `selfEmailTo = video@andreaonori.com`, l'email è arrivata a
> `n.bartoli@blulang.co` con oggetto «New Tally Form Submission for…» e mittente
> «Tally Forms».
>
> **Conseguenza:** l'unico modo gratuito perché le richieste arrivino ad Andrea è
> che **l'account Tally sia il suo**. Non è più una preferenza organizzativa
> (punto 0): è l'unica configurazione che funziona.

### Come far arrivare le richieste ad Andrea

| Opzione | Costo | Note |
|---|---|---|
| **Cambiare l'email dell'account** in `video@andreaonori.com` (*Settings → My account → Change email*), impostare una password e consegnarla | gratis | **Consigliata.** Le notifiche seguono l'account. Chi la esegue perde l'accesso, che alla consegna è corretto. |
| Tally Pro | a pagamento | Sblocca il campo *To*. Sproporzionato per cambiare un destinatario. |
| Inoltro automatico dalla casella dell'agenzia | gratis | Funziona, ma tiene l'agenzia dentro la corrispondenza commerciale di Andrea a tempo indeterminato. |
| Tornare al modulo interno del sito | gratis | Svuotare `tallyId` nel pannello e impostare `SMTP_USER`/`SMTP_PASS` su Vercel (vedi `CONSEGNA.md` §1.3-bis). L'email parte dalla casella di Andrea e arriva direttamente a lui, con `Reply-To` su chi ha scritto e senza il badge «Made with Tally». |

> In ogni caso le richieste restano archiviate **nel cruscotto dell'account
> Tally**: l'email è solo una notifica. Trasferire l'account è anche ciò che
> sposta i dati dalla parte giusta.

## 5. Pubblicare e prendere l'ID

1. Premi **Publish** in alto a destra. Un modulo non pubblicato non si carica.
2. Guarda l'URL del modulo pubblicato: `tally.so/r/`**`wA1bC2`**
3. L'**ID** è la parte finale, dopo `/r/`. Sono 6 caratteri, maiuscole e
   minuscole contano.

Lo trovi anche nell'URL dell'editor: `tally.so/forms/`**`wA1bC2`**`/edit`.

---

## 6. Collegarlo al sito

1. Vai su **`andreaonori.com/admin-edits`** ed entra
2. Scheda **IMPOSTAZIONI**
3. Gruppo **Modulo di contatto** → campo **ID del modulo Tally**
4. Incolla l'ID (solo l'ID: `wA1bC2`, non l'indirizzo completo)
5. **Salva tutto**

Dopo il redeploy automatico — una ventina di secondi — i pulsanti di contatto
aprono il modulo Tally.

**Per tornare indietro:** svuota quel campo e salva. Il sito torna al modulo
interno, che invia per email tramite la casella Aruba (richiede le variabili
`SMTP_USER` e `SMTP_PASS` su Vercel, vedi `CONSEGNA.md` §1.3).

---

## 7. Verificare

1. Apri `andreaonori.com` in una finestra di navigazione anonima
2. Premi **GET IN TOUCH** → il modulo Tally deve comparire entro pochi secondi,
   con i colori giusti
3. Compila e invia una richiesta di prova
4. Controlla che arrivi **sia** nella casella `video@andreaonori.com` **sia** nel
   cruscotto Tally
5. Ripeti aprendo un progetto e premendo **INQUIRE**: nella risposta il campo
   `progetto` deve contenere il titolo del progetto

Se il modulo non compare, dopo 7 secondi il sito mostra da sé l'indirizzo email
al suo posto: la richiesta non va persa. In quel caso ricontrolla l'ID e che il
modulo sia **pubblicato**.

---

## Come è integrato, e perché così

Due scelte che riguardano la privacy e le prestazioni, utili da conoscere se un
domani qualcuno ci mette mano.

**Il modulo non viene caricato durante la navigazione.** L'iframe di Tally nasce
solo quando si apre il pannello di contatto, cioè dopo un click esplicito. Chi
visita il sito senza voler scrivere non genera nessuna richiesta verso Tally:
è la stessa logica del blocco preventivo applicato a Google Analytics, e
l'informativa privacy lo dichiara.

**Non viene caricato lo script `embed.js` di Tally.** Il sito ha una Content
Security Policy che non ammette script da origini esterne, e caricarlo avrebbe
richiesto di riaprirla. Si usa un iframe semplice, e l'unica funzione utile di
quello script — adattare l'altezza al contenuto — è gestita dal sito
ascoltando il messaggio che Tally invia, accettato solo dall'origine `tally.so`.
L'iframe è inoltre isolato in *sandbox* senza `allow-same-origin`, quindi non
può leggere nulla della pagina che lo contiene.

**Adempimenti privacy già fatti:** `privacy.html` dichiara Tally BV (Gand,
Belgio) come responsabile del trattamento, con dati su server UE, e precisa che
il modulo non viene caricato prima di un'azione dell'utente. L'accordo sul
trattamento dei dati (DPA) è incluso nei termini di servizio di Tally, quindi
non serve firmarne uno separato.

---

Fonti: [Tally — Hidden fields](https://tally.so/help/hidden-fields) ·
[Tally — Self email notifications](https://tally.so/help/self-email-notifications) ·
[Tally — Form settings](https://tally.so/help/form-settings) ·
[Tally — GDPR](https://tally.so/help/gdpr)
