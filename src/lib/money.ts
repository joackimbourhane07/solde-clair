import type { Cents } from '../types';

/**
 * Convertit une saisie utilisateur (« 12 », « 12,5 », « 1 234,56 », « 12.50 € »)
 * en centimes entiers. Renvoie null si la saisie n'est pas un montant valide.
 * Le calcul se fait sur la chaîne de caractères, sans passer par un nombre à
 * virgule, afin d'éviter toute erreur d'arrondi.
 */
export function parseAmount(input: string | number | null | undefined): Cents | null {
  if (input === null || input === undefined) return null;
  let s = String(input).trim();
  if (s === '') return null;
  // Supprime le symbole monétaire et les espaces (y compris insécables).
  s = s.replace(/[€$£\s  ]/g, '').replace(/(CHF|EUR|USD|CAD|GBP|MAD)$/i, '');
  let negative = false;
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  // Une seule virgule ou un seul point comme séparateur décimal.
  const normalized = s.replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized) && !/^\.\d{1,2}$/.test(normalized)) return null;
  const [intPart, decPart = ''] = normalized.split('.');
  const euros = intPart === '' ? 0 : Number(intPart);
  const cents = Number((decPart + '00').slice(0, 2));
  const total = euros * 100 + cents;
  if (!Number.isSafeInteger(total)) return null;
  return negative ? -total : total;
}

/** Convertit des centimes en chaîne éditable (« 1234,5 » → « 1234,50 »). */
export function centsToInput(cents: Cents | null | undefined): string {
  if (cents === null || cents === undefined) return '';
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${negative ? '-' : ''}${euros},${String(rest).padStart(2, '0')}`;
}

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string): Intl.NumberFormat {
  let f = formatters.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      f = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
    }
    formatters.set(currency, f);
  }
  return f;
}

/**
 * Intl sépare les milliers par une espace fine insécable (U+202F), presque
 * invisible avec certaines polices (« 1200,00 € »). On utilise l'espace
 * insécable classique (U+00A0), lisible partout : « 1 200,00 € ».
 */
const lisible = (s: string) => s.replace(/\u202f/g, '\u00a0');

/** Affiche un montant en centimes au format français : « 1 234,56 € ». */
export function formatMoney(cents: Cents, currency = 'EUR'): string {
  // Division par 100 uniquement pour l'affichage final : aucun calcul ensuite.
  return lisible(formatter(currency).format(cents / 100));
}

/**
 * Version arrondie à l'unité, pour les messages (« environ 18 € »).
 * - 'arrondi' : au plus proche (axes des graphiques)
 * - 'prudent' : vers zéro, pour ne jamais surestimer ce qu'il reste
 * - 'majore' : loin de zéro, pour ne jamais sous-estimer un dépassement
 */
export function formatMoneyShort(cents: Cents, currency = 'EUR', mode: 'arrondi' | 'prudent' | 'majore' = 'arrondi'): string {
  const units =
    mode === 'prudent'
      ? Math.trunc(cents / 100)
      : mode === 'majore'
        ? Math.sign(cents) * Math.ceil(Math.abs(cents) / 100)
        : Math.round(cents / 100);
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(units).replace(/\u202f/g, '\u00a0');
  } catch {
    return formatMoney(cents, currency);
  }
}

/** Somme de montants en centimes. */
export function sum(values: Cents[]): Cents {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * Pourcentage entier d'une part sur un total (arrondi au plus proche).
 * Renvoie null si le total est nul (pourcentage non calculable).
 */
export function percent(part: Cents, total: Cents): number | null {
  if (total <= 0) return null;
  return Math.round((part * 100) / total);
}

/**
 * Division d'un montant en centimes, tronquée vers zéro, pour ne jamais
 * surestimer ce qu'il reste à dépenser.
 */
export function divideCents(amount: Cents, divisor: number): Cents {
  if (divisor <= 0) return 0;
  return Math.trunc(amount / divisor);
}

/** Division arrondie au centime supérieur (ex. effort mensuel nécessaire). */
export function divideCentsUp(amount: Cents, divisor: number): Cents {
  if (divisor <= 0) return amount;
  return Math.ceil(amount / divisor);
}

/**
 * Répartit un montant selon des poids, sans perdre de centime :
 * la somme des parts est toujours exactement égale au montant.
 */
export function splitByWeights(amount: Cents, weights: number[]): Cents[] {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0 || weights.length === 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / totalWeight);
  const parts = raw.map((r) => Math.floor(r));
  let remainder = amount - parts.reduce((a, b) => a + b, 0);
  // Distribue les centimes restants aux plus grandes parties fractionnaires.
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remainder > 0; k = (k + 1) % order.length) {
    parts[order[k].i] += 1;
    remainder -= 1;
  }
  return parts;
}

export const CURRENCIES: { code: string; label: string }[] = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'CHF', label: 'Franc suisse (CHF)' },
  { code: 'USD', label: 'Dollar américain ($)' },
  { code: 'CAD', label: 'Dollar canadien ($ CA)' },
  { code: 'GBP', label: 'Livre sterling (£)' },
  { code: 'MAD', label: 'Dirham marocain (MAD)' },
];
