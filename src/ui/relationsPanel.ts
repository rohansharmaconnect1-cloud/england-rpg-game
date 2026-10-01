import { C, MASTER } from '../assets/palette';
import { asPersonCard, dossierOf, PLAYER_FACE } from '../content/dossiers';
import { SECRETS } from '../content/secrets';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import type { Person } from '../state/types';
import { SETTLEMENT_BY_ID } from '../world/settlements';
import { h, icon, portrait } from './kit/dom';
import { vial } from './kit/components';
import { tip } from './kit/tooltip';
import { standingTone, standingWord } from './text';

const WEB: { id: string; x: number; y: number }[] = [
  { id: 'you', x: 118, y: 168 },
  { id: 'wat', x: 40, y: 130 },
  { id: 'pynchbek', x: 200, y: 40 },
  { id: 'fenby', x: 210, y: 130 },
  { id: 'coteler', x: 30, y: 40 },
  { id: 'beurse', x: 120, y: 18 },
  { id: 'gaunt', x: 70, y: 80 },
  { id: 'marlowe', x: 170, y: 90 },
  { id: 'vane', x: 20, y: 90 },
  { id: 'ashcroft', x: 160, y: 170 },
];

type TieKind = 'friend' | 'rival' | 'owes' | 'blackmail';
const TIES: { a: string; b: string; kind: TieKind; label: string }[] = [
  { a: 'you', b: 'wat', kind: 'friend', label: 'The last honest tally' },
  { a: 'you', b: 'coteler', kind: 'owes', label: '£140, due Michaelmas' },
  { a: 'you', b: 'vane', kind: 'owes', label: 'Kin, and forty pounds' },
  { a: 'you', b: 'fenby', kind: 'rival', label: 'She wants the house gone' },
  { a: 'you', b: 'pynchbek', kind: 'blackmail', label: 'His second book, if you dare' },
  { a: 'you', b: 'beurse', kind: 'friend', label: 'Sixty sacks, ten marks' },
  { a: 'you', b: 'gaunt', kind: 'rival', label: 'He wants the warehouse keys' },
  { a: 'you', b: 'marlowe', kind: 'blackmail', label: 'A sheriff who sells warrants' },
  { a: 'you', b: 'ashcroft', kind: 'rival', label: 'Lynn would like your run' },
  { a: 'fenby', b: 'pynchbek', kind: 'blackmail', label: 'A ship that is not on his roll' },
  { a: 'wat', b: 'coteler', kind: 'blackmail', label: 'Paid twice. Wat kept the sticks.' },
  { a: 'gaunt', b: 'fenby', kind: 'friend', label: 'They drink. They do not toast you.' },
];

const TIE_COL: Record<TieKind, string> = {
  friend: MASTER[C.moss],
  rival: MASTER[C.madder],
  owes: MASTER[C.saffron],
  blackmail: MASTER[C.aubergine],
};

export function renderRelations(store: Store, act: Actions, tab: string): Node {
  if (tab === 'factions') return factions(store);
  if (tab === 'web') return web(store, act);
  return people(store, act);
}

function people(store: Store, act: Actions) {
  const s = store.state;
  const cards: Person[] = [
    ...s.band.map(asPersonCard),
    ...s.relations.people,
  ];
  const featured = ['wat', 'marlowe', 'colby', 'heyden', 'aldous', 'fenwick', 'vane', 'ashcroft'];
  const top = featured.map((id) => cards.find((p) => p.id === id)).filter((p): p is Person => !!p);
  const rest = cards.filter((p) => !featured.includes(p.id));
  return h('div.rel',
    h('p.muted', 'Faces of the house, the quay, and the people who hold your debts.'),
    ...top.map((p) => personCard(store, act, p)),
    h('h3.panel-sub', 'Also of the realm'),
    ...rest.map((p) => personCard(store, act, p)),
    secretsBlock(),
  );
}

function personCard(store: Store, act: Actions, p: Person) {
  const d = dossierOf(p.id);
  return h('div.person-card', { on: { click: () => act.select({ kind: store.state.band.some((b) => b.id === p.id) ? 'retainer' : 'person', id: p.id }) } },
    portrait(p.portrait, 'lg'),
    h('div.grow',
      h('div', p.name),
      h('div.muted', `${p.title} · ${SETTLEMENT_BY_ID.get(p.town)?.name ?? p.town}`),
      h('p.quote', `"${d.quote}"`),
      h('div.row', h('span.grow', standingWord(p.standing)), vial({ tone: standingTone(p.standing), value: p.standing + 100, max: 200 }).el),
      h('div.muted', `Wants: ${d.wants}`),
      h('div.muted', `Fears: ${d.fears}`),
      h('div.muted', `Last: ${d.last}`),
      h('div.muted', `Would: ${d.wouldDo}`),
      h('div.tone-heat', `Turn: ${d.wouldTurn}`),
    ),
  );
}

function factions(store: Store) {
  const s = store.state;
  const loy = s.band.reduce((n, b) => n + b.loyalty, 0) / (s.band.length || 1);
  const staffStanding = Math.round((loy - 50) * 1.4);
  const primary = ['guild', 'crown', 'church', 'staff', 'folk', 'flemish', 'fen'];
  const list = [
    ...primary.map((id) => s.relations.factions.find((f) => f.id === id)!).filter(Boolean),
    ...s.relations.factions.filter((f) => !primary.includes(f.id)),
  ];
  return h('div.rel',
    h('p.muted', 'Who nods, who watches, who waits for you to fail.'),
    ...list.map((f) => h('div.faction-row',
      icon(f.icon),
      h('div.grow',
        h('div', f.name, ' ', h('span.trend', { class: (f.trend ?? 0) > 0 ? 'tick-up' : (f.trend ?? 0) < 0 ? 'tick-down' : '' }, (f.trend ?? 0) > 0 ? '▲' : (f.trend ?? 0) < 0 ? '▼' : '–')),
        h('div.muted', f.note ?? f.desc),
      ),
      vial({ tone: standingTone(f.id === 'staff' ? staffStanding : f.standing), value: (f.id === 'staff' ? staffStanding : f.standing) + 100, max: 200 }).el,
    )),
    secretsBlock(),
  );
}

function web(store: Store, act: Actions) {
  const s = store.state;
  const wrap = h('div.web-wrap');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 240 200');
  svg.setAttribute('class', 'web-svg');
  for (const t of TIES) {
    const a = WEB.find((n) => n.id === t.a)!;
    const b = WEB.find((n) => n.id === t.b)!;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(a.x + 12));
    line.setAttribute('y1', String(a.y + 12));
    line.setAttribute('x2', String(b.x + 12));
    line.setAttribute('y2', String(b.y + 12));
    line.setAttribute('stroke', TIE_COL[t.kind]);
    line.setAttribute('stroke-width', t.kind === 'blackmail' ? '2' : '1.5');
    if (t.kind === 'blackmail') line.setAttribute('stroke-dasharray', '3 2');
    svg.append(line);
    tip(line as unknown as Element, { title: t.kind, desc: t.label });
  }
  wrap.append(svg);
  for (const n of WEB) {
    const spec = n.id === 'you' ? PLAYER_FACE : (s.relations.people.find((p) => p.id === n.id)?.portrait ?? s.band.find((b) => b.id === n.id)?.portrait);
    if (!spec) continue;
    const node = h('button.web-node', { type: 'button', style: `left:${n.x}px;top:${n.y}px`, on: { click: () => {
      if (n.id === 'you') act.openPanel('character');
      else if (s.band.some((b) => b.id === n.id)) act.select({ kind: 'retainer', id: n.id });
      else act.select({ kind: 'person', id: n.id });
    } } }, portrait(spec));
    const name = n.id === 'you' ? 'Edmund' : (s.relations.people.find((p) => p.id === n.id)?.name ?? s.band.find((b) => b.id === n.id)?.name ?? n.id);
    tip(node, { title: name, desc: TIES.filter((t) => t.a === n.id || t.b === n.id).map((t) => t.label).join(' · ') || 'A face in the web.' });
    wrap.append(node);
  }
  return h('div.rel',
    h('p.muted', 'Green friend, madder rival, gold owed, dashed aubergine for what you could use.'),
    wrap,
    h('div.web-legend',
      h('span', { style: `color:${TIE_COL.friend}` }, 'Friend'),
      h('span', { style: `color:${TIE_COL.rival}` }, 'Rival'),
      h('span', { style: `color:${TIE_COL.owes}` }, 'Owes'),
      h('span', { style: `color:${TIE_COL.blackmail}` }, 'Leverage'),
    ),
    secretsBlock(),
  );
}

function secretsBlock() {
  return h('div.secrets',
    h('h3.panel-sub', 'Secrets and leverage'),
    ...SECRETS.map((sc) => h('div.row.secret-row', { class: sc.known ? 'known' : 'locked' },
      icon(sc.known ? sc.icon : 'key'),
      h('div.grow', h('div', sc.about), h('div.muted', sc.known ? sc.text : 'A scroll still sealed.')),
      h('span.chip', sc.known ? 'open' : 'sealed'),
    )),
  );
}
