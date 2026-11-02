import { useMemo, useState, type FormEvent } from 'react';
import type { Expense, FixedCharge, Frequency, Income, ISODate, Priority, SavingsDeposit, SavingsGoal } from '../types';
import { useApp } from '../state/AppState';
import { centsToInput, parseAmount } from '../lib/money';
import { isValidISODate } from '../lib/dates';
import { frequentCategories } from '../lib/budget';
import { newId } from '../lib/id';
import { FREQUENCY_LABELS } from '../lib/recurrence';
import { PAYMENT_METHODS } from '../lib/categories';
import { GOAL_EXAMPLES, PRIORITY_LABELS } from '../lib/goals';
import { Button, CategoryOptions, MoneyField, SelectField, TextAreaField, TextField } from './ui';

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_AMOUNT = 100_000_000_00; // 100 millions : garde-fou contre les fautes de frappe

/** Valide un montant saisi. Renvoie [centimes, message d'erreur]. */
export function checkAmount(value: string, { allowZero = false, required = true } = {}): [number | null, string | null] {
  if (value.trim() === '') {
    return required ? [null, 'Indiquez un montant, par exemple 12,50.'] : [0, null];
  }
  const cents = parseAmount(value);
  if (cents === null) return [null, 'Montant non reconnu. Utilisez des chiffres, par exemple 12,50.'];
  if (cents < 0) return [null, 'Le montant ne peut pas être négatif.'];
  if (!allowZero && cents === 0) return [null, 'Le montant doit être supérieur à 0.'];
  if (cents > MAX_AMOUNT) return [null, 'Ce montant semble trop élevé. Vérifiez la saisie.'];
  return [cents, null];
}

function checkDate(value: string, required = true): string | null {
  if (!value) return required ? 'Indiquez une date.' : null;
  return isValidISODate(value) ? null : 'Date invalide.';
}

type Errors = Record<string, string | null>;
const hasErrors = (e: Errors) => Object.values(e).some(Boolean);

function FormActions({ onCancel, submitLabel }: { onCancel?: () => void; submitLabel: string }) {
  return (
    <div className="form-actions">
      {onCancel && (
        <Button variant="secondaire" onClick={onCancel}>
          Annuler
        </Button>
      )}
      <button type="submit" className="btn btn-primaire">
        <span>{submitLabel}</span>
      </button>
    </div>
  );
}

const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as Frequency[];

/* -------------------------------------------------------------------------- */
/* Dépense variable                                                            */
/* -------------------------------------------------------------------------- */

export function ExpenseForm({
  initial,
  defaultDate,
  onDone,
  onCancel,
  quick = false,
}: {
  initial?: Expense;
  defaultDate: ISODate;
  onDone?: () => void;
  onCancel?: () => void;
  quick?: boolean;
}) {
  const { data, dispatch, notify, fmt, today } = useApp();
  const variableCats = data.categories.filter((c) => c.kind === 'variable');
  // Raccourcis : catégories les plus utilisées ces 90 derniers jours
  const frequentes = useMemo(() => frequentCategories(data, today, 4), [data, today]);
  const [amount, setAmount] = useState(centsToInput(initial?.amount));
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? frequentes[0]?.id ?? variableCats[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount);
    const errs: Errors = {
      amount: amountError,
      categoryId: categoryId ? null : 'Choisissez une catégorie.',
      date: checkDate(date),
    };
    setErrors(errs);
    if (hasErrors(errs) || cents === null) return;
    dispatch({
      type: 'upsert',
      collection: 'expenses',
      item: {
        id: initial?.id ?? newId('dep'),
        amount: cents,
        categoryId,
        date,
        description: description.trim(),
        paymentMethod,
      },
    });
    notify(initial ? 'Dépense modifiée.' : `Dépense de ${fmt(cents)} ajoutée.`);
    if (!initial) {
      setAmount('');
      setDescription('');
    }
    onDone?.();
  };

  if (variableCats.length === 0) {
    return <p>Créez d’abord une catégorie de dépenses dans les paramètres.</p>;
  }

  return (
    <form onSubmit={submit} noValidate className={quick ? 'form-quick' : 'form'} aria-label={quick ? 'Ajout rapide d’une dépense' : undefined}>
      <div className={quick ? 'form-row' : 'form-grid'}>
        <MoneyField label="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} required />
        <SelectField label="Catégorie" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.categoryId}>
          <CategoryOptions categories={data.categories} kind="variable" />
        </SelectField>
        {frequentes.length > 1 && (
          <div className="chips chips-frequentes" role="group" aria-label="Catégories fréquentes">
            <span className="chips-titre" aria-hidden="true">
              Fréquentes :
            </span>
            {frequentes.map((c) => (
              <button
                type="button"
                key={c.id}
                className={`chip chip-petit ${categoryId === c.id ? 'chip-on' : ''}`}
                aria-pressed={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        <TextField
          label="Description"
          optional
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={120}
          placeholder="Ex. : courses"
        />
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} required />
        {!quick && (
          <SelectField label="Moyen de paiement" optional value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="">Non précisé</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </SelectField>
        )}
      </div>
      {quick ? (
        <div className="form-actions">
          <button type="submit" className="btn btn-primaire">
            <span>Ajouter la dépense</span>
          </button>
        </div>
      ) : (
        <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Ajouter la dépense'} />
      )}
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Revenu                                                                      */
/* -------------------------------------------------------------------------- */

export function IncomeForm({
  initial,
  defaultDate,
  onDone,
  onCancel,
}: {
  initial?: Income;
  defaultDate: ISODate;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data, dispatch, notify } = useApp();
  const cats = data.categories.filter((c) => c.kind === 'income');
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(centsToInput(initial?.amount));
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? cats[0]?.id ?? '');
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'mensuel');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount);
    const errs: Errors = {
      name: name.trim() ? null : 'Donnez un nom à ce revenu (ex. : salaire).',
      amount: amountError,
      date: checkDate(date),
      categoryId: categoryId ? null : 'Choisissez une catégorie.',
      endDate: recurring ? checkDate(endDate, false) ?? (endDate && endDate < date ? 'La date de fin doit être après la date de début.' : null) : null,
    };
    setErrors(errs);
    if (hasErrors(errs) || cents === null) return;
    dispatch({
      type: 'upsert',
      collection: 'incomes',
      item: {
        id: initial?.id ?? newId('rev'),
        name: name.trim(),
        amount: cents,
        date,
        categoryId,
        recurring,
        frequency: recurring ? frequency : null,
        endDate: recurring && endDate ? endDate : null,
        note: note.trim(),
      },
    });
    notify(initial ? 'Revenu modifié.' : 'Revenu ajouté.');
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <div className="form-grid">
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} placeholder="Ex. : salaire" />
        <MoneyField label="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <SelectField label="Catégorie" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.categoryId}>
          <CategoryOptions categories={data.categories} kind="income" />
        </SelectField>
        <TextField
          label={recurring ? 'Date du premier versement' : 'Date'}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
      </div>
      <fieldset className="fieldset">
        <legend>Ce revenu revient-il régulièrement ?</legend>
        <div className="radio-row">
          <label className="radio">
            <input type="radio" name="recurrent" checked={recurring} onChange={() => setRecurring(true)} /> Récurrent (salaire, bourse…)
          </label>
          <label className="radio">
            <input type="radio" name="recurrent" checked={!recurring} onChange={() => setRecurring(false)} /> Exceptionnel (prime, vente…)
          </label>
        </div>
        <p className="field-hint">
          {recurring
            ? 'Il sera compté automatiquement chaque mois (ou selon la fréquence choisie).'
            : 'Il ne sera compté qu’une seule fois, à la date indiquée.'}
        </p>
      </fieldset>
      {recurring && (
        <div className="form-grid">
          <SelectField label="Fréquence" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Date de fin"
            optional
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            error={errors.endDate}
            hint="Laissez vide si le revenu continue."
          />
        </div>
      )}
      <TextAreaField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Ajouter le revenu'} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Charge fixe                                                                 */
/* -------------------------------------------------------------------------- */

export function ChargeForm({
  initial,
  defaultDate,
  onDone,
  onCancel,
}: {
  initial?: FixedCharge;
  defaultDate: ISODate;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data, dispatch, notify } = useApp();
  const cats = data.categories.filter((c) => c.kind === 'fixed');
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(centsToInput(initial?.amount));
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? cats[0]?.id ?? '');
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'mensuel');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount);
    const errs: Errors = {
      name: name.trim() ? null : 'Donnez un nom à cette charge (ex. : loyer).',
      amount: amountError,
      date: checkDate(date),
      categoryId: categoryId ? null : 'Choisissez une catégorie.',
      endDate: checkDate(endDate, false) ?? (endDate && endDate < date ? 'La date de fin doit être après la première échéance.' : null),
    };
    setErrors(errs);
    if (hasErrors(errs) || cents === null) return;
    dispatch({
      type: 'upsert',
      collection: 'fixedCharges',
      item: {
        id: initial?.id ?? newId('chg'),
        name: name.trim(),
        amount: cents,
        date,
        categoryId,
        frequency,
        endDate: endDate || null,
        note: note.trim(),
        status: initial?.status ?? {},
      },
    });
    notify(initial ? 'Charge fixe modifiée.' : 'Charge fixe ajoutée.');
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <div className="form-grid">
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} placeholder="Ex. : loyer" />
        <MoneyField label="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <SelectField label="Catégorie" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.categoryId}>
          <CategoryOptions categories={data.categories} kind="fixed" />
        </SelectField>
        <TextField
          label="Date de prélèvement prévue"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          hint="Première échéance. Les suivantes sont calculées automatiquement."
        />
        <SelectField label="Fréquence" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
          {FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {FREQUENCY_LABELS[f]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Date de fin"
          optional
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          error={errors.endDate}
          hint="Laissez vide si la charge continue."
        />
      </div>
      <TextAreaField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Ajouter la charge'} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Objectif d'épargne                                                          */
/* -------------------------------------------------------------------------- */

export function GoalForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: SavingsGoal;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { dispatch, notify, today } = useApp();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [target, setTarget] = useState(centsToInput(initial?.target));
  const [initialAmount, setInitialAmount] = useState(centsToInput(initial?.initialAmount ?? 0));
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'moyenne');
  const [monthly, setMonthly] = useState(centsToInput(initial?.monthlyContribution ?? 0));
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [t, tErr] = checkAmount(target);
    const [ini, iniErr] = checkAmount(initialAmount, { allowZero: true, required: false });
    const [mon, monErr] = checkAmount(monthly, { allowZero: true, required: false });
    const errs: Errors = {
      name: name.trim() ? null : 'Donnez un nom à votre objectif.',
      target: tErr,
      initialAmount: iniErr,
      monthly: monErr,
      targetDate: checkDate(targetDate, false),
    };
    setErrors(errs);
    if (hasErrors(errs) || t === null) return;
    dispatch({
      type: 'upsert',
      collection: 'goals',
      item: {
        id: initial?.id ?? newId('obj'),
        name: name.trim(),
        description: description.trim(),
        target: t,
        initialAmount: ini ?? 0,
        targetDate: targetDate || null,
        priority,
        monthlyContribution: mon ?? 0,
        createdAt: initial?.createdAt ?? today,
      },
    });
    notify(initial ? 'Objectif modifié.' : 'Objectif créé.');
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      {!initial && (
        <div className="chips" role="group" aria-label="Exemples d’objectifs">
          {GOAL_EXAMPLES.map((g) => (
            <button type="button" key={g} className={`chip ${name === g ? 'chip-on' : ''}`} onClick={() => setName(g)}>
              {g}
            </button>
          ))}
        </div>
      )}
      <div className="form-grid">
        <TextField label="Nom de l’objectif" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} />
        <MoneyField label="Montant cible" value={target} onChange={(e) => setTarget(e.target.value)} error={errors.target} />
        <MoneyField
          label="Montant déjà disponible"
          value={initialAmount}
          onChange={(e) => setInitialAmount(e.target.value)}
          error={errors.initialAmount}
          hint="Ce que vous avez déjà mis de côté pour cet objectif."
        />
        <MoneyField
          label="Contribution mensuelle prévue"
          value={monthly}
          onChange={(e) => setMonthly(e.target.value)}
          error={errors.monthly}
        />
        <TextField label="Date souhaitée" optional type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} error={errors.targetDate} />
        <SelectField label="Priorité" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </SelectField>
      </div>
      <TextAreaField label="Description" optional value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Créer l’objectif'} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Versement d'épargne                                                         */
/* -------------------------------------------------------------------------- */

export function DepositForm({
  initial,
  goalId,
  defaultDate,
  onDone,
  onCancel,
}: {
  initial?: SavingsDeposit;
  goalId?: string | null;
  defaultDate: ISODate;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data, dispatch, notify, fmt } = useApp();
  const [amount, setAmount] = useState(centsToInput(initial?.amount));
  const [target, setTarget] = useState(initial?.goalId ?? goalId ?? data.goals[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount);
    const errs: Errors = { amount: amountError, date: checkDate(date) };
    setErrors(errs);
    if (hasErrors(errs) || cents === null) return;
    dispatch({
      type: 'upsert',
      collection: 'savings',
      item: { id: initial?.id ?? newId('epa'), goalId: target || null, amount: cents, date, note: note.trim() },
    });
    notify(initial ? 'Versement modifié.' : `Versement de ${fmt(cents)} enregistré.`);
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <div className="form-grid">
        <MoneyField label="Montant mis de côté" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <SelectField label="Pour quel objectif ?" value={target} onChange={(e) => setTarget(e.target.value)}>
          {data.goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
          <option value="">Épargne libre (sans objectif)</option>
        </SelectField>
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <TextField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
      </div>
      <p className="field-hint">Ce montant est déduit de votre solde disponible du mois et ajouté à votre épargne.</p>
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer' : 'Enregistrer le versement'} />
    </form>
  );
}

