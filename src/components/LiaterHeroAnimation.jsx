import { useState, useEffect, useRef } from 'react';
import { Zap, Sun, Award } from 'lucide-react';
import liater3dEmblem from '../assets/liater_3d_emblem.jpg';

export default function LiaterHeroAnimation() {
  const canvasRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Canvas 3D de Partículas de Alta Tensión y Descargas Eléctricas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const width = 540;
    const height = 520;
    canvas.width = width * window.devicePixelRatio || width;
    canvas.height = height * window.devicePixelRatio || height;
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    // Partículas orbitales de energía
    const numParticles = 40;
    const particles = Array.from({ length: numParticles }, (_, i) => ({
      angle: (i / numParticles) * Math.PI * 2,
      radius: 200 + (Math.random() - 0.5) * 45,
      speed: 0.008 + Math.random() * 0.012,
      size: Math.random() * 2.5 + 1.5,
      color: i % 3 === 0 ? '#38BDF8' : '#FCA311'
    }));

    let time = 0;
    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Rayos eléctricos aleatorios que cruzan la composición
      if (Math.sin(time * 6) > 0.88) {
        ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(56, 189, 248, 0.7)' : 'rgba(252, 163, 17, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let curX = centerX - 180 + (Math.random() - 0.5) * 40;
        let curY = centerY + (Math.random() - 0.5) * 60;
        ctx.moveTo(curX, curY);

        for (let s = 0; s < 4; s++) {
          curX += 45 + Math.random() * 20;
          curY += (Math.random() - 0.5) * 40;
          ctx.lineTo(curX, curY);
        }
        ctx.stroke();
      }

      // 2. Partículas orbitales
      particles.forEach((p) => {
        p.angle += p.speed;
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * (p.radius * 0.65); // Elipse 3D

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Parallax interactivo 3D suave al mover el ratón
  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 26;
      const y = (e.clientY / innerHeight - 0.5) * 26;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="liater-3d-emblem-container"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '540px',
        height: '520px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1400px',
        userSelect: 'none'
      }}
    >
      {/* 1. Resplandor Ambiental Dorado y Azul de Fondo */}
      <div style={{
        position: 'absolute',
        width: '380px',
        height: '380px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252, 163, 17, 0.32) 0%, rgba(56, 189, 248, 0.18) 45%, transparent 70%)',
        filter: 'blur(40px)',
        animation: 'pulseGlow3D 5s ease-in-out infinite alternate',
        pointerEvents: 'none'
      }} />

      {/* 2. Canvas de Chispas y Partículas Eléctricas */}
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      />

      {/* 3. Anillos Giroscópicos 3D en Perspectiva */}
      <div 
        style={{
          position: 'absolute',
          width: '440px',
          height: '440px',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${62 + mousePos.y * 0.4}deg) rotateY(${18 + mousePos.x * 0.4}deg)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          pointerEvents: 'none',
          zIndex: 3
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px solid rgba(252, 163, 17, 0.55)',
          boxShadow: '0 0 20px rgba(252, 163, 17, 0.4), inset 0 0 20px rgba(252, 163, 17, 0.2)',
          animation: 'spin3DOrbit 20s linear infinite'
        }} />

        <div style={{
          position: 'absolute',
          inset: '30px',
          borderRadius: '50%',
          border: '1.5px dashed rgba(56, 189, 248, 0.5)',
          animation: 'spin3DOrbitReverse 26s linear infinite'
        }} />
      </div>

      {/* 4. MEDALLÓN EMBLEMA 3D LIATER (Torre Alta Tensión + Onda + Panel Solar) */}
      <div 
        style={{
          position: 'relative',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          padding: '8px',
          background: 'linear-gradient(145deg, rgba(252, 163, 17, 0.8) 0%, rgba(20, 33, 61, 0.9) 60%, rgba(56, 189, 248, 0.8) 100%)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65), 0 0 50px rgba(252, 163, 17, 0.40), inset 0 0 30px rgba(20, 33, 61, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5,
          transform: `rotateX(${-mousePos.y * 0.5}deg) rotateY(${mousePos.x * 0.5}deg) translateZ(40px)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          animation: 'floatingEmblem3D 6s ease-in-out infinite'
        }}
      >
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid rgba(255, 255, 255, 0.35)',
          boxShadow: 'inset 0 0 25px rgba(0,0,0,0.8)'
        }}>
          <img 
            src={liater3dEmblem} 
            alt="Laboratorio LIATER - Alta Tensión y Energías Renovables" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transform: 'scale(1.04)',
              transition: 'transform 0.3s ease'
            }} 
          />

          {/* Reflejo de Luz 3D Holográfico */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 45%, rgba(0,0,0,0.4) 100%)',
            pointerEvents: 'none'
          }} />
        </div>
      </div>

      {/* 5. TARJETAS FLOTANTES 3D HUD (Tipografía 100% Blanca y Clara) */}
      
      {/* Badge 1: Alta Tensión & Redes (Arriba a la Derecha) */}
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          right: '-10px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(252, 163, 17, 0.55)',
          borderRadius: '14px',
          padding: '0.75rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5), 0 0 15px rgba(252, 163, 17, 0.2)',
          zIndex: 7,
          transform: `translate3d(${mousePos.x * -0.9}px, ${mousePos.y * -0.9}px, 70px)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          animation: 'floatingBadge1 5s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(252, 163, 17, 0.3) 0%, rgba(252, 163, 17, 0.1) 100%)',
          border: '1px solid rgba(252, 163, 17, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FCA311'
        }}>
          <Zap size={20} />
        </div>
        <div>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
            Alta Tensión
          </div>
          <div style={{ fontSize: '0.72rem', color: '#E2E8F0', fontWeight: 500, marginTop: '2px' }}>
            Torres & Redes Eléctricas
          </div>
        </div>
      </div>

      {/* Badge 2: Energías Renovables & Solar (Abajo a la Izquierda) */}
      <div 
        style={{
          position: 'absolute',
          bottom: '25px',
          left: '-15px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(56, 189, 248, 0.55)',
          borderRadius: '14px',
          padding: '0.75rem 1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.2)',
          zIndex: 7,
          transform: `translate3d(${mousePos.x * 0.9}px, ${mousePos.y * 0.9}px, 75px)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          animation: 'floatingBadge2 6s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.3) 0%, rgba(56, 189, 248, 0.1) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#38BDF8'
        }}>
          <Sun size={20} />
        </div>
        <div>
          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
            Energías Renovables
          </div>
          <div style={{ fontSize: '0.72rem', color: '#E2E8F0', fontWeight: 500, marginTop: '2px' }}>
            Paneles Solares & Fotometría
          </div>
        </div>
      </div>

      {/* Badge 3: Certificación y Universidad Nacional */}
      <div 
        style={{
          position: 'absolute',
          bottom: '50px',
          right: '5px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(34, 197, 94, 0.5)',
          borderRadius: '14px',
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          boxShadow: '0 14px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(34, 197, 94, 0.2)',
          zIndex: 7,
          transform: `translate3d(${mousePos.x * -0.6}px, ${mousePos.y * -0.6}px, 60px)`,
          transition: 'transform 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
          animation: 'floatingBadge3 7s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(34, 197, 94, 0.1) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.5)',
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
        @keyframes pulseGlow3D {
          0% { transform: scale(0.85); opacity: 0.55; }
          100% { transform: scale(1.2); opacity: 0.9; }
        }
        @keyframes floatingEmblem3D {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-12px) scale(1.02); }
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
