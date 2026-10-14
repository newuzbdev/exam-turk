import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { React, act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { default: MapPanels } = await loadOfflineComponent('src/components/listening-test/ListeningMobileSplitPanels.tsx');
const originalPause = window.HTMLMediaElement.prototype.pause;
window.HTMLMediaElement.prototype.pause = function () {};
test.after(() => { window.HTMLMediaElement.prototype.pause = originalPause; });
const { AudioPlayer } = await loadOfflineComponent('src/pages/listening-test/components/AudioPlayer.tsx');

function screen(width) {
  const listeners = new Set();
  const media = { matches: width <= 767, addEventListener: (_, cb) => listeners.add(cb), removeEventListener: (_, cb) => listeners.delete(cb) };
  window.matchMedia = () => media;
  return async (nextWidth) => {
    media.matches = nextWidth <= 767;
    await act(async () => listeners.forEach(cb => cb(media)));
  };
}

const map = React.createElement('img', { alt: 'Test map' });
const questions = React.createElement('button', null, 'Answer');
const legacy = React.createElement('section', { 'data-desktop': true }, map, questions);

test('phones mount one map and one answer area in vertical resizable panels', () => {
  screen(390);
  const html = renderToStaticMarkup(React.createElement(MapPanels, { upper: map, lower: questions }, legacy));
  assert.equal((html.match(/alt="Test map"/g) || []).length, 1);
  assert.equal((html.match(/>Answer</g) || []).length, 1);
  assert.match(html, /data-panel-group-direction="vertical"/);
  assert.doesNotMatch(html, /data-desktop/);
});

test('the desktop breakpoint returns the original layout without an extra wrapper', () => {
  for (const width of [768, 1440]) {
    screen(width);
    assert.equal(renderToStaticMarkup(React.createElement(MapPanels, { upper: map, lower: questions }, legacy)), renderToStaticMarkup(legacy));
  }
});

test('phone matching questions and options each mount once, with a vertical separator', () => {
  screen(390);
  const upper = React.createElement('button', null, 'Speaker answer');
  const lower = React.createElement('p', null, 'Matching options');
  const html = renderToStaticMarkup(React.createElement(MapPanels, { upper, lower, className: 'listening-mobile-matching-panels' }, legacy));
  assert.equal((html.match(/>Speaker answer</g) || []).length, 1);
  assert.equal((html.match(/>Matching options</g) || []).length, 1);
  assert.match(html, /data-panel-group-direction="vertical"/);
  assert.doesNotMatch(html, /Test map|data-desktop/);
});

test('mobile audio uses phone volume even when a saved web control was muted', async () => {
  screen(390);
  sessionStorage.setItem('mobile-audio', JSON.stringify({ currentTime: 12, volume: 0, muted: true }));
  const view = await mount(AudioPlayer, { props: { src: '/test.mp3', persistKey: 'mobile-audio', autoPlay: false, muted: true, onAudioEnded() {} } });
  try {
    const audio = view.container.querySelector('audio');
    assert.equal(audio.muted, false);
    assert.equal(audio.volume, 1);
    await act(async () => audio.dispatchEvent(new Event('loadedmetadata')));
    assert.equal(audio.currentTime, 12);
  } finally { await view.unmount(); }
});

test('changing viewport changes only volume output and preserves the audio element and position', async () => {
  const resize = screen(1440);
  const view = await mount(AudioPlayer, { props: { src: '/test.mp3', autoPlay: false, muted: true, onAudioEnded() {} } });
  try {
    const audio = view.container.querySelector('audio');
    audio.currentTime = 18;
    assert.equal(audio.muted, true);
    assert.equal(audio.volume, 0.7);
    await resize(390);
    assert.equal(view.container.querySelector('audio'), audio);
    assert.equal(audio.currentTime, 18);
    assert.equal(audio.muted, false);
    assert.equal(audio.volume, 1);
    await resize(1440);
    assert.equal(audio.currentTime, 18);
    assert.equal(audio.muted, true);
    assert.equal(audio.volume, 0.7);
  } finally { await view.unmount(); }
});
