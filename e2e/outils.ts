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
  return erreurs;
}

export async function chargerDemo(page: Page, profil: 'etudiant' | 'alternant' | 'salarie' = 'salarie') {
  await page.goto('./#/bienvenue');
  await page.getByLabel('Profil de démonstration').selectOption(profil);
  await page.getByRole('button', { name: 'Charger la démonstration' }).click();
  await expect(page.getByRole('heading', { name: /^Bonjour / })).toBeVisible();
}

export async function aller(page: Page, route: string) {
  await page.goto(`./#/${route}`);
  await page.waitForTimeout(100);
}

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
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.sr-only, svg')) continue;
      const texte = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (!texte) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 1 && cs.position !== 'fixed') out.push(`texte hors écran : « ${el.textContent?.trim().slice(0, 40)} »`);
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible')
        out.push(`texte coupé : « ${el.textContent?.trim().slice(0, 40)} »`);
    }
    return Array.from(new Set(out));
  });
}
