<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · **Ελληνικά** · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

Ενσωματώνει το [utPLSQL](https://www.utplsql.org/) στο VSCode, φέρνοντας τα PL/SQL tests στο εγγενές **Test Explorer**, με μενού περιβάλλοντος και οπτική κάλυψη.

- 🧪 **Εγγενές Test Explorer** — τα suites και τα tests εμφανίζονται στην προβολή testing· εκτέλεση ανά test, suite, αρχείο ή φάκελο.
- 🔍 **CodeLens** — κουμπιά Run/Run with Coverage πάνω από τα `%suite` και `%test` στον editor, χωρίς να φύγετε από τον κώδικά σας.
- ⌨️ **Συντομεύσεις πληκτρολογίου** — πρόθεμα `Ctrl+Shift+U` + πλήκτρο για τις κύριες εντολές (R = Run All, T = Run File, L = Rerun Last, κ.λπ.).
- 🖱️ **Μενού περιβάλλοντος** — δεξί κλικ σε έναν **φάκελο** ή σε ένα αρχείο **`.pks`/`.pkb`** (στο Explorer ή στον editor) για να εκτελέσετε tests.
- 📊 **Οπτική κάλυψη** — χρωματισμένα gutters ανά γραμμή (καλυμμένο/μη καλυμμένο) και ποσοστό ανά αρχείο στην καρτέλα **Coverage**.
- ✅ **Inline decorations** — εικονίδια ✓/✗/⚠ στον editor μετά την εκτέλεση, με tooltip αποτυχίας και overview ruler.
- 📌 **Status Bar** — ένδειξη με πλήθος επιτυχιών/αποτυχιών, διάρκεια και πρόοδο σε πραγματικό χρόνο.
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only με μία μόνο συντόμευση.
- 🚀 **Oracle direct (μέσω node-oracledb)** — streaming σε πραγματικό χρόνο, χωρίς να περιμένετε το τέλος του batch.
- 🔧 **Διαγνωστικά ρυθμίσεων** — προληπτική επικύρωση σύνδεσης, grants και έκδοσης με quick-fix.
- 🧩 **Schema-aware tree** — οργάνωση tests ανά Schema > Package > Suite > Test στο Test Explorer.
- 🎯 **Jump to failure** — άμεση μετάβαση στη γραμμή του assertion που απέτυχε (μέσω του εγγενούς "Go to Error").
- 🔌 **Connection profiles** — αποθήκευση και εναλλαγή μεταξύ πολλών περιβαλλόντων (DEV/TEST/PROD) με ρυθμίσεις ανά profile, μέσω status bar ή command palette.
- 📈 **Κάλυψη εντολών και views** — η καρτέλα Coverage δείχνει το `% των εντολών` (PROCEDURE/FUNCTION) ανά αρχείο και παρακολουθεί τα views που εκτελέστηκαν μέσω `V$SQL`.
- 🐛 **PL/SQL Debug** — breakpoints και βηματική αποσφαλμάτωση utPLSQL tests μέσω `DBMS_DEBUG` (native Debug Adapter).
- 🌍 **i18n — 24 γλώσσες** — το `utplsql.language` ακολουθεί το VSCode (15 εγγενείς + 9 κοινοτικές: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Εγκατάσταση

Η επέκταση μπορεί να εγκατασταθεί με δύο τρόπους:

1. **Από το Marketplace:** αναζητήστε το **utPLSQL Test Runner** στο πάνελ επεκτάσεων του VSCode (`Ctrl+Shift+X`) και κάντε κλικ στο **Install**.
2. **Χειροκίνητα (.vsix):** κατεβάστε το αρχείο `.vsix` της επιθυμητής έκδοσης και εγκαταστήστε το στο VSCode:
   * **Μέσω γραμμής εντολών:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Μέσω διεπαφής:** Ανοίξτε το πάνελ Extensions (`Ctrl+Shift+X`), κάντε κλικ στις τρεις τελείες `...` (πάνω δεξιά) και επιλέξτε **Install from VSIX...**.

## Απαιτήσεις

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** εγκατεστημένο στη βάση Oracle.
- Τίποτα άλλο εκτός από τη βάση — το VSIX περιλαμβάνει ήδη τον thin driver `oracledb` (χωρίς Instant Client).
- **VSCode 1.88+** (Test Coverage API).

Η επέκταση είναι μόνο ο «γραφικός πελάτης» — αυτό που εκτελεί τα tests είναι η βάση απευθείας μέσω node-oracledb.

## Σύνδεση

Η επέκταση χρειάζεται μια συμβολοσειρά σύνδεσης Oracle για να εκτελέσει τα tests. Η επίλυση ακολουθεί αυτή τη σειρά:

1. **Ενεργό profile σύνδεσης** — `utplsql.activeProfile` που δείχνει σε profile του `utplsql.profiles` (υπερισχύει όλων των παρακάτω).
2. **Ρύθμιση `utplsql.connection`** — διαβάζεται από το `settings.json` του project/χρήστη.
3. **Μεταβλητή περιβάλλοντος `UTPLSQL_CONN`** — ορίζεται πριν ανοίξετε το VSCode.
4. **Cache συνόδου** — αν ο χρήστης έχει ήδη πληκτρολογήσει τη σύνδεση μέσω prompt.
5. **Prompt προς τον χρήστη** — ρωτά και τη διατηρεί μόνο στην τρέχουσα σύνοδο.

Τα profiles σύνδεσης (`utplsql.profiles`) μπορούν επίσης να παρακάμψουν τα `sourcePath`, `coverageOwner`, κ.λπ. ανά περιβάλλον — δείτε το `utplsql.activeProfile` στον πίνακα ρυθμίσεων.

⚠️ **Σύσταση ασφαλείας:** η συμβολοσειρά σύνδεσης περιέχει κωδικό πρόσβασης. **ΜΗΝ**
χρησιμοποιείτε τη ρύθμιση `utplsql.connection` σε κοινόχρηστα περιβάλλοντα (το settings.json μπορεί
να είναι versioned ή ορατό σε άλλους). Αντί αυτού, **χρησιμοποιήστε τη μεταβλητή περιβάλλοντος
`UTPLSQL_CONN`**:

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

Αν δεν οριστεί ούτε η ρύθμιση ούτε η env var, η επέκταση ζητά τη σύνδεση και
τη διατηρεί μόνο στη μνήμη κατά τη σύνοδο — χρησιμοποιήστε την εντολή
**utPLSQL: Clear session connection** (command palette) για να την καθαρίσετε.

**Αποδεκτές μορφές:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias` (απαιτεί ρυθμισμένο `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Πώς λειτουργεί

Χωρίς προσωρινά αρχεία, χωρίς αναμονή για το batch. Τα αποτελέσματα εμφανίζονται στο
Test Explorer **καθώς ολοκληρώνεται κάθε test**.

Η επέκταση συνδέεται απευθείας μέσω Oracle, διαβάζει τις αναφορές (JUnit + Coverage) και τις μεταφράζει στα εγγενή APIs του VSCode.

## Ρυθμίσεις

| Ρύθμιση | Προεπιλογή | Περιγραφή |
|---|---|---|
| `utplsql.connection` | `""` | Σύνδεση Oracle. **Αφήστε το κενό** και χρησιμοποιήστε τη μεταβλητή περιβάλλοντος `UTPLSQL_CONN` για να αποφύγετε την αποθήκευση του κωδικού. Αν και τα δύο είναι κενά, η επέκταση ρωτά (το διατηρεί μόνο στη σύνοδο). |
| `utplsql.sourcePath` | `install` | Φάκελος του κώδικα παραγωγής (για την αντιστοίχιση της κάλυψης σε αρχεία). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs για την εύρεση των specs με `%suite`/`%test`. Αν τα tests σας είναι σε `.sql`, χρησιμοποιήστε `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Schema-owner των καλυπτόμενων αντικειμένων. Κενό = χρησιμοποιεί τον χρήστη της σύνδεσης (κεφαλαία). |
| `utplsql.additionalReporters` | `[]` | Επιπλέον reporters που περιλαμβάνονται σε κάθε εκτέλεση (π.χ. `["ut_coverage_html_reporter"]`). Οι προεπιλεγμένοι (documentation, junit, coverage) περιλαμβάνονται πάντα και δεν χρειάζεται να αναφέρονται. |
| `utplsql.codeLens.enabled` | `true` | Εμφανίζει κουμπιά CodeLens Run/Run with Coverage πάνω από τα `%suite` και `%test`. |
| `utplsql.statusBar.enabled` | `true` | Εμφανίζει ένδειξη κατάστασης των tests στη status bar. |
| `utplsql.decorations.enabled` | `true` | Εμφανίζει decorations επιτυχίας/αποτυχίας στις γραμμές `%suite` και `%test` μετά την εκτέλεση. |
| `utplsql.oraclePoolMin` | `2` | Ελάχιστες συνδέσεις που διατηρούνται στο pool του Oracle runner (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Μέγιστες συνδέσεις στο pool του Oracle runner (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Βήμα αύξησης όταν επεκτείνεται το pool του Oracle runner (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Δευτερόλεπτα μεταξύ των ελέγχων υγείας των αδρανών συνδέσεων του pool (node-oracledb). `0` = ping σε κάθε checkout. |
| `utplsql.organization` | `file` | Οργάνωση δέντρου: `file` (ανά διαδρομή) ή `schema` (Schema > Package > Suite > Test). Στη λειτουργία `schema` τα suites ανακαλύπτονται επίσης από τη βάση (`ALL_OBJECTS`/`ALL_SOURCE`) όταν τα αρχεία `.pks` δεν υπάρχουν στο workspace — με εικονικό URI `utplsql-db:/` (χωρίς CodeLens/decorations/jump to failure). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob pattern για την εξαγωγή του schema από τη διαδρομή. Χρησιμοποιήστε το `{schema}` ως placeholder. Στη λειτουργία `schema`, οι κατάλογοι κάτω από τη βάση του pattern (π.χ. `db/*`) ορίζουν τα schemas που ερωτώνται στη βάση. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Εμφανίζει τα PL/SQL σφάλματα μεταγλώττισης ως υπογραμμίσεις στον editor και στο Problems Panel. |
| `utplsql.setupDiagnostics.enabled` | `true` | Εμφανίζει διαγνωστικά ρυθμίσεων (σύνδεση, grants, έκδοση) και **ακεραιότητα εγκατάστασης utPLSQL** (άκυρα αντικείμενα στο schema UT3, με quick-fix "Recompile UT3") με ενέργειες quick-fix. |
| `utplsql.profiles` | `[]` | Αποθηκευμένα profiles σύνδεσης Oracle (όνομα, σύνδεση και παρακάμψεις των `sourcePath`/`coverageOwner`/κ.λπ.) για εναλλαγή μεταξύ περιβαλλόντων. |
| `utplsql.activeProfile` | `""` | ID του ενεργού profile (`utplsql.profiles`). Όταν ορίζεται, υπερισχύει του `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Παρακολουθεί τα views που εκτελέστηκαν μέσω `V$SQL` (boolean coverage). Απαιτεί `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Ενεργοποιεί την αποσφαλμάτωση PL/SQL tests (`DBMS_DEBUG`). Απαιτεί `node-oracledb` + grants. |
| `utplsql.debugger.stopOnException` | `true` | Κάνει παύση σε PL/SQL exceptions κατά την αποσφαλμάτωση. |
| `utplsql.debugger.timeoutSeconds` | `300` | Χρονικό όριο (δευτ.) της συνόδου αποσφαλμάτωσης. |
| `utplsql.language` | `auto` | Γλώσσα των μηνυμάτων του runtime. Το `auto` ακολουθεί το VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb· διαφορετικά en). Καλύπτει τις **24 τοπικές ρυθμίσεις** (15 εγγενείς + 9 κοινοτικές). |

Παράδειγμα (`.vscode/settings.json` του project):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

Και, πριν ανοίξετε το VSCode (ή στο προφίλ του PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Για συνεργάτες

Δημιουργήστε ένα αρχείο `.env` στη ρίζα του project (gitignored) με τις μεταβλητές
περιβάλλοντος που χρησιμοποιούν τα integration tests:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Χρήση

1. Ανοίξτε το PL/SQL project (με τον κώδικα και τα test packages).
2. Μεταγλωττίστε τον κώδικα και τα tests στη βάση (Oracle extension / SQLcl).
3. Ανοίξτε την προβολή **Testing** → εμφανίζονται τα suites.
4. Εκτελέστε:
   - Μέσω **CodeLens** — ▶ κουμπιά Run/Run with Coverage πάνω από κάθε `%suite` και `%test` στον editor.
   - Μέσω του **gutter** δίπλα σε κάθε test/suite, ή
   - Μέσω των **συντομεύσεων πληκτρολογίου** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, κ.λπ.), ή
   - Το κουμπί **Run Tests** της προβολής Test Explorer, ή
   - **Δεξί κλικ** σε φάκελο/αρχείο → *utPLSQL: Run tests…* (με ή χωρίς coverage).
5. Μετά την εκτέλεση, δείτε:
   - **Inline decorations** (✓/✗/⚠) στον editor δίπλα στις σημάνσεις των tests.
   - **Status Bar** με πλήθος επιτυχιών/αποτυχιών και συνολική διάρκεια.
   - **Test Explorer** με αναλυτικά αποτελέσματα.
6. Για κάλυψη, χρησιμοποιήστε το profile **Run with Coverage** (ή το στοιχείο μενού "with coverage").
7. Για γρήγορη επανάληψη εκτελέσεων:
   - `Ctrl+Shift+U L` — **Rerun Last** (επαναλαμβάνει την τελευταία εκτέλεση, με ή χωρίς coverage).
   - `Ctrl+Shift+U U` — **Run at Cursor** (εκτελεί το `%test`/`%suite` κάτω από τον κέρσορα).
   - `Ctrl+Shift+U X` — **Run Failed Only** (εκτελεί μόνο τα tests που απέτυχαν).
8. **Για Oracle direct (streaming):** δεν χρειάζεται τίποτα να εγκατασταθεί — το VSIX περιλαμβάνει ήδη τον thin driver `oracledb`.
9. Για διαγνωστικά, χρησιμοποιήστε το `utPLSQL: Show information` στην palette — δείχνει εκδόσεις API/DB με επιλογή αντιγραφής.
10. **utPLSQL: Select additional reporter...** — QuickPick με τους reporters που είναι διαθέσιμοι στη βάση.
11. **utPLSQL: Cancel execution** — σταματά την τρέχουσα εκτέλεση (`Escape` κατά την εκτέλεση).
12. **utPLSQL: Refresh tests** — επιβάλλει εκ νέου εύρεση των `.pks`.

> 💡 **Όταν γράφετε tests:** ο parser βασίζεται σε tokens — αρκεί να υπάρχουν το `%suite`
> και η δήλωση `create package` στο αρχείο, και κάθε `%test` να ακολουθείται από το
> `PROCEDURE` του. Δεν υπάρχει απαίτηση κενής γραμμής.

### Υποστηριζόμενες σημάνσεις (v0.10.0+)

Εκτός από τα `%suite` και `%test`, η εύρεση κατανοεί:

| Σημείωση | Επίπτωση στο Test Explorer |
|---|---|
| `-- %disabled` | Suite ή test **δεν εμφανίζεται** στο δέντρο (παραλείπεται στην εύρεση) |
| `-- %throws(-20001)` | Σημαδεύει ότι το test αναμένει την εξαίρεση 20001 (metadata `expectedError`) |
| `-- %tags(fast, critical)` | Tags του test (metadata· το φιλτράρισμα με tags είναι στο roadmap) |
| `-- %displayname(Name)` | Προσαρμοσμένο όνομα που εμφανίζεται αντί για την περιγραφή του `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Σημαδεύει το suite με lifecycle hooks (metadata) |

Οι σημάνσεις δεν κάνουν διάκριση πεζών/κεφαλαίων. Στην κεφαλίδα του suite (μεταξύ `%suite` και του
πρώτου `%test`) ισχύουν για το suite· μετά το `%test`, ισχύουν για το test.

## Εντολές

Όλες οι εντολές της επέκτασης (palette `Ctrl+Shift+P`, πρόθεμα `utPLSQL:`):

| Εντολή | Περιγραφή | Συντόμευση UI |
|---|---|---|
| `utPLSQL: Run all tests` | Εκτελεί όλα τα suites στο workspace | ▶ κουμπί στην προβολή Testing |
| `utPLSQL: Run tests in this file` | Εκτελεί τα suites του ενεργού `.pks`/`.pkb` | Δεξί κλικ → αρχείο |
| `utPLSQL: Run tests in this file with coverage` | Ίδιο, με profile coverage | Δεξί κλικ → αρχείο |
| `utPLSQL: Run tests in this folder` | Εκτελεί τα suites του επιλεγμένου φακέλου | Δεξί κλικ → φάκελος |
| `utPLSQL: Run tests in this folder with coverage` | Ίδιο, με profile coverage | Δεξί κλικ → φάκελος |
| `utPLSQL: Refresh tests` | Επιβάλλει εκ νέου εύρεση των `.pks` | — |
| `utPLSQL: Cancel execution` | Σταματά την τρέχουσα εκτέλεση | — |
| `utPLSQL: Show utPLSQL information` | Εκδόσεις API/DB με επιλογή αντιγραφής | — |
| `utPLSQL: Select additional reporter...` | QuickPick με τους reporters της βάσης | — |
| `utPLSQL: Clear session connection` | Αφαιρεί τη σύνδεση από την cache της συνόδου | — |
| `utPLSQL: Rerun Last` | Επαναλαμβάνει την τελευταία εκτέλεση | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Εκτελεί το test κάτω από τον κέρσορα | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Εκτελεί ξανά μόνο τα tests που απέτυχαν | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Εκτελεί πλήρη επικύρωση ρυθμίσεων (σύνδεση, εγκατάσταση UT3) και εμφανίζει τα αποτελέσματα | — |
| `utPLSQL: Configure connection` | Ανοίγει τις ρυθμίσεις στο `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Αντιγράφει το SQL των grants στο πρόχειρο | — |
| `utPLSQL: Show Test Explorer` | Εστιάζει στην προβολή Testing | — |
| `utPLSQL: Switch connection profile...` | Αλλάζει το ενεργό profile σύνδεσης (QuickPick) | Κλικ στη status bar (με ενεργό profile) |
| `utPLSQL: New connection profile...` | Οδηγός για δημιουργία και ενεργοποίηση profile | — |
| `utPLSQL: Manage connection profiles` | Ανοίγει τις ρυθμίσεις στο `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Εισάγει συνδέσεις από το SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Ξεκινά σύνοδο αποσφαλμάτωσης του test στο ενεργό αρχείο | — |

> **Recompile UT3** (`utplsql.recompileUt3`) **δεν** είναι εντολή palette — είναι
> ένα εσωτερικό quick-fix του διαγνωστικού "utPLSQL Setup" (άκυρα αντικείμενα στο
> schema του utPLSQL).

## Συντομεύσεις πληκτρολογίου

Όλες οι συντομεύσεις χρησιμοποιούν το πρόθεμα `Ctrl+Shift+U` (`Cmd+Shift+U` στο Mac):

| Συντόμευση | Εντολή |
|---|---|
| `Ctrl+Shift+U R` | Εκτέλεση όλων των tests |
| `Ctrl+Shift+U T` | Εκτέλεση tests στο αρχείο |
| `Ctrl+Shift+U Shift+T` | Εκτέλεση tests στο αρχείο με coverage |
| `Ctrl+Shift+U F` | Ανανέωση tests |
| `Ctrl+Shift+U I` | Εμφάνιση πληροφοριών utPLSQL |
| `Ctrl+Shift+U C` | Εκκαθάριση σύνδεσης συνόδου |
| `Ctrl+Shift+U L` | Επανάληψη τελευταίας εκτέλεσης |
| `Ctrl+Shift+U U` | Εκτέλεση στον κέρσορα |
| `Ctrl+Shift+U X` | Εκτέλεση μόνο αποτυχημένων |
| `Escape` | Ακύρωση εκτέλεσης |

## Κάλυψη

- Οι γραμμές που **εκτελέστηκαν** γίνονται πράσινες στο gutter· οι γραμμές που **δεν εκτελέστηκαν** γίνονται κόκκινες.
- Η καρτέλα **Test Coverage** δείχνει το **ποσοστό ανά αρχείο/φάκελο**.



Η επέκταση περνά το `-source_path` (= `utplsql.sourcePath`) και αντιστοιχίζει τα καλυπτόμενα
αντικείμενα σε αρχεία πηγαίου κώδικα μέσω του `utplsql.coverageSourceArgs` (regex +
`type_mapping`). Το `-owner` προκύπτει από τη σύνδεση (ή από το `utplsql.coverageOwner`).

### Χαρτογράφηση κάλυψης σε αρχεία (`coverageSourceArgs`)

Το `type_mapping` μεταφράζει τον «τύπο» που συλλαμβάνει το regex στον τύπο Oracle. Τρεις κοινές συμβάσεις:

**1) Ανά κατάλογο** — δομή `sourcePath/<type>/<name>.sql` (φάκελοι `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Λειτουργεί σε οποιοδήποτε βάθος (το `.*` απορροφά τα modules από πάνω). Ποικίλα ονόματα
> φακέλων (π.χ. `package`, `pkg`, `pacote`) μπορούν να απαριθμηθούν στο `type_mapping`.

**2) Ανά πρόθεμα ονόματος** — σύμβαση `pkg_*`, `prc_*`, `vw_*` (ανεξάρτητα από τον φάκελο):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Ανά επέκταση με τύπο** — αρχεία `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (ανεξάρτητα από τον φάκελο):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Σημαντικές σημειώσεις:**
- **Packages → `PACKAGE BODY`** (όχι `PACKAGE`): η κάλυψη συλλέγεται στο **body** του package.

## Reporters

Η επέκταση περιλαμβάνει πάντα τρεις προεπιλεγμένους reporters:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (αποτελέσματα → Test Explorer) και
`ut_coverage_cobertura_reporter` (coverage, αν είναι διαθέσιμος).

**Δυναμική επικύρωση** — πριν εκτελέσει με coverage, η επέκταση ερωτά
τη βάση μέσω του `utplsql reporters <conn>`. Αν το
`UT_COVERAGE_COBERTURA_REPORTER` δεν υπάρχει στη βάση (π.χ. παλιό
utPLSQL), το coverage παραλείπεται με προειδοποίηση στην έξοδο. Η εκτέλεση
των tests δεν μπλοκάρεται ποτέ.

**Επιπλέον σταθεροί reporters** — ρύθμιση `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Οι τρεις προεπιλεγμένοι reporters αφαιρούνται αυτόματα ως διπλότυπα, ακόμη κι αν
αναφέρονται εδώ.

**Προσωρινός reporter ανά σύνοδο** — η εντολή **utPLSQL: Select additional
reporter...** ανοίγει ένα QuickPick με τη δυναμική λίστα από τη βάση. Ο
επιλεγμένος reporter χρησιμοποιείται στην επόμενη εκτέλεση και απορρίπτεται μετά (δεν
αποθηκεύεται στις ρυθμίσεις).

## Απαιτήσεις βάσης δεδομένων

**Coverage** (πάντα) — ενεργοποιεί τον profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Χωρίς αυτό, τα tests εκτελούνται αλλά το coverage βγαίνει **κενό**.

**Εύρεση tests σε ΑΛΛΑ schemas** (utPLSQL **shared** εγκατάσταση, π.χ. owner `UT3`):
για να δει και να αναλύσει το framework τα tests των schemas εφαρμογών, ο owner του utPLSQL
χρειάζεται να **διαβάζει το λεξικό** αυτών των schemas:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **Μόνο το `SELECT ANY DICTIONARY` ΔΕΝ αρκεί** — χρειάζονται **άμεσα** grants σε αυτά τα views
  (λόγω του `dbms_assert.sql_object_name` σε definer context).
- Πρέπει επίσης να εγκατασταθεί το **DDL trigger** του utPLSQL (κρατά ενημερωμένη την cache των σημάνσεων).
- Επαλήθευση (ως owner): `SELECT ut_metadata.get_source_view_name FROM dual;` πρέπει να επιστρέφει `dba_source`.

> Σε **per-schema** εγκαταστάσεις (utPLSQL στο ίδιο schema με τα tests), αυτά τα cross-schema grants **δεν**
> χρειάζονται — το framework διαβάζει τον δικό του κώδικα.

## Γνωστοί περιορισμοί

- Η αντιστοίχιση αποτέλεσμα→test γίνεται με όνομα package + όνομα/περιγραφή test·
  οι ίδιες περιγραφές σε διαφορετικά packages μπορούν να δημιουργήσουν αμφισημία (το ευρετήριο
  περιορίζεται ανά package για να την ελαχιστοποιεί).
- Λαμβάνει υπόψη τον **πρώτο** φάκελο του workspace για την επίλυση του `sourcePath`.
- Η εύρεση διαβάζει τα `.pks` (specs)· κρατήστε τις σημάνσεις `%suite`/`%test` στο spec.

## Αντιμετώπιση προβλημάτων

| Σύμπτωμα | Πιθανή αιτία | Λύση |
|---|---|---|
| Κενό coverage | Λείπει το `GRANT EXECUTE ON DBMS_PROFILER` | Εκτελέστε τα grants στις [Απαιτήσεις βάσης δεδομένων](#απαιτήσεις-βάσης-δεδομένων) ή χρησιμοποιήστε το `utPLSQL: Copy coverage grants to clipboard` |
| Κενό coverage | Το Oracle 19c απαιτεί επιπλέον grants | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Σφάλμα μεταγλώττισης χωρίς ένδειξη | Κώδικας με συντακτικό σφάλμα PL/SQL | Ενεργοποιήστε το `utplsql.compilationDiagnostics.enabled` (ενεργό από προεπιλογή)· δείτε το Problems Panel |
| Σφάλμα σύνδεσης | Κακοσχηματισμένη συμβολοσειρά ή μη προσβάσιμη βάση | Χρησιμοποιήστε το `utPLSQL: Validate configuration` |
| Το `%suite` δεν αναγνωρίζεται | Λείπει το `%suite`/`create package` στο αρχείο ή `%test` χωρίς `PROCEDURE` | Ελέγξτε το spec· εκτελέστε το `utPLSQL: Refresh tests` |
| Το CodeLens δεν εμφανίζεται | `editor.codeLens` απενεργοποιημένο ή σύγκρουση | Ενεργοποιήστε το `"editor.codeLens": true`· ελέγξτε το `utplsql.codeLens.enabled` |
| Οι συντομεύσεις δεν λειτουργούν | Σύγκρουση με άλλη επέκταση ή συντόμευση του VSCode | Πηγαίνετε σε File → Preferences → Keyboard Shortcuts και αναζητήστε το `utplsql` για να το επαναπροσδιορίσετε |

## Άδεια χρήσης

MIT © Gil Cleber Barboza
