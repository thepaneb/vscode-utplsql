import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_ENDPOINT = 'https://opencode.ai/inference/systemone/v1/systemone';
export const DEFAULT_MODEL = 'jev-1.13-free';
export const DEFAULT_MAX_DIFF_CHARS = 30_000;
export const THRESHOLDS = {
  security: 0.7,
  correctness: 0.7,
  tests: 0.6,
  severity: 3,
} as const;

const SEVERITY_LABELS = ['nenhuma', 'baixa', 'média', 'alta', 'crítica'] as const;

export type JevQuestionType = 'noul' | 'score' | 'choice';

export interface JevQuestion {
  type: JevQuestionType;
  instructions: string;
  criteria?: string[] | Record<string, string>;
}

export interface JevRequest {
  model: string;
  state: string;
  questions: Record<string, JevQuestion>;
}

export interface JevNoulAnswer {
  type: 'noul';
  noul: number;
}

export interface JevScoreAnswer {
  type: 'score';
  score: number;
  confidence?: number;
  legend?: Record<string, string>;
  probabilities?: Record<string, number>;
}

export interface JevChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
}

export type JevAnswer = JevNoulAnswer | JevScoreAnswer | JevChoiceAnswer;

export interface JevUsage {
  input_tokens?: number;
  output_tokens?: number;
  cost?: number;
  [key: string]: unknown;
}

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage?: JevUsage;
}

export interface FetchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type FetchLike = (
  url: string,
  init: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<FetchResponse>;

export type ExecFileLike = (
  file: string,
  args: string[],
  options: { cwd: string; encoding: 'utf8'; maxBuffer: number },
) => string;

export interface CliOptions {
  base: string;
  head: string;
  repo: string;
  diffFile?: string;
  model: string;
  endpoint: string;
  maxDiffChars: number;
  maxFileChars: number;
  timeoutMs: number;
  format: 'json' | 'markdown';
  output?: string;
  jsonOutput?: string;
  workingTree: boolean;
  failOnFindings: boolean;
  requireKey: boolean;
  dryRun: boolean;
  help: boolean;
}

export interface FilteredDiff {
  text: string;
  files: string[];
  omitted: number;
  truncated: boolean;
}

export interface DiffChunk {
  text: string;
  files: string[];
}

export interface DiffPlan {
  chunks: DiffChunk[];
  files: string[];
  omitted: number;
  omittedDocs: number;
  omittedSensitive: number;
  splitFiles: number;
}

export interface ChunkReview {
  index: number;
  files: string[];
  response: JevResponse;
  summary: ReviewSummary;
}

export interface AggregateReview {
  response: JevResponse;
  summary: ReviewSummary;
  plan: DiffPlan;
  chunks: ChunkReview[];
}

export interface Finding {
  dimension: string;
  value: number | string;
  threshold: number | string;
  message: string;
}

export interface ReviewSummary {
  verdict: 'approve' | 'comment' | 'block';
  severity?: number;
  severityLabel: string;
  findings: Finding[];
  hasFindings: boolean;
  critical: boolean;
}

export interface MainDeps {
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  fetchImpl?: FetchLike;
  readFile?: (file: string) => string;
  writeFile?: (file: string, data: string) => void;
  execFile?: ExecFileLike;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
}

export class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

export class JevApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'JevApiError';
    this.status = status;
  }
}

export function isMaxTokensError(error: unknown): boolean {
  return (
    error instanceof JevApiError &&
    error.status === 400 &&
    error.message.includes('max_tokens_exceeded')
  );
}

const USAGE = `Uso: node scripts/jev-review.cjs [opções]

Opções:
  --base <ref>            Ref base do diff (default: origin/main)
  --head <ref>            Ref head do diff (default: HEAD)
  --repo <path>           Repositório alvo (default: .)
  --diff-file <path>      Usa um diff salvo em vez de executar git
  --model <id>            Modelo Jev (default: ${DEFAULT_MODEL})
  --endpoint <url>        Endpoint System One (default: ${DEFAULT_ENDPOINT})
  --max-diff-chars <n>    Limite de cada bloco enviado (default: ${DEFAULT_MAX_DIFF_CHARS})
  --max-file-chars <n>    Tamanho máximo de cada parte de um arquivo (default: 20000)
  --timeout-ms <n>        Timeout da chamada (default: 60000)
  --format <json|markdown>
  --output <path>         Escreve o relatório em arquivo
  --json-output <path>    Escreve também o relatório JSON
  --working-tree          Revisa a árvore de trabalho (git diff <base>)
  --dry-run               Mostra o payload sem chamar a API
  --fail-on-findings      Sai 1 quando houver achados
  --require-key           Sai 2 se a chave não estiver definida
  --help, -h              Mostra esta ajuda
`;

const defaultFetch: FetchLike = async (url, init) => {
  const response = await globalThis.fetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json(),
    text: () => response.text(),
  };
};

const defaultExecFile: ExecFileLike = (file, args, options) =>
  String(execFileSync(file, args, options));

const defaultReadFile = (file: string): string => readFileSync(file, 'utf8');

const defaultWriteFile = (file: string, data: string): void => {
  writeFileSync(file, data, 'utf8');
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError(`${flag} precisa ser um inteiro positivo`);
  }
  return parsed;
}

function parseFormat(value: string): 'json' | 'markdown' {
  if (value !== 'json' && value !== 'markdown') {
    throw new CliError('--format precisa ser "json" ou "markdown"');
  }
  return value;
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    base: 'origin/main',
    head: 'HEAD',
    repo: '.',
    model: DEFAULT_MODEL,
    endpoint: DEFAULT_ENDPOINT,
    maxDiffChars: DEFAULT_MAX_DIFF_CHARS,
    maxFileChars: 20_000,
    timeoutMs: 60_000,
    format: 'markdown',
    workingTree: false,
    failOnFindings: false,
    requireKey: false,
    dryRun: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (!arg.startsWith('--')) {
      throw new CliError(`argumento inesperado: ${arg}`);
    }
    const equals = arg.indexOf('=');
    const name = equals === -1 ? arg : arg.slice(0, equals);
    const inline = equals === -1 ? undefined : arg.slice(equals + 1);
    const readValue = (): string => {
      if (inline !== undefined) return inline;
      const next = argv[++index];
      if (next === undefined || next.startsWith('--')) {
        throw new CliError(`faltou valor para ${name}`);
      }
      return next;
    };
    const rejectInline = (): void => {
      if (inline !== undefined) throw new CliError(`${name} não aceita valor`);
    };

    switch (name) {
      case '--base':
        options.base = readValue();
        break;
      case '--head':
        options.head = readValue();
        break;
      case '--repo':
        options.repo = readValue();
        break;
      case '--diff-file':
        options.diffFile = readValue();
        break;
      case '--model':
        options.model = readValue();
        break;
      case '--endpoint':
        options.endpoint = readValue();
        break;
      case '--max-diff-chars':
        options.maxDiffChars = positiveInt(readValue(), name);
        break;
      case '--max-file-chars':
        options.maxFileChars = positiveInt(readValue(), name);
        break;
      case '--timeout-ms':
        options.timeoutMs = positiveInt(readValue(), name);
        break;
      case '--format':
        options.format = parseFormat(readValue());
        break;
      case '--output':
        options.output = readValue();
        break;
      case '--json-output':
        options.jsonOutput = readValue();
        break;
      case '--working-tree':
        rejectInline();
        options.workingTree = true;
        break;
      case '--fail-on-findings':
        rejectInline();
        options.failOnFindings = true;
        break;
      case '--require-key':
        rejectInline();
        options.requireKey = true;
        break;
      case '--dry-run':
        rejectInline();
        options.dryRun = true;
        break;
      default:
        throw new CliError(`opção desconhecida: ${name}`);
    }
  }

  return options;
}

function unquote(value: string): string | undefined {
  let result = value;
  if (
    (result.startsWith('"') && result.endsWith('"')) ||
    (result.startsWith("'") && result.endsWith("'"))
  ) {
    result = result.slice(1, -1);
  }
  return result.length > 0 ? result : undefined;
}

export function parseEnvValue(contents: string, name: string): string | undefined {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || match[1] !== name) continue;
    return unquote(match[2].trim());
  }
  return undefined;
}

export function loadApiKey(options: {
  env: NodeJS.ProcessEnv;
  envFile: string;
  readFile?: (file: string) => string;
}): string | undefined {
  const fromEnv = options.env.OPENCODE_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const contents = (options.readFile ?? defaultReadFile)(options.envFile);
    return parseEnvValue(contents, 'OPENCODE_API_KEY');
  } catch {
    return undefined;
  }
}

export function redactSecrets(text: string): string {
  return text
    .replace(
      /^(\s*(?:export\s+)?[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|CONN|CREDENTIAL)[A-Z0-9_]*\s*=\s*).*$/gim,
      '$1[REDACTED]',
    )
    .replace(/^(\s*Authorization:\s*Bearer\s+).+$/gim, '$1[REDACTED]')
    .replace(
      /\b(password|passwd|pwd|secret|token|api[_-]?key)\b(\s*[:=]\s*)(['"])[^'"]*\3/gi,
      '$1$2$3[REDACTED]$3',
    )
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      '[REDACTED PRIVATE KEY]',
    )
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED AWS KEY]')
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[REDACTED JWT]');
}

export function isDocPath(file: string): boolean {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  if (normalized.startsWith('docs/')) return true;
  const base = path.posix.basename(normalized).toLowerCase();
  if (/\.(md|markdown|mdx)$/.test(base)) return true;
  return /^(readme|changelog|license|licence|contributing|code_of_conduct|security)(\.|$)/.test(
    base,
  );
}

export function isSensitivePath(file: string): boolean {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  const base = path.posix.basename(normalized).toLowerCase();
  const publicEnvExamples = new Set(['.env.example', '.env.sample', '.env.template']);
  if (base === '.env' || (base.startsWith('.env.') && !publicEnvExamples.has(base))) {
    return true;
  }
  if (/\.(pem|key|p12|pfx|jks|keystore)$/i.test(base)) return true;
  if (['id_rsa', 'id_ed25519', 'credentials', 'secrets'].includes(base)) return true;
  if (/(^|\/)(node_modules|out|dist|coverage|\.vscode-test|\.git)\//.test(normalized)) {
    return true;
  }
  if (normalized.includes('docs/brain/.obsidian/plugins/') && base === 'data.json') {
    return true;
  }
  if (['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock'].includes(base)) {
    return true;
  }
  return base.endsWith('.vsix');
}

interface DiffBlock {
  path?: string;
  text: string;
}

function parseDiffHeaderPath(header: string): string | undefined {
  const rest = header.replace(/^diff --git /, '');
  const quoted = rest.match(/^"a\/(.+)" "b\/(.+)"$/);
  if (quoted) return quoted[2];
  const unquoted = rest.match(/^a\/(.+) b\/(.+)$/);
  return unquoted?.[2];
}

export function splitDiff(diff: string): DiffBlock[] {
  const normalized = diff.replace(/\r\n/g, '\n');
  if (!normalized.trim()) return [];
  const parts = normalized.split(/^(?=diff --git )/m).filter((part) => part.trim().length > 0);
  if (parts.length === 1 && !parts[0].startsWith('diff --git ')) {
    return [{ path: undefined, text: parts[0] }];
  }
  return parts.map((text) => ({
    path: parseDiffHeaderPath(text.split('\n', 1)[0]),
    text,
  }));
}

function isBinaryDiff(text: string): boolean {
  return /^Binary files .* differ$/m.test(text) || /^GIT binary patch$/m.test(text);
}

function diffPriority(file: string): number {
  const normalized = file.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized.startsWith('src/') ? 0 : 1;
}

function splitDiffBlock(pathName: string, text: string, maxPartChars: number): string[] {
  if (text.length <= maxPartChars) return [text];

  const bodies: string[] = [];
  let buffer = '';
  const flush = (): void => {
    if (buffer.length > 0) {
      bodies.push(buffer);
      buffer = '';
    }
  };

  for (const line of text.split('\n')) {
    if (line.length > maxPartChars) {
      flush();
      for (let start = 0; start < line.length; start += maxPartChars) {
        bodies.push(line.slice(start, start + maxPartChars));
      }
      continue;
    }
    if (buffer.length > 0 && buffer.length + 1 + line.length > maxPartChars) flush();
    buffer = buffer.length > 0 ? `${buffer}\n${line}` : line;
  }
  flush();

  if (bodies.length === 0) return [text];
  return bodies.map(
    (body, index) => `--- parte ${index + 1}/${bodies.length} de ${pathName} ---\n${body}`,
  );
}

export function planDiffChunks(
  diff: string,
  maxDiffChars = DEFAULT_MAX_DIFF_CHARS,
  maxFileChars = 20_000,
): DiffPlan {
  const selected: Array<{ path: string; text: string }> = [];
  let omittedDocs = 0;
  let omittedSensitive = 0;

  for (const block of splitDiff(diff)) {
    if (!block.path || isSensitivePath(block.path) || isBinaryDiff(block.text)) {
      omittedSensitive++;
      continue;
    }
    if (isDocPath(block.path) && diffPriority(block.path) !== 0) {
      omittedDocs++;
      continue;
    }
    selected.push({ path: block.path, text: redactSecrets(block.text) });
  }

  selected.sort((left, right) => diffPriority(left.path) - diffPriority(right.path));

  const partLimit = Math.max(1, Math.min(maxFileChars, maxDiffChars));
  const units: Array<{ path: string; text: string }> = [];
  let splitFiles = 0;
  for (const block of selected) {
    const parts = splitDiffBlock(block.path, block.text, partLimit);
    if (parts.length > 1) splitFiles++;
    for (const text of parts) units.push({ path: block.path, text });
  }

  const chunks: DiffChunk[] = [];
  let current: typeof units = [];
  let currentLength = 0;
  const flush = (): void => {
    if (current.length === 0) return;
    chunks.push({
      text: current.map((unit) => unit.text).join('\n'),
      files: [...new Set(current.map((unit) => unit.path))],
    });
    current = [];
    currentLength = 0;
  };

  for (const unit of units) {
    if (current.length > 0 && currentLength + 1 + unit.text.length > maxDiffChars) flush();
    currentLength += (current.length > 0 ? 1 : 0) + unit.text.length;
    current.push(unit);
  }
  flush();

  return {
    chunks,
    files: [...new Set(units.map((unit) => unit.path))],
    omitted: omittedDocs + omittedSensitive,
    omittedDocs,
    omittedSensitive,
    splitFiles,
  };
}

export function buildQuestions(): Record<string, JevQuestion> {
  return {
    security: {
      type: 'noul',
      instructions:
        'O diff introduz uma vulnerabilidade de segurança explorável (injeção, exposição de segredo ou autorização quebrada)?',
    },
    correctness: {
      type: 'noul',
      instructions:
        'O diff introduz um bug de correção provável (lógica, tipo ou condição de contorno)?',
    },
    tests: {
      type: 'noul',
      instructions: 'O diff altera comportamento sem um teste correspondente?',
    },
    severity: {
      type: 'score',
      instructions: 'Qual a severidade do problema mais relevante no diff?',
      criteria: ['nenhuma', 'baixa', 'média', 'alta', 'crítica'],
    },
    recommendation: {
      type: 'choice',
      instructions: 'O que fazer com este diff?',
      criteria: {
        approve: 'Aprovar sem ressalvas',
        comment: 'Comentar pedindo ajuste',
        block: 'Bloquear o merge',
      },
    },
  };
}

export function buildState(filtered: FilteredDiff): string {
  const lines = [
    `Arquivos revisados: ${filtered.files.length}`,
    `Arquivos omitidos: ${filtered.omitted}`,
    filtered.truncated ? 'Diff truncado por limite de tamanho.' : '',
    '',
    filtered.text,
  ];
  return lines.filter((line) => line.length > 0).join('\n');
}

function validateAnswer(id: string, raw: unknown): JevAnswer {
  if (!isRecord(raw)) throw new JevApiError(`resposta inválida para "${id}"`);
  if (raw.type === 'noul' && typeof raw.noul === 'number') {
    return { type: 'noul', noul: raw.noul };
  }
  if (raw.type === 'score' && typeof raw.score === 'number') {
    return {
      type: 'score',
      score: raw.score,
      confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
      legend: isRecord(raw.legend) ? (raw.legend as Record<string, string>) : undefined,
      probabilities: isRecord(raw.probabilities)
        ? (raw.probabilities as Record<string, number>)
        : undefined,
    };
  }
  if (raw.type === 'choice' && typeof raw.choice === 'string') {
    return {
      type: 'choice',
      choice: raw.choice,
      confidence: typeof raw.confidence === 'number' ? raw.confidence : undefined,
      probabilities: isRecord(raw.probabilities)
        ? (raw.probabilities as Record<string, number>)
        : undefined,
    };
  }
  throw new JevApiError(`resposta inválida para "${id}"`);
}

function validateResponse(payload: unknown): JevResponse {
  if (!isRecord(payload)) throw new JevApiError('resposta sem objeto JSON');
  if (!isRecord(payload.answers)) throw new JevApiError('resposta sem "answers"');
  const answers: Record<string, JevAnswer> = {};
  for (const [id, raw] of Object.entries(payload.answers)) {
    answers[id] = validateAnswer(id, raw);
  }
  return {
    model: typeof payload.model === 'string' ? payload.model : 'desconhecido',
    answers,
    usage: isRecord(payload.usage) ? (payload.usage as JevUsage) : undefined,
  };
}

async function safeText(response: FetchResponse): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

export interface CallJevOptions {
  endpoint: string;
  apiKey: string;
  model: string;
  state: string;
  questions: Record<string, JevQuestion>;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export async function callJev(options: CallJevOptions): Promise<JevResponse> {
  const fetchImpl = options.fetchImpl ?? defaultFetch;
  const timeoutMs = options.timeoutMs ?? 60_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: FetchResponse;

  try {
    response = await fetchImpl(options.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'utplsql-jev-review/1.0',
        'x-opencode-session': 'utplsql-jev-review',
      },
      body: JSON.stringify({
        model: options.model,
        state: options.state,
        questions: options.questions,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new JevApiError(`timeout após ${timeoutMs}ms`);
    }
    throw new JevApiError(`falha de rede: ${errorMessage(error)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await safeText(response);
    throw new JevApiError(
      `HTTP ${response.status}: ${redactSecrets(body).slice(0, 500)}`,
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new JevApiError(`JSON inválido: ${errorMessage(error)}`);
  }
  return validateResponse(payload);
}

export function noulValue(response: JevResponse, id: string): number | undefined {
  const answer = response.answers[id];
  return answer?.type === 'noul' ? answer.noul : undefined;
}

export function scoreValue(response: JevResponse, id: string): number | undefined {
  const answer = response.answers[id];
  return answer?.type === 'score' ? answer.score : undefined;
}

export function choiceValue(response: JevResponse, id: string): string | undefined {
  const answer = response.answers[id];
  return answer?.type === 'choice' ? answer.choice : undefined;
}

function severityLabelFor(severity: number | undefined): string {
  if (severity === undefined) return 'desconhecida';
  const index = Math.max(0, Math.min(SEVERITY_LABELS.length - 1, Math.round(severity)));
  return SEVERITY_LABELS[index];
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function summarize(response: JevResponse): ReviewSummary {
  const security = noulValue(response, 'security');
  const correctness = noulValue(response, 'correctness');
  const tests = noulValue(response, 'tests');
  const severity = scoreValue(response, 'severity');
  const recommendation = choiceValue(response, 'recommendation');
  const findings: Finding[] = [];

  if (security !== undefined && security >= THRESHOLDS.security) {
    findings.push({
      dimension: 'security',
      value: security,
      threshold: THRESHOLDS.security,
      message: `Risco de segurança (${pct(security)})`,
    });
  }
  if (correctness !== undefined && correctness >= THRESHOLDS.correctness) {
    findings.push({
      dimension: 'correctness',
      value: correctness,
      threshold: THRESHOLDS.correctness,
      message: `Risco de correção (${pct(correctness)})`,
    });
  }
  if (tests !== undefined && tests >= THRESHOLDS.tests) {
    findings.push({
      dimension: 'tests',
      value: tests,
      threshold: THRESHOLDS.tests,
      message: `Possível lacuna de teste (${pct(tests)})`,
    });
  }
  if (severity !== undefined && severity >= THRESHOLDS.severity) {
    findings.push({
      dimension: 'severity',
      value: severity,
      threshold: THRESHOLDS.severity,
      message: `Severidade ${severity.toFixed(2)}/4`,
    });
  }
  if (recommendation === 'block' || recommendation === 'comment') {
    findings.push({
      dimension: 'recommendation',
      value: recommendation,
      threshold: 'comment',
      message: recommendation === 'block' ? 'Recomendação de bloqueio' : 'Recomendação de ajuste',
    });
  }

  let verdict: ReviewSummary['verdict'];
  if (recommendation === 'block' || recommendation === 'comment') {
    verdict = recommendation;
  } else if (
    (severity !== undefined && severity >= THRESHOLDS.severity) ||
    (security !== undefined && security >= THRESHOLDS.security)
  ) {
    verdict = 'block';
  } else {
    verdict = 'approve';
  }

  return {
    verdict,
    severity,
    severityLabel: severityLabelFor(severity),
    findings,
    hasFindings: findings.length > 0,
    critical: (security ?? 0) >= 0.9 || (severity ?? 0) >= 4 || recommendation === 'block',
  };
}

const RECOMMENDATION_RANK: Record<string, number> = {
  approve: 0,
  comment: 1,
  block: 2,
};

function sumUsage(usages: Array<JevUsage | undefined>): JevUsage | undefined {
  const present = usages.filter((usage): usage is JevUsage => usage !== undefined);
  if (present.length === 0) return undefined;

  const total: JevUsage = {};
  for (const key of ['input_tokens', 'output_tokens', 'cost'] as const) {
    const values = present
      .map((usage) => usage[key])
      .filter((value): value is number => typeof value === 'number');
    if (values.length > 0) {
      total[key] = values.reduce((sum, value) => sum + value, 0);
    }
  }
  return Object.keys(total).length > 0 ? total : undefined;
}

export function combineResponses(responses: JevResponse[]): JevResponse {
  if (responses.length === 0) return { model: 'desconhecido', answers: {} };

  const models = [...new Set(responses.map((response) => response.model))];
  const answers: Record<string, JevAnswer> = {};

  for (const id of ['security', 'correctness', 'tests']) {
    const values = responses
      .map((response) => noulValue(response, id))
      .filter((value): value is number => value !== undefined);
    if (values.length > 0) {
      answers[id] = { type: 'noul', noul: Math.max(...values) };
    }
  }

  const severities = responses
    .map((response) => scoreValue(response, 'severity'))
    .filter((value): value is number => value !== undefined);
  if (severities.length > 0) {
    answers.severity = { type: 'score', score: Math.max(...severities) };
  }

  const recommendations = responses
    .map((response) => choiceValue(response, 'recommendation'))
    .filter((value): value is string => value !== undefined);
  if (recommendations.length > 0) {
    const worst = recommendations.reduce((left, right) =>
      (RECOMMENDATION_RANK[right] ?? 0) > (RECOMMENDATION_RANK[left] ?? 0) ? right : left,
    );
    answers.recommendation = { type: 'choice', choice: worst };
  }

  return {
    model: models.length === 1 ? models[0] : 'misto',
    answers,
    usage: sumUsage(responses.map((response) => response.usage)),
  };
}

export function escapeTableCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function formatNoul(response: JevResponse, id: string): string {
  const value = noulValue(response, id);
  return value === undefined ? '—' : pct(value);
}

function formatScore(response: JevResponse, id: string): string {
  const value = scoreValue(response, id);
  return value === undefined ? '—' : `${value.toFixed(2)}/4`;
}

function formatChoice(response: JevResponse, id: string): string {
  return choiceValue(response, id) ?? '—';
}

function formatFiles(files: string[]): string {
  const shown = files.slice(0, 4).map(escapeTableCell);
  if (files.length > shown.length) shown.push(`(+${files.length - shown.length})`);
  return shown.length > 0 ? shown.join(', ') : '—';
}

export function formatMarkdown(aggregate: AggregateReview): string {
  const { response, summary, plan, chunks } = aggregate;
  const severity =
    summary.severity === undefined
      ? '—'
      : `${summary.severity.toFixed(2)}/4 (${summary.severityLabel})`;
  const lines = [
    '## Jev review — advisory',
    '',
    `**Veredito:** \`${summary.verdict}\` · **Severidade:** ${severity} · **Modelo:** \`${response.model}\``,
    '',
    '| Dimensão | Resultado | Leitura |',
    '|---|---|---|',
    `| Segurança | ${formatNoul(response, 'security')} | ${
      summary.findings.some((finding) => finding.dimension === 'security') ? 'atenção' : 'ok'
    } |`,
    `| Correção | ${formatNoul(response, 'correctness')} | ${
      summary.findings.some((finding) => finding.dimension === 'correctness') ? 'atenção' : 'ok'
    } |`,
    `| Testes | ${formatNoul(response, 'tests')} | ${
      summary.findings.some((finding) => finding.dimension === 'tests') ? 'atenção' : 'ok'
    } |`,
    `| Severidade | ${formatScore(response, 'severity')} | ${summary.severityLabel} |`,
    `| Recomendação | ${formatChoice(response, 'recommendation')} | — |`,
    '',
    `**Blocos:** ${plan.chunks.length} · **Arquivos revisados:** ${plan.files.length} · **Omitidos:** ${plan.omitted} (docs ${plan.omittedDocs}, sensíveis ${plan.omittedSensitive}) · **Arquivos divididos:** ${plan.splitFiles}`,
  ];

  if (summary.findings.length > 0) {
    lines.push('', '**Achados:**');
    for (const finding of summary.findings) {
      lines.push(`- ${escapeTableCell(finding.message)}`);
    }
  } else {
    lines.push('', '**Nenhum risco relevante** pelas perguntas atuais.');
  }

  if (chunks.length > 1) {
    lines.push(
      '',
      '<details>',
      `<summary>Blocos revisados (${chunks.length})</summary>`,
      '',
      '| Bloco | Arquivos | Veredito | Severidade | Achados |',
      '|---|---|---|---|---|',
    );
    for (const chunk of chunks) {
      const chunkSeverity =
        chunk.summary.severity === undefined ? '—' : `${chunk.summary.severity.toFixed(2)}/4`;
      lines.push(
        `| ${chunk.index} | ${formatFiles(chunk.files)} | ${chunk.summary.verdict} | ${chunkSeverity} | ${chunk.summary.findings.length > 0 ? chunk.summary.findings.length : '—'} |`,
      );
    }
    lines.push('', '</details>');
  }

  if (response.usage) {
    const input = response.usage.input_tokens ?? '?';
    const output = response.usage.output_tokens ?? '?';
    const cost = response.usage.cost === undefined ? '' : ` · custo ${response.usage.cost}`;
    lines.push('', `**Uso:** ${input} input / ${output} output tokens${cost}`);
  }
  lines.push('', '> Sinal probabilístico do Jev; não substitui testes, lint ou revisão humana.');
  return lines.join('\n');
}

export function formatJson(aggregate: AggregateReview): string {
  const { response, summary, plan, chunks } = aggregate;
  return JSON.stringify(
    {
      model: response.model,
      verdict: summary.verdict,
      severity: summary.severity ?? null,
      severityLabel: summary.severityLabel,
      critical: summary.critical,
      findings: summary.findings,
      answers: response.answers,
      usage: response.usage ?? null,
      chunks: chunks.map((chunk) => ({
        index: chunk.index,
        files: chunk.files,
        verdict: chunk.summary.verdict,
        severity: chunk.summary.severity ?? null,
        findings: chunk.summary.findings,
        usage: chunk.response.usage ?? null,
      })),
      diff: {
        files: plan.files,
        omitted: plan.omitted,
        omittedDocs: plan.omittedDocs,
        omittedSensitive: plan.omittedSensitive,
        splitFiles: plan.splitFiles,
        chunks: plan.chunks.length,
      },
    },
    null,
    2,
  );
}

export function getGitDiff(
  options: { repo: string; base: string; head: string; workingTree?: boolean },
  execFile: ExecFileLike = defaultExecFile,
): string {
  const revision = options.workingTree ? options.base : `${options.base}...${options.head}`;
  try {
    return execFile('git', ['-C', options.repo, 'diff', '--no-ext-diff', '--unified=3', revision], {
      cwd: options.repo,
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
  } catch (error) {
    throw new CliError(`git diff falhou (${revision}): ${errorMessage(error)}`);
  }
}

function readDiff(options: CliOptions, cwd: string, deps: MainDeps): string {
  if (options.diffFile) {
    const file = path.resolve(cwd, options.diffFile);
    try {
      return (deps.readFile ?? defaultReadFile)(file);
    } catch (error) {
      throw new CliError(`não foi possível ler ${options.diffFile}: ${errorMessage(error)}`);
    }
  }
  return getGitDiff(
    {
      repo: path.resolve(cwd, options.repo),
      base: options.base,
      head: options.head,
      workingTree: options.workingTree,
    },
    deps.execFile,
  );
}

interface ReviewContext {
  options: CliOptions;
  apiKey: string;
  questions: Record<string, JevQuestion>;
  deps: MainDeps;
  stderr: (text: string) => void;
}

const MAX_SPLIT_DEPTH = 4;

function splitChunkForRetry(chunk: DiffChunk): [DiffChunk, DiffChunk] | undefined {
  const { text, files } = chunk;
  if (text.length < 2) return undefined;

  const middle = Math.floor(text.length / 2);
  let cut = text.indexOf('\n', middle);
  if (cut === -1) cut = text.lastIndexOf('\n');
  if (cut > 0 && cut < text.length - 1) {
    return [
      { text: text.slice(0, cut + 1), files },
      { text: text.slice(cut + 1), files },
    ];
  }
  if (middle > 0 && middle < text.length) {
    return [
      { text: text.slice(0, middle), files },
      { text: text.slice(middle), files },
    ];
  }
  return undefined;
}

async function reviewChunkWithRetry(
  chunk: DiffChunk,
  context: ReviewContext,
  depth = 0,
): Promise<JevResponse> {
  try {
    return await callJev({
      endpoint: context.options.endpoint,
      apiKey: context.apiKey,
      model: context.options.model,
      state: buildState({ text: chunk.text, files: chunk.files, omitted: 0, truncated: false }),
      questions: context.questions,
      fetchImpl: context.deps.fetchImpl,
      timeoutMs: context.options.timeoutMs,
    });
  } catch (error) {
    if (!isMaxTokensError(error) || depth >= MAX_SPLIT_DEPTH) throw error;
    const halves = splitChunkForRetry(chunk);
    if (!halves) throw error;

    context.stderr(`[jev] bloco de ${chunk.text.length} chars excedeu o limite; dividindo em 2.\n`);
    const [left, right] = halves;
    const first = await reviewChunkWithRetry(left, context, depth + 1);
    const second = await reviewChunkWithRetry(right, context, depth + 1);
    return combineResponses([first, second]);
  }
}

export async function main(argv: string[], deps: MainDeps = {}): Promise<number> {
  const cwd = deps.cwd ?? process.cwd();
  const env = deps.env ?? process.env;
  const stdout = deps.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr = deps.stderr ?? ((text: string) => process.stderr.write(text));

  let options: CliOptions;
  try {
    options = parseArgs(argv);
  } catch (error) {
    stderr(`ERRO: ${errorMessage(error)}\n`);
    return 2;
  }

  if (options.help) {
    stdout(USAGE);
    return 0;
  }

  const repo = path.resolve(cwd, options.repo);
  const key = loadApiKey({
    env,
    envFile: path.join(repo, '.env'),
    readFile: deps.readFile,
  });
  if (!key) {
    stderr('SKIP: OPENCODE_API_KEY não definida (ambiente ou .env).\n');
    return options.requireKey ? 2 : 0;
  }

  let diff: string;
  try {
    diff = readDiff(options, cwd, deps);
  } catch (error) {
    stderr(`ERRO: ${errorMessage(error)}\n`);
    return 2;
  }

  if (!diff.trim()) {
    stdout('Nada para revisar (diff vazio).\n');
    return 0;
  }

  const plan = planDiffChunks(diff, options.maxDiffChars, options.maxFileChars);
  if (plan.files.length === 0) {
    stdout(`Nenhum arquivo relevante após o filtro (${plan.omitted} omitido(s)).\n`);
    return 0;
  }

  const questions = buildQuestions();

  if (options.dryRun) {
    stdout(
      `${JSON.stringify(
        {
          endpoint: options.endpoint,
          model: options.model,
          diff: {
            files: plan.files,
            omitted: plan.omitted,
            omittedDocs: plan.omittedDocs,
            omittedSensitive: plan.omittedSensitive,
            splitFiles: plan.splitFiles,
            chunks: plan.chunks.length,
          },
          chunks: plan.chunks.map((chunk, index) => ({
            index: index + 1,
            files: chunk.files,
            chars: chunk.text.length,
            state: buildState({
              text: chunk.text,
              files: chunk.files,
              omitted: 0,
              truncated: false,
            }),
          })),
          questions,
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  }

  const write = (file: string, data: string): void => {
    (deps.writeFile ?? defaultWriteFile)(path.resolve(cwd, file), data);
  };
  const context: ReviewContext = { options, apiKey: key, questions, deps, stderr };
  const chunks: ChunkReview[] = [];

  try {
    for (let index = 0; index < plan.chunks.length; index++) {
      const chunk = plan.chunks[index];
      if (plan.chunks.length > 1) {
        stderr(
          `[jev] bloco ${index + 1}/${plan.chunks.length}: ${chunk.files.length} arquivo(s)\n`,
        );
      }
      const response = await reviewChunkWithRetry(chunk, context);
      chunks.push({
        index: index + 1,
        files: chunk.files,
        response,
        summary: summarize(response),
      });
    }
  } catch (error) {
    const message = `ERRO: ${errorMessage(error)}\n`;
    stderr(message);
    if (options.output) {
      try {
        write(options.output, `# Jev review — erro\n\n\`\`\`\n${message}\`\`\`\n`);
      } catch {
        // O erro original da API já foi reportado; não sobrescreve a causa.
      }
    }
    if (options.jsonOutput) {
      try {
        write(options.jsonOutput, `${JSON.stringify({ error: message.trim() }, null, 2)}\n`);
      } catch {
        // Idem: preserva a causa original.
      }
    }
    return 1;
  }

  const response = combineResponses(chunks.map((chunk) => chunk.response));
  const summary = summarize(response);
  const aggregate: AggregateReview = { response, summary, plan, chunks };
  const markdown = formatMarkdown(aggregate);
  const json = formatJson(aggregate);
  const selected = options.format === 'json' ? json : markdown;

  let wrote = false;
  if (options.output) {
    try {
      write(options.output, `${selected}\n`);
    } catch (error) {
      stderr(`ERRO: não foi possível escrever ${options.output}: ${errorMessage(error)}\n`);
      return 2;
    }
    wrote = true;
  }
  if (options.jsonOutput) {
    try {
      write(options.jsonOutput, `${json}\n`);
    } catch (error) {
      stderr(`ERRO: não foi possível escrever ${options.jsonOutput}: ${errorMessage(error)}\n`);
      return 2;
    }
    wrote = true;
  }
  if (!wrote) stdout(`${selected}\n`);

  return options.failOnFindings && summary.hasFindings ? 1 : 0;
}
