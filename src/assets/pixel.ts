import { C, SHADE, rgb } from './palette';

const EMPTY = 255;

/**
 * Tiny indexed-colour pixel canvas for authoring sprites in code. Shapes are filled with palette
 * indices; `finish()` adds a one-pixel ink outline and top-left light / bottom-right shade so every
 * sprite shares the same hand-drawn look.
 */
export class Painter {
  readonly px: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.px = new Uint8Array(w * h).fill(EMPTY);
  }

  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? EMPTY : this.px[y * this.w + x];
  }
  set(x: number, y: number, c: number) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c;
  }
  clear(x: number, y: number) {
    this.set(x, y, EMPTY);
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  /** Filled ellipse; pixel centres within the radius are painted. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number) {
    for (let j = 0; j < this.h; j++)
      for (let i = 0; i < this.w; i++) {
        const u = (i + 0.5 - cx) / rx;
        const v = (j + 0.5 - cy) / ry;
        if (u * u + v * v <= 1) this.set(i, j, c);
      }
  }
  disc(cx: number, cy: number, r: number, c: number) {
    this.ellipse(cx, cy, r, r, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** Scanline polygon fill (pixel centres). */
  poly(pts: [number, number][], c: number) {
    for (let j = 0; j < this.h; j++) {
      const yc = j + 0.5;
      const xs: number[] = [];
      for (let k = 0; k < pts.length; k++) {
        const [ax, ay] = pts[k];
        const [bx, by] = pts[(k + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (let i = Math.ceil(xs[k] - 0.5); i <= Math.floor(xs[k + 1] - 0.5); i++) this.set(i, j, c);
    }
  }
  /** Recolour already-painted pixels in a rectangle (bands, hoops, stripes). */
  tint(x: number, y: number, w: number, h: number, c: number) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.get(i, j) !== EMPTY) this.set(i, j, c);
  }

  /** Auto-shade then outline. `outline` = palette index or -1 for none. */
  finish(outline: number = C.aubergine, shade = true): this {
    const src = this.px.slice();
    const at = (x: number, y: number) => (x < 0 || y < 0 || x >= this.w || y >= this.h ? EMPTY : src[y * this.w + x]);
    if (shade) {
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          const c = at(x, y);
          if (c === EMPTY || c === outline) continue;
          const lit = at(x - 1, y) === EMPTY || at(x, y - 1) === EMPTY;
          const dim = at(x + 1, y) === EMPTY || at(x, y + 1) === EMPTY;
          if (lit && !dim) this.px[y * this.w + x] = SHADE[c].light;
          else if (dim && !lit) this.px[y * this.w + x] = SHADE[c].dark;
        }
    }
    if (outline >= 0) {
      const filled = this.px.slice();
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) {
          if (filled[y * this.w + x] !== EMPTY) continue;
          const n = (i: number, j: number) => i >= 0 && j >= 0 && i < this.w && j < this.h && filled[j * this.w + i] !== EMPTY;
          if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) this.px[y * this.w + x] = outline;
        }
    }
    return this;
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w * scale;
    c.height = this.h * scale;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.px.length; i++) {
      const v = this.px[i];
      if (v === EMPTY) continue;
      const [r, g, b] = rgb(v);
      img.data.set([r, g, b, 255], i * 4);
    }
    if (scale === 1) ctx.putImageData(img, 0, 0);
    else {
      const t = document.createElement('canvas');
      t.width = this.w;
      t.height = this.h;
      t.getContext('2d')!.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(t, 0, 0, c.width, c.height);
    }
    return c;
  }
}

export { EMPTY };

/** Deterministic small hash for procedural sprite variation. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
