export namespace Uri {
  export function file(path: string) {
    return { fsPath: path, path, scheme: 'file', toString: () => path, toJSON: () => path };
  }
  export function parse(s: string) {
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
let _mockFileContents: Record<string, string> = {};
let _mockFindFilesResult: Record<string, string[]> = {};
let _mockFileErrors: Record<string, boolean> = {};
const _mockVisibleEditors: TextEditor[] = [];

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

export namespace workspace {
  export function getConfiguration(_section?: string) {
    return {
      get: <T>(_key: string, defaultValue?: T) =>
        (_key in _configValues ? _configValues[_key] : defaultValue) as T,
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
  export const fs = {
    // biome-ignore lint/suspicious/noExplicitAny: VSCode Uri stringish stub
    readFile: (uri: any) => {
      const path = uri.fsPath ?? uri;
      if (_mockFileErrors[path]) {
        return Promise.reject(new Error('mock read error'));
      }
      const content = _mockFileContents[path] ?? '';
      return Promise.resolve(Buffer.from(content));
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
}

export namespace commands {
  export function executeCommand(_cmd: string, ..._args: unknown[]): void {}
}

export class EventEmitter<T> {
  event = (_listener: (e: T) => void) => ({ dispose: () => {} });
  fire(_data?: T) {}
  dispose() {}
}

export class CodeLens {
  command?: { title: string; command: string; arguments?: unknown[] };
  range: Range;
  constructor(range: Range, command?: { title: string; command: string; arguments?: unknown[] }) {
    this.range = range;
    this.command = command;
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
    return Promise.resolve(_inputBoxResult);
  }
  export function showErrorMessage(_message: string) {}
  export function showInformationMessage(_message: string) {}
  export function showWarningMessage(_message: string) {}
  export function createTextEditorDecorationType(
    // biome-ignore lint/suspicious/noExplicitAny: DecorationRenderOptions stub
    _opts: any,
  ) {
    return { dispose: () => {} } as TextEditorDecorationType;
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
  export function onDidChangeActiveTextEditor(
    _handler: (editor: TextEditor | undefined) => unknown,
  ) {
    return { dispose: () => {} };
  }
}

export const StatusBarAlignment = { Left: 1, Right: 2 } as const;

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
  // biome-ignore lint/suspicious/noExplicitAny: VSCode Uri stub
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

export const languages = {
  createDiagnosticCollection(_name: string): DiagnosticCollection {
    return new DiagnosticCollection();
  },
};

export class RelativePattern {
  pattern: string;
  base: string;
  constructor(
    // biome-ignore lint/suspicious/noExplicitAny: stringish-forgiving constructor
    base: any,
    pattern: string,
  ) {
    this.base =
      typeof base === 'string' ? base : (base?.uri?.fsPath ?? base?.fsPath ?? String(base));
    this.pattern = pattern;
  }
}
