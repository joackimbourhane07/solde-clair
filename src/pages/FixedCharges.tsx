import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import type { FixedCharge } from '../types';
import { monthSummary, monthTransactions } from '../lib/budget';
import { defaultDateFor, formatDate, ofMonth } from '../lib/dates';
import { FREQUENCY_LABELS } from '../lib/recurrence';
import { Button, Card, ConfirmDialog, EmptyState, IconButton, Modal, MonthSwitcher, PageHeader, Stat } from '../components/ui';
import { ChargeForm } from '../components/forms';
import { Icon } from '../components/Icon';

export function FixedCharges() {
  const { data, month, today, fmt, dispatch, notify } = useApp();
  const [editing, setEditing] = useState<FixedCharge | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<FixedCharge | null>(null);

  const occurrences = useMemo(
    () => monthTransactions(data, month, today).filter((t) => t.type === 'charge'),
    [data, month, today],
  );
  const s = useMemo(() => monthSummary(data, month, today), [data, month, today]);
  const inactive = data.fixedCharges.filter((c) => !occurrences.some((o) => o.sourceId === c.id));

  return (
    <div className="page">
      <PageHeader
        title="Charges fixes"
        description="Les dépenses qui reviennent régulièrement : loyer, abonnements, assurances…"
        actions={
          <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
            Ajouter une charge
          </Button>
        }
      />
      <MonthSwitcher />
      <div className="stats-grid stats-compact">
        <Stat label={`Charges ${ofMonth(month)}`} value={fmt(s.fixed)} />
        <Stat label="Déjà payées" value={fmt(s.fixedPaid)} />
        <Stat label="À venir" value={fmt(s.fixedUpcoming)} />
      </div>

      <Card title={`Échéances ${ofMonth(month)}`}>
        {occurrences.length === 0 ? (
          <EmptyState
            title="Aucune charge fixe ce mois-ci"
            action={
              <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
                Ajouter une charge
              </Button>
            }
          >
            Ajoutez votre loyer, votre forfait téléphone, vos assurances…
          </EmptyState>
        ) : (
          <ul className="item-list">
            {occurrences.map((o) => {
              const charge = data.fixedCharges.find((c) => c.id === o.sourceId)!;
              const paid = o.status === 'paye';
              return (
                <li key={o.key} className="item">
                  <div className="item-main">
                    <p className="item-title">
                      {o.label} <span className="tag">{FREQUENCY_LABELS[charge.frequency]}</span>
                    </p>
                    <p className="item-meta">
                      {o.categoryName} · prélèvement le {formatDate(o.date)}
                    </p>
                    {charge.note && <p className="item-note">{charge.note}</p>}
                  </div>
                  <span className="montant">{fmt(o.amount)}</span>
                  <div className="item-actions">
                    <button
                      type="button"
                      className={`btn btn-small status-toggle ${paid ? 'status-paye' : 'status-avenir'}`}
                      aria-pressed={paid}
                      aria-label={`${o.label} : ${paid ? 'payé' : 'à venir'}. Cliquer pour marquer comme ${paid ? 'à venir' : 'payé'}`}
                      onClick={() => {
                        dispatch({ type: 'setChargeStatus', id: charge.id, date: o.date, status: paid ? 'a_venir' : 'paye' });
                        notify(`« ${o.label} » marqué comme ${paid ? 'à venir' : 'payé'}.`, 'info');
                      }}
                    >
                      <Icon name={paid ? 'check' : 'calendar'} size={16} />
                      <span>{paid ? 'Payé' : 'À venir'}</span>
                    </button>
                    <IconButton icon="edit" label={`Modifier la charge ${o.label}`} onClick={() => setEditing(charge)} />
                    <IconButton icon="trash" label={`Supprimer la charge ${o.label}`} onClick={() => setToDelete(charge)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="field-hint">
          Par défaut, une charge est considérée comme payée une fois sa date passée. Vous pouvez changer son statut à tout moment.
        </p>
      </Card>

      {inactive.length > 0 && (
        <Card title="Autres charges enregistrées" headingLevel={2}>
          <p className="muted">Ces charges n’ont pas d’échéance ce mois-ci (trimestrielles, annuelles, terminées ou futures).</p>
          <ul className="item-list">
            {inactive.map((c) => (
              <li key={c.id} className="item">
                <div className="item-main">
                  <p className="item-title">
                    {c.name} <span className="tag">{FREQUENCY_LABELS[c.frequency]}</span>
                  </p>
                  <p className="item-meta">
                    Première échéance le {formatDate(c.date)}
                    {c.endDate && ` · jusqu’au ${formatDate(c.endDate)}`}
                  </p>
                </div>
                <span className="montant">{fmt(c.amount)}</span>
                <div className="item-actions">
                  <IconButton icon="edit" label={`Modifier la charge ${c.name}`} onClick={() => setEditing(c)} />
                  <IconButton icon="trash" label={`Supprimer la charge ${c.name}`} onClick={() => setToDelete(c)} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editing && (
        <Modal title={editing === 'new' ? 'Nouvelle charge fixe' : 'Modifier la charge fixe'} onClose={() => setEditing(null)}>
          <ChargeForm
            initial={editing === 'new' ? undefined : editing}
            defaultDate={defaultDateFor(month, today)}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Supprimer cette charge fixe ?"
          message={`« ${toDelete.name} » sera supprimée de tous les mois, y compris les mois passés. Pour l’arrêter seulement à partir d’une date, modifiez-la et indiquez une date de fin.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            dispatch({ type: 'remove', collection: 'fixedCharges', id: toDelete.id });
            notify('Charge fixe supprimée.');
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}
