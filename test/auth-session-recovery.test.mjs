import assert from 'node:assert/strict';
import test from 'node:test';
import axios, { AxiosError } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { React, act, deferred, fakeWindowClock, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { default: api } = await loadOfflineComponent('src/config/api.ts', {
  axios: { default: axios },
});
const { AuthProvider, useAuth } = await loadOfflineComponent('src/contexts/AuthContext.tsx', {
  '@tanstack/react-query': await import('@tanstack/react-query'),
  '@/config/api': { default: api, resolveApiResourceUrl: value => value },
  '@/services/payme.service': { paymeService: {} },
  '@/utils/toast': { toast: { error() {}, success() {} } },
});
const { authService } = await loadOfflineComponent('src/services/auth.service.ts', {
  '@/config/api': { default: api, resolveApiResourceUrl: value => value },
  '@/utils/toast': { toast: { error() {}, success() {} } },
});
const { requestReauthentication } = await loadOfflineComponent('src/utils/authSessionRecovery.ts');

const jwt = (exp, suffix='old') => `fixture.${btoa(JSON.stringify({id:'fixture-user',exp}))}.${suffix}`;
const token = jwt(Math.floor(Date.now()/1000)-30);
const renewed = jwt(Math.floor(Date.now()/1000)+86400, 'renewed');
const refresh = jwt(Math.floor(Date.now()/1000)+604800, 'refresh');
const user = {id:'fixture-user', name:'Örnek öğrenci', ageStatus:'ADULT_DECLARED', ageDeclaredAt:'2026-10-01', ageDeclarationVersion:'adult-self-declaration-2026-10-10-v2'};
const success = (config, data) => ({status:200, statusText:'OK', config, headers:{}, data});
const failure = (config, status, code) => new AxiosError('Fixture failure', 'ERR_BAD_RESPONSE', config, null, {
  status, statusText:'Fixture error', config, headers:{}, data:{success:false, ...(code ? {code} : {})},
});
let getCalls, refreshCalls, getResponse, refreshResponse, currentAuth;

function reset({localOnly=false, withRefresh=true}={}) {
  sessionStorage.clear(); localStorage.clear();
  getCalls=0; refreshCalls=0; currentAuth=null;
  for (const storage of localOnly ? [localStorage] : [localStorage, sessionStorage]) {
    storage.setItem('accessToken', token);
    if (withRefresh) storage.setItem('refreshToken', refresh);
  }
  sessionStorage.setItem('writing_answers_exam-1', 'Saved exam answer');
  sessionStorage.setItem('overall.sessionToken.exam-1', 'saved-attempt');
  localStorage.setItem('writing_practice_fixture', 'Saved practice answer');
  getResponse = config => success(config, user);
  refreshResponse = config => success(config, {accessToken:renewed});
  api.defaults.adapter = async config => { getCalls++; return getResponse(config); };
  axios.defaults.adapter = async config => { refreshCalls++; return refreshResponse(config); };
}
const assertDrafts = () => {
  assert.equal(sessionStorage.getItem('writing_answers_exam-1'), 'Saved exam answer');
  assert.equal(sessionStorage.getItem('overall.sessionToken.exam-1'), 'saved-attempt');
  assert.equal(localStorage.getItem('writing_practice_fixture'), 'Saved practice answer');
};
function Entry() {
  currentAuth = useAuth();
  return React.createElement('div', null,
    React.createElement('output', null, currentAuth.isLoading ? 'Loading' : currentAuth.isAuthenticated ? 'Workspace' : 'Login'),
    React.createElement('textarea', {defaultValue:'Unsaved input'}));
}
const routerModule = await import('react-router-dom');
const authContext = { AuthProvider, useAuth };
const { default: RequireStudentAuth } = await loadOfflineComponent('src/components/auth/require-student-auth.tsx', {
  '@/contexts/AuthContext': authContext,
  'react-router': routerModule,
  './student-age-declaration': {default: () => React.createElement('div',null,'Age declaration')},
});
function Observer() { currentAuth = useAuth(); return null; }
const Harness = () => React.createElement(QueryClientProvider,
  {client: new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})},
  React.createElement(AuthProvider, null, React.createElement(Observer),
    React.createElement(routerModule.Routes, null,
      React.createElement(routerModule.Route, {path:'/login', element:React.createElement(Entry)}),
      React.createElement(routerModule.Route, {element:React.createElement(RequireStudentAuth)},
        React.createElement(routerModule.Route,{path:'*',element:React.createElement(Entry)})))));

// Fixture Axios failures contain no real tokens or user data; keep test output focused.
const oldConsoleError = console.error;
test.before(() => { console.error = () => {}; });
test.after(() => { console.error = oldConsoleError; });

test('a new tab restores the persistent login, and expiry cleanup keeps a usable refresh token', async () => {
  reset({localOnly:true});
  authService.cleanupExpiredTokens();
  assert.equal(localStorage.getItem('refreshToken'), refresh);
  getResponse = config => {
    assert.equal(config.headers.Authorization, `Bearer ${token}`);
    return success(config, user);
  };
  const view = await mount(Harness);
  try { assert.match(view.container.textContent, /Workspace/); assertDrafts(); }
  finally { await view.unmount(); }
});

test('expired access tokens renew once for concurrent requests and each request retries only once', async () => {
  reset();
  const pending = deferred();
  refreshResponse = config => pending.promise.then(() => success(config, {data:{accessToken:renewed}}));
  getResponse = config => {
    if (config.headers.Authorization !== `Bearer ${renewed}`) throw failure(config,401,'JWT_EXPIRED');
    return success(config,user);
  };
  const requests = [api.get('/api/auth/me'), api.get('/api/me/dashboard')];
  // The adapters are asynchronous; observe the first renewal without sleeping.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshCalls,1);
  pending.resolve();
  await Promise.all(requests);
  assert.equal(getCalls,4);
  assert.equal(refreshCalls,1);
  for (const storage of [localStorage,sessionStorage]) assert.equal(storage.getItem('accessToken'),renewed);
  assertDrafts();
});

test('body-token renewal omits cookie credentials so the API wildcard CORS response remains readable', async () => {
  reset();
  getResponse = config => {
    if (config.headers.Authorization !== `Bearer ${renewed}`) throw failure(config,401,'JWT_EXPIRED');
    return success(config,user);
  };
  refreshResponse = config => {
    // This API receives the refresh token in JSON, not a cookie. Browsers reject
    // wildcard Access-Control-Allow-Origin responses in credentialed mode.
    assert.equal(config.withCredentials,false);
    assert.equal(config.timeout,10_000);
    assert.equal(JSON.parse(config.data).refreshToken,refresh);
    return success(config,{accessToken:renewed});
  };
  assert.equal((await api.get('/api/auth/me')).data.id,user.id);
  assert.equal(refreshCalls,1);
  assertDrafts();
});

for (const code of ['AGE_DECLARATION_REQUIRED', 'AGE_INELIGIBLE']) {
  test(`current-session ${code} returns to the age gate without renewing the login`, async () => {
    reset();
    const received = [];
    const listener = event => received.push(event.detail);
    window.addEventListener('auth:eligibility-required', listener);
    getResponse = config => { throw failure(config, 403, code); };
    try {
      await assert.rejects(api.get('/api/me/dashboard'), error => error.response.status === 403);
      assert.deepEqual(received, [code]);
      assert.equal(refreshCalls, 0);
      assert.equal(localStorage.getItem('refreshToken'), refresh);
      assertDrafts();
    } finally { window.removeEventListener('auth:eligibility-required', listener); }
  });
}

test('a late age rejection from a previous session cannot gate the newly logged-in account', async () => {
  reset();
  const received = [];
  const listener = event => received.push(event.detail);
  window.addEventListener('auth:eligibility-required', listener);
  const pending = deferred();
  getResponse = config => pending.promise.then(() => { throw failure(config, 403, 'AGE_INELIGIBLE'); });
  const request = api.get('/api/me/dashboard');
  await new Promise(resolve => setImmediate(resolve));
  for (const storage of [localStorage, sessionStorage]) storage.setItem('refreshToken', 'new-session-refresh');
  pending.resolve();
  try {
    await assert.rejects(request, error => error.response.status === 403);
    assert.deepEqual(received, []);
    assert.equal(refreshCalls, 0);
    assert.equal(localStorage.getItem('refreshToken'), 'new-session-refresh');
    assertDrafts();
  } finally { window.removeEventListener('auth:eligibility-required', listener); }
});

for (const code of ["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT", "503"]) {
  test(`account ${code} failure is bounded and does not fan out to the fallback route`, async () => {
    reset();
    sessionStorage.setItem('userId', user.id);
    getResponse = config => {
      assert.equal(config.timeout,10_000);
      throw code === '503' ? failure(config,503) : new AxiosError('Unavailable',code,config);
    };
    await assert.rejects(authService.getCurrentUser());
    assert.equal(getCalls,1);
    assert.equal(refreshCalls,0);
    assert.equal(localStorage.getItem('refreshToken'),refresh);
    assertDrafts();
  });
}

test('an unavailable primary account route retains the bounded legacy fallback', async () => {
  reset();
  sessionStorage.setItem('userId',user.id);
  getResponse = config => {
    assert.equal(config.timeout,10_000);
    if (config.url === '/api/auth/me') throw failure(config,404);
    assert.equal(config.url,`/api/user/${user.id}`);
    return success(config,user);
  };
  assert.equal((await authService.getCurrentUser()).id,user.id);
  assert.equal(getCalls,2);
  assertDrafts();
});

for (const status of [503, null]) {
  test(`a ${status ?? 'network'} renewal failure propagates the outage instead of the stale 401`, async () => {
    reset();
    getResponse = config => { throw failure(config,401,'JWT_EXPIRED'); };
    refreshResponse = config => { throw status ? failure(config,status) : new AxiosError('Network Error','ERR_NETWORK',config); };
    await assert.rejects(api.get('/api/auth/me'), error => status ? error.response.status === status : !error.response);
    assert.equal(localStorage.getItem('refreshToken'),refresh);
    assert.equal(sessionStorage.getItem('accessToken'),token);
    assertDrafts();
  });
}

test('a revoked/expired refresh token requires login and preserves exam and practice drafts', async () => {
  reset();
  getResponse = config => { throw failure(config,401,'JWT_EXPIRED'); };
  refreshResponse = config => { throw failure(config,401); };
  await assert.rejects(api.get('/api/auth/me'),error => error.response.status === 401);
  for (const storage of [localStorage,sessionStorage]) {
    assert.equal(storage.getItem('accessToken'),null);
    assert.equal(storage.getItem('refreshToken'),null);
  }
  assertDrafts();
});

test('a missing refresh token requires login without a refresh request or lost answers', async () => {
  reset({withRefresh:false});
  getResponse = config => { throw failure(config,401); };
  await assert.rejects(api.get('/api/auth/me'),error => error.response.status === 401);
  assert.equal(refreshCalls,0);
  assert.equal(localStorage.getItem('accessToken'),null);
  assertDrafts();
});

test('login rejection, forbidden responses and attempt-specific 401 do not renew or invalidate an existing login', async () => {
  for (const [url,status,code] of [['/api/user/login',401],['/api/me/dashboard',403],['/api/test/submit',401,'TEST_SESSION_EXPIRED']]) {
    reset();
    getResponse = config => { throw failure(config,status,code); };
    await assert.rejects(api.post(url,{}));
    assert.equal(refreshCalls,0);
    assert.equal(localStorage.getItem('accessToken'),token);
  }
});

test('a malformed renewal response retains tokens and a renewed token rejected by the server cannot loop', async () => {
  reset();
  getResponse = config => { throw failure(config,401,'JWT_EXPIRED'); };
  refreshResponse = config => success(config,{});
  await assert.rejects(api.get('/api/auth/me'),/yanıtı eksik/);
  assert.equal(localStorage.getItem('refreshToken'),refresh);
  reset();
  getResponse = config => { throw failure(config,401,'JWT_INVALID'); };
  await assert.rejects(api.get('/api/auth/me'));
  assert.equal(refreshCalls,1);
  assert.equal(getCalls,2);
  assert.equal(localStorage.getItem('accessToken'),null);
  assertDrafts();
});

test('a late renewal cannot restore a logged-out session or clear a newer login', async () => {
  for (const newerLogin of [false,true]) {
    reset();
    const pending = deferred();
    getResponse = config => { throw failure(config,401,'JWT_EXPIRED'); };
    refreshResponse = config => pending.promise.then(() => { throw failure(config,401); });
    const request = api.get('/api/auth/me');
    await new Promise(resolve => setImmediate(resolve));
    requestReauthentication();
    if (newerLogin) authService.storeTokensSilent('new-login','new-refresh');
    pending.resolve();
    await assert.rejects(request,/Oturum değişti/);
    assert.equal(localStorage.getItem('accessToken'),newerLogin ? 'new-login' : null);
    assertDrafts();
  }
});

test('a late 401 from an earlier login cannot retry as or invalidate the new user', async () => {
  reset();
  const pending = deferred();
  getResponse = config => pending.promise.then(() => { throw failure(config,401); });
  const request = api.get('/api/auth/me');
  await new Promise(resolve => setImmediate(resolve));
  authService.storeTokensSilent('new-login','new-refresh');
  pending.resolve();
  await assert.rejects(request,/Oturum değişti/);
  assert.equal(refreshCalls,0);
  assert.equal(localStorage.getItem('accessToken'),'new-login');
});

for (const status of [503,null]) {
  test(`initial ${status ?? 'network'} failure retains credentials, blocks unverified access and offers retry`, async () => {
    reset();
    getResponse = config => { throw status ? failure(config,status) : new AxiosError('Network Error','ERR_NETWORK',config); };
    const clock = fakeWindowClock();
    const view = await mount(Harness);
    try {
      assert.match(view.container.textContent,/Hesabınıza bağlanılıyor/);
      assert.doesNotMatch(view.container.textContent,/Workspace|Login|Hesabınıza şu anda ulaşılamıyor/);
      await clock.advance(7000);
      assert.match(view.container.textContent,/Hesabınıza şu anda ulaşılamıyor/);
      assert.doesNotMatch(view.container.textContent,/Workspace|Login/);
      assert.equal(localStorage.getItem('accessToken'),token);
      assertDrafts();
      getResponse = config => success(config,user);
      await act(async () => view.container.querySelector('button').click());
      assert.match(view.container.textContent,/Workspace/);
      assert.equal(currentAuth.isAuthenticated,true);
    } finally { await view.unmount(); clock.restore(); }
  });
}

test('an established session keeps its mounted work during an outage and recovers when online', async () => {
  reset();
  const view = await mount(Harness);
  try {
    const textarea = view.container.querySelector('textarea');
    textarea.value='Typed work stays mounted';
    getResponse = config => { throw failure(config,503); };
    await act(async () => currentAuth.refreshUser());
    assert.equal(currentAuth.isAuthenticated,true);
    assert.equal(view.container.querySelector('textarea'),textarea);
    assert.equal(textarea.value,'Typed work stays mounted');
    assert.match(view.container.textContent,/Oturumunuz ve çalışmanız korunuyor/);
    getResponse = config => success(config,user);
    await act(async () => window.dispatchEvent(new Event('online')));
    assert.equal(view.container.querySelector('[role="alert"]'),null);
    assertDrafts();
  } finally { await view.unmount(); }
});

test('a failed manual retry reports that the server is still unavailable without losing the login or drafts', async () => {
  reset();
  getResponse = config => { throw new AxiosError('Network Error','ERR_NETWORK',config); };
  const clock = fakeWindowClock();
  const view = await mount(Harness);
  try {
    await clock.advance(7000);
    await act(async () => view.container.querySelector('button').click());
    assert.match(view.container.textContent,/Bağlantı hâlâ kurulamadı/);
    assert.equal(view.container.querySelector('button').disabled,false);
    assert.equal(localStorage.getItem('refreshToken'),refresh);
    assertDrafts();
  } finally { await view.unmount(); clock.restore(); }
});

test('an unavailable account recovers after the server returns without an online event or another click', async () => {
  reset();
  const oldVisibility = Object.getOwnPropertyDescriptor(document,'visibilityState');
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  const clock = fakeWindowClock();
  getResponse = config => { throw new AxiosError('Network Error','ERR_NETWORK',config); };
  const view = await mount(Harness);
  try {
    assert.match(view.container.textContent,/Hesabınıza bağlanılıyor/);
    assert.doesNotMatch(view.container.textContent,/Hesabınıza şu anda ulaşılamıyor/);
    getResponse = config => success(config,user);
    await clock.advance(4999);
    assert.doesNotMatch(view.container.textContent,/Workspace/);
    assert.doesNotMatch(view.container.textContent,/Hesabınıza şu anda ulaşılamıyor/);
    await clock.advance(1);
    assert.match(view.container.textContent,/Workspace/);
    assertDrafts();
  } finally {
    await view.unmount(); clock.restore();
    if (oldVisibility) Object.defineProperty(document,'visibilityState',oldVisibility); else delete document.visibilityState;
  }
});

test('automatic account retries back off, skip hidden tabs and stop after unmount', async () => {
  reset();
  const oldVisibility = Object.getOwnPropertyDescriptor(document,'visibilityState');
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
  const clock = fakeWindowClock();
  getResponse = config => { throw new AxiosError('Network Error','ERR_NETWORK',config); };
  const view = await mount(Harness);
  let unmounted = false;
  try {
    const initialCalls = getCalls;
    await clock.advance(5000);
    const afterFirstRetry = getCalls;
    assert(afterFirstRetry > initialCalls);
    await clock.advance(9999);
    assert.equal(getCalls,afterFirstRetry);
    await clock.advance(1);
    assert(getCalls > afterFirstRetry);
    Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
    const hiddenCalls = getCalls;
    await clock.advance(20000);
    assert.equal(getCalls,hiddenCalls);
    await view.unmount(); unmounted = true;
    await clock.advance(60000);
    assert.equal(getCalls,hiddenCalls);
    assertDrafts();
  } finally {
    if (!unmounted) await view.unmount(); clock.restore();
    if (oldVisibility) Object.defineProperty(document,'visibilityState',oldVisibility); else delete document.visibilityState;
  }
});

test('confirmed authentication rejection clears only login state; a late user lookup cannot restore it', async () => {
  reset();
  const view = await mount(Harness);
  try {
    getResponse = config => { throw failure(config,401); };
    refreshResponse = config => { throw failure(config,401); };
    await act(async () => currentAuth.refreshUser());
    assert.equal(currentAuth.isAuthenticated,false);
    assert.match(view.container.textContent,/Login/);
    assertDrafts();
  } finally { await view.unmount(); }
  reset();
  const pending = deferred();
  getResponse = config => pending.promise.then(() => success(config,user));
  const delayedView = await mount(Harness);
  try {
    await act(async () => requestReauthentication());
    await act(async () => pending.resolve());
    assert.equal(currentAuth.isAuthenticated,false);
    assert.equal(localStorage.getItem('accessToken'),null);
  } finally { await delayedView.unmount(); }
});

const { GuestOnly } = await loadOfflineComponent('src/routes/student-route-guards.tsx', {
  '@/contexts/AuthContext': authContext,
  'react-router': routerModule,
});
const PublicHarness = () => React.createElement(QueryClientProvider,
  {client: new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})},
  React.createElement(AuthProvider, null,
    React.createElement(GuestOnly, null,
      React.createElement('main', null, 'Public page', React.createElement('input', {defaultValue:'Login draft'})))));

for (const route of ['/', '/login']) {
  test(`stored login with an unreachable API does not hide public route ${route}`, async () => {
    reset();
    getResponse = config => { throw new AxiosError('Network Error','ERR_NETWORK',config); };
    const view = await mount(PublicHarness, {route});
    try {
      assert.match(view.container.textContent, /Public page/);
      assert.equal(localStorage.getItem('refreshToken'),refresh);
      assertDrafts();
    } finally { await view.unmount(); }
  });
}

test('background account retry does not unmount a public login form or erase typed input', async () => {
  reset();
  getResponse = config => { throw new AxiosError('Network Error','ERR_NETWORK',config); };
  const view = await mount(PublicHarness, {route:'/login'});
  try {
    const input = view.container.querySelector('input');
    assert.ok(input, 'login remains accessible during an outage');
    input.value = 'Student typed this';
    const pending = deferred();
    getResponse = config => pending.promise.then(() => success(config,user));
    await act(async () => window.dispatchEvent(new Event('online')));
    assert.equal(view.container.querySelector('input'),input);
    assert.equal(input.value,'Student typed this');
    await act(async () => pending.resolve());
  } finally { await view.unmount(); }
});
