/* =============================================================
   motion.js — layer di movimento (stile editoriale)
   - Avvio hero cinetico (classe .is-loaded su <html>)
   - Smooth scroll inerziale con Lenis (MIT), progressivo
   - Scroll ancorato morbido per i link interni
   - Effetto "scroll text": le parole passano da trasparenti a
     piene mentre l'elemento scorre nel viewport (legato allo scroll)
   Rispetta prefers-reduced-motion.
   ============================================================= */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Avvio animazioni d'ingresso dell'hero.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add("is-loaded"); });
  });

  /* ---------- Scroll text: traduzione a FRASE INTERA + split parole + opacità ----------
     La frase viene tradotta come unità (via i18n) e SOLO DOPO spezzata in parole per
     l'effetto scroll: così non si perde il senso di una traduzione parola-per-parola.
     i18n.js salta questi elementi nel walk generico e notifica i cambi lingua. */
  var texts = [];

  function translate(s) {
    return (window.PARSEC_I18N && window.PARSEC_I18N.t) ? window.PARSEC_I18N.t(s) : s;
  }

  // Traduce ogni "run" di testo per intero, poi lo divide in <span class="w">.
  function renderNode(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var raw = n.textContent;
        if (!raw.trim()) return;
        var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
        var frag = document.createDocumentFragment();
        if (lead) frag.appendChild(document.createTextNode(lead));
        translate(raw.trim()).split(/(\s+)/).forEach(function (tok) {
          if (tok === "") return;
          if (/^\s+$/.test(tok)) frag.appendChild(document.createTextNode(tok));
          else { var s = document.createElement("span"); s.className = "w"; s.textContent = tok; frag.appendChild(s); }
        });
        if (trail) frag.appendChild(document.createTextNode(trail));
        node.replaceChild(frag, n);
      } else if (n.nodeType === 1) {
        renderNode(n);
      }
    });
  }

  // (ri)costruisce tutti i testi scroll nella lingua corrente
  function renderScrollTexts() {
    var els = document.querySelectorAll("[data-scroll-text]");
    if (!els.length) return;
    texts = [];
    els.forEach(function (el) {
      if (el.__stOrig == null) el.__stOrig = el.innerHTML;   // markup originale IT, una sola volta
      el.innerHTML = el.__stOrig;                             // ripristina la frase intera
      renderNode(el);                                         // traduce + spezza in parole
      el.classList.add("st-on");
      if (!reduce) {
        var words = Array.prototype.slice.call(el.querySelectorAll(".w"));
        words.forEach(function (w) { w.style.opacity = "0.14"; });
        texts.push({ el: el, words: words });
      }
    });
    if (!reduce) schedule();
  }

  renderScrollTexts();
  document.addEventListener("parseclang", renderScrollTexts);

  var ticking = false;
  function schedule() { if (!ticking) { ticking = true; requestAnimationFrame(updateTexts); } }
  function updateTexts() {
    ticking = false;
    var vh = window.innerHeight;
    var start = vh * 0.9, end = vh * 0.34;
    for (var t = 0; t < texts.length; t++) {
      var item = texts[t];
      var r = item.el.getBoundingClientRect();
      var p = (start - r.top) / (start - end);
      p = p < 0 ? 0 : (p > 1 ? 1 : p);
      var N = item.words.length, spread = p * (N + 6);
      for (var i = 0; i < N; i++) {
        var local = spread - i; local = local < 0 ? 0 : (local > 1 ? 1 : local);
        item.words[i].style.opacity = (0.14 + 0.86 * local).toFixed(3);
      }
    }
  }

  /* ---------- Smooth scroll (Lenis, progressivo) ---------- */
  var lenis = null;
  if (!reduce && typeof window.Lenis === "function") {
    lenis = new window.Lenis({
      duration: 1.1,
      easing: function (x) { return Math.min(1, 1.001 - Math.pow(2, -10 * x)); },
      smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    lenis.on("scroll", schedule);

    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute("href"); if (!id || id.length < 2) return;
      var target = document.querySelector(id); if (!target) return;
      e.preventDefault(); lenis.scrollTo(target, { offset: -90 });
    });
  }

  if (texts.length) {
    if (!lenis) window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
  }
})();
