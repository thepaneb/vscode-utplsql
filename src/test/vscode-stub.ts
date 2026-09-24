export namespace Uri {
  export function file(path: string) {
    return { fsPath: path, path, scheme: 'file', toString: () => path, toJSON: () => path };
  }
  export function parse(s: string) {
    const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):(.*)$/.exec(s);
    if (schemeMatch && !/^[a-zA-Z]:[\\/]/.test(s)) {
      const scheme = schemeMatch[1];
      const rest = schemeMatch[2] || '/';
      return { fsPath: s, path: rest, scheme, toString: () => s, toJSON: () => s };
    }
    return { fsPath: s, path: s, scheme: 'file', toString: () => s, toJSON: () => s };
  }
  export function joinPath(base: { fsPath: string }, ...pathSegments: string[]) {
    const basePath = (base as { fsPath: string }).fsPath.replace(/[/\\]$/, '');
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
  window.activeTextEditor = editor;
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

export namespace workspace {
  export function getConfiguration(_section?: string) {
    return {
      get: <T>(_key: string, defaultValue?: T) =>
        (_key in _configValues ? _configValues[_key] : defaultValue) as T,
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
  };
  export let workspaceFolders:
    | Array<{ uri: { fsPath: string }; name: string; index: number }>
    | undefined;

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

export namespace env {
  export const language = 'pt-BR';
  export const clipboard = {
    writeText: async (s: string) => {
      _clipboardText = s;
    },
  };
}

export const ProgressLocation = { SourceControl: 1, Window: 10, Notification: 15 } as const;

export interface CancellationToken {
  isCancellationRequested: boolean;
  onCancellationRequested(listener: () => void): { dispose: () => void };
}

export class CancellationTokenSource {
  token: CancellationToken = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  };
  cancel(): void {}
  dispose(): void {}
}

export class TestRunRequest {
  constructor(
    public include?: unknown[],
    public exclude?: unknown,
    public profile?: unknown,
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
    return Promise.resolve(_quickPickResult);
  }
  export function showErrorMessage(message: string) {
    _errorMessages.push(message);
  }
  export function showInformationMessage(message: string) {
    _informationMessages.push(message);
    return Promise.resolve(_informationResult);
  }
  export function showWarningMessage(message: string, ..._items: string[]) {
    _warningMessages.push(message);
    return Promise.resolve(_warningResult);
  }
  export function withProgress<T>(
    _options: unknown,
    task: (
      progress: { report: (value: unknown) => void },
      token: CancellationToken,
    ) => Thenable<T> | T,
  ): Thenable<T> {
    return Promise.resolve(
      task({ report: () => {} }, {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      } as CancellationToken),
    );
  }
  export function createOutputChannel(name: string) {
    if (!_outputChannels[name]) _outputChannels[name] = [];
    return {
      name,
      append: (text: string) => {
        _outputChannels[name].push(text);
      },
      appendLine: (text: string) => {
        _outputChannels[name].push(`${text}\n`);
      },
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
  export let activeTextEditor: TextEditor | undefined;
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

export class TestItemCollection {
  private map = new Map<string, TestItem>();
  add(item: TestItem): void {
    this.map.set(item.id, item);
  }
  get(id: string): TestItem | undefined {
    return this.map.get(id);
  }
  forEach(cb: (item: TestItem) => void): void {
    for (const item of this.map.values()) cb(item);
  }
  get size(): number {
    return this.map.size;
  }
}

export class TestController {
  items = new TestItemCollection();
  resolveHandler?: (item?: TestItem) => unknown;
  refreshHandler?: () => unknown;
  runProfiles: Array<Record<string, unknown>> = [];
  constructor(
    public id: string,
    public label: string,
  ) {}
  createTestItem(id: string, label: string, uri?: unknown): TestItem {
    const item = new TestItem(id);
    (item as { label?: string }).label = label;
    (item as { uri?: unknown }).uri = uri;
    return item;
  }
  createRunProfile(
    name: string,
    kind: number,
    runHandler: unknown,
    isDefault?: boolean,
  ): Record<string, unknown> {
    const profile: Record<string, unknown> = {
      name,
      kind,
      runHandler,
      isDefault,
      dispose: () => {},
    };
    this.runProfiles.push(profile);
    return profile;
  }
  createTestRun(_request?: unknown): TestRun {
    return new TestRun();
  }
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

export class TestMessage {
  message: string;
  constructor(message: string) {
    this.message = message;
  }
}

export class TestRun {
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

  enqueued(_item: TestItem) {}
  started(_item: TestItem) {}
  passed(_item: TestItem, _ms?: number) {
    this._passed++;
  }
  failed(_item: TestItem, _message: TestMessage, _ms?: number) {
    this._failed++;
  }
  skipped(_item: TestItem) {
    this._skipped++;
  }
  errored(_item: TestItem, _message: TestMessage, _ms?: number) {
    this._errored++;
  }
  appendOutput(text: string) {
    this._output.push(text);
  }
  addCoverage(_coverage: FileCoverage) {}
  end() {}
}

export class TestItem {
  id: string;
  children: TestItem[] = [];
  constructor(id: string) {
    this.id = id;
  }
}

export class Range {
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
}

export class Location {
  uri: { fsPath: string; path: string; scheme: string };
  range: Range;
  constructor(
    uri: { fsPath: string; path: string; scheme: string },
    positionOrRange: Position | Range,
  ) {
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
  static fromDetails(_uri: any, _details: StatementCoverage[]) {
    return new FileCoverage();
  }
}

export class StatementCoverage {
  constructor(
    public hits: number,
    public position: Position,
  ) {}
}

export class DeclarationCoverage {
  constructor(
    public name: string,
    public executed: boolean | number,
    public position: Position,
  ) {}
}

export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}
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
  clear() {
    this._diags.clear();
  }
  dispose() {}
}

let _lastDiagnosticCollection: DiagnosticCollection | undefined;

export function __getLastDiagnosticCollection(): DiagnosticCollection | undefined {
  return _lastDiagnosticCollection;
}

export const languages = {
  createDiagnosticCollection(_name: string): DiagnosticCollection {
    _lastDiagnosticCollection = new DiagnosticCollection();
    return _lastDiagnosticCollection;
  },
  registerCodeLensProvider(_selector: unknown, _provider: unknown) {
    return { dispose: () => {} };
  },
  registerCodeActionsProvider(_selector: unknown, _provider: unknown) {
    return { dispose: () => {} };
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
