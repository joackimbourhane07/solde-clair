import { describe, expect, it } from 'vitest';
import { simulatePurchase } from '../simulator';
import { fixture, TODAY } from '../../test/fixtures';

// Point de départ : le solde de « Mon compte » (2 590,52 €), comme « Il vous reste » du tableau de bord ;
// 19 jours restants, 50 € d’épargne encore prévus ce mois-ci.
const SOLDE = 259052;

describe('simulateur d’achat', () => {
  it('achat modéré : situation confortable', () => {
    const r = simulatePurchase(fixture(), 10000, null, TODAY);
    expect(r.availableBefore).toBe(SOLDE);
    expect(r.availableAfter).toBe(SOLDE - 10000);
    expect(r.dailyBefore).toBe(Math.trunc(SOLDE / 19));
    expect(r.dailyAfter).toBe(Math.trunc((SOLDE - 10000) / 19));
    expect(r.savingsImpact).toBe(0);
    expect(r.verdict).toBe('confortable');
  });

  it('achat qui entame l’épargne prévue : prudence', () => {
    const r = simulatePurchase(fixture(), SOLDE - 3151, null, TODAY);
    expect(r.availableAfter).toBe(3151);
    expect(r.savingsPossibleBefore).toBe(5000);
    expect(r.savingsPossibleAfter).toBe(3151);
    expect(r.savingsImpact).toBe(1849);
    expect(r.verdict).toBe('prudence');
    expect(r.goals[0]).toMatchObject({ name: 'Voyage', monthsOfContribution: 25.6, delayMonths: 1 });
  });

  it('achat qui rend le solde négatif : déséquilibre', () => {
    const r = simulatePurchase(fixture(), SOLDE + 7849, null, TODAY);
    expect(r.availableAfter).toBe(-7849);
    expect(r.dailyAfter).toBeLessThan(0);
    expect(r.verdict).toBe('desequilibre');
  });

  it('achat qui ferait dépasser le budget d’une catégorie', () => {
    const r = simulatePurchase(fixture(), 2500, 'c-loisirs', TODAY);
    expect(r.category).toMatchObject({ spentBefore: 6000, spentAfter: 8500, remainingAfter: -500, levelBefore: 'attention', levelAfter: 'depasse' });
    expect(r.verdict).toBe('prudence');
    expect(r.reasons.join(' ')).toContain('Loisirs');
  });

  it('achat dans une catégorie sans limite', () => {
    const r = simulatePurchase(fixture(), 2000, 'c-sante', TODAY);
    expect(r.category).toMatchObject({ budget: null, levelAfter: 'sans' });
    expect(r.verdict).toBe('confortable');
  });

  it('achat supérieur à la moitié du solde : prudence', () => {
    const r = simulatePurchase(fixture(), 130000, null, TODAY);
    expect(r.savingsImpact).toBe(0);
    expect(r.verdict).toBe('prudence');
  });

  it('impact exprimé en mois de contribution pour chaque objectif', () => {
    const r = simulatePurchase(fixture(), 25000, null, TODAY);
    expect(r.goals).toHaveLength(1);
    expect(r.goals[0].monthsOfContribution).toBe(2.5);
  });
});
