import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import { shortDate } from './text';
import { h, icon } from './kit/dom';
import { panel, vial } from './kit/components';
import { tip } from './kit/tooltip';

export function mountTracker(root: HTMLElement, store: Store, act: Actions) {
  const list = h('div.tracker-list');
  const wrap = panel({ title: 'Deals & Tasks', icon: 'scroll', cls: 'tracker', onClose: () => store.update((s) => (s.ui.trackerOpen = false)) });
  wrap.body.append(list);
  tip(wrap.el, 'tracker');
  root.append(wrap.el);

  const toggle = () => {
    const open = store.state.ui.trackerOpen && store.state.ui.inGame && !store.state.ui.menu && !store.state.ui.panel;
    wrap.el.style.display = open ? '' : 'none';
    wrap.el.classList.toggle('collapsed', !store.state.ui.trackerOpen);
    wrap.head?.classList.toggle('muted', !open);
  };

  wrap.head?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.close-seal')) return;
    store.update((s) => (s.ui.trackerOpen = !s.ui.trackerOpen));
  });

  store.select(
    (s) => ({ deals: s.deals, open: s.ui.trackerOpen, inGame: s.ui.inGame, menu: s.ui.menu, panel: s.ui.panel }),
    (v) => {
      toggle();
      list.replaceChildren(
        ...v.deals.map((d) => {
          const bar = vial({ tone: d.kind === 'shady' || d.kind === 'debt' ? 'heat' : 'gold', value: d.progress * 100, cls: 'horiz' });
          const row = h('div.deal', { class: d.kind, on: { click: () => act.toast(d.title, `${d.reward}${d.risk ? ' · ' + d.risk : ''}`, d.icon, d.kind === 'shady' ? 'heat' : 'gold') } },
            icon(d.icon),
            h('div', h('div.deal-title', d.title), h('div.deal-meta', `Due ${shortDate(d.dueDay)} · ${d.reward}`), bar.el),
          );
          return row;
        }),
      );
    },
  );
}
