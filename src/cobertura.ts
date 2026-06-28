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
  const doc = parser.parse(xml);

  const out: FileLines[] = [];
  const packages = toArray<any>(doc?.coverage?.packages?.package);

  for (const pkg of packages) {
    for (const cls of toArray<any>(pkg?.classes?.class)) {
      const file = String(cls['@_filename'] ?? '');
      if (!file) {
        continue;
      }
      const lines = toArray<any>(cls?.lines?.line)
        .map((l) => ({
          line: parseInt(l['@_number'], 10),
          hits: parseInt(l['@_hits'], 10)
        }))
        .filter((l) => !isNaN(l.line));
      out.push({ file, lines });
    }
  }

  return out;
}
