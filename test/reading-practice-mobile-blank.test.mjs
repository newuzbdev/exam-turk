import assert from 'node:assert/strict';
import test from 'node:test';
import { Module, createRequire } from 'node:module';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const filename = resolve('src/pages/reading-practice/ReadingPracticeBlankSelect.tsx');
const bundled = await build({ entryPoints: [filename], bundle: true, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', write: false, alias: { '@': resolve('src') } });
const compiled = new Module(filename);
compiled.require = createRequire(filename);
compiled._compile(bundled.outputFiles[0].text, filename);
const Blank = compiled.exports.default;
const legacy = React.createElement('span', { role: 'button', 'aria-label': '1. boşluk' }, '1');

function render(width, props = {}) {
  const previous = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: width <= 767 }) };
  try {
    return renderToStaticMarkup(React.createElement(Blank, { number: 1, value: '', choices: [{ value: 'örnek' }], onSelect() {}, ...props }, legacy));
  } finally { globalThis.window = previous; }
}

test('a phone blank opens a word selector at the blank instead of requiring the word bank', () => {
  assert.match(render(390), /role="combobox"/);
  assert.match(render(390), /1\. boşluk için kelime seç/);
});
test('the mobile selector displays an existing answer so it can be changed', () => {
  assert.match(render(390, { value: 'örnek' }), /role="combobox"/);
  assert.match(render(390, { value: 'örnek' }), /örnek/);
});
test('the last phone width uses the selector', () => {
  assert.match(render(767), /role="combobox"/);
});
test('desktop and the desktop breakpoint retain exactly the existing blank', () => {
  for (const width of [768, 1440]) assert.equal(render(width), renderToStaticMarkup(legacy));
});
test('locked answers, result review and dictionary word lookup retain their existing interaction', () => {
  assert.equal(render(390, { keepLegacyInteraction: true }), renderToStaticMarkup(legacy));
});
