import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppState';
import { AppRoutes } from '../App';
import type { AppData, ProfileType } from '../types';
import { PREMIER_PROFIL, STORAGE_KEY, departKey, exportJSON } from '../lib/storage';
import { fixture, TODAY } from '../test/fixtures';

/* Données entièrement fictives (« Test »), aujourd'hui = 12 novembre 2026. */

const norm = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ');
const stored = (): AppData => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

function renderApp(data: AppData, path = '/') {
  const user = userEvent.setup();
  render(
    <AppProvider initialData={data} today={TODAY}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  );
  return user;
}

/** Profil fictif avec supports, objectif « tous supports confondus », revenu attendu et caution. */
function avecPlan(type: ProfileType = 'alternant'): AppData {
  const d = fixture();
  d.profile = { ...d.profile!, type, birthDate: '2005-02-01', situation: { formation: 'BTS', fin: '2027-07-31' } };
  d.supports = [
    {
      id: 'pel',
      name: 'PEL',
      kind: 'pel',
      balance: 200000,
      balanceDate: '2026-11-01',
      rate: 1.75,
      liquidity: 'bloque',
      blockedUntil: '2029-01-01',
      withdrawalCloses: true,
      ceiling: null,
      target: null,
      note: '',
    },
    {
      id: 'la',
      name: 'Livret A',
      kind: 'livret-a',
      balance: 50000,
      balanceDate: '2026-11-01',
      rate: 1.7,
      liquidity: 'immediate',
      blockedUntil: null,
      withdrawalCloses: false,
      ceiling: null,
      target: null,
      note: '',
    },
  ];
  d.goals.push({
    id: 'g-plan',
    name: 'Fin de contrat',
    description: '',
    target: 500000,
    initialAmount: 0,
    targetDate: '2027-07-31',
    priority: 'haute',
    monthlyContribution: 0,
    createdAt: '2026-11-01',
    supportIds: ['pel', 'la'],
  });
  d.incomes.push({
    id: 'i-13',
    name: '13e mois',
    amount: 90000,
    date: '2026-11-15',
    categoryId: 'c-sal',
    recurring: false,
    frequency: null,
    endDate: null,
    note: '',
    certitude: 'attendu',
    inOptimistic: true,
  });
  d.holds = [{ id: 'h1', label: 'Caution', amount: 15000, start: '2026-11-10', end: '2026-11-30', account: 'compte', returned: false, note: '' }];
  return d;
}

describe('Mon plan d’épargne', () => {
  it('objectif « tous supports confondus », épargne totale et disponible distinctes, statut chiffré', () => {
    renderApp(avecPlan(), '/plan');
    expect(screen.getByRole('heading', { name: 'Mon plan d’épargne' })).toBeInTheDocument();
    const objectif = screen.getByRole('heading', { name: 'Fin de contrat' }).closest('section')!;
    expect(norm(objectif.textContent)).toContain('2 500,00 € sur 5 000,00 €');
    expect(norm(objectif.textContent)).toMatch(/Dans les temps|En retard/);
    const stat = (label: string) => norm(screen.getByText(label).parentElement!.textContent);
    expect(stat('Épargne totale')).toContain('2 500,00 €');
    expect(stat('Épargne disponible')).toContain('500,00 €');
    expect(stat('Épargne bloquée')).toContain('2 000,00 €');
    expect(screen.getByText('Retrait = clôture')).toBeInTheDocument();
  });

  it('revenu attendu : pas compté dans les revenus du mois, « Reçu » le confirme', async () => {
    const user = renderApp(avecPlan(), '/revenus');
    const stat = (label: string) => norm(screen.getByText(label).parentElement!.textContent);
    expect(stat('Revenus de novembre 2026')).toContain('1 700,50 €'); // salaire + vente, sans le 13e mois
    expect(screen.getByText('Attendu')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Mon plan d’épargne' }));
    const carte = screen.getByRole('heading', { name: 'Revenus attendus' }).closest('section')!;
    await user.click(within(carte).getByRole('button', { name: 'Reçu' }));
    const dialog = screen.getByRole('dialog', { name: '13e mois reçu' });
    await user.click(within(dialog).getByRole('button', { name: 'Confirmer la réception' }));
    const treize = stored().incomes.find((i) => i.id === 'i-13')!;
    expect(treize.certitude).toBeUndefined();
    expect(treize.date).toBe(TODAY);
  });

  it('mettre en avant selon le profil : 13e mois proposé à un alternant, job d’été à un étudiant, rien d’interdit', async () => {
    const user = renderApp(avecPlan('alternant'), '/plan');
    const frequents = screen.getByRole('group', { name: 'Revenus attendus fréquents pour votre profil' });
    expect(within(frequents).queryByRole('button', { name: '+ 13e mois' })).not.toBeInTheDocument(); // déjà ajouté
    expect(within(frequents).getByRole('button', { name: '+ Solde de tout compte' })).toBeInTheDocument();
    expect(screen.getByText(/Fin du contrat dans/)).toBeInTheDocument();
    await user.click(within(frequents).getByRole('button', { name: '+ Solde de tout compte' }));
    expect(screen.getByLabelText('Nom')).toHaveValue('Solde de tout compte');
    expect(screen.getByLabelText('Attendu (incertain)')).toBeChecked();
  });

  it('étudiant : pas de 13e mois mis en avant, mais toujours possible à la main', async () => {
    const d = avecPlan('etudiant');
    d.incomes = d.incomes.filter((i) => i.id !== 'i-13');
    const user = renderApp(d, '/plan');
    const frequents = screen.getByRole('group', { name: 'Revenus attendus fréquents pour votre profil' });
    expect(within(frequents).queryByRole('button', { name: '+ 13e mois' })).not.toBeInTheDocument();
    expect(within(frequents).getByRole('button', { name: '+ Job d’été' })).toBeInTheDocument();
    // Le bouton « Ajouter » reste disponible pour n'importe quel revenu attendu
    await user.click(within(screen.getByRole('heading', { name: 'Revenus attendus' }).closest('section')!).getByRole('button', { name: 'Ajouter' }));
    await user.type(screen.getByLabelText('Nom'), '13e mois (job salarié)');
    await user.type(screen.getByLabelText('Montant estimé (bas de la fourchette)'), '300');
    await user.click(screen.getByRole('button', { name: 'Ajouter le revenu attendu' }));
    expect(stored().incomes.find((i) => i.name === '13e mois (job salarié)')).toMatchObject({ certitude: 'attendu', amount: 30000 });
  });

  it('bilan du mois guidé : seul le complément d’épargne et les dépenses non saisies sont créés', async () => {
    const user = renderApp(avecPlan(), '/plan');
    await user.click(screen.getByRole('button', { name: 'Faire le bilan du mois' }));
    const dialog = screen.getByRole('dialog', { name: 'Bilan du mois' });
    expect(within(dialog).getByLabelText('Mois du bilan')).toHaveValue('2026-11');
    const epargne = within(dialog).getByLabelText('Épargné réellement ce mois-ci (total)');
    expect(epargne).toHaveValue('100,00'); // déjà enregistré
    await user.clear(epargne);
    await user.type(epargne, '250');
    const depenses = within(dialog).getByLabelText('Dépensé réellement (total, hors dépenses exceptionnelles)');
    expect(depenses).toHaveValue('118,00');
    await user.clear(depenses);
    await user.type(depenses, '150');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer le bilan' }));
    const d = stored();
    const nouveau = d.savings.find((s) => s.note === 'Bilan de novembre 2026')!;
    expect(nouveau).toMatchObject({ amount: 15000, goalId: 'g-plan', supportId: 'la' });
    expect(d.expenses.find((e) => e.description.startsWith('Autres dépenses'))?.amount).toBe(3200);
    // Rien n'est compté deux fois : refaire le bilan avec les mêmes totaux ne crée rien
    await user.click(screen.getByRole('button', { name: 'Faire le bilan du mois' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Bilan du mois' })).getByRole('button', { name: 'Enregistrer le bilan' }));
    expect(stored().savings).toHaveLength(d.savings.length);
    expect(stored().expenses).toHaveLength(d.expenses.length);
  });

  it('dépense exceptionnelle et somme bloquée : la caution n’est pas une dépense, Mon compte indique la part bloquée', async () => {
    const user = renderApp(avecPlan(), '/compte');
    expect(norm(document.querySelector('.solde-bloque')?.textContent)).toContain('dont 150,00 € bloqués temporairement (Caution)');
    await user.click(screen.getAllByRole('button', { name: 'Ajouter une dépense' })[0]);
    const dialog = screen.getByRole('dialog', { name: 'Nouvelle dépense' });
    await user.type(within(dialog).getByLabelText(/^Montant/), '400');
    await user.click(within(dialog).getByLabelText(/^Dépense exceptionnelle/));
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter la dépense' }));
    expect(stored().expenses.find((e) => e.amount === 40000)?.exceptional).toBe(true);
  });

  it('accueil : carte « Mon objectif » et repères selon le profil', () => {
    renderApp(avecPlan(), '/');
    expect(screen.getByRole('heading', { name: 'Mon objectif : Fin de contrat' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Repères pour vous' })).toBeInTheDocument();
    expect(screen.getByText(/Fin du contrat dans/)).toBeInTheDocument();
  });
});

describe('profil et point de départ', () => {
  it('les champs de situation changent de libellé selon le profil', async () => {
    const user = renderApp(avecPlan('alternant'), '/parametres');
    expect(screen.getByRole('group', { name: 'Mon contrat d’alternance (facultatif)' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Fin du contrat/)).toHaveValue('2027-07-31');
    await user.selectOptions(screen.getByLabelText('Situation'), 'etudiant');
    expect(screen.getByRole('group', { name: 'Mes études (facultatif)' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Fin de l’année/)).toHaveValue('2027-07-31');
    await user.type(screen.getByLabelText(/^Territoire ou département/), 'Département fictif');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    expect(stored().profile).toMatchObject({
      type: 'etudiant',
      birthDate: '2005-02-01',
      situation: { formation: 'BTS', fin: '2027-07-31', territoire: 'Département fictif' },
    });
  });

  it('l’import devient le point de départ ; « Réinitialiser aux données par défaut » y revient après double confirmation', async () => {
    const depart = avecPlan();
    const user = renderApp(fixture(), '/parametres');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, new File([exportJSON(depart, TODAY)], 'sauvegarde.json', { type: 'application/json' }));
    await user.click(await screen.findByRole('button', { name: 'Importer et remplacer' }));
    expect(localStorage.getItem(departKey(PREMIER_PROFIL))).not.toBeNull();
    expect(stored().supports).toHaveLength(2);

    // Une modification, puis retour au point de départ
    await user.click(screen.getAllByRole('link', { name: 'Paramètres' })[0]);
    const prenom = screen.getByLabelText('Prénom ou pseudonyme');
    await user.clear(prenom);
    await user.type(prenom, 'Autre');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));
    expect(stored().profile?.name).toBe('Autre');
    await user.click(screen.getByRole('button', { name: 'Réinitialiser aux données par défaut' }));
    await user.click(screen.getByRole('button', { name: 'Continuer' }));
    const confirmer = screen.getByRole('button', { name: 'Revenir au point de départ' });
    expect(confirmer).toBeDisabled();
    await user.type(screen.getByLabelText('Confirmation'), 'reinitialiser');
    await user.click(confirmer);
    expect(stored().profile?.name).toBe('Test');
    expect(stored().supports).toHaveLength(2);
  });
});

describe('salaire de fin de mois : dernier versement déjà reçu', () => {
  /** Salaire saisi à partir du 28 novembre : avec la règle du 20, novembre n'a pas de salaire. */
  function salaireFinDeMois(avecSoldeReel: boolean): AppData {
    const d = fixture();
    d.incomes = [
      {
        id: 'i-sal',
        name: 'Salaire',
        amount: 70000,
        date: '2026-11-28',
        categoryId: 'c-sal',
        recurring: true,
        frequency: 'mensuel',
        endDate: null,
        note: '',
      },
    ];
    d.adjustments = avecSoldeReel ? [{ id: 'a1', account: 'compte', date: '2026-11-05', amount: 50000, note: '' }] : [];
    return d;
  }

  it('l’accueil le signale ; indiquer le 28 octobre fait compter le salaire pour novembre', async () => {
    const user = renderApp(salaireFinDeMois(false), '/');
    const alerte = screen.getByText(/commence le 28 nov\. 2026|commence le 28/).closest('.notice')!;
    await user.click(within(alerte as HTMLElement).getByRole('link', { name: 'Indiquer le dernier versement reçu' }));
    const dialog = await screen.findByRole('dialog', { name: 'Dernier versement : Salaire' });
    await user.type(within(dialog).getByLabelText(/^Dernier versement déjà reçu/), '2026-10-28');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer les modifications' }));
    expect(stored().incomes[0].date).toBe('2026-10-28');
    expect(stored().adjustments).toHaveLength(0);
    // Novembre a maintenant son salaire : plus d'alerte
    expect(screen.queryByRole('button', { name: 'Indiquer le dernier versement reçu' })).not.toBeInTheDocument();
    const stat = (label: string) => norm(screen.getByText(label).parentElement!.textContent);
    expect(stat('Revenus de novembre 2026')).toContain('700,00 €');
  });

  it('solde réel déjà indiqué après ce versement : une correction évite de le compter deux fois', async () => {
    const user = renderApp(salaireFinDeMois(true), '/revenus');
    const soldeAvant = norm(document.querySelector('.app')?.textContent).length; // la page est affichée
    expect(soldeAvant).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Indiquer le dernier versement reçu' }));
    const dialog = screen.getByRole('dialog', { name: 'Dernier versement : Salaire' });
    await user.type(within(dialog).getByLabelText(/^Dernier versement déjà reçu/), '2026-10-28');
    expect(within(dialog).getByLabelText(/comprend déjà ce versement/)).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer les modifications' }));
    const d = stored();
    expect(d.incomes[0].date).toBe('2026-10-28');
    expect(d.adjustments.find((a) => a.id !== 'a1')).toMatchObject({ amount: -70000, date: '2026-11-05', account: 'compte' });
  });

  it('refuse un dernier versement dans le futur ou après le prochain', async () => {
    const user = renderApp(salaireFinDeMois(false), '/revenus');
    await user.click(screen.getByRole('button', { name: 'Indiquer le dernier versement reçu' }));
    const dialog = screen.getByRole('dialog', { name: 'Dernier versement : Salaire' });
    await user.type(within(dialog).getByLabelText(/^Dernier versement déjà reçu/), '2026-11-20');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer les modifications' }));
    expect(within(dialog).getByText('Le dernier versement reçu doit être aujourd’hui ou avant.')).toBeInTheDocument();
    expect(stored()?.incomes[0].date ?? '2026-11-28').toBe('2026-11-28');
  });
});
