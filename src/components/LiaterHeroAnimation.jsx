import { useState, useEffect } from 'react';
import { Zap, Sun, Award, Activity, Cpu, Sparkles } from 'lucide-react';
import liaterLogo from '../assets/liater-logo.png';

export default function LiaterHeroAnimation() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 20;
      const y = (e.clientY / innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      className="liater-animation-container"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '520px',
        height: '480px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1000px',
        userSelect: 'none'
      }}
    >
      {/* Resplandor Ambiental de Fondo (Glow) */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252, 163, 17, 0.28) 0%, rgba(20, 33, 61, 0.15) 50%, transparent 70%)',
        filter: 'blur(30px)',
        animation: 'pulseGlow 4s ease-in-out infinite alternate',
        pointerEvents: 'none'
      }} />

      {/* SVG de Circuitos de Alta Tensión y Anillos Orbitales */}
      <svg 
        viewBox="0 0 500 500" 
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          overflow: 'visible',
          transform: `rotateX(${mousePos.y * 0.5}deg) rotateY(${mousePos.x * 0.5}deg)`,
          transition: 'transform 0.15s ease-out'
        }}
      >
        <defs>
          <linearGradient id="goldEnergyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FCA311" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#FFD166" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#14213D" stopOpacity="0.2" />
          </linearGradient>

          <linearGradient id="cyanArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FCA311" stopOpacity="0.9" />
          </linearGradient>

          <filter id="energyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Anillo Exterior 1 - Órbita Discontinua de Energía */}
        <circle 
          cx="250" cy="250" r="210" 
          fill="none" 
          stroke="rgba(252, 163, 17, 0.25)" 
          strokeWidth="1.5" 
          strokeDasharray="12 18"
          style={{ animation: 'spinClockwise 35s linear infinite', transformOrigin: '250px 250px' }}
        />

        {/* Anillo Exterior 2 - Nodos de Medición y Potencia */}
        <circle 
          cx="250" cy="250" r="175" 
          fill="none" 
          stroke="rgba(255, 255, 255, 0.12)" 
          strokeWidth="2" 
          strokeDasharray="6 24"
          style={{ animation: 'spinCounterClockwise 25s linear infinite', transformOrigin: '250px 250px' }}
        />

        {/* Rayos / Trazos de Flujo Eléctrico Conectados */}
        <path 
          d="M 250 50 L 250 130 M 450 250 L 370 250 M 250 450 L 250 370 M 50 250 L 130 250" 
          stroke="rgba(252, 163, 17, 0.35)" 
          strokeWidth="2" 
          strokeDasharray="4 8"
        />

        <path 
          d="M 110 110 L 170 170 M 390 110 L 330 170 M 390 390 L 330 330 M 110 390 L 170 330" 
          stroke="rgba(56, 189, 248, 0.3)" 
          strokeWidth="1.5" 
          strokeDasharray="6 6"
        />

        {/* Anillo de Inducción Magnética Interno */}
        <circle 
          cx="250" cy="250" r="135" 
          fill="none" 
          stroke="url(#goldEnergyGrad)" 
          strokeWidth="2.5" 
          filter="url(#energyGlow)"
          style={{ animation: 'spinClockwise 16s linear infinite', transformOrigin: '250px 250px' }}
        />

        {/* Partículas de Alta Tensión Orbitando */}
        <circle cx="250" cy="40" r="4.5" fill="#FCA311" filter="url(#energyGlow)">
          <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="8s" repeatCount="indefinite" />
        </circle>

        <circle cx="250" cy="75" r="3.5" fill="#38BDF8" filter="url(#energyGlow)">
          <animateTransform attributeName="transform" type="rotate" from="360 250 250" to="0 250 250" dur="12s" repeatCount="indefinite" />
        </circle>

        <circle cx="250" cy="115" r="4" fill="#FCA311" filter="url(#energyGlow)">
          <animateTransform attributeName="transform" type="rotate" from="180 250 250" to="540 250 250" dur="6s" repeatCount="indefinite" />
        </circle>
      </svg>

      {/* --- NÚCLEO CENTRAL LIATER (Reactor Tecnológico) --- */}
      <div 
        style={{
          position: 'relative',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'linear-gradient(145deg, #1A2B4C 0%, #0F1A2E 100%)',
          border: '2px solid rgba(252, 163, 17, 0.6)',
          boxShadow: '0 0 35px rgba(252, 163, 17, 0.35), inset 0 0 25px rgba(20, 33, 61, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4,
          transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 30px)`,
          transition: 'transform 0.15s ease-out',
          animation: 'floatingCore 6s ease-in-out infinite'
        }}
      >
        <div style={{
          position: 'absolute',
          inset: '6px',
          borderRadius: '50%',
          border: '1px dashed rgba(252, 163, 17, 0.4)',
          animation: 'spinClockwise 20s linear infinite'
        }} />

        <img 
          src={liaterLogo} 
          alt="Laboratorio LIATER" 
          style={{ 
            height: '62px', 
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
            position: 'relative',
            zIndex: 2
          }} 
        />
        
        <div style={{
          marginTop: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          borderRadius: '12px',
          background: 'rgba(252, 163, 17, 0.15)',
          border: '1px solid rgba(252, 163, 17, 0.3)',
          zIndex: 2
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
          <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#FCA311', letterSpacing: '0.08em' }}>
            LAB ACTIVO
          </span>
        </div>
      </div>

      {/* --- TARJETAS FLOTANTES INTERACTIVAS (Glassmorphic Badges) --- */}
      
      {/* Badge 1: Alta Tensión & Potencia (Arriba a la Derecha) */}
      <div 
        style={{
          position: 'absolute',
          top: '18px',
          right: '-10px',
          background: 'rgba(20, 33, 61, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(252, 163, 17, 0.4)',
          borderRadius: '12px',
          padding: '0.65rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
          zIndex: 5,
          transform: `translate3d(${mousePos.x * -0.7}px, ${mousePos.y * -0.7}px, 40px)`,
          transition: 'transform 0.18s ease-out',
          animation: 'floatingBadge1 5s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(252, 163, 17, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FCA311'
        }}>
          <Zap size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>Alta Tensión</div>
          <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>Pruebas & Ensayos</div>
        </div>
      </div>

      {/* Badge 2: Energías Renovables & Fotometría (Abajo a la Izquierda) */}
      <div 
        style={{
          position: 'absolute',
          bottom: '28px',
          left: '-15px',
          background: 'rgba(20, 33, 61, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '12px',
          padding: '0.65rem 0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
          zIndex: 5,
          transform: `translate3d(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px, 45px)`,
          transition: 'transform 0.18s ease-out',
          animation: 'floatingBadge2 6s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: 'rgba(56, 189, 248, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#38BDF8'
        }}>
          <Sun size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>Energías Limpias</div>
          <div style={{ fontSize: '0.66rem', color: 'rgba(255, 255, 255, 0.65)', fontWeight: 500 }}>Solar & Iluminación</div>
        </div>
      </div>

      {/* Badge 3: Certificación y Universidad Nacional (Abajo a la Derecha) */}
      <div 
        style={{
          position: 'absolute',
          bottom: '50px',
          right: '5px',
          background: 'rgba(15, 26, 46, 0.90)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: '12px',
          padding: '0.55rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
          zIndex: 5,
          transform: `translate3d(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px, 35px)`,
          transition: 'transform 0.18s ease-out',
          animation: 'floatingBadge3 7s ease-in-out infinite alternate'
        }}
      >
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          background: 'rgba(34, 197, 94, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#22C55E'
        }}>
          <Award size={16} />
        </div>
        <div>
          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>Certificación UNAL</div>
          <div style={{ fontSize: '0.64rem', color: '#FCA311', fontWeight: 600 }}>100% Práctico</div>
        </div>
      </div>

      {/* Estilos de Animación CSS Inline */}
      <style>{`
        @keyframes spinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinCounterClockwise {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.15); opacity: 0.85; }
        }
        @keyframes floatingCore {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.02); }
        }
        @keyframes floatingBadge1 {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-10px); }
        }
        @keyframes floatingBadge2 {
          0% { transform: translateY(0px); }
          100% { transform: translateY(8px); }
        }
        @keyframes floatingBadge3 {
          0% { transform: translateY(0px); }
          100% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
