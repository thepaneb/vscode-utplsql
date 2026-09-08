<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Italiano** · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

Integra [utPLSQL](https://www.utplsql.org/) in VSCode, portando i test PL/SQL nel **Test Explorer** nativo, con menu contestuale e copertura visiva.

- 🧪 **Test Explorer nativo** — suite e test appaiono nella vista di test; esegui per test, suite, file o cartella.
- 🔍 **CodeLens** — pulsanti Run/Run with Coverage sopra `%suite` e `%test` nell'editor, senza lasciare il codice.
- ⌨️ **Scorciatoie da tastiera** — prefisso `Ctrl+Shift+U` + tasto per i comandi principali (R = Run All, T = Run File, L = Rerun Last, ecc.).
- 🖱️ **Menu contestuale** — clic destro su una **cartella** o su un file **`.pks`/`.pkb`** (nell'Esplora file o nell'editor) per eseguire i test.
- 📊 **Copertura visiva** — margini colorati per riga (coperto/non coperto) e percentuale per file nella scheda **Coverage**.
- ✅ **Decorazioni inline** — icone ✓/✗/⚠ nell'editor dopo l'esecuzione, con tooltip di errore e righello di panoramica.
- 📌 **Barra di stato** — indicatore con conteggio superati/falliti, durata e avanzamento in tempo reale.
- 🔁 **Re-esecuzione intelligente** — Rerun Last, Run at Cursor, Run Failed Only con una singola scorciatoia.
- 🚀 **Oracle diretto (via node-oracledb)** — streaming in tempo reale, senza attendere la fine del batch.
- 🔧 **Diagnostica di setup** — validazione proattiva di CLI, connessione, grants e versione con quick-fix.
- 🧩 **Albero basato su schema** — organizza i test per Schema > Package > Suite > Test nel Test Explorer.
- 🎯 **Vai all'errore** — navigazione diretta alla riga dell'asserzione fallita (tramite il nativo "Go to Error").
- 🔌 **Profili di connessione** — salva e passa da un ambiente all'altro (DEV/TEST/PROD) con impostazioni per profilo, tramite barra di stato o palette comandi.
- 📈 **Copertura di statement e viste** — la scheda Coverage mostra `% di statement` (PROCEDURE/FUNCTION) per file e tiene traccia delle viste eseguite tramite `V$SQL`.
- 🐛 **Debug PL/SQL** — breakpoint e debug passo-passo dei test utPLSQL tramite `DBMS_DEBUG` (Debug Adapter nativo).
- 🌍 **i18n — 24 lingue** — `utplsql.language` segue VSCode (15 native + 9 community: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Installazione

L'estensione può essere installata in due modi:

1. **Dal Marketplace:** cerca **utPLSQL Test Runner** nel pannello delle estensioni di VSCode (`Ctrl+Shift+X`) e clicca **Install**.
2. **Manualmente (.vsix):** scarica il file `.vsix` della versione desiderata e installalo in VSCode:
   * **Tramite riga di comando:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Tramite interfaccia:** apri il pannello Estensioni (`Ctrl+Shift+X`), clicca i tre puntini `...` (in alto a destra) e seleziona **Install from VSIX...**.

## Requisiti

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** installato nel database Oracle.
- **Per la modalità CLI:** [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java** installati sulla macchina (l'estensione invoca la CLI).
- **Per la modalità Oracle diretta:** solo il database — il VSIX include già il driver thin `oracledb` (nessun Instant Client).
- **VSCode 1.88+** (Test Coverage API).

L'estensione è solo il "client grafico" — chi esegue i test è il database: tramite
CLI (utPLSQL-cli + Java) o direttamente (node-oracledb, `runnerMode: auto` di default).

## Connessione

L'estensione necessita di una stringa di connessione Oracle per eseguire i test. La risoluzione segue questo ordine:

1. **Profilo di connessione attivo** — `utplsql.activeProfile` che punta a un profilo in `utplsql.profiles` (ha priorità su tutto il resto).
2. **Impostazione `utplsql.connection`** — letta dal `settings.json` del progetto/utente.
3. **Variabile d'ambiente `UTPLSQL_CONN`** — impostata prima di aprire VSCode.
4. **Cache di sessione** — se l'utente ha già digitato la connessione tramite prompt.
5. **Prompt all'utente** — chiede e la mantiene solo nella sessione corrente.

I profili di connessione (`utplsql.profiles`) possono anche sovrascrivere `sourcePath`, `coverageOwner`, `invocation`, `cliPath`, ecc. per ambiente — vedi `utplsql.activeProfile` nella tabella di configurazione.

⚠️ **Raccomandazione di sicurezza:** la stringa di connessione contiene una password. **NON** usare
l'impostazione `utplsql.connection` in ambienti condivisi (il settings.json può essere versionato o visibile
ad altri). Invece, **usa la variabile d'ambiente `UTPLSQL_CONN`**:

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

Se né l'impostazione né la variabile d'ambiente sono definite, l'estensione chiede la connessione e
la mantiene solo in memoria durante la sessione — usa il comando
**utPLSQL: Clear session connection** (palette comandi) per cancellarla.

**Formati accettati:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **Alias TNS**: `user/pass@tns_alias` (richiede `TNS_ADMIN` configurato)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Come funziona

Sono disponibili due modalità di esecuzione:

![Architettura di esecuzione — due modalità](docs/wiki/images/diagram-arquitetura.png)

### Modalità Oracle diretta (v0.9.0) — `runnerMode: auto` o `oracle`

![Modalità Oracle diretta — streaming](docs/wiki/images/diagram-streaming.png)

Nessun file temporaneo, nessuna attesa per il batch. I risultati appaiono nel
Test Explorer **appena ogni test termina**.

### Modalità CLI — `runnerMode: cli` (fallback)

![Modalità CLI — batch](docs/wiki/images/diagram-cli.png)

L'estensione costruisce la riga di comando CLI o si connette tramite Oracle diretto, legge i
report (JUnit + Coverage) e li traduce nelle API native di VSCode. La
modalità `auto` (default) prova Oracle diretto e ricade sulla CLI se `node-oracledb` non è
installato. Usa `runnerMode: cli` per forzare sempre la CLI.

## Configurazione

| Impostazione | Default | Descrizione |
|---|---|---|
| `utplsql.connection` | `""` | Connessione Oracle. **Lascia vuota** e usa la variabile d'ambiente `UTPLSQL_CONN` per evitare di memorizzare la password. Se entrambe sono vuote, l'estensione chiede (la mantiene solo nella sessione). |
| `utplsql.cliPath` | `utplsql` | Percorso all'eseguibile utPLSQL-cli (es. `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Cartella del codice di produzione (per mappare la copertura ai file). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Glob per scoprire le spec con `%suite`/`%test`. Se i tuoi test sono in `.sql`, usa `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Argomenti extra per `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Proprietario dello schema degli oggetti coperti. Vuoto = usa l'utente della connessione (maiuscolo). |
| `utplsql.coverageSourceArgs` | (vedi **Coverage**) | Argomenti CLI che mappano la copertura ai file sorgente. |
| `utplsql.invocation` | `launcher` | Come chiamare la CLI: `launcher` (via `.bat`/script, default) o `java` (JVM diretta, **senza shell**). Vedi **Modalità di invocazione**. |
| `utplsql.javaPath` | `java` | Eseguibile Java (PATH o percorso completo). Usato solo in modalità `java`. |
| `utplsql.cliHome` | `""` | Root di utPLSQL-cli (cartella con `bin/` e `lib/`). Vuoto = derivato da `cliPath`. Usato solo in modalità `java`. |
| `utplsql.timeoutMinutes` | `60` | Timeout in minuti per la CLI. Il flag `-t` viene inviato solo se il valore differisce da `60`. |
| `utplsql.dbmsOutput` | `false` | Abilita `DBMS_OUTPUT` nella sessione di test. Il flag `-D` viene inviato solo quando è `true`. |
| `utplsql.quiet` | `false` | Sopprime i log informativi della CLI. Il flag `-q` viene inviato solo quando è `true`. |
| `utplsql.failureExitCode` | `1` | Codice di uscita in caso di errore. Il flag `--failure-exit-code` viene inviato solo se il valore differisce da `1`. `0` fa uscire sempre con successo la CLI. |
| `utplsql.additionalReporters` | `[]` | Reporter aggiuntivi da includere in ogni esecuzione (es. `["ut_coverage_html_reporter"]`). I default (documentation, junit, coverage) sono sempre inclusi e non devono essere elencati. |
| `utplsql.codeLens.enabled` | `true` | Mostra i pulsanti CodeLens Run/Run with Coverage sopra `%suite` e `%test`. |
| `utplsql.statusBar.enabled` | `true` | Mostra l'indicatore dello stato dei test nella barra di stato. |
| `utplsql.decorations.enabled` | `true` | Mostra le decorazioni superato/fallito sulle righe `%suite` e `%test` dopo l'esecuzione. |
| `utplsql.runnerMode` | `auto` | Modalità di esecuzione: `auto` (Oracle diretto via node-oracledb, fallback CLI), `cli` (sempre tramite riga di comando), `oracle` (sempre Oracle diretto). |
| `utplsql.oraclePoolMin` | `2` | Connessioni minime mantenute nel pool del runner Oracle (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Connessioni massime nel pool del runner Oracle (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Incremento quando si espande il pool del runner Oracle (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Secondi tra i controlli di salute delle connessioni idle del pool (node-oracledb). `0` = ping a ogni checkout. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | Flag JVM per la modalità `java` (es. `["-Xmx512m", "-Xms128m"]`). Inseriti prima di `-cp`. |
| `utplsql.organization` | `file` | Organizzazione dell'albero: `file` (per percorso) o `schema` (Schema > Package > Suite > Test). In modalità `schema` con `runnerMode` Oracle (`auto`/`oracle`), le suite vengono scoperte anche dal database (`ALL_OBJECTS`/`ALL_SOURCE`) quando i file `.pks` non sono nel workspace — con URI virtuale `utplsql-db:/` (niente CodeLens/decorazioni/vai all'errore). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Pattern Glob per estrarre lo schema dal percorso. Usa `{schema}` come segnaposto. In modalità `schema`, le directory sotto la base del pattern (es. `db/*`) definiscono gli schemi interrogati nel database. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Mostra gli errori di compilazione PL/SQL come sottolineature nell'editor e nel Pannello Problemi (modalità CLI). |
| `utplsql.setupDiagnostics.enabled` | `true` | Mostra i diagnostici di configurazione (CLI, connessione, grants, versione) e **l'integrità dell'installazione di utPLSQL** (oggetti non validi nello schema UT3, con quick-fix "Recompile UT3") con azioni di quick-fix. |
| `utplsql.profiles` | `[]` | Profili di connessione Oracle salvati (nome, connessione e override di `sourcePath`/`coverageOwner`/`invocation`/`cliPath`/ecc.) per passare da un ambiente all'altro. |
| `utplsql.activeProfile` | `""` | ID del profilo attivo (`utplsql.profiles`). Quando impostato, sovrascrive `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Tiene traccia delle viste eseguite tramite `V$SQL` (copertura booleana). Richiede `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Abilita il debug dei test PL/SQL (`DBMS_DEBUG`). Richiede `node-oracledb` + grants. |
| `utplsql.debugger.stopOnException` | `true` | Si ferma sulle eccezioni PL/SQL durante il debug. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) della sessione di debug. |
| `utplsql.language` | `auto` | Lingua dei messaggi di runtime. `auto` segue VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; altrimenti en). Copre le **24 lingue** (15 native + 9 community). |

Esempio (`settings.json` del progetto):

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  // utplsql.connection resta vuota -> usa la variabile d'ambiente UTPLSQL_CONN
}
```

E, prima di aprire VSCode (o nel profilo PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Per i contributori

Crea un file `.env` nella root del progetto (gitignored) con le variabili
d'ambiente usate dai test di integrazione:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
UTPLSQL_CLI_PATH=/path/to/utplsql
UTPLSQL_CLI_HOME=/path/to/utplsql-cli
```

### Modalità di invocazione (`launcher` vs `java`)

Di default (`utplsql.invocation = "launcher"`) l'estensione chiama il
launcher `utplsql`/`utplsql.bat`. Su Windows questo passa attraverso `cmd`, che
**consuma/interpreta i metacaratteri** (`^` diventa escape, `|` diventa pipe) — il che
rompe le regex in `coverageSourceArgs`.

La modalità `java` chiama la JVM **direttamente** (`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`), **senza shell**. Gli argomenti arrivano al processo come array,
senza `cmd` in mezzo, quindi `^` e `|` passano **letteralmente** — puoi usare `^ancore$` e
`(a|b|c)` nella regex senza workaround.

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome è derivato da qui
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // solo se cliPath è un comando PATH
  // "utplsql.javaPath": "java"                     // PATH, o percorso completo di java.exe
}
```

> La modalità `java` replica fedelmente ciò che fa il `.bat` (stesso classpath e stesse
> proprietà `-D`); l'unica differenza è non passare attraverso `cmd`. Richiede `java` nel PATH
> (o in `utplsql.javaPath`) e che la root della CLI sia risolvibile — tramite `cliPath`
> che punta a `…/bin/utplsql(.bat)`, oppure impostando `cliHome`.

## Utilizzo

1. Apri il progetto PL/SQL (con i package di codice e test).
2. Compila codice e test nel database (estensione Oracle / SQLcl).
3. Apri la vista **Testing** → le suite appaiono.
4. Esegui:
   - Tramite **CodeLens** — pulsanti ▶ Run/Run with Coverage sopra ogni `%suite` e `%test` nell'editor.
   - Tramite il **margine** accanto a ogni test/suite, oppure
   - Tramite le **scorciatoie da tastiera** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, ecc.), oppure
   - Il pulsante **Run Tests** della vista Test Explorer, oppure
   - **Clic destro** su una cartella/file → *utPLSQL: Run tests…* (con o senza copertura).
5. Dopo l'esecuzione, vedi:
   - **Decorazioni inline** (✓/✗/⚠) nell'editor accanto alle annotazioni di test.
   - **Barra di stato** con conteggio superati/falliti e durata totale.
   - **Test Explorer** con risultati dettagliati.
6. Per la copertura, usa il profilo **Run with Coverage** (o la voce di menu "with coverage").
7. Per ripetere rapidamente le esecuzioni:
   - `Ctrl+Shift+U L` — **Rerun Last** (ripete l'ultima esecuzione, con o senza copertura).
   - `Ctrl+Shift+U U` — **Run at Cursor** (esegue il `%test`/`%suite` sotto il cursore).
   - `Ctrl+Shift+U X` — **Run Failed Only** (esegue solo i test falliti).
8. **Per Oracle diretto (streaming):** nulla da installare — il VSIX include già il driver thin `oracledb`. La modalità `auto` ricade sulla CLI se Oracle non è accessibile.
9. Per i diagnostici, usa `utPLSQL: Show information` nella palette — mostra le versioni CLI/API/DB con opzione di copia.
10. **utPLSQL: Select additional reporter...** — QuickPick con i reporter disponibili nel database.
11. **utPLSQL: Cancel execution** — ferma l'esecuzione in corso (`Escape` durante l'esecuzione).
12. **utPLSQL: Refresh tests** — forza la riscoperta dei `.pks`.

> 💡 **Quando scrivi i test:** il parser è guidato dai token — basta avere `%suite`
> e la dichiarazione `create package` nel file, e ogni `%test` seguito dalla sua
> `PROCEDURE`. Non c'è alcun requisito di righe vuote.

### Annotazioni supportate (v0.10.0+)

Oltre a `%suite` e `%test`, la scoperta comprende:

| Annotazione | Effetto sul Test Explorer |
|---|---|
| `-- %disabled` | Suite o test **non appare** nell'albero (saltato nella scoperta) |
| `-- %throws(-20001)` | Segna che il test si aspetta l'eccezione 20001 (metadati `expectedError`) |
| `-- %tags(fast, critical)` | Tag del test (metadati; il filtraggio per tag è nella roadmap) |
| `-- %displayname(Name)` | Nome personalizzato mostrato al posto della descrizione del `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Segna la suite con hook di ciclo di vita (metadati) |

Le annotazioni sono case-insensitive. Nell'intestazione della suite (tra `%suite` e il
primo `%test`) si applicano alla suite; dopo `%test`, si applicano al test.

## Comandi

Tutti i comandi dell'estensione (palette `Ctrl+Shift+P`, prefisso `utPLSQL:`):

| Comando | Descrizione | Scorciatoia UI |
|---|---|---|
| `utPLSQL: Run all tests` | Esegue tutte le suite nel workspace | Pulsante ▶ nella vista Testing |
| `utPLSQL: Run tests in this file` | Esegue le suite del `.pks`/`.pkb` attivo | Clic destro → file |
| `utPLSQL: Run tests in this file with coverage` | Come sopra, con profilo di copertura | Clic destro → file |
| `utPLSQL: Run tests in this folder` | Esegue le suite della cartella selezionata | Clic destro → cartella |
| `utPLSQL: Run tests in this folder with coverage` | Come sopra, con profilo di copertura | Clic destro → cartella |
| `utPLSQL: Refresh tests` | Forza la riscoperta dei `.pks` | — |
| `utPLSQL: Cancel execution` | Ferma la CLI in esecuzione | — |
| `utPLSQL: Show utPLSQL information` | Versioni CLI/API/DB con opzione di copia | — |
| `utPLSQL: Select additional reporter...` | QuickPick con i reporter del database | — |
| `utPLSQL: Clear session connection` | Rimuove la connessione dalla cache di sessione | — |
| `utPLSQL: Rerun Last` | Ripete l'ultima esecuzione | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Esegue il test sotto il cursore | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Rieesegue solo i test falliti | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Esegue la validazione completa del setup (CLI, Java, connessione, installazione UT3) e mostra i risultati | — |
| `utPLSQL: Configure connection` | Apre le impostazioni su `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Copia gli SQL dei grants negli appunti | — |
| `utPLSQL: Show Test Explorer` | Dà il focus alla vista Testing | — |
| `utPLSQL: Switch connection profile...` | Cambia il profilo di connessione attivo (QuickPick) | Clic sulla barra di stato (con profilo attivo) |
| `utPLSQL: New connection profile...` | Procedura guidata per creare e attivare un profilo | — |
| `utPLSQL: Manage connection profiles` | Apre le impostazioni su `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Importa le connessioni da SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Avvia una sessione di debug del test nel file attivo | — |

> **Recompile UT3** (`utplsql.recompileUt3`) **non** è un comando della palette — è
> un quick-fix interno del diagnostico "utPLSQL Setup" (oggetti non validi nello
> schema utPLSQL).

## Scorciatoie da tastiera

Tutte le scorciatoie usano il prefisso `Ctrl+Shift+U` (`Cmd+Shift+U` su Mac):

| Scorciatoia | Comando |
|---|---|
| `Ctrl+Shift+U R` | Esegui tutti i test |
| `Ctrl+Shift+U T` | Esegui i test nel file |
| `Ctrl+Shift+U Shift+T` | Esegui i test nel file con copertura |
| `Ctrl+Shift+U F` | Aggiorna i test |
| `Ctrl+Shift+U I` | Mostra informazioni utPLSQL |
| `Ctrl+Shift+U C` | Cancella la connessione di sessione |
| `Ctrl+Shift+U L` | Rieesegui l'ultimo |
| `Ctrl+Shift+U U` | Esegui al cursore |
| `Ctrl+Shift+U X` | Esegui solo i falliti |
| `Escape` | Annulla l'esecuzione |

## Copertura

- Le righe **eseguite** diventano verdi nel margine; le righe **non eseguite** diventano rosse.
- La scheda **Test Coverage** mostra la **percentuale per file/cartella**.

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

L'estensione passa `-source_path` (= `utplsql.sourcePath`) e mappa gli oggetti coperti
ai file sorgente tramite `utplsql.coverageSourceArgs` (regex + `type_mapping`). Il `-owner`
è derivato dalla connessione (o da `utplsql.coverageOwner`).

### Mappare la copertura ai file (`coverageSourceArgs`)

Il `type_mapping` traduce il "tipo" catturato dalla regex nel tipo Oracle. Tre convenzioni comuni:

**1) Per directory** — struttura `sourcePath/<tipo>/<nome>.sql` (cartelle `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = cartella (tipo)
  "-name_subexpression=2",   // group 2 = file (nome oggetto)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Funziona a qualsiasi profondità (il `.*` assorbe i moduli superiori). Nomi di cartelle
> variati (es. `package`, `pkg`, `pacote`) possono essere elencati nel `type_mapping`.

**2) Per prefisso del nome** — convenzione `pkg_*`, `prc_*`, `vw_*` (indipendente dalla cartella):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = nome completo (es. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefisso (tipo)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Per estensione tipizzata** — file `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (indipendente dalla cartella):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = nome
  "-type_subexpression=2",   // group 2 = estensione (tipo)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Note importanti:**
- **Package → `PACKAGE BODY`** (non `PACKAGE`): la copertura viene raccolta nel **body** del package.
- **Windows / metacaratteri regex:** in modalità `launcher` (default), il `.bat` passa attraverso `cmd`,
  che **consuma `^`** e **interpreta `|` come pipe** — ecco perché gli esempi sopra usano `\w` e
  `[/\\]` (senza `^`), e il `|` nell'esempio 2 funziona solo dentro l'estensione. **Soluzione:** usa **`utplsql.invocation = "java"`** (vedi
  [Modalità di invocazione](#modalità-di-invocazione-launcher-vs-java)) — senza `cmd` in mezzo, `^` e `|` passano
  letteralmente e sei libero di scrivere la regex normalmente.
- **Windows / `cmd`:** evita **`^`** nella regex (il `cmd` del `.bat` lo consuma) — ecco perché gli esempi
  usano `\w` e `[/\\]`.

## Reporter

L'estensione include sempre tre reporter di default:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (risultati → Test Explorer) e
`ut_coverage_cobertura_reporter` (copertura, se disponibile).

**Validazione dinamica** — prima di eseguire con copertura, l'estensione interroga
il database tramite `utplsql reporters <conn>`. Se
`UT_COVERAGE_COBERTURA_REPORTER` non esiste nel database (es. utPLSQL
obsoleto), la copertura viene saltata con un avviso nell'output. L'esecuzione dei test
non viene mai bloccata.

**Reporter fissi aggiuntivi** — impostazione `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
I tre reporter di default vengono automaticamente deduplicati, anche se
elencati qui.

**Reporter volatile per sessione** — comando **utPLSQL: Select additional
reporter...** apre un QuickPick con la lista dinamica dal database. Il
reporter scelto viene usato nella prossima esecuzione e poi scartato (non
viene persistito nelle impostazioni).

## Requisiti del database

**Copertura** (sempre) — abilita il profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_che_esegue_i_test>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_che_esegue_i_test>;
```
Senza questo, i test vengono eseguiti ma la copertura esce **vuota**.

**Scoperta dei test in ALTRI schemi** (installazione utPLSQL **condivisa**, es. owner `UT3`):
affinché il framework possa vedere e analizzare i test degli schemi applicativi, l'owner di utPLSQL deve
**leggere il dizionario** di quegli schemi:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` da solo NON basta** — servono i grants **diretti** su quelle viste
  (a causa di `dbms_assert.sql_object_name` nel contesto definer).
- Deve essere installato anche il **DDL trigger** di utPLSQL (mantiene aggiornata la cache delle annotazioni).
- Verifica (come owner): `SELECT ut_metadata.get_source_view_name FROM dual;` dovrebbe restituire `dba_source`.

> Nelle installazioni **per schema** (utPLSQL nello stesso schema dei test), questi grants cross-schema **non**
> sono necessari — il framework legge il proprio sorgente.

## Limitazioni note

- La mappatura risultato→test è fatta per nome package + nome/descrizione test;
  descrizioni identiche in package diversi possono creare ambiguità (l'indice è
  limitato per package per minimizzare questo).
- Considera la **prima** cartella del workspace per risolvere `sourcePath`.
- La scoperta legge i `.pks` (spec); mantieni le annotazioni `%suite`/`%test` nella spec.

## Risoluzione dei problemi

| Sintomo | Causa probabile | Soluzione |
|---|---|---|
| Le suite non appaiono | CLI non trovata | Esegui `utPLSQL: Validate configuration` per i diagnostici |
| Copertura vuota | Manca `GRANT EXECUTE ON DBMS_PROFILER` | Esegui i grants in [Requisiti del database](#requisiti-del-database) o usa `utPLSQL: Copy coverage grants to clipboard` |
| Copertura vuota | Oracle 19c richiede grants aggiuntivi | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Prestazioni lente | Le suite grandi richiedono più heap JVM | Aumenta `utplsql.javaArgs` (es. `["-Xmx1024m"]`) |
| Errore di compilazione senza indicazione | Codice con errore di sintassi PL/SQL | Abilita `utplsql.compilationDiagnostics.enabled` (default attivo); vedi Pannello Problemi |
| Errore di connessione | Stringa malformata o DB non raggiungibile | Usa `utPLSQL: Validate configuration` |
| Timeout durante l'esecuzione | I test impiegano più di `timeoutMinutes` | Aumenta `utplsql.timeoutMinutes` |
| La regex di copertura non corrisponde | Il `cmd` di Windows consuma `^` e `\|` | Usa `utplsql.invocation: "java"` (vedi [Modalità di invocazione](#modalità-di-invocazione-launcher-vs-java)) |
| `%suite` non riconosciuto | Manca `%suite`/`create package` nel file, o `%test` senza `PROCEDURE` | Controlla la spec; esegui `utPLSQL: Refresh tests` |
| "report non generato" | La CLI non ha potuto generare l'XML di output | Controlla i permessi di scrittura in `%TEMP%` e i grants utPLSQL |
| CodeLens non appare | `editor.codeLens` disabilitato o conflitto | Abilita `"editor.codeLens": true`; controlla `utplsql.codeLens.enabled` |
| Le scorciatoie non funzionano | Conflitto con un'altra estensione o scorciatoia VSCode | Vai a File → Preferenze → Scorciatoie da tastiera e cerca `utplsql` per ridefinire |

## Licenza

MIT © Gil Cleber Barboza
