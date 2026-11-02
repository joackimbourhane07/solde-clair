import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import type { Income } from '../types';
import { carryOverInto, categoryName, monthTransactions } from '../lib/budget';
import { usesCarteRestaurant } from '../lib/accounts';
import { defaultDateFor, firstDay, formatDate, monthLabel, monthOf, ofMonth } from '../lib/dates';
import { sum } from '../lib/money';
import { FREQUENCY_LABELS } from '../lib/recurrence';
import { Button, Card, CheckboxField, ConfirmDialog, EmptyState, IconButton, Modal, MonthSwitcher, Notice, PageHeader, Stat } from '../components/ui';
import { IncomeForm } from '../components/forms';

export function Incomes() {
  const { data, month, setMonth, today, fmt, dispatch, notify } = useApp();
  const [editing, setEditing] = useState<Income | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Income | null>(null);
  const [showAll, setShowAll] = useState(false);

  const occurrences = useMemo(
    () => monthTransactions(data, month, today).filter((t) => t.type === 'revenu'),
    [data, month, today],
  );
  const total = sum(occurrences.map((t) => t.amount));
  const idsThisMonth = new Set(occurrences.map((t) => t.sourceId));
  const list = (showAll ? data.incomes : data.incomes.filter((i) => idsThisMonth.has(i.id))).slice().sort((a, b) => b.amount - a.amount);
  const report = useMemo(() => carryOverInto(data, month, today), [data, month, today]);
  /** Pourquoi un revenu n'apparaît pas dans les totaux du mois affiché. */
  const horsDuMois = (inc: Income): { texte: string; mois: string } | null => {
    if (idsThisMonth.has(inc.id)) return null;
    if (inc.recurring && inc.endDate && inc.endDate < firstDay(month)) return { texte: `Terminé le ${formatDate(inc.endDate)}`, mois: monthOf(inc.endDate) };
    if (inc.recurring) return { texte: `À partir de ${monthLabel(monthOf(inc.date))}`, mois: monthOf(inc.date) };
    return { texte: `Compté en ${monthLabel(monthOf(inc.date))}`, mois: monthOf(inc.date) };
  };
  // Carte restaurant : total de toutes les sources, puis détail compte bancaire / carte restaurant
  const avecCarte = usesCarteRestaurant(data);
  const surCarte = sum(occurrences.filter((t) => t.account === 'carte-restaurant').map((t) => t.amount));
  const recurringTotal = sum(occurrences.filter((t) => data.incomes.find((i) => i.id === t.sourceId)?.recurring).map((t) => t.amount));

  return (
    <div className="page">
      <PageHeader
        title="Revenus"
        description="Salaire, bourse, aides, ventes… tout ce qui entre sur votre compte."
        actions={
          <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
            Ajouter un revenu
          </Button>
        }
      />
      <MonthSwitcher />
      <div className="stats-grid stats-compact">
        <Stat label={`Revenus ${ofMonth(month)}`} value={fmt(total)} tone="entree" detail={avecCarte ? 'Toutes les sources' : undefined} />
        {avecCarte ? (
          <>
            <Stat label="Sur le compte bancaire" value={fmt(total - surCarte)} tone="entree" />
            <Stat label="Sur la carte restaurant" value={fmt(surCarte)} tone="entree" />
          </>
        ) : (
          <>
            <Stat label="Dont revenus récurrents" value={fmt(recurringTotal)} tone="entree" />
            <Stat label="Dont revenus exceptionnels" value={fmt(total - recurringTotal)} tone="entree" />
          </>
        )}
      </div>
      {report !== 0 && (
        <Notice>
          {report > 0 ? (
            <>
              Le reste des mois précédents (<strong>+ {fmt(report)}</strong>) s’ajoute à ces revenus dans votre disponible du tableau de bord.
            </>
          ) : (
            <>
              Le dépassement des mois précédents (<strong>− {fmt(-report)}</strong>) est retiré de votre disponible du tableau de bord.
            </>
          )}
        </Notice>
      )}
      <Card>
        <CheckboxField label="Afficher tous les revenus enregistrés (tous les mois)" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        {list.length === 0 ? (
          <EmptyState
            title="Aucun revenu pour ce mois"
            action={
              <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
                Ajouter un revenu
              </Button>
            }
          >
            Ajoutez votre salaire, votre bourse ou vos aides.
          </EmptyState>
        ) : (
          <ul className="item-list">
            {list.map((inc) => {
              const occ = occurrences.filter((t) => t.sourceId === inc.id);
              const hors = horsDuMois(inc);
              return (
                <li key={inc.id} className="item">
                  <div className="item-main">
                    <p className="item-title">
                      {inc.name}{' '}
                      <span className={`tag ${inc.recurring ? 'tag-recurrent' : ''}`}>
                        {inc.recurring ? FREQUENCY_LABELS[inc.frequency ?? 'mensuel'] : 'Exceptionnel'}
                      </span>
                      {hors && <span className="tag tag-autre-mois">{hors.texte}</span>}
                      {avecCarte && (occ[0]?.account ?? (inc.account || null)) === 'carte-restaurant' && <span className="tag tag-carte">Carte restaurant</span>}
                    </p>
                    <p className="item-meta">
                      {categoryName(data, inc.categoryId)} –{' '}
                      {inc.recurring
                        ? occ.length > 0
                          ? `Versé le ${occ.map((o) => formatDate(o.date)).join(', ')}`
                          : `Depuis le ${formatDate(inc.date)}`
                        : `Le ${formatDate(inc.date)}`}
                      {inc.endDate && ` – jusqu’au ${formatDate(inc.endDate)}`}
                    </p>
                    {inc.note && <p className="item-note">{inc.note}</p>}
                    {hors && hors.mois !== month && (
                      <button type="button" className="lien-bouton petit" onClick={() => setMonth(hors.mois)}>
                        Voir {monthLabel(hors.mois)}
                      </button>
                    )}
                  </div>
                  <span className={`montant ${hors ? 'montant-hors-mois' : 'montant-plus'}`}>
                    + {fmt(inc.amount)}
                    {occ.length > 1 && <span className="muted"> × {occ.length}</span>}
                  </span>
                  <div className="item-actions">
                    <IconButton icon="edit" label={`Modifier le revenu ${inc.name}`} onClick={() => setEditing(inc)} />
                    <IconButton icon="trash" label={`Supprimer le revenu ${inc.name}`} onClick={() => setToDelete(inc)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {editing && (
        <Modal title={editing === 'new' ? 'Nouveau revenu' : 'Modifier le revenu'} onClose={() => setEditing(null)}>
          <IncomeForm
            initial={editing === 'new' ? undefined : editing}
            defaultDate={defaultDateFor(month, today)}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Supprimer ce revenu ?"
          message={
            toDelete.recurring
              ? `« ${toDelete.name} » sera supprimé de tous les mois, y compris les mois passés. Pour l’arrêter seulement à partir d’une date, modifiez-le et indiquez une date de fin.`
              : `« ${toDelete.name} » (${fmt(toDelete.amount)}) sera définitivement supprimé.`
          }
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            dispatch({ type: 'remove', collection: 'incomes', id: toDelete.id });
            notify('Revenu supprimé.');
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}
