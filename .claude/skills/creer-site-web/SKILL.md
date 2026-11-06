---
name: creer-site-web
description: Méthode complète pour concevoir, développer, améliorer, tester et publier un site ou une application web de qualité professionnelle, en français, mobile d'abord, accessible (WCAG 2.2 AA), sans service payant ni collecte de données, puis le publier sur GitHub Pages. Issue du projet SoldeClair (appli de budget personnel avec l'assistant Poksy). Utilise ce skill dès que l'utilisateur demande de créer, générer, refaire, moderniser, rendre plus interactif, corriger sur mobile, auditer, mettre en ligne ou publier un site web, une page d'accueil, une application web, un tableau de bord, une PWA ou une interface, même s'il ne dit pas « skill » ni « site » (ex. « fais-moi une appli pour suivre mes notes », « mon menu du bas bouge sur téléphone », « rends mon site plus beau », « mets-le en ligne »). Contient aussi un module pour les applis de gestion / finance personnelle et un module pour ajouter un assistant guide local.
---

# Créer un site web (méthode SoldeClair)

Ce skill reprend tout ce que l'utilisateur a demandé et validé pendant la création de SoldeClair
(https://joackimbourhane07.github.io/solde-clair/). Il sert à produire d'autres sites avec la même
exigence : simple, rassurant, beau, interactif, accessible, rapide, testé et publié.

L'utilisateur est francophone, non développeur, et préfère qu'on lui **pose les questions nécessaires**
pour avoir le bon contexte. Il veut un résultat réellement fonctionnel, pas une maquette ni un plan.

## Comment utiliser ce skill

1. Lis cette page en entier.
2. Ouvre seulement les références utiles à la demande :

| Besoin | Fichier |
|---|---|
| Règles complètes, ton, textes, design, palette | `references/cahier-des-charges.md` |
| Recherche, inspiration, audit, parcours simulés, plan | `references/recherche-et-audit.md` |
| Design, page d'accueil, animations, illustrations | `references/design-et-interactions.md` |
| Téléphone : barre du bas, fenêtres, clavier, rotation | `references/mobile-et-fenetres.md` |
| Assistant guide intégré (type Poksy) | `references/assistant-guide.md` |
| Appli de gestion, budget, finance, données personnelles | `references/appli-gestion-finance.md` |
| Tests, PR, fusion, GitHub Pages, rapport final | `references/tests-et-publication.md` |
| Pièges déjà rencontrés et leurs solutions | `references/lecons-apprises.md` |

3. Les modèles prêts à copier sont dans `assets/modele/` ; les scripts de vérification dans `scripts/`.

## Étape 0 : comprendre la demande et poser les bonnes questions

Avant de coder, relis la demande et repère ce qui changerait réellement le résultat. Pose ces questions
d'un coup (outil de questions à choix, 1 à 4 questions, option recommandée en premier avec « (Recommandé) »),
puis avance sans redemander :

- le but du site, le public visé, les pages ou fonctions indispensables ;
- le nom et l'identité (couleurs, logo, mascotte, photo fournie) ;
- tutoiement ou vouvoiement (par défaut : **tutoiement**, choisi pour SoldeClair) ;
- les données : locales dans le navigateur (par défaut) ou autre (à justifier) ;
- l'autonomie : par défaut **jusqu'à la mise en ligne** si tout est vert (voir plus bas) ;
- tout point ambigu, contradictoire ou risqué (ex. « copie ce site » : propose une version originale).

Ne pose pas de question dont la réponse se trouve dans le dépôt, dans la demande, ou qui a une valeur
par défaut évidente : choisis, dis-le en une ligne, avance.

## Étape 1 : inspecter (projet existant) ou initialiser (nouveau projet)

**Projet existant** : lis tout le dépôt avant d'écrire (framework, routes, styles, composants, données,
tests, commandes de build, lint, type-check, workflow de publication). Adapte-toi à l'architecture en
place ; étends les structures de données au lieu de les casser. Lance l'application, reproduis les
problèmes signalés sur plusieurs tailles d'écran, regarde la console.

**Nouveau projet** : technique par défaut (éprouvée sur SoldeClair, gratuite, sans serveur) :
- Vite + React + TypeScript, routes avec `HashRouter` (pas d'erreur 404 sur GitHub Pages) ;
- CSS simple avec des variables (tokens), mobile d'abord, mode clair et sombre ;
- données dans `localStorage` (lecture et écriture sous try/catch, site utilisable si vide ou bloqué) ;
- tests unitaires Vitest + Testing Library, tests navigateur Playwright + axe-core ;
- publication GitHub Pages par GitHub Actions (`assets/modele/deploy-pages.yml`, `vite.config.ts`).
Explique brièvement le choix technique dans le README. Ne change jamais la technique d'un projet existant.

## Étape 2 : recherche et audit (quand c'est demandé ou utile)

Pour une refonte, une page d'accueil, un projet ambitieux ou un « rends-le plus beau » : suis
`references/recherche-et-audit.md` (sources réelles avec liens, références analysées sans jamais les
copier, audit navigateur avec captures avant, parcours utilisateurs simulés, mesures Lighthouse).
Ne prétends jamais avoir visionné une vidéo ou visité un site que tu n'as pas pu ouvrir : dis-le.

## Étape 3 : plan court, puis exécution

Écris un plan bref : problèmes vérifiés, idées issues de la recherche, simples hypothèses (bien
distinguées), ordre de réalisation, risques, tests prévus. Puis **passe directement à l'implémentation**
(l'utilisateur ne veut pas s'arrêter à un plan).

- Applique directement : bugs, accessibilité, libellés, espacements, contraste, états vides, petites
  actions, améliorations mobiles sans risque, cohérence visuelle.
- Demande d'abord (questions à choix avec aperçu si utile) : refonte complète d'une page clé,
  changement majeur de navigation, suppression d'une fonction, nouvelle dépendance lourde, fonction
  complexe, changement du stockage, comptes en ligne, service externe, synchronisation, connexion bancaire.

Ordre de priorité par défaut quand plusieurs choses sont demandées :
1. bugs de navigation, de défilement et de calcul ;
2. barre du bas, bouton principal, fenêtres sur téléphone ;
3. adaptation à toutes les tailles d'écran ;
4. textes courts ; 5. interactions utiles partout ; 6. nouvelles fonctions ; 7. harmonisation du design.
Ne commence pas par l'esthétique.

## Règles non négociables

Ces règles viennent de demandes répétées de l'utilisateur. Le détail et les raisons sont dans
`references/cahier-des-charges.md`.

- Travaille uniquement dans le dépôt et la branche prévus ; ne touche à aucun autre dépôt.
- **Aucune donnée personnelle réelle dans le dépôt** (le site est public) : les vraies données passent
  par un fichier de sauvegarde local que l'utilisateur importe.
- Aucun service payant, publicité, outil de suivi ou d'analyse, appel réseau imprévu, API d'IA externe,
  connexion bancaire, compte en ligne ou paiement, sauf demande explicite et justifiée.
- Aucun emoji dans l'interface (titres, boutons, messages, assistant, catégories) : icônes SVG originales.
- Aucun dark pattern, fausse urgence, culpabilisation, son automatique, clignotement, scroll forcé.
- Ne copie aucun site (code, textes, logo, illustrations, animations, mise en page exacte) : reprends
  les bonnes pratiques et crée une version originale. Si on te demande de « recopier », propose cela.
- Ne supprime ni ne casse aucune fonction existante, ne masque pas un bug en retirant une fonction,
  ne change pas un calcul métier sans justification ; conserve routes, données et stack.
- Accessibilité WCAG 2.2 AA, information jamais transmise par la seule couleur, clavier, focus visible,
  `prefers-reduced-motion` respecté, cibles tactiles d'environ 44 px, lisible dès 320 px.
- Tout en français simple ; une idée par phrase ; textes courts.
- **Ne déclare jamais un test réussi sans l'avoir exécuté. Ne publie jamais si un test échoue.**

## Étape 4 : tester

Suis `references/tests-et-publication.md`. Au minimum : `npm ci`, type-check, tests unitaires, tests
navigateur (tailles d'écran, clavier, axe WCAG, console, requêtes externes, absence d'emoji avec
`scripts/verifier_emojis.py`), build de production, essai sur le chemin GitHub Pages
(`scripts/serveur_pages.cjs`), Lighthouse. Ajoute un test automatique pour chaque bug corrigé.

## Étape 5 : PR, fusion, publication

Par défaut (choix de l'utilisateur), va **jusqu'à la mise en ligne** sans redemander, seulement si :
tous les tests et le build réussissent ; les fonctions existantes marchent ; les calculs restent exacts ;
aucune vulnérabilité, aucun secret ni donnée réelle ; aucun service payant ni API externe ajoutée ;
performances et accessibilité correctes ; GitHub Pages reste l'hébergement. Sinon : arrête-toi avant
la fusion et explique précisément le blocage. Si l'utilisateur a dit de ne pas publier ou de ne pas
fusionner, respecte-le jusqu'à nouvel ordre.

Regroupe le travail en un commit clair, ouvre la PR (modèle de description dans la référence), fusionne,
suis le workflow GitHub Actions jusqu'au succès, vérifie le site en ligne (ou dis que tu n'as pas pu
l'ouvrir et sur quoi tu t'appuies).

## Étape 6 : rapport final

Commence par le résultat en une phrase, en français simple, sans jargon. Puis : lien HTTPS exact,
lien de la PR, ce qui a changé, tests réellement lancés et leurs résultats chiffrés, limites restantes,
étapes pour vérifier soi-même, prochaines idées. Si la demande listait des points de rapport numérotés,
reprends exactement cette numérotation. Ne mentionne aucun identifiant de modèle dans les commits,
la PR ou le code.
