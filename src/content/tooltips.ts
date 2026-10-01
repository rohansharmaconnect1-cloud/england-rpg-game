import type { Tone } from '../state/types';

export interface TipSpec {
  title: string;
  desc?: string;
  effects?: { text: string; tone: Tone }[];
  hotkey?: string;
}

/** Static tooltip text, referenced by id from `data-tip`. Dynamic tooltips are built in code. */
export const TIPS: Record<string, TipSpec> = {
  money: { title: 'Purse', desc: 'Coin in hand. 12 pence to the shilling, 20 shillings to the pound.' },
  debt: { title: 'Debts', desc: "Your father's debts are now yours. Creditors are patient only until they are not.", effects: [{ text: 'Coteler of Lincoln is owed most', tone: 'loss' }] },
  heat: { title: 'Heat', desc: 'How closely sheriffs, customs men and the Church are watching you.', effects: [{ text: 'Bribes, fronts and contraband raise it', tone: 'heat' }, { text: 'High heat invites audits and arrests', tone: 'loss' }, { text: 'Quiet trade and piety lower it', tone: 'profit' }] },
  reputation: { title: 'Reputation', desc: 'Your standing as an honest merchant. Opens guild doors and lowers interest.', effects: [{ text: 'Falls when shady dealings come to light', tone: 'loss' }, { text: 'Honest bargains and gifts raise it', tone: 'profit' }] },
  loyalty: { title: 'Band loyalty', desc: 'The average loyalty of your household and hirelings.', effects: [{ text: 'Unpaid wages hurt loyalty', tone: 'loss' }, { text: 'Gifts, shares and Friday pay raise it', tone: 'loyalty' }] },
  speed: { title: 'Pace of time', desc: 'Pause, or let the days run at one of three speeds.', hotkey: 'Space' },
  crier: { title: 'The Town Crier', desc: 'News, proclamations and gossip from across the realm. Click to open the journal.' },
  tracker: { title: 'Deals & Tasks', desc: 'Contracts, debts and favours that are still open.' },
  minimap: { title: 'The Realm', desc: 'Click or drag to move the view.' },
  layers: { title: 'Map layers', desc: 'Choose what is drawn on the map.', hotkey: 'M' },
  glow: { title: 'Glow', desc: 'Soft bloom on sunlit fields, water glints, windows and lanterns. Keep it low.' },
  dof: { title: 'Depth of field', desc: 'A gentle tilt-shift blur at the top and bottom of the board.' },
  tod: { title: 'Time of day', desc: 'Warm morning, noon, gold dusk and cool night, driven by the clock.' },
  health: { title: 'Health', desc: 'Wounds, fevers and the damp of the fens.' },
  vigour: { title: 'Energy', desc: 'Stamina for travel, haggling and late nights. Spends with actions; rest restores it.' },
  hunger: { title: 'Hunger', desc: 'Fast days are many. Keep bread in your satchel.' },
  nerve: { title: 'Nerve', desc: 'Composure under pressure: bribes, threats and bishops.' },
  stress: { title: 'Stress', desc: 'The inverse of nerve. High stress slumps the heir and shortens his patience.' },
  piety: { title: 'Piety', desc: 'How the Church and the godly regard you.' },
  legitimacy: { title: 'Legitimacy', desc: 'Your standing as an honest merchant. Woad when thin, gold when the guild nods.', effects: [{ text: 'Opens guild doors and lowers interest', tone: 'profit' }, { text: 'Falls when shady dealings come to light', tone: 'loss' }] },
};
