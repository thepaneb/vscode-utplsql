<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · **Français** · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

Intègre [utPLSQL](https://www.utplsql.org/) dans VSCode, apportant les tests PL/SQL à l'**Explorateur de tests** natif, avec menu contextuel et couverture visuelle.

- 🧪 **Explorateur de tests natif** — les suites et les tests apparaissent dans la vue de test ; exécutez par test, suite, fichier ou dossier.
- 🔍 **CodeLens** — boutons Exécuter/Exécuter avec couverture au-dessus des `%suite` et `%test` dans l'éditeur, sans quitter votre code.
- ⌨️ **Raccourcis clavier** — préfixe `Ctrl+Shift+U` + touche pour les commandes principales (R = Tout exécuter, T = Exécuter le fichier, L = Réexécuter le dernier, etc.).
- 🖱️ **Menu contextuel** — clic droit sur un **dossier** ou un fichier **`.pks`/`.pkb`** (dans l'Explorateur ou dans l'éditeur) pour exécuter les tests.
- 📊 **Couverture visuelle** — gouttières colorées par ligne (couvert/non couvert) et pourcentage par fichier dans l'onglet **Couverture**.
- ✅ **Décorations en ligne** — icônes ✓/✗/⚠ dans l'éditeur après l'exécution, avec infobulle d'échec et règle d'aperçu.
- 📌 **Barre d'état** — indicateur avec nombre de réussites/échecs, durée et progression en temps réel.
- 🔁 **Ré-exécution intelligente** — Réexécuter le dernier, Exécuter sous le curseur, Exécuter uniquement les échecs avec un seul raccourci.
- 🚀 **Oracle direct (via node-oracledb)** — streaming en temps réel, sans attendre la fin du lot.
- 🔧 **Diagnostics de configuration** — validation proactive de la connexion, des privilèges (grants) et de la version avec action rapide.
- 🧩 **Arborescence tenant compte du schéma** — organisez les tests par Schéma > Package > Suite > Test dans l'Explorateur de tests.
- 🎯 **Accès direct à l'échec** — navigation directe vers la ligne de l'assertion ayant échoué (via « Go to Error » natif).
- 🔌 **Profils de connexion** — enregistrez et basculez entre plusieurs environnements (DEV/TEST/PROD) avec des paramètres par profil, via la barre d'état ou la palette de commandes.
- 📈 **Couverture des instructions et des vues** — l'onglet Couverture affiche le `% d'instructions` (PROCEDURE/FUNCTION) par fichier et suit les vues exécutées via `V$SQL`.
- 🐛 **Débogage PL/SQL** — points d'arrêt et débogage pas à pas des tests utPLSQL via `DBMS_DEBUG` (adaptateur de débogage natif).
- 🌍 **i18n — 24 langues** — `utplsql.language` suit VSCode (15 natives + 9 communautaires : pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Installation

L'extension peut être installée de deux manières :

1. **Depuis le Marketplace :** recherchez **utPLSQL Test Runner** dans le panneau des extensions VSCode (`Ctrl+Shift+X`) et cliquez sur **Installer**.
2. **Manuellement (.vsix) :** téléchargez le fichier `.vsix` de la version souhaitée et installez-le dans VSCode :
   * **Via la ligne de commande :** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Via l'interface :** ouvrez le panneau Extensions (`Ctrl+Shift+X`), cliquez sur les trois points `...` (coin supérieur droit) et sélectionnez **Installer à partir du VSIX...**.

## Prérequis

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** installé dans la base de données Oracle.
- **VSCode 1.88+** (API Test Coverage).

L'extension se connecte directement à la base de données Oracle via `node-oracledb` (pilote thin, sans Instant Client). Le VSIX inclut déjà le paquet `oracledb`.

## Connexion

L'extension a besoin d'une chaîne de connexion Oracle pour exécuter les tests. La résolution suit cet ordre :

1. **Profil de connexion actif** — `utplsql.activeProfile` pointant vers un profil de `utplsql.profiles` (remplace tout ce qui suit).
2. **Paramètre `utplsql.connection`** — lu depuis le `settings.json` du projet/utilisateur.
3. **Variable d'environnement `UTPLSQL_CONN`** — définie avant d'ouvrir VSCode.
4. **Cache de session** — si l'utilisateur a déjà saisi la connexion via l'invite.
5. **Invite à l'utilisateur** — demande la connexion et ne la conserve que pour la session en cours.

Les profils de connexion (`utplsql.profiles`) peuvent également remplacer `sourcePath`, `coverageOwner`, etc. par environnement — voir `utplsql.activeProfile` dans le tableau de configuration.

⚠️ **Recommandation de sécurité :** la chaîne de connexion contient un mot de passe. **N'UTILISEZ PAS** le
paramètre `utplsql.connection` dans les environnements partagés (settings.json peut être versionné ou visible
par d'autres). Utilisez plutôt **la variable d'environnement `UTPLSQL_CONN`** :

```powershell
# PowerShell
$env:UTPLSQL_CONN = "user/password@//host:1521/service"
code .
```

```bash
# Bash
export UTPLSQL_CONN="user/password@//host:1521/service"
code .
```

Si ni le paramètre ni la variable d'environnement ne sont définis, l'extension demande la connexion et ne la
conserve qu'en mémoire pendant la session — utilisez la commande
**utPLSQL: Clear session connection** (palette de commandes) pour l'effacer.

**Formats acceptés :**
- **EZ Connect** : `user/pass@//host:1521/service`
- **Alias TNS** : `user/pass@tns_alias` (nécessite `TNS_ADMIN` configuré)
- **Wallet (Oracle Cloud)** : `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Fonctionnement

L'extension se connecte directement à la base de données Oracle via `node-oracledb`, diffuse les résultats en temps réel et les traduit dans les API natives de VSCode.

![Mode Oracle direct — streaming](docs/wiki/images/diagram-streaming.png)

Pas de fichiers temporaires, pas d'attente de la fin du lot. Les résultats apparaissent dans
l'Explorateur de tests **au fur et à mesure que chaque test se termine**.

## Configuration

| Paramètre | Défaut | Description |
|---|---|---|
| `utplsql.connection` | `""` | Connexion Oracle. **Laissez vide** et utilisez la variable d'environnement `UTPLSQL_CONN` pour éviter de stocker le mot de passe. Si les deux sont vides, l'extension demande la connexion (conservée uniquement pour la session). |
| `utplsql.sourcePath` | `install` | Dossier du code de production (pour mapper la couverture vers les fichiers). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs pour découvrir les specs contenant `%suite`/`%test`. Si vos tests sont dans des `.sql`, utilisez `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Schéma propriétaire des objets couverts. Vide = utilise l'utilisateur de la connexion (en majuscules). |
| `utplsql.timeoutMinutes` | `60` | Délai d'expiration en minutes pour l'exécution des tests. |
| `utplsql.dbmsOutput` | `false` | Active `DBMS_OUTPUT` dans la session de test. Utile pour le débogage. |
| `utplsql.additionalReporters` | `[]` | Reporters supplémentaires à inclure à chaque exécution (par ex. `["ut_coverage_html_reporter"]`). Les reporters par défaut (documentation, junit, coverage) sont toujours inclus et n'ont pas besoin d'être listés. |
| `utplsql.codeLens.enabled` | `true` | Affiche les boutons CodeLens Exécuter/Exécuter avec couverture au-dessus des `%suite` et `%test`. |
| `utplsql.statusBar.enabled` | `true` | Affiche l'indicateur d'état des tests dans la barre d'état. |
| `utplsql.decorations.enabled` | `true` | Affiche les décorations réussite/échec sur les lignes `%suite` et `%test` après l'exécution. |
| `utplsql.oraclePoolMin` | `2` | Nombre minimum de connexions conservées dans le pool du runner Oracle (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Nombre maximum de connexions dans le pool du runner Oracle (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Incrément lors de l'expansion du pool du runner Oracle (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Secondes entre les vérifications de santé des connexions inactives du pool (node-oracledb). `0` = ping à chaque extraction. |
| `utplsql.organization` | `file` | Organisation de l'arborescence : `file` (par chemin) ou `schema` (Schéma > Package > Suite > Test). En mode `schema`, les suites sont également découvertes depuis la base de données (`ALL_OBJECTS`/`ALL_SOURCE`) lorsque les fichiers `.pks` ne sont pas dans l'espace de travail — avec l'URI virtuel `utplsql-db:/` (sans CodeLens/décorations/accès direct à l'échec). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob pour extraire le schéma du chemin. Utilisez `{schema}` comme espace réservé. En mode `schema`, les dossiers sous la base du motif (par ex. `db/*`) définissent les schémas interrogés dans la base de données. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Affiche les erreurs de compilation PL/SQL comme soulignements dans l'éditeur et le panneau Problèmes. |
| `utplsql.setupDiagnostics.enabled` | `true` | Affiche les diagnostics de configuration (connexion, privilèges, version) et **l'intégrité de l'installation utPLSQL** (objets invalides dans le schéma UT3, avec action rapide « Recompile UT3 ») avec des actions rapides. |
| `utplsql.profiles` | `[]` | Profils de connexion Oracle enregistrés (nom, connexion et remplacements de `sourcePath`/`coverageOwner`/etc.) pour basculer entre les environnements. |
| `utplsql.activeProfile` | `""` | ID du profil actif (`utplsql.profiles`). Lorsqu'il est défini, remplace `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Suit les vues exécutées via `V$SQL` (couverture booléenne). Nécessite `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Active le débogage des tests PL/SQL (`DBMS_DEBUG`). Nécessite `node-oracledb` + privilèges. |
| `utplsql.debugger.stopOnException` | `true` | Pause sur les exceptions PL/SQL pendant le débogage. |
| `utplsql.debugger.timeoutSeconds` | `300` | Délai d'expiration (s) de la session de débogage. |
| `utplsql.language` | `auto` | Langue des messages d'exécution. `auto` suit VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb ; sinon en). Couvre les **24 locales** (15 natives + 9 communautaires). |

Exemple (`.vscode/settings.json` du projet) :

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

Et, avant d'ouvrir VSCode (ou dans le profil PowerShell) :

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Pour les contributeurs

Créez un fichier `.env` à la racine du projet (gitignoré) avec les variables
d'environnement utilisées par les tests d'intégration :

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Utilisation

1. Ouvrez le projet PL/SQL (avec le code et les packages de test).
2. Compilez le code et les tests dans la base de données (extension Oracle / SQLcl).
3. Ouvrez la vue **Testing** → les suites apparaissent.
4. Exécutez :
   - Via **CodeLens** — boutons ▶ Exécuter/Exécuter avec couverture au-dessus de chaque `%suite` et `%test` dans l'éditeur.
   - Via la **gouttière** à côté de chaque test/suite, ou
   - Via les **raccourcis clavier** (`Ctrl+Shift+U R` = Tout exécuter, `Ctrl+Shift+U T` = Exécuter le fichier, etc.), ou
   - Le bouton **Exécuter les tests** de la vue Explorateur de tests, ou
   - **Clic droit** sur un dossier/fichier → *utPLSQL: Run tests…* (avec ou sans couverture).
5. Après l'exécution, consultez :
   - **Décorations en ligne** (✓/✗/⚠) dans l'éditeur à côté des annotations de test.
   - **Barre d'état** avec le nombre de réussites/échecs et la durée totale.
   - **Explorateur de tests** avec les résultats détaillés.
6. Pour la couverture, utilisez le profil **Exécuter avec couverture** (ou l'élément de menu « avec couverture »).
7. Pour répéter rapidement les exécutions :
   - `Ctrl+Shift+U L` — **Réexécuter le dernier** (répète la dernière exécution, avec ou sans couverture).
   - `Ctrl+Shift+U U` — **Exécuter sous le curseur** (exécute le `%test`/`%suite` sous le curseur).
   - `Ctrl+Shift+U X` — **Exécuter uniquement les échecs** (exécute uniquement les tests ayant échoué).
8. Pour les diagnostics, utilisez `utPLSQL: Show information` dans la palette — affiche les versions API/DB avec une option de copie.
9. **utPLSQL: Select additional reporter...** — QuickPick avec les reporters disponibles dans la base de données.
10. **utPLSQL: Cancel execution** — arrête l'exécution en cours (`Escape` pendant l'exécution).
11. **utPLSQL: Refresh tests** — force la redécouverte des `.pks`.

> 💡 **Lors de l'écriture des tests :** le parseur est piloté par les jetons — il suffit d'avoir `%suite`
> et la déclaration `create package` dans le fichier, ainsi que chaque `%test` suivi de son
> `PROCEDURE`. Aucune ligne vide n'est requise.

### Annotations prises en charge (v0.10.0+)

En plus de `%suite` et `%test`, la découverte comprend :

| Annotation | Effet sur l'Explorateur de tests |
|---|---|
| `-- %disabled` | Suite ou test **n'apparaît pas** dans l'arborescence (ignoré lors de la découverte) |
| `-- %throws(-20001)` | Indique que le test s'attend à l'exception 20001 (métadonnée `expectedError`) |
| `-- %tags(fast, critical)` | Balises du test (métadonnées ; le filtrage par balise est prévu) |
| `-- %displayname(Name)` | Nom personnalisé affiché à la place de la description du `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Marque la suite avec des hooks de cycle de vie (métadonnées) |

Les annotations sont insensibles à la casse. Dans l'en-tête de la suite (entre `%suite` et le
premier `%test`), elles s'appliquent à la suite ; après `%test`, elles s'appliquent au test.

## Commandes

Toutes les commandes de l'extension (palette `Ctrl+Shift+P` préfixe `utPLSQL:`) :

| Commande | Description | Raccourci d'interface |
|---|---|---|
| `utPLSQL: Run all tests` | Exécute toutes les suites de l'espace de travail | Bouton ▶ de la vue Testing |
| `utPLSQL: Run tests in this file` | Exécute les suites du `.pks`/`.pkb` actif | Clic droit → fichier |
| `utPLSQL: Run tests in this file with coverage` | Identique, avec profil de couverture | Clic droit → fichier |
| `utPLSQL: Run tests in this folder` | Exécute les suites du dossier sélectionné | Clic droit → dossier |
| `utPLSQL: Run tests in this folder with coverage` | Identique, avec profil de couverture | Clic droit → dossier |
| `utPLSQL: Refresh tests` | Force la redécouverte des `.pks` | — |
| `utPLSQL: Cancel execution` | Arrête l'exécution en cours | — |
| `utPLSQL: Show utPLSQL information` | Versions API/DB avec option de copie | — |
| `utPLSQL: Select additional reporter...` | QuickPick avec les reporters de la base | — |
| `utPLSQL: Clear session connection` | Supprime la connexion du cache de session | — |
| `utPLSQL: Rerun Last` | Répète la dernière exécution | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Exécute le test sous le curseur | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Ré-exécute uniquement les tests ayant échoué | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Lance la validation complète de la configuration (connexion, installation UT3) et affiche les résultats | — |
| `utPLSQL: Configure connection` | Ouvre les paramètres sur `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Copie le SQL des privilèges dans le presse-papiers | — |
| `utPLSQL: Show Test Explorer` | Met la vue Testing au premier plan | — |
| `utPLSQL: Switch connection profile...` | Bascule le profil de connexion actif (QuickPick) | Clic sur la barre d'état (avec profil actif) |
| `utPLSQL: New connection profile...` | Assistant pour créer et activer un profil | — |
| `utPLSQL: Manage connection profiles` | Ouvre les paramètres sur `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Importe les connexions depuis SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Démarre une session de débogage du test du fichier actif | — |

> **Recompile UT3** (`utplsql.recompileUt3`) **n'est pas** une commande de palette — c'est
> une action rapide interne du diagnostic « utPLSQL Setup » (objets invalides dans le
> schéma utPLSQL).

## Raccourcis clavier

Tous les raccourcis utilisent le préfixe `Ctrl+Shift+U` (`Cmd+Shift+U` sur Mac) :

| Raccourci | Commande |
|---|---|
| `Ctrl+Shift+U R` | Exécuter tous les tests |
| `Ctrl+Shift+U T` | Exécuter les tests du fichier |
| `Ctrl+Shift+U Shift+T` | Exécuter les tests du fichier avec couverture |
| `Ctrl+Shift+U F` | Actualiser les tests |
| `Ctrl+Shift+U I` | Afficher les informations utPLSQL |
| `Ctrl+Shift+U C` | Effacer la connexion de session |
| `Ctrl+Shift+U L` | Réexécuter le dernier |
| `Ctrl+Shift+U U` | Exécuter sous le curseur |
| `Ctrl+Shift+U X` | Exécuter uniquement les échecs |
| `Escape` | Annuler l'exécution |

## Couverture

- Les lignes **exécutées** deviennent vertes dans la gouttière ; les lignes **non exécutées** deviennent rouges.
- L'onglet **Test Coverage** affiche le **pourcentage par fichier/dossier**.

<p align="center">
  <img src="images/image1.png" alt="Couverture" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Explorateur de tests" width="600" height="400">
</p>

La couverture est collectée via `ut_file_mapper.build_file_mappings()` et rapportée via
`ut_coverage_cobertura_reporter`. L'extension mappe les objets couverts vers les fichiers sources
automatiquement en utilisant le paramètre `utplsql.sourcePath` et le schéma `utplsql.coverageOwner`.

## Reporters

L'extension inclut toujours trois reporters par défaut :
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (résultats → Explorateur de tests) et
`ut_coverage_cobertura_reporter` (couverture, si disponible).

**Validation dynamique** — avant d'exécuter avec couverture, l'extension interroge
la base de données via `ALL_OBJECTS` pour vérifier que `UT_COVERAGE_COBERTURA_REPORTER`
existe. Si ce n'est pas le cas (par ex. utPLSQL
obsolète), la couverture est ignorée avec un avertissement dans la sortie. L'exécution des tests
n'est jamais bloquée.

**Reporters fixes supplémentaires** — paramètre `utplsql.additionalReporters` :
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Les trois reporters par défaut sont automatiquement dédupliqués, même s'ils sont
listés ici.

**Reporter volatil par session** — commande **utPLSQL: Select additional
reporter...** ouvre un QuickPick avec la liste dynamique de la base de données. Le
reporteur choisi est utilisé à la prochaine exécution puis abandonné (ne persiste
pas dans les paramètres).

## Prérequis de la base de données

**Couverture** (toujours) — active le profileur :
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Sans cela, les tests s'exécutent mais la couverture ressort **vide**.

**Découverte des tests dans d'AUTRES schémas** (installation **partagée** d'utPLSQL, par ex. propriétaire `UT3`) :
pour que le framework voie et analyse les tests des schémas applicatifs, le propriétaire d'utPLSQL doit
**lire le dictionnaire** de ces schémas :
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` seul n'est PAS suffisant** — il faut les privilèges **directs** sur ces vues
  (à cause de `dbms_assert.sql_object_name` en contexte définisseur).
- Le **trigger DDL** d'utPLSQL doit également être installé (maintient le cache d'annotations à jour).
- Vérification (en tant que propriétaire) : `SELECT ut_metadata.get_source_view_name FROM dual;` doit retourner `dba_source`.

> Dans les installations **par schéma** (utPLSQL dans le même schéma que les tests), ces privilèges
> inter-schémas **ne sont pas** nécessaires — le framework lit sa propre source.

## Limitations connues

- Le mapping résultat→test se fait par nom de package + nom/description du test ;
  des descriptions identiques dans des packages différents peuvent créer une ambiguïté (l'index est
  limité au package pour minimiser cela).
- Considère le **premier** dossier de l'espace de travail pour résoudre `sourcePath`.
- La découverte lit les `.pks` (spécifications) ; conservez les annotations `%suite`/`%test` dans la spec.

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Les suites n'apparaissent pas | Problème de connexion | Exécutez `utPLSQL: Validate configuration` pour obtenir des diagnostics |
| Couverture vide | `GRANT EXECUTE ON DBMS_PROFILER` manquant | Exécutez les privilèges de [Prérequis de la base de données](#prérequis-de-la-base-de-données) ou utilisez `utPLSQL: Copy coverage grants to clipboard` |
| Couverture vide | Oracle 19c nécessite des privilèges supplémentaires | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Erreur de compilation sans indication | Code avec erreur de syntaxe PL/SQL | Activez `utplsql.compilationDiagnostics.enabled` (activé par défaut) ; voir le panneau Problèmes |
| Erreur de connexion | Chaîne mal formée ou base inaccessible | Utilisez `utPLSQL: Validate configuration` |
| Délai d'expiration pendant l'exécution | Les tests prennent plus de temps que `timeoutMinutes` | Augmentez `utplsql.timeoutMinutes` |
| `%suite` non reconnu | `%suite`/`create package` manquant dans le fichier, ou `%test` sans `PROCEDURE` | Vérifiez la spec ; exécutez `utPLSQL: Refresh tests` |
| CodeLens n'apparaît pas | `editor.codeLens` désactivé ou conflit | Activez `"editor.codeLens": true` ; vérifiez `utplsql.codeLens.enabled` |
| Les raccourcis ne fonctionnent pas | Conflit avec une autre extension ou un raccourci VSCode | Allez dans Fichier → Préférences → Raccourcis clavier et recherchez `utplsql` pour redéfinir |

## Licence

MIT © Gil Cleber Barboza
