import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { aller, norm, preparer, stat } from './outils';

test.use({ viewport: { width: 375, height: 812 } });

test('parcours d’un nouvel utilisateur étudiant : configuration, saisies, budget, sauvegarde', async ({ page }) => {
  const erreurs = await preparer(page);
  await page.goto('./');

  // --- Configuration initiale ---
  await page.getByRole('button', { name: /Continuer/ }).click();
  await expect(page.getByText('Indiquez un prénom ou un pseudonyme.')).toBeVisible();
  await page.getByLabel('Prénom ou pseudonyme').fill('Léo Test');
  await page.getByText('Étudiant·e', { exact: true }).click();
  await page.getByRole('button', { name: /Continuer/ }).click();

  const montant = page.getByLabel('Montant mensuel');
  await montant.nth(0).fill('-50');
  await page.getByRole('button', { name: /Continuer/ }).click();
  await expect(page.getByText('Le montant ne peut pas être négatif.')).toBeVisible();
  await montant.nth(0).fill('450,50');
  await page.getByRole('button', { name: 'Ajouter un revenu complémentaire' }).click();
  await montant.nth(1).fill('210');
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page.getByLabel('Prénom ou pseudonyme')).toHaveValue('Léo Test');
  await page.getByRole('button', { name: /Continuer/ }).click();
  await expect(montant.nth(0)).toHaveValue('450,50');
  await page.getByRole('button', { name: /Continuer/ }).click();

  await montant.nth(0).fill('380');
  await montant.nth(1).fill('9,99');
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByLabel('Objectif d’épargne mensuel').fill('30');
  await page.getByRole('button', { name: /Continuer/ }).click();
  await expect(page.locator('.chip').filter({ hasText: 'APL / aide au logement' })).toBeVisible();
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByRole('button', { name: /Commencer/ }).click();

  // --- Tableau de bord : 660,50 − 389,99 = 270,51 € sur 19 jours ---
  await expect(page.getByRole('heading', { name: 'Bonjour Léo Test' })).toBeVisible();
  expect(norm(await page.locator('.hero-text').innerText())).toBe('Il vous reste 270 € pour terminer le mois, soit environ 14 € par jour.');
  expect(await stat(page, 'Solde disponible')).toBe('270,51 €');
  expect(await stat(page, 'Reste à vivre par jour')).toBe('14,23 €');

  // --- Dépense rapide ---
  const rapide = page.getByRole('form', { name: 'Ajout rapide d’une dépense' });
  await rapide.getByLabel('Montant', { exact: true }).fill('7,89');
  await rapide.getByRole('button', { name: 'Ajouter la dépense' }).click();
  expect(await stat(page, 'Solde disponible')).toBe('262,62 €');

  // --- Libellés avec élision au changement de mois ---
  await aller(page, 'charges');
  await page.getByRole('button', { name: 'Mois précédent' }).click();
  await expect(page.getByRole('heading', { name: 'Échéances d’octobre 2026' })).toBeVisible();
  await expect(page.getByText(/\bde (octobre|avril|août)\b/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Mois en cours' }).click();

  // --- Budget : seuil puis dépassement ---
  await aller(page, 'budgets');
  await page.getByRole('button', { name: 'Nouvelle catégorie' }).click();
  await page.getByLabel('Nom de la catégorie').fill('Sorties');
  await page.getByLabel('Limite mensuelle').fill('100');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  for (const [valeur, badge] of [['90', '90 % atteint'], ['10,01', 'Budget dépassé']]) {
    await aller(page, 'depenses');
    await page.getByRole('button', { name: 'Ajouter une dépense' }).click();
    await page.getByRole('dialog').getByLabel('Montant', { exact: true }).fill(valeur);
    await page.getByRole('dialog').getByLabel('Catégorie').selectOption({ label: 'Sorties' });
    await page.getByRole('dialog').getByRole('button', { name: 'Ajouter la dépense' }).click();
    await aller(page, 'budgets');
    const carte = page.locator('.budget-card').filter({ has: page.getByRole('heading', { name: 'Sorties', exact: true }) });
    await expect(carte.locator('.badge')).toHaveText(badge);
  }

  // --- Simulateur : aucune donnée modifiée ---
  const avant = await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1'));
  await aller(page, 'simulateur');
  await page.getByLabel('Montant de l’achat').fill('500');
  await expect(page.locator('.verdict-title')).toHaveText('Achat susceptible de déséquilibrer le budget');
  expect(await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1'))).toBe(avant);

  // --- Sauvegarde : export JSON, effacement, réimport ---
  await aller(page, 'parametres');
  const [telechargement] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Sauvegarde complète (JSON)' }).click(),
  ]);
  // Chemin sans caractère spécial : l'envoi de fichier de Playwright échoue sans message avec « ’ » dans le chemin.
  const fichier = path.join(os.tmpdir(), `soldeclair-e2e-${Date.now()}.json`);
  await telechargement.saveAs(fichier);
  // État exact au moment de la sauvegarde (la date de dernière sauvegarde vient d'être enregistrée)
  const sauvegarde = await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1'));
  expect(JSON.parse(fs.readFileSync(fichier, 'utf8')).donnees).toEqual(JSON.parse(sauvegarde!));
  expect(JSON.parse(fs.readFileSync(fichier, 'utf8')).donnees.profile.name).toBe('Léo Test');

  await page.getByRole('button', { name: 'Effacer toutes mes données' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('textbox', { name: 'Confirmation' }).fill('EFFACER');
  await page.getByRole('button', { name: 'Tout effacer définitivement' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenue sur SoldeClair' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1'))).toBeNull();

  await page.setInputFiles('input[type=file]', fichier);
  await expect(page.getByRole('heading', { name: 'Bonjour Léo Test' })).toBeVisible();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1')))!)).toEqual(JSON.parse(sauvegarde!));

  expect(erreurs).toEqual([]);
});
