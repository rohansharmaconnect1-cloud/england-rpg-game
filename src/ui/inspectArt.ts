import { C, MASTER } from '../assets/palette';
import { Painter } from '../assets/pixel';
import type { GoodId, Route, Warehouse } from '../state/types';
import { along, worldPts } from '../map/routeGeom';
import type { SettlementKind } from '../world/settlements';

const cache = new Map<string, HTMLCanvasElement>();
function memo(key: string, make: () => HTMLCanvasElement) {
  let c = cache.get(key);
  if (!c) {
    c = make();
    cache.set(key, c);
  }
  return c;
}

/** Tiny town skyline for the inspector. */
export function skylineCanvas(kind: SettlementKind, seed: string, night: boolean): HTMLCanvasElement {
  return memo(`sky:${kind}:${seed}:${night ? 1 : 0}`, () => {
    const p = new Painter(120, 36);
    p.rect(0, 0, 120, 22, night ? C.woadDeep : C.seaLight);
    if (night) {
      p.set(12, 4, C.cream);
      p.set(44, 7, C.saffronLight);
      p.set(88, 5, C.cream);
    } else {
      p.disc(18, 7, 4, C.saffronLight);
    }
    p.rect(0, 22, 120, 14, C.tan);
    const buildings: [number, number, number, number][] =
      kind === 'port'
        ? [[4, 14, 14, 16], [22, 10, 18, 20], [44, 16, 12, 14], [60, 8, 16, 22], [80, 12, 22, 18], [104, 18, 12, 12]]
        : kind === 'cathedral'
          ? [[8, 16, 16, 14], [28, 4, 10, 26], [42, 12, 28, 18], [74, 14, 14, 16], [92, 18, 20, 12]]
          : kind === 'castle'
            ? [[10, 10, 8, 20], [18, 14, 28, 16], [46, 8, 8, 22], [58, 16, 18, 14], [84, 12, 24, 18]]
            : kind === 'city'
              ? [[4, 12, 16, 18], [22, 8, 14, 22], [38, 14, 20, 16], [60, 6, 12, 24], [76, 12, 18, 18], [98, 16, 16, 14]]
              : [[10, 16, 18, 14], [32, 12, 14, 18], [50, 18, 22, 12], [78, 14, 16, 16]];
    buildings.forEach(([x, y, w, h], i) => {
      const col = i % 3 === 0 ? C.umber : i % 3 === 1 ? C.sepia : C.stone;
      p.rect(x, y, w, h, col);
      p.rect(x + 2, y + 3, 3, 3, night ? C.saffron : C.woadDeep);
      if (w > 14) p.rect(x + w - 6, y + 3, 3, 3, night ? C.ember : C.parchmentLight);
      if (kind === 'cathedral' && i === 1) p.rect(x + 3, 0, 4, y, C.stoneLight);
    });
    if (kind === 'port') {
      p.rect(0, 28, 120, 8, C.woad);
      p.rect(70, 20, 2, 10, C.sepia);
      p.poly([[72, 12], [84, 18], [72, 20]], C.parchmentLight);
    }
    return p.finish(C.aubergine).toCanvas(2);
  });
}

/** Cutaway warehouse: stacked goods, optional rats and a leaking roof. */
export function warehouseCutaway(w: Warehouse): HTMLCanvasElement {
  const leak = w.condition < 45;
  const rats = (w.stock.grain ?? 0) > 4 || w.condition < 50;
  const key = `wh:${w.id}:${w.condition}:${JSON.stringify(w.stock)}:${leak}:${rats}`;
  return memo(key, () => {
    const p = new Painter(144, 72);
    p.rect(0, 0, 144, 72, C.parchmentDark);
    p.poly([[8, 28], [72, 8], [136, 28], [128, 28], [72, 14], [16, 28]], C.umber);
    p.rect(16, 28, 112, 40, C.tan);
    p.rect(18, 30, 108, 36, C.sepia);
    p.rect(20, 32, 40, 32, C.umber);
    p.rect(24, 36, 8, 12, C.woadDeep);
    if (leak) {
      p.rect(70, 12, 2, 18, C.woadMid);
      p.set(70, 32, C.seaLight);
      p.set(72, 34, C.woad);
    }
    const stacks: { g: GoodId; n: number; col: number }[] = [
      { g: 'wool', n: w.stock.wool ?? 0, col: C.parchmentLight },
      { g: 'cloth', n: w.stock.cloth ?? 0, col: C.madder },
      { g: 'grain', n: w.stock.grain ?? 0, col: C.saffron },
      { g: 'salt', n: w.stock.salt ?? 0, col: C.cream },
      { g: 'wine', n: w.stock.wine ?? 0, col: C.plum },
      { g: 'fish', n: w.stock.fish ?? 0, col: C.woadMid },
    ];
    let x = 64;
    for (const s of stacks) {
      const h = Math.min(6, Math.ceil(s.n / 8));
      for (let i = 0; i < h; i++) {
        p.rect(x, 58 - i * 5, 12, 4, s.col);
        p.rect(x + 1, 59 - i * 5, 10, 1, C.ink);
      }
      if (h) x += 14;
    }
    if (rats) {
      p.ellipse(36, 62, 3, 1.6, C.stone);
      p.set(39, 61, C.stoneLight);
      p.ellipse(48, 64, 2.4, 1.4, C.stone);
    }
    return p.finish(C.aubergine).toCanvas(2);
  });
}

const CRATE_COL: Record<GoodId, number> = {
  wool: C.parchmentLight,
  cloth: C.madder,
  grain: C.saffron,
  wine: C.plum,
  salt: C.cream,
  fish: C.woadMid,
};

/** Hold as a grid of crates. */
export function cargoGrid(el: HTMLElement, cargo: Partial<Record<GoodId, number>>, cells = 16, hidden = false) {
  const slots: GoodId[] = [];
  for (const [g, n] of Object.entries(cargo) as [GoodId, number][]) {
    const k = Math.min(8, Math.max(1, Math.ceil(n / 4)));
    for (let i = 0; i < k; i++) slots.push(g);
  }
  while (slots.length < cells) slots.push('' as GoodId);
  el.replaceChildren();
  for (let i = 0; i < cells; i++) {
    const cell = document.createElement('span');
    cell.className = 'crate';
    const g = slots[i];
    if (g) {
      cell.style.background = MASTER[CRATE_COL[g]];
      cell.title = g;
    }
    if (hidden && i === cells - 1) {
      cell.classList.add('hidden-hold');
      cell.title = 'A plank that does not quite match';
    }
    el.append(cell);
  }
}

/** Mini route ribbon with a pip at progress. */
export function routeRibbon(route: Route, progress: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 200;
  c.height = 40;
  c.className = 'route-ribbon';
  const ctx = c.getContext('2d')!;
  const pts = worldPts(route);
  if (pts.length < 2) return c;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const pad = 8;
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX || 1)) * (c.width - pad * 2);
  const sy = (y: number) => pad + ((y - minY) / (maxY - minY || 1)) * (c.height - pad * 2);
  ctx.strokeStyle = MASTER[C.umber];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx(pts[0][0]), sy(pts[0][1]));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(sx(pts[i][0]), sy(pts[i][1]));
  ctx.stroke();
  const pip = along(pts, progress);
  ctx.fillStyle = MASTER[C.saffron];
  ctx.fillRect(Math.round(sx(pip.x)) - 2, Math.round(sy(pip.y)) - 2, 5, 5);
  ctx.fillStyle = MASTER[C.ink];
  ctx.fillRect(Math.round(sx(pts[0][0])) - 1, Math.round(sy(pts[0][1])) - 1, 3, 3);
  ctx.fillRect(Math.round(sx(pts[pts.length - 1][0])) - 1, Math.round(sy(pts[pts.length - 1][1])) - 1, 3, 3);
  return c;
}

/** Compact circular dial, 0–100. */
export function dialCanvas(value: number, col: number): HTMLCanvasElement {
  const p = new Painter(22, 22);
  p.disc(11, 11, 10, C.ink);
  p.disc(11, 11, 8.5, C.parchmentDark);
  const t = Math.max(0, Math.min(1, value / 100));
  const steps = Math.round(t * 12);
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI * 0.75 + (i / 12) * Math.PI * 1.5;
    p.set(Math.round(11 + Math.cos(a) * 6), Math.round(11 + Math.sin(a) * 6), col);
  }
  p.disc(11, 11, 2, col);
  return p.finish(C.aubergine, false).toCanvas(2);
}

export function crystalBall(): HTMLCanvasElement {
  return memo('ball', () => {
    const p = new Painter(28, 28);
    p.disc(14, 14, 12, C.woadDeep);
    p.disc(14, 14, 10, C.woad);
    p.ellipse(11, 11, 4, 3, C.foam);
    p.set(8, 9, C.cream);
    p.rect(6, 24, 16, 3, C.umber);
    return p.finish(C.aubergine).toCanvas(2);
  });
}

export function stackedBar(parts: { n: number; col: number }[], w = 120, h = 10): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const tot = parts.reduce((a, p) => a + p.n, 0) || 1;
  let x = 0;
  for (const p of parts) {
    const ww = Math.max(1, Math.round((p.n / tot) * w));
    ctx.fillStyle = MASTER[p.col];
    ctx.fillRect(x, 0, ww, h);
    x += ww;
  }
  ctx.strokeStyle = MASTER[C.ink];
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  return c;
}
