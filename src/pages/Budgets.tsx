import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { categoryBudgets, type CategoryBudgetLine } from '../lib/budget';
import { formatDate, monthLabel, monthOf } from '../lib/dates';
import { centsToInput, sum } from '../lib/money';
import { isDuplicateName, makeCategory } from '../lib/categories';
import {
  Button,
  Card,
  EmptyState,
  LevelBadge,
  Modal,
  MoneyField,
  MonthSwitcher,
  Notice,
  PageHeader,
  ProgressBar,
  Stat,
  TextField,
} from '../components/ui';
import { checkAmount } from '../components/forms';

function BudgetEditor({ line, onClose }: { line: CategoryBudgetLine | 'new'; onClose: () => void }) {
  const { data, dispatch, notify } = useApp();
  const isNew = line === 'new';
  const [name, setName] = useState(isNew ? '' : line.category.name);
  const [amount, setAmount] = useState(isNew ? '' : centsToInput(line.budget));
  const [errors, setErrors] = useState<{ name?: string | null; amount?: string | null }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount, { allowZero: true, required: false });
    const trimmed = name.trim();
    const nameError = !trimmed
      ? 'Indique un nom de catégorie.'
      : isDuplicateName(data.categories, 'variable', trimmed, isNew ? undefined : line.category.id)
        ? 'Une catégorie porte déjà ce nom.'
        : null;
    setErrors({ name: nameError, amount: amountError });
    if (nameError || amountError) return;
    const budget = cents && cents > 0 ? cents : null;
    const item = isNew ? makeCategory(trimmed, 'variable', budget) : { ...line.category, name: trimmed, budget };
    dispatch({ type: 'upsert', collection: 'categories', item });
    notify(isNew ? 'Catégorie ajoutée.' : 'Limite mise à jour.');
    onClose();
  };

  return (
    <Modal title={isNew ? 'Nouvelle catégorie de dépenses' : `Limite « ${line.category.name} »`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <TextField label="Nom de la catégorie" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={60} />
        <MoneyField
          label="Limite mensuelle"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          hint="Laisse vide ou à 0 pour ne pas fixer de limite."
        />
        <div className="form-actions">
          <Button onClick={onClose}>Annuler</Button>
          <button type="submit" className="btn btn-primaire">
            <span>Enregistrer</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Les dépenses du mois de la catégorie, dépliables directement dans la carte (sans changer de page). */
function DepensesDeLaCategorie({ categoryId }: { categoryId: string }) {
  const { data, month, fmt } = useApp();
  const depenses = data.expenses
    .filter((e) => e.categoryId === categoryId && monthOf(e.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  if (depenses.length === 0) return <p className="budget-vide">Aucune dépense ce mois-ci.</p>;
  return (
    <details className="disclosure budget-detail">
      <summary>
        {depenses.length} dépense{depenses.length > 1 ? 's' : ''} ce mois-ci
      </summary>
      <div className="disclosure-body">
        <ul className="budget-depenses">
          {depenses.slice(0, 5).map((e) => (
            <li key={e.id}>
              <span>
                {e.description || 'Dépense'} <span className="muted">– {formatDate(e.date)}</span>
              </span>
              <span className="montant montant-moins">− {fmt(e.amount)}</span>
            </li>
          ))}
        </ul>
        <Link to={`/depenses?categorie=${categoryId}`} className="link">
          {depenses.length > 5 ? `Voir les ${depenses.length} dépenses` : 'Voir dans Dépenses'}
        </Link>
      </div>
    </details>
  );
}

export function Budgets() {
  const { data, month, fmt } = useApp();
  const [editing, setEditing] = useState<CategoryBudgetLine | 'new' | null>(null);
  const lines = useMemo(() => categoryBudgets(data, month), [data, month]);
  const withBudget = lines.filter((l) => l.budget !== null);
  const totalBudget = sum(withBudget.map((l) => l.budget ?? 0));
  const totalSpent = sum(lines.map((l) => l.spent));
  const spentInBudgeted = sum(withBudget.map((l) => l.spent));
  const order = { depasse: 0, alerte: 1, attention: 2, ok: 3, sans: 4 };
  const sorted = [...lines].sort((a, b) => order[a.level] - order[b.level] || b.spent - a.spent);
  // Les catégories sans limite sont regroupées dans une liste compacte (page moins chargée).
  const avecLimite = sorted.filter((l) => l.budget !== null);
  const sansLimite = sorted
    .filter((l) => l.budget === null)
    .sort((a, b) => b.spent - a.spent || a.category.name.localeCompare(b.category.name, 'fr'));

  return (
    <div className="page">
      <PageHeader
        title="Budgets par catégorie"
        description="Une limite par catégorie, chaque mois."
        actions={
          <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
            Nouvelle catégorie
          </Button>
        }
      />
      <MonthSwitcher />
      <div className="stats-grid stats-compact">
        <Stat label="Total des limites" value={fmt(totalBudget)} />
        <Stat label={`Dépensé en ${monthLabel(month)}`} value={fmt(totalSpent)} />
        <Stat
          label="Reste sur les limites"
          value={fmt(totalBudget - spentInBudgeted)}
          tone={totalBudget - spentInBudgeted < 0 ? 'negatif' : undefined}
        />
      </div>
      <Notice>
        Repères : <strong>75 %</strong> (attention), <strong>90 %</strong> (alerte) et <strong>100 %</strong> (dépassement). Chaque état est indiqué
        par un texte et une icône, en plus de la couleur.
      </Notice>
      {lines.length === 0 && <EmptyState title="Aucune catégorie de dépenses" />}
      {avecLimite.length > 0 && (
        <div className="budget-grid">
          {avecLimite.map((l) => (
            <Card key={l.category.id} className={`budget-card budget-${l.level}`} headingLevel={3} title={l.category.name}>
              <div className="budget-top">
                <LevelBadge level={l.level} />
                <Button
                  variant="discret"
                  className="btn-small"
                  icon="edit"
                  onClick={() => setEditing(l)}
                  aria-label={`Modifier la limite de ${l.category.name}`}
                >
                  Modifier
                </Button>
              </div>
              {l.budget !== null && (
                <>
                  {/* L'essentiel en une phrase : dépensé, limite, reste (comme une enveloppe) */}
                  <p className="budget-phrase">
                    {(l.remaining ?? 0) < 0 ? (
                      <>
                        <strong>{fmt(l.spent)}</strong> dépensés sur {fmt(l.budget)}, dépassement de{' '}
                        <strong className="texte-negatif">{fmt(-(l.remaining ?? 0))}</strong>
                      </>
                    ) : (
                      <>
                        <strong>{fmt(l.spent)}</strong> dépensés sur {fmt(l.budget)} ({l.pct}
                        {'\u00a0'}%), il reste <strong>{fmt(l.remaining ?? 0)}</strong>
                      </>
                    )}
                  </p>
                  <ProgressBar
                    value={l.spent}
                    max={l.budget}
                    level={l.level}
                    label={`Budget ${l.category.name}`}
                    valueText={`${l.pct}\u00a0% utilisé, ${fmt(l.spent)} sur ${fmt(l.budget)}`}
                  />
                  <DepensesDeLaCategorie categoryId={l.category.id} />
                  {l.level === 'depasse' && (
                    <p className="budget-conseil">
                      Ton budget {l.category.name.toLocaleLowerCase('fr')} est dépassé. Tu peux consulter les dépenses concernées ou ajuster cette
                      limite pour le mois.{' '}
                      <Link to={`/depenses?categorie=${l.category.id}`} className="link">
                        Voir les dépenses
                      </Link>
                    </p>
                  )}
                </>
              )}
            </Card>
          ))}
        </div>
      )}
      {sansLimite.length > 0 && (
        <Card title={`Catégories sans limite (${sansLimite.length})`}>
          <p className="muted">
            {avecLimite.length === 0
              ? 'Fixe une limite pour suivre une catégorie de près : sa barre de progression apparaîtra ici.'
              : 'Ces catégories sont suivies sans plafond. Fixe une limite pour voir leur barre de progression.'}
          </p>
          <ul className="sans-limite-liste">
            {sansLimite.map((l) => (
              <li key={l.category.id}>
                <span className="sans-limite-nom">
                  <span className="item-title">{l.category.name}</span>
                  <span className="item-meta">Dépensé ce mois : {fmt(l.spent)}</span>
                </span>
                <Button
                  variant="discret"
                  className="btn-small"
                  icon="plus"
                  onClick={() => setEditing(l)}
                  aria-label={`Fixer une limite pour ${l.category.name}`}
                >
                  Fixer une limite
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {editing && <BudgetEditor line={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
