# Andrea Onori — Portfolio Preview

Due direzioni editoriali per il portfolio di Andrea Onori, deployabili su Vercel come singolo progetto con switcher integrato.

## Struttura

```
andrea-onori-vercel/
├── index.html      ← splash di scelta (root del dominio)
├── bold.html       ← Edition 01 · brutalist editorial
├── archive.html    ← Edition 02 · L'Archive Vol. III, editorial magazine
├── andrea.jpg      ← foto profilo (placeholder)
└── README.md
```

Una volta deployato:

- `tuodominio.com/` → splash con scelta tra le due edition
- `tuodominio.com/bold` → versione BOLD
- `tuodominio.com/archive` → versione L'Archive
- Toggle switcher fisso in alto su entrambe le versioni per passare da una all'altra

## Deploy su Vercel (drag-and-drop)

1. Vai su `vercel.com/new`
2. Trascina la cartella `andrea-onori-vercel/` nella zona drop
3. Premi **Deploy** senza toccare nulla nelle settings
4. Pronto in circa 20 secondi

In alternativa via CLI:

```bash
npm i -g vercel
cd andrea-onori-vercel
vercel deploy --prod
```

## Le due direzioni

**Edition 01 — BOLD / 25**
Brutalist, editorial, sharp. Archivo Black + Bricolage Grotesque + JetBrains Mono. Palette nero/bianco con accento arancio. Marquee scorrevole in stile Off-White, bento grid asimmetrico per il primo blocco, counter animati sulle statistiche, HUD con clock live e coordinate Milano, hover scrub che rivela format/film/location.

**Edition 02 — L'Archive · Vol. III**
Editorial magazine, cinematic. Fraunces + Crimson Pro + JetBrains Mono. Palette dark con accento oro `#C9985A`. Hero quote in italic, grain noise overlay, vignetting, light leak animato sull'angolo, custom cursor con crosshair/view mode, numeri romani, hover che rivela EXIF (camera, film, apertura), footer in stile colofone con set-in & printed.

## Personalizzazione successiva

- **Foto profilo:** sostituire `andrea.jpg` mantenendo il nome file (formato JPG, idealmente quadrata, max 1MB)
- **Foto del feed:** attualmente Unsplash placeholders. Cercare nei file `bold.html` e `archive.html` l'array `UNSPLASH` (intorno alla riga 380) e sostituire gli URL con i link finali (Cloudinary, S3, o anche `./img/01.jpg` se carichi le foto nella cartella)
- **Copy:** nome, statistiche, bio, link sito, location — tutto inline nei due file HTML, semplice search-and-replace
- **Colore accento:** cambiare la variabile CSS `--accent` in cima al `<style>` di ciascun file (`#FF3D00` per bold, `#C9985A` per archive)

## Note tecniche

I file sono single-page React (via CDN React 18 + Babel standalone) + Tailwind CDN. Zero build step, deploy immediato. Per la versione finale di produzione conviene precompilare con Vite o Next.js, ma per il preview cliente questa setup è perfetta — un drop e funziona ovunque.
