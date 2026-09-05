// Cliente DBMS_DEBUG sobre uma conexão genérica (oracledb). PURO na geração
// de SQL + parse de resultados — testável com conexão fake.
//
// Validação de integração com Oracle real (grants + DBMS_DEBUG) fica para a
// suíte de integração (describeDB).

export interface DebugConnection {
  execute(
    sql: string,
    binds?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<{ rows?: unknown[]; outBinds?: Record<string, unknown> }>;
  close(): Promise<void>;
}

export interface BreakpointTarget {
  owner: string; // schema dono do objeto
  unit: string; // package ou nome do objeto
  line: number; // 1-based
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

/** Deriva o alvo do breakpoint a partir do caminho do arquivo (.pks/.pkb/.sql). */
export function parseBreakpointTarget(filePath: string, schema: string): BreakpointTarget {
  const base = filePath.split(/[\\/]/).pop() ?? 'anonymous';
  const unit = base.replace(/\.(pks|pkb|sql|pkg|fnc|prc|trg)$/i, '');
  return { owner: schema.toUpperCase(), unit, line: 0 };
}

const NO_BREAK = 1;
const BREAK = 2;
const ATTACHING = 3;
const KILLED = 4;
const EXITING = 5;

export const PROCEED_CODES: Record<string, number> = {
  noBreak: NO_BREAK,
  break: BREAK,
  attaching: ATTACHING,
  killed: KILLED,
  exiting: EXITING,
};

export function parseProceedStatus(value: unknown): string {
  const v = Number(value);
  if (v === BREAK) return 'break';
  if (v === NO_BREAK) return 'no_break';
  if (v === ATTACHING) return 'attaching';
  if (v === KILLED) return 'killed';
  if (v === EXITING) return 'exiting';
  return 'unknown';
}

/**
 * Cliente do DBMS_DEBUG: monta os blocos PL/SQL e interpreta os retornos.
 * A sessão "debuggee" (roda o teste) e a sessão "debugger" (controla) são
 * conexões Oracle separadas.
 */
export class DbmsDebugClient {
  constructor(private conn: DebugConnection) {}

  /** Debuggee: ativa a depuração da sessão e retorna o session id. */
  async debugOn(): Promise<string> {
    const result = await this.conn.execute(
      `DECLARE
         v_session VARCHAR2(100);
       BEGIN
         v_session := DBMS_DEBUG.DEBUG_ON();
         :session := v_session;
       END;`,
      { session: { dir: 1 } as never },
      { outFormat: 4002 } as never,
    );
    return String((result.outBinds as Record<string, unknown>).session ?? '');
  }

  /** Debugger: anexa à sessão do debuggee e aguarda o primeiro evento. */
  async attachSession(sessionId: string, timeoutSeconds: number): Promise<boolean> {
    try {
      await this.conn.execute(
        `BEGIN
           DBMS_DEBUG.ATTACH_SESSION(session_id => :id, timeout => :t);
         END;`,
        { id: sessionId, t: timeoutSeconds },
        { autoCommit: false },
      );
      return true;
    } catch {
      return false;
    }
  }

  async detachSession(): Promise<void> {
    await this.conn.execute(`BEGIN DBMS_DEBUG.DETACH_SESSION; END;`, {});
  }

  async debugOff(): Promise<void> {
    await this.conn.execute(`BEGIN DBMS_DEBUG.DEBUG_OFF; END;`, {});
  }

  /** Define um breakpoint; retorna o id do breakpoint. */
  async setBreakpoint(target: BreakpointTarget): Promise<number> {
    const result = await this.conn.execute(
      `DECLARE
         v_brkpt DBMS_DEBUG.breakpointid;
       BEGIN
         DBMS_DEBUG.SET_BREAKPOINT(
           program  => :owner || '.' || :unit,
           line     => :line,
           breakpoint_id => v_brkpt
         );
         :brkpt := v_brkpt;
       END;`,
      { owner: target.owner, unit: target.unit, line: target.line, brkpt: { dir: 1 } as never },
      { outFormat: 4002 } as never,
    );
    return Number((result.outBinds as Record<string, unknown>).brkpt ?? -1);
  }

  async deleteBreakpoint(breakpointId: number): Promise<void> {
    await this.conn.execute(`BEGIN DBMS_DEBUG.DELETE_BREAKPOINT(:id); END;`, { id: breakpointId });
  }

  /** Sincroniza e aguarda o debuggee chegar em um evento (breakpoint/fim). */
  async synchronize(): Promise<string> {
    const result = await this.conn.execute(
      `DECLARE
         v_status BINARY_INTEGER;
       BEGIN
         DBMS_DEBUG.SYNCHRONIZE(v_status);
         :status := v_status;
       END;`,
      { status: { dir: 1 } as never },
      { outFormat: 4002 } as never,
    );
    return parseProceedStatus((result.outBinds as Record<string, unknown>).status);
  }

  async continueRun(): Promise<string> {
    const result = await this.conn.execute(
      `DECLARE
         v_status BINARY_INTEGER;
       BEGIN
         DBMS_DEBUG.CONTINUE(v_status);
         :status := v_status;
       END;`,
      { status: { dir: 1 } as never },
      { outFormat: 4002 } as never,
    );
    return parseProceedStatus((result.outBinds as Record<string, unknown>).status);
  }

  async stepInto(): Promise<string> {
    const result = await this.conn.execute(
      `DECLARE
         v_status BINARY_INTEGER;
       BEGIN
         DBMS_DEBUG.STEP_INTO(v_status);
         :status := v_status;
       END;`,
      { status: { dir: 1 } as never },
      { outFormat: 4002 } as never,
    );
    return parseProceedStatus((result.outBinds as Record<string, unknown>).status);
  }

  async stepOver(): Promise<string> {
    const result = await this.conn.execute(
      `DECLARE
         v_status BINARY_INTEGER;
       BEGIN
         DBMS_DEBUG.STEP_OVER(v_status);
         :status := v_status;
       END;`,
      { status: { dir: 1 } as never },
      { outFormat: 4002 } as never,
    );
    return parseProceedStatus((result.outBinds as Record<string, unknown>).status);
  }

  async stepOut(): Promise<string> {
    const result = await this.conn.execute(
      `DECLARE
         v_status BINARY_INTEGER;
       BEGIN
         DBMS_DEBUG.STEP_OUT(v_status);
         :status := v_status;
       END;`,
      { status: { dir: 1 } as never },
      { outFormat: 4002 } as never,
    );
    return parseProceedStatus((result.outBinds as Record<string, unknown>).status);
  }

  /** Stack: nome da unidade atual + linha via DBMS_DEBUG runtime info. */
  async getRuntimeFrame(frameId: number): Promise<FrameInfo> {
    const result = await this.conn.execute(
      `DECLARE
         v_info DBMS_DEBUG.runtime_info;
         v_name VARCHAR2(4000);
       BEGIN
         DBMS_DEBUG.GET_RUNTIME_INFO(v_info);
         v_name := v_info.unit_owner || '.' || v_info.unit_name;
         :name := v_name;
         :line := v_info.line#;
       END;`,
      { name: { dir: 1 } as never, line: { dir: 1 } as never },
      { outFormat: 4002 } as never,
    );
    const out = (result.outBinds ?? {}) as Record<string, unknown>;
    return {
      name: String(out.name ?? 'anonymous'),
      line: Number(out.line ?? 1),
      frameId,
    };
  }

  /** Variáveis locais: nome, tipo e valor (string truncada). */
  async getVariables(): Promise<VariableInfo[]> {
    const result = await this.conn.execute(
      `SELECT name, val, type FROM TABLE(DBMS_DEBUG.GET_VALUES(scope => 1))`,
      {},
      { outFormat: 4002 } as never,
    );
    const rows = result.rows ?? [];
    return rows.map((r) => {
      if (Array.isArray(r)) {
        return { name: String(r[0]), value: String(r[1] ?? ''), type: String(r[2] ?? '') };
      }
      const o = r as Record<string, unknown>;
      return { name: String(o.NAME), value: String(o.VAL ?? ''), type: String(o.TYPE) };
    });
  }
}

/** Pré-checagem de grants: true se o usuário consegue ler DBMS_DEBUG. */
export async function checkDebugAccess(conn: DebugConnection): Promise<boolean> {
  try {
    await conn.execute(`SELECT COUNT(*) FROM user_objects WHERE object_name = 'DBMS_DEBUG'`, {});
    return true;
  } catch {
    return false;
  }
}
