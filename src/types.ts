/**
 * Modèle de données de SoldeClair.
 *
 * Tous les montants sont stockés en CENTIMES (nombres entiers) pour éviter
 * les erreurs d'arrondi des nombres à virgule (0,1 + 0,2 ≠ 0,3).
 * Toutes les dates sont des chaînes « AAAA-MM-JJ » (date locale, sans fuseau).
 * Les mois sont des chaînes « AAAA-MM ».
 */

export type Cents = number;
export type ISODate = string; // AAAA-MM-JJ
export type MonthKey = string; // AAAA-MM

export type ProfileType = 'etudiant' | 'alternant' | 'salarie' | 'independant' | 'autre';

export type CategoryKind = 'income' | 'fixed' | 'variable';

export type Frequency = 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel';

export type Priority = 'haute' | 'moyenne' | 'basse';

export type ThemeChoice = 'system' | 'light' | 'dark';

export type ChargeStatus = 'paye' | 'a_venir';

export interface Profile {
  name: string;
  type: ProfileType;
  currency: string;
  /** Objectif d'épargne mensuel (centimes). */
  monthlySavingsTarget: Cents;
  /** Estimation des dépenses variables mensuelles (centimes). */
  variableEstimate: Cents;
  createdAt: ISODate;
}

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Limite mensuelle (centimes) — uniquement pour les dépenses variables. */
  budget: Cents | null;
}

export interface Income {
  id: string;
  name: string;
  amount: Cents;
  /** Date du versement (ou du premier versement si récurrent). */
  date: ISODate;
  categoryId: string;
  recurring: boolean;
  frequency: Frequency | null;
  /** Dernière date incluse pour un revenu récurrent (facultatif). */
  endDate: ISODate | null;
  note: string;
}

export interface FixedCharge {
  id: string;
  name: string;
  amount: Cents;
  /** Date du premier prélèvement prévu. */
  date: ISODate;
  categoryId: string;
  frequency: Frequency;
  endDate: ISODate | null;
  note: string;
  /**
   * Statut choisi manuellement pour une échéance donnée (clé = date de l'échéance).
   * Sans choix manuel : « payé » si la date est passée, « à venir » sinon.
   */
  status: Record<ISODate, ChargeStatus>;
}

export interface Expense {
  id: string;
  amount: Cents;
  categoryId: string;
  date: ISODate;
  description: string;
  paymentMethod: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  description: string;
  target: Cents;
  /** Montant déjà disponible au moment de la création de l'objectif. */
  initialAmount: Cents;
  targetDate: ISODate | null;
  priority: Priority;
  monthlyContribution: Cents;
  createdAt: ISODate;
}

/** Versement d'épargne (vers un objectif ou en épargne libre). */
export interface SavingsDeposit {
  id: string;
  goalId: string | null;
  amount: Cents;
  date: ISODate;
  note: string;
}

export interface Settings {
  theme: ThemeChoice;
  /** Date de la dernière sauvegarde complète (export JSON), pour le rappel. */
  lastBackup?: ISODate | null;
  /** Masquer les montants à l'écran (utilisation en public). */
  hideAmounts?: boolean;
  /** Version de l'apparence (2 = thème clair par défaut). */
  appearanceVersion?: number;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  settings: Settings;
  categories: Category[];
  incomes: Income[];
  fixedCharges: FixedCharge[];
  expenses: Expense[];
  goals: SavingsGoal[];
  savings: SavingsDeposit[];
}

export type TransactionType = 'revenu' | 'charge' | 'depense' | 'epargne';

/** Vue unifiée d'un mouvement (utilisée par l'historique, les exports et les calculs). */
export interface Transaction {
  key: string;
  sourceId: string;
  type: TransactionType;
  date: ISODate;
  label: string;
  categoryId: string | null;
  categoryName: string;
  amount: Cents;
  note: string;
  paymentMethod: string;
  status?: ChargeStatus;
}
