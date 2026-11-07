import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * `true` quando `child` é o próprio `root` ou está dentro dele (ambos
 * resolvidos). Usa `path.relative` em vez de prefixo de string para não casar
 * `/ws/a` com `/ws/ab` e para respeitar a case-insensitivity do Windows.
 */
export function isInside(child: string, root: string): boolean {
  const rc = path.resolve(child);
  const rb = path.resolve(root);
  const rel = path.relative(rb, rc);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

/**
 * Versão que resolve symlinks reais. Um `views` que é link para fora da raiz
 * RETORNA `false` (não é possível provar contenção). Caminhos inexistentes ou
 * inacessíveis também retornam `false`.
 */
export function isReallyInside(child: string, root: string): boolean {
  try {
    return isInside(fs.realpathSync(child), fs.realpathSync(root));
  } catch {
    return false;
  }
}

/** Detecta `..`/`.` como segmento de um caminho (inclusive com `\` no Windows). */
export function hasTraversalSegment(value: string): boolean {
  return value.split(/[\\/]+/).some((segment) => segment === '..' || segment === '.');
}
