import { type CodeLensItem, parseCodeLensItems } from './codelens';

/**
 * Encontra a annotation (`%suite`/`%test`) ativa para uma linha do cursor:
 * a de maior `line` que não ultrapassa o cursor (PRD-53). Compartilhado entre
 * Run at Cursor/Export e as variações de debug.
 */
export function findAnnotationAtLine(text: string, cursorLine: number): CodeLensItem | undefined {
  const items = parseCodeLensItems(text);
  let best: CodeLensItem | undefined;
  for (const item of items) {
    if (item.line <= cursorLine && (!best || item.line > best.line)) {
      best = item;
    }
  }
  return best;
}
