import { project } from './projection';

export type SettlementKind = 'hamlet' | 'town' | 'city' | 'port' | 'cathedral' | 'castle';

export interface SettlementDef {
  name: string;
  lon: number;
  lat: number;
  /** 1 = always labelled, 2 = regional, 3 = local (labelled only when zoomed in). */
  tier: 1 | 2 | 3;
  kind: SettlementKind;
  /** True for places outside the game's active realm (drawn muted). */
  foreign?: boolean;
}

/** Real places, positioned by their modern lat/lon (medieval cores are within a mile or so). */
export const SETTLEMENTS: SettlementDef[] = [
  { name: 'London', lon: -0.1, lat: 51.51, tier: 1, kind: 'cathedral' },
  { name: 'York', lon: -1.08, lat: 53.96, tier: 1, kind: 'cathedral' },
  { name: 'Boston', lon: -0.025, lat: 52.975, tier: 1, kind: 'port' },
  { name: 'Bruges', lon: 3.225, lat: 51.21, tier: 1, kind: 'city' },
  { name: 'Bordeaux', lon: -0.58, lat: 44.84, tier: 1, kind: 'port' },
  { name: 'Winchester', lon: -1.31, lat: 51.06, tier: 2, kind: 'cathedral' },
  { name: 'Lincoln', lon: -0.54, lat: 53.23, tier: 2, kind: 'cathedral' },
  { name: 'Norwich', lon: 1.3, lat: 52.63, tier: 2, kind: 'cathedral' },
  { name: 'Bristol', lon: -2.59, lat: 51.45, tier: 2, kind: 'port' },
  { name: 'Hull', lon: -0.33, lat: 53.745, tier: 2, kind: 'port' },
  { name: 'Canterbury', lon: 1.08, lat: 51.28, tier: 2, kind: 'cathedral' },
  { name: 'Chester', lon: -2.89, lat: 53.19, tier: 2, kind: 'castle' },
  { name: 'Newcastle', lon: -1.61, lat: 54.97, tier: 2, kind: 'port' },
  { name: 'Exeter', lon: -3.53, lat: 50.72, tier: 2, kind: 'cathedral' },
  { name: 'Southampton', lon: -1.4, lat: 50.9, tier: 2, kind: 'port' },
  { name: 'Calais', lon: 1.855, lat: 50.955, tier: 2, kind: 'castle' },
  { name: 'Ghent', lon: 3.72, lat: 51.05, tier: 2, kind: 'city' },
  { name: 'Antwerp', lon: 4.4, lat: 51.22, tier: 2, kind: 'port' },
  { name: 'Rouen', lon: 1.09, lat: 49.44, tier: 2, kind: 'cathedral' },
  { name: 'Bayonne', lon: -1.47, lat: 43.49, tier: 2, kind: 'port' },
  { name: 'Coventry', lon: -1.51, lat: 52.41, tier: 2, kind: 'town' },
  { name: 'Dover', lon: 1.31, lat: 51.13, tier: 2, kind: 'castle' },
  { name: 'Ipswich', lon: 1.15, lat: 52.06, tier: 2, kind: 'port' },
  { name: 'Lynn', lon: 0.4, lat: 52.75, tier: 2, kind: 'port' },
  { name: 'Plymouth', lon: -4.14, lat: 50.37, tier: 2, kind: 'port' },
  { name: 'Ypres', lon: 2.885, lat: 50.85, tier: 3, kind: 'city' },
  { name: 'Sluys', lon: 3.385, lat: 51.305, tier: 3, kind: 'port' },
  { name: 'Oxford', lon: -1.26, lat: 51.75, tier: 3, kind: 'town' },
  { name: 'Durham', lon: -1.575, lat: 54.776, tier: 3, kind: 'castle' },
  { name: 'Carlisle', lon: -2.93, lat: 54.89, tier: 3, kind: 'castle' },
  { name: 'Cambridge', lon: 0.12, lat: 52.205, tier: 3, kind: 'town' },
  { name: 'Nottingham', lon: -1.15, lat: 52.95, tier: 3, kind: 'castle' },
  { name: 'Gloucester', lon: -2.24, lat: 51.86, tier: 3, kind: 'town' },
  { name: 'Salisbury', lon: -1.8, lat: 51.07, tier: 3, kind: 'town' },
  { name: 'Shrewsbury', lon: -2.75, lat: 52.71, tier: 3, kind: 'town' },
  { name: 'Worcester', lon: -2.22, lat: 52.19, tier: 3, kind: 'town' },
  { name: 'Leicester', lon: -1.13, lat: 52.64, tier: 3, kind: 'town' },
  { name: 'Bath', lon: -2.36, lat: 51.38, tier: 3, kind: 'town' },
  { name: 'Lancaster', lon: -2.8, lat: 54.05, tier: 3, kind: 'castle' },
  { name: 'Colchester', lon: 0.9, lat: 51.89, tier: 3, kind: 'town' },
  { name: 'Yarmouth', lon: 1.73, lat: 52.61, tier: 3, kind: 'port' },
  { name: 'Sandwich', lon: 1.34, lat: 51.275, tier: 3, kind: 'port' },
  { name: 'Winchelsea', lon: 0.71, lat: 50.925, tier: 3, kind: 'port' },
  { name: 'Portsmouth', lon: -1.09, lat: 50.8, tier: 3, kind: 'port' },
  { name: 'Boulogne', lon: 1.61, lat: 50.725, tier: 3, kind: 'port' },
  { name: 'Saint-Omer', lon: 2.25, lat: 50.75, tier: 3, kind: 'town' },
  { name: 'Abbeville', lon: 1.83, lat: 50.105, tier: 3, kind: 'town' },
  { name: 'Dunkirk', lon: 2.38, lat: 51.035, tier: 3, kind: 'port' },
  { name: 'Middelburg', lon: 3.61, lat: 51.5, tier: 3, kind: 'port' },
  { name: 'Dordrecht', lon: 4.67, lat: 51.81, tier: 3, kind: 'port' },
  { name: 'Tournai', lon: 3.39, lat: 50.605, tier: 3, kind: 'city' },
  { name: 'Lille', lon: 3.06, lat: 50.635, tier: 3, kind: 'town' },
  { name: 'Berwick', lon: -2.0, lat: 55.77, tier: 3, kind: 'castle' },
  { name: 'Edinburgh', lon: -3.19, lat: 55.95, tier: 2, kind: 'castle' },
  { name: 'Grantham', lon: -0.64, lat: 52.91, tier: 3, kind: 'hamlet' },
  { name: 'Spalding', lon: -0.15, lat: 52.79, tier: 3, kind: 'hamlet' },
  { name: 'Wainfleet', lon: 0.24, lat: 53.11, tier: 3, kind: 'hamlet' },
  { name: 'Gravesend', lon: 0.37, lat: 51.441, tier: 3, kind: 'port' },
];

export interface Settlement extends SettlementDef {
  id: string;
  x: number;
  y: number;
}

export function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
}

export const SETTLEMENT_POINTS: Settlement[] = SETTLEMENTS.map((s) => {
  const [x, y] = project(s.lon, s.lat);
  return { ...s, id: slug(s.name), x, y };
});

export const SETTLEMENT_BY_ID = new Map(SETTLEMENT_POINTS.map((s) => [s.id, s]));
