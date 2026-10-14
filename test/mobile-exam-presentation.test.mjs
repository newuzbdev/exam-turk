import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildSync } from 'esbuild';

const compiled = buildSync({ entryPoints: ['src/utils/examFullscreen.ts'], bundle: true, format: 'cjs', platform: 'node', write: false }).outputFiles[0].text;
const iphone = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Version/17.6 Mobile Safari/604.1', platform: 'iPhone', maxTouchPoints: 5 };
const desktop = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.6 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 0 };
function element() {
  const classes = new Set();
  return { dataset: {}, style: { overflow: '', removeProperty() {} }, classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name) } };
}
function environment(navigator, native) {
  const document = { documentElement: element(), body: element(), fullscreenElement: null, addEventListener() {}, removeEventListener() {} };
  if (native === 'accepted') {
    document.documentElement.requestFullscreen = async () => { document.fullscreenElement = document.documentElement; };
    document.exitFullscreen = async () => { document.fullscreenElement = null; };
  } else if (native === 'rejected') {
    document.documentElement.requestFullscreen = async () => { throw new Error('Native fullscreen unavailable'); };
  }
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, document, navigator, window: { setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame: fn => queueMicrotask(fn) } });
  return { api: module.exports, document };
}

test('an iPhone can enter the exam view when native fullscreen is unavailable', async () => {
  const { api, document } = environment(iphone);
  assert.equal(await api.requestExamFullscreen(), true);
  // Native fullscreen must remain truthful: the mobile view is a separate presentation.
  assert.equal(api.getExamFullscreenElement(), null);
  assert.equal(api.getExamPresentationElement?.(), document.documentElement);
});

test('a desktop still cannot enter without native fullscreen', async () => {
  const { api } = environment(desktop);
  assert.equal(await api.requestExamFullscreen(), false);
});

test('a native fullscreen rejection can fall back on iPhone', async () => {
  const { api } = environment(iphone, 'rejected');
  assert.equal(await api.requestExamFullscreen(), true);
  assert.equal(api.getExamFullscreenElement(), null);
});

test('a desktop native rejection keeps the existing failure', async () => {
  const { api } = environment(desktop, 'rejected');
  assert.equal(await api.requestExamFullscreen(), false);
});

test('successful desktop native fullscreen remains unchanged', async () => {
  const { api, document } = environment(desktop, 'accepted');
  assert.equal(await api.requestExamFullscreen(), true);
  assert.equal(api.getExamFullscreenElement(), document.documentElement);
  assert.equal(await api.exitExamFullscreen(), true);
  assert.equal(api.getExamFullscreenElement(), null);
});

test('leaving mobile exam presentation clears the view before microphone preparation', async () => {
  const { api } = environment(iphone);
  assert.equal(await api.requestExamFullscreen(), true);
  assert.equal(await api.clearExamPresentation(), true);
  assert.equal(api.getExamPresentationElement?.(), null);
});

test('an iPad using its desktop user agent can use the mobile fallback', async () => {
  const { api } = environment({ ...desktop, maxTouchPoints: 5 });
  assert.equal(await api.requestExamFullscreen(), true);
});

test('a Windows touch notebook keeps the desktop fullscreen requirement', async () => {
  const { api } = environment({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32', maxTouchPoints: 10 });
  assert.equal(await api.requestExamFullscreen(), false);
});

test('an Android phone can enter without a native fullscreen API', async () => {
  const { api } = environment({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile', platform: 'Linux armv8l', maxTouchPoints: 5 });
  assert.equal(await api.requestExamFullscreen(), true);
  assert.equal(api.getExamFullscreenElement(), null);
  assert.equal(await api.exitExamFullscreen(), true);
  assert.equal(api.getExamPresentationElement(), null);
});

test('a phone with working native fullscreen still uses native fullscreen', async () => {
  const { api, document } = environment(iphone, 'accepted');
  assert.equal(await api.requestExamFullscreen(), true);
  assert.equal(api.getExamFullscreenElement(), document.documentElement);
  assert.equal(api.getMobileExamPresentationElement(), null);
});
