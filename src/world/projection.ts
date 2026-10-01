/**
 * World coordinates: 1 unit = 1 statute mile. +x east, +y south (screen-style).
 * Projection: sinusoidal about LON0, which keeps distances within ~1% across England.
 *
 * The board runs from southern Scotland to the Biscay coast at Bayonne, and from Ireland's
 * edge to the Scheldt — England, the Channel, Flanders, northern France and Gascony.
 */
export const MILES_PER_DEG = 69.09;
export const LON0 = -2.0;
export const LAT_TOP = 56.6;
export const LAT_BOTTOM = 43.15;
export const X_OFFSET = 295;

/** Full world rectangle in miles. */
export const WORLD_W = 640;
export const WORLD_H = (LAT_TOP - LAT_BOTTOM) * MILES_PER_DEG;

export function project(lon: number, lat: number): [number, number] {
  const x = (lon - LON0) * MILES_PER_DEG * Math.cos((lat * Math.PI) / 180) + X_OFFSET;
  const y = (LAT_TOP - lat) * MILES_PER_DEG;
  return [x, y];
}

export function unproject(x: number, y: number): [number, number] {
  const lat = LAT_TOP - y / MILES_PER_DEG;
  const lon = (x - X_OFFSET) / (MILES_PER_DEG * Math.cos((lat * Math.PI) / 180)) + LON0;
  return [lon, lat];
}
