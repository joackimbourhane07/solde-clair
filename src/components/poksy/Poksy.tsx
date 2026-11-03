import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Icon } from '../Icon';
import { PoksyAvatar } from './PoksyAvatar';
import { CLE_POKSY, MESSAGE_BIENVENUE, MESSAGE_PREMIERE_VISITE, type MessagePoksy } from '../../lib/poksyTextes';

/** La fenêtre (questions, réponses, recherche) n'est chargée qu'à la première ouverture. */
const chargerPanneau = () => import('./PoksyPanneau');
const PoksyPanneau = lazy(chargerPanneau);

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

/**
 * Poksy, guide de SoldeClair : bouton flottant (avatar), message de première visite et fenêtre de discussion.
 * Tout fonctionne sur l'appareil ; Poksy ne modifie jamais les données (ses boutons ouvrent seulement une page ou un formulaire).
 */
export function Poksy({ onAjouterDepense, cache = false }: { onAjouterDepense: () => void; cache?: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [bulle, setBulle] = useState(() => !bienvenueDejaVue());
  // La conversation reste en mémoire tant que la page n'est pas rechargée (jamais enregistrée).
  const [messages, setMessages] = useState<MessagePoksy[]>([{ id: 0, auteur: 'poksy', texte: MESSAGE_BIENVENUE }]);
  const [plus, setPlus] = useState(false);
  const lanceur = useRef<HTMLButtonElement>(null);
  const rendreFocus = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const typeNavigation = useNavigationType();
  const pageInitiale = useRef(location.pathname);

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

  // Retour du focus sur le bouton après la fermeture (clavier, lecteur d'écran)
  useEffect(() => {
    if (!ouvert && rendreFocus.current) {
      rendreFocus.current = false;
      lanceur.current?.focus();
    }
  }, [ouvert]);

  const ouvrir = () => {
    if (bulle) masquerBulle();
    setOuvert(true);
  };
  const fermer = (focusSurLeBouton = true) => {
    rendreFocus.current = focusSurLeBouton;
    setOuvert(false);
  };
  const precharger = () => {
    void chargerPanneau();
  };

  return (
    <div className={`poksy ${cache ? 'poksy-cache' : ''}`}>
      {bulle && !ouvert && (
        <div className="poksy-bienvenue">
          <button type="button" className="poksy-bienvenue-texte" onClick={ouvrir} onPointerEnter={precharger}>
            {MESSAGE_PREMIERE_VISITE.replace(' ?', ' ?')}
          </button>
          <button type="button" className="poksy-bienvenue-fermer" aria-label="Fermer le message de Poksy" onClick={masquerBulle}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      <button
        ref={lanceur}
        type="button"
        className="poksy-lanceur"
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
        <PoksyAvatar taille={52} />
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
            onFermer={() => fermer()}
            naviguer={(route) => {
              fermer(false);
              navigate(route);
            }}
            ajouterDepense={() => {
              fermer(false);
              onAjouterDepense();
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
