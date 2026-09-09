<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · **日本語** · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

[utPLSQL](https://www.utplsql.org/) を VSCode に統合し、PL/SQL テストをネイティブの **Test Explorer** に取り込み、コンテキストメニューと視覚的なカバレッジを提供します。

- 🧪 **ネイティブ Test Explorer** — スイートとテストがテストビューに表示されます。テスト単位・スイート単位・ファイル単位・フォルダー単位で実行できます。
- 🔍 **CodeLens** — エディター内の `%suite` と `%test` の上に Run/Run with Coverage ボタンを表示。コードから離れることなく実行できます。
- ⌨️ **キーボードショートカット** — `Ctrl+Shift+U` プレフィックス + キーで主要コマンドを実行（R = Run All、T = Run File、L = Rerun Last など）。
- 🖱️ **コンテキストメニュー** — **フォルダー**または **`.pks`/`.pkb`** ファイルを右クリック（Explorer またはエディター内）してテストを実行。
- 📊 **視覚的なカバレッジ** — 行ごとのカラーガター（実行済み/未実行）と、**Coverage** タブでのファイルごとのパーセンテージ。
- ✅ **インラインデコレーション** — 実行後、エディターに ✓/✗/⚠ アイコンを表示。失敗のツールチップとオーバービュールーラー付き。
- 📌 **ステータスバー** — 合格/失敗数、所要時間、リアルタイムの進行状況を示すインジケーター。
- 🔁 **スマート再実行** — ショートカット 1 つで Rerun Last / Run at Cursor / Run Failed Only。
- 🚀 **Oracle 直接実行（node-oracledb 経由）** — バッチの完了を待たずにリアルタイムでストリーミング。
- 🔧 **セットアップ診断** — 接続・権限・バージョンのプロアクティブな検証とクイックフィックス。
- 🧩 **スキーマ認識ツリー** — Test Explorer で Schema > Package > Suite > Test の順にテストを整理。
- 🎯 **失敗箇所へのジャンプ** — 失敗したアサーションの行へ直接移動（ネイティブの "Go to Error" 経由）。
- 🔌 **接続プロファイル** — DEV/TEST/PROD などの複数環境をプロファイルごとの設定で保存・切替。ステータスバーまたはコマンドパレットから。
- 📈 **ステートメントとビューのカバレッジ** — Coverage タブにファイルごとの `% of statements`（PROCEDURE/FUNCTION）を表示し、`V$SQL` 経由で実行されたビューを追跡。
- 🐛 **PL/SQL デバッグ** — `DBMS_DEBUG` による utPLSQL テストのブレークポイントとステップデバッグ（ネイティブ Debug Adapter）。
- 🌍 **i18n — 24 言語** — `utplsql.language` は VSCode に追従（ネイティブ 15 + コミュニティ 9: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi）。

## インストール

拡張機能は次の 2 つの方法でインストールできます:

1. **Marketplace から:** VSCode の拡張機能パネル（`Ctrl+Shift+X`）で **utPLSQL Test Runner** を検索し、**Install** をクリックします。
2. **手動（.vsix）:** 任意のバージョンの `.vsix` ファイルをダウンロードし、VSCode にインストールします:
   * **コマンドラインの場合:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **UI の場合:** 拡張機能パネル（`Ctrl+Shift+X`）を開き、右上の三点リーダー `...` をクリックして **Install from VSIX...** を選択します。

## 要件

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** が Oracle データベースにインストールされていること。
- **VSCode 1.88 以降**（Test Coverage API）。

この拡張機能は `node-oracledb` を使用して Oracle データベースに直接接続します（シンドライバー、Instant Client 不要）。VSIX には `oracledb` パッケージが同梱されています。

## 接続

テストを実行するには Oracle 接続文字列が必要です。解決は次の順序で行われます:

1. **アクティブな接続プロファイル** — `utplsql.activeProfile` が `utplsql.profiles` 内のプロファイルを指している（以下のすべてより優先）。
2. **`utplsql.connection` 設定** — プロジェクト/ユーザーの `settings.json` から読み取り。
3. **`UTPLSQL_CONN` 環境変数** — VSCode を開く前に設定。
4. **セッションキャッシュ** — ユーザーがプロンプトで接続文字列を入力済みの場合。
5. **ユーザーへのプロンプト** — 入力を求め、現在のセッションのみ保持。

接続プロファイル（`utplsql.profiles`）では、環境ごとに `sourcePath`、`coverageOwner` などを上書きすることもできます — 設定テーブルの `utplsql.activeProfile` を参照してください。

⚠️ **セキュリティ上の推奨事項:** 接続文字列にはパスワードが含まれます。共有環境では **`utplsql.connection` 設定を使用しないでください**（settings.json がバージョン管理されたり他人に見えたりする可能性があります）。代わりに **`UTPLSQL_CONN` 環境変数を使用してください**:

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

設定も環境変数も定義されていない場合、拡張機能は接続を尋ね、セッション中のみメモリに保持します — クリアするには **utPLSQL: Clear session connection** コマンド（コマンドパレット）を使用してください。

**受け入れられる形式:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS エイリアス**: `user/pass@tns_alias`（`TNS_ADMIN` の設定が必要）
- **Wallet（Oracle Cloud）**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## 仕組み

この拡張機能は `node-oracledb` を使用して Oracle データベースに直接接続し、テスト結果をリアルタイムでストリーミングし、VSCode のネイティブ API に変換します。

一時ファイルなし、バッチの完了を待つ必要なし。結果は **各テストが終了するたびに**
Test Explorer に表示されます。

## 設定

| 設定 | デフォルト | 説明 |
|---|---|---|
| `utplsql.connection` | `""` | Oracle 接続。**空のまま**にして `UTPLSQL_CONN` 環境変数を使うとパスワードを保存せずに済みます。両方とも空の場合は拡張機能が尋ねます（セッション中のみ保持）。 |
| `utplsql.sourcePath` | `install` | 本番コードのフォルダー（カバレッジをファイルにマッピングするため）。 |
| `utplsql.includePatterns` | `["**/*.pks"]` | `%suite`/`%test` を含むスペックを検出するグロブ。テストが `.sql` 内にある場合は `["**/*.sql"]` を使用します。 |
| `utplsql.coverageOwner` | `""` | カバレッジ対象オブジェクトのスキーマ所有者。空 = 接続ユーザーを使用（大文字）。 |
| `utplsql.timeoutMinutes` | `60` | テスト実行のタイムアウト（分）。 |
| `utplsql.dbmsOutput` | `false` | テストセッションで `DBMS_OUTPUT` を有効化。デバッグに便利。 |
| `utplsql.additionalReporters` | `[]` | 毎回の実行に含める追加レポーター（例: `["ut_coverage_html_reporter"]`）。デフォルト（documentation、junit、coverage）は常に含まれ、リスト化する必要はありません。 |
| `utplsql.codeLens.enabled` | `true` | `%suite` と `%test` の上に Run/Run with Coverage の CodeLens ボタンを表示。 |
| `utplsql.statusBar.enabled` | `true` | ステータスバーにテスト状態インジケーターを表示。 |
| `utplsql.decorations.enabled` | `true` | 実行後に `%suite` と `%test` の行へ合格/失敗のデコレーションを表示。 |
| `utplsql.oraclePoolMin` | `2` | Oracle ランナープール（node-oracledb）で保持する最小接続数。 |
| `utplsql.oraclePoolMax` | `10` | Oracle ランナープール（node-oracledb）の最大接続数。 |
| `utplsql.oraclePoolIncrement` | `1` | Oracle ランナープール（node-oracledb）拡張時の増分。 |
| `utplsql.oraclePoolPingInterval` | `60` | アイドルプール接続のヘルスチェック間隔（秒）（node-oracledb）。`0` = チェックアウトのたびに ping。 |
| `utplsql.organization` | `file` | ツリーの構成: `file`（パス単位）または `schema`（Schema > Package > Suite > Test）。`schema` モードでは、`.pks` ファイルがワークスペースにないときはスイートもデータベース（`ALL_OBJECTS`/`ALL_SOURCE`）から検出されます — 仮想 URI は `utplsql-db:/`（CodeLens/デコレーション/失敗ジャンプなし）。 |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | パスからスキーマを抽出するためのグロブパターン。プレースホルダーには `{schema}` を使用します。`schema` モードでは、パターンベースより下のディレクトリ（例: `db/*`）がデータベースでクエリされるスキーマを定義します。 |
| `utplsql.compilationDiagnostics.enabled` | `true` | PL/SQL コンパイルエラーをエディターと Problems パネルに下線として表示。 |
| `utplsql.setupDiagnostics.enabled` | `true` | 設定診断（接続、権限、バージョン）と **utPLSQL インストールの整合性**（UT3 スキーマ内の無効オブジェクト。"Recompile UT3" クイックフィックスあり）をクイックフィックスアクション付きで表示。 |
| `utplsql.profiles` | `[]` | 保存された Oracle 接続プロファイル（名前、接続、`sourcePath`/`coverageOwner` などの上書き）。環境の切り替え用。 |
| `utplsql.activeProfile` | `""` | アクティブなプロファイルの ID（`utplsql.profiles`）。設定すると `utplsql.connection` を上書きします。 |
| `utplsql.sqlCoverageEnabled` | `false` | `V$SQL` 経由で実行されたビューを追跡（boolean カバレッジ）。`GRANT SELECT ON V$SQL` が必要。 |
| `utplsql.debugger.enabled` | `true` | PL/SQL テストデバッグ（`DBMS_DEBUG`）を有効化。`node-oracledb` + 権限が必要。 |
| `utplsql.debugger.stopOnException` | `true` | デバッグ中に PL/SQL 例外で一時停止。 |
| `utplsql.debugger.timeoutSeconds` | `300` | デバッグセッションのタイムアウト（秒）。 |
| `utplsql.language` | `auto` | ランタイムメッセージの言語。`auto` は VSCode に追従（pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; それ以外は en）。**24 ロケール**（ネイティブ 15 + コミュニティ 9）をカバー。 |

例（プロジェクト `.vscode/settings.json`）:

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

そして、VSCode を開く前（または PowerShell プロファイル内で）:

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### コントリビューター向け

統合テストで使用する環境変数を、プロジェクトルートに `.env` ファイル（gitignore 済み）を作成して定義します:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## 使用方法

1. PL/SQL プロジェクト（コードとテストパッケージを含む）を開きます。
2. コードとテストをデータベースでコンパイルします（Oracle 拡張機能 / SQLcl）。
3. **Testing** ビューを開きます → スイートが表示されます。
4. 実行:
   - **CodeLens** 経由 — エディター内の各 `%suite` と `%test` の上にある ▶ Run/Run with Coverage ボタン。
   - 各テスト/スイートの横の**ガター**経由、または
   - **キーボードショートカット**経由（`Ctrl+Shift+U R` = Run All、`Ctrl+Shift+U T` = Run File など）、または
   - Test Explorer ビューの **Run Tests** ボタン、または
   - **フォルダー/ファイルを右クリック** → *utPLSQL: Run tests…*（カバレッジあり/なし）。
5. 実行後、以下を確認:
   - テストアノテーションの横のエディター内**インラインデコレーション**（✓/✗/⚠）。
   - 合格/失敗数と合計所要時間を示す**ステータスバー**。
   - 詳細な結果が表示される**Test Explorer**。
6. カバレッジを取得するには、**Run with Coverage** プロファイル（または「with coverage」メニュー項目）を使用します。
7. 実行を素早く繰り返すには:
   - `Ctrl+Shift+U L` — **Rerun Last**（最後の実行を繰り返します。カバレッジあり/なし）。
   - `Ctrl+Shift+U U` — **Run at Cursor**（カーソル位置の `%test`/`%suite` を実行）。
   - `Ctrl+Shift+U X` — **Run Failed Only**（失敗したテストのみ実行）。
8. 診断にはパレットで **utPLSQL: Show information** を使用します — API/DB のバージョンをコピーオプション付きで表示します。
9. **utPLSQL: Select additional reporter...** — データベースで利用可能なレポーターを表示する QuickPick。
10. **utPLSQL: Cancel execution** — 実行中の処理を停止（実行中の `Escape`）。
11. **utPLSQL: Refresh tests** — `.pks` の再検出を強制します。

> 💡 **テスト作成時のヒント:** パーサーはトークン駆動です — ファイルに `%suite`
> と `create package` 宣言があれば十分で、各 `%test` の後にその `PROCEDURE` が
> 続いていれば解析されます。空行の要件はありません。

### サポートされるアノテーション（v0.10.0+）

`%suite` と `%test` に加えて、検出では以下も認識します:

| アノテーション | Test Explorer への影響 |
|---|---|
| `-- %disabled` | スイートまたはテストがツリーに**表示されない**（検出でスキップ） |
| `-- %throws(-20001)` | テストが例外 20001 を期待することを示す（`expectedError` メタデータ） |
| `-- %tags(fast, critical)` | テストのタグ（メタデータ。タグフィルタリングはロードマップ） |
| `-- %displayname(Name)` | `%test` の説明の代わりに表示されるカスタム名 |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | ライフサイクルフックでスイートをマーク（メタデータ） |

アノテーションは大文字小文字を区別しません。スイートヘッダー内（`%suite` から
最初の `%test` の間）ではスイートに適用され、`%test` の後ではテストに適用されます。

## コマンド

拡張機能のすべてのコマンド（パレット `Ctrl+Shift+P` のプレフィックスは `utPLSQL:`）:

| コマンド | 説明 | UI ショートカット |
|---|---|---|
| `utPLSQL: Run all tests` | ワークスペース内のすべてのスイートを実行 | Testing ビューの ▶ ボタン |
| `utPLSQL: Run tests in this file` | アクティブな `.pks`/`.pkb` のスイートを実行 | 右クリック → ファイル |
| `utPLSQL: Run tests in this file with coverage` | 同上、カバレッジプロファイル付き | 右クリック → ファイル |
| `utPLSQL: Run tests in this folder` | 選択したフォルダーのスイートを実行 | 右クリック → フォルダー |
| `utPLSQL: Run tests in this folder with coverage` | 同上、カバレッジプロファイル付き | 右クリック → フォルダー |
| `utPLSQL: Refresh tests` | `.pks` の再検出を強制 | — |
| `utPLSQL: Cancel execution` | 実行中の処理を停止 | — |
| `utPLSQL: Show utPLSQL information` | API/DB のバージョンをコピーオプション付きで表示 | — |
| `utPLSQL: Select additional reporter...` | データベースのレポーターを表示する QuickPick | — |
| `utPLSQL: Clear session connection` | セッションキャッシュから接続を削除 | — |
| `utPLSQL: Rerun Last` | 最後の実行を繰り返す | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | カーソル位置のテストを実行 | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | 失敗したテストのみ再実行 | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | セットアップ全体の検証（接続、UT3 インストール）を実行し、結果を表示 | — |
| `utPLSQL: Configure connection` | `utplsql.connection` で設定を開く | — |
| `utPLSQL: Copy coverage grants to clipboard` | 権限付与 SQL をクリップボードにコピー | — |
| `utPLSQL: Show Test Explorer` | Testing ビューにフォーカス | — |
| `utPLSQL: Switch connection profile...` | アクティブな接続プロファイルを切り替え（QuickPick） | ステータスバーをクリック（アクティブプロファイルあり） |
| `utPLSQL: New connection profile...` | プロファイルを作成・有効化するウィザード | — |
| `utPLSQL: Manage connection profiles` | `utplsql.profiles` で設定を開く | — |
| `utPLSQL: Import connections from SQL Developer` | SQL Developer から接続をインポート（connections.xml） | — |
| `utPLSQL: Debug test (PL/SQL)` | アクティブなファイルのテストのデバッグセッションを開始 | — |

> **Recompile UT3**（`utplsql.recompileUt3`）はパレットコマンド**ではありません** —
> "utPLSQL Setup" 診断（utPLSQL スキーマ内の無効オブジェクト）の内部クイックフィックスです。

## キーバインド

すべてのショートカットは `Ctrl+Shift+U` プレフィックスを使用します（Mac では `Cmd+Shift+U`）:

| ショートカット | コマンド |
|---|---|
| `Ctrl+Shift+U R` | すべてのテストを実行 |
| `Ctrl+Shift+U T` | ファイル内のテストを実行 |
| `Ctrl+Shift+U Shift+T` | カバレッジ付きでファイル内のテストを実行 |
| `Ctrl+Shift+U F` | テストを更新 |
| `Ctrl+Shift+U I` | utPLSQL 情報を表示 |
| `Ctrl+Shift+U C` | セッション接続をクリア |
| `Ctrl+Shift+U L` | 最後の実行を繰り返す |
| `Ctrl+Shift+U U` | カーソル位置で実行 |
| `Ctrl+Shift+U X` | 失敗したテストのみ実行 |
| `Escape` | 実行をキャンセル |

## カバレッジ

- **実行済み**の行はガターで緑色になります。**未実行**の行は赤色になります。
- **Test Coverage** タブに**ファイル/フォルダーごとのパーセンテージ**が表示されます。

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

カバレッジは `ut_file_mapper.build_file_mappings()` を使用して収集され、
`ut_coverage_cobertura_reporter` を使用して報告されます。この拡張機能は、カバレッジ対象オブジェクトを
設定 `utplsql.sourcePath` とスキーマ `utplsql.coverageOwner` を使用してソースファイルに自動的にマッピングします。

## レポーター

拡張機能は常に 3 つのデフォルトレポーターを含みます:
`ut_documentation_reporter`（stdout）、
`ut_junit_reporter`（結果 → Test Explorer）、
`ut_coverage_cobertura_reporter`（利用可能な場合のカバレッジ）。

**動的検証** — カバレッジ付きで実行する前に、拡張機能は `ALL_OBJECTS` で
データベースに問い合わせ、`UT_COVERAGE_COBERTURA_REPORTER`
が存在するかを確認します。存在しない場合（例: utPLSQL が古い）、
カバレッジはスキップされ、出力に警告が表示されます。テストの実行
がブロックされることはありません。

**追加の固定レポーター** — `utplsql.additionalReporters` 設定:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
3 つのデフォルトレポーターは、ここにリストしても自動的に
重複排除されます。

**セッションごとの一時レポーター** — **utPLSQL: Select additional
reporter...** コマンドは、データベースから動的リストを取得して QuickPick を開きます。
選択したレポーターは次の実行で使用され、その後破棄されます（設定には
保持されません）。

## データベースの要件

**カバレッジ**（常に）— プロファイラーを有効化します:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
これがないと、テストは実行されますがカバレッジは**空**になります。

**他のスキーマでのテスト検出**（utPLSQL **共有**インストール、例: 所有者 `UT3`）:
フレームワークがアプリケーションスキーマのテストを認識・解析するには、utPLSQL の所有者が
それらのスキーマの**ディクショナリを読み取る**必要があります:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` だけでは不十分** — これらのビューへの**直接**権限が必要です
  （`dbms_assert.sql_object_name` が definer コンテキストで実行されるため）。
- utPLSQL の **DDL トリガー**もインストールされている必要があります（アノテーションキャッシュを最新に保つため）。
- 確認（所有者として）: `SELECT ut_metadata.get_source_view_name FROM dual;` は `dba_source` を返すはずです。

> **スキーマごとのインストール**（utPLSQL がテストと同じスキーマにある）では、これらのスキーマ間権限は**不要**
> — フレームワークは自身のソースを読み取ります。

## 既知の制限事項

- 結果→テストのマッピングはパッケージ名 + テスト名/説明で行われます。
  異なるパッケージで同じ説明があると曖昧さが生じる可能性があります（インデックスは
  パッケージ単位でスコープされ、これを最小化します）。
- `sourcePath` の解決には**最初の**ワークスペースフォルダーを使用します。
- 検出は `.pks`（スペック）を読み取ります。`%suite`/`%test` アノテーションはスペック内に保持してください。

## トラブルシューティング

| 症状 | 考えられる原因 | 解決策 |
|---|---|---|
| スイートが表示されない | 接続の問題 | 診断には `utPLSQL: Validate configuration` を実行 |
| カバレッジが空 | `GRANT EXECUTE ON DBMS_PROFILER` が不足 | [データベースの要件](#データベースの要件)の権限を実行、または `utPLSQL: Copy coverage grants to clipboard` を使用 |
| カバレッジが空 | Oracle 19c では追加の権限が必要 | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| 原因不明のコンパイルエラー | PL/SQL 構文エラーを含むコード | `utplsql.compilationDiagnostics.enabled` を有効化（デフォルトでオン）; Problems パネルを参照 |
| 接続エラー | 文字列の形式が不正、または DB に到達できない | `utPLSQL: Validate configuration` を使用 |
| 実行中のタイムアウト | テストが `timeoutMinutes` より長い | `utplsql.timeoutMinutes` を増やす |
| `%suite` が認識されない | ファイルに `%suite`/`create package` がない、または `PROCEDURE` のない `%test` | スペックを確認; `utPLSQL: Refresh tests` を実行 |
| CodeLens が表示されない | `editor.codeLens` が無効、または競合 | `"editor.codeLens": true` を有効化; `utplsql.codeLens.enabled` を確認 |
| ショートカットが機能しない | 他の拡張機能や VSCode のショートカットと競合 | ファイル → 基本設定 → キーボードショートカット を開き、`utplsql` を検索して再定義 |

## ライセンス

MIT © Gil Cleber Barboza
