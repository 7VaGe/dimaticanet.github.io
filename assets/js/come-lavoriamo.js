/* =============================================================
   COME LAVORIAMO — logica dell'esperienza narrativa
   Vanilla JS (ES6+), nessuna libreria esterna.

   Architettura:
   - STATE MACHINE centralizzata sul container radice .cl tramite
     data-state: idle -> blocked -> analyzing -> solved.
   - Scena 1 INTERATTIVA: l'utente clicca un reparto per simulare la
     criticità in quel nodo (testo di contesto dedicato).
   - Simulatore ROI personalizzato: numero ordini + paga oraria editabile.
   - Contatori animati con requestAnimationFrame + aria-live.
   - Avvio lazy via IntersectionObserver.
   - Pulizia rigorosa: destroy() rimuove tutti i listener su 'pagehide'.
   ============================================================= */
(function () {
  "use strict";

  var root = document.querySelector(".cl");
  if (!root) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Coefficienti del calcolo ROI (modificabili in futuro) ---- */
  var CONFIG = {
    workingDays:  250,     // giorni lavorativi/anno
    coeffPerOrder: 0.08,   // ore perse per ordine a causa dei processi non integrati
    projectCost:  30000,   // stima investimento progetto (€)
    recoveryRate: 0.70     // quota di inefficienza recuperabile
  };

  /* ---- Testi di contesto per reparto (Scena 1) ---- */
  var CTX = {
    acquisti:        "Ordini a fornitore non allineati alle giacenze. Rischio rotture di stock e acquisti duplicati.",
    magazzino:       "Giacenze non integrate in tempo reale. Attesa stimata: 12 ore.",
    produzione:      "Pianificazione al buio sui materiali disponibili. Fermi macchina e ritardi a cascata.",
    vendite:         "Promesse di consegna non affidabili. Clienti insoddisfatti e ordini persi.",
    amministrazione: "Fatturazione disallineata dai flussi operativi. Errori contabili e ritardi nei pagamenti."
  };

  /* ---- Selezioni correnti del simulatore ---- */
  var choice = { orders: 100, hourly: 25 };

  /* ---- Registro listener per rimozione pulita ---- */
  var listeners = [];
  function on(el, ev, fn, opts) { el.addEventListener(ev, fn, opts); listeners.push([el, ev, fn, opts]); }

  /* ---- Riferimenti DOM ---- */
  var flow   = root.querySelector(".cl-flow");
  var links  = Array.prototype.slice.call(root.querySelectorAll(".cl-link"));
  var nodes  = Array.prototype.slice.call(root.querySelectorAll(".cl-node"));
  var blocks = Array.prototype.slice.call(root.querySelectorAll(".cl-block"));
  var steps  = Array.prototype.slice.call(root.querySelectorAll(".cl-step"));
  var form   = root.querySelector(".cl-form");
  var timers = [];
  var autoDemoTimer = null;

  /* =========================================================
     STATE MACHINE
     ========================================================= */
  var STATE_TO_BLOCK = { idle: "idle", blocked: "blocked", analyzing: "analyzing", solved: "solved" };

  function setState(next, userInitiated) {
    if (root.getAttribute("data-state") === next) return;
    root.setAttribute("data-state", next);

    var targetBlock = STATE_TO_BLOCK[next];
    blocks.forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-block") === targetBlock); });

    if (next === "analyzing") runStepper();
    if (next === "solved") {
      // Processo ottimizzato: il blocco sparisce e tutta la mappa torna verde
      nodes.forEach(function (n) { n.classList.remove("is-blocked"); });
      links.forEach(function (l) { l.classList.remove("is-critical"); });
      runKpis();
    }

    if (userInitiated) {
      var active = blocks.find(function (b) { return b.classList.contains("is-active"); });
      if (active) {
        active.setAttribute("tabindex", "-1");
        active.focus({ preventScroll: true });
        if (next === "solved") {
          // Porta in vista il pannello "Ecosistema integrato" invece di lasciar scorrere la pagina
          var panel = root.querySelector(".cl-panel") || active;
          panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        }
      }
    }
  }

  /* =========================================================
     SCENA 1 — scelta del reparto e blocco
     ========================================================= */
  function cancelAutoDemo() { if (autoDemoTimer) { clearTimeout(autoDemoTimer); autoDemoTimer = null; } }

  function selectNode(nodeEl) {
    cancelAutoDemo();
    nodes.forEach(function (n) { n.classList.remove("is-blocked"); n.setAttribute("aria-pressed", "false"); });
    links.forEach(function (l) { l.classList.remove("is-critical"); });

    nodeEl.classList.add("is-blocked");
    nodeEl.setAttribute("aria-pressed", "true");

    var idx = nodes.indexOf(nodeEl);
    var linkIdx = Math.min(idx, links.length - 1);   // outgoing, o incoming per l'ultimo nodo
    if (links[linkIdx]) links[linkIdx].classList.add("is-critical");

    var ctxEl = root.querySelector("[data-ctx]");
    if (ctxEl) ctxEl.textContent = CTX[nodeEl.getAttribute("data-node")] || "";

    setState("blocked");
  }

  nodes.forEach(function (node) {
    on(node, "click", function () { selectNode(node); });
    on(node, "keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectNode(node); }
    });
  });

  /* =========================================================
     SCENA 2 — stepper + simulatore ROI (ordini + paga oraria)
     ========================================================= */
  function runStepper() {
    steps.forEach(function (s, i) {
      var t = setTimeout(function () { s.classList.add("is-done"); }, reduce ? 0 : 220 * (i + 1));
      timers.push(t);
    });
  }

  function computeROI() {
    var hoursYear = choice.orders * CONFIG.coeffPerOrder * CONFIG.workingDays;
    var cost = hoursYear * choice.hourly;
    var monthlySaving = (cost / 12) * CONFIG.recoveryRate;
    var roiMonths = monthlySaving > 0 ? (CONFIG.projectCost / monthlySaving) : 0;
    return { hoursYear: hoursYear, cost: cost, roiMonths: roiMonths };
  }

  var fmtInt  = function (n) { return Math.round(n).toLocaleString("it-IT"); };
  // Formato compatto per non mandare mai a capo il "costo": da 1.000.000 in su -> "€ X,X Mln"
  var fmtEuro = function (n) {
    n = Math.round(n);
    if (n >= 1000000) return "€ " + (n / 1000000).toLocaleString("it-IT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " Mln";
    return "€ " + n.toLocaleString("it-IT");
  };
  var fmtRoi  = function (n) { return (Math.round(n * 10) / 10).toLocaleString("it-IT") + " mesi"; };

  function updateROI() {
    var r = computeROI();
    animateCount(root.querySelector('[data-roi="hours"]'), r.hoursYear, fmtInt);
    animateCount(root.querySelector('[data-roi="cost"]'),  r.cost,      fmtEuro);
    animateCount(root.querySelector('[data-roi="roi"]'),   r.roiMonths, fmtRoi);
  }

  /* Contatore animato (rAF) */
  function animateCount(el, to, fmt) {
    if (!el) return;
    var from = parseFloat(el.getAttribute("data-cur")) || 0;
    el.setAttribute("data-cur", to);
    if (reduce) { el.textContent = fmt(to); return; }
    var dur = 650, start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(frame); else el.textContent = fmt(to);
    }
    requestAnimationFrame(frame);
  }

  /* =========================================================
     SCENA 3 — KPI dashboard
     ========================================================= */
  function runKpis() {
    animateCount(root.querySelector('[data-kpi="evasione"]'), 80,  function (n) { return "-" + Math.round(n) + "%"; });
    animateCount(root.querySelector('[data-kpi="traccia"]'), 100, function (n) { return Math.round(n) + "%"; });
  }

  /* =========================================================
     MAPPA — --len dei connettori e reflow orizzontale/verticale
     ========================================================= */
  function updateLinks() {
    var vertical = window.matchMedia("(max-width: 720px)").matches;
    flow.classList.toggle("is-vertical", vertical);
    root.classList.toggle("is-vertical-flow", vertical);
    links.forEach(function (link) {
      var len = vertical ? link.clientHeight : link.clientWidth;
      var pulse = link.querySelector(".cl-link__pulse");
      if (pulse) pulse.style.setProperty("--len", len + "px");
    });
  }

  /* =========================================================
     BINDING EVENTI (CTA, paga oraria, ordini, form)
     ========================================================= */
  root.querySelectorAll("[data-action]").forEach(function (btn) {
    on(btn, "click", function () {
      var a = btn.getAttribute("data-action");
      if (a === "to-analyzing") setState("analyzing", true);
      else if (a === "to-solved") setState("solved", true);
      else if (a === "reveal-form") {
        var f = root.querySelector(".cl-form");
        if (f) { f.hidden = false; var first = f.querySelector("input"); if (first) first.focus(); }
        btn.style.display = "none";
      }
    });
  });

  // Domanda "ordini": preset rapidi (50/100) + inserimento manuale (max 500)
  var ordersSeg   = root.querySelector('.cl-seg[data-group="orders"]');
  var ordersInput = root.querySelector("[data-orders]");
  function clearOrdersPresets() {
    if (ordersSeg) ordersSeg.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
  }
  if (ordersSeg) {
    ordersSeg.querySelectorAll("button").forEach(function (b) {
      on(b, "click", function () {
        clearOrdersPresets();
        b.setAttribute("aria-pressed", "true");
        choice.orders = parseInt(b.getAttribute("data-value"), 10);
        if (ordersInput) ordersInput.value = choice.orders;
        updateROI();
      });
    });
  }
  if (ordersInput) {
    on(ordersInput, "input", function () {
      var v = parseInt(ordersInput.value, 10);
      if (isNaN(v)) return;
      if (v > 500) { v = 500; ordersInput.value = 500; }        // non superare 500
      choice.orders = Math.min(500, Math.max(1, v));
      clearOrdersPresets();                                     // input manuale -> nessun preset
      if (ordersSeg) { var m = ordersSeg.querySelector('button[data-value="' + choice.orders + '"]'); if (m) m.setAttribute("aria-pressed", "true"); }
      updateROI();
    });
  }

  // Input paga oraria (editabile, reattivo, max 100 €/h)
  var hourly = root.querySelector("[data-hourly]");
  if (hourly) {
    on(hourly, "input", function () {
      var v = parseFloat(hourly.value);
      if (isNaN(v)) return;
      if (v > 100) { v = 100; hourly.value = 100; }             // non superare 100 €/h
      choice.hourly = Math.min(100, Math.max(5, v));
      updateROI();
    });
  }

  // Mini-form finale
  if (form) {
    on(form, "submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var status = form.querySelector(".cl-status");
      if (status) { status.textContent = "Perfetto! Ti ricontattiamo entro un giorno lavorativo per fissare i 15 minuti."; status.className = "cl-status ok"; }
      form.reset();
    });
  }

  // Resize (throttle con rAF)
  var resizeTicking = false;
  function onResize() {
    if (resizeTicking) return;
    resizeTicking = true;
    requestAnimationFrame(function () { updateLinks(); resizeTicking = false; });
  }
  on(window, "resize", onResize);

  /* =========================================================
     AVVIO LAZY — parte in viewport; demo automatica se nessuna interazione
     ========================================================= */
  var started = false;
  function start() {
    if (started) return; started = true;
    updateLinks();
    setState("idle");
    updateROI();
    // Se l'utente non sceglie un reparto, dopo qualche secondo mostriamo un esempio
    autoDemoTimer = setTimeout(function () {
      var def = nodes.find(function (n) { return n.getAttribute("data-node") === "magazzino"; }) || nodes[1];
      if (def && root.getAttribute("data-state") === "idle") selectNode(def);
    }, reduce ? 400 : 4800);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { start(); io.disconnect(); } });
  }, { threshold: 0.35 });
  io.observe(root);

  /* =========================================================
     CLEANUP
     ========================================================= */
  function destroy() {
    io.disconnect();
    cancelAutoDemo();
    timers.forEach(clearTimeout);
    listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
    listeners = [];
  }
  window.addEventListener("pagehide", destroy, { once: true });
})();
