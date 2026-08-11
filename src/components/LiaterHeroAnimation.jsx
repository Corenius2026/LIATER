import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// ─── Utilidades de geometría ─────────────────────────────────────────────────

/** Crea una barra cilíndrica de estructura metálica */
function metalBar(scene, x1, y1, z1, x2, y2, z2, radius = 0.04, mat) {
  const dir = new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1);
  const len = dir.length();
  const cyl = new THREE.CylinderGeometry(radius, radius, len, 8, 1);
  const mesh = new THREE.Mesh(cyl, mat);
  const mid = new THREE.Vector3((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  scene.add(mesh);
  return mesh;
}

export default function LiaterHeroAnimation() {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const W = el.clientWidth  || 540;
    const H = el.clientHeight || 480;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    el.appendChild(renderer.domElement);

    // ── Scene & Camera ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.set(0, 1.5, 9);
    camera.lookAt(0, 0.5, 0);

    // ── Niebla de profundidad ─────────────────────────────────────────────────
    scene.fog = new THREE.FogExp2(0x0a1628, 0.045);

    // ── Luces ────────────────────────────────────────────────────────────────
    // Ambient base
    scene.add(new THREE.AmbientLight(0x0d1b3e, 1.8));

    // Luz principal cálida (sol desde arriba-izquierda)
    const sunLight = new THREE.DirectionalLight(0xfff0d0, 3.5);
    sunLight.position.set(-4, 8, 6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far  = 40;
    sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -8;
    sunLight.shadow.camera.right = sunLight.shadow.camera.top  =  8;
    sunLight.shadow.bias         = -0.002;
    scene.add(sunLight);

    // Luz de relleno fría (cian)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    fillLight.position.set(5, 3, -4);
    scene.add(fillLight);

    // Point light dorado (rayo central)
    const boltLight = new THREE.PointLight(0xfca311, 12, 4.5);
    boltLight.position.set(0, 0.6, 0.5);
    scene.add(boltLight);

    // Point light cian (panel solar)
    const solarLight = new THREE.PointLight(0x38bdf8, 6, 4);
    solarLight.position.set(2.8, 1, 0.5);
    scene.add(solarLight);

    // ── Materiales PBR ────────────────────────────────────────────────────────
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xd4aa50,
      metalness: 0.92,
      roughness: 0.22,
      envMapIntensity: 1.4,
    });
    const insulatorMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, metalness: 0.1, roughness: 0.3,
      emissive: 0x38bdf8, emissiveIntensity: 0.8,
    });
    const solarMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.15,
      roughness: 0.08,
      envMapIntensity: 1.8,
    });
    const solarGridMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.0, roughness: 0.5,
      transparent: true, opacity: 0.25,
    });
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0xc0c8d8, metalness: 0.75, roughness: 0.35,
    });
    const supportMat = new THREE.MeshStandardMaterial({
      color: 0x4a5568, metalness: 0.8, roughness: 0.4,
    });
    const boltMat = new THREE.MeshStandardMaterial({
      color: 0xfca311,
      metalness: 0.05,
      roughness: 0.25,
      emissive: 0xfca311,
      emissiveIntensity: 1.8,
    });
    const glowRingMat = new THREE.MeshStandardMaterial({
      color: 0xfca311,
      emissive: 0xfca311,
      emissiveIntensity: 3.0,
      transparent: true, opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0d1b3e, metalness: 0.0, roughness: 0.95,
      transparent: true, opacity: 0.55,
    });

    // ── Plataforma base ───────────────────────────────────────────────────────
    const floorGeo  = new THREE.CircleGeometry(7, 64);
    const floor     = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // ── TORRE DE ALTA TENSIÓN (izquierda) ─────────────────────────────────────
    const towerGroup = new THREE.Group();
    towerGroup.position.set(-3.0, -2.2, 0);

    // Patas principales
    const legs = [[-0.6, 0, -0.6],[0.6, 0, -0.6],[-0.6, 0, 0.6],[0.6, 0, 0.6]];
    legs.forEach(([lx, , lz]) => {
      metalBar(towerGroup, lx, 0, lz,  lx * 0.45, 1.8, lz * 0.45, 0.055, steelMat);
      metalBar(towerGroup, lx * 0.45, 1.8, lz * 0.45, 0, 4.2, 0, 0.045, steelMat);
    });

    // Travesaños horizontales (4 niveles)
    [0.5, 1.2, 1.9, 2.7].forEach((yy) => {
      const w = 0.5 - yy * 0.08;
      [[-w, yy, 0],[w, yy, 0],[0, yy, -w],[0, yy, w]].forEach(([bx, by, bz]) => {
        metalBar(towerGroup, -w, by, bz, w, by, bz, 0.038, steelMat);
        metalBar(towerGroup, bx, by, -w, bx, by, w,  0.038, steelMat);
      });
    });

    // Celosías diagonales
    [[0, 0.5, 0.6, 1.2],[ 0.6, 1.2, 0.45, 1.9],[0.45, 1.9, 0, 2.7]].forEach(([y1, y2]) => {
      const w1 = 0.6 - y1 * 0.1, w2 = 0.6 - y2 * 0.1;
      metalBar(towerGroup, -w1, y1, -w1, w2, y2, w2, 0.030, steelMat);
      metalBar(towerGroup,  w1, y1, -w1,-w2, y2, w2, 0.030, steelMat);
    });

    // Brazos de transmisión
    [-0.55, 0, 0.55].forEach((az) => {
      metalBar(towerGroup, -0.7, 2.7, az, 0.7, 2.7, az, 0.040, steelMat);
      // Aisladores
      const insGeo  = new THREE.SphereGeometry(0.07, 12, 12);
      const ins     = new THREE.Mesh(insGeo, insulatorMat);
      ins.position.set(0.7, 2.7, az);
      ins.castShadow = true;
      towerGroup.add(ins);
      const ins2 = ins.clone();
      ins2.position.set(-0.7, 2.7, az);
      towerGroup.add(ins2);
    });

    // Punta
    metalBar(towerGroup, 0, 3.8, 0, 0, 4.3, 0, 0.025, steelMat);
    const topSph = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), steelMat);
    topSph.position.set(0, 4.35, 0);
    towerGroup.add(topSph);

    towerGroup.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(towerGroup);

    // ── PANEL SOLAR FOTOVOLTAICO (derecha) ───────────────────────────────────
    const solarGroup = new THREE.Group();
    solarGroup.position.set(3.0, -2.2, 0);

    // Poste de montaje
    const poleGeo  = new THREE.CylinderGeometry(0.06, 0.08, 3.2, 12);
    const pole     = new THREE.Mesh(poleGeo, supportMat);
    pole.position.set(0, 1.6, 0);
    pole.castShadow = true;
    solarGroup.add(pole);

    // Base
    const baseGeo  = new THREE.CylinderGeometry(0.35, 0.4, 0.12, 16);
    const base     = new THREE.Mesh(baseGeo, supportMat);
    base.position.set(0, 0.06, 0);
    base.castShadow = true; base.receiveShadow = true;
    solarGroup.add(base);

    // Marco del panel
    const panelGroup = new THREE.Group();
    panelGroup.position.set(0, 3.2, 0);
    panelGroup.rotation.x = -Math.PI / 5;  // inclinado 36°

    // Superficie principal del panel solar
    const panelGeo  = new THREE.BoxGeometry(2.4, 0.06, 1.6);
    const panel     = new THREE.Mesh(panelGeo, solarMat);
    panel.castShadow = true; panel.receiveShadow = true;
    panelGroup.add(panel);

    // Marco metálico
    const frameW = 2.4, frameH = 1.6, frameD = 0.07;
    [
      [0, 0, frameH/2,  frameW, 1, 1],
      [0, 0,-frameH/2,  frameW, 1, 1],
      [frameW/2, 0, 0,  1, 1, frameH],
      [-frameW/2,0, 0,  1, 1, frameH],
    ].forEach(([fx, fy, fz, fw, fh2, fd]) => {
      const fMesh = new THREE.Mesh(new THREE.BoxGeometry(fw === frameW ? fw : 0.06, frameD, fd === frameH ? fd : 0.06), frameMat);
      fMesh.position.set(fx, 0.045, fz);
      fMesh.castShadow = true;
      panelGroup.add(fMesh);
    });

    // Cuadrícula de celdas (líneas en la superficie)
    const cols = 4, rows = 3;
    for (let c = 1; c < cols; c++) {
      const x = -frameW/2 + (frameW/cols)*c;
      const gridMesh = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.07, frameH), solarGridMat);
      gridMesh.position.set(x, 0.045, 0);
      panelGroup.add(gridMesh);
    }
    for (let r = 1; r < rows; r++) {
      const z = -frameH/2 + (frameH/rows)*r;
      const gridMesh = new THREE.Mesh(new THREE.BoxGeometry(frameW, 0.07, 0.02), solarGridMat);
      gridMesh.position.set(0, 0.045, z);
      panelGroup.add(gridMesh);
    }

    // Soporte de inclinación
    const bracketGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8);
    const bracket    = new THREE.Mesh(bracketGeo, supportMat);
    bracket.position.set(0, -0.4, 0.6);
    bracket.rotation.x = Math.PI / 4;
    bracket.castShadow = true;
    panelGroup.add(bracket);

    solarGroup.add(panelGroup);
    solarGroup.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(solarGroup);

    // ── RAYO CENTRAL ─────────────────────────────────────────────────────────
    const boltGroup = new THREE.Group();
    boltGroup.position.set(0, -0.5, 0);

    // Forma del rayo con ExtrudeGeometry
    const boltShape = new THREE.Shape();
    boltShape.moveTo( 0.28,  1.6);
    boltShape.lineTo(-0.20,  0.22);
    boltShape.lineTo( 0.10,  0.22);
    boltShape.lineTo(-0.28, -1.6);
    boltShape.lineTo( 0.22, -0.10);
    boltShape.lineTo(-0.06, -0.10);
    boltShape.closePath();
    const boltGeo = new THREE.ExtrudeGeometry(boltShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 4 });
    boltGeo.center();
    const boltMesh = new THREE.Mesh(boltGeo, boltMat);
    boltMesh.castShadow = true;
    boltGroup.add(boltMesh);

    // Anillos de energía concéntricos
    [0.55, 0.85, 1.18].forEach((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.025 - i * 0.006, 12, 64),
        new THREE.MeshStandardMaterial({ color: 0xfca311, emissive: 0xfca311, emissiveIntensity: 2.5 - i * 0.6, transparent: true, opacity: 0.6 - i * 0.15 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.userData.ringSpeed = 0.4 + i * 0.25;
      ring.userData.ringPhase = i * 1.2;
      boltGroup.add(ring);
    });

    // Halo de niebla volumétrica (sprite)
    const spriteMat = new THREE.SpriteMaterial({
      color: 0xfca311, transparent: true, opacity: 0.18,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Sprite(spriteMat);
    halo.scale.set(3.5, 3.5, 1);
    boltGroup.add(halo);

    scene.add(boltGroup);

    // ── Cables de transmisión ─────────────────────────────────────────────────
    const wireMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
    [[-2.4, 1.3, 0.3],[2.4, 1.1, 0.3]].forEach(([wx, wy, wz]) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.0, -2.2 + 4.8, 0),
        new THREE.Vector3(wx * 0.4, wy + 0.5, wz),
        new THREE.Vector3(0, 0.5, 0.2),
        new THREE.Vector3(wx * 0.6, wy + 0.4, wz),
        new THREE.Vector3(Math.sign(wx) * 3.0, -2.2 + 4.5, 0),
      ]);
      const pts  = curve.getPoints(60);
      const wGeo = new THREE.BufferGeometry().setFromPoints(pts);
      scene.add(new THREE.Line(wGeo, wireMat));
    });

    // ── Mouse interaction ─────────────────────────────────────────────────────
    let targetRotY = 0, targetRotX = 0;
    let currentRotY = 0, currentRotX = 0;

    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      targetRotY =  ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) * 0.35;
      targetRotX = -((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * 0.20;
    };
    const onMouseLeave = () => { targetRotY = 0; targetRotX = 0; };
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseleave', onMouseLeave);

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Loop de animación ─────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Lerp cámara al mouse
      currentRotY += (targetRotY - currentRotY) * 0.06;
      currentRotX += (targetRotX - currentRotX) * 0.06;
      scene.rotation.y = currentRotY;
      scene.rotation.x = currentRotX;

      // Flotamiento suave de los grupos
      towerGroup.position.y = -2.2 + Math.sin(t * 0.7) * 0.08;
      solarGroup.position.y = -2.2 + Math.sin(t * 0.6 + 1.2) * 0.10;
      boltGroup.position.y  = -0.5 + Math.sin(t * 0.9) * 0.12;
      panelGroup.rotation.z = Math.sin(t * 0.4) * 0.03;

      // Pulsado del rayo central
      boltMesh.scale.setScalar(1 + Math.sin(t * 2.8) * 0.04);
      boltMat.emissiveIntensity = 1.6 + Math.sin(t * 3.0) * 0.6;
      boltLight.intensity       = 10  + Math.sin(t * 2.5) * 4;

      // Anillos orbitales
      boltGroup.children.forEach(c => {
        if (c.isTorusGeometry || (c.geometry && c.geometry.type === 'TorusGeometry')) {
          c.rotation.z = t * c.userData.ringSpeed;
        }
      });
      // Selección directa de rings
      boltGroup.children.slice(1, 4).forEach((ring, i) => {
        ring.rotation.z = t * (0.45 + i * 0.25) * (i % 2 ? -1 : 1);
        ring.material.opacity = 0.5 + Math.sin(t * 1.8 + ring.userData.ringPhase) * 0.25;
      });

      // Parpadeo de aisladores
      towerGroup.traverse(c => {
        if (c.isMesh && c.material === insulatorMat) {
          c.material.emissiveIntensity = 0.5 + Math.sin(t * 4 + c.position.z) * 0.5;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseleave', onMouseLeave);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        width: '100%',
        maxWidth: '560px',
        height: '480px',
        cursor: 'grab',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    />
  );
}
