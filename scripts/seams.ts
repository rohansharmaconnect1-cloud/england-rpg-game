/** Checks chunk generation is independent of chunk boundaries: `npx tsx scripts/seams.ts` */
import fs from 'node:fs';
import { TerrainGenerator, debugFlags } from '../src/world/terrain';
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
const places: [string, number, number][] = [['Dover', 1.25, 51.16], ['London', -0.1, 51.5], ['Lakes', -3.0, 54.45]];
for (const [name, lon, lat] of places) {
  for (const k of [3, 5, 6]) {
    const [x, y] = project(lon, lat);
    const cm = chunkMiles(k);
    const cx = Math.floor(x / cm);
    const cy = Math.floor(y / cm);
    debugFlags.noCull = false;
    const a = gen.generate(k, cx, cy);
    debugFlags.noCull = true;
    const b = gen.generate(k, cx, cy);
    let diff = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
    console.log(`${name} k=${k} chunk ${cx},${cy}: ${diff} bytes differ with culling off`);
  }
}
