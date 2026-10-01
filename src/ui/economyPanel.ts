import { C } from '../assets/palette';
import { GOODS, GOOD_BY_ID } from '../content/goods';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import type { GoodId, Tone } from '../state/types';
import { SETTLEMENT_BY_ID } from '../world/settlements';
import { crystalBall, dialCanvas, stackedBar } from './inspectArt';
import { h, icon } from './kit/dom';
import { sparkline, stampButton } from './kit/components';
import { lsd, shortDate } from './text';
import type { IconName } from '../assets/icons';

const STAPLE: GoodId[] = ['wool', 'cloth', 'grain', 'wine', 'salt'];

const LOCKED: { name: string; unit: string; icon: IconName; why: string }[] = [
  { name: 'Fish', unit: 'barrel', icon: 'fish', why: 'Yarmouth herring is a specialist trade. The licence is not yet yours.' },
  { name: 'Timber', unit: 'load', icon: 'warehouse', why: 'The Hanse keeps the Baltic mast-trade. Not yours — yet.' },
  { name: 'Iron', unit: 'bar', icon: 'dagger', why: 'Forest of Dean and the Weald. A licence you do not hold.' },
];

const CRIER: { icon: IconName; text: string; dayOff: number }[] = [
  { icon: 'crown', text: 'The King raises the wool custom: forty shillings the sack exported.', dayOff: 0 },
  { icon: 'grain', text: 'Bad harvest whispered in Norfolk. Grain already dearer at Lynn.', dayOff: -4 },
  { icon: 'cloth', text: 'Flemish weavers demand more English wool. Ghent will pay.', dayOff: -2 },
  { icon: 'skull', text: 'Pirates near Dover. The Packet ran, the wool did not.', dayOff: -1 },
  { icon: 'eye', text: 'Rumours of plague in the East. Merchants shrug: it is far away.', dayOff: -6 },
];

export function renderEconomy(store: Store, act: Actions, tab: string): Node {
  if (tab === 'prices') return prices(store, act);
  if (tab === 'costs') return costs(store);
  if (tab === 'trade') return trade(store, act);
  if (tab === 'news') return news(store);
  return overview(store);
}

function overview(store: Store) {
  const s = store.state;
  const debt = s.money.debts.reduce((n, d) => n + d.amount, 0);
  const health = s.money.pence > debt * 0.5 && s.player.meters.reputation.value > 70 && s.player.meters.heat.value < 20
    ? { word: 'Booming', icon: 'sun' as IconName, tone: 'profit' as Tone, line: 'Wool moves, coin stays, and the quay says your name kindly.' }
    : s.money.pence > debt * 0.15 && s.player.meters.reputation.value > 50
    ? { word: 'Stable', icon: 'sun' as IconName, tone: 'profit' as Tone, line: 'The house stands. The debts stand taller.' }
    : s.money.pence < 2400 || s.player.meters.heat.value > 55
      ? { word: 'Crisis', icon: 'warn' as IconName, tone: 'loss' as Tone, line: 'A week of bad wind would finish you.' }
      : { word: 'Struggling', icon: 'hourglass' as IconName, tone: 'heat' as Tone, line: 'The clip is still in the field. The creditors are not.' };
  const omen = s.news.some((n) => n.tag === 'omen');
  const dials: { label: string; v: number; col: number; tip: string }[] = [
    { label: 'Wool demand', v: 78, col: C.moss, tip: 'Flanders is hungry. That is the one mercy.' },
    { label: 'Harvest', v: 54, col: C.saffron, tip: 'Norfolk whispers of a thin year. Grain will not stay cheap.' },
    { label: 'Coin supply', v: 38, col: C.ochre, tip: 'The King\'s war drinks silver. The rest of us sip.' },
    { label: 'War pressure', v: 66, col: C.madder, tip: 'Purveyors, ships, subsidies. France is expensive.' },
    { label: 'Tax burden', v: 72, col: C.ember, tip: 'Forty shillings the sack, and a Collector who can count twice.' },
  ];
  return h('div.econ',
    h('div.health-row', icon(health.icon), h('div.grow', h('div.health-word', { class: 'tone-' + health.tone }, health.word), h('p', health.line))),
    h('div.dial-row', ...dials.map((d) => h('div.dial', { title: d.tip }, dialCanvas(d.v, d.col), h('div.muted', d.label)))),
    h('div.outlook', crystalBall(), h('div.grow',
      h('div.panel-sub', 'Outlook'),
      h('strong', omen ? 'Uncertain' : 'Uncertain'),
      h('p.muted', omen
        ? 'A fogged glass. Sailors talk of a sickness in the East. Far away, they say. They always say that.'
        : 'The glass is fogged. Wool will move. So will the King\'s hand. The rest is weather.'),
    )),
  );
}

function prices(store: Store, act: Actions) {
  const host = h('div.econ');
  let chart = false;
  const paint = () => {
    const rows = STAPLE.map((id) => across(store, id));
    host.replaceChildren(
      h('div.row', h('span.grow', chart ? 'Towns over the last month' : 'The board'), stampButton({
        label: chart ? 'Table' : 'Chart', icon: 'map', size: 'sm', ink: 'woad',
        onClick: () => { chart = !chart; paint(); },
      })),
      chart ? chartView(store, rows) : tableView(store, act, rows),
      h('p.muted', 'Fish, timber and iron are not yours to trade. Yet.'),
      ...LOCKED.map((g) => h('div.row.locked', icon(g.icon), h('div.grow', h('div', g.name), h('div.muted', g.why)), h('span.muted', 'locked'))),
    );
  };
  paint();
  return host;
}

function tableView(_store: Store, act: Actions, rows: ReturnType<typeof across>[]) {
  const head = h('tr', h('th', 'Good'), h('th', 'Now'), h('th', '7d'), h('th', '30d'), h('th', ''), h('th', 'Buy'), h('th', 'Sell'));
  const body = rows.map((r) => h('tr', { on: { click: () => act.select({ kind: 'town', id: r.buyId }) } },
    h('td', r.g.name),
    h('td.money', `${r.now}d`),
    h('td', { class: cls(r.d7) }, arr(r.d7)),
    h('td', { class: cls(r.d30) }, arr(r.d30)),
    h('td', sparkline(r.hist, 48, 10)),
    h('td', r.buy),
    h('td', r.sell),
  ));
  return h('table.market-table', h('thead', head), h('tbody', ...body));
}

function chartView(_store: Store, rows: { g: (typeof GOODS)[number]; hist: number[] }[]) {
  return h('div', ...rows.map((r) => h('div.chart-row',
    icon(r.g.icon),
    h('div.grow', h('div', r.g.name), sparkline(r.hist, 220, 28, r.hist[r.hist.length - 1] >= r.hist[0] ? 'profit' : 'loss')),
  )));
}

function across(store: Store, id: GoodId) {
  const towns = Object.entries(store.state.market.towns);
  let buyId = towns[0][0], sellId = towns[0][0], lo = Infinity, hi = -Infinity;
  const boston = store.state.market.towns.boston[id];
  for (const [tid, row] of towns) {
    const p = row[id].price;
    if (p < lo) { lo = p; buyId = tid; }
    if (p > hi) { hi = p; sellId = tid; }
  }
  const hist = boston.history;
  const d7 = hist.length > 7 ? hist[hist.length - 1] - hist[hist.length - 8] : 0;
  const d30 = hist.length > 1 ? hist[hist.length - 1] - hist[0] : 0;
  return {
    g: GOOD_BY_ID[id],
    now: boston.price,
    d7, d30, hist,
    buy: SETTLEMENT_BY_ID.get(buyId)?.name ?? buyId,
    sell: SETTLEMENT_BY_ID.get(sellId)?.name ?? sellId,
    buyId, sellId,
  };
}

function arr(d: number) {
  return d > 4 ? '▲' : d < -4 ? '▼' : '–';
}
function cls(d: number) {
  return d > 4 ? 'tick-up' : d < -4 ? 'tick-down' : '';
}

function costs(store: Store) {
  const s = store.state;
  const wages = s.band.reduce((n, b) => n + b.wage, 0);
  const ships = s.assets.ships.filter((sh) => sh.owner === 'player');
  const upkeep = ships.reduce((n, sh) => n + ({ cog: 8, hulk: 12, galley: 14, balinger: 10, coaster: 4, cart: 2, horse: 3 }[sh.kind] + Math.round(sh.crew / 4)), 0);
  const rent = 6;
  const bribes = 2;
  const interest = Math.round(s.money.debts.reduce((n, d) => n + d.amount, 0) * 0.02 / 30);
  const customs = 8;
  const woolTax = 40 * 12;
  const parts = [
    { label: 'Warehouse rent', n: rent, icon: 'warehouse' as IconName, col: C.umber },
    { label: 'Staff wages', n: wages, icon: 'people' as IconName, col: C.moss },
    { label: 'Ship & cart upkeep', n: upkeep, icon: 'ship' as IconName, col: C.woad },
    { label: 'Bribes on retainer', n: bribes, icon: 'eye' as IconName, col: C.ember },
    { label: 'Interest on debt', n: interest, icon: 'coin' as IconName, col: C.madder },
    { label: 'Customs (daily mock)', n: customs, icon: 'scales' as IconName, col: C.ochre },
  ];
  const burn = parts.reduce((n, p) => n + p.n, 0);
  return h('div.econ',
    h('div.burn', h('div.muted', 'Daily burn'), h('div.burn-num', lsd(burn))),
    stackedBar(parts.map((p) => ({ n: p.n, col: p.col })), 220, 12),
    ...parts.map((p) => h('div.row', icon(p.icon), h('span.grow', p.label), h('span.money', `${p.n}d`))),
    h('div.row.wool-tax', icon('wool'), h('div.grow', h('div', 'Wool export tax'), h('div.muted', 'Per sack, the King\'s great custom')), h('strong', `${woolTax}d (${lsd(woolTax)})`)),
  );
}

function trade(store: Store, act: Actions) {
  const host = h('div.econ');
  let sort: 'margin' | 'risk' | 'name' = 'margin';
  const paint = () => {
    const rows = store.state.routes.map((r) => {
      const from = store.state.market.towns[r.from];
      const to = store.state.market.towns[r.to];
      const wool = from && to ? to.wool.price - from.wool.price : 0;
      const cargo = store.state.assets.ships.find((s) => s.route === r.id);
      const good = cargo ? (Object.keys(cargo.cargo)[0] as GoodId | undefined) : 'wool';
      const margin = wool;
      return { r, cargo: good ? GOOD_BY_ID[good]?.name ?? '—' : '—', margin, risk: r.danger };
    });
    rows.sort((a, b) => sort === 'name' ? a.r.name.localeCompare(b.r.name) : sort === 'risk' ? b.risk - a.risk : b.margin - a.margin);
    const best = rows.reduce((a, b) => (b.margin > a.margin ? b : a), rows[0]);
    const head = h('tr',
      h('th', { on: { click: () => { sort = 'name'; paint(); } } }, 'Route'),
      h('th', 'Cargo'),
      h('th', { on: { click: () => { sort = 'margin'; paint(); } } }, 'Margin'),
      h('th', { on: { click: () => { sort = 'risk'; paint(); } } }, 'Risk'),
    );
    host.replaceChildren(
      h('p.muted', 'Click a head to sort. The gold star is the best wool spread you can see.'),
      h('table.market-table', h('thead', head), h('tbody', ...rows.map((row) => h('tr', { on: { click: () => act.select({ kind: 'town', id: row.r.to }) } },
        h('td', row === best ? '★ ' + row.r.name : row.r.name),
        h('td', row.cargo),
        h('td', { class: row.margin >= 0 ? 'tick-up' : 'tick-down' }, `${row.margin >= 0 ? '+' : ''}${row.margin}d`),
        h('td', `${Math.round(row.risk * 100)}%`),
      )))),
    );
  };
  paint();
  return host;
}

function news(store: Store) {
  const day = store.state.clock.day;
  const extra = CRIER.map((c, i) => ({ icon: c.icon, text: c.text, day: day + c.dayOff, id: 'econ' + i }));
  const live = store.state.news.map((n) => ({
    icon: (n.tag === 'omen' ? 'skull' : n.tag === 'war' ? 'shield' : n.tag === 'trade' ? 'scales' : 'bell') as IconName,
    text: n.text,
    day: n.day,
    id: n.id,
  }));
  const all = [...extra, ...live].sort((a, b) => b.day - a.day);
  return h('div.econ.crier-list',
    h('p.muted', 'The Town Crier, and whatever the quay repeats.'),
    ...all.map((n) => h('div.row.crier-row', icon(n.icon), h('div.grow', h('div', n.text), h('div.muted', shortDate(n.day))))),
  );
}
