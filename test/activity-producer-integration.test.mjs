import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { React, act, loadOfflineComponent, mount, typeAnswer, fakeWindowClock } from './helpers/offline-react.mjs';
const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
const { Routes, Route } = await import('react-router-dom');
globalThis.DocumentFragment = window.DocumentFragment;
const id = '11111111-1111-4111-8111-111111111111';
const packageId = '22222222-2222-4222-8222-222222222222';
const attempt = '33333333-3333-4333-8333-333333333333';
const second = '44444444-4444-4444-8444-444444444444';
const owner = '55555555-5555-4555-8555-555555555555';
const { saveOwnedAccess, captureAccessLink } = await loadOfflineComponent('src/utils/access-link-context.ts');
let share = false, enabled = true, publicFree = true, starts = [], reports = [];
const access = {
  getConfig: async () => ({ enabled }),
  getCatalogSummary: async () => ({ groups: [] }),
  getDecisions: async (targets, mode) => targets.map(target => ({ target, canOpen: true, isPublicFree: publicFree, sourceKind: mode === 'PAID' ? 'PAID' : share ? 'SHARE' : 'PUBLIC', remaining: { PRACTICE_AI: 2, MOCK_WRITING: 2 }, ...(share ? { shareTarget: { scope: 'MOCK_READING', targetId: id } } : {}) })),
  createSession: async (_target, input) => ({ contextId: input?.mode === 'PAID' ? 'paid-context' : 'public-context' }),
  redeemShare: async () => ({ redemptionId: 'redemption', target: { scope: 'MOCK_READING', targetId: id } }),
};
const base = {
  '@/contexts/AuthContext': { useAuth: () => ({ isAuthenticated: true, user: { id: owner, coin: 100 }, refreshUser: async () => {} }) },
  '@/services/access.service': { accessService: access },
  '@/services/auth.service': { authService: { getStoredTokens: () => ({}) } },
  '@/services/subscription.service': { subscriptionStatusQueryKey: ['subscription', 'status'], subscriptionService: { getStatus: async () => ({ isActive: true, practiceRemaining: 2 }) } },
  '@/hooks/use-student-action': { useStudentAction: () => () => {} },
  '@/components/payme/PaymeCheckoutModal': { default: () => null },
  '@/config/billing': { isSubscriptionBillingEnabled: false },
  '@/components/practice/PracticeAllowance': { default: () => null },
  '@/components/ui/confirmation-modal': { ConfirmationModal: ({ isOpen, onConfirm }) => isOpen ? React.createElement('button', { onClick: onConfirm }, 'Onayla') : null },
  '@/components/ui/resizable': { ResizablePanelGroup: ({ children }) => React.createElement('div', null, children), ResizablePanel: ({ children }) => React.createElement('div', null, children), ResizableHandle: () => null },
};
const stores = await loadOfflineComponent('src/services/overallTest.service.ts', {
  ...base,
  '@/config/api': { default: { post: async (_url, payload) => { starts.push(payload); return { data: { overallTestId: attempt, testTokens: [{ testType: 'READING', testId: id, token: 'synthetic-section-token' }] } }; } }, resolveApiResourceUrl: value => value },
});
const presence = await loadOfflineComponent('src/hooks/use-student-presence.ts', {
  '@/services/overallTest.service': stores,
  '@/services/studentPresence.service': { studentPresenceEnabled: true, STUDENT_PRESENCE_LOGOUT_EVENT: 'fixture:logout', studentPresenceService: { isEnabled: async () => true, report: async (body, options) => { reports.push({ body, options }); }, close: async () => {} } },
});
const read = path => presence.readStudentPresenceRouteState(owner, path);
const { classifyStudentPage } = await loadOfflineComponent('src/utils/student-presence-route.ts');
const backendRequire = createRequire(new URL('../../backend/package.json', import.meta.url));
backendRequire('ts-node').register({ transpileOnly: true, skipProject: true, compilerOptions: { module: 'CommonJS', moduleResolution: 'Node', experimentalDecorators: true, emitDecoratorMetadata: false } });
const { StudentActivityService } = backendRequire('./src/modules/students/student-activity.service.ts');
process.env.ADMIN_LAUNCH_FEATURES_ENABLED = 'true';
async function verifyRun(state, domain, runId) {
  const input = classifyStudentPage(`/app/pratik/${domain === 'WRITING' ? 'yazma' : 'konusma'}/${id}`, state);
  let status = 'PENDING', userId = owner;
  const db = { [`${domain.toLowerCase()}PracticeEvaluation`]: { findFirst: async ({ where }) => {
    assert.equal(where.runId, runId); assert.equal(where.practiceId, id);
    return where.userId === userId ? { id: attempt, practiceId: id, userId, status, completedAt: null, practice: { title: 'Practice' } } : null;
  } } };
  const verifier = new StudentActivityService({});
  assert.equal((await verifier.verify(owner, input, db)).state, 'EVALUATING');
  for (status of ['FAILED', 'COMPLETED']) assert.equal((await verifier.verify(owner, input, db)).state, 'PAGE');
  status = 'PENDING'; userId = 'foreign';
  const foreign = await verifier.verify(owner, input, db);
  assert.equal(foreign.state, 'PAGE'); assert.equal(foreign.title, null);
}

const flush = async () => act(async () => new Promise(resolve => setTimeout(resolve, 20)));
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text);
async function click(text) { const node = button(text); assert.ok(node, `Missing ${text}: ${document.body.textContent}`); await act(async () => node.click()); await flush(); }
async function setup(Component, route = '/app/pratik', props = {}, prepare = () => {}) {
  sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('userId', owner); starts = []; reports = []; prepare();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  function Harness() { return React.createElement(QueryClientProvider, { client }, React.createElement(Component, props)); }
  const view = await mount(Harness, { route }); await flush();
  return { ...view, async close() { await view.unmount(); client.clear(); } };
}
function routeComponent(Component, path) { return () => React.createElement(Routes, null, React.createElement(Route, { path, element: React.createElement(Component) })); }

for (const shared of [false, true]) test(`real exact Mock ${shared ? 'share' : 'ordinary'} Start publishes evidence consumed by tracker`, async () => {
  share = shared;
  const catalog = { ieltsData: [{ id: packageId, title: 'Paket', category: 'CEFR_MOCK' }], readingTests: [{ id, ieltsId: packageId, status: 'PUBLISHED' }], listeningTests: [], writingTests: [], speakingTests: [] };
  const { default: Page } = await loadOfflineComponent('src/pages/test/test.tsx', {
    ...base, '@/config/api': { default: { get: async url => {
      if (url.startsWith('/api/ielts')) return { data: catalog };
      if (url === '/api/billing/me') return { data: { data: [] } };
      throw new Error(`Unexpected fixture GET: ${url}`);
    } }, resolveApiResourceUrl: value => value },
    '@/services/overallTest.service': { ...stores, default: { ...stores.overallTestService, getCurrentSession: async () => null }, overallTestService: { ...stores.overallTestService, getCurrentSession: async () => null } },
    '@/services/readingTest.service': { readingTestService: { getTestWithFullData: async () => ({}) } },
    '@/services/testCoinPrice.service': { default: { getAll: async () => [] } },
    './TestConfirmationModal': { default: props => props.open ? React.createElement('button', { onClick: props.onConfirm }, 'Hazırım') : null },
  });
  const route = `/app/test?package=${packageId}&skills=reading${shared ? '' : `&test=${id}`}`;
  let view;
  try {
    view = await setup(Page, route, { workspaceMode: true }, () => { if (shared) captureAccessLink(`${route}&share=${'a'.repeat(43)}`); });
    assert.equal(read(`/app/reading-test/${id}`).overallTestId, undefined);
    await click('Hazırım');
    assert.equal(starts.length, 1);
    assert.deepEqual(read(`/app/reading-test/${id}`), { userId: owner, ownerId: owner, overallTestId: attempt, mockTestId: id });
    const clock = fakeWindowClock();
    function Tracker() { presence.useStudentPresence({ userId: owner, routeContext: { pathname: `/app/reading-test/${id}` } }); return null; }
    const tracker = await mount(Tracker);
    try {
      assert.equal(reports[0].body.overallTestId, attempt);
      assert.equal(reports[0].options.mockSectionToken, 'synthetic-section-token');
      const now = new Date(); let completed = false, activeOwner = owner;
      const db = { overallTestResult: { findFirst: async ({ where }) => where.userId === activeOwner ? { id: attempt, userId: activeOwner, isCompleted: completed, readingResultId: null } : null }, listeningAndReadingTest: { findFirst: async () => ({ id, title: 'Reading', type: 'READING' }) } };
      const verifier = new StudentActivityService({ validateToken: async token => { assert.equal(token, 'synthetic-section-token'); return { userId: owner, overallTestId: attempt, testId: id, testType: 'READING', status: 'IN_PROGRESS', startedAt: new Date(+now - 1000).toISOString(), expiresAt: new Date(+now + 60000).toISOString() }; } });
      assert.equal((await verifier.verify(owner, reports[0].body, db, now, reports[0].options.mockSectionToken)).state, 'SOLVING');
      completed = true;
      assert.equal((await verifier.verify(owner, reports[0].body, db, now, reports[0].options.mockSectionToken)).state, 'PAGE');
      completed = false; activeOwner = 'foreign';
      assert.equal((await verifier.verify(owner, reports[0].body, db, now, reports[0].options.mockSectionToken)).state, 'PAGE');
      assert.doesNotMatch(JSON.stringify(reports[0].body), /token|context|share/i);
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (/tm_activity|tm_access_owned/.test(key)) assert.doesNotMatch(sessionStorage.getItem(key), /synthetic-section-token/);
      }
      assert.equal(presence.readStudentPresenceRouteState('foreign', `/app/reading-test/${id}`).overallTestId, undefined);
      stores.overallTestFlowStore.setOverallId(second);
      assert.equal(read(`/app/reading-test/${id}`).overallTestId, undefined);
    } finally { await tracker.unmount(); clock.restore(); }
  } finally { share = false; if (view) await view.close(); }
});

for (const resume of [false, true]) test(`normal Reading ${resume ? 'verified resume' : 'successful repeat starts'} reaches real route reader`, async () => {
  let next = attempt, calls = 0;
  const draft = { attemptId: attempt, answeredCount: 1, answers: { q: 'B' }, timerMinutes: 30, timerEnabled: true, remainingSeconds: 421 };
  const { default: List } = await loadOfflineComponent('src/pages/reading-practice/ReadingPracticeList.tsx', {
    ...base,
    '@/services/readingPractice.service': { readingPracticeService: {
      getAll: async () => [{ id, title: 'Okuma', isFreeAccess: true, isPublished: true, level: 'B1', practiceType: 'SECTION', sectionNumber: 1 }],
      getCompletedPassageIds: async () => [], start: async () => { calls++; return { attemptId: next }; }, getSolveDetail: async () => ({ id }),
    } },
  });
  const view = await setup(List, '/app/pratik', { workspaceMode: true }, () => { if (resume) localStorage.setItem(`reading-practice-progress:${id}`, JSON.stringify(draft)); });
  try {
    await act(async () => view.container.querySelector('article').click());
    if (resume) await click('Devam et');
    assert.equal(read(`/app/pratik/okuma/${id}`).readingPracticeAttemptId, attempt);
    if (resume) {
      assert.equal(calls, 0);
      assert.deepEqual(JSON.parse(localStorage.getItem(`reading-practice-progress:${id}`)), { ...draft, ownerId: owner });
    } else {
      next = second;
      await act(async () => view.container.querySelector('article').click());
      assert.equal(read(`/app/pratik/okuma/${id}`).readingPracticeAttemptId, second);
    }
    sessionStorage.setItem('userId', 'foreign');
    assert.equal(read(`/app/pratik/okuma/${id}`).readingPracticeAttemptId, undefined);
  } finally { await view.close(); }
});

test('Reading free badge follows the enabled server decision once, with legacy fallback only off', async () => {
  const { default: List } = await loadOfflineComponent('src/pages/reading-practice/ReadingPracticeList.tsx', { ...base, '@/services/readingPractice.service': { readingPracticeService: { getAll: async () => [{ id, title: 'Okuma', isFreeAccess: true, isPublished: true }], getCompletedPassageIds: async () => [] } } });
  for (const [rollout, free, count] of [[true, true, 1], [true, false, 0], [false, false, 1]]) {
    enabled = rollout; publicFree = free;
    const view = await setup(List, '/app/pratik', { workspaceMode: true });
    try { assert.equal((view.container.querySelector('article').textContent.match(/Ücretsiz/g) || []).length, count); }
    finally { await view.close(); enabled = true; publicFree = true; }
  }
});

test('real Writing evaluate and explicit PAID replacement publish the chosen run without inspecting the draft', async () => {
  const { writingPractice, writingAnswer, writingEvaluation } = await import('./fixtures/writing-practice-fixture.mjs');
  const calls = [];
  const { default: Writing } = await loadOfflineComponent('src/pages/writing-practice/WritingPracticeTest.tsx', {
    ...base, '@/services/writingPractice.service': { default: {
      solve: async () => ({ ...structuredClone(writingPractice), id }),
      evaluate: async (...args) => { calls.push({ args, evidence: read(`/app/pratik/yazma/${id}`) }); if (args[4].accessContextId !== 'paid-context') throw { response: { status: 402, data: { message: 'AI_LIMIT' } } }; return { ...structuredClone(writingEvaluation), answerText: args[2] }; },
      getEvaluation: async () => ({ status: 'FAILED', result: null }),
    } },
  });
  const target = { scope: 'PRACTICE_WRITING', targetId: id };
  const view = await setup(routeComponent(Writing, '/app/pratik/yazma/:id'), `/app/pratik/yazma/${id}`, {}, () => saveOwnedAccess(owner, target, { target, contextId: 'public-context' }));
  try {
    await typeAnswer(view.container.querySelector('textarea'), writingAnswer);
    await click('Değerlendir'); await click('Onayla');
    assert.equal(calls[0].evidence.evaluationRunId, calls[0].args[1]);
    await click('Üyeliğimle devam et');
    await click('Değerlendir'); await click('Onayla');
    assert.equal(calls[1].evidence.evaluationRunId, calls[1].args[1]);
    await verifyRun(calls[1].evidence, 'WRITING', calls[1].args[1]);
    assert.notEqual(calls[0].args[1], calls[1].args[1]);
    assert.equal(calls[1].args[4].accessContextId, 'paid-context');
    assert.equal(calls[1].args[2], writingAnswer);
    assert.doesNotMatch(JSON.stringify(calls[1].evidence), /answer|context|audio/i);
  } finally { await view.close(); }
});

test('real Speaking evaluate and PAID replacement preserve recordings and publish only the current run', async () => {
  const { speakingPractice, speakingEvaluation } = await import('./fixtures/speaking-practice-fixture.mjs');
  class Recorder { state = 'inactive'; mimeType = 'audio/webm'; start() { this.state = 'recording'; } stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['synthetic-audio'], { type: this.mimeType }) }); this.onstop?.(); }); } }
  globalThis.MediaRecorder = Recorder;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
  const oldCreate = URL.createObjectURL, oldRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => 'blob:synthetic'; URL.revokeObjectURL = () => {};
  window.HTMLMediaElement.prototype.pause = function () {};
  class Audio { async unlockFromUserGesture() { return true; } async playCue() {} async destroy() {} }
  const calls = [];
  const { default: Speaking } = await loadOfflineComponent('src/pages/speaking-practice/SpeakingPracticeTest.tsx', {
    ...base, '@/utils/examAudio': { ExamAudioController: Audio },
    '@/services/speakingPractice.service': { default: {
      solve: async () => ({ ...structuredClone(speakingPractice), id }),
      evaluate: async (...args) => { calls.push({ args, evidence: read(`/app/pratik/konusma/${id}`) }); if (args[3].accessContextId !== 'paid-context') throw { response: { status: 402, data: { message: 'AI_LIMIT' } } }; return structuredClone(speakingEvaluation); },
    } },
  });
  const target = { scope: 'PRACTICE_SPEAKING', targetId: id };
  const view = await setup(routeComponent(Speaking, '/app/pratik/konusma/:id'), `/app/pratik/konusma/${id}`, {}, () => saveOwnedAccess(owner, target, { target, contextId: 'public-context' }));
  const control = async label => act(async () => view.container.querySelector(`button[aria-label="${label}"]`).click());
  try {
    for (let i = 0; i < 2; i++) { await control('Kaydı başlat'); await control('Kaydı bitir'); if (!i) await control('Sonraki soru'); }
    await click('Değerlendir');
    assert.equal(calls[0].evidence.evaluationRunId, calls[0].args[1]);
    await click('Üyeliğimle devam et'); await click('Değerlendir');
    assert.equal(calls[1].evidence.evaluationRunId, calls[1].args[1]);
    await verifyRun(calls[1].evidence, 'SPEAKING', calls[1].args[1]);
    assert.notEqual(calls[1].args[1], calls[0].args[1]);
    assert.equal(calls[1].args[2][0].blob, calls[0].args[2][0].blob);
  } finally { await view.close(); URL.createObjectURL = oldCreate; URL.revokeObjectURL = oldRevoke; }
});
