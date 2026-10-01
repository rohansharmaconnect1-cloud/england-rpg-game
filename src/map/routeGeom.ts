import { project } from '../world/projection';
import { SETTLEMENT_BY_ID } from '../world/settlements';
import type { Route, Ship } from '../state/types';

export function worldPts(route: Route): [number, number][] {
  return route.pts.map(([lon, lat]) => project(lon, lat) as [number, number]);
}

export function polylineLength(pts: [number, number][]): number {
  let n = 0;
  for (let i = 0; i < pts.length - 1; i++) n += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return n;
}

const milesCache = new Map<string, number>();
export function routeMiles(route: Route): number {
  let m = milesCache.get(route.id);
  if (m == null) {
    m = polylineLength(worldPts(route));
    milesCache.set(route.id, m);
  }
  return m;
}

/** Typical medieval day-lengths, used only for the label. */
export function travelDays(route: Route): number {
  const per = route.kind === 'sea' ? 75 : route.kind === 'river' ? 38 : 22;
  return Math.max(1, Math.round(routeMiles(route) / per));
}

export function along(pts: [number, number][], t: number): { x: number; y: number; dx: number; dy: number } {
  const n = pts.length;
  if (n === 0) return { x: 0, y: 0, dx: 1, dy: 0 };
  if (n === 1) return { x: pts[0][0], y: pts[0][1], dx: 1, dy: 0 };
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < n - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(d);
    total += d;
  }
  let d = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const u = lens[i] > 0 ? Math.min(1, d / lens[i]) : 0;
      const dx = pts[i + 1][0] - pts[i][0];
      const dy = pts[i + 1][1] - pts[i][1];
      return { x: pts[i][0] + dx * u, y: pts[i][1] + dy * u, dx, dy };
    }
    d -= lens[i];
  }
  const last = pts[n - 1];
  return { x: last[0], y: last[1], dx: 1, dy: 0 };
}

export function destId(route: Route, dir: 1 | -1): string {
  return dir === 1 ? route.to : route.from;
}

export function destName(route: Route, dir: 1 | -1): string {
  const id = destId(route, dir);
  return SETTLEMENT_BY_ID.get(id)?.name ?? id;
}

export function remainingDays(sh: Ship): number {
  if (sh.hold > 0) return 0;
  const left = sh.dir === 1 ? 1 - sh.progress : sh.progress;
  return left / Math.max(0.08, sh.speed);
}

export function etaText(days: number, holding: boolean): string {
  if (holding) return 'unloading';
  if (days < 0.12) return 'before nightfall';
  if (days < 0.55) return 'on the morrow';
  if (days < 1.4) return 'a day hence';
  return `${Math.max(2, Math.round(days))} days`;
}

export function isLandVessel(kind: Ship['kind']): boolean {
  return kind === 'cart' || kind === 'horse';
}
