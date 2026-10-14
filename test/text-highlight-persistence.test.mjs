import assert from 'node:assert/strict';
import test from 'node:test';
import { React, act, loadOfflineComponent, mount, typeAnswer } from './helpers/offline-react.mjs';

const notes = await loadOfflineComponent('src/contexts/ReadingNotesContext.tsx');
const { default: ReadingText } = await loadOfflineComponent('src/pages/reading-test/components/HighlightableText.tsx', { '@/contexts/ReadingNotesContext': notes });
const { default: ListeningText } = await loadOfflineComponent('src/components/listening-test/HighlightableTextSimple.tsx', { '@/contexts/ReadingNotesContext': notes });
const rect = { x: 10, y: 10, left: 10, right: 200, top: 10, bottom: 30, width: 190, height: 20, toJSON() {} };
window.Range.prototype.getBoundingClientRect = () => rect;
window.Range.prototype.getClientRects = () => [rect];
window.HTMLElement.prototype.scrollTo = function () {};

async function highlight(container, text, label = 'Vurgula') {
  const walk = document.createTreeWalker(container, window.NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walk.nextNode())) if (node.textContent.includes(text)) break;
  assert.ok(node, `text ${text} exists`);
  const start = node.textContent.indexOf(text);
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, start + text.length);
  await act(async () => {
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    node.parentElement.dispatchEvent(new Event('touchend', { bubbles: true }));
  });
  const action = [...document.querySelectorAll('[role="toolbar"] button')].find(button => button.textContent.trim() === label);
  assert.ok(action, `${label} is offered for the real selection`);
  await act(async () => action.click());
}

function Sections({ Text, scopeKey = 'highlight-test' }) {
  const [part, setPart] = React.useState(1);
  return React.createElement(notes.ReadingNotesProvider, { scopeKey },
    React.createElement('button', { onClick: () => setPart(1) }, 'Birinci bölüm'),
    React.createElement('button', { onClick: () => setPart(2) }, 'İkinci bölüm'),
    React.createElement('section', { 'data-current-section': true },
      React.createElement(Text, { key: part, text: part === 1 ? 'Okul bugün çok güzel.' : 'Bugün hava çok güzel.', partNumber: part, annotationId: `question-${part}` })),
  );
}

for (const [kind, Text] of [['reading mock', ReadingText], ['listening practice and mock', ListeningText]]) {
  test(`${kind} keeps the selected highlight after visiting another section and returning`, async () => {
    const view = await mount(Sections, { props: { Text, scopeKey: kind } });
    try {
      await highlight(view.container.querySelector('section'), 'Okul');
      assert.equal(view.container.querySelector('mark')?.textContent, 'Okul');
      await act(async () => [...view.container.querySelectorAll('button')].find(button => button.textContent === 'İkinci bölüm').click());
      assert.equal(view.container.querySelectorAll('mark').length, 0);
      await act(async () => [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Birinci bölüm').click());
      assert.equal(view.container.querySelector('mark')?.textContent, 'Okul', 'returning to a remounted text must restore the mark');
    } finally { await view.unmount(); }
  });
}

test('the same attempt restores highlights after leaving the test screen', async () => {
  const first = await mount(Sections, { props: { Text: ReadingText, scopeKey: 'return-to-same-attempt' } });
  await highlight(first.container.querySelector('section'), 'Okul');
  await first.unmount();
  const returned = await mount(Sections, { props: { Text: ReadingText, scopeKey: 'return-to-same-attempt' } });
  try { assert.equal(returned.container.querySelector('mark')?.textContent, 'Okul'); }
  finally { await returned.unmount(); }
});

for (const [kind, Text] of [['reading', ReadingText], ['listening', ListeningText]]) {
  test(`${kind} clears marks permanently when the user erases them`, async () => {
    const view = await mount(Sections, { props: { Text, scopeKey: `clear-${kind}` } });
    try {
      await highlight(view.container.querySelector('section'), 'Okul');
      await highlight(view.container.querySelector('section'), 'Okul', 'Temizle');
      assert.equal(view.container.querySelectorAll('mark').length, 0);
      await act(async () => [...view.container.querySelectorAll('button')].find(button => button.textContent === 'İkinci bölüm').click());
      await act(async () => [...view.container.querySelectorAll('button')].find(button => button.textContent === 'Birinci bölüm').click());
      assert.equal(view.container.querySelectorAll('mark').length, 0);
    } finally { await view.unmount(); }
  });

  test(`${kind} never copies a mark to an identical sentence in another question`, async () => {
    function TwoQuestions() {
      return React.createElement(notes.ReadingNotesProvider, { scopeKey: `separate-${kind}` },
        React.createElement('section', { 'data-question': 'one' }, React.createElement(Text, { text: 'Okul bugün çok güzel.', partNumber: 1, annotationId: 'question-one' })),
        React.createElement('section', { 'data-question': 'two' }, React.createElement(Text, { text: 'Okul bugün çok güzel.', partNumber: 1, annotationId: 'question-two' })),
      );
    }
    const view = await mount(TwoQuestions);
    try {
      await highlight(view.container.querySelector('[data-question="one"]'), 'Okul');
      assert.equal(view.container.querySelector('[data-question="one"] mark')?.textContent, 'Okul');
      assert.equal(view.container.querySelectorAll('[data-question="two"] mark').length, 0);
    } finally { await view.unmount(); }
  });
}

test('a new attempt or another account starts with independent annotations', async () => {
  for (const scopeKey of ['owner-a/attempt-one', 'owner-a/attempt-two', 'owner-b/attempt-one']) {
    const view = await mount(Sections, { props: { Text: ReadingText, scopeKey } });
    try {
      assert.equal(view.container.querySelectorAll('mark').length, 0);
      if (scopeKey === 'owner-a/attempt-one') await highlight(view.container.querySelector('section'), 'Okul');
    } finally { await view.unmount(); }
  }
  const original = await mount(Sections, { props: { Text: ReadingText, scopeKey: 'owner-a/attempt-one' } });
  try { assert.equal(original.container.querySelector('mark')?.textContent, 'Okul'); }
  finally { await original.unmount(); }
});

test('a damaged saved annotation record does not prevent normal highlighting', async () => {
  sessionStorage.setItem('tm_text_annotations_v1:broken-record', '{bad-json');
  const view = await mount(Sections, { props: { Text: ListeningText, scopeKey: 'broken-record' } });
  try { await highlight(view.container.querySelector('section'), 'Okul'); assert.equal(view.container.querySelector('mark')?.textContent, 'Okul'); }
  finally { await view.unmount(); }
});

test('reading practice restores the actual paragraph highlight on the same attempt without answering a question', async () => {
  sessionStorage.setItem('userId', 'practice-annotation-owner');
  const { default: Practice } = await loadOfflineComponent('src/pages/reading-practice/ReadingPracticeTest.tsx', {
    '@/services/readingPractice.service': { readingPracticeService: { getSolveDetail: async () => ({
      id: 'paragraph-practice', title: 'Yerel örnek', estimatedMinutes: 20, practiceType: 'SECTION', sectionNumber: 4, isPublished: true,
      paragraphs: [{ label: 'Metin', text: 'Okul bugün çok güzel.' }], glossaryEntries: [],
      questionGroups: [{ id: 'group-1', order: 1, title: 'Bölüm 4', type: 'MULTIPLE_CHOICE', questions: [{ id: 'practice-question', order: 1, prompt: 'Neresi güzel?', options: [{ value: 'A', text: 'Okul' }, { value: 'B', text: 'Ev' }] }] }],
    }) } },
  });
  const route = '/app/pratik/okuma/paragraph-practice?mod=calisma&sayac=0&attemptId=practice-annotation-attempt';
  const first = await mount(Practice, { route, routePattern: '/app/pratik/okuma/:id' });
  try {
    const paragraph = first.container.querySelector('[data-paragraph-label="Metin"]');
    assert.ok(paragraph);
    const node = [...paragraph.querySelectorAll('*')].flatMap(element => [...element.childNodes]).find(node => node.nodeType === 3 && node.textContent.includes('Okul bugün'));
    const range = document.createRange(); range.setStart(node, 0); range.setEnd(node, 4);
    await act(async () => { window.getSelection().removeAllRanges(); window.getSelection().addRange(range); node.parentElement.dispatchEvent(new Event('mouseup', { bubbles: true })); });
    const mark = [...first.container.querySelectorAll('[role="toolbar"] button')].find(button => button.textContent.trim() === 'Vurgula');
    assert.ok(mark);
    await act(async () => mark.click());
    assert.equal(first.container.querySelector('mark')?.textContent, 'Okul');
    assert.equal(first.container.querySelectorAll('[role="radio"][aria-checked="true"]').length, 0);
  } finally { await first.unmount(); }
  const returned = await mount(Practice, { route, routePattern: '/app/pratik/okuma/:id' });
  try { assert.equal(returned.container.querySelector('[data-paragraph-label="Metin"] mark')?.textContent, 'Okul'); }
  finally { await returned.unmount(); sessionStorage.removeItem('userId'); }
});

const timerMath = await loadOfflineComponent('src/services/overallTest.service.ts');
for (const practiceMode of [true, false]) {
  test(`the real listening ${practiceMode ? 'practice' : 'mock'} screen restores highlights without changing answers`, async () => {
    sessionStorage.setItem('userId', 'listening-annotation-owner');
    const content = { id: 'listening-annotations', title: 'Yerel dinleme', audioUrl: null, parts: [1, 2].map(number => ({ id: `part-${number}`, number, sections: [{ id: `section-${number}`, questions: [{ id: `question-${number}`, number, text: `Bölüm ${number} sorusu`, type: 'MULTIPLE_CHOICE', answers: [{ id: `answer-${number}`, variantText: 'A', answer: 'Vurgulanacak söz.' }] }] }] })) };
    const { default: Listening } = await loadOfflineComponent('src/components/listening-test/ListeningTestDemo.tsx', {
      '@/hooks/use-overall-section-heartbeat': { useOverallSectionHeartbeat() {} },
      '@/services/listeningPractice.service': { default: { solve: async () => ({ sectionCode: 'PART_1', content }) } },
      '@/services/listeningTest.service': { listeningTestService: { getTestWithFullData: async () => content }, listeningSubmissionService: { getSessionResult: async () => null, getDraft: async () => ({ answers: {} }) } },
      '@/services/overallTest.service': {
        createBackendSyncedTimerState: timerMath.createBackendSyncedTimerState,
        getBackendSyncedRemainingSeconds: timerMath.getBackendSyncedRemainingSeconds,
        getOverallSectionTimerErrorCode: () => null, getOverallSectionTimerErrorMessage: error => error.message,
        overallTestTokenStore: { getByTestId: () => practiceMode ? null : 'listening-annotation-session' },
        overallTestFlowStore: { getOverallId: () => practiceMode ? null : 'mock-annotation-attempt', hasActive: () => true },
        overallTestService: { prepareSectionForTest: async () => ({ requiresStart: false, phase: 'REVIEW', serverNow: new Date().toISOString(), remainingReviewSeconds: 600, remainingSeconds: 600 }) },
      },
    });
    const props = { testId: 'listening-annotations', practiceMode };
    const first = await mount(Listening, { props });
    try {
      await highlight(first.container.querySelector('[role="radiogroup"]'), 'Vurgulanacak');
      assert.equal(first.container.querySelector('mark')?.textContent, 'Vurgulanacak');
      assert.equal(first.container.querySelectorAll('[role="radio"][aria-checked="true"]').length, 0);
      if (!practiceMode) {
        const choosePart = label => [...first.container.querySelectorAll('button')].find(button => button.textContent === label);
        await act(async () => choosePart('Bölüm 2').click());
        assert.equal(first.container.querySelectorAll('mark').length, 0);
        await act(async () => choosePart('Bölüm 1').click());
        assert.equal(first.container.querySelector('mark')?.textContent, 'Vurgulanacak');
      }
    } finally { await first.unmount(); }
    const returned = await mount(Listening, { props });
    try { assert.equal(returned.container.querySelector('mark')?.textContent, 'Vurgulanacak'); }
    finally { await returned.unmount(); sessionStorage.removeItem('userId'); }
  });
}

test('a saved note and its highlight return together and never attach to identical text in another field', async () => {
  function WithNotes() {
    const { notes: saved } = notes.useReadingNotes();
    return React.createElement(React.Fragment, null,
      React.createElement('output', null, saved.map(note => note.text).join(',')),
      React.createElement('section', { 'data-note-field': 'one' }, React.createElement(ReadingText, { text: 'Okul bugün çok güzel.', partNumber: 1, annotationId: 'note-question-one' })),
      React.createElement('section', { 'data-note-field': 'two' }, React.createElement(ReadingText, { text: 'Okul bugün çok güzel.', partNumber: 1, annotationId: 'note-question-two' })),
    );
  }
  function Attempt() { return React.createElement(notes.ReadingNotesProvider, { scopeKey: 'note-and-mark-attempt' }, React.createElement(WithNotes)); }
  const first = await mount(Attempt);
  try {
    await highlight(first.container.querySelector('[data-note-field="one"]'), 'Okul', 'Not al');
    await typeAnswer(document.querySelector('#highlight-note-textarea'), 'Kendi notum');
    const save = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Ekle');
    assert.ok(save && !save.disabled);
    await act(async () => save.click());
    assert.equal(first.container.querySelector('[data-note-field="one"] mark')?.textContent, 'Okul');
    assert.equal(first.container.querySelectorAll('[data-note-field="two"] mark').length, 0);
    assert.equal(first.container.querySelector('output').textContent, 'Kendi notum');
  } finally { await first.unmount(); }
  const returned = await mount(Attempt);
  try {
    assert.equal(returned.container.querySelector('[data-note-field="one"] mark')?.textContent, 'Okul');
    assert.equal(returned.container.querySelectorAll('[data-note-field="two"] mark').length, 0);
    assert.equal(returned.container.querySelector('output').textContent, 'Kendi notum');
  } finally { await returned.unmount(); }
});
