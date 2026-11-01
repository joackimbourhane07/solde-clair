import { describe, expect, it } from 'vitest';
import { occurrencesInMonth } from '../recurrence';

describe('échéances récurrentes', () => {
  it('mensuel : même jour chaque mois, pas avant le début', () => {
    expect(occurrencesInMonth('2026-09-05', 'mensuel', '2026-11')).toEqual(['2026-11-05']);
    expect(occurrencesInMonth('2026-09-05', 'mensuel', '2026-08')).toEqual([]);
  });

  it('jour 31 ramené au dernier jour du mois', () => {
    expect(occurrencesInMonth('2026-01-31', 'mensuel', '2026-02')).toEqual(['2026-02-28']);
    expect(occurrencesInMonth('2026-01-31', 'mensuel', '2026-04')).toEqual(['2026-04-30']);
  });

  it('trimestriel, semestriel et annuel', () => {
    expect(occurrencesInMonth('2026-08-10', 'trimestriel', '2026-11')).toEqual(['2026-11-10']);
    expect(occurrencesInMonth('2026-08-10', 'trimestriel', '2026-10')).toEqual([]);
    expect(occurrencesInMonth('2026-03-15', 'semestriel', '2026-09')).toEqual(['2026-09-15']);
    expect(occurrencesInMonth('2026-03-15', 'annuel', '2027-03')).toEqual(['2027-03-15']);
    expect(occurrencesInMonth('2026-03-15', 'annuel', '2026-11')).toEqual([]);
  });

  it('hebdomadaire : 4 ou 5 échéances selon le mois', () => {
    expect(occurrencesInMonth('2026-11-02', 'hebdomadaire', '2026-11')).toEqual([
      '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30',
    ]);
    expect(occurrencesInMonth('2026-10-28', 'hebdomadaire', '2026-11')).toEqual([
      '2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25',
    ]);
  });

  it('date de fin respectée', () => {
    expect(occurrencesInMonth('2026-01-05', 'mensuel', '2026-11', '2026-10-31')).toEqual([]);
    expect(occurrencesInMonth('2026-01-05', 'mensuel', '2026-10', '2026-10-31')).toEqual(['2026-10-05']);
    expect(occurrencesInMonth('2026-11-02', 'hebdomadaire', '2026-11', '2026-11-10')).toEqual(['2026-11-02', '2026-11-09']);
  });
});
