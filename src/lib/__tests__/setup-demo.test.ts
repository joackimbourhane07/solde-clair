import { describe, expect, it } from 'vitest';
import { buildInitialData } from '../setup';
import { buildDemoData, DEMO_PROFILES } from '../demo';
import { validateData } from '../storage';
import { categoryBudgets, monthSummary, monthReport } from '../budget';
import { addMonths } from '../dates';
import { sum } from '../money';
import { goalProgress } from '../goals';
import { presetCategories, PROFILE_PRESETS } from '../categories';

describe('catégories selon le profil', () => {
  it('étudiant : bourse, APL, aide familiale, frais scolaires…', () => {
    const names = presetCategories('etudiant').map((c) => c.name);
    expect(names).toEqual(expect.arrayContaining(['Bourse', 'Aide familiale', 'APL / aide au logement', 'Loyer', 'Alimentation', 'Transport', 'Téléphone', 'Frais scolaires', 'Loisirs']));
  });
  it('alternant et salarié', () => {
    expect(presetCategories('alternant').map((c) => c.name)).toEqual(expect.arrayContaining(['Salaire', 'Aides', 'Prime', 'Carburant', 'Abonnements']));
    expect(presetCategories('salarie').map((c) => c.name)).toEqual(expect.arrayContaining(['Salaire', 'Primes', 'Loyer ou crédit', 'Assurances', 'Énergie', 'Enfants']));
  });
});

describe('configuration initiale', () => {
  const data = buildInitialData(
    {
      name: '  Alex ',
      type: 'etudiant',
      currency: 'EUR',
      mainIncome: { name: 'Bourse', amount: 45000, day: 5, category: 'Bourse' },
      extraIncomes: [{ name: 'Parents', amount: 15000, day: 1, category: 'Aide familiale' }, { name: 'Vide', amount: 0, day: 1, category: 'Bourse' }],
      charges: [
        { name: 'Loyer', amount: 40000, day: 31, category: 'Loyer' },
        { name: 'Téléphone', amount: 0, day: 10, category: 'Téléphone' },
      ],
      variableEstimate: 30001,
      splitEstimate: true,
      monthlySavingsTarget: 5000,
      longTermGoal: { name: 'Ordinateur', target: 80000, initial: 10000, targetDate: '2027-06-01' },
      categories: { income: PROFILE_PRESETS.etudiant.income, fixed: PROFILE_PRESETS.etudiant.fixed, variable: PROFILE_PRESETS.etudiant.variable },
      theme: 'system',
    },
    '2026-11-12',
  );

  it('crée le profil, les revenus et charges récurrents (lignes vides ignorées)', () => {
    expect(data.profile).toMatchObject({ name: 'Alex', type: 'etudiant', monthlySavingsTarget: 5000 });
    expect(data.incomes).toHaveLength(2);
    expect(data.incomes[0]).toMatchObject({ amount: 45000, date: '2026-11-05', recurring: true, frequency: 'mensuel' });
    expect(data.fixedCharges).toHaveLength(1);
    expect(data.fixedCharges[0].date).toBe('2026-11-30'); // jour 31 ramené au 30 novembre
  });

  it('répartit l’estimation en limites sans perdre un centime', () => {
    const budgets = data.categories.filter((c) => c.kind === 'variable').map((c) => c.budget ?? 0);
    expect(sum(budgets)).toBe(30001);
  });

  it('crée l’objectif à long terme', () => {
    expect(data.goals).toHaveLength(1);
    expect(data.goals[0]).toMatchObject({ name: 'Ordinateur', target: 80000, initialAmount: 10000, monthlyContribution: 5000 });
  });

  it('le budget est immédiatement calculable', () => {
    const s = monthSummary(data, '2026-11', '2026-11-12');
    expect(s.income).toBe(60000);
    expect(s.fixed).toBe(40000);
    expect(s.available).toBe(20000);
  });
});

describe('données de démonstration', () => {
  const today = '2026-11-12';
  for (const { id } of DEMO_PROFILES) {
    describe(id, () => {
      const data = buildDemoData(id, today);

      it('est valide (réimportable)', () => {
        const r = validateData(JSON.parse(JSON.stringify(data)));
        expect(r.ok).toBe(true);
      });

      it('contient revenus, charges, dépenses, limites et objectifs', () => {
        expect(data.incomes.length).toBeGreaterThanOrEqual(2);
        expect(data.fixedCharges.length).toBeGreaterThanOrEqual(3);
        expect(data.expenses.length).toBeGreaterThan(20);
        expect(data.categories.filter((c) => c.budget).length).toBeGreaterThanOrEqual(5);
        expect(data.goals.length).toBeGreaterThanOrEqual(1);
        expect(data.profile?.name).toContain('(démo)');
      });

      it('aucune dépense dans le futur, toutes les catégories existent', () => {
        expect(data.expenses.every((e) => e.date <= today)).toBe(true);
        const ids = new Set(data.categories.map((c) => c.id));
        expect([...data.incomes, ...data.fixedCharges, ...data.expenses].every((x) => ids.has(x.categoryId))).toBe(true);
      });

      it('plusieurs mois d’historique comparables', () => {
        for (let k = 1; k <= 3; k += 1) {
          const s = monthSummary(data, addMonths('2026-11', -k), today);
          expect(s.income).toBeGreaterThan(0);
          expect(s.variable).toBeGreaterThan(0);
          expect(s.saved).toBeGreaterThan(0);
        }
        expect(monthReport(data, '2026-10', today).previous.income).toBeGreaterThan(0);
        expect(categoryBudgets(data, '2026-10').some((l) => l.spent > 0)).toBe(true);
        expect(goalProgress(data.goals[0], data.savings, today).current).toBeGreaterThan(data.goals[0].initialAmount);
      });

      it('est identique à chaque chargement (déterministe)', () => {
        expect(buildDemoData(id, today)).toEqual(data);
      });
    });
  }
});
