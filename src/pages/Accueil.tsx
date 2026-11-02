import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { Icon } from '../components/Icon';
import {
  IllustrationBalance,
  IllustrationBocal,
  IllustrationConfidentialite,
  IllustrationPrincipale,
  PictoApercu,
  PictoDebuter,
  PictoSansBanque,
  ProfilAlternant,
  ProfilEtudiant,
  ProfilSalarie,
} from '../components/accueil/Illustrations';
import '../styles/accueil.css';

/** Montants fictifs des maquettes (aucune donnée réelle). */
const N = ' ';

function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="currentColor" />
        <path d="M18 40c3 4 8 6 14 6 8 0 13-4 13-10 0-12-25-7-25-17 0-4 4-7 11-7 5 0 9 2 11 5" fill="none" stroke="var(--logo-ink)" strokeWidth="6" strokeLinecap="round" />
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

export default function Accueil() {
  const { data } = useApp();
  const navigate = useNavigate();
  const aDesDonnees = data.profile !== null;
  const titreRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = 'SoldeClair';
    window.scrollTo(0, 0);
  }, []);

  const commencer = () => navigate(aDesDonnees ? '/' : '/bienvenue');
  const libelleCommencer = aDesDonnees ? 'Accéder à mon tableau de bord' : 'Commencer';
  const essayerDemo = () => navigate('/bienvenue', { state: { demo: true } });

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
          <p className="accueil-surtitre">Budget personnel · gratuit · sans banque</p>
          <h1 id="accueil-titre" ref={titreRef} tabIndex={-1}>
            Votre budget devient enfin clair.
          </h1>
          <p className="accueil-chapeau">
            Découvrez ce qu’il vous reste réellement pour terminer le mois, suivez vos dépenses et avancez vers vos objectifs sans connecter votre banque.
          </p>
          <div className="accueil-actions">
            <button type="button" className="btn btn-primaire btn-grand" onClick={commencer}>
              {libelleCommencer}
            </button>
            <button type="button" className="btn btn-secondaire btn-grand" onClick={() => allerA('fonctionnalites')}>
              Découvrir SoldeClair
            </button>
          </div>
          <p className="accueil-garanties">
            <span>
              <Icon name="check" size={16} /> Gratuit
            </span>
            <span>
              <Icon name="check" size={16} /> Sans compte
            </span>
            <span>
              <Icon name="check" size={16} /> Données sur votre appareil
            </span>
          </p>
        </section>

        {/* 3. Illustration principale */}
        <div className="accueil-conteneur accueil-illustration">
          <IllustrationPrincipale />
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
              <h3>Ce qu’il vous reste, en un coup d’œil</h3>
              <p>Une phrase répond à la vraie question du mois : combien puis-je encore dépenser, aujourd’hui et jusqu’à la fin du mois ?</p>
            </li>
            <li className="accueil-carte">
              <PictoSansBanque />
              <h3>Sans banque, sans compte</h3>
              <p>Vous saisissez vous-même vos montants. Aucune connexion bancaire, aucune inscription, aucun mot de passe.</p>
            </li>
            <li className="accueil-carte">
              <PictoDebuter />
              <h3>Pensé pour débuter</h3>
              <p>Des mots simples, des calculs toujours expliqués et des conseils qui accompagnent sans juger.</p>
            </li>
          </ul>
        </section>

        {/* 5. Reste à vivre */}
        <section className="accueil-section accueil-conteneur accueil-alterne" aria-labelledby="titre-reste">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Reste à vivre</p>
            <h2 id="titre-reste" tabIndex={-1} className="accueil-h2">
              Sachez ce qu’il vous reste, vraiment.
            </h2>
            <p className="accueil-texte">
              SoldeClair retire de vos revenus vos charges fixes, vos dépenses et votre épargne du mois, puis répartit le reste sur les jours qui restent.
            </p>
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
          <div className="accueil-colonne-visuel">
            <div className="maquette" aria-hidden="true">
              <p className="maquette-mois">Novembre</p>
              <p className="maquette-phrase">
                Il vous reste <strong>425{N}€</strong> pour terminer le mois, soit environ <strong>14{N}€</strong> par jour.
              </p>
              <p className="maquette-meta">30 jours restants · 62{N}% des revenus déjà dépensés</p>
              <div className="maquette-barre">
                <span style={{ width: '62%' }} />
              </div>
              <div className="maquette-calcul">
                <span>Revenus</span>
                <span>1{N}450,00{N}€</span>
                <span>Charges fixes</span>
                <span>− 690,00{N}€</span>
                <span>Dépenses</span>
                <span>− 215,00{N}€</span>
                <span>Épargne</span>
                <span>− 120,00{N}€</span>
                <span className="fort">Disponible</span>
                <span className="fort">425,00{N}€</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Dépenses et charges à venir */}
        <section className="accueil-section accueil-conteneur accueil-alterne inverse" aria-labelledby="titre-avenir">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Dépenses et charges</p>
            <h2 id="titre-avenir" tabIndex={-1} className="accueil-h2">
              Anticipez ce qui arrive.
            </h2>
            <p className="accueil-texte">
              Notez une dépense en trois gestes et voyez les prélèvements des prochains jours avant qu’ils ne tombent : loyer, forfait, abonnements…
            </p>
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
          <div className="accueil-colonne-visuel">
            <div className="maquette" aria-hidden="true">
              <p className="maquette-titre">À venir</p>
              <p className="maquette-meta">Dans les 7 prochains jours : 3 charges prévues pour un total de 145,00{N}€.</p>
              <ul className="maquette-liste">
                <li>
                  <span className="pastille bleu" />
                  <span>
                    Forfait mobile
                    <small>Demain</small>
                  </span>
                  <span>9,99{N}€</span>
                </li>
                <li>
                  <span className="pastille orange" />
                  <span>
                    Abonnement musique
                    <small>Dans 3 jours</small>
                  </span>
                  <span>10,99{N}€</span>
                </li>
                <li>
                  <span className="pastille vert" />
                  <span>
                    Assurance habitation
                    <small>Dans 6 jours</small>
                  </span>
                  <span>124,02{N}€</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 7. Objectifs d'épargne */}
        <section className="accueil-section accueil-conteneur accueil-alterne" aria-labelledby="titre-epargne">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Objectifs d’épargne</p>
            <h2 id="titre-epargne" tabIndex={-1} className="accueil-h2">
              Avancez vers vos projets, pas à pas.
            </h2>
            <p className="accueil-texte">
              Un ordinateur, un voyage, un fonds d’urgence : fixez un montant et une date, SoldeClair vous indique la prochaine petite étape.
            </p>
            <div className="maquette maquette-compacte" aria-hidden="true">
              <p className="maquette-titre">Ordinateur portable</p>
              <p className="maquette-phrase-petite">
                <strong>480,00{N}€</strong> sur 800,00{N}€
              </p>
              <div className="maquette-barre bleue">
                <span style={{ width: '60%' }} />
              </div>
              <p className="maquette-meta">Vous avez atteint 60{N}% de votre objectif. Prochaine étape : mettre 80,00{N}€ de côté ce mois-ci.</p>
            </div>
          </div>
          <div className="accueil-colonne-visuel centre">
            <IllustrationBocal />
          </div>
        </section>

        {/* 8. Simulateur d'achat */}
        <section className="accueil-section accueil-conteneur accueil-alterne inverse" aria-labelledby="titre-simulateur">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Simulateur d’achat</p>
            <h2 id="titre-simulateur" tabIndex={-1} className="accueil-h2">
              Avant d’acheter, simulez.
            </h2>
            <p className="accueil-texte">
              Indiquez un prix : SoldeClair montre l’effet sur votre mois, sur votre épargne et sur vos objectifs. Rien n’est enregistré tant que vous ne le décidez pas.
            </p>
            <div className="maquette maquette-compacte" aria-hidden="true">
              <p className="maquette-titre">Vélo d’occasion · 180,00{N}€</p>
              <p className="maquette-verdict">
                <Icon name="info" size={18} /> Achat possible avec prudence : il vous resterait 245{N}€, soit environ 8{N}€ par jour.
              </p>
            </div>
          </div>
          <div className="accueil-colonne-visuel centre">
            <IllustrationBalance />
          </div>
        </section>

        {/* 9. Profils */}
        <section id="profils" className="accueil-section accueil-conteneur" aria-labelledby="titre-profils">
          <h2 id="titre-profils" tabIndex={-1} className="accueil-h2 centre">
            Adapté à votre situation.
          </h2>
          <p className="accueil-texte centre">Les catégories proposées changent selon votre profil. Vous pouvez tout modifier ensuite.</p>
          <ul className="accueil-profils">
            <li className="accueil-carte">
              <ProfilEtudiant />
              <h3>Étudiant·e</h3>
              <p>Bourse, aide au logement, petits jobs, frais d’inscription : l’essentiel est prêt.</p>
            </li>
            <li className="accueil-carte">
              <ProfilAlternant />
              <h3>Alternant·e</h3>
              <p>Salaire d’alternance, transports, premier logement : un budget qui suit votre rythme.</p>
            </li>
            <li className="accueil-carte">
              <ProfilSalarie />
              <h3>Salarié·e</h3>
              <p>Salaire, loyer ou crédit, épargne de précaution : une vue claire de chaque mois.</p>
            </li>
          </ul>
          <p className="accueil-texte centre petit">Indépendant·e ou autre situation ? SoldeClair s’adapte aussi.</p>
        </section>

        {/* 10. Confidentialité */}
        <section id="confidentialite" className="accueil-section accueil-conteneur accueil-alterne" aria-labelledby="titre-confidentialite">
          <div className="accueil-colonne-texte">
            <p className="accueil-etiquette">Confidentialité</p>
            <h2 id="titre-confidentialite" tabIndex={-1} className="accueil-h2">
              Vos données restent sur votre appareil.
            </h2>
            <p className="accueil-texte">
              Tout est enregistré dans votre navigateur. Rien n’est envoyé sur Internet : personne d’autre ne voit vos montants, pas même nous.
            </p>
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

        {/* 11. Appel à l'action */}
        <section className="accueil-conteneur" aria-labelledby="titre-cta">
          <div className="accueil-cta">
            <h2 id="titre-cta" tabIndex={-1} className="accueil-h2">
              Commencer avec SoldeClair
            </h2>
            <p className="accueil-texte">Deux minutes suffisent pour préparer votre budget. Gratuit, sans compte et sans banque.</p>
            <div className="accueil-actions">
              <button type="button" className="btn btn-primaire btn-grand" onClick={commencer}>
                {libelleCommencer}
              </button>
              {!aDesDonnees && (
                <button type="button" className="btn btn-secondaire btn-grand" onClick={essayerDemo}>
                  Essayer avec un profil de démonstration
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 12. Pied de page */}
      <footer className="accueil-pied">
        <div className="accueil-conteneur accueil-pied-grille">
          <div className="accueil-pied-marque">
            <Logo />
            <p>Le budget personnel, simplement. Pour savoir chaque jour ce qu’il vous reste.</p>
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
              <li>Données dans votre navigateur</li>
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
          <Icon name="lock" size={14} /> Version de test : vos données restent dans ce navigateur, sur cet appareil. SoldeClair donne des repères budgétaires, pas des conseils financiers.
        </p>
      </footer>
    </div>
  );
}
