import type {
  AccountId,
  AppData,
  BalanceAdjustment,
  Category,
  Expense,
  FixedCharge,
  Frequency,
  Income,
  ISODate,
  Profile,
  SavingsDeposit,
  SavingsGoal,
  GoalTheme,
  IncomeDetail,
  ProfileSituation,
  SavingsSupport,
  SupportKind,
  TemporaryHold,
} from '../types';
import { earliestDate, signedAmount, transactionsInRange } from './budget';
import { isValidISODate, lastDay, monthOf } from './dates';
import { centsToInput } from './money';
import { GOAL_THEMES } from './goals';

/**
 * Stockage 100 % local : les données restent dans le navigateur (localStorage).
 * Rien n'est envoyé à un serveur.
 */
export const STORAGE_KEY = 'soldeclair:donnees:v1';

/**
 * Version de l'apparence. Avant la version 2, le thème sombre était choisi par défaut :
 * les données plus anciennes passent une seule fois au thème clair, le nouveau défaut.
 * Un choix fait ensuite dans les paramètres est conservé.
 */
export const APPEARANCE_VERSION = 2;

/** Version des catégories proposées : 3 = « Carte restaurant » parmi les revenus. */
export const PRESETS_VERSION = 3;

export function emptyData(): AppData {
  return {
    version: 1,
    profile: null,
    // Thème clair par défaut (sombre et automatique restent disponibles).
    settings: { theme: 'light', appearanceVersion: APPEARANCE_VERSION, presetsVersion: PRESETS_VERSION },
    categories: [],
    incomes: [],
    fixedCharges: [],
    expenses: [],
    goals: [],
    savings: [],
    adjustments: [],
    supports: [],
    holds: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Plusieurs profils sur le même appareil                                      */
/* -------------------------------------------------------------------------- */

/**
 * Chaque profil a ses propres données. Le premier profil garde la clé historique
 * (« soldeclair:donnees:v1 ») : les données existantes deviennent ce profil, sans rien perdre.
 */
export const PROFILES_KEY = 'soldeclair:profils:v1';
export const PREMIER_PROFIL = 'principal';

export interface ProfilesIndex {
  /** Profil ouvert. */
  actif: string;
  /** Profils enregistrés (avec des données). */
  ids: string[];
}

export interface ProfilResume {
  id: string;
  nom: string;
  type: string;
}

export function dataKey(id: string): string {
  return id === PREMIER_PROFIL ? STORAGE_KEY : `${STORAGE_KEY}:${id}`;
}

const idValide = (x: unknown): x is string => typeof x === 'string' && /^[a-z0-9-]{1,40}$/i.test(x);

export function loadIndex(): ProfilesIndex {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<ProfilesIndex>;
      const ids = Array.isArray(p.ids) ? p.ids.filter(idValide).slice(0, 20) : [];
      return { actif: idValide(p.actif) ? p.actif : (ids[0] ?? PREMIER_PROFIL), ids };
    }
    // Avant les profils : une seule clé de données, qui devient le premier profil.
    return { actif: PREMIER_PROFIL, ids: localStorage.getItem(STORAGE_KEY) ? [PREMIER_PROFIL] : [] };
  } catch {
    return { actif: PREMIER_PROFIL, ids: [] };
  }
}

export function saveIndex(index: ProfilesIndex): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(index));
  } catch {
    /* stockage indisponible */
  }
}

/** Profils enregistrés sur cet appareil, avec leur nom (lu dans leurs données). */
export function listProfiles(): ProfilResume[] {
  const liste: ProfilResume[] = [];
  for (const id of loadIndex().ids) {
    const d = loadData(id);
    if (d.profile) liste.push({ id, nom: d.profile.name, type: d.profile.type });
  }
  return liste;
}

export function loadData(id: string = PREMIER_PROFIL): AppData {
  try {
    const raw = localStorage.getItem(dataKey(id));
    if (!raw) return emptyData();
    const result = validateData(JSON.parse(raw));
    return result.ok ? result.data : emptyData();
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData, id: string = PREMIER_PROFIL): boolean {
  try {
    localStorage.setItem(dataKey(id), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Point de départ : état de référence enregistré sur l'appareil               */
/* -------------------------------------------------------------------------- */

/** Clé du point de départ d'un profil (jamais envoyé ailleurs que dans ce navigateur). */
export const departKey = (id: string = PREMIER_PROFIL) => `soldeclair:depart:v1:${id}`;

/** Enregistre l'état actuel comme point de départ (« Réinitialiser aux données par défaut » y revient). */
export function saveDepart(data: AppData, today: ISODate, id: string = PREMIER_PROFIL): boolean {
  try {
    localStorage.setItem(departKey(id), JSON.stringify({ enregistreLe: today, donnees: data }));
    return true;
  } catch {
    return false;
  }
}

/** Lit le point de départ d'un profil, ou null s'il n'existe pas ou est illisible. */
export function loadDepart(id: string = PREMIER_PROFIL): { enregistreLe: ISODate | null; data: AppData } | null {
  try {
    const raw = localStorage.getItem(departKey(id));
    if (!raw) return null;
    const json = JSON.parse(raw) as { enregistreLe?: unknown };
    const result = validateData(json);
    if (!result.ok) return null;
    return { enregistreLe: isValidISODate(json.enregistreLe) ? json.enregistreLe : null, data: result.data };
  } catch {
    return null;
  }
}

export function clearDepart(id: string = PREMIER_PROFIL): void {
  try {
    localStorage.removeItem(departKey(id));
  } catch {
    /* rien à faire */
  }
}

export function clearData(id: string = PREMIER_PROFIL): void {
  try {
    localStorage.removeItem(dataKey(id));
  } catch {
    /* stockage indisponible : rien à effacer */
  }
}

/* -------------------------------------------------------------------------- */
/* Validation (import JSON)                                                    */
/* -------------------------------------------------------------------------- */

export type ValidationResult = { ok: true; data: AppData } | { ok: false; error: string };

const FREQUENCIES: Frequency[] = ['hebdomadaire', 'mensuel', 'trimestriel', 'semestriel', 'annuel'];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const COMPTES: AccountId[] = ['compte', 'carte-restaurant'];
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const isOptDate = (v: unknown) => v === null || v === undefined || isValidISODate(v);
const str = (v: unknown) => (isStr(v) ? v.slice(0, 500) : '');

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message);
}

function checkArray(value: unknown, label: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`La liste « ${label} » est invalide.`);
  return value;
}

function checkId(v: unknown, label: string, index: number): string {
  if (!isStr(v) || v.length === 0 || v.length > 100) fail(`${label} n° ${index + 1} : identifiant invalide.`);
  return v;
}

/** Vérifie et nettoie des données (sauvegarde importée ou contenu du navigateur). */
const SUPPORT_KINDS_LISTE: SupportKind[] = [
  'livret-a',
  'ldds',
  'livret-jeune',
  'lep',
  'pel',
  'cel',
  'assurance-vie',
  'pea',
  'epargne-salariale',
  'compte-courant',
  'autre',
];

function lireSituation(r: Record<string, unknown>): ProfileSituation {
  const texte = (v: unknown) => (typeof v === 'string' && v.trim() ? v.slice(0, 100) : undefined);
  const situation: ProfileSituation = {};
  if (texte(r.formation)) situation.formation = texte(r.formation);
  if (texte(r.employeur)) situation.employeur = texte(r.employeur);
  if (texte(r.territoire)) situation.territoire = texte(r.territoire);
  if (isValidISODate(r.debut)) situation.debut = r.debut;
  if (isValidISODate(r.fin)) situation.fin = r.fin;
  return situation;
}

function lireDetails(lignes: unknown[]): IncomeDetail[] {
  return lignes
    .filter(
      (l): l is Record<string, unknown> => isObj(l) && typeof l.label === 'string' && typeof l.amount === 'number' && Number.isSafeInteger(l.amount),
    )
    .slice(0, 30)
    .map((l) => ({ label: (l.label as string).slice(0, 80), amount: l.amount as number }));
}

export function validateData(input: unknown): ValidationResult {
  try {
    if (!isObj(input)) fail('Le fichier ne contient pas une sauvegarde SoldeClair.');
    const root = isObj(input.donnees) ? input.donnees : input; // accepte l'enveloppe d'export
    if (root.version !== 1) fail('Version de sauvegarde non reconnue.');

    let profile: Profile | null = null;
    if (root.profile !== null && root.profile !== undefined) {
      const p = root.profile;
      if (!isObj(p) || !isStr(p.name) || !isStr(p.currency)) fail('Le profil est invalide.');
      const types = ['etudiant', 'alternant', 'salarie', 'independant', 'autre'];
      profile = {
        name: p.name.slice(0, 60),
        type: (types.includes(p.type as string) ? p.type : 'autre') as Profile['type'],
        currency: /^[A-Z]{3}$/.test(p.currency) ? p.currency : 'EUR',
        monthlySavingsTarget: isAmount(p.monthlySavingsTarget) ? p.monthlySavingsTarget : 0,
        variableEstimate: isAmount(p.variableEstimate) ? p.variableEstimate : 0,
        createdAt: isValidISODate(p.createdAt) ? p.createdAt : '2026-01-01',
        ...(isValidISODate(p.birthDate) ? { birthDate: p.birthDate } : {}),
        ...(isObj(p.situation) ? { situation: lireSituation(p.situation) } : {}),
      };
    }

    const settingsIn = isObj(root.settings) ? root.settings : {};
    let theme: AppData['settings']['theme'] = ['system', 'light', 'dark'].includes(settingsIn.theme as string)
      ? (settingsIn.theme as AppData['settings']['theme'])
      : 'light';
    if (settingsIn.appearanceVersion !== APPEARANCE_VERSION && theme === 'dark') theme = 'light';

    const categories: Category[] = checkArray(root.categories, 'catégories').map((c, i) => {
      if (!isObj(c) || !isStr(c.name) || !['income', 'fixed', 'variable'].includes(c.kind as string)) fail(`Catégorie n° ${i + 1} invalide.`);
      return {
        id: checkId(c.id, 'Catégorie', i),
        name: c.name.slice(0, 60),
        kind: c.kind as Category['kind'],
        budget: c.kind === 'variable' && isAmount(c.budget) ? c.budget : null,
      };
    });

    const incomes: Income[] = checkArray(root.incomes, 'revenus').map((r, i) => {
      if (!isObj(r) || !isStr(r.name) || !isAmount(r.amount) || !isValidISODate(r.date) || !isOptDate(r.endDate))
        fail(`Revenu n° ${i + 1} invalide (nom, montant ou date).`);
      const recurring = r.recurring === true;
      return {
        id: checkId(r.id, 'Revenu', i),
        name: r.name.slice(0, 100),
        amount: r.amount,
        date: r.date,
        categoryId: str(r.categoryId),
        recurring,
        frequency: recurring ? (FREQUENCIES.includes(r.frequency as Frequency) ? (r.frequency as Frequency) : 'mensuel') : null,
        endDate: (r.endDate as ISODate | null | undefined) ?? null,
        note: str(r.note),
        ...(COMPTES.includes(r.account as AccountId) ? { account: r.account as AccountId } : {}),
        ...(r.certitude === 'attendu' ? { certitude: 'attendu' as const } : {}),
        ...(isAmount(r.amountMax) ? { amountMax: r.amountMax } : {}),
        ...(r.amountUnknown === true ? { amountUnknown: true } : {}),
        ...(r.inOptimistic === true ? { inOptimistic: true } : {}),
        ...(Array.isArray(r.details) ? { details: lireDetails(r.details) } : {}),
      };
    });

    const fixedCharges: FixedCharge[] = checkArray(root.fixedCharges, 'charges fixes').map((r, i) => {
      if (!isObj(r) || !isStr(r.name) || !isAmount(r.amount) || !isValidISODate(r.date) || !isOptDate(r.endDate))
        fail(`Charge fixe n° ${i + 1} invalide (nom, montant ou date).`);
      const status: FixedCharge['status'] = {};
      if (isObj(r.status)) {
        for (const [k, v] of Object.entries(r.status)) {
          if (isValidISODate(k) && (v === 'paye' || v === 'a_venir')) status[k] = v;
        }
      }
      return {
        id: checkId(r.id, 'Charge fixe', i),
        name: r.name.slice(0, 100),
        amount: r.amount,
        date: r.date,
        categoryId: str(r.categoryId),
        frequency: FREQUENCIES.includes(r.frequency as Frequency) ? (r.frequency as Frequency) : 'mensuel',
        endDate: (r.endDate as ISODate | null | undefined) ?? null,
        note: str(r.note),
        status,
      };
    });

    const expenses: Expense[] = checkArray(root.expenses, 'dépenses').map((r, i) => {
      if (!isObj(r) || !isAmount(r.amount) || !isValidISODate(r.date)) fail(`Dépense n° ${i + 1} invalide (montant ou date).`);
      return {
        id: checkId(r.id, 'Dépense', i),
        amount: r.amount,
        categoryId: str(r.categoryId),
        date: r.date,
        description: str(r.description),
        paymentMethod: str(r.paymentMethod),
        ...(r.exceptional === true ? { exceptional: true } : {}),
      };
    });

    const goals: SavingsGoal[] = checkArray(root.goals, 'objectifs').map((r, i) => {
      if (!isObj(r) || !isStr(r.name) || !isAmount(r.target) || !isOptDate(r.targetDate))
        fail(`Objectif n° ${i + 1} invalide (nom, montant cible ou date).`);
      return {
        id: checkId(r.id, 'Objectif', i),
        name: r.name.slice(0, 100),
        description: str(r.description),
        target: r.target,
        initialAmount: isAmount(r.initialAmount) ? r.initialAmount : 0,
        targetDate: (r.targetDate as ISODate | null | undefined) ?? null,
        priority: (['haute', 'moyenne', 'basse'].includes(r.priority as string) ? r.priority : 'moyenne') as SavingsGoal['priority'],
        monthlyContribution: isAmount(r.monthlyContribution) ? r.monthlyContribution : 0,
        createdAt: isValidISODate(r.createdAt) ? r.createdAt : '2026-01-01',
        ...(GOAL_THEMES.includes(r.theme as GoalTheme) ? { theme: r.theme as GoalTheme } : {}),
        ...(Array.isArray(r.supportIds) ? { supportIds: r.supportIds.filter((x): x is string => typeof x === 'string').slice(0, 30) } : {}),
      };
    });

    const savings: SavingsDeposit[] = checkArray(root.savings, 'versements d’épargne').map((r, i) => {
      if (!isObj(r) || !isAmount(r.amount) || !isValidISODate(r.date)) fail(`Versement d’épargne n° ${i + 1} invalide.`);
      return {
        id: checkId(r.id, 'Versement', i),
        goalId: isStr(r.goalId) ? r.goalId : null,
        amount: r.amount,
        date: r.date,
        note: str(r.note),
        ...(isStr(r.supportId) ? { supportId: r.supportId } : {}),
      };
    });

    // Supports d'épargne et sommes bloquées (absents des sauvegardes plus anciennes)
    const supports: SavingsSupport[] = (Array.isArray(root.supports) ? root.supports : []).map((r, i) => {
      if (!isObj(r) || !isStr(r.name) || !isAmount(r.balance) || !isValidISODate(r.balanceDate))
        fail(`Support d’épargne n° ${i + 1} invalide (nom, solde ou date).`);
      const taux = typeof r.rate === 'number' && Number.isFinite(r.rate) && r.rate >= 0 && r.rate <= 50 ? Math.round(r.rate * 1000) / 1000 : 0;
      return {
        id: checkId(r.id, 'Support', i),
        name: r.name.slice(0, 60),
        kind: (SUPPORT_KINDS_LISTE.includes(r.kind as SupportKind) ? r.kind : 'autre') as SupportKind,
        balance: r.balance,
        balanceDate: r.balanceDate,
        rate: taux,
        liquidity: r.liquidity === 'bloque' ? 'bloque' : 'immediate',
        blockedUntil: isValidISODate(r.blockedUntil) ? r.blockedUntil : null,
        withdrawalCloses: r.withdrawalCloses === true,
        ceiling: isAmount(r.ceiling) ? r.ceiling : null,
        target: isAmount(r.target) ? r.target : null,
        note: str(r.note),
      };
    });
    const holds: TemporaryHold[] = (Array.isArray(root.holds) ? root.holds : []).map((r, i) => {
      if (!isObj(r) || !isStr(r.label) || !isAmount(r.amount) || !isValidISODate(r.start) || !isOptDate(r.end))
        fail(`Somme bloquée n° ${i + 1} invalide.`);
      return {
        id: checkId(r.id, 'Somme bloquée', i),
        label: r.label.slice(0, 100),
        amount: r.amount,
        start: r.start,
        end: (r.end as ISODate | null | undefined) ?? null,
        account: COMPTES.includes(r.account as AccountId) ? (r.account as AccountId) : 'compte',
        returned: r.returned === true,
        note: str(r.note),
      };
    });

    // Ajustements de solde (absents des sauvegardes plus anciennes) : montant signé, borné.
    const adjustments: BalanceAdjustment[] = (Array.isArray(root.adjustments) ? root.adjustments : []).map((r, i) => {
      if (
        !isObj(r) ||
        typeof r.amount !== 'number' ||
        !Number.isSafeInteger(r.amount) ||
        Math.abs(r.amount) > 100_000_000_00 ||
        !isValidISODate(r.date) ||
        !COMPTES.includes(r.account as AccountId)
      )
        fail(`Ajustement de solde n° ${i + 1} invalide.`);
      return { id: checkId(r.id, 'Ajustement', i), account: r.account as AccountId, date: r.date, amount: r.amount, note: str(r.note) };
    });

    return {
      ok: true,
      data: {
        version: 1,
        profile,
        settings: {
          theme,
          appearanceVersion: APPEARANCE_VERSION,
          ...(isValidISODate(settingsIn.lastBackup) ? { lastBackup: settingsIn.lastBackup } : {}),
          ...(typeof settingsIn.hideAmounts === 'boolean' ? { hideAmounts: settingsIn.hideAmounts } : {}),
          ...(typeof settingsIn.carryOver === 'boolean' ? { carryOver: settingsIn.carryOver } : {}),
          ...(settingsIn.incomeShiftDay === null ||
          (Number.isInteger(settingsIn.incomeShiftDay) && (settingsIn.incomeShiftDay as number) >= 2 && (settingsIn.incomeShiftDay as number) <= 28)
            ? { incomeShiftDay: settingsIn.incomeShiftDay as number | null }
            : {}),
          ...(Number.isInteger(settingsIn.presetsVersion) ? { presetsVersion: settingsIn.presetsVersion as number } : {}),
          ...(Array.isArray(settingsIn.dismissedActions)
            ? { dismissedActions: settingsIn.dismissedActions.filter((x): x is string => typeof x === 'string' && x.length <= 120).slice(-50) }
            : {}),
        },
        categories,
        incomes,
        fixedCharges,
        expenses,
        goals,
        savings,
        adjustments,
        // Absents des sauvegardes plus anciennes : on ne les ajoute pas (une restauration retrouve l'état exact)
        ...(Array.isArray(root.supports) ? { supports } : {}),
        ...(Array.isArray(root.holds) ? { holds } : {}),
      },
    };
  } catch (e) {
    if (e instanceof ImportError) return { ok: false, error: e.message };
    return { ok: false, error: 'Le fichier est illisible ou endommagé.' };
  }
}

/** Lit le texte d'un fichier JSON importé. */
export function parseBackup(text: string): ValidationResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Ce fichier n’est pas un fichier JSON valide.' };
  }
  return validateData(json);
}

/* -------------------------------------------------------------------------- */
/* Exports                                                                     */
/* -------------------------------------------------------------------------- */

export function exportJSON(data: AppData, today: ISODate): string {
  return JSON.stringify({ application: 'SoldeClair', exporteLe: today, donnees: data }, null, 2);
}

const TYPE_LABELS = {
  revenu: 'Revenu',
  charge: 'Charge fixe',
  depense: 'Dépense variable',
  epargne: 'Épargne',
  ajustement: 'Ajustement du solde',
} as const;

function csvCell(value: string): string {
  // Neutralise les formules (protection contre l'injection dans les tableurs),
  // sauf pour les montants négatifs qui doivent rester des nombres.
  const isNumber = /^-?\d+(,\d+)?$/.test(value);
  const safe = !isNumber && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Export CSV des transactions (séparateur « ; », virgule décimale : compatible
 * avec les tableurs configurés en français). Les montants sortants sont négatifs.
 * Les éléments récurrents sont inclus jusqu'à la fin du mois en cours.
 */
export function exportCSV(data: AppData, today: ISODate): string {
  const from = earliestDate(data, today);
  const to = lastDay(monthOf(today));
  const rows = transactionsInRange(data, from, to, today);
  const header = ['Date', 'Type', 'Libellé', 'Catégorie', 'Montant', 'Statut', 'Moyen de paiement', 'Compte', 'Note'];
  const lines = rows.map((t) => {
    const signed = signedAmount(t);
    return [
      t.date,
      TYPE_LABELS[t.type],
      t.label,
      t.categoryName,
      centsToInput(signed),
      t.status === 'paye' ? 'Payé' : t.status === 'a_venir' ? 'À venir' : '',
      t.paymentMethod,
      t.account === 'carte-restaurant' ? 'Carte restaurant' : 'Compte bancaire',
      t.note,
    ]
      .map(csvCell)
      .join(';');
  });
  return '﻿' + [header.join(';'), ...lines].join('\r\n') + '\r\n';
}

/** Déclenche le téléchargement d'un fichier généré localement (aucun envoi réseau). */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
