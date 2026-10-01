import type { GameState } from './types';

type Sub = { sel: (s: GameState) => unknown; cb: (v: any, prev: any) => void; last: string | undefined; lastV: unknown };

/**
 * The one central game-state store. All UI and renderers read from it; nothing else holds game data.
 *
 *   store.update(s => { s.money.pence += 240 })        mutate in place, subscribers notified next frame
 *   store.select(s => s.money.pence, (v, prev) => ...) called whenever the selected slice changes
 *
 * Change detection serialises each selected slice, which is cheap for UI-sized slices and means
 * mutations never need to be written immutably. A real simulation can replace the drift ticker and
 * keep calling `update`.
 */
export class Store {
  private subs = new Set<Sub>();
  private pending = false;
  private flushing = false;

  constructor(readonly state: GameState) {}

  get(): GameState {
    return this.state;
  }

  update(fn: (s: GameState) => void) {
    fn(this.state);
    this.schedule();
  }

  select<T>(sel: (s: GameState) => T, cb: (v: T, prev: T | undefined) => void, immediate = true): () => void {
    const v = sel(this.state);
    const sub: Sub = { sel, cb, last: key(v), lastV: v };
    this.subs.add(sub);
    if (immediate) cb(v, undefined);
    return () => this.subs.delete(sub);
  }

  private schedule() {
    if (this.pending) return;
    this.pending = true;
    queueMicrotask(() => this.flush());
  }

  flush() {
    this.pending = false;
    if (this.flushing) return;
    this.flushing = true;
    try {
      for (const sub of [...this.subs]) {
        const v = sub.sel(this.state);
        const k = key(v);
        if (k === sub.last) continue;
        const prev = sub.lastV;
        sub.last = k;
        sub.lastV = typeof v === 'object' && v !== null ? JSON.parse(k) : v;
        sub.cb(v, prev);
      }
    } finally {
      this.flushing = false;
    }
  }
}

function key(v: unknown): string {
  return typeof v === 'string' ? 's' + v : JSON.stringify(v) ?? 'u';
}
