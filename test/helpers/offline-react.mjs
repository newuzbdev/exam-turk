import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
// Query inactivity expiry should not keep a completed Node DOM-test worker
// alive for minutes. The timers still run while tests have active work.
const nativeSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, delay, ...args) => {
  const timer = nativeSetTimeout(callback, delay, ...args);
  if (Number(delay) >= 300_000) timer.unref?.();
  return timer;
};
// The sibling admin workspace already owns the DOM test dependency.
const { JSDOM } = require(require.resolve('jsdom', { paths: [process.cwd(), path.resolve('../admin')] }));
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://offline.test/' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLTextAreaElement', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLSelectElement', 'HTMLAnchorElement', 'SVGElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'Event', 'CustomEvent', 'AbortController', 'AbortSignal', 'sessionStorage', 'localStorage', 'getComputedStyle']) {
  Object.defineProperty(globalThis, key, { value: key === 'getComputedStyle' ? dom.window[key].bind(dom.window) : dom.window[key], configurable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
window.requestAnimationFrame = (callback) => window.setTimeout(callback, 16);
window.cancelAnimationFrame = (id) => window.clearTimeout(id);
globalThis.requestAnimationFrame = window.requestAnimationFrame;
globalThis.cancelAnimationFrame = window.cancelAnimationFrame;

export const React = await import('react');
export const { createRoot } = await import('react-dom/client');
export const { MemoryRouter, Routes, Route } = await import('react-router-dom');
export const { act } = React;
export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// Bundle local TS/TSX in memory. No Vite listener, app bootstrap or API client loads.
export async function loadOfflineComponent(entryPoint, mocks = {}, { env = {} } = {}) {
  const result = await build({
    entryPoints: [entryPoint], bundle: true, write: false, platform: 'node', format: 'cjs',
    packages: 'external', jsx: 'automatic', tsconfig: 'tsconfig.app.json',
    define: { 'import.meta.env': JSON.stringify(env) },
    plugins: [{ name: 'offline-boundaries', setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: 'offline' } : undefined);
      builder.onLoad({ filter: /.*/, namespace: 'offline' }, (args) => ({
        contents: `const dependency = __offlineTestDependencies[${JSON.stringify(args.path)}]; ${Object.keys(mocks[args.path]).map((key) => key === 'default' ? 'export default dependency.default;' : `export const ${key} = dependency.${key};`).join('\n')}`,
      }));
      builder.onLoad({ filter: /\.css$/ }, () => ({ contents: '', loader: 'js' }));
    } }],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', '__offlineTestDependencies', result.outputFiles[0].text)(require, module, module.exports, mocks);
  return module.exports;
}

export async function mount(Component, { props = {}, route = '/', routePattern = '*' } = {}) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [route] },
    React.createElement(Routes, null, React.createElement(Route, { path: routePattern, element: React.createElement(Component, props) })))));
  return { container, async unmount() { await act(async () => root.unmount()); container.remove(); } };
}

export function fakeWindowClock() {
  const old = Object.fromEntries(['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'].map((key) => [key, window[key]]));
  let time = 0, id = 0;
  const timers = new Map();
  window.setTimeout = (run, delay = 0) => { const next = ++id; timers.set(next, { run, at: time + delay }); return next; };
  window.clearTimeout = (key) => timers.delete(key);
  window.setInterval = (run, delay) => { const next = ++id; timers.set(next, { run, at: time + delay, interval: delay }); return next; };
  window.clearInterval = window.clearTimeout;
  return {
    async advance(ms) {
      const end = time + ms;
      let turns = 0;
      while (true) {
        const next = [...timers.entries()].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) break;
        if (++turns > 200) throw new Error('Unbounded timer loop');
        time = next[1].at;
        timers.delete(next[0]);
        if (next[1].interval) timers.set(next[0], { ...next[1], at: time + next[1].interval });
        await act(async () => next[1].run());
      }
      time = end;
    },
    restore() { Object.assign(window, old); },
  };
}

export async function typeAnswer(textarea, text) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
