import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { Modal, Toasts } from './ui';
import { DepositForm, ExpenseForm, IncomeForm } from './forms';
import { usesIzly } from '../lib/accounts';
import { defaultDateFor } from '../lib/dates';
import { useApp } from '../state/AppState';
import { Poksy } from './poksy/Poksy';

export const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: 'home' },
  { to: '/compte', label: 'Mon compte', short: 'Compte', icon: 'wallet' },
  { to: '/depenses', label: 'Dépenses', short: 'Dépenses', icon: 'expense' },
  { to: '/revenus', label: 'Revenus', short: 'Revenus', icon: 'income' },
  { to: '/charges', label: 'Charges fixes', short: 'Charges', icon: 'calendar' },
  { to: '/budgets', label: 'Budgets par catégorie', short: 'Budgets', icon: 'gauge' },
  { to: '/plan', label: 'Mon plan d’épargne', short: 'Plan', icon: 'target' },
  { to: '/objectifs', label: 'Objectifs d’épargne', short: 'Objectifs', icon: 'piggy' },
  { to: '/simulateur', label: 'Simulateur d’achat', short: 'Simulateur', icon: 'calculator' },
  { to: '/historique', label: 'Historique et bilan', short: 'Historique', icon: 'history' },
  { to: '/parametres', label: 'Paramètres', short: 'Paramètres', icon: 'settings' },
];

// Barre du bas (mobile) : Accueil, Compte, [+ Ajouter], Budgets, Plus (Dépenses est dans « Plus »).
const MOBILE_MAIN = ['/', '/compte', '/budgets'];

/** Logo : ramène à la page d'accueil (continuer avec son profil ou en créer un autre). */
function Logo() {
  return (
    <Link to="/presentation" className="logo-lien" aria-label="SoldeClair, page d’accueil et profils">
      <span className="logo">
        <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
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
    </Link>
  );
}

/** Bouton « masquer / afficher les montants » (utilisation en public). */
function MasquerMontants({ compact = false }: { compact?: boolean }) {
  const { masque, dispatch } = useApp();
  const libelle = masque ? 'Afficher les montants' : 'Masquer les montants';
  return (
    <button
      type="button"
      className={`btn btn-discret ${compact ? 'btn-icon' : 'btn-small masquer-montants'}`}
      aria-pressed={masque}
      aria-label={compact ? libelle : undefined}
      title={libelle}
      onClick={() => dispatch({ type: 'setHideAmounts', hide: !masque })}
    >
      <Icon name={masque ? 'eye-off' : 'eye'} size={18} />
      {!compact && <span>{libelle}</span>}
    </button>
  );
}

type TypeAjout = 'depense' | 'izly' | 'revenu' | 'epargne';

/**
 * Fenêtre du bouton « + » : « Que veux-tu ajouter ? ». La dépense est choisie d'office (action la plus
 * fréquente) ; Izly, revenu et épargne sont à un geste. Bottom sheet sur téléphone.
 */
function AjoutRapide({ onClose }: { onClose: () => void }) {
  const { data, month, today } = useApp();
  const [type, setType] = useState<TypeAjout>('depense');
  const proposerIzly = usesIzly(data) || data.profile?.type === 'etudiant' || data.profile?.type === 'alternant';
  const onglets: [TypeAjout, string, string][] = [
    ['depense', 'Dépense', 'expense'],
    ...(proposerIzly ? ([['izly', 'Izly', 'campus']] as [TypeAjout, string, string][]) : []),
    ['revenu', 'Revenu', 'income'],
    ['epargne', 'Épargne', 'piggy'],
  ];
  const date = defaultDateFor(month, today);
  return (
    <Modal title="Ajouter" onClose={onClose}>
      <div className="ajout-types" role="tablist" aria-label="Que veux-tu ajouter ?">
        {onglets.map(([v, libelle, icone]) => (
          <button
            key={v}
            type="button"
            role="tab"
            id={`ajout-${v}`}
            aria-selected={type === v}
            aria-controls="ajout-panneau"
            className={`ajout-type ${type === v ? 'ajout-type-actif' : ''}`}
            onClick={() => setType(v)}
          >
            <Icon name={icone} size={18} />
            {libelle}
          </button>
        ))}
      </div>
      <div id="ajout-panneau" role="tabpanel" aria-labelledby={`ajout-${type}`} key={type} className="ajout-panneau">
        {type === 'depense' && <ExpenseForm defaultDate={date} onDone={onClose} onCancel={onClose} />}
        {type === 'izly' && <ExpenseForm izly defaultDate={date} onDone={onClose} onCancel={onClose} />}
        {type === 'revenu' && <IncomeForm defaultDate={date} onDone={onClose} onCancel={onClose} />}
        {type === 'epargne' && <DepositForm defaultDate={date} onDone={onClose} onCancel={onClose} />}
      </div>
    </Modal>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { data } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  // Ajout rapide d'une dépense depuis n'importe quelle page
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const location = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    setMenuOpen(false);
    // Au premier affichage, on laisse le focus en haut de page (lien « Aller au contenu »).
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Changement de page : remonte en haut et place le focus sur le contenu (lecteurs d'écran).
    window.scrollTo?.(0, 0);
    document.getElementById('contenu')?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#contenu"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('contenu')?.focus();
        }}
      >
        Aller au contenu
      </a>
      <aside className="sidebar" aria-label="Navigation principale">
        <Logo />
        <button type="button" className="btn btn-primaire sidebar-add" onClick={() => setAjoutOuvert(true)}>
          <Icon name="plus" size={18} />
          <span>Ajouter une dépense</span>
        </button>
        <nav>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === '/'} className="nav-link">
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-foot">
          <MasquerMontants />
          <p className="sidebar-privacy">
            <Icon name="lock" size={16} /> Tes données restent sur cet appareil.
          </p>
        </div>
      </aside>

      <header className="topbar">
        <Logo />
        <div className="topbar-right">
          {data.profile && <span className="topbar-user">{data.profile.name}</span>}
          <MasquerMontants compact />
        </div>
      </header>

      <main id="contenu" className="main" tabIndex={-1}>
        {/* Nouvelle page : ses blocs arrivent en glissant légèrement (voir mouvement.css) */}
        <div key={location.pathname} className="transition-page">
          {children}
        </div>
        <footer className="app-footer">
          <Icon name="lock" size={16} />
          <p>
            Tes données restent sur cet appareil. Rien n’est envoyé. Pense à faire une sauvegarde.{' '}
            <Link to="/presentation" className="link">
              Voir la présentation de SoldeClair
            </Link>
          </p>
        </footer>
      </main>

      <nav className="bottom-nav" aria-label="Navigation principale (mobile)">
        <ul>
          {NAV_ITEMS.filter((i) => MOBILE_MAIN.includes(i.to))
            .flatMap((item) => [
              item,
              ...(item.to === '/compte' ? [null] : []), // emplacement central du bouton « + »
            ])
            .map((item) =>
              item ? (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.to === '/'} className="bottom-link">
                    <Icon name={item.icon} size={22} />
                    <span>{item.short}</span>
                  </NavLink>
                </li>
              ) : (
                <li key="ajouter">
                  <button type="button" className="bottom-link bottom-add" aria-label="Ajouter une dépense" onClick={() => setAjoutOuvert(true)}>
                    <span className="bottom-add-cercle" aria-hidden="true">
                      <Icon name="plus" size={24} />
                    </span>
                    <span>Ajouter</span>
                  </button>
                </li>
              ),
            )}
          <li>
            <button
              type="button"
              className={`bottom-link ${menuOpen ? 'active' : ''}`}
              aria-expanded={menuOpen}
              aria-controls="menu-plus"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
              <span>Plus</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Poksy, guide SoldeClair : aide locale, ne modifie jamais les données */}
      <Poksy onAjouterDepense={() => setAjoutOuvert(true)} cache={menuOpen} />

      {menuOpen && (
        <div className="sheet-backdrop" onClick={() => setMenuOpen(false)}>
          <div id="menu-plus" className="sheet" role="dialog" aria-label="Autres pages" onClick={(e) => e.stopPropagation()}>
            <ul>
              {NAV_ITEMS.filter((i) => !MOBILE_MAIN.includes(i.to)).map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className="nav-link">
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {ajoutOuvert && <AjoutRapide onClose={() => setAjoutOuvert(false)} />}
      <Toasts />
    </div>
  );
}
