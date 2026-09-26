#!/usr/bin/env node
// Parse de uma linha do VERSIONS do matrix.env:
//   label|imagem|service[|utplsql_version]
// O 4º campo (versão do utPLSQL) é opcional — permite "piso alternativo" por
// banco (ex.: 12.2 usa v3.1.x, pois o 3.2.x não compila nele).
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
  const [label = '', image = '', service = '', version = ''] = parts;
  return {
    label: label.trim(),
    image: image.trim(),
    service: service.trim(),
    utplsqlVersion: (version.trim() || defaultVersion).trim(),
    hasExplicitVersion: version.trim() !== '',
  };
}

module.exports = { parseVersionLine };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--field') {
    const field = Number(args[1]);
    const parsed = parseVersionLine(args[2], args[3]);
    const value = [parsed.label, parsed.image, parsed.service, parsed.utplsqlVersion][field] ?? '';
    process.stdout.write(value);
  } else {
    process.stdout.write(JSON.stringify(parseVersionLine(args[0], args[1])));
  }
}
