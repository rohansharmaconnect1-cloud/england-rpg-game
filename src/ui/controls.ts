import type { MapRenderer } from '../render/renderer';
import type { FxName } from '../render/shaders';

const LABELS: Record<FxName, string> = {
  hillshade: 'Hill shading',
  water: 'Water shimmer',
  clouds: 'Cloud shadows',
  dither: 'Dithering',
  vignette: 'Vignette',
};

/** Shader toggle panel (master switch on H) plus pixel-size selector. */
export function mountControls(el: HTMLElement, r: MapRenderer, onPixelScale: () => void) {
  el.innerHTML = '';
  const master = document.createElement('button');
  const sync = () => {
    master.textContent = `Shaders: ${r.shadersOn ? 'ON' : 'OFF'}  [H]`;
    master.classList.toggle('off', !r.shadersOn);
    el.querySelectorAll('input[type=checkbox]:not([data-always])').forEach((c) => ((c as HTMLInputElement).disabled = !r.shadersOn));
  };
  master.onclick = () => {
    r.shadersOn = !r.shadersOn;
    sync();
  };
  el.appendChild(master);

  for (const name of Object.keys(LABELS) as FxName[]) {
    const row = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = r.effects[name];
    cb.onchange = () => (r.effects[name] = cb.checked);
    row.append(cb, ' ' + LABELS[name]);
    el.appendChild(row);
  }

  const fadeRow = document.createElement('label');
  const fade = document.createElement('input');
  fade.type = 'checkbox';
  fade.checked = r.lodBlend;
  fade.dataset.always = '1';
  fade.onchange = () => (r.lodBlend = fade.checked);
  fadeRow.append(fade, ' Smooth detail fade');
  el.appendChild(fadeRow);

  const px = document.createElement('label');
  const sel = document.createElement('select');
  for (const v of [2, 3, 4, 5]) {
    const o = document.createElement('option');
    o.value = String(v);
    o.textContent = `${v}px`;
    if (v === r.pixelScale) o.selected = true;
    sel.appendChild(o);
  }
  sel.onchange = () => {
    r.pixelScale = Number(sel.value);
    onPixelScale();
  };
  px.append('Pixel size ', sel);
  el.appendChild(px);

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h' && !(e.target instanceof HTMLInputElement)) master.click();
  });
  sync();
}
