import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../Icon';
import { MontantAnime } from '../mouvement';
import { mouvementReduit, useMouvementReduit } from '../../lib/mouvement';
import { formatMoney } from '../../lib/money';
import { ProfilAlternant, ProfilEtudiant, ProfilSalarie, PictoDebuter } from './Illustrations';

/* Démonstrations de la page d'accueil : montants entièrement fictifs, rien n'est enregistré. */

const eur = (c: number) => formatMoney(c, 'EUR');
const eurSigne = (c: number) => (c < 0 ? `− ${eur(-c)}` : eur(c));

/** Lance une démonstration quand elle devient visible (une seule fois). */
function useQuandVisible<T extends HTMLElement>(rappel: () => void) {
  const ref = useRef<T>(null);
  const fait = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting) && !fait.current) {
          fait.current = true;
          rappel();
          obs.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/* -------------------------------------------------------------------------- */
/* 1. Reste à vivre : les opérations arrivent, le montant se met à jour        */
/* -------------------------------------------------------------------------- */

const OPERATIONS = [
  { libelle: 'Courses', montant: -3240, icone: 'expense' },
  { libelle: 'Remboursement d’un ami', montant: 2000, icone: 'income' },
  { libelle: 'Cinéma', montant: -1100, icone: 'expense' },
] as const;

const DEPART = 42500;
const JOURS = 18;
const PAS_DEMO = 1300;

export function DemoResteAVivre() {
  const [etape, setEtape] = useState(0);
  const [lecture, setLecture] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduit = useMouvementReduit();

  const lancer = () => {
    if (mouvementReduit()) {
      setEtape(OPERATIONS.length);
      return;
    }
    setEtape(0);
    setLecture(true);
  };
  const ref = useQuandVisible<HTMLDivElement>(lancer);

  useEffect(() => {
    if (!lecture) return;
    if (etape >= OPERATIONS.length) {
      setLecture(false);
      return;
    }
    minuteur.current = setTimeout(() => setEtape((e) => e + 1), PAS_DEMO);
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [lecture, etape]);

  const fais = OPERATIONS.slice(0, etape);
  const reste = DEPART + fais.reduce((t, o) => t + o.montant, 0);
  const parJour = Math.floor(reste / JOURS);
  const fini = etape >= OPERATIONS.length;

  return (
    <div
      ref={ref}
      className="demo demo-reste"
      role="group"
      aria-label="Démonstration : le reste à vivre se met à jour à chaque opération (montants fictifs)"
    >
      <div className="demo-entete">
        <p className="demo-mois">Novembre – {JOURS} jours restants</p>
        <button
          type="button"
          className="btn btn-discret btn-small demo-controle"
          onClick={() => {
            if (lecture) setLecture(false);
            else if (fini) lancer();
            else if (reduit) setEtape(OPERATIONS.length);
            else setLecture(true);
          }}
        >
          <Icon name={lecture ? 'pause' : fini ? 'history' : 'play'} size={16} />
          {lecture ? 'Pause' : fini ? 'Rejouer' : etape === 0 ? 'Lancer' : 'Reprendre'}
        </button>
      </div>
      <p className="demo-phrase">
        Il te reste{' '}
        <strong className="demo-valeur">
          <MontantAnime cents={reste} format={eur} brut />
        </strong>{' '}
        pour terminer le mois, soit environ{' '}
        <strong className="demo-valeur">
          <MontantAnime cents={parJour} format={eur} brut />
        </strong>{' '}
        par jour.
      </p>
      <div className="demo-barre" aria-hidden="true">
        <span style={{ width: `${Math.round((reste / 60000) * 100)}%` }} />
      </div>
      <ul className="demo-operations">
        {fais
          .slice()
          .reverse()
          .map((o) => (
            <li key={o.libelle} className="demo-operation">
              <span className={`demo-pastille ${o.montant < 0 ? 'sortie' : 'entree'}`} aria-hidden="true">
                <Icon name={o.icone} size={16} />
              </span>
              <span className="demo-libelle">{o.libelle}</span>
              <span className={o.montant < 0 ? 'montant-moins' : 'montant-plus'}>
                {o.montant < 0 ? '−' : '+'} {eur(Math.abs(o.montant))}
              </span>
            </li>
          ))}
        {fais.length === 0 && <li className="demo-operation demo-attente">Les opérations du jour apparaissent ici.</li>}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Simulateur : un curseur, l'effet immédiat sur le mois                    */
/* -------------------------------------------------------------------------- */

const SOLDE_SIMU = 42500;
const EPARGNE_PREVUE = 12000;

export function DemoSimulateur() {
  const [prix, setPrix] = useState(45);
  const id = useId();
  const apres = SOLDE_SIMU - prix * 100;
  const verdict =
    apres < 0
      ? { ton: 'danger', icone: 'stop', texte: 'Achat susceptible de déséquilibrer le budget' }
      : apres < EPARGNE_PREVUE || prix * 100 > SOLDE_SIMU / 2
        ? { ton: 'attention', icone: 'alert', texte: 'Achat possible avec prudence' }
        : { ton: 'ok', icone: 'check', texte: 'Situation confortable' };
  return (
    <div className="demo demo-simu" role="group" aria-labelledby={`${id}-titre`}>
      <p id={`${id}-titre`} className="demo-mois">
        Essaie : un achat de <strong>{eur(prix * 100)}</strong>
      </p>
      <label htmlFor={`${id}-prix`} className="sr-only">
        Prix de l’achat en euros
      </label>
      <input
        id={`${id}-prix`}
        className="demo-curseur"
        type="range"
        min={0}
        max={500}
        step={5}
        value={prix}
        aria-valuetext={`${prix} euros`}
        onChange={(e) => setPrix(Number(e.target.value))}
      />
      <div className="demo-simu-chiffres">
        <p>
          <span className="demo-petit">Solde avant</span>
          <strong>{eur(SOLDE_SIMU)}</strong>
        </p>
        <Icon name="right" size={18} />
        <p>
          <span className="demo-petit">Solde après</span>
          <strong className={apres < 0 ? 'montant-moins' : 'montant-plus'}>{eurSigne(apres)}</strong>
        </p>
      </div>
      <p className={`demo-verdict demo-verdict-${verdict.ton}`} aria-live="polite">
        <Icon name={verdict.icone} size={18} />
        {verdict.texte}
      </p>
      <p className="demo-petit">Montants fictifs. Dans SoldeClair, le calcul part de ton vrai solde et de tes objectifs.</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Galerie horizontale d'écrans (aucun défilement automatique)              */
/* -------------------------------------------------------------------------- */

export function GalerieEcrans({ ecrans }: { ecrans: { src: string; titre: string; alt: string }[] }) {
  const piste = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  // Les captures ne sont téléchargées qu'à l'approche de la galerie (premier affichage plus rapide)
  const [charger, setCharger] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = piste.current;
    if (!el || charger) return;
    const obs = new IntersectionObserver(
      (e) => {
        if (e.some((x) => x.isIntersecting)) {
          setCharger(true);
          obs.disconnect();
        }
      },
      { rootMargin: '400px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [charger]);
  const defiler = (sens: 1 | -1) => {
    const el = piste.current;
    if (!el) return;
    const largeur = (el.querySelector('li') as HTMLElement | null)?.offsetWidth ?? 280;
    el.scrollBy({ left: sens * (largeur + 16), behavior: mouvementReduit() ? 'auto' : 'smooth' });
  };
  return (
    <div className="galerie">
      <div
        ref={piste}
        className="galerie-piste"
        tabIndex={0}
        role="region"
        aria-label="Écrans de SoldeClair (faire défiler horizontalement)"
        onScroll={(e) => {
          const el = e.currentTarget;
          setPosition(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth));
        }}
      >
        <ul className="galerie-liste">
          {ecrans.map((e) => (
            <li key={e.titre} className="galerie-carte">
              <div className="appareil-tel galerie-tel">
                {charger ? (
                  <img src={e.src} alt={e.alt} width={600} height={1200} loading="lazy" decoding="async" />
                ) : (
                  <div className="galerie-attente" role="img" aria-label={e.alt} />
                )}
              </div>
              <p className="galerie-titre">{e.titre}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="galerie-controles">
        <button
          type="button"
          className="btn btn-secondaire btn-icon"
          aria-label="Écran précédent"
          onClick={() => defiler(-1)}
          disabled={position <= 0.01}
        >
          <Icon name="left" size={20} />
        </button>
        <div className="galerie-progression" aria-hidden="true">
          <span style={{ width: `${Math.max(12, position * 100)}%` }} />
        </div>
        <button
          type="button"
          className="btn btn-secondaire btn-icon"
          aria-label="Écran suivant"
          onClick={() => defiler(1)}
          disabled={position >= 0.99}
        >
          <Icon name="right" size={20} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Profils en onglets : ce que SoldeClair met en avant pour chacun          */
/* -------------------------------------------------------------------------- */

const PROFILS: { id: string; nom: string; illustration: ReactNode; phrase: string; points: string[] }[] = [
  {
    id: 'etudiant',
    nom: 'Étudiant(e)',
    illustration: <ProfilEtudiant />,
    phrase: 'Bourse, aide au logement, petits jobs : chaque euro compte, jour après jour.',
    points: ['Le reste à dépenser par jour, en grand', 'Un repère pour l’été, quand la bourse s’arrête', 'Le Livret Jeune proposé avant 26 ans'],
  },
  {
    id: 'alternant',
    nom: 'Alternant(e)',
    illustration: <ProfilAlternant />,
    phrase: 'Salaire d’apprenti, contrat qui se termine, premier logement : un budget qui suit ton rythme.',
    points: [
      'Le compte à rebours jusqu’à la fin du contrat',
      'Le 13e mois et les primes, comptés seulement une fois reçus',
      'La prochaine hausse du salaire selon l’âge et l’année',
    ],
  },
  {
    id: 'salarie',
    nom: 'Salarié(e)',
    illustration: <ProfilSalarie />,
    phrase: 'Salaire, loyer ou crédit, épargne de précaution : une vue claire de chaque mois.',
    points: [
      'Les primes et le 13e mois en revenus attendus',
      'L’épargne totale et l’épargne disponible séparées',
      'Les grosses dépenses de l’année anticipées',
    ],
  },
  {
    id: 'independant',
    nom: 'Indépendant(e)',
    illustration: <PictoDebuter />,
    phrase: 'Revenus irréguliers, cotisations à prévoir : SoldeClair t’aide à lisser l’année.',
    points: [
      'Ta réserve de précaution, en mois de charges',
      'Les factures en attente, à part tant qu’elles ne sont pas payées',
      'Un rappel pour les cotisations',
    ],
  },
];

export function ProfilsInteractifs() {
  const [actif, setActif] = useState(0);
  const onglets = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const clavier = (e: KeyboardEvent) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -99 : e.key === 'End' ? 99 : 0;
    if (!dir) return;
    e.preventDefault();
    const n = dir === -99 ? 0 : dir === 99 ? PROFILS.length - 1 : (actif + dir + PROFILS.length) % PROFILS.length;
    setActif(n);
    onglets.current[n]?.focus();
  };
  const p = PROFILS[actif];
  return (
    <div className="profils-interactifs">
      <div className="profils-onglets" role="tablist" aria-label="Choisis une situation" onKeyDown={clavier}>
        {PROFILS.map((pr, i) => (
          <button
            key={pr.id}
            ref={(el) => {
              onglets.current[i] = el;
            }}
            id={`${id}-onglet-${pr.id}`}
            type="button"
            role="tab"
            aria-selected={i === actif}
            aria-controls={`${id}-panneau`}
            tabIndex={i === actif ? 0 : -1}
            className={`chip ${i === actif ? 'chip-on' : ''}`}
            onClick={() => setActif(i)}
          >
            {pr.nom}
          </button>
        ))}
      </div>
      <div id={`${id}-panneau`} role="tabpanel" aria-labelledby={`${id}-onglet-${p.id}`} className="profils-panneau" key={p.id}>
        <div className="profils-illustration" aria-hidden="true">
          {p.illustration}
        </div>
        <div>
          <p className="profils-phrase">{p.phrase}</p>
          <p className="profils-sous-titre">Ce que SoldeClair met en avant pour toi :</p>
          <ul className="accueil-liste">
            {p.points.map((pt) => (
              <li key={pt}>
                <Icon name="check" size={18} /> {pt}
              </li>
            ))}
          </ul>
          <p className="demo-petit">Rien n’est interdit : chaque fonction reste disponible, quel que soit le profil.</p>
        </div>
      </div>
    </div>
  );
}
