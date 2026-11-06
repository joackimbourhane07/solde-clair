# Tests, pull request, fusion, publication, rapport

## Sommaire
1. Protocole de test
2. Tests automatiques à écrire
3. Vérifications dans le navigateur
4. Branches, commits, pull request
5. Conditions pour fusionner et publier seul
6. Publication GitHub Pages et vérification en ligne
7. Rapport final

## 1. Protocole de test

Dans cet ordre, en notant les résultats chiffrés (ne jamais annoncer un test qu'on n'a pas lancé) :
1. `npm ci`
2. formatage (Prettier si présent : `npx prettier --check` sur les fichiers modifiés) ;
3. lint (s'il n'y en a pas, dis-le au lieu d'inventer un résultat) ;
4. type-check (`npm run typecheck` ou `tsc --noEmit`) ;
5. tests unitaires (`npm test`) ;
6. build de production (`npm run build`) ;
7. tests navigateur (`npx playwright test`), sur la version construite ;
8. contrôle des emojis : `python3 scripts/verifier_emojis.py src index.html` ;
9. site servi sous son vrai chemin GitHub Pages : `node scripts/serveur_pages.cjs dist 4323 /nom-du-depot`
   après un build avec `BASE_PATH=/nom-du-depot/` (et `cp dist/index.html dist/404.html`) ;
10. Lighthouse mobile et ordinateur sur ce serveur (performance, accessibilité, bonnes pratiques, SEO,
    LCP, CLS, TBT, poids, requêtes) ; compare avec la mesure d'avant ;
11. scan de secrets avant la fusion.

Corrige toute erreur introduite et relance ce qui est concerné. Une correction de bug = un test qui
échoue sans la correction.

## 2. Tests automatiques à écrire

- Unitaires (Vitest) : tous les calculs métier, la validation des données importées, les migrations,
  la recherche de l'assistant, les règles de texte (ex. réponses ≤ 240 caractères).
- Composants (Testing Library) : formulaires (vide, invalide, décimales), ajout / modification /
  suppression / annulation, fenêtres (Échap, focus rendu), navigation, réglages, personnalisation.
- Navigateur (Playwright + `@axe-core/playwright`) avec les aides de `assets/modele/e2e-outils.ts` :
  - parcours principaux d'un nouvel utilisateur et des profils de démonstration ;
  - toutes les pages : `problemesDeMiseEnPage` (débordement horizontal, texte hors écran ou coupé) ;
  - axe WCAG 2.2 AA (`withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])`) après la fin des
    animations (`finAnimations`) ;
  - console sans erreur, aucune requête vers un autre site ;
  - aucun emoji dans le texte visible ;
  - 11 tailles d'écran, barre du bas fixe au défilement, fenêtre centrée et dans l'écran, fond inerte,
    défilement et focus rendus, rotation (modèle `e2e-tailles.spec.ts`) ;
  - mouvement réduit (`page.emulateMedia({ reducedMotion: 'reduce' })`) : contenu complet, pas d'animation ;
  - clavier seul ; modes clair et sombre ; sauvegarde puis restauration.
- Date fixe dans les tests (`page.clock.setFixedTime`) pour des calculs stables.
- Désactive dans les tests les éléments qui apparaissent après un délai (astuces) sauf dans le test
  qui les vérifie, sinon axe peut échouer au hasard.

## 3. Vérifications dans le navigateur

Utilise Chromium (Playwright) sur la version de production : captures avant / après (ordinateur et
téléphone, clair et sombre) des pages principales, regardées par toi avant d'affirmer quoi que ce soit.
Captures pour un humain à `deviceScaleFactor: 2`, pour toi à 1. Si un bug ne se voit qu'avec une capture
fournie par l'utilisateur, reproduis-le d'abord (même largeur, mêmes données) et écris un test qui le
détecte.

## 4. Branches, commits, pull request

- Travaille sur la branche désignée (créée depuis la branche principale à jour ; si sa PR précédente
  est fusionnée, repars de main sous le même nom).
- Commits intermédiaires si besoin, puis **un commit final clair** en français : titre court, puis
  liste des changements. Termine par les lignes d'attribution demandées par l'environnement.
  Aucun identifiant de modèle dans les commits, la PR ou le code.
- Pousse avec `git push -u origin <branche>` ; en cas d'erreur réseau, réessaie (2 s, 4 s, 8 s, 16 s) ;
  si la commande reste bloquée, arrête-la et relance-la.
- PR vers la branche principale avec : Résumé (numéroté selon les priorités de la demande, avec les
  causes des bugs), Vérifications exécutées (commande → résultat chiffré), limites. Respecte un modèle
  de PR du dépôt s'il existe.

## 5. Conditions pour fusionner et publier seul

Par défaut l'utilisateur autorise la fusion et la publication **si tout est réussi** :
- tous les tests et le build réussissent ;
- les fonctions existantes restent utilisables, les calculs restent exacts ;
- aucune vulnérabilité importante, aucun secret, aucune donnée réelle ou confidentielle ;
- aucun service payant, aucune API externe, aucune donnée utilisateur transmise ;
- performances acceptables, WCAG 2.2 AA respecté, mouvement réduit fonctionnel ;
- GitHub Pages reste le seul hébergement ; le site marche sur ordinateur et téléphone.

Si une condition échoue : **arrête-toi avant la fusion** et explique précisément le problème. Si
l'utilisateur a demandé de ne pas fusionner ou de ne pas publier, attends son accord explicite.
Fusion en « squash » avec un titre clair et le numéro de PR.

## 6. Publication GitHub Pages et vérification en ligne

- Workflow `assets/modele/deploy-pages.yml` (actions officielles, `npm ci`, type-check, tests, build avec
  `BASE_PATH=/<dépôt>/`, copie `404.html`, déploiement). Dans les réglages du dépôt : Pages → Source
  « GitHub Actions » (à faire une fois par l'utilisateur, explique-lui où).
- Après la fusion, suis l'exécution du workflow jusqu'à « success » (outils GitHub disponibles, sans
  boucle d'attente inutile). Si le déploiement échoue à cause du code, corrige et republie.
- Vérifie le site en ligne (titre, pages, chemin `/<dépôt>/`, téléphone). Si l'environnement ne peut
  pas l'ouvrir, dis-le et indique sur quoi tu t'appuies (workflow réussi, même build testé localement).
- Lien à donner : `https://<compte>.github.io/<dépôt>/`. Rappelle que chaque visiteur a ses propres
  données dans son navigateur (un ami qui ouvre le lien ne voit pas les tiennes).

## 7. Rapport final

- Première phrase : le résultat (fait / pas fait), en français simple.
- Puis, selon la demande (reprendre exactement sa numérotation si elle en donne une) : lien HTTPS, lien
  de la PR et commit fusionné, causes des bugs, corrections, composants / fichiers modifiés, sources et
  références réellement consultées, ce qui a été retenu et rejeté, interactions ajoutées, textes
  raccourcis, tailles testées, commandes exécutées avec résultats chiffrés (lint, type-check, tests,
  build, Lighthouse avant / après, poids), captures avant / après, problèmes restants, étapes pour
  vérifier soi-même, recommandations pour la suite, changements qui attendent encore son accord.
- Tableaux pour les comparaisons de chiffres ; listes courtes ; pas de jargon inutile.
