/** Debug: print a chunk's materials as ASCII. `npx tsx scripts/ascii.ts <k> <lon> <lat>` */
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
const [k, lon, lat] = process.argv.slice(2).map(Number);
const [x, y] = project(lon, lat);
const cm = chunkMiles(k);
const d = new TerrainGenerator(world).generate(k, Math.floor(x / cm), Math.floor(y / cm));
const ch = '~-=.,gGbF%mrH|p?';
for (let j = 0; j < 128; j += 2) {
  let s = '';
  for (let i = 0; i < 128; i++) s += ch[d[(j * 128 + i) * 4 + 1] & 15];
  console.log(s);
}
