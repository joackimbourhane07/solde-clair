import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { aller, chargerDemo, PAGES, preparer, problemesDeMiseEnPage } from './outils';

const FORMATS = [
  { nom: 'petit mobile', viewport: { width: 320, height: 640 }, axe: false },
  { nom: 'mobile', viewport: { width: 375, height: 812 }, axe: true },
  { nom: 'tablette', viewport: { width: 768, height: 1024 }, axe: false },
  { nom: 'ordinateur', viewport: { width: 1366, height: 900 }, axe: true },
];

for (const format of FORMATS) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${format.nom}, mode ${theme === 'light' ? 'clair' : 'sombre'} : aucune erreur, aucun débordement${format.axe ? ', accessibilité WCAG AA' : ''}`, async ({ page }) => {
      await page.setViewportSize(format.viewport);
      await page.emulateMedia({ colorScheme: theme });
      const erreurs = await preparer(page);
      await chargerDemo(page);
      for (const [route, nom] of PAGES) {
        await aller(page, route);
        expect(await problemesDeMiseEnPage(page), `Mise en page de « ${nom} »`).toEqual([]);
        if (format.axe) {
          const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
          expect(res.violations.map((v) => `${v.id} : ${v.help}`), `Accessibilité de « ${nom} »`).toEqual([]);
        }
      }
      expect(erreurs, 'Erreurs dans la console').toEqual([]);
    });
  }
}

test('petit écran : onglets sans mot coupé, bilan et formulaire rapide lisibles', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await preparer(page);
  await chargerDemo(page);
  // Formulaire rapide : un champ par ligne pour que la date reste entière
  const colonnes = await page.locator('.form-quick .form-row').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(colonnes).toBe(1);
  // Onglets des catégories : chaque mot tient sur une ligne
  await aller(page, 'parametres');
  const coupes = await page.locator('.tab').evaluateAll((tabs) =>
    tabs
      .filter((t) => {
        const r = document.createRange();
        r.selectNodeContents(t);
        return r.getClientRects().length > (t.textContent ?? '').trim().split(/\s+/).length;
      })
      .map((t) => t.textContent),
  );
  expect(coupes).toEqual([]);
  // Bilan : le tableau tient dans la carte, l'évolution reste visible
  await aller(page, 'historique?vue=bilan');
  const zone = page.getByRole('region', { name: /^Bilan / });
  expect(await zone.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  await expect(page.getByRole('row', { name: /Dépenses variables/ }).locator('.delta-mobile')).toBeVisible();
});

test('configuration sur mobile : chaque montant du récapitulatif tient sur une ligne', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await preparer(page);
  await page.goto('./');
  await page.getByLabel('Prénom ou pseudonyme').fill('Test');
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByLabel('Montant mensuel').nth(0).fill('1 250,00');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByLabel('Estimation de vos dépenses variables par mois').fill('1 250,00');
  await page.getByLabel('Objectif d’épargne mensuel').fill('250');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: /Continuer/ }).click();
  await expect(page.getByRole('heading', { name: 'Tout est prêt !' })).toBeVisible();
  // Montants dont le texte s'étale sur plusieurs lignes (ex. « − » seul sur la première)
  const coupes = await page.locator('.recap dd').evaluateAll((dds) =>
    dds
      .filter((dd) => {
        const r = document.createRange();
        r.selectNodeContents(dd);
        const tops = new Set(Array.from(r.getClientRects()).map((x) => Math.round(x.top)));
        return tops.size > 1;
      })
      .map((dd) => dd.textContent),
  );
  expect(coupes).toEqual([]);
});

test('clavier : lien d’évitement en premier, contour de focus visible, fenêtre accessible', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await preparer(page);
  await chargerDemo(page);
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('Aller au contenu');
  await page.keyboard.press('Enter');
  await expect(page.locator(':focus')).toHaveAttribute('id', 'contenu');

  // Chaque élément atteint au clavier a un contour visible (y compris le bouton calendrier des dates)
  const sansContour: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      const cs = getComputedStyle(a);
      return { nom: (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().slice(0, 30), ok: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, fin: a === document.body };
    });
    if (info.fin) break;
    if (!info.ok) sansContour.push(info.nom);
  }
  expect(sansContour).toEqual([]);

  // Fenêtre : ouverte au clavier, focus piégé, Échap rend le focus
  await aller(page, 'depenses');
  await page.locator('main').getByRole('button', { name: 'Ajouter une dépense' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator(':focus')).toHaveText('Ajouter une dépense');
});

test('thèmes : sombre par défaut, automatique, clair', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await preparer(page);
  await chargerDemo(page);
  const fond = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const SOMBRE = 'rgb(7, 9, 14)';
  const CLAIR = 'rgb(243, 244, 247)';
  // Identité « Financial » : sombre par défaut, même si l'appareil est en clair
  expect(await fond()).toBe(SOMBRE);
  await aller(page, 'parametres');
  await page.getByLabel('Comme mon appareil').check();
  expect(await fond()).toBe(CLAIR);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await fond()).toBe(SOMBRE);
  await page.getByLabel('Mode clair').check();
  expect(await fond()).toBe(CLAIR);
  await page.reload();
  expect(await fond()).toBe(CLAIR);
  await page.getByLabel('Mode sombre').check();
  expect(await fond()).toBe(SOMBRE);
});

test('polices IBM Plex chargées localement, aucune requête externe', async ({ page }) => {
  const externes: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://localhost:4173')) externes.push(r.url());
  });
  await preparer(page);
  await chargerDemo(page);
  await page.evaluate(() => document.fonts.ready);
  const polices = await page.evaluate(() => [
    document.fonts.check('500 16px "Financial Plex Sans"'),
    document.fonts.check('500 16px "Financial Plex Mono"'),
  ]);
  expect(polices).toEqual([true, true]);
  expect(await page.locator('.stat-value').first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Financial Plex Mono');
  expect(externes).toEqual([]);
});

test('mouvement réduit : aucune transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await preparer(page);
  await chargerDemo(page);
  const durees = await page.evaluate(() =>
    ['.btn', '.nav-link', '.input'].map((sel) => getComputedStyle(document.querySelector(sel)!).transitionDuration),
  );
  expect(durees.every((d) => d.split(',').every((x) => parseFloat(x) === 0))).toBe(true);
});
