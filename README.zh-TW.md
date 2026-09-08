<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · **中文(繁體)** · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

將 [utPLSQL](https://www.utplsql.org/) 整合到 VSCode，將 PL/SQL 測試帶到原生的 **Test Explorer**，並支援上下文選單與視覺化涵蓋率。

- 🧪 **原生 Test Explorer** — 套件與測試顯示在測試檢視中；可依測試、套件、檔案或資料夾執行。
- 🔍 **CodeLens** — 在編輯器中的 `%suite` 與 `%test` 上提供 Run/Run with Coverage 按鈕，無需離開程式碼。
- ⌨️ **鍵盤快捷鍵** — `Ctrl+Shift+U` 前綴 + 按鍵用於主要命令（R = Run All、T = Run File、L = Rerun Last 等）。
- 🖱️ **上下文選單** — 在資源管理器或編輯器中，對**資料夾**或 **`.pks`/`.pkb`** 檔案按一下滑鼠右鍵即可執行測試。
- 📊 **視覺化涵蓋率** — 每一行帶有彩色邊線（已涵蓋/未涵蓋），並在 **Coverage** 分頁中顯示每個檔案的百分比。
- ✅ **內嵌裝飾** — 執行後在編輯器中顯示 ✓/✗/⚠ 圖示，並帶有失敗提示與概覽標尺。
- 📌 **狀態列** — 顯示通過/失敗數量、持續時間與即時進度的指示器。
- 🔁 **智慧重新執行** — Rerun Last、Run at Cursor、Run Failed Only 只需一個快捷鍵。
- 🚀 **Oracle 直連（透過 node-oracledb）** — 即時串流，無需等待批次執行完成。
- 🔧 **安裝診斷** — 主動驗證 CLI、連線、授權與版本，並提供快速修復。
- 🧩 **Schema 感知的樹狀結構** — 在 Test Explorer 中依 Schema > Package > Suite > Test 組織測試。
- 🎯 **跳轉至失敗** — 直接導覽到失敗的斷言所在行（透過原生的 "Go to Error"）。
- 🔌 **連線設定檔** — 透過狀態列或命令面板，儲存並切換多個環境（DEV/TEST/PROD），支援依設定檔自訂設定。
- 📈 **陳述式與檢視涵蓋率** — Coverage 分頁顯示每個檔案的陳述式百分比（PROCEDURE/FUNCTION），並透過 `V$SQL` 追蹤執行的檢視。
- 🐛 **PL/SQL 除錯** — 透過 `DBMS_DEBUG` 對 utPLSQL 測試進行中斷點與逐步除錯（原生除錯介面卡）。
- 🌍 **i18n — 24 種語言** — `utplsql.language` 跟隨 VSCode（15 種原生 + 9 種社群：pt-br、en、en-gb、es、zh-cn、zh-tw、ja、de、fr、it、ko、ru、tr、pl、cs、hu、bg、el、id、ro、sr、th、uk、vi）。

## 安裝

可以透過兩種方式安裝擴充功能：

1. **從 Marketplace：** 在 VSCode 擴充功能面板（`Ctrl+Shift+X`）中搜尋 **utPLSQL Test Runner**，然後點擊 **Install**。
2. **手動安裝（.vsix）：** 下載所需版本的 `.vsix` 檔案並在 VSCode 中安裝：
   * **透過命令列：** `code --install-extension vscode-utplsql-<version>.vsix`
   * **透過介面：** 開啟擴充功能面板（`Ctrl+Shift+X`），點擊右上角的三個點 `...`，然後選擇 **Install from VSIX...**。

## 環境需求

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** 已安裝到 Oracle 資料庫中。
- **對於 CLI 模式：** 在機器上安裝 [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java**（擴充功能會呼叫 CLI）。
- **對於 Oracle 直連模式：** 只需資料庫即可 — VSIX 已包含精簡版 `oracledb` 驅動程式（無需 Instant Client）。
- **VSCode 1.88+**（測試涵蓋率 API）。

擴充功能只是「圖形化用戶端」— 真正執行測試的是資料庫：透過
CLI（utPLSQL-cli + Java）或直連（node-oracledb，預設 `runnerMode: auto`）。

## 連線

擴充功能需要一個 Oracle 連線字串來執行測試。解析順序如下：

1. **啟用的連線設定檔** — `utplsql.activeProfile` 指向 `utplsql.profiles` 中的某個設定檔（會覆蓋以下所有項目）。
2. **`utplsql.connection` 設定** — 從專案/使用者的 `settings.json` 中讀取。
3. **`UTPLSQL_CONN` 環境變數** — 在開啟 VSCode 之前設定。
4. **工作階段快取** — 如果使用者已經透過提示輸入過連線。
5. **提示使用者** — 詢問，並僅在目前工作階段中保留於記憶體。

連線設定檔（`utplsql.profiles`）也可以依環境覆蓋 `sourcePath`、`coverageOwner`、`invocation`、`cliPath` 等 — 請參閱設定表中的 `utplsql.activeProfile`。

⚠️ **安全性建議：** 連線字串包含密碼。**請勿**在共用環境中使用
`utplsql.connection` 設定（settings.json 可能會被版本管理或對其他人可見）。
請改用 **`UTPLSQL_CONN` 環境變數**：

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

如果設定與環境變數均未定義，擴充功能會詢問連線，並僅在工作階段期間保留於記憶體 — 使用命令
**utPLSQL: Clear session connection**（命令面板）來清除它。

**接受的格式：**
- **EZ Connect**：`user/pass@//host:1521/service`
- **TNS 別名**：`user/pass@tns_alias`（需要已設定 `TNS_ADMIN`）
- **錢包（Oracle Cloud）**：`user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## 運作方式

有兩種執行模式可用：

![執行架構 — 兩種模式](docs/wiki/images/diagram-arquitetura.png)

### Oracle 直連模式（v0.9.0）— `runnerMode: auto` 或 `oracle`

![Oracle 直連模式 — 串流](docs/wiki/images/diagram-streaming.png)

無暫存檔，無需等待批次執行完成。結果會**在每個測試結束時**立即顯示在
Test Explorer 中。

### CLI 模式 — `runnerMode: cli`（fallback）

![CLI 模式 — 批次](docs/wiki/images/diagram-cli.png)

擴充功能會組建 CLI 命令列，或透過 Oracle 直連，讀取報表（JUnit + Coverage）
並將其轉譯為 VSCode 的原生 API。`auto` 模式（預設）會先嘗試 Oracle 直連，
若未安裝 `node-oracledb` 則退回 CLI。使用 `runnerMode: cli` 可強制一律使用 CLI。

## 設定

| 設定 | 預設值 | 說明 |
|---|---|---|
| `utplsql.connection` | `""` | Oracle 連線。**留空**並使用 `UTPLSQL_CONN` 環境變數，以避免儲存密碼。若兩者皆為空，擴充功能會詢問（僅在工作階段中保留）。 |
| `utplsql.cliPath` | `utplsql` | utPLSQL-cli 可執行檔的路徑（例如 `C:\tools\utPLSQL-cli\bin\utplsql.bat`）。 |
| `utplsql.sourcePath` | `install` | 正式程式碼的資料夾（用於將涵蓋率對應到檔案）。 |
| `utplsql.includePatterns` | `["**/*.pks"]` | 用於探索含 `%suite`/`%test` 規格的 glob 模式。若測試位於 `.sql`，請使用 `["**/*.sql"]`。 |
| `utplsql.extraRunArgs` | `[]` | 提供給 `utplsql run` 的額外參數。 |
| `utplsql.coverageOwner` | `""` | 被涵蓋物件的 schema 擁有者。留空 = 使用連線使用者（大寫）。 |
| `utplsql.coverageSourceArgs` | （參見 **Coverage**） | 將涵蓋率對應到原始檔案的 CLI 參數。 |
| `utplsql.invocation` | `launcher` | 呼叫 CLI 的方式：`launcher`（透過 `.bat`/指令碼，預設）或 `java`（直接 JVM，**無 shell**）。請參閱 **Invocation mode**。 |
| `utplsql.javaPath` | `java` | Java 可執行檔（PATH 或完整路徑）。僅在 `java` 模式中使用。 |
| `utplsql.cliHome` | `""` | utPLSQL-cli 的根目錄（含 `bin/` 與 `lib/` 的資料夾）。留空 = 從 `cliPath` 推導。僅在 `java` 模式中使用。 |
| `utplsql.timeoutMinutes` | `60` | CLI 的逾時分鐘數。僅在值與 `60` 不同時才傳送 `-t` 旗標。 |
| `utplsql.dbmsOutput` | `false` | 在測試工作階段中啟用 `DBMS_OUTPUT`。僅在為 `true` 時傳送 `-D` 旗標。 |
| `utplsql.quiet` | `false` | 抑制資訊性的 CLI 記錄。僅在為 `true` 時傳送 `-q` 旗標。 |
| `utplsql.failureExitCode` | `1` | 失敗時的結束代碼。僅在值與 `1` 不同時傳送 `--failure-exit-code` 旗標。設為 `0` 會讓 CLI 一律成功結束。 |
| `utplsql.additionalReporters` | `[]` | 每次執行都要包含的額外 reporters（例如 `["ut_coverage_html_reporter"]`）。預設（documentation、junit、coverage）一律包含，無需列出。 |
| `utplsql.codeLens.enabled` | `true` | 在 `%suite` 與 `%test` 上顯示 Run/Run with Coverage CodeLens 按鈕。 |
| `utplsql.statusBar.enabled` | `true` | 在狀態列中顯示測試狀態指示器。 |
| `utplsql.decorations.enabled` | `true` | 在執行後於 `%suite` 與 `%test` 行上顯示通過/失敗裝飾。 |
| `utplsql.runnerMode` | `auto` | 執行模式：`auto`（透過 node-oracledb 的 Oracle 直連，CLI 退回）、`cli`（一律透過命令列）、`oracle`（一律 Oracle 直連）。 |
| `utplsql.oraclePoolMin` | `2` | Oracle 執行器連線集區（node-oracledb）中保留的最小連線數。 |
| `utplsql.oraclePoolMax` | `10` | Oracle 執行器連線集區（node-oracledb）中的最大連線數。 |
| `utplsql.oraclePoolIncrement` | `1` | 擴充 Oracle 執行器連線集區（node-oracledb）時的增量。 |
| `utplsql.oraclePoolPingInterval` | `60` | 閒置集區連線健康檢查之間的秒數（node-oracledb）。`0` = 每次取出連線時皆 ping。 |
| `utplsql.javaArgs` | `["-Xmx256m"]` | `java` 模式的 JVM 旗標（例如 `["-Xmx512m", "-Xms128m"]`）。插入於 `-cp` 之前。 |
| `utplsql.organization` | `file` | 樹狀結構組織：`file`（依路徑）或 `schema`（Schema > Package > Suite > Test）。在 `schema` 模式並搭配 Oracle `runnerMode`（`auto`/`oracle`）時，若工作區中沒有 `.pks` 檔案，也會從資料庫（`ALL_OBJECTS`/`ALL_SOURCE`）探索套件 — 使用虛擬 URI `utplsql-db:/`（無 CodeLens/裝飾/跳轉至失敗）。 |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | 用於從路徑擷取 schema 的 glob 模式。使用 `{schema}` 作為佔位符。在 `schema` 模式中，模式基礎目錄下方的目錄（例如 `db/*`）定義了要在資料庫中查詢的 schema。 |
| `utplsql.compilationDiagnostics.enabled` | `true` | 將 PL/SQL 編譯錯誤顯示為編輯器中的底線及 Problems 面板（CLI 模式）。 |
| `utplsql.setupDiagnostics.enabled` | `true` | 顯示設定診斷（CLI、連線、授權、版本）以及 **utPLSQL 安裝完整性**（UT3 schema 中的無效物件，帶有「Recompile UT3」快速修復）並附上快速修復動作。 |
| `utplsql.profiles` | `[]` | 已儲存的 Oracle 連線設定檔（名稱、連線，以及對 `sourcePath`/`coverageOwner`/`invocation`/`cliPath` 等的覆蓋），用於切換環境。 |
| `utplsql.activeProfile` | `""` | 作用中設定檔的 ID（`utplsql.profiles`）。設定時，會覆蓋 `utplsql.connection`。 |
| `utplsql.sqlCoverageEnabled` | `false` | 透過 `V$SQL` 追蹤執行的檢視（布林涵蓋率）。需要 `GRANT SELECT ON V$SQL`。 |
| `utplsql.debugger.enabled` | `true` | 啟用 PL/SQL 測試除錯（`DBMS_DEBUG`）。需要 `node-oracledb` + 授權。 |
| `utplsql.debugger.stopOnException` | `true` | 在除錯期間於 PL/SQL 例外上暫停。 |
| `utplsql.debugger.timeoutSeconds` | `300` | 除錯工作階段的逾時（秒）。 |
| `utplsql.language` | `auto` | 執行時期訊息的語言。`auto` 跟隨 VSCode（pt、zh-tw/zh-hk、zh、es、ja、de、fr、it、ko、ru、tr、pl、cs、hu、bg、el、id、ro、sr、th、uk、vi、en-gb；否則為 en）。涵蓋 **24 個地區設定**（15 種原生 + 9 種社群）。 |

範例（專案 `.vscode/settings.json`）：

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

並且，在開啟 VSCode 之前（或於 PowerShell 設定檔中）：

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### 給貢獻者

在專案根目錄（gitignored）建立一個 `.env` 檔案，內含整合測試所使用的環境變數：

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
UTPLSQL_CLI_PATH=/path/to/utplsql
UTPLSQL_CLI_HOME=/path/to/utplsql-cli
```

### Invocation mode（`launcher` 與 `java`）

依預設（`utplsql.invocation = "launcher"`）擴充功能會呼叫
`utplsql`/`utplsql.bat` 啟動器。在 Windows 上這會經過 `cmd`，其會
**耗用/解譯中繼字元**（`^` 變成逸出字元，`|` 變成管線）— 這會
破壞 `coverageSourceArgs` 中的正規表示式。

`java` 模式**直接**呼叫 JVM（`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`），**不經過 shell**。參數以陣列形式傳遞給處理程序，
中間沒有 `cmd`，因此 `^` 與 `|` 會**原封不動**地傳遞 — 您可以
在正規表示式中使用 `^anchors$` 與 `(a|b|c)`，無需變通方法。

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome is derived from here
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // only if cliPath is a PATH command
  // "utplsql.javaPath": "java"                     // PATH, or full path to java.exe
}
```

> `java` 模式忠實重現了 `.bat` 的行為（相同的 classpath 與相同的
> `-D` 屬性）；唯一的差別是不經過 `cmd`。需要在 PATH（或
> `utplsql.javaPath`）中有 `java`，且 CLI 根目錄可解析 — 可透過 `cliPath`
> 指向 `…/bin/utplsql(.bat)`，或設定 `cliHome`。

## 使用方式

1. 開啟 PL/SQL 專案（包含程式碼與測試套件）。
2. 在資料庫中編譯程式碼與測試（Oracle 擴充功能 / SQLcl）。
3. 開啟 **Testing** 檢視 → 套件會顯示出來。
4. 執行：
   - 透過 **CodeLens** — 在編輯器中每個 `%suite` 與 `%test` 上提供 ▶ Run/Run with Coverage 按鈕。
   - 透過每個測試/套件旁的**邊線**，或
   - 透過**鍵盤快捷鍵**（`Ctrl+Shift+U R` = Run All、`Ctrl+Shift+U T` = Run File 等），或
   - Test Explorer 檢視的 **Run Tests** 按鈕，或
   - **按一下滑鼠右鍵**資料夾/檔案 → *utPLSQL: Run tests…*（含或不含涵蓋率）。
5. 執行後，檢視：
   - 編輯器中測試註解旁的**內嵌裝飾**（✓/✗/⚠）。
   - 顯示通過/失敗數量與總持續時間的**狀態列**。
   - 顯示詳細結果的 **Test Explorer**。
6. 若要涵蓋率，請使用 **Run with Coverage** 設定檔（或「with coverage」選單項目）。
7. 若要快速重複執行：
   - `Ctrl+Shift+U L` — **Rerun Last**（重複上次的執行，含或不含涵蓋率）。
   - `Ctrl+Shift+U U` — **Run at Cursor**（執行游標下的 `%test`/`%suite`）。
   - `Ctrl+Shift+U X` — **Run Failed Only**（僅執行失敗的測試）。
8. **對於 Oracle 直連（串流）：** 無需安裝任何東西 — VSIX 已包含精簡版 `oracledb` 驅動程式。若 Oracle 無法連線，`auto` 模式會退回 CLI。
9. 若要診斷，請使用命令面板中的 `utPLSQL: Show information` — 顯示 CLI/API/DB 版本並附複製選項。
10. **utPLSQL: Select additional reporter...** — QuickPick 列出資料庫中可用的 reporters。
11. **utPLSQL: Cancel execution** — 停止正在執行的執行（執行期間按 `Escape`）。
12. **utPLSQL: Refresh tests** — 強制重新探索 `.pks`。

> 💡 **撰寫測試時：** 解析器是以 token 驅動 — 只要檔案中有 `%suite`
> 與 `create package` 宣告，以及每個 `%test` 後接其
> `PROCEDURE` 即可。沒有空白行的要求。

### 支援的註解（v0.10.0+）

除了 `%suite` 與 `%test` 之外，探索也了解：

| 註解 | 對 Test Explorer 的影響 |
|---|---|
| `-- %disabled` | 套件或測試**不會顯示**在樹狀結構中（探索時略過） |
| `-- %throws(-20001)` | 標記該測試預期會丟出例外 20001（`expectedError` 中繼資料） |
| `-- %tags(fast, critical)` | 測試標籤（中繼資料；標籤篩選為 roadmap） |
| `-- %displayname(Name)` | 顯示的自訂名稱，取代 `%test` 描述 |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | 以生命週期鉤子（中繼資料）標記套件 |

註解不區分大小寫。在套件標頭（`%suite` 與第一個 `%test` 之間）中，
它們套用於套件；在 `%test` 之後，則套用於測試。

## 命令

所有擴充功能命令（命令面板 `Ctrl+Shift+P` 前綴 `utPLSQL:`）：

| 命令 | 說明 | UI 快捷鍵 |
|---|---|---|
| `utPLSQL: Run all tests` | 執行工作區中的所有套件 | Testing 檢視中的 ▶ 按鈕 |
| `utPLSQL: Run tests in this file` | 執行作用中 `.pks`/`.pkb` 的套件 | 滑鼠右鍵 → 檔案 |
| `utPLSQL: Run tests in this file with coverage` | 同上，但使用涵蓋率設定檔 | 滑鼠右鍵 → 檔案 |
| `utPLSQL: Run tests in this folder` | 執行所選資料夾的套件 | 滑鼠右鍵 → 資料夾 |
| `utPLSQL: Run tests in this folder with coverage` | 同上，但使用涵蓋率設定檔 | 滑鼠右鍵 → 資料夾 |
| `utPLSQL: Refresh tests` | 強制重新探索 `.pks` | — |
| `utPLSQL: Cancel execution` | 停止正在執行的 CLI | — |
| `utPLSQL: Show utPLSQL information` | CLI/API/DB 版本並附複製選項 | — |
| `utPLSQL: Select additional reporter...` | 列出資料庫 reporters 的 QuickPick | — |
| `utPLSQL: Clear session connection` | 從工作階段快取中移除連線 | — |
| `utPLSQL: Rerun Last` | 重複上次的執行 | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | 執行游標下的測試 | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | 僅重新執行失敗的測試 | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | 執行完整的安裝驗證（CLI、Java、連線、UT3 安裝）並顯示結果 | — |
| `utPLSQL: Configure connection` | 在 `utplsql.connection` 開啟設定 | — |
| `utPLSQL: Copy coverage grants to clipboard` | 將授權 SQL 複製到剪貼簿 | — |
| `utPLSQL: Show Test Explorer` | 聚焦 Testing 檢視 | — |
| `utPLSQL: Switch connection profile...` | 切換作用中的連線設定檔（QuickPick） | 點擊狀態列（有作用中設定檔時） |
| `utPLSQL: New connection profile...` | 建立並啟用設定檔的精靈 | — |
| `utPLSQL: Manage connection profiles` | 在 `utplsql.profiles` 開啟設定 | — |
| `utPLSQL: Import connections from SQL Developer` | 從 SQL Developer（connections.xml）匯入連線 | — |
| `utPLSQL: Debug test (PL/SQL)` | 對作用中檔案下的測試啟動除錯工作階段 | — |

> **Recompile UT3**（`utplsql.recompileUt3`）**不是**命令面板命令 — 它是
> 「utPLSQL Setup」診斷（utPLSQL schema 中的無效物件）的內部快速修復。

## 鍵盤快捷鍵

所有快捷鍵都使用 `Ctrl+Shift+U` 前綴（Mac 上為 `Cmd+Shift+U`）：

| 快捷鍵 | 命令 |
|---|---|
| `Ctrl+Shift+U R` | 執行所有測試 |
| `Ctrl+Shift+U T` | 執行檔案中的測試 |
| `Ctrl+Shift+U Shift+T` | 執行檔案中的測試並含涵蓋率 |
| `Ctrl+Shift+U F` | 重新整理測試 |
| `Ctrl+Shift+U I` | 顯示 utPLSQL 資訊 |
| `Ctrl+Shift+U C` | 清除工作階段連線 |
| `Ctrl+Shift+U L` | 重新執行上次 |
| `Ctrl+Shift+U U` | 在游標處執行 |
| `Ctrl+Shift+U X` | 僅執行失敗 |
| `Escape` | 取消執行 |

## 涵蓋率

- **已執行**的行會在邊線變綠；**未執行**的行會變紅。
- **Test Coverage** 分頁顯示**每個檔案/資料夾的百分比**。

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

擴充功能會傳遞 `-source_path`（= `utplsql.sourcePath`），並透過
`utplsql.coverageSourceArgs`（regex + `type_mapping`）將被涵蓋的物件對應到原始檔案。`-owner`
是從連線推導（或從 `utplsql.coverageOwner`）。

### 將涵蓋率對應到檔案（`coverageSourceArgs`）

`type_mapping` 會將正規表示式擷取的「type」轉譯為 Oracle 型別。三種常見慣例：

**1) 依目錄** — 結構 `sourcePath/<type>/<name>.sql`（資料夾 `functions/`、`procedures/`、`packages/`、…）：
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> 可運作於任何深度（`.*` 會吸收上層模組）。可在 `type_mapping` 中列舉不同的資料夾名稱
>（例如 `package`、`pkg`、`pacote`）。

**2) 依名稱前綴** — 慣例 `pkg_*`、`prc_*`、`vw_*`（與資料夾無關）：
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) 依型別化副檔名** — 檔案 `*.pkb`、`*.fnc`、`*.prc`、`*.trg`（與資料夾無關）：
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**重要注意事項：**
- **套件 → `PACKAGE BODY`**（而非 `PACKAGE`）：涵蓋率是在套件**本體**中收集的。
- **Windows / regex 中繼字元：** 在 `launcher` 模式（預設）中，`.bat` 會經過 `cmd`，
  其會**耗用 `^`** 並**將 `|` 解譯為管線** — 這就是上方範例使用 `\w` 與
  `[/\\]`（無 `^`）的原因，而範例 2 中的 `|` 只能在擴充功能內部運作。**解決方案：** 使用 **`utplsql.invocation = "java"`**（參見
  [Invocation mode](#invocation-mode-launcher-vs-java)）— 中間沒有 `cmd` 時，`^` 與 `|` 會
  原封不動地傳遞，您可以正常撰寫正規表示式。
- **Windows / `cmd`：** 避免在正規表示式中使用 **`^`**（`.bat` 的 `cmd` 會耗用它）— 這就是範例
  使用 `\w` 與 `[/\\]` 的原因。

## Reporters

擴充功能一律包含三個預設 reporters：
`ut_documentation_reporter`（stdout）、
`ut_junit_reporter`（結果 → Test Explorer）與
`ut_coverage_cobertura_reporter`（涵蓋率，若可用）。

**動態驗證** — 在使用涵蓋率執行之前，擴充功能會透過
`utplsql reporters <conn>` 查詢資料庫。若
`UT_COVERAGE_COBERTURA_REPORTER` 不存在於資料庫（例如 utPLSQL
過舊），涵蓋率會被略過並在輸出中顯示警告。測試執行
永遠不會被阻擋。

**額外的固定 reporters** — 設定 `utplsql.additionalReporters`：
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
三個預設 reporters 會自動去重，即使在此處列出亦然。

**每次工作階段可變的 reporter** — 命令 **utPLSQL: Select additional
reporter...** 會開啟一個 QuickPick，列出資料庫中的動態清單。所選的
reporter 會用於下一次執行並在之後捨棄（不會
持續存在於設定中）。

## 資料庫需求

**涵蓋率**（一律）— 啟用 profiler：
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
若無此項，測試可執行，但涵蓋率會是**空的**。

**在 OTHER schemas 中探索測試**（utPLSQL **共用**安裝，例如擁有者 `UT3`）：
為了讓框架能看到並解析應用程式 schema 的測試，utPLSQL 擁有者需要
能**讀取**那些 schema 的**字典**：
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **僅 `SELECT ANY DICTIONARY` 是不夠的** — 它需要那些檢視上的**直接**授權
  （因為 `dbms_assert.sql_object_name` 在 definer context 中）。
- 也必須安裝 utPLSQL **DDL 觸發器**（讓註解快取保持最新）。
- 驗證（以擁有者身分）：`SELECT ut_metadata.get_source_view_name FROM dual;` 應回傳 `dba_source`。

> 在**每 schema** 安裝（utPLSQL 與測試位於同一 schema）中，這些跨 schema 授權
> **不需要** — 框架會讀取自己的原始碼。

## 已知限制

- 結果→測試的對應是依套件名稱 + 測試名稱/描述進行；
  不同套件中相同的描述可能造成歧義（索引
  以套件為範圍以盡量減少此情況）。
- 僅考慮**第一個**工作區資料夾來解析 `sourcePath`。
- 探索會讀取 `.pks`（規格）；請將 `%suite`/`%test` 註解保留在規格中。

## 疑難排解

| 症狀 | 可能原因 | 解決方案 |
|---|---|---|
| 套件不出現 | 找不到 CLI | 執行 `utPLSQL: Validate configuration` 以取得診斷 |
| 涵蓋率為空 | 缺少 `GRANT EXECUTE ON DBMS_PROFILER` | 在 [資料庫需求](#資料庫需求) 中執行授權，或使用 `utPLSQL: Copy coverage grants to clipboard` |
| 涵蓋率為空 | Oracle 19c 需要額外授權 | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| 效能緩慢 | 大型套件需要更多 JVM 堆積 | 增加 `utplsql.javaArgs`（例如 `["-Xmx1024m"]`） |
| 編譯錯誤但無提示 | 含 PL/SQL 語法錯誤的程式碼 | 啟用 `utplsql.compilationDiagnostics.enabled`（預設開啟）；參見 Problems 面板 |
| 連線錯誤 | 字串格式錯誤或資料庫無法連線 | 使用 `utPLSQL: Validate configuration` |
| 執行時逾時 | 測試耗時超過 `timeoutMinutes` | 增加 `utplsql.timeoutMinutes` |
| 涵蓋率正規表示式不符 | Windows `cmd` 耗用 `^` 與 `\|` | 使用 `utplsql.invocation: "java"`（參見 [Invocation mode](#invocation-mode-launcher-vs-java)） |
| `%suite` 無法辨識 | 檔案中缺少 `%suite`/`create package`，或 `%test` 沒有 `PROCEDURE` | 檢查規格；執行 `utPLSQL: Refresh tests` |
| 「report not generated」 | CLI 無法產生輸出 XML | 檢查 `%TEMP%` 的寫入權限與 utPLSQL 授權 |
| CodeLens 不出現 | `editor.codeLens` 已停用或衝突 | 啟用 `"editor.codeLens": true`；檢查 `utplsql.codeLens.enabled` |
| 快捷鍵無作用 | 與其他擴充功能或 VSCode 快捷鍵衝突 | 前往 File → Preferences → Keyboard Shortcuts 並搜尋 `utplsql` 以重新定義 |

## 授權

MIT © Gil Cleber Barboza
