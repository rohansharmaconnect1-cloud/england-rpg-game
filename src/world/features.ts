import { project } from './projection';

/**
 * Real-world landscape regions that steer the procedural terrain. Positions are (lon, lat) and sizes
 * in miles; they're rough footprints of the real uplands, medieval royal forests, and wetlands.
 */
export interface Region {
  name: string;
  /** Either a single centre (ellipse) or a chain of points (capsule of radius rx). */
  pts: [number, number][];
  rx: number;
  ry: number;
  /** Rotation in degrees (ellipses only). */
  rot?: number;
  /** Peak height in metres (uplands) or strength 0..1 (forests, fens). */
  value: number;
}

export const UPLANDS: Region[] = [
  { name: 'Lake District', pts: [[-3.08, 54.48]], rx: 23, ry: 20, value: 950 },
  { name: 'North Pennines', pts: [[-2.35, 54.95], [-2.3, 54.55]], rx: 18, ry: 18, value: 680 },
  { name: 'Yorkshire Dales', pts: [[-2.3, 54.45], [-2.0, 54.05]], rx: 18, ry: 18, value: 620 },
  { name: 'South Pennines', pts: [[-2.05, 53.95], [-1.95, 53.55]], rx: 14, ry: 14, value: 450 },
  { name: 'Peak District', pts: [[-1.85, 53.5], [-1.7, 53.15]], rx: 13, ry: 13, value: 520 },
  { name: 'Forest of Bowland', pts: [[-2.5, 53.97]], rx: 9, ry: 6, value: 450 },
  { name: 'Cheviots', pts: [[-2.2, 55.42]], rx: 12, ry: 9, rot: 30, value: 720 },
  { name: 'Northumberland uplands', pts: [[-2.45, 55.15]], rx: 18, ry: 10, rot: 20, value: 380 },
  { name: 'North York Moors', pts: [[-0.95, 54.38]], rx: 20, ry: 10, value: 420 },
  { name: 'Yorkshire Wolds', pts: [[-0.7, 53.75], [-0.5, 54.1], [-0.25, 54.13]], rx: 6, ry: 6, value: 190 },
  { name: 'Lincolnshire Wolds', pts: [[-0.3, 53.55], [0.05, 53.2]], rx: 5, ry: 5, value: 150 },
  { name: 'Cotswolds', pts: [[-2.35, 51.45], [-2.05, 51.85], [-1.6, 52.1]], rx: 9, ry: 9, value: 300 },
  { name: 'Chilterns', pts: [[-1.1, 51.55], [-0.4, 51.9]], rx: 5, ry: 5, value: 250 },
  { name: 'North Downs', pts: [[-0.8, 51.23], [0.3, 51.3], [1.1, 51.15]], rx: 4, ry: 4, value: 230 },
  { name: 'South Downs', pts: [[-1.05, 50.97], [-0.3, 50.88], [0.2, 50.78]], rx: 4.5, ry: 4.5, value: 240 },
  { name: 'Salisbury Plain', pts: [[-1.85, 51.25]], rx: 11, ry: 7, value: 200 },
  { name: 'North Wessex Downs', pts: [[-1.5, 51.5]], rx: 12, ry: 5, value: 260 },
  { name: 'Mendips', pts: [[-2.95, 51.3], [-2.45, 51.25]], rx: 3.5, ry: 3.5, value: 300 },
  { name: 'Quantocks', pts: [[-3.2, 51.12]], rx: 3, ry: 5, rot: -30, value: 350 },
  { name: 'Exmoor', pts: [[-3.65, 51.12]], rx: 11, ry: 6, value: 500 },
  { name: 'Dartmoor', pts: [[-3.92, 50.58]], rx: 10, ry: 11, value: 600 },
  { name: 'Bodmin Moor', pts: [[-4.6, 50.56]], rx: 6, ry: 5, value: 400 },
  { name: 'Blackdown Hills', pts: [[-3.1, 50.9]], rx: 8, ry: 4, value: 280 },
  { name: 'Dorset Downs', pts: [[-2.8, 50.8], [-2.0, 50.88]], rx: 5, ry: 5, value: 250 },
  { name: 'Malvern Hills', pts: [[-2.34, 52.03], [-2.33, 52.14]], rx: 1.6, ry: 1.6, value: 420 },
  { name: 'Shropshire Hills', pts: [[-2.85, 52.52]], rx: 8, ry: 8, value: 500 },
  { name: 'Forest of Dean plateau', pts: [[-2.55, 51.8]], rx: 5, ry: 5, value: 280 },
  // Neighbouring lands (drawn greyed)
  { name: 'Snowdonia', pts: [[-3.95, 53.0]], rx: 14, ry: 14, value: 1050 },
  { name: 'Cambrian Mountains', pts: [[-3.7, 52.35]], rx: 22, ry: 28, value: 650 },
  { name: 'Brecon Beacons', pts: [[-3.45, 51.88]], rx: 22, ry: 8, value: 820 },
  { name: 'Black Mountains', pts: [[-3.1, 51.95]], rx: 7, ry: 6, value: 700 },
  { name: 'Preseli Hills', pts: [[-4.75, 51.95]], rx: 8, ry: 4, value: 500 },
  { name: 'Clwydian Range', pts: [[-3.3, 53.1]], rx: 4, ry: 8, value: 500 },
  { name: 'Southern Uplands', pts: [[-4.5, 55.25], [-3.5, 55.45], [-2.8, 55.65]], rx: 16, ry: 16, value: 650 },
  { name: 'Pentland Hills', pts: [[-3.3, 55.85]], rx: 8, ry: 4, value: 520 },
  { name: 'Highlands edge', pts: [[-4.6, 56.25]], rx: 35, ry: 20, value: 900 },
  { name: 'Isle of Man', pts: [[-4.5, 54.25]], rx: 4, ry: 6, value: 600 },
  { name: 'Mourne Mountains', pts: [[-6.0, 54.17]], rx: 7, ry: 5, value: 750 },
  { name: 'Wicklow Mountains', pts: [[-6.4, 53.05]], rx: 15, ry: 20, value: 850 },
];

export const FORESTS: Region[] = [
  { name: 'New Forest', pts: [[-1.6, 50.87]], rx: 9, ry: 7, value: 1 },
  { name: 'Sherwood Forest', pts: [[-1.1, 53.17]], rx: 5, ry: 10, value: 1 },
  { name: 'Forest of Dean', pts: [[-2.55, 51.8]], rx: 5, ry: 5, value: 1 },
  { name: 'Forest of Essex', pts: [[0.1, 51.68], [0.6, 51.85]], rx: 5, ry: 5, value: 0.8 },
  { name: 'Savernake', pts: [[-1.65, 51.38]], rx: 4, ry: 3, value: 0.9 },
  { name: 'Forest of Arden', pts: [[-1.7, 52.33]], rx: 10, ry: 8, value: 0.85 },
  { name: 'The Weald (Andredes weald)', pts: [[-0.6, 51.05], [0.3, 51.05], [0.8, 51.05]], rx: 10, ry: 10, value: 1 },
  { name: 'Rockingham Forest', pts: [[-0.65, 52.5]], rx: 9, ry: 4, rot: 30, value: 0.9 },
  { name: 'Selwood', pts: [[-2.35, 51.15]], rx: 4, ry: 6, value: 0.85 },
  { name: 'Windsor Forest', pts: [[-0.7, 51.43]], rx: 7, ry: 4, value: 0.9 },
  { name: 'Inglewood Forest', pts: [[-2.85, 54.75]], rx: 6, ry: 8, value: 0.9 },
  { name: 'Forest of Galtres', pts: [[-1.15, 54.08]], rx: 5, ry: 5, value: 0.9 },
  { name: 'Charnwood', pts: [[-1.25, 52.72]], rx: 4, ry: 4, value: 0.8 },
  { name: 'Wychwood', pts: [[-1.55, 51.85]], rx: 4, ry: 3, value: 0.85 },
  { name: 'Bernwood', pts: [[-1.05, 51.8]], rx: 4, ry: 3, value: 0.8 },
  { name: 'Cannock Chase', pts: [[-2.0, 52.73]], rx: 5, ry: 4, value: 0.9 },
  { name: 'Kinver', pts: [[-2.25, 52.45]], rx: 4, ry: 4, value: 0.8 },
  { name: 'Feckenham', pts: [[-2.0, 52.25]], rx: 5, ry: 4, value: 0.8 },
  { name: 'Macclesfield Forest', pts: [[-2.05, 53.25]], rx: 5, ry: 5, value: 0.7 },
  { name: 'Pickering Forest', pts: [[-0.8, 54.28]], rx: 6, ry: 3, value: 0.8 },
  { name: 'Knaresborough Forest', pts: [[-1.55, 54.0]], rx: 5, ry: 4, value: 0.8 },
  { name: 'Delamere', pts: [[-2.65, 53.22]], rx: 4, ry: 4, value: 0.85 },
  { name: 'Salcey & Whittlewood', pts: [[-0.95, 52.1]], rx: 6, ry: 4, value: 0.85 },
  { name: 'Clarendon', pts: [[-1.73, 51.06]], rx: 3, ry: 3, value: 0.8 },
  { name: 'Blackmore Vale', pts: [[-2.35, 50.9]], rx: 6, ry: 4, value: 0.75 },
  { name: 'Hatfield Forest', pts: [[0.23, 51.85]], rx: 2.5, ry: 2.5, value: 0.8 },
  { name: 'Kielder', pts: [[-2.55, 55.2]], rx: 8, ry: 6, value: 0.6 },
];

export const FENS: Region[] = [
  { name: 'The Fens', pts: [[-0.18, 52.92], [-0.08, 52.55], [0.15, 52.33]], rx: 14, ry: 14, value: 1 },
  { name: 'Marshland (Wash shore)', pts: [[0.1, 52.78], [0.3, 52.72]], rx: 9, ry: 9, value: 0.9 },
  { name: 'Somerset Levels', pts: [[-2.9, 51.15]], rx: 9, ry: 6, value: 1 },
  { name: 'Humberhead Levels', pts: [[-0.9, 53.6]], rx: 7, ry: 5, value: 0.9 },
  { name: 'Romney Marsh', pts: [[0.9, 51.0]], rx: 5, ry: 4, value: 1 },
  { name: 'The Broads', pts: [[1.55, 52.68]], rx: 6, ry: 5, value: 0.85 },
  { name: 'Lancashire mosses', pts: [[-2.95, 53.6]], rx: 5, ry: 6, value: 0.75 },
];

/** Real lakes too small for Natural Earth at 1:10m. rx = half-width in miles along the axis `pts`. */
export const LAKES: Region[] = [
  { name: 'Windermere', pts: [[-2.95, 54.41], [-2.93, 54.36], [-2.96, 54.28]], rx: 0.35, ry: 0.35, value: 1 },
  { name: 'Ullswater', pts: [[-2.93, 54.53], [-2.9, 54.57], [-2.82, 54.61]], rx: 0.3, ry: 0.3, value: 1 },
  { name: 'Derwentwater', pts: [[-3.15, 54.6], [-3.16, 54.56]], rx: 0.45, ry: 0.45, value: 1 },
  { name: 'Bassenthwaite Lake', pts: [[-3.19, 54.63], [-3.23, 54.69]], rx: 0.3, ry: 0.3, value: 1 },
  { name: 'Coniston Water', pts: [[-3.07, 54.38], [-3.06, 54.31]], rx: 0.22, ry: 0.22, value: 1 },
  { name: 'Wast Water', pts: [[-3.26, 54.46], [-3.32, 54.43]], rx: 0.2, ry: 0.2, value: 1 },
  { name: 'Haweswater', pts: [[-2.84, 54.53], [-2.79, 54.5]], rx: 0.18, ry: 0.18, value: 1 },
  { name: 'Thirlmere', pts: [[-3.07, 54.56], [-3.06, 54.52]], rx: 0.15, ry: 0.15, value: 1 },
  { name: 'Ennerdale Water', pts: [[-3.41, 54.52], [-3.37, 54.51]], rx: 0.2, ry: 0.2, value: 1 },
  { name: 'Bala Lake', pts: [[-3.63, 52.9], [-3.57, 52.87]], rx: 0.3, ry: 0.3, value: 1 },
  { name: 'Whittlesey Mere', pts: [[-0.23, 52.49]], rx: 1.0, ry: 0.8, value: 1 },
];

/** Region compiled to world miles for fast evaluation. */
export interface CompiledRegion {
  name: string;
  xs: Float64Array;
  ys: Float64Array;
  rx: number;
  ry: number;
  cos: number;
  sin: number;
  value: number;
  /** World-space bounding box including radius. */
  x0: number; y0: number; x1: number; y1: number;
}

export function compile(regions: Region[]): CompiledRegion[] {
  return regions.map((r) => {
    const p = r.pts.map(([lon, lat]) => project(lon, lat));
    const xs = Float64Array.from(p.map((q) => q[0]));
    const ys = Float64Array.from(p.map((q) => q[1]));
    const rad = Math.max(r.rx, r.ry);
    const a = ((r.rot ?? 0) * Math.PI) / 180;
    return {
      name: r.name, xs, ys, rx: r.rx, ry: r.ry, cos: Math.cos(a), sin: Math.sin(a), value: r.value,
      x0: Math.min(...xs) - rad, y0: Math.min(...ys) - rad, x1: Math.max(...xs) + rad, y1: Math.max(...ys) + rad,
    };
  });
}

/** Normalised distance from a region's core: 0 at centre/spine, 1 at edge. */
export function regionDist(r: CompiledRegion, x: number, y: number): number {
  if (r.xs.length === 1) {
    const dx = x - r.xs[0];
    const dy = y - r.ys[0];
    const u = (dx * r.cos + dy * r.sin) / r.rx;
    const v = (-dx * r.sin + dy * r.cos) / r.ry;
    return Math.sqrt(u * u + v * v);
  }
  let best = Infinity;
  for (let i = 0; i < r.xs.length - 1; i++) {
    const ax = r.xs[i], ay = r.ys[i];
    const bx = r.xs[i + 1], by = r.ys[i + 1];
    const dx = bx - ax, dy = by - ay;
    const l2 = dx * dx + dy * dy;
    let t = ((x - ax) * dx + (y - ay) * dy) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + t * dx - x;
    const qy = ay + t * dy - y;
    const d = qx * qx + qy * qy;
    if (d < best) best = d;
  }
  return Math.sqrt(best) / r.rx;
}
