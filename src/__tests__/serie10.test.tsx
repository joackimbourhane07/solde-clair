import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppState';
import { AppRoutes } from '../App';
import type { AppData } from '../types';
import { STORAGE_KEY, emptyData } from '../lib/storage';
import { accountBalance } from '../lib/accounts';
import { dernierVersementPropose } from '../lib/setup';
import { TODAY } from '../test/fixtures';

const stored = (): AppData => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');

function renderApp(path = '/bienvenue') {
  const user = userEvent.setup();
  render(
    <AppProvider initialData={emptyData()} today={TODAY}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  );
  return user;
}

/** Parcours de configuration jusqu'au tableau de bord ; `etape2` remplit l'étape des revenus. */
async function configurer(user: ReturnType<typeof userEvent.setup>, etape2: () => Promise<void>) {
  await user.type(screen.getByLabelText('Prénom ou pseudonyme'), 'Sam');
  await user.click(screen.getByLabelText('Alternant(e)'));
  await user.click(screen.getByRole('button', { name: /Continuer/ }));
  await etape2();
  await user.click(screen.getByRole('button', { name: /Continuer/ }));
  for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /Continuer/ }));
  await user.click(screen.getByRole('button', { name: /Commencer/ }));
}

describe('création du profil : le solde n’est jamais à 0 par erreur', () => {
  it('dernier versement proposé d’après le jour : ce mois-ci si le jour est passé, sinon le mois précédent', () => {
    expect(dernierVersementPropose(5, '2026-11-12')).toBe('2026-11-05');
    expect(dernierVersementPropose(12, '2026-11-12')).toBe('2026-11-12');
    expect(dernierVersementPropose(28, '2026-11-12')).toBe('2026-10-28');
    expect(dernierVersementPropose(31, '2026-03-02')).toBe('2026-02-28');
  });

  it('salaire versé le 28 : le dernier versement (28 octobre) compte tout de suite dans le solde et dans novembre', async () => {
    const user = renderApp();
    await configurer(user, async () => {
      await user.type(screen.getAllByLabelText('Montant mensuel')[0], '1200');
      const jour = screen.getAllByLabelText('Jour de versement')[0];
      await user.clear(jour);
      await user.type(jour, '28');
      expect(screen.getAllByLabelText(/^Dernier versement reçu/)[0]).toHaveValue('2026-10-28');
    });
    const d = stored();
    expect(d.incomes[0].date).toBe('2026-10-28');
    expect(accountBalance(d, 'compte', TODAY, TODAY)).toBeGreaterThan(0);
    expect(screen.getByText(/Il vous reste/).textContent).not.toMatch(/Il vous reste 0/);
  });

  it('solde actuel indiqué : « Mon compte » part exactement de ce montant', async () => {
    const user = renderApp();
    await configurer(user, async () => {
      await user.type(screen.getAllByLabelText('Montant mensuel')[0], '1200');
      await user.type(screen.getByLabelText(/^Solde de votre compte aujourd’hui/), '850');
    });
    const d = stored();
    expect(accountBalance(d, 'compte', TODAY, TODAY)).toBe(85000);
    expect(d.adjustments[0].note).toBe('Solde indiqué à la création du profil');
  });

  it('dernier versement vidé (pas encore reçu) : le revenu commence à sa prochaine date', async () => {
    const user = renderApp();
    await configurer(user, async () => {
      await user.type(screen.getAllByLabelText('Montant mensuel')[0], '1200');
      const jour = screen.getAllByLabelText('Jour de versement')[0];
      await user.clear(jour);
      await user.type(jour, '28');
      await user.clear(screen.getAllByLabelText(/^Dernier versement reçu/)[0]);
    });
    expect(stored().incomes[0].date).toBe('2026-11-28');
  });
});
