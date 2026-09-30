/** Deterministic, allocation-free noise functions. Same inputs + seed => same outputs on every machine. */

export function hash32(x: number, y: number, s: number): number {
  let h = (Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function hash01(x: number, y: number, s: number): number {
  return hash32(x, y, s) / 4294967296;
}

const GX = [1, -1, 0, 0, 0.7071, -0.7071, 0.7071, -0.7071];
const GY = [0, 0, 1, -1, 0.7071, 0.7071, -0.7071, -0.7071];

/** 2D gradient noise, roughly in [-1, 1]. */
export function perlin(x: number, y: number, s: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const h00 = hash32(ix, iy, s) & 7;
  const h10 = hash32(ix + 1, iy, s) & 7;
  const h01 = hash32(ix, iy + 1, s) & 7;
  const h11 = hash32(ix + 1, iy + 1, s) & 7;
  const n00 = GX[h00] * fx + GY[h00] * fy;
  const n10 = GX[h10] * (fx - 1) + GY[h10] * fy;
  const n01 = GX[h01] * fx + GY[h01] * (fy - 1);
  const n11 = GX[h11] * (fx - 1) + GY[h11] * (fy - 1);
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = n00 + u * (n10 - n00);
  const b = n01 + u * (n11 - n01);
  return (a + v * (b - a)) * 1.414;
}

/**
 * Band-limited fBm: octaves whose wavelength is smaller than ~2 texels fade out, so coarse LODs
 * get a clean, un-aliased version of the same function and fine LODs reveal extra detail.
 */
export function fbmLod(x: number, y: number, s: number, freq: number, octaves: number, texel: number): number {
  let sum = 0;
  let norm = 0;
  let amp = 1;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    norm += amp;
    const w = Math.min(1, Math.max(0, 2 - 4 * f * texel));
    if (w <= 0) break;
    sum += amp * w * perlin(x * f, y * f, s + i * 131);
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/** Same as fbmLod but ridged (sharp crests), output in [0, 1]. */
export function ridgedLod(x: number, y: number, s: number, freq: number, octaves: number, texel: number): number {
  let sum = 0;
  let norm = 0;
  let amp = 1;
  let f = freq;
  for (let i = 0; i < octaves; i++) {
    norm += amp;
    const w = Math.min(1, Math.max(0, 2 - 4 * f * texel));
    if (w <= 0) {
      sum += amp * 0.5;
    } else {
      const r = 1 - Math.abs(perlin(x * f, y * f, s + i * 173));
      sum += amp * (w * r * r + (1 - w) * 0.5);
    }
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/** Result of the last worley() call (kept in module scope to avoid allocation). */
export const W = { f1: 0, f2: 0, id: 0, dx: 0, dy: 0 };

/** Cellular noise in cell units: nearest/second-nearest feature distance, feature id and offset to it. */
export function worley(x: number, y: number, s: number, jitter = 0.85): void {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  let id = 0;
  let bdx = 0;
  let bdy = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i;
      const cy = iy + j;
      const h = hash32(cx, cy, s);
      const px = cx + 0.5 + ((h & 0xffff) / 65535 - 0.5) * jitter;
      const py = cy + 0.5 + ((h >>> 16) / 65535 - 0.5) * jitter;
      const dx = x - px;
      const dy = y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        id = h;
        bdx = dx;
        bdy = dy;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  W.f1 = f1;
  W.f2 = f2;
  W.id = id;
  W.dx = bdx;
  W.dy = bdy;
}

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
