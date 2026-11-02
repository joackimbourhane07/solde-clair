import type {
  AppData,
  Category,
  CategoryKind,
  Expense,
  FixedCharge,
  Frequency,
  Income,
  ISODate,
  MonthKey,
  ProfileType,
  SavingsDeposit,
  SavingsGoal,
} from '../types';
import { presetCategories } from './categories';
import { addMonths, addMonthsToDate, daysInMonth, monthOf, toISO, parseMonth } from './dates';
import { splitByWeights } from './money';
import { APPEARANCE_VERSION } from './storage';

/**
 * Profils de démonstration ENTIÈREMENT FICTIFS (aucune donnée réelle).
 * Les dates sont calculées par rapport à aujourd'hui : 3 mois d'historique
 * complet + le mois en cours (jusqu'à aujourd'hui).
 */

export type DemoProfile = 'etudiant' | 'alternant' | 'salarie';

export const DEMO_PROFILES: { id: DemoProfile; label: string; description: string }[] = [
  { id: 'etudiant', label: 'Léa, étudiante', description: 'Bourse, APL et aide familiale, petit loyer, objectif ordinateur.' },
  { id: 'alternant', label: 'Hugo, alternant', description: 'Salaire d’alternance, voiture, objectif d’épargne pour un véhicule.' },
  { id: 'salarie', label: 'Camille, salariée', description: 'Salaire, enfant, crédit immobilier, fonds d’urgence et voyage.' },
];

/** Générateur pseudo-aléatoire déterministe (mêmes données à chaque chargement). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RecurringSpec {
  name: string;
  amount: number; // centimes
  day: number;
  category: string;
  frequency?: Frequency;
  monthsAgo?: number; // première échéance (par défaut : 3 mois avant)
  note?: string;
}

interface OneOffSpec {
  name: string;
  amount: number;
  monthsAgo: number;
  day: number;
  category: string;
  note?: string;
}

interface VariableSpec {
  category: string;
  monthly: number; // centimes, total approximatif du mois
  count: number;
  labels: string[];
  payment?: string;
}

interface GoalSpec {
  name: string;
  description: string;
  target: number;
  initial: number;
  monthly: number;
  monthsToTarget: number | null;
  priority: SavingsGoal['priority'];
}

interface DemoSpec {
  name: string;
  type: ProfileType;
  savingsTarget: number;
  variableEstimate: number;
  incomes: RecurringSpec[];
  oneOffIncomes: OneOffSpec[];
  charges: RecurringSpec[];
  budgets: Record<string, number>;
  variables: VariableSpec[];
  goals: GoalSpec[];
  seed: number;
}

const SPECS: Record<DemoProfile, DemoSpec> = {
  etudiant: {
    name: 'Léa (démo)',
    type: 'etudiant',
    savingsTarget: 5000,
    variableEstimate: 38000,
    seed: 11,
    incomes: [
      { name: 'Bourse sur critères sociaux', amount: 45000, day: 5, category: 'Bourse' },
      { name: 'APL', amount: 21000, day: 5, category: 'APL / aide au logement' },
      { name: 'Aide des parents', amount: 23000, day: 1, category: 'Aide familiale' },
    ],
    oneOffIncomes: [
      { name: 'Baby-sitting', amount: 12000, monthsAgo: 2, day: 20, category: 'Job étudiant' },
      { name: 'Baby-sitting', amount: 9000, monthsAgo: 1, day: 18, category: 'Job étudiant' },
      { name: 'Vente de livres', amount: 3500, monthsAgo: 3, day: 12, category: 'Autre revenu' },
    ],
    charges: [
      { name: 'Loyer studio', amount: 48000, day: 5, category: 'Loyer' },
      { name: 'Forfait mobile', amount: 1299, day: 10, category: 'Téléphone' },
      { name: 'Abonnement transports', amount: 2500, day: 1, category: 'Transport' },
      { name: 'Assurance habitation', amount: 850, day: 15, category: 'Assurance' },
      { name: 'Musique en ligne', amount: 599, day: 20, category: 'Abonnements' },
      { name: 'Frais d’inscription', amount: 17000, day: 15, category: 'Frais scolaires', frequency: 'annuel', monthsAgo: 2 },
    ],
    budgets: {
      Alimentation: 18000, Transport: 2000, Loisirs: 5000, Restaurants: 4000, Fournitures: 1500,
      Santé: 1500, Shopping: 3000, Imprévus: 2000,
    },
    variables: [
      { category: 'Alimentation', monthly: 17500, count: 9, labels: ['Courses supermarché', 'Marché', 'Boulangerie', 'Épicerie'], payment: 'Carte bancaire' },
      { category: 'Restaurants', monthly: 4200, count: 4, labels: ['Restaurant universitaire', 'Café avec des amis', 'Kebab'], payment: 'Carte bancaire' },
      { category: 'Loisirs', monthly: 4000, count: 3, labels: ['Cinéma', 'Sortie', 'Concert'], payment: 'Carte bancaire' },
      { category: 'Fournitures', monthly: 1200, count: 2, labels: ['Cahiers', 'Photocopies'], payment: 'Espèces' },
      { category: 'Shopping', monthly: 2600, count: 1, labels: ['Vêtements', 'Livre'], payment: 'Carte bancaire' },
      { category: 'Transport', monthly: 1000, count: 2, labels: ['Billet de train', 'Trottinette'], payment: 'Paiement mobile' },
      { category: 'Santé', monthly: 900, count: 1, labels: ['Pharmacie'], payment: 'Carte bancaire' },
    ],
    goals: [
      { name: 'Ordinateur', description: 'Remplacer mon ordinateur portable pour les cours.', target: 90000, initial: 15000, monthly: 4000, monthsToTarget: 10, priority: 'haute' },
      { name: 'Fonds d’urgence', description: 'Avoir un petit matelas de sécurité.', target: 50000, initial: 12000, monthly: 1000, monthsToTarget: null, priority: 'moyenne' },
    ],
  },
  alternant: {
    name: 'Hugo (démo)',
    type: 'alternant',
    savingsTarget: 15000,
    variableEstimate: 59000,
    seed: 23,
    incomes: [
      { name: 'Salaire d’alternance', amount: 118000, day: 2, category: 'Salaire' },
      { name: 'Prime d’activité', amount: 16000, day: 5, category: 'Aides' },
    ],
    oneOffIncomes: [
      { name: 'Prime de fin de projet', amount: 20000, monthsAgo: 2, day: 28, category: 'Prime' },
      { name: 'Cadeau d’anniversaire', amount: 5000, monthsAgo: 1, day: 14, category: 'Aide familiale' },
    ],
    charges: [
      { name: 'Loyer colocation', amount: 45000, day: 5, category: 'Loyer' },
      { name: 'Forfait mobile', amount: 1599, day: 10, category: 'Téléphone' },
      { name: 'Box Internet (part)', amount: 1500, day: 12, category: 'Internet' },
      { name: 'Assurance auto', amount: 4500, day: 12, category: 'Assurance' },
      { name: 'Streaming + salle de sport', amount: 3498, day: 18, category: 'Abonnements' },
    ],
    budgets: {
      Alimentation: 22000, Carburant: 12000, Transport: 2000, Restaurants: 6000, Loisirs: 7000,
      Shopping: 5000, Santé: 2000, Imprévus: 3000,
    },
    variables: [
      { category: 'Alimentation', monthly: 21000, count: 8, labels: ['Courses', 'Drive', 'Boulangerie'], payment: 'Carte bancaire' },
      { category: 'Carburant', monthly: 12800, count: 3, labels: ['Plein d’essence'], payment: 'Carte bancaire' },
      { category: 'Restaurants', monthly: 5200, count: 4, labels: ['Déjeuner au travail', 'Pizza', 'Restaurant'], payment: 'Carte bancaire' },
      { category: 'Loisirs', monthly: 6000, count: 3, labels: ['Match de foot', 'Jeu vidéo', 'Bowling'], payment: 'Carte bancaire' },
      { category: 'Shopping', monthly: 4200, count: 2, labels: ['Baskets', 'T-shirt'], payment: 'Carte bancaire' },
      { category: 'Santé', monthly: 1200, count: 1, labels: ['Pharmacie'], payment: 'Carte bancaire' },
      { category: 'Imprévus', monthly: 2500, count: 1, labels: ['Réparation vélo', 'Amende de stationnement'], payment: 'Carte bancaire' },
    ],
    goals: [
      { name: 'Voiture', description: 'Changer de voiture à la fin de l’alternance.', target: 400000, initial: 80000, monthly: 12000, monthsToTarget: 20, priority: 'haute' },
      { name: 'Voyage', description: 'Une semaine au soleil l’été prochain.', target: 80000, initial: 10000, monthly: 3000, monthsToTarget: 9, priority: 'moyenne' },
    ],
  },
  salarie: {
    name: 'Camille (démo)',
    type: 'salarie',
    savingsTarget: 30000,
    variableEstimate: 112000,
    seed: 37,
    incomes: [
      { name: 'Salaire net', amount: 265000, day: 1, category: 'Salaire' },
      { name: 'Allocations familiales', amount: 14800, day: 6, category: 'Allocations' },
    ],
    oneOffIncomes: [
      { name: 'Prime d’intéressement', amount: 45000, monthsAgo: 2, day: 25, category: 'Primes' },
      { name: 'Remboursement mutuelle', amount: 4500, monthsAgo: 1, day: 9, category: 'Remboursement' },
    ],
    charges: [
      { name: 'Crédit immobilier', amount: 89000, day: 5, category: 'Loyer ou crédit' },
      { name: 'Assurances habitation et auto', amount: 7800, day: 8, category: 'Assurances' },
      { name: 'Électricité et gaz', amount: 9500, day: 10, category: 'Énergie' },
      { name: 'Eau', amount: 10500, day: 15, category: 'Eau', frequency: 'trimestriel', monthsAgo: 2 },
      { name: 'Box Internet', amount: 3499, day: 12, category: 'Internet' },
      { name: 'Forfait mobile', amount: 1999, day: 12, category: 'Téléphone' },
      { name: 'Pass transports', amount: 8640, day: 3, category: 'Transport', note: 'Remboursé à 50 % par l’employeur.' },
      { name: 'Crèche', amount: 18000, day: 6, category: 'Enfants' },
      { name: 'Streaming', amount: 2497, day: 20, category: 'Abonnements' },
    ],
    budgets: {
      Alimentation: 45000, Carburant: 11000, Enfants: 8000, Loisirs: 10000, Restaurants: 8000,
      Shopping: 9000, Santé: 4000, Cadeaux: 4000, Voyages: 5000, Imprévus: 6000,
    },
    variables: [
      { category: 'Alimentation', monthly: 43000, count: 10, labels: ['Courses de la semaine', 'Marché', 'Boucherie', 'Boulangerie'], payment: 'Carte bancaire' },
      { category: 'Carburant', monthly: 10500, count: 2, labels: ['Plein'], payment: 'Carte bancaire' },
      { category: 'Enfants', monthly: 8500, count: 3, labels: ['Couches', 'Vêtements enfant', 'Jouet'], payment: 'Carte bancaire' },
      { category: 'Loisirs', monthly: 7500, count: 3, labels: ['Piscine', 'Cinéma', 'Livre'], payment: 'Carte bancaire' },
      { category: 'Restaurants', monthly: 8600, count: 3, labels: ['Restaurant', 'Déjeuner', 'Brunch'], payment: 'Carte bancaire' },
      { category: 'Shopping', monthly: 6500, count: 2, labels: ['Vêtements', 'Maison'], payment: 'Carte bancaire' },
      { category: 'Santé', monthly: 3000, count: 2, labels: ['Pharmacie', 'Consultation'], payment: 'Carte bancaire' },
      { category: 'Cadeaux', monthly: 3500, count: 1, labels: ['Cadeau d’anniversaire'], payment: 'Carte bancaire' },
      { category: 'Imprévus', monthly: 4000, count: 1, labels: ['Réparation électroménager', 'Serrurier'], payment: 'Virement' },
    ],
    goals: [
      { name: 'Fonds d’urgence', description: 'Trois mois de dépenses de côté.', target: 600000, initial: 320000, monthly: 20000, monthsToTarget: 14, priority: 'haute' },
      { name: 'Voyage en famille', description: 'Vacances d’été.', target: 150000, initial: 30000, monthly: 10000, monthsToTarget: 8, priority: 'moyenne' },
    ],
  },
};

const HISTORY_MONTHS = 3;

export function buildDemoData(profile: DemoProfile, today: ISODate): AppData {
  const spec = SPECS[profile];
  const rand = rng(spec.seed);
  const current = monthOf(today);
  const startMonth = addMonths(current, -HISTORY_MONTHS);
  let n = 0;
  const id = (p: string) => `demo_${profile}_${p}_${(n += 1)}`;

  const categories: Category[] = presetCategories(spec.type).map((c) => ({
    ...c,
    id: id('cat'),
    budget: c.kind === 'variable' ? spec.budgets[c.name] ?? null : null,
  }));
  const cat = (kind: CategoryKind, name: string): string => {
    const found = categories.find((c) => c.kind === kind && c.name === name);
    if (!found) throw new Error(`Catégorie de démonstration introuvable : ${name}`);
    return found.id;
  };
  const dateIn = (month: MonthKey, day: number) => {
    const { year, month: m } = parseMonth(month);
    return toISO(year, m, Math.min(day, daysInMonth(month)));
  };

  const incomes: Income[] = [
    ...spec.incomes.map((r) => ({
      id: id('rev'),
      name: r.name,
      amount: r.amount,
      date: dateIn(addMonths(current, -(r.monthsAgo ?? HISTORY_MONTHS)), r.day),
      categoryId: cat('income', r.category),
      recurring: true,
      frequency: r.frequency ?? 'mensuel',
      endDate: null,
      note: r.note ?? '',
    })),
    ...spec.oneOffIncomes.map((r) => ({
      id: id('rev'),
      name: r.name,
      amount: r.amount,
      date: dateIn(addMonths(current, -r.monthsAgo), r.day),
      categoryId: cat('income', r.category),
      recurring: false,
      frequency: null,
      endDate: null,
      note: r.note ?? '',
    })),
  ];

  const fixedCharges: FixedCharge[] = spec.charges.map((r) => ({
    id: id('chg'),
    name: r.name,
    amount: r.amount,
    date: dateIn(addMonths(current, -(r.monthsAgo ?? HISTORY_MONTHS)), r.day),
    categoryId: cat('fixed', r.category),
    frequency: r.frequency ?? 'mensuel',
    endDate: null,
    note: r.note ?? '',
    status: {},
  }));

  const expenses: Expense[] = [];
  for (let k = 0; k <= HISTORY_MONTHS; k += 1) {
    const month = addMonths(startMonth, k);
    const dim = daysInMonth(month);
    for (const v of spec.variables) {
      // Variation de −20 % à +25 % autour du montant habituel.
      const total = Math.round(v.monthly * (0.8 + rand() * 0.45));
      const weights = Array.from({ length: v.count }, () => 0.5 + rand());
      const parts = splitByWeights(total, weights);
      for (const amount of parts) {
        const date = dateIn(month, 1 + Math.floor(rand() * dim));
        if (date > today) continue;
        expenses.push({
          id: id('dep'),
          amount: Math.max(100, Math.round(amount / 10) * 10),
          categoryId: cat('variable', v.category),
          date,
          description: v.labels[Math.floor(rand() * v.labels.length)],
          paymentMethod: v.payment ?? '',
        });
      }
    }
  }
  expenses.sort((a, b) => a.date.localeCompare(b.date));

  const goals: SavingsGoal[] = spec.goals.map((g) => ({
    id: id('obj'),
    name: g.name,
    description: g.description,
    target: g.target,
    initialAmount: g.initial,
    targetDate: g.monthsToTarget === null ? null : addMonthsToDate(today, g.monthsToTarget),
    priority: g.priority,
    monthlyContribution: g.monthly,
    createdAt: dateIn(startMonth, 1),
  }));

  const savings: SavingsDeposit[] = [];
  for (let k = 0; k <= HISTORY_MONTHS; k += 1) {
    const month = addMonths(startMonth, k);
    goals.forEach((g, i) => {
      const date = dateIn(month, 7 + i);
      if (date > today) return;
      // Un mois sur quatre, le second objectif reçoit un versement réduit.
      const amount = i === 1 && k === 1 ? Math.round(g.monthlyContribution / 2) : g.monthlyContribution;
      savings.push({ id: id('epa'), goalId: g.id, amount, date, note: 'Virement vers le livret' });
    });
  }

  return {
    version: 1,
    profile: {
      name: spec.name,
      type: spec.type,
      currency: 'EUR',
      monthlySavingsTarget: spec.savingsTarget,
      variableEstimate: spec.variableEstimate,
      createdAt: dateIn(startMonth, 1),
    },
    settings: { theme: 'light', appearanceVersion: APPEARANCE_VERSION },
    categories,
    incomes,
    fixedCharges,
    expenses,
    goals,
    savings,
  };
}
