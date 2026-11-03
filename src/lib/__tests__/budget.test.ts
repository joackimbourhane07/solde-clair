import { describe, expect, it } from 'vitest';
import {
  carryOverInto,
  budgetLevel,
  frequentCategories,
  categoryBudgets,
  dailyBalanceSeries,
  monthAlerts,
  monthReport,
  monthSummary,
  monthTransactions,
  transactionsInRange,
  upcomingCharges,
  upcomingSummary,
} from '../budget';
import { fixture, TODAY } from '../../test/fixtures';

const fmt = (c: number) => `${(c / 100).toFixed(2)} €`;

describe('synthèse du mois en cours (novembre 2026)', () => {
  const s = monthSummary(fixture(), '2026-11', TODAY);

  it('total des revenus : récurrents + exceptionnels du mois', () => {
    // 1 500,00 (salaire) + 200,50 (vente) — le remboursement d’octobre est exclu
    expect(s.income).toBe(170050);
  });

  it('total des charges fixes : mensuelles + trimestrielle du mois', () => {
    // 600,00 + 15,99 + 45,00 (eau trimestrielle) ; l’assurance annuelle (mars) est exclue
    expect(s.fixed).toBe(66099);
    expect(s.fixedPaid).toBe(64500); // loyer (5) + eau (10) : dates passées
    expect(s.fixedUpcoming).toBe(1599); // forfait le 20
  });

  it('total des dépenses variables du mois uniquement', () => {
    expect(s.variable).toBe(11800); // 45,30 + 12,70 + 60,00
    expect(s.totalExpenses).toBe(66099 + 11800);
  });

  it('montant épargné et objectif du mois', () => {
    expect(s.saved).toBe(10000);
    expect(s.savingsTarget).toBe(15000);
    expect(s.savingsRemaining).toBe(5000);
  });

  it('solde disponible = revenus − charges − dépenses − épargne', () => {
    expect(s.available).toBe(170050 - 66099 - 11800 - 10000);
    expect(s.available).toBe(82151);
  });

  it('reste à vivre quotidien = solde ÷ jours restants (aujourd’hui inclus)', () => {
    expect(s.daysRemaining).toBe(19);
    expect(s.dailyRemaining).toBe(4323); // 821,51 € / 19 = 43,237 → 43,23 € (jamais surestimé)
    expect(s.dailyAfterSavings).toBe(Math.trunc((82151 - 5000) / 19));
  });

  it('pourcentage du budget consommé', () => {
    expect(s.budgetUsedPct).toBe(46); // 778,99 / 1 700,50
  });

  it('prévision de fin de mois au rythme actuel', () => {
    expect(s.forecastBasis).toBe('rythme');
    // 118 € en 12 jours → +177 € sur les 18 jours suivants
    expect(s.projectedVariable).toBe(29500);
    expect(s.forecastEndBalance).toBe(170050 - 66099 - 10000 - 29500);
  });

  it('reste à vivre négatif quand les dépenses dépassent', () => {
    const d = fixture();
    d.expenses.push({ id: 'big', amount: 100000, categoryId: 'c-sante', date: '2026-11-12', description: '', paymentMethod: '' });
    const s2 = monthSummary(d, '2026-11', TODAY);
    expect(s2.available).toBe(82151 - 100000);
    expect(s2.dailyRemaining).toBe(Math.trunc(-17849 / 19));
    expect(monthAlerts(d, '2026-11', TODAY, fmt)[0].level).toBe('danger');
  });

  it('dernier jour du mois : tout le solde est disponible pour la journée', () => {
    const last = monthSummary(fixture(), '2026-11', '2026-11-30');
    expect(last.daysRemaining).toBe(1);
    expect(last.dailyRemaining).toBe(last.available);
  });
});

describe('changements de mois', () => {
  it('mois précédent : terminé, pas de reste à vivre quotidien', () => {
    const oct = monthSummary(fixture(), '2026-10', TODAY);
    expect(oct.period).toBe('passe');
    expect(oct.income).toBe(180000); // salaire + remboursement
    expect(oct.fixed).toBe(61599); // loyer + forfait (pas d’eau en octobre)
    expect(oct.variable).toBe(10000);
    expect(oct.saved).toBe(5000);
    expect(oct.available).toBe(180000 - 61599 - 10000 - 5000);
    expect(oct.daysRemaining).toBe(0);
    expect(oct.dailyRemaining).toBeNull();
  });

  it('mois suivant : prévisionnel, tous les jours restent', () => {
    const dec = monthSummary(fixture(), '2026-12', TODAY);
    expect(dec.period).toBe('futur');
    expect(dec.income).toBe(150000);
    expect(dec.fixed).toBe(61599);
    expect(dec.daysRemaining).toBe(31);
    expect(dec.forecastBasis).toBe('plan');
    expect(dec.projectedVariable).toBe(13000); // somme des limites 50 + 80
  });

  it('passage d’année (décembre → janvier)', () => {
    const jan = monthSummary(fixture(), '2027-01', TODAY);
    expect(jan.income).toBe(150000);
    expect(jan.daysInMonth).toBe(31);
  });

  it('comparaison avec le mois précédent', () => {
    const r = monthReport(fixture(), '2026-11', TODAY);
    expect(r.previous.month).toBe('2026-10');
    expect(r.delta.income).toBe(170050 - 180000);
    expect(r.delta.variable).toBe(1800);
    expect(r.delta.fixed).toBe(4500);
    expect(r.topCategories[0]).toEqual({ name: 'Loyer', amount: 60000, kind: 'charge' });
    expect(r.overBudget.map((l) => l.category.name)).toEqual(['Alimentation']);
  });
});

describe('budgets par catégorie', () => {
  it('seuils 75 %, 90 % et dépassement', () => {
    expect(budgetLevel(7499, 10000)).toBe('ok');
    expect(budgetLevel(7500, 10000)).toBe('attention');
    expect(budgetLevel(8999, 10000)).toBe('attention');
    expect(budgetLevel(9000, 10000)).toBe('alerte');
    expect(budgetLevel(10000, 10000)).toBe('alerte'); // budget atteint, pas dépassé
    expect(budgetLevel(10001, 10000)).toBe('depasse');
    expect(budgetLevel(5000, null)).toBe('sans');
    expect(budgetLevel(0, 0)).toBe('sans');
  });

  it('prévu, dépensé, restant et pourcentage par catégorie', () => {
    const lines = categoryBudgets(fixture(), '2026-11');
    const alim = lines.find((l) => l.category.id === 'c-alim')!;
    expect(alim).toMatchObject({ budget: 5000, spent: 5800, remaining: -800, pct: 116, level: 'depasse' });
    const loisirs = lines.find((l) => l.category.id === 'c-loisirs')!;
    expect(loisirs).toMatchObject({ budget: 8000, spent: 6000, remaining: 2000, pct: 75, level: 'attention' });
    const sante = lines.find((l) => l.category.id === 'c-sante')!;
    expect(sante).toMatchObject({ budget: null, spent: 0, remaining: null, level: 'sans' });
  });

  it('alertes formulées avec une piste d’action (montant restant, objectif par jour)', () => {
    const d = fixture();
    d.expenses.push({ id: 'gros', amount: 30000, categoryId: 'c-sante', date: '2026-11-12', description: '', paymentMethod: '' });
    const alerts = monthAlerts(d, '2026-11', TODAY, fmt);
    const prevision = alerts.find((a) => a.message.includes('même rythme'));
    expect(prevision?.message).toMatch(/il pourrait manquer environ .* Pour finir le mois à l’équilibre, vise environ .* par jour\./);
    expect(alerts.find((a) => a.message.includes('Loisirs'))?.message).toMatch(/il reste 20\.00 €/);
  });

  it('alertes générées pour les budgets', () => {
    const alerts = monthAlerts(fixture(), '2026-11', TODAY, fmt);
    expect(alerts.some((a) => a.level === 'danger' && a.message.includes('Alimentation'))).toBe(true);
    expect(alerts.some((a) => a.level === 'info' && a.message.includes('Loisirs') && /75\s%/.test(a.message))).toBe(true);
  });
});

describe('catégories fréquentes', () => {
  it('classées par nombre de dépenses sur 90 jours, puis complétées', () => {
    const d = fixture();
    // Une dépense ancienne (plus de 90 jours) ne compte pas
    d.expenses.push({ id: 'vieux', amount: 100, categoryId: 'c-sante', date: '2026-07-01', description: '', paymentMethod: '' });
    expect(frequentCategories(d, TODAY, 4).map((c) => c.name)).toEqual(['Alimentation', 'Loisirs', 'Santé']);
    d.expenses.push(
      { id: 'l1', amount: 100, categoryId: 'c-loisirs', date: '2026-11-03', description: '', paymentMethod: '' },
      { id: 'l2', amount: 100, categoryId: 'c-loisirs', date: '2026-11-04', description: '', paymentMethod: '' },
      { id: 'l3', amount: 100, categoryId: 'c-loisirs', date: '2026-11-05', description: '', paymentMethod: '' },
    );
    expect(frequentCategories(d, TODAY, 2).map((c) => c.name)).toEqual(['Loisirs', 'Alimentation']);
  });

  it('nouvel utilisateur : premières catégories de la liste', () => {
    const d = fixture();
    d.expenses = [];
    expect(frequentCategories(d, TODAY, 4).map((c) => c.name)).toEqual(['Alimentation', 'Loisirs', 'Santé']);
  });
});

describe('transactions', () => {
  it('liste unifiée et triée du mois', () => {
    const tx = monthTransactions(fixture(), '2026-11', TODAY);
    expect(tx.map((t) => t.type)).toContain('epargne');
    expect(tx.length).toBe(2 + 3 + 3 + 1);
    expect([...tx].sort((a, b) => a.date.localeCompare(b.date)).map((t) => t.key)).toEqual(tx.map((t) => t.key));
  });

  it('statut manuel d’une charge prioritaire sur la date', () => {
    const d = fixture();
    d.fixedCharges[0].status['2026-11-05'] = 'a_venir';
    const s = monthSummary(d, '2026-11', TODAY);
    expect(s.fixedPaid).toBe(4500);
    expect(upcomingCharges(d, TODAY).map((t) => t.label)).toContain('Loyer');
  });

  it('plage de dates sur plusieurs mois', () => {
    const tx = transactionsInRange(fixture(), '2026-10-15', '2026-11-05', TODAY);
    expect(tx[0].date >= '2026-10-15').toBe(true);
    expect(tx[tx.length - 1].date <= '2026-11-05').toBe(true);
    expect(tx.some((t) => t.label === 'Remboursement')).toBe(true);
  });

  it('prochaines charges sur 30 jours', () => {
    const up = upcomingCharges(fixture(), TODAY);
    expect(up.map((t) => `${t.label} ${t.date}`)).toEqual(['Forfait 2026-11-20', 'Loyer 2026-12-05']);
  });

  it('évolution du solde jour après jour jusqu’à aujourd’hui', () => {
    const series = dailyBalanceSeries(fixture(), '2026-11', TODAY);
    expect(series).toHaveLength(12);
    expect(series[0]).toEqual({ date: '2026-11-01', balance: 150000 });
    // au 12 : tout sauf le forfait du 20
    expect(series[11].balance).toBe(82151 + 1599);
  });
});

describe('charges des prochains jours', () => {
  it('résumé sur 7 jours, aujourd’hui inclus', () => {
    // Le 12 novembre : forfait le 20 (dans 8 jours), loyer déjà passé le 5
    expect(upcomingSummary(fixture(), TODAY, 7)).toEqual({ count: 0, total: 0 });
    expect(upcomingSummary(fixture(), TODAY, 9)).toEqual({ count: 1, total: 1599 });
    // Le 15 novembre, le forfait du 20 entre dans la semaine
    expect(upcomingSummary(fixture(), '2026-11-15', 7)).toEqual({ count: 1, total: 1599 });
    // Vu du 30 novembre : le loyer du 5 décembre (le forfait du 20 est passé)
    expect(upcomingSummary(fixture(), '2026-11-30', 7)).toEqual({ count: 1, total: 60000 });
  });
});

describe('report du reste d’un mois sur le suivant (cumul)', () => {
  const avecReport = () => ({ ...fixture(), settings: { ...fixture().settings, carryOver: true } });
  // mars : − 120,00 (assurance) ; août : − 45,00 (eau) ; septembre : + 884,01 ; octobre : + 1 034,01
  const REPORT_NOVEMBRE = -12000 - 4500 + 88401 + 103401;

  it('le reste des mois précédents s’ajoute au disponible du mois', () => {
    expect(carryOverInto(avecReport(), '2026-11', TODAY)).toBe(REPORT_NOVEMBRE);
    const s = monthSummary(avecReport(), '2026-11', TODAY);
    expect(s.carryOver).toBe(REPORT_NOVEMBRE);
    expect(s.available).toBe(REPORT_NOVEMBRE + 82151);
    // Le mois suivant reçoit à son tour le reste de novembre
    expect(carryOverInto(avecReport(), '2026-12', TODAY)).toBe(REPORT_NOVEMBRE + 82151);
  });

  it('une prime reçue fin octobre et non dépensée compte encore en novembre', () => {
    const d = avecReport();
    d.incomes = [
      ...d.incomes,
      {
        id: 'prime',
        name: 'Prime',
        amount: 100000,
        date: '2026-10-26',
        categoryId: 'c-autre-rev',
        recurring: false,
        frequency: null,
        endDate: null,
        note: '',
      },
    ];
    const avant = monthSummary(avecReport(), '2026-11', TODAY).available;
    // Règle du 20 (par défaut) : la prime du 26 octobre est un revenu de novembre
    expect(carryOverInto(d, '2026-11', TODAY)).toBe(REPORT_NOVEMBRE);
    expect(monthSummary(d, '2026-11', TODAY).income).toBe(170050 + 100000);
    expect(monthSummary(d, '2026-11', TODAY).available).toBe(avant + 100000);
    // Sans la règle : elle reste en octobre et arrive par le report (nouvel objet : les calculs sont mis en cache)
    const sans = { ...d, settings: { ...d.settings, incomeShiftDay: null } };
    expect(carryOverInto(sans, '2026-11', TODAY)).toBe(REPORT_NOVEMBRE + 100000);
    expect(monthSummary(sans, '2026-11', TODAY).available).toBe(avant + 100000);
  });

  it('un dépassement est reporté aussi', () => {
    const d = avecReport();
    d.expenses = [
      ...d.expenses,
      { id: 'gros', amount: 300000, categoryId: 'c-loisirs', date: '2026-10-28', description: 'Voyage', paymentMethod: '' },
    ];
    expect(carryOverInto(d, '2026-11', TODAY)).toBe(REPORT_NOVEMBRE - 300000);
  });

  it('désactivé : chaque mois est calculé à part', () => {
    expect(carryOverInto(fixture(), '2026-11', TODAY)).toBe(0);
    expect(monthSummary(fixture(), '2026-11', TODAY).available).toBe(82151);
  });
});
