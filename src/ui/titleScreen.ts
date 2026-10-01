import { C, MASTER } from '../assets/palette';
import { GAME_TAGLINE, GAME_TITLE } from '../content/brand';
import { SETTLEMENT_BY_ID } from '../world/settlements';
import type { Camera } from '../camera/camera';
import type { Actions } from '../state/actions';
import { h } from './kit/dom';
import { stampButton } from './kit/components';
import { playSfx } from './kit/sfx';
import { FONT_H, drawPixelText, measurePixelText } from '../render/pixelFont';

/** Live title overlay: pixel wordmark, wax-stamp buttons, gulls and Channel ships. */
export function renderTitle(act: Actions, cam: Camera, reduced: boolean): HTMLElement {
  const root = h('div.title-screen');
  const vig = h('div.title-vignette');
  const life = document.createElement('canvas');
  life.className = 'title-life';
  const word = titleCanvas(GAME_TITLE);
  word.className = 'title-word';
  const cluster = h('div.title-cluster',
    word,
    h('p.title-tag', GAME_TAGLINE),
    h('div.title-actions'),
  );
  const actions = cluster.querySelector('.title-actions') as HTMLElement;
  const start = stampButton({
    label: 'Start', icon: 'quill', size: 'lg', ink: 'madder', hotkey: '⏎',
    onClick: () => { playSfx('ui_click'); act.menu('intro'); },
  });
  const settings = stampButton({
    label: 'Settings', icon: 'gear', size: 'md', ink: 'woad',
    onClick: () => { playSfx('ui_click'); act.menu('settings'); },
  });
  const cont = stampButton({
    label: 'Continue', icon: 'book', size: 'md', ink: 'ink', disabled: true,
    tip: { title: 'Continue', desc: 'No book has been written yet.' },
  });
  const quit = stampButton({
    label: 'Quit', icon: 'cross', size: 'md', ink: 'ink', disabled: true,
    tip: { title: 'Quit', desc: 'Close the tab when you mean it.' },
  });
  const live: HTMLButtonElement[] = [start, settings];
  actions.append(start, settings, cont, quit);
  root.append(vig, life, cluster);

  let idx = 0;
  const focus = (i: number) => {
    idx = (i + live.length) % live.length;
    live[idx].focus();
  };
  queueMicrotask(() => focus(0));

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      e.stopPropagation();
      focus(idx + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      e.stopPropagation();
      focus(idx - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      playSfx('ui_click');
      live[idx].click();
    }
  };
  window.addEventListener('keydown', onKey, true);

  let raf = 0;
  let liveOn = true;
  const t0 = performance.now();
  const tick = (now: number) => {
    if (!liveOn) return;
    paintLife(life, cam, (now - t0) / 1000, reduced);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  const stop = () => {
    liveOn = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKey, true);
  };
  const obs = new MutationObserver(() => {
    if (!root.isConnected) {
      stop();
      obs.disconnect();
    }
  });
  queueMicrotask(() => {
    if (root.parentElement) obs.observe(root.parentElement, { childList: true });
  });

  return root;
}

function titleCanvas(text: string): HTMLCanvasElement {
  const scale = 7;
  const pad = 3;
  const gap = 3;
  const letters = [...text.toUpperCase()];
  const w = letters.reduce((n, ch, i) => n + measurePixelText(ch) + (i ? gap : 0), 0);
  const src = document.createElement('canvas');
  src.width = w + pad * 2;
  src.height = FONT_H + pad * 2;
  const sctx = src.getContext('2d')!;
  const ink = MASTER[C.aubergineDeep];
  const gilt = MASTER[C.saffronLight];
  const cream = MASTER[C.cream];
  const ember = MASTER[C.ember];
  const paint = (oy = 0) => {
    let x = pad;
    letters.forEach((ch, i) => {
      drawPixelText(sctx, ch, x, pad + oy, i === 0 ? (oy < 0 ? ember : gilt) : cream);
      x += measurePixelText(ch) + gap;
    });
  };
  paint();
  halo(sctx, src.width, src.height, ink, 1);
  paint();
  paint(-1);
  const out = document.createElement('canvas');
  out.width = src.width * scale;
  out.height = src.height * scale;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

function halo(ctx: CanvasRenderingContext2D, w: number, h: number, col: string, r: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const [cr, cg, cb] = hex(col);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] > 0) continue;
      let n = false;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const xx = x + dx * r, yy = y + dy * r;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        if (src[(yy * w + xx) * 4 + 3] > 0) { n = true; break; }
      }
      if (n) {
        img.data[i] = cr; img.data[i + 1] = cg; img.data[i + 2] = cb; img.data[i + 3] = 255;
      }
    }
  ctx.putImageData(img, 0, 0);
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paintLife(canvas: HTMLCanvasElement, cam: Camera, t: number, reduced: boolean) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = false;
  const dover = SETTLEMENT_BY_ID.get('dover');
  const calais = SETTLEMENT_BY_ID.get('calais');
  if (dover && calais) {
    for (let i = 0; i < 2; i++) {
      const u = ((t * (0.018 + i * 0.007) + i * 0.37) % 1 + 1) % 1;
      const wx = dover.x + (calais.x - dover.x) * u;
      const wy = dover.y + (calais.y - dover.y) * u + Math.sin(t * 0.6 + i) * 1.2;
      const [sx, sy] = cam.worldToScreen(wx, wy);
      drawCog(ctx, sx, sy, i === 0 ? 1 : -1, t);
    }
  }
  const n = reduced ? 2 : 6;
  for (let i = 0; i < n; i++) {
    const speed = 18 + i * 7;
    const x = ((t * speed + i * 90) % (w + 40)) - 20;
    const y = 48 + (i * 37) % Math.max(80, h * 0.35) + Math.sin(t * 0.9 + i) * 6;
    gull(ctx, x, y, t * 8 + i, MASTER[i % 2 ? C.cream : C.stoneLight]);
  }
}

function gull(ctx: CanvasRenderingContext2D, x: number, y: number, flap: number, col: string) {
  ctx.fillStyle = col;
  const wing = 4 + Math.round(Math.sin(flap) * 2);
  ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
  ctx.fillRect(Math.round(x) - wing, Math.round(y) + 1, wing, 1);
  ctx.fillRect(Math.round(x) + 2, Math.round(y) + 1, wing, 1);
}

function drawCog(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number) {
  const px = Math.round(x);
  const py = Math.round(y + Math.sin(t * 2) * 1);
  ctx.fillStyle = MASTER[C.umber];
  ctx.fillRect(px - 6, py, 12, 3);
  ctx.fillRect(px - 5, py + 3, 10, 2);
  ctx.fillStyle = MASTER[C.parchmentLight];
  ctx.fillRect(px - 1, py - 8, 2, 8);
  ctx.fillStyle = MASTER[C.madder];
  if (dir > 0) {
    ctx.fillRect(px + 1, py - 7, 6, 5);
  } else {
    ctx.fillRect(px - 7, py - 7, 6, 5);
  }
}
