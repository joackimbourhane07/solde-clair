import { describe, expect, it } from 'vitest';
import { centsToInput, divideCents, divideCentsUp, formatMoney, formatMoneyShort, parseAmount, percent, splitByWeights, sum } from '../money';

const norm = (s: string) => s.replace(/[  ]/g, ' ');

describe('parseAmount — saisie des montants', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12,50', 1250],
    ['12.05', 1205],
    ['1 234,56', 123456],
    ['1 234,56 €', 123456],
    ['0,99', 99],
    [',5', 50],
    ['  45 ', 4500],
    ['-3,20', -320],
  ])('« %s » → %i centimes', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each(['', 'abc', '12,345', '1,2,3', '12a', '--5', '1.234,56'])('refuse « %s »', (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it('évite les erreurs d’arrondi des nombres à virgule (0,1 + 0,2)', () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(parseAmount('0,10')! + parseAmount('0,20')!).toBe(30);
    expect(sum([parseAmount('19,99')!, parseAmount('0,01')!, parseAmount('80,00')!])).toBe(10000);
  });
});

describe('affichage', () => {
  it('formate en euros à la française avec deux décimales', () => {
    expect(norm(formatMoney(123456))).toBe('1 234,56 €');
    expect(norm(formatMoney(5))).toBe('0,05 €');
    expect(norm(formatMoney(-2550))).toBe('-25,50 €');
  });

  it('arrondi à l’euro prudent (jamais de surestimation du reste)', () => {
    expect(norm(formatMoneyShort(128760, 'EUR', 'prudent'))).toBe('1 287 €');
    expect(norm(formatMoneyShort(4292, 'EUR', 'prudent'))).toBe('42 €');
    expect(norm(formatMoneyShort(1001, 'EUR', 'majore'))).toBe('11 €');
    expect(norm(formatMoneyShort(4292))).toBe('43 €');
  });

  it('séparateur des milliers lisible avec toutes les polices (espace insécable U+00A0, pas U+202F)', () => {
    expect(formatMoney(120000)).toBe('1\u00a0200,00\u00a0€');
    expect(formatMoney(123456789)).not.toMatch(/\u202f/);
    expect(formatMoneyShort(120000)).toBe('1\u00a0200\u00a0€');
  });

  it('convertit des centimes en valeur éditable', () => {
    expect(centsToInput(1250)).toBe('12,50');
    expect(centsToInput(5)).toBe('0,05');
    expect(centsToInput(-120)).toBe('-1,20');
    expect(centsToInput(null)).toBe('');
  });
});

describe('outils de calcul', () => {
  it('pourcentage arrondi, null si total nul', () => {
    expect(percent(7500, 10000)).toBe(75);
    expect(percent(1, 3)).toBe(33);
    expect(percent(100, 0)).toBeNull();
  });

  it('division tronquée vers zéro (ne surestime jamais)', () => {
    expect(divideCents(1000, 3)).toBe(333);
    expect(divideCents(-1000, 3)).toBe(-333);
    expect(divideCents(1000, 0)).toBe(0);
    expect(divideCentsUp(1000, 3)).toBe(334);
  });

  it('répartition sans perte de centime', () => {
    const parts = splitByWeights(10000, [1, 1, 1]);
    expect(sum(parts)).toBe(10000);
    expect(parts).toEqual([3334, 3333, 3333]);
    const parts2 = splitByWeights(123457, [45, 8, 12, 10, 5, 5, 7, 5, 3]);
    expect(sum(parts2)).toBe(123457);
  });
});
