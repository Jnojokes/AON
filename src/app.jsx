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

        // Live time HUD
        const updateClock = () => {
            const el = document.getElementById('liveTime');
            if (el) {
                const d = new Date();
                el.textContent = d.toTimeString().slice(0,8);
            }
        };
        updateClock();
        setInterval(updateClock, 1000);

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
            hud: { coords: '45.4642° N · 9.1900° E', tz: 'CET' },
            topbar: { left: 'andrea__onori', right: 'ARCHIVE / 25 · VOLUME 01' },
            profile: {
                badge: 'VERIFIED · 25',
                eyebrow: '◌ PHOTOGRAPHER · BASED IN MILAN',
                nameFirst: 'ANDREA',
                nameLast: 'ONORI',
                handle: '@andrea__onori · ESTABLISHED MMXVIII',
                disciplines: 'EDITORIAL · PORTRAIT · PERSONAL WORK.',
                siteLabel: '↗ ANDREAONORI.COM',
                siteUrl: 'https://www.andreaonori.com/',
                ctaPrimary: 'GET IN TOUCH',
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
                motionCorner: 'MOV · ',
                motionPrefix: 'REEL #',
                motionYear: '2025',
                // {SECTION} viene sostituito col nome della sezione vuota.
                empty: 'NESSUN MEDIA IN {SECTION} — aggiungilo da /admin-edits',
            },
            post: {
                location: 'LOCATION',
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
        // I video NON stanno nel repo: sono link a uno storage esterno (Aruba) e
        // vengono scaricati solo quando l'utente clicca → la griglia resta leggera.
        const VIDEO_RE = /\.(mp4|mov|webm|m4v|m3u8)(\?|#|$)/i;
        const isVideoUrl = (u) => typeof u === 'string' && VIDEO_RE.test(u);

        const normMedia = (v) => {
            if (!v) return { image: '', video: '', title: '' };
            if (typeof v === 'string') {
                return isVideoUrl(v)
                    ? { image: '', video: v, title: '' }
                    : { image: v, video: '', title: '' };
            }
            const src = v.src || '';
            const video = v.video || (isVideoUrl(src) ? src : '');
            const image = v.poster || v.image || (isVideoUrl(src) ? '' : src) || v.url || '';
            return { image, video, title: v.title || '' };
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
                });
            }
            return slides;
        };
        const firstImageOf = (slides) => (slides.find(s => s.image) || {}).image || '';
        const firstVideoOf = (slides) => (slides.find(s => s.video) || {}).video || '';
        const altOf = (p) => [p.title, p.film, p.location || p.loc, p.year].filter(Boolean).join(' — ');

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

        const Avatar = ({ onClick }) => (
            <div
                onClick={onClick}
                className="avatar-bold"
                style={{ width: '160px', height: '160px', position: 'relative', flexShrink: 0, cursor: 'pointer' }}
                aria-label="Open showreel"
            >
                <img
                    src="./andrea.jpg"
                    alt={S().seo.avatarAlt}
                    width="160" height="160" fetchPriority="high"
                    style={{
                        width: '100%', height: '100%',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '1px solid rgba(255,255,255,0.25)',
                        filter: 'grayscale(20%) contrast(1.04)',
                        transition: 'opacity .3s var(--ease-out), filter .3s var(--ease-out)',
                    }}
                />
                <div className="play-overlay" style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0)',
                    opacity: 0,
                    transition: 'opacity .35s var(--ease-out), background .35s var(--ease-out)',
                    pointerEvents: 'none',
                }}>
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                </div>
                <div className="mono" style={{
                    position: 'absolute', bottom: '-6px', right: '-6px',
                    background: 'var(--fg)', color: 'var(--bg)',
                    fontSize: '8px', padding: '4px 7px',
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    zIndex: 2,
                }}>{S().profile.badge}</div>
            </div>
        );

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
        const ContactModal = ({ email, oggetto, progetto, origine, onClose }) => {
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

                        {stato === 'inviato' ? (
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

        const ProfileHeader = ({ onAvatarClick }) => {
            const p = S().profile;
            const [formAperto, setFormAperto] = useState(false);
            return (
            <div>
                <div className="flex flex-col md:flex-row gap-10 md:gap-12 items-start mb-14 md:mb-10">
                    <Avatar onClick={onAvatarClick} />
                    <div className="flex-1 w-full">
                        {p.eyebrow && <div className="mb-3 mono uline" style={{ color: 'var(--mute)', fontSize: '10px' }}>
                            {p.eyebrow}
                        </div>}

                        <h1 className="display" style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}>
                            <span className="reveal-line d1"><span>{p.nameFirst}</span></span>{' '}
                            <span className="reveal-line d2"><span>{p.nameLast}</span></span>
                            <span className="verified"></span>
                        </h1>

                        {p.handle && <p className="mono uline mt-3 mb-7 md:mb-5" style={{ color: 'var(--mute)', fontSize: '11px' }}>
                            {p.handle}
                        </p>}

                        {p.disciplines && <div className="mb-7 md:mb-5 space-y-1">
                            <p className="grot uline" style={{ fontSize: '13px', fontWeight: 600 }}>{p.disciplines}</p>
                        </div>}

                        {/* Svuotare un campo dal pannello toglie il testo dal sito
                            (è voluto), ma un indirizzo vuoto non deve lasciare in
                            piedi un link rotto: href="" ricarica la pagina e
                            "mailto:" apre il client di posta senza destinatario.
                            Senza indirizzo il testo resta, il link no. */}
                        {p.siteLabel && (p.siteUrl
                            ? <a href={p.siteUrl}
                                 className="mono uline mb-7 md:mb-5 inline-block" style={{ fontSize: '11px', borderBottom: '1px solid var(--fg)', paddingBottom: '2px' }}>
                                {p.siteLabel}
                              </a>
                            : <span className="mono uline mb-7 md:mb-5 inline-block" style={{ fontSize: '11px' }}>{p.siteLabel}</span>)}

                        <div className="flex gap-3 md:gap-2 flex-wrap mt-7 md:mt-5">
                            {/* Apre il modulo, non un link mailto: — vedi il
                                commento su ContactModal. */}
                            {p.ctaPrimary && p.ctaEmail && <button type="button"
                               onClick={() => { track('contact_click', { method: 'form', location: 'header' }); setFormAperto(true); }}
                               className="btn-primary" style={{ display: 'inline-flex', cursor: 'pointer' }}>
                                <span>{p.ctaPrimary}</span> <span className="arrow">→</span>
                            </button>}
                            {p.ctaSecondary && <button className="btn-secondary">
                                <span className="pulse-dot"></span>
                                {p.ctaSecondary}
                            </button>}
                        </div>
                    </div>
                </div>
                {formAperto && <ContactModal
                    email={p.ctaEmail} oggetto={p.ctaSubject} origine="header"
                    onClose={() => setFormAperto(false)} />}
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
        const Series = ({ onClick }) => {
            const series = (M().series && M().series.length) ? M().series : [];
            if (!series.length) return null;
            return (
                <div className="mb-12">
                    <div className="flex items-baseline justify-between mb-5 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
                        <div className="mono uline" style={{ fontSize: '10px' }}>{S().sections.seriesTitle}</div>
                        <div className="mono uline" style={{ color: 'var(--mute)', fontSize: '9px' }}>{String(series.length).padStart(2,'0')} {S().sections.seriesUnit}</div>
                    </div>
                    <div className="flex gap-7 overflow-x-auto pb-2">
                        {series.map((s, i) => (
                            <div key={s.id} className="flex flex-col items-center gap-3 flex-shrink-0 cursor-pointer" role="button" tabIndex={0} aria-label={s.label} onClick={() => onClick(s)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(s); } }}>
                                <div className="series-circle">
                                    <img src={normMedia(s.image).image || firstImageOf((s.images || []).map(normMedia)) || ''} alt={S().seo.author ? `${s.label} — series by ${S().seo.author}` : s.label} loading="lazy" decoding="async" />
                                </div>
                                <div className="text-center">
                                    <div className="mono uline" style={{ fontSize: '9px' }}>{s.label}</div>
                                    <div className="mono" style={{ color: 'var(--mute)', fontSize: '9px', marginTop: '2px' }}>—{(s.images && s.images.length) || s.count || 0}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        // Tabs
        // Le chiavi ('FEED'/'MOTION'/'INDEX') restano interne: rinominare una
        // tab dal pannello cambia l'etichetta, non la logica né gli eventi GA4.
        const TAB_KEYS = ['FEED', 'MOTION', 'INDEX'];
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
                                <span style={{ color: 'var(--mute)', marginRight: '8px', fontSize: '9px' }}>0{i + 1}</span>
                                {tabLabel(t)}
                            </button>
                        ))}
                    </div>
                    <div className="tab-indicator" style={{ left: `${ind.left}px`, width: `${ind.width}px` }}></div>
                </div>
            );
        };

        // Badge ▶ mostrato sulle celle che contengono un video esterno
        const PlayBadge = () => (
            <div className="motion-play">
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
                    {show && <video src={video} muted playsInline preload="metadata" tabIndex={-1}
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

        // Feed Grid — uniform 4:5 cells on every breakpoint (no bento, no mixed ratios, no holes)
        const FeedGrid = ({ onClick }) => {
            const images = (M().feed && M().feed.length) ? M().feed : [];
            if (!images.length) return <EmptyState section="FEED" />;

            return (
                <div className="grid grid-cols-3 gap-0">
                    {images.map((img, i) => {
                        const slides = slidesOf(img);
                        const nVideo = slides.filter(s => s.video).length;
                        return (
                        <div key={i} className="feed-item" style={{ aspectRatio: '4 / 5' }} role="button" tabIndex={0} aria-label={altOf(img)} onClick={() => onClick(i, images)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(i, images); } }}>
                            <span className="feed-corner mono">{String(i + 1).padStart(2, '0')}</span>
                            <div className="cell-badges">
                                {slides.length > 1 && (
                                    <span className="carousel-badge" title={slides.length + ' media'}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><rect x="8" y="3" width="13" height="13" rx="1.5"></rect><path d="M3 8v11a2 2 0 0 0 2 2h11"></path></svg>
                                    </span>
                                )}
                                {img.ai && <span className="ai-mark">{S().post.aiShort}</span>}
                            </div>
                            <GridMedia image={firstImageOf(slides)} video={firstVideoOf(slides)} alt={altOf(img)} />
                            {nVideo > 0 && <PlayBadge />}
                            <div className="feed-meta">
                                <div>
                                    <div style={{ color: 'var(--mute)', fontSize: '9px', marginBottom: '3px' }}>{img.film}</div>
                                    <div style={{ fontSize: '11px' }}>{img.title}</div>
                                </div>
                                <div style={{ textAlign: 'right', color: 'var(--mute)' }}>
                                    <div>{img.loc}</div>
                                    <div>{img.year}</div>
                                </div>
                            </div>
                        </div>
                        );
                    })}
                </div>
            );
        };

        const MotionGrid = ({ onClick }) => {
            const items = (M().motion && M().motion.length) ? M().motion : [];
            if (!items.length) return <EmptyState section="MOTION" />;
            return (
                <div className="grid grid-cols-3 gap-0">
                    {items.map((raw, i) => {
                        const m = normMedia(raw);
                        const derived = titleFromFilename(m.image || m.video);
                        const label = m.title || derived || `${S().sections.motionPrefix}${String(i+1).padStart(3,'0')}`;
                        const alt = S().seo.author ? `${label} — motion still by ${S().seo.author}` : label;
                        return (
                        <div key={i} className="feed-item" style={{ aspectRatio: '9/16' }} role="button" tabIndex={0}
                            aria-label={m.video ? `Riproduci ${label}` : label}
                            onClick={() => { track('motion_play', { reel_label: label, reel_index: i + 1 }); onClick(raw); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(raw); } }}>
                            <span className="feed-corner mono">{S().sections.motionCorner}{String(i+1).padStart(2,'0')}</span>
                            <GridMedia image={m.image} video={m.video} alt={alt} />
                            {m.video && <PlayBadge />}
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
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '440px', maxHeight: '88vh', display: 'flex' }}>
                        {m.video
                            ? <video src={m.video} poster={m.image || undefined} controls autoPlay playsInline loop preload="auto"
                                     style={{ width: '100%', maxHeight: '88vh', objectFit: 'contain', background: '#000' }} />
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
            const slides = rawSlides.map(normMedia).filter(s => s.image || s.video);
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
                                <video key={cur.video} src={cur.video} poster={cur.image || undefined}
                                    controls autoPlay playsInline preload="auto"
                                    onTimeUpdate={(e) => { const v = e.target; if (v.duration) setProgress(Math.min(100, (v.currentTime / v.duration) * 100)); }}
                                    onEnded={goNext}
                                    style={{ maxWidth: '100%', maxHeight: '82vh', background: '#000' }} />
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
                            {slide.video
                                ? <video key={slide.video} src={slide.video} poster={slide.image || undefined}
                                         controls autoPlay playsInline preload="auto" className="w-full"
                                         style={{ display: 'block', maxHeight: '80vh', background: '#000' }} />
                                : <img src={slide.image} alt={altOf(post)} className="w-full" style={{ display: 'block' }} loading="lazy" decoding="async" />}
                            {multi && (
                                <>
                                    <button className="carousel-arrow" style={{ left: '12px' }} onClick={() => setPhoto(p => Math.max(p - 1, 0))} disabled={photo === 0} aria-label="Previous photo">‹</button>
                                    <button className="carousel-arrow" style={{ right: '12px' }} onClick={() => setPhoto(p => Math.min(p + 1, photos.length - 1))} disabled={photo === photos.length - 1} aria-label="Next photo">›</button>
                                    <div className="mono" style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(0,0,0,0.75)', padding: '3px 8px', fontSize: '10px', letterSpacing: '0.1em' }}>
                                        {slide.video && <span style={{ color: 'var(--accent)' }}>▶&nbsp;</span>}{photo + 1} / {photos.length}
                                    </div>
                                    {/* i pallini salgono quando c'è un video, per non coprire i controlli */}
                                    <div style={{ position: 'absolute', bottom: slide.video ? '58px' : '12px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '6px', transition: 'bottom .2s var(--ease-out)' }}>
                                        {photos.map((s, i) => (
                                            <button key={i} onClick={() => setPhoto(i)} aria-label={(s.video ? 'Video ' : 'Foto ') + (i + 1)}
                                                style={{ width: i === photo ? '18px' : '6px', height: '6px', borderRadius: '3px', padding: 0, border: 'none', cursor: 'pointer', background: i === photo ? 'var(--fg)' : (s.video ? 'var(--accent)' : 'rgba(255,255,255,0.45)'), transition: 'width .25s var(--ease-out), background .25s var(--ease-out)' }} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="w-full md:w-80 space-y-6">
                            <div className="mono uline" style={{ fontSize: '10px', color: 'var(--mute)' }}>
                                {String(idx + 1).padStart(2,'0')} / {String(images.length).padStart(2,'0')}
                                {multi && <span> &nbsp;·&nbsp; {S().post.carousel} {photos.length}</span>}
                                {photos.some(s => s.video) && <span style={{ color: 'var(--accent)' }}> &nbsp;·&nbsp; {S().post.video}</span>}
                            </div>
                            <h2 className="display" style={{ fontSize: '32px' }}>{post.title}</h2>
                            {/* Dicitura "Contenuto Enhanced con AI": compare solo
                                se la spunta è attiva sul post nel pannello. */}
                            {post.ai && <p className="ai-tag">{S().post.aiLabel}</p>}
                            <div className="mono uline space-y-1" style={{ fontSize: '10px' }}>
                                <p><span style={{ color: 'var(--mute)' }}>{S().post.location}&nbsp;&nbsp;</span>{post.location || post.loc || '—'}</p>
                                <p><span style={{ color: 'var(--mute)' }}>{S().post.year}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>{post.year || '—'}</p>
                                <p><span style={{ color: 'var(--mute)' }}>{S().post.format}&nbsp;&nbsp;&nbsp;&nbsp;</span>{post.film || '—'}</p>
                            </div>
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
        const About = () => {
            const bio = String((S().seo && S().seo.bio) || '').trim();
            if (!bio) return null;
            const paras = bio.split(/\n+/).map(t => t.trim()).filter(Boolean);
            if (!paras.length) return null;
            return (
                <section id="about" aria-labelledby="about-h" style={{ margin: '72px 0 8px' }}>
                    <div className="mono uline reveal-on-scroll" style={{ fontSize: '10px', color: 'var(--mute)', marginBottom: '14px' }}>ABOUT</div>
                    <h2 id="about-h" className="display reveal-on-scroll" style={{ fontSize: 'clamp(22px, 3.2vw, 34px)', lineHeight: 1.15, marginBottom: '18px', textTransform: 'uppercase' }}>
                        {S().profile.nameFirst} {S().profile.nameLast} — {S().profile.eyebrow}
                    </h2>
                    <div className="reveal-on-scroll delay-1" style={{ maxWidth: '68ch' }}>
                        {paras.map((t, i) => (
                            <p key={i} style={{ fontSize: '15px', lineHeight: 1.65, color: 'var(--mute)', marginBottom: '10px' }}>{t}</p>
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

        // Showreel — autoplay cross-fade reel, opens from avatar
        const ShowreelModal = ({ onClose }) => {
            // Solo copertine: lo showreel è un cross-fade di immagini, non di video.
            const slides = (M().feed && M().feed.length)
                ? M().feed.map(f => firstImageOf(slidesOf(f))).filter(Boolean).slice(0, 6)
                : [];
            const [cur, setCur] = useState(0);
            const [progress, setProgress] = useState(0);
            const intervalRef = useRef(null);
            const DURATION_MS = 4200;

            useEffect(() => {
                document.body.style.overflow = 'hidden';
                const onKey = (e) => {
                    if (e.key === 'Escape') onClose();
                    if (e.key === 'ArrowRight') { setCur((p) => (p + 1) % slides.length); setProgress(0); }
                    if (e.key === 'ArrowLeft') { setCur((p) => (p - 1 + slides.length) % slides.length); setProgress(0); }
                };
                window.addEventListener('keydown', onKey);
                return () => {
                    document.body.style.overflow = '';
                    window.removeEventListener('keydown', onKey);
                };
            }, [onClose]);

            useEffect(() => {
                const tick = 50;
                intervalRef.current = setInterval(() => {
                    setProgress((prev) => {
                        const next = prev + (100 * tick / DURATION_MS);
                        if (next >= 100) {
                            setCur((p) => (p + 1) % slides.length);
                            return 0;
                        }
                        return next;
                    });
                }, tick);
                return () => intervalRef.current && clearInterval(intervalRef.current);
            }, []);

            if (!slides.length) return null;

            return (
                <div style={{
                    position: 'fixed', inset: 0, background: '#000',
                    zIndex: 300, display: 'flex', flexDirection: 'column',
                    animation: 'modalIn .35s ease',
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        padding: '20px 28px', zIndex: 10,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
                    }}>
                        <div className="mono uline" style={{
                            color: 'white', fontSize: '10px',
                            display: 'flex', alignItems: 'center', gap: '12px',
                        }}>
                            <img src="./andrea.jpg" alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid white' }} />
                            <div style={{ letterSpacing: '0.22em' }}>
                                <div style={{ fontWeight: 700 }}>{S().showreel.title}</div>
                                <div style={{ opacity: 0.55, marginTop: '3px', fontSize: '9px' }}>{S().showreel.subtitle}</div>
                            </div>
                        </div>
                        <button onClick={onClose} style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            color: 'white', cursor: 'pointer',
                            width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background .25s var(--ease-out)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        aria-label="Close showreel">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>

                    <div style={{
                        position: 'absolute', top: '20px', left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex', gap: '5px', zIndex: 10,
                    }}>
                        {slides.map((_, i) => (
                            <div key={i} style={{
                                width: '32px', height: '2px',
                                background: 'rgba(255,255,255,0.25)',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    height: '100%', background: 'var(--accent)',
                                    width: i < cur ? '100%' : i === cur ? `${progress}%` : '0%',
                                    transition: 'width 60ms linear',
                                }}></div>
                            </div>
                        ))}
                    </div>

                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        {slides.map((src, i) => (
                            <img key={i} src={src} alt="" style={{
                                position: 'absolute', inset: 0,
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                                opacity: i === cur ? 1 : 0,
                                transition: 'opacity 1.2s var(--ease-out), transform 5s linear',
                                transform: i === cur ? 'scale(1.04)' : 'scale(1)',
                            }} />
                        ))}
                        <div onClick={() => { setCur((p) => (p - 1 + slides.length) % slides.length); setProgress(0); }}
                             style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '35%', zIndex: 5, cursor: 'pointer' }}></div>
                        <div onClick={() => { setCur((p) => (p + 1) % slides.length); setProgress(0); }}
                             style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '65%', zIndex: 5, cursor: 'pointer' }}></div>
                    </div>

                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '28px 28px 32px',
                        background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                        zIndex: 10,
                    }}>
                        <p className="display" style={{
                            color: 'white', fontSize: '44px', lineHeight: 0.95,
                        }}>
                            {brLines(S().showreel.headline).map((l, i) => (
                                <React.Fragment key={i}>{i > 0 && <br/>}{l}</React.Fragment>
                            ))}
                        </p>
                        <p className="mono uline" style={{
                            color: 'rgba(255,255,255,0.65)',
                            fontSize: '10px',
                            marginTop: '14px',
                        }}>
                            {S().showreel.frame} {String(cur + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
                            &nbsp;·&nbsp; <span style={{ color: 'var(--accent)' }}>{S().showreel.autoplay}</span>
                        </p>
                    </div>
                </div>
            );
        };

        const App = () => {
            const [active, setActive] = useState('FEED');
            const [selectedImg, setSelectedImg] = useState(null);
            const [imgs, setImgs] = useState([]);
            const [selectedSeries, setSelectedSeries] = useState(null);
            const [showreelOpen, setShowreelOpen] = useState(false);
            const [selectedMotion, setSelectedMotion] = useState(null);

            const open = (i, list) => { setSelectedImg(i); setImgs(list); };

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

            useEffect(() => {
                if (showreelOpen) track('showreel_play', { source: 'avatar' });
            }, [showreelOpen]);

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
                <div>
                    <Marquee />
                    <div style={{ borderBottom: '1px solid var(--line)' }}>
                        <div className="max-w-[1100px] mx-auto px-6 py-3 flex justify-between items-center">
                            <div className="mono uline" style={{ fontSize: '10px' }}>{S().topbar.left}</div>
                            <div className="mono uline" style={{ fontSize: '9px', color: 'var(--mute)' }}>{S().topbar.right}</div>
                        </div>
                    </div>

                    <main className="max-w-[1100px] mx-auto px-6 py-16">
                        <ProfileHeader onAvatarClick={() => setShowreelOpen(true)} />
                        <Series onClick={setSelectedSeries} />
                        <Tabs active={active} setActive={setActive} />
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
                    {showreelOpen && <ShowreelModal onClose={() => setShowreelOpen(false)} />}
                    {selectedMotion && <MotionViewer item={selectedMotion} onClose={() => setSelectedMotion(null)} />}
                </div>
            );
        };

        // HUD e banner cookie vivono fuori da #root (devono esserci anche prima
        // che Babel abbia compilato il JSX), quindi React non li tocca: i loro
        // testi si aggiornano qui, una volta sola, dopo il fetch di media.json.
        const hydrateStatic = () => {
            const s = S();
            const set = (id, text) => {
                const el = document.getElementById(id);
                if (el && text != null) el.textContent = text;
            };
            set('hudCoords', s.hud.coords);
            set('hudTz', s.hud.tz);
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
