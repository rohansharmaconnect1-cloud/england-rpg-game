import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import { h, icon } from './kit/dom';
import { playSfx } from './kit/sfx';

const LIFE = 5000;

export function mountToasts(root: HTMLElement, store: Store, act: Actions) {
  const stack = h('div.toast-stack');
  root.append(stack);

  store.select(
    (s) => s.toasts,
    (toasts) => {
      stack.replaceChildren(
        ...toasts.map((t) =>
          h('div.toast', { class: t.tone ? 'tone-' + t.tone : '', on: { click: () => { playSfx('toast_dismiss'); act.dismissToast(t.id); } } },
            t.icon ? icon(t.icon) : null,
            h('div', h('div.tip-title', t.title), t.body ? h('div.tip-desc', t.body) : null),
          ),
        ),
      );
    },
  );

  return {
    tick(now: number) {
      const stale = store.state.toasts.filter((t) => now - t.born > LIFE);
      if (stale.length) store.update((s) => (s.toasts = s.toasts.filter((t) => now - t.born <= LIFE)));
    },
  };
}
