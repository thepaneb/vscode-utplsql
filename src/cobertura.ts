// Parser PURO do XML Cobertura. Sem dependência de 'vscode',
// para ser testável com `node --test`.
import { XMLParser } from 'fast-xml-parser';

export interface FileLines {
  file: string; // filename como veio no relatório (pode ser relativo)
  lines: { line: number; hits: number }[];
}

function toArray<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null) {
    return [];
  }
  return Array.isArray(x) ? x : [x];
}

/** Faz o parse do XML Cobertura gerado pelo ut_coverage_cobertura_reporter. */
export function parseCobertura(xml: string): FileLines[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch {
    // XML truncado/malformado não derruba o run; a cobertura é best-effort.
    return [];
  }

  const out: FileLines[] = [];
  // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
  const packages = toArray<any>((doc as any)?.coverage?.packages?.package);

  for (const pkg of packages) {
    // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
    for (const cls of toArray<any>(pkg?.classes?.class)) {
      const file = String(cls['@_filename'] ?? '');
      if (!file) {
        continue;
      }
      // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
      const lines = toArray<any>(cls?.lines?.line)
        .map((l) => {
          const line = parseInt(l['@_number'], 10);
          const hits = parseInt(l['@_hits'], 10);
          return {
            line,
            hits: Number.isFinite(hits) ? Math.max(0, hits) : 0,
          };
        })
        .filter((l) => Number.isFinite(l.line) && l.line > 0);
      out.push({ file, lines });
    }
  }

  return out;
}
