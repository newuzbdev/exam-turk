import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { React, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const input = await loadOfflineComponent('src/components/writing-test/use-writing-input-mode.ts');

test('phone writing uses the native keyboard without changing the stored desktop choice', () => {
  input.writingInputModeStore.set('mock-writing', 'local-test', 'long-press');
  const saved = input.writingInputModeStore.get('mock-writing', 'local-test');
  assert.equal(input.getWritingPresentationInputMode(saved, true), 'turkish-keyboard');
  assert.equal(input.writingInputModeStore.get('mock-writing', 'local-test'), 'long-press');
  assert.equal(input.getWritingPresentationInputMode(null, true), 'turkish-keyboard');
});

test('desktop writing still requires a choice and retains long-press mode', () => {
  assert.equal(input.getWritingPresentationInputMode(null, false), null);
  assert.equal(input.getWritingPresentationInputMode('long-press', false), 'long-press');
});

test('writing preparation can start on phones without a keyboard choice, while desktop still asks', async () => {
  const { default: Ready } = await loadOfflineComponent('src/pages/test/OverallSectionReadyPage.tsx', {
    '@/hooks/use-overall-section-heartbeat': { useOverallSectionHeartbeat() {} },
    '@/services/overallTest.service': {
      overallTestFlowStore: { getPendingNextSection: () => ({ next: { testType: 'WRITING', testId: 'writing-empty-choice', path: '/writing-test/local' }, totalCount: 1, completedCount: 0 }) },
      overallTestTokenStore: { getByTestId: () => 'second-local-test' },
      overallTestService: {},
      getOverallSectionTimerErrorMessage: () => 'Timer error',
    },
    '@/utils/examFullscreen': {
      getExamFullscreenElement: () => null,
      clearExamPresentation: async () => true,
      activateExamPresentation: () => true,
      requestExamFullscreen: async () => true,
    },
  });
  for (const [width, needsChoice] of [[390, false], [1440, true]]) {
    window.matchMedia = () => ({ matches: width <= 767, addEventListener() {}, removeEventListener() {} });
    const view = await mount(Ready);
    try {
      const start = [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Sınava başla');
      assert.ok(start);
      assert.equal(start.disabled, needsChoice);
      assert.equal(Boolean(view.container.querySelector('[aria-label="Klavye kontrolü"]')), needsChoice);
    } finally { await view.unmount(); }
  }
});

test('speaking topic cards keep the original desktop markup at both desktop widths', async () => {
  const { default: Card } = await loadOfflineComponent('src/components/speaking-test/SpeakingMobileDiscussionCard.tsx');
  const original = React.createElement('div', { className: 'original-desktop-card' }, 'Original topic');
  for (const width of [768, 1440]) {
    window.matchMedia = () => ({ matches: width <= 767, addEventListener() {}, removeEventListener() {} });
    assert.equal(renderToStaticMarkup(React.createElement(Card, {
      title: 'Topic', advantages: ['First point'], disadvantages: ['Second point'],
    }, original)), renderToStaticMarkup(original));
  }
});

test('phone speaking topics display each heading and point once, in source order', async () => {
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const { default: Card } = await loadOfflineComponent('src/components/speaking-test/SpeakingMobileDiscussionCard.tsx');
  const html = renderToStaticMarkup(React.createElement(Card, {
    title: 'Topic', advantages: ['First point', 'Next point'], disadvantages: ['Second point'],
  }, React.createElement('div', null, 'Original desktop content')));
  assert.equal((html.match(/>Lehine</g) || []).length, 1);
  assert.equal((html.match(/>Aleyhine</g) || []).length, 1);
  assert.equal((html.match(/>First point</g) || []).length, 1);
  assert.ok(html.indexOf('First point') < html.indexOf('Next point'));
  assert.doesNotMatch(html, /Original desktop content/);
});
