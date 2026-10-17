import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryRouter } from 'react-router';
import { React, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { useResultScreenProtection } = await loadOfflineComponent('src/hooks/use-result-screen-protection.ts');

function ResultReview() {
  useResultScreenProtection();
  return React.createElement('p', null, 'Sonuçlarınızı inceleyin.');
}

test('review screens keep their copy protection without disabling platform translation', async () => {
  const view = await mount(ResultReview);
  try {
    assert.equal(document.documentElement.getAttribute('translate'), null);
    assert.equal(document.body.getAttribute('translate'), null);
    assert.equal(document.documentElement.classList.contains('notranslate'), false);
    assert.equal(document.body.classList.contains('notranslate'), false);
    assert.equal(document.body.style.userSelect, 'none');
    const copy = new Event('copy', { bubbles: true, cancelable: true });
    document.dispatchEvent(copy);
    assert.equal(copy.defaultPrevented, true);
  } finally {
    await view.unmount();
  }
  assert.equal(document.body.style.userSelect, '');
});

// A missing exam guard must fail this contract before implementation exists.
test('translation is blocked before an exam renders and restored on leaving it', async () => {
  const { installExamTranslationProtection } = await loadOfflineComponent('src/utils/examTranslationProtection.ts');
  const router = createMemoryRouter([{ path: '*', element: null }], {
    initialEntries: ['/app/pratik'],
  });
  const dispose = installExamTranslationProtection(router);
  try {
    assert.equal(document.documentElement.getAttribute('translate'), null);
    assert.equal(document.body.getAttribute('translate'), null);
    sessionStorage.setItem('translation-test-draft', 'Korunan cevap');

    for (const path of [
      '/app/reading-test/test-42', '/app/listening-test/test-42/part/2',
      '/app/writing-test/test-42', '/app/speaking-test/test-42',
      '/app/overall-section-ready',
      '/app/pratik/okuma/practice-42', '/app/pratik/dinleme/practice-42',
      '/app/pratik/yazma/practice-42', '/app/pratik/konusma/practice-42',
    ]) {
      await router.navigate(path);
      assert.equal(document.documentElement.getAttribute('translate'), 'no', path);
      assert.equal(document.body.getAttribute('translate'), 'no', path);
      assert.equal(document.body.classList.contains('notranslate'), true, path);
      // Dialogs portalled to body receive the same translation boundary.
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      document.body.append(dialog);
      assert.equal(dialog.closest('[translate="no"]'), document.body);
      dialog.remove();
    }
    for (const path of [
      '/app', '/app/pratik?bolum=listening', '/app/pratik/okuma', '/app/test',
      '/app/profil', '/app/fiyatlar', '/app/dersler', '/login',
      '/app/sonuclar', '/app/overall-results/result-42',
      '/app/reading-test/results/result-42', '/app/listening-test/results/result-42',
      '/app/writing-test/results/result-42', '/app/speaking-test/results/result-42',
      '/app/pratik/okuma/sonuc/attempt-42',
    ]) {
      await router.navigate(path);
      assert.equal(document.documentElement.getAttribute('translate'), null, path);
      assert.equal(document.body.getAttribute('translate'), null, path);
      assert.equal(document.body.classList.contains('notranslate'), false, path);
    }
    assert.equal(sessionStorage.getItem('translation-test-draft'), 'Korunan cevap');
  } finally {
    dispose();
    router.dispose();
    sessionStorage.removeItem('translation-test-draft');
  }
});

test('direct exam entry, legacy paths, and cleanup preserve previous document settings', async () => {
  const { installExamTranslationProtection } = await loadOfflineComponent('src/utils/examTranslationProtection.ts');
  document.documentElement.setAttribute('translate', 'yes');
  document.body.classList.add('fixture-page');
  const router = createMemoryRouter([{ path: '*', element: null }], {
    initialEntries: ['/pratik/konusma/practice-42'],
  });
  const dispose = installExamTranslationProtection(router);
  try {
    assert.equal(document.documentElement.getAttribute('translate'), 'no');
    assert.equal(document.body.getAttribute('translate'), 'no');
    await router.navigate('/app/speaking-test/test-42?attemptId=attempt-42');
    assert.equal(document.documentElement.getAttribute('translate'), 'no');
    dispose();
    assert.equal(document.documentElement.getAttribute('translate'), 'yes');
    assert.equal(document.body.getAttribute('translate'), null);
    assert.equal(document.body.className, 'fixture-page');
    await router.navigate('/app/reading-test/test-42');
    assert.equal(document.documentElement.getAttribute('translate'), 'yes');
  } finally {
    dispose();
    router.dispose();
    document.documentElement.removeAttribute('translate');
    document.body.classList.remove('fixture-page');
  }
});
