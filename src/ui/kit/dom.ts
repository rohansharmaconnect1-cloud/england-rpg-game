import { coinSheetUrl, iconUrl, type IconName } from '../../assets/icons';
import { portraitUrl, type PortraitSpec } from '../../assets/textures';

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string; on?: Record<string, (e: any) => void> };

/** Minimal hyperscript: h('div.panel#id', { title: 'x', on: { click } }, child, ...) */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K | `${K}.${string}` | `${K}#${string}`, attrs?: Attrs | Child, ...children: Child[]): HTMLElementTagNameMap[K] {
  const m = /^([a-z0-9]+)([^]*)$/.exec(tag)!;
  const el = document.createElement(m[1]) as HTMLElementTagNameMap[K];
  for (const part of m[2].match(/[.#][^.#]+/g) ?? []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'on') for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
      else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k in el && typeof v !== 'string') (el as any)[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  } else if (attrs !== undefined) children.unshift(attrs as Child);
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: Element, ...children: Child[]) {
  el.replaceChildren();
  append(el, children);
  return el;
}

/** 16x16 pixel icon, drawn at `scale` art pixels (1 art px = --px CSS px). */
export function icon(name: IconName, cls = ''): HTMLElement {
  const i = h('i.icon');
  if (cls) i.className += ' ' + cls;
  i.style.backgroundImage = `url(${iconUrl(name)})`;
  i.dataset.icon = name;
  return i;
}

export function coin(cls = ''): HTMLElement {
  const c = h('i.coin');
  if (cls) c.className += ' ' + cls;
  c.style.backgroundImage = `url(${coinSheetUrl()})`;
  return c;
}

export function portrait(spec: PortraitSpec, cls = ''): HTMLElement {
  const p = h('div.portrait');
  if (cls) p.className += ' ' + cls;
  p.style.backgroundImage = `url(${portraitUrl(spec)})`;
  return p;
}

export function kbd(key: string) {
  return h('kbd', key);
}
