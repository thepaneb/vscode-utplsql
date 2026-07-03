// Parser PURO das annotations utPLSQL. Sem dependência de 'vscode',
// para ser testável com `node --test`.

export interface TestProc {
  procName: string;
  description: string;
  line: number; // 0-based, linha da declaração da procedure
}

export interface ParsedSuite {
  packageName: string;
  suiteDescription: string;
  tests: TestProc[];
}

const RE_PACKAGE = /create\s+(?:or\s+replace\s+)?package\s+(?:body\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i;
const RE_SUITE = /--\s*%suite\s*(?:\(([^)]*)\))?/i;
const RE_TEST = /--\s*%test\s*(?:\(([^)]*)\))?/i;
const RE_PROC = /\bprocedure\s+"?(\w+)"?/i;

/**
 * Faz o parse do texto de um .pks/.pkb procurando %suite e %test.
 * Retorna null se não for uma suite utPLSQL.
 */
export function parseSuiteText(text: string): ParsedSuite | null {
  if (!RE_SUITE.test(text)) {
    return null;
  }

  const pkgMatch = RE_PACKAGE.exec(text);
  if (!pkgMatch) {
    return null;
  }
  const packageName = pkgMatch[2];

  const suiteMatch = RE_SUITE.exec(text);
  const suiteDescription = (suiteMatch?.[1] ?? packageName).trim();

  const lines = text.split(/\r?\n/);
  const tests: TestProc[] = [];
  let pendingDescription: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const testMatch = RE_TEST.exec(line);
    if (testMatch) {
      pendingDescription = (testMatch[1] ?? '').trim();
      continue;
    }

    if (pendingDescription !== null) {
      const procMatch = RE_PROC.exec(line);
      if (procMatch) {
        const procName = procMatch[1];
        tests.push({
          procName,
          description: pendingDescription || procName,
          line: i,
        });
        pendingDescription = null;
      }
    }
  }

  return { packageName, suiteDescription, tests };
}
