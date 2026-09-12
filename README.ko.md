<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · **한국어** · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

[utPLSQL](https://www.utplsql.org/)을 VSCode에 통합하여 PL/SQL 테스트를 네이티브 **Test Explorer**, 컨텍스트 메뉴, 시각적 커버리지와 함께 제공합니다.

- 🧪 **네이티브 Test Explorer** — 테스트 뷰에 스위트와 테스트가 표시됩니다. 테스트, 스위트, 파일 또는 폴더 단위로 실행할 수 있습니다.
- 🔍 **CodeLens** — 코드를 떠나지 않고 편집기의 `%suite` 및 `%test` 위에 Run/Run with Coverage 버튼을 표시합니다.
- ⌨️ **키보드 단축키** — `Ctrl+Shift+U` 접두사 + 주요 명령 키(R = Run All, T = Run File, L = Rerun Last 등).
- 🖱️ **컨텍스트 메뉴** — **폴더** 또는 **`.pks`/`.pkb`** 파일(Explorer 또는 편집기에서)을 마우스 오른쪽 버튼으로 클릭하여 테스트를 실행합니다.
- 📊 **시각적 커버리지** — 줄별 색상 구터(실행됨/실행 안 됨)와 **Coverage** 탭의 파일별 백분율.
- ✅ **인라인 데코레이션** — 실행 후 편집기에 ✓/✗/⚠ 아이콘, 실패 툴팁 및 overview ruler 표시.
- 📌 **상태 표시줄** — 통과/실패 개수, 소요 시간, 실시간 진행률 표시기.
- 🔁 **스마트 재실행** — 단일 단축키로 Rerun Last, Run at Cursor, Run Failed Only.
- 🚀 **Oracle 직접 실행(node-oracledb 사용)** — 배치 완료를 기다리지 않고 실시간 스트리밍.
- 🔧 **설정 진단** — 연결, 권한 및 버전에 대한 선제적 검증 및 quick-fix.
- 🧩 **스키마 인식 트리** — Test Explorer에서 Schema > Package > Suite > Test로 테스트를 구성.
- 🎯 **실패 지점으로 이동** — 실패한 단언의 줄로 직접 이동(네이티브 "Go to Error" 사용).
- 🔌 **연결 프로필** — 프로필별 설정으로 여러 환경(DEV/TEST/PROD)을 저장하고 전환(상태 표시줄 또는 명령 팔레트를 통해).
- 📈 **문장 및 뷰 커버리지** — Coverage 탭에 파일별 `% of statements`(PROCEDURE/FUNCTION)를 표시하고 `V$SQL`을 통해 실행된 뷰를 추적.
- 🐛 **PL/SQL 디버그** — `DBMS_DEBUG`를 통한 utPLSQL 테스트의 중단점 및 단계 디버깅(네이티브 Debug Adapter).
- 🌍 **i18n — 24개 언어** — `utplsql.language`가 VSCode를 따릅니다(15개 네이티브 + 9개 커뮤니티: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## 설치

확장 프로그램은 두 가지 방법으로 설치할 수 있습니다:

1. **마켓플레이스에서:** VSCode 확장 패널(`Ctrl+Shift+X`)에서 **utPLSQL Test Runner**를 검색하고 **Install**을 클릭합니다.
2. **수동(.vsix):** 원하는 버전의 `.vsix` 파일을 다운로드하여 VSCode에 설치합니다:
   * **명령줄을 통해:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **인터페이스를 통해:** 확장 패널(`Ctrl+Shift+X`)을 열고 오른쪽 위 모서리의 점 세 개 `...`를 클릭한 다음 **Install from VSIX...**를 선택합니다.

## 요구 사항

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** 이 Oracle 데이터베이스에 설치되어 있어야 합니다.
- 데이터베이스 외에는 아무것도 필요하지 않습니다 — VSIX에 thin `oracledb` 드라이버가 이미 포함되어 있습니다(Instant Client 불필요).
- **VSCode 1.88+** (Test Coverage API).

확장 프로그램은 "그래픽 클라이언트"일 뿐입니다 — 테스트를 실행하는 것은 데이터베이스입니다: node-oracledb 직접 연결을 통해.

## 연결

확장 프로그램이 테스트를 실행하려면 Oracle 연결 문자열이 필요합니다. 해석 순서는 다음과 같습니다:

1. **활성 연결 프로필** — `utplsql.activeProfile`이 `utplsql.profiles`의 프로필을 가리킵니다(아래의 모든 항목을 재정의합니다).
2. **`utplsql.connection` 설정** — 프로젝트/사용자 `settings.json`에서 읽습니다.
3. **`UTPLSQL_CONN` 환경 변수** — VSCode를 열기 전에 설정합니다.
4. **세션 캐시** — 사용자가 프롬프트를 통해 연결을 이미 입력한 경우.
5. **사용자에게 프롬프트** — 현재 세션에만 물어보고 유지합니다.

연결 프로필(`utplsql.profiles`)은 환경별로 `sourcePath`, `coverageOwner` 등을 재정의할 수도 있습니다 — 구성 표의 `utplsql.activeProfile`을 참조하세요.

⚠️ **보안 권장 사항:** 연결 문자열에는 비밀번호가 포함됩니다. 공유 환경에서 `utplsql.connection`
설정을 **사용하지 마세요**(settings.json이 버전 관리되거나 다른 사람에게 보일 수 있음).
대신 **`UTPLSQL_CONN` 환경 변수를 사용하세요**:

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

설정도 환경 변수도 정의되어 있지 않으면 확장 프로그램이 연결을 물어보고
세션 중에 메모리에만 유지합니다 — **utPLSQL: Clear session connection** 명령
(명령 팔레트)을 사용하여 지울 수 있습니다.

**허용되는 형식:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS 별칭**: `user/pass@tns_alias`(`TNS_ADMIN` 구성 필요)
- **Wallet(Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## 작동 방식

확장 프로그램이 node-oracledb를 통해 Oracle 데이터베이스에 직접 연결하여 테스트를 실행합니다.

임시 파일이 없고 배치를 기다리지 않습니다. 결과는 **각 테스트가 완료될 때마다**
Test Explorer에 나타납니다.

## 구성

| 설정 | 기본값 | 설명 |
|---|---|---|
| `utplsql.connection` | `""` | Oracle 연결. **비워 두고** 비밀번호 저장을 피하려면 `UTPLSQL_CONN` 환경 변수를 사용하세요. 둘 다 비어 있으면 확장 프로그램이 묻습니다(세션에만 유지). |
| `utplsql.sourcePath` | `install` | 프로덕션 코드 폴더(커버리지를 파일에 매핑하기 위해). |
| `utplsql.includePatterns` | `["**/*.pks"]` | `%suite`/`%test`가 있는 스펙을 발견하기 위한 glob. 테스트가 `.sql`에 있으면 `["**/*.sql"]`을 사용하세요. |
| `utplsql.coverageOwner` | `""` | 커버리지 대상 객체의 스키마 소유자. 비어 있음 = 연결 사용자 사용(대문자). |
| `utplsql.timeoutMinutes` | `60` | 실행 시간 제한(분). |
| `utplsql.dbmsOutput` | `false` | 테스트 세션에서 `DBMS_OUTPUT`을 활성화합니다. |
| `utplsql.additionalReporters` | `[]` | 모든 실행에 포함할 추가 리포터(예: `["ut_coverage_html_reporter"]`). 기본값(documentation, junit, coverage)은 항상 포함되며 나열할 필요가 없습니다. |
| `utplsql.codeLens.enabled` | `true` | `%suite` 및 `%test` 위에 Run/Run with Coverage CodeLens 버튼을 표시합니다. |
| `utplsql.statusBar.enabled` | `true` | 상태 표시줄에 테스트 상태 표시기를 표시합니다. |
| `utplsql.decorations.enabled` | `true` | 실행 후 `%suite` 및 `%test` 줄에 통과/실패 데코레이션을 표시합니다. |
| `utplsql.oraclePoolMin` | `2` | Oracle 러너 풀에 유지되는 최소 연결 수(node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Oracle 러너 풀의 최대 연결 수(node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Oracle 러너 풀 확장 시 증가분(node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | 유휴 풀 연결의 상태 검사 간격(초)(node-oracledb). `0` = 모든 체크아웃 시 ping. |
| `utplsql.organization` | `file` | 트리 구성: `file`(경로별) 또는 `schema`(Schema > Package > Suite > Test). `schema` 모드에서 워크스페이스에 `.pks` 파일이 없으면 스위트가 데이터베이스(`ALL_OBJECTS`/`ALL_SOURCE`)에서도 발견됩니다 — 가상 URI `utplsql-db:/`(CodeLens/데코레이션/실패 지점 이동 없음). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | 경로에서 스키마를 추출하는 glob 패턴. `{schema}`를 자리 표시자로 사용하세요. `schema` 모드에서 패턴 기본 아래의 디렉터리(예: `db/*`)는 데이터베이스에서 조회할 스키마를 정의합니다. |
| `utplsql.compilationDiagnostics.enabled` | `true` | PL/SQL 컴파일 오류를 편집기의 밑줄과 Problems 패널에 표시합니다. |
| `utplsql.setupDiagnostics.enabled` | `true` | 구성 진단(연결, 권한, 버전) 및 **utPLSQL 설치 무결성**(UT3 스키마의 잘못된 객체, "Recompile UT3" quick-fix 포함)을 quick-fix 작업과 함께 표시합니다. |
| `utplsql.profiles` | `[]` | 저장된 Oracle 연결 프로필(이름, 연결, 그리고 `sourcePath`/`coverageOwner` 등의 재정의) — 환경 간 전환용. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | 활성 프로필(`utplsql.profiles`)의 ID. 설정 시 `utplsql.connection`을 재정의합니다. |
| `utplsql.sqlCoverageEnabled` | `false` | `V$SQL`을 통해 실행된 뷰를 추적합니다(불리언 커버리지). `GRANT SELECT ON V$SQL` 필요. |
| `utplsql.debugger.enabled` | `true` | PL/SQL 테스트 디버깅(`DBMS_DEBUG`)을 활성화합니다. `node-oracledb` + 권한 필요. |
| `utplsql.debugger.stopOnException` | `true` | 디버깅 중 PL/SQL 예외에서 일시 중지합니다. |
| `utplsql.debugger.timeoutSeconds` | `300` | 디버그 세션의 시간 제한(초). |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | 런타임 메시지의 언어. `auto`는 VSCode를 따릅니다(pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; 그 외에는 en). **24개 로케일**(15개 네이티브 + 9개 커뮤니티)을 다룹니다. |

예시(프로젝트 `.vscode/settings.json`):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

그리고 VSCode를 열기 전에(또는 PowerShell 프로필에서):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### 기여자를 위해

통합 테스트에 사용되는 환경 변수로 프로젝트 루트에 `.env` 파일(gitignored)을 만듭니다:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## 사용법

1. PL/SQL 프로젝트(코드 및 테스트 패키지 포함)를 엽니다.
2. 코드와 테스트를 데이터베이스에서 컴파일합니다(Oracle 확장 / SQLcl).
3. **Testing** 뷰를 엽니다 → 스위트가 나타납니다.
4. 실행:
   - **CodeLens**를 통해 — 편집기의 각 `%suite` 및 `%test` 위에 ▶ Run/Run with Coverage 버튼.
   - 각 테스트/스위트 옆의 **구터(gutter)**를 통해, 또는
   - **키보드 단축키**를 통해(`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File 등), 또는
   - Test Explorer 뷰의 **Run Tests** 버튼, 또는
   - **폴더/파일 마우스 오른쪽 버튼 클릭** → *utPLSQL: Run tests…*(커버리지 포함/미포함).
5. 실행 후 확인:
   - 편집기에서 테스트 주석 옆의 **인라인 데코레이션**(✓/✗/⚠).
   - 통과/실패 개수와 총 소요 시간이 있는 **상태 표시줄**.
   - 상세 결과가 있는 **Test Explorer**.
6. 커버리지의 경우 **Run with Coverage** 프로필(또는 "with coverage" 메뉴 항목)을 사용하세요.
7. 실행을 빠르게 반복하려면:
   - `Ctrl+Shift+U L` — **Rerun Last**(마지막 실행 반복, 커버리지 포함/미포함).
   - `Ctrl+Shift+U U` — **Run at Cursor**(커서 아래의 `%test`/`%suite` 실행).
   - `Ctrl+Shift+U X` — **Run Failed Only**(실패한 테스트만 실행).
8. **Oracle 직접 실행(스트리밍)의 경우:** 설치할 것이 없습니다 — VSIX에 thin `oracledb` 드라이버가 이미 포함되어 있습니다.
9. 진단의 경우 팔레트에서 `utPLSQL: Show information`을 사용하세요 — 복사 옵션과 함께 버전 정보를 표시합니다.
10. **utPLSQL: Select additional reporter...** — 데이터베이스에서 사용 가능한 리포터가 있는 QuickPick.
11. **utPLSQL: Cancel execution** — 실행 중인 실행을 중지합니다(실행 중 `Escape`).
12. **utPLSQL: Refresh tests** — `.pks`의 재발견을 강제합니다.

> 💡 **테스트 작성 시:** 파서는 토큰 기반입니다 — 파일에 `%suite`와
> `create package` 선언만 있고 각 `%test` 뒤에 `PROCEDURE`만 있으면 됩니다.
> 빈 줄 요구 사항은 없습니다.

### 지원되는 주석(v0.10.0+)

`%suite` 및 `%test` 외에도 발견은 다음을 이해합니다:

| 주석 | Test Explorer에 미치는 영향 |
|---|---|
| `-- %disabled` | 스위트 또는 테스트가 트리에 **나타나지 않음**(발견에서 건너뜀) |
| `-- %throws(-20001)` | 테스트가 예외 20001을 기대함을 표시(`expectedError` 메타데이터) |
| `-- %tags(fast, critical)` | 테스트 태그(메타데이터; 태그 필터링은 로드맵) |
| `-- %displayname(Name)` | `%test` 설명 대신 표시되는 사용자 지정 이름 |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | 라이프사이클 훅으로 스위트 표시(메타데이터) |

주석은 대소문자를 구분하지 않습니다. 스위트 헤더(`%suite`와 첫 번째 `%test` 사이)에서는
스위트에 적용되고, `%test` 이후에는 테스트에 적용됩니다.

## 명령

모든 확장 프로그램 명령(팔레트 `Ctrl+Shift+P` 접두사 `utPLSQL:`):

| 명령 | 설명 | UI 단축키 |
|---|---|---|
| `utPLSQL: Run all tests` | 워크스페이스의 모든 스위트 실행 | Testing 뷰의 ▶ 버튼 |
| `utPLSQL: Run tests in this file` | 활성 `.pks`/`.pkb`의 스위트 실행 | 마우스 오른쪽 버튼 → 파일 |
| `utPLSQL: Run tests in this file with coverage` | 동일, 커버리지 프로필 사용 | 마우스 오른쪽 버튼 → 파일 |
| `utPLSQL: Run tests in this folder` | 선택한 폴더의 스위트 실행 | 마우스 오른쪽 버튼 → 폴더 |
| `utPLSQL: Run tests in this folder with coverage` | 동일, 커버리지 프로필 사용 | 마우스 오른쪽 버튼 → 폴더 |
| `utPLSQL: Refresh tests` | `.pks`의 재발견 강제 | — |
| `utPLSQL: Cancel execution` | 실행 중인 실행 중지 | — |
| `utPLSQL: Show utPLSQL information` | 복사 옵션이 있는 버전 정보 | — |
| `utPLSQL: Select additional reporter...` | 데이터베이스 리포터가 있는 QuickPick | — |
| `utPLSQL: Clear session connection` | 세션 캐시에서 연결 제거 | — |
| `utPLSQL: Rerun Last` | 마지막 실행 반복 | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | 커서 아래의 테스트 실행 | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | 실패한 테스트만 재실행 | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | 전체 설정 검증(연결, UT3 설치) 실행 및 결과 표시 | — |
| `utPLSQL: Configure connection` | `utplsql.connection`에서 설정 열기 | — |
| `utPLSQL: Copy coverage grants to clipboard` | 권한 SQL을 클립보드에 복사 | — |
| `utPLSQL: Show Test Explorer` | Testing 뷰에 포커스 | — |
| `utPLSQL: Switch connection profile...` | 활성 연결 프로필 전환(QuickPick) | 상태 표시줄 클릭(활성 프로필 포함) |
| `utPLSQL: New connection profile...` | 프로필 생성 및 활성화 마법사 | — |
| `utPLSQL: Manage connection profiles` | `utplsql.profiles`에서 설정 열기 | — |
| `utPLSQL: Import connections from SQL Developer` | SQL Developer에서 연결 가져오기(connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | 활성 파일 아래의 테스트 디버그 세션 시작 | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |

> **Recompile UT3**(`utplsql.recompileUt3`)은 팔레트 명령이 **아닙니다** —
> "utPLSQL Setup" 진단(utPLSQL 스키마의 잘못된 객체)의 내부 quick-fix입니다.

## 키바인딩

모든 단축키는 `Ctrl+Shift+U` 접두사를 사용합니다(Mac에서는 `Cmd+Shift+U`):

| 단축키 | 명령 |
|---|---|
| `Ctrl+Shift+U R` | 모든 테스트 실행 |
| `Ctrl+Shift+U T` | 파일의 테스트 실행 |
| `Ctrl+Shift+U Shift+T` | 커버리지로 파일의 테스트 실행 |
| `Ctrl+Shift+U F` | 테스트 새로고침 |
| `Ctrl+Shift+U I` | utPLSQL 정보 표시 |
| `Ctrl+Shift+U C` | 세션 연결 지우기 |
| `Ctrl+Shift+U L` | 마지막 실행 반복 |
| `Ctrl+Shift+U U` | 커서에서 실행 |
| `Ctrl+Shift+U X` | 실패한 것만 실행 |
| `Escape` | 실행 취소 |

## 커버리지

- **실행된** 줄은 구터에서 초록색이 되고, **실행되지 않은** 줄은 빨간색이 됩니다.
- **Test Coverage** 탭에 **파일/폴더별 백분율**이 표시됩니다.



확장 프로그램은 `utplsql.sourcePath`를 통해 커버리지를 소스 파일에 매핑합니다. `-owner`는
연결에서(또는 `utplsql.coverageOwner`에서) 파생됩니다.

## 리포터

확장 프로그램은 항상 세 가지 기본 리포터를 포함합니다:
`ut_documentation_reporter`(stdout),
`ut_junit_reporter`(결과 → Test Explorer) 및
`ut_coverage_cobertura_reporter`(사용 가능한 경우 커버리지).

**동적 검증** — 커버리지로 실행하기 전에 확장 프로그램은 `utplsql reporters <conn>`을 통해
데이터베이스를 조회합니다. 데이터베이스에
`UT_COVERAGE_COBERTURA_REPORTER`가 없으면(예: 오래된 utPLSQL)
커버리지는 출력에 경고와 함께 건너뜁니다. 테스트 실행은
차단되지 않습니다.

**추가 고정 리포터** — `utplsql.additionalReporters` 설정:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
세 가지 기본 리포터는 여기에 나열되어 있어도
자동으로 중복 제거됩니다.

**일시적 세션별 리포터** — **utPLSQL: Select additional reporter...** 명령은
데이터베이스의 동적 목록이 있는 QuickPick을 엽니다. 선택한 리포터는 다음 실행에 사용되고
이후 폐기됩니다(설정에 유지되지 않음).

## 데이터베이스 요구 사항

**커버리지**(항상) — 프로파일러를 활성화합니다:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
이것이 없으면 테스트는 실행되지만 커버리지는 **비어** 나옵니다.

**다른 스키마에서의 테스트 발견**(utPLSQL **shared** 설치, 예: 소유자 `UT3`):
프레임워크가 애플리케이션 스키마의 테스트를 보고 구문 분석하려면 utPLSQL 소유자가
해당 스키마의 **사전(dictionary)을 읽을** 수 있어야 합니다:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY`만으로는 부족합니다** — 해당 뷰에 대한 **직접** 권한이 필요합니다
  (definer 컨텍스트의 `dbms_assert.sql_object_name` 때문).
- utPLSQL **DDL 트리거**도 설치되어 있어야 합니다(주석 캐시를 최신 상태로 유지).
- 확인(소유자로서): `SELECT ut_metadata.get_source_view_name FROM dual;`는 `dba_source`를 반환해야 합니다.

> **스키마별** 설치(utPLSQL이 테스트와 같은 스키마에 있는 경우)에서는 이러한 교차 스키마 권한이
> **필요하지 않습니다** — 프레임워크가 자체 소스를 읽습니다.

## 알려진 제한 사항

- 결과→테스트 매핑은 패키지 이름 + 테스트 이름/설명으로 수행됩니다;
  다른 패키지의 동일한 설명은 모호성을 만들 수 있습니다(인덱스는
  패키지로 범위가 지정되어 이를 최소화).
- `sourcePath`를 확인하기 위해 **첫 번째** 워크스페이스 폴더를 고려합니다.
- 발견은 `.pks`(스펙)를 읽습니다; `%suite`/`%test` 주석을 스펙에 유지하세요.

## 문제 해결

| 증상 | 가능한 원인 | 해결책 |
|---|---|---|
| 스위트가 나타나지 않음 | 데이터베이스를 찾을 수 없음 | 진단을 위해 `utPLSQL: Validate configuration` 실행 |
| 빈 커버리지 | `GRANT EXECUTE ON DBMS_PROFILER` 누락 | [Requirements](#database-requirements)의 권한을 실행하거나 `utPLSQL: Copy coverage grants to clipboard` 사용 |
| 빈 커버리지 | Oracle 19c에는 추가 권한 필요 | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| 표시가 없는 컴파일 오류 | PL/SQL 구문 오류가 있는 코드 | `utplsql.compilationDiagnostics.enabled` 활성화(기본 켜짐); Problems 패널 참조 |
| 연결 오류 | 잘못된 문자열 또는 접근 불가능한 DB | `utPLSQL: Validate configuration` 사용 |
| 실행 중 시간 초과 | 테스트가 `timeoutMinutes`보다 오래 걸림 | `utplsql.timeoutMinutes` 증가 |
| `%suite`가 인식되지 않음 | 파일에 `%suite`/`create package` 누락, 또는 `PROCEDURE` 없는 `%test` | 스펙 확인; `utPLSQL: Refresh tests` 실행 |
| CodeLens가 나타나지 않음 | `editor.codeLens` 비활성화 또는 충돌 | `"editor.codeLens": true` 활성화; `utplsql.codeLens.enabled` 확인 |
| 단축키가 작동하지 않음 | 다른 확장 프로그램 또는 VSCode 단축키와 충돌 | File → Preferences → Keyboard Shortcuts로 이동하여 `utplsql` 검색 후 재정의 |

## 라이선스

MIT © Gil Cleber Barboza
