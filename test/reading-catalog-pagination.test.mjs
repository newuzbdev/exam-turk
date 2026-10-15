import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { React, act, deferred, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
globalThis.DocumentFragment = window.DocumentFragment;
HTMLElement.prototype.scrollIntoView = () => {};
const rows = Array.from({ length: 25 }, (_, index) => ({
  id: `reading-${index + 1}`, title: `Okuma ${index + 1}`, passageTitle: `Metin ${index + 1}`,
  level: index < 12 ? 'B1' : 'B2', practiceType: 'SECTION', sectionNumber: index % 2 + 1,
  isPublished: true, isFreeAccess: false, isPublicFree: index === 0,
  estimatedMinutes: 20, glossaryCount: 0, questionGroupCount: 1, questionCount: 5,
  attemptCount: 0, createdAt: `2026-10-${String(25 - index).padStart(2, '0')}`,
  coverImageUrl: `/cover-${index + 1}.png`,
}));
let requests, decisions, failNextPage, delayedPage, owner, previews, starts, admissions, catalogRows;
const { default: Reading } = await loadOfflineComponent('src/pages/reading-practice/ReadingPracticeList.tsx', {
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: true, user: { id: owner }, refreshUser: async () => {} }) },
  '@/hooks/use-student-action': { useStudentAction: () => () => { throw new Error('unexpected start'); } },
  '@/components/payme/PaymeCheckoutModal': { default: () => null },
  '@/services/access.service': { accessService: {
    getConfig: async () => ({ enabled: true }),
    createSession: async target => { admissions.push(target); return { contextId: 'reading-context' }; },
    getDecisions: async targets => {
      decisions.push(targets.map(target => target.targetId));
      return targets.map(target => ({ target, canOpen: true, isPublicFree: target.targetId === 'reading-1', sourceKind: 'PAID' }));
    },
  } },
  '@/config/api': { default: { get: async (url, { params } = {}) => {
    if (url.endsWith('/me/completions')) return { data: { passageIds: [] } };
    if (url === '/api/reading-practice/reading-25') { previews.push(url); return { data: rows[24] }; }
    assert.equal(url, '/api/reading-practice');
    requests.push({ ...params });
    if (params.page === 2 && delayedPage) await delayedPage.promise;
    if (params.page === 2 && failNextPage) { failNextPage = false; throw new Error('synthetic second-page failure'); }
    let result = catalogRows.filter(row => (!params.level || row.level === params.level) &&
      (!params.sectionNumber || row.sectionNumber === params.sectionNumber));
    if (params.order === 'oldest') result = [result[0], ...result.slice(1).reverse()];
    return { data: { page: params.page, limit: params.limit, total: result.length,
      data: result.slice((params.page - 1) * params.limit, params.page * params.limit) } };
  }, post: async (url, body) => {
    starts.push({ url, body });
    return { data: { attemptId: 'reading-attempt' } };
  } } },
});
const cards = view => [...view.container.querySelectorAll('article[role="button"]')];
const more = view => [...view.container.querySelectorAll('button')].find(node => /(?:pratik|sıra) daha göster|Tekrar dene|Yükleniyor/.test(node.textContent));
async function until(condition) {
  for (let tries = 0; tries < 100 && !condition(); tries++)
    await act(async () => new Promise(resolve => setTimeout(resolve, 5)));
  assert.ok(condition(), 'expected catalog UI state to settle');
}
async function setup(cache, prepare = () => {}, props = {}) {
  requests = []; decisions = []; failNextPage = false; delayedPage = null; owner = 'reader-a';
  catalogRows = rows;
  previews = []; starts = []; admissions = [];
  sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('userId', owner); prepare();
  const client = cache ?? new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const Harness = () => React.createElement(QueryClientProvider, { client }, React.createElement(Reading, { embedded: true, workspaceMode: true, ...props }));
  const view = await mount(Harness, { route: '/app/pratik?bolum=reading' });
  await until(() => cards(view).length > 0 && cards(view).every(node => node.getAttribute('aria-busy') !== 'true'));
  return { ...view, client, async close() { await view.unmount(); client.clear(); } };
}

test('reading loads ten cards and their access decisions, then appends ten without refetching the first page', async () => {
  const view = await setup();
  try {
    assert.equal(cards(view).length, 10);
    assert.equal(view.container.querySelectorAll('article img').length, 10, 'unrequested covers must not exist in the DOM');
    assert.deepEqual(requests, [{ page: 1, limit: 10, order: 'newest' }]);
    await until(() => decisions.length > 0);
    assert.equal(decisions[0].length, 10);
    await act(async () => more(view).click());
    await until(() => cards(view).length === 20);
    assert.equal(cards(view)[0].querySelector('h3').textContent, 'Metin 1');
    assert.equal(cards(view)[19].querySelector('h3').textContent, 'Metin 20');
    assert.deepEqual(requests.map(row => row.page), [1, 2]);
    await act(async () => more(view).click());
    await until(() => cards(view).length === 25);
    assert.equal(new Set(cards(view).map(node => node.querySelector('h3').textContent)).size, 25);
    assert.equal(more(view), undefined, 'no extra request after the final partial page');
  } finally { await view.close(); }
});

test('a failed next page keeps the first cards and retries the same page', async () => {
  const view = await setup();
  try {
    failNextPage = true;
    await act(async () => more(view)?.click());
    await until(() => /Sonraki pratikler yüklenemedi/.test(view.container.textContent));
    assert.equal(cards(view).length, 10);
    await act(async () => more(view).click());
    await until(() => cards(view).length === 20);
    assert.deepEqual(requests.map(row => row.page), [1, 2, 2]);
  } finally { await view.close(); }
});

test('level and section filters query the full catalog before taking the first ten', async () => {
  const view = await setup(null, () => sessionStorage.setItem('reading-practice-filters:workspace', JSON.stringify({ levelFilter: 'B2', sectionFilter: 2, sortMode: 'yeni' })));
  try {
    assert.deepEqual(cards(view).map(node => node.querySelector('h3').textContent), ['Metin 14', 'Metin 16', 'Metin 18', 'Metin 20', 'Metin 22', 'Metin 24']);
    assert.deepEqual(requests, [{ page: 1, limit: 10, order: 'newest', level: 'B2', practiceType: 'SECTION', sectionNumber: 2 }]);
    assert.equal(more(view), undefined);
  } finally { await view.close(); }
});

test('returning to a fresh paged catalog retains loaded cards without requesting them again', async () => {
  const view = await setup();
  let returned;
  try {
    await act(async () => more(view)?.click());
    await until(() => cards(view).length === 20);
    await view.unmount();
    returned = await setup(view.client);
    assert.equal(cards(returned).length, 20);
    assert.equal(requests.length, 0);
  } finally { if (returned) await returned.close(); else await view.close(); }
});

test('oldest sorting retains the server public-first order across page boundaries', async () => {
  const view = await setup(null, () => sessionStorage.setItem('reading-practice-filters:workspace', JSON.stringify({ levelFilter: 'tum', sectionFilter: 'tum', sortMode: 'eski' })));
  try {
    assert.deepEqual(cards(view).map(node => node.querySelector('h3').textContent), ['Metin 1', 'Metin 25', 'Metin 24', 'Metin 23', 'Metin 22', 'Metin 21', 'Metin 20', 'Metin 19', 'Metin 18', 'Metin 17']);
    await act(async () => more(view).click());
    await until(() => cards(view).length === 20);
    assert.equal(cards(view)[10].querySelector('h3').textContent, 'Metin 16');
    assert.deepEqual(requests.map(row => [row.page, row.order]), [[1, 'oldest'], [2, 'oldest']]);
  } finally { await view.close(); }
});

test('worked sorting still considers drafts beyond a page while revealing ten cards at a time', async () => {
  const view = await setup(null, () => {
    sessionStorage.setItem('reading-practice-filters:workspace', JSON.stringify({ levelFilter: 'tum', sectionFilter: 'tum', sortMode: 'calisilmayanlar' }));
    localStorage.setItem('reading-practice-progress:reading-2', JSON.stringify({ answeredCount: 1, answers: { q: 'A' } }));
  });
  try {
    assert.equal(cards(view).length, 10);
    assert.equal(cards(view)[0].querySelector('h3').textContent, 'Metin 1');
    assert.equal(cards(view)[1].querySelector('h3').textContent, 'Metin 3');
    await act(async () => more(view).click());
    assert.equal(cards(view).length, 20);
    await act(async () => more(view).click());
    assert.equal(cards(view).length, 25);
    assert.equal(cards(view)[24].querySelector('h3').textContent, 'Metin 2');
  } finally { await view.close(); }
});

test('changing filters while the next page is slow cannot append its old results to the new filter', async () => {
  const view = await setup();
  const slow = deferred();
  try {
    delayedPage = slow;
    await act(async () => more(view).click());
    await until(() => more(view)?.disabled === true);
    assert.equal(more(view).disabled, true);
    const filter = view.container.querySelector('[aria-label="Seviyeye göre filtrele"]');
    await act(async () => filter.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
    await until(() => document.querySelector('[role="option"]'));
    const option = [...document.querySelectorAll('[role="option"]')].find(node => node.textContent === 'B2');
    await act(async () => option.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    await until(() => cards(view)[0]?.querySelector('h3').textContent === 'Metin 13');
    assert.equal(cards(view).length, 10);
    await act(async () => slow.resolve());
    await act(async () => new Promise(resolve => setTimeout(resolve, 10)));
    assert.equal(cards(view).length, 10);
    assert.equal(cards(view)[0].querySelector('h3').textContent, 'Metin 13');
  } finally { slow.resolve(); await view.close(); }
});

test('a direct start for an item beyond the first page looks up only that target and still binds access', async () => {
  const view = await setup(null, () => {}, { initialStartId: 'reading-25' });
  try {
    await until(() => starts.length > 0);
    assert.deepEqual(requests.map(row => [row.page, row.limit]), [[1, 10]]);
    assert.deepEqual(previews, ['/api/reading-practice/reading-25']);
    assert.deepEqual(admissions, [{ scope: 'PRACTICE_READING', targetId: 'reading-25' }]);
    assert.deepEqual(starts, [{ url: '/api/reading-practice/reading-25/start', body: { accessContextId: 'reading-context' } }]);
  } finally { await view.close(); }
});

function responsiveViewport(width) {
  const original = window.matchMedia;
  const media = [];
  window.matchMedia = query => {
    const listeners = new Set();
    const entry = {
      get matches() { return query === '(min-width: 1024px)' ? width >= 1024 : query === '(min-width: 640px)' ? width >= 640 : false; },
      media: query,
      addEventListener: (_type, listener) => listeners.add(listener),
      removeEventListener: (_type, listener) => listeners.delete(listener),
      notify: () => listeners.forEach(listener => listener({ matches: entry.matches, media: query })),
    };
    media.push(entry);
    return entry;
  };
  return {
    resize(next) { width = next; media.forEach(entry => entry.notify()); },
    restore() { window.matchMedia = original; },
  };
}
function useLongCatalog() {
  catalogRows = Array.from({ length: 65 }, (_, index) => ({
    ...rows[index % 25], id: `reading-${index + 1}`, passageTitle: `Metin ${index + 1}`,
  }));
}

for (const [width, initial, expanded] of [[800, 20, 40], [1280, 30, 60]]) {
  test(`${width}px: ten grid rows load ${initial} cards, then ten more rows append without changing earlier cards`, async () => {
    const viewport = responsiveViewport(width);
    const view = await setup(null, useLongCatalog);
    try {
      assert.equal(cards(view).length, initial);
      assert.deepEqual(requests, [{ page: 1, limit: initial, order: 'newest' }]);
      await act(async () => more(view).click());
      await until(() => cards(view).length === expanded);
      assert.equal(cards(view)[0].querySelector('h3').textContent, 'Metin 1');
      assert.equal(cards(view)[expanded - 1].querySelector('h3').textContent, `Metin ${expanded}`);
      assert.deepEqual(requests.map(row => row.limit), [initial, initial]);
      await act(async () => more(view).click());
      await until(() => cards(view).length === (width === 1280 ? 65 : 60));
      if (width === 1280) assert.equal(more(view), undefined);
    } finally { await view.close(); viewport.restore(); }
  });
}

test('changing columns during a slow next page does not mix different page sizes', async () => {
  const viewport = responsiveViewport(1280);
  const view = await setup(null, useLongCatalog);
  const slow = deferred();
  try {
    assert.equal(cards(view).length, 30);
    delayedPage = slow;
    await act(async () => more(view).click());
    await until(() => requests.length === 2);
    await act(async () => viewport.resize(390));
    await until(() => cards(view).length === 10);
    await act(async () => slow.resolve());
    await until(() => !view.client.isFetching());
    assert.equal(cards(view).length, 10);
    assert.equal(cards(view)[9].querySelector('h3').textContent, 'Metin 10');
    await act(async () => more(view).click());
    await until(() => cards(view).length === 20);
    assert.equal(cards(view)[10].querySelector('h3').textContent, 'Metin 11');
    assert.deepEqual(requests.map(row => [row.page, row.limit]), [[1, 30], [2, 30], [1, 10], [2, 10]]);
  } finally { slow.resolve(); await view.close(); viewport.restore(); }
});

test('desktop worked sorting also reveals ten rows rather than ten individual cards', async () => {
  const viewport = responsiveViewport(1280);
  const view = await setup(null, () => {
    useLongCatalog();
    sessionStorage.setItem('reading-practice-filters:workspace', JSON.stringify({ levelFilter: 'tum', sectionFilter: 'tum', sortMode: 'calisilmayanlar' }));
  });
  try {
    assert.equal(cards(view).length, 30);
    await act(async () => more(view).click());
    assert.equal(cards(view).length, 60);
  } finally { await view.close(); viewport.restore(); }
});
