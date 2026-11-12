/**
 * Estratégias de execução (PRD-129). Módulo PURO em runtime (só tipos de
 * `vscode`): recebe o contexto e devolve as opções de cobertura/export, sem
 * tocar no protocolo Oracle. O pós-processamento (SQL coverage) é injetado.
 */

import type * as vscode from 'vscode';
import type { UtConfig } from './config';
import type { OracleCoverageOptions, OracleExportReporter, OracleRunOptions } from './oracleRunner';
import type { TestStateManager } from './state';

export type RunMode = 'normal' | 'coverage' | 'export' | 'debug';

export interface RunStrategyContext {
  cfg: UtConfig;
  coverage: boolean;
  exportReporter?: OracleExportReporter;
  roots: readonly string[];
  connection: string;
  sourcePath: string;
  run: vscode.TestRun;
  state: TestStateManager;
  folders?: readonly vscode.WorkspaceFolder[];
  onHtmlReport?: (filePath: string) => void;
}

export interface RunPreparation {
  coverage: OracleCoverageOptions | boolean;
  exportReporter?: OracleExportReporter;
}

export interface RunStrategyFinalizeDeps {
  applySqlCoverage(): Promise<void>;
}

export interface RunStrategyRunDeps {
  executeOracle(
    options: OracleRunOptions,
    token: vscode.CancellationToken,
  ): Promise<string | undefined>;
}

export interface RunStrategy {
  readonly kind: RunMode;
  prepare(ctx: RunStrategyContext): RunPreparation;
  run(
    options: OracleRunOptions,
    token: vscode.CancellationToken,
    deps: RunStrategyRunDeps,
  ): Promise<string | undefined>;
  finalize(ctx: RunStrategyContext, deps: RunStrategyFinalizeDeps): Promise<void>;
}

function coverageOptions(ctx: RunStrategyContext, enabled: boolean): OracleCoverageOptions {
  return {
    enabled,
    htmlReport: enabled && ctx.cfg.coverageHtmlReport,
    reportRoot: ctx.roots[0],
    onHtmlReport: ctx.onHtmlReport,
    owner: ctx.cfg.coverageOwner,
    schemes: ctx.cfg.coverageSchemes,
    includeObjects: ctx.cfg.coverageIncludeObjects,
    excludeObjects: ctx.cfg.coverageExcludeObjects,
    includeSchemaExpr: ctx.cfg.coverageIncludeSchemaExpr,
    includeObjectExpr: ctx.cfg.coverageIncludeObjectExpr,
    excludeSchemaExpr: ctx.cfg.coverageExcludeSchemaExpr,
    excludeObjectExpr: ctx.cfg.coverageExcludeObjectExpr,
  };
}

class NormalRun implements RunStrategy {
  readonly kind: RunMode = 'normal';

  prepare(ctx: RunStrategyContext): RunPreparation {
    return { coverage: coverageOptions(ctx, false) };
  }

  run(
    options: OracleRunOptions,
    token: vscode.CancellationToken,
    deps: RunStrategyRunDeps,
  ): Promise<string | undefined> {
    return deps.executeOracle(options, token);
  }

  async finalize(ctx: RunStrategyContext, deps: RunStrategyFinalizeDeps): Promise<void> {
    if (ctx.cfg.sqlCoverageEnabled) await deps.applySqlCoverage();
  }
}

class CoverageRun extends NormalRun {
  override readonly kind: RunMode = 'coverage';

  override prepare(ctx: RunStrategyContext): RunPreparation {
    return { coverage: coverageOptions(ctx, true) };
  }
}

class ExportRun implements RunStrategy {
  readonly kind: RunMode = 'export';

  prepare(ctx: RunStrategyContext): RunPreparation {
    return {
      coverage: coverageOptions(ctx, false),
      exportReporter: ctx.exportReporter as OracleExportReporter,
    };
  }

  run(
    options: OracleRunOptions,
    token: vscode.CancellationToken,
    deps: RunStrategyRunDeps,
  ): Promise<string | undefined> {
    return deps.executeOracle(options, token);
  }

  async finalize(): Promise<void> {
    // Export não aplica resultados/cobertura no Test Explorer (PRD-76).
  }
}

class DebugRun extends NormalRun {
  override readonly kind: RunMode = 'debug';
}

const normal = new NormalRun();
const coverage = new CoverageRun();
const exportRun = new ExportRun();
const debug = new DebugRun();

export function selectRunStrategy(input: {
  coverage: boolean;
  exportReporter?: OracleExportReporter;
  debug?: boolean;
}): RunStrategy {
  if (input.exportReporter) return exportRun;
  if (input.debug) return debug;
  if (input.coverage) return coverage;
  return normal;
}
