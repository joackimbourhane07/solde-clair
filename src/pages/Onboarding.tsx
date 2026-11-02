import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { ProfileType } from '../types';
import { CURRENCIES, formatMoney, parseAmount } from '../lib/money';
import { PROFILE_LABELS, PROFILE_PRESETS } from '../lib/categories';
import { buildInitialData, type SetupLine } from '../lib/setup';
import { Button, Card, CheckboxField, IconButton, MoneyField, Notice, SelectField, TextField } from '../components/ui';
import { checkAmount } from '../components/forms';
import { DataSection } from './Settings';
import { Icon } from '../components/Icon';

interface Line {
  key: number;
  name: string;
  amount: string;
  day: string;
  category: string;
}

const STEPS = ['Vous', 'Revenus', 'Charges fixes', 'Dépenses et épargne', 'Catégories', 'Récapitulatif'];
let lineKey = 0;
const newLine = (name = '', category = '', day = '5'): Line => ({ key: (lineKey += 1), name, amount: '', day, category });

/** Ligne de saisie (revenu ou charge). Définie hors du parcours pour garder le focus pendant la saisie. */
function LineRow({
  line,
  onChange,
  onRemove,
  kind,
  error,
  options,
}: {
  line: Line;
  onChange: (l: Line) => void;
  onRemove?: () => void;
  kind: 'income' | 'fixed';
  error?: string | null;
  options: string[];
}) {
  return (
    <div className="line-row">
      <TextField label="Nom" value={line.name} onChange={(e) => onChange({ ...line, name: e.target.value })} maxLength={60} />
      <MoneyField label="Montant mensuel" value={line.amount} onChange={(e) => onChange({ ...line, amount: e.target.value })} error={error} />
      <SelectField label="Catégorie" value={line.category} onChange={(e) => onChange({ ...line, category: e.target.value })}>
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </SelectField>
      <TextField
        label={kind === 'income' ? 'Jour de versement' : 'Jour de prélèvement'}
        type="number"
        min={1}
        max={31}
        inputMode="numeric"
        value={line.day}
        onChange={(e) => onChange({ ...line, day: e.target.value })}
      />
      {onRemove && <IconButton icon="trash" label={`Retirer la ligne ${line.name || ''}`} onClick={onRemove} className="line-remove" />}
    </div>
  );
}

export function Onboarding() {
  const { data: donnees, dispatch, today, notify } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<ProfileType>('etudiant');
  const [currency, setCurrency] = useState('EUR');
  const preset = PROFILE_PRESETS[type];

  const [mainIncome, setMainIncome] = useState<Line>(newLine('', preset.income[0], '1'));
  const [extras, setExtras] = useState<Line[]>([]);
  const [charges, setCharges] = useState<Line[]>(preset.suggestedCharges.map((c) => newLine(c, c)));
  const [variableEstimate, setVariableEstimate] = useState('');
  const [splitEstimate, setSplitEstimate] = useState(true);
  const [savingsTarget, setSavingsTarget] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalInitial, setGoalInitial] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [cats, setCats] = useState({ income: preset.income, fixed: preset.fixed, variable: preset.variable });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [custom, setCustom] = useState({ kind: 'variable' as 'income' | 'fixed' | 'variable', name: '' });
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Changer de profil propose automatiquement les catégories adaptées.
  useEffect(() => {
    const p = PROFILE_PRESETS[type];
    setCats({ income: p.income, fixed: p.fixed, variable: p.variable });
    setSelected(new Set([...p.income.map((n) => `income:${n}`), ...p.fixed.map((n) => `fixed:${n}`), ...p.variable.map((n) => `variable:${n}`)]));
    setMainIncome((l) => ({ ...l, category: p.income[0] }));
    setCharges(p.suggestedCharges.map((c) => newLine(c, c)));
  }, [type]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const amountOf = (v: string) => (v.trim() ? parseAmount(v) ?? 0 : 0);

  const validate = (): boolean => {
    const errs: Record<string, string | null> = {};
    if (step === 0) errs.name = name.trim() ? null : 'Indiquez un prénom ou un pseudonyme.';
    if (step === 1) {
      errs.main = checkAmount(mainIncome.amount, { allowZero: true, required: false })[1];
      extras.forEach((l) => {
        errs[`extra-${l.key}`] = checkAmount(l.amount, { allowZero: true, required: false })[1];
      });
    }
    if (step === 2) {
      charges.forEach((l) => {
        errs[`charge-${l.key}`] = checkAmount(l.amount, { allowZero: true, required: false })[1];
      });
    }
    if (step === 3) {
      errs.variable = checkAmount(variableEstimate, { allowZero: true, required: false })[1];
      errs.savings = checkAmount(savingsTarget, { allowZero: true, required: false })[1];
      errs.goalTarget = goalName.trim() ? checkAmount(goalTarget)[1] : null;
      errs.goalInitial = checkAmount(goalInitial, { allowZero: true, required: false })[1];
    }
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const toLine = (l: Line): SetupLine => ({ name: l.name, amount: amountOf(l.amount), day: Number(l.day) || 1, category: l.category });
  const pick = (kind: 'income' | 'fixed' | 'variable') => cats[kind].filter((n) => selected.has(`${kind}:${n}`));

  const finish = () => {
    const data = buildInitialData(
      {
        name,
        type,
        currency,
        mainIncome: { ...toLine(mainIncome), name: mainIncome.name || mainIncome.category },
        extraIncomes: extras.map(toLine),
        charges: charges.map(toLine),
        variableEstimate: amountOf(variableEstimate),
        splitEstimate,
        monthlySavingsTarget: amountOf(savingsTarget),
        longTermGoal: goalName.trim()
          ? { name: goalName, target: amountOf(goalTarget), initial: amountOf(goalInitial), targetDate: goalDate || null }
          : null,
        categories: { income: pick('income'), fixed: pick('fixed'), variable: pick('variable') },
        theme: donnees.settings.theme,
      },
      today,
    );
    dispatch({ type: 'replace', data });
    notify(`Bienvenue ${name.trim()} ! Votre budget est prêt.`);
    navigate('/');
  };

  const next = () => {
    if (!validate()) return;
    if (step === STEPS.length - 1) finish();
    else setStep(step + 1);
  };

  const totalIncome = amountOf(mainIncome.amount) + extras.reduce((a, l) => a + amountOf(l.amount), 0);
  const totalCharges = charges.reduce((a, l) => a + amountOf(l.amount), 0);
  const margin = totalIncome - totalCharges - amountOf(variableEstimate) - amountOf(savingsTarget);
  const fmt = (c: number) => formatMoney(c, currency);
  const kinds = ['income', 'fixed', 'variable'] as const;
  const kindLabel = { income: 'Revenus', fixed: 'Charges fixes', variable: 'Dépenses variables' };

  return (
    <div className="onboarding">
      <header className="onboarding-header">
        <span className="logo">
          <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">
            <rect width="64" height="64" rx="14" fill="currentColor" />
            <path d="M18 40c3 4 8 6 14 6 8 0 13-4 13-10 0-12-25-7-25-17 0-4 4-7 11-7 5 0 9 2 11 5" fill="none" stroke="var(--logo-ink)" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <span className="logo-text">SoldeClair</span>
        </span>
        <p className="onboarding-privacy">
          <Icon name="lock" size={16} /> Sans compte, sans banque : vos données restent sur cet appareil.
        </p>
      </header>

      <main className="onboarding-main" id="contenu">
        {/* Grand écran : énoncé à gauche, parcours encadré à droite (contenus existants uniquement). */}
        <aside className="onboarding-intro" aria-label="À propos de SoldeClair">
          <p className="eyebrow">Budget personnel</p>
          <p className="onboarding-statement">Gérez votre budget personnel, simplement.</p>
          <ul className="onboarding-facts">
            <li>
              <Icon name="lock" size={18} />
              <span>Sans compte et sans banque : aucune coordonnée bancaire n’est demandée.</span>
            </li>
            <li>
              <Icon name="home" size={18} />
              <span>Vos données restent enregistrées dans ce navigateur, sur cet appareil.</span>
            </li>
            <li>
              <Icon name="calendar" size={18} />
              <span>Quelques questions pour préparer votre budget : comptez environ deux minutes.</span>
            </li>
          </ul>
        </aside>

        <div className="onboarding-flow">
          <ol className="stepper" aria-label="Étapes de la configuration">
            {STEPS.map((s, i) => (
              <li key={s} className={i === step ? 'step-current' : i < step ? 'step-done' : ''} aria-current={i === step ? 'step' : undefined}>
                <span className="step-num">{i < step ? '✓' : i + 1}</span>
                <span className="step-label">{s}</span>
              </li>
            ))}
          </ol>

          <div className="hero-frame">
            <Card>
              <h1 ref={headingRef} tabIndex={-1} className="onboarding-title">
                {step === 0 && 'Bienvenue sur SoldeClair'}
                {step === 1 && 'Vos revenus mensuels'}
                {step === 2 && 'Vos charges fixes'}
                {step === 3 && 'Vos dépenses et votre épargne'}
                {step === 4 && 'Vos catégories'}
                {step === 5 && 'Tout est prêt !'}
              </h1>
              <p className="muted">
                Étape {step + 1} sur {STEPS.length}
                {step > 0 && step < 5 && ' · Vous pourrez tout modifier plus tard.'}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
                noValidate
                className="form"
              >
                {step === 0 && (
                  <>
                    <p>Quelques questions pour préparer votre budget. Comptez environ deux minutes.</p>
                    <p className="muted">
                      Vous préférez d’abord découvrir ?{' '}
                      <button
                        type="button"
                        className="lien-bouton"
                        onClick={() => document.getElementById('alt-titre')?.focus()}
                      >
                        Essayer avec un profil de démonstration
                      </button>
                    </p>
                    <div className="form-grid">
                      <TextField label="Prénom ou pseudonyme" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={40} autoComplete="nickname" />
                      <SelectField label="Devise" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                    <fieldset className="fieldset">
                      <legend>Quelle est votre situation ?</legend>
                      <div className="choice-grid">
                        {(Object.keys(PROFILE_LABELS) as ProfileType[]).map((t) => (
                          <label key={t} className={`choice ${type === t ? 'choice-on' : ''}`}>
                            <input type="radio" name="profil" value={t} checked={type === t} onChange={() => setType(t)} />
                            <span>{PROFILE_LABELS[t]}</span>
                          </label>
                        ))}
                      </div>
                      <p className="field-hint">Nous vous proposerons des catégories adaptées à votre situation.</p>
                    </fieldset>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h2 className="subhead">Revenu principal</h2>
                    <LineRow line={mainIncome} onChange={setMainIncome} kind="income" error={errors.main} options={cats.income} />
                    <h2 className="subhead">Revenus complémentaires</h2>
                    {extras.length === 0 && <p className="muted">Aides, job, aide familiale… Ajoutez-en si besoin.</p>}
                    {extras.map((l) => (
                      <LineRow
                        key={l.key}
                        line={l}
                        kind="income"
                        error={errors[`extra-${l.key}`]}
                        options={cats.income}
                        onChange={(n) => setExtras(extras.map((x) => (x.key === l.key ? n : x)))}
                        onRemove={() => setExtras(extras.filter((x) => x.key !== l.key))}
                      />
                    ))}
                    <Button icon="plus" onClick={() => setExtras([...extras, newLine('', cats.income[1] ?? cats.income[0])])}>
                      Ajouter un revenu complémentaire
                    </Button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className="muted">Laissez le montant vide pour ignorer une ligne.</p>
                    {charges.map((l) => (
                      <LineRow
                        key={l.key}
                        line={l}
                        kind="fixed"
                        error={errors[`charge-${l.key}`]}
                        options={cats.fixed}
                        onChange={(n) => setCharges(charges.map((x) => (x.key === l.key ? n : x)))}
                        onRemove={() => setCharges(charges.filter((x) => x.key !== l.key))}
                      />
                    ))}
                    <Button icon="plus" onClick={() => setCharges([...charges, newLine('', cats.fixed[0])])}>
                      Ajouter une charge fixe
                    </Button>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="form-grid">
                      <MoneyField
                        label="Estimation de vos dépenses variables par mois"
                        value={variableEstimate}
                        onChange={(e) => setVariableEstimate(e.target.value)}
                        error={errors.variable}
                        hint="Courses, sorties, carburant… Une estimation suffit."
                      />
                      <MoneyField
                        label="Objectif d’épargne mensuel"
                        value={savingsTarget}
                        onChange={(e) => setSavingsTarget(e.target.value)}
                        error={errors.savings}
                        hint="Ce que vous aimeriez mettre de côté chaque mois."
                      />
                    </div>
                    <CheckboxField
                      label="Répartir automatiquement mon estimation en limites par catégorie"
                      hint="Vous pourrez ajuster chaque limite dans « Budgets »."
                      checked={splitEstimate}
                      onChange={(e) => setSplitEstimate(e.target.checked)}
                    />
                    <h2 className="subhead">Objectif d’épargne à long terme (facultatif)</h2>
                    <div className="form-grid">
                      <TextField label="Nom de l’objectif" optional value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Ex. : fonds d’urgence" maxLength={60} />
                      <MoneyField label="Montant visé" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} error={errors.goalTarget} disabled={!goalName.trim()} />
                      <MoneyField label="Déjà mis de côté" value={goalInitial} onChange={(e) => setGoalInitial(e.target.value)} error={errors.goalInitial} disabled={!goalName.trim()} />
                      <TextField label="Date souhaitée" optional type="date" value={goalDate} onChange={(e) => setGoalDate(e.target.value)} disabled={!goalName.trim()} />
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <p>
                      Catégories proposées pour un profil <strong>{PROFILE_LABELS[type].toLowerCase()}</strong>. Décochez celles qui ne vous concernent pas.
                    </p>
                    {kinds.map((k) => (
                      <fieldset key={k} className="fieldset">
                        <legend>{kindLabel[k]}</legend>
                        <div className="chips">
                          {cats[k].map((n) => {
                            const id = `${k}:${n}`;
                            const on = selected.has(id);
                            return (
                              <label key={id} className={`chip ${on ? 'chip-on' : ''}`}>
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={on}
                                  onChange={() => {
                                    const s = new Set(selected);
                                    if (on) s.delete(id);
                                    else s.add(id);
                                    setSelected(s);
                                  }}
                                />
                                {on && <Icon name="check" size={14} />} {n}
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                    <div className="form-row">
                      <SelectField label="Type" value={custom.kind} onChange={(e) => setCustom({ ...custom, kind: e.target.value as typeof custom.kind })}>
                        {kinds.map((k) => (
                          <option key={k} value={k}>
                            {kindLabel[k]}
                          </option>
                        ))}
                      </SelectField>
                      <TextField label="Nouvelle catégorie" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} maxLength={60} />
                      <div className="form-actions">
                        <Button
                          icon="plus"
                          onClick={() => {
                            const n = custom.name.trim();
                            if (!n || cats[custom.kind].some((c) => c.toLocaleLowerCase('fr') === n.toLocaleLowerCase('fr'))) return;
                            setCats({ ...cats, [custom.kind]: [...cats[custom.kind], n] });
                            setSelected(new Set([...selected, `${custom.kind}:${n}`]));
                            setCustom({ ...custom, name: '' });
                          }}
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {step === 5 && (
                  <>
                    <dl className="recap">
                      <div>
                        <dt>Revenus mensuels</dt>
                        <dd>{fmt(totalIncome)}</dd>
                      </div>
                      <div>
                        <dt>Charges fixes</dt>
                        <dd>− {fmt(totalCharges)}</dd>
                      </div>
                      <div>
                        <dt>Dépenses variables estimées</dt>
                        <dd>− {fmt(amountOf(variableEstimate))}</dd>
                      </div>
                      <div>
                        <dt>Épargne prévue</dt>
                        <dd>− {fmt(amountOf(savingsTarget))}</dd>
                      </div>
                      <div className="recap-total">
                        <dt>Marge estimée</dt>
                        <dd>{fmt(margin)}</dd>
                      </div>
                    </dl>
                    {margin < 0 ? (
                      <Notice tone="attention">
                        Votre estimation dépasse vos revenus de {fmt(-margin)}. Pas d’inquiétude : SoldeClair vous aidera à repérer où ajuster.
                      </Notice>
                    ) : (
                      <Notice tone="succes">Votre budget prévisionnel est équilibré.</Notice>
                    )}
                  </>
                )}

                <div className="form-actions onboarding-actions">
                  {step > 0 && (
                    <Button icon="left" onClick={() => setStep(step - 1)}>
                      Retour
                    </Button>
                  )}
                  <button type="submit" className="btn btn-primaire">
                    <span>{step === STEPS.length - 1 ? 'Commencer' : 'Continuer'}</span>
                    <Icon name="right" size={18} />
                  </button>
                </div>
              </form>
            </Card>
          </div>

          {step === 0 && (
            <section className="onboarding-alt" aria-labelledby="alt-titre">
              <h2 id="alt-titre" className="section-title" tabIndex={-1}>
                Ou bien…
              </h2>
              <DataSection compact />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
