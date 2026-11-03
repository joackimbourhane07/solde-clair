/**
 * Modèle de données de SoldeClair.
 *
 * Tous les montants sont stockés en CENTIMES (nombres entiers) pour éviter
 * les erreurs d'arrondi des nombres à virgule (0,1 + 0,2 ≠ 0,3).
 * Toutes les dates sont des chaînes « AAAA-MM-JJ » (date locale, sans fuseau).
 * Les mois sont des chaînes « AAAA-MM ».
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

/** Comptes suivis : le compte bancaire et la carte restaurant (titres-restaurant). */
export type AccountId = 'compte' | 'carte-restaurant';

export interface Profile {
  name: string;
  type: ProfileType;
  currency: string;
  /** Objectif d'épargne mensuel (centimes). */
  monthlySavingsTarget: Cents;
  /** Estimation des dépenses variables mensuelles (centimes). */
  variableEstimate: Cents;
  createdAt: ISODate;
  /** Date de naissance (facultative) : âge, Livret Jeune, tranche de salaire d'apprenti. */
  birthDate?: ISODate | null;
  /** Détails de la situation (facultatifs), dont le sens dépend du profil. */
  situation?: ProfileSituation;
}

/**
 * Détails de la situation. Alternant : formation, entreprise, début et fin du contrat ;
 * étudiant : études, établissement, année universitaire ; salarié : poste, employeur, embauche, fin de CDD ;
 * indépendant : activité, entreprise, début d'activité.
 */
export interface ProfileSituation {
  formation?: string;
  employeur?: string;
  debut?: ISODate | null;
  fin?: ISODate | null;
  /** Territoire ou département (ex. « Gironde (33) »). */
  territoire?: string;
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
  /** Compte crédité ; absent = déduit de la catégorie ou du nom (« Carte restaurant » → carte restaurant). */
  account?: AccountId;
  /**
   * « attendu » : revenu incertain (prime non confirmée, montant inconnu…). Il n'est compté nulle part
   * tant qu'il n'est pas confirmé, sauf dans la projection optimiste si on le coche. Absent : revenu sûr.
   */
  certitude?: 'sur' | 'attendu';
  /** Revenu attendu : haut de la fourchette (le montant `amount` en est le bas). */
  amountMax?: Cents | null;
  /** Revenu attendu dont le montant est encore inconnu. */
  amountUnknown?: boolean;
  /** Revenu attendu inclus dans la projection optimiste. */
  inOptimistic?: boolean;
  /** Détail facultatif, par exemple les lignes du bulletin de paie (montants signés, en centimes). */
  details?: IncomeDetail[];
}

export interface IncomeDetail {
  label: string;
  /** Montant signé : + pour un gain, − pour une retenue. */
  amount: number;
}

/** Ajustement du solde réel d'un compte (montant signé), pour coller au solde de la banque. */
export interface BalanceAdjustment {
  id: string;
  account: AccountId;
  date: ISODate;
  amount: Cents;
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
   * Sans choix manuel : « payé » si la date est passée, « à venir » sinon.
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
  /** Dépense exceptionnelle (voyage, achat important…) : hors du budget courant, comptée à part dans la projection. */
  exceptional?: boolean;
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
  /** Illustration choisie ; absente : déduite du nom (« Voyage » → voyage…). */
  theme?: GoalTheme;
  /** Supports d'épargne suivis par l'objectif : le montant atteint est leur total (tous supports confondus). */
  supportIds?: string[];
}

export type GoalTheme = 'urgence' | 'voyage' | 'vehicule' | 'etudes' | 'logement' | 'tech' | 'fete' | 'sante' | 'projet';

/** Versement d'épargne (vers un objectif ou en épargne libre). */
export interface SavingsDeposit {
  id: string;
  goalId: string | null;
  amount: Cents;
  date: ISODate;
  note: string;
  /** Support crédité (Livret A, PEL…) : son solde augmente du versement. */
  supportId?: string | null;
}

export type SupportKind =
  | 'livret-a'
  | 'ldds'
  | 'livret-jeune'
  | 'lep'
  | 'pel'
  | 'cel'
  | 'assurance-vie'
  | 'pea'
  | 'epargne-salariale'
  | 'compte-courant'
  | 'autre';

/** Support d'épargne : livret, plan, compte… avec son solde, son taux et sa disponibilité. */
export interface SavingsSupport {
  id: string;
  name: string;
  kind: SupportKind;
  /** Solde connu à la date `balanceDate` ; les versements liés après cette date s'y ajoutent. */
  balance: Cents;
  balanceDate: ISODate;
  /** Taux net annuel en % (ex. 1.7). */
  rate: number;
  /** Disponibilité : immédiate ou bloquée. */
  liquidity: 'immediate' | 'bloque';
  /** Bloqué jusqu'à cette date (facultatif). */
  blockedUntil: ISODate | null;
  /** Un retrait clôture le support (PEL…). */
  withdrawalCloses: boolean;
  /** Plafond de versements (facultatif). */
  ceiling: Cents | null;
  /** Montant visé sur ce support dans la répartition de l'objectif (facultatif). */
  target: Cents | null;
  note: string;
}

/** Somme bloquée temporairement (dépôt de garantie, caution…) : ce n'est pas une dépense, elle est rendue ensuite. */
export interface TemporaryHold {
  id: string;
  label: string;
  amount: Cents;
  /** Date à laquelle la somme est bloquée. */
  start: ISODate;
  /** Date prévue de restitution (facultative). */
  end: ISODate | null;
  account: AccountId;
  /** Somme rendue (restitution confirmée). */
  returned: boolean;
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
  /** Version des catégories proposées (3 = « Carte restaurant » ajoutée aux revenus). */
  presetsVersion?: number;
  /** Actions suggérées que la personne a choisi d'ignorer (tableau de bord). */
  dismissedActions?: string[];
  /** Reporter le reste d'un mois sur le suivant (cumul). Actif si absent. */
  carryOver?: boolean;
  /**
   * Jour à partir duquel un revenu compte pour le mois suivant (salaire ou prime de fin de mois).
   * Absent : le 20 (réglage par défaut) ; null : règle désactivée.
   */
  incomeShiftDay?: number | null;
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
  /** Ajustements de solde (onglet Compte). */
  adjustments: BalanceAdjustment[];
  /** Supports d'épargne (absents des sauvegardes plus anciennes). */
  supports?: SavingsSupport[];
  /** Sommes bloquées temporairement (dépôt de garantie…). */
  holds?: TemporaryHold[];
}

export type TransactionType = 'revenu' | 'charge' | 'depense' | 'epargne' | 'ajustement';

/** Vue unifiée d'un mouvement (utilisée par l'historique, les exports et les calculs). */
export interface Transaction {
  key: string;
  sourceId: string;
  type: TransactionType;
  date: ISODate;
  label: string;
  categoryId: string | null;
  categoryName: string;
  /** Montant positif ; pour un ajustement, montant signé (voir signedAmount). */
  amount: Cents;
  note: string;
  paymentMethod: string;
  status?: ChargeStatus;
  /** Compte concerné (compte bancaire ou carte restaurant). */
  account: AccountId;
}
