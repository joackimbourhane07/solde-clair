import { describe, expect, it } from 'vitest';
import { niceTicks, visibleTickIndexes } from '../chartScale';

describe('échelles des graphiques', () => {
  it('la graduation la plus haute couvre toujours la plus grande valeur', () => {
    for (const max of [16000, 123400, 284300, 99999, 1001]) {
      const t = niceTicks(0, max);
      expect(t[t.length - 1]).toBeGreaterThanOrEqual(max);
      expect(t[0]).toBe(0);
    }
  });

  it('graduations en euros entiers, sans libellé en double pour de petits montants', () => {
    const t = niceTicks(0, 100); // 1 € au maximum
    expect(t.every((v) => v % 100 === 0)).toBe(true);
    expect(new Set(t.map((v) => Math.round(v / 100))).size).toBe(t.length);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(1000); // au moins 10 € d'écart
  });

  it('gère les valeurs négatives (solde en dessous de zéro)', () => {
    const t = niceTicks(-25000, 80000);
    expect(t[0]).toBeLessThanOrEqual(-25000);
    expect(t).toContain(0);
  });

  it('libellés de l’axe horizontal : jamais plus proches que l’écart minimal, le dernier toujours visible', () => {
    const positions = Array.from({ length: 30 }, (_, i) => 56 + i * 20);
    const idx = visibleTickIndexes(positions, 68);
    expect(idx[idx.length - 1]).toBe(29);
    for (let k = 1; k < idx.length; k += 1) expect(positions[idx[k]] - positions[idx[k - 1]]).toBeGreaterThanOrEqual(68);
    // 6 mois sur un petit écran : « oct. 26 » et « nov. 26 » ne se chevauchent plus
    const mois = [56, 110, 164, 218, 272, 326];
    const vis = visibleTickIndexes(mois, 68);
    expect(vis).toContain(5);
    expect(vis.every((v, k) => k === 0 || mois[v] - mois[vis[k - 1]] >= 68)).toBe(true);
  });
});
