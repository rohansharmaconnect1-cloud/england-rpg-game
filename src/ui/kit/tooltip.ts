import { TIPS, type TipSpec } from '../../content/tooltips';
import { h, kbd } from './dom';

type TipSource = TipSpec | (() => TipSpec | null);
const tips = new WeakMap<Element, TipSource>();
const DELAY = 300;

let layer: HTMLElement;
let card: HTMLElement;
let timer = 0;
let current: Element | null = null;
let enabled = true;
let scaleOf: () => number = () => 1;

/** Attach a tooltip to an element. `data-tip="id"` attributes resolve against content/tooltips. */
export function tip(el: Element, src: TipSource | string) {
  if (typeof src === 'string') (el as HTMLElement).dataset.tip = src;
  else {
    el.classList.add('has-tip');
    tips.set(el, src);
  }
  return el;
}

export function setTooltipsEnabled(v: boolean) {
  enabled = v;
  if (!v) hideTip();
}

function resolve(el: Element): TipSpec | null {
  const src = tips.get(el);
  if (src) return typeof src === 'function' ? src() : src;
  const id = (el as HTMLElement).dataset.tip;
  return id ? TIPS[id] ?? { title: id } : null;
}

function render(spec: TipSpec) {
  const nodes: Node[] = [h('div.tip-title', spec.title, spec.hotkey ? kbd(spec.hotkey) : '')];
  if (spec.desc) nodes.push(h('div.tip-desc', spec.desc));
  for (const e of spec.effects ?? []) nodes.push(h('div.tip-fx', { class: 'tone-' + e.tone }, e.text));
  card.replaceChildren(...nodes);
}

/** Place the card near (x, y) in viewport CSS px, flipping/clamping so it never leaves the screen. */
function place(x: number, y: number, below = true) {
  const z = scaleOf();
  const vw = window.innerWidth / z;
  const vh = window.innerHeight / z;
  const r = card.getBoundingClientRect();
  const w = r.width / (z || 1);
  const hgt = r.height / (z || 1);
  let lx = x / z + 12;
  let ly = below ? y / z + 16 : y / z - hgt - 10;
  if (lx + w > vw - 4) lx = x / z - w - 12;
  if (ly + hgt > vh - 4) ly = y / z - hgt - 10;
  if (ly < 4) ly = 4;
  if (lx < 4) lx = 4;
  card.style.left = `${Math.round(lx)}px`;
  card.style.top = `${Math.round(ly)}px`;
}

export function showTipAt(x: number, y: number, spec: TipSpec) {
  if (!enabled) return;
  render(spec);
  card.classList.add('show');
  place(x, y);
}

export function hideTip() {
  clearTimeout(timer);
  current = null;
  card?.classList.remove('show');
}

export function mountTooltips(root: HTMLElement, scale: () => number) {
  layer = root;
  scaleOf = scale;
  card = h('div.tooltip.parchment-card');
  layer.appendChild(card);
  let mx = 0;
  let my = 0;
  document.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (current && card.classList.contains('show')) place(mx, my);
  });
  document.addEventListener('pointerover', (e) => {
    const t = (e.target as Element | null)?.closest?.('[data-tip], .has-tip');
    const el = t && (tips.has(t) || (t as HTMLElement).dataset.tip) ? t : null;
    if (el === current) return;
    hideTip();
    if (!el || !enabled) return;
    current = el;
    timer = window.setTimeout(() => {
      if (current !== el) return;
      const spec = resolve(el);
      if (!spec) return;
      render(spec);
      card.classList.add('show');
      place(mx, my);
    }, DELAY);
  });
  document.addEventListener('pointerdown', () => hideTip());
}

/** Mark an element as having a code-registered tooltip (so the delegated listener finds it). */
export function tipFn(el: HTMLElement, fn: () => TipSpec | null) {
  el.classList.add('has-tip');
  tips.set(el, fn);
  return el;
}
