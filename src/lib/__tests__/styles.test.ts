/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Non-régression mobile et identité : règles vérifiées directement dans les feuilles de style. */
// Les tests se lancent depuis la racine du projet
const DOSSIER = resolve(process.cwd(), 'src/styles') + '/';
const feuilles = readdirSync(DOSSIER)
  .filter((f: string) => f.endsWith('.css'))
  .map((f: string) => ({ f, css: readFileSync(DOSSIER + f, 'utf8') }));

/** Blocs « sélecteur { déclarations } » sans les commentaires. */
const blocs = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').match(/[^{}]+\{[^{}]*\}/g) ?? [];

describe('feuilles de style', () => {
  it('les feuilles sont bien lues', () => {
    expect(feuilles.length).toBeGreaterThan(3);
    expect(feuilles.every((x) => x.css.length > 100)).toBe(true);
  });

  it('jamais 100vh seul : toujours un repli dvh ou svh (barres du navigateur mobile)', () => {
    const fautifs = feuilles.flatMap(({ f, css }) =>
      blocs(css)
        .filter((b) => /\b100vh\b/.test(b) && !/\d+(dvh|svh)\b/.test(b))
        .map((b) => `${f} : ${b.split('{')[0].trim()}`),
    );
    expect(fautifs).toEqual([]);
  });

  it('la barre du bas reste fixe, sur son propre calque, et s’efface avec le clavier', () => {
    const css = feuilles.map((x) => x.css).join('\n');
    const barre = blocs(css).find((b) => b.split('{')[0].trim() === '.bottom-nav')!;
    expect(barre).toMatch(/position:\s*fixed/);
    expect(barre).toMatch(/bottom:\s*0/);
    expect(barre).toMatch(/env\(safe-area-inset-bottom\)/);
    expect(css).toMatch(/:root\.clavier-ouvert \.bottom-nav\s*\{[^}]*translateY/);
  });

  it('les animations respectent la réduction des mouvements', () => {
    for (const { f, css } of feuilles.filter((x) => /@keyframes|animation:/.test(x.css)))
      expect(/prefers-reduced-motion|data-mouvement/.test(css) || f === 'fonts.css', f).toBe(true);
  });

  it('cartes sans bordure, fond gris très clair (choix validé)', () => {
    const css = feuilles.find((x) => x.f === 'global.css')!.css;
    expect(css).toMatch(/--card:\s*var\(--dp-color-fond-2\)/);
    expect(css).toMatch(/--dp-color-fond-2:\s*#f7f7f5/i);
  });
});
