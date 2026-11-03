import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { Income, SavingsGoal, SavingsSupport, SupportKind, TemporaryHold } from '../types';
import {
  MODELES_SUPPORT,
  objectifPrincipal,
  projection,
  revenusAttendus,
  soldeSupport,
  sommesBloquees,
  supportDisponible,
  totauxEpargne,
  budgetCourant,
  age,
} from '../lib/plan';
import { REVENUS_ATTENDUS_SUGGERES, dateSuggeree, reperesPourVous, slug, supportsSuggeres, type SuggestionRevenu } from '../lib/profil';
import { addMonths, formatDate, monthLabel, monthLabelShort, monthOf } from '../lib/dates';
import { isCarteRestaurant } from '../lib/budget';
import { centsToInput, sum } from '../lib/money';
import { newId } from '../lib/id';
import {
  Button,
  Card,
  CheckboxField,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Modal,
  MoneyField,
  Notice,
  PageHeader,
  ProgressBar,
  SelectField,
  Stat,
} from '../components/ui';
import { GoalForm, HoldForm, IncomeForm, SupportForm, checkAmount } from '../components/forms';
import { Icon } from '../components/Icon';

type Edition =
  | { type: 'objectif'; initial?: SavingsGoal }
  | { type: 'support'; initial?: SavingsSupport; kind?: SupportKind }
  | { type: 'blocage'; initial?: TemporaryHold }
  | { type: 'attendu'; initial?: Income; suggestion?: SuggestionRevenu }
  | { type: 'recu'; initial: Income }
  | { type: 'bilan' };

/** Page « Mon plan d'épargne » : objectif, supports, projection mois par mois, revenus attendus, bilan du mois. */
export function Plan() {
  const { data, today, fmt, dispatch, notify } = useApp();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [aSupprimer, setASupprimer] = useState<{ collection: 'supports' | 'holds' | 'incomes'; id: string; nom: string } | null>(null);
  const [optimiste, setOptimiste] = useState(false);
  const fermer = () => setEdition(null);

  // Liens depuis les repères ou Poksy : « /plan?attendu=13e-mois », « /plan?support=livret-jeune », « /plan?bilan=1 »
  const [params, setParams] = useSearchParams();
  const type = data.profile?.type ?? 'autre';
  useEffect(() => {
    const attendu = params.get('attendu');
    const support = params.get('support');
    if (attendu) {
      const toutes = Object.values(REVENUS_ATTENDUS_SUGGERES).flat();
      setEdition({ type: 'attendu', suggestion: toutes.find((s) => slug(s.nom) === attendu) });
    } else if (support && support in MODELES_SUPPORT) {
      setEdition({ type: 'support', kind: support as SupportKind });
    } else if (params.get('bilan') === '1') {
      setEdition({ type: 'bilan' });
    } else return;
    setParams({}, { replace: true });
  }, [params, setParams]);

  const objectif = objectifPrincipal(data, today);
  const p = useMemo(() => (objectif ? projection(data, objectif, today) : null), [data, objectif, today]);
  const totaux = totauxEpargne(data, today);
  const supports = data.supports ?? [];
  const attendus = revenusAttendus(data).sort((a, b) => a.date.localeCompare(b.date));
  const blocages = (data.holds ?? []).slice().sort((a, b) => a.start.localeCompare(b.start));
  const bloquesMaintenant = sum(sommesBloquees(data, today).map((h) => h.amount));
  const reperes = reperesPourVous(data, today);
  const ageAnnees = age(data.profile?.birthDate, today);
  const supportsProposes = supportsSuggeres(type, ageAnnees).filter((k) => !supports.some((s) => s.kind === k));
  const attendusProposes = REVENUS_ATTENDUS_SUGGERES[type].filter((s) => !attendus.some((i) => slug(i.name) === slug(s.nom)));
  const avecTitres = Boolean(p?.lignes.some((l) => l.avantages > 0));
  const signe = (c: number) => (c < 0 ? `− ${fmt(-c)}` : `+ ${fmt(c)}`);

  const basculerOptimiste = (i: Income) => {
    dispatch({ type: 'upsert', collection: 'incomes', item: { ...i, inOptimistic: !i.inOptimistic } });
  };
  const basculerRendu = (h: TemporaryHold) => {
    dispatch({ type: 'upsert', collection: 'holds', item: { ...h, returned: !h.returned } });
    notify(h.returned ? `${h.label} : de nouveau bloqué.` : `${h.label} : somme rendue, de nouveau disponible.`);
  };

  return (
    <div className="page page-plan">
      <PageHeader
        title="Mon plan d’épargne"
        description="Ton objectif et ta projection, mois par mois."
        actions={
          <Button variant="primaire" icon="check" onClick={() => setEdition({ type: 'bilan' })}>
            Faire le bilan du mois
          </Button>
        }
      />

      {/* 1. Objectif */}
      {objectif && p ? (
        <Card
          className="plan-objectif"
          title={objectif.name}
          actions={
            <IconButton
              icon="edit"
              label={`Modifier l’objectif ${objectif.name}`}
              onClick={() => setEdition({ type: 'objectif', initial: objectif })}
            />
          }
        >
          <p className="plan-objectif-phrase">
            <strong className="valeur montant-epargne">{fmt(p.progression.current)}</strong> sur {fmt(objectif.target)}
            {objectif.targetDate && <> d’ici le {formatDate(objectif.targetDate, true)}</>}
            {objectif.supportIds?.length ? ' (tous supports confondus)' : ''}.
          </p>
          <ProgressBar
            value={p.progression.current}
            max={objectif.target}
            level="objectif"
            label={`Avancement de l’objectif ${objectif.name}`}
            valueText={`${Math.round(p.progression.pct)} %, ${fmt(p.progression.current)} sur ${fmt(objectif.target)}`}
          />
          <div className="stats-grid plan-stats">
            <Stat label="Avancement" value={`${Math.round(p.progression.pct)} %`} />
            <Stat label="Reste à réunir" value={fmt(p.progression.remaining)} />
            <Stat label="Mois restants" value={String(p.moisRestants)} detail="mois en cours compris" />
            <Stat label="À épargner par mois" value={fmt(p.necessaireParMois)} tone="epargne" detail="recalculé chaque jour" />
          </div>
          {p.progression.reached ? (
            <Notice tone="succes">Objectif atteint, bravo !</Notice>
          ) : p.dansLesTemps ? (
            <Notice tone="succes">
              Dans les temps : la projection prévoit {fmt(p.finale)} à la date visée ({signe(p.ecart)}).
            </Notice>
          ) : (
            <Notice tone="attention">
              En retard : la projection prévoit {fmt(p.finale)} à la date visée, soit {fmt(-p.ecart)} de moins que l’objectif.
              {p.ecartOptimiste >= 0
                ? ` Avec les revenus attendus cochés, tu l’atteindrais (${fmt(p.finaleOptimiste)}).`
                : ` Même avec les revenus attendus cochés : ${fmt(p.finaleOptimiste)}.`}
            </Notice>
          )}
        </Card>
      ) : (
        <Card title="Ton objectif">
          <EmptyState
            title="Pas encore d’objectif daté"
            action={
              <Button variant="primaire" icon="plus" onClick={() => setEdition({ type: 'objectif' })}>
                Créer mon objectif
              </Button>
            }
          >
            Un montant et une date. SoldeClair calcule l’effort par mois.
          </EmptyState>
        </Card>
      )}

      {/* 2. Repères selon le profil */}
      {reperes.length > 0 && (
        <Card title="Repères pour toi" className="plan-reperes">
          <ul className="reperes">
            {reperes.map((r) => (
              <li key={r.id} className="repere">
                <p className="repere-titre">{r.titre}</p>
                <p className="repere-texte">{r.texte}</p>
                {r.lien && (
                  <Link to={r.lien.to} className="link">
                    {r.lien.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 3. Supports d'épargne */}
      <Card
        title="Mes supports d’épargne"
        actions={
          <Button icon="plus" className="btn-small" onClick={() => setEdition({ type: 'support' })}>
            Ajouter un support
          </Button>
        }
      >
        <div className="stats-grid stats-trio">
          <Stat label="Épargne totale" value={fmt(totaux.totale)} tone="epargne" detail="tous supports confondus" />
          <Stat label="Épargne disponible" value={fmt(totaux.disponible)} detail="retirable tout de suite" />
          <Stat
            label="Épargne bloquée"
            value={fmt(totaux.bloquee)}
            detail={
              supports
                .filter((s) => !supportDisponible(s, today))
                .map((s) => s.name)
                .join(', ') || 'aucun support bloqué'
            }
          />
        </div>
        {supports.length === 0 ? (
          <p className="muted">Ajoute tes livrets et ton épargne. Tu vois le total et le disponible.</p>
        ) : (
          <ul className="supports">
            {supports.map((s) => {
              const solde = soldeSupport(data, s, today);
              const dispo = supportDisponible(s, today);
              return (
                <li key={s.id} className="support">
                  <div className="support-tete">
                    <p className="support-nom">{s.name}</p>
                    <p className="support-solde montant-epargne">{fmt(solde)}</p>
                  </div>
                  <p className="support-infos">
                    {s.rate > 0 && <span>{s.rate.toLocaleString('fr-FR')} % par an</span>}
                    <span className={`tag ${dispo ? 'tag-ok' : 'tag-alerte'}`}>
                      {dispo ? 'Disponible' : s.blockedUntil ? `Bloqué jusqu’au ${formatDate(s.blockedUntil)}` : 'Bloqué'}
                    </span>
                    {s.withdrawalCloses && <span className="tag">Retrait = clôture</span>}
                  </p>
                  {s.target !== null && s.target > 0 && (
                    <div className="support-cible">
                      <ProgressBar
                        value={solde}
                        max={s.target}
                        level="objectif"
                        label={`Répartition visée sur ${s.name}`}
                        valueText={`${fmt(solde)} sur ${fmt(s.target)} visés`}
                      />
                      <p className="muted petit">
                        {solde >= s.target ? 'Montant visé atteint' : `${fmt(s.target - solde)} à verser pour atteindre ${fmt(s.target)}`}
                        {s.ceiling ? ` (plafond ${fmt(s.ceiling)})` : ''}
                      </p>
                    </div>
                  )}
                  <div className="support-actions">
                    <IconButton icon="edit" label={`Modifier ${s.name}`} onClick={() => setEdition({ type: 'support', initial: s })} />
                    <IconButton
                      icon="trash"
                      label={`Supprimer ${s.name}`}
                      onClick={() => setASupprimer({ collection: 'supports', id: s.id, nom: s.name })}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {supportsProposes.length > 0 && (
          <div className="chips" role="group" aria-label="Supports suggérés pour ton profil">
            <span className="chips-titre">Suggérés pour toi :</span>
            {supportsProposes.map((k) => (
              <button type="button" key={k} className="chip chip-petit" onClick={() => setEdition({ type: 'support', kind: k })}>
                + {MODELES_SUPPORT[k].label}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Projection mois par mois */}
      {p && p.lignes.length > 0 && (
        <Card title="Projection mois par mois">
          <CheckboxField
            label="Inclure les revenus attendus (projection optimiste)"
            checked={optimiste}
            onChange={(e) => setOptimiste(e.target.checked)}
            hint="Ajoute les revenus attendus cochés plus bas."
          />
          {/* Téléphone : un mois par ligne, détail dépliable */}
          <p className="projection-entete" aria-hidden="true">
            <span>Mois</span>
            <span>Épargne du mois</span>
            <span>Cumul</span>
          </p>
          <ul className="projection-mobile" aria-label="Projection mois par mois : épargne du mois et cumul">
            {p.lignes.map((l) => {
              const cumul = optimiste ? l.cumulOptimiste : l.cumul;
              const epargne = l.epargne + (optimiste ? l.attendus : 0);
              return (
                <li key={l.mois} className={l.mois === monthOf(today) ? 'ligne-courante' : undefined}>
                  <details>
                    <summary>
                      <span className="projection-mois">
                        {monthLabel(l.mois)}
                        {l.mois === monthOf(today) && <span className="sr-only"> (mois en cours)</span>}
                      </span>
                      <span className={`num ${epargne < 0 ? 'montant-moins' : 'montant-epargne'}`}>{signe(epargne)}</span>
                      <span className={`num projection-cumul ${objectif && cumul >= objectif.target ? 'montant-plus' : ''}`}>{fmt(cumul)}</span>
                    </summary>
                    <dl className="calcul projection-detail">
                      <div>
                        <dt>+ Revenus encaissés</dt>
                        <dd>{fmt(l.revenus + (optimiste ? l.attendus : 0))}</dd>
                      </div>
                      <div>
                        <dt>− Charges fixes</dt>
                        <dd>{fmt(l.charges)}</dd>
                      </div>
                      <div>
                        <dt>− Dépenses courantes</dt>
                        <dd>{fmt(l.courantes)}</dd>
                      </div>
                      {l.exceptionnelles > 0 && (
                        <div>
                          <dt>− Dépenses exceptionnelles</dt>
                          <dd>{fmt(l.exceptionnelles)}</dd>
                        </div>
                      )}
                      {l.avantages > 0 && (
                        <div>
                          <dt>Titres-restaurant (à part)</dt>
                          <dd>{fmt(l.avantages)}</dd>
                        </div>
                      )}
                    </dl>
                    {l.notes.length > 0 && <p className="muted petit">{l.notes.join(' ; ')}</p>}
                  </details>
                </li>
              );
            })}
          </ul>
          {/* Ordinateur et tablette : tableau complet */}
          <div className="table-scroll projection-tableau" tabIndex={0} role="region" aria-label="Projection mois par mois (tableau)">
            <table className="table table-projection">
              <caption className="sr-only">
                Projection de l’épargne de {monthLabel(p.lignes[0].mois)} à {monthLabel(p.lignes[p.lignes.length - 1].mois)}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Mois</th>
                  <th scope="col" className="num">
                    Revenus
                  </th>
                  {avecTitres && (
                    <th scope="col" className="num">
                      Titres-resto
                    </th>
                  )}
                  <th scope="col" className="num">
                    Charges
                  </th>
                  <th scope="col" className="num">
                    Dépenses
                  </th>
                  <th scope="col" className="num">
                    Épargne
                  </th>
                  <th scope="col" className="num">
                    Cumul
                  </th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {p.lignes.map((l) => {
                  const cumul = optimiste ? l.cumulOptimiste : l.cumul;
                  const epargne = l.epargne + (optimiste ? l.attendus : 0);
                  return (
                    <tr key={l.mois} className={l.mois === monthOf(today) ? 'ligne-courante' : undefined}>
                      <th scope="row">
                        {monthLabelShort(l.mois)}
                        {l.mois === monthOf(today) && <span className="sr-only"> (mois en cours)</span>}
                      </th>
                      <td className="num">{fmt(l.revenus + (optimiste ? l.attendus : 0))}</td>
                      {avecTitres && <td className="num muted">{fmt(l.avantages)}</td>}
                      <td className="num">{fmt(l.charges)}</td>
                      <td className="num">
                        {fmt(l.courantes + l.exceptionnelles)}
                        {l.exceptionnelles > 0 && <span className="cellule-detail">dont {fmt(l.exceptionnelles)} exceptionnelles</span>}
                      </td>
                      <td className={`num ${epargne < 0 ? 'montant-moins' : 'montant-epargne'}`}>{signe(epargne)}</td>
                      <td className={`num ${objectif && cumul >= objectif.target ? 'montant-plus' : ''}`}>{fmt(cumul)}</td>
                      <td className="cellule-notes">{l.notes.length > 0 ? l.notes.join(' ; ') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="field-hint">
            De demain jusqu’à la date visée, avec les vraies dates des opérations. Dépenses courantes : ton budget de {fmt(budgetCourant(data))} par
            mois (pour ce mois-ci, ce qu’il en reste). Les titres-restaurant sont du pouvoir d’achat alimentaire : ils ne sont pas comptés dans les
            revenus encaissés. Les sommes bloquées (caution) ne sont pas des dépenses.
          </p>
        </Card>
      )}

      {/* 5. Revenus attendus */}
      <Card
        title="Revenus attendus"
        actions={
          <Button icon="plus" className="btn-small" onClick={() => setEdition({ type: 'attendu' })}>
            Ajouter
          </Button>
        }
      >
        <p className="muted">Primes, 13e mois, solde de tout compte… Pas comptés avant confirmation.</p>
        {attendus.length > 0 && (
          <ul className="attendus">
            {attendus.map((i) => (
              <li key={i.id} className="attendu">
                <div className="attendu-tete">
                  <p className="attendu-nom">{i.name}</p>
                  <p className="attendu-montant">
                    {i.amountUnknown ? 'Montant inconnu' : i.amountMax ? `${fmt(i.amount)} à ${fmt(i.amountMax)}` : fmt(i.amount)}
                  </p>
                </div>
                <p className="muted petit">Prévu vers {monthLabel(monthOf(i.date))}</p>
                <CheckboxField label="Inclure dans la projection optimiste" checked={Boolean(i.inOptimistic)} onChange={() => basculerOptimiste(i)} />
                <div className="attendu-actions">
                  <Button className="btn-small" icon="check" onClick={() => setEdition({ type: 'recu', initial: i })}>
                    Reçu
                  </Button>
                  <IconButton icon="edit" label={`Modifier ${i.name}`} onClick={() => setEdition({ type: 'attendu', initial: i })} />
                  <IconButton
                    icon="trash"
                    label={`Supprimer ${i.name}`}
                    onClick={() => setASupprimer({ collection: 'incomes', id: i.id, nom: i.name })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {attendusProposes.length > 0 && (
          <div className="chips" role="group" aria-label="Revenus attendus fréquents pour ton profil">
            <span className="chips-titre">Fréquents pour toi :</span>
            {attendusProposes.map((s) => (
              <button
                type="button"
                key={s.nom}
                className="chip chip-petit"
                title={s.aide}
                onClick={() => setEdition({ type: 'attendu', suggestion: s })}
              >
                + {s.nom}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 6. Sommes bloquées */}
      <Card
        title="Sommes bloquées temporairement"
        actions={
          <Button icon="plus" className="btn-small" onClick={() => setEdition({ type: 'blocage' })}>
            Ajouter
          </Button>
        }
      >
        <p className="muted">
          Caution, dépôt de garantie… Ce n’est pas une dépense : l’argent revient ensuite.
          {bloquesMaintenant > 0 && <> Bloqué en ce moment : {fmt(bloquesMaintenant)}.</>}
        </p>
        {blocages.length > 0 && (
          <ul className="blocages">
            {blocages.map((h) => (
              <li key={h.id} className={`blocage ${h.returned ? 'blocage-rendu' : ''}`}>
                <div>
                  <p className="blocage-nom">
                    {h.label} : {fmt(h.amount)}
                  </p>
                  <p className="muted petit">{h.returned ? 'Rendu' : `Bloqué du ${formatDate(h.start)}${h.end ? ` au ${formatDate(h.end)}` : ''}`}</p>
                </div>
                <div className="attendu-actions">
                  <Button className="btn-small" variant="secondaire" onClick={() => basculerRendu(h)}>
                    {h.returned ? 'Annuler « rendu »' : 'Rendu'}
                  </Button>
                  <IconButton icon="edit" label={`Modifier ${h.label}`} onClick={() => setEdition({ type: 'blocage', initial: h })} />
                  <IconButton
                    icon="trash"
                    label={`Supprimer ${h.label}`}
                    onClick={() => setASupprimer({ collection: 'holds', id: h.id, nom: h.label })}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {edition?.type === 'objectif' && (
        <Modal title={edition.initial ? 'Modifier l’objectif' : 'Nouvel objectif'} onClose={fermer}>
          <GoalForm initial={edition.initial} onDone={fermer} onCancel={fermer} />
        </Modal>
      )}
      {edition?.type === 'support' && (
        <Modal title={edition.initial ? `Modifier ${edition.initial.name}` : 'Nouveau support d’épargne'} onClose={fermer}>
          <SupportForm initial={edition.initial} kindPropose={edition.kind} onDone={fermer} onCancel={fermer} />
        </Modal>
      )}
      {edition?.type === 'blocage' && (
        <Modal title={edition.initial ? 'Modifier la somme bloquée' : 'Nouvelle somme bloquée'} onClose={fermer}>
          <HoldForm initial={edition.initial} defaultDate={today} onDone={fermer} onCancel={fermer} />
        </Modal>
      )}
      {edition?.type === 'attendu' && (
        <Modal title={edition.initial ? 'Modifier le revenu attendu' : 'Nouveau revenu attendu'} onClose={fermer}>
          {edition.suggestion && <p className="field-hint">{edition.suggestion.aide}</p>}
          <IncomeForm
            initial={edition.initial}
            certitudeParDefaut="attendu"
            nomPropose={edition.suggestion?.nom}
            defaultDate={edition.suggestion ? dateSuggeree(edition.suggestion, today) : today}
            onDone={fermer}
            onCancel={fermer}
          />
        </Modal>
      )}
      {edition?.type === 'recu' && (
        <Modal title={`${edition.initial.name} reçu`} onClose={fermer}>
          <p className="field-hint">Indique le montant réellement reçu : il sera compté dans ton budget et ton solde.</p>
          <IncomeForm initial={edition.initial} confirmerReception defaultDate={today} onDone={fermer} onCancel={fermer} />
        </Modal>
      )}
      {edition?.type === 'bilan' && (
        <Modal title="Bilan du mois" onClose={fermer}>
          <BilanDuMois necessaire={p?.necessaireParMois ?? data.profile?.monthlySavingsTarget ?? 0} onDone={fermer} onCancel={fermer} />
        </Modal>
      )}
      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.nom} » ?`}
          confirmLabel="Supprimer"
          danger
          message="Cette action ne peut pas être annulée."
          onConfirm={() => {
            dispatch({ type: 'remove', collection: aSupprimer.collection, id: aSupprimer.id });
            notify(`« ${aSupprimer.nom} » supprimé.`);
            setASupprimer(null);
          }}
          onCancel={() => setASupprimer(null)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bilan du mois guidé : prévu / réel, crée seulement ce qui manque            */
/* -------------------------------------------------------------------------- */

function BilanDuMois({ necessaire, onDone, onCancel }: { necessaire: number; onDone: () => void; onCancel: () => void }) {
  const { data, today, fmt, dispatch, notify } = useApp();
  // Début de mois : on fait plutôt le bilan du mois qui vient de se terminer
  const moisParDefaut = Number(today.slice(8, 10)) <= 10 ? addMonths(monthOf(today), -1) : monthOf(today);
  const [mois, setMois] = useState(moisParDefaut);
  const dateDuBilan =
    mois === monthOf(today) ? today : `${mois}-${String(new Date(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 0).getDate()).padStart(2, '0')}`;
  const supports = data.supports ?? [];

  const epargneEnregistree = sum(data.savings.filter((s) => monthOf(s.date) === mois).map((s) => s.amount));
  const depensesEnregistrees = sum(
    data.expenses.filter((e) => monthOf(e.date) === mois && !e.exceptional && !isCarteRestaurant(e.paymentMethod)).map((e) => e.amount),
  );
  const budget = budgetCourant(data);
  const attendusDuMois = revenusAttendus(data).filter((i) => monthOf(i.date) <= mois);

  const [epargneReelle, setEpargneReelle] = useState(centsToInput(epargneEnregistree));
  const [support, setSupport] = useState(supports.find((s) => s.kind === 'livret-a')?.id ?? supports[0]?.id ?? '');
  const [depensesReelles, setDepensesReelles] = useState(centsToInput(depensesEnregistrees));
  const [recus, setRecus] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);

  const valider = (e: FormEvent) => {
    e.preventDefault();
    const [ep, epErr] = checkAmount(epargneReelle, { allowZero: true, required: false });
    const [dep, depErr] = checkAmount(depensesReelles, { allowZero: true, required: false });
    const montantsRecus = Object.entries(recus)
      .filter(([, v]) => v.trim())
      .map(([id, v]) => [id, checkAmount(v)] as const);
    const errRecu = montantsRecus.find(([, [, err]]) => err);
    const message = epErr ?? depErr ?? (errRecu ? `Revenu reçu : ${errRecu[1][1]}` : null);
    setErreur(message);
    if (message || ep === null || dep === null) return;

    const faits: string[] = [];
    // Épargne : seulement le complément non encore enregistré
    const manqueEpargne = ep - epargneEnregistree;
    if (manqueEpargne > 0) {
      const objectif = objectifPrincipal(data, today);
      dispatch({
        type: 'upsert',
        collection: 'savings',
        item: {
          id: newId('epa'),
          goalId: objectif?.id ?? null,
          amount: manqueEpargne,
          date: dateDuBilan,
          note: `Bilan de ${monthLabel(mois)}`,
          ...(support ? { supportId: support } : {}),
        },
      });
      faits.push(`versement de ${fmt(manqueEpargne)}`);
    }
    // Dépenses : une ligne « Autres dépenses du mois » pour ce qui n'a pas été saisi
    const manqueDepenses = dep - depensesEnregistrees;
    if (manqueDepenses > 0) {
      const cat =
        data.categories.find((c) => c.kind === 'variable' && /divers|autre/i.test(c.name)) ?? data.categories.find((c) => c.kind === 'variable');
      if (cat) {
        dispatch({
          type: 'upsert',
          collection: 'expenses',
          item: {
            id: newId('dep'),
            amount: manqueDepenses,
            categoryId: cat.id,
            date: dateDuBilan,
            description: `Autres dépenses de ${monthLabel(mois, false)}`,
            paymentMethod: '',
          },
        });
        faits.push(`dépenses non saisies de ${fmt(manqueDepenses)}`);
      }
    }
    // Revenus attendus reçus : ils deviennent sûrs, au montant réel
    for (const [id, [cents]] of montantsRecus) {
      const inc = data.incomes.find((i) => i.id === id);
      if (!inc || cents === null) continue;
      const { certitude: _c, amountMax: _m, amountUnknown: _u, inOptimistic: _o, ...reste } = inc;
      dispatch({ type: 'upsert', collection: 'incomes', item: { ...reste, amount: cents, date: inc.date > dateDuBilan ? dateDuBilan : inc.date } });
      faits.push(`${inc.name} reçu (${fmt(cents)})`);
    }
    notify(
      faits.length > 0 ? `Bilan de ${monthLabel(mois)} enregistré : ${faits.join(', ')}.` : `Bilan de ${monthLabel(mois)} : tout était déjà à jour.`,
    );
    onDone();
  };

  const moisPossibles = [addMonths(monthOf(today), -2), addMonths(monthOf(today), -1), monthOf(today)];
  return (
    <form onSubmit={valider} noValidate className="form bilan">
      <SelectField label="Mois du bilan" value={mois} onChange={(e) => setMois(e.target.value)}>
        {moisPossibles.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </SelectField>
      <p className="field-hint">Compare le prévu et le réel. SoldeClair n’ajoute que ce qui manque : rien n’est compté deux fois.</p>

      <fieldset className="fieldset">
        <legend>Épargne</legend>
        <p className="bilan-comparaison">
          Prévu : <strong>{fmt(necessaire)}</strong> – déjà enregistré : <strong>{fmt(epargneEnregistree)}</strong>
        </p>
        <div className="form-grid">
          <MoneyField label="Épargné réellement ce mois-ci (total)" value={epargneReelle} onChange={(e) => setEpargneReelle(e.target.value)} />
          {supports.length > 0 && (
            <SelectField label="Versé sur" value={support} onChange={(e) => setSupport(e.target.value)}>
              <option value="">Non précisé</option>
              {supports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          )}
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Dépenses courantes</legend>
        <p className="bilan-comparaison">
          Budget : <strong>{fmt(budget)}</strong> – déjà saisi : <strong>{fmt(depensesEnregistrees)}</strong>
        </p>
        <MoneyField
          label="Dépensé réellement (total, hors dépenses exceptionnelles)"
          value={depensesReelles}
          onChange={(e) => setDepensesReelles(e.target.value)}
          hint="L’écart va dans « Autres dépenses du mois »."
        />
      </fieldset>

      {attendusDuMois.length > 0 && (
        <fieldset className="fieldset">
          <legend>Revenus attendus</legend>
          <p className="field-hint">Indique le montant reçu ; laisse vide s’il n’est pas encore arrivé.</p>
          <div className="form-grid">
            {attendusDuMois.map((i) => (
              <MoneyField
                key={i.id}
                label={`${i.name} reçu`}
                optional
                value={recus[i.id] ?? ''}
                onChange={(e) => setRecus({ ...recus, [i.id]: e.target.value })}
                hint={
                  i.amountUnknown ? 'Montant inconnu jusqu’ici' : `Prévu : ${i.amountMax ? `${fmt(i.amount)} à ${fmt(i.amountMax)}` : fmt(i.amount)}`
                }
              />
            ))}
          </div>
        </fieldset>
      )}

      {erreur && (
        <p className="field-error" role="alert">
          <Icon name="alert" size={16} /> {erreur}
        </p>
      )}
      <div className="form-actions">
        <Button variant="secondaire" onClick={onCancel}>
          Annuler
        </Button>
        <button type="submit" className="btn btn-primaire">
          <span>Enregistrer le bilan</span>
        </button>
      </div>
    </form>
  );
}
