import { Plugin } from "@opencode/plugin";

/**
 * Redige valores "de máquina" de prompts do usuário antes de irem ao modelo:
 * JWTs, hashes bcrypt, blobs base64 longos e strings entre aspas muito longas.
 * Porte V2 do `opencode-log-sanitizer` (que é API V1 e não roda no OpenCode V2).
 *
 * Opções (objeto `plugins` do `opencode.json`):
 *   { "package": "./.opencode/plugins/log-sanitizer", "options": { "maxStringLength": 300 } }
 * `maxStringLength: 0` desabilita a redação de strings longas.
 */

const JWT = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
const BCRYPT = /\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}/g;
const BASE64 = /\b[A-Za-z0-9+/]{200,}={0,2}\b/g;

export interface SanitizeOptions {
  maxStringLength: number;
}

/** Aplica as redações; devolve o texto e o total de substituições. Puro. */
export function sanitize(text: string, opts: SanitizeOptions): { text: string; count: number } {
  let count = 0;
  let out = text;

  out = out.replace(JWT, () => {
    count++;
    return "[redacted:jwt]";
  });
  out = out.replace(BCRYPT, () => {
    count++;
    return "[redacted:bcrypt]";
  });
  out = out.replace(BASE64, () => {
    count++;
    return "[redacted:base64]";
  });

  if (opts.maxStringLength > 0) {
    const min = opts.maxStringLength;
    const re = new RegExp(`(["'])((?:[^\\n]){${min},})\\1`, "g");
    out = out.replace(re, (match, _quote: string, body: string) => {
      if (body.length < min) return match;
      count++;
      return `"[redacted:long-string ${body.length} chars]"`;
    });
  }

  return { text: out, count };
}

export default Plugin.define({
  id: "log-sanitizer",
  setup(ctx) {
    const raw = (ctx.options as { maxStringLength?: unknown }).maxStringLength;
    const maxStringLength = typeof raw === "number" ? raw : 300;

    ctx.session.hook("prompt", (event) => {
      const original = event.prompt.text;
      if (!original) return;
      const { text, count } = sanitize(original, { maxStringLength });
      if (count > 0) event.prompt.text = text;
    });
  },
});
