/* =============================================================
   sap-vim.js — interazioni della landing SAP VIM (DimaticaNet)
   1) Hero Toggle "Condizioni di navigazione" (Senza / Con SAP VIM)
   2) Cockpit di Bordo VIM (strumenti + telemetria circolare)
   3) Timeline "La Rotta della Fattura" (porti + range + barca)
   Vanilla JS, nessuna dipendenza. Rispetta prefers-reduced-motion.
   ============================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------------------------------------------------
     1) HERO TOGGLE — Condizioni di navigazione
     ------------------------------------------------------------- */
  (function heroToggle() {
    var root = document.querySelector("[data-vim-toggle]");
    if (!root) return;

    // Valori "Senza" e "Con" per ciascuna metrica (%), più stato del mare.
    var DATA = {
      off: { flow: 30, trace: 40, acc: 45, calm: 35, sea: "Mare mosso: molte manovre manuali." },
      on:  { flow: 100, trace: 100, acc: 98, calm: 95, sea: "Vento in poppa: rotta tracciata e fluida." }
    };

    var panel  = root.closest(".vim-hero__panel") || document;
    var opts   = root.querySelectorAll(".vim-toggle__opt");
    var seaEl  = root.querySelector("[data-vim-sea]");
    var bars   = panel.querySelectorAll("[data-bar]");
    var vals   = panel.querySelectorAll("[data-val]");

    function apply(state) {
      var d = DATA[state];
      root.setAttribute("data-state", state);
      opts.forEach(function (b) {
        var on = b.getAttribute("data-vim") === state;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (seaEl) seaEl.textContent = d.sea;
      bars.forEach(function (bar) { bar.style.width = d[bar.getAttribute("data-bar")] + "%"; });
      vals.forEach(function (v) { countTo(v, d[v.getAttribute("data-val")]); });
    }

    function countTo(el, target) {
      if (reduce) { el.textContent = target + "%"; return; }
      var start = parseInt(el.textContent, 10) || 0, t0 = null, dur = 550;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        el.textContent = Math.round(start + (target - start) * p) + "%";
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    opts.forEach(function (b) {
      b.addEventListener("click", function () { apply(b.getAttribute("data-vim")); });
    });
    apply("off");
  })();

  /* -------------------------------------------------------------
     2) COCKPIT DI BORDO — strumenti + telemetria
     ------------------------------------------------------------- */
  (function cockpit() {
    var root = document.querySelector("[data-cockpit]");
    if (!root) return;

    var gauges = root.querySelectorAll(".cockpit__gauge");
    var panels = root.querySelectorAll(".cockpit__panel");

    // Prepara i quadranti circolari (numero + didascalia)
    root.querySelectorAll(".cockpit__gaugeview").forEach(function (gv) {
      var unit = gv.getAttribute("data-unit") || "";
      var cap  = gv.getAttribute("data-caption") || "";
      gv.innerHTML =
        '<span class="cockpit__gv-num">0' + unit + '</span>' +
        '<span class="cockpit__gv-cap">' + cap + '</span>';
    });

    function animateGauge(gv) {
      if (!gv) return;
      var target = parseFloat(gv.getAttribute("data-telemetry")) || 0;
      var unit = gv.getAttribute("data-unit") || "";
      var num = gv.querySelector(".cockpit__gv-num");
      if (reduce) { gv.style.setProperty("--val", target); if (num) num.textContent = target + unit; return; }
      var t0 = null, dur = 850;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var v = target * (0.5 - Math.cos(Math.PI * p) / 2); // easeInOut
        gv.style.setProperty("--val", v);
        if (num) num.textContent = Math.round(v) + unit;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function select(key) {
      gauges.forEach(function (g) {
        var on = g.getAttribute("data-gauge") === key;
        g.classList.toggle("is-active", on);
        g.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach(function (p) {
        var on = p.getAttribute("data-panel") === key;
        p.hidden = !on;
        if (on) animateGauge(p.querySelector(".cockpit__gaugeview"));
      });
    }

    gauges.forEach(function (g) {
      g.addEventListener("click", function () { select(g.getAttribute("data-gauge")); });
    });

    // Anima il primo strumento quando il cockpit entra in viewport
    var started = false;
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !started) {
            started = true;
            var active = root.querySelector(".cockpit__panel:not([hidden]) .cockpit__gaugeview");
            animateGauge(active);
            io.disconnect();
          }
        });
      }, { threshold: 0.35 });
      io.observe(root);
    } else {
      var active = root.querySelector(".cockpit__panel:not([hidden]) .cockpit__gaugeview");
      animateGauge(active);
    }
  })();

  /* -------------------------------------------------------------
     3) TIMELINE — La Rotta della Fattura
     ------------------------------------------------------------- */
  (function route() {
    var root = document.querySelector("[data-route]");
    if (!root) return;

    var ports    = root.querySelectorAll(".route__port");
    var stages   = root.querySelectorAll(".route__stage");
    var boat     = root.querySelector("[data-route-boat]");
    var range    = root.querySelector("[data-route-range]");
    var fillPath = root.querySelector("[data-route-fill]");
    var bgPath   = root.querySelector(".route__path-bg");
    var svg      = root.querySelector(".route__svg");
    var LAST     = ports.length - 1;
    var VBW = 1000, VBH = 340;

    // Lunghezze cumulate ai nodi lungo la curva (viewBox 1000x340)
    var segs = [
      "M80,90 C190,90 190,230 300,230",
      "M300,230 C410,230 390,110 500,110",
      "M500,110 C610,110 590,230 700,230",
      "M700,230 C810,230 810,90 920,90"
    ];
    var lengths = [0], total = 0;
    if (svg) {
      var tmp = document.createElementNS("http://www.w3.org/2000/svg", "path");
      svg.appendChild(tmp);
      for (var s = 0; s < segs.length; s++) { tmp.setAttribute("d", segs[s]); total += tmp.getTotalLength(); lengths.push(total); }
      svg.removeChild(tmp);
    }
    // Niente transizioni CSS: la posizione è guidata frame-by-frame lungo il path.
    if (fillPath) { fillPath.style.transition = "none"; fillPath.style.strokeDasharray = total; fillPath.style.strokeDashoffset = total; }
    if (boat) boat.style.transition = "none";

    // Posiziona barca + riempimento a una data lunghezza d'arco L, seguendo la curva.
    function setAt(L) {
      if (fillPath) fillPath.style.strokeDashoffset = (total - L);
      if (boat && bgPath) {
        var pt = bgPath.getPointAtLength(L);
        boat.style.left = (pt.x / VBW * 100) + "%";
        boat.style.top  = (pt.y / VBH * 100) + "%";
      }
    }

    var curL = lengths[0], anim = null;
    function animateTo(targetL) {
      if (anim) cancelAnimationFrame(anim);
      if (reduce || !bgPath) { curL = targetL; setAt(targetL); return; }
      var startL = curL, t0 = null;
      var dur = Math.min(1100, Math.max(420, Math.abs(targetL - startL) * 1.05));
      function frame(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var e = 0.5 - Math.cos(Math.PI * p) / 2; // easeInOut
        curL = startL + (targetL - startL) * e;
        setAt(curL);
        if (p < 1) { anim = requestAnimationFrame(frame); } else { curL = targetL; anim = null; }
      }
      anim = requestAnimationFrame(frame);
    }

    function go(i) {
      i = Math.max(0, Math.min(LAST, i));
      root.setAttribute("data-step", i);
      ports.forEach(function (p, idx) {
        p.classList.toggle("is-active", idx === i);
        p.classList.toggle("is-done", idx < i);
        p.setAttribute("aria-selected", idx === i ? "true" : "false");
      });
      stages.forEach(function (st, idx) { st.hidden = idx !== i; });
      if (range && parseInt(range.value, 10) !== i) range.value = i;
      animateTo(lengths[i]);
    }

    ports.forEach(function (p, idx) { p.addEventListener("click", function () { go(idx); }); });
    if (range) range.addEventListener("input", function () { go(parseInt(range.value, 10)); });
    setAt(lengths[0]);           // stato iniziale senza animazione
    go(0);
  })();

  /* -------------------------------------------------------------
     4) VANTAGGI VIM — accordion "a dropdown" (timone statico)
        Sostituisce il timone interattivo: più semplice e leggibile su mobile.
     ------------------------------------------------------------- */
  (function advantages() {
    var acc = document.querySelector("[data-acc]");
    if (!acc) return;
    var items = Array.prototype.slice.call(acc.querySelectorAll(".acc__item"));

    function setOpen(item, open) {
      item.classList.toggle("is-open", open);
      var head = item.querySelector(".acc__head");
      if (head) head.setAttribute("aria-expanded", open ? "true" : "false");
      var body = item.querySelector(".acc__body");
      if (body) body.style.maxHeight = open ? (body.scrollHeight + "px") : "0px";
    }

    items.forEach(function (item) {
      var head = item.querySelector(".acc__head");
      if (!head) return;
      head.addEventListener("click", function () {
        var willOpen = !item.classList.contains("is-open");
        items.forEach(function (o) { if (o !== item) setOpen(o, false); });
        setOpen(item, willOpen);
      });
    });

    // Apri il primo per default e imposta le altezze corrette
    items.forEach(function (item, i) { setOpen(item, i === 0); });
    window.addEventListener("resize", function () {
      var open = acc.querySelector(".acc__item.is-open .acc__body");
      if (open) open.style.maxHeight = open.scrollHeight + "px";
    });
  })();

})();
