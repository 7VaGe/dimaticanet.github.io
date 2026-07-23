// sap-assessment.js — check-up "Quanto è sano il tuo SAP?" (data-sa).
// 5 domande rapide -> punteggio /10, livello di rischio (sempre ambra, mai
// rosso) e raccomandazioni sulle sole aree deboli, con CTA alla consulenza.
// Stato su data-state del container (quiz -> result).
// Rendering solo via textContent/DOM = anti-XSS. Domande e soglie in QUESTIONS/LEVELS.
(function () {
  "use strict";

  var root = document.querySelector("[data-sa]");
  if (!root) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // domande: ogni opzione vale 0/1/2 punti; "rec" appare se la risposta < 2
  var QUESTIONS = [
    {
      q: "Su quale versione dell'ERP SAP lavora oggi la tua azienda?",
      opts: [
        { t: "SAP S/4HANA", pts: 2 },
        { t: "SAP ECC, con una roadmap di migrazione definita", pts: 1 },
        { t: "SAP ECC, senza un piano di migrazione", pts: 0 }
      ],
      rec: "Pianificare per tempo la transizione a S/4HANA: il supporto mainstream di ECC ha una scadenza definita e i progetti richiedono mesi, non settimane."
    },
    {
      q: "Negli ultimi 12 mesi avete avuto fermi non pianificati del sistema?",
      opts: [
        { t: "No, nessun fermo rilevante", pts: 2 },
        { t: "Uno o due episodi isolati", pts: 1 },
        { t: "Episodi ricorrenti o prolungati", pts: 0 }
      ],
      rec: "Introdurre monitoraggio proattivo e remote administration per intercettare i problemi prima che diventino fermi di produzione."
    },
    {
      q: "Backup e piano di disaster recovery vengono testati?",
      opts: [
        { t: "Sì, con test di ripristino periodici", pts: 2 },
        { t: "Esistono, ma non vengono testati regolarmente", pts: 1 },
        { t: "Non lo so / non in modo strutturato", pts: 0 }
      ],
      rec: "Verificare con test di ripristino reali: un backup mai provato non è una garanzia, è un'ipotesi."
    },
    {
      q: "Quando sono state riviste l'ultima volta autorizzazioni e segregation of duties?",
      opts: [
        { t: "Nell'ultimo anno, con audit documentato", pts: 2 },
        { t: "Più di un anno fa", pts: 1 },
        { t: "Mai in modo sistematico", pts: 0 }
      ],
      rec: "Programmare una revisione dei profili autorizzativi: riduce il rischio operativo e prepara l'azienda agli audit di compliance."
    },
    {
      q: "Come giudichi le prestazioni del sistema nelle ore di punta?",
      opts: [
        { t: "Stabili e adeguate", pts: 2 },
        { t: "Rallentamenti nei picchi di lavoro", pts: 1 },
        { t: "Lamentele frequenti dagli utenti", pts: 0 }
      ],
      rec: "Un intervento di tuning e l'archiving dei dati storici riportano tempi di risposta costanti senza cambiare l'infrastruttura."
    }
  ];

  // soglie: primo livello il cui min è <= punteggio (occhio all'ordine, decrescente)
  var LEVELS = [
    { min: 8, tone: "ok",   label: "Ambiente solido",
      verdict: "Il tuo ambiente SAP appare ben presidiato. Un assessment periodico aiuta a mantenerlo tale e a pianificare le evoluzioni con anticipo." },
    { min: 4, tone: "warn", label: "Da presidiare",
      verdict: "Ci sono aree scoperte che oggi non bloccano l'operatività, ma che tendono a trasformarsi in costi o fermi. Vale la pena di intervenire in modo pianificato." },
    { min: 1, tone: "warn", label: "Priorità alta",
      verdict: "Più aree critiche insieme aumentano concretamente il rischio di fermo e di non conformità. Consigliamo un assessment strutturato a breve." }
  ];

  var MAX_SCORE = QUESTIONS.length * 2;   // 2 punti max a domanda -> 10
  var MIN_SCORE = 1;                       // floor: il punteggio non scende mai a 0

  var current = 0;
  var answers = [];   // indice dell'opzione scelta, per ogni domanda

  var elQ        = root.querySelector("[data-sa-q]");
  var elOpts     = root.querySelector("[data-sa-opts]");
  var elFill     = root.querySelector(".sa-progress__fill");
  var elProgress = root.querySelector("[data-sa-progress]");
  var elBack     = root.querySelector("[data-sa-back]");
  var elResult   = root.querySelector(".sa-result");
  var elScore    = root.querySelector("[data-sa-score]");
  var elLevel    = root.querySelector("[data-sa-level]");
  var elVerdict  = root.querySelector("[data-sa-verdict]");
  var elMeter    = root.querySelector("[data-sa-meter]");
  var elRecsWrap = root.querySelector("[data-sa-recs]");
  var elRecsList = root.querySelector("[data-sa-recs] ul");
  var elRestart  = root.querySelector("[data-sa-restart]");

  var listeners = [];
  function on(el, ev, fn) { el.addEventListener(ev, fn); listeners.push([el, ev, fn]); }

  var advanceTimer = null;

  // disegna la domanda corrente e i bottoni-opzione (solo textContent, no innerHTML)
  function renderQuestion() {
    var item = QUESTIONS[current];
    elQ.textContent = item.q;

    while (elOpts.firstChild) elOpts.removeChild(elOpts.firstChild);
    item.opts.forEach(function (opt, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sa-opt";
      b.textContent = opt.t;
      b.setAttribute("aria-pressed", answers[current] === i ? "true" : "false");
      b.addEventListener("click", function () { choose(i, b); });
      elOpts.appendChild(b);
    });

    elProgress.textContent = "Domanda " + (current + 1) + " di " + QUESTIONS.length;
    elFill.style.width = (current / QUESTIONS.length) * 100 + "%";
    elBack.hidden = current === 0;
  }

  function choose(i, btn) {
    answers[current] = i;
    elOpts.querySelectorAll(".sa-opt").forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
    btn.setAttribute("aria-pressed", "true");   // evidenzio la scelta

    // piccola pausa prima di avanzare, così si vede il feedback (0 se reduced-motion)
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = setTimeout(function () {
      if (current < QUESTIONS.length - 1) { current += 1; renderQuestion(); }
      else showResult();
    }, reduce ? 0 : 260);
  }

  function showResult() {
    // punteggio grezzo: 0..MAX_SCORE (tutte peggiori = 0)
    var raw = answers.reduce(function (acc, ansIdx, qIdx) {
      return acc + QUESTIONS[qIdx].opts[ansIdx].pts;
    }, 0);
    // rimappo su scala MIN_SCORE..MAX_SCORE: il caso peggiore parte da 1, non da 0
    var score = Math.max(MIN_SCORE, raw);

    var level = LEVELS.find(function (l) { return score >= l.min; });   // primo che passa

    elScore.textContent = score + " / " + MAX_SCORE;
    elLevel.textContent = level.label;
    elVerdict.textContent = level.verdict;
    elResult.setAttribute("data-tone", level.tone);

    // meter a 5 tacche: arrotondo per difetto (prudente), ma almeno 1 accesa
    var segsOn = Math.max(1, Math.floor((score / MAX_SCORE) * 5));
    elMeter.querySelectorAll("span").forEach(function (s, i) {
      s.classList.toggle("is-on", i < segsOn);
    });

    // raccolgo le rec delle aree deboli (punti < 2), ne mostro max 3
    while (elRecsList.firstChild) elRecsList.removeChild(elRecsList.firstChild);
    var recs = [];
    QUESTIONS.forEach(function (item, qIdx) {
      if (item.opts[answers[qIdx]].pts < 2) recs.push(item.rec);
    });
    recs.slice(0, 3).forEach(function (r) {
      var li = document.createElement("li");
      li.textContent = r;
      elRecsList.appendChild(li);
    });
    elRecsWrap.hidden = recs.length === 0;

    root.setAttribute("data-state", "result");
    elFill.style.width = "100%";

    // Porta il focus sul risultato (annuncio per screen reader + tastiera)
    elResult.setAttribute("tabindex", "-1");
    elResult.focus({ preventScroll: false });
  }

  function restart() {
    current = 0;
    answers = [];
    root.setAttribute("data-state", "quiz");
    renderQuestion();
    var first = elOpts.querySelector(".sa-opt");
    if (first) first.focus();
  }

  /* ---- Navigazione ---- */
  on(elBack, "click", function () {
    if (current > 0) { current -= 1; renderQuestion(); }
  });
  on(elRestart, "click", restart);

  /* ---- Stato iniziale ---- */
  root.setAttribute("data-state", "quiz");
  renderQuestion();

  // cleanup: stacco il timer e tutti i listener registrati
  window.addEventListener("pagehide", function () {
    if (advanceTimer) clearTimeout(advanceTimer);
    listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
    listeners = [];
  }, { once: true });
})();
