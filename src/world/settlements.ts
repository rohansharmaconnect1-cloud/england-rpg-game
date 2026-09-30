import { project } from './projection';

export type SettlementKind = 'city' | 'town' | 'port' | 'castle';

export interface SettlementDef {
  name: string;
  lon: number;
  lat: number;
  /** 1 = always labelled, 2 = regional, 3 = local (labelled only when zoomed in). */
  tier: 1 | 2 | 3;
  kind: SettlementKind;
  /** True for places outside the English crown's lands (drawn muted). */
  foreign?: boolean;
}

/** Real places, positioned by their modern lat/lon (medieval cores are within a mile or so). */
export const SETTLEMENTS: SettlementDef[] = [
  { name: 'London', lon: -0.1, lat: 51.51, tier: 1, kind: 'city' },
  { name: 'York', lon: -1.08, lat: 53.96, tier: 1, kind: 'city' },
  { name: 'Winchester', lon: -1.31, lat: 51.06, tier: 1, kind: 'city' },
  { name: 'Lincoln', lon: -0.54, lat: 53.23, tier: 2, kind: 'city' },
  { name: 'Norwich', lon: 1.3, lat: 52.63, tier: 2, kind: 'city' },
  { name: 'Bristol', lon: -2.59, lat: 51.45, tier: 2, kind: 'port' },
  { name: 'Canterbury', lon: 1.08, lat: 51.28, tier: 2, kind: 'city' },
  { name: 'Chester', lon: -2.89, lat: 53.19, tier: 2, kind: 'castle' },
  { name: 'Newcastle', lon: -1.61, lat: 54.97, tier: 2, kind: 'castle' },
  { name: 'Exeter', lon: -3.53, lat: 50.72, tier: 2, kind: 'city' },
  { name: 'Oxford', lon: -1.26, lat: 51.75, tier: 2, kind: 'town' },
  { name: 'Durham', lon: -1.575, lat: 54.776, tier: 3, kind: 'castle' },
  { name: 'Carlisle', lon: -2.93, lat: 54.89, tier: 3, kind: 'castle' },
  { name: 'Cambridge', lon: 0.12, lat: 52.205, tier: 3, kind: 'town' },
  { name: 'Nottingham', lon: -1.15, lat: 52.95, tier: 3, kind: 'castle' },
  { name: 'Gloucester', lon: -2.24, lat: 51.86, tier: 3, kind: 'town' },
  { name: 'Coventry', lon: -1.51, lat: 52.41, tier: 3, kind: 'town' },
  { name: 'Salisbury', lon: -1.8, lat: 51.07, tier: 3, kind: 'town' },
  { name: 'Southampton', lon: -1.4, lat: 50.9, tier: 3, kind: 'port' },
  { name: 'Dover', lon: 1.31, lat: 51.13, tier: 3, kind: 'castle' },
  { name: 'Shrewsbury', lon: -2.75, lat: 52.71, tier: 3, kind: 'town' },
  { name: 'Worcester', lon: -2.22, lat: 52.19, tier: 3, kind: 'town' },
  { name: 'Leicester', lon: -1.13, lat: 52.64, tier: 3, kind: 'town' },
  { name: 'Bath', lon: -2.36, lat: 51.38, tier: 3, kind: 'town' },
  { name: 'Lancaster', lon: -2.8, lat: 54.05, tier: 3, kind: 'castle' },
  { name: "Bishop's Lynn", lon: 0.4, lat: 52.75, tier: 3, kind: 'port' },
  { name: 'Colchester', lon: 0.9, lat: 51.89, tier: 3, kind: 'town' },
  { name: 'Berwick', lon: -2.0, lat: 55.77, tier: 3, kind: 'castle', foreign: true },
  { name: 'Edinburgh', lon: -3.19, lat: 55.95, tier: 2, kind: 'castle', foreign: true },
];

export interface Settlement extends SettlementDef {
  x: number;
  y: number;
}

export const SETTLEMENT_POINTS: Settlement[] = SETTLEMENTS.map((s) => {
  const [x, y] = project(s.lon, s.lat);
  return { ...s, x, y };
});
