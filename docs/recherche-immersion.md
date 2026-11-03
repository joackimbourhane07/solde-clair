# Série 9 : une interface vivante, sans manipulation

Objectif : rendre SoldeClair plus intuitif, plus engageant et plus mémorable, et donner à Poksy une vraie
présence. Le tout sans dark pattern, sans mouvement imposé et sans perte de performance notable.

## 1. Méthode et limites de la recherche

- L'accès direct aux pages web (nngroup.com, w3.org, material.io…) était bloqué par le réseau de la session.
  Seul le moteur de recherche fonctionnait. Les sources ci-dessous ont donc été consultées **à travers les
  extraits et les résumés des résultats de recherche**, pas en lisant les pages en entier.
- **Aucune vidéo n'a été visionnée.**
- L'analyse des produits (partie 3) s'appuie sur une connaissance générale de ces interfaces et sur quelques
  articles. Ces sites n'ont pas été parcourus en direct pendant ce travail.
- Les chiffres marqués « à vérifier » proviennent de sources secondaires.

## 2. Sources et principes retenus

| Source (organisme, lien, date) | Principe retenu | Application dans SoldeClair | Risque en cas de mauvais usage |
|---|---|---|---|
| Nielsen Norman Group, *Response times: the 3 important limits* ([nngroup.com/topic/response-time](https://www.nngroup.com/topic/response-time/)), article de 1993 mis à jour | 0,1 s paraît instantané, 1 s garde le fil de la pensée, au-delà de 10 s l'attention décroche | Retour à la pression en 90 ms ; transitions de 160 à 300 ms ; aucun compteur long | Une animation lente donne une impression de lenteur |
| NN/g, *Skeleton screens* ([nngroup.com/articles/skeleton-screens](https://nngroup.com/articles/skeleton-screens/)) | Inutiles si le chargement dure moins d'une seconde | Aucun squelette ajouté : tout est local et instantané. Seule la galerie montre des cadres vides en attendant ses captures | Un faux chargement ralentit volontairement l'interface |
| Laws of UX, Jon Yablonski ([lawsofux.com](https://lawsofux.com/index.md)) | Hick (moins de choix), Fitts (cibles grandes et proches), Jakob (conventions), Von Restorff (l'élément différent est retenu), Peak-End (le moment fort et la fin comptent le plus) | Deux boutons au maximum dans la carte de Poksy ; « + » central au pouce ; carte de réussite avec Poksy (moment fort) ; appel à l'action final soigné | L'effet Von Restorff utilisé partout perd son effet |
| W3C, *Understanding SC 2.3.3 Animation from Interactions* ([w3c.github.io](https://w3c.github.io/wcag/understanding/animation-from-interactions.html)) | Les animations non essentielles doivent pouvoir être désactivées (technique C39 : `prefers-reduced-motion`) | Réglage de l'appareil respecté, et choix « Animations réduites » dans les paramètres | Supprimer une information au lieu d'un mouvement |
| WCAG 2.2.2 *Pause, Stop, Hide* (résumé : [disabilityworld.org](https://www.disabilityworld.org/toolkit/standards/wcag/2-2-2-pause-stop-hide/)) | Tout contenu animé automatiquement plus de 5 s doit pouvoir être mis en pause | La démonstration du reste à vivre dure 4 s, s'arrête seule et propose « Pause » et « Rejouer » ; la galerie ne défile jamais seule | Un carrousel automatique sans pause |
| W3C WAI, *Carousels* (brouillon, [w3.org/WAI/EO/Drafts/app-notes/carousel](https://www.w3.org/WAI/EO/Drafts/app-notes/carousel)) | Vrais boutons, arrêt à l'interaction, pas de relance automatique | Galerie à défilement libre, boutons « Écran précédent / suivant », zone défilable au clavier | Flèches qui ne sont pas des boutons |
| Apple, *Human Interface Guidelines : Motion* ([developer.apple.com](https://developer-mdn.apple.com/design/human-interface-guidelines/foundations/motion)) | Mouvement utile, jamais pour lui-même ; optionnel avec Réduire les animations ; pas sur les actions très fréquentes | Aucun mouvement permanent ; le bond de Poksy n'a lieu qu'à la première visite | Une animation à chaque saisie devient fatigante |
| Material Design 3, courbes et durées (repris de sources secondaires, à vérifier) | Courbe standard `cubic-bezier(0.2, 0, 0, 1)`, durées courtes de 50 à 300 ms | Variables `--courbe-sortie` et `--duree-*` partagées dans `mouvement.css` | Des durées différentes partout rendent l'interface incohérente |
| Steven Hoober, études sur la tenue du téléphone ([Smashing Magazine](https://smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users)) | Près de 49 % d'usage à une main ; cibles d'au moins 44 px ; le centre est le plus précis (Hoober a depuis nuancé sa carte du pouce) | Poksy et le « + » en bas ; boutons de 44 px ; fermeture de la carte de 44 px | Les actions importantes placées en haut de l'écran |
| Effet autruche (Karlsson, Loewenstein et Seppi 2009, cité par [Darden, UVA](https://ideas.darden.virginia.edu/behavior-ostrich-effect)) | On évite de regarder ses comptes quand on s'attend à une mauvaise nouvelle | Ton neutre, jamais culpabilisant ; une phrase claire plutôt qu'une alerte rouge ; Poksy rassure | Les alertes anxiogènes poussent à ne plus ouvrir l'application |
| Harry Brignull, *Deceptive design* ([résumé](https://uxdesign.cc/the-12-types-of-dark-patterns-and-why-you-should-care-38a7b584777b)) | Pas de fausse urgence, pas de culpabilisation au refus (confirmshaming), pas d'insistance | « Plus tard » et « Ne plus afficher les astuces » sont neutres ; une seule astuce par visite ; rien ne revient après un refus | Un « Non merci, je préfère rester désorganisé » |
| web.dev, *Core Web Vitals thresholds* ([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds?hl=en)) | Seuils « bons » : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 | Mesurés avant et après (partie 6) | De l'immersion qui alourdit le site |
| Article sur la View Transitions API ([flaviocopes.com](https://flaviocopes.com/view-transitions-api)) | Prise en charge encore inégale selon les navigateurs (Firefox) | Transitions de page en CSS simple (fondu et glissement), sans dépendre de cette API | Des transitions qui cassent dans certains navigateurs |
| Études de cas Headspace ([Appcues](https://goodux.appcues.com/blog/headspaces-mindful-onboarding-sequence)) et Duolingo ([UX Planet](https://uxplanet.org/duolingo-e3e47d2b41ba)) | Ton calme, illustrations cohérentes ; retour immédiat après une action | Poksy confirme les réussites ; repères bienveillants ; pas de série de jours à préserver ni de pression | La gamification transforme le budget en jeu |
| Revolut, masquage des montants ([revolut.com](https://www.revolut.com/blog/post/new-revolut-security-features/)) | Masquer les soldes en public, mais l'option doit rester facile à trouver | Les montants animés respectent le masquage (« ••• € ») | Une option cachée que personne ne trouve |

## 3. Enseignements tirés de produits reconnus (sans rien copier)

| Produit | Ce qui attire d'abord | Ce que SoldeClair en retient | Ce qu'il faut éviter |
|---|---|---|---|
| Notion | Des espaces calmes, des informations qui se déplient | Détails dépliables avec une ouverture fluide | Les pages trop denses |
| Linear | Réactions immédiates et cohérentes | Mêmes durées et courbes partout, pression visible | Des raccourcis invisibles pour un débutant |
| Stripe | Chiffres mis en valeur, graphiques sobres | Montants à chiffres alignés, barres et courbes qui se dessinent à l'affichage | Des graphiques sans résumé écrit |
| Apple (pages produits) | La mise en scène au défilement | Apparitions douces des sections et légère profondeur des objets décoratifs | Le défilement détourné (scroll hijacking), qui est exclu |
| Airbnb | Parcours guidés, une question à la fois | Bilan du mois guidé ; carte de Poksy avec une seule action principale | Les formulaires trop longs |
| Headspace | Ton rassurant, illustrations douces | Couleurs reprises de l'autocollant de Poksy (vert pâle, crème) | L'infantilisation |
| Duolingo | Le retour immédiat | Poksy et une coche après chaque réussite | Les séries, la culpabilisation, la pression |
| Revolut, Apple Wallet | Hiérarchie mobile : le solde en premier | Le solde du jour reste l'élément le plus grand | Les gestes cachés |
| Apple Santé | Un résumé personnalisé | « Repères pour vous » selon le profil | Trop de cartes |
| Todoist, Google Agenda | La prochaine action, le temps qui passe | « À venir » sur 3 jours, fin de contrat en compte à rebours | Le calendrier surchargé |
| Plausible | Un tableau de bord minimal | Un seul graphique sur l'accueil | La multiplication des widgets |
| Framer, Webflow, GSAP (vitrines) | Transitions fluides | Résultat équivalent obtenu en CSS et Web Animations, sans bibliothèque | Le poids et la dépendance |

## 4. Audit avant modification (3 novembre 2026, version publiée)

Mesures sur la build `/solde-clair/` servie en local avec compression gzip, comme GitHub Pages.

- **Lighthouse, présentation, mobile** (4G lente simulée, processeur 4 fois plus lent) : performance 89 à 90,
  accessibilité 100, bonnes pratiques 100, SEO 100. LCP 2,9 à 3,0 s, CLS 0,097, TBT 20 à 30 ms,
  385 Kio transférés, 14 requêtes.
- **Lighthouse, ordinateur** : 100 / 100 / 100 / 100. LCP 0,7 s.
- **Code JavaScript principal** : 160 Ko compressés.
- **Emojis visibles** :
  - « ✅ » et « ⚠️ » dans la carte « Mon objectif » ;
  - « ✓ » dans les objectifs et la configuration ;
  - « 🎉 » quand un objectif est atteint ;
  - « 👋 » dans le message de Poksy ;
  - « ⚠ » en CSS devant un montant négatif.
- **Poksy** :
  - une petite carte blanche de texte, sans photo ni bouton clair ;
  - posée sur l'illustration de la présentation ;
  - peu remarquée, sans personnalité ;
  - avatar dessiné, éloigné du vrai Poksy.
- **Interactions** :
  - les boutons s'enfoncent d'un pixel, sans autre réaction ;
  - les pages s'affichent d'un bloc, sans transition ;
  - les montants changent sans signal ;
  - les fenêtres apparaissent sans transition ;
  - les graphiques sont statiques.
- **Présentation** :
  - la narrative est bonne, mais les maquettes sont statiques ;
  - les profils sont présentés comme trois cartes figées ;
  - aucune démonstration ne permet d'essayer.
- **Mobile** : le bouton de Poksy recouvre parfois le bord droit d'une carte pendant le défilement (inévitable
  pour un bouton flottant ; une marge est déjà prévue en bas de page).

## 5. Direction créative et décisions

Palette conservée, avec la même hiérarchie :
- blanc #FFFFFF ;
- gris très clair #F7F7F5 ;
- texte #191919 ;
- texte secondaire #6B6A66 ;
- bleu #2383E2 pour les actions et l'épargne ;
- vert pour ce qui entre ;
- rouge pour ce qui sort.

On y ajoute **les couleurs de Poksy** : le vert pâle et le crème de son autocollant.

1. **Poksy, vrai chat** :
   - avatar et portrait tirés de la photo fournie (WebP de 2 à 33 Ko) ;
   - yeux, nez et pelage inchangés.
2. **Carte d'accueil de Poksy** :
   - photo, nom, rôle, message personnalisé avec le prénom, deux boutons (« Poser une question », « Plus tard ») ;
   - pointe vers le bouton de Poksy ;
   - entrée en ressort (420 ms), petit salut de la tête et traits « eurêka » dessinés une fois ;
   - deux bonds du bouton, une seule fois ;
   - s'efface d'elle-même si l'on fait défiler la page.
3. **Astuces de page** :
   - une par page et une seule par visite, après 1,8 s ;
   - « Voir la réponse » ou « Ne plus afficher les astuces ».
4. **Réussites** : chaque notification de réussite montre Poksy avec une coche, qui apparaît en ressort.
5. **Micro-interactions** :
   - pression à 90 ms ;
   - survol à 160 ms, avec une légère élévation du bouton principal ;
   - pages qui glissent de 8 px avec un court décalage entre les blocs ;
   - fenêtres qui montent, détails qui se déplient ;
   - barres et courbes qui se dessinent ;
   - montants qui glissent vers leur nouvelle valeur, avec un surlignage vert ou rouge bref (pas au premier
     affichage).
6. **Présentation narrative** :
   - démonstration du reste à vivre où les opérations arrivent et le montant se met à jour (4 s, « Pause » et
     « Rejouer ») ;
   - galerie horizontale de cinq écrans ;
   - simulateur à curseur qui affiche le verdict avec une icône et un texte ;
   - profils en onglets accessibles au clavier ;
   - section « Poksy répond à vos questions » ;
   - apparitions au défilement et légère profondeur des objets décoratifs.
7. **Aucun emoji** : remplacés par des icônes SVG (coche, attention, étincelles). Un test automatique le
   vérifie, y compris dans les pseudo-éléments CSS.
8. **Contrôle du mouvement** : le réglage de l'appareil est respecté, et « Animations réduites » est
   disponible dans les paramètres. Rien n'est caché en attendant une animation.
9. **Pas de bibliothèque d'animation** : CSS et Web Animations suffisent. GSAP ou Framer Motion auraient
   ajouté plusieurs dizaines de Ko pour un résultat équivalent ici.

Ce qui a été écarté :
- un mouvement permanent du bouton de Poksy ;
- un carrousel automatique ;
- le défilement détourné ;
- les sons ;
- les compteurs qui défilent au premier affichage, qui retardent la lecture du solde.

## 6. Résultats après modification

| Mesure | Avant | Après |
|---|---|---|
| Lighthouse mobile, présentation | 89 à 90 | 85 à 87 |
| Lighthouse ordinateur, présentation | 100 | 100 |
| Accessibilité, bonnes pratiques, SEO | 100 / 100 / 100 | 100 / 100 / 100 |
| LCP mobile simulé | 2,9 à 3,0 s | 3,2 à 3,4 s |
| LCP mesuré (Playwright, réseau et processeur ralentis) | 3,4 s | 3,7 s |
| CLS mesuré / Lighthouse | 0,004 / 0,097 | 0,004 / 0,097 |
| Interaction la plus lente (processeur 4x plus lent) | 120 ms | 96 ms |
| Poids transféré, présentation mobile | 385 Kio | 403 Kio |
| JS principal (gzip) | 160 Ko | 165 Ko |
| Emojis visibles | 6 | 0 |

**Limite** : sur mobile simulé lent, le LCP gagne 0,3 à 0,4 s, à cause d'un peu plus de code (Poksy, démos,
mouvement). Le score reste au-dessus de 85, l'ordinateur reste à 100. Les quatre captures de la galerie ne sont
téléchargées qu'à son approche.

Captures avant / après : [docs/captures/serie9](captures/serie9).
