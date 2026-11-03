import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { progressionObjectif } from '../lib/plan';
import type { SavingsDeposit, SavingsGoal } from '../types';
import { GOAL_EXAMPLES, sortGoals, themeFromName } from '../lib/goals';
import { savingsBalanceByMonth } from '../lib/budget';
import { defaultDateFor, formatDate, monthLabel, monthLabelShort, monthOf } from '../lib/dates';
import { IllustrationObjectif } from '../components/objectifs/IllustrationObjectif';
import { CarteObjectif } from '../components/objectifs/CarteObjectif';
import { sum } from '../lib/money';
import { Button, Card, ConfirmDialog, EmptyState, IconButton, Modal, PageHeader, Stat } from '../components/ui';
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
  // Idée d'objectif choisie depuis l'état vide (le formulaire s'ouvre avec ce nom)
  const [nomPropose, setNomPropose] = useState<string | null>(null);
  const fermerFormulaire = () => {
    setEditing(null);
    setNomPropose(null);
  };
  // « Créer un objectif » depuis Poksy : #/objectifs?ajouter=1 ouvre le formulaire (rien n'est enregistré sans validation)
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('ajouter') === '1') {
      setEditing('new');
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

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

      <section className="epargne-resume" aria-label="Résumé de votre épargne">
        <IllustrationObjectif theme="projet" className="epargne-resume-illustration" />
        <div className="stats-grid stats-compact">
          <Stat
            label={`Épargné en ${monthLabel(currentMonth)}`}
            value={fmt(savedThisMonth)}
            tone="epargne"
            detail={target > 0 ? `Objectif mensuel : ${fmt(target)} (${Math.round((savedThisMonth * 100) / target)}\u00a0%)` : undefined}
          />
          <Stat label="Total épargné" value={fmt(totalSaved)} tone="epargne" detail="Montants initiaux + versements" />
          <Stat label="Objectifs en cours" value={String(goals.filter((g) => !progressionObjectif(data, g, today).reached).length)} />
        </div>
      </section>

      {goals.length === 0 ? (
        <div className="objectifs-vide">
          <IllustrationObjectif theme="projet" className="objectifs-vide-illustration" />
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
          <div className="chips objectifs-idees" role="group" aria-label="Idées d’objectifs">
            {GOAL_EXAMPLES.slice(0, 5).map((nom) => (
              <button key={nom} type="button" className="chip" onClick={() => setNomPropose(nom)}>
                <IllustrationObjectif theme={themeFromName(nom)} className="chip-illustration" />
                {nom}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={`goal-grid ${goals.length === 1 ? 'goal-grid-seul' : ''}`}>
          {goals.map((g) => (
            <CarteObjectif
              key={g.id}
              g={g}
              ouvrirVersement={(initial) => setDeposit({ goalId: g.id, initial })}
              supprimerVersement={setDepositToDelete}
              modifier={() => setEditing(g)}
              supprimer={() => setToDelete(g)}
              historiqueOuvert={openHistory === g.id}
              basculerHistorique={() => setOpenHistory(openHistory === g.id ? null : g.id)}
            />
          ))}
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
                    <IconButton
                      icon="edit"
                      label={`Modifier le versement du ${formatDate(d.date)}`}
                      onClick={() => setDeposit({ goalId: null, initial: d })}
                    />
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

      {(editing || nomPropose) && (
        <Modal title={editing && editing !== 'new' ? 'Modifier l’objectif' : 'Nouvel objectif d’épargne'} onClose={fermerFormulaire} size="large">
          <GoalForm
            initial={editing && editing !== 'new' ? editing : undefined}
            nomPropose={nomPropose ?? undefined}
            onDone={fermerFormulaire}
            onCancel={fermerFormulaire}
          />
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
          message={`L’objectif « ${toDelete.name} » sera supprimé. Les versements déjà enregistrés resteront comptés comme épargne libre.`}
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
            const supprime = depositToDelete;
            dispatch({ type: 'remove', collection: 'savings', id: supprime.id });
            notify('Versement supprimé.', 'succes', {
              label: 'Annuler',
              onClick: () => dispatch({ type: 'upsert', collection: 'savings', item: supprime }),
            });
            setDepositToDelete(null);
          }}
        />
      )}
    </div>
  );
}
