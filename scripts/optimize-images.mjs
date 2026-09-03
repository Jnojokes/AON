#!/usr/bin/env node
/**
 * optimize-images.mjs — genera una versione WebP di ogni immagine in media/.
 *
 * PERCHE'
 * media/ pesava 101 MB: JPEG fino a 4 MB e 4032x3024 px, serviti a un sito che
 * li mostra a circa 700 px di larghezza. Erano il singolo costo piu' grosso per
 * chi visita il sito, piu' del JavaScript.
 *
 * COSA FA (e cosa NON fa)
 * Per ogni immagine scrive un .webp accanto all'originale, a lato lungo 2000 px
 * e qualita' 82. NON cancella nulla: gli originali restano in media/ e nel
 * repository come archivio a piena risoluzione. A non essere pubblicati sono
 * solo loro, tramite .vercelignore — il sito serve i WebP, l'archivio resta.
 *
 * media.json viene riscritto per puntare ai .webp. E' l'unica fonte dei percorsi
 * usati dal sito e dal pannello, quindi basta quello.
 *
 * Uso:  node scripts/optimize-images.mjs [--dry]
 */
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MEDIA = join(ROOT, 'media');
const DRY = process.argv.includes('--dry');
const MAX_EDGE = 2000;
const QUALITY = 82;

const SRC_EXT = new Set(['.jpg', '.jpeg', '.png']);
const mb = (n) => `${(n / 1048576).toFixed(2)} MB`;

// Conversione via Pillow. Il primo tentativo era `sips`, preinstallato su
// macOS, ma non sa scrivere WebP ("Can't write format: org.webmproject.webp").
// Pillow e' gia' presente e produce risultati migliori: ridimensiona in
// LANCZOS e converte in un passaggio solo.
const PY = `
import sys
from PIL import Image
src, dst, max_edge, q = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
im = Image.open(src)
# I PNG con trasparenza la mantengono; tutto il resto va a RGB, perche' un
# profilo CMYK o una palette indicizzata farebbero fallire il salvataggio.
im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') and 'transparency' in im.info else 'RGB')
w, h = im.size
if max(w, h) > max_edge:
    r = max_edge / max(w, h)
    im = im.resize((max(1, round(w * r)), max(1, round(h * r))), Image.LANCZOS)
im.save(dst, 'WEBP', quality=q, method=5)
`;

function toWebp(src, dst) {
  execFileSync('python3', ['-c', PY, src, dst, String(MAX_EDGE), String(QUALITY)],
    { stdio: ['ignore', 'ignore', 'pipe'] });
}

const files = readdirSync(MEDIA).filter((f) => SRC_EXT.has(extname(f).toLowerCase()));
console.log(`${files.length} immagini in media/\n`);

let origTot = 0, newTot = 0, fatte = 0, saltate = 0;
const mappa = new Map();   // "media/x.jpg" -> "media/x.webp"

for (const f of files) {
  const src = join(MEDIA, f);
  const out = basename(f, extname(f)) + '.webp';
  const dst = join(MEDIA, out);
  const o = statSync(src).size;
  origTot += o;
  mappa.set(`media/${f}`, `media/${out}`);

  if (existsSync(dst) && statSync(dst).mtimeMs >= statSync(src).mtimeMs) {
    newTot += statSync(dst).size; saltate++; continue;
  }
  if (DRY) { console.log(`  [dry] ${f} → ${out}`); continue; }
  try {
    toWebp(src, dst);
    const n = statSync(dst).size;
    newTot += n; fatte++;
    console.log(`  ${f.padEnd(46)} ${mb(o).padStart(9)} → ${mb(n).padStart(9)}  −${Math.round(100 - (100 * n) / o)}%`);
  } catch (e) {
    console.error(`  ✗ ${f}: ${String(e.message).split('\n')[0]}`);
    mappa.delete(`media/${f}`);   // fallita: media.json continua a puntare all'originale
  }
}

if (DRY) { console.log('\n(dry run, nessun file scritto)'); process.exit(0); }

console.log(`\n  convertite ${fatte}, gia' aggiornate ${saltate}`);
console.log(`  ${mb(origTot)} → ${mb(newTot)}   −${Math.round(100 - (100 * newTot) / origTot)}%\n`);

// ── media.json: riscrittura dei percorsi ─────────────────────────────────────
// Sostituzione testuale su tutto il file: i percorsi compaiono in feed[].url,
// feed[].images[], series[].image, series[].images[], motion[] e index[].image,
// a volte come stringa nuda e a volte dentro un oggetto. Una passata sul testo
// li prende tutti senza dover conoscere la forma di ognuno.
const mjPath = join(ROOT, 'media.json');
let mj = readFileSync(mjPath, 'utf8');
let sostituzioni = 0;
for (const [vecchio, nuovo] of mappa) {
  const re = new RegExp(`"${vecchio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g');
  const prima = mj;
  mj = mj.replace(re, `"${nuovo}"`);
  if (mj !== prima) sostituzioni++;
}
JSON.parse(mj);   // se la riscrittura avesse rotto il JSON, meglio saperlo qui
writeFileSync(mjPath, mj, 'utf8');
console.log(`  media.json: ${sostituzioni} percorsi aggiornati ai .webp`);
