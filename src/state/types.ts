import type { IconName } from '../assets/icons';
import type { PortraitSpec } from '../assets/textures';

export type GoodId = 'wool' | 'cloth' | 'grain' | 'wine' | 'salt' | 'fish';
export type WeatherKind = 'clear' | 'overcast' | 'rain' | 'storm' | 'fog' | 'snow';
export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';
export type Tone = 'profit' | 'loss' | 'heat' | 'loyalty' | 'gold' | 'neutral';
export type PanelId = 'economy' | 'relations' | 'inventory' | 'character' | 'journal' | 'ledger' | 'help';
export type MenuId = 'main' | 'settings' | 'saves' | 'intro' | null;

export interface Clock {
  /** Days since 1 January 1346 (Julian). */
  day: number;
  /** Minutes since midnight, fractional. */
  minute: number;
  /** 0 = paused. */
  speed: 0 | 1 | 2 | 3;
  /** Speed to resume to when unpausing. */
  lastSpeed: 1 | 2 | 3;
}

export interface Weather {
  kind: WeatherKind;
  /** 0..1 */
  intensity: number;
  /** Wind strength 0..1 and direction in degrees (0 = from north). */
  wind: number;
  windDir: number;
}

export interface Meter {
  value: number;
  max: number;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  icon: IconName;
  desc: string;
}

export interface WardrobeSlot {
  slot: string;
  item: string;
  note: string;
}

export interface Player {
  name: string;
  house: string;
  title: string;
  age: number;
  portrait: PortraitSpec;
  skills: Skill[];
  /** Reputation (legitimacy), heat (attention of the law), nerve, piety... */
  meters: { reputation: Meter; heat: Meter; nerve: Meter; piety: Meter };
  vitals: { health: Meter; vigour: Meter; hunger: Meter };
  wardrobe: WardrobeSlot[];
  conditions: string[];
  location: string;
}

export interface LedgerEntry {
  day: number;
  text: string;
  /** Pence; positive = income. */
  amount: number;
  kind: 'trade' | 'wages' | 'bribe' | 'tax' | 'debt' | 'misc';
  /** True for entries kept off the official books. */
  shadow?: boolean;
}

export interface Debt {
  id: string;
  creditor: string;
  /** Pence outstanding. */
  amount: number;
  dueDay: number;
  interest: string;
}

export interface Money {
  /** Cash in pence (240d = £1, 12d = 1s). */
  pence: number;
  debts: Debt[];
  ledger: LedgerEntry[];
  /** Cash at the end of each recent day, for charts. */
  history: number[];
}

export interface Warehouse {
  id: string;
  name: string;
  town: string;
  condition: number;
  capacity: number;
  stock: Partial<Record<GoodId, number>>;
  notes: string;
}

export type VesselKind = 'cog' | 'hulk' | 'galley' | 'balinger' | 'coaster' | 'cart' | 'horse';

export interface Ship {
  id: string;
  name: string;
  kind: VesselKind;
  owner: 'player' | string;
  captain: string;
  hull: number;
  crew: number;
  /** 0..100, placeholder. */
  morale: number;
  cargo: Partial<Record<GoodId, number>>;
  route: string;
  /** Position along the route polyline 0..1, and direction of travel. */
  progress: number;
  dir: 1 | -1;
  /** Route lengths per game day. */
  speed: number;
  status: string;
  /** Game minutes spent unloading at the current port (0 = under way). */
  hold: number;
  /** Mock map incident; a pulsing mark, clickable. */
  incident?: 'pirates' | 'customs';
}

export interface Retainer {
  id: string;
  name: string;
  role: string;
  loyalty: number;
  wage: number;
  portrait: PortraitSpec;
  trait: string;
  bio: string;
  location: string;
}

export interface Person {
  id: string;
  name: string;
  title: string;
  faction: string;
  town: string;
  /** -100..100 */
  standing: number;
  portrait: PortraitSpec;
  notes: string;
  secret?: string;
  known: boolean;
}

export interface Faction {
  id: string;
  name: string;
  icon: IconName;
  standing: number;
  desc: string;
  /** -1 falling, 0 steady, 1 rising. */
  trend?: -1 | 0 | 1;
  note?: string;
}

export interface Deal {
  id: string;
  title: string;
  kind: 'contract' | 'debt' | 'favour' | 'shady';
  party: string;
  progress: number;
  dueDay: number;
  reward: string;
  risk?: string;
  icon: IconName;
}

export interface MarketEntry {
  /** Pence per unit (sack, bolt, quarter, tun, bushel, barrel). */
  price: number;
  history: number[];
  supply: number;
}

export interface Market {
  towns: Record<string, Record<GoodId, MarketEntry>>;
}

export type RoadGrade = 'king' | 'highway' | 'track';
export type RouteHazard = 'pirates' | 'weather' | 'customs';

export interface Route {
  id: string;
  name: string;
  kind: 'sea' | 'road' | 'river';
  pts: [number, number][];
  owner: 'player' | 'rival' | 'crown' | 'foreign';
  danger: number;
  from: string;
  to: string;
  /** King's road vs cart track. Sea/river ignore this. */
  grade?: RoadGrade;
  hazard?: RouteHazard;
}

export interface NewsItem {
  id: string;
  day: number;
  text: string;
  tag: 'war' | 'trade' | 'church' | 'crown' | 'local' | 'rumour' | 'omen';
  town?: string;
}

export interface Rumor {
  id: string;
  day: number;
  text: string;
  source: string;
  reliability: number;
}

export interface EventChoice {
  label: string;
  hint?: string;
  effects: { text: string; tone: Tone }[];
}

export interface GameEvent {
  id: string;
  title: string;
  body: string;
  icon: IconName;
  art?: string;
  choices: EventChoice[];
}

export interface Toast {
  id: number;
  title: string;
  body?: string;
  icon?: IconName;
  tone?: Tone;
  born: number;
}

export type Selection =
  | { kind: 'town'; id: string }
  | { kind: 'ship'; id: string }
  | { kind: 'person'; id: string }
  | { kind: 'warehouse'; id: string }
  | { kind: 'retainer'; id: string };

export interface Settings {
  uiScale: 'auto' | 1 | 2 | 3;
  reduceMotion: boolean;
  pixelSize: number;
  mapFx: { hillshade: boolean; water: boolean; clouds: boolean; dither: boolean; vignette: boolean; lodBlend: boolean };
  lighting: {
    /** Master HD-2D pass (bloom, tilt-shift, haze). */
    enabled: boolean;
    /** 0..100, default low. */
    glow: number;
    dof: number;
    vignette: number;
    weather: number;
    timeOfDay: number;
  };
  audio: { master: number; music: number; sfx: number };
  tooltips: boolean;
  showFps: boolean;
}

export type MapOverlay = 'terrain' | 'trade' | 'prices' | 'heat' | 'influence' | 'danger' | 'rumors';

export interface Layers {
  routes: boolean;
  ships: boolean;
  labels: boolean;
  regions: boolean;
  weather: boolean;
  influence: boolean;
  fog: boolean;
  overlay: MapOverlay;
}

export interface UiState {
  selected: Selection | null;
  panel: PanelId | null;
  panelTab: Record<string, string>;
  menu: MenuId;
  layersOpen: boolean;
  trackerOpen: boolean;
  debugOpen: boolean;
  event: string | null;
  inGame: boolean;
  charHudCollapsed: boolean;
  minimapCollapsed: boolean;
  actionBarOpen: boolean;
  followShip: boolean;
  newsRead: number;
}

export interface GameState {
  clock: Clock;
  weather: Weather;
  player: Player;
  money: Money;
  assets: { warehouses: Warehouse[]; ships: Ship[]; carts: number };
  band: Retainer[];
  deals: Deal[];
  relations: { people: Person[]; factions: Faction[] };
  market: Market;
  routes: Route[];
  news: NewsItem[];
  rumors: Rumor[];
  events: { active: string[] };
  toasts: Toast[];
  layers: Layers;
  settings: Settings;
  ui: UiState;
}
