// Parser PURO das annotations utPLSQL. Sem dependência de 'vscode',
// para ser testável com `node --test`.

export interface TestProc {
  procName: string;
  description: string;
  line: number; // 0-based, linha da declaração da procedure
  disabled?: boolean;
  expectedError?: number;
  tags?: string[];
  displayName?: string;
}

export interface ParsedSuite {
  packageName: string;
  suiteDescription: string;
  tests: TestProc[];
  suiteLine: number;
  disabled?: boolean;
  hasBeforeAll?: boolean;
  hasAfterAll?: boolean;
  hasBeforeEach?: boolean;
  hasAfterEach?: boolean;
}

const RE_PACKAGE = /create\s+(?:or\s+replace\s+)?package\s+(?:body\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i;
const RE_SUITE = /--\s*%suite\s*(?:\(([^)]*)\))?/i;
const RE_TEST = /--\s*%test\s*(?:\(([^)]*)\))?/i;
const RE_PROC = /\bprocedure\s+"?(\w+)"?/i;
const RE_DISABLED = /--\s*%disabled\b/i;
const RE_THROWS = /--\s*%throws\s*\(\s*(-?\d+)\s*\)/i;
const RE_TAGS = /--\s*%tags\s*\(\s*([^)]+)\s*\)/i;
const RE_DISPLAYNAME = /--\s*%displayname\s*\(\s*([^)]*)\s*\)/i;
const RE_BEFOREALL = /--\s*%beforeall\b/i;
const RE_AFTERALL = /--\s*%afterall\b/i;
const RE_BEFOREEACH = /--\s*%beforeeach\b/i;
const RE_AFTEREACH = /--\s*%aftereach\b/i;

interface PendingTest {
  disabled?: boolean;
  expectedError?: number;
  tags?: string[];
  displayName?: string;
}

/**
 * Faz o parse do texto de um .pks/.pkb procurando %suite e %test
 * (e annotations associadas). Retorna null se não for uma suite utPLSQL.
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
  let pending: PendingTest = {};
  let suiteLine = -1;
  let seenFirstTest = false;
  let suiteDisabled = false;
  let hasBeforeAll = false;
  let hasAfterAll = false;
  let hasBeforeEach = false;
  let hasAfterEach = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (suiteLine < 0 && RE_SUITE.test(line)) {
      suiteLine = i;
    }

    if (RE_BEFOREALL.test(line)) hasBeforeAll = true;
    if (RE_AFTERALL.test(line)) hasAfterAll = true;
    if (RE_BEFOREEACH.test(line)) hasBeforeEach = true;
    if (RE_AFTEREACH.test(line)) hasAfterEach = true;

    const testMatch = RE_TEST.exec(line);
    if (testMatch) {
      pendingDescription = (testMatch[1] ?? '').trim();
      seenFirstTest = true;
      continue;
    }

    if (seenFirstTest) {
      if (RE_DISABLED.test(line)) {
        pending.disabled = true;
        continue;
      }
      const throwsMatch = RE_THROWS.exec(line);
      if (throwsMatch) {
        pending.expectedError = Math.abs(parseInt(throwsMatch[1], 10));
        continue;
      }
      const tagsMatch = RE_TAGS.exec(line);
      if (tagsMatch) {
        pending.tags = tagsMatch[1]
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        continue;
      }
      const displayMatch = RE_DISPLAYNAME.exec(line);
      if (displayMatch) {
        pending.displayName = displayMatch[1].trim() || undefined;
        continue;
      }
    } else if (suiteLine >= 0 && RE_DISABLED.test(line)) {
      suiteDisabled = true;
      continue;
    }

    if (pendingDescription !== null) {
      const procMatch = RE_PROC.exec(line);
      if (procMatch) {
        tests.push({
          procName: procMatch[1],
          description: pendingDescription || procMatch[1],
          line: i,
          ...(pending.disabled ? { disabled: true } : {}),
          ...(pending.expectedError !== undefined ? { expectedError: pending.expectedError } : {}),
          ...(pending.tags && pending.tags.length > 0 ? { tags: pending.tags } : {}),
          ...(pending.displayName ? { displayName: pending.displayName } : {}),
        });
        pendingDescription = null;
        pending = {};
      }
    }
  }

  return {
    packageName,
    suiteDescription,
    tests,
    suiteLine,
    ...(suiteDisabled ? { disabled: true } : {}),
    ...(hasBeforeAll ? { hasBeforeAll: true } : {}),
    ...(hasAfterAll ? { hasAfterAll: true } : {}),
    ...(hasBeforeEach ? { hasBeforeEach: true } : {}),
    ...(hasAfterEach ? { hasAfterEach: true } : {}),
  };
}
