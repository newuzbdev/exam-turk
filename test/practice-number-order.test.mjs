import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOfflineComponent } from './helpers/offline-react.mjs';

const { sortNumberedPractices } = await loadOfflineComponent('src/components/practice/practice-number-order.ts');

for (const skill of ['Konuşma', 'Yazma']) {
  const items = [
    { id: 'ten', title: `${skill} 10 · Bölüm 2`, createdAt: '2026-10-01', isPublicFree: true },
    { id: 'two-b', title: `${skill} 2 · Bölüm 1.2`, createdAt: '2026-10-12', isPublicFree: false },
    { id: 'one', title: `${skill} 1 · Bölüm 2`, createdAt: '2026-10-13', isPublicFree: false },
    { id: 'two-a', title: `${skill} 2 · Bölüm 1.1`, createdAt: '2026-10-14', isPublicFree: false },
  ];
  test(`${skill}: ascending follows numbers and sections, even when server dates and public-first order differ`, () => {
    assert.deepEqual(sortNumberedPractices(items, 'number-asc').map(item => item.id), ['one', 'two-a', 'two-b', 'ten']);
  });
  test(`${skill}: descending puts 10 before 2 and keeps catalog metadata intact`, () => {
    const before = structuredClone(items);
    const result = sortNumberedPractices(items, 'number-desc');
    assert.deepEqual(result.map(item => item.id), ['ten', 'two-b', 'two-a', 'one']);
    assert.equal(result[0], items[0]);
    assert.deepEqual(items, before);
  });
}
