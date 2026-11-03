import { Icon } from '../Icon';
import { Link } from 'react-router-dom';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useApp } from '../../state/AppState';
import { niceTicks, visibleTickIndexes } from '../../lib/chartScale';

/* -------------------------------------------------------------------------- */
/* Outils communs                                                              */
/* -------------------------------------------------------------------------- */

/** Largeur réelle du conteneur (les textes restent à taille fixe sur mobile). */
function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(Math.max(240, Math.floor(node.getBoundingClientRect().width) || fallback));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(update);
    obs.observe(node);
    return () => obs.disconnect();
  }, [fallback]);
  return { ref, width };
}

export interface TableRow {
  label: string;
  values: string[];
}

export function ChartFrame({
  title,
  description,
  legend,
  table,
  children,
}: {
  title: string;
  description?: string;
  legend?: { label: string; className: string }[];
  table: { headers: string[]; rows: TableRow[] };
  children: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <figure className="chart" aria-labelledby={`${id}-titre`}>
      <div className="chart-head">
        <figcaption id={`${id}-titre`} className="chart-title">
          {title}
        </figcaption>
        <button type="button" className="btn btn-discret btn-small" aria-pressed={showTable} onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Voir le graphique' : 'Voir le tableau'}
        </button>
      </div>
      {description && <p className="chart-description">{description}</p>}
      {legend && legend.length > 1 && !showTable && (
        <ul className="chart-legend">
          {legend.map((l) => (
            <li key={l.label}>
              <span className={`legend-swatch ${l.className}`} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      )}
      {showTable ? (
        <div className="table-scroll" tabIndex={0} role="region" aria-label={`${title} (tableau)`}>
          <table className="table">
            <thead>
              <tr>
                {table.headers.map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  {r.values.map((v, i) => (
                    <td key={i} className="num">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}

function useKeyboardIndex(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (count === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a === null ? 0 : Math.min(count - 1, a + 1)));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a === null ? count - 1 : Math.max(0, a - 1)));
    } else if (e.key === 'Escape') setActive(null);
  };
  return { active, setActive, onKeyDown };
}

/* -------------------------------------------------------------------------- */
/* 1. Répartition par catégorie (barres horizontales)                         */
/* -------------------------------------------------------------------------- */

export function CategoryBarsChart({
  title,
  items,
  emptyText = 'Aucune dépense ce mois-ci.',
}: {
  title: string;
  /** `lien` : la ligne ouvre cette page (ex. les dépenses de la catégorie). */
  items: { name: string; amount: number; lien?: string }[];
  emptyText?: string;
}) {
  const { fmt } = useApp();
  const total = items.reduce((a, b) => a + b.amount, 0);
  const max = Math.max(1, ...items.map((i) => i.amount));
  const shown = items.slice(0, 7);
  const rest = items.slice(7);
  const rows: { name: string; amount: number; lien?: string }[] =
    rest.length > 0 ? [...shown, { name: 'Autres catégories', amount: rest.reduce((a, b) => a + b.amount, 0) }] : shown;
  return (
    <ChartFrame
      title={title}
      table={{
        headers: ['Catégorie', 'Montant', 'Part'],
        rows: items.map((i) => ({ label: i.name, values: [fmt(i.amount), `${total ? Math.round((i.amount * 100) / total) : 0}\u00a0%`] })),
      }}
    >
      {rows.length === 0 ? (
        <p className="chart-empty">{emptyText}</p>
      ) : (
        <ul className="hbars">
          {rows.map((r) => (
            <li key={r.name} className={`hbar ${r.lien ? 'hbar-cliquable' : ''}`} title={`${r.name} : ${fmt(r.amount)}`}>
              <div className="hbar-text">
                {r.lien ? (
                  <Link to={r.lien} className="hbar-name hbar-lien">
                    {r.name}
                    <Icon name="right" size={14} />
                  </Link>
                ) : (
                  <span className="hbar-name">{r.name}</span>
                )}
                <span className="hbar-value">
                  {fmt(r.amount)}{' '}
                  <span className="muted">
                    ({total ? Math.round((r.amount * 100) / total) : 0}
                    {'\u00a0'}%)
                  </span>
                </span>
              </div>
              <div className="hbar-track" aria-hidden="true">
                <div className="hbar-fill" style={{ width: `${Math.max(1.5, (r.amount / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Revenus et dépenses par mois (barres groupées)                          */
/* -------------------------------------------------------------------------- */

export function IncomeExpenseChart({ title, points }: { title: string; points: { label: string; income: number; expenses: number }[] }) {
  const { fmt, fmtShort } = useApp();
  const { ref, width } = useWidth<HTMLDivElement>();
  const { active, setActive, onKeyDown } = useKeyboardIndex(points.length);
  const height = 220;
  const m = { top: 12, right: 8, bottom: 28, left: 56 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const maxV = Math.max(100, ...points.flatMap((p) => [p.income, p.expenses]));
  const ticks = niceTicks(0, maxV);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => m.top + innerH - (v / top) * innerH;
  const band = innerW / Math.max(1, points.length);
  const barW = Math.max(6, Math.min(28, (band - 14) / 2));

  return (
    <ChartFrame
      title={title}
      legend={[
        { label: 'Revenus', className: 'serie-entree' },
        { label: 'Dépenses (charges + variables)', className: 'serie-sortie' },
      ]}
      table={{
        headers: ['Mois', 'Revenus', 'Dépenses', 'Différence'],
        rows: points.map((p) => ({ label: p.label, values: [fmt(p.income), fmt(p.expenses), fmt(p.income - p.expenses)] })),
      }}
    >
      <div className="chart-plot" ref={ref}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title}. Utilisez les flèches pour parcourir les mois.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
              <text x={m.left - 6} y={y(t) + 4} className="tick" textAnchor="end">
                {fmtShort(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const cx = m.left + band * i + band / 2;
            return (
              <g key={p.label} onPointerEnter={() => setActive(i)}>
                <rect x={m.left + band * i} y={m.top} width={band} height={innerH} className="hit" />
                {active === i && <rect x={m.left + band * i + 2} y={m.top} width={band - 4} height={innerH} className="hover-band" />}
                <rect x={cx - barW - 1} y={y(p.income)} width={barW} height={Math.max(0, y(0) - y(p.income))} rx={3} className="bar serie-entree" />
                <rect x={cx + 1} y={y(p.expenses)} width={barW} height={Math.max(0, y(0) - y(p.expenses))} rx={3} className="bar serie-sortie" />
                <text x={cx} y={height - 8} className="tick" textAnchor="middle">
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
        {active !== null && points[active] && (
          <div className="chart-tooltip" style={{ left: Math.min(width - 170, Math.max(0, m.left + band * active + band / 2 - 85)) }}>
            <strong>{points[active].label}</strong>
            <span>
              <span className="legend-swatch serie-entree" aria-hidden="true" /> Revenus : {fmt(points[active].income)}
            </span>
            <span>
              <span className="legend-swatch serie-sortie" aria-hidden="true" /> Dépenses : {fmt(points[active].expenses)}
            </span>
          </div>
        )}
      </div>
    </ChartFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Courbe (évolution du solde, de l'épargne)                               */
/* -------------------------------------------------------------------------- */

export function LineChart({
  title,
  description,
  points,
  valueLabel,
  area = false,
  emptyText = 'Pas encore de données pour ce graphique.',
}: {
  title: string;
  description?: string;
  points: { label: string; tick?: string; value: number; detail?: string }[];
  valueLabel: string;
  area?: boolean;
  /** Message affiché quand toutes les valeurs sont nulles. */
  emptyText?: string;
}) {
  const { fmt, fmtShort } = useApp();
  const { ref, width } = useWidth<HTMLDivElement>();
  const { active, setActive, onKeyDown } = useKeyboardIndex(points.length);
  const height = 200;
  const m = { top: 12, right: 12, bottom: 28, left: 56 };
  const innerW = width - m.left - m.right;
  const innerH = height - m.top - m.bottom;
  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(0, ...values), Math.max(100, ...values));
  const lo = ticks[0];
  const hi = ticks[ticks.length - 1];
  const x = (i: number) => m.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => m.top + innerH - ((v - lo) / (hi - lo)) * innerH;
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const areaPath = points.length > 0 ? `${path} L${x(points.length - 1)},${y(Math.max(lo, 0))} L${x(0)},${y(Math.max(lo, 0))} Z` : '';
  // Libellés de l’axe horizontal espacés d’au moins 68 px (jamais superposés).
  const tickIndexes = new Set(
    visibleTickIndexes(
      points.map((_, i) => x(i)),
      68,
    ),
  );
  const vide = points.length === 0 || points.every((p) => p.value === 0);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = points.length <= 1 ? 0 : Math.round(((px - m.left) / innerW) * (points.length - 1));
    setActive(Math.max(0, Math.min(points.length - 1, i)));
  };

  const last = points[points.length - 1];
  return (
    <ChartFrame
      title={title}
      description={description}
      table={{ headers: ['Date', valueLabel], rows: points.map((p) => ({ label: p.label, values: [fmt(p.value)] })) }}
    >
      {vide ? (
        <p className="chart-empty">{emptyText}</p>
      ) : (
        <div className="chart-plot" ref={ref}>
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${title}. Dernière valeur : ${last ? fmt(last.value) : ''}. Utilisez les flèches pour parcourir les points.`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerMove={onMove}
            onPointerLeave={() => setActive(null)}
            onBlur={() => setActive(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis' : 'grid'} />
                <text x={m.left - 6} y={y(t) + 4} className="tick" textAnchor="end">
                  {fmtShort(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) =>
              tickIndexes.has(i) ? (
                <text
                  key={p.label}
                  x={x(i)}
                  y={height - 8}
                  className="tick"
                  textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                >
                  {p.tick ?? p.label}
                </text>
              ) : null,
            )}
            {area && <path d={areaPath} className="line-area" />}
            <path d={path} className="line serie-1" />
            {last && <circle cx={x(points.length - 1)} cy={y(last.value)} r={4} className="dot serie-1" />}
            {active !== null && points[active] && (
              <>
                <line x1={x(active)} x2={x(active)} y1={m.top} y2={m.top + innerH} className="crosshair" />
                <circle cx={x(active)} cy={y(points[active].value)} r={5} className="dot serie-1 dot-active" />
              </>
            )}
          </svg>
          {active !== null && points[active] && (
            <div className="chart-tooltip" style={{ left: Math.min(width - 170, Math.max(0, x(active) - 85)) }}>
              <strong>{points[active].label}</strong>
              <span>
                {valueLabel} : {fmt(points[active].value)}
              </span>
              {points[active].detail && <span className="muted">{points[active].detail}</span>}
            </div>
          )}
        </div>
      )}
    </ChartFrame>
  );
}
