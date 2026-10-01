import type { Settings } from './types';

const KEY = 'tally.settings.v1';

/** The one settings object the UI and renderer read. GameState.settings holds the live copy. */
export function defaultSettings(): Settings {
  const reduce =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    uiScale: 'auto',
    reduceMotion: reduce,
    pixelSize: 3,
    mapFx: { hillshade: true, water: true, clouds: true, dither: true, vignette: true, lodBlend: true },
    lighting: { enabled: true, glow: 22, dof: 18, vignette: 28, weather: 36, timeOfDay: 70 },
    audio: { master: 80, music: 60, sfx: 70 },
    tooltips: true,
    showFps: false,
  };
}

export function loadSettings(): Settings {
  const base = defaultSettings();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    return mergeSettings(base, JSON.parse(raw) as Partial<Settings>);
  } catch {
    return base;
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota / private mode */
  }
}

export function mergeSettings(base: Settings, patch: Partial<Settings>): Settings {
  const lighting = { ...base.lighting, ...(patch.lighting ?? {}) };
  const mapFx = { ...base.mapFx, ...(patch.mapFx ?? {}) };
  const audio = { ...base.audio, ...(patch.audio ?? {}) };
  return {
    ...base,
    ...patch,
    lighting,
    mapFx,
    audio,
    uiScale: patch.uiScale === 1 || patch.uiScale === 2 || patch.uiScale === 3 || patch.uiScale === 'auto' ? patch.uiScale : base.uiScale,
  };
}
