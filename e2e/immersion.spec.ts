import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { activerAstuces, aller, chargerDemo, EMOJI, finAnimations, PAGES, preparer, problemesDeMiseEnPage } from './outils';

/* Série 9 : interface vivante (Poksy, micro-interactions, page d'accueil narrative), sans emoji ni mouvement imposé. */

test('aucun emoji dans l’interface : présentation, toutes les pages, Poksy ouvert', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparer(page);
  await page.goto('./');
  await finAnimations(page);
  const textes: string[] = [await page.evaluate(() => document.body.innerText)];
  await chargerDemo(page, 'alternant');
  for (const [route] of [...PAGES, ['plan', '']]) {
    await aller(page, route);
    textes.push(await page.evaluate(() => document.body.innerText));
  }
  await page.getByRole('button', { name: 'Ouvrir l’aide de Poksy' }).click();
  const fenetre = page.getByRole('dialog', { name: 'Poksy' });
  await fenetre.getByRole('button', { name: 'Plus de questions' }).click();
  textes.push(await fenetre.innerText());
  const trouves = textes.flatMap((t) => t.match(EMOJI) ?? []);
  expect(trouves).toEqual([]);
  // Pseudo-éléments CSS (::before / ::after) : aucun emoji non plus
  const pseudo = await page.evaluate(() => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('*'))) {
      for (const p of ['::before', '::after']) {
        const c = getComputedStyle(el, p).content;
        if (c && c !== 'none' && c !== 'normal' && c !== '""') out.push(c);
      }
    }
    return out;
  });
  expect(pseudo.join(' ').match(EMOJI) ?? []).toEqual([]);
});

test('Poksy : carte d’accueil visible et personnalisée, puis astuce de page une seule fois', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await activerAstuces(page);
  await preparer(page);
  await chargerDemo(page, 'alternant');
  const carte = page.getByRole('complementary', { name: 'Message de Poksy' });
  await expect(carte).toBeVisible();
  await expect(carte).toContainText('Bonjour Hugo, je suis Poksy.');
  await expect(carte.locator('img')).toHaveAttribute('alt', '');
  const b = (await carte.boundingBox())!;
  expect(b.width).toBeGreaterThan(300); // bien présente
  expect(b.height).toBeLessThan(844 * 0.45); // sans envahir l'écran
  await carte.getByRole('button', { name: 'Plus tard' }).click();
  await expect(carte).toBeHidden();

  // Astuce sur « Mon plan » : après un court délai, une seule fois
  await page.goto('./#/plan');
  const astuce = page.getByRole('complementary', { name: 'Astuce de Poksy' });
  await expect(astuce).toBeVisible({ timeout: 5000 });
  await astuce.getByRole('button', { name: 'Voir la réponse' }).click();
  const fenetre = page.getByRole('dialog', { name: 'Poksy' });
  await expect(fenetre.getByRole('log')).toContainText('épargne totale');
  await page.keyboard.press('Escape');
  await page.goto('./#/compte');
  await page.goto('./#/plan');
  await page.waitForTimeout(2500);
  await expect(astuce).toBeHidden();
});

test('la carte de Poksy s’efface quand on fait défiler la page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await preparer(page);
  await page.goto('./');
  const carte = page.getByRole('complementary', { name: 'Message de Poksy' });
  await expect(carte).toBeVisible();
  await page.mouse.wheel(0, 900);
  await expect(carte).toBeHidden();
});

test('présentation : démonstrations interactives au clavier et à la souris', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const erreurs = await preparer(page);
  await page.goto('./');
  await finAnimations(page);
  await page.getByRole('button', { name: 'Fermer le message de Poksy' }).click();

  // Reste à vivre : la démonstration se joue quand elle devient visible, puis peut être rejouée
  const demo = page.getByRole('group', { name: /le reste à vivre se met à jour/ });
  await demo.scrollIntoViewIfNeeded();
  await expect(demo.getByText('Cinéma')).toBeVisible({ timeout: 8000 });
  await expect(demo).toContainText('401,60');
  await expect(demo.getByRole('button', { name: 'Rejouer' })).toBeVisible();

  // Simulateur : le curseur change le verdict, annoncé par une icône et un texte
  const curseur = page.getByLabel('Prix de l’achat en euros');
  await curseur.fill('30');
  await expect(page.getByText('Situation confortable')).toBeVisible();
  await curseur.fill('300');
  await expect(page.getByText('Achat possible avec prudence')).toBeVisible();
  await curseur.fill('500');
  await expect(page.getByText('Achat susceptible de déséquilibrer le budget')).toBeVisible();

  // Galerie : flèches et région défilable au clavier
  const piste = page.getByRole('region', { name: /Écrans de SoldeClair/ });
  await expect(page.getByRole('button', { name: 'Écran précédent' })).toBeDisabled();
  await page.getByRole('button', { name: 'Écran suivant' }).click();
  await expect.poll(() => piste.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);

  // Profils : onglets accessibles (flèches du clavier)
  const onglets = page.getByRole('tablist', { name: 'Choisis une situation' });
  await onglets.getByRole('tab', { name: 'Étudiant(e)' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(onglets.getByRole('tab', { name: 'Alternant(e)' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('fin du contrat');

  // Poksy depuis la présentation
  await page.getByRole('button', { name: 'Poser une question à Poksy' }).click();
  await expect(page.getByRole('dialog', { name: 'Poksy' })).toBeVisible();
  expect(erreurs).toEqual([]);
});

for (const mode of ['systeme', 'parametre'] as const) {
  test(`moins d’animations (${mode === 'systeme' ? 'réglage de l’appareil' : 'choix dans les paramètres'}) : aucune animation, tout reste affiché`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (mode === 'systeme') await page.emulateMedia({ reducedMotion: 'reduce' });
    await preparer(page);
    await chargerDemo(page, 'alternant');
    if (mode === 'parametre') {
      await aller(page, 'parametres');
      await page.getByRole('group', { name: 'Animations' }).getByLabel('Animations réduites').check();
      expect(await page.evaluate(() => document.documentElement.dataset.mouvement)).toBe('reduit');
    }
    for (const route of ['', 'plan', 'objectifs']) {
      await page.goto(`./#/${route}`);
      await page.waitForTimeout(50);
      const enCours = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
      expect(enCours, `animations sur « ${route || 'accueil'} »`).toBe(0);
    }
    // Présentation : rien n'est caché en attendant une apparition, la démonstration affiche son état final
    await page.goto('./#/presentation');
    await page.waitForTimeout(50);
    const caches = await page.evaluate(
      () => Array.from(document.querySelectorAll('.accueil-section')).filter((s) => getComputedStyle(s).opacity !== '1').length,
    );
    expect(caches).toBe(0);
    const demo = page.getByRole('group', { name: /le reste à vivre se met à jour/ });
    await demo.scrollIntoViewIfNeeded();
    await expect(demo).toContainText('401,60');
    if (mode === 'parametre') {
      // Le choix est mémorisé sur l'appareil
      await page.reload();
      expect(await page.evaluate(() => document.documentElement.dataset.mouvement)).toBe('reduit');
    }
  });
}

test('présentation immersive : mise en page et accessibilité à 320, 390, 800 et 1440 px', async ({ page }) => {
  const erreurs = await preparer(page);
  for (const largeur of [320, 390, 800, 1440]) {
    await page.setViewportSize({ width: largeur, height: largeur >= 900 ? 900 : 800 });
    await page.goto('./');
    await finAnimations(page);
    // Faire défiler toute la page pour déclencher les apparitions
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 300) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
      }
    });
    await page.waitForTimeout(700);
    await finAnimations(page);
    expect(await problemesDeMiseEnPage(page), `mise en page à ${largeur} px`).toEqual([]);
    if (largeur === 390 || largeur === 1440) {
      const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      expect(res.violations.map((v) => `${v.id} : ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`)).toEqual([]);
    }
  }
  expect(erreurs).toEqual([]);
});

test('interactivité : montants rapides, élément récent, annuler une suppression, budgets dépliables, par semaine', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const erreurs = await preparer(page);
  await chargerDemo(page, 'etudiant');
  // Par jour / par semaine
  await page.getByRole('button', { name: 'Par semaine' }).click();
  await expect(page.locator('.hero-text')).toContainText('par semaine');
  // Montants rapides : 10 + 5 = 15 €
  await page.locator('.bottom-nav').getByRole('button', { name: 'Ajouter une dépense' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ajouter' });
  await dialog.getByRole('button', { name: /^Ajouter 10/ }).click();
  await dialog.getByRole('button', { name: /^Ajouter 5,00/ }).click();
  await expect(dialog.getByLabel(/^Montant/)).toHaveValue('15,00');
  await dialog.getByLabel('Description').fill('Test rapide');
  await dialog.getByRole('button', { name: 'Ajouter la dépense' }).click();
  // L'élément ajouté est mis en valeur dans la liste
  await page.goto('./#/depenses');
  const ligne = page.locator('.item', { hasText: 'Test rapide' });
  await expect(ligne).toBeVisible();
  // Suppression, puis « Annuler » la restaure
  await ligne.getByRole('button', { name: /Supprimer/ }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: /Supprimer|Confirmer/ })
    .click();
  await expect(ligne).toBeHidden();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(ligne).toBeVisible();
  await expect(ligne).toHaveClass(/item-recent/);
  // Budgets : les dépenses de la catégorie se déplient dans la carte
  await page.goto('./#/budgets');
  const detail = page.locator('.budget-detail').first();
  await detail.locator('summary').click();
  await expect(detail.getByRole('link', { name: /Voir/ })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('configuration, étape des revenus : aucun champ ne se chevauche (320 à 1440 px)', async ({ page }) => {
  await preparer(page);
  for (const largeur of [320, 390, 760, 900, 1440]) {
    await page.setViewportSize({ width: largeur, height: 1000 });
    await page.goto('./#/bienvenue');
    await page.reload();
    await page.getByLabel('Prénom ou pseudonyme').fill('Sam');
    await page.getByRole('button', { name: /Continuer/ }).click();
    await page.getByRole('button', { name: 'Ajouter un revenu complémentaire' }).click();
    await finAnimations(page);
    const chevauchements = await page.evaluate(() => {
      const out: string[] = [];
      for (const ligne of Array.from(document.querySelectorAll('.line-row'))) {
        const els = Array.from(ligne.querySelectorAll('label, input, select, button'))
          .map((e) => ({ t: (e.textContent || (e as HTMLInputElement).name || e.tagName).trim().slice(0, 20), r: e.getBoundingClientRect() }))
          .filter((x) => x.r.width > 0);
        for (let i = 0; i < els.length; i++)
          for (let j = i + 1; j < els.length; j++) {
            const a = els[i].r;
            const b = els[j].r;
            if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) out.push(`${els[i].t} / ${els[j].t}`);
          }
      }
      return out;
    });
    expect(chevauchements, `chevauchements à ${largeur} px`).toEqual([]);
    expect(await problemesDeMiseEnPage(page), `mise en page à ${largeur} px`).toEqual([]);
  }
});
