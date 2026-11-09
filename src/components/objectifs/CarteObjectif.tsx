import { Icon } from '../Icon';
import { useId, useState } from 'react';
import { useApp } from '../../state/AppState';
import { messageEtape, progressionObjectif, soldesSupports } from '../../lib/plan';
import type { SavingsDeposit, SavingsGoal } from '../../types';
import { goalTheme, JALONS, PRIORITY_LABELS, simulerContribution } from '../../lib/goals';
import { formatDate, monthLabel, monthOf } from '../../lib/dates';
import { sum } from '../../lib/money';
import { newId } from '../../lib/id';
import { Button, IconButton, Notice, ProgressBar } from '../ui';
import { IllustrationObjectif } from './IllustrationObjectif';

/** Montants proposés pour un versement rapide (en centimes). */
const VERSEMENTS_RAPIDES = [2000, 5000, 10000];

/** Anneau de progression (décoratif : le pourcentage est aussi écrit et donné par la barre de progression). */
function Anneau({ pct, atteint }: { pct: number; atteint: boolean }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className={`anneau ${atteint ? 'anneau-atteint' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" width="72" height="72">
        <circle cx="32" cy="32" r={r} className="anneau-piste" />
        <circle cx="32" cy="32" r={r} className="anneau-valeur" strokeDasharray={`${(c * pct) / 100} ${c}`} transform="rotate(-90 32 32)" />
      </svg>
      <span className="anneau-texte">{pct}&nbsp;%</span>
    </div>
  );
}

/** « Et si je mettais X € par mois ? » : un curseur qui recalcule la date d'arrivée. */
function SimulationMensuelle({ g }: { g: SavingsGoal }) {
  const { data, today, fmt, dispatch, notify } = useApp();
  const id = useId();
  const p = progressionObjectif(data, g, today);
  // En euros entiers : de 10 € jusqu'à de quoi finir en un mois (au moins 100 €)
  const max = Math.max(100, Math.ceil(p.remaining / 100 / 10) * 10);
  const depart = g.monthlyContribution || p.monthlyNeeded || Math.round(p.remaining / 12);
  const [euros, setEuros] = useState(() => Math.min(max, Math.max(10, Math.round(depart / 100 / 10) * 10)));
  const mensuel = euros * 100;
  const sim = simulerContribution(g, data.savings, today, mensuel, soldesSupports(data, today));
  const appliquer = () => {
    dispatch({
      type: 'upsert',
      collection: 'goals',
      item: { ...g, monthlyContribution: mensuel },
    });
    notify(`Contribution prévue pour « ${g.name} » : ${fmt(mensuel)} par mois.`);
  };
  return (
    <div className="objectif-simulation">
      <label htmlFor={id} className="objectif-simulation-titre">
        Et si je mettais <output htmlFor={id}>{fmt(mensuel)}</output> par mois&nbsp;?
      </label>
      <input
        id={id}
        type="range"
        min={10}
        max={max}
        step={10}
        value={euros}
        aria-valuetext={`${fmt(mensuel)} par mois`}
        onChange={(e) => setEuros(Number(e.target.value))}
      />
      {sim && (
        <p className="objectif-simulation-resultat" aria-live="polite">
          Objectif atteint en <strong>{monthLabel(monthOf(sim.estimatedDate))}</strong> (dans {sim.monthsToReach} mois)
          {sim.avantLaDate === true && (
            <span className="objectif-ok">
              {' '}
              – avant la date souhaitée <Icon name="check" size={16} className="icone-texte" />
            </span>
          )}
          {sim.avantLaDate === false && <span className="objectif-tard"> – après la date souhaitée ({formatDate(g.targetDate!)})</span>}
        </p>
      )}
      {mensuel !== g.monthlyContribution && (
        <Button variant="discret" className="btn-small" onClick={appliquer}>
          Prévoir {fmt(mensuel)} par mois
        </Button>
      )}
    </div>
  );
}

export function CarteObjectif({
  g,
  ouvrirVersement,
  supprimerVersement,
  modifier,
  supprimer,
  historiqueOuvert,
  basculerHistorique,
}: {
  g: SavingsGoal;
  ouvrirVersement: (initial?: SavingsDeposit) => void;
  supprimerVersement: (d: SavingsDeposit) => void;
  modifier: () => void;
  supprimer: () => void;
  historiqueOuvert: boolean;
  basculerHistorique: () => void;
}) {
  const { data, today, fmt, dispatch, notify } = useApp();
  const titreId = useId();
  const p = progressionObjectif(data, g, today);
  const theme = goalTheme(g);
  const currentMonth = monthOf(today);
  const deposits = data.savings.filter((s) => s.goalId === g.id).sort((a, b) => b.date.localeCompare(a.date));
  const prochainCap = p.reached ? undefined : JALONS.find((j) => p.pct < j && Math.ceil((g.target * j) / 100) > p.current);
  const verseCeMois = sum(deposits.filter((d) => monthOf(d.date) === currentMonth).map((d) => d.amount));
  // Prochaine petite étape : l'effort du mois (celui qui permet de tenir la date si elle est menacée).
  const etape = p.onTrack === false ? (p.monthlyNeeded ?? 0) : g.monthlyContribution || (p.monthlyNeeded ?? 0);

  /** Versement rapide daté du jour, annulable depuis la notification. */
  const verserRapidement = (montant: number) => {
    const id = newId('vers');
    const depot = { id, goalId: g.id, amount: montant, date: today, note: 'Versement rapide' };
    // Étape franchie (25, 50, 75, 100 %) : Poksy le fête dans la notification
    const cap = messageEtape(data, depot, today);
    dispatch({ type: 'upsert', collection: 'savings', item: depot });
    notify(cap ? `${fmt(montant)} mis de côté. ${cap}` : `${fmt(montant)} mis de côté pour « ${g.name} ».`, cap ? 'bravo' : 'succes', {
      label: 'Annuler',
      onClick: () => dispatch({ type: 'remove', collection: 'savings', id }),
    });
  };

  return (
    <article className={`card goal-card objectif theme-${theme} ${p.reached ? 'objectif-atteint' : ''}`} aria-labelledby={titreId}>
      <div className="objectif-principal">
        <div className="objectif-entete">
          <IllustrationObjectif theme={theme} className="objectif-illustration" />
          <div className="objectif-titre">
            <h3 id={titreId} className="card-title">
              {g.name}
            </h3>
            <p className="goal-meta">
              <span className={`tag tag-${g.priority}`}>{PRIORITY_LABELS[g.priority]}</span>
              {p.reached && (
                <span className="tag tag-ok">
                  <Icon name="check" size={14} className="icone-texte" /> Objectif atteint
                </span>
              )}
              {p.dateExceeded && <span className="tag tag-alerte">Date dépassée</span>}
            </p>
            {g.description && <p className="muted">{g.description}</p>}
          </div>
          <Anneau pct={p.pct} atteint={p.reached} />
        </div>

        <div className="objectif-progression">
          <p className="goal-amounts">
            <strong>{fmt(p.current)}</strong> sur {fmt(g.target)}
          </p>
          <ProgressBar value={p.current} max={g.target} level="objectif" label={`Progression de ${g.name}`} valueText={`${p.pct} %`} />
          <ol className="objectif-jalons" aria-label={`Étapes de ${g.name}`}>
            {JALONS.map((j) => {
              const atteint = p.pct >= j;
              return (
                <li key={j} className={atteint ? 'jalon-atteint' : ''}>
                  <span className="jalon-point" aria-hidden="true">
                    {atteint && <Icon name="check" size={12} />}
                  </span>
                  <span>{j === 100 ? 'Objectif' : `${j} %`}</span>
                  <span className="sr-only">{atteint ? ' : atteint' : ' : pas encore'}</span>
                </li>
              );
            })}
          </ol>
          {/* Le prochain cap, concret : combien il manque avant lui */}
          {prochainCap !== undefined && (
            <p className="jalon-suivant">
              Plus que <strong>{fmt(Math.ceil((g.target * prochainCap) / 100) - p.current)}</strong> avant{' '}
              {prochainCap === 100 ? 'l’objectif' : `${prochainCap}\u00a0%`}.
            </p>
          )}
        </div>

        {p.reached ? (
          <p className="objectif-bravo">
            <Icon name="sparkle" size={20} className="icone-texte objectif-bravo-icone" />
            Objectif atteint&nbsp;! Bravo, {fmt(g.target)} sont prêts pour «&nbsp;{g.name}&nbsp;».
          </p>
        ) : (
          <p className="goal-step">
            {p.pct > 0 ? `Tu as atteint ${p.pct} % de ton objectif.` : 'Ton objectif commence ici.'}{' '}
            {verseCeMois > 0
              ? `Ce mois-ci, tu as déjà mis ${fmt(verseCeMois)} de côté pour cet objectif.`
              : etape > 0
                ? `Prochaine étape : mettre ${fmt(etape)} de côté ce mois-ci.`
                : ''}
          </p>
        )}

        {!p.reached && (
          <div className="objectif-rapide" role="group" aria-label={`Versement rapide pour ${g.name}`}>
            <span className="objectif-rapide-titre">Versement rapide</span>
            {VERSEMENTS_RAPIDES.map((m) => (
              <button
                key={m}
                type="button"
                className="chip"
                onClick={() => verserRapidement(m)}
                aria-label={`Mettre ${fmt(m)} de côté pour ${g.name}`}
              >
                + {fmt(m).replace(/,00(?=\s?€)/, '')}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="objectif-details">
        {!p.reached && <SimulationMensuelle g={g} />}

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
                'Indique une contribution mensuelle'
              )}
            </dd>
          </div>
        </dl>
        {p.onTrack === false && !p.reached && (
          <Notice tone="attention">
            {p.dateExceeded
              ? 'La date souhaitée est dépassée. Tu peux la repousser.'
              : `Pour tenir la date, prévois ${fmt(p.monthlyNeeded ?? 0)} par mois au lieu de ${fmt(g.monthlyContribution)}.`}
          </Notice>
        )}
        {p.onTrack === true && !p.reached && <Notice tone="succes">Ta contribution permet d’atteindre l’objectif à temps.</Notice>}
      </div>

      <div className="objectif-pied">
        <div className="card-footer">
          <Button variant="secondaire" className="btn-small" icon="plus" onClick={() => ouvrirVersement()}>
            Ajouter un versement
          </Button>
          <Button variant="discret" className="btn-small" aria-expanded={historiqueOuvert} onClick={basculerHistorique}>
            Versements ({deposits.length})
          </Button>
          <IconButton icon="edit" label={`Modifier l’objectif ${g.name}`} onClick={modifier} />
          <IconButton icon="trash" label={`Supprimer l’objectif ${g.name}`} onClick={supprimer} />
        </div>
        {historiqueOuvert && (
          <ul className="deposit-list">
            {deposits.length === 0 && <li className="muted">Aucun versement enregistré.</li>}
            {deposits.map((d) => (
              <li key={d.id}>
                <span>
                  {formatDate(d.date)} – <strong>{fmt(d.amount)}</strong>
                  {d.note && <span className="muted"> – {d.note}</span>}
                </span>
                <span>
                  <IconButton icon="edit" label={`Modifier le versement du ${formatDate(d.date)}`} onClick={() => ouvrirVersement(d)} />
                  <IconButton icon="trash" label={`Supprimer le versement du ${formatDate(d.date)}`} onClick={() => supprimerVersement(d)} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
