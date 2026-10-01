import { C, MASTER, rgb } from '../assets/palette';
import { MATERIAL_COUNT, TONES, FOREIGN, Mat } from '../world/materials';

export type MapSeason = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

/**
 * Eight-tone ramps per material, darkest first, as indices into the master palette. Ramps share
 * entries (e.g. forest and grass meet at moss) the way hand-made pixel art reuses a small palette;
 * dithering between neighbouring tones supplies the in-between shades.
 */
const RAMPS: Record<number, number[]> = {
  [Mat.Deep]: [24, 24, 24, 25, 25, 26, 27, 28],
  [Mat.Shallow]: [25, 25, 26, 26, 27, 27, 28, 10],
  [Mat.River]: [24, 25, 25, 26, 26, 27, 28, 10],
  [Mat.Sand]: [5, 6, 6, 7, 8, 8, 9, 10],
  [Mat.Grass]: [18, 19, 19, 20, 21, 21, 22, 23],
  [Mat.FieldGold]: [4, 15, 15, 16, 16, 17, 17, 9],
  [Mat.FieldGreen]: [19, 20, 21, 21, 22, 22, 23, 23],
  [Mat.FieldBrown]: [3, 4, 4, 5, 5, 6, 6, 7],
  [Mat.Forest]: [0, 18, 18, 19, 19, 20, 20, 21],
  [Mat.Fen]: [18, 18, 19, 29, 29, 29, 27, 28],
  [Mat.Moor]: [1, 2, 2, 2, 5, 5, 6, 7],
  [Mat.Rock]: [1, 3, 30, 30, 30, 31, 31, 9],
  [Mat.Hedge]: [0, 18, 18, 18, 19, 19, 20, 20],
  [Mat.Border]: [11, 11, 12, 12, 12, 13, 13, 14],
  [Mat.Path]: [3, 3, 4, 4, 5, 5, 6, 7],
  [Mat.Spare]: [18, 19, 19, 20, 21, 21, 22, 23],
};

/** Muted master entries used for lands outside the game's active realm, ordered dark -> light. */
const MUTED = [C.aubergine, C.ink, C.sepia, C.umber, C.stone, C.tan, C.stoneLight, C.parchmentDark, C.parchment];

function lum([r, g, b]: [number, number, number]) {
  return 0.3 * r + 0.59 * g + 0.11 * b;
}

/** Neighbouring realms: the nearest-luminance muted palette entry, so they read as faded parchment. */
function foreignize(i: number): number {
  const l = lum(rgb(i)) * 0.92 + 14;
  let best = MUTED[0];
  let bd = Infinity;
  for (const m of MUTED) {
    const d = Math.abs(lum(rgb(m)) - l);
    if (d < bd) {
      bd = d;
      best = m;
    }
  }
  return best;
}

/** RGBA8 texture data: width = TONES, height = MATERIAL_COUNT. */
export function buildPalette(season: MapSeason = 'Spring'): Uint8Array {
  const data = new Uint8Array(TONES * MATERIAL_COUNT * 4);
  for (let m = 0; m < MATERIAL_COUNT; m++) {
    const base = m % FOREIGN;
    const ramp = RAMPS[base] ?? RAMPS[Mat.Grass];
    for (let t = 0; t < TONES; t++) {
      let idx = seasonIndex(ramp[t], base, season);
      if (m >= FOREIGN && base > Mat.River) idx = foreignize(idx);
      const c = rgb(idx);
      const o = (m * TONES + t) * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  }
  return data;
}

/** Shift ramp indices inside the 32-colour bible — spring green, summer gold, autumn rust, winter frost. */
function seasonIndex(i: number, mat: number, season: MapSeason): number {
  if (mat <= Mat.River) {
    if (season === 'Winter') return i === 10 ? 31 : i === 28 ? 31 : i;
    return i;
  }
  if (season === 'Spring') {
    if (i === 15 || i === 16) return 21;
    if (i === 5) return 20;
    return i;
  }
  if (season === 'Summer') {
    if (i === 22) return 23;
    if (i === 21) return 17;
    if (i === 20) return 16;
    return i;
  }
  if (season === 'Autumn') {
    if (i === 23 || i === 22) return 7;
    if (i === 21) return 6;
    if (i === 20) return 13;
    if (i === 19) return 5;
    if (i === 17) return 14;
    return i;
  }
  // Winter: greens bleach toward stone and parchment; golds go ashen.
  if (i === 23 || i === 22) return 31;
  if (i === 21 || i === 20) return 30;
  if (i === 19) return 2;
  if (i === 18) return 1;
  if (i === 16 || i === 17) return 9;
  if (i === 15) return 7;
  return i;
}

/** Colours used by the 2D map overlay (icons, labels), taken from the master palette. */
export const UI = {
  ink: MASTER[C.ink],
  inkSoft: MASTER[C.sepia],
  parchment: MASTER[C.parchmentLight],
  parchmentDark: MASTER[C.parchmentDark],
  roof: MASTER[C.madder],
  roofDark: MASTER[C.madderDark],
  stone: MASTER[C.stoneLight],
  stoneDark: MASTER[C.stone],
  banner: MASTER[C.saffron],
  mutedStone: MASTER[C.stone],
  mutedRoof: MASTER[C.umber],
  foam: MASTER[C.foam],
};
