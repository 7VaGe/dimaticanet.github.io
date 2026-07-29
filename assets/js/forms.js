/* =============================================================
   forms.js
   Invio reale dei form (Contatti + Candidatura) verso invia.php,
   che spedisce l'email via Microsoft Graph (app-only) lato server.
   - validazione nativa dei campi
   - controllo dimensione file (max 2MB) lato client
   - POST via fetch con FormData (multipart) → risposta JSON {ok,message}
   - messaggio verde (ok) / rosso (err) e stato "invio in corso"
   L'honeypot "website" e l'hidden "form" viaggiano dentro il FormData.
   ============================================================= */
(function () {
  "use strict";

  var MAX_FILE = 2 * 1024 * 1024; // 2MB

  function initForm(form) {
    var status    = form.querySelector(".form-status");
    var submitBtn = form.querySelector('[type="submit"]');
    var fileInput = form.querySelector('input[type="file"]');
    var fileNameEl = form.querySelector(".file-input__name");
    var btnHTML   = submitBtn ? submitBtn.innerHTML : "";

    function setStatus(msg, kind) { // kind: "ok" | "err" | "info" | ""
      if (!status) { if (msg) alert(msg); return; }
      status.textContent = msg;
      status.className = "form-status" + (kind ? " " + kind : "");
    }

    // Controllo dimensione file lato client (feedback immediato)
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files.length) {
          if (fileInput.files[0].size > MAX_FILE) {
            setStatus("Il file supera i 2MB. Scegline uno più piccolo.", "err");
            fileInput.value = "";
            if (fileNameEl) fileNameEl.textContent = "Nessun file selezionato";
          } else {
            setStatus("", "");
          }
        }
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Validazione nativa (required, email, checkbox privacy, file)
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var action = form.getAttribute("action") || "invia.php";
      var data   = new FormData(form);

      if (submitBtn) submitBtn.disabled = true;
      setStatus("Invio in corso…", "info");

      fetch(action, { method: "POST", body: data })
        .then(function (r) {
          return r.text().then(function (txt) {
            var j = null;
            try { j = JSON.parse(txt); } catch (err) { /* risposta non-JSON */ }
            return { httpOk: r.ok, data: j };
          });
        })
        .then(function (res) {
          var j = res.data;
          if (j && j.ok) {
            setStatus(j.message || "Grazie! La tua richiesta è stata inviata.", "ok");
            form.reset();
            if (fileNameEl) fileNameEl.textContent = "Nessun file selezionato";
          } else if (j && j.message) {
            setStatus(j.message, "err");
          } else {
            setStatus("Invio non riuscito. Riprova più tardi o scrivici via email.", "err");
          }
        })
        .catch(function () {
          setStatus("Errore di rete: controlla la connessione e riprova.", "err");
        })
        .then(function () {
          if (submitBtn) submitBtn.disabled = false;
          if (submitBtn && btnHTML) submitBtn.innerHTML = btnHTML;
          if (status) setTimeout(function () {
            status.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 60);
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-form]").forEach(initForm);
  });
})();
