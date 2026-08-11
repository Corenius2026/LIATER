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

// ─── Midpoint Displacement ────────────────────────────────────────────────────
function buildBolt(x1, y1, x2, y2, spreadX, spreadY, rng) {
  const pts = [[x1, y1]];
  function sub(ax, ay, bx, by, sx, sy) {
    const dx = bx - ax, dy = by - ay;
    if (Math.sqrt(dx * dx + dy * dy) < 5) { pts.push([bx, by]); return; }
    const mx = (ax + bx) / 2 + (rng() - 0.5) * sx;
    const my = (ay + by) / 2 + (rng() - 0.5) * sy;
    sub(ax, ay, mx, my, sx * 0.58, sy * 0.58);
    sub(mx, my, bx, by, sx * 0.58, sy * 0.58);
  }
  sub(x1, y1, x2, y2, spreadX, spreadY);
  pts.push([x2, y2]);
  return pts;
}

// ─── Dibuja un rayo (glow naranja + núcleo blanco nítido) ─────────────────────
function strokeBolt(ctx, pts, alpha, coreW, glowW) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = `rgba(255, 110, 0, ${alpha * 0.55})`;
  ctx.lineWidth   = glowW;
  ctx.lineJoin    = 'round'; ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = `rgba(255, 255, 220, ${alpha})`;
  ctx.lineWidth   = coreW;
  ctx.lineJoin    = 'round'; ctx.lineCap = 'round';
  ctx.stroke();
}

// ─── Escena: texto + rayo atravesándolo ──────────────────────────────────────
function drawScene(ctx, W, H, textLines, fontSize, rng, lAlpha) {
  ctx.clearRect(0, 0, W, H);

  const lineH  = fontSize * 1.38;
  const textH  = textLines.length * lineH;
  const textY  = (H - textH) / 2;   // texto centrado verticalmente

  // ── 1. Texto ─────────────────────────────────────────────────────────────
  ctx.save();
  ctx.font         = `800 ${fontSize}px 'Inter','Outfit',sans-serif`;
  ctx.fillStyle    = '#FFFFFF';
  ctx.textBaseline = 'top';
  textLines.forEach((line, i) => {
    ctx.fillText(line, 0, textY + i * lineH);
  });
  ctx.restore();

  if (lAlpha <= 0) return;

  // ── 2. Rayo principal que atraviesa el texto de lado a lado ──────────────
  // El centro Y del rayo pasa por el medio del bloque de texto
  const cy = H / 2 + (rng() - 0.5) * lineH * 0.6;

  // Desplazamiento vertical grande para que cruce el texto dramáticamente
  const vSpread = H * 0.42;

  const mainPts = buildBolt(0, cy, W, cy, 0, vSpread, rng);
  strokeBolt(ctx, mainPts, lAlpha, 1.6, 8);

  // ── 3. Ramificaciones que se adentran en el texto ─────────────────────────
  const branchCount = 4 + Math.floor(rng() * 3); // 4-6 ramas
  const step = Math.max(1, Math.floor(mainPts.length / (branchCount + 1)));

  for (let b = 0; b < branchCount; b++) {
    const idx = step * (b + 1);
    if (idx >= mainPts.length) break;
    const [bx, by] = mainPts[idx];

    const goUp = rng() > 0.45;
    const len  = W * (0.06 + rng() * 0.15);
    const ex   = bx + len * (0.4 + rng() * 0.6);
    const ey   = by + (goUp ? -1 : 1) * (vSpread * 0.35 + rng() * vSpread * 0.45);

    const brPts = buildBolt(bx, by, ex, ey, 4, vSpread * 0.28, rng);
    strokeBolt(ctx, brPts, lAlpha * (0.45 + rng() * 0.45), 0.9, 4);

    // sub-rama
    if (rng() > 0.5 && brPts.length > 4) {
      const si = Math.floor(brPts.length * (0.3 + rng() * 0.4));
      const [sx, sy] = brPts[si] || [ex, ey];
      const ex2 = sx + W * (0.025 + rng() * 0.06);
      const ey2 = sy + (rng() - 0.5) * vSpread * 0.35;
      const sPts = buildBolt(sx, sy, ex2, ey2, 3, vSpread * 0.18, rng);
      strokeBolt(ctx, sPts, lAlpha * 0.38, 0.5, 2);
    }
  }
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function LightningBrandCanvas({
  line1 = 'LABORATORIO DE INVESTIGACIÓN EN ALTA',
  line2 = 'TENSIÓN Y ENERGÍAS RENOVABLES',
  width = 430,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;

    const fontSize  = 13;
    const lineH     = fontSize * 1.38;
    const textLines = line2 ? [line1, line2] : [line1];
    // Canvas más alto que el texto para que las ramas puedan salir por arriba y abajo
    const W = width;
    const H = Math.ceil(textLines.length * lineH + 40);

    canvas.width        = W * DPR;
    canvas.height       = H * DPR;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(DPR, DPR);

    // ── Estado ────────────────────────────────────────────────────────────────
    let animId, timeoutId;
    let phase        = 'idle';
    let lAlpha       = 0;
    let holdFrames   = 0;
    let flickerLeft  = 0;
    let flickerTimer = 0;
    let flickerOn    = true;
    let seedVal      = 0.5;

    const FLICKER_ON_F  = 3;
    const FLICKER_OFF_F = 2;
    const HOLD_F        = 12;
    const FADE          = 0.055;

    const getRng = (s) => mulberry32(s ?? seedVal);

    const scheduleNext = () => {
      const delay = 1000 + Math.random() * 2500;
      timeoutId = setTimeout(() => {
        flickerLeft  = 2 + Math.floor(Math.random() * 2);
        flickerTimer = 0;
        flickerOn    = true;
        seedVal      = Math.random();
        phase        = 'flicker';
      }, delay);
    };

    const render = () => {
      if (phase === 'idle') {
        drawScene(ctx, W, H, textLines, fontSize, getRng(), 0);
      } else if (phase === 'flicker') {
        flickerTimer++;
        if (flickerOn) {
          if (flickerTimer <= FLICKER_ON_F) {
            drawScene(ctx, W, H, textLines, fontSize, getRng(seedVal * flickerTimer + 0.01), 1.0);
          } else { flickerTimer = 0; flickerOn = false; }
        } else {
          if (flickerTimer <= FLICKER_OFF_F) {
            drawScene(ctx, W, H, textLines, fontSize, getRng(), 0);
          } else {
            flickerTimer = 0; flickerLeft--;
            if (flickerLeft <= 0) { phase = 'hold'; holdFrames = HOLD_F; lAlpha = 1.0; }
            else flickerOn = true;
          }
        }
      } else if (phase === 'hold') {
        drawScene(ctx, W, H, textLines, fontSize, getRng(), lAlpha);
        if (--holdFrames <= 0) phase = 'out';
      } else if (phase === 'out') {
        lAlpha -= FADE;
        if (lAlpha <= 0) {
          lAlpha = 0; phase = 'idle';
          drawScene(ctx, W, H, textLines, fontSize, getRng(), 0);
          scheduleNext();
        } else {
          drawScene(ctx, W, H, textLines, fontSize, getRng(), lAlpha);
        }
      }
      animId = requestAnimationFrame(render);
    };

    drawScene(ctx, W, H, textLines, fontSize, getRng(), 0);
    scheduleNext();
    animId = requestAnimationFrame(render);

    return () => { cancelAnimationFrame(animId); clearTimeout(timeoutId); };
  }, [width, line1, line2]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', pointerEvents: 'none' }}
    />
  );
}
