/** Shared easing + tweening. Everything eases; nothing moves linearly. Honour "Reduce motion". */
export const motion = { reduced: false };

export const ease = {
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
};

const running = new WeakMap<Element, number>();

/** Count a number shown in `el` from its last value to `to`, formatting each frame. */
export function countTo(el: HTMLElement, to: number, fmt: (v: number) => string, ms = 650) {
  const from = Number(el.dataset.value ?? to);
  el.dataset.value = String(to);
  const prev = running.get(el);
  if (prev) cancelAnimationFrame(prev);
  if (motion.reduced || from === to) {
    el.textContent = fmt(to);
    return;
  }
  el.classList.remove('tick-up', 'tick-down');
  void el.offsetWidth;
  el.classList.add(to > from ? 'tick-up' : 'tick-down');
  const t0 = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / ms);
    el.textContent = fmt(from + (to - from) * ease.outCubic(t));
    if (t < 1) running.set(el, requestAnimationFrame(step));
    else running.delete(el);
  };
  running.set(el, requestAnimationFrame(step));
}
