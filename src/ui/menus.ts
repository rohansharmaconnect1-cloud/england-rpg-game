import type { Camera } from '../camera/camera';
import type { MapRenderer } from '../render/renderer';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import { defaultSettings } from '../state/settingsStore';
import { lsd } from './text';
import { h } from './kit/dom';
import { dropdown, lever, panel, slider, stampButton } from './kit/components';
import { playSfx } from './kit/sfx';
import { renderIntro } from './introCinematic';
import { commitSettings } from './settingsLive';
import { renderTitle } from './titleScreen';

export function mountMenus(root: HTMLElement, store: Store, act: Actions, renderer: MapRenderer, cam: Camera) {
  const veil = h('div.veil');
  root.append(veil);

  store.select(
    (s) => ({ menu: s.ui.menu, inGame: s.ui.inGame }),
    (v) => {
      veil.style.display = v.menu ? '' : 'none';
      veil.classList.toggle('title-veil', v.menu === 'main' && !v.inGame);
      veil.classList.toggle('intro-veil', v.menu === 'intro');
      if (!v.menu) {
        veil.replaceChildren();
        return;
      }
      if (v.menu === 'main' && !v.inGame) veil.replaceChildren(renderTitle(act, cam, store.state.settings.reduceMotion));
      else if (v.menu === 'main') veil.replaceChildren(pauseMenu(act));
      else if (v.menu === 'intro') veil.replaceChildren(renderIntro({ onDone: () => act.startGame() }));
      else if (v.menu === 'saves') veil.replaceChildren(saves(act));
      else veil.replaceChildren(titleSettings(store, act, renderer));
    },
  );
}

function pauseMenu(act: Actions) {
  const book = panel({ title: 'The tally waits', subtitle: 'Paused', icon: 'pause', illuminated: true, cls: 'menu-book' });
  book.body.append(
    h('div.menu-actions',
      stampButton({ label: 'Resume', icon: 'play', size: 'lg', ink: 'madder', onClick: () => { playSfx('ui_click'); act.menu(null); } }),
      stampButton({ label: 'Settings', icon: 'gear', size: 'md', ink: 'woad', onClick: () => act.menu('settings') }),
    ),
  );
  return book.el;
}

function saves(act: Actions) {
  const book = panel({ title: 'Books of account', subtitle: 'Visual mock — nothing is written yet', icon: 'book', cls: 'menu-book', onClose: () => act.menu('main') });
  book.body.append(
    slot('I', 'Edmund Ashby · House of Ashby', '18 April 1346 · Boston · ' + lsd(23 * 240 + 6 * 12 + 8), () => { act.menu('intro'); }),
    slot('II', null, null, () => act.toast('An empty binding', 'No clerk has written here.', 'book')),
    slot('III', null, null, () => act.toast('An empty binding', 'No clerk has written here.', 'book')),
    stampButton({ label: 'Back', icon: 'scroll', size: 'sm', ink: 'ink', onClick: () => act.menu('main') }),
  );
  return book.el;
}

function slot(n: string, title: string | null, meta: string | null, onClick: () => void) {
  return h('button.save-slot', { type: 'button', class: title ? '' : 'empty', on: { click: onClick } },
    h('div', h('div', title ? `Book ${n} · ${title}` : `Book ${n} · empty`), meta ? h('div.muted', meta) : h('div.muted', 'A blank quire')),
  );
}

function titleSettings(store: Store, act: Actions, renderer: MapRenderer) {
  const s = store.state.settings;
  const back = () => act.menu(store.state.ui.inGame ? null : 'main');
  const book = panel({ title: 'Settings', subtitle: 'How the manuscript is read', icon: 'gear', cls: 'menu-book settings-book', onClose: back });
  const patch = (fn: () => void) => {
    store.update(() => fn());
    commitSettings(store, renderer);
  };
  const scale = dropdown(
    [{ value: 'auto' as const, label: 'Auto' }, { value: 1 as const, label: '1×' }, { value: 2 as const, label: '2×' }, { value: 3 as const, label: '3×' }],
    s.uiScale,
    (v) => patch(() => { store.state.settings.uiScale = v; }),
  );
  book.body.append(
    lever('Glow', s.lighting.enabled, (v) => patch(() => { store.state.settings.lighting.enabled = v; })).el,
    slider('Glow intensity', s.lighting.glow, 0, 100, (v) => patch(() => { store.state.settings.lighting.glow = v; })).el,
    lever('Reduce motion', s.reduceMotion, (v) => patch(() => { store.state.settings.reduceMotion = v; })).el,
    lever('Show FPS', s.showFps, (v) => patch(() => { store.state.settings.showFps = v; })).el,
    h('div.row', h('span.grow', 'UI scale'), scale.el),
    h('div.menu-actions',
      stampButton({
        label: 'Reset to defaults', icon: 'gear', size: 'sm', ink: 'ink',
        onClick: () => {
          store.update((st) => { st.settings = defaultSettings(); });
          commitSettings(store, renderer);
          act.menu('settings');
        },
      }),
      stampButton({ label: 'Back', icon: 'scroll', size: 'sm', ink: 'madder', onClick: back }),
    ),
  );
  return book.el;
}
