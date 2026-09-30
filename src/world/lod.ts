/** Chunk edge length in texels. */
export const CHUNK = 128;
/** Coarsest / finest level of detail. LOD k has texels of 2^(1-k) miles. */
export const KMIN = -1;
export const KMAX = 7;

export function texelMiles(k: number): number {
  return Math.pow(2, 1 - k);
}

export function chunkMiles(k: number): number {
  return CHUNK * texelMiles(k);
}

export function chunkKey(k: number, cx: number, cy: number): string {
  return `${k}:${cx}:${cy}`;
}
