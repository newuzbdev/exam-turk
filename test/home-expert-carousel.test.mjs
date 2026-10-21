import assert from 'node:assert/strict';
import test from 'node:test';
import { act, loadOfflineComponent, mount, fakeWindowClock } from './helpers/offline-react.mjs';

// Public showcase media is local; click telemetry is the only network boundary.
globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
const { default: HomeExpertOpinions } = await loadOfflineComponent('src/pages/home/ui/home-expert-opinions.tsx', {
  '@/assets/experts/hakan-birdal.webp': { default: '/assets/hakan-birdal.test.webp' },
  '@/assets/experts/muattar-mamatkarimova.webp': { default: '/assets/muattar-mamatkarimova.test.webp' },
  '@/assets/experts/timur-makarov.webp': { default: '/assets/timur-makarov.test.webp' },
});

async function setup({ reducedMotion = false } = {}) {
  window.matchMedia = () => ({ matches: reducedMotion, addEventListener() {}, removeEventListener() {} });
  let hidden = false;
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  const clock = fakeWindowClock();
  const view = await mount(HomeExpertOpinions);
  return {
    ...view,
    clock,
    async hide(value) { await act(async () => { hidden = value; document.dispatchEvent(new Event("visibilitychange")); }); },
    async close() { await view.unmount(); clock.restore(); },
  };
}

const currentName = view => view.container.querySelector('figcaption p')?.textContent;
async function click(view, label) {
  const button = [...view.container.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === label);
  assert.ok(button, `Missing control: ${label}`);
  await act(async () => button.click());
}

test('Hakan stays ten seconds, the other two stay three seconds, and there is no play control', async () => {
  const view = await setup();
  try {
    assert.equal(view.container.querySelectorAll('figure').length, 1);
    assert.equal(currentName(view), 'Hakan Birdal');
    await view.clock.advance(9999);
    assert.equal(currentName(view), 'Hakan Birdal');
    await view.clock.advance(1);
    assert.equal(currentName(view), 'Muattar Mamatkarimova');
    await view.clock.advance(3000);
    assert.equal(currentName(view), 'Timur Makarov');
    await view.clock.advance(3000);
    assert.equal(currentName(view), 'Hakan Birdal');
  } finally { await view.close(); }
});

test('manual selection uses the selected expert duration and focus only pauses while inside', async () => {
  const view = await setup();
  try {
    assert.equal(view.container.querySelector('[aria-label="Otomatik geçişi başlat"]'), null);
    assert.equal(view.container.querySelector('[aria-label="Otomatik geçişi durdur"]'), null);
    await click(view, 'Timur Makarov yorumunu göster');
    await view.clock.advance(2999);
    assert.equal(currentName(view), 'Timur Makarov');
    await view.clock.advance(1);
    assert.equal(currentName(view), 'Hakan Birdal');
    const link = view.container.querySelector('a');
    await act(async () => link.focus());
    await view.clock.advance(20000);
    assert.equal(currentName(view), 'Hakan Birdal');
    await act(async () => link.blur());
    await view.clock.advance(10000);
    assert.equal(currentName(view), 'Muattar Mamatkarimova');
  } finally { await view.close(); }
});

test('hovering pauses the reading card and leaving gives another full reading period', async () => {
  const view = await setup();
  try {
    const region = view.container.querySelector('#ogretmen-gorusleri');
    await act(async () => region.dispatchEvent(new window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })));
    await view.clock.advance(10000);
    assert.equal(currentName(view), 'Hakan Birdal');
    await act(async () => region.dispatchEvent(new window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })));
    await view.clock.advance(9999);
    assert.equal(currentName(view), 'Hakan Birdal');
    await view.clock.advance(1);
    assert.equal(currentName(view), 'Muattar Mamatkarimova');
  } finally { await view.close(); }
});

test('a hidden tab does not advance through expert opinions in the background', async () => {
  const view = await setup();
  try {
    await view.hide(true);
    await view.clock.advance(15000);
    assert.equal(currentName(view), 'Hakan Birdal');
    await view.hide(false);
    await view.clock.advance(10000);
    assert.equal(currentName(view), 'Muattar Mamatkarimova');
  } finally { await view.close(); }
});

test('reduced motion starts without automatic rotation while manual choices still work', async () => {
  const view = await setup({ reducedMotion: true });
  try {
    await view.clock.advance(15000);
    assert.equal(currentName(view), 'Hakan Birdal');
    await click(view, 'Muattar Mamatkarimova yorumunu göster');
    assert.equal(currentName(view), 'Muattar Mamatkarimova');
  } finally { await view.close(); }
});

test('portraits stay mounted across slide changes and are available without a media API round trip', async () => {
  let mediaRequests = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { mediaRequests++; throw new Error('offline'); };
  const view = await setup();
  try {
    const portraits = [...view.container.querySelectorAll('img')];
    assert.equal(portraits.length, 3, 'All small portraits load once, before their slide is selected');
    assert.equal(portraits.filter(image => !image.hidden).length, 1);
    for (const label of ['Muattar Mamatkarimova', 'Timur Makarov', 'Hakan Birdal']) {
      await click(view, `${label} yorumunu göster`);
      assert.deepEqual([...view.container.querySelectorAll('img')], portraits, 'Switching slides must reuse the loaded image nodes');
      assert.equal(portraits.filter(image => !image.hidden).length, 1);
    }
    assert.equal(mediaRequests, 0, 'Public showcase portraits must not wait for temporary signed URLs');
  } finally { await view.close(); globalThis.fetch = originalFetch; }
});

test('social click tracking does not prevent opening the link and sends only the configured pair', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); throw new Error('network unavailable'); };
  const view = await setup();
  try {
    const link = view.container.querySelector('a');
    assert.equal(link.target, '_blank');
    const event = new window.MouseEvent('click', { bubbles: true, cancelable: true });
    await act(async () => link.dispatchEvent(event));
    assert.equal(event.defaultPrevented, false);
    assert.equal(calls.length, 1);
    const [url, options] = calls[0];
    assert.match(url, /\/api\/expert-social\/clicks$/);
    assert.equal(options.keepalive, true);
    assert.equal(options.credentials, 'omit');
    const body = JSON.parse(options.body);
    assert.deepEqual(Object.keys(body).sort(), ['eventId', 'expertId', 'platform']);
    assert.equal(body.expertId, 'expert/hakan-birdal');
    assert.equal(body.platform, 'TELEGRAM');
    assert.match(body.eventId, /^[a-f0-9-]{36}$/i);
    await act(async () => link.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })));
    assert.equal(calls.length, 1, 'An accidental immediate double click is not two visits');
  } finally { await view.close(); globalThis.fetch = originalFetch; }
});

test('social links stay black at rest and use the platform accent on hover and keyboard focus', async () => {
  const view = await setup();
  try {
    const links = [...view.container.querySelectorAll('figcaption a')];
    assert.equal(links.length, 2);
    for (const link of links) {
      assert.ok(link.classList.contains('text-black'));
      assert.ok(link.classList.contains('hover:text-[var(--tm-accent)]'));
      assert.ok(link.classList.contains('focus-visible:text-[var(--tm-accent)]'));
      assert.equal(link.classList.contains('hover:text-black'), false);
    }
  } finally { await view.close(); }
});


test('local development does not send test clicks to the live metrics endpoint', async () => {
  const { trackExpertSocialClick } = await loadOfflineComponent('src/pages/home/ui/expert-social-clicks.ts', {}, {env:{DEV:true}});
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; return {}; };
  try {
    trackExpertSocialClick('expert/hakan-birdal', 'TELEGRAM');
    assert.equal(requests, 0);
  } finally { globalThis.fetch = originalFetch; }
});
