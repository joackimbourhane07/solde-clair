import { describe, expect, it } from 'vitest';
import { emptyData, exportCSV, exportJSON, loadData, parseBackup, saveData, STORAGE_KEY, validateData } from '../storage';
import { fixture, TODAY } from '../../test/fixtures';

describe('sauvegarde locale', () => {
  it('enregistre puis relit les données dans le navigateur', () => {
    const d = fixture();
    expect(saveData(d)).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"Voyage"');
    expect(loadData()).toEqual(d);
  });

  it('données absentes ou corrompues : départ à vide sans erreur', () => {
    expect(loadData()).toEqual(emptyData());
    localStorage.setItem(STORAGE_KEY, '{pas du json');
    expect(loadData()).toEqual(emptyData());
  });
});

describe('export / import JSON', () => {
  it('aller-retour sans perte', () => {
    const d = fixture();
    const result = parseBackup(exportJSON(d, TODAY));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual(d);
  });

  it('le fichier exporté contient la date et l’application', () => {
    const json = JSON.parse(exportJSON(fixture(), TODAY));
    expect(json.application).toBe('SoldeClair');
    expect(json.exporteLe).toBe(TODAY);
  });

  it.each([
    ['texte quelconque', 'pas du json', 'JSON valide'],
    ['objet vide', '{}', 'Version'],
    ['montant négatif', JSON.stringify({ ...fixture(), expenses: [{ id: 'x', amount: -5, categoryId: 'c', date: '2026-11-01' }] }), 'Dépense n° 1'],
    ['montant décimal', JSON.stringify({ ...fixture(), incomes: [{ id: 'x', name: 'a', amount: 12.5, date: '2026-11-01' }] }), 'Revenu n° 1'],
    ['date invalide', JSON.stringify({ ...fixture(), fixedCharges: [{ id: 'x', name: 'a', amount: 5, date: '2026-02-30' }] }), 'Charge fixe n° 1'],
    ['liste mal formée', JSON.stringify({ ...fixture(), goals: 'oups' }), 'objectifs'],
  ])('refuse un fichier invalide (%s) avec un message clair', (_label, text, expected) => {
    const r = parseBackup(text);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(expected);
  });

  it('date de dernière sauvegarde : conservée si valide, ignorée sinon', () => {
    const ok = validateData({ ...fixture(), settings: { theme: 'light', lastBackup: '2026-10-01' } });
    expect(ok.ok && ok.data.settings).toEqual({ theme: 'light', lastBackup: '2026-10-01' });
    const ko = validateData({ ...fixture(), settings: { theme: 'light', lastBackup: 'hier' } });
    expect(ko.ok && ko.data.settings).toEqual({ theme: 'light' });
  });

  it('nettoie les valeurs inconnues', () => {
    const d = { ...fixture(), settings: { theme: 'fluo' }, profile: { ...fixture().profile, type: 'astronaute', currency: 'xx' } };
    const r = validateData(d);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.settings.theme).toBe('dark');
      expect(r.data.profile?.type).toBe('autre');
      expect(r.data.profile?.currency).toBe('EUR');
    }
  });
});

describe('export CSV', () => {
  const csv = exportCSV(fixture(), TODAY);
  const lines = csv.replace('﻿', '').trim().split('\r\n');

  it('BOM UTF-8, en-tête et séparateur point-virgule', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(lines[0]).toBe('Date;Type;Libellé;Catégorie;Montant;Statut;Moyen de paiement;Note');
  });

  it('montants signés avec virgule décimale', () => {
    expect(lines).toContain('2026-11-10;Revenu;Vente vélo;Autre revenu;200,50;;;');
    expect(lines).toContain('2026-11-02;Dépense variable;Courses;Alimentation;-45,30;;Carte bancaire;');
    expect(lines.some((l) => l.startsWith('2026-11-20;Charge fixe;Forfait;Téléphone;-15,99;À venir'))).toBe(true);
  });

  it('inclut tout l’historique jusqu’à la fin du mois en cours', () => {
    expect(lines[1].startsWith('2026-03-15')).toBe(true); // assurance annuelle : première date connue
    expect(lines.some((l) => l.startsWith('2026-12'))).toBe(false);
  });

  it('protège contre les points-virgules, guillemets et formules', () => {
    const d = fixture();
    d.expenses[0].description = 'Pizza; "maison"';
    d.expenses[1].description = '=SOMME(A1)';
    const out = exportCSV(d, TODAY);
    expect(out).toContain('"Pizza; ""maison"""');
    expect(out).toContain("'=SOMME(A1)");
  });
});
