import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { useLocation } from 'react-router-dom';
import { React, act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

// Match the CommonJS query context used by the offline TSX bundle.
const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');

globalThis.DocumentFragment = window.DocumentFragment;
const rows = [false, true].map((isFreeAccess, index) => ({
  id: `practice-${index}`, title: index ? 'Açık pratik' : 'Üyelik pratiği',
  sectionCode: 'PART_1', level: 'B1', isFreeAccess, estimatedMinutes: 20,
  createdAt: '2026-10-05T00:00:00Z',
  isPublished: true, glossaryCount: 0, questionCount: 1, questionGroupCount: 1, attemptCount: 0,
}));
let starts = 0;
const service = { list: async () => structuredClone(rows) };
const status = { isActive: false, practiceRemaining: 0, writingMockRemaining: 0, speakingMockRemaining: 0 };
const { default: PracticeHome } = await loadOfflineComponent('src/pages/reading-practice/PracticeHome.tsx', {
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: true, refreshUser: async () => {} }) },
  '@/hooks/use-student-action': { useStudentAction: () => () => { throw new Error('Not a public preview'); } },
  '@/components/payme/PaymeCheckoutModal': { default: () => null },
  '@/services/subscription.service': {
    subscriptionStatusQueryKey: ['subscription', 'status'],
    subscriptionService: { getStatus: async () => structuredClone(status) },
  },
  '@/services/listeningPractice.service': { default: service },
  '@/services/writingPractice.service': { default: service },
  '@/services/speakingPractice.service': { default: service },
  '@/services/readingPractice.service': { readingPracticeService: {
    getAll: service.list,
    getCompletedPassageIds: async () => [],
    start: async () => { starts += 1; return { attemptId: 'attempt-1' }; },
  } },
});

function Harness({ client }) {
  const location = useLocation();
  return React.createElement(QueryClientProvider, { client },
    React.createElement('output', { 'data-route': true }, `${location.pathname}${location.hash}`),
    React.createElement(PracticeHome, { workspaceMode: true, basePath: '/app/pratik' }),
  );
}

async function setup(domain) {
  sessionStorage.clear(); localStorage.clear(); starts = 0;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  client.setQueryData(['subscription', 'status'], structuredClone(status));
  const view = await mount(Harness, { props: { client }, route: `/app/pratik?bolum=${domain}` });
  const deadline = Date.now() + 1000;
  while (!view.container.querySelector('article') && Date.now() < deadline) {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
  assert.ok(view.container.querySelector('article'), 'wait for practice cards before testing membership controls');
  return { ...view, client, async unmount() { await view.unmount(); client.clear(); } };
}
const card = (view, title) => [...view.container.querySelectorAll('article')].find(node => node.textContent.includes(title));
const locks = view => view.container.querySelectorAll('[role="img"][aria-label="Abonelik gerekli"]');
const route = view => view.container.querySelector('[data-route]').textContent;

for (const domain of ['listening', 'reading', 'writing', 'speaking']) {
  test(`${domain}: a locked card opens a dismissible membership warning before navigation or starting a practice`, async () => {
    const view = await setup(domain);
    try {
      assert.equal(locks(view).length, 1);
      assert.ok(card(view, 'Üyelik pratiği').querySelector('[aria-label="Abonelik gerekli"] svg'));
      assert.equal(card(view, 'Açık pratik').querySelector('[aria-label="Abonelik gerekli"]'), null);
      assert.doesNotMatch(card(view, 'Üyelik pratiği').textContent, /Abonelik gerekli/);
      await act(async () => card(view, 'Üyelik pratiği').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
      assert.equal(route(view), '/app/pratik');
      const dialog = document.querySelector('[role="dialog"]');
      assert.match(dialog.textContent, /Bu çalışmaya başlamak için önce abone olmanız gerekiyor\./);
      const dialogButton = text => [...document.querySelectorAll('[role="dialog"] button')].find(node => node.textContent === text);
      await act(async () => dialogButton('Vazgeç').click());
      assert.equal(document.querySelector('[role="dialog"]'), null);
      assert.equal(route(view), '/app/pratik');
      assert.equal(starts, 0);
      await act(async () => card(view, 'Üyelik pratiği').click());
      await act(async () => dialogButton('Abone Ol').click());
      assert.equal(route(view), '/app/fiyatlar#fiyatlandirma');
      assert.equal(starts, 0);
    } finally { await view.unmount(); }
  });

  test(`${domain}: membership updates unlock paid cards even with no AI quota; cancelling locks them again and free access stays open`, async () => {
    const view = await setup(domain);
    try {
      await act(async () => {
        view.client.setQueryData(['subscription', 'status'], { ...status, isActive: true });
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      assert.equal(locks(view).length, 0);
      await act(async () => {
        view.client.setQueryData(['subscription', 'status'], structuredClone(status));
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      assert.equal(locks(view).length, 1);
      await act(async () => card(view, 'Açık pratik').click());
      const segment = { listening: 'dinleme', reading: 'okuma', writing: 'yazma', speaking: 'konusma' }[domain];
      assert.equal(route(view), `/app/pratik/${segment}/practice-1`);
      assert.equal(starts, domain === 'reading' ? 1 : 0);
    } finally { await view.unmount(); }
  });
}
