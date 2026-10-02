<!-- GENERATED FROM docs/brain/60-README/README.vi.md — DO NOT EDIT -->

<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · [Română](README.ro.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [Čeština](README.cs.md) · [Български](README.bg.md) · [Српски](README.sr.md) · [Türkçe](README.tr.md) · [Ελληνικά](README.el.md) · [Magyar](README.hu.md) · [Bahasa Indonesia](README.id.md) · **Tiếng Việt** · [ไทย](README.th.md) · [English (UK)](README.en-GB.md)

</div>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Marketplace" src="https://vsmarketplacebadges.dev/version-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Installs" src="https://vsmarketplacebadges.dev/installs-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Downloads" src="https://vsmarketplacebadges.dev/downloads-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://codecov.io/gh/thepaneb/vscode-utplsql"><img alt="Coverage" src="https://codecov.io/gh/thepaneb/vscode-utplsql/branch/main/graph/badge.svg"></a>
  <img alt="VS Code" src="https://img.shields.io/badge/VS%20Code-1.101%2B-007ACC">
  <img alt="Node" src="https://img.shields.io/badge/node-22-339933?logo=nodedotjs&logoColor=white">
  <img alt="Oracle" src="https://img.shields.io/badge/Oracle-12.2%2B-F80000?logo=oracle&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

# utPLSQL Test Runner

Chạy và gỡ lỗi kiểm thử **utPLSQL** (Oracle PL/SQL) ngay trong VS Code — **Test Explorer** gốc, độ phủ trực quan, trình gỡ lỗi PL/SQL và thực thi **Oracle trực tiếp** qua `node-oracledb`. Có **24 ngôn ngữ**; yêu cầu **VS Code 1.101+** (Node 22).

### Test Explorer và thực thi

- 🧪 **Test Explorer gốc** — các suite và bài kiểm thử xuất hiện trong khung testing; chạy theo bài kiểm thử, suite, tệp hoặc thư mục.
- 🔍 **CodeLens** — nút Run/Run with Coverage trên `%suite` và `%test` ngay trong trình soạn thảo, không cần rời khỏi mã.
- ⌨️ **Phím tắt** — tiền tố `Ctrl+Shift+U` + phím cho các lệnh chính (R = Chạy tất cả, T = Chạy tệp, L = Chạy lại lần cuối, v.v.).
- 🖱️ **Menu ngữ cảnh** — bấm chuột phải vào một **thư mục** hoặc tệp **`.pks`/`.pkb`** (trong Explorer hoặc trong trình soạn thảo) để chạy kiểm thử.
- 🔁 **Chạy lại thông minh** — Chạy lại lần cuối, Chạy tại con trỏ, Chỉ chạy các bài thất bại chỉ với một phím tắt.
- 🧩 **Cây theo schema** — tổ chức kiểm thử theo Schema > Package > Suite > Test trong Test Explorer.
- 🏷️ **Tag và thứ tự ngẫu nhiên** — lọc bài kiểm thử bằng `utplsql.tags` (ví dụ `fast & !integration`) và chạy theo thứ tự ngẫu nhiên với seed tái tạo được (`utplsql.run.randomOrder`).
- 🗄️ **Khám phá DB-first** — dựng cây từ `ut_runner.get_suites_info` và tạo lại bộ nhớ đệm chú thích từ bảng lệnh.
- 🌳 **Cây kiểm thử lazy** — ở chế độ `schema`, package/suite/test được giải quyết khi mở rộng, nên các schema lớn mở tức thì.
- 📁 **Không gian làm việc multi-root** — mỗi thư mục workspace có bộ kiểm thử riêng, với khám phá, thực thi và độ phủ độc lập.
- 🚀 **Oracle trực tiếp (qua node-oracledb)** — streaming theo thời gian thực, không cần chờ batch hoàn tất.
- 📜 **Script SQL** — chạy script hiện tại, một tệp từ Explorer hoặc cả thư mục trên hồ sơ kết nối đang hoạt động (tôn trọng charset, với `DBMS_OUTPUT` và `stopOnError`).

### Độ phủ

- 📊 **Độ phủ mã trực quan** — phần lề (gutter) tô màu theo từng dòng (đã phủ/chưa phủ) và tỷ lệ phần trăm theo tệp trong tab **Coverage**.
- 📈 **Độ phủ câu lệnh và view** — tab Coverage hiển thị `% câu lệnh` (PROCEDURE/FUNCTION) theo tệp và theo dõi các view được thực thi qua `V$SQL`.
- 🎯 **Phạm vi phủ** — thêm/loại đối tượng và regex schema/đối tượng (`utplsql.coverage.*`) để bỏ nhiễu framework và thêm các đối tượng chỉ truy cập động.
- 🗂️ **Nguồn CSDL ảo** — khi không có tệp cục bộ, *jump to failure* và độ phủ mở tài liệu chỉ-đọc lấy từ `ALL_SOURCE` (`utplsql-source:/…`).

### Trình gỡ lỗi

- 🐛 **Gỡ lỗi PL/SQL** — breakpoint và gỡ lỗi từng bước các bài kiểm thử utPLSQL qua `DBMS_DEBUG` (Debug Adapter gốc).

### Kết nối và bảo mật

- 🔌 **Hồ sơ kết nối** — lưu và chuyển đổi giữa nhiều môi trường (DEV/TEST/PROD) với cài đặt theo hồ sơ, qua thanh trạng thái hoặc command palette.
- 🔐 **TNS ở thin + wallet** — `utplsql.connections.tnsAdminPath` phân giải alias `tnsnames.ora` trong driver thin (dự phòng SQL Developer/`TNS_ADMIN`); `walletLocation` của profile và `utPLSQL: Set wallet password` lưu mật khẩu wallet trong SecretStorage.
- 🔒 **Tăng cường bảo mật kết nối** — các cài đặt kết nối nay là `machine`-scoped, tiện ích bị vô hiệu hóa trong workspace không đáng tin cậy và mật khẩu profile gắn với kết nối.
- 🔧 **Chẩn đoán thiết lập** — xác thực chủ động kết nối, quyền (grants) và phiên bản kèm quick-fix.

### Báo cáo

- 🧾 **Run with Reporter (Export)** — chạy vùng chọn với bất kỳ reporter nào của CSDL và ghi kết quả ra Output hoặc tệp (`utplsql.reporter.*`), không thay đổi kết quả trong Test Explorer.

### UX và chẩn đoán

- ✅ **Trang trí nội tuyến** — các biểu tượng ✓/✗/⚠ trong trình soạn thảo sau khi chạy, kèm tooltip lỗi và thanh overview ruler.
- 📌 **Thanh trạng thái** — chỉ báo số lượng đạt/không đạt, thời lượng và tiến trình theo thời gian thực.
- 🎯 **Nhảy tới lỗi** — điều hướng trực tiếp tới dòng của assertion bị lỗi (qua "Go to Error" gốc).
- 🧱 **Chẩn đoán biên dịch** — sau mỗi lần chạy, lỗi biên dịch PL/SQL (`ALL_ERRORS`) hiện trong Problems Panel dưới source `utPLSQL Compilation` (cài đặt `utplsql.compilationDiagnostics.enabled`).
- ⏳ **Tiến trình và hủy** — các lần chạy dài hiển thị thông báo tiến trình kèm số đếm và nút *Cancel* (và `utplsql.timeoutMinutes` tùy chọn).
- 🌍 **i18n — 24 ngôn ngữ** — `utplsql.language` theo VSCode (24 locale: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).


## Cài đặt

Extension có thể được cài đặt theo hai cách:

1. **Từ Marketplace:** Tìm **utPLSQL Test Runner** trong bảng extensions của VSCode (`Ctrl+Shift+X`) rồi bấm **Install**.
2. **Thủ công (.vsix):** Tải tệp `.vsix` của phiên bản mong muốn và cài đặt nó trong VSCode:
   * **Qua dòng lệnh:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Qua giao diện:** Mở bảng Extensions (`Ctrl+Shift+X`), bấm vào ba dấu chấm `...` (góc trên bên phải) và chọn **Install from VSIX...**.

## Yêu cầu

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** được cài đặt trong cơ sở dữ liệu Oracle.
- **VSCode 1.101+** (Node 22).

Extension chỉ là "client đồ họa" — thứ thực sự chạy kiểm thử là cơ sở dữ liệu trực tiếp (node-oracledb).

## Kết nối

Extension cần một chuỗi kết nối Oracle để chạy kiểm thử. Thứ tự phân giải như sau:

1. **Hồ sơ kết nối đang hoạt động** — `utplsql.activeProfile` trỏ tới một hồ sơ trong `utplsql.profiles` (ghi đè mọi thứ bên dưới).
2. **Cài đặt `utplsql.connection`** — được đọc từ `settings.json` của dự án/người dùng.
3. **Biến môi trường `UTPLSQL_CONN`** — được đặt trước khi mở VSCode.
4. **Bộ nhớ đệm phiên** — nếu người dùng đã gõ kết nối qua prompt.
5. **Hỏi người dùng** — hỏi và chỉ giữ trong phiên hiện tại.

Các hồ sơ kết nối (`utplsql.profiles`) cũng có thể ghi đè `sourcePath`, `coverageOwner` v.v. theo từng môi trường — xem `utplsql.activeProfile` trong bảng cấu hình.

⚠️ **Khuyến nghị bảo mật:** chuỗi kết nối chứa mật khẩu. **KHÔNG** dùng cài đặt
`utplsql.connection` trong các môi trường dùng chung (settings.json có thể bị quản lý phiên bản
hoặc lộ cho người khác). Thay vào đó, **hãy dùng biến môi trường `UTPLSQL_CONN`**:

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

Nếu cả cài đặt lẫn biến môi trường đều không được định nghĩa, extension sẽ hỏi chuỗi kết nối và
chỉ giữ nó trong bộ nhớ ở phiên hiện tại — dùng lệnh
**utPLSQL: Clear session connection** (command palette) để xóa.

**Các định dạng được chấp nhận:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias`
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

> 🔒 **Cài đặt được tăng cường:** các cài đặt kết nối là **`scope machine`**; tiện ích bị **vô hiệu hóa trong workspace không đáng tin cậy**; mật khẩu hồ sơ **gắn với kết nối của nó**. (`utplsql.connection`, `utplsql.profiles`, `utplsql.activeProfile`, `utplsql.oracleClientLibDir`, `utplsql.oracleClientConfigDir`, `utplsql.connections.tnsAdminPath`)

## Cách hoạt động

### Chế độ Oracle trực tiếp (v0.9.0)

Không có tệp tạm, không chờ batch. Kết quả xuất hiện trong
Test Explorer **ngay khi từng bài kiểm thử hoàn tất**. VSIX đã kèm driver mỏng `oracledb` (không cần Instant Client).

**Tương thích Oracle / utPLSQL:**

| Oracle | utPLSQL | Ghi chú |
|---|---|---|
| 18c+ | v3.2.x (18c+) / v3.1.x | Khuyến nghị; charset `AL32UTF8`. |
| 12.2 | chỉ v3.1.x | v3.2.x không biên dịch được (`PLS-00222`). `WE8DEC` của image làm mất các ký tự không biểu diễn được (ví dụ `€`); driver mỏng bỏ qua `NLS_LANG`. |

## Cấu hình

| Cài đặt | Mặc định | Mô tả |
|---|---|---|
| `utplsql.connection` | `""` | Chuỗi kết nối Oracle. **Để trống** và dùng biến môi trường `UTPLSQL_CONN` để tránh lưu mật khẩu. Nếu cả hai đều trống, extension sẽ hỏi (chỉ giữ trong phiên). |
| `utplsql.sourcePath` | `install` | Thư mục chứa mã sản phẩm (để ánh xạ độ phủ tới các tệp). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Các glob để tìm các spec chứa `%suite`/`%test`. Nếu kiểm thử của bạn nằm trong `.sql`, dùng `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Schema sở hữu các đối tượng được phủ. Trống = dùng người dùng kết nối (in hoa). |
| `utplsql.coverage.schemes` | `[]` | Schema được phủ (`a_coverage_schemes`). Trống = người dùng kết nối (hoặc `utplsql.coverageOwner`). |
| `utplsql.coverage.includeObjects` | `[]` | Đối tượng đưa vào phạm vi phủ, dạng `OWNER.NAME` (ví dụ `["APP.MY_PKG"]`). Hữu ích cho các đối tượng chỉ được truy cập động. |
| `utplsql.coverage.excludeObjects` | `[]` | Đối tượng loại khỏi phạm vi phủ, dạng `OWNER.NAME` (ví dụ `["UT3.UT_COVERAGE"]`). |
| `utplsql.coverage.includeSchemaExpr` | `""` | Regex schema đưa vào phạm vi phủ (ví dụ `^APP$`). |
| `utplsql.coverage.includeObjectExpr` | `""` | Regex đối tượng đưa vào phạm vi phủ. |
| `utplsql.coverage.excludeSchemaExpr` | `""` | Regex schema loại khỏi phạm vi phủ. |
| `utplsql.coverage.excludeObjectExpr` | `""` | Regex đối tượng loại khỏi phạm vi phủ (ví dụ `^UT_` cho framework utPLSQL). |
| `utplsql.timeoutMinutes` | `60` | Thời gian chờ (phút). |
| `utplsql.dbmsOutput` | `false` | Bật `DBMS_OUTPUT` trong phiên kiểm thử. |
| `utplsql.additionalReporters` | `[]` | Các reporter bổ sung đưa vào mỗi lần chạy (ví dụ `["ut_coverage_html_reporter"]`). Các reporter mặc định (documentation, junit) luôn được bao gồm và không cần liệt kê. |
| `utplsql.reporter.clientCharacterSet` | `""` | Charset máy khách (`a_client_character_set`) cho **Run with Reporter (Export)**. Trống = mặc định của reporter. |
| `utplsql.reporter.colorConsole` | `false` | Bật màu ANSI (`a_color_console`) cho reporter console dạng văn bản khi xuất. |
| `utplsql.tags` | `""` | Biểu thức tag của utPLSQL để lọc bài kiểm thử nào sẽ chạy (ví dụ `fast & !integration`). Để trống là chạy tất cả. |
| `utplsql.run.randomOrder` | `false` | Chạy các bài kiểm thử theo thứ tự ngẫu nhiên để phát hiện phụ thuộc thứ tự giữa chúng. |
| `utplsql.run.randomOrderSeed` | `0` | Seed của thứ tự ngẫu nhiên. `0` = do cơ sở dữ liệu chọn (không thể tái tạo); > 0 tái tạo cùng thứ tự. |
| `utplsql.codeLens.enabled` | `true` | Hiển thị các nút CodeLens Run/Run with Coverage trên `%suite` và `%test`. |
| `utplsql.statusBar.enabled` | `true` | Hiển thị chỉ báo trạng thái kiểm thử trên thanh trạng thái. |
| `utplsql.decorations.enabled` | `true` | Hiển thị các trang trí đạt/không đạt trên các dòng `%suite` và `%test` sau khi chạy. |
| `utplsql.oraclePoolMin` | `2` | Số kết nối tối thiểu giữ trong pool của Oracle runner (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Số kết nối tối đa trong pool của Oracle runner (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Mức tăng khi mở rộng pool của Oracle runner (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Số giây giữa các lần kiểm tra sức khỏe của các kết nối nhàn rỗi trong pool (node-oracledb). `0` = ping mỗi lần checkout. |
| `utplsql.oracleClientMode` | `thin` | Chế độ trình điều khiển: `thin` (JavaScript thuần, không cần client gốc) hoặc `thick` (dùng Oracle Instant Client). Chỉ dùng `thick` cho cơ sở dữ liệu yêu cầu NNE (Native Network Encryption); cần `utplsql.oracleClientLibDir` và tải lại cửa sổ. |
| `utplsql.oracleClientLibDir` | `""` | Thư mục Oracle Instant Client. Bắt buộc khi `utplsql.oracleClientMode` là `thick` (ví dụ `C:\oracle\instantclient_23_5`). |
| Gỡ lỗi không dừng tại breakpoint | Gói không có thông tin gỡ lỗi hoặc thiếu quyền gỡ lỗi | Biên dịch với `PLSQL_OPTIMIZE_LEVEL <= 1` (hoặc `ALTER PACKAGE ... COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) và cấp `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. Breakpoint trong `test_*.pkb` có thể không dừng (utPLSQL chạy test bằng SQL động); hãy đặt chúng trong mã đang kiểm thử. |
| `utplsql.oracleClientConfigDir` | `""` | Thư mục cấu hình Oracle (TNS_ADMIN) chứa `sqlnet.ora`/`tnsnames.ora`. Tùy chọn; chỉ được dùng ở chế độ thick. |
| `utplsql.connections.tnsAdminPath` | `""` | Thư mục chứa `tnsnames.ora` để **phân giải alias TNS trong driver thin**. Thứ tự: cài đặt này → giá trị user/machine của `sqldeveloper.connections.tnsConfiguration.path` → `TNS_ADMIN`. |
| `utplsql.organization` | `file` | Tổ chức cây: `file` (theo đường dẫn), `schema` (Schema > Package > Suite > Test) hoặc `tag` (Tag > Suite > Test). Trong chế độ `schema`, các suite cũng được phát hiện từ cơ sở dữ liệu (`ut_runner.get_suites_info`, dự phòng về `ALL_OBJECTS`/`ALL_SOURCE`) khi các tệp `.pks` không nằm trong workspace — với URI ảo `utplsql-db:/` (thực thi và nhảy tới lỗi hoạt động; không có CodeLens/trang trí). · `utplsql-source:/` |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob để trích xuất schema từ đường dẫn. Dùng `{schema}` làm placeholder. Trong chế độ `schema`, các thư mục bên dưới gốc của pattern (ví dụ `db/*`) định nghĩa các schema được truy vấn trong cơ sở dữ liệu. |
| `utplsql.discovery.source` | `auto` | Nguồn của cây trong chế độ `schema`: `auto` dùng API cơ sở dữ liệu (`ut_runner.get_suites_info`) và chuyển sang `ALL_SOURCE`/tệp khi không khả dụng; `database` bắt buộc dùng API; `file` tắt khám phá qua cơ sở dữ liệu. |
| `utplsql.refreshDebounceMs` | `300` | Debounce (ms) để gộp các sự kiện theo dõi tệp `.pks`/`.pkb` trước khi làm mới Test Explorer. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Hiển thị lỗi biên dịch PL/SQL từ cơ sở dữ liệu (`ALL_ERRORS`) dưới dạng gạch chân trong trình soạn thảo và trong bảng Problems (nguồn "utPLSQL Compilation"). |
| `utplsql.setupDiagnostics.enabled` | `true` | Hiển thị chẩn đoán cấu hình (kết nối, quyền, phiên bản) và **tính toàn vẹn của bản cài utPLSQL** (các đối tượng không hợp lệ trong schema UT3, kèm quick-fix "Recompile UT3") với các hành động quick-fix. |
| `utplsql.showTagsInTree` | `false` | Thêm `%tags` của mỗi suite/bài kiểm thử làm hậu tố `[tag1, tag2]` trên nhãn Test Explorer. |
| `utplsql.profiles` | `[]` | Các hồ sơ kết nối Oracle đã lưu (tên, kết nối và ghi đè `sourcePath`/`coverageOwner`/v.v.) để chuyển đổi giữa các môi trường. **Mật khẩu được lưu trong keychain của hệ điều hành (VS Code SecretStorage), không lưu trong cài đặt** — trường `connection` chỉ lưu `user@//host:port/service`. Các hồ sơ cũ có mật khẩu nội tuyến sẽ được tự động di trú trong lần sử dụng đầu tiên. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID của hồ sơ đang hoạt động (`utplsql.profiles`). Khi được đặt, ghi đè `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Theo dõi các view được thực thi qua `V$SQL` (độ phủ boolean). Cần `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Bật gỡ lỗi kiểm thử PL/SQL (`DBMS_DEBUG`). Cần `node-oracledb` + grants. Biên dịch gói đích với thông tin gỡ lỗi (`PLSQL_OPTIMIZE_LEVEL <= 1`) và cấp `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. |
| `utplsql.debugger.stopOnException` | `true` | Tạm dừng khi có exception PL/SQL trong lúc gỡ lỗi. |
| `utplsql.debugger.timeoutSeconds` | `300` | Thời gian chờ (giây) của phiên gỡ lỗi. |
| `utplsql.debugger.compileOnDebug` | `false` | Biên dịch đối tượng với thông tin gỡ lỗi (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) trước khi bắt đầu phiên gỡ lỗi. |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | Ngôn ngữ của các thông báo runtime. `auto` theo VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; nếu không thì en). Bao phủ **24 locale**. |

Ví dụ (`.vscode/settings.json` của dự án):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

Và, trước khi mở VSCode (hoặc trong PowerShell profile):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Dành cho người đóng góp

Tạo một tệp `.env` ở thư mục gốc của dự án (gitignored) với các biến môi
trường được dùng bởi các bài kiểm thử tích hợp:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Sử dụng

1. Mở dự án PL/SQL (với mã và các package kiểm thử).
2. Biên dịch mã và kiểm thử trong cơ sở dữ liệu (extension Oracle / SQLcl).
3. Mở khung **Testing** → các suite xuất hiện.
4. Chạy:
   - Qua **CodeLens** — nút ▶ Run/Run with Coverage trên từng `%suite` và `%test` trong trình soạn thảo.
   - Qua **gutter** bên cạnh mỗi bài kiểm thử/suite, hoặc
   - Qua **phím tắt** (`Ctrl+Shift+U R` = Chạy tất cả, `Ctrl+Shift+U T` = Chạy tệp, v.v.), hoặc
   - Nút **Run Tests** của khung Test Explorer, hoặc
   - **Bấm chuột phải** vào thư mục/tệp → *utPLSQL: Run tests…* (có hoặc không có coverage).
5. Sau khi chạy, xem:
   - **Trang trí nội tuyến** (✓/✗/⚠) trong trình soạn thảo cạnh các annotation kiểm thử.
   - **Thanh trạng thái** với số lượng đạt/không đạt và tổng thời lượng.
   - **Test Explorer** với kết quả chi tiết.
6. Để đo độ phủ, dùng profile **Run with Coverage** (hoặc mục menu "with coverage").
7. Để lặp lại nhanh các lần chạy:
   - `Ctrl+Shift+U L` — **Rerun Last** (lặp lại lần chạy cuối, có hoặc không có coverage).
   - `Ctrl+Shift+U U` — **Run at Cursor** (chạy `%test`/`%suite` dưới con trỏ).
   - `Ctrl+Shift+U X` — **Run Failed Only** (chỉ chạy các bài kiểm thử bị lỗi).
8. **Với Oracle trực tiếp (streaming):** không cần cài gì thêm — VSIX đã kèm driver mỏng `oracledb`.
9. Để chẩn đoán, dùng `utPLSQL: Show information` trong palette — hiển thị phiên bản API/DB kèm tùy chọn sao chép.
10. **utPLSQL: Select additional reporter...** — QuickPick với các reporter có sẵn trong cơ sở dữ liệu.
11. **utPLSQL: Cancel run** — dừng lần chạy đang thực hiện (`Escape` trong lúc chạy).
12. **utPLSQL: Refresh tests** — ép phát hiện lại các tệp `.pks`.

> 💡 **Khi viết kiểm thử:** bộ phân tích được điều khiển bằng token — chỉ cần có `%suite`
> và khai báo `create package` trong tệp, và mỗi `%test` theo sau bởi
> `PROCEDURE` của nó. Không có yêu cầu về dòng trống.

### Các annotation được hỗ trợ (v0.10.0+)

Ngoài `%suite` và `%test`, việc phát hiện còn hiểu:

| Annotation | Ảnh hưởng trên Test Explorer |
|---|---|
| `-- %disabled` | Suite hoặc bài kiểm thử **không xuất hiện** trong cây (bị bỏ qua khi phát hiện) |
| `-- %throws(-20001)` | Đánh dấu rằng bài kiểm thử mong đợi exception 20001 (metadata `expectedError`) |
| `-- %tags(fast, critical)` | Tag của bài kiểm thử; lọc lần chạy bằng cài đặt `utplsql.tags` (ví dụ `fast & !integration`) |
| `-- %displayname(Name)` | Tên tùy chỉnh hiển thị thay cho mô tả của `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Đánh dấu suite với các lifecycle hooks (metadata) |

Các annotation không phân biệt hoa thường. Trong phần đầu của suite (giữa `%suite` và
`%test` đầu tiên) chúng áp dụng cho suite; sau `%test`, chúng áp dụng cho bài kiểm thử.

## Lệnh

Tất cả các lệnh của extension (palette `Ctrl+Shift+P` tiền tố `utPLSQL:`):

| Lệnh | Mô tả | Phím tắt UI |
|---|---|---|
| `utPLSQL: Run all tests` | Chạy tất cả các suite trong workspace | Nút ▶ trong khung Testing |
| `utPLSQL: Run tests in this file` | Chạy các suite của tệp `.pks`/`.pkb` đang mở | Chuột phải → tệp |
| `utPLSQL: Run tests in this file with coverage` | Tương tự, với profile coverage | Chuột phải → tệp |
| `utPLSQL: Run tests in this folder` | Chạy các suite của thư mục đã chọn | Chuột phải → thư mục |
| `utPLSQL: Run tests in this folder with coverage` | Tương tự, với profile coverage | Chuột phải → thư mục |
| `utPLSQL: Refresh tests` | Ép phát hiện lại các tệp `.pks` | — |
| `utPLSQL: Cancel run` | Dừng lần chạy đang thực hiện | — |
| `utPLSQL: Show utPLSQL info` | Phiên bản API/DB kèm tùy chọn sao chép | — |
| `utPLSQL: Select additional reporter...` | QuickPick với các reporter trong cơ sở dữ liệu | — |
| `utPLSQL: Clear session connection` | Xóa kết nối khỏi bộ nhớ đệm phiên | — |
| `utPLSQL: Rerun Last` | Lặp lại lần chạy cuối | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Chạy bài kiểm thử dưới con trỏ | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Chạy lại chỉ các bài kiểm thử bị lỗi | `Ctrl+Shift+U X` |
| `utPLSQL: Validate setup` | Chạy xác thực thiết lập đầy đủ (kết nối, cài đặt UT3) và hiển thị kết quả | — |
| `utPLSQL: Configure connection` | Mở cài đặt tại `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Sao chép SQL grants vào clipboard | — |
| `utPLSQL: Show Test Explorer` | Đưa tiêu điểm vào khung Testing | — |
| `utPLSQL: Switch connection profile...` | Chuyển hồ sơ kết nối đang hoạt động (QuickPick) | Bấm vào thanh trạng thái (khi có hồ sơ đang hoạt động) |
| `utPLSQL: New connection profile...` | Wizard tạo và kích hoạt một hồ sơ | — |
| `utPLSQL: Manage connection profiles` | Mở cài đặt tại `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Nhập kết nối từ SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Bắt đầu phiên gỡ lỗi của bài kiểm thử trong tệp đang mở | — |
| `utPLSQL: Tạo lại bộ nhớ đệm chú thích` | Tạo lại bộ nhớ đệm chú thích utPLSQL trong cơ sở dữ liệu và làm mới cây | — |
| `utPLSQL: Biên dịch để gỡ lỗi` | Biên dịch đối tượng của tệp/thư mục đã chọn với thông tin gỡ lỗi | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |
| `utPLSQL: Đặt mật khẩu ví` | Đặt/xóa mật khẩu ví của hồ sơ đang hoạt động (SecretStorage) | — |
| `utPLSQL: Chạy với reporter (xuất)` | Chạy lựa chọn với reporter đã chọn và ghi đầu ra vào Output/tệp (không đổi kết quả) | Test Explorer → menu do item |

> **Recompile UT3** (`utplsql.recompileUt3`) **không phải** là lệnh palette — nó là
> quick-fix nội bộ của diagnostic "utPLSQL Setup" (các đối tượng không hợp lệ trong
> schema utPLSQL).

## Phím tắt

Tất cả các phím tắt dùng tiền tố `Ctrl+Shift+U` (`Cmd+Shift+U` trên Mac):

| Phím tắt | Lệnh |
|---|---|
| `Ctrl+Shift+U R` | Chạy tất cả các bài kiểm thử |
| `Ctrl+Shift+U T` | Chạy các bài kiểm thử trong tệp |
| `Ctrl+Shift+U Shift+T` | Chạy các bài kiểm thử trong tệp có coverage |
| `Ctrl+Shift+U F` | Làm mới các bài kiểm thử |
| `Ctrl+Shift+U I` | Hiển thị thông tin utPLSQL |
| `Ctrl+Shift+U C` | Xóa kết nối phiên |
| `Ctrl+Shift+U L` | Chạy lại lần cuối |
| `Ctrl+Shift+U U` | Chạy tại con trỏ |
| `Ctrl+Shift+U X` | Chỉ chạy các bài bị lỗi |
| `Escape` | Hủy lần chạy |

## Độ phủ

- Các dòng **đã thực thi** chuyển sang màu xanh ở gutter; các dòng **chưa thực thi** chuyển sang màu đỏ.
- Tab **Test Coverage** hiển thị **phần trăm theo tệp/thư mục**.



## Bộ báo cáo (Reporters)

Extension luôn kèm **hai** reporter mặc định:
`ut_documentation_reporter` (stdout) và
`ut_junit_reporter` (kết quả → Test Explorer). `ut_coverage_cobertura_reporter`
được thêm **chỉ khi chạy với độ phủ**.

**Xác thực động** — trước khi chạy với độ phủ, extension truy vấn
cơ sở dữ liệu qua `TABLE(ut_runner.get_reporters_list())`. Nếu
`UT_COVERAGE_COBERTURA_REPORTER` không tồn tại trong cơ sở dữ liệu (ví dụ utPLSQL
đã cũ), độ phủ sẽ bị bỏ qua kèm cảnh báo trong output. Việc thực thi kiểm thử
không bao giờ bị chặn.

**Các reporter cố định bổ sung** — cài đặt `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Các reporter mặc định tự động được loại bỏ trùng (deduplicated), kể cả khi được
liệt kê ở đây.

**Reporter tạm theo phiên** — lệnh **Chọn reporter bổ sung...** mở QuickPick với danh sách từ cơ sở dữ liệu; reporter đã chọn được lưu trong phiên và **áp dụng cho lần chạy kế tiếp**.

## Yêu cầu cơ sở dữ liệu

**Độ phủ (luôn luôn)** — bật profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Không có điều này, kiểm thử vẫn chạy nhưng độ phủ ra **trống**.

**Phát hiện kiểm thử trong các schema KHÁC** (bản cài utPLSQL **dùng chung**, ví dụ owner `UT3`):
để framework nhìn thấy và phân tích các bài kiểm thử của các schema ứng dụng, owner của utPLSQL cần
**đọc từ điển** của các schema đó:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **Chỉ riêng `SELECT ANY DICTIONARY` là KHÔNG đủ** — cần các grant **trực tiếp** trên các view đó
  (vì `dbms_assert.sql_object_name` trong ngữ cảnh definer).
- **Trigger DDL** của utPLSQL cũng phải được cài đặt (giữ cho bộ nhớ đệm annotation luôn cập nhật).
- Kiểm tra (với tư cách owner): `SELECT ut_metadata.get_source_view_name FROM dual;` sẽ trả về `dba_source`.

> Trong các bản cài **per-schema** (utPLSQL trong cùng schema với kiểm thử), các grant xuyên schema này **không**
> cần thiết — framework đọc nguồn của chính nó.

## Hạn chế đã biết

- Việc ánh xạ kết quả→bài kiểm thử được thực hiện theo tên package + tên/mô tả bài kiểm thử;
  các mô tả giống hệt nhau trong các package khác nhau có thể tạo ra sự mơ hồ (chỉ mục được
  giới hạn theo package để giảm thiểu điều này).
- Chỉ xét **thư mục workspace đầu tiên** để phân giải `sourcePath`.
- Việc phát hiện đọc các tệp `.pks` (specs); hãy giữ các annotation `%suite`/`%test` trong spec.

## Xử lý sự cố

| Triệu chứng | Nguyên nhân có thể | Giải pháp |
|---|---|---|
| Các suite không xuất hiện | Không có tệp `.pks` được phát hiện | Chạy `utPLSQL: Validate setup` để chẩn đoán |
| Độ phủ trống | Thiếu `GRANT EXECUTE ON DBMS_PROFILER` | Chạy các grant trong [Yêu cầu cơ sở dữ liệu](#yêu-cầu-cơ-sở-dữ-liệu) hoặc dùng `utPLSQL: Copy coverage grants to clipboard` |
| Độ phủ trống | Oracle 19c cần thêm grant | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Lỗi biên dịch không kèm chỉ dẫn | Mã có lỗi cú pháp PL/SQL | Giữ bật `utplsql.compilationDiagnostics.enabled` (mặc định); lỗi từ `ALL_ERRORS` xuất hiện trong bảng Problems sau khi chạy |
| Lỗi kết nối | Chuỗi sai định dạng hoặc DB không truy cập được | Dùng `utPLSQL: Validate setup` |
| Hết thời gian khi chạy | Kiểm thử lâu hơn `timeoutMinutes` | Tăng `utplsql.timeoutMinutes` |
| `%suite` không được nhận diện | Thiếu `%suite`/`create package` trong tệp, hoặc `%test` không có `PROCEDURE` | Kiểm tra spec; chạy `utPLSQL: Refresh tests` |
| CodeLens không xuất hiện | `editor.codeLens` bị tắt hoặc xung đột | Bật `"editor.codeLens": true`; kiểm tra `utplsql.codeLens.enabled` |
| Phím tắt không hoạt động | Xung đột với extension hoặc phím tắt VSCode khác | Vào File → Preferences → Keyboard Shortcuts và tìm `utplsql` để gán lại |
| Cần chẩn đoán | Không rõ extension đang làm gì bên trong | Đặt `UTPLSQL_DEBUG=1` trước khi khởi chạy VSCode để bật log chẩn đoán (ngữ cảnh của lỗi kết nối/discovery/coverage) trong bảng điều khiển Extension Host |

## Tuyên bố miễn trừ trách nhiệm

Đây là một dự án cộng đồng độc lập. Dự án này không liên kết, không được xác nhận hay tài trợ bởi nhóm phát triển framework utPLSQL hay Oracle Corporation. utPLSQL và Oracle là nhãn hiệu của chủ sở hữu tương ứng.

## Giấy phép

MIT © Gil Cleber Barboza
