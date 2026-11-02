import type { AppData, Category, Cents, FixedCharge, ISODate, Income, ProfileType, SavingsGoal, ThemeChoice } from '../types';
import { makeCategory, PROFILE_PRESETS } from './categories';
import { daysInMonth, monthOf } from './dates';
import { newId } from './id';
import { splitByWeights } from './money';
import { APPEARANCE_VERSION, PRESETS_VERSION } from './storage';

export interface SetupLine {
  name: string;
  amount: Cents;
  day: number;
  category: string;
}

export interface SetupInput {
  name: string;
  type: ProfileType;
  currency: string;
  mainIncome: SetupLine | null;
  extraIncomes: SetupLine[];
  charges: SetupLine[];
  variableEstimate: Cents;
  splitEstimate: boolean;
  monthlySavingsTarget: Cents;
  longTermGoal: { name: string; target: Cents; initial: Cents; targetDate: ISODate | null } | null;
  categories: { income: string[]; fixed: string[]; variable: string[] };
  theme: ThemeChoice;
}

/** Construit les données initiales à partir du parcours de configuration. */
export function buildInitialData(input: SetupInput, today: ISODate): AppData {
  const month = monthOf(today);
  const dateFor = (day: number) =>
    `${month}-${String(Math.min(Math.max(1, Math.round(day) || 1), daysInMonth(month))).padStart(2, '0')}`;

  const categories: Category[] = [];
  const addCats = (kind: Category['kind'], names: string[]) => {
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      if (categories.some((c) => c.kind === kind && c.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr'))) continue;
      categories.push(makeCategory(name, kind));
    }
  };
  addCats('income', input.categories.income);
  addCats('fixed', input.categories.fixed);
  addCats('variable', input.categories.variable);

  const ensureCat = (kind: Category['kind'], name: string, fallback: string): string => {
    const wanted = (name || fallback).trim();
    let c = categories.find((x) => x.kind === kind && x.name.toLocaleLowerCase('fr') === wanted.toLocaleLowerCase('fr'));
    if (!c) {
      c = makeCategory(wanted, kind);
      categories.push(c);
    }
    return c.id;
  };

  const incomes: Income[] = [input.mainIncome, ...input.extraIncomes]
    .filter((l): l is SetupLine => !!l && l.amount > 0)
    .map((l) => ({
      id: newId('rev'),
      name: l.name.trim() || 'Revenu',
      amount: l.amount,
      date: dateFor(l.day),
      categoryId: ensureCat('income', l.category, 'Autre revenu'),
      recurring: true,
      frequency: 'mensuel',
      endDate: null,
      note: '',
    }));

  const fixedCharges: FixedCharge[] = input.charges
    .filter((l) => l.amount > 0)
    .map((l) => ({
      id: newId('chg'),
      name: l.name.trim() || l.category || 'Charge',
      amount: l.amount,
      date: dateFor(l.day),
      categoryId: ensureCat('fixed', l.category, 'Autre charge'),
      frequency: 'mensuel',
      endDate: null,
      note: '',
      status: {},
    }));

  // Répartition facultative de l'estimation des dépenses variables en budgets.
  if (input.splitEstimate && input.variableEstimate > 0) {
    const weights = PROFILE_PRESETS[input.type].variableWeights;
    const variableCats = categories.filter((c) => c.kind === 'variable');
    const w = variableCats.map((c) => weights[c.name] ?? 3);
    const parts = splitByWeights(input.variableEstimate, w);
    variableCats.forEach((c, i) => {
      c.budget = parts[i];
    });
  }

  const goals: SavingsGoal[] = [];
  if (input.longTermGoal && input.longTermGoal.name.trim() && input.longTermGoal.target > 0) {
    goals.push({
      id: newId('obj'),
      name: input.longTermGoal.name.trim(),
      description: '',
      target: input.longTermGoal.target,
      initialAmount: input.longTermGoal.initial,
      targetDate: input.longTermGoal.targetDate,
      priority: 'haute',
      monthlyContribution: input.monthlySavingsTarget,
      createdAt: today,
    });
  }

  return {
    version: 1,
    profile: {
      name: input.name.trim(),
      type: input.type,
      currency: input.currency,
      monthlySavingsTarget: input.monthlySavingsTarget,
      variableEstimate: input.variableEstimate,
      createdAt: today,
    },
    settings: { theme: input.theme, appearanceVersion: APPEARANCE_VERSION, presetsVersion: PRESETS_VERSION },
    adjustments: [],
    categories,
    incomes,
    fixedCharges,
    expenses: [],
    goals,
    savings: [],
  };
}
