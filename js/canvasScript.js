window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#webglCanvas');
  if (!canvas) return;

  // ── Renderer ────────────────────────────────────────────────────────────────
  var _isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, _isCoarse ? 1 : 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.68;

  // ── Scene & Camera ───────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  // Frontal/eye-level framing — camera sits at desk-top height, slightly elevated,
  // looking slightly downward toward the desk surface.
  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.60, 2.65);
  camera.lookAt(0, 0.55, -0.5);

  // ── Lighting ─────────────────────────────────────────────────────────────────
  // Warm candlelight ambient — shadows stay readable but feel toasty
  scene.add(new THREE.AmbientLight(0xf0e0c8, 0.20));

  // Soft sun from upper-left — low intensity so it adds direction without glare
  const sun = new THREE.DirectionalLight(0xffd898, 0.30);
  sun.position.set(-4, 8, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 40;
  sun.shadow.camera.left = -9;
  sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;
  sun.shadow.camera.bottom = -9;
  scene.add(sun);

  // Ghost of a fill — warm tint keeps it from going cold in the shadows
  const fillLight = new THREE.DirectionalLight(0xffe4c0, 0.08);
  fillLight.position.set(0, 3, 8);
  scene.add(fillLight);

  // Desk lamp — deeper amber-orange for a cosy candlelit warmth
  const lampLight = new THREE.PointLight(0xff7820, 3.2, 9);
  lampLight.position.set(1.88, 2.06, -0.35);
  lampLight.castShadow = false;
  scene.add(lampLight);

  // Lamp spotlight — casts a warm visible pool of light down on the desk surface
  var lampSpot = new THREE.SpotLight(0xff9030, 9.0, 6.0, Math.PI * 0.28, 0.40, 2);
  lampSpot.position.set(1.88, 2.06, -0.35);
  lampSpot.target.position.set(1.60, 0.09, -0.60);
  lampSpot.castShadow = false;
  scene.add(lampSpot);
  scene.add(lampSpot.target);

  // CRT screen glow — soft lavender tint to match the new purple screen
  const screenGlow = new THREE.PointLight(0xaa88ff, 0.38, 4);
  screenGlow.position.set(0, 1.1, -0.3);
  scene.add(screenGlow);

  // Moody purple rim from behind wall — pushes depth into the scene
  const rimLight = new THREE.PointLight(0x8855ee, 0.55, 9);
  rimLight.position.set(0, 3.2, -3.5);
  scene.add(rimLight);

  // Window daylight — warmer, wider reach
  const windowLight = new THREE.PointLight(0xffdda0, 0.60, 12);
  windowLight.position.set(1.8, 2.5, -1.5);
  scene.add(windowLight);

  // ── Rounded box geometry helper ──────────────────────────────────────────────
  // The shape describes the TOP face (w wide, d deep) with arc-rounded corners,
  // then gets extruded downward by h with no bevel (bevel expands outward and
  // would break the dimensions). The geometry is rotated so the rounded face
  // points upward — exactly what the camera sees from above.
  // Final dimensions are exactly w × h × d with no clipping.
  function roundedBoxGeo(w, h, d, r, segs) {
    segs = segs || 2;
    r = Math.min(r, w / 2 - 0.0001, d / 2 - 0.0001);
    if (r <= 0) return new THREE.BoxGeometry(w, h, d);

    var rx = w / 2 - r; // arc centre offset in X
    var rz = d / 2 - r; // arc centre offset in Z (shape's local Y)

    // Rounded rectangle representing the top face
    var shape = new THREE.Shape();
    shape.moveTo(-rx, -d / 2);
    shape.lineTo( rx, -d / 2);
    shape.absarc( rx, -rz, r, -Math.PI / 2, 0,            false);
    shape.lineTo(w / 2,  rz);
    shape.absarc( rx,  rz, r,  0,            Math.PI / 2,  false);
    shape.lineTo(-rx, d / 2);
    shape.absarc(-rx,  rz, r,  Math.PI / 2,  Math.PI,      false);
    shape.lineTo(-w / 2, -rz);
    shape.absarc(-rx, -rz, r,  Math.PI,      Math.PI * 1.5, false);
    shape.closePath();

    var geo = new THREE.ExtrudeGeometry(shape, {
      depth:         h,
      bevelEnabled:  false,
      steps:         1,
      curveSegments: segs * 4
    });

    // Rotate so the rounded face (local XY) becomes the world top face (XZ plane)
    geo.rotateX(-Math.PI / 2);
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }

  // ── Material helper ──────────────────────────────────────────────────────────
  function mkMesh(geo, color, opts) {
    opts = opts || {};
    var matParams = { color: color, roughness: 0.85, metalness: 0.0 };
    Object.keys(opts).forEach(function(k) { matParams[k] = opts[k]; });
    // Lambert is far cheaper than Standard for this many meshes; look stays soft/diffuse
    var mat = (opts.metalness && opts.metalness > 0.2)
      ? new THREE.MeshStandardMaterial(matParams)
      : new THREE.MeshLambertMaterial({
          color: matParams.color,
          emissive: matParams.emissive || 0x000000,
          emissiveIntensity: matParams.emissiveIntensity || 1,
          transparent: !!matParams.transparent,
          opacity: matParams.opacity != null ? matParams.opacity : 1,
          side: matParams.side != null ? matParams.side : THREE.FrontSide
        });
    var m = new THREE.Mesh(geo, mat);
    m.castShadow = !!renderer.shadowMap.enabled;
    m.receiveShadow = !!renderer.shadowMap.enabled;
    return m;
  }

  var DESK_TOP = 0.09;

  // ════════════════════════════════════════════════════════════════════════════
  // ROOM ENVIRONMENT
  // ════════════════════════════════════════════════════════════════════════════

  // Floor — large slab under + in front of the desk (toward camera)
  var floor = mkMesh(new THREE.BoxGeometry(22, 0.04, 36), 0xc4aa8a, { roughness: 0.97 });
  floor.position.set(0, -2.03, 5);
  floor.castShadow = false;
  scene.add(floor);

  var backWall = mkMesh(new THREE.BoxGeometry(14, 7, 0.08), 0xf0e6d8, { roughness: 0.95 });
  backWall.position.set(0, 1.45, -1.54);
  backWall.castShadow = false;
  scene.add(backWall);

  var baseboard = mkMesh(new THREE.BoxGeometry(14, 0.16, 0.12), 0xe2d6c6, { roughness: 0.9 });
  baseboard.position.set(0, -1.95, -2.84);
  scene.add(baseboard);

  // Window — slightly right of center so it's visible from the front-facing camera
  var windowFrame = mkMesh(new THREE.BoxGeometry(2.1, 1.9, 0.09), 0xfaf6f0, { roughness: 0.8 });
  windowFrame.position.set(1.8, 2.2, -2.85);
  windowFrame.castShadow = false;
  scene.add(windowFrame);

  var windowGlass = mkMesh(
    new THREE.BoxGeometry(1.82, 1.62, 0.02), 0xc8deff,
    { roughness: 0.05, metalness: 0.1, emissive: 0xa8ccff, emissiveIntensity: 1.8, transparent: true, opacity: 0.88 }
  );
  windowGlass.position.set(1.8, 2.2, -2.86);
  scene.add(windowGlass);

  var winBarH = mkMesh(new THREE.BoxGeometry(1.82, 0.045, 0.06), 0xfaf6f0, { roughness: 0.7 });
  winBarH.position.set(1.8, 2.2, -2.865);
  scene.add(winBarH);

  var winBarV = mkMesh(new THREE.BoxGeometry(0.045, 1.62, 0.06), 0xfaf6f0, { roughness: 0.7 });
  winBarV.position.set(1.8, 2.2, -2.865);
  scene.add(winBarV);

  // ════════════════════════════════════════════════════════════════════════════
  // WALL SHELVES  (two-tier, left side of wall)
  // ════════════════════════════════════════════════════════════════════════════
  // shelfGroup: scale 1.5× around the shelf X/Y centre (-2.75, 0.95)
  // group.pos = centre - scale*centre  →  (1.375, -0.475, 0)
  var shelfGroup = new THREE.Group();
  shelfGroup.scale.set(1.5, 1.5, 1);
  shelfGroup.position.set(1.375, -0.475, 0);
  scene.add(shelfGroup);

  var WALL_Z = -1.50;
  var SH_X  = -2.75;      // shelf centre X
  var SH_W  = 2.10;       // plank width (wider shelves)
  var SH_H  = 0.080;      // plank thickness
  var SH_D  = 0.28;       // plank depth
  var SH_PZ = WALL_Z + SH_D / 2; // plank centre Z, back face flush with wall
  var SH_Y1 = 1.26;       // upper shelf plank centre Y
  var SH_Y2 = 0.64;       // lower shelf plank centre Y

  // Helper: build one shelf plank + L-brackets
  function addShelf(cy) {
    var plank = mkMesh(roundedBoxGeo(SH_W, SH_H, SH_D, 0.014, 2), 0x9c6b3e, { roughness: 0.88 });
    plank.position.set(SH_X, cy, SH_PZ);
    shelfGroup.add(plank);
    [-(SH_W / 2 - 0.06), (SH_W / 2 - 0.06)].forEach(function(dx) {
      var bv = mkMesh(new THREE.BoxGeometry(0.040, 0.26, 0.040), 0x999999, { roughness: 0.5, metalness: 0.55 });
      bv.position.set(SH_X + dx, cy - 0.13, WALL_Z + 0.020);
      shelfGroup.add(bv);
      var bh = mkMesh(new THREE.BoxGeometry(0.040, 0.040, SH_D - 0.02), 0x999999, { roughness: 0.5, metalness: 0.55 });
      bh.position.set(SH_X + dx, cy - 0.006, WALL_Z + (SH_D - 0.02) / 2 + 0.010);
      shelfGroup.add(bh);
    });
    return cy + SH_H / 2; // return top-surface Y
  }

  var SHT1 = addShelf(SH_Y1); // upper shelf top surface
  var SHT2 = addShelf(SH_Y2); // lower shelf top surface

  // ── Per-item sub-groups inside shelfGroup ─────────────────────────────────
  // Each group is centred on the item so it animates cleanly when "picked up".
  // Children use positions relative to the sub-group origin.
  var SHZ = SH_PZ;
  var _shelfItems = [];   // collected for pick-up interaction

  function mkShelfItem(cx, cy, cz) {
    var g = new THREE.Group();
    g.position.set(cx, cy, cz);
    shelfGroup.add(g);
    _shelfItems.push(g);
    return g;
  }

  // ── Upper shelf ───────────────────────────────────────────────────────────

  // Four books + bookend  (group centred between them)
  var _BK_CX = SH_X - 0.625, _BK_CY = SHT1 + 0.155;
  var booksGrp = mkShelfItem(_BK_CX, _BK_CY, SHZ);
  [
    { color: 0xcc3333, w: 0.11, h: 0.32, d: 0.22, dx: -0.82 },
    { color: 0x3388cc, w: 0.14, h: 0.27, d: 0.22, dx: -0.68 },
    { color: 0x44bb77, w: 0.10, h: 0.30, d: 0.22, dx: -0.55 },
    { color: 0xe8a030, w: 0.12, h: 0.24, d: 0.22, dx: -0.43 },
  ].forEach(function(b) {
    var sb = mkMesh(roundedBoxGeo(b.w, b.h, b.d, 0.008, 2), b.color, { roughness: 0.85 });
    sb.position.set(SH_X + b.dx - _BK_CX, SHT1 + b.h / 2 - _BK_CY, 0);
    booksGrp.add(sb);
  });
  var bookend = mkMesh(roundedBoxGeo(0.04, 0.20, 0.22, 0.008, 2), 0x888888, { roughness: 0.5, metalness: 0.4 });
  bookend.position.set(SH_X - 0.30 - _BK_CX, SHT1 + 0.10 - _BK_CY, 0);
  booksGrp.add(bookend);

  // Mini succulent
  var _SC_CX = SH_X + 0.16, _SC_CY = SHT1 + 0.09;
  var succulentGrp = mkShelfItem(_SC_CX, _SC_CY, SHZ);
  var sPot = mkMesh(new THREE.CylinderGeometry(0.082, 0.065, 0.11, 16), 0xb85c40, { roughness: 0.9 });
  sPot.position.set(0, SHT1 + 0.055 - _SC_CY, 0);
  succulentGrp.add(sPot);
  var sDirt = mkMesh(new THREE.CylinderGeometry(0.076, 0.076, 0.015, 16), 0x2d1f0e, { roughness: 1.0 });
  sDirt.position.set(0, SHT1 + 0.112 - _SC_CY, 0);
  succulentGrp.add(sDirt);
  [[0,0.068,0,0.058],[-0.062,0.057,0.042,0.050],[0.063,0.054,-0.038,0.050],[0.016,0.052,0.060,0.044]].forEach(function(lp) {
    var sl = mkMesh(new THREE.SphereGeometry(lp[3], 8, 7), 0x5aaa70, { roughness: 0.9 });
    sl.scale.y = 1.45;
    sl.position.set(lp[0], SHT1 + 0.120 + lp[1] - _SC_CY, lp[2]);
    succulentGrp.add(sl);
  });

  // Snow globe
  var _GB_CX = SH_X + 0.65, _GB_CY = SHT1 + 0.11;
  var snowGlobeGrp = mkShelfItem(_GB_CX, _GB_CY, SHZ);
  var gbBase = mkMesh(roundedBoxGeo(0.14, 0.044, 0.14, 0.010, 2), 0xbbbbbb, { roughness: 0.35, metalness: 0.5 });
  gbBase.position.set(0, SHT1 + 0.022 - _GB_CY, 0);
  snowGlobeGrp.add(gbBase);
  var gbGlass = mkMesh(
    new THREE.SphereGeometry(0.104, 20, 16), 0xd0e8ff,
    { roughness: 0.0, metalness: 0.05, transparent: true, opacity: 0.50,
      emissive: 0x88aaee, emissiveIntensity: 0.15 }
  );
  gbGlass.position.set(0, SHT1 + 0.044 + 0.104 - _GB_CY, 0);
  snowGlobeGrp.add(gbGlass);
  [0.026, 0.019].forEach(function(r, i) {
    var sm = mkMesh(new THREE.SphereGeometry(r, 8, 8), 0xf0f0f0, { roughness: 0.9 });
    sm.position.set(0, SHT1 + 0.044 + 0.020 + r + (i === 1 ? 0.058 : 0) - _GB_CY, 0);
    snowGlobeGrp.add(sm);
  });

  // ── Lower shelf ───────────────────────────────────────────────────────────

  // One candle on the lower shelf
  (function() {
    var c = { dx: -0.70, cr: 0.040, ch: 0.28, col: 0xfff8e7, fcol: 0xff9922 };
    var _CC_CX = SH_X + c.dx, _CC_CY = SHT2 + c.ch / 2;
    var candleGrp = mkShelfItem(_CC_CX, _CC_CY, SHZ);
    var cBody = mkMesh(new THREE.CylinderGeometry(c.cr, c.cr, c.ch, 16), c.col, { roughness: 0.85 });
    cBody.position.set(0, 0, 0);
    candleGrp.add(cBody);
    var cFlame = mkMesh(new THREE.ConeGeometry(c.cr * 0.45, c.cr * 1.6, 8), c.fcol, {
      roughness: 0.4, emissive: c.fcol, emissiveIntensity: 0.9
    });
    cFlame.position.set(0, c.ch / 2 + c.cr * 0.8, 0);
    candleGrp.add(cFlame);
    var cSaucer = mkMesh(new THREE.CylinderGeometry(c.cr + 0.018, c.cr + 0.014, 0.012, 16), 0xd0c090, { roughness: 0.6 });
    cSaucer.position.set(0, SHT2 + 0.006 - _CC_CY, 0);
    candleGrp.add(cSaucer);
  })();

  // Ceramic jar with lid
  var _JR_CX = SH_X - 0.34, _JR_CY = SHT2 + 0.10;
  var jarGrp = mkShelfItem(_JR_CX, _JR_CY, SHZ);
  var jarBody = mkMesh(new THREE.CylinderGeometry(0.062, 0.055, 0.16, 18), 0x7eb8c9, { roughness: 0.55, metalness: 0.04 });
  jarBody.position.set(0, SHT2 + 0.080 - _JR_CY, 0);
  jarGrp.add(jarBody);
  var jarLid = mkMesh(new THREE.CylinderGeometry(0.066, 0.063, 0.024, 18), 0x6aa8ba, { roughness: 0.50 });
  jarLid.position.set(0, SHT2 + 0.172 - _JR_CY, 0);
  jarGrp.add(jarLid);
  var lidKnob = mkMesh(new THREE.SphereGeometry(0.018, 10, 8), 0x6aa8ba, { roughness: 0.5 });
  lidKnob.position.set(0, SHT2 + 0.196 - _JR_CY, 0);
  jarGrp.add(lidKnob);

  // Small shelf photo frame
  var _SF_CX = SH_X + 0.10, _SF_CY = SHT2 + 0.120;
  var shelfFrameGrp = mkShelfItem(_SF_CX, _SF_CY, SHZ);
  var frameBg = mkMesh(roundedBoxGeo(0.18, 0.24, 0.018, 0.008, 2), 0x2a1f12, { roughness: 0.7 });
  frameBg.position.set(0, 0, 0);
  shelfFrameGrp.add(frameBg);
  var framePhoto = mkMesh(new THREE.BoxGeometry(0.130, 0.190, 0.006), 0xffd4a8, { roughness: 0.9 });
  framePhoto.position.set(0, 0, 0.010);
  shelfFrameGrp.add(framePhoto);

  // Tiny alarm clock
  var _CK_CX = SH_X + 0.74, _CK_CY = SHT2 + 0.055;
  var clockGrp = mkShelfItem(_CK_CX, _CK_CY, SHZ);
  var clkBody = mkMesh(roundedBoxGeo(0.11, 0.11, 0.060, 0.030, 2), 0xe84a4a, { roughness: 0.6 });
  clkBody.position.set(0, 0, 0);
  clockGrp.add(clkBody);
  var clkFace = mkMesh(new THREE.CircleGeometry(0.042, 20), 0xfff8f0, { roughness: 0.9 });
  clkFace.position.set(0, 0, 0.031);
  clockGrp.add(clkFace);
  var clkHr = mkMesh(new THREE.BoxGeometry(0.004, 0.028, 0.004), 0x333333, { roughness: 0.5 });
  clkHr.position.set(0, 0.007, 0.033);
  clockGrp.add(clkHr);
  var clkMin = mkMesh(new THREE.BoxGeometry(0.003, 0.036, 0.003), 0x333333, { roughness: 0.5 });
  clkMin.rotation.z = -0.8;
  clkMin.position.set(0, 0.005, 0.034);
  clockGrp.add(clkMin);
  [-0.030, 0.030].forEach(function(bx) {
    var bell = mkMesh(new THREE.SphereGeometry(0.018, 10, 8), 0xd03030, { roughness: 0.5, metalness: 0.3 });
    bell.position.set(bx, 0.060, 0);
    clockGrp.add(bell);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CORK BOARD  (right side of wall — where the photo frames used to float)
  // ════════════════════════════════════════════════════════════════════════════
  // corkGroup: scale 2× around board centre (2.40, 1.60)
  // group.pos = world_centre - scale×local_centre  →  (4.50, -1.60, 0)
  var corkGroup = new THREE.Group();
  corkGroup.scale.set(2, 2, 1);
  corkGroup.position.set(4.50, -1.60, 0);
  scene.add(corkGroup);

  var CK_X = -1.05;   // board centre X
  var CK_Y = 1.60;    // board centre Y
  var CK_W = 1.74;    // board width
  var CK_H = 1.10;    // board height
  var CK_Z = WALL_Z + 0.026; // board centre Z

  // Cork surface
  var corkSurface = mkMesh(
    new THREE.BoxGeometry(CK_W, CK_H, 0.048), 0xb8874e,
    { roughness: 0.97 }
  );
  corkSurface.position.set(CK_X, CK_Y, CK_Z);
  corkGroup.add(corkSurface);

  // Wood frame — 4 strips
  var FT = 0.040, FD = 0.068, FC = 0x7a5230;
  [
    new THREE.BoxGeometry(CK_W + FT * 2, FT, FD), // top
    new THREE.BoxGeometry(CK_W + FT * 2, FT, FD), // bottom
    new THREE.BoxGeometry(FT, CK_H + FT * 2, FD), // left
    new THREE.BoxGeometry(FT, CK_H + FT * 2, FD), // right
  ].forEach(function(geo, i) {
    var f = mkMesh(geo, FC, { roughness: 0.88 });
    var offsets = [
      [0,  CK_H / 2 + FT / 2],
      [0, -CK_H / 2 - FT / 2],
      [-CK_W / 2 - FT / 2, 0],
      [ CK_W / 2 + FT / 2, 0],
    ];
    f.position.set(CK_X + offsets[i][0], CK_Y + offsets[i][1], WALL_Z + 0.034);
    corkGroup.add(f);
  });

  // Pin holes (small flat circles pressed into cork)
  [
    [-0.52, 0.34], [0.24, 0.30], [0.60, 0.08],
    [-0.20, -0.10], [0.38, -0.26], [-0.60, -0.22],
    [0.62,  0.36], [-0.36, 0.12],
  ].forEach(function(hp) {
    var hole = new THREE.Mesh(
      new THREE.CircleGeometry(0.013, 8),
      new THREE.MeshStandardMaterial({ color: 0x7a4f1e, roughness: 1.0 })
    );
    hole.position.set(CK_X + hp[0], CK_Y + hp[1], CK_Z + 0.025);
    corkGroup.add(hole);
  });

  // Coloured pins
  [
    { dx: -0.52, dy:  0.34, col: 0xff3333 },
    { dx:  0.24, dy:  0.30, col: 0x3399ff },
    { dx:  0.60, dy:  0.08, col: 0xffcc00 },
    { dx: -0.20, dy: -0.10, col: 0x44dd88 },
    { dx:  0.38, dy: -0.26, col: 0xff88cc },
  ].forEach(function(p) {
    var head = mkMesh(new THREE.SphereGeometry(0.024, 10, 10), p.col, { roughness: 0.3 });
    head.position.set(CK_X + p.dx, CK_Y + p.dy, CK_Z + 0.055);
    corkGroup.add(head);
    var stem = mkMesh(new THREE.CylinderGeometry(0.005, 0.005, 0.050, 6), 0xcccccc, { roughness: 0.3, metalness: 0.85 });
    stem.rotation.x = Math.PI / 2;
    stem.position.set(CK_X + p.dx, CK_Y + p.dy, CK_Z + 0.030);
    corkGroup.add(stem);
  });

  // (Sticky notes removed — photo frames are now pinned to the board instead)

  // White to-do paper note (A4-ish, pinned by the red pin)
  var todoNote = mkMesh(new THREE.BoxGeometry(0.30, 0.44, 0.005), 0xfdfcf7, { roughness: 0.92 });
  todoNote.rotation.z = 0.025;
  todoNote.position.set(CK_X - 0.58, CK_Y - 0.20, CK_Z + 0.030);
  corkGroup.add(todoNote);
  for (var tli = 0; tli < 5; tli++) {
    var tln = mkMesh(new THREE.BoxGeometry(0.23, 0.009, 0.006), 0xccccbb, { roughness: 1.0 });
    tln.rotation.z = 0.025;
    tln.position.set(CK_X - 0.58, CK_Y - 0.36 + tli * 0.076, CK_Z + 0.035);
    corkGroup.add(tln);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXTRA WALL POSTERS & NOTES  (right side of wall + scattered extras)
  // ════════════════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════════════════
  // WALL PHOTO FRAMES  (2 × 2 grid pinned to the cork board)
  // ── Drop your images in  assets/wall-photos/  ────────────────────────────
  //    wall-photo-1.jpg  →  top-left      wall-photo-2.jpg  →  top-right
  //    wall-photo-3.jpg  →  bottom-left   wall-photo-4.jpg  →  bottom-right
  //    (keep under ~768px — frames are small in the scene)
  // ════════════════════════════════════════════════════════════════════════════
  // photoGroup: scale 1.3× — centred on cork board world centre (2.40, 1.60)
  // group.pos = world_centre - scale×local_centre
  //   local_centre = (2.40, 0.90)
  //   pos.x = 2.40 - 1.3×2.40 = -0.72
  //   pos.y = 1.60 - 1.3×0.90 =  0.43
  //   pos.z = 0.05  (nudge frames in front of the cork surface)
  var photoGroup = new THREE.Group();
  photoGroup.scale.set(1.3, 1.3, 1);
  photoGroup.position.set(-0.72, 0.43, 0.05);
  scene.add(photoGroup);

  var _wallPhotoMeshes = [null, null, null, null];
  var _wallTexLoader   = new THREE.TextureLoader();
  var _frameGroups     = [];   // one sub-group per photo frame (for individual pick-up)

  function addWallPhotoFrame(cx, cy, fw, fh, idx, rz) {
    var FZ = WALL_Z + 0.014;

    // Sub-group centred on this frame; tilt applied here so the whole image rotates
    var frameGrp = new THREE.Group();
    frameGrp.position.set(cx, cy, FZ);
    frameGrp.rotation.z = rz || 0;
    photoGroup.add(frameGrp);
    _frameGroups.push(frameGrp);

    // Photo plane — full frame size, no mat or border strips
    var photoMat = new THREE.MeshBasicMaterial({ color: 0xcfc5e0 });
    var photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), photoMat);
    photoMesh.position.set(0, 0, 0);
    frameGrp.add(photoMesh);
    _wallPhotoMeshes[idx] = photoMesh;

    _wallTexLoader.load(
      'assets/wall-photos/wall-photo-' + (idx + 1) + '.jpg',
      function(tex) {
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        photoMat.map = tex;
        photoMat.color.set(0xffffff);
        photoMat.needsUpdate = true;
      },
      undefined,
      function() { /* file not found — placeholder colour stays */ }
    );
  }

  // 2×2 grid pinned to cork board — each image slightly tilted like the old sticky notes
  var _FS = 0.62;  // image size (square)
  addWallPhotoFrame(2.04, 1.26, _FS, _FS, 0, -0.07); // top-left
  addWallPhotoFrame(2.76, 1.26, _FS, _FS, 1,  0.08); // top-right
  addWallPhotoFrame(2.04, 0.54, _FS, _FS, 2, -0.05); // bottom-left
  addWallPhotoFrame(2.76, 0.54, _FS, _FS, 3,  0.10); // bottom-right

  // ── Extra loose sticky notes scattered on wall (between shelf and corkboard) ─
  [
    { x: -2.55, y: 1.82, col: 0xf48fb1, rz: -0.12, w: 0.52, h: 0.52 },
    { x: -1.95, y: 1.90, col: 0xaed6f1, rz:  0.08, w: 0.56, h: 0.48 },
    { x:  0.72, y: 0.95, col: 0xa8e6cf, rz: -0.15, w: 0.52, h: 0.52 },
    { x:  1.82, y: 1.22, col: 0xfff176, rz:  0.10, w: 0.60, h: 0.54 },
  ].forEach(function(n) {
    var sn = mkMesh(new THREE.BoxGeometry(n.w, n.h, 0.006), n.col, { roughness: 0.94 });
    sn.rotation.z = n.rz;
    sn.position.set(n.x, n.y, WALL_Z + 0.010);
    scene.add(sn);
    // Two ruled lines per note
    for (var li = 0; li < 2; li++) {
      var ln = mkMesh(new THREE.BoxGeometry(n.w * 0.70, 0.009, 0.007), 0x999988, { roughness: 1.0 });
      ln.rotation.z = n.rz;
      ln.position.set(n.x, n.y - 0.040 + li * 0.058, WALL_Z + 0.015);
      scene.add(ln);
    }
  });


  // ════════════════════════════════════════════════════════════════════════════
  // DESK (rounded surface and legs)
  // ════════════════════════════════════════════════════════════════════════════
  var deskGroup = new THREE.Group();

  var deskSurface = mkMesh(roundedBoxGeo(5.5, 0.18, 3.0, 0.04, 2), 0x9c6b3e, { roughness: 0.95 });
  deskGroup.add(deskSurface);

  var deskEdge = mkMesh(new THREE.BoxGeometry(5.56, 0.04, 3.06), 0x7a5230);
  deskEdge.position.y = -0.11;
  deskGroup.add(deskEdge);

  [[-2.5, -1.0, -1.35], [2.5, -1.0, -1.35], [-2.5, -1.0, 1.35], [2.5, -1.0, 1.35]].forEach(function(pos) {
    var leg = mkMesh(roundedBoxGeo(0.18, 2.0, 0.18, 0.02, 2), 0x6b4826);
    leg.position.set(pos[0], pos[1], pos[2]);
    deskGroup.add(leg);
  });

  // Keep a modest front apron so under-desk pixels are wood if anything peeks
  var deskApron = mkMesh(new THREE.BoxGeometry(5.6, 1.2, 0.12), 0x6b4826, { roughness: 0.92 });
  deskApron.position.set(0, -0.65, 1.56);
  deskGroup.add(deskApron);

  scene.add(deskGroup);

  // ════════════════════════════════════════════════════════════════════════════
  // DESK LAMP
  // ════════════════════════════════════════════════════════════════════════════
  var lampGroup = new THREE.Group();

  var lampBase = mkMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.026, 20), 0x888888, { roughness: 0.5, metalness: 0.5 });
  lampBase.position.y = DESK_TOP + 0.013;
  lampGroup.add(lampBase);

  var poleH = 1.98;
  var lampPole = mkMesh(new THREE.CylinderGeometry(0.018, 0.018, poleH, 12), 0x999999, { roughness: 0.5, metalness: 0.5 });
  lampPole.position.y = DESK_TOP + 0.026 + poleH / 2;
  lampGroup.add(lampPole);

  // Lamp head group — pivot at the top of the pole
  var lampHead = new THREE.Group();
  lampHead.position.set(0, DESK_TOP + 0.026 + poleH, 0);
  lampHead.rotation.y = Math.PI/5;   // ~60° counter-clockwise from original -X direction

  var lampArm = mkMesh(roundedBoxGeo(0.44, 0.02, 0.02, 0.009, 2), 0x999999, { roughness: 0.5, metalness: 0.5 });
  lampArm.position.set(-0.22, 0, 0);
  lampHead.add(lampArm);

  var lampShade = mkMesh(new THREE.CylinderGeometry(0.045, 0.24, 0.28, 20), 0xd4881a, { roughness: 0.85 });
  lampShade.position.set(-0.44, -0.16, 0);
  lampHead.add(lampShade);

  var shadeInner = mkMesh(
    new THREE.CylinderGeometry(0.04, 0.23, 0.27, 20), 0xffdd88,
    { roughness: 0.5, emissive: 0xffbb44, emissiveIntensity: 0.9, side: THREE.BackSide }
  );
  shadeInner.position.copy(lampShade.position);
  lampHead.add(shadeInner);

  lampGroup.add(lampHead);

  lampGroup.position.set(2.1, 0, -0.8);
  scene.add(lampGroup);

  // ── Dynamic CRT screen texture — redrawn only when dirty ─────────────────────
  var _sc = document.createElement('canvas');
  _sc.width = 1280; _sc.height = 960;
  var _ctx = _sc.getContext('2d');

  var screenTexture = new THREE.CanvasTexture(_sc);
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.magFilter = THREE.LinearFilter;
  screenTexture.generateMipmaps = false;
  screenTexture.wrapS = THREE.ClampToEdgeWrapping;
  screenTexture.wrapT = THREE.ClampToEdgeWrapping;
  if (renderer.capabilities.getMaxAnisotropy) {
    screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  // Helper: draw a rounded-rectangle path
  function _rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y,     x + w, y + r,     r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - r, r);
    ctx.lineTo(x,     y + r);
    ctx.arcTo(x,     y,     x + r, y,         r);
    ctx.closePath();
  }

  // ── Screen photo — drop any image as  assets/screen-photo.png  (jpg/webp also fine) ──
  // Change the filename below if you use a different extension.
  var _screenImg = null;
  (function () {
    var img = new Image();
    img.crossOrigin = 'anonymous'; // prevents canvas taint → WebGL SecurityError
    img.onload = function () {
      _screenImg = img;
      console.log('[screen] photo loaded ✓', img.src, img.width + '×' + img.height);
      markScreenDirty();
    };
    img.onerror = function () {
      _screenImg = null;
      console.warn('[screen] photo failed to load from:', img.src,
        '— make sure assets/screen-photo.jpg exists and the page is served over HTTP (not file://)');
    };
    img.src = 'assets/screen-photo.jpg';
    console.log('[screen] requesting photo from:', img.src);
  }());

  var _aboutImg = null;
  (function () {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      _aboutImg = img;
      markScreenDirty();
    };
    img.src = 'assets/about-photo.png';
  }());

  // ── Screen background colour — changed by the colour buttons ────────────────
  var _bgColor  = '#ddd5f8'; // default lavender
  var _btnMeshes = [];       // colour button meshes for click-raycasting
  var _activeBtn = null;     // currently-lit button mesh

  // Intro vs desktop: about window is the default; red X closes it to the
  // clock/photo/loading desktop. Double-click (or click) aboutme.txt to reopen.
  var _screenMode        = 'about';  // 'about' | 'desktop'
  var _hoverUI           = null;     // 'close' | 'aboutfile' | 0 | 1 | 2 (link idx)
  var _screenLinks       = [];
  var _closeHit          = { x: 0, y: 0, w: 0, h: 0 };
  var _photoHit          = { x: 0, y: 0, w: 0, h: 0 };
  var _aboutFileHit      = { x: 0, y: 0, w: 0, h: 0 };

  // Dirty flag: skip the expensive 1280×960 redraw + GPU upload when nothing changed.
  var _screenDirty = true;
  var _lastDesktopTick = 0;
  function markScreenDirty() { _screenDirty = true; }
  function setHoverUI(next) {
    if (next !== _hoverUI) {
      _hoverUI = next;
      markScreenDirty();
    }
  }

  var _ABOUT_WIN = { x: 50, y: 40, w: 1180, h: 880 };
  var _FILE_ICON = { x: 1000, y: 700, w: 150, h: 200 };
  var _FILE_PAPER = { x: 1031, y: 708, w: 88, h: 112 };

  var _aboutBuf = document.createElement('canvas');
  _aboutBuf.width = _ABOUT_WIN.w;
  _aboutBuf.height = _ABOUT_WIN.h;
  var _aboutBufCtx = _aboutBuf.getContext('2d');

  var _winAnimDir   = 0;     // 0 idle, 1 closing, -1 opening
  var _winAnimT     = 0;     // 0 = fully open, 1 = in the file icon
  var _winAnimStart = 0;
  var _WIN_ANIM_MS  = 520;

  document.fonts.ready.then(function () { markScreenDirty(); });

  // Darken a hex colour by `amt` per channel (used for grid lines)
  function _darkenHex(hex, amt) {
    return '#' + [1, 3, 5].map(function(i) {
      return Math.max(0, parseInt(hex.slice(i, i + 2), 16) - amt)
                 .toString(16).padStart(2, '0');
    }).join('');
  }

  function _fillScreenBg() {
    var W = 1280, H = 960, ctx = _ctx;
    ctx.fillStyle = _bgColor;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = _darkenHex(_bgColor, 22);
    ctx.lineWidth = 1;
    var gs = 58;
    for (var gx = 0; gx <= W; gx += gs) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (var gy = 0; gy <= H; gy += gs) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
  }

  function _scanlines() {
    var ctx = _ctx;
    for (var sl = 0; sl < 960; sl += 5) {
      ctx.fillStyle = 'rgba(0,0,0,0.028)';
      ctx.fillRect(0, sl, 1280, 2);
    }
  }

  // ── White panel helper (soft shadow + rounded white card) ────────────────
  function panel(x, y, w, h, r) {
    var ctx = _ctx;
    ctx.fillStyle = 'rgba(90,70,150,0.16)';
    _rr(ctx, x + 7, y + 9, w, h, r);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    _rr(ctx, x, y, w, h, r);
    ctx.fill();
  }

  function paintAboutWindow(ctx, ox, oy, updateHits) {
    var px = ox, py = oy, pw = _ABOUT_WIN.w, ph = _ABOUT_WIN.h;

    // Window chrome
    ctx.fillStyle = 'rgba(90,70,150,0.16)';
    _rr(ctx, px + 7, py + 9, pw, ph, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    _rr(ctx, px, py, pw, ph, 28);
    ctx.fill();

    ctx.fillStyle = '#7a5cc8';
    _rr(ctx, px, py, pw, 72, 28);
    ctx.fill();
    ctx.fillRect(px, py + 28, pw, 44);

    ctx.font = '32px lexend, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('aboutme.txt', px + 58, py + 48);

    var lights = [
      { col: 0x28c840, dx: 92 },
      { col: 0xffbd2e, dx: 56 },
      { col: 0xff5f57, dx: 20 }
    ];
    lights.forEach(function (L) {
      ctx.fillStyle = '#' + L.col.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(px + pw - L.dx, py + 36, 14, 0, Math.PI * 2);
      ctx.fill();
    });
    var cx0 = px + pw - 20, cy0 = py + 36;
    ctx.strokeStyle = 'rgba(80,0,0,0.55)';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx0 - 5, cy0 - 5); ctx.lineTo(cx0 + 5, cy0 + 5);
    ctx.moveTo(cx0 + 5, cy0 - 5); ctx.lineTo(cx0 - 5, cy0 + 5);
    ctx.stroke();

    var sx = px + 30;

    ctx.font = '800 108px lexend, sans-serif';
    ctx.fillStyle = '#1a0e32';
    var greet = "hi. I'm Lillian!";
    ctx.fillText(greet, sx + 56, py + 250);
    var greetW = ctx.measureText(greet).width;
    ctx.font = '96px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    ctx.fillText('\uD83D\uDC4B', sx + 72 + greetW, py + 250);

    ctx.font = '700 48px archivoNarrow, sans-serif';
    ctx.fillStyle = '#3d2080';
    ctx.fillText('current senior @ Carnegie Mellon University', sx + 56, py + 340);

    ctx.font = '700 42px archivoNarrow, sans-serif';
    ctx.fillStyle = '#4a2a90';
    ctx.fillText('Tech  ·  Accessibility  ·  Design', sx + 56, py + 410);

    ctx.fillStyle = '#6a40c0';
    ctx.fillRect(sx + 56, py + 450, 240, 8);

    var links = [
      { x: sx + 70,  y: py + 520, w: 160, h: 200, icon: '\uf08c', brand: true, url: 'https://www.linkedin.com/in/lillian-zhao-865383225/', label: 'linkedin' },
      { x: sx + 280, y: py + 520, w: 160, h: 200, icon: '\uf09b', brand: true, url: 'https://github.com/lillian-zhao',                    label: 'github' },
      { x: sx + 490, y: py + 520, w: 160, h: 200, icon: '\uf0e0', brand: false, url: 'mailto:lillian.m.zhao@gmail.com',                   label: 'email' }
    ];

    links.forEach(function (lnk, i) {
      var hot = updateHits && _hoverUI === i;
      var ix = lnk.x + lnk.w / 2;
      var iy = lnk.y + 70;
      ctx.font = (lnk.brand ? '400 92px "Font Awesome 6 Brands"' : '900 92px "Font Awesome 6 Free"');
      ctx.textAlign = 'center';
      ctx.fillStyle = hot ? '#ff8c2a' : '#3a1a88';
      ctx.fillText(lnk.icon, ix, iy);
      ctx.font = '700 28px archivoNarrow, sans-serif';
      ctx.fillStyle = hot ? '#e07010' : '#3d2080';
      ctx.fillText(lnk.label, ix, lnk.y + 170);
      ctx.textAlign = 'left';
    });

    // Portrait in the empty space to the right of the email icon
    var picX = sx + 720, picY = py + 510, picW = 320, picH = 320;
    ctx.font = '700 34px archivoNarrow, sans-serif';
    ctx.fillStyle = '#4a2a90';
    var note = 'me!  :^D';
    ctx.fillText(note, picX + 8, picY - 22);
    var noteW = ctx.measureText(note).width;
    var ax = picX + 18 + noteW, ay = picY - 38;
    ctx.strokeStyle = '#4a2a90';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax, ay + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - 7, ay + 14);
    ctx.lineTo(ax, ay + 22);
    ctx.lineTo(ax + 7, ay + 14);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90,70,150,0.14)';
    _rr(ctx, picX + 6, picY + 8, picW, picH, 22);
    ctx.fill();
    ctx.fillStyle = '#f4f0ff';
    _rr(ctx, picX, picY, picW, picH, 22);
    ctx.fill();
    var inset = 14;
    var imgX = picX + inset, imgY = picY + inset, imgW = picW - inset * 2, imgH = picH - inset * 2;
    if (_aboutImg) {
      var iw = _aboutImg.width, ih = _aboutImg.height;
      var scale = Math.max(imgW / iw, imgH / ih);
      var sw = iw * scale, sh = ih * scale;
      ctx.save();
      _rr(ctx, imgX, imgY, imgW, imgH, 14);
      ctx.clip();
      ctx.drawImage(_aboutImg, imgX + (imgW - sw) / 2, imgY + (imgH - sh) / 2, sw, sh);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ede8ff';
      _rr(ctx, imgX, imgY, imgW, imgH, 14);
      ctx.fill();
    }
    if (updateHits && _hoverUI === 'photo') {
      ctx.strokeStyle = '#ff8c2a';
      ctx.lineWidth = 6;
      _rr(ctx, picX + 3, picY + 3, picW - 6, picH - 6, 20);
      ctx.stroke();
    }

    if (updateHits) {
      _closeHit = { x: cx0 - 22, y: cy0 - 22, w: 44, h: 44 };
      _photoHit = { x: picX, y: picY, w: picW, h: picH };
      _screenLinks = links;
    }
  }

  function snapshotAbout() {
    _aboutBufCtx.clearRect(0, 0, _ABOUT_WIN.w, _ABOUT_WIN.h);
    paintAboutWindow(_aboutBufCtx, 0, 0, false);
  }

  function startWinAnim(dir) {
    snapshotAbout();
    _winAnimDir = dir;
    _winAnimStart = Date.now();
    _winAnimT = dir === 1 ? 0 : 1;
    setHoverUI(null);
    markScreenDirty();
  }

  // Mac-style genie: window funnels into the desktop file icon in horizontal strips
  function drawGenie(ctx, t) {
    var src = _aboutBuf;
    var slices = 64;
    var x0 = _ABOUT_WIN.x, y0 = _ABOUT_WIN.y, w0 = _ABOUT_WIN.w, h0 = _ABOUT_WIN.h;
    var x1 = _FILE_PAPER.x, y1 = _FILE_PAPER.y, w1 = _FILE_PAPER.w, h1 = _FILE_PAPER.h;
    var srcW = src.width, srcH = src.height;
    var delaySpan = 0.28;

    for (var i = 0; i < slices; i++) {
      var v = i / slices;
      var lt = Math.max(0, Math.min(1, (t - (1 - v) * delaySpan) / (1 - delaySpan)));
      var e = lt * lt * (3 - 2 * lt);
      e = e * e * (3 - 2 * e);

      var sy = Math.floor(v * srcH);
      var sh = Math.ceil(srcH / slices) + 1;
      if (sy + sh > srcH) sh = srcH - sy;
      if (sh <= 0) continue;

      var y = y0 + v * h0 + ((y1 + v * h1) - (y0 + v * h0)) * e;
      var w = w0 + (w1 - w0) * e;
      var cx = (x0 + w0 / 2) + ((x1 + w1 / 2) - (x0 + w0 / 2)) * e;
      var x = cx - w / 2;
      var h = Math.max(0.75, h0 / slices * (1 - e) + h1 / slices * e);

      ctx.globalAlpha = 1 - e * 0.2;
      ctx.drawImage(src, 0, sy, srcW, sh, x, y, w, h);
    }
    ctx.globalAlpha = 1;
  }

  function drawCRTIntro() {
    var W = 1280, H = 960, ctx = _ctx;
    ctx.clearRect(0, 0, W, H);
    _fillScreenBg();
    paintAboutWindow(ctx, _ABOUT_WIN.x, _ABOUT_WIN.y, true);
  }

  function drawCRTDesktop() {
    var W = 1280, H = 960, ctx = _ctx;
    ctx.clearRect(0, 0, W, H);
    _fillScreenBg();

    // ════════════════════════════════════════════════════════════════════════
    // CLOCK popup  (center-right)
    // ════════════════════════════════════════════════════════════════════════
    var now = new Date();
    var hh  = now.getHours()  .toString().padStart(2, '0');
    var mm  = now.getMinutes().toString().padStart(2, '0');
    var colon = (now.getSeconds() % 2 === 0) ? ':' : ' ';
    var days   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    var mos    = ['JAN','FEB','MAR','APR','MAY','JUN',
                  'JUL','AUG','SEP','OCT','NOV','DEC'];
    var dateStr = days[now.getDay()] + '  ' +
                  mos[now.getMonth()] + ' ' +
                  now.getDate() + ',  ' + now.getFullYear();
    var ampm = now.getHours() < 12 ? 'AM' : 'PM';

    var cx = 470, cy = 54, cw = 774, ch = 520;
    panel(cx, cy, cw, ch, 26);

    // label
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillStyle = '#4a2a88';
    ctx.fillText('SYSTEM CLOCK', cx + 30, cy + 52);

    // time digits — centered
    var timeStr = hh + colon + mm;
    ctx.font = 'bold 168px "Courier New", monospace';
    ctx.fillStyle = '#1a0e32';
    var tw = ctx.measureText(timeStr).width;
    ctx.fillText(timeStr, cx + (cw - tw) / 2, cy + 318);

    // date + am/pm
    ctx.font = '28px "Courier New", monospace';
    ctx.fillStyle = '#3a1d6e';
    ctx.fillText(dateStr, cx + 30, cy + 382);
    ctx.font = 'bold 42px "Courier New", monospace';
    ctx.fillStyle = '#4a2a88';
    ctx.fillText(ampm, cx + cw - 110, cy + 386);

    // thin bottom accent bar
    ctx.fillStyle = '#c8b8f0';
    ctx.fillRect(cx + 30, cy + ch - 26, cw - 60, 6);

    // ════════════════════════════════════════════════════════════════════════
    // PHOTO POPUP  (top-left) — shows assets/screen-photo.png when present
    // ════════════════════════════════════════════════════════════════════════
    var nx = 44, ny = 44, nw = 396, nh = 414;
    // soft shadow
    ctx.fillStyle = 'rgba(80,60,150,0.16)';
    _rr(ctx, nx + 6, ny + 8, nw, nh, 14);
    ctx.fill();
    // white card body
    ctx.fillStyle = '#ffffff';
    _rr(ctx, nx, ny, nw, nh, 14);
    ctx.fill();
    // purple title bar
    ctx.fillStyle = '#7a5cc8';
    _rr(ctx, nx, ny, nw, 46, 14);
    ctx.fill();
    ctx.fillStyle = '#7a5cc8';
    ctx.fillRect(nx, ny + 14, nw, 32); // square off bottom of bar
    // traffic-light dots
    [0xff5f57, 0xffbd2e, 0x28c840].forEach(function (c, i) {
      ctx.fillStyle = '#' + c.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(nx + nw - 20 - i * 26, ny + 23, 9, 0, Math.PI * 2);
      ctx.fill();
    });
    // title text
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('my photo', nx + 14, ny + 32);

    // Image area inside the card
    var imgX = nx + 14, imgY = ny + 56, imgW = nw - 28, imgH = nh - 70;
    if (_screenImg) {
      // Cover-fit: scale to fill the box, centre, clip to rounded rect
      var iw = _screenImg.width, ih = _screenImg.height;
      var scale = Math.max(imgW / iw, imgH / ih);
      var sw = iw * scale, sh = ih * scale;
      var ox = imgX + (imgW - sw) / 2;
      var oy = imgY + (imgH - sh) / 2;
      ctx.save();
      _rr(ctx, imgX, imgY, imgW, imgH, 8);
      ctx.clip();
      ctx.drawImage(_screenImg, ox, oy, sw, sh);
      ctx.restore();
    } else {
      // Placeholder until an image is dropped in
      ctx.fillStyle = '#ede8ff';
      _rr(ctx, imgX, imgY, imgW, imgH, 8);
      ctx.fill();
      ctx.font = '22px "Courier New", monospace';
      ctx.fillStyle = '#9080c0';
      var hint1 = 'drop image in';
      var hint2 = 'assets/screen-photo.jpg';
      ctx.fillText(hint1, imgX + (imgW - ctx.measureText(hint1).width) / 2, imgY + imgH / 2 - 16);
      ctx.fillText(hint2, imgX + (imgW - ctx.measureText(hint2).width) / 2, imgY + imgH / 2 + 18);
    }

    // ════════════════════════════════════════════════════════════════════════
    // LOADING popup  (bottom strip)
    // ════════════════════════════════════════════════════════════════════════
    var lx = 44, ly = 726, lw = 880, lh = 204;
    panel(lx, ly, lw, lh, 20);

    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillStyle = '#3a1d6e';
    ctx.fillText('LOADING SYSTEM FILES...', lx + 24, ly + 48);

    var bx = lx + 24, by = ly + 72, bw = lw - 48, bh = 56;
    // bar track
    ctx.fillStyle = '#e6e0f8';
    _rr(ctx, bx, by, bw, bh, 10);
    ctx.fill();
    // animated fill
    var prog = (Date.now() / 14000) % 1.0;
    if (prog > 0.005) {
      ctx.save();
      _rr(ctx, bx, by, bw * prog, bh, 10);
      ctx.clip();
      ctx.fillStyle = '#8060cc';
      ctx.fillRect(bx, by, bw * prog, bh);
      // diagonal stripe highlights
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 15;
      for (var si = -bh; si < bw; si += 28) {
        ctx.beginPath();
        ctx.moveTo(bx + si,      by);
        ctx.lineTo(bx + si + bh, by + bh);
        ctx.stroke();
      }
      ctx.restore();
    }
    // bar border
    ctx.strokeStyle = '#9070c0';
    ctx.lineWidth = 2;
    _rr(ctx, bx, by, bw, bh, 10);
    ctx.stroke();
    // percentage text
    ctx.font = 'bold 30px "Courier New", monospace';
    ctx.fillStyle = '#24104a';
    var pct = Math.round(prog * 100) + '%';
    var pm = ctx.measureText(pct).width;
    ctx.fillText(pct, lx + lw / 2 - pm / 2, ly + 166);

    // ── Desktop file: aboutme.txt ────────────────────────────────────────────
    var fx = _FILE_ICON.x, fy = _FILE_ICON.y, fw = _FILE_ICON.w, fh = _FILE_ICON.h;
    _aboutFileHit = { x: fx, y: fy, w: fw, h: fh };
    var fileHot = _hoverUI === 'aboutfile';
    var paperX = fx + 31, paperY = fy + 8, paperW = 88, paperH = 112;
    ctx.fillStyle = fileHot ? 'rgba(122,92,200,0.18)' : 'rgba(255,255,255,0.0)';
    _rr(ctx, fx, fy, fw, fh, 12);
    ctx.fill();
    // paper body
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = fileHot ? '#7a5cc8' : '#c8b8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(paperX, paperY + 18);
    ctx.lineTo(paperX, paperY + paperH);
    ctx.lineTo(paperX + paperW, paperY + paperH);
    ctx.lineTo(paperX + paperW, paperY + 32);
    ctx.lineTo(paperX + paperW - 28, paperY);
    ctx.lineTo(paperX, paperY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // folded corner
    ctx.fillStyle = '#ede8ff';
    ctx.beginPath();
    ctx.moveTo(paperX + paperW - 28, paperY);
    ctx.lineTo(paperX + paperW - 28, paperY + 32);
    ctx.lineTo(paperX + paperW, paperY + 32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // text lines on the paper
    ctx.strokeStyle = '#c8b8f0';
    ctx.lineWidth = 3;
    for (var fl = 0; fl < 4; fl++) {
      ctx.beginPath();
      ctx.moveTo(paperX + 14, paperY + 48 + fl * 14);
      ctx.lineTo(paperX + paperW - 14, paperY + 48 + fl * 14);
      ctx.stroke();
    }
    ctx.font = '700 26px archivoNarrow, sans-serif';
    ctx.fillStyle = fileHot ? '#1a0a38' : '#12081c';
    ctx.textAlign = 'center';
    ctx.fillText('aboutme.txt', fx + fw / 2, fy + fh - 18);
    ctx.textAlign = 'left';
  }

  function drawCRTScreen() {
    if (_winAnimDir !== 0) {
      var raw = (Date.now() - _winAnimStart) / _WIN_ANIM_MS;
      if (_winAnimDir === 1) {
        _winAnimT = Math.min(1, raw);
        if (_winAnimT >= 1) { _winAnimDir = 0; _screenMode = 'desktop'; _winAnimT = 1; }
      } else {
        _winAnimT = Math.max(0, 1 - raw);
        if (_winAnimT <= 0) { _winAnimDir = 0; _screenMode = 'about'; _winAnimT = 0; }
      }
    }

    if (_screenMode === 'about' && _winAnimDir === 0) {
      drawCRTIntro();
    } else {
      drawCRTDesktop();
      if (_winAnimDir !== 0) drawGenie(_ctx, _winAnimT);
    }

    _scanlines();
    screenTexture.needsUpdate = true;
    _screenDirty = false;
  }

  // Initial draw (before first animate frame)
  drawCRTScreen();

  // ════════════════════════════════════════════════════════════════════════════
  // RETRO CRT MONITOR — chunky cream/beige housing, deep body, bubble screen
  // ════════════════════════════════════════════════════════════════════════════
  var monitor = new THREE.Group();
  monitor.userData.draggable = false; // fixed centrepiece — cannot be picked up
  monitor.userData.label = 'monitor';

  var CREAM      = 0xe2d6c4; // classic beige plastic
  var CREAM_DARK = 0xc8bcaa;
  var BODY_CY    = 0.66;     // local y-center of CRT housing (sits above foot)
  var BODY_FRONT = 0.44;     // local z of housing front face (depth 0.88, centered at z=0)

  // Integrated foot / base (slightly wider + deeper, darker shade)
  var crtFoot = mkMesh(roundedBoxGeo(1.8, 0.06, 0.74, 0.05, 2), CREAM_DARK, { roughness: 0.92 });
  crtFoot.position.set(0, 0.03, 0.04);
  monitor.add(crtFoot);

  // Main CRT housing — chunky, cream-coloured, very deep for that retro bulk
  var crtHousing = mkMesh(roundedBoxGeo(1.72, 1.30, 0.88, 0.07, 2), CREAM, { roughness: 0.9 });
  crtHousing.position.set(0, BODY_CY, 0);
  monitor.add(crtHousing);

  // Dark screen surround — wide bezel framing the screen
  var screenSurround = mkMesh(roundedBoxGeo(1.54, 1.06, 0.016, 0.056, 2), 0x181412, { roughness: 0.85 });
  screenSurround.position.set(0, BODY_CY + 0.01, BODY_FRONT + 0.002);
  monitor.add(screenSurround);

  // CRT screen — flat plane with canvas texture; emissiveMap makes it glow.
  // Shifted down 0.05 inside the bezel so the top frame reads noticeably thicker.
  var screenDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(1.50, 1.02),
    new THREE.MeshBasicMaterial({
      map: screenTexture
    })
  );
  screenDisplay.castShadow = false;
  screenDisplay.receiveShadow = false;
  // Centred within the surround — leaves ~0.02 unit black border on all sides
  screenDisplay.position.set(0, BODY_CY + 0.01, BODY_FRONT + 0.022);
  monitor.add(screenDisplay);

  // Bottom control panel strip — shifted down 0.05 with the surround
  var ctrlPanel = mkMesh(roundedBoxGeo(1.38, 0.13, 0.022, 0.014, 2), CREAM_DARK, { roughness: 0.88 });
  ctrlPanel.position.set(0, BODY_CY - 0.585, BODY_FRONT + 0.006);
  monitor.add(ctrlPanel);

  // ── Five pastel colour-change buttons ────────────────────────────────────────
  // Evenly spaced across the panel; clicking one changes the screen background.
  var _colourBtnDefs = [
    { x: -0.40, btnCol: 0xc0a8f0, bg: '#ddd5f8', glow: 0xaa88ff }, // lavender (default)
    { x: -0.20, btnCol: 0x7ec8f4, bg: '#c8e8ff', glow: 0x88bbff }, // light blue
    { x:  0.00, btnCol: 0xf4dc6a, bg: '#fff8c0', glow: 0xffee88 }, // light yellow
    { x:  0.20, btnCol: 0xf498c0, bg: '#ffd4e8', glow: 0xff88bb }, // pink
    { x:  0.40, btnCol: 0x78d898, bg: '#c8f0d8', glow: 0x88ffbb }, // light green
  ];

  _colourBtnDefs.forEach(function(def) {
    // Raised cap (visible face)
    var cap = mkMesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.024, 16),
      def.btnCol,
      { roughness: 0.45, metalness: 0.08,
        emissive: def.btnCol, emissiveIntensity: 0.0 }   // glow set on click
    );
    cap.rotation.x = Math.PI / 2;
    cap.position.set(def.x, BODY_CY - 0.580, BODY_FRONT + 0.027);
    cap.userData.screenBg   = def.bg;
    cap.userData.glowColor  = def.glow;
    cap.userData.isColorBtn = true;
    monitor.add(cap);
    _btnMeshes.push(cap);
  });

  // Illuminate the first button as active by default
  _btnMeshes[0].material.emissiveIntensity = 0.55;
  _activeBtn = _btnMeshes[0];

  // Ventilation slots across the top
  [-0.38, -0.20, -0.02, 0.16, 0.34].forEach(function(sx) {
    var slot = mkMesh(new THREE.BoxGeometry(0.1, 0.007, 0.16), CREAM_DARK, { roughness: 0.95 });
    slot.position.set(sx, BODY_CY + 0.62, -0.1);
    monitor.add(slot);
  });


  // Slight backward tilt for natural desk posture
  monitor.rotation.x = 0.06;
  monitor.scale.set(1.4, 1.4, 1.4);
  monitor.position.set(0, DESK_TOP, -1.0);
  scene.add(monitor);

  // ════════════════════════════════════════════════════════════════════════════
  // KEYBOARD — chunky mechanical, white case, lavender keycaps + silver knob
  // ════════════════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════════════════
  // KEYBOARD — true 70 % mechanical layout
  //   Row 0:  Esc │ F1-F4 │ F5-F8 │ F9-F12  (skinnier fn keys) + knob
  //   Row 1:  ` 1 2 3 4 5 6 7 8 9 0 - =  Bksp(2u)
  //   Row 2:  Tab(1.5u)  Q W E R T Y U I O P [ ]  \(1.5u)
  //   Row 3:  Caps(1.75u)  A S D F G H J K L ; '  Enter(2.25u)
  //   Row 4:  LShift(2.25u)  Z X C V B N M , . /  RShift(1.75u)  ↑
  //   Row 5:  LCtrl(1.5u) Win(1u) LAlt(1.5u)  Space(6u)  RAlt Fn  ← ↓ →
  // ════════════════════════════════════════════════════════════════════════════
  var keyboard = new THREE.Group();
  keyboard.userData.draggable = true;
  keyboard.userData.label = 'keyboard';

  var KB_W = 1.52, KB_H = 0.068, KB_D = 0.58;
  var KB_WHITE = 0xf3f1f8;
  var KB_PLATE = 0xe6e2f2;
  var KB_P = 0xbfb0e6;  // standard key
  var KB_M = 0x9070cc;  // modifier / special key (darker purple)
  var KEY_H = 0.032;
  var KEY_Y = KB_H / 2 + 0.017;

  // Unit system: 1u = 0.082, gap between keys = 0.008
  var U = 0.082, G = 0.008;
  var KD = 0.076;   // standard key depth
  var FD = 0.055;   // fn-row key depth (shallower → "skinnier" look)
  var KR = 0.016;   // corner radius

  // Row z-centres (back → front)
  var RFN = -0.225;  // function row
  var R1  = -0.150;  // number row
  var R2  = -0.066;  // QWERTY
  var R3  =  0.018;  // home row
  var R4  =  0.102;  // ZXCV row
  var R5  =  0.186;  // space / bottom row

  // All alpha rows span 15u of key-width content
  var ROW_W = 15 * U + 14 * G;  // 1.342 — used to anchor the right edge
  var LX    = -ROW_W / 2;        // -0.671

  // ── Case + plate ──────────────────────────────────────────────────────────
  var kbCase = mkMesh(roundedBoxGeo(KB_W, KB_H, KB_D, 0.028, 3), KB_WHITE, { roughness: 0.45, metalness: 0.02 });
  keyboard.add(kbCase);
  var kbPlate = mkMesh(roundedBoxGeo(KB_W - 0.056, 0.009, KB_D - 0.044, 0.014, 2), KB_PLATE, { roughness: 0.62 });
  kbPlate.position.y = KB_H / 2 + 0.005;
  keyboard.add(kbPlate);

  // placeRow: renders a row of keycaps. defs = [{w:units, col:colour}, ...]
  function placeRow(defs, leftX, rowZ, depth) {
    depth = depth || KD;
    var x = leftX;
    defs.forEach(function(k) {
      var wu = k.w || 1;
      var kw = wu * U + (wu - 1) * G;
      var col = k.col || KB_P;
      var keycap = mkMesh(roundedBoxGeo(kw, KEY_H, depth, KR, 2), col, { roughness: 0.58 });
      keycap.position.set(x + kw / 2, KEY_Y, rowZ);
      keyboard.add(keycap);
      x += kw + G;
    });
  }

  // ── Fn row: Esc │ F1-F4 │ F5-F8 │ F9-F12  (knob takes top-right corner) ─
  // 13 keys, group gaps between clusters; each key slightly wider (FKW=0.086)
  var FKW = 0.086, FLG = 0.018;  // fn key width, large group gap
  (function() {
    var groups = [
      [KB_M],                         // Esc
      [KB_P, KB_P, KB_P, KB_P],      // F1-F4
      [KB_P, KB_P, KB_P, KB_P],      // F5-F8
      [KB_P, KB_P, KB_P, KB_P]       // F9-F12
    ];
    var x = LX;
    groups.forEach(function(grp, gi) {
      grp.forEach(function(col) {
        var cap = mkMesh(roundedBoxGeo(FKW, KEY_H * 0.80, FD, KR, 2), col, { roughness: 0.58 });
        cap.position.set(x + FKW / 2, KEY_Y - 0.003, RFN);
        keyboard.add(cap);
        x += FKW + G;
      });
      if (gi < groups.length - 1) x += FLG - G; // larger gap between groups
    });
  }());

  // ── Number row: ` 1-= Bksp(2u) ──────────────────────────────────────────
  placeRow([
    {},{},{},{},{},{},{},{},{},{},{},{},{},  // 13 × 1u
    { w: 2, col: KB_M }                     // Backspace
  ], LX, R1);

  // ── QWERTY: Tab(1.5u) Q-] (12×1u) \(1.5u) ───────────────────────────────
  placeRow([
    { w: 1.5, col: KB_M },
    {},{},{},{},{},{},{},{},{},{},{},{},    // Q … ]  (12 × 1u)
    { w: 1.5, col: KB_M }                  // backslash
  ], LX, R2);

  // ── Home row: Caps(1.75u) A-' (11×1u) Enter(2.25u) ──────────────────────
  placeRow([
    { w: 1.75, col: KB_M },
    {},{},{},{},{},{},{},{},{},{},{},       // A … '  (11 × 1u)
    { w: 2.25, col: KB_M }                 // Enter
  ], LX, R3);

  // ── ZXCV: LShift(2.25u) Z-/ (10×1u) RShift(1.75u) — ↑ placed separately ─
  placeRow([
    { w: 2.25, col: KB_M },
    {},{},{},{},{},{},{},{},{},{},          // Z … /  (10 × 1u)
    { w: 1.75, col: KB_M }                 // RShift (shorter to make room for ↑)
  ], LX, R4);
  // Up-arrow: fills the remaining 1u at the far-right of the ZXCV row
  (function() {
    var ux = LX + ROW_W - U;
    var upKey = mkMesh(roundedBoxGeo(U, KEY_H, KD, KR, 2), KB_P, { roughness: 0.58 });
    upKey.position.set(ux + U / 2, KEY_Y, R4);
    keyboard.add(upKey);
  }());

  // ── Bottom row: LCtrl(1.5u) Win(1u) LAlt(1.5u) Space(6u) RAlt(1u) Fn(1u) ← ↓ → ─
  placeRow([
    { w: 1.5, col: KB_M },  // LCtrl
    { w: 1.0, col: KB_M },  // Win
    { w: 1.5, col: KB_M },  // LAlt
    { w: 6.0, col: KB_P },  // Space bar
    { w: 1.0, col: KB_M },  // RAlt
    { w: 1.0, col: KB_M },  // Fn
    { w: 1.0, col: KB_P },  // ←
    { w: 1.0, col: KB_P },  // ↓
    { w: 1.0, col: KB_P }   // →
  ], LX, R5);

  // ── Rotary knob — top-right corner, right of F12 ──────────────────────────
  var KNOB_X = 0.658, KNOB_Z = RFN;
  var knobPad = mkMesh(roundedBoxGeo(0.160, 0.010, FD + 0.006, 0.012, 2), KB_PLATE, { roughness: 0.6 });
  knobPad.position.set(KNOB_X, KB_H / 2 + 0.006, KNOB_Z);
  keyboard.add(knobPad);
  var knob = mkMesh(new THREE.CylinderGeometry(0.032, 0.032, 0.036, 28), 0xd8d8e0, { roughness: 0.12, metalness: 0.92 });
  knob.position.set(KNOB_X, KB_H / 2 + 0.024, KNOB_Z);
  keyboard.add(knob);
  var knobRing = mkMesh(new THREE.TorusGeometry(0.023, 0.006, 5, 28), 0xc8c8d2, { roughness: 0.08, metalness: 0.95 });
  knobRing.rotation.x = Math.PI / 2;
  knobRing.position.set(KNOB_X, KB_H / 2 + 0.042, KNOB_Z);
  keyboard.add(knobRing);
  var indicator = mkMesh(new THREE.BoxGeometry(0.004, 0.038, 0.004), 0x888888, { roughness: 0.3, metalness: 0.8 });
  indicator.position.set(KNOB_X, KB_H / 2 + 0.024, KNOB_Z - 0.022);
  keyboard.add(indicator);

  keyboard.scale.set(1.4, 1.4, 1.4);
  keyboard.position.set(0, DESK_TOP + 1.4 * KB_H / 2 + 0.002, 0.50);
  scene.add(keyboard);

  // ════════════════════════════════════════════════════════════════════════════
  // MOUSE (most noticeably rounded — pill-like body)
  // ════════════════════════════════════════════════════════════════════════════
  var mouseObj = new THREE.Group();
  mouseObj.userData.draggable = true;
  mouseObj.userData.label = 'mouse';

  var mouseBody = mkMesh(roundedBoxGeo(0.176, 0.074, 0.296, 0.036, 3), 0x1e1e1e, { roughness: 0.6, metalness: 0.25 });
  mouseObj.add(mouseBody);

  var mouseLeft = mkMesh(roundedBoxGeo(0.077, 0.014, 0.141, 0.012, 2), 0x2a2a2a, { roughness: 0.6 });
  mouseLeft.position.set(-0.040, 0.044, -0.061);
  mouseObj.add(mouseLeft);

  var mouseRight = mkMesh(roundedBoxGeo(0.077, 0.014, 0.141, 0.012, 2), 0x2a2a2a, { roughness: 0.6 });
  mouseRight.position.set(0.040, 0.044, -0.061);
  mouseObj.add(mouseRight);

  var scrollWheel = mkMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.080, 10), 0x555555, { roughness: 0.5 });
  scrollWheel.rotation.z = Math.PI / 2;
  scrollWheel.position.set(0, 0.046, -0.061);
  mouseObj.add(scrollWheel);

  mouseObj.scale.set(1.4, 1.4, 1.4);
  mouseObj.position.set(1.35, DESK_TOP + 0.037 * 1.4, 0.42);
  scene.add(mouseObj);

  // ════════════════════════════════════════════════════════════════════════════
  // COFFEE MUG — lavender bubble-handle style with donut saucer
  // ════════════════════════════════════════════════════════════════════════════
  var MUG_COL = 0xb8a9d4;   // soft lavender
  var MUG_MAT = { roughness: 0.92, metalness: 0.0 };

  var mug = new THREE.Group();
  mug.userData.draggable = true;
  mug.userData.label = 'mug';

  // ── Donut saucer ──────────────────────────────────────────────────────────
  var saucer = mkMesh(new THREE.TorusGeometry(0.230, 0.068, 16, 40), MUG_COL, MUG_MAT);
  saucer.rotation.x = Math.PI / 2;
  saucer.position.y = 0.068;
  mug.add(saucer);

  // ── Cup body (open-top cylinder — outer wall) ──────────────────────────────
  var CUP_BOT_Y = 0.122;                   // slightly overlaps saucer top (0.136) to close the gap
  var CUP_H     = 0.420;
  var CUP_R     = 0.200;
  var CUP_MID_Y = CUP_BOT_Y + CUP_H / 2;

  // Outer wall — open at both ends (openEnded = true)
  var mugOuter = mkMesh(new THREE.CylinderGeometry(CUP_R, CUP_R, CUP_H, 32, 1, true), MUG_COL, MUG_MAT);
  mugOuter.position.y = CUP_MID_Y;
  mug.add(mugOuter);

  // Inner wall — BackSide so interior is visible when looking down
  var mugInner = mkMesh(
    new THREE.CylinderGeometry(CUP_R - 0.014, CUP_R - 0.014, CUP_H - 0.010, 32, 1, true),
    MUG_COL, Object.assign({}, MUG_MAT, { side: THREE.BackSide })
  );
  mugInner.position.y = CUP_MID_Y;
  mug.add(mugInner);

  // Bottom disc (closes the base)
  var mugBase = mkMesh(new THREE.CylinderGeometry(CUP_R - 0.014, CUP_R - 0.014, 0.010, 32), MUG_COL, MUG_MAT);
  mugBase.position.y = CUP_BOT_Y + 0.005;
  mug.add(mugBase);

  // Rim ring at the top
  var mugRim = mkMesh(new THREE.TorusGeometry(CUP_R - 0.007, 0.014, 10, 32), MUG_COL, MUG_MAT);
  mugRim.rotation.x = Math.PI / 2;
  mugRim.position.y = CUP_BOT_Y + CUP_H;
  mug.add(mugRim);

  // ── Chunky smooth handle — thick torus arc on the right side ─────────────
  // rotation (PI/2, 0, PI/2) places the arc in the XY plane:
  //   θ=0  → top attachment (CUP_R, CUP_MID_Y + R_arc)
  //   θ=PI/2 → rightmost bulge
  //   θ=PI → bottom attachment (CUP_R, CUP_MID_Y - R_arc)
  var handle = mkMesh(
    new THREE.TorusGeometry(0.155, 0.050, 20, 40, Math.PI),
    MUG_COL, MUG_MAT
  );
  handle.rotation.set(Math.PI, -Math.PI , Math.PI / 2);
  handle.position.set(CUP_R - 0.03, CUP_MID_Y, 0);
  mug.add(handle);

  // ── Liquid surface — sits ~¾ up inside the cup ────────────────────────────
  var liquid = mkMesh(new THREE.CylinderGeometry(CUP_R - 0.016, CUP_R - 0.016, 0.012, 32), 0x7a5ca0, { roughness: 0.08, metalness: 0.0 });
  liquid.position.y = CUP_BOT_Y + CUP_H * 0.78;
  mug.add(liquid);

  mug.rotation.y = -Math.PI / 3;   // ~60° clockwise
  mug.position.set(1.90, DESK_TOP, 0.05);
  scene.add(mug);

  // ── Steam particles ──────────────────────────────────────────────────────────
  var steamGroup = new THREE.Group();
  var steamParticles = [];
  var NUM_STEAM = 3;
  for (var s = 0; s < NUM_STEAM; s++) {
    var sp = mkMesh(
      new THREE.SphereGeometry(0.026 + (s % 3) * 0.01, 7, 7), 0xffffff,
      { roughness: 1.0, transparent: true, opacity: 0.0 }
    );
    sp.castShadow = false;
    sp.userData.phase = (s / NUM_STEAM) * Math.PI * 2;
    sp.userData.xDrift = (s % 2 === 0 ? 1 : -1) * 0.04;
    steamParticles.push(sp);
    steamGroup.add(sp);
  }
  steamGroup.position.set(mug.position.x, mug.position.y + 0.42, mug.position.z);
  scene.add(steamGroup);

  // ════════════════════════════════════════════════════════════════════════════
  // BOOKS (rounded edges — like worn paperbacks)
  // ════════════════════════════════════════════════════════════════════════════
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
    var book = mkMesh(roundedBoxGeo(b.w, b.h, b.d, 0.009, 2), b.color, { roughness: 0.85 });
    book.position.set(b.xOff, bookY + b.h / 2, 0);
    book.rotation.y = b.xOff * 0.15;
    books.add(book);
    bookY += b.h;
  });
  books.position.set(-2.00, DESK_TOP, 0.10);   // swapped with plant
  scene.add(books);

  // ════════════════════════════════════════════════════════════════════════════
  // PLANT
  // ════════════════════════════════════════════════════════════════════════════
  var plant = new THREE.Group();
  plant.userData.draggable = true;
  plant.userData.label = 'plant';

  var pot = mkMesh(new THREE.CylinderGeometry(0.2, 0.16, 0.32, 20), 0xc96644, { roughness: 0.9 });
  pot.position.y = 0.16;
  plant.add(pot);

  var dirt = mkMesh(new THREE.CylinderGeometry(0.195, 0.195, 0.03, 20), 0x2d1f0e, { roughness: 1.0 });
  dirt.position.y = 0.33;
  plant.add(dirt);

  var stem = mkMesh(new THREE.CylinderGeometry(0.015, 0.02, 0.22, 10), 0x4a6b3a, { roughness: 0.9 });
  stem.position.y = 0.44;
  plant.add(stem);

  [[0, 0.62, 0, 0.17], [-0.13, 0.56, 0.09, 0.14], [0.14, 0.55, -0.08, 0.14], [0.06, 0.53, 0.12, 0.12], [-0.07, 0.51, -0.12, 0.12]].forEach(function(lp) {
    var leaf = mkMesh(new THREE.SphereGeometry(lp[3], 10, 8), 0x4a7c59, { roughness: 0.9 });
    leaf.position.set(lp[0], lp[1], lp[2]);
    plant.add(leaf);
  });

  plant.position.set(-2.00, DESK_TOP, -0.70);  // swapped with books — further back
  scene.add(plant);

  // ════════════════════════════════════════════════════════════════════════════
  // NOTEBOOK (rounded cover edges)
  // ════════════════════════════════════════════════════════════════════════════
  var notebook = new THREE.Group();
  notebook.userData.draggable = true;
  notebook.userData.label = 'notebook';

  var cover = mkMesh(roundedBoxGeo(0.60, 0.04, 0.46, 0.02, 2), 0xffe4b5, { roughness: 0.9 });
  notebook.add(cover);

  var nbSpine = mkMesh(roundedBoxGeo(0.035, 0.045, 0.46, 0.01, 2), 0xccaa88, { roughness: 0.8 });
  nbSpine.position.x = -0.318;
  notebook.add(nbSpine);

  for (var i = 0; i < 5; i++) {
    var ruleLine = mkMesh(new THREE.BoxGeometry(0.44, 0.003, 0.008), 0xd4c0a0, { roughness: 1.0 });
    ruleLine.position.set(0.06, 0.022, -0.16 + i * 0.080);
    notebook.add(ruleLine);
  }

  notebook.position.set(2.00, DESK_TOP + 0.02, 0.82);
  notebook.rotation.y = 0.22;
  scene.add(notebook);

  // ════════════════════════════════════════════════════════════════════════════
  // PENCIL
  // ════════════════════════════════════════════════════════════════════════════
  var pencil = new THREE.Group();
  pencil.userData.draggable = true;
  pencil.userData.label = 'pencil';

  var pencilBody = mkMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 8), 0xff2020, { roughness: 0.8 });
  pencil.add(pencilBody);

  var pencilTip = mkMesh(new THREE.ConeGeometry(0.025, 0.08, 8), 0xf5d5a0, { roughness: 0.9 });
  pencilTip.rotation.x = Math.PI; // flip so sharp point faces outward
  pencilTip.position.y = -0.49;
  pencil.add(pencilTip);

  var pencilEraser = mkMesh(new THREE.CylinderGeometry(0.027, 0.027, 0.055, 8), 0xffaaaa, { roughness: 0.6 });
  pencilEraser.position.y = 0.478;
  pencil.add(pencilEraser);

  pencil.rotation.z = Math.PI / 2;
  pencil.rotation.y = 0.35;
  pencil.position.set(-1.7, DESK_TOP + 0.025, 0.90);
  scene.add(pencil);

  // ── Draggables list ────────────────────────────────────────────────────────────
  var draggables = [mug, books, plant, notebook, pencil, keyboard, mouseObj];
  draggables.forEach(function(d) { d.userData.baseY = d.position.y; });

  // Axis-aligned bounding rectangle footprints (hw = half-width in X, hd = half-depth in Z).
  // For rotated objects the AABB is pre-computed: hw' = hw|cosθ| + hd|sinθ|, hd' = hw|sinθ| + hd|cosθ|.
  function _aabb(hw, hd, ry) {
    var c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    return { hw: hw * c + hd * s, hd: hw * s + hd * c };
  }
  var _b;
  _b = _aabb(0.76 * 1.4, 0.25 * 1.4, 0); keyboard.userData.hw = _b.hw; keyboard.userData.hd = _b.hd;  // case 1.52×0.50 scaled 1.4×
  _b = _aabb(0.112 * 1.4, 0.16 * 1.4, 0); mouseObj.userData.hw = _b.hw; mouseObj.userData.hd = _b.hd;  // body 0.176×0.296 scaled 1.4×
  _b = _aabb(0.30, 0.24, 0);        mug.userData.hw = _b.hw; mug.userData.hd = _b.hd;            // cyl r=0.22 + handle
  _b = _aabb(0.40, 0.28, 0);        books.userData.hw = _b.hw; books.userData.hd = _b.hd;        // stack 0.78×0.54
  _b = _aabb(0.25, 0.25, 0);        plant.userData.hw = _b.hw; plant.userData.hd = _b.hd;        // pot r=0.2, leaves
  _b = _aabb(0.30, 0.23, 0.22);     notebook.userData.hw = _b.hw; notebook.userData.hd = _b.hd;  // cover 0.60×0.46, ry=0.22
  _b = _aabb(0.45, 0.05, 0.35);     pencil.userData.hw = _b.hw; pencil.userData.hd = _b.hd;      // length 0.9 flat, ry=0.35

  // Fixed obstacles that block dragging but cannot themselves be moved
  var staticColliders = [monitor];
  monitor.userData.hw = 0.90 * 1.4; // 1.26 — scaled foot half-width
  monitor.userData.hd = 0.37 * 1.4; // 0.518 — scaled foot half-depth

  var draggableMeshes = [];
  draggables.forEach(function(d) {
    d.traverse(function(c) { if (c.isMesh) draggableMeshes.push(c); });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // EXAMINE INTERACTIONS
  //   Desk objects      → click lifts toward camera ("pick up"), click again drops
  //   Shelf items       → same pick-up behaviour (inside shelfGroup local space)
  //   Photo frames      → same pick-up behaviour (inside photoGroup local space)
  // ════════════════════════════════════════════════════════════════════════════

  // ── Pick-up state ─────────────────────────────────────────────────────────
  var _heldObj       = null;
  var _heldOrigPos   = new THREE.Vector3();
  var _heldOrigRot   = new THREE.Euler();
  var _heldT         = 0;       // 0 = resting, 1 = fully lifted
  var _heldGoal      = 0;
  var _heldTargetPos = new THREE.Vector3(0, 1.05, 1.15); // updated per pickup
  var _heldNoRotate  = false;   // true for wall items (keep original orientation)

  // Default desk-pickup constants
  var _DESK_HELD_POS = new THREE.Vector3(0, 1.05, 1.15);
  var _HELD_ROT      = new THREE.Euler(-0.35, 0, 0); // slight tilt toward camera

  // ── Per-item "held" local positions ──────────────────────────────────────
  // These positions are in each parent group's LOCAL space and produce world
  // position (0, 1.05, 1.15) when the group's transform is applied.
  //
  // shelfGroup: pos(1.375,-0.475,0) scale(1.5,1.5,1)
  //   local = (world - pos) / scale  →  (-0.917, 1.017, 1.15)
  var _SH_HELD_L = new THREE.Vector3(-0.917, 1.017, 1.15);
  //
  // photoGroup: pos(-0.72, 0.43, 0.05) scale(1.3, 1.3, 1)
  //   local = (world - pos) / scale  →  (0.554, 0.477, 1.10)
  var _PH_HELD_L = new THREE.Vector3(0.554, 0.477, 1.10);

  // Collect per-item raycasting targets and tag each mesh with its sub-group
  var _wallExamineMeshes = [];
  _shelfItems.forEach(function(g) {
    g.userData.wallHeldLocalPos = _SH_HELD_L;
    g.traverse(function(c) {
      if (c.isMesh) { c.userData._examineGroup = g; _wallExamineMeshes.push(c); }
    });
  });
  _frameGroups.forEach(function(g) {
    g.userData.wallHeldLocalPos = _PH_HELD_L;
    g.traverse(function(c) {
      if (c.isMesh) { c.userData._examineGroup = g; _wallExamineMeshes.push(c); }
    });
  });

  // Drag-vs-click detection: track mouse travel distance since mousedown
  var _mdX = 0, _mdY = 0, _didDrag = false;
  var _pendingMouseEvent = null;
  var _mouseRaf = 0;
  var _heldWorldPos = new THREE.Vector3();

  // ── Rotation-while-held state ─────────────────────────────────────────────
  var _isRotating   = false;   // mouse button is held while an object is up
  var _rotPrevX     = 0;
  var _rotPrevY     = 0;
  var _heldUserRotY = 0;       // accumulated yaw the user has spun
  var _heldUserRotX = 0;       // accumulated pitch the user has spun

  // ── Examine light — warm fill that fades in when an object is held ────────
  var _examineLight = new THREE.PointLight(0xfff5e8, 0, 2.5, 2);
  scene.add(_examineLight);

  // ── Highlight helper ────────────────────────────────────────────────────────────
  function setHighlight(obj, on) {
    if (!obj) return;
    obj.traverse(function(c) {
      if (!c.isMesh) return;
      if (on) {
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
  // AABB overlap test: returns true if placing `self` at (x, z) would intersect any draggable or fixed obstacle
  function wouldCollide(x, z, self) {
    var obstacles = draggables.concat(staticColliders);
    for (var i = 0; i < obstacles.length; i++) {
      var other = obstacles[i];
      if (other === self) continue;
      if (Math.abs(x - other.position.x) < self.userData.hw + other.userData.hw &&
          Math.abs(z - other.position.z) < self.userData.hd + other.userData.hd) return true;
    }
    return false;
  }

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

  function hitScreenCanvas() {
    var hits = raycaster.intersectObject(screenDisplay, false);
    if (!hits.length || !hits[0].uv) return null;
    return { x: hits[0].uv.x * 1280, y: (1 - hits[0].uv.y) * 960 };
  }

  function linkAt(cx, cy) {
    for (var i = 0; i < _screenLinks.length; i++) {
      var L = _screenLinks[i];
      if (cx >= L.x && cx <= L.x + L.w && cy >= L.y && cy <= L.y + L.h) return i;
    }
    return -1;
  }

  function inHit(h, cx, cy) {
    return h && cx >= h.x && cx <= h.x + h.w && cy >= h.y && cy <= h.y + h.h;
  }

  function screenUIAt(cx, cy) {
    if (_winAnimDir !== 0) return null;
    if (_screenMode === 'about') {
      if (inHit(_closeHit, cx, cy)) return 'close';
      var li = linkAt(cx, cy);
      if (li >= 0) return li;
      if (inHit(_photoHit, cx, cy)) return 'photo';
      return null;
    }
    if (inHit(_aboutFileHit, cx, cy)) return 'aboutfile';
    return null;
  }

  canvas.addEventListener('mousemove', function(e) {
    var _dx = e.clientX - _mdX, _dy = e.clientY - _mdY;
    if (_dx * _dx + _dy * _dy > 36) _didDrag = true; // 6 px threshold

    // ── Rotate held object while mouse button is held ─────────────────────
    if (_isRotating && _heldObj) {
      _heldUserRotY += (e.clientX - _rotPrevX) * 0.008;
      _heldUserRotX += (e.clientY - _rotPrevY) * 0.008;
      _rotPrevX = e.clientX;
      _rotPrevY = e.clientY;
      canvas.style.cursor = 'grabbing';
      return;
    }

    _pendingMouseEvent = e;
    if (_mouseRaf) return;
    _mouseRaf = requestAnimationFrame(function() {
      _mouseRaf = 0;
      var ev = _pendingMouseEvent;
      if (!ev) return;
      _pendingMouseEvent = null;

      updateMouse(ev);
      raycaster.setFromCamera(mouse2D, camera);

      if (dragged) {
        dragPlane.constant = -dragged.position.y;
        var hit = raycaster.ray.intersectPlane(dragPlane, planeHit);
        if (hit) {
          var rawX = Math.max(-2.3, Math.min(2.3, planeHit.x - dragOffsetX));
          var rawZ = Math.max(-1.2, Math.min(1.2, planeHit.z - dragOffsetZ));
          if (!wouldCollide(rawX, rawZ, dragged)) {
            dragged.position.x = rawX;
            dragged.position.z = rawZ;
          }
        }
        canvas.style.cursor = 'grabbing';
        setHoverUI(null);
      } else if (_heldObj) {
        canvas.style.cursor = 'grab';
        setHoverUI(null);
      } else {
        var hits = raycaster.intersectObjects(draggableMeshes);
        var newHovered = hits.length > 0 ? getDraggableParent(hits[0].object) : null;
        if (newHovered !== hovered) {
          setHighlight(hovered, false);
          hovered = newHovered;
          setHighlight(hovered, true);
        }
        if (hovered) {
          canvas.style.cursor = 'grab';
          setHoverUI(null);
        } else {
          var weh = raycaster.intersectObjects(_wallExamineMeshes, true);
          if (weh.length) {
            canvas.style.cursor = 'grab';
            setHoverUI(null);
          } else {
            var sp = hitScreenCanvas();
            setHoverUI(sp ? screenUIAt(sp.x, sp.y) : null);
            canvas.style.cursor = _hoverUI !== null ? 'pointer' : 'default';
          }
        }
      }
    });
  });

  canvas.addEventListener('mousedown', function(e) {
    _mdX = e.clientX; _mdY = e.clientY; _didDrag = false;

    // If an object is held, the mouse button starts a rotation gesture
    if (_heldObj) {
      _isRotating = true;
      _rotPrevX = e.clientX;
      _rotPrevY = e.clientY;
      return;
    }

    updateMouse(e);
    raycaster.setFromCamera(mouse2D, camera);
    var hits = raycaster.intersectObjects(draggableMeshes);
    if (hits.length > 0) {
      dragged = getDraggableParent(hits[0].object);
      if (dragged === _heldObj) dragged = null; // can't drag a lifted object
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
    _isRotating = false;
    if (dragged) {
      setHighlight(dragged, false);
      hovered = null;
      dragged = null;
    }
    canvas.style.cursor = _heldObj ? 'grab' : 'default';
  });

  canvas.addEventListener('mouseleave', function() {
    setHoverUI(null);
  });

  // ── Click handler — colour buttons, pick-up, zoom ───────────────────────────
  canvas.addEventListener('click', function(e) {
    if (_didDrag) return;  // was a drag, not a tap
    updateMouse(e);
    raycaster.setFromCamera(mouse2D, camera);

    // 1. Colour-button clicks always fire, even while zoomed
    var btnHits = raycaster.intersectObjects(_btnMeshes);
    if (btnHits.length && btnHits[0].object.userData.isColorBtn) {
      var btn = btnHits[0].object;
      _bgColor = btn.userData.screenBg;
      screenGlow.color.setHex(btn.userData.glowColor);
      if (_activeBtn) _activeBtn.material.emissiveIntensity = 0.0;
      btn.material.emissiveIntensity = 0.55;
      _activeBtn = btn;
      markScreenDirty();
      return;
    }

    // CRT screen UI — close, links, aboutme.txt file
    var sp = hitScreenCanvas();
    if (sp) {
      var ui = screenUIAt(sp.x, sp.y);
      if (ui === 'close') {
        startWinAnim(1);
        return;
      }
      if (ui === 'aboutfile') {
        startWinAnim(-1);
        return;
      }
      if (typeof ui === 'number') {
        window.open(_screenLinks[ui].url, '_blank');
        return;
      }
      return; // click on the glass doesn't pass through to the desk
    }

    // 2. If an object is held → drop ONLY when clicking off the object
    if (_heldObj) {
      var _heldMeshes = [];
      _heldObj.traverse(function(c) { if (c.isMesh) _heldMeshes.push(c); });
      var _heldHit = raycaster.intersectObjects(_heldMeshes, true);
      if (_heldHit.length === 0) _heldGoal = 0; // missed → put it down
      return; // always block other interactions while holding
    }

    // 4. Desk objects → pick up (lift toward camera, slight tilt)
    var deskHits = raycaster.intersectObjects(draggableMeshes, true);
    if (deskHits.length) {
      var obj = getDraggableParent(deskHits[0].object);
      if (obj) {
        _heldOrigPos.copy(obj.position);
        _heldOrigRot.copy(obj.rotation);
        _heldTargetPos.copy(_DESK_HELD_POS);
        _heldNoRotate = false;
        _heldObj  = obj;
        _heldT    = 0;
        _heldGoal = 1;
        setHighlight(obj, false);
        return;
      }
    }

    // 5. Wall examine groups (shelf, photo frames) → float group toward camera
    var examineHits = raycaster.intersectObjects(_wallExamineMeshes, true);
    if (examineHits.length) {
      var grp = examineHits[0].object.userData._examineGroup;
      if (grp && grp.userData.wallHeldLocalPos) {
        _heldOrigPos.copy(grp.position);
        _heldOrigRot.copy(grp.rotation);
        _heldTargetPos.copy(grp.userData.wallHeldLocalPos);
        _heldNoRotate = true;
        _heldObj  = grp;
        _heldT    = 0;
        _heldGoal = 1;
        return;
      }
    }

  });

  // ── Animation loop ──────────────────────────────────────────────────────────────
  var clock = 0;
  var _loopActive = false;
  var _heroInView = true;
  var _rafId = 0;

  function animate() {
    _rafId = 0;
    if (!_loopActive) return;
    _rafId = requestAnimationFrame(animate);
    clock += 0.016;

    draggables.forEach(function(d, idx) {
      if (d !== dragged && d !== _heldObj) {
        d.position.y = d.userData.baseY + Math.sin(clock * 0.7 + idx * 1.1) * 0.007;
      }
    });

    // ── Pick-up animation (desk objects + wall examine groups) ────────────────
    if (_heldObj) {
      _heldT += (_heldGoal - _heldT) * 0.12;
      var _ht = _heldT * _heldT * (3 - 2 * _heldT);   // smoothstep ease
      _heldObj.position.lerpVectors(_heldOrigPos, _heldTargetPos, _ht);

      // Decay user rotation when returning
      if (_heldGoal === 0) { _heldUserRotY *= 0.88; _heldUserRotX *= 0.88; }

      if (!_heldNoRotate) {
        // Desk objects: tilt toward camera + blend in user spin
        _heldObj.rotation.x = _heldOrigRot.x + (_HELD_ROT.x - _heldOrigRot.x) * _ht + _heldUserRotX;
        _heldObj.rotation.y = _heldOrigRot.y * (1 - _ht) + _heldUserRotY;
        _heldObj.rotation.z = _heldOrigRot.z * (1 - _ht);
      } else {
        // Wall groups: no auto-tilt, just user spin on top of original
        _heldObj.rotation.x = _heldOrigRot.x + _heldUserRotX;
        _heldObj.rotation.y = _heldOrigRot.y + _heldUserRotY;
        _heldObj.rotation.z = _heldOrigRot.z;
      }

      // Examine light tracks the held object and fades in once it's up
      _heldObj.getWorldPosition(_heldWorldPos);
      _examineLight.position.set(_heldWorldPos.x, _heldWorldPos.y + 0.12, _heldWorldPos.z + 0.5);
      var _liTarget = _heldT > 0.4 ? 2.5 : 0;
      _examineLight.intensity += (_liTarget - _examineLight.intensity) * 0.15;

      // Once fully returned, restore and clear state
      if (_heldGoal === 0 && _heldT < 0.004) {
        _heldObj.position.copy(_heldOrigPos);
        _heldObj.rotation.copy(_heldOrigRot);
        if (!_heldNoRotate) _heldObj.userData.baseY = _heldOrigPos.y;
        _heldObj      = null;
        _heldT        = 0;
        _heldNoRotate = false;
        _heldUserRotY = 0;
        _heldUserRotX = 0;
      }
    } else {
      // No object held — fade examine light out
      _examineLight.intensity *= 0.85;
    }


    // Steam follows mug
    steamGroup.position.x = mug.position.x;
    steamGroup.position.z = mug.position.z;
    steamGroup.position.y = mug.position.y + 0.41;

    steamParticles.forEach(function(p) {
      var t = ((clock * 0.48 + p.userData.phase / (Math.PI * 2)) % 1.0);
      p.position.y = t * 0.58;
      p.position.x = Math.sin(t * Math.PI * 2.5 + p.userData.phase) * 0.045 + p.userData.xDrift * t;
      p.material.opacity = Math.sin(t * Math.PI) * 0.42;
      p.scale.setScalar(0.75 + t * 1.5);
    });

    lampLight.intensity = 3.10 + Math.sin(clock * 1.8) * 0.14 + Math.sin(clock * 4.3) * 0.06;
    lampSpot.intensity  = 8.80 + Math.sin(clock * 1.8) * 0.22 + Math.sin(clock * 4.3) * 0.10;
    screenGlow.intensity = 0.72 + Math.sin(clock * 0.5) * 0.08;

    // CRT texture: redraw only when dirty. About mode is static except hover/clicks;
    // desktop throttles to ~12fps for the loading bar + clock colon blink.
    if (_winAnimDir !== 0) {
      markScreenDirty();
    } else if (_screenMode === 'desktop') {
      var now = Date.now();
      if (now - _lastDesktopTick >= 80) {
        _lastDesktopTick = now;
        markScreenDirty();
      }
    }
    if (_screenDirty) drawCRTScreen();

    renderer.render(scene, camera);
  }

  function syncAnimLoop() {
    var shouldRun = _heroInView && !document.hidden;
    if (shouldRun === _loopActive) return;
    _loopActive = shouldRun;
    if (_loopActive) {
      if (!_rafId) _rafId = requestAnimationFrame(animate);
    } else if (_rafId) {
      cancelAnimationFrame(_rafId);
      _rafId = 0;
    }
  }

  if (typeof IntersectionObserver !== 'undefined') {
    var heroIo = new IntersectionObserver(function(entries) {
      _heroInView = entries[0].isIntersecting;
      syncAnimLoop();
    }, { threshold: 0.01 });
    heroIo.observe(canvas);
  }
  document.addEventListener('visibilitychange', syncAnimLoop);
  syncAnimLoop();

  // ── Resize ──────────────────────────────────────────────────────────────────────
  window.addEventListener('resize', function() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
});
