import { SETTLEMENT_BY_ID } from '../world/settlements';
import type { Camera } from './camera';

const CYCLE = 96;

/**
 * Slow, input-free pan/zoom across England and the Channel. Call from the frame loop
 * while the title (or title-settings) is up.
 */
export function stepTitleDrift(cam: Camera, t: number, reduced: boolean) {
  const boston = SETTLEMENT_BY_ID.get('boston');
  const london = SETTLEMENT_BY_ID.get('london');
  const dover = SETTLEMENT_BY_ID.get('dover');
  const calais = SETTLEMENT_BY_ID.get('calais');
  const norwich = SETTLEMENT_BY_ID.get('norwich');
  const york = SETTLEMENT_BY_ID.get('york');
  if (!boston || !london || !dover || !calais || !norwich || !york) {
    cam.fitAll();
    return;
  }
  const zFit = cam.minZoom;
  if (reduced) {
    cam.lookAt((boston.x + london.x) * 0.5, (boston.y + dover.y) * 0.5, zFit * 1.35);
    return;
  }
  const pts: { x: number; y: number; z: number }[] = [
    { x: york.x, y: york.y, z: zFit * 1.55 },
    { x: boston.x + 12, y: boston.y + 6, z: zFit * 2.05 },
    { x: norwich.x, y: norwich.y + 8, z: zFit * 1.7 },
    { x: london.x + 8, y: london.y, z: zFit * 1.9 },
    { x: (dover.x + calais.x) * 0.5, y: (dover.y + calais.y) * 0.5, z: zFit * 2.35 },
    { x: london.x - 10, y: london.y - 18, z: zFit * 1.45 },
  ];
  const u = ((t / CYCLE) % 1 + 1) % 1;
  const n = pts.length;
  const f = u * n;
  const i = Math.floor(f) % n;
  const j = (i + 1) % n;
  const s = smooth(f - Math.floor(f));
  const a = pts[i];
  const b = pts[j];
  cam.lookAt(a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s, a.z + (b.z - a.z) * s);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}
