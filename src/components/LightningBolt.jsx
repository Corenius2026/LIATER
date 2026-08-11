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

// ─── Midpoint Displacement recursivo: genera puntos del rayo ─────────────────
function buildBolt(x1, y1, x2, y2, spreadX, spreadY, rng) {
  const pts = [[x1, y1]];
  function sub(ax, ay, bx, by, sx, sy) {
    const dx = bx - ax;
    const dy = by - ay;
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

// ─── Dibuja un rayo: glow naranja + núcleo blanco ─────────────────────────────
function strokeBolt(ctx, pts, alpha, coreW = 1.2, glowW = 6) {
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
  // núcleo nítido
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = `rgba(255, 255, 220, ${alpha})`;
  ctx.lineWidth   = coreW;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.stroke();
}

// ─── Agrega una rama desde un punto del rayo ─────────────────────────────────
function addBranch(ctx, pts, alpha, outward, rng) {
  const idx = Math.floor(pts.length * (0.15 + rng() * 0.7));
  if (!pts[idx]) return;
  const [bx, by] = pts[idx];
  const len  = 10 + rng() * 22;
  const ex   = bx + (rng() - 0.3) * len;
  const ey   = by + (outward > 0 ? 1 : -1) * len * (0.4 + rng() * 0.6);
  const bPts = buildBolt(bx, by, ex, ey, 6, 6, rng);
  strokeBolt(ctx, bPts, alpha * 0.45, 0.5, 2.5);
}

// ─── Escena completa: texto + 4 rayos del borde ──────────────────────────────
function drawScene(ctx, W, H, textLines, fontSize, padH, padV, rng, lAlpha) {
  ctx.clearRect(0, 0, W, H);

  // ── Texto ──────────────────────────────────────────────────────────────────
  const lineH = fontSize * 1.38;
  ctx.save();
  ctx.font         = `800 ${fontSize}px 'Inter','Outfit',sans-serif`;
  ctx.fillStyle    = '#FFFFFF';
  ctx.textBaseline = 'top';
  textLines.forEach((line, i) => {
    ctx.fillText(line, padH, padV + i * lineH);
  });
  ctx.restore();

  if (lAlpha <= 0) return;

  // ─ Zona del borde del rayo ─────────────────────────────────────────────────
  // Dejamos un margen interior para que el rayo rodee el bloque de texto
  const bTop    = padV - 10;                           // tope del borde
  const bBottom = padV + textLines.length * lineH + 8; // fondo del borde
  const bLeft   = padH - 14;                           // izquierda del borde
  const bRight  = W - padH + 14;                       // derecha del borde

  // ── Lado SUPERIOR ─────────────────────────────────────────────────────────
  const topPts = buildBolt(bLeft, bTop, bRight, bTop, 0, 8, rng);
  strokeBolt(ctx, topPts, lAlpha, 1.2, 6);
  addBranch(ctx, topPts, lAlpha, -1, rng); // ramas hacia arriba

  // ── Lado INFERIOR ─────────────────────────────────────────────────────────
  const botPts = buildBolt(bLeft, bBottom, bRight, bBottom, 0, 8, rng);
  strokeBolt(ctx, botPts, lAlpha, 1.2, 6);
  addBranch(ctx, botPts, lAlpha, +1, rng); // ramas hacia abajo

  // ── Lado IZQUIERDO ────────────────────────────────────────────────────────
  const leftPts = buildBolt(bLeft, bTop, bLeft, bBottom, 6, 0, rng);
  strokeBolt(ctx, leftPts, lAlpha, 1.0, 4);

  // ── Lado DERECHO ──────────────────────────────────────────────────────────
  const rightPts = buildBolt(bRight, bTop, bRight, bBottom, 6, 0, rng);
  strokeBolt(ctx, rightPts, lAlpha, 1.0, 4);

  // ── Chispas en las esquinas ────────────────────────────────────────────────
  const corners = [
    [bLeft,  bTop],
    [bRight, bTop],
    [bLeft,  bBottom],
    [bRight, bBottom],
  ];
  corners.forEach(([cx, cy]) => {
    for (let s = 0; s < 2; s++) {
      const ex = cx + (rng() - 0.5) * 18;
      const ey = cy + (rng() - 0.5) * 18;
      const sPts = buildBolt(cx, cy, ex, ey, 4, 4, rng);
      strokeBolt(ctx, sPts, lAlpha * 0.55, 0.6, 2.5);
    }
  });
}

// ─── Componente ──────────────────────────────────────────────────────────────
export default function LightningBrandCanvas({
  line1  = 'LABORATORIO DE INVESTIGACIÓN EN ALTA',
  line2  = 'TENSIÓN Y ENERGÍAS RENOVABLES',
  width  = 430,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const DPR    = window.devicePixelRatio || 1;

    const fontSize   = 13;
    const lineH      = fontSize * 1.38;
    const textLines  = line2 ? [line1, line2] : [line1];
    const padH       = 16;   // padding horizontal para que quepa el borde
    const padV       = 14;   // padding vertical arriba del texto
    const extraBelow = 18;   // espacio debajo del texto para borde + ramas

    const W = width;
    const H = Math.ceil(padV + textLines.length * lineH + extraBelow);

    canvas.width        = W * DPR;
    canvas.height       = H * DPR;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(DPR, DPR);

    // ── Animación ─────────────────────────────────────────────────────────────
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
    const FADE_SPEED    = 0.055;

    const getStaticRng = () => mulberry32(seedVal);

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
      const rng = getStaticRng();
      if (phase === 'idle') {
        drawScene(ctx, W, H, textLines, fontSize, padH, padV, rng, 0);
      } else if (phase === 'flicker') {
        flickerTimer++;
        if (flickerOn) {
          if (flickerTimer <= FLICKER_ON_F) {
            drawScene(ctx, W, H, textLines, fontSize, padH, padV, mulberry32(seedVal * flickerTimer), 1.0);
          } else {
            flickerTimer = 0;
            flickerOn    = false;
          }
        } else {
          if (flickerTimer <= FLICKER_OFF_F) {
            drawScene(ctx, W, H, textLines, fontSize, padH, padV, rng, 0);
          } else {
            flickerTimer = 0;
            flickerLeft--;
            if (flickerLeft <= 0) {
              phase      = 'hold';
              holdFrames = HOLD_F;
              lAlpha     = 1.0;
            } else {
              flickerOn = true;
            }
          }
        }
      } else if (phase === 'hold') {
        drawScene(ctx, W, H, textLines, fontSize, padH, padV, rng, lAlpha);
        holdFrames--;
        if (holdFrames <= 0) phase = 'out';
      } else if (phase === 'out') {
        lAlpha -= FADE_SPEED;
        if (lAlpha <= 0) {
          lAlpha = 0;
          phase  = 'idle';
          drawScene(ctx, W, H, textLines, fontSize, padH, padV, rng, 0);
          scheduleNext();
        } else {
          drawScene(ctx, W, H, textLines, fontSize, padH, padV, rng, lAlpha);
        }
      }
      animId = requestAnimationFrame(render);
    };

    drawScene(ctx, W, H, textLines, fontSize, padH, padV, getStaticRng(), 0);
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
