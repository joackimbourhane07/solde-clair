import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import type { SavingsDeposit, SavingsGoal } from '../types';
import { goalProgress, PRIORITY_LABELS, sortGoals } from '../lib/goals';
import { savingsBalanceByMonth } from '../lib/budget';
import { defaultDateFor, formatDate, monthLabel, monthLabelShort, monthOf } from '../lib/dates';
import { sum } from '../lib/money';
import { Button, Card, ConfirmDialog, EmptyState, IconButton, Modal, Notice, PageHeader, ProgressBar, Stat } from '../components/ui';
import { DepositForm, GoalForm } from '../components/forms';
import { LineChart } from '../components/charts/Charts';

export function Goals() {
  const { data, today, fmt, dispatch, notify } = useApp();
  const currentMonth = monthOf(today);
  const [editing, setEditing] = useState<SavingsGoal | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<SavingsGoal | null>(null);
  const [deposit, setDeposit] = useState<{ goalId: string | null; initial?: SavingsDeposit } | null>(null);
  const [depositToDelete, setDepositToDelete] = useState<SavingsDeposit | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  const goals = sortGoals(data.goals);
  const savedThisMonth = sum(data.savings.filter((s) => monthOf(s.date) === currentMonth).map((s) => s.amount));
  const target = data.profile?.monthlySavingsTarget ?? 0;
  const evolution = useMemo(() => savingsBalanceByMonth(data, currentMonth, 6), [data, currentMonth]);
  const totalSaved = evolution[evolution.length - 1]?.total ?? 0;
  const freeDeposits = data.savings.filter((s) => s.goalId === null);

  return (
    <div className="page">
      <PageHeader
        title="Objectifs d’épargne"
        description="Mettez de l’argent de côté pour vos projets, à votre rythme."
        actions={
          <>
            <Button icon="piggy" onClick={() => setDeposit({ goalId: data.goals[0]?.id ?? null })}>
              Enregistrer un versement
            </Button>
            <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
              Nouvel objectif
            </Button>
          </>
        }
      />

      <div className="stats-grid stats-compact">
        <Stat label={`Épargné en ${monthLabel(currentMonth)}`} value={fmt(savedThisMonth)} detail={target > 0 ? `Objectif mensuel : ${fmt(target)}` : undefined} />
        <Stat label="Total épargné" value={fmt(totalSaved)} detail="Montants initiaux + versements" />
        <Stat label="Objectifs en cours" value={String(goals.filter((g) => !goalProgress(g, data.savings, today).reached).length)} />
      </div>

      {goals.length === 0 ? (
        <EmptyState
          title="Aucun objectif pour l’instant"
          action={
            <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
              Créer mon premier objectif
            </Button>
          }
        >
          Un fonds d’urgence, un voyage, un ordinateur… Fixez un montant et suivez votre progression.
        </EmptyState>
      ) : (
        <div className="goal-grid">
          {goals.map((g) => {
            const p = goalProgress(g, data.savings, today);
            const deposits = data.savings.filter((s) => s.goalId === g.id).sort((a, b) => b.date.localeCompare(a.date));
            const verseCeMois = sum(deposits.filter((d) => monthOf(d.date) === currentMonth).map((d) => d.amount));
            // Prochaine petite étape : l'effort du mois (celui qui permet de tenir la date si elle est menacée).
            const etape = p.onTrack === false ? (p.monthlyNeeded ?? 0) : g.monthlyContribution || (p.monthlyNeeded ?? 0);
            return (
              <Card key={g.id} title={g.name} headingLevel={3} className="goal-card">
                <p className="goal-meta">
                  <span className={`tag tag-${g.priority}`}>{PRIORITY_LABELS[g.priority]}</span>
                  {p.reached && <span className="tag tag-ok">✓ Objectif atteint</span>}
                  {p.dateExceeded && <span className="tag tag-alerte">Date dépassée</span>}
                </p>
                {g.description && <p className="muted">{g.description}</p>}
                <p className="goal-amounts">
                  <strong>{fmt(p.current)}</strong> sur {fmt(g.target)}
                </p>
                <ProgressBar value={p.current} max={g.target} level="objectif" label={`Progression de ${g.name}`} valueText={`${p.pct}\u00a0%`} />
                {!p.reached && (
                  <p className="goal-step">
                    {p.pct > 0 ? `Vous avez atteint ${p.pct}\u00a0% de votre objectif.` : 'Votre objectif commence ici.'}{' '}
                    {verseCeMois > 0
                      ? `Ce mois-ci, vous avez déjà mis ${fmt(verseCeMois)} de côté pour cet objectif.`
                      : etape > 0
                        ? `Prochaine étape : mettre ${fmt(etape)} de côté ce mois-ci.`
                        : ''}
                  </p>
                )}
                <dl className="goal-figures">
                  <div>
                    <dt>Reste à épargner</dt>
                    <dd>{fmt(p.remaining)}</dd>
                  </div>
                  <div>
                    <dt>Contribution prévue</dt>
                    <dd>{g.monthlyContribution > 0 ? `${fmt(g.monthlyContribution)} / mois` : 'Non définie'}</dd>
                  </div>
                  {g.targetDate && (
                    <>
                      <div>
                        <dt>Date souhaitée</dt>
                        <dd>
                          {formatDate(g.targetDate)}
                          <span className="goal-sub">dans {p.monthsRemaining} mois</span>
                        </dd>
                      </div>
                      <div>
                        <dt>Nécessaire par mois</dt>
                        <dd>{fmt(p.monthlyNeeded ?? 0)}</dd>
                      </div>
                    </>
                  )}
                  <div>
                    <dt>Atteinte estimée</dt>
                    <dd>
                      {p.reached ? (
                        'Déjà atteint'
                      ) : p.estimatedDate ? (
                        <>
                          {monthLabel(monthOf(p.estimatedDate))}
                          <span className="goal-sub">dans {p.monthsToReach} mois</span>
                        </>
                      ) : (
                        'Indiquez une contribution mensuelle'
                      )}
                    </dd>
                  </div>
                </dl>
                {p.onTrack === false && !p.reached && (
                  <Notice tone="attention">
                    {p.dateExceeded
                      ? 'La date souhaitée est dépassée. Vous pouvez la repousser.'
                      : `Pour tenir la date, prévoyez ${fmt(p.monthlyNeeded ?? 0)} par mois au lieu de ${fmt(g.monthlyContribution)}.`}
                  </Notice>
                )}
                {p.onTrack === true && !p.reached && <Notice tone="succes">Votre contribution permet d’atteindre l’objectif à temps.</Notice>}
                <div className="card-footer">
                  <Button variant="secondaire" className="btn-small" icon="plus" onClick={() => setDeposit({ goalId: g.id })}>
                    Ajouter un versement
                  </Button>
                  <Button
                    variant="discret"
                    className="btn-small"
                    aria-expanded={openHistory === g.id}
                    onClick={() => setOpenHistory(openHistory === g.id ? null : g.id)}
                  >
                    Versements ({deposits.length})
                  </Button>
                  <IconButton icon="edit" label={`Modifier l’objectif ${g.name}`} onClick={() => setEditing(g)} />
                  <IconButton icon="trash" label={`Supprimer l’objectif ${g.name}`} onClick={() => setToDelete(g)} />
                </div>
                {openHistory === g.id && (
                  <ul className="deposit-list">
                    {deposits.length === 0 && <li className="muted">Aucun versement enregistré.</li>}
                    {deposits.map((d) => (
                      <li key={d.id}>
                        <span>
                          {formatDate(d.date)} – <strong>{fmt(d.amount)}</strong>
                          {d.note && <span className="muted"> – {d.note}</span>}
                        </span>
                        <span>
                          <IconButton icon="edit" label={`Modifier le versement du ${formatDate(d.date)}`} onClick={() => setDeposit({ goalId: g.id, initial: d })} />
                          <IconButton icon="trash" label={`Supprimer le versement du ${formatDate(d.date)}`} onClick={() => setDepositToDelete(d)} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {freeDeposits.length > 0 && (
        <Card title="Épargne libre (sans objectif)">
          <ul className="deposit-list">
            {freeDeposits
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((d) => (
                <li key={d.id}>
                  <span>
                    {formatDate(d.date)} – <strong>{fmt(d.amount)}</strong>
                    {d.note && <span className="muted"> – {d.note}</span>}
                  </span>
                  <span>
                    <IconButton icon="edit" label={`Modifier le versement du ${formatDate(d.date)}`} onClick={() => setDeposit({ goalId: null, initial: d })} />
                    <IconButton icon="trash" label={`Supprimer le versement du ${formatDate(d.date)}`} onClick={() => setDepositToDelete(d)} />
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      <Card>
        <LineChart
          title="Évolution de l’épargne totale"
          description="Montant total mis de côté à la fin de chaque mois (6 derniers mois)."
          valueLabel="Épargne totale"
          emptyText="Aucune épargne enregistrée pour l’instant. Ajoutez un versement pour suivre son évolution."
          area
          points={evolution.map((e) => ({
            label: monthLabel(e.month),
            tick: monthLabelShort(e.month),
            value: e.total,
            detail: `Versé ce mois-ci : ${fmt(e.saved)}`,
          }))}
        />
      </Card>

      {editing && (
        <Modal title={editing === 'new' ? 'Nouvel objectif d’épargne' : 'Modifier l’objectif'} onClose={() => setEditing(null)} size="large">
          <GoalForm initial={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </Modal>
      )}
      {deposit && (
        <Modal title={deposit.initial ? 'Modifier le versement' : 'Nouveau versement d’épargne'} onClose={() => setDeposit(null)}>
          <DepositForm
            initial={deposit.initial}
            goalId={deposit.goalId}
            defaultDate={defaultDateFor(currentMonth, today)}
            onDone={() => setDeposit(null)}
            onCancel={() => setDeposit(null)}
          />
        </Modal>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Supprimer cet objectif ?"
          message={`L’objectif « ${toDelete.name} » sera supprimé. Les versements déjà enregistrés resteront comptés comme épargne libre.`}
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            dispatch({ type: 'removeGoal', id: toDelete.id });
            notify('Objectif supprimé.');
            setToDelete(null);
          }}
        />
      )}
      {depositToDelete && (
        <ConfirmDialog
          title="Supprimer ce versement ?"
          message={`Le versement de ${fmt(depositToDelete.amount)} du ${formatDate(depositToDelete.date)} sera supprimé.`}
          onCancel={() => setDepositToDelete(null)}
          onConfirm={() => {
            dispatch({ type: 'remove', collection: 'savings', id: depositToDelete.id });
            notify('Versement supprimé.');
            setDepositToDelete(null);
          }}
        />
      )}
    </div>
  );
}
