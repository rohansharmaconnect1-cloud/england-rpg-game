/** Effect bit flags for the colour pass. */
export const FX = {
  hillshade: 1,
  water: 2,
  clouds: 4,
  dither: 8,
  vignette: 16,
} as const;
export type FxName = keyof typeof FX;

/** Draws one chunk data texture into the low-res data buffer at integer texel offsets. */
export const CHUNK_VS = /* glsl */ `#version 300 es
in vec2 a_pos;
uniform vec4 u_rect; // x, y, w, h in buffer texels (y down)
uniform vec2 u_buf;
out vec2 v_uv;
void main() {
  vec2 p = u_rect.xy + a_pos * u_rect.zw;
  v_uv = a_pos;
  gl_Position = vec4(p / u_buf * 2.0 - 1.0, 0.0, 1.0);
}`;

export const CHUNK_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 o;
void main() { o = texture(u_tex, v_uv); }`;

export const FULLSCREEN_VS = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * Colour pass, one fragment per art pixel. Decodes material/tone/height, then applies hill-shading,
 * water shimmer, cloud shadows and vignette as *tone offsets* on the material's palette ramp,
 * and finally quantises (optionally with world-anchored Bayer dithering) back to palette colours.
 */
export const COLOR_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_data;
uniform sampler2D u_pal;
uniform vec2 u_origin;   // world texel index of buffer pixel (0,0)
uniform ivec2 u_size;    // used buffer size
uniform float u_texel;   // miles per texel
uniform float u_time;
uniform int u_flags;
uniform vec2 u_cloud;    // cloud drift offset, miles
uniform float u_exag;    // vertical exaggeration for hill-shading
uniform vec4 u_vig;      // buffer px -> [0,1] screen: (sx, sy, offX, offY)
uniform vec2 u_world;    // world size in miles
out vec4 o;

uint pcg(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return v.x ^ v.y;
}
float h21(vec2 p) { return float(pcg(uvec2(ivec2(floor(p))))) * (1.0 / 4294967295.0); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s;
}
float heightAt(ivec2 p) {
  p = clamp(p, ivec2(0), u_size - 1);
  vec4 d = texelFetch(u_data, p, 0);
  return (floor(d.r * 255.0 + 0.5) * 256.0 + floor(d.a * 255.0 + 0.5)) / 40.0 - 300.0;
}
float bayer4(ivec2 p) {
  p &= 3;
  int i = p.x + p.y * 4;
  const float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
  return (m[i] + 0.5) / 16.0;
}

void main() {
  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec4 d = texelFetch(u_data, ip, 0);
  int mat = int(d.g * 255.0 + 0.5);
  float tone = floor(d.b * 255.0 + 0.5);
  vec2 wt = u_origin + vec2(ip);
  vec2 wp = (wt + 0.5) * u_texel;

  // Beyond the edge of the known world, land dissolves into open sea (ordered-dither fade).
  vec2 e2 = min(wp, u_world - wp);
  float edge = smoothstep(0.0, 35.0, min(e2.x, e2.y));
  if (bayer4(ivec2(wt)) >= edge) { mat = 0; tone = min(tone, 3.0); }

  int base = mat & 15;
  bool water = base <= 2;
  float light = 0.0;

  if ((u_flags & 1) != 0 && !water) {
    float hl = heightAt(ip + ivec2(-1, 0)), hr = heightAt(ip + ivec2(1, 0));
    float hu = heightAt(ip + ivec2(0, -1)), hd = heightAt(ip + ivec2(0, 1));
    float k = u_exag / (2.0 * u_texel * 1609.34);
    vec3 n = normalize(vec3((hl - hr) * k, (hu - hd) * k, 1.0));
    vec3 L = normalize(vec3(-0.6, -0.7, 0.75));
    light += (dot(n, L) - L.z) * 4.5;
  }
  if ((u_flags & 2) != 0 && water) {
    float w = vnoise(wt * 0.21 + vec2(u_time * 0.55, u_time * 0.3)) + vnoise(wt * 0.33 - vec2(u_time * 0.35, -u_time * 0.45));
    light += (w - 1.0) * (base == 0 ? 0.8 : 1.3);
    float sp = h21(wt + floor(u_time * 1.5) * vec2(17.0, 31.0));
    if (sp > 0.994) light += 2.0;
  }
  if ((u_flags & 4) != 0) {
    float c = fbm((wp + u_cloud) / 16.0);
    light -= smoothstep(0.52, 0.66, c) * 1.4;
  }
  if ((u_flags & 16) != 0) {
    vec2 uv = (vec2(ip) + 0.5 - u_vig.zw) * u_vig.xy;
    float r = length((uv - 0.5) * vec2(1.0, 0.8)) * 1.6;
    light -= smoothstep(0.62, 1.2, r) * 1.8;
  }

  float tq;
  if (u_flags == 0) tq = tone;
  else if ((u_flags & 8) != 0) tq = floor(tone + light + bayer4(ivec2(wt)));
  else tq = floor(tone + light + 0.5);
  tq = clamp(tq, 0.0, 7.0);
  o = texelFetch(u_pal, ivec2(int(tq), mat), 0);
}`;

/**
 * Upscale the art-pixel buffers to the screen. "Sharp bilinear": nearest-neighbour look with a
 * one-screen-pixel blend at texel edges, so non-integer scales and sub-pixel camera motion stay
 * smooth with uniformly sized chunky pixels. Two LODs are sampled and crossfaded by u_mix so detail
 * fades in/out gradually while zooming instead of popping.
 */
export const PRESENT_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_color0;
uniform sampler2D u_color1;
uniform vec2 u_size0, u_size1;
uniform vec2 u_off0, u_off1;     // buffer texel coordinate at the screen's top-left corner
uniform float u_scale0, u_scale1; // screen pixels per texel
uniform float u_mix;
uniform vec2 u_screen;
out vec4 o;

vec4 sharp(sampler2D tex, vec2 size, vec2 off, float scale, vec2 sp) {
  vec2 tx = off + sp / scale;
  vec2 b = floor(tx - 0.5);
  vec2 f = tx - 0.5 - b;
  f = clamp((f - 0.5) * scale + 0.5, 0.0, 1.0);
  return texture(tex, (b + 0.5 + f) / size);
}

void main() {
  vec2 sp = vec2(gl_FragCoord.x, u_screen.y - gl_FragCoord.y);
  vec4 c = sharp(u_color0, u_size0, u_off0, u_scale0, sp);
  if (u_mix > 0.0) c = mix(c, sharp(u_color1, u_size1, u_off1, u_scale1, sp), u_mix);
  o = c;
}`;
