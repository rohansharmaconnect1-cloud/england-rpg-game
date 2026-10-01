import { sunTimes } from '../state/time';
import type { WeatherKind } from '../state/types';

export interface Grade {
  grade: [number, number, number];
  lift: [number, number, number];
  /** 0 day … 1 full night. */
  night: number;
  /** 0..1 warmth of dawn/dusk. */
  golden: number;
  /** 0 night … 1 full day (for field shimmer). */
  day: number;
}

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

const NIGHT: [number, number, number] = [0.38, 0.42, 0.7];
const DAWN: [number, number, number] = [1.14, 0.88, 0.74];
const MORN: [number, number, number] = [1.08, 0.96, 0.88];
const DAY: [number, number, number] = [1, 1, 1];
const DUSK: [number, number, number] = [1.18, 0.68, 0.48];
const NIGHT_LIFT: [number, number, number] = [0.02, 0.03, 0.08];

const WX: Record<WeatherKind, [number, number, number]> = {
  clear: [1, 1, 1],
  overcast: [0.86, 0.88, 0.92],
  rain: [0.74, 0.78, 0.86],
  storm: [0.62, 0.64, 0.78],
  fog: [0.9, 0.92, 0.88],
  snow: [0.92, 0.94, 1.02],
};

/** HD-2D colour grade from the clock and weather. Morning is warm, noon neutral, dusk gold, night a cool woad wash. */
export function dayGrade(day: number, minute: number, weather: WeatherKind, intensity: number): Grade {
  const [rise, set] = sunTimes(day);
  const h = minute / 60;
  let night = 0;
  let golden = 0;
  let grade: [number, number, number] = DAY;
  let lift: [number, number, number] = [0, 0, 0];

  const dawn0 = rise - 1.1;
  const dawn1 = rise + 0.55;
  const morn1 = rise + 3.2;
  const dusk0 = set - 0.85;
  const dusk1 = set + 1.2;

  if (h < dawn0 || h > dusk1) {
    night = 1;
    grade = NIGHT;
    lift = NIGHT_LIFT;
  } else if (h < dawn1) {
    const t = (h - dawn0) / (dawn1 - dawn0);
    night = 1 - t;
    golden = t < 0.55 ? t / 0.55 : 1 - (t - 0.55) / 0.45;
    grade = lerp3(NIGHT, lerp3(DAWN, MORN, t), t);
    lift = lerp3(NIGHT_LIFT, [0, 0, 0], t);
  } else if (h < morn1) {
    const t = (h - dawn1) / (morn1 - dawn1);
    golden = (1 - t) * 0.35;
    grade = lerp3(MORN, DAY, t);
  } else if (h > dusk0) {
    const t = (h - dusk0) / (dusk1 - dusk0);
    night = t < 0.42 ? 0 : (t - 0.42) / 0.58;
    golden = t < 0.38 ? t / 0.38 : Math.max(0, 1 - (t - 0.38) / 0.62);
    grade = t < 0.48 ? lerp3(DAY, DUSK, t / 0.48) : lerp3(DUSK, NIGHT, (t - 0.48) / 0.52);
    lift = lerp3([0, 0, 0], NIGHT_LIFT, night);
  }

  const wx = WX[weather];
  const k = 0.35 + intensity * 0.65;
  grade = [grade[0] * (1 - k + wx[0] * k), grade[1] * (1 - k + wx[1] * k), grade[2] * (1 - k + wx[2] * k)];
  return { grade, lift, night, golden, day: 1 - night };
}

export function mixGrade(full: Grade, amount: number): Grade {
  const a = Math.max(0, Math.min(1, amount));
  return {
    grade: lerp3([1, 1, 1], full.grade, a),
    lift: lerp3([0, 0, 0], full.lift, a),
    night: full.night * a,
    golden: full.golden * a,
    day: 1 - full.night * a,
  };
}
