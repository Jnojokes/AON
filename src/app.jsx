// =============================================================================
//  AON — sorgente dell'applicazione
// -----------------------------------------------------------------------------
//  Fino a settembre 2026 questo codice viveva dentro index.html in un
//  <script type="text/babel">, compilato NEL BROWSER da @babel/standalone.
//  Costava 3,1 MB di download bloccante e un passaggio di compilazione a ogni
//  singola visita, e rendeva il sito una pagina bianca se unpkg non rispondeva.
//
//  Ora e' un sorgente vero, compilato una volta sola in fase di build da
//  esbuild (vedi scripts/build.mjs) verso assets/app.js.
//
//  Il codice sotto e' identico a quello che girava prima: le uniche aggiunte
//  sono i due import qui sopra, che rimpiazzano i global React e ReactDOM che
//  arrivavano dagli script UMD di unpkg.
// =============================================================================
import React from 'react';
import * as ReactDOM from 'react-dom/client';

        const { useState, useEffect, useRef } = React;

        // Live media accessor — reads window.MEDIA (populated from media.json) at
        // render time. If the fetch failed, M() is empty and each section falls
        // back to a clean empty-state (no placeholder images).
        const M = () => (window.MEDIA || {});

        // ── Copy del sito ────────────────────────────────────────────────────
        // Ogni stringa visibile vive qui, non più sparsa nel JSX. I valori sono
        // i default storici: sono ciò che il sito mostra finché media.json non
        // contiene un "settings" che li sovrascrive.
        // Il pannello /admin-edits scrive esattamente questa struttura, quindi
        // aggiungere una voce qui significa poterla modificare da lì — a patto
        // di aggiungerla anche allo schema del pannello.
        const TEXT_DEFAULTS = {
            // Barra scorrevole in cima: coppie etichetta/valore, in ordine.
            marquee: [
                { label: 'ARCHIVE',     value: '2025' },
                { label: 'INDEX',       value: '247 FRAMES ON FILE' },
                { label: 'STATUS',      value: 'AVAILABLE FOR COMMISSIONS' },
                { label: 'STUDIO',      value: 'MILAN — ITALY' },
                { label: 'NOW BOOKING', value: 'Q3 — Q4 / 2025' },
                { label: 'EDITION',     value: 'BOLD / 01' },
                { label: 'SHIPPING',    value: 'WORLDWIDE' },
            ],
            topbar: { left: 'andrea__onori', right: 'ARCHIVE / 25 · VOLUME 01' },
            // Un campo svuotato dal pannello toglie l'elemento: è così che
            // badge, link al sito e pulsante secondario sono spariti nella
            // versione 1, senza perdere la possibilità di rimetterli.
            profile: {
                badge: 'VERIFIED · 25',
                eyebrow: '◌ PHOTOGRAPHER · BASED IN MILAN',
                nameFirst: 'Andrea',
                nameLast: 'Onori',
                handle: '@andrea__onori · ESTABLISHED MMXVIII',
                disciplines: 'EDITORIAL · PORTRAIT · PERSONAL WORK.',
                siteLabel: '↗ ANDREAONORI.COM',
                siteUrl: 'https://www.andreaonori.com/',
                ctaPrimary: 'CONTACT ME',
                // Riga sotto del bottone di contatto: a riposo e col mouse sopra.
                ctaIdle: 'STAND BY',
                ctaHover: 'REC',
                ctaEmail: 'video@andreaonori.com',
                ctaSubject: 'Commission enquiry',
                ctaSecondary: 'AVAILABLE FOR WORK',
            },
            sections: {
                seriesTitle: '◯ SERIES',
                seriesUnit: 'COLLECTIONS',
                tabFeed: 'FEED',
                tabMotion: 'MOTION',
                tabIndex: 'INDEX',
                indexNo: 'NO.',
                indexTitle: 'TITLE',
                indexLocation: 'LOCATION',
                indexYear: 'YEAR',
                motionPrefix: 'REEL #',
                motionYear: '2025',
                // {SECTION} viene sostituito col nome della sezione vuota.
                empty: 'NESSUN MEDIA IN {SECTION} — aggiungilo da /admin-edits',
            },
            post: {
                // Etichette usate solo dai post senza crediti (vedi PostCredits).
                year: 'YEAR',
                format: 'FORMAT',
                prev: '← POST PREC.',
                next: 'POST SUCC. →',
                inquire: 'INQUIRE',
                // {TITLE} viene sostituito col titolo del progetto.
                inquireSubject: 'Inquiry — {TITLE}',
                carousel: 'CAROUSEL',
                video: '▶ VIDEO',
                play: 'PLAY',
                // Dicitura mostrata quando un post ha la spunta "Contenuto
                // Enhanced con AI". Cambiarla qui la cambia ovunque.
                aiShort: '◇ AI',
                aiLabel: '◇ AI-ENHANCED',
            },
            showreel: {
                title: 'SHOWREEL · 25',
                subtitle: 'ANDREA ONORI · MMXXV',
                // A capo consentiti: vengono resi come <br>.
                headline: 'A YEAR\nIN FRAMES.',
                frame: 'FRAME',
                autoplay: 'AUTOPLAY',
            },
            // Video in loop in cima alla home, sopra il nome. Senza video il
            // blocco non compare.
            feedReel: {
                video: '',
                poster: '',
                label: 'SHOWREEL',
            },
            contact: {
                // Vuoto = si usa il modulo interno (richiede SMTP su Vercel).
                // Con un ID Tally si usa quello: nessuna credenziale, e le
                // richieste finiscono anche nel cruscotto Tally.
                tallyId: '',
            },
            footer: {
                name: 'ANDREA ONORI',
                studioLabel: 'STUDIO',
                studioValue: 'MILAN — IT',
                emailLabel: 'EMAIL',
                emailValue: 'video@andreaonori.com',
                socialLabel: 'SOCIAL',
                socialValue: '@andrea__onori',
                socialUrl: 'https://www.instagram.com/andrea__onori',
                release: 'ARCHIVE — RELEASE / 25',
                vat: '02491850448',
                privacy: 'PRIVACY',
                cookie: 'COOKIE',
                legal: 'NOTE LEGALI',
                edition: 'EDITION 01 / BOLD',
            },
            consent: {
                text: 'Questo sito usa cookie di misurazione per capire come viene usato. Nessun cookie viene installato senza il tuo consenso.',
                link: 'Informativa',
                accept: 'Accetta',
                reject: 'Rifiuta',
            },
            seo: {
                author: 'Andrea Onori',
                avatarAlt: 'Andrea Onori, fashion photographer and filmmaker based in Milan',
                // "Descrizione per SEO & Motori AI": non compare a schermo.
                // Finisce in JSON-LD, nella sezione sr-only e in llms.txt,
                // tutti generati da scripts/prerender.mjs. Vuoto = il testo
                // viene ricavato automaticamente dai progetti.
                bio: '',
            },
        };

        // Fonde i default con quello che c'è in media.json. Una stringa vuota
        // salvata dal pannello vince sul default: cancellare un campo è un modo
        // legittimo di togliere quel testo dal sito.
        const deepMerge = (base, over) => {
            if (over === undefined || over === null) return base;
            if (Array.isArray(base)) return Array.isArray(over) ? over : base;
            if (base && typeof base === 'object') {
                if (typeof over !== 'object' || Array.isArray(over)) return base;
                const out = { ...base };
                for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
                return out;
            }
            return over;
        };

        // media.json è già stato scaricato quando i componenti renderizzano
        // (root.render sta nel .finally della fetch), quindi memoizzare qui è
        // sicuro e evita di rifondere l'oggetto a ogni render.
        let _S = null;
        const S = () => (_S || (_S = deepMerge(TEXT_DEFAULTS, M().settings)));

        // Rende un testo multiriga come righe separate da <br>.
        const brLines = (s) => String(s || '').split(/\r?\n/);

        // ── Modello media ────────────────────────────────────────────────────
        // Un elemento media può essere:
        //   "media/foto.jpg"                          → immagine nel repo
        //   "https://…/clip.mp4"                      → video esterno (retrocompat.)
        //   { video:"https://…/clip.mp4",
        //     poster:"media/cover.jpg", title:"…" }   → video esterno + copertina
        // `src` resta accettato come alias (video se ha estensione video, altrimenti poster).
        // `ratio` (es. "16/9", "4/5") sono le proporzioni del video: servono a dare
        // al player la forma del video (vedi fitStyle).
        // I video NON stanno nel repo: sono su Bunny Stream e vengono caricati
        // solo quando l'utente clicca → la griglia resta leggera.
        const VIDEO_RE = /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/i;
        // Bunny Stream: il player da incorporare. Il vecchio dominio
        // iframe.mediadelivery.net e l'indirizzo /play/ si riconoscono uguali.
        // Gruppo 1 = libreria, gruppo 2 = id del video (guid).
        const BUNNY_RE = /^https?:\/\/(?:player|iframe)\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-f-]{36})/i;
        // Jumpshare, lo storage di prima: i suoi link restano riconosciuti
        // finche' qualcuno ne usa ancora uno. Copre /share/, /embed/, /v/ e jmp.sh.
        const JUMPSHARE_RE = /^https?:\/\/(?:www\.)?(?:jumpshare\.com\/(?:share|embed|v)\/[A-Za-z0-9_-]{4,}|jmp\.sh\/[A-Za-z0-9_-]{4,})[+-]?\/?/i;
        const isVideoUrl = (u) => typeof u === 'string' && (VIDEO_RE.test(u) || BUNNY_RE.test(u) || JUMPSHARE_RE.test(u));

        /** Vero se l'indirizzo va riprodotto in un iframe invece che con <video>:
         *  Bunny e Jumpshare danno un player da incorporare, non il file. Vale
         *  anche per qualunque altro indirizzo che contenga /embed/, così un
         *  cambio di fornitore non richiede di toccare questa riga. */
        const isEmbedUrl = (u) => {
            const t = String(u || '');
            return BUNNY_RE.test(t) || JUMPSHARE_RE.test(t) || /\/embed\//i.test(t);
        };

        // Indirizzo del player Bunny con le impostazioni del sito: parte da solo,
        // si adatta al riquadro, non riprende da dove si era fermato, e non
        // carica una qualita' piu' alta di quella che il riquadro mostra.
        // Un /play/ diventa /embed/; parametri gia' presenti nel link vincono.
        const BUNNY_PARAMS = { autoplay: 'true', preload: 'true', responsive: 'true', rememberPosition: 'false', levelCap: 'true' };
        const bunnySrc = (u) => {
            const m = String(u || '').match(BUNNY_RE);
            if (!m) return u;
            try {
                const url = new URL(u);
                url.pathname = `/embed/${m[1]}/${m[2]}`;
                for (const [k, v] of Object.entries(BUNNY_PARAMS)) if (!url.searchParams.has(k)) url.searchParams.set(k, v);
                return url.toString();
            } catch (e) { return u; }
        };

        // Proporzioni di un video: "16/9", "4:5" o un numero → larghezza/altezza.
        // 0 = sconosciute. Un video Bunny senza proporzioni si tratta da 16:9.
        const ratioOf = (r) => {
            const t = String(r || '').trim();
            const m = t.match(/^(\d+(?:\.\d+)?)\s*[\/:x×]\s*(\d+(?:\.\d+)?)$/i);
            const n = m ? Number(m[1]) / Number(m[2]) : Number(t);
            return isFinite(n) && n > 0.2 && n < 5 ? n : 0;
        };
        const videoRatio = (s, predefinito) => ratioOf(s.ratio) || (BUNNY_RE.test(s.video || '') ? predefinito : 0);
        // Riquadro con la forma del video: largo quanto c'e' spazio, ma mai piu'
        // alto di maxH. Così i controlli del player stanno sul video, non in
        // fondo a una fascia nera (com'era con Jumpshare).
        const fitStyle = (r, maxH) => ({ width: `min(100%, calc(${maxH} * ${r}))`, aspectRatio: String(r), height: 'auto' });

        // ── Riproduzione ────────────────────────────────────────────────────
        //
        // Due modi, scelti in base all'indirizzo:
        //
        //   <video>  per i file diretti (.mp4 e simili): player del browser,
        //            nessun marchio di terzi.
        //
        //   <iframe> per Bunny Stream (e Jumpshare, lo storage di prima), che
        //            danno un player da incorporare. Il player di Bunny ha i
        //            suoi controlli (colore e pulsanti si scelgono su Bunny) e
        //            adatta la qualita' al riquadro e alla rete.
        //
        // In entrambi i casi la riproduzione parte solo quando questo
        // componente viene montato, cioe' dopo un click: la griglia resta
        // leggera e nulla viene richiesto a terzi durante la navigazione.
        const Player = ({ src, poster, titolo, style, className, onEnded, onTimeUpdate, autoPlay = true }) => {
            if (isEmbedUrl(src)) {
                const bunny = BUNNY_RE.test(src);
                return (
                    <iframe
                        src={bunny ? bunnySrc(src) : src}
                        title={titolo || 'Video'}
                        loading="lazy"
                        allow={bunny ? 'autoplay; encrypted-media; picture-in-picture; fullscreen' : 'autoplay; fullscreen; picture-in-picture'}
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                        className={className}
                        style={{ border: 0, background: '#000', display: 'block', ...(style || {}) }}
                    />
                );
            }
            return (
                <video
                    src={src}
                    poster={poster || undefined}
                    controls
                    autoPlay={autoPlay}
                    playsInline
                    preload="auto"
                    onEnded={onEnded}
                    onTimeUpdate={onTimeUpdate}
                    className={className}
                    style={style}
                />
            );
        };

        const normMedia = (v) => {
            if (!v) return { image: '', video: '', title: '', ratio: '', link: '', linkLabel: '' };
            if (typeof v === 'string') {
                return isVideoUrl(v)
                    ? { image: '', video: v, title: '', ratio: '', link: '', linkLabel: '' }
                    : { image: v, video: '', title: '', ratio: '', link: '', linkLabel: '' };
            }
            const src = v.src || '';
            const video = v.video || (isVideoUrl(src) ? src : '');
            const image = v.poster || v.image || (isVideoUrl(src) ? '' : src) || v.url || '';
            // link: link esterno della slide (es. il film intero su YouTube),
            // mostrato come bottoncino in alto a sinistra.
            const link = /^https?:\/\//i.test(v.link || '') ? v.link : '';
            // videoWide: versione orizzontale di un video delle storie, per
            // gli schermi larghi (vedi StoryViewer).
            return { image, video, title: v.title || '', ratio: v.ratio || '', link, linkLabel: v.linkLabel || '',
                videoWide: v.videoWide || '', ratioWide: v.ratioWide || '', posterWide: v.posterWide || '' };
        };

        // Slide di un post (FEED / INDEX): immagini e video mescolati, in ordine.
        const slidesOf = (post) => {
            if (!post) return [];
            const raw = (post.images && post.images.length)
                ? post.images
                : (post.url ? [post.url] : (post.image ? [post.image] : []));
            const slides = raw.map(normMedia).filter(s => s.image || s.video);
            if (post.video) {
                slides.unshift({
                    image: post.poster || (slides.find(s => s.image) || {}).image || '',
                    video: post.video,
                    title: post.title || '',
                    ratio: post.ratio || '',
                });
            }
            return slides;
        };
        const firstImageOf = (slides) => (slides.find(s => s.image) || {}).image || '';
        // Prima FOTO del carosello: una slide video non conta, anche se ha la sua
        // copertina (la miniatura del video). E' l'immagine della cella quando
        // il post non ha una Copertina propria; un post fatto solo di video
        // ricade sulla copertina del video.
        const firstPhotoOf = (slides) => (slides.find(s => s.image && !s.video) || {}).image || firstImageOf(slides);
        const firstVideoOf = (slides) => (slides.find(s => s.video) || {}).video || '';
        // Crediti di un post: coppie etichetta/valore libere, dal pannello (card
        // del feed), nell'ordine scelto da Andrea. Le voci col valore vuoto non
        // si mostrano. null = il post non ha crediti (post creati prima dei
        // crediti): chi lo usa ricade su anno e formato.
        const creditsOf = (p) => (p && Array.isArray(p.credits))
            ? p.credits.filter((c) => c && String(c.value || '').trim())
            : null;
        // Valore di una voce dei crediti cercata per etichetta (CLIENT, YEAR…).
        const creditValue = (p, label) => {
            const hit = (creditsOf(p) || []).find((c) => String(c.label || '').trim().toUpperCase() === label);
            return hit ? String(hit.value).trim() : '';
        };
        // Il cliente (voce CLIENT), se il titolo non lo dice gia': "YPSUM" con
        // cliente Ypsum non ha bisogno di ripeterlo.
        const brandOf = (p) => {
            const client = creditValue(p, 'CLIENT');
            return client && !String(p.title || '').toLowerCase().includes(client.toLowerCase()) ? client : '';
        };
        // Dalla versione con i crediti il titolo e' il nome del video ("BACK TO
        // OFFICE"): il cliente entra nell'alt subito dopo, cosi' "Santoni" resta
        // leggibile per la ricerca immagini e per chi usa uno screen reader.
        // Deve restare identico ad altOf in scripts/prerender.mjs.
        const altOf = (p) => [p.title, brandOf(p), p.film, p.location || p.loc, p.year].filter(Boolean).join(' — ');

        // Alt completo per le immagini: aggiunge l'autore. È la singola modifica
        // più utile agli alt per la ricerca immagini e per come i modelli
        // descrivono una foto quando la incontrano.
        const altImg = (p) => {
            const author = S().seo.author || '';
            const base = altOf(p);
            if (!author) return base;
            return base ? `${base} — photographed by ${author}` : `Photograph by ${author}`;
        };

        // I file di MOTION sono stringhe tipo "media/story-greta.png": senza
        // titolo l'alt degradava a "REEL #001", che non descrive nulla. Qui
        // risaliamo al progetto dal nome del file. La soluzione definitiva è un
        // campo titolo nel pannello admin, questa è la rete di sicurezza.
        const titleFromFilename = (src) => {
            const stem = String(src || '').split('/').pop().split('.')[0].toLowerCase();
            const known = [...(M().feed || []), ...(M().index || [])];
            for (const p of known) {
                const slug = String(p.title || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)[0];
                if (slug && stem.includes(slug)) return p.title;
            }
            return '';
        };

        // GA4 — no-op finché il Measurement ID non è configurato (vedi <head>).
        const track = (name, params) => {
            try { window.aonTrack && window.aonTrack(name, params); } catch (e) {}
        };

        // Marquee
        // Marquee — le voci arrivano da settings.marquee (pannello → "Barra
        // scorrevole"). Svuotare la lista fa sparire la barra invece di
        // lasciare una striscia vuota.
        const Marquee = () => {
            const items = (S().marquee || []).filter(it => it && (it.label || it.value));
            if (!items.length) return null;
            const Block = () => (
                <div className="marquee-track grot uline" aria-hidden="true">
                    {items.map((it, i) => (
                        <span key={i} className="marquee-item">
                            <span className="marquee-dot"></span>
                            <span style={{color: 'var(--mute)'}}>{it.label}</span>
                            <span>{it.value}</span>
                        </span>
                    ))}
                </div>
            );
            return (
                <div className="marquee">
                    <Block /><Block /><Block />
                </div>
            );
        };

        // Copia l'indirizzo negli appunti e mostra una conferma.
        //
        // I pulsanti di contatto sono link mailto:. Funzionano per chi ha un
        // client di posta configurato, ma per chi usa la webmail dal browser un
        // click su mailto: NON FA NULLA: nessuna finestra, nessun errore. Su un
        // sito il cui unico obiettivo e' farsi contattare, e' il difetto
        // peggiore possibile — e non e' rilevabile da codice, perche' il
        // browser non dice se ha aperto qualcosa.
        //
        // La soluzione e' non dipendere dall'esito: il mailto parte comunque
        // per chi puo' usarlo, e in parallelo l'indirizzo finisce negli appunti
        // con un avviso visibile. Cosi' il click produce sempre un risultato.
        // ── Modulo di contatto ──────────────────────────────────────────────
        //
        // I pulsanti di contatto erano link mailto:. Funzionano solo per chi ha
        // un client di posta configurato: chi usa Gmail o Outlook dal browser —
        // la maggioranza — clicca e NON SUCCEDE NULLA. Nessuna finestra, nessun
        // errore, e nessun modo di accorgersene da codice, perche' il browser
        // non riporta l'esito di un mailto:. Su un sito il cui unico obiettivo
        // e' farsi contattare, era il difetto piu' costoso possibile.
        //
        // Ora c'e' un modulo che invia davvero, via /api/contact, dalla casella
        // Aruba del dominio. L'indirizzo resta visibile e copiabile per chi
        // preferisce scrivere dal proprio programma di posta.
        // ── Modulo Tally ────────────────────────────────────────────────────
        //
        // Alternativa al modulo interno: non richiede credenziali SMTP e da' ad
        // Andrea uno storico delle richieste con un cruscotto suo.
        //
        // Due scelte deliberate:
        //
        // 1. IFRAME NUDO, senza il loro embed.js. Caricare lo script di Tally
        //    imporrebbe di riaprire script-src nella CSP, che oggi non ammette
        //    nessuna origine esterna. Con il solo iframe basta frame-src, e
        //    l'unico servizio di embed.js che serviva davvero — l'altezza
        //    dinamica — si ottiene ascoltando da noi il suo postMessage.
        //
        // 2. MONTATO SOLO ALL'APERTURA. L'iframe esiste da quando questo
        //    componente e' in pagina, cioe' solo dopo un click sul pulsante di
        //    contatto. Chi naviga senza mai chiedere di scrivere non contatta
        //    Tally: nessuna richiesta a terzi prima di un'azione esplicita.
        const TallyForm = ({ formId, progetto, email }) => {
            const [altezza, setAltezza] = useState(520);
            const [caricato, setCaricato] = useState(false);
            const [fallito, setFallito] = useState(false);

            // Rete di sicurezza: se il modulo non si annuncia entro qualche
            // secondo — ID sbagliato, modulo cancellato, Tally non
            // raggiungibile — il visitatore vedrebbe un riquadro vuoto senza
            // capire perche'. Meglio mostrargli l'indirizzo email: la richiesta
            // di contatto non deve andare persa per un servizio che non
            // risponde.
            useEffect(() => {
                const t = setTimeout(() => setCaricato((c) => { if (!c) setFallito(true); return c; }), 7000);
                return () => clearTimeout(t);
            }, []);

            useEffect(() => {
                // Tally comunica l'altezza del contenuto via postMessage. Si
                // accetta solo da tally.so: un listener aperto a qualunque
                // origine sarebbe una porta per messaggi arbitrari.
                const onMsg = (e) => {
                    // L'iframe e' in sandbox, quindi vive in un'origine opaca e i
                    // suoi messaggi arrivano con origin "null", non
                    // "https://tally.so". Vanno accettati entrambi: con il solo
                    // controllo stretto nessun messaggio passava, e l'altezza
                    // restava bloccata al valore iniziale.
                    // Il rischio e' contenuto: si legge solo un numero, limitato
                    // a un intervallo, e la visibilita' del modulo NON dipende
                    // da questo messaggio ma dall'evento load dell'iframe.
                    if (e.origin !== 'https://tally.so' && e.origin !== 'null') return;
                    try {
                        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
                        const h = Number(d && (d.height || (d.payload && d.payload.height)));
                        if (Number.isFinite(h) && h > 200) setAltezza(Math.min(h, 1400));
                    } catch (err) { /* messaggio non nostro: si ignora */ }
                };
                window.addEventListener('message', onMsg);
                return () => window.removeEventListener('message', onMsg);
            }, []);

            // I parametri passati in query diventano campi nascosti nella
            // risposta: cosi' Andrea vede da quale progetto arriva la richiesta
            // senza doverlo chiedere.
            const qs = new URLSearchParams({
                alignLeft: '1', hideTitle: '1', transparentBackground: '1', dynamicHeight: '1',
                ...(progetto ? { progetto } : {}),
            });

            if (fallito) {
                return (
                    <div>
                        <p style={{ fontSize: '13px', marginBottom: '10px' }}>
                            Il modulo non si è caricato.
                        </p>
                        <p className="mono uline" style={{ fontSize: '10px', color: 'var(--mute)', lineHeight: 1.7 }}>
                            Scrivi direttamente a <a href={'mailto:' + email} style={{ color: 'var(--fg)' }}>{email}</a>:
                            la tua richiesta arriva comunque.
                        </p>
                    </div>
                );
            }

            return (
                <div style={{ position: 'relative', minHeight: '200px' }}>
                    {!caricato && <div className="mono uline" style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '10px', color: 'var(--mute)' }}>
                        Carico il modulo…
                    </div>}
                    <iframe
                        src={`https://tally.so/embed/${encodeURIComponent(formId)}?${qs}`}
                        title="Modulo di contatto"
                        // La visibilita' dipende dall'evento load nativo, non da
                        // un messaggio di Tally: un contratto di terzi che
                        // cambia non deve poter lasciare il modulo invisibile.
                        onLoad={() => setCaricato(true)}
                        loading="lazy"
                        // Il minimo necessario: inviare il modulo e aprire link.
                        // Senza allow-same-origin l'iframe resta in un'origine
                        // opaca e non puo' leggere nulla di questo sito.
                        // allow-same-origin fa mantenere all'iframe la SUA
                        // origine (tally.so). Non gli da' accesso a questo sito:
                        // resta comunque cross-origin e non puo' leggerne il DOM.
                        // Serve perche' senza di esso l'origine e' opaca e Tally
                        // non riesce a far funzionare i propri script interni.
                        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                        referrerPolicy="strict-origin-when-cross-origin"
                        style={{ width: '100%', height: altezza + 'px', border: 0,
                                 opacity: caricato ? 1 : 0, transition: 'opacity .25s' }}
                    />
                </div>
            );
        };

        const ContactModal = ({ email, oggetto, progetto, origine, onClose }) => {
            // Se l'ID Tally e' impostato nel pannello si usa quello, altrimenti
            // resta il modulo interno che invia via SMTP. Cambiare canale e'
            // quindi una modifica di un campo, non un deploy — utile se un
            // domani il piano gratuito di Tally cambia.
            const tallyId = String((S().contact && S().contact.tallyId) || '').trim();
            const [dati, setDati] = useState({ name: '', email: '', message: '', privacy: false, website: '' });
            const [stato, setStato] = useState('compila');   // compila | invio | inviato | errore
            const [errore, setErrore] = useState('');
            const [copiata, setCopiata] = useState(false);
            const apertoIl = useRef(Date.now());
            const box = useRef(null);
            const primoCampo = useRef(null);

            useEffect(() => {
                const esc = (e) => { if (e.key === 'Escape') onClose(); };
                document.addEventListener('keydown', esc);
                const overflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                if (primoCampo.current) primoCampo.current.focus();
                return () => {
                    document.removeEventListener('keydown', esc);
                    document.body.style.overflow = overflow;
                };
            }, []);

            const set = (k) => (e) => setDati((d) => ({
                ...d, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
            }));

            const copiaEmail = () => {
                const fatto = () => { setCopiata(true); setTimeout(() => setCopiata(false), 2400); };
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(email).then(fatto, fatto);
                    } else fatto();
                } catch (e) { fatto(); }
            };

            const invia = async (e) => {
                e.preventDefault();
                setErrore('');
                if (!dati.name.trim()) return setErrore('Scrivi il tuo nome.');
                if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(dati.email)) return setErrore('Controlla l’indirizzo email.');
                if (dati.message.trim().length < 10) return setErrore('Scrivi qualche parola in piu’ nel messaggio.');
                if (!dati.privacy) return setErrore('Serve la spunta sul trattamento dei dati.');

                setStato('invio');
                try {
                    const r = await fetch('/api/contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...dati,
                            subject: oggetto || 'Richiesta dal sito',
                            elapsed: Date.now() - apertoIl.current,
                        }),
                    });
                    const j = await r.json().catch(() => ({}));
                    if (!r.ok) { setStato('errore'); setErrore(j.error || 'Invio non riuscito.'); return; }
                    setStato('inviato');
                    track('contact_submit', { location: origine, ...(progetto ? { project_title: progetto } : {}) });
                } catch (err) {
                    setStato('errore');
                    setErrore('Sembra che manchi la connessione. Riprova, oppure scrivi direttamente all’indirizzo qui sotto.');
                }
            };

            const campo = { width: '100%', background: '#0d0d0d', border: '1px solid var(--line)',
                            color: 'var(--fg)', padding: '11px 12px', fontSize: '13px',
                            fontFamily: 'inherit', outline: 'none' };
            const etichetta = { fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase',
                                color: 'var(--mute)', display: 'block', marginBottom: '5px' };

            return (
                <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                     style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.86)',
                              display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                              padding: '24px', overflowY: 'auto' }}>
                    <div ref={box} role="dialog" aria-modal="true" aria-label="Contatta Andrea Onori" className="fade"
                         style={{ background: '#0a0a0a', border: '1px solid var(--line)', padding: '26px',
                                  width: '100%', maxWidth: '480px', marginTop: '4vh', marginBottom: '4vh' }}>
                        <div className="flex justify-between items-start" style={{ marginBottom: '18px' }}>
                            <div>
                                <div className="mono uline" style={{ fontSize: '9px', color: 'var(--accent)', marginBottom: '6px' }}>Contatto</div>
                                <div className="display" style={{ fontSize: '22px', lineHeight: 1.1, textTransform: 'uppercase' }}>
                                    {progetto || 'Scrivimi'}
                                </div>
                            </div>
                            <button onClick={onClose} aria-label="Chiudi" className="mono"
                                    style={{ background: 'none', border: 'none', color: 'var(--mute)',
                                             fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '0 0 0 12px' }}>✕</button>
                        </div>

                        {tallyId ? (
                            <TallyForm formId={tallyId} progetto={progetto} email={email} />
                        ) : stato === 'inviato' ? (
                            <div>
                                <p style={{ fontSize: '14px', marginBottom: '10px' }}>Messaggio inviato.</p>
                                <p className="mono uline" style={{ fontSize: '10px', color: 'var(--mute)', lineHeight: 1.7 }}>
                                    Ti risponderò appena possibile, all&rsquo;indirizzo che hai indicato.
                                </p>
                                <button onClick={onClose} className="btn-secondary" style={{ marginTop: '20px', cursor: 'pointer' }}>Chiudi</button>
                            </div>
                        ) : (
                            <form onSubmit={invia} noValidate>
                                <div style={{ marginBottom: '14px' }}>
                                    <label className="mono" style={etichetta} htmlFor="c-nome">Nome</label>
                                    <input id="c-nome" ref={primoCampo} style={campo} value={dati.name}
                                           onChange={set('name')} maxLength={100} autoComplete="name" required />
                                </div>
                                <div style={{ marginBottom: '14px' }}>
                                    <label className="mono" style={etichetta} htmlFor="c-mail">Email</label>
                                    <input id="c-mail" type="email" style={campo} value={dati.email}
                                           onChange={set('email')} maxLength={254} autoComplete="email" required />
                                </div>
                                <div style={{ marginBottom: '14px' }}>
                                    <label className="mono" style={etichetta} htmlFor="c-msg">Messaggio</label>
                                    <textarea id="c-msg" style={{ ...campo, minHeight: '120px', resize: 'vertical', lineHeight: 1.5 }}
                                              value={dati.message} onChange={set('message')} maxLength={4000} required />
                                </div>

                                {/* Honeypot: invisibile a una persona, compilato dai bot.
                                    aria-hidden e tabIndex lo tengono fuori anche da
                                    screen reader e navigazione da tastiera. */}
                                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
                                    <label htmlFor="c-website">Sito web</label>
                                    <input id="c-website" tabIndex={-1} autoComplete="off"
                                           value={dati.website} onChange={set('website')} />
                                </div>

                                <label style={{ display: 'flex', gap: '9px', alignItems: 'flex-start',
                                                fontSize: '11px', color: 'var(--mute)', lineHeight: 1.5,
                                                marginBottom: '16px', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={dati.privacy} onChange={set('privacy')}
                                           style={{ marginTop: '2px', accentColor: 'var(--accent)' }} required />
                                    <span>Ho letto l&rsquo;<a href="/privacy" target="_blank" rel="noopener"
                                          style={{ color: 'var(--fg)' }}>informativa privacy</a> e acconsento al
                                          trattamento dei miei dati per ricevere una risposta.</span>
                                </label>

                                {errore && <p className="mono" role="alert" style={{ fontSize: '10px', color: 'var(--accent)',
                                              marginBottom: '12px', lineHeight: 1.6 }}>{errore}</p>}

                                <button type="submit" disabled={stato === 'invio'} className="btn-primary"
                                        style={{ display: 'inline-flex', cursor: stato === 'invio' ? 'default' : 'pointer',
                                                 opacity: stato === 'invio' ? 0.6 : 1 }}>
                                    <span>{stato === 'invio' ? 'Invio…' : 'Invia messaggio'}</span>
                                    {stato !== 'invio' && <span className="arrow">→</span>}
                                </button>
                            </form>
                        )}

                        {/* L'indirizzo resta comunque disponibile: chi preferisce il
                            proprio programma di posta non deve passare dal modulo. */}
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
                            <div className="mono uline" style={{ fontSize: '9px', color: 'var(--mute)', marginBottom: '6px' }}>Oppure scrivi a</div>
                            <button onClick={copiaEmail} className="mono" title="Copia l'indirizzo"
                                    style={{ background: 'none', border: 'none', padding: 0, color: 'var(--fg)',
                                             fontSize: '12px', cursor: 'pointer', wordBreak: 'break-all' }}>
                                {email}
                            </button>
                            <span className="mono" role="status" aria-live="polite"
                                  style={{ fontSize: '9px', color: 'var(--accent)', marginLeft: '8px' }}>
                                {copiata ? 'copiata' : ' '}
                            </span>
                        </div>
                    </div>
                </div>
            );
        };

        // Bottone di contatto "a due piani": sopra CONTACT ME (ctaPrimary),
        // sotto un pallino verde e STAND BY (ctaIdle); col mouse sopra il
        // pallino diventa rosso e lampeggia e la scritta diventa REC
        // (ctaHover), come una camera che registra. Apre il modulo di
        // contatto. Stile in .cbtn (index.html).
        const ContactButton = ({ onOpen }) => {
            const p = S().profile;
            if (!(p.ctaPrimary && p.ctaEmail)) return null;
            return (
                <button type="button" className="cbtn" aria-label={p.ctaPrimary} onClick={onOpen}>
                    <span className="cbtn-top"><span>{p.ctaPrimary}</span></span>
                    <span className="cbtn-bot" aria-hidden="true">
                        <i className="cbtn-dot"></i>
                        <span className="cbtn-idle">{p.ctaIdle}</span>
                        <span className="cbtn-hover">{p.ctaHover || p.ctaIdle}</span>
                    </span>
                </button>
            );
        };
        const hasSeries = () => Boolean(M().series && M().series.length);

        // onContact: apre il modulo di contatto, il cui stato sta in App (uno
        // solo per il bottone dell'intestazione e per quello delle storie).
        const ProfileHeader = ({ onContact }) => {
            const p = S().profile;
            const conCta = (p.ctaPrimary && p.ctaEmail) || p.ctaSecondary;
            return (
            <div>
                <div className="flex flex-col md:flex-row gap-10 md:gap-12 items-start mb-14 md:mb-10">
                    {/* Intestazione: niente foto profilo, il nome riempie la
                        riga; sotto, la scritta. Il bottone di contatto sta qui
                        da telefono; da computer sta sulla riga delle storie
                        (.cta-narrow), o qui a destra se non ci sono storie. Le
                        righe handle e disciplines si vedono solo se piene. */}
                    <div className={'profile-main flex-1 w-full' + (hasSeries() ? ' with-stories' : '')}>
                        <h1 className="display profile-name">
                            <span className="reveal-line d1"><span>{p.nameFirst}</span></span>{' '}
                            <span className="reveal-line d2"><span>{p.nameLast}</span></span>
                        </h1>

                        <div className="profile-lines">
                            {p.eyebrow && <div className="mono uline" style={{ color: 'var(--mute)', fontSize: '10px' }}>
                                {p.eyebrow}
                            </div>}

                            {p.handle && <p className="mono uline" style={{ color: 'var(--mute)', fontSize: '11px' }}>
                                {p.handle}
                            </p>}

                            {p.disciplines && <p className="grot uline" style={{ fontSize: '13px', fontWeight: 500 }}>{p.disciplines}</p>}

                            {/* Svuotare un campo dal pannello toglie il testo dal sito
                                (è voluto), ma un indirizzo vuoto non deve lasciare in
                                piedi un link rotto: href="" ricarica la pagina e
                                "mailto:" apre il client di posta senza destinatario.
                                Senza indirizzo il testo resta, il link no. */}
                            {p.siteLabel && (p.siteUrl
                                ? <a href={p.siteUrl}
                                     className="mono uline inline-block" style={{ fontSize: '11px', borderBottom: '1px solid var(--fg)', paddingBottom: '2px' }}>
                                    {p.siteLabel}
                                  </a>
                                : <span className="mono uline inline-block" style={{ fontSize: '11px' }}>{p.siteLabel}</span>)}
                        </div>

                        {conCta && <div className={'profile-ctas flex gap-3 md:gap-2 flex-wrap' + (hasSeries() ? ' cta-narrow' : ' cta-solo')}>
                            {/* Apre il modulo, non un link mailto: — vedi il
                                commento su ContactModal. */}
                            <ContactButton onOpen={onContact} />
                            {p.ctaSecondary && <button className="btn-secondary">
                                <span className="pulse-dot"></span>
                                {p.ctaSecondary}
                            </button>}
                        </div>}
                    </div>
                </div>
            </div>
            );
        };

        // La sezione ABOUT non è più renderizzata: il testo vive nel blocco
        // <section class="visually-hidden"> in fondo al <body> e nel JSON-LD,
        // entrambi generati da scripts/prerender.mjs dal campo "Descrizione per
        // SEO & Motori AI" del pannello. Nessun visitatore lo vede, Google e i
        // motori generativi sì.

        // Clean empty-state shown when a section has no media (e.g. media.json
        // failed to load). No Unsplash, no fake data — just a neutral notice.
        const EmptyState = ({ section }) => (
            <div className="mono uline" style={{
                color: 'var(--mute)', fontSize: '11px', textAlign: 'center',
                padding: '64px 16px', border: '1px dashed var(--line)',
            }}>
                {String(S().sections.empty || '').replace('{SECTION}', section)}
            </div>
        );

        // Series
        const Series = ({ onClick, onContact }) => {
            const series = (M().series && M().series.length) ? M().series : [];
            if (!series.length) return null;
            const { seriesTitle, seriesUnit } = S().sections;
            return (
                <div className="mb-12">
                    {/* Titolo e unità vuoti nel pannello = niente riga sopra i
                        cerchi (versione 1). */}
                    {(seriesTitle || seriesUnit) && (
                        <div className="flex items-baseline justify-between mb-5 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
                            <div className="mono uline" style={{ fontSize: '10px' }}>{seriesTitle}</div>
                            <div className="mono uline" style={{ color: 'var(--mute)', fontSize: '9px' }}>{String(series.length).padStart(2,'0')} {seriesUnit}</div>
                        </div>
                    )}
                    {/* Da computer il bottone di contatto sta a destra dei
                        cerchi, centrato su di loro; da telefono e' sotto la
                        scritta dell'intestazione (.cta-wide / .cta-narrow). */}
                    <div className="series-row">
                    <div className="series-strip flex gap-7 overflow-x-auto pb-2">
                        {series.map((s, i) => (
                            <div key={s.id} className="flex flex-col items-center gap-3 flex-shrink-0 cursor-pointer" role="button" tabIndex={0} aria-label={s.label} onClick={() => onClick(s)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(s); } }}>
                                <div className="series-circle">
                                    <img src={normMedia(s.image).image || firstImageOf((s.images || []).map(normMedia)) || ''} alt={S().seo.author ? `${s.label} — series by ${S().seo.author}` : s.label} loading="lazy" decoding="async" />
                                </div>
                                <div className="text-center">
                                    <div className="mono uline" style={{ fontSize: '9px' }}>{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {onContact && <div className="series-cta cta-wide"><ContactButton onOpen={onContact} /></div>}
                    </div>
                </div>
            );
        };

        // Tabs
        // Le chiavi ('FEED'/'MOTION'/'INDEX') restano interne: rinominare una
        // tab dal pannello cambia l'etichetta, non la logica né gli eventi GA4.
        // INDEX non si mostra dalla versione 1 e MOTION dal 25/10/2026
        // (decisioni di Andrea). IndexView, MotionGrid e i dati restano: per
        // riattivarle basta rimetterle in questa lista. Con una tab sola la
        // barra delle tab non compare e il feed parte subito.
        const TAB_KEYS = ['FEED'];
        const tabLabel = (k) => ({
            FEED: S().sections.tabFeed,
            MOTION: S().sections.tabMotion,
            INDEX: S().sections.tabIndex,
        }[k] || k);

        const Tabs = ({ active, setActive }) => {
            const tabs = TAB_KEYS;
            const refs = useRef([]);
            const [ind, setInd] = useState({ left: 0, width: 0 });

            useEffect(() => {
                const idx = tabs.indexOf(active);
                const el = refs.current[idx];
                if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
            }, [active]);

            return (
                <div className="mb-10 relative" style={{ borderTop: '1px solid var(--line-strong)', borderBottom: '1px solid var(--line)' }}>
                    <div className="flex">
                        {tabs.map((t, i) => (
                            <button
                                key={t}
                                ref={(el) => (refs.current[i] = el)}
                                className={`tab-btn ${active === t ? 'active' : ''}`}
                                onClick={() => setActive(t)}
                            >
                                {tabLabel(t)}
                            </button>
                        ))}
                    </div>
                    <div className="tab-indicator" style={{ left: `${ind.left}px`, width: `${ind.width}px` }}></div>
                </div>
            );
        };

        // Badge ▶ mostrato sulle celle che contengono un video esterno
        // Link esterno di una slide del carosello (es. il film intero su
        // YouTube): bottoncino in alto a sinistra, si apre in una nuova scheda.
        const SlideLink = ({ slide }) => slide && slide.link ? (
            <a className="slide-link mono" href={slide.link} target="_blank" rel="noopener"
               onClick={(e) => { e.stopPropagation(); track('slide_link_click', { link_url: slide.link }); }}>
                {slide.linkLabel || 'Watch on YouTube ↗'}
            </a>
        ) : null;

        // lowered: la cella ha un logo al centro, il simbolo play scende sotto.
        const PlayBadge = ({ lowered }) => (
            <div className={'motion-play' + (lowered ? ' under-logo' : '')}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>
            </div>
        );

        // Video senza copertina: la src viene assegnata solo quando la cella si
        // avvicina allo schermo, così ad apertura pagina non si scarica nulla.
        // (Con la copertina impostata non serve: si mostra la foto e basta.)
        const LazyFrame = ({ video, alt }) => {
            const ref = useRef(null);
            const [show, setShow] = useState(false);
            useEffect(() => {
                const el = ref.current;
                if (!el || show) return;
                if (typeof IntersectionObserver === 'undefined') { setShow(true); return; }
                const io = new IntersectionObserver((entries) => {
                    if (entries.some(e => e.isIntersecting)) { setShow(true); io.disconnect(); }
                }, { rootMargin: '200px' });
                io.observe(el);
                return () => io.disconnect();
            }, [show]);
            return (
                <div ref={ref} style={{ width: '100%', height: '100%', background: '#0d0d0d' }}>
                    {show && !isEmbedUrl(video) && <video src={video} muted playsInline preload="metadata" tabIndex={-1}
                        aria-label={alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
            );
        };

        // Cella della griglia: mostra la copertina (leggera). Senza copertina
        // ricade sul primo fotogramma del video, caricato in lazy.
        const GridMedia = ({ image, video, alt }) => (
            image
                ? <img src={image} alt={alt || altImg({})} loading="lazy" decoding="async" />
                : video
                    ? <LazyFrame video={video} alt={alt} />
                    : <div style={{ width: '100%', height: '100%', background: '#0d0d0d' }} />
        );

        // Copertina della cella (campo "Copertina" del pannello), separata dal
        // carosello: spesso una WebP animata lo-fi piccola (272×340). Quando il
        // browser deve ingrandirla prende la classe .pixel, cioe' pixel netti
        // invece della sfocatura; una foto grande, che viene rimpicciolita,
        // resta morbida. Il confronto e' in pixel reali dello schermo, quindi
        // vale anche su un telefono che a 375px ha tre pixel per punto.
        // Chi ha chiesto al sistema meno movimento vede il fermo immagine
        // (coverPoster), se c'e'.
        const CoverImg = ({ src, still, alt }) => {
            const ref = useRef(null);
            const [pixel, setPixel] = useState(false);
            const misura = () => {
                const el = ref.current;
                if (!el || !el.naturalWidth || !el.clientWidth) return;
                const scala = Math.max(el.clientWidth / el.naturalWidth, el.clientHeight / el.naturalHeight)
                    * (window.devicePixelRatio || 1);
                setPixel(scala > 1);
            };
            useEffect(() => {
                const el = ref.current;
                if (!el || typeof ResizeObserver === 'undefined') return;
                const ro = new ResizeObserver(misura);
                ro.observe(el);
                return () => ro.disconnect();
            }, []);
            return (
                <picture>
                    {still && <source media="(prefers-reduced-motion: reduce)" srcSet={still} />}
                    <img ref={ref} src={src} alt={alt} className={pixel ? 'pixel' : undefined}
                        loading="lazy" decoding="async" onLoad={misura} />
                </picture>
            );
        };

        // Showreel a tutto schermo come sfondo della home (H7). Il video sta
        // fisso dietro alla prima schermata (nome, storie, bottone) e allo
        // spazio vuoto sotto; scorrendo, il pannello con tab e feed sale e lo
        // copre (vedi App e .hero-* in index.html). settings.feedReel, dal
        // pannello: serve un file video diretto, del sito o di Bunny
        // (…b-cdn.net/<id>/play_1080p.mp4). Il link Embed di Bunny e' una
        // pagina da incorporare e un <video> non sa riprodurla: in quel caso
        // lo sfondo non c'e', come senza video.
        // videoVertical / posterVertical (opzionali): versione verticale per
        // gli schermi stretti o verticali.
        const isDirectVideo = (u) => Boolean(String(u || '').trim()) && !isEmbedUrl(String(u).trim());
        const hasFeedReel = () => isDirectVideo((S().feedReel || {}).video);
        // Schermo verticale o stretto: larghezza < 768px oppure piu' alto che largo.
        const isNarrowScreen = () => window.innerWidth < 768 || window.innerHeight > window.innerWidth;
        const HeroReel = React.forwardRef(({ veilRef, labelRef }, ref) => {
            const r = S().feedReel || {};
            const [narrow, setNarrow] = useState(isNarrowScreen);
            useEffect(() => {
                // Girando il telefono o ridimensionando la finestra si sceglie di
                // nuovo la versione giusta, senza ricaricare.
                const on = () => setNarrow(isNarrowScreen());
                window.addEventListener('resize', on);
                window.addEventListener('orientationchange', on);
                return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
            }, []);
            const vertical = narrow && isDirectVideo(r.videoVertical);
            const video = String((vertical ? r.videoVertical : r.video) || '').trim();
            const poster = (vertical ? (r.posterVertical || r.poster) : r.poster) || '';
            // Chi ha chiesto al sistema meno movimento vede il poster fermo.
            const calmo = typeof window.matchMedia === 'function'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            useEffect(() => {
                const v = ref && ref.current;
                if (!v || calmo) return;
                // React imposta muted come proprieta', non come attributo, e
                // Safari su iPhone guarda l'attributo per concedere l'autoplay.
                v.muted = true;
                v.setAttribute('muted', '');
                v.setAttribute('playsinline', '');
                v.setAttribute('webkit-playsinline', '');
                // iPhone con il risparmio energetico (e alcuni browser) bloccano
                // ogni video automatico, anche muto: play() viene rifiutato.
                // In quel caso il video parte al primo tocco sulla pagina.
                const EVENTI = ['touchend', 'pointerup', 'click', 'keydown'];
                const riprova = () => {
                    const pr = v.play();
                    if (pr && typeof pr.then === 'function') pr.then(stacca, () => {});
                };
                const stacca = () => EVENTI.forEach((e) => document.removeEventListener(e, riprova, true));
                const pr = v.play();
                if (pr && typeof pr.catch === 'function') {
                    pr.catch(() => EVENTI.forEach((e) => document.addEventListener(e, riprova, { capture: true, passive: true })));
                }
                return stacca;
            }, [video]);
            return (
                <div className="hero-reel" aria-hidden="true">
                    {calmo && poster
                        ? <img src={poster} alt="" />
                        : <video ref={ref} key={video} src={video} poster={poster || undefined}
                            autoPlay={!calmo} muted loop playsInline
                            preload={calmo ? 'metadata' : 'auto'} />}
                    <div ref={veilRef} className="hero-veil"></div>
                    {r.label && <div ref={labelRef} className="hero-reel-label mono uline">{r.label}</div>}
                </div>
            );
        });

        // Feed Grid — uniform 4:5 cells on every breakpoint (no bento, no mixed ratios, no holes)
        const FeedGrid = ({ onClick }) => {
            const images = (M().feed && M().feed.length) ? M().feed : [];
            if (!images.length) return <EmptyState section="FEED" />;

            return (
                <>
                <div className="grid grid-cols-3 feed-grid">
                    {images.map((img, i) => {
                        const slides = slidesOf(img);
                        return (
                        <div key={i} className="feed-item" style={{ aspectRatio: '4 / 5' }} role="button" tabIndex={0} aria-label={altOf(img)} onClick={() => onClick(i, images)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(i, images); } }}>
                            {/* Celle pulite: niente simbolo play ne' icona del
                                carosello, le copertine sono disegnate e le
                                coprirebbero. Che il post abbia piu' slide o un
                                video lo dice la scheda. Resta solo il marchio AI,
                                che e' una dichiarazione. Nella tab Motion il
                                simbolo play resta. */}
                            {img.ai && (
                                <div className="cell-badges">
                                    <span className="ai-mark">{S().post.aiShort}</span>
                                </div>
                            )}
                            {img.cover
                                ? <CoverImg src={img.cover} still={img.coverPoster} alt={altOf(img)} />
                                : <GridMedia image={firstPhotoOf(slides)} video={firstVideoOf(slides)} alt={altOf(img)} />}
                            {/* Logo del brand sopra la copertina: decorativo per chi
                                usa uno screen reader, il cliente e' gia' nell'etichetta
                                della cella. */}
                            {img.logo && <img className="feed-logo" src={img.logo} alt="" loading="lazy" decoding="async" />}
                            {/* In hover: titolo a sinistra, cliente a destra (senza
                                cliente, o se il titolo lo dice gia', l'anno).
                                Niente luogo. */}
                            <div className="feed-meta">
                                <div style={{ fontSize: '11px' }}>{img.title}</div>
                                <div style={{ textAlign: 'right', color: 'var(--mute)' }}>
                                    {brandOf(img) || creditValue(img, 'YEAR') || img.year}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
                </>
            );
        };

        const MotionGrid = ({ onClick }) => {
            const items = (M().motion && M().motion.length) ? M().motion : [];
            if (!items.length) return <EmptyState section="MOTION" />;
            return (
                <div className="grid grid-cols-3 feed-grid">
                    {items.map((raw, i) => {
                        const m = normMedia(raw);
                        const derived = titleFromFilename(m.image || m.video);
                        const label = m.title || derived || `${S().sections.motionPrefix}${String(i+1).padStart(3,'0')}`;
                        const alt = S().seo.author ? `${label} — motion still by ${S().seo.author}` : label;
                        return (
                        <div key={i} className="feed-item" style={{ aspectRatio: '9/16' }} role="button" tabIndex={0}
                            aria-label={m.video ? `Riproduci ${label}` : label}
                            onClick={() => { track('motion_play', { reel_label: label, reel_index: i + 1 }); onClick(raw); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(raw); } }}>
                            <GridMedia image={m.image} video={m.video} alt={alt} />
                            {/* Logo del brand, come nel feed: decorativo, il nome e'
                                gia' nell'etichetta della cella. */}
                            {raw && raw.logo && <img className="feed-logo" src={raw.logo} alt="" loading="lazy" decoding="async" />}
                            {m.video && <PlayBadge lowered={!!(raw && raw.logo)} />}
                            <div className="feed-meta">
                                <div style={{ fontSize: '10px' }}>{label}</div>
                                <div style={{ color: 'var(--mute)' }}>{m.video ? S().post.play : S().sections.motionYear}</div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            );
        };

        // Fullscreen viewer for a MOTION item — plays real videos, shows images otherwise
        const MotionViewer = ({ item, onClose }) => {
            const m = normMedia(item);
            // Video Bunny: il riquadro ha la forma del video (di solito 9:16) e
            // non e' mai piu' alto dell'88% dello schermo.
            const r = m.video && isEmbedUrl(m.video) ? videoRatio(m, 9 / 16) : 0;
            useEffect(() => {
                document.body.style.overflow = 'hidden';
                const onKey = (e) => { if (e.key === 'Escape') onClose(); };
                window.addEventListener('keydown', onKey);
                return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
            }, [onClose]);
            return (
                <>
                <button className="modal-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div className="modal-overlay" onClick={onClose}>
                    <div onClick={e => e.stopPropagation()} style={r
                            ? { width: `min(100%, calc(88vh * ${r}))`, display: 'flex' }
                            : { width: '100%', maxWidth: '440px', maxHeight: '88vh', display: 'flex' }}>
                        {m.video
                            ? <Player src={m.video} poster={m.image} titolo={m.title}
                                      style={r
                                          ? { width: '100%', aspectRatio: String(r), height: 'auto', background: '#000' }
                                          : { width: '100%', height: isEmbedUrl(m.video) ? '88vh' : undefined,
                                              maxHeight: '88vh', objectFit: 'contain', background: '#000' }} />
                            : <img src={m.image} alt={m.title || ''} style={{ width: '100%', maxHeight: '88vh', objectFit: 'contain' }} />}
                    </div>
                </div>
                </>
            );
        };

        const IndexView = ({ onClick }) => {
            const projects = (M().index && M().index.length) ? M().index : [];
            if (!projects.length) return <EmptyState section="INDEX" />;
            return (
                <div className="max-w-4xl mx-auto">
                    <div className="mono uline mb-6 pb-3" style={{ fontSize: '10px', color: 'var(--mute)', borderBottom: '1px solid var(--line-strong)' }}>
                        <div className="grid items-center" style={{ gridTemplateColumns: '50px 1fr 160px 90px 30px', gap: '24px' }}>
                            <div>{S().sections.indexNo}</div>
                            <div>{S().sections.indexTitle}</div>
                            <div className="hide-mobile">{S().sections.indexLocation}</div>
                            <div className="hide-mobile">{S().sections.indexYear}</div>
                            <div></div>
                        </div>
                    </div>
                    {projects.map((p, i) => (
                        <div key={i} className="index-row" onClick={() => onClick(i, projects)}>
                            <div style={{ color: 'var(--mute)' }}>{p.num}</div>
                            <div>/&nbsp; {p.title}</div>
                            <div className="hide-mobile" style={{ color: 'var(--mute)' }}>{p.location}</div>
                            <div className="hide-mobile" style={{ color: 'var(--mute)' }}>{p.year}</div>
                            <div className="text-right index-arrow">→</div>
                        </div>
                    ))}
                </div>
            );
        };

        // Story viewer
        const StoryViewer = ({ series, onClose }) => {
            const [current, setCurrent] = useState(0);
            const [progress, setProgress] = useState(0);
            const [paused, setPaused] = useState(false);
            const intervalRef = useRef(null);
            const rawSlides = (series.images && series.images.length) ? series.images : (series.image ? [series.image] : []);
            // Schermo largo e orizzontale (>= 768px e piu' largo che alto): le
            // slide con una versione orizzontale (videoWide) usano quella.
            const wideQuery = '(min-width: 768px) and (orientation: landscape)';
            const [wide, setWide] = useState(() => window.matchMedia(wideQuery).matches);
            useEffect(() => {
                const mq = window.matchMedia(wideQuery);
                const on = () => setWide(mq.matches);
                mq.addEventListener('change', on);
                return () => mq.removeEventListener('change', on);
            }, []);
            const slides = rawSlides.map(normMedia).filter(s => s.image || s.video)
                .map(s => (wide && s.video && s.videoWide)
                    ? { ...s, video: s.videoWide, image: s.posterWide || s.image, ratio: s.ratioWide || '16/9' }
                    : s);
            const cur = slides[current] || {};
            const goNext = () => { if (current < slides.length - 1) { setCurrent(current + 1); setProgress(0); } else onClose(); };
            const goPrev = () => { if (current > 0) { setCurrent(current - 1); setProgress(0); } };

            // Lock background scroll while the story viewer is open.
            useEffect(() => {
                document.body.style.overflow = 'hidden';
                return () => { document.body.style.overflow = ''; };
            }, []);

            useEffect(() => {
                if (!slides.length) return;
                // Le slide video avanzano da sole a fine riproduzione (onEnded):
                // il timer automatico resta fermo.
                if (cur.video) return;
                if (!paused) {
                    intervalRef.current = setInterval(() => {
                        setProgress(prev => {
                            if (prev >= 100) {
                                if (current < slides.length - 1) {
                                    setCurrent(current + 1);
                                    return 0;
                                } else { onClose(); return 100; }
                            }
                            return prev + 2;
                        });
                    }, 100);
                }
                return () => intervalRef.current && clearInterval(intervalRef.current);
            }, [current, paused]);

            useEffect(() => {
                const onKey = (e) => {
                    if (e.key === 'Escape') onClose();
                    if (e.key === 'ArrowRight' && current < slides.length - 1) { setCurrent(current + 1); setProgress(0); }
                    if (e.key === 'ArrowLeft' && current > 0) { setCurrent(current - 1); setProgress(0); }
                };
                window.addEventListener('keydown', onKey);
                return () => window.removeEventListener('keydown', onKey);
            }, [current]);

            if (!slides.length) return null;

            return (
                <div className="story-viewer">
                    <div className="progress-bars">
                        {slides.map((_, i) => (
                            <div key={i} className="progress-bar">
                                <div className="progress-fill" style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }}></div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center px-5 pb-2 mono uline" style={{ fontSize: '10px' }}>
                        <div>{series.label} &nbsp;·&nbsp; {String(current + 1).padStart(2,'0')}/{String(slides.length).padStart(2,'0')}</div>
                        <button onClick={onClose} aria-label="Close" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.35)', color: 'var(--fg)', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>✕</button>
                    </div>
                    <div className="story-content">
                        {cur.video ? (
                            // Slide video: niente aree di navigazione a tutto schermo,
                            // altrimenti coprirebbero i controlli del player.
                            <>
                                <button className="carousel-arrow" style={{ left: '12px' }} onClick={goPrev} disabled={current === 0} aria-label="Precedente">‹</button>
                                <button className="carousel-arrow" style={{ right: '12px' }} onClick={goNext} aria-label="Successiva">›</button>
                                <Player key={cur.video} src={cur.video} poster={cur.image}
                                    onTimeUpdate={(e) => { const v = e.target; if (v.duration) setProgress(Math.min(100, (v.currentTime / v.duration) * 100)); }}
                                    onEnded={goNext}
                                    style={isEmbedUrl(cur.video) && videoRatio(cur, 9 / 16)
                                        ? { ...fitStyle(videoRatio(cur, 9 / 16), '82vh'), background: '#000' }
                                        : { maxWidth: '100%', height: isEmbedUrl(cur.video) ? '82vh' : undefined,
                                            maxHeight: '82vh', background: '#000' }} />
                            </>
                        ) : (
                            <>
                                <div className="story-nav-area story-nav-prev" onClick={goPrev}
                                    onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)} onMouseLeave={() => setPaused(false)}></div>
                                <div className="story-nav-area story-nav-next" onClick={goNext}
                                    onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)} onMouseLeave={() => setPaused(false)}></div>
                                <img src={cur.image} alt={series.label || ''} style={{ maxWidth: '100%', maxHeight: '82vh', objectFit: 'contain' }} />
                            </>
                        )}
                    </div>
                </div>
            );
        };

        // Crediti sotto il titolo della scheda: etichetta grigia, valore bianco,
        // mono, i valori in colonna (.post-credits in index.html). Un post senza
        // crediti mostra anno e formato dai suoi campi, come prima ma senza il
        // luogo.
        const PostCredits = ({ post }) => {
            const rows = creditsOf(post) || [
                { label: S().post.year, value: post.year },
                { label: S().post.format, value: post.film },
            ].filter((r) => String(r.value || '').trim());
            if (!rows.length) return null;
            return (
                <dl className="post-credits mono uline">
                    {rows.map((r, i) => (
                        <React.Fragment key={i}>
                            <dt>{r.label}</dt>
                            <dd>{r.value}</dd>
                        </React.Fragment>
                    ))}
                </dl>
            );
        };

        // Modal post — carosello di foto E video all'interno di un singolo post
        const PostModal = ({ idx, images, onClose, onNext, onPrev }) => {
            const [formAperto, setFormAperto] = useState(false);
            const post = images[idx] || {};
            const photos = slidesOf(post);
            const [photo, setPhoto] = useState(0);
            const slide = photos[photo] || {};

            // Reset to the first photo whenever we switch post.
            useEffect(() => { setPhoto(0); }, [idx]);

            // Lock background scroll while the modal is open.
            useEffect(() => {
                document.body.style.overflow = 'hidden';
                return () => { document.body.style.overflow = ''; };
            }, []);

            useEffect(() => {
                const onKey = (e) => {
                    if (e.key === 'Escape') onClose();
                    else if (e.key === 'ArrowRight') setPhoto(p => Math.min(p + 1, photos.length - 1));
                    else if (e.key === 'ArrowLeft') setPhoto(p => Math.max(p - 1, 0));
                };
                window.addEventListener('keydown', onKey);
                return () => window.removeEventListener('keydown', onKey);
            }, [onClose, idx, photos.length]);

            const multi = photos.length > 1;

            return (
                <>
                <button className="modal-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
                <div className="modal-overlay" onClick={onClose}>
                    <div className="max-w-6xl w-full flex flex-col md:flex-row gap-10 items-start" onClick={e => e.stopPropagation()}>
                        <div className="flex-1 max-w-3xl" style={{ position: 'relative', width: '100%' }}>
                            {/* Foto, video e iframe stanno in un riquadro che da
                                desktop e' alto 76vh per tutti, cosi' cambiando slide
                                titolo e pallini non si spostano. Un video Bunny prende
                                le proporzioni vere del video, centrato in quel palco:
                                i controlli stanno sul video. */}
                            {/* Con un link esterno la slide sta in un riquadro che
                                ha la forma della foto o del video, cosi' il bottoncino
                                in alto a sinistra sta sopra l'immagine e non sulle
                                bande nere. */}
                            {slide.video && isEmbedUrl(slide.video) && videoRatio(slide, 16 / 9)
                                ? <div className="post-stage">
                                      {slide.link
                                          ? <div className="slide-linkbox" style={fitStyle(videoRatio(slide, 16 / 9), '76vh')}>
                                                <Player key={slide.video} src={slide.video} poster={slide.image}
                                                    titolo={slide.title || post.title}
                                                    style={{ width: '100%', height: '100%' }} />
                                                <SlideLink slide={slide} />
                                            </div>
                                          : <Player key={slide.video} src={slide.video} poster={slide.image}
                                                titolo={slide.title || post.title}
                                                style={fitStyle(videoRatio(slide, 16 / 9), '76vh')} />}
                                  </div>
                                : slide.link
                                    ? <div className="post-stage">
                                          <div className="slide-linkbox fit">
                                              {slide.video
                                                  ? <Player key={slide.video} src={slide.video} poster={slide.image} titolo={slide.title || post.title} className="post-media" />
                                                  : <img key={slide.image} src={slide.image} alt={altOf(post)} className="post-fit" decoding="async" />}
                                              <SlideLink slide={slide} />
                                          </div>
                                      </div>
                                    : slide.video
                                        ? <Player key={slide.video} src={slide.video} poster={slide.image} titolo={slide.title || post.title} className="post-media" />
                                        : <img src={slide.image} alt={altOf(post)} className="post-media" loading="lazy" decoding="async" />}
                            {multi && (
                                <>
                                    <button className="carousel-arrow" style={{ left: '12px' }} onClick={() => setPhoto(p => Math.max(p - 1, 0))} disabled={photo === 0} aria-label="Previous photo">‹</button>
                                    <button className="carousel-arrow" style={{ right: '12px' }} onClick={() => setPhoto(p => Math.min(p + 1, photos.length - 1))} disabled={photo === photos.length - 1} aria-label="Next photo">›</button>
                                    {/* Pallini fuori dal riquadro, sotto: stessa posizione
                                        per foto e video, e non coprono i controlli del player. */}
                                    <div className="post-dots">
                                        {photos.map((s, i) => (
                                            <button key={i} onClick={() => setPhoto(i)} aria-label={(s.video ? 'Video ' : 'Foto ') + (i + 1)}
                                                style={{ width: i === photo ? '18px' : '6px', height: '6px', borderRadius: '3px', padding: 0, border: 'none', cursor: 'pointer', background: i === photo ? 'var(--fg)' : (s.video ? 'var(--accent)' : 'rgba(255,255,255,0.45)'), transition: 'width .25s var(--ease-out), background .25s var(--ease-out)' }} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="post-info w-full md:w-80 space-y-6">
                            <div className="mono uline" style={{ fontSize: '10px', color: 'var(--mute)' }}>
                                {String(idx + 1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}
                                {multi && <span> &nbsp;·&nbsp; {S().post.carousel} {photos.length}</span>}
                                {photos.some(s => s.video) && <span style={{ color: 'var(--accent)' }}> &nbsp;·&nbsp; {S().post.video}</span>}
                            </div>
                            <h2 className="display" style={{ fontSize: '32px' }}>{post.title}</h2>
                            {/* Dicitura "Contenuto Enhanced con AI": compare solo
                                se la spunta è attiva sul post nel pannello. */}
                            {post.ai && <p className="ai-tag">{S().post.aiLabel}</p>}
                            <PostCredits post={post} />
                            <div className="flex gap-6 pt-4">
                                <button onClick={onPrev} className="mono uline" style={{ background:'none', border:'none', color:'var(--fg)', cursor:'pointer', fontSize:'10px' }}>{S().post.prev}</button>
                                <button onClick={onNext} className="mono uline" style={{ background:'none', border:'none', color:'var(--fg)', cursor:'pointer', fontSize:'10px' }}>{S().post.next}</button>
                            </div>
                            {S().profile.ctaEmail && (
                                <button type="button"
                                   onClick={() => { track('contact_click', { method: 'form', location: 'modal', project_title: post.title || '' }); setFormAperto(true); }}
                                   className="btn-primary mt-4" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                                    <span>{S().post.inquire}</span> <span className="arrow">→</span>
                                </button>
                            )}
                            {formAperto && <ContactModal
                                email={S().profile.ctaEmail}
                                oggetto={String(S().post.inquireSubject || '').replace('{TITLE}', post.title || 'project')}
                                progetto={post.title || ''} origine="modal"
                                onClose={() => setFormAperto(false)} />}
                        </div>
                    </div>
                </div>
                </>
            );
        };

        // About — la bio, VISIBILE.
        //
        // Prima viveva solo in <section class="visually-hidden"> in fondo al body:
        // ~130 parole servite ai crawler e a nessun visitatore, perche' il blocco
        // prerenderizzato che le mostrava viene distrutto appena React monta.
        // E' esattamente il pattern che Google classifica come testo nascosto.
        // Renderla qui, dallo stesso settings.seo.bio, risolve il rischio e da'
        // alla home il testo lungo che le mancava — che e' anche l'unica cosa
        // che un motore generativo puo' citare.
        //
        // Dalla versione 1 restano solo i paragrafi, piu' piccoli: niente
        // etichetta "ABOUT" e niente titolone. Non si nascondono con un trucco
        // CSS, semplicemente non ci sono: per le ragioni dette sopra, un testo
        // nascosto e' peggio di un testo assente.
        const About = () => {
            const bio = String((S().seo && S().seo.bio) || '').trim();
            if (!bio) return null;
            const paras = bio.split(/\n+/).map(t => t.trim()).filter(Boolean);
            if (!paras.length) return null;
            return (
                <section id="bio" aria-label="About" style={{ margin: '72px 0 8px' }}>
                    <div className="reveal-on-scroll delay-1" style={{ maxWidth: '68ch' }}>
                        {paras.map((t, i) => (
                            <p key={i} style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--mute)', marginBottom: '10px' }}>{t}</p>
                        ))}
                    </div>
                </section>
            );
        };

        // Footer
        const Footer = () => (
            <footer>
                <About />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10" style={{ marginTop: '56px' }}>
                    <div className="colofone-cell reveal-on-scroll">
                        <div className="colofone-label">© {new Date().getFullYear()}</div>
                        <div className="colofone-value">{S().footer.name}</div>
                    </div>
                    <div className="colofone-cell reveal-on-scroll delay-1">
                        <div className="colofone-label">{S().footer.studioLabel}</div>
                        <div className="colofone-value">{S().footer.studioValue}</div>
                    </div>
                    {/* Email e social erano testo semplice: da qui in poi sono link
                        veri. Il rel="me" sul profilo Instagram è il segnale che
                        collega davvero le due identità — è ciò che rende il
                        sameAs del JSON-LD corroborato invece che solo dichiarato. */}
                    <div className="colofone-cell reveal-on-scroll delay-2">
                        <div className="colofone-label">{S().footer.emailLabel}</div>
                        <div className="colofone-value">
                            {S().footer.emailValue
                                ? <a href={'mailto:' + S().footer.emailValue}
                                     onClick={() => track('contact_click', { method: 'email', location: 'footer' })}
                                     style={{ color: 'inherit' }}>{S().footer.emailValue}</a>
                                : null}
                        </div>
                    </div>
                    <div className="colofone-cell reveal-on-scroll delay-3">
                        <div className="colofone-label">{S().footer.socialLabel}</div>
                        <div className="colofone-value">
                            {S().footer.socialUrl
                                ? <a href={S().footer.socialUrl} target="_blank" rel="me noopener"
                                     onClick={() => track('outbound_click', { link_domain: 'instagram.com', location: 'footer' })}
                                     style={{ color: 'inherit' }}>{S().footer.socialValue}</a>
                                : S().footer.socialValue}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-6 mono uline reveal-on-scroll" style={{ fontSize: '10px', color: 'var(--mute)', borderTop: '1px solid var(--line)' }}>
                    {/* P. IVA in home: art. 7 D.Lgs. 70/2003 la vuole facilmente
                        accessibile, non sepolta dentro l'informativa privacy. */}
                    <span>{S().footer.release}{S().footer.vat ? ' · P. IVA ' + S().footer.vat : ''}</span>
                    {/* Il consenso dev'essere revocabile in modo sempre raggiungibile,
                        non solo svuotando i dati del browser. */}
                    <span style={{ display: 'flex', gap: '18px' }}>
                        <a href="/privacy" style={{ color: 'inherit' }}>{S().footer.privacy}</a>
                        <a href="/note-legali" style={{ color: 'inherit' }}>{S().footer.legal}</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); window.aonCookiePrefs && window.aonCookiePrefs(); }} style={{ color: 'inherit' }}>{S().footer.cookie}</a>
                        <span>{S().footer.edition}</span>
                    </span>
                </div>
            </footer>
        );

        // ── Pagina About ─────────────────────────────────────────────────────
        // Si apre dalla storia "ABOUT ME" (serie con id "aboutme") come vista a
        // tutto schermo dentro l'app, con l'indirizzo #about. Non e' una pagina
        // statica perche' in produzione "/" porta alla pagina d'attesa: una
        // /about separata si vedrebbe prima del lancio. Contenuti da media.json
        // (chiave "about"), modificabili dal pannello.
        const ABOUT_SERIES_ID = 'aboutme';
        const aboutData = () => {
            const a = M().about;
            return a && typeof a === 'object' ? a : null;
        };

        const AboutView = ({ onClose }) => {
            const a = aboutData() || {};
            const video = String(a.video || '').trim();
            const poster = String(a.poster || '').trim();
            const photos = (Array.isArray(a.photos) ? a.photos : [])
                .filter((p) => p && String(p.src || '').trim());
            const righe = brLines(a.title).filter((r, i, all) => r.trim() || i < all.length - 1);
            const paras = (s) => String(s || '').split(/\r?\n+/).map((t) => t.trim()).filter(Boolean);
            const p = S().profile;
            const social = S().footer.socialUrl;
            const [formAperto, setFormAperto] = useState(false);
            const ref = useRef(null);
            const box = useRef(null);
            const calmo = typeof window.matchMedia === 'function'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            useEffect(() => {
                const overflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                if (box.current) box.current.focus({ preventScroll: true });
                return () => { document.body.style.overflow = overflow; };
            }, []);
            // In cattura, prima del modulo di contatto: cosi' Esc con il modulo
            // aperto chiude solo il modulo. Ascoltando dopo, il modulo si
            // chiuderebbe per primo e questa vista vedrebbe gia' formAperto=false.
            useEffect(() => {
                const onKey = (e) => { if (e.key === 'Escape' && !formAperto) onClose(); };
                document.addEventListener('keydown', onKey, true);
                return () => document.removeEventListener('keydown', onKey, true);
            }, [onClose, formAperto]);
            useEffect(() => {
                const v = ref.current;
                if (!v || calmo) return;
                // Come nel feed: Safari su iPhone concede l'autoplay solo con
                // l'attributo muted, che React non scrive.
                v.muted = true;
                v.setAttribute('muted', '');
                const pr = v.play();
                if (pr && typeof pr.catch === 'function') pr.catch(() => {});
            }, [video]);

            // Senza video si mostra il poster; senza nessuno dei due la colonna
            // sinistra sparisce e il testo prende tutta la larghezza.
            const media = video && !calmo
                ? <video ref={ref} src={video} poster={poster || undefined} autoPlay muted loop playsInline preload="auto" aria-hidden="true" />
                : (poster || video)
                    ? (poster ? <img src={poster} alt="" /> : <video src={video} muted playsInline preload="metadata" aria-hidden="true" />)
                    : null;

            return (
                <div className="about-view" role="dialog" aria-modal="true" aria-label="About" tabIndex={-1} ref={box}>
                    <div className="about-top">
                        <div className="about-wrap about-topbar mono">
                            <a href="#" className="about-back" onClick={(e) => { e.preventDefault(); onClose(); }}>
                                ← {[p.nameFirst, p.nameLast].filter(Boolean).map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(' ') || 'Andrea Onori'}
                            </a>
                            <span className="about-here">About</span>
                        </div>
                    </div>
                    <main className={'about-wrap about-hero' + (media ? '' : ' no-media')}>
                        {media && (
                            <div className="about-vert">
                                {media}
                                {a.caption && <span className="about-caption mono">{a.caption}</span>}
                            </div>
                        )}
                        <div className="about-side">
                            {righe.length > 0 && (
                                <h1 className="about-title">
                                    {righe.map((r, i) => (
                                        <React.Fragment key={i}>
                                            {i > 0 && <br />}
                                            <span className={i === 0 ? 'nw' : undefined}>{r}</span>
                                        </React.Fragment>
                                    ))}
                                </h1>
                            )}
                            {paras(a.lead).map((t, i) => <p key={'l' + i} className="about-lead">{t}</p>)}
                            {paras(a.body).map((t, i) => <p key={'b' + i} className="about-body">{t}</p>)}
                            <div className="about-ctas">
                                {p.ctaEmail && (
                                    <button type="button" className="btn-primary"
                                        onClick={() => { track('contact_click', { method: 'form', location: 'about' }); setFormAperto(true); }}>
                                        <span>{p.ctaPrimary || "Let's film"}</span> <span className="arrow">→</span>
                                    </button>
                                )}
                                {social && (
                                    <a className="btn-secondary" href={social} target="_blank" rel="me noopener"
                                        onClick={() => track('outbound_click', { link_domain: 'instagram.com', location: 'about' })}>
                                        Instagram ↗
                                    </a>
                                )}
                            </div>
                            {photos.length > 0 && (
                                <div className={'about-photos' + (photos.length === 1 ? ' one' : '')}>
                                    {photos.slice(0, 2).map((ph, i) => (
                                        <figure key={i}>
                                            <div className="about-photo"><img src={ph.src} alt={ph.caption || 'Andrea Onori'} loading="lazy" decoding="async" /></div>
                                            {ph.caption && <figcaption className="mono">{ph.caption}</figcaption>}
                                        </figure>
                                    ))}
                                </div>
                            )}
                        </div>
                    </main>
                    <footer className="about-foot">
                        <div className="about-wrap mono">
                            <span>© {new Date().getFullYear()} {S().footer.name || 'Andrea Onori'} — Milan, Italy</span>
                            <span>{[S().footer.emailValue, S().footer.socialValue].filter(Boolean).join(' · ')}</span>
                        </div>
                    </footer>
                    {formAperto && <ContactModal
                        email={p.ctaEmail} oggetto={p.ctaSubject} origine="about"
                        onClose={() => setFormAperto(false)} />}
                </div>
            );
        };

        const App = () => {
            const [active, setActive] = useState('FEED');
            const [selectedImg, setSelectedImg] = useState(null);
            const [imgs, setImgs] = useState([]);
            const [selectedSeries, setSelectedSeries] = useState(null);
            const [selectedMotion, setSelectedMotion] = useState(null);
            // Modulo di contatto dell'intestazione: '' = chiuso, altrimenti da
            // dove e' stato aperto ('header' da telefono, 'stories' da computer).
            const [contactOpen, setContactOpen] = useState('');
            const apriContatto = (dove) => { track('contact_click', { method: 'form', location: dove }); setContactOpen(dove); };
            const conContatto = Boolean(S().profile.ctaPrimary && S().profile.ctaEmail);
            // La pagina About vive sull'hash #about: si apre anche da un link
            // diretto (/versione1#about) e il tasto indietro la chiude.
            const isAboutHash = () => window.location.hash === '#about' && !!aboutData();
            const [aboutOpen, setAboutOpen] = useState(isAboutHash);
            const aboutPushed = useRef(false);

            const open = (i, list) => { setSelectedImg(i); setImgs(list); };

            useEffect(() => {
                const sync = () => { const on = isAboutHash(); if (!on) aboutPushed.current = false; setAboutOpen(on); };
                window.addEventListener('popstate', sync);
                window.addEventListener('hashchange', sync);
                return () => { window.removeEventListener('popstate', sync); window.removeEventListener('hashchange', sync); };
            }, []);
            const openAbout = () => {
                if (window.location.hash !== '#about') {
                    window.history.pushState({ aonAbout: true }, '', '#about');
                    aboutPushed.current = true;
                }
                setAboutOpen(true);
            };
            const closeAbout = () => {
                // Aperta da qui: si torna indietro, cosi' la cronologia resta pulita.
                // Aperta da un link diretto: si toglie l'hash senza uscire dal sito.
                if (aboutPushed.current) { aboutPushed.current = false; window.history.back(); }
                else window.history.replaceState(null, '', window.location.pathname + window.location.search);
                setAboutOpen(false);
            };
            const onSeries = (s) => {
                if (s && s.id === ABOUT_SERIES_ID && aboutData()) {
                    track('series_open', { series_label: s.label || s.id });
                    openAbout();
                } else setSelectedSeries(s);
            };

            // ── Analytics ────────────────────────────────────────────────────
            // Tutto lo stato di interazione vive qui, quindi gli eventi si
            // agganciano in un punto solo invece che sparsi nei figli.
            //
            // Deliberatamente NON generiamo page_view finti sui cambi di tab o
            // sull'apertura dei modali: gonfierebbe sessioni e pagine/sessione
            // rendendo i numeri incomparabili con qualunque riferimento. GA4
            // misura già l'engagement da sé; qui servono gli eventi, non le
            // pagine. L'unico che conta davvero è contact_click — da marcare
            // come Key Event nel pannello GA4.
            // Il tab di default non e' una scelta dell'utente: senza questa
            // guardia l'effetto sparava un tab_switch a ogni caricamento,
            // aggiungendo un evento fantasma per sessione e falsando il
            // confronto fra le tre sezioni.
            const firstTab = useRef(true);
            useEffect(() => {
                if (firstTab.current) { firstTab.current = false; return; }
                track('tab_switch', { tab_name: active });
            }, [active]);

            useEffect(() => {
                if (selectedImg === null) return;
                const p = imgs[selectedImg] || {};
                track('project_view', {
                    project_title: p.title || '',
                    project_location: p.location || p.loc || '',
                    project_year: p.year || '',
                    project_format: p.film || '',
                    source_tab: active,
                });
            }, [selectedImg]);

            useEffect(() => {
                if (selectedSeries) track('series_open', { series_label: selectedSeries.label || selectedSeries.id || '' });
            }, [selectedSeries]);

            // Profondita' di scroll. Serve a distinguere un rimbalzo da una
            // visita che ha davvero guardato il portfolio: senza questo, in un
            // sito monopagina "sessione" e "sessione utile" sono indistinguibili.
            // Ogni soglia parte una volta sola per caricamento.
            const scrollSeen = useRef(new Set());
            useEffect(() => {
                const THRESHOLDS = [25, 50, 75, 100];
                let ticking = false;
                const measure = () => {
                    ticking = false;
                    const doc = document.documentElement;
                    const scrollable = doc.scrollHeight - window.innerHeight;
                    if (scrollable <= 0) return;
                    const pct = ((window.scrollY || 0) / scrollable) * 100;
                    for (const t of THRESHOLDS) {
                        if (pct >= t && !scrollSeen.current.has(t)) {
                            scrollSeen.current.add(t);
                            track('scroll_depth', { percent_scrolled: t });
                        }
                    }
                };
                const onScroll = () => {
                    if (ticking) return;
                    ticking = true;
                    requestAnimationFrame(measure);
                };
                window.addEventListener('scroll', onScroll, { passive: true });
                return () => window.removeEventListener('scroll', onScroll);
            }, []);

            // Showreel a tutto schermo (H7). p = quanto si e' scesi nel primo
            // mezzo schermo (0..1): le scritte della prima schermata e il velo
            // spariscono, compare l'etichetta SHOWREEL. Quando il pannello del
            // feed copre tutto lo schermo il video va in pausa.
            const reel = hasFeedReel();
            const heroRef = useRef(null), panelRef = useRef(null);
            const reelVideo = useRef(null), reelVeil = useRef(null), reelLabel = useRef(null);
            useEffect(() => {
                if (!reel) return;
                const calmo = typeof window.matchMedia === 'function'
                    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                let raf = 0;
                const update = () => {
                    raf = 0;
                    const p = Math.min(1, Math.max(0, window.scrollY / (0.5 * window.innerHeight)));
                    const hero = heroRef.current;
                    if (hero) {
                        hero.style.opacity = String(1 - p);
                        hero.style.pointerEvents = p > 0.9 ? 'none' : '';
                    }
                    if (reelVeil.current) reelVeil.current.style.opacity = String(0.5 * (1 - p));
                    if (reelLabel.current) reelLabel.current.style.opacity = String(p);
                    const v = reelVideo.current, panel = panelRef.current;
                    if (v && panel && !calmo) {
                        const coperto = panel.getBoundingClientRect().top <= 0;
                        if (coperto && !v.paused) v.pause();
                        else if (!coperto && v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
                    }
                };
                const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
                update();
                window.addEventListener('scroll', onScroll, { passive: true });
                window.addEventListener('resize', onScroll);
                return () => {
                    window.removeEventListener('scroll', onScroll);
                    window.removeEventListener('resize', onScroll);
                    if (raf) cancelAnimationFrame(raf);
                    if (heroRef.current) { heroRef.current.style.opacity = ''; heroRef.current.style.pointerEvents = ''; }
                };
            }, [reel]);

            // Scroll-triggered reveal
            useEffect(() => {
                const els = document.querySelectorAll('.reveal-on-scroll');
                const io = new IntersectionObserver((entries) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('in');
                            io.unobserve(entry.target);
                        }
                    });
                }, { threshold: 0.15, rootMargin: '0px 0px -80px 0px' });
                els.forEach((el) => io.observe(el));
                return () => io.disconnect();
            }, [active]);

            return (
                <div className={reel ? 'has-hero' : undefined}>
                    {reel && <HeroReel ref={reelVideo} veilRef={reelVeil} labelRef={reelLabel} />}
                    {/* Prima schermata: con lo showreel e' alta quanto lo schermo,
                        con barra in alto e nome, storie e bottone in basso;
                        scorrendo sparisce (opacita' da useEffect qui sopra). */}
                    <div ref={heroRef} className="hero-screen">
                        <Marquee />
                        <div className="hero-topbar" style={{ borderBottom: '1px solid var(--line)' }}>
                            <div className="page-x py-3 flex justify-between items-center">
                                <div className="mono uline" style={{ fontSize: '10px' }}>{S().topbar.left}</div>
                                <div className="mono uline" style={{ fontSize: '9px', color: 'var(--mute)' }}>{S().topbar.right}</div>
                            </div>
                        </div>
                        <div className="hero-bottom page-x">
                            <ProfileHeader onContact={() => apriContatto('header')} />
                            <Series onClick={onSeries} onContact={conContatto ? () => apriContatto('stories') : null} />
                        </div>
                    </div>
                    {/* Spazio vuoto: qui si vede il video pulito. */}
                    {reel && <div className="hero-gap" aria-hidden="true"></div>}

                    <main ref={panelRef} className="home-panel page-x">
                        {TAB_KEYS.length > 1 && <Tabs active={active} setActive={setActive} />}
                        <div key={active} className="tab-panel">
                            {active === 'FEED' && <FeedGrid onClick={open} />}
                            {active === 'MOTION' && <MotionGrid onClick={setSelectedMotion} />}
                            {active === 'INDEX' && <IndexView onClick={open} />}
                        </div>
                        <Footer />
                    </main>

                    {selectedImg !== null && (
                        <PostModal
                            idx={selectedImg}
                            images={imgs}
                            onClose={() => setSelectedImg(null)}
                            onNext={() => setSelectedImg((p) => (p + 1) % imgs.length)}
                            onPrev={() => setSelectedImg((p) => (p - 1 + imgs.length) % imgs.length)}
                        />
                    )}
                    {selectedSeries && <StoryViewer series={selectedSeries} onClose={() => setSelectedSeries(null)} />}
                    {selectedMotion && <MotionViewer item={selectedMotion} onClose={() => setSelectedMotion(null)} />}
                    {contactOpen && <ContactModal
                        email={S().profile.ctaEmail} oggetto={S().profile.ctaSubject} origine={contactOpen}
                        onClose={() => setContactOpen('')} />}
                    {aboutOpen && <AboutView onClose={closeAbout} />}
                </div>
            );
        };

        // Il banner cookie vive fuori da #root (deve esserci anche prima che il
        // bundle sia caricato), quindi React non lo tocca: i suoi testi si
        // aggiornano qui, una volta sola, dopo il fetch di media.json.
        // (Fino alla versione 1 qui si aggiornava anche l'HUD con orologio e
        // coordinate, poi tolto.)
        const hydrateStatic = () => {
            const s = S();
            const set = (id, text) => {
                const el = document.getElementById(id);
                if (el && text != null) el.textContent = text;
            };
            set('consentAccept', s.consent.accept);
            set('consentReject', s.consent.reject);
            const link = document.getElementById('consentLink');
            if (link) link.textContent = s.consent.link;
            const txt = document.getElementById('consentText');
            // Il testo si sostituisce senza toccare il link all'informativa:
            // resta un obbligo di legge, non una stringa qualsiasi.
            if (txt) txt.textContent = s.consent.text + ' ';
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        // Load editable media from media.json, then render. Falls back to the
        // hardcoded defaults baked into each component if the fetch fails.
        fetch('./media.json', { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : null))
            .then(data => { if (data) window.MEDIA = data; })
            .catch(() => {})
            .finally(() => {
                try { hydrateStatic(); } catch (e) {}
                root.render(<App />);
            });
