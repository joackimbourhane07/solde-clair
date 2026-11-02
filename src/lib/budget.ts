import type {
  AppData,
  Category,
  Cents,
  ChargeStatus,
  FixedCharge,
  ISODate,
  MonthKey,
  Transaction,
} from '../types';
import {
  addDays,
  addMonths,
  daysElapsedInMonth,
  daysInMonth,
  daysRemainingInMonth,
  firstDay,
  lastDay,
  monthOf,
  parseISO,
} from './dates';
import { divideCents, percent, sum } from './money';
import { occurrencesInMonth } from './recurrence';

/* -------------------------------------------------------------------------- */
/* Outils                                                                      */
/* -------------------------------------------------------------------------- */

export function categoryMap(data: AppData): Map<string, Category> {
  return new Map(data.categories.map((c) => [c.id, c]));
}

export function categoryName(data: AppData, id: string | null): string {
  if (!id) return 'Sans catégorie';
  return data.categories.find((c) => c.id === id)?.name ?? 'Catégorie supprimée';
}

/**
 * Statut d'une échéance de charge fixe : choix manuel s'il existe,
 * sinon « payé » si la date est atteinte, « à venir » sinon.
 */
export function chargeStatus(charge: FixedCharge, date: ISODate, today: ISODate): ChargeStatus {
  return charge.status[date] ?? (date <= today ? 'paye' : 'a_venir');
}

/* -------------------------------------------------------------------------- */
/* Transactions d'un mois                                                      */
/* -------------------------------------------------------------------------- */

/** Tous les mouvements d'un mois : revenus, charges fixes, dépenses et épargne. */
export function monthTransactions(data: AppData, month: MonthKey, today: ISODate): Transaction[] {
  const cats = categoryMap(data);
  const name = (id: string | null) => (id ? cats.get(id)?.name ?? 'Catégorie supprimée' : 'Sans catégorie');
  const goalName = (id: string | null) =>
    id ? data.goals.find((g) => g.id === id)?.name ?? 'Objectif supprimé' : 'Épargne libre';
  const list: Transaction[] = [];

  for (const inc of data.incomes) {
    const dates =
      inc.recurring && inc.frequency
        ? occurrencesInMonth(inc.date, inc.frequency, month, inc.endDate)
        : monthOf(inc.date) === month
          ? [inc.date]
          : [];
    for (const date of dates) {
      list.push({
        key: `rev-${inc.id}-${date}`,
        sourceId: inc.id,
        type: 'revenu',
        date,
        label: inc.name,
        categoryId: inc.categoryId,
        categoryName: name(inc.categoryId),
        amount: inc.amount,
        note: inc.note,
        paymentMethod: '',
      });
    }
  }

  for (const ch of data.fixedCharges) {
    for (const date of occurrencesInMonth(ch.date, ch.frequency, month, ch.endDate)) {
      list.push({
        key: `chg-${ch.id}-${date}`,
        sourceId: ch.id,
        type: 'charge',
        date,
        label: ch.name,
        categoryId: ch.categoryId,
        categoryName: name(ch.categoryId),
        amount: ch.amount,
        note: ch.note,
        paymentMethod: '',
        status: chargeStatus(ch, date, today),
      });
    }
  }

  for (const ex of data.expenses) {
    if (monthOf(ex.date) !== month) continue;
    list.push({
      key: `dep-${ex.id}`,
      sourceId: ex.id,
      type: 'depense',
      date: ex.date,
      label: ex.description || name(ex.categoryId),
      categoryId: ex.categoryId,
      categoryName: name(ex.categoryId),
      amount: ex.amount,
      note: '',
      paymentMethod: ex.paymentMethod,
    });
  }

  for (const s of data.savings) {
    if (monthOf(s.date) !== month) continue;
    list.push({
      key: `epa-${s.id}`,
      sourceId: s.id,
      type: 'epargne',
      date: s.date,
      label: `Épargne : ${goalName(s.goalId)}`,
      categoryId: null,
      categoryName: goalName(s.goalId),
      amount: s.amount,
      note: s.note,
      paymentMethod: '',
    });
  }

  return list.sort((a, b) => (a.date === b.date ? a.key.localeCompare(b.key) : a.date.localeCompare(b.date)));
}

/** Mouvements sur une plage de dates (bornes incluses). */
export function transactionsInRange(data: AppData, from: ISODate, to: ISODate, today: ISODate): Transaction[] {
  if (from > to) return [];
  const result: Transaction[] = [];
  let month = monthOf(from);
  const endMonth = monthOf(to);
  while (month <= endMonth) {
    for (const t of monthTransactions(data, month, today)) {
      if (t.date >= from && t.date <= to) result.push(t);
    }
    month = addMonths(month, 1);
  }
  return result;
}

/** Première date connue dans les données (pour l'historique complet). */
export function earliestDate(data: AppData, today: ISODate): ISODate {
  const dates = [
    ...data.incomes.map((i) => i.date),
    ...data.fixedCharges.map((c) => c.date),
    ...data.expenses.map((e) => e.date),
    ...data.savings.map((s) => s.date),
  ];
  return dates.reduce((min, d) => (d < min ? d : min), today);
}

/* -------------------------------------------------------------------------- */
/* Synthèse mensuelle                                                          */
/* -------------------------------------------------------------------------- */

export type ForecastBasis = 'reel' | 'rythme' | 'plan';

export interface MonthSummary {
  month: MonthKey;
  income: Cents;
  fixed: Cents;
  fixedPaid: Cents;
  fixedUpcoming: Cents;
  variable: Cents;
  /** Charges fixes + dépenses variables. */
  totalExpenses: Cents;
  /** Versements d'épargne du mois. */
  saved: Cents;
  savingsTarget: Cents;
  /** Ce qu'il reste à épargner pour atteindre l'objectif du mois. */
  savingsRemaining: Cents;
  /** Solde disponible = revenus − charges fixes − dépenses variables − épargne versée. */
  available: Cents;
  /** Part des revenus consommée par les dépenses (charges + variables), en %. */
  budgetUsedPct: number | null;
  daysInMonth: number;
  daysRemaining: number;
  /** Reste à vivre quotidien = solde disponible ÷ jours restants (null si mois terminé). */
  dailyRemaining: Cents | null;
  /** Reste à vivre quotidien si l'on met aussi de côté l'épargne prévue restante. */
  dailyAfterSavings: Cents | null;
  plannedVariable: Cents;
  projectedVariable: Cents;
  forecastBasis: ForecastBasis;
  /** Solde estimé à la fin du mois. */
  forecastEndBalance: Cents;
  period: 'passe' | 'courant' | 'futur';
}

/** Dépenses variables prévues : somme des budgets par catégorie, sinon estimation du profil. */
export function plannedVariable(data: AppData): Cents {
  const budgets = sum(data.categories.filter((c) => c.kind === 'variable' && c.budget).map((c) => c.budget ?? 0));
  return budgets > 0 ? budgets : data.profile?.variableEstimate ?? 0;
}

export function monthSummary(data: AppData, month: MonthKey, today: ISODate): MonthSummary {
  const tx = monthTransactions(data, month, today);
  const of = (type: Transaction['type']) => tx.filter((t) => t.type === type);

  const income = sum(of('revenu').map((t) => t.amount));
  const charges = of('charge');
  const fixed = sum(charges.map((t) => t.amount));
  const fixedPaid = sum(charges.filter((t) => t.status === 'paye').map((t) => t.amount));
  const variable = sum(of('depense').map((t) => t.amount));
  const saved = sum(of('epargne').map((t) => t.amount));
  const savingsTarget = data.profile?.monthlySavingsTarget ?? 0;
  const savingsRemaining = Math.max(0, savingsTarget - saved);
  const totalExpenses = fixed + variable;
  const available = income - totalExpenses - saved;

  const dim = daysInMonth(month);
  const daysRemaining = daysRemainingInMonth(month, today);
  const dailyRemaining = daysRemaining > 0 ? divideCents(available, daysRemaining) : null;
  const dailyAfterSavings = daysRemaining > 0 ? divideCents(available - savingsRemaining, daysRemaining) : null;

  const current = monthOf(today);
  const period = month < current ? 'passe' : month > current ? 'futur' : 'courant';
  const plan = plannedVariable(data);
  let projectedVariable = variable;
  let forecastBasis: ForecastBasis = 'reel';
  if (period === 'futur') {
    projectedVariable = Math.max(variable, plan);
    forecastBasis = 'plan';
  } else if (period === 'courant') {
    const elapsed = daysElapsedInMonth(month, today) + 1; // aujourd'hui inclus
    const after = dim - elapsed;
    if (elapsed < 7 && plan > 0) {
      projectedVariable = Math.max(variable, plan);
      forecastBasis = 'plan';
    } else {
      projectedVariable = variable + Math.round((variable * after) / elapsed);
      forecastBasis = 'rythme';
    }
  }

  return {
    month,
    income,
    fixed,
    fixedPaid,
    fixedUpcoming: fixed - fixedPaid,
    variable,
    totalExpenses,
    saved,
    savingsTarget,
    savingsRemaining,
    available,
    budgetUsedPct: percent(totalExpenses, income),
    daysInMonth: dim,
    daysRemaining,
    dailyRemaining,
    dailyAfterSavings,
    plannedVariable: plan,
    projectedVariable,
    forecastBasis,
    forecastEndBalance: income - fixed - saved - projectedVariable,
    period,
  };
}

/* -------------------------------------------------------------------------- */
/* Budgets par catégorie                                                       */
/* -------------------------------------------------------------------------- */

export type BudgetLevel = 'sans' | 'ok' | 'attention' | 'alerte' | 'depasse';

/**
 * Niveau d'alerte d'une catégorie :
 * - « attention » dès 75 % du budget utilisé
 * - « alerte » dès 90 %
 * - « dépassé » au-delà de 100 %
 * Comparaisons sur des entiers (centimes) : aucune erreur d'arrondi.
 */
export function budgetLevel(spent: Cents, budget: Cents | null): BudgetLevel {
  if (!budget || budget <= 0) return 'sans';
  if (spent > budget) return 'depasse';
  if (spent * 100 >= budget * 90) return 'alerte';
  if (spent * 100 >= budget * 75) return 'attention';
  return 'ok';
}

export const BUDGET_LEVEL_LABELS: Record<BudgetLevel, string> = {
  sans: 'Pas de limite',
  ok: 'Dans le budget',
  attention: '75 % atteint',
  alerte: '90 % atteint',
  depasse: 'Budget dépassé',
};

export interface CategoryBudgetLine {
  category: Category;
  budget: Cents | null;
  spent: Cents;
  remaining: Cents | null;
  pct: number | null;
  level: BudgetLevel;
}

export function variableSpentByCategory(data: AppData, month: MonthKey): Map<string, Cents> {
  const map = new Map<string, Cents>();
  for (const e of data.expenses) {
    if (monthOf(e.date) !== month) continue;
    map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount);
  }
  return map;
}

export function categoryBudgets(data: AppData, month: MonthKey): CategoryBudgetLine[] {
  const spentMap = variableSpentByCategory(data, month);
  return data.categories
    .filter((c) => c.kind === 'variable')
    .map((category) => {
      const spent = spentMap.get(category.id) ?? 0;
      const budget = category.budget && category.budget > 0 ? category.budget : null;
      return {
        category,
        budget,
        spent,
        remaining: budget === null ? null : budget - spent,
        pct: budget === null ? null : percent(spent, budget),
        level: budgetLevel(spent, budget),
      };
    });
}

/** Dépenses (charges fixes + variables) regroupées par catégorie, de la plus coûteuse à la moins coûteuse. */
export function spendingByCategory(
  data: AppData,
  month: MonthKey,
  today: ISODate,
  types: Transaction['type'][] = ['depense'],
): { categoryId: string | null; name: string; amount: Cents }[] {
  const map = new Map<string, { categoryId: string | null; name: string; amount: Cents }>();
  for (const t of monthTransactions(data, month, today)) {
    if (!types.includes(t.type)) continue;
    const key = `${t.type === 'charge' ? 'f' : 'v'}:${t.categoryId}`;
    const entry = map.get(key) ?? { categoryId: t.categoryId, name: t.categoryName, amount: 0 };
    entry.amount += t.amount;
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

/* -------------------------------------------------------------------------- */
/* Prochaines charges, évolution du solde, alertes                             */
/* -------------------------------------------------------------------------- */

export function upcomingCharges(data: AppData, today: ISODate, horizonDays = 30): Transaction[] {
  const end = addDays(today, horizonDays);
  return transactionsInRange(data, today, end, today)
    .filter((t) => t.type === 'charge' && t.status === 'a_venir')
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Solde cumulé jour après jour (jusqu'à aujourd'hui pour le mois en cours). */
export function dailyBalanceSeries(data: AppData, month: MonthKey, today: ISODate): { date: ISODate; balance: Cents }[] {
  const tx = monthTransactions(data, month, today);
  const lastIncluded = monthOf(today) === month ? today : lastDay(month);
  const series: { date: ISODate; balance: Cents }[] = [];
  let balance = 0;
  let i = 0;
  for (let date = firstDay(month); date <= lastIncluded && monthOf(date) === month; date = addDays(date, 1)) {
    while (i < tx.length && tx[i].date <= date) {
      balance += tx[i].type === 'revenu' ? tx[i].amount : -tx[i].amount;
      i += 1;
    }
    series.push({ date, balance });
  }
  return series;
}

export type AlertLevel = 'info' | 'attention' | 'danger';

export interface BudgetAlert {
  level: AlertLevel;
  message: string;
}

export function monthAlerts(
  data: AppData,
  month: MonthKey,
  today: ISODate,
  fmt: (c: Cents) => string,
): BudgetAlert[] {
  const s = monthSummary(data, month, today);
  const alerts: BudgetAlert[] = [];
  if (s.income === 0 && s.totalExpenses > 0) {
    alerts.push({ level: 'attention', message: 'Aucun revenu n’est enregistré pour ce mois.' });
  }
  if (s.available < 0) {
    alerts.push({
      level: 'danger',
      message: `Vos dépenses dépassent vos revenus de ${fmt(-s.available)} ce mois-ci.`,
    });
  } else if (s.period !== 'passe' && s.forecastEndBalance < 0) {
    // Formulation qui propose une action plutôt qu'un simple constat.
    const piste =
      s.dailyRemaining !== null && s.dailyRemaining > 0 ? ` Pour finir le mois à l’équilibre, visez environ ${fmt(s.dailyRemaining)} par jour.` : '';
    alerts.push({
      level: 'attention',
      message: `${s.forecastBasis === 'rythme' ? 'Si vos dépenses gardent le même rythme' : 'D’après vos budgets'}, il pourrait manquer environ ${fmt(-s.forecastEndBalance)} à la fin du mois.${piste}`,
    });
  }
  if (s.period !== 'passe' && s.savingsRemaining > 0 && s.available < s.savingsRemaining) {
    alerts.push({
      level: 'attention',
      message: `Votre objectif d’épargne du mois (${fmt(s.savingsTarget)}) risque de ne pas être atteint : il reste ${fmt(s.savingsRemaining)} à mettre de côté.`,
    });
  }
  for (const line of categoryBudgets(data, month)) {
    if (line.level === 'depasse') {
      alerts.push({
        level: 'danger',
        message: `Budget « ${line.category.name} » dépassé de ${fmt(-(line.remaining ?? 0))}. Vous pouvez ajuster la limite si elle était trop basse.`,
      });
    } else if (line.level === 'alerte') {
      alerts.push({ level: 'attention', message: `Budget « ${line.category.name} » utilisé à ${line.pct}\u00a0% : il reste ${fmt(line.remaining ?? 0)}.` });
    } else if (line.level === 'attention') {
      alerts.push({ level: 'info', message: `Budget « ${line.category.name} » utilisé à ${line.pct}\u00a0% : il reste ${fmt(line.remaining ?? 0)}.` });
    }
  }
  const order: Record<AlertLevel, number> = { danger: 0, attention: 1, info: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]);
}

/* -------------------------------------------------------------------------- */
/* Bilan mensuel et comparaison                                                */
/* -------------------------------------------------------------------------- */

export interface MonthReport {
  summary: MonthSummary;
  previous: MonthSummary;
  topCategories: { name: string; amount: Cents; kind: 'charge' | 'depense' }[];
  overBudget: CategoryBudgetLine[];
  delta: { income: Cents; fixed: Cents; variable: Cents; saved: Cents; available: Cents };
}

export function monthReport(data: AppData, month: MonthKey, today: ISODate): MonthReport {
  const summary = monthSummary(data, month, today);
  const previous = monthSummary(data, addMonths(month, -1), today);
  const map = new Map<string, { name: string; amount: Cents; kind: 'charge' | 'depense' }>();
  for (const t of monthTransactions(data, month, today)) {
    if (t.type !== 'charge' && t.type !== 'depense') continue;
    const key = `${t.type}:${t.categoryId}`;
    const e = map.get(key) ?? { name: t.categoryName, amount: 0, kind: t.type };
    e.amount += t.amount;
    map.set(key, e);
  }
  const topCategories = [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  return {
    summary,
    previous,
    topCategories,
    overBudget: categoryBudgets(data, month).filter((l) => l.level === 'depasse'),
    delta: {
      income: summary.income - previous.income,
      fixed: summary.fixed - previous.fixed,
      variable: summary.variable - previous.variable,
      saved: summary.saved - previous.saved,
      available: summary.available - previous.available,
    },
  };
}

/** Revenus / dépenses / épargne des N derniers mois (le plus ancien en premier). */
export function monthsHistory(data: AppData, endMonth: MonthKey, count: number, today: ISODate): MonthSummary[] {
  const result: MonthSummary[] = [];
  for (let k = count - 1; k >= 0; k -= 1) result.push(monthSummary(data, addMonths(endMonth, -k), today));
  return result;
}

/** Montant total épargné cumulé (objectifs + versements) à la fin de chaque mois. */
export function savingsBalanceByMonth(
  data: AppData,
  endMonth: MonthKey,
  count: number,
): { month: MonthKey; saved: Cents; total: Cents }[] {
  const result: { month: MonthKey; saved: Cents; total: Cents }[] = [];
  for (let k = count - 1; k >= 0; k -= 1) {
    const month = addMonths(endMonth, -k);
    const end = lastDay(month);
    // Le montant initial d'un objectif compte à partir de sa création.
    const initial = sum(data.goals.filter((g) => g.createdAt <= end).map((g) => g.initialAmount));
    const saved = sum(data.savings.filter((s) => monthOf(s.date) === month).map((s) => s.amount));
    const total = initial + sum(data.savings.filter((s) => s.date <= end).map((s) => s.amount));
    result.push({ month, saved, total });
  }
  return result;
}

export function dayOfMonth(date: ISODate): number {
  return parseISO(date).day;
}
