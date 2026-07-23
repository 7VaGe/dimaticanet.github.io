/* =============================================================
   home.js — interazioni della home (stile editoriale minimale)
   Rotator "Cosa facciamo" (01 / 03) con prev/next + auto-advance.
   Vanilla JS, rispetta prefers-reduced-motion.
   ============================================================= */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-rotator]").forEach(function (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-rot-item]"));
    if (!items.length) return;
    var curEl  = root.querySelector("[data-rot-cur]");
    var totEl  = root.querySelector("[data-rot-tot]");
    var prev   = root.querySelector("[data-rot-prev]");
    var next   = root.querySelector("[data-rot-next]");
    var i = 0, timer = null;

    function pad(n) { return (n < 10 ? "0" : "") + n; }
    if (totEl) totEl.textContent = pad(items.length);

    function show(n) {
      i = (n + items.length) % items.length;
      items.forEach(function (el, idx) { el.classList.toggle("is-active", idx === i); });
      if (curEl) curEl.textContent = pad(i + 1);
    }
    function go(n) { show(n); restart(); }
    function restart() {
      if (reduce) return;
      clearInterval(timer);
      timer = setInterval(function () { show(i + 1); }, 5500);
    }

    if (prev) prev.addEventListener("click", function () { go(i - 1); });
    if (next) next.addEventListener("click", function () { go(i + 1); });

    show(0);
    // Avvia l'auto-advance solo quando il blocco è in vista
    if ("IntersectionObserver" in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) restart(); else clearInterval(timer);
        });
      }, { threshold: 0.3 });
      io.observe(root);
    } else {
      restart();
    }
  });
})();
