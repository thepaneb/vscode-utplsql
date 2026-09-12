<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · **Čeština** · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

Integruje [utPLSQL](https://www.utplsql.org/) do VSCode a přináší PL/SQL testy do nativního **Test Exploreru**, s kontextovou nabídkou a vizuálním pokrytím kódu.

- 🧪 **Nativní Test Explorer** — sady a testy se zobrazují v pohledu testování; spouštění podle testu, sady, souboru nebo složky.
- 🔍 **CodeLens** — tlačítka Run/Run with Coverage nad `%suite` a `%test` v editoru, bez opuštění kódu.
- ⌨️ **Klávesové zkratky** — předpona `Ctrl+Shift+U` + klávesa pro hlavní příkazy (R = Run All, T = Run File, L = Rerun Last atd.).
- 🖱️ **Kontextová nabídka** — klikněte pravým tlačítkem na **složku** nebo soubor **`.pks`/`.pkb`** (v Průzkumníku nebo v editoru) pro spuštění testů.
- 📊 **Vizuální pokrytí** — barevné okraje (marginy) podle řádků (pokryto/nepokryto) a procenta podle souboru na kartě **Coverage**.
- ✅ **Inline dekorace** — ikony ✓/✗/⚠ v editoru po spuštění, s tooltipem při selhání a přehledovým pravítkem.
- 📌 **Stavový řádek** — indikátor s počtem prošlých/selhávajících, délkou trvání a průběhem v reálném čase.
- 🔁 **Chytré opětovné spuštění** — Rerun Last, Run at Cursor, Run Failed Only jedinou zkratkou.
- 🚀 **Oracle přímý (přes node-oracledb)** — streamování v reálném čase, bez čekání na dokončení dávky.
- 🔧 **Diagnostika nastavení** — proaktivní ověření připojení, grantů a verze s rychlou opravou (quick-fix).
- 🧩 **Strom podle schémat** — uspořádání testů podle Schema > Package > Suite > Test v Test Exploreru.
- 🎯 **Skok na selhání** — přímá navigace na řádek tvrzení, které selhalo (přes nativní „Go to Error").
- 🔌 **Profily připojení** — ukládání a přepínání mezi více prostředími (DEV/TEST/PROD) s nastavením podle profilu, přes stavový řádek nebo paletu příkazů.
- 📈 **Pokrytí příkazů a pohledů** — karta Coverage zobrazuje `% of statements` (PROCEDURE/FUNCTION) podle souboru a sleduje pohledy spuštěné přes `V$SQL`.
- 🐛 **PL/SQL Debug** — breakpointy a krokování testů utPLSQL přes `DBMS_DEBUG` (nativní Debug Adapter).
- 🌍 **i18n — 24 jazyků** — `utplsql.language` se řídí VSCode (15 nativních + 9 komunitních: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Instalace

Rozšíření lze nainstalovat dvěma způsoby:

1. **Z Marketplace:** Vyhledejte **utPLSQL Test Runner** v panelu rozšíření VSCode (`Ctrl+Shift+X`) a klikněte na **Install**.
2. **Ručně (.vsix):** Stáhněte soubor `.vsix` požadované verze a nainstalujte jej do VSCode:
   * **Přes příkazový řádek:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Přes rozhraní:** Otevřete panel Rozšíření (`Ctrl+Shift+X`), klikněte na tři tečky `...` (v pravém horním rohu) a vyberte **Install from VSIX...**.

## Požadavky

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** nainstalovaný v databázi Oracle.
- Pouze databáze — VSIX už obsahuje tenký ovladač `oracledb` (bez Instant Client).
- **VSCode 1.88+** (Test Coverage API).

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
- **TNS alias**: `user/pass@tns_alias` (vyžaduje nakonfigurovaný `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

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
| `utplsql.additionalReporters` | `[]` | Další reportéry zahrnuté do každého spuštění (např. `["ut_coverage_html_reporter"]`). Výchozí (documentation, junit, coverage) jsou vždy zahrnuty a není třeba je vypisovat. |
| `utplsql.codeLens.enabled` | `true` | Zobrazuje tlačítka CodeLens Run/Run with Coverage nad `%suite` a `%test`. |
| `utplsql.statusBar.enabled` | `true` | Zobrazuje indikátor stavu testů ve stavovém řádku. |
| `utplsql.decorations.enabled` | `true` | Zobrazuje dekorace prošlo/selháno na řádcích `%suite` a `%test` po spuštění. |
| `utplsql.oraclePoolMin` | `2` | Minimální počet připojení udržovaných v poolu Oracle runneru (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maximální počet připojení v poolu Oracle runneru (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Přírůstek při rozšiřování poolu Oracle runneru (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Sekundy mezi kontrolami stavu nečinných připojení v poolu (node-oracledb). `0` = ping při každém checkoutu. |
| `utplsql.organization` | `file` | Uspořádání stromu: `file` (podle cesty) nebo `schema` (Schema > Package > Suite > Test). V režimu `schema` se sady také objevují z databáze (`ALL_OBJECTS`/`ALL_SOURCE`), když soubory `.pks` nejsou v pracovním prostoru — s virtuální URI `utplsql-db:/` (bez CodeLens/dekorací/skoku na selhání). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob vzor pro extrakci schématu z cesty. Použijte `{schema}` jako zástupný symbol. V režimu `schema` adresáře pod základnou vzoru (např. `db/*`) definují schémata dotazovaná v databázi. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Zobrazuje chyby kompilace PL/SQL jako podtržení v editoru a v panelu Problémy. |
| `utplsql.setupDiagnostics.enabled` | `true` | Zobrazuje diagnostiku konfigurace (připojení, granty, verze) a **integritu instalace utPLSQL** (neplatné objekty ve schématu UT3, s rychlou opravou „Recompile UT3") s akcemi rychlé opravy. |
| `utplsql.profiles` | `[]` | Uložené profily připojení k Oracle (název, připojení a přebití `sourcePath`/`coverageOwner`/atd.) pro přepínání mezi prostředími. |
| `utplsql.activeProfile` | `""` | ID aktivního profilu (`utplsql.profiles`). Pokud je nastaveno, přebíjí `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Sleduje pohledy spuštěné přes `V$SQL` (boolean pokrytí). Vyžaduje `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Povoluje ladění PL/SQL testů (`DBMS_DEBUG`). Vyžaduje `node-oracledb` + granty. |
| `utplsql.debugger.stopOnException` | `true` | Pozastaví se při výjimkách PL/SQL během ladění. |
| `utplsql.debugger.timeoutSeconds` | `300` | Časový limit (s) ladící relace. |
| `utplsql.language` | `auto` | Jazyk běhových zpráv. `auto` se řídí VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; jinak en). Pokrývá **24 locale** (15 nativních + 9 komunitních). |

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
11. **utPLSQL: Cancel execution** — zastaví probíhající spuštění (`Escape` během spuštění).
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
| `-- %tags(fast, critical)` | Tagy testu (metadata; filtrování podle tagů je roadmapa) |
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
| `utPLSQL: Cancel execution` | Zastaví běžící spuštění | — |
| `utPLSQL: Show utPLSQL information` | Verze API/DB s možností kopírování | — |
| `utPLSQL: Select additional reporter...` | QuickPick s reportéry databáze | — |
| `utPLSQL: Clear session connection` | Odstraní připojení z mezipaměti relace | — |
| `utPLSQL: Rerun Last` | Zopakuje poslední spuštění | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Spustí test pod kurzorem | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Spustí znovu pouze selhané testy | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Spustí úplné ověření nastavení (připojení, instalace UT3) a zobrazí výsledky | — |
| `utPLSQL: Configure connection` | Otevře nastavení na `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Zkopíruje SQL grantů do schránky | — |
| `utPLSQL: Show Test Explorer` | Zaměří pohled Testing | — |
| `utPLSQL: Switch connection profile...` | Přepne aktivní profil připojení (QuickPick) | Kliknutí na stavový řádek (s aktivním profilem) |
| `utPLSQL: New connection profile...` | Průvodce vytvořením a aktivací profilu | — |
| `utPLSQL: Manage connection profiles` | Otevře nastavení na `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Importuje připojení ze SQL Developeru (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Spustí ladící relaci testu pod aktivním souborem | — |

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
| `Ctrl+Shift+U I` | Show utPLSQL information |
| `Ctrl+Shift+U C` | Clear session connection |
| `Ctrl+Shift+U L` | Rerun last |
| `Ctrl+Shift+U U` | Run at cursor |
| `Ctrl+Shift+U X` | Run failed only |
| `Escape` | Cancel execution |

## Pokrytí

- **Provedené** řádky zezelenají v okraji; **neprovedené** řádky zčervenají.
- Karta **Test Coverage** zobrazuje **procenta podle souboru/složky**.



Rozšíření předává `-source_path` (= `utplsql.sourcePath`) a mapuje pokryté objekty
na zdrojové soubory přes `utplsql.coverageSourceArgs` (regex + `type_mapping`). `-owner`
je odvozen z připojení (nebo z `utplsql.coverageOwner`).

### Mapování pokrytí na soubory (`coverageSourceArgs`)

`type_mapping` překládá „typ" zachycený regexem na typ Oracle. Tři běžné konvence:

**1) Podle adresáře** — struktura `sourcePath/<typ>/<název>.sql` (složky `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Funguje v jakékoli hloubce (`.*` absorbuje moduly nad tím). Různé názvy složek
> (např. `package`, `pkg`, `pacote`) lze vyjmenovat v `type_mapping`.

**2) Podle předpony názvu** — konvence `pkg_*`, `prc_*`, `vw_*` (nezávisle na složce):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Podle typové přípony** — soubory `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (nezávisle na složce):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Důležité poznámky:**
- **Balíčky → `PACKAGE BODY`** (ne `PACKAGE`): pokrytí se sbírá v **těle** balíčku.

## Reportéry

Rozšíření vždy zahrnuje tři výchozí reportéry:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (výsledky → Test Explorer) a
`ut_coverage_cobertura_reporter` (pokrytí, pokud je k dispozici).

**Dynamické ověření** — před spuštěním s pokrytím rozšíření dotazuje
databázi přes `utplsql reporters <conn>`. Pokud
`UT_COVERAGE_COBERTURA_REPORTER` v databázi neexistuje (např. zastaralý
utPLSQL), pokrytí se přeskočí s varováním ve výstupu. Spuštění testů
není nikdy blokováno.

**Další pevné reportéry** — nastavení `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Tři výchozí reportéry jsou automaticky deduplikovány, i když jsou
zde uvedeny.

**Volatilní reportér pro relaci** — příkaz **utPLSQL: Select additional
reporter...** otevře QuickPick s dynamickým seznamem z databáze. Vybraný
reportér se použije při příštím spuštění a poté se zahodí (neukládá se
do nastavení).

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
| Chyba kompilace bez indikace | Kód se syntaktickou chybou PL/SQL | Povolte `utplsql.compilationDiagnostics.enabled` (výchozí zapnuto); viz panel Problémy |
| Chyba připojení | Chybný řetězec nebo nedostupná DB | Použijte `utPLSQL: Validate configuration` |
| `%suite` není rozpoznán | Chybí `%suite`/`create package` v souboru, nebo `%test` bez `PROCEDURE` | Zkontrolujte specifikaci; spusťte `utPLSQL: Refresh tests` |
| CodeLens se nezobrazuje | Vypnutý `editor.codeLens` nebo konflikt | Povolte `"editor.codeLens": true`; zkontrolujte `utplsql.codeLens.enabled` |
| Zkratky nefungují | Konflikt s jiným rozšířením nebo zkratkou VSCode | Přejděte do Soubor → Předvolby → Klávesové zkratky a vyhledejte `utplsql` pro předefinování |

## Licence

MIT © Gil Cleber Barboza
