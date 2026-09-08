<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · **Русский** · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

Интегрирует [utPLSQL](https://www.utplsql.org/) в VSCode, добавляя тесты PL/SQL в нативный **Test Explorer**, с контекстным меню и визуальным покрытием.

- 🧪 **Нативный Test Explorer** — наборы и тесты отображаются в представлении тестирования; запуск по тесту, набору, файлу или папке.
- 🔍 **CodeLens** — кнопки Run/Run with Coverage над `%suite` и `%test` в редакторе, не покидая ваш код.
- ⌨️ **Горячие клавиши** — префикс `Ctrl+Shift+U` + клавиша для основных команд (R = Run All, T = Run File, L = Rerun Last и т. д.).
- 🖱️ **Контекстное меню** — щелчок правой кнопкой мыши по **папке** или файлу **`.pks`/`.pkb`** (в Explorer или в редакторе) для запуска тестов.
- 📊 **Визуальное покрытие** — цветные поля у каждой строки (покрыто/не покрыто) и процент по каждому файлу во вкладке **Coverage**.
- ✅ **Встроенные декорации** — значки ✓/✗/⚠ в редакторе после выполнения, с подсказкой об ошибке и индикатором в линейке обзора.
- 📌 **Строка состояния** — индикатор с количеством пройденных/проваленных тестов, длительностью и прогрессом в реальном времени.
- 🔁 **Умный повторный запуск** — Rerun Last, Run at Cursor, Run Failed Only одним сочетанием клавиш.
- 🚀 **Oracle напрямую (через node-oracledb)** — потоковая передача в реальном времени, без ожидания завершения пакетного запуска.
- 🔧 **Диагностика настройки** — упреждающая проверка CLI, подключения, привилегий и версии с быстрым исправлением.
- 🧩 **Дерево с учётом схем** — организация тестов по схеме Schema > Package > Suite > Test в Test Explorer.
- 🎯 **Переход к ошибке** — прямая навигация к строке упавшей проверки (через нативное «Go to Error»).
- 🔌 **Профили подключения** — сохранение и переключение между несколькими окружениями (DEV/TEST/PROD) с настройками для каждого профиля через строку состояния или палитру команд.
- 📈 **Покрытие операторов и представлений** — вкладка Coverage показывает `% of statements` (PROCEDURE/FUNCTION) по каждому файлу и отслеживает представления, выполненные через `V$SQL`.
- 🐛 **Отладка PL/SQL** — точки останова и пошаговая отладка тестов utPLSQL через `DBMS_DEBUG` (нативный Debug Adapter).
- 🌍 **i18n — 24 языка** — `utplsql.language` следует за VSCode (15 встроенных + 9 от сообщества: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Установка

Расширение можно установить двумя способами:

1. **Из Marketplace:** найдите **utPLSQL Test Runner** в панели расширений VSCode (`Ctrl+Shift+X`) и нажмите **Install**.
2. **Вручную (.vsix):** скачайте файл `.vsix` нужной версии и установите его в VSCode:
   * **Через командную строку:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Через интерфейс:** откройте панель Extensions (`Ctrl+Shift+X`), нажмите на три точки `...` (в правом верхнем углу) и выберите **Install from VSIX...**.

## Требования

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** установлен в базе данных Oracle.
- **Для режима CLI:** на машине установлены [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java** (расширение вызывает CLI).
- **Для прямого режима Oracle:** ничего, кроме базы данных, — в VSIX уже входит тонкий драйвер `oracledb` (без Instant Client).
- **VSCode 1.88+** (API Test Coverage).

Расширение — это лишь «графический клиент»; тесты выполняет сама база данных: через
CLI (utPLSQL-cli + Java) или напрямую (node-oracledb, по умолчанию `runnerMode: auto`).

## Подключение

Расширению нужна строка подключения к Oracle для запуска тестов. Разрешение выполняется в следующем порядке:

1. **Активный профиль подключения** — `utplsql.activeProfile`, указывающий на профиль в `utplsql.profiles` (переопределяет всё нижеперечисленное).
2. **Параметр `utplsql.connection`** — считывается из `settings.json` проекта/пользователя.
3. **Переменная окружения `UTPLSQL_CONN`** — заданная до открытия VSCode.
4. **Кэш сессии** — если пользователь уже вводил подключение через запрос.
5. **Запрос пользователю** — спрашивает и сохраняет подключение только в текущей сессии.

Профили подключения (`utplsql.profiles`) также могут переопределять `sourcePath`, `coverageOwner`, `invocation`, `cliPath` и т. д. для каждого окружения — см. `utplsql.activeProfile` в таблице конфигурации.

⚠️ **Рекомендация по безопасности:** строка подключения содержит пароль. **НЕ** используйте параметр
`utplsql.connection` в общих окружениях (settings.json может храниться в системе контроля версий или быть
виден другим). Вместо этого **используйте переменную окружения `UTPLSQL_CONN`**:

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

Если ни параметр, ни переменная окружения не заданы, расширение запрашивает подключение и
хранит его только в памяти в течение сессии — используйте команду
**utPLSQL: Clear session connection** (палитра команд), чтобы очистить его.

**Допустимые форматы:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS-алиас**: `user/pass@tns_alias` (требуется настроенный `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Как это работает

Доступны два режима выполнения:

![Архитектура выполнения — два режима](docs/wiki/images/diagram-arquitetura.png)

### Прямой режим Oracle (v0.9.0) — `runnerMode: auto` или `oracle`

![Прямой режим Oracle — потоковая передача](docs/wiki/images/diagram-streaming.png)

Никаких временных файлов, никакого ожидания завершения пакета. Результаты появляются в
Test Explorer **по мере завершения каждого теста**.

### Режим CLI — `runnerMode: cli` (запасной)

![Режим CLI — пакетный запуск](docs/wiki/images/diagram-cli.png)

Расширение формирует командную строку CLI или подключается напрямую через Oracle, читает
отчёты (JUnit + Coverage) и преобразует их в нативные API VSCode. Режим
`auto` (по умолчанию) пробует прямое подключение к Oracle и переключается на CLI, если `node-oracledb`
не установлен. Используйте `runnerMode: cli`, чтобы всегда принудительно использовать CLI.

## Конфигурация

| Параметр | По умолчанию | Описание |
|---|---|---|
| `utplsql.connection` | `""` | Подключение к Oracle. **Оставьте пустым** и используйте переменную окружения `UTPLSQL_CONN`, чтобы не хранить пароль. Если оба значения пусты, расширение запросит подключение (сохраняет его только в сессии). |
| `utplsql.cliPath` | `utplsql` | Путь к исполняемому файлу utPLSQL-cli (например, `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Папка с производственным кодом (для сопоставления покрытия с файлами). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Глобы для поиска спецификаций с `%suite`/`%test`. Если ваши тесты в `.sql`, используйте `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Дополнительные аргументы для `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Схема-владелец покрываемых объектов. Пусто = используется пользователь подключения (в верхнем регистре). |
| `utplsql.coverageSourceArgs` | (см. **Coverage**) | Аргументы CLI, сопоставляющие покрытие с исходными файлами. |
| `utplsql.invocation` | `launcher` | Как вызывать CLI: `launcher` (через `.bat`/скрипт, по умолчанию) или `java` (прямой JVM, **без shell**). См. **Режим вызова**. |
| `utplsql.javaPath` | `java` | Исполняемый файл Java (PATH или полный путь). Используется только в режиме `java`. |
| `utplsql.cliHome` | `""` | Корень utPLSQL-cli (папка с `bin/` и `lib/`). Пусто = определяется из `cliPath`. Используется только в режиме `java`. |
| `utplsql.timeoutMinutes` | `60` | Тайм-аут в минутах для CLI. Флаг `-t` отправляется, только если значение отличается от `60`. |
| `utplsql.dbmsOutput` | `false` | Включает `DBMS_OUTPUT` в тестовой сессии. Флаг `-D` отправляется, только когда `true`. |
| `utplsql.quiet` | `false` | Подавляет информационные журналы CLI. Флаг `-q` отправляется, только когда `true`. |
| `utplsql.failureExitCode` | `1` | Код выхода при ошибке. Флаг `--failure-exit-code` отправляется, только если значение отличается от `1`. Значение `0` заставляет CLI всегда завершаться успешно. |
| `utplsql.additionalReporters` | `[]` | Дополнительные репортеры для каждого запуска (например, `["ut_coverage_html_reporter"]`). Стандартные (documentation, junit, coverage) всегда включаются, и их не нужно перечислять. |
| `utplsql.codeLens.enabled` | `true` | Показывает кнопки CodeLens Run/Run with Coverage над `%suite` и `%test`. |
| `utplsql.statusBar.enabled` | `true` | Показывает индикатор состояния тестов в строке состояния. |
| `utplsql.decorations.enabled` | `true` | Показывает декорации пройден/провален на строках `%suite` и `%test` после выполнения. |
| `utplsql.runnerMode` | `auto` | Режим выполнения: `auto` (напрямую через Oracle с node-oracledb, запасной вариант CLI), `cli` (всегда через командную строку), `oracle` (всегда напрямую через Oracle). |
| `utplsql.oraclePoolMin` | `2` | Минимум подключений, хранимых в пуле Oracle runner (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Максимум подключений в пуле Oracle runner (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Приращение при расширении пула Oracle runner (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Секунды между проверками работоспособности простаивающих подключений пула (node-oracledb). `0` = пинг при каждой выдаче из пула. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | Флаги JVM для режима `java` (например, `["-Xmx512m", "-Xms128m"]`). Вставляются перед `-cp`. |
| `utplsql.organization` | `file` | Организация дерева: `file` (по пути) или `schema` (Schema > Package > Suite > Test). В режиме `schema` с режимом `runnerMode` Oracle (`auto`/`oracle`) наборы также обнаруживаются в базе данных (`ALL_OBJECTS`/`ALL_SOURCE`), когда файлов `.pks` нет в рабочей области, — с виртуальным URI `utplsql-db:/` (без CodeLens/декораций/перехода к ошибке). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Глоб-шаблон для извлечения схемы из пути. Используйте `{schema}` в качестве плейсхолдера. В режиме `schema` каталоги ниже базового шаблона (например, `db/*`) определяют схемы, по которым выполняется запрос в базе данных. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Показывает ошибки компиляции PL/SQL как подчёркивания в редакторе и на панели Problems (режим CLI). |
| `utplsql.setupDiagnostics.enabled` | `true` | Показывает диагностику конфигурации (CLI, подключение, привилегии, версия) и **целостность установки utPLSQL** (недействительные объекты в схеме UT3, с быстрым исправлением «Recompile UT3») с действиями быстрого исправления. |
| `utplsql.profiles` | `[]` | Сохранённые профили подключения к Oracle (имя, подключение и переопределения `sourcePath`/`coverageOwner`/`invocation`/`cliPath`/и т. д.) для переключения между окружениями. |
| `utplsql.activeProfile` | `""` | ID активного профиля (`utplsql.profiles`). Если задан, переопределяет `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Отслеживает представления, выполненные через `V$SQL` (логическое покрытие). Требуется `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Включает отладку тестов PL/SQL (`DBMS_DEBUG`). Требуется `node-oracledb` + привилегии. |
| `utplsql.debugger.stopOnException` | `true` | Останавливается на исключениях PL/SQL во время отладки. |
| `utplsql.debugger.timeoutSeconds` | `300` | Тайм-аут (с) сеанса отладки. |
| `utplsql.language` | `auto` | Язык сообщений среды выполнения. `auto` следует за VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; в остальных случаях en). Охватывает **24 локали** (15 встроенных + 9 от сообщества). |

Пример (`.vscode/settings.json` проекта):

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

И перед открытием VSCode (или в профиле PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Для контрибьюторов

Создайте файл `.env` в корне проекта (gitignored) с переменными
окружения, используемыми интеграционными тестами:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
UTPLSQL_CLI_PATH=/path/to/utplsql
UTPLSQL_CLI_HOME=/path/to/utplsql-cli
```

### Режим вызова (`launcher` vs `java`)

По умолчанию (`utplsql.invocation = "launcher"`) расширение вызывает
лаунчер `utplsql`/`utplsql.bat`. На Windows это выполняется через `cmd`, который
**поглощает/интерпретирует метасимволы** (`^` становится экранированием, `|` становится конвейером) — что
ломает регулярные выражения в `coverageSourceArgs`.

Режим `java` вызывает JVM **напрямую** (`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`), **без shell**. Аргументы передаются процессу в виде массива,
без промежуточного `cmd`, поэтому `^` и `|` проходят **буквально** — можно использовать `^anchors$` и
`(a|b|c)` в регулярных выражениях без обходных путей.

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome is derived from here
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // only if cliPath is a PATH command
  // "utplsql.javaPath": "java"                     // PATH, or full path to java.exe
}
```

> Режим `java` точно повторяет то, что делает `.bat` (тот же classpath и те же
> свойства `-D`); единственное отличие — не проходит через `cmd`. Требуется `java` в PATH
> (или в `utplsql.javaPath`) и чтобы корень CLI был разрешаемым — либо через `cliPath`,
> указывающий на `…/bin/utplsql(.bat)`, либо задав `cliHome`.

## Использование

1. Откройте проект PL/SQL (с кодом и тестовыми пакетами).
2. Скомпилируйте код и тесты в базе данных (расширение Oracle / SQLcl).
3. Откройте представление **Testing** — появятся наборы.
4. Запуск:
   - Через **CodeLens** — кнопки ▶ Run/Run with Coverage над каждым `%suite` и `%test` в редакторе.
   - Через **поле (gutter)** рядом с каждым тестом/набором, или
   - Через **горячие клавиши** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File и т. д.), или
   - Кнопку **Run Tests** в представлении Test Explorer, или
   - **Правый щелчок** по папке/файлу → *utPLSQL: Run tests…* (с покрытием или без).
5. После выполнения смотрите:
   - **Встроенные декорации** (✓/✗/⚠) в редакторе рядом с аннотациями тестов.
   - **Строку состояния** с количеством пройденных/проваленных тестов и общей длительностью.
   - **Test Explorer** с подробными результатами.
6. Для покрытия используйте профиль **Run with Coverage** (или пункт меню «with coverage»).
7. Для быстрого повторения запусков:
   - `Ctrl+Shift+U L` — **Rerun Last** (повторяет последний запуск, с покрытием или без).
   - `Ctrl+Shift+U U` — **Run at Cursor** (запускает `%test`/`%suite` под курсором).
   - `Ctrl+Shift+U X` — **Run Failed Only** (запускает только проваленные тесты).
8. **Для прямого подключения к Oracle (потоковая передача):** ничего устанавливать не нужно — в VSIX уже входит тонкий драйвер `oracledb`. Режим `auto` переключается на CLI, если Oracle недоступен.
9. Для диагностики используйте `utPLSQL: Show information` в палитре — показывает версии CLI/API/DB с возможностью копирования.
10. **utPLSQL: Select additional reporter...** — QuickPick с репортерами, доступными в базе данных.
11. **utPLSQL: Cancel execution** — останавливает выполняющийся запуск (`Escape` во время выполнения).
12. **utPLSQL: Refresh tests** — принудительно перевыполняет поиск `.pks`.

> 💡 **При написании тестов:** парсер управляется токенами — достаточно `%suite`
> и объявления `create package` в файле, а также каждого `%test` с последующим
> `PROCEDURE`. Требования к пустым строкам нет.

### Поддерживаемые аннотации (v0.10.0+)

Помимо `%suite` и `%test`, поиск понимает:

| Аннотация | Эффект в Test Explorer |
|---|---|
| `-- %disabled` | Набор или тест **не отображается** в дереве (пропускается при поиске) |
| `-- %throws(-20001)` | Указывает, что тест ожидает исключение 20001 (метаданные `expectedError`) |
| `-- %tags(fast, critical)` | Теги теста (метаданные; фильтрация по тегам — в дорожной карте) |
| `-- %displayname(Name)` | Пользовательское имя, отображаемое вместо описания `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Отмечает набор хуками жизненного цикла (метаданные) |

Аннотации не чувствительны к регистру. В заголовке набора (между `%suite` и первым
`%test`) они применяются к набору; после `%test` — к тесту.

## Команды

Все команды расширения (палитра `Ctrl+Shift+P`, префикс `utPLSQL:`):

| Команда | Описание | Сочетание клавиш в UI |
|---|---|---|
| `utPLSQL: Run all tests` | Запускает все наборы в рабочей области | ▶ кнопка в представлении Testing |
| `utPLSQL: Run tests in this file` | Запускает наборы активного `.pks`/`.pkb` | Правый щелчок → файл |
| `utPLSQL: Run tests in this file with coverage` | То же, с профилем покрытия | Правый щелчок → файл |
| `utPLSQL: Run tests in this folder` | Запускает наборы выбранной папки | Правый щелчок → папка |
| `utPLSQL: Run tests in this folder with coverage` | То же, с профилем покрытия | Правый щелчок → папка |
| `utPLSQL: Refresh tests` | Принудительно перевыполняет поиск `.pks` | — |
| `utPLSQL: Cancel execution` | Останавливает выполняющийся CLI | — |
| `utPLSQL: Show utPLSQL information` | Версии CLI/API/DB с возможностью копирования | — |
| `utPLSQL: Select additional reporter...` | QuickPick с репортерами базы данных | — |
| `utPLSQL: Clear session connection` | Удаляет подключение из кэша сессии | — |
| `utPLSQL: Rerun Last` | Повторяет последний запуск | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Запускает тест под курсором | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Повторно запускает только проваленные тесты | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Выполняет полную проверку настройки (CLI, Java, подключение, установка UT3) и показывает результаты | — |
| `utPLSQL: Configure connection` | Открывает настройки в `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Копирует SQL-привилегии покрытия в буфер обмена | — |
| `utPLSQL: Show Test Explorer` | Переводит фокус на представление Testing | — |
| `utPLSQL: Switch connection profile...` | Переключает активный профиль подключения (QuickPick) | Щелчок по строке состояния (при активном профиле) |
| `utPLSQL: New connection profile...` | Мастер создания и активации профиля | — |
| `utPLSQL: Manage connection profiles` | Открывает настройки в `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Импортирует подключения из SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Запускает сеанс отладки теста в активном файле | — |

> **Recompile UT3** (`utplsql.recompileUt3`) **не является** командой палитры — это
> внутреннее быстрое исправление диагностики «utPLSQL Setup» (недействительные объекты в
> схеме utPLSQL).

## Горячие клавиши

Все сочетания используют префикс `Ctrl+Shift+U` (`Cmd+Shift+U` на Mac):

| Сочетание | Команда |
|---|---|
| `Ctrl+Shift+U R` | Запустить все тесты |
| `Ctrl+Shift+U T` | Запустить тесты в файле |
| `Ctrl+Shift+U Shift+T` | Запустить тесты в файле с покрытием |
| `Ctrl+Shift+U F` | Обновить тесты |
| `Ctrl+Shift+U I` | Показать информацию utPLSQL |
| `Ctrl+Shift+U C` | Очистить подключение сессии |
| `Ctrl+Shift+U L` | Повторить последний запуск |
| `Ctrl+Shift+U U` | Запустить под курсором |
| `Ctrl+Shift+U X` | Запустить только проваленные |
| `Escape` | Отменить выполнение |

## Покрытие

- **Выполненные** строки становятся зелёными в поле (gutter); **не выполненные** строки — красными.
- Вкладка **Test Coverage** показывает **процент по файлу/папке**.

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

Расширение передаёт `-source_path` (= `utplsql.sourcePath`) и сопоставляет покрытые объекты
с исходными файлами через `utplsql.coverageSourceArgs` (regex + `type_mapping`). `-owner`
выводится из подключения (или из `utplsql.coverageOwner`).

### Сопоставление покрытия с файлами (`coverageSourceArgs`)

`type_mapping` преобразует «тип», захваченный регулярным выражением, в тип Oracle. Три распространённых соглашения:

**1) По каталогу** — структура `sourcePath/<type>/<name>.sql` (папки `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Работает на любой глубине (`.*` поглощает модули выше). Разные имена папок
> (например, `package`, `pkg`, `pacote`) можно перечислить в `type_mapping`.

**2) По префиксу имени** — соглашение `pkg_*`, `prc_*`, `vw_*` (не зависит от папки):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) По типизированному расширению** — файлы `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (не зависит от папки):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Важные замечания:**
- **Пакеты → `PACKAGE BODY`** (не `PACKAGE`): покрытие собирается в **body** пакета.
- **Windows / метасимволы регулярных выражений:** в режиме `launcher` (по умолчанию) `.bat` проходит через `cmd`,
  который **поглощает `^`** и **интерпретирует `|` как конвейер** — поэтому в примерах выше используются `\w` и
  `[/\\]` (без `^`), а `|` в примере 2 работает только внутри расширения. **Решение:** используйте **`utplsql.invocation = "java"`** (см.
  [Режим вызова](#режим-вызова-launcher-vs-java)) — без промежуточного `cmd` символы `^` и `|` проходят
  буквально, и вы можете писать регулярные выражения обычным образом.
- **Windows / `cmd`:** избегайте **`^`** в регулярных выражениях (его поглощает `cmd` из `.bat`) — поэтому в примерах
  используются `\w` и `[/\\]`.

## Репортеры

Расширение всегда включает три репортера по умолчанию:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (результаты → Test Explorer) и
`ut_coverage_cobertura_reporter` (покрытие, если доступно).

**Динамическая проверка** — перед запуском с покрытием расширение запрашивает
базу данных через `utplsql reporters <conn>`. Если
`UT_COVERAGE_COBERTURA_REPORTER` не существует в базе данных (например, устаревший
utPLSQL), покрытие пропускается с предупреждением в выводе. Выполнение тестов
никогда не блокируется.

**Дополнительные фиксированные репортеры** — параметр `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Три репортера по умолчанию автоматически дедуплицируются, даже если они
перечислены здесь.

**Временный репортер для сессии** — команда **utPLSQL: Select additional
reporter...** открывает QuickPick с динамическим списком из базы данных.
Выбранный репортер используется при следующем выполнении и затем отбрасывается (не
сохраняется в настройках).

## Требования к базе данных

**Покрытие** (всегда) — включает профилировщик:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Без этого тесты выполняются, но покрытие получается **пустым**.

**Обнаружение тестов в ДРУГИХ схемах** (**общая** установка utPLSQL, например, владелец `UT3`):
чтобы фреймворк видел и разбирал тесты схем приложений, владельцу utPLSQL нужно
**читать словарь** этих схем:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` в одиночку НЕ достаточно** — нужны **прямые** привилегии на эти представления
  (из-за `dbms_assert.sql_object_name` в контексте определителя).
- Также должен быть установлен **DDL-триггер** utPLSQL (поддерживает кэш аннотаций в актуальном состоянии).
- Проверка (от имени владельца): `SELECT ut_metadata.get_source_view_name FROM dual;` должна возвращать `dba_source`.

> При установке **в каждой схеме** (utPLSQL в той же схеме, что и тесты) эти межсхемные привилегии **не**
> нужны — фреймворк читает собственный исходный код.

## Известные ограничения

- Сопоставление результат→тест выполняется по имени пакета + имени/описанию теста;
  одинаковые описания в разных пакетах могут создавать неоднозначность (индекс
  ограничен пакетом, чтобы свести её к минимуму).
- Для определения `sourcePath` учитывается **первая** папка рабочей области.
- Поиск читает `.pks` (спецификации); держите аннотации `%suite`/`%test` в спецификации.

## Устранение неполадок

| Симптом | Вероятная причина | Решение |
|---|---|---|
| Наборы не отображаются | CLI не найден | Выполните `utPLSQL: Validate configuration` для диагностики |
| Пустое покрытие | Отсутствует `GRANT EXECUTE ON DBMS_PROFILER` | Выполните привилегии из [Требования к базе данных](#требования-к-базе-данных) или используйте `utPLSQL: Copy coverage grants to clipboard` |
| Пустое покрытие | Oracle 19c требует дополнительные привилегии | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Низкая производительность | Большим наборам нужно больше кучи JVM | Увеличьте `utplsql.javaArgs` (например, `["-Xmx1024m"]`) |
| Ошибка компиляции без указания причины | Код с синтаксической ошибкой PL/SQL | Включите `utplsql.compilationDiagnostics.enabled` (по умолчанию включён); см. панель Problems |
| Ошибка подключения | Некорректная строка или недоступная БД | Используйте `utPLSQL: Validate configuration` |
| Тайм-аут при выполнении | Тесты выполняются дольше, чем `timeoutMinutes` | Увеличьте `utplsql.timeoutMinutes` |
| Regex покрытия не совпадает | `cmd` в Windows поглощает `^` и `\|` | Используйте `utplsql.invocation: "java"` (см. [Режим вызова](#режим-вызова-launcher-vs-java)) |
| `%suite` не распознан | Отсутствует `%suite`/`create package` в файле или `%test` без `PROCEDURE` | Проверьте спецификацию; выполните `utPLSQL: Refresh tests` |
| «report not generated» | CLI не смог создать выходной XML | Проверьте права на запись в `%TEMP%` и привилегии utPLSQL |
| CodeLens не появляется | `editor.codeLens` отключён или конфликт | Включите `"editor.codeLens": true`; проверьте `utplsql.codeLens.enabled` |
| Горячие клавиши не работают | Конфликт с другим расширением или сочетанием VSCode | Откройте File → Preferences → Keyboard Shortcuts и найдите `utplsql`, чтобы переназначить |

## Лицензия

MIT © Gil Cleber Barboza
