import { CHUNK, KMIN } from '../world/lod';
import type { RawWorld } from '../world/worldData';
import type { WorkerIn, WorkerOut } from '../workers/chunkWorker';
import { createTexture } from './gl';

export interface ChunkReq {
  key: string;
  k: number;
  cx: number;
  cy: number;
}

interface Entry {
  tex: WebGLTexture;
  k: number;
  lastUsed: number;
}

const MAX_CHUNKS = 900;
const PER_WORKER = 2;
const UPLOADS_PER_FRAME = 16;

/**
 * GPU cache of generated chunk textures, fed by a pool of generator workers.
 * Each frame the renderer submits the chunks it wants in priority order.
 */
export class ChunkCache {
  private entries = new Map<string, Entry>();
  private inflight = new Set<string>();
  private queue: ChunkReq[] = [];
  private arrived: { key: string; data: Uint8Array }[] = [];
  private workers: { w: Worker; busy: number; ready: boolean }[] = [];
  private frame = 0;
  genMs = 0;
  generated = 0;

  constructor(private readonly gl: WebGL2RenderingContext, raw: RawWorld) {
    const n = Math.min(6, Math.max(2, (navigator.hardwareConcurrency || 4) - 1));
    for (let i = 0; i < n; i++) {
      const w = new Worker(new URL('../workers/chunkWorker.ts', import.meta.url), { type: 'module' });
      const slot = { w, busy: 0, ready: false };
      w.onmessage = (e: MessageEvent<WorkerOut>) => {
        const m = e.data;
        if (m.type === 'ready') {
          slot.ready = true;
          return;
        }
        slot.busy--;
        this.inflight.delete(m.key);
        this.arrived.push({ key: m.key, data: m.data });
        this.genMs = this.genMs * 0.9 + m.ms * 0.1;
        this.generated++;
      };
      const init: WorkerIn = { type: 'init', raw };
      w.postMessage(init);
      this.workers.push(slot);
    }
  }

  get size() {
    return this.entries.size;
  }

  get pending() {
    return this.inflight.size + this.queue.length;
  }

  get(key: string): WebGLTexture | undefined {
    const e = this.entries.get(key);
    if (e) e.lastUsed = this.frame;
    return e?.tex;
  }

  has(key: string) {
    return this.entries.has(key);
  }

  /** Replace the wish list (highest priority first). Chunks already cached or in flight are skipped. */
  want(reqs: ChunkReq[]) {
    this.queue = reqs.filter((r) => !this.entries.has(r.key) && !this.inflight.has(r.key));
  }

  /** Upload finished chunks, dispatch queued work, evict old textures. Call once per frame. */
  update() {
    this.frame++;
    const gl = this.gl;
    for (let i = 0; i < UPLOADS_PER_FRAME && this.arrived.length; i++) {
      const { key, data } = this.arrived.shift()!;
      if (this.entries.has(key)) continue;
      const k = Number(key.split(':')[0]);
      this.entries.set(key, { tex: createTexture(gl, CHUNK, CHUNK, data), k, lastUsed: this.frame });
    }
    let qi = 0;
    for (const slot of this.workers) {
      while (slot.ready && slot.busy < PER_WORKER && qi < this.queue.length) {
        const r = this.queue[qi++];
        if (this.inflight.has(r.key) || this.entries.has(r.key)) continue;
        this.inflight.add(r.key);
        slot.busy++;
        const msg: WorkerIn = { type: 'gen', key: r.key, k: r.k, cx: r.cx, cy: r.cy };
        slot.w.postMessage(msg);
      }
    }
    this.queue = this.queue.slice(qi);
    if (this.entries.size > MAX_CHUNKS) {
      const old = [...this.entries.entries()]
        .filter(([, e]) => e.k > KMIN + 1 && e.lastUsed < this.frame - 2)
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      for (let i = 0; i < old.length && this.entries.size > MAX_CHUNKS * 0.85; i++) {
        gl.deleteTexture(old[i][1].tex);
        this.entries.delete(old[i][0]);
      }
    }
  }
}
