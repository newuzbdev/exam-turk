import test from 'node:test';
import assert from 'node:assert/strict';
import { React, act, mount, loadOfflineComponent, deferred, Routes, Route } from './helpers/offline-react.mjs';
const preloads = [];
const { default: Layout } = await loadOfflineComponent('src/components/student-app/student-app-layout.tsx', {
  '@/routes/student-page-loaders': { preloadStudentPage: path => preloads.push(path) },
  '@/config/studentFeatures': { useStudentLessonsEnabled: () => ({ enabled: false }) },
  '@/contexts/AuthContext': { useAuth: () => ({ user: { id: 'fixture', name: 'Örnek' }, logout() {} }) },
  '@/pages/dashboard/onboarding-api': { useStudentOnboarding: () => ({ data: null }) },
  './student-profile-menu': { StudentProfileMenu: () => null },
  './focus-timer-panel': { FocusTimerPanel: () => null },
  '@/components/logo-easter-egg': { LogoCoffeeSurprise: () => null, useLogoEasterEgg: () => ({ registerLogoClick() {}, isEasterEggVisible: false }) },
});

test('menu intent warms only the requested page code before navigation', async () => {
  preloads.length = 0;
  const view = await mount(Layout, { route: '/app' });
  try {
    assert.deepEqual(preloads, [], 'rendering the menu must not load every page');
    const link = view.container.querySelector('nav[aria-label="Öğrenci menüsü"] a[href="/app/pratik"]');
    await act(async () => link.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true })));
    assert.deepEqual(preloads, ['/app/pratik']);
  } finally { await view.unmount(); }
});

test('a slow first page import keeps the workspace menu visible instead of a full-page blank fallback', async () => {
  const pending = deferred();
  const SlowPage = React.lazy(() => pending.promise);
  const Harness = () => React.createElement(React.Suspense, { fallback: React.createElement('p', null, 'GLOBAL BLANK') },
    React.createElement(Routes, null, React.createElement(Route, { path: '/app', element: React.createElement(Layout) },
      React.createElement(Route, { index: true, element: React.createElement('h1', null, 'Dashboard content') }),
      React.createElement(Route, { path: 'pratik', element: React.createElement(SlowPage) }))));
  const view = await mount(Harness, { route: '/app' });
  try {
    const menu = view.container.querySelector('nav[aria-label="Öğrenci menüsü"]');
    assert.ok(menu);
    await act(async () => [...menu.querySelectorAll('a')].find(a => a.textContent === 'Pratik').click());
    assert.equal(menu.isConnected, true);
    assert.notEqual(menu.closest('[style*="display: none"]'), menu.parentElement);
    assert.doesNotMatch(view.container.textContent, /GLOBAL BLANK/);
    await act(async () => pending.resolve({ default: () => React.createElement('h1', null, 'Pratik content') }));
    assert.match(view.container.textContent, /Pratik content/);
    assert.equal(view.container.querySelector('nav[aria-label="Öğrenci menüsü"]'), menu);
  } finally { pending.resolve({ default: () => null }); await view.unmount(); }
});
