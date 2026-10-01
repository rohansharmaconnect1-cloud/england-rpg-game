import type { Camera } from './camera';

/** Mouse wheel, drag, pinch and keyboard controls for a Camera. */
export class CameraInput {
  private pointers = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private keys = new Set<string>();
  private down: { x: number; y: number; t: number; moved: number } | null = null;
  mouseX = -1;
  mouseY = -1;
  /** When false, pan/zoom/keys are ignored (menus, events). */
  enabled = true;
  /** Fired on a click that was not a drag or pinch. Screen CSS pixels. */
  onClick: ((x: number, y: number) => void) | null = null;

  constructor(private readonly el: HTMLElement, private readonly cam: Camera) {
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    el.addEventListener('pointerleave', () => (this.mouseX = this.mouseY = -1));
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.keys.clear());
    el.style.touchAction = 'none';
  }

  update(dt: number) {
    if (!this.enabled) {
      this.keys.clear();
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx += 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx -= 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy -= 1;
    if (dx || dy) {
      const speed = 700 * dt * (this.keys.has('shift') ? 2.5 : 1);
      const n = Math.hypot(dx, dy);
      this.cam.panBy((dx / n) * speed, (dy / n) * speed);
    }
    if (this.keys.has('q') || this.keys.has('-')) this.cam.zoomBy(Math.exp(-dt * 2.5), this.cam.viewW / 2, this.cam.viewH / 2);
    if (this.keys.has('=') || this.keys.has('+')) this.cam.zoomBy(Math.exp(dt * 2.5), this.cam.viewW / 2, this.cam.viewH / 2);
  }

  private local(e: { clientX: number; clientY: number }) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
    const p = this.local(e);
    const unit = e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1;
    // Trackpad pinch arrives as ctrl+wheel with small deltas; make it a bit more sensitive.
    const k = e.ctrlKey ? 0.01 : 0.0018;
    this.cam.zoomBy(Math.exp(-e.deltaY * unit * k), p.x, p.y);
  };

  private onDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    this.el.setPointerCapture(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    if (this.pointers.size === 1) this.down = { x: p.x, y: p.y, t: performance.now(), moved: 0 };
    if (this.pointers.size === 2) {
      this.pinchDist = this.pinchSpan();
      this.down = null;
    }
    this.el.style.cursor = 'grabbing';
  };

  private onMove = (e: PointerEvent) => {
    const p = this.local(e);
    this.mouseX = p.x;
    this.mouseY = p.y;
    if (!this.enabled) return;
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    if (this.down) this.down.moved += Math.hypot(p.x - prev.x, p.y - prev.y);
    if (this.pointers.size === 1) {
      this.cam.panBy(p.x - prev.x, p.y - prev.y);
      this.pointers.set(e.pointerId, p);
      return;
    }
    const before = this.midpoint();
    this.pointers.set(e.pointerId, p);
    const after = this.midpoint();
    this.cam.panBy(after.x - before.x, after.y - before.y);
    const d = this.pinchSpan();
    if (this.pinchDist > 0 && d > 0) this.cam.zoomBy(d / this.pinchDist, after.x, after.y, true);
    this.pinchDist = d;
  };

  private onUp = (e: PointerEvent) => {
    const p = this.local(e);
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 2) this.pinchDist = this.pinchSpan();
    if (this.pointers.size === 0) {
      this.el.style.cursor = 'grab';
      const d = this.down;
      this.down = null;
      if (this.enabled && d && d.moved < 6 && performance.now() - d.t < 500) this.onClick?.(p.x, p.y);
    }
  };

  private onKey = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
    if (!this.enabled) return;
    const k = e.key.toLowerCase();
    if (k.startsWith('arrow')) e.preventDefault();
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private midpoint() {
    let x = 0;
    let y = 0;
    for (const p of this.pointers.values()) {
      x += p.x;
      y += p.y;
    }
    const n = this.pointers.size || 1;
    return { x: x / n, y: y / n };
  }

  private pinchSpan() {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
}
