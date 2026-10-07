import { XMLParser } from 'fast-xml-parser';

export type TestStatus = 'passed' | 'failed' | 'error' | 'skipped';

export interface StackFrame {
  objectName: string;
  line: number;
}

export interface TestCaseResult {
  classname: string; // ex.: schema.package
  name: string; // descrição do %test
  status: TestStatus;
  message?: string;
  durationMs?: number;
  stackFrames?: StackFrame[];
}

function toArray<T>(x: T | T[] | undefined | null): T[] {
  if (x === undefined || x === null) {
    return [];
  }
  return Array.isArray(x) ? x : [x];
}

/** Faz o parse do XML JUnit gerado pelo ut_junit_reporter. */
export function parseJUnit(xml: string): TestCaseResult[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(xml);

  const root = doc.testsuites ?? doc;
  const results: TestCaseResult[] = [];

  // O ut_junit_reporter ANINHA <testsuite> por nível (schema > package > suite)
  // — é o que acontece com `--%suitepath`, e o padrão em instalação
  // compartilhada (utPLSQL em UT3, suites em outro schema). Os testcases vivem
  // no nível mais interno, então a visita é recursiva (e a ordem preserva o
  // documento: testcases do nível atual antes dos aninhados).
  // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
  const visit = (suite: any): void => {
    // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
    for (const tc of toArray<any>(suite.testcase)) {
      const classname = String(tc['@_classname'] ?? suite['@_name'] ?? '');
      const name = String(tc['@_name'] ?? '');
      const timeSec = parseFloat(tc['@_time'] ?? '0');
      const durationMs = Number.isNaN(timeSec) ? undefined : Math.round(timeSec * 1000);

      let status: TestStatus = 'passed';
      let message: string | undefined;
      let stackFrames: StackFrame[] | undefined;

      const failure = tc.failure;
      const error = tc.error;
      const skipped = tc.skipped;

      if (failure !== undefined) {
        status = 'failed';
        message = extractMessage(failure);
        stackFrames = parseStackFrames(extractBody(failure));
      } else if (error !== undefined) {
        status = 'error';
        message = extractMessage(error);
        stackFrames = parseStackFrames(extractBody(error));
      } else if (skipped !== undefined) {
        status = 'skipped';
      }

      results.push({ classname, name, status, message, durationMs, stackFrames });
    }
    // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
    for (const nested of toArray<any>(suite.testsuite)) visit(nested);
  };

  // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
  for (const suite of toArray<any>(root.testsuite)) visit(suite);

  return results;
}

// biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
function extractMessage(node: any): string | undefined {
  // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
  const first = toArray<any>(node)[0];
  if (first === undefined) {
    return undefined;
  }
  if (typeof first === 'string') {
    return first;
  }
  const attrMsg = first['@_message'];
  const text = first['#text'];
  return [attrMsg, text].filter(Boolean).join('\n').trim() || undefined;
}

// biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
function extractBody(node: any): string {
  // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
  const first = toArray<any>(node)[0];
  if (first === undefined) return '';
  if (typeof first === 'string') return first;
  const text = first['#text'];
  return typeof text === 'string' ? text : '';
}

export interface ExpectedActual {
  expected?: string;
  actual?: string;
}

/**
 * Extrai os valores "Expected"/"Actual" da mensagem de falha do utPLSQL, em
 * qualquer ordem de rótulo (o reporter emite ora `Expected:`/`Actual:`, ora
 * `Actual: ... was expected to equal: ...`). Case-insensitive e multilinha:
 * cada valor vai até o próximo rótulo. Só devolve o par quando AMBOS existem —
 * mensagem sem os dois marcadores segue exibida como texto (PRD-52).
 */
export function parseExpectedActual(message: string): ExpectedActual {
  if (!message) return {};
  // Rótulos aceitos: `Expected:`/`Actual:` (documentation reporter) e o
  // `... was expected to equal:`/`... was expected to ...` (assertion do ut).
  const label = /(?:(?:^|\n)[ \t]*(expected|actual)[ \t]*:|was expected to equal)[ \t]*:?[ \t]*/gi;
  const matches: { key: 'expected' | 'actual'; valueStart: number; labelStart: number }[] = [];
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((m = label.exec(message)) !== null) {
    matches.push({
      key: m[1] ? (m[1].toLowerCase() as 'expected' | 'actual') : 'expected',
      valueStart: m.index + m[0].length,
      labelStart: m.index,
    });
  }
  if (matches.length < 2) return {};

  const values: ExpectedActual = {};
  for (let i = 0; i < matches.length; i++) {
    const from = matches[i].valueStart;
    const to = i + 1 < matches.length ? matches[i + 1].labelStart : message.length;
    const value = trimValue(message.slice(from, to));
    if (values[matches[i].key] === undefined) values[matches[i].key] = value;
  }

  if (values.expected === undefined || values.actual === undefined) return {};
  return values;
}

/** Descarta texto após uma linha de stack trace e faz trim final. */
function trimValue(raw: string): string {
  return raw
    .split('\n')
    .filter((line) => !/^\s*at\s+/.test(line))
    .join('\n')
    .trim();
}

export function parseStackFrames(body: string): StackFrame[] | undefined {
  if (!body) return undefined;
  const frames: StackFrame[] = [];
  // Formatos aceitos, do mais recente para o mais antigo:
  //   at "SCHEMA.PKG.PROC", line N  — utPLSQL (nome único qualificado)
  //   at "PKG"."PROC", line N        — backtrace no formato DBMS_UTILITY
  //   at PKG.PROC, line N            — sem aspas
  const regex = /at\s+(?:"([^"]+)"\."([^"]+)"|"([^"]+)"|([\w.$#]+)),?\s*line\s+(\d+)/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((match = regex.exec(body)) !== null) {
    const obj = match[1] ?? match[3] ?? match[4];
    if (obj) {
      frames.push({
        objectName: obj,
        line: parseInt(match[5], 10),
      });
    }
  }
  return frames.length > 0 ? frames : undefined;
}

/**
 * Prefixos dos objetos INTERNOS do framework utPLSQL. O schema NÃO entra na
 * lista: num install próprio o schema do usuário é o de instalação (UT3), e o
 * frame do teste dele também vem qualificado (`UT3.TEST_MATH_FAIL.P`) — o que
 * precisa ser descartado é o objeto de framework (`UT3.UT_SUITE_MANAGER`).
 */
const INTERNAL_PREFIXES = ['UT_', 'UT$', 'UT3_', 'UT3$'];

/** Frame do utPLSQL: `OBJETO`, `SCHEMA.OBJETO` ou `SCHEMA.OBJETO.PROCEDURE`. */
export function isUserFrame(frame: StackFrame): boolean {
  if (frame.line <= 0) return false;
  const segments = frame.objectName.toUpperCase().split('.');
  return !segments.some((s) => INTERNAL_PREFIXES.some((p) => s.startsWith(p)));
}
