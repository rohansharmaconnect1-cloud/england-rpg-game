import { MATERIAL_COUNT, TONES, FOREIGN, Mat } from '../world/materials';

/** Eight-tone ramps per material, darkest first. Warm, slightly storybook. */
const RAMPS: Record<number, string[]> = {
  [Mat.Deep]: ['#0f2238', '#15304a', '#1b3d5a', '#22496a', '#2a567a', '#34648a', '#4a7c9e', '#6d9ab5'],
  [Mat.Shallow]: ['#1f4a63', '#2a5d75', '#357086', '#438296', '#5595a5', '#6eaab3', '#93c4c4', '#d6ecdf'],
  [Mat.River]: ['#1e4760', '#285a73', '#336c85', '#3f7d94', '#4e8fa3', '#62a3b2', '#86bfc5', '#cde6de'],
  [Mat.Sand]: ['#7a6440', '#947a4e', '#ad915d', '#c4a86e', '#d6bc82', '#e3cd97', '#eedcaf', '#f7ecc9'],
  [Mat.Grass]: ['#2a3f22', '#3a5428', '#4b6a2e', '#5e7f35', '#74933d', '#8ca64a', '#a8ba5e', '#c8d07c'],
  [Mat.FieldGold]: ['#5a4a22', '#76612a', '#917933', '#aa903e', '#c1a64c', '#d4ba5e', '#e3cd75', '#f0e098'],
  [Mat.FieldGreen]: ['#34471f', '#455c26', '#58722d', '#6c8735', '#819b3e', '#97ae4c', '#b0c263', '#cad883'],
  [Mat.FieldBrown]: ['#3e2c1e', '#533b27', '#694b31', '#7e5c3b', '#926d47', '#a68057', '#b9956c', '#cdaf8a'],
  [Mat.Forest]: ['#142417', '#1b3220', '#24412a', '#2e5033', '#3a603b', '#4a7145', '#5e8452', '#789a63'],
  [Mat.Fen]: ['#1f3b36', '#284b42', '#335d4f', '#3f6f5b', '#4c8267', '#5f9574', '#7aab86', '#a0c49f'],
  [Mat.Moor]: ['#3a2a30', '#4c3639', '#5e4442', '#71544b', '#846656', '#967964', '#a98e77', '#bea690'],
  [Mat.Rock]: ['#2e2c2c', '#3f3c3a', '#524e4a', '#66615b', '#7b756d', '#908a80', '#a8a295', '#c4bfb0'],
  [Mat.Hedge]: ['#111c12', '#172618', '#1f321f', '#284027', '#324e30', '#3e5d3a', '#4d6d46', '#607f55'],
  [Mat.Border]: ['#3b2320', '#4d2e28', '#603a31', '#74473a', '#885544', '#9c6450', '#b0765f', '#c48b72'],
  [Mat.Path]: ['#3a2d22', '#4a3b2c', '#5c4a37', '#6e5a43', '#806a50', '#937c60', '#a78f72', '#bba486'],
  [Mat.Spare]: ['#2a3f22', '#3a5428', '#4b6a2e', '#5e7f35', '#74933d', '#8ca64a', '#a8ba5e', '#c8d07c'],
};

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Neighbouring realms: desaturated, faintly cool parchment grey. */
function foreignize([r, g, b]: [number, number, number], water: boolean): [number, number, number] {
  const l = 0.3 * r + 0.59 * g + 0.11 * b;
  const s = water ? 0.45 : 0.78;
  const tint: [number, number, number] = [l * 1.02 + 10, l * 1.0 + 8, l * 0.98 + 6];
  return [r + (tint[0] - r) * s, g + (tint[1] - g) * s, b + (tint[2] - b) * s].map((v) =>
    Math.max(0, Math.min(255, Math.round(v))),
  ) as [number, number, number];
}

/** RGBA8 texture data: width = TONES, height = MATERIAL_COUNT. */
export function buildPalette(): Uint8Array {
  const data = new Uint8Array(TONES * MATERIAL_COUNT * 4);
  for (let m = 0; m < MATERIAL_COUNT; m++) {
    const base = m % FOREIGN;
    const ramp = RAMPS[base] ?? RAMPS[Mat.Grass];
    for (let t = 0; t < TONES; t++) {
      let c = hex(ramp[t]);
      if (m >= FOREIGN) c = foreignize(c, base <= Mat.River);
      const o = (m * TONES + t) * 4;
      data[o] = c[0];
      data[o + 1] = c[1];
      data[o + 2] = c[2];
      data[o + 3] = 255;
    }
  }
  return data;
}

/** Colours used by the 2D overlay (icons, labels, scale bar), sharing the map's palette. */
export const UI = {
  ink: '#2a1d16',
  inkSoft: '#4d3a2c',
  parchment: '#f3e6c4',
  parchmentDark: '#d9c59a',
  roof: '#a4473a',
  roofDark: '#6e2e27',
  stone: '#c9bfa8',
  stoneDark: '#7d7466',
  banner: '#c9a13b',
  mutedStone: '#a7a39a',
  mutedRoof: '#86766f',
};
