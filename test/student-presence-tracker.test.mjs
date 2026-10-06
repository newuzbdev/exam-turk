import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import axios, { AxiosError } from 'axios';
import { React, act, createRoot, deferred, fakeWindowClock, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

let reports = [], closes = [], response = () => Promise.resolve({ accepted: true }), route = { pathname: '/app' }, owner = 'student-a';
let currentProps;
const { useStudentPresence } = await loadOfflineComponent('src/hooks/use-student-presence.ts', {
  '@/services/studentPresence.service': {
    studentPresenceEnabled: true,
    STUDENT_PRESENCE_LOGOUT_EVENT: 'student-presence:logout',
    studentPresenceService: { report(input, options) { reports.push({ input, options }); return response(); }, close(id) { closes.push(id); return Promise.resolve(); } },
  },
  '@/services/overallTest.service': { overallTestFlowStore: { getOverallId: () => null, getQueue: () => [], getPendingNextSection: () => null }, overallTestTokenStore: { getByTestId: () => { throw new Error('No mock on dashboard'); } } },
  '@/utils/access-link-context': { readCurrentActivity: () => null },
});
function Entry() { currentProps = React.useState(0)[1]; useStudentPresence({ userId: owner, routeContext: route }); return React.createElement('textarea', { defaultValue: 'unsaved draft' }); }
function reset(hidden = false) { reports = []; closes = []; response = () => Promise.resolve({ accepted: true }); route = { pathname: '/app' }; owner = 'student-a'; sessionStorage.setItem('userId', owner); Object.defineProperty(document, 'visibilityState', { configurable: true, value: hidden ? 'hidden' : 'visible' }); }
async function rerender() { await act(async () => currentProps(n => n + 1)); }

test('visible initial +30 +60 and hidden initial +60; sequences increase in one session', async () => {
  for (const [hidden, count] of [[false, 3], [true, 2]]) {
    reset(hidden); const clock = fakeWindowClock(); const view = await mount(Entry);
    try { await clock.advance(60_000); assert.equal(reports.length, count); assert.equal(new Set(reports.map(x => x.input.sessionId)).size, 1); assert.deepEqual(reports.map(x => x.input.sequence), Array.from({ length: count }, (_, n) => n + 1)); }
    finally { await view.unmount(); clock.restore(); }
  }
});

test('guest and admin route schedule no report', async () => {
  for (const [user, pathname] of [[undefined, '/app'], ['admin', '/admin/students']]) {
    reset(); owner = user; route = { pathname }; const clock = fakeWindowClock(); const view = await mount(Entry);
    try { await clock.advance(120_000); assert.equal(reports.length, 0); }
    finally { await view.unmount(); clock.restore(); }
  }
});

test('route transitions debounce 5 seconds; failures and rate rejection wait for next interval', async () => {
  reset(); response = () => Promise.resolve({ accepted: false }); const clock = fakeWindowClock(); const view = await mount(Entry);
  try {
    route = { pathname: '/app/test?token=secret' }; await rerender(); await clock.advance(2_000);
    route = { pathname: '/app/pratik?answers=private' }; await rerender(); await clock.advance(4_999); assert.equal(reports.length, 1);
    await clock.advance(1); assert.equal(reports.length, 2); assert.equal(reports[1].input.page, 'PRACTICE_CATALOG');
    response = () => Promise.reject(new Error('fixture outage')); await clock.advance(30_000); assert.equal(reports.length, 3);
    await clock.advance(5_000); assert.equal(reports.length, 3); assert.equal(view.container.querySelector('textarea').value, 'unsaved draft');
    assert.equal(route.pathname, '/app/pratik?answers=private'); assert.doesNotMatch(JSON.stringify(reports.map(x => x.input)), /secret|private|pathname|token|answers/);
  } finally { await view.unmount(); clock.restore(); }
});

test('one inflight bounded to five seconds; unmount/account cleanup aborts old callbacks', async () => {
  reset(); const pending = deferred(); response = () => pending.promise; const clock = fakeWindowClock(); const view = await mount(Entry);
  try {
    route = { pathname: '/app/test' }; await rerender(); await clock.advance(4_999); assert.equal(reports.length, 1); assert.equal(reports[0].options.signal.aborted, false);
    await clock.advance(1); assert.equal(reports[0].options.signal.aborted, true);
    await clock.advance(30_000); assert.equal(reports.length, 3);
    const oldSession = reports[2].input.sessionId; owner = 'student-b'; sessionStorage.setItem('userId', owner); await rerender(); assert.equal(reports[2].options.signal.aborted, true); assert.equal(closes.includes(oldSession), false);
    assert.notEqual(reports.at(-1).input.sessionId, oldSession); assert.equal(reports.at(-1).input.sequence, 1);
    await act(async () => pending.resolve({ accepted: true }));
    await view.unmount(); const count = reports.length; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('auth:access-context')); await clock.advance(120_000); assert.equal(reports.length, count);
  } finally { await view.unmount(); clock.restore(); }
});

test('visibility resets interval; logout initiates close and stops callbacks immediately', async () => {
  reset(); const clock = fakeWindowClock(); const view = await mount(Entry);
  try {
    await clock.advance(10_000); Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    await clock.advance(59_999); assert.equal(reports.length, 1); await clock.advance(1); assert.equal(reports.length, 2); assert.equal(reports[1].input.visible, false);
    await act(async () => window.dispatchEvent(new Event('student-presence:logout'))); assert.deepEqual(closes, [reports[0].input.sessionId]); await clock.advance(120_000); assert.equal(reports.length, 2);
  } finally { await view.unmount(); clock.restore(); }
});

test('StrictMode re-setup creates a fresh UUID and leaves one periodic loop', async () => {
  reset(); const clock = fakeWindowClock(); const container = document.createElement('div'); const root = createRoot(container);
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Entry))));
  try { assert.equal(reports.length, 2); assert.notEqual(reports[0].input.sessionId, reports[1].input.sessionId); await clock.advance(60_000); assert.equal(reports.length, 4); }
  finally { await act(async () => root.unmount()); clock.restore(); }
});

test('one workspace tracker, fullscreen outlet preserved, USER only, logout before token clear', async () => {
  const workspace = await readFile('src/components/student-app/student-workspace-layout.tsx', 'utf8');
  const sidebar = await readFile('src/components/student-app/student-app-layout.tsx', 'utf8');
  const auth = await readFile('src/contexts/AuthContext.tsx', 'utf8');
  assert.equal((workspace.match(/useStudentPresence\(/g) || []).length, 1); assert.doesNotMatch(sidebar, /useStudentPresence/);
  assert.match(workspace, /user\?\.role === ['"]USER['"]/); assert.match(workspace, /activeExam \? <Outlet \/> : <StudentAppLayout \/>/);
  const logout = auth.slice(auth.indexOf('const logout ='), auth.indexOf('useEffect(() =>', auth.indexOf('const logout =')));
  assert.ok(logout.indexOf('closeStudentPresenceBeforeLogout()') < logout.indexOf('authService.clearStoredTokens()'));
  const hook = await readFile('src/hooks/use-student-presence.ts', 'utf8'); assert.doesNotMatch(hook, /heartbeat|startOverall|getCurrentSession|setItem|toast|console\./);
});

test('continuous route changes do not starve the periodic heartbeat', async () => {
  reset(); const clock = fakeWindowClock(); const view = await mount(Entry);
  try {
    for (let i = 0; i < 8; i++) { route = { pathname: `/app/other-${i}` }; await rerender(); await clock.advance(4_000); }
    assert.equal(reports.length, 2); assert.equal(reports[1].input.page, 'OTHER');
  } finally { await view.unmount(); clock.restore(); }
});

test('actual existing owner stores supply only unique selected Mock and practice attempt/run identifiers', async () => {
  reset(); sessionStorage.clear(); localStorage.clear();
  const { readStudentPresenceRouteState } = await loadOfflineComponent('src/hooks/use-student-presence.ts');
  const { overallTestFlowStore, overallTestTokenStore } = await loadOfflineComponent('src/services/overallTest.service.ts');
  const { saveOwnedAccess, publishCurrentActivity } = await loadOfflineComponent('src/utils/access-link-context.ts');
  const id = '11111111-1111-4111-8111-111111111111', attempt = '22222222-2222-4222-8222-222222222222', another = '33333333-3333-4333-8333-333333333333';
  const save = (scope, targetId) => saveOwnedAccess(owner, { scope, targetId }, { contextId: 'opaque-context', target: { scope, targetId: id } });
  sessionStorage.setItem('userId', owner); overallTestFlowStore.setOverallId(attempt); overallTestFlowStore.setQueue([{ testType: 'READING', testId: id, path: `/reading-test/${id}` }]); overallTestTokenStore.set('READING', id, 'synthetic-section-token'); save('MOCK_PACKAGE', `overall:${attempt}`); publishCurrentActivity(owner, 'MOCK', { contentId: attempt, attemptId: attempt, target: { scope: 'MOCK_READING', targetId: id } });
  assert.deepEqual(readStudentPresenceRouteState(owner, `/app/reading-test/${id}`), { userId: owner, ownerId: owner, overallTestId: attempt, mockTestId: id });
  assert.deepEqual(readStudentPresenceRouteState('other-account', `/app/reading-test/${id}`), { userId: 'other-account' });
  overallTestFlowStore.setPendingNextSection({ fromTestType: 'LISTENING', next: { testType: 'READING', testId: id, path: `/reading-test/${id}` }, totalCount: 2, completedCount: 1 });
  assert.equal(readStudentPresenceRouteState(owner, '/app/overall-section-ready').overallTestId, attempt);
  for (const [domain, segment, marker, field] of [['READING', 'okuma', 'attempt', 'readingPracticeAttemptId'], ['WRITING', 'yazma', 'run', 'evaluationRunId'], ['SPEAKING', 'konusma', 'run', 'evaluationRunId']]) {
    save(`PRACTICE_${domain}`, `${id}:${marker}:${attempt}`);
    publishCurrentActivity(owner, domain, { contentId: id, attemptId: attempt, target: { scope: `PRACTICE_${domain}`, targetId: id } });
    const state = readStudentPresenceRouteState(owner, `/app/pratik/${segment}/${id}`); assert.equal(state[field], attempt); assert.equal(state.practiceId, id); assert.doesNotMatch(JSON.stringify(state), /synthetic-section-token|context|answer|audio|url/i);
    if (domain === 'READING') assert.equal(readStudentPresenceRouteState(owner, `/app/pratik/okuma/sonuc/${attempt}`).readingPracticeAttemptId, attempt);
    save(`PRACTICE_${domain}`, `${id}:${marker}:${another}`);
    assert.equal(readStudentPresenceRouteState(owner, `/app/pratik/${segment}/${id}`)[field], attempt, 'Historical context bindings do not override current activity');
    publishCurrentActivity(owner, domain, { contentId: id, attemptId: another, target: { scope: `PRACTICE_${domain}`, targetId: id } });
    assert.equal(readStudentPresenceRouteState(owner, `/app/pratik/${segment}/${id}`)[field], another);
  }
  sessionStorage.clear();
});

test('default-off browser gate schedules nothing', async () => {
  reset(); let calls = 0;
  let transport;
  const { useStudentPresence: disabledHook } = await loadOfflineComponent('src/hooks/use-student-presence.ts', {
    axios: { default: { create(options) { transport = axios.create(options); transport.defaults.adapter = async () => { calls++; throw new Error('Disabled telemetry dispatched'); }; return transport; } } },
    '@/config/api': { default: { defaults: { baseURL: 'http://offline.test' } }, resolveApiResourceUrl: value => value },
  });
  assert.ok(transport, 'observe the actual dedicated presence transport');
  const Disabled = () => { disabledHook({ userId: owner, routeContext: { pathname: '/app' } }); return null; };
  const clock = fakeWindowClock(); const view = await mount(Disabled);
  try { await clock.advance(120_000); assert.equal(calls, 0); }
  finally { await view.unmount(); clock.restore(); }
});

test('actual authenticated Axios service projects DTO, sends transient header, and HTTP telemetry failures cannot refresh or logout', async () => {
  sessionStorage.clear(); localStorage.clear();
  const { transport: api, studentPresenceService } = await presenceTransportFixture();
  const id = '11111111-1111-4111-8111-111111111111'; const input = { sessionId: id, sequence: 1, page: 'MOCK_TEST', visible: true, overallTestId: id, token: 'secret', answers: 'private answer', url: 'https://private.test' };
  sessionStorage.setItem('accessToken', 'fixture-access'); sessionStorage.setItem('refreshToken', 'fixture-refresh'); sessionStorage.setItem('writing_answers_exam', 'draft');
  let refreshCalls = 0, authEvents = 0, captured; const oldAdapter = axios.defaults.adapter;
  axios.defaults.adapter = () => { refreshCalls++; throw new Error('Refresh is forbidden'); };
  const authEvent = () => authEvents++; window.addEventListener('auth:reauthentication-required', authEvent);
  try {
    for (const status of [401, 403, 429, 503]) {
      api.defaults.adapter = async config => {
        captured = config;
        assert.equal(config.validateStatus(status), true);
        return { status, statusText: 'fixture', config, headers: {}, data: { success: false, error: 'private upstream text' } };
      };
      await assert.rejects(studentPresenceService.report(input, { signal: new AbortController().signal, mockSectionToken: 'synthetic-mock-header' }), /Presence unavailable/);
      assert.equal(captured.headers.Authorization, 'Bearer fixture-access'); assert.equal(captured.headers['x-mock-section-token'], 'synthetic-mock-header');
      assert.deepEqual(JSON.parse(captured.data), { sessionId: id, sequence: 1, visible: true, page: 'MOCK_TEST', overallTestId: id });
      assert.equal(captured.url, '/api/me/presence'); assert.equal(captured.timeout, 5_000);
      await studentPresenceService.close(id);
      assert.equal(captured.method, 'delete'); assert.equal(captured.headers.Authorization, 'Bearer fixture-access');
      assert.equal(captured.headers['x-mock-section-token'], undefined);
      assert.equal(sessionStorage.getItem('refreshToken'), 'fixture-refresh'); assert.equal(sessionStorage.getItem('writing_answers_exam'), 'draft');
    }
    assert.equal(refreshCalls, 0); assert.equal(authEvents, 0);
    api.defaults.adapter = async config => ({ status: 200, statusText: 'OK', config, headers: {}, data: { success: true, data: { accepted: false, serverNow: '2026-10-06T00:00:00Z' } } });
    assert.equal((await studentPresenceService.report(input, { signal: new AbortController().signal })).accepted, false);
    api.defaults.adapter = async config => ({ status: 200, statusText: 'OK', config, headers: {}, data: { success: false, data: { accepted: true } } });
    await assert.rejects(studentPresenceService.report(input, { signal: new AbortController().signal }), /Presence unavailable/);
  } finally { axios.defaults.adapter = oldAdapter; window.removeEventListener('auth:reauthentication-required', authEvent); sessionStorage.clear(); }
});

// Exercise dispatch after a microtask, with the real ordinary API interceptor
// available as the pre-fix fallback. The dedicated transport owns no auth interceptor.
async function presenceTransportFixture() {
  const { default: sharedApi } = await loadOfflineComponent('src/config/api.ts', { axios: { default: axios } });
  let dedicated;
  const narrowAxios = { create(options) { dedicated = axios.create(options); return dedicated; } };
  const { studentPresenceService } = await loadOfflineComponent('src/services/studentPresence.service.ts', { '@/config/api': { default: sharedApi }, axios: { default: narrowAxios } });
  return { transport: dedicated ?? sharedApi, sharedApi, studentPresenceService };
}

for (const operation of ['report', 'close']) test(`${operation} preserves call-time identity when credentials are replaced before actual dispatch`, async () => {
  sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('accessToken', 'fixture-account-A');
  const { transport, sharedApi, studentPresenceService } = await presenceTransportFixture();
  let captured;
  transport.interceptors.request.use(async config => { await Promise.resolve(); return config; });
  transport.defaults.adapter = async config => {
    assert.equal(sessionStorage.getItem('accessToken'), 'fixture-account-B', 'replacement happens before actual dispatch');
    captured = config;
    return { status: 200, statusText: 'OK', config, headers: {}, data: { success: true, data: { accepted: true, serverNow: '2026-10-06T00:00:00Z' } } };
  };
  const sessionId = '11111111-1111-4111-8111-111111111111';
  const pending = operation === 'close' ? studentPresenceService.close(sessionId) : studentPresenceService.report({ sessionId, sequence: 1, visible: true, page: 'DASHBOARD' }, { signal: new AbortController().signal });
  sessionStorage.setItem('accessToken', 'fixture-account-B');
  try {
    await pending;
    assert.equal(captured.headers.Authorization, 'Bearer fixture-account-A');
    assert.equal(captured.baseURL, sharedApi.defaults.baseURL);
    assert.doesNotMatch(captured.url, /fixture-account/);
    if (operation === 'report') assert.equal(JSON.parse(captured.data).sessionId, sessionId);
    else assert.equal(captured.url, `/api/me/presence/${sessionId}`);
  } finally { sessionStorage.clear(); }
});

test('close captures authentication before immediate token clear and aborts at five seconds without retry', async () => {
  reset(); sessionStorage.clear(); localStorage.clear(); sessionStorage.setItem('accessToken', 'fixture-close-token');
  const { transport: api, studentPresenceService } = await presenceTransportFixture();
  const clock = fakeWindowClock(); let calls = 0, config;
  api.defaults.adapter = value => { calls++; config = value; return new Promise((_, reject) => value.signal.addEventListener('abort', () => reject(new AxiosError('canceled', 'ERR_CANCELED', value)))); };
  const closing = studentPresenceService.close('11111111-1111-4111-8111-111111111111'); sessionStorage.removeItem('accessToken');
  let logs = 0; const oldError = console.error; console.error = () => { logs++; };
  try {
    await act(async () => {}); assert.equal(calls, 1); assert.equal(config.headers.Authorization, 'Bearer fixture-close-token');
    await clock.advance(5_000); assert.equal(config.signal.aborted, true); await closing;
    await clock.advance(120_000); assert.equal(calls, 1); assert.equal(sessionStorage.getItem('accessToken'), null);
    assert.equal(logs, 0);
  } finally { console.error = oldError; clock.restore(); }
});

test('known Mock token is read only from producer store and passed only in transient options; prep never sends it', async () => {
  reset(); sessionStorage.clear();
  const id = '11111111-1111-4111-8111-111111111111', attempt = '22222222-2222-4222-8222-222222222222';
  sessionStorage.setItem('userId', owner);
  let tokenReads = 0, received = [], closes = [];
  const { useStudentPresence: knownHook } = await loadOfflineComponent('src/hooks/use-student-presence.ts', {
    '@/services/studentPresence.service': { studentPresenceEnabled: true, STUDENT_PRESENCE_LOGOUT_EVENT: 'student-presence:logout', studentPresenceService: { report(input, options) { received.push({ input, options }); return Promise.resolve({ accepted: true }); }, close(id) { closes.push(id); return Promise.resolve(); } } },
    '@/services/overallTest.service': { overallTestFlowStore: { getOverallId: () => attempt, getQueue: () => [{ testType: 'READING', testId: id }], getPendingNextSection: () => ({ next: { testId: id } }) }, overallTestTokenStore: { getByTestId(testId) { assert.equal(testId, id); tokenReads++; return 'known-mock-token'; } } },
    '@/utils/access-link-context': { readCurrentActivity: () => ({ contentId: attempt, attemptId: attempt }) },
  });
  const Known = ({ pathname }) => { knownHook({ userId: owner, routeContext: { pathname } }); return null; };
  const clock = fakeWindowClock(); const view = await mount(Known, { props: { pathname: `/app/reading-test/${id}` } });
  try { assert.equal(tokenReads, 1); assert.equal(received[0].options.mockSectionToken, 'known-mock-token'); assert.equal(received[0].input.overallTestId, attempt); assert.doesNotMatch(JSON.stringify(received[0].input), /known-mock-token|contextId|pathname/); }
  finally { await view.unmount(); clock.restore(); }
  const prepClock = fakeWindowClock(); const prep = await mount(Known, { props: { pathname: '/app/overall-section-ready' } });
  try { assert.equal(tokenReads, 1); assert.equal(received.at(-1).input.page, 'PREPARATION'); assert.equal(received.at(-1).input.overallTestId, attempt); assert.equal(received.at(-1).options.mockSectionToken, undefined); }
  finally { await prep.unmount(); prepClock.restore(); sessionStorage.clear(); }
});

test('actual workspace starts exactly one lifecycle for USER exams and none for guests/admins', async () => {
  let auth = { isAuthenticated: true, user: { id: 'student-a', role: 'USER' } }, calls = [];
  const { default: Workspace } = await loadOfflineComponent('src/components/student-app/student-workspace-layout.tsx', {
    '@/contexts/AuthContext': { useAuth: () => auth },
    '@/hooks/use-student-presence': { useStudentPresence: value => calls.push(value) },
    '@/components/subscription/MockAccessRecovery': { default: () => null },
    './student-app-layout': { default: () => React.createElement('div', null, 'sidebar') },
    '@/utils/examFullscreen': { clearExamPresentation: async () => {} },
  });
  for (const [identity, expected] of [[auth, 'student-a'], [{ isAuthenticated: true, user: { id: 'admin', role: 'ADMIN' } }, undefined], [{ isAuthenticated: false, user: null }, undefined]]) {
    auth = identity; calls = []; const view = await mount(Workspace, { route: '/app/reading-test/11111111-1111-4111-8111-111111111111' });
    try { assert.equal(calls.length, 1); assert.equal(calls[0].userId, expected); assert.equal(view.container.textContent.includes('sidebar'), false); }
    finally { await view.unmount(); }
  }
});
