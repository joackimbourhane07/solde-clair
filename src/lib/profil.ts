import type { AppData, Cents, ISODate, ProfileType, SupportKind } from '../types';
import { addMonthsToDate, dayDiff, monthLabel, monthOf, parseISO, toISO } from './dates';
import { monthlyEquivalent } from './recurrence';
import { sum } from './money';
import { age, budgetCourant, totauxEpargne } from './plan';

/*
 * Personnalisation selon le profil : on met en avant ce qui compte pour chaque situation,
 * sans rien interdire (voir docs/profils-et-donnees.md).
 */

export const typeProfil = (data: AppData): ProfileType => data.profile?.type ?? 'autre';

/* -------------------------------------------------------------------------- */
/* Libellés de la situation                                                    */
/* -------------------------------------------------------------------------- */

export interface LibellesSituation {
  titre: string;
  formation: string;
  employeur: string;
  debut: string;
  fin: string;
  /** Exemple affiché dans le champ formation. */
  exempleFormation: string;
}

export const LIBELLES_SITUATION: Record<ProfileType, LibellesSituation> = {
  etudiant: {
    titre: 'Mes études',
    formation: 'Études',
    employeur: 'Établissement',
    debut: 'Début de l’année',
    fin: 'Fin de l’année',
    exempleFormation: 'Ex. : licence 2',
  },
  alternant: {
    titre: 'Mon contrat d’alternance',
    formation: 'Formation',
    employeur: 'Entreprise',
    debut: 'Début du contrat',
    fin: 'Fin du contrat',
    exempleFormation: 'Ex. : BTS, 2e année',
  },
  salarie: {
    titre: 'Mon emploi',
    formation: 'Poste',
    employeur: 'Employeur',
    debut: 'Date d’embauche',
    fin: 'Fin du contrat (CDD)',
    exempleFormation: 'Ex. : technicien',
  },
  independant: {
    titre: 'Mon activité',
    formation: 'Activité',
    employeur: 'Nom de l’entreprise',
    debut: 'Début d’activité',
    fin: 'Fin prévue',
    exempleFormation: 'Ex. : graphiste',
  },
  autre: { titre: 'Ma situation', formation: 'Situation', employeur: 'Organisme', debut: 'Depuis le', fin: 'Jusqu’au', exempleFormation: '' },
};

/* -------------------------------------------------------------------------- */
/* Revenus attendus suggérés                                                   */
/* -------------------------------------------------------------------------- */

export interface SuggestionRevenu {
  nom: string;
  /** Mois habituel (1-12), pour proposer une date ; null : pas de mois type. */
  mois: number | null;
  aide: string;
}

const TREIZIEME: SuggestionRevenu = {
  nom: '13e mois',
  mois: 12,
  aide: 'Pas obligatoire : il dépend de la convention collective, d’un accord ou du contrat. Souvent versé en décembre, au prorata du temps de présence.',
};
const PPV: SuggestionRevenu = {
  nom: 'Prime de partage de la valeur',
  mois: null,
  aide: 'Prime facultative décidée par l’entreprise, parfois versée en plusieurs fois.',
};
const PARTICIPATION: SuggestionRevenu = {
  nom: 'Participation / intéressement',
  mois: 6,
  aide: 'Selon l’entreprise ; souvent versée au printemps. Elle peut aussi être placée sur l’épargne salariale (bloquée).',
};

/** Revenus attendus mis en avant selon le profil (les autres restent possibles à la main). */
export const REVENUS_ATTENDUS_SUGGERES: Record<ProfileType, SuggestionRevenu[]> = {
  etudiant: [
    { nom: 'Job d’été', mois: 7, aide: 'Pendant l’été, la bourse n’est pas versée (juillet et août) : un job peut compenser.' },
    { nom: 'Aide de rentrée', mois: 9, aide: 'Aide familiale ou aide locale pour les frais de rentrée.' },
  ],
  alternant: [
    TREIZIEME,
    PPV,
    PARTICIPATION,
    {
      nom: 'Solde de tout compte',
      mois: null,
      aide: 'En fin de contrat : congés non pris, prorata de 13e mois éventuel. Montant à estimer en fourchette.',
    },
  ],
  salarie: [TREIZIEME, { nom: 'Prime annuelle', mois: null, aide: 'Prime d’objectifs, d’ancienneté… selon votre contrat.' }, PPV, PARTICIPATION],
  independant: [
    { nom: 'Facture en attente', mois: null, aide: 'Une facture émise mais pas encore payée : comptez-la seulement à son encaissement.' },
  ],
  autre: [{ nom: 'Prime', mois: null, aide: 'Un revenu possible mais pas encore sûr.' }],
};

/** Date proposée pour un revenu attendu : le prochain mois habituel, le 10, sinon dans un mois. */
export function dateSuggeree(s: SuggestionRevenu, today: ISODate): ISODate {
  if (s.mois === null) return addMonthsToDate(today, 1);
  const t = parseISO(today);
  const annee = s.mois > t.month || (s.mois === t.month && t.day <= 10) ? t.year : t.year + 1;
  return toISO(annee, s.mois, 10);
}

/* -------------------------------------------------------------------------- */
/* Supports d'épargne suggérés                                                 */
/* -------------------------------------------------------------------------- */

export function supportsSuggeres(type: ProfileType, ageAnnees: number | null): SupportKind[] {
  const jeune = ageAnnees !== null ? ageAnnees <= 25 : type === 'etudiant' || type === 'alternant';
  const base: SupportKind[] =
    type === 'etudiant'
      ? ['livret-a']
      : type === 'alternant'
        ? ['livret-a', 'pel']
        : type === 'salarie'
          ? ['livret-a', 'ldds', 'epargne-salariale']
          : type === 'independant'
            ? ['livret-a', 'ldds']
            : ['livret-a', 'ldds'];
  return jeune ? ['livret-jeune', ...base] : base;
}

/* -------------------------------------------------------------------------- */
/* Repères pour vous (accueil et « Mon plan »)                                 */
/* -------------------------------------------------------------------------- */

export interface Repere {
  id: string;
  titre: string;
  texte: string;
  /** Page à ouvrir pour agir (facultatif). */
  lien?: { to: string; label: string };
}

function moisAvant(fin: ISODate, today: ISODate): number {
  const a = parseISO(today);
  const b = parseISO(fin);
  return (b.year - a.year) * 12 + (b.month - a.month) - (b.day < a.day ? 1 : 0);
}

function dureeLisible(jours: number): string {
  if (jours <= 1) return jours === 1 ? 'demain' : 'aujourd’hui';
  if (jours < 60) return `dans ${jours} jours`;
  return `dans ${Math.round(jours / 30.4)} mois`;
}

/** Charges fixes mensuelles + budget des dépenses courantes : base de la réserve de précaution. */
export function chargesMensuelles(data: AppData): Cents {
  return sum(data.fixedCharges.map((c) => monthlyEquivalent(c.amount, c.frequency))) + budgetCourant(data);
}

/**
 * Deux ou trois repères adaptés au profil. Rien n'est caché ailleurs : ces repères mettent en avant
 * ce qui compte le plus pour la situation déclarée.
 */
export function reperesPourVous(data: AppData, today: ISODate): Repere[] {
  const p = data.profile;
  if (!p) return [];
  const type = p.type;
  const sit = p.situation ?? {};
  const ageAnnees = age(p.birthDate, today);
  const reperes: Repere[] = [];
  const mois = parseISO(today).month;

  // Fin de contrat (alternant, CDD…) : compte à rebours et solde de tout compte
  if (sit.fin && sit.fin >= today && (type === 'alternant' || type === 'salarie' || type === 'autre')) {
    const jours = dayDiff(today, sit.fin);
    const attenduFin = data.incomes.some((i) => i.certitude === 'attendu' && /solde de tout compte/i.test(i.name));
    reperes.push({
      id: 'fin-contrat',
      titre: `Fin du contrat ${dureeLisible(jours)}`,
      texte:
        `Votre contrat se termine le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(sit.fin + 'T12:00:00'))}` +
        (attenduFin
          ? '. Le solde de tout compte est déjà prévu dans vos revenus attendus.'
          : '. Pensez au solde de tout compte (congés non pris…) : ajoutez-le en revenu attendu.'),
      lien: attenduFin
        ? { to: '/plan', label: 'Voir mon plan' }
        : { to: '/plan?attendu=solde-de-tout-compte', label: 'Ajouter le solde de tout compte' },
    });
  }

  // Alternant : la rémunération augmente à chaque année de contrat et selon la tranche d'âge
  if (type === 'alternant') {
    const prochains: { date: ISODate; raison: string }[] = [];
    if (sit.debut) {
      for (let n = 1; n < 4; n += 1) {
        const anniv = addMonthsToDate(sit.debut, 12 * n);
        if (anniv > today && (!sit.fin || anniv < sit.fin)) {
          prochains.push({ date: anniv, raison: 'la nouvelle année de contrat' });
          break;
        }
      }
    }
    if (p.birthDate && ageAnnees !== null) {
      for (const seuil of [18, 21, 26]) {
        if (ageAnnees < seuil) {
          const anniversaire = addMonthsToDate(p.birthDate, 12 * seuil);
          // La hausse s'applique le mois suivant l'anniversaire
          const effet = toISO(parseISO(anniversaire).year, parseISO(anniversaire).month, 1);
          const suivant = addMonthsToDate(effet, 1);
          if (!sit.fin || suivant < sit.fin) prochains.push({ date: suivant, raison: `vos ${seuil} ans` });
          break;
        }
      }
    }
    prochains.sort((a, b) => a.date.localeCompare(b.date));
    if (prochains[0]) {
      reperes.push({
        id: 'revalorisation',
        titre: `Salaire revalorisé en ${monthLabel(monthOf(prochains[0].date))}`,
        texte: `Le salaire d’apprenti dépend de l’âge et de l’année de contrat : prochain changement lié à ${prochains[0].raison}. Mettez à jour votre revenu à ce moment-là.`,
        lien: { to: '/revenus', label: 'Voir mes revenus' },
      });
    }
  }

  // Étudiant : l'été sans bourse
  if (type === 'etudiant') {
    const bourse = data.incomes.find((i) => /bourse|crous/i.test(i.name));
    if (mois >= 3 && mois <= 8) {
      reperes.push({
        id: 'ete',
        titre: mois >= 7 ? 'L’été sans bourse' : 'Préparer l’été',
        texte: bourse
          ? 'La bourse est versée sur 10 mois : rien en juillet et en août. Mettez un peu de côté avant l’été, ou ajoutez un job d’été en revenu attendu.'
          : 'Si vous touchez une bourse, elle n’est versée que sur 10 mois (rien en juillet-août). Un job d’été peut compenser.',
        lien: { to: '/plan?attendu=job-d-ete', label: 'Ajouter un job d’été' },
      });
    } else {
      reperes.push({
        id: 'reste-par-jour',
        titre: 'Votre repère : le reste par jour',
        texte:
          'Avec un budget étudiant, le plus utile est de savoir combien vous pouvez dépenser par jour jusqu’à la fin du mois : il est affiché sur l’accueil.',
      });
    }
  }

  // Indépendant : réserve de précaution en mois de charges
  if (type === 'independant') {
    const charges = chargesMensuelles(data);
    const dispo = totauxEpargne(data, today).disponible;
    const moisReserve = charges > 0 ? dispo / charges : null;
    reperes.push({
      id: 'reserve',
      titre:
        moisReserve === null
          ? 'Votre réserve de précaution'
          : `Réserve : ${moisReserve.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} mois de charges`,
      texte:
        'Avec des revenus irréguliers, on conseille souvent une réserve de 3 à 6 mois de charges, disponible tout de suite. ' +
        (moisReserve !== null && moisReserve < 3
          ? 'Vous êtes en dessous de 3 mois : priorité à cette réserve.'
          : 'Pensez aussi à provisionner vos cotisations URSSAF.'),
      lien: { to: '/plan', label: 'Voir mon épargne' },
    });
  }

  // Salarié et alternant : prochain revenu exceptionnel attendu (13e mois, prime…)
  if (type === 'salarie' || type === 'alternant') {
    const prochain = data.incomes.filter((i) => i.certitude === 'attendu' && i.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
    if (prochain) {
      reperes.push({
        id: 'prochain-attendu',
        titre: `${prochain.name} attendu ${dureeLisible(dayDiff(today, prochain.date))}`,
        texte:
          'Il n’est pas compté dans votre budget tant que vous ne l’avez pas confirmé : quand il arrive, appuyez sur « Reçu » dans « Mon plan ».',
        lien: { to: '/plan', label: 'Voir mon plan' },
      });
    } else if (mois >= 9) {
      reperes.push({
        id: 'treizieme',
        titre: 'Un 13e mois en décembre ?',
        texte: 'S’il est prévu par votre convention ou votre contrat, ajoutez-le en revenu attendu : il apparaîtra dans votre projection optimiste.',
        lien: { to: '/plan?attendu=13e-mois', label: 'Ajouter le 13e mois' },
      });
    }
  }

  // Moins de 25 ans sans Livret Jeune : le suggérer
  if (ageAnnees !== null && ageAnnees >= 12 && ageAnnees <= 25 && !(data.supports ?? []).some((s) => s.kind === 'livret-jeune')) {
    reperes.push({
      id: 'livret-jeune',
      titre: 'Le Livret Jeune, jusqu’à 25 ans',
      texte: `Vous avez ${ageAnnees} ans : le Livret Jeune (1 600 € de versements, taux au moins égal à celui du Livret A, disponible à tout moment) peut accueillir une partie de votre épargne.`,
      lien: { to: '/plan?support=livret-jeune', label: 'Ajouter ce support' },
    });
  }

  return reperes.slice(0, 3);
}

/** Phrase d'accueil personnalisée sous le titre du tableau de bord. */
export function sousTitreProfil(data: AppData): string | null {
  const p = data.profile;
  if (!p) return null;
  const sit = p.situation ?? {};
  const morceaux = [sit.formation, sit.employeur, sit.territoire].filter((x): x is string => Boolean(x && x.trim()));
  return morceaux.length > 0 ? morceaux.join(' – ') : null;
}

/** Nombre de mois avant la fin de la situation (contrat, année…), ou null. */
export function moisAvantFin(data: AppData, today: ISODate): number | null {
  const fin = data.profile?.situation?.fin;
  return fin && fin >= today ? moisAvant(fin, today) : null;
}

/** Identifiant lisible d'une suggestion (pour les liens « /plan?attendu=13e-mois »). */
export function slug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
