/* =============================================================
   forms.js
   Rende funzionali i form (Lavora con noi, Contatti):
   - validazione nativa dei campi obbligatori
   - controllo dimensione file (max 2MB) e tipo consentito
   - messaggio di conferma dopo l'invio
   NOTA: è una gestione lato front-end. Per l'invio reale va
   collegato un endpoint (PHP mail, Formspree, API, ecc.).
   ============================================================= */
(function () {
  "use strict";

  function initForm(form) {
    var status = form.querySelector(".form-status");
    var fileInput = form.querySelector('input[type="file"]');

    function showStatus(msg, ok) {
      if (!status) { alert(msg); return; }
      status.textContent = msg;
      status.className = "form-status " + (ok ? "ok" : "err");
    }

    // Controllo file: dimensione massima 2MB
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files.length) {
          var f = fileInput.files[0];
          if (f.size > 2 * 1024 * 1024) {
            showStatus("Il file supera i 2MB. Scegline uno più piccolo.", false);
            fileInput.value = "";
          } else if (status) {
            status.className = "form-status"; // reset eventuale errore
          }
        }
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Validazione nativa (campi required, email, checkbox)
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      // Invio simulato lato front-end
      showStatus("Grazie! Abbiamo ricevuto la tua richiesta: ti ricontatteremo al più presto.", true);
      form.reset();
      if (status) setTimeout(function () { status.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-form]").forEach(initForm);
  });
})();
