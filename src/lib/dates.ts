import type { ISODate, MonthKey } from '../types';

/** Fonctions de dates sans fuseau horaire : tout est manipulé en AAAA-MM-JJ. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(year: number, month: number, day: number): ISODate {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function parseISO(date: ISODate): { year: number; month: number; day: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseISO(value);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(toMonthKey(year, month));
}

export function isValidMonthKey(value: unknown): value is MonthKey {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false;
  const m = Number(value.slice(5, 7));
  return m >= 1 && m <= 12;
}

export function toMonthKey(year: number, month: number): MonthKey {
  return `${year}-${pad(month)}`;
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7);
}

export function parseMonth(month: MonthKey): { year: number; month: number } {
  const [y, m] = month.split('-').map(Number);
  return { year: y, month: m };
}

export function daysInMonth(month: MonthKey): number {
  const { year, month: m } = parseMonth(month);
  // Le jour 0 du mois suivant est le dernier jour du mois demandé.
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const { year, month: m } = parseMonth(month);
  const index = year * 12 + (m - 1) + delta;
  return toMonthKey(Math.floor(index / 12), (index % 12) + 1);
}

/** Nombre de mois calendaires entre deux mois (b - a). */
export function monthDiff(a: MonthKey, b: MonthKey): number {
  const pa = parseMonth(a);
  const pb = parseMonth(b);
  return (pb.year - pa.year) * 12 + (pb.month - pa.month);
}

export function firstDay(month: MonthKey): ISODate {
  return `${month}-01`;
}

export function lastDay(month: MonthKey): ISODate {
  return `${month}-${pad(daysInMonth(month))}`;
}

/** Ajoute des jours à une date (calcul en UTC pour éviter les changements d'heure). */
export function addDays(date: ISODate, days: number): ISODate {
  const { year, month, day } = parseISO(date);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return toISO(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** Différence en jours entre deux dates (b - a). */
export function dayDiff(a: ISODate, b: ISODate): number {
  const pa = parseISO(a);
  const pb = parseISO(b);
  const ta = Date.UTC(pa.year, pa.month - 1, pa.day);
  const tb = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((tb - ta) / 86_400_000);
}

/** Ajoute des mois à une date en gardant le jour (borné à la fin du mois). */
export function addMonthsToDate(date: ISODate, delta: number): ISODate {
  const { day } = parseISO(date);
  const month = addMonths(monthOf(date), delta);
  return `${month}-${pad(Math.min(day, daysInMonth(month)))}`;
}

/**
 * Nombre de jours restants dans le mois affiché, AUJOURD'HUI INCLUS.
 * - mois passé : 0
 * - mois en cours : jours restants y compris aujourd'hui
 * - mois futur : tous les jours du mois
 */
export function daysRemainingInMonth(month: MonthKey, today: ISODate): number {
  const current = monthOf(today);
  if (month < current) return 0;
  if (month > current) return daysInMonth(month);
  return daysInMonth(month) - parseISO(today).day + 1;
}

/** Jours écoulés dans le mois (aujourd'hui inclus). */
export function daysElapsedInMonth(month: MonthKey, today: ISODate): number {
  return daysInMonth(month) - daysRemainingInMonth(month, today);
}

const MONTH_SHORT = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const MONTH_NAMES = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export function monthLabel(month: MonthKey, withYear = true): string {
  const { year, month: m } = parseMonth(month);
  const name = MONTH_NAMES[m - 1];
  return withYear ? `${name} ${year}` : name;
}

/**
 * Mois précédé de la préposition, avec élision devant une voyelle :
 * « de novembre 2026 », mais « d’octobre 2026 », « d’avril », « d’août ».
 */
export function ofMonth(month: MonthKey, withYear = true): string {
  const label = monthLabel(month, withYear);
  return /^[aeiouéèêâîôû]/i.test(label) ? `d’${label}` : `de ${label}`;
}

export function monthLabelShort(month: MonthKey): string {
  const { year, month: m } = parseMonth(month);
  return `${MONTH_SHORT[m - 1]} ${String(year).slice(2)}`;
}

/** « 5 nov. 2026 » ou « 5 novembre 2026 ». */
export function formatDate(date: ISODate, long = false): string {
  const { year, month, day } = parseISO(date);
  if (long) return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
  return `${day} ${MONTH_SHORT[month - 1]} ${year}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Date proposée par défaut dans les formulaires selon le mois affiché. */
export function defaultDateFor(month: MonthKey, today: ISODate): ISODate {
  return monthOf(today) === month ? today : firstDay(month);
}
