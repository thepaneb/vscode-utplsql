// Escrita do relatório JSONL do harness de performance (PRD-106).
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PerfSample } from '../../../perf';

export const PERF_REPORT_REL = path.join('test-results', 'perf-report.jsonl');

export function perfReportPath(root = process.cwd()): string {
  return path.join(root, PERF_REPORT_REL);
}

/** Grava uma amostra como JSONL, criando o diretório se necessário. */
export function appendPerfSample(sample: PerfSample, file = perfReportPath()): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(sample)}\n`, 'utf8');
}

/** Lê as amostras gravadas (para asserções do harness). */
export function readPerfSamples(file = perfReportPath()): PerfSample[] {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as PerfSample);
}
