# Design, page d'accueil et interactions

## Sommaire
1. Direction visuelle
2. Page d'accueil narrative (12 sections)
3. Tableau de bord et pages internes
4. Micro-interactions
5. Mouvement et accessibilité
6. Illustrations, images, mascotte
7. Performance

## 1. Direction visuelle

- Fond principalement blanc, surfaces gris très clair sans bordure, hiérarchie forte, un seul accent
  (bleu par défaut), très peu d'ombres, coins arrondis modérés (cartes ~12 px, contrôles ~8 px),
  espacements généreux et constants, sans serif très lisible, chiffres importants faciles à repérer.
- Palette et sens des couleurs : voir `cahier-des-charges.md` §4 ; tokens CSS prêts dans
  `assets/modele/tokens.css`. Pour chaque couleur demandée par l'utilisateur, vérifie le contraste ;
  si le petit texte n'atteint pas 4,5:1, garde la couleur exacte pour pastilles / barres / icônes et
  propose une variante plus foncée pour le texte (en lui demandant).
- Mode sombre lisible et élégant (graphite), mêmes rôles de couleur.
- Si l'utilisateur dit aimer un site : retrouve **la sensation** (espace, rythme, typographie, sobriété),
  jamais la copie.

## 2. Page d'accueil narrative (12 sections)

Structure validée, à adapter au sujet du site :
1. Barre de navigation minimaliste : logo à gauche, 3 liens au centre, bouton principal à droite ;
   collante, fond légèrement translucide.
2. Grande introduction : petit surtitre, **très grand titre court**, sous-titre d'une ou deux phrases,
   deux boutons (« Commencer » et « Découvrir »), garanties en une ligne (« Gratuit - Sans compte -
   Données sur ton appareil »). Si l'utilisateur a déjà des données : « Continuer avec {prénom} » /
   « Créer un nouveau profil ».
3. Grande illustration ou maquette originale (vraies captures avec données fictives dans des cadres
   téléphone et ordinateur, entourées d'objets du quotidien du domaine).
4. Avantages : 3 cartes.
5 à 8. Une section par fonction clé, en alternant texte | maquette et maquette | texte.
9. Présentation interactive des publics / profils.
10. Confidentialité et données.
11. Grand appel à l'action final mémorable.
12. Pied de page complet et organisé.

Récit au défilement : ce qu'est le site, le problème résolu, comment il marche, comment faire l'action
principale, ce qui protège l'utilisateur, pourquoi commencer maintenant.

Possibles quand ils aident vraiment : apparition progressive des sections, maquette en mouvement,
montant qui se met à jour, liste qui défile doucement, démonstration animée d'une fonction, galerie
horizontale **contrôlée** (boutons, défilement natif, accessible clavier), légère profondeur au défilement.

À éviter : vidéos lourdes en lecture automatique, mouvements permanents, textes qui défilent vite,
carrousels impossibles à arrêter, scroll hijacking, effets qui empêchent de lire, son automatique,
clignotement, look jeu vidéo ou plateforme de trading.

Mobile : titres réduits (`clamp()`), sections empilées, grands boutons, aucune barre de défilement
horizontale, illustrations lisibles, introduction **centrée verticalement** dans le premier écran
(`min-height` en `svh`, voir `mobile-et-fenetres.md`), correcte après rotation et en paysage.
La page d'accueil est chargée à part (découpage du code) pour ne pas ralentir l'application.

## 3. Tableau de bord et pages internes

- Ordre type : 1) le chiffre clé en grand dans une carte principale (ex. « Il te reste X € pour finir
  le mois », juste dessous « soit environ Y € par jour », lien « Comment est-ce calculé ? ») ;
  2) ce qui arrive bientôt ; 3) le résumé du mois ; 4) l'objectif ; 5) 3 actions utiles maximum ;
  6) un seul graphique ; 7) le reste dans « Détail du mois » repliable.
- Cartes cliquables avec zone évidente, ouverture fluide des détails.
- Listes : regroupées par jour, montants alignés à droite, signe et couleur, statut en texte, filtres
  en puces, recherche, élément ajouté mis en valeur brièvement, « Annuler » après suppression.
- Barres de progression avec texte (« 45 € dépensés sur 60 € - il reste 15 € ») et seuils lisibles
  sans la couleur (icône + mot).
- Objectifs : cartes illustrées par thème, anneau de progression, jalons, versements rapides
  (+20, +50, +100), petite simulation (« si je mets X € par mois → atteint en … »).
- Masquage des montants (icône œil), conservé pendant la session.

## 4. Micro-interactions

Durées : **120 à 200 ms** pour les retours d'interface (jusqu'à 300 ms au plus) ; les animations
narratives peuvent être plus longues seulement si elles restent utiles et contrôlables.

- Boutons : survol, légère réaction à l'appui (scale ~0,97), état de chargement, confirmation
  visuelle (coche), état désactivé clair, focus clavier visible.
- Formulaires : libellés nets, validation au bon moment (à la sortie du champ ou à l'envoi),
  aide courte, erreur précise, confirmation après enregistrement, données gardées en cas de retour,
  montants rapides en puces (+5, +10, +20, +50).
- Cartes : changement de surface très léger au survol, aucun mouvement excessif.
- Montants : transition douce à la mise à jour, variation signalée, masquage respecté, pas de compteur
  lent.
- Graphiques : apparition progressive, légende, résumé textuel, utilisable au clavier et au toucher,
  catégories cliquables.
- Navigation : indicateur actif clair, transitions rapides entre pages, position conservée quand c'est
  logique, retour facile, bouton principal toujours identifiable.
- Notifications (toasts) : courtes, avec l'avatar de la mascotte si elle existe, bouton « Annuler »
  quand l'action est réversible, annoncées aux lecteurs d'écran.
- Chaque état doit exister et être testé : survol, appuyé, focus, chargement, succès, erreur,
  sélection, vide, désactivé, confirmation.
- N'ajoute pas : animations permanentes, grands mouvements décoratifs, cartes qui bougent sans raison,
  éléments qui semblent cliquables sans l'être.

## 5. Mouvement et accessibilité

- Tout respecte `prefers-reduced-motion` **et** un réglage « Animations réduites » dans les paramètres
  (modèle : `assets/modele/mouvement.ts`). En mouvement réduit : pas de parallaxe ni de grands
  déplacements, fondus très courts ou changements instantanés, toutes les informations conservées.
- Contrôle pour arrêter toute animation longue ou répétitive.
- Le contenu ne dépend jamais d'une animation (valeurs finales présentes dans le DOM).
- Dans les tests jsdom, considérer le mouvement comme réduit (valeurs finales immédiates).

## 6. Illustrations, images, mascotte

- Illustrations **originales** en SVG, simples et chaleureuses, qui suivent le thème clair / sombre
  (couleurs via `currentColor` ou variables CSS). Aucune image de banque d'images externe.
- Captures d'écran réelles du site, avec données fictives, refaites quand l'interface change.
- Mascotte : si l'utilisateur fournit une photo, garde ses caractéristiques (couleurs du pelage, des
  yeux, du nez) sans déformation ; détoure et optimise (WebP / AVIF, plusieurs tailles, `srcset`,
  chargement différé, `alt` pertinent ou vide si décorative). Si la photo n'arrive pas, demande-la
  avant de dessiner. Variantes possibles : poses, réaction après une action réussie, apparition
  discrète au défilement, léger salut à l'ouverture (une seule fois, coupé en mouvement réduit).
- Avatar vectoriel sur demande : formes simples, lisible en très petit, sans texte ni logo, pas de 3D.

## 7. Performance

- Aucune dépendance lourde sans justification ; CSS ou Web Animations API d'abord. Avant d'ajouter
  GSAP, Framer Motion ou autre : compare, mesure le poids ajouté, justifie dans le rapport.
- Découpage du code (page d'accueil, assistant, graphiques chargés à la demande), images responsive,
  SVG optimisés, polices auto-hébergées, aucun chargement bloquant, aucun décalage de mise en page
  (dimensions réservées), aucune requête externe.
- Mesure avant / après (Lighthouse, poids, nombre de requêtes) et donne les chiffres dans le rapport.
