import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { Expense } from '../types';
import { defaultDateFor, formatDate, monthOf, ofMonth } from '../lib/dates';
import { sum } from '../lib/money';
import { categoryName, isIzly } from '../lib/budget';
import { accountBalance, usesIzly } from '../lib/accounts';
import { Icon } from '../components/Icon';
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
  // Filtre « Izly » (dépenses payées avec le porte-monnaie CROUS)
  const [seulementIzly, setSeulementIzly] = useState(params.get('paiement') === 'izly');
  const avecIzly = usesIzly(data);

  const monthExpenses = useMemo(
    () => data.expenses.filter((e) => monthOf(e.date) === month).sort((a, b) => b.date.localeCompare(a.date)),
    [data.expenses, month],
  );
  const filtered = monthExpenses.filter((e) => {
    if (category && e.categoryId !== category) return false;
    if (seulementIzly && !isIzly(e.paymentMethod)) return false;
    if (query) {
      const q = query.toLocaleLowerCase('fr');
      const text = `${e.description} ${categoryName(data, e.categoryId)} ${e.paymentMethod}`.toLocaleLowerCase('fr');
      if (!text.includes(q)) return false;
    }
    return true;
  });
  const total = sum(monthExpenses.map((e) => e.amount));
  const totalIzly = sum(monthExpenses.filter((e) => isIzly(e.paymentMethod)).map((e) => e.amount));
  const soldeIzly = avecIzly ? accountBalance(data, 'izly', today, today) : 0;
  const filteredTotal = sum(filtered.map((e) => e.amount));

  return (
    <div className="page">
      <PageHeader
        title="Dépenses variables"
        description="Courses, sorties, carburant…"
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

      {avecIzly && (
        <section className="carte-izly" aria-labelledby="izly-titre">
          <span className="carte-izly-icone" aria-hidden="true">
            <Icon name="campus" size={22} />
          </span>
          <div>
            <h2 id="izly-titre" className="carte-izly-titre">
              Izly {ofMonth(month)}
            </h2>
            <p className="carte-izly-chiffres">
              <strong className="montant-moins">− {fmt(totalIzly)}</strong> dépensés – solde Izly{' '}
              <strong className={soldeIzly < 0 ? 'montant-moins' : 'montant-plus'}>{soldeIzly < 0 ? `− ${fmt(-soldeIzly)}` : fmt(soldeIzly)}</strong>
            </p>
            <p className="field-hint">Suivi manuel, aucun accès à ton compte Izly.</p>
          </div>
        </section>
      )}

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
        {avecIzly && (
          <div className="chips" role="group" aria-label="Moyen de paiement">
            <button
              type="button"
              className={`chip chip-petit ${!seulementIzly ? 'chip-on' : ''}`}
              aria-pressed={!seulementIzly}
              onClick={() => setSeulementIzly(false)}
            >
              Tout
            </button>
            <button
              type="button"
              className={`chip chip-petit ${seulementIzly ? 'chip-on' : ''}`}
              aria-pressed={seulementIzly}
              onClick={() => setSeulementIzly(true)}
            >
              <Icon name="campus" size={14} /> Izly
            </button>
          </div>
        )}
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
            {monthExpenses.length === 0 ? 'Ajoute ta première dépense en quelques secondes.' : 'Modifie la recherche ou le filtre.'}
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
                    <p className="item-title">
                      {e.description || categoryName(data, e.categoryId)}
                      {isIzly(e.paymentMethod) && (
                        <span className="tag tag-izly">
                          <Icon name="campus" size={12} /> Izly
                        </span>
                      )}
                    </p>
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
