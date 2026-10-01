import type { IconName } from '../assets/icons';
import { playSfx } from '../ui/kit/sfx';
import type { Store } from './store';
import type { GameState, LedgerEntry, MapOverlay, MenuId, NewsItem, PanelId, Selection, Tone, WeatherKind } from './types';

let toastId = 1;
let newsId = 1000;

/** All state changes the UI can request go through these helpers (a real sim would hook here). */
export function actions(store: Store) {
  const up = (fn: (s: GameState) => void) => store.update(fn);
  const a = {
    toast(title: string, body?: string, icon?: IconName, tone?: Tone) {
      up((s) => {
        s.toasts.push({ id: toastId++, title, body, icon, tone, born: performance.now() });
        if (s.toasts.length > 3) s.toasts.shift();
      });
      playSfx('toast_in');
    },
    dismissToast(id: number) {
      up((s) => (s.toasts = s.toasts.filter((t) => t.id !== id)));
    },
    money(amount: number, text: string, kind: LedgerEntry['kind'] = 'misc', shadow = false) {
      up((s) => {
        s.money.pence += amount;
        s.money.ledger.push({ day: s.clock.day, text, amount, kind, shadow });
        if (s.money.ledger.length > 80) s.money.ledger.shift();
      });
      playSfx(amount >= 0 ? 'coin_gain' : 'coin_loss');
    },
    news(item: Omit<NewsItem, 'id' | 'day'>) {
      up((s) => {
        s.news.push({ ...item, id: 'n' + newsId++, day: s.clock.day });
        if (s.news.length > 60) s.news.shift();
      });
      playSfx('crier_bell');
    },
    setSpeed(speed: 0 | 1 | 2 | 3) {
      up((s) => {
        if (speed) s.clock.lastSpeed = speed;
        s.clock.speed = speed;
      });
      playSfx(speed ? 'time_resume' : 'time_pause');
    },
    togglePause() {
      const c = store.state.clock;
      a.setSpeed(c.speed ? 0 : c.lastSpeed);
    },
    openPanel(id: PanelId | null, tab?: string) {
      up((s) => {
        s.ui.panel = s.ui.panel === id && !tab ? null : id;
        if (id && tab) s.ui.panelTab[id] = tab;
        if (id === 'journal') s.ui.newsRead = s.news.length;
        if (id) {
          s.ui.trackerOpen = false;
          s.ui.actionBarOpen = false;
        }
      });
      playSfx(store.state.ui.panel ? 'panel_open' : 'panel_close');
    },
    setTab(panel: string, tab: string) {
      up((s) => (s.ui.panelTab[panel] = tab));
      playSfx('ui_tab');
    },
    select(sel: Selection | null) {
      up((s) => (s.ui.selected = sel));
      playSfx(sel ? 'inspector_open' : 'inspector_close');
    },
    menu(m: MenuId) {
      up((s) => (s.ui.menu = m));
      playSfx(m ? 'menu_open' : 'menu_close');
    },
    startGame() {
      up((s) => {
        s.ui.menu = null;
        s.ui.inGame = true;
        s.ui.panel = null;
        s.ui.selected = null;
        s.ui.trackerOpen = false;
        s.ui.layersOpen = false;
        s.ui.charHudCollapsed = true;
        s.ui.minimapCollapsed = true;
        s.ui.actionBarOpen = false;
      });
      playSfx('game_start');
      window.dispatchEvent(new CustomEvent('gameStarted', { detail: { day: store.state.clock.day } }));
    },
    weather(kind: WeatherKind, intensity = 0.6) {
      up((s) => {
        s.weather.kind = kind;
        s.weather.intensity = intensity;
      });
      playSfx('weather_' + kind);
    },
    timeOfDay(hour: number) {
      up((s) => (s.clock.minute = ((hour % 24) + 24) % 24 * 60));
    },
    event(id: string | null) {
      up((s) => {
        s.ui.event = id;
        if (id && !s.events.active.includes(id)) s.events.active.push(id);
        if (!id) s.events.active = [];
      });
      playSfx(id ? 'event_open' : 'event_close');
    },
    rest() {
      up((s) => {
        if (s.clock.minute >= 6 * 60) s.clock.day += 1;
        s.clock.minute = 6 * 60 + 8;
        s.player.vitals.vigour.value = Math.min(100, s.player.vitals.vigour.value + 18);
        s.player.vitals.health.value = Math.min(100, s.player.vitals.health.value + 4);
        s.player.vitals.hunger.value = Math.min(100, s.player.vitals.hunger.value + 6);
      });
      a.toast('Dawn', 'You slept until the first bell. The ledger is still there.', 'sun', 'gold');
    },
    setOverlay(mode: MapOverlay) {
      up((s) => {
        s.layers.overlay = mode;
        if (mode === 'influence') s.layers.influence = true;
        if (mode === 'trade' || mode === 'danger') s.layers.routes = true;
        if (mode === 'rumors') s.layers.labels = true;
      });
    },
    toggleCharHud() {
      up((s) => (s.ui.charHudCollapsed = !s.ui.charHudCollapsed));
    },
    toggleMinimap() {
      up((s) => {
        s.ui.minimapCollapsed = !s.ui.minimapCollapsed;
        if (s.ui.minimapCollapsed) s.ui.layersOpen = false;
      });
    },
    toggleActionBar() {
      up((s) => (s.ui.actionBarOpen = !s.ui.actionBarOpen));
      playSfx('ui_toggle');
    },
    toggleFollow() {
      up((s) => (s.ui.followShip = !s.ui.followShip));
      const on = store.state.ui.followShip;
      a.toast(on ? 'Following' : 'The view is yours', on ? 'The camera rides with the selected sail, or the Margery.' : 'Pan as you like.', 'ship', 'neutral');
    },
  };
  return a;
}

export type Actions = ReturnType<typeof actions>;
