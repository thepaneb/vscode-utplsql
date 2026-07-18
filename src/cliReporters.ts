import type * as vscode from 'vscode';
import { runCli } from './cli';
import { buildInvocation, type InvocationConfig, isInvocationError } from './invocation';

const dummyToken: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

export function parseReportersOutput(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('['));
}

export async function listReporters(
  cfg: InvocationConfig,
  conn: string,
): Promise<string[] | { error: string }> {
  const args = ['reporters', conn];
  const inv = buildInvocation(cfg, args);
  if (isInvocationError(inv)) return { error: inv.error };
  const result = await runCli(inv.file, inv.args, inv.shell, process.cwd(), dummyToken);
  if (result.code !== 0) return { error: result.stderr || 'reporters command failed' };
  return parseReportersOutput(result.stdout);
}
