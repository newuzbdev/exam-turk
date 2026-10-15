import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { React, act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
globalThis.DocumentFragment = window.DocumentFragment;
HTMLElement.prototype.scrollIntoView = () => {};
const definitions = {
  LISTENING: ['Dinleme', 'PART_1', 'PART_2', 'Bölüm 2'],
  WRITING: ['Yazma', 'TASK_1_1', 'TASK_2', 'Bölüm 2'],
  SPEAKING: ['Konuşma', 'TASK_1_1', 'TASK_3', 'Bölüm 3'],
};
let rows;
const service = { list: async () => rows };
const { default: List } = await loadOfflineComponent('src/components/practice/PracticeList.tsx', {
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: true, user: { id: 'practice-reader' } }) },
  '@/services/access.service': { accessService: {
    getConfig: async () => ({ enabled: true }),
    getDecisions: async targets => targets.map(target => ({ target, canOpen: true, sourceKind: 'PAID', isPublicFree: false })),
  } },
  '@/services/listeningPractice.service': { default: service },
  '@/services/writingPractice.service': { default: service },
  '@/services/speakingPractice.service': { default: service },
});
const cards = view => [...view.container.querySelectorAll('article[role="button"]')];
const more = view => [...view.container.querySelectorAll('button')].find(node => /sıra daha göster/.test(node.textContent));
async function until(condition) {
  for (let tries = 0; tries < 100 && !condition(); tries++) await act(async () => new Promise(resolve => setTimeout(resolve, 5)));
  assert.ok(condition(), 'expected practice catalog UI state to settle');
}
async function setup(domain, width) {
  const previous = window.matchMedia;
  window.matchMedia = query => ({ matches: query === '(min-width: 1024px)' ? width >= 1024
    : query === '(min-width: 640px)' ? width >= 640 : query === '(max-width: 767px)' ? width < 768 : false,
    addEventListener() {}, removeEventListener() {} });
  sessionStorage.clear(); localStorage.clear();
  const [name, first, second] = definitions[domain];
  rows = Array.from({ length: 65 }, (_, index) => ({
    id: `${domain}-${index + 1}`, title: `${name} ${index + 1}`, sectionCode: index < 40 ? first : second,
    level: index < 35 ? 'B1' : 'B2', isPublished: true, isFreeAccess: false,
    createdAt: '2026-10-15', coverImageUrl: `/cover-${index + 1}.png`,
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const Harness = () => React.createElement(QueryClientProvider, { client }, React.createElement(List, { domain, hasActiveMembership: true }));
  const view = await mount(Harness, { route: `/app/pratik?bolum=${domain.toLowerCase()}` });
  await until(() => cards(view).length > 0 && cards(view).every(node => node.getAttribute('aria-busy') !== 'true'));
  return { ...view, async close() { await view.unmount(); client.clear(); window.matchMedia = previous; } };
}
async function select(view, label, text) {
  const trigger = view.container.querySelector(`[aria-label="${label}"]`);
  await act(async () => trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })));
  await until(() => document.querySelector('[role="option"]'));
  const option = [...document.querySelectorAll('[role="option"]')].find(node => node.textContent === text);
  assert.ok(option, `missing filter option ${text}`);
  await act(async () => option.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
}

for (const domain of Object.keys(definitions)) {
  for (const [width, initial, expanded] of [[390, 10, 20], [800, 20, 40], [1280, 30, 60]]) {
    test(`${domain} at ${width}px renders ten rows, then appends ten more rows without hidden cover elements`, async () => {
      const view = await setup(domain, width);
      try {
        assert.equal(cards(view).length, initial);
        assert.equal(view.container.querySelectorAll('article img').length, initial);
        const first = cards(view)[0].querySelector('h3').textContent;
        assert.ok(more(view));
        await act(async () => more(view).click());
        assert.equal(cards(view).length, expanded);
        assert.equal(cards(view)[0].querySelector('h3').textContent, first);
        while (more(view)) await act(async () => more(view).click());
        assert.equal(cards(view).length, 65);
        assert.equal(new Set(cards(view).map(node => node.getAttribute('aria-label'))).size, 65);
      } finally { await view.close(); }
    });
  }
  test(`${domain} filters include matching sections beyond the first ten rows and reset the revealed amount`, async () => {
    const view = await setup(domain, 390);
    try {
      assert.ok(more(view), 'catalog should start with a load-more control');
      await act(async () => more(view).click());
      await select(view, 'Bölüme göre filtrele', definitions[domain][3]);
      assert.equal(cards(view).length, 10);
      assert.equal(cards(view)[0].querySelector('h3').textContent, `${definitions[domain][0]} 41`);
      await select(view, 'Bölüme göre filtrele', 'Tüm bölümler');
      assert.equal(cards(view).length, 10);
    } finally { await view.close(); }
  });
}

for (const domain of ['WRITING', 'SPEAKING']) for (const [width, initial, lastNumber] of [[390, 10, 56], [800, 20, 46], [1280, 30, 36]]) test(`${domain} at ${width}px number sorting includes titles outside the visible rows`, async () => {
  const view = await setup(domain, width);
  try {
    assert.ok(more(view));
    await act(async () => more(view).click());
    await select(view, 'Pratikleri sırala', 'Numara: azalan');
    assert.equal(cards(view).length, initial);
    assert.equal(cards(view)[0].querySelector('h3').textContent, `${definitions[domain][0]} 65`);
    assert.equal(cards(view).at(-1).querySelector('h3').textContent, `${definitions[domain][0]} ${lastNumber}`);
    await select(view, 'Pratikleri sırala', 'Numara: artan');
    assert.equal(cards(view).length, initial);
    assert.equal(cards(view)[0].querySelector('h3').textContent, `${definitions[domain][0]} 1`);
  } finally { await view.close(); }
});
