<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · **Türkçe** · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

[utPLSQL](https://www.utplsql.org/)'i VSCode'a entegre ederek PL/SQL testlerini doğal **Test Explorer**'a taşır; bağlam menüsü ve görsel kapsam (coverage) ile birlikte.

- 🧪 **Doğal Test Explorer** — paketler ve testler test görünümünde görünür; teste, pakete, dosyaya veya klasöre göre çalıştırın.
- 🔍 **CodeLens** — editörde `%suite` ve `%test` üzerinde Run/Run with Coverage düğmeleri; kodunuzdan ayrılmadan.
- ⌨️ **Klavye kısayolları** — ana komutlar için `Ctrl+Shift+U` öneki + tuş (R = Tümünü Çalıştır, T = Dosyayı Çalıştır, L = Sonuncuyu Yeniden Çalıştır, vb.).
- 🖱️ **Bağlam menüsü** — bir **klasöre** veya **`.pks`/`.pkb`** dosyasına (Explorer'da ya da editörde) sağ tıklayarak testleri çalıştırın.
- 📊 **Görsel kapsam (coverage)** — satır başına renkli kenar çubuğu (kapsanan/kapsanmayan) ve **Coverage** sekmesinde dosya başına yüzde.
- ✅ **Satır içi süslemeler** — çalıştırmadan sonra editörde ✓/✗/⚠ simgeleri; hata ipucu ve genel bakış cetveli ile.
- 📌 **Durum çubuğu** — geçti/kaldı sayısı, süre ve gerçek zamanlı ilerleme gösteren gösterge.
- 🔁 **Akıllı Yeniden Çalıştır** — tek bir kısayolla Sonuncuyu Yeniden Çalıştır, İmleçte Çalıştır, Yalnızca Başarısızları Çalıştır.
- 🚀 **Oracle doğrudan (node-oracledb üzerinden)** — toplu işin bitmesini beklemeden gerçek zamanlı akış.
- 🔧 **Kurulum tanılama** — bağlantı, yetkiler ve sürümün hızlı düzeltmeyle (quick-fix) proaktif doğrulaması.
- 🧩 **Şema farkındalıklı ağaç** — testleri Test Explorer'da Schema > Package > Suite > Test olarak düzenleyin.
- 🎯 **Hataya atlama** — başarısız olan iddianın satırına doğrudan gezinme (doğal "Go to Error" ile).
- 🔌 **Bağlantı profilleri** — status bar veya komut paleti aracılığıyla profil başına ayarlarla birden fazla ortam (DEV/TEST/PROD) arasında kaydedin ve geçiş yapın.
- 📈 **İfade ve görünüm kapsamı** — Coverage sekmesi dosya başına `% of statements` (PROCEDURE/FUNCTION) gösterir ve `V$SQL` üzerinden çalıştırılan görünümleri izler.
- 🐛 **PL/SQL Hata Ayıklama** — `DBMS_DEBUG` üzerinden utPLSQL testlerinde kesme noktaları ve adım adım hata ayıklama (doğal Debug Adapter).
- 🌍 **i18n — 24 dil** — `utplsql.language` VSCode'u takip eder (15 yerel + 9 topluluk: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Kurulum

Uzantı iki şekilde kurulabilir:

1. **Marketplace'ten:** VSCode uzantı panelinde (`Ctrl+Shift+X`) **utPLSQL Test Runner** arayın ve **Install**'e tıklayın.
2. **Manuel (.vsix):** İstediğiniz sürümün `.vsix` dosyasını indirin ve VSCode'a kurun:
   * **Komut satırı üzerinden:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Arayüz üzerinden:** Uzantılar panelini açın (`Ctrl+Shift+X`), sağ üst köşedeki üç noktaya `...` tıklayın ve **Install from VSIX...** seçeneğini seçin.

## Gereksinimler

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** Oracle veritabanına kurulu.
- Veritabanı dışında hiçbir şey gerekmez — VSIX ince `oracledb` sürücüsünü zaten içerir (Instant Client gerekmez).
- **VSCode 1.88+** (Test Coverage API).

Uzantı yalnızca "grafik istemcidir" — testleri çalıştıran veritabanıdır: node-oracledb doğrudan bağlantısı üzerinden.

## Bağlantı

Uzantının testleri çalıştırmak için bir Oracle bağlantı dizesine ihtiyacı vardır. Çözüm şu sırayı izler:

1. **Etkin bağlantı profili** — `utplsql.profiles` içindeki bir profili gösteren `utplsql.activeProfile` (aşağıdakilerin hepsini geçersiz kılar).
2. **`utplsql.connection` ayarı** — proje/kullanıcı `settings.json`'dan okunur.
3. **`UTPLSQL_CONN` ortam değişkeni** — VSCode'u açmadan önce ayarlanır.
4. **Oturum önbelleği** — kullanıcı bağlantıyı zaten istem üzerinden yazmışsa.
5. **Kullanıcıya sor** — sorar ve yalnızca geçerli oturumda tutar.

Bağlantı profilleri (`utplsql.profiles`) ortam başına `sourcePath`, `coverageOwner` vb. değerlerini de geçersiz kılabilir — yapılandırma tablosundaki `utplsql.activeProfile` bölümüne bakın.

⚠️ **Güvenlik önerisi:** bağlantı dizesi bir parola içerir. Paylaşılan ortamlarda **`utplsql.connection` ayarını KULLANMAYIN** (settings.json sürümlenebilir veya başkaları tarafından görülebilir).
Bunun yerine **`UTPLSQL_CONN` ortam değişkenini kullanın**:

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

Ne ayar ne de ortam değişkeni tanımlıysa, uzantı bağlantıyı sorar ve yalnızca
oturum sırasında bellekte tutar — temizlemek için
**utPLSQL: Clear session connection** komutunu (komut paleti) kullanın.

**Kabul edilen biçimler:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS takma adı**: `user/pass@tns_alias` (`TNS_ADMIN` yapılandırılmış olmalıdır)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Nasıl çalışır

Uzantı, node-oracledb üzerinden Oracle veritabanına doğrudan bağlanarak testleri çalıştırır.

Geçici dosya yok, toplu işin bitmesi beklenmez. Sonuçlar Test Explorer'da
**her test bittiğinde** görünür.

## Yapılandırma

| Ayar | Varsayılan | Açıklama |
|---|---|---|
| `utplsql.connection` | `""` | Oracle bağlantısı. **Boş bırakın** ve parolayı saklamamak için `UTPLSQL_CONN` ortam değişkenini kullanın. İkisi de boşsa, uzantı sorar (yalnızca oturumda tutar). |
| `utplsql.sourcePath` | `install` | Üretim kodunun klasörü (kapsamı dosyalara eşlemek için). |
| `utplsql.includePatterns` | `["**/*.pks"]` | `%suite`/`%test` içeren şemaları keşfetmek için glob'lar. Testleriniz `.sql` içindeyse `["**/*.sql"]` kullanın. |
| `utplsql.coverageOwner` | `""` | Kapsanan nesnelerin şema sahibi. Boş = bağlantı kullanıcısını kullanır (büyük harfle). |
| `utplsql.timeoutMinutes` | `60` | Çalıştırma zaman aşımı (dakika). |
| `utplsql.dbmsOutput` | `false` | Test oturumunda `DBMS_OUTPUT`'u etkinleştirir. |
| `utplsql.additionalReporters` | `[]` | Her çalıştırmada eklenecek ek raporlayıcılar (örn. `["ut_coverage_html_reporter"]`). Varsayılanlar (documentation, junit, coverage) her zaman dahildir ve listelenmeleri gerekmez. |
| `utplsql.codeLens.enabled` | `true` | `%suite` ve `%test` üzerinde Run/Run with Coverage CodeLens düğmelerini gösterir. |
| `utplsql.statusBar.enabled` | `true` | Durum çubuğunda test durum göstergesini gösterir. |
| `utplsql.decorations.enabled` | `true` | Çalıştırmadan sonra `%suite` ve `%test` satırlarında geçti/kaldı süslemelerini gösterir. |
| `utplsql.oraclePoolMin` | `2` | Oracle runner havuzunda tutulan minimum bağlantı sayısı (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Oracle runner havuzundaki maksimum bağlantı sayısı (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Oracle runner havuzunu genişletirken artış miktarı (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Boştaki havuz bağlantılarının sağlık kontrolleri arasındaki saniye (node-oracledb). `0` = her kullanımda ping. |
| `utplsql.organization` | `file` | Ağaç düzeni: `file` (yola göre) veya `schema` (Schema > Package > Suite > Test). `schema` modunda, `.pks` dosyaları çalışma alanında yoksa paketler de veritabanından (`ALL_OBJECTS`/`ALL_SOURCE`) keşfedilir — sanal URI `utplsql-db:/` ile (CodeLens/süsleme/hataya atlama yok). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Şemayı yoldan çıkarmak için glob deseni. Yer tutucu olarak `{schema}` kullanın. `schema` modunda desen tabanının altındaki dizinler (örn. `db/*`) veritabanında sorgulanan şemaları tanımlar. |
| `utplsql.compilationDiagnostics.enabled` | `true` | PL/SQL derleme hatalarını editörde ve Sorunlar Paneli'nde (Problems Panel) altı çizili olarak gösterir. |
| `utplsql.setupDiagnostics.enabled` | `true` | Yapılandırma tanılamalarını (bağlantı, yetkiler, sürüm) ve **utPLSQL kurulum bütünlüğünü** (UT3 şemasındaki geçersiz nesneler, "Recompile UT3" hızlı düzeltmesiyle) hızlı düzeltme eylemleriyle gösterir. |
| `utplsql.profiles` | `[]` | Ortamlar arasında geçiş yapmak için kaydedilen Oracle bağlantı profilleri (ad, bağlantı ve `sourcePath`/`coverageOwner`/vb. geçersiz kılmaları). |
| `utplsql.activeProfile` | `""` | Etkin profilin kimliği (`utplsql.profiles`). Ayarlandığında `utplsql.connection`'ı geçersiz kılar. |
| `utplsql.sqlCoverageEnabled` | `false` | `V$SQL` üzerinden çalıştırılan görünümleri izler (boolean kapsam). `GRANT SELECT ON V$SQL` gerektirir. |
| `utplsql.debugger.enabled` | `true` | PL/SQL test hata ayıklamayı etkinleştirir (`DBMS_DEBUG`). `node-oracledb` + yetkiler gerektirir. |
| `utplsql.debugger.stopOnException` | `true` | Hata ayıklama sırasında PL/SQL istisnalarında durur. |
| `utplsql.debugger.timeoutSeconds` | `300` | Hata ayıklama oturumunun zaman aşımı (s). |
| `utplsql.language` | `auto` | Çalışma zamanı mesajlarının dili. `auto`, VSCode'u takip eder (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; aksi halde en). **24 yerel ayarı** kapsar (15 yerel + 9 topluluk). |

Örnek (proje `.vscode/settings.json`):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

Ve VSCode'u açmadan önce (veya PowerShell profilinizde):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Katkıda bulunanlar için

Entegrasyon testlerinin kullandığı ortam değişkenleriyle proje kökünde
(gitignored) bir `.env` dosyası oluşturun:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Kullanım

1. PL/SQL projesini açın (kod ve test paketleriyle).
2. Kodu ve testleri veritabanında derleyin (Oracle uzantısı / SQLcl).
3. **Testing** görünümünü açın → paketler görünür.
4. Çalıştırın:
   - **CodeLens** üzerinden — editörde her `%suite` ve `%test` üzerinde ▶ Run/Run with Coverage düğmeleri.
   - Her test/paketin yanındaki **kenar boşluğu** (gutter) üzerinden, veya
   - **klavye kısayolları** üzerinden (`Ctrl+Shift+U R` = Tümünü Çalıştır, `Ctrl+Shift+U T` = Dosyayı Çalıştır, vb.), veya
   - Test Explorer görünümünün **Run Tests** düğmesi, veya
   - Bir klasöre/dosyaya **sağ tıklayın** → *utPLSQL: Run tests…* (kapsamla veya kapsamsız).
5. Çalıştırmadan sonra şunları görürsünüz:
   - Test ek açıklamalarının yanında editörde **satır içi süslemeler** (✓/✗/⚠).
   - Geçti/kaldı sayısı ve toplam süre içeren **durum çubuğu**.
   - Ayrıntılı sonuçlarla **Test Explorer**.
6. Kapsam için **Run with Coverage** profilini (veya "kapsamla" menü öğesini) kullanın.
7. Çalıştırmaları hızlıca tekrarlamak için:
   - `Ctrl+Shift+U L` — **Sonuncuyu Yeniden Çalıştır** (son çalıştırmayı kapsamla veya kapsamsız tekrarlar).
   - `Ctrl+Shift+U U` — **İmleçte Çalıştır** (imlecin altındaki `%test`/`%suite`'i çalıştırır).
   - `Ctrl+Shift+U X` — **Yalnızca Başarısızları Çalıştır** (yalnızca başarısız olan testleri çalıştırır).
8. **Oracle doğrudan (akış) için:** kurulacak bir şey yok — VSIX ince `oracledb` sürücüsünü zaten içerir.
9. Tanılama için palette `utPLSQL: Show information` kullanın — kopyalama seçeneğiyle sürüm bilgilerini gösterir.
10. **utPLSQL: Select additional reporter...** — veritabanında bulunan raporlayıcılarla QuickPick.
11. **utPLSQL: Cancel execution** — çalışan çalıştırmayı durdurur (çalıştırma sırasında `Escape`).
12. **utPLSQL: Refresh tests** — `.pks` dosyalarının yeniden keşfini zorlar.

> 💡 **Test yazarken:** ayrıştırıcı belirteç (token) güdümlüdür — dosyada `%suite`
> ve `create package` bildirimi yeterlidir; her `%test` kendi
> `PROCEDURE`'ıyla birlikte. Boş satır şartı yoktur.

### Desteklenen ek açıklamalar (v0.10.0+)

`%suite` ve `%test` dışında, keşif şunları da anlar:

| Ek açıklama | Test Explorer üzerindeki etkisi |
|---|---|
| `-- %disabled` | Paket veya test ağaçta **görünmez** (keşifte atlanır) |
| `-- %throws(-20001)` | Testin 20001 istisnasını beklediğini işaretler (`expectedError` meta verisi) |
| `-- %tags(fast, critical)` | Test etiketleri (meta veri; etiket filtreleme yol haritasında) |
| `-- %displayname(Name)` | `%test` açıklaması yerine gösterilen özel ad |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Paketi yaşam döngüsü kancalarıyla işaretler (meta veri) |

Ek açıklamalar büyük/küçük harfe duyarsızdır. Paket başlığında (`%suite` ile
ilk `%test` arasında) pakete uygulanır; `%test`'ten sonra teste uygulanır.

## Komutlar

Tüm uzantı komutları (palet `Ctrl+Shift+P` öneki `utPLSQL:`):

| Komut | Açıklama | UI kısayolu |
|---|---|---|
| `utPLSQL: Run all tests` | Çalışma alanındaki tüm paketleri çalıştırır | Testing görünümündeki ▶ düğmesi |
| `utPLSQL: Run tests in this file` | Etkin `.pks`/`.pkb` dosyasının paketlerini çalıştırır | Sağ tık → dosya |
| `utPLSQL: Run tests in this file with coverage` | Aynısı, kapsam profiliyle | Sağ tık → dosya |
| `utPLSQL: Run tests in this folder` | Seçili klasörün paketlerini çalıştırır | Sağ tık → klasör |
| `utPLSQL: Run tests in this folder with coverage` | Aynısı, kapsam profiliyle | Sağ tık → klasör |
| `utPLSQL: Refresh tests` | `.pks` dosyalarının yeniden keşfini zorlar | — |
| `utPLSQL: Cancel execution` | Çalışan çalıştırmayı durdurur | — |
| `utPLSQL: Show utPLSQL information` | Kopyalama seçeneğiyle sürüm bilgileri | — |
| `utPLSQL: Select additional reporter...` | Veritabanı raporlayıcılarıyla QuickPick | — |
| `utPLSQL: Clear session connection` | Bağlantıyı oturum önbelleğinden kaldırır | — |
| `utPLSQL: Rerun Last` | Son çalıştırmayı tekrarlar | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | İmlecin altındaki testi çalıştırır | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Yalnızca başarısız testleri yeniden çalıştırır | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Tam kurulum doğrulaması yapar (bağlantı, UT3 kurulumu) ve sonuçları gösterir | — |
| `utPLSQL: Configure connection` | Ayarları `utplsql.connection` konumunda açar | — |
| `utPLSQL: Copy coverage grants to clipboard` | Yetki SQL'ini panoya kopyalar | — |
| `utPLSQL: Show Test Explorer` | Testing görünümüne odaklanır | — |
| `utPLSQL: Switch connection profile...` | Etkin bağlantı profilini değiştirir (QuickPick) | Durum çubuğuna tıklayın (etkin profille) |
| `utPLSQL: New connection profile...` | Bir profil oluşturmak ve etkinleştirmek için sihirbaz | — |
| `utPLSQL: Manage connection profiles` | Ayarları `utplsql.profiles` konumunda açar | — |
| `utPLSQL: Import connections from SQL Developer` | SQL Developer'dan bağlantıları içe aktarır (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Etkin dosyanın altındaki testin hata ayıklama oturumunu başlatır | — |

> **Recompile UT3** (`utplsql.recompileUt3`) bir **palet komutu değildir** — "utPLSQL Setup"
> tanılamasının iç bir hızlı düzeltmesidir (utPLSQL şemasındaki geçersiz nesneler).

## Klavye kısayolları

Tüm kısayollar `Ctrl+Shift+U` önekini kullanır (Mac'te `Cmd+Shift+U`):

| Kısayol | Komut |
|---|---|
| `Ctrl+Shift+U R` | Tüm testleri çalıştır |
| `Ctrl+Shift+U T` | Dosyadaki testleri çalıştır |
| `Ctrl+Shift+U Shift+T` | Dosyadaki testleri kapsamla çalıştır |
| `Ctrl+Shift+U F` | Testleri yenile |
| `Ctrl+Shift+U I` | utPLSQL bilgisini göster |
| `Ctrl+Shift+U C` | Oturum bağlantısını temizle |
| `Ctrl+Shift+U L` | Sonuncuyu yeniden çalıştır |
| `Ctrl+Shift+U U` | İmleçte çalıştır |
| `Ctrl+Shift+U X` | Yalnızca başarısızları çalıştır |
| `Escape` | Çalıştırmayı iptal et |

## Kapsam (Coverage)

- **Çalıştırılan** satırlar kenar boşluğunda yeşil olur; **çalıştırılmayan** satırlar kırmızı olur.
- **Test Coverage** sekmesi **dosya/klasör başına yüzdeyi** gösterir.



Uzantı `utplsql.sourcePath` üzerinden kapsamı kaynak dosyalara eşler. `-owner`
bağlantıdan (veya `utplsql.coverageOwner`'dan) türetilir.

## Raporlayıcılar

Uzantı her zaman üç varsayılan raporlayıcı içerir:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (sonuçlar → Test Explorer) ve
`ut_coverage_cobertura_reporter` (kapsam, varsa).

**Dinamik doğrulama** — kapsamla çalıştırmadan önce, uzantı veritabanını
`utplsql reporters <conn>` üzerinden sorgular. Veritabanında
`UT_COVERAGE_COBERTURA_REPORTER` yoksa (örn. eski utPLSQL),
kapsam çıktıda bir uyarıyla atlanır. Test çalıştırması asla
engellenmez.

**Ek sabit raporlayıcılar** — `utplsql.additionalReporters` ayarı:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Üç varsayılan raporlayıcı, burada listelense bile otomatik olarak
yinelenmekten (dedupe) çıkarılır.

**Oturum başına geçici raporlayıcı** — **utPLSQL: Select additional
reporter...** komutu, veritabanındaki dinamik listeyle bir QuickPick açar. Seçilen
raporlayıcı bir sonraki çalıştırmada kullanılır ve sonrasında atılır (ayarlarda
kalıcı olmaz).

## Veritabanı gereksinimleri

**Kapsam (coverage)** (her zaman) — profilleyiciyi etkinleştirir:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Bu olmadan testler çalışır ancak kapsam **boş** gelir.

**Diğer şemalarda test keşfi** (utPLSQL **paylaşılan** kurulum, örn. sahibi `UT3`):
framework'ün uygulama şemalarının testlerini görmesi ve ayrıştırması için utPLSQL sahibinin
o şemaların **sözlüğünü okuması** gerekir:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` tek başına YETERLİ DEĞİLDİR** — bu görünümlerde **doğrudan** yetkiler gerekir
  (çünkü definer bağlamında `dbms_assert.sql_object_name`).
- utPLSQL **DDL tetikleyicisi** de kurulmuş olmalıdır (ek açıklama önbelleğini güncel tutar).
- Doğrulama (sahip olarak): `SELECT ut_metadata.get_source_view_name FROM dual;` `dba_source` döndürmelidir.

> **Şema başına** kurulumlarda (utPLSQL testlerle aynı şemada), bu şemalar arası yetkiler **gerekli
> değildir** — framework kendi kaynağını okur.

## Bilinen sınırlamalar

- Sonuç→test eşlemesi paket adı + test adı/açıklamasıyla yapılır;
  farklı paketlerdeki aynı açıklamalar belirsizlik yaratabilir (dizin
  pakete göre kapsamlanarak bu en aza indirilir).
- `sourcePath`'i çözmek için **ilk** çalışma alanı klasörünü dikkate alır.
- Keşif `.pks` (şema) dosyalarını okur; `%suite`/`%test` ek açıklamalarını şemada tutun.

## Sorun giderme

| Belirti | Olası neden | Çözüm |
|---|---|---|
| Paketler görünmüyor | Veritabanı bulunamadı | Tanılama için `utPLSQL: Validate configuration` çalıştırın |
| Boş kapsam | `GRANT EXECUTE ON DBMS_PROFILER` eksik | [Veritabanı gereksinimleri](#veritabanı-gereksinimleri) içindeki yetkileri çalıştırın veya `utPLSQL: Copy coverage grants to clipboard` kullanın |
| Boş kapsam | Oracle 19c ek yetkiler gerektirir | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Neden belirtilmeyen derleme hatası | PL/SQL sözdizimi hatası olan kod | `utplsql.compilationDiagnostics.enabled` etkinleştirin (varsayılan açık); Sorunlar Paneli'ne bakın |
| Bağlantı hatası | Hatalı biçimli dize veya erişilemeyen veritabanı | `utPLSQL: Validate configuration` kullanın |
| Çalışırken zaman aşımı | Testler `timeoutMinutes` değerinden uzun sürüyor | `utplsql.timeoutMinutes` değerini artırın |
| `%suite` tanınmıyor | Dosyada `%suite`/`create package` eksik veya `%test` `PROCEDURE` olmadan | Şemayı kontrol edin; `utPLSQL: Refresh tests` çalıştırın |
| CodeLens görünmüyor | `editor.codeLens` devre dışı veya çakışma | `"editor.codeLens": true` ayarlayın; `utplsql.codeLens.enabled` değerini kontrol edin |
| Kısayollar çalışmıyor | Başka bir uzantıyla veya VSCode kısayoluyla çakışma | Dosya → Tercihler → Klavye Kısayolları'na gidin ve yeniden tanımlamak için `utplsql` arayın |

## Lisans

MIT © Gil Cleber Barboza
