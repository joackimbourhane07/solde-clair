import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppState';
import { objectifPrincipal, progressionObjectif, projection, totauxEpargne } from '../lib/plan';
import { reperesPourVous, sousTitreProfil } from '../lib/profil';
import {
  carryOverEnabled,
  dailyBalanceSeries,
  monthAlerts,
  monthSummary,
  monthTransactions,
  revenusSansDernierVersement,
  signedAmount,
  spendingByCategory,
} from '../lib/budget';
import { balanceForecast } from '../lib/forecast';
import { accountBalance, JOURS_A_VENIR_ACCUEIL, operationsAVenir, resteAVivre, usesCarteRestaurant } from '../lib/accounts';
import { sortGoals } from '../lib/goals';
import { allLimitsRespected, MAX_ACTIONS, suggestedActions } from '../lib/actions';
import { dayHeader, defaultDateFor, formatDate, lastDay, monthOf, ofMonth, parseISO, relativeDay } from '../lib/dates';
import { divideCents } from '../lib/money';
import { PROFILE_LABELS } from '../lib/categories';
import { Button, Card, MonthSwitcher, Notice, ProgressBar, SignedAmount, Stat } from '../components/ui';
import { ExpenseForm } from '../components/forms';
import { CategoryBarsChart, LineChart } from '../components/charts/Charts';
import { Icon } from '../components/Icon';
import { MontantAnime } from '../components/mouvement';

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
  // « Il vous reste » = exactement le solde de « Mon compte » ; « À venir » = aujourd'hui et les 3 prochains jours
  const reste = useMemo(() => resteAVivre(data, today), [data, today]);
  const prochaines = useMemo(() => operationsAVenir(data, 'tout', today, JOURS_A_VENIR_ACCUEIL), [data, today]);
  const actions = useMemo(() => suggestedActions(data, today, fmt), [data, today, fmt]);
  const prevision = useMemo(() => balanceForecast(data, today), [data, today]);
  const byCategory = useMemo(() => spendingByCategory(data, month, today), [data, month, today]);
  const series = useMemo(() => dailyBalanceSeries(data, month, today), [data, month, today]);
  const profile = data.profile!;
  // Reste disponible arrondi à l'euro inférieur, dépassement à l'euro supérieur.
  const short = (c: number) => fmtShort(c, 'prudent');
  const over = (c: number) => fmtShort(c, 'majore');

  // Chiffre principal : solde de « Mon compte » (mois en cours), solde à la fin du mois (mois passé), prévision (mois à venir)
  const soldeFinMois = s.period === 'passe' ? accountBalance(data, 'tout', lastDay(month), today) : 0;
  const principal = s.period === 'courant' ? reste.solde : s.period === 'passe' ? soldeFinMois : s.available;
  const signe = (c: number) => (c < 0 ? `− ${fmt(-c)}` : fmt(c));
  // Les montants de la phrase principale sont mis en valeur (vert s'ils sont positifs, rouge sinon).
  const V = ({ children }: { children: ReactNode }) => (
    <span className={`valeur ${principal < 0 ? 'montant-moins' : 'montant-plus'}`}>{children}</span>
  );
  let headline: ReactNode;
  let subline: string | null = null;
  if (s.period === 'passe') {
    headline =
      principal >= 0 ? (
        <>
          Mois terminé : il vous restait <V>{fmt(principal)}</V> à la fin du mois.
        </>
      ) : (
        <>
          Mois terminé avec un solde de <V>− {fmt(-principal)}</V>.
        </>
      );
  } else if (s.period === 'futur') {
    headline =
      principal >= 0 ? (
        <>
          Prévision : il vous resterait <V>{short(principal)}</V> sur ce mois.
        </>
      ) : (
        <>
          Prévision : les dépenses prévues dépasseraient les revenus de <V>{over(-principal)}</V>.
        </>
      );
  } else if (principal >= 0) {
    headline = (
      <>
        Il vous reste{' '}
        <V>
          <MontantAnime cents={principal} format={short} brut />
        </V>{' '}
        pour terminer le mois, soit environ{' '}
        <V>
          <MontantAnime cents={reste.parJour ?? 0} format={short} brut />
        </V>{' '}
        par jour.
      </>
    );
    if (s.savingsRemaining > 0 && reste.joursRestants > 0) {
      const apresEpargne = divideCents(principal - s.savingsRemaining, reste.joursRestants);
      subline =
        apresEpargne >= 0
          ? `En mettant aussi de côté les ${over(s.savingsRemaining)} d’épargne prévus, il vous resterait environ ${short(apresEpargne)} par jour.`
          : `Pour atteindre votre objectif d’épargne (${over(s.savingsRemaining)} restants), il faudrait réduire vos dépenses.`;
    }
  } else {
    headline = (
      <>
        Votre solde est de <V>− {over(-principal)}</V> aujourd’hui.
      </>
    );
    subline =
      'Les revenus prévus s’ajouteront le jour de leur arrivée. Si votre banque affiche un autre montant, ajustez le solde dans « Mon compte ».';
  }

  const visibles = actions.slice(0, MAX_ACTIONS);
  const epargneManque = Math.max(0, s.savingsTarget - s.saved);
  const epargnePct = s.savingsTarget > 0 ? Math.round((s.saved * 100) / s.savingsTarget) : null;
  // Objectifs en cours, avec leur pourcentage atteint (pour la carte « Épargne du mois »)
  const objectifs = useMemo(
    () =>
      sortGoals(data.goals)
        .map((g) => ({ g, p: progressionObjectif(data, g, today) }))
        .filter(({ p }) => !p.reached)
        .slice(0, 3),
    [data.goals, data.savings, today],
  );
  // Résumé de « Mon plan d'épargne » et repères selon le profil
  const plan = useMemo(() => {
    const o = objectifPrincipal(data, today);
    return o ? projection(data, o, today) : null;
  }, [data, today]);
  const epargneTotale = useMemo(() => totauxEpargne(data, today), [data, today]);
  const reperes = useMemo(() => reperesPourVous(data, today).slice(0, 2), [data, today]);
  const sousTitre = sousTitreProfil(data);
  const avecCarte = usesCarteRestaurant(data);
  const soldeCompte = useMemo(() => (avecCarte ? accountBalance(data, 'compte', today, today) : 0), [data, today, avecCarte]);
  const soldeCarte = useMemo(() => (avecCarte ? accountBalance(data, 'carte-restaurant', today, today) : 0), [data, today, avecCarte]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            {PROFILE_LABELS[profile.type]}
            {sousTitre && ` – ${sousTitre}`}
          </p>
          <h1>Bonjour {profile.name}</h1>
        </div>
        <MonthSwitcher />
      </header>

      {/* 1-2. Carte principale : disponible jusqu'à la fin du mois et par jour */}
      <section className={`hero carte-principale ${principal < 0 ? 'hero-negatif' : ''}`} aria-labelledby="hero-titre">
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
          level={
            s.budgetUsedPct === null
              ? 'sans'
              : s.budgetUsedPct > 100
                ? 'depasse'
                : s.budgetUsedPct >= 90
                  ? 'alerte'
                  : s.budgetUsedPct >= 75
                    ? 'attention'
                    : 'ok'
          }
        />
        {/* Aide contextuelle : le calcul avec les chiffres réels du mois */}
        <details className="disclosure">
          <summary>Comment est-ce calculé ?</summary>
          <div className="disclosure-body">
            {s.period === 'courant' ? (
              <>
                <dl className="calcul">
                  <div>
                    <dt>+ Revenus reçus</dt>
                    <dd className="montant-plus">{fmt(reste.detail.revenus)}</dd>
                  </div>
                  <div>
                    <dt>− Dépenses</dt>
                    <dd className="montant-moins">{fmt(reste.detail.depenses)}</dd>
                  </div>
                  <div>
                    <dt>− Charges fixes prélevées</dt>
                    <dd className="montant-moins">{fmt(reste.detail.charges)}</dd>
                  </div>
                  <div>
                    <dt>− Épargne versée</dt>
                    <dd className="montant-epargne">{fmt(reste.detail.epargne)}</dd>
                  </div>
                  {reste.detail.ajustements !== 0 && (
                    <div>
                      <dt>{reste.detail.ajustements > 0 ? '+' : '−'} Ajustements du solde</dt>
                      <dd className={reste.detail.ajustements > 0 ? 'montant-plus' : 'montant-moins'}>{fmt(Math.abs(reste.detail.ajustements))}</dd>
                    </div>
                  )}
                  <div className="calcul-total">
                    <dt>= Solde de « Mon compte » aujourd’hui</dt>
                    <dd className={reste.solde < 0 ? 'montant-moins' : 'montant-plus'}>{signe(reste.solde)}</dd>
                  </div>
                </dl>
                <p>
                  Tout ce qui est arrivé moins tout ce qui est parti, depuis votre première saisie ({formatDate(reste.detail.depuis)}).
                  {reste.parJour !== null &&
                    ` Divisé par ${reste.joursRestants} jour${reste.joursRestants > 1 ? 's' : ''} restant${reste.joursRestants > 1 ? 's' : ''} (aujourd’hui inclus), cela fait environ ${fmt(reste.parJour)} par jour.`}{' '}
                  Les opérations prévues ne sont pas encore comptées : elles s’ajoutent le jour où elles arrivent (voir « À venir »).
                </p>
              </>
            ) : (
              <>
                <dl className="calcul">
                  {s.carryOver !== 0 && (
                    <div>
                      <dt>{s.carryOver > 0 ? '+' : '−'} Report des mois précédents</dt>
                      <dd className={s.carryOver > 0 ? 'montant-plus' : 'montant-moins'}>{fmt(Math.abs(s.carryOver))}</dd>
                    </div>
                  )}
                  {s.adjustments !== 0 && (
                    <div>
                      <dt>{s.adjustments > 0 ? '+' : '−'} Ajustements du solde (onglet Compte)</dt>
                      <dd className={s.adjustments > 0 ? 'montant-plus' : 'montant-moins'}>{fmt(Math.abs(s.adjustments))}</dd>
                    </div>
                  )}
                  <div>
                    <dt>+ Revenus du mois</dt>
                    <dd className="montant-plus">{fmt(s.income)}</dd>
                  </div>
                  <div>
                    <dt>− Charges fixes (payées et à venir)</dt>
                    <dd className="montant-moins">{fmt(s.fixed)}</dd>
                  </div>
                  <div>
                    <dt>− Dépenses variables</dt>
                    <dd className="montant-moins">{fmt(s.variable)}</dd>
                  </div>
                  <div>
                    <dt>− Épargne déjà versée</dt>
                    <dd className="montant-epargne">{fmt(s.saved)}</dd>
                  </div>
                  <div className="calcul-total">
                    <dt>= Solde disponible du mois</dt>
                    <dd className={s.available < 0 ? 'montant-moins' : 'montant-plus'}>{fmt(s.available)}</dd>
                  </div>
                </dl>
                {s.dailyRemaining !== null && (
                  <p>
                    Divisé par {s.daysRemaining} jour{s.daysRemaining > 1 ? 's' : ''} restant{s.daysRemaining > 1 ? 's' : ''} (aujourd’hui inclus),
                    cela fait environ {fmt(s.dailyRemaining)} par jour. Les revenus et charges prévus plus tard dans le mois sont déjà comptés.
                  </p>
                )}
              </>
            )}
          </div>
        </details>
      </section>

      {/* Revenu récurrent qui commence fin de mois : le mois en cours n'a pas ce revenu (dernier versement oublié ?) */}
      {courant &&
        revenusSansDernierVersement(data, month).map((inc) => (
          <Notice key={inc.id} tone="attention">
            « {inc.name} » commence le {formatDate(inc.date)} et compte donc pour le mois prochain : ce mois-ci n’a pas ce revenu. Déjà reçu le mois
            dernier ?{' '}
            <Link to={`/revenus?dernier=${inc.id}`} className="link">
              Indiquer le dernier versement reçu
            </Link>
          </Notice>
        ))}

      {/* Mon objectif : résumé de « Mon plan d'épargne » */}
      {plan && courant && (
        <section className="card carte-plan" aria-labelledby="carte-plan-titre">
          <div className="card-header">
            <h2 id="carte-plan-titre" className="card-title">
              Mon objectif : {plan.objectif.name}
            </h2>
            <div className="card-actions">
              <Link to="/plan" className="link">
                Mon plan
              </Link>
            </div>
          </div>
          <p className="carte-plan-phrase">
            <strong className="valeur montant-epargne">{fmt(plan.progression.current)}</strong> sur {fmt(plan.objectif.target)} (
            {Math.round(plan.progression.pct)} %)
            {epargneTotale.bloquee > 0 && <span className="muted"> – dont {fmt(epargneTotale.disponible)} disponibles</span>}
          </p>
          <ProgressBar
            value={plan.progression.current}
            max={plan.objectif.target}
            level="objectif"
            label={`Avancement de l’objectif ${plan.objectif.name}`}
            valueText={`${Math.round(plan.progression.pct)} %`}
          />
          {!plan.progression.reached && (
            <p className="carte-plan-statut">
              <span className={`statut-plan ${plan.dansLesTemps ? 'statut-ok' : 'statut-retard'}`}>
                <Icon name={plan.dansLesTemps ? 'check' : 'alert'} size={16} />
                {plan.dansLesTemps ? 'Dans les temps' : 'En retard'}
              </span>{' '}
              – à épargner : <strong>{fmt(plan.necessaireParMois)}</strong> par mois pendant {plan.moisRestants} mois
              {plan.dansLesTemps ? '' : ` (il manquerait ${fmt(-plan.ecart)})`}.
            </p>
          )}
        </section>
      )}

      {/* Repères selon le profil (fin de contrat, été sans bourse, réserve…) */}
      {reperes.length > 0 && courant && (
        <section className="reperes-accueil" aria-label="Repères pour vous">
          {reperes.map((r) => (
            <div key={r.id} className="repere repere-accueil">
              <p className="repere-titre">{r.titre}</p>
              <p className="repere-texte">{r.texte}</p>
              {r.lien && (
                <Link to={r.lien.to} className="link">
                  {r.lien.label}
                </Link>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="dashboard-grid">
        {/* 3. À venir : charges et revenus prévus */}
        <Card
          title="À venir"
          actions={
            <Link to="/compte?vue=a-venir" className="link">
              Tout voir
            </Link>
          }
        >
          <p className="upcoming-summary">
            {prochaines.length === 0
              ? `Rien de prévu dans les ${JOURS_A_VENIR_ACCUEIL} prochains jours.`
              : `Dans les ${JOURS_A_VENIR_ACCUEIL} prochains jours : ${prochaines.length === 1 ? '1 opération prévue' : `${prochaines.length} opérations prévues`}, pas encore comptée${prochaines.length > 1 ? 's' : ''} dans votre solde.`}
          </p>
          {prochaines.length > 0 && (
            <ul className="tx-list">
              {prochaines.map((t) => (
                <li key={t.key} className="tx">
                  <div>
                    <p className="tx-label">{t.label}</p>
                    <p className="tx-meta">
                      {t.date < today ? `Prévu ${dayHeader(t.date, today).toLocaleLowerCase('fr')}, pas encore payé` : relativeDay(t.date, today)} –{' '}
                      {t.type === 'revenu' ? 'Revenu prévu' : t.categoryName}
                    </p>
                  </div>
                  <SignedAmount cents={Math.abs(signedAmount(t))} positive={signedAmount(t) >= 0} epargne={t.type === 'epargne'} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 4. Revenus et dépenses du mois */}
        <Card
          title={`Ce mois-ci`}
          actions={
            <Link to="/historique" className="link">
              Tout l’historique
            </Link>
          }
        >
          <div className="stats-grid stats-duo">
            <Stat label="Revenus" value={fmt(s.income)} tone="entree" />
            <Stat label="Total des dépenses" value={fmt(s.totalExpenses)} tone="sortie" detail="Charges fixes + dépenses variables" />
          </div>
          {avecCarte && (
            <p className="report-ligne">
              <Icon name="wallet" size={16} />
              <span>
                Soldes aujourd’hui : compte bancaire{' '}
                <strong className={soldeCompte < 0 ? 'montant-moins' : 'montant-plus'}>
                  {soldeCompte < 0 ? `− ${fmt(-soldeCompte)}` : fmt(soldeCompte)}
                </strong>
                , carte restaurant{' '}
                <strong className={soldeCarte < 0 ? 'montant-moins' : 'montant-plus'}>
                  {soldeCarte < 0 ? `− ${fmt(-soldeCarte)}` : fmt(soldeCarte)}
                </strong>
                .{' '}
                <Link to="/compte" className="link">
                  Mon compte
                </Link>
              </span>
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
                  <SignedAmount cents={signedAmount(t)} positive={signedAmount(t) >= 0} epargne={t.type === 'epargne'} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 5. Objectif d'épargne du mois */}
        <Card
          title="Épargne du mois"
          actions={
            <Link to="/objectifs" className="link">
              Mes objectifs
            </Link>
          }
        >
          {s.savingsTarget > 0 ? (
            <div className="savings-target">
              <p className="epargne-ligne">
                <span>
                  <strong>{fmt(s.saved)}</strong> mis de côté sur {fmt(s.savingsTarget)}
                </span>
                <span className="epargne-pct">
                  {epargnePct}
                  {'\u00a0'}%
                </span>
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
                    <span className="epargne-pct">
                      {p.pct}
                      {'\u00a0'}%
                    </span>
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
                      <Button
                        variant="discret"
                        className="btn-small"
                        onClick={() => dispatch({ type: 'dismissAction', id: a.id })}
                        aria-label={`Ignorer : ${a.title}`}
                      >
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
                  Aujourd’hui : {signe(prevision.start)} (le solde de « Mon compte », moins les charges pas encore payées). Ensuite, environ{' '}
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

        {/* Ajout rapide : sur ordinateur (sur mobile, le bouton « + » de la barre du bas suffit) */}
        <Card title="Ajouter une dépense" className="quick-add">
          <ExpenseForm quick defaultDate={defaultDateFor(month, today)} />
        </Card>
      </div>

      {/* 7. Un seul graphique visible ; le reste dans « Détail du mois » */}
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
                tone={s.carryOver < 0 ? 'negatif' : 'positif'}
                detail="Reste (ou dépassement) des mois d’avant"
              />
            )}
            <Stat label="Charges fixes" value={fmt(s.fixed)} tone="sortie" detail={`${fmt(s.fixedUpcoming)} encore à venir`} />
            <Stat label="Dépenses variables" value={fmt(s.variable)} tone="sortie" />
            <Stat
              label="Bilan du mois"
              value={fmt(s.available)}
              tone={s.available < 0 ? 'negatif' : 'positif'}
              detail="Revenus − dépenses − épargne du mois, report compris"
            />
            <Stat
              label="Épargné ce mois"
              value={fmt(s.saved)}
              detail={s.savingsTarget > 0 ? `Objectif du mois : ${fmt(s.savingsTarget)}` : 'Pas d’objectif mensuel'}
            />
            <Stat
              label="Reste à vivre par jour"
              value={(courant ? reste.parJour : s.dailyRemaining) === null ? '—' : fmt((courant ? reste.parJour : s.dailyRemaining)!)}
              tone={
                (courant ? reste.parJour : s.dailyRemaining) === null
                  ? undefined
                  : (courant ? reste.parJour : s.dailyRemaining)! < 0
                    ? 'negatif'
                    : 'positif'
              }
              detail={`${s.daysRemaining} jour(s) restant(s)`}
            />
            <Stat
              label="Prévision fin de mois"
              value={fmt(s.forecastEndBalance)}
              tone={s.forecastEndBalance < 0 ? 'negatif' : 'positif'}
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
