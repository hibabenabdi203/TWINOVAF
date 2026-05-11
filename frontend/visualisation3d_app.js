/* =============================================================
   TWINOVA — MODULE VISUALISATION 3D V2 — Jumeau Numérique
   ✅ GLTFLoader : vrais modèles GLB (8 fichiers)
   ✅ Annotations 3D interactives (CSS2DRenderer)
   ✅ Fallback géométrique si GLB absent
   ✅ Même API publique : visu3d.init(), setMode(), setLevel()
   ============================================================= */

const visu3d = (() => {

  // ── État global ──────────────────────────────────────────────────────────
  let scene, camera, renderer, labelRenderer;
  let raycaster, mouse;
  let animationId;
  let autoRotate = true;
  let currentMode = 'production';
  let currentLevel = 'usine';
  let selectedMachine = null;
  let particles = [];
  let clock;
  let machines3d = [];
  let annotationObjects = [];
  let mixers = [];

  // ── Config machines (GLB mappé sur chaque machine) ────────────────────────
  const MACHINES_CONFIG = [
    {
      id: 1, nom: 'Trémie Réception', type: 'reception',
      pos: [-8, 0, -4], scale: 1.4, glb: null,
      color: 0x0057b8, trs: 92, temp: 18, hsi: 88, alerte: 'normal', cout_h: 1200,
      annotations: [
        { id:1, label:'Capteur poids',  pos:[0,1.8,0.4],  data:{ poids:'485 kg', seuil:'500 kg', statut:'✅ OK'} },
        { id:2, label:'Tapis vibrant',  pos:[0.5,0.5,0],  data:{ vitesse:'0.8 m/s', usure:'15%', statut:'✅ OK'} },
      ]
    },
    {
      id: 2, nom: 'Pasteurisateur HTST', type: 'transformation',
      pos: [-4, 0, -4], scale: 1.8, glb: 'plate_pasteurizer.glb',
      color: 0xf59e0b, trs: 78, temp: 74, hsi: 72, alerte: 'warning', cout_h: 3500,
      annotations: [
        { id:1, label:'Chambre de chauffe',  pos:[0,1.6,0.4],   data:{ temperature:'74°C', seuil:'72°C', statut:'⚠️ Alerte'} },
        { id:2, label:'Échangeur thermique', pos:[0.5,0.8,0],   data:{ efficacite:'89%', encrassement:'11%', statut:'⚠️ Surveiller'} },
        { id:3, label:'Pompe alimentation',  pos:[-0.5,0.4,0.3],data:{ debit:'2 400 L/h', vibration:'3.1 mm/s', statut:'✅ OK'} },
      ]
    },
    {
      id: 3, nom: 'Cuve Fermentation', type: 'transformation',
      pos: [0, 0, -4], scale: 2.2, glb: 'oil_storage_small_tank.glb',
      color: 0x00ffd1, trs: 85, temp: 42, hsi: 90, alerte: 'normal', cout_h: 2100,
      annotations: [
        { id:1, label:'Niveau liquide', pos:[0,1.8,0.4],   data:{ niveau:'78%', volume:'3 900 L', statut:'✅ OK'} },
        { id:2, label:'Capteur pH',     pos:[0.4,1.0,0.4], data:{ ph:'4.2', plage:'3.8–4.5', statut:'✅ OK'} },
        { id:3, label:'Agitateur',      pos:[-0.3,0.4,0.3],data:{ rpm:'45', couple:'82 Nm', statut:'✅ OK'} },
      ]
    },
    {
      id: 4, nom: 'Mélangeur Inox', type: 'transformation',
      pos: [4, 0, -4], scale: 1.4, glb: null,
      color: 0xef4444, trs: 65, temp: 38, hsi: 45, alerte: 'critical', cout_h: 1800,
      annotations: [
        { id:1, label:'Moteur principal', pos:[0,1.5,0.3],   data:{ hsi:'45%', rul:'48h', statut:'🔴 CRITIQUE'} },
        { id:2, label:'Joint mécanique',  pos:[0.3,0.8,0.3], data:{ usure:'87%', remplacement:'URGENT', statut:'🔴 CRITIQUE'} },
      ]
    },
    {
      id: 5, nom: 'Remplisseuse', type: 'conditionnement',
      pos: [-4, 0, 0], scale: 2.0, glb: 'low-poly_conveyor_for_scada_hmi.glb',
      color: 0x1a8a4a, trs: 88, temp: 22, hsi: 82, alerte: 'normal', cout_h: 2800,
      annotations: [
        { id:1, label:'Tête remplissage', pos:[0,1.2,0.4],  data:{ cadence:'850 bt/h', precision:'±2 ml', statut:'✅ OK'} },
        { id:2, label:'Capteur présence', pos:[0.5,0.5,0.4],data:{ detections:'99.8%', faux_positifs:'0.2%', statut:'✅ OK'} },
      ]
    },
    {
      id: 6, nom: 'Station de Contrôle', type: 'conditionnement',
      pos: [0, 0, 0], scale: 1.8, glb: 'monitoring_station.glb',
      color: 0x1a8a4a, trs: 91, temp: 24, hsi: 79, alerte: 'normal', cout_h: 900,
      annotations: [
        { id:1, label:'Console opérateur', pos:[0,1.4,0.3],  data:{ alertes:'2 actives', operateur:'En poste', statut:'⚠️ Surveiller'} },
        { id:2, label:'Écran supervision', pos:[0.4,1.8,0.2],data:{ uptime:'99.7%', derniere_MAJ:'10 min', statut:'✅ OK'} },
      ]
    },
    {
      id: 7, nom: 'Palettiseur Robot', type: 'conditionnement',
      pos: [4, 0, 0], scale: 0.9, glb: 'industrial_robot_arm.glb',
      color: 0x1a8a4a, trs: 96, temp: 26, hsi: 94, alerte: 'normal', cout_h: 2200,
      annotations: [
        { id:1, label:'Base rotation',   pos:[0,0.6,0.3],   data:{ angle:'±180°', precision:'±0.05mm', statut:'✅ OK'} },
        { id:2, label:'Effecteur final', pos:[0.3,1.8,0.2],  data:{ charge:'25 kg', cycles:'128 450', statut:'✅ OK'} },
        { id:3, label:'Bras articulé',   pos:[0.2,1.2,0.2],  data:{ hsi:'94%', rul:'1 200h', statut:'✅ OK'} },
      ]
    },
    {
      id: 8, nom: 'Bras Robotique Animé', type: 'conditionnement',
      pos: [8, 0, 0], scale: 1.2, glb: 'animated_robotic_arm__blender_3d.glb',
      color: 0x8b5cf6, trs: 88, temp: 35, hsi: 72, alerte: 'maintenance', cout_h: 2200,
      annotations: [
        { id:1, label:'Articulation principale', pos:[0,1.0,0.3],  data:{ hsi:'72%', rul:'320h', statut:'🔧 Maintenance'} },
        { id:2, label:'Pince pneumatique',       pos:[0.3,1.6,0.2],data:{ pression:'6 bar', etancheite:'OK', statut:'✅ OK'} },
      ]
    },
    {
      id: 9, nom: 'Chaudière Vapeur', type: 'utilites',
      pos: [-8, 0, 4], scale: 1.4, glb: null,
      color: 0x8b5cf6, trs: 88, temp: 180, hsi: 61, alerte: 'maintenance', cout_h: 5200,
      annotations: [
        { id:1, label:'Corps chaudière', pos:[0,1.5,0.4],  data:{ pression:'8 bar', temp:'180°C', statut:'🔧 Maintenance'} },
        { id:2, label:'Brûleur',         pos:[0.3,0.5,0.4],data:{ debit_gaz:'12 m³/h', rendement:'87%', statut:'⚠️ Surveiller'} },
      ]
    },
    {
      id: 10, nom: 'Compresseur Air', type: 'utilites',
      pos: [-4, 0, 4], scale: 1.2, glb: null,
      color: 0x8b5cf6, trs: 94, temp: 55, hsi: 83, alerte: 'normal', cout_h: 1100,
      annotations: [
        { id:1, label:'Tête compression', pos:[0,1.3,0.4],  data:{ pression:'10 bar', debit:'850 L/min', statut:'✅ OK'} },
        { id:2, label:'Sécheur air',      pos:[0.4,0.6,0.3],data:{ point_rosee:'-20°C', humidite:'<10%', statut:'✅ OK'} },
      ]
    },
  ];

  // ── Produits 3D (bouteilles) ──────────────────────────────────────────────
  const PRODUITS_CONFIG = [
    {
      id:'eau', nom:'Bouteille Eau Minérale', glb:'fiji_water_bottle.glb',
      pos:[11, 0, -4], scale: 3.5,
      annotations: [
        { id:1, label:'Bouchon',     pos:[0,2.2,0.2],   data:{ etancheite:'Conforme', materiau:'PEHD', statut:'✅ OK'} },
        { id:2, label:'Liquide',     pos:[0.2,1.0,0.2], data:{ ph:'7.2', turbidite:'0.1 NTU', nitrates:'<10 mg/L', statut:'✅ OK'} },
        { id:3, label:'Étiquette',   pos:[0.3,0.7,0.3], data:{ lot:'L2025-045', fabrication:'01/05/2026', peremption:'01/05/2027', statut:'✅ OK'} },
        { id:4, label:'Corps PET',   pos:[-0.2,0.3,0.2],data:{ epaisseur:'0.35mm', defauts:'Aucun', statut:'✅ OK'} },
      ]
    },
    {
      id:'jus', nom:'Bouteille Jus Premium', glb:'air_up_pro_bottle_-_industrial_design.glb',
      pos:[14, 0, -4], scale: 1.8,
      annotations: [
        { id:1, label:'Capsule',        pos:[0,2.5,0.2],   data:{ etancheite:'Conforme', pression:'1.2 bar', statut:'✅ OK'} },
        { id:2, label:'Jus de fruits',  pos:[0.2,1.2,0.2], data:{ ph:'3.8', brix:'12°', vitamine_c:'45mg/100ml', statut:'✅ OK'} },
        { id:3, label:'Corps bouteille',pos:[0.3,0.5,0.3], data:{ materiau:'PET recyclé', epaisseur:'0.40mm', defauts:'Aucun', statut:'✅ OK'} },
      ]
    },
  ];

  const COLORS = { normal:0x00ffd1, warning:0xf59e0b, critical:0xef4444, maintenance:0x8b5cf6, cip:0x3b82f6 };
  const getColorForStatus = s => COLORS[s] || COLORS.normal;

  // ── INIT ──────────────────────────────────────────────────────────────────
  const init = () => {
    const canvas = document.getElementById('visu-canvas');
    if (!canvas) return;

    if (renderer) { renderer.dispose(); renderer = null; }
    if (animationId) cancelAnimationFrame(animationId);
    machines3d = []; particles = []; annotationObjects = []; mixers = [];

    // Nettoyer labelRenderer précédent
    const old = document.getElementById('visu-label-renderer');
    if (old) old.remove();

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    scene.fog = new THREE.Fog(0x0a0f1e, 25, 65);
    clock = new THREE.Clock();

    // Caméra
    const container = canvas.parentElement;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 500;
    camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    camera.position.set(0, 12, 16);
    camera.lookAt(0, 0, 0);

    // WebGL Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // CSS2D Renderer (annotations)
    if (typeof THREE.CSS2DRenderer !== 'undefined') {
      labelRenderer = new THREE.CSS2DRenderer();
      labelRenderer.setSize(w, h);
      labelRenderer.domElement.id = 'visu-label-renderer';
      labelRenderer.domElement.style.cssText =
        'position:absolute;top:0;left:0;pointer-events:none;z-index:5;';
      container.appendChild(labelRenderer.domElement);
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2(-999, -999);

    setupLights();
    buildEnvironnement();
    buildGrid();
    buildAllModels();
    buildParticles();

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    setupOrbitControls(canvas);

    updateKPIs();
    updateLegende('production');
    animate();
  };

  // ── Éclairages ────────────────────────────────────────────────────────────
  const setupLights = () => {
    scene.add(new THREE.AmbientLight(0x1a2040, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(10, 20, 10); dir.castShadow = true;
    dir.shadow.mapSize.set(2048, 2048); scene.add(dir);
    const teal = new THREE.PointLight(0x00ffd1, 0.5, 25);
    teal.position.set(0, 8, 0); scene.add(teal);
    const blue = new THREE.PointLight(0x0057b8, 0.3, 20);
    blue.position.set(-8, 5, -8); scene.add(blue);
  };

  // ── Environnement ─────────────────────────────────────────────────────────
  const buildEnvironnement = () => {
    const solMat = new THREE.MeshStandardMaterial({ color:0x0d1117, roughness:0.8, metalness:0.2 });
    const sol = new THREE.Mesh(new THREE.PlaneGeometry(60, 35), solMat);
    sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; scene.add(sol);
    const murMat = new THREE.MeshStandardMaterial({ color:0x1a1f2e, transparent:true, opacity:0.25, side:THREE.DoubleSide });
    const mArr = new THREE.Mesh(new THREE.PlaneGeometry(60, 6), murMat);
    mArr.position.set(0, 3, -9); scene.add(mArr);
  };

  const buildGrid = () => {
    const grid = new THREE.GridHelper(60, 60, 0x1a2040, 0x1a2040);
    grid.material.opacity = 0.35; grid.material.transparent = true; scene.add(grid);
  };

  // ── Chargement de tous les modèles ────────────────────────────────────────
  const buildAllModels = () => {
    const loader = (typeof THREE.GLTFLoader !== 'undefined') ? new THREE.GLTFLoader() : null;

    [...MACHINES_CONFIG, ...PRODUITS_CONFIG].forEach(cfg => {
      const isProduit = !!PRODUITS_CONFIG.find(p => p.id === cfg.id);
      if (cfg.glb && loader) {
        loader.load(
          `models/${cfg.glb}`,
          gltf => onGLBLoaded(gltf, cfg, isProduit),
          null,
          () => isProduit ? creerFallbackProduit(cfg) : creerFallbackMachine(cfg)
        );
      } else {
        isProduit ? creerFallbackProduit(cfg) : creerFallbackMachine(cfg);
      }
    });
  };

  // ── GLB chargé ────────────────────────────────────────────────────────────
  const onGLBLoaded = (gltf, cfg, isProduit) => {
    const model = gltf.scene;
    model.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    model.scale.setScalar(cfg.scale || 1.5);
    model.traverse(child => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    scene.add(model);

    // Animations GLB
    if (gltf.animations && gltf.animations.length) {
      const mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());
      mixers.push(mixer);
    }

    // Halo
    const haloColor = isProduit ? 0x00e5ff : getColorForStatus(cfg.alerte);
    const haloLight = new THREE.PointLight(haloColor, 0.4, 5);
    haloLight.position.set(cfg.pos[0], cfg.pos[1] + 2, cfg.pos[2]);
    scene.add(haloLight);

    // Proxy raycasting pour les machines
    if (!isProduit) {
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const proxy = new THREE.Mesh(
        new THREE.BoxGeometry(size.x, size.y, size.z),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.position.copy(center);
      proxy.userData.cfg = cfg;
      scene.add(proxy);
      machines3d.push({ group: model, mesh: proxy, haloLight, mat: null, haloMat: null, cfg });
    }

    ajouterAnnotations(model, cfg);
  };

  // ── Fallback Machine géométrique ──────────────────────────────────────────
  const creerFallbackMachine = (cfg) => {
    const group = new THREE.Group();
    group.position.set(...cfg.pos);

    let geo;
    switch(cfg.type) {
      case 'reception':       geo = new THREE.BoxGeometry(1.4,1.8,1.4); break;
      case 'transformation':  geo = new THREE.CylinderGeometry(0.8,0.8,2,16); break;
      case 'conditionnement': geo = new THREE.BoxGeometry(1.6,1.2,1.0); break;
      case 'stockage':        geo = new THREE.BoxGeometry(2.0,2.4,1.6); break;
      case 'utilites':        geo = new THREE.SphereGeometry(0.8,16,16); break;
      default:                geo = new THREE.BoxGeometry(1.2,1.2,1.2);
    }
    const color = getColorForStatus(cfg.alerte);
    const mat = new THREE.MeshStandardMaterial({ color, roughness:0.3, metalness:0.7, emissive:color, emissiveIntensity:0.15 });
    const mesh = new THREE.Mesh(geo, mat);
    const h = geo.parameters?.height || 1.6;
    mesh.position.y = h / 2; mesh.castShadow = true; mesh.userData.cfg = cfg;
    group.add(mesh);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.8,0.12,1.8),
      new THREE.MeshStandardMaterial({ color:0x1a2040, metalness:0.8 })
    );
    base.position.y = 0.06; group.add(base);

    const haloMat = new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.06, side:THREE.BackSide });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.3,12,12), haloMat);
    halo.position.y = 1; group.add(halo);

    scene.add(group);
    machines3d.push({ group, mesh, halo, mat, haloMat, cfg });
    ajouterAnnotations(group, cfg);
  };

  // ── Fallback Produit ──────────────────────────────────────────────────────
  const creerFallbackProduit = (cfg) => {
    const group = new THREE.Group();
    group.position.set(...cfg.pos);
    const mat = new THREE.MeshStandardMaterial({ color:0x00e5ff, roughness:0.2, metalness:0.4, transparent:true, opacity:0.75 });
    const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.3,1.8,16), mat);
    corps.position.y = 0.9; group.add(corps);
    const bouchon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15,0.15,0.2,12),
      new THREE.MeshStandardMaterial({ color:0xffffff })
    );
    bouchon.position.y = 1.9; group.add(bouchon);
    scene.add(group);
    ajouterAnnotations(group, cfg);
  };

  // ── Annotations 3D (sphères cliquables + labels CSS2D) ───────────────────
  const ajouterAnnotations = (model, cfg) => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    (cfg.annotations || []).forEach(ann => {
      // Sphère pulsante
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      sphere.position.set(
        center.x + ann.pos[0] * Math.max(size.x * 0.35, 0.5),
        center.y + ann.pos[1] * Math.max(size.y * 0.25, 0.5),
        center.z + ann.pos[2] * Math.max(size.z * 0.35, 0.5)
      );
      sphere.userData = { isAnnotation: true, annotation: ann, cfg };
      scene.add(sphere);
      annotationObjects.push(sphere);

      // Label CSS2D
      if (labelRenderer) {
        const div = document.createElement('div');
        div.className = 'ann-badge-3d';
        div.textContent = ann.id;
        div.title = ann.label;
        const label = new THREE.CSS2DObject(div);
        label.position.copy(sphere.position);
        label.position.y += 0.2;
        scene.add(label);
      }

      // Ligne décorative
      const pts = [sphere.position.clone(), sphere.position.clone().add(new THREE.Vector3(0.3,0.3,0))];
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color:0x00e5ff, transparent:true, opacity:0.5 })
      ));
    });
  };

  // ── Particules flux ───────────────────────────────────────────────────────
  const buildParticles = () => {
    const paths = [[0,1],[1,2],[2,3],[0,4],[4,5],[5,6],[6,7],[0,8],[8,9]];
    paths.forEach(([a,b]) => {
      if (!MACHINES_CONFIG[a] || !MACHINES_CONFIG[b]) return;
      const start = new THREE.Vector3(...MACHINES_CONFIG[a].pos).setY(1.2);
      const end   = new THREE.Vector3(...MACHINES_CONFIG[b].pos).setY(1.2);
      for (let i=0; i<3; i++) {
        const p = new THREE.Mesh(
          new THREE.SphereGeometry(0.08,6,6),
          new THREE.MeshBasicMaterial({ color:0x00ffd1 })
        );
        p.userData = { start: start.clone(), end: end.clone(), t: i/3 };
        scene.add(p); particles.push(p);
      }
    });
  };

  // ── Animation ─────────────────────────────────────────────────────────────
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();
    const delta = Math.min(0.05, elapsed - (animate._last || 0));
    animate._last = elapsed;

    mixers.forEach(m => m.update(delta));

    if (autoRotate) {
      camera.position.x = Math.sin(elapsed * 0.1) * 18;
      camera.position.z = Math.cos(elapsed * 0.1) * 18;
      camera.position.y = 10 + Math.sin(elapsed * 0.05) * 2;
      camera.lookAt(0, 1, 0);
    }

    // Pulsation machines fallback
    machines3d.forEach(({ mat, haloMat, cfg }, idx) => {
      if (!mat) return;
      if (cfg.alerte === 'critical') {
        const pulse = (Math.sin(elapsed * 4 + idx) + 1) / 2;
        mat.emissiveIntensity = 0.1 + pulse * 0.5;
        if (haloMat) haloMat.opacity = 0.04 + pulse * 0.12;
      } else if (cfg.alerte === 'warning') {
        const pulse = (Math.sin(elapsed * 2 + idx) + 1) / 2;
        mat.emissiveIntensity = 0.1 + pulse * 0.25;
      } else {
        mat.emissiveIntensity = 0.08 + Math.sin(elapsed * 0.5 + idx) * 0.03;
      }
      if (currentMode === 'maintenance') {
        mat.transparent = true; mat.wireframe = cfg.hsi < 60;
        mat.opacity = cfg.hsi < 60 ? 1.0 : 0.4;
      } else {
        mat.transparent = false; mat.wireframe = false; mat.opacity = 1.0;
      }
    });

    // Pulsation sphères annotations
    annotationObjects.forEach((s, i) => {
      s.scale.setScalar(1 + 0.2 * Math.sin(elapsed * 2.5 + i * 0.8));
    });

    // Particules
    const showPart = currentMode === 'production';
    particles.forEach(p => {
      p.visible = showPart;
      if (!showPart) return;
      p.userData.t += 0.004; if (p.userData.t > 1) p.userData.t = 0;
      p.position.lerpVectors(p.userData.start, p.userData.end, p.userData.t);
      p.position.y += Math.sin(p.userData.t * Math.PI) * 0.3;
      p.material.color.setHSL(0.47, 1, 0.5 + Math.sin(elapsed * 4) * 0.1);
    });

    // Raycasting tooltip
    if (!autoRotate) {
      raycaster.setFromCamera(mouse, camera);
      const cliquables = [...machines3d.map(m=>m.mesh).filter(Boolean), ...annotationObjects];
      const hits = raycaster.intersectObjects(cliquables);
      if (hits.length > 0) {
        const obj = hits[0].object;
        if (obj.userData.isAnnotation) showTooltipAnn(obj.userData.annotation, obj.userData.cfg, hits[0]);
        else if (obj.userData.cfg) showTooltip(obj.userData.cfg, hits[0]);
      } else {
        hideTooltip();
      }
    }

    renderer.render(scene, camera);
    if (labelRenderer) labelRenderer.render(scene, camera);
  };

  // ── Tooltips ──────────────────────────────────────────────────────────────
  const getTooltipPos = (intersect, rect) => {
    const pos = intersect.point.clone().project(camera);
    return {
      x: Math.min((pos.x * 0.5 + 0.5) * rect.width + 15, rect.width - 200),
      y: Math.max((-pos.y * 0.5 + 0.5) * rect.height - 60, 10)
    };
  };

  const showTooltip = (cfg, intersect) => {
    const tt = document.getElementById('visu-tooltip');
    const canvas = document.getElementById('visu-canvas');
    if (!tt || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const {x,y} = getTooltipPos(intersect, rect);
    tt.style.display = 'block'; tt.style.left = x+'px'; tt.style.top = y+'px';
    const icons = { normal:'✅', warning:'⚠️', critical:'🔴', maintenance:'🔧' };
    setText('tt-nom', cfg.nom);
    setText('tt-statut', `${icons[cfg.alerte]||'•'} ${cfg.alerte}`);
    setText('tt-details', `TRS:${cfg.trs}% · Temp:${cfg.temp}°C · HSI:${cfg.hsi} — Cliquez pour détails`);
  };

  const showTooltipAnn = (ann, cfg, intersect) => {
    const tt = document.getElementById('visu-tooltip');
    const canvas = document.getElementById('visu-canvas');
    if (!tt || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const {x,y} = getTooltipPos(intersect, rect);
    tt.style.display = 'block'; tt.style.left = x+'px'; tt.style.top = y+'px';
    setText('tt-nom', `📍 ${ann.label}`);
    setText('tt-statut', cfg.nom);
    setText('tt-details', Object.entries(ann.data).map(([k,v])=>`${k}: ${v}`).join(' · '));
  };

  const hideTooltip = () => { const t=document.getElementById('visu-tooltip'); if(t) t.style.display='none'; };

  // ── Événements souris ─────────────────────────────────────────────────────
  const onMouseMove = (e) => {
    if (autoRotate) return;
    const canvas = document.getElementById('visu-canvas');
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX-rect.left)/rect.width)*2-1;
    mouse.y = -((e.clientY-rect.top)/rect.height)*2+1;
  };

  const onClick = (e) => {
    if (!renderer) return;
    const canvas = document.getElementById('visu-canvas');
    const rect = canvas.getBoundingClientRect();
    const cm = new THREE.Vector2(
      ((e.clientX-rect.left)/rect.width)*2-1,
      -((e.clientY-rect.top)/rect.height)*2+1
    );
    raycaster.setFromCamera(cm, camera);

    // Annotations en priorité
    const annHits = raycaster.intersectObjects(annotationObjects);
    if (annHits.length > 0) {
      afficherPanneauAnnotation(annHits[0].object.userData.annotation, annHits[0].object.userData.cfg);
      return;
    }

    // Machines
    const hits = raycaster.intersectObjects(machines3d.map(m=>m.mesh).filter(Boolean));
    if (hits.length > 0 && hits[0].object.userData.cfg) {
      selectMachine(hits[0].object.userData.cfg);
    }
  };

  const onResize = () => {
    if (!renderer || !camera) return;
    const canvas = document.getElementById('visu-canvas');
    if (!canvas) return;
    const container = canvas.parentElement;
    const w = container.clientWidth, h = container.clientHeight || 500;
    camera.aspect = w/h; camera.updateProjectionMatrix();
    renderer.setSize(w,h);
    if (labelRenderer) labelRenderer.setSize(w,h);
  };

  // ── Sélection machine ─────────────────────────────────────────────────────
  const selectMachine = (cfg) => {
    selectedMachine = cfg;
    autoRotate = false;
    camera.position.set(cfg.pos[0]+4, cfg.pos[1]+5, cfg.pos[2]+4);
    camera.lookAt(...cfg.pos);

    const panel = document.getElementById('visu-machine-info');
    if (panel) panel.style.display = 'block';

    const icons = { normal:'✅', warning:'⚠️', critical:'🔴 CRITIQUE', maintenance:'🔧' };
    setText('visu-machine-nom', `${icons[cfg.alerte]||''} ${cfg.nom}`);
    setText('visu-machine-details', `Type:${cfg.type} · Coût/h:${cfg.cout_h.toLocaleString('fr-DZ')} DZD`);
    setText('visu-machine-trs', cfg.trs+'%');
    setText('visu-machine-temp', cfg.temp+'°C');
    setText('visu-machine-hsi', cfg.hsi);

    const hsiEl = document.getElementById('visu-machine-hsi');
    if (hsiEl) hsiEl.style.color = cfg.hsi>=75?'var(--green)':cfg.hsi>=55?'#f59e0b':'var(--red)';

    // Liste annotations dans le panneau
    const annList = document.getElementById('visu-ann-list');
    if (annList && cfg.annotations) {
      annList.style.display = 'block';
      annList.innerHTML = cfg.annotations.map(ann => {
        const isAlert = (ann.data.statut||'').includes('CRITIQUE') || (ann.data.statut||'').includes('Alerte') || (ann.data.statut||'').includes('Maintenance');
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;
                    background:rgba(255,255,255,0.03);border-radius:6px;margin-bottom:4px;cursor:pointer"
                  onclick="visu3d._focusAnnotation(${cfg.id},${ann.id})">
          <span style="width:20px;height:20px;background:#00e5ff;color:#000;border-radius:50%;
                       display:inline-flex;align-items:center;justify-content:center;
                       font-size:10px;font-weight:900;flex-shrink:0">${ann.id}</span>
          <div>
            <div style="font-size:12px;font-weight:600;color:#fff">${ann.label}</div>
            <div style="font-size:10px;font-family:var(--mono);color:${isAlert?'#f59e0b':'#00e5ff'}">${ann.data.statut||''}</div>
          </div>
        </div>`;
      }).join('');
    }
  };

  // ── Panneau annotation au clic ────────────────────────────────────────────
  const afficherPanneauAnnotation = (ann, cfg) => {
    const panel = document.getElementById('visu-machine-info');
    if (!panel) return;
    panel.style.display = 'block';
    setText('visu-machine-nom', `📍 ${ann.label}`);
    setText('visu-machine-details', Object.entries(ann.data).map(([k,v])=>`${k}: ${v}`).join(' · '));
    setText('visu-machine-trs', ann.data.statut||'—');
    setText('visu-machine-temp', ann.data.temperature||ann.data.temp||ann.data.ph||'—');
    setText('visu-machine-hsi', ann.data.hsi||ann.data.niveau||'—');
  };

  // ── Modes de vue ──────────────────────────────────────────────────────────
  const setMode = (mode, btn) => {
    currentMode = mode;
    document.querySelectorAll('.visu-mode-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const labels = { production:'⚡ MODE PRODUCTION', thermique:'🌡️ MODE THERMIQUE', economique:'💸 MODE ÉCONOMIQUE', maintenance:'🔧 MODE MAINTENANCE (X-RAY)' };
    setText('visu-mode-label', labels[mode]||mode);
    updateLegende(mode);

    machines3d.forEach(({ mat, haloMat, cfg }) => {
      if (!mat) return;
      let color;
      if (mode==='thermique') {
        color = new THREE.Color().setHSL((1-Math.min(cfg.temp/200,1))*0.67, 1, 0.5);
      } else if (mode==='economique') {
        color = new THREE.Color().setHSL((1-Math.min(cfg.cout_h/6000,1))*0.33, 1, 0.5);
      } else {
        color = new THREE.Color(getColorForStatus(cfg.alerte));
      }
      mat.color.set(color); mat.emissive.set(color);
      if (haloMat) haloMat.color.set(color);
    });
  };

  const updateLegende = (mode) => {
    const el = document.getElementById('visu-legende');
    if (!el) return;
    if (mode==='thermique') {
      el.innerHTML = `
        <div class="legende-item"><span class="legende-dot" style="background:#3b82f6"></span><span>0-20°C — Froid</span></div>
        <div class="legende-item"><span class="legende-dot" style="background:#10b981"></span><span>20-40°C — Ambiant</span></div>
        <div class="legende-item"><span class="legende-dot" style="background:#f59e0b"></span><span>40-80°C — Chaud</span></div>
        <div class="legende-item"><span class="legende-dot" style="background:#ef4444"></span><span>80°C+ — Critique</span></div>`;
    } else if (mode==='economique') {
      el.innerHTML = `
        <div class="legende-item"><span class="legende-dot" style="background:#10b981"></span><span>&lt; 1500 DZD/h</span></div>
        <div class="legende-item"><span class="legende-dot" style="background:#f59e0b"></span><span>1500-3000 DZD/h</span></div>
        <div class="legende-item"><span class="legende-dot" style="background:#ef4444"></span><span>&gt; 3000 DZD/h</span></div>`;
    } else {
      el.innerHTML = `
        <div class="legende-item"><span class="legende-dot" style="background:#00FFD1"></span><span>Normal</span></div>
        <div class="legende-item"><span class="legende-dot" style="background:#f59e0b"></span><span>Alerte</span></div>
        <div class="legende-item"><span class="legende-dot" style="background:#ef4444"></span><span>Critique</span></div>
        <div class="legende-item"><span class="legende-dot" style="background:#8b5cf6"></span><span>Maintenance</span></div>
        <div class="legende-item"><span class="legende-dot ann-dot-leg"></span><span>📍 Annotation cliquable</span></div>`;
    }
  };

  // ── Niveaux de vue ────────────────────────────────────────────────────────
  const setLevel = (level, btn) => {
    currentLevel = level; autoRotate = false;
    document.querySelectorAll('.visu-level-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    if (level==='usine') { camera.position.set(0,20,20); camera.lookAt(0,0,0); }
    else if (level==='ligne') { camera.position.set(0,8,12); camera.lookAt(0,1,-2); }
    else if (level==='machine' && selectedMachine) {
      const p=selectedMachine.pos; camera.position.set(p[0]+3,p[1]+3,p[2]+3); camera.lookAt(...p);
    }
  };

  // ── Contrôles orbitaux ────────────────────────────────────────────────────
  let isDown=false, px=0, py=0, sph={theta:0, phi:0.8, r:18};

  const setupOrbitControls = (canvas) => {
    canvas.addEventListener('mousedown', e => { isDown=true; px=e.clientX; py=e.clientY; autoRotate=false; mouse.set(-999,-999); });
    canvas.addEventListener('mouseup',    () => { isDown=false; });
    canvas.addEventListener('mouseleave', () => { isDown=false; });
    canvas.addEventListener('wheel', e => {
      sph.r = Math.max(4, Math.min(45, sph.r + e.deltaY*0.02));
      autoRotate=false; updateCam(); e.preventDefault();
    }, { passive:false });
    canvas.addEventListener('mousemove', e => {
      if (!isDown) return;
      sph.theta -= (e.clientX-px)*0.005;
      sph.phi = Math.max(0.1, Math.min(Math.PI/2-0.05, sph.phi+(e.clientY-py)*0.005));
      px=e.clientX; py=e.clientY; updateCam();
    });
  };

  const updateCam = () => {
    camera.position.set(
      sph.r*Math.sin(sph.phi)*Math.sin(sph.theta),
      sph.r*Math.cos(sph.phi),
      sph.r*Math.sin(sph.phi)*Math.cos(sph.theta)
    );
    camera.lookAt(0,1,0);
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const updateKPIs = () => {
    const avgTRS = Math.round(MACHINES_CONFIG.reduce((s,m)=>s+m.trs,0)/MACHINES_CONFIG.length);
    const maxTemp = Math.max(...MACHINES_CONFIG.map(m=>m.temp));
    const avgHSI = Math.round(MACHINES_CONFIG.reduce((s,m)=>s+m.hsi,0)/MACHINES_CONFIG.length);
    const critiques = MACHINES_CONFIG.filter(m=>m.alerte==='critical'||m.alerte==='warning').length;
    const cout = MACHINES_CONFIG.reduce((s,m)=>s+m.cout_h,0);
    setText('vkpi-trs', avgTRS+'%');
    setText('vkpi-temp', maxTemp+'°C');
    setText('vkpi-hsi', avgHSI);
    setText('vkpi-haccp', critiques+' alerte(s)');
    setText('vkpi-energie', cout.toLocaleString('fr-DZ')+' DZD');
    const hsiEl=document.getElementById('vkpi-hsi');
    if(hsiEl) hsiEl.className=`visu-kpi-val ${avgHSI>=75?'green':avgHSI>=55?'yellow':'red'}`;
    const hEl=document.getElementById('vkpi-haccp');
    if(hEl) hEl.className=`visu-kpi-val ${critiques>0?'red':'green'}`;
  };

  // ── Actions caméra ────────────────────────────────────────────────────────
  const resetCamera = () => {
    sph={theta:0,phi:0.8,r:18}; autoRotate=true; selectedMachine=null;
    const p=document.getElementById('visu-machine-info'); if(p) p.style.display='none';
    const a=document.getElementById('visu-ann-list'); if(a) a.style.display='none';
  };

  const toggleRotation = () => {
    autoRotate=!autoRotate;
    const btn=document.getElementById('btn-rotation');
    if(btn) btn.textContent=autoRotate?'⏸ Arrêter rotation':'▶ Reprendre rotation';
  };

  const vueDessusDessus = () => {
    autoRotate=false; camera.position.set(0,30,0.1); camera.lookAt(0,0,0);
  };

  const allerModule = () => {
    if (!selectedMachine) return;
    const map={transformation:'haccp',conditionnement:'intelligence',utilites:'energie'};
    const page=map[selectedMachine.type]||'dashboard';
    if (typeof navigate==='function') navigate(page);
  };

  const setText = (id,val) => { const el=document.getElementById(id); if(el) el.textContent=val; };

  // Focus sur une annotation spécifique (appelé depuis le HTML)
  const _focusAnnotation = (cfgId, annId) => {
    const cfg = MACHINES_CONFIG.find(m=>m.id===cfgId);
    if (!cfg) return;
    const pos = cfg.pos;
    autoRotate=false;
    camera.position.set(pos[0]+2, pos[1]+3, pos[2]+2);
    camera.lookAt(...pos);
  };

  return { init, setMode, setLevel, resetCamera, toggleRotation, vueDessusDessus, allerModule, _focusAnnotation, getMachinesConfig: () => MACHINES_CONFIG, getMachines3d: () => machines3d, getColorForStatus, getProduits3d: () => PRODUITS_CONFIG };
})();

function updateMachineColors3D(statusMap) {
  // statusMap = { "MAC-LAIT-001": "en_marche", "MAC-LAIT-002": "arret", ... }
  
  scene.traverse((obj) => {
    if (obj.isMesh && obj.userData.machineCode) {
      const statut = statusMap[obj.userData.machineCode];
      if (statut) {
        const color = getMachineColor3D(statut);  // défini dans machine_app.js
        obj.material.color.setHex(color);
      }
    }
  });
}
// ============================================================
//  LIAISON TWIN MACHINE ↔ VISUALISATION 3D
//  Remplacez la fonction updateMachineColors3D existante
//  par tout ce bloc à la fin de visualisation3d_app.js
// ============================================================

// Correspondance code_machine backend → id dans MACHINES_CONFIG
const MACHINE_CODE_TO_3D_ID = {
  'MAC-LAIT-001': 2,
  'MAC-LAIT-002': 3,
  'MAC-LAIT-003': 5,
  'MAC-LAIT-004': 7,
  'MAC-LAIT-005': 1,
  'MAC-LAIT-006': 4,
  'MAC-LAIT-007': 6,
  'MAC-LAIT-008': 8,
  'MAC-LAIT-009': 9,
  'MAC-LAIT-010': 10,
};

const STATUT_TO_ALERTE = {
  'en_marche':   'normal',
  'arret':       'warning',
  'maintenance': 'maintenance',
  'panne':       'critical'
};

// ── Mise à jour complète des données machines en 3D ──────────────────────
function updateMachinesData3D(machinesBackend) {
  if (!machinesBackend || machinesBackend.length === 0) return;
  
  const MACHINES_CONFIG = visu3d.getMachinesConfig();
  const machines3d = visu3d.getMachines3d();
  
  machinesBackend.forEach(m => {
    const id3D = MACHINE_CODE_TO_3D_ID[m.code_machine];
    if (!id3D) return;
    const cfg = MACHINES_CONFIG.find(c => c.id === id3D);
    if (!cfg) return;

    cfg.trs      = m.taux_disponibilite ?? cfg.trs;
    cfg.temp     = m.temperature        ?? cfg.temp;
    cfg.hsi      = m.hsi                ?? cfg.hsi;
    cfg.alerte   = STATUT_TO_ALERTE[m.statut] ?? 'normal';

    const machine3d = machines3d.find(x => x.cfg.id === id3D);
    if (machine3d) {
      const color = new THREE.Color(visu3d.getColorForStatus(cfg.alerte));
      if (machine3d.mat) {
        machine3d.mat.color.set(color);
        machine3d.mat.emissive.set(color);
      }
    }
  });
}

// ── Mise à jour des produits en 3D ───────────────────────────────────────
function updateProduitsData3D(produitsBackend) {
  if (!produitsBackend || produitsBackend.length === 0) return;

  produitsBackend.forEach((produit, index) => {
    const cfg = PRODUITS_CONFIG[index];
    if (!cfg) return;

    cfg.nom_reel = produit.nom ?? cfg.nom;

    if (cfg.annotations && cfg.annotations.length > 0) {
      cfg.annotations[0].data = {
        produit:      produit.nom          ?? '--',
        temperature:  produit.temperature  != null ? produit.temperature + '°C' : '--',
        ph:           produit.ph           != null ? produit.ph : '--',
        statut:       '✅ Données réelles'
      };
      if (cfg.annotations[1]) {
        cfg.annotations[1].data = {
          rendement:   produit.rendement_theorique != null ? produit.rendement_theorique + '%' : '--',
          dlc:         produit.dlc_theorique       != null ? produit.dlc_theorique + ' jours'  : '--',
          temp_stockage: produit.temperature_stockage != null ? produit.temperature_stockage + '°C' : '--',
          statut:      '✅ Données réelles'
        };
      }
    }
  });
}

// ── Mise à jour KPIs 3D avec vraies données ───────────────────────────────
function updateKPIsFromRealData(machines) {
  const hsiVals  = machines.map(m => m.hsi).filter(v => v != null);
  const tempVals = machines.map(m => m.temperature).filter(v => v != null);
  const alertes  = machines.reduce((acc, m) => acc + (m.alertes ? m.alertes.length : 0), 0);
  const avg      = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) : 0;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setText('vkpi-hsi',   avg(hsiVals));
  setText('vkpi-temp',  tempVals.length ? Math.max(...tempVals) + '°C' : '--');
  setText('vkpi-haccp', alertes + ' alerte(s)');

  const hsiEl = document.getElementById('vkpi-hsi');
  if (hsiEl) {
    const hsi = avg(hsiVals);
    hsiEl.className = `visu-kpi-val ${hsi>=75?'green':hsi>=55?'yellow':'red'}`;
  }
}

// ── Helpers labels ────────────────────────────────────────────────────────
function getStatutLabel3D(statut) {
  const map = {
    'en_marche':   '✅ En marche',
    'arret':       '⏹ Arrêt',
    'maintenance': '🔧 Maintenance',
    'panne':       '🔴 Panne'
  };
  return map[statut] ?? '--';
}

function getNiveauLabel3D(niveau) {
  const map = {
    'aucune':    '✅ Normal',
    'attention': '⚠️ Attention',
    'critique':  '🔴 Critique'
  };
  return map[niveau] ?? '--';
}

// ── Ancienne fonction gardée pour compatibilité ───────────────────────────
function updateMachineColors3D(statusMap) {
  const machines = Object.entries(statusMap).map(([code, statut]) => ({
    code_machine: code, statut
  }));
  updateMachinesData3D(machines);
}
// getMachineColor3D() est défini dans machine_app.js — retourne hex color
function updateProduitsData3D(lotsData) {
  if (!lotsData || lotsData.length === 0) return;

  const dernierLot = lotsData[0];
  const PRODUITS_CONFIG = visu3d.getProduits3d();
  const alertes = dernierLot.alertes || [];

  PRODUITS_CONFIG.forEach(produit => {
    if (!produit.annotations) return;

    const statut = dernierLot.niveau_alerte === 'critique' ? '🔴 NON CONFORME — Risque sanitaire'
                 : dernierLot.niveau_alerte === 'mineure'  ? '⚠️ Attention requise'
                 : '✅ Conforme — Sûr à consommer';

    if (produit.annotations[0]) {
      produit.annotations[0].data = {
        lot:         dernierLot.numero_lot ?? '--',
        rendement:   dernierLot.rendement_reel != null ? dernierLot.rendement_reel + '%' : '--',
        temperature: alertes.find(a => a.type === 'temperature')?.valeur_mesuree != null
                     ? alertes.find(a => a.type === 'temperature').valeur_mesuree + '°C' : '--',
        statut
      };
    }

    if (produit.annotations[1]) {
      produit.annotations[1].data = {
        masse_entree:  dernierLot.masse_entree_kg != null ? dernierLot.masse_entree_kg + ' kg' : '--',
        masse_sortie:  dernierLot.masse_sortie_kg != null ? dernierLot.masse_sortie_kg + ' kg' : '--',
        perte:         dernierLot.perte_kg != null ? dernierLot.perte_kg + ' kg' : '--',
        statut:        dernierLot.est_conforme_temp ? '✅ Température conforme' : '🔴 Température hors limite'
      };
    }

    if (produit.annotations[2]) {
      produit.annotations[2].data = {
        numero_lot:   dernierLot.numero_lot ?? '--',
        alertes:      alertes.length + ' alerte(s) active(s)',
        risque:       dernierLot.niveau_alerte === 'critique' ? '⛔ NE PAS CONSOMMER' : '✅ Sûr',
        statut:       '🔴 Données temps réel'
      };
    }
  });
}