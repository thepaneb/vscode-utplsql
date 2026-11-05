import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { createAutoRunner } from './autoRun';
import { UtplsqlCodeLensProvider } from './codelens';
import { registerConnectionCommands } from './commands/connection';
import { registerDebug } from './commands/debug';
import type { CommandDeps } from './commands/deps';
import { registerProfileCommands } from './commands/profile';
import { registerRunCommands } from './commands/run';
import { registerScaffoldCommands } from './commands/scaffold';
import { registerScriptCommands } from './commands/script';
import { registerUtilityCommands } from './commands/utility';
import { registerCompilationDiagnostics } from './compilationDiagnostics';
import { readConfig } from './config';
import {
  hydrateProfilePasswords,
  initSecretStorage,
  migrateLegacyProfiles,
} from './connectionProfiles';
import { registerDbSourceProvider } from './dbSourceProvider';
import { createPerKeyDebouncer } from './debounce';
import { DecorationManager } from './decorations';
import {
  buildLanguageSelector,
  buildWatcherGlob,
  currentLanguageContributions,
  isPlsqlDocument,
  workspaceAssociations,
} from './languageIdentity';
import { formatLogLine, logger, setLogSink, setTraceEnabled } from './logger';
import { closeOraclePool, invalidatePool, setPerfProbe } from './oracleRunner';
import { createPerfProbe, formatPerfLine, type PerfProbe, type PerfSample } from './perf';
import { setupValidator, UtplsqlCodeActionProvider } from './quickfix';
import { TestStateManager } from './state';
import { UtplsqlStatusBar } from './statusBar';
import {
  createRefresher,
  resolvePackageNode,
  resolveSchemaNode,
  resolveSuiteNode,
} from './testTree';

const state = new TestStateManager();
let statusBar: UtplsqlStatusBar | undefined;
let decorationManager: DecorationManager | undefined;
let cancelCurrentRun: (() => void) | undefined;

export function activate(context: vscode.ExtensionContext) {
  void vscode.commands.executeCommand('setContext', 'utplsql:activated', true);

  // Snapshot do último resultado (PRD-56): `Memento` por setter e restore já
  // antes do primeiro refresh, para o label/duração sair certo na árvore.
  state.attachMemento(context.workspaceState);
  state.restore();

  // Log de diagnóstico em um LogOutputChannel (nível controlado pelo usuário).
  const log = vscode.window.createOutputChannel('utPLSQL', { log: true });
  context.subscriptions.push(log);
  setLogSink((level, msg, ctx) => {
    const line = formatLogLine(msg, ctx);
    if (level === 'trace') log.trace(line);
    else log[level](line);
  });

  // PRD-102: trace e perf são opt-in. O probe é estável (proxy) para o
  // refresher que já foi criado; a configuração pode recriá-lo sem reiniciar.
  setTraceEnabled(readConfig().trace);
  const appendPerf = async (sample: PerfSample): Promise<void> => {
    const cfg = readConfig();
    if (!cfg.perfEnabled || !cfg.perfReportFile.trim()) return;
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    const target = path.isAbsolute(cfg.perfReportFile)
      ? cfg.perfReportFile
      : path.join(root, cfg.perfReportFile);
    try {
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.appendFile(target, `${formatPerfLine(sample)}\n`, 'utf8');
    } catch (e) {
      logger.warn('perf: falha ao gravar o relatório', { error: String(e) });
    }
  };
  const buildPerfProbe = (): PerfProbe =>
    createPerfProbe({
      enabled: readConfig().perfEnabled,
      sink: (sample) => {
        logger.info('perf', {
          phase: sample.phase,
          ms: sample.ms,
          ts: sample.ts,
          ...(sample.meta ? { meta: sample.meta } : {}),
        });
        void appendPerf(sample);
      },
    });
  let perfProbe = buildPerfProbe();
  const perfProxy: PerfProbe = {
    get enabled() {
      return perfProbe.enabled;
    },
    start: (phase) => perfProbe.start(phase),
    record: (phase, ms, meta) => perfProbe.record(phase, ms, meta),
  };
  setPerfProbe(perfProxy);

  initSecretStorage(context.secrets);
  const profilesReady = (async () => {
    await migrateLegacyProfiles();
    await hydrateProfilePasswords();
  })();

  const controller = vscode.tests.createTestController('utplsql', 'utPLSQL');
  context.subscriptions.push(controller);

  const refresh = createRefresher(controller, state, perfProxy);

  // PRD-120: a validação de setup é preguiçosa, memoizada e nunca roda no
  // `activate()`. O primeiro uso relevante (editor PL/SQL, refresh manual,
  // expansão da árvore ou execução) dispara uma única checagem por sessão.
  let setupValidationPromise: Promise<void> | undefined;
  let setupValidationDone = false;
  let setupValidationScheduled = false;

  const runSetupValidation = (): Promise<void> => {
    if (setupValidationDone) return Promise.resolve();
    if (setupValidationPromise) return setupValidationPromise;
    setupValidationScheduled = true;
    setupValidationPromise = (async () => {
      const [activationDiags, installDiags] = await Promise.all([
        setupValidator.validateOnActivation(),
        setupValidator.validateUtplsqlInstall(),
      ]);
      setupValidator.applyDiagnostics([...activationDiags, ...installDiags]);
    })()
      .catch((e) => {
        logger.warn('setup validation failed', { error: String(e) });
      })
      .finally(() => {
        setupValidationDone = true;
        setupValidationScheduled = false;
        setupValidationPromise = undefined;
      });
    return setupValidationPromise;
  };

  const scheduleSetupValidation = (): void => {
    if (setupValidationDone || setupValidationScheduled) return;
    void runSetupValidation();
  };

  const refreshFromUser = async (): Promise<void> => {
    scheduleSetupValidation();
    await refresh();
  };

  controller.resolveHandler = async (item) => {
    if (!item) {
      // Carga inicial: não é interação do usuário (RNF1).
      await refresh();
      return;
    }
    scheduleSetupValidation();
    // Resolução lazy por nível (PRD-75): schema → package → suite.
    if (item.id.startsWith('schema:')) await resolveSchemaNode(controller, state, item);
    else if (item.id.startsWith('package:')) resolvePackageNode(controller, state, item);
    else if (item.id.startsWith('suite:')) resolveSuiteNode(controller, state, item);
  };
  controller.refreshHandler = async () => {
    await refreshFromUser();
  };

  const deps: CommandDeps = {
    controller,
    state,
    getStatusBar: () => statusBar,
    getDecorationManager: () => decorationManager,
    refresh: refreshFromUser,
  };

  const run = registerRunCommands(context, deps);
  cancelCurrentRun = run.cancel;

  state.runProfile = controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    (request, token) => {
      scheduleSetupValidation();
      return run.runWithProgress(request, token, false);
    },
    true,
  );
  state.coverageProfile = controller.createRunProfile(
    'Run with Coverage',
    vscode.TestRunProfileKind.Coverage,
    (request, token) => {
      scheduleSetupValidation();
      return run.runWithProgress(request, token, true);
    },
    true,
  );
  state.coverageProfile.loadDetailedCoverage = async (_run, fc) =>
    state.getCoverage(fc.uri.toString());
  context.subscriptions.push(state.runProfile, state.coverageProfile);

  registerUtilityCommands(context, deps);
  registerConnectionCommands(context, deps);
  registerProfileCommands(context, deps);
  registerScriptCommands(context);
  registerScaffoldCommands(context);
  registerDebug(context, deps);

  const codeLensProvider = new UtplsqlCodeLensProvider();
  const buildCodeLensRegistration = (): vscode.Disposable => {
    const cfg = readConfig();
    return vscode.languages.registerCodeLensProvider(
      buildLanguageSelector(
        cfg.discoveryLanguageIds,
        currentLanguageContributions(),
        workspaceAssociations(),
      ),
      codeLensProvider,
    );
  };
  let codeLensRegistration = buildCodeLensRegistration();
  context.subscriptions.push({ dispose: () => codeLensRegistration.dispose() });

  statusBar = new UtplsqlStatusBar();
  context.subscriptions.push(statusBar);

  decorationManager = new DecorationManager();
  context.subscriptions.push(decorationManager);

  registerDbSourceProvider(context);
  registerCompilationDiagnostics(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('utplsql.discovery.languageIds') ||
        e.affectsConfiguration('files.associations')
      ) {
        codeLensRegistration.dispose();
        codeLensRegistration = buildCodeLensRegistration();
      }
      if (!e.affectsConfiguration('utplsql')) return;
      invalidatePool();
      // PRD-120 RF3: mudança de configuração invalida o memo da validação.
      setupValidationDone = false;
      setupValidationScheduled = false;
      // PRD-102: trace/perf também são lidos por configuração.
      setTraceEnabled(readConfig().trace);
      perfProbe = buildPerfProbe();
    }),
  );

  context.subscriptions.push(setupValidator);

  const codeActionProvider = new UtplsqlCodeActionProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', pattern: '**/*.pks' },
      codeActionProvider,
    ),
    vscode.languages.registerCodeActionsProvider({ scheme: 'utplsql-setup' }, codeActionProvider),
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'utplsql-coverage' },
      codeActionProvider,
    ),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (
        editor?.document?.fileName &&
        isPlsqlDocument(editor.document, readConfig().discoveryLanguageIds)
      ) {
        scheduleSetupValidation();
      }
      if (editor && decorationManager?.hasResults()) {
        decorationManager.applyToVisibleEditors();
      }
    }),
  );

  const watchCfg = readConfig();
  const watcher = vscode.workspace.createFileSystemWatcher(
    buildWatcherGlob(
      watchCfg.discoveryLanguageIds,
      currentLanguageContributions(),
      workspaceAssociations(),
    ),
  );
  // PRD-103: debounce por URI + reindex incremental. Rajadas grandes caem no
  // full refresh; tag/schema também (no próprio refresher).
  const pendingWatcherActions = new Map<string, 'change' | 'delete'>();
  const perKeyRefresh = createPerKeyDebouncer(
    (key) => {
      const action = pendingWatcherActions.get(key) ?? 'change';
      pendingWatcherActions.delete(key);
      if (perKeyRefresh.size > 8) {
        perKeyRefresh.cancel();
        pendingWatcherActions.clear();
        void refresh();
        return;
      }
      const uri = vscode.Uri.parse(key);
      if (action === 'delete') void refresh.removeUri(uri);
      else void refresh.refreshUri(uri);
    },
    () => readConfig().refreshDebounceMs,
  );
  const scheduleWatcher = (kind: 'change' | 'delete', uri: unknown): void => {
    const key = (uri as { toString?: () => string } | undefined)?.toString?.();
    // Harnesses antigos disparam o watcher sem URI: full refresh é o fallback.
    if (!key) {
      void refresh();
      return;
    }
    pendingWatcherActions.set(key, kind);
    perKeyRefresh.schedule(key);
  };
  watcher.onDidCreate((uri) => scheduleWatcher('change', uri));
  watcher.onDidChange((uri) => scheduleWatcher('change', uri));
  watcher.onDidDelete((uri) => scheduleWatcher('delete', uri));
  context.subscriptions.push(watcher, {
    dispose: () => {
      perKeyRefresh.cancel();
      pendingWatcherActions.clear();
    },
  });

  // Auto-run on save (watch mode, PRD-50). Default `off`.
  const autoRunner = createAutoRunner(
    () => {
      const cfg = readConfig();
      return {
        enabled: cfg.autoRun === 'onSave',
        delayMs: cfg.autoRunDelayMs,
        queue: cfg.autoRunQueue,
      };
    },
    {
      run: async (uriStr) => {
        await run.runUri(vscode.Uri.file(uriStr), state.coverageAlways);
      },
      isRunning: () => run.isRunning(),
      isEligible: (uriStr) => /\.pks$/i.test(uriStr),
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (handle) => clearTimeout(handle),
    },
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!doc.fileName.endsWith('.pks')) return;
      autoRunner.schedule(doc.uri.fsPath);
    }),
    { dispose: () => autoRunner.cancel() },
  );

  void profilesReady
    .then(() => refresh())
    .then(() => {
      // Restaura o último resultado (PRD-56 RF3): decorações inline, "Run Failed"
      // e o context key. Depende da árvore já montada (ids → itens).
      state.restoreLastFailed();
      void vscode.commands.executeCommand(
        'setContext',
        'utplsql:hasFailures',
        state.getLastFailedItems().length > 0,
      );
      decorationManager?.update(state.getLastResults(), (id) => state.getItem(id));
    });
}

export async function deactivate() {
  cancelCurrentRun?.();
  await closeOraclePool();
}
