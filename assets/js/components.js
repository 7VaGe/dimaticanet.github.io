/* =============================================================
   components.js
   Iniezione DRY di header e footer condivisi su tutte le pagine.
   Ogni pagina definisce <body data-page="..."> e contiene:
     <div id="site-header"></div>  ... <div id="site-footer"></div>
   Vantaggio: un solo punto di modifica per nav e footer,
   niente duplicazione di markup tra le pagine.
   ============================================================= */
(function () {
  "use strict";

  // Logo del brand
  var LOGO = '<img src="assets/img/partners/logo-dimaticanet.jpg" alt="DimaticaNet" class="logo-img" style="height:36px; width:auto; display:inline-block; vertical-align:middle; background:#fff; padding:5px 9px; border-radius:8px;" />';
  // Voci di navigazione. key = data-page della pagina attiva.
  var NAV = [
    { key: "home",       label: "Home",          href: "index.html" },
    { key: "chi-siamo",  label: "Chi Siamo",     href: "chi-siamo.html" },
    { key: "solutions",  label: "Soluzioni", href: "solutions.html", mega: [
        { title: "SAP Applications", subtitle: "Core business", items: [
            { label: "ERP SAP S/4HANA",             href: "sap-s4hana.html" },
            { label: "SAP Digital Platform",        href: "sap-digital-platform.html" },
            { label: "SAP Security",                href: "sap-security.html" },
            { label: "SAP on Cloud",                href: "sap-cloud.html" },
            { label: "SAP Supply Chain Management", href: "sap-scm.html" }
          ]},
        { title: "SAP VIM", subtitle: "Vendor Invoice Management", linkless: true, more: "sap-vim.html", items: [
            { label: "OCR & acquisizione automatica" },
            { label: "Workflow approvativi" },
            { label: "Audit trail & compliance" },
            { label: "Integrazione S/4HANA" }
          ]}
      ]},
    { key: "partner",    label: "Il gruppo",      href: "partner.html" },
    { key: "lavora",     label: "Lavora con noi", href: "lavora-con-noi.html" }
  ];

  function iconArrow() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
  }

  function buildHeader(active) {
    var links = NAV.map(function (item) {
      var isActive = item.key === active ? " active" : "";
      // voce con mega-menu (Solutions): colonne generate da item.mega
      if (item.mega) {
        var cols = item.mega.map(function (col) {
          var lis;
          if (col.linkless) {
            // voci non cliccabili + un unico "Scopri" che rimanda alla pagina
            lis = col.items.map(function (c) {
              return '<span class="mega-col__item">' + c.label + '</span>';
            }).join("");
            if (col.more) {
              lis += '<a class="mega-col__more" href="' + col.more + '">Scopri ' + iconArrow() + '</a>';
            }
          } else {
            lis = col.items.map(function (c) {
              return '<a href="' + c.href + '">' + c.label + '</a>';
            }).join("");
          }
          return '<div class="mega-col">' +
                   '<span class="mega-col__title">' + col.title + '</span>' +
                   '<span class="mega-col__sub">' + col.subtitle + '</span>' +
                   lis +
                 '</div>';
        }).join("");
        return '<li class="has-drop has-mega">' +
                 '<a href="' + item.href + '" class="' + isActive.trim() + '">' + item.label + '</a>' +
                 '<div class="dropdown mega">' + cols + '</div>' +
               '</li>';
      }
      if (item.children) {
        var sub = item.children.map(function (c) {
          return '<a href="' + c.href + '">' + c.label + '</a>';
        }).join("");
        return '<li class="has-drop">' +
                 '<a href="' + item.href + '" class="' + isActive.trim() + '">' + item.label + '</a>' +
                 '<div class="dropdown">' + sub + '</div>' +
               '</li>';
      }
      return '<li><a href="' + item.href + '" class="' + isActive.trim() + '">' + item.label + '</a></li>';
    }).join("");

    return '' +
      '<header class="site-header" id="header">' +
        '<nav class="nav container" aria-label="Navigazione principale">' +
          '<a href="index.html" class="brand">' + LOGO + '</a>'+
          '<ul class="nav-links" id="navLinks">' + links + '</ul>' +
          '<div class="nav-cta">' +
            '<button class="lang-toggle" id="langToggle" type="button" aria-label="IT / EN">' +
              '<span class="lt-it is-on"><svg class="lt-flag" viewBox="0 0 3 2" aria-hidden="true"><rect width="3" height="2" fill="#f5f5f5"/><rect width="1" height="2" fill="#009246"/><rect x="2" width="1" height="2" fill="#ce2b37"/></svg>IT</span>' +
              '<span class="lt-en"><svg class="lt-flag" viewBox="0 0 60 30" aria-hidden="true"><rect width="60" height="30" fill="#012169"/><path d="M0 0L60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0L60 30M60 0L0 30" stroke="#C8102E" stroke-width="3"/><path d="M30 0V30M0 15H60" stroke="#fff" stroke-width="10"/><path d="M30 0V30M0 15H60" stroke="#C8102E" stroke-width="6"/></svg>EN</span>' +
            '</button>' +
            '<button class="nav-toggle" id="navToggle" aria-label="Apri menu" aria-expanded="false"><span></span></button>' +
          '</div>' +
        '</nav>' +
      '</header>';
  }

  function buildFooter() {
    var year = new Date().getFullYear();
    return '' +
      '<footer class="site-footer">' +
        '<div class="container">' +
          '<div class="footer-grid">' +
            '<div class="footer-brand">' +
              '<a href="index.html" class="brand" style="margin-bottom:1rem">' + LOGO +
              '<p>Consulenza SAP IT applicativa e tecnico-sistemistica. Collaboriamo con partner e clienti SAP per fornire soluzioni eccellenti.</p>' +
            '</div>' +
            '<div>' +
              '<h4>Solutions</h4>' +
              '<a href="solutions.html#applications">SAP Applications</a>' +
              '<a href="sap-vim.html">SAP VIM</a>' +
            '</div>' +
            '<div>' +
              '<h4>Azienda</h4>' +
              '<a href="chi-siamo.html">Chi Siamo</a>' +
              '<a href="lavora-con-noi.html">Lavora con noi</a>' +
              '<a href="contatti.html">Contattaci</a>' +
            '</div>' +
            '<div>' +
              '<h4>Contatti</h4>' +
              '<p>Via Caravaggio n. 71<br>58019 Monte Argentario (GR) — Porto Ercole</p>' +
              '<a href="mailto:amministrazione@dimaticanet.it">amministrazione@dimaticanet.it</a>' +
              '<a href="mailto:dimaticanet@pec.it">PEC: dimaticanet@pec.it</a>' +
              '<p>P.IVA 03768880365</p>' +
            '</div>' +
          '</div>' +
          '<div class="footer-bottom">' +
            '<span>© ' + year + ' DimaticaNet Srl — <span class="i18n-t">Tutti i diritti riservati.</span></span>' +
            '<div class="socials">' +
              '<a href="https://www.linkedin.com/company/dimanautica/" target="_blank" rel="noopener" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05 4 0 4.74 2.64 4.74 6.07V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21H9z"/></svg></a>' +
              '<a href="mailto:amministrazione@dimaticanet.it" aria-label="Email"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></a>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  // Interazioni: header "scrolled" allo scroll + hamburger mobile
  function initNavInteractions() {
    var header = document.getElementById("header");
    var toggle = document.getElementById("navToggle");

    var onScroll = function () {
      if (window.scrollY > 20) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = document.body.classList.toggle("menu-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Chiudi menu" : "Apri menu");
      });
      document.querySelectorAll("#navLinks a").forEach(function (a) {
        a.addEventListener("click", function () { document.body.classList.remove("menu-open"); });
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var active = document.body.getAttribute("data-page") || "";
    var h = document.getElementById("site-header");
    var f = document.getElementById("site-footer");
    if (h) h.innerHTML = buildHeader(active);
    if (f) f.innerHTML = buildFooter();
    initNavInteractions();

    // grana pellicola + vignettatura globali (iniettate una sola volta)
    if (!document.querySelector(".film-grain")) {
      var vig = document.createElement("div"); vig.className = "vignette-global";
      var grain = document.createElement("div"); grain.className = "film-grain";
      document.body.appendChild(vig);
      document.body.appendChild(grain);
    }

    if (!document.getElementById("i18n-loader")) {
      var i18s = document.createElement("script");
      i18s.id = "i18n-loader"; i18s.src = "assets/js/i18n.js";
      document.body.appendChild(i18s);
    }
  });
})();
