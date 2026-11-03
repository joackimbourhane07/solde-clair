import { describe, expect, it } from 'vitest';
import { jourBascule, monthSummary, monthTransactions, moisDuRevenu, transactionsInRange } from '../budget';
import { accountBalance } from '../accounts';
import { balanceForecast } from '../forecast';
import { validateData } from '../storage';
import { reducer } from '../../state/AppState';
import { fixture, TODAY } from '../../test/fixtures';
import type { AppData } from '../../types';

/** Jeu fictif : salaire versé le 28 de chaque mois depuis septembre, prime le 26 octobre. */
function finDeMois(): AppData {
  const d = fixture();
  d.incomes = [
    { id: 'sal28', name: 'Salaire', amount: 150000, date: '2026-09-28', categoryId: 'c-sal', recurring: true, frequency: 'mensuel', endDate: null, note: '' },
    { id: 'prime', name: 'Prime', amount: 100000, date: '2026-10-26', categoryId: 'c-autre-rev', recurring: false, frequency: null, endDate: null, note: '' },
    { id: 'vente', name: 'Vente', amount: 5000, date: '2026-11-19', categoryId: 'c-autre-rev', recurring: false, frequency: null, endDate: null, note: '' },
  ];
  return d;
}

const revenus = (d: AppData, mois: string) =>
  monthTransactions(d, mois, TODAY)
    .filter((t) => t.type === 'revenu')
    .map((t) => `${t.label} ${t.date}`);

describe('revenus de fin de mois : comptés pour le mois suivant (règle du 20)', () => {
  it('jour de bascule : 20 par défaut, réglable, désactivable', () => {
    const d = fixture();
    delete d.settings.incomeShiftDay;
    expect(jourBascule(d)).toBe(20);
    d.settings.incomeShiftDay = 25;
    expect(jourBascule(d)).toBe(25);
    d.settings.incomeShiftDay = null;
    expect(jourBascule(d)).toBeNull();
    d.settings.incomeShiftDay = 31;
    expect(jourBascule(d)).toBe(20);
  });

  it('mois de rattachement d’un revenu', () => {
    expect(moisDuRevenu('2026-10-19', 20)).toBe('2026-10');
    expect(moisDuRevenu('2026-10-20', 20)).toBe('2026-11');
    expect(moisDuRevenu('2026-12-28', 20)).toBe('2027-01');
    expect(moisDuRevenu('2026-10-26', null)).toBe('2026-10');
  });

  it('la prime du 26 octobre et le salaire du 28 octobre comptent en novembre', () => {
    const d = finDeMois();
    expect(revenus(d, '2026-11')).toEqual(['Salaire 2026-10-28', 'Prime 2026-10-26', 'Vente 2026-11-19'].sort((a, b) => a.slice(-10).localeCompare(b.slice(-10))));
    expect(revenus(d, '2026-10')).toEqual(['Salaire 2026-09-28']);
    expect(revenus(d, '2026-12')).toEqual(['Salaire 2026-11-28']);
    expect(monthSummary(d, '2026-11', TODAY).income).toBe(150000 + 100000 + 5000);
  });

  it('désactivée : chaque revenu compte dans le mois de sa date', () => {
    const d = finDeMois();
    d.settings.incomeShiftDay = null;
    expect(revenus(d, '2026-11')).toEqual(['Vente 2026-11-19', 'Salaire 2026-11-28']);
    expect(revenus(d, '2026-10')).toEqual(['Prime 2026-10-26', 'Salaire 2026-10-28']);
  });

  it('le relevé du compte, l’historique par dates et l’export gardent la vraie date', () => {
    const d = finDeMois();
    expect(transactionsInRange(d, '2026-10-01', '2026-10-31', TODAY).filter((t) => t.type === 'revenu').map((t) => t.label)).toEqual(['Prime', 'Salaire']);
    expect(transactionsInRange(d, '2026-11-01', '2026-11-30', TODAY).filter((t) => t.type === 'revenu').map((t) => t.label)).toEqual(['Vente', 'Salaire']);
    // Le solde du compte ne dépend pas de la règle
    const sans = finDeMois();
    sans.settings.incomeShiftDay = null;
    expect(accountBalance(d, 'compte', TODAY, TODAY)).toBe(accountBalance(sans, 'compte', TODAY, TODAY));
  });

  it('aucun revenu perdu ni compté deux fois : seul le mois de rattachement change', () => {
    const d = finDeMois();
    const mois = ['2026-09', '2026-10', '2026-11', '2026-12', '2027-01'];
    const parMois = mois.flatMap((m) => revenus(d, m)).sort();
    const parDate = transactionsInRange(d, '2026-09-01', '2026-12-31', TODAY)
      .filter((t) => t.type === 'revenu')
      .map((t) => `${t.label} ${t.date}`)
      .sort();
    expect(parMois).toEqual(parDate);
  });

  it('estimation : un salaire déjà reçu mais compté le mois prochain est bien sur le compte', () => {
    // Avec le report, l'argent disponible le 29 novembre est le même, que la règle soit active ou non.
    const d = finDeMois();
    d.settings.carryOver = true;
    const sans = finDeMois();
    sans.settings.carryOver = true;
    sans.settings.incomeShiftDay = null;
    expect(balanceForecast(d, '2026-11-29').start).toBe(balanceForecast(sans, '2026-11-29').start);
  });

  it('réglage enregistré et relu depuis une sauvegarde', () => {
    let d = reducer(fixture(), { type: 'setIncomeShiftDay', value: 25 });
    expect(d.settings.incomeShiftDay).toBe(25);
    d = reducer(d, { type: 'setIncomeShiftDay', value: null });
    expect(d.settings.incomeShiftDay).toBeNull();
    for (const [valeur, attendu] of [
      [null, null],
      [22, 22],
      [40, undefined],
      ['20', undefined],
    ] as const) {
      const brut = JSON.parse(JSON.stringify(fixture()));
      brut.settings.incomeShiftDay = valeur;
      const r = validateData(brut);
      expect(r.ok && r.data.settings.incomeShiftDay, String(valeur)).toBe(attendu);
    }
  });
});
