import { rng } from '../assets/pixel';
import { GOOD_BY_ID } from '../content/goods';
import { NEWS_POOL, RUMOR_POOL } from '../content/news';
import { PRICE_BIAS } from '../content/goods';
import type { Actions } from './actions';
import type { Store } from './store';
import { dayToDate, feastOf, seasonOf } from './time';
import type { GameState, GoodId, WeatherKind } from './types';

/** Game minutes per real second at each speed. */
export const MINUTES_PER_SECOND = [0, 4, 12, 30] as const;

const WEATHER_ODDS: Record<string, [WeatherKind, number][]> = {
  Spring: [['clear', 0.36], ['overcast', 0.28], ['rain', 0.24], ['fog', 0.08], ['storm', 0.04]],
  Summer: [['clear', 0.5], ['overcast', 0.22], ['rain', 0.16], ['storm', 0.08], ['fog', 0.04]],
  Autumn: [['overcast', 0.32], ['rain', 0.3], ['clear', 0.18], ['fog', 0.14], ['storm', 0.06]],
  Winter: [['overcast', 0.3], ['snow', 0.22], ['rain', 0.2], ['fog', 0.16], ['clear', 0.12]],
};

const SMALL_TOASTS: { title: string; body: string; amount: number; icon: 'salt' | 'wool' | 'coin' | 'warehouse' | 'fish' | 'grain' }[] = [
  { title: 'Agnes sold salt', body: 'Four bushels to a herring-wife on the quay.', amount: 30, icon: 'salt' },
  { title: 'Wat found a penny', body: '"Under the counting board. Your father\'s, I expect."', amount: 1, icon: 'coin' },
  { title: 'Rats in the grain', body: 'A quarter spoiled. Agnes wants a cat.', amount: -18, icon: 'grain' },
  { title: 'A Hanse factor pays up', body: 'Old debt from the autumn clip, in Lübeck silver.', amount: 180, icon: 'coin' },
  { title: 'Thatcher\'s bill', body: 'For looking at the roof. Not for mending it.', amount: -24, icon: 'warehouse' },
  { title: 'Fleeces from Swineshead', body: 'Two sacks bought cheap from the abbey\'s cellarer.', amount: -260, icon: 'wool' },
  { title: 'Herring at a bargain', body: 'Agnes bought three barrels off a Yarmouth boat.', amount: -90, icon: 'fish' },
];

/**
 * Stand-in for the simulation: nudges the store so nothing on screen is static. Advances the clock,
 * random-walks prices, moves ships, drifts meters, and now and then cries news, shifts the weather,
 * posts small money toasts, or raises an event. Deterministic from its seed apart from real-time pacing.
 */
export class DriftTicker {
  private r = rng(20250346);
  private commitAcc = 0;
  private pendingMinutes = 0;
  private realAcc = { news: 12, rumor: 45, weather: 70, toast: 18, event: 38 };
  private lastHour = -1;
  private lastDay = -1;
  private firstEvent = true;

  constructor(private readonly store: Store, private readonly act: Actions) {}

  update(dt: number) {
    const s = this.store.state;
    if (!s.ui.inGame || s.ui.menu || s.ui.event) return;
    const speed = s.clock.speed;
    if (speed === 0) return;
    this.pendingMinutes += dt * MINUTES_PER_SECOND[speed];
    this.commitAcc += dt;
    for (const k of Object.keys(this.realAcc) as (keyof typeof this.realAcc)[]) this.realAcc[k] -= dt * (speed === 3 ? 2 : speed === 2 ? 1.4 : 1);

    if (this.commitAcc >= 0.1) {
      const mins = this.pendingMinutes;
      this.pendingMinutes = 0;
      this.commitAcc = 0;
      this.store.update((st) => this.advance(st, mins));
    }
    this.paced();
  }

  private advance(s: GameState, mins: number) {
    const c = s.clock;
    c.minute += mins;
    while (c.minute >= 1440) {
      c.minute -= 1440;
      c.day++;
    }
    const days = mins / 1440;
    for (const sh of s.assets.ships) {
      if (sh.hold > 0) {
        sh.hold -= mins;
        if (sh.hold <= 0) {
          sh.hold = 0;
          sh.dir = sh.dir === 1 ? -1 : 1;
          sh.progress = sh.dir === 1 ? 0.01 : 0.99;
        }
        continue;
      }
      sh.progress += sh.dir * sh.speed * days;
      if (sh.progress >= 1 || sh.progress <= 0) {
        sh.progress = Math.max(0, Math.min(1, sh.progress));
        sh.hold = 80;
        if (sh.owner === 'player' && sh.kind !== 'cart' && sh.kind !== 'horse') {
          const outbound = sh.progress >= 1;
          const name = sh.name;
          queueMicrotask(() => this.arrival(name, outbound));
        }
      }
    }
    const hour = Math.floor(c.minute / 60);
    if (hour !== this.lastHour) {
      this.lastHour = hour;
      this.hourly(s);
    }
    if (c.day !== this.lastDay) {
      if (this.lastDay >= 0) this.daily(s);
      this.lastDay = c.day;
    }
  }

  private hourly(s: GameState) {
    const r = this.r;
    for (const [town, row] of Object.entries(s.market.towns)) {
      for (const [g, e] of Object.entries(row)) {
        const target = GOOD_BY_ID[g as GoodId].base * (PRICE_BIAS[town]?.[g as GoodId] ?? 1);
        e.price = Math.max(1, Math.round(e.price * (1 + (r() - 0.5) * 0.018 + ((target - e.price) / target) * 0.01)));
        e.supply = Math.min(1, Math.max(0.05, e.supply + (r() - 0.5) * 0.04));
      }
    }
    if (Math.floor(s.clock.minute / 60) % 6 === 0)
      for (const row of Object.values(s.market.towns))
        for (const e of Object.values(row)) {
          e.history.push(e.price);
          if (e.history.length > 40) e.history.shift();
        }
    const p = s.player;
    const night = s.clock.minute < 6 * 60 || s.clock.minute > 21 * 60;
    p.vitals.hunger.value = clamp(p.vitals.hunger.value + 1.6 - (hourOf(s) === 12 || hourOf(s) === 18 ? 22 : 0));
    p.vitals.vigour.value = clamp(p.vitals.vigour.value + (night ? 5 : -1.2));
    p.meters.heat.value = clamp(p.meters.heat.value - 0.15 + (r() - 0.5) * 0.8);
    p.meters.nerve.value = clamp(p.meters.nerve.value + (r() - 0.5) * 1.5);
    p.meters.reputation.value = clamp(p.meters.reputation.value + (r() - 0.48) * 0.6);
    for (const b of s.band) b.loyalty = clamp(b.loyalty + (r() - 0.5) * 0.8);
    for (const d of s.deals) if (d.progress < 1 && r() < 0.18) d.progress = Math.min(1, d.progress + r() * 0.04);
    const w = s.assets.warehouses[0];
    if (s.weather.kind === 'rain' || s.weather.kind === 'storm') w.condition = Math.max(5, w.condition - 0.2);
  }

  private daily(s: GameState) {
    const wages = s.band.reduce((a, b) => a + b.wage, 0);
    s.money.pence -= wages;
    s.money.ledger.push({ day: s.clock.day, text: 'Wages: household and hirelings', amount: -wages, kind: 'wages' });
    s.money.history.push(s.money.pence);
    if (s.money.history.length > 30) s.money.history.shift();
    const feast = feastOf(dayToDate(s.clock.day));
    queueMicrotask(() => {
      if (feast) this.act.toast(`Feast of ${feast}`, 'The bells ring. No honest trade today — and some dishonest.', 'bell', 'gold');
      else this.act.toast('A new day', `Wages paid: ${wages}d.`, 'hourglass', 'neutral');
    });
  }

  private paced() {
    const a = this.realAcc;
    const r = this.r;
    const s = this.store.state;
    if (a.news <= 0) {
      a.news = 24 + r() * 20;
      this.act.news(NEWS_POOL[Math.floor(r() * NEWS_POOL.length)]);
    }
    if (a.rumor <= 0) {
      a.rumor = 60 + r() * 40;
      const rm = RUMOR_POOL[Math.floor(r() * RUMOR_POOL.length)];
      this.store.update((st) => {
        st.rumors.push({ ...rm, id: 'r' + Math.floor(r() * 1e9), day: st.clock.day });
        if (st.rumors.length > 30) st.rumors.shift();
      });
      this.act.toast('A rumour', `${rm.source}: “${rm.text.slice(0, 70)}${rm.text.length > 70 ? '…' : ''}”`, 'eye', 'neutral');
    }
    if (a.weather <= 0) {
      a.weather = 80 + r() * 60;
      const odds = WEATHER_ODDS[seasonOf(s.clock.day)];
      let x = r();
      let kind: WeatherKind = odds[0][0];
      for (const [k, p] of odds) {
        if ((x -= p) <= 0) {
          kind = k;
          break;
        }
      }
      this.act.weather(kind, 0.35 + r() * 0.6);
    }
    if (a.toast <= 0) {
      a.toast = 30 + r() * 30;
      const t = SMALL_TOASTS[Math.floor(r() * SMALL_TOASTS.length)];
      this.act.money(t.amount, t.title, 'trade');
      this.act.toast(t.title, t.body + ` (${t.amount >= 0 ? '+' : '−'}${Math.abs(t.amount)}d)`, t.icon, t.amount >= 0 ? 'profit' : 'loss');
    }
    if (a.event <= 0 && !s.ui.event) {
      a.event = 240 + r() * 180;
      const pick = this.firstEvent ? 'letter' : ['collector', 'leak', 'purveyor', 'letter'][Math.floor(r() * 4)];
      this.firstEvent = false;
      this.act.event(pick);
    }
  }

  private arrival(name: string, outbound: boolean) {
    this.act.toast(outbound ? `${name} makes Sluys` : `${name} home in Boston`, outbound ? 'Hugh sends word: the Zwin was kind, the Flemings keen.' : 'Riding the tide up the Haven.', 'ship', 'profit');
  }
}

function clamp(v: number) {
  return Math.max(0, Math.min(100, v));
}
function hourOf(s: GameState) {
  return Math.floor(s.clock.minute / 60);
}
