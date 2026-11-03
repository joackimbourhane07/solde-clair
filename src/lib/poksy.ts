/**
 * Poksy, le guide de SoldeClair.
 *
 * Fonctionnement 100 % local : des réponses préparées à l'avance, une recherche par mots-clés
 * et des questions adaptées à la page ouverte. Aucune intelligence artificielle, aucun envoi réseau :
 * les questions tapées ne quittent jamais l'appareil et ne sont pas enregistrées.
 */

import type { PoksyAction } from './poksyTextes';

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
};

export type PageKey = 'compte' | 'depenses' | 'budgets' | 'objectifs' | 'parametres' | 'presentation' | 'autre';

export function pageDe(pathname: string): PageKey {
  const p = pathname.replace(/\/+$/, '');
  if (p === '/compte') return 'compte';
  if (p === '/depenses') return 'depenses';
  if (p === '/budgets') return 'budgets';
  if (p === '/objectifs') return 'objectifs';
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

export const PRESENTATION = 'Poksy vous aide à comprendre votre budget, simplement.';

export const MENTION =
  'Poksy fonctionne sur votre appareil et ne remplace pas un conseiller financier professionnel.';

export const REPONSE_INTROUVABLE =
  'Je n’ai pas encore trouvé la réponse exacte. Vous pouvez choisir une question proposée ou consulter la rubrique correspondante dans SoldeClair.';

/* -------------------------------------------------------------------------- */
/* Fiches                                                                      */
/* -------------------------------------------------------------------------- */

export const FICHES: Fiche[] = [
  // --- Sécurité : toujours prioritaire (aucune donnée bancaire n'est demandée) ---
  {
    id: 'securite',
    question: 'Dois-je donner mes codes bancaires ?',
    reponse:
      'Ne saisissez jamais de mot de passe, de code, de numéro de carte ni de coordonnées bancaires, ni ici ni ailleurs dans SoldeClair. Poksy et SoldeClair n’en ont jamais besoin. Vous notez vous-même vos opérations.',
    motsCles: ['mot de passe', 'mdp', 'code secret', 'code de securite', 'code pin', 'cryptogramme', 'cvv', 'numero de carte', 'iban', 'rib', 'identifiant', 'login'],
  },
  {
    id: 'reste-a-vivre',
    question: 'Comment est calculé mon reste à vivre ?',
    reponse: (ctx) =>
      'Votre reste à vivre est le solde de « Mon compte » : tout l’argent reçu, moins vos dépenses, vos charges prélevées et l’épargne versée, depuis votre première saisie. Une opération prévue compte le jour où elle arrive ; celles des 3 prochains jours sont listées dans « À venir ». Appuyez sur « Comment est-ce calculé ? » dans le tableau de bord pour voir le détail avec vos montants.' +
      (ctx.resteAVivre ? (ctx.resteNegatif ? ` Aujourd’hui, votre solde est de ${ctx.resteAVivre}.` : ` Aujourd’hui, il vous reste ${ctx.resteAVivre}.`) : ''),
    action: 'tableau',
    motsCles: ['reste a vivre', 'il me reste', 'combien il reste', 'combien me reste', 'reste du mois', 'disponible du mois', 'solde disponible', 'calcul du reste'],
  },
  {
    id: 'par-jour',
    question: 'Comment est calculé mon disponible quotidien ?',
    reponse: (ctx) =>
      'Votre disponible quotidien est votre reste à vivre (le solde de « Mon compte ») divisé par le nombre de jours restants dans le mois, aujourd’hui compris. Il est arrondi vers le bas pour ne jamais surestimer ce qu’il vous reste.' +
      (ctx.parJour && ctx.joursRestants ? ` Aujourd’hui : environ ${ctx.parJour} par jour pendant ${ctx.joursRestants} jour${ctx.joursRestants > 1 ? 's' : ''}.` : ''),
    action: 'tableau',
    motsCles: ['par jour', 'quotidien', 'chaque jour', 'journalier', 'disponible par jour', 'disponible quotidien', 'budget du jour'],
  },
  {
    id: 'ajouter-depense',
    question: 'Comment ajouter une dépense ?',
    reponse:
      'Appuyez sur le bouton « + », saisissez le montant, choisissez une catégorie puis validez. Sur ordinateur, ce bouton s’appelle « Ajouter une dépense ». La dépense est ajoutée à votre historique et votre montant disponible est recalculé.',
    action: 'depense',
    motsCles: ['ajouter une depense', 'nouvelle depense', 'saisir une depense', 'noter une depense', 'enregistrer une depense', 'depense', 'depenser', 'achat fait', 'ticket de caisse'],
    pages: ['depenses'],
  },
  {
    id: 'fixe-variable',
    question: 'Quelle différence entre charge fixe et dépense variable ?',
    reponse:
      'Une charge fixe revient régulièrement avec un montant généralement prévisible, comme le loyer ou un abonnement. Une dépense variable peut changer chaque mois, comme les courses, le carburant ou les loisirs.',
    motsCles: ['charge fixe et depense variable', 'fixe et variable', 'fixe ou variable', 'difference entre'],
  },
  {
    id: 'ajuster-solde',
    question: 'Comment ajuster mon solde ?',
    reponse:
      'Ouvrez la page « Mon compte », puis appuyez sur « Ajuster le solde ». Indiquez le montant réellement affiché par votre banque. SoldeClair enregistre une correction datée sans supprimer vos anciennes opérations.',
    action: 'ajuster',
    motsCles: ['ajuster', 'ajuster le solde', 'solde reel', 'vrai solde', 'corriger le solde', 'mettre a jour le solde', 'solde de depart', 'argent deja present', 'solde'],
    pages: ['compte'],
  },
  {
    id: 'creer-objectif',
    question: 'Comment créer un objectif d’épargne ?',
    reponse:
      'Ouvrez « Objectifs d’épargne » et appuyez sur « Nouvel objectif ». Donnez un nom, un montant cible et, si vous le souhaitez, une date. SoldeClair calcule ensuite combien mettre de côté chaque mois.',
    action: 'objectif',
    motsCles: ['creer un objectif', 'nouvel objectif', 'objectif', 'epargne', 'economiser', 'mettre de cote pour', 'projet'],
    pages: ['objectifs'],
  },
  {
    id: 'donnees-ou',
    question: 'Où sont enregistrées mes données ?',
    reponse:
      'Vos données sont enregistrées uniquement dans le navigateur de l’appareil utilisé. Elles ne sont pas envoyées à une banque ni stockées dans un compte SoldeClair. Pensez à exporter régulièrement une sauvegarde.',
    action: 'sauvegarde',
    motsCles: ['ou sont enregistrees', 'ou sont stockees', 'donnees', 'stockage', 'stocke', 'confidentialite', 'vie privee', 'serveur', 'cloud', 'navigateur', 'securise'],
    pages: ['parametres'],
  },

  // --- Page d'accueil (présentation) ---
  {
    id: 'soldeclair-quoi',
    question: 'Qu’est-ce que SoldeClair ?',
    reponse:
      'SoldeClair est une application gratuite pour suivre votre budget personnel : revenus, dépenses, charges fixes, épargne et ce qu’il vous reste pour finir le mois. Vous saisissez vous-même vos opérations, sans lien avec votre banque. Appuyez sur « Commencer » pour créer votre profil, ou essayez un profil de démonstration.',
    motsCles: ['soldeclair', 'c est quoi', 'a quoi sert', 'presentation', 'comment ca marche', 'commencer'],
    pages: ['presentation'],
  },
  {
    id: 'gratuit',
    question: 'Est-ce gratuit ?',
    reponse:
      'Oui, SoldeClair est entièrement gratuit, sans publicité et sans compte à créer. Rien n’est vendu ni partagé : vos données restent sur votre appareil.',
    motsCles: ['gratuit', 'payant', 'prix', 'cout', 'abonnement soldeclair', 'publicite', 'payer'],
    pages: ['presentation'],
  },
  // --- Mon compte ---
  {
    id: 'solde-banque',
    question: 'Pourquoi mon solde ne correspond-il pas à ma banque ?',
    reponse: (ctx) =>
      'SoldeClair ne connaît que ce que vous avez saisi : il part de 0 € et ajoute chaque revenu le jour de son versement. L’argent déjà présent sur votre compte ou une dépense oubliée crée donc un écart. Dans « Mon compte », « Ajuster le solde » permet de repartir du montant affiché par votre banque.' +
      (ctx.ajustementFait === false ? ' Aucun solde réel n’a encore été indiqué.' : ''),
    action: 'ajuster',
    motsCles: ['ne correspond pas', 'correspond pas', 'pas le meme', 'solde different', 'different de ma banque', 'difference avec ma banque', 'ecart', 'solde faux', 'solde a zero', 'zero euro', 'pourquoi 0'],
    pages: ['compte'],
  },
  {
    id: 'ajustement-quoi',
    question: 'Qu’est-ce qu’un ajustement de solde ?',
    reponse:
      'Un ajustement est une correction du solde, datée du jour. Il comble l’écart entre le solde calculé par SoldeClair et le solde réel de votre banque. Il apparaît dans vos opérations et peut être supprimé à tout moment.',
    action: 'ajuster',
    motsCles: ['ajustement', 'ajustement de solde', 'correction du solde', 'c est quoi un ajustement'],
    pages: ['compte'],
  },
  {
    id: 'carte-restaurant',
    question: 'Pourquoi la carte restaurant est-elle séparée ?',
    reponse:
      'La carte restaurant a son propre solde, comme un deuxième compte. Les revenus « Carte restaurant » y sont versés et les dépenses payées avec elle en sont retirées. Le solde total de « Mon compte » additionne votre compte bancaire et votre carte restaurant.',
    motsCles: ['carte restaurant', 'carte resto', 'carte dejeuner', 'cheque dejeuner', 'titre restaurant', 'titres restaurant', 'ticket resto', 'ticket restaurant', 'swile', 'edenred', 'pluxee', 'bimpli'],
    pages: ['compte'],
  },
  {
    id: 'masquer',
    question: 'Comment masquer les montants ?',
    reponse:
      'Appuyez sur l’icône en forme d’œil, en haut de l’écran sur téléphone ou en bas du menu sur ordinateur. Tous les montants sont remplacés par « ••• € ». Appuyez de nouveau pour les afficher.',
    motsCles: ['masquer', 'masquer les montants', 'cacher', 'cacher les montants', 'oeil', 'discret', 'en public', 'afficher les montants'],
  },
  {
    id: 'a-venir',
    question: 'Que sont les opérations à venir ?',
    reponse:
      'Dans « Mon compte », la bulle « À venir » liste les prélèvements et revenus prévus dans les 30 prochains jours, ainsi que les charges passées pas encore payées. Le tableau de bord, lui, montre celles des 3 prochains jours. Elles ne font pas encore partie de votre solde : elles comptent le jour où elles arrivent.',
    motsCles: ['a venir', 'operations a venir', 'prevu', 'prevues', 'prochains jours', 'prochain prelevement', 'bulle'],
    pages: ['compte'],
  },

  // --- Revenus et dépenses ---
  {
    id: 'ajouter-revenu',
    question: 'Comment ajouter un revenu ?',
    reponse:
      'Ouvrez « Revenus » et appuyez sur « Ajouter un revenu ». Indiquez le nom, le montant, la date et s’il revient chaque mois ou non. Il est ensuite compté dans le budget du mois concerné.',
    action: 'revenu',
    motsCles: ['ajouter un revenu', 'nouveau revenu', 'revenu', 'salaire', 'paie', 'paye', 'allocation', 'bourse', 'virement recu', 'argent recu'],
  },
  {
    id: 'modifier-operation',
    question: 'Comment modifier une opération ?',
    reponse:
      'Dans la liste concernée (Dépenses, Revenus ou Charges fixes), appuyez sur l’icône en forme de crayon à côté de l’opération. Modifiez ce qui est nécessaire, puis enregistrez. Les totaux sont recalculés automatiquement.',
    motsCles: ['modifier', 'modifier une operation', 'changer une operation', 'corriger une operation', 'erreur de saisie', 'crayon', 'editer'],
    pages: ['depenses'],
  },
  {
    id: 'supprimer-operation',
    question: 'Comment supprimer une opération ?',
    reponse:
      'Dans la liste concernée, appuyez sur l’icône en forme de corbeille à côté de l’opération. SoldeClair vous demande de confirmer avant de supprimer. Pour un revenu ou une charge qui revient chaque mois, indiquez plutôt une date de fin si vous voulez garder les mois passés.',
    motsCles: ['supprimer une operation', 'supprimer une depense', 'supprimer un revenu', 'effacer une operation', 'retirer une operation', 'enlever', 'corbeille'],
  },
  {
    id: 'revenu-exceptionnel',
    question: 'Qu’est-ce qu’un revenu exceptionnel ?',
    reponse:
      'Un revenu exceptionnel n’arrive qu’une fois, comme une prime, un remboursement ou une vente. Il compte dans le mois de sa date, ou dans le mois suivant s’il arrive à partir du 20. Choisissez « Exceptionnel » dans le formulaire du revenu.',
    action: 'revenu',
    motsCles: ['revenu exceptionnel', 'exceptionnel', 'ponctuel', 'une seule fois', 'prime', 'remboursement', 'vente'],
  },
  {
    id: 'fin-de-mois',
    question: 'Pourquoi un revenu compte-t-il pour le mois suivant ?',
    reponse:
      'Un revenu reçu à partir du 20 sert au mois suivant : un salaire ou une prime de fin octobre apparaît dans les revenus de novembre. « Mon compte » le montre toujours à sa vraie date. Vous pouvez changer ce jour ou désactiver la règle dans les paramètres.',
    action: 'parametres',
    motsCles: ['mois suivant', 'fin de mois', 'a partir du 20', 'regle du 20', 'prime de fin', 'n apparait pas', 'pas dans les revenus', 'paye en fin de mois'],
  },
  {
    id: 'recurrent',
    question: 'Comment fonctionne une opération récurrente ?',
    reponse:
      'Une opération récurrente revient toute seule selon la fréquence choisie : chaque semaine, chaque mois, chaque année… C’est le cas des salaires et des charges fixes. Vous pouvez indiquer une date de fin pour l’arrêter.',
    motsCles: ['recurrent', 'recurrente', 'operation recurrente', 'frequence', 'repetition', 'tous les mois', 'automatiquement', 'date de fin'],
  },
  {
    id: 'choisir-categorie',
    question: 'Comment choisir une catégorie ?',
    reponse:
      'Choisissez la catégorie qui décrit le mieux la dépense : alimentation, transport, loisirs… Les catégories que vous utilisez le plus sont proposées en un geste dans le formulaire. Vous pouvez aussi en créer une avec « + Nouvelle catégorie… ».',
    action: 'depense',
    motsCles: ['categorie', 'choisir une categorie', 'nouvelle categorie', 'creer une categorie', 'classer'],
    pages: ['depenses'],
  },

  // --- Budget ---
  {
    id: 'charge-fixe',
    question: 'Qu’est-ce qu’une charge fixe ?',
    reponse:
      'Une charge fixe est une dépense qui revient régulièrement avec un montant prévisible : loyer, abonnement, assurance, forfait téléphone… Ajoutez-la une fois dans « Charges fixes » : elle sera comptée automatiquement à chaque échéance.',
    motsCles: ['charge fixe', 'charges fixes', 'loyer', 'abonnement', 'assurance', 'facture', 'prelevement', 'forfait'],
  },
  {
    id: 'depense-variable',
    question: 'Qu’est-ce qu’une dépense variable ?',
    reponse:
      'Une dépense variable change d’un mois à l’autre : courses, carburant, sorties, loisirs… Vous l’ajoutez au moment où vous la faites, avec le bouton « + ». Les budgets par catégorie suivent ces dépenses.',
    action: 'depense',
    motsCles: ['depense variable', 'depenses variables', 'variable', 'courses', 'carburant', 'loisirs'],
  },
  {
    id: 'creer-limite',
    question: 'Comment créer une limite par catégorie ?',
    reponse:
      'Ouvrez « Budgets par catégorie ». Appuyez sur « Fixer une limite » à côté d’une catégorie, puis indiquez le montant maximum à dépenser par mois. SoldeClair suit ensuite vos dépenses dans cette catégorie.',
    action: 'budgets',
    motsCles: ['creer une limite', 'fixer une limite', 'limite', 'limite par categorie', 'budget par categorie', 'creer un budget', 'plafond', 'budget'],
    pages: ['budgets'],
  },
  {
    id: 'alertes',
    question: 'Que signifient les alertes à 75 %, 90 % et 100 % ?',
    reponse:
      'À 75 % de la limite, SoldeClair signale que vous approchez du maximum. À 90 %, l’alerte devient plus visible. À 100 %, la catégorie a dépassé la limite prévue, et vous pouvez consulter les opérations concernées. Chaque alerte est indiquée par un texte et une icône.',
    action: 'budgets',
    motsCles: ['alerte', 'alertes', 'signifient les alertes', '75', '90', '100', 'depasse', 'depassement', 'limite depassee'],
    pages: ['budgets'],
  },
  {
    id: 'modifier-budget',
    question: 'Comment modifier un budget ?',
    reponse:
      'Dans « Budgets par catégorie », appuyez sur l’icône en forme de crayon à côté de la limite. Changez le montant, puis enregistrez. Laissez le champ vide ou à 0 pour retirer la limite.',
    action: 'budgets',
    motsCles: ['modifier un budget', 'modifier la limite', 'changer la limite', 'changer un budget', 'augmenter la limite', 'baisser la limite', 'retirer la limite'],
    pages: ['budgets'],
  },
  {
    id: 'rouge',
    question: 'Pourquoi une dépense apparaît-elle en rouge ?',
    reponse:
      'Le rouge indique simplement l’argent qui sort : dépenses, charges et prélèvements. Le vert indique l’argent qui entre et un solde positif. Ce n’est pas un jugement, et un signe « − » ou « + » accompagne toujours le montant.',
    motsCles: ['rouge', 'en rouge', 'couleur', 'couleurs', 'vert', 'pourquoi rouge'],
  },

  // --- Épargne ---
  {
    id: 'versement',
    question: 'Comment ajouter un versement ?',
    reponse:
      'Ouvrez « Objectifs d’épargne » et appuyez sur « Ajouter un versement » sous l’objectif concerné. Indiquez le montant et la date. La progression de l’objectif est mise à jour aussitôt.',
    motsCles: ['versement', 'ajouter un versement', 'verser', 'alimenter', 'mettre de cote', 'epargner', 'mettre de l argent'],
    pages: ['objectifs'],
  },
  {
    id: 'mensuel-necessaire',
    question: 'Comment est calculé le montant mensuel nécessaire ?',
    reponse:
      'SoldeClair divise le montant qu’il reste à épargner par le nombre de mois jusqu’à la date souhaitée. Le résultat est arrondi au centime supérieur pour arriver à temps. Sans date souhaitée, SoldeClair estime plutôt la date d’arrivée à partir de votre contribution mensuelle.',
    motsCles: ['montant mensuel', 'montant mensuel necessaire', 'combien par mois', 'mettre de cote chaque mois', 'effort mensuel', 'contribution mensuelle'],
    pages: ['objectifs'],
  },
  {
    id: 'progression',
    question: 'Comment est calculée la progression ?',
    reponse:
      'La progression additionne le montant déjà disponible au départ et tous vos versements, puis compare ce total au montant cible. Par exemple, 350 € sur 1 000 € donnent 35 %.',
    motsCles: ['progression', 'avancement', 'pourcentage atteint', 'atteint', 'pourcentage'],
    pages: ['objectifs'],
  },
  {
    id: 'epargne-bleu',
    question: 'Pourquoi l’épargne apparaît-elle en bleu et non en rouge ?',
    reponse:
      'L’épargne n’est pas une dépense : cet argent reste à vous, mis de côté pour vos objectifs. Le bleu la distingue donc des dépenses, en rouge. Elle est quand même retirée de votre reste à vivre du mois, car elle n’est plus disponible pour vos dépenses.',
    motsCles: ['epargne en bleu', 'bleu', 'en bleu', 'pourquoi bleu', 'couleur de l epargne'],
  },

  // --- Simulateur ---
  {
    id: 'simulateur-but',
    question: 'À quoi sert le simulateur d’achat ?',
    reponse:
      'Le simulateur d’achat montre l’effet d’un achat avant de le faire : solde restant, nouveau disponible par jour, épargne du mois et objectifs. Indiquez le montant et, si vous le souhaitez, la catégorie. Le résultat reste une indication budgétaire.',
    action: 'simulateur',
    motsCles: ['simulateur', 'simulateur d achat', 'simuler', 'simulation', 'tester un achat'],
  },
  {
    id: 'simulateur-modifie',
    question: 'Est-ce que le simulateur modifie réellement mon budget ?',
    reponse:
      'Non. Le simulateur ne fait que calculer : rien n’est enregistré et votre budget ne change pas. Pour noter un achat réellement fait, ajoutez une dépense.',
    action: 'simulateur',
    motsCles: ['simulateur modifie', 'modifie reellement', 'change mon budget', 'enregistre l achat', 'simulation enregistree'],
  },
  {
    id: 'prudence',
    question: 'Que signifie « possible avec prudence » ?',
    reponse:
      '« Achat possible avec prudence » signifie que l’achat reste possible, mais qu’il entame l’épargne prévue du mois, fait dépasser la limite d’une catégorie ou utilise plus de la moitié de votre solde disponible. C’est un signal pour prendre le temps de vérifier, pas une interdiction.',
    action: 'simulateur',
    motsCles: ['prudence', 'avec prudence', 'possible avec prudence', 'confortable', 'desequilibrer', 'appreciation'],
  },
  {
    id: 'impact',
    question: 'Comment est calculé l’impact d’un achat ?',
    reponse:
      'SoldeClair retire le prix de l’achat de votre solde (celui de « Mon compte »), puis recalcule le disponible par jour jusqu’à la fin du mois. Il vérifie aussi votre épargne du mois, vos objectifs et la limite de la catégorie choisie.',
    action: 'simulateur',
    motsCles: ['impact', 'impact d un achat', 'effet d un achat', 'calcul de l impact'],
  },
  {
    id: 'decision-achat',
    question: 'Puis-je acheter cet article ?',
    reponse:
      'Poksy ne peut pas décider à votre place. Utilisez le simulateur d’achat pour voir l’impact sur votre solde, votre disponible quotidien et votre objectif d’épargne. Le résultat reste une indication budgétaire.',
    action: 'simulateur',
    motsCles: ['acheter', 'puis je acheter', 'je peux acheter', 'dois je acheter', 'les moyens', 'raisonnable', 'craquer'],
  },

  // --- Confidentialité ---
  {
    id: 'banque-acces',
    question: 'SoldeClair peut-il accéder à mon compte bancaire ?',
    reponse:
      'Non. SoldeClair n’est relié à aucune banque et ne demande jamais vos identifiants, mots de passe ou numéros de carte. Vous saisissez vous-même vos opérations, et « Ajuster le solde » permet de recaler le solde.',
    motsCles: ['acceder a mon compte bancaire', 'acces a mon compte', 'compte bancaire', 'bancaire', 'banque', 'connecter ma banque', 'relier ma banque', 'synchroniser', 'apple pay'],
  },
  {
    id: 'amis-voir',
    question: 'Mes amis peuvent-ils voir mon budget ?',
    reponse:
      'Non. Vos données restent dans le navigateur de votre appareil : personne d’autre ne peut les voir, même avec le même lien. Ne partagez pas votre fichier de sauvegarde, car il contient tout votre budget.',
    motsCles: ['amis', 'ami', 'voir mon budget', 'partager', 'partage', 'quelqu un d autre', 'autres personnes', 'famille'],
  },
  {
    id: 'changer-appareil',
    question: 'Que se passe-t-il si je change d’appareil ?',
    reponse:
      'Vos données ne passent pas d’un appareil à l’autre toutes seules. Sur l’ancien appareil, exportez une sauvegarde complète (JSON) dans les paramètres. Sur le nouveau, ouvrez SoldeClair et choisissez « Importer une sauvegarde ».',
    action: 'sauvegarde',
    motsCles: ['change d appareil', 'changer d appareil', 'changer de telephone', 'changer d ordinateur', 'nouveau telephone', 'autre appareil', 'nouvel ordinateur', 'transferer', 'perdu mon telephone'],
  },
  {
    id: 'sauvegarder',
    question: 'Comment sauvegarder mes données ?',
    reponse:
      'Ouvrez les paramètres et choisissez « Sauvegarde complète (JSON) ». Un fichier est enregistré sur votre appareil : gardez-le en lieu sûr. Faites-le régulièrement, par exemple une fois par mois.',
    action: 'sauvegarde',
    motsCles: ['sauvegarder', 'sauvegarde', 'exporter', 'export', 'backup', 'json', 'csv', 'copie de mes donnees'],
    pages: ['parametres'],
  },
  {
    id: 'restaurer',
    question: 'Comment restaurer une sauvegarde ?',
    reponse:
      'Ouvrez les paramètres, puis « Importer une sauvegarde », et choisissez votre fichier JSON. La sauvegarde remplace les données du profil ouvert : SoldeClair vous demande de confirmer avant.',
    action: 'parametres',
    motsCles: ['restaurer', 'restaurer une sauvegarde', 'importer', 'import', 'recuperer mes donnees', 'retrouver mes donnees'],
    pages: ['parametres'],
  },
  {
    id: 'supprimer-donnees',
    question: 'Comment supprimer toutes mes données ?',
    reponse:
      'Ouvrez les paramètres, puis « Effacer toutes mes données », tout en bas. Une double confirmation est demandée : il faut taper EFFACER. Exportez d’abord une sauvegarde, car l’effacement est définitif.',
    action: 'parametres',
    motsCles: ['supprimer toutes mes donnees', 'supprimer mes donnees', 'effacer mes donnees', 'effacer toutes', 'tout effacer', 'tout supprimer', 'reinitialiser', 'remettre a zero', 'recommencer'],
    pages: ['parametres'],
  },

  // --- Utilisation du site ---
  {
    id: 'tableau-de-bord',
    question: 'Comment revenir au tableau de bord ?',
    reponse:
      'Appuyez sur « Accueil » dans la barre du bas sur téléphone, ou sur « Tableau de bord » dans le menu sur ordinateur. Le logo SoldeClair, lui, ouvre la page de présentation et vos profils.',
    action: 'tableau',
    motsCles: ['tableau de bord', 'revenir', 'retour', 'retourner', 'accueil', 'page principale'],
  },
  {
    id: 'changer-mois',
    question: 'Comment changer de mois ?',
    reponse:
      'Utilisez les flèches de part et d’autre du nom du mois, en haut du tableau de bord. Vous pouvez ainsi revoir un mois passé ou préparer le mois suivant.',
    action: 'tableau',
    motsCles: ['changer de mois', 'mois precedent', 'mois suivant', 'mois dernier', 'autre mois', 'mois passe', 'mois'],
  },
  {
    id: 'mode-sombre',
    question: 'Comment passer en mode sombre ?',
    reponse:
      'Ouvrez les paramètres, rubrique « Apparence », et choisissez « Mode sombre ». « Comme mon appareil » suit automatiquement le réglage de votre téléphone ou de votre ordinateur.',
    action: 'parametres',
    motsCles: ['mode sombre', 'sombre', 'theme', 'nuit', 'fond noir', 'mode clair', 'apparence'],
  },
  {
    id: 'demo',
    question: 'Comment utiliser un profil de démonstration ?',
    reponse:
      'Pour essayer sans toucher à vos données, appuyez sur le logo SoldeClair, choisissez « Créer un nouveau profil », puis chargez une démonstration. Dans les paramètres, « Données de démonstration » remplace les données du profil ouvert, après confirmation. Les profils de démonstration sont entièrement fictifs.',
    action: 'parametres',
    motsCles: ['demonstration', 'demo', 'profil de demonstration', 'exemple', 'essayer', 'donnees fictives'],
  },
  {
    id: 'retrouver',
    question: 'Comment retrouver une opération ?',
    reponse:
      'Ouvrez « Historique et bilan » et tapez un mot dans « Rechercher » : libellé, catégorie… Vous pouvez aussi filtrer par type et par période. « Mon compte » propose la même recherche.',
    motsCles: ['retrouver', 'retrouver une operation', 'rechercher', 'chercher', 'trouver une operation', 'historique', 'recherche'],
  },
  {
    id: 'signaler',
    question: 'Comment signaler un problème ?',
    reponse:
      'Notez la page, ce que vous faisiez et le message affiché, puis prévenez la personne qui vous a fait découvrir SoldeClair. Poksy n’envoie rien : aucune donnée ne quitte votre appareil. Pensez à faire une sauvegarde avant de réessayer.',
    motsCles: ['signaler', 'signaler un probleme', 'probleme', 'bug', 'ne marche pas', 'ne fonctionne pas', 'plante', 'souci'],
  },

  // --- Questions supplémentaires (accessibles par la recherche) ---
  {
    id: 'report',
    question: 'Qu’est-ce que le report des mois précédents ?',
    reponse:
      'Dans le bilan et le détail du mois, le report ajoute ce qui restait les mois précédents, ou retire un dépassement. Le solde du tableau de bord, lui, cumule déjà tout depuis votre première saisie. Vous pouvez désactiver le report dans les paramètres.',
    action: 'tableau',
    motsCles: ['report', 'mois precedents', 'cumul', 'reste du mois dernier', 'reporter'],
  },
  {
    id: 'estimation',
    question: 'Comment fonctionne l’estimation à 30 jours ?',
    reponse:
      'L’estimation part du solde de « Mon compte », ajoute les revenus prévus et retire les charges prévues ainsi que vos dépenses courantes habituelles. Elle donne une idée de votre situation dans 7, 15 et 30 jours. Cette estimation dépend des informations enregistrées.',
    action: 'tableau',
    motsCles: ['estimation', 'prevision', '30 jours', 'fin du mois', 'dans un mois'],
  },
  {
    id: 'profils',
    question: 'Comment utiliser plusieurs profils ?',
    reponse:
      'Appuyez sur le logo SoldeClair pour ouvrir la page de présentation. Vous pouvez y continuer avec un profil, en changer ou en créer un nouveau. Chaque profil a ses propres données sur cet appareil.',
    motsCles: ['profil', 'profils', 'plusieurs profils', 'nouveau profil', 'changer de profil', 'autre profil'],
  },
  {
    id: 'installer',
    question: 'Comment installer SoldeClair comme une application ?',
    reponse:
      'Sur iPhone, dans Safari, appuyez sur Partager puis « Sur l’écran d’accueil » ; sur Android, ouvrez le menu de Chrome puis « Installer l’application ». Faites d’abord une sauvegarde : l’application installée a sa propre mémoire. Le guide complet est dans les paramètres.',
    action: 'parametres',
    motsCles: ['installer', 'application', 'appli', 'app', 'ecran d accueil', 'telecharger'],
  },
  {
    id: 'conseil',
    question: 'Peux-tu me conseiller un placement ou un crédit ?',
    reponse:
      'Poksy ne donne pas de conseil en placement, en investissement ou en crédit : il explique seulement SoldeClair. Pour ce type de décision, un conseiller professionnel pourra vous accompagner. SoldeClair vous aide à suivre votre budget et votre épargne.',
    motsCles: ['investir', 'investissement', 'placement', 'placer', 'bourse', 'crypto', 'credit', 'pret', 'emprunt', 'emprunter', 'assurance vie'],
  },
  {
    id: 'qui-es-tu',
    question: 'Qui es-tu ?',
    reponse:
      'Je suis Poksy, le guide de SoldeClair. Je réponds avec des explications préparées à l’avance, directement sur votre appareil : je ne suis pas une intelligence artificielle. Je ne remplace pas un conseiller financier professionnel.',
    motsCles: ['qui es tu', 'poksy', 'intelligence artificielle', 'ia', 'robot', 'chatgpt', 'humain'],
  },
  {
    id: 'bonjour',
    question: 'Bonjour',
    reponse: 'Bonjour ! Choisissez une question ci-dessous ou écrivez la vôtre, par exemple « ajouter une dépense ».',
    motsCles: ['bonjour', 'salut', 'hello', 'coucou', 'bonsoir'],
  },
  {
    id: 'merci',
    question: 'Merci',
    reponse: 'Avec plaisir. N’hésitez pas si vous avez une autre question.',
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
    questions: [q('solde-banque'), q('ajuster-solde', 'Comment ajuster mon solde réel ?'), q('ajustement-quoi'), q('carte-restaurant'), q('masquer')],
  },
  {
    titre: 'Revenus et dépenses',
    questions: [q('ajouter-revenu'), q('ajouter-depense'), q('modifier-operation'), q('supprimer-operation'), q('revenu-exceptionnel'), q('recurrent')],
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

/** Questions proposées en premier selon la page ouverte. */
export const QUESTIONS_PAR_PAGE: Partial<Record<PageKey, QuestionProposee[]>> = {
  compte: [q('ajuster-solde'), q('solde-banque', 'Pourquoi mon solde est-il différent ?'), q('carte-restaurant')],
  depenses: [q('ajouter-depense'), q('modifier-operation'), q('choisir-categorie')],
  budgets: [q('creer-limite', 'Comment fixer une limite ?'), q('alertes', 'Que signifient les alertes ?'), q('modifier-budget')],
  objectifs: [q('creer-objectif', 'Comment créer un objectif ?'), q('versement'), q('progression')],
  parametres: [q('sauvegarder'), q('donnees-ou'), q('supprimer-donnees', 'Comment supprimer mes données ?')],
  presentation: [q('soldeclair-quoi'), q('gratuit'), q('donnees-ou')],
};

/* -------------------------------------------------------------------------- */
/* Recherche par mots-clés (locale)                                            */
/* -------------------------------------------------------------------------- */

const MOTS_VIDES = new Set(
  (
    'a au aux avec ce ces c ca cela cet cette comment d dans de des du elle en est et etre faire fait il ils j je l la le les leur lui m ma me mes moi mon n ne nos notre nous on ou par pas peut peux plus pour pourquoi qu quand que quel quelle quelles quels qui quoi s sa se ses si son sont sur t ta te tes toi ton tu un une vos votre vous y ' +
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
  return texte
    .replace(/ ([:;!?»])/g, ' $1')
    .replace(/\u00ab /g, '\u00ab\u00a0');
}
