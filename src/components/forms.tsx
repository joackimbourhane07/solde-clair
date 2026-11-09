import { useMemo, useState, type FormEvent } from 'react';
import type {
  AccountId,
  CategoryKind,
  Expense,
  FixedCharge,
  Frequency,
  GoalTheme,
  Income,
  ISODate,
  Priority,
  SavingsDeposit,
  SavingsGoal,
  SavingsSupport,
  SupportKind,
  TemporaryHold,
} from '../types';
import { messageEtape, MODELES_SUPPORT, SUPPORT_KINDS } from '../lib/plan';
import { useApp } from '../state/AppState';
import { centsToInput, parseAmount } from '../lib/money';
import { isValidISODate, monthLabel, monthOf } from '../lib/dates';
import { depensesRecentes, frequentCategories, isCarteRestaurant, isIzly, jourBascule, moisDuRevenu } from '../lib/budget';
import { accountBalance, resteAVivre, usesCarteRestaurant } from '../lib/accounts';
import { newId } from '../lib/id';
import { FREQUENCY_LABELS } from '../lib/recurrence';
import { CATEGORIE_IZLY, DEPENSES_CAMPUS, makeCategory, PAYMENT_METHODS } from '../lib/categories';
import { GOAL_EXAMPLES, GOAL_THEMES, PRIORITY_LABELS, THEME_LABELS, themeFromName } from '../lib/goals';
import { Icon } from './Icon';
import { IllustrationObjectif } from './objectifs/IllustrationObjectif';
import { Button, CheckboxField, IconButton, MoneyField, SelectField, TextAreaField, TextField } from './ui';

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

const MAX_AMOUNT = 100_000_000_00; // 100 millions : garde-fou contre les fautes de frappe

/** Valide un montant saisi. Renvoie [centimes, message d'erreur]. */
export function checkAmount(value: string, { allowZero = false, required = true } = {}): [number | null, string | null] {
  if (value.trim() === '') {
    return required ? [null, 'Indique un montant, par exemple 12,50.'] : [0, null];
  }
  const cents = parseAmount(value);
  if (cents === null) return [null, 'Montant non reconnu. Utilise des chiffres, par exemple 12,50.'];
  if (cents < 0) return [null, 'Le montant ne peut pas être négatif.'];
  if (!allowZero && cents === 0) return [null, 'Le montant doit être supérieur à 0.'];
  if (cents > MAX_AMOUNT) return [null, 'Ce montant semble trop élevé. Vérifie la saisie.'];
  return [cents, null];
}

function checkDate(value: string, required = true): string | null {
  if (!value) return required ? 'Indique une date.' : null;
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
/* Message d'enregistrement                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Confirme l'enregistrement et précise le mois où l'opération compte quand il diffère du mois affiché,
 * avec un bouton pour aller voir ce mois-là (ex. : prime datée du 26 octobre ajoutée en novembre).
 */
function useConfirmation() {
  const { data, month, setMonth, notify } = useApp();
  /** `moisCompte` : mois du budget où compte l'opération (revenu de fin de mois → mois suivant). */
  return (texte: string, date: ISODate, recurrent = false, moisCompte?: string) => {
    const m = moisCompte ?? monthOf(date);
    const jour = jourBascule(data);
    // Revenu reçu à partir du 20 : il compte pour le mois suivant (on le dit, même s'il compte pour le mois affiché)
    const decale = !recurrent && jour !== null && m !== monthOf(date);
    const autreMois = recurrent ? m > month : m !== month;
    if (!autreMois) {
      notify(decale ? `${texte} Reçu à partir du ${jour} : il compte pour ${monthLabel(m)}.` : texte);
      return;
    }
    // Formulation neutre (revenu, dépense, charge) : « Mois concerné : … ».
    const precision = recurrent
      ? ` Première échéance comptée en ${monthLabel(m)}.`
      : decale
        ? ` Reçu à partir du ${jour} : il compte pour ${monthLabel(m)}.`
        : m < month && data.settings.carryOver !== false
          ? ` Mois concerné : ${monthLabel(m)}. Le reste de ce mois est reporté sur les suivants.`
          : ` Mois concerné : ${monthLabel(m)} (pas ${monthLabel(month)}).`;
    notify(texte + precision, 'info', { label: `Voir ${monthLabel(m)}`, onClick: () => setMonth(m) });
  };
}

/* -------------------------------------------------------------------------- */
/* Catégorie : choix dans la liste, ou création sur place                      */
/* -------------------------------------------------------------------------- */

const NOUVELLE = '__nouvelle__';

/**
 * Choix d'une catégorie avec création possible sans quitter le formulaire
 * (utile quand la liste est vide ou que la bonne catégorie manque).
 */
function useChoixCategorie(kind: CategoryKind, initialId?: string | null) {
  const { data, dispatch } = useApp();
  const cats = data.categories.filter((c) => c.kind === kind);
  const [categoryId, setCategoryId] = useState<string>(initialId ?? cats[0]?.id ?? NOUVELLE);
  const [nouvelle, setNouvelle] = useState('');
  const erreurs = (): Errors => ({
    categoryId: categoryId === NOUVELLE || categoryId ? null : 'Choisis une catégorie.',
    nouvelleCategorie: categoryId === NOUVELLE && !nouvelle.trim() ? 'Indique le nom de la nouvelle catégorie.' : null,
  });
  /** Une fois le formulaire valide : crée la catégorie si besoin et renvoie son identifiant. */
  const resoudre = (): string => {
    if (categoryId !== NOUVELLE) return categoryId;
    const nom = nouvelle.trim();
    const existante = cats.find((c) => c.name.toLocaleLowerCase('fr') === nom.toLocaleLowerCase('fr'));
    if (existante) return existante.id;
    const cat = makeCategory(nom, kind, null);
    dispatch({ type: 'upsert', collection: 'categories', item: cat });
    return cat.id;
  };
  return { cats, categoryId, setCategoryId, nouvelle, setNouvelle, erreurs, resoudre };
}

function ChampCategorie({ choix, errors }: { choix: ReturnType<typeof useChoixCategorie>; errors: Errors }) {
  return (
    <>
      <SelectField label="Catégorie" value={choix.categoryId} onChange={(e) => choix.setCategoryId(e.target.value)} error={errors.categoryId}>
        {choix.cats.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        <option value={NOUVELLE}>+ Nouvelle catégorie…</option>
      </SelectField>
      {choix.categoryId === NOUVELLE && (
        <TextField
          label="Nom de la nouvelle catégorie"
          value={choix.nouvelle}
          onChange={(e) => choix.setNouvelle(e.target.value)}
          error={errors.nouvelleCategorie}
          maxLength={60}
          hint={choix.cats.length === 0 ? 'Aucune catégorie de ce type pour l’instant : crée-la ici.' : 'Elle sera ajoutée à tes catégories.'}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Dépense variable                                                            */
/* -------------------------------------------------------------------------- */

export function ExpenseForm({
  initial,
  defaultDate,
  onDone,
  onCancel,
  quick = false,
  izly = false,
  prerempli,
}: {
  initial?: Expense;
  /** Montant et catégorie proposés (ex. achat simulé) : l'utilisateur vérifie puis valide. */
  prerempli?: { amount: number; categoryId?: string };
  defaultDate: ISODate;
  onDone?: () => void;
  onCancel?: () => void;
  quick?: boolean;
  /** Dépense payée avec Izly (raccourcis de campus, compte Izly). */
  izly?: boolean;
}) {
  const { data, dispatch, fmt, fmtShort, notify, today } = useApp();
  const confirmer = useConfirmation();
  const variableCats = data.categories.filter((c) => c.kind === 'variable');
  // Raccourcis : catégories les plus utilisées ces 90 derniers jours
  const frequentes = useMemo(() => frequentCategories(data, today, 4), [data, today]);
  const [amount, setAmount] = useState(centsToInput(initial?.amount ?? prerempli?.amount));
  const choix = useChoixCategorie('variable', initial?.categoryId ?? prerempli?.categoryId ?? frequentes[0]?.id ?? variableCats[0]?.id);
  const { categoryId, setCategoryId } = choix;
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? (izly ? 'Izly' : ''));
  const avecIzly = isIzly(paymentMethod);
  // Raccourci de campus : description + catégorie « Izly / CROUS » (créée si besoin)
  const choisirCampus = (libelle: string) => {
    setDescription(libelle);
    const cat = data.categories.find((c) => c.kind === 'variable' && c.name === CATEGORIE_IZLY);
    if (cat) choix.setCategoryId(cat.id);
    else {
      choix.setCategoryId('__nouvelle__');
      choix.setNouvelle(CATEGORIE_IZLY);
    }
  };
  const [exceptionnelle, setExceptionnelle] = useState(initial?.exceptional ?? false);
  const [errors, setErrors] = useState<Errors>({});
  // Ajout express : refaire une dépense récente (préremplit le formulaire ; rien n'est enregistré sans validation)
  const recentes = useMemo(
    () => (initial ? [] : depensesRecentes(data, today, 3, izly ? (e) => isIzly(e.paymentMethod) : undefined)),
    [data, today, initial, izly],
  );
  const nomDepense = (e: Expense) => e.description || data.categories.find((c) => c.id === e.categoryId)?.name || 'Dépense';
  const refaire = (e: Expense) => {
    setAmount(centsToInput(e.amount));
    setDescription(e.description);
    setCategoryId(e.categoryId);
    setPaymentMethod(e.paymentMethod);
    setErrors({});
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount);
    const errs: Errors = {
      amount: amountError,
      ...choix.erreurs(),
      date: checkDate(date),
    };
    setErrors(errs);
    if (hasErrors(errs) || cents === null) return;
    const item: Expense = {
      id: initial?.id ?? newId('dep'),
      amount: cents,
      categoryId: choix.resoudre(),
      date,
      description: description.trim(),
      paymentMethod,
      ...(exceptionnelle ? { exceptional: true } : {}),
    };
    // Retour immédiat : ce qu'il reste par jour après cette dépense (dépense du jour ou passée, mois en cours)
    let impact = '';
    if (!initial && date <= today && monthOf(date) === monthOf(today)) {
      const apres = resteAVivre({ ...data, expenses: [...data.expenses, item] }, today);
      if (apres.solde >= 0 && apres.parJour !== null) impact = ` Il te reste environ ${fmtShort(apres.parJour, 'prudent')} par jour.`;
    }
    const premiere = !initial && data.expenses.length === 0;
    dispatch({ type: 'upsert', collection: 'expenses', item });
    // Toute première dépense : Poksy salue le départ (une seule fois)
    if (premiere && monthOf(date) === monthOf(today)) notify(`Première dépense notée. C’est parti\u00a0!${impact}`, 'bravo');
    else confirmer(initial ? 'Dépense modifiée et enregistrée.' : `Dépense de ${fmt(cents)} enregistrée.${impact}`, date);
    if (!initial) {
      setAmount('');
      setDescription('');
    }
    onDone?.();
  };

  return (
    <form onSubmit={submit} noValidate className={quick ? 'form-quick' : 'form'} aria-label={quick ? 'Ajout rapide d’une dépense' : undefined}>
      {recentes.length > 0 && (
        <div className="chips chips-recentes" role="group" aria-label="Refaire une dépense récente">
          <span className="chips-titre" aria-hidden="true">
            Refaire :
          </span>
          {recentes.map((e) => (
            <button
              type="button"
              key={e.id}
              className="chip chip-petit"
              aria-label={`Refaire : ${nomDepense(e)}, ${fmt(e.amount)}`}
              onClick={() => refaire(e)}
            >
              <Icon name="repeat" size={14} />
              <span>
                {nomDepense(e)} – {fmt(e.amount)}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className={quick ? 'form-row' : 'form-grid'}>
        <MoneyField label="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} required />
        {avecIzly && (
          <div className="chips chips-campus" role="group" aria-label="Dépense de campus">
            {DEPENSES_CAMPUS.map((d) => (
              <button
                type="button"
                key={d}
                className={`chip chip-petit ${description === d ? 'chip-on' : ''}`}
                aria-pressed={description === d}
                onClick={() => choisirCampus(d)}
              >
                {d}
              </button>
            ))}
            <p className="field-hint izly-mention">
              <Icon name="campus" size={14} /> Suivi manuel, aucun accès à ton compte Izly.
            </p>
          </div>
        )}
        {/* Montants rapides : un geste ajoute la somme au montant (aucune saisie au clavier nécessaire) */}
        <div className="chips chips-montants" role="group" aria-label="Ajouter rapidement au montant">
          {[500, 1000, 2000, 5000].map((c) => (
            <button
              type="button"
              key={c}
              className="chip chip-petit"
              aria-label={`Ajouter ${fmt(c)} au montant`}
              onClick={() => setAmount(centsToInput((parseAmount(amount) ?? 0) + c))}
            >
              + {fmt(c).replace(/,00/, '')}
            </button>
          ))}
          {amount.trim() !== '' && (
            <button type="button" className="chip chip-petit chip-effacer" onClick={() => setAmount('')}>
              Effacer
            </button>
          )}
        </div>
        <ChampCategorie choix={choix} errors={errors} />
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
      {!quick && (
        <CheckboxField
          label="Dépense exceptionnelle (hors budget courant)"
          checked={exceptionnelle}
          onChange={(e) => setExceptionnelle(e.target.checked)}
          hint="Voyage, gros achat… Comptée à part dans « Mon plan »."
        />
      )}
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

/** Montant signé saisi en texte (« -88 » ou « − 88,00 » pour une retenue). */
function lireMontantSigne(texte: string): number | null {
  const t = texte.trim();
  const negatif = /^[-−]/.test(t);
  const v = parseAmount(t.replace(/^[-−+]\s*/, ''));
  return v === null ? null : negatif ? -v : v;
}

export function IncomeForm({
  initial,
  defaultDate,
  certitudeParDefaut = 'sur',
  confirmerReception = false,
  nomPropose,
  ouvrirDernierVersement = false,
  onDone,
  onCancel,
}: {
  initial?: Income;
  defaultDate: ISODate;
  /** Nouveau revenu : sûr (par défaut) ou attendu (prime incertaine…). */
  certitudeParDefaut?: 'sur' | 'attendu';
  /** Un revenu attendu vient d'arriver : le formulaire le confirme (il devient sûr). */
  confirmerReception?: boolean;
  /** Nom prérempli (suggestion selon le profil : 13e mois…). */
  nomPropose?: string;
  /** Ouvre le formulaire sur « Dernier versement déjà reçu » (salaire de fin de mois compté le mois suivant). */
  ouvrirDernierVersement?: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data, dispatch, notify, fmt, today } = useApp();
  const confirmer = useConfirmation();
  const choix = useChoixCategorie('income', initial?.categoryId);
  const [name, setName] = useState(initial?.name ?? nomPropose ?? '');
  // Compte crédité : choisi par la personne, sinon déduit de la catégorie ou du nom (« Carte restaurant »).
  const [compteChoisi, setCompteChoisi] = useState<AccountId | null>(initial?.account ?? null);
  const nomCategorie = choix.categoryId === '__nouvelle__' ? choix.nouvelle : (data.categories.find((c) => c.id === choix.categoryId)?.name ?? '');
  const compte: AccountId = compteChoisi ?? (isCarteRestaurant(nomCategorie) || isCarteRestaurant(name) ? 'carte-restaurant' : 'compte');
  const proposerCompte = usesCarteRestaurant(data) || compte === 'carte-restaurant';
  const [amount, setAmount] = useState(centsToInput(initial?.amount));
  // Réception confirmée : la date proposée est celle du jour (modifiable)
  const [date, setDate] = useState(confirmerReception ? defaultDate : (initial?.date ?? defaultDate));
  const [recurring, setRecurring] = useState(initial?.recurring ?? certitudeParDefaut !== 'attendu');
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'mensuel');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});
  // Revenu sûr ou attendu (incertain : prime non confirmée, montant inconnu…)
  const [certitude, setCertitude] = useState<'sur' | 'attendu'>(confirmerReception ? 'sur' : (initial?.certitude ?? certitudeParDefaut));
  const attendu = certitude === 'attendu';
  const [amountMax, setAmountMax] = useState(centsToInput(initial?.amountMax ?? undefined));
  const [inconnu, setInconnu] = useState(initial?.amountUnknown ?? false);
  const [optimiste, setOptimiste] = useState(initial?.inOptimistic ?? true);
  // Détail facultatif (bulletin de paie) : lignes libellé + montant signé
  const [lignes, setLignes] = useState<{ label: string; montant: string }[]>(
    () => initial?.details?.map((d) => ({ label: d.label, montant: (d.amount < 0 ? '-' : '') + centsToInput(Math.abs(d.amount)) })) ?? [],
  );
  const lignesLues = lignes.map((l) => ({ label: l.label.trim(), amount: lireMontantSigne(l.montant) }));
  const totalLignes = lignesLues.reduce((t, l) => t + (l.amount ?? 0), 0);
  // Dernier versement déjà reçu (salaire de fin de mois) : la série commence à cette date, il compte pour le mois en cours
  const [dernier, setDernier] = useState('');
  // Un solde réel a déjà été indiqué dans « Mon compte » après ce versement : il le comprend déjà
  const dernierAjustement = (data.adjustments ?? [])
    .filter((a) => a.account === compte && dernier && a.date >= dernier)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const [dejaDansSolde, setDejaDansSolde] = useState(true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const montantInconnu = attendu && inconnu;
    const [cents, amountError] = montantInconnu ? [0, null] : checkAmount(amount);
    const [max, maxError] = attendu && !inconnu && amountMax.trim() ? checkAmount(amountMax) : [null, null];
    const errs: Errors = {
      name: name.trim() ? null : 'Donne un nom à ce revenu (ex. : salaire).',
      amountMax:
        maxError ?? (max !== null && cents !== null && max < cents ? 'Le haut de la fourchette doit être supérieur au montant estimé.' : null),
      details: lignesLues.some((l) => (l.label && l.amount === null) || (!l.label && l.amount !== null))
        ? 'Chaque ligne du détail a besoin d’un libellé et d’un montant (ex. : -88,00).'
        : null,
      amount: amountError,
      date: checkDate(date),
      ...choix.erreurs(),
      endDate: recurring
        ? (checkDate(endDate, false) ?? (endDate && endDate < date ? 'La date de fin doit être après la date de début.' : null))
        : null,
      dernier:
        recurring && !attendu && dernier
          ? (checkDate(dernier) ??
            (dernier > today
              ? 'Le dernier versement reçu doit être aujourd’hui ou avant.'
              : dernier >= date
                ? 'Le dernier versement reçu doit être avant la date du prochain versement.'
                : null))
          : null,
    };
    setErrors(errs);
    if (hasErrors(errs) || cents === null) return;
    // Avec un dernier versement reçu, la série commence à cette date (les suivants s'enchaînent selon la fréquence)
    const debutSerie = recurring && !attendu && dernier ? dernier : date;
    const item: Income = {
      id: initial?.id ?? newId('rev'),
      name: name.trim(),
      amount: cents,
      date: debutSerie,
      categoryId: '',
      recurring,
      frequency: recurring ? frequency : null,
      endDate: recurring && endDate ? endDate : null,
      note: '',
    };
    // Le solde réel indiqué dans « Mon compte » comprend déjà ce versement : une correction évite de le compter deux fois
    if (debutSerie !== date && dernierAjustement && dejaDansSolde) {
      const avec = { ...data, incomes: [...data.incomes.filter((i) => i.id !== item.id), { ...item, account: compte }] };
      const sans = { ...data, incomes: data.incomes.filter((i) => i.id !== item.id).concat(initial ? [initial] : []) };
      const ecart = accountBalance(avec, compte, dernierAjustement.date, today) - accountBalance(sans, compte, dernierAjustement.date, today);
      if (ecart !== 0)
        dispatch({
          type: 'upsert',
          collection: 'adjustments',
          item: {
            id: newId('aju'),
            account: compte,
            date: dernierAjustement.date,
            amount: -ecart,
            note: `${name.trim()} déjà compris dans le solde réel`,
          },
        });
    }
    dispatch({
      type: 'upsert',
      collection: 'incomes',
      item: {
        id: item.id,
        name: name.trim(),
        amount: cents,
        date: debutSerie,
        categoryId: choix.resoudre(),
        recurring,
        frequency: recurring ? frequency : null,
        endDate: recurring && endDate ? endDate : null,
        note: note.trim(),
        account: compte,
        ...(attendu
          ? {
              certitude: 'attendu' as const,
              inOptimistic: optimiste,
              ...(montantInconnu ? { amountUnknown: true } : {}),
              ...(max !== null ? { amountMax: max } : {}),
            }
          : {}),
        ...(lignesLues.some((l) => l.label)
          ? { details: lignesLues.filter((l) => l.label && l.amount !== null).map((l) => ({ label: l.label, amount: l.amount! })) }
          : {}),
      },
    });
    if (attendu)
      notify(initial ? 'Revenu attendu modifié.' : 'Revenu attendu enregistré : il n’est pas compté tant qu’il n’est pas confirmé.', 'info');
    else if (confirmerReception) notify('Revenu confirmé : il est maintenant compté.');
    else
      confirmer(initial ? 'Revenu modifié et enregistré.' : 'Revenu enregistré.', debutSerie, recurring, moisDuRevenu(debutSerie, jourBascule(data)));
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <fieldset className="fieldset">
        <legend>Ce revenu est-il sûr ?</legend>
        <div className="radio-row">
          <label className="radio">
            <input type="radio" name="certitude" checked={!attendu} onChange={() => setCertitude('sur')} /> Sûr (reçu ou prévu)
          </label>
          <label className="radio">
            <input type="radio" name="certitude" checked={attendu} onChange={() => setCertitude('attendu')} /> Attendu (incertain)
          </label>
        </div>
        <p className="field-hint">
          {attendu
            ? 'Un revenu attendu (prime non confirmée, montant inconnu…) n’est compté nulle part tant que tu ne l’as pas confirmé, sauf dans la projection optimiste de « Mon plan ».'
            : 'Il est compté dans ton budget à sa date.'}
        </p>
      </fieldset>
      <div className="form-grid">
        <TextField
          label="Nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          maxLength={80}
          placeholder="Ex. : salaire"
        />
        {!(attendu && inconnu) && (
          <MoneyField
            label={attendu ? 'Montant estimé (bas de la fourchette)' : 'Montant'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
          />
        )}
        {attendu && !inconnu && (
          <MoneyField
            label="Jusqu’à"
            optional
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            error={errors.amountMax}
            hint="Haut de la fourchette, si le montant peut varier."
          />
        )}
        <ChampCategorie choix={choix} errors={errors} />
        <TextField
          label={recurring ? (initial && !ouvrirDernierVersement ? 'Date du premier versement' : 'Date du prochain versement') : 'Date'}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
        {recurring && !attendu && (
          <TextField
            label="Dernier versement déjà reçu"
            optional
            type="date"
            value={dernier}
            autoFocus={ouvrirDernierVersement}
            onChange={(e) => setDernier(e.target.value)}
            error={errors.dernier}
            hint={
              jourBascule(data) !== null
                ? `Tu as déjà touché ce revenu (ex. : le salaire du 28 du mois dernier) ? Indique la date : il compte pour le mois en cours (reçu à partir du ${jourBascule(data)}, il compte pour le mois suivant), puis les versements s’enchaînent.`
                : 'Tu as déjà touché ce revenu ? Indique la date : les versements suivants s’enchaînent à partir de celle-ci.'
            }
          />
        )}
      </div>
      {proposerCompte && (
        <fieldset className="fieldset">
          <legend>Versé sur</legend>
          <div className="radio-row">
            <label className="radio">
              <input type="radio" name="compte" checked={compte === 'compte'} onChange={() => setCompteChoisi('compte')} /> Compte bancaire
            </label>
            <label className="radio">
              <input type="radio" name="compte" checked={compte === 'carte-restaurant'} onChange={() => setCompteChoisi('carte-restaurant')} /> Carte
              restaurant
            </label>
          </div>
          <p className="field-hint">La carte restaurant a son propre solde dans l’onglet « Compte » ; le total de tes revenus les compte tous.</p>
        </fieldset>
      )}
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
            hint="Laisse vide si le revenu continue."
          />
        </div>
      )}
      {dernier && dernierAjustement && (
        <CheckboxField
          label="Mon solde réel indiqué dans « Mon compte » comprend déjà ce versement"
          checked={dejaDansSolde}
          onChange={(e) => setDejaDansSolde(e.target.checked)}
          hint="Coché : pas compté deux fois."
        />
      )}
      {attendu && (
        <div className="form-grid">
          <CheckboxField label="Montant encore inconnu" checked={inconnu} onChange={(e) => setInconnu(e.target.checked)} />
          <CheckboxField label="Inclure dans la projection optimiste" checked={optimiste} onChange={(e) => setOptimiste(e.target.checked)} />
        </div>
      )}
      <details className="disclosure" open={lignes.length > 0 || undefined}>
        <summary>Détail du revenu (bulletin de paie, facultatif)</summary>
        <div className="disclosure-body detail-revenu">
          <p className="field-hint">
            Une ligne par élément : salaire de base, cotisations (-), retenue titres-restaurant (-), indemnité transport (+)…
          </p>
          {lignes.map((l, i) => (
            <div key={i} className="detail-revenu-ligne">
              <TextField
                label={`Libellé de la ligne ${i + 1}`}
                value={l.label}
                onChange={(e) => setLignes(lignes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                maxLength={80}
              />
              <TextField
                label={`Montant de la ligne ${i + 1}`}
                inputMode="decimal"
                value={l.montant}
                placeholder="-10,40"
                onChange={(e) => setLignes(lignes.map((x, j) => (j === i ? { ...x, montant: e.target.value } : x)))}
              />
              <IconButton icon="trash" label={`Retirer la ligne ${i + 1}`} onClick={() => setLignes(lignes.filter((_, j) => j !== i))} />
            </div>
          ))}
          {errors.details && <p className="field-error">{errors.details}</p>}
          <Button variant="secondaire" className="btn-small" icon="plus" onClick={() => setLignes([...lignes, { label: '', montant: '' }])}>
            Ajouter une ligne
          </Button>
          {lignes.length > 0 && (
            <p className="field-hint">
              Total des lignes : {fmt(totalLignes)}
              {parseAmount(amount) !== null && totalLignes !== parseAmount(amount) && ` (le montant du revenu est de ${fmt(parseAmount(amount)!)})`}
            </p>
          )}
        </div>
      </details>
      <TextAreaField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <FormActions
        onCancel={onCancel}
        submitLabel={
          confirmerReception
            ? 'Confirmer la réception'
            : initial
              ? 'Enregistrer les modifications'
              : attendu
                ? 'Ajouter le revenu attendu'
                : 'Ajouter le revenu'
        }
      />
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
  const { dispatch } = useApp();
  const confirmer = useConfirmation();
  const choix = useChoixCategorie('fixed', initial?.categoryId);
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(centsToInput(initial?.amount));
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? 'mensuel');
  const [endDate, setEndDate] = useState(initial?.endDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount);
    const errs: Errors = {
      name: name.trim() ? null : 'Donne un nom à cette charge (ex. : loyer).',
      amount: amountError,
      date: checkDate(date),
      ...choix.erreurs(),
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
        categoryId: choix.resoudre(),
        frequency,
        endDate: endDate || null,
        note: note.trim(),
        status: initial?.status ?? {},
      },
    });
    confirmer(initial ? 'Charge fixe modifiée et enregistrée.' : 'Charge fixe enregistrée.', date, true);
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <div className="form-grid">
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={80} placeholder="Ex. : loyer" />
        <MoneyField label="Montant" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <ChampCategorie choix={choix} errors={errors} />
        <TextField
          label="Date de prélèvement prévue"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
          hint="Première échéance. Les suivantes sont automatiques."
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
          hint="Laisse vide si la charge continue."
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
  nomPropose,
  onDone,
  onCancel,
}: {
  initial?: SavingsGoal;
  /** Nom prérempli (idée d'objectif choisie dans la page). */
  nomPropose?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data, dispatch, notify, today } = useApp();
  const supports = data.supports ?? [];
  const [suivis, setSuivis] = useState<string[]>(initial?.supportIds ?? []);
  const [name, setName] = useState(initial?.name ?? nomPropose ?? '');
  // Illustration : « auto » = déduite du nom
  const [theme, setTheme] = useState<GoalTheme | 'auto'>(initial?.theme ?? 'auto');
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
      name: name.trim() ? null : 'Donne un nom à ton objectif.',
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
        ...(theme !== 'auto' ? { theme } : {}),
        ...(suivis.length > 0 ? { supportIds: suivis.filter((id) => supports.some((s) => s.id === id)) } : {}),
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
          hint="Ce que tu as déjà mis de côté pour cet objectif."
        />
        <MoneyField label="Contribution mensuelle prévue" value={monthly} onChange={(e) => setMonthly(e.target.value)} error={errors.monthly} />
        <TextField
          label="Date souhaitée"
          optional
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          error={errors.targetDate}
        />
        <SelectField label="Priorité" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </SelectField>
      </div>
      {supports.length > 0 && (
        <fieldset className="fieldset">
          <legend>Suivre mes supports d’épargne</legend>
          <p className="field-hint">Cochés : l’avancement devient le total de ces supports.</p>
          <div className="liste-cases">
            {supports.map((s) => (
              <CheckboxField
                key={s.id}
                label={s.name}
                checked={suivis.includes(s.id)}
                onChange={(e) => setSuivis(e.target.checked ? [...suivis, s.id] : suivis.filter((id) => id !== s.id))}
              />
            ))}
          </div>
        </fieldset>
      )}
      <TextAreaField label="Description" optional value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
      <fieldset className="fieldset choix-illustration">
        <legend>Illustration</legend>
        <div className="choix-illustration-liste">
          {(['auto', ...GOAL_THEMES] as const).map((t) => {
            const apercu = t === 'auto' ? themeFromName(name) : t;
            return (
              <label key={t} className={`choix-illustration-option ${theme === t ? 'actif' : ''}`}>
                <input type="radio" name="theme-objectif" className="sr-only" checked={theme === t} onChange={() => setTheme(t)} />
                <IllustrationObjectif theme={apercu} className="choix-illustration-image" />
                <span>{t === 'auto' ? 'Automatique' : THEME_LABELS[t]}</span>
              </label>
            );
          })}
        </div>
        <p className="field-hint">« Automatique » choisit l’image d’après le nom de l’objectif.</p>
      </fieldset>
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
  supportId,
  defaultDate,
  onDone,
  onCancel,
}: {
  initial?: SavingsDeposit;
  goalId?: string | null;
  /** Support d'épargne proposé (livret, PEL…). */
  supportId?: string;
  defaultDate: ISODate;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data, dispatch, notify, fmt, today } = useApp();
  const [amount, setAmount] = useState(centsToInput(initial?.amount));
  const [target, setTarget] = useState(initial?.goalId ?? goalId ?? data.goals[0]?.id ?? '');
  const supports = data.supports ?? [];
  const [support, setSupport] = useState(initial?.supportId ?? supportId ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount);
    const errs: Errors = { amount: amountError, date: checkDate(date) };
    setErrors(errs);
    if (hasErrors(errs) || cents === null) return;
    const depot: SavingsDeposit = {
      id: initial?.id ?? newId('epa'),
      goalId: target || null,
      amount: cents,
      date,
      note: note.trim(),
      ...(support ? { supportId: support } : {}),
    };
    // Étape franchie (25, 50, 75, 100 %) : Poksy le signale, sans rien enregistrer de plus
    const etape = messageEtape(data, depot, today);
    dispatch({ type: 'upsert', collection: 'savings', item: depot });
    if (etape) notify(etape, 'bravo');
    else notify(initial ? 'Versement modifié.' : `Versement de ${fmt(cents)} enregistré.`);
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
        {supports.length > 0 && (
          <SelectField
            label="Sur quel support ?"
            optional
            value={support}
            onChange={(e) => setSupport(e.target.value)}
            hint="Le solde de ce support augmente du montant versé."
          >
            <option value="">Non précisé</option>
            {supports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        )}
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <TextField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
      </div>
      <p className="field-hint">Ce montant est déduit de ton solde disponible du mois et ajouté à ton épargne.</p>
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer' : 'Enregistrer le versement'} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Support d'épargne (livret, PEL, compte…)                                    */
/* -------------------------------------------------------------------------- */

/** Taux saisi en texte (« 1,575 ») → nombre, ou null si illisible. */
function lireTaux(texte: string): number | null {
  const t = texte.trim().replace(',', '.').replace(/\s*%$/, '');
  if (t === '') return 0;
  const v = Number(t);
  return Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
}

export function SupportForm({
  initial,
  kindPropose,
  onDone,
  onCancel,
}: {
  initial?: SavingsSupport;
  kindPropose?: SupportKind;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { dispatch, notify, today } = useApp();
  const depart = MODELES_SUPPORT[initial?.kind ?? kindPropose ?? 'livret-a'];
  const [kind, setKind] = useState<SupportKind>(initial?.kind ?? kindPropose ?? 'livret-a');
  const [name, setName] = useState(initial?.name ?? depart.label);
  const [balance, setBalance] = useState(centsToInput(initial?.balance ?? 0));
  const [balanceDate, setBalanceDate] = useState(initial?.balanceDate ?? today);
  const [rate, setRate] = useState(String(initial?.rate ?? depart.taux).replace('.', ','));
  const [bloque, setBloque] = useState((initial?.liquidity ?? depart.liquidite) === 'bloque');
  const [blockedUntil, setBlockedUntil] = useState(initial?.blockedUntil ?? '');
  const [cloture, setCloture] = useState(initial?.withdrawalCloses ?? depart.retraitCloture);
  const [ceiling, setCeiling] = useState(centsToInput(initial?.ceiling ?? depart.plafond ?? undefined));
  const [target, setTarget] = useState(centsToInput(initial?.target ?? undefined));
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});

  // Changer de type préremplit les repères (nom, taux, blocage, plafond), modifiables ensuite
  const changerType = (k: SupportKind) => {
    const m = MODELES_SUPPORT[k];
    if (!name.trim() || name === MODELES_SUPPORT[kind].label) setName(m.label);
    setKind(k);
    setRate(String(m.taux).replace('.', ','));
    setBloque(m.liquidite === 'bloque');
    setCloture(m.retraitCloture);
    setCeiling(centsToInput(m.plafond ?? undefined));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [b, bErr] = checkAmount(balance, { allowZero: true });
    const [c, cErr] = checkAmount(ceiling, { required: false, allowZero: true });
    const [t, tErr] = checkAmount(target, { required: false, allowZero: true });
    const taux = lireTaux(rate);
    const errs: Errors = {
      name: name.trim() ? null : 'Donne un nom à ce support (ex. : Livret A).',
      balance: bErr,
      balanceDate: checkDate(balanceDate),
      rate: taux === null ? 'Taux non reconnu. Exemple : 1,7' : null,
      blockedUntil: checkDate(blockedUntil, false),
      ceiling: cErr,
      target: tErr,
    };
    setErrors(errs);
    if (hasErrors(errs) || b === null || taux === null) return;
    dispatch({
      type: 'upsert',
      collection: 'supports',
      item: {
        id: initial?.id ?? newId('sup'),
        name: name.trim(),
        kind,
        balance: b,
        balanceDate,
        rate: taux,
        liquidity: bloque ? 'bloque' : 'immediate',
        blockedUntil: bloque && blockedUntil ? blockedUntil : null,
        withdrawalCloses: cloture,
        ceiling: ceiling.trim() && c ? c : null,
        target: target.trim() && t ? t : null,
        note: note.trim(),
      },
    });
    notify(initial ? 'Support modifié.' : 'Support ajouté.');
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <div className="form-grid">
        <SelectField
          label="Type de support"
          value={kind}
          onChange={(e) => changerType(e.target.value as SupportKind)}
          hint={MODELES_SUPPORT[kind].aide || undefined}
        >
          {SUPPORT_KINDS.map((k) => (
            <option key={k} value={k}>
              {MODELES_SUPPORT[k].label}
            </option>
          ))}
        </SelectField>
        <TextField label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={60} />
        <MoneyField label="Solde" value={balance} onChange={(e) => setBalance(e.target.value)} error={errors.balance} />
        <TextField
          label="Solde connu au"
          type="date"
          value={balanceDate}
          onChange={(e) => setBalanceDate(e.target.value)}
          error={errors.balanceDate}
          hint="Les versements liés à ce support après cette date s’ajoutent au solde."
        />
        <TextField
          label="Taux annuel net (%)"
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          error={errors.rate}
          hint="Indicatif : vérifie le taux auprès de ta banque."
        />
        <MoneyField label="Plafond de versements" optional value={ceiling} onChange={(e) => setCeiling(e.target.value)} error={errors.ceiling} />
        <MoneyField
          label="Montant visé sur ce support"
          optional
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          error={errors.target}
          hint="Ta répartition cible (ex. : 4 100 € sur le PEL)."
        />
      </div>
      <fieldset className="fieldset">
        <legend>Disponibilité</legend>
        <CheckboxField label="Argent bloqué (pas disponible tout de suite)" checked={bloque} onChange={(e) => setBloque(e.target.checked)} />
        {bloque && (
          <div className="form-grid">
            <TextField
              label="Bloqué jusqu’au"
              optional
              type="date"
              value={blockedUntil}
              onChange={(e) => setBlockedUntil(e.target.value)}
              error={errors.blockedUntil}
            />
          </div>
        )}
        <CheckboxField
          label="Un retrait clôture ce support"
          checked={cloture}
          onChange={(e) => setCloture(e.target.checked)}
          hint="C’est le cas du PEL : aucun retrait partiel possible."
        />
      </fieldset>
      <TextAreaField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Ajouter le support'} />
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Somme bloquée temporairement (dépôt de garantie, caution…)                  */
/* -------------------------------------------------------------------------- */

export function HoldForm({
  initial,
  defaultDate,
  onDone,
  onCancel,
}: {
  initial?: TemporaryHold;
  defaultDate: ISODate;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data, dispatch, notify } = useApp();
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(centsToInput(initial?.amount));
  const [start, setStart] = useState(initial?.start ?? defaultDate);
  const [end, setEnd] = useState(initial?.end ?? '');
  const [compteChoisi, setCompte] = useState<AccountId>(initial?.account ?? 'compte');
  const proposerCompte = usesCarteRestaurant(data) || compteChoisi === 'carte-restaurant';
  const [note, setNote] = useState(initial?.note ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [cents, amountError] = checkAmount(amount);
    const errs: Errors = {
      label: label.trim() ? null : 'Donne un nom (ex. : dépôt de garantie).',
      amount: amountError,
      start: checkDate(start),
      end: checkDate(end, false) ?? (end && end < start ? 'La date de restitution doit suivre la date de blocage.' : null),
    };
    setErrors(errs);
    if (hasErrors(errs) || cents === null) return;
    dispatch({
      type: 'upsert',
      collection: 'holds',
      item: {
        id: initial?.id ?? newId('blq'),
        label: label.trim(),
        amount: cents,
        start,
        end: end || null,
        account: compteChoisi,
        returned: initial?.returned ?? false,
        note: note.trim(),
      },
    });
    notify(initial ? 'Somme bloquée modifiée.' : 'Somme bloquée enregistrée : ce n’est pas une dépense, ton solde ne change pas.');
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="form">
      <p className="field-hint">Une caution bloque de l’argent sans le dépenser. Indisponible jusqu’au remboursement.</p>
      <div className="form-grid">
        <TextField
          label="Nom"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          error={errors.label}
          maxLength={80}
          placeholder="Ex. : dépôt de garantie"
        />
        <MoneyField label="Montant bloqué" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount} />
        <TextField label="Bloqué à partir du" type="date" value={start} onChange={(e) => setStart(e.target.value)} error={errors.start} />
        <TextField label="Rendu vers le" optional type="date" value={end} onChange={(e) => setEnd(e.target.value)} error={errors.end} />
        {proposerCompte && (
          <SelectField label="Sur" value={compteChoisi} onChange={(e) => setCompte(e.target.value as AccountId)}>
            <option value="compte">Mon compte</option>
            <option value="carte-restaurant">Carte restaurant</option>
          </SelectField>
        )}
      </div>
      <TextAreaField label="Note" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
      <FormActions onCancel={onCancel} submitLabel={initial ? 'Enregistrer les modifications' : 'Enregistrer la somme bloquée'} />
    </form>
  );
}
