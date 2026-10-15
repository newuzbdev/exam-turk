import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadOfflineComponent } from './helpers/offline-react.mjs';

test('a delayed service import retains the adapters of its own offline bundle', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'offline-bundle-'));
  const entry = join(directory, 'fixture.ts');
  writeFileSync(entry, "export async function read() { return (await import('fixture-service')).value; }");
  try {
    const first = await loadOfflineComponent(entry, { 'fixture-service': { value: 'first account' } });
    const second = await loadOfflineComponent(entry, { 'fixture-service': { value: 'second account' } });
    assert.equal(await first.read(), 'first account');
    assert.equal(await second.read(), 'second account');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
