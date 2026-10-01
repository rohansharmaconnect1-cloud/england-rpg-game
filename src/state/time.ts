import type { Season } from './types';

/** Julian-calendar dates for the 1340s. Day 0 = 1 January 1346. England kept the Julian calendar. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BASE_YEAR = 1346;

const isLeap = (y: number) => y % 4 === 0;
const monthLen = (y: number, m: number) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m];

export interface CalDate {
  year: number;
  /** 0-based month */
  month: number;
  /** 1-based day of month */
  day: number;
  weekday: number;
  doy: number;
}

export function dayToDate(day: number): CalDate {
  let d = Math.floor(day);
  let y = BASE_YEAR;
  for (;;) {
    const n = isLeap(y) ? 366 : 365;
    if (d < n) break;
    d -= n;
    y++;
  }
  const doy = d;
  let m = 0;
  while (d >= monthLen(y, m)) {
    d -= monthLen(y, m);
    m++;
  }
  return { year: y, month: m, day: d + 1, weekday: weekday(y, m + 1, d + 1), doy };
}

export function dateToDay(year: number, month1: number, day: number): number {
  let n = 0;
  for (let y = BASE_YEAR; y < year; y++) n += isLeap(y) ? 366 : 365;
  for (let m = 0; m < month1 - 1; m++) n += monthLen(year, m);
  return n + day - 1;
}

/** Julian-calendar Julian Day Number -> weekday (0 = Sunday). */
function weekday(Y: number, M: number, D: number): number {
  const jdn = 367 * Y - Math.trunc((7 * (Y + 5001 + Math.trunc((M - 9) / 7))) / 4) + Math.trunc((275 * M) / 9) + D + 1729777;
  return (jdn + 1) % 7;
}

/** Julian Easter (Meeus). Returns [month1, day]. */
export function easter(Y: number): [number, number] {
  const a = Y % 4, b = Y % 7, c = Y % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const m = Math.floor((d + e + 114) / 31);
  return [m, ((d + e + 114) % 31) + 1];
}

const FIXED_FEASTS: Record<string, string> = {
  '1-1': 'the Circumcision', '1-6': 'Epiphany', '2-2': 'Candlemas', '2-14': 'St Valentine', '3-1': 'St David',
  '3-25': 'Lady Day', '4-23': 'St George', '4-25': 'St Mark', '5-3': 'the Finding of the Holy Cross',
  '6-17': 'St Botolph', '6-24': 'Midsummer (St John)', '6-29': 'St Peter & St Paul', '7-15': 'St Swithun',
  '7-25': 'St James', '8-1': 'Lammas', '8-15': 'the Assumption', '8-24': 'St Bartholomew', '9-29': 'Michaelmas',
  '10-13': 'St Edward the Confessor', '10-28': 'St Simon & St Jude', '11-1': 'All Saints', '11-2': 'All Souls',
  '11-11': 'Martinmas', '11-30': 'St Andrew', '12-6': 'St Nicholas', '12-25': 'Christmas', '12-26': 'St Stephen',
  '12-28': 'Holy Innocents', '12-29': 'St Thomas Becket',
};

export function feastOf(d: CalDate): string | null {
  const fixed = FIXED_FEASTS[`${d.month + 1}-${d.day}`];
  if (fixed) return fixed;
  const [em, ed] = easter(d.year);
  const e = dateToDay(d.year, em, ed);
  const t = dateToDay(d.year, d.month + 1, d.day);
  const off: Record<number, string> = { [-46]: 'Ash Wednesday', [-7]: 'Palm Sunday', [-2]: 'Good Friday', 0: 'Easter Day', 1: 'Easter Monday', 39: 'Ascension Day', 49: 'Whitsunday', 60: 'Corpus Christi' };
  return off[t - e] ?? null;
}

export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return n + (s || 'th');
}

export function formatDate(day: number, long = false): string {
  const d = dayToDate(day);
  const base = `${ordinal(d.day)} ${MONTHS[d.month]} ${d.year}`;
  return long ? `${WEEKDAYS[d.weekday]}, ${base}` : base;
}

/** Compact date for the top banner: "12 March 1346". */
export function bannerDate(day: number): string {
  const d = dayToDate(day);
  return `${d.day} ${MONTHS[d.month]} ${d.year}`;
}

export function shortDate(day: number): string {
  const d = dayToDate(day);
  return `${d.day} ${MONTHS[d.month].slice(0, 3)}`;
}

export function seasonOf(day: number): Season {
  const m = dayToDate(day).month;
  return m >= 2 && m <= 4 ? 'Spring' : m >= 5 && m <= 7 ? 'Summer' : m >= 8 && m <= 10 ? 'Autumn' : 'Winter';
}

/** The canonical hours by which the realm told the time. */
const HOURS = ['Matins', 'Lauds', 'Prime', 'Terce', 'Sext', 'None', 'Vespers', 'Compline'];
export function canonicalHour(minute: number): string {
  return HOURS[Math.floor(((minute / 60 + 24) % 24) / 3)];
}

export function clockText(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} o'clock ${h < 12 ? 'forenoon' : h < 18 ? 'afternoon' : 'evening'}`;
}

/** Approximate sunrise / sunset (hours) at ~53°N. */
export function sunTimes(day: number): [number, number] {
  const doy = dayToDate(day).doy;
  const len = 12 + 4.6 * Math.sin((2 * Math.PI * (doy - 80)) / 365);
  return [12 - len / 2, 12 + len / 2];
}

/** Pounds, shillings and pence. 12d = 1s, 20s = £1. */
export function lsd(pence: number, short = false): string {
  const neg = pence < 0;
  let p = Math.round(Math.abs(pence));
  const L = Math.floor(p / 240);
  p -= L * 240;
  const s = Math.floor(p / 12);
  const d = p - s * 12;
  const parts: string[] = [];
  if (L) parts.push(`£${L}`);
  if (s || (L && !short && d)) parts.push(`${s}s`);
  if (!short || (!L && !s)) if (d || parts.length === 0) parts.push(`${d}d`);
  return (neg ? '−' : '') + parts.join(' ');
}

export const MONTH_NAMES = MONTHS;
