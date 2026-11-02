import type { Category, CategoryKind, ProfileType } from '../types';
import { newId } from './id';

export const PROFILE_LABELS: Record<ProfileType, string> = {
  etudiant: 'Étudiant(e)',
  alternant: 'Alternant(e)',
  salarie: 'Salarié(e)',
  independant: 'Indépendant(e)',
  autre: 'Autre situation',
};

export const KIND_LABELS: Record<CategoryKind, string> = {
  income: 'Revenus',
  fixed: 'Charges fixes',
  variable: 'Dépenses variables',
};

/** Catégories générales suggérées pour tous les profils. */
export const GENERAL_CATEGORIES: Record<CategoryKind, string[]> = {
  income: [
    'Salaire', 'Carte restaurant', 'Bourse', 'Allocation', 'Aide familiale', 'Prime', 'Remboursement',
    'Vente', 'Revenus indépendants', 'Revenus locatifs', 'Autre revenu',
  ],
  fixed: [
    'Loyer', 'Crédit', 'Assurance', 'Téléphone', 'Internet', 'Électricité', 'Eau',
    'Transport', 'Carburant', 'Abonnements', 'Frais scolaires', 'Pension', 'Autre charge',
  ],
  variable: [
    'Alimentation', 'Carburant', 'Transport', 'Restaurants', 'Loisirs', 'Shopping',
    'Santé', 'Cadeaux', 'Voyages', 'Imprévus', 'Autre dépense',
  ],
};

export interface ProfilePreset {
  income: string[];
  fixed: string[];
  variable: string[];
  /** Poids pour répartir l'estimation des dépenses variables en budgets. */
  variableWeights: Record<string, number>;
  /** Charges fixes proposées pendant la configuration initiale. */
  suggestedCharges: string[];
}

/** Catégories adaptées à chaque profil, proposées automatiquement. */
export const PROFILE_PRESETS: Record<ProfileType, ProfilePreset> = {
  etudiant: {
    income: ['Bourse', 'Aide familiale', 'APL / aide au logement', 'Job étudiant', 'Autre revenu'],
    fixed: ['Loyer', 'Téléphone', 'Internet', 'Transport', 'Assurance', 'Frais scolaires', 'Abonnements', 'Autre charge'],
    variable: ['Alimentation', 'Transport', 'Loisirs', 'Restaurants', 'Fournitures', 'Santé', 'Shopping', 'Imprévus', 'Autre dépense'],
    variableWeights: { Alimentation: 45, Transport: 8, Loisirs: 12, Restaurants: 10, Fournitures: 5, Santé: 5, Shopping: 7, Imprévus: 5, 'Autre dépense': 3 },
    suggestedCharges: ['Loyer', 'Téléphone', 'Transport', 'Frais scolaires'],
  },
  alternant: {
    income: ['Salaire', 'Carte restaurant', 'Aides', 'Prime', 'Aide familiale', 'Autre revenu'],
    fixed: ['Loyer', 'Transport', 'Téléphone', 'Internet', 'Assurance', 'Abonnements', 'Crédit', 'Autre charge'],
    variable: ['Alimentation', 'Carburant', 'Transport', 'Restaurants', 'Loisirs', 'Shopping', 'Santé', 'Imprévus', 'Autre dépense'],
    variableWeights: { Alimentation: 35, Carburant: 15, Transport: 5, Restaurants: 10, Loisirs: 12, Shopping: 10, Santé: 5, Imprévus: 5, 'Autre dépense': 3 },
    suggestedCharges: ['Loyer', 'Téléphone', 'Abonnements', 'Assurance'],
  },
  salarie: {
    income: ['Salaire', 'Carte restaurant', 'Primes', 'Allocations', 'Remboursement', 'Revenus locatifs', 'Autre revenu'],
    fixed: ['Loyer ou crédit', 'Assurances', 'Énergie', 'Eau', 'Internet', 'Téléphone', 'Transport', 'Enfants', 'Abonnements', 'Autre charge'],
    variable: ['Alimentation', 'Carburant', 'Enfants', 'Loisirs', 'Restaurants', 'Shopping', 'Santé', 'Cadeaux', 'Voyages', 'Imprévus', 'Autre dépense'],
    variableWeights: { Alimentation: 35, Carburant: 10, Enfants: 10, Loisirs: 10, Restaurants: 8, Shopping: 8, Santé: 5, Cadeaux: 3, Voyages: 5, Imprévus: 4, 'Autre dépense': 2 },
    suggestedCharges: ['Loyer ou crédit', 'Assurances', 'Énergie', 'Internet', 'Téléphone'],
  },
  independant: {
    income: ['Revenus indépendants', 'Carte restaurant', 'Remboursement', 'Allocation', 'Vente', 'Autre revenu'],
    fixed: ['Loyer', 'Cotisations sociales', 'Assurance', 'Téléphone', 'Internet', 'Électricité', 'Abonnements', 'Logiciels', 'Autre charge'],
    variable: ['Alimentation', 'Carburant', 'Transport', 'Matériel', 'Restaurants', 'Loisirs', 'Santé', 'Imprévus', 'Autre dépense'],
    variableWeights: { Alimentation: 35, Carburant: 10, Transport: 5, Matériel: 12, Restaurants: 10, Loisirs: 12, Santé: 6, Imprévus: 7, 'Autre dépense': 3 },
    suggestedCharges: ['Loyer', 'Cotisations sociales', 'Assurance', 'Téléphone'],
  },
  autre: {
    income: GENERAL_CATEGORIES.income,
    fixed: GENERAL_CATEGORIES.fixed,
    variable: GENERAL_CATEGORIES.variable,
    variableWeights: { Alimentation: 40, Carburant: 8, Transport: 6, Restaurants: 8, Loisirs: 10, Shopping: 8, Santé: 5, Cadeaux: 3, Voyages: 4, Imprévus: 5, 'Autre dépense': 3 },
    suggestedCharges: ['Loyer', 'Téléphone', 'Internet', 'Assurance'],
  },
};

export function makeCategory(name: string, kind: CategoryKind, budget: number | null = null): Category {
  return { id: newId('cat'), name: name.trim(), kind, budget: kind === 'variable' ? budget : null };
}

/** Crée la liste de catégories par défaut d'un profil. */
export function presetCategories(type: ProfileType): Category[] {
  const preset = PROFILE_PRESETS[type];
  return [
    ...preset.income.map((n) => makeCategory(n, 'income')),
    ...preset.fixed.map((n) => makeCategory(n, 'fixed')),
    ...preset.variable.map((n) => makeCategory(n, 'variable')),
  ];
}

export function categoriesOfKind(categories: Category[], kind: CategoryKind): Category[] {
  return categories.filter((c) => c.kind === kind);
}

export function findCategoryByName(categories: Category[], kind: CategoryKind, name: string): Category | undefined {
  const n = name.trim().toLocaleLowerCase('fr');
  return categories.find((c) => c.kind === kind && c.name.toLocaleLowerCase('fr') === n);
}

/** Nom normalisé utilisé pour éviter les doublons. */
export function isDuplicateName(categories: Category[], kind: CategoryKind, name: string, exceptId?: string): boolean {
  const n = name.trim().toLocaleLowerCase('fr');
  return categories.some((c) => c.kind === kind && c.id !== exceptId && c.name.toLocaleLowerCase('fr') === n);
}

export const PAYMENT_METHODS = ['Carte bancaire', 'Carte restaurant', 'Espèces', 'Virement', 'Prélèvement', 'Chèque', 'Paiement mobile', 'Autre'];
