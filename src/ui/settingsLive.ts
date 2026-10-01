import type { MapRenderer } from '../render/renderer';
import { saveSettings } from '../state/settingsStore';
import type { Store } from '../state/store';
import { applySettingsChrome } from './scale';
import { setSfxVolume } from './kit/sfx';
import { setTooltipsEnabled } from './kit/tooltip';

/** Push the live settings object into chrome, renderer, audio, and localStorage. */
export function commitSettings(store: Store, renderer?: MapRenderer) {
  const s = store.state.settings;
  saveSettings(s);
  applySettingsChrome(s);
  setSfxVolume(s.audio.master / 100);
  setTooltipsEnabled(s.tooltips);
  if (!renderer) return;
  const fx = s.mapFx;
  renderer.effects.hillshade = fx.hillshade;
  renderer.effects.water = fx.water;
  renderer.effects.clouds = fx.clouds;
  renderer.effects.dither = fx.dither;
  renderer.effects.vignette = fx.vignette;
  renderer.lodBlend = fx.lodBlend;
  renderer.pixelScale = s.pixelSize;
}
