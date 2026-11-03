import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { chargerDemo, preparer, problemesDeMiseEnPage } from './outils';

/** Libellé tel qu'affiché (espace insécable avant « ? »). */
const t = (s: string) => s.replace(/ ([:;!?»])/g, ' $1').replace(/« /g, '« ');
const LARGEURS = [1440, 1100, 800, 520, 390, 320];

/** Toutes les requêtes doivent rester sur le site (aucun service externe, aucune IA en ligne). */
function surveillerRequetes(page: Page): string[] {
  const externes: string[] = [];
  const origine = new URL(test.info().project.use.baseURL ?? 'http://localhost:4173/').origin;
  page.on('request', (r) => {
    const url = r.url();
    if (url.startsWith('data:') || url.startsWith('blob:')) return;
    if (new URL(url).origin !== origine) externes.push(url);
  });
  return externes;
}

const chevauche = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const largeur of LARGEURS) {
  for (const theme of ['light', 'dark'] as const) {
    test(`Poksy ${largeur} px, mode ${theme === 'light' ? 'clair' : 'sombre'} : placement, ouverture, accessibilité, aucune erreur`, async ({ page }) => {
      const hauteur = largeur >= 960 ? 900 : largeur >= 600 ? 1024 : 760;
      await page.setViewportSize({ width: largeur, height: hauteur });
      const erreurs = await preparer(page);
      const externes = surveillerRequetes(page);
      await chargerDemo(page);
      if (theme === 'dark') await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));

      // Bouton flottant : visible, dans l'écran, assez grand pour le pouce
      const lanceur = page.getByRole('button', { name: 'Ouvrir l’aide de Poksy' });
      await expect(lanceur).toBeVisible();
      const b = (await lanceur.boundingBox())!;
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.x + b.width).toBeLessThanOrEqual(largeur);
      expect(b.y + b.height).toBeLessThanOrEqual(hauteur);
      if (largeur < 960) {
        // Au-dessus de la barre du bas, sans gêner le bouton central « + »
        const barre = (await page.locator('.bottom-nav').boundingBox())!;
        expect(b.y + b.height).toBeLessThanOrEqual(barre.y);
        const plus = (await page.locator('.bottom-nav').getByRole('button', { name: 'Ajouter une dépense' }).boundingBox())!;
        expect(chevauche(b, plus)).toBe(false);
      } else {
        expect(b.x).toBeGreaterThan(largeur - 120); // en bas à droite
        expect(b.y).toBeGreaterThan(hauteur - 120);
      }
      // Le message de première visite est visible, jamais recouvert (notification, barre du bas, bouton « + »)
      const bienvenue = page.locator('.poksy-bienvenue');
      await expect(bienvenue).toBeVisible();
      const mb = (await bienvenue.boundingBox())!;
      for (const autre of ['.toast', '.bottom-nav', '.poksy-lanceur']) {
        for (const boite of await page.locator(autre).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON())))
          if (boite.width > 0) expect(chevauche(mb, boite), `message de Poksy sous ${autre}`).toBe(false);
      }
      expect(mb.x).toBeGreaterThanOrEqual(0);
      expect(await problemesDeMiseEnPage(page), 'mise en page, Poksy fermé').toEqual([]);

      // Ouverture
      await lanceur.click();
      const fenetre = page.getByRole('dialog', { name: 'Poksy' });
      await expect(fenetre).toBeVisible();
      await expect(fenetre.getByText('Guide SoldeClair')).toBeVisible();
      const f = (await fenetre.boundingBox())!;
      expect(f.x).toBeGreaterThanOrEqual(0);
      expect(f.x + f.width).toBeLessThanOrEqual(largeur + 1);
      expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.y + f.height).toBeLessThanOrEqual(hauteur + 1);
      if (largeur < 600) expect(f.height).toBeGreaterThan(hauteur * 0.7); // panneau sur la majeure partie de l'écran

      // Une question rapide, puis « Voir plus »
      await fenetre.getByRole('button', { name: t('Comment ajuster mon solde ?') }).click();
      await expect(fenetre.getByRole('log')).toContainText('Indiquez le montant réellement affiché par votre banque');
      await fenetre.getByRole('button', { name: 'Voir plus de questions' }).click();
      await expect(fenetre.getByRole('region', { name: 'Confidentialité' })).toBeVisible();
      expect(await problemesDeMiseEnPage(page), 'mise en page, Poksy ouvert').toEqual([]);

      // Accessibilité WCAG 2.2 AA, fenêtre ouverte
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(res.violations.map((v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)).toEqual([]);

      // Fermeture avec Échap : le focus revient sur le bouton
      await fenetre.getByRole('button', { name: 'Voir moins de questions' }).focus();
      await page.keyboard.press('Escape');
      await expect(fenetre).toBeHidden();
      await expect(lanceur).toBeFocused();

      expect(erreurs, 'erreurs dans la console').toEqual([]);
      expect(externes, 'requêtes vers un autre site').toEqual([]);
    });
  }
}

test('Poksy au clavier : ouverture, question écrite, sans résultat, bouton d’action, fermeture', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const erreurs = await preparer(page);
  const externes = surveillerRequetes(page);
  await chargerDemo(page);
  const avant = await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1'));

  await page.getByRole('button', { name: 'Ouvrir l’aide de Poksy' }).focus();
  await page.keyboard.press('Enter');
  const fenetre = page.getByRole('dialog', { name: 'Poksy' });
  await expect(fenetre).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(fenetre.getByRole('button', { name: 'Fermer Poksy' })).toBeFocused();
  // Focus visible
  const contour = await fenetre.getByRole('button', { name: 'Fermer Poksy' }).evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(contour).not.toBe('none');

  const champ = fenetre.getByLabel('Votre question pour Poksy');
  await champ.fill('carte restaurant');
  await page.keyboard.press('Enter');
  await expect(fenetre.getByRole('log')).toContainText('La carte restaurant a son propre solde');
  await champ.fill('quelle météo demain');
  await page.keyboard.press('Enter');
  await expect(fenetre.getByRole('log')).toContainText('Je n’ai pas encore trouvé la réponse exacte.');

  // Bouton d'action : ouvre le formulaire, n'enregistre rien
  await champ.fill('dépense');
  await page.keyboard.press('Enter');
  await fenetre.locator('.poksy-message-poksy').last().getByRole('button', { name: 'Ajouter une dépense' }).click();
  await expect(page.getByRole('dialog', { name: 'Nouvelle dépense' })).toBeVisible();
  await expect(fenetre).toBeHidden();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => localStorage.getItem('soldeclair:donnees:v1'))).toBe(avant);

  // « Ajuster mon solde » : la page « Mon compte » et sa fenêtre d'ajustement
  await page.getByRole('button', { name: 'Ouvrir l’aide de Poksy' }).click();
  await fenetre.getByRole('button', { name: t('Comment ajuster mon solde ?') }).click();
  await fenetre.locator('.poksy-message-poksy').last().getByRole('button', { name: 'Ajuster mon solde' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mon compte' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Ajuster le solde' })).toBeVisible();

  expect(erreurs).toEqual([]);
  expect(externes).toEqual([]);
});

test('Poksy : message de première visite affiché une seule fois', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await preparer(page);
  await chargerDemo(page);
  const message = page.getByText(/Une question sur SoldeClair/);
  await expect(message).toBeVisible();
  await page.getByRole('button', { name: 'Fermer le message de Poksy' }).click();
  await expect(message).toBeHidden();
  await page.reload();
  await expect(page.getByRole('heading', { name: /^Bonjour / })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ouvrir l’aide de Poksy' })).toBeVisible();
  await expect(message).toBeHidden();
});

test('Poksy : questions adaptées à la page « Mon compte »', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await preparer(page);
  await chargerDemo(page);
  await page.goto('./#/compte');
  await page.getByRole('button', { name: 'Ouvrir l’aide de Poksy' }).click();
  const groupe = page.getByRole('dialog', { name: 'Poksy' }).getByRole('region', { name: 'Sur cette page' });
  await expect(groupe.getByRole('button')).toHaveText([
    t('Comment ajuster mon solde ?'),
    t('Pourquoi mon solde est-il différent ?'),
    t('Pourquoi la carte restaurant est-elle séparée ?'),
  ]);
});
