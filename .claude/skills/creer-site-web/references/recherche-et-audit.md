# Recherche, inspiration et audit

À utiliser pour une refonte, une page d'accueil, un nouveau projet ambitieux ou une demande du type
« rends-le plus beau / plus simple / plus interactif ». Adapte l'ampleur à la demande : un petit
correctif n'a pas besoin de vingt sources.

## Sommaire
1. Accès au web
2. Recherche documentaire
3. Références à étudier (sans copier)
4. Audit du site dans un vrai navigateur
5. Parcours utilisateurs simulés
6. Synthèse et plan
7. Classement des améliorations

## 1. Accès au web

L'environnement peut bloquer certains sites (l'accès par le proxy est refusé). Dans ce cas, dis-le et
propose à l'utilisateur d'ouvrir l'accès (paramètres réseau de l'environnement) ou de travailler à partir
des résultats de recherche. **Ne prétends jamais avoir visité un site ou visionné une vidéo** si tu n'as
lu que son titre ou un résumé ; indique précisément ce que tu as réellement consulté.

## 2. Recherche documentaire

Selon le sujet, au minimum : 5 applications ou sites du domaine, 5 articles ou guides spécialisés,
3 vidéos pertinentes (seulement si réellement consultables), les recommandations officielles.

Sources reconnues à privilégier : Nielsen Norman Group, Laws of UX, Baymard Institute, Interaction
Design Foundation, Material Design, Apple Human Interface Guidelines, Microsoft Fluent, W3C / WCAG 2.2,
GOV.UK Design System, web.dev (Core Web Vitals), publications universitaires.

Pour chaque source : titre, auteur ou organisme, lien, date si disponible, éléments intéressants,
limites, ce qui peut être adapté, ce qui ne doit pas être reproduit, risque en cas de mauvaise utilisation.

Thèmes de recherche utiles (comportement humain) :
- psychologie cognitive : charge cognitive, mémoire de travail, position sérielle, attention sélective,
  reconnaissance plutôt que mémorisation, surcharge, décision, aversion à la perte, perception du
  risque, anxiété (ex. liée à l'argent) ;
- lois UX : Hick, Fitts, Jakob, Gestalt, Von Restorff, Peak-End, divulgation progressive, retour
  immédiat, affordance, correspondance naturelle, cohérence, prévention des erreurs, contrôle utilisateur ;
- interactions : durée des micro-interactions, perception de la vitesse, transitions, apparition au
  défilement, parallaxe légère, carrousels accessibles, graphiques animés, survol, clic, chargement,
  skeletons, confirmations, réussite, réduction du mouvement ;
- mobile : usage à une main, zone du pouce, taille des cibles, navigation inférieure, clavier,
  formulaires courts, 320 px, zones sûres, appareils modestes ;
- conception responsable : engagement sans manipulation, pas de dark pattern, pas de fausse urgence,
  pas de culpabilisation, pas d'animation addictive, possibilité d'interrompre et de revenir.

## 3. Références à étudier (sans copier)

Règle absolue : ne reprends ni code, ni textes, ni logo, ni illustrations, ni animations propriétaires,
ni mise en page complète. Comprends la bonne pratique, puis crée une adaptation originale.
Pour chaque référence : ce qui attire d'abord l'attention, hiérarchie, rythme du défilement, clics,
survols, entrées et sorties, changements d'état, images, lien texte / visuel, performance, mobile,
ce qui donne envie de continuer, ce qui distrait.

Liste validée par l'utilisateur et ce qu'il faut en retenir :

| Référence | À retenir | À éviter |
|---|---|---|
| Notion | calme, espace, divulgation progressive, états vides utiles, menus sobres | copier son apparence |
| Stripe | montants précis et alignés, listes lisibles, statuts, filtres simples, couleur réservée à l'important | allure de logiciel comptable |
| Linear | navigation rapide, actions toujours au même endroit, peu de bordures et d'ombres, animations courtes, mode sombre élégant, un seul accent, focus visible | densité d'outil pour développeurs |
| Airbnb | une question à la fois, choix en cartes, progression, bouton principal évident, retour facile, récapitulatif | textes et illustrations |
| Headspace | mots simples, ton calme, couleurs rassurantes, guider sans culpabiliser | univers enfantin |
| Apple Santé | cartes thématiques, résumé avant détails, graphique + phrase, tendances simples | trop de cartes |
| Google Calendar | aujourd'hui / cette semaine / plus tard, récurrences claires, navigation par mois | calendrier complexe si une liste suffit |
| Todoist | informations transformées en petites actions, priorité claire, terminer ou ignorer, peu d'actions à la fois | vrai gestionnaire de tâches |
| Duolingo | progression, retour immédiat, petites étapes, encouragements | flammes, vies, classements, récompenses enfantines, culpabilisation |
| Revolut | masquer les montants, actions rapides au pouce, icônes simples | promotions, crypto, trading, fonctions secondaires |
| Apple Wallet | une carte principale identifiable, peu de texte, forte hiérarchie, grandes zones tactiles | cartes bancaires graphiques |
| Plausible | indicateurs essentiels sur une page, peu de graphiques utiles, listes simples | réglages inutiles |
| PocketGuard | un montant « vraiment disponible » qui répond à « combien puis-je encore dépenser ? », « Comment est-ce calculé ? » | - |
| Pilote Budget, Fais tes Comptes | saisie manuelle rapide, sans connexion bancaire, sauvegarde visible | dictée, photo de ticket, import auto sans validation |
| YNAB | donner un rôle à son argent, montant restant à répartir, sans imposer de méthode | complexité |
| Goodbudget | enveloppes visuelles, consommé / restant, alerte avant dépassement | jargon |
| Fintur, Linxo | estimation du solde futur (7, 15, 30 jours), marquée comme estimation | connexion bancaire |
| Apple (pages produit) | mise en scène au défilement | scroll hijacking |
| Framer, Webflow, GSAP | idées de transitions modernes | bibliothèques lourdes sans besoin |
| Mobbin, Pageflows | parcours complets (onboarding, confirmations, suppressions, formulaires) | se limiter à l'apparence |
| Dribbble, Behance, Awwwards | palettes, typographies, espacements, tendances | interfaces expérimentales, animations lourdes |

Cherche aussi des références originales hors de cette liste, adaptées au domaine du nouveau site.

## 4. Audit du site dans un vrai navigateur

Lance la **version de production** (pas seulement le serveur de dev), avec Playwright / Chromium.
- Toutes les pages, en clair et en sombre, aux largeurs 1440, 1100, 800, 520, 390, 320 px (et aux
  11 tailles téléphone de `mobile-et-fenetres.md` pour le mobile).
- Profils testés : nouvel utilisateur, chaque type de public, téléphone seul, clavier seul, animations
  réduites.
- Repère : hiérarchie, compréhension immédiate, cohérence des couleurs, lisibilité, espacements,
  taille des boutons, formulaires, erreurs, confirmations, graphiques, menus, navigation mobile, états
  vides, temps de chargement, débordements, textes coupés, console, actions trop longues, informations
  répétées, cartes trop nombreuses, pages trop longues, éléments sans retour visuel, contenu trop bas.
- Mesures de référence : Lighthouse mobile et ordinateur, LCP, CLS, INP, poids et nombre de requêtes,
  réseau lent et processeur ralenti.
- **Captures avant** des pages principales (ordinateur et téléphone), conservées pour comparer après.

## 5. Parcours utilisateurs simulés

Réalise dans le navigateur les parcours clés du site (ex. SoldeClair : créer un profil de chaque type,
charger une démo, ajouter un revenu, une dépense depuis l'accueil, une charge puis la modifier, créer
une limite, provoquer les alertes, créer un objectif et un versement, simuler un achat raisonnable puis
excessif, changer de mois, rechercher, exporter CSV et JSON, effacer puis restaurer, changer de thème,
tout faire au téléphone, tout faire au clavier).

Pour chaque parcours : nombre d'étapes, difficultés, éléments peu clairs, erreurs, améliorations,
priorité. Liste les scénarios réussis et échoués, avec la gravité des anomalies.

## 6. Synthèse et plan

Crée un document court (publiable comme page ou document partagé) avec :
1. résumé de la recherche ; 2. forces actuelles ; 3. faiblesses observées ; 4. corrections
indispensables ; 5. améliorations recommandées ; 6. idées rejetées et fonctions à ne pas ajouter ;
7. direction visuelle unique ; 8. parcours mobile proposé ; 9. ordre de réalisation ; 10. risques de
surcharge et de régression ; 11. tests prévus.

Distingue toujours : **problèmes vérifiés dans le navigateur**, **idées issues de la recherche**,
**simples hypothèses à valider**. Ne lance pas de refonte totale sans justification ; garde ce qui marche.

## 7. Classement des améliorations

Classe en : corrections indispensables, améliorations importantes, utiles mais non urgentes, idées
pour plus tard, changements à éviter. Pour chacune : problème observé, impact, solution, pages,
difficulté, risque, priorité, source ou bonne pratique, test prévu.

Applique directement les corrections et améliorations à faible risque ; propose les changements
importants avec des questions à choix (option recommandée en premier, aperçu ASCII si utile).
