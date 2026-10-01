import type { IconName } from '../assets/icons';

export interface Secret {
  id: string;
  about: string;
  text: string;
  known: boolean;
  kind: 'debt' | 'crime' | 'love' | 'book';
  icon: IconName;
}

/** What Edmund thinks he knows — some still sealed. */
export const SECRETS: Secret[] = [
  { id: 'pynchbek-book', about: 'Pynchbek', text: 'Keeps a second set of tronage books.', known: true, kind: 'book', icon: 'scroll' },
  { id: 'fenby-ship', about: 'Dame Fenby', text: 'Her third ship is not in the customs rolls.', known: true, kind: 'crime', icon: 'ship' },
  { id: 'coteler-twice', about: 'Coteler', text: 'Walter paid him twice for the same debt. Wat has the sticks.', known: true, kind: 'debt', icon: 'quill' },
  { id: 'gaunt-warehouse', about: 'Gaunt', text: 'He has already spoken to a thatcher about "his" roof.', known: false, kind: 'love', icon: 'warehouse' },
  { id: 'marlowe-rolls', about: 'Sir Roger', text: 'The Holland pipe roll and the sheriff\'s purse do not agree.', known: false, kind: 'crime', icon: 'eye' },
  { id: 'vane-will', about: 'Lady Margery', text: 'Her will names a cousin in Calais if the Ashby debt is unpaid.', known: false, kind: 'debt', icon: 'scroll' },
  { id: 'heyden-loom', about: 'van der Heyden', text: 'He buys for a loom that is not his. The owner is in Ghent, and angry.', known: false, kind: 'book', icon: 'cloth' },
  { id: 'colby-swan', about: 'Colby', text: 'Drinks at the Swan on Thursdays. Talks when he drinks.', known: true, kind: 'crime', icon: 'wine' },
];
