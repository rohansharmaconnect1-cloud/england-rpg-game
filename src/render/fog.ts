import type { WorldData } from '../world/worldData';

/** Miles per fog texel. Coarser than the coastline grid so the parchment edge stays soft. */
export const FOG_CELL = 2;

/**
 * Mock fog of war: England, the Channel and the Flanders–Rouen coast are unrolled; Gascony,
 * Ireland and the Scottish hinterland stay as blank parchment until a warehouse or ship comes near.
 */
export class FogField {
  readonly w: number;
  readonly h: number;
  readonly rgba: Uint8Array;
  dirty = true;
  private readonly base: Uint8Array;
  private acc = 0;
  private lastKey = '';

  constructor(private readonly world: WorldData) {
    const { worldW, worldH } = world.meta;
    this.w = Math.ceil(worldW / FOG_CELL);
    this.h = Math.ceil(worldH / FOG_CELL);
    this.base = new Uint8Array(this.w * this.h);
    this.rgba = new Uint8Array(this.w * this.h * 4);
    this.mock();
    this.paint(this.base);
  }

  sample(x: number, y: number): number {
    const gx = x / FOG_CELL - 0.5;
    const gy = y / FOG_CELL - 0.5;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= this.w - 1 || iy >= this.h - 1) return 0;
    const fx = gx - ix;
    const fy = gy - iy;
    const at = (i: number, j: number) => this.rgba[(j * this.w + i) * 4] / 255;
    const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
    const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
    return a + (b - a) * fy;
  }

  /**
   * Restamp proximity around owned places and player ships. Uploads at most a few times a second
   * unless the stamp set actually moved.
   */
  sync(dt: number, stamps: { x: number; y: number; r: number }[]): boolean {
    const key = stamps.map((s) => `${s.x | 0},${s.y | 0},${s.r | 0}`).join(';');
    this.acc += dt;
    if (key === this.lastKey && this.acc < 0.4 && !this.dirty) return false;
    this.lastKey = key;
    this.acc = 0;
    this.paint(this.base);
    for (const s of stamps) this.stamp(s.x, s.y, s.r);
    this.dirty = true;
    return true;
  }

  private mock() {
    const { w, h, world } = this;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const x = (i + 0.5) * FOG_CELL;
        const y = (j + 0.5) * FOG_CELL;
        const land = world.land(x, y);
        const eng = world.england(x, y);
        const rid = world.regionIdNear(x, y);
        let v = 0.04;
        if (eng > -18) v = 1;
        else if (rid === 2) v = 0.92;
        else if (rid === 3 && y > 70) v = 0.62;
        else if (rid === 7 && y < 500) v = 0.9;
        else if (rid === 7 && y < 640) v = 0.9 * (1 - (y - 500) / 140);
        else if (land < 0 && eng > -40) v = Math.max(v, 0.55 + eng / 80);
        this.base[j * w + i] = Math.round(v * 255);
      }
    }
  }

  private paint(src: Uint8Array) {
    const { rgba } = this;
    for (let i = 0; i < src.length; i++) {
      const o = i * 4;
      rgba[o] = src[i];
      rgba[o + 3] = 255;
    }
  }

  private stamp(x: number, y: number, r: number) {
    const r2 = r * r;
    const i0 = Math.max(0, Math.floor((x - r) / FOG_CELL));
    const i1 = Math.min(this.w - 1, Math.floor((x + r) / FOG_CELL));
    const j0 = Math.max(0, Math.floor((y - r) / FOG_CELL));
    const j1 = Math.min(this.h - 1, Math.floor((y + r) / FOG_CELL));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const dx = (i + 0.5) * FOG_CELL - x;
        const dy = (j + 0.5) * FOG_CELL - y;
        const d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const v = Math.round((1 - d2 / r2) * 255);
        const o = (j * this.w + i) * 4;
        if (v > this.rgba[o]) this.rgba[o] = v;
      }
    }
  }
}
