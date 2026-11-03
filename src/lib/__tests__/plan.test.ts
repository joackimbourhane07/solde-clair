import { describe, expect, it } from 'vitest';
import { monthSummary } from '../budget';
import { accountBalance } from '../accounts';
import { age, objectifPrincipal, projection, sommesBloquees, totauxEpargne } from '../plan';
import { parseBackup, validateData } from '../storage';
import exempleFictif from '../../../docs/exemple-sauvegarde-fictive.json?raw';
import { fixture } from '../../test/fixtures';
import type { AppData } from '../../types';

/** Personne fictive : alternant(e), 3 000 € d'épargne sur trois supports, objectif 7 000 € fin juillet 2027. */
const AUJOURDHUI = '2026-11-03';
function alex(): AppData {
  const d = fixture();
  d.profile = { ...d.profile!, name: 'Alex', type: 'alternant', variableEstimate: 15000, monthlySavingsTarget: 40000, birthDate: '2007-04-10' };
  d.categories.push({ id: 'c-cr', name: 'Carte restaurant', kind: 'income', budget: null });
  d.incomes = [
    {
      id: 'sal',
      name: 'Salaire d’apprenti',
      amount: 70000,
      date: '2026-11-05',
      categoryId: 'c-sal',
      recurring: true,
      frequency: 'mensuel',
      endDate: '2027-07-31',
      note: '',
    },
    {
      id: 'cdej',
      name: 'Chèques déjeuner',
      amount: 22000,
      date: '2026-11-05',
      categoryId: 'c-cr',
      recurring: true,
      frequency: 'mensuel',
      endDate: null,
      note: '',
    },
    {
      id: 'treize',
      name: '13e mois',
      amount: 60000,
      date: '2026-12-10',
      categoryId: 'c-sal',
      recurring: false,
      frequency: null,
      endDate: null,
      note: '',
      certitude: 'attendu',
      inOptimistic: true,
    },
    {
      id: 'ppv',
      name: 'Solde de prime',
      amount: 0,
      date: '2027-01-10',
      categoryId: 'c-autre-rev',
      recurring: false,
      frequency: null,
      endDate: null,
      note: '',
      certitude: 'attendu',
      amountUnknown: true,
    },
  ];
  d.fixedCharges = [
    {
      id: 'aide',
      name: 'Aide à la maison',
      amount: 15000,
      date: '2026-11-01',
      categoryId: 'c-loyer',
      frequency: 'mensuel',
      endDate: null,
      note: '',
      status: {},
    },
  ];
  d.expenses = [
    {
      id: 'heb',
      amount: 30000,
      categoryId: 'c-loisirs',
      date: '2026-12-31',
      description: 'Hébergement du voyage',
      paymentMethod: 'Prélèvement',
      exceptional: true,
    },
    {
      id: 'sur-place',
      amount: 32000,
      categoryId: 'c-loisirs',
      date: '2027-01-05',
      description: 'Budget sur place',
      paymentMethod: '',
      exceptional: true,
    },
  ];
  d.savings = [];
  d.supports = [
    {
      id: 'pel',
      name: 'PEL',
      kind: 'pel',
      balance: 200000,
      balanceDate: AUJOURDHUI,
      rate: 1.575,
      liquidity: 'bloque',
      blockedUntil: '2028-08-30',
      withdrawalCloses: true,
      ceiling: null,
      target: 410000,
      note: '',
    },
    {
      id: 'la',
      name: 'Livret A',
      kind: 'livret-a',
      balance: 30000,
      balanceDate: AUJOURDHUI,
      rate: 1.7,
      liquidity: 'immediate',
      blockedUntil: null,
      withdrawalCloses: false,
      ceiling: 2295000,
      target: 130000,
      note: '',
    },
    {
      id: 'cc',
      name: 'Compte courant',
      kind: 'compte-courant',
      balance: 70000,
      balanceDate: AUJOURDHUI,
      rate: 0,
      liquidity: 'immediate',
      blockedUntil: null,
      withdrawalCloses: false,
      ceiling: null,
      target: null,
      note: '',
    },
  ];
  d.holds = [
    { id: 'depot', label: 'Dépôt de garantie', amount: 15000, start: '2027-01-04', end: '2027-01-14', account: 'compte', returned: false, note: '' },
  ];
  d.goals = [
    {
      id: 'obj',
      name: 'Fin de contrat',
      description: '',
      target: 700000,
      initialAmount: 0,
      targetDate: '2027-07-31',
      priority: 'haute',
      monthlyContribution: 40000,
      createdAt: '2026-11-01',
      supportIds: ['pel', 'la', 'cc'],
    },
  ];
  return d;
}

describe('supports d’épargne : épargne totale et épargne disponible', () => {
  it('deux chiffres distincts : le PEL bloqué n’est pas disponible', () => {
    expect(totauxEpargne(alex(), AUJOURDHUI)).toEqual({ totale: 300000, disponible: 100000, bloquee: 200000 });
  });

  it('un versement lié à un support augmente son solde', () => {
    const d = alex();
    d.savings.push({ id: 'v', goalId: null, amount: 40000, date: '2026-11-10', note: '', supportId: 'la' });
    expect(totauxEpargne(d, '2026-11-10')).toEqual({ totale: 340000, disponible: 140000, bloquee: 200000 });
    // Avant le versement, rien ne change
    expect(totauxEpargne(d, '2026-11-09').totale).toBe(300000);
  });

  it('l’objectif « tous supports confondus » suit le total des supports', () => {
    const d = alex();
    expect(objectifPrincipal(d, AUJOURDHUI)?.id).toBe('obj');
    expect(projection(d, d.goals[0], AUJOURDHUI).progression.current).toBe(300000);
  });
});

describe('revenus attendus et avantages en nature', () => {
  it('un revenu attendu n’est compté nulle part tant qu’il n’est pas confirmé', () => {
    const d = alex();
    const decembre = monthSummary(d, '2026-12', AUJOURDHUI).income;
    expect(decembre).toBe(70000 + 22000);
    d.incomes = d.incomes.map((i) => (i.id === 'treize' ? { ...i, certitude: 'sur' as const } : i));
    expect(monthSummary(d, '2026-12', AUJOURDHUI).income).toBe(70000 + 22000 + 60000);
  });

  it('une somme bloquée n’est pas une dépense : le solde ne change pas', () => {
    const d = alex();
    const sans = { ...d, holds: [] };
    expect(accountBalance(d, 'compte', '2027-01-06', '2027-01-06')).toBe(accountBalance(sans, 'compte', '2027-01-06', '2027-01-06'));
    expect(sommesBloquees(d, '2027-01-06').map((h) => h.label)).toEqual(['Dépôt de garantie']);
    expect(sommesBloquees(d, '2027-01-20')).toEqual([]);
  });
});

describe('projection mois par mois jusqu’à l’objectif', () => {
  const p = projection(alex(), alex().goals[0], AUJOURDHUI);

  it('de novembre 2026 à juillet 2027 : 9 mois', () => {
    expect(p.lignes.map((l) => l.mois)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06', '2027-07']);
    expect(p.moisRestants).toBe(9);
  });

  it('base : salaire − aide à la maison − dépenses courantes − dépenses exceptionnelles (voyage)', () => {
    // Novembre : à partir de demain ; l'aide du 1er novembre est déjà passée (comprise dans les soldes du jour)
    expect(p.lignes.map((l) => l.epargne)).toEqual([55000, 10000, 8000, 40000, 40000, 40000, 40000, 40000, 40000]);
    expect(p.lignes[1]).toMatchObject({ revenus: 70000, charges: 15000, courantes: 15000, exceptionnelles: 30000 });
  });

  it('les chèques déjeuner sont à part (pouvoir d’achat alimentaire), pas dans les revenus encaissés', () => {
    expect(p.lignes[0]).toMatchObject({ revenus: 70000, avantages: 22000 });
  });

  it('la somme bloquée de janvier est signalée, sans être comptée comme dépense', () => {
    expect(p.lignes[2].bloque).toBe(15000);
    expect(p.lignes[2].notes).toContain('Dépôt de garantie : somme bloquée, rendue ensuite');
  });

  it('cumul, épargne nécessaire et statut avec l’écart chiffré', () => {
    expect(p.finale).toBe(300000 + 313000);
    expect(p.necessaireParMois).toBe(44445); // 4 000 € ÷ 9 mois, arrondi au centime supérieur
    expect(p.dansLesTemps).toBe(false);
    expect(p.ecart).toBe(613000 - 700000);
  });

  it('optimiste : + revenus attendus cochés (13e mois), le montant inconnu compte pour 0', () => {
    expect(p.lignes[1].attendus).toBe(60000);
    expect(p.lignes[2].attendus).toBe(0);
    expect(p.finaleOptimiste).toBe(p.finale + 60000);
    expect(p.lignes[2].notes).toContain('Solde de prime : revenu attendu, montant inconnu, non inclus');
    expect(p.lignes[1].notes).toContain('13e mois : revenu attendu');
  });
});

describe('profil et sauvegarde', () => {
  it('âge calculé à partir de la date de naissance', () => {
    expect(age('2006-05-20', '2026-11-03')).toBe(20);
    expect(age('2006-05-20', '2027-05-20')).toBe(21);
    expect(age(null, '2026-11-03')).toBeNull();
  });

  it('tous les nouveaux champs survivent à une sauvegarde puis à un import', () => {
    const d = alex();
    d.profile!.situation = { formation: 'BTS', employeur: 'Entreprise fictive', debut: '2025-09-01', fin: '2027-07-31', territoire: 'Département fictif (000)' };
    d.incomes[0].details = [
      { label: 'Salaire de base', amount: 75000 },
      { label: 'Retenue titres-restaurant', amount: -8800 },
    ];
    const r = validateData(JSON.parse(JSON.stringify(d)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.profile).toMatchObject({ birthDate: '2007-04-10', situation: d.profile!.situation });
    expect(r.data.supports).toEqual(d.supports);
    expect(r.data.holds).toEqual(d.holds);
    expect(r.data.goals[0].supportIds).toEqual(['pel', 'la', 'cc']);
    expect(r.data.incomes.find((i) => i.id === 'treize')).toMatchObject({ certitude: 'attendu', inOptimistic: true });
    expect(r.data.incomes.find((i) => i.id === 'ppv')).toMatchObject({ certitude: 'attendu', amountUnknown: true });
    expect(r.data.incomes[0].details).toEqual(d.incomes[0].details);
    expect(r.data.expenses[0].exceptional).toBe(true);
  });

  it('un support invalide est refusé avec un message clair', () => {
    const d = JSON.parse(JSON.stringify(alex()));
    d.supports[0].balance = 'beaucoup';
    const r = validateData(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('Support d’épargne n° 1');
  });
});

describe('fichier d’exemple de la documentation (données fictives)', () => {
  it('docs/exemple-sauvegarde-fictive.json s’importe sans erreur et garde tous les champs', () => {
    const r = parseBackup(exempleFictif);
    expect(r.ok ? 'ok' : r.error).toBe('ok');
    if (!r.ok) return;
    expect(r.data.supports).toHaveLength(3);
    expect(r.data.holds).toHaveLength(1);
    expect(r.data.incomes.filter((i) => i.certitude === 'attendu')).toHaveLength(3);
    expect(r.data.incomes[0].details).toHaveLength(4);
    const p = projection(r.data, r.data.goals[0], '2026-11-03');
    expect(p.progression.current).toBe(290000);
    expect(totauxEpargne(r.data, '2026-11-03')).toEqual({ totale: 290000, disponible: 90000, bloquee: 200000 });
  });
});

describe('projection : vraies dates jusqu’à la date visée', () => {
  it('un revenu du 28 compte le mois où il arrive ; un revenu du 31 juillet compte pour un objectif au 31 juillet', () => {
    const d = alex();
    d.incomes = [
      {
        id: 'sal',
        name: 'Salaire',
        amount: 70000,
        date: '2026-10-28',
        categoryId: 'c-sal',
        recurring: true,
        frequency: 'mensuel',
        endDate: '2027-07-31',
        note: '',
      },
      {
        id: 'stc',
        name: 'Solde de tout compte',
        amount: 40000,
        amountMax: 80000,
        date: '2027-07-31',
        categoryId: 'c-sal',
        recurring: false,
        frequency: null,
        endDate: null,
        note: '',
        certitude: 'attendu',
        inOptimistic: true,
      },
    ];
    const p = projection(d, d.goals[0], AUJOURDHUI);
    // Neuf salaires à venir (novembre à juillet), celui d'octobre est déjà dans les soldes du jour
    expect(p.lignes.map((l) => l.revenus)).toEqual(Array(9).fill(70000));
    expect(p.lignes[8].attendus).toBe(40000);
    expect(p.finaleOptimiste - p.finale).toBe(40000);
  });

  it('mois en cours : seulement le reste du budget des dépenses courantes', () => {
    const d = alex();
    d.expenses.push({ id: 'deja', amount: 10000, categoryId: 'c-alim', date: '2026-11-02', description: 'Courses', paymentMethod: '' });
    expect(projection(d, d.goals[0], AUJOURDHUI).lignes[0].courantes).toBe(5000);
  });
});
