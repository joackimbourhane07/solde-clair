# Cahier des charges consolidé

Toutes les consignes données par l'utilisateur pendant SoldeClair (11 séries de travail), regroupées par
thème. Elles valent par défaut pour tout nouveau site, sauf si la nouvelle demande dit autre chose.

## Sommaire
1. Intention générale
2. Principes de conception
3. Ton et textes
4. Identité visuelle et couleurs
5. Structure des pages
6. Personnalisation et profils
7. Accessibilité
8. Confidentialité et sécurité
9. Qualité attendue
10. Préférences exprimées au fil des réponses

## 1. Intention générale

- Un produit **simple, moderne, rassurant, accessible à tous**, y compris aux débutants du domaine.
- **Utile avant d'être décoratif.** Une personne doit comprendre l'essentiel d'une page en moins de
  cinq secondes.
- Une première version **simple, propre et réellement fonctionnelle** vaut mieux que des fonctions
  complexes peu fiables. Pas de maquette : tout ce qui est affiché doit marcher.
- **Immersif et vivant**, mais « ne confonds pas immersion et accumulation » : si un effet est joli
  mais gêne la compréhension, supprime-le. Une animation qui n'aide ni à comprendre, ni à naviguer,
  ni à recevoir un retour n'est pas prioritaire.
- L'utilisateur doit sentir que **c'est son espace** : personnalisé selon son profil, son prénom, sa
  situation.

## 2. Principes de conception

- **Divulgation progressive** : l'essentiel d'abord, le secondaire dans des sections repliables
  (« Détail du mois »), des menus « Plus », des pages dédiées.
- **Le moins d'étapes possible** pour une action courante (ajout en un geste, bouton « + » central
  atteignable au pouce, choix fréquents proposés en premier, catégories récentes mémorisées).
- Pas de surcharge : **quatre chiffres principaux au maximum** visibles en même temps sur un tableau
  de bord, **un seul graphique** visible d'emblée, pas de répétition d'information.
- Les graphiques aident à comprendre : toujours une phrase de résumé, une légende, lisibles sans survol.
- **États vides** qui expliquent la prochaine action avec un bouton.
- **Alertes transformées en actions** (vérifier, ajuster, sauvegarder…), au plus trois à la fois,
  qu'on peut traiter ou ignorer.
- **Formulaires courts** et guidés : une question principale par étape, choix sous forme de cartes,
  progression visible, bouton principal évident, retour en arrière sans perte, étapes facultatives
  « Passer », phrase « pourquoi on te le demande », récapitulatif avant validation, préremplissage
  intelligent.
- **Confirmation** avant toute suppression importante ; **« Annuler »** après une suppression ;
  message de confirmation après chaque action ; erreurs précises et compréhensibles.
- Navigation **prévisible** : actions principales toujours au même endroit, indicateur de page active,
  logo qui ramène à la page d'accueil (avec « Continuer avec mon profil » ou « Créer un nouveau profil »).
- Montants **alignés**, typographie adaptée aux chiffres (chiffres tabulaires), statuts lisibles
  (« payé », « à venir », « récurrent », « exceptionnel »), filtres actifs visibles, recherche efficace.
- Mobile **prioritaire** : aucune information essentielle en défilement horizontal, grands boutons,
  fonctionne dès 320 px.

## 3. Ton et textes

- Français simple, phrases courtes, **une idée par phrase**, 3 à 10 mots quand c'est possible,
  2 ou 3 lignes maximum par bloc sur téléphone, verbes d'action, titres directs, aucune répétition.
- **Tutoiement** par défaut (choisi par l'utilisateur pour SoldeClair). Vérifie l'accord des
  possessifs après conversion : « ta banque », « ta situation », « ta question », « où tu en es »,
  « écris la tienne ».
- Ton **calme, humain, encourageant, jamais culpabilisant**, professionnel (pas d'univers enfantin).
  - À éviter : « Budget dépassé ! Mauvaise gestion. »
  - Préférer : « Ton budget loisirs est dépassé de 15 €. Tu peux voir les dépenses concernées ou
    ajuster la limite. »
- Messages positifs courts quand ça va bien (« Tu as atteint 60 % de ton objectif. »).
- Exemples de raccourcissement demandés :
  - « Ajouter une nouvelle opération » → « Ajouter »
  - « Consultez l'ensemble de vos dernières transactions » → « Dernières opérations »
  - « Que souhaitez-vous faire aujourd'hui ? » → « Que veux-tu faire ? »
  - « Votre dépense a été enregistrée avec succès » → « Dépense ajoutée »
  - « Veuillez sélectionner une catégorie » → « Choisis une catégorie »
- Garde les mentions légales et informations indispensables ; aucun faux argument commercial.
- Typographie française : espaces insécables avant « ? ! : ; » et dans « « » », apostrophe typographique.
- Séparateur : **tiret « - » ou « – »**, jamais le point médian « · » (refusé par l'utilisateur).
- Un nom court dans l'onglet et le logo (« SoldeClair », pas « SoldeClair - budget personnel »).
- **Aucun emoji**, nulle part dans l'interface.

## 4. Identité visuelle et couleurs

- **Une seule identité** cohérente, même si plusieurs références ont été étudiées : pas un collage.
- Style retenu : fond **blanc** très épuré, esprit Notion (sensation et qualité de mise en page,
  jamais une copie), beaucoup d'espace, sections courtes et aérées, titres noirs très visibles, textes
  secondaires gris, **très peu d'ombres**, coins légèrement arrondis, un seul accent coloré.
- Panneaux et cartes : **fond gris très clair sans bordure** (choix de l'utilisateur) ; champs blancs.
- Le noir + orange a été **refusé** (« prends une couleur plus claire et vive »).
- Palette de référence validée (à proposer par défaut, adaptable) :

| Rôle | Couleur |
|---|---|
| Fond principal | #FFFFFF |
| Fond secondaire / cartes | #F7F7F5 |
| Fond survolé | #EFEFED |
| Texte principal | #191919 |
| Texte secondaire (accessible) | #6B6A66 (au lieu de #787774, trop clair) |
| Texte discret (icônes seulement) | #9B9A97 |
| Bordures | #E9E9E7 |
| Bleu principal (actions, liens, épargne, focus) | #2383E2, texte/boutons #1F6FBF |
| Bleu clair | #E7F3F8 |
| Vert positif / fond | #0F7B6C / #DDEDEA |
| Orange avertissement / fond | #D9730D / #FAEBDD |
| Rouge erreur / fond | #E03E3E / #FBE4E4 |
| Argent qui entre, solde positif | #47D45A (pastilles, barres, icônes) ; texte #1A7F2B |
| Argent qui sort, dépenses | #FF0000 (pastilles, barres, icônes) ; texte #D90000 |

- Couleurs vives exactes pour les surfaces, **variantes plus foncées pour le petit texte** quand le
  contraste AA n'est pas atteint (choix validé « exactes + texte lisible »).
- Vert = entrée, solde positif, progression ; rouge = sortie, dépense, solde négatif, dépassement ;
  bleu = actions, liens, épargne, information neutre. **Partout** dans le site, et jamais la couleur seule
  (signe + / −, icône, texte).
- Mode sombre cohérent (graphite, pas noir pur), mode « comme mon appareil ».
- Typographie sans serif très lisible, auto-hébergée (aucune police distante inutile).
- Favicon et icônes aux couleurs de la marque (vérifier qu'aucune ancienne couleur ne reste).

## 5. Structure des pages

- Page d'accueil (présentation) **avant** la configuration pour un nouveau visiteur ; un visiteur
  qui a déjà des données voit « Accéder à mon tableau de bord » / « Continuer avec … ».
- Structure de page d'accueil validée (12 sections) : barre de navigation minimaliste (logo à gauche,
  liens au centre, bouton à droite) ; grande introduction (très grand titre, sous-titre court, deux
  boutons) ; grande illustration originale ; avantages (3 cartes) ; puis une section par fonction
  clé en alternant texte et maquette ; profils de public ; confidentialité ; grand appel à l'action ;
  pied de page complet. Détail dans `design-et-interactions.md`.
- Des **vraies captures** de l'application (données fictives) dans des cadres téléphone / ordinateur,
  plus des illustrations originales, pour donner de la vie. Mettre à jour les captures quand le menu
  ou les écrans changent.
- Application installable (manifeste, icônes) avec un guide d'installation iPhone / Android.

## 6. Personnalisation et profils

- Parcours de configuration au premier lancement (prénom ou pseudo, type de profil, informations
  principales, devise par défaut).
- Selon le profil, **mettre en avant** ce qui le concerne sans interdire le reste (« être réaliste,
  ne pas forcément empêcher certaines fonctions selon le profil mais mettre en avant selon le profil »).
  Fais une vraie recherche sur la situation de chaque profil avant de décider.
- Plusieurs profils sur le même appareil, chacun avec ses données.
- Profils de démonstration **fictifs** complets, chargeables d'un bouton, sans toucher aux vraies données.
- Catégories proposées selon le profil, toutes modifiables (ajouter, renommer, supprimer), création
  d'une catégorie directement depuis un formulaire.

## 7. Accessibilité (WCAG 2.2 AA)

Contraste suffisant, libellés sur tous les champs, clavier complet, focus visible, ordre logique,
erreurs claires, cibles tactiles ~44 px, zoom possible, textes alternatifs pertinents, images
décoratives masquées (`alt=""`, `aria-hidden`), annonces des nouveautés (`aria-live`), dialogues
accessibles (piège de focus, retour du focus), aucune information par la seule couleur, aucun
clignotement, aucun contenu qui dépend uniquement d'une animation, `prefers-reduced-motion` plus un
réglage « animations réduites » dans les paramètres, contrôle pour arrêter les animations longues.

## 8. Confidentialité et sécurité

- Données **sur l'appareil** (navigateur) ; aucun compte en ligne, aucune synchronisation, aucun
  envoi à un serveur, aucun outil de suivi, aucune publicité.
- Jamais de demande d'identifiant, mot de passe, code, numéro de carte, coordonnées bancaires,
  QR code de paiement ou secret d'authentification. Un numéro tapé par erreur est masqué.
- Ne jamais prétendre être un partenaire officiel, ni connecter automatiquement un service tiers sans
  API officielle et autorisation réelle (ex. Izly : « Suivi manuel, aucun accès à ton compte Izly »).
- Expliquer clairement où sont les données et proposer : export CSV, sauvegarde complète JSON,
  import d'une sauvegarde, rappel de sauvegarde, effacement total avec double confirmation (taper un mot),
  « point de départ » pour revenir en arrière.
- Le site étant public : **jamais de données réelles dans le code**. Pour préremplir avec les vraies
  données de l'utilisateur, fournis un format de fichier de sauvegarde et un mode d'emploi (ou un
  prompt) pour qu'il crée ce fichier sur son ordinateur, hors dépôt, puis l'importe.
- Aucun secret dans le dépôt ; lancer un scan de secrets avant de fusionner.

## 9. Qualité attendue

- Calculs vérifiés et testés, montants à deux décimales sans erreur d'arrondi (entiers en centimes).
- Aucune erreur dans la console, aucun débordement horizontal, aucun texte coupé.
- README complet en français : nom, objectif, fonctions, technique et pourquoi, prérequis,
  installation, lancement, tests, organisation des fichiers, démonstration, confidentialité, règles de
  calcul, limites, améliorations possibles, publication.
- Toute correction : vérifier qu'elle est nécessaire, ajouter un test, relancer tests et build,
  aucune régression.

## 10. Préférences exprimées au fil des réponses (SoldeClair)

Utiles comme valeurs par défaut quand une question similaire revient :
- Accès au site : d'abord un lien privé, puis publication publique GitHub Pages une fois validé.
- Fusion et publication automatiques **si tout est réussi**.
- Page d'accueil originale « dans l'esprit » d'un site aimé, avant la configuration.
- Report du reste d'un mois sur le suivant (cumul), car « ce que j'ai le 26 octobre sert en novembre ».
- Plusieurs profils ; captures + illustrations sur la page d'accueil.
- Onglet « Mon compte » façon appli bancaire dans la barre du bas ; « Ajuster le solde » ; « À venir »
  dans une bulle-onglet ; pastille du nombre d'opérations seulement s'il y en a dans les 7 jours.
- Pas d'import bancaire pour l'instant (pas de connexion bancaire possible pour un site gratuit).
- Chiffre principal du tableau de bord = exactement le solde du compte ; « À venir » sur 3 jours.
- Pourcentages affichés (« objectif atteint à 312 % »).
- Assistant gardé **en local** (pas d'IA payante pour l'instant).
- Objectifs présentés en **cartes illustrées interactives**.
- Passage au **tutoiement** partout ; Izly avec **solde séparé** et recharge.
