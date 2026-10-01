import { lsd } from '../state/time';
import type { Tone } from '../state/types';

export { lsd, formatDate, shortDate, clockText, canonicalHour, seasonOf, feastOf, ordinal, bannerDate } from '../state/time';

export function standingWord(n: number): string {
  if (n <= -40) return 'Hostile';
  if (n <= -8) return 'Wary';
  if (n < 20) return 'Neutral';
  if (n < 55) return 'Friendly';
  return 'Devoted';
}

export function standingTone(n: number): Tone {
  if (n < -10) return 'loss';
  if (n > 20) return 'loyalty';
  return 'neutral';
}

export function moneyTone(pence: number): Tone {
  if (pence < 0) return 'loss';
  if (pence < 240) return 'heat';
  return 'gold';
}

export function signedLsd(pence: number): string {
  if (pence > 0) return '+' + lsd(pence);
  return lsd(pence);
}

/** Reputation title that shifts with legitimacy and heat. */
export function reputationTitle(rep: number, heat: number): string {
  if (heat >= 78) return 'The Man Behind the Counting House';
  if (heat >= 55) return 'Whispered-About';
  if (rep < 28) return 'Struggling Heir';
  if (rep < 50) return 'Young Woolman';
  if (rep < 72) return 'Respected Merchant';
  return 'The Man Behind the Counting House';
}

export function bandLoyalty(band: { loyalty: number }[]): number {
  if (!band.length) return 50;
  return Math.round(band.reduce((a, b) => a + b.loyalty, 0) / band.length);
}
