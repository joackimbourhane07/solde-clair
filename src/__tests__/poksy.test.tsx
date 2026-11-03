import { describe, expect, it } from 'vitest';
import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppState';
import { AppRoutes } from '../App';
import type { AppData } from '../types';
import { STORAGE_KEY } from '../lib/storage';
import { QUESTIONS_RAPIDES, RUBRIQUES, REPONSE_INTROUVABLE, typographie } from '../lib/poksy';
import { CLE_POKSY } from '../lib/poksyTextes';
import { fixture, TODAY } from '../test/fixtures';

const norm = (s: string | null | undefined) => (s ?? '').replace(/[\u00a0\u202f]/g, ' ');
/** Libellé tel qu'affiché (espaces insécables avant « ? », « : »…). */
const t = typographie;

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

const lanceur = () => screen.getByRole('button', { name: /l’aide de Poksy$/ });
const ouvrirPoksy = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Ouvrir l’aide de Poksy' }));
  return screen.findByRole('dialog', { name: 'Poksy' });
};
/** Dernière réponse de Poksy dans la conversation. */
const derniereReponse = (fenetre: HTMLElement) => {
  const messages = within(fenetre).getByRole('log').querySelectorAll('.poksy-message-poksy');
  return messages[messages.length - 1] as HTMLElement;
};
const donneesEnregistrees = () => localStorage.getItem(STORAGE_KEY);

describe('Poksy : bouton flottant et message de première visite', () => {
  it('bouton « Ouvrir l’aide de Poksy », avatar décoratif masqué aux lecteurs d’écran', () => {
    renderApp();
    const bouton = lanceur();
    expect(bouton).toHaveAccessibleName('Ouvrir l’aide de Poksy');
    expect(bouton).toHaveAttribute('aria-expanded', 'false');
    // Photo de Poksy : décorative (texte alternatif vide, masquée aux lecteurs d'écran)
    expect(bouton.querySelector('.poksy-avatar')).toHaveAttribute('aria-hidden', 'true');
    expect(bouton.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('première visite : le message s’affiche une seule fois et se ferme facilement', async () => {
    const user = renderApp();
    // Carte de première visite : personnalisée avec le prénom, avec deux choix clairs
    const carte = screen.getByRole('complementary', { name: 'Message de Poksy' });
    expect(within(carte).getByText(/Bonjour Test, je suis Poksy\. Une question sur SoldeClair/)).toBeInTheDocument();
    expect(within(carte).getByRole('button', { name: 'Poser une question' })).toBeInTheDocument();
    expect(within(carte).getByRole('button', { name: 'Plus tard' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fermer le message de Poksy' }));
    expect(screen.queryByText(/Une question sur SoldeClair/)).not.toBeInTheDocument();
    expect(localStorage.getItem(CLE_POKSY)).toBe('{"bienvenueVue":true}');
    // Nouvelle visite : il ne réapparaît pas
    cleanup();
    renderApp();
    expect(screen.queryByText(/Une question sur SoldeClair/)).not.toBeInTheDocument();
  });

  it('le message disparaît quand on change de page, et ne revient pas', async () => {
    const user = renderApp();
    expect(screen.getByText(/Une question sur SoldeClair/)).toBeInTheDocument();
    await user.click(screen.getAllByRole('link', { name: /Budgets/ })[0]);
    expect(screen.queryByText(/Une question sur SoldeClair/)).not.toBeInTheDocument();
    expect(localStorage.getItem(CLE_POKSY)).not.toBeNull();
  });

  it('« Poser une question » ouvre Poksy ; « Plus tard » ferme la carte', async () => {
    const user = renderApp();
    await user.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByText(/Une question sur SoldeClair/)).not.toBeInTheDocument();
    cleanup();
    localStorage.clear();
    renderApp();
    await user.click(screen.getByRole('button', { name: 'Poser une question' }));
    expect(await screen.findByRole('dialog', { name: 'Poksy' })).toBeInTheDocument();
  });
});

describe('Poksy : fenêtre de discussion', () => {
  it('ouverture : avatar, nom, rôle, bienvenue, questions, saisie et mention de confidentialité', async () => {
    const user = renderApp();
    const fenetre = await ouvrirPoksy(user);
    expect(lanceur()).toHaveAttribute('aria-expanded', 'true');
    expect(within(fenetre).getByRole('heading', { name: 'Poksy' })).toBeInTheDocument();
    expect(within(fenetre).getByText('Guide SoldeClair')).toBeInTheDocument();
    expect(fenetre).toHaveAccessibleDescription('Poksy vous aide à comprendre votre budget, simplement.');
    expect(norm(within(fenetre).getByRole('log').textContent)).toContain('Bonjour, je suis Poksy.');
    expect(norm(within(fenetre).getByRole('log').textContent)).toContain('Que souhaitez-vous savoir ?');
    expect(within(fenetre).getByRole('button', { name: 'Fermer Poksy' })).toBeInTheDocument();
    expect(within(fenetre).getByLabelText('Votre question pour Poksy')).toBeInTheDocument();
    expect(
      within(fenetre).getByText('Poksy fonctionne sur votre appareil et ne remplace pas un conseiller financier professionnel.'),
    ).toBeInTheDocument();
    // Le focus entre dans la fenêtre
    expect(fenetre).toHaveFocus();
    // Avatars décoratifs
    for (const avatar of fenetre.querySelectorAll('.poksy-avatar')) expect(avatar).toHaveAttribute('aria-hidden', 'true');
  });

  it('fermeture avec Échap : le focus revient sur le bouton', async () => {
    const user = renderApp();
    await ouvrirPoksy(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Poksy' })).not.toBeInTheDocument();
    expect(lanceur()).toHaveFocus();
    expect(lanceur()).toHaveAttribute('aria-expanded', 'false');
  });

  it('fermeture avec le bouton « Fermer Poksy », puis réouverture : la conversation est conservée', async () => {
    const user = renderApp();
    let fenetre = await ouvrirPoksy(user);
    await user.click(within(fenetre).getByRole('button', { name: t('Comment ajouter une dépense ?') }));
    await user.click(within(fenetre).getByRole('button', { name: 'Fermer Poksy' }));
    expect(screen.queryByRole('dialog', { name: 'Poksy' })).not.toBeInTheDocument();
    expect(lanceur()).toHaveFocus();
    fenetre = await ouvrirPoksy(user);
    expect(norm(within(fenetre).getByRole('log').textContent)).toContain('saisissez le montant');
  });

  it('navigation au clavier : Entrée ouvre, Tabulation suit un ordre logique', async () => {
    const user = renderApp();
    lanceur().focus();
    await user.keyboard('{Enter}');
    const fenetre = await screen.findByRole('dialog', { name: 'Poksy' });
    expect(fenetre).toHaveFocus();
    await user.tab();
    expect(within(fenetre).getByRole('button', { name: 'Fermer Poksy' })).toHaveFocus();
    await user.tab();
    expect(within(fenetre).getByRole('button', { name: t('Comment est calculé mon reste à vivre ?') })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(norm(derniereReponse(fenetre).textContent)).toContain('Votre reste à vivre est le solde de « Mon compte »');
  });

  it('les six questions rapides donnent chacune une réponse', async () => {
    const user = renderApp();
    const fenetre = await ouvrirPoksy(user);
    for (const q of QUESTIONS_RAPIDES) {
      await user.click(within(fenetre).getByRole('button', { name: t(q.libelle) }));
      const texte = norm(derniereReponse(fenetre).textContent);
      expect(texte, q.libelle).not.toContain(REPONSE_INTROUVABLE);
      expect(texte.length, q.libelle).toBeGreaterThan(40);
    }
    // Chaque question posée apparaît aussi dans la conversation
    expect(within(fenetre).getByRole('log').querySelectorAll('.poksy-message-vous')).toHaveLength(6);
  });

  it('« Voir plus de questions » : toutes les rubriques et toutes leurs questions répondent', async () => {
    const user = renderApp();
    const fenetre = await ouvrirPoksy(user);
    const plus = within(fenetre).getByRole('button', { name: 'Voir plus de questions' });
    expect(plus).toHaveAttribute('aria-expanded', 'false');
    await user.click(plus);
    expect(within(fenetre).getByRole('button', { name: 'Voir moins de questions' })).toHaveAttribute('aria-expanded', 'true');
    for (const r of RUBRIQUES) {
      const rubrique = within(fenetre).getByRole('region', { name: r.titre });
      for (const q of r.questions) {
        await user.click(within(rubrique).getByRole('button', { name: t(q.libelle) }));
        expect(norm(derniereReponse(fenetre).textContent), q.libelle).not.toContain(REPONSE_INTROUVABLE);
      }
    }
  });

  it('réponse avec les vrais chiffres du tableau de bord', async () => {
    const user = renderApp();
    const fenetre = await ouvrirPoksy(user);
    await user.click(within(fenetre).getByRole('button', { name: t('Comment est calculé mon reste à vivre ?') }));
    // Même montant que la phrase principale du tableau de bord : le solde de « Mon compte » (2 590,52 € → 2 590 €)
    expect(norm(derniereReponse(fenetre).textContent)).toContain('Aujourd’hui, il vous reste 2 590 €.');
  });

  it('montants masqués : Poksy ne les dévoile pas', async () => {
    const d = fixture();
    d.settings.hideAmounts = true;
    const user = renderApp(d);
    const fenetre = await ouvrirPoksy(user);
    await user.click(within(fenetre).getByRole('button', { name: t('Comment est calculé mon reste à vivre ?') }));
    expect(norm(derniereReponse(fenetre).textContent)).toContain('il vous reste ••• €');
  });

  it('recherche par mots-clés et message sans résultat', async () => {
    const user = renderApp();
    const fenetre = await ouvrirPoksy(user);
    const champ = within(fenetre).getByLabelText('Votre question pour Poksy');
    await user.type(champ, 'carte restaurant{Enter}');
    expect(norm(derniereReponse(fenetre).textContent)).toContain('La carte restaurant a son propre solde');
    expect(champ).toHaveValue('');
    await user.type(champ, 'quelle météo demain');
    await user.click(within(fenetre).getByRole('button', { name: 'Envoyer' }));
    expect(norm(derniereReponse(fenetre).textContent)).toContain(REPONSE_INTROUVABLE);
    // Une question vide n'est pas envoyée
    const avant = within(fenetre).getByRole('log').children.length;
    await user.click(within(fenetre).getByRole('button', { name: 'Envoyer' }));
    expect(within(fenetre).getByRole('log').children.length).toBe(avant);
  });

  it('un numéro de carte tapé par erreur est masqué et Poksy rappelle de ne jamais le donner', async () => {
    const user = renderApp();
    const fenetre = await ouvrirPoksy(user);
    await user.type(within(fenetre).getByLabelText('Votre question pour Poksy'), '4970 1012 3456 7890{Enter}');
    const log = norm(within(fenetre).getByRole('log').textContent);
    expect(log).not.toContain('4970');
    expect(log).toContain('••••');
    expect(norm(derniereReponse(fenetre).textContent)).toContain('Ne saisissez jamais de mot de passe');
  });
});

describe('Poksy : questions adaptées à la page', () => {
  const pages: [string, string[]][] = [
    ['/compte', ['Comment ajuster mon solde ?', 'Pourquoi mon solde est-il différent ?', 'Pourquoi la carte restaurant est-elle séparée ?']],
    ['/depenses', ['Comment ajouter une dépense ?', 'Comment modifier une opération ?', 'Comment choisir une catégorie ?']],
    ['/budgets', ['Comment fixer une limite ?', 'Que signifient les alertes ?', 'Comment modifier un budget ?']],
    ['/objectifs', ['Comment créer un objectif ?', 'Comment ajouter un versement ?', 'Comment est calculée la progression ?']],
    ['/parametres', ['Comment sauvegarder mes données ?', 'Où sont enregistrées mes données ?', 'Comment supprimer mes données ?']],
  ];
  for (const [chemin, attendues] of pages) {
    it(`page ${chemin} : « Sur cette page » en premier`, async () => {
      const user = renderApp(fixture(), chemin);
      const fenetre = await ouvrirPoksy(user);
      const groupe = within(fenetre).getByRole('region', { name: 'Sur cette page' });
      expect(within(groupe).getAllByRole('button').map((b) => norm(b.textContent))).toEqual(attendues);
    });
  }

  it('tableau de bord : pas de rubrique « Sur cette page », les questions fréquentes seulement', async () => {
    const user = renderApp();
    const fenetre = await ouvrirPoksy(user);
    expect(within(fenetre).queryByRole('region', { name: 'Sur cette page' })).not.toBeInTheDocument();
    expect(within(within(fenetre).getByRole('region', { name: 'Questions fréquentes' })).getAllByRole('button')).toHaveLength(6);
  });
});

describe('Poksy : boutons d’action (ouvrent seulement une page ou un formulaire)', () => {
  it('« Ajouter une dépense » ouvre le formulaire, sans rien enregistrer', async () => {
    const user = renderApp();
    const avant = donneesEnregistrees();
    const fenetre = await ouvrirPoksy(user);
    await user.click(within(fenetre).getByRole('button', { name: t('Comment ajouter une dépense ?') }));
    await user.click(within(derniereReponse(fenetre)).getByRole('button', { name: 'Ajouter une dépense' }));
    expect(screen.getByRole('dialog', { name: 'Nouvelle dépense' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Poksy' })).not.toBeInTheDocument();
    expect(donneesEnregistrees()).toBe(avant);
  });

  it('« Ajuster mon solde » ouvre « Mon compte » et la fenêtre d’ajustement', async () => {
    const user = renderApp();
    const fenetre = await ouvrirPoksy(user);
    await user.click(within(fenetre).getByRole('button', { name: t('Comment ajuster mon solde ?') }));
    await user.click(within(derniereReponse(fenetre)).getByRole('button', { name: 'Ajuster mon solde' }));
    expect(await screen.findByRole('heading', { name: 'Mon compte' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Ajuster le solde' })).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(donneesEnregistrees() ?? '{}').adjustments ?? []).toEqual([]));
  });

  it('« Ajouter un revenu » et « Créer un objectif » ouvrent leur formulaire', async () => {
    const user = renderApp();
    let fenetre = await ouvrirPoksy(user);
    await user.click(within(fenetre).getByRole('button', { name: 'Voir plus de questions' }));
    await user.click(within(fenetre).getByRole('button', { name: t('Comment ajouter un revenu ?') }));
    await user.click(within(derniereReponse(fenetre)).getByRole('button', { name: 'Ajouter un revenu' }));
    expect(await screen.findByRole('dialog', { name: 'Nouveau revenu' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('dialog', { name: 'Nouveau revenu' })).getByRole('button', { name: 'Annuler' }));

    fenetre = await ouvrirPoksy(user);
    // « Voir plus » est resté ouvert : la question est aussi dans la rubrique Épargne
    const frequentes = within(fenetre).getByRole('region', { name: 'Questions fréquentes' });
    await user.click(within(frequentes).getByRole('button', { name: t('Comment créer un objectif d’épargne ?') }));
    await user.click(within(derniereReponse(fenetre)).getByRole('button', { name: 'Créer un objectif' }));
    expect(await screen.findByRole('dialog', { name: 'Nouvel objectif d’épargne' })).toBeInTheDocument();
  });

  it('« Ouvrir le simulateur », « Voir mes budgets », « Exporter une sauvegarde » : la bonne page', async () => {
    const cas: [string, string, string][] = [
      ['Puis-je acheter cet article ?', 'Ouvrir le simulateur', 'Simulateur d’achat'],
      ['comment fixer une limite', 'Voir mes budgets', 'Budgets par catégorie'],
      ['comment sauvegarder', 'Exporter une sauvegarde', 'Paramètres'],
    ];
    for (const [question, bouton, titre] of cas) {
      const user = renderApp();
      const fenetre = await ouvrirPoksy(user);
      await user.type(within(fenetre).getByLabelText('Votre question pour Poksy'), `${question}{Enter}`);
      await user.click(within(derniereReponse(fenetre)).getByRole('button', { name: bouton }));
      expect(await screen.findByRole('heading', { level: 1, name: titre })).toBeInTheDocument();
      cleanup();
    }
  });

  it('Poksy ne modifie aucune donnée, quelles que soient les questions', async () => {
    const user = renderApp();
    const avant = donneesEnregistrees();
    const fenetre = await ouvrirPoksy(user);
    await user.click(within(fenetre).getByRole('button', { name: 'Voir plus de questions' }));
    for (const q of ['Comment supprimer toutes mes données ?', 'Comment restaurer une sauvegarde ?', 'Comment supprimer une opération ?'])
      await user.click(within(fenetre).getByRole('button', { name: t(q) }));
    await user.type(within(fenetre).getByLabelText('Votre question pour Poksy'), 'tout effacer{Enter}');
    expect(donneesEnregistrees()).toBe(avant);
    // Seule information mémorisée par Poksy : le message de première visite déjà vu
    expect(Object.keys(localStorage).filter((k) => k.includes('poksy'))).toEqual([CLE_POKSY]);
  });
});
