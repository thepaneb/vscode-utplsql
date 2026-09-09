<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · **Deutsch** · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

Integriert [utPLSQL](https://www.utplsql.org/) in VSCode und bringt PL/SQL-Tests in den nativen **Test Explorer**, mit Kontextmenü und visueller Codeabdeckung.

- 🧪 **Nativer Test Explorer** — Suiten und Tests erscheinen in der Testing-Ansicht; Ausführung nach Test, Suite, Datei oder Ordner.
- 🔍 **CodeLens** — Schaltflächen zum Ausführen bzw. Ausführen mit Codeabdeckung über `%suite` und `%test` im Editor, ohne den Code verlassen zu müssen.
- ⌨️ **Tastenkürzel** — `Ctrl+Shift+U`-Präfix + Taste für die wichtigsten Befehle (R = Alle ausführen, T = Datei ausführen, L = Letzte Ausführung wiederholen, usw.).
- 🖱️ **Kontextmenü** — Rechtsklick auf einen **Ordner** oder eine **`.pks`/`.pkb`**-Datei (im Explorer oder im Editor), um Tests auszuführen.
- 📊 **Visuelle Codeabdeckung** — farbige Einzüge pro Zeile (abgedeckt/nicht abgedeckt) und Prozentsatz pro Datei im **Coverage**-Tab.
- ✅ **Inline-Dekorationen** — ✓/✗/⚠-Symbole im Editor nach der Ausführung, mit Tooltip für Fehler und Übersichtslineal (overview ruler).
- 📌 **Statusleiste** — Anzeige mit Anzahl bestanden/fehlgeschlagen, Dauer und Fortschritt in Echtzeit.
- 🔁 **Intelligente Wiederholung** — Letzte Ausführung wiederholen, unter dem Cursor ausführen, nur fehlgeschlagene ausführen — mit einem einzigen Kürzel.
- 🚀 **Oracle-Direkt (via node-oracledb)** — Streaming in Echtzeit, ohne auf das Ende der Batch-Ausführung zu warten.
- 🔧 **Setup-Diagnose** — proaktive Validierung von Verbindung, Grants und Version mit Quick-Fix.
- 🧩 **Schema-bewusster Baum** — Tests nach Schema > Package > Suite > Test im Test Explorer organisieren.
- 🎯 **Sprung zum Fehler** — direkte Navigation zur Zeile der fehlgeschlagenen Assertion (über natives „Go to Error").
- 🔌 **Verbindungsprofile** — mehrere Umgebungen (DEV/TEST/PROD) mit profilbezogenen Einstellungen speichern und zwischen ihnen wechseln, über Statusleiste oder Befehlspalette.
- 📈 **Statement- und View-Abdeckung** — der Coverage-Tab zeigt `% of statements` (PROCEDURE/FUNCTION) pro Datei und verfolgt über `V$SQL` ausgeführte Views.
- 🐛 **PL/SQL-Debugging** — Breakpoints und Schritt-für-Schritt-Debugging von utPLSQL-Tests über `DBMS_DEBUG` (nattiver Debug-Adapter).
- 🌍 **i18n — 24 Sprachen** — `utplsql.language` folgt VSCode (15 nativ + 9 Community: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Installation

Die Erweiterung kann auf zwei Arten installiert werden:

1. **Über den Marketplace:** Suchen Sie im Erweiterungspanel von VSCode (`Ctrl+Shift+X`) nach **utPLSQL Test Runner** und klicken Sie auf **Installieren**.
2. **Manuell (.vsix):** Laden Sie die `.vsix`-Datei der gewünschten Version herunter und installieren Sie sie in VSCode:
   * **Über die Befehlszeile:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Über die Oberfläche:** Öffnen Sie das Erweiterungspanel (`Ctrl+Shift+X`), klicken Sie auf die drei Punkte `...` (oben rechts) und wählen Sie **Install from VSIX...**.

## Voraussetzungen

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** in der Oracle-Datenbank installiert.
- **VSCode 1.88+** (Test Coverage API).

Die Erweiterung verbindet sich direkt mit der Oracle-Datenbank über `node-oracledb` (Thin-Treiber, kein Instant Client nötig). Die VSIX enthält bereits das `oracledb`-Paket.

## Verbindung

Die Erweiterung benötigt einen Oracle-Verbindungsstring, um Tests auszuführen. Die Auflösung erfolgt in dieser Reihenfolge:

1. **Aktives Verbindungsprofil** — `utplsql.activeProfile`, das auf ein Profil in `utplsql.profiles` verweist (überschreibt alles unten Genannte).
2. **Einstellung `utplsql.connection`** — aus der Projekt-/Benutzer-`settings.json` gelesen.
3. **Umgebungsvariable `UTPLSQL_CONN`** — vor dem Öffnen von VSCode gesetzt.
4. **Sitzungscache** — wenn der Benutzer die Verbindung bereits über die Eingabeaufforderung eingegeben hat.
5. **Eingabeaufforderung an den Benutzer** — fragt nach und behält die Verbindung nur in der aktuellen Sitzung.

Verbindungsprofile (`utplsql.profiles`) können pro Umgebung auch `sourcePath`, `coverageOwner`, usw. überschreiben — siehe `utplsql.activeProfile` in der Konfigurationstabelle.

⚠️ **Sicherheitsempfehlung:** der Verbindungsstring enthält ein Passwort. Verwenden Sie die
Einstellung `utplsql.connection` **NICHT** in gemeinsamen Umgebungen (settings.json kann versioniert
oder für andere sichtbar sein). Verwenden Sie stattdessen **die Umgebungsvariable `UTPLSQL_CONN`**:

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

Wenn weder die Einstellung noch die Umgebungsvariable definiert ist, fragt die Erweiterung nach der
Verbindung und behält sie nur im Speicher während der Sitzung — verwenden Sie den Befehl
**utPLSQL: Clear session connection** (Befehlspalette), um sie zu löschen.

**Akzeptierte Formate:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS-Alias**: `user/pass@tns_alias` (erfordert konfiguriertes `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## So funktioniert es

Die Erweiterung verbindet sich direkt mit der Oracle-Datenbank über `node-oracledb`, streamt Testergebnisse in Echtzeit und übersetzt sie in die nativen APIs von VSCode.

![Oracle-Direktmodus — Streaming](docs/wiki/images/diagram-streaming.png)

Keine temporären Dateien, kein Warten auf die Batch-Ausführung. Ergebnisse erscheinen im
Test Explorer, **sobald jeder Test fertig ist**.

## Konfiguration

| Setting | Default | Beschreibung |
|---|---|---|
| `utplsql.connection` | `""` | Oracle-Verbindung. **Leer lassen** und die Umgebungsvariable `UTPLSQL_CONN` verwenden, um das Speichern des Passworts zu vermeiden. Wenn beide leer sind, fragt die Erweiterung (behält sie nur in der Sitzung). |
| `utplsql.sourcePath` | `install` | Ordner des Produktionscodes (um Coverage Dateien zuzuordnen). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs zum Ermitteln der Specs mit `%suite`/`%test`. Wenn Ihre Tests in `.sql` liegen, verwenden Sie `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Schema-Eigentümer der abgedeckten Objekte. Leer = verwendet den Verbindungsbenutzer (Großschreibung). |
| `utplsql.timeoutMinutes` | `60` | Timeout in Minuten für die Testausführung. |
| `utplsql.dbmsOutput` | `false` | Aktiviert `DBMS_OUTPUT` in der Testsitzung. Nützlich zum Debuggen. |
| `utplsql.additionalReporters` | `[]` | Zusätzliche Reporter, die bei jedem Lauf einbezogen werden (z. B. `["ut_coverage_html_reporter"]`). Die Standard-Reporter (documentation, junit, coverage) werden immer einbezogen und müssen nicht aufgelistet werden. |
| `utplsql.codeLens.enabled` | `true` | Zeigt CodeLens-Schaltflächen zum Ausführen/mit Coverage über `%suite` und `%test`. |
| `utplsql.statusBar.enabled` | `true` | Zeigt den Teststatus in der Statusleiste an. |
| `utplsql.decorations.enabled` | `true` | Zeigt nach der Ausführung Bestanden/Fehlgeschlagen-Dekorationen auf den `%suite`- und `%test`-Zeilen. |
| `utplsql.oraclePoolMin` | `2` | Minimale Verbindungen im Pool des Oracle-Runners (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maximale Verbindungen im Pool des Oracle-Runners (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Schrittweite beim Erweitern des Pools des Oracle-Runners (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Sekunden zwischen den Health-Checks der Verbindungen im Leerlauf (node-oracledb). `0` = Ping bei jedem Checkout. |
| `utplsql.organization` | `file` | Baumorganisation: `file` (nach Pfad) oder `schema` (Schema > Package > Suite > Test). Im `schema`-Modus werden Suiten auch aus der Datenbank (`ALL_OBJECTS`/`ALL_SOURCE`) ermittelt, wenn keine `.pks`-Dateien im Arbeitsbereich liegen — mit virtuellem URI `utplsql-db:/` (kein CodeLens/keine Dekorationen/kein Sprung zum Fehler). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob-Muster zum Extrahieren des Schemas aus dem Pfad. Verwenden Sie `{schema}` als Platzhalter. Im `schema`-Modus definieren die Verzeichnisse unterhalb der Musterbasis (z. B. `db/*`) die in der Datenbank abgefragten Schemas. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Zeigt PL/SQL-Kompilierungsfehler als Unterstreichungen im Editor und im Problembereich an. |
| `utplsql.setupDiagnostics.enabled` | `true` | Zeigt Konfigurationsdiagnosen (Verbindung, Grants, Version) und **Integrität der utPLSQL-Installation** (ungültige Objekte im UT3-Schema, mit „Recompile UT3"-Quick-Fix) mit Quick-Fix-Aktionen. |
| `utplsql.profiles` | `[]` | Gespeicherte Oracle-Verbindungsprofile (Name, Verbindung und Überschreibungen von `sourcePath`/`coverageOwner`/usw.) zum Wechseln zwischen Umgebungen. |
| `utplsql.activeProfile` | `""` | ID des aktiven Profils (`utplsql.profiles`). Wenn gesetzt, überschreibt es `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Verfolgt über `V$SQL` ausgeführte Views (boolesche Coverage). Erfordert `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Aktiviert das Debugging von PL/SQL-Tests (`DBMS_DEBUG`). Erfordert `node-oracledb` + Grants. |
| `utplsql.debugger.stopOnException` | `true` | Hält bei PL/SQL-Ausnahmen während des Debuggens an. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) der Debug-Sitzung. |
| `utplsql.language` | `auto` | Sprache der Laufzeitmeldungen. `auto` folgt VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; sonst en). Deckt die **24 Locales** ab (15 nativ + 9 Community). |

Beispiel (Projekt-`.vscode/settings.json`):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

Und, vor dem Öffnen von VSCode (oder im PowerShell-Profil):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Für Mitwirkende

Erstellen Sie eine `.env`-Datei im Projektstamm (gitignored) mit den Umgebungsvariablen, die von den
Integrationstests verwendet werden:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Verwendung

1. Öffnen Sie das PL/SQL-Projekt (mit den Code- und Testpaketen).
2. Kompilieren Sie Code und Tests in der Datenbank (Oracle-Extension / SQLcl).
3. Öffnen Sie die **Testing**-Ansicht → die Suiten erscheinen.
4. Ausführen:
   - Über **CodeLens** — ▶-Schaltflächen zum Ausführen/mit Coverage über jedem `%suite` und `%test` im Editor.
   - Über den **Einzug** neben jedem Test/jeder Suite, oder
   - Über die **Tastenkürzel** (`Ctrl+Shift+U R` = Alle ausführen, `Ctrl+Shift+U T` = Datei ausführen, usw.), oder
   - die Schaltfläche **Run Tests** der Test-Explorer-Ansicht, oder
   - **Rechtsklick** auf einen Ordner/eine Datei → *utPLSQL: Run tests…* (mit oder ohne Coverage).
5. Nach der Ausführung sehen Sie:
   - **Inline-Dekorationen** (✓/✗/⚠) im Editor neben den Test-Annotationen.
   - **Statusleiste** mit Anzahl bestanden/fehlgeschlagen und Gesamtdauer.
   - **Test Explorer** mit detaillierten Ergebnissen.
6. Verwenden Sie für Coverage das Profil **Run with Coverage** (bzw. den Menüpunkt „mit Coverage").
7. Zum schnellen Wiederholen von Ausführungen:
   - `Ctrl+Shift+U L` — **Rerun Last** (wiederholt die letzte Ausführung, mit oder ohne Coverage).
   - `Ctrl+Shift+U U` — **Run at Cursor** (führt das `%test`/`%suite` unter dem Cursor aus).
   - `Ctrl+Shift+U X` — **Run Failed Only** (führt nur die fehlgeschlagenen Tests aus).
8. Für Diagnosen verwenden Sie `utPLSQL: Show information` in der Palette — zeigt API-/DB-Versionen mit Kopieroption.
9. **utPLSQL: Select additional reporter...** — QuickPick mit den in der Datenbank verfügbaren Reportern.
10. **utPLSQL: Cancel execution** — stoppt die laufende Ausführung (`Escape` während der Ausführung).
11. **utPLSQL: Refresh tests** — erzwingt die erneute Ermittlung der `.pks`.

> 💡 **Beim Schreiben von Tests:** der Parser ist token-gesteuert — es genügen `%suite`
> und die `create package`-Deklaration in der Datei sowie jedes `%test` gefolgt von seiner
> `PROCEDURE`. Es gibt keine Anforderung an Leerzeilen.

### Unterstützte Annotationen (v0.10.0+)

Neben `%suite` und `%test` versteht die Ermittlung:

| Annotation | Auswirkung auf den Test Explorer |
|---|---|
| `-- %disabled` | Suite oder Test **erscheint nicht** im Baum (bei der Ermittlung übersprungen) |
| `-- %throws(-20001)` | Markiert, dass der Test Ausnahme 20001 erwartet (`expectedError`-Metadaten) |
| `-- %tags(fast, critical)` | Test-Tags (Metadaten; Tag-Filterung ist Roadmap) |
| `-- %displayname(Name)` | Angezeigter benutzerdefinierter Name statt der `%test`-Beschreibung |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Markiert die Suite mit Lifecycle-Hooks (Metadaten) |

Annotationen sind case-insensitiv. Im Suite-Header (zwischen `%suite` und dem
ersten `%test`) gelten sie für die Suite; nach `%test` gelten sie für den Test.

## Befehle

Alle Befehle der Erweiterung (Palette `Ctrl+Shift+P`, Präfix `utPLSQL:`):

| Befehl | Beschreibung | UI-Kürzel |
|---|---|---|
| `utPLSQL: Run all tests` | Führt alle Suiten im Arbeitsbereich aus | ▶-Schaltfläche in der Testing-Ansicht |
| `utPLSQL: Run tests in this file` | Führt die Suiten der aktiven `.pks`/`.pkb`-Datei aus | Rechtsklick → Datei |
| `utPLSQL: Run tests in this file with coverage` | Gleich, mit Coverage-Profil | Rechtsklick → Datei |
| `utPLSQL: Run tests in this folder` | Führt die Suiten des ausgewählten Ordners aus | Rechtsklick → Ordner |
| `utPLSQL: Run tests in this folder with coverage` | Gleich, mit Coverage-Profil | Rechtsklick → Ordner |
| `utPLSQL: Refresh tests` | Erzwingt die erneute Ermittlung der `.pks` | — |
| `utPLSQL: Cancel execution` | Stoppt die laufende Ausführung | — |
| `utPLSQL: Show utPLSQL information` | API-/DB-Versionen mit Kopieroption | — |
| `utPLSQL: Select additional reporter...` | QuickPick mit Datenbank-Reportern | — |
| `utPLSQL: Clear session connection` | Entfernt die Verbindung aus dem Sitzungscache | — |
| `utPLSQL: Rerun Last` | Wiederholt die letzte Ausführung | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Führt den Test unter dem Cursor aus | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Führt nur die fehlgeschlagenen Tests erneut aus | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Führt die vollständige Setup-Validierung aus (Verbindung, UT3-Installation) und zeigt die Ergebnisse | — |
| `utPLSQL: Configure connection` | Öffnet die Einstellungen bei `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Kopiert die Coverage-Grants-SQL in die Zwischenablage | — |
| `utPLSQL: Show Test Explorer` | Fokussiert die Testing-Ansicht | — |
| `utPLSQL: Switch connection profile...` | Wechselt das aktive Verbindungsprofil (QuickPick) | Klick auf die Statusleiste (bei aktivem Profil) |
| `utPLSQL: New connection profile...` | Assistent zum Erstellen und Aktivieren eines Profils | — |
| `utPLSQL: Manage connection profiles` | Öffnet die Einstellungen bei `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Importiert Verbindungen aus SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Startet eine Debug-Sitzung des Tests der aktiven Datei | — |

> **Recompile UT3** (`utplsql.recompileUt3`) ist **kein** Palettenbefehl — es ist
> ein interner Quick-Fix der „utPLSQL Setup"-Diagnose (ungültige Objekte im
> utPLSQL-Schema).

## Tastenkürzel

Alle Kürzel verwenden das Präfix `Ctrl+Shift+U` (`Cmd+Shift+U` unter Mac):

| Kürzel | Befehl |
|---|---|
| `Ctrl+Shift+U R` | Alle Tests ausführen |
| `Ctrl+Shift+U T` | Tests in Datei ausführen |
| `Ctrl+Shift+U Shift+T` | Tests in Datei mit Coverage ausführen |
| `Ctrl+Shift+U F` | Tests aktualisieren |
| `Ctrl+Shift+U I` | utPLSQL-Informationen anzeigen |
| `Ctrl+Shift+U C` | Sitzungsverbindung löschen |
| `Ctrl+Shift+U L` | Letzte Ausführung wiederholen |
| `Ctrl+Shift+U U` | Unter dem Cursor ausführen |
| `Ctrl+Shift+U X` | Nur fehlgeschlagene ausführen |
| `Escape` | Ausführung abbrechen |

## Testabdeckung (Coverage)

- **Ausgeführte** Zeilen werden im Einzug grün; **nicht ausgeführte** Zeilen rot.
- Der Tab **Test Coverage** zeigt den **Prozentsatz pro Datei/Ordner**.

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

Die Coverage wird über `ut_file_mapper.build_file_mappings()` gesammelt und über
`ut_coverage_cobertura_reporter` gemeldet. Die Erweiterung ordnet abgedeckte Objekte Quelldateien
automatisch über die Einstellung `utplsql.sourcePath` und das Schema `utplsql.coverageOwner` zu.

## Reporter

Die Erweiterung bindet immer drei Standard-Reporter ein:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (Ergebnisse → Test Explorer) und
`ut_coverage_cobertura_reporter` (Coverage, falls verfügbar).

**Dynamische Validierung** — vor der Ausführung mit Coverage fragt die Erweiterung
die Datenbank über `ALL_OBJECTS` ab, um zu überprüfen, ob `UT_COVERAGE_COBERTURA_REPORTER`
existiert. Wenn nicht (z. B. veraltetes
utPLSQL), wird Coverage mit einer Warnung im Output übersprungen. Die Testausführung
wird nie blockiert.

**Zusätzliche feste Reporter** — Einstellung `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Die drei Standard-Reporter werden automatisch dedupliziert, auch wenn sie
hier aufgelistet sind.

**Flüchtiger Reporter pro Sitzung** — der Befehl **utPLSQL: Select additional
reporter...** öffnet einen QuickPick mit der dynamischen Liste aus der Datenbank. Der
gewählte Reporter wird bei der nächsten Ausführung verwendet und danach verworfen (wird
nicht in den Einstellungen gespeichert).

## Datenbank-Anforderungen

**Coverage** (immer) — aktiviert den Profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Ohne dies laufen die Tests, aber die Coverage bleibt **leer**.

**Testermittlung in ANDEREN Schemas** (utPLSQL-**Shared**-Installation, z. B. Eigentümer `UT3`):
damit das Framework die Tests der Anwendungsschemas sieht und parst, muss der utPLSQL-Eigentümer
das **Datenbankwörterbuch** dieser Schemas **lesen** können:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **Allein `SELECT ANY DICTIONARY` reicht NICHT** — es braucht die **direkten** Grants auf diesen Views
  (wegen `dbms_assert.sql_object_name` im Definer-Kontext).
- Der utPLSQL-**DDL-Trigger** muss ebenfalls installiert sein (hält den Annotationen-Cache aktuell).
- Überprüfung (als Eigentümer): `SELECT ut_metadata.get_source_view_name FROM dual;` sollte `dba_source` zurückgeben.

> Bei **Per-Schema**-Installationen (utPLSQL im selben Schema wie die Tests) sind diese
> schema-übergreifenden Grants **nicht** erforderlich — das Framework liest seine eigene Quelle.

## Bekannte Einschränkungen

- Die Zuordnung Ergebnis→Test erfolgt über Paketname + Testname/-beschreibung;
  identische Beschreibungen in verschiedenen Paketen können zu Mehrdeutigkeiten führen (der Index ist
  auf das Paket begrenzt, um dies zu minimieren).
- Berücksichtigt den **ersten** Arbeitsbereichsordner zur Auflösung von `sourcePath`.
- Die Ermittlung liest die `.pks` (Specs); bewahren Sie die `%suite`/`%test`-Annotationen in der Spec auf.

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| Suiten erscheinen nicht | Verbindungsproblem | Führen Sie `utPLSQL: Validate configuration` für Diagnosen aus |
| Leere Coverage | Fehlendes `GRANT EXECUTE ON DBMS_PROFILER` | Führen Sie die Grants unter [Datenbank-Anforderungen](#datenbank-anforderungen) aus oder verwenden Sie `utPLSQL: Copy coverage grants to clipboard` |
| Leere Coverage | Oracle 19c erfordert zusätzliche Grants | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Kompilierungsfehler ohne Angabe | Code mit PL/SQL-Syntaxfehler | Aktivieren Sie `utplsql.compilationDiagnostics.enabled` (Standard: an); siehe Problembereich |
| Verbindungsfehler | Fehlerhafter String oder nicht erreichbare DB | Verwenden Sie `utPLSQL: Validate configuration` |
| Timeout während der Ausführung | Tests dauern länger als `timeoutMinutes` | Erhöhen Sie `utplsql.timeoutMinutes` |
| `%suite` nicht erkannt | Fehlendes `%suite`/`create package` in der Datei, oder `%test` ohne `PROCEDURE` | Prüfen Sie die Spec; führen Sie `utPLSQL: Refresh tests` aus |
| CodeLens erscheint nicht | `editor.codeLens` deaktiviert oder Konflikt | Aktivieren Sie `"editor.codeLens": true`; prüfen Sie `utplsql.codeLens.enabled` |
| Kürzel funktionieren nicht | Konflikt mit einer anderen Erweiterung oder VSCode-Verknüpfung | Gehen Sie zu Datei → Einstellungen → Tastenkürzel und suchen Sie nach `utplsql`, um neu zu belegen |

## Lizenz

MIT © Gil Cleber Barboza
