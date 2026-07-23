/* =============================================================
   migration-timeline.js
   Timeline interattiva della migrazione SAP (4 fasi).
   State machine centralizzata su [data-phase] del container .mt.
   Vanilla JS, nessuna libreria. Cambio contenuti con dissolvenza.
   ============================================================= */
(function () {
  "use strict";

  var root = document.querySelector(".mt");
  if (!root) return;

  /* Contenuti delle 4 fasi (facilmente modificabili) */
  var PHASES = [
    {
      parsec: "Analisi dei processi attuali, interviste chiave e disegno del nuovo sistema, senza toccare l'infrastruttura attiva.",
      tone: "green",  status: "Operatività 100%",
      client: "La tua azienda lavora normalmente sui vecchi sistemi. Zero impatto."
    },
    {
      parsec: "Installazione di SAP in ambiente di test (Sandbox) e prima migrazione prototipo dei dati storici.",
      tone: "green",  status: "Operatività 100%",
      client: "I tuoi dati vengono duplicati e protetti in background. Nessun downtime dei sistemi attuali."
    },
    {
      parsec: "Formazione del personale sui nuovi flussi e simulazioni reali dei processi aziendali.",
      tone: "amber",  status: "Preparazione al cambio",
      client: "Il tuo team impara a usare lo strumento in un ambiente sicuro, riducendo l'ansia da errore al minimo."
    },
    {
      parsec: "Switch definitivo al nuovo sistema SAP durante il weekend e affiancamento fisico dei consulenti DimaticaNet nei reparti.",
      tone: "launch", status: "Nuovo ecosistema attivo",
      client: "L'azienda riparte al lunedì con i flussi integrati. I consulenti sono al tuo fianco per risolvere ogni dubbio in tempo reale."
    }
  ];

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var steps       = Array.prototype.slice.call(root.querySelectorAll(".mt-step"));
  var range       = root.querySelector(".mt-range");
  var elParsec    = root.querySelector("[data-parsec]");
  var elClient    = root.querySelector("[data-client]");
  var elStatus    = root.querySelector("[data-status]");
  var elStatusLbl = root.querySelector("[data-status-label]");
  var badge       = elStatus ? elStatus.querySelector(".mt-status__badge") : null;

  var current = 0;

  function applyContent(d) {
    if (elParsec)    elParsec.textContent = d.parsec;
    if (elClient)    elClient.textContent = d.client;
    if (elStatusLbl) elStatusLbl.textContent = d.status;
    if (elStatus)    elStatus.setAttribute("data-tone", d.tone);
  }

  function setPhase(n, animate) {
    n = Math.min(4, Math.max(1, n));
    if (n === current) return;
    current = n;

    // Stato centralizzato + progressione della barra
    root.setAttribute("data-phase", String(n));
    root.style.setProperty("--p", (n - 1) / 3);
    if (range && parseInt(range.value, 10) !== n) range.value = n;

    // Nodi: attivo/completati
    steps.forEach(function (s) {
      var sn = parseInt(s.getAttribute("data-phase"), 10);
      s.classList.toggle("is-active", sn === n);
      s.classList.toggle("is-done", sn < n);
      s.setAttribute("aria-current", sn === n ? "step" : "false");
    });

    var d = PHASES[n - 1];

    // Aggiornamento contenuti con dissolvenza (fade-out -> swap -> fade-in)
    if (animate === false || reduce) { applyContent(d); return; }
    var faders = [elParsec, elClient, badge];
    faders.forEach(function (el) { if (el) el.classList.add("is-fade"); });
    setTimeout(function () {
      applyContent(d);
      faders.forEach(function (el) { if (el) el.classList.remove("is-fade"); });
    }, 190);
  }

  // Click sui nodi
  steps.forEach(function (s) {
    s.addEventListener("click", function () { setPhase(parseInt(s.getAttribute("data-phase"), 10)); });
  });
  // Trascinamento dello slider
  if (range) range.addEventListener("input", function () { setPhase(parseInt(range.value, 10)); });

  // Stato iniziale (Fase 1, senza animazione)
  setPhase(1, false);
})();
