import type { Cents, GoalTheme, ISODate, Priority, SavingsDeposit, SavingsGoal } from '../types';
import { addMonthsToDate, monthDiff, monthOf } from './dates';
import { divideCentsUp, sum } from './money';

export const PRIORITY_LABELS: Record<Priority, string> = {
  haute: 'Priorité haute',
  moyenne: 'Priorité moyenne',
  basse: 'Priorité basse',
};

export const GOAL_EXAMPLES = [
  'Fonds d’urgence',
  'Voiture',
  'Voyage',
  'Logement',
  'Études',
  'Ordinateur',
  'Projet personnel',
];

export interface GoalProgress {
  /** Montant disponible : montant initial + versements enregistrés. */
  current: Cents;
  remaining: Cents;
  /** Progression en % (bornée à 100). */
  pct: number;
  reached: boolean;
  /** Nombre de mois restants avant la date souhaitée (null si pas de date). */
  monthsRemaining: number | null;
  /** Effort mensuel nécessaire pour tenir la date souhaitée (null si pas de date). */
  monthlyNeeded: Cents | null;
  /** Date d'atteinte estimée avec la contribution mensuelle prévue (null si non estimable). */
  estimatedDate: ISODate | null;
  /** Mois nécessaires avec la contribution prévue. */
  monthsToReach: number | null;
  /** La contribution prévue permet-elle de tenir la date souhaitée ? */
  onTrack: boolean | null;
  dateExceeded: boolean;
}

/**
 * Montant atteint : si l'objectif suit des supports d'épargne (et que leurs soldes sont fournis), c'est leur total ;
 * sinon le montant de départ plus les versements.
 */
export function goalCurrent(goal: SavingsGoal, deposits: SavingsDeposit[], soldesSupports?: Map<string, Cents>): Cents {
  if (goal.supportIds && goal.supportIds.length > 0 && soldesSupports) {
    return sum(goal.supportIds.map((id) => soldesSupports.get(id) ?? 0));
  }
  return goal.initialAmount + sum(deposits.filter((d) => d.goalId === goal.id).map((d) => d.amount));
}

/**
 * Mois restants avant la date souhaitée, en mois calendaires.
 * Exemple : le 1er novembre pour une date en mai → 6 mois.
 * Si la date tombe dans le mois en cours (et n'est pas dépassée) : 1 mois.
 */
export function monthsUntil(targetDate: ISODate, today: ISODate): number {
  if (targetDate < today) return 0;
  return Math.max(1, monthDiff(monthOf(today), monthOf(targetDate)));
}

export function goalProgress(goal: SavingsGoal, deposits: SavingsDeposit[], today: ISODate, soldesSupports?: Map<string, Cents>): GoalProgress {
  const current = goalCurrent(goal, deposits, soldesSupports);
  const remaining = Math.max(0, goal.target - current);
  const reached = goal.target > 0 && remaining === 0;
  const pct = goal.target > 0 ? Math.min(100, Math.floor((current * 100) / goal.target)) : 0;

  let monthsRemaining: number | null = null;
  let monthlyNeeded: Cents | null = null;
  let dateExceeded = false;
  if (goal.targetDate) {
    monthsRemaining = monthsUntil(goal.targetDate, today);
    dateExceeded = goal.targetDate < today && !reached;
    monthlyNeeded = reached ? 0 : monthsRemaining > 0 ? divideCentsUp(remaining, monthsRemaining) : remaining;
  }

  let estimatedDate: ISODate | null = null;
  let monthsToReach: number | null = null;
  if (reached) {
    monthsToReach = 0;
    estimatedDate = today;
  } else if (goal.monthlyContribution > 0) {
    monthsToReach = Math.ceil(remaining / goal.monthlyContribution);
    estimatedDate = addMonthsToDate(today, monthsToReach);
  }

  let onTrack: boolean | null = null;
  if (reached) onTrack = true;
  else if (goal.targetDate && monthlyNeeded !== null) {
    onTrack = !dateExceeded && goal.monthlyContribution >= monthlyNeeded;
  }

  return {
    current,
    remaining,
    pct,
    reached,
    monthsRemaining,
    monthlyNeeded,
    estimatedDate,
    monthsToReach,
    onTrack,
    dateExceeded,
  };
}

const PRIORITY_ORDER: Record<Priority, number> = { haute: 0, moyenne: 1, basse: 2 };

export function sortGoals(goals: SavingsGoal[]): SavingsGoal[] {
  return [...goals].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.name.localeCompare(b.name, 'fr'),
  );
}

/* -------------------------------------------------------------------------- */
/* Illustrations, jalons et simulation « Et si je mettais… »                   */
/* -------------------------------------------------------------------------- */

export const THEME_LABELS: Record<GoalTheme, string> = {
  urgence: 'Imprévus',
  voyage: 'Voyage',
  vehicule: 'Véhicule',
  etudes: 'Études',
  logement: 'Logement',
  tech: 'Informatique',
  fete: 'Fête, cadeau',
  sante: 'Santé',
  projet: 'Projet',
};

export const GOAL_THEMES = Object.keys(THEME_LABELS) as GoalTheme[];

const MOTIFS: [GoalTheme, RegExp][] = [
  ['urgence', /urgence|impr[ée]vu|s[ée]curit[ée]|pr[ée]caution|coussin|matelas/i],
  ['etudes', /[ée]tude|alter+n+ance|[ée]cole|dipl[ôo]me|formation|master|licence|universit|bts|bac\b/i],
  ['vehicule', /voiture|v[ée]hicule|moto|scooter|permis|v[ée]lo|auto\b|camion/i],
  ['voyage', /voyage|vacances|s[ée]jour|week-?end|avion|trip|tour du monde|croisi[èe]re/i],
  ['logement', /logement|appart|maison|d[ée]m[ée]nag|caution|loyer|immobili|meuble|studio/i],
  ['tech', /ordinateur|\bpc\b|t[ée]l[ée]phone|smartphone|iphone|console|tablette|\bmac\b|informatique|portable/i],
  ['fete', /mariage|anniversaire|cadeau|no[ëe]l|f[êe]te|naissance|b[ée]b[ée]/i],
  ['sante', /sant[ée]|dentiste|lunettes|m[ée]dical|soins|op[ée]ration/i],
];

/** Thème déduit du nom de l'objectif (« Fonds d'urgence » → urgence), sinon « projet ». */
export function themeFromName(name: string): GoalTheme {
  return MOTIFS.find(([, motif]) => motif.test(name))?.[0] ?? 'projet';
}

export function goalTheme(goal: Pick<SavingsGoal, 'name' | 'theme'>): GoalTheme {
  return goal.theme ?? themeFromName(goal.name);
}

/** Étapes de progression affichées sur chaque objectif. */
export const JALONS = [25, 50, 75, 100] as const;

export interface SimulationMensuelle {
  monthsToReach: number;
  estimatedDate: ISODate;
  /** Atteint au plus tard le mois de la date souhaitée (null s'il n'y a pas de date). */
  avantLaDate: boolean | null;
}

/** « Et si je mettais X € par mois ? » : date d'arrivée avec ce montant mensuel. */
export function simulerContribution(
  goal: SavingsGoal,
  deposits: SavingsDeposit[],
  today: ISODate,
  mensuel: Cents,
  soldesSupports?: Map<string, Cents>,
): SimulationMensuelle | null {
  const { remaining } = goalProgress(goal, deposits, today, soldesSupports);
  if (mensuel <= 0) return null;
  const monthsToReach = Math.ceil(remaining / mensuel);
  const estimatedDate = addMonthsToDate(today, monthsToReach);
  return {
    monthsToReach,
    estimatedDate,
    avantLaDate: goal.targetDate ? monthOf(estimatedDate) <= monthOf(goal.targetDate) : null,
  };
}
