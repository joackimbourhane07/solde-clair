# Format du fichier de sauvegarde SoldeClair

Ce document décrit le fichier JSON que SoldeClair exporte (Paramètres → « Sauvegarde complète ») et qu'il
accepte à l'import (Paramètres → « Importer une sauvegarde », ou « Importer » lors de la configuration).
Il permet de **préparer ses données sur son ordinateur**, à la main ou avec un assistant de code, puis de
les importer dans l'application.

> **Confidentialité.** Le dépôt et le site sont publics. Un fichier contenant de vraies données ne doit
> **jamais** être ajouté au dépôt Git : gardez-le dans un dossier `mes-donnees/` (ignoré par Git) ou
> ailleurs sur l'ordinateur. Le fichier ne contient aucune donnée bancaire sensible : pas d'IBAN, pas de
> numéro de carte, pas d'identifiant ni de mot de passe. N'en ajoutez pas.

Exemple complet, **entièrement fictif** : [exemple-sauvegarde-fictive.json](exemple-sauvegarde-fictive.json)
(il est importé dans les tests automatiques, il reste donc toujours valide).

## Règles générales

| Règle | Détail |
| --- | --- |
| Enveloppe | `{ "application": "SoldeClair", "exporteLe": "AAAA-MM-JJ", "donnees": { … } }` (les données seules, sans enveloppe, sont aussi acceptées). |
| Version | `"version": 1` dans `donnees`. |
| Montants | **En centimes entiers** : 712,35 € → `71235`. Jamais de virgule ni de point. |
| Dates | Texte `"AAAA-MM-JJ"`. |
| Identifiants | Texte libre et unique dans sa liste (ex. `"rev-salaire"`). Les liens entre éléments (catégorie, objectif, support) utilisent ces identifiants. |
| Champs facultatifs | Peuvent être omis. Un champ inconnu est ignoré. |
| Import | Le fichier est vérifié avant tout : en cas d'erreur, un message indique l'élément en cause (ex. « Revenu n° 3 invalide ») et rien n'est remplacé. |

## `profile` : le profil

| Champ | Type | Description |
| --- | --- | --- |
| `name` | texte | Prénom ou pseudonyme. |
| `type` | `etudiant`, `alternant`, `salarie`, `independant`, `autre` | Adapte les repères, suggestions et libellés. |
| `currency` | texte | `"EUR"`. |
| `monthlySavingsTarget` | centimes | Objectif d'épargne mensuel. |
| `variableEstimate` | centimes | Budget des dépenses courantes par mois (sert aussi à la projection). |
| `createdAt` | date | Date de création. |
| `birthDate` | date, facultatif | Âge : Livret Jeune, tranche du salaire d'apprenti. |
| `situation` | objet, facultatif | `formation`, `employeur`, `debut`, `fin` (dates), `territoire`. Pour un alternant : formation, entreprise, dates du contrat. |

## `settings` : réglages

`{ "theme": "light", "appearanceVersion": 2, "presetsVersion": 3 }` suffit. Facultatifs : `carryOver`
(report du reste d'un mois, `true` par défaut), `incomeShiftDay` (jour à partir duquel un revenu compte
pour le mois suivant, 20 par défaut ; `null` pour désactiver).

## `categories`

`{ "id", "name", "kind", "budget" }` avec `kind` = `income` (revenus), `fixed` (charges fixes) ou
`variable` (dépenses), et `budget` = limite mensuelle en centimes pour une catégorie `variable` (sinon `null`).
Une catégorie de revenus nommée « Carte restaurant » (ou « Titres-restaurant », « Chèques déjeuner »…)
envoie ses revenus sur la carte restaurant.

## `incomes` : revenus

| Champ | Description |
| --- | --- |
| `id`, `name`, `amount`, `date`, `categoryId`, `note` | Obligatoires (`note` peut être vide). Pour un revenu récurrent, `date` est le premier versement. |
| `recurring`, `frequency`, `endDate` | `recurring: true` + `frequency` (`hebdomadaire`, `mensuel`, `trimestriel`, `annuel`…) + date de fin facultative ; sinon `recurring: false`, `frequency: null`. |
| `account` | `compte` (compte bancaire) ou `carte-restaurant`. |
| `details` | Facultatif : lignes du bulletin de paie `{ "label", "amount" }`, **montants signés** (retenue négative). Leur total devrait égaler `amount`. |
| `certitude` | `"attendu"` pour un revenu **pas encore sûr** (prime non confirmée, 13e mois, solde de tout compte). Absent : revenu sûr. Un revenu attendu n'est compté nulle part tant qu'il n'est pas confirmé (bouton « Reçu »). |
| `amountMax` | Revenu attendu : haut de la fourchette (`amount` en est le bas). |
| `amountUnknown` | Revenu attendu dont le montant est inconnu (`amount: 0`). |
| `inOptimistic` | Revenu attendu inclus dans la projection optimiste. |

Les **titres-restaurant** sont un revenu récurrent sur `carte-restaurant` : SoldeClair les affiche comme
« pouvoir d'achat alimentaire », à part des revenus encaissés.

## `fixedCharges` : charges fixes

`{ "id", "name", "amount", "date", "categoryId", "frequency", "endDate", "note", "status": {} }`.
`date` est le premier prélèvement ; `status` peut rester vide (passé = payé, futur = à venir).

## `expenses` : dépenses

`{ "id", "amount", "categoryId", "date", "description", "paymentMethod" }` + `exceptional: true` pour une
**dépense exceptionnelle** (voyage, gros achat) : comptée dans le solde, mais séparée des dépenses courantes
dans la projection. Une dépense future (prélèvement prévu) peut être saisie à sa date.

## `goals` : objectifs d'épargne

`{ "id", "name", "description", "target", "initialAmount", "targetDate", "priority", "monthlyContribution", "createdAt" }`,
`priority` = `haute`, `moyenne` ou `basse`. Avec `supportIds` (liste d'identifiants de supports),
l'avancement de l'objectif est **le total de ces supports** (« tous supports confondus ») : c'est l'objectif
suivi dans « Mon plan d'épargne ».

## `savings` : versements d'épargne

`{ "id", "goalId", "amount", "date", "note" }` + `supportId` facultatif : le versement augmente le solde de
ce support (s'il est postérieur à sa `balanceDate`). Il est retiré du solde de « Mon compte ».

## `supports` : supports d'épargne

| Champ | Description |
| --- | --- |
| `id`, `name` | Identifiant et nom affiché. |
| `kind` | `livret-a`, `ldds`, `livret-jeune`, `lep`, `pel`, `cel`, `assurance-vie`, `pea`, `epargne-salariale`, `compte-courant`, `autre`. |
| `balance`, `balanceDate` | Solde connu à cette date (centimes). |
| `rate` | Taux annuel en % (nombre, ex. `1.7`). |
| `liquidity` | `immediate` ou `bloque`. Un support bloqué compte dans l'épargne **totale**, pas dans l'épargne **disponible**. |
| `blockedUntil` | Date de fin de blocage, ou `null`. |
| `withdrawalCloses` | `true` si un retrait clôture le support (PEL). |
| `ceiling`, `target` | Plafond de versements et montant visé sur ce support (répartition de l'objectif), ou `null`. |
| `note` | Texte libre. |

## `holds` : sommes bloquées temporairement

`{ "id", "label", "amount", "start", "end", "account", "returned", "note" }` : caution, dépôt de garantie…
**Ce n'est pas une dépense** : le solde ne change pas, mais « Mon compte » indique la part bloquée entre
`start` et `end`, jusqu'à ce que `returned` soit `true` (bouton « Rendu »).

## `adjustments`

Ajustements du solde (onglet Compte). Laissez la liste vide : après l'import, utilisez « Ajuster le solde »
dans « Mon compte » pour indiquer le solde réel affiché par la banque.

## Vérifier un fichier avant de l'importer

1. Tous les montants sont des entiers en centimes, toutes les dates au format `AAAA-MM-JJ`.
2. Chaque `categoryId`, `goalId`, `supportId` et chaque identifiant de `supportIds` existe.
3. Les lignes `details` d'un revenu ont pour total son `amount`.
4. Le fichier n'est **pas** dans un dossier suivi par Git (`git status` ne doit pas le montrer).
5. Importez-le : s'il y a une erreur, le message dit quel élément corriger. Le fichier importé devient le
   point de départ (Paramètres → « Point de départ »).
