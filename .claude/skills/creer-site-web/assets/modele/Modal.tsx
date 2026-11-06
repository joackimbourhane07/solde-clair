import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { deverrouillerDefilement, verrouillerDefilement } from './viewport';

/*
 * Fenêtre unique du site (modèle tiré de SoldeClair).
 * - Téléphone : « bottom sheet » centrée au-dessus de la barre système ; ordinateur : centrée.
 * - Rendue en portail sur <body>, au-dessus de tout ; #root devient inerte (ni clic, ni focus, ni lecteur d'écran).
 * - Défilement de la page verrouillé (compatible iOS) puis position rendue exactement.
 * - Focus piégé, rendu au bouton d'origine ; Échap et bouton retour Android ferment la fenêtre du dessus.
 * Styles : voir tokens.css (.modal-backdrop, .modal, .modal-body, .form-actions).
 * N'en crée jamais un second système : toutes les fenêtres du site passent par ce composant.
 */

/** Fenêtres ouvertes, de la plus ancienne à la plus récente (la dernière reçoit Échap et le bouton retour). */
const pileFenetres: { id: string; fermer: () => void }[] = [];
let ignorerRetour = 0;

function surRetourNavigateur() {
  if (ignorerRetour > 0) {
    ignorerRetour -= 1;
    return;
  }
  const dessus = pileFenetres[pileFenetres.length - 1];
  if (dessus) dessus.fermer();
}

export function Modal({
  title,
  onClose,
  children,
  role = 'dialog',
  size = 'normal',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  role?: 'dialog' | 'alertdialog';
  size?: 'normal' | 'large';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const id = `fenetre-${Math.random().toString(36).slice(2)}`;
    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    const racine = document.getElementById('root');
    const etaitInerte = racine?.hasAttribute('inert') ?? false;
    racine?.setAttribute('inert', '');
    racine?.setAttribute('aria-hidden', 'true');
    verrouillerDefilement();

    // Bouton retour : une entrée d'historique propre à la fenêtre (même adresse)
    pileFenetres.push({ id, fermer: () => onCloseRef.current() });
    try {
      window.history.pushState({ ...(window.history.state ?? {}), fenetreId: id }, '');
    } catch {
      /* historique indisponible */
    }
    if (pileFenetres.length === 1) window.addEventListener('popstate', surRetourNavigateur);

    const firstField = node?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea') ?? focusables()[0];
    firstField?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (pileFenetres[pileFenetres.length - 1]?.id !== id) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      } else if (e.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const k = pileFenetres.findIndex((f) => f.id === id);
      if (k >= 0) pileFenetres.splice(k, 1);
      if (pileFenetres.length === 0) window.removeEventListener('popstate', surRetourNavigateur);
      // Fermée autrement que par « retour » : on retire son entrée d'historique
      if ((window.history.state as { fenetreId?: string } | null)?.fenetreId === id) {
        ignorerRetour += 1;
        window.history.back();
      }
      if (pileFenetres.length === 0 && !etaitInerte) {
        racine?.removeAttribute('inert');
        racine?.removeAttribute('aria-hidden');
      }
      deverrouillerDefilement();
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role={role} aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <span className="modal-poignee" aria-hidden="true" />
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn-icone" aria-label="Fermer" onClick={onClose}>
            {/* icône SVG « croix » du site */}
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
