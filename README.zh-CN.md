<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · **中文(简体)** · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

将 [utPLSQL](https://www.utplsql.org/) 集成到 VSCode，将 PL/SQL 测试带到原生的 **Test Explorer** 中，并支持上下文菜单和可视化覆盖率。

- 🧪 **原生 Test Explorer** — 套件和测试出现在测试视图中；可按测试、套件、文件或文件夹运行。
- 🔍 **CodeLens** — 在编辑器中的 `%suite` 和 `%test` 上提供 Run/Run with Coverage 按钮，无需离开代码。
- ⌨️ **键盘快捷键** — `Ctrl+Shift+U` 前缀 + 按键用于主要命令（R = Run All，T = Run File，L = Rerun Last 等）。
- 🖱️ **上下文菜单** — 右键单击**文件夹**或 **`.pks`/`.pkb`** 文件（在资源管理器中或编辑器中）即可运行测试。
- 📊 **可视化覆盖率** — 每一行带有彩色边线（已覆盖/未覆盖），并在 **Coverage** 选项卡中显示每个文件的百分比。
- ✅ **内联装饰** — 执行后在编辑器中显示 ✓/✗/⚠ 图标，并带有失败提示和概览标尺。
- 📌 **状态栏** — 显示通过/失败数量、持续时间和实时进度的指示器。
- 🔁 **智能重新运行** — Rerun Last、Run at Cursor、Run Failed Only 只需一个快捷键。
- 🚀 **Oracle 直连（通过 node-oracledb）** — 实时流式传输，无需等待批处理完成。
- 🔧 **配置诊断** — 主动验证连接、授权和版本，并提供快速修复。
- 🧩 **Schema 感知的树** — 在 Test Explorer 中按 Schema > Package > Suite > Test 组织测试。
- 🎯 **跳转到失败** — 直接导航到失败的断言所在行（通过原生的 "Go to Error"）。
- 🔌 **连接配置** — 通过状态栏或命令面板，保存并切换多个环境（DEV/TEST/PROD），支持按配置自定义设置。
- 📈 **语句和视图覆盖率** — Coverage 选项卡显示每个文件的语句百分比（PROCEDURE/FUNCTION），并通过 `V$SQL` 跟踪执行的视图。
- 🐛 **PL/SQL 调试** — 通过 `DBMS_DEBUG` 对 utPLSQL 测试进行断点和单步调试（原生调试适配器）。
- 🌍 **i18n — 24 种语言** — `utplsql.language` 跟随 VSCode（15 种原生 + 9 种社区：pt-br、en、en-gb、es、zh-cn、zh-tw、ja、de、fr、it、ko、ru、tr、pl、cs、hu、bg、el、id、ro、sr、th、uk、vi）。

## 安装

可以通过两种方式安装该扩展：

1. **从 Marketplace：** 在 VSCode 扩展面板（`Ctrl+Shift+X`）中搜索 **utPLSQL Test Runner**，然后点击 **Install**。
2. **手动安装（.vsix）：** 下载所需版本的 `.vsix` 文件并在 VSCode 中安装：
   * **通过命令行：** `code --install-extension vscode-utplsql-<version>.vsix`
   * **通过界面：** 打开扩展面板（`Ctrl+Shift+X`），点击右上角的三个点 `...`，然后选择 **Install from VSIX...**。

## 环境要求

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** 已安装到 Oracle 数据库中。
- 只需数据库即可 — VSIX 已包含精简版 `oracledb` 驱动（无需 Instant Client）。
- **VSCode 1.88+**（测试覆盖率 API）。

扩展只是"图形客户端" — 真正运行测试的是数据库，通过 node-oracledb 直连。

## 连接

扩展需要一个 Oracle 连接字符串来运行测试。解析顺序如下：

1. **激活的连接配置** — `utplsql.activeProfile` 指向 `utplsql.profiles` 中的某个配置（会覆盖以下所有项）。
2. **`utplsql.connection` 设置** — 从项目/用户的 `settings.json` 中读取。
3. **`UTPLSQL_CONN` 环境变量** — 在打开 VSCode 之前设置。
4. **会话缓存** — 如果用户已经通过提示输入了连接。
5. **提示用户** — 询问并在当前会话中仅保留在内存中。

连接配置（`utplsql.profiles`）还可以按环境覆盖 `sourcePath`、`coverageOwner` 等 — 请参阅配置表中的 `utplsql.activeProfile`。

⚠️ **安全建议：** 连接字符串包含密码。**不要**在共享环境中使用
`utplsql.connection` 设置（settings.json 可能会被版本管理或对其他人可见）。
请改用 **`UTPLSQL_CONN` 环境变量**：

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

如果设置和环境变量均未定义，扩展会在会话期间仅保存在内存中 — 使用命令
**utPLSQL: Clear session connection**（命令面板）来清除它。

**支持的格式：**
- **EZ Connect**：`user/pass@//host:1521/service`
- **TNS 别名**：`user/pass@tns_alias`（需要配置 `TNS_ADMIN`）
- **Wallet（Oracle Cloud）**：`user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## 工作原理

扩展通过 node-oracledb 直连 Oracle 数据库运行测试。

![Oracle 直连模式 — 流式传输](docs/wiki/images/diagram-streaming.png)

无临时文件，无需等待批处理。结果会在 **每个测试完成时** 出现在
Test Explorer 中。

## 配置

| 设置 | 默认值 | 说明 |
|---|---|---|
| `utplsql.connection` | `""` | Oracle 连接。**留空**并使用 `UTPLSQL_CONN` 环境变量，以避免存储密码。如果两者均为空，扩展会询问（仅在会话中保留）。 |
| `utplsql.sourcePath` | `install` | 生产代码的文件夹（用于将覆盖率映射到文件）。 |
| `utplsql.includePatterns` | `["**/*.pks"]` | 用于发现包含 `%suite`/`%test` 的 spec 的 glob 模式。如果您的测试在 `.sql` 中，请使用 `["**/*.sql"]`。 |
| `utplsql.coverageOwner` | `""` | 被覆盖对象的 schema 所有者。留空 = 使用连接用户（大写）。 |
| `utplsql.timeoutMinutes` | `60` | 执行超时时间（分钟）。 |
| `utplsql.dbmsOutput` | `false` | 在测试会话中启用 `DBMS_OUTPUT`。 |
| `utplsql.additionalReporters` | `[]` | 每次运行时要包含的额外 reporter（例如 `["ut_coverage_html_reporter"]`）。默认的（documentation、junit、coverage）始终包含，无需列出。 |
| `utplsql.codeLens.enabled` | `true` | 在 `%suite` 和 `%test` 上显示 Run/Run with Coverage CodeLens 按钮。 |
| `utplsql.statusBar.enabled` | `true` | 在状态栏中显示测试状态指示器。 |
| `utplsql.decorations.enabled` | `true` | 执行后在 `%suite` 和 `%test` 行上显示通过/失败装饰。 |
| `utplsql.oraclePoolMin` | `2` | Oracle runner 池（node-oracledb）中保持的最小连接数。 |
| `utplsql.oraclePoolMax` | `10` | Oracle runner 池（node-oracledb）中的最大连接数。 |
| `utplsql.oraclePoolIncrement` | `1` | 扩展 Oracle runner 池（node-oracledb）时的增量。 |
| `utplsql.oraclePoolPingInterval` | `60` | 空闲池连接健康检查之间的秒数（node-oracledb）。`0` = 每次签出时 ping。 |
| `utplsql.organization` | `file` | 树组织方式：`file`（按路径）或 `schema`（Schema > Package > Suite > Test）。在 `schema` 模式时，如果工作区中没有 `.pks` 文件，还会从数据库（`ALL_OBJECTS`/`ALL_SOURCE`）发现套件 — 使用虚拟 URI `utplsql-db:/`（无 CodeLens/装饰/跳转到失败）。 |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | 用于从路径中提取 schema 的 glob 模式。使用 `{schema}` 作为占位符。在 `schema` 模式下，模式基准目录（例如 `db/*`）下方的目录定义了在数据库中查询的 schemas。 |
| `utplsql.compilationDiagnostics.enabled` | `true` | 在编辑器和问题面板中显示 PL/SQL 编译错误。 |
| `utplsql.setupDiagnostics.enabled` | `true` | 显示配置诊断（连接、授权、版本）以及 **utPLSQL 安装完整性**（UT3 schema 中的无效对象，带有 "Recompile UT3" 快速修复），并带有快速修复操作。 |
| `utplsql.profiles` | `[]` | 已保存的 Oracle 连接配置（名称、连接，以及 `sourcePath`/`coverageOwner` 等的覆盖项），用于在环境之间切换。 |
| `utplsql.activeProfile` | `""` | 活动配置的 ID（`utplsql.profiles`）。设置后，会覆盖 `utplsql.connection`。 |
| `utplsql.sqlCoverageEnabled` | `false` | 通过 `V$SQL` 跟踪执行的视图（布尔覆盖率）。需要 `GRANT SELECT ON V$SQL`。 |
| `utplsql.debugger.enabled` | `true` | 启用 PL/SQL 测试调试（`DBMS_DEBUG`）。需要 `node-oracledb` + 授权。 |
| `utplsql.debugger.stopOnException` | `true` | 调试期间在 PL/SQL 异常时暂停。 |
| `utplsql.debugger.timeoutSeconds` | `300` | 调试会话的超时时间（秒）。 |
| `utplsql.language` | `auto` | 运行时消息的语言。`auto` 跟随 VSCode（pt、zh-tw/zh-hk、zh、es、ja、de、fr、it、ko、ru、tr、pl、cs、hu、bg、el、id、ro、sr、th、uk、vi、en-gb；否则为 en）。覆盖 **24 种语言环境**（15 种原生 + 9 种社区）。 |

示例（项目 `.vscode/settings.json`）：

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection 保持为空 -> 使用 UTPLSQL_CONN 环境变量
}
```

并且，在打开 VSCode 之前（或在 PowerShell 配置中）：

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### 给贡献者

在项目根目录（gitignored）创建一个 `.env` 文件，包含集成测试使用的环境变量：

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## 使用方法

1. 打开 PL/SQL 项目（包含代码和测试包）。
2. 在数据库中编译代码和测试（Oracle 扩展 / SQLcl）。
3. 打开 **Testing** 视图 → 套件会出现。
4. 运行：
   - 通过 **CodeLens** — 编辑器中的每个 `%suite` 和 `%test` 上都有 ▶ Run/Run with Coverage 按钮。
   - 通过每个测试/套件旁边的**边线**，或
   - 通过**键盘快捷键**（`Ctrl+Shift+U R` = Run All，`Ctrl+Shift+U T` = Run File 等），或
   - Test Explorer 视图中的 **Run Tests** 按钮，或
   - **右键单击**文件夹/文件 → *utPLSQL: Run tests…*（带或不带覆盖率）。
5. 执行后，查看：
   - 编辑器中测试注释旁边的**内联装饰**（✓/✗/⚠）。
   - 带有通过/失败计数和总耗时的**状态栏**。
   - 带有详细结果的 **Test Explorer**。
6. 对于覆盖率，使用 **Run with Coverage** 配置（或"with coverage"菜单项）。
7. 要快速重复执行：
   - `Ctrl+Shift+U L` — **Rerun Last**（重复上次执行，带或不带覆盖率）。
   - `Ctrl+Shift+U U` — **Run at Cursor**（运行光标下的 `%test`/`%suite`）。
   - `Ctrl+Shift+U X` — **Run Failed Only**（仅运行失败的测试）。
8. **Oracle 直连（流式）：** 无需安装任何东西 — VSIX 已包含精简版 `oracledb` 驱动。
9. 对于诊断，在面板中使用 `utPLSQL: Show information` — 显示版本信息并提供复制选项。
10. **utPLSQL: Select additional reporter...** — 使用数据库中可用的 reporter 进行 QuickPick 选择。
11. **utPLSQL: Cancel execution** — 停止正在运行的执行（执行期间按 `Escape`）。
12. **utPLSQL: Refresh tests** — 强制重新发现 `.pks`。

> 💡 **编写测试时：** 解析器是基于 token 的 — 只需在文件中包含 `%suite`
> 和 `create package` 声明，且每个 `%test` 后面跟随其
> `PROCEDURE`。没有空行要求。

### 支持的注解（v0.10.0+）

除了 `%suite` 和 `%test`，发现功能还支持：

| 注解 | 对 Test Explorer 的影响 |
|---|---|
| `-- %disabled` | 套件或测试**不会出现**在树中（发现时跳过） |
| `-- %throws(-20001)` | 标记测试预期抛出异常 20001（`expectedError` 元数据） |
| `-- %tags(fast, critical)` | 测试标签（元数据；标签过滤是路线图中的计划） |
| `-- %displayname(Name)` | 显示的自定义名称，代替 `%test` 的描述 |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | 使用生命周期钩子标记套件（元数据） |

注解不区分大小写。在套件头部（`%suite` 和第一个 `%test` 之间），它们应用于套件；在 `%test` 之后，它们应用于测试。

## 命令

所有扩展命令（面板 `Ctrl+Shift+P`，前缀 `utPLSQL:`）：

| 命令 | 说明 | UI 快捷键 |
|---|---|---|
| `utPLSQL: Run all tests` | 运行工作区中的所有套件 | Testing 视图中的 ▶ 按钮 |
| `utPLSQL: Run tests in this file` | 运行活动 `.pks`/`.pkb` 的套件 | 右键单击 → 文件 |
| `utPLSQL: Run tests in this file with coverage` | 同上，带覆盖率配置 | 右键单击 → 文件 |
| `utPLSQL: Run tests in this folder` | 运行所选文件夹的套件 | 右键单击 → 文件夹 |
| `utPLSQL: Run tests in this folder with coverage` | 同上，带覆盖率配置 | 右键单击 → 文件夹 |
| `utPLSQL: Refresh tests` | 强制重新发现 `.pks` | — |
| `utPLSQL: Cancel execution` | 停止正在运行的执行 | — |
| `utPLSQL: Show utPLSQL information` | 版本信息并提供复制选项 | — |
| `utPLSQL: Select additional reporter...` | 使用数据库 reporter 进行 QuickPick 选择 | — |
| `utPLSQL: Clear session connection` | 从会话缓存中移除连接 | — |
| `utPLSQL: Rerun Last` | 重复上次执行 | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | 运行光标下的测试 | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | 仅重新运行失败的测试 | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | 运行完整的配置验证（连接、UT3 安装）并显示结果 | — |
| `utPLSQL: Configure connection` | 打开 `utplsql.connection` 的设置 | — |
| `utPLSQL: Copy coverage grants to clipboard` | 将授权 SQL 复制到剪贴板 | — |
| `utPLSQL: Show Test Explorer` | 聚焦 Testing 视图 | — |
| `utPLSQL: Switch connection profile...` | 切换活动连接配置（QuickPick） | 单击状态栏（有活动配置时） |
| `utPLSQL: New connection profile...` | 创建并激活配置的向导 | — |
| `utPLSQL: Manage connection profiles` | 打开 `utplsql.profiles` 的设置 | — |
| `utPLSQL: Import connections from SQL Developer` | 从 SQL Developer（connections.xml）导入连接 | — |
| `utPLSQL: Debug test (PL/SQL)` | 为活动文件下的测试启动调试会话 | — |

> **Recompile UT3**（`utplsql.recompileUt3`）**不是**面板命令 — 它是
> "utPLSQL Setup" 诊断（utPLSQL schema 中的无效对象）的内部快速修复。

## 快捷键

所有快捷键都使用 `Ctrl+Shift+U` 前缀（Mac 上为 `Cmd+Shift+U`）：

| 快捷键 | 命令 |
|---|---|
| `Ctrl+Shift+U R` | 运行所有测试 |
| `Ctrl+Shift+U T` | 运行文件中的测试 |
| `Ctrl+Shift+U Shift+T` | 运行文件中的测试（带覆盖率） |
| `Ctrl+Shift+U F` | 刷新测试 |
| `Ctrl+Shift+U I` | 显示 utPLSQL 信息 |
| `Ctrl+Shift+U C` | 清除会话连接 |
| `Ctrl+Shift+U L` | 重复上次 |
| `Ctrl+Shift+U U` | 在光标处运行 |
| `Ctrl+Shift+U X` | 仅运行失败的测试 |
| `Escape` | 取消执行 |

## 覆盖率

- **已执行**的行在边线中变为绿色；**未执行**的行变为红色。
- **Test Coverage** 选项卡显示**每个文件/文件夹的百分比**。

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

扩展通过 `utplsql.sourcePath` 映射覆盖率到源文件。`-owner`
由连接推导（或来自 `utplsql.coverageOwner`）。

## Reporters

扩展始终包含三个默认 reporter：
`ut_documentation_reporter`（stdout）、
`ut_junit_reporter`（结果 → Test Explorer）和
`ut_coverage_cobertura_reporter`（覆盖率，如果可用）。

**动态验证** — 在运行覆盖率之前，扩展通过 `utplsql reporters <conn>` 查询
数据库。如果数据库中没有 `UT_COVERAGE_COBERTURA_REPORTER`（例如过时的
utPLSQL），覆盖率会被跳过并在输出中显示警告。测试执行
永远不会被阻止。

**额外的固定 reporters** — 设置 `utplsql.additionalReporters`：
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
三个默认 reporter 会自动去重，即使在这里列出
也会被去重。

**按会话变化的 reporter** — 命令 **utPLSQL: Select additional
reporter...** 会打开一个 QuickPick，显示数据库中的动态列表。所选的
reporter 会在下次执行时使用，之后被丢弃（不会持久化到
设置中）。

## 数据库要求

**覆盖率**（始终）— 启用剖析器：
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
没有这些，测试可以运行，但覆盖率会是**空的**。

**在其他 schemas 中发现测试**（utPLSQL **共享**安装，例如所有者 `UT3`）：
为了让框架看到并解析应用 schemas 的测试，utPLSQL 所有者需要
**读取这些 schemas 的字典**：
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **单独的 `SELECT ANY DICTIONARY` 是不够的** — 它需要在这些视图上具有**直接**授权
  （因为在定义者上下文中使用了 `dbms_assert.sql_object_name`）。
- 还必须安装 utPLSQL **DDL 触发器**（保持注解缓存最新）。
- 验证（以所有者身份）：`SELECT ut_metadata.get_source_view_name FROM dual;` 应返回 `dba_source`。

> 在**按 schema 安装**（utPLSQL 与测试在同一 schema 中）时，这些跨 schema 授权**不需要**
> — 框架会读取自己的源。

## 已知限制

- 结果→测试的映射是通过包名 + 测试名/描述完成的；
  不同包中的相同描述可能会造成歧义（索引按包
  限定范围以尽量减少这种情况）。
- 只考虑**第一个**工作区文件夹来解析 `sourcePath`。
- 发现功能读取 `.pks`（specs）；请将 `%suite`/`%test` 注解保留在 spec 中。

## 故障排除

| 症状 | 可能的原因 | 解决方案 |
|---|---|---|
| 套件不显示 | 未找到数据库 | 运行 `utPLSQL: Validate configuration` 进行诊断 |
| 覆盖率空 | 缺少 `GRANT EXECUTE ON DBMS_PROFILER` | 在 [数据库要求](#数据库要求) 中运行授权，或使用 `utPLSQL: Copy coverage grants to clipboard` |
| 覆盖率空 | Oracle 19c 需要额外授权 | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| 编译错误无提示 | 代码有 PL/SQL 语法错误 | 启用 `utplsql.compilationDiagnostics.enabled`（默认开启）；查看问题面板 |
| 连接错误 | 字符串格式错误或数据库不可达 | 使用 `utPLSQL: Validate configuration` |
| 运行超时 | 测试耗时超过 `timeoutMinutes` | 增加 `utplsql.timeoutMinutes` |
| `%suite` 未识别 | 文件中缺少 `%suite`/`create package`，或 `%test` 没有 `PROCEDURE` | 检查 spec；运行 `utPLSQL: Refresh tests` |
| CodeLens 不显示 | `editor.codeLens` 被禁用或有冲突 | 启用 `"editor.codeLens": true`；检查 `utplsql.codeLens.enabled` |
| 快捷键不工作 | 与另一个扩展或 VSCode 快捷键冲突 | 转到 File → Preferences → Keyboard Shortcuts，搜索 `utplsql` 重新定义 |

## 许可证

MIT © Gil Cleber Barboza
