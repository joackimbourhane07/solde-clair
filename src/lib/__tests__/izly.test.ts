import { describe, expect, it } from 'vitest';
import { accountBalance, comptesUtilises, usesIzly } from '../accounts';
import { compteDuPaiement, isIzly, monthSummary, monthTransactions } from '../budget';
import { CATEGORIE_IZLY, DEPENSES_CAMPUS, PAYMENT_METHODS } from '../categories';
import { exportJSON, parseBackup } from '../storage';
import type { AppData } from '../../types';
import { fixture, TODAY } from '../../test/fixtures';

/** Profil étudiant : une recharge Izly de 20 € et un repas CROUS de 3,30 €. */
function avecIzly(): AppData {
  const d = fixture();
  d.adjustments = [
    { id: 'r1', account: 'compte', date: '2026-11-05', amount: -2000, note: 'Recharge Izly', recharge: true, lien: 'l1' },
    { id: 'r2', account: 'izly', date: '2026-11-05', amount: 2000, note: 'Recharge Izly', recharge: true, lien: 'l1' },
  ];
  d.expenses = [
    ...d.expenses,
    { id: 'iz1', amount: 330, categoryId: d.expenses[0].categoryId, date: '2026-11-06', description: 'Restaurant CROUS', paymentMethod: 'Izly' },
  ];
  return d;
}

describe('Izly : suivi manuel, solde séparé', () => {
  it('moyen de paiement « Izly », catégorie « Izly / CROUS » et achats campus proposés', () => {
    expect(PAYMENT_METHODS).toContain('Izly');
    expect(CATEGORIE_IZLY).toBe('Izly / CROUS');
    expect(DEPENSES_CAMPUS).toEqual(['Restaurant CROUS', 'Cafétéria', 'Laverie', 'Distributeur', 'Photocopies', 'Autre dépense campus']);
  });

  it('reconnaît Izly sans confondre avec d’autres moyens', () => {
    expect(isIzly('Izly')).toBe(true);
    expect(isIzly('izly crous')).toBe(true);
    expect(isIzly('Carte bancaire')).toBe(false);
    expect(compteDuPaiement('Izly')).toBe('izly');
    expect(compteDuPaiement('Carte bancaire')).toBe('compte');
  });

  it('Izly n’apparaît que s’il sert', () => {
    expect(usesIzly(fixture())).toBe(false);
    expect(comptesUtilises(fixture())).not.toContain('izly');
    expect(usesIzly(avecIzly())).toBe(true);
    expect(comptesUtilises(avecIzly())).toContain('izly');
  });

  it('une recharge déplace l’argent : −20 € sur le compte, +20 € sur Izly, total inchangé', () => {
    const avant = fixture();
    const d = avecIzly();
    d.expenses = d.expenses.filter((e) => e.id !== 'iz1');
    expect(accountBalance(d, 'compte', TODAY, TODAY)).toBe(accountBalance(avant, 'compte', TODAY, TODAY) - 2000);
    expect(accountBalance(d, 'izly', TODAY, TODAY)).toBe(2000);
    expect(accountBalance(d, 'tout', TODAY, TODAY)).toBe(accountBalance(avant, 'tout', TODAY, TODAY));
  });

  it('une dépense payée avec Izly sort du solde Izly, pas du compte bancaire', () => {
    const d = avecIzly();
    expect(accountBalance(d, 'izly', TODAY, TODAY)).toBe(2000 - 330);
    const sansRepas = avecIzly();
    sansRepas.expenses = sansRepas.expenses.filter((e) => e.id !== 'iz1');
    expect(accountBalance(d, 'compte', TODAY, TODAY)).toBe(accountBalance(sansRepas, 'compte', TODAY, TODAY));
  });

  it('total Izly du mois : seulement les dépenses payées avec Izly ; la recharge n’est pas une dépense', () => {
    const d = avecIzly();
    const izly = monthTransactions(d, '2026-11', TODAY).filter((t) => t.type === 'depense' && t.account === 'izly');
    expect(izly.map((t) => t.amount)).toEqual([330]);
    const sansRepas = avecIzly();
    sansRepas.expenses = sansRepas.expenses.filter((e) => e.id !== 'iz1');
    // La recharge ne change pas les dépenses du mois
    expect(monthSummary(sansRepas, '2026-11', TODAY).variable).toBe(monthSummary(fixture(), '2026-11', TODAY).variable);
  });

  it('sauvegarde et restauration : la recharge garde son lien', () => {
    const d = avecIzly();
    const r = parseBackup(exportJSON(d, TODAY));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const recharges = (r.data.adjustments ?? []).filter((a) => a.recharge);
    expect(recharges).toHaveLength(2);
    expect(new Set(recharges.map((a) => a.lien))).toEqual(new Set(['l1']));
    expect(recharges.map((a) => a.account).sort()).toEqual(['compte', 'izly']);
  });
});
