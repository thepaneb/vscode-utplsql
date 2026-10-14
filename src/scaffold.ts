// Gerador PURO de templates de suíte utPLSQL (PRD-59 + PRD-100). Sem 'vscode'.
//
// Um único ponto de entrada (`buildSuiteTemplate`) cobre os dois casos:
//  - sem rotinas  → esqueleto com um `%test` de exemplo (PRD-59);
//  - com rotinas  → um `%test` por rotina do package (PRD-100).
//
// Decisões de implementação (registradas nas PRDs):
//  - sem `%beforetest`/`%aftertest` por padrão; sem `%suitepath`/`%disabled`;
//  - a descrição do `%suite` é o **nome do objeto** (neutro, editável — evita
//    gravar prosa não traduzida no pacote do usuário);
//  - a partir do 2º `%test` de uma rotina (`numberOfTestsPerUnit > 1`) o nome
//    ganha sufixo numérico, para o pacote gerado continuar compilável.

import { parsePlsqlDeclarations } from './plsqlDeclarations';

export interface GenerateOptions {
  testPackagePrefix: string;
  testPackageSuffix: string;
  numberOfTestsPerUnit: number;
  generateComments: boolean;
}

export const DEFAULT_GENERATE_OPTIONS: GenerateOptions = {
  testPackagePrefix: 'ut_',
  testPackageSuffix: '',
  numberOfTestsPerUnit: 1,
  generateComments: true,
};

const EXT_RE = /\.(pks|pkb|sql|prc|fnc|trg)$/i;
const INDENT = '  ';
const MAX_TESTS_PER_UNIT = 50;

/** `path/to/app_pkg.pkb` → `app_pkg`; `APP.APP_PKG` → `APP_PKG`. */
export function deriveObjectName(fileName: string): string {
  const base = (fileName.replace(/\\/g, '/').split('/').pop() ?? fileName).replace(EXT_RE, '');
  const unquoted = base.replace(/"/g, '').trim();
  const last = unquoted.includes('.') ? unquoted.slice(unquoted.lastIndexOf('.') + 1) : unquoted;
  return last.replace(/[^A-Za-z0-9_$#]/g, '_');
}

/**
 * `app_pkg` → `ut_app_pkg`. Idempotente: não duplica prefixo/sufixo que o nome
 * já tenha (chamar de novo com um `ut_*` mantém o nome).
 */
export function deriveSuiteName(objectName: string, options: GenerateOptions): string {
  const { testPackagePrefix: prefix, testPackageSuffix: suffix } = options;
  let base = objectName.trim();
  if (prefix && base.toLowerCase().startsWith(prefix.toLowerCase()))
    base = base.slice(prefix.length);
  if (suffix && base.toLowerCase().endsWith(suffix.toLowerCase()))
    base = base.slice(0, base.length - suffix.length);
  return `${prefix}${base}${suffix}`;
}

/** Rotinas `PROCEDURE`/`FUNCTION` da fonte, sem duplicatas (overloads colapsam). */
export function deriveRoutines(source: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const decl of parsePlsqlDeclarations(source)) {
    const key = decl.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(decl.name);
  }
  return out;
}

function testsPerUnit(options: GenerateOptions): number {
  const n = Math.floor(options.numberOfTestsPerUnit);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, n), MAX_TESTS_PER_UNIT);
}

/**
 * Template completo do spec `.pks`. `routines` vazio produz o esqueleto da
 * PRD-59 (um `%test` de exemplo); caso contrário, um `%test` por rotina.
 */
export function buildSuiteTemplate(
  objectName: string,
  routines: string[],
  options: GenerateOptions,
): string {
  const suiteName = deriveSuiteName(objectName, options);
  const perUnit = testsPerUnit(options);
  const todo = options.generateComments ? ' -- TODO' : '';

  const tests: { proc: string; description: string }[] = [];
  if (routines.length === 0) {
    tests.push({ proc: 'dummy', description: 'TODO' });
  } else {
    for (const routine of routines) {
      for (let i = 1; i <= perUnit; i++) {
        tests.push({
          proc: i === 1 ? routine : `${routine}_${i}`,
          description: i === 1 ? routine : `${routine} (${i})`,
        });
      }
    }
  }

  const lines = [
    `CREATE OR REPLACE PACKAGE ${suiteName} IS`,
    `${INDENT}--%suite(${objectName})`,
    '',
  ];
  tests.forEach((t, idx) => {
    if (idx > 0) lines.push('');
    lines.push(`${INDENT}--%test(${t.description})`);
    lines.push(`${INDENT}PROCEDURE ${t.proc};${todo}`);
  });
  lines.push(`END ${suiteName};`, '/', '');
  return lines.join('\n');
}
