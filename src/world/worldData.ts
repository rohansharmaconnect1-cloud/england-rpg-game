/** Baked geographic data (coastline/border distance fields, regions, rivers) plus fast lookups. */

export interface WorldMeta {
  cell: number;
  gridW: number;
  gridH: number;
  sdfScale: number;
  worldW: number;
  worldH: number;
  englandBounds: [number, number, number, number];
  regions: string[];
}

export interface RiverDef {
  name: string;
  rank: number;
  w0: number;
  w1: number;
  /** Flat [x0, y0, x1, y1, ...] in world miles. */
  pts: number[];
}

export interface RawWorld {
  meta: WorldMeta;
  landSdf: ArrayBuffer;
  engSdf: ArrayBuffer;
  region: ArrayBuffer;
  rivers: RiverDef[];
}

export async function loadRawWorld(base = '/data/'): Promise<RawWorld> {
  const get = async (f: string) => {
    const r = await fetch(base + f);
    if (!r.ok) throw new Error(`failed to load ${f}`);
    return r;
  };
  const [meta, landSdf, engSdf, region, rivers] = await Promise.all([
    get('meta.json').then((r) => r.json()),
    get('land_sdf.bin').then((r) => r.arrayBuffer()),
    get('eng_sdf.bin').then((r) => r.arrayBuffer()),
    get('region.bin').then((r) => r.arrayBuffer()),
    get('rivers.json').then((r) => r.json()),
  ]);
  return { meta, landSdf, engSdf, region, rivers };
}

/** Rivers bucketed into a 1-mile grid (CSR layout) with each segment's width and rank. */
export class RiverIndex {
  static readonly CELL = 1;
  /** Max distance at which a river still influences terrain (valley carving). */
  static readonly REACH = 3.5;
  readonly seg: Float32Array; // ax, ay, bx, by, halfW0, halfW1, rank, valleyR
  readonly start: Int32Array;
  readonly items: Int32Array;
  readonly gw: number;
  readonly gh: number;

  /** Outputs of query(). */
  valley = 0;
  water = 0;
  waterRank = 0;

  constructor(rivers: RiverDef[], worldW: number, worldH: number) {
    const segs: number[] = [];
    for (const r of rivers) {
      const p = r.pts;
      const n = p.length / 2;
      let total = 0;
      for (let i = 0; i < n - 1; i++) total += Math.hypot(p[2 * i + 2] - p[2 * i], p[2 * i + 3] - p[2 * i + 1]);
      let acc = 0;
      const valleyR = r.rank === 1 ? 3 : r.rank === 2 ? 2 : 1.2;
      for (let i = 0; i < n - 1; i++) {
        const len = Math.hypot(p[2 * i + 2] - p[2 * i], p[2 * i + 3] - p[2 * i + 1]);
        const u0 = total > 0 ? acc / total : 0;
        acc += len;
        const u1 = total > 0 ? acc / total : 0;
        segs.push(p[2 * i], p[2 * i + 1], p[2 * i + 2], p[2 * i + 3],
          0.5 * (r.w0 + (r.w1 - r.w0) * u0), 0.5 * (r.w0 + (r.w1 - r.w0) * u1), r.rank, valleyR);
      }
    }
    this.seg = Float32Array.from(segs);
    const C = RiverIndex.CELL;
    this.gw = Math.ceil(worldW / C);
    this.gh = Math.ceil(worldH / C);
    const ns = this.seg.length / 8;
    const cells: number[][] = Array.from({ length: this.gw * this.gh }, () => []);
    for (let s = 0; s < ns; s++) {
      const o = s * 8;
      const R = RiverIndex.REACH;
      const x0 = Math.floor((Math.min(this.seg[o], this.seg[o + 2]) - R) / C);
      const x1 = Math.floor((Math.max(this.seg[o], this.seg[o + 2]) + R) / C);
      const y0 = Math.floor((Math.min(this.seg[o + 1], this.seg[o + 3]) - R) / C);
      const y1 = Math.floor((Math.max(this.seg[o + 1], this.seg[o + 3]) + R) / C);
      for (let y = Math.max(0, y0); y <= Math.min(this.gh - 1, y1); y++)
        for (let x = Math.max(0, x0); x <= Math.min(this.gw - 1, x1); x++) cells[y * this.gw + x].push(s);
    }
    this.start = new Int32Array(cells.length + 1);
    let total = 0;
    for (let i = 0; i < cells.length; i++) {
      this.start[i] = total;
      total += cells[i].length;
    }
    this.start[cells.length] = total;
    this.items = new Int32Array(total);
    let k = 0;
    for (const c of cells) for (const s of c) this.items[k++] = s;
  }

  /**
   * Sets `valley` (0..1 carve strength, all ranks) and `water` (distance to the nearest visible
   * river bank; negative = inside the channel). `minHalfW` keeps thin rivers >= 1 texel wide.
   */
  query(x: number, y: number, maxRank: number, minHalfW: number): void {
    this.valley = 0;
    this.water = 1e9;
    this.waterRank = 0;
    const cx = Math.floor(x / RiverIndex.CELL);
    const cy = Math.floor(y / RiverIndex.CELL);
    if (cx < 0 || cy < 0 || cx >= this.gw || cy >= this.gh) return;
    const c = cy * this.gw + cx;
    const s = this.seg;
    for (let i = this.start[c]; i < this.start[c + 1]; i++) {
      const o = this.items[i] * 8;
      const ax = s[o], ay = s[o + 1];
      const dx = s[o + 2] - ax, dy = s[o + 3] - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = ax + t * dx - x, qy = ay + t * dy - y;
      const d = Math.sqrt(qx * qx + qy * qy);
      const vr = s[o + 7];
      if (d < vr) {
        const v = 1 - d / vr;
        const vv = v * v * (3 - 2 * v);
        if (vv > this.valley) this.valley = vv;
      }
      const rank = s[o + 6];
      if (rank <= maxRank) {
        const hw = Math.max(s[o + 4] + (s[o + 5] - s[o + 4]) * t, minHalfW);
        const w = d - hw;
        if (w < this.water) {
          this.water = w;
          this.waterRank = rank;
        }
      }
    }
  }
}

export class WorldData {
  readonly meta: WorldMeta;
  readonly landSdf: Int16Array;
  readonly engSdf: Int16Array;
  readonly region: Uint8Array;
  readonly rivers: RiverIndex;

  constructor(raw: RawWorld) {
    this.meta = raw.meta;
    this.landSdf = new Int16Array(raw.landSdf);
    this.engSdf = new Int16Array(raw.engSdf);
    this.region = new Uint8Array(raw.region);
    this.rivers = new RiverIndex(raw.rivers, raw.meta.worldW, raw.meta.worldH);
  }

  /** Bilinear sample of a signed-distance grid in miles; outside the grid reads as far sea. */
  sampleSdf(grid: Int16Array, x: number, y: number): number {
    const { cell, gridW, gridH, sdfScale } = this.meta;
    const gx = x / cell - 0.5;
    const gy = y / cell - 0.5;
    const ix = Math.floor(gx);
    const iy = Math.floor(gy);
    if (ix < 0 || iy < 0 || ix >= gridW - 1 || iy >= gridH - 1) return -50;
    const fx = gx - ix;
    const fy = gy - iy;
    const o = iy * gridW + ix;
    const a = grid[o] + (grid[o + 1] - grid[o]) * fx;
    const b = grid[o + gridW] + (grid[o + gridW + 1] - grid[o + gridW]) * fx;
    return (a + (b - a) * fy) * sdfScale;
  }

  land(x: number, y: number): number {
    return this.sampleSdf(this.landSdf, x, y);
  }

  england(x: number, y: number): number {
    return this.sampleSdf(this.engSdf, x, y);
  }

  /** Region id at (x, y); on raster-coast cells that read as sea, the nearest land cell within ~1 mile. */
  regionIdNear(x: number, y: number): number {
    const { cell, gridW, gridH } = this.meta;
    const ix = Math.floor(x / cell);
    const iy = Math.floor(y / cell);
    for (let r = 0; r <= 2; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const jx = ix + dx;
          const jy = iy + dy;
          if (jx < 0 || jy < 0 || jx >= gridW || jy >= gridH) continue;
          const v = this.region[jy * gridW + jx];
          if (v) return v;
        }
    return 0;
  }

  regionAt(x: number, y: number): string {
    const { cell, gridW, gridH, regions } = this.meta;
    const ix = Math.floor(x / cell);
    const iy = Math.floor(y / cell);
    if (ix < 0 || iy < 0 || ix >= gridW || iy >= gridH) return regions[0];
    return regions[this.region[iy * gridW + ix]] ?? regions[0];
  }
}
