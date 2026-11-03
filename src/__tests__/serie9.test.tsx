import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppState';
import { AppRoutes } from '../App';
import { CLE_ASTUCES, CLE_POKSY } from '../lib/poksyTextes';
import { CLE_MOUVEMENT, enregistrerMouvement, lireMouvement, mouvementReduit } from '../lib/mouvement';
import { fixture, TODAY } from '../test/fixtures';

function renderApp(path = '/') {
  const user = userEvent.setup();
  render(
    <AppProvider initialData={fixture()} today={TODAY}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProvider>,
  );
  return user;
}

describe('animations réduites (choix de l’appareil)', () => {
  it('le choix est mémorisé sur l’appareil et appliqué à la page', () => {
    expect(lireMouvement()).toBe('auto');
    enregistrerMouvement('reduit');
    expect(localStorage.getItem(CLE_MOUVEMENT)).toBe('reduit');
    expect(document.documentElement.dataset.mouvement).toBe('reduit');
    expect(mouvementReduit()).toBe(true);
    enregistrerMouvement('auto');
    expect(localStorage.getItem(CLE_MOUVEMENT)).toBeNull();
    expect(document.documentElement.dataset.mouvement).toBeUndefined();
  });

  it('paramètres : « Animations réduites » dans la carte Apparence', async () => {
    localStorage.setItem(CLE_POKSY, JSON.stringify({ bienvenueVue: true }));
    const user = renderApp('/parametres');
    const groupe = screen.getByRole('group', { name: 'Animations' });
    expect(within(groupe).getByLabelText('Comme mon appareil')).toBeChecked();
    await user.click(within(groupe).getByLabelText('Animations réduites'));
    expect(document.documentElement.dataset.mouvement).toBe('reduit');
    enregistrerMouvement('auto');
  });
});

describe('Poksy : astuces de page', () => {
  it('une astuce apparaît une seule fois sur « Mon plan » ; « Ne plus afficher les astuces » les coupe', async () => {
    localStorage.setItem(CLE_POKSY, JSON.stringify({ bienvenueVue: true }));
    const user = renderApp('/plan');
    const astuce = await screen.findByRole('complementary', { name: 'Astuce de Poksy' }, { timeout: 4000 });
    expect(astuce).toHaveTextContent('Épargne totale ou épargne disponible');
    expect(JSON.parse(localStorage.getItem(CLE_ASTUCES)!).vues).toEqual(['/plan']);
    await user.click(within(astuce).getByRole('button', { name: 'Ne plus afficher les astuces' }));
    expect(screen.queryByRole('complementary', { name: 'Astuce de Poksy' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CLE_ASTUCES)!).desactivees).toBe(true);
  });
});
