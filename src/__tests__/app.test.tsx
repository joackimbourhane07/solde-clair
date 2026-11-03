import { describe, expect, it } from 'vitest';
import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../state/AppState';
import { AppRoutes } from '../App';
import type { AppData } from '../types';
import { PROFILES_KEY, STORAGE_KEY, emptyData, exportJSON, parseBackup } from '../lib/storage';
import { fixture, TODAY } from '../test/fixtures';
import pageHtml from '../../index.html?raw';
import iconeSvg from '../../public/icone-soldeclair.svg?raw';

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
    const user = renderApp(emptyData(), '/bienvenue');
    expect(screen.getByRole('heading', { name: 'Bienvenue sur SoldeClair' })).toBeInTheDocument();

    // Prénom obligatoire
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    expect(screen.getByText('Indiquez un prénom ou un pseudonyme.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Prénom ou pseudonyme'), 'Sam');
    await user.click(screen.getByLabelText('Alternant(e)'));
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
    const user = renderApp(emptyData(), '/bienvenue');
    await user.selectOptions(screen.getByLabelText('Profil de démonstration'), 'salarie');
    await user.click(screen.getByRole('button', { name: 'Charger la démonstration' }));
    expect(await screen.findByRole('heading', { name: 'Bonjour Camille (démo)' })).toBeInTheDocument();
  });
});

describe('tableau de bord', () => {
  it('affiche le reste à vivre (le solde de « Mon compte ») et les chiffres clés', () => {
    renderApp();
    // Solde de « Mon compte » : 2 590,52 € ; 19 jours restants → 136,34 € par jour
    expect(norm(screen.getByText(/Il vous reste/).textContent)).toBe(
      'Il vous reste 2 590 € pour terminer le mois, soit environ 136 € par jour.',
    );
    // Le bilan du mois (budget) reste dans « Détail du mois »
    const stat = screen.getByText('Bilan du mois').parentElement!;
    expect(norm(stat.textContent)).toContain('821,51 €');
    // La limite dépassée devient une action dans « À faire »
    expect(screen.getByText('Votre budget « Alimentation » est dépassé de 8,00 €.', { normalizer: norm })).toBeInTheDocument();
  });

  it('ajout rapide d’une dépense, totaux mis à jour et sauvegardés', async () => {
    const user = renderApp();
    const form = screen.getByRole('form', { name: 'Ajout rapide d’une dépense' });
    await user.type(within(form).getByLabelText('Montant'), '21,51');
    await user.selectOptions(within(form).getByLabelText('Catégorie'), 'Santé');
    await user.type(within(form).getByLabelText(/Description/), 'Pharmacie');
    await user.click(within(form).getByRole('button', { name: 'Ajouter la dépense' }));

    expect(await screen.findByText('Dépense de 21,51 € enregistrée.', { normalizer: norm })).toBeInTheDocument();
    expect(norm(screen.getByText('Bilan du mois').parentElement!.textContent)).toContain('800,00 €');
    // 2 590,52 − 21,51 = 2 569,01 € ÷ 19 jours
    expect(norm(screen.getByText(/Il vous reste/).textContent)).toBe('Il vous reste 2 569 € pour terminer le mois, soit environ 135 € par jour.');
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
    // Solde de « Mon compte » au 31 octobre
    expect(norm(screen.getByText(/Mois terminé :/).textContent)).toBe('Mois terminé : il vous restait 1 753,02 € à la fin du mois.');
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

describe('améliorations de simplicité (recherche et audit)', () => {
  it('tableau de bord : « Comment est-ce calculé ? » détaille le calcul avec les vrais chiffres', async () => {
    const user = renderApp();
    await user.click(screen.getByText('Comment est-ce calculé ?'));
    const calcul = screen.getByText(/= Solde de «.Mon compte.» aujourd’hui/).closest('dl')!;
    // Cumul depuis la première saisie (15 mars) : tout ce qui est arrivé moins tout ce qui est parti
    expect(norm(calcul.textContent)).toContain('+ Revenus reçus5 000,50 €');
    expect(norm(calcul.textContent)).toContain('− Dépenses218,00 €');
    expect(norm(calcul.textContent)).toContain('− Charges fixes prélevées2 041,98 €');
    expect(norm(calcul.textContent)).toContain('− Épargne versée150,00 €');
    expect(norm(calcul.textContent)).toContain('= Solde de « Mon compte » aujourd’hui2 590,52 €');
    expect(norm(screen.getByText(/Divisé par 19 jours restants/).textContent)).toContain('environ 136,34 € par jour');
    expect(norm(screen.getByText(/Divisé par 19 jours restants/).textContent)).toContain('depuis votre première saisie (15 mars 2026)');
    // Une seule carte principale : la phrase, les repères et le calcul (plus de panneau qui répète les montants)
    expect(document.querySelector('.hero-figure')).toBeNull();
    expect(screen.getByText(/46 % des revenus déjà dépensés/)).toBeInTheDocument();
  });

  it('paramètres : la sauvegarde est en tête et affiche la date de la dernière sauvegarde', async () => {
    const user = renderApp(fixture(), '/parametres');
    const titres = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titres.indexOf('Sauvegarder mes données')).toBeLessThan(titres.indexOf('Mon profil'));
    expect(screen.getByText('aucune pour l’instant')).toBeInTheDocument();
    expect(screen.getByText(/Pensez à télécharger une sauvegarde complète/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sauvegarde complète (JSON)' }));
    expect(screen.getByText('le 12 nov. 2026')).toBeInTheDocument();
    expect(screen.queryByText(/Pensez à télécharger une sauvegarde complète/)).not.toBeInTheDocument();
    await waitFor(() => expect(stored().settings.lastBackup).toBe(TODAY));
  });

  it('la sauvegarde JSON contient sa propre date : la restauration retrouve l’état exact', () => {
    const d = { ...fixture(), settings: { theme: 'dark' as const, appearanceVersion: 2, lastBackup: TODAY } };
    const r = parseBackup(exportJSON(d, TODAY));
    expect(r.ok && r.data).toEqual(d);
  });

  it('historique : la recherche est le premier filtre', () => {
    renderApp(fixture(), '/historique');
    const champs = Array.from(document.querySelectorAll('.filters label')).map((l) => l.textContent);
    expect(champs[0]).toBe('Rechercher');
  });

  it('revenu : libellés explicites et conséquence du choix expliquée', async () => {
    const user = renderApp(fixture(), '/revenus');
    await user.click(screen.getByRole('button', { name: 'Ajouter un revenu' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Il sera compté automatiquement chaque mois (ou selon la fréquence choisie).')).toBeInTheDocument();
    await user.click(within(dialog).getByLabelText(/Exceptionnel \(prime, vente…\)/));
    expect(within(dialog).getByText('Il ne sera compté qu’une seule fois, à la date indiquée.')).toBeInTheDocument();
  });

  it('état vide avec bouton d’action (dépenses)', async () => {
    const d = fixture();
    d.expenses = [];
    const user = renderApp(d, '/depenses');
    await user.click(screen.getByRole('button', { name: 'Ajouter ma première dépense' }));
    expect(screen.getByRole('dialog', { name: 'Nouvelle dépense' })).toBeInTheDocument();
  });

  it('une seule notification visible à la fois', async () => {
    const user = renderApp();
    const form = screen.getByRole('form', { name: 'Ajout rapide d’une dépense' });
    for (const v of ['1', '2', '3']) {
      await user.type(within(form).getByLabelText('Montant'), v);
      await user.click(within(form).getByRole('button', { name: 'Ajouter la dépense' }));
    }
    expect(document.querySelectorAll('.toast')).toHaveLength(1);
    expect(norm(document.querySelector('.toast')?.textContent)).toContain('3,00 €');
  });

  it('configuration : lien direct vers le profil de démonstration', async () => {
    const user = renderApp(emptyData(), '/bienvenue');
    await user.click(screen.getByRole('button', { name: 'Essayer avec un profil de démonstration' }));
    expect(document.activeElement).toHaveTextContent('Ou bien…');
  });

  it('nouveau profil : thème clair par défaut', () => {
    expect(emptyData().settings.theme).toBe('light');
  });
});

describe('page d’accueil (présentation)', () => {
  it('nouveau visiteur : la présentation d’abord, puis la configuration avec « Commencer »', async () => {
    const user = renderApp(emptyData());
    expect(await screen.findByRole('heading', { level: 1, name: 'Votre budget devient enfin clair.' })).toBeInTheDocument();
    // Les grandes sections, dans l'ordre prévu
    const titres = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titres).toEqual([
      'L’essentiel, sans complication.',
      'Sachez ce qu’il vous reste, vraiment.',
      'Anticipez ce qui arrive.',
      'Avancez vers vos projets, pas à pas.',
      'Avant d’acheter, simulez.',
      'Adapté à votre situation.',
      'Vos données restent sur votre appareil.',
      'Commencer avec SoldeClair',
    ]);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Commencer' })[0]);
    expect(await screen.findByRole('heading', { name: 'Bienvenue sur SoldeClair' })).toBeInTheDocument();
  });

  it('« Essayer avec un profil de démonstration » mène à la démonstration de la configuration', async () => {
    const user = renderApp(emptyData());
    await user.click(await screen.findByRole('button', { name: 'Essayer avec un profil de démonstration' }));
    expect(await screen.findByRole('heading', { name: 'Ou bien…' })).toHaveFocus();
    expect(screen.getByLabelText('Profil de démonstration')).toBeInTheDocument();
  });

  it('avec des données : le tableau de bord directement, et la présentation propose d’y retourner', async () => {
    renderApp(fixture(), '/');
    expect(screen.getByRole('heading', { name: 'Bonjour Test' })).toBeInTheDocument();
    cleanup();
    const user = renderApp(fixture(), '/presentation');
    const boutons = await screen.findAllByRole('button', { name: 'Continuer avec Test' });
    expect(boutons).toHaveLength(2); // introduction et appel final
    expect(screen.getAllByRole('button', { name: 'Créer un nouveau profil' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Essayer avec un profil de démonstration' })).not.toBeInTheDocument();
    await user.click(boutons[0]);
    expect(await screen.findByRole('heading', { name: 'Bonjour Test' })).toBeInTheDocument();
  });

  it('plusieurs profils : la présentation les propose et permet de changer de profil', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixture()));
    localStorage.setItem(`${STORAGE_KEY}:p2`, JSON.stringify({ ...fixture(), profile: { ...fixture().profile!, name: 'Léo' } }));
    localStorage.setItem(PROFILES_KEY, JSON.stringify({ actif: 'principal', ids: ['principal', 'p2'] }));
    const user = renderApp(fixture(), '/presentation');
    expect((await screen.findAllByRole('button', { name: 'Continuer avec Test' })).length).toBe(2);
    const autres = screen.getAllByRole('group', { name: 'Autres profils' })[0];
    await user.click(within(autres).getByRole('button', { name: 'Léo' }));
    expect(await screen.findByRole('heading', { name: 'Bonjour Léo' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(PROFILES_KEY)!).actif).toBe('p2');
  });

  it('créer un nouveau profil garde l’ancien ; « Revenir à mes profils » permet d’y retourner', async () => {
    const user = renderApp(fixture(), '/presentation');
    await user.click((await screen.findAllByRole('button', { name: 'Créer un nouveau profil' }))[0]);
    expect(await screen.findByRole('heading', { name: 'Bienvenue sur SoldeClair' })).toBeInTheDocument();
    // Les données du premier profil sont intactes
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).profile.name).toBe('Test');
    await user.click(screen.getByRole('link', { name: 'Revenir à mes profils' }));
    await user.click((await screen.findAllByRole('button', { name: 'Continuer avec Test' }))[0]);
    expect(await screen.findByRole('heading', { name: 'Bonjour Test' })).toBeInTheDocument();
  });

  it('le logo mène à la page d’accueil', () => {
    renderApp();
    expect(screen.getAllByRole('link', { name: 'SoldeClair, page d’accueil et profils' })[0]).toHaveAttribute('href', '/presentation');
  });

  it('l’application propose un lien vers la présentation', () => {
    renderApp();
    expect(screen.getByRole('link', { name: 'Voir la présentation de SoldeClair' })).toHaveAttribute('href', '/presentation');
  });
});

describe('retours de la propriétaire : report, catégories, messages', () => {
  const avecReport = (): AppData => ({ ...fixture(), settings: { ...fixture().settings, carryOver: true } });

  it('revenu daté d’un autre mois : message clair et bouton pour voir ce mois', async () => {
    const user = renderApp(avecReport(), '/revenus');
    await user.click(screen.getByRole('button', { name: 'Ajouter un revenu' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nom'), 'Prime');
    await user.type(within(dialog).getByLabelText('Montant'), '1000');
    await user.click(within(dialog).getByLabelText(/Exceptionnel/));
    const date = within(dialog).getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2026-10-26');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter le revenu' }));
    // Règle du 20 (par défaut) : la prime du 26 octobre compte pour novembre
    expect(await screen.findByText('Revenu enregistré. Reçu à partir du 20 : il compte pour novembre 2026.', { normalizer: norm })).toBeInTheDocument();
    expect(norm(screen.getByText(/Les revenus reçus à partir du 20/).textContent)).toContain('Prime (26 oct. 2026) est compté ici');
    expect(norm(screen.getByText('Revenus de novembre 2026').parentElement!.textContent)).toContain('2 700,50 €');
  });

  it('revenu daté d’un autre mois, règle du 20 désactivée : message clair et bouton pour voir ce mois', async () => {
    const d = avecReport();
    d.settings.incomeShiftDay = null;
    const user = renderApp(d, '/revenus');
    await user.click(screen.getByRole('button', { name: 'Ajouter un revenu' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nom'), 'Prime');
    await user.type(within(dialog).getByLabelText('Montant'), '1000');
    await user.click(within(dialog).getByLabelText(/Exceptionnel/));
    const date = within(dialog).getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2026-10-26');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter le revenu' }));
    expect(
      await screen.findByText('Revenu enregistré. Mois concerné : octobre 2026. Le reste de ce mois est reporté sur les suivants.', { normalizer: norm }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Reste des mois précédents/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voir octobre 2026' }));
    expect(screen.getByText('Octobre 2026')).toBeInTheDocument();
  });

  it('revenus : un revenu d’un autre mois est signalé dans la liste complète', async () => {
    const user = renderApp(fixture(), '/revenus');
    await user.click(screen.getByLabelText('Afficher tous les revenus enregistrés (tous les mois)'));
    const ligne = screen.getByText('Remboursement').closest('li')! as HTMLElement;
    expect(within(ligne).getByText('Compté en octobre 2026')).toBeInTheDocument();
    expect(within(ligne).getByRole('button', { name: 'Voir octobre 2026' })).toBeInTheDocument();
  });

  it('tableau de bord : le solde cumule déjà tout ; le report reste dans « Détail du mois »', () => {
    renderApp(avecReport());
    // Même phrase qu'avec le report désactivé : c'est le solde de « Mon compte »
    expect(norm(screen.getByText(/Il vous reste/).textContent)).toContain('Il vous reste 2 590 €');
    expect(document.body.textContent).not.toContain('compté dans votre disponible');
    const detail = screen.getByText('Détail du mois').closest('details')!;
    expect(norm(within(detail).getByText('Report des mois précédents').parentElement!.textContent)).toContain('1 753,02 €');
    expect(norm(within(detail).getByText('Bilan du mois').parentElement!.textContent)).toContain('2 574,53 €');
  });

  it('paramètres : le report se désactive', async () => {
    const user = renderApp(avecReport(), '/parametres');
    const caseReport = screen.getByLabelText(/Reporter le reste d’un mois sur le suivant/);
    expect(caseReport).toBeChecked();
    await user.click(caseReport);
    await waitFor(() => expect(stored().settings.carryOver).toBe(false));
  });

  it('charge fixe : liste de catégories vide → création sur place', async () => {
    const d = fixture();
    d.categories = d.categories.filter((c) => c.kind !== 'fixed');
    d.fixedCharges = [];
    const user = renderApp(d, '/charges');
    await user.click(screen.getAllByRole('button', { name: 'Ajouter une charge' })[0]);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Catégorie')).toHaveValue('__nouvelle__');
    expect(within(dialog).getByText('Aucune catégorie de ce type pour l’instant : créez-la ici.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Nom'), 'Loyer');
    await user.type(within(dialog).getByLabelText('Montant'), '221');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter la charge' }));
    expect(within(dialog).getByText('Indiquez le nom de la nouvelle catégorie.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Nom de la nouvelle catégorie'), 'Logement');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter la charge' }));
    await waitFor(() => {
      const cat = stored().categories.find((c) => c.kind === 'fixed' && c.name === 'Logement');
      expect(cat).toBeDefined();
      expect(stored().fixedCharges[0].categoryId).toBe(cat!.id);
    });
  });
});

describe('identité claire et améliorations v2', () => {
  it('titre de la page : « SoldeClair » seulement', () => {
    expect(pageHtml).toContain('<title>SoldeClair</title>');
  });

  it('accueil : « À venir » seulement sur les 3 prochains jours, avec des dates relatives', () => {
    renderApp();
    // Le forfait du 20 est trop loin : il reste visible dans « Mon compte » → « À venir »
    expect(screen.getByText('Rien de prévu dans les 3 prochains jours.')).toBeInTheDocument();
    expect(screen.queryByText(/Téléphone/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tout voir' })).toHaveAttribute('href', '/compte?vue=a-venir');
    cleanup();
    const d = fixture();
    d.fixedCharges = d.fixedCharges.map((c) => (c.id === 'f-tel' ? { ...c, date: '2026-09-14' } : c));
    renderApp(d);
    expect(norm(screen.getByText(/Dans les 3 prochains jours/).textContent)).toBe('Dans les 3 prochains jours : 1 opération prévue, pas encore comptée dans votre solde.');
    expect(screen.getByText(/Dans 2 jours – Téléphone/)).toBeInTheDocument();
  });

  it('historique : filtres actifs visibles et effaçables en un geste', async () => {
    const user = renderApp(fixture(), '/historique');
    expect(screen.queryByText(/filtre actif/)).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Rechercher'), 'introuvable');
    expect(screen.getByText('1 filtre actif')).toBeInTheDocument();
    await user.click(within(screen.getByRole('group', { name: 'Type' })).getByRole('button', { name: 'Dépenses' }));
    expect(screen.getByText('2 filtres actifs')).toBeInTheDocument();
    expect(screen.getByText('Aucun mouvement ne correspond à ces critères.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Effacer les filtres' })[0]);
    expect(screen.getByLabelText('Rechercher')).toHaveValue('');
    expect(within(screen.getByRole('group', { name: 'Type' })).getByRole('button', { name: 'Tous' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText(/filtres? actifs?/)).not.toBeInTheDocument();
    expect(screen.getByText('Concert')).toBeInTheDocument();
  });

  it('objectifs : pourcentage atteint et prochaine petite étape', () => {
    renderApp(fixture(), '/objectifs');
    // 200 € de départ + 100 € (novembre) + 50 € (octobre) = 350 € sur 1 000 €
    expect(screen.getByText(norm('Vous avez atteint 35\u00a0% de votre objectif. Ce mois-ci, vous avez déjà mis 100,00\u00a0€ de côté pour cet objectif.'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter un versement' })).toHaveClass('btn-secondaire');
  });
});

describe('améliorations validées : ajout rapide, raccourcis, discrétion, simplicité', () => {
  it('bouton « + » : ajoute une dépense depuis n’importe quelle page', async () => {
    const user = renderApp(fixture(), '/budgets');
    const boutons = screen.getAllByRole('button', { name: 'Ajouter une dépense' });
    // barre latérale (ordinateur) et bouton central (mobile)
    expect(boutons.length).toBe(2);
    await user.click(boutons[1]);
    const dialog = screen.getByRole('dialog', { name: 'Nouvelle dépense' });
    await user.type(within(dialog).getByLabelText('Montant'), '6,50');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter la dépense' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(stored().expenses.some((e) => e.amount === 650 && e.date === TODAY)).toBe(true));
    // On reste sur la page en cours
    expect(screen.getByRole('heading', { name: 'Budgets par catégorie' })).toBeInTheDocument();
  });

  it('catégories fréquentes : la plus utilisée est présélectionnée, un clic change la catégorie', async () => {
    const user = renderApp();
    const form = screen.getByRole('form', { name: 'Ajout rapide d’une dépense' });
    const groupe = within(form).getByRole('group', { name: 'Catégories fréquentes' });
    const puces = within(groupe).getAllByRole('button');
    expect(puces.map((b) => b.textContent)).toEqual(['Alimentation', 'Loisirs', 'Santé']);
    expect(puces[0]).toHaveAttribute('aria-pressed', 'true');
    await user.click(puces[1]);
    expect(within(form).getByLabelText('Catégorie')).toHaveValue('c-loisirs');
    expect(puces[1]).toHaveAttribute('aria-pressed', 'true');
    await user.type(within(form).getByLabelText('Montant'), '12');
    await user.click(within(form).getByRole('button', { name: 'Ajouter la dépense' }));
    await waitFor(() => expect(stored().expenses.some((e) => e.amount === 1200 && e.categoryId === 'c-loisirs')).toBe(true));
  });

  it('masquer les montants : tous les montants sont remplacés, la préférence est conservée', async () => {
    const user = renderApp();
    const [bouton] = screen.getAllByRole('button', { name: 'Masquer les montants' });
    await user.click(bouton);
    expect(norm(screen.getByText(/Il vous reste/).textContent)).toBe('Il vous reste ••• € pour terminer le mois, soit environ ••• € par jour.');
    expect(norm(screen.getByText('Bilan du mois').parentElement!.textContent)).toContain('••• €');
    expect(document.body.textContent).not.toMatch(/821,51|2 590|2 590/);
    expect(screen.getAllByRole('button', { name: 'Afficher les montants' })[0]).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(stored().settings.hideAmounts).toBe(true));
    await user.click(screen.getAllByRole('button', { name: 'Afficher les montants' })[0]);
    expect(norm(screen.getByText('Bilan du mois').parentElement!.textContent)).toContain('821,51 €');
  });

  it('tableau de bord : ordre prévu, au plus quatre chiffres principaux, le reste dans « Détail du mois »', () => {
    renderApp();
    // Carte principale, puis À venir, Ce mois-ci, Épargne, À faire, Estimation, ajout rapide
    const titres = Array.from(document.querySelectorAll('.dashboard-grid .card-title')).map((e) => e.textContent);
    expect(titres).toEqual(['À venir', 'Ce mois-ci', 'Épargne du mois', 'À faire', 'Estimation des 30 prochains jours', 'Ajouter une dépense']);
    // Hors « Détail du mois », deux chiffres seulement en plus de la phrase principale
    const horsDetail = Array.from(document.querySelectorAll('.stat-label')).filter((e) => !e.closest('.detail-mois'));
    expect(horsDetail.map((e) => e.textContent)).toEqual(['Revenus', 'Total des dépenses']);
    // Un seul graphique visible
    expect(Array.from(document.querySelectorAll('.chart, .hbar-list, figure')).filter((e) => !e.closest('.detail-mois')).length).toBeLessThanOrEqual(1);
    const detail = screen.getByText('Détail du mois').closest('details')!;
    expect(detail).not.toHaveAttribute('open');
    expect(Array.from(detail.querySelectorAll('.stat-label')).map((e) => e.textContent)).toEqual([
      'Charges fixes',
      'Dépenses variables',
      'Bilan du mois',
      'Épargné ce mois',
      'Reste à vivre par jour',
      'Prévision fin de mois',
    ]);
  });

  it('tableau de bord : « Ignorer » masque une action et le choix est enregistré', async () => {
    const user = renderApp();
    const carte = screen.getByRole('heading', { name: 'À faire' }).closest('section, .card')!;
    expect(within(carte as HTMLElement).getAllByRole('listitem')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: /^Ignorer : Faites une sauvegarde/ }));
    expect(screen.queryByText('Faites une sauvegarde de vos données.')).not.toBeInTheDocument();
    await waitFor(() => expect(stored().settings.dismissedActions).toEqual(['sauvegarde:2026-11']));
  });

  it('tableau de bord : estimation à 7, 15 et 30 jours, signalée comme estimation', () => {
    renderApp();
    const carte = screen.getByRole('heading', { name: 'Estimation des 30 prochains jours' }).closest('.card')! as HTMLElement;
    expect(within(carte).getByText('Estimation')).toBeInTheDocument();
    expect(Array.from(carte.querySelectorAll('.prevision-points dt')).map((e) => e.textContent)).toEqual(['Dans 7 jours', 'Dans 15 jours', 'Dans 30 jours']);
    // Départ : le solde de « Mon compte » (2 590,52 €), moins 9,83 € de dépenses courantes par jour
    expect(norm(carte.querySelector('.prevision-points')!.textContent)).toContain('2 521,71 €');
    expect(norm(carte.querySelector('.prevision-phrase')!.textContent)).toBe(
      'Si tout se passe comme prévu, il vous resterait environ 3 179 € dans 30 jours.',
    );
  });

  it('budgets : les catégories sans limite sont regroupées en une liste compacte', async () => {
    const user = renderApp(fixture(), '/budgets');
    const liste = screen.getByRole('heading', { name: 'Catégories sans limite (1)' }).closest('section')!;
    expect(within(liste).getByText('Santé')).toBeInTheDocument();
    expect(document.querySelectorAll('.budget-card')).toHaveLength(2); // Alimentation et Loisirs
    await user.click(within(liste).getByRole('button', { name: 'Fixer une limite pour Santé' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Limite mensuelle'), '30');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));
    expect(document.querySelectorAll('.budget-card')).toHaveLength(3);
    expect(screen.queryByRole('heading', { name: /Catégories sans limite/ })).not.toBeInTheDocument();
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
    await user.click(within(dialog).getByLabelText(/Exceptionnel/));
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
    // Point de départ : le solde de « Mon compte » (2 590,52 €)
    await user.type(screen.getByLabelText('Montant de l’achat'), '3000');
    expect(screen.getByText('Achat susceptible de déséquilibrer le budget')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Montant de l’achat'));
    await user.type(screen.getByLabelText('Montant de l’achat'), '100');
    expect(screen.getByText('Situation confortable')).toBeInTheDocument();
    expect(norm(screen.getByText('Solde aujourd’hui').parentElement!.textContent)).toContain('2 590,52 €');
    expect(norm(screen.getByText('Solde restant après l’achat').parentElement!.textContent)).toContain('2 490,52 €');
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
    // Après l'effacement : retour à la présentation, comme un nouveau visiteur
    expect(await screen.findByRole('heading', { level: 1, name: 'Votre budget devient enfin clair.' })).toBeInTheDocument();
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
    await user.click(within(screen.getByRole('group', { name: 'Type' })).getByRole('button', { name: 'Dépenses' }));
    expect(screen.getByText('3 transaction(s)')).toBeInTheDocument();
    // Période en puces : tout l'historique en un geste
    await user.click(within(screen.getByRole('group', { name: 'Période' })).getByRole('button', { name: 'Tout l’historique' }));
    expect(screen.getByText('4 transaction(s)')).toBeInTheDocument();
    await user.click(within(screen.getByRole('group', { name: 'Période' })).getByRole('button', { name: 'Un mois' }));
    await user.type(screen.getByLabelText('Rechercher'), 'concert');
    expect(screen.getByText('1 transaction(s)')).toBeInTheDocument();
  });

  it('budgets : l’essentiel en une phrase, et une piste quand la limite est dépassée', async () => {
    const user = renderApp(fixture(), '/budgets');
    const alim = screen.getByRole('heading', { name: 'Alimentation' }).closest('.card')! as HTMLElement;
    expect(norm(alim.querySelector('.budget-phrase')!.textContent)).toBe('58,00 € dépensés sur 50,00 €, dépassement de 8,00 €');
    expect(within(alim).getByText(/Vous pouvez consulter les dépenses concernées ou ajuster cette limite pour le mois/)).toBeInTheDocument();
    const loisirs = screen.getByRole('heading', { name: 'Loisirs' }).closest('.card')! as HTMLElement;
    expect(norm(loisirs.querySelector('.budget-phrase')!.textContent)).toBe('60,00 € dépensés sur 80,00 € (75 %), il reste 20,00 €');
    // « Voir les dépenses » ouvre la liste filtrée sur la catégorie
    await user.click(within(alim).getByRole('link', { name: 'Voir les dépenses' }));
    expect(screen.getByLabelText('Catégorie')).toHaveValue('c-alim');
  });

  it('affiche le bilan avec la comparaison au mois précédent', async () => {
    const user = renderApp(fixture(), '/historique');
    await user.click(screen.getByRole('tab', { name: 'Bilan mensuel' }));
    const row = screen.getByRole('row', { name: /Dépenses variables/ });
    expect(norm(row.textContent)).toContain('118,00 €');
    expect(norm(row.textContent)).toContain('en hausse de 18,00 €');
  });
});

/** Jeu fictif avec une carte restaurant : 180 € versés le 1er, un déjeuner de 9,80 € le 11. */
function avecCarte(): AppData {
  const d = fixture();
  d.categories.push({ id: 'c-cr', name: 'Carte restaurant', kind: 'income', budget: null });
  d.incomes.push({ id: 'i-cr', name: 'Titres-restaurant', amount: 18000, date: '2026-11-01', categoryId: 'c-cr', recurring: true, frequency: 'mensuel', endDate: null, note: '' });
  d.expenses.push({ id: 'e-cr', amount: 980, categoryId: 'c-alim', date: '2026-11-11', description: 'Déjeuner', paymentMethod: 'Carte restaurant' });
  return d;
}

describe('série 3 : onglet Compte, carte restaurant, pourcentages', () => {
  it('onglet Compte : solde du jour et opérations jour par jour, comme une appli bancaire', () => {
    renderApp(fixture(), '/compte');
    expect(screen.getByRole('heading', { name: 'Mon compte' })).toBeInTheDocument();
    expect(screen.getByText('Compte bancaire – solde aujourd’hui')).toBeInTheDocument();
    expect(norm(document.querySelector('.solde-montant')?.textContent)).toBe('2 590,52 €');
    // Sans carte restaurant, pas de choix de compte
    expect(screen.queryByRole('group', { name: 'Compte affiché' })).not.toBeInTheDocument();
    // Jour du concert : opération et solde de fin de journée
    const jour = screen.getByRole('region', { name: 'Hier' });
    expect(within(jour).getByText('Concert')).toBeInTheDocument();
    expect(norm(jour.querySelector('.releve-solde')?.textContent)).toBe('Solde : 2 590,52 €');
    // « À venir » est rangé dans sa propre bulle : rien d'autre n'encombre la page
    expect(screen.queryByText('Forfait')).not.toBeInTheDocument();
  });

  it('onglet Compte : « Opérations » et « À venir » sont deux bulles, chacune avec son onglet', async () => {
    const user = renderApp(fixture(), '/compte');
    const bulles = screen.getByRole('tablist', { name: 'Opérations affichées' });
    const [operations, aVenir] = within(bulles).getAllByRole('tab');
    expect(operations).toHaveAccessibleName('Opérations');
    // Rien dans les 7 prochains jours (le forfait est le 20) : pas de nombre dans la bulle
    expect(aVenir).toHaveAccessibleName('À venir');
    expect(aVenir.querySelector('.bulle-nombre')).toBeNull();
    expect(operations).toHaveAttribute('aria-selected', 'true');
    await user.click(aVenir);
    expect(aVenir).toHaveAttribute('aria-selected', 'true');
    const panneau = screen.getByRole('tabpanel');
    expect(panneau).toHaveAccessibleName('À venir');
    // Forfait (le 20), salaire et loyer de décembre ; plus de relevé ni de recherche
    expect(within(panneau).getByText('Forfait')).toBeInTheDocument();
    expect(within(panneau).getByText('Salaire')).toBeInTheDocument();
    expect(within(panneau).queryByLabelText('Rechercher une opération')).not.toBeInTheDocument();
    expect(norm(within(panneau).getByText(/Dans les 30 prochains jours/).textContent)).toContain('+ 1 500,00 € qui entrent');
    // Flèches du clavier : retour aux opérations
    await user.keyboard('{ArrowLeft}');
    expect(operations).toHaveAttribute('aria-selected', 'true');
    expect(operations).toHaveFocus();
    expect(screen.getByLabelText('Rechercher une opération')).toBeInTheDocument();
  });

  it('bulle « À venir » : un nombre seulement pour les 7 prochains jours', () => {
    const d = fixture();
    // Forfait prélevé le 18 (dans 6 jours) au lieu du 20
    d.fixedCharges = d.fixedCharges.map((c) => (c.id === 'f-tel' ? { ...c, date: '2026-09-18' } : c));
    renderApp(d, '/compte');
    const bulle = screen.getByRole('tab', { name: /^À venir/ });
    expect(bulle).toHaveAccessibleName('À venir (1 opération dans les 7 prochains jours)');
    expect(bulle.querySelector('.bulle-nombre')?.textContent).toBe('1');
  });

  it('solde : explication et bouton tant qu’aucun solde réel n’est indiqué ; jamais « -0,00 € »', async () => {
    const user = renderApp(fixture(), '/compte');
    expect(screen.getByText(/SoldeClair part de 0 € et ajoute chaque revenu le jour où il est versé/, { normalizer: norm })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Indiquer mon solde réel' }));
    const dialog = screen.getByRole('dialog', { name: 'Ajuster le solde' });
    await user.clear(within(dialog).getByLabelText('Solde réel – Compte bancaire'));
    await user.type(within(dialog).getByLabelText('Solde réel – Compte bancaire'), '3000');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer le solde' }));
    expect(screen.queryByRole('button', { name: 'Indiquer mon solde réel' })).not.toBeInTheDocument();
    // Recherche sans résultat : entrées et sorties à zéro, sans « -0 »
    await user.type(screen.getByLabelText('Rechercher une opération'), 'introuvable');
    expect(norm(document.querySelector('.operations-totaux')?.textContent)).toContain('Sorties : − 0,00 €');
    expect(document.body.textContent).not.toMatch(/-0,00/);
  });

  it('adresse directe vers « À venir » (compte?vue=a-venir)', () => {
    renderApp(fixture(), '/compte?vue=a-venir');
    expect(screen.getByRole('tab', { name: /À venir/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Forfait')).toBeInTheDocument();
  });

  it('couleurs : vert pour l’argent qui entre et le solde positif, rouge pour ce qui sort', async () => {
    const user = renderApp(fixture(), '/compte');
    // Solde positif écrit en vert, sans encadré
    expect(document.querySelector('.solde-montant')).toHaveClass('montant-plus');
    // Le concert (dépense) : pastille et montant rouges ; le salaire : vert
    const concert = screen.getByText('Concert').closest('li')!;
    expect(concert.querySelector('.operation-icone')).toHaveClass('sens-sortie');
    expect(within(concert).getByText(/60,00/)).toHaveClass('montant-moins');
    const salaire = screen.getAllByText('Salaire')[0].closest('li')!;
    expect(salaire.querySelector('.operation-icone')).toHaveClass('sens-entree');
    expect(within(salaire).getByText(/1 500,00/, { normalizer: norm })).toHaveClass('montant-plus');
    // Découvert : pastille rouge
    await user.click(screen.getByRole('button', { name: 'Ajuster le solde' }));
    const dialog = screen.getByRole('dialog', { name: 'Ajuster le solde' });
    await user.clear(within(dialog).getByLabelText('Solde réel – Compte bancaire'));
    await user.type(within(dialog).getByLabelText('Solde réel – Compte bancaire'), '20');
    await user.click(within(dialog).getByLabelText('Solde négatif (découvert)'));
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer le solde' }));
    expect(document.querySelector('.solde-montant')).toHaveClass('montant-moins');
  });

  it('couleurs partout : dépenses et charges en rouge avec « − », revenus en vert avec « + »', () => {
    renderApp(fixture(), '/depenses');
    const courses = screen.getByText('Courses').closest('li')!;
    expect(norm(courses.querySelector('.montant')?.textContent)).toBe('− 45,30 €');
    expect(courses.querySelector('.montant')).toHaveClass('montant-moins');
    expect(screen.getByText('Total de novembre 2026').closest('.stat')).toHaveClass('stat-sortie');
    cleanup();
    renderApp(fixture(), '/revenus');
    expect(screen.getByText('Revenus de novembre 2026').closest('.stat')).toHaveClass('stat-entree');
    expect(document.querySelector('.item .montant')).toHaveClass('montant-plus');
    cleanup();
    renderApp(fixture(), '/charges');
    expect(document.querySelector('.item .montant')).toHaveClass('montant-moins');
    cleanup();
    // Tableau de bord : le reste à vivre (positif) en vert
    renderApp();
    expect(document.querySelector('.hero-text .valeur')).toHaveClass('montant-plus');
  });


  it('« Ajuster le solde » : le solde réel est enregistré, l’ajustement se supprime', async () => {
    const user = renderApp(fixture(), '/compte');
    await user.click(screen.getByRole('button', { name: 'Ajuster le solde' }));
    const dialog = screen.getByRole('dialog', { name: 'Ajuster le solde' });
    const champ = within(dialog).getByLabelText('Solde réel – Compte bancaire');
    await user.clear(champ);
    await user.type(champ, '2600');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer le solde' }));
    await waitFor(() => expect(stored().adjustments).toMatchObject([{ account: 'compte', date: TODAY, amount: 948 }]));
    expect(norm(document.querySelector('.solde-montant')?.textContent)).toBe('2 600,00 €');
    const aujourdhui = screen.getByRole('region', { name: 'Aujourd’hui' });
    expect(within(aujourdhui).getByText('Ajustement du solde')).toBeInTheDocument();
    await user.click(within(aujourdhui).getByRole('button', { name: /Supprimer cet ajustement/ }));
    await user.click(within(screen.getByRole('alertdialog', { name: 'Supprimer cet ajustement ?' })).getByRole('button', { name: 'Supprimer' }));
    await waitFor(() => expect(stored().adjustments).toEqual([]));
  });

  it('« Ajuster le solde » : un solde négatif (découvert) est possible', async () => {
    const user = renderApp(fixture(), '/compte');
    await user.click(screen.getByRole('button', { name: 'Ajuster le solde' }));
    const dialog = screen.getByRole('dialog', { name: 'Ajuster le solde' });
    const champ = within(dialog).getByLabelText('Solde réel – Compte bancaire');
    await user.clear(champ);
    await user.type(champ, '50');
    await user.click(within(dialog).getByLabelText('Solde négatif (découvert)'));
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer le solde' }));
    expect(norm(document.querySelector('.solde-montant')?.textContent)).toBe('− 50,00 €');
  });

  it('carte restaurant : soldes séparés et filtre par compte', async () => {
    const user = renderApp(avecCarte(), '/compte');
    const choix = screen.getByRole('group', { name: 'Compte affiché' });
    expect(within(choix).getAllByRole('button').map((b) => b.textContent)).toEqual(['Tout', 'Compte bancaire', 'Carte restaurant']);
    const detail = document.querySelector('.solde-detail')!;
    expect(norm(detail.textContent)).toContain('Compte bancaire2 590,52 €');
    expect(norm(detail.textContent)).toContain('Carte restaurant170,20 €');
    expect(norm(document.querySelector('.solde-montant')?.textContent)).toBe('2 760,72 €');
    await user.click(within(choix).getByRole('button', { name: 'Carte restaurant' }));
    expect(screen.getByText('Carte restaurant – solde aujourd’hui')).toBeInTheDocument();
    expect(norm(document.querySelector('.solde-montant')?.textContent)).toBe('170,20 €');
    expect(screen.getByText('Déjeuner')).toBeInTheDocument();
    expect(screen.queryByText('Concert')).not.toBeInTheDocument();
  });

  it('revenus : le cumul de toutes les sources, puis compte bancaire et carte restaurant à part', () => {
    renderApp(avecCarte(), '/revenus');
    const stat = (label: string) => norm(screen.getByText(label).parentElement!.textContent);
    expect(stat('Revenus de novembre 2026')).toContain('1 880,50 €');
    expect(stat('Revenus de novembre 2026')).toContain('Toutes les sources');
    expect(stat('Sur le compte bancaire')).toContain('1 700,50 €');
    expect(stat('Sur la carte restaurant')).toContain('180,00 €');
  });

  it('revenu : « Versé sur » se règle tout seul sur la carte restaurant pour cette catégorie', async () => {
    const user = renderApp(avecCarte(), '/revenus');
    await user.click(screen.getAllByRole('button', { name: 'Ajouter un revenu' })[0]);
    const dialog = screen.getByRole('dialog');
    const verse = within(dialog).getByRole('group', { name: 'Versé sur' });
    expect(within(verse).getByLabelText('Compte bancaire')).toBeChecked();
    await user.selectOptions(within(dialog).getByLabelText('Catégorie'), 'c-cr');
    expect(within(verse).getByLabelText('Carte restaurant')).toBeChecked();
  });

  it('dépense : « Carte restaurant » parmi les moyens de paiement', async () => {
    const user = renderApp(fixture(), '/depenses');
    await user.click(screen.getAllByRole('button', { name: 'Ajouter une dépense' })[0]);
    const options = within(within(screen.getByRole('dialog')).getByLabelText(/Moyen de paiement/)).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['Carte bancaire', 'Carte restaurant', 'Espèces']));
  });

  it('tableau de bord : épargne du mois en pourcentage et objectifs en cours', () => {
    renderApp();
    // 100 € épargnés sur 150 € → 67 %
    expect(screen.getByText(norm('67 % de l’objectif du mois : il vous manque 50,00 €.'), { normalizer: norm })).toBeInTheDocument();
    const objectifs = screen.getByRole('list', { name: 'Objectifs en cours' });
    expect(norm(objectifs.textContent)).toContain('Voyage');
    expect(norm(objectifs.textContent)).toContain('35 %');
  });

  it('tableau de bord : objectif dépassé → « atteint à 300 % »', () => {
    const d = fixture();
    d.profile!.monthlySavingsTarget = 3333;
    renderApp(d);
    expect(screen.getByText(norm('Objectif du mois atteint à 300 %. Bravo !'), { normalizer: norm })).toBeInTheDocument();
  });

  it('navigation : « Mon compte » dans le menu, « Compte » dans la barre du bas', () => {
    renderApp();
    expect(within(screen.getByRole('complementary', { name: 'Navigation principale' })).getByRole('link', { name: /Mon compte/ })).toBeInTheDocument();
    const bas = screen.getByRole('navigation', { name: 'Navigation principale (mobile)' });
    expect(within(bas).getAllByRole('link').map((l) => l.textContent)).toEqual(['Accueil', 'Compte', 'Budgets']);
  });

  it('aucun séparateur « · » dans l’interface', () => {
    const pages = ['/', '/compte', '/revenus', '/depenses', '/charges', '/budgets', '/objectifs', '/simulateur', '/historique', '/parametres', '/presentation'];
    for (const page of pages) {
      renderApp(avecCarte(), page);
      expect(document.body.textContent, page).not.toContain('·');
      cleanup();
    }
    renderApp(emptyData(), '/bienvenue');
    expect(document.body.textContent).not.toContain('·');
  });

  it('icône de l’onglet : bleue, sous un nouveau nom (l’ancienne orange n’est plus utilisée)', () => {
    expect(pageHtml).toContain('href="/icone-soldeclair.svg"');
    expect(pageHtml).toContain('href="/icone-32.png"');
    expect(pageHtml).toContain('rel="apple-touch-icon"');
    expect(pageHtml).not.toContain('favicon.svg');
    // Installation comme application
    expect(pageHtml).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(pageHtml).toContain('name="apple-mobile-web-app-title" content="SoldeClair"');
    expect(iconeSvg.toLowerCase()).toContain('#2383e2');
  });
});
