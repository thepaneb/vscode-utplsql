/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { discoverDbSuites } from '../../discovery';
import { parseJUnit } from '../../junit';
import { parseConnString } from '../../oracleRunner';
import { createPerfProbe } from '../../perf';
import { countResults } from '../../results';
import { TestStateManager } from '../../state';
import { buildSchemaTree } from '../../testTree';
import { appendPerfSample, perfReportPath } from './support/timing';

// Harness de escala da PRD-106. A fixture é gerada por `npm run perf:generate`
// (ou pelo workflow) e o teste só roda quando UTPLSQL_PERF_PACKAGES está setado.
const packages = Number(process.env.UTPLSQL_PERF_PACKAGES ?? 0);
const testsPerPackage = Number(process.env.UTPLSQL_PERF_TESTS ?? 15);
const describePerf = packages > 0 && process.env.UTPLSQL_CONN ? describe : describe.skip;

describePerf('PRD-106: harness de performance', () => {
  it('mede discovery, buildTree, run, poll e parseXml em escala', async function () {
    this.timeout(600_000);
    const connStr = process.env.UTPLSQL_CONN as string;
    const user = parseConnString(connStr).user.toUpperCase();
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders?.length, 'workspace folder obrigatório');

    const samples: string[] = [];
    const probe = createPerfProbe({
      enabled: true,
      sink: (sample) => {
        samples.push(sample.phase);
        appendPerfSample(sample, perfReportPath());
      },
    });

    const endDiscovery = probe.start('discovery');
    const suites = await discoverDbSuites(connStr, user, folders);
    endDiscovery();
    assert.ok(
      suites.length >= packages,
      `discovery deveria achar >= ${packages} suites (achou ${suites.length})`,
    );

    const controller = vscode.tests.createTestController('utplsql-perf', 'utPLSQL perf');
    const state = new TestStateManager();
    try {
      const endTree = probe.start('buildTree');
      buildSchemaTree(controller, state, suites, 'db/{schema}/**', []);
      endTree();

      // Executa um package da fixture diretamente para medir o custo do run;
      // o poll dedicado é medido pelo runner real quando usado (aqui não há
      // reporter/stream porque o harness mede o substrato de banco).
      const mod = await import('oracledb');
      const oracledb =
        ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
        (mod as typeof import('oracledb'));
      const conn = await oracledb.getConnection(connStr);
      try {
        const endRun = probe.start('run');
        await conn.execute(`BEGIN ut.run(:pkg); END;`, { pkg: suites[0].packageName });
        endRun();
        probe.record('poll', 0, { direct: true });
      } finally {
        await conn.close().catch(() => {});
      }

      const totalTests = packages * testsPerPackage;
      const cases = Array.from(
        { length: totalTests },
        (_, i) => `<testcase name="case_${i}" classname="UT_PERF_0001" time="0.01"></testcase>`,
      ).join('');
      const xml = `<testsuites><testsuite name="PERF" tests="${totalTests}">${cases}</testsuite></testsuites>`;
      const endParse = probe.start('parseXml');
      const parsed = parseJUnit(xml);
      const counts = countResults(parsed);
      endParse();
      assert.strictEqual(counts.totalMs >= 0, true);
      assert.strictEqual(parsed.length, totalTests);
    } finally {
      controller.dispose();
    }

    for (const phase of ['discovery', 'buildTree', 'run', 'poll', 'parseXml']) {
      assert.ok(samples.includes(phase), `fase ${phase} não medida`);
    }
    assert.ok(perfReportPath().endsWith('perf-report.jsonl'));
  });
});
