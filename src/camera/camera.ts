/**
 * 2D camera in world miles. `zoom` is CSS pixels per mile. Zoom is animated in log space toward
 * a target while keeping an anchor point (e.g. the cursor) fixed on screen.
 */
export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export class Camera {
  cx = 0;
  cy = 0;
  zoom = 1;
  viewW = 1;
  viewH = 1;
  minZoom = 1;
  maxZoom = 100;

  private targetZoom = 1;
  private anchorSx = 0;
  private anchorSy = 0;
  private anchorWx = 0;
  private anchorWy = 0;
  private anchored = false;

  constructor(
    /** Area the camera may show (the whole world rectangle). */
    readonly world: Bounds,
    /** Area that must fit on screen at minimum zoom (England). */
    readonly fit: Bounds,
    /** Miles across the screen at maximum zoom. */
    readonly minViewMiles = 10,
  ) {}

  resize(w: number, h: number) {
    this.viewW = w;
    this.viewH = h;
    const fw = this.fit.x1 - this.fit.x0;
    const fh = this.fit.y1 - this.fit.y0;
    this.minZoom = Math.min(w / (fw * 1.06), h / (fh * 1.06));
    this.maxZoom = Math.max(this.minZoom, w / this.minViewMiles);
    this.zoom = clamp(this.zoom, this.minZoom, this.maxZoom);
    this.targetZoom = clamp(this.targetZoom, this.minZoom, this.maxZoom);
    this.clampCenter();
  }

  lookAt(x: number, y: number, zoom?: number) {
    this.cx = x;
    this.cy = y;
    if (zoom != null) this.zoom = this.targetZoom = clamp(zoom, this.minZoom, this.maxZoom);
    this.anchored = false;
    this.clampCenter();
  }

  fitAll() {
    this.cx = (this.fit.x0 + this.fit.x1) / 2;
    this.cy = (this.fit.y0 + this.fit.y1) / 2;
    this.zoom = this.targetZoom = this.minZoom;
    this.anchored = false;
    this.clampCenter();
  }

  /** Multiply target zoom by `factor`, keeping screen point (sx, sy) fixed. */
  zoomBy(factor: number, sx: number, sy: number, immediate = false) {
    this.setAnchor(sx, sy);
    this.targetZoom = clamp(this.targetZoom * factor, this.minZoom, this.maxZoom);
    if (immediate) {
      this.zoom = this.targetZoom;
      this.applyAnchor();
    }
  }

  panBy(dxScreen: number, dyScreen: number) {
    this.cx -= dxScreen / this.zoom;
    this.cy -= dyScreen / this.zoom;
    this.clampCenter();
    if (this.anchored) [this.anchorWx, this.anchorWy] = this.screenToWorld(this.anchorSx, this.anchorSy);
  }

  update(dt: number) {
    if (this.zoom !== this.targetZoom) {
      const a = 1 - Math.exp(-dt * 14);
      const lz = Math.log(this.zoom) + (Math.log(this.targetZoom) - Math.log(this.zoom)) * a;
      this.zoom = Math.exp(lz);
      if (Math.abs(Math.log(this.zoom / this.targetZoom)) < 1e-4) this.zoom = this.targetZoom;
      this.applyAnchor();
    } else {
      this.anchored = false;
    }
  }

  screenToWorld(sx: number, sy: number): [number, number] {
    return [this.cx + (sx - this.viewW / 2) / this.zoom, this.cy + (sy - this.viewH / 2) / this.zoom];
  }

  worldToScreen(wx: number, wy: number): [number, number] {
    return [(wx - this.cx) * this.zoom + this.viewW / 2, (wy - this.cy) * this.zoom + this.viewH / 2];
  }

  /** Miles visible across the screen width. */
  get milesAcross() {
    return this.viewW / this.zoom;
  }

  private setAnchor(sx: number, sy: number) {
    this.anchorSx = sx;
    this.anchorSy = sy;
    [this.anchorWx, this.anchorWy] = this.screenToWorld(sx, sy);
    this.anchored = true;
  }

  private applyAnchor() {
    if (this.anchored) {
      this.cx = this.anchorWx - (this.anchorSx - this.viewW / 2) / this.zoom;
      this.cy = this.anchorWy - (this.anchorSy - this.viewH / 2) / this.zoom;
    }
    this.clampCenter();
  }

  private clampCenter() {
    const hw = this.viewW / (2 * this.zoom);
    const hh = this.viewH / (2 * this.zoom);
    const { x0, y0, x1, y1 } = this.world;
    this.cx = 2 * hw >= x1 - x0 ? (x0 + x1) / 2 : clamp(this.cx, x0 + hw, x1 - hw);
    this.cy = 2 * hh >= y1 - y0 ? (y0 + y1) / 2 : clamp(this.cy, y0 + hh, y1 - hh);
  }
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
