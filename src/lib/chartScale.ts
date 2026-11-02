/**
 * Échelles des graphiques (valeurs en centimes).
 *
 * Les graduations tombent toujours sur des euros entiers, couvrent toujours
 * la plus grande valeur, et gardent au moins 10 € d'écart pour éviter des
 * libellés en double (« 1 €, 1 €, 0 € ») quand les montants sont minuscules.
 */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (hi - lo < 1000) hi = lo + 1000;
  const span = hi - lo;
  const mag = Math.pow(10, Math.floor(Math.log10(span / count)));
  const candidate = [1, 2, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const step = Math.max(100, Math.ceil(candidate / 100) * 100);
  const ticks: number[] = [];
  for (let v = Math.floor(lo / step) * step; ; v += step) {
    ticks.push(v);
    if (v >= hi) break;
  }
  return ticks;
}

/**
 * Choisit les libellés de l'axe horizontal à afficher : le dernier est toujours
 * visible, et deux libellés ne sont jamais plus proches que `minGap` pixels.
 */
export function visibleTickIndexes(positions: number[], minGap: number): number[] {
  if (positions.length === 0) return [];
  const last = positions.length - 1;
  const chosen: number[] = [];
  for (let i = 0; i <= last; i += 1) {
    const prev = chosen[chosen.length - 1];
    if (prev === undefined || positions[i] - positions[prev] >= minGap) chosen.push(i);
  }
  if (chosen[chosen.length - 1] !== last) {
    // Le dernier point remplace le précédent s'il est trop proche.
    if (positions[last] - positions[chosen[chosen.length - 1]] < minGap) chosen.pop();
    chosen.push(last);
  }
  return chosen;
}
