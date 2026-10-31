// Montagem pura da chamada `ut_runner.run` (PRD-111).
//
// Este módulo não depende de `vscode` nem de conexão: recebe as opções já
// resolvidas e devolve o PL/SQL e os binds. O orquestrador
// (`executeRunOracle`) mantém a I/O (conexões, execute, appendOutput).
import type { BindParameter } from 'oracledb';

type OracleModule = typeof import('oracledb');
type Binds = Record<string, BindParameter>;

/** Reporters do utPLSQL cujo construtor aceita `a_client_character_set`. */
export const EXPORT_CHARSET_REPORTERS = new Set([
  'ut_documentation_reporter',
  'ut_teamcity_reporter',
  'ut_tap_reporter',
  'ut_junit_reporter',
  'ut_sonar_test_reporter',
]);

/** Reporters textuais de console cujo construtor aceita `a_color_console`. */
export const EXPORT_COLOR_REPORTERS = new Set([
  'ut_documentation_reporter',
  'ut_teamcity_reporter',
  'ut_tap_reporter',
]);

/**
 * Monta a chamada do reporter de export (PRD-76 RF5). Os parâmetros só entram
 * quando configurados e quando o reporter está na allowlist que os aceita —
 * evita ORA em reporters com assinatura diferente.
 */
export function exportReporterCall(
  name: string,
  charset: string | undefined,
  colorConsole: boolean | undefined,
  binds: Binds,
  oracledb: OracleModule,
): string {
  const args: string[] = [];
  if (charset && EXPORT_CHARSET_REPORTERS.has(name)) {
    binds.exportCharset = { dir: oracledb.BIND_IN, type: oracledb.STRING, val: charset };
    args.push('a_client_character_set => :exportCharset');
  }
  if (colorConsole && EXPORT_COLOR_REPORTERS.has(name)) {
    binds.exportColor = { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_BOOLEAN, val: true };
    args.push('a_color_console => :exportColor');
  }
  return args.length > 0 ? `${name}(${args.join(', ')})` : `${name}()`;
}

export interface ReporterListOptions {
  exporting: boolean;
  exportReporter?: { name: string; charset?: string; colorConsole?: boolean };
  coverageEnabled: boolean;
  htmlEnabled: boolean;
  additionalReporters?: string[];
  sessionReporter?: string;
  knownReporters: string[];
  oracledb: OracleModule;
}

export interface ReporterList {
  runners: string[];
  binds: Binds;
  /** Nomes inválidos (o orquestrador só registra o warning). */
  invalid: string[];
  /** Nomes inexistentes no banco (o orquestrador anexa a mensagem). */
  unknown: string[];
}

/**
 * Monta a lista de reporters do `a_reporters`. A validação de existência no
 * banco (`knownReporters`) e o `state.consumeExtraReporter()` ficam no
 * orquestrador; aqui só entra a decisão pura de incluir/ignorar cada reporter.
 */
export function buildReporterList(options: ReporterListOptions): ReporterList {
  const { oracledb } = options;
  const binds: Binds = {};
  const invalid: string[] = [];
  const unknown: string[] = [];

  if (options.exporting && options.exportReporter) {
    const normalized = options.exportReporter.name.toLowerCase().replace(/\(\)$/, '');
    return {
      runners: [
        exportReporterCall(
          normalized,
          options.exportReporter.charset,
          options.exportReporter.colorConsole,
          binds,
          oracledb,
        ),
      ],
      binds,
      invalid,
      unknown,
    };
  }

  const runners = ['ut_documentation_reporter()', 'ut_junit_reporter()'];
  if (options.coverageEnabled) runners.push('ut_coverage_cobertura_reporter()');
  if (options.htmlEnabled) runners.push('ut_coverage_html_reporter()');

  const extraReporters = [...(options.additionalReporters ?? [])];
  if (options.sessionReporter) extraReporters.push(options.sessionReporter);

  for (const reporter of extraReporters) {
    const normalized = reporter.toLowerCase().replace(/\(\)$/, '');
    // Só aceita identificadores PL/SQL simples: o nome vem de settings (que
    // podem ser definidas pelo workspace) e é concatenado no PL/SQL.
    if (!/^[a-z0-9_]+$/.test(normalized)) {
      invalid.push(reporter);
      continue;
    }
    if (
      normalized === 'ut_documentation_reporter' ||
      normalized === 'ut_junit_reporter' ||
      (options.coverageEnabled && normalized === 'ut_coverage_cobertura_reporter') ||
      (options.htmlEnabled && normalized === 'ut_coverage_html_reporter')
    ) {
      continue;
    }
    if (runners.some((existing) => existing.startsWith(normalized))) continue;
    if (
      options.knownReporters.length > 0 &&
      !options.knownReporters.some((known) => known.toLowerCase() === normalized)
    ) {
      unknown.push(reporter);
      continue;
    }
    runners.push(`${normalized}()`);
  }

  return { runners, binds, invalid, unknown };
}

export interface CoverageScopeOptions {
  enabled: boolean;
  owner: string;
  schemes?: string[];
  includeObjects?: string[];
  excludeObjects?: string[];
  includeSchemaExpr?: string;
  includeObjectExpr?: string;
  excludeSchemaExpr?: string;
  excludeObjectExpr?: string;
}

export interface CoverageScope {
  /** `:schemes` quando habilitada; `null` caso contrário. */
  schemesArg: string;
  /** Parâmetros adicionais do `ut_runner.run` (com a vírgula/indentação). */
  scopeParams: string;
  binds: Binds;
}

/** Monta o escopo de cobertura (PRD-79) sem tocar no banco. */
export function buildCoverageScope(
  oracledb: OracleModule,
  options: CoverageScopeOptions,
): CoverageScope {
  if (!options.enabled) return { schemesArg: 'null', scopeParams: '', binds: {} };

  const binds: Binds = {};
  const schemes = options.schemes?.length ? options.schemes : [options.owner];
  binds.schemes = { dir: oracledb.BIND_IN, type: 'UT_VARCHAR2_LIST', val: schemes };

  const scopeParts: string[] = [];
  if (options.includeObjects?.length) {
    binds.includeObjects = {
      dir: oracledb.BIND_IN,
      type: 'UT_VARCHAR2_LIST',
      val: options.includeObjects,
    };
    scopeParts.push('a_include_objects => :includeObjects');
  }
  if (options.excludeObjects?.length) {
    binds.excludeObjects = {
      dir: oracledb.BIND_IN,
      type: 'UT_VARCHAR2_LIST',
      val: options.excludeObjects,
    };
    scopeParts.push('a_exclude_objects => :excludeObjects');
  }
  if (options.includeSchemaExpr) {
    binds.includeSchemaExpr = {
      dir: oracledb.BIND_IN,
      type: oracledb.STRING,
      val: options.includeSchemaExpr,
    };
    scopeParts.push('a_include_schema_expr => :includeSchemaExpr');
  }
  if (options.includeObjectExpr) {
    binds.includeObjectExpr = {
      dir: oracledb.BIND_IN,
      type: oracledb.STRING,
      val: options.includeObjectExpr,
    };
    scopeParts.push('a_include_object_expr => :includeObjectExpr');
  }
  if (options.excludeSchemaExpr) {
    binds.excludeSchemaExpr = {
      dir: oracledb.BIND_IN,
      type: oracledb.STRING,
      val: options.excludeSchemaExpr,
    };
    scopeParts.push('a_exclude_schema_expr => :excludeSchemaExpr');
  }
  if (options.excludeObjectExpr) {
    binds.excludeObjectExpr = {
      dir: oracledb.BIND_IN,
      type: oracledb.STRING,
      val: options.excludeObjectExpr,
    };
    scopeParts.push('a_exclude_object_expr => :excludeObjectExpr');
  }

  return {
    schemesArg: ':schemes',
    scopeParams: scopeParts.length ? `,\n      ${scopeParts.join(',\n      ')}` : '',
    binds,
  };
}

export interface RandomOrderOptions {
  randomOrder?: boolean;
  randomOrderSeed?: number;
}

export interface RandomOrder {
  params: string;
  binds: Binds;
  /** Seed efetiva (0 = sorteada pelo banco). */
  seed: number;
}

/** Monta os parâmetros de ordem aleatória (PRD-78). */
export function buildRandomOrderParams(
  oracledb: OracleModule,
  options: RandomOrderOptions,
): RandomOrder {
  if (!options.randomOrder) return { params: '', binds: {}, seed: 0 };
  const seed = options.randomOrderSeed && options.randomOrderSeed > 0 ? options.randomOrderSeed : 0;
  return {
    params:
      ',\n      a_random_test_order => :randomOrder,\n      a_random_test_order_seed => :randomSeed',
    binds: {
      randomOrder: { dir: oracledb.BIND_IN, type: oracledb.DB_TYPE_BOOLEAN, val: true },
      randomSeed: { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: seed > 0 ? seed : null },
    },
    seed,
  };
}

export interface RunCallOptions {
  pathArgs: string[];
  runners: string[];
  schemesArg: string;
  scopeParams?: string;
  randomOrderParams?: string;
  tags?: string;
  /** Binds já montados (ex.: export). São mesclados com os desta função. */
  binds?: Binds;
}

export interface RunCall {
  plsql: string;
  binds: Binds;
}

/** Monta o `BEGIN ut_runner.run(...)` com os binds tipados (PRD-69/111). */
export function buildRunCall(oracledb: OracleModule, options: RunCallOptions): RunCall {
  const binds: Binds = {
    tags: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: options.tags || null },
    ...(options.binds ?? {}),
  };
  const pathsArg = options.pathArgs.length > 0 ? ':paths' : 'null';
  if (options.pathArgs.length > 0) {
    binds.paths = { dir: oracledb.BIND_IN, type: 'UT_VARCHAR2_LIST', val: options.pathArgs };
  }

  const plsql = `BEGIN ut_runner.run(
      a_paths => ${pathsArg},
      a_reporters => ut_reporters(${options.runners.join(',')}),
      a_coverage_schemes => ${options.schemesArg}${options.scopeParams ?? ''},
      a_tags => :tags${options.randomOrderParams ?? ''}
    ); END;`;

  return { plsql, binds };
}
