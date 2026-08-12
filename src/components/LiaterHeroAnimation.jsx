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

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

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
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // ─── 2. ILUMINACIÓN DE ESTUDIO 3D ─────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    // Luz principal solar cálida
    const keyLight = new THREE.DirectionalLight(0xfff7e6, 3.8);
    keyLight.position.set(-3, 5, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Luz de contorno azul suave para bordes metálicos
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(5, -2, -3);
    scene.add(rimLight);

    // Luz de relleno cálida frontal
    const fillLight = new THREE.PointLight(0xfca311, 2.5, 8, 1.2);
    fillLight.position.set(2, 2, 4);
    scene.add(fillLight);

    // ─── 3. GRUPO DEL LOGO 3D LIATER ──────────────────────────────────────────
    const logoRoot = new THREE.Group();
    scene.add(logoRoot);

    // ─── 4. MATERIALES PBR REALISTAS ──────────────────────────────────────────
    // Oro LIATER oficial (#E5A93C / #FCA311)
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xfca311,
      emissive: 0x442600,
      emissiveIntensity: 0.15,
      metalness: 0.88,
      roughness: 0.22,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15,
      reflectivity: 0.9,
    });

    const goldEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xdf9510,
      metalness: 0.92,
      roughness: 0.2,
    });

    // 4.1 Medallón circular 3D
    const discRadius = 1.55;
    const discThickness = 0.22;

    const discGeo = new THREE.CylinderGeometry(discRadius, discRadius, discThickness, 80);
    const discMesh = new THREE.Mesh(discGeo, goldEdgeMat);
    discMesh.rotation.x = Math.PI / 2;
    discMesh.position.y = 0.45;
    discMesh.castShadow = true;
    discMesh.receiveShadow = true;
    logoRoot.add(discMesh);

    // 4.2 Bisel perimetral suave
    const bevelTorusGeo = new THREE.TorusGeometry(discRadius, 0.035, 20, 80);
    const frontBevel = new THREE.Mesh(bevelTorusGeo, goldMat);
    frontBevel.position.set(0, 0.45, discThickness / 2);
    logoRoot.add(frontBevel);

    const backBevel = new THREE.Mesh(bevelTorusGeo, goldMat);
    backBevel.position.set(0, 0.45, -discThickness / 2);
    logoRoot.add(backBevel);

    // 4.3 Cara frontal y trasera con el logotipo oficial de alta resolución
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(liaterLogoImg, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;

      const faceMat = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        roughness: 0.25,
        metalness: 0.2,
      });

      // Plano frontal con el logo
      const faceGeo = new THREE.CircleGeometry(discRadius * 0.96, 64);
      const frontFace = new THREE.Mesh(faceGeo, faceMat);
      frontFace.position.set(0, 0.45, discThickness / 2 + 0.005);
      logoRoot.add(frontFace);

      // Plano trasero con el logo
      const backFace = new THREE.Mesh(faceGeo, faceMat);
      backFace.position.set(0, 0.45, -discThickness / 2 - 0.005);
      backFace.rotation.y = Math.PI;
      logoRoot.add(backFace);
    });

    // ─── 5. TEXTO INFERIOR "LIATER" EN 3D ─────────────────────────────────────
    // Creamos un canvas HD para renderizar el texto "LIAT" (navy) + "ER" (gold) con nitidez vectorial
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d');

    ctx.clearRect(0, 0, 1024, 256);
    ctx.font = '900 120px "Inter", "Montserrat", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '14px';

    // Medir ancho para posicionar "LIAT" y "ER"
    const fullText = 'LIATER';
    const textMetrics = ctx.measureText(fullText);
    const startX = 512 - textMetrics.width / 2;

    // Dibujar "LIAT" en Navy/Negro
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText('LIAT', 410, 128);

    // Dibujar "ER" en Dorado
    ctx.fillStyle = '#FCA311';
    ctx.shadowColor = 'rgba(252, 163, 17, 0.5)';
    ctx.shadowBlur = 16;
    ctx.fillText('ER', 640, 128);

    const textTexture = new THREE.CanvasTexture(textCanvas);
    textTexture.colorSpace = THREE.SRGBColorSpace;

    const textPlaneGeo = new THREE.PlaneGeometry(3.2, 0.8);
    const textPlaneMat = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
    });

    const frontText = new THREE.Mesh(textPlaneGeo, textPlaneMat);
    frontText.position.set(0, -1.5, 0.1);
    logoRoot.add(frontText);

    const backText = new THREE.Mesh(textPlaneGeo, textPlaneMat);
    backText.position.set(0, -1.5, -0.1);
    backText.rotation.y = Math.PI;
    logoRoot.add(backText);

    // ─── 6. INTERACCIÓN CON EL MOUSE (Hover & Drag 3D) ────────────────────────
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
      mouseParallax.x = nx * 0.4;
      mouseParallax.y = -ny * 0.25;

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

      // Giro continuo lento
      if (!isDragging) {
        targetRotY += 0.007;
      }

      // Lerp hacia las rotaciones objetivo
      logoRoot.rotation.y += (targetRotY + mouseParallax.x - logoRoot.rotation.y) * 0.08;
      logoRoot.rotation.x += (targetRotX + mouseParallax.y - logoRoot.rotation.x) * 0.08;

      // Flotación suave
      logoRoot.position.y = Math.sin(elapsed * 1.5) * 0.1;

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
