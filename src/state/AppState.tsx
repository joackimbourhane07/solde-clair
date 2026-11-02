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
import { clearData, emptyData, loadData, saveData } from '../lib/storage';
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

export interface Toast {
  id: number;
  message: string;
  kind: 'succes' | 'erreur' | 'info';
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
  notify: (message: string, kind?: Toast['kind']) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
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
  const [data, dispatch] = useReducer(reducer, initialData, (init) => init ?? loadData());
  const today = fixedToday ?? todayISO();
  const [month, setMonth] = useState<MonthKey>(monthOf(today));
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback(
    (message: string, kind: Toast['kind'] = 'succes') => {
      toastId.current += 1;
      const id = toastId.current;
      // Une seule notification à la fois : sur mobile, une pile masquait le contenu.
      setToasts([{ id, message, kind }]);
      setTimeout(() => dismissToast(id), kind === 'erreur' ? 7000 : 4000);
    },
    [dismissToast],
  );

  // Sauvegarde locale automatique à chaque modification.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const isEmpty =
      !data.profile &&
      [data.categories, data.incomes, data.fixedCharges, data.expenses, data.goals, data.savings].every((l) => l.length === 0);
    if (isEmpty) {
      clearData(); // après « Tout effacer », rien ne reste dans le navigateur
      return;
    }
    if (!saveData(data)) {
      notify('Impossible d’enregistrer dans ce navigateur (stockage plein ou désactivé).', 'erreur');
    }
  }, [data, notify]);

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
    () => ({ data, dispatch, today, month, setMonth, currency, fmt, fmtShort, masque, notify, toasts, dismissToast }),
    [data, today, month, currency, fmt, fmtShort, masque, notify, toasts, dismissToast],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé dans <AppProvider>.');
  return ctx;
}
