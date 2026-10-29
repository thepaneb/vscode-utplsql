/**
 * Guarda de compilação do stub de `vscode` contra `@types/vscode` (PRD-114).
 *
 * O stub é obrigado a continuar estruturalmente compatível com as classes que
 * o produto instancia/usa. `TestItem`, `TestRun`, `Position`, `Range`,
 * `Location` e `TestMessage` usam `implements` no próprio stub; aqui ficam as
 * asserções que dependem de instâncias (classes de `@types/vscode` com membros
 * privados não podem ser `implements`, então usamos `Pick`).
 */
import type * as vscode from 'vscode';
import {
  DeclarationCoverage,
  FileCoverage,
  Location,
  Position,
  Range,
  StatementCoverage,
  TestItem,
  TestMessage,
  TestRun,
  TestRunRequest,
  Uri,
} from './vscode-stub';

type UsedUri = Pick<typeof vscode.Uri, 'file' | 'parse' | 'joinPath'>;
const _uri: UsedUri = Uri;

const _item: vscode.TestItem = new TestItem('id', 'label');
const _run: vscode.TestRun = new TestRun();
const _request: vscode.TestRunRequest = new TestRunRequest();
const _position: vscode.Position = new Position(0, 0);
const _range: vscode.Range = new Range(0, 0, 0, 0);
const _location: vscode.Location = new Location(Uri.file('/x'), _position);
const _message: vscode.TestMessage = new TestMessage('msg');

const _fileCoverage: Pick<
  vscode.FileCoverage,
  'uri' | 'statementCoverage' | 'declarationCoverage'
> = new FileCoverage(Uri.file('/x'), { covered: 0, total: 0 });
const _statement: Pick<vscode.StatementCoverage, 'executed' | 'location'> = new StatementCoverage(
  1,
  _position,
);
const _declaration: Pick<vscode.DeclarationCoverage, 'name' | 'executed' | 'location'> =
  new DeclarationCoverage('name', true, _position);

export type _StubTypeChecks = [
  typeof _uri,
  typeof _item,
  typeof _run,
  typeof _request,
  typeof _position,
  typeof _range,
  typeof _location,
  typeof _message,
  typeof _fileCoverage,
  typeof _statement,
  typeof _declaration,
];
