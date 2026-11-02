import { describe, expect, it } from 'vitest';
import { reducer } from '../../state/AppState';
import { fixture } from '../../test/fixtures';

describe('modifications des données', () => {
  it('ajoute, modifie et supprime une dépense', () => {
    let d = fixture();
    d = reducer(d, { type: 'upsert', collection: 'expenses', item: { id: 'n', amount: 999, categoryId: 'c-alim', date: '2026-11-12', description: 'Pain', paymentMethod: '' } });
    expect(d.expenses).toHaveLength(5);
    d = reducer(d, { type: 'upsert', collection: 'expenses', item: { id: 'n', amount: 1099, categoryId: 'c-alim', date: '2026-11-12', description: 'Pain', paymentMethod: '' } });
    expect(d.expenses).toHaveLength(5);
    expect(d.expenses.find((e) => e.id === 'n')?.amount).toBe(1099);
    d = reducer(d, { type: 'remove', collection: 'expenses', id: 'n' });
    expect(d.expenses.find((e) => e.id === 'n')).toBeUndefined();
  });

  it('supprimer une catégorie utilisée déplace ses éléments vers « Autre »', () => {
    const d = reducer(fixture(), { type: 'removeCategory', id: 'c-alim' });
    expect(d.categories.find((c) => c.id === 'c-alim')).toBeUndefined();
    const autre = d.categories.find((c) => c.name === 'Autre dépense' && c.kind === 'variable')!;
    expect(autre).toBeDefined();
    expect(d.expenses.filter((e) => e.categoryId === autre.id)).toHaveLength(3);
    expect(d.expenses.some((e) => e.categoryId === 'c-alim')).toBe(false);
  });

  it('supprimer un objectif conserve ses versements en épargne libre', () => {
    const d = reducer(fixture(), { type: 'removeGoal', id: 'g1' });
    expect(d.goals).toHaveLength(0);
    expect(d.savings.every((s) => s.goalId === null)).toBe(true);
    expect(d.savings).toHaveLength(2);
  });

  it('change le statut d’une échéance de charge fixe', () => {
    const d = reducer(fixture(), { type: 'setChargeStatus', id: 'f-tel', date: '2026-11-20', status: 'paye' });
    expect(d.fixedCharges.find((c) => c.id === 'f-tel')?.status['2026-11-20']).toBe('paye');
  });

  it('active puis désactive le masquage des montants', () => {
    let d = reducer(fixture(), { type: 'setHideAmounts', hide: true });
    expect(d.settings.hideAmounts).toBe(true);
    d = reducer(d, { type: 'setHideAmounts', hide: false });
    expect(d.settings.hideAmounts).toBe(false);
  });

  it('mémorise la date de la dernière sauvegarde complète', () => {
    const d = reducer(fixture(), { type: 'setLastBackup', date: '2026-11-12' });
    expect(d.settings.lastBackup).toBe('2026-11-12');
  });

  it('réinitialisation complète (conserve seulement le thème)', () => {
    const d = reducer({ ...fixture(), settings: { theme: 'dark' } }, { type: 'reset' });
    expect(d.profile).toBeNull();
    expect(d.expenses).toHaveLength(0);
    expect(d.settings.theme).toBe('dark');
  });
});
