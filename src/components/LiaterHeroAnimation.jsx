import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function LiaterHeroAnimation() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 480;

    // ─── 1. ESCENA, CÁMARA Y RENDERER ─────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 8.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // ─── 2. SISTEMA DE ILUMINACIÓN DE ESTUDIO CINEMATOGRÁFICO ─────────────────
    const ambientLight = new THREE.AmbientLight(0x0a1931, 1.6);
    scene.add(ambientLight);

    // Luz principal solar (cálida dorada)
    const sunLight = new THREE.DirectionalLight(0xfff3d6, 3.2);
    sunLight.position.set(-4, 7, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 25;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);

    // Luz de contorno azul cian (Rim Light para bordes futuristas)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    rimLight.position.set(5, 4, -4);
    scene.add(rimLight);

    // Luz de relleno púrpura/azul profundo
    const fillLight = new THREE.DirectionalLight(0x6366f1, 1.0);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);

    // Luz de punto central dentro del reactor LIATER
    const corePointLight = new THREE.PointLight(0xfca311, 4.5, 6.0, 1.2);
    corePointLight.position.set(0, 0.2, 0.4);
    scene.add(corePointLight);

    // ─── 3. MATERIALES PBR HIPERREALISTAS ─────────────────────────────────────
    // Acero galvanizado para torre
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xd8c28a,
      metalness: 0.92,
      roughness: 0.24,
    });

    const steelDarkMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.35,
    });

    // Vidrio de aisladores de alta tensión
    const insulatorGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      metalness: 0.1,
      roughness: 0.15,
      transparent: true,
      opacity: 0.85,
      transmission: 0.6,
      ior: 1.5,
    });

    // Superficie fotovoltaica de silicio monocristalino
    const solarWaferMat = new THREE.MeshPhysicalMaterial({
      color: 0x0c2340,
      emissive: 0x07162c,
      emissiveIntensity: 0.3,
      metalness: 0.25,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      reflectivity: 0.9,
    });

    const aluminumFrameMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
    });

    // Núcleo de energía LIATER (Oro eléctrico)
    const goldEnergyMat = new THREE.MeshStandardMaterial({
      color: 0xffe066,
      emissive: 0xfca311,
      emissiveIntensity: 1.6,
      metalness: 0.8,
      roughness: 0.15,
    });

    const cyanEnergyMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x0284c7,
      emissiveIntensity: 1.8,
      metalness: 0.6,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    });

    // ─── 4. BASE / PEDESTAL TECNOLÓGICO ──────────────────────────────────────
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Plataforma base circular
    const baseGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.18, 64);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x0b1329,
      metalness: 0.7,
      roughness: 0.4,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -2.1;
    baseMesh.receiveShadow = true;
    rootGroup.add(baseMesh);

    // Borde brillante de la base
    const baseRingGeo = new THREE.TorusGeometry(3.7, 0.03, 16, 64);
    const baseRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -2.0;
    rootGroup.add(baseRing);

    // Anillo exterior dorado concéntrico
    const goldRingGeo = new THREE.RingGeometry(2.4, 2.45, 64);
    const goldRingMat = new THREE.MeshBasicMaterial({ color: 0xfca311, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const goldRing = new THREE.Mesh(goldRingGeo, goldRingMat);
    goldRing.rotation.x = Math.PI / 2;
    goldRing.position.y = -2.005;
    rootGroup.add(goldRing);

    // ─── 5. TORRE DE ALTA TENSIÓN (Módulo Izquierdo) ──────────────────────────
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-2.2, -2.0, 0);
    rootGroup.add(towerGroup);

    // Función auxiliar para construir barras de celosía
    function createBar(p1, p2, radius, mat) {
      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);
      const dir = new THREE.Vector3().subVectors(v2, v1);
      const len = dir.length();
      const geom = new THREE.CylinderGeometry(radius, radius, len, 8);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.addVectors(v1, v2).multiplyScalar(0.5);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      towerGroup.add(mesh);
    }

    // 4 Columnas principales piramidales
    const hTower = 3.6;
    const baseW = 0.55;
    const topW = 0.18;
    const corners = [
      [[-baseW, 0, -baseW], [-topW, hTower, -topW]],
      [[baseW, 0, -baseW], [topW, hTower, -topW]],
      [[baseW, 0, baseW], [topW, hTower, topW]],
      [[-baseW, 0, baseW], [-topW, hTower, topW]],
    ];
    corners.forEach(([p1, p2]) => createBar(p1, p2, 0.032, steelMat));

    // Travesaños y cruces de celosía a varios niveles
    const levels = [0.4, 1.0, 1.7, 2.4, 3.1];
    for (let i = 0; i < levels.length; i++) {
      const y = levels[i];
      const factor = 1 - (y / hTower) * (1 - topW / baseW);
      const w = baseW * factor;
      // Perímetro
      createBar([-w, y, -w], [w, y, -w], 0.02, steelMat);
      createBar([w, y, -w], [w, y, w], 0.02, steelMat);
      createBar([w, y, w], [-w, y, w], 0.02, steelMat);
      createBar([-w, y, w], [-w, y, -w], 0.02, steelMat);

      // Diagonales X entre niveles
      if (i > 0) {
        const yPrev = levels[i - 1];
        const fPrev = 1 - (yPrev / hTower) * (1 - topW / baseW);
        const wPrev = baseW * fPrev;
        createBar([-wPrev, yPrev, wPrev], [w, y, w], 0.015, steelMat);
        createBar([wPrev, yPrev, wPrev], [-w, y, w], 0.015, steelMat);
      }
    }

    // Crucetas / Brazos de alta tensión (Crossarms)
    const crossarmY1 = 2.6;
    createBar([-0.8, crossarmY1, 0], [0.8, crossarmY1, 0], 0.035, steelMat);
    const crossarmY2 = 3.2;
    createBar([-0.55, crossarmY2, 0], [0.55, crossarmY2, 0], 0.03, steelMat);

    // Cadenas de aisladores de vidrio suspendidos
    const insulatorPositions = [
      [-0.75, crossarmY1, 0],
      [0.75, crossarmY1, 0],
      [-0.5, crossarmY2, 0],
      [0.5, crossarmY2, 0],
    ];
    insulatorPositions.forEach(([ix, iy, iz]) => {
      for (let d = 0; d < 3; d++) {
        const discGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.025, 12);
        const disc = new THREE.Mesh(discGeo, insulatorGlassMat);
        disc.position.set(ix, iy - 0.06 - d * 0.05, iz);
        towerGroup.add(disc);
      }
      // Chispa en la punta del aislador
      const sparkGeo = new THREE.SphereGeometry(0.035, 8, 8);
      const spark = new THREE.Mesh(sparkGeo, cyanEnergyMat);
      spark.position.set(ix, iy - 0.22, iz);
      towerGroup.add(spark);
    });

    // ─── 6. PANEL SOLAR FOTOVOLTAICO (Módulo Derecho) ─────────────────────────
    const solarGroup = new THREE.Group();
    solarGroup.position.set(2.2, -2.0, 0);
    rootGroup.add(solarGroup);

    // Mástil de soporte de acero
    const mastGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.8, 16);
    const mast = new THREE.Mesh(mastGeo, steelDarkMat);
    mast.position.y = 0.9;
    mast.castShadow = true;
    solarGroup.add(mast);

    // Cabezal giratorio / Articulación
    const jointGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const joint = new THREE.Mesh(jointGeo, steelMat);
    joint.position.y = 1.8;
    solarGroup.add(joint);

    // Marco y mesa del panel inclinado
    const panelAssembly = new THREE.Group();
    panelAssembly.position.set(0, 1.8, 0);
    panelAssembly.rotation.x = -Math.PI / 4.5; // Inclinación solar ~40°
    panelAssembly.rotation.y = -Math.PI / 8;
    solarGroup.add(panelAssembly);

    // Placa fotovoltaica principal
    const pW = 1.9;
    const pH = 1.3;
    const panelCoreGeo = new THREE.BoxGeometry(pW, pH, 0.04);
    const panelCore = new THREE.Mesh(panelCoreGeo, solarWaferMat);
    panelCore.castShadow = true;
    panelAssembly.add(panelCore);

    // Marco perimetral de aluminio
    const frameThickness = 0.03;
    const fTopGeo = new THREE.BoxGeometry(pW + 0.04, frameThickness, 0.05);
    const fTop = new THREE.Mesh(fTopGeo, aluminumFrameMat);
    fTop.position.y = pH / 2;
    panelAssembly.add(fTop);
    const fBot = fTop.clone();
    fBot.position.y = -pH / 2;
    panelAssembly.add(fBot);

    const fSideGeo = new THREE.BoxGeometry(frameThickness, pH, 0.05);
    const fLeft = new THREE.Mesh(fSideGeo, aluminumFrameMat);
    fLeft.position.x = -pW / 2;
    panelAssembly.add(fLeft);
    const fRight = fLeft.clone();
    fRight.position.x = pW / 2;
    panelAssembly.add(fRight);

    // Rejilla de celdas solares (Busbars plateados)
    const gridLinesMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 });
    for (let c = 1; c < 4; c++) {
      const gx = -pW / 2 + (pW / 4) * c;
      const gLine = new THREE.Mesh(new THREE.BoxGeometry(0.008, pH, 0.045), gridLinesMat);
      gLine.position.set(gx, 0, 0.005);
      panelAssembly.add(gLine);
    }
    for (let r = 1; r < 3; r++) {
      const gy = -pH / 2 + (pH / 3) * r;
      const gLine = new THREE.Mesh(new THREE.BoxGeometry(pW, 0.008, 0.045), gridLinesMat);
      gLine.position.set(0, gy, 0.005);
      panelAssembly.add(gLine);
    }

    // ─── 7. REACTOR CENTRAL DE ENERGÍA LIATER ─────────────────────────────────
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0.1, 0.2);
    rootGroup.add(coreGroup);

    // Orbe de plasma central (Dodecaedro dorado facetado hiperrealista)
    const orbGeo = new THREE.DodecahedronGeometry(0.55, 1);
    const orbMesh = new THREE.Mesh(orbGeo, goldEnergyMat);
    orbMesh.castShadow = true;
    coreGroup.add(orbMesh);

    // Rayo 3D dentro del núcleo
    const boltShape = new THREE.Shape();
    boltShape.moveTo(0.15, 0.65);
    boltShape.lineTo(-0.12, 0.1);
    boltShape.lineTo(0.04, 0.1);
    boltShape.lineTo(-0.15, -0.65);
    boltShape.lineTo(0.12, -0.05);
    boltShape.lineTo(-0.04, -0.05);
    boltShape.closePath();
    const bolt3DGeo = new THREE.ExtrudeGeometry(boltShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    bolt3DGeo.center();
    const boltMesh = new THREE.Mesh(bolt3DGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    boltMesh.position.z = 0.62;
    boltMesh.scale.set(0.65, 0.65, 0.65);
    coreGroup.add(boltMesh);

    // Anillo magnético de contención 1 (Gimbal exterior cian)
    const ring1Geo = new THREE.TorusGeometry(0.95, 0.035, 16, 64);
    const ring1 = new THREE.Mesh(ring1Geo, cyanEnergyMat);
    coreGroup.add(ring1);

    // Anillo magnético de contención 2 (Gimbal interior dorado)
    const ring2Geo = new THREE.TorusGeometry(0.75, 0.025, 16, 64);
    const ring2 = new THREE.Mesh(ring2Geo, goldEnergyMat);
    coreGroup.add(ring2);

    // ─── 8. ARCOS DE DESCARGA ELÉCTRICA (Curvas Catmull-Rom) ─────────────────
    function createElectricArc(startVec, endVec, colorHex) {
      const points = [];
      const count = 12;
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const p = new THREE.Vector3().lerpVectors(startVec, endVec, t);
        if (i > 0 && i < count) {
          p.x += (Math.random() - 0.5) * 0.25;
          p.y += (Math.random() - 0.5) * 0.25 + 0.15;
          p.z += (Math.random() - 0.5) * 0.15;
        }
        points.push(p);
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.02, 6, false);
      const tubeMat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      rootGroup.add(tube);
      return tube;
    }

    let arcLeft = null;
    let arcRight = null;

    const towerOutput = new THREE.Vector3(-1.4, 0.8, 0);
    const coreInputLeft = new THREE.Vector3(-0.7, 0.1, 0.2);
    const coreInputRight = new THREE.Vector3(0.7, 0.1, 0.2);
    const solarInput = new THREE.Vector3(1.4, 0.2, 0);

    function updateArcs() {
      if (arcLeft) rootGroup.remove(arcLeft);
      if (arcRight) rootGroup.remove(arcRight);
      arcLeft = createElectricArc(towerOutput, coreInputLeft, 0xfca311);
      arcRight = createElectricArc(coreInputRight, solarInput, 0x38bdf8);
    }
    updateArcs();

    // ─── 9. NUBE DE PARTÍCULAS DE ENERGÍA FLOTANTES ───────────────────────────
    const particleCount = 180;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleScales = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 7.0;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 4.0;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
      particleScales[i] = Math.random() * 0.04 + 0.02;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xfca311,
      size: 0.08,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particles);

    // ─── 10. INTERACTIVIDAD CON EL CURSOR Y ANIMACIÓN FLUIDA ──────────────────
    let targetRotY = 0;
    let targetRotX = 0;
    let currentRotY = 0;
    let currentRotX = 0;

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      targetRotY = nx * 0.35;
      targetRotX = -ny * 0.22;
    };

    const onMouseLeave = () => {
      targetRotY = 0;
      targetRotX = 0;
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ─── 11. BUCLE DE RENDERIZADO A 60 FPS ────────────────────────────────────
    let animationFrameId;
    let clock = new THREE.Clock();
    let arcTimer = 0;

    const renderLoop = () => {
      animationFrameId = requestAnimationFrame(renderLoop);
      const elapsedTime = clock.getElapsedTime();

      // Suavizado cinético (Lerp) de la rotación hacia el cursor
      currentRotY += (targetRotY - currentRotY) * 0.06;
      currentRotX += (targetRotX - currentRotX) * 0.06;

      rootGroup.rotation.y = currentRotY + Math.sin(elapsedTime * 0.5) * 0.05;
      rootGroup.rotation.x = currentRotX + Math.cos(elapsedTime * 0.4) * 0.03;

      // Animación del reactor central
      orbMesh.rotation.y = elapsedTime * 0.8;
      orbMesh.rotation.x = elapsedTime * 0.4;
      const pulseScale = 1 + Math.sin(elapsedTime * 3.5) * 0.06;
      orbMesh.scale.set(pulseScale, pulseScale, pulseScale);
      corePointLight.intensity = 4.0 + Math.sin(elapsedTime * 4.0) * 1.5;

      // Rotación diferencial de los gimbals
      ring1.rotation.x = elapsedTime * 0.9;
      ring1.rotation.y = elapsedTime * 0.6;
      ring2.rotation.y = -elapsedTime * 1.1;
      ring2.rotation.z = elapsedTime * 0.7;

      // Levitación suave de la torre y el panel solar
      towerGroup.position.y = -2.0 + Math.sin(elapsedTime * 0.8) * 0.06;
      solarGroup.position.y = -2.0 + Math.cos(elapsedTime * 0.7) * 0.06;

      // Seguimiento solar del panel
      panelAssembly.rotation.y = -Math.PI / 8 + Math.sin(elapsedTime * 0.3) * 0.1;

      // Regeneración periódica de arcos eléctricos
      arcTimer += 1;
      if (arcTimer > 8) {
        updateArcs();
        arcTimer = 0;
      }

      // Animación de partículas de energía ascendentes
      const posArr = particles.geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3 + 1] += 0.008;
        if (posArr[i * 3 + 1] > 2.5) {
          posArr[i * 3 + 1] = -2.0;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    renderLoop();

    // ─── LIMPIEZA ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        height: '480px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'radial-gradient(circle at center, rgba(20, 33, 61, 0.45) 0%, rgba(10, 17, 34, 0.85) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Insignia interactiva flotante inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          display: 'flex',
          gap: '8px',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#FFFFFF',
            background: 'rgba(20, 33, 61, 0.8)',
            border: '1px solid rgba(252, 163, 17, 0.5)',
            borderRadius: '20px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          ⚡ Alta Tensión
        </span>
        <span
          style={{
            padding: '4px 12px',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#FCA311',
            background: 'rgba(20, 33, 61, 0.9)',
            border: '1px solid #FCA311',
            borderRadius: '20px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(252, 163, 17, 0.25)',
          }}
        >
          LIATER 3D
        </span>
        <span
          style={{
            padding: '4px 10px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#FFFFFF',
            background: 'rgba(20, 33, 61, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.5)',
            borderRadius: '20px',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          ☀️ Energía Solar
        </span>
      </div>
    </div>
  );
}
