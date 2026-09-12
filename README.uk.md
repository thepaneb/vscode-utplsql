<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · [Română](README.ro.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Polski](README.pl.md) · **Українська** · [Čeština](README.cs.md) · [Български](README.bg.md) · [Српски](README.sr.md) · [Türkçe](README.tr.md) · [Ελληνικά](README.el.md) · [Magyar](README.hu.md) · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md) · [ไทย](README.th.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

Інтегрує [utPLSQL](https://www.utplsql.org/) у VSCode, додаючи тести PL/SQL до нативного **Test Explorer**, з контекстним меню та візуальним покриттям.

- 🧪 **Нативний Test Explorer** — набори та тести з'являються у поданні тестування; запуск за тестом, набором, файлом або папкою.
- 🔍 **CodeLens** — кнопки Run/Run with Coverage над `%suite` та `%test` у редакторі, не виходячи з коду.
- ⌨️ **Гарячі клавіші** — префікс `Ctrl+Shift+U` + клавіша для основних команд (R = Run All, T = Run File, L = Rerun Last тощо).
- 🖱️ **Контекстне меню** — правий клік на **папці** або файлі **`.pks`/`.pkb`** (у Explorer або в редакторі) для запуску тестів.
- 📊 **Візуальне покриття** — кольорові поля біля кожного рядка (покрито/не покрито) та відсоток по кожному файлу у вкладці **Coverage**.
- ✅ **Вбудовані декорації** — значки ✓/✗/⚠ у редакторі після виконання, з підказкою про помилку та індикатором у смузі огляду.
- 📌 **Рядок стану** — індикатор із кількістю пройдених/провалених тестів, тривалістю та прогресом у реальному часі.
- 🔁 **Розумний повторний запуск** — Rerun Last, Run at Cursor, Run Failed Only одним сполученням клавіш.
- 🚀 **Прямий режим Oracle (через node-oracledb)** — потокове виконання в реальному часі, без очікування завершення пакету.
- 🔧 **Діагностика налаштувань** — проактивна перевірка підключення, привілеїв та версії зі швидким виправленням.
- 🧩 **Дерево з урахуванням схем** — організація тестів у Test Explorer за схемою Schema > Package > Suite > Test.
- 🎯 **Перехід до помилки** — пряма навігація до рядка перевірки, яка не вдалася (через нативну функцію "Go to Error").
- 🔌 **Профілі підключення** — збереження та перемикання між кількома середовищами (DEV/TEST/PROD) із налаштуваннями на профіль, через рядок стану або палітру команд.
- 📈 **Покриття інструкцій та представлень** — вкладка Coverage показує `% of statements` (PROCEDURE/FUNCTION) по кожному файлу та відстежує представлення, виконані через `V$SQL`.
- 🐛 **PL/SQL Debug** — точки зупину та покрокове налагодження тестів utPLSQL через `DBMS_DEBUG` (нативний Debug Adapter).
- 🌍 **i18n — 24 мови** — `utplsql.language` слідує за VSCode (15 нативних + 9 від спільноти: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Встановлення

Розширення можна встановити двома способами:

1. **З Marketplace:** Знайдіть **utPLSQL Test Runner** у панелі розширень VSCode (`Ctrl+Shift+X`) і натисніть **Install**.
2. **Вручну (.vsix):** Завантажте файл `.vsix` потрібної версії та встановіть його у VSCode:
   * **Через командний рядок:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Через інтерфейс:** Відкрийте панель розширень (`Ctrl+Shift+X`), натисніть три крапки `...` (у верхньому правому куті) та оберіть **Install from VSIX...**.

## Вимоги

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** встановлений у базі даних Oracle.
- **VSCode 1.88+** (Test Coverage API).

Розширення — це лише "графічний клієнт": тести виконує база даних безпосередньо (node-oracledb).

## Підключення

Розширенню потрібен рядок підключення до Oracle для запуску тестів. Визначення відбувається в такому порядку:

1. **Активний профіль підключення** — `utplsql.activeProfile`, що вказує на профіль у `utplsql.profiles` (перевизначає все, що нижче).
2. **Налаштування `utplsql.connection`** — зчитується з `settings.json` проєкту/користувача.
3. **Змінна середовища `UTPLSQL_CONN`** — задана перед запуском VSCode.
4. **Кеш сесії** — якщо користувач уже ввів підключення через запит.
5. **Запит користувачеві** — запитує та зберігає лише в поточній сесії.

Профілі підключення (`utplsql.profiles`) також можуть перевизначати `sourcePath`, `coverageOwner` тощо для кожного середовища — див. `utplsql.activeProfile` у таблиці конфігурації.

⚠️ **Рекомендація щодо безпеки:** рядок підключення містить пароль. **НЕ використовуйте** налаштування `utplsql.connection` у спільних середовищах (settings.json може зберігатися в системі контролю версій або бути видимим для інших). Натомість **використовуйте змінну середовища `UTPLSQL_CONN`**:

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

Якщо ні налаштування, ні змінна середовища не визначені, розширення запитує підключення та
зберігає його лише в пам'яті під час сесії — скористайтеся командою
**utPLSQL: Clear session connection** (палітра команд), щоб очистити його.

**Підтримувані формати:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias` (потрібен налаштований `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Як це працює

### Прямий режим Oracle (v0.9.0)

Жодних тимчасових файлів, жодного очікування завершення пакету. Результати з'являються в
Test Explorer **у міру завершення кожного тесту**. VSIX вже містить тонкий драйвер `oracledb` (без Instant Client).

## Конфігурація

| Параметр | За замовчуванням | Опис |
|---|---|---|
| `utplsql.connection` | `""` | Підключення до Oracle. **Залиште порожнім** і використовуйте змінну середовища `UTPLSQL_CONN`, щоб не зберігати пароль. Якщо обидва значення порожні, розширення запитає підключення (зберігає його лише в сесії). |
| `utplsql.sourcePath` | `install` | Папка виробничого коду (для зіставлення покриття з файлами). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs для пошуку специфікацій із `%suite`/`%test`. Якщо ваші тести у `.sql`, використовуйте `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Схема-власник покритих об'єктів. Порожньо = використовується користувач підключення (великими літерами). |
| `utplsql.timeoutMinutes` | `60` | Час очікування у хвилинах. |
| `utplsql.dbmsOutput` | `false` | Увімкнення `DBMS_OUTPUT` у сесії тестування. |
| `utplsql.additionalReporters` | `[]` | Додаткові репортери, які включаються в кожен запуск (напр. `["ut_coverage_html_reporter"]`). Стандартні (documentation, junit, coverage) завжди включаються, їх не потрібно перелічувати. |
| `utplsql.codeLens.enabled` | `true` | Показує кнопки CodeLens Run/Run with Coverage над `%suite` та `%test`. |
| `utplsql.statusBar.enabled` | `true` | Показує індикатор статусу тестів у рядку стану. |
| `utplsql.decorations.enabled` | `true` | Показує декорації пройдено/не пройдено на рядках `%suite` та `%test` після виконання. |
| `utplsql.oraclePoolMin` | `2` | Мінімальна кількість з'єднань у пулі Oracle runner (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Максимальна кількість з'єднань у пулі Oracle runner (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Приріст при розширенні пулу Oracle runner (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Інтервал у секундах між перевірками стану простаючих з'єднань пулу (node-oracledb). `0` = ping при кожній перевірці з'єднання. |
| `utplsql.organization` | `file` | Організація дерева: `file` (за шляхом) або `schema` (Schema > Package > Suite > Test). У режимі `schema` набори також виявляються з бази даних (`ALL_OBJECTS`/`ALL_SOURCE`), коли у робочій області немає файлів `.pks` — з віртуальним URI `utplsql-db:/` (без CodeLens/декорацій/переходу до помилки). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob-шаблон для вилучення схеми зі шляху. Використовуйте `{schema}` як заповнювач. У режимі `schema` каталоги нижче бази шаблону (напр. `db/*`) визначають схеми, які запитуються в базі даних. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Показує помилки компіляції PL/SQL як підкреслення в редакторі та на панелі Problems. |
| `utplsql.setupDiagnostics.enabled` | `true` | Показує діагностику конфігурації (підключення, привілеї, версія) та **цілісність інсталяції utPLSQL** (недійсні об'єкти у схемі UT3, зі швидким виправленням "Recompile UT3") з діями швидкого виправлення. |
| `utplsql.profiles` | `[]` | Збережені профілі підключення Oracle (ім'я, підключення та перевизначення `sourcePath`/`coverageOwner` тощо) для перемикання між середовищами. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID активного профілю (`utplsql.profiles`). Якщо встановлено, перевизначає `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Відстежує представлення, виконані через `V$SQL` (boolean-покриття). Потребує `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Увімкнення налагодження тестів PL/SQL (`DBMS_DEBUG`). Потребує `node-oracledb` + привілеї. |
| `utplsql.debugger.stopOnException` | `true` | Зупинка на винятках PL/SQL під час налагодження. |
| `utplsql.debugger.timeoutSeconds` | `300` | Час очікування (с) сеансу налагодження. |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | Мова повідомлень під час виконання. `auto` слідує за VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; інакше en). Покриває **24 локалі** (15 нативних + 9 від спільноти). |

Приклад (`.vscode/settings.json` проєкту):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

І, перед запуском VSCode (або в профілі PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Для контриб'юторів

Створіть файл `.env` у корені проєкту (gitignored) із змінними
середовища, які використовуються інтеграційними тестами:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Використання

1. Відкрийте проєкт PL/SQL (з кодом і тестовими пакетами).
2. Скомпілюйте код і тести в базі даних (розширення Oracle / SQLcl).
3. Відкрийте подання **Testing** → з'являться набори.
4. Запустіть:
   - Через **CodeLens** — ▶ кнопки Run/Run with Coverage над кожним `%suite` та `%test` у редакторі.
   - Через **полоску ліворуч** біля кожного тесту/набору, або
   - Через **гарячі клавіші** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File тощо), або
   - Кнопку **Run Tests** подання Test Explorer, або
   - **Правий клік** на папці/файлі → *utPLSQL: Run tests…* (з покриттям або без).
5. Після виконання перегляньте:
   - **Вбудовані декорації** (✓/✗/⚠) у редакторі біля анотацій тестів.
   - **Рядок стану** з кількістю пройдених/провалених та загальною тривалістю.
   - **Test Explorer** з детальними результатами.
6. Для покриття використовуйте профіль **Run with Coverage** (або пункт меню "with coverage").
7. Для швидкого повторення виконань:
   - `Ctrl+Shift+U L` — **Rerun Last** (повторює останнє виконання, з покриттям або без).
   - `Ctrl+Shift+U U` — **Run at Cursor** (запускає `%test`/`%suite` під курсором).
   - `Ctrl+Shift+U X` — **Run Failed Only** (запускає лише тести, які не пройшли).
8. **Для прямого режиму Oracle (streaming):** нічого встановлювати не потрібно — VSIX вже містить тонкий драйвер `oracledb`.
9. Для діагностики використовуйте `utPLSQL: Show information` у палітрі — показує версії API/DB з опцією копіювання.
10. **utPLSQL: Select additional reporter...** — QuickPick із репортерами, доступними в базі даних.
11. **utPLSQL: Cancel execution** — зупиняє виконання, що триває (`Escape` під час виконання).
12. **utPLSQL: Refresh tests** — примусове повторне виявлення `.pks`.

> 💡 **Під час написання тестів:** парсер керується токенами — достатньо мати `%suite`
> та оголошення `create package` у файлі, і кожен `%test`, за яким іде його
> `PROCEDURE`. Вимог до порожніх рядків немає.

### Підтримувані анотації (v0.10.0+)

Окрім `%suite` та `%test`, виявлення розуміє:

| Анотація | Вплив на Test Explorer |
|---|---|
| `-- %disabled` | Набір або тест **не з'являється** у дереві (пропускається під час виявлення) |
| `-- %throws(-20001)` | Позначає, що тест очікує виняток 20001 (метадані `expectedError`) |
| `-- %tags(fast, critical)` | Теги тесту (метадані; фільтрація за тегами — у планах) |
| `-- %displayname(Name)` | Власне ім'я, що відображається замість опису `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Позначає набір хуками життєвого циклу (метадані) |

Анотації нечутливі до регістру. У заголовку набору (між `%suite` та першим
`%test`) вони застосовуються до набору; після `%test` — до тесту.

## Команди

Усі команди розширення (палітра `Ctrl+Shift+P`, префікс `utPLSQL:`):

| Команда | Опис | Сполучення в інтерфейсі |
|---|---|---|
| `utPLSQL: Run all tests` | Запускає всі набори у робочій області | ▶ кнопка у поданні Testing |
| `utPLSQL: Run tests in this file` | Запускає набори активного `.pks`/`.pkb` | Правий клік → файл |
| `utPLSQL: Run tests in this file with coverage` | Те саме, з профілем покриття | Правий клік → файл |
| `utPLSQL: Run tests in this folder` | Запускає набори вибраної папки | Правий клік → папка |
| `utPLSQL: Run tests in this folder with coverage` | Те саме, з профілем покриття | Правий клік → папка |
| `utPLSQL: Refresh tests` | Примусове повторне виявлення `.pks` | — |
| `utPLSQL: Cancel execution` | Зупиняє запущене виконання | — |
| `utPLSQL: Show utPLSQL information` | Версії API/DB з опцією копіювання | — |
| `utPLSQL: Select additional reporter...` | QuickPick із репортерами бази даних | — |
| `utPLSQL: Clear session connection` | Видаляє підключення з кешу сесії | — |
| `utPLSQL: Rerun Last` | Повторює останнє виконання | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Запускає тест під курсором | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Повторно запускає лише невдалі тести | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Виконує повну перевірку налаштувань (підключення, інсталяція UT3) і показує результати | — |
| `utPLSQL: Configure connection` | Відкриває налаштування на `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Копіює SQL привілеїв у буфер обміну | — |
| `utPLSQL: Show Test Explorer` | Фокусує подання Testing | — |
| `utPLSQL: Switch connection profile...` | Перемикає активний профіль підключення (QuickPick) | Клік у рядку стану (з активним профілем) |
| `utPLSQL: New connection profile...` | Майстер створення та активації профілю | — |
| `utPLSQL: Manage connection profiles` | Відкриває налаштування на `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Імпортує підключення з SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Запускає сеанс налагодження тесту в активному файлі | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |

> **Recompile UT3** (`utplsql.recompileUt3`) — **не** команда палітри: це
> внутрішнє швидке виправлення діагностики "utPLSQL Setup" (недійсні об'єкти у
> схемі utPLSQL).

## Гарячі клавіші

Усі сполучення використовують префікс `Ctrl+Shift+U` (`Cmd+Shift+U` на Mac):

| Сполучення | Команда |
|---|---|
| `Ctrl+Shift+U R` | Запустити всі тести |
| `Ctrl+Shift+U T` | Запустити тести у файлі |
| `Ctrl+Shift+U Shift+T` | Запустити тести у файлі з покриттям |
| `Ctrl+Shift+U F` | Оновити тести |
| `Ctrl+Shift+U I` | Показати інформацію utPLSQL |
| `Ctrl+Shift+U C` | Очистити підключення сесії |
| `Ctrl+Shift+U L` | Повторити останній запуск |
| `Ctrl+Shift+U U` | Запустити під курсором |
| `Ctrl+Shift+U X` | Запустити лише невдалі |
| `Escape` | Скасувати виконання |

## Покриття

- **Виконані** рядки стають зеленими у полі ліворуч; **не виконані** рядки — червоними.
- Вкладка **Test Coverage** показує **відсоток по файлу/папці**.



Розширення передає `-source_path` (= `utplsql.sourcePath`) і зіставляє покриті об'єкти
з файлами вихідного коду через `utplsql.coverageSourceArgs` (regex + `type_mapping`). `-owner`
виводиться з підключення (або з `utplsql.coverageOwner`).

### Відображення покриття на файли (`coverageSourceArgs`)

`type_mapping` перетворює «тип», захоплений регулярним виразом, на тип Oracle. Три поширені домовленості:

**1) За каталогом** — структура `sourcePath/<type>/<name>.sql` (папки `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Працює на будь-якій глибині (`.*` поглинає модулі вище). Різні назви папок
> (напр. `package`, `pkg`, `pacote`) можна перелічити у `type_mapping`.

**2) За префіксом імені** — домовленість `pkg_*`, `prc_*`, `vw_*` (не залежить від папки):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) За типізованим розширенням** — файли `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (не залежить від папки):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Важливі зауваження:**
- **Пакети → `PACKAGE BODY`** (не `PACKAGE`): покриття збирається в **body** пакета.
- **Windows / метасимволи регулярних виразів:** уникайте **`^`** у регулярних виразах (його споживає `cmd` із `.bat`) — тому в прикладах
  використовуються `\w` і `[/\\]`.

## Репортери

Розширення завжди включає три репортери за замовчуванням:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (результати → Test Explorer) і
`ut_coverage_cobertura_reporter` (покриття, якщо доступно).

**Динамічна перевірка** — перед запуском із покриттям розширення запитує
базу даних через `utplsql reporters <conn>`. Якщо
`UT_COVERAGE_COBERTURA_REPORTER` не існує в базі даних (напр. застарілий
utPLSQL), покриття пропускається з попередженням у виводі. Виконання тестів
ніколи не блокується.

**Додаткові фіксовані репортери** — параметр `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Три репортери за замовчуванням автоматично дедуплікуються, навіть якщо
перелічені тут.

**Тимчасовий репортер для сесії** — команда **utPLSQL: Select additional
reporter...** відкриває QuickPick із динамічним списком із бази даних.
Вибраний репортер використовується під час наступного виконання та після цього відкидається (не
зберігається в налаштуваннях).

## Вимоги до бази даних

**Покриття** (завжди) — увімкнення профілювальника:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Без цього тести виконуються, але покриття виходить **порожнім**.

**Виявлення тестів в ІНШИХ схемах** (utPLSQL **спільна** інсталяція, напр. власник `UT3`):
щоб фреймворк бачив і розбирав тести схем застосунків, власнику utPLSQL потрібно
**читати словник** цих схем:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **Лише `SELECT ANY DICTIONARY` НЕ достатньо** — потрібні **прямі** привілеї на ці представлення
  (через `dbms_assert.sql_object_name` у контексті визначника).
- Також має бути встановлений **DDL-тригер** utPLSQL (підтримує кеш анотацій в актуальному стані).
- Перевірка (від імені власника): `SELECT ut_metadata.get_source_view_name FROM dual;` має повертати `dba_source`.

> При інсталяції **у кожній схемі** (utPLSQL у тій самій схемі, що й тести) ці міжсхемні привілеї **не**
> потрібні — фреймворк читає власний вихідний код.

## Відомі обмеження

- Зіставлення результат→тест виконується за ім'ям пакета + ім'ям/описом тесту;
  однакові описи в різних пакетах можуть створювати неоднозначність (індекс
  обмежений пакетом, щоб звести її до мінімуму).
- Для визначення `sourcePath` враховується **перша** папка робочої області.
- Виявлення читає `.pks` (специфікації); тримайте анотації `%suite`/`%test` у специфікації.

## Усунення неполадок

| Симптом | Ймовірна причина | Рішення |
|---|---|---|
| Набори не з'являються | Немає покритих `.pks` файлів | Виконайте `utPLSQL: Validate configuration` для діагностики |
| Порожнє покриття | Відсутній `GRANT EXECUTE ON DBMS_PROFILER` | Виконайте привілеї з [Вимоги до бази даних](#вимоги-до-бази-даних) або використайте `utPLSQL: Copy coverage grants to clipboard` |
| Порожнє покриття | Oracle 19c потребує додаткові привілеї | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Помилка компіляції без пояснення | Код із синтаксичною помилкою PL/SQL | Увімкніть `utplsql.compilationDiagnostics.enabled` (увімкнено за замовчуванням); див. панель Problems |
| Помилка підключення | Некоректний рядок або недоступна БД | Використайте `utPLSQL: Validate configuration` |
| Тайм-аут під час виконання | Тести виконуються довше, ніж `timeoutMinutes` | Збільште `utplsql.timeoutMinutes` |
| `%suite` не розпізнано | Відсутні `%suite`/`create package` у файлі, або `%test` без `PROCEDURE` | Перевірте специфікацію; виконайте `utPLSQL: Refresh tests` |
| CodeLens не з'являється | `editor.codeLens` вимкнено або конфлікт | Увімкніть `"editor.codeLens": true`; перевірте `utplsql.codeLens.enabled` |
| Гарячі клавіші не працюють | Конфлікт з іншим розширенням або сполученням VSCode | Відкрийте File → Preferences → Keyboard Shortcuts і знайдіть `utplsql`, щоб переназначити |

## Ліцензія

MIT © Gil Cleber Barboza