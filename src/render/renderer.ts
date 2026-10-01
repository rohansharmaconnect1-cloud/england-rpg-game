import type { Camera } from '../camera/camera';
import { CHUNK, KMAX, KMIN, chunkKey, chunkMiles, texelMiles } from '../world/lod';
import { MATERIAL_COUNT, TONES } from '../world/materials';
import type { RawWorld } from '../world/worldData';
import { ChunkCache, type ChunkReq } from './chunkCache';
import { compileProgram, createTarget, createTexture, deleteTarget, ensureTarget, packR8, updateTexture, uniforms, type Target } from './gl';
import { buildPalette, type MapSeason } from './palette';
import { C, rgb } from '../assets/palette';
import { BLUR_FS, CHUNK_FS, CHUNK_VS, COLOR_FS, EXTRACT_FS, FULLSCREEN_VS, POST_FS, PRESENT_FS, FX, type FxName } from './shaders';

export interface FrameInfo {
  k: number;
  texelMiles: number;
  /** Screen CSS pixels per art pixel this frame. */
  artPixel: number;
  /** 0..1 weight of the next finer LOD being faded in. */
  blend: number;
  visible: number;
  missing: number;
  /** 0 = grade only, 1 = bloom, 2 = bloom + tilt-shift. */
  quality: number;
}

/** Fraction of each LOD's zoom range (in log2 zoom) at the end where the finer LOD fades in. */
const BLEND_START = 0.45;

/** Per-LOD render state: the low-res data + colour buffers and how they map onto the screen. */
interface Level {
  dataT: Target | null;
  colorT: Target | null;
  offX: number;
  offY: number;
  scale: number;
}

interface LevelView {
  k: number;
  t: number;
  s: number;
  ox: number;
  oy: number;
  bw: number;
  bh: number;
  i0: number;
  j0: number;
  i1: number;
  j1: number;
}

/**
 * Pipeline per frame, for the current LOD and (while crossfading) the next finer one:
 *   1. data pass    chunk textures -> low-res data buffer, 1 texel = 1 art pixel, world-aligned
 *   2. colour pass  data buffer -> palette colours with effects (per art pixel)
 * then
 *   3. present      sharp-bilinear upscale to a full-res buffer (pixels stay chunky)
 *   4. post         bloom, tilt-shift, haze and clock grade at screen resolution
 */
export class MapRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly cache: ChunkCache;
  /** Minimum on-screen size of one art pixel, in CSS pixels. */
  pixelScale = 3;
  effects: Record<FxName, boolean> = { hillshade: true, water: true, clouds: true, dither: true, vignette: true };
  shadersOn = true;
  /** Crossfade between detail levels while zooming (instead of a hard switch). */
  lodBlend = true;
  /** HD-2D colour grade applied at present (day/night, weather). */
  grade: [number, number, number] = [1, 1, 1];
  lift: [number, number, number] = [0, 0, 0];
  regionsOn = true;
  fogOn = true;
  /** Master HD-2D post pass. */
  postOn = true;
  post = { glow: 0.22, dof: 0.16, vignette: 0.26, golden: 0, night: 0, reduceMotion: false };
  info: FrameInfo = { k: 0, texelMiles: 0, artPixel: 0, blend: 0, visible: 0, missing: 0, quality: 2 };

  private chunkProg: WebGLProgram;
  private colorProg: WebGLProgram;
  private presentProg: WebGLProgram;
  private extractProg: WebGLProgram;
  private blurProg: WebGLProgram;
  private postProg: WebGLProgram;
  private uChunk: Record<string, WebGLUniformLocation>;
  private uColor: Record<string, WebGLUniformLocation>;
  private uPresent: Record<string, WebGLUniformLocation>;
  private uExtract: Record<string, WebGLUniformLocation>;
  private uBlur: Record<string, WebGLUniformLocation>;
  private uPost: Record<string, WebGLUniformLocation>;
  private quad: WebGLVertexArrayObject;
  private emptyVao: WebGLVertexArrayObject;
  private palette: WebGLTexture;
  private regionTex: WebGLTexture;
  private fogTex: WebGLTexture;
  private regionW: number;
  private regionH: number;
  private season: MapSeason = 'Spring';
  private sceneT: Target | null = null;
  private glowA: Target | null = null;
  private glowB: Target | null = null;
  private dofA: Target | null = null;
  private dofB: Target | null = null;
  private quality = 2;
  private qualityMax = 2;
  private emaDt = 0.016;
  private slowFrames = 0;
  private fastFrames = 0;
  private warmFrames = 0;
  private levels: [Level, Level] = [
    { dataT: null, colorT: null, offX: 0, offY: 0, scale: 1 },
    { dataT: null, colorT: null, offX: 0, offY: 0, scale: 1 },
  ];
  private cloud = [0, 0];

  constructor(readonly canvas: HTMLCanvasElement, raw: RawWorld, private readonly worldW: number, private readonly worldH: number) {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 is required');
    this.gl = gl;
    this.chunkProg = compileProgram(gl, CHUNK_VS, CHUNK_FS);
    this.colorProg = compileProgram(gl, FULLSCREEN_VS, COLOR_FS);
    this.presentProg = compileProgram(gl, FULLSCREEN_VS, PRESENT_FS);
    this.extractProg = compileProgram(gl, FULLSCREEN_VS, EXTRACT_FS);
    this.blurProg = compileProgram(gl, FULLSCREEN_VS, BLUR_FS);
    this.postProg = compileProgram(gl, FULLSCREEN_VS, POST_FS);
    this.uChunk = uniforms(gl, this.chunkProg);
    this.uColor = uniforms(gl, this.colorProg);
    this.uPresent = uniforms(gl, this.presentProg);
    this.uExtract = uniforms(gl, this.extractProg);
    this.uBlur = uniforms(gl, this.blurProg);
    this.uPost = uniforms(gl, this.postProg);

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
    this.regionW = raw.meta.gridW;
    this.regionH = raw.meta.gridH;
    this.regionTex = createTexture(gl, this.regionW, this.regionH, packR8(new Uint8Array(raw.region)));
    this.fogTex = createTexture(gl, 1, 1, new Uint8Array([255, 0, 0, 255]), gl.LINEAR);
    this.cache = new ChunkCache(gl, raw);
    this.qualityMax = gpuQuality(gl);
    this.quality = this.qualityMax;
    this.info.quality = this.quality;
  }

  setSeason(season: MapSeason) {
    if (season === this.season) return;
    this.season = season;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.palette);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TONES, MATERIAL_COUNT, gl.RGBA, gl.UNSIGNED_BYTE, buildPalette(season));
  }

  setFog(data: Uint8Array, w: number, h: number) {
    updateTexture(this.gl, this.fogTex, w, h, data, this.gl.LINEAR);
  }

  private flags(): number {
    if (!this.shadersOn) return 0;
    let f = 0;
    for (const [name, on] of Object.entries(this.effects)) {
      if (!on) continue;
      if (name === 'vignette' && this.postOn && this.quality > 0) continue;
      f |= FX[name as FxName];
    }
    return f;
  }

  private ensureTargets(level: Level, w: number, h: number) {
    const gl = this.gl;
    if (level.dataT && level.dataT.w >= w && level.dataT.h >= h) return;
    const aw = Math.max(w, level.dataT?.w ?? 0);
    const ah = Math.max(h, level.dataT?.h ?? 0);
    if (level.dataT) deleteTarget(gl, level.dataT);
    if (level.colorT) deleteTarget(gl, level.colorT);
    level.dataT = createTarget(gl, aw, ah, gl.NEAREST);
    level.colorT = createTarget(gl, aw, ah, gl.LINEAR);
  }

  /** Buffer placement and visible chunk range for LOD k at the current camera. */
  private viewFor(k: number, Zp: number, Wp: number, Hp: number, left: number, top: number): LevelView {
    const t = texelMiles(k);
    const s = Zp * t;
    const ox = Math.floor(left / t) - 1;
    const oy = Math.floor(top / t) - 1;
    const bw = Math.ceil(Wp / s) + 3;
    const bh = Math.ceil(Hp / s) + 3;
    const cm = chunkMiles(k);
    const nx = Math.ceil(this.worldW / cm);
    const ny = Math.ceil(this.worldH / cm);
    return {
      k, t, s, ox, oy, bw, bh,
      i0: Math.max(0, Math.floor(ox / CHUNK)),
      j0: Math.max(0, Math.floor(oy / CHUNK)),
      i1: Math.min(nx - 1, Math.floor((ox + bw - 1) / CHUNK)),
      j1: Math.min(ny - 1, Math.floor((oy + bh - 1) / CHUNK)),
    };
  }

  /** Chunks of level v that aren't cached yet, nearest to the screen centre first. */
  private missingChunks(v: LevelView, ccx: number, ccy: number): ChunkReq[] {
    const out: ChunkReq[] = [];
    for (let j = v.j0; j <= v.j1; j++)
      for (let i = v.i0; i <= v.i1; i++) {
        const key = chunkKey(v.k, i, j);
        if (!this.cache.has(key)) out.push({ key, k: v.k, cx: i, cy: j });
      }
    const cm = chunkMiles(v.k);
    return out.sort(
      (p, q) =>
        Math.hypot(p.cx + 0.5 - ccx / cm, p.cy + 0.5 - ccy / cm) - Math.hypot(q.cx + 0.5 - ccx / cm, q.cy + 0.5 - ccy / cm),
    );
  }

  render(cam: Camera, time: number, dt: number) {
    const dpr = window.devicePixelRatio || 1;
    const Wp = this.canvas.width;
    const Hp = this.canvas.height;
    const Zp = cam.zoom * (Wp / cam.viewW);
    const P = this.pixelScale * dpr;

    const lod = 1 + Math.log2(Zp / P);
    const k = Math.max(KMIN, Math.min(KMAX, Math.floor(lod)));
    const frac = lod - k;
    let blend = 0;
    if (this.lodBlend && k < KMAX && frac > BLEND_START) {
      const x = Math.min(1, (frac - BLEND_START) / (1 - BLEND_START));
      blend = x * x * (3 - 2 * x);
    }

    const left = cam.cx - cam.viewW / (2 * cam.zoom);
    const top = cam.cy - cam.viewH / (2 * cam.zoom);
    const ccx = cam.cx;
    const ccy = cam.cy;
    const v0 = this.viewFor(k, Zp, Wp, Hp, left, top);
    const v1 = blend > 0 ? this.viewFor(k + 1, Zp, Wp, Hp, left, top) : null;

    // ---- Chunk requests: base levels, current level, then the next finer level (prefetched
    //      before the fade starts so it's ready), then parents as quick fallbacks. -------------
    const base: ChunkReq[] = [];
    for (const m of [KMIN, KMIN + 1]) {
      const n = Math.ceil(this.worldW / chunkMiles(m));
      const nn = Math.ceil(this.worldH / chunkMiles(m));
      for (let b = 0; b < nn; b++) for (let a = 0; a < n; a++) base.push({ key: chunkKey(m, a, b), k: m, cx: a, cy: b });
    }
    const want0 = this.missingChunks(v0, ccx, ccy);
    const prefetch = k < KMAX && frac > BLEND_START - 0.2 ? this.missingChunks(v1 ?? this.viewFor(k + 1, Zp, Wp, Hp, left, top), ccx, ccy) : [];
    const parents = k > KMIN ? this.missingChunks(this.viewFor(k - 1, Zp, Wp, Hp, left, top), ccx, ccy) : [];
    const want = blend > 0.5 ? [...base, ...prefetch, ...want0, ...parents] : [...base, ...want0, ...prefetch, ...parents];
    this.cache.want(want);
    this.cache.update();

    this.cloud[0] += (dt * 7) / cam.zoom;
    this.cloud[1] += (dt * 2.5) / cam.zoom;

    this.renderLevel(this.levels[0], v0, left, top, time);
    if (v1) this.renderLevel(this.levels[1], v1, left, top, time);

    this.info = {
      k,
      texelMiles: v0.t,
      artPixel: v0.s / dpr,
      blend,
      visible: (v0.i1 - v0.i0 + 1) * (v0.j1 - v0.j0 + 1),
      missing: want0.length,
      quality: this.quality,
    };

    this.tuneQuality(dt);
    this.present(v1 ? blend : 0, time, Wp, Hp);
  }

  /** Data pass + colour pass for one LOD into the given level's buffers. */
  private renderLevel(level: Level, v: LevelView, left: number, top: number, time: number) {
    const gl = this.gl;
    const { k, t, s, ox, oy, bw, bh } = v;
    this.ensureTargets(level, bw, bh);
    const dataT = level.dataT!;
    const colorT = level.colorT!;

    // Cached chunks for this level, with the nearest cached ancestor standing in for missing ones.
    const draws: { key: string; m: number; a: number; b: number }[] = [];
    const fallback = new Map<string, { m: number; a: number; b: number }>();
    for (let j = v.j0; j <= v.j1; j++) {
      for (let i = v.i0; i <= v.i1; i++) {
        const key = chunkKey(k, i, j);
        if (this.cache.get(key)) {
          draws.push({ key, m: k, a: i, b: j });
          continue;
        }
        for (let m = k - 1; m >= KMIN; m--) {
          const sh = k - m;
          const a = i >> sh;
          const b = j >> sh;
          const pk = chunkKey(m, a, b);
          if (this.cache.get(pk)) {
            fallback.set(pk, { m, a, b });
            break;
          }
        }
      }
    }

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
    const Wp = this.canvas.width;
    const Hp = this.canvas.height;
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
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.regionTex);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.fogTex);
    const u = this.uColor;
    gl.uniform1i(u.u_data, 0);
    gl.uniform1i(u.u_pal, 1);
    gl.uniform1i(u.u_region, 2);
    gl.uniform1i(u.u_fog, 3);
    gl.uniform2f(u.u_origin, ox, oy);
    gl.uniform2i(u.u_size, bw, bh);
    gl.uniform1f(u.u_texel, t);
    gl.uniform1f(u.u_time, time);
    gl.uniform1i(u.u_flags, this.flags());
    gl.uniform2f(u.u_cloud, this.cloud[0], this.cloud[1]);
    gl.uniform1f(u.u_exag, 2.5 * Math.pow(t / 0.03125, 0.55));
    gl.uniform4f(u.u_vig, s / Wp, s / Hp, offX, offY);
    gl.uniform2f(u.u_world, this.worldW, this.worldH);
    gl.uniform2f(u.u_regionSize, this.regionW, this.regionH);
    gl.uniform1i(u.u_regionsOn, this.regionsOn ? 1 : 0);
    gl.uniform1i(u.u_fogOn, this.fogOn ? 1 : 0);
    const parch = rgb(C.parchmentLight);
    const ink = rgb(C.ink);
    gl.uniform3f(u.u_parchment, parch[0] / 255, parch[1] / 255, parch[2] / 255);
    gl.uniform3f(u.u_ink, ink[0] / 255, ink[1] / 255, ink[2] / 255);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    level.offX = offX;
    level.offY = offY;
    level.scale = s;
  }

  private tuneQuality(dt: number) {
    if (!this.postOn) return;
    if (this.warmFrames < 180) {
      this.warmFrames++;
      return;
    }
    if (this.info.missing > 4) return;
    this.emaDt = this.emaDt * 0.92 + dt * 0.08;
    if (this.emaDt > 0.024) {
      this.slowFrames++;
      this.fastFrames = 0;
    } else if (this.emaDt < 0.015) {
      this.fastFrames++;
      this.slowFrames = 0;
    } else {
      this.slowFrames = 0;
      this.fastFrames = 0;
    }
    if (this.quality > 1 && this.slowFrames > 60) {
      this.quality--;
      this.slowFrames = 0;
    } else if (this.quality === 1 && this.slowFrames > 120 && this.emaDt > 0.03) {
      this.quality = 0;
      this.slowFrames = 0;
    } else if (this.fastFrames > 180 && this.quality < this.qualityMax) {
      this.quality++;
      this.fastFrames = 0;
    }
  }

  /** Chunky upscale, then (if HD-2D is on) a full-res light pass. */
  private present(mix: number, time: number, Wp: number, Hp: number) {
    const usePost = this.postOn && this.quality > 0;
    this.drawPresent(usePost, mix, Wp, Hp);
    if (usePost) this.drawPost(time, Wp, Hp);
  }

  private drawPresent(toFbo: boolean, mix: number, Wp: number, Hp: number) {
    const gl = this.gl;
    const [a, b] = this.levels;
    const hi = mix > 0 ? b : a;
    if (toFbo) {
      this.sceneT = ensureTarget(gl, this.sceneT, Wp, Hp, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneT.fbo);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.viewport(0, 0, Wp, Hp);
    gl.useProgram(this.presentProg);
    gl.bindVertexArray(this.emptyVao);
    const up = this.uPresent;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, a.colorT!.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, hi.colorT!.tex);
    gl.uniform1i(up.u_color0, 0);
    gl.uniform1i(up.u_color1, 1);
    gl.uniform2f(up.u_size0, a.colorT!.w, a.colorT!.h);
    gl.uniform2f(up.u_off0, a.offX, a.offY);
    gl.uniform1f(up.u_scale0, a.scale);
    gl.uniform2f(up.u_size1, hi.colorT!.w, hi.colorT!.h);
    gl.uniform2f(up.u_off1, hi.offX, hi.offY);
    gl.uniform1f(up.u_scale1, hi.scale);
    gl.uniform1f(up.u_mix, mix);
    gl.uniform2f(up.u_screen, Wp, Hp);
    gl.uniform3f(up.u_grade, this.grade[0], this.grade[1], this.grade[2]);
    gl.uniform3f(up.u_lift, this.lift[0], this.lift[1], this.lift[2]);
    gl.uniform1i(up.u_post, toFbo ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private drawPost(time: number, Wp: number, Hp: number) {
    const gl = this.gl;
    const scene = this.sceneT!;
    const div = this.quality >= 2 ? 2 : 4;
    const gw = Math.max(2, (Wp / div) | 0);
    const gh = Math.max(2, (Hp / div) | 0);
    this.glowA = ensureTarget(gl, this.glowA, gw, gh, gl.LINEAR);
    this.glowB = ensureTarget(gl, this.glowB, gw, gh, gl.LINEAR);

    this.blitExtract(scene, this.glowA, 1);
    this.blitBlur(this.glowA, this.glowB, 1 / gw, 0);
    this.blitBlur(this.glowB, this.glowA, 0, 1 / gh);

    let soft: Target = scene;
    if (this.quality >= 2 && this.post.dof > 0.008) {
      this.dofA = ensureTarget(gl, this.dofA, gw, gh, gl.LINEAR);
      this.dofB = ensureTarget(gl, this.dofB, gw, gh, gl.LINEAR);
      this.blitExtract(scene, this.dofA, 0);
      this.blitBlur(this.dofA, this.dofB, 1 / gw, 0);
      this.blitBlur(this.dofB, this.dofA, 0, 1 / gh);
      soft = this.dofA;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, Wp, Hp);
    gl.useProgram(this.postProg);
    gl.bindVertexArray(this.emptyVao);
    const u = this.uPost;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.glowA.tex);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, soft.tex);
    gl.uniform1i(u.u_scene, 0);
    gl.uniform1i(u.u_bloom, 1);
    gl.uniform1i(u.u_soft, 2);
    gl.uniform2f(u.u_screen, Wp, Hp);
    gl.uniform1f(u.u_glow, this.post.glow);
    gl.uniform1f(u.u_dof, this.post.dof);
    gl.uniform1f(u.u_vignette, this.post.vignette);
    gl.uniform1f(u.u_golden, this.post.golden);
    gl.uniform1f(u.u_night, this.post.night);
    gl.uniform1f(u.u_time, this.post.reduceMotion ? 0 : time);
    gl.uniform3f(u.u_grade, this.grade[0], this.grade[1], this.grade[2]);
    gl.uniform3f(u.u_lift, this.lift[0], this.lift[1], this.lift[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private blitExtract(src: Target, dst: Target, emit: number) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.w, dst.h);
    gl.useProgram(this.extractProg);
    gl.bindVertexArray(this.emptyVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(this.uExtract.u_tex, 0);
    gl.uniform2f(this.uExtract.u_size, dst.w, dst.h);
    gl.uniform1i(this.uExtract.u_emit, emit);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private blitBlur(src: Target, dst: Target, dx: number, dy: number) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fbo);
    gl.viewport(0, 0, dst.w, dst.h);
    gl.useProgram(this.blurProg);
    gl.bindVertexArray(this.emptyVao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(this.uBlur.u_tex, 0);
    gl.uniform2f(this.uBlur.u_size, dst.w, dst.h);
    gl.uniform2f(this.uBlur.u_texel, dx, dy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

/** Start the HD-2D pass low on software or older integrated GPUs; the frame tuner may still drop further. */
function gpuQuality(gl: WebGL2RenderingContext): number {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  if (maxTex < 4096) return 0;
  if (/swiftshader|llvmpipe|softpipe|microsoft basic render|gdi generic|d3d11warp/i.test(gpu)) return 0;
  if (/intel.*\b(hd|uhd) graphics/i.test(gpu) && !/iris|arc/i.test(gpu)) return 1;
  if (/mali-[t0-4]|adreno \(tm\) [0-5]/i.test(gpu)) return 1;
  return 2;
}
