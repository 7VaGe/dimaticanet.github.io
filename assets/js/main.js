/* =============================================================
   main.js
   Interazioni di pagina:
   - Reveal on scroll (IntersectionObserver)
   - Attivo indipendentemente dall'iniezione di header/footer
   ============================================================= */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {

    var revealEls = document.querySelectorAll(".reveal");

    // Fallback: se IntersectionObserver non è supportato, mostra tutto
    if (!("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target); // anima una sola volta
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px"
    });

    revealEls.forEach(function (el) { observer.observe(el); });

    /* Tilt 3D rimosso: con il reticolo sulle card causava ripaint e scatti.
       Le card ora usano solo l'hover CSS (più fluido). */
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- ZOOM-IN CTA ancorato allo scroll: ogni .scale-card sopra al footer
       parte più piccola e si allarga (scala 0.8 -> 1) fino a riempire la section;
       gli angoli si squadrano e, essendo dello stesso colore del footer, si fondono. ---- */
    var zoomCards = document.querySelectorAll(".scale-card");
    if (zoomCards.length) {
      if (reduce) {
        zoomCards.forEach(function (c) { c.style.transform = "none"; c.style.borderRadius = "0px"; });
      } else {
        var zTicking = false;
        var zUpdate = function () {
          zTicking = false;
          var vh = window.innerHeight;
          var doc = document.documentElement;
          // A fondo pagina la card è sopra il footer: forziamo l'espansione
          // completa così angoli squadrati + stesso colore la fondono col footer.
          var atBottom = (window.scrollY + vh) >= (doc.scrollHeight - 2);
          zoomCards.forEach(function (c) {
            var r = c.getBoundingClientRect();
            var center = r.top + r.height / 2;
            var p = (vh - center) / (vh * 0.6);
            p = p < 0 ? 0 : (p > 1 ? 1 : p);
            if (atBottom) p = 1;
            c.style.transform = "scale(" + (0.8 + 0.2 * p).toFixed(3) + ")";
            c.style.borderRadius = Math.round((1 - p) * 26) + "px";
          });
        };
        var zOnScroll = function () { if (!zTicking) { zTicking = true; requestAnimationFrame(zUpdate); } };
        window.addEventListener("scroll", zOnScroll, { passive: true });
        window.addEventListener("resize", zOnScroll);
        zUpdate();
      }
    }

    /* ---- File input personalizzato: mostra il nome del file scelto ---- */
    document.querySelectorAll(".file-input__native").forEach(function (inp) {
      var box = inp.closest(".file-input");
      var nameEl = box ? box.querySelector(".file-input__name") : null;
      if (!nameEl) return;
      inp.addEventListener("change", function () {
        nameEl.textContent = (inp.files && inp.files.length) ? inp.files[0].name : "Nessun file selezionato";
      });
    });
  });
})();
