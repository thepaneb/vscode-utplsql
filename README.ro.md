<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · **Română** · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [Čeština](README.cs.md) · [Български](README.bg.md) · [Српски](README.sr.md) · [Türkçe](README.tr.md) · [Ελληνικά](README.el.md) · [Magyar](README.hu.md) · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md) · [ไทย](README.th.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

Integrează [utPLSQL](https://www.utplsql.org/) în VSCode, aducând testele PL/SQL în **Test Explorer-ul** nativ, cu meniu contextual și acoperire vizuală.

- 🧪 **Test Explorer nativ** — suitele și testele apar în vizualizarea de testare; rulează după test, suită, fișier sau folder.
- 🔍 **CodeLens** — butoanele Run/Run with Coverage deasupra `%suite` și `%test` în editor, fără să părăsești codul.
- ⌨️ **Scurtături de tastatură** — prefixul `Ctrl+Shift+U` + tastă pentru comenzile principale (R = Rulează tot, T = Rulează fișierul, L = Re-rulează ultimul etc.).
- 🖱️ **Meniu contextual** — clic dreapta pe un **folder** sau pe un fișier **`.pks`/`.pkb`** (în Explorer sau în editor) pentru a rula testele.
- 📊 **Acoperire vizuală** — jgheab (gutter) colorat pe fiecare linie (acoperită/neacoperită) și procent pe fișier în fila **Coverage**.
- ✅ **Decorări inline** — pictograme ✓/✗/⚠ în editor după execuție, cu tooltip pentru eșec și riglă de prezentare generală.
- 📌 **Bară de stare** — indicator cu numărul de reușite/eșecuri, durată și progres în timp real.
- 🔁 **Re-rulare inteligentă** — Re-rulează ultimul, Rulează la cursor, Rulează doar eșuatele cu o singură scurtătură.
- 🚀 **Oracle direct (via node-oracledb)** — streaming în timp real, fără a aștepta terminarea lotului.
- 🔧 **Diagnosticare de configurare** — validare proactivă a conexiunii, granturilor și versiunii, cu acțiuni quick-fix.
- 🧩 **Arbore conștient de schemă** — organizează testele după Schema > Package > Suite > Test în Test Explorer.
- 🎯 **Salt la eșec** — navigare directă la linia aserțiunii care a eșuat (prin „Go to Error" nativ).
- 🔌 **Profiluri de conexiune** — salvează și comută între mai multe medii (DEV/TEST/PROD) cu setări per profil, prin bara de stare sau paleta de comenzi.
- 📈 **Acoperire pe instrucțiuni și vizualizări** — fila Coverage arată `% din instrucțiuni` (PROCEDURE/FUNCTION) per fișier și urmărește vizualizările executate prin `V$SQL`.
- 🐛 **Debug PL/SQL** — breakpoint-uri și depanare pas cu pas a testelor utPLSQL prin `DBMS_DEBUG` (Debug Adapter nativ).
- 🌍 **i18n — 24 de limbi** — `utplsql.language` urmărește VSCode (15 native + 9 comunitare: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Instalare

Extensia poate fi instalată în două moduri:

1. **Din Marketplace:** caută **utPLSQL Test Runner** în panoul de extensii VSCode (`Ctrl+Shift+X`) și apasă **Install**.
2. **Manual (.vsix):** descarcă fișierul `.vsix` al versiunii dorite și instalează-l în VSCode:
   * **Din linia de comandă:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Din interfață:** deschide panoul de extensii (`Ctrl+Shift+X`), apasă pe cele trei puncte `...` (colțul din dreapta sus) și selectează **Install from VSIX...**.

## Cerințe

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** instalat în baza de date Oracle.
- Nimic în afară de baza de date — VSIX-ul include deja driverul subțire `oracledb` (fără Instant Client).
- **VSCode 1.88+** (API Test Coverage).

Extensia este doar „clientul grafic" — ceea ce rulează testele este baza de date direct prin node-oracledb.

## Conexiune

Extensia are nevoie de un string de conexiune Oracle pentru a rula testele. Rezolvarea urmează această ordine:

1. **Profilul de conexiune activ** — `utplsql.activeProfile` care indică un profil din `utplsql.profiles` (suprascrie tot ce urmează mai jos).
2. **Setarea `utplsql.connection`** — citită din `settings.json` al proiectului/utilizatorului.
3. **Variabila de mediu `UTPLSQL_CONN`** — setată înainte de a deschide VSCode.
4. **Cache de sesiune** — dacă utilizatorul a introdus deja conexiunea prin prompt.
5. **Întrebare către utilizator** — întreabă și o păstrează doar în sesiunea curentă.

Profilurile de conexiune (`utplsql.profiles`) pot suprascrie, de asemenea, `sourcePath`, `coverageOwner` etc., per mediu — vezi `utplsql.activeProfile` în tabelul de configurare.

⚠️ **Recomandare de securitate:** stringul de conexiune conține o parolă. **NU** folosi
setarea `utplsql.connection` în medii partajate (settings.json poate fi versionat sau vizibil
pentru alții). În schimb, **folosește variabila de mediu `UTPLSQL_CONN`**:

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

Dacă nici setarea, nici variabila de mediu nu este definită, extensia întreabă pentru
conexiune și o păstrează doar în memorie pe durata sesiunii — folosește comanda
**utPLSQL: Clear session connection** (paleta de comenzi) pentru a o șterge.

**Formate acceptate:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **Alias TNS**: `user/pass@tns_alias` (necesită `TNS_ADMIN` configurat)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Cum funcționează

Fără fișiere temporare, fără a aștepta lotul. Rezultatele apar în
Test Explorer **pe măsură ce fiecare test se termină**.

Extensia se conectează direct prin Oracle, citește rapoartele (JUnit + Coverage) și le transpune în API-urile native ale VSCode.

## Configurare

| Setare | Implicit | Descriere |
|---|---|---|
| `utplsql.connection` | `""` | Conexiunea Oracle. **Lasă gol** și folosește variabila de mediu `UTPLSQL_CONN` pentru a evita stocarea parolei. Dacă ambele sunt goale, extensia întreabă (o păstrează doar în sesiune). |
| `utplsql.sourcePath` | `install` | Folderul codului de producție (pentru maparea acoperirii pe fișiere). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Glob-uri pentru descoperirea spec-urilor cu `%suite`/`%test`. Dacă testele tale sunt în `.sql`, folosește `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Schema proprietară a obiectelor acoperite. Gol = folosește utilizatorul conexiunii (cu majuscule). |
| `utplsql.additionalReporters` | `[]` | Reporteri suplimentari de inclus la fiecare rulare (ex.: `["ut_coverage_html_reporter"]`). Cei implicați (documentation, junit, coverage) sunt întotdeauna incluși și nu trebuie listați. |
| `utplsql.codeLens.enabled` | `true` | Afișează butoanele CodeLens Run/Run with Coverage deasupra `%suite` și `%test`. |
| `utplsql.statusBar.enabled` | `true` | Afișează indicatorul de stare al testelor în bara de stare. |
| `utplsql.decorations.enabled` | `true` | Afișează decorări reușit/eșuat pe liniile `%suite` și `%test` după execuție. |
| `utplsql.oraclePoolMin` | `2` | Conexiuni minime menținute în pool-ul runner-ului Oracle (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Conexiuni maxime în pool-ul runner-ului Oracle (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Increment la extinderea pool-ului runner-ului Oracle (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Secunde între verificările de sănătate ale conexiunilor idle din pool (node-oracledb). `0` = ping la fiecare checkout. |
| `utplsql.organization` | `file` | Organizarea arborelui: `file` (după cale) sau `schema` (Schema > Package > Suite > Test). În modul `schema` suitele sunt descoperite și din baza de date (`ALL_OBJECTS`/`ALL_SOURCE`) atunci când fișierele `.pks` nu sunt în workspace — cu URI virtual `utplsql-db:/` (fără CodeLens/decorări/salt la eșec). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Model glob pentru extragerea schemei din cale. Folosește `{schema}` ca substituent. În modul `schema`, directoarele de sub baza modelului (ex.: `db/*`) definesc schemele interogate în baza de date. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Afișează erorile de compilare PL/SQL ca sublinieri în editor și în panoul de probleme. |
| `utplsql.setupDiagnostics.enabled` | `true` | Afișează diagnostice de configurare (conexiune, granturi, versiune) și **integritatea instalării utPLSQL** (obiecte invalide în schema UT3, cu quick-fix „Recompile UT3") cu acțiuni quick-fix. |
| `utplsql.profiles` | `[]` | Profiluri de conexiune Oracle salvate (nume, conexiune și suprascrieri ale `sourcePath`/`coverageOwner`/etc.) pentru a comuta între medii. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID-ul profilului activ (`utplsql.profiles`). Când este setat, suprascrie `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Urmărește vizualizările executate prin `V$SQL` (acoperire booleană). Necesită `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Activează depanarea testelor PL/SQL (`DBMS_DEBUG`). Necesită `node-oracledb` + granturi. |
| `utplsql.debugger.stopOnException` | `true` | Se oprește la excepțiile PL/SQL în timpul depanării. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) al sesiunii de depanare. |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | Limba mesajelor runtime. `auto` urmează VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; altfel en). Acoperă cele **24 de localizări** (15 native + 9 comunitare). |

Exemplu (`.vscode/settings.json` din proiect):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

Și, înainte de a deschide VSCode (sau în profilul PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Pentru contribuitori

Creează un fișier `.env` în rădăcina proiectului (ignorat de git) cu variabilele
de mediu folosite de testele de integrare:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Utilizare

1. Deschide proiectul PL/SQL (cu pachetele de cod și de test).
2. Compilează codul și testele în baza de date (extensia Oracle / SQLcl).
3. Deschide vizualizarea **Testing** → apar suitele.
4. Rulează:
   - Prin **CodeLens** — butoanele ▶ Run/Run with Coverage deasupra fiecărui `%suite` și `%test` din editor.
   - Prin **jgheabul (gutter)** de lângă fiecare test/suită, sau
   - Prin **scurtăturile de tastatură** (`Ctrl+Shift+U R` = Rulează tot, `Ctrl+Shift+U T` = Rulează fișierul etc.), sau
   - Butonul **Run Tests** din vizualizarea Test Explorer, sau
   - **Clic dreapta** pe un folder/fișier → *utPLSQL: Run tests…* (cu sau fără acoperire).
5. După execuție, vezi:
   - **Decorări inline** (✓/✗/⚠) în editor lângă adnotările de test.
   - **Bară de stare** cu numărul de reușite/eșecuri și durata totală.
   - **Test Explorer** cu rezultate detaliate.
6. Pentru acoperire, folosește profilul **Run with Coverage** (sau elementul de meniu „with coverage").
7. Pentru a repeta rapid execuțiile:
   - `Ctrl+Shift+U L` — **Rerun Last** (repetă ultima execuție, cu sau fără acoperire).
   - `Ctrl+Shift+U U` — **Run at Cursor** (rulează `%test`/`%suite` de sub cursor).
   - `Ctrl+Shift+U X` — **Run Failed Only** (rulează doar testele care au eșuat).
8. **Pentru Oracle direct (streaming):** nimic de instalat — VSIX-ul include deja driverul subțire `oracledb`.
9. Pentru diagnostice, folosește `utPLSQL: Show information` în paletă — afișează versiunile API/DB cu opțiune de copiere.
10. **utPLSQL: Select additional reporter...** — QuickPick cu reporterii disponibili în baza de date.
11. **utPLSQL: Cancel execution** — oprește execuția în curs (`Escape` în timpul execuției).
12. **utPLSQL: Refresh tests** — forțează redescoperirea `.pks`.

> 💡 **Când scrii teste:** parser-ul este condus de tokeni — trebuie doar să ai `%suite`
> și declarația `create package` în fișier, și fiecare `%test` urmat de `PROCEDURE`-ul său.
> Nu există cerința unei linii goale.

### Adnotări suportate (v0.10.0+)

Pe lângă `%suite` și `%test`, descoperirea înțelege:

| Adnotare | Efect în Test Explorer |
|---|---|
| `-- %disabled` | Suita sau testul **nu apare** în arbore (omis la descoperire) |
| `-- %throws(-20001)` | Marchează că testul se așteaptă la excepția 20001 (metadata `expectedError`) |
| `-- %tags(fast, critical)` | Tag-uri de test (metadata; filtrarea pe tag-uri este în roadmap) |
| `-- %displayname(Name)` | Nume personalizat afișat în locul descrierii `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Marchează suita cu hook-uri de ciclu de viață (metadata) |

Adnotările nu țin cont de majuscule/minuscule. În antetul suitei (între `%suite` și
primul `%test`) se aplică suitei; după `%test`, se aplică testului.

## Comenzi

Toate comenzile extensiei (paletă `Ctrl+Shift+P`, prefix `utPLSQL:`):

| Comandă | Descriere | Scurtătură UI |
|---|---|---|
| `utPLSQL: Run all tests` | Rulează toate suitele din workspace | buton ▶ în vizualizarea Testing |
| `utPLSQL: Run tests in this file` | Rulează suitele `.pks`/`.pkb`-ului activ | Clic dreapta → fișier |
| `utPLSQL: Run tests in this file with coverage` | La fel, cu profil de acoperire | Clic dreapta → fișier |
| `utPLSQL: Run tests in this folder` | Rulează suitele folderului selectat | Clic dreapta → folder |
| `utPLSQL: Run tests in this folder with coverage` | La fel, cu profil de acoperire | Clic dreapta → folder |
| `utPLSQL: Refresh tests` | Forțează redescoperirea `.pks` | — |
| `utPLSQL: Cancel execution` | Oprește execuția în curs | — |
| `utPLSQL: Show utPLSQL information` | Versiunile API/DB cu opțiune de copiere | — |
| `utPLSQL: Select additional reporter...` | QuickPick cu reporterii din baza de date | — |
| `utPLSQL: Clear session connection` | Elimină conexiunea din cache-ul de sesiune | — |
| `utPLSQL: Rerun Last` | Repetă ultima execuție | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Rulează testul de sub cursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Re-rulează doar testele eșuate | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Rulează validarea completă a configurării (conexiune, instalare UT3) și afișează rezultatele | — |
| `utPLSQL: Configure connection` | Deschide setările la `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Copiază SQL-ul granturilor în clipboard | — |
| `utPLSQL: Show Test Explorer` | Focalizează vizualizarea Testing | — |
| `utPLSQL: Switch connection profile...` | Comută profilul de conexiune activ (QuickPick) | Clic pe bara de stare (cu profil activ) |
| `utPLSQL: New connection profile...` | Asistent pentru crearea și activarea unui profil | — |
| `utPLSQL: Manage connection profiles` | Deschide setările la `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Importă conexiuni din SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Pornește o sesiune de depanare a testului din fișierul activ | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |

> **Recompile UT3** (`utplsql.recompileUt3`) **nu** este o comandă din paletă — este
> un quick-fix intern al diagnosticului „utPLSQL Setup" (obiecte invalide în
> schema utPLSQL).

## Combinații de taste

Toate combinațiile folosesc prefixul `Ctrl+Shift+U` (`Cmd+Shift+U` pe Mac):

| Combinație | Comandă |
|---|---|
| `Ctrl+Shift+U R` | Rulează toate testele |
| `Ctrl+Shift+U T` | Rulează testele din fișier |
| `Ctrl+Shift+U Shift+T` | Rulează testele din fișier cu acoperire |
| `Ctrl+Shift+U F` | Reîmprospătează testele |
| `Ctrl+Shift+U I` | Afișează informații utPLSQL |
| `Ctrl+Shift+U C` | Șterge conexiunea din sesiune |
| `Ctrl+Shift+U L` | Re-rulează ultimul |
| `Ctrl+Shift+U U` | Rulează la cursor |
| `Ctrl+Shift+U X` | Rulează doar eșuatele |
| `Escape` | Anulează execuția |

## Acoperire

- Liniile **executate** devin verzi în jgheab; liniile **neexecutate** devin roșii.
- Fila **Test Coverage** arată **procentul per fișier/folder**.



Extensia trimite `-source_path` (= `utplsql.sourcePath`) și mapează obiectele acoperite
pe fișierele sursă prin `utplsql.coverageSourceArgs` (regex + `type_mapping`). `-owner`
este derivat din conexiune (sau din `utplsql.coverageOwner`).

### Maparea acoperirii pe fișiere (`coverageSourceArgs`)

`type_mapping` traduce „tipul" capturat de regex în tipul Oracle. Trei convenții comune:

**1) După director** — structura `sourcePath/<type>/<name>.sql` (foldere `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Funcționează la orice adâncime (`.*` absoarbe modulele de deasupra). Nume variate
> de foldere (ex.: `package`, `pkg`, `pacote`) pot fi enumerate în `type_mapping`.

**2) După prefixul numelui** — convenția `pkg_*`, `prc_*`, `vw_*` (independent de folder):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) După extensia tipată** — fișiere `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (independent de folder):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Note importante:**
- **Pachete → `PACKAGE BODY`** (nu `PACKAGE`): acoperirea este colectată în **body**-ul pachetului.

## Reporteri

Extensia include întotdeauna trei reporteri implicați:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (rezultate → Test Explorer) și
`ut_coverage_cobertura_reporter` (acoperire, dacă este disponibil).

**Validare dinamică** — înainte de a rula cu acoperire, extensia interoghează
baza de date prin `utplsql reporters <conn>`. Dacă
`UT_COVERAGE_COBERTURA_REPORTER` nu există în baza de date (ex.: utPLSQL
învechit), acoperirea este omisă cu un avertisment în output. Execuția testelor
nu este niciodată blocată.

**Reporteri suplimentari ficși** — setarea `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Cei trei reporteri implicați sunt deduplicați automat, chiar dacă sunt
listați aici.

**Reporter volatil per sesiune** — comanda **utPLSQL: Select additional
reporter...** deschide un QuickPick cu lista dinamică din baza de date.
Reporterul ales este folosit la următoarea execuție și apoi eliminat (nu persistă
în setări).

## Cerințe pentru baza de date

**Acoperire** (întotdeauna) — activează profiler-ul:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Fără acestea, testele rulează, dar acoperirea iese **goală**.

**Descoperirea testelor în ALTE scheme** (instalare utPLSQL **partajată**, ex.: proprietar `UT3`):
pentru ca framework-ul să vadă și să parseze testele schemelor aplicației, proprietarul utPLSQL
trebuie să **citească dicționarul** acelor scheme:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **Doar `SELECT ANY DICTIONARY` NU este suficient** — sunt necesare granturile **directe** pe
  acele vizualizări (din cauza `dbms_assert.sql_object_name` în context definer).
- Trebuie instalat și **trigger-ul DDL** utPLSQL (menține cache-ul de adnotări la zi).
- Verificare (ca proprietar): `SELECT ut_metadata.get_source_view_name FROM dual;` ar trebui să returneze `dba_source`.

> În instalările **per schemă** (utPLSQL în aceeași schemă cu testele), aceste granturi
> inter-scheme **nu** sunt necesare — framework-ul își citește propria sursă.

## Limitări cunoscute

- Maparea rezultat→test se face după numele pachetului + numele/descrierea testului;
  descrieri identice în pachete diferite pot crea ambiguitate (indexul este
  limitat la pachet pentru a minimiza acest lucru).
- Ia în considerare **primul** folder din workspace pentru a rezolva `sourcePath`.
- Descoperirea citește `.pks` (spec-urile); păstrează adnotările `%suite`/`%test` în spec.

## Depanare

| Simptom | Cauză probabilă | Soluție |
|---|---|---|
| Acoperire goală | Lipsește `GRANT EXECUTE ON DBMS_PROFILER` | Rulează granturile din [Cerințe pentru baza de date](#cerințe-pentru-baza-de-date) sau folosește `utPLSQL: Copy coverage grants to clipboard` |
| Acoperire goală | Oracle 19c necesită granturi suplimentare | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Eroare de compilare fără indicație | Cod cu eroare de sintaxă PL/SQL | Activează `utplsql.compilationDiagnostics.enabled` (implicit activ); vezi panoul de probleme |
| Eroare de conexiune | String malformat sau bază de date inaccesibilă | Folosește `utPLSQL: Validate configuration` |
| `%suite` nu este recunoscut | Lipsesc `%suite`/`create package` în fișier, sau `%test` fără `PROCEDURE` | Verifică spec-ul; rulează `utPLSQL: Refresh tests` |
| CodeLens nu apare | `editor.codeLens` dezactivat sau conflict | Activează `"editor.codeLens": true`; verifică `utplsql.codeLens.enabled` |
| Scurtăturile nu funcționează | Conflict cu altă extensie sau scurtătură VSCode | Mergi la File → Preferences → Keyboard Shortcuts și caută `utplsql` pentru a redefini |

## Licență

MIT © Gil Cleber Barboza
