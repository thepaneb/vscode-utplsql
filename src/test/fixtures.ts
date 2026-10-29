/**
 * Fixtures tipadas compartilhadas dos testes unitários (PRD-114).
 *
 * Substituem os `as any` usados para montar `TestItem`, `TestRun`, `Uri`,
 * `WorkspaceFolder` e `TestStateManager`. O retorno é sempre o tipo real de
 * `vscode` (ou o mock estruturalmente compatível), então o `tsc` cobra os
 * campos usados pelo produto.
 */
import type * as vscode from 'vscode';
import { TestStateManager } from '../state';
import type { ItemMeta } from '../types';
import {
  EventEmitter,
  TestItem as StubTestItem,
  TestController,
  TestRunRequest,
  Uri,
} from './vscode-stub';

/** `TestRun` com as listas usadas nas asserções dos testes. */
export interface MockTestRun extends vscode.TestRun {
  passedList: Array<{ t: vscode.TestItem; ms?: number }>;
  failedList: Array<{ t: vscode.TestItem; m: vscode.TestMessage; ms?: number }>;
  skippedList: vscode.TestItem[];
  erroredList: Array<{ t: vscode.TestItem; m: vscode.TestMessage; ms?: number }>;
  coverageList: vscode.FileCoverage[];
  output: string[];
}

export const NEVER_TOKEN: vscode.CancellationToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

export function makeTestRun(): MockTestRun {
  const passedList: MockTestRun['passedList'] = [];
  const failedList: MockTestRun['failedList'] = [];
  const skippedList: MockTestRun['skippedList'] = [];
  const erroredList: MockTestRun['erroredList'] = [];
  const coverageList: MockTestRun['coverageList'] = [];
  const output: string[] = [];
  const emitter = new EventEmitter<void>();
  return {
    name: 'mock',
    token: NEVER_TOKEN,
    isPersisted: false,
    onDidDispose: emitter.event,
    enqueued: () => {},
    started: () => {},
    passed: (t, ms) => {
      passedList.push({ t, ms });
    },
    failed: (t, m, ms) => {
      failedList.push({ t, m: Array.isArray(m) ? m[0] : m, ms });
    },
    errored: (t, m, ms) => {
      erroredList.push({ t, m: Array.isArray(m) ? m[0] : m, ms });
    },
    skipped: (t) => {
      skippedList.push(t);
    },
    appendOutput: (s) => {
      output.push(s);
    },
    addCoverage: (fc) => {
      coverageList.push(fc);
    },
    end: () => {},
    passedList,
    failedList,
    skippedList,
    erroredList,
    coverageList,
    output,
  };
}

export function makeUri(path: string): vscode.Uri {
  return Uri.file(path);
}

export function makeFolder(path: string, name = 'root'): vscode.WorkspaceFolder {
  return { uri: makeUri(path), name, index: 0 };
}

export function makeMeta(over: Partial<ItemMeta> = {}): ItemMeta {
  return {
    kind: 'test',
    packageName: 'app',
    procName: 'proc',
    description: 'desc',
    uri: makeUri('/x'),
    ...over,
  } as ItemMeta;
}

export function makeTestItem(id: string, label?: string): StubTestItem {
  return new StubTestItem(id, label ?? id);
}

/** Controller mínimo com o `TestRun` injetado (como `executeRun` consome). */
export function makeController(run: vscode.TestRun): vscode.TestController {
  const controller = new TestController('unit-test', 'Unit Test');
  controller.createTestRun = () => run;
  return controller;
}

export function makeRequest(include: vscode.TestItem[] = []): vscode.TestRunRequest {
  return new TestRunRequest(include);
}

/** `TestStateManager` real com o `getMeta`/`cachedItems` injetados. */
export function makeState<T extends vscode.TestItem>(
  metaMap: Map<T, ItemMeta> = new Map(),
  cachedItems: T[] = [],
): TestStateManager {
  const state = new TestStateManager();
  state.getMeta = (item) => metaMap.get(item as T);
  state.setMeta = () => {};
  state.setCoverage = () => {};
  state.getCoverage = () => [];
  state.clearCoverage = () => {};
  state.setLastResults = () => {};
  state.setLastFailedItems = () => {};
  state.getLastFailedItems = () => [];
  state.persist = () => {};
  state.cachedItems = cachedItems;
  return state;
}
