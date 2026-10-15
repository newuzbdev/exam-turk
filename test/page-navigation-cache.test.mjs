import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { React, act, loadOfflineComponent, mount, deferred } from './helpers/offline-react.mjs';
const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
globalThis.DocumentFragment = window.DocumentFragment;

let owner = 'student-a';
let listCalls = 0;
let profileCalls = 0;
let listResponse;
let completionResponse;
const row = title => ({ id: title, title, level: 'B1', sectionCode: 'PART_1', createdAt: '2026-10-12',
  isPublished: true, isFreeAccess: true, estimatedMinutes: 20, glossaryCount: 0,
  questionCount: 1, questionGroupCount: 1, attemptCount: 0 });
const list = async () => { listCalls++; return listResponse ? await listResponse.promise : [row(owner + ' catalog')]; };
const mocks = {
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: true, user: { id: owner, name: 'Saved profile' }, refreshUser: async () => {} }) },
  '@/hooks/use-content-access': { useAccessConfig: () => ({ data: { enabled: false }, isPending: false }), useContentAccessDecisions: () => ({ enabled: false, pending: false, decisionFor: () => undefined }), useAccessCatalogSummary: () => ({ data: undefined }) },
  '@/hooks/use-student-action': { useStudentAction: () => () => {} },
  '@/components/payme/PaymeCheckoutModal': { default: () => null },
  '@/services/readingPractice.service': { readingPracticeService: { getAll: list, getCompletedPassageIds: async () => completionResponse ? await completionResponse.promise : [] } },
  '@/services/listeningPractice.service': { default: { list } },
  '@/services/writingPractice.service': { default: { list } },
  '@/services/speakingPractice.service': { default: { list } },
};
const { default: Reading } = await loadOfflineComponent('src/pages/reading-practice/ReadingPracticeList.tsx', mocks);
const { default: Other } = await loadOfflineComponent('src/components/practice/PracticeList.tsx', mocks);
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
function reset() { owner = 'student-a'; listCalls = 0; profileCalls = 0; listResponse = null; completionResponse = null; sessionStorage.clear(); localStorage.clear(); }
async function show(cache, domain = 'READING') {
  const Harness = () => React.createElement(QueryClientProvider, { client: cache },
    domain === 'READING' ? React.createElement(Reading, { embedded: true, workspaceMode: true }) : React.createElement(Other, { domain }));
  const view = await mount(Harness); await flush(); return view;
}
const catalogQuery = query => query.queryKey.includes('catalog');

for (const domain of ['READING', 'LISTENING', 'WRITING', 'SPEAKING']) {
  test(`${domain}: return navigation immediately reuses the same account's fresh catalog`, async () => {
    reset(); const cache = client(); let view;
    try {
      view = await show(cache, domain); assert.match(view.container.textContent, /student-a catalog/);
      await view.unmount(); view = null;
      listResponse = deferred(); view = await show(cache, domain);
      assert.match(view.container.textContent, /student-a catalog/);
      assert.doesNotMatch(view.container.textContent, /yükleniyor/);
      assert.equal(listCalls, 1, 'a fresh catalog should not require a second HTTP request');
    } finally { listResponse?.resolve([]); if (view) await view.unmount(); cache.clear(); }
  });
}

test('Reading catalog renders without waiting for a slow completed-work summary', async () => {
  reset(); completionResponse = deferred(); const cache = client(); let view;
  try { view = await show(cache); assert.match(view.container.textContent, /student-a catalog/); }
  finally { completionResponse.resolve([]); if (view) await view.unmount(); cache.clear(); }
});

test('stale catalog stays visible during background refresh and then receives the new list', async () => {
  reset(); const cache = client(); let view;
  try {
    view = await show(cache); await view.unmount(); view = null;
    await cache.invalidateQueries({ predicate: catalogQuery, refetchType: 'none' });
    listResponse = deferred(); view = await show(cache);
    assert.match(view.container.textContent, /student-a catalog/);
    assert.doesNotMatch(view.container.textContent, /yükleniyor/);
    await act(async () => listResponse.resolve([row('new published catalog')])); await flush();
    assert.match(view.container.textContent, /new published catalog/);
    assert.doesNotMatch(view.container.textContent, /student-a catalog/);
  } finally { listResponse?.resolve([]); if (view) await view.unmount(); cache.clear(); }
});

test('switching accounts cannot reuse the previous account catalog', async () => {
  reset(); const cache = client(); let view;
  try {
    view = await show(cache); await view.unmount(); view = null; owner = 'student-b'; listResponse = deferred();
    view = await show(cache); assert.doesNotMatch(view.container.textContent, /student-a catalog/);
    await act(async () => listResponse.resolve([row('student-b catalog')])); await flush();
    assert.match(view.container.textContent, /student-b catalog/);
  } finally { listResponse?.resolve([]); if (view) await view.unmount(); cache.clear(); }
});

test('two readers share a single in-flight catalog request', async () => {
  reset(); listResponse = deferred(); const cache = client(); let a, b;
  try { a = await show(cache); b = await show(cache); assert.equal(listCalls, 1); }
  finally { listResponse.resolve([]); if (a) await a.unmount(); if (b) await b.unmount(); cache.clear(); }
});

test('a background network failure keeps the successfully loaded list visible', async () => {
  reset(); const cache = client(); let view;
  try {
    view = await show(cache); await view.unmount(); view = null;
    await cache.invalidateQueries({ predicate: catalogQuery, refetchType: 'none' });
    listResponse = deferred(); view = await show(cache);
    await act(async () => listResponse.reject(new Error('synthetic offline'))); await flush();
    assert.match(view.container.textContent, /student-a catalog/);
    assert.doesNotMatch(view.container.textContent, /yüklenemedi|yükleniyor/);
  } finally { if (view) await view.unmount(); cache.clear(); }
});

const { default: MockCatalog } = await loadOfflineComponent('src/pages/test/test.tsx', {
  ...mocks,
  '@/config/api': { default: { get: async () => { listCalls++; return { data: listResponse ? await listResponse.promise : {
    ieltsData: [row('CEFR mock catalog')], writingTests: [], speakingTests: [], readingTests: [{ id: 'reading-mock', ieltsId: 'CEFR mock catalog', title: 'Reading', type: 'MULTILEVEL' }], listeningTests: [], total: 1,
  } }; } } },
  '@/hooks/use-billing-purchases': { useBillingPurchases: () => ({ data: [], isPending: false }) },
  '@/hooks/use-access-link': { useAccessLink: () => ({ loading: false, error: null, entry: null }) },
  '@/services/auth.service': { authService: { getStoredTokens: () => ({}) } },
  '@/services/subscription.service': { subscriptionStatusQueryKey: ['subscription', 'status'], subscriptionService: { getStatus: async () => ({ isActive: false }) } },
  '@/services/overallTest.service': { overallTestService: { getCurrentSession: async () => null }, overallTestFlowStore: { clear() {}, hasActive: () => false, getQueue: () => [], getPendingNextSection: () => null } },
  './components/TestModal': { default: () => null },
});
test('Mock catalog reuses loaded cards on return navigation', async () => {
  reset(); const cache = client(); let view;
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(MockCatalog, { workspaceMode: true }));
  try {
    view = await mount(Harness); await flush(); assert.match(view.container.textContent, /CEFR mock catalog/);
    await view.unmount(); view = null; listResponse = deferred(); view = await mount(Harness); await flush();
    assert.match(view.container.textContent, /CEFR mock catalog/); assert.equal(listCalls, 1);
  } finally { listResponse?.resolve({ ieltsData: [], writingTests: [], speakingTests: [], readingTests: [], listeningTests: [] }); if (view) await view.unmount(); cache.clear(); }
});

const { useDashboardResults } = await loadOfflineComponent('src/pages/dashboard/dashboard-results-api.ts', {
  ...mocks, '@/config/api': { default: { get: async () => ({ data: { data: [{ id: owner + ' result' }], total: 1 } }) } },
});
test('Dashboard and report history never display another signed-in account result', async () => {
  reset(); const cache = client(); let view;
  function Results() { const results = useDashboardResults(); return React.createElement('output', null, JSON.stringify(results.data)); }
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(Results));
  try {
    view = await mount(Harness); await flush(); assert.match(view.container.textContent, /student-a result/);
    await view.unmount(); view = null; owner = 'student-b'; view = await mount(Harness); await flush();
    assert.match(view.container.textContent, /student-b result/); assert.doesNotMatch(view.container.textContent, /student-a result/);
  } finally { if (view) await view.unmount(); cache.clear(); }
});

const { default: Profile } = await loadOfflineComponent('src/pages/profile/profile.tsx', {
  ...mocks,
  '@/config/billing': { isSubscriptionBillingEnabled: true },
  '@/config/api': { default: { get: async () => { throw Error('Profile must not wait for report history'); } } },
  '@/services/auth.service': { authService: { getCurrentUser: async () => { profileCalls++; return completionResponse ? await completionResponse.promise : ({ id: owner, name: 'Saved profile' }); } } },
  './subscription-status-card': { SubscriptionStatusCard: () => null },
  './purchased-packages': { default: () => null },
  '@/components/auth/public-result-sharing-setting': { default: () => null },
});
test('Profile displays the authenticated name while background profile refresh is slow', async () => {
  reset(); completionResponse = deferred(); const cache = client(); let view;
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(Profile, { embedded: true }));
  try { view = await mount(Harness); await flush(); assert.match(view.container.textContent, /Saved profile/); }
  finally { completionResponse.resolve({ id: owner, name: 'Saved profile' }); if (view) await view.unmount(); cache.clear(); }
});

test('returning to a fresh profile does not renew its avatar URL with another account request', async () => {
  reset(); const cache = client(); let view;
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(Profile, { embedded: true }));
  try {
    view = await mount(Harness); await flush(); assert.equal(profileCalls, 1);
    await view.unmount(); view = null;
    view = await mount(Harness); await flush();
    assert.match(view.container.textContent, /Saved profile/);
    assert.equal(profileCalls, 1);
  } finally { if (view) await view.unmount(); cache.clear(); }
});

const { default: PracticeHome } = await loadOfflineComponent('src/pages/reading-practice/PracticeHome.tsx', {
  ...mocks,
  '@/services/subscription.service': { subscriptionStatusQueryKey: ['subscription', 'status'], subscriptionService: { getStatus: async () => ({ isActive: false }) } },
});
test('visited practice categories retain their card nodes while only the chosen panel is visible', async () => {
  reset(); const cache = client(); let view;
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(PracticeHome, { workspaceMode: true }));
  try {
    view = await mount(Harness, { route: '/app/pratik?bolum=reading' }); await flush();
    const card = view.container.querySelector('[role="tabpanel"] h3'); assert.ok(card);
    assert.equal(listCalls, 1, 'unvisited categories must not be downloaded');
    const tab = name => [...view.container.querySelectorAll('[role="tab"]')].find(el => el.textContent === name);
    await act(async () => tab('Dinleme').dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0 }))); await flush();
    assert.equal(view.container.contains(card), true, 'returning must reuse the loaded reading card node');
    assert.equal(card.closest('[role="tabpanel"]').hidden, true);
    assert.equal(listCalls, 2);
    await act(async () => tab('Okuma').dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, button: 0 }))); await flush();
    assert.equal(card.closest('[role="tabpanel"]').hidden, false);
    assert.equal(view.container.querySelector('[role="tabpanel"]:not([hidden]) h3'), card);
    assert.equal(listCalls, 2);
  } finally { if (view) await view.unmount(); cache.clear(); }
});

const { ProfileDetails } = await loadOfflineComponent('src/pages/profile/profile-details.tsx', {
  '@/services/auth.service': { authService: { updateUser: async () => { throw Error('No real edit in this image test'); } } },
});
test('profile photo renders one native image immediately instead of waiting for a separate preload', async () => {
  const view = await mount(ProfileDetails, { props: { user: { id: 'photo-owner', name: 'Örnek Kullanıcı', avatarUrl: 'https://example.test/photo.webp' }, onSaved: () => {} } });
  try {
    const image = view.container.querySelector('img[alt="Profil fotoğrafı önizlemesi"]');
    assert.ok(image, 'the authorized URL should be rendered directly before its load event');
    assert.equal(image.getAttribute('src'), 'https://example.test/photo.webp');
    await act(async () => image.dispatchEvent(new Event('error')));
    assert.equal(view.container.querySelector('img[alt="Profil fotoğrafı önizlemesi"]'), null);
    assert.match(view.container.textContent, /ÖK/);
  } finally { await view.unmount(); }
});

const { default: RecentResults } = await loadOfflineComponent('src/pages/home/ui/home-last-month-top-results.tsx', {
  ...mocks,
  '@/config/api': { default: { get: async () => { listCalls++; return { data: listResponse ? await listResponse.promise : [{
    id: 'public-result', user: { id: 'public-owner', name: 'Public shared result' }, overallScore: 49,
    listeningScore: 49, readingScore: 49, writingScore: 49, speakingScore: 49, completedAt: '2026-10-12T12:00:00Z',
  }] }; } } },
});
test('public home results are visible on return while their next request is slow', async () => {
  reset(); const cache = client(); let view;
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(RecentResults));
  try {
    view = await mount(Harness); await flush(); assert.match(view.container.textContent, /Public shared result/);
    await view.unmount(); view = null; listResponse = deferred(); view = await mount(Harness); await flush();
    assert.match(view.container.textContent, /Public shared result/); assert.equal(listCalls, 1);
  } finally { listResponse?.resolve([]); if (view) await view.unmount(); cache.clear(); }
});

const { BannerSection } = await loadOfflineComponent('src/components/banner/BannerSection.tsx', {
  ...mocks, '@/services/banner.service': { bannerService: { getAllBanners: list } },
});

const { default: Reports } = await loadOfflineComponent('src/pages/results/ReportsPage.tsx', {
  ...mocks, '@/config/api': { default: { get: async () => ({ data: { data: [{
    id: 'sample-report', status: 'COMPLETED', isCompleted: true, overallScore: 55,
    readingScore: 55, readingResultId: 'reading-result', completedAt: '2026-10-12T12:00:00Z',
  }], total: 1 } }) } },
});
const { default: Lessons } = await loadOfflineComponent('src/pages/lessons/GrammarHome.tsx', {
  ...mocks, '@/config/api': { default: { get: async () => ({ data: { data: [{
    id: 'sample-lesson', slug: 'sample-lesson', title: 'Sample lesson', category: 'listening', cover: 'notes', summary: 'Sample summary',
  }] } }) } },
});
for (const [name, Component, keyPrefix, expectedText] of [
  ['Reports', Reports, 'dashboard', '1 rapor'],
  ['Lessons', Lessons, 'learn', 'Sample lesson'],
]) {
  test(`${name} keeps cached rows visible after a background request fails`, async () => {
    reset(); const cache = client(); let view;
    const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(Component));
    try {
      view = await mount(Harness); await flush(); assert.ok(view.container.textContent.includes(expectedText));
      const query = cache.getQueryCache().find({ predicate: query => query.queryKey[0] === keyPrefix }); assert.ok(query);
      await act(async () => cache.fetchQuery({ queryKey: query.queryKey, queryFn: async () => { throw Error('synthetic offline'); }, retry: false }).catch(() => undefined)); await flush();
      assert.ok(view.container.textContent.includes(expectedText), 'loaded rows must remain visible after a failed refresh');
    } finally { if (view) await view.unmount(); cache.clear(); }
  });
}
test('public banners reuse loaded content on return', async () => {
  reset(); const cache = client(); let view;
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(BannerSection));
  try {
    view = await mount(Harness); await flush(); assert.match(view.container.textContent, /student-a catalog/);
    await view.unmount(); view = null; listResponse = deferred(); view = await mount(Harness); await flush();
    assert.match(view.container.textContent, /student-a catalog/); assert.equal(listCalls, 1);
  } finally { listResponse?.resolve([]); if (view) await view.unmount(); cache.clear(); }
});

const { default: SavingProfile } = await loadOfflineComponent('src/pages/profile/profile.tsx', {
  ...mocks,
  '@/config/billing': { isSubscriptionBillingEnabled: true },
  '@/config/api': { default: { get: async () => ({ data: [] }) } },
  '@/services/auth.service': { authService: { getCurrentUser: () => completionResponse.promise } },
  './profile-details': { ProfileDetails: ({ user, onSaved }) => React.createElement('section', null,
    user.name, React.createElement('button', { onClick: () => onSaved({ name: 'Changed profile' }) }, 'Save profile')) },
  './subscription-status-card': { SubscriptionStatusCard: () => null },
  './purchased-packages': { default: () => null },
  '@/components/auth/public-result-sharing-setting': { default: () => null },
});
test('a late profile read cannot overwrite a name accepted by the save callback', async () => {
  reset(); completionResponse = deferred(); const cache = client(); let view;
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(SavingProfile, { embedded: true }));
  try {
    view = await mount(Harness); await flush();
    await act(async () => [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Save profile').click()); await flush();
    assert.match(view.container.textContent, /Changed profile/);
    await act(async () => completionResponse.resolve({ id: owner, name: 'Old server snapshot' })); await flush();
    assert.match(view.container.textContent, /Changed profile/); assert.doesNotMatch(view.container.textContent, /Old server snapshot/);
  } finally { completionResponse.resolve(null); if (view) await view.unmount(); cache.clear(); }
});

const { useSaveStudentOnboarding } = await loadOfflineComponent('src/pages/dashboard/onboarding-api.ts', {
  ...mocks, '@/config/api': { default: { post: async () => ({ data: await completionResponse.promise }) } },
});
test('a save started in account A cannot populate account B onboarding cache', async () => {
  reset(); completionResponse = deferred(); const cache = client(); let view, mutation, rerender, pending;
  function Saver() { mutation = useSaveStudentOnboarding(null); return null; }
  function Harness() { const [, update] = React.useState(0); rerender = update; return React.createElement(QueryClientProvider, { client: cache }, React.createElement(Saver)); }
  try {
    view = await mount(Harness);
    await act(async () => { pending = mutation.mutateAsync({ targetLevel: 'B2' }); });
    owner = 'student-b'; await act(async () => rerender(value => value + 1));
    await act(async () => completionResponse.resolve({ success: true, data: { id: 'A-onboarding', userId: 'student-a', targetLevel: 'B2' } })); await pending; await flush();
    assert.equal(cache.getQueryData(['student', 'me', 'onboarding', 'owner', 'student-b']), undefined);
  } finally { completionResponse.resolve(null); if (view) await view.unmount(); cache.clear(); }
});

for (const signInAgain of [false, true]) {
  test(`an unmounted onboarding save cannot ${signInAgain ? 'overwrite a new session' : 'recreate cleared data'} after logout`, async () => {
    reset(); completionResponse = deferred(); const cache = client(); let view, mutation, pending;
    const key = ['student', 'me', 'onboarding', 'owner', 'student-a'];
    function Saver() { mutation = useSaveStudentOnboarding(null); return null; }
    const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(Saver));
    try {
      await cache.fetchQuery({ queryKey: key, meta: { pageData: true, ownerId: owner }, queryFn: async () => null });
      view = await mount(Harness);
      await act(async () => { pending = mutation.mutateAsync({ targetLevel: 'B2' }); });
      await view.unmount(); view = null;
      await cache.cancelQueries({ queryKey: key, exact: true }); cache.removeQueries({ queryKey: key, exact: true });
      if (signInAgain) await cache.fetchQuery({ queryKey: key, meta: { pageData: true, ownerId: owner }, queryFn: async () => ({ id: 'new-session', targetLevel: 'C1' }) });
      await act(async () => completionResponse.resolve({ success: true, data: { id: 'old-session', userId: owner, targetLevel: 'B2' } })); await pending; await flush();
      if (signInAgain) assert.equal(cache.getQueryData(key).id, 'new-session');
      else assert.equal(cache.getQueryState(key), undefined);
    } finally { completionResponse.resolve(null); if (view) await view.unmount(); cache.clear(); }
  });
}

test('an onboarding save still updates the initiating active account cache', async () => {
  reset(); completionResponse = deferred(); const cache = client(); let view, mutation, pending;
  const key = ['student', 'me', 'onboarding', 'owner', owner];
  function Saver() { mutation = useSaveStudentOnboarding(null); return null; }
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(Saver));
  try {
    await cache.fetchQuery({ queryKey: key, meta: { pageData: true, ownerId: owner }, queryFn: async () => null });
    view = await mount(Harness);
    await act(async () => { pending = mutation.mutateAsync({ targetLevel: 'B2' }); });
    await act(async () => completionResponse.resolve({ success: true, data: { id: 'saved-profile', userId: owner, targetLevel: 'B2' } })); await pending; await flush();
    assert.equal(cache.getQueryData(key).id, 'saved-profile');
  } finally { completionResponse.resolve(null); if (view) await view.unmount(); cache.clear(); }
});

const ActualAuth = await loadOfflineComponent(process.env.CACHE_TEST_AUTH_SOURCE || 'src/contexts/AuthContext.tsx', {
  '@/config/billing': { isSubscriptionBillingEnabled: true },
  '@/services/studentPresence.service': { closeStudentPresenceBeforeLogout: () => {} },
  '@/services/auth.service': { authService: {
    getStoredTokens: () => ({ accessToken: 'synthetic-test-only' }), getCurrentUser: async () => ({ id: 'student-a', name: 'Synthetic owner' }),
    clearStoredTokens: () => {}, storeTokens: () => {},
  } },
});
test('actual logout removes owned page data and rejects a late old-account response', async () => {
  reset(); completionResponse = deferred(); const cache = client(); let view, auth, pending;
  function Reader() { auth = ActualAuth.useAuth(); return React.createElement('output', null, auth.user?.id ?? 'signed out'); }
  const Harness = () => React.createElement(QueryClientProvider, { client: cache }, React.createElement(ActualAuth.AuthProvider, null, React.createElement(Reader)));
  try {
    view = await mount(Harness); await flush(); assert.match(view.container.textContent, /student-a/);
    await cache.fetchQuery({ queryKey: ['practice', 'catalog', 'owner', 'student-a'], meta: { pageData: true, ownerId: 'student-a' }, queryFn: async () => ['owned list'] });
    pending = cache.fetchQuery({ queryKey: ['dashboard', 'late', 'owner', 'student-a'], meta: { pageData: true, ownerId: 'student-a' }, queryFn: () => completionResponse.promise }).catch(() => undefined);
    await act(async () => auth.logout()); await flush();
    assert.equal(cache.getQueryState(['practice', 'catalog', 'owner', 'student-a']), undefined);
    await act(async () => completionResponse.resolve(['late private history'])); await pending; await flush();
    assert.equal(cache.getQueryState(['dashboard', 'late', 'owner', 'student-a']), undefined);
  } finally { completionResponse.resolve([]); if (view) await view.unmount(); cache.clear(); }
});
