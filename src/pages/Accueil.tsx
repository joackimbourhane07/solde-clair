import { Poksy } from '../components/poksy/Poksy';
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { Icon } from '../components/Icon';
import {
  IllustrationBalance,
  IllustrationBocal,
  IllustrationConfidentialite,
  IllustrationPrincipale,
  PetitCadenas,
  PetitCalendrier,
  PetitesPieces,
  PetitTicket,
  PictoApercu,
  PictoDebuter,
  PictoSansBanque,
} from '../components/accueil/Illustrations';
// Vraies captures de SoldeClair (profil de démonstration « Léa, étudiante » : données fictives)
import captureOrdinateur from '../assets/accueil/ordi-tableau.webp';
import captureTableau from '../assets/accueil/tel-tableau.webp';
import captureAjout from '../assets/accueil/tel-ajout.webp';
import captureAVenir from '../assets/accueil/tel-avenir.webp';
import captureObjectifs from '../assets/accueil/tel-objectifs.webp';
import captureSimulateur from '../assets/accueil/tel-simulateur.webp';
import { DemoResteAVivre, DemoSimulateur, GalerieEcrans, ProfilsInteractifs } from '../components/accueil/Demos';
import { PoksyPortrait } from '../components/poksy/PoksyAvatar';
import { useApparitions, useParallaxe } from '../components/mouvement';
import '../styles/accueil.css';

/** Écrans de la galerie (captures du profil de démonstration, données fictives). */
const ECRANS = [
  {
    src: captureTableau,
    titre: 'Ce qu’il te reste',
    alt: 'Tableau de bord sur téléphone : il te reste 148 € pour terminer le mois, soit environ 7 € par jour, avec le choix par jour ou par semaine.',
  },
  {
    src: captureAjout,
    titre: 'Ajouter une dépense',
    alt: 'Ajout d’une dépense : montant avec ajout rapide de 5, 10, 20 ou 50 €, catégories fréquentes en un geste, description et date.',
  },
  {
    src: captureAVenir,
    titre: 'Ce qui arrive',
    alt: 'Mon compte, onglet À venir : prélèvements et revenus des 30 prochains jours avec leurs dates et le solde prévu.',
  },
  { src: captureObjectifs, titre: 'Tes objectifs', alt: 'Objectifs d’épargne : 465 € épargnés au total, objectif Ordinateur atteint à 34 %.' },
  {
    src: captureSimulateur,
    titre: 'Simuler un achat',
    alt: 'Simulateur : achat de 25 €, situation confortable, solde de 148,57 € avant et 123,57 € après.',
  },
];

/** Capture dans un cadre de téléphone. */
function Telephone({ src, alt, className = '', eager = false }: { src: string; alt: string; className?: string; eager?: boolean }) {
  return (
    <div className={`appareil-tel ${className}`}>
      <img src={src} alt={alt} width={600} height={1200} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </div>
  );
}

function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="currentColor" />
        <path
          d="M18 40c3 4 8 6 14 6 8 0 13-4 13-10 0-12-25-7-25-17 0-4 4-7 11-7 5 0 9 2 11 5"
          fill="none"
          stroke="var(--logo-ink)"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
      <span className="logo-text">SoldeClair</span>
    </span>
  );
}

/** Fait défiler jusqu'à une section et y place le focus (clavier et lecteurs d'écran). */
function allerA(id: string) {
  const cible = document.getElementById(id);
  if (!cible) return;
  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  cible.scrollIntoView?.({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
  const titre = cible.querySelector<HTMLElement>('h2');
  titre?.focus({ preventScroll: true });
}

const LIENS: [string, string][] = [
  ['fonctionnalites', 'Fonctionnalités'],
  ['profils', 'Pour qui ?'],
  ['confidentialite', 'Confidentialité'],
];

/** Choix du profil : continuer avec le sien, ouvrir un autre profil ou en créer un nouveau. */
function ChoixProfils({ centre = true }: { centre?: boolean }) {
  const { data, profils, profilActif, changerProfil, nouveauProfil } = useApp();
  const navigate = useNavigate();
  const actif = data.profile ? { id: profilActif, nom: data.profile.name } : null;
  const autres = profils.filter((p) => p.id !== profilActif);
  const principal = actif ?? autres[0] ?? null;
  const secondaires = autres.filter((p) => p.id !== principal?.id);
  const ouvrir = (id: string) => {
    changerProfil(id);
    navigate('/');
  };
  const creer = () => {
    nouveauProfil();
    navigate('/bienvenue');
  };
  if (!principal) return null;
  return (
    <div className={`accueil-choix ${centre ? 'centre' : ''}`}>
      <div className="accueil-actions">
        <button type="button" className="btn btn-primaire btn-grand" onClick={() => ouvrir(principal.id)}>
          Continuer avec {principal.nom}
        </button>
        <button type="button" className="btn btn-secondaire btn-grand" onClick={creer}>
          Créer un nouveau profil
        </button>
      </div>
      {secondaires.length > 0 && (
        <div className="accueil-autres-profils" role="group" aria-label="Autres profils">
          <span>Autres profils :</span>
          {secondaires.map((p) => (
            <button key={p.id} type="button" className="chip chip-petit" onClick={() => ouvrir(p.id)}>
              {p.nom}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Accueil() {
  const { data, profils, nouveauProfil } = useApp();
  const navigate = useNavigate();
  const aDesDonnees = data.profile !== null;
  // Des profils existent sur cet appareil : on propose de continuer ou d'en créer un.
  const aDesProfils = aDesDonnees || profils.length > 0;
  const titreRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = 'SoldeClair';
    window.scrollTo(0, 0);
  }, []);
  // Sections qui apparaissent au défilement et légère profondeur des objets décoratifs
  useApparitions('.accueil-section, .accueil-cta');
  useParallaxe();

  const commencer = () => navigate(aDesDonnees ? '/' : '/bienvenue');
  const libelleCommencer = aDesDonnees ? 'Accéder à mon tableau de bord' : 'Commencer';
  const essayerDemo = () => navigate('/bienvenue', { state: { demo: true } });
  const creerProfil = () => {
    nouveauProfil();
    navigate('/bienvenue');
  };

  return (
    <div className="accueil">
      <a
        className="skip-link"
        href="#contenu"
        onClick={(e) => {
          e.preventDefault();
          titreRef.current?.focus();
        }}
      >
        Aller au contenu
      </a>

      {/* 1. Barre de navigation */}
      <header className="accueil-nav">
        <div className="accueil-conteneur accueil-nav-interieur">
          <Link to="/presentation" className="accueil-logo" aria-label="SoldeClair, présentation" onClick={() => window.scrollTo(0, 0)}>
            <Logo />
          </Link>
          <nav aria-label="Sections de la présentation" className="accueil-nav-liens">
            {LIENS.map(([id, libelle]) => (
              <button key={id} type="button" className="accueil-nav-lien" onClick={() => allerA(id)}>
                {libelle}
              </button>
            ))}
          </nav>
          <button type="button" className="btn btn-primaire accueil-nav-action" onClick={commencer}>
            {aDesDonnees ? 'Mon tableau de bord' : 'Commencer'}
          </button>
        </div>
      </header>

      <main id="contenu">
        {/* 2. Introduction */}
        <section className="accueil-intro accueil-conteneur" aria-labelledby="accueil-titre">
          <p className="accueil-surtitre">Budget personnel, gratuit et sans banque</p>
          <h1 id="accueil-titre" ref={titreRef} tabIndex={-1}>
            Ton budget devient enfin clair.
          </h1>
          <p className="accueil-chapeau">Ce qu’il te reste vraiment jusqu’à la fin du mois. Sans connecter ta banque.</p>
          {aDesProfils ? (
            <ChoixProfils />
          ) : (
            <div className="accueil-actions">
              <button type="button" className="btn btn-primaire btn-grand" onClick={commencer}>
                {libelleCommencer}
              </button>
              <button type="button" className="btn btn-secondaire btn-grand" onClick={() => allerA('fonctionnalites')}>
                Découvrir SoldeClair
              </button>
            </div>
          )}
          <p className="accueil-garanties">
            <span>
              <Icon name="check" size={16} /> Gratuit
            </span>
            <span>
              <Icon name="check" size={16} /> Sans compte
            </span>
            <span>
              <Icon name="check" size={16} /> Données sur ton appareil
            </span>
          </p>
        </section>

        {/* 3. Vitrine : SoldeClair sur ordinateur et sur téléphone, entouré d'objets du quotidien */}
        <div className="accueil-conteneur accueil-illustration">
          <div className="vitrine">
            <div className="vitrine-fond" aria-hidden="true" />
            <div className="appareil-ordi">
              <div className="ecran">
                <img
                  src={captureOrdinateur}
                  alt="Tableau de bord de SoldeClair sur ordinateur : il te reste 148 € pour terminer le mois, soit environ 7 € par jour ; menu avec Mon plan d’épargne, objectif et repères pour toi."
                  width={1440}
                  height={900}
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
              <div className="socle" aria-hidden="true" />
            </div>
            <Telephone
              src={captureTableau}
              eager
              className="vitrine-tel"
              alt="Le même tableau de bord sur téléphone, avec le bouton « + » pour ajouter une dépense au pouce."
            />
            <div className="vitrine-objet objet-calendrier" data-parallaxe="0.12">
              <PetitCalendrier />
            </div>
            <div className="vitrine-objet objet-pieces" data-parallaxe="-0.1">
              <PetitesPieces />
            </div>
            <div className="vitrine-objet objet-cadenas" data-parallaxe="0.08">
              <PetitCadenas />
            </div>
          </div>
        </div>

        {/* 4. Avantages */}
        <section id="fonctionnalites" className="accueil-section accueil-conteneur" aria-labelledby="titre-avantages">
          <h2 id="titre-avantages" tabIndex={-1} className="accueil-h2 centre">
            L’essentiel, sans complication.
          </h2>
          <p className="accueil-texte centre">Trois idées simples guident SoldeClair.</p>
          <ul className="accueil-avantages">
            <li className="accueil-carte">
              <PictoApercu />
              <h3>Ce qu’il te reste, en un coup d’œil</h3>
              <p>Une phrase répond à la vraie question du mois : combien puis-je encore dépenser, aujourd’hui et jusqu’à la fin du mois ?</p>
            </li>
            <li className="accueil-carte">
              <PictoSansBanque />
              <h3>Sans banque, sans compte</h3>
              <p>Tu saisis toi-même tes montants. Aucune connexion bancaire, aucune inscription, aucun mot de passe.</p>
            </li>
            <li className="accueil-carte">
              <PictoDebuter />
              <h3>Pensé pour débuter</h3>
              <p>Des mots simples, des calculs toujours expliqués et des conseils qui accompagnent sans juger.</p>
            </li>
          </ul>
        </section>

        {/* 4 bis. Visite en images : défilement horizontal, sans lecture automatique */}
        <section className="accueil-section accueil-conteneur" aria-labelledby="titre-galerie">
          <h2 id="titre-galerie" tabIndex={-1} className="accueil-h2 centre">
            Fais le tour en cinq écrans.
          </h2>
          <p className="accueil-texte centre">Glisse, ou utilise les flèches. Les données affichées sont fictives.</p>
          <GalerieEcrans ecrans={ECRANS} />
        </section>

        {/* 5. Reste à vivre */}
        <section className="accueil-section accueil-conteneur accueil-alterne" aria-labelledby="titre-reste">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Reste à vivre</p>
            <h2 id="titre-reste" tabIndex={-1} className="accueil-h2">
              Sache ce qu’il te reste, vraiment.
            </h2>
            <p className="accueil-texte">Revenus moins charges, dépenses et épargne. Le reste, réparti jour par jour.</p>
            <ul className="accueil-liste">
              <li>
                <Icon name="check" size={18} /> Un montant pour le mois et un montant par jour
              </li>
              <li>
                <Icon name="check" size={18} /> Le calcul détaillé, ligne par ligne
              </li>
              <li>
                <Icon name="check" size={18} /> Une alerte douce si le rythme est trop rapide
              </li>
            </ul>
          </div>
          <div className="accueil-colonne-visuel visuel-avec-objet">
            <div className="objet-coin objet-coin-haut" aria-hidden="true">
              <PetitCalendrier />
            </div>
            <DemoResteAVivre />
          </div>
        </section>

        {/* 6. Dépenses et charges à venir */}
        <section className="accueil-section accueil-conteneur accueil-alterne inverse" aria-labelledby="titre-avenir">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Dépenses et charges</p>
            <h2 id="titre-avenir" tabIndex={-1} className="accueil-h2">
              Anticipe ce qui arrive.
            </h2>
            <p className="accueil-texte">Une dépense en trois gestes. Les prélèvements à venir, avant qu’ils tombent.</p>
            <ol className="accueil-etapes">
              <li>
                <span>1</span> Le montant
              </li>
              <li>
                <span>2</span> La catégorie
              </li>
              <li>
                <span>3</span> Ajouter
              </li>
            </ol>
          </div>
          <div className="accueil-colonne-visuel visuel-tel duo-tel">
            <Telephone
              src={captureAjout}
              className="tel-arriere"
              alt="Ajout d’une dépense : montant avec ajout rapide de 5, 10, 20 ou 50 €, catégories fréquentes en un geste, description et date."
            />
            <Telephone
              src={captureAVenir}
              className="tel-avant"
              alt="Mon compte, onglet À venir : prélèvements et revenus des 30 prochains jours avec leurs dates et le solde prévu."
            />
            <div className="objet-coin objet-coin-bas" aria-hidden="true">
              <PetitTicket />
            </div>
          </div>
        </section>

        {/* 7. Objectifs d'épargne */}
        <section className="accueil-section accueil-conteneur accueil-alterne" aria-labelledby="titre-epargne">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Objectifs d’épargne</p>
            <h2 id="titre-epargne" tabIndex={-1} className="accueil-h2">
              Avance vers tes projets, pas à pas.
            </h2>
            <p className="accueil-texte">Un montant, une date. SoldeClair te donne la prochaine étape.</p>
            <ul className="accueil-liste">
              <li>
                <Icon name="check" size={18} /> La progression en un coup d’œil
              </li>
              <li>
                <Icon name="check" size={18} /> Le montant à mettre de côté chaque mois
              </li>
              <li>
                <Icon name="check" size={18} /> Une date d’arrivée estimée
              </li>
            </ul>
          </div>
          <div className="accueil-colonne-visuel visuel-tel">
            <Telephone src={captureObjectifs} alt="Objectifs d’épargne : 465 € épargnés au total, objectif Ordinateur atteint à 34 %." />
            <div className="objet-coin objet-coin-bas grand" aria-hidden="true">
              <IllustrationBocal />
            </div>
          </div>
        </section>

        {/* 8. Simulateur d'achat */}
        <section className="accueil-section accueil-conteneur accueil-alterne inverse" aria-labelledby="titre-simulateur">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Simulateur d’achat</p>
            <h2 id="titre-simulateur" tabIndex={-1} className="accueil-h2">
              Avant d’acheter, simule.
            </h2>
            <p className="accueil-texte">Indique un prix : tu vois l’effet sur ton mois et tes objectifs. Rien n’est enregistré.</p>
            <ul className="accueil-liste">
              <li>
                <Icon name="check" size={18} /> Le solde restant après l’achat
              </li>
              <li>
                <Icon name="check" size={18} /> L’effet sur ton épargne et tes limites
              </li>
              <li>
                <Icon name="check" size={18} /> Une appréciation claire, sans jugement
              </li>
            </ul>
          </div>
          <div className="accueil-colonne-visuel visuel-tel">
            <DemoSimulateur />
            <div className="objet-coin objet-coin-bas grand" aria-hidden="true" data-parallaxe="0.08">
              <IllustrationBalance />
            </div>
          </div>
        </section>

        {/* 9. Profils */}
        <section id="profils" className="accueil-section accueil-conteneur" aria-labelledby="titre-profils">
          <h2 id="titre-profils" tabIndex={-1} className="accueil-h2 centre">
            Adapté à ta situation.
          </h2>
          <p className="accueil-texte centre">SoldeClair met en avant ce qui compte pour ta situation. Choisis un profil pour voir la différence.</p>
          <ProfilsInteractifs />
        </section>

        {/* 10. Confidentialité */}
        <section id="confidentialite" className="accueil-section accueil-conteneur accueil-alterne" aria-labelledby="titre-confidentialite">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Confidentialité</p>
            <h2 id="titre-confidentialite" tabIndex={-1} className="accueil-h2">
              Tes données restent sur ton appareil.
            </h2>
            <p className="accueil-texte">Tout reste dans ton navigateur. Rien n’est envoyé. Personne ne voit tes montants.</p>
            <ul className="accueil-liste">
              <li>
                <Icon name="check" size={18} /> Aucun compte à créer
              </li>
              <li>
                <Icon name="check" size={18} /> Aucune connexion bancaire
              </li>
              <li>
                <Icon name="check" size={18} /> Aucune publicité, aucun suivi
              </li>
              <li>
                <Icon name="check" size={18} /> Sauvegarde et export en un clic
              </li>
            </ul>
          </div>
          <div className="accueil-colonne-visuel centre">
            <IllustrationConfidentialite />
          </div>
        </section>

        {/* 10 bis. Poksy, le guide */}
        <section id="poksy" className="accueil-section accueil-conteneur accueil-alterne inverse" aria-labelledby="titre-poksy">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Ton guide</p>
            <h2 id="titre-poksy" tabIndex={-1} className="accueil-h2">
              Poksy répond à tes questions.
            </h2>
            <p className="accueil-texte">Poksy, c’est un vrai chat. Il explique tes chiffres simplement, sans jamais insister.</p>
            <ul className="accueil-liste">
              <li>
                <Icon name="check" size={18} /> Des réponses immédiates, préparées à l’avance
              </li>
              <li>
                <Icon name="check" size={18} /> Tout se passe sur ton appareil, sans intelligence artificielle en ligne
              </li>
              <li>
                <Icon name="check" size={18} /> Des astuces discrètes, que tu peux couper d’un geste
              </li>
            </ul>
            <button
              type="button"
              className="btn btn-primaire accueil-bouton-poksy"
              onClick={() => window.dispatchEvent(new Event('soldeclair:ouvrir-poksy'))}
            >
              Poser une question à Poksy
            </button>
          </div>
          <div className="accueil-colonne-visuel centre">
            <div className="poksy-scene">
              <div className="poksy-scene-fond" aria-hidden="true" data-parallaxe="-0.05" />
              <PoksyPortrait className="poksy-scene-photo" />
            </div>
          </div>
        </section>

        {/* 11. Appel à l'action */}
        <section className="accueil-conteneur" aria-labelledby="titre-cta">
          <div className="accueil-cta">
            <div className="accueil-cta-illustration" aria-hidden="true">
              <IllustrationPrincipale />
            </div>
            <h2 id="titre-cta" tabIndex={-1} className="accueil-h2">
              Commencer avec SoldeClair
            </h2>
            <p className="accueil-texte">Deux minutes suffisent pour préparer ton budget. Gratuit, sans compte et sans banque.</p>
            {aDesProfils ? (
              <ChoixProfils />
            ) : (
              <div className="accueil-actions">
                <button type="button" className="btn btn-primaire btn-grand" onClick={commencer}>
                  {libelleCommencer}
                </button>
                <button type="button" className="btn btn-secondaire btn-grand" onClick={essayerDemo}>
                  Essayer avec un profil de démonstration
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* 12. Pied de page */}
      <footer className="accueil-pied">
        <div className="accueil-conteneur accueil-pied-grille">
          <div className="accueil-pied-marque">
            <Logo />
            <p>Le budget personnel, simplement. Pour savoir chaque jour ce qu’il te reste.</p>
          </div>
          <nav aria-label="Découvrir">
            <p className="accueil-pied-titre">Découvrir</p>
            <ul>
              {LIENS.map(([id, libelle]) => (
                <li key={id}>
                  <button type="button" className="accueil-pied-lien" onClick={() => allerA(id)}>
                    {libelle}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Commencer">
            <p className="accueil-pied-titre">Commencer</p>
            <ul>
              <li>
                <button type="button" className="accueil-pied-lien" onClick={commencer}>
                  {aDesDonnees ? 'Mon tableau de bord' : 'Créer mon budget'}
                </button>
              </li>
              {aDesProfils && (
                <li>
                  <button type="button" className="accueil-pied-lien" onClick={creerProfil}>
                    Créer un nouveau profil
                  </button>
                </li>
              )}
              {!aDesDonnees && (
                <>
                  <li>
                    <button type="button" className="accueil-pied-lien" onClick={essayerDemo}>
                      Essayer la démonstration
                    </button>
                  </li>
                  <li>
                    <button type="button" className="accueil-pied-lien" onClick={essayerDemo}>
                      Importer une sauvegarde
                    </button>
                  </li>
                </>
              )}
            </ul>
          </nav>
          <div>
            <p className="accueil-pied-titre">Confidentialité</p>
            <ul>
              <li>Sans compte, sans banque</li>
              <li>Données dans ton navigateur</li>
              <li>Aucune publicité ni suivi</li>
            </ul>
          </div>
          <div>
            <p className="accueil-pied-titre">Projet</p>
            <ul>
              <li>Version de test</li>
              <li>
                <a className="accueil-pied-lien" href="https://github.com/joackimbourhane07/solde-clair" target="_blank" rel="noreferrer">
                  Code source (GitHub)
                </a>
              </li>
              <li>Gratuit, sans publicité</li>
            </ul>
          </div>
        </div>
        <p className="accueil-conteneur accueil-pied-bas">
          <Icon name="lock" size={14} /> Version de test : tes données restent dans ce navigateur, sur cet appareil. SoldeClair donne des repères
          budgétaires, pas des conseils financiers.
        </p>
      </footer>
      {/* Poksy aussi sur la page d'accueil : questions sur SoldeClair, même sans profil */}
      <Poksy surAccueil />
    </div>
  );
}
