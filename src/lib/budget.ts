import type { AccountId, AppData, Category, Cents, ChargeStatus, Expense, FixedCharge, Income, ISODate, MonthKey, Transaction } from '../types';
import { addDays, addMonths, daysElapsedInMonth, daysInMonth, daysRemainingInMonth, firstDay, lastDay, monthOf, parseISO } from './dates';
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
 * sinon « payé » si la date est atteinte, « à venir » sinon.
 */
export function chargeStatus(charge: FixedCharge, date: ISODate, today: ISODate): ChargeStatus {
  return charge.status[date] ?? (date <= today ? 'paye' : 'a_venir');
}

/* -------------------------------------------------------------------------- */
/* Comptes : compte bancaire et carte restaurant                               */
/* -------------------------------------------------------------------------- */

/** Reconnaît la carte restaurant / les titres-restaurant dans un nom (catégorie, revenu, moyen de paiement). */
/** Paiement Izly (porte-monnaie CROUS) : reconnu par son nom. Suivi manuel, aucun accès au compte Izly. */
export function isIzly(nom: string): boolean {
  return /\bizly\b/i.test(nom);
}

/** Compte débité par un moyen de paiement. */
export function compteDuPaiement(moyen: string): AccountId {
  return isIzly(moyen) ? 'izly' : isCarteRestaurant(moyen) ? 'carte-restaurant' : 'compte';
}

export function isCarteRestaurant(nom: string): boolean {
  // « Restaurants » (catégorie de dépenses) ne doit pas être confondu avec la carte restaurant.
  return /(?:cartes?|titres?|tickets?|ch[eè]ques?)[- ]?(?:rest(?:o|aurant)s?|d[ée]jeuners?)\b|swile|edenred|pluxee|sodexo|up d[ée]j|bimpli|apetiz|conecs/i.test(
    nom,
  );
}

export const PAIEMENT_CARTE_RESTAURANT = 'Carte restaurant';

/** Mouvement signé : + pour une entrée, − pour une sortie (un ajustement porte déjà son signe). */
export function signedAmount(t: Transaction): Cents {
  if (t.type === 'revenu' || t.type === 'ajustement') return t.amount;
  return -t.amount;
}

/* -------------------------------------------------------------------------- */
/* Revenus de fin de mois : comptés pour le mois suivant                       */
/* -------------------------------------------------------------------------- */

export const JOUR_BASCULE_DEFAUT = 20;

/**
 * Jour à partir duquel un revenu compte pour le mois suivant (par défaut le 20),
 * ou null si la règle est désactivée. Un salaire ou une prime reçus le 26 octobre servent en novembre.
 */
export function jourBascule(data: AppData): number | null {
  const jour = data.settings.incomeShiftDay;
  if (jour === null) return null;
  return typeof jour === 'number' && Number.isInteger(jour) && jour >= 2 && jour <= 28 ? jour : JOUR_BASCULE_DEFAUT;
}

/** Mois du budget dans lequel compte un revenu reçu à cette date. */
export function moisDuRevenu(date: ISODate, jour: number | null): MonthKey {
  const mois = monthOf(date);
  return jour !== null && parseISO(date).day >= jour ? addMonths(mois, 1) : mois;
}

/* -------------------------------------------------------------------------- */
/* Transactions d'un mois                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Tous les mouvements comptés dans le budget d'un mois : revenus (règle du 20 comprise),
 * charges fixes, dépenses, épargne et ajustements.
 */
export function monthTransactions(data: AppData, month: MonthKey, today: ISODate): Transaction[] {
  return mouvementsDuMois(data, month, today, true);
}

/**
 * Mouvements d'un mois. Avec `budget`, un revenu reçu à partir du jour de bascule compte pour le mois suivant ;
 * sans, chaque mouvement reste à sa vraie date (relevé du compte, export, historique par dates).
 */
function mouvementsDuMois(data: AppData, month: MonthKey, today: ISODate, budget: boolean): Transaction[] {
  const cats = categoryMap(data);
  const name = (id: string | null) => (id ? (cats.get(id)?.name ?? 'Catégorie supprimée') : 'Sans catégorie');
  const goalName = (id: string | null) => (id ? (data.goals.find((g) => g.id === id)?.name ?? 'Objectif supprimé') : 'Épargne libre');
  const list: Transaction[] = [];
  const compteRevenu = (inc: AppData['incomes'][number]): AccountId =>
    inc.account ?? (isCarteRestaurant(name(inc.categoryId)) || isCarteRestaurant(inc.name) ? 'carte-restaurant' : 'compte');

  const jour = budget ? jourBascule(data) : null;
  // Avec la règle, un revenu de la fin du mois précédent compte ce mois-ci, et ceux de la fin de ce mois au suivant.
  const moisSources = jour === null ? [month] : [addMonths(month, -1), month];
  for (const inc of data.incomes) {
    // Un revenu attendu (incertain) n'est compté nulle part tant qu'il n'est pas confirmé.
    if (inc.certitude === 'attendu') continue;
    const dates = moisSources.flatMap((m) =>
      inc.recurring && inc.frequency ? occurrencesInMonth(inc.date, inc.frequency, m, inc.endDate) : monthOf(inc.date) === m ? [inc.date] : [],
    );
    for (const date of dates) {
      if (jour !== null && moisDuRevenu(date, jour) !== month) continue;
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
        account: compteRevenu(inc),
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
        account: 'compte',
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
      account: compteDuPaiement(ex.paymentMethod),
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
      account: 'compte',
    });
  }

  for (const a of data.adjustments ?? []) {
    if (monthOf(a.date) !== month) continue;
    list.push({
      key: `aju-${a.id}`,
      sourceId: a.id,
      type: 'ajustement',
      date: a.date,
      label: a.recharge ? 'Recharge Izly' : 'Ajustement du solde',
      categoryId: null,
      categoryName: a.account === 'carte-restaurant' ? 'Carte restaurant' : a.account === 'izly' ? 'Izly' : 'Compte bancaire',
      amount: a.amount,
      note: a.note,
      paymentMethod: '',
      account: a.account,
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
    for (const t of mouvementsDuMois(data, month, today, false)) {
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
    ...(data.adjustments ?? []).map((a) => a.date),
  ];
  return dates.reduce((min, d) => (d < min ? d : min), today);
}

/* -------------------------------------------------------------------------- */
/* Synthèse mensuelle                                                          */
/* -------------------------------------------------------------------------- */

export type ForecastBasis = 'reel' | 'rythme' | 'plan';

/* -------------------------------------------------------------------------- */
/* Report du reste d'un mois sur le suivant (cumul)                            */
/* -------------------------------------------------------------------------- */

/** Solde propre d'un mois, sans report : revenus − charges fixes − dépenses variables − épargne versée. */
function monthNet(data: AppData, month: MonthKey, today: ISODate): Cents {
  return sum(monthTransactions(data, month, today).map(signedAmount));
}

/** Le report est actif par défaut ; il peut être désactivé dans les paramètres. */
export function carryOverEnabled(data: AppData): boolean {
  return data.settings.carryOver !== false;
}

// Cache par jeu de données (les données sont immuables : un nouvel objet à chaque modification).
const cacheReports = new WeakMap<AppData, Map<string, Cents>>();

/**
 * Report reçu par un mois : cumul des soldes de tous les mois précédents (depuis la première saisie,
 * 10 ans au plus). Un reste positif s'ajoute, un dépassement se retranche.
 * Exemple : une prime reçue le 26 octobre et non dépensée compte encore en novembre.
 */
export function carryOverInto(data: AppData, month: MonthKey, today: ISODate): Cents {
  if (!carryOverEnabled(data)) return 0;
  let cache = cacheReports.get(data);
  if (!cache) {
    cache = new Map();
    cacheReports.set(data, cache);
  }
  const cle = `${today}|${month}`;
  const deja = cache.get(cle);
  if (deja !== undefined) return deja;
  const debut = monthOf(earliestDate(data, today));
  let total = 0;
  let m = debut < addMonths(month, -120) ? addMonths(month, -120) : debut;
  while (m < month) {
    total += monthNet(data, m, today);
    m = addMonths(m, 1);
  }
  cache.set(cle, total);
  return total;
}

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
  /** Reste (ou dépassement) des mois précédents reporté sur ce mois ; 0 si le report est désactivé. */
  carryOver: Cents;
  /** Ajustements de solde datés de ce mois (signés). */
  adjustments: Cents;
  /** Solde disponible = report + revenus − charges fixes − dépenses variables − épargne versée. */
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
  return budgets > 0 ? budgets : (data.profile?.variableEstimate ?? 0);
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
  const carryOver = carryOverInto(data, month, today);
  // Ajustements de solde du mois (onglet Compte) : ils corrigent l'argent réellement disponible.
  const adjustments = sum(of('ajustement').map((t) => t.amount));
  const available = carryOver + adjustments + income - totalExpenses - saved;

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
    carryOver,
    adjustments,
    available,
    budgetUsedPct: percent(totalExpenses, income),
    daysInMonth: dim,
    daysRemaining,
    dailyRemaining,
    dailyAfterSavings,
    plannedVariable: plan,
    projectedVariable,
    forecastBasis,
    forecastEndBalance: carryOver + adjustments + income - fixed - saved - projectedVariable,
    period,
  };
}

/* -------------------------------------------------------------------------- */
/* Budgets par catégorie                                                       */
/* -------------------------------------------------------------------------- */

export type BudgetLevel = 'sans' | 'ok' | 'attention' | 'alerte' | 'depasse';

/**
 * Niveau d'alerte d'une catégorie :
 * - « attention » dès 75 % du budget utilisé
 * - « alerte » dès 90 %
 * - « dépassé » au-delà de 100 %
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

/** Revenus attendus et charges encore à venir, dans l'ordre des dates (aujourd'hui inclus pour les charges). */
export function upcomingItems(data: AppData, today: ISODate, horizonDays = 30): Transaction[] {
  const end = addDays(today, horizonDays);
  return transactionsInRange(data, today, end, today)
    .filter((t) => (t.type === 'charge' && t.status === 'a_venir') || (t.type === 'revenu' && t.date > today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.label.localeCompare(b.label, 'fr'));
}

/** Charges encore à venir sur les `days` prochains jours, aujourd'hui inclus (7 = aujourd'hui + 6 jours). */
export function upcomingSummary(data: AppData, today: ISODate, days = 7): { count: number; total: Cents } {
  const list = upcomingCharges(data, today, days - 1);
  return { count: list.length, total: sum(list.map((t) => t.amount)) };
}

/** Solde cumulé jour après jour (jusqu'à aujourd'hui pour le mois en cours). */
export function dailyBalanceSeries(data: AppData, month: MonthKey, today: ISODate): { date: ISODate; balance: Cents }[] {
  const tx = monthTransactions(data, month, today);
  const lastIncluded = monthOf(today) === month ? today : lastDay(month);
  const series: { date: ISODate; balance: Cents }[] = [];
  let balance = carryOverInto(data, month, today);
  let i = 0;
  for (let date = firstDay(month); date <= lastIncluded && monthOf(date) === month; date = addDays(date, 1)) {
    while (i < tx.length && tx[i].date <= date) {
      balance += signedAmount(tx[i]);
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

export function monthAlerts(data: AppData, month: MonthKey, today: ISODate, fmt: (c: Cents) => string): BudgetAlert[] {
  const s = monthSummary(data, month, today);
  const alerts: BudgetAlert[] = [];
  if (s.income === 0 && s.totalExpenses > 0) {
    alerts.push({ level: 'attention', message: 'Aucun revenu n’est enregistré pour ce mois.' });
  }
  if (s.available < 0) {
    alerts.push({
      level: 'danger',
      message: `Tes dépenses dépassent tes revenus de ${fmt(-s.available)} ce mois-ci.`,
    });
  } else if (s.period !== 'passe' && s.forecastEndBalance < 0) {
    // Formulation qui propose une action plutôt qu'un simple constat.
    const piste =
      s.dailyRemaining !== null && s.dailyRemaining > 0 ? ` Pour finir le mois à l’équilibre, vise environ ${fmt(s.dailyRemaining)} par jour.` : '';
    alerts.push({
      level: 'attention',
      message: `${s.forecastBasis === 'rythme' ? 'Si tes dépenses gardent le même rythme' : 'D’après tes budgets'}, il pourrait manquer environ ${fmt(-s.forecastEndBalance)} à la fin du mois.${piste}`,
    });
  }
  if (s.period !== 'passe' && s.savingsRemaining > 0 && s.available < s.savingsRemaining) {
    alerts.push({
      level: 'attention',
      message: `Ton objectif d’épargne du mois (${fmt(s.savingsTarget)}) risque de ne pas être atteint : il reste ${fmt(s.savingsRemaining)} à mettre de côté.`,
    });
  }
  for (const line of categoryBudgets(data, month)) {
    if (line.level === 'depasse') {
      alerts.push({
        level: 'danger',
        message: `Budget « ${line.category.name} » dépassé de ${fmt(-(line.remaining ?? 0))}. Tu peux ajuster la limite si elle était trop basse.`,
      });
    } else if (line.level === 'alerte') {
      alerts.push({
        level: 'attention',
        message: `Budget « ${line.category.name} » utilisé à ${line.pct}\u00a0% : il reste ${fmt(line.remaining ?? 0)}.`,
      });
    } else if (line.level === 'attention') {
      alerts.push({
        level: 'info',
        message: `Budget « ${line.category.name} » utilisé à ${line.pct}\u00a0% : il reste ${fmt(line.remaining ?? 0)}.`,
      });
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
export function savingsBalanceByMonth(data: AppData, endMonth: MonthKey, count: number): { month: MonthKey; saved: Cents; total: Cents }[] {
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

/* -------------------------------------------------------------------------- */
/* Catégories fréquentes (raccourcis de saisie)                                */
/* -------------------------------------------------------------------------- */

/**
 * Catégories de dépenses les plus utilisées sur les 90 derniers jours
 * (nombre de dépenses, puis dépense la plus récente). Complétée par les
 * premières catégories de la liste pour un nouvel utilisateur.
 */
export function frequentCategories(data: AppData, today: ISODate, count = 4): Category[] {
  const variables = data.categories.filter((c) => c.kind === 'variable');
  const debut = addDays(today, -90);
  const stats = new Map<string, { n: number; derniere: ISODate }>();
  for (const e of data.expenses) {
    if (e.date < debut || e.date > today) continue;
    const s = stats.get(e.categoryId) ?? { n: 0, derniere: e.date };
    s.n += 1;
    if (e.date > s.derniere) s.derniere = e.date;
    stats.set(e.categoryId, s);
  }
  const utilisees = variables
    .filter((c) => stats.has(c.id))
    .sort((a, b) => {
      const sa = stats.get(a.id)!;
      const sb = stats.get(b.id)!;
      return sb.n - sa.n || sb.derniere.localeCompare(sa.derniere) || a.name.localeCompare(b.name, 'fr');
    });
  const complement = variables.filter((c) => !stats.has(c.id));
  return [...utilisees, ...complement].slice(0, count);
}

/**
 * Dépenses récentes à refaire d'un geste (café, bus, repas…) : les dernières dépenses distinctes des 60 derniers jours
 * (un même libellé n'apparaît qu'une fois). Les dépenses exceptionnelles sont exclues.
 */
export function depensesRecentes(data: AppData, today: ISODate, count = 3, filtre?: (e: Expense) => boolean): Expense[] {
  const debut = addDays(today, -60);
  const vues = new Set<string>();
  const out: Expense[] = [];
  const triees = data.expenses
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.date >= debut && e.date <= today && !e.exceptional && (!filtre || filtre(e)))
    .sort((a, b) => b.e.date.localeCompare(a.e.date) || b.i - a.i);
  for (const { e } of triees) {
    // Même libellé = même dépense habituelle : seule la plus récente est proposée (montant ajustable avant validation)
    const cle = e.description.trim() ? e.description.trim().toLocaleLowerCase('fr') : `${e.categoryId}|${e.amount}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    out.push(e);
    if (out.length === count) break;
  }
  return out;
}

/**
 * Revenus récurrents sûrs qui commencent ce mois-ci mais comptent pour le mois suivant (reçus à partir du 20) :
 * le mois en cours n'a alors pas ce revenu. Souvent, le versement du mois dernier a simplement été oublié.
 */
export function revenusSansDernierVersement(data: AppData, month: MonthKey): Income[] {
  const jour = jourBascule(data);
  if (jour === null) return [];
  return data.incomes.filter((i) => i.recurring && i.certitude !== 'attendu' && monthOf(i.date) === month && moisDuRevenu(i.date, jour) !== month);
}
