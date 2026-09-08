<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · **Polski** · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

Integruje [utPLSQL](https://www.utplsql.org/) z VSCode, przenosząc testy PL/SQL do natywnego **Test Explorera**, z menu kontekstowym i wizualnym pokryciem kodu.

- 🧪 **Natywny Test Explorer** — suite'y i testy pojawiają się w widoku testów; uruchamiaj według testu, suite'a, pliku lub folderu.
- 🔍 **CodeLens** — przyciski Run/Run with Coverage nad `%suite` i `%test` w edytorze, bez opuszczania kodu.
- ⌨️ **Skróty klawiszowe** — prefiks `Ctrl+Shift+U` + klawisz dla głównych poleceń (R = Run All, T = Run File, L = Rerun Last, itd.).
- 🖱️ **Menu kontekstowe** — kliknij prawym przyciskiem **folder** lub plik **`.pks`/`.pkb`** (w Explorerze lub edytorze), aby uruchomić testy.
- 📊 **Wizualne pokrycie kodu** — kolorowe guttery dla każdej linii (pokryta/niepokryta) oraz procent na plik w karcie **Coverage**.
- ✅ **Dekoracje inline** — ikony ✓/✗/⚠ w edytorze po wykonaniu, z tooltipem błędu i overview ruler.
- 📌 **Pasek stanu** — wskaźnik z liczbą pass/fail, czasem trwania i postępem w czasie rzeczywistym.
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only za pomocą jednego skrótu.
- 🚀 **Tryb bezpośredni Oracle (przez node-oracledb)** — streaming w czasie rzeczywistym, bez czekania na zakończenie partii.
- 🔧 **Diagnostyka konfiguracji** — proaktywna walidacja CLI, połączenia, grantów i wersji z quick-fix.
- 🧩 **Drzewo świadome schematu** — organizuj testy według Schema > Package > Suite > Test w Test Explorerze.
- 🎯 **Skok do błędu** — bezpośrednia nawigacja do linii asercji, która się nie powiodła (poprzez natywne "Go to Error").
- 🔌 **Profile połączeń** — zapisuj i przełączaj się między wieloma środowiskami (DEV/TEST/PROD) z ustawieniami dla każdego profilu, z paska stanu lub palety poleceń.
- 📈 **Pokrycie deklaracji i widoków** — karta Coverage pokazuje `% deklaracji` (PROCEDURE/FUNCTION) na plik i śledzi widoki wykonane przez `V$SQL`.
- 🐛 **Debugowanie PL/SQL** — breakpointy i debugowanie krokowe testów utPLSQL przez `DBMS_DEBUG` (natywny Debug Adapter).
- 🌍 **i18n — 24 języki** — `utplsql.language` podąża za VSCode (15 natywnych + 9 społeczności: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Instalacja

Rozszerzenie można zainstalować na dwa sposoby:

1. **Z Marketplace:** Wyszukaj **utPLSQL Test Runner** w panelu rozszerzeń VSCode (`Ctrl+Shift+X`) i kliknij **Install**.
2. **Ręcznie (.vsix):** Pobierz plik `.vsix` żądanej wersji i zainstaluj go w VSCode:
   * **Przez linię poleceń:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Przez interfejs:** Otwórz panel rozszerzeń (`Ctrl+Shift+X`), kliknij trzy kropki `...` (prawy górny róg) i wybierz **Install from VSIX...**.

## Wymagania

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** zainstalowany w bazie Oracle.
- **Dla trybu CLI:** [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java** zainstalowane na maszynie (rozszerzenie wywołuje CLI).
- **Dla trybu bezpośredniego Oracle:** wystarczy sama baza danych — VSIX zawiera już cienki sterownik `oracledb` (bez Instant Client).
- **VSCode 1.88+** (Test Coverage API).

Rozszerzenie jest tylko "graficznym klientem" — testy uruchamia baza danych: przez
CLI (utPLSQL-cli + Java) lub bezpośrednio (node-oracledb, `runnerMode: auto` domyślnie).

## Połączenie

Rozszerzenie potrzebuje ciągu połączenia Oracle, aby uruchomić testy. Rozwiązanie następuje w tej kolejności:

1. **Aktywny profil połączenia** — `utplsql.activeProfile` wskazujący na profil w `utplsql.profiles` (nadpisuje wszystko poniżej).
2. **Ustawienie `utplsql.connection`** — odczytywane z `settings.json` projektu/użytkownika.
3. **Zmienna środowiskowa `UTPLSQL_CONN`** — ustawiona przed otwarciem VSCode.
4. **Pamięć podręczna sesji** — jeśli użytkownik już wpisał połączenie w monicie.
5. **Zapytanie użytkownika** — pyta i przechowuje tylko w bieżącej sesji.

Profile połączeń (`utplsql.profiles`) mogą również nadpisywać `sourcePath`, `coverageOwner`, `invocation`, `cliPath` itd. dla każdego środowiska — patrz `utplsql.activeProfile` w tabeli konfiguracji.

⚠️ **Zalecenie bezpieczeństwa:** ciąg połączenia zawiera hasło. **NIE** używaj
ustawienia `utplsql.connection` w środowiskach współdzielonych (settings.json może być
wersjonowany lub widoczny dla innych). Zamiast tego **użyj zmiennej środowiskowej `UTPLSQL_CONN`**:

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

Jeśli ani ustawienie, ani zmienna środowiskowa nie są zdefiniowane, rozszerzenie zapyta
o połączenie i przechowa je tylko w pamięci podczas sesji — użyj polecenia
**utPLSQL: Clear session connection** (paleta poleceń), aby je wyczyścić.

**Akceptowane formaty:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **Alias TNS**: `user/pass@tns_alias` (wymaga skonfigurowanego `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Jak to działa

Dostępne są dwa tryby wykonania:

![Architektura wykonania — dwa tryby](docs/wiki/images/diagram-arquitetura.png)

### Tryb bezpośredni Oracle (v0.9.0) — `runnerMode: auto` lub `oracle`

![Tryb bezpośredni Oracle — streaming](docs/wiki/images/diagram-streaming.png)

Brak plików tymczasowych, brak czekania na partię. Wyniki pojawiają się w
Test Explorerze **w miarę kończenia każdego testu**.

### Tryb CLI — `runnerMode: cli` (fallback)

![Tryb CLI — partia](docs/wiki/images/diagram-cli.png)

Rozszerzenie buduje linię poleceń CLI lub łączy się bezpośrednio przez Oracle, czyta
raporty (JUnit + Coverage) i tłumaczy je na natywne API VSCode. Tryb
`auto` (domyślny) próbuje bezpośrednio Oracle i spada do CLI, jeśli `node-oracledb`
nie jest zainstalowane. Użyj `runnerMode: cli`, aby zawsze wymusić CLI.

## Konfiguracja

| Ustawienie | Domyślnie | Opis |
|---|---|---|
| `utplsql.connection` | `""` | Połączenie Oracle. **Pozostaw puste** i użyj zmiennej środowiskowej `UTPLSQL_CONN`, aby nie przechowywać hasła. Jeśli oba są puste, rozszerzenie zapyta (przechowuje tylko w sesji). |
| `utplsql.cliPath` | `utplsql` | Ścieżka do pliku wykonywalnego utPLSQL-cli (np. `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Folder kodu produkcyjnego (do mapowania pokrycia na pliki). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Wzorce glob do wykrywania specyfikacji z `%suite`/`%test`. Jeśli testy są w `.sql`, użyj `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Dodatkowe argumenty dla `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Właściciel schematu pokrywanych obiektów. Puste = używa użytkownika połączenia (wielkimi literami). |
| `utplsql.coverageSourceArgs` | (patrz **Pokrycie kodu**) | Argumenty CLI mapujące pokrycie na pliki źródłowe. |
| `utplsql.invocation` | `launcher` | Jak wywołać CLI: `launcher` (przez `.bat`/skrypt, domyślnie) lub `java` (bezpośrednio JVM, **bez powłoki**). Patrz **Tryb wywołania**. |
| `utplsql.javaPath` | `java` | Plik wykonywalny Javy (PATH lub pełna ścieżka). Używany tylko w trybie `java`. |
| `utplsql.cliHome` | `""` | Katalog główny utPLSQL-cli (folder z `bin/` i `lib/`). Puste = wyprowadzany z `cliPath`. Używany tylko w trybie `java`. |
| `utplsql.timeoutMinutes` | `60` | Limit czasu w minutach dla CLI. Flaga `-t` jest wysyłana tylko, jeśli wartość różni się od `60`. |
| `utplsql.dbmsOutput` | `false` | Włącza `DBMS_OUTPUT` w sesji testowej. Flaga `-D` jest wysyłana tylko, gdy `true`. |
| `utplsql.quiet` | `false` | Tłumi informacyjne logi CLI. Flaga `-q` jest wysyłana tylko, gdy `true`. |
| `utplsql.failureExitCode` | `1` | Kod wyjścia przy niepowodzeniu. Flaga `--failure-exit-code` jest wysyłana tylko, jeśli wartość różni się od `1`. `0` sprawia, że CLI zawsze kończy się sukcesem. |
| `utplsql.additionalReporters` | `[]` | Dodatkowe reportery dołączane przy każdym uruchomieniu (np. `["ut_coverage_html_reporter"]`). Domyślne (documentation, junit, coverage) są zawsze dołączane i nie trzeba ich wymieniać. |
| `utplsql.codeLens.enabled` | `true` | Pokazuje przyciski CodeLens Run/Run with Coverage nad `%suite` i `%test`. |
| `utplsql.statusBar.enabled` | `true` | Pokazuje wskaźnik statusu testów w pasku stanu. |
| `utplsql.decorations.enabled` | `true` | Pokazuje dekoracje pass/fail na liniach `%suite` i `%test` po wykonaniu. |
| `utplsql.runnerMode` | `auto` | Tryb wykonania: `auto` (bezpośrednio Oracle przez node-oracledb, fallback CLI), `cli` (zawsze przez linię poleceń), `oracle` (zawsze bezpośrednio Oracle). |
| `utplsql.oraclePoolMin` | `2` | Minimalna liczba połączeń utrzymywanych w puli runnera Oracle (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maksymalna liczba połączeń w puli runnera Oracle (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Przyrost przy rozszerzaniu puli runnera Oracle (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Sekundy między kontrolami stanu nieaktywnych połączeń w puli (node-oracledb). `0` = ping przy każdym pobraniu połączenia. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | Flagi JVM dla trybu `java` (np. `["-Xmx512m", "-Xms128m"]`). Wstawiane przed `-cp`. |
| `utplsql.organization` | `file` | Organizacja drzewa: `file` (według ścieżki) lub `schema` (Schema > Package > Suite > Test). W trybie `schema` z Oracle `runnerMode` (`auto`/`oracle`), suite'y są również wykrywane z bazy danych (`ALL_OBJECTS`/`ALL_SOURCE`), gdy plików `.pks` nie ma w workspace — z wirtualnym URI `utplsql-db:/` (bez CodeLens/dekoracji/skoku do błędu). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Wzorzec glob do wyodrębnienia schematu ze ścieżki. Użyj `{schema}` jako symbolu zastępczego. W trybie `schema` katalogi poniżej podstawy wzorca (np. `db/*`) definiują schematy odpytywane w bazie danych. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Pokazuje błędy kompilacji PL/SQL jako podkreślenia w edytorze i w panelu Problemów (tryb CLI). |
| `utplsql.setupDiagnostics.enabled` | `true` | Pokazuje diagnostykę konfiguracji (CLI, połączenie, granty, wersja) oraz **integralność instalacji utPLSQL** (nieprawidłowe obiekty w schemacie UT3, z quick-fixem "Recompile UT3") z akcjami quick-fix. |
| `utplsql.profiles` | `[]` | Zapisane profile połączeń Oracle (nazwa, połączenie oraz nadpisania `sourcePath`/`coverageOwner`/`invocation`/`cliPath`/itd.) do przełączania między środowiskami. |
| `utplsql.activeProfile` | `""` | ID aktywnego profilu (`utplsql.profiles`). Gdy ustawione, nadpisuje `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Śledzi widoki wykonane przez `V$SQL` (pokrycie boolowskie). Wymaga `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Włącza debugowanie testów PL/SQL (`DBMS_DEBUG`). Wymaga `node-oracledb` + grantów. |
| `utplsql.debugger.stopOnException` | `true` | Wstrzymuje na wyjątkach PL/SQL podczas debugowania. |
| `utplsql.debugger.timeoutSeconds` | `300` | Limit czasu (s) sesji debugowania. |
| `utplsql.language` | `auto` | Język komunikatów środowiska uruchomieniowego. `auto` podąża za VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; w przeciwnym razie en). Obejmuje **24 lokalizacje** (15 natywnych + 9 społeczności). |

Przykład (`settings.json` projektu):

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

A przed otwarciem VSCode (lub w profilu PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Dla współtwórców

Utwórz plik `.env` w katalogu głównym projektu (gitignored) ze zmiennymi
środowiskowymi używanymi przez testy integracyjne:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
UTPLSQL_CLI_PATH=/path/to/utplsql
UTPLSQL_CLI_HOME=/path/to/utplsql-cli
```

### Tryb wywołania (`launcher` vs `java`)

Domyślnie (`utplsql.invocation = "launcher"`) rozszerzenie wywołuje launcher
`utplsql`/`utplsql.bat`. W systemie Windows przechodzi to przez `cmd`, które
**konsumuje/interpretuje metaznaki** (`^` staje się znakiem ucieczki, `|` staje się pipe) — co
psuje regex w `coverageSourceArgs`.

Tryb `java` wywołuje JVM **bezpośrednio** (`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`), **bez powłoki**. Argumenty trafiają do procesu jako tablica,
bez `cmd` pośrodku, więc `^` i `|` przechodzą **dosłownie** — możesz użyć `^anchors$` i
`(a|b|c)` w regexie bez obejść.

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome is derived from here
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // only if cliPath is a PATH command
  // "utplsql.javaPath": "java"                     // PATH, or full path to java.exe
}
```

> Tryb `java` wiernie odtwarza to, co robi `.bat` (ta sama classpath i te same
> właściwości `-D`); jedyną różnicą jest brak przejścia przez `cmd`. Wymaga `java` w PATH
> (lub w `utplsql.javaPath`) oraz możliwości rozwiązania katalogu głównego CLI — albo przez
> `cliPath` wskazujące na `…/bin/utplsql(.bat)`, albo przez ustawienie `cliHome`.

## Użycie

1. Otwórz projekt PL/SQL (z kodem i pakietami testowymi).
2. Skompiluj kod i testy w bazie danych (rozszerzenie Oracle / SQLcl).
3. Otwórz widok **Testing** → pojawiają się suite'y.
4. Uruchom:
   - Przez **CodeLens** — przyciski ▶ Run/Run with Coverage nad każdym `%suite` i `%test` w edytorze.
   - Przez **gutter** przy każdym teście/suicie, lub
   - Przez **skróty klawiszowe** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, itd.), lub
   - Przycisk **Run Tests** w widoku Test Explorera, lub
   - **Kliknij prawym przyciskiem** folder/plik → *utPLSQL: Run tests…* (z pokryciem lub bez).
5. Po wykonaniu zobacz:
   - **Dekoracje inline** (✓/✗/⚠) w edytorze przy adnotacjach testów.
   - **Pasek stanu** z liczbą pass/fail i całkowitym czasem trwania.
   - **Test Explorer** ze szczegółowymi wynikami.
6. W przypadku pokrycia użyj profilu **Run with Coverage** (lub pozycji menu "z pokryciem").
7. Aby szybko powtarzać wykonania:
   - `Ctrl+Shift+U L` — **Rerun Last** (powtarza ostatnie wykonanie, z pokryciem lub bez).
   - `Ctrl+Shift+U U` — **Run at Cursor** (uruchamia `%test`/`%suite` pod kursorem).
   - `Ctrl+Shift+U X` — **Run Failed Only** (uruchamia tylko testy, które się nie powiodły).
8. **Dla trybu bezpośredniego Oracle (streaming):** nic nie trzeba instalować — VSIX zawiera już cienki sterownik `oracledb`. Tryb `auto` spada do CLI, jeśli Oracle nie jest dostępne.
9. W celach diagnostycznych użyj `utPLSQL: Show information` w palecie — pokazuje wersje CLI/API/DB z opcją kopiowania.
10. **utPLSQL: Select additional reporter...** — QuickPick z reporterami dostępnymi w bazie danych.
11. **utPLSQL: Cancel execution** — zatrzymuje bieżące wykonanie (`Escape` podczas wykonania).
12. **utPLSQL: Refresh tests** — wymusza ponowne wykrycie plików `.pks`.

> 💡 **Podczas pisania testów:** parser jest sterowany tokenami — wystarczy mieć `%suite`
> i deklarację `create package` w pliku oraz każde `%test` z następującym po nim
> `PROCEDURE`. Nie ma wymogu pustej linii.

### Obsługiwane adnotacje (v0.10.0+)

Poza `%suite` i `%test` wykrywanie rozumie:

| Adnotacja | Wpływ na Test Explorer |
|---|---|
| `-- %disabled` | Suite lub test **nie pojawia się** w drzewie (pomijany w wykrywaniu) |
| `-- %throws(-20001)` | Oznacza, że test oczekuje wyjątku 20001 (metadane `expectedError`) |
| `-- %tags(fast, critical)` | Tagi testu (metadane; filtrowanie tagów jest na mapie drogowej) |
| `-- %displayname(Name)` | Niestandardowa nazwa wyświetlana zamiast opisu `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Oznacza suite hookami cyklu życia (metadane) |

Adnotacje nie są czułe na wielkość liter. W nagłówku suite (między `%suite` a
pierwszym `%test`) dotyczą suite; po `%test` dotyczą testu.

## Polecenia

Wszystkie polecenia rozszerzenia (paleta `Ctrl+Shift+P`, prefiks `utPLSQL:`):

| Polecenie | Opis | Skrót UI |
|---|---|---|
| `utPLSQL: Run all tests` | Uruchamia wszystkie suite'y w workspace | przycisk ▶ w widoku Testing |
| `utPLSQL: Run tests in this file` | Uruchamia suite'y aktywnego pliku `.pks`/`.pkb` | Prawy klik → plik |
| `utPLSQL: Run tests in this file with coverage` | To samo, z profilem pokrycia | Prawy klik → plik |
| `utPLSQL: Run tests in this folder` | Uruchamia suite'y wybranego folderu | Prawy klik → folder |
| `utPLSQL: Run tests in this folder with coverage` | To samo, z profilem pokrycia | Prawy klik → folder |
| `utPLSQL: Refresh tests` | Wymusza ponowne wykrycie plików `.pks` | — |
| `utPLSQL: Cancel execution` | Zatrzymuje działające CLI | — |
| `utPLSQL: Show utPLSQL information` | Wersje CLI/API/DB z opcją kopiowania | — |
| `utPLSQL: Select additional reporter...` | QuickPick z reporterami bazy danych | — |
| `utPLSQL: Clear session connection` | Usuwa połączenie z pamięci podręcznej sesji | — |
| `utPLSQL: Rerun Last` | Powtarza ostatnie wykonanie | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Uruchamia test pod kursorem | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Ponownie uruchamia tylko nieudane testy | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Wykonuje pełną walidację konfiguracji (CLI, Java, połączenie, instalacja UT3) i pokazuje wyniki | — |
| `utPLSQL: Configure connection` | Otwiera ustawienia przy `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Kopiuje SQL grantów do schowka | — |
| `utPLSQL: Show Test Explorer` | Ustawia fokus na widoku Testing | — |
| `utPLSQL: Switch connection profile...` | Przełącza aktywny profil połączenia (QuickPick) | Klik w pasku stanu (z aktywnym profilem) |
| `utPLSQL: New connection profile...` | Kreator tworzenia i aktywowania profilu | — |
| `utPLSQL: Manage connection profiles` | Otwiera ustawienia przy `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Importuje połączenia z SQL Developera (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Uruchamia sesję debugowania testu w aktywnym pliku | — |

> **Recompile UT3** (`utplsql.recompileUt3`) **nie jest** poleceniem palety — to
> wewnętrzny quick-fix diagnostyki "utPLSQL Setup" (nieprawidłowe obiekty w
> schemacie utPLSQL).

## Skróty klawiszowe

Wszystkie skróty używają prefiksu `Ctrl+Shift+U` (`Cmd+Shift+U` na Macu):

| Skrót | Polecenie |
|---|---|
| `Ctrl+Shift+U R` | Uruchom wszystkie testy |
| `Ctrl+Shift+U T` | Uruchom testy w pliku |
| `Ctrl+Shift+U Shift+T` | Uruchom testy w pliku z pokryciem |
| `Ctrl+Shift+U F` | Odśwież testy |
| `Ctrl+Shift+U I` | Pokaż informacje utPLSQL |
| `Ctrl+Shift+U C` | Wyczyść połączenie sesji |
| `Ctrl+Shift+U L` | Ponów ostatnie |
| `Ctrl+Shift+U U` | Uruchom pod kursorem |
| `Ctrl+Shift+U X` | Uruchom tylko nieudane |
| `Escape` | Anuluj wykonanie |

## Pokrycie kodu

- **Wykonane** linie zmieniają kolor na zielony w gutterze; **niewykonane** linie na czerwony.
- Karta **Test Coverage** pokazuje **procent na plik/folder**.

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

Rozszerzenie przekazuje `-source_path` (= `utplsql.sourcePath`) i mapuje pokrywane obiekty
na pliki źródłowe przez `utplsql.coverageSourceArgs` (regex + `type_mapping`). `-owner`
jest wyprowadzany z połączenia (lub z `utplsql.coverageOwner`).

### Mapowanie pokrycia do plików (`coverageSourceArgs`)

`type_mapping` tłumaczy "typ" przechwycony przez regex na typ Oracle. Trzy popularne konwencje:

**1) Według katalogu** — struktura `sourcePath/<type>/<name>.sql` (foldery `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Działa na dowolnej głębokości (`.*` pochłania moduły wyżej). Różne nazwy folderów
> (np. `package`, `pkg`, `pacote`) można wymienić w `type_mapping`.

**2) Według prefiksu nazwy** — konwencja `pkg_*`, `prc_*`, `vw_*` (niezależnie od folderu):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Według rozszerzenia typowanego** — pliki `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (niezależnie od folderu):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Ważne uwagi:**
- **Packages → `PACKAGE BODY`** (nie `PACKAGE`): pokrycie jest zbierane w **ciele** pakietu.
- **Windows / metaznaki regex:** w trybie `launcher` (domyślnym), `.bat` przechodzi przez `cmd`,
  które **konsumuje `^`** i **interpretuje `|` jako pipe** — dlatego przykłady powyżej używają `\w` i
  `[/\\]` (bez `^`), a `|` w przykładzie 2 działa tylko wewnątrz rozszerzenia. **Rozwiązanie:** użyj **`utplsql.invocation = "java"`** (patrz
  [Tryb wywołania](#tryb-wywołania-launcher-vs-java)) — bez `cmd` pośrodku, `^` i `|` przechodzą
  dosłownie i możesz pisać regex normalnie.
- **Windows / `cmd`:** unikaj **`^`** w regexie (`cmd` z `.bat` go konsumuje) — dlatego przykłady
  używają `\w` i `[/\\]`.

## Reportery

Rozszerzenie zawsze zawiera trzy domyślne reportery:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (wyniki → Test Explorer) i
`ut_coverage_cobertura_reporter` (pokrycie, jeśli dostępne).

**Dynamiczna walidacja** — przed uruchomieniem z pokryciem rozszerzenie odpytuje
bazę danych przez `utplsql reporters <conn>`. Jeśli
`UT_COVERAGE_COBERTURA_REPORTER` nie istnieje w bazie danych (np. nieaktualny
utPLSQL), pokrycie jest pomijane z ostrzeżeniem w wyniku. Wykonanie testów
nigdy nie jest blokowane.

**Dodatkowe stałe reportery** — ustawienie `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Trzy domyślne reportery są automatycznie deduplikowane, nawet jeśli
zostaną tutaj wymienione.

**Zależny od sesji, nietrwały reporter** — polecenie **utPLSQL: Select additional
reporter...** otwiera QuickPick z dynamiczną listą z bazy danych. Wybrany
reporter jest używany przy następnym wykonaniu i później odrzucany (nie jest
zapisywany w ustawieniach).

## Wymagania bazy danych

**Pokrycie** (zawsze) — włącza profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Bez tego testy działają, ale pokrycie wychodzi **puste**.

**Wykrywanie testów w INNYCH schematach** (instalacja utPLSQL **współdzielona**, np. właściciel `UT3`):
aby framework widział i parsował testy schematów aplikacji, właściciel utPLSQL musi
**czytać słownik** tych schematów:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` samo w sobie NIE wystarcza** — potrzebne są **bezpośrednie** granty na tych widokach
  (ze względu na `dbms_assert.sql_object_name` w kontekście definera).
- Trigger DDL utPLSQL musi być również zainstalowany (utrzymuje pamięć podręczną adnotacji aktualną).
- Weryfikacja (jako właściciel): `SELECT ut_metadata.get_source_view_name FROM dual;` powinno zwrócić `dba_source`.

> W instalacjach **per-schema** (utPLSQL w tym samym schemacie co testy), te granty między schematami **nie są**
> potrzebne — framework czyta własne źródło.

## Znane ograniczenia

- Mapowanie wynik→test odbywa się według nazwy pakietu + nazwy/opisu testu;
  identyczne opisy w różnych pakietach mogą powodować niejednoznaczność (indeks jest
  ograniczony do pakietu, aby to zminimalizować).
- Uwzględnia **pierwszy** folder workspace do rozwiązania `sourcePath`.
- Wykrywanie czyta pliki `.pks` (specyfikacje); trzymaj adnotacje `%suite`/`%test` w specyfikacji.

## Rozwiązywanie problemów

| Objaw | Prawdopodobna przyczyna | Rozwiązanie |
|---|---|---|
| Suite'y się nie pojawiają | Nie znaleziono CLI | Uruchom `utPLSQL: Validate configuration`, aby uzyskać diagnostykę |
| Puste pokrycie | Brak `GRANT EXECUTE ON DBMS_PROFILER` | Uruchom granty z [Wymagania bazy danych](#wymagania-bazy-danych) lub użyj `utPLSQL: Copy coverage grants to clipboard` |
| Puste pokrycie | Oracle 19c wymaga dodatkowych grantów | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Wolna wydajność | Duże suite'y wymagają większego stogu JVM | Zwiększ `utplsql.javaArgs` (np. `["-Xmx1024m"]`) |
| Błąd kompilacji bez wskazówki | Kod z błędem składni PL/SQL | Włącz `utplsql.compilationDiagnostics.enabled` (domyślnie włączone); zobacz panel Problemów |
| Błąd połączenia | Nieprawidłowy ciąg lub nieosiągalna baza | Użyj `utPLSQL: Validate configuration` |
| Limit czasu podczas wykonania | Testy trwają dłużej niż `timeoutMinutes` | Zwiększ `utplsql.timeoutMinutes` |
| Regex pokrycia nie pasuje | Windows `cmd` konsumuje `^` i `\|` | Użyj `utplsql.invocation: "java"` (patrz [Tryb wywołania](#tryb-wywołania-launcher-vs-java)) |
| `%suite` nierozpoznany | Brak `%suite`/`create package` w pliku lub `%test` bez `PROCEDURE` | Sprawdź specyfikację; uruchom `utPLSQL: Refresh tests` |
| "report not generated" | CLI nie mogło wygenerować pliku XML | Sprawdź uprawnienia zapisu w `%TEMP%` i granty utPLSQL |
| CodeLens się nie pojawia | `editor.codeLens` wyłączone lub konflikt | Włącz `"editor.codeLens": true`; sprawdź `utplsql.codeLens.enabled` |
| Skróty nie działają | Konflikt z innym rozszerzeniem lub skrótem VSCode | Przejdź do File → Preferences → Keyboard Shortcuts i wyszukaj `utplsql`, aby przedefiniować |

## Licencja

MIT © Gil Cleber Barboza
