import './style.css';
import { Camera } from './camera/camera';
import { CameraInput } from './camera/input';
import { Overlay } from './render/overlay';
import { MapRenderer } from './render/renderer';
import { DebugOverlay } from './ui/debug';
import { mountControls } from './ui/controls';
import { project } from './world/projection';
import { SETTLEMENT_POINTS } from './world/settlements';
import { WorldData, loadRawWorld } from './world/worldData';

async function main() {
  const glCanvas = document.getElementById('map') as HTMLCanvasElement;
  const uiCanvas = document.getElementById('overlay') as HTMLCanvasElement;
  const status = document.getElementById('status')!;

  const raw = await loadRawWorld(import.meta.env.BASE_URL + 'data/');
  const world = new WorldData(raw);
  const { worldW, worldH, englandBounds: eb } = raw.meta;

  const cam = new Camera({ x0: 0, y0: 0, x1: worldW, y1: worldH }, { x0: eb[0], y0: eb[1], x1: eb[2], y1: eb[3] }, 10);
  const renderer = new MapRenderer(glCanvas, raw, worldW, worldH);
  const overlay = new Overlay(uiCanvas);
  const input = new CameraInput(uiCanvas, cam);
  const debug = new DebugOverlay(document.getElementById('debug')!);
  mountControls(document.getElementById('controls')!, renderer, () => {});

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const c of [glCanvas, uiCanvas]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    cam.resize(w, h);
  };
  resize();
  cam.fitAll();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Home' || e.key === '0') cam.fitAll();
  });

  if (import.meta.env.DEV) {
    const view = (lon: number, lat: number, miles: number) => {
      const [x, y] = project(lon, lat);
      cam.zoomBy(cam.viewW / miles / cam.zoom, cam.viewW / 2, cam.viewH / 2, true);
      cam.cx = x;
      cam.cy = y;
      cam.panBy(0, 0);
    };
    Object.assign(window, { __map: { cam, renderer, world, view, input } });
  }
  status.remove();
  let last = performance.now();
  const t0 = last;
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    input.update(dt);
    cam.update(dt);
    renderer.render(cam, (now - t0) / 1000, dt);
    overlay.render(cam, SETTLEMENT_POINTS, window.devicePixelRatio || 1, renderer.pixelScale);
    debug.update(dt, cam, renderer, world, [input.mouseX, input.mouseY]);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main().catch((e) => {
  console.error(e);
  const s = document.getElementById('status');
  if (s) s.textContent = `Failed to start: ${e instanceof Error ? e.message : e}`;
});
