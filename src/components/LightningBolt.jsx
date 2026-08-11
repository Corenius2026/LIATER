import { useEffect, useRef } from 'react';

// ─── PRNG determinista: misma semilla → mismo rayo durante toda la descarga ──
function mulberry32(seed) {
  let s = Math.floor(seed * 2 ** 32) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Algoritmo Midpoint Displacement para un segmento de rayo ────────────────
function segment(pts, x1, y1, x2, y2, spread, rng) {
  if (Math.abs(x2 - x1) < 3) {
    pts.push([x2, y2]);
    return;
  }
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 + (rng() - 0.5) * spread;
  segment(pts, x1, y1, mx, my, spread * 0.58, rng);
  segment(pts, mx, my, x2, y2, spread * 0.58, rng);
}

// ─── Dibuja un trazo de rayo (núcleo + glow exterior) ───────────────────────
function strokePath(ctx, pts, alpha, coreW, glowW, glowColor) {
  if (pts.length < 2) return;

  // Glow exterior suave
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = glowColor.replace('{{a}}', String(alpha * 0.55));
  ctx.lineWidth   = glowW;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();

  // Núcleo blanco nítido
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = `rgba(255, 255, 230, ${alpha})`;
  ctx.lineWidth   = coreW;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();
}

// ─── Construye la escena completa de rayos usando la misma semilla ───────────
function drawScene(ctx, W, H, rng, alpha) {
  ctx.clearRect(0, 0, W, H);

  const cy = H / 2;

  // ── Rayo principal ──────────────────────────────────────────────────────
  const mainPts = [[W * 0.02, cy]];
  segment(mainPts, W * 0.02, cy, W * 0.96, cy, H * 0.52, rng);
  mainPts.push([W * 0.97, cy]);

  strokePath(ctx, mainPts, alpha, 1.5, 7, 'rgba(255, 120, 0, {{a}})');

  // ── Ramificaciones secundarias desde puntos intermedios ─────────────────
  //    Tomamos entre 3 y 5 puntos del tronco y lanzamos ramas
  const branchCount = 3 + Math.floor(rng() * 3); // 3..5
  const step = Math.floor(mainPts.length / (branchCount + 1));

  for (let b = 0; b < branchCount; b++) {
    const idx = step * (b + 1);
    if (idx >= mainPts.length) break;

    const [bx, by] = mainPts[idx];

    // Dirección: algunas suben, otras bajan
    const goUp  = rng() > 0.45;
    const len   = W * (0.08 + rng() * 0.16);
    const ex    = bx + len * (0.55 + rng() * 0.55);
    const ey    = by + (goUp ? -1 : 1) * (H * (0.18 + rng() * 0.28));

    const brPts = [[bx, by]];
    segment(brPts, bx, by, ex, ey, H * 0.22, rng);
    brPts.push([ex, ey]);

    const brAlpha = alpha * (0.55 + rng() * 0.35);
    strokePath(ctx, brPts, brAlpha, 0.8, 4, 'rgba(255, 110, 0, {{a}})');

    // Sub-rama desde la rama
    if (rng() > 0.5) {
      const si   = Math.floor(brPts.length * (0.4 + rng() * 0.3));
      const [sx, sy] = brPts[si] || [ex, ey];
      const sx2  = sx + W * (0.03 + rng() * 0.07);
      const sy2  = sy + (rng() - 0.5) * H * 0.35;
      const sPts = [[sx, sy]];
      segment(sPts, sx, sy, sx2, sy2, H * 0.12, rng);
      sPts.push([sx2, sy2]);
      strokePath(ctx, sPts, alpha * 0.4, 0.5, 2.5, 'rgba(255, 90, 0, {{a}})');
    }
  }
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function LightningBolt({ width = 380, height = 60 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animId;
    let timeoutId;

    // Estado de la animación
    let phase  = 'idle'; // 'idle' | 'in' | 'hold' | 'out'
    let alpha  = 0;
    let rng    = null;
    let holdFrames = 0;

    // Número de parpadeos rápidos en un flash
    let flickerCount = 0;

    const scheduleNext = () => {
      const delay = 1000 + Math.random() * 2500;
      timeoutId = setTimeout(() => {
        rng          = mulberry32(Math.random());
        flickerCount = 2 + Math.floor(Math.random() * 2); // 2..3 parpadeos
        phase        = 'flicker';
        alpha        = 1;
      }, delay);
    };

    let flickerPhase = 'on'; // 'on' | 'off' | 'in' | 'hold' | 'out'
    let flickerTimer = 0;

    const FLICKER_ON  = 3;   // frames encendido en cada parpadeo
    const FLICKER_OFF = 2;   // frames apagado entre parpadeos
    const HOLD_FRAMES = 8;   // frames de estabilidad tras parpadeos
    const FADE_SPEED  = 0.07;

    const render = () => {
      const W = canvas.width;
      const H = canvas.height;

      if (phase === 'idle') {
        ctx.clearRect(0, 0, W, H);
      } else if (phase === 'flicker') {
        flickerTimer++;

        if (flickerPhase === 'on') {
          drawScene(ctx, W, H, mulberry32(rng()), 1.0);
          if (flickerTimer >= FLICKER_ON) {
            flickerTimer = 0;
            flickerPhase = 'off';
          }
        } else if (flickerPhase === 'off') {
          ctx.clearRect(0, 0, W, H);
          if (flickerTimer >= FLICKER_OFF) {
            flickerTimer = 0;
            flickerCount--;
            if (flickerCount <= 0) {
              // Tras los parpadeos, mostrar rayo estable
              rng          = mulberry32(Math.random());
              phase        = 'hold';
              holdFrames   = HOLD_FRAMES;
              flickerPhase = 'on'; // reset para próxima vez
              alpha        = 1;
            } else {
              flickerPhase = 'on';
            }
          }
        }
      } else if (phase === 'hold') {
        drawScene(ctx, W, H, mulberry32(rng()), alpha);
        holdFrames--;
        if (holdFrames <= 0) phase = 'out';
      } else if (phase === 'out') {
        alpha -= FADE_SPEED;
        if (alpha <= 0) {
          alpha  = 0;
          phase  = 'idle';
          ctx.clearRect(0, 0, W, H);
          scheduleNext();
        } else {
          drawScene(ctx, W, H, mulberry32(rng()), alpha);
        }
      }

      animId = requestAnimationFrame(render);
    };

    scheduleNext();
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timeoutId);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        display: 'block',
        pointerEvents: 'none',
        marginTop: '2px',
      }}
    />
  );
}
