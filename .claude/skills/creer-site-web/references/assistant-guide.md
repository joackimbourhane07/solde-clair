# Assistant guide intégré (type Poksy)

Spécification de l'assistant Poksy de SoldeClair, réutilisable pour tout site qui veut un guide
d'utilisation. Par défaut : **100 % local**, sans API d'intelligence artificielle (choix de l'utilisateur :
une IA en ligne coûte de l'argent et enverrait des données).

## Sommaire
1. Identité
2. Bouton flottant et message de première visite
3. Fenêtre de discussion
4. Contenu : fiches, recherche, questions par page
5. Format des réponses
6. Actions
7. Confidentialité
8. Accessibilité
9. Tests
10. Si une vraie IA est demandée plus tard

## 1. Identité

- Un nom (demande-le ; garde exactement celui du dépôt, ne renomme pas la marque), un rôle affiché
  (« Guide {NomDuSite} »), une phrase de présentation courte.
- Personnalité : calme, sympathique, claire, encourageante, directe, professionnelle, jamais
  culpabilisante, adaptée aux débutants. Mots simples, réponses courtes.
- Ne se présente jamais comme une banque, un conseiller financier, un comptable, un organisme de
  crédit, un service d'investissement, ni comme une IA s'il n'en est pas une (« Je ne suis pas une
  intelligence artificielle. »).
- Avatar : photo fournie par l'utilisateur (détourée, optimisée WebP 96 / 192 px, `srcset`) ou SVG
  original (formes simples, lisible en petit, dans un cercle de la couleur claire de la marque, sans
  texte ni logo ni symbole monétaire). Avatar décoratif : `alt=""` et `aria-hidden="true"`.

## 2. Bouton flottant et message de première visite

- Ordinateur : en bas à droite, sans masquer de contenu. Téléphone : au-dessus de la barre du bas,
  sans gêner le bouton « + », dans les zones sûres, atteignable au pouce. Nom accessible
  « Ouvrir l'aide de {Nom} », `aria-expanded`.
- Caché quand le clavier est ouvert ou qu'un menu est ouvert.
- Message de première visite **une seule fois** (mémorisé dans `localStorage`), personnalisé avec le
  prénom : carte bien visible et chaleureuse (photo, nom, rôle, phrase, détail court, boutons
  « Poser une question » et « Plus tard », croix de fermeture), avec une pointe vers le bouton. Il
  disparaît quand on change de page et ne revient pas. Présent aussi sur la page d'accueil.
- Astuces par page (facultatives) : rares, après un délai, une par page au plus, désactivables
  (« Ne plus afficher les astuces »), jamais pendant une action.

## 3. Fenêtre de discussion

- Contenu : avatar, nom, rôle, bouton « Fermer {Nom} », message de bienvenue court, choix rapides,
  champ « Ta question pour {Nom} » + « Envoyer », réponses, boutons d'action, mention de confidentialité.
- Téléphone : panneau sur la majeure partie de l'écran (`bottom: var(--clavier)`). Ordinateur :
  panneau en bas à droite. Clair et sombre. Chargé à la demande (découpage du code).
- Conversation conservée si on ferme puis rouvre ; flux chronologique et défilement du seul conteneur
  (voir `mobile-et-fenetres.md` §5) ; bouton « Nouveau message » ; indicateur d'écriture court
  (~400 ms, supprimé en mouvement réduit).
- **Trois choix rapides au maximum** sous la dernière réponse : la suite logique de la dernière
  question (même rubrique), puis les questions de la page, puis celles du profil, puis les fréquentes ;
  jamais une question déjà posée. Titre du groupe : « Sur cette page », « Questions fréquentes » ou
  « Et ensuite ? ». Un bouton « Plus de questions » / « Moins de questions » déplie toutes les rubriques.

## 4. Contenu : fiches, recherche, questions par page

- Une liste structurée de **fiches** : id, question, réponse (texte ou fonction qui ajoute les vrais
  chiffres de l'utilisateur, jamais inventés, masqués si l'utilisateur masque les montants), action
  facultative, mots-clés, pages concernées.
- Rubriques thématiques (ex. SoldeClair : Mon compte, Revenus et dépenses, Budget, Épargne, Simulateur,
  Confidentialité, Utilisation du site, Mon plan).
- Recherche par mots-clés **normalisée** (minuscules, sans accents, mots vides retirés), avec
  synonymes courants. Sans résultat : « Je n'ai pas encore trouvé la réponse exacte. Tu peux choisir une
  question proposée ou ouvrir la rubrique correspondante. »
- Questions adaptées à la page ouverte (3 par page importante) et au profil de l'utilisateur.
- Sur la page d'accueil (visiteur sans profil) : questions de présentation (qu'est-ce que c'est, est-ce
  gratuit, où sont mes données) et aucun bouton vers des pages internes.
- Réponses spéciales : salutations, remerciements, « puis-je acheter… » (« je ne décide pas à ta
  place », renvoi vers l'outil adapté), conseil financier ou d'investissement (refus poli + renvoi vers
  un professionnel), données sensibles tapées par erreur (masquées + rappel de ne jamais les donner).

## 5. Format des réponses

- 1 à 4 phrases, **240 caractères au plus** (hors chiffres ajoutés) : une courte phrase, le résultat,
  une action ; puis trois choix rapides maximum.
- Commence directement par l'explication, français simple, sans jargon, rassurant, jamais culpabilisant.
- Jamais : « Tu gères mal ton argent », « Tu ne devrais pas acheter ça », « Tu dois investir »,
  « Prends un crédit », « Ta situation est mauvaise ».
- Préférer : « Cette catégorie a dépassé la limite prévue. », « Tu peux voir les opérations
  concernées. », « Cette estimation dépend des informations enregistrées. »
- Aucun emoji (même si un exemple de la demande en contient : remplace-le par l'avatar ou une icône).

## 6. Actions

Boutons d'action sous une réponse (« Ajouter une dépense », « Ajuster mon solde », « Ouvrir le
simulateur », « Exporter une sauvegarde »…) qui **ouvrent seulement la bonne page ou le bon
formulaire** (ex. `/compte?ajuster=1`). L'assistant n'enregistre, ne modifie ni ne supprime jamais
rien, n'efface pas les données, n'effectue aucune action réelle. Seule donnée mémorisée : les messages
déjà vus (première visite, astuces). Test automatique pour le vérifier.

## 7. Confidentialité

- Tout fonctionne sur l'appareil : aucune question ni donnée envoyée à une API, un outil publicitaire,
  un service d'analyse ou un serveur tiers (test : aucune requête externe pendant une conversation).
- Ne demande jamais identifiant, mot de passe, numéro de carte, code ou coordonnées bancaires ;
  masque les longues suites de chiffres tapées.
- Mention dans la fenêtre : « {Nom} fonctionne sur ton appareil et ne remplace pas un conseiller
  financier professionnel. » (adapter au domaine).

## 8. Accessibilité

Ouverture et fermeture au clavier, Échap ferme et rend le focus au bouton, ordre de tabulation
logique (Fermer, puis premier choix), focus visible, `role="dialog"` nommé et décrit, nouvelle réponse
annoncée (`role="log"` + `aria-live="polite"`, préfixes masqués « {Nom} : » / « Toi : »), contraste AA,
boutons assez grands, rien que par la couleur, avatar décoratif masqué.

## 9. Tests

Ouverture / fermeture, première visite une seule fois, toutes les questions répondent (aucune
« introuvable »), recherche et message sans résultat, réponses ≤ 240 caractères, boutons d'action
(ouvrent sans enregistrer), aucune donnée modifiée, Échap et focus, clavier, ordre des messages,
3 choix maximum, « Plus de questions », mode sombre, tailles 1440 → 320, débordement, console, axe,
aucune requête externe, chemin GitHub Pages.

## 10. Si une vraie IA est demandée plus tard

Explique d'abord : coût par utilisation (payé par le propriétaire, pas par les visiteurs), besoin d'un
petit serveur pour cacher la clé (jamais dans un site statique), données envoyées au fournisseur,
consentement, limites d'usage. Ne connecte rien sans accord explicite.
