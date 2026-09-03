/** Tailwind — sostituisce cdn.tailwindcss.com (il "Play CDN", che la stessa
 *  documentazione Tailwind sconsiglia in produzione: scarica il compilatore nel
 *  browser e genera il CSS a runtime a ogni visita).
 *
 *  Nessun tema personalizzato: il sito usava il CDN con la configurazione di
 *  default, quindi qui non si estende nulla — l'obiettivo e' produrre lo stesso
 *  CSS, non un CSS migliore. Tutta la grafica vera vive nel <style> inline di
 *  index.html; da Tailwind arrivano solo una cinquantina di utility di layout.
 */
export default {
  content: ['./index.html', './src/app.jsx'],
  theme: { extend: {} },
  plugins: [],
};
