import { expect, type Page } from '@playwright/test';

/** Date simulée : 12 novembre 2026 (19 jours restants, aujourd'hui inclus). */
export const AUJOURDHUI = new Date('2026-11-12T10:00:00');

export const PAGES: [string, string][] = [
  ['', 'Tableau de bord'],
  ['compte', 'Mon compte'],
  ['compte?vue=a-venir', 'Mon compte, à venir'],
  ['depenses', 'Dépenses'],
  ['revenus', 'Revenus'],
  ['charges', 'Charges fixes'],
  ['budgets', 'Budgets'],
  ['plan', 'Mon plan d’épargne'],
  ['objectifs', 'Objectifs'],
  ['simulateur', 'Simulateur'],
  ['historique', 'Historique'],
  ['historique?vue=bilan', 'Bilan'],
  ['parametres', 'Paramètres'],
];

export const norm = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Prépare la page : date fixe et collecte des erreurs de la console. */
export async function preparer(page: Page): Promise<string[]> {
  const erreurs: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erreurs.push(m.text());
  });
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.clock.setFixedTime(AUJOURDHUI);
  // Les astuces de Poksy apparaissent après un délai : désactivées par défaut pour des mesures stables
  // (le test qui les vérifie les réactive avec activerAstuces).
  await page.addInitScript(() => {
    if (!(window as unknown as { __astuces?: boolean }).__astuces)
      localStorage.setItem('soldeclair:poksy-astuces:v1', JSON.stringify({ vues: [], desactivees: true }));
  });
  return erreurs;
}

export async function chargerDemo(page: Page, profil: 'etudiant' | 'alternant' | 'salarie' = 'salarie') {
  await page.goto('./#/bienvenue');
  await page.getByLabel('Profil de démonstration').selectOption(profil);
  await page.getByRole('button', { name: 'Charger la démonstration' }).click();
  await expect(page.getByRole('heading', { name: /^Bonjour / })).toBeVisible();
  await finAnimations(page);
}

export async function aller(page: Page, route: string) {
  await page.goto(`./#/${route}`);
  await page.waitForTimeout(100);
  await finAnimations(page);
}

/** Attend la fin des animations d'entrée (blocs de page, fenêtres) avant de mesurer ou d'analyser. */
export async function finAnimations(page: Page) {
  await page.waitForFunction(
    () =>
      document.getAnimations().every((a) => a.playState !== 'running' || (a.effect?.getTiming().iterations ?? 1) === Infinity) &&
      !document.querySelector('[data-anime]'),
    undefined,
    { timeout: 5000 },
  );
}

/** Réactive les astuces de Poksy (à appeler juste après preparer). */
export async function activerAstuces(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __astuces?: boolean }).__astuces = true;
  });
}

/** Tout pictogramme emoji visible dans le texte de la page. */
export const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;

export async function stat(page: Page, libelle: string) {
  const carte = page.locator('.stat').filter({ has: page.locator('.stat-label', { hasText: new RegExp(`^${libelle}$`) }) });
  // textContent : le chiffre peut se trouver dans « Détail du mois », replié par défaut
  return norm(await carte.locator('.stat-value').textContent());
}

/** Débordements horizontaux et textes sortant de l'écran. */
export async function problemesDeMiseEnPage(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw) out.push(`débordement horizontal de ${document.documentElement.scrollWidth - vw}px`);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const cs = getComputedStyle(el);
      // Les zones à défilement horizontal voulu (galerie d'écrans, tableaux) ne comptent pas comme un débordement
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.sr-only, svg, .galerie-piste')) continue;
      const texte = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (!texte) continue;
      const r = el.getBoundingClientRect();
      // Texte masqué visuellement pour les lecteurs d'écran (1 × 1 px) : pas un défaut d'affichage
      if (r.width <= 1 && r.height <= 1) continue;
      if (r.width && r.right > vw + 1 && cs.position !== 'fixed') out.push(`texte hors écran : « ${el.textContent?.trim().slice(0, 40)} »`);
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible')
        out.push(`texte coupé : « ${el.textContent?.trim().slice(0, 40)} »`);
    }
    return Array.from(new Set(out));
  });
}
