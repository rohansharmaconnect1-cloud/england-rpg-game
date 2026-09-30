/// <reference lib="webworker" />
import { TerrainGenerator } from '../world/terrain';
import { WorldData, type RawWorld } from '../world/worldData';

export type WorkerIn =
  | { type: 'init'; raw: RawWorld }
  | { type: 'gen'; key: string; k: number; cx: number; cy: number };

export type WorkerOut =
  | { type: 'ready' }
  | { type: 'chunk'; key: string; data: Uint8Array; ms: number };

let gen: TerrainGenerator | null = null;
const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    gen = new TerrainGenerator(new WorldData(msg.raw));
    ctx.postMessage({ type: 'ready' } satisfies WorkerOut);
    return;
  }
  if (!gen) return;
  const t0 = performance.now();
  const data = gen.generate(msg.k, msg.cx, msg.cy);
  const out: WorkerOut = { type: 'chunk', key: msg.key, data, ms: performance.now() - t0 };
  ctx.postMessage(out, [data.buffer]);
};
