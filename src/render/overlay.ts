import { ashbyArmsCanvas } from '../assets/textures';
import type { Camera } from '../camera/camera';
import type { Settlement, SettlementKind } from '../world/settlements';
import { UI } from './palette';
import { FONT_H, drawPixelText, labelChip, measurePixelText } from './pixelFont';

/** Icon sprites; each char maps to a palette colour, '.' is transparent. */
const SPRITES: Record<SettlementKind | 'dot' | 'beast', string[]> = {
  hamlet: [
    '..k.k.',
    '.krkrk',
    'ksksks',
    'kkkkkk',
  ],
  town: [
    '...k....',
    '..krk.k.',
    '.krrrkrk',
    'kksssksk',
    '.ksDsksk',
    '.kkkkkkk',
  ],
  city: [
    'k.k.k.k.k',
    'kkkkkkkkk',
    'k.ksssk.k',
    'krkssskrk',
    'kRkssskRk',
    'ksssDsssk',
    'kkkkkkkkk',
  ],
  cathedral: [
    '....k....',
    '...kbk...',
    '...ksk...',
    '..kkskk..',
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
  port: [
    'm..k..m.',
    'm.mkrkm.m',
    '.c.krrk.c',
    '.kkssskk.',
    '.c.sDs.c.',
    'kkkkkkkkk',
    '.wwwwwww.',
  ],
  dot: ['.k.', 'ksk', '.k.'],
  beast: [
    '..kkkk..',
    '.kssssk.',
    'kssssssk',
    '.ksskss.',
    '..ks.skk',
    '.kss....',
    'kssk.kk.',
    '.kkkk...',
  ],
};

const BEASTS: [number, number][] = [
  [155, 690],
  [210, 790],
  [88, 240],
  [130, 155],
  [505, 830],
  [390, 710],
  [70, 420],
];

function spriteColors(foreign: boolean): Record<string, string> {
  return {
    k: UI.ink,
    s: foreign ? UI.mutedStone : UI.stone,
    D: UI.stoneDark,
    r: foreign ? UI.mutedRoof : UI.roof,
    R: UI.roofDark,
    b: foreign ? UI.mutedStone : UI.banner,
    w: '#cde6de',
    m: UI.ink,
    c: UI.inkSoft,
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

const NICE_MILES = [0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 400, 500];

export type AvoidRect = { x: number; y: number; w: number; h: number };

/** Screen-space chrome the 2D town labels must not sit under. Units are CSS pixels. */
export function uiAvoidRects(p: {
  scale: number;
  viewW: number;
  viewH: number;
  charCollapsed: boolean;
  mapCollapsed: boolean;
  hasPanel: boolean;
  hasInspector: boolean;
  hasActionBar: boolean;
}): AvoidRect[] {
  const u = (n: number) => n * p.scale;
  const charW = u(p.charCollapsed ? 172 : 328);
  const charH = u(p.charCollapsed ? 72 : 210);
  const mapW = u(p.mapCollapsed ? 88 : 232);
  const mapH = u(p.mapCollapsed ? 104 : 204);
  const rects: AvoidRect[] = [
    { x: 0, y: 0, w: p.viewW, h: u(42) },
    { x: u(4), y: p.viewH - charH - u(4), w: charW, h: charH },
    { x: p.viewW - mapW - u(4), y: p.viewH - mapH - u(4), w: mapW, h: mapH },
  ];
  if (p.hasActionBar) rects.push({ x: p.viewW / 2 - u(160), y: p.viewH - u(188), w: u(320), h: u(180) });
  else if (p.viewH > 0) rects.push({ x: p.viewW / 2 - u(28), y: p.viewH - u(24), w: u(56), h: u(24) });
  if (p.hasPanel) rects.push({ x: u(4), y: u(42), w: u(368), h: Math.max(40, p.viewH - u(42) - charH - u(8)) });
  if (p.hasInspector) rects.push({ x: p.viewW - u(280), y: u(42), w: u(272), h: Math.max(40, p.viewH - u(42) - mapH - u(8)) });
  return rects;
}

export function settlementShown(s: Settlement, across: number): boolean {
  if (s.tier === 1) return true;
  if (s.tier === 2) return across < 380;
  if (s.kind === 'hamlet') return across < 90;
  return across < 200;
}

export function settlementLabeled(s: Settlement, across: number): boolean {
  if (s.tier === 1) return true;
  if (s.tier === 2) return across < 260;
  return across < 120;
}

/** Screen-space 2D overlay: settlement icons + labels, heraldry, scale bar, parchment beasts. */
export class Overlay {
  private ctx: CanvasRenderingContext2D;
  drawScale = true;
  drawLabels = true;
  hoverId: string | null = null;
  owned: ReadonlySet<string> = new Set();
  mode = 'terrain';
  tints = new Map<string, string>();
  revealAt: ((x: number, y: number) => number) | null = null;
  avoid: AvoidRect[] = [];
  private arms: HTMLCanvasElement | null = null;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  hitTest(cam: Camera, sx: number, sy: number, towns: Settlement[]): Settlement | null {
    let best: Settlement | null = null;
    let bd = 22;
    const across = cam.milesAcross;
    for (const s of towns) {
      if (!settlementShown(s, across)) continue;
      const rev = this.revealAt?.(s.x, s.y) ?? 1;
      if (rev < 0.12 && s.tier > 2) continue;
      const [x, y] = cam.worldToScreen(s.x, s.y);
      const d = Math.hypot(sx - x, sy - y);
      const max = s.tier === 1 ? 28 : s.tier === 2 ? 22 : 16;
      if (d < max && d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  render(cam: Camera, towns: Settlement[], dpr: number) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.imageSmoothingEnabled = false;
    if (!this.arms) this.arms = ashbyArmsCanvas();

    const across = cam.milesAcross;
    const zoomSteps = Math.max(0, Math.log2(cam.zoom / Math.max(cam.minZoom, 0.001)));
    const cssSprite = Math.max(2, 2 + Math.min(4, Math.floor(zoomSteps)));
    const iconPx = Math.max(1, Math.round(cssSprite * dpr));
    const textPx = Math.max(1, Math.round(Math.max(2, 1 + Math.floor(zoomSteps / 2)) * dpr));

    this.drawBeasts(cam, dpr, iconPx);

    const placed: [number, number, number, number][] = [];
    const overlaps = (r: [number, number, number, number]) =>
      placed.some((p) => r[0] < p[2] && r[2] > p[0] && r[1] < p[3] && r[3] > p[1]);

    const sorted = [...towns].sort((a, b) => a.tier - b.tier);
    for (const s of sorted) {
      if (!settlementShown(s, across)) continue;
      const rev = this.revealAt?.(s.x, s.y) ?? 1;
      if (rev < 0.12 && s.tier > 2) continue;
      const [sx, sy] = cam.worldToScreen(s.x, s.y);
      const px = Math.round(sx * dpr);
      const py = Math.round(sy * dpr);
      if (px < -200 || py < -200 || px > this.canvas.width + 200 || py > this.canvas.height + 200) continue;

      const img = sprite(s.kind, !!s.foreign);
      const w = img.width * iconPx;
      const h = img.height * iconPx;
      const ix = px - Math.floor(w / 2);
      const iy = py - h + iconPx * 2;
      ctx.globalAlpha = rev < 0.4 ? 0.45 : 1;
      ctx.drawImage(img, ix, iy, w, h);
      ctx.globalAlpha = 1;
      placed.push([ix, iy, ix + w, iy + h]);

      if (this.owned.has(s.id) && this.arms && rev > 0.35) {
        const bw = this.arms.width * iconPx;
        const bh = this.arms.height * iconPx;
        ctx.drawImage(this.arms, ix + w - iconPx, iy - bh + iconPx * 2, bw, bh);
      }

      const ring = this.tints.get(s.id);
      if (ring || this.hoverId === s.id) {
        ctx.fillStyle = this.hoverId === s.id ? UI.banner : ring!;
        ctx.globalAlpha = this.hoverId === s.id ? 1 : 0.6;
        const u = iconPx;
        ctx.fillRect(ix - u, iy - u, w + 2 * u, u);
        ctx.fillRect(ix - u, iy + h, w + 2 * u, u);
        ctx.fillRect(ix - u, iy, u, h);
        ctx.fillRect(ix + w, iy, u, h);
        ctx.globalAlpha = 1;
      }

      const showLabel =
        this.drawLabels &&
        (rev > 0.5 || s.tier === 1) &&
        settlementLabeled(s, across);
      if (!showLabel) continue;
      const lab = labelChip(
        s.name,
        s.foreign ? UI.inkSoft : UI.ink,
        s.foreign ? UI.parchmentDark : UI.parchment,
        UI.ink,
      );
      const lw = lab.width * textPx;
      const lh = lab.height * textPx;
      const lx = px - Math.floor(lw / 2);
      const ly = iy + h + textPx;
      const rect: [number, number, number, number] = [lx, ly, lx + lw, ly + lh];
      if (overlaps(rect) || this.labelBlocked(lx, ly, lw, lh, dpr)) continue;
      placed.push(rect);
      ctx.drawImage(lab, lx, ly, lw, lh);
    }

    if (this.drawScale) this.drawScaleBar(cam, dpr);
  }

  private labelBlocked(lx: number, ly: number, lw: number, lh: number, dpr: number): boolean {
    const x = lx / dpr;
    const y = ly / dpr;
    const w = lw / dpr;
    const h = lh / dpr;
    return this.avoid.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);
  }

  private drawBeasts(cam: Camera, dpr: number, iconPx: number) {
    const img = sprite('beast', false);
    const ctx = this.ctx;
    for (const [x, y] of BEASTS) {
      const rev = this.revealAt?.(x, y) ?? 1;
      if (rev > 0.28) continue;
      const [sx, sy] = cam.worldToScreen(x, y);
      const px = Math.round(sx * dpr);
      const py = Math.round(sy * dpr);
      if (px < -40 || py < -40 || px > this.canvas.width + 40 || py > this.canvas.height + 40) continue;
      const w = img.width * iconPx;
      const h = img.height * iconPx;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, px - (w >> 1), py - (h >> 1), w, h);
      ctx.globalAlpha = 1;
    }
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
    const y0 = Math.round(92 * dpr);
    const label = `${miles} ${miles === 1 ? 'MILE' : 'MILES'}`;
    const lw = measurePixelText(label);

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
