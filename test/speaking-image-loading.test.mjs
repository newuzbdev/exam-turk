import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { build } from 'esbuild';
import { Module, createRequire } from 'node:module';
import { resolve } from 'node:path';

const filename = resolve('src/components/speaking/SpeakingDeepReview.tsx');
const built = await build({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',
  packages:'external',jsx:'automatic',tsconfig:'tsconfig.app.json',define:{'import.meta.env':'{}'}});
const compiled = new Module(filename);compiled.require = createRequire(filename);
compiled._compile(built.outputFiles[0].text, filename);
const { default: Review } = compiled.exports;
const visual = 'https://api.example.test/api/file/media/pma.v1.fixture.signature?keep=yes';
test('speaking review requests a small protected image while retaining its token and media protections', () => {
  const html = renderToStaticMarkup(React.createElement(Review, { sections: [{
    key: 'bolum_1_2', title: 'Görsel karşılaştırması', questions: [{
      question: 'Görsellerde neler görüyorsunuz?', transcript: '', visuals: [visual],
    }],
  }] }));
  const img = html.match(/<img\b[^>]*alt="Konuşma sorusu görseli 1"[^>]*>/)?.[0];
  assert.ok(img, 'real speaking review renders its question image');
  const url = new URL(img.match(/src="([^"]+)"/)[1].replaceAll('&amp;','&'));
  assert.equal(url.pathname, '/api/file/media/pma.v1.fixture.signature');
  assert.equal(url.searchParams.get('keep'), 'yes');
  assert.equal(url.searchParams.get('imageWidth'), '480');
  assert.match(img, /loading="lazy"/);
  assert.match(img, /crossOrigin="anonymous"/i);
  assert.match(img, /draggable="false"/);
});
