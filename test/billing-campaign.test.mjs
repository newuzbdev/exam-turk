import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { React, act, deferred, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
const terms = {
  kind: 'MEMBERSHIP', saleMode: 'STANDALONE', name: 'Üyelik', description: '',
  basePriceUzs: 59000, periodDays: 30, quotas: { MOCK_WRITING: 10, MOCK_SPEAKING: 10, PRACTICE_AI: 120 },
  lessonIds: [], mockSelections: [], standardMockAccess: true,
  practiceScopes: ['PRACTICE_READING', 'PRACTICE_LISTENING', 'PRACTICE_WRITING', 'PRACTICE_SPEAKING'],
  attemptLimit: 0, validityDays: null, discount: null,
};
const campaign = {
  id: 'synthetic-campaign', label: 'Tanışma Kampanyası', status: 'ACTIVE',
  userLimit: 1000, claimedUsers: 753, reservedUsers: 2, remainingUsers: 247, availableUsers: 245,
};
const offer = (state = campaign) => ({
  packageId: 'synthetic-membership', versionId: 'synthetic-version', sortOrder: 0, terms: { ...terms },
  amountUzs: !state || state.status === 'ACTIVE' ? 39000 : 59000,
  discountUzs: !state || state.status === 'ACTIVE' ? 20000 : 0,
  ...(state ? { campaign: { ...state } } : {}),
});
const { default: Card } = await loadOfflineComponent('src/pages/home/ui/billing-package-card.tsx');
async function card(row) {
  return mount(Card, { props: { offer: row, activeMembership: false, connected: true, busy: false, onBuy() {} } });
}

test('active campaign shows normal price above the sale and only the remaining capacity', async () => {
  const view = await card(offer());
  try {
    assert.doesNotMatch(view.container.textContent, /Tanışma Kampanyası|ödeme için ayrıldı/);
    assert.match(view.container.textContent, /39\.000/);
    assert.equal(view.container.querySelector('del')?.textContent, '59.000 so‘m');
    const paragraphs = [...view.container.querySelectorAll('p')];
    assert.doesNotMatch(view.container.textContent, /kişiye özel/);
    assert.ok(paragraphs.some(p => p.textContent === '247 kontenjan kaldı'));
    assert.ok(view.container.textContent.indexOf('59.000') < view.container.textContent.indexOf('39.000'));
    assert.doesNotMatch(view.container.textContent, /245 kontenjan kaldı/);
  } finally { await view.unmount(); }
});

test('unlimited campaigns have no invented capacity; legacy discounts retain their old-price display', async () => {
  for (const row of [offer({ ...campaign, userLimit: null, remainingUsers: null, availableUsers: null }), offer(null)]) {
    const view = await card(row);
    try {
      assert.match(view.container.textContent, /39\.000/);
      assert.ok(view.container.querySelector('del'));
      assert.doesNotMatch(view.container.textContent, /kişiye özel|kontenjan/);
    } finally { await view.unmount(); }
  }
});

const inactiveCopy = {
  PAUSED: 'Kampanya duraklatıldı', SCHEDULED: 'Kampanya henüz başlamadı', ENDED: 'Kampanya sona erdi',
  SOLD_OUT: 'Kampanya kontenjanı doldu', RESERVED: 'Son kontenjanlar ödeme aşamasında',
  ALREADY_USED: 'Bu kampanyadan daha önce yararlandınız',
};
for (const [status, copy] of Object.entries(inactiveCopy)) {
  test(`${status} keeps regular pricing without extra campaign copy`, async () => {
    const view = await card(offer({ ...campaign, status, ...(status === 'SOLD_OUT' ? { remainingUsers: 0, availableUsers: 0 } : {}) }));
    try {
      assert.match(view.container.textContent, /59\.000/);
      assert.ok(!view.container.textContent.includes(copy));
      assert.doesNotMatch(view.container.textContent, /Tanışma Kampanyası|39\.000|ödeme için ayrıldı/);
      if (status === 'RESERVED' || status === 'SOLD_OUT') assert.match(view.container.textContent, /0 kontenjan kaldı/);
      else assert.doesNotMatch(view.container.textContent, /kişiye özel/);
      assert.equal(view.container.querySelector('del'), null);
    } finally { await view.unmount(); }
  });
}

let owner, rows, apiCalls, notifications, checkoutResponse, catalogResponse;
const api = {
  async get(url) {
    apiCalls.push(['GET', url, owner]);
    return { data: { data: catalogResponse ? await catalogResponse.promise : structuredClone(rows) } };
  },
  async post(url, body) {
    apiCalls.push(['POST', url, body]);
    if (checkoutResponse) return { data: await checkoutResponse.promise };
    throw { response: { status: 409 } };
  },
};
const { billingService } = await loadOfflineComponent('src/services/billing.service.ts', { '@/config/api': { default: api } });
const { default: Pricing } = await loadOfflineComponent('src/pages/home/ui/home-membership-pricing.tsx', {
  '@/config/api': { default: api },
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: !!owner, user: owner ? { id: owner } : null }) },
  '@/services/subscription.service': {
    subscriptionStatusQueryKey: ['subscription', 'status'],
    subscriptionService: { getConfig: async () => ({ paymentConnected: true }), getStatus: async () => ({ isActive: false }) },
  },
  sonner: { toast: { error: (message) => notifications.push(message) } },
});
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
function reset() {
  owner = 'student-a'; rows = [offer()]; apiCalls = []; notifications = [];
  checkoutResponse = null; catalogResponse = null;
}
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
async function pricing(client = newClient()) {
  const Harness = () => React.createElement(QueryClientProvider, { client }, React.createElement(Pricing));
  const view = await mount(Harness);
  await flush();
  return { ...view, client };
}
const buy = view => [...view.container.querySelectorAll('button')].find(button => /Abone Ol/.test(button.textContent));

test('catalog service preserves the public no-argument API and adds the owner catalog', async () => {
  reset();
  await billingService.getCatalog();
  assert.equal(typeof billingService.getOwnCatalog, 'function');
  await billingService.getOwnCatalog();
  assert.deepEqual(apiCalls.map(call => call.slice(0, 2)), [
    ['GET', '/api/billing/catalog'], ['GET', '/api/billing/catalog/me'],
  ]);
});

test('signed-in catalogs use account eligibility; different accounts and the public page cannot share it', async () => {
  reset(); const client = newClient(); let view;
  try {
    view = await pricing(client);
    assert.equal(apiCalls[0][1], '/api/billing/catalog/me');
    assert.match(view.container.textContent, /247 kontenjan kaldı/);
    await view.unmount(); view = null;
    owner = 'student-b'; catalogResponse = deferred();
    view = await pricing(client);
    assert.doesNotMatch(view.container.textContent, /kişiye özel|39\.000/);
    await act(async () => catalogResponse.resolve([offer({ ...campaign, status: 'ALREADY_USED' })]));
    await flush();
    assert.match(view.container.textContent, /59\.000/);
    assert.doesNotMatch(view.container.textContent, /kişiye özel/);
    await view.unmount(); view = null;
    owner = null; catalogResponse = null;
    view = await pricing(client);
    assert.equal(apiCalls.at(-1)[1], '/api/billing/catalog');
    assert.match(view.container.textContent, /247 kontenjan kaldı/);
  } finally { await view?.unmount(); client.clear(); }
});

test('the catalog polls every 15 seconds while visible, stops in background and refreshes on focus', async () => {
  reset();
  const nativeSetInterval = globalThis.setInterval;
  const nativeClearInterval = globalThis.clearInterval;
  const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  const intervals = new Map(); let nextTimer = 0;
  globalThis.setInterval = (callback, delay) => { const id = ++nextTimer; intervals.set(id, { callback, delay }); return id; };
  globalThis.clearInterval = id => intervals.delete(id);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  const tickCatalog = async () => {
    const timers = [...intervals.values()].filter(timer => timer.delay === 15000);
    assert.equal(timers.length, 1, 'the catalog has one 15-second polling interval');
    await act(async () => timers.forEach(timer => timer.callback()));
    await flush();
  };
  let view;
  try {
    view = await pricing();
    const before = apiCalls.length;
    await tickCatalog();
    assert.equal(apiCalls.length, before + 1);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    await act(async () => window.dispatchEvent(new Event('visibilitychange')));
    await tickCatalog();
    assert.equal(apiCalls.length, before + 1, 'a hidden tab must not poll');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    await act(async () => window.dispatchEvent(new Event('visibilitychange')));
    await flush();
    assert.equal(apiCalls.length, before + 2, 'returning to the page immediately refreshes the catalog');
  } finally {
    await view?.unmount(); view?.client.clear();
    globalThis.setInterval = nativeSetInterval;
    globalThis.clearInterval = nativeClearInterval;
    if (visibility) Object.defineProperty(document, 'visibilityState', visibility);
    else delete document.visibilityState;
  }
});

test('stale displayed price refreshes the catalog and requires a new click with the new amount and version', async () => {
  reset(); const view = await pricing();
  try {
    rows = [{ ...offer({ ...campaign, status: 'SOLD_OUT' }), versionId: 'new-version' }];
    await act(async () => buy(view).click());
    await flush();
    assert.deepEqual(apiCalls.filter(call => call[0] === 'POST'), [[
      'POST', '/api/billing/checkout', { packageId: 'synthetic-membership', expectedAmountUzs: 39000, expectedVersionId: 'synthetic-version' },
    ]]);
    assert.match(view.container.textContent, /59\.000/);
    assert.match(view.container.textContent, /Güncel fiyatı kontrol edip.*yeniden/);
    assert.equal(buy(view).disabled, false);
    checkoutResponse = deferred();
    await act(async () => buy(view).click());
    assert.deepEqual(apiCalls.filter(call => call[0] === 'POST').at(-1)[2], {
      packageId: 'synthetic-membership', expectedAmountUzs: 59000, expectedVersionId: 'new-version',
    });
    await act(async () => checkoutResponse.reject({ response: { status: 500 } }));
  } finally { await view.unmount(); view.client.clear(); }
});

test('repeated clicks while preparing one checkout issue a single request', async () => {
  reset(); checkoutResponse = deferred(); const view = await pricing();
  try {
    await act(async () => { const button = buy(view); button.click(); button.click(); });
    assert.equal(apiCalls.filter(call => call[0] === 'POST').length, 1);
    assert.equal(buy(view).disabled, true);
    await act(async () => checkoutResponse.reject({ response: { status: 500 } }));
  } finally { await view.unmount(); view.client.clear(); }
});


test('fully reserved capacity shows zero quietly until Buy is clicked, without preparing a full-price payment', async () => {
  reset(); rows = [offer({ ...campaign, status: 'RESERVED', claimedUsers: 999, reservedUsers: 1, remainingUsers: 1, availableUsers: 0 })];
  const view = await pricing();
  try {
    assert.match(view.container.textContent, /0 kontenjan kaldı/);
    assert.doesNotMatch(view.container.textContent, /ödeme için ayrıldı|ödeme aşamasında/);
    await act(async () => buy(view).click());
    await flush();
    assert.match(view.container.querySelector('[role="status"]')?.textContent ?? '', /1 kontenjan ödeme için ayrıldı/);
    assert.equal(apiCalls.filter(call => call[0] === 'POST').length, 0);
    rows = [offer({ ...campaign, remainingUsers: 1, availableUsers: 1, reservedUsers: 0, claimedUsers: 999 })];
    await act(async () => view.client.refetchQueries({ queryKey: ['billing', 'catalog'] }));
    await flush();
    assert.match(view.container.textContent, /1 kontenjan kaldı/);
    assert.doesNotMatch(view.container.textContent, /ödeme için ayrıldı/);
  } finally { await view.unmount(); view.client.clear(); }
});

test('losing the last available place during checkout reveals the reservation message after refreshing', async () => {
  reset(); rows = [offer({ ...campaign, remainingUsers: 1, availableUsers: 1, reservedUsers: 0, claimedUsers: 999 })];
  const view = await pricing();
  try {
    assert.match(view.container.textContent, /1 kontenjan kaldı/);
    assert.doesNotMatch(view.container.textContent, /ödeme için ayrıldı/);
    rows = [offer({ ...campaign, status: 'RESERVED', remainingUsers: 1, availableUsers: 0, reservedUsers: 1, claimedUsers: 999 })];
    await act(async () => buy(view).click());
    await flush();
    assert.match(view.container.textContent, /0 kontenjan kaldı/);
    assert.match(view.container.querySelector('[role="status"]')?.textContent ?? '', /1 kontenjan ödeme için ayrıldı/);
    assert.equal(apiCalls.filter(call => call[0] === 'POST').length, 1);
    assert.equal(apiCalls.filter(call => call[0] === 'POST')[0][2].expectedAmountUzs, 39000);
  } finally { await view.unmount(); view.client.clear(); }
});
