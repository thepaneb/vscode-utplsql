<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · **Bahasa Indonesia** · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

Mengintegrasikan [utPLSQL](https://www.utplsql.org/) ke dalam VSCode, membawa pengujian PL/SQL ke **Test Explorer** asli, dengan menu konteks dan cakupan visual.

- 🧪 **Test Explorer asli** — suite dan pengujian muncul di tampilan testing; jalankan per pengujian, suite, file, atau folder.
- 🔍 **CodeLens** — tombol Run/Run with Coverage di atas `%suite` dan `%test` di editor, tanpa meninggalkan kode Anda.
- ⌨️ **Pintasan keyboard** — prefiks `Ctrl+Shift+U` + tombol untuk perintah utama (R = Run All, T = Run File, L = Rerun Last, dll.).
- 🖱️ **Menu konteks** — klik kanan pada **folder** atau file **`.pks`/`.pkb`** (di Explorer atau di editor) untuk menjalankan pengujian.
- 📊 **Cakupan visual** — gutter berwarna per baris (tercakup/tidak tercakup) dan persentase per file di tab **Coverage**.
- ✅ **Dekorasi inline** — ikon ✓/✗/⚠ di editor setelah eksekusi, dengan tooltip kegagalan dan overview ruler.
- 📌 **Status Bar** — indikator dengan jumlah lolos/gagal, durasi, dan progres waktu nyata.
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only dengan satu pintasan.
- 🚀 **Oracle langsung (via node-oracledb)** — streaming waktu nyata, tanpa menunggu batch selesai.
- 🔧 **Diagnostik pengaturan** — validasi proaktif terhadap koneksi, grant, dan versi dengan quick-fix.
- 🧩 **Pohon sadar-schema** — atur pengujian berdasarkan Schema > Package > Suite > Test di Test Explorer.
- 🎯 **Langsung ke kegagalan** — navigasi langsung ke baris asersi yang gagal (melalui "Go to Error" asli).
- 🔌 **Profil koneksi** — simpan dan beralih antar beberapa lingkungan (DEV/TEST/PROD) dengan pengaturan per profil, melalui bilah status atau palet perintah.
- 📈 **Cakupan pernyataan dan view** — tab Coverage menampilkan `% pernyataan` (PROCEDURE/FUNCTION) per file dan melacak view yang dieksekusi melalui `V$SQL`.
- 🐛 **Debug PL/SQL** — breakpoint dan debugging langkah demi langkah untuk pengujian utPLSQL melalui `DBMS_DEBUG` (Debug Adapter asli).
- 🌍 **i18n — 24 bahasa** — `utplsql.language` mengikuti VSCode (15 asli + 9 komunitas: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Instalasi

Ekstensi dapat diinstal dengan dua cara:

1. **Dari Marketplace:** cari **utPLSQL Test Runner** di panel ekstensi VSCode (`Ctrl+Shift+X`) lalu klik **Install**.
2. **Manual (.vsix):** unduh file `.vsix` dari versi yang diinginkan lalu instal di VSCode:
   * **Melalui Baris Perintah:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Melalui Antarmuka:** buka panel Ekstensi (`Ctrl+Shift+X`), klik tiga titik `...` (pojok kanan atas) lalu pilih **Install from VSIX...**.

## Persyaratan

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** terinstal di database Oracle.
- Hanya perlu database — VSIX sudah menyertakan driver tipis `oracledb` (tanpa Instant Client).
- **VSCode 1.88+** (Test Coverage API).

Ekstensi hanyalah "klien grafis" — yang menjalankan pengujian adalah database langsung via node-oracledb.

## Koneksi

Ekstensi membutuhkan string koneksi Oracle untuk menjalankan pengujian. Resolusi mengikuti urutan berikut:

1. **Profil koneksi aktif** — `utplsql.activeProfile` yang menunjuk ke profil di `utplsql.profiles` (menimpa semua yang di bawah).
2. **Pengaturan `utplsql.connection`** — dibaca dari `settings.json` proyek/pengguna.
3. **Variabel lingkungan `UTPLSQL_CONN`** — diatur sebelum membuka VSCode.
4. **Cache sesi** — jika pengguna sudah mengetik koneksi melalui prompt.
5. **Prompt kepada pengguna** — bertanya dan menyimpannya hanya di sesi saat ini.

Profil koneksi (`utplsql.profiles`) juga dapat menimpa `sourcePath`, `coverageOwner` dll. per lingkungan — lihat `utplsql.activeProfile` di tabel konfigurasi.

⚠️ **Rekomendasi keamanan:** string koneksi berisi kata sandi. **JANGAN** gunakan
pengaturan `utplsql.connection` di lingkungan bersama (settings.json dapat dikelola versinya
atau terlihat oleh orang lain). Sebagai gantinya, **gunakan variabel lingkungan `UTPLSQL_CONN`**:

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

Jika pengaturan maupun variabel lingkungan tidak ditentukan, ekstensi akan bertanya tentang
koneksi dan menyimpannya hanya di memori selama sesi — gunakan perintah
**utPLSQL: Clear session connection** (palet perintah) untuk menghapusnya.

**Format yang diterima:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias` (memerlukan `TNS_ADMIN` terkonfigurasi)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Cara kerja

Tanpa file sementara, tanpa menunggu batch. Hasil muncul di
Test Explorer **begitu setiap pengujian selesai**.

Ekstensi terhubung langsung ke Oracle, membaca laporan (JUnit + Coverage) lalu menerjemahkannya ke API asli VSCode.

## Konfigurasi

| Pengaturan | Default | Deskripsi |
|---|---|---|
| `utplsql.connection` | `""` | Koneksi Oracle. **Biarkan kosong** dan gunakan variabel lingkungan `UTPLSQL_CONN` untuk menghindari penyimpanan kata sandi. Jika keduanya kosong, ekstensi akan bertanya (hanya menyimpannya di sesi). |
| `utplsql.sourcePath` | `install` | Folder kode produksi (untuk memetakan coverage ke file). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Glob untuk menemukan spec dengan `%suite`/`%test`. Jika pengujian Anda di `.sql`, gunakan `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Pemilik schema dari objek yang dicakup. Kosong = memakai user koneksi (huruf besar). |
| `utplsql.additionalReporters` | `[]` | Reporter tambahan yang disertakan pada setiap eksekusi (mis. `["ut_coverage_html_reporter"]`). Default (documentation, junit, coverage) selalu disertakan dan tidak perlu didaftarkan. |
| `utplsql.codeLens.enabled` | `true` | Menampilkan tombol CodeLens Run/Run with Coverage di atas `%suite` dan `%test`. |
| `utplsql.statusBar.enabled` | `true` | Menampilkan indikator status pengujian di bilah status. |
| `utplsql.decorations.enabled` | `true` | Menampilkan dekorasi lolos/gagal pada baris `%suite` dan `%test` setelah eksekusi. |
| `utplsql.oraclePoolMin` | `2` | Jumlah minimum koneksi yang disimpan di pool runner Oracle (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Jumlah maksimum koneksi di pool runner Oracle (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Kenaikan saat memperluas pool runner Oracle (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Detik antara pemeriksaan kesehatan koneksi idle di pool (node-oracledb). `0` = ping pada setiap checkout. |
| `utplsql.organization` | `file` | Organisasi pohon: `file` (berdasarkan path) atau `schema` (Schema > Package > Suite > Test). Pada mode `schema`, suite juga ditemukan dari database (`ALL_OBJECTS`/`ALL_SOURCE`) ketika file `.pks` tidak ada di workspace — dengan URI virtual `utplsql-db:/` (tanpa CodeLens/dekorasi/langsung ke kegagalan). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Pola glob untuk mengekstrak schema dari path. Gunakan `{schema}` sebagai placeholder. Pada mode `schema`, direktori di bawah basis pola (mis. `db/*`) menentukan schema yang ditanyakan di database. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Menampilkan error kompilasi PL/SQL sebagai garis bawah di editor dan Panel Problems. |
| `utplsql.setupDiagnostics.enabled` | `true` | Menampilkan diagnostik konfigurasi (koneksi, grant, versi) serta **integritas instalasi utPLSQL** (objek tidak valid di schema UT3, dengan quick-fix "Recompile UT3") beserta aksi quick-fix. |
| `utplsql.profiles` | `[]` | Profil koneksi Oracle yang tersimpan (nama, koneksi, dan penimpaan `sourcePath`/`coverageOwner`/dll.) untuk berpindah antar lingkungan. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID profil aktif (`utplsql.profiles`). Jika diatur, menimpa `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Melacak view yang dieksekusi melalui `V$SQL` (coverage boolean). Memerlukan `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Mengaktifkan debugging pengujian PL/SQL (`DBMS_DEBUG`). Memerlukan `node-oracledb` + grant. |
| `utplsql.debugger.stopOnException` | `true` | Berhenti pada exception PL/SQL saat debugging. |
| `utplsql.debugger.timeoutSeconds` | `300` | Waktu tunggu (detik) dari sesi debug. |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | Bahasa pesan runtime. `auto` mengikuti VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; selain itu en). Mencakup **24 locale** (15 asli + 9 komunitas). |

Contoh (`.vscode/settings.json` proyek):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

Dan, sebelum membuka VSCode (atau di profil PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Untuk kontributor

Buat file `.env` di root proyek (gitignored) berisi variabel
lingkungan yang dipakai oleh pengujian integrasi:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Penggunaan

1. Buka proyek PL/SQL (berisi paket kode dan pengujian).
2. Kompilasi kode dan pengujian di database (ekstensi Oracle / SQLcl).
3. Buka tampilan **Testing** → suite akan muncul.
4. Jalankan:
   - Melalui **CodeLens** — tombol ▶ Run/Run with Coverage di atas setiap `%suite` dan `%test` di editor.
   - Melalui **gutter** di samping setiap pengujian/suite, atau
   - Melalui **pintasan keyboard** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, dll.), atau
   - Tombol **Run Tests** pada tampilan Test Explorer, atau
   - **Klik kanan** pada folder/file → *utPLSQL: Run tests…* (dengan atau tanpa coverage).
5. Setelah eksekusi, lihat:
   - **Dekorasi inline** (✓/✗/⚠) di editor di samping anotasi pengujian.
   - **Status Bar** dengan jumlah lolos/gagal dan total durasi.
   - **Test Explorer** dengan hasil yang terperinci.
6. Untuk coverage, gunakan profil **Run with Coverage** (atau item menu "with coverage").
7. Untuk mengulang eksekusi dengan cepat:
   - `Ctrl+Shift+U L` — **Rerun Last** (mengulang eksekusi terakhir, dengan atau tanpa coverage).
   - `Ctrl+Shift+U U` — **Run at Cursor** (menjalankan `%test`/`%suite` di bawah kursor).
   - `Ctrl+Shift+U X` — **Run Failed Only** (hanya menjalankan pengujian yang gagal).
8. **Untuk Oracle langsung (streaming):** tidak perlu menginstal apa pun — VSIX sudah menyertakan driver tipis `oracledb`.
9. Untuk diagnostik, gunakan `utPLSQL: Show information` di palet — menampilkan versi API/DB dengan opsi salin.
10. **utPLSQL: Select additional reporter...** — QuickPick berisi reporter yang tersedia di database.
11. **utPLSQL: Cancel execution** — menghentikan eksekusi yang berjalan (`Escape` selama eksekusi).
12. **utPLSQL: Refresh tests** — memaksa penemuan ulang `.pks`.

> 💡 **Saat menulis pengujian:** parser berbasis token — cukup sediakan `%suite`
> dan deklarasi `create package` di file, serta setiap `%test` diikuti
> `PROCEDURE`-nya. Tidak ada syarat baris kosong.

### Anotasi yang didukung (v0.10.0+)

Selain `%suite` dan `%test`, discovery juga memahami:

| Anotasi | Efek pada Test Explorer |
|---|---|
| `-- %disabled` | Suite atau pengujian **tidak muncul** di pohon (dilewati saat discovery) |
| `-- %throws(-20001)` | Menandai bahwa pengujian mengharapkan exception 20001 (metadata `expectedError`) |
| `-- %tags(fast, critical)` | Tag pengujian (metadata; pemfilteran tag ada di roadmap) |
| `-- %displayname(Name)` | Nama kustom yang ditampilkan menggantikan deskripsi `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Menandai suite dengan lifecycle hooks (metadata) |

Anotasi tidak peka huruf besar/kecil. Di header suite (antara `%suite` dan
`%test` pertama) anotasi berlaku untuk suite; setelah `%test`, berlaku untuk pengujian.

## Perintah

Semua perintah ekstensi (palet `Ctrl+Shift+P`, prefiks `utPLSQL:`):

| Perintah | Deskripsi | Pintasan UI |
|---|---|---|
| `utPLSQL: Run all tests` | Menjalankan semua suite di workspace | tombol ▶ di tampilan Testing |
| `utPLSQL: Run tests in this file` | Menjalankan suite dari `.pks`/`.pkb` yang aktif | Klik kanan → file |
| `utPLSQL: Run tests in this file with coverage` | Sama, dengan profil coverage | Klik kanan → file |
| `utPLSQL: Run tests in this folder` | Menjalankan suite dari folder yang dipilih | Klik kanan → folder |
| `utPLSQL: Run tests in this folder with coverage` | Sama, dengan profil coverage | Klik kanan → folder |
| `utPLSQL: Refresh tests` | Memaksa penemuan ulang `.pks` | — |
| `utPLSQL: Cancel execution` | Menghentikan eksekusi yang berjalan | — |
| `utPLSQL: Show utPLSQL information` | Versi API/DB dengan opsi salin | — |
| `utPLSQL: Select additional reporter...` | QuickPick berisi reporter database | — |
| `utPLSQL: Clear session connection` | Menghapus koneksi dari cache sesi | — |
| `utPLSQL: Rerun Last` | Mengulang eksekusi terakhir | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Menjalankan pengujian di bawah kursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Menjalankan ulang hanya pengujian yang gagal | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Menjalankan validasi pengaturan lengkap (koneksi, instalasi UT3) dan menampilkan hasilnya | — |
| `utPLSQL: Configure connection` | Membuka pengaturan di `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Menyalin SQL grant ke clipboard | — |
| `utPLSQL: Show Test Explorer` | Memfokuskan tampilan Testing | — |
| `utPLSQL: Switch connection profile...` | Mengganti profil koneksi aktif (QuickPick) | Klik pada bilah status (dengan profil aktif) |
| `utPLSQL: New connection profile...` | Wizard untuk membuat dan mengaktifkan profil | — |
| `utPLSQL: Manage connection profiles` | Membuka pengaturan di `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Mengimpor koneksi dari SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Memulai sesi debug untuk pengujian di bawah file aktif | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |

> **Recompile UT3** (`utplsql.recompileUt3`) **bukan** perintah palet — ini adalah
> quick-fix internal dari diagnostik "utPLSQL Setup" (objek tidak valid di
> schema utPLSQL).

## Pintasan keyboard

Semua pintasan memakai prefiks `Ctrl+Shift+U` (`Cmd+Shift+U` di Mac):

| Pintasan | Perintah |
|---|---|
| `Ctrl+Shift+U R` | Menjalankan semua pengujian |
| `Ctrl+Shift+U T` | Menjalankan pengujian di file |
| `Ctrl+Shift+U Shift+T` | Menjalankan pengujian di file dengan coverage |
| `Ctrl+Shift+U F` | Refresh pengujian |
| `Ctrl+Shift+U I` | Menampilkan informasi utPLSQL |
| `Ctrl+Shift+U C` | Menghapus koneksi sesi |
| `Ctrl+Shift+U L` | Rerun last |
| `Ctrl+Shift+U U` | Run at cursor |
| `Ctrl+Shift+U X` | Run failed only |
| `Escape` | Membatalkan eksekusi |

## Cakupan

- Baris yang **dieksekusi** menjadi hijau di gutter; baris yang **tidak dieksekusi** menjadi merah.
- Tab **Test Coverage** menampilkan **persentase per file/folder**.



Ekstensi mengirimkan `-source_path` (= `utplsql.sourcePath`) dan memetakan objek yang tercakup
ke file sumber melalui `utplsql.coverageSourceArgs` (regex + `type_mapping`). Nilai `-owner`
diturunkan dari koneksi (atau dari `utplsql.coverageOwner`).

### Memetakan coverage ke file (`coverageSourceArgs`)

`type_mapping` menerjemahkan "tipe" yang ditangkap oleh regex menjadi tipe Oracle. Tiga konvensi umum:

**1) Berdasarkan direktori** — struktur `sourcePath/<type>/<name>.sql` (folder `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Berfungsi di kedalaman berapa pun (`.*` menyerap modul di atasnya). Nama folder yang
> bervariasi (mis. `package`, `pkg`, `pacote`) dapat didaftarkan di `type_mapping`.

**2) Berdasarkan prefiks nama** — konvensi `pkg_*`, `prc_*`, `vw_*` (tidak bergantung pada folder):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Berdasarkan ekstensi file** — file `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (tidak bergantung pada folder):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Catatan penting:**
- **Package → `PACKAGE BODY`** (bukan `PACKAGE`): coverage dikumpulkan di **body** package.

## Reporter

Ekstensi selalu menyertakan tiga reporter default:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (hasil → Test Explorer) dan
`ut_coverage_cobertura_reporter` (coverage, jika tersedia).

**Validasi dinamis** — sebelum menjalankan dengan coverage, ekstensi menanyakan
database melalui `utplsql reporters <conn>`. Jika
`UT_COVERAGE_COBERTURA_REPORTER` tidak ada di database (mis. utPLSQL
usang), coverage dilewati dengan peringatan di output. Eksekusi pengujian
tidak pernah terblokir.

**Reporter tambahan tetap** — pengaturan `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Tiga reporter default otomatis di-deduplikasi, meskipun
didaftarkan di sini.

**Reporter per-sesi yang volatile** — perintah **utPLSQL: Select additional
reporter...** membuka QuickPick berisi daftar dinamis dari database. Reporter
yang dipilih dipakai pada eksekusi berikutnya lalu dibuang setelahnya (tidak
disimpan di pengaturan).

## Persyaratan basis data

**Coverage** (selalu) — mengaktifkan profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Tanpa ini, pengujian tetap berjalan tetapi coverage keluar **kosong**.

**Discovery pengujian di schema LAIN** (instalasi utPLSQL **shared**, mis. pemilik `UT3`):
agar framework dapat melihat dan mengurai pengujian dari schema aplikasi, pemilik utPLSQL perlu
**membaca kamus (dictionary)** dari schema tersebut:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` saja TIDAK cukup** — diperlukan grant **langsung** pada view tersebut
  (karena `dbms_assert.sql_object_name` dalam konteks definer).
- Trigger **DDL** utPLSQL juga harus diinstal (menjaga cache anotasi tetap mutakhir).
- Verifikasi (sebagai pemilik): `SELECT ut_metadata.get_source_view_name FROM dual;` harus mengembalikan `dba_source`.

> Pada instalasi **per-schema** (utPLSQL di schema yang sama dengan pengujian), grant lintas-schema tersebut **tidak**
> diperlukan — framework membaca sumbernya sendiri.

## Keterbatasan yang diketahui

- Pemetaan hasil→pengujian dilakukan berdasarkan nama package + nama/deskripsi pengujian;
  deskripsi yang identik di package berbeda dapat menimbulkan ambiguitas (indeks
  dibatasi per package untuk meminimalkan hal ini).
- Menganggap folder workspace **pertama** untuk menyelesaikan `sourcePath`.
- Discovery membaca `.pks` (spec); simpan anotasi `%suite`/`%test` di spec.

## Pemecahan masalah

| Gejala | Kemungkinan penyebab | Solusi |
|---|---|---|
| Coverage kosong | `GRANT EXECUTE ON DBMS_PROFILER` tidak ada | Jalankan grant di [Persyaratan basis data](#persyaratan-basis-data) atau gunakan `utPLSQL: Copy coverage grants to clipboard` |
| Coverage kosong | Oracle 19c memerlukan grant tambahan | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Error kompilasi tanpa keterangan | Kode dengan error sintaks PL/SQL | Aktifkan `utplsql.compilationDiagnostics.enabled` (default aktif); lihat Panel Problems |
| Error koneksi | String tidak valid atau DB tidak dapat dijangkau | Gunakan `utPLSQL: Validate configuration` |
| `%suite` tidak dikenali | Tidak ada `%suite`/`create package` di file, atau `%test` tanpa `PROCEDURE` | Periksa spec; jalankan `utPLSQL: Refresh tests` |
| CodeLens tidak muncul | `editor.codeLens` nonaktif atau konflik | Aktifkan `"editor.codeLens": true`; periksa `utplsql.codeLens.enabled` |
| Pintasan tidak berfungsi | Konflik dengan ekstensi lain atau pintasan VSCode | Buka File → Preferences → Keyboard Shortcuts dan cari `utplsql` untuk mendefinisikan ulang |

## Lisensi

MIT © Gil Cleber Barboza
