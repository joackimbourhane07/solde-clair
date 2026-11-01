import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { Icon } from './Icon';
import type { BudgetLevel } from '../lib/budget';
import { BUDGET_LEVEL_LABELS } from '../lib/budget';
import { addMonths, capitalize, monthLabel, monthOf } from '../lib/dates';
import { useApp } from '../state/AppState';
import type { Category, CategoryKind } from '../types';

/* ------------------------------- Boutons --------------------------------- */

type BtnVariant = 'primaire' | 'secondaire' | 'discret' | 'danger';

export function Button({
  variant = 'secondaire',
  icon,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: string }) {
  return (
    <button type="button" className={`btn btn-${variant} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={18} />}
      {children && <span>{children}</span>}
    </button>
  );
}

/** Bouton icône seul : le libellé est obligatoire pour les lecteurs d'écran. */
export function IconButton({
  icon,
  label,
  variant = 'discret',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; variant?: BtnVariant }) {
  return (
    <button type="button" className={`btn btn-icon btn-${variant} ${className}`} aria-label={label} title={label} {...rest}>
      <Icon name={icon} size={18} />
    </button>
  );
}

/* ------------------------------- Champs ---------------------------------- */

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
}

function FieldShell({
  id,
  label,
  hint,
  error,
  optional,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={`field ${error ? 'field-erreur' : ''}`}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="facultatif"> (facultatif)</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="field-hint" id={`${id}-aide`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-erreur`} role="alert">
          <Icon name="alert" size={16} /> {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string | null) {
  if (error) return `${id}-erreur`;
  if (hint) return `${id}-aide`;
  return undefined;
}

export function TextField({
  label,
  hint,
  error,
  optional,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <input
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      />
    </FieldShell>
  );
}

export function MoneyField({
  label,
  hint,
  error,
  optional,
  ...rest
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const { currency } = useApp();
  const autoId = useId();
  const id = rest.id ?? autoId;
  const symbol = new Intl.NumberFormat('fr-FR', { style: 'currency', currency })
    .formatToParts(0)
    .find((p) => p.type === 'currency')?.value;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <div className="input-money">
        <input
          id={id}
          className="input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          {...rest}
        />
        <span className="input-suffix" aria-hidden="true">
          {symbol}
        </span>
      </div>
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  optional,
  children,
  ...rest
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <select
        id={id}
        className="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  optional,
  ...rest
}: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional}>
      <textarea id={id} className="input" rows={2} aria-describedby={describedBy(id, hint, error)} {...rest} />
    </FieldShell>
  );
}

export function CheckboxField({ label, hint, ...rest }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  return (
    <div className="field-check">
      <input type="checkbox" id={id} aria-describedby={hint ? `${id}-aide` : undefined} {...rest} />
      <label htmlFor={id}>
        {label}
        {hint && (
          <span className="field-hint" id={`${id}-aide`}>
            {hint}
          </span>
        )}
      </label>
    </div>
  );
}

export function CategoryOptions({ categories, kind }: { categories: Category[]; kind: CategoryKind }) {
  return (
    <>
      {categories
        .filter((c) => c.kind === kind)
        .map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
    </>
  );
}

/* ---------------------------- Mise en page ------------------------------- */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  children,
  actions,
  className = '',
  headingLevel = 2,
}: {
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          {title && <H className="card-title">{title}</H>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'positif' | 'negatif' | 'neutre';
}) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {detail && <p className="stat-detail">{detail}</p>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'attention' | 'danger' | 'succes'; children: ReactNode }) {
  const icon = tone === 'danger' ? 'stop' : tone === 'attention' ? 'alert' : tone === 'succes' ? 'check' : 'info';
  const prefix = { info: 'Information', attention: 'Attention', danger: 'Important', succes: 'C’est fait' }[tone];
  return (
    <div className={`notice notice-${tone}`}>
      <Icon name={icon} size={20} />
      <div>
        <span className="sr-only">{prefix} : </span>
        {children}
      </div>
    </div>
  );
}

/* ------------------------- Barres de progression ------------------------- */

const LEVEL_ICON: Record<BudgetLevel, string> = {
  sans: 'info',
  ok: 'check',
  attention: 'info',
  alerte: 'alert',
  depasse: 'stop',
};

export function LevelBadge({ level }: { level: BudgetLevel }) {
  return (
    <span className={`badge badge-${level}`}>
      <Icon name={LEVEL_ICON[level]} size={14} />
      {BUDGET_LEVEL_LABELS[level]}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  level = 'ok',
  valueText,
}: {
  value: number;
  max: number;
  label: string;
  level?: BudgetLevel | 'objectif';
  valueText?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className={`progress progress-${level}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
      {/* Repères 75 % et 90 % visibles (information non portée par la seule couleur). */}
      {level !== 'objectif' && (
        <>
          <span className="progress-mark" style={{ left: '75%' }} aria-hidden="true" />
          <span className="progress-mark" style={{ left: '90%' }} aria-hidden="true" />
        </>
      )}
    </div>
  );
}

/* ---------------------------- Sélecteur de mois -------------------------- */

export function MonthSwitcher() {
  const { month, setMonth, today } = useApp();
  const current = monthOf(today);
  return (
    <div className="month-switcher" role="group" aria-label="Choisir le mois">
      <IconButton icon="left" label="Mois précédent" onClick={() => setMonth(addMonths(month, -1))} />
      <p className="month-label" aria-live="polite">
        {capitalize(monthLabel(month))}
      </p>
      <IconButton icon="right" label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))} />
      {month !== current && (
        <Button variant="discret" className="btn-small" onClick={() => setMonth(current)}>
          Mois en cours
        </Button>
      )}
    </div>
  );
}

/* --------------------------------- Modale -------------------------------- */

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
    const focusables = () =>
      node
        ? Array.from(
            node.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];
    // Place le focus sur le premier champ (ou bouton) de la fenêtre.
    const firstField = node?.querySelector<HTMLElement>('[data-autofocus], input, select, textarea') ?? focusables()[0];
    firstField?.focus();
    document.body.classList.add('modal-ouverte');

    const onKey = (e: KeyboardEvent) => {
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
      document.body.classList.remove('modal-ouverte');
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role={role} aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <IconButton icon="close" label="Fermer" onClick={onClose} />
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Supprimer',
  danger = true,
  onConfirm,
  onCancel,
  children,
  confirmDisabled,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <Modal title={title} onClose={onCancel} role="alertdialog">
      <div className="confirm-message">{message}</div>
      {children}
      <div className="form-actions">
        <Button variant="secondaire" onClick={onCancel} data-autofocus>
          Annuler
        </Button>
        <Button variant={danger ? 'danger' : 'primaire'} onClick={onConfirm} disabled={confirmDisabled}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/* --------------------------------- Toasts -------------------------------- */

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'erreur' ? 'alert' : 'status'}>
          <Icon name={t.kind === 'erreur' ? 'stop' : t.kind === 'info' ? 'info' : 'check'} size={18} />
          <span>{t.message}</span>
          <IconButton icon="close" label="Fermer le message" onClick={() => dismissToast(t.id)} />
        </div>
      ))}
    </div>
  );
}

/** Montant signé avec un signe explicite (+ / −), pas seulement une couleur. */
export function SignedAmount({ cents, positive }: { cents: number; positive: boolean }) {
  const { fmt } = useApp();
  return (
    <span className={`montant ${positive ? 'montant-plus' : 'montant-moins'}`}>
      {positive ? '+' : '−'}
      {' '}
      {fmt(Math.abs(cents))}
    </span>
  );
}
