import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { formatLogLine, logger, setLogSink } from '../../logger';

function capture(fn: () => void): string[] {
  const original = console.debug;
  const calls: string[] = [];
  console.debug = (...args: unknown[]) => {
    calls.push(args.map(String).join(' '));
  };
  try {
    fn();
  } finally {
    console.debug = original;
  }
  return calls;
}

test('logger.debug: silencioso sem UTPLSQL_DEBUG', () => {
  delete process.env.UTPLSQL_DEBUG;
  const calls = capture(() => logger.debug('msg', { a: 1 }));
  assert.strictEqual(calls.length, 0);
});

test('logger.debug: emite com UTPLSQL_DEBUG=1', () => {
  process.env.UTPLSQL_DEBUG = '1';
  try {
    const calls = capture(() => logger.debug('msg', { a: 1 }));
    assert.strictEqual(calls.length, 1);
    assert.match(calls[0], /\[utplsql\]/);
    assert.match(calls[0], /msg/);
  } finally {
    delete process.env.UTPLSQL_DEBUG;
  }
});

test('logger.debug: nunca lanca', () => {
  process.env.UTPLSQL_DEBUG = '1';
  try {
    assert.doesNotThrow(() => logger.debug('x'));
  } finally {
    delete process.env.UTPLSQL_DEBUG;
  }
});

test('logger: sink recebe nível e contexto (LogOutputChannel)', () => {
  const seen: Array<[string, string]> = [];
  setLogSink((level, msg, ctx) => seen.push([level, formatLogLine(msg, ctx)]));
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    logger.info('oi', { a: 1 });
    logger.warn('cuidado');
    logger.error('erro', { b: 2 });
    logger.debug('dbg', { c: 3 }); // vai ao sink mesmo sem UTPLSQL_DEBUG (nível do canal filtra)
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
    setLogSink(undefined);
  }
  assert.deepStrictEqual(
    seen.map((s) => s[0]),
    ['info', 'warn', 'error', 'debug'],
  );
  assert.match(seen[0][1], /"a":1/);
  assert.strictEqual(seen[1][1], 'cuidado');
  assert.match(seen[3][1], /"c":3/);
});

test('logger: sink defeituoso nunca lança', () => {
  setLogSink(() => {
    throw new Error('boom');
  });
  try {
    assert.doesNotThrow(() => logger.info('x'));
  } finally {
    setLogSink(undefined);
  }
});
