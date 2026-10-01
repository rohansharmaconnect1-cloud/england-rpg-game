import { C, MASTER } from '../assets/palette';
import { motion } from './kit/anim';
import { h } from './kit/dom';
import { playSfx } from './kit/sfx';

export interface IntroOpts {
  onDone: () => void;
}

const W = 160;
const H = 90;

const LINES: string[] = [
  'Rain on the Haven, and a lamp still burning in Walter Ashby\'s counting-house. Boston does not sleep when a ledger is unfinished.',
  'He added the same column twice. The second time it came out worse. The candle had opinions.',
  'The chair remembers him. The portrait does not: they have already dressed it in black, like a debt that came due.',
  'Coteler\'s man does not knock. He posts. The wax is still warm. So is the threat.',
  'Sixteen, and the keys are yours. The map on the wall is England. The hole in the roof is also yours.',
];

/** Five skippable pixel panels with typewriter narration, then onDone. */
export function renderIntro(opts: IntroOpts): HTMLElement {
  const root = h('div.intro-root');
  const frame = h('div.intro-frame');
  const canvas = document.createElement('canvas');
  canvas.className = 'intro-canvas';
  canvas.width = W;
  canvas.height = H;
  const caption = h('p.intro-caption');
  const hint = h('div.intro-hint', 'Press Space to skip');
  frame.append(canvas, caption);
  root.append(frame, hint);

  let panel = 0;
  let typed = 0;
  let fade = 1;
  let fadingOut = false;
  let done = false;
  let acc = 0;
  let t0 = performance.now();
  let last = t0;
  let raf = 0;

  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onKey, true);
    opts.onDone();
  };

  const skipAll = () => {
    if (done) return;
    playSfx('ui_click');
    if (motion.reduced) {
      finish();
      return;
    }
    fadingOut = true;
    fade = 0;
    root.classList.add('intro-out');
  };

  const advance = () => {
    if (done) return;
    const full = LINES[panel];
    if (typed < full.length) {
      typed = full.length;
      caption.textContent = full;
      return;
    }
    if (panel >= LINES.length - 1) {
      fadingOut = true;
      fade = 0;
      return;
    }
    panel++;
    typed = 0;
    fade = 0;
    caption.textContent = '';
    playSfx('ui_click');
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' || e.key === ' ') skipAll();
      else advance();
    }
  };
  const onClick = () => {
    if (done) return;
    advance();
  };

  window.addEventListener('keydown', onKey, true);
  root.addEventListener('click', onClick);

  const tick = (now: number) => {
    if (!root.isConnected) {
      window.removeEventListener('keydown', onKey, true);
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const elapsed = (now - t0) / 1000;
    if (fadingOut) {
      fade += dt * 1.8;
      root.style.opacity = String(Math.max(0, 1 - fade));
      if (fade >= 1) {
        finish();
        return;
      }
    } else {
      fade = Math.min(1, fade + dt * 2.2);
    }
    const reduced = motion.reduced;
    if (!reduced && typed < LINES[panel].length) {
      acc += dt;
      const step = 0.028;
      while (acc >= step && typed < LINES[panel].length) {
        acc -= step;
        typed++;
      }
      caption.textContent = LINES[panel].slice(0, typed);
    } else if (reduced) {
      typed = LINES[panel].length;
      caption.textContent = LINES[panel];
    }
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawPanel(ctx, panel, elapsed, reduced);
    if (fade < 1 && !fadingOut) {
      ctx.fillStyle = `rgba(30, 20, 36, ${1 - fade})`;
      ctx.fillRect(0, 0, W, H);
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  void raf;

  return root;
}

function drawPanel(ctx: CanvasRenderingContext2D, id: number, t: number, reduced: boolean) {
  ctx.clearRect(0, 0, W, H);
  if (id === 0) stormPort(ctx, t, reduced);
  else if (id === 1) fatherDesk(ctx, t, reduced);
  else if (id === 2) emptyChair(ctx, t, reduced);
  else if (id === 3) creditors(ctx, t, reduced);
  else heir(ctx, t, reduced);
}

function stormPort(ctx: CanvasRenderingContext2D, t: number, reduced: boolean) {
  fill(ctx, C.aubergineDeep);
  rect(ctx, 0, 0, W, 48, C.woadDeep);
  rect(ctx, 0, 48, W, 42, C.woad);
  const drift = reduced ? 0 : Math.sin(t * 0.4) * 4;
  rect(ctx, 10 + drift, 22, 40, 28, C.umber);
  rect(ctx, 18 + drift, 14, 24, 10, C.sepia);
  rect(ctx, 50 + drift * 0.5, 28, 28, 22, C.sepia);
  rect(ctx, 78 + drift * 0.3, 18, 36, 32, C.ink);
  rect(ctx, 86 + drift * 0.3, 8, 8, 12, C.sepia);
  const lit = reduced || Math.sin(t * 7) > -0.4;
  rect(ctx, 92, 34, 8, 8, lit ? C.saffron : C.ochre);
  pix(ctx, 94, 36, C.cream);
  pix(ctx, 96, 38, C.ember);
  rect(ctx, 0, 58, W, 32, C.woadMid);
  for (let i = 0; i < 8; i++) {
    const x = (i * 22 + (reduced ? 0 : t * 12)) % (W + 10) - 5;
    polyWave(ctx, x, 62 + Math.sin(t + i) * 2, C.foam);
  }
  if (!reduced) rain(ctx, t, 70);
  flickerVignette(ctx, t);
}

function fatherDesk(ctx: CanvasRenderingContext2D, t: number, reduced: boolean) {
  fill(ctx, C.aubergine);
  rect(ctx, 0, 0, W, 40, C.ink);
  rect(ctx, 0, 40, W, 50, C.sepia);
  rect(ctx, 20, 52, 90, 28, C.umber);
  rect(ctx, 28, 44, 22, 10, C.parchmentDark);
  rect(ctx, 52, 42, 18, 12, C.parchment);
  rect(ctx, 74, 46, 20, 8, C.parchmentLight);
  rect(ctx, 96, 48, 10, 6, C.tan);
  const f = reduced ? 1 : 0.65 + Math.sin(t * 9) * 0.35;
  disc(ctx, 118, 38, 7, f > 0.5 ? C.saffronLight : C.ember);
  disc(ctx, 118, 38, 3, C.cream);
  rect(ctx, 117, 44, 3, 10, C.umber);
  if (!reduced && f > 0.7) smoke(ctx, 118, 28, t);
  rect(ctx, 48, 30, 14, 16, C.madderDark);
  rect(ctx, 50, 26, 10, 6, C.umber);
  pix(ctx, 54, 34, C.tan);
  rect(ctx, 0, 78, W, 12, C.aubergineDeep);
  flickerVignette(ctx, t);
}

function emptyChair(ctx: CanvasRenderingContext2D, t: number, reduced: boolean) {
  fill(ctx, C.aubergine);
  rect(ctx, 0, 0, W, H, C.ink);
  rect(ctx, 20, 16, 50, 58, C.sepia);
  rect(ctx, 28, 22, 34, 40, C.parchmentDark);
  rect(ctx, 32, 26, 26, 32, C.aubergineDeep);
  rect(ctx, 36, 30, 18, 8, C.cream);
  rect(ctx, 34, 38, 22, 20, C.aubergine);
  rect(ctx, 90, 48, 18, 6, C.umber);
  rect(ctx, 94, 36, 10, 14, C.sepia);
  rect(ctx, 92, 54, 4, 18, C.umber);
  rect(ctx, 110, 54, 4, 18, C.umber);
  const dust = reduced ? 0 : Math.sin(t * 0.8);
  pix(ctx, 70 + dust, 20, C.stone);
  pix(ctx, 100, 28 + dust, C.stoneLight);
  flickerVignette(ctx, t * 0.5);
}

function creditors(ctx: CanvasRenderingContext2D, t: number, reduced: boolean) {
  fill(ctx, C.aubergineDeep);
  rect(ctx, 40, 8, 80, 82, C.umber);
  rect(ctx, 48, 16, 64, 66, C.sepia);
  rect(ctx, 70, 40, 22, 42, C.ink);
  rect(ctx, 76, 50, 10, 16, C.tan);
  rect(ctx, 0, 70, 48, 20, C.aubergine);
  rect(ctx, 8, 48, 12, 24, C.madderDark);
  rect(ctx, 10, 40, 8, 10, C.tan);
  rect(ctx, 24, 50, 14, 22, C.woad);
  rect(ctx, 26, 42, 10, 10, C.parchmentDark);
  const slide = reduced ? 18 : Math.min(18, t * 8);
  rect(ctx, 70 + slide * 0.2, 78, 14, 4, C.parchment);
  pix(ctx, 80 + slide * 0.2, 79, C.madder);
  if (!reduced) {
    pix(ctx, 18, 62 + Math.round(Math.sin(t * 3)), C.cream);
    pix(ctx, 32, 60, C.stoneLight);
  }
  flickerVignette(ctx, t);
}

function heir(ctx: CanvasRenderingContext2D, t: number, reduced: boolean) {
  fill(ctx, C.parchmentDark);
  rect(ctx, 0, 0, W, 50, C.sepia);
  rect(ctx, 8, 8, 70, 42, C.umber);
  rect(ctx, 14, 12, 58, 34, C.woadDeep);
  rect(ctx, 20, 16, 46, 26, C.woad);
  pix(ctx, 28, 22, C.moss);
  pix(ctx, 48, 24, C.madder);
  pix(ctx, 40, 30, C.saffron);
  rect(ctx, 100, 0, 60, 20, C.ink);
  const drip = reduced ? 0 : Math.floor(t * 3) % 8;
  rect(ctx, 118, 18, 2, 6 + drip, C.woadMid);
  pix(ctx, 118, 24 + drip, C.seaLight);
  rect(ctx, 70, 48, 16, 28, C.plum);
  rect(ctx, 72, 40, 12, 10, C.tan);
  rect(ctx, 68, 74, 8, 10, C.ink);
  rect(ctx, 80, 74, 8, 10, C.ink);
  rect(ctx, 0, 76, W, 14, C.umber);
  if (!reduced) smoke(ctx, 36, 14, t * 0.5);
  flickerVignette(ctx, t);
}

function fill(ctx: CanvasRenderingContext2D, c: number) {
  ctx.fillStyle = MASTER[c];
  ctx.fillRect(0, 0, W, H);
}
function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number) {
  ctx.fillStyle = MASTER[c];
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
}
function pix(ctx: CanvasRenderingContext2D, x: number, y: number, c: number) {
  ctx.fillStyle = MASTER[c];
  ctx.fillRect(x | 0, y | 0, 1, 1);
}
function disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, c: number) {
  ctx.fillStyle = MASTER[c];
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) ctx.fillRect(cx + x, cy + y, 1, 1);
}
function rain(ctx: CanvasRenderingContext2D, t: number, n: number) {
  ctx.fillStyle = MASTER[C.seaLight];
  for (let i = 0; i < n; i++) {
    const x = (i * 17 + t * 40) % W;
    const y = (i * 29 + t * 90) % H;
    ctx.fillRect(x | 0, y | 0, 1, 3);
  }
}
function smoke(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.fillStyle = MASTER[C.stone];
  for (let i = 0; i < 5; i++) {
    const ox = Math.sin(t * 1.4 + i) * 3;
    pix(ctx, x + ox, y - i * 3, C.stoneLight);
  }
}
function polyWave(ctx: CanvasRenderingContext2D, x: number, y: number, c: number) {
  ctx.fillStyle = MASTER[c];
  ctx.fillRect(x | 0, y | 0, 10, 1);
  ctx.fillRect((x + 3) | 0, (y - 1) | 0, 4, 1);
}
function flickerVignette(ctx: CanvasRenderingContext2D, t: number) {
  const a = 0.18 + Math.sin(t * 6) * 0.04;
  ctx.fillStyle = `rgba(30, 20, 36, ${a})`;
  ctx.fillRect(0, 0, W, 6);
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillRect(0, 0, 6, H);
  ctx.fillRect(W - 6, 0, 6, H);
}
