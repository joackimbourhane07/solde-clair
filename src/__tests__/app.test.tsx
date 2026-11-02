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
    const user = renderApp(emptyData(), '/bienvenue');
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

describe('améliorations de simplicité (recherche et audit)', () => {
  it('tableau de bord : « Comment est-ce calculé ? » détaille le calcul avec les vrais chiffres', async () => {
    const user = renderApp();
    await user.click(screen.getByText('Comment est-ce calculé ?'));
    const calcul = screen.getByText('= Solde disponible du mois').closest('dl')!;
    expect(norm(calcul.textContent)).toContain('+ Revenus du mois1 700,50 €');
    expect(norm(calcul.textContent)).toContain('= Solde disponible du mois821,51 €');
    expect(norm(screen.getByText(/Divisé par 19 jours restants/).textContent)).toContain('environ 43,23 € par jour');
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
    expect(
      await screen.findByText('Revenu enregistré. Mois concerné : octobre 2026. Le reste de ce mois est reporté sur les suivants.', { normalizer: norm }),
    ).toBeInTheDocument();
    // Le report apparaît sur la page des revenus de novembre
    expect(screen.getByText(/Le reste des mois précédents/)).toBeInTheDocument();
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

  it('tableau de bord : le report figure dans le calcul et dans « Ce mois-ci »', async () => {
    const user = renderApp(avecReport());
    expect(screen.getByText(/Report des mois précédents : \+ 1 753,02 €, compté dans votre disponible/, { normalizer: norm })).toBeInTheDocument();
    await user.click(screen.getByText('Comment est-ce calculé ?'));
    const calcul = screen.getByText('= Solde disponible du mois').closest('dl')!;
    expect(norm(calcul.textContent)).toContain('+ Report des mois précédents1 753,02 €');
    expect(norm(calcul.textContent)).toContain('= Solde disponible du mois2 574,53 €');
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

  it('accueil : résumé des 7 prochains jours et dates relatives', () => {
    renderApp();
    expect(screen.getByText('Aucune charge prévue dans les 7 prochains jours.')).toBeInTheDocument();
    expect(screen.getByText(/Le 20 nov\. 2026 · Téléphone/)).toBeInTheDocument();
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
    expect(norm(screen.getByText('Solde disponible').parentElement!.textContent)).toContain('••• €');
    expect(document.body.textContent).not.toMatch(/821,51/);
    expect(screen.getAllByRole('button', { name: 'Afficher les montants' })[0]).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(stored().settings.hideAmounts).toBe(true));
    await user.click(screen.getAllByRole('button', { name: 'Afficher les montants' })[0]);
    expect(norm(screen.getByText('Solde disponible').parentElement!.textContent)).toContain('821,51 €');
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
      'Solde disponible',
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
    expect(norm(carte.querySelector('.prevision-points')!.textContent)).toContain('768,69 €');
    expect(norm(carte.querySelector('.prevision-phrase')!.textContent)).toBe(
      'Si tout se passe comme prévu, il vous resterait environ 1 426 € dans 30 jours.',
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
    expect(norm(alim.querySelector('.budget-phrase')!.textContent)).toBe('58,00 € dépensés sur 50,00 € · dépassement de 8,00 €');
    expect(within(alim).getByText(/Vous pouvez consulter les dépenses concernées ou ajuster cette limite pour le mois/)).toBeInTheDocument();
    const loisirs = screen.getByRole('heading', { name: 'Loisirs' }).closest('.card')! as HTMLElement;
    expect(norm(loisirs.querySelector('.budget-phrase')!.textContent)).toBe('60,00 € dépensés sur 80,00 € (75 %) · il reste 20,00 €');
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
