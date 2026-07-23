// piramid.js — piramide 3D interattiva della hero Solutions.
// 3 livelli tronco-piramidali: base = Gestione Sistemi, centro = SAP, cima = DDM.
// Fluttuano piano; hover su un livello -> lo fermo e mostro la card affiancata.
// Card/label sono elementi DOM esterni, li accendo con le classi .hidden/.block.
// Richiede three.min.js (r128). Target: <div id="pyramid-3d-container">.
(function () {
  "use strict";

  var mount = document.getElementById("pyramid-3d-container");
  if (!mount) return;
  if (mount.querySelector("canvas")) return;   // già avviato, non duplico il canvas
  if (typeof THREE === "undefined") return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = mount.clientWidth || 380;
  var H = mount.clientHeight || 450;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
  camera.position.set(0, 0, 7);
  camera.lookAt(0, 0, 0);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return; // niente WebGL -> lascio l'area vuota, non blocco la pagina
  }
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  // materiale base condiviso dai 3 livelli (il colore lo cambio per livello)
  var materialOptions = {
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  };

  // cilindro a 4 lati = tronco di piramide a base quadrata
  function createPyramidSection(radiusTop, radiusBottom, height, color, name) {
    var geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 4, 1);
    var material = new THREE.MeshStandardMaterial(
      Object.assign({}, materialOptions, { color: new THREE.Color(color) })
    );
    
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = Math.PI / 4; // ruotato di 45° così guardo lo spigolo frontale
    mesh.userData = { name: name, active: false };

    // contorno stile blueprint: stesse edge del solido, colore schiarito
    var edges = new THREE.EdgesGeometry(geometry);
    var lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(color).clone().multiplyScalar(1.6),
      transparent: true,
      opacity: 0.5
    });
    var line = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(line);

    return mesh;
  }

  // i 3 livelli, dal basso in alto. basePositionsY = quota di riposo di ognuno
  var layers = [];
  var basePositionsY = [-0.5, 0.0, 0.5];

  var layerSistemi = createPyramidSection(1.3, 1.8, 0.5, "#3b82f6", "sistemi");
  layerSistemi.position.y = basePositionsY[0];
  scene.add(layerSistemi);
  layers.push(layerSistemi);

  var layerSap = createPyramidSection(0.8, 1.2, 0.5, "#2ee6b6", "sap");
  layerSap.position.y = basePositionsY[1];
  scene.add(layerSap);
  layers.push(layerSap);

  var layerBi = createPyramidSection(0.2, 0.7, 0.5, "#22d3ee", "bi");
  layerBi.position.y = basePositionsY[2];
  scene.add(layerBi);
  layers.push(layerBi);

  // luci: ambiente diffuso + una direzionale azzurra per staccare gli spigoli
  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  var dirLight = new THREE.DirectionalLight(0x7dd3fc, 1.5);
  dirLight.position.set(3, 5, 4);
  scene.add(dirLight);

  // card e label esterne (una per livello) accese/spente in base all'hover
  var cards = {
    default: document.getElementById("card-default"),
    bi: document.getElementById("card-bi"),
    sap: document.getElementById("card-sap"),
    sistemi: document.getElementById("card-sistemi")
  };

  var labels = {
    bi: document.getElementById("label-bi"),
    sap: document.getElementById("label-sap"),
    sistemi: document.getElementById("label-sistemi")
  };

  // raycaster: dal mouse capisco quale livello sto puntando
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();

  // rimette tutto a riposo: card nascoste, label spente, nessun livello attivo
  function resetDOMStates() {
    var key;
    for (key in cards) {
      if (cards[key]) {
        cards[key].classList.add("hidden");
        cards[key].classList.remove("block");
      }
    }
    for (key in labels) {
      if (labels[key]) {
        labels[key].style.color = "#93a1bd";
        labels[key].style.borderColor = "transparent";
      }
    }
    for (var i = 0; i < layers.length; i++) {
      layers[i].userData.active = false;
    }
  }

  function onMouseMove(event) {
    // coordinate mouse in spazio normalizzato [-1,1] richiesto dal raycaster
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(layers);

    resetDOMStates();

    if (intersects.length > 0) {
      var hitObject = intersects[0].object;   // il più vicino alla camera
      var hitLayer = hitObject.userData.name;

      hitObject.userData.active = true; // "active" = fermo la fluttuazione di questo livello

      if (cards[hitLayer]) {
        cards[hitLayer].classList.remove("hidden");
        cards[hitLayer].classList.add("block");
      }
      if (cards.default) cards.default.classList.add("hidden");

      if (labels[hitLayer]) {
        var accent = hitLayer === "bi" ? "#22d3ee" : (hitLayer === "sap" ? "#2ee6b6" : "#3b82f6");
        labels[hitLayer].style.color = "#eaf0ff";
        labels[hitLayer].style.borderColor = accent;
      }
    } else {
      if (cards.default) {
        cards.default.classList.remove("hidden");
        cards.default.classList.add("block");
      }
    }
  }

  function onMouseLeave() {
    resetDOMStates();
    if (cards.default) {
      cards.default.classList.remove("hidden");
      cards.default.classList.add("block");
    }
  }

  mount.addEventListener("mousemove", onMouseMove);
  mount.addEventListener("mouseleave", onMouseLeave);

  function onResize() {
    W = mount.clientWidth || 380;
    H = mount.clientHeight || 450;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
  }
  window.addEventListener("resize", onResize);

  var frameId, clock = 0;
  function frame() {
    frameId = requestAnimationFrame(frame);
    clock += 0.025;

    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      if (!layer.userData.active) {
        // fluttuazione: seno sfasato per livello (i*1.5) così non salgono in sync
        var offset = Math.sin(clock + i * 1.5) * 0.035;
        var targetY = basePositionsY[i] + offset;
        layer.position.y += (targetY - layer.position.y) * 0.1;   // avvicinamento morbido
      } else {
        // livello puntato: lo riporto fermo alla sua quota (niente ballonzolio)
        layer.position.y += (basePositionsY[i] - layer.position.y) * 0.2;
      }
    }

    renderer.render(scene, camera);
  }

  if (reduce) {
    renderer.render(scene, camera);   // reduced-motion: un frame e stop
  } else {
    frame();
  }

  // pagehide: fermo il loop, stacco i listener, libero geometrie/materiali/GL
  window.addEventListener("pagehide", function () {
    try {
      cancelAnimationFrame(frameId);
      mount.removeEventListener("mousemove", onMouseMove);
      mount.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      
      for (var i = 0; i < layers.length; i++) {
        layers[i].geometry.dispose();
        layers[i].material.dispose();
      }
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    } catch (e) {}
  }, { once: true });
})();
