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
  /** Fiche de la réponse : sert à proposer les questions suivantes. */
  ficheId?: string;
}

export const MESSAGE_BIENVENUE = 'Bonjour, je suis Poksy.\nJe peux t’aider à comprendre ton budget ou à utiliser SoldeClair. Que veux-tu savoir ?';

export const MESSAGE_PREMIERE_VISITE = 'Bonjour, je suis Poksy. Une question sur SoldeClair ?';

/** Sous-titre de la bulle d'accueil. */
export const DETAIL_PREMIERE_VISITE = 'Je t’explique tes chiffres en quelques secondes. Tout reste sur ton appareil.';

/** Astuce proposée une seule fois sur certaines pages (jamais plus d'une par visite, désactivable). */
export interface AstucePoksy {
  texte: string;
  /** Question posée si la personne demande la réponse complète. */
  question: string;
  ficheId: string;
}

export const ASTUCES_PAR_PAGE: Record<string, AstucePoksy> = {
  '/compte': {
    texte: 'Ton solde ne correspond pas à celui de ta banque ? Il se recale en quelques secondes.',
    question: 'Comment ajuster mon solde ?',
    ficheId: 'ajuster-solde',
  },
  '/budgets': {
    texte: 'Des alertes à 75 %, 90 % et 100 % te préviennent avant de dépasser une limite.',
    question: 'Que signifient les alertes à 75 %, 90 % et 100 % ?',
    ficheId: 'alertes',
  },
  '/plan': {
    texte: 'Épargne totale ou épargne disponible : je t’explique la différence en une phrase.',
    question: 'Épargne totale ou épargne disponible ?',
    ficheId: 'epargne-totale-disponible',
  },
  '/objectifs': {
    texte: 'Je calcule combien mettre de côté chaque mois pour tenir la date de ton objectif.',
    question: 'Comment est calculé le montant mensuel nécessaire ?',
    ficheId: 'mensuel-necessaire',
  },
  '/simulateur': {
    texte: 'Avant un achat, le simulateur montre ce qu’il te resterait, jour par jour.',
    question: 'À quoi sert le simulateur d’achat ?',
    ficheId: 'simulateur-but',
  },
};

/** Préférences des astuces : vues, désactivées (aucune question n'est enregistrée). */
export const CLE_ASTUCES = 'soldeclair:poksy-astuces:v1';

/** Seule information mémorisée par Poksy : le message de première visite a été vu (aucune question n'est enregistrée). */
export const CLE_POKSY = 'soldeclair:poksy:v1';

/** Ouvre Poksy et lui pose une question (depuis n'importe quelle page). Poksy répond seulement : rien n'est modifié. */
export function demanderAPoksy(texte: string, id: string) {
  window.dispatchEvent(new CustomEvent('soldeclair:ouvrir-poksy', { detail: { texte, id } }));
}
