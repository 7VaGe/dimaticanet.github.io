/* =============================================================
   cinematic.js
   Hero cinematico ispirato allo stile "AI Studio" (Textura/GetLayers):
   "A chrome star turns in the dark and the whole page becomes one
    cinematic scroll — violet light, a bloom of drifting particles,
    and a camera that flies clean through it."

   Tecniche:
   - Stella cromata 3D (materiale metallico + env-map procedurale)
   - Camera legata allo scroll (fly-through) con smoothing inerziale
   - Nube di particelle alla deriva + glow additivo
   - Luci verde acqua/ciano coerenti col brand

   Richiede: three.min.js (r128) caricato prima di questo file.
   Target markup: <section class="cinematic"> con #cine-canvas.
   ============================================================= */
(function () {
  "use strict";

  var canvas  = document.getElementById("cine-canvas");
  var section = document.querySelector(".cinematic");
  if (!canvas || !section) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Fallback statico: se WebGL non è disponibile (GPU/driver, contesto negato,
     WebGL disabilitato), mostra comunque l'hero — testo della prima scena —
     e nasconde il canvas, senza generare errori né rompere la pagina. */
  function showFallback() {
    section.classList.add("cine-fallback");
    canvas.style.display = "none";
    var st = document.querySelectorAll(".cine-stage");
    for (var i = 0; i < st.length; i++) {
      st[i].style.transform = "none";
      st[i].style.filter = "none";
      st[i].style.opacity = i === 0 ? "1" : "0";
      st[i].classList.toggle("pointer", i === 0);
    }
  }

  if (typeof THREE === "undefined") { showFallback(); return; }

  /* ---------- Scena / camera / renderer ---------- */
  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05030a, 0.10);

  var camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
  camera.position.set(0, 0, 7);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) {
    showFallback();   // creazione del contesto WebGL fallita
    return;
  }
  renderer.setClearColor(0x000000, 0);

  /* ---------- Env-map procedurale (gradiente verde acqua→ciano) ----------
     Genera una texture equirettangolare su canvas: è ciò che la
     stella cromata "riflette", senza dipendere da file esterni.      */
  function makeEnvTexture() {
    var c = document.createElement("canvas"); c.width = 512; c.height = 256;
    var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0.00, "#031418");
    g.addColorStop(0.35, "#0e6b5a");
    g.addColorStop(0.50, "#2ee6b6");
    g.addColorStop(0.66, "#2ad4f0");
    g.addColorStop(0.82, "#22d3ee");
    g.addColorStop(1.00, "#02080a");
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    // highlight luminosi per riflessi speculari sul cromo
    function blob(cx, cy, r, col) {
      var rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, col); rg.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = rg; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    blob(120, 70, 90, "rgba(255,255,255,0.9)");
    blob(400, 120, 120, "rgba(93,240,200,0.7)");
    blob(300, 40, 60, "rgba(120,230,255,0.8)");
    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }
  var envTex = makeEnvTexture();
  scene.environment = envTex;

  /* ---------- Geometria: stella a 4 punte (sparkle) estrusa ---------- */
  function makeStarGeometry() {
    var shape = new THREE.Shape();
    var spikes = 4, outer = 1.0, inner = 0.34;
    var step = Math.PI / spikes;
    shape.moveTo(0, outer);
    for (var i = 1; i < spikes * 2; i++) {
      var r = (i % 2 === 0) ? outer : inner;
      var a = step * i;
      shape.lineTo(Math.sin(a) * r, Math.cos(a) * r);
    }
    shape.closePath();
    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.30, bevelEnabled: true,
      bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 5, steps: 1
    });
    geo.center();
    return geo;
  }

  var starMat = new THREE.MeshStandardMaterial({
    color: 0xeaf0ff, metalness: 1.0, roughness: 0.12,
    envMap: envTex, envMapIntensity: 1.6
  });
  var star = new THREE.Mesh(makeStarGeometry(), starMat);
  scene.add(star);

  // Alone luminoso dietro la stella (sprite radiale additivo = fake bloom)
  function makeGlowSprite() {
    var c = document.createElement("canvas"); c.width = c.height = 256;
    var x = c.getContext("2d");
    var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(93,240,200,0.55)");
    g.addColorStop(0.4, "rgba(34,211,238,0.22)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    var s = new THREE.Sprite(mat); s.scale.set(7, 7, 1); s.position.z = -1.5;
    return s;
  }
  scene.add(makeGlowSprite());

  /* ---------- Nube di particelle alla deriva ---------- */
  var isSmall = window.innerWidth < 768;
  var PCOUNT = isSmall ? 400 : 900;
  var pPos = new Float32Array(PCOUNT * 3);
  for (var i = 0; i < PCOUNT; i++) {
    var rad = 3 + Math.random() * 9;
    var th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pPos[i*3]   = Math.sin(ph) * Math.cos(th) * rad;
    pPos[i*3+1] = Math.sin(ph) * Math.sin(th) * rad * 0.7;
    pPos[i*3+2] = Math.cos(ph) * rad;
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  var pTex = (function () {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var x = c.getContext("2d");
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, Math.PI * 2); x.fill();
    return new THREE.CanvasTexture(c);
  })();
  var particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: 0.09, map: pTex, color: 0x9ec5ff, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }));
  scene.add(particles);

  /* ---------- Luci ---------- */
  scene.add(new THREE.AmbientLight(0x223355, 0.7));
  var lV = new THREE.PointLight(0x2ee6b6, 2.4, 60); lV.position.set(-6, 4, 5); scene.add(lV);  // verde acqua
  var lC = new THREE.PointLight(0x22d3ee, 1.8, 60); lC.position.set(6, -3, 4); scene.add(lC);  // ciano
  var lB = new THREE.PointLight(0x3b82f6, 1.4, 60); lB.position.set(0, 5, -4); scene.add(lB);  // blu

  /* ---------- Parallasse mouse ---------- */
  var mouse = { x: 0, y: 0 }, mt = { x: 0, y: 0 };
  window.addEventListener("mousemove", function (e) {
    mt.x = e.clientX / window.innerWidth - 0.5;
    mt.y = e.clientY / window.innerHeight - 0.5;
  });

  /* ---------- Resize ---------- */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize); resize();

  /* ---------- Progresso di scroll nella sezione cinematica ---------- */
  function scrollProgress() {
    var rect = section.getBoundingClientRect();
    var total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return Math.min(1, Math.max(0, -rect.top / total));
  }

  /* ---------- Stage di testo cinetico (fade in/out legati allo scroll) ---------- */
  var stages = Array.prototype.slice.call(document.querySelectorAll(".cine-stage"));
  var N = stages.length;
  function smoothstep(a, b, t) { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); }
  function updateStages(p) {
    // Suddivide [0..1] in N finestre; ogni stage entra ed esce con dissolvenza.
    var win = 1 / N, fade = win * 0.5;
    for (var s = 0; s < N; s++) {
      var winStart = s * win, winEnd = (s + 1) * win;
      // Il primo stage è già visibile in cima; l'ultimo resta visibile in fondo.
      var fadeIn  = (s === 0)     ? 1 : smoothstep(winStart, winStart + fade, p);
      var fadeOut = (s === N - 1) ? 1 : (1 - smoothstep(winEnd - fade, winEnd, p));
      var op = Math.min(fadeIn, fadeOut);
      var el = stages[s];
      el.style.opacity = op.toFixed(3);
      el.style.transform = "translateY(" + ((1 - op) * 34).toFixed(1) + "px)";
      el.style.filter = "blur(" + ((1 - op) * 8).toFixed(1) + "px)";
      el.classList.toggle("pointer", op > 0.6);
    }
  }

  /* ---------- Loop ---------- */
  var cur = 0;
  function frame() {
    requestAnimationFrame(frame);
    var target = scrollProgress();
    cur += (target - cur) * 0.07;             // smoothing inerziale → scroll "cinematografico"
    mouse.x += (mt.x - mouse.x) * 0.05;
    mouse.y += (mt.y - mouse.y) * 0.05;

    // Camera che vola attraverso la scena
    camera.position.z = 7 - cur * 6.0;                       // 7 → 1 (fly-through)
    camera.position.x = Math.sin(cur * Math.PI) * 0.8 + mouse.x * 0.7;
    camera.position.y = -mouse.y * 0.6 + cur * 0.4;
    camera.lookAt(0, 0, 0);

    // Rotazione "pesante" della stella cromata
    star.rotation.y += 0.004;
    star.rotation.x = 0.3 + cur * 1.4 + mouse.y * 0.2;
    star.rotation.z = cur * 0.6;
    star.scale.setScalar(1 + cur * 0.5);

    // Particelle alla deriva
    particles.rotation.y += 0.0007;
    particles.rotation.x = mouse.y * 0.1;

    updateStages(cur);
    renderer.render(scene, camera);
  }

  if (reduce) {
    // Frame statico centrato, nessuna animazione continua
    camera.position.set(0, 0, 4); camera.lookAt(0, 0, 0);
    updateStages(0);
    renderer.render(scene, camera);
  } else {
    frame();
  }

  /* Libera il contesto WebGL alla chiusura/uscita della pagina:
     evita l'accumulo di contesti (causa tipica dell'errore "Error creating WebGL context"). */
  window.addEventListener("pagehide", function () {
    try {
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    } catch (e) {}
  }, { once: true });
})();
