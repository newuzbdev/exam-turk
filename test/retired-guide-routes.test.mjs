import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOfflineComponent } from './helpers/offline-react.mjs';

const { studentPath } = await loadOfflineComponent('src/routes/student-route-paths.ts');
const { safeAccessReturnTo } = await loadOfflineComponent('src/utils/access-link-context.ts');

test('retired guide addresses lead to the dashboard after sign-in', () => {
  assert.equal(studentPath('/how-it-works'), '/app');
  assert.equal(studentPath('/app/nasil-calisir'), '/app');
  assert.equal(studentPath('/app/profil'), '/app/profil');
});

test('a saved return link cannot reopen the retired guide or retain a raw share token', () => {
  assert.equal(safeAccessReturnTo('/app/nasil-calisir?share=synthetic'), '/app');
  assert.equal(safeAccessReturnTo('/how-it-works'), '/app');
});

test('retired demo links open the current mock catalog and reports', () => {
  for (const prefix of ['', '/app']) {
    assert.equal(studentPath(`${prefix}/speaking-demo`), '/app/test');
    assert.equal(studentPath(`${prefix}/speaking-demo/`), '/app/test');
    assert.equal(studentPath(`${prefix}/test-unified-results`), '/app/sonuclar');
    assert.equal(studentPath(`${prefix}/unified-results`), '/app/sonuclar');
  }
  assert.equal(studentPath('/app/speaking-test/current-exam'), '/app/speaking-test/current-exam');
  assert.equal(studentPath('/app/pratik'), '/app/pratik');
});

test('old combined report links preserve the result identity on the current screen', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  for (const prefix of ['', '/app']) {
    assert.equal(studentPath(`${prefix}/unified-results/${id}`), `/app/overall-results/${id}`);
    assert.equal(studentPath(`${prefix}/unified-results/${id}/`), `/app/overall-results/${id}`);
  }
  assert.equal(studentPath(`/app/overall-results/${id}`), `/app/overall-results/${id}`);
});

test('saved retired links preserve safe report context and scrub share tokens', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  assert.equal(safeAccessReturnTo(`/unified-results/${id}?source=reports&share=synthetic#reading`), `/app/overall-results/${id}?source=reports#reading`);
  assert.equal(safeAccessReturnTo('/app/test-unified-results?share=synthetic'), '/app/sonuclar');
  assert.equal(safeAccessReturnTo('/app/speaking-demo?share=synthetic'), '/app/test');
});
