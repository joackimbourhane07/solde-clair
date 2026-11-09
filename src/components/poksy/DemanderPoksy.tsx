import { demanderAPoksy } from '../../lib/poksyTextes';
import { PoksyAvatar } from './PoksyAvatar';

/** « Demander à Poksy » : ouvre Poksy sur la bonne question (il répond seulement, rien n'est modifié). */
export function DemanderPoksy({ question, id, libelle = 'Demander à Poksy' }: { question: string; id: string; libelle?: string }) {
  return (
    <button type="button" className="btn btn-secondaire btn-small demander-poksy" onClick={() => demanderAPoksy(question, id)}>
      <PoksyAvatar taille={24} />
      {libelle}
    </button>
  );
}
