import { GOODS, GOOD_BY_ID } from '../content/goods';
import { dossierOf } from '../content/dossiers';
import { TOWNS, townHeat, townTags } from '../content/towns';
import { destName, etaText, isLandVessel, remainingDays } from '../map/routeGeom';
import { liveryOf, vesselCanvas } from '../assets/textures';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import type { GoodId, Person, Ship } from '../state/types';
import { SETTLEMENT_BY_ID } from '../world/settlements';
import { lsd, shortDate, standingTone, standingWord } from './text';
import { cargoGrid, routeRibbon, skylineCanvas, warehouseCutaway } from './inspectArt';
import { h, icon, portrait } from './kit/dom';
import { panel, stampButton, vial } from './kit/components';

export function mountInspector(root: HTMLElement, store: Store, act: Actions) {
  const p = panel({ title: 'Inspector', icon: 'eye', cls: 'inspector', onClose: () => act.select(null) });
  root.append(p.el);

  store.select(
    (s) => ({
      sel: s.ui.selected,
      inGame: s.ui.inGame,
      menu: s.ui.menu,
      pence: s.money.pence,
      night: s.clock.minute < 6 * 60 || s.clock.minute >= 20 * 60,
      rum: s.rumors.length,
    }),
    (v) => {
      const open = !!(v.inGame && !v.menu && v.sel);
      p.el.classList.toggle('open', open);
      p.el.style.display = v.inGame && !v.menu ? '' : 'none';
      if (!v.sel) {
        p.body.replaceChildren(h('p.muted', 'Click a town, a ship, a warehouse or a soul.'));
        return;
      }
      p.body.replaceChildren(body(store, act, v.sel));
      const title = p.el.querySelector('.panel-title');
      if (title) title.textContent = heading(store, v.sel);
    },
  );
}

function heading(store: Store, sel: NonNullable<Store['state']['ui']['selected']>): string {
  if (sel.kind === 'town') return SETTLEMENT_BY_ID.get(sel.id)?.name ?? sel.id;
  if (sel.kind === 'ship') return store.state.assets.ships.find((s) => s.id === sel.id)?.name ?? 'Ship';
  if (sel.kind === 'warehouse') return store.state.assets.warehouses.find((w) => w.id === sel.id)?.name ?? 'Warehouse';
  if (sel.kind === 'person') return store.state.relations.people.find((p) => p.id === sel.id)?.name ?? 'Person';
  return store.state.band.find((b) => b.id === sel.id)?.name ?? 'Retainer';
}

function body(store: Store, act: Actions, sel: NonNullable<Store['state']['ui']['selected']>): HTMLElement {
  if (sel.kind === 'town') return townBody(store, act, sel.id);
  if (sel.kind === 'ship') return shipBody(store, sel.id);
  if (sel.kind === 'warehouse') return warehouseBody(store, sel.id);
  if (sel.kind === 'person') return personBody(store, act, sel.id);
  return retainerBody(store, act, sel.id);
}

function townBody(store: Store, act: Actions, id: string) {
  const t = SETTLEMENT_BY_ID.get(id);
  const info = TOWNS[id];
  if (!t) return h('p', 'Unknown haven.');
  const night = store.state.clock.minute < 360 || store.state.clock.minute >= 1200;
  const heat = townHeat(info);
  const tags = townTags(id, info);
  const market = store.state.market.towns[id];
  const box = h('div.insp-body');
  box.append(skylineCanvas(t.kind, id, night));
  box.append(h('div.muted', info?.realm ?? (t.foreign ? 'Beyond the realm' : 'Kingdom of England')));
  if (info) {
    box.append(h('div.row', icon('people'), h('span.grow', 'Souls'), h('span', info.people.toLocaleString('en'))));
    box.append(h('div.row', icon('crown'), h('span.grow', 'Ruler'), h('span.insp-right', info.lord)));
    box.append(h('div.chip', info.mood ?? 'A town like any other'));
    if (tags.length) box.append(h('div.tag-row', ...tags.map((tg) => h('span.chip', tg))));
    box.append(h('p', info.blurb));
  }
  if (market) {
    box.append(h('h3.panel-sub', 'Prices today'));
    for (const g of GOODS.filter((x) => x.id !== 'fish')) {
      const e = market[g.id];
      if (!e) continue;
      const hist = e.history;
      const d = hist.length > 7 ? hist[hist.length - 1] - hist[hist.length - 8] : 0;
      box.append(h('div.row.price-row',
        icon(g.icon),
        h('div.grow', h('div', g.name), h('div.muted', `${g.unit}`)),
        h('span.trend', { class: d > 2 ? 'tick-up' : d < -2 ? 'tick-down' : '' }, d > 2 ? '▲' : d < -2 ? '▼' : '–'),
        h('span.money', `${e.price}d`),
        stampButton({ label: 'Buy', size: 'sm', ink: 'woad', onClick: () => buySell(act, store, id, g.id, 1) }),
        stampButton({ label: 'Sell', size: 'sm', ink: 'ink', onClick: () => buySell(act, store, id, g.id, -1) }),
      ));
    }
  }
  const holdings = store.state.assets.warehouses.filter((w) => w.town === id);
  const shipsHere = store.state.assets.ships.filter((s) => s.owner === 'player' && s.hold > 0 && store.state.routes.find((r) => r.id === s.route && (r.from === id || r.to === id)));
  if (holdings.length || shipsHere.length) {
    box.append(h('h3.panel-sub', 'Your holdings'));
    for (const w of holdings) {
      box.append(h('div.row', { on: { click: () => act.select({ kind: 'warehouse', id: w.id }) } }, icon('warehouse'), h('span.grow', w.name), h('span.muted', `${w.condition}%`)));
    }
    for (const s of shipsHere) {
      box.append(h('div.row', { on: { click: () => act.select({ kind: 'ship', id: s.id }) } }, icon('ship'), h('span.grow', s.name), h('span.muted', 'at quay')));
    }
  }
  const locals = (info?.notables ?? [])
    .map((nid) => store.state.relations.people.find((p) => p.id === nid))
    .filter((p): p is Person => !!p);
  if (locals.length) {
    box.append(h('h3.panel-sub', 'Faces here'));
    for (const p of locals) {
      box.append(h('div.row', { on: { click: () => act.select({ kind: 'person', id: p.id }) } },
        portrait(p.portrait),
        h('div.grow', h('div', p.name), h('div.muted', p.title)),
        vial({ tone: standingTone(p.standing), value: p.standing + 100, max: 200 }).el,
      ));
    }
  }
  const rumours = store.state.rumors.filter((r) =>
    r.text.toLowerCase().includes(id) || r.source.toLowerCase().includes((SETTLEMENT_BY_ID.get(id)?.name ?? '').toLowerCase()) || (id === 'boston' && /haven|pynchbek|agnes|swan/i.test(r.text + r.source)),
  );
  if (rumours.length) {
    box.append(h('h3.panel-sub', 'Rumours'));
    for (const r of rumours.slice(-3)) box.append(h('p.muted', `${r.text} — ${r.source}`));
  }
  box.append(h('h3.panel-sub', 'Custom & tax'));
  box.append(h('p', info?.customs ?? 'A local due, a smile, and a wait.'));
  box.append(h('div.row', icon('eye'), h('span.grow', 'Heat-risk'), heatDots(heat), h('span.muted', heat >= 70 ? 'Hot' : heat >= 45 ? 'Watched' : 'Quiet')));
  return box;
}

function buySell(act: Actions, store: Store, town: string, good: GoodId, dir: 1 | -1) {
  const price = store.state.market.towns[town]?.[good].price;
  if (price == null) return;
  const g = GOOD_BY_ID[good];
  const name = SETTLEMENT_BY_ID.get(town)?.name ?? town;
  if (dir > 0) {
    act.money(-price, `Bought 1 ${g.unit} of ${g.name} at ${name}`, 'trade');
    act.toast('Bought', `One ${g.unit} of ${g.name}. The tally grows heavier.`, g.icon, 'gold');
  } else {
    const take = Math.round(price * 0.92);
    act.money(take, `Sold 1 ${g.unit} of ${g.name} at ${name}`, 'trade');
    act.toast('Sold', `A ${g.unit} of ${g.name} changes hands. The spread is the broker's.`, g.icon, 'profit');
  }
}

function heatDots(n: number) {
  const row = h('span.heat-dots');
  const lit = Math.round(n / 20);
  for (let i = 0; i < 5; i++) {
    const d = h('span.heat-dot');
    if (i < lit) d.classList.add('on');
    row.append(d);
  }
  return row;
}

function shipBody(store: Store, id: string) {
  const sh = store.state.assets.ships.find((s) => s.id === id);
  if (!sh) return h('p', 'Lost at sea.');
  const route = store.state.routes.find((r) => r.id === sh.route);
  const dest = route ? destName(route, sh.dir) : '—';
  const eta = route ? etaText(remainingDays(sh), sh.hold > 0) : '—';
  const land = isLandVessel(sh.kind);
  const hidden = !!sh.incident || (sh.owner !== 'player' && (sh.cargo.wool ?? 0) > 10);
  const upkeep = shipUpkeep(sh);
  const hold = h('div.crate-grid');
  cargoGrid(hold, sh.cargo, 16, hidden);
  const port = vesselCanvas(sh.kind, liveryOf(sh.owner), 0);
  port.className = 'ship-portrait';
  return h('div.insp-body',
    port,
    h('div.muted', `${sh.kind} · ${sh.owner === 'player' ? 'House of Ashby' : sh.owner}`),
    h('p', sh.status),
    sh.incident ? h('div.chip.tone-heat', sh.incident === 'pirates' ? 'No colours flying' : 'Customs boat alongside') : null,
    h('div.row', icon('people'), h('span.grow', 'Master'), h('span', sh.captain)),
    h('div.row', icon('heart'), h('span.grow', 'Hull'), vial({ tone: sh.hull < 40 ? 'loss' : 'profit', value: sh.hull }).el),
    h('div.row', icon('people'), h('span.grow', 'Crew'), h('span', `${sh.crew} souls`)),
    h('div.row', icon('people'), h('span.grow', 'Morale'), vial({ tone: sh.morale < 40 ? 'heat' : 'loyalty', value: sh.morale }).el),
    h('div.row', icon('coin'), h('span.grow', 'Upkeep'), h('span', `${upkeep}d / day`)),
    h('h3.panel-sub', land ? 'Load' : 'Hold'),
    hold,
    hidden ? h('div.row', icon('eye'), h('span.grow', 'Hidden compartment'), h('span.chip.heat', 'A plank')) : h('p.muted', 'No false bottom that you can see.'),
    h('h3.panel-sub', 'Route'),
    h('div.row', icon('map'), h('span.grow', sh.hold > 0 ? 'At dock' : 'Bound for'), h('span', dest)),
    h('div.row', icon('hourglass'), h('span.grow', 'ETA'), h('span', eta)),
    route ? routeRibbon(route, sh.progress) : null,
  );
}

function shipUpkeep(sh: Ship): number {
  const base = { cog: 8, hulk: 12, galley: 14, balinger: 10, coaster: 4, cart: 2, horse: 3 }[sh.kind];
  return base + Math.round(sh.crew / 4);
}

function warehouseBody(store: Store, id: string) {
  const w = store.state.assets.warehouses.find((x) => x.id === id);
  if (!w) return h('p', 'Gone.');
  const used = Object.values(w.stock).reduce((a, n) => a + (n ?? 0), 0);
  const security = Math.max(10, Math.min(90, w.condition + (w.town === 'boston' ? -8 : 12)));
  const leak = w.condition < 45;
  return h('div.insp-body',
    warehouseCutaway(w),
    h('div.muted', SETTLEMENT_BY_ID.get(w.town)?.name ?? w.town),
    h('p', w.notes),
    leak ? h('div.row', icon('rain'), h('span.grow', 'Roof'), h('span.chip.loss', 'Leaking')) : h('div.row', icon('warehouse'), h('span.grow', 'Roof'), h('span.muted', 'Holds, mostly')),
    (w.stock.grain ?? 0) > 4 || w.condition < 50 ? h('div.row', icon('warn'), h('span.grow', 'Vermin'), h('span.chip.heat', 'Rats')) : null,
    h('div.row', icon('warehouse'), h('span.grow', 'Condition'), vial({ tone: w.condition < 40 ? 'loss' : 'profit', value: w.condition }).el),
    h('div.row', icon('shield'), h('span.grow', 'Security'), vial({ tone: security < 40 ? 'heat' : 'loyalty', value: security }).el),
    h('div.row', icon('purse'), h('span.grow', 'Filled'), h('span', `${used} / ${w.capacity}`)),
    ...Object.entries(w.stock).map(([g, n]) => h('div.row', icon(GOOD_BY_ID[g as GoodId].icon), h('span.grow', GOOD_BY_ID[g as GoodId].name), h('span', `${n}`))),
  );
}

function personBody(store: Store, act: Actions, id: string) {
  const p = store.state.relations.people.find((x) => x.id === id);
  if (!p) return h('p', 'Unknown.');
  return profile(store, act, p);
}

function retainerBody(store: Store, act: Actions, id: string) {
  const b = store.state.band.find((x) => x.id === id);
  if (!b) return h('p', 'Gone.');
  const p: Person = {
    id: b.id, name: b.name, title: b.role, faction: 'staff', town: b.location === 'at sea' ? 'boston' : b.location,
    standing: Math.round((b.loyalty - 50) * 2), portrait: b.portrait, notes: b.bio, known: true,
  };
  const box = profile(store, act, p);
  box.append(h('div.row', icon('coin'), h('span.grow', 'Wage'), h('span', `${b.wage}d / day`)));
  return box;
}

function profile(store: Store, act: Actions, p: Person) {
  const d = dossierOf(p.id);
  const fac = store.state.relations.factions.find((f) => f.id === p.faction);
  const box = h('div.insp-body',
    h('div.row', portrait(p.portrait, 'xl'), h('div.grow', h('div', p.title), h('div.muted', `${fac?.name ?? p.faction} · ${SETTLEMENT_BY_ID.get(p.town)?.name ?? p.town}`))),
    h('p.quote', `"${d.quote}"`),
    h('p', p.notes),
    h('div.row', icon('heart'), h('span.grow', standingWord(p.standing)), vial({ tone: standingTone(p.standing), value: p.standing + 100, max: 200 }).el),
    h('div.row', icon('star'), h('span.grow', 'Wants'), h('span.insp-right', d.wants)),
    h('div.row', icon('warn'), h('span.grow', 'Fears'), h('span.insp-right', d.fears)),
    d.bribe != null
      ? h('div.row', icon('coin'), h('span.grow', 'Their price'), h('span.money', lsd(d.bribe)), stampButton({
        label: 'Bribe', size: 'sm', ink: 'madder',
        onClick: () => {
          act.money(-d.bribe!, `A purse to ${p.name}`, 'bribe', true);
          store.update((s) => {
            const x = s.relations.people.find((n) => n.id === p.id);
            if (x) x.standing = Math.min(80, x.standing + 8);
            s.player.meters.heat.value = Math.min(100, s.player.meters.heat.value + 5);
          });
          act.toast('Understood', 'The purse was lighter. So was their memory, perhaps.', 'eye', 'heat');
        },
      }))
      : h('p.muted', 'They will not take a purse. Or not from you.'),
    h('p.muted', `Last: ${d.last}`),
    h('p.muted', `They would: ${d.wouldDo}`),
    h('p.tone-heat', `They would turn: ${d.wouldTurn}`),
    d.history.length ? h('h3.panel-sub', 'A short history') : null,
    ...d.history.map((ev) => h('div.row', icon('quill'), h('span.grow', ev.text), h('span.muted', shortDate(ev.day)))),
    p.known && p.secret ? h('p.tone-heat', `Secret: ${p.secret}`) : h('p.muted', 'You do not yet know what they hide.'),
    h('div.row', { on: { click: () => act.openPanel('relations') } }, icon('people'), h('span', 'Open relations')),
  );
  return box;
}