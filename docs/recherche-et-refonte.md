# SoldeClair — recherche, audit et refonte « Financial »

Rapport du 2 novembre 2026, branche `claude/sweet-noether-l08fhm` (pull request #1).

Légende utilisée partout : **[V]** problème vérifié dans le navigateur · **[R]** amélioration inspirée des recherches · **[H]** hypothèse à valider avec de vrais utilisateurs.

## Limites de la recherche (à lire en premier)

- L'environnement de travail bloque l'ouverture directe des sites externes (par exemple `nngroup.com` et `design-system.service.gov.uk` ont été refusés). Les sources ci-dessous ont été étudiées **à partir des résultats et extraits du moteur de recherche**, pas en lisant chaque page en entier. Pour lever cette limite, il faut autoriser ces domaines dans les réglages réseau de l'environnement.
- Les **vidéos n'ont pas été visionnées** : seuls leurs titres et descriptions étaient accessibles. Elles servent d'indices, pas de preuves.
- Beaucoup d'avis sur les applications viennent de sites affiliés ; ils sont signalés comme tels.
- Aucune application concurrente n'a été installée ni utilisée ; aucun design, texte ou code n'a été copié.

## 1. Sources consultées

### Applications et sites de budget (9)

| Application | Lien et date | Éléments intéressants | Limites observées | À adapter | À ne pas reproduire |
|---|---|---|---|---|---|
| YNAB | [NerdWallet](https://www.nerdwallet.com/finance/learn/ynab-app-review), [ynab.com](https://www.ynab.com/), [Capterra 2026](https://www.capterra.com/p/234230/You-Need-A-Budget/reviews) | Méthode claire, chaque euro a un rôle ; objectifs pré-remplis à l'inscription | Courbe d'apprentissage raide ; indicateur « Age of Money » jugé confus | Objectifs pré-remplis selon le profil (déjà fait) | Méthode imposée, jargon propriétaire |
| PocketGuard | [The Penny Hoarder 2026](https://www.thepennyhoarder.com/budgeting/pocketguard-review/), [Motley Fool](https://www.fool.com/money/personal-finance/pocketguard-review) | Un seul chiffre « ce que vous pouvez dépenser » | Formule de calcul non publique ; chiffre parfois faux | Un chiffre principal **avec son calcul expliqué** | Calcul opaque |
| Goodbudget | [CNBC](https://www.cnbc.com/select/goodbudget-app-review/), [PCWorld](https://www.pcworld.com/article/3287145/goodbudget-review.html) | Saisie manuelle simple, adaptée aux débutants | Saisie quotidienne fastidieuse | Saisie rapide en peu d'étapes | — |
| Monarch Money | [The Penny Hoarder 2026](https://www.thepennyhoarder.com/budgeting/monarch-money-review/), [Experian](https://experian.com/blogs/ask-experian/monarch-money-review/) | Projection du solde, calendrier des factures | Prévisions de factures parfois fausses ; tableau de bord très personnalisable donc chargé | Prochaines charges visibles (déjà fait) | Widgets à composer soi-même |
| Copilot Money | [Vidéo 2026](https://www.youtube.com/watch?v=_iwE1_kXHV8), [beancount.io](https://beancount.io/forum/t/copilot-vs-monarch-vs-ynab-which-premium-budget-app-is-worth-it/98) | Sans publicité, chiffrement | Payant, iOS d'abord | Discours de confiance clair | — |
| Actual Budget | [Finny 2026](https://getfinny.app/blog/actual-budget-review-2026), [AlternativeTo](https://alternativeto.net/software/actual-budget/about) | **Données locales**, gratuit, open source, fonctionne hors connexion | Auto-hébergement technique pour synchroniser | Stockage local + sauvegarde (déjà le modèle de SoldeClair) ; hors connexion pour une V2 | Synchronisation qui exige un serveur |
| Bankin' | [La Fabrique du Net, mise à jour 25 sept. 2026](https://www.lafabriquedunet.fr/logiciels/gestion/budget-personnel/) | Prévision à 30 jours | Agrégation bancaire (hors périmètre) | Prévision de fin de mois (déjà fait) | Connexion bancaire |
| Linxo | [Empruntis](https://www.empruntis.com/rachat-credits/simulation-rachat-credits/reste-a-vivre/applications-gestion-budget/linxo-avis/), [Finary](https://finary.com/fr/budget/linxo-vs-finary) | Interface jugée simple | Personnalisation limitée, fonctions clés en Premium | Catégories modifiables gratuitement (déjà fait) | Fonctions essentielles payantes |
| Revolut (option « masquer le solde ») | [Aide Revolut](https://help.revolut.com/en-AU/help/profile-and-plan/security-and-personal-data/why-is-my-balance-blurry) | Montants floutés d'un geste | Geste caché, difficile à découvrir | Option « masquer les montants » visible (**à valider**) | Geste caché |

### Articles, guides et référentiels (8)

| Source | Lien et date | Enseignement | Limite | Appliqué à SoldeClair |
|---|---|---|---|---|
| NN/g, tutoriels mobiles (étude sur 70 personnes) | [nngroup.com](https://www.nngroup.com/articles/mobile-tutorials/) (date non affichée) | Les tutoriels d'accueil n'améliorent ni la réussite ni la vitesse ; préférer l'aide en contexte | Petit échantillon, 4 applications | Aide « Comment est-ce calculé ? » à l'endroit où la question se pose |
| NN/g, visualisations pour tableaux de bord | [nngroup.com](https://www.nngroup.com/videos/data-visualizations-dashboards/) | Longueur et position pour comparer ; couleur réservée au signal important | Vidéo non visionnée, résumé seulement | Barres horizontales, une couleur de valeur |
| Divulgation progressive (IxDF, citant NN/g) | [ixdf.org](https://ixdf.org/literature/topics/progressive-disclosure) | Montrer l'essentiel, déplacer le secondaire | Source secondaire | Calcul détaillé replié ; réorganisation du tableau de bord proposée |
| GOV.UK Design System, messages d'erreur | [design-system.service.gov.uk](https://design-system.service.gov.uk/components/error-message) | Dire ce qui ne va pas et comment corriger, sans « invalide » ni couleur seule | Lu via des résumés | Messages existants conformes ; alertes avec piste d'action |
| W3C, nouveautés WCAG 2.2 | [w3.org](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/) | Cibles d'au moins 24 px, focus jamais masqué | — | Cibles de 40 à 44 px, contrôle axe-core WCAG 2.1 AA |
| RGAA 4.1.2 (DINUM) | [accessibilite.numerique.gouv.fr](https://accessibilite.numerique.gouv.fr/doc/RGAA-v4.1.2.odt) | Référentiel français, 106 critères | Ne couvre pas les applications natives | Contrastes, libellés, structure |
| Money and Mental Health, normes d'accessibilité | [moneyandmentalhealth.org](https://www.moneyandmentalhealth.org/press-release/mental-health-accessible-pressrelease/) (2019) et [rapport LSB, oct. 2025](https://www.lendingstandardsboard.org.uk/financial-services-sector-must-improve-its-online-support-for-people-with-money-and-mental-worries/) | 4 personnes sur 10 souffrant de troubles psychiques ont une « anxiété administrative » | Contexte britannique | Alertes moins anxiogènes, avec une action possible |
| Avis d'utilisateurs (Reddit, archives) | [exemple](https://reddit.sentinel-team.org/posts/1pp2tk7/snapshots/2025-12-18T23%3A51%3A31.88221Z) (déc. 2025 à mai 2026) | La saisie manuelle est le premier motif d'abandon ; trop de catégories et de champs | Témoignages individuels | Saisie rapide, catégories courtes, bouton « + » proposé |

### Vidéos (titres et descriptions uniquement)

| Vidéo | Lien | Intérêt supposé | Limite |
|---|---|---|---|
| UX for Fintech: Build Trust, Not Confusion | [YouTube](https://www.youtube.com/watch?v=6r5o7a0ha20) | Confiance et simplicité | Non visionnée |
| Fintech Onboarding Friction: Why Users Drop Off | [YouTube](https://www.youtube.com/watch?v=k-tVdyxs4WM) | Abandon pendant l'inscription | Non visionnée |
| YNAB Tutorial & Honest Review (2025) | [YouTube](https://www.youtube.com/watch?v=6smi9S8Rm7s) | Prise en main de YNAB | Non visionnée |
| PocketGuard Review | [YouTube](https://www.youtube.com/watch?v=i1HyI_BjYwg) | Le chiffre « In My Pocket » | Non visionnée |
| Copilot Money Review 2026 | [YouTube](https://www.youtube.com/watch?v=_iwE1_kXHV8) | Tableau de bord, catégories | Non visionnée |
| 5 Applications de Gestion de Budget Gratuites | [YouTube](https://www.youtube.com/watch?v=gg6sfkazXLY) | Point de vue francophone | Non visionnée |

## 2. Synthèse comparative

| Critère | Ce que font bien les meilleures | Points de confusion relevés | Position de SoldeClair |
|---|---|---|---|
| Première utilisation | Questions courtes, catégories pré-remplies | Tutoriels longs, méthode à apprendre (YNAB) | 6 étapes courtes, ~13 actions ; démonstration en 2 actions |
| Création du profil | Pré-remplissage selon la situation | Champs inutiles | Catégories selon le profil (étudiant, alternant…) |
| Saisie d'une dépense | 2 à 3 gestes | Saisie quotidienne fastidieuse | 3 actions depuis l'accueil ; 4 à 5 depuis une autre page |
| Solde et reste à vivre | Un chiffre principal | Calcul opaque (PocketGuard) | Phrase + chiffre par jour **et** calcul détaillé |
| Charges fixes | Calendrier, prochaines échéances | Prévisions fausses (Monarch) | Échéances calculées, statut payé / à venir |
| Budgets par catégorie | Seuils visuels | Couleur seule | Seuils 75/90/100 % avec texte et icône |
| Objectifs d'épargne | Progression, date estimée | — | Effort mensuel et date estimée |
| Graphiques | Barres simples | Graphiques décoratifs | 4 graphiques utiles, chacun avec vue tableau |
| Mobile | Barre de navigation basse | — | Barre basse à 4 pages + « Plus » |
| Alertes | Proches de l'action | Ton anxiogène | Ton neutre, montant restant et piste d'action |
| Confidentialité | Discours clair | Agrégation bancaire obligatoire | Local, sans compte ni banque, sauvegarde mise en avant |
| Trop complexe ou inutile | — | Widgets à composer, indicateurs abstraits, fonctions payantes | Écartés |

## 3. Audit de SoldeClair (version de production, navigateur réel)

Conditions : Chromium 1.63, date simulée au 12 novembre 2026, profils fictifs. Chargement : 0,4 s sur ordinateur et 1,5 s sur smartphone ralenti (processeur ×4, réseau 4G lente). Aucune erreur dans la console.

**Forces** : le reste à vivre est visible dès l'ouverture ; les calculs sont exacts (centimes entiers) ; l'accessibilité était déjà bonne (WCAG AA) ; l'affichage tient dès 320 px.

**Problèmes vérifiés [V]**

1. Graphique d'épargne d'un nouvel utilisateur : graduations en double (« 1 €, 1 €, 0 € ») et dates superposées (« oct. 26nov. 26 »). Le code permettait aussi qu'une barre dépasse en haut du graphique. → capture [graphique-epargne-vide.jpg](captures/graphique-epargne-vide.jpg)
2. Séparateur des milliers presque invisible avec certaines polices (« 1200,00 € »).
3. Historique sur mobile : le champ de recherche était sous 3 listes déroulantes (à 599 px du haut).
4. Paramètres sur mobile : la sauvegarde JSON était à 2 710 px du haut, après le profil et les catégories.
5. Revenus : « Récurrent » coché par défaut, sans explication de la conséquence (risque de compter une prime tous les mois).
6. Notifications empilées qui masquaient le contenu lors de saisies successives.
7. Alertes factuelles, sans piste d'action ; prévision formulée de façon alarmante.
8. « Budget consommé : 68 % » : expression floue.
9. États vides sans bouton d'action (dépenses, revenus, charges).
10. Configuration : la démonstration n'était visible qu'en faisant défiler l'écran sur mobile.
11. Tableau de bord mobile chargé : 30 montants, 8 tuiles, 3 458 px de haut → corrigé après votre accord : 4 chiffres + « Détail du mois » (section 6).
12. Budgets d'un nouvel utilisateur : longue suite de cartes « Pas de limite » identiques → corrigé après votre accord : liste compacte (section 6).

## 4. Parcours utilisateurs simulés (étapes = clics, saisies ou choix)

| # | Parcours | Étapes avant | Étapes après | Difficulté relevée | Priorité |
|---|---|---|---|---|---|
| 1 | Profil étudiant | 13 | 13 | Aucune | — |
| 2 | Profil alternant | 13 | 13 | Aucune | — |
| 3 | Démonstration | 2 | 2 | Bouton hors écran sur mobile → lien ajouté en haut | Moyenne |
| 4 | Ajouter un revenu | 7 | 7 | « Récurrent » par défaut, Revenus dans « Plus » → libellés et aide | Moyenne |
| 5 | Dépense depuis l'accueil | 4 | 4 | Bouton « + » ajouté après votre accord (section 6) : 1 geste pour ouvrir le formulaire depuis toute page | Appliqué |
| 6 | Charge fixe ajoutée puis modifiée | 11 | 11 | Aucune | — |
| 7 | Limite budgétaire | 4 | 4 | Aucune | — |
| 8 | Alertes 75 / 90 / dépassement | 12 | 12 | Alertes sans piste d'action → montant restant ajouté | Moyenne |
| 9 | Créer un objectif | 6 | 6 | Aucune | — |
| 10 | Versement | 3 | 3 | Aucune | — |
| 11 | Achat raisonnable | 3 | 3 | Aucune | — |
| 12 | Achat déséquilibrant | 1 | 1 | Aucune | — |
| 13 | Navigation entre les mois | 5 | 5 | Aucune | — |
| 14 | Recherche dans l'historique | 3 | 3 | Champ placé bas (599 px → 371 px) | Moyenne |
| 15 | Export CSV | 1 | 1 | Aucune | — |
| 16 | Export JSON | 3 | 3 | Bouton très bas (2 710 px → 833 px) | Haute |
| 17 | Effacer puis restaurer | 5 | 5 | Restauration exacte vérifiée | — |
| 18 | Thèmes | 5 | 5 | Aucune | — |
| 19 | Smartphone (tour des pages) | 14 | 14 | Aucun débordement | — |
| 20 | Dépense au clavier seul | 15 | 16 | Une tabulation de plus (nouvelle aide « Comment est-ce calculé ? ») ; le lien « Aller au contenu » reste le raccourci | Faible |

Les 20 parcours réussissent avant et après les modifications, sans erreur dans la console.

## 5. Améliorations appliquées

| Problème | Solution | Pages | Difficulté / risque | Source ou bonne pratique |
|---|---|---|---|---|
| [V1] Graphique vide illisible | Graduations en euros entiers couvrant toujours le maximum, dates jamais superposées, message explicatif si aucune donnée | Objectifs, accueil, bilan | Faible | NN/g (visualisation) |
| [V2] Milliers peu lisibles | Espace insécable normale + chiffres tabulaires | Toutes | Faible | Lisibilité |
| [V3] Recherche trop basse | Recherche en premier filtre | Historique | Faible | Divulgation progressive |
| [V4] Sauvegarde trop loin | Section « Sauvegarder mes données » en tête, date de dernière sauvegarde, rappel si aucune depuis 30 jours | Paramètres | Faible | Actual Budget (données locales) |
| [V5] Revenu récurrent ambigu | « Récurrent (salaire, bourse…) » / « Exceptionnel (prime, vente…) » + phrase de conséquence | Revenus | Faible | GOV.UK (langage clair) |
| [V6] Notifications empilées | Une seule notification visible | Toutes | Faible | — |
| [V7] Alertes anxiogènes | Montant restant, piste d'action, formulation conditionnelle | Accueil | Faible | Money and Mental Health |
| [V8] Terme flou | « 68 % des revenus déjà dépensés » | Accueil | Faible | Langage clair |
| [R] Calcul invisible | « Comment est-ce calculé ? » avec les chiffres réels du mois | Accueil | Faible | NN/g (aide en contexte), PocketGuard (contre-exemple) |
| [V9] États vides passifs | Bouton d'action dans l'état vide | Dépenses, revenus, charges | Faible | Bonnes pratiques des états vides |
| [V10] Démo cachée | Lien « Essayer avec un profil de démonstration » | Configuration | Faible | NN/g (éviter le tutoriel) |
| Défauts trouvés en cours de route | Typographie « 79 % » insécable ; date intégrée à la sauvegarde pour une restauration exacte ; barre de graphique qui pouvait dépasser | Plusieurs | Faible | Tests automatisés |

### Refonte visuelle « Financial »

- Fond bleu nuit presque noir, panneaux opaques séparés par des filets fins, actions orange chaud, montants importants or pâle.
- IBM Plex Sans pour le texte, IBM Plex Mono pour les chiffres et métadonnées. Les polices sont **hébergées avec l'application** (aucune requête vers Google), en sous-ensemble latin.
- Accueil : phrase du reste à vivre à gauche, panneau encadré à droite avec les **vrais chiffres du mois** (aucun montant inventé), contours fins décalés et lumière chaude discrète.
- Configuration : énoncé à gauche (« Gérez votre budget personnel, simplement. », tiré de la description existante) et parcours encadré à droite.
- Boutons en pilule, onglets segmentés, étapes reliées par un filet, grilles de chiffres réglées.
- Thème sombre par défaut ; mode clair conservé, avec des couleurs ajustées pour le contraste ; mode automatique conservé.
- Mouvement réduit respecté (aucune transition).

Captures : [tableau de bord, ordinateur](captures/tableau-de-bord-ordinateur.jpg) · [tableau de bord, mobile](captures/tableau-de-bord-mobile.jpg) · [historique, mobile](captures/historique-mobile.jpg) · [paramètres, mobile](captures/parametres-mobile.jpg) · [graphique vide](captures/graphique-epargne-vide.jpg)

## 6. Améliorations soumises à votre accord

| Proposition | Problème | Bénéfice attendu | Risque | Décision |
|---|---|---|---|---|
| Bouton « + » central dans la barre mobile | La saisie depuis une autre page que l'accueil demande 4 à 5 actions | Saisie en 1 geste depuis n'importe quelle page (motif d'abandon n° 1 selon les avis) | Change la navigation : « Objectifs » passe dans « Plus » | **Appliquée** — bouton orange au centre de la barre du bas ; « Ajouter une dépense » en haut de la barre latérale sur ordinateur |
| Catégories fréquentes en raccourcis dans la saisie | Liste déroulante à ouvrir | 1 geste de moins | Ajoute des éléments à l'écran | **Appliquée** — 4 catégories les plus utilisées sur 90 jours, sous la liste des catégories |
| Masquer les montants | Utilisation en public | Discrétion | Un bouton de plus | **Appliquée** — icône œil dans la barre du haut (mobile) et la barre latérale ; choix mémorisé et inclus dans la sauvegarde |
| Rappel de sauvegarde sur l'accueil | Seul risque majeur d'un stockage local : perdre ses données | Moins de pertes de données | Encombre l'accueil si mal dosé | **Non retenue** — le rappel reste dans Paramètres (date de la dernière sauvegarde, rappel au-delà de 30 jours) |
| Accueil limité à 4 chiffres + « Détail du mois » | 30 montants visibles sur mobile | Lecture plus rapide | Change les habitudes ; aucune information supprimée | **Appliquée** — revenus, total des dépenses, solde disponible, épargné ; le reste dans « Détail du mois » |
| Budgets sans limite regroupés en une liste compacte | Longue suite de cartes identiques | Page plus courte | Réorganise une page | **Appliquée** — liste « Catégories sans limite » avec un bouton « Fixer une limite » par ligne |

## 7. Changements à éviter

Synchronisation bancaire, compte en ligne, intelligence artificielle de catégorisation, badges et ludification, tableau de bord à composer soi-même, indicateurs abstraits (« âge de l'argent »), méthode budgétaire imposée, tutoriel obligatoire au démarrage, fonctions essentielles payantes, graphiques supplémentaires sans question précise.

## 8. Recommandations pour une version 2

1. Application installable et utilisable hors connexion (PWA).
2. Export chiffré facultatif.
3. Tester le bouton « + », les catégories fréquentes et l'accueil allégé auprès de quelques utilisateurs.
4. Ajouter `npm run test:e2e` à la publication automatique.
5. Dépenses récurrentes variables et modèles de saisie.
6. Tests avec de vrais utilisateurs (5 personnes par profil suffisent pour repérer l'essentiel), sur un iPhone et un Android réels, et avec un lecteur d'écran.
7. Traductions et adaptation des catégories par pays.
