import { rng } from '../assets/pixel';
import { BAND, FACTIONS, PEOPLE, PLAYER } from '../content/characters';
import { GOODS, MARKET_TOWNS, PRICE_BIAS } from '../content/goods';
import { OPENING_NEWS, RUMOR_POOL } from '../content/news';
import { ROUTES } from '../content/routes';
import { dateToDay } from './time';
import { loadSettings } from './settingsStore';
import type { GameState, GoodId, MarketEntry } from './types';

export const START_DAY = dateToDay(1346, 4, 18);

function buildMarket(): GameState['market'] {
  const r = rng(1346);
  const towns: GameState['market']['towns'] = {};
  for (const t of MARKET_TOWNS) {
    const row = {} as Record<GoodId, MarketEntry>;
    for (const g of GOODS) {
      const bias = PRICE_BIAS[t]?.[g.id] ?? 1;
      let p = g.base * bias * (0.92 + r() * 0.16);
      const history: number[] = [];
      for (let i = 0; i < 40; i++) {
        p *= 1 + (r() - 0.5) * 0.05 + (g.base * bias - p) / (g.base * bias) * 0.08;
        history.push(Math.round(p));
      }
      row[g.id] = { price: history[history.length - 1], history, supply: 0.3 + r() * 0.7 };
    }
    towns[t] = row;
  }
  return { towns };
}

function cashHistory(end: number): number[] {
  const r = rng(7);
  const h: number[] = [];
  let v = end + 4200;
  for (let i = 0; i < 30; i++) {
    v += (r() - 0.62) * 600;
    h.push(Math.round(v));
  }
  h[h.length - 1] = end;
  return h;
}

export function createInitialState(): GameState {
  const pence = 23 * 240 + 6 * 12 + 8;
  const d = START_DAY;
  return {
    clock: { day: d, minute: 16 * 60 + 40, speed: 1, lastSpeed: 1 },
    weather: { kind: 'clear', intensity: 0.4, wind: 0.35, windDir: 250 },
    player: structuredClone(PLAYER),
    money: {
      pence,
      debts: [
        { id: 'coteler', creditor: 'Giles Coteler of Lincoln', amount: 140 * 240, dueDay: dateToDay(1346, 9, 29), interest: '"a gift" of 2d in the shilling' },
        { id: 'subsidy', creditor: 'The Crown — wool subsidy arrears', amount: 36 * 240, dueDay: dateToDay(1346, 6, 24), interest: 'Distraint of goods' },
        { id: 'guild', creditor: 'Guild of St Mary — dues', amount: 4 * 240 + 120, dueDay: dateToDay(1346, 5, 3), interest: 'Loss of stall' },
      ],
      ledger: [
        { day: d - 9, text: "Funeral of Walter Ashby: candles, mass, ale", amount: -(3 * 240 + 40), kind: 'misc' },
        { day: d - 6, text: 'Sold 8 sacks to Hinrik Wittenborg', amount: 8 * 1240, kind: 'trade' },
        { day: d - 5, text: 'Wages: household, one week', amount: -40, kind: 'wages' },
        { day: d - 3, text: "Custom on 12 sacks (Pynchbek's scales)", amount: -(12 * 480), kind: 'tax' },
        { day: d - 2, text: 'A "gift" to the tronager', amount: -60, kind: 'bribe', shadow: true },
        { day: d - 1, text: 'Instalment to Coteler', amount: -(5 * 240), kind: 'debt' },
      ],
      history: cashHistory(pence),
    },
    assets: {
      warehouses: [
        { id: 'ashby-boston', name: 'The Ashby Warehouse', town: 'boston', condition: 38, capacity: 120, stock: { wool: 40, salt: 60, grain: 12, cloth: 4 }, notes: 'Leaks from the north roof. The cellar floods at spring tides. It is, Agnes says, "characterful".' },
        { id: 'ashby-lincoln', name: 'Wool-house at Lincoln (leased)', town: 'lincoln', condition: 71, capacity: 30, stock: { wool: 12 }, notes: 'Leased from the Bishop. The rent is due at Michaelmas and the Bishop remembers.' },
      ],
      ships: [
        { id: 'margery', name: 'The Margery', kind: 'cog', owner: 'player', captain: 'Hugh Brandon', hull: 54, crew: 14, morale: 62, cargo: { wool: 24 }, route: 'boston-sluys', progress: 0.34, dir: 1, speed: 0.55, hold: 0, status: 'Bound for Sluys with 24 sacks' },
        { id: 'katherine', name: 'The Katherine', kind: 'cog', owner: 'Dame Fenby', captain: 'Unknown', hull: 88, crew: 20, morale: 71, cargo: {}, route: 'fenby-run', progress: 0.62, dir: -1, speed: 0.6, hold: 0, incident: 'customs', status: 'Riding suspiciously high' },
        { id: 'marienknecht', name: 'Marienknecht', kind: 'hulk', owner: 'The Hanse', captain: 'Klaus Rode', hull: 92, crew: 26, morale: 80, cargo: { cloth: 8 }, route: 'hull-dordrecht', progress: 0.2, dir: 1, speed: 0.5, hold: 0, status: 'Wax, furs and timber' },
        { id: 'cog-thomas', name: 'Cog Thomas', kind: 'cog', owner: 'The Crown', captain: "The King's master", hull: 95, crew: 40, morale: 88, cargo: {}, route: 'london-calais', progress: 0.55, dir: 1, speed: 0.8, hold: 0, status: 'Watching the Narrow Sea' },
        { id: 'balinger', name: 'A Norman balinger', kind: 'balinger', owner: 'French privateers', captain: '?', hull: 70, crew: 30, morale: 90, cargo: {}, route: 'southampton-rouen', progress: 0.6, dir: -1, speed: 1.1, hold: 0, incident: 'pirates', status: 'Oars out, no colours flying' },
        { id: 'grace-dieu', name: 'Grace Dieu', kind: 'cog', owner: 'The Tilneys of Lynn', captain: 'John Tilney', hull: 80, crew: 16, morale: 74, cargo: { grain: 18 }, route: 'lynn-bruges', progress: 0.8, dir: 1, speed: 0.55, hold: 0, status: 'Grain for Bruges' },
        { id: 'ashby-cart', name: "Ashby wool-cart", kind: 'cart', owner: 'player', captain: 'Dunstan Hay', hull: 60, crew: 2, morale: 68, cargo: { wool: 6 }, route: 'wool-road', progress: 0.3, dir: 1, speed: 1.6, hold: 0, status: 'Six sacks down from Lincoln' },
        { id: 'saint-jean', name: 'Saint-Jean', kind: 'cog', owner: 'The Wine Fleet', captain: 'Arnaut of Bayonne', hull: 86, crew: 18, morale: 77, cargo: { wine: 12 }, route: 'bristol-bordeaux', progress: 0.45, dir: 1, speed: 0.48, hold: 0, status: 'Gascon tuns for Bristol' },
        { id: 'swan', name: 'The Swan', kind: 'coaster', owner: 'player', captain: 'Ned of Wainfleet', hull: 48, crew: 8, morale: 70, cargo: { salt: 20, wool: 4 }, route: 'boston-bruges', progress: 0.18, dir: 1, speed: 0.7, hold: 0, status: 'A Boston coaster, hopping the coast' },
        { id: 'calais-packet', name: 'The Packet', kind: 'coaster', owner: 'The Crown', captain: 'A Cinque Ports man', hull: 62, crew: 10, morale: 75, cargo: { cloth: 3 }, route: 'dover-calais', progress: 0.4, dir: 1, speed: 1.4, hold: 0, status: 'The short hop, twice a week' },
        { id: 'humber-keel', name: 'Humber keel', kind: 'coaster', owner: 'The Hanse', captain: 'A Hull man', hull: 55, crew: 6, morale: 66, cargo: { grain: 10 }, route: 'humber-trent', progress: 0.35, dir: 1, speed: 0.9, hold: 0, status: 'Up the Trent with grain' },
        { id: 'thames-barge', name: 'A Thames barge', kind: 'coaster', owner: 'The Crown', captain: 'Wat of Queenhithe', hull: 50, crew: 5, morale: 60, cargo: { wine: 2, grain: 6 }, route: 'thames', progress: 0.55, dir: 1, speed: 1.1, hold: 0, status: 'Tide-work to Gravesend' },
        { id: 'northumbria', name: 'Saint Cuthbert', kind: 'cog', owner: 'The Hanse', captain: 'A Newcastle factor', hull: 78, crew: 18, morale: 72, cargo: { wool: 16 }, route: 'newcastle-bruges', progress: 0.25, dir: 1, speed: 0.5, hold: 0, status: 'Wool from the Tyne' },
        { id: 'yare-maid', name: 'Yare Maid', kind: 'coaster', owner: 'Dame Fenby', captain: 'A Norwich skipper', hull: 52, crew: 9, morale: 65, cargo: { cloth: 5 }, route: 'norwich-bruges', progress: 0.5, dir: 1, speed: 0.65, hold: 0, status: 'Worstead for the Zwin' },
        { id: 'orwell', name: 'The Orwell', kind: 'cog', owner: 'The Hanse', captain: 'An Ipswich man', hull: 70, crew: 14, morale: 69, cargo: { cloth: 6, wool: 8 }, route: 'ipswich-antwerp', progress: 0.3, dir: 1, speed: 0.58, hold: 0, status: 'For the Scheldt' },
        { id: 'solent-wine', name: 'La Rose', kind: 'hulk', owner: 'The Wine Fleet', captain: 'A Gascon master', hull: 90, crew: 22, morale: 73, cargo: { wine: 20 }, route: 'southampton-bordeaux', progress: 0.22, dir: -1, speed: 0.42, hold: 0, status: 'Coming up from Bordeaux' },
        { id: 'hull-clip', name: 'Good Friday', kind: 'cog', owner: 'The Hanse', captain: 'A Beverley man', hull: 76, crew: 16, morale: 70, cargo: { wool: 14 }, route: 'hull-bruges', progress: 0.4, dir: 1, speed: 0.52, hold: 0, status: 'The clip for Flanders' },
        { id: 'north-cart', name: 'A York wagon', kind: 'cart', owner: 'The Crown', captain: 'A carter', hull: 70, crew: 3, morale: 55, cargo: { grain: 8 }, route: 'great-north-road', progress: 0.45, dir: 1, speed: 1.1, hold: 0, status: "The King's road, northward" },
        { id: 'wolds-train', name: "Ashby pack-train", kind: 'horse', owner: 'player', captain: 'A hireling', hull: 40, crew: 2, morale: 64, cargo: { wool: 4 }, route: 'pack-wolds', progress: 0.4, dir: 1, speed: 1.8, hold: 0, status: 'Four packs over the Wolds' },
      ],
      carts: 1,
    },
    band: structuredClone(BAND),
    deals: [
      { id: 'beurse-wool', title: '60 sacks to van der Beurse', kind: 'contract', party: 'beurse', progress: 0.4, dueDay: dateToDay(1346, 6, 24), reward: '10 marks the sack', icon: 'wool' },
      { id: 'coteler-debt', title: "Coteler's Whitsun instalment", kind: 'debt', party: 'coteler', progress: 0.25, dueDay: dateToDay(1346, 6, 4), reward: '£20 owed', risk: 'Distraint of the warehouse', icon: 'coin' },
      { id: 'roof', title: 'Mend the warehouse roof', kind: 'favour', party: 'agnes', progress: 0.1, dueDay: dateToDay(1346, 5, 1), reward: 'Stops the leak (mostly)', icon: 'warehouse' },
      { id: 'pynchbek', title: 'A quiet word with the Collector', kind: 'shady', party: 'pynchbek', progress: 0, dueDay: dateToDay(1346, 4, 25), reward: 'Lighter scales', risk: '+Heat', icon: 'eye' },
      { id: 'bishop-clip', title: "Buy the Bishop's clip early", kind: 'contract', party: 'bek', progress: 0, dueDay: dateToDay(1346, 6, 24), reward: '80 sacks, cheap', icon: 'mitre' },
    ],
    relations: { people: structuredClone(PEOPLE), factions: structuredClone(FACTIONS) },
    market: buildMarket(),
    routes: structuredClone(ROUTES),
    news: OPENING_NEWS.map((n, i) => ({ ...n, id: 'n' + i, day: d - (OPENING_NEWS.length - i) })),
    rumors: RUMOR_POOL.slice(0, 3).map((r, i) => ({ ...r, id: 'r' + i, day: d - 2 + i })),
    events: { active: [] },
    toasts: [],
    layers: { routes: true, ships: true, labels: true, regions: true, weather: true, influence: false, fog: false, overlay: 'terrain' },
    settings: loadSettings(),
    ui: {
      selected: null, panel: null, panelTab: {}, menu: 'main', layersOpen: false, trackerOpen: false, debugOpen: false, event: null, inGame: false,
      charHudCollapsed: true, minimapCollapsed: true, actionBarOpen: false, followShip: false, newsRead: 0,
    },
  };
}
