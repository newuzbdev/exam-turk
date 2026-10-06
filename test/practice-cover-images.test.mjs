import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Module, createRequire } from 'node:module';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const filename = resolve('src/components/practice/PracticeCoverImage.tsx');
const bundled = await build({ entryPoints: [filename], bundle: true, platform: 'node',
  format: 'cjs', packages: 'external', jsx: 'automatic', write: false });
const compiled = new Module(filename);
compiled.require = createRequire(filename);
compiled._compile(bundled.outputFiles[0].text, filename);
const { default: Cover, practiceCoverSources } = compiled.exports;
const registry = JSON.parse(await readFile('src/data/practice-cover-variants.json', 'utf8'));
const publicCard = Object.entries(registry).find(([, entry]) => entry.identities.some(key => key.startsWith('/generated/')));
const protectedCard = Object.entries(registry).find(([, entry]) => entry.scope === 'AUTHENTICATED');
const reference = (key, scope) => `pmr.v1.${Buffer.from(JSON.stringify({ key, scope })).toString('base64url')}.fixture`;
const accessUrl = (key, scope) => `https://api.example.test/api/file/media/pma.v1.${Buffer.from(JSON.stringify({ reference: reference(key, scope) })).toString('base64url')}.fixture`;

test('public card selects lossless responsive copies and retains the full original', () => {
  const [id, entry] = publicCard;
  const original = entry.identities.find(key => key.startsWith('/generated/'));
  const sources = practiceCoverSources(id, original);
  assert.match(sources.src, /practice-covers-v1\/.+-960\.webp$/);
  assert.match(sources.srcSet, /480w/);
  assert.ok(sources.srcSet.includes(`${original} ${entry.originalWidth}w`));
  const html = renderToStaticMarkup(React.createElement(Cover, { practiceId: id, src: original, alt: 'Kapak' }));
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /sizes="auto,/);
});

test('private cover variants retain the original protected URL and never use public files', () => {
  const [id, entry] = protectedCard;
  const url = accessUrl(entry.identities[0], entry.scope);
  const sources = practiceCoverSources(id, url);
  assert.equal(new URL(sources.src).pathname, new URL(url).pathname);
  assert.equal(new URL(sources.src).searchParams.get('cardWidth'), '960');
  assert.doesNotMatch(sources.srcSet, /generated/);
  assert.ok(sources.srcSet.includes(`${url} ${entry.originalWidth}w`));
  assert.equal(practiceCoverSources(id, accessUrl(entry.identities[0], 'OWNER')), null);
});

test('changed, unknown and malformed covers fall back to their current original', () => {
  const [id] = publicCard;
  for (const src of ['/generated/replacement.png', 'not-a-media-reference', 'pmr.v1.bad.signature']) {
    assert.equal(practiceCoverSources(id, src), null);
    const html = renderToStaticMarkup(React.createElement(Cover, { practiceId: id, src, alt: '' }));
    assert.ok(html.includes(`src="${src}"`));
    assert.doesNotMatch(html, /srcSet/);
  }
  assert.equal(practiceCoverSources('a-new-admin-card', '/generated/new.png'), null);
});
