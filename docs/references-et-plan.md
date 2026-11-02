# SoldeClair — références, analyse et plan (version 2)

Ce document prépare la deuxième version de SoldeClair. Il présente l'analyse du site actuel, ce qui a été retenu de 20 références, les changements appliqués tout de suite (faible risque) et ceux qui attendent votre accord.

Légende : **[V]** constaté dans le navigateur · **[R]** idée tirée des recherches · **[H]** hypothèse à vérifier avec de vrais utilisateurs.

## 0. Limites (à lire en premier)

- L'environnement de travail **bloque l'ouverture directe** de notion.com, du site publié et des sites de référence. Les références ont été étudiées à partir des **résultats de recherche** : pages d'aide officielles quand elles existent, sinon analyses de tiers. Les sources sont listées en fin de document.
- **Aucun écran, texte, code, logo ni illustration** de ces services n'a été repris. Seules des bonnes pratiques générales ont été retenues.
- « Fais tes Comptes » : aucune source fiable trouvée ; l'idée retenue (saisie rapide, sans banque) repose sur les applications françaises comparables (Pilote Budget).
- Dribbble, Behance et Awwwards : la recherche a surtout renvoyé des galeries tierces ; ils n'ont servi qu'à confirmer une tendance (fond clair, cartes blanches, un seul accent).
- Le site publié a été vérifié **localement avec le même chemin** `/solde-clair/` (même construction que GitHub Pages).

## 1. Analyse du site actuel (captures « avant »)

Version analysée : celle en ligne (commit `1594e9d`), démo « Camille, salariée » au 12 novembre 2026. 77 captures, 4 largeurs (1440, 800, 390, 320 px), modes clair et sombre. **0 erreur console, 0 débordement horizontal.**

### Forces à conserver

- La phrase d'accueil « Il vous reste X € pour terminer le mois, soit environ Y € par jour » et le détail « Comment est-ce calculé ? ».
- Bouton « + » central, catégories fréquentes, masquage des montants, « Détail du mois ».
- Alertes déjà formulées avec une piste d'action, seuils 75 / 90 / 100 % signalés par texte + icône.
- Données uniquement sur l'appareil, sauvegarde visible dans les paramètres.
- Accessibilité vérifiée automatiquement (WCAG 2.1 AA) et navigation au clavier.

### Problèmes constatés

| # | Problème | Page | Constat |
|---|---|---|---|
| P1 | Thème noir et orange qui ne vous plaît pas ; fond sombre par défaut | Toutes | [V] Votre retour |
| P2 | Titre d'onglet trop long : « SoldeClair — budget personnel » | Toutes | [V] Votre retour |
| P3 | Chiffres en police à chasse fixe et petites étiquettes en capitales espacées : aspect « terminal », moins accueillant pour un débutant | Toutes | [V] |
| P4 | Répétitions sur l'accueil : le montant disponible apparaît 3 fois, le montant par jour 2 fois, les jours restants 2 fois | Tableau de bord | [V] |
| P5 | Sur mobile, les prochaines charges n'arrivent qu'après environ 2 300 px de défilement (page de 3 967 px) | Tableau de bord | [V] |
| P6 | Deux graphiques visibles en permanence sur l'accueil | Tableau de bord | [V] |
| P7 | Dans les objectifs, « 12 juil. 2027 (8 mois) » se coupe au milieu ; les montants se chevauchent visuellement à 390 px | Objectifs | [V] |
| P8 | Résumés à 3 chiffres dans une grille à 2 colonnes : une case vide grise | Budgets, charges, objectifs | [V] |
| P9 | Trop de boutons principaux colorés (2 par objectif + 2 en haut) : on ne sait plus lequel est important | Objectifs | [V] |
| P10 | 4 listes de filtres avant le premier mouvement ; aucun moyen de voir ou d'effacer les filtres actifs | Historique | [V] |
| P11 | 4 chiffres par carte de budget (prévu, dépensé, restant, utilisé) répétés sur 9 catégories | Budgets | [V] |
| P12 | Pas de page de présentation : un nouveau visiteur arrive directement dans un formulaire | Accueil | [V] Votre demande |

## 2. Références : ce qui a été observé, retenu et rejeté

| Référence | Observé (source) | Retenu pour SoldeClair | Rejeté |
|---|---|---|---|
| **Notion** | Page claire et aérée, une section = une idée + une illustration ; la complexité n'apparaît qu'à la demande ; états vides qui disent quoi faire | Fond blanc, beaucoup d'espace, sections repliables, une action claire dans chaque état vide, page d'accueil aérée | Personnages dessinés, textes, logo, mise en page exacte |
| **Stripe** | Listes avec statuts lisibles, filtres prédéfinis, nombre d'éléments par onglet | Chiffres alignés (chiffres tabulaires), statuts « Payé / À venir / Récurrent / Exceptionnel », filtres actifs visibles et effaçables | Densité d'un outil comptable professionnel |
| **Linear** | Refonte 2026 : navigation plus discrète, icônes plus petites, bordures adoucies, même structure d'en-tête partout | Navigation calme et identique partout, bordures fines, un seul accent coloré, contour de focus net | Densité pour développeurs, raccourcis clavier avancés |
| **Airbnb** | Écrans à une question, présentés comme des fiches successives | Une question principale par étape, choix en cartes, bouton principal évident, retour sans perte | Textes, illustrations |
| **Headspace** | Ton calme et sans jugement, félicitations discrètes | Messages utiles, rouge réservé aux dépassements, félicitations courtes | Univers enfantin, personnages |
| **Apple Santé** | Résumé d'abord, « Tendances » et « Faits marquants » limités, « Tout afficher » | Une carte « Situation du mois » + une phrase de tendance, détails à la demande | Multiplication des cartes |
| **Google Agenda** | Vue « Planning » : liste chronologique par jour | Liste « À venir » : aujourd'hui, cette semaine, plus tard ; résumé « Dans les 7 prochains jours… » | Vrai calendrier en grille |
| **Todoist** | Vue « Aujourd'hui » : peu d'éléments, triés par urgence | 3 actions utiles au maximum (ajuster une limite, faire une sauvegarde…) | Gestionnaire de tâches, priorités P1-P4 |
| **Duolingo** | Petites étapes et progrès visibles ; critiques sur la pression des séries | Pourcentage atteint, montant restant, « prochaine petite étape » | Flammes, vies, classements, culpabilisation |
| **Revolut** | Masquage du solde (geste caché), comptes masqués | Bouton visible pour masquer les montants (déjà fait), ajout rapide au pouce | Promotions, crypto, trading |
| **Apple Wallet** | Une carte en tête, empilement clair, usage à une main | Une carte principale pour le disponible, le reste dessous, grands boutons | Cartes bancaires dessinées |
| **Plausible** | Une seule page, pas de menus ni de rapports à créer | 4 chiffres maximum visibles, un graphique, pas de répétition | — |
| **PocketGuard** | « In My Pocket » = revenus − factures − épargne − dépenses en cours | Le disponible réel reste l'information n° 1, avec son calcul expliqué | Connexion bancaire, offre payante |
| **Pilote Budget** | Saisie manuelle, anonyme, centrée sur le reste à vivre | Saisie manuelle rapide, explication simple des charges fixes / variables | — |
| **Fais tes Comptes** | Aucune source fiable trouvée | Saisie en très peu d'étapes, sauvegarde visible, données sur l'appareil | Dictée, photo de ticket, import automatique (non demandés) |
| **YNAB** | « Ready to Assign » : donner un rôle à chaque euro jusqu'à 0 | Répartition **facultative** du revenu, montant restant à répartir | Méthode stricte obligatoire, jargon |
| **Goodbudget** | Chaque enveloppe montre son solde restant et le montant prévu | Mettre le **restant** en avant dans chaque budget, en une phrase | Vocabulaire « enveloppe » imposé |
| **Fintur / Linxo** | Prévision du solde sur 30 jours (souvent payante) | Estimation à 7, 15 et 30 jours, clairement signalée comme estimation | IA, connexion bancaire |
| **Mobbin / Pageflows** | Les parcours longs réussissent s'ils apportent quelque chose à chaque écran ; confirmations réservées aux actions risquées | Garder la double confirmation seulement pour l'effacement total ; confirmations neutres | — |
| **Dribbble / Behance / Awwwards** | Tendance : fond clair, cartes blanches, un accent, coins légèrement arrondis | Cohérence avec la palette choisie | Interfaces expérimentales, animations lourdes |

## 3. Recommandations

Colonnes : référence · problème résolu · solution · page · priorité (1 = haute) · difficulté · risque de régression · test prévu.

### 3a. Appliquées dans cette version (faible risque)

| # | Réf. | Problème | Solution | Page | Prio. | Diff. | Risque | Test prévu |
|---|---|---|---|---|---|---|---|---|
| A1 | Votre choix, Notion | P1 | Fond blanc par défaut, votre palette, mode sombre graphite cohérent | Toutes | 1 | Moyenne | Moyen (contrastes) | axe-core WCAG AA clair et sombre, captures |
| A2 | Votre choix | P2 | Titre « SoldeClair » | Toutes | 1 | Faible | Nul | Test du titre |
| A3 | Stripe, Linear | P3 | Une seule police (IBM Plex Sans) avec chiffres tabulaires ; étiquettes en minuscules | Toutes | 1 | Faible | Faible (largeurs) | Débordements à 320 px |
| A4 | Notion, Linear | Décor | Coins légèrement arrondis, bordures fines, presque aucune ombre, cadre décoratif de l'accueil supprimé | Toutes | 2 | Faible | Faible | Captures |
| A5 | — | Ancien défaut sombre | Les personnes qui avaient le thème sombre **par défaut** passent au clair (une seule fois) ; un choix fait ensuite est respecté | Paramètres | 1 | Faible | Faible | Test de la migration |
| A6 | Stripe | P10 | « 2 filtres actifs · Effacer les filtres » dans l'historique | Historique | 2 | Faible | Faible | Test d'interface |
| A7 | Google Agenda | P5 (en partie) | Résumé « Dans les 7 prochains jours : 3 charges prévues pour un total de 145 € » et dates relatives (aujourd'hui, demain, dans 3 jours) | Tableau de bord | 2 | Faible | Faible | Test unitaire + interface |
| A8 | Duolingo, Headspace | Motivation | Objectifs : « Vous avez atteint 66 % de votre objectif. » et « Prochaine étape : mettre 100 € de côté ce mois-ci. » | Objectifs | 2 | Faible | Faible | Test d'interface |
| A9 | — | P7 | Date et durée sur deux lignes dans les objectifs | Objectifs | 1 | Faible | Nul | Captures 320 / 390 px |
| A10 | — | P8 | Le dernier chiffre d'un résumé impair occupe toute la largeur | Budgets, charges, objectifs | 2 | Faible | Nul | Captures |
| A11 | Linear | P9 | Un seul bouton principal par écran ; « Ajouter un versement » devient secondaire dans les cartes | Objectifs | 2 | Faible | Faible | Captures, tests |
| A12 | Linear | Accessibilité | Contour de focus bleu de 2 px bien visible, cibles ≥ 24 px (WCAG 2.2) | Toutes | 1 | Faible | Faible | Test clavier |
| A13 | Votre retour, Notion | Encadrés jugés peu agréables | Choix, boutons secondaires, puces, onglets, étiquettes et messages **remplis, sans bordure** : bleu plein pour l'action principale ou le choix sélectionné, bleu clair pour les autres ; seuls les champs de saisie gardent un trait fin (nécessaire pour les repérer) | Toutes | 1 | Faible | Faible | axe-core, captures |

### 3b. Soumises à votre accord

| # | Réf. | Problème | Solution proposée | Page | Prio. | Diff. | Risque | Test prévu |
|---|---|---|---|---|---|---|---|---|
| B1 | Notion | P12 | **Page d'accueil originale** (section 7) | Accueil | 1 | Moyenne | Faible | Toutes tailles, axe, performances |
| B2 | Apple Wallet, Plausible, PocketGuard | P4, P5, P6 | **Nouvel ordre du tableau de bord** (section 6) : carte principale, à venir, mois, épargne, actions, un graphique | Tableau de bord | 1 | Moyenne | Moyen (habitudes) | Parcours e2e, captures |
| B3 | Stripe | P10 | Filtres de l'historique en **puces** (Type, Catégorie, Période) au lieu de 4 listes | Historique | 2 | Moyenne | Moyen | Tests filtres |
| B4 | Goodbudget | P11 | Carte de budget en une phrase : « 45 € dépensés sur 60 € · il reste 15 € » + barre | Budgets | 2 | Faible | Faible | Tests budgets |
| B5 | Todoist | Alertes dispersées | Carte « À faire » : 3 actions maximum (ajuster une limite, sauvegarder, compléter une charge), avec « Ignorer » | Tableau de bord | 3 | Moyenne | Moyen | Tests unitaires |
| B6 | Fintur, Linxo | Anticipation | Estimation du solde à 7, 15 et 30 jours d'après les revenus et charges récurrents, marquée « estimation » | Tableau de bord | 3 | Moyenne | Moyen (calcul) | Tests de calcul |
| B7 | YNAB | Planification | Répartition **facultative** du revenu par catégorie, avec « reste à répartir » | Budgets | 3 | Élevée | Moyen | Tests de calcul |
| B8 | Revolut | Lecture des listes | Petites icônes simples par catégorie | Listes | 3 | Moyenne | Faible | Captures |
| B9 | Airbnb | Configuration | Bouton « Passer » sur les étapes facultatives et une phrase « Pourquoi on vous le demande » | Configuration | 2 | Faible | Faible | Parcours e2e |
| B10 | YNAB | Débutants | Limites suggérées selon le profil (modifiables) | Budgets | 3 | Moyenne | Faible | Tests |

## 4. Direction visuelle unique

Votre palette est la base. Quelques teintes sont **légèrement assombries pour le texte**, afin que les petits textes atteignent le contraste WCAG AA (4,5:1). Les couleurs d'origine restent utilisées pour les icônes, barres, illustrations et contours.

| Rôle | Votre couleur | Utilisée pour le texte | Contraste |
|---|---|---|---|
| Fond principal / cartes | `#FFFFFF` | — | — |
| Fond secondaire (barre latérale) | `#F7F7F5` | — | — |
| Fond survolé | `#EFEFED` | — | — |
| Texte principal | `#191919` | `#191919` | 17,6:1 |
| Texte secondaire | `#787774` | `#6B6A66` | 5,1:1 (au lieu de 4,48:1) |
| Texte discret | `#9B9A97` | icônes et séparateurs seulement | 2,8:1 : trop faible pour du texte |
| Bordures | `#E9E9E7` | cartes et séparateurs ; champs : `#8C8B87` (3,4:1, visible) | — |
| Bleu principal | `#2383E2` | liens et boutons : `#1F6FBF` | 5,1:1 (au lieu de 3,9:1) |
| Bleu clair | `#E7F3F8` | fond d'information, élément sélectionné | — |
| Vert positif | `#0F7B6C` | sur fond vert clair : `#0B6E61` | 5,1:1 |
| Orange avertissement | `#D9730D` | texte : `#93520C` | 5,2:1 (au lieu de 2,8:1) |
| Rouge erreur | `#E03E3E` | texte : `#C22F2F` | 4,6:1 (au lieu de 3,5:1) |

- **Mode sombre** (option) : graphite neutre `#191919` / `#232323`, texte `#E6E6E4`, bleu `#5AA5EC`, mêmes rôles de couleur. Plus de noir bleuté ni d'or.
- **Typographie** : IBM Plex Sans (déjà hébergée avec l'application) pour tout ; **chiffres tabulaires** pour aligner les montants ; la police à chasse fixe est retirée (≈ 30 Ko de moins).
- **Formes** : coins de 8 px (boutons, champs) et 12 px (cartes), bordures de 1 px, ombres uniquement pour les fenêtres.
- **Couleur** : un seul accent (bleu) ; vert = bonne nouvelle, orange = attention, rouge = dépassement ou erreur.
- **Mouvement** : transitions de 150 ms au plus, supprimées si l'appareil demande moins d'animations.

Note : la consigne générale proposait « bleu nuit + orange » ; votre choix explicite de palette claire prime.

## 5. Parcours mobile proposé

1. **Ouvrir** → la carte principale répond tout de suite : « Il vous reste 425 € pour terminer le mois, soit environ 14 € par jour. »
2. **Ajouter une dépense au pouce** : bouton « + » au centre de la barre du bas → montant (clavier numérique) → catégorie fréquente → « Ajouter » : **3 gestes**.
3. **Vérifier ce qui arrive** : carte « À venir » juste sous la carte principale.
4. **Comprendre** : « Comment est-ce calculé ? » et « Détail du mois » s'ouvrent sur place, sans changer de page.
5. Barre du bas inchangée : Accueil · Dépenses · **+** · Budgets · Plus.

## 6. Tableau de bord proposé (B2, à valider)

Ordre demandé, au maximum 4 chiffres visibles en même temps :

1. **Carte principale** : « Il vous reste **425 €** pour terminer le mois » + « soit environ **14 €** par jour » + jours restants (une seule fois) + « Comment est-ce calculé ? ».
2. **À venir** : « Dans les 7 prochains jours : 3 charges prévues pour 145 € », puis Aujourd'hui / Cette semaine / Plus tard, revenus attendus compris.
3. **Ce mois-ci** : revenus et dépenses (2 chiffres), lien vers l'historique.
4. **Épargne** : barre de progression + « Il vous manque 40 € pour votre objectif du mois ».
5. **À faire** (B5, si accepté) ou alertes actuelles.
6. **Un seul graphique** (répartition des dépenses), le reste dans « Détail du mois ».

Le formulaire d'ajout rapide resterait sur ordinateur et serait remplacé par le bouton « + » sur mobile.

## 7. Page d'accueil (B1) — à valider avant tout code

### Structure (de haut en bas)

| # | Section | Contenu |
|---|---|---|
| 1 | Barre de navigation | Logo SoldeClair à gauche ; au centre « Fonctionnalités », « Pour qui ? », « Confidentialité » (défilement doux vers la section) ; à droite bouton bleu « Commencer » (ou « Mon tableau de bord » si des données existent). Sur mobile : logo + bouton seulement |
| 2 | Introduction | Titre « Votre budget devient enfin clair. » ; sous-titre proposé ; boutons « Commencer » et « Découvrir SoldeClair » (fait défiler vers la section 4). Si des données existent : « Accéder à mon tableau de bord » |
| 3 | Illustration principale | Illustration originale (voir plus bas) |
| 4 | Avantages | 3 cartes : « Ce qu'il vous reste, en un coup d'œil » · « Sans banque, sans compte » · « Pensé pour débuter » |
| 5 | Reste à vivre | Texte + maquette réelle de la carte principale (chiffres fictifs) |
| 6 | Dépenses et charges à venir | Maquette de la liste « À venir » + ajout en 3 gestes |
| 7 | Objectifs d'épargne | Maquette d'un objectif avec barre de progression |
| 8 | Simulateur d'achat | Maquette « Puis-je acheter ce vélo à 180 € ? » → appréciation |
| 9 | Profils | 3 cartes : étudiant·e, alternant·e, salarié·e (+ « indépendant·e ou autre situation »), avec un exemple de catégories proposées |
| 10 | Confidentialité | « Vos données restent sur votre appareil » : pas de compte, pas de banque, pas de publicité, sauvegarde en un clic |
| 11 | Appel à l'action | Grand bandeau « Commencer avec SoldeClair » + « Essayer avec un profil de démonstration » |
| 12 | Pied de page | Logo + phrase, colonnes Application / Découvrir / Confidentialité / Projet, mention « Version de test · données stockées dans votre navigateur » |

Alternance : texte à gauche / visuel à droite, puis l'inverse ; sur mobile, tout s'empile (texte puis visuel), titres réduits (≈ 36 px au lieu de 64 px), boutons pleine largeur.

### Illustrations originales prévues

Dessinées spécialement en SVG (vecteurs légers), style à plat avec un trait fin `#191919`, aplats tirés de la palette (bleu clair, vert clair, orange clair), **sans personnage**, pour ne ressembler à aucun univers existant :

1. **Principale** : un téléphone ouvert sur la carte « Il vous reste 425 € », entouré de petits objets du quotidien flottants : une page de calendrier entourée au 30, un bocal de pièces, un ticket de caisse plié, un cadenas.
2. **Avantages** : trois pictogrammes ronds (œil + pièce, cadenas + maison, boussole simple).
3. **À venir** : une frise de trois jours avec des étiquettes (loyer, téléphone, abonnement).
4. **Épargne** : un bocal qui se remplit, avec un repère 60 %.
5. **Simulateur** : une balance avec un sac d'achats d'un côté et des pièces de l'autre.
6. **Profils** : trois objets symboliques : sac à dos et livre (étudiant·e), casque de chantier et carnet (alternant·e), sacoche et badge (salarié·e).
7. **Confidentialité** : un téléphone avec un cadenas, des données qui restent « à l'intérieur ».

### Composants existants réutilisés

`Icon` (icônes), le logo de `Layout`, les boutons `.btn` / `.btn-primaire` / `.btn-secondaire`, les cartes `.card`, la barre de progression de `ui.tsx`, les pastilles de statut, `formatMoney` (montants), l'état global `useApp` (pour savoir si des données existent), les profils de démonstration et la mention de confidentialité.

### Performance

- Aucune image externe, aucune police supplémentaire, aucune nouvelle dépendance : illustrations en SVG dans le code (objectif < 25 Ko compressés pour toute la page).
- Page chargée **séparément** (découpage du code) : les personnes qui ont déjà des données ne la téléchargent pas.
- Mesures prévues avant / après : poids des fichiers, temps d'affichage sur téléphone ralenti (processeur ×4, 4G lente), absence de débordement.

## 8. Risques de surcharge à surveiller

- Ajouter « À venir », « À faire » et une prévision sur l'accueil **en plus** de l'existant le rallongerait : B2, B5 et B6 ne vont qu'ensemble, avec le retrait des répétitions et des graphiques.
- La page d'accueil ne doit pas retarder l'accès à l'application : une personne qui a des données arrive toujours directement sur son tableau de bord.
- Les icônes de catégories (B8) ne doivent pas remplacer le texte.
- Pas de félicitations à chaque action : uniquement aux étapes d'un objectif.

## 9. Résultats de cette version

### Vérifications (toutes réussies)

| Vérification | Résultat |
|---|---|
| `npm ci` | installation propre, 0 vulnérabilité |
| Vérification TypeScript | aucune erreur |
| Tests unitaires et d'interface (`npm test`) | **165 / 165** (dont 7 nouveaux : dates relatives, résumé des 7 jours, filtres actifs, prochaine étape d'un objectif, migration du thème, titre) |
| Tests navigateur (`npm run test:e2e`) | **15 / 15** : parcours complet (ajout, modification, suppression, sauvegarde et restauration), 4 formats × clair / sombre, **WCAG 2.2 AA** (axe-core), clavier, thèmes, police locale, mouvement réduit |
| `npm run build` | réussi ; police allégée de 100 Ko à 70 Ko |
| Largeurs 1440, 1100, 800, 520, 390, 320 px × clair / sombre × 10 pages | 0 débordement, 0 erreur ni avertissement dans la console |
| Version GitHub Pages (chemin `/solde-clair/`, serveur local identique) | 23 / 23 : fond blanc par défaut, titre « SoldeClair », ressources chargées, actualisation, page 404, démonstration, revenu, dépense, calcul du tableau de bord, 4 formats, données non partagées entre deux visiteurs, aucune requête externe |
| Migration | des données de l'ancienne version (sombre par défaut) s'affichent en clair ; un choix sombre fait ensuite est conservé |
| Contrastes | texte ≥ 4,5:1, champs et icônes ≥ 3:1 (tableau de la section 4) |

### Captures avant / après

[Configuration (ordinateur)](captures/v2/configuration-ordinateur.jpg) · [Tableau de bord (ordinateur)](captures/v2/tableau-de-bord-ordinateur.jpg) · [Tableau de bord (mobile)](captures/v2/tableau-de-bord-mobile.jpg) · [Tableau de bord, mode sombre (mobile)](captures/v2/tableau-de-bord-mobile-sombre.jpg) · [Historique](captures/v2/historique-mobile.jpg) · [Budgets](captures/v2/budgets-mobile.jpg) · [Objectifs](captures/v2/objectifs-mobile.jpg)

### Fichiers modifiés

- Apparence : `src/styles/global.css` (palette, mode sombre, formes, encadrés remplis), `src/styles/fonts.css` (une seule police), `public/favicon.svg`, `index.html` (titre « SoldeClair », couleur du navigateur).
- Thème clair par défaut et migration : `src/lib/storage.ts`, `src/types.ts`, `src/lib/demo.ts`, `src/lib/setup.ts`.
- Améliorations : `src/pages/Dashboard.tsx` et `src/lib/budget.ts` (7 prochains jours), `src/lib/dates.ts` (dates relatives), `src/pages/History.tsx` (filtres actifs), `src/pages/Goals.tsx` (progression, prochaine étape, dates sur deux lignes, bouton secondaire).
- Tests : `src/__tests__/app.test.tsx`, `src/lib/__tests__/*.test.ts`, `src/test/fixtures.ts`, `e2e/interface.spec.ts`.
- Outils : `package.json` (police à chasse fixe retirée), `tsconfig.json` (types Vite pour les tests).
- Documentation : `README.md`, ce document, `docs/captures/v2/`.

## 10. Sources consultées

- Notion : [teardown de la page d'accueil (uirip)](https://uirip.pages.dev/blog/teardowns/notion) · [analyse du design marketing](https://webtrends.pages.dev/posts/notion-marketing-design-analysis) · [étude de design (Blake Crosley)](https://blakecrosley.com/blog/design-study-notion) · [divulgation progressive (LogRocket)](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases)
- Stripe : [composant de paiements](https://docs.stripe.com/connect/supported-embedded-components/payments) · [tableau des comptes et statuts](https://docs.stripe.com/connect/dashboard/viewing-all-accounts)
- Linear : [Behind the latest design refresh](https://linear.app/blog/behind-the-latest-design-refresh) · [How we redesigned the Linear UI](https://linear.app/blog/how-we-redesigned-the-linear-ui)
- Airbnb : [Wired, refonte de l'application (fiches à une question)](https://wirednews.pages.dev/2016/04/airbnbs-new-app-overhauls-user-experience) · [Leanplum, onboarding](https://www.leanplum.com/?p=6413)
- Headspace : [étude UX (uxdesign.cc)](https://uxdesign.cc/getting-a-little-headspace-a-ux-case-study-ec7a82aa7780) · [critique de design (Pratt)](https://ixd.prattsi.org/2026/02/design-critique-headspace)
- Apple Santé : [guide MacRumors](https://macrumors.com/guide/health) · [MacStories](https://www.macstories.net/?p=60534)
- Google Agenda : [vues du calendrier](https://cedarville.teamdynamix.com/TDClient/2045/Portal/KB/Article/52846/Google-Calendar-View-Calendars)
- Todoist : [Planifier sa journée avec Aujourd'hui](https://www.todoist.com/help/todoist/get-started/plan-your-day-with-the-today-view-UVUXaiSs) · [ordre de tri](https://todoist.com/help/articles/360006365600)
- Duolingo : [UX et ludification (UX Planet)](https://uxplanet.org/ux-and-gamification-in-duolingo-40d55ee09359) · [design pédagogique (Learnnovators)](https://learnnovators.com/blog/duolingo-gets-both-gamification-and-learning-design-right)
- Revolut : [aide « solde flouté »](https://help.revolut.com/en-AU/help/profile-and-plan/security-and-personal-data/why-is-my-balance-blurry) · [nouvelles fonctions de sécurité](https://www.revolut.com/blog/post/new-revolut-security-features/)
- Apple Wallet : [critique de design (Pratt)](https://ixd.prattsi.org/2026/09/design-critique-apple-wallet-ios/)
- Plausible : [présentation du tableau de bord](https://docs.plausible.io/guided-tour) · [simple web analytics](https://Plausible.io/simple-web-analytics)
- PocketGuard : [Leftover / In My Pocket](https://pocketguard.com/leftover/) · [guide du débutant](https://pocketguard.com/blog/the-newbies-guide-to-pocketguard/)
- Pilote Budget : [Les clés de la banque](https://www.lesclesdelabanque.com/particulier/pilotebudget-application-budget/) · [La Fabrique du Net](https://www.lafabriquedunet.fr/logiciel/pilote-budget)
- YNAB : [Assigning your money](https://support.ynab.com/en_us/assigning-your-money-a-guide-SypgkrNJi)
- Goodbudget : [Combien reste-t-il dans mon enveloppe ?](https://goodbudget.com/help/budgeting-with-goodbudget/how-much-left-in-envelope/)
- Linxo : [prévisionnel (MoneyVox)](https://www.moneyvox.fr/placement/actualites/53837/fintech-linxo-veut-simplifier-la-gestion-des-comptes-bancaires) · Fintur : [fiche App Store](https://apps.apple.com/app/id6796725254)
- Mobbin : [analyse de 1 460 parcours d'accueil](https://daniliants-com.pages.dev/insights/i-studied-1460-onboarding-flows-heres-what-i-found/) · confirmations : [Uxcel](https://app.uxcel.com/courses/mobile-design/mobile-settings-745/use-confirmations-for-important-or-destructive-actions-5959)
- Tendances visuelles : [galerie Kombai](https://kombai.com/gallery/app-pages/dashboards-ios-20/) · [projet personnel de budget](https://divyaweb.pages.dev/budget.html)
- Accessibilité : [Nouveautés de WCAG 2.2 (W3C)](https://w3.org/WAI/standards-guidelines/wcag/new-in-22/)
