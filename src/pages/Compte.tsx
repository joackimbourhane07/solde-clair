import { useMemo, useState, type FormEvent } from 'react';
import { useApp } from '../state/AppState';
import type { AccountId, Transaction } from '../types';
import { accountBalance, ACCOUNT_LABELS, operationsAVenir, releve, totaux, usesCarteRestaurant, type FiltreCompte } from '../lib/accounts';
import { earliestDate, signedAmount } from '../lib/budget';
import { addMonths, dayHeader, firstDay, monthLabel, monthOf, ofMonth, relativeDay } from '../lib/dates';
import { centsToInput, parseAmount, sum } from '../lib/money';
import { newId } from '../lib/id';
import { Button, Card, CheckboxField, ConfirmDialog, EmptyState, IconButton, Modal, MoneyField, PageHeader, SignedAmount, TextField } from '../components/ui';
import { Icon } from '../components/Icon';

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

function Operation({ t, avecCompte, onSupprimer }: { t: Transaction; avecCompte: boolean; onSupprimer?: () => void }) {
  const montant = signedAmount(t);
  return (
    <li className="operation">
      <span className={`operation-icone type-${t.type}`} aria-hidden="true">
        <Icon name={ICONES[t.type]} size={18} />
      </span>
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
  const [aSupprimer, setASupprimer] = useState<Transaction | null>(null);

  const actif: FiltreCompte = avecCarte ? filtre : 'compte';
  const debut = firstDay(addMonths(monthOf(today), -(mois - 1)));
  const solde = useMemo(() => accountBalance(data, actif, today, today), [data, actif, today]);
  const soldeCompte = useMemo(() => accountBalance(data, 'compte', today, today), [data, today]);
  const soldeCarte = useMemo(() => accountBalance(data, 'carte-restaurant', today, today), [data, today]);
  const aVenir = useMemo(() => operationsAVenir(data, actif, today, 30), [data, actif, today]);
  const soldePrevu = solde + sum(aVenir.map(signedAmount));
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
        <p className={`solde-montant ${solde < 0 ? 'negatif' : ''}`}>{solde < 0 ? `− ${fmt(-solde)}` : fmt(solde)}</p>
        {actif === 'tout' && avecCarte && (
          <dl className="solde-detail">
            <div>
              <dt>Compte bancaire</dt>
              <dd>{soldeCompte < 0 ? `− ${fmt(-soldeCompte)}` : fmt(soldeCompte)}</dd>
            </div>
            <div>
              <dt>Carte restaurant</dt>
              <dd>{soldeCarte < 0 ? `− ${fmt(-soldeCarte)}` : fmt(soldeCarte)}</dd>
            </div>
          </dl>
        )}
        <p className="solde-prevu">
          Après les opérations prévues dans les 30 prochains jours : <strong>{soldePrevu < 0 ? `− ${fmt(-soldePrevu)}` : fmt(soldePrevu)}</strong>
        </p>
      </section>

      <Card title="À venir" actions={<span className="tag">{aVenir.length === 0 ? 'Rien de prévu' : `${aVenir.length} opération${aVenir.length > 1 ? 's' : ''}`}</span>}>
        {aVenir.length === 0 ? (
          <p className="muted">Aucune opération prévue dans les 30 prochains jours.</p>
        ) : (
          <ul className="operations">
            {aVenir.slice(0, 8).map((t) => (
              <li key={t.key} className="operation a-venir">
                <span className={`operation-icone type-${t.type}`} aria-hidden="true">
                  <Icon name={ICONES[t.type]} size={18} />
                </span>
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
        {aVenir.length > 8 && <p className="muted petit-texte">Et {aVenir.length - 8} autre(s) opération(s) dans les 30 jours.</p>}
      </Card>

      <Card title="Opérations">
        <div className="operations-outils">
          <TextField label="Rechercher une opération" type="search" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Libellé, catégorie…" />
          <p className="operations-totaux" aria-live="polite">
            <span>
              Entrées : <strong className="montant-plus">+ {fmt(entrees)}</strong>
            </span>
            <span>
              Sorties : <strong>− {fmt(sorties)}</strong>
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
                    Solde : <strong>{j.solde < 0 ? `− ${fmt(-j.solde)}` : fmt(j.solde)}</strong>
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
      </Card>

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
