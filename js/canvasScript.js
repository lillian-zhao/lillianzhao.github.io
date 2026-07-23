window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#webglCanvas');
  if (!canvas) return;

  // ── Renderer ────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Scene & Camera ───────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 6.5, 7.5);
  camera.lookAt(0, 0, 0);

  // ── Lighting ─────────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xfff5e4, 0.75));

  const sun = new THREE.DirectionalLight(0xfffaf0, 1.0);
  sun.position.set(-4, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  scene.add(sun);

  const fillLight = new THREE.DirectionalLight(0xdde8ff, 0.35);
  fillLight.position.set(4, 4, -3);
  scene.add(fillLight);

  // ── Material helper ──────────────────────────────────────────────────────────
  function mkMesh(geo, color, opts) {
    opts = opts || {};
    var matParams = { color: color, roughness: 0.85, metalness: 0.0 };
    Object.keys(opts).forEach(function(k) { matParams[k] = opts[k]; });
    var mat = new THREE.MeshStandardMaterial(matParams);
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  var DESK_TOP = 0.09; // world Y of the desk's top surface

  // ── Desk (not draggable) ──────────────────────────────────────────────────────
  var deskGroup = new THREE.Group();

  var deskSurface = mkMesh(new THREE.BoxGeometry(8, 0.18, 4.6), 0x9c6b3e, { roughness: 0.95 });
  deskGroup.add(deskSurface);

  var deskEdge = mkMesh(new THREE.BoxGeometry(8.06, 0.04, 4.66), 0x7a5230);
  deskEdge.position.y = -0.11;
  deskGroup.add(deskEdge);

  [[-3.6, -1.0, -1.85], [3.6, -1.0, -1.85], [-3.6, -1.0, 1.85], [3.6, -1.0, 1.85]].forEach(function(pos) {
    var leg = mkMesh(new THREE.BoxGeometry(0.18, 2.0, 0.18), 0x6b4826);
    leg.position.set(pos[0], pos[1], pos[2]);
    deskGroup.add(leg);
  });
  scene.add(deskGroup);

  // ── Laptop ────────────────────────────────────────────────────────────────────
  var laptop = new THREE.Group();
  laptop.userData.draggable = true;
  laptop.userData.label = 'laptop';

  var laptopBase = mkMesh(new THREE.BoxGeometry(1.8, 0.07, 1.2), 0x2c2c2c, { roughness: 0.55, metalness: 0.45 });
  laptop.add(laptopBase);

  var trackpad = mkMesh(new THREE.BoxGeometry(0.5, 0.005, 0.38), 0x3a3a3a, { roughness: 0.4 });
  trackpad.position.set(0, 0.038, 0.22);
  laptop.add(trackpad);

  var screenPivot = new THREE.Group();
  screenPivot.position.set(0, 0.035, -0.6);

  var screenOuter = mkMesh(new THREE.BoxGeometry(1.75, 1.1, 0.055), 0x2c2c2c, { roughness: 0.55, metalness: 0.45 });
  screenOuter.position.set(0, 0.55, 0);
  screenPivot.add(screenOuter);

  var screenDisplay = mkMesh(new THREE.BoxGeometry(1.6, 0.96, 0.012), 0x1a2a4a, { roughness: 0.2, metalness: 0.1, emissive: 0x0a1222, emissiveIntensity: 0.5 });
  screenDisplay.position.set(0, 0.55, -0.028);
  screenPivot.add(screenDisplay);

  screenPivot.rotation.x = -0.18;
  laptop.add(screenPivot);

  laptop.position.set(0.2, DESK_TOP + 0.035, -0.3);
  scene.add(laptop);

  // ── Coffee Mug ────────────────────────────────────────────────────────────────
  var mug = new THREE.Group();
  mug.userData.draggable = true;
  mug.userData.label = 'mug';

  var mugBody = mkMesh(new THREE.CylinderGeometry(0.22, 0.18, 0.42, 24), 0xF7CB74, { roughness: 0.7 });
  mugBody.position.y = 0.21;
  mug.add(mugBody);

  var mugRim = mkMesh(new THREE.TorusGeometry(0.22, 0.018, 8, 24), 0xe0b050, { roughness: 0.6 });
  mugRim.position.y = 0.42;
  mug.add(mugRim);

  var mugHandle = mkMesh(new THREE.TorusGeometry(0.115, 0.022, 8, 14, Math.PI), 0xe0b050, { roughness: 0.6 });
  mugHandle.rotation.z = Math.PI / 2;
  mugHandle.position.set(0.3, 0.21, 0);
  mug.add(mugHandle);

  var liquid = mkMesh(new THREE.CylinderGeometry(0.19, 0.19, 0.035, 24), 0x5c3010, { roughness: 0.05, metalness: 0.0 });
  liquid.position.y = 0.39;
  mug.add(liquid);

  mug.position.set(2.6, DESK_TOP, 0.9);
  scene.add(mug);

  // ── Stack of Books ────────────────────────────────────────────────────────────
  var books = new THREE.Group();
  books.userData.draggable = true;
  books.userData.label = 'books';

  var bookData = [
    { color: 0x1e46fa, w: 0.78, h: 0.075, d: 0.54, xOff: 0.01 },
    { color: 0xfa1eef, w: 0.73, h: 0.08,  d: 0.51, xOff: -0.01 },
    { color: 0xF7CB74, w: 0.76, h: 0.065, d: 0.52, xOff: 0.008 },
  ];
  var bookY = 0;
  bookData.forEach(function(b) {
    var book = mkMesh(new THREE.BoxGeometry(b.w, b.h, b.d), b.color, { roughness: 0.85 });
    book.position.set(b.xOff, bookY + b.h / 2, 0);
    book.rotation.y = b.xOff * 0.15;
    books.add(book);
    bookY += b.h;
  });

  books.position.set(-2.6, DESK_TOP, -0.5);
  scene.add(books);

  // ── Plant ──────────────────────────────────────────────────────────────────────
  var plant = new THREE.Group();
  plant.userData.draggable = true;
  plant.userData.label = 'plant';

  var pot = mkMesh(new THREE.CylinderGeometry(0.2, 0.16, 0.32, 16), 0xc96644, { roughness: 0.9 });
  pot.position.y = 0.16;
  plant.add(pot);

  var dirt = mkMesh(new THREE.CylinderGeometry(0.195, 0.195, 0.03, 16), 0x2d1f0e, { roughness: 1.0 });
  dirt.position.y = 0.33;
  plant.add(dirt);

  var stem = mkMesh(new THREE.CylinderGeometry(0.015, 0.02, 0.22, 8), 0x4a6b3a, { roughness: 0.9 });
  stem.position.y = 0.44;
  plant.add(stem);

  [[0, 0.62, 0, 0.17], [-0.13, 0.56, 0.09, 0.14], [0.14, 0.55, -0.08, 0.14], [0.06, 0.53, 0.12, 0.12], [-0.07, 0.51, -0.12, 0.12]].forEach(function(lp) {
    var leaf = mkMesh(new THREE.SphereGeometry(lp[3], 8, 6), 0x4a7c59, { roughness: 0.9 });
    leaf.position.set(lp[0], lp[1], lp[2]);
    plant.add(leaf);
  });

  plant.position.set(-2.9, DESK_TOP, 1.1);
  scene.add(plant);

  // ── Notebook ──────────────────────────────────────────────────────────────────
  var notebook = new THREE.Group();
  notebook.userData.draggable = true;
  notebook.userData.label = 'notebook';

  var cover = mkMesh(new THREE.BoxGeometry(0.88, 0.04, 0.66), 0xffe4b5, { roughness: 0.9 });
  notebook.add(cover);

  var nbSpine = mkMesh(new THREE.BoxGeometry(0.035, 0.045, 0.66), 0xccaa88, { roughness: 0.8 });
  nbSpine.position.x = -0.455;
  notebook.add(nbSpine);

  for (var i = 0; i < 5; i++) {
    var ruleLine = mkMesh(new THREE.BoxGeometry(0.6, 0.003, 0.009), 0xd4c0a0, { roughness: 1.0 });
    ruleLine.position.set(0.1, 0.022, -0.22 + i * 0.11);
    notebook.add(ruleLine);
  }

  notebook.position.set(1.9, DESK_TOP + 0.02, 1.1);
  notebook.rotation.y = 0.25;
  scene.add(notebook);

  // ── Pencil ─────────────────────────────────────────────────────────────────────
  var pencil = new THREE.Group();
  pencil.userData.draggable = true;
  pencil.userData.label = 'pencil';

  var pencilBody = mkMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6), 0xF7CB74, { roughness: 0.8 });
  pencil.add(pencilBody);

  var pencilTip = mkMesh(new THREE.ConeGeometry(0.025, 0.08, 6), 0xf5d5a0, { roughness: 0.9 });
  pencilTip.position.y = -0.49;
  pencil.add(pencilTip);

  var pencilEraser = mkMesh(new THREE.CylinderGeometry(0.027, 0.027, 0.055, 6), 0xffaaaa, { roughness: 0.6 });
  pencilEraser.position.y = 0.478;
  pencil.add(pencilEraser);

  pencil.rotation.z = Math.PI / 2;
  pencil.rotation.y = 0.35;
  pencil.position.set(-1.3, DESK_TOP + 0.025, 1.2);
  scene.add(pencil);

  // ── Sticky Note ────────────────────────────────────────────────────────────────
  var sticky = new THREE.Group();
  sticky.userData.draggable = true;
  sticky.userData.label = 'sticky';

  var stickyPad = mkMesh(new THREE.BoxGeometry(0.52, 0.008, 0.52), 0xfff176, { roughness: 0.95 });
  sticky.add(stickyPad);

  for (var j = 0; j < 3; j++) {
    var sLine = mkMesh(new THREE.BoxGeometry(0.36, 0.002, 0.008), 0xe8e068, { roughness: 1.0 });
    sLine.position.set(0, 0.006, -0.12 + j * 0.12);
    sticky.add(sLine);
  }

  sticky.position.set(2.2, DESK_TOP + 0.004, -0.7);
  sticky.rotation.y = -0.3;
  scene.add(sticky);

  // ── Draggables list ────────────────────────────────────────────────────────────
  var draggables = [laptop, mug, books, plant, notebook, pencil, sticky];
  draggables.forEach(function(d) { d.userData.baseY = d.position.y; });

  // Cache all draggable meshes for raycasting
  var draggableMeshes = [];
  draggables.forEach(function(d) {
    d.traverse(function(c) { if (c.isMesh) draggableMeshes.push(c); });
  });

  // ── Highlight helper ────────────────────────────────────────────────────────────
  function setHighlight(obj, on) {
    if (!obj) return;
    obj.traverse(function(c) {
      if (!c.isMesh) return;
      if (on) {
        // Store original values on first highlight
        if (c.userData._oe === undefined) {
          c.userData._oe = c.material.emissive.clone();
          c.userData._oei = c.material.emissiveIntensity;
        }
        c.material.emissive.set(0x3a3a3a);
        c.material.emissiveIntensity = 0.3;
      } else if (c.userData._oe !== undefined) {
        c.material.emissive.copy(c.userData._oe);
        c.material.emissiveIntensity = c.userData._oei;
      }
    });
  }

  // ── Drag & Hover interaction ────────────────────────────────────────────────────
  var raycaster = new THREE.Raycaster();
  var mouse2D = new THREE.Vector2();
  var dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  var planeHit = new THREE.Vector3();
  var dragOffsetX = 0;
  var dragOffsetZ = 0;

  var hovered = null;
  var dragged = null;

  function getDraggableParent(obj) {
    var cur = obj;
    while (cur) {
      if (cur.userData && cur.userData.draggable) return cur;
      cur = cur.parent;
    }
    return null;
  }

  function updateMouse(event) {
    var rect = canvas.getBoundingClientRect();
    mouse2D.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse2D.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  canvas.addEventListener('mousemove', function(e) {
    updateMouse(e);
    raycaster.setFromCamera(mouse2D, camera);

    if (dragged) {
      dragPlane.constant = -dragged.position.y;
      var hit = raycaster.ray.intersectPlane(dragPlane, planeHit);
      if (hit) {
        var newX = planeHit.x - dragOffsetX;
        var newZ = planeHit.z - dragOffsetZ;
        // Clamp to desk surface bounds
        dragged.position.x = Math.max(-3.5, Math.min(3.5, newX));
        dragged.position.z = Math.max(-1.8, Math.min(1.8, newZ));
      }
      canvas.style.cursor = 'grabbing';
    } else {
      var hits = raycaster.intersectObjects(draggableMeshes);
      var newHovered = hits.length > 0 ? getDraggableParent(hits[0].object) : null;
      if (newHovered !== hovered) {
        setHighlight(hovered, false);
        hovered = newHovered;
        setHighlight(hovered, true);
      }
      canvas.style.cursor = hovered ? 'grab' : 'default';
    }
  });

  canvas.addEventListener('mousedown', function(e) {
    updateMouse(e);
    raycaster.setFromCamera(mouse2D, camera);
    var hits = raycaster.intersectObjects(draggableMeshes);
    if (hits.length > 0) {
      dragged = getDraggableParent(hits[0].object);
      if (dragged) {
        dragPlane.constant = -dragged.position.y;
        var hit = raycaster.ray.intersectPlane(dragPlane, planeHit);
        if (hit) {
          dragOffsetX = planeHit.x - dragged.position.x;
          dragOffsetZ = planeHit.z - dragged.position.z;
        }
        canvas.style.cursor = 'grabbing';
      }
    }
  });

  canvas.addEventListener('mouseup', function() {
    if (dragged) {
      setHighlight(dragged, false);
      hovered = null;
      dragged = null;
    }
    canvas.style.cursor = 'default';
  });

  // ── Animation loop ──────────────────────────────────────────────────────────────
  var clock = 0;
  function animate() {
    requestAnimationFrame(animate);
    clock += 0.016;

    // Gentle idle float so items feel alive
    draggables.forEach(function(d, i) {
      if (d !== dragged) {
        d.position.y = d.userData.baseY + Math.sin(clock * 0.7 + i * 1.1) * 0.007;
      }
    });

    renderer.render(scene, camera);
  }

  animate();

  // ── Resize ──────────────────────────────────────────────────────────────────────
  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
});
