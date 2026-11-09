import type { AppData, Cents, ISODate } from '../types';
import { categoryBudgets, monthSummary, upcomingCharges } from './budget';
import { addDays, dayDiff, formatDate, monthOf } from './dates';

/**
 * Petites actions utiles proposées sur le tableau de bord (3 au maximum).
 * Chaque action a un identifiant stable : « Ignorer » la masque jusqu'au mois suivant
 * (l'identifiant contient le mois) ou jusqu'à ce que la situation change.
 */
export interface BudgetAction {
  id: string;
  /** 1 = à traiter maintenant, 2 = bientôt, 3 = quand tu as un moment. */
  priority: 1 | 2 | 3;
  title: string;
  detail: string;
  cta: string;
  to: string;
}

export const MAX_ACTIONS = 3;

/** Médiane d'une liste de montants. */
function median(values: Cents[]): Cents {
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
}

export function suggestedActions(data: AppData, today: ISODate, fmt: (c: Cents) => string): BudgetAction[] {
  const month = monthOf(today);
  const s = monthSummary(data, month, today);
  const actions: BudgetAction[] = [];

  // Limites dépassées ou presque atteintes
  for (const line of categoryBudgets(data, month)) {
    const nom = line.category.name;
    if (line.level === 'depasse') {
      actions.push({
        id: `limite:${line.category.id}:${month}`,
        priority: 1,
        title: `Ton budget « ${nom} » est dépassé de ${fmt(-(line.remaining ?? 0))}.`,
        detail: 'Tu peux consulter les dépenses concernées ou ajuster cette limite pour le mois.',
        cta: 'Ajuster la limite',
        to: '/budgets',
      });
    } else if (line.level === 'alerte') {
      actions.push({
        id: `presque:${line.category.id}:${month}`,
        priority: 2,
        title: `Budget « ${nom} » presque atteint : il reste ${fmt(line.remaining ?? 0)}.`,
        detail: `${line.pct} % de la limite est déjà utilisé.`,
        cta: 'Voir le budget',
        to: '/budgets',
      });
    }
  }

  // Rythme qui ferait finir le mois dans le rouge
  if (s.available >= 0 && s.forecastEndBalance < 0) {
    actions.push({
      id: `rythme:${month}`,
      priority: 1,
      // Sans montant : l'estimation juste en dessous le donne déjà (pas de chiffre répété)
      title: 'À ce rythme, le mois pourrait finir dans le rouge.',
      detail:
        s.dailyRemaining !== null && s.dailyRemaining > 0
          ? `Pour finir à l’équilibre, vise environ ${fmt(s.dailyRemaining)} par jour.`
          : 'Regarde les dépenses qui peuvent attendre le mois prochain.',
      cta: 'Voir mes dépenses',
      to: '/depenses',
    });
  }

  // Prélèvement imminent (aujourd'hui ou demain)
  const imminent = upcomingCharges(data, today, 1)[0];
  if (imminent) {
    const quand = imminent.date === today ? 'aujourd’hui' : 'demain';
    actions.push({
      id: `charge:${imminent.key}`,
      priority: 2,
      title: `Prélèvement « ${imminent.label} » ${quand} : ${fmt(imminent.amount)}.`,
      detail: 'Vérifie que le montant est prévu sur ton compte, puis marque-le comme payé.',
      cta: 'Voir mes charges',
      to: '/charges',
    });
  }

  // Dépense inhabituelle des 7 derniers jours (au moins 3 fois la médiane de sa catégorie sur 90 jours)
  const depuis = addDays(today, -90);
  const recentes = data.expenses.filter((e) => e.date <= today && dayDiff(e.date, today) <= 6);
  for (const e of recentes.sort((a, b) => b.amount - a.amount)) {
    const historique = data.expenses.filter((x) => x.categoryId === e.categoryId && x.id !== e.id && x.date >= depuis && x.date <= today);
    if (historique.length < 4 || e.amount < 3000) continue;
    const med = median(historique.map((x) => x.amount));
    if (e.amount >= med * 3) {
      actions.push({
        id: `inhabituelle:${e.id}`,
        priority: 2,
        title: `Dépense inhabituelle : ${e.description ? `« ${e.description} »` : 'une dépense'} de ${fmt(e.amount)}.`,
        detail: `Le ${formatDate(e.date)}, environ ${Math.round(e.amount / Math.max(med, 1))} fois plus que d’habitude dans cette catégorie. Vérifie qu’elle est correcte.`,
        cta: 'Vérifier',
        to: '/depenses',
      });
      break;
    }
  }

  // Épargne du mois, à partir du 10 : un petit pas plutôt qu'un reproche
  if (s.savingsTarget > 0 && s.saved < s.savingsTarget && Number(today.slice(8, 10)) >= 10) {
    actions.push({
      id: `epargne:${month}`,
      priority: 3,
      title: `Il te manque ${fmt(s.savingsTarget - s.saved)} pour respecter ton objectif d’épargne du mois.`,
      detail: s.saved > 0 ? `Tu as déjà mis ${fmt(s.saved)} de côté : c’est un bon début.` : 'Même un petit versement compte.',
      cta: 'Ajouter un versement',
      to: '/objectifs',
    });
  }

  // Sauvegarde : jamais faite ou il y a plus de 30 jours
  const derniere = data.settings.lastBackup ?? null;
  if (!derniere || dayDiff(derniere, today) > 30) {
    actions.push({
      id: `sauvegarde:${month}`,
      priority: 3,
      title: 'Fais une sauvegarde de tes données.',
      detail: derniere ? `Dernière sauvegarde le ${formatDate(derniere)}.` : 'Elle permet de tout retrouver si le navigateur est effacé.',
      cta: 'Sauvegarder',
      to: '/parametres',
    });
  }

  const ignorees = new Set(data.settings.dismissedActions ?? []);
  return actions.filter((a) => !ignorees.has(a.id)).sort((a, b) => a.priority - b.priority);
}

/** Message positif quand tout va bien (aucune limite dépassée, au moins une limite définie). */
export function allLimitsRespected(data: AppData, today: ISODate): boolean {
  const lignes = categoryBudgets(data, monthOf(today)).filter((l) => l.budget !== null);
  return lignes.length > 0 && lignes.every((l) => l.level !== 'depasse');
}
