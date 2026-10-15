import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { useLocation } from 'react-router-dom';
import { React, act, deferred, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
globalThis.DocumentFragment = window.DocumentFragment;
const owner = 'catalog-owner';
let response;
let purchaseResponse;
let reads = 0;
let starts = 0;
let rollout = true;
const item = { id: 'practice-one', title: 'Üyelik pratiği', sectionCode: 'PART_1',
  practiceType: 'SECTION', sectionNumber: 1, level: 'B1', isFreeAccess: false,
  isPublished: true, createdAt: '2026-10-15', questionCount: 1 };
const catalog = { ieltsData: [{ id: 'package-one', title: 'Deneme', category: 'CEFR_MOCK', createdAt: '2026-10-15' }],
  ...Object.fromEntries(['reading', 'listening', 'writing', 'speaking'].map(skill =>
    [`${skill}Tests`, [{ id: `${skill}-one`, ieltsId: 'package-one', title: skill }]])) };
const service = { list: async () => [item] };
const mocks = {
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: true, user: { id: owner }, refreshUser: async () => {} }) },
  '@/hooks/use-student-action': { useStudentAction: () => () => { starts++; } },
  '@/config/billing': { isSubscriptionBillingEnabled: true },
  '@/config/api': { default: { get: async () => ({ data: catalog }) } },
  '@/services/access.service': { accessService: {
    getConfig: async () => ({ enabled: rollout }),
    getCatalogSummary: async () => ({ groups: [] }),
    getDecisions: async targets => { reads++; const decision = await response.promise; return targets.map(target => ({ ...decision, target })); },
    createSession: async () => { starts++; return { contextId: 'unexpected-context' }; },
  } },
  '@/services/billing.service': { billingService: { getOwnPurchases: () => purchaseResponse?.promise ?? Promise.resolve([]) } },
  '@/services/subscription.service': { subscriptionStatusQueryKey: ['subscription', 'status'],
    subscriptionService: { getStatus: async () => ({ isActive: true }) } },
  '@/services/listeningPractice.service': { default: service },
  '@/services/writingPractice.service': { default: service },
  '@/services/speakingPractice.service': { default: service },
  '@/services/readingPractice.service': { readingPracticeService: { getAll: service.list,
    getPage: async () => ({ data: await service.list(), total: 1, page: 1, limit: 10 }),
    getCompletedPassageIds: async () => [], start: async () => { starts++; return { attemptId: 'unexpected-attempt' }; } } },
  '@/services/auth.service': { authService: { getStoredTokens: () => ({}) } },
  '@/services/overallTest.service': { overallTestService: { getCurrentSession: async () => null },
    overallTestFlowStore: { clear() {}, hasActive: () => false, getQueue: () => [], getPendingNextSection: () => null } },
  '@/components/payme/PaymeCheckoutModal': { default: () => null },
  './components/TestModal': { default: props => props.open ? React.createElement('div', { 'data-exam-picker': true }) : null },
};
const components = {};
for (const [kind, entry] of Object.entries({
  practice: 'src/components/practice/PracticeList.tsx',
  reading: 'src/pages/reading-practice/ReadingPracticeList.tsx',
  mock: 'src/pages/test/test.tsx',
})) components[kind] = (await loadOfflineComponent(entry, mocks)).default;

const open = { canOpen: true, sourceKind: 'PAID', remaining: {}, blockedReason: null };
const denied = { ...open, canOpen: false, sourceKind: null, blockedReason: 'MEMBERSHIP_REQUIRED' };
const locks = view => view.container.querySelectorAll('[role="img"][aria-label="Abonelik gerekli"]');
const card = view => view.container.querySelector('article[role="button"], button.mock-test-card');
async function until(condition) {
  for (let tries = 0; tries < 100 && !condition(); tries++)
    await act(async () => new Promise(resolve => setTimeout(resolve, 5)));
  assert.ok(condition(), 'expected UI state to settle');
}
async function setup(kind, { slowPurchases = false } = {}) {
  sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('userId', owner);
  response = deferred(); purchaseResponse = slowPurchases ? deferred() : null; reads = 0; starts = 0; rollout = true;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, retryDelay: 1, staleTime: Infinity, gcTime: Infinity } } });
  const props = kind === 'practice' ? { domain: 'LISTENING', hasActiveMembership: true }
    : kind === 'reading' ? { workspaceMode: true, embedded: true, hasActiveMembership: true } : { workspaceMode: true };
  let changeVisibility;
  function Harness() {
    const [visible, setVisible] = React.useState(true);
    changeVisibility = setVisible;
    const location = useLocation();
    return React.createElement(QueryClientProvider, { client },
      React.createElement('output', { 'data-route': true }, location.pathname),
      visible && React.createElement(components[kind], props));
  }
  const view = await mount(Harness, { route: kind === 'mock' ? '/app/test' : '/app/pratik' });
  await until(() => card(view) && reads > 0);
  return { ...view, client, async show(visible) { await act(async () => changeVisibility(visible)); },
    async close() { await view.unmount(); client.clear(); } };
}

for (const kind of ['practice', 'reading', 'mock']) {
  test(`${kind}: delayed access is neutral and cannot start or show a membership warning`, async () => {
    const view = await setup(kind);
    try {
      assert.equal(card(view).getAttribute('aria-busy'), 'true');
      assert.equal(locks(view).length, 0, 'unknown access must not look like a rejected membership');
      if (kind !== 'mock') assert.match(card(view).getAttribute('aria-label'), /erişim kontrol ediliyor/);
      await act(async () => card(view).click());
      assert.equal(starts, 0);
      assert.equal(view.container.querySelector('[data-exam-picker]'), null);
      assert.equal(document.querySelector('[role="dialog"]'), null);
      await act(async () => response.resolve(open));
      await until(() => card(view).getAttribute('aria-busy') !== 'true');
      assert.equal(locks(view).length, 0);
    } finally { await view.close(); }
  });

  test(`${kind}: a confirmed membership rejection still shows a lock and warning`, async () => {
    const view = await setup(kind);
    try {
      await act(async () => response.resolve(denied));
      await until(() => card(view).getAttribute('aria-busy') !== 'true');
      assert.equal(locks(view).length, 1);
      await act(async () => card(view).click());
      assert.match(document.querySelector('[role="dialog"]').textContent, /önce abone olmanız gerekiyor/);
      assert.equal(starts, 0);
    } finally { await view.close(); }
  });

  test(`${kind}: returning to a cached catalog rechecks access without flashing a lock`, async () => {
    const view = await setup(kind);
    try {
      await act(async () => response.resolve(open));
      await until(() => card(view).getAttribute('aria-busy') !== 'true');
      await view.show(false);
      await until(() => view.client.getQueryCache().findAll({ queryKey: ['content-access'] }).length === 0);
      response = deferred(); reads = 0;
      await view.show(true);
      await until(() => card(view) && reads > 0);
      assert.equal(card(view).getAttribute('aria-busy'), 'true');
      assert.equal(locks(view).length, 0);
      await act(async () => card(view).click());
      assert.equal(starts, 0);
      assert.equal(document.querySelector('[role="dialog"]'), null);
      await act(async () => response.resolve(open));
      await until(() => card(view).getAttribute('aria-busy') !== 'true');
      assert.equal(locks(view).length, 0);
    } finally { await view.close(); }
  });

  test(`${kind}: an unsuccessful access lookup is not a membership rejection`, async () => {
    const view = await setup(kind);
    try {
      await act(async () => response.reject(new Error('offline access fixture')));
      await until(() => view.client.getQueryCache().findAll({ queryKey: ['content-access'] }).some(query => query.state.status === 'error'));
      assert.equal(locks(view).length, 0);
      assert.equal(card(view).getAttribute('aria-busy'), 'true');
      await act(async () => card(view).click());
      assert.equal(starts, 0);
      assert.equal(document.querySelector('[role="dialog"]'), null);
    } finally { await view.close(); }
  });
}

test('mock: pending purchases stay neutral even after the access decision is ready', async () => {
  const view = await setup('mock', { slowPurchases: true });
  try {
    await act(async () => response.resolve(open));
    await until(() => view.client.getQueriesData({ queryKey: ['content-access'] }).some(([, value]) => value?.length));
    await act(async () => new Promise(resolve => setTimeout(resolve, 5)));
    assert.equal(card(view).getAttribute('aria-busy'), 'true');
    assert.equal(locks(view).length, 0);
    await act(async () => card(view).click());
    assert.equal(view.container.querySelector('[data-exam-picker]'), null);
    await act(async () => purchaseResponse.resolve([]));
    await until(() => card(view).getAttribute('aria-busy') !== 'true');
    assert.equal(locks(view).length, 0);
  } finally { await view.close(); }
});
