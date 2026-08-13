import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import liaterLogoImg from '../assets/liater-logo.png';

export default function LiaterHeroAnimation() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 500;
    const height = container.clientHeight || 480;

    // ─── 1. ESCENA, CÁMARA Y RENDERER ─────────────────────────────────────────
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.8);

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

    // ─── 2. ILUMINACIÓN DE ESTUDIO CINEMATOGRÁFICO ────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));

    // Luz principal solar cálida con sombras suaves
    const keyLight = new THREE.DirectionalLight(0xfff7e8, 3.6);
    keyLight.position.set(-3.5, 5.5, 6.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Luz de contorno azul cian para reflejos de borde
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(5.0, -2.5, -3.5);
    scene.add(rimLight);

    // Luz puntual de relleno
    const fillLight = new THREE.PointLight(0xfca311, 2.0, 10, 1.2);
    fillLight.position.set(3, 2, 4);
    scene.add(fillLight);

    // ─── 3. GRUPO PRINCIPAL DEL LOGO 3D ───────────────────────────────────────
    const logoRoot = new THREE.Group();
    scene.add(logoRoot);

    // ─── 4. MATERIAL DE ORO METÁLICO DEL BORDE ────────────────────────────────
    const goldRimMat = new THREE.MeshPhysicalMaterial({
      color: 0xefa213,
      emissive: 0x4a2c00,
      emissiveIntensity: 0.18,
      metalness: 0.88,
      roughness: 0.22,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      reflectivity: 0.95,
    });

    const discRadius = 1.65;
    const discDepth = 0.24;

    // 4.1 Cilindro / Medallón central
    const discGeo = new THREE.CylinderGeometry(discRadius, discRadius, discDepth, 80);
    const discMesh = new THREE.Mesh(discGeo, goldRimMat);
    discMesh.rotation.x = Math.PI / 2;
    discMesh.position.y = 0.55;
    discMesh.castShadow = true;
    discMesh.receiveShadow = true;
    logoRoot.add(discMesh);

    // 4.2 Bisel perimetral curvado para destellos especulares
    const bevelGeo = new THREE.TorusGeometry(discRadius, 0.035, 20, 80);
    const frontBevel = new THREE.Mesh(bevelGeo, goldRimMat);
    frontBevel.position.set(0, 0.55, discDepth / 2);
    logoRoot.add(frontBevel);

    const backBevel = new THREE.Mesh(bevelGeo, goldRimMat);
    backBevel.position.set(0, 0.55, -discDepth / 2);
    logoRoot.add(backBevel);

    // ─── 5. CARAS DEL EMBLEMA (Corte exacto del círculo del logo original) ───
    const img = new Image();
    img.src = liaterLogoImg;
    img.onload = () => {
      // 5.1 Textura exacta del círculo (sin texto ni bordes vacíos)
      const circleCanvas = document.createElement('canvas');
      circleCanvas.width = 512;
      circleCanvas.height = 512;
      const cCtx = circleCanvas.getContext('2d');

      // Recorte circular perfecto
      cCtx.beginPath();
      cCtx.arc(256, 256, 255, 0, Math.PI * 2);
      cCtx.closePath();
      cCtx.clip();

      // Extraer exactamente las coordenadas del círculo en liater-logo.png (138, 62 a 642, 561)
      cCtx.drawImage(img, 138, 62, 504, 500, 0, 0, 512, 512);

      const circleTexture = new THREE.CanvasTexture(circleCanvas);
      circleTexture.colorSpace = THREE.SRGBColorSpace;
      circleTexture.generateMipmaps = true;
      circleTexture.minFilter = THREE.LinearMipmapLinearFilter;

      const circleFaceMat = new THREE.MeshStandardMaterial({
        map: circleTexture,
        roughness: 0.22,
        metalness: 0.15,
      });

      const circleFaceGeo = new THREE.CircleGeometry(discRadius * 0.99, 64);

      // Cara frontal
      const frontFace = new THREE.Mesh(circleFaceGeo, circleFaceMat);
      frontFace.position.set(0, 0.55, discDepth / 2 + 0.005);
      logoRoot.add(frontFace);

      // Cara trasera
      const backFace = new THREE.Mesh(circleFaceGeo, circleFaceMat);
      backFace.position.set(0, 0.55, -discDepth / 2 - 0.005);
      backFace.rotation.y = Math.PI;
      logoRoot.add(backFace);

      // 5.2 Textura exacta del texto inferior "LIATER" del logo original
      const textCanvas = document.createElement('canvas');
      textCanvas.width = 512;
      textCanvas.height = 128;
      const tCtx = textCanvas.getContext('2d');

      // Extraer el texto "LIATER" original (139, 614 a 634, 708)
      tCtx.drawImage(img, 130, 606, 512, 108, 0, 10, 512, 108);

      const textTexture = new THREE.CanvasTexture(textCanvas);
      textTexture.colorSpace = THREE.SRGBColorSpace;

      const textPlaneGeo = new THREE.PlaneGeometry(3.1, 0.78);
      const textPlaneMat = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
      });

      // Texto frontal
      const frontText = new THREE.Mesh(textPlaneGeo, textPlaneMat);
      frontText.position.set(0, -1.45, 0.05);
      logoRoot.add(frontText);

      // Texto trasero
      const backText = new THREE.Mesh(textPlaneGeo, textPlaneMat);
      backText.position.set(0, -1.45, -0.05);
      backText.rotation.y = Math.PI;
      logoRoot.add(backText);
    };

    // ─── 6. INTERACCIÓN CON EL MOUSE (Arrastre 360° + Inclinación suave) ──────
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotY = 0;
    let targetRotX = 0;
    let mouseParallax = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      mouseParallax.x = nx * 0.38;
      mouseParallax.y = -ny * 0.22;

      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        targetRotY += deltaX * 0.015;
        targetRotX += deltaY * 0.015;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const onMouseUp = () => {
      isDragging = false;
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

    // ─── 7. ANIMACIÓN A 60 FPS ────────────────────────────────────────────────
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Giro continuo suave
      if (!isDragging) {
        targetRotY += 0.0075;
      }

      // Suavizado cinético (Lerp)
      logoRoot.rotation.y += (targetRotY + mouseParallax.x - logoRoot.rotation.y) * 0.08;
      logoRoot.rotation.x += (targetRotX + mouseParallax.y - logoRoot.rotation.x) * 0.08;

      // Flotación senoidal
      logoRoot.position.y = Math.sin(elapsed * 1.6) * 0.1;

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
      
      // Liberar geometrías, materiales y texturas de la GPU
      scene.traverse((obj) => {
        if (obj.isMesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => {
                if (m.map) m.map.dispose();
                m.dispose();
              });
            } else {
              if (obj.material.map) obj.material.map.dispose();
              obj.material.dispose();
            }
          }
        }
      });

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
        maxWidth: '520px',
        height: '460px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        userSelect: 'none',
        background: 'transparent',
      }}
    />
  );
}
