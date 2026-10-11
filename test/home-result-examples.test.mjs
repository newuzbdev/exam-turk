import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';

const compiled = await build({ entryPoints: ['src/pages/home/ui/home-result-examples.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { HOME_RESULT_EXAMPLES, fillWithExampleResults } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const real = n => Array.from({ length: n }, (_, i) => ({ ...HOME_RESULT_EXAMPLES[0], id: `real-${i}`, name: `User ${i}`, isExample: undefined }));

test('real results replace examples and remain unmodified in their API order', () => {
  const inputs = real(15);
  const copy = structuredClone(inputs);
  assert.deepEqual(fillWithExampleResults(inputs, 'ALL'), inputs);
  assert.deepEqual(inputs, copy);
  const few = fillWithExampleResults(inputs.slice(0, 4), 'ALL');
  assert.equal(few.length, 15);
  assert.deepEqual(few.slice(0, 4), inputs.slice(0, 4));
  assert.equal(few.filter(row => row.isExample).length, 11);
  assert.ok(few.every(row => row.isExample || row.id.startsWith('real-')));
});

test('full and section examples follow the selected scope; missing is never zero', () => {
  const full = fillWithExampleResults([], 'FULL');
  assert.ok(full.length > 0);
  assert.ok(full.every(row => [row.dinleme, row.okuma, row.yazma, row.konusma].every(n => n !== null)));
  for (const [scope, field] of [['LISTENING', 'dinleme'], ['READING', 'okuma'], ['WRITING', 'yazma'], ['SPEAKING', 'konusma']]) {
    assert.ok(fillWithExampleResults([], scope).every(row => row[field] !== null));
  }
  const all = fillWithExampleResults([], 'ALL');
  assert.deepEqual(all.slice(0, full.length), full);
  assert.ok(all.some(row => row.dinleme === null));
  assert.equal(fillWithExampleResults([], 'ALL', 0).length, 0);
});

test('all examples are disclosed, uniquely identified and within requested 2026 activity period', () => {
  assert.equal(new Set(HOME_RESULT_EXAMPLES.map(row => row.id)).size, HOME_RESULT_EXAMPLES.length);
  for (const row of HOME_RESULT_EXAMPLES) {
    assert.equal(row.isExample, true);
    assert.match(row.id, /^example-/);
    assert.match(row.date, /^\d{2}\.0[3-9]\.2026$/);
    const completed = [row.dinleme, row.okuma, row.yazma, row.konusma].filter(n => n !== null);
    assert.equal(row.overallScore, Math.round(completed.reduce((a, b) => a + b) / completed.length));
  }
  assert.equal(HOME_RESULT_EXAMPLES.filter(row => /\.0[6-8]\./.test(row.date)).length, 3);
  assert.equal(HOME_RESULT_EXAMPLES.filter(row => /\.09\./.test(row.date)).length, 4);
  assert.ok(HOME_RESULT_EXAMPLES.filter(row => row.avatarUrl).length < HOME_RESULT_EXAMPLES.length / 2);
});
