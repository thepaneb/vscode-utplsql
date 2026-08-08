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
  // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
  const suites = toArray<any>(root.testsuite);
  const results: TestCaseResult[] = [];

  for (const suite of suites) {
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
  }

  return results;
}

// biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
function extractMessage(node: any): string {
  // biome-ignore lint/suspicious/noExplicitAny: XML parsing — structure is dynamic
  const first = toArray<any>(node)[0];
  if (first === undefined) {
    return 'Falhou';
  }
  if (typeof first === 'string') {
    return first;
  }
  const attrMsg = first['@_message'];
  const text = first['#text'];
  return [attrMsg, text].filter(Boolean).join('\n').trim() || 'Falhou';
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

export function parseStackFrames(body: string): StackFrame[] | undefined {
  if (!body) return undefined;
  const frames: StackFrame[] = [];
  const regex = /at\s+(?:"([^"]+)"\."([^"]+)"|([\w.$#]+)),?\s*line\s+(\d+)/g;
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: idiomatic regex loop
  while ((match = regex.exec(body)) !== null) {
    const obj = match[1] ?? match[3];
    if (obj) {
      frames.push({
        objectName: obj,
        line: parseInt(match[4], 10),
      });
    }
  }
  return frames.length > 0 ? frames : undefined;
}

const INTERNAL_PREFIXES = ['UT_', 'UT$', 'UT3_', 'UT3$', 'UT3.'];

export function isUserFrame(frame: StackFrame): boolean {
  const upper = frame.objectName.toUpperCase();
  return !INTERNAL_PREFIXES.some((p) => upper.startsWith(p)) && frame.line > 0;
}
