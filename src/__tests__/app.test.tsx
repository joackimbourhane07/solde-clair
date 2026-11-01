import { describe, expect, it } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppState';
import { AppRoutes } from '../App';
import type { AppData } from '../types';
import { STORAGE_KEY, emptyData, exportJSON } from '../lib/storage';
import { fixture, TODAY } from '../test/fixtures';

const norm = (s: string | null | undefined) => (s ?? '').replace(/[  ]/g, ' ');

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

const stored = (): AppData => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

describe('configuration initiale', () => {
  it('parcours complet jusqu’au tableau de bord', async () => {
    const user = renderApp(emptyData());
    expect(screen.getByRole('heading', { name: 'Bienvenue sur SoldeClair' })).toBeInTheDocument();

    // Prénom obligatoire
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(screen.getByText('Indiquez un prénom ou un pseudonyme.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Prénom ou pseudonyme'), 'Sam');
    await user.click(screen.getByLabelText('Alternant·e'));
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // Revenus
    expect(screen.getByRole('heading', { name: 'Vos revenus mensuels' })).toBeInTheDocument();
    await user.type(screen.getAllByLabelText('Montant mensuel')[0], '1200');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // Charges fixes : montant invalide refusé
    const amounts = screen.getAllByLabelText('Montant mensuel');
    await user.type(amounts[0], 'abc');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(screen.getByText(/Montant non reconnu/)).toBeInTheDocument();
    await user.clear(amounts[0]);
    await user.type(amounts[0], '450');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // Dépenses et épargne
    await user.type(screen.getByLabelText('Estimation de vos dépenses variables par mois'), '300');
    await user.type(screen.getByLabelText('Objectif d’épargne mensuel'), '100');
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // Catégories proposées pour un alternant
    expect(screen.getByText('Carburant')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // Récapitulatif : 1200 − 450 − 300 − 100 = 350
    expect(norm(screen.getByText('Marge estimée').nextSibling?.textContent)).toBe('350,00 €');
    await user.click(screen.getByRole('button', { name: /Commencer/ }));

    expect(await screen.findByRole('heading', { name: 'Bonjour Sam' })).toBeInTheDocument();
    // 1200 − 450 = 750 € disponibles sur 19 jours → 39 € par jour
    expect(norm(screen.getByText(/Il vous reste/).textContent)).toBe(
      'Il vous reste 750 € pour terminer le mois, soit environ 39 € par jour.',
    );
    await waitFor(() => expect(stored()?.profile?.name).toBe('Sam'));
  });

  it('chargement d’un profil de démonstration', async () => {
    const user = renderApp(emptyData());
    await user.selectOptions(screen.getByLabelText('Profil de démonstration'), 'salarie');
    await user.click(screen.getByRole('button', { name: 'Charger la démonstration' }));
    expect(await screen.findByRole('heading', { name: 'Bonjour Camille (démo)' })).toBeInTheDocument();
  });
});

describe('tableau de bord', () => {
  it('affiche le reste à vivre et les chiffres clés', () => {
    renderApp();
    expect(norm(screen.getByText(/Il vous reste/).textContent)).toBe(
      'Il vous reste 821 € pour terminer le mois, soit environ 43 € par jour.',
    );
    const stat = screen.getByText('Solde disponible').parentElement!;
    expect(norm(stat.textContent)).toContain('821,51 €');
    expect(screen.getByText(/Budget « Alimentation » dépassé/)).toBeInTheDocument();
  });

  it('ajout rapide d’une dépense, totaux mis à jour et sauvegardés', async () => {
    const user = renderApp();
    const form = screen.getByRole('form', { name: 'Ajout rapide d’une dépense' });
    await user.type(within(form).getByLabelText('Montant'), '21,51');
    await user.selectOptions(within(form).getByLabelText('Catégorie'), 'Santé');
    await user.type(within(form).getByLabelText(/Description/), 'Pharmacie');
    await user.click(within(form).getByRole('button', { name: 'Ajouter la dépense' }));

    expect(await screen.findByText('Dépense de 21,51 € ajoutée.', { normalizer: norm })).toBeInTheDocument();
    expect(norm(screen.getByText('Solde disponible').parentElement!.textContent)).toContain('800,00 €');
    expect(norm(screen.getByText(/Il vous reste/).textContent)).toContain('environ 42 € par jour');
    await waitFor(() => expect(stored().expenses.some((e) => e.description === 'Pharmacie' && e.amount === 2151)).toBe(true));
  });

  it('refuse un montant invalide avec un message compréhensible', async () => {
    const user = renderApp();
    const form = screen.getByRole('form', { name: 'Ajout rapide d’une dépense' });
    await user.click(within(form).getByRole('button', { name: 'Ajouter la dépense' }));
    expect(within(form).getByText('Indiquez un montant, par exemple 12,50.')).toBeInTheDocument();
    await user.type(within(form).getByLabelText('Montant'), '0');
    await user.click(within(form).getByRole('button', { name: 'Ajouter la dépense' }));
    expect(within(form).getByText('Le montant doit être supérieur à 0.')).toBeInTheDocument();
    expect(within(form).getByLabelText('Montant')).toHaveAttribute('aria-invalid', 'true');
  });

  it('navigation entre les mois', async () => {
    const user = renderApp();
    expect(screen.getByText('Novembre 2026')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    expect(screen.getByText('Octobre 2026')).toBeInTheDocument();
    expect(norm(screen.getByText(/Mois terminé :/).textContent)).toContain('1 034,01 €');
    await user.click(screen.getByRole('button', { name: 'Mois en cours' }));
    expect(screen.getByText('Novembre 2026')).toBeInTheDocument();
  });
});

describe('textes et accessibilité (corrections du test navigateur)', () => {
  it('titres avec élision : « Échéances d’octobre 2026 »', async () => {
    const user = renderApp(fixture(), '/charges');
    await user.click(screen.getByRole('button', { name: 'Mois précédent' }));
    expect(screen.getByRole('heading', { name: 'Échéances d’octobre 2026' })).toBeInTheDocument();
    expect(screen.getByText('Charges d’octobre 2026')).toBeInTheDocument();
    expect(screen.queryByText(/de octobre/)).not.toBeInTheDocument();
  });

  it('au chargement, le focus n’est pas déplacé (lien « Aller au contenu » atteignable en premier)', async () => {
    const user = renderApp();
    expect(document.activeElement).not.toHaveAttribute('id', 'contenu');
    await user.tab();
    expect(document.activeElement).toHaveTextContent('Aller au contenu');
    // Après un changement de page, le focus va sur le contenu principal.
    await user.click(screen.getAllByRole('link', { name: /Dépenses/ })[0]);
    expect(document.activeElement).toHaveAttribute('id', 'contenu');
  });

  it('paramètres : les catégories sont une vraie liste dans le panneau d’onglet', () => {
    renderApp(fixture(), '/parametres');
    const panel = screen.getByRole('tabpanel', { name: 'Dépenses variables' });
    const list = within(panel).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('bilan : tableau défilable accessible au clavier, évolution aussi lisible sur mobile', async () => {
    const user = renderApp(fixture(), '/historique?vue=bilan');
    const region = screen.getByRole('region', { name: /Bilan de novembre 2026 comparé d’octobre 2026/ });
    expect(region).toHaveAttribute('tabindex', '0');
    const row = screen.getByRole('row', { name: /Dépenses variables/ });
    expect(row.querySelector('.delta-mobile')).toHaveTextContent('en hausse de 18,00');
    expect(row.querySelector('.col-evolution')).toHaveTextContent('en hausse de 18,00');
    const chart = screen.getByText('Revenus et dépenses sur 6 mois').closest('figure')!;
    await user.click(within(chart as HTMLElement).getByRole('button', { name: 'Voir le tableau' }));
    expect(screen.getByRole('region', { name: /Revenus et dépenses sur 6 mois \(tableau\)/ })).toHaveAttribute('tabindex', '0');
  });
});

describe('modification et suppression', () => {
  it('modifie puis supprime une dépense avec confirmation', async () => {
    const user = renderApp(fixture(), '/depenses');
    await user.click(screen.getByRole('button', { name: /Modifier la dépense Courses du 2 nov. 2026/ }));
    const dialog = screen.getByRole('dialog', { name: 'Modifier la dépense' });
    const amount = within(dialog).getByLabelText('Montant');
    expect(amount).toHaveValue('45,30');
    await user.clear(amount);
    await user.type(amount, '50');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer les modifications' }));
    await waitFor(() => expect(stored().expenses.find((e) => e.id === 'e1')?.amount).toBe(5000));

    await user.click(screen.getByRole('button', { name: /Supprimer la dépense Courses du 2 nov. 2026/ }));
    const confirm = screen.getByRole('alertdialog', { name: 'Supprimer cette dépense ?' });
    // Annuler ne supprime rien
    await user.click(within(confirm).getByRole('button', { name: 'Annuler' }));
    expect(stored().expenses.find((e) => e.id === 'e1')).toBeDefined();
    await user.click(screen.getByRole('button', { name: /Supprimer la dépense Courses du 2 nov. 2026/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(stored().expenses.find((e) => e.id === 'e1')).toBeUndefined());
  });

  it('ajoute un revenu exceptionnel', async () => {
    const user = renderApp(fixture(), '/revenus');
    await user.click(screen.getByRole('button', { name: 'Ajouter un revenu' }));
    const dialog = screen.getByRole('dialog', { name: 'Nouveau revenu' });
    await user.type(within(dialog).getByLabelText('Nom'), 'Prime');
    await user.type(within(dialog).getByLabelText('Montant'), '150');
    await user.click(within(dialog).getByLabelText('Exceptionnel'));
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter le revenu' }));
    await waitFor(() => expect(stored().incomes.find((i) => i.name === 'Prime')).toMatchObject({ amount: 15000, recurring: false, date: TODAY }));
    expect(norm(screen.getByText('Revenus de novembre 2026').parentElement!.textContent)).toContain('1 850,50 €');
  });

  it('marque une charge fixe comme payée', async () => {
    const user = renderApp(fixture(), '/charges');
    await user.click(screen.getByRole('button', { name: /Forfait : à venir/ }));
    await waitFor(() => expect(stored().fixedCharges.find((c) => c.id === 'f-tel')?.status['2026-11-20']).toBe('paye'));
    expect(screen.getByRole('button', { name: /Forfait : payé/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('modifie la limite d’une catégorie', async () => {
    const user = renderApp(fixture(), '/budgets');
    await user.click(screen.getByRole('button', { name: 'Modifier la limite de Alimentation' }));
    const dialog = screen.getByRole('dialog');
    const field = within(dialog).getByLabelText('Limite mensuelle');
    await user.clear(field);
    await user.type(field, '100');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(stored().categories.find((c) => c.id === 'c-alim')?.budget).toBe(10000));
    expect(screen.getByRole('progressbar', { name: 'Budget Alimentation' })).toHaveAttribute('aria-valuenow', '58');
  });
});

describe('simulateur', () => {
  it('donne une appréciation et le nouveau reste à vivre', async () => {
    const user = renderApp(fixture(), '/simulateur');
    await user.type(screen.getByLabelText('Montant de l’achat'), '900');
    expect(screen.getByText('Achat susceptible de déséquilibrer le budget')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Montant de l’achat'));
    await user.type(screen.getByLabelText('Montant de l’achat'), '100');
    expect(screen.getByText('Situation confortable')).toBeInTheDocument();
    expect(norm(screen.getByText('Solde restant après l’achat').parentElement!.textContent)).toContain('721,51 €');
    expect(screen.getByText(/pas un conseil financier/)).toBeInTheDocument();
  });
});

describe('paramètres et données', () => {
  it('import JSON : fichier invalide refusé, fichier valide accepté', async () => {
    const user = renderApp(fixture(), '/parametres');
    const input = screen.getByLabelText('Choisir un fichier JSON');
    await user.upload(input, new File(['nimporte quoi'], 'x.json', { type: 'application/json' }));
    expect(await screen.findByText(/Import impossible/)).toBeInTheDocument();

    const other = fixture();
    other.profile!.name = 'Importé';
    await user.upload(input, new File([exportJSON(other, TODAY)], 'sauvegarde.json', { type: 'application/json' }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Remplacer les données actuelles ?' });
    await user.click(within(confirm).getByRole('button', { name: 'Importer et remplacer' }));
    expect(await screen.findByRole('heading', { name: 'Bonjour Importé' })).toBeInTheDocument();
  });

  it('effacement total avec double confirmation', async () => {
    const user = renderApp(fixture(), '/parametres');
    await user.click(screen.getByRole('button', { name: 'Effacer toutes mes données' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Continuer' }));
    const second = screen.getByRole('alertdialog', { name: 'Dernière confirmation' });
    const confirmBtn = within(second).getByRole('button', { name: 'Tout effacer définitivement' });
    expect(confirmBtn).toBeDisabled();
    await user.type(within(second).getByLabelText('Confirmation'), 'effacer');
    expect(confirmBtn).toBeEnabled();
    await user.click(confirmBtn);
    expect(await screen.findByRole('heading', { name: 'Bienvenue sur SoldeClair' })).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).toBeNull());
  });

  it('renomme une catégorie', async () => {
    const user = renderApp(fixture(), '/parametres');
    await user.click(screen.getByRole('button', { name: 'Renommer Loisirs' }));
    const field = within(screen.getByRole('dialog')).getByLabelText('Nom de la catégorie');
    await user.clear(field);
    await user.type(field, 'Sorties');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() => expect(stored().categories.find((c) => c.id === 'c-loisirs')?.name).toBe('Sorties'));
  });

  it('change le thème', async () => {
    const user = renderApp(fixture(), '/parametres');
    await user.click(screen.getByLabelText('Mode sombre'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByLabelText('Comme mon appareil'));
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});

describe('historique et bilan', () => {
  it('filtre par type et recherche', async () => {
    const user = renderApp(fixture(), '/historique');
    expect(screen.getByText('9 transaction(s)')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Type'), 'depense');
    expect(screen.getByText('3 transaction(s)')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Rechercher'), 'concert');
    expect(screen.getByText('1 transaction(s)')).toBeInTheDocument();
  });

  it('affiche le bilan avec la comparaison au mois précédent', async () => {
    const user = renderApp(fixture(), '/historique');
    await user.click(screen.getByRole('tab', { name: 'Bilan mensuel' }));
    const row = screen.getByRole('row', { name: /Dépenses variables/ });
    expect(norm(row.textContent)).toContain('118,00 €');
    expect(norm(row.textContent)).toContain('en hausse de 18,00 €');
  });
});
