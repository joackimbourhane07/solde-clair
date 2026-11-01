# SoldeClair

**SoldeClair** est une application web de gestion de budget personnel, simple et rassurante, pensée pour toutes et tous : étudiants, alternants, salariés, indépendants et personnes qui découvrent la gestion budgétaire.

Elle répond à une question essentielle : **« Combien me reste-t-il pour finir le mois, et combien puis-je dépenser par jour ? »**

> Exemple affiché sur le tableau de bord : « Il vous reste 540 € pour terminer le mois, soit environ 18 € par jour. »

Toutes les données restent **dans votre navigateur**. Aucun compte, aucune banque, aucun serveur.

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
| **Configuration initiale** | Parcours en 6 étapes : prénom ou pseudonyme, situation (étudiant, alternant, salarié, indépendant, autre), devise (euro par défaut), revenu principal et revenus complémentaires, charges fixes, estimation des dépenses variables, objectif d’épargne mensuel, objectif à long terme, choix des catégories proposées selon le profil. Possibilité de charger une démonstration ou d’importer une sauvegarde. |
| **Tableau de bord** | Reste à vivre total et par jour, jours restants, revenus, charges fixes (payées / à venir), dépenses variables, total des dépenses, solde disponible, montant épargné et objectif du mois, % du budget consommé, prévision de fin de mois, alertes, dernières transactions, prochaines charges, **ajout rapide d’une dépense**, graphiques. Navigation de mois en mois. |
| **Revenus** | Ajout, modification, suppression. Nom, montant, date, catégorie, récurrent ou exceptionnel, fréquence, date de fin facultative, note. |
| **Dépenses** | Ajout, modification, suppression, recherche et filtre par catégorie. Montant, catégorie, date, description et moyen de paiement facultatifs. |
| **Charges fixes** | Ajout, modification, suppression. Nom, montant, date de prélèvement, catégorie, fréquence (hebdomadaire à annuelle), statut **payé / à venir** modifiable pour chaque échéance, note. |
| **Budgets par catégorie** | Limite mensuelle par catégorie : prévu, dépensé, restant, pourcentage, barre de progression avec repères à 75 % et 90 %. Alertes à **75 %**, **90 %** et en cas de **dépassement**, signalées par un texte et une icône (pas seulement par la couleur). |
| **Objectifs d’épargne** | Plusieurs objectifs : nom, description, montant cible, montant déjà disponible, date souhaitée, priorité, contribution mensuelle. Calcul automatique du restant, des mois restants, du montant mensuel nécessaire, du pourcentage et de la date d’atteinte estimée. Enregistrement des versements. |
| **Simulateur d’achat** | Solde après achat, nouveau reste à vivre quotidien, impact sur l’épargne du mois, impact sur chaque objectif, dépassement éventuel d’une catégorie, et appréciation : *situation confortable*, *achat possible avec prudence* ou *achat susceptible de déséquilibrer le budget* (indication budgétaire, pas un conseil financier). |
| **Historique et bilan** | Historique complet avec recherche et filtres (période, dates, type, catégorie), bilan mensuel (revenus, charges, dépenses, épargne, solde final, catégories les plus coûteuses, budgets dépassés), comparaison avec le mois précédent, export CSV. |
| **Paramètres** | Profil, devise, objectif d’épargne, thème clair / sombre / automatique, catégories (ajouter, renommer, supprimer), export CSV, sauvegarde JSON, import JSON, données de démonstration, effacement total avec **double confirmation**. |

**Graphiques** (lisibles sur smartphone, avec une vue « tableau » accessible pour chacun) :
répartition des dépenses par catégorie, revenus et dépenses sur 6 mois, évolution du solde au cours du mois, évolution de l’épargne, progression des objectifs.

**Accessibilité** : libellés sur tous les champs, messages d’erreur explicites reliés aux champs, navigation complète au clavier (lien d’évitement, fenêtres qui gardent le focus et se ferment avec Échap, graphiques parcourables avec les flèches), contrastes renforcés, zones tactiles d’au moins 44 px, montants signés « + / − », états des budgets indiqués par texte + icône + hachures, respect de « réduire les animations ».

## Technologie utilisée

- **React 19 + TypeScript**, outillé par **Vite 7**.
- **React Router** (mode `HashRouter`) pour la navigation.
- **localStorage** pour la sauvegarde locale.
- **Vitest + Testing Library** pour les tests.
- Graphiques en **SVG faits maison** (aucune bibliothèque de graphiques).

**Pourquoi ce choix ?**

- **Aucun serveur nécessaire** : c’est une application 100 % statique. `npm run build` produit un dossier `dist/` qu’on peut ouvrir sur n’importe quel hébergement gratuit (GitHub Pages, Netlify, Cloudflare Pages…) plus tard, si vous le souhaitez. Le mode `HashRouter` et l’option `base: './'` évitent toute configuration serveur.
- **Gratuit et stable** : uniquement des outils open source très répandus, sans service payant.
- **Facile à maintenir** : TypeScript détecte les erreurs avant l’exécution ; les calculs sont des fonctions pures, séparées de l’interface et testées.
- **Fiable pour l’argent** : tous les montants sont stockés **en centimes (nombres entiers)** pour éviter les erreurs d’arrondi (0,1 + 0,2 ≠ 0,3 en informatique).
- **Léger** : peu de dépendances, environ 120 Ko compressés.

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

**127 tests** couvrent notamment :

- la saisie et l’arrondi des montants (virgule, espaces, deux décimales, 0,1 + 0,2) ;
- les dates (années bissextiles, fins de mois, passage d’année, jours restants) ;
- les échéances récurrentes (hebdomadaires à annuelles, date de fin, jour 31) ;
- le **total des revenus**, le **total des charges fixes**, le **total des dépenses variables** ;
- le **solde disponible** et le **reste à vivre quotidien** (y compris négatif, dernier jour du mois) ;
- les **changements de mois** (mois passé, en cours, futur) et la comparaison avec le mois précédent ;
- les **limites par catégorie** (seuils exacts 75 %, 90 %, 100 %) et les alertes ;
- les **objectifs d’épargne** (mois restants, effort mensuel, date estimée, objectif atteint, date dépassée) ;
- le **simulateur d’achat** (trois appréciations, impact sur l’épargne, sur une catégorie, sur les objectifs) ;
- les **exports CSV et JSON**, l’**import** (aller-retour sans perte, fichiers invalides refusés avec un message clair, protection contre les formules dans les tableurs) ;
- les **données de démonstration** (validité, cohérence, plusieurs mois d’historique) ;
- l’interface : parcours de configuration complet, ajout rapide, **modification et suppression** avec confirmation, messages d’erreur, statut des charges, limites, simulateur, import, effacement en deux étapes, thème, filtres de l’historique, bilan.

## Organisation des fichiers

```
solde-clair/
├── index.html                 Page HTML d’entrée
├── package.json               Dépendances et commandes
├── vite.config.ts             Configuration Vite et Vitest
├── tsconfig.json              Configuration TypeScript
├── public/favicon.svg         Icône
└── src/
    ├── main.tsx               Démarrage de l’application
    ├── App.tsx                Pages et navigation
    ├── types.ts               Modèle de données (montants en centimes)
    ├── lib/                   Logique métier, sans interface (testée)
    │   ├── money.ts           Saisie, affichage et calculs de montants
    │   ├── dates.ts           Manipulation des dates et des mois
    │   ├── recurrence.ts      Échéances des revenus et charges récurrents
    │   ├── budget.ts          Totaux, solde, reste à vivre, budgets, alertes, bilan
    │   ├── goals.ts           Objectifs d’épargne
    │   ├── simulator.ts       Simulateur d’achat
    │   ├── categories.ts      Catégories proposées selon le profil
    │   ├── setup.ts           Création des données après la configuration
    │   ├── demo.ts            Trois profils de démonstration fictifs
    │   ├── storage.ts         Sauvegarde locale, validation, exports CSV / JSON
    │   ├── id.ts              Identifiants uniques
    │   └── __tests__/         Tests des calculs
    ├── state/AppState.tsx     État global, sauvegarde automatique, thème
    ├── components/            Éléments d’interface réutilisables
    │   ├── ui.tsx             Boutons, champs, cartes, fenêtres, barres…
    │   ├── forms.tsx          Formulaires (dépense, revenu, charge, objectif, versement)
    │   ├── Layout.tsx         Navigation (barre latérale / barre du bas sur mobile)
    │   ├── Icon.tsx           Icônes
    │   └── charts/Charts.tsx  Graphiques SVG
    ├── pages/                 Une page par écran
    ├── styles/global.css      Styles, modes clair et sombre, responsive
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

- Les données sont enregistrées **uniquement dans le navigateur** (`localStorage`, clé `soldeclair:donnees:v1`), sur l’appareil utilisé.
- **Aucun compte**, **aucune synchronisation bancaire**, **aucune coordonnée bancaire** demandée, **aucun paiement**.
- **Aucune donnée financière n’est envoyée** à un serveur : l’application ne fait aucun appel réseau une fois chargée.
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
| **Solde disponible** | Revenus − charges fixes − dépenses variables − épargne versée. |
| Jours restants | Jours jusqu’à la fin du mois, **aujourd’hui inclus** (0 pour un mois passé). |
| **Reste à vivre quotidien** | Solde disponible ÷ jours restants, arrondi au centime **inférieur** (jamais surestimé). Dans la phrase d’accueil, le reste est arrondi à l’euro inférieur et un dépassement à l’euro supérieur. |
| Budget consommé | (Charges fixes + dépenses variables) ÷ revenus. |
| Prévision de fin de mois | Revenus − charges − épargne − dépenses variables projetées : au rythme actuel à partir du 7ᵉ jour, sinon d’après les limites prévues (ou l’estimation du profil). |
| Statut d’une charge | « Payé » si sa date est passée, « À venir » sinon ; modifiable à la main pour chaque échéance. |
| Alerte de catégorie | ≥ 75 % : attention · ≥ 90 % : alerte · > 100 % : dépassement. |
| Objectif : mois restants | Mois calendaires jusqu’à la date souhaitée (au moins 1 si la date est dans le mois en cours). |
| Objectif : effort mensuel | Montant restant ÷ mois restants, arrondi au centime supérieur. |
| Objectif : date estimée | Aujourd’hui + ⌈restant ÷ contribution mensuelle⌉ mois. |
| Simulateur | *Déséquilibre* si le solde devient négatif ; *prudence* si l’achat entame l’épargne prévue du mois, fait dépasser une limite ou dépasse la moitié du solde disponible ; sinon *confortable*. |

## Limites actuelles

- Les données sont liées **à un seul navigateur sur un seul appareil** (pas de synchronisation entre téléphone et ordinateur ; utiliser export / import JSON).
- Le `localStorage` est limité à quelques mégaoctets (largement suffisant pour plusieurs années de saisies manuelles).
- Supprimer un revenu ou une charge récurrente le retire aussi des mois passés : pour l’arrêter seulement à partir d’une date, il faut renseigner une **date de fin**.
- Les dépenses récurrentes variables (ex. : courses hebdomadaires automatiques) ne sont pas gérées ; seules les charges fixes et revenus peuvent être récurrents.
- Pas de gestion de plusieurs comptes bancaires, de plusieurs devises simultanées ni de dépenses partagées.
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
9. **Comptes multiples** (courant, livret…) et transferts entre comptes.
10. **Bilan annuel** et graphiques sur 12 mois, export PDF du bilan.
11. **Tests de bout en bout automatisés** (Playwright) intégrés à une intégration continue GitHub Actions.
12. **Traductions** (anglais, espagnol…) et adaptation des catégories par pays.
