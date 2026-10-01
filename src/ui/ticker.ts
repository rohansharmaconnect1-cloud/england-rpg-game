import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import { h, icon } from './kit/dom';
import { tip } from './kit/tooltip';

const TAG: Record<string, string> = {
  war: 'War', trade: 'Trade', church: 'Church', crown: 'Crown', local: 'Town', rumour: 'Rumour', omen: 'Omen',
};

export function mountTicker(root: HTMLElement, store: Store, act: Actions) {
  const tag = h('span.ticker-tag', 'Crier');
  const text = h('span.ticker-text', '…');
  const el = h('button.ticker', { type: 'button', on: { click: () => act.openPanel('journal', 'news') } }, icon('bell'), tag, text);
  tip(el, 'crier');
  root.append(el);

  store.select(
    (s) => ({ n: s.news[s.news.length - 1], inGame: s.ui.inGame, menu: s.ui.menu }),
    (v) => {
      el.style.display = 'none';
      if (!v.n) return;
      tag.textContent = TAG[v.n.tag] ?? v.n.tag;
      text.textContent = v.n.text;
      text.style.animation = 'none';
      void text.offsetWidth;
      text.style.animation = '';
    },
  );
}
