/**
 * Textes et types de Poksy nécessaires dès le chargement (bouton flottant, message de première visite).
 * Le reste (questions, réponses, recherche) est dans poksy.ts, chargé seulement à l'ouverture.
 */

/** Boutons proposés sous une réponse : ils ouvrent seulement une page ou un formulaire. */
export type PoksyAction =
  | 'depense'
  | 'revenu'
  | 'ajuster'
  | 'tableau'
  | 'objectif'
  | 'simulateur'
  | 'budgets'
  | 'sauvegarde'
  | 'parametres'
  | 'plan';

export interface MessagePoksy {
  id: number;
  auteur: 'poksy' | 'vous';
  texte: string;
  action?: PoksyAction;
}

export const MESSAGE_BIENVENUE =
  'Bonjour, je suis Poksy 👋\nJe peux vous aider à comprendre votre budget ou à utiliser SoldeClair. Que souhaitez-vous savoir ?';

export const MESSAGE_PREMIERE_VISITE = 'Bonjour, je suis Poksy. Une question sur SoldeClair ?';

/** Seule information mémorisée par Poksy : le message de première visite a été vu (aucune question n'est enregistrée). */
export const CLE_POKSY = 'soldeclair:poksy:v1';
