import type { Camera } from '../camera/camera';
import type { MapRenderer } from '../render/renderer';
import { unproject } from '../world/projection';
import type { WorldData } from '../world/worldData';

/** Small text overlay: zoom, miles across, LOD, FPS, chunk stats, cursor position. */
export class DebugOverlay {
  private frames = 0;
  private acc = 0;
  private fps = 0;
  private worst = 0;
  private worstShown = 0;

  constructor(private readonly el: HTMLElement) {}

  update(dt: number, cam: Camera, r: MapRenderer, world: WorldData, mouse: [number, number]) {
    this.frames++;
    this.acc += dt;
    this.worst = Math.max(this.worst, dt);
    if (this.acc < 0.25) return;
    this.fps = this.frames / this.acc;
    this.worstShown = this.worst;
    this.frames = 0;
    this.acc = 0;
    this.worst = 0;

    const i = r.info;
    const zoomX = cam.zoom / cam.minZoom;
    let cursor = '';
    if (mouse[0] >= 0) {
      const [wx, wy] = cam.screenToWorld(mouse[0], mouse[1]);
      const [lon, lat] = unproject(wx, wy);
      cursor = `\ncursor   ${lat.toFixed(3)}°N ${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'W' : 'E'}  ${world.regionAt(wx, wy)}`;
    }
    this.el.textContent =
      `zoom     ${zoomX.toFixed(2)}x  (${cam.zoom.toFixed(2)} px/mi)\n` +
      `view     ${cam.milesAcross.toFixed(1)} mi across\n` +
      `lod      ${i.k}  ${fmtMiles(i.texelMiles)}/px  ${i.artPixel.toFixed(1)}px` +
      (i.blend > 0 ? `  → ${i.k + 1} ${Math.round(i.blend * 100)}%\n` : '\n') +
      `fps      ${this.fps.toFixed(0)}  (worst ${(this.worstShown * 1000).toFixed(1)} ms)\n` +
      `chunks   ${r.cache.size} cached  ${r.cache.pending} queued  ${r.cache.genMs.toFixed(1)} ms/gen` +
      cursor;
  }
}

function fmtMiles(m: number) {
  return m >= 1 ? `${m} mi` : `${Math.round(m * 1760)} yd`;
}
