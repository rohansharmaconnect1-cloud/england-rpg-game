import type { NewsItem, Rumor } from '../state/types';

type NewsSeed = Omit<NewsItem, 'id' | 'day'>;
type RumorSeed = Omit<Rumor, 'id' | 'day'>;

/** Already cried when the game begins. */
export const OPENING_NEWS: NewsSeed[] = [
  { tag: 'local', town: 'boston', text: 'Walter Ashby, woolmonger, buried at St Botolph\'s. The guild sent a candle. His creditors sent letters.' },
  { tag: 'crown', text: 'The King summons ships of forty tuns and more to gather at Portsmouth. Shipmasters grumble.' },
  { tag: 'trade', text: 'The great Bardi bank of Florence has stopped its payments. Men with Italian letters look pale.' },
  { tag: 'war', text: 'French galleys seen off Winchelsea. The Cinque Ports light their beacons.' },
];

/** Drawn at random by the drift ticker. Some foreshadow what 1348 will bring. */
export const NEWS_POOL: NewsSeed[] = [
  { tag: 'crown', text: 'Royal purveyors seize wool at Hull "for the King\'s great need". Receipts are promised.' },
  { tag: 'trade', text: 'Wool at Bruges up a shilling the sack. Ghent\'s looms are hungry.' },
  { tag: 'trade', text: 'A Hanse cog unloads Baltic wax and furs at Boston. The Easterlings pay in good silver.' },
  { tag: 'war', text: 'Sir Walter Manny holds Aiguillon against the Duke of Normandy. The siege drags on.' },
  { tag: 'church', text: 'The Bishop of Lincoln preaches against usury. Several moneylenders attend, piously.' },
  { tag: 'local', town: 'boston', text: 'The Haven silts again. Deep-bellied cogs must wait for the spring tide.' },
  { tag: 'omen', text: 'Genoese sailors at Southampton speak of a sickness among the Tartars besieging Caffa.' },
  { tag: 'omen', text: 'A pedlar swears the sea off Sicily ran red. He also swears he is a knight.' },
  { tag: 'rumour', text: 'They say the King means to land in Normandy, not Gascony. They say a great many things.' },
  { tag: 'crown', text: 'A new subsidy of wool is granted to the King: every sack exported to pay 40 shillings.' },
  { tag: 'trade', text: 'Salt dear at Sluys after the Bourgneuf fleet was scattered by storms.' },
  { tag: 'local', town: 'lincoln', text: 'Sheriff de Lacy hangs two cattle thieves at Lincoln. A third was his cousin, and walked.' },
  { tag: 'war', text: 'The Scots are stirring on the March. Berwick doubles its watch.' },
  { tag: 'omen', text: 'Astrologers at Paris warn of a conjunction of Saturn, Jupiter and Mars. They are not specific.' },
  { tag: 'trade', text: 'Gascon wine scarce with the war. A tun fetches £5 in London.' },
  { tag: 'church', text: 'A pardoner at Boston fair sells relics of St Botolph. There seem to be several left feet.' },
  { tag: 'local', town: 'boston', text: 'The Fenby cog Katherine returns early, riding high in the water. No one saw her unload.' },
  { tag: 'omen', text: 'In Constantinople, it is said, the dead are carried out by the cartload. Merchants shrug: it is far away.' },
];

export const RUMOR_POOL: RumorSeed[] = [
  { source: 'Agnes Pike', reliability: 0.8, text: 'Pynchbek\'s clerk drinks at the Swan on Thursdays, and he talks when he drinks.' },
  { source: 'A Fenland boatman', reliability: 0.5, text: 'There is a creek past Wainfleet where no customs man has set foot since Candlemas.' },
  { source: 'Old Wat', reliability: 0.9, text: 'Your father paid Coteler twice for the same debt. Wat kept the tallies. Coteler did not.' },
  { source: 'A Genoese sailor', reliability: 0.4, text: 'Caffa\'s besiegers threw their dead over the walls. The sailor who told it had a cough.' },
  { source: 'Brother Anselm', reliability: 0.7, text: 'The Bishop needs coin quickly for the chapter house roof, and will sell next year\'s clip cheap.' },
  { source: 'A Bruges broker', reliability: 0.6, text: 'Ghent will pay anything for English wool before the King\'s embargo — if there is an embargo.' },
  { source: 'Tavern talk', reliability: 0.3, text: 'Dame Fenby\'s third ship is sailing wool to Calais. To the French.' },
];
