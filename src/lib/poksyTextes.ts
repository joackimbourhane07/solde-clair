/**
 * Textes et types de Poksy nécessaires dès le chargement (bouton flottant, message de première visite).
 * Le reste (questions, réponses, recherche) est dans poksy.ts, chargé seulement à l'ouverture.
 */

/** Boutons proposés sous une réponse : ils ouvrent seulement une page ou un formulaire. */
export type PoksyAction = 'depense' | 'revenu' | 'ajuster' | 'tableau' | 'objectif' | 'simulateur' | 'budgets' | 'sauvegarde' | 'parametres' | 'plan';

export interface MessagePoksy {
  id: number;
  auteur: 'poksy' | 'vous';
  texte: string;
  action?: PoksyAction;
}

export const MESSAGE_BIENVENUE =
  'Bonjour, je suis Poksy.\nJe peux vous aider à comprendre votre budget ou à utiliser SoldeClair. Que souhaitez-vous savoir ?';

export const MESSAGE_PREMIERE_VISITE = 'Bonjour, je suis Poksy. Une question sur SoldeClair ?';

/** Sous-titre de la bulle d'accueil. */
export const DETAIL_PREMIERE_VISITE = 'Je vous explique vos chiffres en quelques secondes. Tout reste sur votre appareil.';

/** Astuce proposée une seule fois sur certaines pages (jamais plus d'une par visite, désactivable). */
export interface AstucePoksy {
  texte: string;
  /** Question posée si la personne demande la réponse complète. */
  question: string;
  ficheId: string;
}

export const ASTUCES_PAR_PAGE: Record<string, AstucePoksy> = {
  '/compte': {
    texte: 'Votre solde ne correspond pas à celui de votre banque ? Il se recale en quelques secondes.',
    question: 'Comment ajuster mon solde ?',
    ficheId: 'ajuster-solde',
  },
  '/budgets': {
    texte: 'Des alertes à 75 %, 90 % et 100 % vous préviennent avant de dépasser une limite.',
    question: 'Que signifient les alertes à 75 %, 90 % et 100 % ?',
    ficheId: 'alertes',
  },
  '/plan': {
    texte: 'Épargne totale ou épargne disponible : je vous explique la différence en une phrase.',
    question: 'Épargne totale ou épargne disponible ?',
    ficheId: 'epargne-totale-disponible',
  },
  '/objectifs': {
    texte: 'Je calcule combien mettre de côté chaque mois pour tenir la date de votre objectif.',
    question: 'Comment est calculé le montant mensuel nécessaire ?',
    ficheId: 'mensuel-necessaire',
  },
  '/simulateur': {
    texte: 'Avant un achat, le simulateur montre ce qu’il vous resterait, jour par jour.',
    question: 'À quoi sert le simulateur d’achat ?',
    ficheId: 'simulateur-but',
  },
};

/** Préférences des astuces : vues, désactivées (aucune question n'est enregistrée). */
export const CLE_ASTUCES = 'soldeclair:poksy-astuces:v1';

/** Seule information mémorisée par Poksy : le message de première visite a été vu (aucune question n'est enregistrée). */
export const CLE_POKSY = 'soldeclair:poksy:v1';
