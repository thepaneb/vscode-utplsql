import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { UtConfig } from './config';
import { resolveLocale, t } from './i18n';
import { logger } from './logger';
import type { ConnectionProfile } from './types';

/** Idioma efetivo sem importar `config.ts` (evita dependência circular). */
function profileLocale() {
  const setting = vscode.workspace.getConfiguration('utplsql').get<string>('language', 'auto');
  return resolveLocale(setting, vscode.env.language);
}

/**
 * `scott/tiger@localhost:1521/XE` → `scott@localhost:1521/XE`.
 * Cobre também a credencial sem `@` (conexão malformada, ex.: `scott/tiger`,
 * que é justamente o caso que faz `parseConnString` lançar): sem host não há
 * como separar as partes, então corta após o 1º `/`.
 */
export function maskConnection(conn: string): string {
  const at = conn.lastIndexOf('@');
  if (at < 0) {
    const slash = conn.indexOf('/');
    return slash >= 0 ? conn.slice(0, slash) : conn;
  }
  const cred = conn.slice(0, at);
  const slash = cred.indexOf('/');
  const user = slash >= 0 ? cred.slice(0, slash) : cred;
  return `${user}${conn.slice(at)}`;
}

export function generateId(): string {
  return randomUUID();
}

export function findProfileById(
  profiles: ConnectionProfile[],
  id: string,
): ConnectionProfile | undefined {
  return profiles.find((p) => p.id === id);
}

function attr(attrs: string, name: string): string {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1] ?? '';
}

/**
 * Parse do `connections.xml` do SQL Developer. Cada `<Reference>` vira um
 * perfil; malformado/inacessível → array vazio.
 */
export function parseSqlDevConnections(xml: string): ConnectionProfile[] {
  const profiles: ConnectionProfile[] = [];
  const refRe = /<Reference\b([^>]*)\/?>([\s\S]*?)<\/Reference>/g;
  for (const m of xml.matchAll(refRe)) {
    const attrs = m[1];
    const body = m[2] ?? '';
    const name = attr(attrs, 'name');
    const userName = attr(attrs, 'userName');
    const password = attr(attrs, 'password') ?? '';
    if (!name || !userName) continue;

    const kv: Record<string, string> = {};
    const addrRe = /<StringRefAddr\s+addrType="([^"]+)">([\s\S]*?)<\/StringRefAddr>/g;
    for (const am of body.matchAll(addrRe)) {
      kv[am[1]] = am[2];
    }
    const host = kv.hostname ?? '';
    if (!host) continue;
    const port = kv.port ?? '';
    const service = kv.serviceName ?? kv.sid ?? '';
    profiles.push({
      id: generateId(),
      name,
      connection: `${userName}${password ? `/${password}` : ''}@${host}:${port}/${service}`,
    });
  }
  return profiles;
}

/**
 * Localiza o `connections.xml` do SQL Developer sob um conjunto de diretórios
 * base (ex.: `~/.sqldeveloper` e `%APPDATA%/SQL Developer`). Procura apenas
 * subpastas `system*` — não varre o disco inteiro.
 */
export function findSqlDevConnectionsPath(baseDirs: string[]): string | undefined {
  for (const base of baseDirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(base);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!/^system/i.test(entry)) continue;
      const candidate = path.join(base, entry, 'o.jdeveloper.db.connection', 'connections.xml');
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        /* continua procurando */
      }
    }
  }
  return undefined;
}

export function getActiveProfile(): ConnectionProfile | undefined {
  const c = vscode.workspace.getConfiguration('utplsql');
  const id = c.get<string>('activeProfile', '');
  if (!id) return undefined;
  return findProfileById(c.get<ConnectionProfile[]>('profiles', []), id);
}

export function getAllProfiles(): ConnectionProfile[] {
  return vscode.workspace.getConfiguration('utplsql').get<ConnectionProfile[]>('profiles', []);
}

export async function saveProfiles(profiles: ConnectionProfile[]): Promise<void> {
  const sanitized: ConnectionProfile[] = [];
  for (const p of profiles) {
    const { connection, password } = splitPassword(p.connection);
    if (password) {
      rememberPassword(p.id, connection, password);
      await persistPassword(p.id, connection, password);
      sanitized.push({ ...p, connection });
    } else {
      sanitized.push(p);
    }
  }
  await vscode.workspace
    .getConfiguration('utplsql')
    .update('profiles', sanitized, vscode.ConfigurationTarget.Global);
}

// ── Senhas em SecretStorage (PRD-65 RF3 · vínculo PRD-81 RF3) ───────────

const SECRET_PREFIX = 'utplsql.profile.';
let secretStorage: vscode.SecretStorage | undefined;

/**
 * Senha vinculada à conexão (PRD-81 RF3): só é reaproveitada se a `connection`
 * atual do perfil for a mesma com que foi gravada. Impede que um workspace
 * malicioso aponte o perfil para outro host e exfiltre a senha guardada.
 */
interface StoredPassword {
  /** `connection` **sem** senha (`user@//host:port/service`) usada ao gravar. */
  connection: string;
  password: string;
}

/** id do perfil → senha vinculada (só entra aqui com o vínculo conferido). */
const passwordCache = new Map<string, StoredPassword>();

export function initSecretStorage(secrets: vscode.SecretStorage): void {
  secretStorage = secrets;
}

/**
 * Decodifica o segredo. Formato atual: JSON `{ connection, password }`.
 * Formato legado (PRD-65): string crua = senha sem vínculo → `connection: ''`.
 * Nunca lança; JSON inesperado é tratado como legado.
 */
function parseStoredPassword(raw: string | undefined): StoredPassword | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPassword>;
    if (typeof parsed?.connection === 'string' && typeof parsed?.password === 'string') {
      return { connection: parsed.connection, password: parsed.password };
    }
  } catch {
    /* formato legado (string crua) */
  }
  return { connection: '', password: raw };
}

/**
 * Carrega as senhas persistidas no SecretStorage para o cache em memória.
 * Deve rodar após `initSecretStorage` (ex.: na ativação) para que os perfis
 * continuem utilizáveis depois de recarregar a janela (PRD-65 RF3).
 *
 * Vínculo (PRD-81 RF3): senha de outra conexão é **descartada**; senha legada
 * (sem vínculo) é adotada para a conexão atual e regravada no formato novo.
 */
export async function hydrateProfilePasswords(): Promise<void> {
  if (!secretStorage) return;
  for (const p of getAllProfiles()) {
    const key = `${SECRET_PREFIX}${p.id}`;
    const stored = parseStoredPassword(await secretStorage.get(key));
    if (!stored) continue;
    if (stored.connection === p.connection) {
      passwordCache.set(p.id, stored);
    } else if (!stored.connection) {
      const bound: StoredPassword = { connection: p.connection, password: stored.password };
      passwordCache.set(p.id, bound);
      await secretStorage.store(key, JSON.stringify(bound));
    } else {
      await secretStorage.delete(key);
      logger.warn('utplsql: senha de perfil descartada — a conexão mudou desde que foi salva');
    }
  }
}

/** `user/pass@host` → `{ connection: 'user@host', password: 'pass' }`. */
export function splitPassword(conn: string): { connection: string; password: string } {
  const at = conn.lastIndexOf('@');
  if (at < 0) return { connection: conn, password: '' };
  const cred = conn.slice(0, at);
  const slash = cred.indexOf('/');
  if (slash < 0) return { connection: conn, password: '' };
  return {
    connection: `${cred.slice(0, slash)}${conn.slice(at)}`,
    password: cred.slice(slash + 1),
  };
}

function rememberPassword(id: string, connection: string, password: string): void {
  passwordCache.set(id, { connection, password });
}

async function persistPassword(id: string, connection: string, password: string): Promise<void> {
  if (secretStorage) {
    const payload: StoredPassword = { connection, password };
    await secretStorage.store(`${SECRET_PREFIX}${id}`, JSON.stringify(payload));
  }
}

/**
 * Recompõe a connection do perfil com a senha do cache **quando o vínculo
 * bate** (a conexão salva junto com a senha é a conexão atual do perfil).
 * Perfil legado com senha inline é retornado como está.
 */
export function getProfileConnection(profile: ConnectionProfile): string {
  const at = profile.connection.lastIndexOf('@');
  if (at < 0) return profile.connection;
  const cred = profile.connection.slice(0, at);
  if (cred.includes('/')) return profile.connection; // legado com senha inline
  const stored = passwordCache.get(profile.id);
  if (!stored || stored.connection !== profile.connection) return profile.connection;
  return `${cred}/${stored.password}${profile.connection.slice(at)}`;
}

/**
 * Migra perfis legados (senha em texto puro) para o SecretStorage e reescreve
 * `utplsql.profiles` sem a senha. Idempotente.
 */
export async function migrateLegacyProfiles(): Promise<void> {
  const profiles = getAllProfiles();
  const next: ConnectionProfile[] = [];
  let changed = false;
  for (const p of profiles) {
    const { connection, password } = splitPassword(p.connection);
    if (password) {
      rememberPassword(p.id, connection, password);
      await persistPassword(p.id, connection, password);
      next.push({ ...p, connection });
      changed = true;
    } else {
      next.push(p);
    }
  }
  if (changed) await saveProfiles(next);
}

export async function setActiveProfile(id: string | undefined): Promise<void> {
  await vscode.workspace
    .getConfiguration('utplsql')
    .update('activeProfile', id ?? '', vscode.ConfigurationTarget.Global);
}

export function activeProfileName(): string | undefined {
  return getActiveProfile()?.name;
}

/**
 * Merge do perfil ativo sobre a configuração global: campos do perfil
 * sobrescrevem; os demais herdam do global. Sem perfil → global intacto.
 */
export function mergeProfileConfig(global: UtConfig, profile?: ConnectionProfile): UtConfig {
  if (!profile) return global;
  return {
    ...global,
    sourcePath: profile.sourcePath || global.sourcePath,
    coverageOwner: profile.coverageOwner || global.coverageOwner,
    includePatterns: profile.includePatterns ?? global.includePatterns,
  };
}

/**
 * QuickPick de perfis. Exibe `description` no `detail` (com charset ao lado
 * quando diferente de `utf8`) e a conexão mascarada na `description`.
 */
export async function selectProfile(
  profiles: ConnectionProfile[],
): Promise<ConnectionProfile | undefined> {
  const locale = profileLocale();
  const items = profiles.map((p) => {
    const charsetSuffix = p.charset && p.charset !== 'utf8' ? ` • ${p.charset}` : '';
    const detail = [p.description, p.isDefault ? t(locale, 'profile.isDefault') : undefined]
      .filter(Boolean)
      .join(' • ');
    return {
      label: p.name,
      description: `${maskConnection(p.connection)}${charsetSuffix}`,
      detail: detail || undefined,
      profile: p,
    };
  });
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: t(locale, 'profile.selectPlaceholder'),
    matchOnDescription: true,
  });
  return selected?.profile;
}

/**
 * Picker obrigatório pós-invocação (PRD-62): se não houver perfis, oferece
 * criar/importar (reusa os comandos existentes) ou cancela com aviso.
 * Retorna o perfil escolhido ou `undefined` quando cancelado/sem perfis.
 */
export async function pickProfileOrGuide(): Promise<ConnectionProfile | undefined> {
  const profiles = getAllProfiles();
  if (profiles.length > 0) return selectProfile(profiles);
  const locale = profileLocale();
  const choice = await vscode.window.showWarningMessage(
    t(locale, 'ext.profile.guide.none'),
    t(locale, 'ext.profile.guide.new'),
    t(locale, 'ext.profile.guide.import'),
  );
  if (choice === t(locale, 'ext.profile.guide.new')) {
    await vscode.commands.executeCommand('utplsql.newProfile');
  } else if (choice === t(locale, 'ext.profile.guide.import')) {
    await vscode.commands.executeCommand('utplsql.importSqlDevConnections');
  }
  const retry = getAllProfiles();
  if (retry.length === 0) return undefined;
  return selectProfile(retry);
}

/** Importa conexões do SQL Developer; vazio se o XML não for encontrado. */
export async function importFromSqlDeveloper(): Promise<ConnectionProfile[]> {
  const baseDirs: string[] = [];
  const home = os.homedir();
  if (home) baseDirs.push(path.join(home, '.sqldeveloper'));
  const appdata = process.env.APPDATA;
  if (appdata) baseDirs.push(path.join(appdata, 'SQL Developer'));
  const connPath = findSqlDevConnectionsPath(baseDirs);
  if (!connPath) return [];
  const xml = fs.readFileSync(connPath, 'utf-8');
  return parseSqlDevConnections(xml);
}
