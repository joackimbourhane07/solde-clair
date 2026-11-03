/**
 * Poksy, le guide de SoldeClair.
 *
 * Fonctionnement 100 % local : des réponses préparées à l'avance, une recherche par mots-clés
 * et des questions adaptées à la page ouverte. Aucune intelligence artificielle, aucun envoi réseau :
 * les questions tapées ne quittent jamais l'appareil et ne sont pas enregistrées.
 */

import type { PoksyAction } from './poksyTextes';
import type { ProfileType } from '../types';

export { MESSAGE_BIENVENUE, MESSAGE_PREMIERE_VISITE, type MessagePoksy, type PoksyAction } from './poksyTextes';

export const ACTION_LABELS: Record<PoksyAction, string> = {
  depense: 'Ajouter une dépense',
  revenu: 'Ajouter un revenu',
  ajuster: 'Ajuster mon solde',
  tableau: 'Voir mon tableau de bord',
  objectif: 'Créer un objectif',
  simulateur: 'Ouvrir le simulateur',
  budgets: 'Voir mes budgets',
  sauvegarde: 'Exporter une sauvegarde',
  parametres: 'Ouvrir les paramètres',
  plan: 'Ouvrir Mon plan d’épargne',
};

/** Adresse ouverte par chaque bouton (« depense » ouvre le formulaire d'ajout sur la page en cours). */
export const ACTION_ROUTES: Record<Exclude<PoksyAction, 'depense'>, string> = {
  revenu: '/revenus?ajouter=1',
  ajuster: '/compte?ajuster=1',
  tableau: '/',
  objectif: '/objectifs?ajouter=1',
  simulateur: '/simulateur',
  budgets: '/budgets',
  sauvegarde: '/parametres',
  parametres: '/parametres',
  plan: '/plan',
};

export type PageKey = 'compte' | 'depenses' | 'budgets' | 'objectifs' | 'plan' | 'parametres' | 'presentation' | 'autre';

export function pageDe(pathname: string): PageKey {
  const p = pathname.replace(/\/+$/, '');
  if (p === '/compte') return 'compte';
  if (p === '/depenses') return 'depenses';
  if (p === '/budgets') return 'budgets';
  if (p === '/objectifs') return 'objectifs';
  if (p === '/plan') return 'plan';
  if (p === '/parametres') return 'parametres';
  if (p === '/presentation') return 'presentation';
  return 'autre';
}

/** Chiffres réels de l'utilisateur, déjà mis en forme (ou masqués), pour compléter certaines réponses. */
export interface ContextePoksy {
  resteAVivre?: string;
  /** Le solde du mois est négatif (formulation neutre, jamais culpabilisante). */
  resteNegatif?: boolean;
  parJour?: string;
  joursRestants?: number;
  /** Un solde réel a-t-il déjà été indiqué (onglet Compte) ? */
  ajustementFait?: boolean;
}

export interface Fiche {
  id: string;
  question: string;
  reponse: string | ((ctx: ContextePoksy) => string);
  action?: PoksyAction;
  /** Mots-clés (sans accents ni majuscules nécessaires) ; une expression compte plus qu'un mot seul. */
  motsCles: string[];
  /** Pages où la fiche est la plus utile (petit bonus dans la recherche). */
  pages?: PageKey[];
}

export const PRESENTATION = 'Poksy t’aide à comprendre ton budget, simplement.';

export const MENTION = 'Poksy fonctionne sur ton appareil et ne remplace pas un conseiller financier professionnel.';

export const REPONSE_INTROUVABLE =
  'Je n’ai pas encore trouvé la réponse exacte. Tu peux choisir une question proposée ou consulter la rubrique correspondante dans SoldeClair.';

/* -------------------------------------------------------------------------- */
/* Fiches                                                                      */
/* -------------------------------------------------------------------------- */

export const FICHES: Fiche[] = [
  // --- Sécurité : toujours prioritaire (aucune donnée bancaire n'est demandée) ---
  {
    id: 'securite',
    question: 'Dois-je donner mes codes bancaires ?',
    reponse: 'Ne saisis jamais de mot de passe, de code ni de numéro de carte. SoldeClair n’en a jamais besoin. Tu notes toi-même tes opérations.',
    motsCles: [
      'mot de passe',
      'mdp',
      'code secret',
      'code de securite',
      'code pin',
      'cryptogramme',
      'cvv',
      'numero de carte',
      'iban',
      'rib',
      'identifiant',
      'login',
    ],
  },
  {
    id: 'reste-a-vivre',
    question: 'Comment est calculé mon reste à vivre ?',
    reponse: (ctx) =>
      'Ton reste à vivre est le solde de « Mon compte » : l’argent reçu, moins tes dépenses, charges et épargne. Une opération prévue compte le jour où elle arrive. Appuie sur « Comment est-ce calculé ? » dans le tableau de bord pour le détail.' +
      (ctx.resteAVivre
        ? ctx.resteNegatif
          ? ` Aujourd’hui, ton solde est de ${ctx.resteAVivre}.`
          : ` Aujourd’hui, il te reste ${ctx.resteAVivre}.`
        : ''),
    action: 'tableau',
    motsCles: [
      'reste a vivre',
      'il me reste',
      'combien il reste',
      'combien me reste',
      'reste du mois',
      'disponible du mois',
      'solde disponible',
      'calcul du reste',
    ],
  },
  {
    id: 'par-jour',
    question: 'Comment est calculé mon disponible quotidien ?',
    reponse: (ctx) =>
      'Ton reste à vivre, divisé par les jours restants du mois. Arrondi vers le bas, pour ne jamais surestimer.' +
      (ctx.parJour && ctx.joursRestants
        ? ` Aujourd’hui : environ ${ctx.parJour} par jour pendant ${ctx.joursRestants} jour${ctx.joursRestants > 1 ? 's' : ''}.`
        : ''),
    action: 'tableau',
    motsCles: ['par jour', 'quotidien', 'chaque jour', 'journalier', 'disponible par jour', 'disponible quotidien', 'budget du jour'],
  },
  {
    id: 'ajouter-depense',
    question: 'Comment ajouter une dépense ?',
    reponse: 'Appuie sur « + », saisis le montant, choisis une catégorie, valide. Ton disponible est recalculé aussitôt.',
    action: 'depense',
    motsCles: [
      'ajouter une depense',
      'nouvelle depense',
      'saisir une depense',
      'noter une depense',
      'enregistrer une depense',
      'depense',
      'depenser',
      'achat fait',
      'ticket de caisse',
    ],
    pages: ['depenses'],
  },
  {
    id: 'fixe-variable',
    question: 'Quelle différence entre charge fixe et dépense variable ?',
    reponse: 'Une charge fixe revient chaque mois : loyer, abonnement. Une dépense variable change : courses, sorties.',
    motsCles: ['charge fixe et depense variable', 'fixe et variable', 'fixe ou variable', 'difference entre'],
  },
  {
    id: 'ajuster-solde',
    question: 'Comment ajuster mon solde ?',
    reponse: 'Ouvre « Mon compte », puis « Ajuster le solde ». Indique le montant réellement affiché par ta banque. Tes opérations restent intactes.',
    action: 'ajuster',
    motsCles: [
      'ajuster',
      'ajuster le solde',
      'solde reel',
      'vrai solde',
      'corriger le solde',
      'mettre a jour le solde',
      'solde de depart',
      'argent deja present',
      'solde',
    ],
    pages: ['compte'],
  },
  {
    id: 'creer-objectif',
    question: 'Comment créer un objectif d’épargne ?',
    reponse: 'Ouvre « Objectifs », puis « Nouvel objectif ». Donne un nom, un montant, une date si tu veux. SoldeClair calcule l’effort par mois.',
    action: 'objectif',
    motsCles: ['creer un objectif', 'nouvel objectif', 'objectif', 'epargne', 'economiser', 'mettre de cote pour', 'projet'],
    pages: ['objectifs'],
  },
  {
    id: 'donnees-ou',
    question: 'Où sont enregistrées mes données ?',
    reponse: 'Tes données restent dans ce navigateur, sur cet appareil. Rien n’est envoyé. Pense à exporter une sauvegarde.',
    action: 'sauvegarde',
    motsCles: [
      'ou sont enregistrees',
      'ou sont stockees',
      'donnees',
      'stockage',
      'stocke',
      'confidentialite',
      'vie privee',
      'serveur',
      'cloud',
      'navigateur',
      'securise',
    ],
    pages: ['parametres'],
  },

  // --- Page d'accueil (présentation) ---
  {
    id: 'soldeclair-quoi',
    question: 'Qu’est-ce que SoldeClair ?',
    reponse:
      'Une application gratuite pour suivre ton budget. Tu notes tes opérations, sans lien avec ta banque. Appuie sur « Commencer » ou essaie une démonstration.',
    motsCles: ['soldeclair', 'c est quoi', 'a quoi sert', 'presentation', 'comment ca marche', 'commencer'],
    pages: ['presentation'],
  },
  {
    id: 'gratuit',
    question: 'Est-ce gratuit ?',
    reponse: 'Oui, SoldeClair est entièrement gratuit. Sans publicité, sans compte. Tes données restent sur ton appareil.',
    motsCles: ['gratuit', 'payant', 'prix', 'cout', 'abonnement soldeclair', 'publicite', 'payer'],
    pages: ['presentation'],
  },
  // --- Mon compte ---
  {
    id: 'solde-banque',
    question: 'Pourquoi mon solde ne correspond-il pas à ma banque ?',
    reponse: (ctx) =>
      'SoldeClair part de 0 € et ne connaît que tes saisies. Une dépense oubliée crée un écart. « Ajuster le solde » repart du montant de ta banque.' +
      (ctx.ajustementFait === false ? ' Aucun solde réel n’a encore été indiqué.' : ''),
    action: 'ajuster',
    motsCles: [
      'ne correspond pas',
      'correspond pas',
      'pas le meme',
      'solde different',
      'different de ma banque',
      'difference avec ma banque',
      'ecart',
      'solde faux',
      'solde a zero',
      'zero euro',
      'pourquoi 0',
    ],
    pages: ['compte'],
  },
  {
    id: 'ajustement-quoi',
    question: 'Qu’est-ce qu’un ajustement de solde ?',
    reponse: 'Une correction datée du solde. Elle comble l’écart avec ta banque. Tu peux la supprimer à tout moment.',
    action: 'ajuster',
    motsCles: ['ajustement', 'ajustement de solde', 'correction du solde', 'c est quoi un ajustement'],
    pages: ['compte'],
  },
  {
    id: 'izly',
    question: 'Comment suivre mes dépenses Izly ?',
    reponse:
      'Appuie sur « + », puis « Izly ». Choisis un achat campus et le montant. Suivi manuel, aucun accès à ton compte Izly. « Recharger Izly » dans « Mon compte » déplace l’argent de ta banque.',
    action: 'depense',
    motsCles: ['izly', 'crous', 'resto u', 'restaurant universitaire', 'cafeteria', 'laverie', 'campus', 'recharge izly', 'recharger izly'],
  },
  {
    id: 'carte-restaurant',
    question: 'Pourquoi la carte restaurant est-elle séparée ?',
    reponse:
      'La carte restaurant a son propre solde, comme un deuxième compte. Les repas payés avec elle en sont retirés. « Mon compte » additionne les deux.',
    motsCles: [
      'carte restaurant',
      'carte resto',
      'carte dejeuner',
      'cheque dejeuner',
      'titre restaurant',
      'titres restaurant',
      'ticket resto',
      'ticket restaurant',
      'swile',
      'edenred',
      'pluxee',
      'bimpli',
    ],
    pages: ['compte'],
  },
  {
    id: 'masquer',
    question: 'Comment masquer les montants ?',
    reponse: 'Appuie sur l’icône en forme d’œil. Les montants deviennent « ••• € ». Appuie de nouveau pour les revoir.',
    motsCles: ['masquer', 'masquer les montants', 'cacher', 'cacher les montants', 'oeil', 'discret', 'en public', 'afficher les montants'],
  },
  {
    id: 'a-venir',
    question: 'Que sont les opérations à venir ?',
    reponse: 'Dans « Mon compte », la bulle « À venir » liste les 30 prochains jours. Ces opérations comptent le jour où elles arrivent.',
    motsCles: ['a venir', 'operations a venir', 'prevu', 'prevues', 'prochains jours', 'prochain prelevement', 'bulle'],
    pages: ['compte'],
  },

  // --- Revenus et dépenses ---
  {
    id: 'ajouter-revenu',
    question: 'Comment ajouter un revenu ?',
    reponse: 'Ouvre « Revenus », puis « Ajouter un revenu ». Indique le montant, la date et la fréquence. Il est compté dans le mois concerné.',
    action: 'revenu',
    motsCles: ['ajouter un revenu', 'nouveau revenu', 'revenu', 'salaire', 'paie', 'paye', 'allocation', 'bourse', 'virement recu', 'argent recu'],
  },
  {
    id: 'modifier-operation',
    question: 'Comment modifier une opération ?',
    reponse: 'Appuie sur le crayon à côté de l’opération. Modifie, puis enregistre. Les totaux se mettent à jour.',
    motsCles: ['modifier', 'modifier une operation', 'changer une operation', 'corriger une operation', 'erreur de saisie', 'crayon', 'editer'],
    pages: ['depenses'],
  },
  {
    id: 'supprimer-operation',
    question: 'Comment supprimer une opération ?',
    reponse: 'Appuie sur la corbeille à côté de l’opération, puis confirme. Pour une opération récurrente, mets plutôt une date de fin.',
    motsCles: [
      'supprimer une operation',
      'supprimer une depense',
      'supprimer un revenu',
      'effacer une operation',
      'retirer une operation',
      'enlever',
      'corbeille',
    ],
  },
  {
    id: 'revenu-exceptionnel',
    question: 'Qu’est-ce qu’un revenu exceptionnel ?',
    reponse:
      'Un revenu unique : prime, remboursement, vente. Choisis « Exceptionnel » dans le formulaire. Reçu à partir du 20, il compte le mois suivant.',
    action: 'revenu',
    motsCles: ['revenu exceptionnel', 'exceptionnel', 'ponctuel', 'une seule fois', 'prime', 'remboursement', 'vente'],
  },
  {
    id: 'fin-de-mois',
    question: 'Pourquoi un revenu compte-t-il pour le mois suivant ?',
    reponse:
      'Un revenu reçu à partir du 20 compte pour le mois suivant. « Mon compte » le montre à sa vraie date. Tu peux changer ce jour dans les paramètres.',
    action: 'parametres',
    motsCles: [
      'mois suivant',
      'fin de mois',
      'a partir du 20',
      'regle du 20',
      'prime de fin',
      'n apparait pas',
      'pas dans les revenus',
      'paye en fin de mois',
      'dernier versement',
      'aucun revenu ce mois',
      'salaire pas compte',
    ],
  },
  {
    id: 'recurrent',
    question: 'Comment fonctionne une opération récurrente ?',
    reponse: 'Une opération récurrente revient toute seule : chaque semaine, mois ou année. Ajoute une date de fin pour l’arrêter.',
    motsCles: ['recurrent', 'recurrente', 'operation recurrente', 'frequence', 'repetition', 'tous les mois', 'automatiquement', 'date de fin'],
  },
  {
    id: 'choisir-categorie',
    question: 'Comment choisir une catégorie ?',
    reponse: 'Choisis la catégorie la plus proche. Tes catégories fréquentes sont en tête. « + Nouvelle catégorie… » en crée une.',
    action: 'depense',
    motsCles: ['categorie', 'choisir une categorie', 'nouvelle categorie', 'creer une categorie', 'classer'],
    pages: ['depenses'],
  },

  // --- Budget ---
  {
    id: 'charge-fixe',
    question: 'Qu’est-ce qu’une charge fixe ?',
    reponse: 'Une dépense qui revient : loyer, forfait, assurance. Ajoute-la une fois dans « Charges fixes ». Elle compte à chaque échéance.',
    motsCles: ['charge fixe', 'charges fixes', 'loyer', 'abonnement', 'assurance', 'facture', 'prelevement', 'forfait'],
  },
  {
    id: 'depense-variable',
    question: 'Qu’est-ce qu’une dépense variable ?',
    reponse: 'Une dépense qui change chaque mois : courses, sorties. Ajoute-la avec « + » quand tu la fais.',
    action: 'depense',
    motsCles: ['depense variable', 'depenses variables', 'variable', 'courses', 'carburant', 'loisirs'],
  },
  {
    id: 'creer-limite',
    question: 'Comment créer une limite par catégorie ?',
    reponse: 'Ouvre « Budgets », puis « Fixer une limite » à côté d’une catégorie. Indique le maximum par mois. SoldeClair suit tes dépenses.',
    action: 'budgets',
    motsCles: [
      'creer une limite',
      'fixer une limite',
      'limite',
      'limite par categorie',
      'budget par categorie',
      'creer un budget',
      'plafond',
      'budget',
    ],
    pages: ['budgets'],
  },
  {
    id: 'alertes',
    question: 'Que signifient les alertes à 75 %, 90 % et 100 % ?',
    reponse: 'À 75 % de la limite, un signal discret. À 90 %, il devient visible. À 100 %, la limite est dépassée.',
    action: 'budgets',
    motsCles: ['alerte', 'alertes', 'signifient les alertes', '75', '90', '100', 'depasse', 'depassement', 'limite depassee'],
    pages: ['budgets'],
  },
  {
    id: 'modifier-budget',
    question: 'Comment modifier un budget ?',
    reponse: 'Dans « Budgets », appuie sur le crayon. Change le montant, puis enregistre. Mets 0 pour retirer la limite.',
    action: 'budgets',
    motsCles: [
      'modifier un budget',
      'modifier la limite',
      'changer la limite',
      'changer un budget',
      'augmenter la limite',
      'baisser la limite',
      'retirer la limite',
    ],
    pages: ['budgets'],
  },
  {
    id: 'rouge',
    question: 'Pourquoi une dépense apparaît-elle en rouge ?',
    reponse: 'Le rouge montre l’argent qui sort. Le vert, l’argent qui entre. Ce n’est pas un jugement.',
    motsCles: ['rouge', 'en rouge', 'couleur', 'couleurs', 'vert', 'pourquoi rouge'],
  },

  // --- Épargne ---
  {
    id: 'versement',
    question: 'Comment ajouter un versement ?',
    reponse: 'Dans « Objectifs », appuie sur « Ajouter un versement ». Indique le montant et la date. La progression se met à jour.',
    motsCles: ['versement', 'ajouter un versement', 'verser', 'alimenter', 'mettre de cote', 'epargner', 'mettre de l argent'],
    pages: ['objectifs'],
  },
  {
    id: 'mensuel-necessaire',
    question: 'Comment est calculé le montant mensuel nécessaire ?',
    reponse: 'Le reste à épargner, divisé par les mois restants. Arrondi au centime supérieur. Sans date, SoldeClair estime la date d’arrivée.',
    motsCles: [
      'montant mensuel',
      'montant mensuel necessaire',
      'combien par mois',
      'mettre de cote chaque mois',
      'effort mensuel',
      'contribution mensuelle',
    ],
    pages: ['objectifs'],
  },
  {
    id: 'progression',
    question: 'Comment est calculée la progression ?',
    reponse: 'Le montant de départ plus tes versements, comparé au montant visé. Par exemple, 350 € sur 1 000 € donnent 35 %.',
    motsCles: ['progression', 'avancement', 'pourcentage atteint', 'atteint', 'pourcentage'],
    pages: ['objectifs'],
  },
  {
    id: 'epargne-bleu',
    question: 'Pourquoi l’épargne apparaît-elle en bleu et non en rouge ?',
    reponse: 'L’épargne n’est pas une dépense : cet argent reste à toi. Le bleu la distingue. Elle sort quand même de ton disponible du mois.',
    motsCles: ['epargne en bleu', 'bleu', 'en bleu', 'pourquoi bleu', 'couleur de l epargne'],
  },

  // --- Simulateur ---
  {
    id: 'simulateur-but',
    question: 'À quoi sert le simulateur d’achat ?',
    reponse: 'Le simulateur montre l’effet d’un achat avant de payer. Indique le prix. Tu vois ton solde, ton disponible et tes objectifs.',
    action: 'simulateur',
    motsCles: ['simulateur', 'simulateur d achat', 'simuler', 'simulation', 'tester un achat'],
  },
  {
    id: 'simulateur-modifie',
    question: 'Est-ce que le simulateur modifie réellement mon budget ?',
    reponse: 'Non. Le simulateur calcule seulement : rien n’est enregistré. Pour un vrai achat, ajoute une dépense.',
    action: 'simulateur',
    motsCles: ['simulateur modifie', 'modifie reellement', 'change mon budget', 'enregistre l achat', 'simulation enregistree'],
  },
  {
    id: 'prudence',
    question: 'Que signifie « possible avec prudence » ?',
    reponse: 'L’achat reste possible, mais il touche ton épargne, une limite ou la moitié de ton disponible. C’est un signal, pas une interdiction.',
    action: 'simulateur',
    motsCles: ['prudence', 'avec prudence', 'possible avec prudence', 'confortable', 'desequilibrer', 'appreciation'],
  },
  {
    id: 'impact',
    question: 'Comment est calculé l’impact d’un achat ?',
    reponse: 'SoldeClair retire le prix de ton solde. Il recalcule ton disponible par jour. Il vérifie aussi ton épargne et ta limite.',
    action: 'simulateur',
    motsCles: ['impact', 'impact d un achat', 'effet d un achat', 'calcul de l impact'],
  },
  {
    id: 'decision-achat',
    question: 'Puis-je acheter cet article ?',
    reponse: 'Poksy ne décide pas à ta place. Le simulateur montre l’effet sur ton solde et ton épargne. Ce n’est qu’une indication.',
    action: 'simulateur',
    motsCles: ['acheter', 'puis je acheter', 'je peux acheter', 'dois je acheter', 'les moyens', 'raisonnable', 'craquer'],
  },

  // --- Confidentialité ---
  {
    id: 'banque-acces',
    question: 'SoldeClair peut-il accéder à mon compte bancaire ?',
    reponse: 'Non. SoldeClair n’est relié à aucune banque et ne demande jamais tes identifiants. Tu notes toi-même tes opérations.',
    motsCles: [
      'acceder a mon compte bancaire',
      'acces a mon compte',
      'compte bancaire',
      'bancaire',
      'banque',
      'connecter ma banque',
      'relier ma banque',
      'synchroniser',
      'apple pay',
    ],
  },
  {
    id: 'amis-voir',
    question: 'Mes amis peuvent-ils voir mon budget ?',
    reponse: 'Non. Tes données restent sur ton appareil. Personne d’autre ne les voit. Ne partage pas ton fichier de sauvegarde.',
    motsCles: ['amis', 'ami', 'voir mon budget', 'partager', 'partage', 'quelqu un d autre', 'autres personnes', 'famille'],
  },
  {
    id: 'changer-appareil',
    question: 'Que se passe-t-il si je change d’appareil ?',
    reponse: 'Sur l’ancien appareil, exporte une sauvegarde complète. Sur le nouveau, choisis « Importer une sauvegarde ».',
    action: 'sauvegarde',
    motsCles: [
      'change d appareil',
      'changer d appareil',
      'changer de telephone',
      'changer d ordinateur',
      'nouveau telephone',
      'autre appareil',
      'nouvel ordinateur',
      'transferer',
      'perdu mon telephone',
    ],
  },
  {
    id: 'sauvegarder',
    question: 'Comment sauvegarder mes données ?',
    reponse: 'Ouvre les paramètres, puis « Sauvegarde complète (JSON) ». Garde le fichier en lieu sûr. Une fois par mois, c’est bien.',
    action: 'sauvegarde',
    motsCles: ['sauvegarder', 'sauvegarde', 'exporter', 'export', 'backup', 'json', 'csv', 'copie de mes donnees'],
    pages: ['parametres'],
  },
  {
    id: 'restaurer',
    question: 'Comment restaurer une sauvegarde ?',
    reponse: 'Ouvre les paramètres, puis « Importer une sauvegarde ». Choisis ton fichier JSON. SoldeClair te demande de confirmer.',
    action: 'parametres',
    motsCles: ['restaurer', 'restaurer une sauvegarde', 'importer', 'import', 'recuperer mes donnees', 'retrouver mes donnees'],
    pages: ['parametres'],
  },
  {
    id: 'supprimer-donnees',
    question: 'Comment supprimer toutes mes données ?',
    reponse:
      'Ouvre les paramètres, puis « Effacer toutes mes données ». Tape EFFACER pour confirmer. Exporte d’abord une sauvegarde : c’est définitif.',
    action: 'parametres',
    motsCles: [
      'supprimer toutes mes donnees',
      'supprimer mes donnees',
      'effacer mes donnees',
      'effacer toutes',
      'tout effacer',
      'tout supprimer',
      'reinitialiser',
      'remettre a zero',
      'recommencer',
    ],
    pages: ['parametres'],
  },

  // --- Utilisation du site ---
  {
    id: 'tableau-de-bord',
    question: 'Comment revenir au tableau de bord ?',
    reponse: 'Appuie sur « Accueil » dans la barre du bas, ou « Tableau de bord » sur ordinateur. Le logo ouvre la présentation.',
    action: 'tableau',
    motsCles: ['tableau de bord', 'revenir', 'retour', 'retourner', 'accueil', 'page principale'],
  },
  {
    id: 'changer-mois',
    question: 'Comment changer de mois ?',
    reponse: 'Utilise les flèches autour du nom du mois, en haut du tableau de bord.',
    action: 'tableau',
    motsCles: ['changer de mois', 'mois precedent', 'mois suivant', 'mois dernier', 'autre mois', 'mois passe', 'mois'],
  },
  {
    id: 'mode-sombre',
    question: 'Comment passer en mode sombre ?',
    reponse: 'Ouvre les paramètres, rubrique « Apparence », puis « Mode sombre ». « Comme mon appareil » suit ton téléphone.',
    action: 'parametres',
    motsCles: ['mode sombre', 'sombre', 'theme', 'nuit', 'fond noir', 'mode clair', 'apparence'],
  },
  {
    id: 'demo',
    question: 'Comment utiliser un profil de démonstration ?',
    reponse:
      'Appuie sur le logo, puis « Créer un nouveau profil », puis charge une démonstration. Tes données restent intactes. Les profils de démonstration sont fictifs.',
    action: 'parametres',
    motsCles: ['demonstration', 'demo', 'profil de demonstration', 'exemple', 'essayer', 'donnees fictives'],
  },
  {
    id: 'retrouver',
    question: 'Comment retrouver une opération ?',
    reponse: 'Ouvre « Historique » et tape un mot dans « Rechercher ». Tu peux filtrer par type et par période.',
    motsCles: ['retrouver', 'retrouver une operation', 'rechercher', 'chercher', 'trouver une operation', 'historique', 'recherche'],
  },
  {
    id: 'signaler',
    question: 'Comment signaler un problème ?',
    reponse: 'Note la page et le message affiché. Préviens la personne qui t’a fait découvrir SoldeClair. Poksy n’envoie rien.',
    motsCles: ['signaler', 'signaler un probleme', 'probleme', 'bug', 'ne marche pas', 'ne fonctionne pas', 'plante', 'souci'],
  },

  // --- Questions supplémentaires (accessibles par la recherche) ---
  {
    id: 'report',
    question: 'Qu’est-ce que le report des mois précédents ?',
    reponse:
      'Le report ajoute le reste des mois passés au bilan du mois. Le solde du tableau de bord cumule déjà tout. Désactivable dans les paramètres.',
    action: 'tableau',
    motsCles: ['report', 'mois precedents', 'cumul', 'reste du mois dernier', 'reporter'],
  },
  {
    id: 'estimation',
    question: 'Comment fonctionne l’estimation à 30 jours ?',
    reponse: 'Ton solde, plus les revenus prévus, moins les charges et dépenses habituelles. Une idée de ta situation à 7, 15 et 30 jours.',
    action: 'tableau',
    motsCles: ['estimation', 'prevision', '30 jours', 'fin du mois', 'dans un mois'],
  },
  {
    id: 'profils',
    question: 'Comment utiliser plusieurs profils ?',
    reponse: 'Appuie sur le logo SoldeClair. Continue avec un profil, changes-en ou crées-en un. Chaque profil a ses propres données.',
    motsCles: ['profil', 'profils', 'plusieurs profils', 'nouveau profil', 'changer de profil', 'autre profil'],
  },
  {
    id: 'installer',
    question: 'Comment installer SoldeClair comme une application ?',
    reponse:
      'iPhone : Partager, puis « Sur l’écran d’accueil ». Android : menu de Chrome, puis « Installer l’application ». Fais d’abord une sauvegarde.',
    action: 'parametres',
    motsCles: ['installer', 'application', 'appli', 'app', 'ecran d accueil', 'telecharger'],
  },
  {
    id: 'conseil',
    question: 'Peux-tu me conseiller un placement ou un crédit ?',
    reponse: 'Poksy ne donne pas de conseil en placement ou en crédit. Il explique SoldeClair. Pour ces décisions, vois un conseiller professionnel.',
    motsCles: ['investir', 'investissement', 'placement', 'placer', 'bourse', 'crypto', 'credit', 'pret', 'emprunt', 'emprunter', 'assurance vie'],
  },
  {
    id: 'qui-es-tu',
    question: 'Qui es-tu ?',
    reponse:
      'Je suis Poksy, le guide de SoldeClair. Mes réponses sont préparées et restent sur ton appareil. Je ne suis pas une intelligence artificielle. Je ne remplace pas un conseiller financier professionnel.',
    motsCles: ['qui es tu', 'poksy', 'intelligence artificielle', 'ia', 'robot', 'chatgpt', 'humain'],
  },
  /* ---------------------- Mon plan d'épargne et profils ---------------------- */
  {
    id: 'plan-quoi',
    question: 'À quoi sert « Mon plan d’épargne » ?',
    reponse: 'Il suit ton objectif principal mois par mois. Il dit combien mettre de côté. Le statut montre si tu es dans les temps.',
    action: 'plan',
    motsCles: ['mon plan', 'plan epargne', 'plan d epargne', 'projection', 'dans les temps', 'en retard', 'fin de contrat objectif', 'mois par mois'],
    pages: ['plan'],
  },
  {
    id: 'epargne-totale-disponible',
    question: 'Épargne totale ou épargne disponible ?',
    reponse: 'L’épargne totale compte tous tes supports. La disponible, seulement ce que tu peux retirer tout de suite. Un PEL n’en fait pas partie.',
    action: 'plan',
    motsCles: ['epargne totale', 'epargne disponible', 'disponible', 'bloquee', 'support', 'supports', 'livret', 'livret a', 'livret jeune', 'ldds'],
    pages: ['plan'],
  },
  {
    id: 'pel',
    question: 'Puis-je retirer de l’argent de mon PEL ?',
    reponse: 'Un retrait sur un PEL le clôture. Il compte dans l’épargne totale, pas dans la disponible. Vérifie les conditions auprès de ta banque.',
    motsCles: ['pel', 'plan epargne logement', 'retirer pel', 'retrait pel', 'cloture', 'bloque'],
    pages: ['plan'],
  },
  {
    id: 'revenu-attendu',
    question: 'Qu’est-ce qu’un revenu attendu ?',
    reponse: 'Un revenu pas encore sûr : prime, 13e mois. Il n’est compté nulle part avant confirmation. Appuie sur « Reçu » quand il arrive.',
    action: 'plan',
    motsCles: ['revenu attendu', 'attendu', 'prime', 'incertain', 'pas sur', 'optimiste', 'projection optimiste', 'montant inconnu', 'fourchette'],
    pages: ['plan'],
  },
  {
    id: 'treizieme-mois',
    question: 'Comment compter mon 13e mois ?',
    reponse:
      'Le 13e mois n’est pas obligatoire : il dépend de ta convention ou de ton contrat. Ajoute-le en revenu attendu. Appuie sur « Reçu » quand il arrive.',
    action: 'plan',
    motsCles: ['13e mois', '13eme mois', 'treizieme mois', 'treizieme', 'prime de fin d annee', 'decembre'],
  },
  {
    id: 'fin-de-contrat',
    question: 'Que prévoir pour la fin de mon contrat ?',
    reponse: 'Indique la date de fin dans ton profil : un compte à rebours s’affiche. Ajoute le solde de tout compte en revenu attendu.',
    action: 'plan',
    motsCles: ['fin de contrat', 'fin du contrat', 'solde de tout compte', 'stc', 'conges non pris', 'fin alternance', 'fin apprentissage', 'cdd'],
  },
  {
    id: 'avantage-nature',
    question: 'Les titres-restaurant sont-ils un revenu ?',
    reponse: 'Pas vraiment : c’est du pouvoir d’achat pour les repas. Ils restent sur ta carte restaurant. Ils ne comptent pas pour ton épargne.',
    motsCles: [
      'avantage en nature',
      'avantage',
      'pouvoir d achat alimentaire',
      'revenu titre',
      'revenu cheque',
      'revenu ticket',
      'titres restaurant revenu',
      'cheques dejeuner revenu',
      'tickets resto revenu',
    ],
  },
  {
    id: 'somme-bloquee',
    question: 'Une caution est-elle une dépense ?',
    reponse:
      'Non : une caution bloque de l’argent sans le dépenser. Ajoute-la dans « Sommes bloquées » (Mon plan). Appuie sur « Rendu » quand elle revient.',
    action: 'plan',
    motsCles: [
      'caution',
      'caution depense',
      'depot garantie depense',
      'depot de garantie',
      'empreinte bancaire',
      'bloque',
      'somme bloquee',
      'immobilisation',
      'rendu',
    ],
    pages: ['plan', 'compte'],
  },
  {
    id: 'depense-exceptionnelle',
    question: 'Qu’est-ce qu’une dépense exceptionnelle ?',
    reponse: 'Une grosse dépense ponctuelle : voyage, gros achat. Coche « Dépense exceptionnelle ». « Mon plan » la compte à part.',
    motsCles: ['depense exceptionnelle', 'exceptionnelle', 'voyage', 'gros achat', 'hors budget'],
    pages: ['depenses', 'plan'],
  },
  {
    id: 'bilan-du-mois',
    question: 'Comment faire le bilan du mois ?',
    reponse: 'Dans « Mon plan », appuie sur « Faire le bilan du mois ». Indique le réel. SoldeClair ajoute seulement ce qui manque.',
    action: 'plan',
    motsCles: ['bilan du mois', 'bilan', 'saisie mensuelle', 'fin de mois', 'mettre a jour', 'reel'],
    pages: ['plan'],
  },
  {
    id: 'bourse-ete',
    question: 'Comment gérer l’été sans bourse ?',
    reponse: 'La bourse est versée sur 10 mois : rien en juillet et en août. Mets un peu de côté pendant l’année.',
    action: 'plan',
    motsCles: ['bourse', 'crous', 'ete', 'juillet', 'aout', 'vacances', 'job d ete', 'etudiant'],
  },
  {
    id: 'revenus-irreguliers',
    question: 'Mes revenus sont irréguliers : comment faire ?',
    reponse:
      'Compte seulement ce qui est encaissé. Vise une réserve de 3 à 6 mois de charges. Le repère « Réserve » de « Mon plan » montre où tu en es.',
    action: 'plan',
    motsCles: [
      'irregulier',
      'irreguliers',
      'independant',
      'freelance',
      'auto entrepreneur',
      'micro entreprise',
      'urssaf',
      'cotisations',
      'facture',
      'reserve',
      'precaution',
    ],
  },
  {
    id: 'point-de-depart',
    question: 'Comment revenir à mes données de départ ?',
    reponse: 'Dans les paramètres, carte « Point de départ ». Enregistre l’état actuel. « Réinitialiser » y revient après confirmation.',
    action: 'parametres',
    motsCles: ['point de depart', 'reinitialiser', 'donnees par defaut', 'revenir en arriere', 'annuler mes modifications'],
    pages: ['parametres'],
  },
  {
    id: 'bonjour',
    question: 'Bonjour',
    reponse: 'Bonjour ! Choisis une question ou écris la tienne.',
    motsCles: ['bonjour', 'salut', 'hello', 'coucou', 'bonsoir'],
  },
  {
    id: 'merci',
    question: 'Merci',
    reponse: 'Avec plaisir. N’hésite pas si tu as une autre question.',
    motsCles: ['merci', 'super', 'parfait', 'genial', 'top'],
  },
];

const PAR_ID = new Map(FICHES.map((f) => [f.id, f]));

export function fiche(id: string): Fiche {
  const f = PAR_ID.get(id);
  if (!f) throw new Error(`Fiche Poksy inconnue : ${id}`);
  return f;
}

export function reponseDe(f: Fiche, ctx: ContextePoksy = {}): string {
  return typeof f.reponse === 'function' ? f.reponse(ctx) : f.reponse;
}

/* -------------------------------------------------------------------------- */
/* Listes de questions                                                         */
/* -------------------------------------------------------------------------- */

export interface QuestionProposee {
  id: string;
  /** Formulation affichée (peut différer de la question de la fiche). */
  libelle: string;
}

const q = (id: string, libelle?: string): QuestionProposee => ({ id, libelle: libelle ?? fiche(id).question });

export const QUESTIONS_RAPIDES: QuestionProposee[] = [
  q('reste-a-vivre'),
  q('ajouter-depense'),
  q('fixe-variable'),
  q('ajuster-solde'),
  q('creer-objectif'),
  q('donnees-ou'),
];

export interface Rubrique {
  titre: string;
  questions: QuestionProposee[];
}

export const RUBRIQUES: Rubrique[] = [
  {
    titre: 'Mon compte',
    questions: [
      q('solde-banque'),
      q('ajuster-solde', 'Comment ajuster mon solde réel ?'),
      q('ajustement-quoi'),
      q('carte-restaurant'),
      q('izly'),
      q('masquer'),
    ],
  },
  {
    titre: 'Revenus et dépenses',
    questions: [
      q('ajouter-revenu'),
      q('ajouter-depense'),
      q('modifier-operation'),
      q('supprimer-operation'),
      q('revenu-exceptionnel'),
      q('recurrent'),
    ],
  },
  {
    titre: 'Budget',
    questions: [q('charge-fixe'), q('depense-variable'), q('creer-limite'), q('alertes'), q('par-jour'), q('rouge')],
  },
  {
    titre: 'Épargne',
    questions: [q('creer-objectif'), q('versement'), q('mensuel-necessaire'), q('epargne-bleu')],
  },
  {
    titre: 'Mon plan et ma situation',
    questions: [
      q('plan-quoi'),
      q('epargne-totale-disponible'),
      q('revenu-attendu'),
      q('treizieme-mois'),
      q('fin-de-contrat'),
      q('avantage-nature'),
      q('somme-bloquee'),
      q('bilan-du-mois'),
      q('bourse-ete'),
      q('revenus-irreguliers'),
    ],
  },
  {
    titre: 'Simulateur',
    questions: [q('simulateur-but'), q('simulateur-modifie'), q('prudence'), q('impact')],
  },
  {
    titre: 'Confidentialité',
    questions: [q('donnees-ou'), q('banque-acces'), q('amis-voir'), q('changer-appareil'), q('sauvegarder'), q('restaurer'), q('supprimer-donnees')],
  },
  {
    titre: 'Utilisation du site',
    questions: [q('tableau-de-bord'), q('changer-mois'), q('mode-sombre'), q('demo'), q('retrouver'), q('signaler')],
  },
];

/** Questions mises en avant selon la situation (proposées en plus, rien n'est masqué). */
export const QUESTIONS_PAR_PROFIL: Record<ProfileType, QuestionProposee[]> = {
  etudiant: [q('izly'), q('bourse-ete')],
  alternant: [q('fin-de-contrat'), q('treizieme-mois', 'Mon 13e mois, je le compte comment ?')],
  salarie: [q('treizieme-mois'), q('revenu-attendu', 'Une prime pas encore sûre, je fais comment ?')],
  independant: [q('revenus-irreguliers')],
  autre: [],
};

/** Questions de la même rubrique que la dernière réponse (pour enchaîner naturellement). */
export function suiteDe(ficheId: string | undefined): QuestionProposee[] {
  if (!ficheId) return [];
  const r = RUBRIQUES.find((x) => x.questions.some((q) => q.id === ficheId));
  return r ? r.questions.filter((q) => q.id !== ficheId) : [];
}

/** Questions proposées en premier selon la page ouverte. */
export const QUESTIONS_PAR_PAGE: Partial<Record<PageKey, QuestionProposee[]>> = {
  compte: [q('ajuster-solde'), q('solde-banque', 'Pourquoi mon solde est-il différent ?'), q('carte-restaurant')],
  depenses: [q('ajouter-depense'), q('modifier-operation'), q('choisir-categorie')],
  budgets: [q('creer-limite', 'Comment fixer une limite ?'), q('alertes', 'Que signifient les alertes ?'), q('modifier-budget')],
  objectifs: [q('creer-objectif', 'Comment créer un objectif ?'), q('versement'), q('progression')],
  plan: [q('epargne-totale-disponible'), q('revenu-attendu'), q('bilan-du-mois')],
  parametres: [q('sauvegarder'), q('donnees-ou'), q('supprimer-donnees', 'Comment supprimer mes données ?')],
  presentation: [q('soldeclair-quoi'), q('gratuit'), q('donnees-ou')],
};

/* -------------------------------------------------------------------------- */
/* Recherche par mots-clés (locale)                                            */
/* -------------------------------------------------------------------------- */

const MOTS_VIDES = new Set(
  (
    'a au aux avec ce ces c ca cela cet cette comment d dans de des du elle en est et etre faire fait il ils j je l la le les leur lui m ma me mes moi mon n ne nos notre nous on ou par pas peut peux plus pour pourquoi qu quand que quel quelle quelles quels qui quoi s sa se ses si son sont sur t ta te tes toi ton tu un une tes ton t’y ' +
    'est-ce puis-je dois-je comme ici svp stp bien tres faut veux voudrais aimerais aider aide'
  ).split(' '),
);

/** Minuscules, sans accents ni ponctuation. */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/[^a-z0-9%]+/g, ' ')
    .trim();
}

/** Racine très simple : retire le pluriel (« dépenses » → « depense »). */
function racine(mot: string): string {
  return mot.length > 4 && /[sx]$/.test(mot) ? mot.slice(0, -1) : mot;
}

export function motsUtiles(texte: string): string[] {
  return normaliser(texte)
    .split(' ')
    .filter((m) => m && !MOTS_VIDES.has(m))
    .map(racine);
}

/** Deux mots correspondent s'ils sont égaux ou partagent un début assez long (« ajuster » / « ajustement »). */
function correspond(a: string, b: string): boolean {
  if (a === b) return true;
  const court = Math.min(a.length, b.length);
  if (court < 6) return false;
  let i = 0;
  while (i < court && a[i] === b[i]) i++;
  return i >= 6 && i >= 0.7 * court;
}

const contient = (mots: string[], mot: string) => mots.some((m) => correspond(m, mot));

/** Poids d'un mot-clé trouvé : 2 si le mot est identique, 1 s'il ne partage que le début (« ajuster » / « ajustement »). */
const poids = (mots: string[], mot: string): number => (mots.includes(mot) ? 2 : contient(mots, mot) ? 1 : 0);

/** Une suite d'au moins 12 chiffres ressemble à un numéro de carte ou de compte. */
export const RESSEMBLE_A_UN_NUMERO = /\d(?:[\s.-]?\d){11,}/;

/** Remplace les longues suites de chiffres (numéro de carte, IBAN…) avant tout affichage. */
export function masquerNumeros(texte: string): string {
  return texte.replace(new RegExp(RESSEMBLE_A_UN_NUMERO.source, 'g'), '••••');
}

export interface ResultatRecherche {
  fiche: Fiche | null;
  score: number;
}

/**
 * Trouve la fiche la plus proche d'une question écrite librement.
 * Les expressions (« carte restaurant ») pèsent plus que les mots seuls ; la page ouverte départage.
 */
export function rechercher(question: string, page: PageKey = 'autre'): ResultatRecherche {
  const securite = fiche('securite');
  if (RESSEMBLE_A_UN_NUMERO.test(question)) return { fiche: securite, score: 100 };
  const mots = motsUtiles(question);
  if (mots.length === 0) return { fiche: null, score: 0 };

  let meilleure: Fiche | null = null;
  let meilleurScore = 0;
  for (const f of FICHES) {
    let score = 0;
    let motCleTrouve = false;
    for (const cle of f.motsCles) {
      const motsCle = motsUtiles(cle);
      const poidsMots = motsCle.map((m) => poids(mots, m));
      if (motsCle.length > 0 && poidsMots.every((p) => p > 0)) {
        score += poidsMots.reduce((a, b) => a + b, 0);
        motCleTrouve = true;
      }
    }
    // Mots communs avec la question de la fiche
    const communs = new Set(motsUtiles(f.question).filter((m) => contient(mots, m)));
    score += communs.size;
    if (!motCleTrouve && communs.size < 3) continue;
    if (f.id === 'securite' && motCleTrouve) return { fiche: f, score: 100 };
    if (f.pages?.includes(page)) score += 1;
    if (score > meilleurScore) {
      meilleure = f;
      meilleurScore = score;
    }
  }
  return { fiche: meilleure, score: meilleurScore };
}

/** Espaces insécables de la typographie française (« : », « ? », « ! », guillemets) pour l'affichage. */
export function typographie(texte: string): string {
  return texte.replace(/ ([:;!?»])/g, ' $1').replace(/\u00ab /g, '\u00ab\u00a0');
}
