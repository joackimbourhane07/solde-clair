import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { Modal, Toasts } from './ui';
import { ExpenseForm } from './forms';
import { defaultDateFor } from '../lib/dates';
import { useApp } from '../state/AppState';

export const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: 'home' },
  { to: '/depenses', label: 'Dépenses', short: 'Dépenses', icon: 'expense' },
  { to: '/revenus', label: 'Revenus', short: 'Revenus', icon: 'income' },
  { to: '/charges', label: 'Charges fixes', short: 'Charges', icon: 'calendar' },
  { to: '/budgets', label: 'Budgets par catégorie', short: 'Budgets', icon: 'gauge' },
  { to: '/objectifs', label: 'Objectifs d’épargne', short: 'Objectifs', icon: 'piggy' },
  { to: '/simulateur', label: 'Simulateur d’achat', short: 'Simulateur', icon: 'calculator' },
  { to: '/historique', label: 'Historique et bilan', short: 'Historique', icon: 'history' },
  { to: '/parametres', label: 'Paramètres', short: 'Paramètres', icon: 'settings' },
];

// Barre du bas (mobile) : Accueil, Dépenses, [+ Ajouter], Budgets, Plus.
const MOBILE_MAIN = ['/', '/depenses', '/budgets'];

function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 64 64" width="28" height="28" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill="currentColor" />
        <path d="M18 40c3 4 8 6 14 6 8 0 13-4 13-10 0-12-25-7-25-17 0-4 4-7 11-7 5 0 9 2 11 5" fill="none" stroke="var(--logo-ink)" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="logo-text">SoldeClair</span>
    </span>
  );
}

/** Bouton « masquer / afficher les montants » (utilisation en public). */
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

export function Layout({ children }: { children: ReactNode }) {
  const { data, month, today } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  // Ajout rapide d'une dépense depuis n'importe quelle page
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const location = useLocation();
  const firstRender = useRef(true);

  useEffect(() => {
    setMenuOpen(false);
    // Au premier affichage, on laisse le focus en haut de page (lien « Aller au contenu »).
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
      <a className="skip-link" href="#contenu" onClick={(e) => { e.preventDefault(); document.getElementById('contenu')?.focus(); }}>
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
            <Icon name="lock" size={16} /> Vos données restent sur cet appareil.
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
        {children}
        <footer className="app-footer">
          <Icon name="lock" size={16} />
          <p>
            Vos données restent dans ce navigateur, sur cet appareil : elles ne sont ni envoyées sur Internet ni partagées avec d’autres
            personnes. Pensez à faire une sauvegarde dans les paramètres.
          </p>
        </footer>
      </main>

      <nav className="bottom-nav" aria-label="Navigation principale (mobile)">
        <ul>
          {NAV_ITEMS.filter((i) => MOBILE_MAIN.includes(i.to))
            .flatMap((item) => [
              item,
              ...(item.to === '/depenses' ? [null] : []), // emplacement central du bouton « + »
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
      {ajoutOuvert && (
        <Modal title="Nouvelle dépense" onClose={() => setAjoutOuvert(false)}>
          <ExpenseForm defaultDate={defaultDateFor(month, today)} onDone={() => setAjoutOuvert(false)} onCancel={() => setAjoutOuvert(false)} />
        </Modal>
      )}
      <Toasts />
    </div>
  );
}
