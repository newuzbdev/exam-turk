import assert from 'node:assert/strict';
import test from 'node:test';
import { captureAccessLink, readPendingShareForTarget, clearPendingShare, saveOwnedAccess, readOwnedAccess } from '../src/utils/access-link-context.ts';
import { resolvePostLoginRedirect, setPostLoginRedirect } from '../src/utils/postLoginRedirect.ts';

const storage = new Map();
globalThis.sessionStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k), key: i => [...storage.keys()][i], get length() { return storage.size; } };
globalThis.window = { location: { origin: 'https://student.example', pathname:'/app/pratik', search:'', hash:'' }, history: { state: {}, replaceState(_s,_t,path) { window.lastPath = path; } } };
const token = 'a'.repeat(43);
test('capture scrubs a same-origin link and retains only matching same-tab intent', () => {
  storage.clear();
  const captured = captureAccessLink(`/app/pratik?bolum=writing&start=one&share=${token}`);
  assert.equal(captured.safeReturnTo, '/app/pratik?bolum=writing&start=one');
  assert.equal(window.lastPath.includes('share='), false);
  assert.equal(captured.pending, true);
  assert.equal(readPendingShareForTarget({scope:'PRACTICE_WRITING',targetId:'one'}), token);
  assert.equal(readPendingShareForTarget({scope:'PRACTICE_WRITING',targetId:'two'}), null);
  assert.equal(readPendingShareForTarget({scope:'PRACTICE_SPEAKING',targetId:'one'}), null);
  setPostLoginRedirect(`/app/pratik?bolum=writing&start=one&share=${token}`);
  assert.equal(resolvePostLoginRedirect().includes('share='), false);
  for(const unsafe of ['https://outside.example', '//outside.example/app', '/\\outside.example/app', '/login', '/unrecognized']) assert.equal(resolvePostLoginRedirect(unsafe), '/app');
  clearPendingShare(); assert.equal(readPendingShareForTarget({scope:'PRACTICE_WRITING',targetId:'one'}), null);
});
test('owned IDs are scoped to account and target; no raw token in owned metadata', () => {
  storage.clear();
  const target = {scope:'PRACTICE_WRITING',targetId:'one'};
  saveOwnedAccess('account-a',target,{contextId:'context',redemptionId:'redemption',target});
  assert.equal(readOwnedAccess('account-a',target).contextId,'context');
  assert.equal(readOwnedAccess('account-b',target),null);
  assert.equal(readOwnedAccess('account-a',{...target,targetId:'two'}),null);
  assert.equal(JSON.stringify([...storage.values()]).includes(token),false);
});

test('saved Mock metadata remains account-scoped and cannot itself confer live approval',()=>{
 storage.clear();const target={scope:'MOCK_PACKAGE',targetId:'package'};
 saveOwnedAccess('a',target,{target,redemptionId:'r',endsAt:'2000-01-01T00:00:00Z',decision:{canOpen:true}});
 assert.equal(readOwnedAccess('b',target),null);assert.equal(readOwnedAccess('a',target).decision,undefined);
});
