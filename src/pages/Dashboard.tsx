import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppState';
import {
  dailyBalanceSeries,
  monthAlerts,
  monthSummary,
  monthTransactions,
  spendingByCategory,
  upcomingCharges,
} from '../lib/budget';
import { defaultDateFor, formatDate, monthOf, ofMonth, parseISO } from '../lib/dates';
import { formatMoneyShort } from '../lib/money';
import { PROFILE_LABELS } from '../lib/categories';
import { Card, Montant, MonthSwitcher, Notice, ProgressBar, SignedAmount, Stat } from '../components/ui';
import { ExpenseForm } from '../components/forms';
import { CategoryBarsChart, LineChart } from '../components/charts/Charts';
import { Icon } from '../components/Icon';

export function Dashboard() {
  const { data, month, today, fmt, currency } = useApp();
  const s = useMemo(() => monthSummary(data, month, today), [data, month, today]);
  const alerts = useMemo(() => monthAlerts(data, month, today, fmt), [data, month, today, fmt]);
  const recent = useMemo(
    () =>
      monthTransactions(data, month, today)
        .filter((t) => t.date <= today)
        .reverse()
        .slice(0, 6),
    [data, month, today],
  );
  const upcoming = useMemo(() => upcomingCharges(data, today, 30).slice(0, 5), [data, today]);
  const byCategory = useMemo(() => spendingByCategory(data, month, today), [data, month, today]);
  const series = useMemo(() => dailyBalanceSeries(data, month, today), [data, month, today]);
  const profile = data.profile!;
  // Reste disponible arrondi à l'euro inférieur, dépassement à l'euro supérieur.
  const short = (c: number) => formatMoneyShort(c, currency, 'prudent');
  const over = (c: number) => formatMoneyShort(c, currency, 'majore');

  // Les montants de la phrase principale sont mis en valeur (couleur « valeur »).
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

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{PROFILE_LABELS[profile.type]}</p>
          <h1>Bonjour {profile.name}</h1>
        </div>
        <MonthSwitcher />
      </header>

      <section className={`hero ${s.available < 0 ? 'hero-negatif' : ''}`} aria-labelledby="hero-titre">
        <div className="hero-statement">
          <h2 id="hero-titre" className="sr-only">
            Reste à vivre {ofMonth(month)}
          </h2>
          <p className="hero-text">{headline}</p>
          {subline && <p className="hero-sub">{subline}</p>}
          {/* Aide contextuelle : le calcul avec les chiffres réels du mois */}
          <details className="disclosure">
            <summary>Comment est-ce calculé ?</summary>
            <div className="disclosure-body">
              <dl className="calcul">
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
        </div>

        <div className="hero-frame">
          <div className="hero-panel">
            <p className="hero-panel-label">{s.period === 'passe' ? 'Solde final du mois' : 'Par jour jusqu’à la fin du mois'}</p>
            <p className="hero-figure">
              <Montant cents={s.period === 'passe' ? s.available : (s.dailyRemaining ?? 0)} />
            </p>
            <dl className="hero-facts">
              {s.period === 'passe' ? (
                <>
                  <div>
                    <dt>Revenus du mois</dt>
                    <dd>{fmt(s.income)}</dd>
                  </div>
                  <div>
                    <dt>Dépenses du mois</dt>
                    <dd>{fmt(s.totalExpenses)}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt>Disponible ce mois</dt>
                    <dd>{fmt(s.available)}</dd>
                  </div>
                  <div>
                    <dt>{s.period === 'courant' ? 'Jours restants' : 'Jours du mois'}</dt>
                    <dd>{s.daysRemaining}</dd>
                  </div>
                </>
              )}
            </dl>
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
                <Icon name="gauge" size={16} /> {s.budgetUsedPct === null ? 'Aucun revenu ce mois-ci' : `${s.budgetUsedPct}\u00a0% des revenus déjà dépensés`}
              </span>
            </div>
            <ProgressBar
              value={s.totalExpenses}
              max={s.income}
              label="Part des revenus déjà dépensée"
              valueText={s.budgetUsedPct === null ? 'Aucun revenu' : `${s.budgetUsedPct}\u00a0% des revenus dépensés`}
              level={s.budgetUsedPct === null ? 'sans' : s.budgetUsedPct > 100 ? 'depasse' : s.budgetUsedPct >= 90 ? 'alerte' : s.budgetUsedPct >= 75 ? 'attention' : 'ok'}
            />
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <Card title="Ajouter une dépense" className="quick-add">
          <ExpenseForm quick defaultDate={defaultDateFor(month, today)} />
        </Card>

        <Card title="Alertes budgétaires" className="alerts-card">
          {alerts.length === 0 ? (
            <Notice tone="succes">Aucune alerte : votre budget est sous contrôle.</Notice>
          ) : (
            <ul className="alert-list">
              {alerts.slice(0, 5).map((a, i) => (
                <li key={i}>
                  <Notice tone={a.level === 'danger' ? 'danger' : a.level === 'attention' ? 'attention' : 'info'}>{a.message}</Notice>
                </li>
              ))}
            </ul>
          )}
          {alerts.length > 5 && (
            <Link to="/budgets" className="link">
              Voir les {alerts.length} alertes
            </Link>
          )}
        </Card>
      </div>

      <section aria-labelledby="chiffres-titre">
        <h2 id="chiffres-titre" className="section-title">
          Les chiffres {ofMonth(month)}
        </h2>
        <div className="stats-grid">
          <Stat label="Revenus" value={fmt(s.income)} />
          <Stat label="Charges fixes" value={fmt(s.fixed)} detail={`${fmt(s.fixedUpcoming)} encore à venir`} />
          <Stat label="Dépenses variables" value={fmt(s.variable)} />
          <Stat label="Total des dépenses" value={fmt(s.totalExpenses)} />
          <Stat label="Solde disponible" value={fmt(s.available)} tone={s.available < 0 ? 'negatif' : 'positif'} detail="Revenus − dépenses − épargne" />
          <Stat
            label="Épargné ce mois"
            value={fmt(s.saved)}
            detail={s.savingsTarget > 0 ? `Objectif du mois : ${fmt(s.savingsTarget)}` : 'Pas d’objectif mensuel'}
          />
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
        {s.savingsTarget > 0 && (
          <div className="savings-target">
            <p>
              Épargne du mois : <strong>{fmt(s.saved)}</strong> sur {fmt(s.savingsTarget)}
              {s.saved >= s.savingsTarget ? ' — objectif atteint' : ''}
            </p>
            <ProgressBar
              value={s.saved}
              max={s.savingsTarget}
              level="objectif"
              label="Progression de l’épargne du mois"
              valueText={`${fmt(s.saved)} épargnés sur ${fmt(s.savingsTarget)}`}
            />
          </div>
        )}
      </section>

      <div className="dashboard-grid">
        <Card title="Dernières transactions" actions={<Link to="/historique" className="link">Tout l’historique</Link>}>
          {recent.length === 0 ? (
            <p className="muted">Aucune transaction pour ce mois.</p>
          ) : (
            <ul className="tx-list">
              {recent.map((t) => (
                <li key={t.key} className="tx">
                  <div>
                    <p className="tx-label">{t.label}</p>
                    <p className="tx-meta">
                      {formatDate(t.date)} · {t.type === 'epargne' ? 'Épargne' : t.categoryName}
                    </p>
                  </div>
                  <SignedAmount cents={t.amount} positive={t.type === 'revenu'} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Prochaines charges fixes" actions={<Link to="/charges" className="link">Gérer</Link>}>
          {upcoming.length === 0 ? (
            <p className="muted">Aucune charge à venir dans les 30 prochains jours.</p>
          ) : (
            <ul className="tx-list">
              {upcoming.map((t) => (
                <li key={t.key} className="tx">
                  <div>
                    <p className="tx-label">{t.label}</p>
                    <p className="tx-meta">
                      {t.date === today ? 'Aujourd’hui' : `Le ${formatDate(t.date)}`} · {t.categoryName}
                    </p>
                  </div>
                  <span className="montant">{fmt(t.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <CategoryBarsChart title="Répartition des dépenses variables" items={byCategory} />
        </Card>
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

      <p className="page-footer-links">
        <Link to="/historique?vue=bilan" className="link">
          Voir le bilan {ofMonth(month)}
        </Link>
        {' · '}
        <Link to="/simulateur" className="link">
          Simuler un achat
        </Link>
      </p>
    </div>
  );
}
