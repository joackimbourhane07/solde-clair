# SoldeClair : mémoire du projet

Application de budget personnel en français, publiée sur https://joackimbourhane07.github.io/solde-clair/.
Pour créer ou faire évoluer un site avec la même méthode, utilise le skill
`.claude/skills/creer-site-web/` (règles complètes, références, modèles, scripts).

## Technique et commandes
- Vite + React 19 + TypeScript, `HashRouter`, CSS avec variables (`src/styles/`), données dans `localStorage`.
- `npm ci` ; `npm run dev` ; `npm run typecheck` ; `npm test` (Vitest) ; `npm run build` ;
  `npx playwright test` (tests navigateur sur la version construite, axe WCAG 2.2 AA).
- Pas de linter configuré. Formatage : `npx prettier --single-quote --print-width 150` sur les fichiers modifiés.
- Publication : `.github/workflows/deploy-pages.yml` à chaque push sur `main` (`BASE_PATH=/solde-clair/`).

## Règles de l'utilisateur (à respecter sans redemander)
- Fusionner et publier **seulement si tout est réussi** (types, tests, tests navigateur, build) ; sinon s'arrêter et expliquer.
- **Aucune donnée réelle dans le dépôt** (site public) : les vraies données passent par un fichier de sauvegarde importé.
- Aucun emoji dans l'interface ; aucun service payant, suivi, publicité, API d'IA externe, connexion bancaire.
- Tutoiement partout ; textes courts (une idée par phrase) ; tiret « - » au lieu du point médian.
- L'assistant s'appelle **Poksy** (garder ce nom) ; il reste 100 % local et ne modifie jamais les données.
- Palette : fond blanc, cartes #F7F7F5 sans bordure, bleu #2383E2 ; entrées #47D45A / sorties #FF0000
  (variantes foncées pour le petit texte) ; épargne en bleu.
- Une seule fenêtre (`Modal` dans `src/components/ui.tsx`) ; défilement et clavier mobile gérés par `src/lib/viewport.ts`.
- Calculs en centimes ; « Il te reste » = solde de « Mon compte » ; règle du 20 et report du reste réglables.
- Ne jamais annoncer un test réussi sans l'avoir lancé ; ne supprimer aucune fonction existante.
