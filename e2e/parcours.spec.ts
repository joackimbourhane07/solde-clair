import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { aller, chargerDemo, norm, preparer, problemesDeMiseEnPage, stat } from './outils';

test.use({ viewport: { width: 375, height: 812 } });

test('parcours d’un nouvel utilisateur étudiant : configuration, saisies, budget, sauvegarde', async ({ page }) => {
  const erreurs = await preparer(page);
  await page.goto('./');

  // --- Présentation : premier écran d'un nouveau visiteur ---
  await expect(page.getByRole('heading', { level: 1, name: 'Votre budget devient enfin clair.' })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: 'Commencer' }).first().click();
  await expect(page.getByRole('heading', { name: 'Bienvenue sur SoldeClair' })).toBeVisible();

  // --- Configuration initiale ---
  await page.getByRole('button', { name: /Continuer/ }).click();
  await expect(page.getByText('Indiquez un prénom ou un pseudonyme.')).toBeVisible();
  await page.getByLabel('Prénom ou pseudonyme').fill('Léo Test');
  await page.getByText('Étudiant(e)', { exact: true }).click();
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
  // Une seule carte principale ; les chiffres secondaires sont dans « Détail du mois »
  await expect(page.locator('.hero-figure')).toHaveCount(0);
  await page.getByText('Détail du mois').click();
  await expect(page.locator('.stat').filter({ hasText: 'Reste à vivre par jour' })).toBeVisible();
  expect(await stat(page, 'Reste à vivre par jour')).toBe('14,23 €');
  // Sur mobile, le formulaire d'ajout rapide laisse la place au bouton « + »
  await expect(page.getByRole('form', { name: 'Ajout rapide d’une dépense' })).toBeHidden();

  // --- Bouton « + » central (mobile) depuis une autre page ---
  await aller(page, 'budgets');
  await page.locator('.bottom-nav').getByRole('button', { name: 'Ajouter une dépense' }).click();
  const fenetre = page.getByRole('dialog', { name: 'Nouvelle dépense' });
  await fenetre.getByRole('group', { name: 'Catégories fréquentes' }).getByRole('button').first().click();
  await fenetre.getByLabel('Montant', { exact: true }).fill('1');
  await fenetre.getByRole('button', { name: 'Ajouter la dépense' }).click();
  await expect(fenetre).toHaveCount(0);
  await aller(page, '');
  expect(await stat(page, 'Solde disponible')).toBe('269,51 €');

  // --- Masquer les montants ---
  await page.locator('.topbar').getByRole('button', { name: 'Masquer les montants' }).click();
  expect(await stat(page, 'Solde disponible')).toBe('••• €');
  await page.locator('.topbar').getByRole('button', { name: 'Afficher les montants' }).click();

  // --- Dépense rapide depuis l'accueil, au pouce ---
  await page.locator('.bottom-nav').getByRole('button', { name: 'Ajouter une dépense' }).click();
  const rapide = page.getByRole('dialog', { name: 'Nouvelle dépense' });
  await rapide.getByLabel('Montant', { exact: true }).fill('7,89');
  await rapide.getByRole('button', { name: 'Ajouter la dépense' }).click();
  await expect(rapide).toHaveCount(0);
  expect(await stat(page, 'Solde disponible')).toBe('261,62 €');

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
    await page.locator('main').getByRole('button', { name: 'Ajouter une dépense' }).click();
    await page.getByRole('dialog').getByLabel('Montant', { exact: true }).fill(valeur);
    await page.getByRole('dialog').getByLabel('Catégorie', { exact: true }).selectOption({ label: 'Sorties' });
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
  // Retour à la présentation, comme un nouveau visiteur ; l'import se trouve dans la configuration
  await expect(page.getByRole('heading', { level: 1, name: 'Votre budget devient enfin clair.' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1'))).toBeNull();
  await page.getByRole('contentinfo').getByRole('button', { name: 'Importer une sauvegarde' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenue sur SoldeClair' })).toBeVisible();

  await page.setInputFiles('input[type=file]', fichier);
  await expect(page.getByRole('heading', { name: 'Bonjour Léo Test' })).toBeVisible();
  expect(JSON.parse((await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1')))!)).toEqual(JSON.parse(sauvegarde!));

  expect(erreurs).toEqual([]);
});

test('carte restaurant et onglet Compte : revenu, paiement, soldes séparés, ajustement (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const erreurs = await preparer(page);
  await chargerDemo(page);

  // Revenu versé sur la carte restaurant (catégorie ajoutée automatiquement)
  await aller(page, 'revenus');
  await page.getByRole('button', { name: 'Ajouter un revenu' }).first().click();
  const revenu = page.getByRole('dialog');
  await revenu.getByLabel('Nom').fill('Titres-restaurant');
  await revenu.getByLabel('Montant', { exact: true }).fill('180');
  await revenu.getByLabel('Catégorie').selectOption({ label: 'Carte restaurant' });
  await expect(revenu.getByRole('group', { name: 'Versé sur' }).getByLabel('Carte restaurant')).toBeChecked();
  await revenu.getByLabel('Date du premier versement').fill('2026-11-01');
  await revenu.getByRole('button', { name: 'Ajouter le revenu' }).click();
  expect(await stat(page, 'Sur la carte restaurant')).toBe('180,00 €');

  // Déjeuner payé avec la carte restaurant
  await aller(page, 'depenses');
  await page.getByRole('button', { name: 'Ajouter une dépense' }).first().click();
  const depense = page.getByRole('dialog');
  await depense.getByLabel('Montant', { exact: true }).fill('9,80');
  await depense.getByLabel('Description').fill('Déjeuner');
  await depense.getByLabel(/Moyen de paiement/).selectOption('Carte restaurant');
  await depense.getByRole('button', { name: 'Ajouter la dépense' }).click();

  // Onglet Compte depuis la barre du bas
  await page.locator('.bottom-nav').getByRole('link', { name: 'Compte' }).click();
  await expect(page.getByRole('heading', { name: 'Mon compte' })).toBeVisible();
  await expect(page.locator('.solde-detail')).toContainText('170,20');
  await page.getByRole('group', { name: 'Compte affiché' }).getByRole('button', { name: 'Carte restaurant' }).click();
  await expect(page.locator('.solde-montant')).toHaveText(/^170,20\s€$/);
  await expect(page.getByText('Déjeuner')).toBeVisible();

  // Ajuster le solde du compte bancaire
  await page.getByRole('group', { name: 'Compte affiché' }).getByRole('button', { name: 'Tout' }).click();
  await page.getByRole('button', { name: 'Ajuster le solde' }).click();
  const ajuster = page.getByRole('dialog', { name: 'Ajuster le solde' });
  await ajuster.getByLabel('Solde réel – Compte bancaire').fill('1 250,40');
  await ajuster.getByRole('button', { name: 'Enregistrer le solde' }).click();
  await expect(page.locator('.solde-detail dd').first()).toHaveText(/^1\s250,40\s€$/);

  // Couleurs : solde écrit en vert lisible, icônes en rouge vif exact, montants sortants en rouge lisible
  const couleurs = await page.evaluate(() => {
    const css = (sel: string, prop: string) => getComputedStyle(document.querySelector(sel)!).getPropertyValue(prop);
    return {
      solde: css('.solde-montant', 'color'),
      iconeSortie: css('.operation-icone.sens-sortie', 'background-color'),
      montantSortie: css('.montant-moins', 'color'),
    };
  });
  expect(couleurs).toEqual({ solde: 'rgb(24, 122, 41)', iconeSortie: 'rgb(255, 0, 0)', montantSortie: 'rgb(217, 0, 0)' });

  // « À venir » : une bulle qui ouvre son propre onglet
  await page.getByRole('tab', { name: /^À venir/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Titres-restaurant');
  await expect(page.getByLabel('Rechercher une opération')).toBeHidden();
  expect(await problemesDeMiseEnPage(page)).toEqual([]);
  expect(erreurs).toEqual([]);
});
