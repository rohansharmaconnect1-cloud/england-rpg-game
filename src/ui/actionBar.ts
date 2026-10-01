import type { IconName } from '../assets/icons';
import type { Camera } from '../camera/camera';
import { MARKET_TOWNS } from '../content/goods';
import { asPersonCard, dossierOf } from '../content/dossiers';
import { RUMOR_POOL } from '../content/news';
import { TOWNS } from '../content/towns';
import { isLandVessel } from '../map/routeGeom';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import { dayToDate, feastOf } from '../state/time';
import type { Person, Selection, Tone, WeatherKind } from '../state/types';
import { SETTLEMENT_BY_ID, SETTLEMENT_POINTS } from '../world/settlements';
import { panel, stampButton } from './kit/components';
import { h, icon, portrait } from './kit/dom';
import { playSfx } from './kit/sfx';
import { canonicalHour, formatDate, lsd, seasonOf, standingWord } from './text';

interface Chip {
  text: string;
  tone: Tone;
}

interface RunCtx {
  act: Actions;
  store: Store;
  sel: Selection | null;
  cam: Camera;
  pickPerson: (title: string, people: Person[], onPick: (p: Person) => void, bribe?: boolean) => void;
  pickTown: (title: string, ids: string[], onPick: (id: string) => void) => void;
}

interface Act {
  label: string;
  icon: IconName;
  ink?: 'madder' | 'ink' | 'woad';
  chips: Chip[];
  risk?: boolean;
  disabled?: string;
  run: (ctx: RunCtx) => void;
}

interface PersonPick {
  kind: 'person';
  title: string;
  people: Person[];
  bribe?: boolean;
  onPick: (p: Person) => void;
}

interface TownPick {
  kind: 'town';
  title: string;
  ids: string[];
  onPick: (id: string) => void;
}

type PickSession = PersonPick | TownPick;

function chip(text: string, tone: Tone): Chip {
  return { text, tone };
}

const WX: Record<WeatherKind, string> = {
  clear: 'The sky is clear; the Haven shines like a knife.',
  overcast: 'A grey lid sits on the fens. Sails hang slack.',
  rain: 'Rain needles the wool-sacks and turns the wool-road to soup.',
  storm: 'The wind is a fist. No honest cog should be out.',
  fog: 'The Haven is a rumour in the fog. Bells, then nothing.',
  snow: 'Snow on the salt pans. Men stamp and wait for a thaw.',
};

const INNS: Record<string, string> = {
  boston: 'the Swan',
  lincoln: 'the Angel',
  london: 'the Tabard',
  bruges: "van der Beurse's cellar",
  lynn: 'the Globe',
  hull: "the King's Head",
  york: 'the Black Swan',
  norwich: "the Maid's Head",
};

const COG_NAMES = ['The Fleece', 'St Botolph', 'Good Hope', 'The Wash Maid', 'Holy Rood', 'The Swan'];

function townName(id: string): string {
  return SETTLEMENT_BY_ID.get(id)?.name ?? id;
}

function knownPeople(store: Store): Person[] {
  return store.state.relations.people.filter((p) => p.known);
}

function peopleInTown(store: Store, townId: string): Person[] {
  return store.state.relations.people.filter((p) => p.known && p.town === townId);
}

function bumpStanding(store: Store, id: string, n: number) {
  store.update((st) => {
    const p = st.relations.people.find((x) => x.id === id);
    if (p) p.standing = Math.max(-100, Math.min(100, p.standing + n));
    const b = st.band.find((x) => x.id === id);
    if (b) b.loyalty = Math.max(0, Math.min(100, b.loyalty + n));
  });
}

function cannotPay(store: Store, cost: number): string | undefined {
  return store.state.money.pence < cost ? 'The purse is too light.' : undefined;
}

function surveyRealm(ctx: RunCtx) {
  const s = ctx.store.state;
  const locId = s.player.location;
  const loc = SETTLEMENT_BY_ID.get(locId);
  const season = seasonOf(s.clock.day);
  const hour = canonicalHour(s.clock.minute);
  const feast = feastOf(dayToDate(s.clock.day));
  const heat = Math.round(s.player.meters.heat.value);
  const ships = s.assets.ships.filter((sh) => sh.owner === 'player');
  const nearby = loc
    ? SETTLEMENT_POINTS
        .filter((t) => t.id !== locId)
        .map((t) => ({ t, d: (t.x - loc.x) ** 2 + (t.y - loc.y) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .map((n) => n.t.name)
    : [];
  const heatLine =
    heat < 22 ? 'The custom is not looking at you today.'
    : heat < 50 ? 'There is talk of you on the quay.'
    : 'Eyes follow you. Walk as if you do not notice.';
  const shipLine = ships.length
    ? ships.map((sh) => `${sh.name} — ${sh.status}.`).join(' ')
    : 'No sail of yours is on the water.';
  const body = [
    `${formatDate(s.clock.day, true)}, ${hour}. ${season}.`,
    feast ? `Feast of ${feast}.` : null,
    WX[s.weather.kind],
    loc ? `You stand at ${loc.name}.` : null,
    nearby.length ? `A day's ride: ${nearby.join(', ')}.` : null,
    shipLine,
    heatLine,
  ].filter(Boolean).join(' ');

  if (loc) {
    try {
      ctx.cam.lookAt(loc.x, loc.y, Math.max(ctx.cam.minZoom * 1.85, ctx.cam.zoom * 0.55));
    } catch {
      /* camera is best-effort */
    }
  } else {
    try { ctx.cam.fitAll(); } catch { /* ignore */ }
  }
  ctx.act.toast('Survey of the realm', body, 'map');
}

function addRumor(store: Store, text: string, source: string, reliability: number) {
  store.update((st) => {
    st.rumors.push({ id: 'r' + Math.floor(Math.random() * 1e9), day: st.clock.day, text, source, reliability });
    if (st.rumors.length > 30) st.rumors.shift();
  });
}

function unusedRumor(store: Store) {
  const have = new Set(store.state.rumors.map((r) => r.text));
  return RUMOR_POOL.find((r) => !have.has(r.text)) ?? null;
}

function gossipForTown(store: Store, townId: string): { text: string; source: string; reliability: number } {
  const fresh = unusedRumor(store);
  if (fresh) return fresh;
  const folk = peopleInTown(store, townId);
  const p = folk[Math.floor(Math.random() * Math.max(1, folk.length))];
  if (p) {
    const d = dossierOf(p.id);
    return {
      source: 'Tavern talk',
      reliability: 0.45,
      text: `${p.name} is ${standingWord(p.standing).toLowerCase()} — ${d.last}`,
    };
  }
  return { source: 'A drunk', reliability: 0.2, text: `At ${townName(townId)} they drink more than they know.` };
}

function sendTo(ctx: RunCtx, p: Person, cost: number, kind: 'letter' | 'messenger') {
  const pay = cannotPay(ctx.store, cost);
  if (pay) {
    ctx.act.toast('Empty purse', pay, 'coin', 'loss');
    return;
  }
  const at = townName(p.town);
  if (kind === 'messenger') {
    ctx.act.money(-cost, `A riding messenger for ${p.name}`, 'misc');
    ctx.act.toast('Away', `A boy on a bay cob takes the road to ${at} with word for ${p.name}.`, 'flag', 'gold');
  } else {
    ctx.act.money(-cost, `Postage to ${p.name}`, 'misc');
    bumpStanding(ctx.store, p.id, 2);
    ctx.act.toast(
      'Sealed',
      `Anselm's hand, waxed with the Ashby fleece, for ${p.name} at ${at}: a civil enquiry after their health, and yours.`,
      'quill',
    );
    ctx.act.openPanel('journal');
  }
}

function bribePerson(ctx: RunCtx, p: Person) {
  const d = dossierOf(p.id);
  if (d.bribe == null) {
    ctx.act.toast('Refused', `${p.name} will not take a purse. Or not from you.`, 'eye', 'heat');
    return;
  }
  const pay = cannotPay(ctx.store, d.bribe);
  if (pay) {
    ctx.act.toast('Empty purse', `${p.name} wants ${lsd(d.bribe)}. ${pay}`, 'coin', 'loss');
    return;
  }
  if (ctx.store.state.player.meters.heat.value >= 72) {
    ctx.act.toast('Watched', 'They will not take a purse while the quay is watching.', 'eye', 'heat');
    return;
  }
  ctx.act.money(-d.bribe, `A purse to ${p.name}`, 'bribe', true);
  bumpStanding(ctx.store, p.id, 8);
  ctx.store.update((st) => (st.player.meters.heat.value = Math.min(100, st.player.meters.heat.value + 5)));
  ctx.act.toast('Understood', `${p.name} understood. ${d.wouldDo}`, 'eye', 'heat');
}

function actionsFor(sel: Selection | null, store: Store): Act[] {
  const heat = store.state.player.meters.heat.value;
  const pence = store.state.money.pence;
  if (!sel) {
    return [
      {
        label: 'Survey the Realm', icon: 'map', ink: 'woad', chips: [],
        run: (ctx) => surveyRealm(ctx),
      },
      {
        label: 'Hire Messenger', icon: 'flag', chips: [chip('Coins −12', 'loss')],
        disabled: pence < 12 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          const folk = knownPeople(ctx.store);
          if (!folk.length) {
            ctx.act.toast('No one', 'You know no one to send a boy to.', 'flag');
            return;
          }
          ctx.pickPerson('Who should the messenger find?', folk, (p) => sendTo(ctx, p, 12, 'messenger'));
        },
      },
      {
        label: 'Send Letter', icon: 'quill', chips: [chip('Coins −4', 'loss')],
        disabled: pence < 4 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          const folk = knownPeople(ctx.store);
          if (!folk.length) {
            ctx.act.toast('No one', 'You have no name to put above the seal.', 'quill');
            return;
          }
          ctx.pickPerson('Who is the letter for?', folk, (p) => sendTo(ctx, p, 4, 'letter'));
        },
      },
      {
        label: 'Visit Tavern', icon: 'wine', chips: [chip('Coins −8', 'loss'), chip('Heat +1', 'heat')],
        disabled: pence < 8 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          const loc = ctx.store.state.player.location;
          const inn = INNS[loc] ?? 'the alehouse';
          const g = gossipForTown(ctx.store, loc);
          ctx.act.money(-8, `Ale at ${inn}`, 'misc');
          ctx.store.update((st) => (st.player.meters.heat.value = Math.min(100, st.player.meters.heat.value + 1)));
          addRumor(ctx.store, g.text, g.source, g.reliability);
          ctx.act.openPanel('journal', 'rumors');
          ctx.act.toast(inn.replace(/^./, (c) => c.toUpperCase()), `${g.source}: “${g.text}”`, 'wine', 'heat');
        },
      },
    ];
  }
  if (sel.kind === 'town') {
    const name = townName(sel.id);
    const info = TOWNS[sel.id];
    return [
      {
        label: 'Trade at Market', icon: 'scales', chips: [],
        run: (ctx) => ctx.act.openPanel('economy', 'prices'),
      },
      {
        label: 'Rent Warehouse', icon: 'warehouse', chips: [chip('Coins −£1', 'loss')],
        disabled: pence < 240 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          ctx.act.money(-240, `A year's rent at ${name}`, 'misc');
          ctx.act.toast('A key', `The landlord at ${name} takes a pound and a promise.${info?.customs ? ' ' + info.customs : ''}`, 'warehouse', 'gold');
        },
      },
      {
        label: 'Bribe Official', icon: 'eye', ink: 'madder', chips: [chip('Their price', 'loss'), chip('Heat +5', 'heat')],
        disabled: heat >= 72 ? 'Too closely watched for a quiet purse.' : undefined,
        run: (ctx) => {
          const folk = peopleInTown(ctx.store, sel.id);
          if (!folk.length) {
            ctx.act.toast('No one', `At ${name} you know no one who will take a purse.`, 'eye', 'heat');
            return;
          }
          ctx.pickPerson(`Who at ${name} takes a purse?`, folk, (p) => bribePerson(ctx, p), true);
        },
      },
      {
        label: 'Hire Local Muscle', icon: 'dagger', chips: [chip('Coins −40', 'loss'), chip('Loyalty +1', 'loyalty')],
        disabled: pence < 40 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          ctx.act.money(-40, `A day's hire at ${name}`, 'wages');
          ctx.store.update((st) => {
            const d = st.band.find((b) => b.id === 'dunstan');
            if (d) {
              d.loyalty = Math.min(100, d.loyalty + 1);
              d.location = sel.id;
            }
          });
          ctx.act.toast('Hired', `Dunstan Hay will stand by the door at ${name} until vespers.`, 'dagger');
        },
      },
      {
        label: 'Ask Around', icon: 'people', chips: [chip('Coins −6', 'loss')],
        disabled: pence < 6 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          const g = gossipForTown(ctx.store, sel.id);
          ctx.act.money(-6, `Drinks for gossip at ${name}`, 'misc');
          addRumor(ctx.store, g.text, g.source, g.reliability);
          ctx.act.openPanel('journal', 'rumors');
          ctx.act.toast('Ask around', `${g.source} at ${name}: “${g.text}”`, 'people');
        },
      },
      {
        label: 'Set Up Front', icon: 'handshake', ink: 'woad', chips: [chip('Coins −120', 'loss'), chip('Heat +3', 'heat'), chip('Legitimacy +2', 'profit')],
        disabled: pence < 120 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          ctx.act.money(-120, `A stall at ${name}`, 'misc');
          ctx.store.update((st) => {
            st.player.meters.heat.value = Math.min(100, st.player.meters.heat.value + 3);
            st.player.meters.reputation.value = Math.min(100, st.player.meters.reputation.value + 2);
          });
          ctx.act.toast('A front', `A draper's stall at ${name}, a name on the lintel, and a second set of books.`, 'handshake', 'heat');
        },
      },
    ];
  }
  if (sel.kind === 'ship') {
    const sh = store.state.assets.ships.find((x) => x.id === sel.id);
    const land = sh ? isLandVessel(sh.kind) : false;
    const cargoN = sh ? Object.values(sh.cargo).reduce((n, v) => n + (v ?? 0), 0) : 0;
    const acts: Act[] = [
      {
        label: 'Load Cargo', icon: 'wool', chips: [],
        run: (ctx) => ctx.act.openPanel('inventory', 'cargo'),
      },
      {
        label: 'Set Route', icon: 'map', ink: 'woad', chips: [],
        run: (ctx) => {
          const dests = MARKET_TOWNS.filter((id) => SETTLEMENT_BY_ID.has(id));
          ctx.pickTown(land ? 'Which town?' : 'Which port?', dests, (id) => {
            const dest = townName(id);
            ctx.store.update((st) => {
              const ship = st.assets.ships.find((x) => x.id === sel.id);
              if (!ship) return;
              const route = st.routes.find((r) =>
                (r.from === id || r.to === id) && (land ? r.kind === 'road' : r.kind !== 'road'),
              );
              if (route) {
                ship.route = route.id;
                ship.progress = route.from === id ? 1 : 0;
                ship.dir = route.from === id ? -1 : 1;
                ship.hold = 0;
              }
              ship.status = `Bound for ${dest}`;
            });
            ctx.act.toast('Course set', `${sh?.name ?? 'The vessel'} will make for ${dest}.`, 'map');
          });
        },
      },
      {
        label: 'Rename', icon: 'quill', chips: [chip('Coins −24', 'loss')],
        disabled: sh?.hold === 0 ? 'Cannot paint a new name under way.' : pence < 24 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          const used = new Set(ctx.store.state.assets.ships.map((x) => x.name));
          const next = COG_NAMES.find((n) => !used.has(n) && n !== sh?.name) ?? COG_NAMES[0];
          ctx.act.money(-24, `A new name on the stern: ${next}`, 'misc');
          ctx.store.update((st) => {
            const ship = st.assets.ships.find((x) => x.id === sel.id);
            if (ship) ship.name = next;
          });
          ctx.act.toast('A new name', `The painter letters ${next} on the stern. Twenty-four pence and a slack tide.`, 'quill', 'gold');
        },
      },
      {
        label: 'Hide Contraband', icon: 'eye', ink: 'madder', chips: [chip('Heat +4', 'heat')], risk: true,
        disabled: cargoN <= 0 ? 'Nothing in the hold to hide.' : undefined,
        run: (ctx) => {
          ctx.store.update((st) => (st.player.meters.heat.value = Math.min(100, st.player.meters.heat.value + 4)));
          ctx.act.toast('Under the wool', `${sh?.name ?? 'The hold'}: bales stacked high. The tronage clerk will need a long pole.`, 'eye', 'heat');
        },
      },
      {
        label: land ? 'Arm the Guards' : 'Arm the Crew', icon: 'shield', chips: [chip('Coins −80', 'loss'), chip('Heat +1', 'heat')],
        disabled: pence < 80 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          ctx.act.money(-80, land ? 'Bills and jacks' : 'Bills for the forecastle', 'misc');
          ctx.store.update((st) => {
            st.player.meters.heat.value = Math.min(100, st.player.meters.heat.value + 1);
            const ship = st.assets.ships.find((x) => x.id === sel.id);
            if (ship) ship.morale = Math.min(100, ship.morale + 8);
          });
          ctx.act.toast('Armed', land ? 'The carters look less like pilgrims.' : `${sh?.captain ?? 'The master'} issues bills and a warning about Friday.`, 'shield');
        },
      },
    ];
    if (sh?.incident) {
      acts.unshift({
        label: 'The mark', icon: 'warn', ink: 'madder', chips: [],
        run: (ctx) => ctx.act.event(sh.incident === 'pirates' ? 'pirates' : 'customs-at-sea'),
      });
    }
    return acts;
  }
  if (sel.kind === 'person' || sel.kind === 'retainer') {
    const named =
      store.state.relations.people.find((x) => x.id === sel.id)
      ?? (() => {
        const b = store.state.band.find((x) => x.id === sel.id);
        return b ? asPersonCard(b) : null;
      })();
    const d = dossierOf(sel.id);
    const price = d.bribe;
    const who = named?.name ?? 'them';
    return [
      { label: 'Talk', icon: 'quill', chips: [], run: (ctx) => ctx.act.openPanel('relations') },
      {
        label: 'Gift', icon: 'coin', chips: [chip('Coins −12', 'loss'), chip('Standing +6', 'loyalty')],
        disabled: pence < 12 ? 'The purse is too light.' : undefined,
        run: (ctx) => {
          ctx.act.money(-12, `A small gift for ${who}`, 'bribe');
          bumpStanding(ctx.store, sel.id, 6);
          ctx.act.toast('A gift', `Twelve pence in a gloved hand. ${who} did not refuse.`, 'coin', 'gold');
        },
      },
      {
        label: 'Bribe', icon: 'eye', ink: 'madder',
        chips: price != null ? [chip(`Coins −${lsd(price)}`, 'loss'), chip('Heat +5', 'heat')] : [],
        disabled:
          heat >= 72 ? 'They will not take a purse while watched.'
          : price == null ? 'They will not take a purse. Or not from you.'
          : pence < price ? `They want ${lsd(price)}.`
          : undefined,
        run: (ctx) => {
          if (named) bribePerson(ctx, named);
        },
      },
    ];
  }
  return [
    { label: 'Inspect', icon: 'warehouse', chips: [], run: (ctx) => ctx.act.openPanel('inventory') },
    {
      label: 'Mend roof', icon: 'warn', ink: 'madder', chips: [chip('Coins −24s', 'loss')],
      disabled: pence < 288 ? 'The purse is too light.' : undefined,
      run: (ctx) => {
        ctx.act.money(-288, "Thatcher's bill", 'misc');
        ctx.store.update((st) => (st.assets.warehouses[0].condition = Math.min(100, st.assets.warehouses[0].condition + 18)));
        ctx.act.toast('The leak slows', 'The thatcher took his shillings and left a damp patch.', 'warehouse', 'profit');
      },
    },
  ];
}

function pickRowPerson(p: Person, onPick: () => void, disabled?: string, showPrice = false) {
  const d = dossierOf(p.id);
  const price = d.bribe;
  const btn = h('button.act-pick-row', {
    type: 'button',
    class: disabled ? 'is-disabled' : '',
    on: { click: disabled ? () => {} : onPick },
  },
    portrait(p.portrait),
    h('div.who',
      h('strong', p.name),
      h('span', `${p.title} · ${townName(p.town)} · ${standingWord(p.standing)}`),
    ),
    showPrice ? (price != null ? h('span.money', lsd(price)) : h('span.muted', 'No purse')) : null,
  );
  if (disabled) btn.title = disabled;
  return btn;
}

function pickRowTown(id: string, onPick: () => void) {
  return h('button.act-pick-row', { type: 'button', on: { click: onPick } },
    icon('map'),
    h('div.who', h('strong', townName(id)), h('span', id)),
  );
}

export function mountActionBar(root: HTMLElement, store: Store, act: Actions, cam: Camera) {
  const dock = h('div.action-dock');
  const wrap = panel({ cls: 'action-bar' });
  const lift = h('button.action-lift', {
    type: 'button',
    'aria-label': 'Open actions',
    title: 'Actions',
    on: { click: () => { pick = null; act.toggleActionBar(); } },
  }, h('span.chev'));
  dock.append(wrap.el, lift);
  root.append(dock);

  let pick: PickSession | null = null;
  let lastSelKey = '';

  const paint = () => {
    const s = store.state;
    const live = s.ui.inGame && !s.ui.menu && !s.ui.event;
    dock.style.display = live ? '' : 'none';
    if (!live) {
      pick = null;
      return;
    }
    const selKey = s.ui.selected ? s.ui.selected.kind + ':' + s.ui.selected.id : '';
    if (selKey !== lastSelKey) {
      pick = null;
      lastSelKey = selKey;
    }
    const open = s.ui.actionBarOpen;
    dock.classList.toggle('open', open);
    lift.setAttribute('aria-expanded', open ? 'true' : 'false');
    lift.setAttribute('aria-label', open ? 'Hide actions' : 'Open actions');
    lift.title = open ? 'Hide actions' : 'Open actions';
    if (!open) {
      wrap.body.replaceChildren();
      return;
    }

    const back = () => {
      pick = null;
      playSfx('ui_click');
      paint();
    };

    if (pick?.kind === 'person') {
      const session = pick;
      wrap.body.replaceChildren(
        h('div.act-pick',
          h('div.act-pick-head',
            stampButton({ label: 'Back', size: 'sm', ink: 'ink', onClick: back }),
            h('span', session.title),
          ),
          ...session.people.map((p) => {
            const d = dossierOf(p.id);
            const need = d.bribe;
            const disabled = !session.bribe ? undefined
              : need == null ? 'They will not take a purse. Or not from you.'
              : s.money.pence < need ? `They want ${lsd(need)}.`
              : undefined;
            return pickRowPerson(p, () => {
              const fn = session.onPick;
              pick = null;
              fn(p);
              paint();
            }, disabled, session.bribe);
          }),
        ),
      );
      return;
    }

    if (pick?.kind === 'town') {
      const session = pick;
      wrap.body.replaceChildren(
        h('div.act-pick',
          h('div.act-pick-head',
            stampButton({ label: 'Back', size: 'sm', ink: 'ink', onClick: back }),
            h('span', session.title),
          ),
          ...session.ids.map((id) => pickRowTown(id, () => {
            const fn = session.onPick;
            pick = null;
            fn(id);
            paint();
          })),
        ),
      );
      return;
    }

    const sel = s.ui.selected;
    const ctx: RunCtx = {
      act,
      store,
      sel,
      cam,
      pickPerson: (title, people, onPick, bribe) => {
        pick = { kind: 'person', title, people, bribe, onPick };
        if (!store.state.ui.actionBarOpen) act.toggleActionBar();
        paint();
      },
      pickTown: (title, ids, onPick) => {
        pick = { kind: 'town', title, ids, onPick };
        if (!store.state.ui.actionBarOpen) act.toggleActionBar();
        paint();
      },
    };
    const acts = actionsFor(sel, store).slice(0, 4);
    wrap.body.replaceChildren(
      ...acts.map((a) => {
        const btn = stampButton({
          label: a.label,
          icon: a.icon,
          size: 'md',
          ink: a.ink ?? 'ink',
          disabled: !!a.disabled,
          onClick: a.disabled ? undefined : () => a.run(ctx),
          tip: a.disabled
            ? { title: a.label, desc: a.disabled }
            : { title: a.label, desc: a.chips.map((c) => c.text).join(' · ') || 'No purse changes.', effects: a.chips },
        });
        const chips = h('div.delta-chips',
          ...a.chips.map((c) => h('span.delta-chip', { class: 'tone-' + c.tone }, c.text)),
          a.risk ? h('span.risk-tag', 'Risk') : null,
        );
        return h('div.act-slot', btn, chips);
      }),
    );
  };

  store.select(
    (s) => ({
      sel: s.ui.selected,
      open: s.ui.actionBarOpen,
      inGame: s.ui.inGame,
      menu: s.ui.menu,
      event: s.ui.event,
      heat: Math.round(s.player.meters.heat.value),
      pence: s.money.pence,
      loc: s.player.location,
      rumors: s.rumors.length,
      day: s.clock.day,
      wx: s.weather.kind,
    }),
    () => paint(),
  );
}
