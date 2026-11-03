import { describe, expect, it } from 'vitest';
import {
  ACTION_LABELS,
  ACTION_ROUTES,
  FICHES,
  MENTION,
  MESSAGE_BIENVENUE,
  MESSAGE_PREMIERE_VISITE,
  PRESENTATION,
  QUESTIONS_PAR_PAGE,
  QUESTIONS_RAPIDES,
  REPONSE_INTROUVABLE,
  RUBRIQUES,
  fiche,
  masquerNumeros,
  normaliser,
  pageDe,
  rechercher,
  reponseDe,
  typographie,
  type ContextePoksy,
  type PageKey,
} from '../poksy';

/** Réponse avec espaces ordinaires (les fiches utilisent des espaces insécables dans les guillemets). */
const rep = (f: Parameters<typeof reponseDe>[0], ctx?: ContextePoksy) => reponseDe(f, ctx).replace(/[\u00a0\u202f]/g, ' ');

const CONTEXTE_COMPLET: ContextePoksy = { resteAVivre: '1 407 €', parJour: '74 €', joursRestants: 19, ajustementFait: false };

/** Phrases d'une réponse (un point, « ? » ou « ! » suivi d'un espace ou de la fin). */
const phrases = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖÙ-Ý«0-9])/).filter((p) => p.trim().length > 0);

describe('Poksy : identité et textes', () => {
  it('textes de présentation, de bienvenue et de confidentialité', () => {
    expect(PRESENTATION).toBe('Poksy vous aide à comprendre votre budget, simplement.');
    expect(MESSAGE_PREMIERE_VISITE).toBe('Bonjour, je suis Poksy. Une question sur SoldeClair ?');
    expect(MESSAGE_BIENVENUE).toBe(
      'Bonjour, je suis Poksy 👋\nJe peux vous aider à comprendre votre budget ou à utiliser SoldeClair. Que souhaitez-vous savoir ?',
    );
    expect(MENTION).toBe('Poksy fonctionne sur votre appareil et ne remplace pas un conseiller financier professionnel.');
    expect(REPONSE_INTROUVABLE).toBe(
      'Je n’ai pas encore trouvé la réponse exacte. Vous pouvez choisir une question proposée ou consulter la rubrique correspondante dans SoldeClair.',
    );
  });

  it('les dix boutons d’action prévus, qui ouvrent seulement une page ou un formulaire', () => {
    expect(Object.values(ACTION_LABELS)).toEqual([
      'Ajouter une dépense',
      'Ajouter un revenu',
      'Ajuster mon solde',
      'Voir mon tableau de bord',
      'Créer un objectif',
      'Ouvrir le simulateur',
      'Voir mes budgets',
      'Exporter une sauvegarde',
      'Ouvrir les paramètres',
      'Ouvrir Mon plan d’épargne',
    ]);
    for (const route of Object.values(ACTION_ROUTES)) expect(route).toMatch(/^\/[a-z]*(\?[a-z]+=1)?$/);
  });
});

describe('Poksy : questions proposées', () => {
  it('les six questions rapides, dans l’ordre', () => {
    expect(QUESTIONS_RAPIDES.map((q) => q.libelle)).toEqual([
      'Comment est calculé mon reste à vivre ?',
      'Comment ajouter une dépense ?',
      'Quelle différence entre charge fixe et dépense variable ?',
      'Comment ajuster mon solde ?',
      'Comment créer un objectif d’épargne ?',
      'Où sont enregistrées mes données ?',
    ]);
  });

  it('« Voir plus de questions » : huit rubriques et toutes les questions demandées', () => {
    expect(RUBRIQUES.map((r) => `${r.titre} (${r.questions.length})`)).toEqual([
      'Mon compte (5)',
      'Revenus et dépenses (6)',
      'Budget (6)',
      'Épargne (4)',
      'Mon plan et ma situation (10)',
      'Simulateur (4)',
      'Confidentialité (7)',
      'Utilisation du site (6)',
    ]);
    const toutes = RUBRIQUES.flatMap((r) => r.questions.map((q) => q.libelle.replace(/[\u00a0\u202f]/g, ' ')));
    for (const attendue of [
      'Pourquoi mon solde ne correspond-il pas à ma banque ?',
      'Comment ajuster mon solde réel ?',
      'Qu’est-ce qu’un ajustement de solde ?',
      'Pourquoi la carte restaurant est-elle séparée ?',
      'Comment masquer les montants ?',
      'Comment fonctionne une opération récurrente ?',
      'Que signifient les alertes à 75 %, 90 % et 100 % ?',
      'Pourquoi l’épargne apparaît-elle en bleu et non en rouge ?',
      'Que signifie « possible avec prudence » ?',
      'Que se passe-t-il si je change d’appareil ?',
      'Comment signaler un problème ?',
    ])
      expect(toutes).toContain(attendue);
  });

  it('questions adaptées à la page ouverte', () => {
    const libelles = (p: PageKey) => QUESTIONS_PAR_PAGE[p]?.map((q) => q.libelle);
    expect(libelles('compte')).toEqual(['Comment ajuster mon solde ?', 'Pourquoi mon solde est-il différent ?', 'Pourquoi la carte restaurant est-elle séparée ?']);
    expect(libelles('depenses')).toEqual(['Comment ajouter une dépense ?', 'Comment modifier une opération ?', 'Comment choisir une catégorie ?']);
    expect(libelles('budgets')).toEqual(['Comment fixer une limite ?', 'Que signifient les alertes ?', 'Comment modifier un budget ?']);
    expect(libelles('objectifs')).toEqual(['Comment créer un objectif ?', 'Comment ajouter un versement ?', 'Comment est calculée la progression ?']);
    expect(libelles('parametres')).toEqual(['Comment sauvegarder mes données ?', 'Où sont enregistrées mes données ?', 'Comment supprimer mes données ?']);
    expect(QUESTIONS_PAR_PAGE.autre).toBeUndefined();
  });

  it('reconnaît la page ouverte', () => {
    expect(pageDe('/compte')).toBe('compte');
    expect(pageDe('/depenses')).toBe('depenses');
    expect(pageDe('/budgets/')).toBe('budgets');
    expect(pageDe('/objectifs')).toBe('objectifs');
    expect(pageDe('/parametres')).toBe('parametres');
    expect(pageDe('/')).toBe('autre');
  });
});

describe('Poksy : recherche par mots-clés', () => {
  it('chaque question proposée, écrite à la main, retrouve sa propre réponse', () => {
    const toutes = [
      ...QUESTIONS_RAPIDES.map((q) => ({ ...q, page: 'autre' as PageKey })),
      ...RUBRIQUES.flatMap((r) => r.questions.map((q) => ({ ...q, page: 'autre' as PageKey }))),
      ...Object.entries(QUESTIONS_PAR_PAGE).flatMap(([page, qs]) => qs!.map((q) => ({ ...q, page: page as PageKey }))),
    ];
    for (const q of toutes) expect(rechercher(q.libelle, q.page).fiche?.id, q.libelle).toBe(q.id);
  });

  it('reconnaît les mots importants', () => {
    const attendus: [string, string][] = [
      ['dépense', 'ajouter-depense'],
      ['revenu', 'ajouter-revenu'],
      ['solde', 'ajuster-solde'],
      ['épargne', 'creer-objectif'],
      ['banque', 'banque-acces'],
      ['sauvegarde', 'sauvegarder'],
      ['objectif', 'creer-objectif'],
      ['simulateur', 'simulateur-but'],
      ['charge fixe', 'charge-fixe'],
      ['carte restaurant', 'carte-restaurant'],
      ['confidentialité', 'donnees-ou'],
      ['Mes Dépenses', 'ajouter-depense'],
      ['CARTE RESTO', 'carte-restaurant'],
      ['ajustement', 'ajustement-quoi'],
      ['comment passer en mode sombre', 'mode-sombre'],
      ['je veux changer de téléphone', 'changer-appareil'],
      ['combien il me reste ce mois-ci', 'reste-a-vivre'],
      ['comment installer l’appli', 'installer'],
    ];
    for (const [question, id] of attendus) expect(rechercher(question).fiche?.id, question).toBe(id);
  });

  it('la page ouverte départage les réponses proches', () => {
    expect(rechercher('modifier', 'budgets').fiche?.id).toBe('modifier-operation');
    expect(rechercher('comment modifier un budget', 'budgets').fiche?.id).toBe('modifier-budget');
  });

  it('sans réponse précise : rien n’est inventé', () => {
    expect(rechercher('quelle météo demain').fiche).toBeNull();
    expect(rechercher('').fiche).toBeNull();
    expect(rechercher('?!').fiche).toBeNull();
  });

  it('« Puis-je acheter cet article ? » : Poksy ne décide pas à votre place', () => {
    const f = rechercher('Puis-je acheter cet article ?').fiche!;
    expect(rep(f)).toBe(
      'Poksy ne peut pas décider à votre place. Utilisez le simulateur d’achat pour voir l’impact sur votre solde, votre disponible quotidien et votre objectif d’épargne. Le résultat reste une indication budgétaire.',
    );
    expect(f.action).toBe('simulateur');
  });

  it('données bancaires : jamais demandées, et un numéro saisi par erreur est masqué', () => {
    expect(rechercher('voici mon mot de passe').fiche?.id).toBe('securite');
    expect(rechercher('mon code pin').fiche?.id).toBe('securite');
    expect(rechercher('4970 1012 3456 7890').fiche?.id).toBe('securite');
    expect(rechercher('FR76 3000 6000 0112 3456 7890 189').fiche?.id).toBe('securite');
    expect(masquerNumeros('ma carte 4970 1012 3456 7890 merci')).toBe('ma carte •••• merci');
    expect(masquerNumeros('loyer de 650 €')).toBe('loyer de 650 €');
  });

  it('pas de conseil en placement ou en crédit', () => {
    for (const q of ['dois-je investir en bourse', 'je veux un crédit', 'un bon placement ?']) expect(rechercher(q).fiche?.id, q).toBe('conseil');
  });

  it('normalisation : sans accents ni majuscules', () => {
    expect(normaliser('Où sont enregistrées MES données ?')).toBe('ou sont enregistrees mes donnees');
  });
});

describe('Poksy : réponses', () => {
  it('exemples demandés, mot pour mot', () => {
    expect(rep(fiche('ajouter-depense'))).toContain(
      'Appuyez sur le bouton « + », saisissez le montant, choisissez une catégorie puis validez.',
    );
    expect(rep(fiche('fixe-variable'))).toBe(
      'Une charge fixe revient régulièrement avec un montant généralement prévisible, comme le loyer ou un abonnement. Une dépense variable peut changer chaque mois, comme les courses, le carburant ou les loisirs.',
    );
    expect(rep(fiche('ajuster-solde'))).toBe(
      'Ouvrez la page « Mon compte », puis appuyez sur « Ajuster le solde ». Indiquez le montant réellement affiché par votre banque. SoldeClair enregistre une correction datée sans supprimer vos anciennes opérations.',
    );
    expect(rep(fiche('donnees-ou'))).toBe(
      'Vos données sont enregistrées uniquement dans le navigateur de l’appareil utilisé. Elles ne sont pas envoyées à une banque ni stockées dans un compte SoldeClair. Pensez à exporter régulièrement une sauvegarde.',
    );
    expect(rep(fiche('reste-a-vivre'))).toContain('Appuyez sur « Comment est-ce calculé ? » dans le tableau de bord');
  });

  it('les chiffres réels complètent la réponse, sans jamais être inventés', () => {
    expect(rep(fiche('reste-a-vivre'), CONTEXTE_COMPLET)).toContain('Aujourd’hui, il vous reste 1 407 €.');
    expect(rep(fiche('reste-a-vivre'), { resteAVivre: '− 52 €', resteNegatif: true })).toContain('votre solde est de − 52 €');
    expect(rep(fiche('reste-a-vivre'), {})).not.toContain('Aujourd’hui, il vous reste');
    expect(rep(fiche('par-jour'), CONTEXTE_COMPLET)).toContain('environ 74 € par jour pendant 19 jours');
    expect(rep(fiche('solde-banque'), CONTEXTE_COMPLET)).toContain('Aucun solde réel n’a encore été indiqué.');
    expect(rep(fiche('solde-banque'), { ajustementFait: true })).not.toContain('Aucun solde réel');
  });

  it('de une à quatre phrases, en français simple', () => {
    for (const f of FICHES) {
      for (const ctx of [{}, CONTEXTE_COMPLET]) {
        const n = phrases(reponseDe(f, ctx)).length;
        expect(n, `${f.id} : ${n} phrases`).toBeGreaterThanOrEqual(1);
        expect(n, `${f.id} : ${n} phrases`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('jamais culpabilisante, jamais de conseil financier, jamais de prétention à être une IA', () => {
    const interdits = [
      /gérez mal/i,
      /ne devriez jamais/i,
      /vous devez investir/i,
      /prenez un crédit/i,
      /situation est mauvaise/i,
      /je suis une (intelligence artificielle|IA)/i,
      /\bje suis (une banque|un conseiller|un comptable)/i,
    ];
    for (const f of FICHES) for (const motif of interdits) expect(rep(f, CONTEXTE_COMPLET), f.id).not.toMatch(motif);
    expect(rep(fiche('qui-es-tu'))).toContain('je ne suis pas une intelligence artificielle');
  });

  it('ne demande jamais de données bancaires', () => {
    for (const f of FICHES) {
      for (const p of phrases(reponseDe(f))) {
        if (/mot de passe|numéro de carte|code|identifiant|coordonnées bancaires/i.test(p)) expect(p, f.id).toMatch(/jamais|\bne\b|\bn’/i);
      }
    }
  });

  it('typographie française à l’affichage', () => {
    expect(typographie('Que souhaitez-vous savoir ?')).toBe('Que souhaitez-vous savoir ?');
    expect(typographie('« Mon compte »')).toBe('« Mon compte »');
  });
});
