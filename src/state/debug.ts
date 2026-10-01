import { EVENTS } from '../content/events';
import { NEWS_POOL } from '../content/news';
import type { Actions } from './actions';
import type { Store } from './store';
import type { Selection, Tone, WeatherKind } from './types';

/**
 * `debug.trigger(...)` — console & debug-panel helpers for forcing situations.
 *
 *   debug.trigger('event', 'collector')      open an event card
 *   debug.trigger('money', 240)              add pence (negative to spend)
 *   debug.trigger('time', 21.5)              set the hour of day
 *   debug.trigger('weather', 'storm', 0.9)
 *   debug.trigger('toast', 'Hello', 'body')
 *   debug.trigger('news')                    cry a random news item (or pass text)
 *   debug.trigger('heat', 80)                set a player meter
 *   debug.trigger('select', 'town', 'bruges')
 */
export function createDebug(store: Store, act: Actions) {
  const trigger = (what: string, ...args: any[]) => {
    switch (what) {
      case 'event':
        return act.event(args[0] ?? EVENTS[Math.floor(Math.random() * EVENTS.length)].id);
      case 'money':
        return act.money(Number(args[0] ?? 240), args[1] ?? 'Debug purse', 'misc');
      case 'setMoney':
        return store.update((s) => (s.money.pence = Math.round(Number(args[0]))));
      case 'time':
        return act.timeOfDay(Number(args[0]));
      case 'day':
        return store.update((s) => (s.clock.day += Number(args[0] ?? 1)));
      case 'weather':
        return act.weather(args[0] as WeatherKind, args[1] ?? 0.7);
      case 'toast':
        return act.toast(args[0] ?? 'A note is pinned', args[1] ?? 'Delivered by a very small boy.', args[2] ?? 'scroll', (args[3] as Tone) ?? 'neutral');
      case 'news':
        return act.news(args[0] ? { tag: 'local', text: String(args[0]) } : NEWS_POOL[Math.floor(Math.random() * NEWS_POOL.length)]);
      case 'speed':
        return act.setSpeed(Number(args[0]) as 0 | 1 | 2 | 3);
      case 'heat':
      case 'reputation':
      case 'nerve':
      case 'piety':
        return store.update((s) => (s.player.meters[what].value = Number(args[0])));
      case 'select':
        return act.select(args[0] ? ({ kind: args[0], id: args[1] } as Selection) : null);
      default:
        console.warn('debug.trigger: unknown', what);
    }
  };
  return { trigger, store, act, state: () => store.state };
}
