import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { aller, chargerDemo, EMOJI, finAnimations, PAGES, preparer, problemesDeMiseEnPage } from './outils';

/*
 * « Vérification des décisions précédentes » : ce que l'utilisatrice a demandé de retirer ou d'éviter ne revient pas.
 * Parcours de toutes les pages avec les trois profils de démonstration.
 */

const VOUVOIEMENT = /\b(vous|votre|vos|Vous|Votre|Vos)\b/;

for (const profil of ['etudiant', 'alternant', 'salarie'] as const) {
  test(`décisions respectées sur toutes les pages (${profil})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const erreurs = await preparer(page);
    const externes: string[] = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (!['localhost', '127.0.0.1'].includes(u.hostname) && !['data:', 'blob:'].includes(u.protocol)) externes.push(r.url());
    });
    await chargerDemo(page, profil);
    for (const [route, nom] of PAGES) {
      await aller(page, route);
      const texte = await page.locator('body').innerText();
      expect(texte.match(EMOJI) ?? [], `emoji sur ${nom}`).toEqual([]);
      expect(texte.includes('·'), `point médian sur ${nom}`).toBe(false);
      expect(texte.match(VOUVOIEMENT)?.[0] ?? null, `vouvoiement sur ${nom}`).toBeNull();
      // Aucune donnée sensible demandée (mot de passe, code, carte)
      expect(await page.locator('input[type="password"], input[autocomplete="cc-number"]').count(), `champ sensible sur ${nom}`).toBe(0);
      expect(await problemesDeMiseEnPage(page), `mise en page de ${nom}`).toEqual([]);
    }
    expect(erreurs).toEqual([]);
    expect(externes).toEqual([]);
  });
}

test('accueil : peu de blocs à la fois, une seule action « À faire » visible, un seul graphique', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparer(page);
  await chargerDemo(page, 'etudiant');
  await finAnimations(page);
  const carte = page.locator('.actions-card');
  await expect(carte.locator(':scope .actions-list').first().locator('> li')).toHaveCount(1);
  // Un seul graphique visible d'emblée (le reste dans « Détail du mois »)
  const graphiquesVisibles = await page.locator('main figure:visible, main .chart:visible').count();
  expect(graphiquesVisibles).toBeLessThanOrEqual(1);
  // Pas de doublon : l'objectif principal n'est pas répété dans « Épargne du mois »
  const titrePlan = await page.locator('#carte-plan-titre').textContent();
  const nomObjectif = (titrePlan ?? '').replace(/^Mon objectif\s*:\s*/, '').trim();
  if (nomObjectif) await expect(page.locator('.objectifs-mini').getByText(nomObjectif, { exact: true })).toHaveCount(0);
});

test('nouveautés accessibles (WCAG 2.2 AA) : ajout express, Demander à Poksy, budgets, simulateur', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparer(page);
  await chargerDemo(page, 'salarie');
  const axe = async (quoi: string) => {
    await finAnimations(page);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect(
      r.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
      quoi,
    ).toEqual([]);
  };
  // Accueil, calcul déplié avec « Demander à Poksy »
  await page.getByText('Comment est-ce calculé ?').first().click();
  await expect(page.locator('.hero').getByRole('button', { name: 'Demander à Poksy' })).toBeVisible();
  await axe('accueil');
  // Fenêtre d'ajout avec « Refaire »
  await page.locator('.bottom-nav').getByRole('button', { name: 'Ajouter une dépense' }).click();
  const fenetre = page.getByRole('dialog', { name: 'Ajouter' });
  await expect(fenetre.getByRole('group', { name: 'Refaire une dépense récente' })).toBeVisible();
  await axe('fenêtre d’ajout');
  await page.keyboard.press('Escape');
  // Budgets (reste par jour) et simulateur (ajout prérempli)
  await aller(page, 'budgets');
  await axe('budgets');
  await aller(page, 'simulateur');
  await page.getByLabel('Montant de l’achat').fill('30');
  await page.getByRole('button', { name: 'Ajouter cette dépense' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajouter' }).getByLabel('Montant', { exact: true })).toHaveValue('30,00');
  await axe('simulateur, ajout prérempli');
});

test('Demander à Poksy : la réponse s’affiche sous la question, la page ne défile pas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparer(page);
  await chargerDemo(page, 'salarie');
  await page.getByText('Comment est-ce calculé ?').first().click();
  // Le clic de l'outil de test peut faire défiler pour atteindre le bouton : on mesure juste après le clic,
  // puis on vérifie que la réponse de Poksy ne fait pas bouger la page.
  await page.locator('.hero').getByRole('button', { name: 'Demander à Poksy' }).click();
  const y = await page.evaluate(() => window.scrollY);
  const poksy = page.getByRole('dialog', { name: 'Poksy' });
  await expect(poksy.getByRole('log')).toContainText('Ton reste à vivre est le solde');
  await page.waitForTimeout(600);
  const messages = poksy.locator('.poksy-conversation > .poksy-message');
  await expect(messages.last()).toHaveClass(/poksy-message-poksy/);
  await expect(messages.nth((await messages.count()) - 2)).toHaveClass(/poksy-message-vous/);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
});
