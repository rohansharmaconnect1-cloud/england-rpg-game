/** Generates a few chunks in Node to check speed and determinism: `npx tsx scripts/bench.ts`. */
import fs from 'node:fs';
import { TerrainGenerator } from '../src/world/terrain';
import { WorldData } from '../src/world/worldData';
import { chunkMiles } from '../src/world/lod';
import { project } from '../src/world/projection';

const buf = (f: string) => {
  const b = fs.readFileSync('public/data/' + f);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const world = new WorldData({
  meta: JSON.parse(fs.readFileSync('public/data/meta.json', 'utf8')),
  landSdf: buf('land_sdf.bin'),
  engSdf: buf('eng_sdf.bin'),
  region: buf('region.bin'),
  rivers: JSON.parse(fs.readFileSync('public/data/rivers.json', 'utf8')),
});
const gen = new TerrainGenerator(world);
const [lx, ly] = project(-0.1, 51.51);
for (const k of [-1, 0, 2, 4, 6, 7]) {
  const cm = chunkMiles(k);
  const cx = Math.floor(lx / cm);
  const cy = Math.floor(ly / cm);
  const t0 = performance.now();
  const a = gen.generate(k, cx, cy);
  const ms = performance.now() - t0;
  const b = gen.generate(k, cx, cy);
  const same = a.every((v, i) => v === b[i]);
  const mats = new Map<number, number>();
  for (let i = 1; i < a.length; i += 4) mats.set(a[i], (mats.get(a[i]) ?? 0) + 1);
  console.log(`k=${k} ${ms.toFixed(1)}ms deterministic=${same} mats=${JSON.stringify([...mats].sort((p, q) => q[1] - p[1]).slice(0, 6))}`);
}
