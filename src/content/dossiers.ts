import { C } from '../assets/palette';
import type { PortraitSpec } from '../assets/textures';
import type { Person, Retainer } from '../state/types';

export interface Dossier {
  wants: string;
  fears: string;
  quote: string;
  /** Pence; null if they will not take a purse. */
  bribe: number | null;
  last: string;
  wouldDo: string;
  wouldTurn: string;
  history: { day: number; text: string }[];
}

const START = 107; // 18 April 1346, used only as flavour dates

export const DOSSIERS: Record<string, Dossier> = {
  wat: {
    wants: 'The books to balance, and a quiet pint after vespers.',
    fears: 'That you sell the warehouse and put him on the parish.',
    quote: 'Your father was a fool with coin. You might yet be less of one.',
    bribe: null,
    last: 'Walked you through the second tally. His hands shook.',
    wouldDo: 'Lie to a sheriff, if the lie is small and the ale is paid.',
    wouldTurn: 'If you cheat the band of Friday\'s wage.',
    history: [
      { day: START - 12, text: 'Buried your father. Kept the keys.' },
      { day: START - 2, text: 'Showed you the second book.' },
    ],
  },
  pynchbek: {
    wants: 'A quiet purse, and the King\'s wool counted twice.',
    fears: 'Audit from Westminster. His second book.',
    quote: 'Forty sacks in the warehouse. Thirty-two in my book. Shall we understand one another?',
    bribe: 720,
    last: 'Weighed twelve sacks and found them light, or said he did.',
    wouldDo: 'Look the other way at the tronage, once.',
    wouldTurn: 'If you boast, or if a rival pays more.',
    history: [
      { day: START - 3, text: 'Custom on twelve sacks. His scales.' },
      { day: START - 2, text: 'A gift to the tronager, off the books.' },
    ],
  },
  colby: {
    wants: 'Pynchbek\'s stool, and a house that does not flood.',
    fears: 'Being the man who missed Fenby\'s third ship.',
    quote: 'The Collector counts. I write. Writing can be… generous.',
    bribe: 240,
    last: 'Took your letter and did not open it at the quay.',
    wouldDo: 'Misplace a roll for a week.',
    wouldTurn: 'If Pynchbek notices, or if you fail to pay.',
    history: [{ day: START - 5, text: 'Copied a customs roll for Anselm. Slowly.' }],
  },
  lacy: {
    wants: 'Rents, respect, and a hanging now and then.',
    fears: 'The King asking where the Lincolnshire subsidy went.',
    quote: 'The law is a sword. I am the man who holds it.',
    bribe: 1440,
    last: 'Rode past the warehouse and did not stop. Yet.',
    wouldDo: 'Ignore a smuggler, if the smuggler is not too loud.',
    wouldTurn: 'If the Crown sends a second sheriff.',
    history: [{ day: START - 8, text: 'Collected the King\'s rent. And his own.' }],
  },
  marlowe: {
    wants: 'Silver that does not appear in the pipe rolls.',
    fears: 'A writ from the Exchequer, or a widow who talks.',
    quote: 'Justice is dear in Holland. Cheaper if you pay in advance.',
    bribe: 960,
    last: 'Sent two men to "inspect" the Haven. They left with salt.',
    wouldDo: 'Lose a warrant in the fen fog.',
    wouldTurn: 'If you refuse him twice, or if Fenby pays first.',
    history: [{ day: START - 4, text: 'Called at the guildhall. Asked after your debts.' }],
  },
  gaunt: {
    wants: 'Your warehouse, and the guild to remember who buried Walter.',
    fears: 'A young heir who actually keeps the trade.',
    quote: 'The stall was your father\'s. Stalls pass to those who can pay the dues.',
    bribe: null,
    last: 'Gave a fine speech at the funeral. Looked at the keys.',
    wouldDo: 'Vote you a stall, if the arrears are paid.',
    wouldTurn: 'If you deal with smugglers in sight of St Mary\'s.',
    history: [{ day: START - 12, text: 'Buried Walter Ashby. Praised him. Wanted the warehouse.' }],
  },
  fenwick: {
    wants: 'The Staple\'s favour, and Boston wool in his own ships.',
    fears: 'Being outbid by a boy with a Flemish friend.',
    quote: 'The Staple is a brotherhood. Brothers pay.',
    bribe: 480,
    last: 'Offered to "help" with the Bruges run. At a brother\'s price.',
    wouldDo: 'Introduce you to a Calais buyer.',
    wouldTurn: 'If you undercut him at the June fair.',
    history: [{ day: START - 6, text: 'Drank your father\'s health. Counted your sacks with his eyes.' }],
  },
  fenby: {
    wants: 'Your ruin, politely arranged.',
    fears: 'Her third ship appearing in the customs rolls.',
    quote: 'Walter was a man. You are a mourning hood.',
    bribe: null,
    last: 'Smiled at the funeral. Her cog came home light.',
    wouldDo: 'Nothing for you. Something against you, gladly.',
    wouldTurn: 'She already has.',
    history: [
      { day: START - 12, text: 'Sent a candle. Did not come in.' },
      { day: START - 1, text: 'The Katherine riding high in the Wash.' },
    ],
  },
  ashcroft: {
    wants: 'The Lynn–Bruges run that was your father\'s in a fat year.',
    fears: 'Being the second Fenby — rich, and hated.',
    quote: 'Wool is wool. Houses are houses. Yours is open.',
    bribe: 360,
    last: 'Offered to take your Lincoln clip "off your hands".',
    wouldDo: 'Buy your wool cheap, and call it mercy.',
    wouldTurn: 'If you take the Bruges price he wanted.',
    history: [{ day: START - 7, text: 'A letter from Lynn. Condolences, then an offer.' }],
  },
  coteler: {
    wants: 'His money, with the "gift" of two pence in the shilling.',
    fears: 'A King who cancels Italian debts and English ones after.',
    quote: 'I am patient. Winter is patient. Michaelmas is not.',
    bribe: null,
    last: 'Took five pounds. Wrote it in a fair hand.',
    wouldDo: 'Extend a month, at a price.',
    wouldTurn: 'If the Whitsun instalment fails. Distraint.',
    history: [{ day: START - 1, text: 'Instalment received. The rest remains.' }],
  },
  vane: {
    wants: 'The Ashby name attached to a marriage, or to a sale.',
    fears: 'Dying owed by a boy who drinks.',
    quote: 'Your mother was a Vane. The blood remembers the silver.',
    bribe: null,
    last: 'A letter on good parchment. No threat. Yet.',
    wouldDo: 'Wait until Martinmas, if you write like a nephew.',
    wouldTurn: 'If you pawn the signet, or wed without her leave.',
    history: [{ day: START - 10, text: 'Sent condolences, and a reminder of forty pounds.' }],
  },
  bek: {
    wants: 'The best price for the Church\'s clip, and a chapter house that does not leak.',
    fears: 'Usurers in the cathedral\'s shadow — unless they pay the fabric fund.',
    quote: 'Wool is God\'s grass. The tenth is God\'s.',
    bribe: null,
    last: 'Preached against usury. Coteler attended.',
    wouldDo: 'Sell you next year\'s clip early, if the roof is leaking enough.',
    wouldTurn: 'If you cheat the custom in Lincoln, in sight of the spire.',
    history: [{ day: START - 9, text: 'Allowed the funeral mass. Charged for the candles.' }],
  },
  aldous: {
    wants: 'A see that listens, and wool tithes paid in kind, not promises.',
    fears: 'Edward\'s purveyors stripping the abbey barns.',
    quote: 'Kings go to France. Bishops stay, and count sheep.',
    bribe: null,
    last: 'Stopped at Boston on the way to the Convocation. Blessed the Haven. Asked the price of salt.',
    wouldDo: 'A letter to a prior who buys wool.',
    wouldTurn: 'If you smuggle on a Sunday, or starve his tenants.',
    history: [{ day: START - 14, text: 'A blessing, a look at the warehouse, no coin changed.' }],
  },
  beurse: {
    wants: 'English wool, honestly weighed, before Ghent eats the market.',
    fears: 'Embargo, and the Count coming home with French spears.',
    quote: 'Your father\'s sacks never lied. Do yours?',
    bribe: null,
    last: 'A contract: sixty sacks, ten marks the sack, Midsummer.',
    wouldDo: 'Pay on the nail, and find you a loom that is hungry.',
    wouldTurn: 'If a sack is short, or if you sell to his rival first.',
    history: [{ day: START - 20, text: 'Wrote to Walter. The letter came to you.' }],
  },
  heyden: {
    wants: 'Cheap English fleece for the Green Hall looms, and no Staple middleman.',
    fears: 'Ghent\'s weavers closing the gates again.',
    quote: 'Bruges buys. Ghent weaves. England shears. Be the shears.',
    bribe: 180,
    last: 'Sent a sample of Bruges prices. Higher than Wat believed.',
    wouldDo: 'Meet a cog at Sluys without a broker.',
    wouldTurn: 'If you deal with van der Beurse and tell him.',
    history: [{ day: START - 11, text: 'A scrap of paper in Anselm\'s hand. Prices.' }],
  },
  lapo: {
    wants: 'A partner who is not yet ruined, to share a King\'s bad debt.',
    fears: 'Florence learning he is still writing bills.',
    quote: 'The King will not pay. Someone must.',
    bribe: 600,
    last: 'Not yet. He is a rumour in Lombard Street.',
    wouldDo: 'Discount a bill, if you look solvent.',
    wouldTurn: 'The moment a better fool arrives.',
    history: [],
  },
  hanse: {
    wants: 'The Boston steelyard left alone, and silver on the nail.',
    fears: 'English riots, and a King who "borrows" Hanse cogs.',
    quote: 'We pay. On time. Remember that, boy.',
    bribe: null,
    last: 'Bought eight sacks. Paid. Did not smile.',
    wouldDo: 'Buy again, if the wool is packed as packed last time.',
    wouldTurn: 'A short sack, or a slight in the alehouse.',
    history: [{ day: START - 6, text: 'Eight sacks. Good silver.' }],
  },
  agnes: {
    wants: 'The roof mended, and the gossip to keep flowing.',
    fears: 'Rats in the wool, and you selling her keys to Gaunt.',
    quote: 'I can find anything by Thursday. Thursday costs extra.',
    bribe: 48,
    last: 'Showed you the leak. Trod on a rat. Did not apologise to it.',
    wouldDo: 'Hide a bale, or find a buyer who does not ask.',
    wouldTurn: 'If you lock her out, or if Dunstan is unpaid and bored.',
    history: [{ day: START - 1, text: 'Counted the salt. It was less than Wat thought.' }],
  },
  hugh: {
    wants: 'A Friday in port, and no priest in the forecastle.',
    fears: 'Pirates, and a boy who orders him to sail on a fast day.',
    quote: 'The Margery has never wrecked. Keep it that way.',
    bribe: null,
    last: 'Took twenty-four sacks for Sluys. Would not wait for a blessing.',
    wouldDo: 'Hold a course you do not like, if the wool is yours.',
    wouldTurn: 'A Friday sailing, or a hidden compartment he was not told of.',
    history: [{ day: START, text: 'Cast off on the morning tide.' }],
  },
  dunstan: {
    wants: 'Friday\'s wage, in silver, in his hand.',
    fears: 'A master who talks of honour instead of coin.',
    quote: 'I stood at Halidon. I can stand in a warehouse.',
    bribe: 60,
    last: 'Walked the quay at dusk. Counted nothing but the days until Friday.',
    wouldDo: 'Stand in a doorway and look like a problem.',
    wouldTurn: 'A missed Friday, or a better purse from Fenby.',
    history: [{ day: START - 3, text: 'Hired after the funeral. Asked when he would be paid.' }],
  },
  anselm: {
    wants: 'A quiet cell, and letters that are true enough.',
    fears: 'His prior asking where the extra candles came from.',
    quote: 'I write what you tell me. God reads the rest.',
    bribe: null,
    last: 'Copied the Beurse contract in a hand that would shame a chancery clerk.',
    wouldDo: 'Write a letter that is almost honest.',
    wouldTurn: 'If you make him lie in a mass, or starve the poor box.',
    history: [{ day: START - 2, text: 'Wrote to Bruges. Sealed it with the fleece.' }],
  },
};

export function dossierOf(id: string): Dossier {
  return DOSSIERS[id] ?? {
    wants: 'What any soul wants: not to be poorer tomorrow.',
    fears: 'The usual: the sheriff, the sea, the next winter.',
    quote: 'We have not spoken enough for a proverb.',
    bribe: 120,
    last: 'A nod in the street. Nothing more.',
    wouldDo: 'A small favour, if it is cheap.',
    wouldTurn: 'A slight, or a better purse.',
    history: [],
  };
}

export function asPersonCard(b: Retainer): Person {
  return {
    id: b.id,
    name: b.name,
    title: b.role,
    faction: 'staff',
    town: b.location === 'at sea' ? 'boston' : b.location,
    standing: Math.round((b.loyalty - 50) * 2),
    portrait: b.portrait,
    notes: b.bio,
    known: true,
  };
}

export const PLAYER_FACE: PortraitSpec = {
  seed: 'edmund', skin: 'fair', hair: C.umber, hat: 'none', garb: C.plum, trim: C.stone, age: 'young', bg: C.woadDeep,
};
