import type {
  AppData,
  Category,
  Expense,
  FixedCharge,
  Frequency,
  Income,
  ISODate,
  Profile,
  SavingsDeposit,
  SavingsGoal,
} from '../types';
import { earliestDate, transactionsInRange } from './budget';
import { isValidISODate, lastDay, monthOf } from './dates';
import { centsToInput } from './money';

/**
 * Stockage 100 % local : les données restent dans le navigateur (localStorage).
 * Rien n'est envoyé à un serveur.
 */
export const STORAGE_KEY = 'soldeclair:donnees:v1';

export function emptyData(): AppData {
  return {
    version: 1,
    profile: null,
    settings: { theme: 'system' },
    categories: [],
    incomes: [],
    fixedCharges: [],
    expenses: [],
    goals: [],
    savings: [],
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const result = validateData(JSON.parse(raw));
    return result.ok ? result.data : emptyData();
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
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
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const isOptDate = (v: unknown) => v === null || v === undefined || isValidISODate(v);
const str = (v: unknown) => (isStr(v) ? v.slice(0, 500) : '');

class ImportError extends Error {}

function fail(message: string): never {
  throw new ImportError(message);
}

function checkArray(value: unknown, label: string): unknown[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(`La liste « ${label} » est invalide.`);
  return value;
}

function checkId(v: unknown, label: string, index: number): string {
  if (!isStr(v) || v.length === 0 || v.length > 100) fail(`${label} n° ${index + 1} : identifiant invalide.`);
  return v;
}

/** Vérifie et nettoie des données (sauvegarde importée ou contenu du navigateur). */
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
      };
    }

    const settingsIn = isObj(root.settings) ? root.settings : {};
    const theme = ['system', 'light', 'dark'].includes(settingsIn.theme as string)
      ? (settingsIn.theme as AppData['settings']['theme'])
      : 'system';

    const categories: Category[] = checkArray(root.categories, 'catégories').map((c, i) => {
      if (!isObj(c) || !isStr(c.name) || !['income', 'fixed', 'variable'].includes(c.kind as string))
        fail(`Catégorie n° ${i + 1} invalide.`);
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
      };
    });

    return {
      ok: true,
      data: { version: 1, profile, settings: { theme }, categories, incomes, fixedCharges, expenses, goals, savings },
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

const TYPE_LABELS = { revenu: 'Revenu', charge: 'Charge fixe', depense: 'Dépense variable', epargne: 'Épargne' } as const;

function csvCell(value: string): string {
  // Neutralise les formules (protection contre l'injection dans les tableurs),
  // sauf pour les montants négatifs qui doivent rester des nombres.
  const isNumber = /^-?\d+(,\d+)?$/.test(value);
  const safe = !isNumber && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * Export CSV des transactions (séparateur « ; », virgule décimale : compatible
 * avec les tableurs configurés en français). Les montants sortants sont négatifs.
 * Les éléments récurrents sont inclus jusqu'à la fin du mois en cours.
 */
export function exportCSV(data: AppData, today: ISODate): string {
  const from = earliestDate(data, today);
  const to = lastDay(monthOf(today));
  const rows = transactionsInRange(data, from, to, today);
  const header = ['Date', 'Type', 'Libellé', 'Catégorie', 'Montant', 'Statut', 'Moyen de paiement', 'Note'];
  const lines = rows.map((t) => {
    const signed = t.type === 'revenu' ? t.amount : -t.amount;
    return [
      t.date,
      TYPE_LABELS[t.type],
      t.label,
      t.categoryName,
      centsToInput(signed),
      t.status === 'paye' ? 'Payé' : t.status === 'a_venir' ? 'À venir' : '',
      t.paymentMethod,
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
