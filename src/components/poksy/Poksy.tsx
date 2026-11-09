import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Icon } from '../Icon';
import { PoksyAvatar } from './PoksyAvatar';
import { useApp } from '../../state/AppState';
import {
  ASTUCES_PAR_PAGE,
  CLE_ASTUCES,
  CLE_POKSY,
  DETAIL_PREMIERE_VISITE,
  MESSAGE_BIENVENUE,
  MESSAGE_PREMIERE_VISITE,
  type AstucePoksy,
  type MessagePoksy,
} from '../../lib/poksyTextes';

/** La fenêtre (questions, réponses, recherche) n'est chargée qu'à la première ouverture. */
const chargerPanneau = () => import('./PoksyPanneau');
const PoksyPanneau = lazy(chargerPanneau);

/** Délai avant de proposer une astuce sur une page : le temps de la découvrir d'abord. */
const DELAI_ASTUCE = 1800;

function bienvenueDejaVue(): boolean {
  try {
    return localStorage.getItem(CLE_POKSY) !== null;
  } catch {
    return true; // stockage indisponible : on ne dérange pas
  }
}

function noterBienvenueVue() {
  try {
    localStorage.setItem(CLE_POKSY, JSON.stringify({ bienvenueVue: true }));
  } catch {
    /* rien à faire */
  }
}

interface PrefsAstuces {
  vues: string[];
  desactivees: boolean;
}

function lirePrefs(): PrefsAstuces {
  try {
    const p = JSON.parse(localStorage.getItem(CLE_ASTUCES) ?? 'null') as Partial<PrefsAstuces> | null;
    return { vues: Array.isArray(p?.vues) ? p.vues.filter((v): v is string => typeof v === 'string') : [], desactivees: p?.desactivees === true };
  } catch {
    return { vues: [], desactivees: true };
  }
}

function ecrirePrefs(p: PrefsAstuces) {
  try {
    localStorage.setItem(CLE_ASTUCES, JSON.stringify(p));
  } catch {
    /* rien à faire */
  }
}

/** Une seule astuce par visite (onglet), pour rester présent sans déranger. */
let astuceMontreeCetteVisite = false;

/** Petits traits « eurêka » au-dessus de la tête de Poksy (comme sur son portrait). */
function Eclats() {
  return (
    <svg className="poksy-eclats" viewBox="0 0 32 24" width="26" height="20" aria-hidden="true" focusable="false">
      <path d="M8 18 5 8M16 16V3M24 18l3-10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Poksy, guide de SoldeClair : bouton flottant (photo de Poksy), carte de première visite, astuces par page
 * et fenêtre de discussion. Tout fonctionne sur l'appareil ; Poksy ne modifie jamais les données.
 */
export function Poksy({
  onAjouterDepense,
  cache = false,
  surAccueil = false,
}: {
  onAjouterDepense?: () => void;
  cache?: boolean;
  surAccueil?: boolean;
}) {
  const { data } = useApp();
  const [ouvert, setOuvert] = useState(false);
  const [bulle, setBulle] = useState(() => !bienvenueDejaVue());
  const [astuce, setAstuce] = useState<AstucePoksy | null>(null);
  // Question à poser à l'ouverture (bouton « Voir la réponse » d'une astuce)
  const [questionInitiale, setQuestionInitiale] = useState<{ texte: string; id: string } | null>(null);
  // La conversation reste en mémoire tant que la page n'est pas rechargée (jamais enregistrée).
  const [messages, setMessages] = useState<MessagePoksy[]>([{ id: 0, auteur: 'poksy', texte: MESSAGE_BIENVENUE }]);
  const [plus, setPlus] = useState(false);
  const lanceur = useRef<HTMLButtonElement>(null);
  const rendreFocus = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const typeNavigation = useNavigationType();
  const pageInitiale = useRef(location.pathname);
  const prenom = data.profile?.name.replace(/\s*\(démo\)$/, '').trim();

  // Le message de première visite n'est montré qu'une fois : il est noté comme vu après quelques secondes
  // d'affichage, ou dès qu'il est fermé, que Poksy est ouvert ou qu'on change de page.
  useEffect(() => {
    if (!bulle) return;
    const minuteur = setTimeout(noterBienvenueVue, 2500);
    return () => clearTimeout(minuteur);
  }, [bulle]);

  const masquerBulle = () => {
    noterBienvenueVue();
    setBulle(false);
  };

  // Changement de page par l'utilisateur : le message disparaît. Une redirection automatique
  // (par exemple après le chargement de la démonstration) ne compte pas comme un changement de page.
  useEffect(() => {
    setAstuce(null);
    if (location.pathname === pageInitiale.current) return;
    if (typeNavigation === 'REPLACE') {
      pageInitiale.current = location.pathname;
      return;
    }
    setBulle((visible) => {
      if (visible) noterBienvenueVue();
      return false;
    });
  }, [location.pathname, typeNavigation]);

  // Astuce de la page : une seule fois par page, une seule par visite, jamais pendant la première visite
  useEffect(() => {
    const a = ASTUCES_PAR_PAGE[location.pathname];
    if (!a || bulle || ouvert || cache || surAccueil || astuceMontreeCetteVisite) return;
    const prefs = lirePrefs();
    if (prefs.desactivees || prefs.vues.includes(location.pathname)) return;
    const minuteur = setTimeout(() => {
      astuceMontreeCetteVisite = true;
      ecrirePrefs({ ...prefs, vues: [...prefs.vues, location.pathname] });
      setAstuce(a);
    }, DELAI_ASTUCE);
    return () => clearTimeout(minuteur);
  }, [location.pathname, bulle, ouvert, cache, surAccueil]);

  // La carte s'efface d'elle-même quand on fait défiler la page (elle ne gêne jamais la lecture)
  useEffect(() => {
    if (!bulle && !astuce) return;
    const depart = window.scrollY;
    const surDefilement = () => {
      if (Math.abs(window.scrollY - depart) < 240) return;
      if (bulle) masquerBulle();
      setAstuce(null);
    };
    window.addEventListener('scroll', surDefilement, { passive: true });
    return () => window.removeEventListener('scroll', surDefilement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulle, astuce]);

  // Bouton « Poser une question à Poksy » de la page d'accueil
  useEffect(() => {
    // Une question peut accompagner la demande (ex. « Demander à Poksy » sous un calcul)
    const surDemande = (e: Event) => {
      if (bulle) masquerBulle();
      setAstuce(null);
      const q = (e as CustomEvent<{ texte: string; id: string } | null>).detail;
      setQuestionInitiale(q && q.texte && q.id ? { ...q } : null);
      setOuvert(true);
    };
    window.addEventListener('soldeclair:ouvrir-poksy', surDemande);
    return () => window.removeEventListener('soldeclair:ouvrir-poksy', surDemande);
  });

  // Retour du focus sur le bouton après la fermeture (clavier, lecteur d'écran)
  useEffect(() => {
    if (!ouvert && rendreFocus.current) {
      rendreFocus.current = false;
      lanceur.current?.focus();
    }
  }, [ouvert]);

  const ouvrir = (question?: { texte: string; id: string }) => {
    if (bulle) masquerBulle();
    setAstuce(null);
    setQuestionInitiale(question ?? null);
    setOuvert(true);
  };
  const fermer = (focusSurLeBouton = true) => {
    rendreFocus.current = focusSurLeBouton;
    setOuvert(false);
  };
  const precharger = () => {
    void chargerPanneau();
  };
  const plusDAstuces = () => {
    ecrirePrefs({ ...lirePrefs(), desactivees: true });
    setAstuce(null);
  };

  const message = prenom ? MESSAGE_PREMIERE_VISITE.replace('Bonjour,', `Bonjour ${prenom},`) : MESSAGE_PREMIERE_VISITE;

  return (
    <div className={`poksy ${cache ? 'poksy-cache' : ''} ${surAccueil ? 'poksy-accueil' : ''}`}>
      {bulle && !ouvert && (
        <aside className="poksy-carte poksy-bienvenue" aria-label="Message de Poksy" onPointerEnter={precharger}>
          <div className="poksy-bulle-tete">
            <span className="poksy-bulle-photo">
              <PoksyAvatar taille={56} />
              <Eclats />
            </span>
            <p className="poksy-bulle-identite">
              <span className="poksy-bulle-nom">Poksy</span>
              <span className="poksy-bulle-role">Ton guide SoldeClair</span>
            </p>
            <button type="button" className="poksy-bulle-fermer" aria-label="Fermer le message de Poksy" onClick={masquerBulle}>
              <Icon name="close" size={18} />
            </button>
          </div>
          <p className="poksy-bulle-texte">{message.replace(' ?', ' ?')}</p>
          <p className="poksy-bulle-detail">{DETAIL_PREMIERE_VISITE}</p>
          <div className="poksy-bulle-actions">
            <button type="button" className="btn btn-primaire btn-small" onClick={() => ouvrir()}>
              Poser une question
            </button>
            <button type="button" className="btn btn-discret btn-small" onClick={masquerBulle}>
              Plus tard
            </button>
          </div>
        </aside>
      )}
      {astuce && !ouvert && !bulle && (
        <aside className="poksy-carte poksy-astuce" aria-label="Astuce de Poksy">
          <div className="poksy-bulle-tete">
            <span className="poksy-bulle-photo">
              <PoksyAvatar taille={44} />
            </span>
            <p className="poksy-bulle-identite">
              <span className="poksy-bulle-nom">Astuce de Poksy</span>
            </p>
            <button type="button" className="poksy-bulle-fermer" aria-label="Fermer l’astuce de Poksy" onClick={() => setAstuce(null)}>
              <Icon name="close" size={18} />
            </button>
          </div>
          <p className="poksy-bulle-texte">{astuce.texte}</p>
          <div className="poksy-bulle-actions">
            <button type="button" className="btn btn-primaire btn-small" onClick={() => ouvrir({ texte: astuce.question, id: astuce.ficheId })}>
              Voir la réponse
            </button>
            <button type="button" className="lien-bouton petit" onClick={plusDAstuces}>
              Ne plus afficher les astuces
            </button>
          </div>
        </aside>
      )}
      <button
        ref={lanceur}
        type="button"
        className={`poksy-lanceur ${bulle && !ouvert ? 'poksy-lanceur-appel' : ''}`}
        aria-label={ouvert ? 'Fermer l’aide de Poksy' : 'Ouvrir l’aide de Poksy'}
        aria-expanded={ouvert}
        aria-controls={ouvert ? 'poksy-panneau' : undefined}
        title="Poksy, guide SoldeClair"
        onClick={() => (ouvert ? fermer() : ouvrir())}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && ouvert) fermer();
        }}
        onPointerEnter={precharger}
        onFocus={precharger}
      >
        <PoksyAvatar taille={56} />
        <span className="poksy-lanceur-etiquette" aria-hidden="true">
          Une question&nbsp;?
        </span>
      </button>
      {ouvert && (
        <Suspense
          fallback={
            <div id="poksy-panneau" className="poksy-panneau poksy-chargement" role="status">
              Ouverture de Poksy…
            </div>
          }
        >
          <PoksyPanneau
            messages={messages}
            setMessages={setMessages}
            plus={plus}
            setPlus={setPlus}
            questionInitiale={questionInitiale}
            onFermer={() => fermer()}
            naviguer={(route) => {
              fermer(false);
              navigate(route);
            }}
            ajouterDepense={() => {
              fermer(false);
              if (onAjouterDepense) onAjouterDepense();
              else navigate('/depenses');
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
