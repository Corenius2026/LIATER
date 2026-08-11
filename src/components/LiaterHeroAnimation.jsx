import { useState, useEffect, useRef } from 'react';
import { Zap, Sun, Award } from 'lucide-react';
import liaterLogoWhite from '../assets/liater-logo-white.png';

export default function LiaterHeroAnimation() {
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Canvas 3D Particle Sphere & High-Voltage Electric Arc Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Configuración de resolución HD
    const width = 520;
    const height = 500;
    canvas.width = width * window.devicePixelRatio || width;
    canvas.height = height * window.devicePixelRatio || height;
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    // Generar puntos 3D distribuidos en una esfera (Fibonacci Sphere)
    const numPoints = 65;
    const radius = 185;
    const points = [];

    for (let i = 0; i < numPoints; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / numPoints);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      points.push({
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        baseSize: Math.random() * 2 + 2,
        colorType: i % 4 === 0 ? 'cyan' : (i % 3 === 0 ? 'white' : 'gold')
      });
    }

    let angleX = 0.003;
    let angleY = 0.005;
    let currentRotX = 0.2;
    let currentRotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;

    const handleMouseMoveInternal = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left - rect.width / 2;
      const clientY = e.clientY - rect.top - rect.height / 2;
      targetRotY = (clientX / rect.width) * 0.8;
      targetRotX = -(clientY / rect.height) * 0.8;
    };

    window.addEventListener('mousemove', handleMouseMoveInternal);

    // Bucle de renderizado 3D a 60 FPS
    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      // Suavizado de rotación por ratón + rotación continua
      currentRotX += (targetRotX + Math.sin(time * 0.5) * 0.1 - currentRotX) * 0.05 + angleX;
      currentRotY += (targetRotY + Math.cos(time * 0.4) * 0.1 - currentRotY) * 0.05 + angleY;

      const cosX = Math.cos(currentRotX);
      const sinX = Math.sin(currentRotX);
      const cosY = Math.cos(currentRotY);
      const sinY = Math.sin(currentRotY);

      // Proyectar puntos 3D a plano 2D
      const projected = [];
      const focalLength = 340;
      const centerX = width / 2;
      const centerY = height / 2;

      for (let i = 0; i < points.length; i++) {
        const p = points[i];

        // Rotación en Y
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;

        // Rotación en X
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + p.y * sinX;

        // Proyección en perspectiva
        const scale = focalLength / (focalLength + z2 + 250);
        const px = centerX + x1 * scale;
        const py = centerY + y2 * scale;
        const alpha = Math.max(0.12, Math.min(1, (z2 + radius) / (2 * radius) + 0.25));

        projected.push({
          x: px,
          y: py,
          z: z2,
          scale,
          alpha,
          colorType: p.colorType,
          size: p.baseSize * scale
        });
      }

      // Ordenar por profundidad Z (Pintar lo lejano primero)
      projected.sort((a, b) => a.z - b.z);

      // 1. Dibujar Arcos Eléctricos / Conexiones de Alta Tensión entre nodos cercanos
      ctx.lineWidth = 1;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 75) {
            const lineAlpha = (1 - dist / 75) * projected[i].alpha * projected[j].alpha * 0.55;
            ctx.strokeStyle = `rgba(252, 163, 17, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);

            // Chispas o descargas eléctricas aleatorias
            if (dist < 40 && Math.sin(time * 8 + i + j) > 0.92) {
              const midX = (projected[i].x + projected[j].x) / 2 + (Math.random() - 0.5) * 8;
              const midY = (projected[i].y + projected[j].y) / 2 + (Math.random() - 0.5) * 8;
              ctx.lineTo(midX, midY);
              ctx.strokeStyle = `rgba(56, 189, 248, ${lineAlpha * 2})`;
            }

            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      // 2. Dibujar Nodos / Partículas Energéticas con Glow
      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(1, pt.size), 0, Math.PI * 2);

        if (pt.colorType === 'cyan') {
          ctx.fillStyle = `rgba(56, 189, 248, ${pt.alpha})`;
          ctx.shadowColor = '#38BDF8';
        } else if (pt.colorType === 'white') {
          ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha})`;
          ctx.shadowColor = '#FFFFFF';
        } else {
          ctx.fillStyle = `rgba(252, 163, 17, ${pt.alpha})`;
          ctx.shadowColor = '#FCA311';
        }

        ctx.shadowBlur = pt.alpha > 0.6 ? 8 : 0;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveInternal);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Parallax interactivo para tarjetas HUD
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 22;
      const y = (e.clientY / innerHeight - 0.5) * 22;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="liater-3d-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '520px',
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1200px',
        userSelect: 'none'
      }}
    >
      {/* 1. Resplandor Ambiental Tecnológico de Fondo */}
      <div style={{
        position: 'absolute',
        width: '340px',
        height: '340px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252, 163, 17, 0.30) 0%, rgba(56, 189, 248, 0.12) 45%, transparent 70%)',
        filter: 'blur(35px)',
        animation: 'pulseGlow3D 5s ease-in-out infinite alternate',
        pointerEvents: 'none'
      }} />

      {/* 2. Canvas 3D Esfera de Partículas y Rayos Eléctricos */}
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      />

      {/* 3. Anillos Giroscópicos 3D CSS en el Espacio Tridimensional */}
      <div 
        style={{
          position: 'absolute',
          width: '360px',
          height: '360px',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${65 + mousePos.y * 0.4}deg) rotateY(${15 + mousePos.x * 0.4}deg)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          pointerEvents: 'none',
          zIndex: 3
        }}
      >
        {/* Anillo Orbital 3D 1 (Dorado Alta Tensión) */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(252, 163, 17, 0.55)',
          boxShadow: '0 0 15px rgba(252, 163, 17, 0.4), inset 0 0 15px rgba(252, 163, 17, 0.2)',
          animation: 'spin3DOrbit 18s linear infinite'
        }} />

        {/* Anillo Orbital 3D 2 (Azul Eléctrico / Fotometría) */}
        <div style={{
          position: 'absolute',
          inset: '25px',
          borderRadius: '50%',
          border: '1.5px dashed rgba(56, 189, 248, 0.45)',
          animation: 'spin3DOrbitReverse 24s linear infinite'
        }} />
      </div>

      {/* 4. NÚCLEO 3D CENTRAL LIATER (Reactor Holográfico con Logo Blanco Ultra-Legible) */}
      <div 
        style={{
          position: 'relative',
          width: '190px',
          height: '190px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1A2B4C 0%, #0B132B 100%)',
          border: '2.5px solid #FCA311',
          boxShadow: '0 0 45px rgba(252, 163, 17, 0.45), 0 0 20px rgba(56, 189, 248, 0.3), inset 0 0 30px rgba(20, 33, 61, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          transform: `translate3d(${mousePos.x * 0.6}px, ${mousePos.y * 0.6}px, 40px)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          animation: 'floatingCore3D 6s ease-in-out infinite'
        }}
      >
        {/* Anillo de energía interna que gira */}
        <div style={{
          position: 'absolute',
          inset: '6px',
          borderRadius: '50%',
          border: '1px dashed rgba(252, 163, 17, 0.5)',
          animation: 'spinClockwise 15s linear infinite'
        }} />

        {/* LOGO LIATER EN BLANCO Y DORADO (100% Nítido y Legible) */}
        <img 
          src={liaterLogoWhite} 
          alt="Laboratorio LIATER" 
          style={{ 
            height: '75px', 
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 15px rgba(0,0,0,0.7))',
            position: 'relative',
            zIndex: 3
          }} 
        />
        
        {/* Badge Activo con Texto Claro y Brillante */}
        <div style={{
          marginTop: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '20px',
          background: 'rgba(252, 163, 17, 0.2)',
          border: '1px solid rgba(252, 163, 17, 0.5)',
          backdropFilter: 'blur(6px)',
          zIndex: 3
        }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E' }} />
          <span style={{ fontSize: '0.66rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.08em', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            LAB ACTIVO
          </span>
        </div>
      </div>

      {/* 5. TARJETAS FLOTANTES 3D HUD (Tipografía 100% Blanca y Clara) */}
      
      {/* Badge 1: Alta Tensión & Potencia */}
      <div 
        style={{
          position: 'absolute',
          top: '25px',
          right: '-12px',
          background: 'rgba(20, 33, 61, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(252, 163, 17, 0.5)',
          borderRadius: '14px',
          padding: '0.75rem 1.05rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45), 0 0 15px rgba(252, 163, 17, 0.15)',
          zIndex: 6,
          transform: `translate3d(${mousePos.x * -0.9}px, ${mousePos.y * -0.9}px, 60px)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          animation: 'floatingBadge1 5s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(252, 163, 17, 0.3) 0%, rgba(252, 163, 17, 0.1) 100%)',
          border: '1px solid rgba(252, 163, 17, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FCA311'
        }}>
          <Zap size={20} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '0.01em' }}>
            Alta Tensión
          </div>
          <div style={{ fontSize: '0.72rem', color: '#E2E8F0', fontWeight: 500, marginTop: '2px' }}>
            Pruebas & Ensayos
          </div>
        </div>
      </div>

      {/* Badge 2: Energías Limpias & Fotometría */}
      <div 
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '-20px',
          background: 'rgba(20, 33, 61, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(56, 189, 248, 0.5)',
          borderRadius: '14px',
          padding: '0.75rem 1.05rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45), 0 0 15px rgba(56, 189, 248, 0.15)',
          zIndex: 6,
          transform: `translate3d(${mousePos.x * 0.9}px, ${mousePos.y * 0.9}px, 65px)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          animation: 'floatingBadge2 6s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(56, 189, 248, 0.1) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#38BDF8'
        }}>
          <Sun size={20} />
        </div>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, letterSpacing: '0.01em' }}>
            Energías Limpias
          </div>
          <div style={{ fontSize: '0.72rem', color: '#E2E8F0', fontWeight: 500, marginTop: '2px' }}>
            Solar & Iluminación
          </div>
        </div>
      </div>

      {/* Badge 3: Certificación y Universidad Nacional */}
      <div 
        style={{
          position: 'absolute',
          bottom: '55px',
          right: '0px',
          background: 'rgba(15, 26, 46, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(34, 197, 94, 0.45)',
          borderRadius: '14px',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          boxShadow: '0 14px 30px rgba(0, 0, 0, 0.45), 0 0 15px rgba(34, 197, 94, 0.15)',
          zIndex: 6,
          transform: `translate3d(${mousePos.x * -0.6}px, ${mousePos.y * -0.6}px, 50px)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          animation: 'floatingBadge3 7s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.1) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#22C55E'
        }}>
          <Award size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.80rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
            Certificación UNAL
          </div>
          <div style={{ fontSize: '0.70rem', color: '#FDE68A', fontWeight: 700, marginTop: '2px' }}>
            100% Práctico
          </div>
        </div>
      </div>

      {/* Estilos de Animación 3D */}
      <style>{`
        @keyframes spin3DOrbit {
          from { transform: rotateZ(0deg); }
          to { transform: rotateZ(360deg); }
        }
        @keyframes spin3DOrbitReverse {
          from { transform: rotateZ(360deg); }
          to { transform: rotateZ(0deg); }
        }
        @keyframes spinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseGlow3D {
          0% { transform: scale(0.85); opacity: 0.55; }
          100% { transform: scale(1.2); opacity: 0.9; }
        }
        @keyframes floatingCore3D {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-10px) scale(1.03); }
        }
        @keyframes floatingBadge1 {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-12px); }
        }
        @keyframes floatingBadge2 {
          0% { transform: translateY(0px); }
          100% { transform: translateY(10px); }
        }
        @keyframes floatingBadge3 {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
