/**
 * Named audio hooks. Every button, panel, coin change and event calls `playSfx(name)`; for now they
 * are no-ops (optionally logged) so real audio can be dropped in later by registering handlers.
 */
export const SFX_NAMES = [
  'ui_click', 'ui_hover', 'ui_tab', 'ui_toggle', 'ui_slider', 'ui_dropdown_open', 'ui_dropdown_pick',
  'panel_open', 'panel_close', 'menu_open', 'menu_close', 'inspector_open', 'inspector_close',
  'coin_gain', 'coin_loss', 'toast_in', 'toast_dismiss', 'crier_bell', 'event_open', 'event_close', 'event_choice',
  'time_pause', 'time_resume', 'game_start', 'map_select', 'seal_press', 'stamp_press',
  'weather_clear', 'weather_overcast', 'weather_rain', 'weather_storm', 'weather_fog', 'weather_snow',
] as const;
export type SfxName = (typeof SFX_NAMES)[number] | (string & {});

type Handler = (name: SfxName, volume: number) => void;
const handlers = new Map<string, Handler>();
let fallback: Handler | null = null;
let volume = 0.7;
export const sfxLog: string[] = [];

export function playSfx(name: SfxName) {
  sfxLog.push(name);
  if (sfxLog.length > 12) sfxLog.shift();
  const h = handlers.get(name) ?? fallback;
  if (h) h(name, volume);
}

export function registerSfx(name: SfxName | '*', h: Handler) {
  if (name === '*') fallback = h;
  else handlers.set(name, h);
}

export function setSfxVolume(v: number) {
  volume = v;
}
