/* =============================================================
   home-scenes.js  (solo home)
   1) SCROLL-SCALE: una card parte a tutto schermo e si riduce/arrotonda.
   2) CAROSELLO 3D: anello di card che ruotano (auto-rotate + drag/touch).
   ============================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isTouch = window.matchMedia("(pointer: coarse)").matches;

  /* ---------- 1. SCROLL-SCALE ---------- */
  var scaleScene = document.querySelector(".scale-scene");
  var scaleCard  = document.querySelector(".scale-card");

  function sceneProgress(el) {
    var rect = el.getBoundingClientRect();
    var total = el.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / total));
  }

  /* ---------- 2. CAROSELLO 3D ---------- */
  var ring = document.getElementById("ring");
  var radius = 0, rot = 0, vel = 0, dragging = false, lastX = 0;
  var downX = 0, downY = 0, moved = false;
  var axisLocked = false, isHoriz = false, captured = false, capId = null;

  if (ring) {
    var cards = ring.querySelectorAll(".ring-card");
    var N = cards.length;
    var angle = 360 / N;
    var cw = ring.offsetWidth || 300;
    radius = Math.round((cw / 2) / Math.tan(Math.PI / N)) + 30;
    for (var i = 0; i < N; i++) {
      cards[i].style.transform = "rotateY(" + (i * angle) + "deg) translateZ(" + radius + "px)";
    }

    // Scroll verticale nativo, gesto orizzontale gestito dal JS (drag dell'anello)
    ring.style.touchAction = "pan-y";

    var DRAG = isTouch ? 0.26 : 0.35;   // sensibilità del trascinamento

    ring.addEventListener("pointerdown", function (e) {
      dragging = true; lastX = e.clientX; vel = 0;
      downX = e.clientX; downY = e.clientY;
      moved = false; axisLocked = false; isHoriz = false;
      captured = false; capId = e.pointerId;
    });

    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var totdx = e.clientX - downX, totdy = e.clientY - downY;

      // Al primo movimento significativo decido l'asse del gesto
      if (!axisLocked && (Math.abs(totdx) > 6 || Math.abs(totdy) > 6)) {
        axisLocked = true;
        isHoriz = Math.abs(totdx) > Math.abs(totdy);
        if (isHoriz) {
          moved = true;
          try { ring.setPointerCapture(capId); captured = true; } catch (err) {}
        }
      }
      // Gesto verticale: non ruoto, lascio scorrere la pagina
      if (axisLocked && !isHoriz) { dragging = false; return; }

      if (axisLocked && isHoriz) {
        var dx = e.clientX - lastX;
        rot += dx * DRAG;
        vel = dx * DRAG;
      }
      lastX = e.clientX;
    });

    function endDrag() {
      dragging = false;
      if (captured) { try { ring.releasePointerCapture(capId); } catch (err) {} captured = false; }
    }
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    // Dopo un trascinamento reale, il clic su foto/CTA non deve navigare
    ring.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    // Rotazione legata allo scroll: solo su desktop (su touch disorienta)
    if (!isTouch) {
      var lastScrollY = window.scrollY;
      window.addEventListener("scroll", function () {
        var y = window.scrollY;
        rot += (y - lastScrollY) * 0.06;
        lastScrollY = y;
      }, { passive: true });
    }

    ring.style.transform = "translateZ(-" + radius + "px) rotateY(0deg)";
  }

  /* ---------- Loop condiviso ---------- */
  var curScale = 0;
  function frame() {
    requestAnimationFrame(frame);

    if (scaleCard) {
      var p = sceneProgress(scaleScene);
      curScale += (p - curScale) * 0.08;
      var s = 1 - curScale * 0.30;
      scaleCard.style.transform = "scale(" + s.toFixed(3) + ")";
      scaleCard.style.borderRadius = Math.round(curScale * 40) + "px";
      scaleCard.classList.toggle("framed", curScale > 0.12);
    }

    if (ring) {
      if (!dragging || (axisLocked && !isHoriz)) {
        vel *= 0.95;                        // inerzia
        rot += vel + 0.12;                  // auto-rotate lento
      }
      ring.style.transform = "translateZ(-" + radius + "px) rotateY(" + rot + "deg)";
    }
  }

  if (reduce) {
    if (scaleCard) { scaleCard.style.transform = "scale(0.78)"; scaleCard.style.borderRadius = "32px"; scaleCard.classList.add("framed"); }
    if (ring) ring.style.transform = "translateZ(-" + radius + "px) rotateY(-18deg)";
  } else {
    frame();
  }
})();
