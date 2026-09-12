<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · [Română](README.ro.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [Čeština](README.cs.md) · [Български](README.bg.md) · [Српски](README.sr.md) · [Türkçe](README.tr.md) · [Ελληνικά](README.el.md) · **Magyar** · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md) · [ไทย](README.th.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

Integrálja a [utPLSQL](https://www.utplsql.org/) teszteket a VSCode-ba, és a PL/SQL-teszteket a natív **Test Explorer**be hozza, helyi menüvel és vizuális kódfedettséggel.

- 🧪 **Natív Test Explorer** — a suite-ok és tesztek megjelennek a tesztnézetben; futtathatók teszt, suite, fájl vagy mappa szinten.
- 🔍 **CodeLens** — Run/Run with Coverage gombok a `%suite` és `%test` fölött a szerkesztőben, anélkül hogy elhagynád a kódod.
- ⌨️ **Billentyűparancsok** — `Ctrl+Shift+U` előtag + billentyű a fő parancsokhoz (R = Run All, T = Run File, L = Rerun Last stb.).
- 🖱️ **Helyi menü** — kattints jobb gombbal egy **mappára** vagy egy **`.pks`/`.pkb`** fájlra (az Explorerben vagy a szerkesztőben) a tesztek futtatásához.
- 📊 **Vizuális lefedettség** — színes jelölések a sorok mellett (lefedett/nem lefedett) és fájlonkénti százalék a **Coverage** lapon.
- ✅ **Beágyazott dekorációk** — ✓/✗/⚠ ikonok a szerkesztőben a futtatás után, hibaleírással ellátott tooltippel és áttekintő csúszkával (overview ruler).
- 📌 **Állapotsor** — mutató a sikeres/sikertelen tesztek számával, időtartammal és valós idejű előrehaladással.
- 🔁 **Okos újrafuttatás** — Rerun Last, Run at Cursor, Run Failed Only egyetlen billentyűparanccsal.
- 🚀 **Közvetlen Oracle (node-oracledb segítségével)** — valós idejű adatfolyam, nem kell megvárni a köteg végét.
- 🔧 **Beállítás-diagnosztika** — proaktív ellenőrzés: kapcsolat, jogosultságok és verzió, gyorsjavítással.
- 🧩 **Séma-tudatos fa** — a tesztek szervezése Séma > Package > Suite > Teszt szerint a Test Explorerben.
- 🎯 **Ugrás a hibához** — közvetlen navigáció a hibát kiváltó állítás sorához (a natív „Go to Error" segítségével).
- 🔌 **Kapcsolati profilok** — több környezet (DEV/TEST/PROD) mentése és váltása köztük profil-specifikus beállításokkal, az állapotsorból vagy a parancspalettáról.
- 📈 **Utasítás- és nézetlefedettség** — a Coverage lap `% of statements` (PROCEDURE/FUNCTION) arányt mutat fájlonként, és a `V$SQL`-lal végrehajtott nézeteket is követi.
- 🐛 **PL/SQL-hibakeresés** — töréspontok és lépésenkénti hibakeresés a utPLSQL-tesztekhez `DBMS_DEBUG` segítségével (natív Debug Adapter).
- 🌍 **i18n — 24 nyelv** — a `utplsql.language` követi a VSCode-ot (15 natív + 9 közösségi: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Telepítés

A bővítmény kétféleképpen telepíthető:

1. **A Marketplace-ről:** Keress rá a **utPLSQL Test Runner** kifejezésre a VSCode bővítmények paneljén (`Ctrl+Shift+X`), és kattints az **Install** gombra.
2. **Kézzel (.vsix):** Töltsd le a kívánt verzió `.vsix` fájlját, és telepítsd a VSCode-ban:
   * **Parancssorból:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Felületről:** Nyisd meg a Bővítmények panelt (`Ctrl+Shift+X`), kattints a három pontra `...` (jobb felső sarok), és válaszd az **Install from VSIX...** lehetőséget.

## Követelmények

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** telepítve az Oracle adatbázisban.
- Csak az adatbázis kell — a VSIX már tartalmazza a thin `oracledb` illesztőt (Instant Client nélkül).
- **VSCode 1.88+** (Test Coverage API).

A bővítmény csupán a „grafikus kliens" — a teszteket ténylegesen az adatbázis futtatja közvetlenül a node-oracledb-n keresztül.

## Kapcsolat

A bővítménynek Oracle kapcsolati sztringre van szüksége a tesztek futtatásához. A feloldás sorrendje a következő:

1. **Aktív kapcsolati profil** — `utplsql.activeProfile` az `utplsql.profiles` egyik profiljára mutat (felülír mindent, ami alatta következik).
2. **`utplsql.connection` beállítás** — a projekt/felhasználó `settings.json` állományából olvasva.
3. **`UTPLSQL_CONN` környezeti változó** — a VSCode elindítása előtt beállítva.
4. **Munkamenet-gyorsítótár** — ha a felhasználó már beírta a kapcsolatot a promptban.
5. **Megkérdezi a felhasználót** — és csak az aktuális munkamenetben őrzi meg.

A kapcsolati profilok (`utplsql.profiles`) környezetenként felülírhatják a `sourcePath`, `coverageOwner` stb. értékeket is — lásd `utplsql.activeProfile` a konfigurációs táblázatban.

⚠️ **Biztonsági javaslat:** a kapcsolati sztring jelszót tartalmaz. **NE** használd a
`utplsql.connection` beállítást megosztott környezetekben (a settings.json verziókezelés alatt
állhat, vagy mások számára látható). Ehelyett **a `UTPLSQL_CONN` környezeti változót használd**:

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

Ha sem a beállítás, sem a környezeti változó nincs definiálva, a bővítmény megkérdezi a
kapcsolatot, és azt csak a memóriában őrzi meg a munkamenet során — a
**utPLSQL: Clear session connection** paranccsal (parancspaletta) törölhető.

**Elfogadott formátumok:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS-alias**: `user/pass@tns_alias` (beállított `TNS_ADMIN` szükséges)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Működés

Nincsenek ideiglenes fájlok, nem kell megvárni a köteg végét. Az eredmények a
Test Explorerben **ahogy az egyes tesztek befejeződnek** jelennek meg.

A bővítmény közvetlenül Oracle-on keresztül csatlakozik, beolvassa a riportokat (JUnit + Coverage), és lefordítja azokat a VSCode natív API-jaira.

## Konfiguráció

| Beállítás | Alapértelmezés | Leírás |
|---|---|---|
| `utplsql.connection` | `""` | Oracle-kapcsolat. **Hagyd üresen**, és használd a `UTPLSQL_CONN` környezeti változót, hogy ne tárold a jelszót. Ha mindkettő üres, a bővítmény megkérdezi (csak a munkamenetben őrzi meg). |
| `utplsql.sourcePath` | `install` | Az éles kód mappája (a lefedettség fájlokhoz rendeléséhez). |
| `utplsql.includePatterns` | `["**/*.pks"]` | A `%suite`/`%test` tartalmú specifikációk felderítésére szolgáló globok. Ha a tesztjeid `.sql` fájlokban vannak, használd a `["**/*.sql"]` értéket. |
| `utplsql.coverageOwner` | `""` | A lefedett objektumok séma-tulajdonosa. Üres = a kapcsolati felhasználó (nagybetűvel). |
| `utplsql.additionalReporters` | `[]` | További riporterek, amelyek minden futtatáskor bekerülnek (pl. `["ut_coverage_html_reporter"]`). Az alapértelmezettek (documentation, junit, coverage) mindig szerepelnek, és nem kell felsorolni őket. |
| `utplsql.codeLens.enabled` | `true` | Run/Run with Coverage CodeLens-gombokat jelenít meg a `%suite` és `%test` fölött. |
| `utplsql.statusBar.enabled` | `true` | A tesztek állapotát jelző mutatót jelenít meg az állapotsorban. |
| `utplsql.decorations.enabled` | `true` | Sikeres/sikertelen dekorációkat jelenít meg a `%suite` és `%test` sorokon a futtatás után. |
| `utplsql.oraclePoolMin` | `2` | Az Oracle futtatókészlet (node-oracledb) által fenntartott minimális kapcsolatok száma. |
| `utplsql.oraclePoolMax` | `10` | Az Oracle futtatókészlet (node-oracledb) maximális kapcsolatszáma. |
| `utplsql.oraclePoolIncrement` | `1` | Az Oracle futtatókészlet (node-oracledb) bővítésének lépésköze. |
| `utplsql.oraclePoolPingInterval` | `60` | Az üresjárati készletkapcsolatok állapotellenőrzései közötti másodpercek száma (node-oracledb). `0` = ping minden kivételkor. |
| `utplsql.organization` | `file` | Fa-szervezés: `file` (elérési út szerint) vagy `schema` (Séma > Package > Suite > Teszt). `schema` módban a suite-ok az adatbázisból is felderítésre kerülnek (`ALL_OBJECTS`/`ALL_SOURCE`), ha a `.pks` fájlok nincsenek a munkaterületen — virtuális URI-vel `utplsql-db:/` (CodeLens/dekorációk/ugrás a hibához nélkül). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob-minta a séma kinyeréséhez az elérési útból. Helyőrzőként a `{schema}` használható. `schema` módban a minta alapja alatti könyvtárak (pl. `db/*`) határozzák meg az adatbázisban lekérdezett sémákat. |
| `utplsql.compilationDiagnostics.enabled` | `true` | A PL/SQL fordítási hibákat aláhúzásként jeleníti meg a szerkesztőben és a Problems Panelben. |
| `utplsql.setupDiagnostics.enabled` | `true` | Konfigurációs diagnosztikát (kapcsolat, jogosultságok, verzió) és **utPLSQL-telepítési integritást** (érvénytelen objektumok az UT3 sémában, „Recompile UT3" gyorsjavítással) jelenít meg gyorsjavítási műveletekkel. |
| `utplsql.profiles` | `[]` | Mentett Oracle kapcsolati profilok (név, kapcsolat és `sourcePath`/`coverageOwner`/stb. felülírások) a környezetek közötti váltáshoz. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | Az aktív profil azonosítója (`utplsql.profiles`). Ha be van állítva, felülírja a `utplsql.connection` értékét. |
| `utplsql.sqlCoverageEnabled` | `false` | A `V$SQL`-on keresztül végrehajtott nézeteket követi nyomon (boolean lefedettség). `GRANT SELECT ON V$SQL` jogosultságot igényel. |
| `utplsql.debugger.enabled` | `true` | Engedélyezi a PL/SQL-tesztek hibakeresését (`DBMS_DEBUG`). `node-oracledb` + jogosultságok szükségesek. |
| `utplsql.debugger.stopOnException` | `true` | Megáll a PL/SQL-kivételeknél a hibakeresés során. |
| `utplsql.debugger.timeoutSeconds` | `300` | A hibakeresési munkamenet időtúllépése (másodperc). |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | A futásidejű üzenetek nyelve. `auto` esetén a VSCode-ot követi (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; egyébként en). A **24 területi beállítást** fedi le (15 natív + 9 közösségi). |

Példa (projekt `.vscode/settings.json`):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

És a VSCode megnyitása előtt (vagy a PowerShell-profilban):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Közreműködőknek

Hozz létre egy `.env` fájlt a projekt gyökerében (gitignored) az integrációs tesztek
által használt környezeti változókkal:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Használat

1. Nyisd meg a PL/SQL projektet (a kódot és a tesztcsomagokat tartalmazót).
2. Fordítsd le a kódot és a teszteket az adatbázisban (Oracle-bővítmény / SQLcl).
3. Nyisd meg a **Testing** nézetet → megjelennek a suite-ok.
4. Futtatás:
   - **CodeLens** segítségével — ▶ Run/Run with Coverage gombok az egyes `%suite` és `%test` fölött a szerkesztőben.
   - az egyes tesztek/suite-ok melletti **sávból** (gutter), vagy
   - a **billentyűparancsokkal** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File stb.), vagy
   - a Test Explorer nézet **Run Tests** gombjával, vagy
   - **jobb gombbal** egy mappára/fájlra kattintva → *utPLSQL: Run tests…* (lefedettséggel vagy anélkül).
5. A futtatás után lásd:
   - **Beágyazott dekorációk** (✓/✗/⚠) a szerkesztőben a tesztannotációk mellett.
   - **Állapotsor** a sikeres/sikertelen tesztek számával és a teljes időtartammal.
   - **Test Explorer** részletes eredményekkel.
6. Lefedettséghez használd a **Run with Coverage** profilt (vagy a „with coverage" menüpontot).
7. Gyors ismétléshez:
   - `Ctrl+Shift+U L` — **Rerun Last** (megismétli az utolsó futtatást, lefedettséggel vagy anélkül).
   - `Ctrl+Shift+U U` — **Run at Cursor** (a kurzor alatti `%test`/`%suite` futtatása).
   - `Ctrl+Shift+U X` — **Run Failed Only** (csak a sikertelen teszteket futtatja).
8. **Közvetlen Oracle (adatfolyam) esetén:** nincs mit telepíteni — a VSIX már tartalmazza a thin `oracledb` illesztőt.
9. Diagnosztikához használd a palettán a `utPLSQL: Show information` parancsot — API/DB-verziókat mutat másolási lehetőséggel.
10. **utPLSQL: Select additional reporter...** — QuickPick az adatbázisban elérhető riporterekkel.
11. **utPLSQL: Cancel execution** — leállítja a futó végrehajtást (`Escape` a futtatás alatt).
12. **utPLSQL: Refresh tests** — a `.pks` fájlok újrafelfedezését kényszeríti ki.

> 💡 **Tipp tesztíráskor:** a feldolgozó (parser) token-vezérelt — elég, ha a fájlban van
> `%suite` és a `create package` deklaráció, és minden `%test` után ott van a hozzá tartozó
> `PROCEDURE`. Nincs üres sorra vonatkozó követelmény.

### Támogatott annotációk (v0.10.0+)

A felderítés a `%suite` és `%test` mellett ezeket is érti:

| Annotáció | Hatás a Test Explorerben |
|---|---|
| `-- %disabled` | A suite vagy teszt **nem jelenik meg** a fában (kihagyva a felderítés során) |
| `-- %throws(-20001)` | Jelzi, hogy a teszt a -20001 kivételt várja (`expectedError` metaadat) |
| `-- %tags(fast, critical)` | Teszttagek (metaadat; a tagek szerinti szűrés a roadmap része) |
| `-- %displayname(Name)` | A `%test` leírása helyett megjelenített egyedi név |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Lifecycle-horgokkal jelöli meg a suite-ot (metaadat) |

Az annotációk nem kis- és nagybetű-érzékenyek. A suite fejlécében (a `%suite` és az
első `%test` között) a suite-ra vonatkoznak; a `%test` után a tesztre vonatkoznak.

## Parancsok

A bővítmény összes parancsa (paletta `Ctrl+Shift+P`, előtag `utPLSQL:`):

| Parancs | Leírás | UI-parancsikon |
|---|---|---|
| `utPLSQL: Run all tests` | A munkaterület összes suite-át futtatja | ▶ gomb a Testing nézetben |
| `utPLSQL: Run tests in this file` | Az aktív `.pks`/`.pkb` suite-jait futtatja | Jobb gomb → fájl |
| `utPLSQL: Run tests in this file with coverage` | Ugyanaz, lefedettségi profillal | Jobb gomb → fájl |
| `utPLSQL: Run tests in this folder` | A kiválasztott mappa suite-jait futtatja | Jobb gomb → mappa |
| `utPLSQL: Run tests in this folder with coverage` | Ugyanaz, lefedettségi profillal | Jobb gomb → mappa |
| `utPLSQL: Refresh tests` | A `.pks` fájlok újrafelfedezését kényszeríti ki | — |
| `utPLSQL: Cancel execution` | Leállítja a futó végrehajtást | — |
| `utPLSQL: Show utPLSQL information` | API/DB-verziók másolási lehetőséggel | — |
| `utPLSQL: Select additional reporter...` | QuickPick az adatbázis riportereivel | — |
| `utPLSQL: Clear session connection` | Eltávolítja a kapcsolatot a munkamenet-gyorsítótárból | — |
| `utPLSQL: Rerun Last` | Megismétli az utolsó futtatást | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | A kurzor alatti tesztet futtatja | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Csak a sikertelen teszteket futtatja újra | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Teljes beállítás-ellenőrzést futtat (kapcsolat, UT3-telepítés), és megmutatja az eredményt | — |
| `utPLSQL: Configure connection` | Megnyitja a beállításokat a `utplsql.connection` értéknél | — |
| `utPLSQL: Copy coverage grants to clipboard` | A jogosultságok SQL-jét a vágólapra másolja | — |
| `utPLSQL: Show Test Explorer` | A Testing nézetre fókuszál | — |
| `utPLSQL: Switch connection profile...` | Vált az aktív kapcsolati profilra (QuickPick) | Kattintás az állapotsorra (aktív profillal) |
| `utPLSQL: New connection profile...` | Varázsló profil létrehozásához és aktiválásához | — |
| `utPLSQL: Manage connection profiles` | Megnyitja a beállításokat a `utplsql.profiles` értéknél | — |
| `utPLSQL: Import connections from SQL Developer` | Kapcsolatok importálása az SQL Developerből (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Hibakeresési munkamenetet indít az aktív fájlban lévő tesztre | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |

> **Recompile UT3** (`utplsql.recompileUt3`) **nem** palettaparancs — ez a
> „utPLSQL Setup" diagnosztika belső gyorsjavítása (érvénytelen objektumok a
> utPLSQL sémában).

## Billentyűparancsok

Minden parancsikon a `Ctrl+Shift+U` előtagot használja (`Cmd+Shift+U` Macen):

| Parancsikon | Parancs |
|---|---|
| `Ctrl+Shift+U R` | Az összes teszt futtatása |
| `Ctrl+Shift+U T` | A fájl tesztjeinek futtatása |
| `Ctrl+Shift+U Shift+T` | A fájl tesztjeinek futtatása lefedettséggel |
| `Ctrl+Shift+U F` | Tesztek frissítése |
| `Ctrl+Shift+U I` | utPLSQL-információ megjelenítése |
| `Ctrl+Shift+U C` | Munkamenet-kapcsolat törlése |
| `Ctrl+Shift+U L` | Az utolsó futtatás megismétlése |
| `Ctrl+Shift+U U` | Futtatás a kurzornál |
| `Ctrl+Shift+U X` | Csak a sikertelenek futtatása |
| `Escape` | Végrehajtás megszakítása |

## Lefedettség

- A **végrehajtott** sorok zöldre váltanak a sávban (gutter); a **nem végrehajtott** sorok pirosra váltanak.
- A **Test Coverage** lap a **fájlonkénti/mappánkénti százalékot** mutatja.



A bővítmény átadja a `-source_path` értéket (= `utplsql.sourcePath`), és a lefedett objektumokat
a `utplsql.coverageSourceArgs` segítségével rendeli a forrásfájlokhoz (regex + `type_mapping`). A `-owner`
a kapcsolatból származik (vagy a `utplsql.coverageOwner`-ból).

### A lefedettség fájlokhoz rendelése (`coverageSourceArgs`)

A `type_mapping` a regex által kinyert „típust" Oracle-típussá alakítja. Három gyakori konvenció:

**1) Könyvtár szerint** — `sourcePath/<type>/<name>.sql` szerkezet (`functions/`, `procedures/`, `packages/`, … mappák):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Bármilyen mélységben működik (a `.*` magába szívja a fölötte lévő modulokat). A változatos
> mappanevek (pl. `package`, `pkg`, `pacote`) felsorolhatók a `type_mapping`-ben.

**2) Név-előtag szerint** — `pkg_*`, `prc_*`, `vw_*` konvenció (mappától független):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Típusos kiterjesztés szerint** — `*.pkb`, `*.fnc`, `*.prc`, `*.trg` fájlok (mappától független):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Fontos megjegyzések:**
- **Csomagok → `PACKAGE BODY`** (nem `PACKAGE`): a lefedettség a csomag **törzsében** gyűlik össze.

## Riporterek

A bővítmény mindig három alapértelmezett riportert tartalmaz:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (eredmények → Test Explorer) és
`ut_coverage_cobertura_reporter` (lefedettség, ha elérhető).

**Dinamikus ellenőrzés** — a lefedettséggel történő futtatás előtt a bővítmény lekérdezi
az adatbázist a `utplsql reporters <conn>` paranccsal. Ha a
`UT_COVERAGE_COBERTURA_REPORTER` nem létezik az adatbázisban (pl. elavult
utPLSQL), a lefedettség figyelmeztetéssel kimarad a kimenetben. A tesztek futtatása
soha nem blokkolódik.

**További rögzített riporterek** — `utplsql.additionalReporters` beállítás:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
A három alapértelmezett riporter automatikusan deduplikálódik, még akkor is, ha
itt fel vannak sorolva.

**Munkamenetenként változó riporter** — a **utPLSQL: Select additional
reporter...** parancs QuickPicket nyit az adatbázisból származó dinamikus listával. A
kiválasztott riporter a következő futtatásnál kerül használatra, majd eldobódik (nem
marad meg a beállításokban).

## Adatbázis-követelmények

**Lefedettség** (mindig) — engedélyezi a profilt:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Enélkül a tesztek futnak, de a lefedettség **üres** lesz.

**Tesztfelderítés MÁS sémákban** (utPLSQL **megosztott** telepítése, pl. `UT3` tulajdonos):
ahhoz, hogy a keretrendszer lássa és feldolgozza az alkalmazássémák tesztjeit, a utPLSQL-tulajdonosnak
**olvasnia kell azok sémáinak adatszótárát**:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **A `SELECT ANY DICTIONARY` önmagában NEM elég** — **közvetlen** jogosultságok kellenek azokon a nézeteken
  (a `dbms_assert.sql_object_name` miatt definer-kontextusban).
- A utPLSQL **DDL-triggerét** is telepíteni kell (naprakészen tartja az annotáció-gyorsítótárat).
- Ellenőrzés (tulajdonosként): a `SELECT ut_metadata.get_source_view_name FROM dual;` parancsnak `dba_source` értéket kell visszaadnia.

> **Sémánkénti** telepítéseknél (a utPLSQL ugyanabban a sémában van, mint a tesztek) ezekre a
> sémák közötti jogosultságokra **nincs** szükség — a keretrendszer a saját forrását olvassa.

## Ismert korlátok

- Az eredmény→teszt hozzárendelés csomagnév + tesztnév/leírás alapján történik;
  az azonos leírások különböző csomagokban kétértelműséget okozhatnak (az index
  csomagonként hatóköri, hogy ezt minimalizálja).
- A `sourcePath` feloldásához az **első** munkaterület-mappát veszi figyelembe.
- A felderítés a `.pks` fájlokat (specifikációkat) olvassa; tartsd a `%suite`/`%test` annotációkat a specifikációban.

## Hibaelhárítás

| Tünet | Valószínű ok | Megoldás |
|---|---|---|
| Üres lefedettség | Hiányzó `GRANT EXECUTE ON DBMS_PROFILER` | Futtasd a jogosultságokat az [Adatbázis-követelmények](#adatbázis-követelmények) rész szerint, vagy használd a `utPLSQL: Copy coverage grants to clipboard` parancsot |
| Üres lefedettség | Az Oracle 19c további jogosultságokat igényel | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Fordítási hiba minden jelzés nélkül | PL/SQL szintaktikai hibát tartalmazó kód | Kapcsold be a `utplsql.compilationDiagnostics.enabled` beállítást (alapból be van kapcsolva); nézd meg a Problems Panelt |
| Kapcsolati hiba | Hibás sztring vagy elérhetetlen adatbázis | Használd a `utPLSQL: Validate configuration` parancsot |
| A `%suite` nem kerül felismerésre | Hiányzó `%suite`/`create package` a fájlban, vagy `%test` `PROCEDURE` nélkül | Ellenőrizd a specifikációt; futtasd a `utPLSQL: Refresh tests` parancsot |
| A CodeLens nem jelenik meg | `editor.codeLens` kikapcsolva vagy ütközés | Kapcsold be a `"editor.codeLens": true` értéket; ellenőrizd a `utplsql.codeLens.enabled` beállítást |
| A billentyűparancsok nem működnek | Ütközés másik bővítménnyel vagy VSCode-parancsikonnal | Menj a Fájl → Beállítások → Billentyűparancsok menübe, és keress rá a `utplsql` kifejezésre az újradefiniáláshoz |

## Licenc

MIT © Gil Cleber Barboza
