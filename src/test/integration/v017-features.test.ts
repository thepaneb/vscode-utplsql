/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { UtplsqlCodeLensProvider } from '../../codelens';

// Integração da release 0.17.0 (segue o padrão de v016-features):
//   - PRD-109: `.tps` recebe a linguagem `plsql` e CodeLens;
//   - PRD-105: validado nos unitários (JSON dos snippets);
//   - PRD-108: coberto no bloco com banco (HTML de cobertura).

const TMP_DIR = path.join(__dirname, '../../../src/test/integration/fixtures/tmp-v017');

const TPS_SRC = `CREATE OR REPLACE PACKAGE ut_v017_tps IS
  --%suite(v0.17 TPS)

  --%test(passa)
  PROCEDURE ok;
END ut_v017_tps;
`;

function removeFixtures(): void {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

describe('0.17.0 — PRD-109 (sem banco)', () => {
  after(() => removeFixtures());

  it('reconhece .tps como plsql e gera CodeLens', async () => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const file = path.join(TMP_DIR, 'ut_v017_tps.tps');
    fs.writeFileSync(file, TPS_SRC);

    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    assert.strictEqual(doc.languageId, 'plsql');

    const provider = new UtplsqlCodeLensProvider();
    const lenses = provider.provideCodeLenses(doc, {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    } as vscode.CancellationToken);

    assert.strictEqual(lenses.length, 4, 'suite + test devem gerar 2 lenses cada');
  });
});
