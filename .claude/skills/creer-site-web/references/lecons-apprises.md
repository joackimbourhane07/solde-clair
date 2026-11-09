# Leçons apprises (pièges déjà rencontrés)

Problèmes réels rencontrés pendant SoldeClair et leur solution. Lis cette page avant de déboguer.

## Interface et CSS
- **Raccourci clavier à une seule touche** (ex. « N ») : interdit par WCAG 2.1.4 sans moyen de le désactiver ou
  de le modifier. Préfère un bouton bien placé, ou une combinaison avec une touche de modification.
- **Même montant affiché deux fois** (action « À faire » et carte « Estimation ») : garde le chiffre à un seul
  endroit et reformule l'autre sans montant.
- **Champs qui se chevauchent dans une grille** : un champ avec une longue aide tombait dans une
  colonne « auto » prévue pour un bouton. Mets ce champ sur sa propre ligne (`grid-column: 1 / -1`) et
  teste l'absence de chevauchement de 320 à 1440 px.
- **Conflit de noms de classes** : deux composants avec la même classe (`.poksy-bulle` pour la carte et
  les bulles du chat) → les bulles devenaient fixes. Préfixe les classes par composant.
- **Toast écrasé** : `.toast span { flex: 1 }` étirait l'avatar ; cible plus précisément
  (`.toast > span:not(.toast-avatar)`).
- **Survol gris qui réduit le contraste** du texte : vérifie le contraste aussi à l'état survolé.
- **Liste avec `role="region"`** sur `<ul>` : casse la sémantique ; enveloppe la liste dans un `<div>`.
- Couleurs vives demandées (#47D45A, #FF0000) : contraste insuffisant en petit texte (1,9 et 4,0) ;
  couleurs exactes pour les surfaces, variantes foncées pour le texte.
- Favicon resté à l'ancienne couleur : régénère tous les formats (SVG, PNG 32/192/512, manifeste) et
  change le nom du fichier pour casser le cache.

## Mobile
- Barre du bas qui « monte » : barre fixe au-dessus du clavier iOS, parent transformé, `overflow: hidden`
  inefficace sur iOS. Solutions dans `mobile-et-fenetres.md`.
- `scrollIntoView` dans un chat fait défiler toute la page : utilise `conteneur.scrollTo`.
- Les bugs iOS ne se reproduisent pas en émulation : raisonne sur les causes connues, teste le testable,
  annonce ce qui reste à vérifier sur un vrai téléphone.

## Tests
- **Clic Playwright qui fait défiler la page** : `locator.click()` fait défiler pour atteindre la cible (et
  plus loin si un élément fixe la recouvre). Pour vérifier que l'application ne fait pas défiler, mesure la
  position **juste après** le clic, puis contrôle qu'elle ne bouge plus pendant la suite.
- **Vitest avec `css: false`** : un import `?raw` d'une feuille CSS renvoie une chaîne vide (le test passe sans
  rien vérifier). Lis les fichiers avec `node:fs` (`/// <reference types="node" />` en tête du test) et ajoute
  un test qui prouve que les fichiers sont bien lus.
- Une salutation selon l'heure rend les tests dépendants du moment : fige la date dans `src/test/setup.ts`
  (`vi.useFakeTimers({ toFake: ['Date'], now: ... })`, minuteries réelles).
- **Test axe instable** : une astuce animée apparaissait pendant l'analyse. Désactive les éléments
  différés dans `preparer()` et réactive-les seulement dans leur test.
- Attends la fin des animations (`finAnimations`) avant de mesurer ou d'analyser.
- jsdom n'anime rien : considère le mouvement comme réduit dans les tests unitaires.
- Libellés typographiques : les espaces insécables avant « ? » font échouer `getByRole({ name })` ;
  utilise une fonction `t()` qui applique la même typographie que l'interface.
- Une valeur de démonstration mal saisie (4500 au lieu de 45) se voit dans les captures : relis-les.
- Après un changement de libellé, cherche-le partout (`grep -rn`) : tests unitaires, e2e, scripts de
  vérification, README.

## Textes et conversions automatiques
- Remplacements Python avec « » : l'espace insécable à l'intérieur fait rater la recherche ; cherche
  sans les guillemets ou par expression régulière.
- Passage vous → tu par script : relis les possessifs (« ton banque » → « ta banque », « ton situation »,
  « ton question »), les « que vous » devenus faux (« que toi »), « vôtre » → « tienne »,
  « vous-même » → « toi-même », les impératifs (« Indiquez » → « Indique »), « où t'en êtes » → « où tu en es ».
  Puis grep des restes : `\b(vous|votre|vos|êtes|avez|pouvez|voulez)\b`.

## Outils et environnement
- `pkill -f motif` dont le motif apparaît dans la commande shell elle-même tue le shell (code 144) :
  utilise un motif plus précis ou le PID.
- `git checkout <autre-branche> -- .` écrase le dossier de travail : ne l'utilise jamais pour comparer ;
  utilise `git diff` ou `git show`.
- Un `git push` peut rester bloqué : arrête le processus et relance-le avec un délai maximal.
- Le serveur local qui imite GitHub Pages a besoin de ses arguments (dossier, port) et d'un `404.html`.
- `vite preview` sert `index.html` pour `/robots.txt` : le SEO Lighthouse paraît faux ; mesure plutôt
  avec `scripts/serveur_pages.cjs`.
- Sites de référence ou site publié inaccessibles depuis l'environnement : dis-le, propose d'ouvrir
  l'accès réseau, ne fais pas semblant.

## Données et calculs
- Un revenu daté en fin de mois « disparaît » du mois suivant : d'où le report du reste et la règle
  du 20 (voir `appli-gestion-finance.md`).
- Écart entre deux chiffres affichés (tableau de bord vs compte) : explique l'écart ligne par ligne
  à l'utilisateur et demande quel chiffre il veut, puis rends-les identiques.
- Un « bug » peut être une erreur de saisie de l'utilisateur : vérifie ses données (date, mois) avant de
  changer un calcul, et explique-lui gentiment.
