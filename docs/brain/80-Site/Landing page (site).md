---
tipo: site
status: ativo
titulo: "Landing page (site público)"
publicar: site/index.html
url: "https://thepaneb.github.io/vscode-utplsql/"
implementacao: ["site/index.html", "site/404.html", "site/robots.txt", "site/sitemap.xml", "site/assets/styles.css", "site/google408e9fc32b68946a.html"]
verificado: 2026-10-07
tags: [site, docs]
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <title>utPLSQL Test Runner — Run and debug Oracle PL/SQL tests in VS Code</title>
    <meta
      name="description"
      content="VS Code extension to run and debug utPLSQL (Oracle PL/SQL) tests: native Test Explorer, visual coverage, a PL/SQL debugger and Oracle-direct execution via node-oracledb. 24 UI languages."
    />
    <link rel="canonical" href="{{SITE_URL}}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#007acc" />
    <link rel="icon" href="https://raw.githubusercontent.com/thepaneb/vscode-utplsql/main/images/icon.png" type="image/png" />

    <!-- Open Graph -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="utPLSQL Test Runner" />
    <meta property="og:title" content="utPLSQL Test Runner — Oracle PL/SQL tests in VS Code" />
    <meta
      property="og:description"
      content="Native Test Explorer, visual coverage, PL/SQL debugger and Oracle-direct execution for utPLSQL tests, right in VS Code."
    />
    <meta property="og:url" content="{{SITE_URL}}" />
    <meta property="og:image" content="https://raw.githubusercontent.com/thepaneb/vscode-utplsql/main/images/icon.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="utPLSQL Test Runner — Oracle PL/SQL tests in VS Code" />
    <meta
      name="twitter:description"
      content="Native Test Explorer, visual coverage, PL/SQL debugger and Oracle-direct execution for utPLSQL tests, right in VS Code."
    />
    <meta name="twitter:image" content="https://raw.githubusercontent.com/thepaneb/vscode-utplsql/main/images/icon.png" />

    <link rel="stylesheet" href="assets/styles.css" />

    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "utPLSQL Test Runner",
        "alternateName": "vscode-utplsql",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Visual Studio Code 1.101+",
        "softwareVersion": "{{VERSION}}",
        "description": "Run and debug utPLSQL (Oracle PL/SQL) tests in VS Code with a native Test Explorer, visual coverage, a PL/SQL debugger and Oracle-direct execution via node-oracledb.",
        "url": "{{SITE_URL}}",
        "downloadUrl": "https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql",
        "license": "https://opensource.org/licenses/MIT",
        "inLanguage": "en",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "author": { "@type": "Person", "name": "Gil Cleber" },
        "isBasedOn": "https://github.com/utPLSQL/utPLSQL"
      }
    </script>
  </head>
  <body>
    <header class="hero">
      <img
        class="logo"
        src="https://raw.githubusercontent.com/thepaneb/vscode-utplsql/main/images/icon.png"
        alt="utPLSQL Test Runner logo"
        width="112"
        height="112"
      />
      <h1>utPLSQL Test Runner</h1>
      <p class="tagline">
        Run and debug <strong>utPLSQL</strong> (Oracle PL/SQL) tests right in VS Code — native
        <strong>Test Explorer</strong>, visual coverage, a PL/SQL debugger and
        <strong>Oracle-direct</strong> execution via <code>node-oracledb</code>.
      </p>
      <p class="meta">24 UI languages · VS Code 1.101+ · Oracle 12.2+ · MIT</p>

      <p class="badges">
        <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"
          ><img alt="Marketplace version" src="https://vsmarketplacebadges.dev/version-short/paneb.vscode-utplsql.svg"
        /></a>
        <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"
          ><img alt="Installs" src="https://vsmarketplacebadges.dev/installs-short/paneb.vscode-utplsql.svg"
        /></a>
        <a href="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml"
          ><img alt="CI status" src="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml/badge.svg"
        /></a>
      </p>

      <p class="cta">
        <a class="btn primary" href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"
          >Install from the Marketplace</a
        >
        <a class="btn" href="https://github.com/thepaneb/vscode-utplsql">View on GitHub</a>
      </p>
    </header>

    <main>
      <section aria-labelledby="features">
        <h2 id="features">Why use it</h2>
        <ul class="grid">
          <li><h3>Native Test Explorer</h3><p>Suites and tests appear in the testing view; run by test, suite, file or folder.</p></li>
          <li><h3>CodeLens &amp; shortcuts</h3><p>Run and Run-with-Coverage buttons over <code>%suite</code>/<code>%test</code>, plus a <code>Ctrl+Shift+U</code> shortcut family.</p></li>
          <li><h3>Visual coverage</h3><p>Colored gutters per line and per-file statement/view coverage in the Coverage tab.</p></li>
          <li><h3>PL/SQL debugger</h3><p>Breakpoints and step debugging of utPLSQL tests via <code>DBMS_DEBUG</code> (native Debug Adapter).</p></li>
          <li><h3>Oracle-direct execution</h3><p>Real-time streaming through <code>node-oracledb</code> — no waiting for the batch to finish.</p></li>
          <li><h3>Schema-aware tree</h3><p>Organize tests by Schema &gt; Package &gt; Suite &gt; Test, with lazy loading for large schemas.</p></li>
          <li><h3>Connection profiles</h3><p>Switch between DEV/TEST/PROD environments; passwords stay in SecretStorage.</p></li>
          <li><h3>24 UI languages</h3><p>Follows the VS Code display language, from pt-BR to 中文 and more.</p></li>
        </ul>
      </section>

      <section aria-labelledby="start">
        <h2 id="start">Get started</h2>
        <ol>
          <li>Install the extension from the <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql">VS Code Marketplace</a>.</li>
          <li>Have an Oracle database with the <a href="https://github.com/utPLSQL/utPLSQL">utPLSQL</a> framework (<code>UT3</code>) installed.</li>
          <li>Configure a <a href="https://github.com/thepaneb/vscode-utplsql/wiki/Connection">connection</a> and open a <code>.pks</code> suite — tests show up in the Test Explorer.</li>
        </ol>
      </section>

      <section aria-labelledby="docs">
        <h2 id="docs">Documentation</h2>
        <p>
          Full guides live on the <a href="https://github.com/thepaneb/vscode-utplsql/wiki">project wiki</a>:
          installation, connection, quick start, coverage, debugger, settings and troubleshooting.
        </p>
        <img
          src="https://raw.githubusercontent.com/thepaneb/vscode-utplsql/main/docs/wiki/images/diagram-arquitetura.png"
          alt="Architecture diagram: VS Code extension, Oracle-direct runner and Test Explorer"
          loading="lazy"
        />
      </section>
    </main>

    <footer>
      <p>
        Independent community project — not affiliated with, endorsed by, or sponsored by the utPLSQL
        framework team or Oracle Corporation. utPLSQL and Oracle are trademarks of their respective owners.
      </p>
      <p>
        <a href="https://github.com/thepaneb/vscode-utplsql">GitHub</a> ·
        <a href="https://github.com/thepaneb/vscode-utplsql/wiki">Wiki</a> ·
        <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql">Marketplace</a> ·
        <a href="https://github.com/thepaneb/vscode-utplsql/blob/main/CHANGELOG.md">Changelog</a>
      </p>
    </footer>
  </body>
</html>

## Conexões

<!-- brain:auto:start:conexoes -->
- 🧩 Código: [[COD - index.html]] · [[COD - 404.html]] · [[COD - robots.txt]] · [[COD - sitemap.xml]] · [[COD - styles.css]] · [[COD - google408e9fc32b68946a.html]]
<!-- brain:auto:end -->
