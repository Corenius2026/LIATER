import { useEffect, useRef } from 'react';

// ─── PRNG determinista ────────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = Math.floor(seed * 2 ** 32) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Construye puntos de un segmento con desplazamiento de punto medio ────────
function buildSegment(x1, y1, x2, y2, spread, rng) {
  const pts = [[x1, y1]];
  function sub(ax, ay, bx, by, sp) {
    if (Math.abs(bx - ax) < 4) { pts.push([bx, by]); return; }
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2 + (rng() - 0.5) * sp;
    sub(ax, ay, mx, my, sp * 0.58);
    sub(mx, my, bx, by, sp * 0.58);
  }
  sub(x1, y1, x2, y2, spread);
  pts.push([x2, y2]);
  return pts;
}

// ─── Dibuja un trayecto (glow naranja + núcleo blanco) ────────────────────────
function strokePts(ctx, pts, alpha, coreW, glowW) {
  if (pts.length < 2) return;
  // glow exterior
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = `rgba(255, 120, 0, ${alpha * 0.5})`;
  ctx.lineWidth   = glowW;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();
  // núcleo blanco
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = `rgba(255, 255, 220, ${alpha})`;
  ctx.lineWidth   = coreW;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();
}

// ─── Dibuja la escena completa: texto + rayo ──────────────────────────────────
function drawScene(ctx, W, H, textLines, fontSize, rng, lightningAlpha) {
  ctx.clearRect(0, 0, W, H);

  // ── 1. Texto del laboratorio ──────────────────────────────────────────────
  ctx.save();
  ctx.font         = `800 ${fontSize}px 'Inter', 'Outfit', sans-serif`;
  ctx.fillStyle    = '#FFFFFF';
  ctx.textBaseline = 'top';
  ctx.letterSpacing = '0.04em'; // Nota: sólo funciona en Chrome 99+
  const lineH = fontSize * 1.38;
  textLines.forEach((line, i) => {
    ctx.fillText(line, 0, i * lineH);
  });
  ctx.restore();

  if (lightningAlpha <= 0) return;

  // ── 2. Rayo principal ─────────────────────────────────────────────────────
  const textAreaH = textLines.length * lineH;
  const cy = textAreaH + (H - textAreaH) / 2; // centro de la zona del rayo

  const spread = (H - textAreaH) * 0.45;
  const mainPts = buildSegment(W * 0.01, cy, W * 0.97, cy, spread, rng);
  strokePts(ctx, mainPts, lightningAlpha, 1.4, 7);

  // ── 3. Ramificaciones ─────────────────────────────────────────────────────
  const branchCount = 3 + Math.floor(rng() * 3);
  const step = Math.max(1, Math.floor(mainPts.length / (branchCount + 1)));

  for (let b = 0; b < branchCount; b++) {
    const idx = step * (b + 1);
    if (idx >= mainPts.length) break;
    const [bx, by] = mainPts[idx];

    const goUp = rng() > 0.42;
    const len  = W * (0.07 + rng() * 0.14);
    const ex   = bx + len * (0.5 + rng() * 0.5);
    const ey   = by + (goUp ? -1 : 1) * spread * (0.35 + rng() * 0.55);

    const brPts = buildSegment(bx, by, ex, ey, spread * 0.35, rng);
    strokePts(ctx, brPts, lightningAlpha * (0.5 + rng() * 0.4), 0.8, 4);

    // sub-rama
    if (rng() > 0.48 && brPts.length > 4) {
      const si = Math.floor(brPts.length * (0.35 + rng() * 0.3));
      const [sx, sy] = brPts[si] || [ex, ey];
      const ex2 = sx + W * (0.03 + rng() * 0.06);
      const ey2 = sy + (rng() - 0.5) * spread * 0.4;
      const sPts = buildSegment(sx, sy, ex2, ey2, spread * 0.18, rng);
      strokePts(ctx, sPts, lightningAlpha * 0.38, 0.5, 2.5);
    }
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function LightningBrandCanvas({
  line1 = 'LABORATORIO DE INVESTIGACIÓN EN ALTA',
  line2 = 'TENSIÓN Y ENERGÍAS RENOVABLES',
  width  = 420,
}) {
  const canvasRef = useRef(null);

  // Calculamos las dimensiones dinámicamente en el effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const DPR      = window.devicePixelRatio || 1;
    const fontSize = 13;           // px lógicos
    const lineH    = fontSize * 1.38;
    const textLines = line2 ? [line1, line2] : [line1];
    const textAreaH = textLines.length * lineH;
    const lightZoneH = 52;         // alto dedicado al rayo
    const totalH     = textAreaH + lightZoneH;

    // Ajustar canvas a DPR para nitidez en pantallas Retina
    const W = width;
    const H = Math.ceil(totalH);
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(DPR, DPR);

    // ── Estado animación ────────────────────────────────────────────────────
    let animId;
    let timeoutId;
    let phase        = 'idle';
    let lightAlpha   = 0;
    let holdFrames   = 0;
    let flickerLeft  = 0;
    let flickerTimer = 0;
    let flickerOn    = true;
    let seedRng      = null;

    const FLICKER_ON_F  = 3;
    const FLICKER_OFF_F = 2;
    const HOLD_F        = 10;
    const FADE_SPEED    = 0.06;

    const scheduleNext = () => {
      const delay = 1200 + Math.random() * 2800;
      timeoutId = setTimeout(() => {
        flickerLeft  = 2 + Math.floor(Math.random() * 2);
        flickerTimer = 0;
        flickerOn    = true;
        phase        = 'flicker';
        seedRng      = mulberry32(Math.random());
      }, delay);
    };

    const render = () => {
      if (phase === 'idle') {
        // Solo texto, sin rayo
        drawScene(ctx, W, H, textLines, fontSize, mulberry32(0.5), 0);
      } else if (phase === 'flicker') {
        flickerTimer++;
        if (flickerOn) {
          if (flickerTimer <= FLICKER_ON_F) {
            drawScene(ctx, W, H, textLines, fontSize, mulberry32(seedRng()), 1.0);
          } else {
            flickerTimer = 0;
            flickerOn    = false;
          }
        } else {
          if (flickerTimer <= FLICKER_OFF_F) {
            drawScene(ctx, W, H, textLines, fontSize, mulberry32(0.5), 0);
          } else {
            flickerTimer = 0;
            flickerLeft--;
            if (flickerLeft <= 0) {
              seedRng    = mulberry32(Math.random());
              phase      = 'hold';
              holdFrames = HOLD_F;
              lightAlpha = 1;
            } else {
              flickerOn = true;
            }
          }
        }
      } else if (phase === 'hold') {
        drawScene(ctx, W, H, textLines, fontSize, mulberry32(seedRng()), lightAlpha);
        holdFrames--;
        if (holdFrames <= 0) phase = 'out';
      } else if (phase === 'out') {
        lightAlpha -= FADE_SPEED;
        if (lightAlpha <= 0) {
          lightAlpha = 0;
          phase      = 'idle';
          drawScene(ctx, W, H, textLines, fontSize, mulberry32(0.5), 0);
          scheduleNext();
        } else {
          drawScene(ctx, W, H, textLines, fontSize, mulberry32(seedRng()), lightAlpha);
        }
      }

      animId = requestAnimationFrame(render);
    };

    // Primer render inmediato (solo texto)
    drawScene(ctx, W, H, textLines, fontSize, mulberry32(0.5), 0);
    scheduleNext();
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      clearTimeout(timeoutId);
    };
  }, [width, line1, line2]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', pointerEvents: 'none' }}
    />
  );
}
