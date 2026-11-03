import type { AppData, Cents, ISODate, Transaction } from '../types';
import { carryOverInto, earliestDate, monthTransactions, plannedVariable, signedAmount, transactionsInRange } from './budget';
import { resteAVivre } from './accounts';
import { addDays, daysElapsedInMonth, daysInMonth, monthOf } from './dates';
import { sum } from './money';

/**
 * Estimation du disponible dans les prochains jours (7, 15, 30…), à partir des seules saisies :
 *
 *   disponible aujourd'hui (revenus − charges − dépenses − épargne du mois, jusqu'à aujourd'hui)
 *   + revenus prévus − charges prévues − épargne et dépenses déjà datées dans la période
 *   − dépenses courantes estimées (rythme du mois × nombre de jours)
 *
 * Le rythme est celui du mois en cours dès le 7ᵉ jour ; avant, celui des limites prévues (ou de l'estimation du profil).
 * L'argent des mois précédents n'est pas compté : c'est une estimation indicative, jamais une certitude.
 */
export interface ForecastPoint {
  days: number;
  date: ISODate;
  balance: Cents;
}

export interface ForecastEvent {
  date: ISODate;
  label: string;
  type: Transaction['type'];
  /** Montant signé : positif pour un revenu, négatif pour une sortie. */
  amount: Cents;
}

export interface BalanceForecast {
  /** Disponible à la date du jour : report des mois précédents + mouvements du mois. */
  start: Cents;
  /** Part du disponible qui vient des mois précédents. */
  carryOver: Cents;
  /** Dépenses courantes estimées par jour. */
  dailyVariable: Cents;
  basis: 'rythme' | 'plan';
  points: ForecastPoint[];
  /** Point le plus bas sur la période (jour par jour) : utile pour repérer un manque avant le prochain revenu. */
  lowest: ForecastPoint;
  /** Revenus et sorties prévus jusqu'à l'horizon le plus lointain, dans l'ordre des dates. */
  events: ForecastEvent[];
}

const signed = (t: Transaction): Cents => signedAmount(t);

export function balanceForecast(data: AppData, today: ISODate, horizons: number[] = [7, 15, 30]): BalanceForecast {
  const month = monthOf(today);
  const passes = monthTransactions(data, month, today).filter((t) => t.date <= today);
  // Disponible du jour : report des mois précédents (s'il est actif) + mouvements du mois jusqu'à aujourd'hui
  const carryOver = carryOverInto(data, month, today);
  // Point de départ : le solde de « Mon compte » (comme « Il vous reste » du tableau de bord),
  // moins les charges passées pas encore payées (elles restent à prélever).
  const enRetard = transactionsInRange(data, earliestDate(data, today), today, today).filter((t) => t.type === 'charge' && t.status === 'a_venir');
  const start = resteAVivre(data, today).solde - sum(enRetard.map((t) => t.amount));

  // Rythme des dépenses courantes (variables)
  const elapsed = daysElapsedInMonth(month, today) + 1; // aujourd'hui inclus
  const spent = sum(passes.filter((t) => t.type === 'depense').map((t) => t.amount));
  const plan = plannedVariable(data);
  const basis: BalanceForecast['basis'] = elapsed < 7 && plan > 0 ? 'plan' : 'rythme';
  const dailyVariable = basis === 'plan' ? Math.round(plan / daysInMonth(month)) : Math.round(spent / elapsed);

  const max = Math.max(...horizons);
  const futurs = transactionsInRange(data, addDays(today, 1), addDays(today, max), today).sort((a, b) => a.date.localeCompare(b.date));

  const pointA = (days: number): ForecastPoint => {
    const date = addDays(today, days);
    const prevus = sum(futurs.filter((t) => t.date <= date).map(signed));
    return { days, date, balance: start + prevus - dailyVariable * days };
  };
  const points = horizons.map(pointA);
  let lowest = pointA(1);
  for (let d = 2; d <= max; d += 1) {
    const p = pointA(d);
    if (p.balance < lowest.balance) lowest = p;
  }

  const events = futurs
    .filter((t) => t.type === 'revenu' || t.type === 'charge')
    .map((t) => ({ date: t.date, label: t.label, type: t.type, amount: signed(t) }));

  return { start, carryOver, dailyVariable, basis, points, lowest, events };
}
