import type { IconName } from '../../assets/icons';
import { C, MASTER, SEM } from '../../assets/palette';
import { sealUrl, type SealColor } from '../../assets/textures';
import type { Tone } from '../../state/types';
import type { TipSpec } from '../../content/tooltips';
import { h, icon, kbd } from './dom';
import { playSfx } from './sfx';
import { tip } from './tooltip';

export type Size = 'sm' | 'md' | 'lg';

// ---- Parchment panel ---------------------------------------------------------------------------

export interface PanelOpts {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  cls?: string;
  dark?: boolean;
  onClose?: () => void;
  illuminated?: boolean;
}

export function panel(o: PanelOpts = {}) {
  const body = h('div.panel-body');
  const head = o.title
    ? h('header.panel-head',
        o.icon ? icon(o.icon, 'panel-icon') : null,
        h('div.panel-titles', h(o.illuminated ? 'h1.panel-title.illuminated' : 'h2.panel-title', dropCap(o.title, !!o.illuminated)), o.subtitle ? h('div.panel-sub', o.subtitle) : null),
        o.onClose ? closeSeal(o.onClose) : null)
    : null;
  const el = h('section.panel', { class: (o.dark ? 'dark ' : '') + (o.cls ?? '') }, head, body);
  return { el, body, head };
}

function dropCap(title: string, on: boolean) {
  if (!on) return title;
  return [h('span.dropcap', title[0]), title.slice(1)];
}

export function closeSeal(onClose: () => void) {
  const b = sealButton({ glyph: '✕', size: 'sm', color: 'madder', onClick: onClose, label: undefined, tip: { title: 'Close', hotkey: 'Esc' } });
  b.classList.add('close-seal');
  return b;
}

// ---- Buttons -----------------------------------------------------------------------------------

const SEAL_PX: Record<Size, number> = { sm: 12, md: 16, lg: 22 };

export interface SealOpts {
  glyph?: string;
  icon?: IconName;
  label?: string;
  size?: Size;
  color?: SealColor;
  hotkey?: string;
  onClick?: (e: MouseEvent) => void;
  tip?: TipSpec | string;
  disabled?: boolean;
  badge?: boolean;
  cls?: string;
}

/** Round wax seal with an embossed glyph or icon, and an optional label ribbon beside it. */
export function sealButton(o: SealOpts): HTMLButtonElement {
  const size = o.size ?? 'md';
  const seal = h('span.seal', { class: 'seal-' + size });
  seal.style.backgroundImage = `url(${sealUrl(SEAL_PX[size], o.color ?? 'madder')})`;
  if (o.icon) seal.appendChild(icon(o.icon, 'seal-icon'));
  else if (o.glyph) seal.appendChild(h('span.seal-glyph', o.glyph));
  const b = h('button.seal-btn', { class: `size-${size}${o.badge ? ' has-badge' : ''}${o.cls ? ' ' + o.cls : ''}`, type: 'button' }, seal, o.label ? h('span.seal-label', o.label) : null, o.hotkey ? kbd(o.hotkey) : null);
  if (o.disabled) {
    b.setAttribute('aria-disabled', 'true');
    b.classList.add('is-disabled');
  } else {
    b.addEventListener('click', (e) => {
      playSfx('seal_press');
      o.onClick?.(e);
    });
  }
  b.addEventListener('pointerenter', () => playSfx('ui_hover'));
  if (o.tip) tip(b, o.tip);
  return b;
}

export interface StampOpts {
  label: string;
  icon?: IconName;
  size?: Size;
  ink?: 'madder' | 'ink' | 'woad';
  hotkey?: string;
  onClick?: (e: MouseEvent) => void;
  tip?: TipSpec | string;
  disabled?: boolean;
  cls?: string;
}

/** Rectangular ink-stamp button, pressed into the parchment. */
export function stampButton(o: StampOpts): HTMLButtonElement {
  const b = h('button.stamp-btn', { class: `size-${o.size ?? 'md'} ink-${o.ink ?? 'madder'} ${o.cls ?? ''}`, type: 'button' },
    o.icon ? icon(o.icon) : null, h('span.stamp-label', o.label), o.hotkey ? kbd(o.hotkey) : null);
  if (o.disabled) {
    b.setAttribute('aria-disabled', 'true');
    b.classList.add('is-disabled');
  } else {
    b.addEventListener('click', (e) => {
      playSfx('stamp_press');
      o.onClick?.(e);
    });
  }
  b.addEventListener('pointerenter', () => playSfx('ui_hover'));
  if (o.tip) tip(b, o.tip);
  return b;
}

// ---- Bookmark tabs -----------------------------------------------------------------------------

export interface TabItem {
  id: string;
  label: string;
  icon?: IconName;
  color?: number;
}

const RIBBONS = [C.madder, C.woad, C.moss, C.plum, C.ochre, C.fen];

export function bookmarks(items: TabItem[], active: string, onPick: (id: string) => void) {
  const nav = h('nav.bookmarks');
  const render = (cur: string) => {
    nav.replaceChildren(
      ...items.map((t, i) => {
        const b = h('button.bookmark', { type: 'button', class: t.id === cur ? 'active' : '', on: { click: () => { if (t.id !== cur) { onPick(t.id); } } } },
          t.icon ? icon(t.icon) : null, h('span', t.label));
        b.style.setProperty('--ribbon', MASTER[t.color ?? RIBBONS[i % RIBBONS.length]]);
        return b;
      }),
    );
  };
  render(active);
  return { el: nav, set: render };
}

// ---- Lever toggle ------------------------------------------------------------------------------

export function lever(label: string, value: boolean, onChange: (v: boolean) => void, tipSpec?: TipSpec) {
  const sprite = h('span.lever-sprite');
  const el = h('button.lever', { type: 'button', role: 'switch', 'aria-checked': String(value) }, sprite, h('span.lever-label', label));
  let v = value;
  const set = (nv: boolean, animate = true) => {
    v = nv;
    el.setAttribute('aria-checked', String(v));
    el.classList.toggle('on', v);
    if (animate) {
      el.classList.add('moving');
      setTimeout(() => el.classList.remove('moving'), 90);
    }
  };
  set(v, false);
  el.addEventListener('click', () => {
    set(!v);
    playSfx('ui_toggle');
    onChange(v);
  });
  if (tipSpec) tip(el, tipSpec);
  return { el, set: (nv: boolean) => nv !== v && set(nv) };
}

// ---- Brass slider ------------------------------------------------------------------------------

export function slider(label: string, value: number, min: number, max: number, onInput: (v: number) => void, step = 1, fmt = (v: number) => String(v)) {
  const input = h('input.brass', { type: 'range', min: String(min), max: String(max), step: String(step) }) as HTMLInputElement;
  input.value = String(value);
  const out = h('output.slider-val', fmt(value));
  const paint = () => input.style.setProperty('--fill', `${((Number(input.value) - min) / (max - min)) * 100}%`);
  paint();
  input.addEventListener('input', () => {
    out.textContent = fmt(Number(input.value));
    paint();
    playSfx('ui_slider');
    onInput(Number(input.value));
  });
  const el = h('label.slider', h('span.slider-label', label), input, out);
  return {
    el,
    set(v: number) {
      input.value = String(v);
      out.textContent = fmt(v);
      paint();
    },
  };
}

// ---- Scroll dropdown ---------------------------------------------------------------------------

export function dropdown<T extends string | number>(options: { value: T; label: string }[], value: T, onPick: (v: T) => void) {
  let cur = value;
  const btn = h('button.scroll-select', { type: 'button', 'aria-haspopup': 'listbox' });
  const list = h('ul.scroll-list', { role: 'listbox' });
  const el = h('div.dropdown', btn, list);
  const label = () => options.find((o) => o.value === cur)?.label ?? String(cur);
  const render = () => {
    btn.replaceChildren(h('span.scroll-rod'), h('span.scroll-value', label()), h('span.scroll-caret', '▾'), h('span.scroll-rod'));
    list.replaceChildren(
      ...options.map((o) =>
        h('li', { role: 'option', class: o.value === cur ? 'sel' : '', on: { click: (e: Event) => { e.stopPropagation(); cur = o.value; el.classList.remove('open'); render(); playSfx('ui_dropdown_pick'); onPick(cur); } } }, o.label),
      ),
    );
  };
  render();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !el.classList.contains('open');
    document.querySelectorAll('.dropdown.open').forEach((d) => d.classList.remove('open'));
    el.classList.toggle('open', open);
    if (open) playSfx('ui_dropdown_open');
  });
  document.addEventListener('click', () => el.classList.remove('open'));
  return { el, set: (v: T) => { cur = v; render(); } };
}

// ---- Glass vial meter --------------------------------------------------------------------------

export const TONE_COLOR: Record<Tone, number> = {
  profit: SEM.profit, loss: SEM.loss, heat: SEM.heat, loyalty: SEM.loyalty, gold: SEM.gold, neutral: C.umber,
};

export interface VialOpts {
  tone: Tone;
  orient?: 'h' | 'v';
  value: number;
  max?: number;
  label?: string;
  icon?: IconName;
  cls?: string;
  tip?: TipSpec | string;
}

/** A glass vial (horizontal) or ink-well flask (vertical) with sloshing liquid. */
export function vial(o: VialOpts) {
  const liquid = h('span.liquid');
  const glass = h('span.glass', liquid, h('span.gloss'));
  const el = h('div.vial', { class: `${o.orient === 'v' ? 'vert' : 'horiz'} tone-${o.tone} ${o.cls ?? ''}` },
    o.icon ? icon(o.icon, 'vial-icon') : null, glass, o.label ? h('span.vial-label', o.label) : null);
  el.style.setProperty('--liquid', MASTER[TONE_COLOR[o.tone]]);
  el.style.setProperty('--slosh-delay', `${-Math.random() * 3}s`);
  const set = (v: number, max = o.max ?? 100) => {
    const f = Math.max(0, Math.min(1, v / max));
    el.style.setProperty('--fill', `${(f * 100).toFixed(1)}%`);
  };
  set(o.value);
  if (o.tip) tip(el, o.tip);
  return { el, set };
}

// ---- Sparkline ---------------------------------------------------------------------------------

/** Pixel-art line chart into a small canvas (drawn at 1 art px per canvas px). */
export function sparkline(values: number[], w = 40, h0 = 12, tone?: Tone): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h0;
  c.className = 'sparkline';
  drawSparkline(c, values, tone);
  return c;
}

export function drawSparkline(c: HTMLCanvasElement, values: number[], tone?: Tone) {
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  if (values.length < 2) return;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const t = tone ?? (values[values.length - 1] >= values[0] ? 'profit' : 'loss');
  const col = MASTER[TONE_COLOR[t]];
  const ys = values.map((v) => Math.round((c.height - 2) * (1 - (v - lo) / (hi - lo || 1))) + 1);
  ctx.fillStyle = MASTER[C.parchmentDark];
  ctx.globalAlpha = 0.6;
  for (let x = 0; x < c.width; x += 2) ctx.fillRect(x, c.height - 1, 1, 1);
  ctx.globalAlpha = 1;
  let py = -1;
  for (let x = 0; x < c.width; x++) {
    const i = Math.round((x / (c.width - 1)) * (values.length - 1));
    const y = ys[i];
    ctx.fillStyle = col;
    if (py >= 0 && Math.abs(y - py) > 1) ctx.fillRect(x, Math.min(y, py), 1, Math.abs(y - py));
    ctx.fillRect(x, y, 1, 1);
    py = y;
  }
  ctx.fillStyle = MASTER[C.ink];
  ctx.fillRect(c.width - 1, ys[ys.length - 1], 1, 1);
}
