import { C, MASTER } from '../assets/palette';
import type { Camera } from '../camera/camera';
import type { Actions } from '../state/actions';
import type { Store } from '../state/store';
import type { MapOverlay } from '../state/types';
import type { WorldData } from '../world/worldData';
import { SETTLEMENT_BY_ID, SETTLEMENT_POINTS } from '../world/settlements';
import { along, worldPts } from '../map/routeGeom';
import { GOOD_BY_ID } from '../content/goods';
import { h } from './kit/dom';
import { lever, panel, stampButton } from './kit/components';
import { tip } from './kit/tooltip';
import type { IconName } from '../assets/icons';

function viewOf(world: WorldData) {
  const { worldW, worldH } = world.meta;
  return { x0: 16, y0: 8, x1: worldW - 8, y1: worldH - 8 };
}

const OVERLAYS: { id: MapOverlay; icon: IconName; title: string; desc: string }[] = [
  { id: 'terrain', icon: 'map', title: 'Terrain', desc: 'The board as it is: land, sea, and the realms.' },
  { id: 'trade', icon: 'ship', title: 'Trade flow', desc: 'Routes thicken with traffic. Yours in saffron.' },
  { id: 'prices', icon: 'wool', title: 'Prices', desc: 'Towns tinted green to red by the price of wool.' },
  { id: 'heat', icon: 'eye', title: 'Heat', desc: 'Where the law is looking. Ember means watched.' },
  { id: 'influence', icon: 'crown', title: 'Influence', desc: 'Crown, guild, rivals, and your own holdings.' },
  { id: 'danger', icon: 'skull', title: 'Danger', desc: 'Pirates, storms, and bad roads.' },
  { id: 'rumors', icon: 'quill', title: 'Rumours', desc: 'Speech-bubble pins where gossip gathers.' },
];

const LEGEND: Record<MapOverlay, { swatch: string; label: string }[]> = {
  terrain: [
    { swatch: MASTER[C.moss], label: 'England' },
    { swatch: MASTER[C.woad], label: 'Sea' },
    { swatch: MASTER[C.madder], label: 'France' },
  ],
  trade: [
    { swatch: MASTER[C.saffron], label: 'Your traffic' },
    { swatch: MASTER[C.woadMid], label: 'Crown / foreign' },
    { swatch: MASTER[C.madder], label: 'Rival' },
  ],
  prices: [
    { swatch: MASTER[C.moss], label: 'Wool cheap' },
    { swatch: MASTER[C.saffron], label: 'Fair' },
    { swatch: MASTER[C.madder], label: 'Wool dear' },
  ],
  heat: [
    { swatch: MASTER[C.parchmentDark], label: 'Quiet' },
    { swatch: MASTER[C.ember], label: 'Watched' },
    { swatch: MASTER[C.madder], label: 'Hot' },
  ],
  influence: [
    { swatch: MASTER[C.saffron], label: 'Yours' },
    { swatch: MASTER[C.woadMid], label: 'Crown' },
    { swatch: MASTER[C.moss], label: 'Guild' },
    { swatch: MASTER[C.madder], label: 'Rivals' },
  ],
  danger: [
    { swatch: MASTER[C.madder], label: 'Pirates' },
    { swatch: MASTER[C.woad], label: 'Storms' },
    { swatch: MASTER[C.umber], label: 'Banditry' },
  ],
  rumors: [
    { swatch: MASTER[C.parchmentLight], label: 'A rumour' },
    { swatch: MASTER[C.saffron], label: 'Fresh gossip' },
  ],
};

export function mountMinimap(root: HTMLElement, store: Store, cam: Camera, world: WorldData, act: Actions) {
  const VIEW = viewOf(world);
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 140;
  const baked = bake(world, canvas.width, canvas.height, VIEW);
  const ctx = canvas.getContext('2d')!;

  const frame = h('div.minimap-frame', canvas);
  tip(frame, 'minimap');
  const dock = panel({ title: 'The Realm', icon: 'map', cls: 'minimap-dock' });
  const overlayStrip = h('div.overlay-strip');
  const legend = h('div.map-legend');
  const camRow = h('div.minimap-cam');
  const tray = h('div.layer-tray');
  dock.body.append(h('div.minimap-row', overlayStrip, frame, legend), camRow, tray);
  root.append(dock.el);

  const fold = stampButton({
    label: '',
    icon: 'map',
    size: 'sm',
    ink: 'woad',
    cls: 'minimap-fold',
    tip: { title: 'Expand the realm', desc: 'Open the map tile. Layer buttons wait inside.', hotkey: 'M' },
    onClick: (e) => {
      e.stopPropagation();
      act.toggleMinimap();
    },
  });
  dock.head?.append(fold);

  const overlayBtns = OVERLAYS.map((o) => {
    const b = stampButton({
      label: '',
      icon: o.icon,
      size: 'sm',
      ink: 'ink',
      tip: { title: o.title, desc: o.desc },
      onClick: () => act.setOverlay(o.id),
    });
    b.classList.add('overlay-btn');
    overlayStrip.append(b);
    return { id: o.id, b };
  });

  const camBtns = [
    stampButton({ label: '', icon: 'crown', size: 'sm', ink: 'ink', tip: { title: 'Zoom in' }, onClick: () => cam.zoomBy(1.35, cam.viewW / 2, cam.viewH / 2) }),
    stampButton({ label: '', icon: 'map', size: 'sm', ink: 'ink', tip: { title: 'Zoom out' }, onClick: () => cam.zoomBy(1 / 1.35, cam.viewW / 2, cam.viewH / 2) }),
    stampButton({ label: '', icon: 'sun', size: 'sm', ink: 'ink', tip: { title: 'Reset view', hotkey: 'Home' }, onClick: () => { store.update((s) => (s.ui.followShip = false)); cam.fitAll(); } }),
    stampButton({ label: '', icon: 'warehouse', size: 'sm', ink: 'woad', tip: { title: 'Focus on home base', desc: 'Boston, the Ashby warehouse, the Haven.' }, onClick: () => {
      store.update((s) => (s.ui.followShip = false));
      const b = SETTLEMENT_BY_ID.get('boston');
      if (b) cam.lookAt(b.x, b.y, cam.viewW / 80);
    } }),
    stampButton({ label: '', icon: 'ship', size: 'sm', ink: 'ink', tip: { title: 'Follow ship', desc: 'Ride with the selected sail, or the Margery.' }, onClick: () => act.toggleFollow() }),
  ];
  camRow.append(...camBtns);
  const followBtn = camBtns[4];

  const layerKeys = [
    { k: 'routes' as const, label: 'Routes' },
    { k: 'ships' as const, label: 'Ships' },
    { k: 'labels' as const, label: 'Names' },
    { k: 'regions' as const, label: 'Realms' },
    { k: 'weather' as const, label: 'Weather' },
    { k: 'influence' as const, label: 'Influence' },
  ];
  const levers = layerKeys.map(({ k, label }) => {
    const l = lever(label, store.state.layers[k], (v) => store.update((s) => (s.layers[k] = v)));
    tray.append(l.el);
    return { k, l };
  });

  store.select(
    (s) => ({ inGame: s.ui.inGame, menu: s.ui.menu, layers: s.layers, open: s.ui.layersOpen, overlay: s.layers.overlay, follow: s.ui.followShip, collapsed: s.ui.minimapCollapsed }),
    (v) => {
      dock.el.style.display = v.inGame && !v.menu ? '' : 'none';
      dock.el.classList.toggle('collapsed', v.collapsed);
      root.classList.toggle('minimap-collapsed', v.collapsed);
      overlayStrip.style.display = v.collapsed ? 'none' : '';
      legend.style.display = v.collapsed ? 'none' : '';
      camRow.style.display = v.collapsed ? 'none' : '';
      tray.style.display = !v.collapsed && v.open ? '' : 'none';
      fold.title = v.collapsed ? 'Expand the realm' : 'Fold the realm';
      for (const { k, l } of levers) l.set(v.layers[k]);
      for (const o of overlayBtns) {
        o.b.classList.toggle('ink-woad', o.id === v.overlay);
        o.b.classList.toggle('ink-ink', o.id !== v.overlay);
      }
      followBtn.classList.toggle('ink-woad', v.follow);
      followBtn.classList.toggle('ink-ink', !v.follow);
      legend.replaceChildren(
        h('div.legend-title', OVERLAYS.find((o) => o.id === v.overlay)?.title ?? 'Terrain'),
        ...LEGEND[v.overlay].map((row) => {
          const sw = h('span.legend-swatch');
          sw.style.background = row.swatch;
          return h('div.legend-row', sw, h('span', row.label));
        }),
      );
    },
  );

  frame.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = (e.clientY - r.top) / r.height;
    store.update((s) => (s.ui.followShip = false));
    cam.cx = VIEW.x0 + u * (VIEW.x1 - VIEW.x0);
    cam.cy = VIEW.y0 + v * (VIEW.y1 - VIEW.y0);
    cam.panBy(0, 0);
  });

  dock.head?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.close-seal, .minimap-fold, .stamp-btn')) return;
    act.toggleMinimap();
  });

  return {
    render(c: Camera) {
      ctx.putImageData(baked, 0, 0);
      const w = canvas.width;
      const h = canvas.height;
      const sx = (x: number) => ((x - VIEW.x0) / (VIEW.x1 - VIEW.x0)) * w;
      const sy = (y: number) => ((y - VIEW.y0) / (VIEW.y1 - VIEW.y0)) * h;
      const st = store.state;
      const ov = st.layers.overlay;
      const now = performance.now();
      const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now / 220));

      if (ov === 'trade' || ov === 'danger') {
        for (const route of st.routes) {
          const pts = worldPts(route);
          if (pts.length < 2) continue;
          const traffic = st.assets.ships.filter((s) => s.route === route.id).length;
          ctx.beginPath();
          ctx.moveTo(sx(pts[0][0]), sy(pts[0][1]));
          for (let i = 1; i < pts.length; i++) ctx.lineTo(sx(pts[i][0]), sy(pts[i][1]));
          if (ov === 'danger') {
            const hot = route.hazard === 'pirates' || route.danger >= 0.5;
            ctx.strokeStyle = hot ? MASTER[C.madder] : route.hazard === 'weather' ? MASTER[C.woad] : MASTER[C.umber];
            ctx.globalAlpha = hot ? 0.85 : 0.35;
            ctx.lineWidth = hot ? 2 : 1;
          } else {
            ctx.strokeStyle = route.owner === 'player' ? MASTER[C.saffron] : route.owner === 'rival' ? MASTER[C.madder] : MASTER[C.woadMid];
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 1 + Math.min(3, traffic);
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }

      const woolBase = GOOD_BY_ID.wool.base;
      for (const t of SETTLEMENT_POINTS) {
        if (t.tier > 2 && ov === 'terrain') continue;
        const x = Math.round(sx(t.x));
        const y = Math.round(sy(t.y));
        if (ov === 'prices') {
          const p = st.market.towns[t.id]?.wool.price;
          if (p == null) continue;
          const u = Math.max(0, Math.min(1, (p / woolBase - 0.85) / 0.7));
          ctx.fillStyle = u < 0.45 ? MASTER[C.moss] : u < 0.7 ? MASTER[C.saffron] : MASTER[C.madder];
          ctx.fillRect(x - 1, y - 1, 3, 3);
        } else if (ov === 'heat') {
          const watched = t.id === 'boston' || t.id === 'lincoln' || t.id === 'london' || t.id === 'calais';
          const hot = t.id === 'boston' || t.id === 'lincoln';
          ctx.fillStyle = hot ? MASTER[C.madder] : watched ? MASTER[C.ember] : MASTER[C.parchmentDark];
          ctx.globalAlpha = hot ? pulse : 0.7;
          ctx.fillRect(x - 1, y - 1, hot ? 3 : 2, hot ? 3 : 2);
          ctx.globalAlpha = 1;
        } else if (ov === 'influence') {
          const yours = st.assets.warehouses.some((wh) => wh.town === t.id) || t.id === st.player.location;
          ctx.fillStyle = yours ? MASTER[C.saffron] : t.foreign ? MASTER[C.woadMid] : MASTER[C.moss];
          ctx.fillRect(x - 1, y - 1, yours ? 3 : 2, yours ? 3 : 2);
        } else if (ov !== 'trade' && ov !== 'danger' && t.tier <= 2) {
          ctx.fillStyle = MASTER[C.saffron];
          ctx.fillRect(x - 1, y - 1, t.tier === 1 ? 2 : 1, t.tier === 1 ? 2 : 1);
        }
      }

      for (const wh of st.assets.warehouses) {
        const t = SETTLEMENT_BY_ID.get(wh.town);
        if (!t) continue;
        ctx.fillStyle = MASTER[C.saffron];
        ctx.fillRect(Math.round(sx(t.x)) - 1, Math.round(sy(t.y)) - 1, 3, 3);
      }

      if (ov === 'rumors') {
        const pins = rumorPins(st);
        ctx.fillStyle = MASTER[C.parchmentLight];
        for (const pin of pins) {
          const t = SETTLEMENT_BY_ID.get(pin);
          if (!t) continue;
          const x = Math.round(sx(t.x));
          const y = Math.round(sy(t.y));
          ctx.globalAlpha = pulse;
          ctx.fillRect(x - 2, y - 4, 5, 3);
          ctx.fillRect(x, y - 1, 1, 2);
          ctx.globalAlpha = 1;
        }
      }

      const routeCache = new Map(st.routes.map((r) => [r.id, worldPts(r)]));
      for (const sh of st.assets.ships) {
        const pts = routeCache.get(sh.route);
        if (!pts) continue;
        const pos = along(pts, sh.progress);
        const x = Math.round(sx(pos.x));
        const y = Math.round(sy(pos.y));
        ctx.fillStyle = sh.owner === 'player' ? MASTER[C.saffronLight] : MASTER[C.cream];
        ctx.fillRect(x, y, 2, 2);
        if (sh.incident) {
          ctx.strokeStyle = MASTER[C.madder];
          ctx.globalAlpha = pulse;
          ctx.strokeRect(x - 2, y - 2, 6, 6);
          ctx.globalAlpha = 1;
        }
      }

      if (st.ui.event) {
        ctx.strokeStyle = MASTER[C.ember];
        ctx.globalAlpha = pulse;
        const home = SETTLEMENT_BY_ID.get(st.player.location);
        if (home) ctx.strokeRect(Math.round(sx(home.x)) - 3, Math.round(sy(home.y)) - 3, 8, 8);
        ctx.globalAlpha = 1;
      }

      const x0 = sx(c.cx - c.viewW / (2 * c.zoom));
      const y0 = sy(c.cy - c.viewH / (2 * c.zoom));
      const x1 = sx(c.cx + c.viewW / (2 * c.zoom));
      const y1 = sy(c.cy + c.viewH / (2 * c.zoom));
      ctx.strokeStyle = MASTER[C.madder];
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(x0) + 0.5, Math.round(y0) + 0.5, Math.max(2, x1 - x0), Math.max(2, y1 - y0));
    },
  };
}

function rumorPins(st: Store['state']): string[] {
  const ids = new Set<string>(['boston']);
  for (const n of st.news) if (n.town) ids.add(n.town);
  for (const r of st.rumors) {
    const t = r.text.toLowerCase();
    if (t.includes('lincoln') || r.source.toLowerCase().includes('lincoln')) ids.add('lincoln');
    if (t.includes('bruges') || t.includes('flem')) ids.add('bruges');
    if (t.includes('london')) ids.add('london');
    if (t.includes('sluys') || t.includes('zwin')) ids.add('bruges');
  }
  return [...ids];
}

function bake(
  world: WorldData,
  w: number,
  h: number,
  VIEW: { x0: number; y0: number; x1: number; y1: number },
): ImageData {
  const img = new ImageData(w, h);
  const { x0, y0, x1, y1 } = VIEW;
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const x = x0 + ((i + 0.5) / w) * (x1 - x0);
      const y = y0 + ((j + 0.5) / h) * (y1 - y0);
      const land = world.land(x, y);
      const rid = world.regionIdNear(x, y);
      let r: number, g: number, b: number;
      if (land < 0) {
        const deep = land < -8;
        [r, g, b] = hex(deep ? C.woadDeep : C.woad);
      } else if (rid === 1) {
        [r, g, b] = hex(C.moss);
      } else if (rid === 2) {
        [r, g, b] = hex(C.sage);
      } else if (rid === 3) {
        [r, g, b] = hex(C.woadMid);
      } else if (rid === 7 && x > 490 && y > 348 && y < 422) {
        [r, g, b] = hex(C.madder);
      } else if (rid === 7) {
        [r, g, b] = hex(C.tan);
      } else {
        [r, g, b] = hex(C.stone);
      }
      const o = (j * w + i) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  return img;
}

function hex(i: number): [number, number, number] {
  const n = parseInt(MASTER[i].slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
