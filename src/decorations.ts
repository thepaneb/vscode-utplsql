import * as vscode from 'vscode';
import { readConfig } from './config';

const passedDecoration = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: ' ✓',
    color: new vscode.ThemeColor('testing.iconPassed'),
    margin: '0 0 0 0.5em',
  },
  overviewRulerColor: new vscode.ThemeColor('testing.iconPassed'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
});

const failedDecoration = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: ' ✗',
    color: new vscode.ThemeColor('testing.iconFailed'),
    margin: '0 0 0 0.5em',
  },
  overviewRulerColor: new vscode.ThemeColor('testing.iconFailed'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
});

const skippedDecoration = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: ' ⚠',
    color: new vscode.ThemeColor('testing.iconSkipped'),
    margin: '0 0 0 0.5em',
  },
  overviewRulerColor: new vscode.ThemeColor('testing.iconSkipped'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
});

const erroredDecoration = vscode.window.createTextEditorDecorationType({
  after: {
    contentText: ' ⚠',
    color: new vscode.ThemeColor('testing.iconErrored'),
    margin: '0 0 0 0.5em',
  },
  overviewRulerColor: new vscode.ThemeColor('testing.iconErrored'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
});

interface LineEntry {
  line: number;
  status: string;
  message?: string;
}

export class DecorationManager implements vscode.Disposable {
  private lastEntries = new Map<string, LineEntry[]>();

  update(
    resultMap: Map<string, { status: string; message?: string }>,
    controller: vscode.TestController,
  ): void {
    if (!readConfig().decorationsEnabled) return;
    this.lastEntries.clear();

    for (const [id, result] of resultMap) {
      const item = findTestItem(controller, id);
      if (!item) continue;
      const range = item.range;
      if (!range) continue;

      const uriKey = item.uri?.toString();
      if (!uriKey) continue;

      let entries = this.lastEntries.get(uriKey);
      if (!entries) {
        entries = [];
        this.lastEntries.set(uriKey, entries);
      }
      entries.push({ line: range.start.line, status: result.status, message: result.message });
    }

    this.applyToVisibleEditors();
  }

  clear(): void {
    this.lastEntries.clear();
    this.applyToVisibleEditors();
  }

  applyToVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      const uriKey = editor.document.uri.toString();
      const entries = this.lastEntries.get(uriKey) ?? [];
      this.applyToEditor(editor, entries);
    }
  }

  applyToEditor(editor: vscode.TextEditor, entries: LineEntry[]): void {
    const passed: vscode.DecorationOptions[] = [];
    const failed: vscode.DecorationOptions[] = [];
    const skipped: vscode.DecorationOptions[] = [];
    const errored: vscode.DecorationOptions[] = [];

    for (const e of entries) {
      const range = new vscode.Range(e.line, 0, e.line, 0);
      const hoverMessage = e.message ? new vscode.MarkdownString(e.message) : undefined;
      const options: vscode.DecorationOptions = { range, hoverMessage };

      switch (e.status) {
        case 'passed':
          passed.push(options);
          break;
        case 'failed':
          failed.push(options);
          break;
        case 'skipped':
          skipped.push(options);
          break;
        case 'error':
          errored.push(options);
          break;
      }
    }

    editor.setDecorations(passedDecoration, passed);
    editor.setDecorations(failedDecoration, failed);
    editor.setDecorations(skippedDecoration, skipped);
    editor.setDecorations(erroredDecoration, errored);
  }

  hasResults(): boolean {
    return this.lastEntries.size > 0;
  }

  dispose(): void {
    passedDecoration.dispose();
    failedDecoration.dispose();
    skippedDecoration.dispose();
    erroredDecoration.dispose();
  }
}

function findTestItem(controller: vscode.TestController, id: string): vscode.TestItem | undefined {
  const suiteMatch = controller.items.get(id);
  if (suiteMatch) return suiteMatch;

  for (const [, suite] of controller.items) {
    for (const [, child] of suite.children) {
      if (child.id === id) return child;
    }
  }
  return undefined;
}
