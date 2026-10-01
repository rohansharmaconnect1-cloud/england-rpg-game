import { C, MASTER } from '../assets/palette';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import { countTo } from './kit/anim';
import { coin, h } from './kit/dom';
import { sealButton, stampButton, vial } from './kit/components';
import { tip } from './kit/tooltip';
import { bandLoyalty, bannerDate, canonicalHour, clockText, lsd, reputationTitle, seasonOf, signedLsd } from './text';

const SPEED_LABEL = ['paused', 'the hours', 'the days', 'the weeks'];

export function mountHud(root: HTMLElement, store: Store, act: Actions) {
  const el = h('header.hud');
  const dateEl = h('strong.hud-date');
  const dial = document.createElement('canvas');
  dial.width = 22;
  dial.height = 22;
  dial.className = 'hud-dial';

  const moneyEl = h('strong.money');
  const debtEl = h('strong.hud-debt');

  const legit = vial({ tone: 'profit', value: 0, icon: 'crown', tip: 'legitimacy' });
  const heat = vial({ tone: 'heat', value: 0, icon: 'eye', tip: 'heat' });
  const loy = vial({ tone: 'loyalty', value: 0, icon: 'people', tip: 'loyalty' });
  const speedBtns: HTMLButtonElement[] = [];
  const bellBtn = stampButton({
    label: '',
    icon: 'bell',
    size: 'sm',
    ink: 'ink',
    onClick: () => act.openPanel('journal', 'news'),
    tip: { title: 'Notifications', desc: 'The crier\'s scrap, and whatever you have not yet read.' },
  });

  const crest = sealButton({
    glyph: 'A',
    size: 'md',
    color: 'madder',
    tip: { title: 'House of Ashby', desc: 'Open the main menu. The fleece that still flies — just.' },
    onClick: () => act.menu('main'),
  });

  const clock = h('div.hud-clock', h('div.hud-clock-row', dateEl, dial));
  tip(clock, () => clockTip(store));
  tip(dial, { title: 'Day and night', desc: 'The sun\'s path. Night is when honest men sleep and others count.' });

  el.append(h('div.hud-brand', crest));

  const speeds = h('div.hud-speed');
  ([['pause', 0, 'Pause'], ['play', 1, 'The hours'], ['fast', 2, 'The days'], ['hourglass', 3, 'The weeks']] as const).forEach(([ic, v, t]) => {
    const b = stampButton({
      label: '',
      icon: ic,
      size: 'sm',
      ink: 'ink',
      onClick: () => act.setSpeed(v),
      tip: { title: t, hotkey: v === 0 ? 'Space' : undefined },
    });
    speedBtns.push(b);
    speeds.append(b);
  });
  el.append(clock, speeds);

  const moneyBox = h('div.hud-money', h('div.hud-money-row', coin(), moneyEl));
  tip(moneyBox, () => moneyTip(store));
  const debtBox = h('div.hud-debt-box', debtEl);
  tip(debtBox, () => debtTip(store));
  const meters = h('div.hud-meters', legit.el, heat.el, loy.el);
  tip(meters, () => metersTip(store));

  el.append(moneyBox, debtBox, meters);

  const nav = h('nav.hud-nav');
  nav.append(
    stampButton({ label: '', icon: 'scales', size: 'sm', ink: 'ink', onClick: () => act.openPanel('economy'), tip: { title: 'Economy', hotkey: 'E' } }),
    stampButton({ label: '', icon: 'people', size: 'sm', ink: 'ink', onClick: () => act.openPanel('relations'), tip: { title: 'Relations', hotkey: 'R' } }),
    stampButton({ label: '', icon: 'wool', size: 'sm', ink: 'ink', onClick: () => act.openPanel('economy', 'prices'), tip: { title: 'Markets', desc: 'A quick board of prices across the staple towns.' } }),
    stampButton({ label: '', icon: 'eye', size: 'sm', ink: 'ink', onClick: () => act.openPanel('journal', 'rumors'), tip: { title: 'Rumours', desc: 'Gossip, some of it true.' } }),
    bellBtn,
    stampButton({ label: '', icon: 'gear', size: 'sm', ink: 'woad', onClick: () => act.menu('settings'), tip: { title: 'Settings', hotkey: 'Esc' } }),
  );
  el.append(nav);
  root.append(el);

  store.select(
    (s) => ({
      day: s.clock.day,
      minute: Math.floor(s.clock.minute / 5),
      speed: s.clock.speed,
      pence: s.money.pence,
      debt: s.money.debts.reduce((a, d) => a + d.amount, 0),
      heat: Math.round(s.player.meters.heat.value),
      rep: Math.round(s.player.meters.reputation.value),
      loy: bandLoyalty(s.band),
      inGame: s.ui.inGame,
      news: s.news.length,
      read: s.ui.newsRead,
    }),
    (v) => {
      el.style.display = v.inGame ? '' : 'none';
      const s = store.state;
      dateEl.textContent = bannerDate(s.clock.day);
      paintDial(dial, s.clock.minute / 60);
      countTo(moneyEl, s.money.pence, (n) => lsd(Math.round(n)));
      debtEl.textContent = lsd(v.debt);
      const next = s.money.debts.reduce((a, d) => (d.dueDay < a.dueDay ? d : a), s.money.debts[0]);
      const daysLeft = next ? next.dueDay - s.clock.day : 99;
      debtBox.classList.toggle('due-soon', daysLeft <= 14);
      legit.set(v.rep);
      heat.set(v.heat);
      loy.set(v.loy);
      legit.el.style.setProperty('--liquid', v.rep < 40 ? MASTER[C.woad] : v.rep < 70 ? MASTER[C.woadMid] : MASTER[C.saffron]);
      heat.el.classList.toggle('hot', v.heat >= 55);
      speedBtns.forEach((b, i) => {
        b.classList.toggle('ink-woad', v.speed === i);
        b.classList.toggle('ink-madder', v.speed === 0 && i === 0);
      });
      const unread = Math.max(0, v.news - v.read);
      bellBtn.classList.toggle('has-badge', unread > 0);
      bellBtn.dataset.count = unread ? String(unread) : '';
    },
  );
}

function clockTip(store: Store) {
  const s = store.state;
  const season = seasonOf(s.clock.day);
  return {
    title: bannerDate(s.clock.day),
    desc: `${season} · ${canonicalHour(s.clock.minute)} · ${clockText(s.clock.minute)}. ${s.weather.kind}. Pace: ${SPEED_LABEL[s.clock.speed]}.`,
  };
}

function moneyTip(store: Store) {
  const s = store.state;
  const today = s.money.ledger.filter((e) => e.day === s.clock.day);
  const inn = today.filter((e) => e.amount > 0).reduce((n, e) => n + e.amount, 0);
  const out = today.filter((e) => e.amount < 0).reduce((n, e) => n + e.amount, 0);
  const kinds = new Map<string, number>();
  for (const e of today) kinds.set(e.kind, (kinds.get(e.kind) ?? 0) + e.amount);
  const hist = s.money.history;
  const monthly = hist.length >= 2 ? hist[hist.length - 1] - hist[0] : 0;
  return {
    title: 'Purse',
    desc: `In hand ${lsd(s.money.pence)}. Today: ${signedLsd(inn + out)}. Thirty dawns: ${signedLsd(monthly)}.`,
    effects: [
      { text: `Income ${signedLsd(inn)}`, tone: 'profit' as const },
      { text: `Expenses ${lsd(out)}`, tone: 'loss' as const },
      ...[...kinds].map(([k, n]) => ({ text: `${k} ${signedLsd(n)}`, tone: (n >= 0 ? 'gold' : 'loss') as 'gold' | 'loss' })),
    ],
  };
}

function debtTip(store: Store) {
  const s = store.state;
  const next = s.money.debts.reduce((a, d) => (d.dueDay < a.dueDay ? d : a), s.money.debts[0]);
  const daysLeft = next ? next.dueDay - s.clock.day : 99;
  const total = s.money.debts.reduce((a, d) => a + d.amount, 0);
  return {
    title: 'Debts',
    desc: next
      ? `Owed ${lsd(total)}. Next due in ${daysLeft} day${daysLeft === 1 ? '' : 's'} (${next.creditor}).`
      : `Owed ${lsd(total)}. None due.`,
  };
}

function metersTip(store: Store) {
  const s = store.state;
  const rep = Math.round(s.player.meters.reputation.value);
  const heat = Math.round(s.player.meters.heat.value);
  return {
    title: reputationTitle(rep, heat),
    desc: `Legitimacy ${rep}. Heat ${heat}. Loyalty ${bandLoyalty(s.band)}.`,
  };
}

function paintDial(c: HTMLCanvasElement, hour: number) {
  const ctx = c.getContext('2d')!;
  const w = c.width;
  const r = w / 2;
  ctx.clearRect(0, 0, w, w);
  ctx.fillStyle = hour < 6 || hour >= 20 ? MASTER[C.woadDeep] : MASTER[C.woadMid];
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = MASTER[C.ink];
  ctx.lineWidth = 1;
  ctx.stroke();
  const a = ((hour - 6) / 24) * Math.PI * 2 - Math.PI / 2;
  const sun = hour >= 6 && hour < 20;
  ctx.fillStyle = sun ? MASTER[C.saffronLight] : MASTER[C.parchmentLight];
  ctx.beginPath();
  ctx.arc(r + Math.cos(a) * (r - 6), r + Math.sin(a) * (r - 6), 3, 0, Math.PI * 2);
  ctx.fill();
}
