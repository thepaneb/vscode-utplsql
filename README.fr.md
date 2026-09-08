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
- 🔧 **Diagnostics de configuration** — validation proactive de la CLI, de la connexion, des privilèges (grants) et de la version avec action rapide.
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
- **Pour le mode CLI :** [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java** installés sur la machine (l'extension invoque la CLI).
- **Pour le mode Oracle direct :** rien d'autre que la base de données — le VSIX inclut déjà le pilote thin `oracledb` (sans Instant Client).
- **VSCode 1.88+** (API Test Coverage).

L'extension n'est que le « client graphique » — c'est la base de données qui exécute les tests : via
la CLI (utPLSQL-cli + Java) ou directement (node-oracledb, `runnerMode: auto` par défaut).

## Connexion

L'extension a besoin d'une chaîne de connexion Oracle pour exécuter les tests. La résolution suit cet ordre :

1. **Profil de connexion actif** — `utplsql.activeProfile` pointant vers un profil de `utplsql.profiles` (remplace tout ce qui suit).
2. **Paramètre `utplsql.connection`** — lu depuis le `settings.json` du projet/utilisateur.
3. **Variable d'environnement `UTPLSQL_CONN`** — définie avant d'ouvrir VSCode.
4. **Cache de session** — si l'utilisateur a déjà saisi la connexion via l'invite.
5. **Invite à l'utilisateur** — demande la connexion et ne la conserve que pour la session en cours.

Les profils de connexion (`utplsql.profiles`) peuvent également remplacer `sourcePath`, `coverageOwner`, `invocation`, `cliPath`, etc. par environnement — voir `utplsql.activeProfile` dans le tableau de configuration.

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

Deux modes d'exécution sont disponibles :

![Architecture d'exécution — deux modes](docs/wiki/images/diagram-arquitetura.png)

### Mode Oracle direct (v0.9.0) — `runnerMode: auto` ou `oracle`

![Mode Oracle direct — streaming](docs/wiki/images/diagram-streaming.png)

Pas de fichiers temporaires, pas d'attente de la fin du lot. Les résultats apparaissent dans
l'Explorateur de tests **au fur et à mesure que chaque test se termine**.

### Mode CLI — `runnerMode: cli` (repli)

![Mode CLI — lot](docs/wiki/images/diagram-cli.png)

L'extension construit la ligne de commande CLI ou se connecte via Oracle direct, lit les
rapports (JUnit + Coverage) et les traduit dans les API natives de VSCode. Le
mode `auto` (par défaut) essaie Oracle direct et retombe sur la CLI si `node-oracledb` n'est
pas installé. Utilisez `runnerMode: cli` pour toujours forcer la CLI.

## Configuration

| Paramètre | Défaut | Description |
|---|---|---|
| `utplsql.connection` | `""` | Connexion Oracle. **Laissez vide** et utilisez la variable d'environnement `UTPLSQL_CONN` pour éviter de stocker le mot de passe. Si les deux sont vides, l'extension demande la connexion (conservée uniquement pour la session). |
| `utplsql.cliPath` | `utplsql` | Chemin vers l'exécutable utPLSQL-cli (par ex. `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Dossier du code de production (pour mapper la couverture vers les fichiers). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs pour découvrir les specs contenant `%suite`/`%test`. Si vos tests sont dans des `.sql`, utilisez `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Arguments supplémentaires pour `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Schéma propriétaire des objets couverts. Vide = utilise l'utilisateur de la connexion (en majuscules). |
| `utplsql.coverageSourceArgs` | (voir **Couverture**) | Arguments CLI qui mappent la couverture vers les fichiers sources. |
| `utplsql.invocation` | `launcher` | Comment appeler la CLI : `launcher` (via `.bat`/script, par défaut) ou `java` (JVM directe, **sans shell**). Voir **Mode d'invocation**. |
| `utplsql.javaPath` | `java` | Exécutable Java (PATH ou chemin complet). Utilisé uniquement en mode `java`. |
| `utplsql.cliHome` | `""` | Racine d'utPLSQL-cli (dossier contenant `bin/` et `lib/`). Vide = dérivé de `cliPath`. Utilisé uniquement en mode `java`. |
| `utplsql.timeoutMinutes` | `60` | Délai d'expiration en minutes pour la CLI. Le drapeau `-t` n'est envoyé que si la valeur diffère de `60`. |
| `utplsql.dbmsOutput` | `false` | Active `DBMS_OUTPUT` dans la session de test. Le drapeau `-D` n'est envoyé que lorsqu'il vaut `true`. |
| `utplsql.quiet` | `false` | Supprime les journaux informatifs de la CLI. Le drapeau `-q` n'est envoyé que lorsqu'il vaut `true`. |
| `utplsql.failureExitCode` | `1` | Code de sortie en cas d'échec. Le drapeau `--failure-exit-code` n'est envoyé que si la valeur diffère de `1`. `0` fait que la CLI sort toujours avec succès. |
| `utplsql.additionalReporters` | `[]` | Reporters supplémentaires à inclure à chaque exécution (par ex. `["ut_coverage_html_reporter"]`). Les reporters par défaut (documentation, junit, coverage) sont toujours inclus et n'ont pas besoin d'être listés. |
| `utplsql.codeLens.enabled` | `true` | Affiche les boutons CodeLens Exécuter/Exécuter avec couverture au-dessus des `%suite` et `%test`. |
| `utplsql.statusBar.enabled` | `true` | Affiche l'indicateur d'état des tests dans la barre d'état. |
| `utplsql.decorations.enabled` | `true` | Affiche les décorations réussite/échec sur les lignes `%suite` et `%test` après l'exécution. |
| `utplsql.runnerMode` | `auto` | Mode d'exécution : `auto` (Oracle direct via node-oracledb, repli CLI), `cli` (toujours via la ligne de commande), `oracle` (toujours Oracle direct). |
| `utplsql.oraclePoolMin` | `2` | Nombre minimum de connexions conservées dans le pool du runner Oracle (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Nombre maximum de connexions dans le pool du runner Oracle (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Incrément lors de l'expansion du pool du runner Oracle (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Secondes entre les vérifications de santé des connexions inactives du pool (node-oracledb). `0` = ping à chaque extraction. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | Drapeaux JVM pour le mode `java` (par ex. `["-Xmx512m", "-Xms128m"]`). Insérés avant `-cp`. |
| `utplsql.organization` | `file` | Organisation de l'arborescence : `file` (par chemin) ou `schema` (Schéma > Package > Suite > Test). En mode `schema` avec `runnerMode` Oracle (`auto`/`oracle`), les suites sont également découvertes depuis la base de données (`ALL_OBJECTS`/`ALL_SOURCE`) lorsque les fichiers `.pks` ne sont pas dans l'espace de travail — avec l'URI virtuel `utplsql-db:/` (sans CodeLens/décorations/accès direct à l'échec). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob pour extraire le schéma du chemin. Utilisez `{schema}` comme espace réservé. En mode `schema`, les dossiers sous la base du motif (par ex. `db/*`) définissent les schémas interrogés dans la base de données. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Affiche les erreurs de compilation PL/SQL comme soulignements dans l'éditeur et le panneau Problèmes (mode CLI). |
| `utplsql.setupDiagnostics.enabled` | `true` | Affiche les diagnostics de configuration (CLI, connexion, privilèges, version) et **l'intégrité de l'installation utPLSQL** (objets invalides dans le schéma UT3, avec action rapide « Recompile UT3 ») avec des actions rapides. |
| `utplsql.profiles` | `[]` | Profils de connexion Oracle enregistrés (nom, connexion et remplacements de `sourcePath`/`coverageOwner`/`invocation`/`cliPath`/etc.) pour basculer entre les environnements. |
| `utplsql.activeProfile` | `""` | ID du profil actif (`utplsql.profiles`). Lorsqu'il est défini, remplace `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Suit les vues exécutées via `V$SQL` (couverture booléenne). Nécessite `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Active le débogage des tests PL/SQL (`DBMS_DEBUG`). Nécessite `node-oracledb` + privilèges. |
| `utplsql.debugger.stopOnException` | `true` | Pause sur les exceptions PL/SQL pendant le débogage. |
| `utplsql.debugger.timeoutSeconds` | `300` | Délai d'expiration (s) de la session de débogage. |
| `utplsql.language` | `auto` | Langue des messages d'exécution. `auto` suit VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb ; sinon en). Couvre les **24 locales** (15 natives + 9 communautaires). |

Exemple (`.vscode/settings.json` du projet) :

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
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
UTPLSQL_CLI_PATH=/path/to/utplsql
UTPLSQL_CLI_HOME=/path/to/utplsql-cli
```

### Mode d'invocation (`launcher` vs `java`)

Par défaut (`utplsql.invocation = "launcher"`), l'extension appelle le
lanceur `utplsql`/`utplsql.bat`. Sous Windows, cela passe par `cmd`, qui
**consomme/interprète les métacaractères** (`^` devient une échappement, `|` devient un pipe) — ce qui
casse les regex dans `coverageSourceArgs`.

Le mode `java` appelle la JVM **directement** (`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`), **sans shell**. Les arguments vont au processus sous forme de tableau,
sans `cmd` intermédiaire, donc `^` et `|` passent **littéralement** — vous pouvez utiliser `^ancres$` et
`(a|b|c)` dans la regex sans contournements.

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome est dérivé d'ici
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // uniquement si cliPath est une commande du PATH
  // "utplsql.javaPath": "java"                     // PATH, ou chemin complet vers java.exe
}
```

> Le mode `java` reproduit fidèlement ce que fait le `.bat` (même classpath et mêmes
> propriétés `-D`) ; la seule différence est de ne pas passer par `cmd`. Nécessite `java` sur le PATH
> (ou dans `utplsql.javaPath`) et que la racine de la CLI soit résoluble — soit via `cliPath`
> pointant vers `…/bin/utplsql(.bat)`, soit en définissant `cliHome`.

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
8. **Pour Oracle direct (streaming) :** rien à installer — le VSIX inclut déjà le pilote thin `oracledb`. Le mode `auto` retombe sur la CLI si Oracle n'est pas accessible.
9. Pour les diagnostics, utilisez `utPLSQL: Show information` dans la palette — affiche les versions CLI/API/DB avec une option de copie.
10. **utPLSQL: Select additional reporter...** — QuickPick avec les reporters disponibles dans la base de données.
11. **utPLSQL: Cancel execution** — arrête l'exécution en cours (`Escape` pendant l'exécution).
12. **utPLSQL: Refresh tests** — force la redécouverte des `.pks`.

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
| `utPLSQL: Cancel execution` | Arrête la CLI en cours d'exécution | — |
| `utPLSQL: Show utPLSQL information` | Versions CLI/API/DB avec option de copie | — |
| `utPLSQL: Select additional reporter...` | QuickPick avec les reporters de la base | — |
| `utPLSQL: Clear session connection` | Supprime la connexion du cache de session | — |
| `utPLSQL: Rerun Last` | Répète la dernière exécution | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Exécute le test sous le curseur | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Ré-exécute uniquement les tests ayant échoué | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Lance la validation complète de la configuration (CLI, Java, connexion, installation UT3) et affiche les résultats | — |
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

L'extension passe `-source_path` (= `utplsql.sourcePath`) et mappe les objets couverts
vers les fichiers sources via `utplsql.coverageSourceArgs` (regex + `type_mapping`). Le `-owner`
est dérivé de la connexion (ou de `utplsql.coverageOwner`).

### Mapper la couverture vers les fichiers (`coverageSourceArgs`)

Le `type_mapping` traduit le « type » capturé par la regex en type Oracle. Trois conventions courantes :

**1) Par dossier** — structure `sourcePath/<type>/<name>.sql` (dossiers `functions/`, `procedures/`, `packages/`, …) :
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // groupe 1 = dossier (type)
  "-name_subexpression=2",   // groupe 2 = fichier (nom de l'objet)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Fonctionne à n'importe quelle profondeur (le `.*` absorbe les modules au-dessus). Des noms de dossiers
> variés (par ex. `package`, `pkg`, `pacote`) peuvent être énumérés dans le `type_mapping`.

**2) Par préfixe de nom** — convention `pkg_*`, `prc_*`, `vw_*` (indépendante du dossier) :
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // groupe 1 = nom complet (par ex. PKG_EXAMPLE)
  "-type_subexpression=2",   // groupe 2 = préfixe (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Par extension typée** — fichiers `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (indépendante du dossier) :
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // groupe 1 = nom
  "-type_subexpression=2",   // groupe 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Remarques importantes :**
- **Packages → `PACKAGE BODY`** (pas `PACKAGE`) : la couverture est collectée dans le **body** du package.
- **Windows / métacaractères de regex :** en mode `launcher` (par défaut), le `.bat` passe par `cmd`,
  qui **consomme `^`** et **interprète `|` comme un pipe** — c'est pourquoi les exemples ci-dessus utilisent `\w` et
  `[/\\]` (pas de `^`), et le `|` de l'exemple 2 ne fonctionne qu'à l'intérieur de l'extension. **Solution :** utilisez **`utplsql.invocation = "java"`** (voir
  [Mode d'invocation](#mode-dinvocation-launcher-vs-java)) — sans `cmd` intermédiaire, `^` et `|` passent
  littéralement et vous êtes libre d'écrire la regex normalement.
- **Windows / `cmd` :** évitez **`^`** dans la regex (le `cmd` du `.bat` la consomme) — c'est pourquoi les exemples
  utilisent `\w` et `[/\\]`.

## Reporters

L'extension inclut toujours trois reporters par défaut :
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (résultats → Explorateur de tests) et
`ut_coverage_cobertura_reporter` (couverture, si disponible).

**Validation dynamique** — avant d'exécuter avec couverture, l'extension interroge
la base de données via `utplsql reporters <conn>`. Si
`UT_COVERAGE_COBERTURA_REPORTER` n'existe pas dans la base de données (par ex. utPLSQL
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
| Les suites n'apparaissent pas | CLI introuvable | Exécutez `utPLSQL: Validate configuration` pour obtenir des diagnostics |
| Couverture vide | `GRANT EXECUTE ON DBMS_PROFILER` manquant | Exécutez les privilèges de [Prérequis de la base de données](#prérequis-de-la-base-de-données) ou utilisez `utPLSQL: Copy coverage grants to clipboard` |
| Couverture vide | Oracle 19c nécessite des privilèges supplémentaires | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Performances lentes | Les grandes suites nécessitent plus de heap JVM | Augmentez `utplsql.javaArgs` (par ex. `["-Xmx1024m"]`) |
| Erreur de compilation sans indication | Code avec erreur de syntaxe PL/SQL | Activez `utplsql.compilationDiagnostics.enabled` (activé par défaut) ; voir le panneau Problèmes |
| Erreur de connexion | Chaîne mal formée ou base inaccessible | Utilisez `utPLSQL: Validate configuration` |
| Délai d'expiration pendant l'exécution | Les tests prennent plus de temps que `timeoutMinutes` | Augmentez `utplsql.timeoutMinutes` |
| La regex de couverture ne correspond pas | Le `cmd` de Windows consomme `^` et `\|` | Utilisez `utplsql.invocation: "java"` (voir [Mode d'invocation](#mode-dinvocation-launcher-vs-java)) |
| `%suite` non reconnu | `%suite`/`create package` manquant dans le fichier, ou `%test` sans `PROCEDURE` | Vérifiez la spec ; exécutez `utPLSQL: Refresh tests` |
| « report not generated » | La CLI n'a pas pu générer le XML de sortie | Vérifiez les permissions d'écriture dans `%TEMP%` et les privilèges utPLSQL |
| CodeLens n'apparaît pas | `editor.codeLens` désactivé ou conflit | Activez `"editor.codeLens": true` ; vérifiez `utplsql.codeLens.enabled` |
| Les raccourcis ne fonctionnent pas | Conflit avec une autre extension ou un raccourci VSCode | Allez dans Fichier → Préférences → Raccourcis clavier et recherchez `utplsql` pour redéfinir |

## Licence

MIT © Gil Cleber Barboza
