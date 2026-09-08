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
- 🔧 **Setup-Diagnose** — proaktive Validierung von CLI, Verbindung, Grants und Version mit Quick-Fix.
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
- **Für den CLI-Modus:** [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java** auf dem Rechner installiert (die Erweiterung ruft die CLI auf).
- **Für den Oracle-Direktmodus:** nur die Datenbank — die VSIX enthält bereits den Thin-`oracledb`-Treiber (kein Instant Client nötig).
- **VSCode 1.88+** (Test Coverage API).

Die Erweiterung ist nur der „grafische Client" — die Tests führt die Datenbank aus: über die CLI
(utPLSQL-cli + Java) oder direkt (node-oracledb, standardmäßig `runnerMode: auto`).

## Verbindung

Die Erweiterung benötigt einen Oracle-Verbindungsstring, um Tests auszuführen. Die Auflösung erfolgt in dieser Reihenfolge:

1. **Aktives Verbindungsprofil** — `utplsql.activeProfile`, das auf ein Profil in `utplsql.profiles` verweist (überschreibt alles unten Genannte).
2. **Einstellung `utplsql.connection`** — aus der Projekt-/Benutzer-`settings.json` gelesen.
3. **Umgebungsvariable `UTPLSQL_CONN`** — vor dem Öffnen von VSCode gesetzt.
4. **Sitzungscache** — wenn der Benutzer die Verbindung bereits über die Eingabeaufforderung eingegeben hat.
5. **Eingabeaufforderung an den Benutzer** — fragt nach und behält die Verbindung nur in der aktuellen Sitzung.

Verbindungsprofile (`utplsql.profiles`) können pro Umgebung auch `sourcePath`, `coverageOwner`, `invocation`, `cliPath` usw. überschreiben — siehe `utplsql.activeProfile` in der Konfigurationstabelle.

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

Es stehen zwei Ausführungsmodi zur Verfügung:

![Ausführungsarchitektur — zwei Modi](docs/wiki/images/diagram-arquitetura.png)

### Oracle-Direktmodus (v0.9.0) — `runnerMode: auto` oder `oracle`

![Oracle-Direktmodus — Streaming](docs/wiki/images/diagram-streaming.png)

Keine temporären Dateien, kein Warten auf die Batch-Ausführung. Ergebnisse erscheinen im
Test Explorer, **sobald jeder Test fertig ist**.

### CLI-Modus — `runnerMode: cli` (Fallback)

![CLI-Modus — Batch](docs/wiki/images/diagram-cli.png)

Die Erweiterung baut die CLI-Befehlszeile auf oder verbindet sich über Oracle direkt, liest die
Berichte (JUnit + Coverage) und übersetzt sie in die nativen APIs von VSCode. Der Modus `auto`
(Standard) versucht Oracle-Direkt und fällt auf CLI zurück, wenn `node-oracledb` nicht installiert
ist. Verwenden Sie `runnerMode: cli`, um immer CLI zu erzwingen.

## Konfiguration

| Setting | Default | Beschreibung |
|---|---|---|
| `utplsql.connection` | `""` | Oracle-Verbindung. **Leer lassen** und die Umgebungsvariable `UTPLSQL_CONN` verwenden, um das Speichern des Passworts zu vermeiden. Wenn beide leer sind, fragt die Erweiterung (behält sie nur in der Sitzung). |
| `utplsql.cliPath` | `utplsql` | Pfad zur ausführbaren utPLSQL-cli-Datei (z. B. `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Ordner des Produktionscodes (um Coverage Dateien zuzuordnen). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs zum Ermitteln der Specs mit `%suite`/`%test`. Wenn Ihre Tests in `.sql` liegen, verwenden Sie `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Zusätzliche Argumente für `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Schema-Eigentümer der abgedeckten Objekte. Leer = verwendet den Verbindungsbenutzer (Großschreibung). |
| `utplsql.coverageSourceArgs` | (siehe **Coverage**) | CLI-Argumente, die Coverage Quelldateien zuordnen. |
| `utplsql.invocation` | `launcher` | Wie die CLI aufgerufen wird: `launcher` (über `.bat`/Skript, Standard) oder `java` (direkte JVM, **ohne Shell**). Siehe **Aufrufmodus**. |
| `utplsql.javaPath` | `java` | Java-Ausführbare (PATH oder vollständiger Pfad). Nur im `java`-Modus verwendet. |
| `utplsql.cliHome` | `""` | Wurzel von utPLSQL-cli (Ordner mit `bin/` und `lib/`). Leer = wird aus `cliPath` abgeleitet. Nur im `java`-Modus verwendet. |
| `utplsql.timeoutMinutes` | `60` | Timeout in Minuten für die CLI. Das Flag `-t` wird nur gesendet, wenn sich der Wert von `60` unterscheidet. |
| `utplsql.dbmsOutput` | `false` | Aktiviert `DBMS_OUTPUT` in der Testsitzung. Das Flag `-D` wird nur gesendet, wenn `true`. |
| `utplsql.quiet` | `false` | Unterdrückt informative CLI-Protokolle. Das Flag `-q` wird nur gesendet, wenn `true`. |
| `utplsql.failureExitCode` | `1` | Exit-Code bei Fehler. Das Flag `--failure-exit-code` wird nur gesendet, wenn sich der Wert von `1` unterscheidet. `0` lässt die CLI immer erfolgreich beenden. |
| `utplsql.additionalReporters` | `[]` | Zusätzliche Reporter, die bei jedem Lauf einbezogen werden (z. B. `["ut_coverage_html_reporter"]`). Die Standard-Reporter (documentation, junit, coverage) werden immer einbezogen und müssen nicht aufgelistet werden. |
| `utplsql.codeLens.enabled` | `true` | Zeigt CodeLens-Schaltflächen zum Ausführen/mit Coverage über `%suite` und `%test`. |
| `utplsql.statusBar.enabled` | `true` | Zeigt den Teststatus in der Statusleiste an. |
| `utplsql.decorations.enabled` | `true` | Zeigt nach der Ausführung Bestanden/Fehlgeschlagen-Dekorationen auf den `%suite`- und `%test`-Zeilen. |
| `utplsql.runnerMode` | `auto` | Ausführungsmodus: `auto` (Oracle-Direkt über node-oracledb, CLI-Fallback), `cli` (immer über die Befehlszeile), `oracle` (immer Oracle-Direkt). |
| `utplsql.oraclePoolMin` | `2` | Minimale Verbindungen im Pool des Oracle-Runners (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maximale Verbindungen im Pool des Oracle-Runners (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Schrittweite beim Erweitern des Pools des Oracle-Runners (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Sekunden zwischen den Health-Checks der Verbindungen im Leerlauf (node-oracledb). `0` = Ping bei jedem Checkout. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | JVM-Flags für den `java`-Modus (z. B. `["-Xmx512m", "-Xms128m"]`). Werden vor `-cp` eingefügt. |
| `utplsql.organization` | `file` | Baumorganisation: `file` (nach Pfad) oder `schema` (Schema > Package > Suite > Test). Im `schema`-Modus mit Oracle-`runnerMode` (`auto`/`oracle`) werden Suiten auch aus der Datenbank (`ALL_OBJECTS`/`ALL_SOURCE`) ermittelt, wenn keine `.pks`-Dateien im Arbeitsbereich liegen — mit virtuellem URI `utplsql-db:/` (kein CodeLens/keine Dekorationen/kein Sprung zum Fehler). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob-Muster zum Extrahieren des Schemas aus dem Pfad. Verwenden Sie `{schema}` als Platzhalter. Im `schema`-Modus definieren die Verzeichnisse unterhalb der Musterbasis (z. B. `db/*`) die in der Datenbank abgefragten Schemas. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Zeigt PL/SQL-Kompilierungsfehler als Unterstreichungen im Editor und im Problembereich an (CLI-Modus). |
| `utplsql.setupDiagnostics.enabled` | `true` | Zeigt Konfigurationsdiagnosen (CLI, Verbindung, Grants, Version) und **Integrität der utPLSQL-Installation** (ungültige Objekte im UT3-Schema, mit „Recompile UT3"-Quick-Fix) mit Quick-Fix-Aktionen. |
| `utplsql.profiles` | `[]` | Gespeicherte Oracle-Verbindungsprofile (Name, Verbindung und Überschreibungen von `sourcePath`/`coverageOwner`/`invocation`/`cliPath`/usw.) zum Wechseln zwischen Umgebungen. |
| `utplsql.activeProfile` | `""` | ID des aktiven Profils (`utplsql.profiles`). Wenn gesetzt, überschreibt es `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Verfolgt über `V$SQL` ausgeführte Views (boolesche Coverage). Erfordert `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Aktiviert das Debugging von PL/SQL-Tests (`DBMS_DEBUG`). Erfordert `node-oracledb` + Grants. |
| `utplsql.debugger.stopOnException` | `true` | Hält bei PL/SQL-Ausnahmen während des Debuggens an. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) der Debug-Sitzung. |
| `utplsql.language` | `auto` | Sprache der Laufzeitmeldungen. `auto` folgt VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; sonst en). Deckt die **24 Locales** ab (15 nativ + 9 Community). |

Beispiel (Projekt-`.vscode/settings.json`):

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
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
UTPLSQL_CLI_PATH=/path/to/utplsql
UTPLSQL_CLI_HOME=/path/to/utplsql-cli
```

### Aufrufmodus (`launcher` vs `java`)

Standardmäßig (`utplsql.invocation = "launcher"`) ruft die Erweiterung den
`utplsql`/`utplsql.bat`-Launcher auf. Unter Windows läuft das über `cmd`, das
**Metazeichen konsumiert/interpretiert** (`^` wird zum Escape-Zeichen, `|` zur Pipe) — was
Regex in `coverageSourceArgs` zerstört.

Der `java`-Modus ruft die JVM **direkt** auf (`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`), **ohne Shell**. Argumente werden dem Prozess als Array übergeben,
ohne `cmd` dazwischen, sodass `^` und `|` **wörtlich** durchgereicht werden — Sie können `^anchors$` und
`(a|b|c)` im Regex ohne Workarounds verwenden.

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome is derived from here
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // only if cliPath is a PATH command
  // "utplsql.javaPath": "java"                     // PATH, or full path to java.exe
}
```

> Der `java`-Modus repliziert getreu, was das `.bat` tut (gleicher Classpath und gleiche
> `-D`-Eigenschaften); der einzige Unterschied ist, dass kein `cmd` dazwischengeschaltet ist. Erfordert
> `java` im PATH (oder in `utplsql.javaPath`) und dass die CLI-Wurzel auflösbar ist — entweder über
> `cliPath`, das auf `…/bin/utplsql(.bat)` zeigt, oder durch Setzen von `cliHome`.

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
8. **Für Oracle-Direkt (Streaming):** nichts zu installieren — die VSIX enthält bereits den Thin-`oracledb`-Treiber. Der `auto`-Modus fällt auf CLI zurück, wenn Oracle nicht erreichbar ist.
9. Für Diagnosen verwenden Sie `utPLSQL: Show information` in der Palette — zeigt CLI-/API-/DB-Versionen mit Kopieroption.
10. **utPLSQL: Select additional reporter...** — QuickPick mit den in der Datenbank verfügbaren Reportern.
11. **utPLSQL: Cancel execution** — stoppt die laufende Ausführung (`Escape` während der Ausführung).
12. **utPLSQL: Refresh tests** — erzwingt die erneute Ermittlung der `.pks`.

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
| `utPLSQL: Cancel execution` | Stoppt die laufende CLI | — |
| `utPLSQL: Show utPLSQL information` | CLI-/API-/DB-Versionen mit Kopieroption | — |
| `utPLSQL: Select additional reporter...` | QuickPick mit Datenbank-Reportern | — |
| `utPLSQL: Clear session connection` | Entfernt die Verbindung aus dem Sitzungscache | — |
| `utPLSQL: Rerun Last` | Wiederholt die letzte Ausführung | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Führt den Test unter dem Cursor aus | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Führt nur die fehlgeschlagenen Tests erneut aus | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Führt die vollständige Setup-Validierung aus (CLI, Java, Verbindung, UT3-Installation) und zeigt die Ergebnisse | — |
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

Die Erweiterung übergibt `-source_path` (= `utplsql.sourcePath`) und ordnet die abgedeckten Objekte
über `utplsql.coverageSourceArgs` (Regex + `type_mapping`) Quelldateien zu. Der `-owner`
wird aus der Verbindung (oder aus `utplsql.coverageOwner`) abgeleitet.

### Coverage Dateien zuordnen (`coverageSourceArgs`)

Das `type_mapping` übersetzt den „Typ", den der Regex erfasst, in den Oracle-Typ. Drei gängige Konventionen:

**1) Nach Verzeichnis** — Struktur `sourcePath/<type>/<name>.sql` (Ordner `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Funktioniert in jeder Tiefe (das `.*` absorbiert die darüberliegenden Module). Unterschiedliche
> Ordnernamen (z. B. `package`, `pkg`, `pacote`) können im `type_mapping` aufgezählt werden.

**2) Nach Namenspräfix** — Konvention `pkg_*`, `prc_*`, `vw_*` (unabhängig vom Ordner):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Nach typisierter Dateiendung** — Dateien `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (unabhängig vom Ordner):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Wichtige Hinweise:**
- **Packages → `PACKAGE BODY`** (nicht `PACKAGE`): Coverage wird im Package-**Body** gesammelt.
- **Windows / Regex-Metazeichen:** im `launcher`-Modus (Standard) läuft das `.bat` durch `cmd`,
  das `^` **verschluckt** und `|` **als Pipe interpretiert** — deshalb verwenden die obigen Beispiele `\w` und
  `[/\\]` (ohne `^`), und das `|` in Beispiel 2 funktioniert nur innerhalb der Erweiterung. **Lösung:** verwenden Sie **`utplsql.invocation = "java"`** (siehe
  [Aufrufmodus](#aufrufmodus-launcher-vs-java)) — ohne dazwischengeschaltetes `cmd` werden `^` und `|` unverändert
  durchgereicht, und Sie können den Regex normal schreiben.
- **Windows / `cmd`:** vermeiden Sie **`^`** im Regex (das `cmd` des `.bat` verschluckt es) — deshalb verwenden die Beispiele
  `\w` und `[/\\]`.

## Reporter

Die Erweiterung bindet immer drei Standard-Reporter ein:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (Ergebnisse → Test Explorer) und
`ut_coverage_cobertura_reporter` (Coverage, falls verfügbar).

**Dynamische Validierung** — vor der Ausführung mit Coverage fragt die Erweiterung
die Datenbank über `utplsql reporters <conn>` ab. Wenn
`UT_COVERAGE_COBERTURA_REPORTER` in der Datenbank nicht existiert (z. B. veraltetes
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
| Suiten erscheinen nicht | CLI nicht gefunden | Führen Sie `utPLSQL: Validate configuration` für Diagnosen aus |
| Leere Coverage | Fehlendes `GRANT EXECUTE ON DBMS_PROFILER` | Führen Sie die Grants unter [Datenbank-Anforderungen](#datenbank-anforderungen) aus oder verwenden Sie `utPLSQL: Copy coverage grants to clipboard` |
| Leere Coverage | Oracle 19c erfordert zusätzliche Grants | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Langsame Leistung | Große Suiten erfordern mehr JVM-Heap | Erhöhen Sie `utplsql.javaArgs` (z. B. `["-Xmx1024m"]`) |
| Kompilierungsfehler ohne Angabe | Code mit PL/SQL-Syntaxfehler | Aktivieren Sie `utplsql.compilationDiagnostics.enabled` (Standard: an); siehe Problembereich |
| Verbindungsfehler | Fehlerhafter String oder nicht erreichbare DB | Verwenden Sie `utPLSQL: Validate configuration` |
| Timeout während der Ausführung | Tests dauern länger als `timeoutMinutes` | Erhöhen Sie `utplsql.timeoutMinutes` |
| Coverage-Regex matcht nicht | Windows-`cmd` verschluckt `^` und `\|` | Verwenden Sie `utplsql.invocation: "java"` (siehe [Aufrufmodus](#aufrufmodus-launcher-vs-java)) |
| `%suite` nicht erkannt | Fehlendes `%suite`/`create package` in der Datei, oder `%test` ohne `PROCEDURE` | Prüfen Sie die Spec; führen Sie `utPLSQL: Refresh tests` aus |
| „report not generated" | Die CLI konnte das Ausgabe-XML nicht erzeugen | Prüfen Sie die Schreibrechte in `%TEMP%` und die utPLSQL-Grants |
| CodeLens erscheint nicht | `editor.codeLens` deaktiviert oder Konflikt | Aktivieren Sie `"editor.codeLens": true`; prüfen Sie `utplsql.codeLens.enabled` |
| Kürzel funktionieren nicht | Konflikt mit einer anderen Erweiterung oder VSCode-Verknüpfung | Gehen Sie zu Datei → Einstellungen → Tastenkürzel und suchen Sie nach `utplsql`, um neu zu belegen |

## Lizenz

MIT © Gil Cleber Barboza
