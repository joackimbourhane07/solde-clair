import { test, expect, type Page } from '@playwright/test';
import { aller, chargerDemo, finAnimations, preparer, problemesDeMiseEnPage } from './outils';

/** Tailles demandées : téléphones (portrait et paysage), tablette et ordinateur. */
const TAILLES: [number, number][] = [
  [320, 568],
  [360, 800],
  [375, 667],
  [390, 844],
  [393, 873],
  [412, 915],
  [430, 932],
  [568, 320],
  [844, 390],
  [768, 1024],
  [1440, 900],
];

const boutonAjouter = (page: Page, largeur: number) =>
  largeur >= 960
    ? page.locator('.sidebar').getByRole('button', { name: 'Ajouter une dépense' })
    : page.locator('.bottom-nav').getByRole('button', { name: 'Ajouter une dépense' });

for (const [largeur, hauteur] of TAILLES) {
  test(`${largeur} × ${hauteur} : pages, barre du bas fixe, fenêtre d’ajout centrée`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    const erreurs = await preparer(page);
    await chargerDemo(page, 'etudiant');

    for (const route of ['', 'compte', 'depenses', 'budgets', 'parametres']) {
      await aller(page, route);
      expect(await problemesDeMiseEnPage(page), `mise en page de /${route}`).toEqual([]);
    }

    // La barre du bas reste collée en bas pendant le défilement
    await aller(page, 'depenses');
    const barre = page.locator('.bottom-nav');
    if (await barre.isVisible()) {
      const avant = (await barre.boundingBox())!;
      expect(Math.round(avant.y + avant.height)).toBe(hauteur);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(250);
      const apres = (await barre.boundingBox())!;
      expect(apres.y).toBe(avant.y);
    }

    // Fenêtre d'ajout : dans l'écran, fond inerte, défilement gardé, focus rendu au bouton
    await page.evaluate(() => window.scrollTo(0, 200));
    const yAvant = await page.evaluate(() => window.scrollY);
    await boutonAjouter(page, largeur).click();
    const fenetre = page.getByRole('dialog', { name: 'Ajouter' });
    await expect(fenetre).toBeVisible();
    await finAnimations(page);
    const f = (await fenetre.boundingBox())!;
    expect(f.x).toBeGreaterThanOrEqual(0);
    expect(f.y).toBeGreaterThanOrEqual(0);
    expect(f.x + f.width).toBeLessThanOrEqual(largeur + 1);
    expect(f.y + f.height).toBeLessThanOrEqual(hauteur + 1);
    // Centrée horizontalement
    expect(Math.abs(f.x - (largeur - f.x - f.width))).toBeLessThanOrEqual(2);
    expect(await page.locator('#root').getAttribute('inert')).not.toBeNull();
    // Le bouton de validation reste atteignable (défilement interne)
    await expect(fenetre.getByRole('button', { name: 'Ajouter la dépense' })).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(fenetre).toBeHidden();
    await expect(boutonAjouter(page, largeur)).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(yAvant);
    expect(await page.locator('#root').getAttribute('inert')).toBeNull();

    expect(erreurs).toEqual([]);
  });

  test(`${largeur} × ${hauteur} : page d’accueil centrée`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    await preparer(page);
    await page.goto('./#/presentation');
    const titre = page.getByRole('heading', { level: 1 });
    await expect(titre).toBeVisible();
    const t = (await titre.boundingBox())!;
    expect(Math.abs(t.x - (largeur - t.x - t.width))).toBeLessThanOrEqual(2);
    // Titre et boutons visibles dès l'arrivée
    await expect(page.locator('.accueil-intro .accueil-actions .btn').first()).toBeInViewport();
    expect(await problemesDeMiseEnPage(page)).toEqual([]);
  });
}

test('rotation : la page d’accueil reste centrée, sans décalage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparer(page);
  await page.goto('./#/presentation');
  const titre = page.getByRole('heading', { level: 1 });
  for (const [l, h] of [
    [844, 390],
    [390, 844],
  ]) {
    await page.setViewportSize({ width: l, height: h });
    await page.waitForTimeout(200);
    const t = (await titre.boundingBox())!;
    expect(Math.abs(t.x - (l - t.x - t.width))).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
    await expect(page.locator('.accueil-intro .accueil-actions .btn').first()).toBeInViewport();
  }
});

test('Izly : ajout rapide d’un repas CROUS depuis « + », total du mois et solde Izly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const erreurs = await preparer(page);
  await chargerDemo(page, 'etudiant');
  await page.locator('.bottom-nav').getByRole('button', { name: 'Ajouter une dépense' }).click();
  const fenetre = page.getByRole('dialog', { name: 'Ajouter' });
  await fenetre.getByRole('tab', { name: 'Izly' }).click();
  await expect(fenetre.getByText('Suivi manuel, aucun accès à ton compte Izly.')).toBeVisible();
  await fenetre.getByRole('group', { name: 'Dépense de campus' }).getByRole('button', { name: 'Restaurant CROUS' }).click();
  await fenetre.getByLabel('Montant', { exact: true }).fill('3,30');
  await fenetre.getByRole('button', { name: 'Ajouter la dépense' }).click();
  await expect(fenetre).toBeHidden();

  await aller(page, 'depenses?paiement=izly');
  const carte = page.locator('.carte-izly');
  await expect(carte).toContainText('3,30');
  await expect(carte).toContainText('Suivi manuel, aucun accès à ton compte Izly.');
  await expect(page.getByText('Restaurant CROUS').first()).toBeVisible();
  // Aucun champ ne demande d'identifiant, de code ou de mot de passe Izly
  expect(await page.locator('input[type="password"]').count()).toBe(0);
  expect(erreurs).toEqual([]);
});
