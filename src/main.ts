import './style.css';
import './ui/kit/ui.css';
import { Camera } from './camera/camera';
import { CameraInput } from './camera/input';
import { stepTitleDrift } from './camera/titleDrift';
import { Overlay, uiAvoidRects } from './render/overlay';
import { MapRenderer } from './render/renderer';
import { SETTLEMENT_BY_ID, SETTLEMENT_POINTS } from './world/settlements';
import { WorldData, loadRawWorld } from './world/worldData';
import { Store } from './state/store';
import { createInitialState } from './state/initial';
import { actions } from './state/actions';
import { DriftTicker } from './state/drift';
import { createDebug } from './state/debug';
import { seasonOf } from './state/time';
import { TOWNS } from './content/towns';
import { GAME_TITLE } from './content/brand';
import { GOOD_BY_ID } from './content/goods';
import { C, MASTER } from './assets/palette';
import { dayGrade, mixGrade } from './lighting/dayNight';
import { WorldLayer, shipTip } from './lighting/worldLayer';
import { mountShell } from './ui/shell';
import { computeUiScale } from './ui/scale';
import { playSfx } from './ui/kit/sfx';
import { hideTip, showTipAt } from './ui/kit/tooltip';
import type { GameState } from './state/types';

async function main() {
  const glCanvas = document.getElementById('map') as HTMLCanvasElement;
  const fxCanvas = document.getElementById('fx') as HTMLCanvasElement;
  const uiCanvas = document.getElementById('overlay') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui-layer')!;
  const status = document.getElementById('status')!;

  const raw = await loadRawWorld(import.meta.env.BASE_URL + 'data/');
  const world = new WorldData(raw);
  const { worldW, worldH } = raw.meta;

  const store = new Store(createInitialState());
  const act = actions(store);
  const dbg = createDebug(store, act);

  const cam = new Camera({ x0: 0, y0: 0, x1: worldW, y1: worldH }, { x0: 8, y0: 8, x1: worldW - 8, y1: worldH - 8 }, 10);
  const renderer = new MapRenderer(glCanvas, raw, worldW, worldH);
  const overlay = new Overlay(uiCanvas);
  overlay.drawScale = true;
  overlay.revealAt = () => 1;
  const input = new CameraInput(uiCanvas, cam);
  const fx = new WorldLayer(store, world);
  await fx.init(fxCanvas);

  const shell = mountShell(uiRoot, store, act, cam, renderer, world);
  const drift = new DriftTicker(store, act);

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const c of [glCanvas, uiCanvas]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    fxCanvas.style.width = `${w}px`;
    fxCanvas.style.height = `${h}px`;
    fx.resize(w, h);
    cam.resize(w, h);
  };
  resize();
  cam.fitAll();
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', (e) => {
    if (!store.state.ui.inGame || store.state.ui.menu) return;
    if (e.key === 'Home' || e.key === '0') cam.fitAll();
  });

  input.onClick = (x, y) => {
    if (!store.state.ui.inGame || store.state.ui.menu || store.state.ui.event) return;
    const marked = fx.pickIncident(x, y);
    if (marked) {
      act.select({ kind: 'ship', id: marked.id });
      playSfx('map_select');
      act.event(marked.incident === 'pirates' ? 'pirates' : 'customs-at-sea');
      return;
    }
    const hit = fx.pick(cam, x, y);
    act.select(hit);
    if (hit) playSfx('map_select');
  };

  store.select(
    (s) => ({ inGame: s.ui.inGame, menu: s.ui.menu, event: s.ui.event }),
    (v) => {
      input.enabled = v.inGame && !v.menu && !v.event;
    },
  );

  let sawGame = false;
  store.select(
    (s) => s.ui.inGame,
    (v) => {
      if (v && !sawGame) {
        sawGame = true;
        const b = SETTLEMENT_BY_ID.get('boston');
        if (b) {
          cam.zoomBy(cam.viewW / 80 / cam.zoom, cam.viewW / 2, cam.viewH / 2, true);
          cam.cx = b.x;
          cam.cy = b.y;
          cam.panBy(0, 0);
        }
        act.toast('The house is yours', 'Wat has the tallies. Agnes has the keys. Hugh has the Margery. You have the debts.', 'scroll', 'gold');
      }
    },
  );

  Object.assign(window, { __tally: { store, act, debug: dbg, cam, renderer, world } });
  document.title = GAME_TITLE;
  status.remove();

  let last = performance.now();
  const t0 = last;
  let mapTip = false;
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const st = store.state;
    input.update(dt);
    if (!st.ui.inGame && (st.ui.menu === 'main' || st.ui.menu === 'settings')) {
      stepTitleDrift(cam, (now - t0) / 1000, st.settings.reduceMotion);
    } else {
      cam.update(dt);
    }
    if (st.ui.followShip && st.ui.inGame && !st.ui.menu) {
      const sel = st.ui.selected;
      const id = sel?.kind === 'ship' ? sel.id : st.assets.ships.find((s) => s.owner === 'player')?.id;
      const pos = id ? fx.shipScreen.find((s) => s.id === id) : undefined;
      if (pos) cam.lookAt(pos.x, pos.y);
    }
    drift.update(dt);

    overlay.drawLabels = st.layers.labels && st.ui.inGame && !st.ui.menu;
    overlay.drawScale = st.ui.inGame && !st.ui.menu;
    overlay.owned = new Set(st.assets.warehouses.map((w) => w.town).concat(st.player.location));
    overlay.mode = st.layers.overlay;
    fillOverlayTints(overlay, st);
    renderer.regionsOn = st.layers.regions;
    renderer.fogOn = false;
    renderer.setSeason(seasonOf(st.clock.day));
    const L = st.settings.lighting;
    const full = dayGrade(st.clock.day, st.clock.minute, st.weather.kind, st.weather.intensity);
    const grade = L.enabled
      ? mixGrade(full, L.timeOfDay / 100)
      : { grade: [1, 1, 1] as [number, number, number], lift: [0, 0, 0] as [number, number, number], night: 0, golden: 0, day: 1 };
    renderer.postOn = L.enabled;
    renderer.post.glow = (L.glow / 100) * 0.55;
    renderer.post.dof = (L.dof / 100) * 0.5;
    renderer.post.vignette = (L.vignette / 100) * 0.42;
    renderer.post.golden = grade.golden;
    renderer.post.night = grade.night;
    renderer.post.reduceMotion = st.settings.reduceMotion;
    renderer.grade = grade.grade;
    renderer.lift = grade.lift;
    renderer.pixelScale = st.settings.pixelSize;
    renderer.render(cam, (now - t0) / 1000, dt);
    fx.render(cam, dt, L.enabled ? { ...grade, night: full.night, golden: full.golden, day: full.day } : grade);
    const traffic =
      st.ui.inGame && !st.ui.menu && input.mouseX >= 0 ? fx.pick(cam, input.mouseX, input.mouseY) : null;
    const hover =
      traffic?.kind === 'ship'
        ? null
        : st.ui.inGame && !st.ui.menu && input.mouseX >= 0
          ? overlay.hitTest(cam, input.mouseX, input.mouseY, SETTLEMENT_POINTS)
          : null;
    overlay.hoverId = hover?.id ?? null;
    overlay.avoid = uiAvoidRects({
      scale: computeUiScale(st.settings.uiScale),
      viewW: cam.viewW,
      viewH: cam.viewH,
      charCollapsed: st.ui.charHudCollapsed,
      mapCollapsed: st.ui.minimapCollapsed,
      hasPanel: !!st.ui.panel && !st.ui.menu,
      hasInspector: !!st.ui.selected && !st.ui.menu,
      hasActionBar: st.ui.inGame && st.ui.actionBarOpen && !st.ui.menu && !st.ui.event,
    });
    if (st.ui.inGame) overlay.render(cam, SETTLEMENT_POINTS, window.devicePixelRatio || 1);
    if (traffic?.kind === 'ship') {
      mapTip = true;
      showTipAt(input.mouseX, input.mouseY, shipTip(store, traffic.id));
    } else if (hover) {
      mapTip = true;
      const info = TOWNS[hover.id];
      showTipAt(input.mouseX, input.mouseY, {
        title: hover.name,
        desc: [info?.realm, info?.exports.join(', ')].filter(Boolean).join(' · ') || hover.kind,
      });
    } else if (mapTip) {
      mapTip = false;
      hideTip();
    }
    shell.minimap.render(cam);
    shell.mouse[0] = input.mouseX;
    shell.mouse[1] = input.mouseY;
    shell.tick(dt, now);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function fillOverlayTints(overlay: Overlay, st: GameState) {
  overlay.tints.clear();
  const ov = st.layers.overlay;
  if (ov === 'prices') {
    const base = GOOD_BY_ID.wool.base;
    for (const [id, row] of Object.entries(st.market.towns)) {
      const u = Math.max(0, Math.min(1, (row.wool.price / base - 0.85) / 0.7));
      overlay.tints.set(id, u < 0.45 ? MASTER[C.moss] : u < 0.7 ? MASTER[C.saffron] : MASTER[C.madder]);
    }
  } else if (ov === 'heat') {
    for (const id of ['boston', 'lincoln', 'london', 'calais', 'hull']) overlay.tints.set(id, MASTER[C.ember]);
    overlay.tints.set('boston', MASTER[C.madder]);
    overlay.tints.set('lincoln', MASTER[C.madder]);
  } else if (ov === 'influence') {
    for (const w of st.assets.warehouses) overlay.tints.set(w.town, MASTER[C.saffron]);
    overlay.tints.set(st.player.location, MASTER[C.saffron]);
  }
}

main().catch((e) => {
  console.error(e);
  const s = document.getElementById('status');
  if (s) s.textContent = `Failed to start: ${e instanceof Error ? e.message : e}`;
});
