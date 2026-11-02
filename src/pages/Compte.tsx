import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { AccountId, Transaction } from '../types';
import { accountBalance, ACCOUNT_LABELS, operationsAVenir, releve, totaux, usesCarteRestaurant, type FiltreCompte } from '../lib/accounts';
import { earliestDate, signedAmount } from '../lib/budget';
import { addMonths, dayHeader, firstDay, monthLabel, monthOf, ofMonth, relativeDay } from '../lib/dates';
import { centsToInput, parseAmount, sum } from '../lib/money';
import { newId } from '../lib/id';
import { Button, CheckboxField, ConfirmDialog, EmptyState, IconButton, Modal, MoneyField, PageHeader, SignedAmount, TextField } from '../components/ui';
import { Icon } from '../components/Icon';

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
  const morceaux = [t.type === 'epargne' ? 'Vers l’épargne' : t.type === 'ajustement' ? 'Correction du solde' : t.categoryName];
  if (t.paymentMethod) morceaux.push(t.paymentMethod);
  if (t.type === 'charge') morceaux.push('Prélèvement');
  // Le compte n'est précisé que s'il n'est pas déjà évident (pas de « Carte restaurant – Carte restaurant »)
  const compte = ACCOUNT_LABELS[t.account];
  if (avecCompte && !morceaux.some((m) => m.toLocaleLowerCase('fr') === compte.toLocaleLowerCase('fr'))) morceaux.push(compte);
  return morceaux.join(' – ');
}

/** Pastille ronde : verte pour l'argent qui entre, rouge pour l'argent qui sort ; le pictogramme indique le type. */
function IconeOperation({ t }: { t: Transaction }) {
  return (
    <span className={`operation-icone ${signedAmount(t) >= 0 ? 'sens-entree' : 'sens-sortie'}`} aria-hidden="true">
      <Icon name={ICONES[t.type]} size={18} />
    </span>
  );
}

function Operation({ t, avecCompte, onSupprimer }: { t: Transaction; avecCompte: boolean; onSupprimer?: () => void }) {
  const montant = signedAmount(t);
  return (
    <li className="operation">
      <IconeOperation t={t} />
      <div className="operation-texte">
        <p className="operation-libelle">{t.label}</p>
        <p className="operation-detail">{details(t, avecCompte)}</p>
      </div>
      <SignedAmount cents={Math.abs(montant)} positive={montant >= 0} />
      {onSupprimer && <IconButton icon="trash" label={`Supprimer cet ajustement de ${montant >= 0 ? '+' : '−'}${centsToInput(Math.abs(montant))} €`} onClick={onSupprimer} />}
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
      if (v === null || v < 0) errs[c] = 'Indiquez un montant, par exemple 1 250,40.';
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
    notify(n === 0 ? 'Les soldes étaient déjà justes : rien à corriger.' : 'Solde ajusté : SoldeClair part maintenant de votre solde réel.');
    onClose();
  };

  return (
    <Modal title="Ajuster le solde" onClose={onClose}>
      <form onSubmit={valider} noValidate className="form">
        <p className="muted">
          Indiquez le solde affiché aujourd’hui par votre banque{comptes.length > 1 ? ' et par votre carte restaurant' : ''}. SoldeClair ajoute un
          « ajustement du solde » pour combler l’écart (une dépense oubliée, l’argent déjà présent avant de commencer…).
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
            <CheckboxField label="Solde négatif (découvert)" checked={negatifs[c] ?? false} onChange={(e) => setNegatifs({ ...negatifs, [c]: e.target.checked })} />
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

export function Compte() {
  const { data, today, fmt, dispatch, notify } = useApp();
  const avecCarte = usesCarteRestaurant(data);
  const [filtre, setFiltre] = useState<FiltreCompte>('tout');
  const [mois, setMois] = useState(1);
  const [recherche, setRecherche] = useState('');
  const [ajuster, setAjuster] = useState(false);
  const [params, setParams] = useSearchParams();
  const vue: Vue = params.get('vue') === 'a-venir' ? 'a-venir' : 'operations';
  const choisirVue = (v: Vue) => setParams(v === 'a-venir' ? { vue: 'a-venir' } : {}, { replace: true });
  // Flèches gauche / droite : passer d'une bulle à l'autre (comportement attendu d'onglets)
  const changerAvecFleches = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const suivante: Vue = e.key === 'Home' ? 'operations' : e.key === 'End' ? 'a-venir' : vue === 'operations' ? 'a-venir' : 'operations';
    choisirVue(suivante);
    document.getElementById(`bulle-${suivante}`)?.focus();
  };
  const [aSupprimer, setASupprimer] = useState<Transaction | null>(null);

  const actif: FiltreCompte = avecCarte ? filtre : 'compte';
  const debut = firstDay(addMonths(monthOf(today), -(mois - 1)));
  const solde = useMemo(() => accountBalance(data, actif, today, today), [data, actif, today]);
  const soldeCompte = useMemo(() => accountBalance(data, 'compte', today, today), [data, today]);
  const soldeCarte = useMemo(() => accountBalance(data, 'carte-restaurant', today, today), [data, today]);
  const aVenir = useMemo(() => operationsAVenir(data, actif, today, 30), [data, actif, today]);
  const soldePrevu = solde + sum(aVenir.map(signedAmount));
  const aVenirTotaux = totaux(aVenir);
  const jours = useMemo(() => releve(data, actif, debut, today, today), [data, actif, debut, today]);
  const q = recherche.trim().toLocaleLowerCase('fr');
  const joursFiltres = q
    ? jours
        .map((j) => ({ ...j, operations: j.operations.filter((t) => `${t.label} ${t.categoryName} ${t.paymentMethod}`.toLocaleLowerCase('fr').includes(q)) }))
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
        description="Tout ce qui entre et tout ce qui sort, jour par jour, comme sur une application bancaire."
        actions={
          <Button variant="secondaire" icon="edit" onClick={() => setAjuster(true)}>
            Ajuster le solde
          </Button>
        }
      />

      {avecCarte && (
        <div className="chips" role="group" aria-label="Compte affiché">
          {(
            [
              ['tout', 'Tout'],
              ['compte', 'Compte bancaire'],
              ['carte-restaurant', 'Carte restaurant'],
            ] as [FiltreCompte, string][]
          ).map(([v, l]) => (
            <button key={v} type="button" className={`chip ${filtre === v ? 'chip-on' : ''}`} aria-pressed={filtre === v} onClick={() => setFiltre(v)}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Solde du jour, comme en haut d'une appli bancaire */}
      <section className="solde-compte" aria-labelledby="solde-titre">
        <p id="solde-titre" className="solde-libelle">
          {actif === 'tout' ? 'Solde total aujourd’hui' : `${ACCOUNT_LABELS[actif]} – solde aujourd’hui`}
        </p>
        <p className="solde-montant">
          <span className={`pastille-solde ${solde < 0 ? 'pastille-negative' : 'pastille-positive'}`}>{solde < 0 ? `− ${fmt(-solde)}` : fmt(solde)}</span>
        </p>
        {actif === 'tout' && avecCarte && (
          <dl className="solde-detail">
            <div>
              <dt>Compte bancaire</dt>
              <dd className={soldeCompte < 0 ? 'montant-moins' : 'montant-plus'}>{soldeCompte < 0 ? `− ${fmt(-soldeCompte)}` : fmt(soldeCompte)}</dd>
            </div>
            <div>
              <dt>Carte restaurant</dt>
              <dd className={soldeCarte < 0 ? 'montant-moins' : 'montant-plus'}>{soldeCarte < 0 ? `− ${fmt(-soldeCarte)}` : fmt(soldeCarte)}</dd>
            </div>
          </dl>
        )}
        <p className="solde-prevu">
          Après les opérations prévues dans les 30 prochains jours :{' '}
          <strong className={soldePrevu < 0 ? 'montant-moins' : 'montant-plus'}>{soldePrevu < 0 ? `− ${fmt(-soldePrevu)}` : fmt(soldePrevu)}</strong>
        </p>
      </section>

      {/* Deux bulles : les opérations passées, ou ce qui est à venir (chacune dans son propre onglet) */}
      <div className="bulles" role="tablist" aria-label="Opérations affichées" onKeyDown={changerAvecFleches}>
        {(
          [
            ['operations', 'Opérations', null],
            ['a-venir', 'À venir', aVenir.length],
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
            aria-label={nombre === null ? libelle : `${libelle} (${nombre} opération${nombre > 1 ? 's' : ''})`}
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

      <section id="panneau-compte" className="card panneau-compte" role="tabpanel" aria-labelledby={`bulle-${vue}`}>
        {vue === 'a-venir' ? (
          <>
            <h2 className="sr-only">Opérations à venir</h2>
            <p className="a-venir-resume">
              Dans les 30 prochains jours : <strong className="montant-plus">+ {fmt(aVenirTotaux.entrees)}</strong> qui entrent,{' '}
              <strong className="montant-moins">− {fmt(aVenirTotaux.sorties)}</strong> qui sortent. Solde prévu :{' '}
              <strong className={soldePrevu < 0 ? 'montant-moins' : 'montant-plus'}>{soldePrevu < 0 ? `− ${fmt(-soldePrevu)}` : fmt(soldePrevu)}</strong>.
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
                        {t.date < today ? `Prévu le ${dayHeader(t.date, today).toLocaleLowerCase('fr')}, pas encore payé` : relativeDay(t.date, today)} –{' '}
                        {details(t, avecCompte)}
                      </p>
                    </div>
                    <SignedAmount cents={Math.abs(signedAmount(t))} positive={signedAmount(t) >= 0} />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <h2 className="sr-only">Opérations passées</h2>
            <div className="operations-outils">
              <TextField label="Rechercher une opération" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Libellé, catégorie…" />
              <p className="operations-totaux" aria-live="polite">
                <span>
                  Entrées : <strong className="montant-plus">+ {fmt(entrees)}</strong>
                </span>
                <span>
                  Sorties : <strong className="montant-moins">− {fmt(sorties)}</strong>
                </span>
                <span className="muted">depuis le 1er {monthLabel(monthOf(debut))}</span>
              </p>
            </div>
            {joursFiltres.length === 0 ? (
              <EmptyState title={q ? 'Aucune opération trouvée' : 'Aucune opération pour l’instant'}>
                {q ? 'Essayez un autre mot.' : 'Vos revenus, dépenses et prélèvements apparaîtront ici, jour par jour.'}
              </EmptyState>
            ) : (
              <div className="releve">
                {joursFiltres.map((j) => (
                  <section key={j.date} className="releve-jour" aria-label={dayHeader(j.date, today)}>
                    <h3 className="releve-date">
                      <span>{dayHeader(j.date, today)}</span>
                      <span className="releve-solde">
                        Solde : <strong className={j.solde < 0 ? 'montant-moins' : 'montant-plus'}>{j.solde < 0 ? `− ${fmt(-j.solde)}` : fmt(j.solde)}</strong>
                      </span>
                    </h3>
                    <ul className="operations">
                      {j.operations.map((t) => (
                        <Operation key={t.key} t={t} avecCompte={avecCompte} onSupprimer={t.type === 'ajustement' ? () => setASupprimer(t) : undefined} />
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

      {ajuster && <AjusterSolde comptes={avecCarte ? ['compte', 'carte-restaurant'] : ['compte']} onClose={() => setAjuster(false)} />}
      {aSupprimer && (
        <ConfirmDialog
          title="Supprimer cet ajustement ?"
          message="Le solde sera de nouveau calculé uniquement à partir de vos saisies."
          onCancel={() => setASupprimer(null)}
          onConfirm={() => {
            dispatch({ type: 'remove', collection: 'adjustments', id: aSupprimer.sourceId });
            notify('Ajustement supprimé.');
            setASupprimer(null);
          }}
        />
      )}
    </div>
  );
}
