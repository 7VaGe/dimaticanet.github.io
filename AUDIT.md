# Audit tecnico — Sito Parsec Solutions (refactor)
*Analisi a freddo, senza modifiche al codice. Il prototipo attuale è pronto per la demo.*

## 0. Sintesi esecutiva

Il refactor è **solido come prototipo** e in diversi punti sopra la media per un sito B2B: architettura statica sicura, componenti interattivi che comunicano valore concreto (simulatore ROI, timeline di migrazione), gestione dati news read-only anti-XSS, degradazione controllata quando WebGL manca. La base di codice usa già pattern buoni (IIFE, `prefers-reduced-motion`, IntersectionObserver, state machine su `data-attributes`, cleanup dei listener).

Le aree su cui intervenire **dopo la demo** sono tre, in ordine:
1. **Legale/sicurezza (bloccanti per il go-live):** immagini Shutterstock con watermark, credenziali di produzione in chiaro in `wp-config.php`, form senza backend.
2. **Peso/performance:** minify+gzip, self-host font, immagini WebP/lazy, un canvas sempre attivo su ogni pagina.
3. **Calibrazione B2B:** troppi effetti "wow" simultanei rischiano di comunicare "agenzia creativa" più che "partner SAP affidabile".

Numeri chiave: **CSS ~60 KB**, **JS ~66 KB** (non minificati), **immagini ~1,9 MB**, three.js ~600 KB (solo home, da CDN). C'è **codice morto** (`particles.js`, 5,5 KB, non incluso da nessuna pagina).

---

## 1. Sicurezza e vulnerabilità

**Scelte corrette (da tenere)**
- **Front-end statico read-only**: superficie d'attacco minima, nessuna query al DB dal client. Ottima decisione per il dominio.
- **`news-engine.js` è anti-XSS by design**: i dati WP vengono estratti, ripuliti (strip tag + decode entità) e iniettati **solo via `textContent`/DOM**, mai `innerHTML`; gli URL sono validati per schema (http/https). È il modo giusto.
- Link esterni con `rel="noopener"`; scelte privacy sui cookie non applicabili (nessun tracker).

**Vulnerabilità / rischi (da correggere prima del go-live)**
- 🔴 **`wp-config.php` contiene le credenziali di produzione in chiaro** (righe commentate: `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST` del server Aruba). Vanno **rimosse** e la **password ruotata**; `wp-config.php` non deve mai finire in un repository.
- 🟠 **Form senza backend né protezioni**: la validazione è solo lato client. In produzione serve un endpoint con **nonce/CSRF**, **rate limiting**, **anti-spam** (honeypot o captcha) e sanitizzazione server-side. L'upload CV oggi non carica nulla; in prod: validare tipo/dimensione **lato server**, storage **fuori webroot**, scansione antivirus.
- 🟠 **WP REST API pubblica**: espone anche `/wp-json/wp/v2/users` (enumerazione utenti) e l'`?author=` enumeration. In prod: limitare gli endpoint non necessari e bloccare l'enumerazione autori.
- 🟡 **CDN esterni senza SRI**: three.js (Cloudflare) e Google Fonts senza *Subresource Integrity*. Aggiungere gli hash SRI. Per **GDPR** conviene **self-hostare i font** (Google Fonts invia l'IP dell'utente a Google).
- 🟡 **Header di sicurezza assenti** (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy): da configurare su WordPress/hosting.

---

## 2. Scelte di design per il dominio B2B (SAP consulting)

Target reale: CEO/CFO/COO/IT manager — poco tempo, orientati a **ROI, continuità operativa, riduzione del rischio**.

**Corrette e da valorizzare**
- **"Come Lavoriamo"** (blocco processo → simulatore costo inefficienza → metodo Parsec → ecosistema integrato) e la **Timeline di migrazione** sono il pezzo forte per il B2B: rendono **tangibile** il valore, abbassano la diffidenza tecnica e parlano la lingua giusta (continuità operativa, rientro in mesi). Da tenere e mettere in evidenza.
- Struttura dei servizi chiara, gerarchia dei contenuti, CTA che incanalano verso la consulenza.
- Palette dark-tech coerente e professionale; contrasti del testo già sistemati.

**Da calibrare (rischi per la credibilità/percezione)**
- **Hero 3D + scroll cinematografico da 320vh**: molto d'impatto, ma (a) fragile — dipende da WebGL, come emerso; (b) pesante; (c) **tre+ schermate di scroll prima del contenuto** possono irritare un manager che ha fretta. Per il B2B valuterei: messaggio chiave **visibile subito**, effetto mantenuto ma **scroll ridotto** (es. 150vh) o hero più diretto.
- **Densità di effetti**: particelle ovunque + tilt + "frenata tech" + grana + flow field. Il rischio è comunicare *studio creativo* più che *partner SAP affidabile*. La fiducia enterprise passa anche da **sobrietà, velocità e chiarezza**. Consiglio: tenere gli effetti dove **aggiungono significato** (mappa processi, timeline, ROI) e alleggerire quelli **puramente decorativi**.
- 🔴 **Immagini con watermark Shutterstock**: minano immediatamente la credibilità. Priorità legale/di percezione alta.
- **Logo** inserito come immagine su riquadro bianco: stona un po' sul dark theme. Meglio una **versione chiara/monocromatica** del logo per lo sfondo scuro.

---

## 3. Qualità del codice e ottimizzazione (riuso, pattern)

**Buone pratiche già presenti**
- IIFE + `"use strict"`, `requestAnimationFrame` con smoothing inerziale, IntersectionObserver per lazy-init, rispetto di `prefers-reduced-motion`, cleanup dei listener su `pagehide`, **state machine su `data-attributes`** (ottimo pattern, riusabile).

**Interventi di ottimizzazione (dopo la demo)**
- **Rimuovere il codice morto**: `particles.js` (148 righe, 5,5 KB) non è incluso da nessuna pagina — sostituito da `cinematic.js`.
- **Fattorizzare la logica canvas**: `bg-field.js`, `flow-field.js`, `particles.js` e la parte particellare di `cinematic.js` ripetono lo stesso schema (setup canvas, DPR, resize, rAF, reduced-motion, cleanup). Estrarre un piccolo modulo base **`canvasFX`** ridurrebbe la duplicazione e il peso.
- **Util condivise**: pattern ricorrenti (lazy-init con IntersectionObserver, `matchMedia` reduced-motion, cleanup su `pagehide`, calcolo `scrollProgress`) in un unico `utils.js`.
- **CSS**: le varianti "foto + overlay scuro" (`.card.card-photo`, `.p-card`, `.split-media.media-photo`, `.ring-card.card-photo`) usano gradienti simili → centralizzarle con **custom properties** (`--scrim-top`, `--scrim-bottom`). Le media query mobile ripetono pattern comprimibili.
- **Uniformità**: alcuni componenti hanno cleanup, altri no (`bg-field.js` non libera esplicitamente). Uniformare.
- **Cache-busting incoerente** (`?v=2` solo su alcune pagine/asset): su WordPress lo gestisce `wp_enqueue` con versione; per lo statico, uniformare o introdurre un piccolo build step.

---

## 4. Performance e peso delle risorse

- **Minificazione + gzip/brotli**: CSS 60 KB e JS 66 KB non minificati → con minify+compressione si arriva facilmente a **-70%**. Priorità alta e a basso rischio.
- **three.js ~600 KB**: solo sulla home e da CDN (cache condivisa) — accettabile, ma è la pagina più pesante. Il **fallback WebGL** già implementato la rende robusta.
- **Font Google**: 2 famiglie con più pesi. Limitare ai pesi realmente usati; `font-display: swap` già presente; self-host per GDPR + velocità.
- **Immagini 1,9 MB**: sono usate come **background CSS** (via `--img`), quindi `loading="lazy"` non si applica. Valutare `<img loading="lazy">` per i contenuti informativi e la **conversione in WebP/AVIF** (-30/50%).
- **`bg-field.js` gira in `requestAnimationFrame` su *ogni* pagina, sempre**: consumo costante di CPU/batteria (soprattutto mobile). Metterlo in **pausa quando fuori dal viewport** o su `visibilitychange`, o ridurne il framerate.
- **Più canvas contemporanei** (home: bg-field + three.js; lavora-con-noi: bg-field + flow-field): su mobile è oneroso. Dove c'è già un effetto principale, valutare di **disattivare bg-field**.
- Testare i **Core Web Vitals** con Lighthouse (lo scroll 320vh e i canvas possono impattare INP/CLS).

---

## 5. Accessibilità e SEO

**A11y** — base buona (aria-label/aria-live/role in più componenti, focus states, reduced-motion). Da verificare: navigazione **completa da tastiera** su carosello e card con tilt; le foto sono **background CSS** → invisibili agli screen reader (per immagini informative meglio `<img alt>`).

**SEO** — presenti `title`/`description`. Mancano: **Open Graph/Twitter card**, **favicon**, **sitemap.xml**, **robots.txt**, **dati strutturati schema.org** (`Organization`/`LocalBusiness` — molto utili per un'azienda locale a Porto Ercole), `canonical`. Header/footer e news sono iniettati via JS: i crawler moderni li leggono, ma su WordPress diventeranno **server-side** (meglio per SEO). In WP: Yoast/RankMath coprono gran parte.

---

## 6. Migrazione WordPress

- **Header/footer**: oggi iniettati da `components.js`. In WP diventano `header.php`/`footer.php` (template parts) — la logica JS di iniezione va **rimossa**; la voce attiva del menu via `body_class()`/menu nativi.
- **CSS/JS per pagina**: `wp_enqueue_*` condizionale (già indicato nelle guide dei singoli componenti), con versioning nativo.
- **Componenti interattivi** (Come Lavoriamo, Timeline, Flow field, Bento News): come **blocchi HTML personalizzati/shortcode** — guide già fornite. La Bento News legge la REST API: sullo stesso dominio **nessun problema CORS**.
- **Immagini**: caricarle in Media Library e usare le dimensioni responsive di WP.
- **Hardening WP**: rimuovere le credenziali da `wp-config`, aggiornare core/plugin, limitare REST/XML-RPC, prefisso tabelle non standard (già `wp703_`), backup automatici.

---

## 7. Piano d'azione prioritizzato (dopo la demo)

- **P0 — bloccanti go-live:** sostituire le immagini con watermark; rimuovere le credenziali di produzione da `wp-config` + ruotare la password; collegare i form a un endpoint sicuro (nonce, rate limit, anti-spam).
- **P1 — quick win a basso rischio:** minify+gzip; self-host font (GDPR); immagini WebP + lazy; SRI sui CDN; rimuovere `particles.js`.
- **P2 — refactor:** modulo `canvasFX` + `utils.js` condivisi; centralizzare gli overlay foto in CSS; pausare `bg-field` fuori dal viewport; calibrare hero/effetti per il tono B2B.
- **P3 — crescita:** Open Graph, schema.org, sitemap; audit a11y completo (Lighthouse/axe).

---

## 8. Prima della demo di oggi — cosa NON toccare

Il prototipo è coerente e funzionante; **non consiglio modifiche prima della presentazione**. Unici accorgimenti operativi:
- Mostrare la home da un browser con **accelerazione hardware attiva** per vedere la stella 3D (in caso contrario parte comunque il **fallback statico**, quindi niente errori a schermo).
- Avere connessione per la CDN di three.js e per i Google Fonts.

Tutte le ottimizzazioni qui sopra sono **evolutive**, da affrontare a valle della demo senza rischi per la presentazione.
