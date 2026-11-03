import { describe, expect, it } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppState';
import { AppRoutes } from '../App';
import type { AppData } from '../types';
import { STORAGE_KEY, emptyData } from '../lib/storage';
import { goalTheme, simulerContribution, themeFromName } from '../lib/goals';
import { fixture, TODAY } from '../test/fixtures';

const norm = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ');
const stored = (): AppData => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

function renderApp(data: AppData = fixture(), path = '/') {
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

describe('objectifs : illustrations et simulation (logique)', () => {
  it('l’illustration est déduite du nom, ou choisie', () => {
    expect(themeFromName('Fonds d’urgence')).toBe('urgence');
    expect(themeFromName('Objectif fin alterrnance')).toBe('etudes');
    expect(themeFromName('Permis de conduire')).toBe('vehicule');
    expect(themeFromName('Vacances au Japon')).toBe('voyage');
    expect(themeFromName('Nouvel ordinateur')).toBe('tech');
    expect(themeFromName('Caution appartement')).toBe('logement');
    expect(themeFromName('Mariage')).toBe('fete');
    expect(themeFromName('Lunettes')).toBe('sante');
    expect(themeFromName('Mon projet')).toBe('projet');
    expect(goalTheme({ name: 'Voyage', theme: 'tech' })).toBe('tech');
  });

  it('« Et si je mettais X € par mois ? » : date d’arrivée et comparaison avec la date souhaitée', () => {
    const d = fixture();
    const g = d.goals[0]; // Voyage : 650 € restants, date souhaitée 12 mai 2027
    expect(simulerContribution(g, d.savings, TODAY, 10000)).toEqual({ monthsToReach: 7, estimatedDate: '2027-06-12', avantLaDate: false });
    expect(simulerContribution(g, d.savings, TODAY, 13000)).toEqual({ monthsToReach: 5, estimatedDate: '2027-04-12', avantLaDate: true });
    expect(simulerContribution(g, d.savings, TODAY, 0)).toBeNull();
  });
});

describe('objectifs : cartes illustrées interactives', () => {
  it('carte : illustration, anneau, jalons, versement rapide et simulation', () => {
    renderApp(fixture(), '/objectifs');
    const carte = screen.getByRole('article', { name: 'Voyage' });
    expect(carte.querySelector('.illustration-objectif')).toHaveAttribute('aria-hidden', 'true');
    expect(norm(carte.querySelector('.anneau-texte')?.textContent)).toBe('35 %');
    const jalons = within(carte).getByRole('list', { name: 'Étapes de Voyage' });
    expect(norm(jalons.textContent)).toBe('25 % : atteint50 % : pas encore75 % : pas encoreObjectif : pas encore');
    expect(within(carte).getByRole('group', { name: 'Versement rapide pour Voyage' })).toBeInTheDocument();
    expect(within(carte).getByRole('slider', { name: /Et si je mettais/ })).toHaveAttribute('type', 'range');
  });

  it('versement rapide : enregistré à la date du jour, et annulable', async () => {
    const user = renderApp(fixture(), '/objectifs');
    await user.click(screen.getByRole('button', { name: /^Mettre 50,00\s€ de côté pour Voyage$/ }));
    await waitFor(() => expect(stored().savings.some((s) => s.goalId === 'g1' && s.amount === 5000 && s.date === TODAY)).toBe(true));
    expect(norm(screen.getByRole('article', { name: 'Voyage' }).querySelector('.anneau-texte')?.textContent)).toBe('40 %');
    await user.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(stored().savings.some((s) => s.amount === 5000 && s.date === TODAY)).toBe(false));
  });

  it('curseur : la date d’arrivée change, et « Prévoir … par mois » met à jour la contribution', async () => {
    const user = renderApp(fixture(), '/objectifs');
    const carte = screen.getByRole('article', { name: 'Voyage' });
    const curseur = within(carte).getByRole('slider', { name: /Et si je mettais/ });
    expect(norm(within(carte).getByText(/Objectif atteint en/).textContent)).toContain('juin 2027 (dans 7 mois) – après la date souhaitée');
    fireEvent.change(curseur, { target: { value: '130' } });
    expect(norm(within(carte).getByText(/Objectif atteint en/).textContent)).toContain('avril 2027 (dans 5 mois) – avant la date souhaitée');
    await user.click(within(carte).getByRole('button', { name: /^Prévoir 130,00\s€ par mois$/ }));
    await waitFor(() => expect(stored().goals.find((g) => g.id === 'g1')?.monthlyContribution).toBe(13000));
  });

  it('aucun objectif : illustration et idées qui ouvrent le formulaire prérempli', async () => {
    const d = fixture();
    d.goals = [];
    const user = renderApp(d, '/objectifs');
    const idees = screen.getByRole('group', { name: 'Idées d’objectifs' });
    await user.click(within(idees).getByRole('button', { name: /Voyage/ }));
    const dialog = screen.getByRole('dialog', { name: 'Nouvel objectif d’épargne' });
    expect(within(dialog).getByLabelText('Nom de l’objectif')).toHaveValue('Voyage');
  });

  it('formulaire : choix de l’illustration enregistré', async () => {
    const user = renderApp(fixture(), '/objectifs');
    await user.click(screen.getByRole('button', { name: 'Modifier l’objectif Voyage' }));
    const dialog = screen.getByRole('dialog', { name: 'Modifier l’objectif' });
    const groupe = within(dialog).getByRole('group', { name: 'Illustration' });
    expect(within(groupe).getByLabelText('Automatique')).toBeChecked();
    await user.click(within(groupe).getByLabelText('Informatique'));
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer les modifications' }));
    await waitFor(() => expect(stored().goals.find((g) => g.id === 'g1')?.theme).toBe('tech'));
  });
});

describe('paramètres : revenus de fin de mois', () => {
  it('règle du 20 active par défaut, jour réglable, désactivable', async () => {
    const user = renderApp(fixture(), '/parametres');
    const regle = screen.getByLabelText(/^Les revenus reçus en fin de mois comptent pour le mois suivant/);
    expect(regle).toBeChecked();
    await user.selectOptions(screen.getByLabelText('À partir du'), '25');
    await waitFor(() => expect(stored().settings.incomeShiftDay).toBe(25));
    await user.click(regle);
    await waitFor(() => expect(stored().settings.incomeShiftDay).toBeNull());
    expect(screen.queryByLabelText('À partir du')).not.toBeInTheDocument();
  });
});

describe('Poksy sur la page d’accueil', () => {
  it('nouveau visiteur : Poksy répond aux questions de présentation, sans bouton vers des pages internes', async () => {
    const user = renderApp(emptyData(), '/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ton budget devient enfin clair.' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ouvrir l’aide de Poksy' }));
    const fenetre = await screen.findByRole('dialog', { name: 'Poksy' });
    const page = within(fenetre).getByRole('region', { name: 'Sur cette page' });
    expect(
      within(page)
        .getAllByRole('button')
        .map((b) => norm(b.textContent)),
    ).toEqual(['Qu’est-ce que SoldeClair ?', 'Est-ce gratuit ?', 'Où sont enregistrées mes données ?']);
    await user.click(within(page).getByRole('button', { name: /Est-ce gratuit/ }));
    expect(norm(within(fenetre).getByRole('log').textContent)).toContain('Oui, SoldeClair est entièrement gratuit');
    await user.click(within(fenetre).getByRole('button', { name: 'Plus de questions' }));
    await user.click(within(fenetre).getAllByRole('button', { name: /Comment ajuster mon solde/ })[0]);
    expect(within(fenetre).queryByRole('button', { name: 'Ajuster mon solde' })).not.toBeInTheDocument();
  });
});
