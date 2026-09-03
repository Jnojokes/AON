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

> Se l'account lo crea l'agenzia per comodità operativa, va comunque impostato
> l'inoltro delle notifiche a `video@andreaonori.com` (punto 4) e concordato il
> passaggio di proprietà alla consegna.

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

## 4. Attivare le notifiche via email

Senza questo passaggio le richieste arrivano **solo** nel cruscotto Tally, e
Andrea dovrebbe ricordarsi di controllarlo. Va fatto.

**Settings** (in alto nell'editor) → scorri fino a **Email notifications**:

| Campo | Valore |
|---|---|
| **To** | `video@andreaonori.com` |
| **Subject** | `Nuova richiesta dal sito — {{Nome}}` |
| **From name** | `Sito Andrea Onori` |

Il destinatario predefinito è l'email dell'account: se l'account è intestato
all'agenzia, **questo campo va cambiato**, altrimenti Andrea non riceve nulla.

> La risposta automatica a chi invia (*Respondent email notifications*) è una
> funzione **Pro**, a pagamento. Non è necessaria: il sito mostra già una
> conferma a schermo dopo l'invio.

---

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
