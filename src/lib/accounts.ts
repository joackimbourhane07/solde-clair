import type { AccountId, AppData, Cents, ISODate, Transaction } from '../types';
import { earliestDate, isCarteRestaurant, signedAmount, transactionsInRange } from './budget';
import { addDays } from './dates';
import { sum } from './money';

/**
 * Comptes façon application bancaire : compte bancaire et carte restaurant.
 * Le solde d'un compte = tous les mouvements jusqu'à la date, ajustements compris.
 * Une charge fixe marquée « à venir » n'est pas encore débitée : elle reste dans les opérations à venir.
 */
export type FiltreCompte = AccountId | 'tout';

export const ACCOUNT_LABELS: Record<AccountId, string> = {
  compte: 'Compte bancaire',
  'carte-restaurant': 'Carte restaurant',
};

/**
 * La carte restaurant est-elle utilisée (revenu, paiement ou ajustement) ?
 * La seule présence de la catégorie ne suffit pas : sans carte, l'interface reste simple.
 */
export function usesCarteRestaurant(data: AppData): boolean {
  const categorieCarte = new Set(data.categories.filter((c) => c.kind === 'income' && isCarteRestaurant(c.name)).map((c) => c.id));
  return (
    data.incomes.some((i) => (i.account ?? (categorieCarte.has(i.categoryId) || isCarteRestaurant(i.name) ? 'carte-restaurant' : 'compte')) === 'carte-restaurant') ||
    data.expenses.some((e) => isCarteRestaurant(e.paymentMethod)) ||
    (data.adjustments ?? []).some((a) => a.account === 'carte-restaurant')
  );
}

const correspond = (t: Transaction, filtre: FiltreCompte) => filtre === 'tout' || t.account === filtre;

/** Débité ou crédité : tout sauf les charges encore « à venir ». */
export const estPasse = (t: Transaction) => !(t.type === 'charge' && t.status === 'a_venir');

/** Solde d'un compte (ou de tous) à la fin d'une date. */
export function accountBalance(data: AppData, filtre: FiltreCompte, date: ISODate, today: ISODate): Cents {
  const debut = earliestDate(data, today);
  if (date < debut) return 0;
  return sum(
    transactionsInRange(data, debut, date, today)
      .filter((t) => correspond(t, filtre) && estPasse(t))
      .map(signedAmount),
  );
}

export interface JourDeReleve {
  date: ISODate;
  operations: Transaction[];
  /** Solde en fin de journée. */
  solde: Cents;
}

/**
 * Relevé d'un compte entre deux dates : opérations regroupées par jour (du plus récent au plus ancien),
 * avec le solde en fin de journée, comme sur un relevé bancaire.
 */
export function releve(data: AppData, filtre: FiltreCompte, from: ISODate, to: ISODate, today: ISODate): JourDeReleve[] {
  let solde = accountBalance(data, filtre, addDays(from, -1), today);
  const ops = transactionsInRange(data, from, to, today).filter((t) => correspond(t, filtre) && estPasse(t));
  const jours: JourDeReleve[] = [];
  for (const t of ops) {
    solde += signedAmount(t);
    const dernier = jours[jours.length - 1];
    if (dernier && dernier.date === t.date) {
      dernier.operations.push(t);
      dernier.solde = solde;
    } else jours.push({ date: t.date, operations: [t], solde });
  }
  // Le plus récent en haut, et dans chaque jour la dernière opération en premier
  return jours.reverse().map((j) => ({ ...j, operations: [...j.operations].reverse() }));
}

/** Opérations à venir sur les prochains jours (et charges passées pas encore payées). */
export function operationsAVenir(data: AppData, filtre: FiltreCompte, today: ISODate, jours = 30): Transaction[] {
  const debut = earliestDate(data, today);
  const enRetard = transactionsInRange(data, debut, today, today).filter((t) => correspond(t, filtre) && !estPasse(t));
  const prochaines = transactionsInRange(data, addDays(today, 1), addDays(today, jours), today).filter((t) => correspond(t, filtre));
  return [...enRetard, ...prochaines].sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label, 'fr'));
}

/** Entrées et sorties d'une liste d'opérations. */
export function totaux(ops: Transaction[]): { entrees: Cents; sorties: Cents } {
  const signes = ops.map(signedAmount);
  return { entrees: sum(signes.filter((v) => v > 0)), sorties: Math.abs(sum(signes.filter((v) => v < 0))) };
}
