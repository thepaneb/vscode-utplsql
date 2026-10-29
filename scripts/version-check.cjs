#!/usr/bin/env node
/**
 * Garante que a versão esteja sincronizada entre os artefatos do repositório.
 *
 * Roda no CI antes do brain:ci. Falha se:
 *  - package.json não tem uma versão semver válida;
 *  - package-lock.json (raiz e packages[""]) diverge;
 *  - o topo do CHANGELOG não é a versão atual ou a seção está vazia;
 *  - site/index.html tem outro softwareVersion;
 *  - docs atuais têm um .vsix com versão fixa (use wildcard/placeholder).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..');
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const VERSIONED_VSIX_RE = /vscode-utplsql-\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.vsix/;
const CURRENT_DOC_DIRS = ['docs/wiki', path.join('docs', 'brain', '70-Wiki')];

const errors = [];

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(REPO, rel), 'utf8'));
  } catch (error) {
    errors.push(`${rel}: não foi possível ler/parsear (${error.message})`);
    return undefined;
  }
}

function walkMarkdown(dir) {
  const root = path.join(REPO, dir);
  if (!fs.existsSync(root)) return [];
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(path.join(dir, entry.name)));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const pkg = readJson('package.json');
const version = pkg?.version;
if (!version || !SEMVER_RE.test(version)) {
  errors.push(`package.json: versão inválida "${version ?? ''}"`);
}

if (pkg && version) {
  const lock = readJson('package-lock.json');
  if (lock) {
    if (lock.version !== version) {
      errors.push(`package-lock.json: versão "${lock.version}" ≠ package.json "${version}"`);
    }
    if (lock.packages?.['']?.version !== version) {
      errors.push(
        `package-lock.json: packages[""].version "${lock.packages?.['']?.version ?? ''}" ≠ package.json "${version}"`,
      );
    }
  }

  const changelog = fs.readFileSync(path.join(REPO, 'CHANGELOG.md'), 'utf8');
  const headings = Array.from(changelog.matchAll(/^##\s+(\S+)/gm), (match) => match[1]);
  for (const heading of headings) {
    if (!SEMVER_RE.test(heading)) {
      errors.push(`CHANGELOG.md: seção "${heading}" não é uma versão semver`);
    }
  }
  const duplicates = headings.filter((heading, index) => headings.indexOf(heading) !== index);
  if (duplicates.length > 0) {
    errors.push(`CHANGELOG.md: versões duplicadas (${[...new Set(duplicates)].join(', ')})`);
  }
  const firstHeading = headings[0];
  if (firstHeading !== version) {
    errors.push(`CHANGELOG.md: seção do topo é "${firstHeading ?? '?'}", esperado "${version}"`);
  } else {
    const section = changelog.split(/^## /m).find((part) => part.startsWith(`${version}\n`));
    if (!section || !/^-\s+\S/m.test(section)) {
      errors.push(`CHANGELOG.md: seção ${version} ausente ou sem itens`);
    }
  }

  try {
    const site = fs.readFileSync(path.join(REPO, 'site', 'index.html'), 'utf8');
    if (!site.includes(`"softwareVersion": "${version}"`)) {
      errors.push(`site/index.html: softwareVersion ≠ package.json (${version})`);
    }
  } catch (error) {
    errors.push(`site/index.html: não foi possível ler (${error.message})`);
  }
}

for (const dir of CURRENT_DOC_DIRS) {
  for (const file of walkMarkdown(dir)) {
    const text = fs.readFileSync(file, 'utf8');
    if (VERSIONED_VSIX_RE.test(text)) {
      errors.push(`${path.relative(REPO, file)}: .vsix com versão fixa; use wildcard/placeholder`);
    }
  }
}

if (errors.length > 0) {
  console.error('✖ Drift de versão detectado:\n');
  for (const error of errors) console.error(`  - ${error}`);
  console.error('\nCorrija package.json, package-lock.json, CHANGELOG.md e site/index.html.');
  process.exit(1);
}

console.log(`OK: versão ${version} consistente (package, lock, CHANGELOG e site).`);
