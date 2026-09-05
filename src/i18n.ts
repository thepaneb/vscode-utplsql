// Catálogo i18n da extensão. PURO (sem 'vscode') — testável com node --test.
// pt-BR é o catálogo base; en traduz. Chave ausente → pt-BR → a própria chave.

export type ExtensionLocale = 'pt-br' | 'en';

export const ptBr = {
  // general
  'common.error': 'Erro',
  'common.failed': 'Falhou',
  'common.copy': 'Copiar',
  'common.oracledbMissing':
    'oracledb não disponível. Instale com "npm install oracledb" ou use runnerMode "cli".',

  // extension.ts
  'ext.reporters.listFailed': 'Falha ao listar reporters: {error}',
  'ext.reporters.placeholder': 'Selecione um reporter adicional para esta execução',
  'ext.reporters.willUse': 'Reporter "{name}" será usado na próxima execução.',
  'ext.connection.cleared': 'Conexão limpa da sessão.',
  'ext.info.failed': 'utPLSQL info: {error}',
  'ext.noPreviousRun': 'Nenhuma execução anterior para repetir.',
  'ext.runAtCursor.onlyPks': 'Run at cursor disponível apenas em arquivos .pks.',
  'ext.runAtCursor.noAnnotation': 'Nenhuma anotação %suite/%test encontrada na posição.',
  'ext.runFailed.none': 'Nenhum teste falhou na última execução.',
  'ext.grants.copied': 'Grants copiados para o clipboard.',
  'ext.validate.ok': 'Configuração utPLSQL OK — nenhum problema encontrado.',
  'ext.validate.problems':
    '{count} problema(s) de configuração encontrado(s). Veja o Problems Panel.',
  'ext.debug.disabled': 'Debug PL/SQL desabilitado (utplsql.debugger.enabled).',
  'ext.debug.openPks': 'Abra um arquivo .pks/.pkb para debugar.',
  'ext.profile.none': 'Nenhum perfil de conexão salvo. Use "utPLSQL: New Connection Profile...".',
  'ext.profile.active': 'Perfil ativo: {name}',
  'ext.profile.new.title': 'utPLSQL — Novo perfil',
  'ext.profile.new.namePrompt': 'Nome amigável do perfil (ex.: DEV Local)',
  'ext.profile.new.namePlaceholder': 'DEV Local',
  'ext.profile.new.connPrompt': 'Conexão Oracle (usuario/senha@//host:porta/servico)',
  'ext.profile.new.sourcePrompt': 'sourcePath (opcional — Enter para pular)',
  'ext.profile.new.sourcePlaceholder': 'install',
  'ext.profile.new.created': 'Perfil "{name}" criado e ativado.',
  'ext.sqlDev.import.none': 'Nenhuma conexão do SQL Developer encontrada (connections.xml).',
  'ext.sqlDev.import.ok': '{count} conexão(ões) importada(s) do SQL Developer.',
  'ext.noSuiteInFile': 'Nenhuma suite utPLSQL encontrada neste arquivo.',
  'ext.noSuiteInFolder': 'Nenhuma suite utPLSQL encontrada nesta pasta.',
  'ext.openFolder': 'Abra uma pasta/projeto para rodar os testes utPLSQL.',
  'ext.noConnection': 'Conexão Oracle não informada.',
  'ext.conn.prompt':
    'Informe a conexão (usuario/senha@//host:porta/servico). Fica só nesta sessão.',
  'ext.conn.placeholder': 'DEV_FULANO/senha@//localhost:1521/XEPDB1',
  'ext.runCancel': 'Execução cancelada.',

  // runner.ts
  'runner.oracleUnavailable': 'Oracle runner indisponível, fallback para CLI: {error}',
  'runner.oracleError': 'Oracle runner: {error}',
  'runner.oracleErrorHeader': '[erro] Oracle runner: {error}',
  'runner.running': 'Rodando utPLSQL{coverage}...',
  'runner.withCoverage': ' (com cobertura)',
  'runner.infoCli': '[aviso] Não foi possível obter info do CLI: {error}',
  'runner.cliInfo': '[info] CLI {cli} | API {api}{db}',
  'runner.dbVersion': ' | DB utPLSQL {version}',
  'runner.oldVersion':
    '[aviso] utPLSQL no banco é anterior a 3.1.0 — cobertura pode não funcionar.',
  'runner.reporterListFailed': '[aviso] Não foi possível listar reporters: {error}',
  'runner.reporterListNoCoverage': '[aviso] Continuando sem cobertura.',
  'runner.reporterMissing':
    '[aviso] Reporter UT_COVERAGE_COBERTURA_REPORTER não disponível no banco.\n' +
    'Cobertura desabilitada. Verifique se o pacote utPLSQL está atualizado.',
  'runner.extraReporter': '[info] Reporter adicional da sessão: {name}',
  'runner.invocationError': '{error}',
  'runner.noResults': 'Sem relatório de resultados (o CLI falhou?).',
  'runner.noJunitResult': '[aviso] Nenhum resultado JUnit encontrado para "{id}".',
  'runner.noJunitResultPkg': ' packageName esperado: {package}',
  'runner.coverNoReport':
    '[cobertura] relatório não gerado.\n  esperado em: {path}\n  arquivos em {dir}: {files}\n  verifique o GRANT EXECUTE ON SYS.DBMS_PROFILER.',
  'runner.oracleInfo': '[info] Oracle runner {ms}ms | {chars} chars JUnit',
  'runner.stderr': '[stderr]',

  // oracleRunner.ts
  'oracleRunner.coverNotGenerated':
    '[cobertura] relatório não gerado. Verifique o GRANT EXECUTE ON SYS.DBMS_PROFILER.',

  // results.ts
  'results.noMapped':
    '[cobertura] nenhum arquivo mapeado. Ajuste "utplsql.sourcePath" para a pasta do código-fonte.',

  // cli.ts
  'cli.notFound': 'CLI não encontrado: {path}',

  // statusBar.ts
  'status.idle': 'No tests run yet. Click to open Test Explorer.',
  'status.running': 'Running {current}/{total} suites',
  'status.runningDetail': '{current} of {total} test suites executing...',
  'status.profileTooltip': 'Perfil: {name}. Click to switch profile.',
  'status.passed': '{count} passed',
  'status.failed': '{count} failed',
  'status.errored': '{count} errored',
  'status.skipped': '{count} skipped',

  // quickfix.ts
  'quickfix.noCli': 'utPLSQL CLI não configurado ({path}).',
  'quickfix.noJava': 'Java não encontrado ({path}).',
  'quickfix.badConn': 'Conexão Oracle inválida: {error}',
  'quickfix.oldVersion': 'Versão do utPLSQL no banco antiga ({version}); mínimo 3.1.0.',
  'quickfix.oldVersionUpgrade': 'Como atualizar o utPLSQL',
  'quickfix.invalidObjects': 'Schema {schema} contém {count} objetos inválidos: {names}',
  'quickfix.noCoverage':
    'Relatório de cobertura não foi gerado. Execute os grants: GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema>;',
  'quickfix.recompile': 'Recompilar UT3',
  'quickfix.recompiledOk': 'Schema {schema} recompilado — nenhum objeto inválido.',
  'quickfix.stillInvalid': 'Ainda há {count} objetos inválidos em {schema}: {names}',
  'quickfix.recompileFail':
    'Falha ao recompilar UT3: {error}. Requer ALTER ANY PROCEDURE ou execução como o owner do schema.',
  'quickfix.noConnection': 'Conexão Oracle não configurada.',
  'quickfix.oracledbMissing': 'oracledb não disponível. Instale com "npm install oracledb".',

  // viewCoverage.ts / connectionProfiles.ts / debugger.ts
  'viewCoverage.none': '[cobertura] nenhum arquivo mapeado.',

  // package.nls (títulos de comandos/settings) — espelhado em package.nls*.json
  'nls.command.showTestExplorer': 'Mostrar Test Explorer',
  'nls.command.runLens': 'Executar teste (CodeLens)',
  'nls.command.refresh': 'Atualizar testes',
  'nls.command.runAll': 'Rodar todos os testes',
  'nls.command.runFile': 'utPLSQL: Rodar testes deste arquivo',
  'nls.command.runFileCoverage': 'utPLSQL: Rodar testes deste arquivo (com cobertura)',
  'nls.command.runFolder': 'utPLSQL: Rodar testes desta pasta',
  'nls.command.runFolderCoverage': 'utPLSQL: Rodar testes desta pasta (com cobertura)',
  'nls.command.cancelRun': 'Cancelar execução',
  'nls.command.clearConnection': 'Limpar conexão da sessão',
  'nls.command.showInfo': 'Mostrar informações do utPLSQL',
  'nls.command.selectReporter': 'Selecionar reporter adicional...',
  'nls.command.rerunLast': 'utPLSQL: Rerun Last',
  'nls.command.runAtCursor': 'utPLSQL: Run Test at Cursor',
  'nls.command.runFailed': 'utPLSQL: Run Failed Tests',
  'nls.command.configureConnection': 'Configurar conexão',
  'nls.command.copyGrantsToClipboard': 'Copiar grants de cobertura para clipboard',
  'nls.command.validateSetup': 'Validar configuração',
  'nls.command.switchProfile': 'Switch Connection Profile...',
  'nls.command.newProfile': 'New Connection Profile...',
  'nls.command.manageProfiles': 'Manage Connection Profiles',
  'nls.command.importSqlDevConnections': 'Import SQL Developer Connections',
  'nls.command.debugTest': 'Debug Test (PL/SQL)',
} as const;

export const en: Record<string, string> = {
  'common.error': 'Error',
  'common.failed': 'Failed',
  'common.copy': 'Copy',
  'common.oracledbMissing':
    'oracledb not available. Install with "npm install oracledb" or use runnerMode "cli".',

  'ext.reporters.listFailed': 'Failed to list reporters: {error}',
  'ext.reporters.placeholder': 'Select an additional reporter for this run',
  'ext.reporters.willUse': 'Reporter "{name}" will be used in the next run.',
  'ext.connection.cleared': 'Session connection cleared.',
  'ext.info.failed': 'utPLSQL info: {error}',
  'ext.noPreviousRun': 'No previous run to repeat.',
  'ext.runAtCursor.onlyPks': 'Run at cursor is only available in .pks files.',
  'ext.runAtCursor.noAnnotation': 'No %suite/%test annotation found at the position.',
  'ext.runFailed.none': 'No test failed in the last run.',
  'ext.grants.copied': 'Coverage grants copied to the clipboard.',
  'ext.validate.ok': 'utPLSQL setup OK — no problems found.',
  'ext.validate.problems': '{count} setup problem(s) found. See the Problems Panel.',
  'ext.debug.disabled': 'PL/SQL debugging disabled (utplsql.debugger.enabled).',
  'ext.debug.openPks': 'Open a .pks/.pkb file to debug.',
  'ext.profile.none': 'No saved connection profile. Use "utPLSQL: New Connection Profile...".',
  'ext.profile.active': 'Active profile: {name}',
  'ext.profile.new.title': 'utPLSQL — New Profile',
  'ext.profile.new.namePrompt': 'Friendly profile name (e.g.: DEV Local)',
  'ext.profile.new.namePlaceholder': 'DEV Local',
  'ext.profile.new.connPrompt': 'Oracle connection string (user/pass@//host:port/service)',
  'ext.profile.new.sourcePrompt': 'sourcePath (optional — press Enter to skip)',
  'ext.profile.new.sourcePlaceholder': 'install',
  'ext.profile.new.created': 'Profile "{name}" created and activated.',
  'ext.sqlDev.import.none': 'No SQL Developer connections found (connections.xml).',
  'ext.sqlDev.import.ok': '{count} connection(s) imported from SQL Developer.',
  'ext.noSuiteInFile': 'No utPLSQL suite found in this file.',
  'ext.noSuiteInFolder': 'No utPLSQL suite found in this folder.',
  'ext.openFolder': 'Open a folder/project to run utPLSQL tests.',
  'ext.noConnection': 'Oracle connection not set.',
  'ext.conn.prompt':
    'Enter the connection (user/pass@//host:port/service). Kept only in this session.',
  'ext.conn.placeholder': 'DEV_FULANO/pass@//localhost:1521/XEPDB1',
  'ext.runCancel': 'Run cancelled.',

  'runner.oracleUnavailable': 'Oracle runner unavailable, falling back to CLI: {error}',
  'runner.oracleError': 'Oracle runner: {error}',
  'runner.oracleErrorHeader': '[error] Oracle runner: {error}',
  'runner.running': 'Running utPLSQL{coverage}...',
  'runner.withCoverage': ' (with coverage)',
  'runner.infoCli': '[warning] Could not get CLI info: {error}',
  'runner.cliInfo': '[info] CLI {cli} | API {api}{db}',
  'runner.dbVersion': ' | DB utPLSQL {version}',
  'runner.oldVersion':
    '[warning] utPLSQL in the database is older than 3.1.0 — coverage may not work.',
  'runner.reporterListFailed': '[warning] Could not list reporters: {error}',
  'runner.reporterListNoCoverage': '[warning] Continuing without coverage.',
  'runner.reporterMissing':
    '[warning] UT_COVERAGE_COBERTURA_REPORTER not available in the database.\n' +
    'Coverage disabled. Check if the utPLSQL package is up to date.',
  'runner.extraReporter': '[info] Additional session reporter: {name}',
  'runner.invocationError': '{error}',
  'runner.noResults': 'No results report (did the CLI fail?).',
  'runner.noJunitResult': '[warning] No JUnit result found for "{id}".',
  'runner.noJunitResultPkg': ' expected packageName: {package}',
  'runner.coverNoReport':
    '[coverage] report not generated.\n  expected at: {path}\n  files in {dir}: {files}\n  check GRANT EXECUTE ON SYS.DBMS_PROFILER.',
  'runner.oracleInfo': '[info] Oracle runner {ms}ms | {chars} JUnit chars',
  'runner.stderr': '[stderr]',

  'oracleRunner.coverNotGenerated':
    '[coverage] report not generated. Check GRANT EXECUTE ON SYS.DBMS_PROFILER.',

  'results.noMapped':
    '[coverage] no file mapped. Adjust "utplsql.sourcePath" to the source code folder.',

  'cli.notFound': 'CLI not found: {path}',

  'status.idle': 'No tests run yet. Click to open Test Explorer.',
  'status.running': 'Running {current}/{total} suites',
  'status.runningDetail': '{current} of {total} test suites executing...',
  'status.profileTooltip': 'Profile: {name}. Click to switch profile.',
  'status.passed': '{count} passed',
  'status.failed': '{count} failed',
  'status.errored': '{count} errored',
  'status.skipped': '{count} skipped',

  'quickfix.noCli': 'utPLSQL CLI not configured ({path}).',
  'quickfix.noJava': 'Java not found ({path}).',
  'quickfix.badConn': 'Invalid Oracle connection: {error}',
  'quickfix.oldVersion': 'utPLSQL database version is old ({version}); minimum 3.1.0.',
  'quickfix.oldVersionUpgrade': 'How to upgrade utPLSQL',
  'quickfix.invalidObjects': 'Schema {schema} has {count} invalid objects: {names}',
  'quickfix.noCoverage':
    'Coverage report was not generated. Run the grants: GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema>;',
  'quickfix.recompile': 'Recompile UT3',
  'quickfix.recompiledOk': 'Schema {schema} recompiled — no invalid objects.',
  'quickfix.stillInvalid': 'There are still {count} invalid objects in {schema}: {names}',
  'quickfix.recompileFail':
    'Failed to recompile UT3: {error}. Requires ALTER ANY PROCEDURE or execution as the schema owner.',
  'quickfix.noConnection': 'Oracle connection not configured.',
  'quickfix.oracledbMissing': 'oracledb not available. Install with "npm install oracledb".',

  'viewCoverage.none': '[coverage] no file mapped.',

  'nls.command.showTestExplorer': 'Show Test Explorer',
  'nls.command.runLens': 'Run test (CodeLens)',
  'nls.command.refresh': 'Refresh tests',
  'nls.command.runAll': 'Run all tests',
  'nls.command.runFile': 'utPLSQL: Run tests in this file',
  'nls.command.runFileCoverage': 'utPLSQL: Run tests in this file (with coverage)',
  'nls.command.runFolder': 'utPLSQL: Run tests in this folder',
  'nls.command.runFolderCoverage': 'utPLSQL: Run tests in this folder (with coverage)',
  'nls.command.cancelRun': 'Cancel run',
  'nls.command.clearConnection': 'Clear session connection',
  'nls.command.showInfo': 'Show utPLSQL info',
  'nls.command.selectReporter': 'Select additional reporter...',
  'nls.command.rerunLast': 'utPLSQL: Rerun Last',
  'nls.command.runAtCursor': 'utPLSQL: Run Test at Cursor',
  'nls.command.runFailed': 'utPLSQL: Run Failed Tests',
  'nls.command.configureConnection': 'Configure connection',
  'nls.command.copyGrantsToClipboard': 'Copy coverage grants to clipboard',
  'nls.command.validateSetup': 'Validate setup',
  'nls.command.switchProfile': 'Switch Connection Profile...',
  'nls.command.newProfile': 'New Connection Profile...',
  'nls.command.manageProfiles': 'Manage Connection Profiles',
  'nls.command.importSqlDevConnections': 'Import SQL Developer Connections',
  'nls.command.debugTest': 'Debug Test (PL/SQL)',
};

/** Garante paridade de chaves entre os catálogos (fallback pt-BR). */
export const missingEnKeys = (): string[] => Object.keys(ptBr).filter((k) => !(k in en));

/** Resolve o idioma efetivo a partir da setting e do idioma do VSCode. */
export function resolveLocale(setting: string, vscodeLanguage: string): ExtensionLocale {
  if (setting === 'pt-br' || setting === 'en') return setting;
  return vscodeLanguage.toLowerCase().startsWith('pt') ? 'pt-br' : 'en';
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_m, k: string) =>
    k in params ? String(params[k]) : `{${k}}`,
  );
}

/** Traduz uma chave; chave ausente → pt-BR → a própria chave. Nunca lança. */
export function t(
  locale: ExtensionLocale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const catalog = locale === 'en' ? en : ptBr;
  const pt = ptBr as Record<string, string>;
  const template = (catalog as Record<string, string>)[key] ?? pt[key] ?? key;
  return interpolate(template, params);
}
