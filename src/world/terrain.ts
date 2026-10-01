import { CHUNK, texelMiles, chunkMiles } from './lod';
import { Mat, FOREIGN } from './materials';
import { compile, regionDist, FENS, FORESTS, LAKES, UPLANDS, type CompiledRegion } from './features';
import { fbmLod, hash01, hash32, perlin, ridgedLod, smoothstep, worley, W } from './noise';
import { WORLD_SEED } from './seed';
import type { WorldData } from './worldData';

/**
 * Chunk texel layout (RGBA8):
 *   R, A  height in 1/40 m steps offset by +300 m (16 bit, R = high byte)
 *   G     material id (see Mat, +FOREIGN for non-English land)
 *   B     base tone 0..7 on the material's palette ramp
 */
export const HEIGHT_OFFSET = 300;
export const HEIGHT_STEPS = 40;

const sub = (n: number) => hash32(WORLD_SEED, n, 0x51ed) & 0x7fffffff;
const S_COAST = sub(1), S_WARP = sub(3), S_BASE = sub(4), S_ROLL = sub(5), S_RIDGE = sub(6),
  S_DETAIL = sub(7), S_WILD = sub(9), S_PATCH = sub(10), S_PATCH2 = sub(11), S_FIELD = sub(12),
  S_FIELDROT = sub(13), S_TREE = sub(14), S_SCATTER = sub(15), S_STREAM = sub(16), S_STREAMMASK = sub(17),
  S_POOL = sub(18), S_MOOR = sub(19), S_TUFT = sub(20), S_MEANDER = sub(21), S_BEACH = sub(22), S_SEA = sub(23),
  S_FEN = sub(24), S_CANOPY = sub(25);

const UP = compile(UPLANDS);
const FO = compile(FORESTS);
const FE = compile(FENS);
const LK = compile(LAKES);

/** Ireland, Ulster and Man stay on the muted FOREIGN ramp; Wales, Scotland and France are tinted in the shader. */
const MUTED_REGION = new Set([4, 5, 6]);

/** How far terrain features get pushed around by the large-scale domain warp, in miles. */
const WARP = 5;

export const debugFlags = { noCull: false };

function cull(list: CompiledRegion[], x0: number, y0: number, x1: number, y1: number) {
  if (debugFlags.noCull) return list;
  const m = WARP + 1;
  return list.filter((r) => r.x1 > x0 - m && r.x0 < x1 + m && r.y1 > y0 - m && r.y0 < y1 + m);
}

function clampTone(t: number): number {
  return t < 0 ? 0 : t > 7 ? 7 : Math.round(t);
}

export class TerrainGenerator {
  constructor(private readonly world: WorldData) {}

  /** Generate one chunk of LOD k at chunk coords (cx, cy). Pure function of (seed, k, cx, cy). */
  generate(k: number, cx: number, cy: number, out = new Uint8Array(CHUNK * CHUNK * 4)): Uint8Array {
    const world = this.world;
    const rivers = world.rivers;
    const t = texelMiles(k);
    const cm = chunkMiles(k);
    const ups = cull(UP, cx * cm, cy * cm, (cx + 1) * cm, (cy + 1) * cm);
    const fos = cull(FO, cx * cm, cy * cm, (cx + 1) * cm, (cy + 1) * cm);
    const fes = cull(FE, cx * cm, cy * cm, (cx + 1) * cm, (cy + 1) * cm);
    const lks = cull(LK, cx * cm, cy * cm, (cx + 1) * cm, (cy + 1) * cm);
    const maxRank = k >= 2 ? 3 : k >= 1 ? 2 : 1;

    for (let j = 0; j < CHUNK; j++) {
      const iy = cy * CHUNK + j;
      const y = (iy + 0.5) * t;
      for (let i = 0; i < CHUNK; i++) {
        const ix = cx * CHUNK + i;
        const x = (ix + 0.5) * t;
        const o = (j * CHUNK + i) * 4;

        // ---- Coastline ------------------------------------------------------
        const landRaw = world.land(x, y);
        let sdf = landRaw;
        if (sdf > -3 && sdf < 3) sdf += fbmLod(x, y, S_COAST, 1 / 2.5, 6, t) * 0.4;

        let mat: number;
        let tone = 4;
        let h: number;

        if (sdf <= 0) {
          const d = -sdf;
          if (d < 0.3 + t) {
            mat = Mat.Shallow;
            if (k >= 3 && d < Math.max(0.6 * t, 0.02)) tone = 6;
          } else {
            mat = Mat.Deep;
            const band = d + fbmLod(x, y, S_SEA, 1 / 8, 3, t) * 2.5;
            tone = 5 - Math.min(3, Math.floor(band / 6));
          }
          h = -(2 + d * 15);
          writeTexel(out, o, h, mat, tone);
          continue;
        }

        // ---- Nationality ----------------------------------------------------
        const engRaw = world.england(x, y);
        const inland = landRaw - engRaw > 0.02;
        const foreign = inland && MUTED_REGION.has(world.regionIdNear(x, y));

        // ---- Large-scale landscape regions ----------------------------------
        const wx = x + perlin(x / 18, y / 18, S_WARP) * WARP;
        const wy = y + perlin(x / 18 + 31.7, y / 18, S_WARP) * WARP;
        let up = 0;
        for (const r of ups) {
          const q = regionDist(r, wx, wy);
          if (q < 1) {
            const v = r.value * smoothstep(1, 0, q);
            if (v > up) up = v;
          }
        }
        let fo = 0;
        for (const r of fos) {
          const q = regionDist(r, wx, wy);
          if (q < 1) {
            const v = smoothstep(1.1, 0.3, q) * r.value;
            if (v > fo) fo = v;
          }
        }
        let fe = 0;
        for (const r of fes) {
          const q = regionDist(r, wx, wy);
          if (q < 1) {
            const v = smoothstep(1, 0.4, q) * r.value;
            if (v > fe) fe = v;
          }
        }

        // ---- Height (metres) -------------------------------------------------
        const detail = fbmLod(x, y, S_DETAIL, 1 / 7, 8, t);
        const ridge = ridgedLod(x, y, S_RIDGE, 1 / 4, 7, t);
        h = 25 + 40 * (perlin(x / 45, y / 45, S_BASE) * 0.5 + 0.5) + 22 * fbmLod(x, y, S_ROLL, 1 / 9, 6, t);
        h += up * (0.7 + 0.6 * detail + 0.7 * (ridge - 0.5));
        h *= 0.3 + 0.7 * smoothstep(0, 4, sdf);

        const mx = x + fbmLod(x, y, S_MEANDER, 1 / 2.5, 4, t) * 0.35;
        const my = y + fbmLod(x + 57.3, y, S_MEANDER, 1 / 2.5, 4, t) * 0.35;
        rivers.query(mx, my, maxRank, 0.55 * t);
        h += (h * 0.3 + 2 - h) * rivers.valley * 0.8;

        const fen = fe > 0 ? smoothstep(0.35, 0.65, fe + 0.45 * fbmLod(x, y, S_FEN, 1 / 4, 7, t)) : 0;
        h += (2.5 - h) * fen;
        let lake = false;
        for (const r of lks) {
          let q = regionDist(r, mx, my);
          if (q > 4) continue;
          q += fbmLod(x, y, S_POOL + 3, 1 / 0.6, 4, t) * 0.5;
          h += (h * 0.25 - h) * smoothstep(3, 1, q);
          if (q < 1 || (k >= 1 && r.rx * (q - 1) < 0.5 * t)) lake = true;
        }
        if (h < 0.5) h = 0.5;

        // ---- Surface material -------------------------------------------------
        const n1 = fbmLod(x, y, S_MOOR, 1 / 3, 5, t);

        const roughness = 90 * n1 + 55 * fbmLod(x, y, S_MOOR + 9, 1, 5, t);
        if (rivers.water < 0 || lake) {
          mat = Mat.River;
        } else if (k >= 2 && sdf < Math.max(0.07, 0.6 * t) && h < 40 && perlin(x / 4, y / 4, S_BEACH) > -0.2) {
          mat = Mat.Sand;
          if (k >= 5) tone = 4 + (hash01(ix, iy, S_TUFT) < 0.1 ? 1 : 0);
        } else if (fen > 0.5 && h < 10) {
          mat = Mat.Fen;
          tone = 4 + fbmLod(x, y, S_FEN + 1, 1 / 8, 8, t) * 3.5;
          if (k >= 3 && fbmLod(x, y, S_POOL, 1 / 0.5, 4, t) > 0.3) {
            mat = Mat.River;
            tone = 3;
          } else if (k >= 5 && hash01(ix, iy, S_TUFT) < 0.12) {
            tone += 1;
          }
        } else if (h + roughness > 660) {
          mat = Mat.Rock;
          tone = 4 + n1 * 3;
        } else if (h + roughness > 250 && up > 300) {
          mat = Mat.Moor;
          tone = 4 + fbmLod(x, y, S_MOOR + 5, 1 / 1.2, 5, t) * 2.2;
          if (k >= 5 && hash01(ix, iy, S_TUFT + 1) < 0.08) tone -= 1;
        } else if (k >= 4 && h < 300 && rivers.water > 0.3 && this.stream(x, y, t)) {
          mat = Mat.River;
          tone = 3;
        } else {
          const wild = fbmLod(x, y, S_WILD, 1 / 9, 5, t);
          const edge = fbmLod(x, y, S_WILD + 3, 1 / 1.8, 6, t);
          const fv = fo * 0.8 + 0.45 * wild + 0.5 * edge - 0.1 - Math.max(0, (h - 200) / 250);
          if (fv > 0.42) {
            mat = Mat.Forest;
            tone = this.canopy(x, y, t, k);
          } else {
            const farmBias = 0.1 + 0.3 * Math.min(1, Math.max(0, (x - 140) / 180)) - h / 350;
            if (fbmLod(x, y, S_PATCH, 1 / 7, 3, t) + farmBias > 0.12) {
              const f = this.fields(x, y, t, k);
              mat = f.mat;
              tone = f.tone;
            } else {
              mat = Mat.Grass;
              tone = 4 + fbmLod(x, y, S_TUFT + 3, 1 / 3, 7, t) * 2.6;
              if (k >= 5 && hash01(ix, iy, S_TUFT + 2) < 0.05) tone += 1;
            }
            // Near forest edges and in hedgerows, scattered tree clusters appear when zoomed in.
            if (k >= 5 && mat !== Mat.Hedge) {
              const density = mat === Mat.Grass ? 0.1 : 0.04;
              const tr = this.scatterTree(x, y, density + Math.max(0, fv - 0.25) * 1.2);
              if (tr > 0) {
                mat = Mat.Forest;
                tone = tr;
              } else if (tr < 0) {
                tone -= 2;
              }
            }
          }
        }
        if (foreign && mat !== Mat.Border) mat += FOREIGN;
        writeTexel(out, o, h, mat, clampTone(tone));
      }
    }
    return out;
  }

  private stream(x: number, y: number, t: number): boolean {
    if (perlin(x / 9, y / 9, S_STREAMMASK) < 0.3) return false;
    const sv = fbmLod(x, y, S_STREAM, 1 / 2.5, 3, t);
    const w = 0.5 * Math.max(t, 0.025);
    if (Math.abs(sv) > w * 1.5) return false;
    // Normalise by the gradient so the stream stays ~1 texel wide instead of pooling in flat spots.
    const e = 0.05;
    const gx = (fbmLod(x + e, y, S_STREAM, 1 / 2.5, 3, t) - sv) / e;
    const gy = (fbmLod(x, y + e, S_STREAM, 1 / 2.5, 3, t) - sv) / e;
    return Math.abs(sv) / Math.max(Math.hypot(gx, gy), 0.05) < w;
  }

  /** Forest canopy tone: blotchy at mid zoom, individual lit crowns when fully zoomed in. */
  private canopy(x: number, y: number, t: number, k: number): number {
    const c = fbmLod(x, y, S_CANOPY, 1 / 2.5, 7, t);
    if (k < 6) return 4 + c * 3;
    const cell = 0.06;
    worley(x / cell, y / cell, S_TREE, 0.9);
    const r = 0.5 + 0.25 * ((W.id >>> 8) & 255) / 255;
    if (W.f1 < r) return 4 + (-(W.dx + W.dy) / r) * 1.4 + c;
    return 1;
  }

  /** >0: tree crown tone at this point; <0: in a tree's shadow; 0: open ground. */
  private scatterTree(x: number, y: number, density: number): number {
    const cell = 0.14;
    worley(x / cell, y / cell, S_SCATTER, 0.8);
    if (((W.id >>> 4) & 1023) / 1023 >= density) return 0;
    const r = (0.03 + 0.02 * ((W.id >>> 16) & 255) / 255) / cell;
    if (W.f1 < r) return 4 + (-(W.dx + W.dy) / r) * 1.4;
    const sx = W.dx - 0.6 * r;
    const sy = W.dy - 0.6 * r;
    if (sx * sx + sy * sy < r * r) return -1;
    return 0;
  }

  private readonly fieldOut = { mat: 0, tone: 4 };

  /** Arable land: coarse patchwork far out; hedged parcels, then strip furrows as you zoom in. */
  private fields(x: number, y: number, t: number, k: number) {
    const out = this.fieldOut;
    if (k < 3) {
      const p2 = fbmLod(x, y, S_PATCH2, 1 / 2.2, 4, t);
      out.mat = p2 > 0.15 ? Mat.FieldGold : p2 < -0.2 ? Mat.FieldBrown : Mat.FieldGreen;
      out.tone = 4;
      return out;
    }
    // Field orientation is constant per ~7-mile district (like a parish's open-field layout).
    const dx = x + perlin(x / 2, y / 2, S_FIELDROT + 1) * 0.8;
    const dy = y + perlin(x / 2 + 19.1, y / 2, S_FIELDROT + 1) * 0.8;
    worley(dx / 7, dy / 7, S_FIELDROT, 0.9);
    const ang = ((W.id >>> 5) & 1023) / 1023 * Math.PI;
    // District boundaries become country lanes when zoomed in.
    if (k >= 5 && (W.f2 - W.f1) * 7 < 0.9 * t) {
      out.mat = Mat.Path;
      out.tone = 4;
      return out;
    }
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    if (k < 5) {
      // Mid zoom: big open-field blocks (a mile or so), faint boundaries at k=4.
      const bx = k === 3 ? 2.4 : 1.2;
      const by = k === 3 ? 1.7 : 0.85;
      worley((x * ca - y * sa) / bx, (x * sa + y * ca) / by, S_FIELD + 7, 0.8);
      const id = W.id;
      const crop = (id >>> 8) % 100;
      out.mat = crop < 40 ? Mat.FieldGold : crop < 85 ? Mat.FieldGreen : Mat.FieldBrown;
      out.tone = 4 + (((id >>> 3) % 3) - 1) * 0.6;
      if (k === 4 && W.f2 - W.f1 < (0.45 * t) / by) out.tone -= 1;
      return out;
    }
    const sx = 0.36;
    const sy = 0.26;
    const rx = (x * ca - y * sa) / sx;
    const ry = (x * sa + y * ca) / sy;
    worley(rx, ry, S_FIELD, 0.8);
    const id = W.id;
    const crop = (id >>> 8) % 100;
    out.mat = crop < 42 ? Mat.FieldGold : crop < 72 ? Mat.FieldGreen : crop < 88 ? Mat.FieldBrown : Mat.Grass;
    out.tone = 4 + (((id >>> 3) % 3) - 1) * 0.6;
    if (k >= 5 && W.f2 - W.f1 < (0.45 * t) / sy) {
      out.mat = Mat.Hedge;
      out.tone = k >= 5 ? 2 + ((id >>> 12) % 3) : 3;
      return out;
    }
    if (k >= 6 && (out.mat === Mat.FieldGold || out.mat === Mat.FieldBrown)) {
      const along = id & 1 ? rx * sx : ry * sy;
      if (Math.floor(along / 0.05) & 1) out.tone -= 1;
    }
    return out;
  }
}

function writeTexel(out: Uint8Array, o: number, h: number, mat: number, tone: number) {
  let hq = Math.round((h + HEIGHT_OFFSET) * HEIGHT_STEPS);
  hq = hq < 0 ? 0 : hq > 65535 ? 65535 : hq;
  out[o] = hq >> 8;
  out[o + 1] = mat;
  out[o + 2] = tone < 0 ? 0 : tone > 7 ? 7 : Math.round(tone);
  out[o + 3] = hq & 255;
}
