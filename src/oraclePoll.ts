// Poll do buffer de saída do utPLSQL (PRD-111).
//
// Extraído de `executeRunOracle` para ser testável com uma conexão fake. O
// roteamento por `output_id`/CDATA e o `run.appendOutput` ficam no callback
// `onText` do orquestrador.
import { setTimeout as delay } from 'node:timers/promises';

export interface PollConnection {
  execute(sql: string, binds?: Record<string, unknown>): Promise<{ rows?: unknown[] | null }>;
}

export interface PollOptions {
  conn: PollConnection;
  /** Prefixo já sanitizado (`UT3.` em shared install). */
  utSchema: string;
  /** Resolve `true` quando o `ut_runner.run` terminou ou o run foi cancelado. */
  done: Promise<boolean>;
  /** Recebe o texto e o `OUTPUT_ID` bruto de cada linha. */
  onText: (text: string, outputId: unknown) => void;
  onError?: (error: unknown) => void;
  intervalMs?: number;
}

/** Consome `UT_OUTPUT_BUFFER_TMP` a cada `intervalMs` até `done`. */
export async function pollOutputStream(options: PollOptions): Promise<void> {
  const interval = options.intervalMs ?? 200;
  let lastMsgId = 0;

  while (true) {
    const done = await Promise.race([options.done, delay(interval, false)]);

    try {
      const rows = await options.conn.execute(
        `SELECT output_id, message_id, text, is_finished FROM ${options.utSchema}UT_OUTPUT_BUFFER_TMP WHERE message_id > :last ORDER BY message_id`,
        { last: lastMsgId },
      );

      for (const row of rows.rows ?? []) {
        const r = row as unknown as {
          OUTPUT_ID?: unknown;
          MESSAGE_ID: number;
          TEXT: string | null;
        };
        lastMsgId = r.MESSAGE_ID;
        if (!r.TEXT) continue;
        options.onText(r.TEXT, r.OUTPUT_ID);
      }
    } catch (error) {
      options.onError?.(error);
    }

    if (done) break;
  }
}
