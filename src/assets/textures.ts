import { C, MASTER, rgb } from './palette';
import { EMPTY, Painter, hashStr, rng } from './pixel';

const cache = new Map<string, string>();
function memo(key: string, make: () => HTMLCanvasElement): string {
  let u = cache.get(key);
  if (!u) {
    u = make().toDataURL();
    cache.set(key, u);
  }
  return u;
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function put(ctx: CanvasRenderingContext2D, x: number, y: number, i: number, a = 1) {
  const [r, g, b] = rgb(i);
  ctx.fillStyle = a === 1 ? MASTER[i] : `rgba(${r},${g},${b},${a})`;
  ctx.fillRect(x, y, 1, 1);
}

/**
 * 9-slice parchment border (slice = 10 art px). Torn outer edge, a burnt umber lip, an ink rule and
 * small gilt corner ornaments. The middle is transparent: panels paint parchment + grain beneath it.
 */
export function panelBorderUrl(variant: 'parchment' | 'dark' = 'parchment'): string {
  return memo('panel-' + variant, () => {
    const S = 30;
    const c = canvas(S, S);
    const ctx = c.getContext('2d')!;
    const r = rng(hashStr(variant));
    const dark = variant === 'dark';
    const body = dark ? C.aubergine : C.parchment;
    const lip = dark ? C.aubergineDeep : C.umber;
    const rule = dark ? C.ochre : C.ink;
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const d = Math.min(x, y, S - 1 - x, S - 1 - y);
        if (d >= 10) continue;
        // Jagged torn edge: the outermost 1-2 px are randomly eaten away along each side.
        const tear = r() < 0.35 ? 1 : 0;
        const e = d - tear;
        if (e < 0) continue;
        if (e === 0) put(ctx, x, y, lip);
        else if (e === 1) put(ctx, x, y, dark ? C.plum : C.tan);
        else if (e === 3) put(ctx, x, y, rule);
        else if (e === 5 && !dark) put(ctx, x, y, C.parchmentDark, 0.6);
        else put(ctx, x, y, body);
      }
    // Corner ornaments: gilt diamond with a madder heart.
    for (const [cx, cy] of [[6, 6], [S - 7, 6], [6, S - 7], [S - 7, S - 7]]) {
      for (const [dx, dy] of [[0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2]])
        put(ctx, cx + dx, cy + dy, C.saffron);
      put(ctx, cx, cy, C.madder);
      put(ctx, cx - 1, cy - 1, C.saffronLight);
    }
    return c;
  });
}

/** Rough double-ruled ink stamp frame (slice 6). */
export function stampBorderUrl(ink: number = C.madder): string {
  return memo('stamp-' + ink, () => {
    const S = 18;
    const c = canvas(S, S);
    const ctx = c.getContext('2d')!;
    const r = rng(77 + ink);
    for (let y = 0; y < S; y++)
      for (let x = 0; x < S; x++) {
        const d = Math.min(x, y, S - 1 - x, S - 1 - y);
        const on = d === 0 || d === 1 || d === 3;
        if (on && r() > 0.12) put(ctx, x, y, ink, d === 3 ? 0.75 : 1);
        else if (d < 6 && r() < 0.05) put(ctx, x, y, ink, 0.5);
      }
    return c;
  });
}

/** Tileable paper grain: sparse fibres and specks at low alpha. */
export function grainUrl(dark = false): string {
  return memo('grain' + dark, () => {
    const S = 64;
    const c = canvas(S, S);
    const ctx = c.getContext('2d')!;
    const r = rng(dark ? 9 : 4);
    for (let i = 0; i < 520; i++) {
      const x = Math.floor(r() * S);
      const y = Math.floor(r() * S);
      const v = r();
      if (dark) put(ctx, x, y, v < 0.5 ? C.aubergineDeep : C.plum, 0.35);
      else put(ctx, x, y, v < 0.55 ? C.parchmentDark : v < 0.9 ? C.parchmentLight : C.tan, 0.45);
    }
    // a few fibres
    for (let i = 0; i < 18; i++) {
      let x = r() * S;
      let y = r() * S;
      const a = r() * Math.PI;
      for (let k = 0; k < 5; k++) {
        put(ctx, Math.floor(x) % S, Math.floor(y) % S, dark ? C.plum : C.parchmentDark, 0.3);
        x += Math.cos(a);
        y += Math.sin(a);
      }
    }
    return c;
  });
}

export type SealColor = 'madder' | 'woad' | 'moss' | 'plum' | 'saffron';
const SEAL: Record<SealColor, [number, number, number]> = {
  madder: [C.madderDark, C.madder, C.ember],
  woad: [C.woadDeep, C.woad, C.woadMid],
  moss: [C.forest, C.moss, C.mossLight],
  plum: [C.aubergine, C.plum, C.umber],
  saffron: [C.ochre, C.saffron, C.saffronLight],
};

/** Wax seal: wobbly blob with drips, raised inner ring and a glossy highlight. */
export function sealUrl(size: number, color: SealColor = 'madder'): string {
  return memo(`seal-${size}-${color}`, () => {
    const [dk, md, lt] = SEAL[color];
    const p = new Painter(size, size);
    const r = rng(size * 31 + color.length);
    const cx = size / 2;
    const R = size / 2 - 1;
    const wob = Array.from({ length: 12 }, () => 0.85 + r() * 0.15);
    for (let j = 0; j < size; j++)
      for (let i = 0; i < size; i++) {
        const dx = i + 0.5 - cx;
        const dy = j + 0.5 - cx;
        const a = ((Math.atan2(dy, dx) / (Math.PI * 2)) * 12 + 12) % 12;
        const k = Math.floor(a);
        const f = a - k;
        const rr = R * (wob[k] * (1 - f) + wob[(k + 1) % 12] * f);
        const d = Math.hypot(dx, dy);
        if (d > rr) continue;
        let col = md;
        if (Math.abs(d - rr * 0.68) < 0.7) col = dk;
        else if (Math.abs(d - rr * 0.68 + 0.9) < 0.5 && dx + dy < 0) col = lt;
        p.set(i, j, col);
      }
    // gloss
    p.set(Math.floor(cx - R * 0.45), Math.floor(cx - R * 0.5), C.emberLight);
    p.set(Math.floor(cx - R * 0.45) + 1, Math.floor(cx - R * 0.5), lt);
    p.finish(C.aubergine, true);
    return p.toCanvas();
  });
}

/** Three-frame lever toggle sheet (off, mid, on), each 14x12. */
export function leverSheetUrl(): string {
  return memo('lever', () => {
    const W = 14;
    const H = 12;
    const sheet = canvas(W * 3, H);
    const ctx = sheet.getContext('2d')!;
    for (let f = 0; f < 3; f++) {
      const p = new Painter(W, H);
      p.rect(2, 8, 10, 3, C.umber);
      p.rect(4, 7, 6, 1, C.stone);
      const tx = [3, 7, 11][f];
      p.line(7, 8, tx, 2, C.stoneLight);
      p.disc(tx + 0.5, 2.5, 1.7, f === 2 ? C.mossLight : f === 0 ? C.madder : C.saffron);
      ctx.drawImage(p.finish().toCanvas(), f * W, 0);
    }
    return sheet;
  });
}

/** Brass pin for pinned notes. */
export function pinUrl(): string {
  return memo('pin', () => {
    const p = new Painter(7, 9);
    p.disc(3.5, 3, 2.6, C.madder);
    p.set(2, 2, C.emberLight);
    p.rect(3, 5, 1, 3, C.stone);
    return p.finish().toCanvas();
  });
}

/** Brass bead for sliders. */
export function beadUrl(): string {
  return memo('bead', () => {
    const p = new Painter(10, 10);
    p.disc(5, 5, 4.3, C.woad);
    p.set(3, 3, C.foam);
    return p.finish().toCanvas();
  });
}

export interface PortraitSpec {
  seed: string;
  skin?: 'fair' | 'ruddy' | 'olive';
  hair?: number;
  hat?: 'none' | 'hood' | 'coif' | 'cap' | 'mitre' | 'helm' | 'veil' | 'chaperon' | 'crown';
  garb?: number;
  trim?: number;
  beard?: boolean;
  age?: 'young' | 'adult' | 'old';
  bg?: number;
}

/** 24x24 pixel portrait assembled from simple parts; deterministic per seed. */
export function portraitUrl(s: PortraitSpec): string {
  return memo('portrait-' + JSON.stringify(s), () => {
    const r = rng(hashStr(s.seed));
    const p = new Painter(24, 24);
    const skin = s.skin === 'ruddy' ? C.tan : s.skin === 'olive' ? C.umber : C.parchmentDark;
    const hair = s.hair ?? [C.sepia, C.ink, C.umber, C.ochre, C.stone][Math.floor(r() * 5)];
    const garb = s.garb ?? [C.madder, C.woad, C.moss, C.plum, C.umber][Math.floor(r() * 5)];
    const trim = s.trim ?? C.saffron;
    const old = s.age === 'old';
    // shoulders & garb
    p.ellipse(12, 24, 10, 6.5, garb);
    p.rect(7, 18, 10, 2, garb);
    p.tint(11, 18, 2, 6, trim);
    // neck and head
    p.rect(10, 15, 4, 3, skin);
    p.ellipse(12, 11, 4.6, 5.6, skin);
    // hair
    if (s.hat !== 'coif' && s.hat !== 'veil' && s.hat !== 'helm') {
      p.ellipse(12, 7.5, 5, 3.2, hair);
      p.rect(7, 7, 2, 5, hair);
      p.rect(15, 7, 2, 5, hair);
    }
    // eyes, brows, mouth, nose
    p.set(10, 11, C.aubergine);
    p.set(14, 11, C.aubergine);
    p.set(9, 10, old ? C.stone : hair);
    p.set(10, 10, old ? C.stone : hair);
    p.set(14, 10, old ? C.stone : hair);
    p.set(15, 10, old ? C.stone : hair);
    p.set(12, 13, C.umber);
    p.rect(11, 15, 3, 1, C.madderDark);
    if (s.beard) {
      p.rect(9, 14, 7, 3, old ? C.stoneLight : hair);
      p.ellipse(12, 16.5, 3.4, 2, old ? C.stoneLight : hair);
      p.rect(11, 15, 3, 1, C.madderDark);
    }
    if (old) {
      p.set(9, 13, C.umber);
      p.set(15, 13, C.umber);
    }
    // headwear
    switch (s.hat) {
      case 'hood':
        p.ellipse(12, 9, 6.5, 6, garb);
        p.ellipse(12, 11.5, 4.2, 5, skin);
        p.rect(6, 12, 3, 6, garb);
        p.rect(15, 12, 3, 6, garb);
        p.set(10, 11, C.aubergine); p.set(14, 11, C.aubergine); p.set(12, 13, C.umber); p.rect(11, 15, 3, 1, C.madderDark);
        break;
      case 'coif':
      case 'veil':
        p.ellipse(12, 8.5, 6, 5, s.hat === 'veil' ? C.parchmentLight : C.cream);
        p.rect(6, 9, 2, 9, s.hat === 'veil' ? C.parchmentLight : C.cream);
        p.rect(16, 9, 2, 9, s.hat === 'veil' ? C.parchmentLight : C.cream);
        if (s.hat === 'veil') p.rect(8, 15, 8, 3, C.cream);
        p.set(10, 11, C.aubergine); p.set(14, 11, C.aubergine);
        break;
      case 'cap':
        p.ellipse(12, 5.5, 6.5, 2.4, garb);
        p.rect(6, 6, 12, 1, trim);
        break;
      case 'chaperon':
        p.ellipse(12, 5, 7, 3.2, garb);
        p.poly([[15, 5], [21, 3], [21, 6], [17, 8]], garb);
        p.rect(5, 6, 14, 2, garb);
        break;
      case 'mitre':
        p.poly([[7, 7], [7, 3], [12, -1], [17, 3], [17, 7]], C.cream);
        p.tint(11, 0, 2, 7, C.saffron);
        p.tint(7, 5, 10, 1, C.saffron);
        break;
      case 'helm':
        p.ellipse(12, 8, 5.6, 5, C.stone);
        p.rect(6, 9, 12, 2, C.stone);
        p.rect(11, 9, 2, 5, C.stone);
        break;
      case 'crown':
        p.poly([[7, 6], [7, 2], [9, 4], [12, 1], [15, 4], [17, 2], [17, 6]], C.saffron);
        p.set(12, 4, C.madder);
        break;
    }
    // soft backdrop plate behind (drawn after outline so it stays flat)
    p.finish(C.aubergine, true);
    const out = canvas(24, 24);
    const ctx = out.getContext('2d')!;
    const bg = s.bg ?? C.woadDeep;
    ctx.fillStyle = MASTER[bg];
    ctx.fillRect(0, 0, 24, 24);
    for (let j = 0; j < 24; j++)
      for (let i = 0; i < 24; i++) if (((i + j) & 3) === 0 && j > 12) put(ctx, i, j, C.aubergineDeep, 0.35);
    ctx.drawImage(p.toCanvas(), 0, 0);
    return out;
  });
}

const vesselCache = new Map<string, HTMLCanvasElement>();

export type SailLivery = 'ashby' | 'fenby' | 'hanse' | 'crown' | 'wine' | 'tilney' | 'french' | 'plain';
export type VesselKind = 'cog' | 'hulk' | 'galley' | 'balinger' | 'coaster' | 'cart' | 'horse';

const SAIL: Record<SailLivery, { field: number; band: number }> = {
  ashby: { field: C.madder, band: C.saffron },
  fenby: { field: C.woadMid, band: C.parchmentLight },
  hanse: { field: C.cream, band: C.madder },
  crown: { field: C.saffron, band: C.woad },
  wine: { field: C.madderDark, band: C.saffronLight },
  tilney: { field: C.parchmentLight, band: C.woadMid },
  french: { field: C.umber, band: C.sepia },
  plain: { field: C.parchmentLight, band: C.parchmentDark },
};

export function liveryOf(owner: string): SailLivery {
  if (owner === 'player') return 'ashby';
  if (owner === 'Dame Fenby') return 'fenby';
  if (owner === 'The Hanse') return 'hanse';
  if (owner === 'The Crown') return 'crown';
  if (owner === 'The Wine Fleet') return 'wine';
  if (owner === 'The Tilneys of Lynn') return 'tilney';
  if (owner === 'French privateers') return 'french';
  return 'plain';
}

/** Side-on pixel ships / carts for the Pixi overlay. Anchor at the keel. `frame` 0|1 flutters the sail. */
export function vesselCanvas(kind: VesselKind, sail: SailLivery = 'plain', frame = 0): HTMLCanvasElement {
  const key = `${kind}:${sail}:${frame}`;
  let c = vesselCache.get(key);
  if (c) return c;
  const S = SAIL[sail];
  const flutter = frame ? 1 : 0;
  const p = new Painter(kind === 'hulk' || kind === 'horse' ? 28 : 24, kind === 'cart' || kind === 'horse' ? 14 : kind === 'coaster' ? 16 : 18);
  if (kind === 'cart') {
    p.rect(2, 6, 16, 4, C.tan);
    p.rect(2, 5, 16, 1, C.umber);
    p.disc(7, 4, 2.2, S.field);
    p.disc(13, 4, 2.2, S.band);
    p.disc(6, 11, 2.4, C.sepia);
    p.disc(16, 11, 2.4, C.sepia);
    p.line(18, 8, 22, 6, C.umber);
  } else if (kind === 'horse') {
    p.ellipse(8, 8, 5, 3.2, C.tan);
    p.rect(10, 5, 3, 3, C.umber);
    p.rect(4, 6, 2, 3, C.sepia);
    p.rect(11, 9, 1, 4, C.sepia);
    p.rect(6, 9, 1, 4, C.sepia);
    p.ellipse(20, 8, 4.5, 3, C.tan);
    p.rect(16, 6, 2, 3, C.sepia);
    p.rect(22, 9, 1, 4, C.sepia);
    p.rect(18, 9, 1, 4, C.sepia);
    p.rect(6, 4, 4, 3, S.field);
    p.rect(18, 4, 4, 3, S.band);
  } else if (kind === 'galley') {
    p.poly([[1, 12], [23, 12], [21, 15], [3, 15]], C.umber);
    p.rect(2, 11, 20, 1, C.sepia);
    for (let x = 3; x < 21; x += 3) p.rect(x, 10, 1, 4, C.stone);
    p.rect(11, 2, 1, 10, C.sepia);
    p.rect(8, 3, 7, 5, S.field);
    p.tint(8, 5, 7, 1, S.band);
  } else if (kind === 'balinger') {
    p.poly([[1, 11], [22, 10], [20, 14], [3, 15]], C.sepia);
    p.rect(10, 2, 1, 9, C.umber);
    p.poly([[11, 3], [18 + flutter, 7], [11, 8]], S.field);
    p.rect(2, 10, 3, 2, C.umber);
  } else if (kind === 'hulk') {
    p.poly([[1, 12], [26, 12], [23, 16], [4, 16]], C.umber);
    p.rect(3, 9, 22, 3, C.tan);
    p.rect(8, 1, 1, 11, C.sepia);
    p.rect(16, 2, 1, 10, C.sepia);
    p.rect(4, 3, 9, 7, S.field);
    p.rect(13, 4, 8, 6, S.band);
    p.tint(4, 6 + flutter, 9, 1, S.band);
  } else if (kind === 'coaster') {
    p.poly([[2, 10], [20, 10], [18, 14], [4, 14]], C.umber);
    p.rect(10, 1, 1, 10, C.sepia);
    p.poly([[11, 2], [17 + flutter, 6], [11, 8]], S.field);
    p.tint(11, 4, 5, 1, S.band);
  } else {
    p.poly([[1, 12], [22, 12], [19, 16], [4, 16]], C.umber);
    p.rect(2, 10, 3, 2, C.umber);
    p.rect(18, 10, 3, 2, C.umber);
    p.rect(11, 1, 1, 11, C.sepia);
    p.rect(6, 3, 11, 7, S.field);
    p.tint(6, 5 + flutter, 11, 1, S.band);
    p.rect(12, 0, 2, 2, S.band);
  }
  c = p.finish().toCanvas();
  vesselCache.set(key, c);
  return c;
}

export function baleCanvas(): HTMLCanvasElement {
  let c = vesselCache.get('bale');
  if (c) return c;
  const p = new Painter(7, 6);
  p.rect(1, 1, 5, 4, C.parchmentDark);
  p.rect(1, 2, 5, 1, C.parchmentLight);
  p.rect(2, 1, 1, 4, C.umber);
  c = p.finish().toCanvas();
  vesselCache.set('bale', c);
  return c;
}

/** House of Ashby: madder field, gold fleece, woad chief. 12×16 hanging banner. */
export function ashbyArmsCanvas(): HTMLCanvasElement {
  const p = new Painter(12, 16);
  p.rect(0, 0, 12, 16, C.madderDark);
  p.rect(1, 0, 10, 15, C.madder);
  p.rect(1, 0, 10, 4, C.woad);
  p.rect(1, 3, 10, 1, C.woadDeep);
  // hanging pole
  p.rect(0, 0, 12, 1, C.sepia);
  p.rect(5, 0, 2, 1, C.tan);
  // gold fleece: oval body and a looped neck
  p.ellipse(6, 9.5, 3.2, 3.6, C.saffron);
  p.ellipse(6, 9.2, 2.2, 2.6, C.saffronLight);
  p.set(6, 6, C.saffron);
  p.set(7, 5, C.saffronLight);
  p.set(8, 6, C.ochre);
  p.set(5, 12, C.ochre);
  p.set(7, 12, C.ochre);
  p.set(4, 10, C.ochre);
  p.set(8, 10, C.ochre);
  return p.finish().toCanvas();
}

export { EMPTY };
