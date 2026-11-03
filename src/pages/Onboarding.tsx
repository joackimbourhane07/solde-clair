import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { ISODate, ProfileType } from '../types';
import { CURRENCIES, formatMoney, parseAmount } from '../lib/money';
import { PROFILE_LABELS, PROFILE_PRESETS } from '../lib/categories';
import { buildInitialData, dernierVersementPropose, type SetupLine } from '../lib/setup';
import { accountBalance } from '../lib/accounts';
import { isValidISODate } from '../lib/dates';
import { newId } from '../lib/id';
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
  /** Revenu : dernier versement reçu (prérempli d'après le jour, modifiable, vide = pas encore reçu). */
  dernier: string;
  dernierModifie: boolean;
}

const STEPS = ['Tu', 'Revenus', 'Charges fixes', 'Dépenses et épargne', 'Catégories', 'Récapitulatif'];
let lineKey = 0;
const newLine = (name = '', category = '', day = '5', today?: ISODate): Line => ({
  key: (lineKey += 1),
  name,
  amount: '',
  day,
  category,
  dernier: today ? dernierVersementPropose(Number(day) || 1, today) : '',
  dernierModifie: false,
});

/** Ligne de saisie (revenu ou charge). Définie hors du parcours pour garder le focus pendant la saisie. */
function LineRow({
  line,
  onChange,
  onRemove,
  kind,
  error,
  options,
  today,
  erreurDernier,
}: {
  line: Line;
  onChange: (l: Line) => void;
  onRemove?: () => void;
  kind: 'income' | 'fixed';
  error?: string | null;
  options: string[];
  today: ISODate;
  erreurDernier?: string | null;
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
        onChange={(e) =>
          onChange({
            ...line,
            day: e.target.value,
            // Le dernier versement suit le jour tant qu'il n'a pas été modifié à la main
            dernier: kind === 'income' && !line.dernierModifie ? dernierVersementPropose(Number(e.target.value) || 1, today) : line.dernier,
          })
        }
      />
      {onRemove && <IconButton icon="trash" label={`Retirer la ligne ${line.name || ''}`} onClick={onRemove} className="line-remove" />}
      {kind === 'income' && (
        <div className="line-row-plein">
          <TextField
            label="Dernier versement reçu"
            optional
            type="date"
            max={today}
            value={line.dernier}
            error={erreurDernier}
            onChange={(e) => onChange({ ...line, dernier: e.target.value, dernierModifie: true })}
            hint="Compté tout de suite. Vide si pas encore reçu."
          />
        </div>
      )}
    </div>
  );
}

export function Onboarding() {
  const { data: donnees, dispatch, today, notify, profils } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<ProfileType>('etudiant');
  const [currency, setCurrency] = useState('EUR');
  const preset = PROFILE_PRESETS[type];

  const [mainIncome, setMainIncome] = useState<Line>(() => newLine('', preset.income[0], '1', today));
  // Solde du compte aujourd'hui (facultatif) : SoldeClair part de ce montant
  const [soldeActuel, setSoldeActuel] = useState('');
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
    // Depuis la présentation (« Essayer la démonstration ») : on amène directement à la démonstration et à l'import.
    const alt = (location.state as { demo?: boolean } | null)?.demo && step === 0 ? document.getElementById('alt-titre') : null;
    if (alt) {
      alt.focus();
      alt.scrollIntoView?.({ block: 'start' });
    } else headingRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const amountOf = (v: string) => (v.trim() ? (parseAmount(v) ?? 0) : 0);

  const validate = (): boolean => {
    const errs: Record<string, string | null> = {};
    if (step === 0) errs.name = name.trim() ? null : 'Indique un prénom ou un pseudonyme.';
    if (step === 1) {
      errs.main = checkAmount(mainIncome.amount, { allowZero: true, required: false })[1];
      const dateKo = (l: Line) =>
        (l.dernier &&
          (!isValidISODate(l.dernier) ? 'Date invalide.' : l.dernier > today ? 'Le dernier versement doit être aujourd’hui ou avant.' : null)) ||
        null;
      errs['dernier-main'] = dateKo(mainIncome);
      extras.forEach((l) => {
        errs[`extra-${l.key}`] = checkAmount(l.amount, { allowZero: true, required: false })[1];
        errs[`dernier-${l.key}`] = dateKo(l);
      });
      errs.solde = checkAmount(soldeActuel, { allowZero: true, required: false })[1];
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

  const toLine = (l: Line): SetupLine => ({
    name: l.name,
    amount: amountOf(l.amount),
    day: Number(l.day) || 1,
    category: l.category,
    lastReceived: l.dernier && isValidISODate(l.dernier) && l.dernier <= today ? l.dernier : null,
  });
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
    // Solde indiqué : un ajustement fait partir « Mon compte » de ce montant réel
    if (soldeActuel.trim()) {
      const reel = amountOf(soldeActuel);
      const calcule = accountBalance(data, 'compte', today, today);
      if (reel !== calcule)
        data.adjustments.push({
          id: newId('aju'),
          account: 'compte',
          date: today,
          amount: reel - calcule,
          note: 'Solde indiqué à la création du profil',
        });
    }
    dispatch({ type: 'replace', data });
    notify(`Bienvenue ${name.trim()} ! Ton budget est prêt.`);
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
        <Link to="/presentation" className="logo-lien" aria-label="SoldeClair, retour à la présentation">
          <span className="logo">
            <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="currentColor" />
              <path
                d="M18 40c3 4 8 6 14 6 8 0 13-4 13-10 0-12-25-7-25-17 0-4 4-7 11-7 5 0 9 2 11 5"
                fill="none"
                stroke="var(--logo-ink)"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </svg>
            <span className="logo-text">SoldeClair</span>
          </span>
        </Link>
        <p className="onboarding-privacy">
          <Icon name="lock" size={16} /> Sans compte, sans banque : tes données restent sur cet appareil.
        </p>
      </header>

      <main className="onboarding-main" id="contenu">
        {/* Grand écran : énoncé à gauche, parcours encadré à droite (contenus existants uniquement). */}
        <aside className="onboarding-intro" aria-label="À propos de SoldeClair">
          <p className="eyebrow">Budget personnel</p>
          <p className="onboarding-statement">Gère ton budget personnel, simplement.</p>
          <ul className="onboarding-facts">
            <li>
              <Icon name="lock" size={18} />
              <span>Sans compte et sans banque : aucune coordonnée bancaire n’est demandée.</span>
            </li>
            <li>
              <Icon name="home" size={18} />
              <span>Tes données restent enregistrées dans ce navigateur, sur cet appareil.</span>
            </li>
            <li>
              <Icon name="calendar" size={18} />
              <span>Quelques questions pour préparer ton budget : compte environ deux minutes.</span>
            </li>
          </ul>
        </aside>

        <div className="onboarding-flow">
          {profils.length > 0 && (
            <p className="muted onboarding-retour">
              Nouveau profil.{' '}
              <Link to="/presentation" className="link">
                Revenir à mes profils
              </Link>
            </p>
          )}
          <ol className="stepper" aria-label="Étapes de la configuration">
            {STEPS.map((s, i) => (
              <li key={s} className={i === step ? 'step-current' : i < step ? 'step-done' : ''} aria-current={i === step ? 'step' : undefined}>
                <span className="step-num">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
                <span className="step-label">{s}</span>
              </li>
            ))}
          </ol>

          <div className="hero-frame">
            <Card>
              <h1 ref={headingRef} tabIndex={-1} className="onboarding-title">
                {step === 0 && 'Bienvenue sur SoldeClair'}
                {step === 1 && 'Tes revenus mensuels'}
                {step === 2 && 'Tes charges fixes'}
                {step === 3 && 'Tes dépenses et ton épargne'}
                {step === 4 && 'Tes catégories'}
                {step === 5 && 'Tout est prêt !'}
              </h1>
              <p className="muted">
                Étape {step + 1} sur {STEPS.length}
                {step > 0 && step < 5 && '. Tu pourras tout modifier plus tard.'}
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
                noValidate
                className="form etape-onboarding"
                key={step}
              >
                {step === 0 && (
                  <>
                    <p>Quelques questions pour préparer ton budget. Compte environ deux minutes.</p>
                    <p className="muted">
                      Tu préfères d’abord découvrir ?{' '}
                      <button type="button" className="lien-bouton" onClick={() => document.getElementById('alt-titre')?.focus()}>
                        Essayer avec un profil de démonstration
                      </button>
                    </p>
                    <div className="form-grid">
                      <TextField
                        label="Prénom ou pseudonyme"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={errors.name}
                        maxLength={40}
                        autoComplete="nickname"
                      />
                      <SelectField label="Devise" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                    <fieldset className="fieldset">
                      <legend>Quelle est ta situation ?</legend>
                      <div className="choice-grid">
                        {(Object.keys(PROFILE_LABELS) as ProfileType[]).map((t) => (
                          <label key={t} className={`choice ${type === t ? 'choice-on' : ''}`}>
                            <input type="radio" name="profil" value={t} checked={type === t} onChange={() => setType(t)} />
                            <span>{PROFILE_LABELS[t]}</span>
                          </label>
                        ))}
                      </div>
                      <p className="field-hint">Nous te proposerons des catégories adaptées à ta situation.</p>
                    </fieldset>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h2 className="subhead">Revenu principal</h2>
                    <LineRow
                      line={mainIncome}
                      onChange={setMainIncome}
                      kind="income"
                      error={errors.main}
                      erreurDernier={errors['dernier-main']}
                      options={cats.income}
                      today={today}
                    />
                    <h2 className="subhead">Revenus complémentaires</h2>
                    {extras.length === 0 && <p className="muted">Aides, job, aide familiale… Ajoute-en si besoin.</p>}
                    {extras.map((l) => (
                      <LineRow
                        key={l.key}
                        line={l}
                        kind="income"
                        error={errors[`extra-${l.key}`]}
                        erreurDernier={errors[`dernier-${l.key}`]}
                        options={cats.income}
                        today={today}
                        onChange={(n) => setExtras(extras.map((x) => (x.key === l.key ? n : x)))}
                        onRemove={() => setExtras(extras.filter((x) => x.key !== l.key))}
                      />
                    ))}
                    <Button icon="plus" onClick={() => setExtras([...extras, newLine('', cats.income[1] ?? cats.income[0], '5', today)])}>
                      Ajouter un revenu complémentaire
                    </Button>
                    <h2 className="subhead">Ton compte aujourd’hui</h2>
                    <MoneyField
                      label="Solde de ton compte aujourd’hui"
                      optional
                      value={soldeActuel}
                      onChange={(e) => setSoldeActuel(e.target.value)}
                      error={errors.solde}
                      hint="Le montant affiché par ta banque aujourd’hui."
                    />
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className="muted">Laisse le montant vide pour ignorer une ligne.</p>
                    {charges.map((l) => (
                      <LineRow
                        key={l.key}
                        line={l}
                        kind="fixed"
                        today={today}
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
                        label="Estimation de tes dépenses variables par mois"
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
                        hint="Ce que tu aimerais mettre de côté chaque mois."
                      />
                    </div>
                    <CheckboxField
                      label="Répartir automatiquement mon estimation en limites par catégorie"
                      hint="Tu pourras ajuster chaque limite dans « Budgets »."
                      checked={splitEstimate}
                      onChange={(e) => setSplitEstimate(e.target.checked)}
                    />
                    <h2 className="subhead">Objectif d’épargne à long terme (facultatif)</h2>
                    <div className="form-grid">
                      <TextField
                        label="Nom de l’objectif"
                        optional
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        placeholder="Ex. : fonds d’urgence"
                        maxLength={60}
                      />
                      <MoneyField
                        label="Montant visé"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        error={errors.goalTarget}
                        disabled={!goalName.trim()}
                      />
                      <MoneyField
                        label="Déjà mis de côté"
                        value={goalInitial}
                        onChange={(e) => setGoalInitial(e.target.value)}
                        error={errors.goalInitial}
                        disabled={!goalName.trim()}
                      />
                      <TextField
                        label="Date souhaitée"
                        optional
                        type="date"
                        value={goalDate}
                        onChange={(e) => setGoalDate(e.target.value)}
                        disabled={!goalName.trim()}
                      />
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <p>
                      Pour un profil <strong>{PROFILE_LABELS[type].toLowerCase()}</strong>. Décoche ce qui ne te concerne pas.
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
                      <SelectField
                        label="Type"
                        value={custom.kind}
                        onChange={(e) => setCustom({ ...custom, kind: e.target.value as typeof custom.kind })}
                      >
                        {kinds.map((k) => (
                          <option key={k} value={k}>
                            {kindLabel[k]}
                          </option>
                        ))}
                      </SelectField>
                      <TextField
                        label="Nouvelle catégorie"
                        value={custom.name}
                        onChange={(e) => setCustom({ ...custom, name: e.target.value })}
                        maxLength={60}
                      />
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
                        Ton estimation dépasse tes revenus de {fmt(-margin)}. Pas d’inquiétude : SoldeClair t’aidera à repérer où ajuster.
                      </Notice>
                    ) : (
                      <Notice tone="succes">Ton budget prévisionnel est équilibré.</Notice>
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
