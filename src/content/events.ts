import type { GameEvent } from '../state/types';

export const EVENTS: GameEvent[] = [
  {
    id: 'collector', icon: 'scales', title: "The Collector's Visit",
    body: 'Master Pynchbek arrives unannounced with his clerk and his scales. "Forty sacks in the Ashby warehouse," he says, "and only thirty-two in my book. Shall we count them together, young master, or shall we understand one another?"',
    choices: [
      { label: 'Count them together', hint: 'Honest. Expensive.', effects: [{ text: '−£10 16s custom', tone: 'loss' }, { text: '+5 Reputation', tone: 'profit' }] },
      { label: 'Understand one another', hint: 'A purse changes hands.', effects: [{ text: '−£3 bribe', tone: 'loss' }, { text: '+8 Heat', tone: 'heat' }, { text: 'Pynchbek remembers', tone: 'neutral' }] },
      { label: 'Send for Old Wat and his tallies', hint: 'Letters & Tallies 4', effects: [{ text: 'Chance to prove the book wrong', tone: 'gold' }] },
    ],
  },
  {
    id: 'leak', icon: 'warehouse', title: 'Rain in the Warehouse',
    body: 'Agnes finds you at dawn. The north roof has given way in the night and water is running over the Lindsey fleeces. "Six sacks wet through," she says. "Dry them, sell them quick, or tell the Flemings they\'re heavier for it."',
    choices: [
      { label: 'Pay a thatcher and dry them', effects: [{ text: '−£1 4s', tone: 'loss' }, { text: 'Warehouse +10', tone: 'profit' }] },
      { label: 'Sell them wet, by weight', hint: 'Guile 2', effects: [{ text: '+£4', tone: 'profit' }, { text: '−6 Reputation if caught', tone: 'loss' }] },
    ],
  },
  {
    id: 'letter', icon: 'scroll', title: 'A Letter from Bruges',
    body: 'Sealed in green wax: "To the son of my good friend Walter. I will take sixty sacks of Lindsey wool at 10 marks the sack, delivered to Sluys before St John\'s Day. Your father never once let me down. — P. van der Beurse"',
    choices: [
      { label: 'Accept the contract', effects: [{ text: 'New deal: 60 sacks to Sluys', tone: 'gold' }, { text: '+10 standing, Flemings', tone: 'loyalty' }] },
      { label: 'Ask for a better price', hint: 'Haggling 3', effects: [{ text: 'Risky: he may go to Fenby', tone: 'heat' }] },
      { label: 'Decline politely', effects: [{ text: 'No change', tone: 'neutral' }] },
    ],
  },
  {
    id: 'purveyor', icon: 'crown', title: "The King's Purveyor",
    body: 'A royal purveyor with a warrant and six archers wants "the King\'s portion" of your stock for the army gathering at Portsmouth. He offers a tally — a wooden promise that the Exchequer will pay. Eventually.',
    choices: [
      { label: 'Accept the King\'s tally', effects: [{ text: '−10 sacks wool', tone: 'loss' }, { text: '+10 Crown standing', tone: 'loyalty' }] },
      { label: 'Hide the good wool in the fen', hint: 'Fenland Smugglers', effects: [{ text: '+12 Heat', tone: 'heat' }, { text: 'Keep your wool', tone: 'profit' }] },
    ],
  },
  {
    id: 'pirates', icon: 'skull', title: 'No Colours Flying',
    body: 'A Norman balinger has come up on the Southampton run with oars out and no flag. The Cog Thomas signals: "Will you have the King\'s ships close, or will you pay a fishing-boat to look the other way?"',
    choices: [
      { label: 'Hail the Cog Thomas', hint: 'The Crown notices', effects: [{ text: 'Privateers driven off', tone: 'profit' }, { text: '+6 Crown standing', tone: 'loyalty' }] },
      { label: 'Pay the lookouts', hint: 'A purse at Winchelsea', effects: [{ text: '−£2', tone: 'loss' }, { text: '+5 Heat', tone: 'heat' }] },
      { label: 'Leave it to Hugh', effects: [{ text: 'The Margery holds her course', tone: 'neutral' }] },
    ],
  },
  {
    id: 'customs-at-sea', icon: 'tower', title: 'A Boat from the Collector',
    body: 'The Katherine is riding high in the Wash, and a customs boat has put out from Boston. Pynchbek\'s clerk waves a warrant. "Dame Fenby\'s cog, master — but your warehouse is the nearest dry ground. We will count on your quay."',
    choices: [
      { label: 'Let them use the quay', effects: [{ text: 'Fenby is seen', tone: 'gold' }, { text: '+4 Reputation', tone: 'profit' }] },
      { label: 'The quay is full', hint: 'A lie they may remember', effects: [{ text: '+8 Heat', tone: 'heat' }, { text: 'Fenby owes you a word', tone: 'neutral' }] },
    ],
  },
];

export const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));
