import { expect, type Page } from '@playwright/test';

/*
 * Aides pour les tests navigateur (Playwright), tirées de SoldeClair.
 * À copier dans e2e/outils.ts et à adapter (date, clés de stockage, éléments différés).
 */

/** Date fixe : les calculs et les captures restent identiques d'un jour à l'autre. */
export const AUJOURDHUI = new Date('2026-11-12T10:00:00');

/** Texte normalisé (espaces insécables et multiples). */
export const norm = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Libellé tel qu'affiché (espace insécable avant « ? ! : ; » et dans les guillemets). */
export const t = (s: string) => s.replace(/ ([:;!?»])/g, ' $1').replace(/« /g, '« ');

/** Prépare la page : date fixe, collecte des erreurs de la console, éléments différés désactivés. */
export async function preparer(page: Page): Promise<string[]> {
  const erreurs: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') erreurs.push(m.text());
  });
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.clock.setFixedTime(AUJOURDHUI);
  // Exemple : les astuces qui apparaissent après un délai faussent les mesures et l'analyse axe.
  // await page.addInitScript(() => localStorage.setItem('monsite:astuces:v1', JSON.stringify({ desactivees: true })));
  return erreurs;
}

/** Requêtes vers un autre site que le site testé (doit rester vide : aucun service externe). */
export function surveillerRequetes(page: Page): string[] {
  const externes: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && !u.protocol.startsWith('data') && !u.protocol.startsWith('blob'))
      externes.push(r.url());
  });
  return externes;
}

export async function aller(page: Page, route: string) {
  await page.goto(`./#/${route}`);
  await page.waitForTimeout(100);
  await finAnimations(page);
}

/** Attend la fin des animations d'entrée avant de mesurer ou d'analyser. */
export async function finAnimations(page: Page) {
  await page.waitForFunction(
    () =>
      document.getAnimations().every((a) => a.playState !== 'running' || (a.effect?.getTiming().iterations ?? 1) === Infinity) &&
      !document.querySelector('[data-anime]'),
    undefined,
    { timeout: 5000 },
  );
}

/** Tout pictogramme emoji dans le texte visible. */
export const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu;

export async function sansEmoji(page: Page) {
  const texte = await page.locator('body').innerText();
  expect(texte.match(EMOJI) ?? [], 'emoji visible').toEqual([]);
}

/** Défauts d'affichage : débordement horizontal, texte hors écran ou coupé. */
export async function problemesDeMiseEnPage(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw) out.push(`débordement horizontal de ${document.documentElement.scrollWidth - vw}px`);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const cs = getComputedStyle(el);
      // Les zones à défilement horizontal voulu (galeries, tableaux) ne comptent pas
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('.sr-only, svg, .defilement-horizontal')) continue;
      const texte = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim());
      if (!texte) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 1 && r.height <= 1) continue; // texte réservé aux lecteurs d'écran
      if (r.width && r.right > vw + 1 && cs.position !== 'fixed') out.push(`texte hors écran : « ${el.textContent?.trim().slice(0, 40)} »`);
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1 && cs.overflowX !== 'visible')
        out.push(`texte coupé : « ${el.textContent?.trim().slice(0, 40)} »`);
    }
    return Array.from(new Set(out));
  });
}

/** Deux boîtes se chevauchent-elles ? (champs de formulaire, bouton flottant et contenu…) */
export const chevauche = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
