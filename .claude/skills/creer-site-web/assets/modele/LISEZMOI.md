# Modèles prêts à copier

| Fichier | Où le mettre | Rôle |
|---|---|---|
| `vite.config.ts` | racine | base `./` en local, `BASE_PATH` sur GitHub Pages, configuration Vitest |
| `deploy-pages.yml` | `.github/workflows/` | vérifie (types, tests), construit et publie sur GitHub Pages ; remplacer `NOM-DU-DEPOT` |
| `playwright.config.ts` | racine | tests navigateur sur la version construite |
| `tokens.css` | `src/styles/` | palette validée, rôles, barre du bas, fenêtre unique, mouvement réduit |
| `viewport.ts` | `src/lib/` | hauteur visible, clavier, verrouillage du défilement compatible iOS ; appeler `suivreEcranVisible()` au démarrage |
| `mouvement.ts` | `src/lib/` | réglage « animations réduites » + `prefers-reduced-motion` ; renommer la clé de stockage |
| `Modal.tsx` | `src/components/` | la seule fenêtre du site (portail, inert, focus, Échap, retour Android) |
| `e2e-outils.ts` | `e2e/outils.ts` | aides Playwright : date fixe, console, requêtes externes, emojis, mise en page |
| `e2e-tailles.spec.ts` | `e2e/` | 11 tailles d'écran, barre du bas, fenêtre centrée, rotation ; adapter les constantes |

Adapter les noms (préfixe de stockage, routes, libellés) au nouveau site. Ne pas recopier de données réelles.
