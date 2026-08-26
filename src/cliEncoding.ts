import * as iconv from 'iconv-lite';

// Decodificação da saída do CLI. PURO (sem 'vscode'), testável por unidade.
//
// No Windows, processos filhos não emitem UTF-8:
//  - cmd.exe grava suas mensagens no codepage OEM (CP850 no Windows pt-BR);
//  - Java antigo (JDK < 18) grava no codepage ANSI (CP1252 no Windows ocidental).
// UTF-8 é tentado primeiro (Linux/macOS, JDK 18+, ASCII puro passa direto).
//
// Decodificar texto CP850 como CP1252 produz caracteres raros (‚ † ‡ NBSP Æ etc.),
// usados como sinal de que o codepage correto é o OEM.

/** Codepages do sistema Windows: ACP = ANSI (ex.: 1252), OEMCP = OEM (ex.: 850). */
export interface WindowsCodepages {
  acp: number;
  oemcp: number;
}

export const DEFAULT_WINDOWS_CODEPAGES: WindowsCodepages = { acp: 1252, oemcp: 850 };

/**
 * Caracteres que "vazam" ao decodificar CP850 como CP1252 (ou aparecem como
 * controles C1). Texto legítimo em CP1252 praticamente nunca os contém.
 */
const RE_SUSPICIOUS =
  /[\u0080-\u009f\u00a0-\u00a5\u00c6\u00e6\u00de\u00fe\u00dd\u00fd\u0152\u0160\u017d\u0192\u02c6\u201a\u201e\u2020\u2021\u2026\u2030\u2039]/;

export function isUtf8(buf: Buffer): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

export function decodeWindows(buf: Buffer, cps: WindowsCodepages): string {
  const ansi = iconv.decode(buf, `cp${cps.acp}`);
  if (RE_SUSPICIOUS.test(ansi)) {
    return iconv.decode(buf, `cp${cps.oemcp}`);
  }
  return ansi;
}

export function decodeCliBuffer(buf: Buffer, cps?: WindowsCodepages): string {
  if (isUtf8(buf)) {
    return buf.toString('utf8');
  }
  if (cps) {
    return decodeWindows(buf, cps);
  }
  return new TextDecoder('windows-1252').decode(buf);
}

/** Extrai o valor de ACP/OEMCP da saída de `reg.exe query ...\Nls\CodePage`. */
export function parseRegCodePage(output: string, name: 'ACP' | 'OEMCP'): number | undefined {
  const m = output.match(new RegExp(`${name}\\s+REG_SZ\\s+(\\d+)`, 'i'));
  return m ? Number(m[1]) : undefined;
}
