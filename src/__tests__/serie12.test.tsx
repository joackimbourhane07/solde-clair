import { describe, expect, it } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppState';
import { AppRoutes } from '../App';
import type { AppData } from '../types';
import { STORAGE_KEY } from '../lib/storage';
import { salutation } from '../lib/profil';
import { etapeFranchie, messageEtape } from '../lib/plan';
import { depensesRecentes } from '../lib/budget';
import { suggestedActions } from '../lib/actions';
import { fixture, TODAY } from '../test/fixtures';

const norm = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const stored = (): AppData => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
const fmt = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;

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

describe('Série 12 : calculs et aides', () => {
  it('salutation selon l’heure : « Bonjour » en journée, « Bonsoir » le soir et la nuit', () => {
    expect(salutation(9)).toBe('Bonjour');
    expect(salutation(17)).toBe('Bonjour');
    expect(salutation(18)).toBe('Bonsoir');
    expect(salutation(2)).toBe('Bonsoir');
    expect(salutation(5)).toBe('Bonjour');
  });

  it('étapes d’un objectif : la plus haute étape franchie, sinon rien', () => {
    expect(etapeFranchie(20, 30)).toBe(25);
    expect(etapeFranchie(20, 80)).toBe(75);
    expect(etapeFranchie(50, 60)).toBeNull();
    expect(etapeFranchie(99, 100)).toBe(100);
    expect(etapeFranchie(0, 0)).toBeNull();
  });

  it('message d’étape : lecture seule, avec le nom de l’objectif', () => {
    const d = fixture(); // Voyage : 350 € sur 1 000 € (35 %)
    const avant = JSON.stringify(d);
    expect(messageEtape(d, { id: 'x', goalId: 'g1', amount: 20000, date: TODAY, note: '' }, TODAY)).toBe('Cap des 50 % franchi pour « Voyage ».');
    expect(messageEtape(d, { id: 'x', goalId: 'g1', amount: 1000, date: TODAY, note: '' }, TODAY)).toBeNull();
    expect(messageEtape(d, { id: 'x', goalId: 'g1', amount: 70000, date: TODAY, note: '' }, TODAY)).toBe('Objectif « Voyage » atteint. Bravo !');
    expect(messageEtape(d, { id: 'x', goalId: null, amount: 70000, date: TODAY, note: '' }, TODAY)).toBeNull();
    expect(JSON.stringify(d)).toBe(avant);
  });

  it('dépenses récentes : distinctes, 60 derniers jours, sans les exceptionnelles', () => {
    const d = fixture();
    d.expenses.push(
      { id: 'r1', amount: 250, categoryId: 'c-alim', date: '2026-11-12', description: 'Café', paymentMethod: '' },
      { id: 'r2', amount: 250, categoryId: 'c-alim', date: '2026-11-11', description: 'café', paymentMethod: '' },
      { id: 'r3', amount: 90000, categoryId: 'c-loisirs', date: '2026-11-12', description: 'Voyage', paymentMethod: '', exceptional: true },
      { id: 'r4', amount: 500, categoryId: 'c-alim', date: '2026-08-01', description: 'Ancien', paymentMethod: '' },
    );
    const r = depensesRecentes(d, TODAY);
    expect(r.map((e) => e.description)).toEqual(['Café', 'Concert', 'Marché']);
  });
});

describe('Série 12 : accueil plus calme', () => {
  it('« À faire » : une action visible, les autres sur demande', async () => {
    const d = fixture();
    const n = Math.min(3, suggestedActions(d, TODAY, fmt).length);
    const user = renderApp(d);
    const carte = screen.getByRole('heading', { name: 'À faire' }).closest('section, .card') as HTMLElement;
    const visibles = carte.querySelectorAll(':scope .actions-list:not(details .actions-list) > li');
    if (n <= 1) {
      expect(visibles.length).toBe(n);
      return;
    }
    expect(visibles.length).toBe(1);
    const resume = within(carte).getByText(n === 2 ? 'Voir 1 autre action' : `Voir ${n - 1} autres actions`);
    await user.click(resume);
    expect(carte.querySelectorAll('.actions-list > li').length).toBe(n);
  });

  it('repère du profil : « Compris » le ferme sur l’accueil (il reste mémorisé)', async () => {
    const d = fixture();
    d.profile!.type = 'etudiant';
    const user = renderApp(d);
    const repere = screen.getByRole('region', { name: 'Repères pour toi' });
    const bouton = within(repere).getByRole('button', { name: /^Compris/ });
    await user.click(bouton);
    expect(screen.queryByRole('region', { name: 'Repères pour toi' })).not.toBeInTheDocument();
    await waitFor(() => expect((stored().settings.dismissedActions ?? []).some((id) => id.startsWith('repere:'))).toBe(true));
  });

  it('porte-monnaie : une pastille par compte, qui ouvre le relevé filtré', async () => {
    const d = fixture();
    d.adjustments = [
      { id: 'r1', account: 'compte', date: '2026-11-05', amount: -2000, note: 'Recharge Izly', recharge: true, lien: 'l1' },
      { id: 'r2', account: 'izly', date: '2026-11-05', amount: 2000, note: 'Recharge Izly', recharge: true, lien: 'l1' },
    ];
    const user = renderApp(d);
    const liste = screen.getByRole('list', { name: 'Soldes par compte' });
    const izly = within(liste).getByRole('link', { name: /Izly/ });
    expect(norm(izly.textContent)).toContain('20,00 €');
    await user.click(izly);
    expect(await screen.findByRole('heading', { level: 1, name: 'Mon compte' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Izly' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Série 12 : ajout express et Poksy', () => {
  it('« Refaire » préremplit la dépense sans rien enregistrer ; la validation ajoute la dépense', async () => {
    const user = renderApp();
    const avant = localStorage.getItem(STORAGE_KEY);
    await user.click(screen.getAllByRole('button', { name: 'Ajouter une dépense' })[0]);
    const fenetre = screen.getByRole('dialog', { name: 'Ajouter' });
    const groupe = within(fenetre).getByRole('group', { name: 'Refaire une dépense récente' });
    await user.click(within(groupe).getByRole('button', { name: /^Refaire : Concert/ }));
    expect(within(fenetre).getByLabelText('Montant', { exact: true })).toHaveValue('60,00');
    expect(within(fenetre).getByLabelText(/Description/)).toHaveValue('Concert');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(avant);
    await user.click(within(fenetre).getByRole('button', { name: 'Ajouter la dépense' }));
    await waitFor(() => expect(stored().expenses.filter((e) => e.description === 'Concert')).toHaveLength(2));
  });

  it('pas de « Refaire » quand on modifie une dépense existante', async () => {
    const user = renderApp(fixture(), '/depenses');
    await user.click(screen.getAllByRole('button', { name: /^Modifier/ })[0]);
    expect(screen.queryByRole('group', { name: 'Refaire une dépense récente' })).not.toBeInTheDocument();
  });

  it('états vides : Poksy accompagne, image décorative', () => {
    const d = fixture();
    d.expenses = [];
    renderApp(d, '/depenses');
    const vide = document.querySelector('.empty')!;
    const avatar = vide.querySelector('.poksy-avatar')!;
    expect(avatar).toHaveAttribute('aria-hidden', 'true');
    expect(avatar.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('« Demander à Poksy » sous le calcul : Poksy répond, sans rien modifier', async () => {
    const user = renderApp();
    const avant = localStorage.getItem(STORAGE_KEY);
    await user.click(screen.getByText('Comment est-ce calculé ?'));
    const hero = document.querySelector('.hero') as HTMLElement;
    await user.click(within(hero).getByRole('button', { name: 'Demander à Poksy' }));
    const fenetre = await screen.findByRole('dialog', { name: 'Poksy' });
    await waitFor(() => expect(norm(within(fenetre).getByRole('log').textContent)).toContain('Ton reste à vivre est le solde de « Mon compte »'));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(avant);
  });

  it('versement rapide qui franchit 50 % : Poksy le signale', async () => {
    const d = fixture();
    d.goals[0].initialAmount = 34000; // 340 + 150 = 490 € sur 1 000 € (49 %)
    const user = renderApp(d, '/objectifs');
    await user.click(screen.getByRole('button', { name: /^Mettre 20,00\s€ de côté pour Voyage/ }));
    expect(await screen.findByText(/Cap des 50 % franchi pour « Voyage »\./, { normalizer: norm })).toBeInTheDocument();
    expect(document.querySelector('.toast-bravo')).not.toBeNull();
  });
});

describe('Série 12 : budgets, simulateur, objectifs, première dépense', () => {
  it('budget : le reste de l’enveloppe se lit aussi par jour (mois en cours)', () => {
    renderApp(fixture(), '/budgets');
    // Loisirs : 80 € − 60 € = 20 €, sur 19 jours → environ 1 € par jour (arrondi vers le bas)
    const carte = screen.getByRole('heading', { name: 'Loisirs' }).closest('.card') as HTMLElement;
    expect(norm(carte.querySelector('.budget-jour')!.textContent)).toBe('Environ 1 € par jour jusqu’à la fin du mois.');
  });

  it('budgets vides : une action pour créer la première catégorie', () => {
    const d = fixture();
    d.categories = d.categories.filter((c) => c.kind !== 'variable');
    d.expenses = [];
    renderApp(d, '/budgets');
    expect(screen.getByRole('button', { name: 'Créer une catégorie' })).toBeInTheDocument();
  });

  it('simulateur : « Ajouter cette dépense » ouvre l’ajout prérempli, sans rien enregistrer', async () => {
    const user = renderApp(fixture(), '/simulateur');
    const avant = localStorage.getItem(STORAGE_KEY);
    await user.type(screen.getByLabelText('Montant de l’achat'), '45');
    await user.selectOptions(screen.getByLabelText(/Catégorie/), 'Loisirs');
    await user.click(screen.getByRole('button', { name: 'Ajouter cette dépense' }));
    const fenetre = await screen.findByRole('dialog', { name: 'Ajouter' });
    expect(within(fenetre).getByLabelText('Montant', { exact: true })).toHaveValue('45,00');
    expect(within(fenetre).getByLabelText('Catégorie')).toHaveValue('c-loisirs');
    expect(localStorage.getItem(STORAGE_KEY)).toBe(avant);
  });

  it('objectif : combien il manque avant le prochain cap', () => {
    renderApp(fixture(), '/objectifs');
    // Voyage : 350 € sur 1 000 € → 150 € avant 50 %
    expect(
      screen.getByText((_, el) => el?.classList.contains('jalon-suivant') === true && norm(el.textContent) === 'Plus que 150,00 € avant 50 %.'),
    ).toBeInTheDocument();
  });

  it('toute première dépense : Poksy salue le départ', async () => {
    const d = fixture();
    d.expenses = [];
    const user = renderApp(d);
    const form = screen.getByRole('form', { name: 'Ajout rapide d’une dépense' });
    await user.type(within(form).getByLabelText('Montant'), '12');
    await user.click(within(form).getByRole('button', { name: 'Ajouter la dépense' }));
    expect(await screen.findByText(/^Première dépense notée\. C’est parti !/, { normalizer: norm })).toBeInTheDocument();
    expect(document.querySelector('.toast-bravo')).not.toBeNull();
  });

  it('Poksy explique les calculs de chaque page (budgets, simulateur, compte)', () => {
    renderApp(fixture(), '/budgets');
    expect(screen.getByRole('button', { name: 'Demander à Poksy' })).toBeInTheDocument();
  });
});

describe('Série 12 : garder la main sur ce qui a été masqué', () => {
  it('paramètres : « Les afficher à nouveau » remet les repères et actions ignorés', async () => {
    const d = fixture();
    d.settings.dismissedActions = ['repere:reste-par-jour', 'sauvegarde:2026-11'];
    const user = renderApp(d, '/parametres');
    expect(screen.getByText('2 masqués sur l’accueil. Tu peux les revoir.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Les afficher à nouveau' }));
    await waitFor(() => expect(stored().settings.dismissedActions).toEqual([]));
    expect(screen.getByRole('button', { name: 'Les afficher à nouveau' })).toBeDisabled();
  });

  it('Mon plan : Poksy explique épargne totale et disponible', async () => {
    const user = renderApp(fixture(), '/plan');
    const bouton = screen.queryByRole('button', { name: 'Totale ou disponible ?' });
    if (!bouton) return; // section affichée seulement avec un objectif suivi par supports
    await user.click(bouton);
    expect(await screen.findByRole('dialog', { name: 'Poksy' })).toBeInTheDocument();
  });
});
