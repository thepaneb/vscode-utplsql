import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  createOrganizationStrategy,
  type OrganizationContext,
  type OrganizationDeps,
} from '../../organization/strategy';
import { TestStateManager } from '../../state';

function context(over: Partial<OrganizationContext> = {}): OrganizationContext {
  return {
    controller: {} as never,
    state: new TestStateManager(),
    suites: [],
    folders: [],
    schemaPattern: 'db/{schema}/**',
    ...over,
  };
}

function deps(over: Partial<OrganizationDeps> = {}): OrganizationDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    buildFile: () => calls.push('file'),
    buildTag: () => calls.push('tag'),
    buildSchema: (_c, _s, _suites, _pattern, extra) => calls.push(`schema:${extra.join(',')}`),
    discoverSchemas: async () => ['APP'],
    collectAll: async () => [],
    ...over,
  };
}

test('organization: file delega para buildFile e collectAll', async () => {
  const d = deps();
  const strategy = createOrganizationStrategy('file', d);
  assert.strictEqual(strategy.mode, 'file');
  await strategy.build(context());
  assert.deepStrictEqual(d.calls, ['file']);
  await strategy.collectAll(context());
});

test('organization: collectAll é delegado nos três modos', async () => {
  let collected = 0;
  const d = deps({
    collectAll: async () => {
      collected += 1;
      return [];
    },
  });
  await createOrganizationStrategy('file', d).collectAll(context());
  await createOrganizationStrategy('tag', d).collectAll(context());
  await createOrganizationStrategy('schema', d).collectAll(context());
  assert.strictEqual(collected, 3);
});

test('organization: tag delega para buildTag', async () => {
  const d = deps();
  await createOrganizationStrategy('tag', d).build(context());
  assert.deepStrictEqual(d.calls, ['tag']);
});

test('organization: schema descobre schemas e passa extras ao buildSchema', async () => {
  const d = deps();
  const strategy = createOrganizationStrategy('schema', d);
  assert.strictEqual(strategy.mode, 'schema');
  await strategy.build(context({ folders: [{ uri: { fsPath: '/ws' } } as never] }));
  assert.deepStrictEqual(d.calls, ['schema:APP']);
});

test('organization: schema sem folders não chama discoverSchemas', async () => {
  let discovered = 0;
  const d = deps({
    discoverSchemas: async () => {
      discovered += 1;
      return ['APP'];
    },
  });
  await createOrganizationStrategy('schema', d).build(context({ folders: undefined }));
  assert.strictEqual(discovered, 0);
  assert.deepStrictEqual(d.calls, ['schema:']);
});

test('organization: modo desconhecido cai em file', async () => {
  const d = deps();
  await createOrganizationStrategy('owner' as never, d).build(context());
  assert.deepStrictEqual(d.calls, ['file']);
});
