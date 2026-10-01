import { C } from './palette';
import { EMPTY, Painter } from './pixel';

/** The 16x16 icon set. Each icon paints fills only; outline and shading are added by Painter.finish. */
const ICONS = {
  coin(p) {
    p.disc(8, 8, 6.6, C.saffron);
    p.disc(8, 8, 4.6, C.saffronLight);
    p.disc(8, 8, 3.6, C.saffron);
    p.rect(7, 5, 2, 6, C.ochre);
    p.rect(5, 7, 6, 2, C.ochre);
  },
  wool(p) {
    p.ellipse(8, 9.5, 6.6, 4.8, C.parchmentLight);
    p.disc(4.5, 6, 2.6, C.parchmentLight);
    p.disc(8, 4.8, 3, C.parchmentLight);
    p.disc(11.5, 6, 2.6, C.parchmentLight);
    p.tint(5, 2, 1, 13, C.umber);
    p.tint(10, 2, 1, 13, C.umber);
    p.tint(1, 9, 14, 1, C.umber);
    for (const [x, y] of [[3, 7], [7, 11], [12, 11], [8, 7], [3, 12]]) p.set(x, y, C.parchmentDark);
  },
  cloth(p) {
    p.rect(2, 5, 10, 7, C.madder);
    p.ellipse(12, 8.5, 2.4, 3.6, C.ember);
    p.set(12, 8, C.madderDark);
    p.set(11, 9, C.madderDark);
    p.rect(2, 7, 10, 1, C.ember);
    p.rect(2, 10, 10, 1, C.madderDark);
    p.poly([[2, 11], [6, 11], [5, 15], [1, 14]], C.madder);
  },
  grain(p) {
    p.ellipse(8, 10, 6, 5, C.parchmentDark);
    p.rect(5, 4, 6, 4, C.parchmentDark);
    p.rect(6, 1, 4, 3, C.tan);
    p.rect(5, 4, 6, 1, C.sepia);
    p.rect(6, 9, 4, 1, C.umber);
    p.rect(7, 8, 2, 3, C.umber);
    p.set(2, 14, C.saffron);
    p.set(13, 14, C.saffronLight);
    p.set(3, 15, C.saffron);
  },
  wine(p) {
    p.ellipse(8, 8, 5.6, 7.2, C.umber);
    p.rect(4, 1, 8, 14, C.umber);
    p.tint(0, 3, 16, 1, C.stone);
    p.tint(0, 12, 16, 1, C.stone);
    p.tint(5, 1, 1, 14, C.sepia);
    p.tint(10, 1, 1, 14, C.sepia);
    p.rect(7, 7, 2, 2, C.ochre);
    p.set(8, 9, C.madder);
  },
  salt(p) {
    p.ellipse(8, 12.5, 6.8, 2.2, C.umber);
    p.poly([[2.5, 12.5], [13.5, 12.5], [8, 3.5]], C.parchmentLight);
    p.line(8, 5, 5, 11, C.cream);
    p.set(9, 8, C.stoneLight);
    p.set(10, 10, C.stoneLight);
    p.set(12, 3, C.cream);
    p.set(13, 5, C.cream);
  },
  ship(p) {
    p.poly([[1, 10], [15, 10], [12.5, 13.5], [3.5, 13.5]], C.umber);
    p.rect(1, 8, 3, 2, C.umber);
    p.rect(12, 8, 3, 2, C.umber);
    p.rect(7, 1, 1, 9, C.sepia);
    p.rect(3, 2, 9, 6, C.parchmentLight);
    p.tint(3, 4, 9, 1, C.madder);
    p.tint(7, 2, 1, 6, C.madder);
    p.rect(8, 0, 2, 1, C.madder);
  },
  cart(p) {
    p.rect(2, 7, 11, 3, C.tan);
    p.rect(2, 6, 11, 1, C.umber);
    p.disc(5, 4.5, 2.3, C.parchmentDark);
    p.disc(9.5, 4.5, 2.3, C.parchmentLight);
    p.line(13, 8, 15, 6, C.umber);
    p.disc(4.5, 11.5, 2.6, C.sepia);
    p.disc(11, 11.5, 2.6, C.sepia);
    p.set(4, 11, C.ochre);
    p.set(10, 11, C.ochre);
  },
  warehouse(p) {
    p.rect(2, 7, 12, 8, C.parchmentDark);
    p.poly([[1, 8], [15, 8], [11.5, 2], [4.5, 2]], C.madder);
    p.tint(2, 9, 12, 1, C.umber);
    p.tint(2, 12, 12, 1, C.umber);
    p.rect(6, 10, 4, 5, C.sepia);
    p.rect(7, 4, 2, 2, C.sepia);
    p.set(12, 3, C.woadMid);
    p.set(12, 5, C.seaLight);
  },
  scales(p) {
    p.rect(7, 2, 2, 11, C.ochre);
    p.rect(2, 4, 12, 1, C.saffron);
    p.rect(4, 13, 8, 2, C.ochre);
    p.line(2, 5, 1, 9, C.ochre);
    p.line(3, 5, 5, 9, C.ochre);
    p.line(13, 5, 11, 9, C.ochre);
    p.line(13, 5, 15, 9, C.ochre);
    p.ellipse(3, 10, 2.8, 1.3, C.saffron);
    p.ellipse(13, 10, 2.8, 1.3, C.saffron);
    p.disc(8, 2, 1.2, C.saffronLight);
  },
  dagger(p) {
    p.poly([[5, 9], [13, 1], [15, 1], [15, 3], [7, 11]], C.stoneLight);
    p.line(7, 9, 14, 2, C.stone);
    p.poly([[2, 8], [3, 7], [9, 13], [8, 14]], C.saffron);
    p.poly([[2, 12], [4.5, 9.5], [6.5, 11.5], [4, 14]], C.umber);
    p.disc(2, 14, 1.4, C.saffron);
  },
  eye(p) {
    p.ellipse(8, 8, 7, 4, C.cream);
    p.disc(8, 8, 2.8, C.woad);
    p.disc(8, 8, 1.3, C.aubergineDeep);
    p.set(7, 7, C.cream);
  },
  scroll(p) {
    p.rect(3, 3, 10, 10, C.parchmentLight);
    p.rect(2, 2, 12, 2, C.parchmentDark);
    p.rect(2, 12, 12, 2, C.parchmentDark);
    p.rect(5, 6, 6, 1, C.umber);
    p.rect(5, 8, 5, 1, C.umber);
    p.rect(5, 10, 3, 1, C.umber);
    p.disc(11, 10.5, 1.6, C.madder);
  },
  quill(p) {
    p.poly([[4, 12], [10, 3], [14.5, 1], [13, 5.5], [6, 12.5]], C.cream);
    p.line(4, 12, 13, 3, C.stoneLight);
    p.line(2, 14, 5, 11, C.umber);
    p.set(1, 15, C.aubergineDeep);
    p.set(9, 7, C.parchmentDark);
    p.set(11, 5, C.parchmentDark);
  },
  key(p) {
    p.disc(4.5, 8, 3.2, C.saffron);
    p.clearDisc(4.5, 8, 1.2);
    p.rect(7, 7, 8, 2, C.saffron);
    p.rect(11, 9, 1, 3, C.saffron);
    p.rect(13, 9, 2, 2, C.saffron);
  },
  crown(p) {
    p.poly([[2, 13], [2, 5], [5, 9], [8, 3], [11, 9], [14, 5], [14, 13]], C.saffron);
    p.rect(2, 11, 12, 2, C.ochre);
    p.set(7, 11, C.madder); p.set(8, 11, C.madder);
    p.set(4, 11, C.woadMid);
    p.set(11, 11, C.woadMid);
    p.disc(2, 4, 1.1, C.saffronLight);
    p.disc(8, 2, 1.1, C.saffronLight);
    p.disc(14, 4, 1.1, C.saffronLight);
  },
  mitre(p) {
    p.poly([[3, 14], [3, 6.5], [8, 1], [13, 6.5], [13, 14]], C.parchmentLight);
    p.tint(7, 2, 2, 12, C.saffron);
    p.tint(3, 11, 10, 2, C.saffron);
    p.set(7, 6, C.madder); p.set(8, 6, C.madder);
    p.rect(4, 14, 2, 2, C.madder);
    p.rect(10, 14, 2, 2, C.madder);
  },
  shield(p) {
    p.poly([[2, 2], [14, 2], [14, 8], [8, 14.5], [2, 8]], C.woad);
    p.tint(7, 2, 2, 13, C.saffron);
    p.tint(2, 6, 12, 2, C.saffron);
  },
  hourglass(p) {
    p.poly([[4, 3], [12, 3], [8.5, 8], [7.5, 8]], C.foam);
    p.poly([[7.5, 8], [8.5, 8], [12, 13], [4, 13]], C.foam);
    p.poly([[5.5, 5], [10.5, 5], [8, 8]], C.saffron);
    p.poly([[5, 13], [11, 13], [8, 10]], C.saffron);
    p.set(8, 9, C.saffron);
    p.rect(2, 1, 12, 2, C.umber);
    p.rect(2, 13, 12, 2, C.umber);
    p.rect(3, 3, 1, 10, C.sepia);
    p.rect(12, 3, 1, 10, C.sepia);
  },
  skull(p) {
    p.disc(8, 6.5, 5.5, C.parchmentLight);
    p.rect(5, 10, 6, 3, C.parchmentLight);
    p.disc(5.8, 7, 1.5, C.aubergine);
    p.disc(10.2, 7, 1.5, C.aubergine);
    p.set(7, 10, C.aubergine); p.set(8, 10, C.aubergine);
    p.set(6, 12, C.parchmentDark); p.set(8, 12, C.parchmentDark); p.set(10, 12, C.parchmentDark);
  },
  heart(p) {
    p.disc(5, 5.5, 3.3, C.madder);
    p.disc(11, 5.5, 3.3, C.madder);
    p.poly([[1.8, 6.5], [14.2, 6.5], [8, 14]], C.madder);
    p.set(4, 4, C.emberLight);
  },
  purse(p) {
    p.ellipse(8, 10.5, 6, 4.5, C.umber);
    p.rect(6, 4, 4, 3, C.umber);
    p.poly([[4.5, 1.5], [11.5, 1.5], [10, 4], [6, 4]], C.tan);
    p.rect(5, 5, 6, 1, C.saffron);
    p.disc(8, 10.5, 2, C.saffron);
    p.set(12, 5, C.saffron);
    p.set(12, 6, C.saffron);
  },
  // ---- HUD extras -------------------------------------------------------------------------
  sun(p) {
    p.disc(8, 8, 3.8, C.saffronLight);
    for (const [x, y, w, h] of [[7, 0, 2, 2], [7, 14, 2, 2], [0, 7, 2, 2], [14, 7, 2, 2]]) p.rect(x, y, w, h, C.saffron);
    for (const [x, y] of [[2, 2], [3, 3], [13, 2], [12, 3], [2, 13], [3, 12], [13, 13], [12, 12]]) p.set(x, y, C.saffron);
  },
  moon(p) {
    p.disc(8, 8, 6, C.parchmentLight);
    p.clearDisc(11, 6, 5);
  },
  cloud(p) {
    p.disc(5, 9.5, 3, C.stoneLight);
    p.disc(9, 7.5, 4, C.stoneLight);
    p.disc(12.5, 10, 2.5, C.stoneLight);
    p.rect(3, 10, 11, 3, C.stoneLight);
  },
  rain(p) {
    p.disc(5, 6, 2.6, C.stone);
    p.disc(9, 4.5, 3.4, C.stone);
    p.disc(12, 6.5, 2.2, C.stone);
    p.rect(3, 6, 10, 3, C.stone);
    for (const [x, y] of [[4, 11], [8, 12], [12, 11], [6, 14], [10, 14]]) p.rect(x, y, 1, 2, C.seaLight);
  },
  storm(p) {
    p.disc(5, 5.5, 2.6, C.stone);
    p.disc(9, 4.5, 3.4, C.umber);
    p.disc(12, 6, 2.2, C.stone);
    p.rect(3, 6, 10, 3, C.stone);
    p.poly([[8, 8], [11, 8], [9, 11], [11, 11], [6, 15.5], [7.5, 12], [6, 12]], C.saffronLight);
  },
  fog(p) {
    p.rect(2, 4, 10, 2, C.stoneLight);
    p.rect(5, 8, 10, 2, C.stoneLight);
    p.rect(1, 12, 11, 2, C.stoneLight);
  },
  snow(p) {
    p.disc(5, 5.5, 2.6, C.stoneLight);
    p.disc(9, 4.5, 3.4, C.stoneLight);
    p.disc(12, 6, 2.2, C.stoneLight);
    p.rect(3, 6, 10, 3, C.stoneLight);
    for (const [x, y] of [[4, 12], [8, 11], [12, 13], [6, 14], [10, 14]]) p.set(x, y, C.cream);
  },
  pause(p) {
    p.rect(4, 3, 3, 10, C.parchmentLight);
    p.rect(9, 3, 3, 10, C.parchmentLight);
  },
  play(p) {
    p.poly([[5, 2.5], [5, 13.5], [12.5, 8]], C.parchmentLight);
  },
  fast(p) {
    p.poly([[2, 3], [2, 13], [8, 8]], C.parchmentLight);
    p.poly([[8, 3], [8, 13], [14, 8]], C.parchmentLight);
  },
  bell(p) {
    p.poly([[4, 12], [5, 5], [8, 2.5], [11, 5], [12, 12]], C.saffron);
    p.rect(2, 11, 12, 2, C.ochre);
    p.disc(8, 14, 1.4, C.umber);
    p.rect(7, 1, 2, 2, C.umber);
  },
  book(p) {
    p.rect(3, 2, 10, 12, C.madder);
    p.rect(12, 3, 2, 11, C.parchmentLight);
    p.rect(3, 2, 2, 12, C.madderDark);
    p.rect(6, 5, 5, 3, C.saffron);
  },
  map(p) {
    p.poly([[1, 3], [5, 2], [10, 3.5], [15, 2], [15, 13], [10, 14.5], [5, 13], [1, 14]], C.parchmentLight);
    p.tint(5, 2, 1, 12, C.parchmentDark);
    p.tint(10, 3, 1, 12, C.parchmentDark);
    for (const [x, y] of [[3, 11], [4, 9], [6, 8], [8, 7], [9, 6]]) p.set(x, y, C.madder);
    p.set(12, 5, C.madder); p.set(11, 4, C.madder); p.set(13, 6, C.madder); p.set(11, 6, C.madder); p.set(13, 4, C.madder);
  },
  people(p) {
    p.disc(5, 4.5, 2.4, C.tan);
    p.ellipse(5, 11, 3.6, 4, C.woad);
    p.disc(11, 5.5, 2.2, C.tan);
    p.ellipse(11, 12, 3.4, 3.6, C.madder);
  },
  anchor(p) {
    p.disc(8, 2.5, 1.8, C.stone);
    p.clearDisc(8, 2.5, 0.7);
    p.rect(7, 4, 2, 10, C.stone);
    p.rect(4, 6, 8, 1, C.stone);
    p.line(2, 10, 7, 14, C.stone);
    p.line(14, 10, 9, 14, C.stone);
  },
  candle(p) {
    p.rect(6, 6, 4, 8, C.parchmentLight);
    p.rect(4, 14, 8, 2, C.ochre);
    p.poly([[8, 1], [10, 4.5], [8, 5.5], [6, 4.5]], C.emberLight);
    p.set(8, 4, C.saffronLight);
  },
  check(p) {
    p.poly([[2, 8], [4.5, 5.5], [7, 8], [12, 2], [14.5, 4.5], [7, 13]], C.moss);
  },
  cross(p) {
    p.poly([[2, 4], [4, 2], [8, 6], [12, 2], [14, 4], [10, 8], [14, 12], [12, 14], [8, 10], [4, 14], [2, 12], [6, 8]], C.madder);
  },
  star(p) {
    p.poly([[8, 1], [10, 6], [15, 6], [11, 9.5], [12.5, 14.5], [8, 11.5], [3.5, 14.5], [5, 9.5], [1, 6], [6, 6]], C.saffronLight);
  },
  warn(p) {
    p.poly([[8, 1.5], [15, 14], [1, 14]], C.saffron);
    p.rect(7, 5, 2, 5, C.aubergine);
    p.rect(7, 11, 2, 2, C.aubergine);
  },
  gear(p) {
    p.disc(8, 8, 5, C.stone);
    for (const [x, y] of [[7, 1], [7, 13], [1, 7], [13, 7]]) p.rect(x, y, 2, 2, C.stone);
    for (const [x, y] of [[3, 3], [11, 3], [3, 11], [11, 11]]) p.rect(x, y, 2, 2, C.stone);
    p.clearDisc(8, 8, 1.8);
  },
  flag(p) {
    p.rect(3, 1, 1, 14, C.sepia);
    p.poly([[4, 2], [14, 2], [12, 5], [14, 8], [4, 8]], C.madder);
    p.tint(4, 4, 10, 2, C.saffron);
  },
  tower(p) {
    p.rect(4, 5, 8, 10, C.stoneLight);
    for (const x of [3, 6, 9, 12]) p.rect(x, 2, 2, 3, C.stoneLight);
    p.rect(3, 4, 10, 1, C.stoneLight);
    p.rect(7, 11, 2, 4, C.aubergine);
    p.rect(7, 7, 2, 2, C.aubergine);
  },
  handshake(p) {
    p.poly([[1, 7], [5, 5], [9, 7], [12, 5], [15, 7], [15, 10], [10, 13], [6, 12], [1, 10]], C.tan);
    p.tint(1, 7, 3, 3, C.woad);
    p.tint(13, 7, 3, 3, C.madder);
    p.line(7, 8, 10, 10, C.umber);
  },
  fish(p) {
    p.ellipse(7, 8, 5.5, 3.2, C.stoneLight);
    p.poly([[11, 8], [15, 4.5], [15, 11.5]], C.stone);
    p.set(4, 7, C.aubergine);
    p.tint(6, 10, 4, 1, C.stone);
  },
} satisfies Record<string, (p: IconPainter) => void>;

export type IconName = keyof typeof ICONS;
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

class IconPainter extends Painter {
  clearDisc(cx: number, cy: number, r: number) {
    for (let j = 0; j < this.h; j++)
      for (let i = 0; i < this.w; i++) if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) this.px[j * this.w + i] = EMPTY;
  }
}

const urlCache = new Map<string, string>();
const canvasCache = new Map<string, HTMLCanvasElement>();

export function iconCanvas(name: IconName): HTMLCanvasElement {
  let c = canvasCache.get(name);
  if (!c) {
    const p = new IconPainter(16, 16);
    ICONS[name](p);
    c = p.finish().toCanvas();
    canvasCache.set(name, c);
  }
  return c;
}

export function iconUrl(name: IconName): string {
  let u = urlCache.get(name);
  if (!u) {
    u = iconCanvas(name).toDataURL();
    urlCache.set(name, u);
  }
  return u;
}

/** Eight frames of a spinning coin, 12x12 each, as a horizontal sprite sheet. */
export function coinSheetUrl(): string {
  const key = '__coin';
  let u = urlCache.get(key);
  if (u) return u;
  const frames = 8;
  const sheet = document.createElement('canvas');
  sheet.width = 12 * frames;
  sheet.height = 12;
  const ctx = sheet.getContext('2d')!;
  for (let f = 0; f < frames; f++) {
    const p = new IconPainter(12, 12);
    const w = Math.max(0.9, Math.abs(Math.cos((f / frames) * Math.PI)) * 4.8);
    p.ellipse(6, 6, w, 4.8, C.saffron);
    if (w > 2.5) {
      p.ellipse(6, 6, w - 1.6, 3.2, C.saffronLight);
      p.rect(6, 4, 1, 4, C.ochre);
    } else p.tint(0, 0, 12, 12, f < frames / 2 ? C.ochre : C.saffron);
    ctx.drawImage(p.finish().toCanvas(), f * 12, 0);
  }
  u = sheet.toDataURL();
  urlCache.set(key, u);
  return u;
}
