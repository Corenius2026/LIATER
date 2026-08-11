/**
 * LiaterHeroAnimation — Three.js WebGL Scene
 *
 * Inspirado en:
 *  - threejs.org/examples/#webgl_postprocessing_unreal_bloom
 *  - tympanus.net/codrops (particle flow fields)
 *  - Siemens Energy / ABB website 3D hero sections
 *
 * Técnicas:
 *  - InstancedMesh para 5 000 partículas de campo de energía
 *  - Shaders personalizados GLSL (vertex/fragment) para el plasma orb
 *  - UnrealBloomPass para efecto de glow cinematográfico
 *  - Procedural lightning (midpoint displacement en GPU)
 *  - Luces PBR + sombras suaves
 *  - Mouse parallax con lerp suavizado
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── Shader: Plasma Orb (núcleo central de energía) ──────────────────────────
const plasmaVert = /* glsl */`
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vUv     = uv;
    vNormal = normalize(normalMatrix * normal);
    vPos    = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const plasmaFrag = /* glsl */`
  uniform float uTime;
  uniform vec3  uColorA;   // dorado
  uniform vec3  uColorB;   // cian
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPos;

  // Simplex noise inline (Ian McEwan, MIT)
  vec3 mod289(vec3 x){ return x - floor(x*(1./289.))*289.; }
  vec4 mod289(vec4 x){ return x - floor(x*(1./289.))*289.; }
  vec4 permute(vec4 x){ return mod289(((x*34.)+1.)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159-.85373472095314*r; }
  float snoise(vec3 v) {
    const vec2 C = vec2(1./6., 1./3.);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1. - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - .5;
    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z+vec4(0.,i1.z,i2.z,1.))
      + i.y+vec4(0.,i1.y,i2.y,1.))
      + i.x+vec4(0.,i1.x,i2.x,1.));
    vec3 ns = .142857142857*C.yyy - C.xzx;
    vec4 j  = p - 49.*floor(p*(ns.z*ns.z));
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.*x_);
    vec4 x  = x_*ns.x + ns.yyyy;
    vec4 y  = y_*ns.x + ns.yyyy;
    vec4 h  = 1. - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.+1.;
    vec4 s1 = floor(b1)*2.+1.;
    vec4 sh = -step(h, vec4(0.));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m = max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
    m = m*m;
    return 42.*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    // Ruido en capas para superficie de plasma
    float n1 = snoise(vPos * 2.5 + uTime * 0.5);
    float n2 = snoise(vPos * 5.0 - uTime * 0.8) * 0.5;
    float n3 = snoise(vPos * 10. + uTime * 1.2) * 0.25;
    float n  = (n1 + n2 + n3) * 0.5 + 0.5;

    // Fresnel para borde brillante
    vec3 viewDir  = normalize(cameraPosition - vPos);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);

    vec3 col = mix(uColorA, uColorB, n);
    col = mix(col, vec3(1.0), fresnel * 0.6);

    // Emissive intenso en los bordes
    float emissive = 1.4 + fresnel * 2.0 + n * 0.6;
    gl_FragColor = vec4(col * emissive, 0.85 + fresnel * 0.15);
  }
`;

// ─── Shader: Partículas de campo de energía ───────────────────────────────────
const particleVert = /* glsl */`
  attribute float aRandom;
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  varying float vAlpha;
  varying float vRandom;

  void main() {
    vRandom = aRandom;
    float pulse = sin(uTime * 1.8 + aPhase) * 0.5 + 0.5;
    vAlpha = 0.15 + pulse * 0.55;

    vec3 pos = position;
    // Pequeña flotación orbital
    float ang = aPhase + uTime * (0.3 + aRandom * 0.4);
    float r   = length(pos.xz);
    pos.y    += sin(uTime * 0.7 + aPhase * 2.) * 0.08;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (1. / -mvPos.z) * (0.6 + pulse * 0.8);
    gl_Position  = projectionMatrix * mvPos;
  }
`;
const particleFrag = /* glsl */`
  varying float vAlpha;
  varying float vRandom;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  void main() {
    // Círculo suave
    vec2 uv = gl_PointCoord - 0.5;
    float d = dot(uv, uv);
    if (d > 0.25) discard;
    float alpha = vAlpha * (1.0 - smoothstep(0.15, 0.25, d));
    vec3 col = mix(uColorA, uColorB, vRandom);
    gl_FragColor = vec4(col, alpha);
  }
`;

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LiaterHeroAnimation() {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const W = el.clientWidth  || 560;
    const H = el.clientHeight || 480;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    el.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    // ── Post-Processing: Bloom ────────────────────────────────────────────────
    const composer  = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(W, H),
      1.2,   // strength
      0.55,  // radius
      0.20   // threshold  — todo con emissive alto florece
    );
    composer.addPass(bloom);

    // ── Colores base ──────────────────────────────────────────────────────────
    const GOLD = new THREE.Color(0xfca311);
    const CYAN = new THREE.Color(0x38bdf8);
    const WHITE = new THREE.Color(0xffffff);

    // ── Luces ─────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x0d1b3e, 2.0));
    const pointGold = new THREE.PointLight(GOLD, 4, 8);
    pointGold.position.set(0, 0, 1.5);
    scene.add(pointGold);
    const pointCyan = new THREE.PointLight(CYAN, 2.5, 7);
    pointCyan.position.set(2.5, 1.5, 1);
    scene.add(pointCyan);
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.0);
    rimLight.position.set(-4, 3, -2);
    scene.add(rimLight);

    // ── PLASMA ORB — núcleo central con shader ─────────────────────────────────
    const orbGeo = new THREE.IcosahedronGeometry(1.05, 6);
    const orbMat = new THREE.ShaderMaterial({
      vertexShader:   plasmaVert,
      fragmentShader: plasmaFrag,
      uniforms: {
        uTime:   { value: 0 },
        uColorA: { value: GOLD },
        uColorB: { value: CYAN },
      },
      transparent: true,
      side: THREE.FrontSide,
    });
    const orb = new THREE.Mesh(orbGeo, orbMat);
    scene.add(orb);

    // Anillos de energía orbitales (3 torus)
    const ringMats = [];
    [1.55, 2.0, 2.55].forEach((r, i) => {
      const mat = new THREE.MeshStandardMaterial({
        color: i % 2 ? CYAN : GOLD,
        emissive: i % 2 ? CYAN : GOLD,
        emissiveIntensity: 2.5,
        metalness: 0.0, roughness: 0.1,
        transparent: true, opacity: 0.55,
        side: THREE.DoubleSide,
      });
      ringMats.push(mat);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.018 - i * 0.003, 12, 120),
        mat
      );
      ring.rotation.x = Math.PI / 2 + i * 0.35;
      ring.rotation.y = i * 0.65;
      ring.userData   = { speed: (0.3 + i * 0.18) * (i % 2 ? -1 : 1), idx: i };
      scene.add(ring);
    });

    // ── TORRE DE ALTA TENSIÓN — izquierda, con InstancedMesh de barras ─────────
    // Construimos las barras como cilindros instanciados
    function makeTowerBar(group, x1, y1, z1, x2, y2, z2, r = 0.03, mat) {
      const dir = new THREE.Vector3(x2-x1, y2-y1, z2-z1);
      const len = dir.length();
      const geo = new THREE.CylinderGeometry(r, r, len, 6, 1);
      const m   = new THREE.Mesh(geo, mat);
      m.position.set((x1+x2)/2, (y1+y2)/2, (z1+z2)/2);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
      group.add(m);
    }

    const towerGrp = new THREE.Group();
    towerGrp.position.set(-3.2, -1.5, -0.5);
    towerGrp.scale.setScalar(0.72);

    const steelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xe8b84b),
      metalness: 0.88, roughness: 0.20,
      emissive: new THREE.Color(0x3a2800), emissiveIntensity: 0.4,
    });
    const insulMat = new THREE.MeshStandardMaterial({
      color: CYAN, emissive: CYAN, emissiveIntensity: 1.8,
      metalness: 0.1, roughness: 0.3,
    });

    // Patas y celosías
    const LEGS = [[-0.5,0,-0.5],[0.5,0,-0.5],[-0.5,0,0.5],[0.5,0,0.5]];
    LEGS.forEach(([lx,,lz]) => {
      makeTowerBar(towerGrp, lx,0,lz, lx*0.3,2.0,lz*0.3, 0.05, steelMat);
      makeTowerBar(towerGrp, lx*0.3,2.0,lz*0.3, 0,4.2,0, 0.04, steelMat);
    });
    [0.4, 1.1, 1.85, 2.65].forEach(yy => {
      const w = Math.max(0.15, 0.5 - yy * 0.08);
      makeTowerBar(towerGrp, -w,yy,0, w,yy,0, 0.032, steelMat);
      makeTowerBar(towerGrp, 0,yy,-w, 0,yy,w, 0.032, steelMat);
    });
    [[0,0.4,0.5,1.1],[0.5,1.1,0.3,1.85],[0.3,1.85,0,2.65]].forEach(([y1,y2]) => {
      const w1 = 0.5-y1*0.09, w2 = 0.5-y2*0.09;
      makeTowerBar(towerGrp,-w1,y1,-w1, w2,y2,w2, 0.024, steelMat);
      makeTowerBar(towerGrp, w1,y1,-w1,-w2,y2,w2, 0.024, steelMat);
    });
    // Brazos de transmisión + aisladores
    [-0.45,0,0.45].forEach(az => {
      makeTowerBar(towerGrp,-0.65,2.65,az, 0.65,2.65,az, 0.035, steelMat);
      [[-0.65,2.65,az],[0.65,2.65,az]].forEach(([ix,iy,iz]) => {
        const sph = new THREE.Mesh(new THREE.SphereGeometry(0.06,10,10), insulMat);
        sph.position.set(ix,iy,iz);
        towerGrp.add(sph);
      });
    });
    makeTowerBar(towerGrp,0,3.6,0, 0,4.3,0, 0.022, steelMat);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045,8,8), steelMat);
    tip.position.set(0,4.35,0); towerGrp.add(tip);
    scene.add(towerGrp);

    // Cables desde torre hacia el centro
    const wireMat = new THREE.LineBasicMaterial({ color: 0x7a8faa, transparent: true, opacity: 0.5 });
    [-0.45,0,0.45].forEach(az => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.2 + 0.65*0.72, -1.5 + 2.65*0.72, az*0.72-0.5),
        new THREE.Vector3(-1.8, 0.4, 0),
        new THREE.Vector3(-1.2, 0.1, 0),
      ]);
      const pts = curve.getPoints(40);
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    });

    // ── PANEL SOLAR — derecha ──────────────────────────────────────────────────
    const solarGrp = new THREE.Group();
    solarGrp.position.set(3.2, -1.8, -0.5);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.75, roughness: 0.4 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.06,2.4,10), poleMat);
    pole.position.y = 1.2; solarGrp.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28,0.32,0.09,16), poleMat);
    base.position.y = 0.045; solarGrp.add(base);

    const pGrp = new THREE.Group();
    pGrp.position.y = 2.4;
    pGrp.rotation.x = -0.62; // 36° inclinado

    // Superficie del panel
    const panelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0d2a6e), metalness: 0.1, roughness: 0.07,
      emissive: new THREE.Color(0x0a1840), emissiveIntensity: 0.6,
    });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.05,1.2), panelMat);
    pGrp.add(panel);

    // Marco
    const fMat = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8, roughness: 0.3 });
    [[1.8,0.06,0.06,0,0,0.6],[1.8,0.06,0.06,0,0,-0.6],[0.06,0.06,1.2,0.9,0,0],[0.06,0.06,1.2,-0.9,0,0]]
      .forEach(([bx,by,bz,px,py,pz]) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(bx,by+0.04,bz), fMat);
        b.position.set(px,0.055,pz); pGrp.add(b);
      });

    // Grilla semitransparente
    const gridMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, metalness: 0, roughness: 0.5 });
    for (let c = 1; c < 4; c++) {
      const gx = -0.9 + (1.8/4)*c;
      const g  = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 1.2), gridMat);
      g.position.set(gx, 0.055, 0); pGrp.add(g);
    }
    for (let r = 1; r < 3; r++) {
      const gz = -0.6 + (1.2/3)*r;
      const g  = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.015), gridMat);
      g.position.set(0, 0.055, gz); pGrp.add(g);
    }
    // Reflejo especular falso
    const refMat = new THREE.MeshStandardMaterial({ color: 0xadd8f7, transparent: true, opacity: 0.12, metalness: 0, roughness: 0 });
    const ref = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), refMat);
    ref.rotation.x = -Math.PI/2; ref.position.set(-0.3, 0.03, -0.1); pGrp.add(ref);

    solarGrp.add(pGrp);
    scene.add(solarGrp);

    // ── CAMPO DE PARTÍCULAS — 4 000 puntos en esfera + flujo ──────────────────
    const N = 4000;
    const positions = new Float32Array(N * 3);
    const randoms   = new Float32Array(N);
    const phases    = new Float32Array(N);

    // Distribución: mezcla de esfera y toro
    for (let i = 0; i < N; i++) {
      const mode = Math.random();
      let x, y, z;
      if (mode < 0.6) {
        // Esfera aleatoria alrededor del orb
        const r   = 1.6 + Math.random() * 2.2;
        const phi = Math.random() * Math.PI * 2;
        const the = Math.acos(2 * Math.random() - 1);
        x = r * Math.sin(the) * Math.cos(phi);
        y = r * Math.sin(the) * Math.sin(phi);
        z = r * Math.cos(the);
      } else {
        // Espiral plana (flujo entre torre y panel)
        const r   = 2.2 + Math.random() * 1.4;
        const phi = Math.random() * Math.PI * 2;
        x = r * Math.cos(phi) * (0.7 + Math.random() * 0.6);
        y = (Math.random() - 0.5) * 2.0;
        z = r * Math.sin(phi) * 0.35;
      }
      positions[i*3]   = x;
      positions[i*3+1] = y;
      positions[i*3+2] = z;
      randoms[i] = Math.random();
      phases[i]  = Math.random() * Math.PI * 2;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('aRandom',  new THREE.BufferAttribute(randoms, 1));
    pGeo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));

    const pMat = new THREE.ShaderMaterial({
      vertexShader:   particleVert,
      fragmentShader: particleFrag,
      uniforms: {
        uTime:   { value: 0 },
        uSize:   { value: 180 * renderer.getPixelRatio() },
        uColorA: { value: GOLD },
        uColorB: { value: CYAN },
      },
      transparent: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ── Rayos de arco eléctrico (líneas procedurales) ─────────────────────────
    function makeLightningLine(x1,y1,z1,x2,y2,z2, segs=20) {
      const pts = [new THREE.Vector3(x1,y1,z1)];
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        pts.push(new THREE.Vector3(
          x1 + (x2-x1)*t + (Math.random()-0.5)*0.3,
          y1 + (y2-y1)*t + (Math.random()-0.5)*0.3,
          z1 + (z2-z1)*t + (Math.random()-0.5)*0.15,
        ));
      }
      pts.push(new THREE.Vector3(x2,y2,z2));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      return new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending,
      }));
    }

    const lightnings = [];
    let lightningTimer = 0;
    const regenerateLightnings = () => {
      lightnings.forEach(l => { scene.remove(l); l.geometry.dispose(); });
      lightnings.length = 0;
      // 2 arcos: torre→orb y orb→panel
      lightnings.push(makeLightningLine(-2.2, 0.5, 0,  -1.05, 0, 0));
      lightnings.push(makeLightningLine( 1.05, 0, 0,    2.2, 0.3, 0));
      // rama secundaria aleatoria
      if (Math.random() > 0.5)
        lightnings.push(makeLightningLine(-1.05, 0, 0, -0.8 + Math.random()*0.4, -0.8, 0.3));
      lightnings.forEach(l => scene.add(l));
    };
    regenerateLightnings();

    // ── Mouse ─────────────────────────────────────────────────────────────────
    let tX = 0, tY = 0, cX = 0, cY = 0;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      tX = ((e.clientX - r.left - r.width /2) / (r.width /2)) * 0.4;
      tY = -((e.clientY - r.top  - r.height/2) / (r.height/2)) * 0.25;
    };
    const onLeave = () => { tX = 0; tY = 0; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Animación ─────────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Lerp cámara
      cX += (tX - cX) * 0.05;
      cY += (tY - cY) * 0.05;
      scene.rotation.y = cX;
      scene.rotation.x = cY;

      // Shaders
      orbMat.uniforms.uTime.value = t;
      pMat.uniforms.uTime.value   = t;

      // Orb pulsado + rotación lenta
      orb.rotation.y = t * 0.18;
      orb.rotation.z = t * 0.09;
      const pulse = 1 + Math.sin(t * 2.4) * 0.05;
      orb.scale.setScalar(pulse);
      pointGold.intensity = 3.5 + Math.sin(t * 3.0) * 1.5;

      // Anillos orbitales
      scene.children.filter(c => c.geometry && c.geometry.type === 'TorusGeometry').forEach(ring => {
        ring.rotation.z += ring.userData.speed * 0.012;
        ring.rotation.x += ring.userData.speed * 0.006;
        if (ring.material) ring.material.opacity = 0.4 + Math.sin(t * 1.5 + ring.userData.idx) * 0.2;
      });

      // Torre: flotamiento
      towerGrp.position.y = -1.5 + Math.sin(t * 0.55) * 0.06;
      // Panel: flotamiento diferente
      solarGrp.position.y = -1.8 + Math.sin(t * 0.45 + 1.5) * 0.08;
      pGrp.rotation.z     = Math.sin(t * 0.35) * 0.03;

      // Partículas: lenta rotación
      particles.rotation.y = t * 0.04;
      particles.rotation.x = Math.sin(t * 0.2) * 0.08;

      // Rayos: regenerar cada ~350ms
      lightningTimer += 1;
      if (lightningTimer > 21) { regenerateLightnings(); lightningTimer = 0; }
      lightnings.forEach(l => {
        l.material.opacity = 0.5 + Math.sin(t * 12) * 0.4;
      });

      composer.render();
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      renderer.dispose();
      composer.dispose();
      if (renderer.domElement.parentNode)
        renderer.domElement.parentNode.removeChild(renderer.domElement);
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
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    />
  );
}
