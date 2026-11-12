/**
 * Estratégias de organização da árvore de testes (PRD-138).
 *
 * Módulo PURO em runtime (só tipos de `vscode`). As strategies recebem os
 * builders existentes por injeção, mantendo `testTree.ts` como fachada e
 * permitindo testar cada modo sem montar a árvore inteira.
 */

import type * as vscode from 'vscode';
import type { SuiteFile } from '../discovery';
import type { TestStateManager } from '../state';

export type OrganizationMode = 'file' | 'schema' | 'tag';

export interface OrganizationContext {
  controller: vscode.TestController;
  state: TestStateManager;
  suites: SuiteFile[];
  folders?: readonly vscode.WorkspaceFolder[];
  schemaPattern: string;
}

export interface OrganizationDeps {
  buildFile(controller: vscode.TestController, state: TestStateManager, suites: SuiteFile[]): void;
  buildTag(controller: vscode.TestController, state: TestStateManager, suites: SuiteFile[]): void;
  buildSchema(
    controller: vscode.TestController,
    state: TestStateManager,
    suites: SuiteFile[],
    schemaPattern: string,
    extraSchemas: string[],
  ): void;
  discoverSchemas(
    folders: readonly vscode.WorkspaceFolder[],
    schemaPattern: string,
  ): Promise<string[]>;
  collectAll(
    controller: vscode.TestController,
    state: TestStateManager,
  ): Promise<vscode.TestItem[]>;
  resolveNode(ctx: OrganizationContext, item: vscode.TestItem): Promise<void> | void;
}

export interface OrganizationStrategy {
  readonly mode: OrganizationMode;
  build(ctx: OrganizationContext): Promise<void>;
  resolve(ctx: OrganizationContext, item: vscode.TestItem): Promise<void>;
  collectAll(ctx: OrganizationContext): Promise<vscode.TestItem[]>;
}

class FileOrganization implements OrganizationStrategy {
  readonly mode = 'file' as const;
  constructor(private readonly deps: OrganizationDeps) {}

  async build(ctx: OrganizationContext): Promise<void> {
    this.deps.buildFile(ctx.controller, ctx.state, ctx.suites);
  }

  async resolve(ctx: OrganizationContext, item: vscode.TestItem): Promise<void> {
    await this.deps.resolveNode(ctx, item);
  }

  async collectAll(ctx: OrganizationContext): Promise<vscode.TestItem[]> {
    return this.deps.collectAll(ctx.controller, ctx.state);
  }
}

class TagOrganization implements OrganizationStrategy {
  readonly mode = 'tag' as const;
  constructor(private readonly deps: OrganizationDeps) {}

  async build(ctx: OrganizationContext): Promise<void> {
    this.deps.buildTag(ctx.controller, ctx.state, ctx.suites);
  }

  async resolve(ctx: OrganizationContext, item: vscode.TestItem): Promise<void> {
    await this.deps.resolveNode(ctx, item);
  }

  async collectAll(ctx: OrganizationContext): Promise<vscode.TestItem[]> {
    return this.deps.collectAll(ctx.controller, ctx.state);
  }
}

class SchemaOrganization implements OrganizationStrategy {
  readonly mode = 'schema' as const;
  constructor(private readonly deps: OrganizationDeps) {}

  async build(ctx: OrganizationContext): Promise<void> {
    const extra = ctx.folders?.length
      ? await this.deps.discoverSchemas(ctx.folders, ctx.schemaPattern)
      : [];
    this.deps.buildSchema(ctx.controller, ctx.state, ctx.suites, ctx.schemaPattern, extra);
  }

  async resolve(ctx: OrganizationContext, item: vscode.TestItem): Promise<void> {
    await this.deps.resolveNode(ctx, item);
  }

  async collectAll(ctx: OrganizationContext): Promise<vscode.TestItem[]> {
    return this.deps.collectAll(ctx.controller, ctx.state);
  }
}

export function createOrganizationStrategy(
  mode: OrganizationMode,
  deps: OrganizationDeps,
): OrganizationStrategy {
  if (mode === 'schema') return new SchemaOrganization(deps);
  if (mode === 'tag') return new TagOrganization(deps);
  return new FileOrganization(deps);
}
