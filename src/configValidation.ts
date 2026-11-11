/**
 * Validação das settings de runtime (PRD-130 RF1).
 *
 * Módulo PURO (sem `vscode`): recebe o snapshot lido de `readConfig()` e
 * devolve um snapshot seguro, avisando o chamador sobre cada fallback.
 * Settings inválidas nunca bloqueiam a ativação: viram o default e geram warn.
 */

import type { UtConfig } from './config';
import { resolveLocale } from './i18n';

export interface ConfigWarning {
  setting: string;
  value: unknown;
  fallback: unknown;
}

export type ConfigWarn = (warning: ConfigWarning) => void;

function numberValue(
  value: unknown,
  fallback: number,
  setting: string,
  warn: ConfigWarn,
  options: { min?: number; max?: number; integer?: boolean } = {},
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    warn({ setting, value, fallback });
    return fallback;
  }
  const integer = options.integer === true;
  let next = integer ? Math.trunc(value) : value;
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  if (next < min) next = min;
  if (next > max) next = max;
  if (next !== value) warn({ setting, value, fallback: next });
  return next;
}

function stringValue(value: unknown, fallback: string, setting: string, warn: ConfigWarn): string {
  if (typeof value !== 'string') {
    warn({ setting, value, fallback });
    return fallback;
  }
  return value;
}

function booleanValue(
  value: unknown,
  fallback: boolean,
  setting: string,
  warn: ConfigWarn,
): boolean {
  if (typeof value !== 'boolean') {
    warn({ setting, value, fallback });
    return fallback;
  }
  return value;
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
  setting: string,
  warn: ConfigWarn,
): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
    return value as T;
  }
  warn({ setting, value, fallback });
  return fallback;
}

function stringArray(
  value: unknown,
  fallback: string[],
  setting: string,
  warn: ConfigWarn,
): string[] {
  if (!Array.isArray(value)) {
    warn({ setting, value, fallback });
    return [...fallback];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function regexValue(value: unknown, fallback: string, setting: string, warn: ConfigWarn): string {
  if (typeof value !== 'string') {
    warn({ setting, value, fallback });
    return fallback;
  }
  if (value.length === 0) return value;
  try {
    new RegExp(value);
    return value;
  } catch {
    warn({ setting, value, fallback });
    return fallback;
  }
}

/**
 * Valida o snapshot inteiro. O resultado preserva a forma de `UtConfig` e não
 * muta a entrada; o chamador decide como registrar os warnings.
 */
export function validateConfig(raw: UtConfig, warn: ConfigWarn): UtConfig {
  const out: UtConfig = { ...raw };

  out.sourcePath = stringValue(raw.sourcePath, 'install', 'sourcePath', warn);
  out.includePatterns = stringArray(raw.includePatterns, ['**/*.pks'], 'includePatterns', warn);
  out.coverageOwner = stringValue(raw.coverageOwner, '', 'coverageOwner', warn);
  out.coverageSchemes = stringArray(raw.coverageSchemes, [], 'coverage.schemes', warn);
  out.coverageIncludeObjects = stringArray(
    raw.coverageIncludeObjects,
    [],
    'coverage.includeObjects',
    warn,
  );
  out.coverageExcludeObjects = stringArray(
    raw.coverageExcludeObjects,
    [],
    'coverage.excludeObjects',
    warn,
  );
  out.coverageIncludeSchemaExpr = regexValue(
    raw.coverageIncludeSchemaExpr,
    '',
    'coverage.includeSchemaExpr',
    warn,
  );
  out.coverageIncludeObjectExpr = regexValue(
    raw.coverageIncludeObjectExpr,
    '',
    'coverage.includeObjectExpr',
    warn,
  );
  out.coverageExcludeSchemaExpr = regexValue(
    raw.coverageExcludeSchemaExpr,
    '',
    'coverage.excludeSchemaExpr',
    warn,
  );
  out.coverageExcludeObjectExpr = regexValue(
    raw.coverageExcludeObjectExpr,
    '',
    'coverage.excludeObjectExpr',
    warn,
  );
  out.coverageHtmlReport = booleanValue(raw.coverageHtmlReport, false, 'coverage.htmlReport', warn);
  out.tags = stringValue(raw.tags, '', 'tags', warn);
  out.randomOrder = booleanValue(raw.randomOrder, false, 'run.randomOrder', warn);
  out.randomOrderSeed = numberValue(raw.randomOrderSeed, 0, 'run.randomOrderSeed', warn, {
    min: 0,
    integer: true,
  });
  out.additionalReporters = stringArray(raw.additionalReporters, [], 'additionalReporters', warn);
  out.reporterClientCharacterSet = stringValue(
    raw.reporterClientCharacterSet,
    '',
    'reporter.clientCharacterSet',
    warn,
  );
  out.reporterColorConsole = booleanValue(
    raw.reporterColorConsole,
    false,
    'reporter.colorConsole',
    warn,
  );
  out.timeoutMinutes = numberValue(raw.timeoutMinutes, 60, 'timeoutMinutes', warn, {
    min: 0,
    integer: true,
  });
  out.dbmsOutput = booleanValue(raw.dbmsOutput, false, 'dbmsOutput', warn);

  out.oraclePoolMax = numberValue(raw.oraclePoolMax, 10, 'oraclePoolMax', warn, {
    min: 2,
    integer: true,
  });
  out.oraclePoolMin = numberValue(raw.oraclePoolMin, 2, 'oraclePoolMin', warn, {
    min: 0,
    max: out.oraclePoolMax,
    integer: true,
  });
  out.oraclePoolIncrement = numberValue(raw.oraclePoolIncrement, 1, 'oraclePoolIncrement', warn, {
    min: 1,
    integer: true,
  });
  out.oraclePoolPingInterval = numberValue(
    raw.oraclePoolPingInterval,
    60,
    'oraclePoolPingInterval',
    warn,
    { min: 0, integer: true },
  );
  out.oraclePoolCloseAfterRun = booleanValue(
    raw.oraclePoolCloseAfterRun,
    true,
    'oraclePoolCloseAfterRun',
    warn,
  );
  out.oracleClientMode = enumValue(
    raw.oracleClientMode,
    ['thin', 'thick'] as const,
    'thin',
    'oracleClientMode',
    warn,
  );
  out.oracleClientLibDir = stringValue(raw.oracleClientLibDir, '', 'oracleClientLibDir', warn);
  out.oracleClientConfigDir = stringValue(
    raw.oracleClientConfigDir,
    '',
    'oracleClientConfigDir',
    warn,
  );
  out.tnsAdminPath = stringValue(raw.tnsAdminPath, '', 'connections.tnsAdminPath', warn);
  out.walletLocation = stringValue(raw.walletLocation, '', 'walletLocation', warn);

  out.codeLensEnabled = booleanValue(raw.codeLensEnabled, true, 'codeLens.enabled', warn);
  out.statusBarEnabled = booleanValue(raw.statusBarEnabled, true, 'statusBar.enabled', warn);
  out.decorationsEnabled = booleanValue(raw.decorationsEnabled, true, 'decorations.enabled', warn);
  out.compilationDiagnosticsEnabled = booleanValue(
    raw.compilationDiagnosticsEnabled,
    true,
    'compilationDiagnostics.enabled',
    warn,
  );
  out.showTagsInTree = booleanValue(raw.showTagsInTree, false, 'showTagsInTree', warn);
  out.autoRun = enumValue(raw.autoRun, ['off', 'onSave'] as const, 'off', 'autoRun', warn);
  out.autoRunDelayMs = numberValue(raw.autoRunDelayMs, 500, 'autoRunDelayMs', warn, {
    min: 0,
    integer: true,
  });
  out.autoRunQueue = enumValue(
    raw.autoRunQueue,
    ['skip', 'replace'] as const,
    'skip',
    'autoRunQueue',
    warn,
  );
  out.organization = enumValue(
    raw.organization,
    ['file', 'schema', 'tag'] as const,
    'file',
    'organization',
    warn,
  );
  out.organizationSchemaPattern = stringValue(
    raw.organizationSchemaPattern,
    'db/{schema}/**',
    'organization.schemaPattern',
    warn,
  );
  out.discoverySource = enumValue(
    raw.discoverySource,
    ['auto', 'file', 'database'] as const,
    'auto',
    'discovery.source',
    warn,
  );
  out.discoveryRetryAttempts = numberValue(
    raw.discoveryRetryAttempts,
    2,
    'discovery.retryAttempts',
    warn,
    { min: 0, max: 5, integer: true },
  );
  out.discoveryCacheTtlSeconds = numberValue(
    raw.discoveryCacheTtlSeconds,
    30,
    'discovery.cacheTtlSeconds',
    warn,
    { min: 0, max: 3600, integer: true },
  );
  out.discoveryLanguageIds = stringArray(
    raw.discoveryLanguageIds,
    ['plsql', 'sql', 'oracle-sql'],
    'discovery.languageIds',
    warn,
  );
  out.refreshDebounceMs = numberValue(raw.refreshDebounceMs, 300, 'refreshDebounceMs', warn, {
    min: 0,
    max: 60_000,
    integer: true,
  });
  out.trace = booleanValue(raw.trace, false, 'trace', warn);
  out.perfEnabled = booleanValue(raw.perfEnabled, false, 'perf.enabled', warn);
  out.perfReportFile = stringValue(raw.perfReportFile, '', 'perf.reportFile', warn);
  out.setupDiagnosticsEnabled = booleanValue(
    raw.setupDiagnosticsEnabled,
    true,
    'setupDiagnostics.enabled',
    warn,
  );
  out.generateTestPackagePrefix = stringValue(
    raw.generateTestPackagePrefix,
    'ut_',
    'generate.testPackagePrefix',
    warn,
  );
  out.generateTestPackageSuffix = stringValue(
    raw.generateTestPackageSuffix,
    '',
    'generate.testPackageSuffix',
    warn,
  );
  out.generateTestsPerUnit = numberValue(
    raw.generateTestsPerUnit,
    1,
    'generate.numberOfTestsPerUnit',
    warn,
    { min: 1, max: 100, integer: true },
  );
  out.generateComments = booleanValue(
    raw.generateComments,
    true,
    'generate.generateComments',
    warn,
  );
  out.showTestDuration = booleanValue(raw.showTestDuration, false, 'showTestDuration', warn);
  out.sqlCoverageEnabled = booleanValue(raw.sqlCoverageEnabled, false, 'sqlCoverageEnabled', warn);
  out.debuggerEnabled = booleanValue(raw.debuggerEnabled, true, 'debugger.enabled', warn);
  out.debuggerStopOnException = booleanValue(
    raw.debuggerStopOnException,
    true,
    'debugger.stopOnException',
    warn,
  );
  out.debuggerTimeoutSeconds = numberValue(
    raw.debuggerTimeoutSeconds,
    300,
    'debugger.timeoutSeconds',
    warn,
    { min: 0.001, max: 86_400 },
  );
  out.debuggerCompileOnDebug = booleanValue(
    raw.debuggerCompileOnDebug,
    false,
    'debugger.compileOnDebug',
    warn,
  );
  out.scriptRunnerStopOnError = booleanValue(
    raw.scriptRunnerStopOnError,
    true,
    'scriptRunner.stopOnError',
    warn,
  );
  out.scriptRunnerAutoCommit = booleanValue(
    raw.scriptRunnerAutoCommit,
    true,
    'scriptRunner.autoCommit',
    warn,
  );
  out.scriptRunnerFilePattern = stringValue(
    raw.scriptRunnerFilePattern,
    '**/*.{sql,pks,pkb,fnc,prc,trg}',
    'scriptRunner.filePattern',
    warn,
  );
  out.scriptRunnerDbmsOutput = booleanValue(
    raw.scriptRunnerDbmsOutput,
    false,
    'scriptRunner.dbmsOutput',
    warn,
  );
  out.scriptRunnerTimeoutSeconds = numberValue(
    raw.scriptRunnerTimeoutSeconds,
    300,
    'scriptRunner.timeoutSeconds',
    warn,
    { min: 1, max: 86_400, integer: true },
  );
  out.language =
    raw.language === 'auto'
      ? 'auto'
      : (resolveLocale(raw.language, 'en') as UtConfig['language']) === raw.language
        ? raw.language
        : (() => {
            warn({ setting: 'language', value: raw.language, fallback: 'auto' });
            return 'auto' as const;
          })();

  return out;
}
