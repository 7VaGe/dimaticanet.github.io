<?php
/* =============================================================
   invia.php — Endpoint invio email via Microsoft Graph (app-only)
   -------------------------------------------------------------
   Flusso:
   1) Riceve la POST dai form (contatti / lavora) via forms.js
   2) Valida i dati + honeypot; per la candidatura salva il CV
      in una cartella protetta FUORI dalla web root
   3) Ottiene un token OAuth2 (client_credentials) da Entra
   4) Invia la mail con POST /users/{sender}/sendMail
   5) Risponde JSON: { ok: bool, message: string }

   NB: nessun SMTP, nessun PHPMailer — solo cURL verso Graph.
   NB: config.php sta UNA CARTELLA SOPRA la web root.
   ============================================================= */

declare(strict_types=1);

// ---- Risposta sempre JSON ----------------------------------
header('Content-Type: application/json; charset=utf-8');

/** Termina restituendo JSON e chiude lo script. */
function json_out(bool $ok, string $message, int $http = 200): void {
    http_response_code($http);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---- Solo POST ---------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    json_out(false, 'Metodo non consentito.', 405);
}

// ---- Config: prima FUORI dalla web root (consigliato), poi accanto a invia.php (fallback) ----
$configCandidates = [
    dirname(__DIR__) . '/config.php', // una cartella sopra la web root (sicuro)
    __DIR__ . '/config.php',          // stessa cartella di invia.php (comodo in locale)
];
$configPath = null;
foreach ($configCandidates as $cand) {
    if (is_file($cand)) { $configPath = $cand; break; }
}
if ($configPath === null) {
    json_out(false, 'Configurazione mancante sul server.', 500);
}
$cfg = require $configPath;

// ---- CORS (opzionale: solo se il sito è su un dominio diverso dal backend) ----
if (!empty($cfg['allowed_origins']) && !empty($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $cfg['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
}

// ---- Helper input ------------------------------------------
function post(string $k, string $def = ''): string {
    return trim((string)($_POST[$k] ?? $def));
}

// ---- Anti-spam: honeypot -----------------------------------
// I bot compilano il campo nascosto "website". Se è pieno,
// rispondiamo "ok" senza inviare nulla (li lasciamo credere).
if (post('website') !== '') {
    json_out(true, 'Grazie! Messaggio inviato.');
}

// ---- Tipo di form ------------------------------------------
$formType = post('form');
if (!in_array($formType, ['contatti', 'lavora'], true)) {
    json_out(false, 'Form non riconosciuto.', 400);
}

// ---- Validazione campi comuni ------------------------------
$nome  = post('nome');
$email = post('email');
$msg   = post('msg');

if ($nome === '' || mb_strlen($nome) > 120) {
    json_out(false, 'Inserisci un nome valido.', 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_out(false, 'Inserisci un indirizzo email valido.', 400);
}

// ---- Costruzione contenuto per tipo ------------------------
$attachments = [];

if ($formType === 'contatti') {
    $azienda = post('azienda');
    $oggetto = post('oggetto', 'Richiesta dal sito');
    if ($msg === '') {
        json_out(false, 'Scrivi un messaggio.', 400);
    }
    $subject = 'Contatti sito — ' . $oggetto;
    $htmlBody =
        '<h2>Nuova richiesta dal form Contatti</h2>' .
        '<p><strong>Nome:</strong> ' . esc($nome) . '</p>' .
        '<p><strong>Azienda:</strong> ' . esc($azienda !== '' ? $azienda : '—') . '</p>' .
        '<p><strong>Email:</strong> ' . esc($email) . '</p>' .
        '<p><strong>Oggetto:</strong> ' . esc($oggetto) . '</p>' .
        '<p><strong>Messaggio:</strong><br>' . nl2br(esc($msg)) . '</p>';

} else { // lavora
    $cognome = post('cognome');
    if ($cognome === '' || mb_strlen($cognome) > 120) {
        json_out(false, 'Inserisci un cognome valido.', 400);
    }
    // ---- Gestione CV (obbligatorio per la candidatura) ----
    if (empty($_FILES['cv']) || ($_FILES['cv']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        json_out(false, 'Allega il tuo CV (PDF, DOC o DOCX).', 400);
    }
    $cv = $_FILES['cv'];

    // dimensione max 2MB
    if ($cv['size'] > 2 * 1024 * 1024) {
        json_out(false, 'Il CV supera i 2MB.', 400);
    }
    // estensione consentita
    $ext = strtolower(pathinfo($cv['name'], PATHINFO_EXTENSION));
    $allowedExt = ['pdf', 'doc', 'docx'];
    if (!in_array($ext, $allowedExt, true)) {
        json_out(false, 'Formato CV non consentito. Usa PDF, DOC o DOCX.', 400);
    }
    // controllo MIME reale
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime  = finfo_file($finfo, $cv['tmp_name']);
    finfo_close($finfo);
    $allowedMime = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream', // alcuni .doc/.docx passano così
        'application/zip',          // i .docx sono zip
    ];
    if (!in_array($mime, $allowedMime, true)) {
        json_out(false, 'Il contenuto del file non è un documento valido.', 400);
    }

    // salvataggio in cartella protetta fuori dalla web root
    $cvDir = rtrim($cfg['cv_dir'], '/\\');
    if (!is_dir($cvDir) || !is_writable($cvDir)) {
        json_out(false, 'Cartella CV non disponibile sul server.', 500);
    }
    $safeName = date('Ymd-His') . '_' .
        preg_replace('/[^A-Za-z0-9._-]/', '_', $cognome . '_' . $nome) . '_' .
        bin2hex(random_bytes(4)) . '.' . $ext;
    $destPath = $cvDir . '/' . $safeName;
    if (!move_uploaded_file($cv['tmp_name'], $destPath)) {
        json_out(false, 'Impossibile salvare il CV. Riprova.', 500);
    }

    $subject = 'Candidatura — ' . $nome . ' ' . $cognome;
    $htmlBody =
        '<h2>Nuova candidatura (Lavora con noi)</h2>' .
        '<p><strong>Nome:</strong> ' . esc($nome) . ' ' . esc($cognome) . '</p>' .
        '<p><strong>Email:</strong> ' . esc($email) . '</p>' .
        '<p><strong>Messaggio:</strong><br>' . nl2br(esc($msg !== '' ? $msg : '—')) . '</p>' .
        '<p><strong>CV allegato:</strong> ' . esc($cv['name']) . ' (' . esc($safeName) . ')</p>';

    // allega il CV in base64 all'email
    $attachments[] = [
        '@odata.type'  => '#microsoft.graph.fileAttachment',
        'name'         => $cv['name'],
        'contentType'  => $mime,
        'contentBytes' => base64_encode(file_get_contents($destPath)),
    ];
}

// ---- Invio via Graph (token in cache su file + retry se scaduto) ----
try {
    graph_send($cfg, $subject, $htmlBody, $email, $attachments);
} catch (Throwable $e) {
    // log lato server, messaggio generico all'utente
    error_log('[invia.php] ' . $e->getMessage());
    json_out(false, 'Invio non riuscito. Riprova più tardi o scrivici via email.', 502);
}

json_out(true, 'Grazie! La tua richiesta è stata inviata: ti ricontatteremo al più presto.');


/* ===================== FUNZIONI ============================ */

/** Escape HTML sicuro. */
function esc(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Percorso della cache del token (accanto a invia.php, protetto da .htaccess). */
function token_cache_path(): string {
    return __DIR__ . '/.graph_token_cache.json';
}

/**
 * Invia con token dalla cache; se il token è scaduto/invalido (401),
 * lo rinnova e riprova una volta sola.
 */
function graph_send(array $cfg, string $subject, string $html, string $replyTo, array $attachments): void {
    try {
        graph_send_mail($cfg, graph_get_token($cfg), $subject, $html, $replyTo, $attachments);
    } catch (RuntimeException $e) {
        if ($e->getCode() === 401) {
            @unlink(token_cache_path());
            graph_send_mail($cfg, graph_get_token($cfg, true), $subject, $html, $replyTo, $attachments);
        } else {
            throw $e;
        }
    }
}

/**
 * Ottiene un access token app-only (client_credentials), con cache su file.
 * Il token Graph dura ~1h: lo riusiamo finché valido (margine 5 min) per non
 * chiamare il token endpoint a ogni invio. $force=true ignora la cache.
 */
function graph_get_token(array $cfg, bool $force = false): string {
    $cacheFile = token_cache_path();
    $now = time();
    if (!$force && is_file($cacheFile)) {
        $c = json_decode((string)@file_get_contents($cacheFile), true);
        if (is_array($c) && !empty($c['access_token']) && (int)($c['expires_at'] ?? 0) > $now) {
            return (string)$c['access_token'];
        }
    }
    $url = 'https://login.microsoftonline.com/' . rawurlencode($cfg['tenant_id']) . '/oauth2/v2.0/token';
    $post = http_build_query([
        'client_id'     => $cfg['client_id'],
        'client_secret' => $cfg['client_secret'],
        'scope'         => 'https://graph.microsoft.com/.default',
        'grant_type'    => 'client_credentials',
    ]);
    [$code, $body] = curl_json($cfg, $url, $post, [
        'Content-Type: application/x-www-form-urlencoded',
    ]);
    $data = json_decode($body, true);
    if ($code !== 200 || empty($data['access_token'])) {
        $err = $data['error_description'] ?? $data['error'] ?? 'token error';
        throw new RuntimeException('Token fallito (' . $code . '): ' . $err);
    }
    // salva in cache con margine di 5 minuti prima della scadenza
    $expiresIn = (int)($data['expires_in'] ?? 3600);
    @file_put_contents($cacheFile, json_encode([
        'access_token' => $data['access_token'],
        'expires_at'   => $now + max(60, $expiresIn - 300),
    ]), LOCK_EX);
    @chmod($cacheFile, 0600);
    return $data['access_token'];
}

/**
 * Invia la mail come la SharedMailbox indicata in config['sender'].
 * Il "sender" deve essere UPN o ObjectId di una mailbox reale (User/Shared),
 * MAI un gruppo/lista (darebbe ErrorInvalidUser).
 */
function graph_send_mail(array $cfg, string $token, string $subject, string $html, string $replyTo, array $attachments): void {
    $url = 'https://graph.microsoft.com/v1.0/users/' . rawurlencode($cfg['sender']) . '/sendMail';

    $toRecipients = [];
    foreach ((array)$cfg['recipients'] as $r) {
        $toRecipients[] = ['emailAddress' => ['address' => $r]];
    }

    $message = [
        'subject' => $subject,
        'body'    => ['contentType' => 'HTML', 'content' => $html],
        'toRecipients' => $toRecipients,
        // così rispondendo si scrive direttamente all'utente
        'replyTo' => [['emailAddress' => ['address' => $replyTo]]],
    ];
    if (!empty($attachments)) {
        $message['attachments'] = $attachments;
    }

    $payload = json_encode([
        'message'         => $message,
        'saveToSentItems' => true,
    ], JSON_UNESCAPED_UNICODE);

    [$code, $body] = curl_json($cfg, $url, $payload, [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json',
    ]);
    // sendMail risponde 202 Accepted senza corpo
    if ($code !== 202) {
        $data = json_decode($body, true);
        $err  = $data['error']['message'] ?? ('HTTP ' . $code);
        throw new RuntimeException('sendMail fallito (' . $code . '): ' . $err, $code);
    }
}

/**
 * Wrapper cURL. Restituisce [http_code, body].
 * In XAMPP, se l'SSL fallisce, imposta curl.cainfo in php.ini con cacert.pem
 * (NON disabilitare la verifica in produzione).
 */
function curl_json(array $cfg, string $url, string $body, array $headers): array {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);
    if (!empty($cfg['cacert_path'])) {
        curl_setopt($ch, CURLOPT_CAINFO, $cfg['cacert_path']);
    }
    $resp = curl_exec($ch);
    if ($resp === false) {
        $e = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('cURL: ' . $e);
    }
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, (string)$resp];
}
