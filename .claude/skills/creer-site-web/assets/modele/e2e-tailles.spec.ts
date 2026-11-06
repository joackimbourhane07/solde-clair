import { test, expect, type Page } from '@playwright/test';
import { aller, finAnimations, preparer, problemesDeMiseEnPage } from './outils';

/*
 * Modèle : 11 tailles d'écran, barre du bas stable, fenêtre d'ajout centrée et accessible, page d'accueil
 * centrée après rotation. Adapter : ROUTES, noms des boutons, titre de la fenêtre, sélecteurs.
 */

const TAILLES: [number, number][] = [
  [320, 568],
  [360, 800],
  [375, 667],
  [390, 844],
  [393, 873],
  [412, 915],
  [430, 932],
  [568, 320], // paysage
  [844, 390], // paysage
  [768, 1024], // tablette
  [1440, 900], // ordinateur
];

const ROUTES = ['', 'page-1', 'page-2']; // à adapter
const NOM_BOUTON_AJOUT = 'Ajouter'; // nom accessible du bouton « + »
const TITRE_FENETRE = 'Ajouter';

const boutonAjouter = (page: Page, largeur: number) =>
  largeur >= 960
    ? page.locator('.sidebar').getByRole('button', { name: NOM_BOUTON_AJOUT })
    : page.locator('.bottom-nav').getByRole('button', { name: NOM_BOUTON_AJOUT });

for (const [largeur, hauteur] of TAILLES) {
  test(`${largeur} × ${hauteur} : pages, barre du bas fixe, fenêtre d'ajout centrée`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    const erreurs = await preparer(page);
    // Préparer ici des données fictives (profil de démonstration)

    for (const route of ROUTES) {
      await aller(page, route);
      expect(await problemesDeMiseEnPage(page), `mise en page de /${route}`).toEqual([]);
    }

    // La barre du bas reste collée en bas pendant le défilement
    const barre = page.locator('.bottom-nav');
    if (await barre.isVisible()) {
      const avant = (await barre.boundingBox())!;
      expect(Math.round(avant.y + avant.height)).toBe(hauteur);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(250);
      expect((await barre.boundingBox())!.y).toBe(avant.y);
    }

    // Fenêtre : dans l'écran, centrée, fond inerte, défilement et focus rendus
    await page.evaluate(() => window.scrollTo(0, 200));
    const yAvant = await page.evaluate(() => window.scrollY);
    await boutonAjouter(page, largeur).click();
    const fenetre = page.getByRole('dialog', { name: TITRE_FENETRE });
    await expect(fenetre).toBeVisible();
    await finAnimations(page);
    const f = (await fenetre.boundingBox())!;
    expect(f.x).toBeGreaterThanOrEqual(0);
    expect(f.y).toBeGreaterThanOrEqual(0);
    expect(f.x + f.width).toBeLessThanOrEqual(largeur + 1);
    expect(f.y + f.height).toBeLessThanOrEqual(hauteur + 1);
    expect(Math.abs(f.x - (largeur - f.x - f.width))).toBeLessThanOrEqual(2);
    expect(await page.locator('#root').getAttribute('inert')).not.toBeNull();
    await page.keyboard.press('Escape');
    await expect(fenetre).toBeHidden();
    await expect(boutonAjouter(page, largeur)).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(yAvant);
    expect(await page.locator('#root').getAttribute('inert')).toBeNull();

    expect(erreurs).toEqual([]);
  });

  test(`${largeur} × ${hauteur} : page d'accueil centrée`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: hauteur });
    await preparer(page);
    await page.goto('./#/presentation'); // adresse de la page d'accueil
    const titre = page.getByRole('heading', { level: 1 });
    await expect(titre).toBeVisible();
    const b = (await titre.boundingBox())!;
    expect(Math.abs(b.x - (largeur - b.x - b.width))).toBeLessThanOrEqual(2);
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
    const b = (await titre.boundingBox())!;
    expect(Math.abs(b.x - (l - b.x - b.width))).toBeLessThanOrEqual(2);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  }
});
