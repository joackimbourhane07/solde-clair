# Profils et données : analyse avant personnalisation

Objectif : que chaque personne sente que SoldeClair est **son espace**. L'interface met en avant ce qui compte
pour son profil, sans rien interdire : un étudiant qui a aussi un job salarié peut toujours ajouter une prime.

## 1. Ce que vivent les différents profils

| | Étudiant(e) | Alternant(e) / apprenti(e) | Salarié(e) | Indépendant(e) |
|---|---|---|---|---|
| **Revenus typiques** | Bourse CROUS (8 échelons, de 0 bis à 7, jusqu’à 633 €/mois **sur 10 mois** : rien en juillet-août), APL/ALS (souvent 80 à 280 €), aide familiale, job étudiant | Salaire fixé en **% du SMIC selon l’âge et l’année de contrat** (18-20 ans : 43 / 51 / 67 % ; 21-25 ans : 53 / 61 / 78 %), presque sans cotisations (brut ≈ net) ; revalorisation le mois suivant un anniversaire qui change de tranche et à chaque nouvelle année de contrat | Salaire fixe, prélèvement à la source | Chiffre d’affaires **irrégulier** ; cotisations URSSAF en % du CA (déclaration mensuelle ou trimestrielle, même à zéro) |
| **Événements de l’année** | Rentrée (frais, CVEC, caution), bourse versée de septembre à juin, été sans bourse | 13e mois si la convention ou l’entreprise le prévoit (au prorata du temps de présence), prime de partage de la valeur, participation / intéressement selon l’entreprise, **fin de contrat** (solde de tout compte : congés non pris, prorata de 13e mois) | 13e mois, primes, intéressement / participation (souvent au printemps), prime de partage de la valeur | Trimestres URSSAF, TVA éventuelle, mois creux |
| **Avantages en nature** | Repas à 1 € / tarif CROUS | Titres-restaurant (part salarié retenue sur la paie), prise en charge transport, mutuelle | Titres-restaurant, mutuelle, transport | — |
| **Épargne adaptée** | Livret Jeune (12-25 ans, 1 600 € de versements, taux ≥ Livret A), Livret A | Livret Jeune s’il a moins de 25 ans, Livret A, PEL (bloqué) | Livret A, LDDS, épargne salariale (bloquée) | **Épargne de précaution de 3 à 6 mois de charges** |
| **Ce qui compte le plus** | Reste à vivre par jour, loyer, mois d’été | Objectif de fin de contrat, échéances de paie, revalorisation | Événements annuels, épargne salariale | Lisser les revenus, provisionner les cotisations |

Points de vigilance (sources principalement non officielles, à vérifier sur service-public.fr, urssaf.fr, caf.fr, economie.gouv.fr) :
- le 13e mois **n’est pas une obligation légale** : il dépend de la convention collective, d’un accord ou du contrat ;
- le montant du SMIC de référence varie selon la date et le territoire (certains départements d’outre-mer ont un SMIC spécifique) ;
- le PEL ne permet aucun retrait partiel : tout retrait clôture le plan.

## 2. Comment l’interface s’adapte (mettre en avant, sans interdire)

| Élément | Étudiant | Alternant | Salarié | Indépendant |
|---|---|---|---|---|
| Revenus suggérés à ajouter | Bourse (10 mois), APL, aide familiale, job | Salaire d’apprenti, aide au permis, titres-restaurant | Salaire, titres-restaurant | Chiffre d’affaires du mois |
| Revenus attendus proposés | Job d’été, rentrée | 13e mois, prime de partage de la valeur, participation / intéressement, solde de tout compte | 13e mois, primes, intéressement / participation | Factures en attente |
| Repères sur l’accueil | Été sans bourse, reste à vivre par jour | Fin de contrat (compte à rebours), prochaine revalorisation | Prochain versement annuel | Réserve de précaution (en mois de charges), cotisations à prévoir |
| Supports d’épargne suggérés | Livret Jeune, Livret A | Livret Jeune (< 25 ans), Livret A, PEL | Livret A, LDDS, épargne salariale | Livret A (réserve) |
| Questions de Poksy | Bourse, APL, été | Fin de contrat, 13e mois, chèques déjeuner | Primes, épargne salariale | Revenus irréguliers, URSSAF |

## 3. Les données d’un(e) alternant(e) type face aux champs de SoldeClair

| Donnée | Existait avant | Ajouté dans cette version |
|---|---|---|
| Prénom, devise, situation (alternant) | ✅ | — |
| Date de naissance | ❌ | ✅ (âge : Livret Jeune, tranche de salaire apprenti) |
| Formation, entreprise, dates du contrat, territoire | ❌ | ✅ (fin de contrat, solde de tout compte) |
| Salaire net récurrent | ✅ revenu récurrent | — |
| Détail du bulletin (brut, cotisations, retenues, indemnité transport) | ❌ | ✅ détail facultatif du revenu |
| Chèques déjeuner mensuels (avantage, non encaissé) | ⚠️ carte restaurant, mais comptée dans les revenus | ✅ « avantage en nature » : à part, « pouvoir d’achat alimentaire » |
| Revenus exceptionnels reçus | ✅ | — |
| Revenus **attendus** (montant incertain ou inconnu) | ❌ | ✅ statut « attendu », fourchette, case « inclure » |
| Participation au foyer (charge fixe) | ✅ | — |
| Dépenses personnelles (budget) | ✅ | — |
| Voyage planifié (hébergement prélevé à l’avance, budget sur place) | ⚠️ dépenses futures possibles | ✅ dépenses datées marquées « exceptionnelles », comptées à part dans la projection |
| Dépôt de garantie (bloqué puis rendu) | ❌ | ✅ « immobilisation temporaire » |
| Supports d’épargne (PEL, Livret A, compte courant non affecté) : montant, taux, liquidité, blocage | ❌ | ✅ |
| Épargne totale / épargne disponible | ❌ | ✅ deux chiffres distincts |
| Objectif d’épargne daté (fin de contrat) | ✅ | — |
| Répartition cible par support (Livret Jeune, Livret A, PEL) | ❌ | ✅ |
| Épargne mensuelle nécessaire | ✅ | recalcul dynamique depuis les supports |
| Projection mois par mois jusqu’à l’objectif (base / optimiste) | ⚠️ estimation à 30 jours | ✅ |
| Saisie mensuelle (épargné réel, dépenses réelles, revenus reçus) | ⚠️ opération par opération | ✅ bilan du mois guidé |
| Réinitialiser aux données de départ | ⚠️ démonstration, effacement | ✅ « point de départ » enregistré sur l’appareil |

Le format du fichier qui permet de remplir tous ces champs d'un coup est décrit dans
[format-sauvegarde.md](format-sauvegarde.md) (exemple fictif : [exemple-sauvegarde-fictive.json](exemple-sauvegarde-fictive.json)).

## 4. Données réelles : jamais dans le code

Le site est public. Des données placées dans le code (même comme « données initiales ») seraient visibles par
tout visiteur. Les données réelles doivent donc passer par **un fichier de sauvegarde gardé sur l’ordinateur**
(importé avec « Importer une sauvegarde »), ou être saisies dans l’application. Le bouton
« Réinitialiser aux données par défaut » revient à ce point de départ, enregistré uniquement sur l’appareil.

## Sources

- Salaire apprenti : [Digischool](https://www.digischool.fr/articles/orientation/alternance/salaire-apprenti-2026/), [Salerya](https://salerya.fr/bulletin/apprentissage-salaire-smic-27-53-100-pourcent/), [TPE Actu](https://tpeactu.fr/2026/02/10/salaire-apprentis-2026/)
- Budget étudiant, bourse, APL : [Nomad Éducation, échelons 2026](https://www.nomadeducation.fr/blog/articles/2026-03-13/bourse-crous-2026-montant-echelons), [CIDJ](https://www.cidj.com/bien-vivre/sa-consommation/budget-etudiant-comment-maitriser-ses-depenses-toute-l-annee), [Aide-sociale.fr](https://www.aide-sociale.fr/aides-logement-etudiant/)
- 13e mois, primes : [Tissot](https://www.editions-tissot.fr/guide/definition/prime-de-13e-mois), [Culture RH](https://culture-rh.com/calcul-prime-13eme-mois-conditions-obtention-traitement-paie), [Hayot Expertise](https://hayot-expertise.fr/blog/treizieme-mois-prime-annuelle-calcul-prorata)
- Indépendants : [Bpifrance Création](https://bpifrance-creation.fr/encyclopedie/micro-entreprise-regime-auto-entrepreneur/fiscal-social-comptable/comment-payer-ses), [Adie](https://www.adie.org/fiches-pratiques/comment-payer-mes-cotisations-sociales)
- Livret Jeune, Livret A : [Bercy Infos](https://www.economie.gouv.fr/particuliers/gerer-mon-argent/gerer-mon-budget-et-mon-epargne/livret-jeune-quelles-sont-ses-caracteristiques)
