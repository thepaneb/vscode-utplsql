<!-- GENERATED FROM docs/brain/60-README/README.cs.md — DO NOT EDIT -->

<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · [Română](README.ro.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · **Čeština** · [Български](README.bg.md) · [Српски](README.sr.md) · [Türkçe](README.tr.md) · [Ελληνικά](README.el.md) · [Magyar](README.hu.md) · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md) · [ไทย](README.th.md) · [English (UK)](README.en-GB.md)

</div>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Marketplace" src="https://vsmarketplacebadges.dev/version-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Installs" src="https://vsmarketplacebadges.dev/installs-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Downloads" src="https://vsmarketplacebadges.dev/downloads-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="VS Code" src="https://img.shields.io/badge/VS%20Code-1.101%2B-007ACC">
  <img alt="Node" src="https://img.shields.io/badge/node-22-339933?logo=nodedotjs&logoColor=white">
  <img alt="Oracle" src="https://img.shields.io/badge/Oracle-12.2%2B-F80000?logo=oracle&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

# utPLSQL Test Runner

Spouštějte a laďte testy **utPLSQL** (Oracle PL/SQL) přímo ve VS Code — nativní **Test Explorer**, vizuální pokrytí, ladicí program PL/SQL a **přímé spuštění Oracle** přes `node-oracledb`. K dispozici ve **24 jazycích**; vyžaduje **VS Code 1.101+** (Node 22).

### Test Explorer a spouštění

- 🧪 **Nativní Test Explorer** — sady a testy se zobrazují v pohledu testování; spouštění podle testu, sady, souboru nebo složky.
- 🔍 **CodeLens** — tlačítka Run/Run with Coverage nad `%suite` a `%test` v editoru, bez opuštění kódu.
- ⌨️ **Klávesové zkratky** — předpona `Ctrl+Shift+U` + klávesa pro hlavní příkazy (R = Run All, T = Run File, L = Rerun Last atd.).
- 🖱️ **Kontextová nabídka** — klikněte pravým tlačítkem na **složku** nebo soubor **`.pks`/`.pkb`** (v Průzkumníku nebo v editoru) pro spuštění testů.
- 🔁 **Chytré opětovné spuštění** — Rerun Last, Run at Cursor, Run Failed Only jedinou zkratkou.
- 🧩 **Strom podle schémat** — uspořádání testů podle Schema > Package > Suite > Test v Test Exploreru.
- 🏷️ **Tagy a náhodné pořadí** — filtrujte testy pomocí `utplsql.tags` (např. `fast & !integration`) a spouštějte v náhodném pořadí s reprodukovatelným seedem (`utplsql.run.randomOrder`).
- 🗄️ **Objevování DB-first** — sestavte strom z `ut_runner.get_suites_info` a přestavte mezipaměť anotací z palety.
- 🌳 **Líně načítaný strom testů** — v režimu `schema` se balíčky/sady/testy načítají až při rozbalení, takže velká schémata se otevřou okamžitě.
- 📁 **Vícerootový pracovní prostor** — každá složka pracovního prostoru má vlastní sady testů, s nezávislým vyhledáváním, spouštěním a pokrytím.
- 🚀 **Oracle přímý (přes node-oracledb)** — streamování v reálném čase, bez čekání na dokončení dávky.
- 📜 **SQL skripty** — spouštění aktuálního skriptu, souboru z Průzkumníku nebo celé složky na aktivním profilu připojení (s ohledem na charset, `DBMS_OUTPUT` a `stopOnError`).

### Pokrytí

- 📊 **Vizuální pokrytí** — barevné okraje (marginy) podle řádků (pokryto/nepokryto) a procenta podle souboru na kartě **Coverage**.
- 📈 **Pokrytí příkazů a pohledů** — karta Coverage zobrazuje `% of statements` (PROCEDURE/FUNCTION) podle souboru a sleduje pohledy spuštěné přes `V$SQL`.
- 🎯 **Rozsah pokrytí** — zahrňte/vylučte objekty a regex schématu/objektu (`utplsql.coverage.*`) pro odstranění šumu frameworku a přidání dynamicky dosažených objektů.
- 🗂️ **Virtuální zdroj z databáze** — bez lokálního souboru *jump to failure* a pokrytí otevřou dokument jen pro čtení z `ALL_SOURCE` (`utplsql-source:/…`).

### Ladicí program

- 🐛 **PL/SQL Debug** — breakpointy a krokování testů utPLSQL přes `DBMS_DEBUG` (nativní Debug Adapter).

### Připojení a zabezpečení

- 🔌 **Profily připojení** — ukládání a přepínání mezi více prostředími (DEV/TEST/PROD) s nastavením podle profilu, přes stavový řádek nebo paletu příkazů.
- 🔐 **TNS v thin + wallet** — `utplsql.connections.tnsAdminPath` řeší aliasy `tnsnames.ora` v thin ovladači (fallback na SQL Developer/`TNS_ADMIN`); `walletLocation` v profilu a `utPLSQL: Set wallet password` uchovávají heslo k walletu v SecretStorage.
- 🔒 **Zpevnění zabezpečení připojení** — nastavení připojení jsou `machine`-scoped, rozšíření je zakázáno v nedůvěryhodných pracovních prostorech a heslo profilu je vázáno na připojení.
- 🔧 **Diagnostika nastavení** — proaktivní ověření připojení, grantů a verze s rychlou opravou (quick-fix).

### Reporty

- 🧾 **Run with Reporter (Export)** — spustí výběr s libovolným reportérem databáze a zapíše výstup do Output nebo do souboru (`utplsql.reporter.*`), aniž by změnil výsledky v Test Exploreru.

### UX a diagnostika

- ✅ **Inline dekorace** — ikony ✓/✗/⚠ v editoru po spuštění, s tooltipem při selhání a přehledovým pravítkem.
- 📌 **Stavový řádek** — indikátor s počtem prošlých/selhávajících, délkou trvání a průběhem v reálném čase.
- 🎯 **Skok na selhání** — přímá navigace na řádek tvrzení, které selhalo (přes nativní „Go to Error").
- 🧱 **Diagnostika kompilace** — po každém spuštění se chyby kompilace PL/SQL (`ALL_ERRORS`) zobrazí v Problems Panelu pod zdrojem `utPLSQL Compilation` (nastavení `utplsql.compilationDiagnostics.enabled`).
- ⏳ **Průběh a zrušení** — dlouhá spuštění zobrazují oznámení o průběhu s počtem a tlačítkem *Cancel* (plus volitelný `utplsql.timeoutMinutes`).
- 🌍 **i18n — 24 jazyků** — `utplsql.language` se řídí VSCode (24 locale: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).


## Instalace

Rozšíření lze nainstalovat dvěma způsoby:

1. **Z Marketplace:** Vyhledejte **utPLSQL Test Runner** v panelu rozšíření VSCode (`Ctrl+Shift+X`) a klikněte na **Install**.
2. **Ručně (.vsix):** Stáhněte soubor `.vsix` požadované verze a nainstalujte jej do VSCode:
   * **Přes příkazový řádek:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Přes rozhraní:** Otevřete panel Rozšíření (`Ctrl+Shift+X`), klikněte na tři tečky `...` (v pravém horním rohu) a vyberte **Install from VSIX...**.

## Požadavky

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** nainstalovaný v databázi Oracle.
- Pouze databáze — VSIX už obsahuje tenký ovladač `oracledb` (bez Instant Client).

**Kompatibilita Oracle / utPLSQL:**

| Oracle | utPLSQL | Poznámky |
|---|---|---|
| 18c+ | v3.2.x (18c+) / v3.1.x | Doporučeno; charset `AL32UTF8`. |
| 12.2 | pouze v3.1.x | v3.2.x se nezkompiluje (`PLS-00222`). `WE8DEC` obrazu ztrácí nereprezentovatelné znaky (např. `€`); tenký ovladač ignoruje `NLS_LANG`. |
- **VSCode 1.101+** (Node 22).

Rozšíření je pouze „grafický klient" — to, co testy spouští, je databáze přímo přes node-oracledb.

## Připojení

Rozšíření potřebuje k spuštění testů připojovací řetězec k Oracle. Řešení probíhá v tomto pořadí:

1. **Aktivní profil připojení** — `utplsql.activeProfile` odkazující na profil v `utplsql.profiles` (přebíjí vše níže).
2. **Nastavení `utplsql.connection`** — čteno z `settings.json` projektu/uživatele.
3. **Proměnná prostředí `UTPLSQL_CONN`** — nastavena před otevřením VSCode.
4. **Mezipaměť relace** — pokud uživatel připojení zadal přes výzvu.
5. **Dotaz uživatele** — zeptá se a ponechá pouze v aktuální relaci.

Profily připojení (`utplsql.profiles`) mohou také přebíjet `sourcePath`, `coverageOwner` atd. podle prostředí — viz `utplsql.activeProfile` v tabulce konfigurace.

⚠️ **Bezpečnostní doporučení:** připojovací řetězec obsahuje heslo. **NEPOUŽÍVEJTE**
nastavení `utplsql.connection` ve sdílených prostředích (settings.json může být ve verzování
nebo viditelný pro ostatní). Místo toho **použijte proměnnou prostředí `UTPLSQL_CONN`**:

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

Pokud není definováno ani nastavení, ani proměnná prostředí, rozšíření se zeptá na připojení
a ponechá je pouze v paměti během relace — použijte příkaz
**utPLSQL: Clear session connection** (paleta příkazů) k jeho vymazání.

**Akceptované formáty:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias`
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

> 🔒 **Zpevněná nastavení:** nastavení připojení jsou **`machine`-scoped**; rozšíření je **zakázáno v nedůvěryhodných pracovních prostorech**; heslo profilu je **vázáno na jeho připojení**. (`utplsql.connection`, `utplsql.profiles`, `utplsql.activeProfile`, `utplsql.oracleClientLibDir`, `utplsql.oracleClientConfigDir`, `utplsql.connections.tnsAdminPath`)

## Jak to funguje

Žádné dočasné soubory, žádné čekání na dávku. Výsledky se objeví v
Test Exploreru **jakmile každý test skončí**.

Rozšíření se připojí přímo přes Oracle, přečte sestavy (JUnit + Coverage) a převede je do
nativních API VSCode.

## Konfigurace

| Nastavení | Výchozí | Popis |
|---|---|---|
| `utplsql.connection` | `""` | Připojení k Oracle. **Nechte prázdné** a použijte proměnnou prostředí `UTPLSQL_CONN`, abyste neukládali heslo. Pokud jsou obě prázdné, rozšíření se zeptá (uchová pouze v relaci). |
| `utplsql.sourcePath` | `install` | Složka produkčního kódu (pro mapování pokrytí na soubory). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globy pro objevení specifikací s `%suite`/`%test`. Pokud jsou vaše testy v `.sql`, použijte `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Vlastník schématu pokrytých objektů. Prázdné = použije uživatele připojení (velkými písmeny). |
| `utplsql.coverage.schemes` | `[]` | Pokrytá schémata (`a_coverage_schemes`). Prázdné = uživatel připojení (nebo `utplsql.coverageOwner`). |
| `utplsql.coverage.includeObjects` | `[]` | Objekty k zahrnutí do pokrytí, jako `OWNER.NAME` (např. `["APP.MY_PKG"]`). Užitečné pro objekty dosažené jen dynamicky. |
| `utplsql.coverage.excludeObjects` | `[]` | Objekty k vyloučení z pokrytí, jako `OWNER.NAME` (např. `["UT3.UT_COVERAGE"]`). |
| `utplsql.coverage.includeSchemaExpr` | `""` | Regex schémat k zahrnutí do pokrytí (např. `^APP$`). |
| `utplsql.coverage.includeObjectExpr` | `""` | Regex objektů k zahrnutí do pokrytí. |
| `utplsql.coverage.excludeSchemaExpr` | `""` | Regex schémat k vyloučení z pokrytí. |
| `utplsql.coverage.excludeObjectExpr` | `""` | Regex objektů k vyloučení z pokrytí (např. `^UT_` pro framework utPLSQL). |
| `utplsql.timeoutMinutes` | `60` | Časový limit v minutách pro spuštění testů. |
| `utplsql.dbmsOutput` | `false` | Povolí `DBMS_OUTPUT` v testovací relaci. Užitečné pro ladění. |
| `utplsql.additionalReporters` | `[]` | Další reportéry zahrnuté do každého spuštění (např. `["ut_coverage_html_reporter"]`). Výchozí (documentation, junit) jsou vždy zahrnuty a není třeba je vypisovat. |
| `utplsql.reporter.clientCharacterSet` | `""` | Klientská znaková sada (`a_client_character_set`) pro **Run with Reporter (Export)**. Prázdné = výchozí reporteru. |
| `utplsql.reporter.colorConsole` | `false` | Zapne ANSI barvy (`a_color_console`) pro textové konzolové reportery při exportu. |
| `utplsql.tags` | `""` | Výraz tagů utPLSQL pro filtrování spouštěných testů (např. `fast & !integration`). Prázdné spustí všechny. |
| `utplsql.run.randomOrder` | `false` | Spouští testy v náhodném pořadí, aby odhalil závislosti pořadí mezi nimi. |
| `utplsql.run.randomOrderSeed` | `0` | Seed náhodného pořadí. `0` = zvolí databáze (nereprodukovatelné); > 0 reprodukuje stejné pořadí. |
| `utplsql.codeLens.enabled` | `true` | Zobrazuje tlačítka CodeLens Run/Run with Coverage nad `%suite` a `%test`. |
| `utplsql.statusBar.enabled` | `true` | Zobrazuje indikátor stavu testů ve stavovém řádku. |
| `utplsql.decorations.enabled` | `true` | Zobrazuje dekorace prošlo/selháno na řádcích `%suite` a `%test` po spuštění. |
| `utplsql.oraclePoolMin` | `2` | Minimální počet připojení udržovaných v poolu Oracle runneru (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maximální počet připojení v poolu Oracle runneru (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Přírůstek při rozšiřování poolu Oracle runneru (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Sekundy mezi kontrolami stavu nečinných připojení v poolu (node-oracledb). `0` = ping při každém checkoutu. |
| `utplsql.oracleClientMode` | `thin` | Režim ovladače: `thin` (čistý JavaScript, bez nativního klienta) nebo `thick` (používá Oracle Instant Client). `thick` používejte jen pro databáze vyžadující NNE (Native Network Encryption); vyžaduje `utplsql.oracleClientLibDir` a znovu načtení okna. |
| `utplsql.oracleClientLibDir` | `""` | Adresář Oracle Instant Client. Povinný, když je `utplsql.oracleClientMode` nastaveno na `thick` (např. `C:\oracle\instantclient_23_5`). |
| Ladění se nezastaví na zarážce | Balíček bez ladicích informací nebo chybějící ladicí granty | Zkompilujte s `PLSQL_OPTIMIZE_LEVEL <= 1` (nebo `ALTER PACKAGE ... COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) a udělte `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. Zarážky v `test_*.pkb` se nemusí zastavit (utPLSQL spouští testy přes dynamický SQL); nastavte je v testovaném kódu. |
| `utplsql.oracleClientConfigDir` | `""` | Adresář konfigurace Oracle (TNS_ADMIN) s `sqlnet.ora`/`tnsnames.ora`. Volitelný; používá jej pouze thick režim. |
| `utplsql.connections.tnsAdminPath` | `""` | Adresář s `tnsnames.ora` pro řešení **aliasů TNS v thin ovladači**. Pořadí: toto nastavení → hodnota user/machine `sqldeveloper.connections.tnsConfiguration.path` → `TNS_ADMIN`. |
| `utplsql.organization` | `file` | Uspořádání stromu: `file` (podle cesty) nebo `schema` (Schema > Package > Suite > Test). V režimu `schema` se sady také objevují z databáze (`ut_runner.get_suites_info`, s návratem k `ALL_OBJECTS`/`ALL_SOURCE`), když soubory `.pks` nejsou v pracovním prostoru — s virtuální URI `utplsql-db:/` (spuštění a skok na selhání fungují; bez CodeLens/dekorací). · `utplsql-source:/` |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob vzor pro extrakci schématu z cesty. Použijte `{schema}` jako zástupný symbol. V režimu `schema` adresáře pod základnou vzoru (např. `db/*`) definují schémata dotazovaná v databázi. |
| `utplsql.discovery.source` | `auto` | Zdroj stromu v režimu `schema`: `auto` používá API databáze (`ut_runner.get_suites_info`) a při nedostupnosti přejde na `ALL_SOURCE`/soubory; `database` vyžaduje API; `file` vypne objevování přes databázi. |
| `utplsql.refreshDebounceMs` | `300` | Debounce (ms) pro sloučení událostí sledování souborů `.pks`/`.pkb` před obnovením Test Exploreru. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Zobrazuje chyby kompilace PL/SQL z databáze (`ALL_ERRORS`) jako podtržení v editoru a v panelu „Problémy" (zdroj "utPLSQL Compilation"). |
| `utplsql.setupDiagnostics.enabled` | `true` | Zobrazuje diagnostiku konfigurace (připojení, granty, verze) a **integritu instalace utPLSQL** (neplatné objekty ve schématu UT3, s rychlou opravou „Recompile UT3") s akcemi rychlé opravy. |
| `utplsql.profiles` | `[]` | Uložené profily připojení k Oracle (název, připojení a přebití `sourcePath`/`coverageOwner`/atd.) pro přepínání mezi prostředími. **Hesla se ukládají do klíčenky OS (VS Code SecretStorage), nikoli do nastavení** — pole `connection` ukládá pouze `user@//host:port/service`. Starší profily s vloženým heslem se při prvním použití migrují automaticky. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID aktivního profilu (`utplsql.profiles`). Pokud je nastaveno, přebíjí `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Sleduje pohledy spuštěné přes `V$SQL` (boolean pokrytí). Vyžaduje `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Povoluje ladění PL/SQL testů (`DBMS_DEBUG`). Vyžaduje `node-oracledb` + granty. Zkompilujte cílový balíček s ladicími informacemi (`PLSQL_OPTIMIZE_LEVEL <= 1`) a udělte `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. |
| `utplsql.debugger.stopOnException` | `true` | Pozastaví se při výjimkách PL/SQL během ladění. |
| `utplsql.debugger.timeoutSeconds` | `300` | Časový limit (s) ladící relace. |
| `utplsql.debugger.compileOnDebug` | `false` | Zkompiluje objekt s ladicími informacemi (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) před spuštěním ladicí relace. |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | Jazyk běhových zpráv. `auto` se řídí VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; jinak en). Pokrývá **24 locale**. |

Příklad (soubor `.vscode/settings.json` projektu):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

A před otevřením VSCode (nebo v profilu PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Pro přispěvatele

Vytvořte soubor `.env` v kořeni projektu (gitignored) s proměnnými
prostředí používanými integračními testy:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Použití

1. Otevřete projekt PL/SQL (s kódem a testovacími balíčky).
2. Zkompilujte kód a testy v databázi (rozšíření Oracle / SQLcl).
3. Otevřete pohled **Testing** → sady se objeví.
4. Spusťte:
   - Přes **CodeLens** — ▶ tlačítka Run/Run with Coverage nad každým `%suite` a `%test` v editoru.
   - Přes **okraj (gutter)** vedle každého testu/sady, nebo
   - Přes **klávesové zkratky** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File atd.), nebo
   - Tlačítko **Run Tests** pohledu Test Explorer, nebo
   - **Klikněte pravým tlačítkem** na složku/soubor → *utPLSQL: Run tests…* (s pokrytím nebo bez).
5. Po spuštění se podívejte na:
   - **Inline dekorace** (✓/✗/⚠) v editoru vedle testovacích anotací.
   - **Stavový řádek** s počtem prošlých/selhávajících a celkovou délkou.
   - **Test Explorer** s podrobnými výsledky.
6. Pro pokrytí použijte profil **Run with Coverage** (nebo položku nabídky „with coverage").
7. Pro rychlé opakování spuštění:
   - `Ctrl+Shift+U L` — **Rerun Last** (zopakuje poslední spuštění, s pokrytím nebo bez).
   - `Ctrl+Shift+U U` — **Run at Cursor** (spustí `%test`/`%suite` pod kurzorem).
   - `Ctrl+Shift+U X` — **Run Failed Only** (spustí pouze testy, které selhaly).
8. **Pro Oracle direct (streaming):** není co instalovat — VSIX už obsahuje tenký ovladač `oracledb`.
9. Pro diagnostiku použijte `utPLSQL: Show information` v paletě — zobrazí verze API/DB s možností kopírování.
10. **utPLSQL: Select additional reporter...** — QuickPick s reportéry dostupnými v databázi.
11. **utPLSQL: Cancel run** — zastaví probíhající spuštění (`Escape` během spuštění).
12. **utPLSQL: Refresh tests** — vynutí znovuobjevení `.pks`.

> 💡 **Při psaní testů:** parser je řízen tokeny — stačí mít `%suite`
> a deklaraci `create package` v souboru a každý `%test` následovaný svým
> `PROCEDURE`. Není zde žádný požadavek na prázdný řádek.

### Podporované anotace (v0.10.0+)

Kromě `%suite` a `%test` rozpoznává discovery:

| Anotace | Účinek na Test Explorer |
|---|---|
| `-- %disabled` | Sada nebo test se **nezobrazí** ve stromu (přeskočen v discovery) |
| `-- %throws(-20001)` | Označuje, že test očekává výjimku 20001 (metadata `expectedError`) |
| `-- %tags(fast, critical)` | Tagy testu; filtrujte spuštění nastavením `utplsql.tags` (např. `fast & !integration`) |
| `-- %displayname(Name)` | Vlastní název zobrazený místo popisu `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Označuje sadu lifecycle hooky (metadata) |

Anotace nerozlišují velká/malá písmena. V hlavičce sady (mezi `%suite` a
prvním `%test`) se vztahují na sadu; po `%test` se vztahují na test.

## Příkazy

Všechny příkazy rozšíření (paleta `Ctrl+Shift+P`, předpona `utPLSQL:`):

| Příkaz | Popis | Zkratka UI |
|---|---|---|
| `utPLSQL: Run all tests` | Spustí všechny sady v pracovním prostoru | ▶ tlačítko v pohledu Testing |
| `utPLSQL: Run tests in this file` | Spustí sady aktivního `.pks`/`.pkb` | Pravé kliknutí → soubor |
| `utPLSQL: Run tests in this file with coverage` | Totéž s profilem pokrytí | Pravé kliknutí → soubor |
| `utPLSQL: Run tests in this folder` | Spustí sady vybrané složky | Pravé kliknutí → složka |
| `utPLSQL: Run tests in this folder with coverage` | Totéž s profilem pokrytí | Pravé kliknutí → složka |
| `utPLSQL: Refresh tests` | Vynutí znovuobjevení `.pks` | — |
| `utPLSQL: Cancel run` | Zastaví běžící spuštění | — |
| `utPLSQL: Show utPLSQL info` | Verze API/DB s možností kopírování | — |
| `utPLSQL: Select additional reporter...` | QuickPick s reportéry databáze | — |
| `utPLSQL: Clear session connection` | Odstraní připojení z mezipaměti relace | — |
| `utPLSQL: Rerun Last` | Zopakuje poslední spuštění | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Spustí test pod kurzorem | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Spustí znovu pouze selhané testy | `Ctrl+Shift+U X` |
| `utPLSQL: Validate setup` | Spustí úplné ověření nastavení (připojení, instalace UT3) a zobrazí výsledky | — |
| `utPLSQL: Configure connection` | Otevře nastavení na `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Zkopíruje SQL grantů do schránky | — |
| `utPLSQL: Show Test Explorer` | Zaměří pohled Testing | — |
| `utPLSQL: Switch connection profile...` | Přepne aktivní profil připojení (QuickPick) | Kliknutí na stavový řádek (s aktivním profilem) |
| `utPLSQL: New connection profile...` | Průvodce vytvořením a aktivací profilu | — |
| `utPLSQL: Manage connection profiles` | Otevře nastavení na `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Importuje připojení ze SQL Developeru (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Spustí ladící relaci testu pod aktivním souborem | — |
| `utPLSQL: Přestavět mezipaměť anotací` | Přestaví mezipaměť anotací utPLSQL v databázi a obnoví strom | — |
| `utPLSQL: Zkompilovat pro ladění` | Zkompiluje objekt vybraného souboru/složky s ladicími informacemi | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |
| `utPLSQL: Nastavit heslo peněženky` | Nastaví/vymaže heslo peněženky aktivního profilu (SecretStorage) | — |
| `utPLSQL: Spustit s reporterem (export)` | Spustí výběr se zvoleným reporterem a zapíše výstup do Output/souboru (nemění výsledky) | Test Explorer → menu do item |

> **Recompile UT3** (`utplsql.recompileUt3`) **není** příkaz palety — je to
> interní rychlá oprava diagnostiky „utPLSQL Setup" (neplatné objekty ve
> schématu utPLSQL).

## Klávesové zkratky

Všechny zkratky používají předponu `Ctrl+Shift+U` (`Cmd+Shift+U` na Macu):

| Zkratka | Příkaz |
|---|---|
| `Ctrl+Shift+U R` | Run all tests |
| `Ctrl+Shift+U T` | Run tests in file |
| `Ctrl+Shift+U Shift+T` | Run tests in file with coverage |
| `Ctrl+Shift+U F` | Refresh tests |
| `Ctrl+Shift+U I` | Show utPLSQL info |
| `Ctrl+Shift+U C` | Clear session connection |
| `Ctrl+Shift+U L` | Rerun last |
| `Ctrl+Shift+U U` | Run at cursor |
| `Ctrl+Shift+U X` | Run failed only |
| `Escape` | Cancel run |

## Pokrytí

- **Provedené** řádky zezelenají v okraji; **neprovedené** řádky zčervenají.
- Karta **Test Coverage** zobrazuje **procenta podle souboru/složky**.



## Reportéry

Rozšíření vždy zahrnuje **dva** výchozí reportéry:
`ut_documentation_reporter` (stdout) a
`ut_junit_reporter` (výsledky → Test Explorer).
`ut_coverage_cobertura_reporter` se přidává **pouze při spuštění s pokrytím**.

**Dynamické ověření** — před spuštěním s pokrytím rozšíření dotazuje
databázi přes `TABLE(ut_runner.get_reporters_list())`. Pokud
`UT_COVERAGE_COBERTURA_REPORTER` v databázi neexistuje (např. zastaralý
utPLSQL), pokrytí se přeskočí s varováním ve výstupu. Spuštění testů
není nikdy blokováno.

**Další pevné reportéry** — nastavení `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Výchozí reportéry jsou automaticky deduplikovány, i když jsou
zde uvedeny.

**Volatilní reportér pro relaci** — příkaz **utPLSQL: Select additional
reporter...** otevře QuickPick s dynamickým seznamem z databáze. Vybraný
reportér se uloží do relace a **použije se při dalším spuštění**.

## Požadavky na databázi

**Pokrytí** (vždy) — povoluje profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Bez toho testy běží, ale pokrytí vyjde **prázdné**.

**Objevování testů v JINÝCH schématech** (utPLSQL **shared** instalace, např. vlastník `UT3`):
aby framework viděl a parsoval testy aplikačních schémat, musí vlastník utPLSQL
**číst slovník** těchto schémat:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **Samotné `SELECT ANY DICTIONARY` NESTAČÍ** — vyžaduje **přímé** granty na tyto pohledy
  (kvůli `dbms_assert.sql_object_name` v kontextu definera).
- Musí být také nainstalován **DDL trigger** utPLSQL (udržuje mezipaměť anotací aktuální).
- Ověření (jako vlastník): `SELECT ut_metadata.get_source_view_name FROM dual;` by mělo vrátit `dba_source`.

> V instalacích **per-schema** (utPLSQL ve stejném schématu jako testy) tyto
> mezi-schématové granty **nejsou** potřeba — framework čte svůj vlastní zdroj.

## Známá omezení

- Mapování výsledek→test se provádí podle názvu balíčku + názvu/popisu testu;
  identické popisy v různých balíčcích mohou vytvořit nejednoznačnost (index je
  ohraničen podle balíčku, aby se to minimalizovalo).
- Zohledňuje **první** složku pracovního prostoru pro rozlišení `sourcePath`.
- Discovery čte `.pks` (specifikace); uchovávejte anotace `%suite`/`%test` ve specifikaci.

## Řešení problémů

| Příznak | Pravděpodobná příčina | Řešení |
|---|---|---|
| Prázdné pokrytí | Chybí `GRANT EXECUTE ON DBMS_PROFILER` | Spusťte granty v [Požadavky](#požadavky-na-databázi) nebo použijte `utPLSQL: Copy coverage grants to clipboard` |
| Prázdné pokrytí | Oracle 19c vyžaduje další granty | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Chyba kompilace bez indikace | Kód se syntaktickou chybou PL/SQL | Ponechte `utplsql.compilationDiagnostics.enabled` zapnuté (výchozí); chyby z `ALL_ERRORS` se po spuštění zobrazí v panelu „Problémy" |
| Chyba připojení | Chybný řetězec nebo nedostupná DB | Použijte `utPLSQL: Validate setup` |
| `%suite` není rozpoznán | Chybí `%suite`/`create package` v souboru, nebo `%test` bez `PROCEDURE` | Zkontrolujte specifikaci; spusťte `utPLSQL: Refresh tests` |
| CodeLens se nezobrazuje | Vypnutý `editor.codeLens` nebo konflikt | Povolte `"editor.codeLens": true`; zkontrolujte `utplsql.codeLens.enabled` |
| Zkratky nefungují | Konflikt s jiným rozšířením nebo zkratkou VSCode | Přejděte do Soubor → Předvolby → Klávesové zkratky a vyhledejte `utplsql` pro předefinování |
| Potřebujete diagnostiku | Není jasné, co rozšíření interně dělá | Před spuštěním VSCode nastavte `UTPLSQL_DEBUG=1` pro zapnutí diagnostických logů (kontext selhání připojení/vyhledávání/pokrytí) v konzoli Extension Host |

## Prohlášení

Toto je nezávislý komunitní projekt. Není přidružen k týmu frameworku utPLSQL ani ke společnosti Oracle Corporation, ani jimi není schválen či sponzorován. utPLSQL a Oracle jsou ochranné známky příslušných vlastníků.

## Licence

MIT © Gil Cleber Barboza
