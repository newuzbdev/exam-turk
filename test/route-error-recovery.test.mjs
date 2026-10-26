import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { React, mount, act } from './helpers/offline-react.mjs';
import { loadOfflineComponent } from './helpers/offline-react.mjs';

const load = () => loadOfflineComponent('src/components/errors/RouteErrorPage.tsx');

test('failed imports show a readable refresh option without exposing technical details', async () => {
  const { PageLoadError } = await load();
  let reloads = 0;
  const error = new TypeError('Failed to fetch dynamically imported module: https://example.test/assets/private-module-abcd1234.js');
  const view = await mount(PageLoadError, { props: { error, onReload: () => reloads++ } });
  try {
    assert.equal(view.container.querySelector('h1').textContent, 'Sayfa yüklenemedi');
    assert(view.container.querySelector('main'));
    assert(!/TypeError|private-module|https:|Unexpected Application Error|ErrorBoundary/.test(view.container.textContent));
    assert.match(view.container.textContent, /güncellenmiş olabilir/);
    const button = view.container.querySelector('button');
    assert.equal(button.textContent, 'Sayfayı yenile');
    assert.equal(reloads, 0, 'Never reload on render');
    assert.equal(document.activeElement, view.container.querySelector('h1'));
    await act(async () => button.click());
    assert.equal(reloads, 1);
  } finally { await view.unmount(); }
});

test('a transient error cannot replace the public homepage search title', async () => {
  const { PageLoadError } = await load();
  document.title = 'TurkishMock | Türkçe CEFR Mock Test ve Pratik';
  const view = await mount(PageLoadError, {
    route: '/',
    props: { error: new TypeError('Failed to fetch dynamically imported module'), onReload: () => {} },
  });
  try {
    assert.equal(document.title, 'TurkishMock | Türkçe CEFR Mock Test ve Pratik');
  } finally { await view.unmount(); }
});

test('application route errors still use a clear local title', async () => {
  const { PageLoadError } = await load();
  document.title = 'TurkishMock | Türkçe CEFR Mock Test ve Pratik';
  const view = await mount(PageLoadError, {
    route: '/app',
    props: { error: new TypeError('Failed to fetch dynamically imported module'), onReload: () => {} },
  });
  try {
    assert.equal(document.title, 'Sayfa yüklenemedi | TurkishMock');
  } finally { await view.unmount(); }
});

test('Safari import failures and offline-like network failures receive the same safe recovery', async () => {
  const { PageLoadError } = await load();
  for (const message of ['Importing a module script failed.', 'error loading dynamically imported module', 'Unable to preload CSS for /assets/style-abcd1234.css']) {
    const view = await mount(PageLoadError, { props: { error: new TypeError(message), onReload: () => assert.fail('Automatic reload') } });
    try { assert.match(view.container.textContent, /güncellenmiş olabilir/); } finally { await view.unmount(); }
  }
});

test('an exam recovery leaves drafts, session and location untouched until the user chooses reload', async () => {
  const { PageLoadError } = await load();
  sessionStorage.setItem('fixture-session', 'unchanged');
  localStorage.setItem('fixture-answers', '{"q1":"B"}');
  let reloads = 0;
  const view = await mount(PageLoadError, { route: '/app/pratik/dinleme/example?accessContextId=fixture', props: { error: new TypeError('Failed to fetch dynamically imported module'), onReload: () => reloads++ } });
  try {
    assert.match(view.container.textContent, /kaydedilmemiş/i);
    assert.equal(sessionStorage.getItem('fixture-session'), 'unchanged');
    assert.equal(localStorage.getItem('fixture-answers'), '{"q1":"B"}');
    assert.equal(reloads, 0);
  } finally { await view.unmount(); sessionStorage.removeItem('fixture-session'); localStorage.removeItem('fixture-answers'); }
});

test('unrelated application errors use a generic message, and every route inherits recovery', async () => {
  const { PageLoadError } = await load();
  const view = await mount(PageLoadError, { props: { error: new Error('Sensitive internal implementation'), onReload: () => {} } });
  try {
    assert.match(view.container.textContent, /Bir sorun oluştu/);
    assert(!view.container.textContent.includes('Sensitive'));
  } finally { await view.unmount(); }
  const routes = await readFile('src/routes/routes.tsx', 'utf8');
  assert.match(routes, /errorElement:\s*<RouteErrorPage\s*\/>/);
  assert.match(routes, /children:\s*\[/);
});
