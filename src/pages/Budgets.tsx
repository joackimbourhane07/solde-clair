import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../state/AppState';
import { categoryBudgets, type CategoryBudgetLine } from '../lib/budget';
import { monthLabel } from '../lib/dates';
import { centsToInput, sum } from '../lib/money';
import { isDuplicateName, makeCategory } from '../lib/categories';
import { Button, Card, EmptyState, LevelBadge, Modal, MoneyField, MonthSwitcher, Notice, PageHeader, ProgressBar, Stat, TextField } from '../components/ui';
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
      ? 'Indiquez un nom de catégorie.'
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
    <Modal title={isNew ? 'Nouvelle catégorie de dépenses' : `Limite « ${line.category.name} »`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <TextField label="Nom de la catégorie" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={60} />
        <MoneyField
          label="Limite mensuelle"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          hint="Laissez vide ou à 0 pour ne pas fixer de limite."
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

  return (
    <div className="page">
      <PageHeader
        title="Budgets par catégorie"
        description="Fixez une limite mensuelle pour chaque type de dépense et suivez où vous en êtes."
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
        Repères : <strong>75 %</strong> (attention), <strong>90 %</strong> (alerte) et <strong>100 %</strong> (dépassement). Chaque état est
        indiqué par un texte et une icône, en plus de la couleur.
      </Notice>
      {lines.length === 0 ? (
        <EmptyState title="Aucune catégorie de dépenses" />
      ) : (
        <div className="budget-grid">
          {sorted.map((l) => (
            <Card key={l.category.id} className={`budget-card budget-${l.level}`} headingLevel={3} title={l.category.name}>
              <div className="budget-top">
                <LevelBadge level={l.level} />
                <Button variant="discret" className="btn-small" icon="edit" onClick={() => setEditing(l)} aria-label={`Modifier la limite de ${l.category.name}`}>
                  Modifier
                </Button>
              </div>
              {l.budget !== null ? (
                <>
                  <ProgressBar
                    value={l.spent}
                    max={l.budget}
                    level={l.level}
                    label={`Budget ${l.category.name}`}
                    valueText={`${l.pct} % utilisé, ${fmt(l.spent)} sur ${fmt(l.budget)}`}
                  />
                  <dl className="budget-figures">
                    <div>
                      <dt>Prévu</dt>
                      <dd>{fmt(l.budget)}</dd>
                    </div>
                    <div>
                      <dt>Dépensé</dt>
                      <dd>{fmt(l.spent)}</dd>
                    </div>
                    <div>
                      <dt>{(l.remaining ?? 0) < 0 ? 'Dépassement' : 'Restant'}</dt>
                      <dd className={(l.remaining ?? 0) < 0 ? 'texte-negatif' : ''}>{fmt(Math.abs(l.remaining ?? 0))}</dd>
                    </div>
                    <div>
                      <dt>Utilisé</dt>
                      <dd>{l.pct} %</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="muted">
                  Dépensé : <strong>{fmt(l.spent)}</strong>. Aucune limite fixée.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
      {editing && <BudgetEditor line={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
