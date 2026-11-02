import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type {
  AppData,
  Category,
  ChargeStatus,
  Expense,
  FixedCharge,
  Income,
  ISODate,
  MonthKey,
  Profile,
  SavingsDeposit,
  SavingsGoal,
  ThemeChoice,
} from '../types';
import { clearData, emptyData, listProfiles, loadData, loadIndex, saveData, saveIndex, type ProfilResume } from '../lib/storage';
import { newId } from '../lib/id';
import { monthOf, todayISO } from '../lib/dates';
import { formatMoney, formatMoneyShort } from '../lib/money';
import { makeCategory } from '../lib/categories';

/* -------------------------------------------------------------------------- */
/* Réducteur (fonction pure, testée)                                           */
/* -------------------------------------------------------------------------- */

type Collections = {
  incomes: Income;
  fixedCharges: FixedCharge;
  expenses: Expense;
  goals: SavingsGoal;
  savings: SavingsDeposit;
  categories: Category;
};
type CollectionName = keyof Collections;

export type Action =
  | { type: 'replace'; data: AppData }
  | { type: 'reset' }
  | { type: 'setProfile'; profile: Profile }
  | { type: 'setTheme'; theme: ThemeChoice }
  | { type: 'setLastBackup'; date: ISODate }
  | { type: 'setHideAmounts'; hide: boolean }
  | { type: 'dismissAction'; id: string }
  | { type: 'setCarryOver'; value: boolean }
  | { [K in CollectionName]: { type: 'upsert'; collection: K; item: Collections[K] } }[CollectionName]
  | { type: 'remove'; collection: Exclude<CollectionName, 'categories' | 'goals'>; id: string }
  | { type: 'removeGoal'; id: string }
  | { type: 'removeCategory'; id: string }
  | { type: 'setChargeStatus'; id: string; date: ISODate; status: ChargeStatus };

const FALLBACK_NAMES: Record<Category['kind'], string> = {
  income: 'Autre revenu',
  fixed: 'Autre charge',
  variable: 'Autre dépense',
};

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'replace':
      return action.data;
    case 'reset':
      return { ...emptyData(), settings: state.settings };
    case 'setProfile':
      return { ...state, profile: action.profile };
    case 'setTheme':
      return { ...state, settings: { ...state.settings, theme: action.theme } };
    case 'setLastBackup':
      return { ...state, settings: { ...state.settings, lastBackup: action.date } };
    case 'setHideAmounts':
      return { ...state, settings: { ...state.settings, hideAmounts: action.hide } };
    case 'setCarryOver':
      return { ...state, settings: { ...state.settings, carryOver: action.value } };
    case 'dismissAction': {
      // On garde les 50 derniers identifiants : la liste ne grossit pas indéfiniment.
      const deja = state.settings.dismissedActions ?? [];
      if (deja.includes(action.id)) return state;
      return { ...state, settings: { ...state.settings, dismissedActions: [...deja, action.id].slice(-50) } };
    }
    case 'upsert': {
      const list = state[action.collection] as { id: string }[];
      const exists = list.some((x) => x.id === action.item.id);
      const next = exists ? list.map((x) => (x.id === action.item.id ? action.item : x)) : [...list, action.item];
      return { ...state, [action.collection]: next };
    }
    case 'remove': {
      const list = state[action.collection] as { id: string }[];
      return { ...state, [action.collection]: list.filter((x) => x.id !== action.id) };
    }
    case 'removeGoal':
      // Les versements déjà effectués restent comptés comme « épargne libre ».
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.id),
        savings: state.savings.map((s) => (s.goalId === action.id ? { ...s, goalId: null } : s)),
      };
    case 'removeCategory': {
      const cat = state.categories.find((c) => c.id === action.id);
      if (!cat) return state;
      let categories = state.categories.filter((c) => c.id !== action.id);
      // Les éléments de la catégorie supprimée sont rattachés à « Autre … ».
      const fallbackName = FALLBACK_NAMES[cat.kind];
      let fallback = categories.find((c) => c.kind === cat.kind && c.name === fallbackName);
      const used =
        state.incomes.some((x) => x.categoryId === cat.id) ||
        state.fixedCharges.some((x) => x.categoryId === cat.id) ||
        state.expenses.some((x) => x.categoryId === cat.id);
      if (!used) return { ...state, categories };
      if (!fallback) {
        fallback = makeCategory(cat.name === fallbackName ? `${fallbackName} (2)` : fallbackName, cat.kind);
        categories = [...categories, fallback];
      }
      const to = fallback.id;
      const move = <T extends { categoryId: string }>(items: T[]) =>
        items.map((x) => (x.categoryId === cat.id ? { ...x, categoryId: to } : x));
      return {
        ...state,
        categories,
        incomes: move(state.incomes),
        fixedCharges: move(state.fixedCharges),
        expenses: move(state.expenses),
      };
    }
    case 'setChargeStatus':
      return {
        ...state,
        fixedCharges: state.fixedCharges.map((c) =>
          c.id === action.id ? { ...c, status: { ...c.status, [action.date]: action.status } } : c,
        ),
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Contexte React                                                              */
/* -------------------------------------------------------------------------- */

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  message: string;
  kind: 'succes' | 'erreur' | 'info';
  action?: ToastAction;
}

interface AppContextValue {
  data: AppData;
  dispatch: (action: Action) => void;
  today: ISODate;
  month: MonthKey;
  setMonth: (m: MonthKey) => void;
  currency: string;
  /** Montant formaté (masqué si l'option « masquer les montants » est active). */
  fmt: (cents: number) => string;
  /** Montant arrondi à l'euro (masqué si besoin). */
  fmtShort: (cents: number, mode?: 'arrondi' | 'prudent' | 'majore') => string;
  masque: boolean;
  notify: (message: string, kind?: Toast['kind'], action?: ToastAction) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  /** Profils enregistrés sur cet appareil (le profil ouvert compris s'il est configuré). */
  profils: ProfilResume[];
  profilActif: string;
  /** Ouvre un autre profil. */
  changerProfil: (id: string) => void;
  /** Prépare un nouveau profil vide (il est enregistré à la fin de la configuration). */
  nouveauProfil: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  children,
  initialData,
  today: fixedToday,
}: {
  children: ReactNode;
  initialData?: AppData;
  /** Date imposée (tests). */
  today?: ISODate;
}) {
  // Profil ouvert : lu dans l'index des profils (le premier profil garde la clé historique).
  const [profilActif, setProfilActif] = useState<string>(() => loadIndex().actif);
  const [data, dispatch] = useReducer(reducer, initialData, (init) => init ?? loadData(loadIndex().actif));
  const [profils, setProfils] = useState<ProfilResume[]>(() => listProfiles());
  const today = fixedToday ?? todayISO();
  const [month, setMonth] = useState<MonthKey>(monthOf(today));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback(
    (message: string, kind: Toast['kind'] = 'succes', action?: ToastAction) => {
      toastId.current += 1;
      const id = toastId.current;
      // Une seule notification à la fois : sur mobile, une pile masquait le contenu.
      setToasts([{ id, message, kind, action }]);
      // Un message avec une action reste plus longtemps, le temps de la lire et de choisir.
      setTimeout(() => dismissToast(id), kind === 'erreur' || action ? 8000 : 4000);
    },
    [dismissToast],
  );

  // Sauvegarde locale automatique à chaque modification (dans les données du profil ouvert).
  const first = useRef(true);
  const sauterSauvegarde = useRef(false);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (sauterSauvegarde.current) {
      // Changement de profil : les données viennent d'être lues, rien à réécrire.
      sauterSauvegarde.current = false;
      return;
    }
    const index = loadIndex();
    const isEmpty =
      !data.profile &&
      [data.categories, data.incomes, data.fixedCharges, data.expenses, data.goals, data.savings].every((l) => l.length === 0);
    if (isEmpty) {
      clearData(profilActif); // après « Tout effacer », rien ne reste dans le navigateur pour ce profil
      saveIndex({ actif: profilActif, ids: index.ids.filter((id) => id !== profilActif) });
      setProfils(listProfiles());
      return;
    }
    if (!saveData(data, profilActif)) {
      notify('Impossible d’enregistrer dans ce navigateur (stockage plein ou désactivé).', 'erreur');
      return;
    }
    if (data.profile && (!index.ids.includes(profilActif) || index.actif !== profilActif)) {
      saveIndex({ actif: profilActif, ids: index.ids.includes(profilActif) ? index.ids : [...index.ids, profilActif] });
    }
    setProfils(listProfiles());
  }, [data, notify, profilActif]);

  /** Avant de quitter le profil ouvert : ses données sont enregistrées et il figure dans l'index. */
  const garderProfilOuvert = useCallback((): string[] => {
    const ids = loadIndex().ids;
    if (!data.profile) return ids;
    saveData(data, profilActif);
    return ids.includes(profilActif) ? ids : [...ids, profilActif];
  }, [data, profilActif]);

  const changerProfil = useCallback(
    (id: string) => {
      if (id === profilActif) return;
      const ids = garderProfilOuvert();
      saveIndex({ actif: id, ids });
      sauterSauvegarde.current = true;
      setProfilActif(id);
      dispatch({ type: 'replace', data: loadData(id) });
      setMonth(monthOf(today));
      setProfils(listProfiles());
    },
    [profilActif, today, garderProfilOuvert],
  );

  const nouveauProfil = useCallback(() => {
    const id = newId('profil').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);
    const ids = garderProfilOuvert();
    saveIndex({ actif: id, ids });
    sauterSauvegarde.current = true;
    setProfilActif(id);
    // Nouveau profil vide ; le thème choisi est conservé.
    dispatch({ type: 'replace', data: { ...emptyData(), settings: { ...emptyData().settings, theme: data.settings.theme } } });
    setMonth(monthOf(today));
    setProfils(listProfiles());
  }, [data.settings.theme, today, garderProfilOuvert]);

  // Thème clair / sombre.
  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', data.settings.theme);
  }, [data.settings.theme]);

  const currency = data.profile?.currency ?? 'EUR';
  const masque = data.settings.hideAmounts === true;
  // En mode masqué, chaque montant devient « ••• € » (symbole de la devise conservé).
  const montantMasque = useMemo(() => `•••\u00a0${formatMoney(0, currency).replace(/[\d,.\s\u00a0-]/g, '')}`, [currency]);
  const fmt = useCallback((cents: number) => (masque ? montantMasque : formatMoney(cents, currency)), [currency, masque, montantMasque]);
  const fmtShort = useCallback(
    (cents: number, mode: 'arrondi' | 'prudent' | 'majore' = 'arrondi') =>
      masque ? montantMasque : formatMoneyShort(cents, currency, mode),
    [currency, masque, montantMasque],
  );

  const value = useMemo(
    () => ({
      data,
      dispatch,
      today,
      month,
      setMonth,
      currency,
      fmt,
      fmtShort,
      masque,
      notify,
      toasts,
      dismissToast,
      profils,
      profilActif,
      changerProfil,
      nouveauProfil,
    }),
    [data, today, month, currency, fmt, fmtShort, masque, notify, toasts, dismissToast, profils, profilActif, changerProfil, nouveauProfil],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>.');
  return ctx;
}
