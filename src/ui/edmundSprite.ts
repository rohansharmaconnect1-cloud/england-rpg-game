import { C } from '../assets/palette';
import { Painter } from '../assets/pixel';
import type { WardrobeSlot } from '../state/types';

export type EdmundPose = 'idle' | 'blink' | 'coins' | 'slump' | 'proud' | 'glance' | 'shrug' | 'cap' | 'glass';

export function outfitOf(wardrobe: WardrobeSlot[]) {
  const gown = wardrobe.find((w) => w.slot === 'Gown')?.item.toLowerCase() ?? '';
  const hood = wardrobe.find((w) => w.slot === 'Hood')?.item.toLowerCase() ?? '';
  let garb: number = C.plum;
  if (/scarlet|madder|red/.test(gown)) garb = C.madder;
  else if (/woad|blue/.test(gown)) garb = C.woad;
  else if (/moss|green/.test(gown)) garb = C.moss;
  else if (/mourning|dun/.test(gown)) garb = C.umber;
  else if (/father/.test(gown)) garb = C.plum;
  return { garb, hoodOn: /hood|cap|chaperon|veil/.test(hood) };
}

const cache = new Map<string, HTMLCanvasElement>();

export function paintEdmund(
  pose: EdmundPose,
  garb: number,
  hoodOn: boolean,
  night: boolean,
  flicker: boolean,
  breathe: 0 | 1,
): HTMLCanvasElement {
  const key = `${pose}|${garb}|${hoodOn ? 1 : 0}|${night ? 1 : 0}|${flicker ? 1 : 0}|${breathe}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const p = new Painter(64, 56);
  p.rect(0, 0, 64, 40, C.parchmentDark);
  p.rect(0, 36, 64, 4, C.umber);
  p.rect(0, 40, 64, 16, C.tan);

  p.rect(4, 4, 22, 18, night ? C.woadDeep : C.seaLight);
  if (night) {
    p.set(8, 7, C.cream);
    p.set(18, 9, C.saffronLight);
    p.set(12, 12, C.cream);
    p.disc(21, 8, 2.2, C.parchmentLight);
  } else {
    p.rect(5, 5, 20, 8, C.foam);
    p.rect(5, 13, 20, 8, C.mossLight);
  }
  p.rect(14, 4, 2, 18, C.umber);
  p.rect(4, 12, 22, 2, C.umber);
  p.rect(3, 3, 24, 1, C.sepia);
  p.rect(3, 3, 1, 20, C.sepia);
  p.rect(26, 3, 1, 20, C.sepia);
  p.rect(3, 22, 24, 1, C.sepia);

  p.rect(38, 34, 24, 4, C.umber);
  p.rect(40, 38, 20, 12, C.sepia);
  p.rect(42, 32, 10, 5, C.parchmentLight);
  p.rect(43, 33, 8, 1, C.ink);
  p.rect(43, 35, 6, 1, C.sepia);
  p.rect(55, 26, 2, 9, C.parchmentLight);
  p.rect(54, 34, 4, 2, C.umber);
  p.disc(56, 24, flicker ? 2.4 : 2, flicker ? C.emberLight : C.saffron);
  p.set(56, 22, C.cream);
  p.disc(50, 33, 1.6, C.woadDeep);

  const dy = (pose === 'slump' ? 2 : pose === 'proud' ? -1 : 0) + breathe;
  const headY = 14 + dy;
  const headX = pose === 'glance' ? 20 : 22;

  p.rect(20, 48 + dy, 5, 3, C.sepia);
  p.rect(27, 48 + dy, 5, 3, C.sepia);
  p.rect(21, 42 + dy, 4, 7, C.umber);
  p.rect(28, 42 + dy, 4, 7, C.umber);
  p.poly([[18, 42 + dy], [35, 42 + dy], [33, 24 + dy], [20, 24 + dy]], garb);
  p.rect(20, 24 + dy, 13, 18, garb);
  p.rect(20, 36 + dy, 13, 2, C.saffron);
  p.set(26, 37 + dy, C.ochre);

  if (pose === 'shrug') {
    p.rect(14, 24 + dy, 6, 3, garb);
    p.rect(33, 24 + dy, 6, 3, garb);
    p.rect(12, 22 + dy, 3, 3, C.parchment);
    p.rect(38, 22 + dy, 3, 3, C.parchment);
  } else if (pose === 'coins') {
    p.rect(33, 28 + dy, 4, 8, garb);
    p.rect(36, 32, 4, 3, C.parchment);
    p.disc(40, 32, 1.6, C.saffron);
    p.rect(16, 28 + dy, 4, 10, garb);
  } else if (pose === 'glass') {
    p.rect(33, 26 + dy, 4, 8, garb);
    p.rect(36, 24, 3, 6, C.stone);
    p.rect(37, 22, 1, 3, C.sepia);
    p.tint(36, 25, 3, 4, C.foam);
    p.rect(16, 28 + dy, 4, 10, garb);
  } else if (pose === 'cap') {
    p.rect(16, 20 + dy, 5, 8, garb);
    p.rect(18, 16 + dy, 3, 4, C.parchment);
    p.rect(33, 28 + dy, 4, 10, garb);
  } else if (pose === 'slump') {
    p.rect(16, 26 + dy, 5, 10, garb);
    p.rect(18, 16 + dy, 3, 6, C.parchment);
    p.rect(33, 30 + dy, 4, 8, garb);
  } else {
    p.rect(16, 28 + dy, 4, 10, garb);
    p.rect(33, 28 + dy, 4, 10, garb);
    p.rect(15, 37 + dy, 3, 2, C.parchment);
    p.rect(35, 37 + dy, 3, 2, C.parchment);
  }

  p.rect(24, 22 + dy, 5, 3, C.parchmentLight);
  if (hoodOn && pose !== 'cap') {
    p.poly([[headX - 3, 28 + dy], [headX + 14, 28 + dy], [headX + 11, headY], [headX, headY]], C.umber);
  }
  p.ellipse(headX + 4, headY + 6, 5.2, 5.8, C.parchmentLight);
  p.ellipse(headX + 4, headY + 3, 5, 2.8, C.umber);
  if (hoodOn && pose !== 'cap') {
    p.rect(headX - 1, headY, 11, 3, C.umber);
    p.set(headX, headY + 3, C.umber);
    p.set(headX + 9, headY + 3, C.umber);
  }
  if (pose !== 'blink') {
    if (pose === 'glance') {
      p.set(headX + 2, headY + 6, C.ink);
      p.set(headX + 5, headY + 6, C.ink);
    } else {
      p.set(headX + 3, headY + 6, C.ink);
      p.set(headX + 6, headY + 6, C.ink);
    }
    p.set(headX + 3, headY + 5, C.cream);
    p.set(headX + 6, headY + 5, C.cream);
  }
  if (pose === 'proud') {
    p.set(headX + 3, headY + 9, C.madder);
    p.set(headX + 4, headY + 9, C.madder);
    p.set(headX + 5, headY + 9, C.madder);
  } else if (pose === 'slump') {
    p.set(headX + 4, headY + 9, C.sepia);
  } else {
    p.set(headX + 4, headY + 9, C.umber);
  }

  const c = p.finish(C.aubergine).toCanvas(2);
  cache.set(key, c);
  return c;
}
