// Inicialização do cliente Oracle (thin/thick). PURO (sem 'vscode').
// O thick mode é opt-in: só inicializa quando `mode === 'thick'`, com `libDir`.

export type OracleClientMode = 'thin' | 'thick';

export interface OracleClientResult {
  thick: boolean;
  error?: string;
}

type OracleClientState = 'unknown' | 'thin' | 'thick' | 'failed';

type InitOracleClientFn = (options: { libDir?: string; configDir?: string }) => void;

let state: OracleClientState = 'unknown';
let lastError: string | undefined;

/** Limpa o estado global entre testes. */
export function resetOracleClientStateForTests(): void {
  state = 'unknown';
  lastError = undefined;
}

/** Modo efetivo do processo, ou 'unknown' se ainda não inicializado. */
export function getOracleClientMode(): 'thin' | 'thick' | 'unknown' {
  return state === 'thin' || state === 'thick' ? state : 'unknown';
}

/**
 * Garante a inicialização do node-oracledb no modo configurado.
 * Idempotente: a primeira chamada fixa o modo do processo; chamadas seguintes
 * apenas devolvem o estado cacheado. Nunca lança.
 */
export function ensureOracleClient(
  oracledb: typeof import('oracledb'),
  mode: OracleClientMode | undefined,
  libDir: string,
  configDir: string,
): OracleClientResult {
  if (state === 'thick') return { thick: true };
  if (state === 'thin') return { thick: false };
  if (state === 'failed') return { thick: false, error: lastError };

  if (mode !== 'thick') {
    state = 'thin';
    return { thick: false };
  }

  const dir = (libDir ?? '').trim();
  if (!dir) {
    state = 'failed';
    lastError = 'utplsql.oracleClientMode = thick, but utplsql.oracleClientLibDir is empty.';
    return { thick: false, error: lastError };
  }

  const init = (oracledb as { initOracleClient?: InitOracleClientFn }).initOracleClient;
  if (typeof init !== 'function') {
    state = 'failed';
    lastError = 'oracledb.initOracleClient is not available in this build.';
    return { thick: false, error: lastError };
  }

  try {
    const options: { libDir?: string; configDir?: string } = { libDir: dir };
    const cfgDir = (configDir ?? '').trim();
    if (cfgDir) options.configDir = cfgDir;
    init.call(oracledb, options);
    state = 'thick';
    lastError = undefined;
    return { thick: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('NJS-090')) {
      state = 'thick';
      lastError = undefined;
      return { thick: true };
    }
    state = 'failed';
    lastError = msg;
    return { thick: false, error: msg };
  }
}
