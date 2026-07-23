/* =============================================================
   particles.js
   Sfondo particellare 3D per l'hero, basato su three.js.
   Rete di nodi (punti) connessi da linee, con lieve rotazione
   e parallasse sul movimento del mouse.
   Richiede: three.min.js caricato prima di questo file.
   Target: <canvas id="particles-canvas"></canvas> dentro .hero
   ============================================================= */
(function () {
  "use strict";

  var canvas = document.getElementById("particles-canvas");
  if (!canvas || typeof THREE === "undefined") return;

  // Rispetta la preferenza di ridurre le animazioni
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(60, 1, 1, 2000);
  camera.position.z = 320;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setClearColor(0x000000, 0);

  // ---- Parametri (adattivi per performance su mobile) ----
  var isSmall = window.innerWidth < 768;
  var COUNT = isSmall ? 55 : 110;   // numero di nodi
  var RANGE = 520;                  // volume di distribuzione
  var LINK_DIST = isSmall ? 90 : 115; // distanza max per tracciare una linea

  // ---- Nodi (punti) ----
  var positions = new Float32Array(COUNT * 3);
  var velocities = [];
  for (var i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * RANGE;
    positions[i * 3 + 1] = (Math.random() - 0.5) * RANGE * 0.6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * RANGE;
    velocities.push({
      x: (Math.random() - 0.5) * 0.18,
      y: (Math.random() - 0.5) * 0.18,
      z: (Math.random() - 0.5) * 0.18
    });
  }

  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  var pMat = new THREE.PointsMaterial({
    color: 0x22d3ee, size: 3.2, transparent: true, opacity: 0.9,
    sizeAttenuation: true, depthWrite: false
  });
  var points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // ---- Linee di connessione ----
  var maxLinks = COUNT * COUNT;
  var linePositions = new Float32Array(maxLinks * 3);
  var lineColors = new Float32Array(maxLinks * 3);
  var lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3).setUsage(THREE.DynamicDrawUsage));
  var lineMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending });
  var lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  var cA = new THREE.Color(0x3b82f6); // blu
  var cB = new THREE.Color(0x22d3ee); // ciano

  function updateLinks() {
    var vp = 0, vc = 0, pos = pGeo.attributes.position.array;
    for (var a = 0; a < COUNT; a++) {
      for (var b = a + 1; b < COUNT; b++) {
        var dx = pos[a*3] - pos[b*3];
        var dy = pos[a*3+1] - pos[b*3+1];
        var dz = pos[a*3+2] - pos[b*3+2];
        var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < LINK_DIST) {
          var alpha = 1 - dist / LINK_DIST;
          linePositions[vp++] = pos[a*3];
          linePositions[vp++] = pos[a*3+1];
          linePositions[vp++] = pos[a*3+2];
          linePositions[vp++] = pos[b*3];
          linePositions[vp++] = pos[b*3+1];
          linePositions[vp++] = pos[b*3+2];
          lineColors[vc++] = cA.r * alpha; lineColors[vc++] = cA.g * alpha; lineColors[vc++] = cA.b * alpha;
          lineColors[vc++] = cB.r * alpha; lineColors[vc++] = cB.g * alpha; lineColors[vc++] = cB.b * alpha;
        }
      }
    }
    lineGeo.setDrawRange(0, vp / 3);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
  }

  // ---- Parallasse mouse ----
  var mouse = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  window.addEventListener("mousemove", function (e) {
    target.x = (e.clientX / window.innerWidth - 0.5);
    target.y = (e.clientY / window.innerHeight - 0.5);
  });

  // ---- Resize responsivo ----
  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ---- Loop di animazione ----
  var t = 0;
  function animate() {
    requestAnimationFrame(animate);
    var pos = pGeo.attributes.position.array;
    for (var i = 0; i < COUNT; i++) {
      pos[i*3]   += velocities[i].x;
      pos[i*3+1] += velocities[i].y;
      pos[i*3+2] += velocities[i].z;
      // rimbalzo ai bordi del volume
      ["x","y","z"].forEach(function (axis, k) {
        var lim = axis === "y" ? RANGE * 0.3 : RANGE * 0.5;
        if (pos[i*3+k] > lim || pos[i*3+k] < -lim) velocities[i][axis] *= -1;
      });
    }
    pGeo.attributes.position.needsUpdate = true;
    updateLinks();

    // parallasse morbida + rotazione lenta
    mouse.x += (target.x - mouse.x) * 0.04;
    mouse.y += (target.y - mouse.y) * 0.04;
    t += 0.0009;
    scene.rotation.y = t + mouse.x * 0.5;
    scene.rotation.x = mouse.y * 0.3;

    renderer.render(scene, camera);
  }

  if (reduce) {
    // Frame statico: nessuna animazione continua
    updateLinks();
    renderer.render(scene, camera);
  } else {
    animate();
  }
})();
