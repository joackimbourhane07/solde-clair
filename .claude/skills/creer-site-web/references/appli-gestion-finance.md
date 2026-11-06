# Module : appli de gestion / finance personnelle

À lire seulement si le site manipule de l'argent, un budget, des comptes, de l'épargne ou des données
personnelles chiffrées. Tiré du cahier des charges initial de SoldeClair et des corrections suivantes.

## Sommaire
1. Fonctions de base attendues
2. Règles de calcul
3. Comptes, porte-monnaie et soldes
4. Distinctions à ne jamais confondre
5. Profils et personnalisation
6. Données réelles de l'utilisateur
7. Tests minimums

## 1. Fonctions de base attendues

Configuration guidée ; tableau de bord ; revenus ; charges fixes ; dépenses variables ; budgets par
catégorie (alertes 75 %, 90 %, 100 %) ; objectifs d'épargne ; simulateur d'achat ; historique avec
recherche, filtres et bilan mensuel ; graphiques simples ; sauvegarde (CSV, JSON, import, effacement
avec double confirmation) ; profils de démonstration fictifs ; paramètres (thème, masquage des montants,
animations réduites, catégories).

Champs typiques :
- revenu : nom, montant, date, catégorie, récurrent ou exceptionnel, fréquence, date de fin, note,
  « sûr » ou « attendu » (fourchette, montant inconnu, inclus dans la projection optimiste), détail
  facultatif (lignes du bulletin de paie), compte de versement, dernier versement déjà reçu ;
- charge fixe : nom, montant, date de prélèvement, catégorie, fréquence, statut payé / à venir, note ;
- dépense : montant, catégorie, date, description, moyen de paiement, « exceptionnelle » ;
- objectif : nom, description, montant cible, déjà disponible, date souhaitée, priorité, contribution
  mensuelle ; calculés : restant, mois restants, mensuel nécessaire, pourcentage, date estimée.

Le simulateur affiche solde après achat, nouveau disponible par jour, impact sur l'épargne et les
objectifs, dépassement de catégorie, et une appréciation (« situation confortable », « achat possible
avec prudence », « achat susceptible de déséquilibrer le budget ») présentée comme **simple indication,
pas un conseil financier**. Il ne modifie jamais les données.

## 2. Règles de calcul

- Montants en **centimes entiers** (pas de flottants), affichage à deux décimales, arrondi prudent
  (disponible par jour arrondi vers le bas). Affiche « 0,00 € » et jamais « -0,00 € ».
- Le chiffre principal (« Il te reste X € ») = **exactement le solde du compte** (tout ce qui est
  arrivé moins tout ce qui est parti depuis la première saisie), avec « Comment est-ce calculé ? ».
  Disponible par jour = ce solde / jours restants du mois (aujourd'hui compris).
- Une opération prévue compte **le jour où elle arrive** ; « À venir » liste les prochains jours
  (3 jours sur l'accueil, 30 dans le relevé ; pastille du nombre seulement pour les 7 prochains jours).
- Cumul : ce qui reste à la fin d'un mois passe au suivant (réglable). Les salaires de fin de mois
  servent au mois suivant : règle « reçu à partir du 20 → compte pour le mois suivant » (jour réglable,
  désactivable), le relevé gardant la vraie date. « Dernier versement déjà reçu » à la création du
  profil et dans le formulaire de revenu, pour qu'un salaire récurrent ne démarre pas à 0.
- Solde réel : bouton « Ajuster le solde » qui crée une correction datée (sans supprimer l'historique),
  et « Solde actuel » facultatif dans la configuration.
- Épargne en **bleu**, pas en rouge : ce n'est pas une dépense, mais elle sort du disponible du mois.
- Pourcentages affichés sans plafond (« objectif atteint à 312 % »).
- Estimation à 7, 15 et 30 jours clairement marquée comme estimation.

## 3. Comptes, porte-monnaie et soldes

- Vue « Mon compte » façon appli bancaire : solde du jour en vert (rouge si négatif, sans encadré),
  bulles-onglets « Opérations » / « À venir », opérations groupées par jour (« Aujourd'hui », « Hier »,
  « Mercredi 4 novembre ») avec solde de fin de journée, recherche, totaux entrées / sorties.
- Porte-monnaie séparés quand ils servent vraiment : carte restaurant (reconnue par son nom : carte
  restaurant, carte / chèque déjeuner, titres-restaurant, Swile, Edenred, Pluxee…), Izly (étudiants).
  Chaque porte-monnaie a son solde ; le total les additionne ; une dépense payée avec lui en sort.
- Recharge d'un porte-monnaie (ex. Izly) = deux mouvements liés (− compte, + porte-monnaie, même
  identifiant de lien), **sans effet sur le total ni sur les dépenses** ; supprimer l'un supprime l'autre.
- Services tiers (Izly, CROUS, banques, Apple Pay) : **suivi manuel uniquement**, mention « Suivi
  manuel, aucun accès à ton compte {service} », aucun partenariat revendiqué, pas de logo, aucun
  identifiant / code / QR code demandé, pas de fausse synchronisation. Connexion bancaire directe
  impossible pour un site statique gratuit : propose plutôt, si demandé, l'import d'un relevé CSV/OFX
  avec vérification et détection des doublons.

## 4. Distinctions à ne jamais confondre

- épargne totale / épargne disponible (un PEL ou de l'épargne bloquée n'est pas disponible) ;
- revenu encaissé / avantage en nature (titres-restaurant = « pouvoir d'achat alimentaire ») ;
- dépense réelle / immobilisation temporaire (caution, dépôt de garantie : « somme bloquée », bouton
  « Rendu ») ;
- projection de base (revenus sûrs) / projection optimiste (avec revenus attendus cochés) ;
- dépense courante / dépense exceptionnelle ;
- solde brut / montant réellement disponible.

## 5. Profils et personnalisation

Recherche les conditions de vie de chaque public avant de décider (ex. étudiant : bourse sur 10 mois,
APL, Izly ; alternant : fin de contrat, 13e mois selon convention, solde de tout compte ; salarié :
primes, 13e mois ; indépendant : revenus irréguliers, réserve de 3 à 6 mois, cotisations URSSAF).
**Mets en avant** ce qui concerne le profil (repères, questions de l'assistant, catégories proposées,
onglets d'ajout) sans interdire le reste. Page « Mon plan » possible : objectif principal tous supports
confondus, supports d'épargne (taux, plafond, disponibilité), projection mois par mois, revenus attendus,
bilan du mois guidé (compare prévu / réel et ne crée que ce qui manque, rien n'est compté deux fois).

## 6. Données réelles de l'utilisateur

Le site est public : **aucune donnée réelle dans le dépôt**, même dans un test ou une démo. Pour
préremplir :
1. assure-toi que l'application a les champs nécessaires (sinon ajoute-les) ;
2. documente le format du fichier de sauvegarde JSON (version, champs, exemples fictifs) ;
3. donne à l'utilisateur un prompt prêt pour qu'un assistant crée ce fichier **sur son ordinateur**,
   hors dépôt ;
4. l'utilisateur l'importe dans Paramètres ; ce fichier devient le « point de départ » (bouton
   « Réinitialiser aux données par défaut » qui y revient, après double confirmation).
Lecture / écriture du stockage sous try/catch ; l'application fonctionne si le stockage est vide ou
bloqué (navigation privée) ; migration douce des anciennes données (ajout de champs avec valeurs par
défaut, jamais de perte).

## 7. Tests minimums

Totaux des revenus, charges, dépenses ; solde ; disponible par jour ; limites et seuils ; objectifs ;
simulateur (sans modification) ; changement de mois ; report ; règle du 20 ; ajustements ; comptes et
porte-monnaie séparés ; recharge (total inchangé) ; import / export (aller-retour sans perte) ; validation
des formulaires (vide, négatif, texte, décimales) ; profils de démonstration ; personnalisation par profil.
