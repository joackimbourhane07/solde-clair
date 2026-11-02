# SoldeClair

**SoldeClair** est une application web de gestion de budget personnel, simple et rassurante, pensée pour toutes et tous : étudiants, alternants, salariés, indépendants et personnes qui découvrent la gestion budgétaire.

Elle répond à une question essentielle : **« Combien me reste-t-il pour finir le mois, et combien puis-je dépenser par jour ? »**

> Exemple affiché sur le tableau de bord : « Il vous reste 540 € pour terminer le mois, soit environ 18 € par jour. »

Toutes les données restent **dans votre navigateur**. Aucun compte, aucune banque, aucun serveur.

**Version de test en ligne** : <https://joackimbourhane07.github.io/solde-clair/> (voir [Version en ligne](#version-en-ligne-github-pages)).

---

## Sommaire

1. [Objectif](#objectif)
2. [Fonctionnalités](#fonctionnalités)
3. [Technologie utilisée](#technologie-utilisée)
4. [Prérequis](#prérequis)
5. [Installation](#installation)
6. [Lancement](#lancement)
7. [Tests](#tests)
8. [Organisation des fichiers](#organisation-des-fichiers)
9. [Données de démonstration](#données-de-démonstration)
10. [Données locales et confidentialité](#données-locales-et-confidentialité)
11. [Règles de calcul](#règles-de-calcul)
12. [Limites actuelles](#limites-actuelles)
13. [Améliorations possibles (version 2)](#améliorations-possibles-version-2)
14. [Version en ligne (GitHub Pages)](#version-en-ligne-github-pages)

---

## Objectif

Permettre à chacun de :

- saisir ses revenus ;
- enregistrer ses charges fixes ;
- suivre ses dépenses variables ;
- connaître son **reste à vivre** ;
- définir des **limites de dépenses** par catégorie ;
- **prévoir** sa situation à la fin du mois ;
- suivre ses **objectifs d’épargne** ;
- **simuler l’impact d’un achat** avant de le faire.

## Fonctionnalités

| Page | Ce qu’elle permet |
| --- | --- |
| **Page d’accueil (présentation)** | Premier écran d’un nouveau visiteur : grand titre « Votre budget devient enfin clair. », boutons « Commencer » et « Découvrir SoldeClair », illustrations originales, sections sur le reste à vivre, les charges à venir, l’épargne, le simulateur, les profils et la confidentialité, appel à l’action et pied de page. Vraies captures de SoldeClair (profil de démonstration, données fictives) dans des cadres d’ordinateur et de téléphone. Si des profils existent déjà sur l’appareil : « Continuer avec … », « Créer un nouveau profil » et les autres profils. Chargée séparément (≈ 10 Ko de code + 220 Ko d’images WebP chargées au fil du défilement) ; accessible à tout moment en cliquant sur le logo. |
| **Configuration initiale** | Parcours en 6 étapes : prénom ou pseudonyme, situation (étudiant, alternant, salarié, indépendant, autre), devise (euro par défaut), revenu principal et revenus complémentaires, charges fixes, estimation des dépenses variables, objectif d’épargne mensuel, objectif à long terme, choix des catégories proposées selon le profil. Possibilité de charger une démonstration ou d’importer une sauvegarde. |
| **Tableau de bord** | Dans l’ordre : **carte principale** (« Il vous reste X € pour terminer le mois, soit environ Y € par jour », jours restants, part des revenus dépensée, détail du calcul), **À venir** (« Dans les 7 prochains jours : … », charges et revenus attendus avec des dates relatives), **Ce mois-ci** (revenus, dépenses, dernières opérations), **Épargne du mois** (montant et **pourcentage de l’objectif atteint**, même au-delà de 100 %, puis les objectifs en cours avec leur pourcentage), **À faire** (3 petites actions au maximum : limite dépassée, rythme trop rapide, prélèvement de demain, dépense inhabituelle, versement d’épargne, sauvegarde ; chacune peut être ignorée), **Estimation des 30 prochains jours** (disponible estimé à 7, 15 et 30 jours, point le plus bas, événements pris en compte), ajout rapide (sur ordinateur), **un seul graphique** ; le reste dans « Détail du mois ». Navigation de mois en mois. |
| **Mon compte** | Vue façon application bancaire : **solde du jour** (total, puis compte bancaire et carte restaurant séparément si elle est utilisée), solde estimé après les opérations des 30 prochains jours, **À venir** (prélèvements et revenus attendus, charges pas encore payées), puis **toutes les opérations jour par jour** (« Aujourd’hui », « Hier », « Mercredi 4 novembre 2026 ») avec ce qui est entré, ce qui est sorti et le **solde en fin de journée**. Recherche, total des entrées et des sorties, mois précédents à la demande. Bouton **« Ajuster le solde »** : on indique le solde réel affiché par la banque (ou la carte restaurant, découvert possible) et SoldeClair ajoute un « ajustement du solde » daté du jour pour combler l’écart ; un ajustement se supprime d’un geste. |
| **Revenus** | Ajout, modification, suppression. Nom, montant, date, catégorie, récurrent ou exceptionnel, fréquence, date de fin facultative, note. **Carte restaurant** : catégorie proposée à tous les profils ; un revenu de cette catégorie est « versé sur » la carte restaurant (modifiable). Le total du mois compte **toutes les sources**, puis le détail **sur le compte bancaire** et **sur la carte restaurant**. |
| **Dépenses** | Ajout, modification, suppression, recherche et filtre par catégorie. Montant, catégorie, date, description et moyen de paiement facultatifs (carte bancaire, **carte restaurant**, espèces, virement…). Une dépense payée par carte restaurant est retirée du solde de la carte, pas du compte bancaire. |
| **Charges fixes** | Ajout, modification, suppression. Nom, montant, date de prélèvement, catégorie, fréquence (hebdomadaire à annuelle), statut **payé / à venir** modifiable pour chaque échéance, note. |
| **Budgets par catégorie** | Limite mensuelle par catégorie résumée en une phrase (« 45,40 € dépensés sur 60,00 € (76 %), il reste 14,60 € ») avec une barre de progression et des repères à 75 % et 90 %. Alertes à **75 %**, **90 %** et en cas de **dépassement**, signalées par un texte et une icône (pas seulement par la couleur) ; en cas de dépassement, lien direct vers les dépenses de la catégorie. Les catégories **sans limite** sont regroupées dans une liste courte, avec un bouton « Fixer une limite ». |
| **Objectifs d’épargne** | Plusieurs objectifs : nom, description, montant cible, montant déjà disponible, date souhaitée, priorité, contribution mensuelle. Calcul automatique du restant, des mois restants, du montant mensuel nécessaire, du pourcentage et de la date d’atteinte estimée. Enregistrement des versements. Progression résumée en une phrase (« Vous avez atteint 43 % de votre objectif ») avec la prochaine petite étape. |
| **Simulateur d’achat** | Solde après achat, nouveau reste à vivre quotidien, impact sur l’épargne du mois, impact sur chaque objectif, dépassement éventuel d’une catégorie, et appréciation : *situation confortable*, *achat possible avec prudence* ou *achat susceptible de déséquilibrer le budget* (indication budgétaire, pas un conseil financier). |
| **Historique et bilan** | Historique complet avec recherche, **puces** pour la période et le type, liste pour la catégorie, filtres actifs visibles et effaçables en un geste, bilan mensuel (revenus, charges, dépenses, épargne, solde final, catégories les plus coûteuses, budgets dépassés), comparaison avec le mois précédent, export CSV. |
| **Paramètres** | Sauvegarde en premier (export CSV, sauvegarde JSON avec la date de la dernière sauvegarde et un rappel au-delà de 30 jours, import JSON), profil, devise, objectif d’épargne, thème clair / sombre / automatique, catégories (ajouter, renommer, supprimer), données de démonstration, effacement total avec **double confirmation**. |

**Partout dans l’application** :

- **plusieurs profils** sur le même appareil, chacun avec ses propres données (le logo ramène à la page d’accueil pour changer de profil ou en créer un) ;
- **report du reste d’un mois sur le suivant** (cumul, désactivable dans les paramètres) : une prime reçue fin octobre et non dépensée compte encore en novembre ;
- **création d’une catégorie sans quitter un formulaire** (« + Nouvelle catégorie… »), utile si la liste est vide ;
- un message précise **le mois concerné** quand une opération est datée d’un autre mois que celui affiché, avec un bouton pour y aller ;

- **bouton « + » central** (barre du bas sur mobile, bouton « Ajouter une dépense » sur ordinateur) pour ajouter une dépense depuis n’importe quelle page ;
- **catégories fréquentes** : les 4 catégories les plus utilisées ces 90 derniers jours sont proposées en un geste dans le formulaire de dépense ;
- **masquer les montants** (icône en forme d’œil) : tous les montants sont remplacés par « ••• € », pratique en public ; le choix est mémorisé ;
- une **mention de confidentialité** en bas de chaque page rappelle que les données restent sur l’appareil.

**Graphiques** (lisibles sur smartphone, avec une vue « tableau » accessible pour chacun) :
répartition des dépenses par catégorie, revenus et dépenses sur 6 mois, évolution du solde au cours du mois, évolution de l’épargne, progression des objectifs.

**Apparence** : fond blanc, texte presque noir, un seul accent bleu, vert pour les bonnes nouvelles, orange pour l’attention, rouge pour les dépassements. Panneaux gris très clair **sans bordure**, boutons et choix remplis (bleu plein pour l’action principale ou le choix sélectionné, bleu clair pour les autres), coins légèrement arrondis, presque aucune ombre ; chiffres alignés (chiffres tabulaires). Le thème clair est utilisé par défaut ; le mode sombre (graphite) et le mode automatique restent disponibles dans les paramètres. Les teintes utilisées pour le texte sont assombries pour respecter le contraste WCAG AA. Les animations sont supprimées si l’appareil demande de réduire les mouvements.

**Accessibilité** : libellés sur tous les champs, messages d’erreur explicites reliés aux champs, navigation complète au clavier (lien d’évitement, fenêtres qui gardent le focus et se ferment avec Échap, graphiques parcourables avec les flèches), contrastes renforcés, zones tactiles d’au moins 44 px, montants signés « + / − », états des budgets indiqués par texte + icône + hachures, respect de « réduire les animations ».

## Technologie utilisée

- **React 19 + TypeScript**, outillé par **Vite 7**.
- **React Router** (mode `HashRouter`) pour la navigation.
- **localStorage** pour la sauvegarde locale.
- **Vitest + Testing Library** pour les tests rapides (calculs et interface).
- **Playwright + axe-core** pour les tests dans un vrai navigateur (parcours, affichage, accessibilité).
- Graphiques en **SVG faits maison** (aucune bibliothèque de graphiques).
- Police **IBM Plex Sans** (licence libre), installée avec `@fontsource` et **hébergée avec l’application** : aucune requête vers un service externe.

**Pourquoi ce choix ?**

- **Aucun serveur nécessaire** : c’est une application 100 % statique. `npm run build` produit un dossier `dist/` qu’on peut placer sur n’importe quel hébergement statique gratuit (la version de test utilise GitHub Pages). Le mode `HashRouter` (adresses avec « # ») évite toute configuration serveur : actualiser une page ne donne jamais d’erreur 404. Les chemins sont relatifs (`./`) par défaut ; la variable `BASE_PATH` permet de fixer un autre chemin (`/solde-clair/` pour GitHub Pages).
- **Gratuit et stable** : uniquement des outils open source très répandus, sans service payant.
- **Facile à maintenir** : TypeScript détecte les erreurs avant l’exécution ; les calculs sont des fonctions pures, séparées de l’interface et testées.
- **Fiable pour l’argent** : tous les montants sont stockés **en centimes (nombres entiers)** pour éviter les erreurs d’arrondi (0,1 + 0,2 ≠ 0,3 en informatique).
- **Léger** : peu de dépendances, environ 125 Ko de code compressé et 70 Ko de police.

## Prérequis

- **Node.js 20 ou plus récent** (testé avec Node.js 22) — <https://nodejs.org>
- **npm** (installé avec Node.js)
- Un navigateur récent (Chrome, Edge, Firefox, Safari).

## Installation

```bash
git clone <adresse-du-dépôt> solde-clair
```

```bash
cd solde-clair
```

```bash
npm install
```

> Le fichier `.npmrc` du projet active `legacy-peer-deps` afin que l’installation fonctionne avec toutes les versions de npm.

## Lancement

Mode développement (rechargement automatique) :

```bash
npm run dev
```

Puis ouvrez <http://localhost:5173> dans votre navigateur.

Version optimisée (production), puis prévisualisation locale :

```bash
npm run build
```

```bash
npm run preview
```

La prévisualisation est disponible sur <http://localhost:4173>. Le dossier `dist/` contient l’application prête à être hébergée.

## Tests

```bash
npm test
```

Vérification des types TypeScript :

```bash
npm run typecheck
```

**223 tests** couvrent notamment :

- la saisie et l’arrondi des montants (virgule, espaces, deux décimales, 0,1 + 0,2) ;
- les dates (années bissextiles, fins de mois, passage d’année, jours restants) ;
- les échéances récurrentes (hebdomadaires à annuelles, date de fin, jour 31) ;
- le **total des revenus**, le **total des charges fixes**, le **total des dépenses variables** ;
- le **solde disponible** et le **reste à vivre quotidien** (y compris négatif, dernier jour du mois) ;
- l’**onglet Compte** : soldes du compte bancaire et de la carte restaurant, relevé jour par jour (solde de fin de journée), charges « à venir » non débitées, opérations des 30 prochains jours, **ajustement du solde** (découvert compris) ;
- la **carte restaurant** : reconnaissance du nom, revenus « versés sur » la carte, paiement par carte restaurant, cumul de toutes les sources et détail par compte, ajout automatique de la catégorie aux profils existants ;
- les **changements de mois** (mois passé, en cours, futur) et la comparaison avec le mois précédent ;
- les **limites par catégorie** (seuils exacts 75 %, 90 %, 100 %) et les alertes ;
- les **objectifs d’épargne** (mois restants, effort mensuel, date estimée, objectif atteint, date dépassée) ;
- le **simulateur d’achat** (trois appréciations, impact sur l’épargne, sur une catégorie, sur les objectifs) ;
- les **exports CSV et JSON**, l’**import** (aller-retour sans perte, fichiers invalides refusés avec un message clair, protection contre les formules dans les tableurs) ;
- les **données de démonstration** (validité, cohérence, plusieurs mois d’historique) ;
- l’interface : parcours de configuration complet, ajout rapide, **modification et suppression** avec confirmation, messages d’erreur, statut des charges, limites, simulateur, import, effacement en deux étapes, thème, filtres de l’historique, bilan ;
- les textes (« d’octobre » et non « de octobre ») et l’accessibilité (lien d’évitement, listes, zones défilables).

### Tests dans un vrai navigateur (facultatif)

Ces tests construisent la version de production, la lancent, puis l’utilisent comme un vrai utilisateur dans Chromium (date simulée : 12 novembre 2026). La première fois, installez le navigateur de test (gratuit, environ 150 Mo) :

```bash
npx playwright install chromium
```

Puis :

```bash
npm run test:e2e
```

Ils vérifient :

- un parcours complet de nouvel utilisateur : configuration, tableau de bord, dépense, changement de mois, budget dépassé, simulateur sans effet sur les données, export JSON, effacement et réimport ;
- toutes les pages aux formats petit mobile (320 px), mobile, tablette et ordinateur, en mode clair et sombre : aucune erreur dans la console, aucun débordement ni texte coupé ;
- l’accessibilité WCAG 2.2 AA avec axe-core, en mode clair et sombre (contrastes, libellés, rôles, taille des cibles…) ;
- la navigation au clavier (lien d’évitement, contour de focus, fenêtres) et les trois thèmes ;
- le chargement local de la police (aucune requête externe), les chiffres alignés et l’absence de transitions en mouvement réduit.

## Organisation des fichiers

```
solde-clair/
├── index.html                 Page HTML d’entrée
├── package.json               Dépendances et commandes
├── vite.config.ts             Configuration Vite et Vitest
├── playwright.config.ts       Configuration des tests navigateur
├── tsconfig.json              Configuration TypeScript (application)
├── tsconfig.node.json         Configuration TypeScript (outils et tests navigateur)
├── .github/workflows/         Publication automatique sur GitHub Pages
├── e2e/                       Tests dans un vrai navigateur (Playwright)
├── docs/                      Recherche, audit, références et plan (avec captures)
├── public/                   Icônes (SVG, PNG 32 px, icône Apple 180 px)
└── src/
    ├── main.tsx               Démarrage de l’application
    ├── App.tsx                Pages et navigation
    ├── types.ts               Modèle de données (montants en centimes)
    ├── lib/                   Logique métier, sans interface (testée)
    │   ├── money.ts           Saisie, affichage et calculs de montants
    │   ├── dates.ts           Manipulation des dates et des mois
    │   ├── recurrence.ts      Échéances des revenus et charges récurrents
    │   ├── budget.ts          Totaux, solde, reste à vivre, budgets, alertes, bilan
    │   ├── accounts.ts        Soldes des comptes, relevé jour par jour, opérations à venir
    │   ├── goals.ts           Objectifs d’épargne
    │   ├── simulator.ts       Simulateur d’achat
    │   ├── forecast.ts        Estimation du disponible à 7, 15 et 30 jours
    │   ├── actions.ts         Petites actions utiles du tableau de bord
    │   ├── categories.ts      Catégories proposées selon le profil
    │   ├── setup.ts           Création des données après la configuration
    │   ├── demo.ts            Trois profils de démonstration fictifs
    │   ├── storage.ts         Sauvegarde locale, validation, exports CSV / JSON
    │   ├── chartScale.ts      Graduations et libellés des graphiques
    │   ├── id.ts              Identifiants uniques
    │   └── __tests__/         Tests des calculs
    ├── state/AppState.tsx     État global, sauvegarde automatique, thème
    ├── components/            Éléments d’interface réutilisables
    │   ├── ui.tsx             Boutons, champs, cartes, fenêtres, barres…
    │   ├── forms.tsx          Formulaires (dépense, revenu, charge, objectif, versement)
    │   ├── Layout.tsx         Navigation (barre latérale / barre du bas sur mobile)
    │   ├── Icon.tsx           Icônes
    │   ├── accueil/           Illustrations originales de la présentation (SVG)
    │   └── charts/Charts.tsx  Graphiques SVG
    ├── pages/                 Une page par écran (Accueil.tsx : présentation, chargée séparément)
    ├── styles/global.css      Identité claire (palette --dp-*), thèmes clair et sombre, responsive
    ├── styles/fonts.css       Police IBM Plex Sans hébergée localement
    ├── styles/accueil.css     Styles de la présentation
    ├── test/                  Configuration et jeu de données des tests
    └── __tests__/             Tests de l’interface
```

## Données de démonstration

Trois profils **entièrement fictifs** sont fournis, chacun avec plusieurs revenus, charges fixes, dépenses variables, limites budgétaires, au moins un objectif d’épargne et **trois mois d’historique complet** en plus du mois en cours :

- **Léa, étudiante** : bourse, APL, aide des parents, petits jobs, loyer de studio, frais d’inscription annuels, objectifs « Ordinateur » et « Fonds d’urgence » ;
- **Hugo, alternant** : salaire d’alternance, prime d’activité, voiture, objectifs « Voiture » et « Voyage » ;
- **Camille, salariée** : salaire, allocations, crédit immobilier, crèche, eau trimestrielle, objectifs « Fonds d’urgence » et « Voyage en famille ».

**Pour les charger :**

- au premier lancement, dans la section « Ou bien… » sous le formulaire de bienvenue ;
- ou à tout moment dans **Paramètres → Données de démonstration** (une confirmation est demandée, car les données actuelles sont remplacées : exportez-les avant si besoin).

Les dates sont calculées par rapport au jour actuel, et les données sont identiques à chaque chargement.

## Données locales et confidentialité

- Les données sont enregistrées **uniquement dans le navigateur** (`localStorage`), sur l’appareil utilisé : clé `soldeclair:donnees:v1` pour le premier profil, `soldeclair:donnees:v1:<identifiant>` pour les suivants, et la liste des profils dans `soldeclair:profils:v1`.
- « Effacer toutes mes données » efface le **profil ouvert** ; les autres profils de l’appareil sont conservés.
- **Aucun compte**, **aucune synchronisation bancaire**, **aucune coordonnée bancaire** demandée, **aucun paiement**.
- **Aucune donnée financière n’est envoyée** à un serveur : l’application ne fait aucun appel réseau une fois chargée.
- Aucun outil de suivi, de mesure d’audience ou de publicité ; aucune police ni bibliothèque chargée depuis un service externe.
- Chaque navigateur a ses propres données : deux personnes qui ouvrent la version en ligne ne voient jamais les données l’une de l’autre, et vos données sur téléphone et sur ordinateur sont séparées.
- Les exports (CSV, JSON) sont générés sur l’appareil et téléchargés directement.
- **Sauvegarde JSON** : contient toutes les données ; elle peut être réimportée (après vérification de son contenu).
- **Export CSV** : séparateur « ; » et virgule décimale, pour une ouverture directe dans un tableur configuré en français. Les sorties d’argent sont en négatif.
- **Effacement** : Paramètres → « Effacer toutes mes données », avec deux confirmations (la seconde demande de taper `EFFACER`).

⚠️ Vider les données de navigation du navigateur efface aussi les données de SoldeClair. Pensez à **exporter régulièrement une sauvegarde JSON**.

## Règles de calcul

Tous les calculs se font en centimes entiers ; la conversion en euros n’a lieu qu’à l’affichage.

| Indicateur | Calcul |
| --- | --- |
| Revenus du mois | Revenus exceptionnels datés du mois + échéances des revenus récurrents tombant dans le mois. |
| Charges fixes du mois | Échéances du mois (payées **et** à venir, car elles seront prélevées). |
| Dépenses variables | Dépenses datées du mois. |
| Montant épargné | Versements d’épargne datés du mois. |
| **Report des mois précédents** | Cumul des soldes de tous les mois précédents (depuis la première saisie, 10 ans au plus) : un reste s’ajoute, un dépassement se retranche. Actif par défaut, désactivable dans les paramètres. |
| **Solde disponible** | Report + ajustements du solde + revenus − charges fixes − dépenses variables − épargne versée. |
| **Solde d’un compte (onglet Compte)** | Tous les mouvements passés depuis la première saisie : revenus reçus, dépenses, charges prélevées, versements d’épargne et ajustements. Une charge marquée « à venir » n’est pas encore débitée. Compte bancaire et carte restaurant sont calculés séparément ; le solde total est leur somme. |
| **Carte restaurant** | Reconnue par son nom (« carte restaurant », « titres-restaurant », « ticket resto », Swile, Edenred, Pluxee, Up Déjeuner, Bimpli…). Revenus de cette catégorie → carte restaurant, sauf choix contraire ; dépenses payées « Carte restaurant » → carte restaurant ; tout le reste → compte bancaire. Les soldes séparés ne s’affichent que si la carte sert vraiment (revenu, paiement ou ajustement). |
| **Ajustement du solde** | Solde réel indiqué − solde calculé, daté du jour, sur le compte choisi. |
| **Épargne du mois (%)** | Montant épargné ÷ objectif mensuel, arrondi à l’unité (peut dépasser 100 %). |
| Jours restants | Jours jusqu’à la fin du mois, **aujourd’hui inclus** (0 pour un mois passé). |
| **Reste à vivre quotidien** | Solde disponible ÷ jours restants, arrondi au centime **inférieur** (jamais surestimé). Dans la phrase d’accueil, le reste est arrondi à l’euro inférieur et un dépassement à l’euro supérieur. |
| Budget consommé | (Charges fixes + dépenses variables) ÷ revenus. |
| Prévision de fin de mois | Revenus − charges − épargne − dépenses variables projetées : au rythme actuel à partir du 7ᵉ jour, sinon d’après les limites prévues (ou l’estimation du profil). |
| Statut d’une charge | « Payé » si sa date est passée, « À venir » sinon ; modifiable à la main pour chaque échéance. |
| Alerte de catégorie | ≥ 75 % : attention ; ≥ 90 % : alerte ; > 100 % : dépassement. |
| Objectif : mois restants | Mois calendaires jusqu’à la date souhaitée (au moins 1 si la date est dans le mois en cours). |
| Objectif : effort mensuel | Montant restant ÷ mois restants, arrondi au centime supérieur. |
| Objectif : date estimée | Aujourd’hui + ⌈restant ÷ contribution mensuelle⌉ mois. |
| Estimation à 7, 15 et 30 jours | Disponible du jour (revenus reçus − charges, dépenses et épargne du mois jusqu’à aujourd’hui) + revenus prévus − charges prévues − dépenses courantes estimées (rythme du mois dès le 7ᵉ jour, sinon limites prévues ÷ jours du mois). L’argent des mois précédents n’est pas compté : c’est une estimation indicative. Le point le plus bas est signalé. |
| À faire | Limite dépassée ou à 90 %, rythme qui ferait finir le mois dans le rouge, prélèvement aujourd’hui ou demain, dépense des 7 derniers jours au moins 3 fois supérieure à la médiane de sa catégorie (90 jours, au moins 4 dépenses, 30 € minimum), épargne du mois incomplète à partir du 10, sauvegarde absente ou de plus de 30 jours. 3 actions au maximum, par priorité ; « Ignorer » la masque jusqu’au mois suivant. |
| Simulateur | *Déséquilibre* si le solde devient négatif ; *prudence* si l’achat entame l’épargne prévue du mois, fait dépasser une limite ou dépasse la moitié du solde disponible ; sinon *confortable*. |

## Limites actuelles

- Les données sont liées **à un seul navigateur sur un seul appareil** (pas de synchronisation entre téléphone et ordinateur ; utiliser export / import JSON).
- Le `localStorage` est limité à quelques mégaoctets (largement suffisant pour plusieurs années de saisies manuelles).
- Supprimer un revenu ou une charge récurrente le retire aussi des mois passés : pour l’arrêter seulement à partir d’une date, il faut renseigner une **date de fin**.
- Les dépenses récurrentes variables (ex. : courses hebdomadaires automatiques) ne sont pas gérées ; seules les charges fixes et revenus peuvent être récurrents.
- Deux comptes seulement (compte bancaire et carte restaurant) : pas de livret séparé, de plusieurs devises simultanées ni de dépenses partagées.
- **Pas de connexion à la banque ni à Apple Pay**, volontairement : cela demanderait un prestataire agréé (DSP2), un serveur et l’envoi des données hors de l’appareil. Le bouton « Ajuster le solde » permet de recaler le solde à la main en quelques secondes.
- Les limites budgétaires concernent les dépenses variables (pas les charges fixes).
- Pas d’import de relevés bancaires (CSV de banque) — volontairement, pour cette première version.
- L’application n’est pas encore installable hors ligne (PWA).

## Améliorations possibles (version 2)

1. **Application installable et hors ligne (PWA)** : icône sur l’écran d’accueil, fonctionnement sans connexion.
2. **Stockage IndexedDB** avec sauvegarde automatique planifiée et rappel d’export.
3. **Chiffrement local facultatif** des données par un mot de passe choisi par l’utilisateur.
4. **Synchronisation optionnelle** entre appareils (chiffrée de bout en bout), toujours sans accès bancaire.
5. **Import de relevés CSV** de banque, avec catégorisation assistée et vérification avant import.
6. **Dépenses récurrentes variables** et modèles de dépenses fréquentes (saisie en un geste).
7. **Budgets reportables** (le reste d’une catégorie s’ajoute au mois suivant) et limites sur les charges fixes.
8. **Rappels** avant les prélèvements importants et en cas de dépassement.
9. **Autres comptes** (livret, deuxième compte courant…) et transferts entre comptes, en plus du compte bancaire et de la carte restaurant.
10. **Bilan annuel** et graphiques sur 12 mois, export PDF du bilan.
11. **Tests navigateur dans l’intégration continue** : la publication lance déjà la vérification des types et `npm test` ; on pourrait y ajouter `npm run test:e2e`.
12. **Traductions** (anglais, espagnol…) et adaptation des catégories par pays.

## Version en ligne (GitHub Pages)

Une version de test est publiée gratuitement avec **GitHub Pages** :

**<https://joackimbourhane07.github.io/solde-clair/>**

- Elle fonctionne en **HTTPS** sur ordinateur, tablette et téléphone, sans installation.
- Les données saisies restent **dans le navigateur de chaque visiteur** (`localStorage`) : rien n’est envoyé à GitHub ni à personne d’autre, et aucun visiteur ne voit les données d’un autre.
- Comme pour tout site web, l’hébergeur (GitHub) reçoit la demande d’affichage des pages (adresse IP du visiteur, pour la sécurité) ; il ne reçoit **aucune donnée budgétaire**.

### Comment elle est publiée

Le fichier `.github/workflows/deploy-pages.yml` utilise uniquement les actions officielles de GitHub (`actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`). À chaque modification de la branche `main`, il :

1. installe les dépendances (`npm ci`) ;
2. vérifie les types (`npm run typecheck`) et lance les tests (`npm test`) — si un test échoue, rien n’est publié ;
3. construit le site avec le chemin de base `/solde-clair/` ;
4. ajoute une page 404 de secours qui renvoie vers l’application ;
5. publie le dossier `dist/` sur GitHub Pages.

Pour vérifier localement la version publiée (même chemin de base) :

```bash
BASE_PATH=/solde-clair/ npm run build
```

```bash
npm run preview
```

Puis ouvrez <http://localhost:4173/solde-clair/>.

### Conditions côté GitHub (une seule fois)

- **Settings → Pages → Build and deployment → Source : « GitHub Actions »**.
- GitHub Pages est gratuit pour les **dépôts publics**. Pour un dépôt privé, il faut un abonnement GitHub payant : SoldeClair ne l’utilise pas.

### Publier une nouvelle version

Fusionnez une pull request dans `main` (ou poussez sur `main`) : le site est reconstruit et republié automatiquement en une à deux minutes. On peut aussi relancer la publication à la main : onglet **Actions → « Publier sur GitHub Pages » → Run workflow**.

### Arrêter la publication

- **Mettre le site hors ligne** : Settings → Pages → **Unpublish site** (ou repasser la source sur « None »).
- **Garder le site mais ne plus le mettre à jour** : Actions → « Publier sur GitHub Pages » → **⋯ → Disable workflow**.

