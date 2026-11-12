/** Constantes e tipos serializáveis do snapshot do último run (PRD-56/PRD-139). */
import type { TestStatus } from '../junit';

export interface TestLineResult {
  status: TestStatus;
  message?: string;
  durationMs?: number;
  ts?: number;
}

export interface PersistedResult {
  status: TestStatus;
  message?: string;
  durationMs?: number;
  ts: number;
}

export interface PersistedRun {
  v: 1;
  ts: number;
  items: Record<string, PersistedResult>;
}

export const PERSIST_KEY = 'utplsql.lastRunSnapshot';
export const PERSIST_MESSAGE_LIMIT = 500;
export const PERSIST_MAX_ENTRIES = 2000;
export const PERSIST_MAX_AGE_DAYS = 7;

export function truncateMessage(message: string, limit = PERSIST_MESSAGE_LIMIT): string {
  return message.length <= limit ? message : `${message.slice(0, limit)}…`;
}
