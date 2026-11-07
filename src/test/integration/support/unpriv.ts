// Helpers da fixture de integração endurecida (PRD-107).
//
// O usuário restrito tem apenas CREATE SESSION. Os testes que dependem dele
// fazem skip quando a fixture não foi provisionada; os grants do observador
// (v$session) são concedidos pelo setup.sh/ setup.sql.

export interface ConnectionParts {
  user: string;
  password: string;
  connectString: string;
}

/** `user/pass@//host:port/service` → partes; tolera `/` e `@` na senha. */
export function parseConnectionParts(connection: string): ConnectionParts | undefined {
  const at = connection.lastIndexOf('@//');
  if (at <= 0) return undefined;
  const credentials = connection.slice(0, at);
  const connectString = connection.slice(at + 1);
  const slash = credentials.indexOf('/');
  if (slash <= 0) return undefined;
  return {
    user: credentials.slice(0, slash),
    password: credentials.slice(slash + 1),
    connectString,
  };
}

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

/** O usuário restrito está provisionado/explicitamente configurado? */
export function hasUnprivUser(): boolean {
  if (env('UTPLSQL_IT_UNPRIV_CONN')) return true;
  return Boolean(
    env('UTPLSQL_IT_UNPRIV_USER') &&
      env('UTPLSQL_IT_UNPRIV_PASSWORD') &&
      (env('UTPLSQL_CONN') || env('UTPLSQL_IT_CONN')),
  );
}

/**
 * Conexão do usuário restrito. `UTPLSQL_IT_UNPRIV_CONN` tem precedência; senão
 * combina `UTPLSQL_IT_UNPRIV_USER`/`PASSWORD` com o host/serviço de
 * `UTPLSQL_CONN`/`UTPLSQL_IT_CONN`.
 */
export function unprivConnection(): ConnectionParts | undefined {
  const explicit = env('UTPLSQL_IT_UNPRIV_CONN');
  if (explicit) return parseConnectionParts(explicit);
  const base = parseConnectionParts(env('UTPLSQL_CONN') || env('UTPLSQL_IT_CONN'));
  const user = env('UTPLSQL_IT_UNPRIV_USER');
  const password = env('UTPLSQL_IT_UNPRIV_PASSWORD');
  if (!base || !user || !password) return undefined;
  return { user, password, connectString: base.connectString };
}

/** Conexão do observador (v$session). Default: a conexão principal dos testes. */
export function observerConnection(): ConnectionParts | undefined {
  return (
    parseConnectionParts(env('UTPLSQL_IT_OBSERVER_CONN')) ??
    parseConnectionParts(env('UTPLSQL_CONN') || env('UTPLSQL_IT_CONN'))
  );
}
