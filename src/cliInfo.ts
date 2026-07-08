import type * as vscode from 'vscode';
import { runCli } from './cli';
import { buildInvocation, type InvocationConfig, isInvocationError } from './invocation';

export interface CliInfo {
  cliVersion: string;
  apiVersion: string;
  dbVersion?: string;
}

const dummyToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

export function parseInfoOutput(stdout: string): CliInfo {
  const cli = stdout.match(/^cli\s+(\S+)/im)?.[1] ?? 'desconhecida';
  const api = stdout.match(/^utPLSQL-java-api\s+(\S+)/im)?.[1] ?? 'desconhecida';
  const db = stdout.match(/^utPLSQL\s+(\S+)/im)?.[1];
  return { cliVersion: cli, apiVersion: api, dbVersion: db };
}

export async function getCliInfo(
  cfg: InvocationConfig,
  conn?: string,
): Promise<CliInfo | { error: string }> {
  const args = conn ? ['info', conn] : ['info'];
  const inv = buildInvocation(cfg, args);
  if (isInvocationError(inv)) return { error: inv.error };
  const result = await runCli(inv.file, inv.args, inv.shell, process.cwd(), dummyToken);
  if (result.code !== 0) return { error: result.stderr || 'info command failed' };
  return parseInfoOutput(result.stdout);
}

export function semverLt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na !== nb) return na < nb;
  }
  return false;
}
