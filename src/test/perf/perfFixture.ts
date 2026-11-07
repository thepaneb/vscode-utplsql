// Fixture de performance determinística (PRD-106). Gera packages direto no
// banco via EXECUTE IMMEDIATE, sem criar milhares de arquivos no workspace.

export type PerfMode = 'tree' | 'mixed' | 'full';

export interface PerfFixtureOptions {
  packages: number;
  testsPerPackage: number;
  seed?: number;
  prefix?: string;
  mode?: PerfMode;
}

export const PERF_DEFAULT_PREFIX = 'UT_PERF_';

export function perfPackageName(index: number, prefix = PERF_DEFAULT_PREFIX): string {
  return `${prefix}${String(index).padStart(4, '0')}`;
}

function assertPositive(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} deve ser >= 1`);
  return value;
}

function assertPrefix(prefix: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(prefix)) throw new Error(`prefix inválido: ${prefix}`);
  return prefix.toUpperCase();
}

/** Quantidade de testes gerada (o modo não altera a contagem). */
export function expectedTestCount(options: PerfFixtureOptions): number {
  return (
    assertPositive(options.packages, 'packages') *
    assertPositive(options.testsPerPackage, 'testsPerPackage')
  );
}

/**
 * PL/SQL idempotente que cria os packages `PREFIX####` com `%suite`, `%tags`,
 * `%suitepath` e testes determinísticos. `tree` = todos passam; `mixed` = ~10%
 * falham; `full` = falha em todos os testes (carga máxima de relatório).
 */
export function generatePerfSql(options: PerfFixtureOptions): string {
  const packages = assertPositive(options.packages, 'packages');
  const tests = assertPositive(options.testsPerPackage, 'testsPerPackage');
  const prefix = assertPrefix(options.prefix ?? PERF_DEFAULT_PREFIX);
  const seed = Number.isInteger(options.seed) ? Number(options.seed) : 0;
  const mode = options.mode ?? 'mixed';
  const failMode =
    mode === 'tree' ? 'false' : mode === 'full' ? 'true' : `mod(i * 31 + j * 17 + ${seed}, 10) = 0`;

  return `
DECLARE
  v_spec CLOB;
  v_body CLOB;
BEGIN
  FOR i IN 1..${packages} LOOP
    v_spec := 'CREATE OR REPLACE PACKAGE ${prefix}' || LPAD(i, 4, '0') || ' AS' || CHR(10) ||
      '  -- %suite(PERF ' || i || ')' || CHR(10) ||
      '  -- %suitepath(PERF)' || CHR(10) ||
      '  -- %tags(perf)' || CHR(10);
    v_body := 'CREATE OR REPLACE PACKAGE BODY ${prefix}' || LPAD(i, 4, '0') || ' AS' || CHR(10);
    FOR j IN 1..${tests} LOOP
      v_spec := v_spec || '  -- %test(case ' || j || ')' || CHR(10) ||
        '  PROCEDURE t_' || j || ';' || CHR(10);
      v_body := v_body || '  PROCEDURE t_' || j || ' IS BEGIN ' ||
        'IF (${failMode}) THEN ut.expect(1).to_equal(0); ELSE ut.expect(1).to_equal(1); END IF;' ||
        ' END;' || CHR(10);
    END LOOP;
    v_spec := v_spec || 'END;';
    v_body := v_body || 'END;';
    EXECUTE IMMEDIATE v_spec;
    EXECUTE IMMEDIATE v_body;
  END LOOP;
END;
`;
}

/** Remove os packages da fixture no schema atual. */
export function dropPerfSql(prefix = PERF_DEFAULT_PREFIX): string {
  const safe = assertPrefix(prefix);
  return `
BEGIN
  FOR r IN (SELECT object_name FROM user_objects
            WHERE object_type = 'PACKAGE' AND object_name LIKE '${safe}%') LOOP
    EXECUTE IMMEDIATE 'DROP PACKAGE ' || r.object_name;
  END LOOP;
END;
`;
}

/** Parse dos argumentos do CLI (`generate|drop|scale`). */
export function parsePerfArgs(argv: string[]): {
  command: 'generate' | 'drop' | 'scale';
  options: PerfFixtureOptions;
} {
  const command = (argv[0] ?? 'generate') as 'generate' | 'drop' | 'scale';
  if (!['generate', 'drop', 'scale'].includes(command)) {
    throw new Error(`comando inválido: ${command}`);
  }
  const num = (flag: string, fallback: number): number => {
    const idx = argv.indexOf(flag);
    if (idx < 0) return fallback;
    const value = Number(argv[idx + 1]);
    return Number.isFinite(value) ? value : fallback;
  };
  const str = (flag: string, fallback: string): string => {
    const idx = argv.indexOf(flag);
    return idx >= 0 ? (argv[idx + 1] ?? fallback) : fallback;
  };
  const mode = str('--mode', 'mixed') as PerfMode;
  if (!['tree', 'mixed', 'full'].includes(mode)) throw new Error(`mode inválido: ${mode}`);
  return {
    command,
    options: {
      packages: num('--packages', 1000),
      testsPerPackage: num('--tests', 15),
      seed: num('--seed', 1),
      prefix: str('--prefix', PERF_DEFAULT_PREFIX),
      mode,
    },
  };
}
