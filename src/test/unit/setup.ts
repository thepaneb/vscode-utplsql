import Module from 'node:module';
import path from 'node:path';

const Mod = Module as unknown as { _resolveFilename: (...args: unknown[]) => string };

const origResolve = Mod._resolveFilename.bind(Mod);
const stubPath = path.resolve(__dirname, '..', 'vscode-stub.js');

Mod._resolveFilename = (...args: unknown[]) => {
  const request = args[0] as string;
  if (request === 'vscode') return stubPath;
  return origResolve(...args);
};
