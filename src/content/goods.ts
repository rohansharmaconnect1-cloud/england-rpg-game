import type { IconName } from '../assets/icons';
import type { GoodId } from '../state/types';

export interface GoodDef {
  id: GoodId;
  name: string;
  unit: string;
  icon: IconName;
  /** Typical English price in pence per unit, 1340s. */
  base: number;
  desc: string;
}

export const GOODS: GoodDef[] = [
  { id: 'wool', name: 'Wool', unit: 'sack', icon: 'wool', base: 1300, desc: 'The fleece of England; every loom in Flanders begs for it. A sack is 364 lb.' },
  { id: 'cloth', name: 'Cloth', unit: 'bolt', icon: 'cloth', base: 520, desc: 'Flemish broadcloth, dyed in madder and woad. Fetches a fine price in London.' },
  { id: 'grain', name: 'Grain', unit: 'quarter', icon: 'grain', base: 72, desc: 'Wheat and barley by the quarter. Cheap until the harvest fails.' },
  { id: 'wine', name: 'Wine', unit: 'tun', icon: 'wine', base: 960, desc: 'Gascon red by the tun, through Southampton and Bristol. The war makes it dear.' },
  { id: 'salt', name: 'Salt', unit: 'bushel', icon: 'salt', base: 18, desc: 'Bay salt from Brittany and the Lincolnshire salterns. Every herring needs it.' },
  { id: 'fish', name: 'Herring', unit: 'barrel', icon: 'fish', base: 110, desc: 'Salted Yarmouth herring for the fast days — which is most of them.' },
];

export const GOOD_BY_ID = Object.fromEntries(GOODS.map((g) => [g.id, g])) as Record<GoodId, GoodDef>;

/** Regional price multipliers (1 = the English norm). */
export const PRICE_BIAS: Record<string, Partial<Record<GoodId, number>>> = {
  boston: { wool: 0.92, salt: 0.85, fish: 0.95 },
  london: { wool: 1.05, cloth: 1.08, wine: 1.1, grain: 1.15 },
  lincoln: { wool: 0.9, grain: 0.95 },
  york: { wool: 0.94, cloth: 1.02 },
  hull: { wool: 0.95, fish: 0.9 },
  lynn: { grain: 0.92, fish: 0.92 },
  norwich: { cloth: 0.96, grain: 0.95 },
  yarmouth: { fish: 0.7, salt: 1.1 },
  southampton: { wine: 0.85, wool: 1.05 },
  bristol: { wine: 0.88, cloth: 0.98 },
  calais: { wool: 1.2, wine: 0.95, grain: 1.2 },
  bruges: { wool: 1.38, cloth: 0.82, wine: 0.92, salt: 1.15 },
  ghent: { wool: 1.45, cloth: 0.78, grain: 1.25 },
  ypres: { wool: 1.42, cloth: 0.8 },
  sluys: { wool: 1.3, salt: 1.05, fish: 1.2 },
  antwerp: { wool: 1.33, cloth: 0.86, wine: 0.95 },
  rouen: { wine: 0.9, salt: 0.9, wool: 1.25 },
  ipswich: { cloth: 0.98, grain: 0.96, wool: 0.97 },
  plymouth: { fish: 0.88, salt: 0.95, wine: 0.92 },
  bordeaux: { wine: 0.62, salt: 0.9, wool: 1.28 },
  bayonne: { wine: 0.7, salt: 0.88, wool: 1.22 },
};

/** Towns with a market board (the rest trade through them). */
export const MARKET_TOWNS = ['boston', 'london', 'lincoln', 'york', 'hull', 'lynn', 'norwich', 'yarmouth', 'southampton', 'bristol', 'calais', 'bruges', 'ghent', 'ypres', 'sluys', 'antwerp', 'rouen', 'ipswich', 'plymouth', 'bordeaux', 'bayonne'];
