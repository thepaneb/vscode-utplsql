---
tipo: readme
status: ativo
locale: bg
titulo: "README (bg)"
publicar: README.bg.md
origem: ["README (extensão)","MOC - I18n"]
verificado: 2026-09-23
tags: [readme]
---

<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[[README (extensão)|English]] · [[README.zh-CN|中文(简体)]] · [[README.zh-TW|中文(繁體)]] · [[README.ja|日本語]] · [[README.ko|한국어]] · [[README.es|Español]] · [[README.fr|Français]] · [[README.pt-BR|Português]] · [[README.it|Italiano]] · [[README.ro|Română]] · [[README.de|Deutsch]] · [[README.ru|Русский]] · [[README.pl|Polski]] · [[README.uk|Українська]] · [[README.cs|Čeština]] · **Български** · [[README.sr|Српски]] · [[README.tr|Türkçe]] · [[README.el|Ελληνικά]] · [[README.hu|Magyar]] · [[README.id|Bahasa Indonesia]] · [[README.vi|Tiếng Việt]] · [[README.th|ไทย]] · [[README.en-GB|English (UK)]]

</div>

# utPLSQL Test Runner

Интегрира [utPLSQL](https://www.utplsql.org/) в VSCode, като добавя PL/SQL тестове към родния **Test Explorer**, с контекстно меню и визуално покритие.

- 🧪 **Роден Test Explorer** — комплектите и тестовете се появяват в изгледа за тестове; стартиране по тест, комплект, файл или папка.
- 🔍 **CodeLens** — бутони Run/Run with Coverage над `%suite` и `%test` в редактора, без да напускате кода.
- ⌨️ **Клавишни комбинации** — префикс `Ctrl+Shift+U` + клавиш за основните команди (R = Run All, T = Run File, L = Rerun Last и т.н.).
- 🖱️ **Контекстно меню** — щракнете с десния бутон върху **папка** или файл **`.pks`/`.pkb`** (в Explorer или в редактора), за да стартирате тестове.
- 📊 **Визуално покритие** — цветни полета по редове (покрито/непокрито) и процент по файл в раздела **Coverage**.
- ✅ **Inline декорации** — икони ✓/✗/⚠ в редактора след изпълнението, с подсказка за грешката и индикатор в overview ruler.
- 📌 **Status Bar** — индикатор с брой успешни/неуспешни, продължителност и прогрес в реално време.
- 🔁 **Интелигентно повторно стартиране** — Rerun Last, Run at Cursor, Run Failed Only с една клавишна комбинация.
- 🚀 **Директен Oracle (чрез node-oracledb)** — стрийминг в реално време, без да чакате края на пакетното изпълнение.
- 🔧 **Диагностика на настройката** — проактивна проверка на връзката, привилегиите и версията с quick-fix.
- 🧩 **Дърво, съобразено със схемата** — организирайте тестовете по Schema > Package > Suite > Test в Test Explorer.
- 🎯 **Преминаване към грешката** — директна навигация до реда на твърдението, което е пропаднало (чрез родния „Go to Error").
- 🔌 **Профили за връзка** — запазвайте и превключвайте между няколко среди (DEV/TEST/PROD) с настройки по профил, чрез status bar или командната палитра.
- 📜 **SQL скриптове** — изпълнение на текущия скрипт, файл от Explorer или цяла папка върху активния профил за връзка (съобразно charset, с `DBMS_OUTPUT` и `stopOnError`).
- 📈 **Покритие на оператори и изгледи** — разделът Coverage показва `% of statements` (PROCEDURE/FUNCTION) по файл и проследява изгледите, изпълнени чрез `V$SQL`.
- 🏷️ **Тагове и случаен ред** — филтрирайте тестове с `utplsql.tags` (напр. `fast & !integration`) и ги изпълнявайте в случаен ред с възпроизводим seed (`utplsql.run.randomOrder`).
- 🎯 **Обхват на покритие** — включвайте/изключвайте обекти и regex за схема/обект (`utplsql.coverage.*`), за да махнете шума от framework-а и да добавите динамично достигнати обекти.
- 🗄️ **DB-first откриване** — изграждайте дървото от `ut_runner.get_suites_info` и възстановявайте кеша с анотации от палитрата.
- 🐛 **PL/SQL Debug** — точки на прекъсване и поетапно дебъгване на utPLSQL тестове чрез `DBMS_DEBUG` (роден Debug Adapter).
- 🌍 **i18n — 24 езика** — `utplsql.language` следва VSCode (24 локали: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Инсталация

Разширението може да бъде инсталирано по два начина:

1. **От Marketplace:** Потърсете **utPLSQL Test Runner** в панела с разширения на VSCode (`Ctrl+Shift+X`) и щракнете върху **Install**.
2. **Ръчно (.vsix):** Изтеглете `.vsix` файла на желаната версия и го инсталирайте във VSCode:
   * **Чрез командния ред:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Чрез интерфейса:** Отворете панела с разширения (`Ctrl+Shift+X`), щракнете върху трите точки `...` (горния десен ъгъл) и изберете **Install from VSIX...**.

## Изисквания

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** инсталиран в базата данни Oracle.
- Нищо освен базата данни — VSIX вече включва thin драйвера `oracledb` (без Instant Client).

**Съвместимост Oracle / utPLSQL:**

| Oracle | utPLSQL | Бележки |
|---|---|---|
| 18c+ | v3.2.x (18c+) / v3.1.x | Препоръчително; charset `AL32UTF8`. |
| 12.2 | само v3.1.x | v3.2.x не се компилира (`PLS-00222`). `WE8DEC` на образа губи непредставими символи (напр. `€`); thin драйверът игнорира `NLS_LANG`. |
- **VSCode 1.88+** (Test Coverage API).

Разширението е само „графичният клиент" — тестовете се изпълняват от базата данни директно чрез node-oracledb.

## Връзка

За да стартира тестове, разширението се нуждае от низ за връзка с Oracle. Резолюцията следва този ред:

1. **Активен профил за връзка** — `utplsql.activeProfile`, сочещ към профил в `utplsql.profiles` (има предимство пред всичко по-долу).
2. **Настройката `utplsql.connection`** — четена от `settings.json` на проекта/потребителя.
3. **Променливата на средата `UTPLSQL_CONN`** — зададена преди отваряне на VSCode.
4. **Кеш на сесията** — ако потребителят вече е въвел връзката чрез подкана.
5. **Подкана към потребителя** — пита и я запазва само в текущата сесия.

Профилите за връзка (`utplsql.profiles`) могат също да презаписват `sourcePath`, `coverageOwner` и т.н. за всяка среда — вижте `utplsql.activeProfile` в таблицата с конфигурацията.

⚠️ **Препоръка за сигурност:** низът за връзка съдържа парола. **НЕ** използвайте
настройката `utplsql.connection` в споделени среди (settings.json може да е във version control
или видим за други). Вместо това **използвайте променливата на средата `UTPLSQL_CONN`**:

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

Ако нито настройката, нито променливата на средата са зададени, разширението пита за връзката и
я запазва само в паметта по време на сесията — използвайте командата
**utPLSQL: Clear session connection** (от командната палитра), за да я изчистите.

**Приети формати:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias` (изисква конфигуриран `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Как работи

Без временни файлове, без чакане на пакетното изпълнение. Резултатите се появяват в
Test Explorer **с приключването на всеки тест**.

Разширението се свързва директно чрез Oracle, чете отчетите (JUnit + Coverage) и ги преобразува в родните API на VSCode.

## Конфигурация

| Настройка | По подразбиране | Описание |
|---|---|---|
| `utplsql.connection` | `""` | Връзка с Oracle. **Оставете празно** и използвайте променливата на средата `UTPLSQL_CONN`, за да избегнете съхраняването на паролата. Ако и двете са празни, разширението пита (запазва я само в сесията). |
| `utplsql.sourcePath` | `install` | Папка на производствения код (за картографиране на покритието към файлове). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs за откриване на спецификациите с `%suite`/`%test`. Ако тестовете ви са в `.sql`, използвайте `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Схема-собственик на покритите обекти. Празно = използва се потребителят на връзката (главни букви). |
| `utplsql.coverage.schemes` | `[]` | Покрити схеми (`a_coverage_schemes`). Празно = потребителят на връзката (или `utplsql.coverageOwner`). |
| `utplsql.coverage.includeObjects` | `[]` | Обекти за включване в покритието, като `OWNER.NAME` (напр. `["APP.MY_PKG"]`). Полезно за обекти, достигнати само динамично. |
| `utplsql.coverage.excludeObjects` | `[]` | Обекти за изключване от покритието, като `OWNER.NAME` (напр. `["UT3.UT_COVERAGE"]`). |
| `utplsql.coverage.includeSchemaExpr` | `""` | Regex на схеми за включване в покритието (напр. `^APP$`). |
| `utplsql.coverage.includeObjectExpr` | `""` | Regex на обекти за включване в покритието. |
| `utplsql.coverage.excludeSchemaExpr` | `""` | Regex на схеми за изключване от покритието. |
| `utplsql.coverage.excludeObjectExpr` | `""` | Regex на обекти за изключване от покритието (напр. `^UT_` за framework-а utPLSQL). |
| `utplsql.timeoutMinutes` | `60` | Таймаут в минути за изпълнението на тестовете. |
| `utplsql.dbmsOutput` | `false` | Активира `DBMS_OUTPUT` в тестовата сесия. Полезно за отстраняване на грешки. |
| `utplsql.additionalReporters` | `[]` | Допълнителни reporters, които да се включат при всяко изпълнение (напр. `["ut_coverage_html_reporter"]`). По подразбиране (documentation, junit) винаги са включени и не е нужно да се изброяват. |
| `utplsql.tags` | `""` | Израз за тагове на utPLSQL за филтриране кои тестове се изпълняват (напр. `fast & !integration`). Празно изпълнява всички. |
| `utplsql.run.randomOrder` | `false` | Изпълнява тестовете в случаен ред, за да разкрие зависимости на реда между тях. |
| `utplsql.run.randomOrderSeed` | `0` | Seed за случайния ред. `0` = избран от базата (невъзпроизводим); > 0 възпроизвежда същия ред. |
| `utplsql.codeLens.enabled` | `true` | Показва CodeLens бутони Run/Run with Coverage над `%suite` и `%test`. |
| `utplsql.statusBar.enabled` | `true` | Показва индикатора за статус на тестовете в status bar. |
| `utplsql.decorations.enabled` | `true` | Показва декорации за успех/неуспех на редовете с `%suite` и `%test` след изпълнение. |
| `utplsql.oraclePoolMin` | `2` | Минимален брой връзки, поддържани в пула на Oracle runner (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Максимален брой връзки в пула на Oracle runner (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Увеличение при разширяване на пула на Oracle runner (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Секунди между проверките за здраве на неактивните връзки в пула (node-oracledb). `0` = ping при всяко извличане. |
| `utplsql.oracleClientMode` | `thin` | Режим на драйвера: `thin` (чист JavaScript, без нативен клиент) или `thick` (използва Oracle Instant Client). Използвайте `thick` само за бази, които изискват NNE (Native Network Encryption); изисква `utplsql.oracleClientLibDir` и презареждане на прозореца. |
| `utplsql.oracleClientLibDir` | `""` | Директория на Oracle Instant Client. Задължителна, когато `utplsql.oracleClientMode` е `thick` (напр. `C:\oracle\instantclient_23_5`). |
| Дебъгът не спира на точката на прекъсване | Пакет без debug информация или липсващи debug привилегии | Компилирайте с `PLSQL_OPTIMIZE_LEVEL <= 1` (или `ALTER PACKAGE ... COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) и дайте `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. Точките на прекъсване в `test_*.pkb` може да не се задействат (utPLSQL изпълнява тестовете чрез динамичен SQL); поставете ги в тествания код. |
| `utplsql.oracleClientConfigDir` | `""` | Конфигурационна директория на Oracle (TNS_ADMIN) със `sqlnet.ora`/`tnsnames.ora`. Незадължителна; използва се само от thick режима. |
| `utplsql.organization` | `file` | Организация на дървото: `file` (по път) или `schema` (Schema > Package > Suite > Test). В режим `schema` комплектите също се откриват от базата данни (`ut_runner.get_suites_info`, с връщане към `ALL_OBJECTS`/`ALL_SOURCE`), когато `.pks` файлове не са в работната област — с виртуален URI `utplsql-db:/` (изпълнение и преминаване към грешката работят; без CodeLens/декорации). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob шаблон за извличане на схемата от пътя. Използвайте `{schema}` като плейсхолдър. В режим `schema` директориите под основата на шаблона (напр. `db/*`) определят схемите, по които се прави заявка в базата данни. |
| `utplsql.discovery.source` | `auto` | Източник на дървото в режим `schema`: `auto` използва API на базата (`ut_runner.get_suites_info`) и преминава към `ALL_SOURCE`/файлове при недостъпност; `database` изисква API; `file` изключва откриването през базата. |
| `utplsql.refreshDebounceMs` | `300` | Debounce (ms) за обединяване на събитията на наблюдателя на файлове `.pks`/`.pkb` преди опресняване на Test Explorer. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Показва грешки при компилация на PL/SQL от базата данни (`ALL_ERRORS`) като подчертавания в редактора и в панела „Проблеми" (източник "utPLSQL Compilation"). |
| `utplsql.setupDiagnostics.enabled` | `true` | Показва диагностика на конфигурацията (връзка, привилегии, версия) и **целостта на инсталацията на utPLSQL** (невалидни обекти в схемата UT3, с quick-fix „Recompile UT3") с quick-fix действия. |
| `utplsql.profiles` | `[]` | Записани профили за връзка с Oracle (име, връзка и презаписвания на `sourcePath`/`coverageOwner`/и т.н.) за превключване между среди. **Паролите се съхраняват в ключодържателя на ОС (VS Code SecretStorage), а не в настройките** — полето `connection` съхранява само `user@//host:port/service`. Стари профили с вграден пароль се мигрират автоматично при първо използване. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID на активния профил (`utplsql.profiles`). Когато е зададен, презаписва `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Проследява изгледите, изпълнени чрез `V$SQL` (булево покритие). Изисква `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Активира дебъгване на PL/SQL тестове (`DBMS_DEBUG`). Изисква `node-oracledb` + привилегии. Компилирайте целевия пакет с debug информация (`PLSQL_OPTIMIZE_LEVEL <= 1`) и дайте `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. |
| `utplsql.debugger.stopOnException` | `true` | Спира при PL/SQL изключения по време на дебъгване. |
| `utplsql.debugger.timeoutSeconds` | `300` | Таймаут (секунди) на дебъг сесията. |
| `utplsql.debugger.compileOnDebug` | `false` | Компилира обекта с информация за отстраняване на грешки (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) преди стартиране на сесията за отстраняване на грешки. |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | Език на съобщенията по време на изпълнение. `auto` следва VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; иначе en). Покрива **24 локали**. |

Пример (проект `.vscode/settings.json`):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

И, преди да отворите VSCode (или в PowerShell профила):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### За сътрудници

Създайте `.env` файл в корена на проекта (gitignored) с променливите
на средата, използвани от интеграционните тестове:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Употреба

1. Отворете PL/SQL проекта (с кода и тестовите пакети).
2. Компилирайте кода и тестовете в базата данни (Oracle разширение / SQLcl).
3. Отворете изгледа **Testing** → комплектите се появяват.
4. Изпълнете:
   - Чрез **CodeLens** — бутони ▶ Run/Run with Coverage над всеки `%suite` и `%test` в редактора.
   - Чрез **полето** (gutter) до всеки тест/комплект, или
   - Чрез **клавишните комбинации** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File и т.н.), или
   - Бутона **Run Tests** на изгледа Test Explorer, или
   - **Десен бутон** върху папка/файл → *utPLSQL: Run tests…* (със или без покритие).
5. След изпълнението вижте:
   - **Inline декорации** (✓/✗/⚠) в редактора до анотациите на тестовете.
   - **Status Bar** с брой успешни/неуспешни и обща продължителност.
   - **Test Explorer** с подробни резултати.
6. За покритие използвайте профила **Run with Coverage** (или елемента „with coverage" от менюто).
7. За бързо повтаряне на изпълненията:
   - `Ctrl+Shift+U L` — **Rerun Last** (повтаря последното изпълнение, със или без покритие).
   - `Ctrl+Shift+U U` — **Run at Cursor** (изпълнява `%test`/`%suite` под курсора).
   - `Ctrl+Shift+U X` — **Run Failed Only** (изпълнява само тестовете, които са пропаднали).
8. **За директен Oracle (streaming):** нищо за инсталиране — VSIX вече включва thin драйвера `oracledb`.
9. За диагностика използвайте `utPLSQL: Show information` в палитрата — показва API/DB версиите с опция за копиране.
10. **utPLSQL: Select additional reporter...** — QuickPick с наличните в базата данни reporters.
11. **utPLSQL: Cancel run** — спира текущото изпълнение (`Escape` по време на изпълнение).
12. **utPLSQL: Refresh tests** — принуждава повторно откриване на `.pks`.

> 💡 **Когато пишете тестове:** парсерът се задвижва от токени — достатъчно е да имате `%suite`
> и декларацията `create package` във файла, и всеки `%test`, последван от неговата
> `PROCEDURE`. Няма изискване за празни редове.

### Поддържани анотации (v0.10.0+)

Освен `%suite` и `%test`, откриването разбира:

| Анотация | Ефект върху Test Explorer |
|---|---|
| `-- %disabled` | Комплектът или тестът **не се появява** в дървото (пропуска се при откриването) |
| `-- %throws(-20001)` | Отбелязва, че тестът очаква изключение 20001 (метаданни `expectedError`) |
| `-- %tags(fast, critical)` | Тагове на теста; филтрирайте изпълнението с настройката `utplsql.tags` (напр. `fast & !integration`) |
| `-- %displayname(Name)` | Персонализирано име, показано вместо описанието на `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Отбелязва комплекта с lifecycle hooks (метаданни) |

Анотациите не правят разлика между главни и малки букви. В заглавната част на комплекта (между
`%suite` и първия `%test`) те се отнасят към комплекта; след `%test` — към теста.

## Команди

Всички команди на разширението (палитра `Ctrl+Shift+P`, префикс `utPLSQL:`):

| Команда | Описание | Клавишна комбинация в UI |
|---|---|---|
| `utPLSQL: Run all tests` | Изпълнява всички комплекти в работната област | ▶ бутон в изгледа Testing |
| `utPLSQL: Run tests in this file` | Изпълнява комплектите на активния `.pks`/`.pkb` | Десен бутон → файл |
| `utPLSQL: Run tests in this file with coverage` | Същото, с профил за покритие | Десен бутон → файл |
| `utPLSQL: Run tests in this folder` | Изпълнява комплектите на избраната папка | Десен бутон → папка |
| `utPLSQL: Run tests in this folder with coverage` | Същото, с профил за покритие | Десен бутон → папка |
| `utPLSQL: Refresh tests` | Принуждава повторно откриване на `.pks` | — |
| `utPLSQL: Cancel run` | Спира текущото изпълнение | — |
| `utPLSQL: Show utPLSQL info` | API/DB версии с опция за копиране | — |
| `utPLSQL: Select additional reporter...` | QuickPick с база данни на reporters | — |
| `utPLSQL: Clear session connection` | Премахва връзката от кеша на сесията | — |
| `utPLSQL: Rerun Last` | Повтаря последното изпълнение | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Изпълнява теста под курсора | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Повторно изпълнява само пропадналите тестове | `Ctrl+Shift+U X` |
| `utPLSQL: Validate setup` | Изпълнява пълна валидация на настройката (връзка, UT3 инсталация) и показва резултатите | — |
| `utPLSQL: Configure connection` | Отваря настройките на `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Копира SQL привилегиите в клипборда | — |
| `utPLSQL: Show Test Explorer` | Фокусира изгледа Testing | — |
| `utPLSQL: Switch connection profile...` | Превключва активния профил за връзка (QuickPick) | Щракване в status bar (с активен профил) |
| `utPLSQL: New connection profile...` | Съветник за създаване и активиране на профил | — |
| `utPLSQL: Manage connection profiles` | Отваря настройките на `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Импортира връзки от SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Стартира дебъг сесия на теста под активния файл | — |
| `utPLSQL: Възстановяване на кеша с анотации` | Възстановява кеша с анотации на utPLSQL в базата и обновява дървото | — |
| `utPLSQL: Компилиране за отстраняване на грешки` | Компилира обекта на избрания файл/папка с информация за отстраняване на грешки | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |

> **Recompile UT3** (`utplsql.recompileUt3`) **не** е команда от палитрата — това е
> вътрешен quick-fix на диагностиката „utPLSQL Setup" (невалидни обекти в
> utPLSQL схемата).

## Клавишни комбинации

Всички клавишни комбинации използват префикса `Ctrl+Shift+U` (`Cmd+Shift+U` на Mac):

| Комбинация | Команда |
|---|---|
| `Ctrl+Shift+U R` | Изпълнява всички тестове |
| `Ctrl+Shift+U T` | Изпълнява тестовете във файла |
| `Ctrl+Shift+U Shift+T` | Изпълнява тестовете във файла с покритие |
| `Ctrl+Shift+U F` | Обновява тестовете |
| `Ctrl+Shift+U I` | Показва информация за utPLSQL |
| `Ctrl+Shift+U C` | Изчиства връзката на сесията |
| `Ctrl+Shift+U L` | Повтаря последното изпълнение |
| `Ctrl+Shift+U U` | Изпълнение при курсора |
| `Ctrl+Shift+U X` | Само пропадналите |
| `Escape` | Спира изпълнението |

## Покритие

- **Изпълнените** редове стават зелени в полето; **неизпълнените** редове стават червени.
- Разделът **Test Coverage** показва **процента по файл/папка**.



Разширението подава `-source_path` (= `utplsql.sourcePath`) и картографира покритите обекти
към изходните файлове чрез `utplsql.coverageSourceArgs` (regex + `type_mapping`). `-owner`
се извежда от връзката (или от `utplsql.coverageOwner`).

### Картографиране на покритието към файлове (`coverageSourceArgs`)

`type_mapping` превежда „типа", уловен от regex, в типа на Oracle. Три често срещани конвенции:

**1) По директория** — структура `sourcePath/<type>/<name>.sql` (папки `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Работи на всякаква дълбочина (`.*` поглъща модулите отгоре). Различните имена на папки
> (напр. `package`, `pkg`, `pacote`) могат да бъдат изброени в `type_mapping`.

**2) По префикс на името** — конвенция `pkg_*`, `prc_*`, `vw_*` (независимо от папката):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) По типизирано разширение** — файлове `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (независимо от папката):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Важни бележки:**
- **Пакети → `PACKAGE BODY`** (не `PACKAGE`): покритието се събира в **тялото** на пакета.

## Reporters

Разширението винаги включва **два** reporters по подразбиране:
`ut_documentation_reporter` (stdout) и
`ut_junit_reporter` (резултати → Test Explorer).
`ut_coverage_cobertura_reporter` се добавя **само при стартиране с покритие**.

**Динамична валидация** — преди стартиране с покритие разширението запитва
базата данни чрез `TABLE(ut_runner.get_reporters_list())`. Ако
`UT_COVERAGE_COBERTURA_REPORTER` не съществува в базата данни (напр. остарял
utPLSQL), покритието се пропуска с предупреждение в изхода. Изпълнението на тестовете
никога не се блокира.

**Допълнителни фиксирани reporters** — настройка `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Reporters по подразбиране автоматично се дедупликират, дори ако са
изброени тук.

**Временен reporter за сесията** — команда **utPLSQL: Select additional
reporter...** отваря QuickPick с динамичния списък от базата данни. Избраният
reporter се запазва в сесията, но изборът **не се прилага**
в текущата версия само с Oracle.

## Изисквания към базата данни

**Покритие** (винаги) — активира profiler-а:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Без това тестовете се изпълняват, но покритието излиза **празно**.

**Откриване на тестове в ДРУГИ схеми** (utPLSQL **shared** инсталация, напр. собственик `UT3`):
за да вижда и разпарсва тестовете на приложните схеми, собственикът на utPLSQL трябва
да **чете речника** на тези схеми:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **Само `SELECT ANY DICTIONARY` НЕ е достатъчно** — нужни са **директни** привилегии върху тези изгледи
  (заради `dbms_assert.sql_object_name` в definer контекст).
- DDL тригерът на utPLSQL **също трябва да е инсталиран** (поддържа кеша на анотациите актуален).
- Проверка (като собственик): `SELECT ut_metadata.get_source_view_name FROM dual;` трябва да върне `dba_source`.

> При **per-schema** инсталации (utPLSQL в същата схема като тестовете) тези крос-схема привилегии **не са**
> необходими — framework-ът чете собствения си source.

## Известни ограничения

- Картографирането резултат→тест се прави по име на пакет + име/описание на теста;
  идентични описания в различни пакети могат да създадат двусмислие (индексът е
  ограничен до пакета, за да го минимизира).
- Взема се предвид **първата** папка на работната област за разрешаване на `sourcePath`.
- Откриването чете `.pks` (спецификациите); дръжте анотациите `%suite`/`%test` в спецификацията.

## Отстраняване на проблеми

| Симптом | Вероятна причина | Решение |
|---|---|---|
| Празно покритие | Липсва `GRANT EXECUTE ON DBMS_PROFILER` | Изпълнете привилегиите от [Изисквания към базата данни](#изисквания-към-базата-данни) или използвайте `utPLSQL: Copy coverage grants to clipboard` |
| Празно покритие | Oracle 19c изисква допълнителни привилегии | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Грешка при компилация без индикация | Код с PL/SQL синтактична грешка | Оставете `utplsql.compilationDiagnostics.enabled` включен (по подразбиране); грешките от `ALL_ERRORS` се появяват в панела „Проблеми" след изпълнение |
| Грешка при връзка | Невалиден низ или недостъпна БД | Използвайте `utPLSQL: Validate setup` |
| `%suite` не се разпознава | Липсва `%suite`/`create package` във файла, или `%test` без `PROCEDURE` | Проверете спецификацията; изпълнете `utPLSQL: Refresh tests` |
| CodeLens не се появява | `editor.codeLens` е изключен или има конфликт | Активирайте `"editor.codeLens": true`; проверете `utplsql.codeLens.enabled` |
| Комбинациите не работят | Конфликт с друго разширение или комбинация на VSCode | Отидете на File → Preferences → Keyboard Shortcuts и потърсете `utplsql`, за да предефинирате |
| Нужна диагностика | Неясно какво прави разширението вътрешно | Задайте `UTPLSQL_DEBUG=1` преди стартиране на VSCode за включване на диагностични логове (контекст на грешки при връзка/откриване/покритие) в конзолата Extension Host |

## Забележка

Това е независим проект на общността. Той не е свързан, одобрен или спонсориран от екипа на рамката utPLSQL и Oracle Corporation. utPLSQL и Oracle са търговски марки на съответните им собственици.

## Лиценз

MIT © Gil Cleber Barboza
