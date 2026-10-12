import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { useLocation } from 'react-router-dom';
import { React, act, deferred, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
globalThis.DocumentFragment = window.DocumentFragment;
const categories = ['CEFR_MOCK', 'LISTENING', 'READING', 'WRITING', 'SPEAKING'];
const labels = ['CEFR MOCK', 'Dinleme', 'Okuma', 'Yazma', 'Konuşma'];
const status = { isActive: false, practiceRemaining: 0, writingMockRemaining: 0, speakingMockRemaining: 0 };
const packages = categories.map((category, index) => ({ id: `package-${index}`, title: `Sınav ${index}`, category, createdAt: '2026-10-05', updatedAt: '2026-10-05' }));
const catalog = {
  ieltsData: [...packages, { ...packages[0], id: 'unavailable', title: 'Hazırlanan sınav' }],
  ...Object.fromEntries(['listening', 'reading', 'writing', 'speaking'].map(skill => [`${skill}Tests`, [0, categories.indexOf(skill.toUpperCase())].map(index => ({ id: `${skill}-${index}`, ieltsId: packages[index].id, title: skill }))])),
};
let catalogReads = 0;
let getStatus = async () => structuredClone(status);
const mocks = {
  '@/hooks/use-billing-purchases': {useBillingPurchases:()=>({data:[],isPending:false})},
  '@/services/access.service': { accessService: { getConfig: async () => ({ enabled: false }) } },
  '@/config/api': { default: { get: async () => { catalogReads++; return { data: structuredClone(catalog) }; } } },
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: true }) },
  '@/config/billing': { isSubscriptionBillingEnabled: true },
  '@/services/subscription.service': { subscriptionStatusQueryKey: ['subscription', 'status'], subscriptionService: { getStatus: () => getStatus() } },
  '@/services/auth.service': { authService: { getStoredTokens: () => ({}) } },
  '@/services/overallTest.service': {
    overallTestService: { getCurrentSession: async () => null },
    overallTestFlowStore: { clear() {}, hasActive: () => false, getQueue: () => [], getPendingNextSection: () => null },
  },
  './components/TestModal': { default: ({ open, selectedTest, singleSkill }) => open ? React.createElement('div', { 'data-picker': true }, `${selectedTest.id}:${singleSkill || 'all'}`) : null },
};
const { default: TestPage } = await loadOfflineComponent('src/pages/test/test.tsx', mocks);
function Harness({ client }) {
  const location = useLocation();
  return React.createElement(QueryClientProvider, { client },
    React.createElement('output', { 'data-route': true }, `${location.pathname}${location.search}${location.hash}`),
    React.createElement(TestPage, { workspaceMode: true }),
  );
}
async function setup({ active = false, route = '/app/test', pending = false } = {}) {
  catalogReads = 0;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  if (!pending) client.setQueryData(['subscription', 'status'], { ...status, isActive: active });
  const view = await mount(Harness, { props: { client }, route });
  const deadline = Date.now() + 1000;
  while (!view.container.querySelector('.mock-test-tabs') && Date.now() < deadline) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
  assert.ok(view.container.querySelector('.mock-test-tabs'), 'wait for the catalog before testing its controls');
  return { ...view, client, async unmount() { await view.unmount(); client.clear(); } };
}
const route = view => view.container.querySelector('[data-route]').textContent;
const locks = view => view.container.querySelectorAll('[role="img"][aria-label="Abonelik gerekli"]');
const button = (scope, text) => [...scope.querySelectorAll('button')].find(node => node.textContent === text);
const dialogButton = text => button(document.querySelector('[role="dialog"]'), text);
const card = (view, index) => [...view.container.querySelectorAll('.mock-test-card')].find(node => node.textContent.includes(`Sınav ${index}`));

for (const [index, category] of categories.entries()) {
  test(`${category}: a non-member sees a lock and can dismiss or choose subscription without entering the exam`, async () => {
    const view = await setup();
    try {
      await act(async () => button(view.container, labels[index]).click());
      assert.equal(locks(view).length, 1);
      assert.equal(view.container.querySelector('button.mock-test-card:disabled [aria-label="Abonelik gerekli"]'), null);
      await act(async () => card(view, index).click());
      assert.equal(route(view), '/app/test');
      assert.equal(view.container.querySelector('[data-picker]'), null);
      assert.match(document.querySelector('[role="dialog"]').textContent, /Bu çalışmaya başlamak için önce abone olmanız gerekiyor\./);
      await act(async () => dialogButton('Vazgeç').click());
      assert.equal(document.querySelector('[role="dialog"]'), null);
      assert.equal(route(view), '/app/test');
      await act(async () => card(view, index).click());
      await act(async () => dialogButton('Abone Ol').click());
      assert.equal(route(view), '/app/fiyatlar#fiyatlandirma');
      assert.equal(view.container.querySelector('[data-picker]'), null);
    } finally { await view.unmount(); }
  });
}

test('active membership unlocks every catalog category; a membership update does not fetch the catalog again', async () => {
  const view = await setup();
  try {
    await act(async () => {
      view.client.setQueryData(['subscription', 'status'], { ...status, isActive: true });
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    for (const [index] of categories.entries()) {
      await act(async () => button(view.container, labels[index]).click());
      assert.equal(locks(view).length, 0);
      await act(async () => card(view, index).click());
      assert.match(view.container.querySelector('[data-picker]').textContent, new RegExp(`package-${index}:`));
      assert.equal(document.querySelector('[role="dialog"]'), null);
    }
    assert.equal(catalogReads, 1);
  } finally { await view.unmount(); }
});

test('a direct exam link waits for membership, then shows the same warning without opening the exam', async () => {
  const response = deferred();
  getStatus = () => response.promise;
  const view = await setup({ pending: true, route: '/app/test?package=package-4&skills=speaking' });
  try {
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(view.container.querySelector('[data-picker]'), null);
    await act(async () => { response.resolve(status); });
    // Query notifications are batched; wait for the visible outcome rather than
    // assuming its scheduled update has run after a single zero-delay timer.
    const deadline = Date.now() + 1000;
    while (!document.querySelector('[role="dialog"]') && Date.now() < deadline) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    }
    assert.equal(route(view), '/app/test');
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.equal(view.container.querySelector('[data-picker]'), null);
    assert.equal(catalogReads, 1);
  } finally { await view.unmount(); getStatus = async () => structuredClone(status); }
});

test('an active member arriving by direct link keeps the requested skill selection', async () => {
  const view = await setup({ active: true, route: '/app/test?package=package-0&skills=reading,listening' });
  try {
    assert.equal(route(view), '/app/test');
    assert.equal(view.container.querySelector('[data-picker]').textContent, 'package-0:all');
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(catalogReads, 1);
  } finally { await view.unmount(); }
});
