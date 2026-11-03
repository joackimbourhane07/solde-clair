import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'node:path';
import { aller, preparer, problemesDeMiseEnPage } from './outils';

/* Import du fichier d'exemple fictif de la documentation, puis « Mon plan d'épargne » rempli. */
const EXEMPLE = path.resolve('docs/exemple-sauvegarde-fictive.json');

for (const viewport of [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`Mon plan rempli à ${viewport.width} px : import, projection, accessibilité`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const erreurs = await preparer(page);
    await page.goto('./#/bienvenue');
    await page.setInputFiles('input[type=file]', EXEMPLE);
    await expect(page.getByRole('heading', { name: 'Bonjour Alex' })).toBeVisible();
    // Le fichier importé devient le point de départ
    expect(await page.evaluate(() => Object.keys(localStorage).some((k) => k.startsWith('soldeclair:depart:v1:')))).toBe(true);

    await aller(page, 'plan');
    await expect(page.getByRole('heading', { name: 'Mon plan d’épargne' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Épargne de fin de contrat' })).toBeVisible();
    await expect(page.getByText('Retrait = clôture')).toBeVisible();
    // Projection optimiste : la case ajoute les revenus attendus cochés
    await page.getByLabel(/Inclure les revenus attendus/).check();
    expect(await problemesDeMiseEnPage(page), 'Mise en page de « Mon plan »').toEqual([]);
    if (viewport.width === 390 || viewport.width === 1440) {
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(
        res.violations.map((v) => `${v.id} : ${v.help}`),
        'Accessibilité de « Mon plan »',
      ).toEqual([]);
    }

    // Bilan du mois (fenêtre) : lisible et accessible
    await page.getByRole('button', { name: 'Faire le bilan du mois' }).click();
    const bilan = page.getByRole('dialog', { name: 'Bilan du mois' });
    await expect(bilan.getByLabel('Mois du bilan')).toBeVisible();
    await bilan.getByRole('button', { name: 'Annuler' }).click();

    // Accueil : carte « Mon objectif » et repères
    await aller(page, '');
    await expect(page.getByRole('heading', { name: 'Mon objectif : Épargne de fin de contrat' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Repères pour toi' })).toBeVisible();
    expect(await problemesDeMiseEnPage(page), 'Mise en page de l’accueil').toEqual([]);
    expect(erreurs, 'Erreurs dans la console').toEqual([]);
  });
}
