import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { Cents, TransactionType } from '../types';
import { earliestDate, monthReport, monthsHistory, spendingByCategory, transactionsInRange } from '../lib/budget';
import { capitalize, firstDay, formatDate, lastDay, monthLabel, monthLabelShort, monthOf, ofMonth } from '../lib/dates';
import { sum } from '../lib/money';
import { KIND_LABELS } from '../lib/categories';
import { downloadFile, exportCSV } from '../lib/storage';
import { Button, Card, EmptyState, MonthSwitcher, Notice, PageHeader, SelectField, SignedAmount, TextField } from '../components/ui';
import { CategoryBarsChart, IncomeExpenseChart } from '../components/charts/Charts';
import { Icon } from '../components/Icon';

const TYPE_LABELS: Record<TransactionType, string> = {
  revenu: 'Revenu',
  charge: 'Charge fixe',
  depense: 'Dépense',
  epargne: 'Épargne',
};

function Delta({ value, goodWhenUp }: { value: Cents; goodWhenUp: boolean }) {
  const { fmt } = useApp();
  if (value === 0) return <span className="delta">= stable</span>;
  const up = value > 0;
  const good = up === goodWhenUp;
  return (
    <span className={`delta ${good ? 'delta-bon' : 'delta-mauvais'}`}>
      <Icon name={up ? 'income' : 'expense'} size={14} /> {up ? 'en hausse de' : 'en baisse de'} {fmt(Math.abs(value))}
    </span>
  );
}

function Transactions() {
  const { data, month, today, fmt } = useApp();
  const [mode, setMode] = useState<'mois' | 'plage' | 'tout'>('mois');
  const [from, setFrom] = useState(firstDay(monthOf(today)));
  const [to, setTo] = useState(today);
  const [type, setType] = useState<'' | TransactionType>('');
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');

  const rangeError = mode === 'plage' && from && to && from > to ? 'La date de début doit précéder la date de fin.' : null;
  const [start, end] =
    mode === 'mois' ? [firstDay(month), lastDay(month)] : mode === 'plage' ? [from, to] : [earliestDate(data, today), lastDay(monthOf(today))];

  const all = useMemo(
    () => (start && end && !rangeError ? transactionsInRange(data, start, end, today) : []),
    [data, start, end, today, rangeError],
  );
  const filtered = all
    .filter((t) => (type ? t.type === type : true))
    .filter((t) => (category ? t.categoryId === category : true))
    .filter((t) => {
      if (!query.trim()) return true;
      const q = query.toLocaleLowerCase('fr');
      return `${t.label} ${t.categoryName} ${t.note} ${t.paymentMethod}`.toLocaleLowerCase('fr').includes(q);
    })
    .reverse();
  const inflow = sum(filtered.filter((t) => t.type === 'revenu').map((t) => t.amount));
  const outflow = sum(filtered.filter((t) => t.type !== 'revenu').map((t) => t.amount));

  return (
    <>
      <Card>
        <div className="filters">
          <SelectField label="Période" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="mois">Un mois</option>
            <option value="plage">Entre deux dates</option>
            <option value="tout">Tout l’historique</option>
          </SelectField>
          {mode === 'plage' && (
            <>
              <TextField label="Du" type="date" value={from} onChange={(e) => setFrom(e.target.value)} error={rangeError} />
              <TextField label="Au" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="">Tous les types</option>
            {(Object.keys(TYPE_LABELS) as TransactionType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Catégorie" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {(['income', 'fixed', 'variable'] as const).map((kind) => (
              <optgroup key={kind} label={KIND_LABELS[kind]}>
                {data.categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </SelectField>
          <TextField label="Rechercher" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Libellé, note…" />
        </div>
        {mode === 'mois' && <MonthSwitcher />}
        <p className="history-totals" aria-live="polite">
          <span>{filtered.length} transaction(s)</span>
          <span>
            Entrées : <strong>{fmt(inflow)}</strong>
          </span>
          <span>
            Sorties : <strong>{fmt(outflow)}</strong>
          </span>
        </p>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState title="Aucune transaction">Aucun mouvement ne correspond à ces critères.</EmptyState>
        ) : (
          <ul className="item-list">
            {filtered.map((t) => (
              <li key={t.key} className="item">
                <div className="item-main">
                  <p className="item-title">
                    {t.label} <span className={`tag tag-type-${t.type}`}>{TYPE_LABELS[t.type]}</span>
                    {t.status === 'a_venir' && <span className="tag">À venir</span>}
                  </p>
                  <p className="item-meta">
                    {formatDate(t.date)} · {t.categoryName}
                    {t.paymentMethod && ` · ${t.paymentMethod}`}
                  </p>
                </div>
                <SignedAmount cents={t.amount} positive={t.type === 'revenu'} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Report() {
  const { data, month, today, fmt } = useApp();
  const r = useMemo(() => monthReport(data, month, today), [data, month, today]);
  const history = useMemo(() => monthsHistory(data, month, 6, today), [data, month, today]);
  const s = r.summary;
  const p = r.previous;
  const rows: { label: string; cur: Cents; prev: Cents; delta: Cents; goodWhenUp: boolean }[] = [
    { label: 'Revenus du mois', cur: s.income, prev: p.income, delta: r.delta.income, goodWhenUp: true },
    { label: 'Charges fixes', cur: s.fixed, prev: p.fixed, delta: r.delta.fixed, goodWhenUp: false },
    { label: 'Dépenses variables', cur: s.variable, prev: p.variable, delta: r.delta.variable, goodWhenUp: false },
    { label: 'Montant épargné', cur: s.saved, prev: p.saved, delta: r.delta.saved, goodWhenUp: true },
    { label: 'Solde final', cur: s.available, prev: p.available, delta: r.delta.available, goodWhenUp: true },
  ];

  return (
    <>
      <MonthSwitcher />
      {s.period !== 'passe' && (
        <Notice>
          {s.period === 'courant'
            ? 'Le mois n’est pas terminé : ce bilan est provisoire.'
            : 'Ce mois n’a pas encore commencé : seuls les éléments prévus sont comptés.'}
        </Notice>
      )}
      <Card title={`Bilan ${ofMonth(month)}`}>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={`Bilan ${ofMonth(month)} comparé ${ofMonth(p.month)}`}>
          <table className="table table-bilan">
            <caption className="sr-only">Comparaison avec {monthLabel(p.month)}</caption>
            <thead>
              <tr>
                <th scope="col">Poste</th>
                <th scope="col" className="num">
                  {capitalize(monthLabel(month, false))}
                </th>
                <th scope="col" className="num">
                  {capitalize(monthLabel(p.month, false))}
                </th>
                <th scope="col" className="col-evolution">
                  Évolution
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className={row.label === 'Solde final' ? 'row-total' : ''}>
                  <th scope="row">
                    {row.label}
                    {/* Sur petit écran, l'évolution s'affiche sous le libellé (colonne masquée). */}
                    <span className="delta-mobile">
                      <Delta value={row.delta} goodWhenUp={row.goodWhenUp} />
                    </span>
                  </th>
                  <td className="num">{fmt(row.cur)}</td>
                  <td className="num">{fmt(row.prev)}</td>
                  <td className="col-evolution">
                    <Delta value={row.delta} goodWhenUp={row.goodWhenUp} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="dashboard-grid">
        <Card title="Catégories les plus coûteuses">
          {r.topCategories.length === 0 ? (
            <p className="muted">Aucune dépense ce mois-ci.</p>
          ) : (
            <ol className="rank-list">
              {r.topCategories.map((c) => (
                <li key={`${c.kind}-${c.name}`}>
                  <span>
                    {c.name} <span className="muted">({c.kind === 'charge' ? 'charge fixe' : 'dépense variable'})</span>
                  </span>
                  <strong>{fmt(c.amount)}</strong>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Budgets dépassés">
          {r.overBudget.length === 0 ? (
            <Notice tone="succes">Aucune catégorie n’a dépassé sa limite.</Notice>
          ) : (
            <ul className="rank-list">
              {r.overBudget.map((l) => (
                <li key={l.category.id}>
                  <span>
                    <Icon name="stop" size={16} /> {l.category.name}
                  </span>
                  <strong>
                    +{fmt(-(l.remaining ?? 0))} ({l.pct} %)
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="dashboard-grid">
        <Card>
          <IncomeExpenseChart
            title="Revenus et dépenses sur 6 mois"
            points={history.map((h) => ({ label: monthLabelShort(h.month), income: h.income, expenses: h.totalExpenses }))}
          />
        </Card>
        <Card>
          <CategoryBarsChart
            title="Répartition de toutes les dépenses"
            items={spendingByCategory(data, month, today, ['charge', 'depense'])}
          />
        </Card>
      </div>
    </>
  );
}

export function History() {
  const { data, today, notify } = useApp();
  const [params, setParams] = useSearchParams();
  const view = params.get('vue') === 'bilan' ? 'bilan' : 'transactions';
  const setView = (v: 'bilan' | 'transactions') => setParams(v === 'bilan' ? { vue: 'bilan' } : {}, { replace: true });

  return (
    <div className="page">
      <PageHeader
        title="Historique et bilan"
        description="Retrouvez tous vos mouvements et comparez vos mois."
        actions={
          <Button
            icon="download"
            onClick={() => {
              downloadFile(`soldeclair-transactions-${today}.csv`, exportCSV(data, today), 'text/csv;charset=utf-8');
              notify('Export CSV téléchargé.');
            }}
          >
            Exporter en CSV
          </Button>
        }
      />
      <div className="tabs" role="tablist" aria-label="Vue">
        <button type="button" role="tab" aria-selected={view === 'transactions'} className="tab" onClick={() => setView('transactions')}>
          Transactions
        </button>
        <button type="button" role="tab" aria-selected={view === 'bilan'} className="tab" onClick={() => setView('bilan')}>
          Bilan mensuel
        </button>
      </div>
      <div role="tabpanel">{view === 'bilan' ? <Report /> : <Transactions />}</div>
    </div>
  );
}
