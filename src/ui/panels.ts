import { GOOD_BY_ID } from '../content/goods';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import type { PanelId } from '../state/types';
import { formatDate, lsd, shortDate, signedLsd } from './text';
import { h, icon } from './kit/dom';
import { bookmarks, panel, sparkline, vial } from './kit/components';
import { SETTLEMENT_BY_ID } from '../world/settlements';
import { renderEconomy } from './economyPanel';
import { renderRelations } from './relationsPanel';

const TABS: Record<PanelId, { id: string; label: string; icon?: Parameters<typeof icon>[0] }[]> = {
  economy: [
    { id: 'overview', label: 'Overview', icon: 'scales' },
    { id: 'prices', label: 'Prices', icon: 'wool' },
    { id: 'costs', label: 'Costs', icon: 'coin' },
    { id: 'trade', label: 'Trade', icon: 'ship' },
    { id: 'news', label: 'News', icon: 'bell' },
  ],
  relations: [
    { id: 'people', label: 'People', icon: 'people' },
    { id: 'factions', label: 'Factions', icon: 'crown' },
    { id: 'web', label: 'Web', icon: 'eye' },
  ],
  inventory: [
    { id: 'stores', label: 'Warehouses', icon: 'warehouse' },
    { id: 'cargo', label: 'At sea', icon: 'ship' },
    { id: 'wardrobe', label: 'Wardrobe', icon: 'cloth' },
  ],
  character: [
    { id: 'skills', label: 'Skills', icon: 'star' },
    { id: 'vitals', label: 'Vitals', icon: 'heart' },
    { id: 'condition', label: 'State', icon: 'warn' },
    { id: 'estate', label: 'House', icon: 'warehouse' },
  ],
  journal: [
    { id: 'news', label: 'Crier', icon: 'bell' },
    { id: 'rumors', label: 'Rumours', icon: 'eye' },
    { id: 'deals', label: 'Deals', icon: 'handshake' },
    { id: 'help', label: 'Help', icon: 'scroll' },
  ],
  ledger: [
    { id: 'entries', label: 'Tally', icon: 'quill' },
    { id: 'debts', label: 'Debts', icon: 'dagger' },
    { id: 'cash', label: 'Purse', icon: 'coin' },
  ],
  help: [{ id: 'keys', label: 'Keys', icon: 'key' }],
};

export function mountPanels(root: HTMLElement, store: Store, act: Actions) {
  const p = panel({ title: 'Ledger', icon: 'scroll', cls: 'dock-panel', onClose: () => act.openPanel(null) });
  const tabsHost = h('div');
  p.el.insertBefore(tabsHost, p.body);
  root.append(p.el);

  store.select(
    (s) => ({
      panel: s.ui.panel,
      tab: s.ui.panel ? s.ui.panelTab[s.ui.panel] : '',
      inGame: s.ui.inGame,
      menu: s.ui.menu,
      pence: s.money.pence,
      newsN: s.news.length,
      prices: s.market.towns.boston?.wool.price,
    }),
    () => {
      const id = store.state.ui.panel;
      p.el.style.display = store.state.ui.inGame && !store.state.ui.menu && id ? '' : 'none';
      if (!id) return;
      const tabs = TABS[id];
      const cur = store.state.ui.panelTab[id] ?? tabs[0].id;
      const title = p.el.querySelector('.panel-title');
      if (title) title.textContent = labelOf(id);
      tabsHost.replaceChildren();
      const bm = bookmarks(tabs, cur, (t) => act.setTab(id, t));
      tabsHost.append(bm.el);
      p.body.replaceChildren(render(store, act, id, cur));
    },
  );
}

function labelOf(id: PanelId): string {
  return { economy: 'The Staple', relations: 'Faces & Favours', inventory: 'Stores', character: 'Edmund Ashby', journal: 'The Journal', ledger: 'The Ledger', help: 'Help' }[id];
}

function render(store: Store, act: Actions, panel: PanelId, tab: string): Node {
  const s = store.state;
  if (panel === 'economy') return renderEconomy(store, act, tab);
  if (panel === 'relations') return renderRelations(store, act, tab);
  if (panel === 'inventory') {
    if (tab === 'cargo') {
      return h('div', ...s.assets.ships.filter((sh) => sh.owner === 'player').map((sh) => h('div', h('div.row', { on: { click: () => act.select({ kind: 'ship', id: sh.id }) } }, icon('ship'), h('div.grow', h('div', sh.name), h('div.muted', sh.status))), ...Object.entries(sh.cargo).map(([g, n]) => h('div.row', icon(GOOD_BY_ID[g as keyof typeof GOOD_BY_ID].icon), h('span.grow', GOOD_BY_ID[g as keyof typeof GOOD_BY_ID].name), h('span', `${n}`))))));
    }
    if (tab === 'wardrobe') {
      return h('div', ...s.player.wardrobe.map((w) => h('div.row', icon('cloth'), h('div.grow', h('div', w.item), h('div.muted', `${w.slot} · ${w.note}`)))));
    }
    return h('div', ...s.assets.warehouses.map((w) => h('div', h('div.row', { on: { click: () => act.select({ kind: 'warehouse', id: w.id }) } }, icon('warehouse'), h('div.grow', h('div', w.name), h('div.muted', SETTLEMENT_BY_ID.get(w.town)?.name ?? w.town)), vial({ tone: w.condition < 40 ? 'loss' : 'profit', value: w.condition }).el), ...Object.entries(w.stock).map(([g, n]) => h('div.row', icon(GOOD_BY_ID[g as keyof typeof GOOD_BY_ID].icon), h('span.grow', GOOD_BY_ID[g as keyof typeof GOOD_BY_ID].name), h('span', `${n}`))))));
  }
  if (panel === 'character') {
    if (tab === 'vitals') {
      const v = s.player.vitals;
      const m = s.player.meters;
      return h('div.stat-grid',
        labeled('Health', vial({ tone: 'loss', value: v.health.value, icon: 'heart' }).el),
        labeled('Vigour', vial({ tone: 'gold', value: v.vigour.value, icon: 'sun' }).el),
        labeled('Hunger', vial({ tone: 'heat', value: v.hunger.value, icon: 'grain' }).el),
        labeled('Reputation', vial({ tone: 'profit', value: m.reputation.value, icon: 'crown' }).el),
        labeled('Heat', vial({ tone: 'heat', value: m.heat.value, icon: 'eye' }).el),
        labeled('Nerve', vial({ tone: 'loyalty', value: m.nerve.value, icon: 'dagger' }).el),
        labeled('Piety', vial({ tone: 'gold', value: m.piety.value, icon: 'mitre' }).el),
      );
    }
    if (tab === 'condition') {
      return h('div', h('p', `${s.player.name}, aged ${s.player.age}, at ${s.player.location}.`), h('p.muted', s.player.title), ...s.player.conditions.map((c) => h('div.chip', c)));
    }
    if (tab === 'estate') {
      return h('div',
        h('p', 'House of Ashby, woolmen of Lincoln, counting-house at Boston.'),
        h('p.muted', 'The warehouse on the Haven, the stall at St Mary\'s, and a name that still opens a door or two.'),
        ...s.assets.warehouses.map((w) => h('div.row', icon('warehouse'), h('div.grow', h('div', w.name), h('div.muted', SETTLEMENT_BY_ID.get(w.town)?.name ?? w.town)), vial({ tone: w.condition < 40 ? 'loss' : 'profit', value: w.condition }).el)),
        ...s.player.wardrobe.map((w) => h('div.row', icon('cloth'), h('div.grow', h('div', w.item), h('div.muted', w.slot)))),
      );
    }
    return h('div', ...s.player.skills.map((sk) => h('div.row', icon(sk.icon), h('div.grow', h('div', sk.name), h('div.muted', sk.desc)), h('strong', String(sk.level)))));
  }
  if (panel === 'journal' || panel === 'help') {
    if (tab === 'rumors') {
      return h('div', ...[...s.rumors].reverse().map((r) => h('div.row', icon('eye'), h('div.grow', h('div', r.text), h('div.muted', `${r.source} · ${shortDate(r.day)} · ${Math.round(r.reliability * 100)}%`)))));
    }
    if (tab === 'deals') {
      return h('div', ...s.deals.map((d) => h('div.row', icon(d.icon), h('div.grow', h('div', d.title), h('div.muted', `${d.kind} · due ${shortDate(d.dueDay)}${d.risk ? ' · ' + d.risk : ''}`)), h('span.chip', d.reward))));
    }
    if (tab === 'help' || tab === 'keys') {
      return h('div',
        h('p', 'The map is the world. Pan, zoom, click a town or a sail.'),
        ...['E economy', 'R relations', 'I stores', 'C portrait', 'G wardrobe', 'J journal', 'L ledger', 'B people', 'F estate', 'M map layers', 'Space pause', 'F1 this help', 'Esc menu', '` debug'].map((k) => h('div.row', h('kbd', k.split(' ')[0]), h('span.grow', k.slice(k.indexOf(' ') + 1)))),
        h('p.muted', 'Drag / WASD pan · wheel zoom · Q and = zoom · Home fits England · click the portrait for a courtesy.'),
      );
    }
    return h('div', ...[...s.news].reverse().slice(0, 24).map((n) => h('div.row', icon(n.tag === 'omen' ? 'skull' : n.tag === 'war' ? 'shield' : 'bell'), h('div.grow', h('div', n.text), h('div.muted', `${n.tag} · ${shortDate(n.day)}`)))));
  }
  if (panel === 'ledger') {
    if (tab === 'debts') {
      return h('div', ...s.money.debts.map((d) => h('div.row', icon('dagger'), h('div.grow', h('div', d.creditor), h('div.muted', `${d.interest} · due ${formatDate(d.dueDay)}`)), h('strong.tone-loss', lsd(d.amount)))));
    }
    if (tab === 'cash') {
      const c = sparkline(s.money.history, 200, 36, 'gold');
      return h('div', h('p', `In hand: ${lsd(s.money.pence)}`), c, h('p.muted', 'Thirty days of the purse, dawn balances.'));
    }
    return h('div', ...[...s.money.ledger].reverse().slice(0, 30).map((e) => h('div.row', icon(e.shadow ? 'eye' : e.kind === 'trade' ? 'scales' : 'quill'), h('div.grow', h('div', e.text), h('div.muted', `${shortDate(e.day)}${e.shadow ? ' · off the books' : ''}`)), h('strong.ledger-amt', { class: e.amount >= 0 ? 'tone-profit' : 'tone-loss' }, signedLsd(e.amount)))));
  }
  return h('div');
}

function labeled(label: string, node: Node) {
  return h('div', h('div.vial-label', label), node);
}
