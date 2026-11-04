#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const LINKEDIN = path.join(ROOT, 'docs', 'linkedin');

function settingsCount(pkg) {
  const config = pkg.contributes?.configuration;
  const properties = {};
  if (Array.isArray(config)) {
    for (const item of config) Object.assign(properties, item.properties || {});
  } else if (config && typeof config === 'object') {
    Object.assign(properties, config.properties || {});
  }
  return Object.keys(properties).length;
}

function formatNumber(value) {
  return Number(value).toLocaleString('pt-BR');
}

function floorLabel(tests) {
  const floor = Math.floor(Number(tests) / 100) * 100;
  return `${formatNumber(floor)}+`;
}

function extractSection(text, heading) {
  const start = text.indexOf(heading);
  if (start === -1) return '';
  const rest = text.slice(start + heading.length);
  const next = rest.search(/\n##\s/);
  return rest.slice(0, next === -1 ? rest.length : next);
}

function checkProfile(text, lang, metrics, settings) {
  const problems = [];
  const isPt = lang === 'pt';
  const about = extractSection(text, isPt ? '## 3. Sobre / About' : '## 3. About');
  const experience = extractSection(text, isPt ? '## 4. Experiência' : '## 4. Experience');
  if (!about) problems.push(`${lang}: seção About não encontrada`);
  if (!experience) problems.push(`${lang}: seção Experience não encontrada`);

  const floor = floorLabel(metrics.tests);
  const exact = formatNumber(metrics.tests);
  const floorVariants = [floor, floor.replace('.', ',')];
  const exactVariants = [exact, exact.replace('.', ',')];
  const hasTestCount =
    floorVariants.some((value) => about.includes(value)) ||
    exactVariants.some((value) => about.includes(value));
  if (about && !hasTestCount) {
    problems.push(`${lang}: About sem o total de testes (${floor} ou ${exact})`);
  }
  if (about && /1\.200\+|1\.200\b/.test(about)) {
    problems.push(`${lang}: About com total antigo (1.200)`);
  }
  if (about && !about.includes('24')) {
    problems.push(`${lang}: About sem "24 idiomas/languages"`);
  }

  if (experience) {
    if (!experience.includes(String(settings))) {
      problems.push(`${lang}: Experience sem ${settings} settings`);
    }
    if (/\[53\]|\b53 configurações\b|\b53 settings\b/.test(experience)) {
      problems.push(`${lang}: Experience ainda cita 53 settings`);
    }
    if (!experience.includes(metrics.version)) {
      problems.push(`${lang}: Experience sem a versão ${metrics.version}`);
    }
    if (experience.includes('0.15.0')) {
      problems.push(`${lang}: Experience ainda cita 0.15.0`);
    }
    if (!/11\.2|11g/.test(experience)) {
      problems.push(`${lang}: Experience sem Oracle 11g thick`);
    }
    const prds = experience.match(/\[(\d+)\] PRDs/);
    if (prds && Number(prds[1]) !== Number(metrics.prds)) {
      problems.push(`${lang}: Experience com ${prds[1]} PRDs (esperado ${metrics.prds})`);
    }
  }

  if (/Post do release 0\.15\.0|0\.15\.0 release post/.test(text)) {
    problems.push(`${lang}: Destaques ainda apontam para o post 0.15.0`);
  }
  return problems;
}

function checkReleaseHistory(text, version) {
  const section = extractSection(text, '## Notas por release') || text;
  return section.includes(version) ? [] : [`README: histórico de releases sem ${version}`];
}

function checkReleasePost(releases, version) {
  return releases.some((name) => name.includes(version))
    ? []
    : [`releases/: post da ${version} ainda não existe (pendente)`];
}

function parseArgs(argv) {
  const args = { warn: false };
  for (const arg of argv) {
    if (arg === '--check') args.warn = false;
    else if (arg === '--warn') args.warn = true;
    else throw new Error(`opção desconhecida: ${arg}`);
  }
  return args;
}

async function main(argv = [], deps = {}) {
  const dir = deps.linkedinDir || LINKEDIN;
  const hasFiles = Boolean(deps.files);
  const exists = deps.exists || ((target) => fs.existsSync(target));
  if (!hasFiles && !exists(dir)) {
    console.log('SKIP: docs/linkedin não existe neste ambiente (documento local).');
    return 0;
  }

  const read = (key, file) => {
    if (deps.files) return deps.files[key] || '';
    return fs.readFileSync(file, 'utf8');
  };
  const releases = deps.releases || fs.readdirSync(path.join(dir, 'releases'));

  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    return 2;
  }

  let metrics;
  try {
    metrics = JSON.parse(read('metrics', path.join(dir, 'metrics.json')));
    const pkg = JSON.parse(read('package', path.join(ROOT, 'package.json')));
    const settings = settingsCount(pkg);
    const problems = [
      ...checkProfile(read('pt', path.join(dir, 'perfil-ideal-pt.md')), 'pt', metrics, settings),
      ...checkProfile(read('en', path.join(dir, 'perfil-ideal-en.md')), 'en', metrics, settings),
      ...checkReleaseHistory(read('readme', path.join(dir, 'README.md')), metrics.version),
    ];
    const releaseWarnings = checkReleasePost(releases, metrics.version);
    for (const warning of releaseWarnings) console.log(`AVISO: ${warning}`);

    if (problems.length === 0) {
      console.log(
        `OK: About do LinkedIn alinhado (${metrics.tests} testes, ${settings} settings, ${metrics.version}).`,
      );
      return 0;
    }
    console.error('DRIFT no About/perfil do LinkedIn:');
    for (const problem of problems) console.error(`  ✗ ${problem}`);
    return args.warn ? 0 : 1;
  } catch (error) {
    console.error(`ERRO: ${error.message}`);
    return 2;
  }
}

module.exports = {
  checkProfile,
  checkReleaseHistory,
  checkReleasePost,
  extractSection,
  floorLabel,
  formatNumber,
  main,
  parseArgs,
  settingsCount,
};

/* c8 ignore start */
if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
/* c8 ignore stop */
