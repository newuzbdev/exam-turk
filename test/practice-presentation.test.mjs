import assert from 'node:assert/strict';
import test from 'node:test';
import { React, act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

globalThis.DocumentFragment = window.DocumentFragment;
window.HTMLElement.prototype.scrollTo = function () {};
const { default: Reading } = await loadOfflineComponent('src/pages/reading-practice/ReadingPracticeTest.tsx', {
  '@/services/readingPractice.service': { readingPracticeService: { getSolveDetail: async () => ({
    id: 'view-practice', title: 'Örnek', estimatedMinutes: 20, practiceType: 'SECTION', sectionNumber: 4,
    isPublished: true, paragraphs: [{ label: 'Metin', text: 'Okul bugün çok güzel.' }], glossaryEntries: [],
    questionGroups: [{ id: 'group', order: 1, title: 'Bölüm 4', type: 'MULTIPLE_CHOICE', questions: [
      { id: 'question', order: 1, prompt: 'Neresi güzel?', options: [{ value: 'A', text: 'Okul' }, { value: 'B', text: 'Ev' }] },
    ] }],
  }) } },
});

function nativeFullscreen({ reject = false, vendor = false } = {}) {
  let element = null;
  Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => element });
  const changed = () => document.dispatchEvent(new Event('fullscreenchange'));
  const enter = async () => { if (reject) throw new Error('Fullscreen denied'); element = document.documentElement; changed(); };
  document.documentElement.requestFullscreen = vendor ? undefined : enter;
  document.documentElement.webkitRequestFullscreen = vendor ? enter : undefined;
  document.exitFullscreen = async () => { element = null; changed(); };
  return { escape: () => { element = null; changed(); }, clear() {
    element = null;
    delete document.documentElement.requestFullscreen;
    delete document.documentElement.webkitRequestFullscreen;
    delete document.exitFullscreen;
  } };
}

const route = '/app/pratik/okuma/view-practice?mod=calisma&sayac=0&attemptId=view-attempt';
async function openReading() {
  sessionStorage.setItem('userId', 'view-owner');
  return mount(Reading, { route, routePattern: '/app/pratik/okuma/:id' });
}
async function choose(view, label) {
  const trigger = view.container.querySelector('button[aria-label^="Görünüm:"]');
  assert.ok(trigger, 'the practice toolbar must offer the three view modes');
  await act(async () => trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  const item = [...document.querySelectorAll('[role="menuitemradio"]')].find(e => e.textContent.trim() === label);
  assert.ok(item, `${label} must be available in the view menu`);
  await act(async () => item.click());
  for (let i = 0; i < 50 && document.querySelector('[role="menuitemradio"][data-disabled]'); i++) {
    await act(async () => new Promise(resolve => setTimeout(resolve, 5)));
  }
}

test('reading changes between menu, wide and native fullscreen without replacing the selected answer', async () => {
  const native = nativeFullscreen();
  const view = await openReading();
  const focused = [];
  const listen = event => focused.push(event.detail.focused);
  window.addEventListener('tm:practice-presentation', listen);
  try {
    const answer = view.container.querySelector('[role="radio"]');
    assert.ok(answer);
    await act(async () => answer.click());
    assert.equal(answer.getAttribute('aria-checked'), 'true');
    await choose(view, 'Menülü görünüm');
    assert.equal(view.container.querySelector('[data-focused-presentation]').dataset.focusedPresentation, 'false');
    assert.equal(focused.at(-1), false);
    await choose(view, 'Geniş görünüm');
    assert.equal(focused.at(-1), true);
    await choose(view, 'Tam ekran');
    assert.equal(document.fullscreenElement, document.documentElement);
    assert.equal(view.container.querySelector('[data-practice-view]').dataset.practiceView, 'fullscreen');
    await act(async () => native.escape());
    assert.equal(view.container.querySelector('[data-practice-view]').dataset.practiceView, 'wide');
    assert.equal(view.container.querySelector('[role="radio"]'), answer);
    assert.equal(answer.getAttribute('aria-checked'), 'true');
    await choose(view, 'Tam ekran');
    await choose(view, 'Menülü görünüm');
    assert.equal(document.fullscreenElement, null);
    assert.equal(focused.at(-1), false);
  } finally { window.removeEventListener('tm:practice-presentation', listen); await view.unmount(); native.clear(); }
});

test('a rejected fullscreen request retains the previous menu view and explains the failure', async () => {
  const native = nativeFullscreen({ reject: true });
  const view = await openReading();
  try {
    await choose(view, 'Menülü görünüm');
    await choose(view, 'Tam ekran');
    assert.equal(document.fullscreenElement, null);
    assert.equal(view.container.querySelector('[data-practice-view]').dataset.practiceView, 'menu');
    assert.match(document.querySelector('[role="alert"]')?.textContent || '', /Tam ekran/);
    assert.equal(document.documentElement.dataset.mobileExamPresentation, undefined);
  } finally { await view.unmount(); native.clear(); }
});

test('practice exits its native fullscreen on unmount, including prefixed Safari entry', async () => {
  const native = nativeFullscreen({ vendor: true });
  const view = await openReading();
  try { await choose(view, 'Tam ekran'); assert.ok(document.fullscreenElement); }
  finally { await view.unmount(); }
  assert.equal(document.fullscreenElement, null);
  native.clear();
});

test('a browser without native fullscreen keeps the wide view and never marks a mobile fallback as fullscreen', async () => {
  const native = nativeFullscreen();
  delete document.documentElement.requestFullscreen;
  const view = await openReading();
  try {
    await choose(view, 'Tam ekran');
    assert.equal(view.container.querySelector('[data-practice-view]').dataset.practiceView, 'wide');
    assert.match(document.querySelector('[role="alert"]')?.textContent || '', /Tam ekran/);
    assert.equal(document.documentElement.dataset.mobileExamPresentation, undefined);
  } finally { await view.unmount(); native.clear(); }
});
