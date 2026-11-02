import type { Frequency, ISODate, MonthKey } from '../types';
import { addDays, dayDiff, daysInMonth, firstDay, lastDay, monthDiff, monthOf, parseISO } from './dates';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  hebdomadaire: 'Chaque semaine',
  mensuel: 'Chaque mois',
  trimestriel: 'Chaque trimestre',
  semestriel: 'Chaque semestre',
  annuel: 'Chaque année',
};

const MONTH_STEP: Record<Exclude<Frequency, 'hebdomadaire'>, number> = {
  mensuel: 1,
  trimestriel: 3,
  semestriel: 6,
  annuel: 12,
};

/**
 * Renvoie les dates d'échéance d'un élément récurrent tombant dans un mois donné.
 * - start : date de la première échéance
 * - endDate : dernière date incluse (facultatif)
 * Pour les fréquences mensuelles et plus, le jour est conservé ; s'il n'existe
 * pas dans le mois (ex. 31), l'échéance tombe le dernier jour du mois.
 */
export function occurrencesInMonth(
  start: ISODate,
  frequency: Frequency,
  month: MonthKey,
  endDate: ISODate | null = null,
): ISODate[] {
  const monthStart = firstDay(month);
  const monthEnd = lastDay(month);
  if (start > monthEnd) return [];
  if (endDate && endDate < monthStart) return [];

  const result: ISODate[] = [];
  if (frequency === 'hebdomadaire') {
    // Premier multiple de 7 jours après le début, à partir du début du mois.
    let date = start;
    if (date < monthStart) {
      date = addDays(start, Math.ceil(dayDiff(start, monthStart) / 7) * 7);
    }
    while (date <= monthEnd) {
      if (!endDate || date <= endDate) result.push(date);
      date = addDays(date, 7);
    }
    return result;
  }

  const step = MONTH_STEP[frequency];
  const diff = monthDiff(monthOf(start), month);
  if (diff < 0 || diff % step !== 0) return [];
  const day = Math.min(parseISO(start).day, daysInMonth(month));
  const date = `${month}-${String(day).padStart(2, '0')}`;
  if (endDate && date > endDate) return [];
  return [date];
}

/** Équivalent mensuel moyen d'un montant selon sa fréquence (pour information). */
export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  switch (frequency) {
    case 'hebdomadaire':
      return Math.round((amount * 52) / 12);
    case 'mensuel':
      return amount;
    case 'trimestriel':
      return Math.round(amount / 3);
    case 'semestriel':
      return Math.round(amount / 6);
    case 'annuel':
      return Math.round(amount / 12);
  }
}
