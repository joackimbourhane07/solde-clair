import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppState';
import type { AppData, Category, CategoryKind, ProfileType, ThemeChoice } from '../types';
import { CURRENCIES, centsToInput } from '../lib/money';
import { dayDiff, formatDate } from '../lib/dates';
import { isDuplicateName, KIND_LABELS, makeCategory, PROFILE_LABELS } from '../lib/categories';
import { buildDemoData, DEMO_PROFILES, type DemoProfile } from '../lib/demo';
import { clearData, downloadFile, exportCSV, exportJSON, parseBackup } from '../lib/storage';
import { JOUR_BASCULE_DEFAUT, jourBascule } from '../lib/budget';
import { Button, Card, CheckboxField, ConfirmDialog, IconButton, Modal, MoneyField, Notice, PageHeader, SelectField, TextField } from '../components/ui';
import { checkAmount } from '../components/forms';
import { Icon } from '../components/Icon';

function ProfileSection() {
  const { data, dispatch, notify } = useApp();
  const p = data.profile!;
  const [name, setName] = useState(p.name);
  const [type, setType] = useState<ProfileType>(p.type);
  const [currency, setCurrency] = useState(p.currency);
  const [target, setTarget] = useState(centsToInput(p.monthlySavingsTarget));
  const [estimate, setEstimate] = useState(centsToInput(p.variableEstimate));
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const [t, tErr] = checkAmount(target, { allowZero: true, required: false });
    const [v, vErr] = checkAmount(estimate, { allowZero: true, required: false });
    const errs = { name: name.trim() ? null : 'Indiquez un prénom ou un pseudonyme.', target: tErr, estimate: vErr };
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    dispatch({
      type: 'setProfile',
      profile: { ...p, name: name.trim(), type, currency, monthlySavingsTarget: t ?? 0, variableEstimate: v ?? 0 },
    });
    notify('Profil enregistré.');
  };

  return (
    <Card
      title="Mon profil"
      actions={
        <Link to="/presentation" className="link">
          Changer de profil
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="form">
        <div className="form-grid">
          <TextField label="Prénom ou pseudonyme" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={40} />
          <SelectField label="Situation" value={type} onChange={(e) => setType(e.target.value as ProfileType)}>
            {(Object.keys(PROFILE_LABELS) as ProfileType[]).map((t) => (
              <option key={t} value={t}>
                {PROFILE_LABELS[t]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Devise" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </SelectField>
          <MoneyField label="Objectif d’épargne mensuel" value={target} onChange={(e) => setTarget(e.target.value)} error={errors.target} />
          <MoneyField
            label="Estimation des dépenses variables par mois"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            error={errors.estimate}
            hint="Utilisée pour la prévision de fin de mois si aucune limite par catégorie n’est fixée."
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primaire">
            <span>Enregistrer le profil</span>
          </button>
        </div>
      </form>
    </Card>
  );
}

/** Calcul du disponible : report du reste d'un mois sur le suivant (cumul) et revenus de fin de mois. */
function CalculSection() {
  const { data, dispatch, notify } = useApp();
  const actif = data.settings.carryOver !== false;
  const jour = jourBascule(data);
  return (
    <Card title="Calcul du disponible">
      <CheckboxField
        label="Reporter le reste d’un mois sur le suivant"
        hint="Dans le bilan et le détail du mois, ce qui reste à la fin d’un mois (ou ce qui manque) s’ajoute au mois suivant. Le solde du tableau de bord et de « Mon compte », lui, cumule déjà tout."
        checked={actif}
        onChange={(e) => {
          dispatch({ type: 'setCarryOver', value: e.target.checked });
          notify(e.target.checked ? 'Report activé : le reste de chaque mois passe au suivant.' : 'Report désactivé : chaque mois est calculé à part.');
        }}
      />
      <CheckboxField
        label="Les revenus reçus en fin de mois comptent pour le mois suivant"
        hint="Un salaire ou une prime reçus à partir du jour choisi servent au mois suivant et apparaissent dans ses revenus. « Mon compte » les montre toujours à leur vraie date."
        checked={jour !== null}
        onChange={(e) => {
          dispatch({ type: 'setIncomeShiftDay', value: e.target.checked ? JOUR_BASCULE_DEFAUT : null });
          notify(
            e.target.checked
              ? `Les revenus reçus à partir du ${JOUR_BASCULE_DEFAUT} comptent maintenant pour le mois suivant.`
              : 'Chaque revenu compte maintenant dans le mois de sa date.',
          );
        }}
      />
      {jour !== null && (
        <SelectField
          label="À partir du"
          value={String(jour)}
          onChange={(e) => dispatch({ type: 'setIncomeShiftDay', value: Number(e.target.value) })}
          hint="Jour du mois à partir duquel un revenu compte pour le mois suivant."
        >
          {Array.from({ length: 14 }, (_, i) => i + 15).map((j) => (
            <option key={j} value={j}>
              {j} du mois
            </option>
          ))}
        </SelectField>
      )}
    </Card>
  );
}

function ThemeSection() {
  const { data, dispatch } = useApp();
  const options: { value: ThemeChoice; label: string }[] = [
    { value: 'system', label: 'Comme mon appareil' },
    { value: 'light', label: 'Mode clair' },
    { value: 'dark', label: 'Mode sombre' },
  ];
  return (
    <Card title="Apparence">
      <fieldset className="fieldset">
        <legend>Thème de l’application</legend>
        <div className="radio-row">
          {options.map((o) => (
            <label key={o.value} className="radio radio-card">
              <input
                type="radio"
                name="theme"
                value={o.value}
                checked={data.settings.theme === o.value}
                onChange={() => dispatch({ type: 'setTheme', theme: o.value })}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

function CategoryEditor({ kind, category, onClose }: { kind: CategoryKind; category?: Category; onClose: () => void }) {
  const { data, dispatch, notify } = useApp();
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const err = !trimmed
      ? 'Indiquez un nom.'
      : isDuplicateName(data.categories, kind, trimmed, category?.id)
        ? 'Une catégorie porte déjà ce nom.'
        : null;
    setError(err);
    if (err) return;
    dispatch({ type: 'upsert', collection: 'categories', item: category ? { ...category, name: trimmed } : makeCategory(trimmed, kind) });
    notify(category ? 'Catégorie renommée.' : 'Catégorie ajoutée.');
    onClose();
  };
  return (
    <Modal title={category ? 'Renommer la catégorie' : `Nouvelle catégorie — ${KIND_LABELS[kind]}`} onClose={onClose}>
      <form onSubmit={submit} noValidate className="form">
        <TextField label="Nom de la catégorie" value={name} onChange={(e) => setName(e.target.value)} error={error} maxLength={60} />
        <div className="form-actions">
          <Button onClick={onClose}>Annuler</Button>
          <button type="submit" className="btn btn-primaire">
            <span>Enregistrer</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CategoriesSection() {
  const { data, dispatch, notify } = useApp();
  const [kind, setKind] = useState<CategoryKind>('variable');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const list = data.categories.filter((c) => c.kind === kind);
  const usage = (c: Category) =>
    data.incomes.filter((x) => x.categoryId === c.id).length +
    data.fixedCharges.filter((x) => x.categoryId === c.id).length +
    data.expenses.filter((x) => x.categoryId === c.id).length;

  return (
    <Card title="Catégories" actions={<Button icon="plus" className="btn-small" onClick={() => setEditing('new')}>Ajouter</Button>}>
      <div className="tabs" role="tablist" aria-label="Type de catégorie">
        {(['income', 'fixed', 'variable'] as CategoryKind[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} className="tab" onClick={() => setKind(k)}>
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={KIND_LABELS[kind]}>
        <ul className="item-list">
          {list.map((c) => (
            <li key={c.id} className="item">
              <div className="item-main">
                <p className="item-title">{c.name}</p>
                <p className="item-meta">{usage(c)} élément(s)</p>
              </div>
              <div className="item-actions">
                <IconButton icon="edit" label={`Renommer ${c.name}`} onClick={() => setEditing(c)} />
                <IconButton icon="trash" label={`Supprimer ${c.name}`} onClick={() => setToDelete(c)} disabled={list.length <= 1} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      {editing && <CategoryEditor kind={kind} category={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      {toDelete && (
        <ConfirmDialog
          title="Supprimer cette catégorie ?"
          message={
            usage(toDelete) > 0
              ? `« ${toDelete.name} » contient ${usage(toDelete)} élément(s). Ils seront déplacés vers une catégorie « Autre » : aucun montant ne sera perdu.`
              : `« ${toDelete.name} » sera supprimée.`
          }
          onCancel={() => setToDelete(null)}
          onConfirm={() => {
            dispatch({ type: 'removeCategory', id: toDelete.id });
            notify('Catégorie supprimée.');
            setToDelete(null);
          }}
        />
      )}
    </Card>
  );
}

/** Lecture locale du fichier (FileReader : compatible avec tous les navigateurs). */
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

type PartieDonnees = 'export' | 'import' | 'demo' | 'reset';

export function DataSection({
  compact = false,
  parts = compact ? ['import', 'demo'] : ['export', 'import', 'demo', 'reset'],
}: {
  compact?: boolean;
  parts?: PartieDonnees[];
}) {
  const { data, dispatch, notify, today, profilActif, profils } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<AppData | null>(null);
  const [demo, setDemo] = useState<DemoProfile>('etudiant');
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetText, setResetText] = useState('');
  const hasData = !!data.profile;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      notify('Fichier trop volumineux (10 Mo maximum).', 'erreur');
      return;
    }
    let text = '';
    try {
      text = await readFileText(file);
    } catch {
      notify('Impossible de lire ce fichier.', 'erreur');
      return;
    }
    const result = parseBackup(text);
    if (fileRef.current) fileRef.current.value = '';
    if (!result.ok) {
      notify(`Import impossible : ${result.error}`, 'erreur');
      return;
    }
    if (!result.data.profile) {
      notify('Import impossible : la sauvegarde ne contient pas de profil.', 'erreur');
      return;
    }
    if (hasData) setPendingImport(result.data);
    else applyImport(result.data);
  };

  const applyImport = (imported: AppData) => {
    dispatch({ type: 'replace', data: imported });
    setPendingImport(null);
    notify('Sauvegarde importée avec succès.');
    navigate('/');
  };

  const loadDemo = () => {
    const d = buildDemoData(demo, today);
    dispatch({ type: 'replace', data: { ...d, settings: data.settings } });
    setConfirmDemo(false);
    notify('Données de démonstration chargées.');
    navigate('/');
  };

  return (
    <>
      {parts.includes('export') && (
        <Card title="Sauvegarder mes données">
          <p className="muted">Les fichiers sont créés sur votre appareil : rien n’est envoyé sur Internet.</p>
          <p className="backup-status">
            Dernière sauvegarde complète :{' '}
            <strong>{data.settings.lastBackup ? `le ${formatDate(data.settings.lastBackup)}` : 'aucune pour l’instant'}</strong>
          </p>
          {(!data.settings.lastBackup || dayDiff(data.settings.lastBackup, today) > 30) && (
            <Notice tone="attention">
              Pensez à télécharger une sauvegarde complète : si les données du navigateur sont effacées, elle permet de tout retrouver.
            </Notice>
          )}
          <div className="button-row">
            <Button
              icon="download"
              onClick={() => {
                downloadFile(`soldeclair-transactions-${today}.csv`, exportCSV(data, today), 'text/csv;charset=utf-8');
                notify('Export CSV téléchargé.');
              }}
            >
              Transactions (CSV)
            </Button>
            <Button
              icon="download"
              onClick={() => {
                // La sauvegarde porte sa propre date : une restauration retrouve exactement l'état sauvegardé.
                const aSauvegarder = { ...data, settings: { ...data.settings, lastBackup: today } };
                downloadFile(`soldeclair-sauvegarde-${today}.json`, exportJSON(aSauvegarder, today), 'application/json');
                dispatch({ type: 'setLastBackup', date: today });
                notify('Sauvegarde complète téléchargée.');
              }}
            >
              Sauvegarde complète (JSON)
            </Button>
          </div>
        </Card>
      )}

      {parts.includes('import') && (
        <Card title="Importer une sauvegarde" headingLevel={compact ? 3 : 2}>
          <p className="muted">Choisissez un fichier JSON exporté depuis SoldeClair.{hasData && ' Il remplacera les données actuelles.'}</p>
          <label className="btn btn-secondaire file-button">
            <Icon name="upload" size={18} />
            <span>Choisir un fichier JSON</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </Card>
      )}

      {parts.includes('demo') && (
        <Card title="Données de démonstration" headingLevel={compact ? 3 : 2}>
          <p className="muted">Profils entièrement fictifs avec plusieurs mois d’historique, pour découvrir l’application.</p>
          <div className="form-row">
            <SelectField label="Profil de démonstration" value={demo} onChange={(e) => setDemo(e.target.value as DemoProfile)}>
              {DEMO_PROFILES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </SelectField>
            <div className="form-actions">
              <Button variant={compact ? 'primaire' : 'secondaire'} icon="chart" onClick={() => (hasData ? setConfirmDemo(true) : loadDemo())}>
                Charger la démonstration
              </Button>
            </div>
          </div>
          <p className="field-hint">{DEMO_PROFILES.find((d) => d.id === demo)?.description}</p>
        </Card>
      )}

      {parts.includes('reset') && (
        <Card title="Effacer toutes les données" className="danger-zone">
          <p>
            Supprime définitivement {data.profile ? `le profil « ${data.profile.name} »` : 'votre profil'} : transactions, budgets et objectifs, de ce
            navigateur.{profils.length > 1 ? ' Les autres profils de cet appareil sont conservés.' : ''}
          </p>
          <Button variant="danger" icon="trash" onClick={() => setResetStep(1)}>
            Effacer toutes mes données
          </Button>
        </Card>
      )}

      {pendingImport && (
        <ConfirmDialog
          title="Remplacer les données actuelles ?"
          message="Vos données actuelles seront remplacées par la sauvegarde. Pensez à exporter vos données actuelles avant si vous souhaitez les conserver."
          confirmLabel="Importer et remplacer"
          onCancel={() => setPendingImport(null)}
          onConfirm={() => applyImport(pendingImport)}
        />
      )}
      {confirmDemo && (
        <ConfirmDialog
          title="Charger la démonstration ?"
          message="Vos données actuelles seront remplacées par des données fictives. Exportez-les avant si vous souhaitez les garder."
          confirmLabel="Charger la démonstration"
          onCancel={() => setConfirmDemo(false)}
          onConfirm={loadDemo}
        />
      )}
      {resetStep === 1 && (
        <ConfirmDialog
          title="Effacer toutes les données ?"
          message="Cette action est irréversible. Toutes vos données seront supprimées de ce navigateur."
          confirmLabel="Continuer"
          onCancel={() => setResetStep(0)}
          onConfirm={() => {
            setResetText('');
            setResetStep(2);
          }}
        />
      )}
      {resetStep === 2 && (
        <ConfirmDialog
          title="Dernière confirmation"
          message={
            <p>
              Pour confirmer, tapez <strong>EFFACER</strong> ci-dessous.
            </p>
          }
          confirmLabel="Tout effacer définitivement"
          confirmDisabled={resetText.trim().toUpperCase() !== 'EFFACER'}
          onCancel={() => setResetStep(0)}
          onConfirm={() => {
            clearData(profilActif);
            dispatch({ type: 'reset' });
            setResetStep(0);
            notify('Toutes les données ont été effacées.');
          }}
        >
          <TextField label="Confirmation" value={resetText} onChange={(e) => setResetText(e.target.value)} autoComplete="off" />
        </ConfirmDialog>
      )}
    </>
  );
}

/** Comment ajouter SoldeClair à l'écran d'accueil, comme une application (sans boutique ni compte). */
function InstallSection() {
  return (
    <Card title="Installer comme une application">
      <p className="muted">
        SoldeClair s’ouvre alors en plein écran depuis son icône, sans barre d’adresse. C’est gratuit et rien n’est envoyé sur Internet.
      </p>
      <details className="disclosure">
        <summary>Sur iPhone ou iPad (Safari)</summary>
        <div className="disclosure-body">
          <ol className="etapes-installation">
            <li>Faites d’abord une sauvegarde complète (JSON) ci-dessus.</li>
            <li>Touchez le bouton Partager (le carré avec une flèche), puis « Sur l’écran d’accueil ».</li>
            <li>Laissez activée l’option qui ouvre le site comme une app web, puis touchez « Ajouter ».</li>
            <li>
              Ouvrez SoldeClair depuis la nouvelle icône. L’application installée a sa propre mémoire : si elle est vide, choisissez
              « Importer une sauvegarde » et sélectionnez le fichier enregistré à l’étape 1.
            </li>
          </ol>
        </div>
      </details>
      <details className="disclosure">
        <summary>Sur Android (Chrome)</summary>
        <div className="disclosure-body">
          <ol className="etapes-installation">
            <li>Faites d’abord une sauvegarde complète (JSON) ci-dessus.</li>
            <li>Touchez le menu ⋮, puis « Installer l’application » (ou « Ajouter à l’écran d’accueil »).</li>
            <li>Ouvrez SoldeClair depuis la nouvelle icône ; importez la sauvegarde si l’application est vide.</li>
          </ol>
        </div>
      </details>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div className="page">
      <PageHeader title="Paramètres" description="Sauvegarde, profil, apparence et catégories." />
      <Notice>
        <strong>Confidentialité :</strong> SoldeClair fonctionne sans compte et sans serveur. Vos données sont enregistrées uniquement
        dans ce navigateur, sur cet appareil. Aucune coordonnée bancaire n’est demandée. Pensez à exporter une sauvegarde régulièrement :
        vider les données du navigateur efface aussi celles de SoldeClair.
      </Notice>
      {/* La sauvegarde d'abord : avec un stockage local, c'est la protection principale des données. */}
      <DataSection parts={['export', 'import']} />
      <InstallSection />
      <ProfileSection />
      <CalculSection />
      <ThemeSection />
      <CategoriesSection />
      <DataSection parts={['demo', 'reset']} />
    </div>
  );
}
