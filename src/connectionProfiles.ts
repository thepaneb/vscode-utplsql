import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { UtConfig } from './config';
import type { ConnectionProfile } from './types';

/** `scott/tiger@localhost:1521/XE` → `scott@localhost:1521/XE`. */
export function maskConnection(conn: string): string {
  const slash = conn.indexOf('/');
  const at = slash >= 0 ? conn.indexOf('@', slash) : -1;
  if (slash < 0 || at < 0) return conn;
  return `${conn.slice(0, slash)}${conn.slice(at)}`;
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
      connection: `${userName}/${password}@${host}:${port}/${service}`,
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
  await vscode.workspace
    .getConfiguration('utplsql')
    .update('profiles', profiles, vscode.ConfigurationTarget.Global);
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

export async function selectProfile(
  profiles: ConnectionProfile[],
): Promise<ConnectionProfile | undefined> {
  const items = profiles.map((p) => ({
    label: p.name,
    description: maskConnection(p.connection),
    detail: p.isDefault ? 'Default' : undefined,
    profile: p,
  }));
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a connection profile',
    matchOnDescription: true,
  });
  return selected?.profile;
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
