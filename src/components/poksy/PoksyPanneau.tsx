import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../state/AppState';
import { resteAVivre } from '../../lib/accounts';
import {
  ACTION_LABELS,
  ACTION_ROUTES,
  MENTION,
  PRESENTATION,
  QUESTIONS_PAR_PAGE,
  QUESTIONS_PAR_PROFIL,
  QUESTIONS_RAPIDES,
  REPONSE_INTROUVABLE,
  RUBRIQUES,
  suiteDe,
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
import { mouvementReduit } from '../../lib/mouvement';

interface Props {
  messages: MessagePoksy[];
  setMessages: Dispatch<SetStateAction<MessagePoksy[]>>;
  plus: boolean;
  setPlus: (v: boolean) => void;
  onFermer: () => void;
  naviguer: (route: string) => void;
  ajouterDepense: () => void;
  /** Question posée dès l'ouverture (astuce d'une page). */
  questionInitiale?: { texte: string; id: string } | null;
}

function Groupe({
  id,
  titre,
  questions,
  onChoisir,
}: {
  id: string;
  titre: string;
  questions: QuestionProposee[];
  onChoisir: (q: QuestionProposee) => void;
}) {
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
export default function PoksyPanneau({ messages, setMessages, plus, setPlus, onFermer, naviguer, ajouterDepense, questionInitiale }: Props) {
  const { data, today, fmtShort } = useApp();
  const location = useLocation();
  // Sans profil (page d'accueil d'un nouveau visiteur), on reste sur les questions de présentation
  const page = data.profile ? pageDe(location.pathname) : 'presentation';
  const avecActions = !!data.profile;
  const racine = useRef<HTMLDivElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const [saisie, setSaisie] = useState('');
  const nbMessages = useRef(messages.length);

  // À l'ouverture, le focus va dans la fenêtre (le lecteur d'écran annonce « Poksy, Guide SoldeClair »).
  useEffect(() => {
    racine.current?.focus();
  }, []);

  // Défilement : seulement la conversation (jamais la page), et seulement si l'on était déjà près du bas.
  // Sinon, un bouton « Nouveau message » permet d'y aller quand on veut.
  const corps = useRef<HTMLDivElement>(null);
  const presDuBas = useRef(true);
  const [nouveau, setNouveau] = useState(false);
  const surDefilement = () => {
    const c = corps.current;
    if (!c) return;
    presDuBas.current = c.scrollHeight - c.scrollTop - c.clientHeight < 120;
    if (presDuBas.current) setNouveau(false);
  };
  const allerA = (el: HTMLElement | null | undefined) => {
    const c = corps.current;
    if (!c || !el) return;
    const haut = el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - 8;
    c.scrollTo?.({ top: haut, behavior: mouvementReduit() ? 'auto' : 'smooth' });
  };
  useEffect(() => {
    if (messages.length > nbMessages.current) {
      // La question posée en haut de la vue : la réponse se lit juste en dessous, sans remonter
      const question = conversation.current?.children[nbMessages.current] as HTMLElement | undefined;
      if (presDuBas.current) allerA(question);
      else setNouveau(true);
    }
    nbMessages.current = messages.length;
  }, [messages.length]);

  // Chiffres réels pour compléter certaines réponses (jamais inventés ; masqués si l'utilisateur l'a demandé).
  const contexte = useMemo<ContextePoksy>(() => {
    if (!data.profile) return {};
    // Mêmes chiffres que « Il te reste » du tableau de bord : le solde de « Mon compte »
    const r = resteAVivre(data, today);
    return {
      resteAVivre: r.solde < 0 ? `− ${fmtShort(-r.solde, 'majore')}` : fmtShort(r.solde, 'prudent'),
      resteNegatif: r.solde < 0,
      parJour: r.parJour !== null && r.parJour >= 0 ? fmtShort(r.parJour, 'prudent') : undefined,
      joursRestants: r.joursRestants,
      ajustementFait: (data.adjustments ?? []).length > 0,
    };
  }, [data, today, fmtShort]);

  // Poksy « écrit » un court instant (sauf avec moins d'animations), puis répond juste sous la question
  const [ecrit, setEcrit] = useState(false);
  const repondre = (texte: string, id: string | null) => {
    const trouvee = id ? fiche(id) : rechercher(texte, page).fiche;
    const reponse: MessagePoksy = trouvee
      ? { id: 0, auteur: 'poksy', texte: reponseDe(trouvee, contexte), action: trouvee.action, ficheId: trouvee.id }
      : { id: 0, auteur: 'poksy', texte: REPONSE_INTROUVABLE };
    setPlus(false);
    setMessages((m) => [...m, { id: m.length, auteur: 'vous', texte: masquerNumeros(texte) }]);
    const ajouterReponse = () => setMessages((m) => [...m, { ...reponse, id: m.length }]);
    if (mouvementReduit()) {
      ajouterReponse();
      return;
    }
    setEcrit(true);
    setTimeout(() => {
      setEcrit(false);
      ajouterReponse();
    }, 380);
  };
  // Astuce d'une page ou « Demander à Poksy » : la question est posée à l'ouverture (une fois par demande)
  const questionPosee = useRef<typeof questionInitiale>(null);
  useEffect(() => {
    if (questionInitiale && questionPosee.current !== questionInitiale) {
      questionPosee.current = questionInitiale;
      repondre(questionInitiale.texte, questionInitiale.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionInitiale]);

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
  // Questions adaptées à la situation (alternant : fin de contrat, 13e mois…), proposées en plus
  const pourVous = (data.profile ? QUESTIONS_PAR_PROFIL[data.profile.type] : []).filter((q) => !dejaProposees.has(q.id));
  const choisir = (q: QuestionProposee) => repondre(q.libelle, q.id);
  // Trois choix rapides au plus : la suite de la dernière réponse, puis la page, la situation, les fréquentes
  const derniereFiche = [...messages].reverse().find((m) => m.ficheId)?.ficheId;
  const dejaPosees = new Set(messages.map((m) => m.ficheId).filter(Boolean));
  const choixRapides = [...suiteDe(derniereFiche), ...(questionsPage ?? []), ...rapides.slice(0, 1), ...pourVous, ...rapides]
    .filter((q, i, l) => !dejaPosees.has(q.id) && l.findIndex((x) => x.id === q.id) === i)
    .slice(0, 3);

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

      <div className="poksy-corps" ref={corps} onScroll={surDefilement}>
        <p id="poksy-presentation" className="poksy-presentation">
          {PRESENTATION}
        </p>
        <div ref={conversation} className="poksy-conversation" role="log" aria-live="polite" aria-label="Conversation avec Poksy">
          {messages.map((m) => (
            <div key={m.id} className={`poksy-message poksy-message-${m.auteur}`}>
              {m.auteur === 'poksy' && <PoksyAvatar taille={28} className="poksy-message-avatar" />}
              <div className="poksy-bulle">
                <span className="sr-only">{m.auteur === 'poksy' ? 'Poksy : ' : 'Toi : '}</span>
                {m.texte.split('\n').map((ligne, i) => (
                  <p key={i}>{typographie(ligne)}</p>
                ))}
                {m.action && avecActions && (
                  <button type="button" className="btn btn-secondaire btn-small poksy-action" onClick={() => agir(m.action!)}>
                    {ACTION_LABELS[m.action]}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {ecrit && (
          <div className="poksy-message poksy-message-poksy poksy-ecrit" aria-hidden="true">
            <PoksyAvatar taille={28} className="poksy-message-avatar" />
            <div className="poksy-bulle">
              <span className="poksy-points">
                <span />
                <span />
                <span />
              </span>
            </div>
          </div>
        )}

        {!ecrit && (
          <div className="poksy-suggestions">
            <section className="poksy-groupe" aria-labelledby="poksy-choix-titre">
              <h3 id="poksy-choix-titre" className="poksy-groupe-titre">
                {messages.length === 1 ? (questionsPage ? 'Sur cette page' : 'Questions fréquentes') : 'Et ensuite ?'}
              </h3>
              <ul className="poksy-questions poksy-choix">
                {choixRapides.map((q) => (
                  <li key={q.id}>
                    <button type="button" className="poksy-question" onClick={() => choisir(q)}>
                      {typographie(q.libelle)}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <button type="button" className="poksy-plus" aria-expanded={plus} aria-controls="poksy-rubriques" onClick={() => setPlus(!plus)}>
              <Icon name={plus ? 'minus' : 'plus'} size={16} />
              <span>{plus ? 'Moins de questions' : 'Plus de questions'}</span>
            </button>
            <div id="poksy-rubriques" hidden={!plus}>
              {plus && (
                <>
                  {questionsPage && <Groupe id="poksy-page" titre="Sur cette page" questions={questionsPage} onChoisir={choisir} />}
                  <Groupe id="poksy-rapides" titre="Questions fréquentes" questions={rapides} onChoisir={choisir} />
                  {pourVous.length > 0 && <Groupe id="poksy-pour-vous" titre="Pour ta situation" questions={pourVous} onChoisir={choisir} />}
                  {RUBRIQUES.map((r, k) => (
                    <Groupe key={r.titre} id={`poksy-rubrique-${k}`} titre={r.titre} questions={r.questions} onChoisir={choisir} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {nouveau && (
        <button
          type="button"
          className="poksy-nouveau"
          onClick={() => {
            setNouveau(false);
            allerA(conversation.current?.lastElementChild as HTMLElement | null);
          }}
        >
          <Icon name="expense" size={14} /> Nouveau message
        </button>
      )}

      <form className="poksy-saisie" onSubmit={envoyer}>
        <label htmlFor="poksy-question" className="sr-only">
          Ta question pour Poksy
        </label>
        <input
          id="poksy-question"
          className="poksy-champ"
          type="text"
          maxLength={200}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="Écris ta question…"
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
