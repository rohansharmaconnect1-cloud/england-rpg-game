import type { Camera } from '../camera/camera';
import type { MapRenderer } from '../render/renderer';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import type { WorldData } from '../world/worldData';
import { applyTheme } from './kit/theme';
import { mountTooltips, setTooltipsEnabled } from './kit/tooltip';
import { h } from './kit/dom';
import { applySettingsChrome, computeUiScale } from './scale';
import { mountHud } from './hud';
import { mountTicker } from './ticker';
import { mountTracker } from './tracker';
import { mountToasts } from './toasts';
import { mountCharacterHud } from './characterHud';
import { mountActionBar } from './actionBar';
import { mountMinimap } from './minimap';
import { mountInspector } from './inspector';
import { mountPanels } from './panels';
import { mountMenus } from './menus';
import { mountEventCard } from './eventCard';
import { mountDebugPanel } from './debugPanel';
import { commitSettings } from './settingsLive';
import { bindHotkeys } from './hotkeys';

export function mountShell(
  root: HTMLElement,
  store: Store,
  act: Actions,
  cam: Camera,
  renderer: MapRenderer,
  world: WorldData,
) {
  applyTheme();
  applySettingsChrome(store.state.settings);
  root.classList.add('char-collapsed', 'minimap-collapsed');
  commitSettings(store, renderer);
  renderer.pixelScale = store.state.settings.pixelSize;
  const fx = store.state.settings.mapFx;
  renderer.effects.hillshade = fx.hillshade;
  renderer.effects.water = fx.water;
  renderer.effects.clouds = fx.clouds;
  renderer.effects.dither = fx.dither;
  renderer.effects.vignette = fx.vignette;
  renderer.lodBlend = fx.lodBlend;
  setTooltipsEnabled(store.state.settings.tooltips);
  mountTooltips(root, () => computeUiScale(store.state.settings.uiScale));

  mountHud(root, store, act);
  mountTicker(root, store, act);
  const toasts = mountToasts(root, store, act);
  mountTracker(root, store, act);
  const charHud = mountCharacterHud(root, store, act);
  mountActionBar(root, store, act, cam);
  const minimap = mountMinimap(root, store, cam, world, act);
  mountInspector(root, store, act);
  mountPanels(root, store, act);
  mountMenus(root, store, act, renderer, cam);
  mountEventCard(root, store, act);

  const fpsChip = h('div.fps-chip');
  root.append(fpsChip);
  const paused = h('div.paused-stamp', 'PAUSED');
  root.append(paused);

  const fps = { fps: 0, worst: 0, frames: 0, acc: 0, spike: 0 };
  const mouse: [number, number] = [-1, -1];
  const debug = mountDebugPanel(root, store, act, renderer, cam, world, () => fps, () => mouse);

  store.select(
    (s) => ({ pause: s.clock.speed === 0, inGame: s.ui.inGame, menu: s.ui.menu, event: s.ui.event, showFps: s.settings.showFps }),
    (v) => {
      paused.style.display = v.inGame && !v.menu && !v.event && v.pause ? '' : 'none';
      fpsChip.style.display = v.showFps ? '' : 'none';
    },
  );

  bindHotkeys(store, act);
  window.addEventListener('resize', () => applySettingsChrome(store.state.settings));

  return {
    toasts,
    minimap,
    debug,
    mouse,
    tick(dt: number, now: number) {
      fps.frames++;
      fps.acc += dt;
      fps.spike = Math.max(fps.spike, dt);
      if (fps.acc >= 0.25) {
        fps.fps = fps.frames / fps.acc;
        fps.worst = fps.spike;
        fps.frames = 0;
        fps.acc = 0;
        fps.spike = 0;
        if (store.state.settings.showFps) fpsChip.textContent = `${fps.fps.toFixed(0)} fps`;
      }
      toasts.tick(now);
      charHud.tick(dt);
      debug.update();
    },
  };
}
