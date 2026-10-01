/**
 * The master palette. Every colour on screen — map terrain ramps, sprites, icons and the HTML UI —
 * is drawn from these 32 entries (lighting may tint them, but never introduces new base colours).
 * No pure black or white: the darkest ink is deep aubergine, the lightest paper is cream.
 */
export const MASTER = [
  // 0-2 aubergine shadows
  '#1e1424', '#2e1f33', '#4a2f45',
  // 3-10 sepia inks -> parchment
  '#3a2619', '#5a3d26', '#7a5536', '#a47a4e', '#c9a877', '#e3cc9a', '#f2e3bd', '#faf1d8',
  // 11-14 madder -> ember
  '#6b1f22', '#9c2f2b', '#c8552d', '#e88a3a',
  // 15-17 saffron golds
  '#8a6320', '#c99a2e', '#ecc85a',
  // 18-23 forest -> sage
  '#1c2e22', '#2f4a2c', '#4d6b32', '#74903f', '#9aae6a', '#c3cc8e',
  // 24-28 woad -> foam
  '#142840', '#23466a', '#3a6a8e', '#5e93a8', '#a9cfc6',
  // 29 fen teal, 30-31 stone
  '#3f6e5c', '#8a8479', '#b9b19d',
] as const;

export type PalIndex = number;

/** Named entries for code that wants words rather than indices. */
export const C = {
  aubergineDeep: 0, aubergine: 1, plum: 2,
  ink: 3, sepia: 4, umber: 5, tan: 6, parchmentDark: 7, parchment: 8, parchmentLight: 9, cream: 10,
  madderDark: 11, madder: 12, ember: 13, emberLight: 14,
  ochre: 15, saffron: 16, saffronLight: 17,
  forestDeep: 18, forest: 19, moss: 20, mossLight: 21, sage: 22, sageLight: 23,
  woadDeep: 24, woad: 25, woadMid: 26, seaLight: 27, foam: 28,
  fen: 29, stone: 30, stoneLight: 31,
} as const;

/** Semantic colours shared by map sprites and UI. */
export const SEM = {
  profit: C.moss,
  loss: C.madder,
  heat: C.ember,
  loyalty: C.woadMid,
  gold: C.saffron,
  text: C.ink,
} as const;

export function hex(i: PalIndex): string {
  return MASTER[i];
}

/** 0xRRGGBB integer, for PixiJS and canvas fillStyle numbers. */
export function hexNum(i: PalIndex): number {
  return parseInt(MASTER[i].slice(1), 16);
}

export function rgb(i: PalIndex): [number, number, number] {
  const n = parseInt(MASTER[i].slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(i: PalIndex, a: number): string {
  const [r, g, b] = rgb(i);
  return `rgba(${r},${g},${b},${a})`;
}

/** Darker / lighter neighbour of each entry, for automatic pixel-art shading. */
const CHAINS = [[0, 1, 2], [3, 4, 5, 6, 7, 8, 9, 10], [15, 16, 17, 10], [11, 12, 13, 14], [18, 19, 20, 21, 22, 23], [24, 25, 26, 27, 28], [3, 30, 31, 9]];
export const SHADE: { dark: number; light: number }[] = MASTER.map((_, i) => {
  if (i === C.fen) return { dark: C.forestDeep, light: C.seaLight };
  const ch = CHAINS.find((c) => c.indexOf(i) >= 0)!;
  const k = ch.indexOf(i);
  return { dark: ch[Math.max(0, k - 1)], light: ch[Math.min(ch.length - 1, k + 1)] };
});

/** Publish the palette and semantic colours as CSS custom properties. */
export function applyCssPalette(root: HTMLElement = document.documentElement) {
  const names = Object.entries(C) as [string, number][];
  for (const [name, i] of names) root.style.setProperty(`--${kebab(name)}`, MASTER[i]);
  for (const [name, i] of Object.entries(SEM)) root.style.setProperty(`--sem-${name}`, MASTER[i]);
  MASTER.forEach((h, i) => root.style.setProperty(`--p${i}`, h));
}

function kebab(s: string) {
  return s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}
