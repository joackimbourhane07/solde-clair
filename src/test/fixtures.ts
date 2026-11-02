import type { AppData } from '../types';

/**
 * Jeu de données fictif utilisé par les tests.
 * « Aujourd'hui » = 12 novembre 2026 (mois de 30 jours → 19 jours restants, aujourd'hui inclus).
 */
export const TODAY = '2026-11-12';

export function fixture(): AppData {
  return {
    version: 1,
    profile: {
      name: 'Test',
      type: 'salarie',
      currency: 'EUR',
      monthlySavingsTarget: 15000, // 150,00 €
      variableEstimate: 40000,
      createdAt: '2026-09-01',
    },
    settings: { theme: 'system', appearanceVersion: 2 },
    categories: [
      { id: 'c-sal', name: 'Salaire', kind: 'income', budget: null },
      { id: 'c-autre-rev', name: 'Autre revenu', kind: 'income', budget: null },
      { id: 'c-loyer', name: 'Loyer', kind: 'fixed', budget: null },
      { id: 'c-tel', name: 'Téléphone', kind: 'fixed', budget: null },
      { id: 'c-eau', name: 'Eau', kind: 'fixed', budget: null },
      { id: 'c-assu', name: 'Assurance', kind: 'fixed', budget: null },
      { id: 'c-alim', name: 'Alimentation', kind: 'variable', budget: 5000 }, // 50,00 €
      { id: 'c-loisirs', name: 'Loisirs', kind: 'variable', budget: 8000 }, // 80,00 €
      { id: 'c-sante', name: 'Santé', kind: 'variable', budget: null },
    ],
    incomes: [
      { id: 'i-sal', name: 'Salaire', amount: 150000, date: '2026-09-01', categoryId: 'c-sal', recurring: true, frequency: 'mensuel', endDate: null, note: '' },
      { id: 'i-bonus', name: 'Vente vélo', amount: 20050, date: '2026-11-10', categoryId: 'c-autre-rev', recurring: false, frequency: null, endDate: null, note: '' },
      { id: 'i-oct', name: 'Remboursement', amount: 30000, date: '2026-10-15', categoryId: 'c-autre-rev', recurring: false, frequency: null, endDate: null, note: '' },
    ],
    fixedCharges: [
      { id: 'f-loyer', name: 'Loyer', amount: 60000, date: '2026-09-05', categoryId: 'c-loyer', frequency: 'mensuel', endDate: null, note: '', status: {} },
      { id: 'f-tel', name: 'Forfait', amount: 1599, date: '2026-09-20', categoryId: 'c-tel', frequency: 'mensuel', endDate: null, note: '', status: {} },
      { id: 'f-eau', name: 'Eau', amount: 4500, date: '2026-08-10', categoryId: 'c-eau', frequency: 'trimestriel', endDate: null, note: '', status: {} },
      { id: 'f-assu', name: 'Assurance', amount: 12000, date: '2026-03-15', categoryId: 'c-assu', frequency: 'annuel', endDate: null, note: '', status: {} },
    ],
    expenses: [
      { id: 'e1', amount: 4530, categoryId: 'c-alim', date: '2026-11-02', description: 'Courses', paymentMethod: 'Carte bancaire' },
      { id: 'e2', amount: 1270, categoryId: 'c-alim', date: '2026-11-08', description: 'Marché', paymentMethod: '' },
      { id: 'e3', amount: 6000, categoryId: 'c-loisirs', date: '2026-11-11', description: 'Concert', paymentMethod: '' },
      { id: 'e-oct', amount: 10000, categoryId: 'c-alim', date: '2026-10-20', description: 'Courses', paymentMethod: '' },
    ],
    goals: [
      { id: 'g1', name: 'Voyage', description: '', target: 100000, initialAmount: 20000, targetDate: '2027-05-12', priority: 'haute', monthlyContribution: 10000, createdAt: '2026-09-01' },
    ],
    savings: [
      { id: 's1', goalId: 'g1', amount: 10000, date: '2026-11-07', note: '' },
      { id: 's-oct', goalId: 'g1', amount: 5000, date: '2026-10-07', note: '' },
    ],
  };
}
