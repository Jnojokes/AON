# Come mettere i video sul sito (storage Aruba)

Guida pratica per **Andrea**. I video non vengono caricati dentro il sito: restano sul tuo
spazio Aruba e il sito li richiama solo quando un visitatore clicca su "play".
Così il sito resta leggero e veloce, e non c'è alcun limite di peso da rispettare.

Le **foto** invece si trascinano direttamente dentro il pannello, come sempre.

---

## In breve

| | Dove sta | Come si mette |
|---|---|---|
| **Foto** | dentro il sito (cartella `/media`) | si trascina nel pannello `/admin-edits` — max 3 MB per foto |
| **Video** | sul tuo storage Aruba | si incolla il **link** nel pannello |
| **Copertina del video** | dentro il sito | si trascina una foto, oppure la genera il pannello dal video |

---

## 1. Prepara il video

Esportalo in **MP4 — codec H.264 + audio AAC**, 1080p (o 1080×1920 per i verticali).

Indicazione di peso, per un reel da 20–40 secondi: **5–15 MB**. Più il file è leggero,
più il video parte istantaneamente per chi guarda. Un master da centinaia di MB
tecnicamente funziona, ma chi lo apre da telefono aspetta troppo e se ne va.

> Se esporti da Premiere: preset *H.264 → Match Source – Adaptive Medium Bitrate*.
> Da DaVinci: *MP4, H.264, bitrate 6–8 Mbps*.

## 2. Carica su Aruba e rendi il file pubblico

Carica il file nel tuo spazio Aruba (Cloud Object Storage o lo spazio web dell'hosting).

Nell'Object Storage Web Client: tasto destro sul file → **Modifica permessi** → spunta
**"Download file"** per **"Tutti gli utenti"** → salva. Senza questo passaggio il file
esiste ma il sito non può mostrarlo.

## 3. Copia il link diretto

Il link deve avere queste tre caratteristiche:

- inizia con **`https://`** (non `http://` — i browser bloccano i video in http su un sito sicuro)
- finisce con **`.mp4`**
- **aperto in una nuova scheda del browser fa partire il video**, non apre una pagina di anteprima e non chiede il login

Questa terza è la prova decisiva: incolla il link in una scheda nuova. Se parte il video, è quello giusto.

## 4. Incollalo nel pannello

Vai su `andreaonori.com/admin-edits` ed entra.

- **MOTION** (i reel verticali): ogni riquadro ha il campo **"Link video esterno · Aruba (.mp4)"**.
- **FEED** (i post): premi **"+ Link video"** dentro il post per aggiungere il film alle sue slide.
- **SERIES** (le storie a cerchi): stesso pulsante **"+ Link video"**, il video diventa una slide della storia.

Incollato il link, premi **"Verifica link"**:

- **✓ verde** con durata e risoluzione → il sito lo riprodurrà, sei a posto.
- **✕ rosso** → il messaggio ti dice esattamente cosa non torna (file non pubblico, link
  che non è un file diretto, formato non supportato, link in http).

## 5. Metti la copertina

È l'immagine che si vede prima del click: è lei che tiene il sito leggero e fa una bella figura in griglia.

- **Consigliato:** trascina una foto nel riquadro della copertina (uno still del video, o una foto del progetto).
- **Alternativa:** premi **"Copertina auto"** e il pannello prova a estrarre un fotogramma dal video.
  Funziona solo se lo storage lo consente; se non ci riesce te lo dice e trascini la foto a mano.

Senza copertina il sito mostra comunque il primo fotogramma del video, ma è meno bello e
un po' più pesante da caricare.

## 6. Salva

Premi **"Salva tutto"** in alto a destra. Dopo ~20 secondi il sito è aggiornato.

---

## Se qualcosa non funziona

| Cosa vedi | Cosa è | Come si risolve |
|---|---|---|
| ✕ "File non raggiungibile" | il file non è pubblico | rifai il passaggio 2 (permessi → Tutti gli utenti) |
| ✕ "Il link non apre un file video diretto" | hai copiato il link della pagina, non del file | apri il link in una scheda: se non parte il video, non è quello giusto |
| ✕ "usa https://" | link in http | cambia `http://` in `https://` |
| Il video parte ma si ferma a scatti | file troppo pesante o storage lento | riesporta più leggero (punto 1) |
| "Copertina auto" dà errore CORS | lo storage non permette al browser di leggere il fotogramma | trascina tu una foto come copertina: stesso risultato |
| Trascino un video e mi dice di no | è voluto | i video non entrano nel sito: vanno su Aruba e si incolla il link |

---

## Cosa NON serve fare

- Non serve comprimere i video sotto i 100 MB per "farli stare nel sito": non ci entrano
  comunque e non è più necessario.
- Non serve cancellare i video vecchi da Aruba quando li sostituisci: basta cambiare il
  link nel pannello.
- Non serve toccare nessun file di codice: tutto passa dal pannello.

Sources:
- [Aruba KB — Object Storage: gestire i permessi](https://kb.cloud.it/object-storage/object-storage-web-client/gestire-i-permessi.aspx)
- [Aruba KB — Object Storage: caricamento e gestione dei file](https://kb.cloud.it/storage/object-storage/object-storage-web-client/file-caricamento-gestione.aspx)
