/* =============================================================
   bg-field.js
   Sfondo animato professionale (stile animmasterlib, adattato B2B):
   - campo di LINEE FLUIDE topografiche (data-streams) in blu/ciano
   - particelle sottili alla deriva
   Sottile, elegante, non invadente. Canvas fisso dietro ai contenuti.
   Iniettato automaticamente e presente su tutte le pagine.
   ============================================================= */
(function () {
  "use strict";

  // Canvas auto-iniettato dietro a tutto (z-index molto basso)
  var canvas = document.getElementById("bg-field");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "bg-field";
    (document.body || document.documentElement).appendChild(canvas);
  }
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W, H, DPR;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = Math.floor(window.innerWidth * DPR);
    H = canvas.height = Math.floor(window.innerHeight * DPR);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---- Linee fluide (topografiche) ---- */
  var LINES = window.innerWidth < 768 ? 5 : 8;
  var lines = [];
  for (var i = 0; i < LINES; i++) {
    lines.push({
      baseY: (i + 0.5) / LINES,          // posizione verticale relativa
      amp: 0.03 + Math.random() * 0.05,   // ampiezza onda (relativa a H)
      freq: 1.2 + Math.random() * 1.8,    // frequenza
      speed: 0.06 + Math.random() * 0.10, // velocità di deriva
      phase: Math.random() * Math.PI * 2
    });
  }

  /* ---- Particelle sottili ---- */
  var PCOUNT = window.innerWidth < 768 ? 26 : 54;
  var parts = [];
  for (var p = 0; p < PCOUNT; p++) {
    parts.push({
      x: Math.random(), y: Math.random(),
      r: (Math.random() * 1.2 + 0.4),
      vx: (Math.random() - 0.5) * 0.00012,
      vy: (Math.random() - 0.5) * 0.00012,
      a: Math.random() * 0.5 + 0.2
    });
  }

  function drawLine(l, t) {
    var y0 = l.baseY * H;
    var amp = l.amp * H;
    ctx.beginPath();
    var steps = 60;
    for (var s = 0; s <= steps; s++) {
      var x = (s / steps) * W;
      // somma di due sinusoidi per un profilo "topografico" organico
      var yy = y0
        + Math.sin((s / steps) * Math.PI * l.freq + t * l.speed + l.phase) * amp
        + Math.sin((s / steps) * Math.PI * l.freq * 2.3 + t * l.speed * 1.6) * amp * 0.35;
      if (s === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    var grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0.0, "rgba(43,144,217,0)");
    grad.addColorStop(0.5, "rgba(47,208,230,0.5)");
    grad.addColorStop(1.0, "rgba(43,144,217,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = DPR;
    ctx.stroke();
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // linee (opacità globale bassa → sottile)
    ctx.globalAlpha = 0.28;
    for (var i = 0; i < lines.length; i++) drawLine(lines[i], t);

    // particelle
    ctx.globalAlpha = 1;
    for (var k = 0; k < parts.length; k++) {
      var pt = parts[k];
      pt.x += pt.vx; pt.y += pt.vy;
      if (pt.x < 0) pt.x = 1; if (pt.x > 1) pt.x = 0;
      if (pt.y < 0) pt.y = 1; if (pt.y > 1) pt.y = 0;
      ctx.beginPath();
      ctx.arc(pt.x * W, pt.y * H, pt.r * DPR, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(150,197,255," + pt.a * 0.6 + ")";
      ctx.fill();
    }
  }

  if (reduce) {
    draw(0);
  } else {
    var start = performance.now();
    (function loop(now) {
      requestAnimationFrame(loop);
      draw((now - start) / 1000);
    })(start);
  }
})();
