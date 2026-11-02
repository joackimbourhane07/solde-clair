import type { AppData, Cents, ISODate } from '../types';
import { budgetLevel, categoryBudgets, monthSummary, type BudgetLevel } from './budget';
import { monthOf } from './dates';
import { goalProgress, sortGoals } from './goals';
import { divideCents } from './money';

export type Verdict = 'confortable' | 'prudence' | 'desequilibre';

export const VERDICT_LABELS: Record<Verdict, string> = {
  confortable: 'Situation confortable',
  prudence: 'Achat possible avec prudence',
  desequilibre: 'Achat susceptible de déséquilibrer le budget',
};

export interface GoalImpact {
  goalId: string;
  name: string;
  /** Nombre de mois de versements prévus que représente l'achat (en dixièmes). */
  monthsOfContribution: number | null;
  /** Retard estimé (en mois) si l'achat est pris sur l'épargne du mois. */
  delayMonths: number;
}

export interface SimulationResult {
  amount: Cents;
  availableBefore: Cents;
  availableAfter: Cents;
  daysRemaining: number;
  dailyBefore: Cents | null;
  dailyAfter: Cents | null;
  /** Épargne encore possible ce mois-ci, avant / après l'achat (bornée à l'objectif restant). */
  savingsPossibleBefore: Cents;
  savingsPossibleAfter: Cents;
  /** Montant d'épargne du mois compromis par l'achat. */
  savingsImpact: Cents;
  category: null | {
    name: string;
    budget: Cents | null;
    spentBefore: Cents;
    spentAfter: Cents;
    remainingAfter: Cents | null;
    levelBefore: BudgetLevel;
    levelAfter: BudgetLevel;
  };
  goals: GoalImpact[];
  verdict: Verdict;
  reasons: string[];
}

/**
 * Simule l'impact d'un achat envisagé sur le mois en cours.
 *
 * Règles de l'appréciation (indication budgétaire, pas un conseil financier) :
 * - « déséquilibre » : le solde du mois deviendrait négatif ;
 * - « prudence » : l'achat entame l'épargne prévue du mois, fait dépasser le
 *   budget de sa catégorie, ou consomme plus de la moitié du solde disponible ;
 * - « confortable » : sinon.
 */
export function simulatePurchase(
  data: AppData,
  amount: Cents,
  categoryId: string | null,
  today: ISODate,
): SimulationResult {
  const month = monthOf(today);
  const s = monthSummary(data, month, today);
  const availableAfter = s.available - amount;
  const days = s.daysRemaining;

  const clamp = (v: Cents) => Math.max(0, Math.min(v, s.savingsRemaining));
  const savingsPossibleBefore = clamp(s.available);
  const savingsPossibleAfter = clamp(availableAfter);
  const savingsImpact = savingsPossibleBefore - savingsPossibleAfter;

  let category: SimulationResult['category'] = null;
  if (categoryId) {
    const line = categoryBudgets(data, month).find((l) => l.category.id === categoryId);
    if (line) {
      const spentAfter = line.spent + amount;
      category = {
        name: line.category.name,
        budget: line.budget,
        spentBefore: line.spent,
        spentAfter,
        remainingAfter: line.budget === null ? null : line.budget - spentAfter,
        levelBefore: line.level,
        levelAfter: budgetLevel(spentAfter, line.budget),
      };
    }
  }

  const goals: GoalImpact[] = sortGoals(data.goals)
    .filter((g) => !goalProgress(g, data.savings, today).reached)
    .map((g) => ({
      goalId: g.id,
      name: g.name,
      monthsOfContribution: g.monthlyContribution > 0 ? Math.round((amount * 10) / g.monthlyContribution) / 10 : null,
      delayMonths:
        savingsImpact > 0 && g.monthlyContribution > 0 ? Math.ceil(savingsImpact / g.monthlyContribution) : 0,
    }));

  const reasons: string[] = [];
  let verdict: Verdict = 'confortable';
  if (availableAfter < 0) {
    verdict = 'desequilibre';
    reasons.push('Votre solde du mois deviendrait négatif.');
  } else {
    if (savingsImpact > 0) reasons.push('L’achat réduit l’épargne prévue ce mois-ci.');
    if (category && category.levelAfter === 'depasse' && category.levelBefore !== 'depasse')
      reasons.push(`Le budget « ${category.name} » serait dépassé.`);
    else if (category && category.levelAfter === 'depasse')
      reasons.push(`Le budget « ${category.name} » est déjà dépassé.`);
    if (s.available > 0 && amount * 2 > s.available) reasons.push('L’achat représente plus de la moitié de votre solde disponible.');
    if (reasons.length > 0) verdict = 'prudence';
    else reasons.push('L’achat reste compatible avec votre budget et votre épargne prévue.');
  }

  return {
    amount,
    availableBefore: s.available,
    availableAfter,
    daysRemaining: days,
    dailyBefore: s.dailyRemaining,
    dailyAfter: days > 0 ? divideCents(availableAfter, days) : null,
    savingsPossibleBefore,
    savingsPossibleAfter,
    savingsImpact,
    category,
    goals,
    verdict,
    reasons,
  };
}
