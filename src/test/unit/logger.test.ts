import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { logger } from '../../logger';

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
