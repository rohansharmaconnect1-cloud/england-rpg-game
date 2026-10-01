/**
 * Offline data pipeline: Natural Earth (public domain) -> compact binary grids the game loads at runtime.
 *
 *   npm run build-data
 *
 * Outputs to public/data/:
 *   meta.json      grid size, cell size, England bounds, region ids
 *   land_sdf.bin   Int16 signed distance to coastline, 1/100 mile units (+ = land)
 *   eng_sdf.bin    Int16 signed distance to England's boundary (+ = inside England)
 *   region.bin     Uint8 region id per cell (0 = sea)
 *   rivers.json    projected river polylines (Natural Earth + hand-placed courses)
 */
import fs from 'node:fs';
import path from 'node:path';
import { project, WORLD_W, WORLD_H } from '../src/world/projection';
import { EXTRA_RIVERS, NE_RIVERS } from '../src/world/riverCourses';

const RAW = 'raw';
const OUT = 'public/data';
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const SOURCES: Record<string, string> = {
  'map_units.geojson': NE + 'ne_10m_admin_0_map_units.geojson',
  'rivers.geojson': NE + 'ne_10m_rivers_lake_centerlines.geojson',
  'rivers_eu.geojson': NE + 'ne_10m_rivers_europe.geojson',
};

const CELL = 0.5; // miles per grid cell
const GW = Math.ceil(WORLD_W / CELL);
const GH = Math.ceil(WORLD_H / CELL);
const BAND = 3; // miles of exact distance around each boundary
const SDF_CLAMP = 320;

const REGIONS: Record<string, number> = { ENG: 1, WLS: 2, SCT: 3, NIR: 4, IRL: 5, IMN: 6, FXX: 7 };
const REGION_NAMES = ['Sea', 'England', 'Wales', 'Scotland', 'Northern Ireland', 'Ireland', 'Isle of Man', 'The Continent'];

type Ring = [number, number][];
type Seg = [number, number, number, number];

async function ensureRaw() {
  fs.mkdirSync(RAW, { recursive: true });
  for (const [file, url] of Object.entries(SOURCES)) {
    const p = path.join(RAW, file);
    if (fs.existsSync(p) && fs.statSync(p).size > 1000) continue;
    console.log('downloading', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed ${url}: ${res.status}`);
    fs.writeFileSync(p, Buffer.from(await res.arrayBuffer()));
  }
}

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(path.join(RAW, file), 'utf8'));
}

function polysOf(geom: { type: string; coordinates: unknown }): [number, number][][][] {
  if (geom.type === 'Polygon') return [geom.coordinates as [number, number][][]];
  if (geom.type === 'MultiPolygon') return geom.coordinates as [number, number][][][];
  return [];
}

function rasterize(rings: Ring[], id: number, grid: Uint8Array) {
  const rows: number[][] = Array.from({ length: GH }, () => []);
  const segs: Seg[] = [];
  for (const r of rings) {
    for (let i = 0; i < r.length - 1; i++) {
      const [x0, y0] = r[i];
      const [x1, y1] = r[i + 1];
      if (y0 === y1) continue;
      const lo = Math.min(y0, y1);
      const hi = Math.max(y0, y1);
      const j0 = Math.max(0, Math.ceil(lo / CELL - 0.5));
      const j1 = Math.min(GH - 1, Math.ceil(hi / CELL - 0.5) - 1);
      if (j1 < j0) continue;
      const si = segs.push([x0, y0, x1, y1]) - 1;
      for (let j = j0; j <= j1; j++) rows[j].push(si);
    }
  }
  for (let j = 0; j < GH; j++) {
    const yc = (j + 0.5) * CELL;
    const xs: number[] = [];
    for (const si of rows[j]) {
      const [x0, y0, x1, y1] = segs[si];
      if (yc < Math.min(y0, y1) || yc >= Math.max(y0, y1)) continue;
      xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil(xs[k] / CELL - 0.5));
      const i1 = Math.min(GW - 1, Math.floor(xs[k + 1] / CELL - 0.5));
      for (let i = i0; i <= i1; i++) grid[j * GW + i] = id;
    }
  }
}

function segDist(px: number, py: number, s: Seg) {
  const [ax, ay, bx, by] = s;
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + t * dx - px;
  const qy = ay + t * dy - py;
  return Math.sqrt(qx * qx + qy * qy);
}

/** Signed distance field: exact within BAND miles of the boundary, chamfer-propagated beyond. */
function buildSdf(segs: Seg[], inside: (idx: number) => boolean): Int16Array {
  const B = 1;
  const bw = Math.ceil(WORLD_W / B);
  const bh = Math.ceil(WORLD_H / B);
  const buckets: number[][] = Array.from({ length: bw * bh }, () => []);
  segs.forEach((s, si) => {
    const x0 = Math.floor(Math.min(s[0], s[2]) / B);
    const x1 = Math.floor(Math.max(s[0], s[2]) / B);
    const y0 = Math.floor(Math.min(s[1], s[3]) / B);
    const y1 = Math.floor(Math.max(s[1], s[3]) / B);
    for (let y = Math.max(0, y0); y <= Math.min(bh - 1, y1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(bw - 1, x1); x++) buckets[y * bw + x].push(si);
  });
  const d = new Float32Array(GW * GH).fill(Infinity);
  const r = Math.ceil(BAND / B);
  for (let j = 0; j < GH; j++) {
    const py = (j + 0.5) * CELL;
    const by = Math.floor(py / B);
    for (let i = 0; i < GW; i++) {
      const px = (i + 0.5) * CELL;
      const bx = Math.floor(px / B);
      let best = Infinity;
      for (let y = Math.max(0, by - r); y <= Math.min(bh - 1, by + r); y++)
        for (let x = Math.max(0, bx - r); x <= Math.min(bw - 1, bx + r); x++)
          for (const si of buckets[y * bw + x]) {
            const dd = segDist(px, py, segs[si]);
            if (dd < best) best = dd;
          }
      if (best <= BAND) d[j * GW + i] = best;
    }
  }
  const w1 = CELL;
  const w2 = CELL * Math.SQRT2;
  const relax = (i: number, j: number, di: number, dj: number, w: number) => {
    const ni = i + di;
    const nj = j + dj;
    if (ni < 0 || nj < 0 || ni >= GW || nj >= GH) return;
    const v = d[nj * GW + ni] + w;
    if (v < d[j * GW + i]) d[j * GW + i] = v;
  };
  for (let j = 0; j < GH; j++)
    for (let i = 0; i < GW; i++) {
      relax(i, j, -1, 0, w1); relax(i, j, 0, -1, w1); relax(i, j, -1, -1, w2); relax(i, j, 1, -1, w2);
    }
  for (let j = GH - 1; j >= 0; j--)
    for (let i = GW - 1; i >= 0; i--) {
      relax(i, j, 1, 0, w1); relax(i, j, 0, 1, w1); relax(i, j, 1, 1, w2); relax(i, j, -1, 1, w2);
    }
  const out = new Int16Array(GW * GH);
  for (let k = 0; k < out.length; k++) {
    const v = Math.min(d[k], SDF_CLAMP) * (inside(k) ? 1 : -1);
    out[k] = Math.round(v * 100);
  }
  return out;
}

async function main() {
  await ensureRaw();
  fs.mkdirSync(OUT, { recursive: true });

  // --- Coastlines & borders -------------------------------------------------
  const mu = readJson('map_units.geojson');
  const region = new Uint8Array(GW * GH);
  const edgeCount = new Map<string, number>();
  const unitEdges: { code: string; a: [number, number]; b: [number, number] }[] = [];
  const unitRings = new Map<string, Ring[]>();
  const inBox = (lon: number, lat: number) => lon > -11 && lon < 8.5 && lat > 43.0 && lat < 57.5;

  for (const ft of mu.features) {
    const gu: string = ft.properties.GU_A3;
    const code = gu in REGIONS ? gu : ['BEL', 'NLD'].includes(ft.properties.ADM0_A3) ? 'FXX' : null;
    if (!code) continue;
    const rings: Ring[] = unitRings.get(code) ?? [];
    for (const poly of polysOf(ft.geometry)) {
      if (!poly[0].some(([lon, lat]) => inBox(lon, lat))) continue;
      for (const ring of poly) {
        rings.push(ring.map(([lon, lat]) => project(lon, lat)));
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i];
          const b = ring[i + 1];
          const ka = `${a[0].toFixed(6)},${a[1].toFixed(6)}`;
          const kb = `${b[0].toFixed(6)},${b[1].toFixed(6)}`;
          const key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
          edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
          unitEdges.push({ code, a, b });
        }
      }
    }
    unitRings.set(code, rings);
  }
  // Rasterize foreign units first so England wins any shared-edge cells.
  for (const code of ['FXX', 'IRL', 'NIR', 'IMN', 'SCT', 'WLS', 'ENG']) {
    const rings = unitRings.get(code);
    if (rings) rasterize(rings, REGIONS[code], region);
  }

  const coastSegs: Seg[] = [];
  const engSegs: Seg[] = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of unitEdges) {
    const ka = `${e.a[0].toFixed(6)},${e.a[1].toFixed(6)}`;
    const kb = `${e.b[0].toFixed(6)},${e.b[1].toFixed(6)}`;
    const key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
    const pa = project(e.a[0], e.a[1]);
    const pb = project(e.b[0], e.b[1]);
    const seg: Seg = [pa[0], pa[1], pb[0], pb[1]];
    if (edgeCount.get(key) === 1) coastSegs.push(seg);
    if (e.code === 'ENG') {
      engSegs.push(seg);
      x0 = Math.min(x0, pa[0]); x1 = Math.max(x1, pa[0]);
      y0 = Math.min(y0, pa[1]); y1 = Math.max(y1, pa[1]);
    }
  }
  console.log(`grid ${GW}x${GH}, coast segs ${coastSegs.length}, england segs ${engSegs.length}`);

  const landSdf = buildSdf(coastSegs, (k) => region[k] > 0);
  const engSdf = buildSdf(engSegs, (k) => region[k] === 1);
  fs.writeFileSync(path.join(OUT, 'land_sdf.bin'), Buffer.from(landSdf.buffer));
  fs.writeFileSync(path.join(OUT, 'eng_sdf.bin'), Buffer.from(engSdf.buffer));
  fs.writeFileSync(path.join(OUT, 'region.bin'), Buffer.from(region.buffer));

  // --- Rivers --------------------------------------------------------------
  const rivers: { name: string; rank: number; w0: number; w1: number; pts: number[] }[] = [];
  for (const file of ['rivers.geojson', 'rivers_eu.geojson']) {
    for (const ft of readJson(file).features) {
      const name: string | null = ft.properties.name;
      if (!name || !(name in NE_RIVERS) || !ft.geometry) continue;
      const g = ft.geometry;
      const lines: [number, number][][] = g.type === 'LineString' ? [g.coordinates] : g.coordinates;
      for (const line of lines) {
        if (!line.some(([lon, lat]) => inBox(lon, lat))) continue;
        const info = NE_RIVERS[name];
        rivers.push({ name, rank: info.rank, w0: info.width, w1: info.width, pts: line.flatMap(([lon, lat]) => project(lon, lat).map((v) => +v.toFixed(3))) });
      }
    }
  }
  for (const r of EXTRA_RIVERS) {
    rivers.push({ name: r.name, rank: r.rank, w0: r.width[0], w1: r.width[1], pts: r.pts.flatMap(([lon, lat]) => project(lon, lat).map((v) => +v.toFixed(3))) });
  }
  fs.writeFileSync(path.join(OUT, 'rivers.json'), JSON.stringify(rivers));

  const meta = {
    source: 'Natural Earth 1:10m admin-0 map units, rivers+lake centerlines, rivers Europe supplement (public domain)',
    cell: CELL,
    gridW: GW,
    gridH: GH,
    sdfScale: 0.01,
    worldW: WORLD_W,
    worldH: WORLD_H,
    englandBounds: [x0, y0, x1, y1].map((v) => +v.toFixed(2)),
    regions: REGION_NAMES,
  };
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log('rivers', rivers.length, 'meta', meta);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
