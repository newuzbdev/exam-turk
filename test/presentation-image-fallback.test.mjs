import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { React, act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';
const { default: Image } = await loadOfflineComponent('src/components/practice/PresentationImage.tsx');
const registry = JSON.parse(await readFile('src/data/practice-task-image-variants.json', 'utf8'));

test('failed static WebP recovers the current original image without a retry loop', async () => {
  const source = Object.keys(registry)[0];
  const view = await mount(Image, { props: { src: source, alt: 'Okuma' } });
  try {
    const image = view.container.querySelector('img');
    assert.match(image.getAttribute('src'), /practice-task-images-v1\/.+\.webp$/);
    await act(async () => image.dispatchEvent(new Event('error')));
    assert.equal(image.getAttribute('src'), source);
    await act(async () => image.dispatchEvent(new Event('error')));
    assert.equal(image.getAttribute('src'), source);
  } finally { await view.unmount(); }
});

test('failed protected thumbnail keeps the same original token and query parameters', async () => {
  const source = 'https://api.example.test/api/file/media/pma.v1.fixture.signature?keep=yes';
  const view = await mount(Image, { props: { src: source, thumbnail: true, alt: 'Soru' } });
  try {
    const image = view.container.querySelector('img');
    assert.equal(new URL(image.getAttribute('src')).searchParams.get('imageWidth'), '480');
    await act(async () => image.dispatchEvent(new Event('error')));
    assert.equal(image.getAttribute('src'), source);
  } finally { await view.unmount(); }
});
