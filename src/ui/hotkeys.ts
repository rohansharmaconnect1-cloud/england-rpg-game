import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import type { PanelId } from '../state/types';

const PANELS: Record<string, PanelId | { id: PanelId; tab: string }> = {
  e: 'economy',
  r: 'relations',
  i: 'inventory',
  j: 'journal',
  l: 'ledger',
  g: { id: 'inventory', tab: 'wardrobe' },
  b: { id: 'relations', tab: 'people' },
  f: { id: 'character', tab: 'estate' },
};

export function bindHotkeys(store: Store, act: Actions) {
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
    const k = e.key;
    if (k === '`') {
      e.preventDefault();
      store.update((s) => (s.ui.debugOpen = !s.ui.debugOpen));
      return;
    }
    const s = store.state;
    if (k === 'Escape') {
      e.preventDefault();
      if (s.ui.event) return;
      if (s.ui.debugOpen) return store.update((st) => (st.ui.debugOpen = false));
      if (s.ui.menu === 'intro') return;
      if (s.ui.menu === 'settings' || s.ui.menu === 'saves') return act.menu(s.ui.inGame ? null : 'main');
      if (s.ui.menu === 'main') return s.ui.inGame ? act.menu(null) : undefined;
      if (s.ui.panel) return act.openPanel(null);
      if (s.ui.actionBarOpen) return store.update((st) => (st.ui.actionBarOpen = false));
      if (s.ui.selected) return act.select(null);
      if (s.ui.layersOpen) return store.update((st) => (st.ui.layersOpen = false));
      return act.menu('main');
    }
    if (!s.ui.inGame || s.ui.menu) return;
    if (k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      if (!s.ui.event) act.togglePause();
      return;
    }
    if (k === 'F1') {
      e.preventDefault();
      act.openPanel('help', 'keys');
      return;
    }
    if (k === 'c' || k === 'C') {
      e.preventDefault();
      act.toggleCharHud();
      return;
    }
    if (k === 'm' || k === 'M') {
      e.preventDefault();
      if (s.ui.minimapCollapsed) act.toggleMinimap();
      else store.update((st) => (st.ui.layersOpen = !st.ui.layersOpen));
      return;
    }
    const panel = PANELS[k.toLowerCase()];
    if (panel && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (typeof panel === 'string') act.openPanel(panel);
      else act.openPanel(panel.id, panel.tab);
    }
  });
}
