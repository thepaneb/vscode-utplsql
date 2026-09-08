<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · **Српски** · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

Интегрише [utPLSQL](https://www.utplsql.org/) у VSCode, доносећи PL/SQL тестове у нативни **Test Explorer**, са контекстним менијем и визуелном покривеношћу.

- 🧪 **Нативни Test Explorer** — суитови и тестови се појављују у прегледу тестова; покрени по тесту, суиту, датотеци или фасцикли.
- 🔍 **CodeLens** — дугмад Run/Run with Coverage изнад `%suite` и `%test` у едитору, без напуштања кода.
- ⌨️ **Пречице на тастатури** — префикс `Ctrl+Shift+U` + тастер за главне команде (R = Run All, T = Run File, L = Rerun Last, итд.).
- 🖱️ **Контекстни мени** — десни клик на **фасциклу** или на датотеку **`.pks`/`.pkb`** (у Explorer-у или у едитору) за покретање тестова.
- 📊 **Визуелна покривеност** — обојени gutter-и по линији (покривено/непокривено) и проценат по датотеци у картици **Coverage**.
- ✅ **Инлине декорације** — иконе ✓/✗/⚠ у едитору након извршавања, са tooltip-ом о грешци и overview ruler-ом.
- 📌 **Status Bar** — индикатор са бројачем pass/fail, трајањем и напретком у реалном времену.
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only са једном пречицом.
- 🚀 **Oracle директан (преко node-oracledb)** — стримовање у реалном времену, без чекања да се серија заврши.
- 🔧 **Дијагностика подешавања** — проактивна провера CLI-ја, везе, grant-ова и верзије са quick-fix-ом.
- 🧩 **Дрво свесно шеме** — организуј тестове по Schema > Package > Suite > Test у Test Explorer-у.
- 🎯 **Скок до грешке** — директна навигација до линије тврдње (assertion) која је пала (преко нативног „Go to Error").
- 🔌 **Профили веза** — сачувај и пребацуј се између више окружења (DEV/TEST/PROD) са подешавањима по профилу, преко статусне траке или палете команди.
- 📈 **Покривеност израза и погледа** — картица Coverage приказује `% израза` (PROCEDURE/FUNCTION) по датотеци и прати погледе извршене преко `V$SQL`.
- 🐛 **PL/SQL Debug** — breakpoint-и и степеновано отклањање грешака utPLSQL тестова преко `DBMS_DEBUG` (нативни Debug Adapter).
- 🌍 **i18n — 24 језика** — `utplsql.language` прати VSCode (15 изворних + 9 заједничких: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Инсталација

Екстензија се може инсталирати на два начина:

1. **Из Marketplace-а:** потражите **utPLSQL Test Runner** у панелу екстензија VSCode-а (`Ctrl+Shift+X`) и кликните на **Install**.
2. **Ручно (.vsix):** преузмите `.vsix` датотеку жељене верзије и инсталирајте је у VSCode:
   * **Преко командне линије:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Преко интерфејса:** отворите панел екстензија (`Ctrl+Shift+X`), кликните на три тачке `...` (у горњем десном углу) и изаберите **Install from VSIX...**.

## Захтеви

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** инсталиран у Oracle бази података.
- **За CLI режим:** [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java** инсталирани на машини (екстензија позива CLI).
- **За Oracle директан режим:** ништа осим базе података — VSIX већ укључује танки `oracledb` драјвер (без Instant Client-а).
- **VSCode 1.88+** (Test Coverage API).

Екстензија је само „графички клијент" — оно што покреће тестове јесте база података: преко
CLI-ја (utPLSQL-cli + Java) или директно (node-oracledb, `runnerMode: auto` подразумевано).

## Веза

Екстензији је потребан Oracle конекциони стринг за покретање тестова. Резолуција иде овим редом:

1. **Активан профил везе** — `utplsql.activeProfile` који указује на профил у `utplsql.profiles` (поништава све испод).
2. **Подешавање `utplsql.connection`** — чита се из пројектног/корисничког `settings.json`-а.
3. **Веријабла окружења `UTPLSQL_CONN`** — постављена пре отварања VSCode-а.
4. **Кеш сесије** — ако је корисник већ унео везу преко упита (prompt).
5. **Упит кориснику** — пита и чува само у текућој сесији.

Профили веза (`utplsql.profiles`) такође могу да замене `sourcePath`, `coverageOwner`, `invocation`,
`cliPath`, итд. по окружењу — погледајте `utplsql.activeProfile` у табели конфигурација.

⚠️ **Препорука за безбедност:** конекциони стринг садржи лозинку. **НЕМОЈТЕ** користити
подешавање `utplsql.connection` у дељеним окружењима (settings.json може бити верзионисан или видљив
другима). Уместо тога, **користите веријаблу окружења `UTPLSQL_CONN`**:

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

Ако нису дефинисани ни подешавање ни веријабла окружења, екстензија тражи везу и
чува је само у меморији током сесије — користите команду
**utPLSQL: Clear session connection** (палета команди) да бисте је обрисали.

**Прихваћени формати:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias` (захтева конфигурисан `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Како функционише

Доступна су два режима извршавања:

![Архитектура извршавања — два режима](docs/wiki/images/diagram-arquitetura.png)

### Oracle директан режим (v0.9.0) — `runnerMode: auto` или `oracle`

![Oracle директан режим — стримовање](docs/wiki/images/diagram-streaming.png)

Нема привремених датотека, нема чекања на серију. Резултати се појављују у
Test Explorer-у **како се сваки тест заврши**.

### CLI режим — `runnerMode: cli` (fallback)

![CLI режим — серија](docs/wiki/images/diagram-cli.png)

Екстензија формира CLI команду или се повезује директно преко Oracle-а, чита
извештаје (JUnit + Coverage) и преводи их у нативне VSCode API-је. `auto`
режим (подразумеван) покушава Oracle директан и пада на CLI ако `node-oracledb`
није инсталиран. Користите `runnerMode: cli` да увек форсирате CLI.

## Конфигурација

| Подешавање | Подразумевано | Опис |
|---|---|---|
| `utplsql.connection` | `""` | Oracle веза. **Оставите празно** и користите веријаблу окружења `UTPLSQL_CONN` да бисте избегли чување лозинке. Ако су обе празне, екстензија пита (чува само у сесији). |
| `utplsql.cliPath` | `utplsql` | Путања до utPLSQL-cli извршне датотеке (нпр. `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Фасцикла продукционог кода (за мапирање покривености на датотеке). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Glob узорци за проналажење спецификација са `%suite`/`%test`. Ако су ваши тестови у `.sql`, користите `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Додатни аргументи за `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Власник шеме покривених објеката. Празно = користи корисника везе (велика слова). |
| `utplsql.coverageSourceArgs` | (видети **Покривеност**) | CLI аргументи који мапирају покривеност на изворне датотеке. |
| `utplsql.invocation` | `launcher` | Како позвати CLI: `launcher` (преко `.bat`/скрипте, подразумевано) или `java` (директан JVM, **без шкољке**). Видети **Начин позивања**. |
| `utplsql.javaPath` | `java` | Java извршна датотека (PATH или пуна путања). Користи се само у `java` режиму. |
| `utplsql.cliHome` | `""` | Корен utPLSQL-cli-ја (фасцикла са `bin/` и `lib/`). Празно = изводи се из `cliPath`-а. Користи се само у `java` режиму. |
| `utplsql.timeoutMinutes` | `60` | Тимеаут у минутима за CLI. `-t` заставица се шаље само ако се вредност разликује од `60`. |
| `utplsql.dbmsOutput` | `false` | Омогућава `DBMS_OUTPUT` у тест сесији. `-D` заставица се шаље само када је `true`. |
| `utplsql.quiet` | `false` | Потискује информативне CLI логове. `-q` заставица се шаље само када је `true`. |
| `utplsql.failureExitCode` | `1` | Излазни код при грешци. `--failure-exit-code` заставица се шаље само ако се вредност разликује од `1`. `0` чини да CLI увек успешно изађе. |
| `utplsql.additionalReporters` | `[]` | Додатни reporter-и за укључивање у свако извршавање (нпр. `["ut_coverage_html_reporter"]`). Подразумевани (documentation, junit, coverage) су увек укључени и не морају се наводити. |
| `utplsql.codeLens.enabled` | `true` | Приказује Run/Run with Coverage CodeLens дугмад изнад `%suite` и `%test`. |
| `utplsql.statusBar.enabled` | `true` | Приказује индикатор статуса тестова у статусној траци. |
| `utplsql.decorations.enabled` | `true` | Приказује pass/fail декорације на `%suite` и `%test` линијама након извршавања. |
| `utplsql.runnerMode` | `auto` | Режим извршавања: `auto` (Oracle директан преко node-oracledb-а, CLI fallback), `cli` (увек преко командне линије), `oracle` (увек Oracle директан). |
| `utplsql.oraclePoolMin` | `2` | Минимални број веза у Oracle runner пулу (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Максимални број веза у Oracle runner пулу (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Повећање при проширењу Oracle runner пула (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Секунде између провера здравља неактивних веза у пулу (node-oracledb). `0` = ping при сваком преузимању. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | JVM заставице за `java` режим (нпр. `["-Xmx512m", "-Xms128m"]`). Умећу се пре `-cp`. |
| `utplsql.organization` | `file` | Организација стабла: `file` (по путањи) или `schema` (Schema > Package > Suite > Test). У `schema` режиму са Oracle `runnerMode` (`auto`/`oracle`), суитови се такође откривају из базе података (`ALL_OBJECTS`/`ALL_SOURCE`) када `.pks` датотеке нису у радном простору — са виртуелним URI-јем `utplsql-db:/` (без CodeLens-а/декорација/скока до грешке). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob узорак за издвајање шеме из путање. Користите `{schema}` као placeholder. У `schema` режиму, директоријуми испод основе узорка (нпр. `db/*`) дефинишу шеме упитане у бази података. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Приказује PL/SQL грешке компилације као подвлачења у едитору и Problems панелу (CLI режим). |
| `utplsql.setupDiagnostics.enabled` | `true` | Приказује дијагностику конфигурације (CLI, веза, grant-ови, верзија) и **интегритет utPLSQL инсталације** (неважећи објекти у UT3 шеми, са „Recompile UT3" quick-fix-ом) са quick-fix радњама. |
| `utplsql.profiles` | `[]` | Сачувани Oracle профили веза (име, веза и замене `sourcePath`-а/`coverageOwner`-а/`invocation`-а/`cliPath`-а/итд.) за пребацивање између окружења. |
| `utplsql.activeProfile` | `""` | ID активног профила (`utplsql.profiles`). Када је постављен, поништава `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Прати погледе извршене преко `V$SQL` (булова покривеност). Захтева `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Омогућава отклањање грешака PL/SQL тестова (`DBMS_DEBUG`). Захтева `node-oracledb` + grant-ове. |
| `utplsql.debugger.stopOnException` | `true` | Паузира на PL/SQL изузецима током отклањања грешака. |
| `utplsql.debugger.timeoutSeconds` | `300` | Тимеаут (с) сесије отклањања грешака. |
| `utplsql.language` | `auto` | Језик порука у реалном времену. `auto` прати VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; у супротном en). Покрива **24 локала** (15 изворних + 9 заједничких). |

Пример (пројектни `.vscode/settings.json`):

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

И, пре отварања VSCode-а (или у PowerShell профилу):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### За сараднике

Направите `.env` датотеку у корену пројекта (gitignored) са веријаблама
окружења које користе интеграциони тестови:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
UTPLSQL_CLI_PATH=/path/to/utplsql
UTPLSQL_CLI_HOME=/path/to/utplsql-cli
```

### Начин позивања (`launcher` vs `java`)

Подразумевано (`utplsql.invocation = "launcher"`) екстензија позива
`utplsql`/`utplsql.bat` ланчер. На Windows-у ово пролази кроз `cmd`, који
**троши/интерпретира метакарактере** (`^` постаје escape, `|` постаје pipe) — што
квари regex у `coverageSourceArgs`-у.

`java` режим позива JVM **директно** (`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`), **без шкољке**. Аргументи иду у процес као низ,
без `cmd`-а између, тако да `^` и `|` пролазе **дословно** — можете користити `^anchors$` и
`(a|b|c)` у regex-у без заобилазних решења.

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome is derived from here
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // only if cliPath is a PATH command
  // "utplsql.javaPath": "java"                     // PATH, or full path to java.exe
}
```

> `java` режим верно реплицира оно што ради `.bat` (исти classpath и исте
> `-D` особине); једина разлика је што не пролази кроз `cmd`. Захтева `java` на PATH-у
> (или у `utplsql.javaPath`) и да корен CLI-ја буде решив — било преко `cliPath`-а
> који показује на `…/bin/utplsql(.bat)`, или постављањем `cliHome`-а.

## Употреба

1. Отворите PL/SQL пројекат (са кодом и тест пакетима).
2. Компајлирајте код и тестове у бази података (Oracle екстензија / SQLcl).
3. Отворите **Testing** преглед → суитови се појављују.
4. Покрените:
   - Преко **CodeLens**-а — ▶ Run/Run with Coverage дугмад изнад сваког `%suite` и `%test`-а у едитору.
   - Преко **gutter**-а поред сваког теста/суита, или
   - Преко **пречица на тастатури** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, итд.), или
   - Преко дугмета **Run Tests** у Test Explorer прегледу, или
   - **Десним кликом** на фасциклу/датотеку → *utPLSQL: Run tests…* (са или без покривености).
5. Након извршавања, погледајте:
   - **Инлине декорације** (✓/✗/⚠) у едитору поред тест анотација.
   - **Статусну траку** са бројачем pass/fail и укупним трајањем.
   - **Test Explorer** са детаљним резултатима.
6. За покривеност, користите **Run with Coverage** профил (или ставку менија „with coverage").
7. За брзо понављање извршавања:
   - `Ctrl+Shift+U L` — **Rerun Last** (понавља последње извршавање, са или без покривености).
   - `Ctrl+Shift+U U` — **Run at Cursor** (покреће `%test`/`%suite` испод курсора).
   - `Ctrl+Shift+U X` — **Run Failed Only** (покреће само тестове који су пали).
8. **За Oracle директан (стримовање):** нема шта да се инсталира — VSIX већ укључује танки `oracledb` драјвер. `auto` режим пада на CLI ако Oracle није доступан.
9. За дијагностику, користите `utPLSQL: Show information` у палети — приказује CLI/API/DB верзије са опцијом копирања.
10. **utPLSQL: Select additional reporter...** — QuickPick са reporter-има доступним у бази података.
11. **utPLSQL: Cancel execution** — зауставља текуће извршавање (`Escape` током извршавања).
12. **utPLSQL: Refresh tests** — форсира поновно откривање `.pks` датотека.

> 💡 **Када пишете тестове:** парсер је вођен токенима — довољно је имати `%suite`
> и декларацију `create package` у датотеци, и сваки `%test` праћен својим
> `PROCEDURE`-ом. Нема захтева за празном линијом.

### Подржане анотације (v0.10.0+)

Поред `%suite` и `%test`, откривање разуме:

| Анотација | Ефекат на Test Explorer |
|---|---|
| `-- %disabled` | Suite или тест **се не појављује** у стаблу (прескочен у откривању) |
| `-- %throws(-20001)` | Означава да тест очекује изузетак 20001 (`expectedError` метаподаци) |
| `-- %tags(fast, critical)` | Тест ознаке (метаподаци; филтрирање по ознакама је на плану) |
| `-- %displayname(Name)` | Прилагођено име приказано уместо `%test` описа |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Означава suite са lifecycle кукама (метаподаци) |

Анотације не разликују велика и мала слова. У заглављу суита (између `%suite`-а и
првог `%test`-а) односе се на суит; након `%test`-а, односе се на тест.

## Команде

Све команде екстензије (палета `Ctrl+Shift+P` префикс `utPLSQL:`):

| Команда | Опис | Пречица у интерфејсу |
|---|---|---|
| `utPLSQL: Run all tests` | Покреће све суитове у радном простору | ▶ дугме у Testing прегледу |
| `utPLSQL: Run tests in this file` | Покреће суитове активне `.pks`/`.pkb` датотеке | Десни клик → датотека |
| `utPLSQL: Run tests in this file with coverage` | Исто, са coverage профилом | Десни клик → датотека |
| `utPLSQL: Run tests in this folder` | Покреће суитове изабране фасцикле | Десни клик → фасцикла |
| `utPLSQL: Run tests in this folder with coverage` | Исто, са coverage профилом | Десни клик → фасцикла |
| `utPLSQL: Refresh tests` | Форсира поновно откривање `.pks` датотека | — |
| `utPLSQL: Cancel execution` | Зауставља текући CLI | — |
| `utPLSQL: Show utPLSQL information` | CLI/API/DB верзије са опцијом копирања | — |
| `utPLSQL: Select additional reporter...` | QuickPick са reporter-има из базе података | — |
| `utPLSQL: Clear session connection` | Уклања везу из кеша сесије | — |
| `utPLSQL: Rerun Last` | Понавља последње извршавање | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Покреће тест испод курсора | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Поново покреће само пале тестове | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Покреће пуну валидацију подешавања (CLI, Java, веза, UT3 инсталација) и приказује резултате | — |
| `utPLSQL: Configure connection` | Отвара подешавања на `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Копира grants SQL у клипборд | — |
| `utPLSQL: Show Test Explorer` | Фокусира Testing преглед | — |
| `utPLSQL: Switch connection profile...` | Мења активан профил везе (QuickPick) | Клик на статусну траку (са активним профилом) |
| `utPLSQL: New connection profile...` | Чаробњак за креирање и активацију профила | — |
| `utPLSQL: Manage connection profiles` | Отвара подешавања на `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Увози везе из SQL Developer-а (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Покреће сесију отклањања грешака теста у активној датотеци | — |

> **Recompile UT3** (`utplsql.recompileUt3`) **није** команда у палети — то је
> интерни quick-fix дијагностике „utPLSQL Setup" (неважећи објекти у
> utPLSQL шеми).

## Пречице

Све пречице користе `Ctrl+Shift+U` префикс (`Cmd+Shift+U` на Mac-у):

| Пречица | Команда |
|---|---|
| `Ctrl+Shift+U R` | Покрени све тестове |
| `Ctrl+Shift+U T` | Покрени тестове у датотеци |
| `Ctrl+Shift+U Shift+T` | Покрени тестове у датотеци са покривеношћу |
| `Ctrl+Shift+U F` | Освежи тестове |
| `Ctrl+Shift+U I` | Прикажи utPLSQL информације |
| `Ctrl+Shift+U C` | Очисти везу сесије |
| `Ctrl+Shift+U L` | Понови последње |
| `Ctrl+Shift+U U` | Покрени на курсору |
| `Ctrl+Shift+U X` | Покрени само пале |
| `Escape` | Откажи извршавање |

## Покривеност

- **Извршене** линије постају зелене у gutter-у; **неизвршене** линије постају црвене.
- Картица **Test Coverage** приказује **проценат по датотеци/фасцикли**.

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

Екстензија прослеђује `-source_path` (= `utplsql.sourcePath`) и мапира покривене објекте
на изворне датотеке преко `utplsql.coverageSourceArgs`-а (regex + `type_mapping`). `-owner`
се изводи из везе (или из `utplsql.coverageOwner`-а).

### Мапирање покривености на датотеке (`coverageSourceArgs`)

`type_mapping` преводи „тип" ухваћен regex-ом у Oracle тип. Три уобичајене конвенције:

**1) По директоријуму** — структура `sourcePath/<type>/<name>.sql` (фасцикле `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Ради на било којој дубини (`.*` апсорбује модуле изнад). Различита имена фасцикли
> (нпр. `package`, `pkg`, `pacote`) могу се набројати у `type_mapping`-у.

**2) По префиксу имена** — конвенција `pkg_*`, `prc_*`, `vw_*` (независно од фасцикле):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) По типизираној екстензији** — датотеке `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (независно од фасцикле):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Важне напомене:**
- **Пакети → `PACKAGE BODY`** (не `PACKAGE`): покривеност се прикупља у **body**-ју пакета.
- **Windows / regex метакарактери:** у `launcher` режиму (подразумеваном), `.bat` пролази кроз `cmd`,
  који **троши `^`** и **интерпретира `|` као pipe** — зато горњи примери користе `\w` и
  `[/\\]` (без `^`), а `|` у примеру 2 ради само унутар екстензије. **Решење:** користите **`utplsql.invocation = "java"`** (видети
  [Начин позивања](#начин-позивања-launcher-vs-java)) — без `cmd`-а између, `^` и `|` пролазе
  дословно и можете нормално писати regex.
- **Windows / `cmd`:** избегавајте **`^`** у regex-у (`cmd` у `.bat`-у га троши) — зато примери
  користе `\w` и `[/\\]`.

## Репортери

Екстензија увек укључује три подразумевана reporter-а:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (резултати → Test Explorer) и
`ut_coverage_cobertura_reporter` (покривеност, ако је доступан).

**Динамичка валидација** — пре покретања са покривеношћу, екстензија упитује
базу података преко `utplsql reporters <conn>`. Ако
`UT_COVERAGE_COBERTURA_REPORTER` не постоји у бази података (нпр. застарели
utPLSQL), покривеност се прескаче са упозорењем у излазу. Извршавање тестова
никада није блокирано.

**Додатни фиксни reporter-и** — подешавање `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Три подразумевана reporter-а се аутоматски дедупликују, чак и ако су
овде наведени.

**Променљив reporter по сесији** — команда **utPLSQL: Select additional
reporter...** отвара QuickPick са динамичком листом из базе података.
Изабрани reporter се користи при следећем извршавању и потом одбацује (не
чува се у подешавањима).

## Захтеви базе података

**Покривеност** (увек) — омогућава profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Без овога, тестови се покрећу, али покривеност излази **празна**.

**Откривање тестова у ДРУГИМ шемама** (utPLSQL **shared** инсталација, нпр. власник `UT3`):
да би оквир видео и парсирао тестове апликативних шема, власник utPLSQL-а треба
да **чита речник** тих шема:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` сам по себи НИЈЕ довољан** — потребни су **директни** grant-ови на тим погледима
  (због `dbms_assert.sql_object_name` у definer контексту).
- utPLSQL **DDL тригер** такође мора бити инсталиран (одржава кеш анотација ажурним).
- Провера (као власник): `SELECT ut_metadata.get_source_view_name FROM dual;` треба да врати `dba_source`.

> Код **per-schema** инсталација (utPLSQL у истој шеми као и тестови), ови међушемски grant-ови **нису**
> потребни — оквир чита сопствени извор.

## Позната ограничења

- Мапирање резултат→тест ради се по имену пакета + имену/опису теста;
  идентични описи у различитим пакетима могу створити двосмисленост (индекс је
  ограничен по пакету да би се то минимизирало).
- Узима у обзир **прву** фасциклу радног простора за резолуцију `sourcePath`-а.
- Откривање чита `.pks` (спецификације); држите `%suite`/`%test` анотације у спецификацији.

## Решавање проблема

| Симптом | Вероватни узрок | Решење |
|---|---|---|
| Суитови се не појављују | CLI није пронађен | Покрените `utPLSQL: Validate configuration` за дијагностику |
| Празна покривеност | Недостаје `GRANT EXECUTE ON DBMS_PROFILER` | Покрените grant-ове из [Захтева базе података](#захтеви-базе-података) или користите `utPLSQL: Copy coverage grants to clipboard` |
| Празна покривеност | Oracle 19c захтева додатне grant-ове | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Спори перформанси | Велики суитови захтевају више JVM хепа | Повећајте `utplsql.javaArgs` (нпр. `["-Xmx1024m"]`) |
| Грешка компилације без назнаке | Код са PL/SQL синтаксном грешком | Омогућите `utplsql.compilationDiagnostics.enabled` (подразумевано укључен); погледајте Problems панел |
| Грешка у вези | Погрешан стринг или недоступна база | Користите `utPLSQL: Validate configuration` |
| Тимеаут током извршавања | Тестови трају дуже од `timeoutMinutes`-а | Повећајте `utplsql.timeoutMinutes` |
| Regex покривености се не поклапа | Windows `cmd` троши `^` и `\|` | Користите `utplsql.invocation: "java"` (видети [Начин позивања](#начин-позивања-launcher-vs-java)) |
| `%suite` није препознат | Недостаје `%suite`/`create package` у датотеци, или `%test` без `PROCEDURE`-а | Проверите спецификацију; покрените `utPLSQL: Refresh tests` |
| „report not generated" | CLI није могао да генерише излазни XML | Проверите дозволе за писање у `%TEMP%` и utPLSQL grant-ове |
| CodeLens се не појављује | `editor.codeLens` онемогућен или конфликт | Омогућите `"editor.codeLens": true`; проверите `utplsql.codeLens.enabled` |
| Пречице не раде | Конфликт са другом екстензијом или VSCode пречицом | Идите на File → Preferences → Keyboard Shortcuts и потражите `utplsql` да бисте их редефинисали |

## Лиценца

MIT © Gil Cleber Barboza