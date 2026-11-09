import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DemanderPoksy } from '../components/poksy/DemanderPoksy';
import { sommesBloquees } from '../lib/plan';
import { useApp } from '../state/AppState';
import type { AccountId, Transaction } from '../types';
import { accountBalance, ACCOUNT_LABELS, comptesUtilises, operationsAVenir, releve, totaux, type FiltreCompte } from '../lib/accounts';
import { earliestDate, signedAmount } from '../lib/budget';
import { addDays, addMonths, dayHeader, firstDay, monthLabel, monthOf, ofMonth, relativeDay } from '../lib/dates';
import { centsToInput, parseAmount, sum } from '../lib/money';
import { newId } from '../lib/id';
import {
  Button,
  CheckboxField,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Modal,
  MoneyField,
  PageHeader,
  SignedAmount,
  TextField,
} from '../components/ui';
import { Icon } from '../components/Icon';
import { MontantAnime } from '../components/mouvement';

type Vue = 'operations' | 'a-venir';

const ICONES: Record<Transaction['type'], string> = {
  revenu: 'income',
  depense: 'expense',
  charge: 'calendar',
  epargne: 'piggy',
  ajustement: 'edit',
};

/** Détail d'une opération : catégorie, moyen de paiement, compte (séparés par un tiret). */
function details(t: Transaction, avecCompte: boolean): string {
  const morceaux = [
    t.type === 'epargne'
      ? 'Vers l’épargne'
      : t.type === 'ajustement'
        ? t.label === 'Recharge Izly'
          ? t.amount < 0
            ? 'Vers Izly'
            : 'Depuis le compte bancaire'
          : 'Correction du solde'
        : t.categoryName,
  ];
  if (t.paymentMethod) morceaux.push(t.paymentMethod);
  if (t.type === 'charge') morceaux.push('Prélèvement');
  // Le compte n'est précisé que s'il n'est pas déjà évident (pas de « Carte restaurant – Carte restaurant »)
  const compte = ACCOUNT_LABELS[t.account];
  if (avecCompte && !morceaux.some((m) => m.toLocaleLowerCase('fr') === compte.toLocaleLowerCase('fr'))) morceaux.push(compte);
  return morceaux.join(' – ');
}

/** Pastille ronde : verte pour l'argent qui entre, rouge pour l'argent qui sort, bleue pour l'épargne ; le pictogramme indique le type. */
function IconeOperation({ t }: { t: Transaction }) {
  return (
    <span
      className={`operation-icone ${t.type === 'epargne' ? 'sens-epargne' : signedAmount(t) >= 0 ? 'sens-entree' : 'sens-sortie'}`}
      aria-hidden="true"
    >
      <Icon name={t.account === 'izly' ? 'campus' : ICONES[t.type]} size={18} />
    </span>
  );
}

function Operation({ t, avecCompte, onSupprimer }: { t: Transaction; avecCompte: boolean; onSupprimer?: () => void }) {
  const montant = signedAmount(t);
  const { recents } = useApp();
  return (
    <li className={`operation ${recents.has(t.sourceId) ? 'item-recent' : ''}`}>
      <IconeOperation t={t} />
      <div className="operation-texte">
        <p className="operation-libelle">{t.label}</p>
        <p className="operation-detail">{details(t, avecCompte)}</p>
      </div>
      <SignedAmount cents={Math.abs(montant)} positive={montant >= 0} epargne={t.type === 'epargne'} />
      {onSupprimer && (
        <IconButton
          icon="trash"
          label={`Supprimer cet ajustement de ${montant >= 0 ? '+' : '−'}${centsToInput(Math.abs(montant))} €`}
          onClick={onSupprimer}
        />
      )}
    </li>
  );
}

/** Ajuster le solde : la personne indique le solde réel ; un ajustement daté du jour comble l'écart. */
function AjusterSolde({ comptes, onClose }: { comptes: AccountId[]; onClose: () => void }) {
  const { data, dispatch, today, fmt, notify } = useApp();
  const calcules = Object.fromEntries(comptes.map((c) => [c, accountBalance(data, c, today, today)])) as Record<AccountId, number>;
  const [valeurs, setValeurs] = useState<Record<string, string>>(() =>
    Object.fromEntries(comptes.map((c) => [c, centsToInput(Math.abs(calcules[c]))])),
  );
  const [negatifs, setNegatifs] = useState<Record<string, boolean>>(() => Object.fromEntries(comptes.map((c) => [c, calcules[c] < 0])));
  const [erreurs, setErreurs] = useState<Record<string, string | null>>({});

  const valider = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string | null> = {};
    const reels: Partial<Record<AccountId, number>> = {};
    for (const c of comptes) {
      const v = parseAmount(valeurs[c] ?? '');
      if (v === null || v < 0) errs[c] = 'Indique un montant, par exemple 1 250,40.';
      else reels[c] = negatifs[c] ? -v : v;
    }
    setErreurs(errs);
    if (Object.values(errs).some(Boolean)) return;
    let n = 0;
    for (const c of comptes) {
      const ecart = (reels[c] ?? 0) - calcules[c];
      if (ecart === 0) continue;
      dispatch({ type: 'upsert', collection: 'adjustments', item: { id: newId('aju'), account: c, date: today, amount: ecart, note: '' } });
      n += 1;
    }
    notify(n === 0 ? 'Les soldes étaient déjà justes : rien à corriger.' : 'Solde ajusté : SoldeClair part maintenant de ton solde réel.');
    onClose();
  };

  return (
    <Modal title="Ajuster le solde" onClose={onClose}>
      <form onSubmit={valider} noValidate className="form">
        <p className="muted">
          Indique le solde affiché aujourd’hui par ta banque{comptes.length > 1 ? ' et par ta carte restaurant' : ''}. SoldeClair ajoute un
          « ajustement du solde » pour combler l’écart (une dépense oubliée, l’argent déjà présent avant de commencer…).
        </p>
        {comptes.map((c) => (
          <div key={c} className="ajuster-compte">
            <MoneyField
              label={`Solde réel – ${ACCOUNT_LABELS[c]}`}
              value={valeurs[c] ?? ''}
              onChange={(e) => setValeurs({ ...valeurs, [c]: e.target.value })}
              error={erreurs[c]}
              hint={`Solde calculé par SoldeClair : ${fmt(calcules[c])}`}
            />
            <CheckboxField
              label="Solde négatif (découvert)"
              checked={negatifs[c] ?? false}
              onChange={(e) => setNegatifs({ ...negatifs, [c]: e.target.checked })}
            />
          </div>
        ))}
        <div className="form-actions">
          <Button variant="secondaire" onClick={onClose}>
            Annuler
          </Button>
          <button type="submit" className="btn btn-primaire">
            <span>Enregistrer le solde</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Recharge Izly : l'argent passe du compte bancaire au porte-monnaie Izly (suivi manuel). */
function RechargeIzly({ onClose }: { onClose: () => void }) {
  const { dispatch, today, notify, fmt } = useApp();
  const [montant, setMontant] = useState('');
  const [date, setDate] = useState(today);
  const [erreur, setErreur] = useState<string | null>(null);
  const valider = (e: FormEvent) => {
    e.preventDefault();
    const v = parseAmount(montant);
    if (v === null || v <= 0) {
      setErreur('Indique un montant, par exemple 20.');
      return;
    }
    const lien = newId('rec');
    dispatch({
      type: 'upsert',
      collection: 'adjustments',
      item: { id: newId('aju'), account: 'compte', date, amount: -v, note: 'Recharge Izly', recharge: true, lien },
    });
    dispatch({
      type: 'upsert',
      collection: 'adjustments',
      item: { id: newId('aju'), account: 'izly', date, amount: v, note: 'Recharge Izly', recharge: true, lien },
    });
    notify(`Izly rechargé de ${fmt(v)}.`);
    onClose();
  };
  return (
    <Modal title="Recharger Izly" onClose={onClose}>
      <form onSubmit={valider} noValidate className="form">
        <div className="form-grid">
          <MoneyField label="Montant" value={montant} onChange={(e) => setMontant(e.target.value)} error={erreur} />
          <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <p className="field-hint">Passe du compte bancaire à Izly. Suivi manuel, aucun accès à ton compte Izly.</p>
        <div className="form-actions">
          <Button variant="secondaire" onClick={onClose}>
            Annuler
          </Button>
          <button type="submit" className="btn btn-primaire">
            <span>Recharger</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Compte() {
  const { data, today, fmt, dispatch, notify } = useApp();
  const comptes = comptesUtilises(data);
  const avecCarte = comptes.length > 1;
  const avecIzly = comptes.includes('izly');
  // Recharge Izly proposée aux étudiants et alternants, ou dès qu'Izly sert
  const proposerIzly = avecIzly || data.profile?.type === 'etudiant' || data.profile?.type === 'alternant';
  const [recharger, setRecharger] = useState(false);
  const [mois, setMois] = useState(1);
  const [recherche, setRecherche] = useState('');
  const [ajuster, setAjuster] = useState(false);
  const [params, setParams] = useSearchParams();
  // « ?compte=izly » (pastilles de l'accueil) : le relevé s'ouvre directement sur ce porte-monnaie
  const [filtre, setFiltre] = useState<FiltreCompte>(() => {
    const c = params.get('compte');
    return c === 'compte' || c === 'carte-restaurant' || c === 'izly' ? c : 'tout';
  });
  const vue: Vue = params.get('vue') === 'a-venir' ? 'a-venir' : 'operations';
  const choisirVue = (v: Vue) => setParams(v === 'a-venir' ? { vue: 'a-venir' } : {}, { replace: true });
  // « Ajuster mon solde » depuis Poksy : #/compte?ajuster=1 ouvre la fenêtre (rien n'est enregistré sans validation)
  useEffect(() => {
    if (params.get('ajuster') === '1') {
      setAjuster(true);
      setParams(vue === 'a-venir' ? { vue: 'a-venir' } : {}, { replace: true });
    }
  }, [params, setParams, vue]);
  // Flèches gauche / droite : passer d'une bulle à l'autre (comportement attendu d'onglets)
  const changerAvecFleches = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const suivante: Vue = e.key === 'Home' ? 'operations' : e.key === 'End' ? 'a-venir' : vue === 'operations' ? 'a-venir' : 'operations';
    choisirVue(suivante);
    document.getElementById(`bulle-${suivante}`)?.focus();
  };
  const [aSupprimer, setASupprimer] = useState<Transaction | null>(null);

  const actif: FiltreCompte = avecCarte && (filtre === 'tout' || comptes.includes(filtre)) ? filtre : avecCarte ? 'tout' : 'compte';
  const debut = firstDay(addMonths(monthOf(today), -(mois - 1)));
  const solde = useMemo(() => accountBalance(data, actif, today, today), [data, actif, today]);
  const soldes = useMemo(() => comptes.map((c) => [c, accountBalance(data, c, today, today)] as const), [data, today, comptes.join()]);
  const aVenir = useMemo(() => operationsAVenir(data, actif, today, 30), [data, actif, today]);
  const soldePrevu = solde + sum(aVenir.map(signedAmount));
  // Sommes bloquées (caution, dépôt de garantie) : comprises dans le solde mais pas disponibles
  const bloquees = sommesBloquees(data, today).filter((h) => actif === 'tout' || h.account === actif);
  const bloque = sum(bloquees.map((h) => h.amount));
  const aVenirTotaux = totaux(aVenir);
  // Le nombre dans la bulle n'apparaît que pour les 7 prochains jours (et les charges en retard)
  const bientot = aVenir.filter((t) => t.date <= addDays(today, 7)).length;
  const jours = useMemo(() => releve(data, actif, debut, today, today), [data, actif, debut, today]);
  const q = recherche.trim().toLocaleLowerCase('fr');
  const joursFiltres = q
    ? jours
        .map((j) => ({
          ...j,
          operations: j.operations.filter((t) => `${t.label} ${t.categoryName} ${t.paymentMethod}`.toLocaleLowerCase('fr').includes(q)),
        }))
        .filter((j) => j.operations.length > 0)
    : jours;
  const { entrees, sorties } = totaux(joursFiltres.flatMap((j) => j.operations));
  const moisPrecedent = addMonths(monthOf(debut), -1);
  const toutAffiche = debut <= earliestDate(data, today);
  const avecCompte = avecCarte && actif === 'tout';

  return (
    <div className="page">
      <PageHeader
        title="Mon compte"
        description="Entrées et sorties, jour par jour."
        actions={
          <>
            {proposerIzly && (
              <Button variant="secondaire" icon="campus" onClick={() => setRecharger(true)}>
                Recharger Izly
              </Button>
            )}
            <Button variant="secondaire" icon="edit" onClick={() => setAjuster(true)}>
              Ajuster le solde
            </Button>
          </>
        }
      />

      {avecCarte && (
        <div className="chips" role="group" aria-label="Compte affiché">
          {(['tout', ...comptes] as FiltreCompte[]).map((v) => (
            <button key={v} type="button" className={`chip ${actif === v ? 'chip-on' : ''}`} aria-pressed={actif === v} onClick={() => setFiltre(v)}>
              {v === 'tout' ? 'Tout' : ACCOUNT_LABELS[v]}
            </button>
          ))}
        </div>
      )}

      {/* Solde du jour, comme en haut d'une appli bancaire */}
      <section className="solde-compte" aria-labelledby="solde-titre">
        <p id="solde-titre" className="solde-libelle">
          {actif === 'tout' ? 'Solde total aujourd’hui' : `${ACCOUNT_LABELS[actif]} – solde aujourd’hui`}
        </p>
        <p className={`solde-montant ${solde < 0 ? 'montant-moins' : 'montant-plus'}`}>
          <MontantAnime cents={solde} format={(c) => (c < 0 ? `− ${fmt(-c)}` : fmt(c))} brut />
        </p>
        {bloque > 0 && (
          <p className="solde-bloque">
            dont {fmt(bloque)} bloqué{bloque >= 200 ? 's' : ''} temporairement ({bloquees.map((h) => h.label).join(', ')}) : disponible tout de suite,{' '}
            {fmt(solde - bloque)}.{' '}
            <Link to="/plan" className="link">
              Voir
            </Link>
          </p>
        )}
        {actif === 'tout' && avecCarte && (
          <dl className="solde-detail">
            {soldes.map(([c, v]) => (
              <div key={c}>
                <dt>{ACCOUNT_LABELS[c]}</dt>
                <dd className={v < 0 ? 'montant-moins' : 'montant-plus'}>{v < 0 ? `− ${fmt(-v)}` : fmt(v)}</dd>
              </div>
            ))}
          </dl>
        )}
        {(data.adjustments ?? []).length === 0 && (
          <div className="solde-astuce">
            <p>Le solde part de 0 €. Indique une fois le montant affiché par ta banque{avecCarte ? ' et ta carte restaurant' : ''}.</p>
            <Button variant="secondaire" className="btn-small" icon="edit" onClick={() => setAjuster(true)}>
              Indiquer mon solde réel
            </Button>
            <DemanderPoksy question="Pourquoi mon solde ne correspond-il pas à ma banque ?" id="solde-banque" libelle={'Pourquoi 0\u00a0€\u00a0?'} />
          </div>
        )}
        <p className="solde-prevu">
          Après les opérations prévues dans les 30 prochains jours :{' '}
          <strong className={soldePrevu < 0 ? 'montant-moins' : 'montant-plus'}>{soldePrevu < 0 ? `− ${fmt(-soldePrevu)}` : fmt(soldePrevu)}</strong>
        </p>
      </section>

      {/* Deux bulles : les opérations passées, ou ce qui est à venir (chacune dans son propre onglet) */}
      <div className="bulles" role="tablist" aria-label="Opérations affichées" onKeyDown={changerAvecFleches}>
        {(
          [
            ['operations', 'Opérations', null],
            ['a-venir', 'À venir', bientot > 0 ? bientot : null],
          ] as [Vue, string, number | null][]
        ).map(([v, libelle, nombre]) => (
          <button
            key={v}
            id={`bulle-${v}`}
            type="button"
            role="tab"
            className="bulle"
            aria-selected={vue === v}
            aria-controls="panneau-compte"
            tabIndex={vue === v ? 0 : -1}
            aria-label={nombre === null ? libelle : `${libelle} (${nombre} opération${nombre > 1 ? 's' : ''} dans les 7 prochains jours)`}
            onClick={() => choisirVue(v)}
          >
            <span>{libelle}</span>
            {nombre !== null && (
              <span className="bulle-nombre" aria-hidden="true">
                {nombre}
              </span>
            )}
          </button>
        ))}
      </div>

      <section key={vue} id="panneau-compte" className="card panneau-compte" role="tabpanel" aria-labelledby={`bulle-${vue}`}>
        {vue === 'a-venir' ? (
          <>
            <h2 className="sr-only">Opérations à venir</h2>
            <p className="a-venir-resume">
              Dans les 30 prochains jours : <strong className="montant-plus">+ {fmt(aVenirTotaux.entrees)}</strong> qui entrent,{' '}
              <strong className="montant-moins">− {fmt(aVenirTotaux.sorties)}</strong> qui sortent. Solde prévu :{' '}
              <strong className={soldePrevu < 0 ? 'montant-moins' : 'montant-plus'}>
                {soldePrevu < 0 ? `− ${fmt(-soldePrevu)}` : fmt(soldePrevu)}
              </strong>
              .
            </p>
            {aVenir.length === 0 ? (
              <EmptyState title="Rien de prévu">Aucune opération prévue dans les 30 prochains jours.</EmptyState>
            ) : (
              <ul className="operations">
                {aVenir.map((t) => (
                  <li key={t.key} className="operation a-venir">
                    <IconeOperation t={t} />
                    <div className="operation-texte">
                      <p className="operation-libelle">{t.label}</p>
                      <p className="operation-detail">
                        {t.date < today
                          ? `Prévu le ${dayHeader(t.date, today).toLocaleLowerCase('fr')}, pas encore payé`
                          : relativeDay(t.date, today)}{' '}
                        – {details(t, avecCompte)}
                      </p>
                    </div>
                    <SignedAmount cents={Math.abs(signedAmount(t))} positive={signedAmount(t) >= 0} epargne={t.type === 'epargne'} />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <h2 className="sr-only">Opérations passées</h2>
            <div className="operations-outils">
              <TextField
                label="Rechercher une opération"
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Libellé, catégorie…"
              />
              <p className="operations-totaux" aria-live="polite">
                <span>
                  Entrées : <strong className="montant-plus">+ {fmt(entrees)}</strong>
                </span>
                <span>
                  Sorties : <strong className="montant-moins">− {fmt(sorties)}</strong>
                </span>
                <span className="muted">depuis le 1er {monthLabel(monthOf(debut))}</span>
              </p>
            </div>
            {joursFiltres.length === 0 ? (
              <EmptyState title={q ? 'Aucune opération trouvée' : 'Aucune opération pour l’instant'}>
                {q ? 'Essaie un autre mot.' : 'Tes revenus, dépenses et prélèvements apparaîtront ici, jour par jour.'}
              </EmptyState>
            ) : (
              <div className="releve">
                {joursFiltres.map((j) => (
                  <section key={j.date} className="releve-jour" aria-label={dayHeader(j.date, today)}>
                    <h3 className="releve-date">
                      <span>{dayHeader(j.date, today)}</span>
                      <span className="releve-solde">
                        Solde :{' '}
                        <strong className={j.solde < 0 ? 'montant-moins' : 'montant-plus'}>
                          {j.solde < 0 ? `− ${fmt(-j.solde)}` : fmt(j.solde)}
                        </strong>
                      </span>
                    </h3>
                    <ul className="operations">
                      {j.operations.map((t) => (
                        <Operation
                          key={t.key}
                          t={t}
                          avecCompte={avecCompte}
                          onSupprimer={t.type === 'ajustement' ? () => setASupprimer(t) : undefined}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
            {!toutAffiche && (
              <div className="releve-plus">
                <Button variant="secondaire" icon="history" onClick={() => setMois(mois + 1)}>
                  Voir les opérations {ofMonth(moisPrecedent)}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {ajuster && <AjusterSolde comptes={comptes} onClose={() => setAjuster(false)} />}
      {recharger && <RechargeIzly onClose={() => setRecharger(false)} />}
      {aSupprimer && (
        <ConfirmDialog
          title="Supprimer cet ajustement ?"
          message="Le solde sera de nouveau calculé uniquement à partir de tes saisies."
          onCancel={() => setASupprimer(null)}
          onConfirm={() => {
            const ajustement = (data.adjustments ?? []).find((a) => a.id === aSupprimer.sourceId);
            // Une recharge Izly est faite de deux mouvements liés : ils partent ensemble
            const lies = ajustement?.lien ? (data.adjustments ?? []).filter((a) => a.lien === ajustement.lien) : ajustement ? [ajustement] : [];
            for (const a of lies) dispatch({ type: 'remove', collection: 'adjustments', id: a.id });
            notify(ajustement?.recharge ? 'Recharge supprimée.' : 'Ajustement supprimé.', 'succes', {
              label: 'Annuler',
              onClick: () => lies.forEach((a) => dispatch({ type: 'upsert', collection: 'adjustments', item: a })),
            });
            setASupprimer(null);
          }}
        />
      )}
    </div>
  );
}
