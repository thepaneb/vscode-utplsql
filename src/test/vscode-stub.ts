import type * as vscode from 'vscode';

function makeUri(scheme: string, path: string, fsPath = path): vscode.Uri {
  return {
    scheme,
    authority: '',
    path,
    query: '',
    fragment: '',
    fsPath,
    with(change) {
      return makeUri(change.scheme ?? scheme, change.path ?? path, change.path ?? fsPath);
    },
    // Compatibilidade do stub: para `file:` o resto da suíte usa o fsPath como
    // chave/string (o VS Code real devolve `file:///...`).
    toString: () => (scheme === 'file' ? fsPath : `${scheme}:${path}`),
    toJSON: () => ({ scheme, authority: '', path, query: '', fragment: '' }),
  };
}

export namespace Uri {
  export function file(path: string): vscode.Uri {
    return makeUri('file', path);
  }
  export function parse(s: string): vscode.Uri {
    const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/.exec(s);
    if (schemeMatch && !/^[a-zA-Z]:[\\/]/.test(s)) {
      return makeUri(schemeMatch[1], schemeMatch[2] || '/', s);
    }
    return makeUri('file', s, s);
  }
  export function joinPath(base: vscode.Uri, ...pathSegments: string[]): vscode.Uri {
    const basePath = base.fsPath.replace(/[/\\]$/, '');
    const joined = [basePath, ...pathSegments].join('/');
    return file(joined);
  }
}

const _configValues: Record<string, unknown> = {};
let _inputBoxResult: string | undefined;
let _quickPickResult: unknown;
let _mockFileContents: Record<string, string> = {};
let _mockFindFilesResult: Record<string, string[]> = {};
let _mockFileErrors: Record<string, boolean> = {};
const _mockVisibleEditors: TextEditor[] = [];

let _inputBoxResults: Array<string | undefined> = [];
const _informationMessages: string[] = [];
const _warningMessages: string[] = [];
const _errorMessages: string[] = [];
let _clipboardText = '';
const _outputChannels: Record<string, string[]> = {};

export function __setInputBoxResults(values: Array<string | undefined>): void {
  _inputBoxResults = [...values];
}

export function __resetInputBoxResults(): void {
  _inputBoxResults = [];
}

export function __setActiveTextEditor(editor: TextEditor | undefined): void {
  window.__setActiveTextEditorForTests(editor);
}

export function __getInformationMessages(): string[] {
  return [..._informationMessages];
}

export function __getWarningMessages(): string[] {
  return [..._warningMessages];
}

export function __getErrorMessages(): string[] {
  return [..._errorMessages];
}

export function __resetMessages(): void {
  _informationMessages.length = 0;
  _warningMessages.length = 0;
  _errorMessages.length = 0;
}

export function __getClipboardText(): string {
  return _clipboardText;
}

export function __getOutputChannelLines(name: string): string[] {
  return [...(_outputChannels[name] ?? [])];
}

export function __resetOutputChannels(): void {
  for (const key of Object.keys(_outputChannels)) delete _outputChannels[key];
}

export function __setConfigValue(key: string, value: unknown): void {
  _configValues[key] = value;
}

export function __resetConfigValues(): void {
  for (const key of Object.keys(_configValues)) {
    delete _configValues[key];
  }
}

export function __setInputBoxResult(value: string | undefined): void {
  _inputBoxResult = value;
}

export function __setQuickPickResult(value: unknown): void {
  _quickPickResult = value;
}

let _lastQuickPickItems: readonly unknown[] | undefined;

export function __getLastQuickPickItems(): readonly unknown[] | undefined {
  return _lastQuickPickItems;
}

export function __resetLastQuickPickItems(): void {
  _lastQuickPickItems = undefined;
}

// Fila de resultados para múltiplos QuickPicks numa mesma execução.
let _quickPickResults: unknown[] = [];

export function __setQuickPickResults(values: unknown[]): void {
  _quickPickResults = [...values];
}

export function __resetQuickPickResults(): void {
  _quickPickResults = [];
}

let _saveDialogResult: unknown;
let _lastSaveDialogOptions: unknown;

export function __setSaveDialogResult(value: unknown): void {
  _saveDialogResult = value;
}

export function __getLastSaveDialogOptions(): unknown {
  return _lastSaveDialogOptions;
}

let _writtenFiles: Record<string, string> = {};
let _writeErrors: Record<string, boolean> = {};

export function __getWrittenFile(path: string): string | undefined {
  return _writtenFiles[path];
}

export function __setWriteError(path: string, hasError: boolean): void {
  _writeErrors[path] = hasError;
}

export function __resetWrittenFiles(): void {
  _writtenFiles = {};
  _writeErrors = {};
}

let _warningResult: string | undefined;
let _informationResult: string | undefined;

export function __setWarningResult(value: string | undefined): void {
  _warningResult = value;
}

export function __setInformationResult(value: string | undefined): void {
  _informationResult = value;
}

export function __setMockFile(pattern: string, path: string, content: string): void {
  _mockFileContents[path] = content;
  if (!_mockFindFilesResult[pattern]) {
    _mockFindFilesResult[pattern] = [];
  }
  _mockFindFilesResult[pattern].push(path);
}

export function __resetMockFiles(): void {
  _mockFileContents = {};
  _mockFindFilesResult = {};
  _mockFileErrors = {};
}

export function __setMockFileError(path: string, hasError: boolean): void {
  _mockFileErrors[path] = hasError;
}

let _mockDirEntries: Record<string, [string, number][]> = {};
let _mockDirErrors: Record<string, boolean> = {};

export function __setMockDirectoryEntries(path: string, entries: [string, number][]): void {
  _mockDirEntries[path] = entries;
}

export function __setMockDirectoryError(path: string, hasError: boolean): void {
  _mockDirErrors[path] = hasError;
}

export function __resetMockDirectoryEntries(): void {
  _mockDirEntries = {};
  _mockDirErrors = {};
}

let _extensions: Array<{ packageJSON?: unknown }> = [];

export const extensions = {
  get all(): Array<{ packageJSON?: unknown }> {
    return _extensions;
  },
};

export function __setExtensions(list: Array<{ packageJSON?: unknown }>): void {
  _extensions = list;
}

export function __resetExtensions(): void {
  _extensions = [];
}

export namespace workspace {
  export function getConfiguration(_section?: string, _resource?: unknown) {
    return {
      get: <T>(_key: string, defaultValue?: T) =>
        (_key in _configValues ? _configValues[_key] : defaultValue) as T,
      inspect: <T>(key: string) => ({
        key,
        globalValue: key in _configValues ? (_configValues[key] as T) : undefined,
      }),
      update: async <T>(_key: string, value: T, _target?: unknown) => {
        _configValues[_key] = value;
      },
    };
  }
  export function findFiles(pattern: string | RelativePattern) {
    const patternStr = typeof pattern === 'string' ? pattern : (pattern?.pattern ?? '');
    const matches = _mockFindFilesResult[patternStr] ?? [];
    return Promise.resolve(
      matches.map((p) => ({
        fsPath: p,
        path: p,
        scheme: 'file',
        toString: () => p,
        toJSON: () => p,
      })),
    );
  }
  const _contentProviders: Record<string, any> = {};

  export function registerTextDocumentContentProvider(scheme: string, provider: any) {
    _contentProviders[scheme] = provider;
    return {
      dispose: () => {
        delete _contentProviders[scheme];
      },
    };
  }

  export function __getTextDocumentContentProvider(scheme: string): any {
    return _contentProviders[scheme];
  }

  export function __resetTextDocumentContentProviders(): void {
    for (const key of Object.keys(_contentProviders)) delete _contentProviders[key];
  }
  export const fs = {
    readFile: (uri: any) => {
      const path = uri.fsPath ?? uri;
      if (_mockFileErrors[path]) {
        return Promise.reject(new Error('mock read error'));
      }
      const content = _mockFileContents[path] ?? '';
      return Promise.resolve(Buffer.from(content));
    },
    readDirectory: (uri: any) => {
      const path = uri.fsPath ?? uri;
      const entries = _mockDirEntries[path];
      if (!entries || _mockDirErrors[path]) {
        return Promise.reject(new Error(`mock: diretorio nao encontrado: ${path}`));
      }
      return Promise.resolve(entries.map(([name, type]) => [name, type] as [string, number]));
    },
    stat: (uri: any) => {
      const path = uri.fsPath ?? uri;
      if (_mockDirEntries[path]) return Promise.resolve({ type: 2 });
      if (path in _mockFileContents) return Promise.resolve({ type: 1 });
      return Promise.reject(new Error(`mock: stat nao encontrado: ${path}`));
    },
    writeFile: (uri: any, content: unknown) => {
      const path = uri.fsPath ?? uri;
      if (_writeErrors[path]) return Promise.reject(new Error('mock: write error'));
      _writtenFiles[path] = String(content);
      return Promise.resolve();
    },
  };
  export let workspaceFolders:
    | Array<{ uri: { fsPath: string }; name: string; index: number }>
    | undefined = undefined;

  export function __setWorkspaceFolders(
    folders: Array<{ uri: { fsPath: string }; name: string; index: number }> | undefined,
  ) {
    workspaceFolders = folders;
  }

  export function getWorkspaceFolder(uri: {
    fsPath?: string;
    path?: string;
  }): { uri: { fsPath: string }; name: string; index: number } | undefined {
    const fsPath = uri?.fsPath ?? uri?.path ?? '';
    for (const f of workspaceFolders ?? []) {
      const base = f.uri.fsPath.replace(/[/\\]$/, '');
      if (fsPath === base || fsPath.startsWith(`${base}/`) || fsPath.startsWith(`${base}\\`)) {
        return f;
      }
    }
    return undefined;
  }

  /** Caminho relativo ao primeiro workspace folder (ou o próprio caminho). */
  export function asRelativePath(
    uri: { fsPath?: string } | string,
    _includeWorkspaceFolder?: boolean,
  ) {
    const p = typeof uri === 'string' ? uri : (uri.fsPath ?? '');
    for (const f of workspaceFolders ?? []) {
      const base = f.uri.fsPath.replace(/[/\\]$/, '');
      if (p === base) return '';
      if (p.startsWith(`${base}/`) || p.startsWith(`${base}\\`)) return p.slice(base.length + 1);
    }
    return p;
  }

  export function openTextDocument(arg: { fsPath?: string; path?: string } | string) {
    const p = typeof arg === 'string' ? arg : (arg.fsPath ?? arg.path ?? '');
    return Promise.resolve({
      uri: { fsPath: p, path: p, scheme: 'file', toString: () => p },
      getText: () => _mockFileContents[p] ?? '',
    });
  }

  let _watcherCreate: ((uri: unknown) => unknown) | undefined;
  let _watcherChange: ((uri: unknown) => unknown) | undefined;
  let _watcherDelete: ((uri: unknown) => unknown) | undefined;

  export function createFileSystemWatcher(_glob: string) {
    return {
      onDidCreate: (h: (uri: unknown) => unknown) => {
        _watcherCreate = h;
        return { dispose: () => {} };
      },
      onDidChange: (h: (uri: unknown) => unknown) => {
        _watcherChange = h;
        return { dispose: () => {} };
      },
      onDidDelete: (h: (uri: unknown) => unknown) => {
        _watcherDelete = h;
        return { dispose: () => {} };
      },
      dispose: () => {},
    };
  }

  export function __triggerWatcher(event: 'create' | 'change' | 'delete', uri?: unknown): void {
    const handler =
      event === 'create' ? _watcherCreate : event === 'change' ? _watcherChange : _watcherDelete;
    handler?.(uri);
  }

  let _configChangeHandler:
    | ((e: { affectsConfiguration: (s: string) => boolean }) => unknown)
    | undefined;

  export function onDidChangeConfiguration(
    handler: (e: { affectsConfiguration: (s: string) => boolean }) => unknown,
  ) {
    _configChangeHandler = handler;
    return { dispose: () => {} };
  }

  export function __triggerConfigChange(e: { affectsConfiguration: (s: string) => boolean }): void {
    _configChangeHandler?.(e);
  }

  let _saveHandler: ((doc: { fileName: string; uri: unknown }) => unknown) | undefined;

  export function onDidSaveTextDocument(
    handler: (doc: { fileName: string; uri: unknown }) => unknown,
  ) {
    _saveHandler = handler;
    return { dispose: () => {} };
  }

  export function __triggerSave(doc: { fileName: string; uri: unknown }): void {
    _saveHandler?.(doc);
  }
}

export namespace commands {
  const _executedCommands: string[] = [];
  let _executeCommandImpl: ((cmd: string, ...args: unknown[]) => unknown) | undefined;

  export function executeCommand(_cmd: string, ..._args: unknown[]): unknown {
    _executedCommands.push(_cmd);
    return _executeCommandImpl?.(_cmd, ..._args);
  }

  export function __getExecutedCommands(): string[] {
    return [..._executedCommands];
  }

  export function __resetExecutedCommands(): void {
    _executedCommands.length = 0;
  }

  export function __setExecuteCommandImpl(
    fn: ((cmd: string, ...args: unknown[]) => unknown) | undefined,
  ): void {
    _executeCommandImpl = fn;
  }

  const _registeredCommands: Record<string, (...args: unknown[]) => unknown> = {};

  export function registerCommand(
    command: string,
    callback: (...args: unknown[]) => unknown,
  ): { dispose: () => void } {
    _registeredCommands[command] = callback;
    return {
      dispose: () => {
        delete _registeredCommands[command];
      },
    };
  }

  export function __getRegisteredCommand(
    command: string,
  ): ((...args: unknown[]) => unknown) | undefined {
    return _registeredCommands[command];
  }

  export function __resetRegisteredCommands(): void {
    for (const key of Object.keys(_registeredCommands)) delete _registeredCommands[key];
  }
}

const _openedExternal: string[] = [];

export function __getOpenedExternal(): string[] {
  return [..._openedExternal];
}

export function __resetOpenedExternal(): void {
  _openedExternal.length = 0;
}

export namespace env {
  export const language = 'pt-BR';
  export const clipboard = {
    writeText: async (s: string) => {
      _clipboardText = s;
    },
  };
  export function openExternal(uri: { toString(): string }): Promise<boolean> {
    _openedExternal.push(uri.toString());
    return Promise.resolve(true);
  }
}

export const ProgressLocation = { SourceControl: 1, Window: 10, Notification: 15 } as const;

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested(listener: (e: unknown) => void): { dispose: () => void };
}

const _cancellationTokenSources: CancellationTokenSource[] = [];

export class CancellationTokenSource {
  private listeners = new Set<(e: unknown) => void>();
  private cancelled = false;
  private disposed = false;
  private cancellations = 0;
  token: CancellationToken;

  constructor() {
    const source = this;
    this.token = {
      get isCancellationRequested() {
        return source.cancelled;
      },
      onCancellationRequested(listener: (e: unknown) => void) {
        if (source.cancelled) {
          listener(undefined);
          return { dispose: () => {} };
        }
        source.listeners.add(listener);
        return {
          dispose: () => {
            source.listeners.delete(listener);
          },
        };
      },
    };
    _cancellationTokenSources.push(this);
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  get cancelCount(): number {
    return this.cancellations;
  }

  cancel(): void {
    if (this.cancelled) return;
    this.cancelled = true;
    this.cancellations += 1;
    for (const listener of [...this.listeners]) listener(undefined);
    this.listeners.clear();
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }
}

export function __getCancellationTokenSources(): CancellationTokenSource[] {
  return [..._cancellationTokenSources];
}

export function __resetCancellationTokenSources(): void {
  _cancellationTokenSources.length = 0;
}

export class TestRunRequest {
  constructor(
    public include: readonly vscode.TestItem[] | undefined = undefined,
    public exclude: readonly vscode.TestItem[] | undefined = undefined,
    public profile: vscode.TestRunProfile | undefined = undefined,
    public continuous?: boolean,
    public preserveFocus = false,
  ) {}
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];
  event = (listener: (e: T) => void) => {
    this.listeners.push(listener);
    return {
      dispose: () => {
        this.listeners = this.listeners.filter((l) => l !== listener);
      },
    };
  };
  fire(data?: T) {
    for (const l of [...this.listeners]) l(data as T);
  }
  dispose() {
    this.listeners = [];
  }
}

export class CodeLens {
  command?: { title: string; command: string; arguments?: unknown[] };
  range: Range;
  constructor(range: Range, command?: { title: string; command: string; arguments?: unknown[] }) {
    this.range = range;
    this.command = command;
  }
}

export const CodeActionKind = {
  Empty: 'empty',
  QuickFix: 'quickfix',
  Refactor: 'refactor',
} as const;

export class CodeAction {
  title: string;
  kind?: string;
  command?: { title: string; command: string; arguments?: unknown[] };
  diagnostics?: Diagnostic[];
  constructor(title: string, kind?: string) {
    this.title = title;
    this.kind = kind;
  }
}

const _progressReports: unknown[] = [];
let _progressSource: CancellationTokenSource | undefined;

export function __getProgressReports(): unknown[] {
  return [..._progressReports];
}

export function __cancelProgress(): void {
  _progressSource?.cancel();
}

export namespace window {
  export function showInputBox(_options?: {
    title?: string;
    prompt?: string;
    placeHolder?: string;
    password?: boolean;
    ignoreFocusOut?: boolean;
  }) {
    if (_inputBoxResults.length > 0) return Promise.resolve(_inputBoxResults.shift());
    return Promise.resolve(_inputBoxResult);
  }
  export function showQuickPick(
    _items: readonly unknown[],
    _options?: { placeHolder?: string; matchOnDescription?: boolean },
  ) {
    _lastQuickPickItems = _items;
    if (_quickPickResults.length > 0) return Promise.resolve(_quickPickResults.shift());
    return Promise.resolve(_quickPickResult);
  }
  export function showSaveDialog(options?: unknown) {
    _lastSaveDialogOptions = options;
    return Promise.resolve(_saveDialogResult);
  }
  export function showErrorMessage(message: string) {
    _errorMessages.push(message);
  }
  export function showInformationMessage(message: string, ..._items: string[]) {
    _informationMessages.push(message);
    return Promise.resolve(_informationResult);
  }
  export function showWarningMessage(message: string, ..._items: string[]) {
    _warningMessages.push(message);
    return Promise.resolve(_warningResult);
  }
  export function showTextDocument(document: unknown) {
    return Promise.resolve({ document });
  }
  export function withProgress<T>(
    _options: unknown,
    task: (
      progress: { report: (value: unknown) => void },
      token: CancellationToken,
    ) => Thenable<T> | T,
  ): Thenable<T> {
    const progressSource = new CancellationTokenSource();
    _progressSource = progressSource;
    return Promise.resolve(
      task(
        {
          report: (value: unknown) => {
            _progressReports.push(value);
          },
        },
        progressSource.token,
      ),
    );
  }
  export function createOutputChannel(name: string, _options?: { log?: boolean }) {
    if (!_outputChannels[name]) _outputChannels[name] = [];
    const push = (text: string) => {
      if (!_outputChannels[name]) _outputChannels[name] = [];
      _outputChannels[name].push(text);
    };
    return {
      name,
      logLevel: 2, // LogLevel.Info
      onDidChangeLogLevel: () => ({ dispose: () => {} }),
      trace: (text: string) => push(`${text}\n`),
      debug: (text: string) => push(`${text}\n`),
      info: (text: string) => push(`${text}\n`),
      warn: (text: string) => push(`${text}\n`),
      error: (text: string) => push(`${text}\n`),
      append: (text: string) => push(text),
      appendLine: (text: string) => push(`${text}\n`),
      show: () => {},
      hide: () => {},
      clear: () => {
        _outputChannels[name] = [];
      },
      dispose: () => {},
    };
  }
  export function createTextEditorDecorationType(_opts: any) {
    return { dispose: () => {} } as TextEditorDecorationType;
  }
  export let activeTextEditor: TextEditor | undefined = undefined;
  export function __setActiveTextEditorForTests(editor: TextEditor | undefined): void {
    activeTextEditor = editor;
  }
  export function createStatusBarItem(_alignment: number, _priority: number) {
    return {
      text: '',
      tooltip: '',
      command: '',
      show: () => {},
      hide: () => {},
      dispose: () => {},
    };
  }
  export const visibleTextEditors: TextEditor[] = _mockVisibleEditors;
  let _activeEditorHandler: ((editor: TextEditor | undefined) => unknown) | undefined;
  export function onDidChangeActiveTextEditor(
    handler: (editor: TextEditor | undefined) => unknown,
  ) {
    _activeEditorHandler = handler;
    return { dispose: () => {} };
  }
  export function __triggerActiveTextEditorChange(editor: TextEditor | undefined): void {
    _activeEditorHandler?.(editor);
  }
}

export const StatusBarAlignment = { Left: 1, Right: 2 } as const;

export const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 } as const;

export class DebugAdapterInlineImplementation {
  _adapter: unknown;
  constructor(adapter: unknown) {
    this._adapter = adapter;
  }
}

export namespace debug {
  const started: Record<string, unknown>[] = [];
  export function startDebugging(_folder: unknown, config: Record<string, unknown>) {
    started.push(config);
    return Promise.resolve();
  }
  export function __getStartedConfigs(): Record<string, unknown>[] {
    return started;
  }

  const _descriptorFactories: Record<string, unknown> = {};
  const _configProviders: Record<string, unknown> = {};
  let _registrationShouldThrow = false;

  export function __setDebugRegistrationThrow(value: boolean): void {
    _registrationShouldThrow = value;
  }

  export function registerDebugAdapterDescriptorFactory(type: string, factory: unknown) {
    if (_registrationShouldThrow) throw new Error('registro indisponível');
    _descriptorFactories[type] = factory;
    return { dispose: () => {} };
  }
  export function registerDebugConfigurationProvider(type: string, provider: unknown) {
    if (_registrationShouldThrow) throw new Error('registro indisponível');
    _configProviders[type] = provider;
    return { dispose: () => {} };
  }
  export function __getDebugAdapterFactory(type: string): unknown {
    return _descriptorFactories[type];
  }
  export function __getDebugConfigProvider(type: string): unknown {
    return _configProviders[type];
  }
}

export const FileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64,
} as const;

export const TestRunProfileKind = { Run: 1, Coverage: 2, Debug: 3 } as const;

export class TestItemCollection implements vscode.TestItemCollection {
  private map = new Map<string, vscode.TestItem>();
  add(item: vscode.TestItem): void {
    this.map.set(item.id, item);
  }
  get(id: string): vscode.TestItem | undefined {
    return this.map.get(id);
  }
  forEach(
    callback: (item: vscode.TestItem, collection: vscode.TestItemCollection) => unknown,
    thisArg?: unknown,
  ): void {
    for (const item of this.map.values()) callback.call(thisArg, item, this);
  }
  get size(): number {
    return this.map.size;
  }
  replace(items: readonly vscode.TestItem[]): void {
    this.map.clear();
    for (const item of items) this.add(item);
  }
  delete(id: string): void {
    this.map.delete(id);
  }
  [Symbol.iterator](): Iterator<[string, vscode.TestItem]> {
    return this.map.entries();
  }
  /** Atalho de teste: snapshot dos itens (não existe na API real). */
  toArray(): vscode.TestItem[] {
    return [...this.map.values()];
  }
}

export class TestController {
  items = new TestItemCollection();
  resolveHandler: ((item?: vscode.TestItem) => void | Thenable<void>) | undefined = undefined;
  refreshHandler: (() => void | Thenable<void>) | undefined = undefined;
  runProfiles: vscode.TestRunProfile[] = [];
  constructor(
    public id: string,
    public label: string,
  ) {}
  createTestItem(id: string, label: string, uri?: vscode.Uri): TestItem {
    return new TestItem(id, label, uri);
  }
  createRunProfile(
    name: string,
    kind: number,
    runHandler: unknown,
    isDefault?: boolean,
  ): vscode.TestRunProfile {
    const profile: vscode.TestRunProfile = {
      label: name,
      kind: kind as vscode.TestRunProfileKind,
      isDefault: isDefault ?? false,
      onDidChangeDefault: new EventEmitter<boolean>().event,
      supportsContinuousRun: false,
      tag: undefined,
      runHandler: runHandler as vscode.TestRunProfile['runHandler'],
      configureHandler: undefined,
      dispose: () => {},
    };
    this.runProfiles.push(profile);
    return profile;
  }
  createTestRun(
    _request?: vscode.TestRunRequest,
    _name?: string,
    _persist?: boolean,
  ): vscode.TestRun {
    return new TestRun();
  }
  invalidateTestResults(_item?: vscode.TestItem | vscode.TestItem[]): void {}
  dispose(): void {}
}

let _lastTestController: TestController | undefined;

export namespace tests {
  export function createTestController(id: string, label: string): TestController {
    _lastTestController = new TestController(id, label);
    return _lastTestController;
  }
  export function __getLastTestController(): TestController | undefined {
    return _lastTestController;
  }
}

export class TestMessage implements vscode.TestMessage {
  message: string;
  expectedOutput?: string;
  actualOutput?: string;
  location?: Location;
  constructor(message: string) {
    this.message = message;
  }
}

export class TestRun implements vscode.TestRun {
  name = '';
  token: vscode.CancellationToken = new CancellationTokenSource().token;
  isPersisted = false;
  private _onDidDispose = new EventEmitter<void>();
  onDidDispose: vscode.Event<void> = this._onDidDispose.event;
  private _passed: number = 0;
  private _failed: number = 0;
  private _skipped: number = 0;
  private _errored: number = 0;
  private _output: string[] = [];
  passedCount() {
    return this._passed;
  }
  failedCount() {
    return this._failed;
  }
  skippedCount() {
    return this._skipped;
  }
  erroredCount() {
    return this._errored;
  }
  output() {
    return this._output.join('');
  }

  enqueued(_item: vscode.TestItem) {}
  started(_item: vscode.TestItem) {}
  passed(_item: vscode.TestItem, _ms?: number) {
    this._passed++;
  }
  failed(
    _item: vscode.TestItem,
    _message: vscode.TestMessage | readonly vscode.TestMessage[],
    _ms?: number,
  ) {
    this._failed++;
  }
  skipped(_item: vscode.TestItem) {
    this._skipped++;
  }
  errored(
    _item: vscode.TestItem,
    _message: vscode.TestMessage | readonly vscode.TestMessage[],
    _ms?: number,
  ) {
    this._errored++;
  }
  appendOutput(text: string, _location?: vscode.Location) {
    this._output.push(text);
  }
  addCoverage(_coverage: vscode.FileCoverage) {}
  end() {}
}

export class TestItem implements vscode.TestItem {
  label: string;
  uri: vscode.Uri | undefined;
  parent: vscode.TestItem | undefined = undefined;
  children = new TestItemCollection();
  canResolveChildren = false;
  busy = false;
  error: string | vscode.MarkdownString | undefined = undefined;
  tags: vscode.TestTag[] = [];
  range: vscode.Range | undefined = undefined;
  description?: string;
  sortText?: string;
  constructor(
    public id: string,
    label?: string,
    uri?: vscode.Uri,
  ) {
    this.label = label ?? id;
    this.uri = uri;
  }
}

export class Range implements vscode.Range {
  constructor(
    public startLine: number,
    public startCharacter: number,
    public endLine: number,
    public endCharacter: number,
  ) {}
  get start(): Position {
    return new Position(this.startLine, this.startCharacter);
  }
  get end(): Position {
    return new Position(this.endLine, this.endCharacter);
  }
  get isEmpty(): boolean {
    return this.startLine === this.endLine && this.startCharacter === this.endCharacter;
  }
  get isSingleLine(): boolean {
    return this.startLine === this.endLine;
  }
  contains(positionOrRange: vscode.Position | vscode.Range): boolean {
    const isRange = (v: vscode.Position | vscode.Range): v is vscode.Range =>
      'start' in v && 'end' in v;
    const start = isRange(positionOrRange) ? positionOrRange.start : positionOrRange;
    const end = isRange(positionOrRange) ? positionOrRange.end : positionOrRange;
    return this.start.isBeforeOrEqual(start) && this.end.isAfterOrEqual(end);
  }
  isEqual(other: vscode.Range): boolean {
    return this.start.isEqual(other.start) && this.end.isEqual(other.end);
  }
  intersection(other: vscode.Range): Range | undefined {
    const start = this.start.isAfter(other.start) ? this.start : other.start;
    const end = this.end.isBefore(other.end) ? this.end : other.end;
    return start.isAfter(end)
      ? undefined
      : new Range(start.line, start.character, end.line, end.character);
  }
  union(other: vscode.Range): Range {
    const start = this.start.isBefore(other.start) ? this.start : other.start;
    const end = this.end.isAfter(other.end) ? this.end : other.end;
    return new Range(start.line, start.character, end.line, end.character);
  }
  with(start?: vscode.Position, end?: vscode.Position): Range;
  with(change: { start?: vscode.Position; end?: vscode.Position }): Range;
  with(
    startOrChange?: Position | { start?: vscode.Position; end?: vscode.Position },
    end?: vscode.Position,
  ): Range {
    const nextStart =
      startOrChange instanceof Position ? startOrChange : (startOrChange?.start ?? this.start);
    const nextEnd =
      startOrChange instanceof Position ? (end ?? this.end) : (startOrChange?.end ?? this.end);
    return new Range(nextStart.line, nextStart.character, nextEnd.line, nextEnd.character);
  }
}

export class Location implements vscode.Location {
  uri: vscode.Uri;
  range: Range;
  constructor(uri: vscode.Uri, positionOrRange: Position | Range) {
    this.uri = uri;
    this.range =
      positionOrRange instanceof Range
        ? positionOrRange
        : new Range(
            positionOrRange.line,
            positionOrRange.character,
            positionOrRange.line,
            positionOrRange.character,
          );
  }
}

export class ThemeColor {
  constructor(public id: string) {}
}

export class ThemeIcon {
  constructor(public id: string) {}
}

export class MarkdownString {
  constructor(public value: string) {}
}

export const OverviewRulerLane = {
  Right: 2,
  Left: 1,
  Center: 0,
  Full: 7,
} as const;

export interface DecorationOptions {
  range: Range;
  hoverMessage?: MarkdownString;
}

export interface TextEditorDecorationType {
  dispose(): void;
}

export interface TextEditor {
  document: { uri: { toString(): string } };
  setDecorations(decorationType: TextEditorDecorationType, ranges: DecorationOptions[]): void;
}

export function __setVisibleEditors(editors: TextEditor[]): void {
  _mockVisibleEditors.length = 0;
  _mockVisibleEditors.push(...editors);
}

// biome-ignore lint/complexity/noStaticOnlyClass: mimics vscode.FileCoverage API
export class FileCoverage {
  constructor(
    public uri: vscode.Uri,
    public statementCoverage: vscode.TestCoverageCount,
    public branchCoverage?: vscode.TestCoverageCount,
    public declarationCoverage?: vscode.TestCoverageCount,
    public includesTests?: vscode.TestItem[],
  ) {}
  static fromDetails(uri: vscode.Uri, details: readonly vscode.FileCoverageDetail[]): FileCoverage {
    const statements = details.filter(
      (d): d is vscode.StatementCoverage => d instanceof StatementCoverage,
    );
    const declarations = details.filter(
      (d): d is vscode.DeclarationCoverage => d instanceof DeclarationCoverage,
    );
    return new FileCoverage(
      uri,
      {
        covered: statements.filter((s) => s.executed !== false && s.executed !== 0).length,
        total: statements.length,
      },
      undefined,
      {
        covered: declarations.filter((d) => d.executed !== false && d.executed !== 0).length,
        total: declarations.length,
      },
    );
  }
}

export class StatementCoverage {
  constructor(
    public executed: number | boolean,
    public location: vscode.Position | vscode.Range,
  ) {}
}

export class DeclarationCoverage {
  constructor(
    public name: string,
    public executed: boolean | number,
    public location: vscode.Position | vscode.Range,
  ) {}
}

export class Position implements vscode.Position {
  constructor(
    public line: number,
    public character: number,
  ) {}
  isBefore(other: vscode.Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character);
  }
  isBeforeOrEqual(other: vscode.Position): boolean {
    return this.isBefore(other) || this.isEqual(other);
  }
  isAfter(other: vscode.Position): boolean {
    return !this.isBeforeOrEqual(other);
  }
  isAfterOrEqual(other: vscode.Position): boolean {
    return !this.isBefore(other);
  }
  isEqual(other: vscode.Position): boolean {
    return this.line === other.line && this.character === other.character;
  }
  compareTo(other: vscode.Position): number {
    if (this.line !== other.line) return this.line < other.line ? -1 : 1;
    if (this.character !== other.character) return this.character < other.character ? -1 : 1;
    return 0;
  }
  translate(lineDelta?: number, characterDelta?: number): Position;
  translate(change: { lineDelta?: number; characterDelta?: number }): Position;
  translate(
    lineDeltaOrChange: number | { lineDelta?: number; characterDelta?: number } = 0,
    characterDelta = 0,
  ): Position {
    const lineDelta =
      typeof lineDeltaOrChange === 'number'
        ? lineDeltaOrChange
        : (lineDeltaOrChange.lineDelta ?? 0);
    const charDelta =
      typeof lineDeltaOrChange === 'number'
        ? characterDelta
        : (lineDeltaOrChange.characterDelta ?? 0);
    return new Position(this.line + lineDelta, this.character + charDelta);
  }
  with(line?: number, character?: number): Position;
  with(change: { line?: number; character?: number }): Position;
  with(
    lineOrChange?: number | { line?: number; character?: number },
    character?: number,
  ): Position {
    const line =
      typeof lineOrChange === 'number' ? lineOrChange : (lineOrChange?.line ?? this.line);
    const characterValue =
      typeof lineOrChange === 'number'
        ? (character ?? this.character)
        : (lineOrChange?.character ?? this.character);
    return new Position(line, characterValue);
  }
}

export namespace DiagnosticSeverity {
  // biome-ignore lint/suspicious/noShadowRestrictedNames: matches vscode.DiagnosticSeverity.Error
  export const Error = 0;
  export const Warning = 1;
  export const Information = 2;
  export const Hint = 3;
}

export class Diagnostic {
  constructor(
    public range: Range,
    public message: string,
    public severity: number = DiagnosticSeverity.Error,
  ) {}
  source?: string;
  code?: unknown;
}

export class DiagnosticCollection {
  private _diags = new Map<string, Diagnostic[]>();
  set(uri: { toString(): string }, diagnostics: Diagnostic[]) {
    this._diags.set(uri.toString(), diagnostics);
  }
  get(uri: { toString(): string }): Diagnostic[] | undefined {
    return this._diags.get(uri.toString());
  }
  delete(uri: { toString(): string }) {
    this._diags.delete(uri.toString());
  }
  clear() {
    this._diags.clear();
  }
  dispose() {}
}

let _lastDiagnosticCollection: DiagnosticCollection | undefined;

export function __getLastDiagnosticCollection(): DiagnosticCollection | undefined {
  return _lastDiagnosticCollection;
}

let _lastCodeActionsProvider: unknown;

export const languages = {
  createDiagnosticCollection(_name: string): DiagnosticCollection {
    _lastDiagnosticCollection = new DiagnosticCollection();
    return _lastDiagnosticCollection;
  },
  registerCodeLensProvider(_selector: unknown, _provider: unknown) {
    return { dispose: () => {} };
  },
  registerCodeActionsProvider(_selector: unknown, provider: unknown) {
    _lastCodeActionsProvider = provider;
    return { dispose: () => {} };
  },
  __getLastCodeActionsProvider(): {
    provideCodeActions: (document: unknown) => Array<{ title: string }>;
  } {
    return _lastCodeActionsProvider as {
      provideCodeActions: (document: unknown) => Array<{ title: string }>;
    };
  },
  __resetCodeActionsProvider(): void {
    _lastCodeActionsProvider = undefined;
  },
};

export class RelativePattern {
  pattern: string;
  base: string;
  constructor(base: any, pattern: string) {
    this.base =
      typeof base === 'string' ? base : (base?.uri?.fsPath ?? base?.fsPath ?? String(base));
    this.pattern = pattern;
  }
}
