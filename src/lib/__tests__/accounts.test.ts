import { describe, expect, it } from 'vitest';
import { accountBalance, operationsAVenir, releve, totaux, usesCarteRestaurant } from '../accounts';
import { isCarteRestaurant, monthSummary, monthTransactions } from '../budget';
import { exportCSV, validateData } from '../storage';
import { reducer } from '../../state/AppState';
import { PRESETS_VERSION } from '../storage';
import { fixture, TODAY } from '../../test/fixtures';
import type { AppData } from '../../types';

/** Jeu fictif avec une carte restaurant : 180 € versés le 1er du mois, un déjeuner de 9,80 € le 11. */
function avecCarte(): AppData {
  const d = fixture();
  d.categories.push({ id: 'c-cr', name: 'Carte restaurant', kind: 'income', budget: null });
  d.incomes.push({
    id: 'i-cr',
    name: 'Titres-restaurant',
    amount: 18000,
    date: '2026-11-01',
    categoryId: 'c-cr',
    recurring: true,
    frequency: 'mensuel',
    endDate: null,
    note: '',
  });
  d.expenses.push({ id: 'e-cr', amount: 980, categoryId: 'c-alim', date: '2026-11-11', description: 'Déjeuner', paymentMethod: 'Carte restaurant' });
  return d;
}

describe('carte restaurant : reconnaissance', () => {
  it('reconnaît les noms courants des titres-restaurant', () => {
    for (const nom of ['Carte restaurant', 'Cartes restaurants', 'Titres-restaurant', 'ticket resto', 'Swile', 'Edenred', 'Pluxee', 'Up Déjeuner', 'Bimpli', 'carte déjeuner', 'Carte Dejeuner', 'Chèque déjeuner', 'titres-déjeuner'])
      expect(isCarteRestaurant(nom), nom).toBe(true);
  });

  it('ne confond pas avec un restaurant ou la carte bancaire', () => {
    for (const nom of ['Restaurant', 'Restaurants', 'Carte bancaire', 'Espèces', 'Salaire', 'Déjeuner', 'Petit-déjeuner', ''])
      expect(isCarteRestaurant(nom), nom).toBe(false);
  });

  it('un revenu « Carte restaurant » va sur la carte, sauf choix contraire', () => {
    const d = avecCarte();
    const tx = monthTransactions(d, '2026-11', TODAY);
    expect(tx.find((t) => t.sourceId === 'i-cr')?.account).toBe('carte-restaurant');
    expect(tx.find((t) => t.sourceId === 'i-sal')?.account).toBe('compte');
    // La personne a choisi « Versé sur : compte bancaire »
    d.incomes = d.incomes.map((i) => (i.id === 'i-cr' ? { ...i, account: 'compte' as const } : i));
    expect(monthTransactions(d, '2026-11', TODAY).find((t) => t.sourceId === 'i-cr')?.account).toBe('compte');
  });

  it('une dépense payée par carte restaurant est débitée de la carte', () => {
    const tx = monthTransactions(avecCarte(), '2026-11', TODAY);
    expect(tx.find((t) => t.sourceId === 'e-cr')?.account).toBe('carte-restaurant');
    expect(tx.find((t) => t.sourceId === 'e1')?.account).toBe('compte');
  });

  it('détecte si la carte restaurant est utilisée (la catégorie seule ne suffit pas)', () => {
    expect(usesCarteRestaurant(fixture())).toBe(false);
    const categorieSeule = fixture();
    categorieSeule.categories.push({ id: 'c-cr', name: 'Carte restaurant', kind: 'income', budget: null });
    expect(usesCarteRestaurant(categorieSeule)).toBe(false);
    expect(usesCarteRestaurant(avecCarte())).toBe(true);
    // Une dépense payée par carte restaurant suffit
    categorieSeule.expenses[0].paymentMethod = 'Carte restaurant';
    expect(usesCarteRestaurant(categorieSeule)).toBe(true);
  });

  it('le cumul des revenus compte toutes les sources, carte comprise', () => {
    const s = monthSummary(avecCarte(), '2026-11', TODAY);
    expect(s.income).toBe(170050 + 18000);
  });
});

describe('soldes des comptes', () => {
  it('compte bancaire : tous les mouvements passés depuis la première saisie', () => {
    // + 3 salaires, remboursement, vente ; − assurance, 2 × eau, 3 loyers, 2 forfaits, dépenses, épargne
    const attendu = 450000 + 30000 + 20050 - 12000 - 9000 - 180000 - 3198 - 21800 - 15000;
    expect(accountBalance(fixture(), 'compte', TODAY, TODAY)).toBe(attendu);
    expect(accountBalance(avecCarte(), 'compte', TODAY, TODAY)).toBe(attendu);
  });

  it('carte restaurant : 180 € versés − 9,80 € dépensés', () => {
    const d = avecCarte();
    expect(accountBalance(d, 'carte-restaurant', TODAY, TODAY)).toBe(17020);
    expect(accountBalance(d, 'carte-restaurant', '2026-10-31', TODAY)).toBe(0);
  });

  it('le solde total est la somme des deux comptes', () => {
    const d = avecCarte();
    expect(accountBalance(d, 'tout', TODAY, TODAY)).toBe(accountBalance(d, 'compte', TODAY, TODAY) + accountBalance(d, 'carte-restaurant', TODAY, TODAY));
  });

  it('une charge marquée « à venir » n’est pas encore débitée', () => {
    const d = fixture();
    const avant = accountBalance(d, 'compte', TODAY, TODAY);
    d.fixedCharges = d.fixedCharges.map((c) => (c.id === 'f-loyer' ? { ...c, status: { '2026-11-05': 'a_venir' as const } } : c));
    expect(accountBalance(d, 'compte', TODAY, TODAY)).toBe(avant + 60000);
    // … et elle apparaît en tête des opérations à venir
    expect(operationsAVenir(d, 'compte', TODAY)[0]).toMatchObject({ sourceId: 'f-loyer', date: '2026-11-05' });
  });

  it('un ajustement corrige le solde du compte choisi et le disponible du mois', () => {
    const d = avecCarte();
    const avant = accountBalance(d, 'compte', TODAY, TODAY);
    const dispo = monthSummary(d, '2026-11', TODAY).available;
    d.adjustments = [{ id: 'a1', account: 'compte', date: TODAY, amount: -2550, note: '' }];
    expect(accountBalance(d, 'compte', TODAY, TODAY)).toBe(avant - 2550);
    expect(accountBalance(d, 'carte-restaurant', TODAY, TODAY)).toBe(17020);
    const s = monthSummary(d, '2026-11', TODAY);
    expect(s.adjustments).toBe(-2550);
    expect(s.available).toBe(dispo - 2550);
  });
});

describe('relevé façon application bancaire', () => {
  it('jours du plus récent au plus ancien, avec le solde en fin de journée', () => {
    const jours = releve(avecCarte(), 'carte-restaurant', '2026-11-01', TODAY, TODAY);
    expect(jours.map((j) => j.date)).toEqual(['2026-11-11', '2026-11-01']);
    expect(jours.map((j) => j.solde)).toEqual([17020, 18000]);
  });

  it('le solde du jour le plus récent est le solde actuel', () => {
    const d = avecCarte();
    const jours = releve(d, 'tout', '2026-11-01', TODAY, TODAY);
    expect(jours[0].solde).toBe(accountBalance(d, 'tout', TODAY, TODAY));
    // Le 11 : concert (compte) et déjeuner (carte) le même jour
    expect(jours.find((j) => j.date === '2026-11-11')?.operations.map((t) => t.sourceId).sort()).toEqual(['e-cr', 'e3']);
    // Chaque jour = solde de la veille + mouvements du jour
    for (let i = 0; i < jours.length - 1; i++) {
      const mouvements = totaux(jours[i].operations);
      expect(jours[i].solde).toBe(jours[i + 1].solde + mouvements.entrees - mouvements.sorties);
    }
  });

  it('opérations à venir sur 30 jours, par compte', () => {
    const d = avecCarte();
    expect(operationsAVenir(d, 'compte', TODAY).map((t) => `${t.date} ${t.label}`)).toEqual(['2026-11-20 Forfait', '2026-12-01 Salaire', '2026-12-05 Loyer']);
    expect(operationsAVenir(d, 'carte-restaurant', TODAY).map((t) => `${t.date} ${t.label}`)).toEqual(['2026-12-01 Titres-restaurant']);
  });

  it('entrées et sorties', () => {
    const jours = releve(avecCarte(), 'carte-restaurant', '2026-11-01', TODAY, TODAY);
    expect(totaux(jours.flatMap((j) => j.operations))).toEqual({ entrees: 18000, sorties: 980 });
  });
});

describe('mise à jour et sauvegarde', () => {
  it('ajoute une seule fois la catégorie « Carte restaurant » aux profils existants', () => {
    const d = fixture();
    d.settings.presetsVersion = 2;
    const une = reducer(d, { type: 'mettreAJourCategories' });
    expect(une.categories.filter((c) => c.kind === 'income' && c.name === 'Carte restaurant')).toHaveLength(1);
    expect(une.settings.presetsVersion).toBe(PRESETS_VERSION);
    const deux = reducer(une, { type: 'mettreAJourCategories' });
    expect(deux.categories).toHaveLength(une.categories.length);
  });

  it('la sauvegarde garde le compte des revenus et les ajustements ; un ajustement invalide est refusé', () => {
    const d = avecCarte();
    d.incomes = d.incomes.map((i) => (i.id === 'i-cr' ? { ...i, account: 'carte-restaurant' as const } : i));
    d.adjustments = [{ id: 'a1', account: 'carte-restaurant', date: TODAY, amount: -120, note: '' }];
    const r = validateData(JSON.parse(JSON.stringify(d)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.adjustments).toEqual(d.adjustments);
      expect(r.data.incomes.find((i) => i.id === 'i-cr')?.account).toBe('carte-restaurant');
    }
    const mauvais = JSON.parse(JSON.stringify(d));
    mauvais.adjustments[0].account = 'livret';
    expect(validateData(mauvais).ok).toBe(false);
    // Anciennes sauvegardes sans ajustements : acceptées
    const ancien = JSON.parse(JSON.stringify(fixture()));
    delete ancien.adjustments;
    const r2 = validateData(ancien);
    expect(r2.ok && r2.data.adjustments).toEqual([]);
  });

  it('l’export CSV indique le compte de chaque opération', () => {
    const csv = exportCSV(avecCarte(), TODAY);
    expect(csv).toContain('Déjeuner;Alimentation;-9,80;;Carte restaurant;Carte restaurant');
  });
});
