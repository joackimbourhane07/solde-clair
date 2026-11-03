import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../state/AppState';
import { monthSummary } from '../../lib/budget';
import { monthOf } from '../../lib/dates';
import {
  ACTION_LABELS,
  ACTION_ROUTES,
  MENTION,
  PRESENTATION,
  QUESTIONS_PAR_PAGE,
  QUESTIONS_RAPIDES,
  REPONSE_INTROUVABLE,
  RUBRIQUES,
  fiche,
  masquerNumeros,
  pageDe,
  rechercher,
  reponseDe,
  typographie,
  type ContextePoksy,
  type QuestionProposee,
} from '../../lib/poksy';
import type { MessagePoksy, PoksyAction } from '../../lib/poksyTextes';
import { Icon } from '../Icon';
import { PoksyAvatar } from './PoksyAvatar';

interface Props {
  messages: MessagePoksy[];
  setMessages: Dispatch<SetStateAction<MessagePoksy[]>>;
  plus: boolean;
  setPlus: (v: boolean) => void;
  onFermer: () => void;
  naviguer: (route: string) => void;
  ajouterDepense: () => void;
}

function Groupe({ id, titre, questions, onChoisir }: { id: string; titre: string; questions: QuestionProposee[]; onChoisir: (q: QuestionProposee) => void }) {
  return (
    <section className="poksy-groupe" aria-labelledby={id}>
      <h3 id={id} className="poksy-groupe-titre">
        {titre}
      </h3>
      <ul className="poksy-questions">
        {questions.map((q) => (
          <li key={`${q.id}-${q.libelle}`}>
            <button type="button" className="poksy-question" onClick={() => onChoisir(q)}>
              {typographie(q.libelle)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Fenêtre de discussion de Poksy (chargée à la demande). Réponses préparées, calculées sur l'appareil. */
export default function PoksyPanneau({ messages, setMessages, plus, setPlus, onFermer, naviguer, ajouterDepense }: Props) {
  const { data, today, fmtShort } = useApp();
  const location = useLocation();
  const page = pageDe(location.pathname);
  const racine = useRef<HTMLDivElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const [saisie, setSaisie] = useState('');
  const nbMessages = useRef(messages.length);

  // À l'ouverture, le focus va dans la fenêtre (le lecteur d'écran annonce « Poksy, Guide SoldeClair »).
  useEffect(() => {
    racine.current?.focus();
  }, []);

  // Nouvelle réponse : on la fait défiler jusqu'à la question posée.
  useEffect(() => {
    if (messages.length > nbMessages.current) {
      const question = conversation.current?.children[nbMessages.current] as HTMLElement | undefined;
      question?.scrollIntoView?.({ block: 'start' });
    }
    nbMessages.current = messages.length;
  }, [messages.length]);

  // Chiffres réels pour compléter certaines réponses (jamais inventés ; masqués si l'utilisateur l'a demandé).
  const contexte = useMemo<ContextePoksy>(() => {
    if (!data.profile) return {};
    const s = monthSummary(data, monthOf(today), today);
    return {
      resteAVivre: s.available < 0 ? `− ${fmtShort(-s.available, 'majore')}` : fmtShort(s.available, 'prudent'),
      resteNegatif: s.available < 0,
      parJour: s.dailyRemaining !== null && s.dailyRemaining >= 0 ? fmtShort(s.dailyRemaining, 'prudent') : undefined,
      joursRestants: s.daysRemaining,
      ajustementFait: (data.adjustments ?? []).length > 0,
    };
  }, [data, today, fmtShort]);

  const repondre = (texte: string, id: string | null) => {
    const trouvee = id ? fiche(id) : rechercher(texte, page).fiche;
    setMessages((m) => {
      const n = m.length;
      return [
        ...m,
        { id: n, auteur: 'vous', texte: masquerNumeros(texte) },
        trouvee
          ? { id: n + 1, auteur: 'poksy', texte: reponseDe(trouvee, contexte), action: trouvee.action }
          : { id: n + 1, auteur: 'poksy', texte: REPONSE_INTROUVABLE },
      ];
    });
  };

  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    const texte = saisie.trim();
    if (!texte) return;
    setSaisie('');
    repondre(texte, null);
  };

  const agir = (action: PoksyAction) => {
    if (action === 'depense') ajouterDepense();
    else naviguer(ACTION_ROUTES[action]);
  };

  const questionsPage = QUESTIONS_PAR_PAGE[page];
  const dejaProposees = new Set(questionsPage?.map((q) => q.id) ?? []);
  const rapides = QUESTIONS_RAPIDES.filter((q) => !dejaProposees.has(q.id));
  const choisir = (q: QuestionProposee) => repondre(q.libelle, q.id);

  return (
    <div
      id="poksy-panneau"
      ref={racine}
      className="poksy-panneau"
      role="dialog"
      aria-labelledby="poksy-nom"
      aria-describedby="poksy-presentation"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onFermer();
        }
      }}
    >
      <header className="poksy-entete">
        <PoksyAvatar taille={40} />
        <div className="poksy-identite">
          <h2 id="poksy-nom" className="poksy-nom">
            Poksy
          </h2>
          <p className="poksy-role">Guide SoldeClair</p>
        </div>
        <button type="button" className="btn btn-discret btn-icon poksy-fermer" aria-label="Fermer Poksy" onClick={onFermer}>
          <Icon name="close" size={20} />
        </button>
      </header>

      <div className="poksy-corps">
        <p id="poksy-presentation" className="poksy-presentation">
          {PRESENTATION}
        </p>
        <div ref={conversation} className="poksy-conversation" role="log" aria-live="polite" aria-label="Conversation avec Poksy">
          {messages.map((m) => (
            <div key={m.id} className={`poksy-message poksy-message-${m.auteur}`}>
              {m.auteur === 'poksy' && <PoksyAvatar taille={28} className="poksy-message-avatar" />}
              <div className="poksy-bulle">
                <span className="sr-only">{m.auteur === 'poksy' ? 'Poksy : ' : 'Vous : '}</span>
                {m.texte.split('\n').map((ligne, i) => (
                  <p key={i}>{typographie(ligne)}</p>
                ))}
                {m.action && (
                  <button type="button" className="btn btn-secondaire btn-small poksy-action" onClick={() => agir(m.action!)}>
                    {ACTION_LABELS[m.action]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="poksy-suggestions">
          {questionsPage && <Groupe id="poksy-page" titre="Sur cette page" questions={questionsPage} onChoisir={choisir} />}
          <Groupe id="poksy-rapides" titre="Questions fréquentes" questions={rapides} onChoisir={choisir} />
          <button type="button" className="poksy-plus" aria-expanded={plus} aria-controls="poksy-rubriques" onClick={() => setPlus(!plus)}>
            <Icon name={plus ? 'minus' : 'plus'} size={16} />
            <span>{plus ? 'Voir moins de questions' : 'Voir plus de questions'}</span>
          </button>
          <div id="poksy-rubriques" hidden={!plus}>
            {plus &&
              RUBRIQUES.map((r, i) => <Groupe key={r.titre} id={`poksy-rubrique-${i}`} titre={r.titre} questions={r.questions} onChoisir={choisir} />)}
          </div>
        </div>
      </div>

      <form className="poksy-saisie" onSubmit={envoyer}>
        <label htmlFor="poksy-question" className="sr-only">
          Votre question pour Poksy
        </label>
        <input
          id="poksy-question"
          className="poksy-champ"
          type="text"
          maxLength={200}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="Écrivez votre question…"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
        />
        <button type="submit" className="btn btn-primaire poksy-envoyer">
          Envoyer
        </button>
      </form>
      <p className="poksy-mention">{MENTION}</p>
    </div>
  );
}
