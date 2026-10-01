import { EVENTS } from '../content/events';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import type { MapRenderer } from '../render/renderer';
import type { Camera } from '../camera/camera';
import type { WorldData } from '../world/worldData';
import { unproject } from '../world/projection';
import { h } from './kit/dom';
import { panel, stampButton } from './kit/components';
import { sfxLog } from './kit/sfx';

export function mountDebugPanel(
  root: HTMLElement,
  store: Store,
  act: Actions,
  renderer: MapRenderer,
  cam: Camera,
  world: WorldData,
  fps: () => { fps: number; worst: number },
  mouse: () => [number, number],
) {
  const p = panel({ title: 'Clerk\'s scratch', subtitle: 'Backtick to hide', icon: 'gear', cls: 'debug-dock dark', dark: true, onClose: () => store.update((s) => (s.ui.debugOpen = false)) });
  const pre = h('pre.debug-pre');
  const row = h('div.debug-row');
  row.append(
    stampButton({ label: '+£1', size: 'sm', ink: 'ink', onClick: () => act.money(240, 'Debug purse') }),
    stampButton({ label: '−£1', size: 'sm', ink: 'madder', onClick: () => act.money(-240, 'Debug spend') }),
    stampButton({ label: 'Noon', size: 'sm', onClick: () => act.timeOfDay(12) }),
    stampButton({ label: 'Dusk', size: 'sm', onClick: () => act.timeOfDay(19.5) }),
    stampButton({ label: 'Night', size: 'sm', onClick: () => act.timeOfDay(23) }),
    stampButton({ label: 'Storm', size: 'sm', ink: 'woad', onClick: () => act.weather('storm', 0.9) }),
    stampButton({ label: 'Clear', size: 'sm', ink: 'woad', onClick: () => act.weather('clear', 0.3) }),
    stampButton({ label: 'Toast', size: 'sm', onClick: () => act.toast('A pinned note', 'The clerk was bored.', 'scroll') }),
    stampButton({ label: 'News', size: 'sm', onClick: () => act.news({ tag: 'local', text: 'A debug cry from the steps of St Botolph\'s.' }) }),
    ...EVENTS.map((e) => stampButton({ label: e.title.split(' ')[0]!, size: 'sm', ink: 'madder', onClick: () => act.event(e.id) })),
  );
  p.body.append(pre, row);
  root.append(p.el);

  store.select(
    (s) => ({ open: s.ui.debugOpen, inGame: s.ui.inGame }),
    (v) => {
      p.el.style.display = v.open ? '' : 'none';
    },
  );

  return {
    update() {
      if (!store.state.ui.debugOpen) return;
      const i = renderer.info;
      const [mx, my] = mouse();
      let cursor = '';
      if (mx >= 0) {
        const [wx, wy] = cam.screenToWorld(mx, my);
        const [lon, lat] = unproject(wx, wy);
        cursor = `cursor ${lat.toFixed(3)}°N ${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'W' : 'E'} ${world.regionAt(wx, wy)}`;
      }
      const f = fps();
      pre.textContent =
        `zoom ${ (cam.zoom / cam.minZoom).toFixed(2) }x  ${cam.milesAcross.toFixed(1)} mi  lod ${i.k}` +
        (i.blend ? ` → ${i.k + 1} ${Math.round(i.blend * 100)}%` : '') +
        `\nfps ${f.fps.toFixed(0)}  worst ${(f.worst * 1000).toFixed(1)} ms  hd ${i.quality}  chunks vis ${i.visible} miss ${i.missing}` +
        `\n${cursor}\nsfx ${sfxLog.slice(-6).join(', ') || '—'}`;
    },
  };
}
