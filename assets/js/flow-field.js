/* =============================================================
   flow-field.js  —  Sfondo "neurale" a flow field (canvas)
   Porting in Vanilla JS del componente React NeuralBackground,
   adattato alla struttura statica del sito (niente React/JSX).

   Uso: mettere gli attributi su un contenitore posizionato (relative):
     <section class="page-hero flow-hero" data-flow-field
              data-ff-color="#818cf8" data-ff-trail="0.1"
              data-ff-count="600" data-ff-speed="0.8"> ... </section>
   Lo script inietta un <canvas> di sfondo e anima le particelle.
   Algoritmo identico all'originale: flow field + repulsione del mouse
   + attrito + aging + scie (trail) con gestione High-DPI.
   ============================================================= */
(function () {
  "use strict";

  var containers = document.querySelectorAll("[data-flow-field]");
  if (!containers.length) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  containers.forEach(function (container) {
    // --- Config da data-attributes (con default come nel componente) ---
    var color   = container.getAttribute("data-ff-color") || "#bfe8ff";
    var trail   = parseFloat(container.getAttribute("data-ff-trail")); if (isNaN(trail)) trail = 0.15;
    var count   = parseInt(container.getAttribute("data-ff-count"), 10); if (isNaN(count)) count = 600;
    var speed   = parseFloat(container.getAttribute("data-ff-speed")); if (isNaN(speed)) speed = 1;
    // Meno particelle su mobile per performance
    if (window.innerWidth < 768) count = Math.round(count * 0.5);

    // --- Canvas iniettato dietro al contenuto ---
    var canvas = document.createElement("canvas");
    canvas.className = "ff-canvas";
    container.insertBefore(canvas, container.firstChild);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var width = container.clientWidth;
    var height = container.clientHeight;
    var particles = [];
    var rafId = null;
    var mouse = { x: -1000, y: -1000 };

    // --- Particella (stessa fisica dell'originale) ---
    function Particle() { this.reset(true); }
    Particle.prototype.reset = function (spread) {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = 0; this.vy = 0; this.age = 0;
      this.life = Math.random() * 200 + 100;
    };
    Particle.prototype.update = function () {
      // 1. Flow field: angolo derivato dalla posizione
      var angle = (Math.cos(this.x * 0.005) + Math.sin(this.y * 0.005)) * Math.PI;
      // 2. Forza dal campo
      this.vx += Math.cos(angle) * 0.2 * speed;
      this.vy += Math.sin(angle) * 0.2 * speed;
      // 3. Repulsione dal mouse
      var dx = mouse.x - this.x, dy = mouse.y - this.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var R = 150;
      if (distance < R) {
        var force = (R - distance) / R;
        this.vx -= dx * force * 0.05;
        this.vy -= dy * force * 0.05;
      }
      // 4. Velocità + attrito
      this.x += this.vx; this.y += this.vy;
      this.vx *= 0.95; this.vy *= 0.95;
      // 5. Aging
      this.age++;
      if (this.age > this.life) this.reset();
      // 6. Wrap ai bordi
      if (this.x < 0) this.x = width; if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height; if (this.y > height) this.y = 0;
    };
    Particle.prototype.draw = function (c) {
      c.fillStyle = color;
      var alpha = 1 - Math.abs((this.age / this.life) - 0.5) * 2;   // fade in/out
      c.globalAlpha = alpha;
      c.fillRect(this.x, this.y, 1.5, 1.5);
    };

    function init() {
      var dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);   // reset prima di riscalare
      ctx.scale(dpr, dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      particles = [];
      for (var i = 0; i < count; i++) particles.push(new Particle());
    }

    function animate() {
      // Scie: invece di pulire, disegno un velo scuro semitrasparente
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(20, 52, 92, " + trail + ")";
      ctx.fillRect(0, 0, width, height);
      for (var i = 0; i < particles.length; i++) { particles[i].update(); particles[i].draw(ctx); }
      rafId = requestAnimationFrame(animate);
    }

    // --- Eventi ---
    function onResize() { width = container.clientWidth; height = container.clientHeight; init(); }
    function onMove(e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; }
    function onLeave() { mouse.x = -1000; mouse.y = -1000; }

    init();
    if (reduce) {
      // Frame statico: un solo passaggio, nessuna animazione continua
      for (var k = 0; k < particles.length; k++) particles[k].draw(ctx);
    } else {
      animate();
      window.addEventListener("resize", onResize);
      container.addEventListener("mousemove", onMove);
      container.addEventListener("mouseleave", onLeave);
    }

    // --- Cleanup (nessun memory leak) ---
    window.addEventListener("pagehide", function () {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
    }, { once: true });
  });
})();
