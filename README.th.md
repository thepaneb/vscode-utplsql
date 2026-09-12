<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · **ไทย** · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

รวม [utPLSQL](https://www.utplsql.org/) เข้ากับ VSCode นำการทดสอบ PL/SQL มาสู่ **Test Explorer** เนทีฟ พร้อมเมนูบริบทและความครอบคลุม (coverage) แบบภาพ

- 🧪 **Test Explorer เนทีฟ** — suites และ tests จะปรากฏในมุมมองการทดสอบ; เรียกใช้ตาม test, suite, ไฟล์ หรือโฟลเดอร์
- 🔍 **CodeLens** — ปุ่ม Run/Run with Coverage เหนือ `%suite` และ `%test` ในตัวแก้ไข โดยไม่ต้องออกจากโค้ด
- ⌨️ **ปุ่มลัดคีย์บอร์ด** — คำนำหน้า `Ctrl+Shift+U` + คีย์สำหรับคำสั่งหลัก (R = Run All, T = Run File, L = Rerun Last, ฯลฯ)
- 🖱️ **เมนูบริบท** — คลิกขวาที่ **โฟลเดอร์** หรือไฟล์ **`.pks`/`.pkb`** (ใน Explorer หรือในตัวแก้ไข) เพื่อรันการทดสอบ
- 📊 **ความครอบคลุมแบบภาพ** — gutter สีตามบรรทัด (ครอบคลุม/ไม่ครอบคลุม) และเปอร์เซ็นต์ต่อไฟล์ในแท็บ **Coverage**
- ✅ **การตกแต่งแบบอินไลน์** — ไอคอน ✓/✗/⚠ ในตัวแก้ไขหลังการรัน พร้อม tooltip ของความล้มเหลวและ overview ruler
- 📌 **แถบสถานะ (Status Bar)** — ตัวบ่งชี้พร้อมจำนวนผ่าน/ล้มเหลว ระยะเวลา และความคืบหน้าแบบเรียลไทม์
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only ด้วยปุ่มลัดเพียงปุ่มเดียว
- 🚀 **Oracle แบบตรง (ผ่าน node-oracledb)** — สตรีมมิงแบบเรียลไทม์ โดยไม่ต้องรอให้ batch เสร็จสิ้น
- 🔧 **การวินิจฉัยการตั้งค่า (Setup diagnostics)** — ตรวจสอบการเชื่อมต่อ, grants และเวอร์ชันเชิงรุกพร้อม quick-fix
- 🧩 **แผนผังที่รับรู้ schema** — จัดระเบียบการทดสอบตาม Schema > Package > Suite > Test ใน Test Explorer
- 🎯 **Jump to failure** — นำทางตรงไปยังบรรทัดของ assertion ที่ล้มเหลว (ผ่าน "Go to Error" เนทีฟ)
- 🔌 **โปรไฟล์การเชื่อมต่อ** — บันทึกและสลับระหว่างหลายสภาพแวดล้อม (DEV/TEST/PROD) พร้อมการตั้งค่าต่อโปรไฟล์ ผ่านแถบสถานะหรือ command palette
- 📈 **ความครอบคลุมของ statement และ view** — แท็บ Coverage แสดง `% ของ statements` (PROCEDURE/FUNCTION) ต่อไฟล์และติดตาม views ที่ถูกเรียกใช้ผ่าน `V$SQL`
- 🐛 **การดีบัก PL/SQL** — breakpoints และการดีบักแบบทีละขั้นของเทสต์ utPLSQL ผ่าน `DBMS_DEBUG` (Debug Adapter เนทีฟ)
- 🌍 **i18n — 24 ภาษา** — `utplsql.language` เป็นไปตาม VSCode (15 ภาษาหลัก + 9 จากชุมชน: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi)

## การติดตั้ง

ส่วนขยายสามารถติดตั้งได้สองวิธี:

1. **จาก Marketplace:** ค้นหา **utPLSQL Test Runner** ในแผงส่วนขยายของ VSCode (`Ctrl+Shift+X`) แล้วคลิก **Install**
2. **ด้วยตนเอง (.vsix):** ดาวน์โหลดไฟล์ `.vsix` ของเวอร์ชันที่ต้องการแล้วติดตั้งใน VSCode:
   * **ผ่านบรรทัดคำสั่ง:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **ผ่านอินเทอร์เฟซ:** เปิดแผงส่วนขยาย (`Ctrl+Shift+X`), คลิกจุดสามจุด `...` (มุมขวาบน) แล้วเลือก **Install from VSIX...**

## ข้อกำหนด

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** ติดตั้งในฐานข้อมูล Oracle
- **VSCode 1.88+** (Test Coverage API)

ส่วนขยายเป็นเพียง "ไคลเอนต์กราฟิก" — สิ่งที่รันการทดสอบคือฐานข้อมูลโดยตรง (node-oracledb)

## การเชื่อมต่อ

ส่วนขยายจำเป็นต้องมี connection string ของ Oracle เพื่อรันการทดสอบ ลำดับการแก้ไขเป็นดังนี้:

1. **โปรไฟล์การเชื่อมต่อที่ใช้งานอยู่** — `utplsql.activeProfile` ชี้ไปที่โปรไฟล์ใน `utplsql.profiles` (แทนที่ทุกอย่างด้านล่าง)
2. **การตั้งค่า `utplsql.connection`** — อ่านจาก `settings.json` ของโปรเจกต์/ผู้ใช้
3. **ตัวแปรสภาพแวดล้อม `UTPLSQL_CONN`** — ตั้งก่อนเปิด VSCode
4. **แคชเซสชัน** — หากผู้ใช้พิมพ์การเชื่อมต่อผ่าน prompt แล้ว
5. **สอบถามผู้ใช้** — ถามและเก็บไว้เฉพาะในเซสชันปัจจุบันเท่านั้น

โปรไฟล์การเชื่อมต่อ (`utplsql.profiles`) ยังสามารถแทนที่ `sourcePath`, `coverageOwner` ฯลฯ ตามสภาพแวดล้อมได้ — ดู `utplsql.activeProfile` ในตารางการกำหนดค่า

⚠️ **คำแนะนำด้านความปลอดภัย:** connection string มีรหัสผ่าน **อย่า**ใช้
การตั้งค่า `utplsql.connection` ในสภาพแวดล้อมที่ใช้ร่วมกัน (settings.json อาจถูกจัดเวอร์ชัน
หรือมองเห็นได้โดยผู้อื่น) ให้ **ใช้ตัวแปรสภาพแวดล้อม `UTPLSQL_CONN` แทน**:

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

หากไม่ได้กำหนดทั้งการตั้งค่าและตัวแปรสภาพแวดล้อม ส่วนขยายจะถามหาการเชื่อมต่อและ
เก็บไว้ในหน่วยความจำเฉพาะระหว่างเซสชัน — ใช้คำสั่ง
**utPLSQL: Clear session connection** (command palette) เพื่อล้าง

**รูปแบบที่ยอมรับ:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias` (ต้องกำหนดค่า `TNS_ADMIN`)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## วิธีการทำงาน

### โหมด Oracle แบบตรง (v0.9.0)

ไม่มีไฟล์ชั่วคราว ไม่ต้องรอ batch ผลลัพธ์จะปรากฏใน
Test Explorer **เมื่อแต่ละเทสต์เสร็จสิ้น** VSIX มีไดรเวอร์ `oracledb` แบบ thin ในตัวแล้ว (ไม่ต้องใช้ Instant Client)

## การกำหนดค่า

| Setting | Default | Description |
|---|---|---|
| `utplsql.connection` | `""` | การเชื่อมต่อ Oracle **ปล่อยว่างไว้**และใช้ตัวแปรสภาพแวดล้อม `UTPLSQL_CONN` เพื่อหลีกเลี่ยงการเก็บรหัสผ่าน หากทั้งคู่ว่าง ส่วนขยายจะถาม (เก็บไว้เฉพาะในเซสชัน) |
| `utplsql.sourcePath` | `install` | โฟลเดอร์ของโค้ด production (เพื่อจับคู่ความครอบคลุมกับไฟล์) |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs สำหรับค้นหา specs ที่มี `%suite`/`%test` หากเทสต์ของคุณอยู่ในไฟล์ `.sql` ให้ใช้ `["**/*.sql"]` |
| `utplsql.coverageOwner` | `""` | เจ้าของ schema ของอ็อบเจกต์ที่ครอบคลุม ว่าง = ใช้ผู้ใช้จากการเชื่อมต่อ (ตัวพิมพ์ใหญ่) |
| `utplsql.timeoutMinutes` | `60` | Timeout เป็นนาที |
| `utplsql.dbmsOutput` | `false` | เปิดใช้งาน `DBMS_OUTPUT` ในเซสชันการทดสอบ |
| `utplsql.additionalReporters` | `[]` | Reporters เพิ่มเติมที่จะรวมในทุกรัน (เช่น `["ut_coverage_html_reporter"]`) ค่าเริ่มต้น (documentation, junit, coverage) จะถูกรวมเสมอและไม่จำเป็นต้องระบุ |
| `utplsql.codeLens.enabled` | `true` | แสดงปุ่ม CodeLens Run/Run with Coverage เหนือ `%suite` และ `%test` |
| `utplsql.statusBar.enabled` | `true` | แสดงตัวบ่งชี้สถานะการทดสอบในแถบสถานะ |
| `utplsql.decorations.enabled` | `true` | แสดงการตกแต่งผ่าน/ล้มเหลวบนบรรทัด `%suite` และ `%test` หลังการรัน |
| `utplsql.oraclePoolMin` | `2` | จำนวนการเชื่อมต่อขั้นต่ำที่เก็บไว้ในพูลของ Oracle runner (node-oracledb) |
| `utplsql.oraclePoolMax` | `10` | จำนวนการเชื่อมต่อสูงสุดในพูลของ Oracle runner (node-oracledb) |
| `utplsql.oraclePoolIncrement` | `1` | จำนวนที่เพิ่มเมื่อขยายพูลของ Oracle runner (node-oracledb) |
| `utplsql.oraclePoolPingInterval` | `60` | วินาทีระหว่างการตรวจสอบความสมบูรณ์ของการเชื่อมต่อที่ว่างในพูล (node-oracledb) `0` = ping ทุกครั้งที่ยืมการเชื่อมต่อ |
| `utplsql.organization` | `file` | การจัดระเบียบแผนผัง: `file` (ตามพาธ) หรือ `schema` (Schema > Package > Suite > Test) ในโหมด `schema` suites จะถูกค้นพบจากฐานข้อมูล (`ALL_OBJECTS`/`ALL_SOURCE`) ด้วยเมื่อไม่มีไฟล์ `.pks` ในเวิร์กสเปซ — ด้วย URI เสมือน `utplsql-db:/` (ไม่มี CodeLens/การตกแต่ง/jump to failure) |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | รูปแบบ Glob เพื่อแยก schema จากพาธ ใช้ `{schema}` เป็นตัวยึดตำแหน่ง ในโหมด `schema` ไดเรกทอรีใต้ฐานของรูปแบบ (เช่น `db/*`) กำหนด schemas ที่จะสอบถามในฐานข้อมูล |
| `utplsql.compilationDiagnostics.enabled` | `true` | แสดงข้อผิดพลาดการคอมไพล์ PL/SQL เป็นเส้นใต้ในตัวแก้ไขและแผง Problems |
| `utplsql.setupDiagnostics.enabled` | `true` | แสดงการวินิจฉัยการกำหนดค่า (การเชื่อมต่อ, grants, เวอร์ชัน) และ **ความสมบูรณ์ของการติดตั้ง utPLSQL** (อ็อบเจกต์ที่ไม่ถูกต้องใน schema UT3, พร้อม quick-fix "Recompile UT3") พร้อมการทำงาน quick-fix |
| `utplsql.profiles` | `[]` | โปรไฟล์การเชื่อมต่อ Oracle ที่บันทึกไว้ (ชื่อ, การเชื่อมต่อ, และการแทนที่ `sourcePath`/`coverageOwner`/ฯลฯ) เพื่อสลับระหว่างสภาพแวดล้อม (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID ของโปรไฟล์ที่ใช้งานอยู่ (`utplsql.profiles`) เมื่อตั้งค่า จะแทนที่ `utplsql.connection` |
| `utplsql.sqlCoverageEnabled` | `false` | ติดตาม views ที่ถูกเรียกใช้ผ่าน `V$SQL` (boolean coverage) ต้องใช้ `GRANT SELECT ON V$SQL` |
| `utplsql.debugger.enabled` | `true` | เปิดใช้งานการดีบักเทสต์ PL/SQL (`DBMS_DEBUG`) ต้องใช้ `node-oracledb` + grants |
| `utplsql.debugger.stopOnException` | `true` | หยุดชั่วคราวเมื่อเกิด PL/SQL exceptions ระหว่างการดีบัก |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (วินาที) ของเซสชันการดีบัก |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | ภาษาของข้อความรันไทม์ `auto` เป็นไปตาม VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; นอกนั้น en) ครอบคลุม **24 ภาษาท้องถิ่น** (15 ภาษาหลัก + 9 จากชุมชน) |

ตัวอย่าง (`.vscode/settings.json` ของโปรเจกต์):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

และก่อนเปิด VSCode (หรือในโปรไฟล์ PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### สำหรับผู้มีส่วนร่วม

สร้างไฟล์ `.env` ที่รากของโปรเจกต์ (ถูก gitignore) พร้อมตัวแปร
สภาพแวดล้อมที่ใช้โดยเทสต์การผสานรวม:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## การใช้งาน

1. เปิดโปรเจกต์ PL/SQL (พร้อมแพ็กเกจโค้ดและเทสต์)
2. คอมไพล์โค้ดและเทสต์ในฐานข้อมูล (Oracle extension / SQLcl)
3. เปิดมุมมอง **Testing** → suites จะปรากฏ
4. รัน:
   - ผ่าน **CodeLens** — ปุ่ม ▶ Run/Run with Coverage เหนือแต่ละ `%suite` และ `%test` ในตัวแก้ไข
   - ผ่าน **gutter** ข้างแต่ละเทสต์/suite หรือ
   - ผ่าน **ปุ่มลัดคีย์บอร์ด** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, ฯลฯ) หรือ
   - ปุ่ม **Run Tests** ของมุมมอง Test Explorer หรือ
   - **คลิกขวา**โฟลเดอร์/ไฟล์ → *utPLSQL: Run tests…* (มีหรือไม่มีความครอบคลุม)
5. หลังการรัน ดู:
   - **การตกแต่งแบบอินไลน์** (✓/✗/⚠) ในตัวแก้ไขข้างหมายเหตุเทสต์
   - **แถบสถานะ (Status Bar)** พร้อมจำนวนผ่าน/ล้มเหลวและระยะเวลารวม
   - **Test Explorer** พร้อมผลลัพธ์โดยละเอียด
6. สำหรับความครอบคลุม ใช้โปรไฟล์ **Run with Coverage** (หรือรายการเมนู "with coverage")
7. เพื่อทำซ้ำการรันอย่างรวดเร็ว:
   - `Ctrl+Shift+U L` — **Rerun Last** (ทำซ้ำการรันครั้งล่าสุด มีหรือไม่มีความครอบคลุม)
   - `Ctrl+Shift+U U` — **Run at Cursor** (รัน `%test`/`%suite` ใต้เคอร์เซอร์)
   - `Ctrl+Shift+U X` — **Run Failed Only** (รันเฉพาะเทสต์ที่ล้มเหลว)
8. **สำหรับ Oracle แบบตรง (สตรีมมิง):** ไม่ต้องติดตั้งอะไร — VSIX มีไดรเวอร์ `oracledb` แบบ thin ในตัวแล้ว
9. สำหรับการวินิจฉัย ใช้ `utPLSQL: Show information` ใน palette — แสดงเวอร์ชัน API/DB พร้อมตัวเลือกคัดลอก
10. **utPLSQL: Select additional reporter...** — QuickPick พร้อม reporters ที่มีอยู่ในฐานข้อมูล
11. **utPLSQL: Cancel execution** — หยุดการรันที่กำลังทำงาน (`Escape` ระหว่างการรัน)
12. **utPLSQL: Refresh tests** — บังคับให้ค้นพบ `.pks` อีกครั้ง

> 💡 **เมื่อเขียนเทสต์:** ตัวแยกวิเคราะห์ (parser) ขับเคลื่อนด้วย token — เพียงมี `%suite`
> และคำประกาศ `create package` ในไฟล์ และแต่ละ `%test` ตามด้วย
> `PROCEDURE` ไม่จำเป็นต้องมีบรรทัดว่าง

### Annotation ที่รองรับ (v0.10.0+)

นอกเหนือจาก `%suite` และ `%test` แล้วการค้นพบยังเข้าใจ:

| Annotation | ผลกระทบต่อ Test Explorer |
|---|---|
| `-- %disabled` | Suite หรือเทสต์ **ไม่ปรากฏ** ในแผนผัง (ข้ามในการค้นพบ) |
| `-- %throws(-20001)` | ระบุว่าเทสต์คาดหวัง exception 20001 (metadata `expectedError`) |
| `-- %tags(fast, critical)` | แท็กเทสต์ (metadata; การกรองแท็กอยู่ใน roadmap) |
| `-- %displayname(Name)` | ชื่อที่กำหนดเองที่แสดงแทนคำอธิบายของ `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | ระบุ suite ด้วย lifecycle hooks (metadata) |

Annotation ไม่คำนึงถึงตัวพิมพ์เล็กใหญ่ ในส่วนหัวของ suite (ระหว่าง `%suite` และ
`%test` แรก) จะใช้กับ suite; หลังจาก `%test` จะใช้กับเทสต์

## คำสั่ง

คำสั่งทั้งหมดของส่วนขยาย (palette `Ctrl+Shift+P` คำนำหน้า `utPLSQL:`):

| Command | คำอธิบาย | ปุ่มลัด UI |
|---|---|---|
| `utPLSQL: Run all tests` | รัน suites ทั้งหมดในเวิร์กสเปซ | ปุ่ม ▶ ในมุมมอง Testing |
| `utPLSQL: Run tests in this file` | รัน suites ของไฟล์ `.pks`/`.pkb` ที่ใช้งานอยู่ | คลิกขวา → ไฟล์ |
| `utPLSQL: Run tests in this file with coverage` | เหมือนเดิม พร้อมโปรไฟล์ความครอบคลุม | คลิกขวา → ไฟล์ |
| `utPLSQL: Run tests in this folder` | รัน suites ของโฟลเดอร์ที่เลือก | คลิกขวา → โฟลเดอร์ |
| `utPLSQL: Run tests in this folder with coverage` | เหมือนเดิม พร้อมโปรไฟล์ความครอบคลุม | คลิกขวา → โฟลเดอร์ |
| `utPLSQL: Refresh tests` | บังคับให้ค้นพบ `.pks` อีกครั้ง | — |
| `utPLSQL: Cancel execution` | หยุดการรันที่กำลังทำงาน | — |
| `utPLSQL: Show utPLSQL information` | เวอร์ชัน API/DB พร้อมตัวเลือกคัดลอก | — |
| `utPLSQL: Select additional reporter...` | QuickPick พร้อม reporters จากฐานข้อมูล | — |
| `utPLSQL: Clear session connection` | ลบการเชื่อมต่อออกจากแคชเซสชัน | — |
| `utPLSQL: Rerun Last` | ทำซ้ำการรันครั้งล่าสุด | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | รันเทสต์ใต้เคอร์เซอร์ | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | รันเฉพาะเทสต์ที่ล้มเหลวซ้ำ | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | รันการตรวจสอบการตั้งค่าทั้งหมด (การเชื่อมต่อ, การติดตั้ง UT3) และแสดงผลลัพธ์ | — |
| `utPLSQL: Configure connection` | เปิดการตั้งค่าที่ `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | คัดลอก SQL ของ grants ไปยังคลิปบอร์ด | — |
| `utPLSQL: Show Test Explorer` | โฟกัสมุมมอง Testing | — |
| `utPLSQL: Switch connection profile...` | สลับโปรไฟล์การเชื่อมต่อที่ใช้งานอยู่ (QuickPick) | คลิกที่แถบสถานะ (เมื่อมีโปรไฟล์ที่ใช้งานอยู่) |
| `utPLSQL: New connection profile...` | วิซาร์ดสำหรับสร้างและเปิดใช้งานโปรไฟล์ | — |
| `utPLSQL: Manage connection profiles` | เปิดการตั้งค่าที่ `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | นำเข้าการเชื่อมต่อจาก SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | เริ่มเซสชันการดีบักของเทสต์ภายใต้ไฟล์ที่ใช้งานอยู่ | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |

> **Recompile UT3** (`utplsql.recompileUt3`) **ไม่ใช่**คำสั่งใน palette — เป็น
> quick-fix ภายในของการวินิจฉัย "utPLSQL Setup" (อ็อบเจกต์ที่ไม่ถูกต้องใน
> schema ของ utPLSQL)

## ปุ่มลัด

ปุ่มลัดทั้งหมดใช้คำนำหน้า `Ctrl+Shift+U` (`Cmd+Shift+U` บน Mac):

| ปุ่มลัด | คำสั่ง |
|---|---|
| `Ctrl+Shift+U R` | รันเทสต์ทั้งหมด |
| `Ctrl+Shift+U T` | รันเทสต์ในไฟล์ |
| `Ctrl+Shift+U Shift+T` | รันเทสต์ในไฟล์พร้อมความครอบคลุม |
| `Ctrl+Shift+U F` | รีเฟรชเทสต์ |
| `Ctrl+Shift+U I` | แสดงข้อมูล utPLSQL |
| `Ctrl+Shift+U C` | ล้างการเชื่อมต่อเซสชัน |
| `Ctrl+Shift+U L` | รันครั้งล่าสุดอีกครั้ง |
| `Ctrl+Shift+U U` | รันที่เคอร์เซอร์ |
| `Ctrl+Shift+U X` | รันเฉพาะที่ล้มเหลว |
| `Escape` | ยกเลิกการรัน |

## ความครอบคลุม

- บรรทัดที่ **ถูกเรียกใช้** จะเป็นสีเขียวใน gutter; บรรทัดที่ **ไม่ถูกเรียกใช้** จะเป็นสีแดง
- แท็บ **Test Coverage** แสดง **เปอร์เซ็นต์ต่อไฟล์/โฟลเดอร์**



ส่วนขยายส่ง `-source_path` (= `utplsql.sourcePath`) และจับคู่อ็อบเจกต์ที่ครอบคลุม
กับไฟล์ต้นฉบับผ่าน `utplsql.coverageSourceArgs` (regex + `type_mapping`) ส่วน `-owner`
อนุมานจากการเชื่อมต่อ (หรือจาก `utplsql.coverageOwner`)

### การจับคู่ความครอบคลุมกับไฟล์ (`coverageSourceArgs`)

`type_mapping` แปลง "type" ที่ regex จับได้เป็น type ของ Oracle มีสามรูปแบบทั่วไป:

**1) ตามไดเรกทอรี** — โครงสร้าง `sourcePath/<type>/<name>.sql` (โฟลเดอร์ `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> ใช้ได้ที่ความลึกใดก็ได้ (`.*` ดูดซับโมดูลด้านบน) ชื่อโฟลเดอร์ที่หลากหลาย
> (เช่น `package`, `pkg`, `pacote`) สามารถระบุได้ใน `type_mapping`

**2) ตามคำนำหน้าชื่อ** — รูปแบบ `pkg_*`, `prc_*`, `vw_*` (ไม่ขึ้นกับโฟลเดอร์):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) ตามนามสกุลที่ระบุ type** — ไฟล์ `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (ไม่ขึ้นกับโฟลเดอร์):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**หมายเหตุสำคัญ:**
- **Packages → `PACKAGE BODY`** (ไม่ใช่ `PACKAGE`): ความครอบคลุมจะถูกเก็บใน **body** ของแพ็กเกจ
- **Windows / อักขระพิเศษใน regex:** หลีกเลี่ยง **`^`** ใน regex (`cmd` ของ `.bat` กินมัน) — นั่นคือเหตุผลที่ตัวอย่าง
  ใช้ `\w` และ `[/\\]`

## Reporters

ส่วนขยายรวม reporters เริ่มต้นสามตัวเสมอ:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (ผลลัพธ์ → Test Explorer) และ
`ut_coverage_cobertura_reporter` (ความครอบคลุม หากมี)

**การตรวจสอบแบบไดนามิก** — ก่อนรันพร้อมความครอบคลุม ส่วนขยายจะสอบถาม
ฐานข้อมูลผ่าน `utplsql reporters <conn>` หาก
`UT_COVERAGE_COBERTURA_REPORTER` ไม่มีอยู่ในฐานข้อมูล (เช่น utPLSQL
ที่เก่าเกินไป) ความครอบคลุมจะถูกข้ามพร้อมคำเตือนในเอาต์พุต การรันเทสต์
จะไม่ถูกบล็อก

**Reporters เพิ่มเติมแบบคงที่** — การตั้งค่า `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
reporters เริ่มต้นสามตัวจะถูกตัดรายการซ้ำโดยอัตโนมัติ แม้จะ
ระบุไว้ที่นี่

**Reporter แบบชั่วคราวต่อเซสชัน** — คำสั่ง **utPLSQL: Select additional
reporter...** เปิด QuickPick พร้อมรายการแบบไดนามิกจากฐานข้อมูล
reporter ที่เลือกจะถูกใช้ในการรันครั้งถัดไปและถูกทิ้งหลังจากนั้น (ไม่
คงอยู่ใน settings)

## ข้อกำหนดฐานข้อมูล

**ความครอบคลุม** (เสมอ) — เปิดใช้งาน profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
หากไม่มีสิ่งนี้ เทสต์ยังรันได้แต่ความครอบคลุมจะออกมา **ว่างเปล่า**

**การค้นพบเทสต์ใน schemas อื่น** (การติดตั้ง utPLSQL แบบ **shared** เช่น เจ้าของ `UT3`):
เพื่อให้เฟรมเวิร์กเห็นและแยกวิเคราะห์เทสต์ของ schemas ของแอปพลิเคชัน เจ้าของ utPLSQL ต้อง
**อ่านพจนานุกรม** ของ schemas เหล่านั้น:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` เพียงอย่างเดียวไม่เพียงพอ** — ต้องมี grants **แบบตรง** บน views เหล่านั้น
  (เนื่องจาก `dbms_assert.sql_object_name` ในบริบท definer)
- ต้องติดตั้ง **DDL trigger** ของ utPLSQL ด้วย (เพื่อให้แคช annotation เป็นปัจจุบัน)
- การตรวจสอบ (ในฐานะเจ้าของ): `SELECT ut_metadata.get_source_view_name FROM dual;` ควรคืนค่า `dba_source`

> ในการติดตั้งแบบ **per-schema** (utPLSQL ใน schema เดียวกับเทสต์) grants ข้าม schema เหล่านี้ **ไม่**
> จำเป็น — เฟรมเวิร์กอ่านซอร์สของตัวเอง

## ข้อจำกัดที่ทราบ

- การจับคู่ผลลัพธ์→เทสต์ทำโดยชื่อแพ็กเกจ + ชื่อ/คำอธิบายเทสต์;
  คำอธิบายที่เหมือนกันในแพ็กเกจที่ต่างกันอาจทำให้เกิดความคลุมเครือได้ (ดัชนี
  จำกัดขอบเขตตามแพ็กเกจเพื่อลดปัญหานี้)
- พิจารณาโฟลเดอร์เวิร์กสเปซ **แรก** เพื่อแก้ไข `sourcePath`
- การค้นพบอ่าน `.pks` (specs); เก็บ annotation `%suite`/`%test` ไว้ใน spec

## การแก้ไขปัญหา

| อาการ | สาเหตุที่เป็นไปได้ | วิธีแก้ |
|---|---|---|
| Suites ไม่ปรากฏ | ไม่มีไฟล์ `.pks` ที่ค้นพบ | รัน `utPLSQL: Validate configuration` เพื่อการวินิจฉัย |
| ความครอบคลุมว่างเปล่า | ขาด `GRANT EXECUTE ON DBMS_PROFILER` | รัน grants ใน [ข้อกำหนด](#ข้อกำหนดฐานข้อมูล) หรือใช้ `utPLSQL: Copy coverage grants to clipboard` |
| ความครอบคลุมว่างเปล่า | Oracle 19c ต้องใช้ grants เพิ่มเติม | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| ข้อผิดพลาดการคอมไพล์โดยไม่มีข้อบ่งชี้ | โค้ดที่มีข้อผิดพลาดไวยากรณ์ PL/SQL | เปิดใช้งาน `utplsql.compilationDiagnostics.enabled` (ค่าเริ่มต้นเปิด); ดูแผง Problems |
| ข้อผิดพลาดการเชื่อมต่อ | สตริงไม่ถูกต้องหรือฐานข้อมูลเข้าไม่ถึง | ใช้ `utPLSQL: Validate configuration` |
| Timeout ระหว่างรัน | เทสต์ใช้เวลานานกว่า `timeoutMinutes` | เพิ่ม `utplsql.timeoutMinutes` |
| `%suite` ไม่ได้รับการรู้จัก | ขาด `%suite`/`create package` ในไฟล์ หรือ `%test` ไม่มี `PROCEDURE` | ตรวจสอบ spec; รัน `utPLSQL: Refresh tests` |
| CodeLens ไม่ปรากฏ | `editor.codeLens` ถูกปิดหรือขัดแย้ง | เปิดใช้งาน `"editor.codeLens": true`; ตรวจสอบ `utplsql.codeLens.enabled` |
| ปุ่มลัดไม่ทำงาน | ขัดแย้งกับส่วนขยายอื่นหรือปุ่มลัดของ VSCode | ไปที่ File → Preferences → Keyboard Shortcuts และค้นหา `utplsql` เพื่อกำหนดใหม่ |

## สัญญาอนุญาต

MIT © Gil Cleber Barboza