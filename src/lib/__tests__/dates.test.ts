import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  addMonthsToDate,
  daysInMonth,
  daysRemainingInMonth,
  formatDate,
  isValidISODate,
  monthDiff,
  monthLabel,
  ofMonth,
  relativeDay,
} from '../dates';

describe('dates', () => {
  it('nombre de jours par mois (années bissextiles comprises)', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-11')).toBe(30);
    expect(daysInMonth('2026-12')).toBe(31);
  });

  it('changement de mois et d’année', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-03', -15)).toBe('2024-12');
    expect(monthDiff('2026-11', '2027-05')).toBe(6);
  });

  it('ajout de mois à une date (fin de mois bornée)', () => {
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDate('2026-11-12', 7)).toBe('2027-06-12');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('jours restants dans le mois, aujourd’hui inclus', () => {
    expect(daysRemainingInMonth('2026-11', '2026-11-12')).toBe(19);
    expect(daysRemainingInMonth('2026-11', '2026-11-01')).toBe(30);
    expect(daysRemainingInMonth('2026-11', '2026-11-30')).toBe(1);
    expect(daysRemainingInMonth('2026-10', '2026-11-12')).toBe(0); // mois passé
    expect(daysRemainingInMonth('2026-12', '2026-11-12')).toBe(31); // mois futur
  });

  it('élision devant les mois commençant par une voyelle (« d’octobre », pas « de octobre »)', () => {
    expect(ofMonth('2026-11')).toBe('de novembre 2026');
    expect(ofMonth('2026-10')).toBe('d’octobre 2026');
    expect(ofMonth('2027-04')).toBe('d’avril 2027');
    expect(ofMonth('2027-08')).toBe('d’août 2027');
    expect(ofMonth('2027-01', false)).toBe('de janvier');
  });

  it('validation et affichage en français', () => {
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(formatDate('2026-11-05')).toBe('5 nov. 2026');
    expect(formatDate('2026-07-14', true)).toBe('14 juillet 2026');
    expect(monthLabel('2026-08')).toBe('août 2026');
  });
});

describe('dates relatives des échéances', () => {
  it('aujourd’hui, demain, dans N jours, puis la date', () => {
    expect(relativeDay('2026-11-12', '2026-11-12')).toBe('Aujourd’hui');
    expect(relativeDay('2026-11-13', '2026-11-12')).toBe('Demain');
    expect(relativeDay('2026-11-15', '2026-11-12')).toBe('Dans 3 jours');
    expect(relativeDay('2026-11-18', '2026-11-12')).toBe('Dans 6 jours');
    expect(relativeDay('2026-11-19', '2026-11-12')).toBe('Le 19 nov. 2026');
    expect(relativeDay('2026-12-01', '2026-11-30')).toBe('Demain');
  });
});

