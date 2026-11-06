# Téléphone : barre du bas, fenêtres, clavier, rotation

Tout ce qui a été corrigé en profondeur sur SoldeClair (série 11). Modèles prêts dans `assets/modele/` :
`viewport.ts`, `Modal.tsx`, `tokens.css`, `e2e-outils.ts`, `e2e-tailles.spec.ts`.

## Sommaire
1. Tailles à tester
2. Barre de navigation du bas
3. Hauteur d'écran et clavier
4. Fenêtres (modales / bottom sheets) : un seul système
5. Conversation (assistant, chat) : défilement
6. Page d'accueil après rotation
7. Pièges classiques

## 1. Tailles à tester

Téléphones portrait : 320×568, 360×800, 375×667, 390×844, 393×873, 412×915, 430×932.
Paysage : 568×320, 844×390. Tablette : 768×1024. Ordinateur : 1440×900 (et 1100, 800, 520 px de large).
Sur chaque taille : pas de débordement horizontal, barre du bas stable, bouton principal accessible,
fenêtre centrée, arrière-plan bloqué, contenu non masqué, textes non coupés, zones sûres, pages courtes
et longues, noms et montants longs. Plus : rotation portrait → paysage → portrait, clavier ouvert.

## 2. Barre de navigation du bas

Attendu : stable pendant le défilement, ne remonte jamais avec le contenu, ne masque jamais le dernier
élément, pas de conflit avec la barre système iOS / Android, bouton « + » central fixe et atteignable
au pouce, rien de coupé, correcte avec le clavier ouvert.

Recette :
- `position: fixed; bottom: 0; left: 0; right: 0;` sur un **calque propre** (`transform: translateZ(0)`),
  `padding-bottom: env(safe-area-inset-bottom)` et `<meta name="viewport" content="..., viewport-fit=cover">`.
- Variable de hauteur réelle (`--barre-bas: 61px`) et espace en bas du contenu :
  `padding-bottom: calc(var(--barre-bas) + env(safe-area-inset-bottom) + 16px)` (plus si un bouton
  flottant d'assistant est présent).
- **Clavier ouvert : cache la barre** (`:root.clavier-ouvert .bottom-nav { transform: translateY(110%) }`)
  et les boutons flottants. Sur iOS, une barre fixe remonte sinon au-dessus du clavier : c'est la vraie
  cause du « la barre monte avec le contenu ».
- Aucun parent de la barre avec `transform`, `filter`, `perspective`, `contain` ou `will-change`
  (ils cassent `position: fixed`). Vérifie aussi `overflow` et les contextes d'empilement / `z-index`.

## 3. Hauteur d'écran et clavier

- N'utilise pas `100vh` seul sur mobile : écris `min-height: 100vh; min-height: 100dvh;` (repli),
  `svh` pour un premier écran stable, `dvh` pour suivre la barre du navigateur.
- `suivreEcranVisible()` (modèle `viewport.ts`), appelée au démarrage : met `--vv-hauteur` (hauteur
  visible) et `--clavier` (hauteur du clavier) à partir de `visualViewport`, et la classe
  `clavier-ouvert` sur `<html>` au-delà de 120 px manquants.
- Les panneaux du bas utilisent `bottom: var(--clavier)` et `max-height: var(--vv-hauteur)`.

## 4. Fenêtres (modales / bottom sheets) : un seul système

Un seul composant de fenêtre pour tout le site (jamais deux systèmes concurrents). Modèle : `Modal.tsx`.

- Rendu en **portail** sur `document.body` (pas dans un bloc animé ou transformé de la page).
- Téléphone : bottom sheet centrée, marge de 8 px, poignée, au-dessus de la barre système
  (`padding-bottom: calc(8px + env(safe-area-inset-bottom) + var(--clavier, 0px))`), largeur
  `min(560px, 100%)`, `max-height: calc(var(--vv-hauteur, 100dvh) - 24px - safe areas)`.
  Ordinateur : centrée. Paysage bas (`max-height: 500px`) : centrée, hauteur utile maximale.
- Contenu défilant à l'intérieur (`overflow-y: auto; overscroll-behavior: contain`), en-tête fixe,
  **boutons d'action collés en bas** (`position: sticky; bottom: 0`), côte à côte sur téléphone.
- Ouverte : fond assombri, clics du fond bloqués, `#root` en `inert` + `aria-hidden`, **verrouillage du
  défilement compatible iOS** (`body { position: fixed; top: -scrollY }`, puis `scrollTo` exact à la
  fermeture ; `overflow: hidden` ne suffit pas sur iOS), focus piégé (Tab / Maj+Tab), premier champ
  focalisé avec `preventScroll: true`.
- Fermeture : bouton « Fermer », clic sur le fond, **Échap**, **bouton retour Android** (une entrée
  `history.pushState` par fenêtre et `popstate` qui ferme celle du dessus ; à la fermeture par un autre
  moyen, `history.back()` en ignorant l'événement qui suit) ; focus rendu au bouton d'origine ; position
  de défilement exactement conservée ; plusieurs ouvertures de suite sans dérive de l'historique.
- Peu de texte, actions immédiatement compréhensibles ; pour un ajout rapide, des onglets de type
  (« Dépense », « Revenu »…) dans la même fenêtre plutôt que plusieurs boutons.

## 5. Conversation (assistant, chat) : défilement

- Un **seul flux chronologique** : anciens messages en haut, la question, la réponse juste dessous,
  les nouveaux en bas, saisie stable en bas du panneau.
- Fais défiler **uniquement le conteneur** de la conversation (`conteneur.scrollTo`), jamais
  `scrollIntoView()` qui déplace toute la page.
- Suis le nouveau message seulement si l'utilisateur est près du bas (80 à 120 px) ; sinon, affiche
  un bouton discret « Nouveau message ». Indicateur d'écriture près du nouveau message.
- Largeur des bulles limitée (`max-width: min(85%, 34rem)`), saisie visible avec le clavier
  (panneau `bottom: var(--clavier)`), distance suffisante avec la barre du bas.
- Détail de l'assistant : `assistant-guide.md`.

## 6. Page d'accueil après rotation

- Introduction centrée : en portrait `min-height: min(calc(100svh - hauteur_nav), 720px)` avec
  `justify-content: center` ; en paysage bas (`max-height: 500px`), titre réduit (`clamp(1.8rem, 10svh,
  2.8rem)`), boutons plus compacts, cartes flottantes réduites pour ne pas cacher le titre.
- Se recentre sans rechargement ni saut ; `scrollX` reste à 0 ; les boutons restent visibles.

## 7. Pièges classiques

- Parent transformé (animation d'entrée de page) qui casse les éléments fixés ou les fenêtres.
- `scrollIntoView` / `focus()` sans `preventScroll` qui font sauter la page.
- Hauteurs fixes en px pour des zones essentielles ; `100vh` seul.
- Barre du bas non cachée avec le clavier sur iOS.
- Oubli du `viewport-fit=cover` (les `env(safe-area-*)` valent alors 0).
- En émulation desktop les bugs iOS n'apparaissent pas : raisonne sur les causes connues et teste ce
  qui est testable (Playwright avec `devices['iPhone 12']`, `Pixel 7`), puis dis clairement ce qui n'a
  pas pu être vérifié sur un vrai téléphone.
