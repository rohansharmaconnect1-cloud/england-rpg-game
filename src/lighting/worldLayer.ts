import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { iconCanvas } from '../assets/icons';
import { C, hex, hexNum } from '../assets/palette';
import { ashbyArmsCanvas, baleCanvas, liveryOf, vesselCanvas } from '../assets/textures';
import type { Camera } from '../camera/camera';
import { along, destName, etaText, isLandVessel, remainingDays, routeMiles, travelDays, worldPts } from '../map/routeGeom';
import { labelSprite } from '../render/pixelFont';
import type { Store } from '../state/store';
import type { Route, Selection, Ship } from '../state/types';
import { SETTLEMENT_POINTS } from '../world/settlements';
import type { WorldData } from '../world/worldData';
import type { Grade } from './dayNight';

const OWNER_COL: Record<Route['owner'], number> = {
  player: hexNum(C.saffron),
  rival: hexNum(C.madder),
  crown: hexNum(C.woadMid),
  foreign: hexNum(C.stone),
};

const FISH: { x: number; y: number; p: number }[] = [
  { x: 392, y: 252, p: 0.2 },
  { x: 404, y: 258, p: 1.1 },
  { x: 418, y: 246, p: 2.4 },
  { x: 448, y: 228, p: 0.7 },
  { x: 358, y: 198, p: 3.0 },
  { x: 400, y: 318, p: 1.6 },
  { x: 310, y: 430, p: 2.2 },
];

const SHEEP: { x: number; y: number; n: number }[] = [
  { x: 365, y: 232, n: 5 },
  { x: 348, y: 220, n: 4 },
  { x: 338, y: 208, n: 3 },
  { x: 372, y: 262, n: 4 },
  { x: 330, y: 248, n: 3 },
  { x: 268, y: 392, n: 4 },
  { x: 255, y: 408, n: 3 },
  { x: 318, y: 175, n: 4 },
];

export interface ShipScreen {
  id: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  sea: boolean;
}

/**
 * PixiJS overlay: trade routes, ships, lamps, motes, weather. Sits above the WebGL terrain
 * and below the HTML UI. Driven from the game loop (`app.ticker` is left stopped).
 */
export class WorldLayer {
  readonly shipScreen: ShipScreen[] = [];
  private app!: Application;
  private routesG = new Graphics();
  private wakesG = new Graphics();
  private lightsG = new Graphics();
  private weatherG = new Graphics();
  private lifeG = new Graphics();
  private marks = new Container();
  private ships = new Container();
  private sprites = new Map<string, Sprite>();
  private pool = new Map<string, Sprite>();
  private seen = new Set<string>();
  private tex = new Map<string, Texture>();
  private routeCache = new Map<string, [number, number][]>();
  private rain: { x: number; y: number; v: number; l: number }[] = [];
  private t = 0;
  private fireflies: { x: number; y: number; p: number }[] = [];
  private motes: { x: number; y: number; z: number }[] = [];
  private gulls: { x: number; y: number; vx: number; phase: number }[] = [];
  private atmosG = new Graphics();

  constructor(private readonly store: Store, private readonly world: WorldData) {}

  async init(canvas: HTMLCanvasElement) {
    this.app = new Application();
    await this.app.init({
      canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      preference: 'webgl',
      hello: false,
    });
    this.app.ticker.stop();
    this.app.stage.eventMode = 'none';
    this.app.stage.addChild(this.routesG, this.wakesG, this.ships, this.marks, this.lifeG, this.lightsG, this.atmosG, this.weatherG);
    this.lightsG.blendMode = 'add';
    this.atmosG.blendMode = 'add';
    for (let i = 0; i < 90; i++) this.rain.push({ x: Math.random(), y: Math.random(), v: 0.35 + Math.random() * 0.7, l: 4 + Math.random() * 8 });
    for (let i = 0; i < 28; i++) this.fireflies.push({ x: 140 + Math.random() * 320, y: 90 + Math.random() * 360, p: Math.random() * 6 });
    for (let i = 0; i < 18; i++) this.motes.push({ x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 0.8 });
    for (let i = 0; i < 5; i++) this.gulls.push({ x: 280 + Math.random() * 180, y: 390 + Math.random() * 80, vx: 1.6 + Math.random() * 1.2, phase: Math.random() * 6 });
    for (let i = 0; i < 4; i++) this.gulls.push({ x: 360 + Math.random() * 80, y: 230 + Math.random() * 40, vx: 1.2 + Math.random(), phase: Math.random() * 6 });
  }

  resize(w: number, h: number) {
    this.app?.renderer.resize(w, h);
  }

  render(cam: Camera, dt: number, grade: Grade) {
    if (!this.app) return;
    const s = this.store.state;
    const layers = s.layers;
    const lit = s.settings.lighting;

    this.t += dt;
    this.seen.clear();
    this.drawRoutes(cam, layers.routes);
    this.drawShips(cam, layers.ships);
    this.drawLife(cam, dt, layers.ships);
    const glow = lit.enabled ? lit.glow / 100 : 0;
    const wx = lit.enabled ? lit.weather / 100 : 0;
    this.drawLights(cam, grade, glow);
    this.drawAtmos(cam, dt, grade, glow);
    this.drawWeather(cam, dt, wx > 0.04 && layers.weather, wx);
    this.sweepPool();
    this.app.render();
  }

  pick(cam: Camera, sx: number, sy: number): Selection | null {
    const hits: { sel: Selection; d: number }[] = [];
    const consider = (sel: Selection, x: number, y: number, max = 18) => {
      const d = Math.hypot(sx - x, sy - y);
      if (d < max) hits.push({ sel, d });
    };
    if (this.store.state.layers.ships) for (const sh of this.shipScreen) consider({ kind: 'ship', id: sh.id }, sh.sx, sh.sy, 22);
    for (const t of SETTLEMENT_POINTS) {
      const [x, y] = cam.worldToScreen(t.x, t.y);
      consider({ kind: 'town', id: t.id }, x, y, t.tier === 1 ? 26 : 18);
    }
    hits.sort((a, b) => a.d - b.d);
    return hits[0]?.sel ?? null;
  }

  /** Click the pulsing mark on a troubled ship. */
  pickIncident(sx: number, sy: number): Ship | null {
    if (!this.store.state.layers.ships) return null;
    const ships = this.store.state.assets.ships;
    for (const vis of this.shipScreen) {
      const sh = ships.find((s) => s.id === vis.id);
      if (!sh?.incident) continue;
      if (Math.hypot(sx - vis.sx, sy - (vis.sy - 16)) < 16) return sh;
    }
    return null;
  }

  private ptsOf(route: Route) {
    let p = this.routeCache.get(route.id);
    if (!p) {
      p = worldPts(route);
      this.routeCache.set(route.id, p);
    }
    return p;
  }

  private texOf(key: string, canvas: HTMLCanvasElement): Texture {
    let t = this.tex.get(key);
    if (!t) {
      t = Texture.from(canvas);
      this.tex.set(key, t);
    }
    return t;
  }

  private mark(id: string, tex: Texture, x: number, y: number, scale: number, ax = 0.5, ay = 0.5): Sprite {
    this.seen.add(id);
    let s = this.pool.get(id);
    if (!s) {
      s = new Sprite(tex);
      s.roundPixels = true;
      this.marks.addChild(s);
      this.pool.set(id, s);
    }
    s.texture = tex;
    s.visible = true;
    s.anchor.set(ax, ay);
    s.x = Math.round(x);
    s.y = Math.round(y);
    s.scale.set(scale);
    s.alpha = 1;
    s.tint = 0xffffff;
    s.angle = 0;
    return s;
  }

  private sweepPool() {
    for (const [id, s] of this.pool) if (!this.seen.has(id)) s.visible = false;
  }

  private strokeDashed(
    g: Graphics,
    pts: [number, number][],
    cam: Camera,
    dash: number,
    gap: number,
    width: number,
    color: number,
    alpha: number,
  ) {
    let on = true;
    let remain = dash;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = cam.worldToScreen(pts[i][0], pts[i][1]);
      const [bx, by] = cam.worldToScreen(pts[i + 1][0], pts[i + 1][1]);
      let x = ax;
      let y = ay;
      let dx = bx - ax;
      let dy = by - ay;
      let len = Math.hypot(dx, dy);
      if (len < 0.4) continue;
      dx /= len;
      dy /= len;
      while (len > 0.4) {
        const take = Math.min(remain, len);
        if (on) {
          g.moveTo(x, y);
          g.lineTo(x + dx * take, y + dy * take);
          g.stroke({ width, color, alpha, pixelLine: true });
        }
        x += dx * take;
        y += dy * take;
        len -= take;
        remain -= take;
        if (remain <= 0.01) {
          on = !on;
          remain = on ? dash : gap;
        }
      }
    }
  }

  private drawRoutes(cam: Camera, on: boolean) {
    const g = this.routesG;
    g.clear();
    if (!on) return;
    const across = cam.milesAcross;
    const close = across < 70;
    const mid = across < 220;
    const play = this.store.state.ui.inGame && !this.store.state.ui.menu;
    const labelOn = play && across < 380;
    const ink = hex(C.ink);
    const parch = hex(C.parchment);

    for (const route of this.store.state.routes) {
      const pts = this.ptsOf(route);
      if (pts.length < 2) continue;
      const grade = route.grade ?? (route.kind === 'road' ? 'highway' : undefined);
      if (grade === 'track' && across > 360) continue;
      const col = OWNER_COL[route.owner];
      if (route.kind === 'road') {
        const w = grade === 'king' ? 2.4 : grade === 'track' ? 1 : 1.5;
        const dash = grade === 'king' ? 3.5 : 2;
        const gap = grade === 'king' ? 3.5 : 4;
        this.strokeDashed(g, pts, cam, dash, gap, w, col, grade === 'track' ? 0.4 : 0.62);
        if (close && grade !== 'track') this.drawMilestones(cam, pts);
      } else if (route.kind === 'river') {
        this.strokeDashed(g, pts, cam, 5, 4, 1.6, hexNum(C.woadMid), 0.7);
      } else {
        const traffic = this.store.state.layers.overlay === 'trade'
          ? this.store.state.assets.ships.filter((s) => s.route === route.id).length
          : 0;
        const fade = across > 500 ? 0.28 : across > 280 ? 0.5 : 0.78;
        const thick = 2 + (this.store.state.layers.overlay === 'trade' ? Math.min(3, traffic) : 0);
        const danger = this.store.state.layers.overlay === 'danger' && (route.hazard === 'pirates' || route.danger >= 0.5);
        this.strokeDashed(g, pts, cam, 9, 7, danger ? thick + 1 : thick, danger ? hexNum(C.madder) : col, danger ? 0.95 : fade);
      }

      const midp = along(pts, 0.48);
      const [mx, my] = cam.worldToScreen(midp.x, midp.y);
      if (mx < -40 || my < -40 || mx > cam.viewW + 40 || my > cam.viewH + 40) continue;
      const len = Math.hypot(midp.dx, midp.dy) || 1;
      const ox = (-midp.dy / len) * (10 + (route.id.length % 7));
      const oy = (midp.dx / len) * (10 + (route.id.length % 7));
      const lx = mx + ox;
      const ly = my + oy;

      if (play && across < 300) {
        if (route.hazard === 'pirates' || route.danger >= 0.5) {
          const s = this.mark(`hz-${route.id}`, this.texOf('skull', iconCanvas('skull')), lx - 10, ly - 12, 1);
          s.alpha = 0.9;
        } else if (route.hazard === 'weather') {
          const s = this.mark(`hz-${route.id}`, this.texOf('storm', iconCanvas('storm')), lx - 10, ly - 12, 1);
          s.alpha = 0.85;
        }
        const flagTex = route.owner === 'player' ? this.texOf('ashby', ashbyArmsCanvas()) : this.texOf('flag', iconCanvas('flag'));
        const fl = this.mark(`fl-${route.id}`, flagTex, lx + 8, ly - 10, route.owner === 'player' ? 1 : 0.9);
        if (route.owner !== 'player') fl.tint = col;
      }

      if (play && across < 150 && (route.kind === 'sea' || route.kind === 'river') && (route.hazard === 'customs' || route.owner === 'crown' || route.owner === 'player')) {
        const a = cam.worldToScreen(pts[0][0], pts[0][1]);
        const b = cam.worldToScreen(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        this.mark(`tw0-${route.id}`, this.texOf('tower', iconCanvas('tower')), a[0], a[1] - 10, 0.85);
        this.mark(`tw1-${route.id}`, this.texOf('tower', iconCanvas('tower')), b[0], b[1] - 10, 0.85);
      }

      if (labelOn && route.kind !== 'road' && (route.kind === 'sea' || mid)) {
        const miles = Math.round(routeMiles(route));
        const days = travelDays(route);
        const nameTex = this.texOf(`lb-${route.id}`, labelSprite(route.name, ink, parch));
        const lab = this.mark(`lb-${route.id}`, nameTex, lx, ly + 6, 1, 0.5, 0);
        lab.alpha = across > 280 ? 0.55 : 0.9;
        if (across < 220) {
          const meta = this.texOf(`lm-${route.id}`, labelSprite(`${miles} MI / ${days}D`, ink, parch));
          const m = this.mark(`lm-${route.id}`, meta, lx, ly + 16, 1, 0.5, 0);
          m.alpha = lab.alpha;
        }
      }
    }
  }

  private drawMilestones(cam: Camera, pts: [number, number][]) {
    const g = this.routesG;
    const stone = hexNum(C.stone);
    const ink = hexNum(C.ink);
    const step = 14;
    let acc = 0;
    let n = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      let used = 0;
      while (acc + d - used >= step && n < 12) {
        const u = (step - acc) / d;
        const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * (used / d + u);
        const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (used / d + u);
        const [sx, sy] = cam.worldToScreen(x, y);
        g.rect(sx - 1, sy - 3, 2, 4).fill({ color: stone, alpha: 0.9 });
        g.rect(sx - 1, sy - 4, 2, 1).fill({ color: ink, alpha: 0.5 });
        used += step - acc;
        acc = 0;
        n++;
      }
      acc = (acc + d - used) % step;
    }
  }

  private drawShips(cam: Camera, on: boolean) {
    this.shipScreen.length = 0;
    this.wakesG.clear();
    if (!on) {
      this.ships.visible = false;
      return;
    }
    this.ships.visible = true;
    const seen = new Set<string>();
    const reduced = this.store.state.settings.reduceMotion;
    const art = Math.max(1, Math.min(3, Math.round(0.6 + cam.zoom / 6)));
    const routes = new Map(this.store.state.routes.map((r) => [r.id, r]));
    const wake = hexNum(C.foam);
    const warnTex = this.texOf('warn', iconCanvas('warn'));
    const baleTex = this.texOf('bale', baleCanvas());

    for (const sh of this.store.state.assets.ships) {
      seen.add(sh.id);
      const route = routes.get(sh.route);
      if (!route) continue;
      const pts = this.ptsOf(route);
      const pos = along(pts, sh.progress);
      const [sx0, sy0] = cam.worldToScreen(pos.x, pos.y);
      const sea = !isLandVessel(sh.kind);
      const bob = sea && !reduced && sh.hold <= 0 ? Math.sin(this.t * 2.3 + pos.x * 0.05) * 1.3 : 0;
      const sx = sx0;
      const sy = sy0 + bob;
      this.shipScreen.push({ id: sh.id, x: pos.x, y: pos.y, sx, sy, sea });
      const liv = liveryOf(sh.owner);
      const flutter = reduced || !sea ? 0 : Math.sin(this.t * 8 + pos.y) > 0 ? 1 : 0;
      const tex = this.texOf(`v-${sh.kind}-${liv}-${flutter}`, vesselCanvas(sh.kind, liv, flutter));
      let spr = this.sprites.get(sh.id);
      if (!spr) {
        spr = new Sprite(tex);
        spr.anchor.set(0.5, 0.85);
        spr.roundPixels = true;
        this.ships.addChild(spr);
        this.sprites.set(sh.id, spr);
      }
      spr.texture = tex;
      spr.visible = sx > -50 && sy > -50 && sx < cam.viewW + 50 && sy < cam.viewH + 50;
      spr.x = Math.round(sx);
      spr.y = Math.round(sy);
      const flip = pos.dx < 0 ? -1 : 1;
      spr.scale.set(art * flip, art);
      spr.alpha = sh.owner === 'player' ? 1 : 0.94;

      if (sea && sh.hold <= 0 && spr.visible && cam.milesAcross < 200) {
        const ux = pos.dx / (Math.hypot(pos.dx, pos.dy) || 1);
        const uy = pos.dy / (Math.hypot(pos.dx, pos.dy) || 1);
        for (let i = 1; i <= 3; i++) {
          const [wx, wy] = cam.worldToScreen(pos.x - ux * i * 2.2, pos.y - uy * i * 2.2);
          this.wakesG.moveTo(wx - 3 + i, wy + 2);
          this.wakesG.lineTo(wx + 3 - i, wy + 2);
          this.wakesG.stroke({ width: 1, color: wake, alpha: 0.28 / i, pixelLine: true });
        }
      }

      if (sh.hold > 0 && spr.visible && cam.milesAcross < 120) {
        const u = 1 - sh.hold / 80;
        for (let i = 0; i < 3; i++) {
          const bx = sx + flip * (8 + u * 14) + (i - 1) * 5;
          const by = sy + 2 + Math.sin(this.t * 6 + i) * (reduced ? 0 : 1.5) - u * 6;
          const b = this.mark(`bale-${sh.id}-${i}`, baleTex, bx, by, art);
          b.alpha = 0.85;
        }
      }

      if (sh.incident && spr.visible) {
        const pulse = reduced ? 1 : 0.75 + 0.25 * Math.sin(this.t * 5);
        const mk = this.mark(`inc-${sh.id}`, warnTex, sx, sy - 16, 1.1 * pulse);
        mk.tint = hexNum(C.madder);
      }
    }
    for (const [id, spr] of this.sprites) {
      if (!seen.has(id)) {
        spr.destroy();
        this.sprites.delete(id);
      }
    }
  }

  private drawLife(cam: Camera, dt: number, shipsOn: boolean) {
    const g = this.lifeG;
    g.clear();
    const across = cam.milesAcross;
    const reduced = this.store.state.settings.reduceMotion;
    const cream = hexNum(C.cream);
    const stone = hexNum(C.stone);
    const umber = hexNum(C.umber);
    const parchment = hexNum(C.parchmentLight);

    if (shipsOn && across < 180) {
      const tex = this.texOf('v-coaster-plain-0', vesselCanvas('coaster', 'plain', 0));
      for (let i = 0; i < FISH.length; i++) {
        const f = FISH[i];
        if (!reduced) f.p += dt * 0.15;
        const x = f.x + Math.sin(f.p) * 6;
        const y = f.y + Math.cos(f.p * 0.7) * 3;
        const [sx, sy] = cam.worldToScreen(x, y);
        if (sx < -20 || sy < -20 || sx > cam.viewW + 20 || sy > cam.viewH + 20) continue;
        const spr = this.mark(`fish-${i}`, tex, sx, sy, 1, 0.5, 0.85);
        spr.scale.x = Math.cos(f.p) >= 0 ? 1 : -1;
        spr.alpha = 0.85;
      }
    }

    if (across < 90) {
      for (const fl of SHEEP) {
        const [sx, sy] = cam.worldToScreen(fl.x, fl.y);
        if (sx < -20 || sy < -20 || sx > cam.viewW + 20 || sy > cam.viewH + 20) continue;
        for (let i = 0; i < fl.n; i++) {
          const ox = (i % 3) * 4 + Math.sin(this.t * 0.4 + i + fl.x) * (reduced ? 0 : 1.5);
          const oy = Math.floor(i / 3) * 3 + Math.cos(this.t * 0.3 + i) * (reduced ? 0 : 1);
          g.rect(sx + ox, sy + oy, 2, 2).fill({ color: cream, alpha: 0.85 });
          g.rect(sx + ox + 2, sy + oy + 1, 1, 1).fill({ color: stone, alpha: 0.6 });
        }
      }
    }

    if (across < 55) {
      for (const t of SETTLEMENT_POINTS) {
        if (t.tier > 2 && t.kind !== 'port') continue;
        const [sx, sy] = cam.worldToScreen(t.x, t.y);
        if (sx < 0 || sy < 0 || sx > cam.viewW || sy > cam.viewH) continue;
        const busy = t.kind === 'city' || t.kind === 'port' || t.kind === 'cathedral' || t.tier === 1;
        if (busy) {
          const n = t.tier === 1 ? 10 : 6;
          for (let i = 0; i < n; i++) {
            const a = i * 2.4 + t.x;
            const r = 6 + (i % 4) * 3;
            const px = sx + Math.cos(a) * r;
            const py = sy + 4 + Math.sin(a * 1.3) * r * 0.4;
            g.rect(px, py, 1, 2).fill({ color: i % 2 ? umber : hexNum(C.woad), alpha: 0.7 });
          }
        }
        if (t.kind !== 'hamlet') {
          const rise = reduced ? 4 : (this.t * 8 + t.y) % 10;
          g.rect(sx + 3, sy - 8 - rise, 2, 2).fill({ color: parchment, alpha: 0.45 - rise * 0.03 });
          g.rect(sx + 4, sy - 11 - rise, 1, 2).fill({ color: stone, alpha: 0.25 });
        }
      }
    }
  }

  private drawLights(cam: Camera, grade: Grade, glow: number) {
    const g = this.lightsG;
    g.clear();
    if (glow < 0.04) return;
    const night = Math.max(grade.night, grade.golden * 0.55);
    if (night < 0.05) return;
    const reduced = this.store.state.settings.reduceMotion;
    const pulse = reduced ? 1 : 1 + 0.08 * Math.sin(this.t * 2.05);
    const a = night * (0.32 + glow * 1.05) * pulse;
    const ember = hexNum(C.emberLight);
    const saff = hexNum(C.saffronLight);
    const woad = hexNum(C.woadMid);
    const close = cam.milesAcross < 90;

    for (const t of SETTLEMENT_POINTS) {
      if (t.tier > 2 && cam.milesAcross > 280) continue;
      const [sx, sy] = cam.worldToScreen(t.x, t.y);
      if (sx < -40 || sy < -40 || sx > cam.viewW + 40 || sy > cam.viewH + 40) continue;
      const r = (t.tier === 1 ? 20 : t.tier === 2 ? 14 : 8) * (0.85 + night * 0.4);
      g.circle(sx, sy - 2, r).fill({ color: ember, alpha: a * 0.38 });
      g.circle(sx, sy - 2, r * 0.4).fill({ color: saff, alpha: a * 0.7 });
      if (t.kind === 'cathedral' && grade.golden + grade.night > 0.15) {
        g.ellipse(sx, sy - 12, r * 0.4, r * 1.05).fill({ color: woad, alpha: a * 0.4 });
        g.rect(sx - 1.5, sy - 16, 3, 10).fill({ color: saff, alpha: a * 0.7 });
      }
      if (close && (t.kind === 'port' || t.kind === 'city' || t.kind === 'cathedral')) {
        const n = t.tier === 1 ? 4 : 3;
        for (let i = 0; i < n; i++) {
          const ox = (i - (n - 1) / 2) * 5;
          g.rect(sx + ox - 1, sy - 6, 2, 3).fill({ color: saff, alpha: a * 0.65 });
        }
      }
      if (t.kind === 'port' && close) {
        g.circle(sx + 8, sy + 2, 3.5).fill({ color: ember, alpha: a * 0.45 });
      }
    }

    for (const sh of this.shipScreen) {
      if (!sh.sea) continue;
      if (sh.sx < -20 || sh.sy < -20 || sh.sx > cam.viewW + 20 || sh.sy > cam.viewH + 20) continue;
      g.circle(sh.sx, sh.sy - 6, 5).fill({ color: ember, alpha: a * 0.4 });
      g.circle(sh.sx, sh.sy - 6, 2).fill({ color: saff, alpha: a * 0.7 });
    }
  }

  private drawAtmos(cam: Camera, dt: number, grade: Grade, glow: number) {
    const g = this.atmosG;
    g.clear();
    if (glow < 0.04) return;
    const reduced = this.store.state.settings.reduceMotion;
    const close = cam.milesAcross < 55;
    const mid = cam.milesAcross < 220;
    const fireflyOn = grade.night > 0.35 && close;
    const moteOn = grade.day > 0.45 && close && grade.night < 0.4;
    const saff = hexNum(C.saffronLight);
    const moss = hexNum(C.sageLight);
    const cream = hexNum(C.cream);

    if (moteOn) {
      for (const m of this.motes) {
        if (!reduced) {
          m.x += dt * 0.015 * m.z;
          m.y += dt * 0.008 * Math.sin(this.t * 0.4 + m.z);
          if (m.x > 1.05) m.x -= 1.1;
        }
        const x = m.x * cam.viewW;
        const y = m.y * cam.viewH;
        g.rect(x, y, 1, 1).fill({ color: cream, alpha: 0.18 * glow * m.z });
      }
    }

    if (fireflyOn) {
      for (const f of this.fireflies) {
        if (!reduced) {
          f.p += dt;
          f.x += Math.sin(f.p * 0.7) * dt * 1.4;
          f.y += Math.cos(f.p * 0.55) * dt * 1.1;
        }
        const [sx, sy] = cam.worldToScreen(f.x, f.y);
        if (sx < 0 || sy < 0 || sx > cam.viewW || sy > cam.viewH) continue;
        if (this.world.land(f.x, f.y) < 0) continue;
        const tw = reduced ? 0.7 : 0.35 + 0.65 * Math.max(0, Math.sin(f.p * 3.1));
        g.circle(sx, sy, 2.2).fill({ color: moss, alpha: 0.22 * glow * tw });
        g.rect(sx, sy, 1, 1).fill({ color: saff, alpha: 0.7 * glow * tw });
      }
    }

    if (grade.golden > 0.12 && mid) {
      const [sx, sy] = cam.worldToScreen(360, 430);
      const a = grade.golden * glow * 0.08;
      g.ellipse(sx, sy - 40, 90, 28).fill({ color: hexNum(C.ember), alpha: a });
      g.rect(sx - 6, sy - 120, 12, 160).fill({ color: hexNum(C.saffron), alpha: a * 0.45 });
    }

    if (mid && grade.night < 0.7) {
      for (const bird of this.gulls) {
        if (!reduced) {
          bird.x += bird.vx * dt * 2.4;
          bird.phase += dt * 8;
          if (bird.x > 520) bird.x = 250;
        }
        const [sx, sy] = cam.worldToScreen(bird.x, bird.y + Math.sin(bird.phase * 0.15) * 2);
        if (sx < -10 || sy < -10 || sx > cam.viewW + 10 || sy > cam.viewH + 10) continue;
        const flap = Math.sin(bird.phase) * 2;
        g.moveTo(sx, sy);
        g.lineTo(sx - 5, sy + 1 + flap);
        g.moveTo(sx, sy);
        g.lineTo(sx + 5, sy + 1 + flap);
        g.stroke({ width: 1, color: cream, alpha: 0.55 * glow, pixelLine: true });
      }
    }
  }

  private drawWeather(cam: Camera, dt: number, on: boolean, amount = 1) {
    const g = this.weatherG;
    g.clear();
    if (!on) return;
    const w = this.store.state.weather;
    const reduced = this.store.state.settings.reduceMotion;
    this.drawChannelFog(cam, (w.kind === 'fog' ? 0.22 + w.intensity * 0.22 : 0.08 + Math.sin(this.t * 0.07) * 0.02) * amount);

    if (w.kind !== 'rain' && w.kind !== 'storm' && w.kind !== 'snow') return;
    const col = w.kind === 'snow' ? hexNum(C.cream) : hexNum(C.foam);
    const wind = (w.windDir - 180) * (Math.PI / 180);
    const wx = Math.sin(wind) * (0.04 + w.wind * 0.08);
    const speed = (w.kind === 'storm' ? 1.6 : w.kind === 'snow' ? 0.35 : 1) * (reduced ? 0 : 1);
    const seaOnly = w.kind === 'storm';
    for (const d of this.rain) {
      d.x += wx * d.v * dt * 8;
      d.y += d.v * speed * dt * (w.kind === 'snow' ? 0.25 : 0.9);
      if (d.y > 1.05) {
        d.y = -0.05;
        d.x = Math.random();
      }
      if (d.x < -0.05) d.x += 1.1;
      if (d.x > 1.05) d.x -= 1.1;
      const x = d.x * cam.viewW;
      const y = d.y * cam.viewH;
      if (seaOnly) {
        const [mx, my] = cam.screenToWorld(x, y);
        if (this.world.land(mx, my) >= 0) continue;
      }
      if (w.kind === 'snow') g.rect(x, y, 2, 2).fill({ color: col, alpha: 0.7 });
      else {
        g.moveTo(x, y);
        g.lineTo(x + wx * 120, y + d.l * (w.kind === 'storm' ? 1.6 : 1));
        g.stroke({ width: 1, color: col, alpha: (0.35 + w.intensity * 0.35) * amount, pixelLine: true });
      }
    }
  }

  /** Soft fog banks sitting on the Narrow Sea — visual only, a mock schedule. */
  private drawChannelFog(cam: Camera, alpha: number) {
    if (alpha < 0.02) return;
    const g = this.weatherG;
    const t = this.t;
    const banks: [number, number, number, number][] = [
      [360 + Math.sin(t * 0.05) * 12, 430, 80, 24],
      [430 + Math.cos(t * 0.04) * 10, 405, 55, 18],
      [300 + Math.sin(t * 0.03 + 1) * 8, 455, 48, 16],
      [250, 500 + Math.sin(t * 0.06) * 6, 40, 14],
    ];
    for (const [wx, wy, rx, ry] of banks) {
      const [sx, sy] = cam.worldToScreen(wx, wy);
      const zx = rx * cam.zoom;
      const zy = ry * cam.zoom;
      g.ellipse(sx, sy, zx, zy).fill({ color: hexNum(C.stoneLight), alpha });
    }
  }
}

export function shipById(store: Store, id: string): Ship | undefined {
  return store.state.assets.ships.find((s) => s.id === id);
}

export function shipTip(store: Store, id: string) {
  const sh = shipById(store, id);
  if (!sh) return { title: 'A vessel', desc: 'Gone from the book.' };
  const route = store.state.routes.find((r) => r.id === sh.route);
  const cargo = Object.entries(sh.cargo)
    .filter(([, n]) => n)
    .map(([g, n]) => `${g} ${n}`)
    .join(' · ');
  const dest = route ? destName(route, sh.dir) : '—';
  const eta = route ? etaText(remainingDays(sh), sh.hold > 0) : '—';
  const owner = sh.owner === 'player' ? 'House of Ashby' : sh.owner;
  const effects: { text: string; tone: 'gold' | 'profit' | 'heat' | 'neutral' | 'loss' }[] = [
    { text: cargo ? `Hold: ${cargo}` : 'Riding light', tone: cargo ? 'gold' : 'neutral' },
    { text: sh.hold > 0 ? `At dock · ${dest}` : `For ${dest} · ${eta}`, tone: 'neutral' },
    { text: `Morale ${Math.round(sh.morale)} · hull ${Math.round(sh.hull)}`, tone: sh.hull < 40 ? 'loss' : 'profit' },
  ];
  if (sh.incident) effects.unshift({ text: sh.incident === 'pirates' ? 'Marked: no colours flying' : 'Marked: customs boat', tone: 'heat' });
  return {
    title: sh.name,
    desc: `${owner} · ${sh.captain} · ${sh.kind}`,
    effects,
  };
}
