import type { Camera } from '../camera/camera';
import { CHUNK, KMAX, KMIN, chunkKey, chunkMiles, texelMiles } from '../world/lod';
import { MATERIAL_COUNT, TONES } from '../world/materials';
import type { RawWorld } from '../world/worldData';
import { ChunkCache, type ChunkReq } from './chunkCache';
import { compileProgram, createTarget, createTexture, deleteTarget, uniforms, type Target } from './gl';
import { buildPalette } from './palette';
import { CHUNK_FS, CHUNK_VS, COLOR_FS, FULLSCREEN_VS, PRESENT_FS, FX, type FxName } from './shaders';

export interface FrameInfo {
  k: number;
  texelMiles: number;
  /** Screen CSS pixels per art pixel this frame. */
  artPixel: number;
  visible: number;
  missing: number;
}

/**
 * Pipeline per frame:
 *   1. data pass    chunk textures -> low-res data buffer, 1 texel = 1 art pixel, world-aligned
 *   2. colour pass  data buffer -> palette colours with effects (per art pixel)
 *   3. present      sharp-bilinear upscale to the screen with the camera's sub-texel offset
 */
export class MapRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly cache: ChunkCache;
  /** Minimum on-screen size of one art pixel, in CSS pixels. */
  pixelScale = 3;
  effects: Record<FxName, boolean> = { hillshade: true, water: true, clouds: true, dither: true, vignette: true };
  shadersOn = true;
  info: FrameInfo = { k: 0, texelMiles: 0, artPixel: 0, visible: 0, missing: 0 };

  private chunkProg: WebGLProgram;
  private colorProg: WebGLProgram;
  private presentProg: WebGLProgram;
  private uChunk: Record<string, WebGLUniformLocation>;
  private uColor: Record<string, WebGLUniformLocation>;
  private uPresent: Record<string, WebGLUniformLocation>;
  private quad: WebGLVertexArrayObject;
  private emptyVao: WebGLVertexArrayObject;
  private palette: WebGLTexture;
  private dataT: Target | null = null;
  private colorT: Target | null = null;
  private cloud = [0, 0];

  constructor(readonly canvas: HTMLCanvasElement, raw: RawWorld, private readonly worldW: number, private readonly worldH: number) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 is required');
    this.gl = gl;
    this.chunkProg = compileProgram(gl, CHUNK_VS, CHUNK_FS);
    this.colorProg = compileProgram(gl, FULLSCREEN_VS, COLOR_FS);
    this.presentProg = compileProgram(gl, FULLSCREEN_VS, PRESENT_FS);
    this.uChunk = uniforms(gl, this.chunkProg);
    this.uColor = uniforms(gl, this.colorProg);
    this.uPresent = uniforms(gl, this.presentProg);

    this.quad = gl.createVertexArray()!;
    gl.bindVertexArray(this.quad);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.chunkProg, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.emptyVao = gl.createVertexArray()!;
    gl.bindVertexArray(null);

    this.palette = createTexture(gl, TONES, MATERIAL_COUNT, buildPalette());
    this.cache = new ChunkCache(gl, raw);
  }

  private flags(): number {
    if (!this.shadersOn) return 0;
    let f = 0;
    for (const [name, on] of Object.entries(this.effects)) if (on) f |= FX[name as FxName];
    return f;
  }

  private ensureTargets(w: number, h: number) {
    const gl = this.gl;
    if (this.dataT && this.dataT.w >= w && this.dataT.h >= h) return;
    const aw = Math.max(w, this.dataT?.w ?? 0);
    const ah = Math.max(h, this.dataT?.h ?? 0);
    if (this.dataT) deleteTarget(gl, this.dataT);
    if (this.colorT) deleteTarget(gl, this.colorT);
    this.dataT = createTarget(gl, aw, ah, gl.NEAREST);
    this.colorT = createTarget(gl, aw, ah, gl.LINEAR);
  }

  render(cam: Camera, time: number, dt: number) {
    const gl = this.gl;
    const dpr = window.devicePixelRatio || 1;
    const Wp = this.canvas.width;
    const Hp = this.canvas.height;
    const Zp = cam.zoom * (Wp / cam.viewW);
    const P = this.pixelScale * dpr;

    const k = Math.max(KMIN, Math.min(KMAX, Math.floor(1 + Math.log2(Zp / P))));
    const t = texelMiles(k);
    const s = Zp * t;
    const left = cam.cx - cam.viewW / (2 * cam.zoom);
    const top = cam.cy - cam.viewH / (2 * cam.zoom);
    const ox = Math.floor(left / t) - 1;
    const oy = Math.floor(top / t) - 1;
    const bw = Math.ceil(Wp / s) + 3;
    const bh = Math.ceil(Hp / s) + 3;
    this.ensureTargets(bw, bh);
    const dataT = this.dataT!;
    const colorT = this.colorT!;

    // ---- Decide which chunks to draw / request -------------------------------
    const cm = chunkMiles(k);
    const nx = Math.ceil(this.worldW / cm);
    const ny = Math.ceil(this.worldH / cm);
    const i0 = Math.max(0, Math.floor(ox / CHUNK));
    const j0 = Math.max(0, Math.floor(oy / CHUNK));
    const i1 = Math.min(nx - 1, Math.floor((ox + bw - 1) / CHUNK));
    const j1 = Math.min(ny - 1, Math.floor((oy + bh - 1) / CHUNK));

    const draws: { key: string; m: number; a: number; b: number }[] = [];
    const fallback = new Map<string, { m: number; a: number; b: number }>();
    const want: ChunkReq[] = [];
    const parentWant = new Map<string, ChunkReq>();
    const ccx = (left + cam.viewW / (2 * cam.zoom)) / cm;
    const ccy = (top + cam.viewH / (2 * cam.zoom)) / cm;
    let missing = 0;

    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const key = chunkKey(k, i, j);
        if (this.cache.get(key)) {
          draws.push({ key, m: k, a: i, b: j });
          continue;
        }
        missing++;
        want.push({ key, k, cx: i, cy: j });
        for (let m = k - 1; m >= KMIN; m--) {
          const sh = k - m;
          const a = i >> sh;
          const b = j >> sh;
          const pk = chunkKey(m, a, b);
          if (m === k - 1 && !parentWant.has(pk)) parentWant.set(pk, { key: pk, k: m, cx: a, cy: b });
          if (this.cache.get(pk)) {
            fallback.set(pk, { m, a, b });
            break;
          }
        }
      }
    }
    want.sort((p, q) => Math.hypot(p.cx + 0.5 - ccx, p.cy + 0.5 - ccy) - Math.hypot(q.cx + 0.5 - ccx, q.cy + 0.5 - ccy));
    const base: ChunkReq[] = [];
    for (const m of [KMIN, KMIN + 1]) {
      const n = Math.ceil(this.worldW / chunkMiles(m));
      const nn = Math.ceil(this.worldH / chunkMiles(m));
      for (let b = 0; b < nn; b++) for (let a = 0; a < n; a++) base.push({ key: chunkKey(m, a, b), k: m, cx: a, cy: b });
    }
    this.cache.want([...base, ...want, ...parentWant.values()]);
    this.cache.update();
    this.info = { k, texelMiles: t, artPixel: s / dpr, visible: (i1 - i0 + 1) * (j1 - j0 + 1), missing };

    // ---- 1. Data pass ------------------------------------------------------
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dataT.fbo);
    gl.viewport(0, 0, bw, bh);
    gl.clearColor(0, 0, 3 / 255, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.chunkProg);
    gl.bindVertexArray(this.quad);
    gl.uniform2f(this.uChunk.u_buf, bw, bh);
    gl.uniform1i(this.uChunk.u_tex, 0);
    gl.activeTexture(gl.TEXTURE0);
    const drawChunk = (key: string, m: number, a: number, b: number) => {
      const tex = this.cache.get(key);
      if (!tex) return;
      const f = Math.pow(2, k - m);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform4f(this.uChunk.u_rect, a * CHUNK * f - ox, b * CHUNK * f - oy, CHUNK * f, CHUNK * f);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    [...fallback.entries()].sort((p, q) => p[1].m - q[1].m).forEach(([key, c]) => drawChunk(key, c.m, c.a, c.b));
    for (const d of draws) drawChunk(d.key, d.m, d.a, d.b);

    // ---- 2. Colour pass ----------------------------------------------------
    this.cloud[0] += (dt * 7) / cam.zoom;
    this.cloud[1] += (dt * 2.5) / cam.zoom;
    const offX = left / t - ox;
    const offY = top / t - oy;
    gl.bindFramebuffer(gl.FRAMEBUFFER, colorT.fbo);
    gl.viewport(0, 0, bw, bh);
    gl.useProgram(this.colorProg);
    gl.bindVertexArray(this.emptyVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dataT.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.palette);
    const u = this.uColor;
    gl.uniform1i(u.u_data, 0);
    gl.uniform1i(u.u_pal, 1);
    gl.uniform2f(u.u_origin, ox, oy);
    gl.uniform2i(u.u_size, bw, bh);
    gl.uniform1f(u.u_texel, t);
    gl.uniform1f(u.u_time, time);
    gl.uniform1i(u.u_flags, this.flags());
    gl.uniform2f(u.u_cloud, this.cloud[0], this.cloud[1]);
    gl.uniform1f(u.u_exag, 2.5 * Math.pow(t / 0.03125, 0.55));
    gl.uniform4f(u.u_vig, s / Wp, s / Hp, offX, offY);
    gl.uniform2f(u.u_world, this.worldW, this.worldH);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // ---- 3. Present --------------------------------------------------------
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, Wp, Hp);
    gl.useProgram(this.presentProg);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, colorT.tex);
    const up = this.uPresent;
    gl.uniform1i(up.u_color, 0);
    gl.uniform2f(up.u_colorSize, colorT.w, colorT.h);
    gl.uniform2f(up.u_off, offX, offY);
    gl.uniform1f(up.u_scale, s);
    gl.uniform2f(up.u_screen, Wp, Hp);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
