/** Tiny 5x7 bitmap font (uppercase, digits, a little punctuation). Rows top->bottom, '#' = ink. */
const G: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '.#.|##.|.#.|.#.|.#.|.#.|###',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '####.|....#|....#|.###.|....#|....#|####.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '.###.|#....|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|....#|.###.',
  ' ': '..|..|..|..|..|..|..',
  '.': '.|.|.|.|.|#|#',
  ',': '..|..|..|..|.#|.#|#.',
  "'": '#|#|.|.|.|.|.',
  '-': '...|...|...|###|...|...|...',
  '(': '.#|#.|#.|#.|#.|#.|.#',
  ')': '#.|.#|.#|.#|.#|.#|#.',
  '/': '...#|...#|..#.|..#.|.#..|.#..|#...',
  ':': '.|#|#|.|#|#|.',
  '|': '#|#|#|#|#|#|#',
  '%': '##..#|##.#.|..#..|..#..|.#...|#.##.|#..##',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
};

export const FONT_H = 7;

/** Draw text with 1-unit pixels onto ctx at (x, y) (top-left). Returns width in units. */
export function drawPixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): number {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const g = G[ch] ?? G['?'];
    const rows = g.split('|');
    for (let r = 0; r < rows.length; r++)
      for (let c = 0; c < rows[r].length; c++) if (rows[r][c] === '#') ctx.fillRect(cx + c, y + r, 1, 1);
    cx += rows[0].length + 1;
  }
  return cx - x - 1;
}

export function measurePixelText(text: string): number {
  let w = 0;
  for (const ch of text.toUpperCase()) w += (G[ch] ?? G['?']).split('|')[0].length + 1;
  return Math.max(0, w - 1);
}

/** Pre-rendered label with a 1-unit halo, cached by text+colours. Draw scaled with smoothing off. */
const cache = new Map<string, HTMLCanvasElement>();
export function labelSprite(text: string, ink: string, halo: string): HTMLCanvasElement {
  const key = `${text}|${ink}|${halo}`;
  let c = cache.get(key);
  if (c) return c;
  const w = measurePixelText(text);
  c = document.createElement('canvas');
  c.width = w + 2;
  c.height = FONT_H + 2;
  const ctx = c.getContext('2d')!;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) drawPixelText(ctx, text, 1 + dx, 1 + dy, halo);
  drawPixelText(ctx, text, 1, 1, ink);
  cache.set(key, c);
  return c;
}

/** Town name on a parchment chip so it stays readable over terrain. */
export function labelChip(text: string, ink: string, fill: string, border: string): HTMLCanvasElement {
  const key = `chip|${text}|${ink}|${fill}|${border}`;
  let c = cache.get(key);
  if (c) return c;
  const padX = 3;
  const padY = 2;
  const tw = measurePixelText(text);
  c = document.createElement('canvas');
  c.width = tw + padX * 2;
  c.height = FONT_H + padY * 2;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = border;
  ctx.fillRect(0, 0, c.width, 1);
  ctx.fillRect(0, c.height - 1, c.width, 1);
  ctx.fillRect(0, 0, 1, c.height);
  ctx.fillRect(c.width - 1, 0, 1, c.height);
  drawPixelText(ctx, text, padX, padY, ink);
  cache.set(key, c);
  return c;
}
