import { describe, expect, it } from 'vitest';
import { balanceForecast } from '../forecast';
import { allLimitsRespected, suggestedActions } from '../actions';
import { formatMoney } from '../money';
import { fixture, TODAY } from '../../test/fixtures';
import type { AppData } from '../../types';

const fmt = (c: number) => formatMoney(c).replace(/ /g, ' ');

describe('estimation du disponible à 7, 15 et 30 jours', () => {
  // Au 12 novembre : 1 700,50 € reçus − 645,00 € de charges − 118,00 € de dépenses − 100,00 € d'épargne = 837,50 €
  // Rythme : 118,00 € sur 12 jours = 9,83 € par jour
  it('part du disponible du jour, ajoute les revenus prévus, retire les charges et le rythme des dépenses', () => {
    const f = balanceForecast(fixture(), TODAY);
    expect(f.start).toBe(83750);
    expect(f.basis).toBe('rythme');
    expect(f.dailyVariable).toBe(983);
    expect(f.points).toEqual([
      // 19 novembre : rien de prévu
      { days: 7, date: '2026-11-19', balance: 83750 - 983 * 7 },
      // 27 novembre : forfait du 20
      { days: 15, date: '2026-11-27', balance: 83750 - 1599 - 983 * 15 },
      // 12 décembre : forfait, salaire du 1er, loyer du 5
      { days: 30, date: '2026-12-12', balance: 83750 - 1599 + 150000 - 60000 - 983 * 30 },
    ]);
  });

  it('repère le point le plus bas avant le prochain revenu', () => {
    const f = balanceForecast(fixture(), TODAY);
    expect(f.lowest).toEqual({ days: 18, date: '2026-11-30', balance: 83750 - 1599 - 983 * 18 });
  });

  it('liste les revenus et charges prévus dans l’ordre des dates', () => {
    const f = balanceForecast(fixture(), TODAY);
    expect(f.events.map((e) => [e.date, e.label, e.amount])).toEqual([
      ['2026-11-20', 'Forfait', -1599],
      ['2026-12-01', 'Salaire', 150000],
      ['2026-12-05', 'Loyer', -60000],
    ]);
  });

  it('en début de mois, le rythme vient des limites prévues', () => {
    const f = balanceForecast(fixture(), '2026-11-03');
    expect(f.basis).toBe('plan');
    // Limites Alimentation (50 €) + Loisirs (80 €) = 130 € sur 30 jours
    expect(f.dailyVariable).toBe(433);
  });
});

describe('actions utiles du tableau de bord', () => {
  it('propose les actions par priorité : limite dépassée, épargne, sauvegarde', () => {
    const a = suggestedActions(fixture(), TODAY, fmt);
    expect(a.map((x) => x.id)).toEqual(['limite:c-alim:2026-11', 'epargne:2026-11', 'sauvegarde:2026-11']);
    expect(a[0].title).toBe('Votre budget « Alimentation » est dépassé de 8,00 €.');
    expect(a[0].detail).toBe('Vous pouvez consulter les dépenses concernées ou ajuster cette limite pour le mois.');
    expect(a[1].title).toBe('Il vous manque 50,00 € pour respecter votre objectif d’épargne du mois.');
  });

  it('une action ignorée disparaît ; une sauvegarde récente supprime le rappel', () => {
    const d: AppData = { ...fixture(), settings: { ...fixture().settings, dismissedActions: ['limite:c-alim:2026-11'], lastBackup: '2026-11-01' } };
    expect(suggestedActions(d, TODAY, fmt).map((x) => x.id)).toEqual(['epargne:2026-11']);
  });

  it('signale un prélèvement prévu demain et une dépense inhabituelle', () => {
    const d = fixture();
    d.fixedCharges = d.fixedCharges.map((c) => (c.id === 'f-tel' ? { ...c, date: '2026-09-13' } : c));
    d.expenses = [
      ...d.expenses,
      { id: 'x1', amount: 2000, categoryId: 'c-loisirs', date: '2026-09-20', description: 'Cinéma', paymentMethod: '' },
      { id: 'x2', amount: 1500, categoryId: 'c-loisirs', date: '2026-10-05', description: 'Bowling', paymentMethod: '' },
      { id: 'x3', amount: 1800, categoryId: 'c-loisirs', date: '2026-10-25', description: 'Musée', paymentMethod: '' },
      { id: 'x4', amount: 2200, categoryId: 'c-loisirs', date: '2026-11-01', description: 'Théâtre', paymentMethod: '' },
      { id: 'x5', amount: 9000, categoryId: 'c-loisirs', date: '2026-11-10', description: 'Festival', paymentMethod: '' },
    ];
    const a = suggestedActions(d, TODAY, fmt);
    const charge = a.find((x) => x.id.startsWith('charge:'));
    expect(charge?.title).toBe('Prélèvement « Forfait » demain : 15,99 €.');
    const inhab = a.find((x) => x.id.startsWith('inhabituelle:'));
    expect(inhab?.id).toBe('inhabituelle:x5');
    expect(inhab?.title).toBe('Dépense inhabituelle : « Festival » de 90,00 €.');
  });

  it('message positif quand toutes les limites sont respectées', () => {
    expect(allLimitsRespected(fixture(), TODAY)).toBe(false);
    const d = fixture();
    d.categories = d.categories.map((c) => (c.id === 'c-alim' ? { ...c, budget: 20000 } : c));
    expect(allLimitsRespected(d, TODAY)).toBe(true);
  });
});
