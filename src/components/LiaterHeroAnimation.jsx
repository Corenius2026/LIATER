import { useState, useEffect, useRef } from 'react';

export default function LiaterHeroAnimation() {
  const containerRef = useRef(null);
  const rafRef       = useRef(null);
  const mouseRef     = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const [renderMouse, setRenderMouse] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(null);

  // ─── Lerp suavizado en RAF (no re-render en cada frame, solo actualiza ref) ──
  useEffect(() => {
    const lerp = (a, b, n) => a + (b - a) * n;
    const loop = () => {
      const m = mouseRef.current;
      m.x = lerp(m.x, m.tx, 0.07);
      m.y = lerp(m.y, m.ty, 0.07);
      setRenderMouse({ x: m.x, y: m.y });
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    mouseRef.current.tx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    mouseRef.current.ty = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
  };
  const handleMouseLeave = () => {
    mouseRef.current.tx = 0;
    mouseRef.current.ty = 0;
    setHovered(null);
  };

  const mx = renderMouse.x;
  const my = renderMouse.y;
  const rotX = -my * 14;
  const rotY =  mx * 18;

  // ─── Helper: estilo base de tarjeta glassmorphism ─────────────────────────
  const card = (active, accent = '#FCA311') => ({
    position: 'absolute',
    inset: 0,
    borderRadius: '20px',
    background: active
      ? `linear-gradient(145deg, rgba(255,255,255,0.10) 0%, rgba(20,33,61,0.65) 100%)`
      : `linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(20,33,61,0.45) 100%)`,
    border: `1px solid ${active ? accent : accent + '55'}`,
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: active
      ? `0 0 0 1px ${accent}33, 0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)`
      : `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`,
    transition: 'all 0.35s cubic-bezier(0.23,1,0.32,1)',
  });

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        height: '480px',
        perspective: '1100px',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* ── Luces de fondo tipo aurora ───────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: '24px',
      }}>
        {/* Halo dorado izquierdo */}
        <div style={{
          position: 'absolute', left: '5%', top: '30%',
          width: '220px', height: '220px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(252,163,17,0.22) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transform: `translate(${mx * -18}px, ${my * -12}px)`,
          transition: 'transform 0.4s ease-out',
        }} />
        {/* Halo cian derecho */}
        <div style={{
          position: 'absolute', right: '5%', top: '25%',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.20) 0%, transparent 70%)',
          filter: 'blur(40px)',
          transform: `translate(${mx * 18}px, ${my * -12}px)`,
          transition: 'transform 0.4s ease-out',
        }} />
        {/* Núcleo central dorado */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: '260px', height: '260px', borderRadius: '50%',
          marginLeft: '-130px', marginTop: '-130px',
          background: 'radial-gradient(circle, rgba(252,163,17,0.13) 0%, rgba(56,189,248,0.06) 50%, transparent 70%)',
          filter: 'blur(30px)',
          transform: `translate(${mx * 10}px, ${my * 10}px)`,
          transition: 'transform 0.4s ease-out',
        }} />
      </div>

      {/* ── Escenario 3D ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        transition: 'transform 0.08s linear',
      }}>

        {/* ── Anillos orbitales de fondo ──────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: '40px',
          transformStyle: 'preserve-3d',
          transform: 'translateZ(-60px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {[
            { size: 360, color: 'rgba(252,163,17,0.18)', dash: '8 6',  dur: '28s', dir: 'normal'  },
            { size: 270, color: 'rgba(56,189,248,0.14)',  dash: '4 8',  dur: '20s', dir: 'reverse' },
            { size: 180, color: 'rgba(252,163,17,0.10)', dash: '2 10', dur: '14s', dir: 'normal'  },
          ].map((ring, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: ring.size, height: ring.size,
              borderRadius: '50%',
              border: `1px dashed ${ring.color}`,
              animation: `spin${i} ${ring.dur} linear infinite`,
              animationDirection: ring.dir,
            }} />
          ))}

          {/* Líneas de flujo energético entre elementos */}
          <svg viewBox="0 0 500 60" style={{ position: 'absolute', width: '90%', height: '60px', overflow: 'visible' }}>
            <defs>
              <linearGradient id="flowL" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#FCA311" stopOpacity="0" />
                <stop offset="40%"  stopColor="#FCA311" stopOpacity="0.9" />
                <stop offset="60%"  stopColor="#38BDF8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M 50 30 Q 250 10 450 30" stroke="url(#flowL)" strokeWidth="1.5" fill="none"
              strokeDasharray="8 6" style={{ animation: 'dashFlow 2.5s linear infinite' }} />
            <path d="M 50 30 Q 250 50 450 30" stroke="url(#flowL)" strokeWidth="1.5" fill="none"
              strokeDasharray="8 6" style={{ animation: 'dashFlow 3s linear infinite reverse' }} />
          </svg>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/*  TARJETA IZQUIERDA — TORRE DE ALTA TENSIÓN    */}
        {/* ══════════════════════════════════════════════ */}
        <div
          onMouseEnter={() => setHovered('tower')}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: 'absolute', left: '18px', top: '50%',
            width: '148px', height: '230px',
            marginTop: '-115px',
            transformStyle: 'preserve-3d',
            transform: `translateZ(${hovered === 'tower' ? 90 : 48}px) translate(${mx * -22}px, ${my * -14}px) scale(${hovered === 'tower' ? 1.07 : 1})`,
            transition: 'transform 0.38s cubic-bezier(0.23,1,0.32,1)',
            animation: 'floatA 5.5s ease-in-out infinite',
          }}
        >
          <div style={card(hovered === 'tower', '#FCA311')} />

          {/* Partícula superior decorativa */}
          <div style={{
            position: 'absolute', top: '10px', right: '12px',
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#38BDF8',
            boxShadow: '0 0 12px #38BDF8',
            animation: 'particlePulse 2s ease-in-out infinite',
          }} />

          {/* Torre SVG */}
          <svg viewBox="0 0 100 170" style={{ width: '100%', height: '82%', padding: '14px 10px 4px', position: 'relative', zIndex: 2 }}>
            <defs>
              <linearGradient id="goldTower" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%"   stopColor="#FFD166" />
                <stop offset="60%"  stopColor="#FCA311" />
                <stop offset="100%" stopColor="#B86000" />
              </linearGradient>
              <filter id="tGlow">
                <feGaussianBlur stdDeviation="1.5" result="b" />
                <feComposite in="SourceGraphic" in2="b" operator="over" />
              </filter>
            </defs>
            {/* Patas */}
            <path d="M50 8 L16 158 M50 8 L84 158" stroke="url(#goldTower)" strokeWidth="3.5" strokeLinecap="round" filter="url(#tGlow)" />
            {/* Crucetas */}
            {[[12, 42, 88, 42],[18, 70, 82, 70],[24, 100, 76, 100],[30, 130, 70, 130]].map(([x1,y1,x2,y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#E2E8F0" strokeWidth={i === 0 ? 3 : 2} strokeLinecap="round" />
            ))}
            {/* Celosías en X */}
            {[
              [18,42,82,70, 82,42,18,70],
              [22,70,78,100,78,70,22,100],
              [26,100,74,130,74,100,26,130],
            ].map(([x1,y1,x2,y2,x3,y3,x4,y4], i) => (
              <g key={i}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#goldTower)" strokeWidth="1.8" strokeOpacity="0.7" />
                <line x1={x3} y1={y3} x2={x4} y2={y4} stroke="url(#goldTower)" strokeWidth="1.8" strokeOpacity="0.7" />
              </g>
            ))}
            {/* Aisladores eléctricos */}
            <circle cx="12" cy="42" r="5" fill="#38BDF8" style={{ animation: 'sparkFlash 2.2s ease-in-out infinite' }} />
            <circle cx="88" cy="42" r="5" fill="#38BDF8" style={{ animation: 'sparkFlash 2.2s ease-in-out infinite 0.6s' }} />
            <circle cx="50" cy="8"  r="5.5" fill="#FCA311" style={{ animation: 'sparkFlash 1.6s ease-in-out infinite' }} />
          </svg>

          {/* Label */}
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(252,163,17,0.15)',
            border: '1px solid rgba(252,163,17,0.6)',
            borderRadius: '20px', padding: '4px 10px',
            fontSize: '0.65rem', fontWeight: 700, color: '#FFFFFF',
            whiteSpace: 'nowrap', zIndex: 4,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 12px rgba(252,163,17,0.3)',
            letterSpacing: '0.04em',
          }}>
            ⚡ Alta Tensión
          </div>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/*  TARJETA CENTRAL — LIATER                     */}
        {/* ══════════════════════════════════════════════ */}
        <div
          onMouseEnter={() => setHovered('core')}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: 'absolute', left: '50%', top: '50%',
            width: '162px', height: '200px',
            marginLeft: '-81px', marginTop: '-100px',
            transformStyle: 'preserve-3d',
            transform: `translateZ(${hovered === 'core' ? 130 : 85}px) translate(${mx * 28}px, ${my * 18}px) scale(${hovered === 'core' ? 1.1 : 1})`,
            transition: 'transform 0.38s cubic-bezier(0.23,1,0.32,1)',
            animation: 'floatB 4.8s ease-in-out infinite',
            zIndex: 8,
          }}
        >
          {/* Halo de energía detrás */}
          <div style={{
            position: 'absolute', inset: '-24px', borderRadius: '50%',
            background: `radial-gradient(circle, rgba(252,163,17,${hovered === 'core' ? 0.35 : 0.2}) 0%, transparent 65%)`,
            filter: 'blur(20px)',
            transition: 'all 0.4s ease',
            pointerEvents: 'none',
          }} />

          {/* Card glassmorphism central */}
          <div style={{
            ...card(hovered === 'core', '#FCA311'),
            background: 'linear-gradient(145deg, rgba(252,163,17,0.12) 0%, rgba(20,33,61,0.80) 100%)',
            boxShadow: `0 0 0 1px #FCA31155, 0 12px 50px rgba(0,0,0,0.6), 0 0 80px rgba(252,163,17,${hovered === 'core' ? 0.25 : 0.12}), inset 0 1px 0 rgba(255,255,255,0.14)`,
          }} />

          {/* Anillo exterior animado */}
          <div style={{
            position: 'absolute', inset: '-6px', borderRadius: '26px',
            border: `1.5px solid rgba(252,163,17,${hovered === 'core' ? 0.7 : 0.3})`,
            animation: 'ringPulse 3s ease-in-out infinite',
            transition: 'border-color 0.3s ease',
            pointerEvents: 'none',
          }} />

          {/* SVG Rayo central */}
          <div style={{
            position: 'relative', zIndex: 3,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '75%', paddingTop: '10px',
          }}>
            {/* Círculo de energía */}
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(252,163,17,0.30) 0%, rgba(20,33,61,0.70) 65%)',
              border: '2px solid #FCA311',
              boxShadow: '0 0 30px rgba(252,163,17,0.55), inset 0 0 18px rgba(56,189,248,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'coreFloat 4s ease-in-out infinite',
              marginBottom: '12px',
            }}>
              <svg viewBox="0 0 60 80" style={{ width: '44px', height: '58px' }}>
                <defs>
                  <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#FFE066" />
                    <stop offset="50%"  stopColor="#FCA311" />
                    <stop offset="100%" stopColor="#FF6B00" />
                  </linearGradient>
                  <filter id="boltGlow">
                    <feGaussianBlur stdDeviation="2.5" result="b" />
                    <feComposite in="SourceGraphic" in2="b" operator="over" />
                  </filter>
                </defs>
                <path d="M36 4 L14 38 H30 L22 76 L48 34 H32 Z"
                  fill="url(#boltGrad)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"
                  filter="url(#boltGlow)"
                  style={{ animation: 'boltFlash 2s ease-in-out infinite alternate' }}
                />
              </svg>
            </div>

            {/* Badge LIATER */}
            <div style={{
              background: 'rgba(20,33,61,0.92)',
              border: '1.5px solid #FCA311',
              borderRadius: '20px',
              padding: '5px 14px',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 18px rgba(252,163,17,0.35)',
            }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 10px #22C55E', flexShrink: 0 }} />
              <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.10em' }}>LIATER</span>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/*  TARJETA DERECHA — PANEL SOLAR                */}
        {/* ══════════════════════════════════════════════ */}
        <div
          onMouseEnter={() => setHovered('solar')}
          onMouseLeave={() => setHovered(null)}
          style={{
            position: 'absolute', right: '18px', top: '50%',
            width: '148px', height: '220px',
            marginTop: '-110px',
            transformStyle: 'preserve-3d',
            transform: `translateZ(${hovered === 'solar' ? 90 : 48}px) translate(${mx * 22}px, ${my * -14}px) scale(${hovered === 'solar' ? 1.07 : 1})`,
            transition: 'transform 0.38s cubic-bezier(0.23,1,0.32,1)',
            animation: 'floatC 6.2s ease-in-out infinite',
          }}
        >
          <div style={card(hovered === 'solar', '#38BDF8')} />

          {/* Partículas decorativas */}
          {[{t:'12px', r:'14px', c:'#FCA311', d:'0s'}, {t:'28px', r:'8px', c:'#38BDF8', d:'1.1s'}].map((p, i) => (
            <div key={i} style={{
              position: 'absolute', top: p.t, right: p.r,
              width: '7px', height: '7px', borderRadius: '50%',
              background: p.c, boxShadow: `0 0 10px ${p.c}`,
              animation: `particlePulse 2.4s ease-in-out infinite ${p.d}`,
            }} />
          ))}

          {/* Panel Solar SVG */}
          <svg viewBox="0 0 120 140" style={{ width: '100%', height: '80%', padding: '12px 8px 6px', position: 'relative', zIndex: 2 }}>
            <defs>
              <linearGradient id="solarBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#1E3A8A" />
                <stop offset="45%"  stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
              <linearGradient id="solarReflect" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"  stopColor="rgba(255,255,255,0.25)" />
                <stop offset="60%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            {/* Soporte */}
            <line x1="60" y1="98" x2="60" y2="130" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
            <line x1="38" y1="130" x2="82" y2="130" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />

            {/* Panel inclinado 3D */}
            <polygon points="14,38 88,16 108,84 34,106" fill="url(#solarBlue)" stroke="#E2E8F0" strokeWidth="2.5" style={{ filter: 'drop-shadow(0 6px 16px rgba(56,189,248,0.4))' }} />
            {/* Reflejo especular */}
            <polygon points="14,38 88,16 108,84 34,106" fill="url(#solarReflect)" />

            {/* Grilla de celdas */}
            {/* verticales */}
            {[[38,30,58,100],[62,23,82,93]].map(([x1,y1,x2,y2], i) => (
              <line key={`v${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
            ))}
            {/* horizontales */}
            {[[20,58,96,36],[27,80,103,58],[34,102,108,82]].map(([x1,y1,x2,y2], i) => (
              <line key={`h${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.55)" strokeWidth="1.2" />
            ))}

            {/* Fotones */}
            <circle cx="24" cy="18" r="4"  fill="#FCA311" style={{ animation: 'sparkFlash 2.8s ease-in-out infinite 0.3s' }} />
            <circle cx="96" cy="12" r="4.5" fill="#FFD166" style={{ animation: 'sparkFlash 2.1s ease-in-out infinite 0.9s' }} />
          </svg>

          {/* Label */}
          <div style={{
            position: 'absolute', bottom: '12px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(56,189,248,0.15)',
            border: '1px solid rgba(56,189,248,0.6)',
            borderRadius: '20px', padding: '4px 10px',
            fontSize: '0.65rem', fontWeight: 700, color: '#FFFFFF',
            whiteSpace: 'nowrap', zIndex: 4,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 12px rgba(56,189,248,0.3)',
            letterSpacing: '0.04em',
          }}>
            ☀️ Energía Solar
          </div>
        </div>

      </div>

      {/* ── Keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes floatA {
          0%,100% { transform: translateZ(48px) translateY(0px); }
          50%      { transform: translateZ(48px) translateY(-12px); }
        }
        @keyframes floatB {
          0%,100% { transform: translateZ(85px) translateY(-6px); }
          50%      { transform: translateZ(85px) translateY(6px); }
        }
        @keyframes floatC {
          0%,100% { transform: translateZ(48px) translateY(-4px); }
          50%      { transform: translateZ(48px) translateY(10px); }
        }
        @keyframes coreFloat {
          0%,100% { transform: scale(1);    box-shadow: 0 0 30px rgba(252,163,17,0.55), inset 0 0 18px rgba(56,189,248,0.3); }
          50%      { transform: scale(1.05); box-shadow: 0 0 48px rgba(252,163,17,0.80), inset 0 0 26px rgba(56,189,248,0.5); }
        }
        @keyframes boltFlash {
          0%   { opacity: 0.85; filter: drop-shadow(0 0 4px #FCA311); }
          100% { opacity: 1;    filter: drop-shadow(0 0 14px #38BDF8); }
        }
        @keyframes sparkFlash {
          0%,100% { opacity: 0.35; transform: scale(0.75); }
          50%      { opacity: 1;    transform: scale(1.35); }
        }
        @keyframes particlePulse {
          0%,100% { opacity: 0.4; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes ringPulse {
          0%,100% { opacity: 0.5; transform: scale(1);    }
          50%      { opacity: 1;   transform: scale(1.03); }
        }
        @keyframes dashFlow {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -28; }
        }
        @keyframes spin0 { to { transform: rotate(360deg); } }
        @keyframes spin1 { to { transform: rotate(-360deg); } }
        @keyframes spin2 { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
