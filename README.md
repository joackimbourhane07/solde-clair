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
10. [Remplir SoldeClair avec ses propres données](#remplir-soldeclair-avec-ses-propres-données)
11. [Poksy, guide SoldeClair](#poksy-guide-soldeclair)
12. [Données locales et confidentialité](#données-locales-et-confidentialité)
13. [Règles de calcul](#règles-de-calcul)
14. [Limites actuelles](#limites-actuelles)
15. [Améliorations possibles (version 2)](#améliorations-possibles-version-2)
16. [Installer SoldeClair comme une application](#installer-soldeclair-comme-une-application)
17. [Version en ligne (GitHub Pages)](#version-en-ligne-github-pages)

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
| **Tableau de bord** | Dans l’ordre : **carte principale** (« Il vous reste X € pour terminer le mois, soit environ Y € par jour ») qui affiche **exactement le solde de « Mon compte »** : tout ce qui est arrivé moins tout ce qui est parti, depuis la première saisie ; « Comment est-ce calculé ? » détaille ce cumul. **À venir** : les opérations d’aujourd’hui et des **3 prochains jours** seulement (pas encore comptées dans le solde ; « Tout voir » ouvre Mon compte → À venir). Puis **Ce mois-ci** (revenus, dépenses, dernières opérations), **Épargne du mois**, **À faire**, **Estimation des 30 prochains jours** (à partir du solde de Mon compte), ajout rapide (sur ordinateur), **un seul graphique** ; le reste (bilan du mois, report…) dans « Détail du mois ». Navigation de mois en mois (mois passé : solde à la fin du mois ; mois à venir : prévision). |
| **Mon compte** | Vue façon application bancaire : **solde du jour** écrit en vert (ou en rouge s’il est négatif) : le total cumulé compte bancaire + carte restaurant, puis chacun séparément si la carte est utilisée. Tant qu’aucun solde réel n’a été indiqué, une aide explique que le solde part de 0 € et propose « Indiquer mon solde réel », solde estimé après les opérations des 30 prochains jours, puis deux **bulles** qui ouvrent chacune leur onglet : **Opérations** (toutes les opérations jour par jour (« Aujourd’hui », « Hier », « Mercredi 4 novembre 2026 ») avec ce qui est entré, ce qui est sorti et le **solde en fin de journée** ; recherche, total des entrées et des sorties, mois précédents à la demande) et **À venir** (nombre d’opérations des 7 prochains jours dans la bulle, rien s’il n’y en a pas ; prélèvements et revenus attendus sur 30 jours, charges pas encore payées, total entrant et sortant). Adresse directe : `#/compte?vue=a-venir`. Bouton **« Ajuster le solde »** : on indique le solde réel affiché par la banque (ou la carte restaurant, découvert possible) et SoldeClair ajoute un « ajustement du solde » daté du jour pour combler l’écart ; un ajustement se supprime d’un geste. |
| **Revenus** | Ajout, modification, suppression. Nom, montant, date, catégorie, récurrent ou exceptionnel, fréquence, date de fin facultative, note. **Sûr ou attendu** : un revenu attendu (prime non confirmée, 13e mois, solde de tout compte) peut avoir une fourchette (« jusqu’à »), un montant inconnu, et une case « Inclure dans la projection optimiste » ; il n’est compté nulle part tant qu’il n’est pas confirmé (étiquette « Attendu »). **Détail facultatif** du revenu (lignes du bulletin de paie, montants signés, total vérifié). **Carte restaurant** : catégorie proposée à tous les profils ; un revenu de cette catégorie est « versé sur » la carte restaurant (modifiable). Avec une carte restaurant, la page distingue les **revenus encaissés** (compte bancaire) du **pouvoir d’achat alimentaire** (titres-restaurant, avantage en nature), puis le total des ressources. |
| **Mon plan d’épargne** | L’objectif principal « tous supports confondus » : montant réuni, pourcentage, reste à réunir, mois restants, **épargne nécessaire par mois** (recalculée chaque jour) et statut **dans les temps / en retard** avec l’écart chiffré. **Supports d’épargne** (Livret A, Livret Jeune, LDDS, LEP, PEL, CEL, assurance vie, PEA, épargne salariale, compte courant…) avec solde, taux, plafond, disponibilité (« bloqué jusqu’au… », « retrait = clôture ») et montant visé ; **épargne totale**, **disponible** et **bloquée** affichées séparément. **Projection mois par mois** jusqu’à la date de l’objectif (base ; case « Inclure les revenus attendus » pour la projection optimiste), avec notes (prime, voyage, caution). **Revenus attendus** (case à cocher, bouton « Reçu »). **Sommes bloquées temporairement** (caution, dépôt de garantie : pas une dépense, bouton « Rendu »). **Bilan du mois guidé** : prévu / réel pour l’épargne, les dépenses et les revenus attendus ; seul ce qui manque est créé. **Repères pour vous** selon le profil. Suggestions de supports et de revenus attendus selon le profil. |
| **Dépenses** | Ajout, modification, suppression, recherche et filtre par catégorie. Montant, catégorie, date, description et moyen de paiement facultatifs (carte bancaire, **carte restaurant**, espèces, virement…). Case **« Dépense exceptionnelle »** (voyage, gros achat) : comptée dans le solde, mais séparée des dépenses courantes dans la projection. Une dépense payée par carte restaurant est retirée du solde de la carte, pas du compte bancaire. |
| **Charges fixes** | Ajout, modification, suppression. Nom, montant, date de prélèvement, catégorie, fréquence (hebdomadaire à annuelle), statut **payé / à venir** modifiable pour chaque échéance, note. |
| **Budgets par catégorie** | Limite mensuelle par catégorie résumée en une phrase (« 45,40 € dépensés sur 60,00 € (76 %), il reste 14,60 € ») avec une barre de progression et des repères à 75 % et 90 %. Alertes à **75 %**, **90 %** et en cas de **dépassement**, signalées par un texte et une icône (pas seulement par la couleur) ; en cas de dépassement, lien direct vers les dépenses de la catégorie. Les catégories **sans limite** sont regroupées dans une liste courte, avec un bouton « Fixer une limite ». |
| **Objectifs d’épargne** | **Cartes illustrées** : une illustration originale par thème (imprévus, voyage, véhicule, études, logement, informatique, fête, santé, projet), choisie automatiquement d’après le nom ou dans le formulaire ; **anneau de progression** et **jalons** 25 / 50 / 75 / 100 % ; **versement rapide** (+ 20 €, + 50 €, + 100 €, annulable) ; curseur **« Et si je mettais X € par mois ? »** qui recalcule la date d’arrivée et la compare à la date souhaitée (bouton pour l’adopter). Toujours : montant cible, montant déjà disponible, date souhaitée, priorité, contribution mensuelle, effort mensuel nécessaire, date d’atteinte estimée, versements (modifier, supprimer). Grande carte sur deux colonnes quand il n’y a qu’un objectif ; idées d’objectifs illustrées quand il n’y en a aucun. |
| **Simulateur d’achat** | Part du **solde de « Mon compte »** (le même que le tableau de bord) : solde après achat, nouveau reste à vivre quotidien, impact sur l’épargne du mois, impact sur chaque objectif, dépassement éventuel d’une catégorie, et appréciation : *situation confortable*, *achat possible avec prudence* ou *achat susceptible de déséquilibrer le budget* (indication budgétaire, pas un conseil financier). |
| **Historique et bilan** | Historique complet avec recherche, **puces** pour la période et le type, liste pour la catégorie, filtres actifs visibles et effaçables en un geste, bilan mensuel (revenus, charges, dépenses, épargne, solde final, catégories les plus coûteuses, budgets dépassés), comparaison avec le mois précédent, export CSV. |
| **Paramètres** | Sauvegarde en premier (export CSV, sauvegarde JSON avec la date de la dernière sauvegarde et un rappel au-delà de 30 jours, import JSON), **point de départ** (enregistré à chaque import ou à la demande ; « Réinitialiser aux données par défaut » y revient après une double confirmation), profil (date de naissance et situation facultatives, dont les libellés suivent le profil : contrat d’alternance, études, emploi, activité ; territoire), devise, objectif d’épargne, thème clair / sombre / automatique, catégories (ajouter, renommer, supprimer), données de démonstration, effacement total avec **double confirmation**. |

**Partout dans l’application** :

- **Poksy, guide SoldeClair** (bouton rond en bas à droite, avec une tête de chat) : une aide simple pour comprendre le site, vos chiffres et les calculs. Voir [Poksy](#poksy-guide-soldeclair) ;

- **personnalisation selon le profil** (étudiant, alternant, salarié, indépendant) : l’interface **met en avant** ce qui compte pour la situation, sans rien interdire. Repères sur l’accueil (fin de contrat et revalorisation du salaire d’apprenti, été sans bourse, réserve de précaution en mois de charges, prochain revenu attendu, Livret Jeune avant 26 ans), revenus attendus et supports suggérés, questions de Poksy « Pour votre situation ». Analyse détaillée : [docs/profils-et-donnees.md](docs/profils-et-donnees.md) ;
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

**Apparence** : fond blanc, texte presque noir, un seul accent bleu, orange pour l’attention. **Vert #47D45A pour l’argent qui entre et un solde positif, rouge #FF0000 pour les dépenses et l’argent qui sort**, partout (comptes, tableau de bord, revenus, dépenses, charges, historique, bilan, graphique revenus / dépenses) : couleurs exactes pour les pastilles, icônes et barres ; montants écrits dans une teinte plus foncée de la même couleur (vert #187A29 et rouge #D90000 en mode clair, #47D45A et #FF6B6B en mode sombre) pour rester lisibles (contraste WCAG AA). Les montants gardent aussi leur signe « + » ou « − », la couleur n’est jamais le seul repère. Les budgets et la répartition par catégorie gardent leurs couleurs propres (niveau d’alerte, catégorie). Panneaux gris très clair **sans bordure**, boutons et choix remplis (bleu plein pour l’action principale ou le choix sélectionné, bleu clair pour les autres), coins légèrement arrondis, presque aucune ombre ; chiffres alignés (chiffres tabulaires). Le thème clair est utilisé par défaut ; le mode sombre (graphite) et le mode automatique restent disponibles dans les paramètres. Les teintes utilisées pour le texte sont assombries pour respecter le contraste WCAG AA. Les animations sont supprimées si l’appareil demande de réduire les mouvements.

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

**293 tests** couvrent notamment :

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
- **Poksy** : chaque question proposée retrouve sa réponse, mots-clés, message sans résultat, réponses de une à quatre phrases, jamais culpabilisantes, aucune donnée bancaire demandée, questions adaptées à la page, boutons qui ouvrent seulement une page ou un formulaire (aucune donnée modifiée), ouverture, fermeture avec Échap, retour du focus, message de première visite affiché une seule fois ;
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
- le chargement local de la police (aucune requête externe), les chiffres alignés et l’absence de transitions en mouvement réduit ;
- **Poksy** aux largeurs 1440, 1100, 800, 520, 390 et 320 px, en mode clair et sombre : position (au-dessus de la barre du bas, sans gêner le « + »), fenêtre dans l’écran, accessibilité WCAG 2.2 AA fenêtre ouverte, Échap, clavier, aucune erreur, aucune requête vers un autre site.

Pour rejouer ces tests sur une copie du site servie sous `/solde-clair/` (comme GitHub Pages) : `E2E_BASE_URL=http://localhost:4321/solde-clair/ npx playwright test`.

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
├── public/                   Icônes (SVG, PNG 32, 192, 512 px, icône Apple 180 px) et manifeste d’installation
└── src/
    ├── main.tsx               Démarrage de l’application
    ├── App.tsx                Pages et navigation
    ├── types.ts               Modèle de données (montants en centimes)
    ├── lib/                   Logique métier, sans interface (testée)
    │   ├── money.ts           Saisie, affichage et calculs de montants
    │   ├── dates.ts           Manipulation des dates et des mois
    │   ├── recurrence.ts      Échéances des revenus et charges récurrents
    │   ├── budget.ts          Totaux, solde, reste à vivre, budgets, alertes, bilan
    │   ├── poksy.ts           Poksy : questions, réponses, recherche par mots-clés (chargé à l’ouverture)
    │   ├── poksyTextes.ts     Poksy : textes du bouton et du message de première visite
    │   ├── accounts.ts        Soldes des comptes, relevé jour par jour, opérations à venir
    │   ├── goals.ts           Objectifs d’épargne
    │   ├── plan.ts            Supports, épargne totale / disponible, projection mois par mois
    │   ├── profil.ts          Personnalisation selon le profil (repères, suggestions, libellés)
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
    │   ├── poksy/             Poksy : avatar (SVG), bouton flottant, fenêtre de discussion
    │   ├── accueil/           Illustrations originales de la présentation (SVG)
    │   └── charts/Charts.tsx  Graphiques SVG
    ├── pages/                 Une page par écran (Accueil.tsx : présentation, chargée séparément)
    ├── styles/global.css      Identité claire (palette --dp-*), thèmes clair et sombre, responsive
    ├── styles/fonts.css       Police IBM Plex Sans hébergée localement
    ├── styles/accueil.css     Styles de la présentation
    ├── styles/plan.css        Styles de « Mon plan d’épargne » et des repères
    ├── styles/poksy.css       Styles de Poksy
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

## Remplir SoldeClair avec ses propres données

Le site est public : **aucune donnée réelle ne doit être placée dans le code**. Pour préremplir l’application, on crée sur son ordinateur un fichier de sauvegarde JSON (à la main ou avec un assistant de code), puis on l’importe (Paramètres → « Importer une sauvegarde »). Le fichier importé devient le **point de départ**. Le format complet, avec un exemple entièrement fictif ([docs/exemple-sauvegarde-fictive.json](docs/exemple-sauvegarde-fictive.json)), est décrit dans [docs/format-sauvegarde.md](docs/format-sauvegarde.md). Le dossier `mes-donnees/` et les fichiers `*donnees-reelles*.json` sont ignorés par Git.

## Poksy, guide SoldeClair

<img src="docs/poksy-avatar.svg" alt="" width="64" height="64">

**Poksy vous aide à comprendre votre budget, simplement.** C’est un assistant guidé qui fonctionne **entièrement sur l’appareil** : des réponses préparées à l’avance, une recherche par mots-clés et des questions adaptées à la page ouverte. **Ce n’est pas une intelligence artificielle** et aucune question n’est envoyée sur Internet.

- **Partout** : dans l’application et sur la page d’accueil (questions « Qu’est-ce que SoldeClair ? », « Est-ce gratuit ? »… ; sans profil, pas de bouton vers les pages internes).
- **Bouton flottant** (avatar de Poksy) : en bas à droite sur ordinateur ; au-dessus de la barre du bas sur téléphone, à droite, loin du bouton « + ». Lors de la première visite, un petit message « Bonjour, je suis Poksy. Une question sur SoldeClair ? » s’affiche **une seule fois** (seule information mémorisée par Poksy : `soldeclair:poksy:v1`).
- **Fenêtre** : avatar, nom, « Guide SoldeClair », message de bienvenue, questions rapides, « Voir plus de questions » (7 rubriques, 38 questions), zone pour écrire une question, réponses de une à quatre phrases, et parfois un bouton vers la bonne page. Panneau sur presque tout l’écran sur téléphone.
- **Sur cette page** : sur Mon compte, Dépenses, Budgets, Objectifs et Paramètres, trois questions propres à la page sont proposées en premier.
- **Chiffres réels** : certaines réponses ajoutent vos montants du mois (reste à vivre, disponible par jour), calculés sur l’appareil et masqués si vous avez choisi de masquer les montants. Poksy n’invente jamais de chiffre.
- **Boutons d’action** : « Ajouter une dépense », « Ajouter un revenu », « Ajuster mon solde », « Voir mon tableau de bord », « Créer un objectif », « Ouvrir le simulateur », « Voir mes budgets », « Exporter une sauvegarde », « Ouvrir les paramètres ». Ils **ouvrent seulement** la page ou le formulaire : Poksy n’enregistre, ne modifie et ne supprime jamais rien.
- **Sécurité** : Poksy ne demande jamais d’identifiant, de mot de passe, de numéro de carte ni de coordonnées bancaires ; un long numéro tapé par erreur est masqué (« •••• ») et Poksy rappelle de ne jamais le saisir. Il ne donne pas de conseil en placement ou en crédit.
- **Accessibilité** : ouverture et fermeture au clavier, Échap pour fermer (le focus revient sur le bouton), ordre de tabulation logique, nouvelles réponses annoncées aux lecteurs d’écran, avatar décoratif masqué, contrastes WCAG 2.2 AA en clair et en sombre.
- **Poids** : environ 2,5 Ko (compressés) au chargement ; les questions et réponses (11 Ko compressés) ne sont chargées qu’à la première ouverture (ou dès que la souris passe sur le bouton, pour une ouverture immédiate).

Mention affichée dans la fenêtre : « Poksy fonctionne sur votre appareil et ne remplace pas un conseiller financier professionnel. »

## Données locales et confidentialité

- Les données sont enregistrées **uniquement dans le navigateur** (`localStorage`), sur l’appareil utilisé : clé `soldeclair:donnees:v1` pour le premier profil, `soldeclair:donnees:v1:<identifiant>` pour les suivants, et la liste des profils dans `soldeclair:profils:v1`.
- Le **point de départ** d’un profil est enregistré dans `soldeclair:depart:v1:<identifiant>`, sur le même appareil ; il est effacé avec le profil.
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
| Revenus du mois | Revenus exceptionnels et échéances des revenus récurrents du mois ; **un revenu reçu à partir du 20 compte pour le mois suivant** (réglable de 15 à 28, désactivable dans les paramètres). « Mon compte », l’historique par dates et l’export gardent la vraie date. |
| Charges fixes du mois | Échéances du mois (payées **et** à venir, car elles seront prélevées). |
| Dépenses variables | Dépenses datées du mois. |
| Montant épargné | Versements d’épargne datés du mois. |
| **Report des mois précédents** | Cumul des soldes de tous les mois précédents (depuis la première saisie, 10 ans au plus) : un reste s’ajoute, un dépassement se retranche. Actif par défaut, désactivable dans les paramètres. |
| **Il vous reste (tableau de bord)** | Solde de « Mon compte » aujourd’hui : revenus reçus − dépenses − charges prélevées − épargne versée ± ajustements, depuis la première saisie (compte bancaire + carte restaurant). Les opérations prévues comptent le jour où elles arrivent. |
| **Bilan du mois** (« Détail du mois », bilan) | Report + ajustements du mois + revenus du mois − charges fixes − dépenses variables − épargne versée. |
| **Solde d’un compte (onglet Compte)** | Tous les mouvements passés depuis la première saisie : revenus reçus, dépenses, charges prélevées, versements d’épargne et ajustements. Une charge marquée « à venir » n’est pas encore débitée. Compte bancaire et carte restaurant sont calculés séparément ; le solde total est leur somme. |
| **Carte restaurant** | Reconnue par son nom (« carte restaurant », « carte déjeuner », « chèque déjeuner », « titres-restaurant », « ticket resto », Swile, Edenred, Pluxee, Up Déjeuner, Bimpli…). Revenus de cette catégorie → carte restaurant, sauf choix contraire ; dépenses payées « Carte restaurant » → carte restaurant ; tout le reste → compte bancaire. Les soldes séparés ne s’affichent que si la carte sert vraiment (revenu, paiement ou ajustement). |
| **Ajustement du solde** | Solde réel indiqué − solde calculé, daté du jour, sur le compte choisi. |
| **Épargne du mois (%)** | Montant épargné ÷ objectif mensuel, arrondi à l’unité (peut dépasser 100 %). |
| Jours restants | Jours jusqu’à la fin du mois, **aujourd’hui inclus** (0 pour un mois passé). |
| **Reste à vivre quotidien** | Solde de « Mon compte » ÷ jours restants dans le mois (aujourd’hui inclus), arrondi au centime **inférieur** (jamais surestimé). Dans la phrase d’accueil, le reste est arrondi à l’euro inférieur. |
| Budget consommé | (Charges fixes + dépenses variables) ÷ revenus. |
| Prévision de fin de mois | Revenus − charges − épargne − dépenses variables projetées : au rythme actuel à partir du 7ᵉ jour, sinon d’après les limites prévues (ou l’estimation du profil). |
| Statut d’une charge | « Payé » si sa date est passée, « À venir » sinon ; modifiable à la main pour chaque échéance. |
| Alerte de catégorie | ≥ 75 % : attention ; ≥ 90 % : alerte ; > 100 % : dépassement. |
| Objectif : mois restants | Mois calendaires jusqu’à la date souhaitée (au moins 1 si la date est dans le mois en cours). |
| Objectif : effort mensuel | Montant restant ÷ mois restants, arrondi au centime supérieur. |
| Objectif : date estimée | Aujourd’hui + ⌈restant ÷ contribution mensuelle⌉ mois. |
| Estimation à 7, 15 et 30 jours | Solde de « Mon compte » − charges passées pas encore payées + revenus prévus − charges prévues − dépenses courantes estimées (rythme du mois dès le 7ᵉ jour, sinon limites prévues ÷ jours du mois). Estimation indicative ; le point le plus bas est signalé. |
| À faire | Limite dépassée ou à 90 %, rythme qui ferait finir le mois dans le rouge, prélèvement aujourd’hui ou demain, dépense des 7 derniers jours au moins 3 fois supérieure à la médiane de sa catégorie (90 jours, au moins 4 dépenses, 30 € minimum), épargne du mois incomplète à partir du 10, sauvegarde absente ou de plus de 30 jours. 3 actions au maximum, par priorité ; « Ignorer » la masque jusqu’au mois suivant. |
| **Revenu attendu** | Compté nulle part (solde, budget, historique) tant qu’il n’est pas confirmé. Projection optimiste : montant estimé (bas de la fourchette), 0 si le montant est inconnu, seulement si la case est cochée. |
| **Épargne totale / disponible** | Totale : somme des supports (solde déclaré + versements liés depuis sa date). Disponible : sans les supports bloqués (PEL, épargne salariale… ou date de blocage non atteinte). |
| **Projection (Mon plan)** | En trésorerie, de demain jusqu’à la date de l’objectif, avec les **vraies dates** (la règle du 20 ne s’applique pas : un salaire du 28 juillet ou un revenu du 31 juillet compte pour un objectif au 31 juillet). Par mois : revenus sûrs encaissés sur le compte − charges fixes − dépenses courantes (reste du budget pour le mois en cours, budget ensuite, ou plus si des dépenses sont déjà prévues) − dépenses exceptionnelles. Point de départ : le total des supports aujourd’hui. Titres-restaurant et sommes bloquées affichés à part, hors calcul. Épargne nécessaire = reste ÷ mois restants (mois en cours compris), arrondi au centime supérieur. |
| **Bilan du mois** (Mon plan) | Épargne réelle − épargne déjà enregistrée → un versement du complément ; dépenses réelles − dépenses déjà saisies → « Autres dépenses du mois » ; revenus attendus reçus → confirmés au montant réel. Rien n’est créé si tout est à jour. |
| Simulateur | *Déséquilibre* si le solde devient négatif ; *prudence* si l’achat entame l’épargne prévue du mois, fait dépasser une limite ou dépasse la moitié du solde disponible ; sinon *confortable*. |

## Limites actuelles

- **Poksy** ne comprend que des questions proches de celles qu’il connaît (70 fiches, recherche par mots-clés) : une question formulée très différemment reçoit le message « Je n’ai pas encore trouvé la réponse exacte ». Il ne garde pas la conversation après un rechargement de la page.
- Les données sont liées **à un seul navigateur sur un seul appareil** (pas de synchronisation entre téléphone et ordinateur ; utiliser export / import JSON).
- Le `localStorage` est limité à quelques mégaoctets (largement suffisant pour plusieurs années de saisies manuelles).
- Supprimer un revenu ou une charge récurrente le retire aussi des mois passés : pour l’arrêter seulement à partir d’une date, il faut renseigner une **date de fin**.
- Les dépenses récurrentes variables (ex. : courses hebdomadaires automatiques) ne sont pas gérées ; seules les charges fixes et revenus peuvent être récurrents.
- Deux comptes seulement (compte bancaire et carte restaurant) ; les livrets et plans sont suivis comme **supports d’épargne** (« Mon plan »), sans relevé détaillé ; pas de plusieurs devises simultanées ni de dépenses partagées.
- **Pas de connexion à la banque ni à Apple Pay**, volontairement : cela demanderait un prestataire agréé (DSP2), un serveur et l’envoi des données hors de l’appareil. Le bouton « Ajuster le solde » permet de recaler le solde à la main en quelques secondes.
- Les limites budgétaires concernent les dépenses variables (pas les charges fixes).
- Pas d’import de relevés bancaires (CSV de banque) — volontairement, pour cette première version.
- L’application s’installe sur l’écran d’accueil mais a besoin d’une connexion pour s’ouvrir (pas encore de fonctionnement hors ligne).

## Améliorations possibles (version 2)

**Poksy avec une véritable IA (plus tard, à décider)** : seulement avec l’accord explicite de la personne, un modèle **exécuté sur l’appareil** de préférence (rien ne quitte le téléphone) ; sinon un service externe choisi pour sa confidentialité, sans envoyer les montants ni l’historique, avec une mention claire avant chaque envoi. Garder les réponses préparées comme base vérifiée (une IA peut se tromper), refuser tout conseil en placement ou en crédit, et tester les réponses sur une liste de questions types.


1. **Fonctionnement hors ligne** : l’application s’installe déjà sur l’écran d’accueil ; il resterait à la faire fonctionner sans connexion (service worker).
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

## Installer SoldeClair comme une application

SoldeClair peut s’installer sur l’écran d’accueil d’un téléphone et s’ouvrir en plein écran, comme une application, **sans App Store ni Play Store, gratuitement** (manifeste web `public/manifest.webmanifest`, icônes 192 px, 512 px et « masquable »). Le guide est aussi dans **Paramètres → Installer comme une application**.

- **iPhone / iPad (Safari)** : faire une sauvegarde complète (JSON), puis bouton Partager → « Sur l’écran d’accueil », garder l’option d’ouverture en app web activée → « Ajouter ».
- **Android (Chrome)** : sauvegarde complète (JSON), puis menu ⋮ → « Installer l’application ».

L’application installée a **sa propre mémoire**, séparée de celle du navigateur : au premier lancement, importer la sauvegarde JSON (« Importer une sauvegarde »). Une vraie application de l’App Store demanderait un compte développeur Apple payant ; elle n’est donc pas prévue.

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

