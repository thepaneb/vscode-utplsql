import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_ENDPOINT = 'https://opencode.ai/inference/systemone/v1/systemone';
export const DEFAULT_MODEL = 'jev-1.13-free';
export const DEFAULT_MAX_DIFF_CHARS = 40_000;
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
  --max-diff-chars <n>    Limite total do diff (default: ${DEFAULT_MAX_DIFF_CHARS})
  --max-file-chars <n>    Limite por arquivo (default: 20000)
  --timeout-ms <n>        Timeout da chamada (default: 60000)
  --format <json|markdown>
  --output <path>         Escreve o relatório em arquivo
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

function truncateText(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: `${text.slice(0, Math.max(0, max))}\n... [truncado]\n`, truncated: true };
}

export function filterDiff(
  diff: string,
  maxDiffChars = DEFAULT_MAX_DIFF_CHARS,
  maxFileChars = 20_000,
): FilteredDiff {
  const blocks = splitDiff(diff);
  let text = '';
  const files: string[] = [];
  let omitted = 0;
  let truncated = false;

  for (let index = 0; index < blocks.length; index++) {
    const block = blocks[index];
    if (!block.path || isSensitivePath(block.path) || isBinaryDiff(block.text)) {
      omitted++;
      continue;
    }
    const redacted = redactSecrets(block.text);
    const perFile = truncateText(redacted, maxFileChars);
    if (perFile.truncated) truncated = true;

    const remaining = maxDiffChars - text.length;
    if (remaining <= 0) {
      omitted += blocks.length - index;
      break;
    }
    if (perFile.text.length > remaining) {
      text += `${perFile.text.slice(0, remaining)}\n... [diff truncado]\n`;
      files.push(block.path);
      truncated = true;
      omitted += blocks.length - index - 1;
      break;
    }
    text += perFile.text;
    files.push(block.path);
  }

  return { text, files, omitted, truncated };
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

function tableCell(value: string): string {
  return value.replace(/\|/g, '\\|');
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

export function formatMarkdown(
  response: JevResponse,
  summary: ReviewSummary,
  filtered: FilteredDiff,
): string {
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
  ];

  if (summary.findings.length > 0) {
    lines.push('', '**Achados:**');
    for (const finding of summary.findings) {
      lines.push(`- ${tableCell(finding.message)}`);
    }
  } else {
    lines.push('', '**Nenhum risco relevante** pelas perguntas atuais.');
  }

  lines.push(
    '',
    `**Arquivos revisados:** ${filtered.files.length} · **Omitidos:** ${filtered.omitted} · **Truncado:** ${
      filtered.truncated ? 'sim' : 'não'
    }`,
  );
  if (response.usage) {
    const input = response.usage.input_tokens ?? '?';
    const output = response.usage.output_tokens ?? '?';
    const cost = response.usage.cost === undefined ? '' : ` · custo ${response.usage.cost}`;
    lines.push(`**Uso:** ${input} input / ${output} output tokens${cost}`);
  }
  lines.push('', '> Sinal probabilístico do Jev; não substitui testes, lint ou revisão humana.');
  return lines.join('\n');
}

export function formatJson(
  response: JevResponse,
  summary: ReviewSummary,
  filtered: FilteredDiff,
): string {
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
      diff: {
        files: filtered.files,
        omitted: filtered.omitted,
        truncated: filtered.truncated,
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

  let filtered = filterDiff(diff, options.maxDiffChars, options.maxFileChars);
  if (filtered.files.length === 0) {
    stdout(`Nenhum arquivo relevante após o filtro (${filtered.omitted} omitido(s)).\n`);
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
            files: filtered.files,
            omitted: filtered.omitted,
            truncated: filtered.truncated,
          },
          state: buildState(filtered),
          questions,
        },
        null,
        2,
      )}\n`,
    );
    return 0;
  }

  let response: JevResponse | undefined;
  let reviewError: unknown = new Error('falha desconhecida');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await callJev({
        endpoint: options.endpoint,
        apiKey: key,
        model: options.model,
        state: buildState(filtered),
        questions,
        fetchImpl: deps.fetchImpl,
        timeoutMs: options.timeoutMs,
      });
      break;
    } catch (error) {
      reviewError = error;
      if (!isMaxTokensError(error) || attempt === 2) break;
      const nextMax = Math.max(10_000, Math.floor(filtered.text.length / 2));
      filtered = filterDiff(diff, nextMax, options.maxFileChars);
    }
  }

  if (!response) {
    const message = `ERRO: ${errorMessage(reviewError)}\n`;
    stderr(message);
    if (options.output) {
      try {
        (deps.writeFile ?? defaultWriteFile)(
          path.resolve(cwd, options.output),
          `# Jev review — erro\n\n\`\`\`\n${message}\`\`\`\n`,
        );
      } catch {
        // O erro original da API já foi reportado; não sobrescreve a causa.
      }
    }
    return 1;
  }

  const summary = summarize(response);
  const output =
    options.format === 'json'
      ? formatJson(response, summary, filtered)
      : formatMarkdown(response, summary, filtered);

  if (options.output) {
    try {
      (deps.writeFile ?? defaultWriteFile)(path.resolve(cwd, options.output), `${output}\n`);
    } catch (error) {
      stderr(`ERRO: não foi possível escrever ${options.output}: ${errorMessage(error)}\n`);
      return 2;
    }
  } else {
    stdout(`${output}\n`);
  }

  return options.failOnFindings && summary.hasFindings ? 1 : 0;
}
