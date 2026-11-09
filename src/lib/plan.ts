import type { AppData, Cents, Income, ISODate, MonthKey, SavingsDeposit, SavingsGoal, SavingsSupport, SupportKind, TemporaryHold } from '../types';
import { categoryMap, isCarteRestaurant, transactionsInRange } from './budget';
import { addDays, addMonths, firstDay, lastDay, monthOf, parseISO } from './dates';
import { goalProgress, type GoalProgress } from './goals';
import { divideCentsUp, sum } from './money';

/* -------------------------------------------------------------------------- */
/* Supports d'épargne                                                          */
/* -------------------------------------------------------------------------- */

export interface ModeleSupport {
  label: string;
  /** Taux indicatif (à vérifier : il change dans le temps et selon les banques). */
  taux: number;
  plafond: Cents | null;
  liquidite: 'immediate' | 'bloque';
  retraitCloture: boolean;
  aide: string;
}

/** Repères généraux par type de support (modifiables sur chaque support). */
export const MODELES_SUPPORT: Record<SupportKind, ModeleSupport> = {
  'livret-a': {
    label: 'Livret A',
    taux: 1.7,
    plafond: 2295000,
    liquidite: 'immediate',
    retraitCloture: false,
    aide: 'Disponible à tout moment, intérêts non imposés.',
  },
  ldds: {
    label: 'LDDS',
    taux: 1.7,
    plafond: 1200000,
    liquidite: 'immediate',
    retraitCloture: false,
    aide: 'Comme le Livret A, disponible à tout moment.',
  },
  'livret-jeune': {
    label: 'Livret Jeune',
    taux: 1.7,
    plafond: 160000,
    liquidite: 'immediate',
    retraitCloture: false,
    aide: 'De 12 à 25 ans ; taux au moins égal à celui du Livret A.',
  },
  lep: { label: 'LEP', taux: 2.7, plafond: 1000000, liquidite: 'immediate', retraitCloture: false, aide: 'Réservé aux revenus modestes.' },
  pel: {
    label: 'PEL',
    taux: 1.75,
    plafond: 6120000,
    liquidite: 'bloque',
    retraitCloture: true,
    aide: 'Aucun retrait partiel : un retrait clôture le plan.',
  },
  cel: { label: 'CEL', taux: 1.25, plafond: 1530000, liquidite: 'immediate', retraitCloture: false, aide: 'Retraits possibles.' },
  'assurance-vie': {
    label: 'Assurance vie',
    taux: 0,
    plafond: null,
    liquidite: 'immediate',
    retraitCloture: false,
    aide: 'Rachat possible ; fiscalité selon l’ancienneté.',
  },
  pea: { label: 'PEA', taux: 0, plafond: 15000000, liquidite: 'bloque', retraitCloture: true, aide: 'Avant 5 ans, un retrait clôture le plan.' },
  'epargne-salariale': {
    label: 'Épargne salariale',
    taux: 0,
    plafond: null,
    liquidite: 'bloque',
    retraitCloture: false,
    aide: 'Bloquée 5 ans en général, sauf cas de déblocage anticipé.',
  },
  'compte-courant': {
    label: 'Compte courant (non affecté)',
    taux: 0,
    plafond: null,
    liquidite: 'immediate',
    retraitCloture: false,
    aide: 'Argent mis de côté sur le compte courant.',
  },
  autre: { label: 'Autre support', taux: 0, plafond: null, liquidite: 'immediate', retraitCloture: false, aide: '' },
};

export const SUPPORT_KINDS = Object.keys(MODELES_SUPPORT) as SupportKind[];

/** Solde d'un support aujourd'hui : solde déclaré + versements liés depuis cette date. */
export function soldeSupport(data: AppData, s: SavingsSupport, today: ISODate): Cents {
  const versements = data.savings.filter((d) => d.supportId === s.id && d.date > s.balanceDate && d.date <= today);
  return s.balance + sum(versements.map((d) => d.amount));
}

/** Un support est disponible s'il n'est pas bloqué (ou si sa date de blocage est passée). */
export function supportDisponible(s: SavingsSupport, today: ISODate): boolean {
  if (s.blockedUntil && s.blockedUntil > today) return false;
  return s.liquidity === 'immediate' || (s.blockedUntil !== null && s.blockedUntil <= today);
}

export function soldesSupports(data: AppData, today: ISODate): Map<string, Cents> {
  return new Map((data.supports ?? []).map((s) => [s.id, soldeSupport(data, s, today)]));
}

export interface TotauxEpargne {
  /** Tous supports confondus. */
  totale: Cents;
  /** Ce qui peut être retiré tout de suite (hors supports bloqués). */
  disponible: Cents;
  bloquee: Cents;
}

export function totauxEpargne(data: AppData, today: ISODate): TotauxEpargne {
  let totale = 0;
  let disponible = 0;
  for (const s of data.supports ?? []) {
    const solde = soldeSupport(data, s, today);
    totale += solde;
    if (supportDisponible(s, today)) disponible += solde;
  }
  return { totale, disponible, bloquee: totale - disponible };
}

/** Progression d'un objectif ; s'il suit des supports, le montant atteint est leur total. */
export function progressionObjectif(data: AppData, g: SavingsGoal, today: ISODate): GoalProgress {
  return goalProgress(g, data.savings, today, soldesSupports(data, today));
}

/** L'objectif principal : celui qui suit les supports, sinon le premier objectif daté non atteint. */
export function objectifPrincipal(data: AppData, today: ISODate): SavingsGoal | null {
  const avecSupports = data.goals.find((g) => (g.supportIds?.length ?? 0) > 0);
  if (avecSupports) return avecSupports;
  return data.goals.find((g) => g.targetDate && !progressionObjectif(data, g, today).reached) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Sommes bloquées temporairement                                              */
/* -------------------------------------------------------------------------- */

/** Sommes bloquées à cette date (dépôt de garantie…) : elles ne sont pas dépensées, mais pas disponibles. */
export function sommesBloquees(data: AppData, date: ISODate): TemporaryHold[] {
  return (data.holds ?? []).filter((h) => !h.returned && h.start <= date && (h.end === null || h.end >= date));
}

/* -------------------------------------------------------------------------- */
/* Revenus attendus                                                            */
/* -------------------------------------------------------------------------- */

export const revenusAttendus = (data: AppData): Income[] => data.incomes.filter((i) => i.certitude === 'attendu');

/** Montant retenu pour un revenu attendu dans la projection optimiste (bas de la fourchette, 0 si inconnu). */
export const montantRetenu = (i: Income): Cents => (i.amountUnknown ? 0 : i.amount);

/* -------------------------------------------------------------------------- */
/* Projection mois par mois                                                    */
/* -------------------------------------------------------------------------- */

export interface LigneProjection {
  mois: MonthKey;
  /** Mois déjà terminé : chiffres réels. */
  passe: boolean;
  /** Revenus encaissés sur le compte (hors avantages en nature et hors revenus attendus). */
  revenus: Cents;
  /** Avantage en nature du mois (carte restaurant) : pouvoir d'achat alimentaire, pas un revenu encaissé. */
  avantages: Cents;
  charges: Cents;
  /** Dépenses courantes à venir : le reste du budget (mois en cours) ou le budget (mois suivants), ou plus si déjà prévu. */
  courantes: Cents;
  /** Dépenses exceptionnelles prévues ou faites (voyage…). */
  exceptionnelles: Cents;
  /** Épargne possible du mois (base). */
  epargne: Cents;
  /** Revenus attendus cochés, ajoutés dans la projection optimiste. */
  attendus: Cents;
  cumul: Cents;
  cumulOptimiste: Cents;
  /** Sommes bloquées ce mois-ci (non comptées comme dépenses). */
  bloque: Cents;
  notes: string[];
}

export interface Projection {
  objectif: SavingsGoal;
  progression: GoalProgress;
  depart: Cents;
  lignes: LigneProjection[];
  /** Mois d'épargne restants, mois en cours compris. */
  moisRestants: number;
  /** Épargne mensuelle nécessaire pour atteindre l'objectif à la date (recalculée chaque jour). */
  necessaireParMois: Cents;
  finale: Cents;
  finaleOptimiste: Cents;
  /** Écart final avec l'objectif (positif : en avance). */
  ecart: Cents;
  ecartOptimiste: Cents;
  dansLesTemps: boolean;
}

/** Budget mensuel des dépenses courantes : l'estimation du profil, sinon la somme des limites. */
export function budgetCourant(data: AppData): Cents {
  const estimation = data.profile?.variableEstimate ?? 0;
  if (estimation > 0) return estimation;
  return sum(data.categories.filter((c) => c.kind === 'variable').map((c) => c.budget ?? 0));
}

/**
 * Projection mensuelle jusqu'à la date de l'objectif, en trésorerie : à partir de demain (les soldes des
 * supports sont ceux d'aujourd'hui) et jusqu'à la date visée, avec les **vraies dates** des opérations
 * (la règle du 20 sert au budget du mois, pas à savoir si l'argent sera là à temps).
 * Base : revenus sûrs encaissés − charges − dépenses courantes − dépenses exceptionnelles.
 * Optimiste : + revenus attendus cochés. Les avantages en nature (titres-restaurant) et les sommes
 * bloquées sont affichés à part, sans entrer dans le calcul.
 */
export function projection(data: AppData, objectif: SavingsGoal, today: ISODate): Projection {
  const progression = progressionObjectif(data, objectif, today);
  const debut = monthOf(today);
  const fin = objectif.targetDate ? monthOf(objectif.targetDate) : addMonths(debut, 11);
  const limite = objectif.targetDate ?? lastDay(fin);
  const budget = budgetCourant(data);
  const cats = categoryMap(data);
  const attendus = revenusAttendus(data);

  const lignes: LigneProjection[] = [];
  let cumul = progression.current;
  let cumulOptimiste = progression.current;
  for (let m = debut; m <= fin; m = addMonths(m, 1)) {
    const de = m === debut ? addDays(today, 1) : firstDay(m);
    const a = lastDay(m) < limite ? lastDay(m) : limite;
    const tx = transactionsInRange(data, de, a, today);
    const encaisses = tx.filter((t) => t.type === 'revenu' && t.account === 'compte');
    const revenus = sum(encaisses.map((t) => t.amount));
    const avantages = sum(tx.filter((t) => t.type === 'revenu' && t.account === 'carte-restaurant').map((t) => t.amount));
    const charges = sum(tx.filter((t) => t.type === 'charge').map((t) => t.amount));
    const depensesDuMois = data.expenses.filter((e) => monthOf(e.date) === m && !isCarteRestaurant(e.paymentMethod));
    const aVenir = depensesDuMois.filter((e) => e.date >= de && e.date <= a);
    const exceptionnelles = sum(aVenir.filter((e) => e.exceptional).map((e) => e.amount));
    const courantesPrevues = sum(aVenir.filter((e) => !e.exceptional).map((e) => e.amount));
    // Mois en cours : seulement ce qui reste du budget ; mois suivants : le budget (ou plus si déjà prévu)
    const dejaDepense = m === debut ? sum(depensesDuMois.filter((e) => !e.exceptional && e.date <= today).map((e) => e.amount)) : 0;
    const resteBudget = Math.max(0, budget - dejaDepense);
    const courantes = a < de ? 0 : Math.max(courantesPrevues, resteBudget);
    const epargne = revenus - charges - courantes - exceptionnelles;
    // Revenus attendus de la période (ceux dont la date est passée sans confirmation comptent pour le mois en cours)
    const attendusDuMois = attendus.filter((i) => (i.date >= de && i.date <= a) || (m === debut && i.date <= today));
    const attenduMontant = sum(attendusDuMois.filter((i) => i.inOptimistic).map(montantRetenu));
    const bloquees = (data.holds ?? []).filter((h) => !h.returned && monthOf(h.start) === m);
    const notes = [
      ...encaisses.filter((t) => !data.incomes.find((i) => i.id === t.sourceId)?.recurring).map((t) => `${t.label} (revenu)`),
      ...aVenir
        .filter((e) => e.exceptional)
        .map((e) => `${e.description || cats.get(e.categoryId)?.name || 'Dépense exceptionnelle'} (dépense exceptionnelle)`),
      ...bloquees.map((h) => `${h.label} : somme bloquée, rendue ensuite`),
      ...attendusDuMois.map((i) => `${i.name} : revenu attendu${i.amountUnknown ? ', montant inconnu' : ''}${i.inOptimistic ? '' : ', non inclus'}`),
    ];
    cumul += epargne;
    cumulOptimiste += epargne + attenduMontant;
    lignes.push({
      mois: m,
      passe: lastDay(m) < today,
      revenus,
      avantages,
      charges,
      courantes,
      exceptionnelles,
      epargne,
      attendus: attenduMontant,
      cumul,
      cumulOptimiste,
      bloque: sum(bloquees.map((h) => h.amount)),
      notes,
    });
  }

  const moisRestants = lignes.length;
  const reste = Math.max(0, objectif.target - progression.current);
  const finale = lignes.length > 0 ? lignes[lignes.length - 1].cumul : progression.current;
  const finaleOptimiste = lignes.length > 0 ? lignes[lignes.length - 1].cumulOptimiste : progression.current;
  return {
    objectif,
    progression,
    depart: progression.current,
    lignes,
    moisRestants,
    necessaireParMois: moisRestants > 0 ? divideCentsUp(reste, moisRestants) : reste,
    finale,
    finaleOptimiste,
    ecart: finale - objectif.target,
    ecartOptimiste: finaleOptimiste - objectif.target,
    dansLesTemps: finale >= objectif.target,
  };
}

/* -------------------------------------------------------------------------- */
/* Profil : âge et fin de contrat                                              */
/* -------------------------------------------------------------------------- */

export function age(birthDate: ISODate | null | undefined, today: ISODate): number | null {
  if (!birthDate) return null;
  const n = parseISO(birthDate);
  const t = parseISO(today);
  let a = t.year - n.year;
  if (t.month < n.month || (t.month === n.month && t.day < n.day)) a -= 1;
  return a;
}

/* -------------------------------------------------------------------------- */
/* Étapes d'un objectif (25, 50, 75, 100 %)                                    */
/* -------------------------------------------------------------------------- */

export const ETAPES_OBJECTIF = [25, 50, 75, 100] as const;

/** Plus haute étape franchie entre deux pourcentages (null si aucune). */
export function etapeFranchie(avant: number, apres: number): number | null {
  const franchies = ETAPES_OBJECTIF.filter((e) => avant < e && apres >= e);
  return franchies.length ? franchies[franchies.length - 1] : null;
}

/**
 * Message de Poksy quand un versement fait franchir une étape à son objectif (sinon null).
 * Calcul en lecture seule : rien n'est enregistré ici.
 */
export function messageEtape(data: AppData, depot: SavingsDeposit, today: ISODate): string | null {
  const g = data.goals.find((x) => x.id === depot.goalId);
  if (!g) return null;
  const avant = progressionObjectif(data, g, today).pct;
  const apres = progressionObjectif({ ...data, savings: [...data.savings.filter((s) => s.id !== depot.id), depot] }, g, today).pct;
  const e = etapeFranchie(avant, apres);
  if (e === null) return null;
  return e === 100 ? `Objectif « ${g.name} » atteint. Bravo !` : `Cap des ${e} % franchi pour « ${g.name} ».`;
}
