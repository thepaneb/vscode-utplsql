<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<p align="center">
  [English](README.md) · [Português](README.pt-BR.md) · **Español** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [한국어](README.ko.md) · [Русский](README.ru.md) · [Türkçe](README.tr.md) · [Polski](README.pl.md) · [Čeština](README.cs.md) · [Magyar](README.hu.md) · [Български](README.bg.md) · [Ελληνικά](README.el.md) · [Bahasa Indonesia](README.id.md) · [Română](README.ro.md) · [Српски](README.sr.md) · [ไทย](README.th.md) · [Українська](README.uk.md) · [Tiếng Việt](README.vi.md) · [English (UK)](README.en-GB.md)
</p>

# utPLSQL Test Runner

Integra [utPLSQL](https://www.utplsql.org/) en VSCode, llevando las pruebas de PL/SQL al **Test Explorer** nativo, con menú contextual y cobertura visual.

- 🧪 **Test Explorer nativo** — las suites y los tests aparecen en la vista de pruebas; ejecute por test, suite, archivo o carpeta.
- 🔍 **CodeLens** — botones Run/Run with Coverage sobre `%suite` y `%test` en el editor, sin salir del código.
- ⌨️ **Atajos de teclado** — prefijo `Ctrl+Shift+U` + tecla para los comandos principales (R = Run All, T = Run File, L = Rerun Last, etc.).
- 🖱️ **Menú contextual** — clic derecho en una **carpeta** o en un archivo **`.pks`/`.pkb`** (en el Explorer o en el editor) para ejecutar los tests.
- 📊 **Cobertura visual** — gutters coloreados por línea (cubierta/no cubierta) y porcentaje por archivo en la pestaña **Coverage**.
- ✅ **Decoraciones en línea** — iconos ✓/✗/⚠ en el editor después de la ejecución, con tooltip del fallo y overview ruler.
- 📌 **Barra de estado** — indicador con recuento de pass/fail, duración y progreso en tiempo real.
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only con un único atajo.
- 🚀 **Oracle directo (vía node-oracledb)** — streaming en tiempo real, sin esperar a que termine el lote.
- 🔧 **Diagnósticos de configuración** — validación proactiva de CLI, conexión, grants y versión con quick-fix.
- 🧩 **Árbol consciente del esquema** — organice los tests por Schema > Package > Suite > Test en el Test Explorer.
- 🎯 **Salto al fallo** — navegación directa a la línea de la aserción que falló (mediante el "Go to Error" nativo).
- 🔌 **Perfiles de conexión** — guarde y alterne entre múltiples entornos (DEV/TEST/PROD) con configuración por perfil, desde la barra de estado o la paleta de comandos.
- 📈 **Cobertura por declaración y de vistas** — la pestaña Coverage muestra `% de declaraciones` (PROCEDURE/FUNCTION) por archivo y rastrea las vistas ejecutadas vía `V$SQL`.
- 🐛 **Depuración PL/SQL** — breakpoints y depuración paso a paso de tests utPLSQL vía `DBMS_DEBUG` (Debug Adapter nativo).
- 🌍 **i18n — 24 idiomas** — `utplsql.language` sigue a VSCode (15 nativos + 9 de la comunidad: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Instalación

La extensión se puede instalar de dos maneras:

1. **Desde el Marketplace:** busque **utPLSQL Test Runner** en el panel de extensiones de VSCode (`Ctrl+Shift+X`) y haga clic en **Instalar**.
2. **Manualmente (.vsix):** descargue el archivo `.vsix` de la versión deseada e instálelo en VSCode:
   * **Mediante línea de comandos:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Mediante la interfaz:** abra el panel de Extensiones (`Ctrl+Shift+X`), haga clic en los tres puntos `...` (esquina superior derecha) y seleccione **Install from VSIX...**.

## Requisitos

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** instalado en la base de datos Oracle.
- **Para el modo CLI:** [**utPLSQL-cli**](https://github.com/utPLSQL/utPLSQL-cli/releases) + **Java** instalados en la máquina (la extensión invoca el CLI).
- **Para el modo Oracle directo:** nada más que la base de datos — el VSIX ya incluye el driver `oracledb` thin (sin Instant Client).
- **VSCode 1.88+** (Test Coverage API).

La extensión es solo el "cliente gráfico" — quien ejecuta los tests es la base de datos: vía
CLI (utPLSQL-cli + Java) o directamente (node-oracledb, `runnerMode: auto` por defecto).

## Conexión

La extensión necesita una cadena de conexión Oracle para ejecutar los tests. La resolución sigue este orden:

1. **Perfil de conexión activo** — `utplsql.activeProfile` apuntando a un perfil en `utplsql.profiles` (sobrescribe todo lo anterior).
2. **Setting `utplsql.connection`** — leído del `settings.json` del proyecto/usuario.
3. **Variable de entorno `UTPLSQL_CONN`** — definida antes de abrir VSCode.
4. **Caché de la sesión** — si el usuario ya escribió la conexión mediante el prompt.
5. **Prompt al usuario** — pregunta y la conserva solo en la sesión actual.

Los perfiles de conexión (`utplsql.profiles`) también pueden sobrescribir `sourcePath`, `coverageOwner`, `invocation`, `cliPath`, etc. por entorno — vea `utplsql.activeProfile` en la tabla de configuración.

⚠️ **Recomendación de seguridad:** la cadena de conexión contiene una contraseña. **NO** use el
setting `utplsql.connection` en entornos compartidos (el settings.json puede estar versionado o ser
visible para otros). En su lugar, **use la variable de entorno `UTPLSQL_CONN`**:

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

Si ni el setting ni la variable de entorno están definidos, la extensión pregunta la conexión y
la conserva solo en memoria durante la sesión — use el comando
**utPLSQL: Clear session connection** (paleta de comandos) para limpiarla.

**Formatos aceptados:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **Alias TNS**: `user/pass@tns_alias` (requiere `TNS_ADMIN` configurado)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## Cómo funciona

Hay dos modos de ejecución disponibles:

![Arquitectura de ejecución — dos modos](docs/wiki/images/diagram-arquitetura.png)

### Modo Oracle directo (v0.9.0) — `runnerMode: auto` o `oracle`

![Modo Oracle directo — streaming](docs/wiki/images/diagram-streaming.png)

Sin archivos temporales, sin esperar al lote. Los resultados aparecen en el
Test Explorer **a medida que cada test termina**.

### Modo CLI — `runnerMode: cli` (fallback)

![Modo CLI — lote](docs/wiki/images/diagram-cli.png)

La extensión monta la línea de comandos del CLI o conecta vía Oracle directo, lee los
informes (JUnit + Cobertura) y los traduce a las APIs nativas de VSCode. El
modo `auto` (predeterminado) intenta Oracle directo y cae al CLI si `node-oracledb` no
está instalado. Use `runnerMode: cli` para forzar siempre el CLI.

## Configuración

| Setting | Default | Descripción |
|---|---|---|
| `utplsql.connection` | `""` | Conexión Oracle. **Déjela vacía** y use la variable de entorno `UTPLSQL_CONN` para no almacenar la contraseña. Si ambas están vacías, la extensión pregunta (la conserva solo en la sesión). |
| `utplsql.cliPath` | `utplsql` | Ruta del ejecutable de utPLSQL-cli (p. ej. `C:\tools\utPLSQL-cli\bin\utplsql.bat`). |
| `utplsql.sourcePath` | `install` | Carpeta del código de producción (para mapear la cobertura a los archivos). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs para descubrir los specs con `%suite`/`%test`. Si sus tests están en `.sql`, use `["**/*.sql"]`. |
| `utplsql.extraRunArgs` | `[]` | Argumentos adicionales para `utplsql run`. |
| `utplsql.coverageOwner` | `""` | Esquema propietario de los objetos cubiertos. Vacío = usa el usuario de la conexión (en mayúsculas). |
| `utplsql.coverageSourceArgs` | (ver **Cobertura**) | Args del CLI que mapean la cobertura a los archivos fuente. |
| `utplsql.invocation` | `launcher` | Cómo invocar el CLI: `launcher` (vía `.bat`/script, predeterminado) o `java` (JVM directa, **sin shell**). Ver **Modo de invocación**. |
| `utplsql.javaPath` | `java` | Ejecutable de Java (PATH o ruta completa). Solo se usa en el modo `java`. |
| `utplsql.cliHome` | `""` | Raíz de utPLSQL-cli (carpeta con `bin/` y `lib/`). Vacío = se deriva de `cliPath`. Solo se usa en el modo `java`. |
| `utplsql.timeoutMinutes` | `60` | Timeout en minutos para el CLI. La bandera `-t` solo se envía si el valor difiere de `60`. |
| `utplsql.dbmsOutput` | `false` | Habilita `DBMS_OUTPUT` en la sesión de pruebas. La bandera `-D` solo se envía cuando es `true`. |
| `utplsql.quiet` | `false` | Suprime los logs informativos del CLI. La bandera `-q` solo se envía cuando es `true`. |
| `utplsql.failureExitCode` | `1` | Código de salida en caso de fallo. La bandera `--failure-exit-code` solo se envía si el valor difiere de `1`. `0` hace que el CLI siempre termine con éxito. |
| `utplsql.additionalReporters` | `[]` | Reporters adicionales para incluir en cada ejecución (p. ej. `["ut_coverage_html_reporter"]`). Los predeterminados (documentation, junit, coverage) siempre se incluyen y no es necesario listarlos. |
| `utplsql.codeLens.enabled` | `true` | Muestra los botones CodeLens Run/Run with Coverage sobre `%suite` y `%test`. |
| `utplsql.statusBar.enabled` | `true` | Muestra el indicador de estado de las pruebas en la barra de estado. |
| `utplsql.decorations.enabled` | `true` | Muestra las decoraciones de pass/fail en las líneas `%suite` y `%test` después de la ejecución. |
| `utplsql.runnerMode` | `auto` | Modo de ejecución: `auto` (Oracle directo vía node-oracledb, con fallback CLI), `cli` (siempre por línea de comandos), `oracle` (siempre Oracle directo). |
| `utplsql.oraclePoolMin` | `2` | Conexiones mínimas mantenidas en el pool del runner Oracle (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Conexiones máximas en el pool del runner Oracle (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Incremento al expandir el pool del runner Oracle (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Segundos entre comprobaciones de salud de las conexiones ociosas del pool (node-oracledb). `0` = ping en cada checkout. |
| `utplsql.javaArgs` | `["-Xmx256m"]` | Flags JVM para el modo `java` (p. ej. `["-Xmx512m", "-Xms128m"]`). Se insertan antes de `-cp`. |
| `utplsql.organization` | `file` | Organización del árbol: `file` (por ruta) o `schema` (Schema > Package > Suite > Test). En el modo `schema` con `runnerMode` Oracle (`auto`/`oracle`), las suites también se descubren desde la base de datos (`ALL_OBJECTS`/`ALL_SOURCE`) cuando los archivos `.pks` no están en el workspace — con URI virtual `utplsql-db:/` (sin CodeLens/decorations/jump to failure). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Patrón glob para extraer el esquema de la ruta. Use `{schema}` como marcador de posición. En el modo `schema`, los directorios bajo la base del patrón (p. ej. `db/*`) definen los esquemas consultados en la base de datos. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Muestra los errores de compilación PL/SQL como subrayados en el editor y en el Panel de problemas (modo CLI). |
| `utplsql.setupDiagnostics.enabled` | `true` | Muestra diagnósticos de configuración (CLI, conexión, grants, versión) y de **integridad de la instalación de utPLSQL** (objetos inválidos en el esquema UT3, con quick-fix "Recompilar UT3") con acciones de quick-fix. |
| `utplsql.profiles` | `[]` | Perfiles de conexión Oracle guardados (nombre, connection y overrides de `sourcePath`/`coverageOwner`/`invocation`/`cliPath`/etc.) para alternar entre entornos. |
| `utplsql.activeProfile` | `""` | ID del perfil activo (`utplsql.profiles`). Cuando está definido, sobrescribe `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Rastrea las vistas ejecutadas vía `V$SQL` (cobertura booleana). Requiere `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Habilita la depuración PL/SQL de tests (`DBMS_DEBUG`). Requiere `node-oracledb` + grants. |
| `utplsql.debugger.stopOnException` | `true` | Pausa en las excepciones PL/SQL durante la depuración. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) de la sesión de depuración. |
| `utplsql.language` | `auto` | Idioma de los mensajes en tiempo de ejecución. `auto` sigue a VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; si no, en). Cubre los **24 locales** (15 nativos + 9 de la comunidad). |

Ejemplo (`.vscode/settings.json` del proyecto):

```jsonc
{
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat",
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

Y, antes de abrir VSCode (o en el perfil de PowerShell):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### Para colaboradores

Cree un archivo `.env` en la raíz del proyecto (gitignorado) con las variables de
entorno que usan los tests de integración:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
UTPLSQL_CLI_PATH=/path/to/utplsql
UTPLSQL_CLI_HOME=/path/to/utplsql-cli
```

### Modo de invocación (`launcher` vs `java`)

Por defecto (`utplsql.invocation = "launcher"`) la extensión llama al launcher
`utplsql`/`utplsql.bat`. En Windows esto pasa por `cmd`, que **consume/interpreta
metacaracteres** (`^` se convierte en escape, `|` en pipe) — lo que
rompe las regex en `coverageSourceArgs`.

El modo `java` llama a la JVM **directamente** (`java -cp <home>/etc;<home>/lib/* …
org.utplsql.cli.Cli`), **sin shell**. Los argumentos van al proceso como un array,
sin `cmd` en medio, por lo que `^` y `|` pasan **literalmente** — puede usar `^anchors$` y
`(a|b|c)` en la regex sin rodeos.

```jsonc
{
  "utplsql.invocation": "java",
  "utplsql.cliPath": "C:\\tools\\utPLSQL-cli\\bin\\utplsql.bat", // cliHome is derived from here
  // "utplsql.cliHome": "C:\\tools\\utPLSQL-cli",  // only if cliPath is a PATH command
  // "utplsql.javaPath": "java"                     // PATH, or full path to java.exe
}
```

> El modo `java` replica fielmente lo que hace el `.bat` (mismo classpath y mismas
> propiedades `-D`); la única diferencia es no pasar por `cmd`. Requiere `java` en el PATH
> (o en `utplsql.javaPath`) y que la raíz del CLI sea resoluble — o vía `cliPath`
> apuntando a `…/bin/utplsql(.bat)`, o definiendo `cliHome`.

## Uso

1. Abra el proyecto PL/SQL (con el código y los packages de prueba).
2. Compile el código y los tests en la base de datos (extensión Oracle / SQLcl).
3. Abra la vista **Testing** → aparecen las suites.
4. Ejecute:
   - Mediante **CodeLens** — botones ▶ Run/Run with Coverage sobre cada `%suite` y `%test` en el editor.
   - Desde el **gutter** junto a cada test/suite, o
   - Mediante los **atajos de teclado** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, etc.), o
   - El botón **Run Tests** de la vista Test Explorer, o
   - **Clic derecho** en una carpeta/archivo → *utPLSQL: Run tests…* (con o sin cobertura).
5. Después de la ejecución, vea:
   - **Decoraciones en línea** (✓/✗/⚠) en el editor junto a las anotaciones de test.
   - **Barra de estado** con el recuento de pass/fail y la duración total.
   - **Test Explorer** con resultados detallados.
6. Para la cobertura, use el perfil **Run with Coverage** (o el elemento de menú "con cobertura").
7. Para repetir ejecuciones rápidamente:
   - `Ctrl+Shift+U L` — **Rerun Last** (repite la última ejecución, con o sin cobertura).
   - `Ctrl+Shift+U U` — **Run at Cursor** (ejecuta el `%test`/`%suite` bajo el cursor).
   - `Ctrl+Shift+U X` — **Run Failed Only** (ejecuta solo los tests que fallaron).
8. **Para Oracle directo (streaming):** no hay nada que instalar — el VSIX ya incluye el driver `oracledb` thin. El modo `auto` cae al CLI si Oracle no es accesible.
9. Para diagnóstico, use `utPLSQL: Show information` en la paleta — muestra las versiones CLI/API/DB con opción de copiar.
10. **utPLSQL: Select additional reporter...** — QuickPick con los reporters disponibles en la base de datos.
11. **utPLSQL: Cancel execution** — detiene la ejecución en curso (`Escape` durante la ejecución).
12. **utPLSQL: Refresh tests** — fuerza el rediscovery de los `.pks`.

> 💡 **Al escribir tests:** el parser está dirigido por tokens — basta con tener `%suite`
> y la declaración `create package` en el archivo, y cada `%test` seguido de su
> `PROCEDURE`. No hay requisito de líneas en blanco.

### Anotaciones admitidas (v0.10.0+)

Además de `%suite` y `%test`, el discovery entiende:

| Anotación | Efecto en el Test Explorer |
|---|---|
| `-- %disabled` | La suite o el test **no aparece** en el árbol (omitido en el discovery) |
| `-- %throws(-20001)` | Marca que el test espera la excepción 20001 (metadato `expectedError`) |
| `-- %tags(fast, critical)` | Etiquetas del test (metadato; el filtrado por etiquetas está en el roadmap) |
| `-- %displayname(Name)` | Nombre personalizado mostrado en lugar de la descripción del `%test` |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Marca la suite con hooks de ciclo de vida (metadato) |

Las anotaciones no distinguen entre mayúsculas y minúsculas. En el header de la suite (entre `%suite` y el
primer `%test`) se aplican a la suite; después de `%test`, se aplican al test.

## Comandos

Todos los comandos de la extensión (paleta `Ctrl+Shift+P`, prefijo `utPLSQL:`):

| Comando | Descripción | Atajo de UI |
|---|---|---|
| `utPLSQL: Run all tests` | Ejecuta todas las suites del workspace | Botón ▶ de la vista Testing |
| `utPLSQL: Run tests in this file` | Ejecuta las suites del `.pks`/`.pkb` activo | Clic derecho → archivo |
| `utPLSQL: Run tests in this file with coverage` | Igual, con perfil de cobertura | Clic derecho → archivo |
| `utPLSQL: Run tests in this folder` | Ejecuta las suites de la carpeta seleccionada | Clic derecho → carpeta |
| `utPLSQL: Run tests in this folder with coverage` | Igual, con perfil de cobertura | Clic derecho → carpeta |
| `utPLSQL: Refresh tests` | Fuerza el rediscovery de los `.pks` | — |
| `utPLSQL: Cancel execution` | Detiene el CLI en ejecución | — |
| `utPLSQL: Show utPLSQL information` | Versiones CLI/API/DB con opción de copiar | — |
| `utPLSQL: Select additional reporter...` | QuickPick con los reporters de la base de datos | — |
| `utPLSQL: Clear session connection` | Elimina la conexión del caché de sesión | — |
| `utPLSQL: Rerun Last` | Repite la última ejecución | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Ejecuta el test bajo el cursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Vuelve a ejecutar solo los tests fallidos | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Ejecuta la validación completa de la configuración (CLI, Java, conexión, instalación de UT3) y muestra los resultados | — |
| `utPLSQL: Configure connection` | Abre la configuración en `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Copia los grants SQL al portapapeles | — |
| `utPLSQL: Show Test Explorer` | Enfoca la vista Testing | — |
| `utPLSQL: Switch connection profile...` | Cambia el perfil de conexión activo (QuickPick) | Clic en la barra de estado (con perfil activo) |
| `utPLSQL: New connection profile...` | Asistente para crear y activar un perfil | — |
| `utPLSQL: Manage connection profiles` | Abre la configuración en `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Importa conexiones desde SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Inicia una sesión de depuración del test bajo el archivo activo | — |

> **Recompilar UT3** (`utplsql.recompileUt3`) **no** es un comando de paleta — es
> un quick-fix interno del diagnóstico "utPLSQL Setup" (objetos inválidos en el
> esquema de utPLSQL).

## Keybindings

Todos los atajos usan el prefijo `Ctrl+Shift+U` (`Cmd+Shift+U` en Mac):

| Atajo | Comando |
|---|---|
| `Ctrl+Shift+U R` | Ejecutar todos los tests |
| `Ctrl+Shift+U T` | Ejecutar tests del archivo |
| `Ctrl+Shift+U Shift+T` | Ejecutar tests del archivo con cobertura |
| `Ctrl+Shift+U F` | Actualizar tests (refresh) |
| `Ctrl+Shift+U I` | Mostrar información de utPLSQL |
| `Ctrl+Shift+U C` | Limpiar conexión de la sesión |
| `Ctrl+Shift+U L` | Rerun last (último) |
| `Ctrl+Shift+U U` | Run at cursor (test bajo el cursor) |
| `Ctrl+Shift+U X` | Run failed only (solo fallos) |
| `Escape` | Cancelar ejecución |

## Cobertura

- Las líneas **ejecutadas** se vuelven verdes en el gutter; las **no ejecutadas**, rojas.
- La pestaña **Test Coverage** muestra el **porcentaje por archivo/carpeta**.

<p align="center">
  <img src="images/image1.png" alt="Coverage" width="600" height="400">
</p>

<p align="center">
  <img src="images/image2.png" alt="Test Explorer" width="600" height="400">
</p>

La extensión pasa `-source_path` (= `utplsql.sourcePath`) y mapea los objetos cubiertos
a los archivos fuente vía `utplsql.coverageSourceArgs` (regex + `type_mapping`). El `-owner`
se deriva de la conexión (o de `utplsql.coverageOwner`).

### Mapeo de la cobertura a los archivos (`coverageSourceArgs`)

El `type_mapping` traduce el "tipo" capturado por la regex al tipo Oracle. Tres convenciones habituales:

**1) Por directorio** — estructura `sourcePath/<tipo>/<nombre>.sql` (carpetas `functions/`, `procedures/`, `packages/`, …):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
  "-type_subexpression=1",   // group 1 = folder (type)
  "-name_subexpression=2",   // group 2 = file (object name)
  "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
]
```
> Funciona a cualquier profundidad (el `.*` absorbe los módulos superiores). Nombres de carpeta variados
> (p. ej. `package`, `pkg`, `pacote`) se pueden enumerar en el `type_mapping`.

**2) Por prefijo del nombre** — convención `pkg_*`, `prc_*`, `vw_*` (independiente de la carpeta):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\]((pkg|prc|fnc|trg|vw)_\\w+)\\.sql$",
  "-name_subexpression=1",   // group 1 = full name (e.g. PKG_EXAMPLE)
  "-type_subexpression=2",   // group 2 = prefix (type)
  "-type_mapping=pkg=PACKAGE BODY/prc=PROCEDURE/fnc=FUNCTION/trg=TRIGGER/vw=VIEW"
]
```

**3) Por extensión tipada** — archivos `*.pkb`, `*.fnc`, `*.prc`, `*.trg` (independiente de la carpeta):
```jsonc
"utplsql.coverageSourceArgs": [
  "-regex_expression=.*[/\\\\](\\w+)\\.(\\w+)$",
  "-name_subexpression=1",   // group 1 = name
  "-type_subexpression=2",   // group 2 = extension (type)
  "-type_mapping=pkb=PACKAGE BODY/fnc=FUNCTION/prc=PROCEDURE/trg=TRIGGER"
]
```

**Notas importantes:**
- **Packages → `PACKAGE BODY`** (no `PACKAGE`): la cobertura se recopila en el **cuerpo** del package.
- **Windows / metacaracteres de regex:** en el modo `launcher` (predeterminado), el `.bat` pasa por `cmd`,
  que **consume `^`** e **interpreta `|` como pipe** — por eso los ejemplos anteriores usan `\w` y
  `[/\\]` (sin `^`), y el `|` del ejemplo 2 solo funciona dentro de la extensión. **Solución:** use **`utplsql.invocation = "java"`** (ver
  [Modo de invocación](#modo-de-invocación-launcher-vs-java)) — sin `cmd` en medio, `^` y `|` pasan
  literalmente y puede escribir la regex con normalidad.
- **Windows / `cmd`:** evite **`^`** en la regex (el `cmd` del `.bat` lo consume) — por eso los ejemplos
  usan `\w` y `[/\\]`.

## Reporters

La extensión siempre incluye tres reporters predeterminados:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (resultados → Test Explorer) y
`ut_coverage_cobertura_reporter` (cobertura, si está disponible).

**Validación dinámica** — antes de ejecutar con cobertura, la extensión consulta
la base de datos vía `utplsql reporters <conn>`. Si
`UT_COVERAGE_COBERTURA_REPORTER` no existe en la base de datos (p. ej. utPLSQL
desactualizado), la cobertura se omite con una advertencia en la salida. La ejecución
de los tests nunca se bloquea.

**Reporters adicionales fijos** — setting `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
Los tres reporters predeterminados se deduplican automáticamente, incluso si se
listan aquí.

**Reporter volátil por sesión** — el comando **utPLSQL: Select additional
reporter...** abre un QuickPick con la lista dinámica de la base de datos. El
reporter elegido se usa en la siguiente ejecución y se descarta después (no
persiste en la configuración).

## Requisitos en la base de datos

**Cobertura** (siempre) — habilita el profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Sin esto, los tests se ejecutan pero la cobertura sale **vacía**.

**Descubrimiento de tests en OTROS esquemas** (instalación **compartida** de utPLSQL, p. ej. owner `UT3`):
para que el framework vea y analice los tests de los esquemas de aplicación, el owner de utPLSQL necesita
**leer el diccionario** de esos esquemas:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` por sí solo NO basta** — se necesitan los grants **directos** sobre esas vistas
  (debido a `dbms_assert.sql_object_name` en contexto definer).
- También debe estar instalado el **trigger DDL** de utPLSQL (mantiene el caché de anotaciones al día).
- Verificación (como el owner): `SELECT ut_metadata.get_source_view_name FROM dual;` debe devolver `dba_source`.

> En instalaciones **por esquema** (utPLSQL en el mismo esquema que los tests), estos grants entre esquemas **no**
> son necesarios — el framework lee su propio source.

## Limitaciones conocidas

- El mapeo resultado→test se hace por nombre de package + nombre/descripción del test;
  descripciones idénticas en packages distintos pueden crear ambigüedad (el índice se
  limita por package para minimizarla).
- Considera la **primera** carpeta del workspace para resolver `sourcePath`.
- El discovery lee los `.pks` (specs); mantenga las anotaciones `%suite`/`%test` en el spec.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| Las suites no aparecen | CLI no encontrado | Ejecute `utPLSQL: Validate configuration` para el diagnóstico |
| Cobertura vacía | Falta `GRANT EXECUTE ON DBMS_PROFILER` | Ejecute los grants de [Requisitos](#requisitos-en-la-base-de-datos) o use `utPLSQL: Copy coverage grants to clipboard` |
| Cobertura vacía | Oracle 19c exige grants adicionales | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Rendimiento lento | Las suites grandes requieren más heap de JVM | Aumente `utplsql.javaArgs` (p. ej. `["-Xmx1024m"]`) |
| Error de compilación sin indicación | Código con error de sintaxis PL/SQL | Active `utplsql.compilationDiagnostics.enabled` (activo por defecto); vea el Panel de problemas |
| Error de conexión | Cadena mal formada o DB inaccesible | Use `utPLSQL: Validate configuration` |
| Timeout al ejecutar | Los tests tardan más que `timeoutMinutes` | Aumente `utplsql.timeoutMinutes` |
| La regex de cobertura no coincide | El `cmd` de Windows consume `^` y `\|` | Use `utplsql.invocation: "java"` (vea [Modo de invocación](#modo-de-invocación-launcher-vs-java)) |
| `%suite` no reconocido | Falta `%suite`/`create package` en el archivo, o `%test` sin `PROCEDURE` | Revise el spec; ejecute `utPLSQL: Refresh tests` |
| "report not generated" | El CLI no pudo generar el XML de salida | Compruebe los permisos de escritura en `%TEMP%` y los grants de utPLSQL |
| CodeLens no aparece | `editor.codeLens` deshabilitado o conflicto | Habilite `"editor.codeLens": true`; verifique `utplsql.codeLens.enabled` |
| Los atajos no funcionan | Conflicto con otra extensión o atajo de VSCode | Vaya a File → Preferences → Keyboard Shortcuts y busque `utplsql` para redefinir |

## Licencia

MIT © Gil Cleber Barboza
