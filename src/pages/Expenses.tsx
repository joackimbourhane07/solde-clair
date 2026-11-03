import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { Expense } from '../types';
import { defaultDateFor, formatDate, monthOf, ofMonth } from '../lib/dates';
import { sum } from '../lib/money';
import { categoryName } from '../lib/budget';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Modal,
  MonthSwitcher,
  PageHeader,
  SelectField,
  Stat,
  TextField,
  CategoryOptions,
} from '../components/ui';
import { ExpenseForm } from '../components/forms';

export function Expenses() {
  const { data, month, today, fmt, dispatch, notify, recents } = useApp();
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Expense | null>(null);
  // « Voir les dépenses » depuis un budget : la catégorie est présélectionnée (?categorie=…).
  const [params] = useSearchParams();
  const [category, setCategory] = useState(() => {
    const id = params.get('categorie') ?? '';
    return data.categories.some((c) => c.id === id) ? id : '';
  });
  const [query, setQuery] = useState('');

  const monthExpenses = useMemo(
    () => data.expenses.filter((e) => monthOf(e.date) === month).sort((a, b) => b.date.localeCompare(a.date)),
    [data.expenses, month],
  );
  const filtered = monthExpenses.filter((e) => {
    if (category && e.categoryId !== category) return false;
    if (query) {
      const q = query.toLocaleLowerCase('fr');
      const text = `${e.description} ${categoryName(data, e.categoryId)} ${e.paymentMethod}`.toLocaleLowerCase('fr');
      if (!text.includes(q)) return false;
    }
    return true;
  });
  const total = sum(monthExpenses.map((e) => e.amount));
  const filteredTotal = sum(filtered.map((e) => e.amount));

  return (
    <div className="page">
      <PageHeader
        title="Dépenses variables"
        description="Les dépenses du quotidien : courses, sorties, carburant…"
        actions={
          <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
            Ajouter une dépense
          </Button>
        }
      />
      <MonthSwitcher />

      <div className="stats-grid stats-compact">
        <Stat label={`Total ${ofMonth(month)}`} value={fmt(total)} tone="sortie" />
        <Stat label="Nombre de dépenses" value={String(monthExpenses.length)} />
      </div>

      <Card>
        <div className="filters">
          <TextField
            label="Rechercher"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Description, catégorie…"
          />
          <SelectField label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Toutes les catégories</option>
            <CategoryOptions categories={data.categories} kind="variable" />
          </SelectField>
        </div>
        {filtered.length === 0 ? (
          <EmptyState
            title={monthExpenses.length === 0 ? 'Aucune dépense ce mois-ci' : 'Aucun résultat'}
            action={
              monthExpenses.length === 0 ? (
                <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
                  Ajouter ma première dépense
                </Button>
              ) : undefined
            }
          >
            {monthExpenses.length === 0 ? 'Ajoutez votre première dépense en quelques secondes.' : 'Modifiez la recherche ou le filtre.'}
          </EmptyState>
        ) : (
          <>
            {(category || query) && (
              <p className="muted" aria-live="polite">
                {filtered.length} dépense(s) pour {fmt(filteredTotal)}
              </p>
            )}
            <ul className="item-list">
              {filtered.map((e) => (
                <li key={e.id} className={`item ${recents.has(e.id) ? 'item-recent' : ''}`}>
                  <div className="item-main">
                    <p className="item-title">{e.description || categoryName(data, e.categoryId)}</p>
                    <p className="item-meta">
                      {formatDate(e.date)} – {categoryName(data, e.categoryId)}
                      {e.paymentMethod && ` – ${e.paymentMethod}`}
                    </p>
                  </div>
                  <span className="montant montant-moins">− {fmt(e.amount)}</span>
                  <div className="item-actions">
                    <IconButton
                      icon="edit"
                      label={`Modifier la dépense ${e.description || ''} du ${formatDate(e.date)}`}
                      onClick={() => setEditing(e)}
                    />
                    <IconButton
                      icon="trash"
                      label={`Supprimer la dépense ${e.description || ''} du ${formatDate(e.date)}`}
                      onClick={() => setToDelete(e)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {editing && (
        <Modal title={editing === 'new' ? 'Nouvelle dépense' : 'Modifier la dépense'} onClose={() => setEditing(null)}>
          <ExpenseForm
            initial={editing === 'new' ? undefined : editing}
            defaultDate={defaultDateFor(month, today)}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Supprimer cette dépense ?"
          message={`La dépense de ${fmt(toDelete.amount)} du ${formatDate(toDelete.date)} sera définitivement supprimée.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            const supprimee = toDelete;
            dispatch({ type: 'remove', collection: 'expenses', id: supprimee.id });
            // Retour en arrière possible pendant quelques secondes
            notify('Dépense supprimée.', 'succes', {
              label: 'Annuler',
              onClick: () => dispatch({ type: 'upsert', collection: 'expenses', item: supprimee }),
            });
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}
