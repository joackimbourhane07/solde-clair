import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { Income } from '../types';
import {
  carryOverInto,
  categoryName,
  jourBascule,
  moisDuRevenu,
  monthTransactions,
  revenusSansDernierVersement,
  transactionsInRange,
} from '../lib/budget';
import { usesCarteRestaurant } from '../lib/accounts';
import { addMonths, defaultDateFor, firstDay, formatDate, lastDay, monthLabel, monthOf, ofMonth, parseISO } from '../lib/dates';
import { sum } from '../lib/money';
import { FREQUENCY_LABELS } from '../lib/recurrence';
import { Button, Card, CheckboxField, ConfirmDialog, EmptyState, IconButton, Modal, MonthSwitcher, Notice, PageHeader, Stat } from '../components/ui';
import { IncomeForm } from '../components/forms';

export function Incomes() {
  const { data, month, setMonth, today, fmt, dispatch, notify, recents } = useApp();
  const [editing, setEditing] = useState<Income | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Income | null>(null);
  const [showAll, setShowAll] = useState(false);
  // Formulaire ouvert sur « Dernier versement déjà reçu »
  const [dernierPour, setDernierPour] = useState<Income | null>(null);
  // « Ajouter un revenu » depuis Poksy : #/revenus?ajouter=1 ouvre le formulaire (rien n'est enregistré sans validation)
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('ajouter') === '1') {
      setEditing('new');
      setParams({}, { replace: true });
    }
    const id = params.get('dernier');
    if (id) {
      const inc = data.incomes.find((i) => i.id === id);
      if (inc) setDernierPour(inc);
      setParams({}, { replace: true });
    }
  }, [params, setParams, data.incomes]);
  const sansDernier = revenusSansDernierVersement(data, month);

  const occurrences = useMemo(() => monthTransactions(data, month, today).filter((t) => t.type === 'revenu'), [data, month, today]);
  const total = sum(occurrences.map((t) => t.amount));
  const idsThisMonth = new Set(occurrences.map((t) => t.sourceId));
  // Revenus attendus (incertains) : affichés à part avec le mois prévu, jamais comptés tant qu'ils ne sont pas confirmés
  const jourB = jourBascule(data);
  const attendusDuMois = data.incomes.filter((i) => i.certitude === 'attendu' && moisDuRevenu(i.date, jourB) === month);
  const list = (showAll ? data.incomes : data.incomes.filter((i) => idsThisMonth.has(i.id) || attendusDuMois.includes(i)))
    .slice()
    .sort((a, b) => Number(a.certitude === 'attendu') - Number(b.certitude === 'attendu') || b.amount - a.amount);
  const report = useMemo(() => carryOverInto(data, month, today), [data, month, today]);
  // Règle du 20 : un revenu reçu à partir de ce jour compte pour le mois suivant
  const jour = jourBascule(data);
  const finDeMoisCeMois = useMemo(
    () =>
      jour === null
        ? []
        : transactionsInRange(data, firstDay(month), lastDay(month), today).filter((t) => t.type === 'revenu' && parseISO(t.date).day >= jour),
    [data, month, today, jour],
  );
  const recusLeMoisPrecedent = occurrences.filter((t) => monthOf(t.date) !== month);
  /** Pourquoi un revenu n'apparaît pas dans les totaux du mois affiché. */
  const horsDuMois = (inc: Income): { texte: string; mois: string } | null => {
    if (idsThisMonth.has(inc.id)) return null;
    if (inc.certitude === 'attendu')
      return { texte: `Attendu vers ${monthLabel(moisDuRevenu(inc.date, jour))}, pas encore compté`, mois: moisDuRevenu(inc.date, jour) };
    if (inc.recurring && inc.endDate && inc.endDate < firstDay(month))
      return { texte: `Terminé le ${formatDate(inc.endDate)}`, mois: monthOf(inc.endDate) };
    const m = moisDuRevenu(inc.date, jour);
    if (inc.recurring) return { texte: `À partir de ${monthLabel(m)}`, mois: m };
    return { texte: `Compté en ${monthLabel(m)}`, mois: m };
  };
  // Carte restaurant : total de toutes les sources, puis détail compte bancaire / carte restaurant
  const avecCarte = usesCarteRestaurant(data);
  const surCarte = sum(occurrences.filter((t) => t.account === 'carte-restaurant').map((t) => t.amount));
  const recurringTotal = sum(occurrences.filter((t) => data.incomes.find((i) => i.id === t.sourceId)?.recurring).map((t) => t.amount));

  return (
    <div className="page">
      <PageHeader
        title="Revenus"
        description="Salaire, bourse, aides : tout ce qui entre."
        actions={
          <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
            Ajouter un revenu
          </Button>
        }
      />
      <MonthSwitcher />
      <div className="stats-grid stats-compact">
        {avecCarte ? (
          <>
            <Stat label={`Revenus encaissés ${ofMonth(month)}`} value={fmt(total - surCarte)} tone="entree" detail="Sur le compte bancaire" />
            <Stat
              label="Pouvoir d’achat alimentaire"
              value={fmt(surCarte)}
              tone="entree"
              detail="Titres-restaurant : avantage en nature, pas un revenu encaissé"
            />
            <Stat label="Total des ressources" value={fmt(total)} detail="Encaissé + titres-restaurant" />
          </>
        ) : (
          <>
            <Stat label={`Revenus ${ofMonth(month)}`} value={fmt(total)} tone="entree" />
            <>
              <Stat label="Dont revenus récurrents" value={fmt(recurringTotal)} tone="entree" />
              <Stat label="Dont revenus exceptionnels" value={fmt(total - recurringTotal)} tone="entree" />
            </>
          </>
        )}
      </div>
      {jour !== null && (recusLeMoisPrecedent.length > 0 || finDeMoisCeMois.length > 0) && (
        <Notice>
          Les revenus reçus à partir du {jour} comptent pour le mois suivant
          {recusLeMoisPrecedent.length > 0
            ? ` : ${recusLeMoisPrecedent.map((t) => `${t.label} (${formatDate(t.date)})`).join(', ')} ${recusLeMoisPrecedent.length > 1 ? 'sont comptés' : 'est compté'} ici`
            : ''}
          {finDeMoisCeMois.length > 0
            ? `${recusLeMoisPrecedent.length > 0 ? ' ; ' : ' : '}${finDeMoisCeMois.map((t) => `${t.label} (${formatDate(t.date)})`).join(', ')} ${finDeMoisCeMois.length > 1 ? 'compteront' : 'comptera'} pour ${monthLabel(addMonths(month, 1))}`
            : ''}
          . Réglable dans les paramètres.
        </Notice>
      )}
      {attendusDuMois.length > 0 && (
        <p className="muted petit-texte">
          {attendusDuMois.length === 1 ? `« ${attendusDuMois[0].name} » attendu` : `${attendusDuMois.length} revenus attendus`} : pas comptés avant
          confirmation.{' '}
          <Link to="/plan" className="link">
            Mon plan
          </Link>
        </p>
      )}
      {sansDernier.map((inc) => (
        <Notice key={inc.id} tone="attention">
          « {inc.name} » commence le {formatDate(inc.date)} : reçu à partir du {jour}, il compte pour {monthLabel(addMonths(month, 1))}.{' '}
          {monthLabel(month)} n’a donc pas ce revenu. Tu l’as déjà reçu le mois dernier ?{' '}
          <button type="button" className="lien-bouton" onClick={() => setDernierPour(inc)}>
            Indiquer le dernier versement reçu
          </button>
        </Notice>
      ))}
      {report !== 0 && (
        <p className="muted petit-texte">
          {report > 0 ? `Reste des mois précédents : + ${fmt(report)}` : `Dépassement des mois précédents : − ${fmt(-report)}`}, déjà compris dans le
          solde de « Mon compte » et du tableau de bord.
        </p>
      )}
      <Card>
        <CheckboxField
          label="Afficher tous les revenus enregistrés (tous les mois)"
          checked={showAll}
          onChange={(e) => setShowAll(e.target.checked)}
        />
        {list.length === 0 ? (
          <EmptyState
            title="Aucun revenu pour ce mois"
            action={
              <Button variant="primaire" icon="plus" onClick={() => setEditing('new')}>
                Ajouter un revenu
              </Button>
            }
          >
            Ajoute ton salaire, ta bourse ou tes aides.
          </EmptyState>
        ) : (
          <ul className="item-list">
            {list.map((inc) => {
              const occ = occurrences.filter((t) => t.sourceId === inc.id);
              const hors = horsDuMois(inc);
              return (
                <li key={inc.id} className={`item ${recents.has(inc.id) ? 'item-recent' : ''}`}>
                  <div className="item-main">
                    <p className="item-title">
                      {inc.name}{' '}
                      <span className={`tag ${inc.recurring ? 'tag-recurrent' : ''}`}>
                        {inc.recurring ? FREQUENCY_LABELS[inc.frequency ?? 'mensuel'] : 'Exceptionnel'}
                      </span>
                      {inc.certitude === 'attendu' && <span className="tag tag-attendu">Attendu</span>}
                      {hors && <span className="tag tag-autre-mois">{hors.texte}</span>}
                      {occ.some((o) => monthOf(o.date) !== month) && (
                        <span className="tag tag-autre-mois">
                          Reçu fin {monthLabel(monthOf(occ.find((o) => monthOf(o.date) !== month)!.date), false)}
                        </span>
                      )}
                      {avecCarte && (occ[0]?.account ?? (inc.account || null)) === 'carte-restaurant' && (
                        <span className="tag tag-carte">Carte restaurant</span>
                      )}
                    </p>
                    <p className="item-meta">
                      {categoryName(data, inc.categoryId)} –{' '}
                      {inc.recurring
                        ? occ.length > 0
                          ? `Versé le ${occ.map((o) => formatDate(o.date)).join(', ')}`
                          : `Depuis le ${formatDate(inc.date)}`
                        : `Le ${formatDate(inc.date)}`}
                      {inc.endDate && ` – jusqu’au ${formatDate(inc.endDate)}`}
                    </p>
                    {inc.note && <p className="item-note">{inc.note}</p>}
                    {hors && hors.mois !== month && (
                      <button type="button" className="lien-bouton petit" onClick={() => setMonth(hors.mois)}>
                        Voir {monthLabel(hors.mois)}
                      </button>
                    )}
                  </div>
                  <span className={`montant ${hors ? 'montant-hors-mois' : 'montant-plus'}`}>
                    {inc.certitude === 'attendu' && inc.amountUnknown ? 'Montant inconnu' : `+ ${fmt(inc.amount)}`}
                    {inc.certitude === 'attendu' && inc.amountMax ? ` à ${fmt(inc.amountMax)}` : ''}
                    {occ.length > 1 && <span className="muted"> × {occ.length}</span>}
                  </span>
                  <div className="item-actions">
                    <IconButton icon="edit" label={`Modifier le revenu ${inc.name}`} onClick={() => setEditing(inc)} />
                    <IconButton icon="trash" label={`Supprimer le revenu ${inc.name}`} onClick={() => setToDelete(inc)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {editing && (
        <Modal title={editing === 'new' ? 'Nouveau revenu' : 'Modifier le revenu'} onClose={() => setEditing(null)}>
          <IncomeForm
            initial={editing === 'new' ? undefined : editing}
            defaultDate={defaultDateFor(month, today)}
            onDone={() => setEditing(null)}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
      {dernierPour && (
        <Modal title={`Dernier versement : ${dernierPour.name}`} onClose={() => setDernierPour(null)}>
          <IncomeForm
            initial={dernierPour}
            ouvrirDernierVersement
            defaultDate={today}
            onDone={() => setDernierPour(null)}
            onCancel={() => setDernierPour(null)}
          />
        </Modal>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Supprimer ce revenu ?"
          message={
            toDelete.recurring
              ? `« ${toDelete.name} » sera supprimé de tous les mois, y compris les mois passés. Pour l’arrêter seulement à partir d’une date, modifie-le et indique une date de fin.`
              : `« ${toDelete.name} » (${fmt(toDelete.amount)}) sera définitivement supprimé.`
          }
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            const supprime = toDelete;
            dispatch({ type: 'remove', collection: 'incomes', id: supprime.id });
            notify('Revenu supprimé.', 'succes', {
              label: 'Annuler',
              onClick: () => dispatch({ type: 'upsert', collection: 'incomes', item: supprime }),
            });
            setToDelete(null);
          }}
        />
      )}
    </div>
  );
}
