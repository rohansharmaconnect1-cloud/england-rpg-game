/** Flavour and facts for the Inspector. Keys are settlement ids (see world/settlements.ts). */
export interface TownInfo {
  realm: string;
  lord: string;
  people: number;
  blurb: string;
  exports: string[];
  notables?: string[];
  mood?: string;
  tags?: string[];
  customs?: string;
  /** 0–100, how closely the custom watches this quay. */
  heatRisk?: number;
}

export function townTags(id: string, info?: TownInfo): string[] {
  if (info?.tags?.length) return info.tags;
  if (id === 'ypres' || id === 'norwich') return ['Cloth Market'];
  if (info?.exports.some((e) => /wool/i.test(e))) return ['Wool Staple'];
  return [];
}

export function townHeat(info?: TownInfo): number {
  return info?.heatRisk ?? 30;
}

export const TOWNS: Record<string, TownInfo> = {
  boston: {
    realm: 'Kingdom of England · Lincolnshire', lord: 'John of Gaunt, Earl of Richmond (aged six)', people: 5500,
    blurb: "St Botolph's town. Second port of the realm for wool, and the house of Ashby's home. The Haven silts, the Hanse lords it over the quay, and the fair each June draws half of Europe.",
    exports: ['Wool', 'Salt', 'Lead'], notables: ['pynchbek', 'colby', 'fenby', 'gaunt', 'fenwick'], mood: 'Wary of the new heir',
    tags: ['Wool Staple', 'Guild Stronghold'],
    customs: 'Tronage at the quay. Forty shillings the sack exported, if Pynchbek is honest that day.',
    heatRisk: 62,
  },
  london: {
    realm: 'Kingdom of England · Middlesex', lord: 'The Mayor & Aldermen', people: 45000,
    blurb: 'The great city. Italian bankers on Lombard Street, the Steelyard of the Easterlings, and a Chamberlain who counts every penny that passes the Tower.',
    exports: ['Cloth', 'Wine', 'Coin'], notables: ['lapo'], mood: 'Hungry for the war',
    tags: ['Cloth Market', 'Guild Stronghold'],
    customs: 'The Great Custom, the petty custom, and a Chamberlain who invents a third.',
    heatRisk: 58,
  },
  lincoln: {
    realm: 'Kingdom of England · Lincolnshire', lord: 'Thomas Bek, Bishop of Lincoln', people: 6000,
    blurb: 'A cathedral city on its hill, spire taller than any in Christendom. Its cloth trade is fading; its moneylenders are not.',
    exports: ['Wool', 'Grain'], notables: ['coteler', 'bek', 'lacy', 'marlowe', 'vane'], mood: 'Pious and indebted',
    tags: ['Wool Staple', 'Cathedral city'],
    customs: 'The Bishop takes his tenth before the sheriff takes his fifth.',
    heatRisk: 48,
  },
  york: { realm: 'Kingdom of England · Yorkshire', lord: 'The Archbishop of York', people: 11000, blurb: 'Capital of the North and staging post for the Scottish wars. The Minster is still a-building.', exports: ['Wool', 'Cloth', 'Lead'] },
  hull: { realm: 'Kingdom of England · Yorkshire', lord: 'The King (a royal borough)', people: 3000, blurb: "Kingston upon Hull, Edward I's own port. The King's purveyors seize wool here first.", exports: ['Wool', 'Herring'] },
  lynn: { realm: 'Kingdom of England · Norfolk', lord: 'The Bishop of Norwich', people: 5000, blurb: 'Grain from the Fens goes out; timber, furs and Hanse wax come in.', exports: ['Grain', 'Salt'], notables: ['ashcroft'] },
  norwich: { realm: 'Kingdom of England · Norfolk', lord: 'The Bishop of Norwich', people: 12000, blurb: 'Worsted-weavers and wealthy friars. Flemish weavers have settled here at the King\'s invitation.', exports: ['Worsted cloth'] },
  yarmouth: { realm: 'Kingdom of England · Norfolk', lord: 'The Barons of the Cinque Ports (at the Free Fair)', people: 4000, blurb: 'Herring by the million each autumn, and a feud with the Cinque Ports that is older than anyone living.', exports: ['Herring'], tags: ["Smuggler's Haven"], heatRisk: 35 },
  southampton: { realm: 'Kingdom of England · Hampshire', lord: 'The King', people: 3500, blurb: 'Genoese carracks and Venetian galleys unload here. Still rebuilding after the French burned it in 1338.', exports: ['Wine', 'Wool'] },
  bristol: { realm: 'Kingdom of England · Gloucestershire', lord: 'The Lord Berkeley', people: 10000, blurb: 'Wine from Gascony, cloth to Ireland, and merchants who look west.', exports: ['Cloth', 'Wine'] },
  calais: { realm: 'Kingdom of France · Artois', lord: 'Jean de Vienne, for King Philip', people: 7000, blurb: "A nest of privateers on the Narrow Sea. English merchants say the King covets it. The Calesiens say let him try.", exports: ['Fish', 'Salt'], mood: 'Braced for war', tags: ["Smuggler's Haven"], customs: 'Whoever holds the harbour, takes the tax.', heatRisk: 80 },
  bruges: {
    realm: 'County of Flanders', lord: 'Count Louis de Nevers (fled to France) · the Three Towns rule', people: 46000,
    blurb: 'The market of the world. Lombards, Hansards and Castilians trade in the square by the House of van der Beurse. Every loom here eats English wool.',
    exports: ['Cloth', 'Spices', 'Credit'], notables: ['beurse', 'heyden'], mood: 'Bustling, anxious',
    tags: ['Cloth Market', 'Wool Staple'],
    customs: 'The Three Towns take a broker\'s cut. Englishmen pay it or wait at Sluys.',
    heatRisk: 28,
  },
  ghent: { realm: 'County of Flanders', lord: 'The Weavers (after Artevelde\'s murder)', people: 60000, blurb: 'Largest city north of Paris. Its weavers killed their own captain last summer. Wool is their bread.', exports: ['Broadcloth'], mood: 'Seething', tags: ['Cloth Market'], heatRisk: 40 },
  ypres: { realm: 'County of Flanders', lord: 'The Échevins', people: 28000, blurb: 'The Cloth Hall is longer than a cathedral. Scarlet of Ypres fetches kings\' ransoms.', exports: ['Scarlet cloth'] },
  sluys: { realm: 'County of Flanders', lord: 'The Count\'s bailiff', people: 5000, blurb: 'The outport of Bruges, where the King smashed the French fleet in 1340. Masts still rot in the Zwin.', exports: ['Salt', 'Wine'] },
  antwerp: { realm: 'Duchy of Brabant', lord: 'Duke John III', people: 18000, blurb: 'The Brabançon rival to Bruges; the English Staple sat here for a while.', exports: ['Cloth', 'Grain'] },
  rouen: { realm: 'Kingdom of France · Normandy', lord: 'The Duke of Normandy', people: 40000, blurb: 'Seine port and arsenal of the French galleys. Not a place to be caught with English wool.', exports: ['Wine', 'Salt'], mood: 'Hostile' },
  dover: { realm: 'Kingdom of England · Kent', lord: 'The Constable of Dover', people: 2500, blurb: 'Key of the Cinque Ports. The castle watches the Narrow Sea; the harbour takes the Calais packet.', exports: ['Fish', 'Wool'], tags: ["Smuggler's Haven"], heatRisk: 55, customs: 'Cinque Ports custom, and a constable who likes to watch.' },
  exeter: { realm: 'Kingdom of England · Devon', lord: 'The Bishop of Exeter', people: 4000, blurb: 'Cathedral city of the west, tin and cloth moving down to the Exe.', exports: ['Cloth', 'Tin'] },
  newcastle: { realm: 'Kingdom of England · Northumberland', lord: 'The King', people: 4500, blurb: 'Coal and wool at the Tyne. The castle still remembers the Scots.', exports: ['Wool', 'Coal'] },
  canterbury: { realm: 'Kingdom of England · Kent', lord: 'The Archbishop of Canterbury', people: 8000, blurb: "Becket's shrine draws Christendom. Pilgrims buy; the monks sell.", exports: ['Wool'] },
  winchester: { realm: 'Kingdom of England · Hampshire', lord: 'The Bishop of Winchester', people: 5500, blurb: 'Old capital. The bishop is richer than most earls, and the wool staple still remembers the city.', exports: ['Wool', 'Cloth'] },
  chester: { realm: 'Kingdom of England · Cheshire', lord: 'The Earl of Chester (the Black Prince)', people: 3500, blurb: 'Gate to Wales. Irish boats and Dee salmon, and a castle that looks west.', exports: ['Salt', 'Fish'] },
  ipswich: { realm: 'Kingdom of England · Suffolk', lord: 'The King', people: 4000, blurb: 'Orwell haven. Cloth to Flanders, wine coming back, and a quay that never sleeps at the spring tides.', exports: ['Cloth', 'Wool'] },
  plymouth: { realm: 'Kingdom of England · Devon', lord: 'The Priory of Plympton', people: 2500, blurb: 'A deep western harbour. Gascon cogs put in for water, and the French know the way.', exports: ['Fish', 'Tin'] },
  coventry: { realm: 'Kingdom of England · Warwickshire', lord: 'Queen Isabella (the manor)', people: 7000, blurb: 'A market town grown fat on wool. The spire is new; the drapers are newer.', exports: ['Wool', 'Cloth'] },
  bordeaux: { realm: 'Duchy of Aquitaine (held of the King of England)', lord: 'The Seneschal of Gascony', people: 30000, blurb: 'The wine of the English kings. Tuns go north with every fair wind; the French would like them not to.', exports: ['Wine'], mood: 'Loyal, thirsty' },
  bayonne: { realm: 'Duchy of Aquitaine · Labourd', lord: 'The Mayor & jurats', people: 8000, blurb: 'Basque sailors, English colours, and the last friendly port before Spain. Whales in season; wine always.', exports: ['Wine', 'Salt'] },
};
