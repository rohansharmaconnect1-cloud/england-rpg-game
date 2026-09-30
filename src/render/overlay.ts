import type { Camera } from '../camera/camera';
import type { Settlement, SettlementKind } from '../world/settlements';
import { UI } from './palette';
import { FONT_H, drawPixelText, labelSprite, measurePixelText } from './pixelFont';

/** Icon sprites; each char maps to a palette colour, '.' is transparent. */
const SPRITES: Record<SettlementKind | 'dot', string[]> = {
  city: [
    '....k....',
    '...kbk...',
    '...ksk...',
    '.k.ksk.k.',
    'krkksskrk',
    'kRkssskRk',
    'ksssDsssk',
    'kkkkkkkkk',
  ],
  castle: [
    '....b....',
    '....bb...',
    'k.k.k.k.k',
    'kkkkkkkkk',
    'ksssssssk',
    'kssDkDssk',
    'kssDkDssk',
    'kkkkkkkkk',
  ],
  town: [
    '...k....',
    '..krk.k.',
    '.krrrkrk',
    'kksssksk',
    '.ksDsksk',
    '.kkkkkkk',
  ],
  port: [
    '...k....',
    '..krk.k.',
    '.krrrkrk',
    'kksssksk',
    '.ksDsksk',
    'wkkkkkkw',
    '.wwwwww.',
  ],
  dot: ['.k.', 'ksk', '.k.'],
};

function spriteColors(foreign: boolean): Record<string, string> {
  return {
    k: UI.ink,
    s: foreign ? UI.mutedStone : UI.stone,
    D: UI.stoneDark,
    r: foreign ? UI.mutedRoof : UI.roof,
    R: UI.roofDark,
    b: foreign ? UI.mutedStone : UI.banner,
    w: '#cde6de',
  };
}

const spriteCache = new Map<string, HTMLCanvasElement>();
function sprite(kind: keyof typeof SPRITES, foreign: boolean): HTMLCanvasElement {
  const key = kind + (foreign ? 'f' : '');
  let c = spriteCache.get(key);
  if (c) return c;
  const rows = SPRITES[kind];
  const col = spriteColors(foreign);
  c = document.createElement('canvas');
  c.width = rows[0].length + 2;
  c.height = rows.length + 2;
  const ctx = c.getContext('2d')!;
  // soft parchment halo so icons read on any terrain
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < rows[y].length; x++)
      if (rows[y][x] !== '.') {
        ctx.fillStyle = 'rgba(243,230,196,0.55)';
        ctx.fillRect(x, y, 3, 3);
      }
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      ctx.fillStyle = col[ch] ?? UI.ink;
      ctx.fillRect(x + 1, y + 1, 1, 1);
    }
  spriteCache.set(key, c);
  return c;
}

const NICE_MILES = [0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200];

/** Screen-space 2D overlay: settlement icons + labels, scale bar. Crisp integer-scaled pixels. */
export class Overlay {
  private ctx: CanvasRenderingContext2D;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  render(cam: Camera, towns: Settlement[], dpr: number, pixelScale: number) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = false;

    const across = cam.milesAcross;
    // Icons grow in whole-pixel steps as you zoom in, so they stay crisp.
    const zoomSteps = Math.log2(cam.zoom / cam.minZoom);
    const iconPx = Math.max(1, Math.round((Math.min(pixelScale, 2 + Math.floor(zoomSteps / 2.2))) * dpr));
    const textPx = Math.max(1, Math.round(2 * dpr));

    const placed: [number, number, number, number][] = [];
    const overlaps = (r: [number, number, number, number]) =>
      placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1]);

    const sorted = [...towns].sort((a, b) => a.tier - b.tier);
    for (const s of sorted) {
      const [sx, sy] = cam.worldToScreen(s.x, s.y);
      const px = Math.round(sx * dpr);
      const py = Math.round(sy * dpr);
      if (px < -200 || py < -200 || px > this.canvas.width + 200 || py > this.canvas.height + 200) continue;

      const full = s.tier === 1 || (s.tier === 2 && across < 520) || across < 300;
      const img = sprite(full ? s.kind : 'dot', !!s.foreign);
      const w = img.width * iconPx;
      const h = img.height * iconPx;
      const ix = px - Math.floor(w / 2);
      const iy = py - h + iconPx * 2;
      ctx.drawImage(img, ix, iy, w, h);
      placed.push([ix, iy, ix + w, iy + h]);

      const showLabel = s.tier === 1 || (s.tier === 2 && across < 420) || across < 180;
      if (!showLabel) continue;
      const lab = labelSprite(s.name, s.foreign ? UI.inkSoft : UI.ink, s.foreign ? UI.parchmentDark : UI.parchment);
      const lw = lab.width * textPx;
      const lh = lab.height * textPx;
      const lx = px - Math.floor(lw / 2);
      const ly = iy + h + textPx;
      const rect: [number, number, number, number] = [lx, ly, lx + lw, ly + lh];
      if (overlaps(rect)) continue;
      placed.push(rect);
      ctx.drawImage(lab, lx, ly, lw, lh);
    }

    this.drawScaleBar(cam, dpr);
  }

  private drawScaleBar(cam: Camera, dpr: number) {
    const ctx = this.ctx;
    const u = Math.max(1, Math.round(2 * dpr));
    const targetPx = 160;
    let miles = NICE_MILES[0];
    for (const m of NICE_MILES) if (m * cam.zoom <= targetPx) miles = m;
    const len = Math.round((miles * cam.zoom * dpr) / u);
    const segs = 4;
    const x0 = Math.round(16 * dpr);
    const y0 = this.canvas.height - Math.round(22 * dpr);
    const label = `${miles} ${miles === 1 ? 'MILE' : 'MILES'}`;
    const lw = measurePixelText(label);

    // parchment backing
    ctx.fillStyle = 'rgba(243,230,196,0.82)';
    const pad = 3;
    ctx.fillRect(x0 - pad * u, y0 - (FONT_H + 4 + pad) * u, (Math.max(len, lw) + pad * 2) * u, (FONT_H + 4 + 3 + pad * 2) * u);
    ctx.fillStyle = UI.ink;
    ctx.fillRect(x0 - u, y0 - u, (len + 2) * u, 4 * u);
    for (let i = 0; i < segs; i++) {
      const a = Math.round((i * len) / segs);
      const b = Math.round(((i + 1) * len) / segs);
      ctx.fillStyle = i % 2 ? UI.ink : UI.parchment;
      ctx.fillRect(x0 + a * u, y0, (b - a) * u, 2 * u);
    }
    ctx.save();
    ctx.translate(x0, y0 - (FONT_H + 3) * u);
    ctx.scale(u, u);
    drawPixelText(ctx, label, 0, 0, UI.ink);
    ctx.restore();
  }
}
