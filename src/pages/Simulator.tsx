import { useMemo, useState } from 'react';
import { useApp } from '../state/AppState';
import { simulatePurchase, VERDICT_LABELS } from '../lib/simulator';
import { parseAmount } from '../lib/money';
import { monthOf, ofMonth } from '../lib/dates';
import { BUDGET_LEVEL_LABELS } from '../lib/budget';
import { Card, CategoryOptions, MoneyField, Notice, PageHeader, SelectField, Stat } from '../components/ui';
import { Icon } from '../components/Icon';
import { checkAmount } from '../components/forms';

export function Simulator() {
  const { data, today, fmt } = useApp();
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [, error] = amount.trim() ? checkAmount(amount) : [null, null];
  const cents = !error ? parseAmount(amount) : null;

  const result = useMemo(
    () => (cents && cents > 0 ? simulatePurchase(data, cents, categoryId || null, today) : null),
    [data, cents, categoryId, today],
  );

  const verdictIcon = result?.verdict === 'confortable' ? 'check' : result?.verdict === 'prudence' ? 'alert' : 'stop';

  return (
    <div className="page">
      <PageHeader
        title="Simulateur d’achat"
        description={`Avant de craquer, regardez l’effet d’un achat sur votre budget ${ofMonth(monthOf(today))}.`}
      />
      <Card title="Achat envisagé">
        <form className="form-row" onSubmit={(e) => e.preventDefault()} noValidate>
          <MoneyField label="Montant de l’achat" value={amount} onChange={(e) => setAmount(e.target.value)} error={error} />
          <SelectField label="Catégorie" optional value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Aucune en particulier</option>
            <CategoryOptions categories={data.categories} kind="variable" />
          </SelectField>
        </form>
      </Card>

      {!result ? (
        <p className="muted">Saisissez un montant pour voir le résultat. Rien n’est enregistré : c’est une simple simulation.</p>
      ) : (
        <div aria-live="polite" className="stack">
          <section className={`verdict verdict-${result.verdict}`} aria-label="Appréciation">
            <Icon name={verdictIcon} size={28} />
            <div>
              <p className="verdict-title">{VERDICT_LABELS[result.verdict]}</p>
              <ul>
                {result.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className="stats-grid">
            <Stat label="Solde disponible avant" value={fmt(result.availableBefore)} />
            <Stat
              label="Solde restant après l’achat"
              value={fmt(result.availableAfter)}
              tone={result.availableAfter < 0 ? 'negatif' : 'positif'}
            />
            <Stat label="Reste à vivre par jour avant" value={result.dailyBefore === null ? '—' : fmt(result.dailyBefore)} />
            <Stat
              label="Nouveau reste à vivre par jour"
              value={result.dailyAfter === null ? '—' : fmt(result.dailyAfter)}
              tone={(result.dailyAfter ?? 0) < 0 ? 'negatif' : undefined}
              detail={`Sur ${result.daysRemaining} jour(s) restant(s)`}
            />
          </div>

          <div className="dashboard-grid">
            <Card title="Impact sur l’épargne du mois" headingLevel={2}>
              {data.profile && data.profile.monthlySavingsTarget > 0 ? (
                result.savingsImpact > 0 ? (
                  <Notice tone="attention">
                    L’achat réduirait l’épargne possible ce mois-ci de <strong>{fmt(result.savingsImpact)}</strong> (de{' '}
                    {fmt(result.savingsPossibleBefore)} à {fmt(result.savingsPossibleAfter)}).
                  </Notice>
                ) : (
                  <Notice tone="succes">L’épargne prévue ce mois-ci n’est pas affectée.</Notice>
                )
              ) : (
                <p className="muted">Aucun objectif d’épargne mensuel n’est défini (modifiable dans les paramètres).</p>
              )}
            </Card>
            <Card title="Impact sur la catégorie" headingLevel={2}>
              {!result.category ? (
                <p className="muted">Choisissez une catégorie pour vérifier son budget.</p>
              ) : result.category.budget === null ? (
                <p className="muted">
                  Pas de limite pour « {result.category.name} ». Dépensé après l’achat : {fmt(result.category.spentAfter)}.
                </p>
              ) : (
                <Notice tone={result.category.levelAfter === 'depasse' ? 'danger' : result.category.levelAfter === 'ok' ? 'succes' : 'attention'}>
                  « {result.category.name} » : {fmt(result.category.spentAfter)} sur {fmt(result.category.budget)} après l’achat —{' '}
                  {BUDGET_LEVEL_LABELS[result.category.levelAfter].toLowerCase()}
                  {result.category.remainingAfter !== null && result.category.remainingAfter < 0
                    ? ` (dépassement de ${fmt(-result.category.remainingAfter)}).`
                    : ` (reste ${fmt(result.category.remainingAfter ?? 0)}).`}
                </Notice>
              )}
            </Card>
          </div>

          <Card title="Impact sur vos objectifs d’épargne">
            {result.goals.length === 0 ? (
              <p className="muted">Aucun objectif en cours.</p>
            ) : (
              <ul className="tx-list">
                {result.goals.map((g) => (
                  <li key={g.goalId} className="tx">
                    <div>
                      <p className="tx-label">{g.name}</p>
                      <p className="tx-meta">
                        {g.monthsOfContribution !== null
                          ? `Cet achat représente ${String(g.monthsOfContribution).replace('.', ',')} mois de versements prévus.`
                          : 'Pas de contribution mensuelle définie.'}
                        {g.delayMonths > 0 && ` Retard possible : ${g.delayMonths} mois.`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Notice>
        Cette appréciation est une simple indication budgétaire calculée à partir de vos saisies. Ce n’est pas un conseil financier
        professionnel.
      </Notice>
    </div>
  );
}
