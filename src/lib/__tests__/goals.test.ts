import { describe, expect, it } from 'vitest';
import { goalProgress, monthsUntil } from '../goals';
import type { SavingsGoal } from '../../types';
import { fixture, TODAY } from '../../test/fixtures';

const base: SavingsGoal = {
  id: 'g', name: 'Ordinateur', description: '', target: 100000, initialAmount: 20000,
  targetDate: '2027-05-12', priority: 'moyenne', monthlyContribution: 10000, createdAt: '2026-09-01',
};

describe('objectifs d’épargne', () => {
  it('montant disponible, restant et progression', () => {
    const d = fixture();
    const p = goalProgress(d.goals[0], d.savings, TODAY);
    expect(p.current).toBe(35000); // 200 initial + 100 + 50 versés
    expect(p.remaining).toBe(65000);
    expect(p.pct).toBe(35);
    expect(p.reached).toBe(false);
  });

  it('mois restants et montant mensuel nécessaire (arrondi au centime supérieur)', () => {
    const p = goalProgress(base, [], TODAY);
    expect(p.monthsRemaining).toBe(6);
    expect(p.monthlyNeeded).toBe(13334); // 800 € / 6 = 133,333… → 133,34 €
  });

  it('estimation de la date d’atteinte avec la contribution prévue', () => {
    const p = goalProgress(base, [], TODAY);
    expect(p.monthsToReach).toBe(8); // 800 € / 100 € par mois
    expect(p.estimatedDate).toBe('2027-07-12');
    expect(p.onTrack).toBe(false); // 100 € < 133,34 € nécessaires
    expect(goalProgress({ ...base, monthlyContribution: 13334 }, [], TODAY).onTrack).toBe(true);
  });

  it('sans contribution ni date : rien d’estimable', () => {
    const p = goalProgress({ ...base, monthlyContribution: 0, targetDate: null }, [], TODAY);
    expect(p.estimatedDate).toBeNull();
    expect(p.monthsRemaining).toBeNull();
    expect(p.monthlyNeeded).toBeNull();
    expect(p.onTrack).toBeNull();
  });

  it('objectif atteint (progression bornée à 100 %)', () => {
    const p = goalProgress({ ...base, initialAmount: 120000 }, [], TODAY);
    expect(p.reached).toBe(true);
    expect(p.remaining).toBe(0);
    expect(p.pct).toBe(100);
    expect(p.monthlyNeeded).toBe(0);
  });

  it('date dépassée ou dans le mois en cours', () => {
    expect(goalProgress({ ...base, targetDate: '2026-10-01' }, [], TODAY).dateExceeded).toBe(true);
    expect(monthsUntil('2026-11-28', TODAY)).toBe(1);
    expect(monthsUntil('2026-11-01', TODAY)).toBe(0);
    expect(goalProgress({ ...base, targetDate: '2026-11-28' }, [], TODAY).monthlyNeeded).toBe(80000);
  });
});
