import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOfflineComponent } from './helpers/offline-react.mjs';

const { installFocusModality } = await loadOfflineComponent('src/utils/focusModality.ts');

test('pointer-opened menus retain real focus without being treated as keyboard navigation', () => {
  const dispose = installFocusModality();
  const trigger = document.createElement('button');
  const option = document.createElement('div');
  option.tabIndex = -1;
  document.body.append(trigger, option);
  trigger.addEventListener('pointerdown', event => {
    event.stopPropagation();
    option.focus();
  });
  try {
    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    assert.equal(document.documentElement.dataset.focusModality, 'pointer');
    assert.equal(document.activeElement, option, 'focus management must remain intact');
    option.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    assert.equal(document.documentElement.dataset.focusModality, 'keyboard');
  } finally { dispose(); trigger.remove(); option.remove(); }
});

test('Tab and activation keys restore keyboard focus indication after pointer use', () => {
  const dispose = installFocusModality();
  try {
    for (const key of ['Tab', 'ArrowUp', 'Enter', ' ']) {
      document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      document.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
      assert.equal(document.documentElement.dataset.focusModality, 'keyboard', key);
    }
    for (const options of [{ key: 'Shift', shiftKey: true }, { key: 'l', metaKey: true }, { key: 'c', ctrlKey: true }, { key: 'ArrowLeft', altKey: true }]) {
      document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      document.dispatchEvent(new window.KeyboardEvent('keydown', { ...options, bubbles: true }));
      assert.equal(document.documentElement.dataset.focusModality, 'pointer', options.key);
    }
  } finally { dispose(); }
});

test('switching input method never blurs an editable answer or consumes its key events', () => {
  const dispose = installFocusModality();
  const answer = document.createElement('textarea');
  answer.value = 'Yanıtım korunmalı.';
  document.body.append(answer);
  try {
    answer.focus();
    answer.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const key = new window.KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
    answer.dispatchEvent(key);
    assert.equal(key.defaultPrevented, false);
    assert.equal(document.activeElement, answer);
    assert.equal(answer.value, 'Yanıtım korunmalı.');
  } finally { dispose(); answer.remove(); }
});

test('disposing the application listeners restores native focus handling', () => {
  const dispose = installFocusModality();
  document.dispatchEvent(new Event('pointerdown', { bubbles: true }));
  dispose();
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
  assert.equal(document.documentElement.dataset.focusModality, undefined);
});
