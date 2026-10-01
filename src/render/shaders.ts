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
uniform sampler2D u_region;
uniform sampler2D u_fog;
uniform vec2 u_origin;   // world texel index of buffer pixel (0,0)
uniform ivec2 u_size;    // used buffer size
uniform float u_texel;   // miles per texel
uniform float u_time;
uniform int u_flags;
uniform vec2 u_cloud;    // cloud drift offset, miles
uniform float u_exag;    // vertical exaggeration for hill-shading
uniform vec4 u_vig;      // buffer px -> [0,1] screen: (sx, sy, offX, offY)
uniform vec2 u_world;    // world size in miles
uniform vec2 u_regionSize;
uniform int u_regionsOn;
uniform int u_fogOn;
uniform vec3 u_parchment;
uniform vec3 u_ink;
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
  float emit = 0.0;
  if ((u_flags & 2) != 0 && water) {
    float w = vnoise(wt * 0.21 + vec2(u_time * 0.55, u_time * 0.3)) + vnoise(wt * 0.33 - vec2(u_time * 0.35, -u_time * 0.45));
    light += (w - 1.0) * (base == 0 ? 0.8 : 1.3);
    float sp = h21(wt + floor(u_time * 1.5) * vec2(17.0, 31.0));
    if (sp > 0.994) { light += 2.0; emit = 1.0; }
    else emit = 0.11;
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
  if (!water && (base == 4 || base == 5 || base == 6)) emit = clamp((tq - 4.5) / 2.5, 0.0, 1.0) * 0.32;
  o.a = emit;

  // Soft political tints (Wales, Scotland, Flanders, France) and faint dotted borders.
  if (u_regionsOn != 0 && !water) {
    vec2 ruv = wp / u_world;
    int rid = int(texture(u_region, ruv).r * 255.0 + 0.5);
    vec3 tint = vec3(1.0);
    if (rid == 2) tint = vec3(0.90, 1.04, 0.88);
    else if (rid == 3) tint = vec3(0.88, 0.94, 1.08);
    else if (rid == 7) {
      bool flanders = wp.x > 490.0 && wp.y > 348.0 && wp.y < 422.0;
      tint = flanders ? vec3(1.08, 0.90, 0.94) : vec3(1.06, 0.97, 0.88);
    }
    o.rgb *= tint;
    vec2 rpx = vec2(1.0) / u_regionSize;
    int ridE = int(texture(u_region, ruv + vec2(rpx.x, 0.0)).r * 255.0 + 0.5);
    int ridS = int(texture(u_region, ruv + vec2(0.0, rpx.y)).r * 255.0 + 0.5);
    if ((rid != ridE && rid > 0 && ridE > 0) || (rid != ridS && rid > 0 && ridS > 0)) {
      if (mod(floor(wp.x * 0.65) + floor(wp.y * 0.65), 3.0) < 1.0) o.rgb = mix(o.rgb, u_ink, 0.42);
    }
  }

  // Unexplored land fades to unrolled parchment; coasts stay as faint ink sketches.
  if (u_fogOn != 0) {
    float rev = texture(u_fog, wp / u_world).r;
    float fog = 1.0 - rev;
    if (fog > 0.04) {
      o.rgb = mix(o.rgb, u_parchment, fog * 0.88);
      int n1 = int(texelFetch(u_data, clamp(ip + ivec2(1, 0), ivec2(0), u_size - 1), 0).g * 255.0 + 0.5) & 15;
      int n2 = int(texelFetch(u_data, clamp(ip + ivec2(0, 1), ivec2(0), u_size - 1), 0).g * 255.0 + 0.5) & 15;
      bool edge = water != (n1 <= 2) || water != (n2 <= 2);
      if (edge && fog > 0.3) o.rgb = mix(o.rgb, u_ink, 0.48 * fog);
      else if (water && fog > 0.55 && h21(floor(wp / 22.0)) > 0.984) o.rgb = mix(o.rgb, u_ink, 0.28);
      o.a *= 1.0 - fog;
    }
  }
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
uniform vec3 u_grade;
uniform vec3 u_lift;
uniform int u_post; // 1 = leave grade to the full-res pass; pack emissive in alpha
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
  float emit = c.a;
  float field = smoothstep(0.42, 0.62, c.g) * smoothstep(0.58, 0.32, c.r) * (1.0 - c.b);
  emit = max(emit, field * 0.28);
  float foam = smoothstep(0.55, 0.82, c.b) * smoothstep(0.45, 0.25, c.r) * c.g;
  emit = max(emit, foam * 0.22);
  if (u_post != 0) o = vec4(c.rgb, emit);
  else o = vec4(clamp(c.rgb * u_grade + u_lift, 0.0, 1.0), 1.0);
}`;

/** Downsample the upscaled scene. u_emit=1 keeps only the glow mask (rgb * alpha). */
export const EXTRACT_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_size;
uniform int u_emit;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / u_size;
  vec4 c = texture(u_tex, uv);
  o = u_emit != 0 ? vec4(c.rgb * c.a, c.a) : vec4(c.rgb, 1.0);
}`;

/** Separable Gaussian blur, 9-tap. u_texel is (dx, dy) in UV. */
export const BLUR_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_size;
uniform vec2 u_texel;
out vec4 o;
void main() {
  vec2 uv = gl_FragCoord.xy / u_size;
  vec4 acc = texture(u_tex, uv) * 0.227027;
  acc += texture(u_tex, uv + u_texel) * 0.1945946;
  acc += texture(u_tex, uv - u_texel) * 0.1945946;
  acc += texture(u_tex, uv + u_texel * 2.0) * 0.1216216;
  acc += texture(u_tex, uv - u_texel * 2.0) * 0.1216216;
  acc += texture(u_tex, uv + u_texel * 3.0) * 0.054054;
  acc += texture(u_tex, uv - u_texel * 3.0) * 0.054054;
  acc += texture(u_tex, uv + u_texel * 4.0) * 0.016216;
  acc += texture(u_tex, uv - u_texel * 4.0) * 0.016216;
  o = acc;
}`;

/**
 * Full-res HD-2D grade: soft bloom, tilt-shift depth of field, sun haze, vignette, then clock tint.
 * Pixels stay chunky because this runs after nearest-neighbour upscale.
 */
export const POST_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_scene;
uniform sampler2D u_bloom;
uniform sampler2D u_soft;
uniform vec2 u_screen;
uniform float u_glow;
uniform float u_dof;
uniform float u_vignette;
uniform float u_golden;
uniform float u_night;
uniform float u_time;
uniform vec3 u_grade;
uniform vec3 u_lift;
out vec4 o;

void main() {
  vec2 uv = gl_FragCoord.xy / u_screen;
  vec3 sharp = texture(u_scene, uv).rgb;
  vec3 soft = texture(u_soft, uv).rgb;
  float edge = smoothstep(0.36, 0.78, abs(uv.y - 0.5) * 2.0);
  vec3 col = mix(sharp, soft, edge * u_dof);

  vec3 bloom = texture(u_bloom, uv).rgb;
  float pulse = 1.0 + 0.05 * sin(u_time * 1.7);
  col += bloom * u_glow * pulse;

  vec2 sun = vec2(0.78 - u_night * 0.45, 0.16 + u_night * 0.08);
  vec2 d = (uv - sun) * vec2(1.15, 1.7);
  float haze = pow(max(0.0, 1.0 - length(d)), 2.4);
  float shaft = pow(max(0.0, 1.0 - abs(d.x) * 3.2), 6.0) * smoothstep(0.55, 0.05, uv.y);
  vec3 sunCol = mix(vec3(1.0, 0.86, 0.62), vec3(1.0, 0.55, 0.28), u_golden);
  col += sunCol * (haze * 0.045 + shaft * 0.04) * (0.25 + u_golden) * (1.0 - u_night * 0.75);

  float r = length((uv - 0.5) * vec2(1.05, 0.82));
  col *= 1.0 - smoothstep(0.52, 1.18, r) * u_vignette;
  col = clamp(col * u_grade + u_lift, 0.0, 1.0);
  o = vec4(col, 1.0);
}`;

