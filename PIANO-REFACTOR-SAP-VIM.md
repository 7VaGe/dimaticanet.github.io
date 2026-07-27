# Piano di refactor — Sito B2B Consulting SAP VIM (Dimatica)

Documento di riferimento per la riprogettazione del sito attorno al servizio **SAP VIM (Vendor Invoice Management)**, con linguaggio visivo ispirato alle storiche campagne di sailing/regate SAP (2005–2015) e veste moderna in fibra di carbonio.

Parte di questo piano è **già implementata** (vedi §6): tema carbonio scuro, palette azzurro→verde pisello, pagina `sap-vim.html` con i tre componenti interattivi, voce di menu dedicata.

---

## 1. Concept grafico & moodboard

**Metafora guida:** la traversata di una fattura passiva come una regata ad alte prestazioni. Efficienza del flusso (vento e onde), governo dei dati (timone e strumentazione), valorizzazione delle persone (equipaggio).

**Palette & texture**

- *Base & struttura:* fibra di carbonio scura (antracite/nero opaco) per card, pannelli tecnici, frame e bordi. Comunica solidità ingegneristica. Token: `--carbon`, `--carbon-bg`, base `--bg: #0a0e12`.
- *Accenti & brand:* gradiente primario **azzurro `#2b90d9` → ciano `#2fd0e6` → verde pisello `#a9d15a`** (derivato dal logo). Usato per linee di flusso, elementi attivi, telemetria, icone e CTA. Token: `--grad`, `--grad-cta`.
- *Toni di supporto:* bianco/azzurro chiaro (`--text: #eaf1f8`, `--text-muted`) per leggibilità di testi e infografiche.

**Regole d'uso:** carbonio come "materia" dei pannelli; gradiente solo come energia/segnale (mai grandi campiture piatte); ciano brillante riservato alla telemetria; verde pisello come stato "risolto/approdo".

---

## 2. Architettura delle pagine & navigazione

Struttura target a cinque aree, mappata sul sito esistente:

| Area | Pagina | Stato |
|------|--------|-------|
| **Home / Landing VIM** | `sap-vim.html` (landing dedicata) + rilancio in `index.html` | Landing creata; rilancio in home da fare |
| **Servizi VIM** | Sezioni Cockpit + Rotta dentro `sap-vim.html`; approfondimenti collegabili | Creato |
| **Chi Siamo / Il Metodo** | `chi-siamo.html`, `come-lavoriamo.html` | Esistenti, da rebrandizzare sul tono velico |
| **Case Studies / Experience** | Nuova `case-studies.html` (heritage regate SAP 2005–2015 + risultati clienti) | Da creare |
| **Contatti** | `contatti.html` | Esistente |

**Navigazione:** "SAP VIM" è ora voce **top-level** nel menu (subito dopo Home), presente anche come primo elemento del mega-menu *SAP Applications* e nel footer. È il fulcro del sito.

---

## 3. Copywriting persuasivo B2B (blocchi chiave)

**Hero — Headline / Subheadline / CTA**

- Headline: *"Prendi il **timone** del tuo ciclo passivo"*
- Subheadline: *"Le fatture fornitori entrano, seguono la rotta giusta e arrivano in porto senza attriti. Con SAP VIM la contabilità naviga con visibilità totale, meno errori manuali e un equipaggio più sereno."*
- CTA primaria: *"Sali a bordo del Cockpit"* — secondaria: *"Richiedi una rotta su misura"*

**Nota di posizionamento (tassativa):** nessun riferimento a tagli di personale o ROI da esuberi. Il valore è **riduzione del lavoro ripetitivo e alienante, azzeramento degli errori manuali, serenità del team, governance e tracciabilità**. Claim ricorrente: *"L'automazione è il vento; l'equipaggio resta al timone."*

**Tre principi (metafora)**

- *Vento & onde* → flusso continuo e senza attriti delle fatture passive.
- *Timone & strumentazione* → governance e visibilità in tempo reale per la direzione contabile.
- *Equipaggio* → team potenziato (non sostituito): meno digitazione, più decisioni a valore.

**Valore offerto (bullet vendibili)**

- Acquisizione automatica dei documenti da PDF, e-mail, PEC, EDI, FatturaPA.
- Instradamento approvativo per regole/soglie/deleghe, con solleciti automatici.
- Audit trail completo e archiviazione a norma, pronti per revisori e controlli.
- Integrazione nativa con SAP S/4HANA (contabilizzazione + 3-way match).

**CTA di chiusura:** *"Pronto a mettere le fatture in rotta? Analizziamo il tuo ciclo passivo e tracciamo la rotta SAP VIM più adatta."*

---

## 4. Indicazioni visive & asset (stock / prompt AI)

Suggerimenti di soggetti e prompt per generatori AI (stile fotografico realistico, luce fredda, tonalità azzurro→verde, dettagli in carbonio):

1. **Imbarcazione ad alte prestazioni (hero/heritage):** *"High-performance racing yacht heeling in blue-green open sea, dynamic spray, carbon-fiber hull details, cold cinematic light, telemetry-blue accents, professional sailing photography, wide shot."*
2. **Dettaglio carbonio (texture/sezioni tecniche):** *"Macro shot of woven carbon-fiber surface, matte anthracite, subtle cyan reflection, industrial premium material, shallow depth of field."*
3. **Strumentazione di bordo (Cockpit):** *"Sailing cockpit instrument panel at dusk, glowing cyan and green performance gauges, carbon dashboard, water droplets, high-tech marine telemetry."*
4. **Telemetria/rotta (Timeline):** *"Nautical navigation chart with a glowing route line from cyan to lime-green, waypoints as luminous markers, dark chart background, data-visualization style."*
5. **Equipaggio al lavoro (sezione persone):** *"Sailing crew coordinating on deck, focused teamwork, natural light, blue-green sea, sense of calm control (not strain)."*

Formati: WebP, lazy-load, overlay carbonio/scrim per leggibilità testi. Sostituire le immagini stock con watermark ancora presenti nel sito.

---

## 5. Specifiche dei componenti interattivi (implementati)

File: `sap-vim.html`, `assets/css/sap-vim.css`, `assets/js/sap-vim.js`.

**5.1 Hero Toggle "Condizioni di navigazione"** — interruttore *Senza SAP VIM* ↔ *Con SAP VIM*. Al passaggio "Con", quattro metriche (Fluidità del flusso, Tracciabilità, Accuratezza, Serenità del team) animano da valori bassi (mare mosso, barre ambra) a valori alti (vento in poppa, barre gradiente azzurro→verde), con testo di "stato del mare" e nota anti-esuberi. Accessibile (`aria-pressed`), rispetta `prefers-reduced-motion`.

**5.2 Cockpit di Bordo VIM** — dashboard in frame di fibra di carbonio con quattro strumenti selezionabili (tablist): **OCR Smart Capture**, **Workflow Approvativi**, **Compliance & Audit Trail**, **Integrazione S/4HANA**. Ogni strumento apre un pannello descrittivo + un quadrante circolare di telemetria (conic-gradient) che conta fino al valore target quando entra in viewport. Metafora per strumento (vedetta a prua, manovre, registro di bordo, bussola in plancia).

**5.3 Timeline "La Rotta della Fattura"** — cinque porti (Imbarco → Rilevamento → Manovra → Registro → Approdo) con barca che avanza lungo la rotta, barra di riempimento a gradiente e slider trascinabile. Reflow verticale su mobile. Ogni tappa mostra una scheda descrittiva del viaggio del documento.

---

## 6. Stato di implementazione & prossimi passi

**Già live**

- Tema **carbonio scuro** su tutto il sito (token, texture `--carbon`, card in fibra di carbonio).
- Palette **azzurro → verde pisello**; rebrand **Parsec → DimaticaNet/Dimatica** completo.
- Pagina **`sap-vim.html`** con i tre componenti interattivi.
- **SAP VIM** in navigazione (top-level + mega-menu + footer).

**Prossimi passi consigliati**

1. Rilanciare SAP VIM nella **home** (`index.html`): blocco hero/CTA dedicato che porta a `sap-vim.html`.
2. Creare **`case-studies.html`** con l'heritage delle campagne/regate SAP 2005–2015 e immagini di imbarcazioni.
3. Sostituire il **`logo.png`** (ancora Parsec) con il logo Dimatica; predisporre versione chiara per header scuro.
4. Inserire le **immagini reali** (imbarcazioni, carbonio, telemetria) secondo i prompt del §4, in WebP.
5. Allineare i **contatti reali** (email/dominio) oggi lasciati come placeholder.
6. Rifinire dettagli minori della pagina Partner sul tema scuro.
