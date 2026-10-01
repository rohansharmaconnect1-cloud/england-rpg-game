import { EVENT_BY_ID } from '../content/events';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import { h } from './kit/dom';
import { panel, stampButton } from './kit/components';
import { playSfx } from './kit/sfx';

export function mountEventCard(root: HTMLElement, store: Store, act: Actions) {
  const veil = h('div.veil');
  veil.style.zIndex = '32';
  root.append(veil);

  store.select(
    (s) => s.ui.event,
    (id) => {
      veil.style.display = id && store.state.ui.inGame ? '' : 'none';
      if (!id) {
        veil.replaceChildren();
        return;
      }
      const ev = EVENT_BY_ID[id];
      if (!ev) {
        veil.replaceChildren();
        return;
      }
      const card = panel({ title: ev.title, subtitle: 'A matter that will not wait', icon: ev.icon, cls: 'event-card', illuminated: true });
      card.body.append(
        h('p', ev.body),
        h('div.choices', ...ev.choices.map((c, i) => {
          const b = stampButton({
            label: c.label,
            icon: i === 0 ? 'check' : i === 1 ? 'eye' : 'quill',
            size: 'md',
            ink: i === 1 ? 'madder' : 'ink',
            onClick: () => choose(store, act, id, i),
          });
          return h('div', b, c.hint ? h('div.choice-hint', c.hint) : null, ...c.effects.map((e) => h('div.tip-fx', { class: 'tone-' + e.tone }, e.text)));
        })),
      );
      veil.replaceChildren(card.el);
    },
  );
}

function choose(store: Store, act: Actions, id: string, i: number) {
  playSfx('event_choice');
  const ev = EVENT_BY_ID[id];
  mock(store, act, id, i);
  act.toast(ev.choices[i].label, ev.choices[i].effects.map((e) => e.text).join(' · '), ev.icon, ev.choices[i].effects[0]?.tone ?? 'neutral');
  act.event(null);
}

function mock(store: Store, act: Actions, id: string, i: number) {
  const heat = (n: number) => store.update((s) => (s.player.meters.heat.value = Math.max(0, Math.min(100, s.player.meters.heat.value + n))));
  const rep = (n: number) => store.update((s) => (s.player.meters.reputation.value = Math.max(0, Math.min(100, s.player.meters.reputation.value + n))));
  if (id === 'collector' && i === 0) {
    act.money(-(10 * 240 + 16 * 12), 'Custom paid in full', 'tax');
    rep(5);
  } else if (id === 'collector' && i === 1) {
    act.money(-(3 * 240), 'A gift to the Collector', 'bribe', true);
    heat(8);
  } else if (id === 'collector' && i === 2) {
    act.toast("Wat's tallies", 'The second book and the first disagree. Pynchbek sniffs, and leaves — for now.', 'quill', 'gold');
    rep(3);
  } else if (id === 'leak' && i === 0) {
    act.money(-(240 + 48), 'Thatcher and drying-frames', 'misc');
    store.update((s) => (s.assets.warehouses[0].condition = Math.min(100, s.assets.warehouses[0].condition + 12)));
  } else if (id === 'leak' && i === 1) {
    act.money(4 * 240, 'Wet wool, sold by weight', 'trade', true);
    heat(4);
  } else if (id === 'letter' && i === 0) {
    store.update((s) => {
      const d = s.deals.find((x) => x.id === 'beurse-wool');
      if (d) d.progress = Math.max(d.progress, 0.45);
    });
    store.update((s) => {
      const p = s.relations.people.find((x) => x.id === 'beurse');
      if (p) p.standing += 10;
    });
  } else if (id === 'letter' && i === 1) {
    heat(3);
  } else if (id === 'purveyor' && i === 0) {
    store.update((s) => {
      const w = s.assets.warehouses[0];
      w.stock.wool = Math.max(0, (w.stock.wool ?? 0) - 10);
      const f = s.relations.factions.find((x) => x.id === 'crown');
      if (f) f.standing += 10;
    });
    act.toast("The King's tally", 'A stick of wood that says the Exchequer will pay. Eventually.', 'crown', 'loyalty');
  } else if (id === 'purveyor' && i === 1) {
    heat(12);
  } else if (id === 'pirates' && i === 0) {
    store.update((s) => {
      const f = s.relations.factions.find((x) => x.id === 'crown');
      if (f) f.standing += 6;
      const sh = s.assets.ships.find((x) => x.id === 'balinger');
      if (sh) sh.incident = undefined;
    });
  } else if (id === 'pirates' && i === 1) {
    act.money(-(2 * 240), 'A purse at Winchelsea', 'bribe', true);
    heat(5);
    store.update((s) => {
      const sh = s.assets.ships.find((x) => x.id === 'balinger');
      if (sh) sh.incident = undefined;
    });
  } else if (id === 'pirates') {
    store.update((s) => {
      const sh = s.assets.ships.find((x) => x.id === 'balinger');
      if (sh) sh.incident = undefined;
    });
  } else if (id === 'customs-at-sea' && i === 0) {
    store.update((s) => {
      s.player.meters.reputation.value = Math.min(100, s.player.meters.reputation.value + 4);
      const sh = s.assets.ships.find((x) => x.id === 'katherine');
      if (sh) sh.incident = undefined;
    });
  } else if (id === 'customs-at-sea') {
    heat(8);
    store.update((s) => {
      const sh = s.assets.ships.find((x) => x.id === 'katherine');
      if (sh) sh.incident = undefined;
    });
  }
}
