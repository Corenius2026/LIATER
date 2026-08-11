import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import liaterLogoDark from '../assets/liater-logo-dark.png';
import liaterLogo from '../assets/liater-logo.png';

export default function LiaterHeroAnimation() {
  const mountRef = useRef(null);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 480;

    // ─── 1. ESCENA, CÁMARA Y RENDERER ─────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // ─── 2. ILUMINACIÓN CINEMATOGRÁFICA DE ESTUDIO ────────────────────────────
    scene.add(new THREE.AmbientLight(0x101a30, 2.0));

    // Luz principal dorada frontal-superior (Key Light)
    const keyLight = new THREE.DirectionalLight(0xfff0cc, 3.5);
    keyLight.position.set(-3, 5, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Luz de contorno azul cian eléctrico (Rim Light)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 3.0);
    rimLight.position.set(5, -2, -4);
    scene.add(rimLight);

    // Luz de relleno cálida lateral
    const fillLight = new THREE.PointLight(0xfca311, 4.0, 10, 1.2);
    fillLight.position.set(3, 2, 4);
    scene.add(fillLight);

    // Luz trasera que da profundidad al orbe
    const backLight = new THREE.PointLight(0x6366f1, 2.5, 8, 1.5);
    backLight.position.set(-3, -3, -3);
    scene.add(backLight);

    // ─── 3. GRUPO PRINCIPAL CON ROTACIÓN 3D ───────────────────────────────────
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Medallón / Logo 3D LIATER
    const logoGroup = new THREE.Group();
    rootGroup.add(logoGroup);

    // ─── 4. MODELADO DEL MEDALLÓN DE ORO LIATER EN 3D ─────────────────────────
    // Material de oro cepillado de alta gama (PBR)
    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xfca311,
      emissive: 0x553000,
      emissiveIntensity: 0.25,
      metalness: 0.95,
      roughness: 0.16,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      reflectivity: 1.0,
    });

    const darkMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0x14213d,
      metalness: 0.9,
      roughness: 0.25,
    });

    const whiteGlowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.1,
    });

    // 4.1 Disco/Cilindro principal del logo con bisel
    const discRadius = 1.6;
    const discDepth = 0.28;
    const cylinderGeo = new THREE.CylinderGeometry(discRadius, discRadius, discDepth, 64);
    const goldDisc = new THREE.Mesh(cylinderGeo, goldMaterial);
    goldDisc.rotation.x = Math.PI / 2;
    goldDisc.castShadow = true;
    goldDisc.receiveShadow = true;
    logoGroup.add(goldDisc);

    // 4.2 Bisel / Aro perimetral exterior con brillo cromado
    const outerRingGeo = new THREE.TorusGeometry(discRadius + 0.04, 0.05, 24, 64);
    const outerRing = new THREE.Mesh(outerRingGeo, goldMaterial);
    logoGroup.add(outerRing);

    // 4.3 Aro interior acanalado
    const innerRingGeo = new THREE.TorusGeometry(discRadius * 0.92, 0.025, 16, 64);
    const innerRing = new THREE.Mesh(innerRingGeo, darkMetalMaterial);
    logoGroup.add(innerRing);

    // ─── 5. ONDA DE ALTA TENSIÓN EN VERDADERO 3D (Extruida sobre la cara) ────
    // La onda del logo de LIATER: Pico izquierdo ascendente negro -> V profunda -> Caída/subida blanca
    const wavePoints = [
      new THREE.Vector3(-0.85, -0.42, 0.16),
      new THREE.Vector3(-0.62, 0.35, 0.16),
      new THREE.Vector3(-0.35, 0.92, 0.17), // Pico superior
      new THREE.Vector3(0.08, -0.28, 0.16),
      new THREE.Vector3(0.35, -0.82, 0.17), // Valle inferior
      new THREE.Vector3(0.58, -0.15, 0.16),
      new THREE.Vector3(0.85, 0.48, 0.16),  // Punta superior derecha
    ];

    const waveCurve = new THREE.CatmullRomCurve3(wavePoints);
    const waveTubeGeo = new THREE.TubeGeometry(waveCurve, 64, 0.075, 16, false);

    // Mitad izquierda oscura (Alta tensión / Impulso)
    const waveLeftMesh = new THREE.Mesh(waveTubeGeo, darkMetalMaterial);
    waveLeftMesh.castShadow = true;
    logoGroup.add(waveLeftMesh);

    // Núcleo blanco brillante en la cresta/valle del logo
    const waveCorePoints = [
      new THREE.Vector3(0.0, -0.15, 0.17),
      new THREE.Vector3(0.35, -0.82, 0.18),
      new THREE.Vector3(0.65, 0.05, 0.18),
      new THREE.Vector3(0.88, 0.52, 0.18),
    ];
    const waveCoreCurve = new THREE.CatmullRomCurve3(waveCorePoints);
    const waveCoreTubeGeo = new THREE.TubeGeometry(waveCoreCurve, 32, 0.045, 12, false);
    const waveCoreMesh = new THREE.Mesh(waveCoreTubeGeo, whiteGlowMaterial);
    logoGroup.add(waveCoreMesh);

    // Replicar en la cara trasera del disco para que se vea por ambos lados
    const waveBackPoints = wavePoints.map(p => new THREE.Vector3(p.x, p.y, -p.z));
    const waveBackCurve = new THREE.CatmullRomCurve3(waveBackPoints);
    const waveBackTubeGeo = new THREE.TubeGeometry(waveBackCurve, 64, 0.075, 16, false);
    const waveBackMesh = new THREE.Mesh(waveBackTubeGeo, darkMetalMaterial);
    logoGroup.add(waveBackMesh);

    // ─── 6. TEXTURA VECTORIAL HD DEL EMBLEMA (En relieve) ────────────────────
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(liaterLogo, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const decalGeo = new THREE.CircleGeometry(discRadius * 0.88, 64);
      const decalMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
      });

      const frontDecal = new THREE.Mesh(decalGeo, decalMat);
      frontDecal.position.z = discDepth / 2 + 0.005;
      logoGroup.add(frontDecal);

      const backDecal = new THREE.Mesh(decalGeo, decalMat);
      backDecal.position.z = -discDepth / 2 - 0.005;
      backDecal.rotation.y = Math.PI;
      logoGroup.add(backDecal);
    });

    // ─── 7. ANILLOS ORBITALES DE ENERGÍA Y FLOTACIÓN ─────────────────────────
    // Anillo exterior magnético (Cian)
    const orbitRing1Geo = new THREE.TorusGeometry(2.35, 0.022, 16, 80);
    const orbitRing1Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 });
    const orbitRing1 = new THREE.Mesh(orbitRing1Geo, orbitRing1Mat);
    rootGroup.add(orbitRing1);

    // Anillo interior magnético (Dorado)
    const orbitRing2Geo = new THREE.TorusGeometry(2.0, 0.018, 16, 80);
    const orbitRing2Mat = new THREE.MeshBasicMaterial({ color: 0xfca311, transparent: true, opacity: 0.65 });
    const orbitRing2 = new THREE.Mesh(orbitRing2Geo, orbitRing2Mat);
    orbitRing2.rotation.x = Math.PI / 3;
    rootGroup.add(orbitRing2);

    // Satélites de energía que orbitan alrededor del logo
    const spark1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    const spark2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    rootGroup.add(spark1);
    rootGroup.add(spark2);

    // ─── 8. CAMPO DE MICRO-PARTÍCULAS DE ENERGÍA ─────────────────────────────
    const particleCount = 140;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const r = 1.8 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      particlePositions[i * 3 + 2] = r * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xfca311,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particleSystem);

    // ─── 9. INTERACCIÓN CON EL CURSOR (Rotación e Inclinación fluida) ──────────
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseParallax = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      setIsInteracting(true);
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      mouseParallax.x = nx * 0.45;
      mouseParallax.y = -ny * 0.35;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        targetRotationY += deltaX * 0.015;
        targetRotationX += deltaY * 0.015;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      setIsInteracting(false);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ─── 10. LOOP DE ANIMACIÓN CINÉTICA A 60 FPS ──────────────────────────────
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Rotación continua lenta del logo (si el usuario no está arrastrando)
      if (!isDragging) {
        targetRotationY += 0.008;
      }

      // Suavizado cinético (Lerp)
      logoGroup.rotation.y += (targetRotationY - logoGroup.rotation.y) * 0.08;
      logoGroup.rotation.x += (targetRotationX - logoGroup.rotation.x) * 0.08;

      // Inclinación general por posición del mouse
      rootGroup.rotation.y = mouseParallax.x;
      rootGroup.rotation.x = mouseParallax.y;

      // Flotación senoidal suave
      logoGroup.position.y = Math.sin(elapsed * 1.8) * 0.12;

      // Rotación de los anillos orbitales
      orbitRing1.rotation.z = elapsed * 0.6;
      orbitRing1.rotation.y = elapsed * 0.3;

      orbitRing2.rotation.z = -elapsed * 0.7;
      orbitRing2.rotation.x = Math.PI / 3 + Math.sin(elapsed * 0.8) * 0.2;

      // Trayectoria de los satélites de energía
      const a1 = elapsed * 1.5;
      spark1.position.set(Math.cos(a1) * 2.35, Math.sin(a1) * 2.35, Math.sin(a1 * 2) * 0.4);

      const a2 = -elapsed * 1.8;
      spark2.position.set(Math.cos(a2) * 2.0, Math.sin(a2) * 1.4, Math.cos(a2) * 1.2);

      // Rotación suave de las partículas
      particleSystem.rotation.y = elapsed * 0.05;
      particleSystem.rotation.x = Math.sin(elapsed * 0.3) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // ─── LIMPIEZA ─────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
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
        cursor: isInteracting ? 'grabbing' : 'grab',
        borderRadius: '28px',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 40%, rgba(252, 163, 17, 0.12) 0%, rgba(20, 33, 61, 0.5) 45%, rgba(10, 17, 34, 0.85) 100%)',
        border: '1px solid rgba(252, 163, 17, 0.25)',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(16px)',
        userSelect: 'none',
      }}
    >
      {/* Indicador interactivo para invitar al usuario a arrastrar/girar */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '20px',
          background: 'rgba(10, 17, 34, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(8px)',
          color: '#FFFFFF',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.04em',
          pointerEvents: 'none',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FCA311', boxShadow: '0 0 10px #FCA311' }} />
        <span>Arrastra para rotar en 3D</span>
      </div>
    </div>
  );
}
