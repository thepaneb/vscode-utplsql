// Cliente DBMS_DEBUG sobre uma conexão genérica (oracledb). PURO na geração
// de SQL + parse de resultados — testável com conexão fake.
//
// Referência: Oracle DBMS_DEBUG (assinaturas idênticas em 11.2–26ai):
//   - INITIALIZE() RETURNS VARCHAR2  → debug session id (target session)
//   - DEBUG_ON / DEBUG_OFF            → procedures (target session)
//   - ATTACH_SESSION(debug_session_id, diagnostics)  (debug session)
//   - SET_BREAKPOINT(program_info, line#, breakpoint#, fuzzy)  (debug session)
//   - CONTINUE(run_info IN OUT, breakflags, info_requested)    (debug session)
//   - Não existem STEP_INTO/STEP_OVER/STEP_OUT nem GET_VALUES; stepping é
//     CONTINUE com breakflags e variáveis são lidas via GET_VALUE(name).

import { logger } from './logger';

export interface DebugConnection {
  execute(
    sql: string,
    binds?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<{ rows?: unknown[]; outBinds?: Record<string, unknown> }>;
  break?(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Namespaces do `DBMS_DEBUG` usados em `program_info`. Subprogramas top-level
 * (procedure/function soltos, `.fnc`/`.prc`) vivem em `pkgspec_or_toplevel`,
 * não em `pkg_body` — usar o namespace errado faz o `SET_BREAKPOINT` falhar.
 */
export type DebugNamespace = 'toplevel' | 'pkg_body' | 'trigger';

export interface BreakpointTarget {
  owner: string; // schema dono do objeto
  unit: string; // package ou nome do objeto
  line: number; // 1-based
  /** Namespaces candidatos, em ordem de tentativa. Ausente → apenas `pkg_body`. */
  namespaces?: DebugNamespace[];
  /** Caminho do arquivo local, usado para alinhar a linha ao objeto armazenado. */
  sourcePath?: string;
}

export interface FrameInfo {
  name: string; // qualificador (ex.: PKG.PROC)
  line: number; // 1-based
  frameId: number;
}

export interface VariableInfo {
  name: string;
  value: string;
  type: string;
}

/** Resultado simplificado de uma parada (mapeado de `runtime_info.reason`). */
export type StopReason = 'break' | 'exiting' | 'no_break' | 'unknown';

/** Constantes de bind do driver (injetadas para manter o módulo puro/testável). */
export interface DebugBindCodes {
  BIND_OUT: unknown;
  STRING: unknown;
  NUMBER: unknown;
}

// Fallback apenas para os testes com conexão fake (não validam os binds).
const DEFAULT_CODES: DebugBindCodes = { BIND_OUT: 3003, STRING: 'STRING', NUMBER: 'NUMBER' };

/**
 * Namespaces candidatos para um breakpoint conforme a extensão do arquivo.
 * `.pks`/`.pkb` → package body; `.fnc`/`.prc` → subprograma top-level;
 * `.trg` → trigger; `.sql` (ambíguo) tenta todos.
 */
export function namespacesForExt(ext: string): DebugNamespace[] {
  switch (ext.toLowerCase()) {
    case '.pks':
    case '.pkb':
    case '.pkg':
      return ['pkg_body'];
    case '.fnc':
    case '.prc':
      return ['toplevel'];
    case '.trg':
      return ['trigger'];
    default:
      return ['toplevel', 'pkg_body', 'trigger'];
  }
}

/** Deriva o alvo do breakpoint a partir do caminho do arquivo (.pks/.pkb/.sql). */
export function parseBreakpointTarget(filePath: string, schema: string): BreakpointTarget {
  const base = filePath.split(/[\\/]/).pop() ?? 'anonymous';
  const ext = base.match(/\.[^.]+$/)?.[0] ?? '';
  // DBMS_DEBUG.program_info espera o nome do objeto como está no dicionário
  // (maiúsculas para identificadores não citados).
  const unit = base.replace(/\.(pks|pkb|sql|pkg|fnc|prc|trg)$/i, '').toUpperCase();
  return {
    owner: schema.toUpperCase(),
    unit,
    line: 0,
    namespaces: namespacesForExt(ext),
    sourcePath: filePath,
  };
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Cliente do DBMS_DEBUG: monta os blocos PL/SQL e interpreta os retornos.
 * A sessão "debuggee" (roda o teste) e a sessão "debugger" (controla) são
 * conexões Oracle separadas.
 */
export class DbmsDebugClient {
  /** Último frame observado num CONTINUE/SYNCHRONIZE (usado por getRuntimeFrame). */
  private lastFrame: { name: string; line: number } | undefined;

  constructor(
    private conn: DebugConnection,
    private codes: DebugBindCodes = DEFAULT_CODES,
  ) {}

  /** Debuggee: INITIALIZE + DEBUG_ON; retorna o debug session id. */
  async debugOn(): Promise<string> {
    const result = await this.conn.execute(
      `DECLARE
         v_id VARCHAR2(100);
       BEGIN
         v_id := DBMS_DEBUG.INITIALIZE();
         DBMS_DEBUG.DEBUG_ON();
         :session := v_id;
       END;`,
      { session: { dir: this.codes.BIND_OUT, type: this.codes.STRING, maxSize: 128 } },
    );
    return str(((result.outBinds ?? {}) as Record<string, unknown>).session);
  }

  /** Debugger: anexa à sessão do debuggee (não bloqueia; use continue/synchronize). */
  async attachSession(sessionId: string, _timeoutSeconds?: number): Promise<boolean> {
    try {
      await this.conn.execute(
        `BEGIN DBMS_DEBUG.ATTACH_SESSION(debug_session_id => :id, diagnostics => 0); END;`,
        { id: sessionId },
      );
      return true;
    } catch (e) {
      logger.debug('attachSession falhou', { error: String(e) });
      return false;
    }
  }

  async detachSession(): Promise<void> {
    await this.conn.execute(`BEGIN DBMS_DEBUG.DETACH_SESSION; END;`, {});
  }

  async debugOff(): Promise<void> {
    await this.conn.execute(`BEGIN DBMS_DEBUG.DEBUG_OFF; END;`, {});
  }

  /**
   * Define um breakpoint; retorna o id (>0) ou -1 se não foi criado.
   * Tenta cada namespace candidato do alvo (package body, top-level, trigger),
   * pois `SET_BREAKPOINT` com o namespace errado não encontra o programa.
   */
  async setBreakpoint(target: BreakpointTarget): Promise<number> {
    const candidates =
      target.namespaces && target.namespaces.length > 0 ? target.namespaces : ['pkg_body'];
    for (const ns of candidates) {
      try {
        const result = await this.conn.execute(
          `DECLARE
             v_prog   DBMS_DEBUG.program_info;
             v_brkpt  BINARY_INTEGER;
             v_status BINARY_INTEGER;
           BEGIN
             v_prog.namespace := CASE :ns
               WHEN 'toplevel' THEN DBMS_DEBUG.namespace_pkgspec_or_toplevel
               WHEN 'pkg_body' THEN DBMS_DEBUG.namespace_pkg_body
               WHEN 'trigger'  THEN DBMS_DEBUG.namespace_trigger
               ELSE NULL END;
             v_prog.name  := :unit;
             v_prog.owner := :owner;
             v_prog.line# := :line;
             v_status := DBMS_DEBUG.SET_BREAKPOINT(v_prog, :line, v_brkpt, 1);
             :brkpt  := v_brkpt;
             :status := v_status;
           END;`,
          {
            ns,
            unit: target.unit,
            owner: target.owner,
            line: target.line,
            brkpt: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
            status: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
          },
        );
        const out = (result.outBinds ?? {}) as Record<string, unknown>;
        const id = num(out.brkpt);
        if (id > 0) return id;
      } catch (e) {
        logger.debug('setBreakpoint: namespace falhou', { ns, error: String(e) });
      }
    }
    return -1;
  }

  async deleteBreakpoint(breakpointId: number): Promise<number> {
    const result = await this.conn.execute(
      `BEGIN :status := DBMS_DEBUG.DELETE_BREAKPOINT(:id); END;`,
      { id: breakpointId, status: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER } },
    );
    return num(((result.outBinds ?? {}) as Record<string, unknown>).status);
  }

  /**
   * Continua/step via `CONTINUE` com o breakflag da ação:
   * continue=0, over=break_next_line, into=break_any_call, out=break_any_return.
   */
  private async run(action: 'continue' | 'over' | 'into' | 'out'): Promise<StopReason> {
    const result = await this.conn.execute(
      `DECLARE
         v_run     DBMS_DEBUG.runtime_info;
         v_flags   BINARY_INTEGER;
         v_status  BINARY_INTEGER;
         v_stopped BINARY_INTEGER;
         v_ended   BINARY_INTEGER;
       BEGIN
         v_flags := CASE :action
           WHEN 'over' THEN DBMS_DEBUG.break_next_line
           WHEN 'into' THEN DBMS_DEBUG.break_any_call
           WHEN 'out'  THEN DBMS_DEBUG.break_any_return
           ELSE 0 END;
         v_status := DBMS_DEBUG.CONTINUE(v_run, v_flags, DBMS_DEBUG.info_getLineinfo);
         :status := v_status;
         :line   := v_run.line#;
         :unit   := v_run.program.owner || '.' || v_run.program.name;
         v_stopped := CASE WHEN v_run.reason IN (
             DBMS_DEBUG.reason_breakpoint, DBMS_DEBUG.reason_line,
             DBMS_DEBUG.reason_enter, DBMS_DEBUG.reason_exception,
             DBMS_DEBUG.reason_handler) THEN 1 ELSE 0 END;
         v_ended := CASE WHEN v_run.terminated = 1 OR v_run.reason IN (
             DBMS_DEBUG.reason_exit, DBMS_DEBUG.reason_knl_exit,
             DBMS_DEBUG.reason_abort) THEN 1 ELSE 0 END;
         :stopped := v_stopped;
         :ended   := v_ended;
       END;`,
      {
        action,
        status: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
        line: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
        unit: { dir: this.codes.BIND_OUT, type: this.codes.STRING, maxSize: 200 },
        stopped: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
        ended: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
      },
    );
    const out = (result.outBinds ?? {}) as Record<string, unknown>;
    const line = num(out.line);
    const unit = str(out.unit);
    if (line > 0 && unit) this.lastFrame = { name: unit, line };
    if (num(out.ended) === 1) return 'exiting';
    if (num(out.stopped) === 1) return 'break';
    if (num(out.status) !== 0) return 'unknown';
    return 'no_break';
  }

  /** Aguarda o debuggee sinalizar um evento (SYNCHRONIZE). */
  async synchronize(): Promise<StopReason> {
    try {
      const result = await this.conn.execute(
        `DECLARE
           v_run    DBMS_DEBUG.runtime_info;
           v_status BINARY_INTEGER;
         BEGIN
           v_status := DBMS_DEBUG.SYNCHRONIZE(v_run, DBMS_DEBUG.info_getLineinfo);
           :status := v_status;
           :line   := v_run.line#;
           :unit   := v_run.program.owner || '.' || v_run.program.name;
         END;`,
        {
          status: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
          line: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
          unit: { dir: this.codes.BIND_OUT, type: this.codes.STRING, maxSize: 200 },
        },
      );
      const out = (result.outBinds ?? {}) as Record<string, unknown>;
      const line = num(out.line);
      const unit = str(out.unit);
      if (line > 0 && unit) this.lastFrame = { name: unit, line };
      return num(out.status) === 0 ? 'no_break' : 'unknown';
    } catch (e) {
      logger.debug('synchronize falhou', { error: String(e) });
      return 'unknown';
    }
  }

  continueRun(): Promise<StopReason> {
    return this.run('continue');
  }
  stepInto(): Promise<StopReason> {
    return this.run('into');
  }
  stepOver(): Promise<StopReason> {
    return this.run('over');
  }
  stepOut(): Promise<StopReason> {
    return this.run('out');
  }

  /** Frame atual: usa o último runtime_info visto ou consulta GET_RUNTIME_INFO. */
  async getRuntimeFrame(frameId: number): Promise<FrameInfo> {
    if (this.lastFrame) return { ...this.lastFrame, frameId };
    try {
      const result = await this.conn.execute(
        `DECLARE
           v_run    DBMS_DEBUG.runtime_info;
           v_status BINARY_INTEGER;
         BEGIN
           v_status := DBMS_DEBUG.GET_RUNTIME_INFO(DBMS_DEBUG.info_getLineinfo, v_run);
           :line := v_run.line#;
           :unit := v_run.program.owner || '.' || v_run.program.name;
         END;`,
        {
          line: { dir: this.codes.BIND_OUT, type: this.codes.NUMBER },
          unit: { dir: this.codes.BIND_OUT, type: this.codes.STRING, maxSize: 200 },
        },
      );
      const out = (result.outBinds ?? {}) as Record<string, unknown>;
      return {
        name: str(out.unit) || 'anonymous',
        line: num(out.line) || 1,
        frameId,
      };
    } catch (e) {
      logger.debug('getRuntimeFrame falhou', { error: String(e) });
      return { name: 'anonymous', line: 1, frameId };
    }
  }

  /**
   * Variáveis locais: consulta `GET_VALUE` para cada nome conhecido (não existe
   * `GET_VALUES`). Sem nomes, retorna vazio. O tipo não vem do DBMS_DEBUG.
   */
  async getVariables(names: string[] = []): Promise<VariableInfo[]> {
    const out: VariableInfo[] = [];
    for (const name of names) {
      if (!name) continue;
      try {
        const result = await this.conn.execute(
          `DECLARE
             v_val    VARCHAR2(4000);
             v_status BINARY_INTEGER;
           BEGIN
             v_status := DBMS_DEBUG.GET_VALUE(:name, 0, v_val);
             :value := v_val;
           END;`,
          { name, value: { dir: this.codes.BIND_OUT, type: this.codes.STRING, maxSize: 4000 } },
        );
        const value = str(((result.outBinds ?? {}) as Record<string, unknown>).value);
        out.push({ name, value, type: '' });
      } catch {
        /* variável inexistente/sem debug info: ignora */
      }
    }
    return out;
  }
}

/** Pré-checagem de grants: true se o usuário consegue usar DBMS_DEBUG. */
export async function checkDebugAccess(conn: DebugConnection): Promise<boolean> {
  try {
    const result = await conn.execute(
      `SELECT
         (SELECT COUNT(*) FROM user_tab_privs
           WHERE table_name = 'DBMS_DEBUG' AND privilege = 'EXECUTE') +
         (SELECT COUNT(*) FROM user_sys_privs
           WHERE privilege = 'DEBUG CONNECT SESSION') AS n
       FROM dual`,
      {},
    );
    const row = (result.rows ?? [])[0];
    const n = Array.isArray(row)
      ? Number(row[0])
      : Number((row as Record<string, unknown> | undefined)?.N ?? 0);
    if (n > 0) return true;

    // Roles privilegiadas herdam os grants sem entrada explícita.
    const roles = await conn.execute(
      `SELECT COUNT(*) AS n FROM user_role_privs WHERE granted_role IN ('DBA','PDB_DBA')`,
      {},
    );
    const rrow = (roles.rows ?? [])[0];
    const rn = Array.isArray(rrow)
      ? Number(rrow[0])
      : Number((rrow as Record<string, unknown> | undefined)?.N ?? 0);
    return rn > 0;
  } catch (e) {
    logger.debug('checkDebugAccess: falha ao verificar grants', { error: String(e) });
    return false;
  }
}
