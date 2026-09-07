# Come mettere i video sul sito (Jumpshare)

Guida pratica per **Andrea**. I video non vengono caricati dentro il sito:
restano su Jumpshare e il sito li richiama solo quando qualcuno clicca «play».
Così il sito resta leggero e non c'è alcun limite di peso da rispettare.

Le **foto** invece si trascinano direttamente nel pannello, come sempre.

---

## In breve

| | Dove sta | Come si mette |
|---|---|---|
| **Foto** | dentro il sito (cartella `/media`) | si trascina nel pannello — max 3 MB per foto |
| **Video** | su Jumpshare | si incolla il **codice embed** nel pannello |
| **Copertina del video** | dentro il sito | si trascina una foto |

---

## 1. Prepara il video

Esportalo in **MP4 — codec H.264 + audio AAC**, 1080p (o 1080×1920 per i verticali).

Per un reel da 20–40 secondi: **5–15 MB**. Più il file è leggero, più il video
parte subito per chi guarda.

> Da Premiere: preset *H.264 → Match Source, Adaptive Medium Bitrate*.
> Da DaVinci: *MP4, H.264, 6–8 Mbps*.

## 2. Carica su Jumpshare

Trascina il file su `jumpshare.com` (o dall'app). Attendi che il caricamento
finisca del tutto.

## 3. Copia il codice embed

Apri il video → **Share** → scheda **Embed** → **Copy Code**.

Ottieni una riga di codice, qualcosa come:

```html
<iframe src="https://jumpshare.com/embed/xxxxxxxx" ...></iframe>
```

**Copiala tutta.** Non serve isolare l'indirizzo: il pannello lo estrae da sé.

## 4. Incollalo nel pannello

Vai su `andreaonori.com/admin-edits` ed entra.

- **MOTION** (i reel verticali): campo **«Link video esterno · Jumpshare»**
- **FEED** (i post): pulsante **«+ Link video»** dentro il post
- **SERIES** (le storie): stesso pulsante, il video diventa una slide

Incolla il codice e premi **Verifica link**: se compare ✓ l'indirizzo è stato
riconosciuto.

> **Perché la verifica non mostra durata e risoluzione.** Con un video
> incorporato quei dati non sono leggibili: il browser non permette a un sito di
> ispezionare il contenuto di un altro dominio. La verifica controlla la forma
> dell'indirizzo; la prova vera è guardare il video sul sito dopo il salvataggio.

## 5. Metti la copertina

È l'immagine che si vede prima del click, ed è ciò che tiene il sito leggero.

**Trascina una foto** nel riquadro della copertina: uno still del video, o una
foto del progetto.

> Il pulsante **«Copertina auto»** non funziona con i video incorporati: per
> estrarre un fotogramma servirebbe accedere al file, e Jumpshare non lo
> consente. La copertina va sempre messa a mano — che dà comunque un risultato
> migliore, perché scegli tu il fotogramma.

## 6. Salva

Premi **«Salva tutto»**. Dopo una ventina di secondi il video è sul sito.

---

## Se qualcosa non funziona

| Cosa vedi | Cosa fare |
|---|---|
| Il riquadro del video resta nero o vuoto | Su Jumpshare controlla che il file sia condivisibile e non scaduto. Riapri **Share → Embed** e ricopia il codice. |
| «Il link non apre un file video diretto» | Hai incollato il link normale del browser invece del codice **Embed**. Torna al punto 3. |
| Il video parte ma va a scatti | File troppo pesante: riesporta seguendo il punto 1. |
| «Copertina auto» dà errore | È previsto, vedi il punto 5. Trascina una foto. |
| Trascino un video nel pannello e lo rifiuta | È voluto: i video non entrano nel sito, vanno su Jumpshare. |

---

## Cosa NON serve fare

- Non serve comprimere i video sotto i 100 MB «per farli stare nel sito»: non ci
  entrano comunque.
- Non serve cancellare i video vecchi da Jumpshare quando li sostituisci: basta
  cambiare il codice nel pannello.
- Non serve toccare nessun file di codice: tutto passa dal pannello.

---

## Nota tecnica

Il video compare in un riquadro incorporato, con il **player di Jumpshare** e i
suoi controlli. È la conseguenza della scelta di usare Jumpshare: il servizio non
espone il file vero, solo una pagina da incorporare.

Il riquadro viene caricato **solo al click**: durante la normale navigazione il
sito non contatta Jumpshare, quindi la griglia resta veloce e nessun dato viene
trasmesso a terzi prima di un'azione esplicita.

Se un domani si volesse il player del sito — schermo pieno, nessun marchio, e la
copertina generata automaticamente — servirebbe uno storage che dia link diretti
al file (Aruba Object Storage, Bunny, Cloudflare R2). Il codice supporta già
entrambe le modalità: le riconosce dall'indirizzo.
