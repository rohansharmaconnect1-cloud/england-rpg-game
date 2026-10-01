import { motion } from './kit/anim';
import type { Settings } from '../state/types';

/** Integer UI scale so pixel chrome stays crisp. Auto: 2× on 1080p/1440p, 3× on 4K. */
export function computeUiScale(mode: Settings['uiScale']): number {
  if (mode !== 'auto') return mode;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  const cssLong = Math.max(w, h);
  const physLong = cssLong * dpr;
  if (cssLong >= 3200 || physLong >= 7000) return 3;
  if (w >= 1200 || h >= 700) return 2;
  return 1;
}

export function applyUiScale(n: number) {
  const root = document.documentElement;
  root.style.setProperty('--ui-scale', String(n));
  root.dataset.uiScale = String(n);
}

export function applyMotion(reduced: boolean) {
  motion.reduced = reduced;
  document.documentElement.classList.toggle('reduce-motion', reduced);
}

export function applySettingsChrome(s: Settings) {
  applyUiScale(computeUiScale(s.uiScale));
  applyMotion(s.reduceMotion);
  document.documentElement.style.setProperty('--px', '1px');
}
