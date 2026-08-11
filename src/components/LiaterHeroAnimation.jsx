import { useState, useEffect, useRef } from 'react';

export default function LiaterHeroAnimation() {
  const containerRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [activeItem, setActiveItem] = useState(null); // 'tower' | 'lightning' | 'solar' | 'logo'

  // Suavizado cinético (Lerp) de la posición del cursor para animación 3D ultra fluida
  useEffect(() => {
    let animId;
    const lerp = (a, b, n) => (1 - n) * a + n * b;

    const loop = () => {
      setMouse((prev) => ({
        ...prev,
        x: lerp(prev.x, prev.targetX, 0.08),
        y: lerp(prev.y, prev.targetY, 0.08)
      }));
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(animId);
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left - rect.width / 2;
    const clientY = e.clientY - rect.top - rect.height / 2;

    // Normalizado de -1 a 1
    const targetX = clientX / (rect.width / 2);
    const targetY = clientY / (rect.height / 2);

    setMouse((prev) => ({ ...prev, targetX, targetY }));
  };

  const handleMouseLeave = () => {
    setMouse((prev) => ({ ...prev, targetX: 0, targetY: 0 }));
    setActiveItem(null);
  };

  // Rotaciones dinámicas 3D
  const rotX = -mouse.y * 18;
  const rotY = mouse.x * 22;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="liater-3d-interactive-scene"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '540px',
        height: '460px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        perspective: '1200px',
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      {/* Resplandor suave de fondo */}
      <div style={{
        position: 'absolute',
        width: '360px',
        height: '360px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252, 163, 17, 0.18) 0%, rgba(56, 189, 248, 0.08) 50%, transparent 70%)',
        filter: 'blur(45px)',
        pointerEvents: 'none',
        transform: `translate(${mouse.x * 20}px, ${mouse.y * 20}px)`,
        transition: 'transform 0.3s ease-out'
      }} />

      {/* --- ESCENARIO 3D PRINCIPAL --- */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transition: 'transform 0.1s ease-out'
        }}
      >

        {/* ========================================================= */}
        {/* CAPA 1: ÓRBITAS Y LÍNEAS DE FLUJO ENERGÉTICO (Fondo 3D)  */}
        {/* ========================================================= */}
        <div style={{
          position: 'absolute',
          inset: '20px',
          transformStyle: 'preserve-3d',
          transform: 'translateZ(-40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          {/* Anillo de Inducción */}
          <div style={{
            position: 'absolute',
            width: '380px',
            height: '380px',
            borderRadius: '50%',
            border: '1.5px dashed rgba(252, 163, 17, 0.3)',
            animation: 'spinClockwise 30s linear infinite'
          }} />

          {/* Anillo de Campo Magnético */}
          <div style={{
            position: 'absolute',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.15)',
            animation: 'spinCounter 22s linear infinite'
          }} />

          {/* Línea Eléctrica Conductora Horizontal que une Torre, Rayo y Panel */}
          <svg
            viewBox="0 0 500 100"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100px',
              overflow: 'visible'
            }}
          >
            <defs>
              <linearGradient id="fluxLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FCA311" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
                <stop offset="100%" stopColor="#FCA311" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {/* Cable de transmisión con pulso animado */}
            <path
              d="M 60 50 L 210 50 M 290 50 L 440 50"
              stroke="url(#fluxLineGrad)"
              strokeWidth="2"
              strokeDasharray="6 6"
              style={{ animation: 'dashMove 2s linear infinite' }}
            />
          </svg>
        </div>


        {/* ========================================================= */}
        {/* ELEMENTO 1: TORRE DE ALTA TENSIÓN 3D (Izquierda)         */}
        {/* ========================================================= */}
        <div
          onMouseEnter={() => setActiveItem('tower')}
          onMouseLeave={() => setActiveItem(null)}
          style={{
            position: 'absolute',
            left: '30px',
            top: '50%',
            marginTop: '-110px',
            width: '130px',
            height: '220px',
            transformStyle: 'preserve-3d',
            transform: `translateZ(${activeItem === 'tower' ? 85 : 45}px) translateX(${mouse.x * -18}px) translateY(${mouse.y * -18}px) scale(${activeItem === 'tower' ? 1.08 : 1})`,
            transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.5))'
          }}
        >
          {/* Tarjeta / Base Flotante Sutil */}
          <div style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '16px',
            background: activeItem === 'tower' ? 'rgba(20, 33, 61, 0.75)' : 'rgba(20, 33, 61, 0.45)',
            border: `1.5px solid ${activeItem === 'tower' ? '#FCA311' : 'rgba(252, 163, 17, 0.35)'}`,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease'
          }} />

          {/* Torre Vectorial 3D Minimalista */}
          <svg viewBox="0 0 100 160" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
            <defs>
              <linearGradient id="towerGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD166" />
                <stop offset="50%" stopColor="#FCA311" />
                <stop offset="100%" stopColor="#C77D00" />
              </linearGradient>
            </defs>

            {/* Estructura de Celosía de Alta Tensión */}
            {/* Patas principales */}
            <path d="M 50 15 L 20 150 M 50 15 L 80 150" stroke="url(#towerGold)" strokeWidth="3" strokeLinecap="round" />
            
            {/* Brazos transversales (Crucetas) */}
            <path d="M 15 45 L 85 45" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 22 75 L 78 75" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <path d="M 28 105 L 72 105" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            
            {/* Celosías en X */}
            <path d="M 22 45 L 78 75 M 78 45 L 22 75" stroke="url(#towerGold)" strokeWidth="1.5" />
            <path d="M 25 75 L 75 105 M 75 75 L 25 105" stroke="url(#towerGold)" strokeWidth="1.5" />
            <path d="M 28 105 L 72 145 M 72 105 L 28 145" stroke="url(#towerGold)" strokeWidth="1.5" />

            {/* Aisladores en los extremos con chispas */}
            <circle cx="15" cy="45" r="4" fill="#38BDF8" style={{ animation: 'sparkFlash 2s infinite' }} />
            <circle cx="85" cy="45" r="4" fill="#38BDF8" style={{ animation: 'sparkFlash 2s infinite 0.5s' }} />
            <circle cx="50" cy="15" r="4.5" fill="#FCA311" style={{ animation: 'sparkFlash 1.5s infinite' }} />
          </svg>

          {/* Etiqueta Flotante */}
          <div style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#14213D',
            border: '1px solid #FCA311',
            borderRadius: '10px',
            padding: '3px 8px',
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            zIndex: 3
          }}>
            ⚡ Alta Tensión
          </div>
        </div>


        {/* ========================================================= */}
        {/* ELEMENTO 2: RAYO / ONDA ELÉCTRICA DE POTENCIA 3D (Centro) */}
        {/* ========================================================= */}
        <div
          onMouseEnter={() => setActiveItem('lightning')}
          onMouseLeave={() => setActiveItem(null)}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            marginTop: '-95px',
            marginLeft: '-75px',
            width: '150px',
            height: '190px',
            transformStyle: 'preserve-3d',
            transform: `translateZ(${activeItem === 'lightning' ? 120 : 80}px) translateX(${mouse.x * 25}px) translateY(${mouse.y * 25}px) scale(${activeItem === 'lightning' ? 1.12 : 1})`,
            transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 6
          }}
        >
          {/* Núcleo Holográfico de Energía */}
          <div style={{
            position: 'absolute',
            width: '130px',
            height: '130px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(252, 163, 17, 0.35) 0%, rgba(20, 33, 61, 0.8) 65%)',
            border: '2px solid #FCA311',
            boxShadow: '0 0 35px rgba(252, 163, 17, 0.6), inset 0 0 20px rgba(56, 189, 248, 0.4)',
            animation: 'floatingCore 4s ease-in-out infinite'
          }} />

          {/* SVG de Rayo y Onda de Pulso */}
          <svg viewBox="0 0 100 100" style={{ width: '90px', height: '90px', position: 'relative', zIndex: 3 }}>
            <defs>
              <filter id="glowBolt" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Rayo Eléctrico 3D Centelleante */}
            <path
              d="M 54 10 L 32 46 L 50 46 L 42 90 L 68 48 L 50 48 Z"
              fill="#FCA311"
              stroke="#FFFFFF"
              strokeWidth="2"
              filter="url(#glowBolt)"
              style={{ animation: 'boltPulse 1.8s ease-in-out infinite alternate' }}
            />
          </svg>

          {/* Símbolo LIATER en Texto Claro */}
          <div style={{
            marginTop: '8px',
            padding: '3px 12px',
            borderRadius: '20px',
            background: 'rgba(20, 33, 61, 0.95)',
            border: '1.5px solid #FCA311',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '0.78rem',
            letterSpacing: '0.08em',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 4,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E' }} />
            LIATER
          </div>
        </div>


        {/* ========================================================= */}
        {/* ELEMENTO 3: PANEL SOLAR FOTOVOLTAICO 3D (Derecha)        */}
        {/* ========================================================= */}
        <div
          onMouseEnter={() => setActiveItem('solar')}
          onMouseLeave={() => setActiveItem(null)}
          style={{
            position: 'absolute',
            right: '30px',
            top: '50%',
            marginTop: '-100px',
            width: '140px',
            height: '200px',
            transformStyle: 'preserve-3d',
            transform: `translateZ(${activeItem === 'solar' ? 85 : 45}px) translateX(${mouse.x * 18}px) translateY(${mouse.y * 18}px) scale(${activeItem === 'solar' ? 1.08 : 1})`,
            transition: 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
            filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.5))'
          }}
        >
          {/* Base / Card Flotante */}
          <div style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '16px',
            background: activeItem === 'solar' ? 'rgba(20, 33, 61, 0.75)' : 'rgba(20, 33, 61, 0.45)',
            border: `1.5px solid ${activeItem === 'solar' ? '#38BDF8' : 'rgba(56, 189, 248, 0.35)'}`,
            backdropFilter: 'blur(8px)',
            transition: 'all 0.3s ease'
          }} />

          {/* Panel Solar Isométrico 3D en SVG */}
          <svg viewBox="0 0 120 140" style={{ width: '100%', height: '100%', position: 'relative', zIndex: 2 }}>
            <defs>
              <linearGradient id="solarGlass" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="50%" stopColor="#0284C7" />
                <stop offset="100%" stopColor="#0369A1" />
              </linearGradient>
            </defs>

            {/* Soporte / Poste de Montaje */}
            <path d="M 60 90 L 60 130 M 40 130 L 80 130" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />

            {/* Marco del Panel Inclinado en Perspectiva 3D */}
            <polygon
              points="15,40 85,20 105,80 35,100"
              fill="url(#solarGlass)"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              style={{ filter: 'drop-shadow(0 4px 10px rgba(56, 189, 248, 0.3))' }}
            />

            {/* Celdas Solares Cuadriculadas */}
            <line x1="38" y1="33" x2="58" y2="93" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
            <line x1="62" y1="27" x2="82" y2="87" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
            
            <line x1="22" y1="60" x2="92" y2="40" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
            <line x1="28" y1="80" x2="98" y2="60" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />

            {/* Fotones / Rayos Solares Flotando */}
            <circle cx="25" cy="20" r="3" fill="#FCA311" style={{ animation: 'sparkFlash 2.5s infinite' }} />
            <circle cx="95" cy="15" r="4" fill="#FCA311" style={{ animation: 'sparkFlash 2s infinite 0.7s' }} />
          </svg>

          {/* Etiqueta Flotante */}
          <div style={{
            position: 'absolute',
            bottom: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#14213D',
            border: '1px solid #38BDF8',
            borderRadius: '10px',
            padding: '3px 8px',
            fontSize: '0.68rem',
            fontWeight: 800,
            color: '#FFFFFF',
            whiteSpace: 'nowrap',
            zIndex: 3
          }}>
            ☀️ Energía Solar
          </div>
        </div>

      </div>

      {/* Estilos e interactividad CSS */}
      <style>{`
        @keyframes spinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spinCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes floatingCore {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-8px) scale(1.04); }
        }
        @keyframes boltPulse {
          0% { filter: drop-shadow(0 0 4px #FCA311); transform: scale(0.96); }
          100% { filter: drop-shadow(0 0 16px #38BDF8); transform: scale(1.05); }
        }
        @keyframes sparkFlash {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes dashMove {
          to { stroke-dashoffset: -24; }
        }
      `}</style>
    </div>
  );
}
