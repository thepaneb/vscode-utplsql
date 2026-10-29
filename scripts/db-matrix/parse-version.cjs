#!/usr/bin/env node
// Parse de uma linha do VERSIONS do matrix.env:
//   label|imagem|service[|utplsql_version[|client]]
// O 4º campo (versão do utPLSQL) é opcional — permite "piso alternativo" por
// banco (ex.: 12.2 usa v3.1.x, pois o 3.2.x não compila nele).
// O 5º campo (`client`) é opcional: `both` (default) ou `thick` (11g, thin é
// impossível no driver).
//
// Uso:
//   node parse-version.cjs <linha> [defaultVersion]        -> JSON
//   node parse-version.cjs --field <n> <linha> [default]   -> campo puro
//
// Exportado para o teste unitário (matrixConfig).
'use strict';

function parseVersionLine(line, defaultVersion = '') {
  const parts = String(line ?? '')
    .trim()
    .split('|');
  const [label = '', image = '', service = '', version = '', client = ''] = parts;
  const normalizedClient = (client.trim() || 'both').toLowerCase();
  return {
    label: label.trim(),
    image: image.trim(),
    service: service.trim(),
    utplsqlVersion: (version.trim() || defaultVersion).trim(),
    hasExplicitVersion: version.trim() !== '',
    client: normalizedClient === 'thick' ? 'thick' : 'both',
    hasExplicitClient: client.trim() !== '',
  };
}

module.exports = { parseVersionLine };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--field') {
    const field = Number(args[1]);
    const parsed = parseVersionLine(args[2], args[3]);
    const value =
      [parsed.label, parsed.image, parsed.service, parsed.utplsqlVersion, parsed.client][field] ??
      '';
    process.stdout.write(value);
  } else {
    process.stdout.write(JSON.stringify(parseVersionLine(args[0], args[1])));
  }
}
