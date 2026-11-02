import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppState';
import {
  carryOverEnabled,
  dailyBalanceSeries,
  monthAlerts,
  monthSummary,
  monthTransactions,
  signedAmount,
  spendingByCategory,
  upcomingItems,
  upcomingSummary,
} from '../lib/budget';
import { balanceForecast } from '../lib/forecast';
import { accountBalance, usesCarteRestaurant } from '../lib/accounts';
import { goalProgress, sortGoals } from '../lib/goals';
import { allLimitsRespected, MAX_ACTIONS, suggestedActions } from '../lib/actions';
import { defaultDateFor, formatDate, monthOf, ofMonth, parseISO, relativeDay } from '../lib/dates';
import { PROFILE_LABELS } from '../lib/categories';
import { Button, Card, MonthSwitcher, Notice, ProgressBar, SignedAmount, Stat } from '../components/ui';
import { ExpenseForm } from '../components/forms';
import { CategoryBarsChart, LineChart } from '../components/charts/Charts';
import { Icon } from '../components/Icon';

/** Priorité exprimée en mots (pas seulement par la couleur). */
const PRIORITES = { 1: 'À traiter maintenant', 2: 'Bientôt', 3: 'Quand vous avez un moment' } as const;

export function Dashboard() {
  const { data, month, today, fmt, fmtShort, dispatch } = useApp();
  const courant = month === monthOf(today);
  const s = useMemo(() => monthSummary(data, month, today), [data, month, today]);
  const alerts = useMemo(() => monthAlerts(data, month, today, fmt), [data, month, today, fmt]);
  const recent = useMemo(
    () =>
      monthTransactions(data, month, today)
        .filter((t) => t.date <= today)
        .reverse()
        .slice(0, 3),
    [data, month, today],
  );
  const upcoming = useMemo(() => upcomingItems(data, today, 30).slice(0, 5), [data, today]);
  const actions = useMemo(() => suggestedActions(data, today, fmt), [data, today, fmt]);
  const prevision = useMemo(() => balanceForecast(data, today), [data, today]);
  const semaine = useMemo(() => upcomingSummary(data, today, 7), [data, today]);
  const byCategory = useMemo(() => spendingByCategory(data, month, today), [data, month, today]);
  const series = useMemo(() => dailyBalanceSeries(data, month, today), [data, month, today]);
  const profile = data.profile!;
  // Reste disponible arrondi à l'euro inférieur, dépassement à l'euro supérieur.
  const short = (c: number) => fmtShort(c, 'prudent');
  const over = (c: number) => fmtShort(c, 'majore');

  // Les montants de la phrase principale sont mis en valeur (accent bleu).
  const V = ({ children }: { children: ReactNode }) => <span className="valeur">{children}</span>;
  let headline: ReactNode;
  let subline: string | null = null;
  if (s.period === 'passe') {
    headline =
      s.available >= 0 ? (
        <>
          Mois terminé : il vous est resté <V>{fmt(s.available)}</V>.
        </>
      ) : (
        <>
          Mois terminé avec un dépassement de <V>{fmt(-s.available)}</V>.
        </>
      );
  } else if (s.available >= 0) {
    headline = (
      <>
        Il vous reste <V>{short(s.available)}</V> pour terminer le mois, soit environ <V>{short(s.dailyRemaining ?? 0)}</V> par jour.
      </>
    );
    if (s.savingsRemaining > 0) {
      subline =
        (s.dailyAfterSavings ?? 0) >= 0
          ? `En mettant aussi de côté les ${over(s.savingsRemaining)} d’épargne prévus, il vous resterait environ ${short(s.dailyAfterSavings ?? 0)} par jour.`
          : `Pour atteindre votre objectif d’épargne (${over(s.savingsRemaining)} restants), il faudrait réduire vos dépenses.`;
    }
  } else {
    headline = (
      <>
        Vos dépenses dépassent vos revenus de <V>{over(-s.available)}</V> ce mois-ci.
      </>
    );
    subline = 'Essayez de limiter les dépenses non essentielles jusqu’à la fin du mois.';
  }

  const visibles = actions.slice(0, MAX_ACTIONS);
  const epargneManque = Math.max(0, s.savingsTarget - s.saved);
  const epargnePct = s.savingsTarget > 0 ? Math.round((s.saved * 100) / s.savingsTarget) : null;
  // Objectifs en cours, avec leur pourcentage atteint (pour la carte « Épargne du mois »)
  const objectifs = useMemo(
    () =>
      sortGoals(data.goals)
        .map((g) => ({ g, p: goalProgress(g, data.savings, today) }))
        .filter(({ p }) => !p.reached)
        .slice(0, 3),
    [data.goals, data.savings, today],
  );
  const avecCarte = usesCarteRestaurant(data);
  const soldeCompte = useMemo(() => (avecCarte ? accountBalance(data, 'compte', today, today) : 0), [data, today, avecCarte]);
  const soldeCarte = useMemo(() => (avecCarte ? accountBalance(data, 'carte-restaurant', today, today) : 0), [data, today, avecCarte]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{PROFILE_LABELS[profile.type]}</p>
          <h1>Bonjour {profile.name}</h1>
        </div>
        <MonthSwitcher />
      </header>

      {/* 1-2. Carte principale : disponible jusqu'à la fin du mois et par jour */}
      <section className={`hero carte-principale ${s.available < 0 ? 'hero-negatif' : ''}`} aria-labelledby="hero-titre">
        <h2 id="hero-titre" className="sr-only">
          Reste à vivre {ofMonth(month)}
        </h2>
        <p className="hero-text">{headline}</p>
        {subline && <p className="hero-sub">{subline}</p>}
        <div className="hero-meta">
          <span>
            <Icon name="calendar" size={16} />{' '}
            {s.period === 'courant'
              ? `${s.daysRemaining} jour${s.daysRemaining > 1 ? 's' : ''} restant${s.daysRemaining > 1 ? 's' : ''} (aujourd’hui inclus)`
              : s.period === 'futur'
                ? `Mois à venir : ${s.daysInMonth} jours`
                : 'Mois terminé'}
          </span>
          <span>
            <Icon name="gauge" size={16} /> {s.budgetUsedPct === null ? 'Aucun revenu ce mois-ci' : `${s.budgetUsedPct} % des revenus déjà dépensés`}
          </span>
        </div>
        <ProgressBar
          value={s.totalExpenses}
          max={s.income}
          label="Part des revenus déjà dépensée"
          valueText={s.budgetUsedPct === null ? 'Aucun revenu' : `${s.budgetUsedPct} % des revenus dépensés`}
          level={s.budgetUsedPct === null ? 'sans' : s.budgetUsedPct > 100 ? 'depasse' : s.budgetUsedPct >= 90 ? 'alerte' : s.budgetUsedPct >= 75 ? 'attention' : 'ok'}
        />
        {/* Aide contextuelle : le calcul avec les chiffres réels du mois */}
        <details className="disclosure">
          <summary>Comment est-ce calculé ?</summary>
          <div className="disclosure-body">
            <dl className="calcul">
              {s.carryOver !== 0 && (
                <div>
                  <dt>{s.carryOver > 0 ? '+' : '−'} Report des mois précédents</dt>
                  <dd>{fmt(Math.abs(s.carryOver))}</dd>
                </div>
              )}
              {s.adjustments !== 0 && (
                <div>
                  <dt>{s.adjustments > 0 ? '+' : '−'} Ajustements du solde (onglet Compte)</dt>
                  <dd>{fmt(Math.abs(s.adjustments))}</dd>
                </div>
              )}
              <div>
                <dt>+ Revenus du mois</dt>
                <dd>{fmt(s.income)}</dd>
              </div>
              <div>
                <dt>− Charges fixes (payées et à venir)</dt>
                <dd>{fmt(s.fixed)}</dd>
              </div>
              <div>
                <dt>− Dépenses variables</dt>
                <dd>{fmt(s.variable)}</dd>
              </div>
              <div>
                <dt>− Épargne déjà versée</dt>
                <dd>{fmt(s.saved)}</dd>
              </div>
              <div className="calcul-total">
                <dt>= Solde disponible du mois</dt>
                <dd>{fmt(s.available)}</dd>
              </div>
            </dl>
            {s.dailyRemaining !== null && (
              <p>
                Divisé par {s.daysRemaining} jour{s.daysRemaining > 1 ? 's' : ''} restant{s.daysRemaining > 1 ? 's' : ''} (aujourd’hui
                inclus), cela fait environ {fmt(s.dailyRemaining)} par jour. Les revenus et charges prévus plus tard dans le mois sont déjà
                comptés.
              </p>
            )}
          </div>
        </details>
      </section>

      <div className="dashboard-grid">
        {/* 3. À venir : charges et revenus attendus */}
        <Card title="À venir" actions={<Link to="/charges" className="link">Mes charges</Link>}>
          <p className="upcoming-summary">
            {semaine.count === 0
              ? 'Aucune charge prévue dans les 7 prochains jours.'
              : `Dans les 7 prochains jours : ${semaine.count === 1 ? '1 charge prévue' : `${semaine.count} charges prévues`} pour un total de ${fmt(semaine.total)}.`}
          </p>
          {upcoming.length === 0 ? (
            <p className="muted">Rien de prévu dans les 30 prochains jours.</p>
          ) : (
            <ul className="tx-list">
              {upcoming.map((t) => (
                <li key={t.key} className="tx">
                  <div>
                    <p className="tx-label">{t.label}</p>
                    <p className="tx-meta">
                      {relativeDay(t.date, today)} – {t.type === 'revenu' ? 'Revenu attendu' : t.categoryName}
                    </p>
                  </div>
                  {t.type === 'revenu' ? <SignedAmount cents={t.amount} positive /> : <span className="montant">{fmt(t.amount)}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 4. Revenus et dépenses du mois */}
        <Card title={`Ce mois-ci`} actions={<Link to="/historique" className="link">Tout l’historique</Link>}>
          <div className="stats-grid stats-duo">
            <Stat label="Revenus" value={fmt(s.income)} />
            <Stat label="Total des dépenses" value={fmt(s.totalExpenses)} detail="Charges fixes + dépenses variables" />
          </div>
          {avecCarte && (
            <p className="report-ligne">
              <Icon name="wallet" size={16} />
              <span>
                Soldes aujourd’hui : compte bancaire {soldeCompte < 0 ? `− ${fmt(-soldeCompte)}` : fmt(soldeCompte)}, carte restaurant{' '}
                {soldeCarte < 0 ? `− ${fmt(-soldeCarte)}` : fmt(soldeCarte)}.{' '}
                <Link to="/compte" className="link">
                  Mon compte
                </Link>
              </span>
            </p>
          )}
          {s.carryOver !== 0 && (
            <p className="report-ligne">
              <Icon name="repeat" size={16} /> Report des mois précédents : {s.carryOver > 0 ? '+' : '−'} {fmt(Math.abs(s.carryOver))}, compté dans votre disponible.
            </p>
          )}
          {recent.length === 0 ? (
            <p className="muted">Aucune opération pour ce mois.</p>
          ) : (
            <ul className="tx-list">
              {recent.map((t) => (
                <li key={t.key} className="tx">
                  <div>
                    <p className="tx-label">{t.label}</p>
                    <p className="tx-meta">
                      {formatDate(t.date)} – {t.type === 'epargne' ? 'Épargne' : t.categoryName}
                    </p>
                  </div>
                  <SignedAmount cents={signedAmount(t)} positive={signedAmount(t) >= 0} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 5. Objectif d'épargne du mois */}
        <Card title="Épargne du mois" actions={<Link to="/objectifs" className="link">Mes objectifs</Link>}>
          {s.savingsTarget > 0 ? (
            <div className="savings-target">
              <p className="epargne-ligne">
                <span>
                  <strong>{fmt(s.saved)}</strong> mis de côté sur {fmt(s.savingsTarget)}
                </span>
                <span className="epargne-pct">{epargnePct}{'\u00a0'}%</span>
              </p>
              <ProgressBar
                value={s.saved}
                max={s.savingsTarget}
                level="objectif"
                label="Progression de l’épargne du mois"
                valueText={`${epargnePct}\u00a0% de l’objectif du mois : ${fmt(s.saved)} épargnés sur ${fmt(s.savingsTarget)}`}
              />
              <p className="muted">
                {epargneManque === 0
                  ? `Objectif du mois atteint à ${epargnePct}\u00a0%. Bravo !`
                  : `${epargnePct}\u00a0% de l’objectif du mois : il vous manque ${fmt(epargneManque)}.`}
              </p>
            </div>
          ) : (
            <p className="muted">Aucun objectif d’épargne mensuel. Vous pouvez en fixer un dans vos paramètres.</p>
          )}
          {objectifs.length > 0 && (
            <ul className="objectifs-mini" aria-label="Objectifs en cours">
              {objectifs.map(({ g, p }) => (
                <li key={g.id}>
                  <p className="epargne-ligne">
                    <span className="objectif-nom">{g.name}</span>
                    <span className="epargne-pct">{p.pct}{'\u00a0'}%</span>
                  </p>
                  <ProgressBar value={p.current} max={g.target} level="objectif" label={`Objectif ${g.name}`} valueText={`${p.pct}\u00a0% atteint`} />
                  <p className="muted petit-texte">
                    {fmt(p.current)} sur {fmt(g.target)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 6. Actions utiles (mois en cours) ou alertes (autres mois) */}
        {courant ? (
          <Card title="À faire" className="actions-card">
            {visibles.length === 0 ? (
              <Notice tone="succes">
                {allLimitsRespected(data, today)
                  ? 'Rien à faire pour l’instant : toutes vos limites sont respectées ce mois-ci.'
                  : 'Rien à faire pour l’instant : votre budget est à jour.'}
              </Notice>
            ) : (
              <ul className="actions-list">
                {visibles.map((a) => (
                  <li key={a.id} className={`action action-p${a.priority}`}>
                    <span className={`tag tag-priorite-${a.priority}`}>{PRIORITES[a.priority]}</span>
                    <p className="action-titre">{a.title}</p>
                    <p className="action-detail">{a.detail}</p>
                    <div className="action-boutons">
                      <Link to={a.to} className="btn btn-secondaire btn-small">
                        {a.cta}
                      </Link>
                      <Button variant="discret" className="btn-small" onClick={() => dispatch({ type: 'dismissAction', id: a.id })} aria-label={`Ignorer : ${a.title}`}>
                        Ignorer
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {actions.length > MAX_ACTIONS && (
              <p className="muted actions-plus">
                {actions.length - MAX_ACTIONS === 1 ? '1 autre action' : `${actions.length - MAX_ACTIONS} autres actions`} après celles-ci.
              </p>
            )}
          </Card>
        ) : (
          <Card title="Alertes du mois" className="alerts-card">
            {alerts.length === 0 ? (
              <Notice tone="succes">Aucune alerte pour ce mois.</Notice>
            ) : (
              <ul className="alert-list">
                {alerts.slice(0, 5).map((a, i) => (
                  <li key={i}>
                    <Notice tone={a.level === 'danger' ? 'danger' : a.level === 'attention' ? 'attention' : 'info'}>{a.message}</Notice>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* Estimation du disponible à 7, 15 et 30 jours (mois en cours) */}
        {courant && (
          <Card title="Estimation des 30 prochains jours" className="prevision-card" actions={<span className="tag tag-recurrent">Estimation</span>}>
            <p className="prevision-phrase">
              {prevision.lowest.balance < 0
                ? `Attention vers le ${formatDate(prevision.lowest.date)} : il pourrait manquer environ ${over(-prevision.lowest.balance)}${
                    prevision.points[2].balance >= 0 ? ', avant le retour à environ ' + short(prevision.points[2].balance) + ' dans 30 jours' : ''
                  }.`
                : `Si tout se passe comme prévu, il vous resterait environ ${short(prevision.points[2].balance)} dans 30 jours.`}
            </p>
            <dl className="prevision-points">
              {prevision.points.map((p) => (
                <div key={p.days} className={p.balance < 0 ? 'negatif' : ''}>
                  <dt>Dans {p.days} jours</dt>
                  <dd>{p.balance < 0 ? `− ${fmt(-p.balance)}` : fmt(p.balance)}</dd>
                </div>
              ))}
            </dl>
            <details className="disclosure">
              <summary>Ce qui compte dans l’estimation</summary>
              <div className="disclosure-body">
                <p>
                  Aujourd’hui : {fmt(prevision.start)} (
                  {prevision.carryOver !== 0 ? 'report des mois précédents, plus ' : ''}revenus reçus moins charges, dépenses et épargne{' '}
                  {ofMonth(monthOf(today), false)}). Ensuite, environ{' '}
                  {fmt(prevision.dailyVariable)} de dépenses courantes par jour{' '}
                  {prevision.basis === 'rythme' ? '(votre rythme du mois)' : '(d’après vos limites prévues)'}.
                </p>
                {prevision.events.length > 0 && (
                  <ul className="tx-list">
                    {prevision.events.slice(0, 8).map((e) => (
                      <li key={`${e.date}-${e.label}`} className="tx">
                        <div>
                          <p className="tx-label">{e.label}</p>
                          <p className="tx-meta">{relativeDay(e.date, today)}</p>
                        </div>
                        <SignedAmount cents={Math.abs(e.amount)} positive={e.amount > 0} />
                      </li>
                    ))}
                  </ul>
                )}
                <p className="muted">
                  {carryOverEnabled(data)
                    ? 'Estimation indicative fondée sur vos saisies, report des mois précédents compris.'
                    : 'Estimation indicative fondée sur vos saisies : l’argent des mois précédents n’est pas compté (report désactivé).'}
                </p>
              </div>
            </details>
            <Link to="/simulateur" className="link">
              Simuler une dépense sans rien enregistrer
            </Link>
          </Card>
        )}

        {/* Ajout rapide : sur ordinateur (sur mobile, le bouton « + » de la barre du bas suffit) */}
        <Card title="Ajouter une dépense" className="quick-add">
          <ExpenseForm quick defaultDate={defaultDateFor(month, today)} />
        </Card>
      </div>

      {/* 7. Un seul graphique visible ; le reste dans « Détail du mois » */}
      <Card>
        <CategoryBarsChart title="Répartition des dépenses variables" items={byCategory} />
      </Card>

      <details className="disclosure detail-mois">
        <summary>Détail du mois</summary>
        <div className="disclosure-body">
          <div className="stats-grid">
            {carryOverEnabled(data) && (
              <Stat
                label="Report des mois précédents"
                value={s.carryOver < 0 ? `− ${fmt(-s.carryOver)}` : fmt(s.carryOver)}
                tone={s.carryOver < 0 ? 'negatif' : undefined}
                detail="Reste (ou dépassement) des mois d’avant"
              />
            )}
            <Stat label="Charges fixes" value={fmt(s.fixed)} detail={`${fmt(s.fixedUpcoming)} encore à venir`} />
            <Stat label="Dépenses variables" value={fmt(s.variable)} />
            <Stat label="Solde disponible" value={fmt(s.available)} tone={s.available < 0 ? 'negatif' : 'positif'} detail="Revenus − dépenses − épargne" />
            <Stat label="Épargné ce mois" value={fmt(s.saved)} detail={s.savingsTarget > 0 ? `Objectif du mois : ${fmt(s.savingsTarget)}` : 'Pas d’objectif mensuel'} />
            <Stat label="Reste à vivre par jour" value={s.dailyRemaining === null ? '—' : fmt(s.dailyRemaining)} detail={`${s.daysRemaining} jour(s) restant(s)`} />
            <Stat
              label="Prévision fin de mois"
              value={fmt(s.forecastEndBalance)}
              tone={s.forecastEndBalance < 0 ? 'negatif' : undefined}
              detail={
                s.forecastBasis === 'rythme'
                  ? 'Si vous gardez le même rythme de dépenses'
                  : s.forecastBasis === 'plan'
                    ? 'D’après vos budgets prévus'
                    : 'Montant réel'
              }
            />
          </div>
          <Card>
            <LineChart
              title="Évolution du solde au cours du mois"
              emptyText="Aucun mouvement enregistré pour ce mois."
              description={
                monthOf(today) === month
                  ? 'Revenus moins dépenses, charges et épargne, jour après jour jusqu’à aujourd’hui.'
                  : 'Revenus moins dépenses, charges et épargne, jour après jour.'
              }
              valueLabel="Solde"
              area
              points={series.map((p) => ({ label: formatDate(p.date), tick: String(parseISO(p.date).day), value: p.balance }))}
            />
          </Card>
        </div>
      </details>

      <p className="page-footer-links">
        <Link to="/historique?vue=bilan" className="link">
          Voir le bilan {ofMonth(month)}
        </Link>
        {' – '}
        <Link to="/simulateur" className="link">
          Simuler un achat
        </Link>
      </p>
    </div>
  );
}
