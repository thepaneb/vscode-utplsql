/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as oracledb from 'oracledb';

// PRD-150 RF1: o eixo `--thick-full` não pode passar em thin. O preload
// (`thickSetup.ts`) já falha o host; esta guarda torna o falso-verde visível na
// suíte quando o preload não rodar (config errada) ou o driver regredir.

const thickAxis = process.env.UTPLSQL_THICK_TEST === '1';
const describeThick = thickAxis ? describe : describe.skip;

describeThick('thick-full: guarda de thick real (PRD-150)', () => {
  it('o preload marcou a ativação thick', () => {
    assert.strictEqual(process.env.UTPLSQL_THICK_ACTIVE, '1');
  });

  it('o driver está em thick (oracledb.thin === false)', () => {
    assert.strictEqual(oracledb.thin, false);
  });
});
