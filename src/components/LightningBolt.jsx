import { useEffect, useRef } from 'react';

/**
 * Genera un rayo eléctrico ramificado en canvas usando el algoritmo
 * de subdivisión recursiva de punto medio (Midpoint Displacement).
 */
function drawLightning(ctx, x1, y1, x2, y2, displacement, branchProb, depth, alpha) {
  if (depth <= 0 || displacement < 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    return;
  }

  const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * displacement;
  const my = (y1 + y2) / 2 + (Math.random() - 0.5) * displacement * 0.4;

  // Segmento principal con grosor y color naranja-dorado en el núcleo
  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0,   `rgba(255, 200, 60, ${alpha})`);
  gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
  gradient.addColorStop(1,   `rgba(255, 160, 20, ${alpha})`);

  // Línea exterior (glow naranja)
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(mx, my);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = `rgba(255, 140, 0, ${alpha * 0.55})`;
  ctx.lineWidth = depth * 1.5;
  ctx.stroke();

  // Línea interior (blanca nítida)
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(mx, my);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = Math.max(0.5, depth * 0.5);
  ctx.stroke();

  drawLightning(ctx, x1, y1, mx, my, displacement / 2, branchProb, depth - 1, alpha);
  drawLightning(ctx, mx, my, x2, y2, displacement / 2, branchProb, depth - 1, alpha);

  // Ramificaciones aleatorias
  if (Math.random() < branchProb && depth > 1) {
    const bx = mx + (Math.random() - 0.3) * 60;
    const by = my + (Math.random() * 18 - 9);
    drawLightning(ctx, mx, my, bx, by, displacement / 3, branchProb * 0.4, depth - 2, alpha * 0.55);
  }
}

export default function LightningBolt({ width = 340, height = 28 }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const stateRef  = useRef({
    phase: 'idle',   // 'idle' | 'flash' | 'decay'
    alpha: 0,
    timer: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let seed = Math.random(); // semilla para reproducir el mismo rayo durante el flash

    const scheduleNext = () => {
      // Espera entre 1.2 s y 3.5 s antes del próximo rayo
      const delay = 1200 + Math.random() * 2300;
      stateRef.current.timer = setTimeout(() => {
        seed = Math.random();
        stateRef.current.phase = 'flash';
        stateRef.current.alpha = 1;
      }, delay);
    };

    const render = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (s.phase === 'flash') {
        // Dibuja el rayo con la semilla fija (mismo trazo)
        const rng = mulberry32(seed);
        drawLightningSeeded(ctx, canvas, rng, s.alpha);

        // Parpadeo: alterna opacity rápido 2-3 veces
        s.alpha -= 0.08;
        if (s.alpha <= 0) {
          s.phase = 'idle';
          s.alpha  = 0;
          scheduleNext();
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    scheduleNext();
    animRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearTimeout(stateRef.current.timer);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', pointerEvents: 'none' }}
    />
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** PRNG determinista para que el mismo rayo dure varios frames. */
function mulberry32(seed) {
  let s = (seed * 2 ** 32) >>> 0;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** Dibuja el rayo usando una función rng seeded en lugar de Math.random */
function drawLightningSeeded(ctx, canvas, rng, alpha) {
  const W = canvas.width;
  const H = canvas.height;
  const cy = H / 2;

  // Puntos de inicio y fin con pequeña variación
  const startX = W * (0.02 + rng() * 0.05);
  const endX   = W * (0.88 + rng() * 0.10);
  const startY = cy + (rng() - 0.5) * 6;
  const endY   = cy + (rng() - 0.5) * 6;

  drawLightningSeededRec(ctx, startX, startY, endX, endY, H * 0.55, 0.45, 6, alpha, rng);
}

function drawLightningSeededRec(ctx, x1, y1, x2, y2, displacement, branchProb, depth, alpha, rng) {
  if (depth <= 0 || displacement < 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    return;
  }

  const mx = (x1 + x2) / 2 + (rng() - 0.5) * displacement;
  const my = (y1 + y2) / 2 + (rng() - 0.5) * displacement * 0.35;

  // Capa naranja-dorado (glow exterior)
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(mx, my);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = `rgba(255, 130, 0, ${alpha * 0.5})`;
  ctx.lineWidth   = depth * 1.6;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  // Capa blanca nítida (núcleo)
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(mx, my);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = `rgba(255, 255, 230, ${alpha})`;
  ctx.lineWidth   = Math.max(0.5, depth * 0.45);
  ctx.lineJoin    = 'round';
  ctx.stroke();

  drawLightningSeededRec(ctx, x1, y1, mx, my, displacement / 1.9, branchProb, depth - 1, alpha, rng);
  drawLightningSeededRec(ctx, mx, my, x2, y2, displacement / 1.9, branchProb, depth - 1, alpha, rng);

  // Ramificación aleatoria
  if (rng() < branchProb && depth > 2) {
    const angle = (rng() - 0.4) * Math.PI * 0.45;
    const len   = displacement * (0.4 + rng() * 0.4);
    const bx    = mx + Math.cos(angle) * len;
    const by    = my + Math.sin(angle) * len * 0.4;
    drawLightningSeededRec(ctx, mx, my, bx, by, displacement / 2.5, branchProb * 0.35, depth - 2, alpha * 0.6, rng);
  }
}
