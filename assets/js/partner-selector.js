/* =============================================================
   partner-selector.js  (solo pagina Partner)
   Selettore "stile GTA": reel coverflow di card partner con
   card in focus al centro, vicine sfocate ai lati, e pannello
   descrittivo laterale che si aggiorna alla selezione.
   Loghi: se il file immagine manca, mostra un wordmark elegante
   (si sostituisce da solo quando il logo reale viene aggiunto).
   ============================================================= */
(function () {
  "use strict";

  var PARTNERS = [
    {
      name: "SFI Consulting",
      topic: "Consulenza IT & Sviluppo",
      url: "https://www.sficonsulting.it",
      pending: false,
      logo: "assets/img/SFI_Consulting_Vector_Logo-Ju9uUD6u.svg",
      desc: "Consulenza informatica e sviluppo software su misura. Un partner con cui condividiamo metodo, cura del dettaglio e attenzione al risultato, dal disegno del progetto fino alla messa in produzione."
    },
    {
      name: "TPP",
      topic: "Automazione & Transportation",
      url: null,
      pending: true,
      logo: "assets/img/partners/tpp.png",
      desc: "Soluzioni di automazione e sistemi per il transportation e la logistica. Tecnologie che rendono i processi fisici più efficienti, tracciabili e integrati con i sistemi gestionali."
    },
    {
      name: "Parsec Consulting",
      topic: "SAP",
      url: null,
      pending: true,
      logo: "assets/img/partners/parsec-consulting.png",
      desc: "Consulenza SAP applicativa e di processo. Un riferimento sui progetti SAP, dall'analisi dei requisiti fino all'implementazione e all'evoluzione delle soluzioni."
    },
    {
      name: "Dimaticanet",
      topic: "SAP",
      url: null,
      pending: true,
      logo: "assets/img/partners/dimaticanet.png",
      desc: "Servizi e consulenza in ambito SAP. Competenze specialistiche a supporto dei progetti, con focus su affidabilità, continuità e qualità del delivery."
    }
  ];

  var root = document.getElementById("partnerSelector");
  if (!root) return;

  var N = PARTNERS.length;
  var active = 0;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var AUTO_MS = 7500, autoT = null, autoPaused = false;

  /* ---------- Costruzione DOM ---------- */
  function svgArrow(dir) {
    var d = dir === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6";
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  }

  function makeLogo(p) {
    var wrap = document.createElement("div");
    wrap.className = "ps-logo";
    var word = document.createElement("span");
    word.className = "ps-logo__word";
    word.textContent = p.name;
    wrap.appendChild(word);
    var img = new Image();
    img.className = "ps-logo__img";
    img.alt = p.name;
    img.onload = function () { wrap.classList.add("has-img"); wrap.insertBefore(img, word); };
    img.onerror = function () { /* resta il wordmark */ };
    img.src = p.logo;
    return wrap;
  }

  var stage = document.createElement("div");
  stage.className = "ps-stage";

  var btnPrev = document.createElement("button");
  btnPrev.className = "ps-nav ps-nav--prev";
  btnPrev.type = "button";
  btnPrev.setAttribute("aria-label", "Partner precedente");
  btnPrev.innerHTML = svgArrow("prev");

  var btnNext = document.createElement("button");
  btnNext.className = "ps-nav ps-nav--next";
  btnNext.type = "button";
  btnNext.setAttribute("aria-label", "Partner successivo");
  btnNext.innerHTML = svgArrow("next");

  var reel = document.createElement("div");
  reel.className = "ps-reel";

  var cards = [];
  PARTNERS.forEach(function (p, i) {
    var card = document.createElement("article");
    card.className = "ps-card" + (p.pending ? " ps-card--pending" : "");
    card.setAttribute("data-idx", i);

    var inner = document.createElement("div");
    inner.className = "ps-card__inner";
    inner.appendChild(makeLogo(p));

    if (p.pending) {
      var rib = document.createElement("span");
      rib.className = "ps-ribbon i18n-t";
      rib.textContent = "Sito in arrivo";
      inner.appendChild(rib);
    }

    card.appendChild(inner);
    card.addEventListener("click", function () {
      var off = circOff(i);
      if (off === 0) { if (p.url) window.open(p.url, "_blank", "noopener"); }
      else { active = i; render(); }
    });
    reel.appendChild(card);
    cards.push(card);
  });

  stage.appendChild(btnPrev);
  stage.appendChild(reel);
  stage.appendChild(btnNext);

  /* ---------- Pannello laterale ---------- */
  var panel = document.createElement("aside");
  panel.className = "ps-panel";
  panel.innerHTML =
    '<span class="ps-status"></span>' +
    '<h3 class="ps-name"></h3>' +
    '<span class="ps-topic"></span>' +
    '<p class="ps-desc"></p>' +
    '<div class="ps-action"></div>' +
    '<div class="ps-dots"></div>';

  root.appendChild(stage);
  root.appendChild(panel);

  var elStatus = panel.querySelector(".ps-status");
  var elName   = panel.querySelector(".ps-name");
  var elTopic  = panel.querySelector(".ps-topic");
  var elDesc   = panel.querySelector(".ps-desc");
  var elAction = panel.querySelector(".ps-action");
  var elDots   = panel.querySelector(".ps-dots");

  PARTNERS.forEach(function (p, i) {
    var dot = document.createElement("button");
    dot.className = "ps-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", p.name);
    dot.addEventListener("click", function () { active = i; render(); });
    elDots.appendChild(dot);
  });
  var dots = elDots.querySelectorAll(".ps-dot");

  /* ---------- Offset circolare ---------- */
  function circOff(i) {
    var off = ((i - active) % N + N) % N;
    if (off > N / 2) off -= N;
    return off;
  }

  /* ---------- Posizionamento coverflow ---------- */
  function render() {
    cards.forEach(function (card, i) {
      var off = circOff(i);
      var abs = Math.abs(off);
      var t, op, z, blur, pe;
      if (off === 0) {
        t = "translateX(0) translateZ(70px) rotateY(0deg) scale(1)";
        op = 1; z = 30; blur = "none"; pe = "auto";
        card.classList.add("is-active");
      } else if (abs === 1) {
        var sx = off < 0 ? "-62%" : "62%";
        var ry = off < 0 ? "30deg" : "-30deg";
        t = "translateX(" + sx + ") translateZ(-70px) rotateY(" + ry + ") scale(.8)";
        op = 0.5; z = 20; blur = "blur(1.5px)"; pe = "auto";
        card.classList.remove("is-active");
      } else {
        t = "translateX(0) translateZ(-260px) scale(.55)";
        op = 0; z = 0; blur = "blur(3px)"; pe = "none";
        card.classList.remove("is-active");
      }
      card.style.transform = t;
      card.style.opacity = op;
      card.style.zIndex = z;
      card.style.filter = blur;
      card.style.pointerEvents = pe;
    });

    var p = PARTNERS[active];
    elStatus.textContent = p.pending ? "Sito in arrivo" : "Partner attivo";
    elStatus.className = "ps-status i18n-t" + (p.pending ? " is-pending" : " is-active");
    elName.textContent = p.name;
    elTopic.textContent = p.topic;
    elTopic.className = "ps-topic i18n-t";
    elDesc.textContent = p.desc;
    elDesc.className = "ps-desc i18n-t";

    if (p.pending || !p.url) {
      elAction.innerHTML = '<span class="ps-cta ps-cta--disabled i18n-t">Sito in arrivo</span>';
    } else {
      elAction.innerHTML = '<a class="ps-cta" href="' + p.url + '" target="_blank" rel="noopener"><span class="i18n-t">Visita il sito</span>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>';
    }

    dots.forEach(function (d, i) { d.classList.toggle("is-on", i === active); });

    // micro-animazione del pannello
    panel.classList.remove("ps-panel--in");
    void panel.offsetWidth;
    panel.classList.add("ps-panel--in");

    // rilancia lo scorrimento automatico (7,5s = tempo di lettura)
    scheduleAuto();
  }

  function step(dir) { active = (active + dir + N) % N; render(); }

  // Scorrimento automatico: avanza da solo, come l'anello della home.
  function scheduleAuto() {
    clearTimeout(autoT);
    if (reduce || autoPaused) return;
    autoT = setTimeout(function () { active = (active + 1) % N; render(); }, AUTO_MS);
  }

  // In pausa quando il puntatore e' sul selettore (hover desktop / tocco mobile)
  root.addEventListener("pointerenter", function () { autoPaused = true; clearTimeout(autoT); });
  root.addEventListener("pointerleave", function () { autoPaused = false; scheduleAuto(); });

  btnPrev.addEventListener("click", function () { step(-1); });
  btnNext.addEventListener("click", function () { step(1); });

  root.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
    else if (e.key === "ArrowRight") { step(1); e.preventDefault(); }
  });

  /* ---------- Drag / swipe orizzontale ---------- */
  reel.style.touchAction = "pan-y";
  var dragging = false, downX = 0, downY = 0, axis = null, capId = null, consumed = false;

  reel.addEventListener("pointerdown", function (e) {
    dragging = true; downX = e.clientX; downY = e.clientY;
    axis = null; consumed = false; capId = e.pointerId;
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - downX, dy = e.clientY - downY;
    if (axis === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis === "x") { try { reel.setPointerCapture(capId); } catch (err) {} }
    }
    if (axis !== "x") return;
    if (!consumed && Math.abs(dx) > 60) {   // uno step per swipe
      step(dx < 0 ? 1 : -1);
      consumed = true;
    }
  });
  function endDrag() {
    dragging = false; axis = null;
    if (capId != null) { try { reel.releasePointerCapture(capId); } catch (err) {} }
  }
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // Blocca la navigazione se lo swipe ha spostato la selezione
  reel.addEventListener("click", function (e) {
    if (consumed) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  render();
})();
