export namespace Uri {
  export function file(path: string) {
    return { fsPath: path, path, scheme: 'file', toString: () => path, toJSON: () => path };
  }
  export function parse(s: string) {
    return { fsPath: s, path: s, scheme: 'file', toString: () => s, toJSON: () => s };
  }
}

export namespace workspace {
  export function getConfiguration(_section?: string) {
    return { get: <T>(_key: string, defaultValue?: T) => defaultValue };
  }
  export function findFiles(_pattern: string) {
    return Promise.resolve([] as any[]);
  }
  export const fs = {
    readFile: (_uri: any) => Promise.resolve(Buffer.from('')),
  };
  export const workspaceFolders = undefined;
}

export namespace window {
  export function showInputBox(_options?: {
    title?: string;
    prompt?: string;
    placeHolder?: string;
    password?: boolean;
    ignoreFocusOut?: boolean;
  }) {
    return Promise.resolve(undefined as string | undefined);
  }
  export function showErrorMessage(_message: string) {}
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

export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}
}
