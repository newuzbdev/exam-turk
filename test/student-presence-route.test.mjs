import assert from 'node:assert/strict';
import test from 'node:test';
import { loadOfflineComponent } from './helpers/offline-react.mjs';

const { classifyStudentPage } = await loadOfflineComponent('src/utils/student-presence-route.ts');
const id = '11111111-1111-4111-8111-111111111111';
const attempt = '22222222-2222-4222-8222-222222222222';

test('actual authenticated routes classify catalogs, prep, exams, practice and results', () => {
  for (const [path, page] of [
    ['/app', 'DASHBOARD'], ['/app/test', 'MOCK_CATALOG'], ['/app/pratik', 'PRACTICE_CATALOG'],
    ['/app/pratik/okuma', 'PRACTICE_CATALOG'], ['/app/overall-section-ready', 'PREPARATION'],
    ...['reading', 'listening', 'writing', 'speaking'].map(skill => [`/app/${skill}-test/${id}`, 'MOCK_TEST']),
    [`/app/listening-test/${id}/part/2`, 'MOCK_TEST'],
    ...['okuma', 'dinleme', 'yazma', 'konusma'].map(skill => [`/app/pratik/${skill}/${id}`, 'PRACTICE_TEST']),
    ...['reading', 'listening', 'writing', 'speaking'].map(skill => [`/app/${skill}-test/results/${id}`, 'RESULT']),
    [`/app/overall-results/${id}`, 'RESULT'], [`/app/unified-results/${id}`, 'RESULT'],
    [`/app/pratik/okuma/sonuc/${attempt}`, 'RESULT'], ['/app/sonuclar', 'RESULT'],
    ['/app/profil', 'PROFILE'], ['/app/fiyatlar', 'SUBSCRIPTION'], ['/app/odeme-sonucu', 'SUBSCRIPTION'],
    ['/app/dersler', 'OTHER'], ['/app/unknown', 'OTHER'], ['/admin/students', 'OTHER'],
  ]) assert.equal(classifyStudentPage(path).page, page, path);
});

test('only route-matching owned UUID hints survive; query, token, free content and URL never enter DTO', () => {
  const state = { ownerId: id, userId: id, overallTestId: attempt, mockTestId: id, token: 'secret', answers: 'answer', url: 'private', practiceId: id, evaluationRunId: attempt };
  assert.deepEqual(classifyStudentPage(`/app/reading-test/${id}?token=secret#answer`, state), { page: 'MOCK_TEST', overallTestId: attempt });
  assert.deepEqual(classifyStudentPage(`/app/reading-test/${id}`, { ...state, ownerId: 'other' }), { page: 'MOCK_TEST' });
  assert.deepEqual(classifyStudentPage(`/app/reading-test/${attempt}`, state), { page: 'MOCK_TEST' });
  assert.deepEqual(classifyStudentPage(`/app/pratik/yazma/${id}`, state), { page: 'PRACTICE_TEST', practiceDomain: 'WRITING', practiceId: id, evaluationRunId: attempt });
  assert.deepEqual(classifyStudentPage(`/app/pratik/okuma/${id}`, { ...state, readingPracticeAttemptId: attempt }), { page: 'PRACTICE_TEST', practiceDomain: 'READING', practiceId: id, readingPracticeAttemptId: attempt });
  assert.deepEqual(classifyStudentPage(`/app/pratik/yazma/${id}`, { ...state, evaluationRunId: 'token' }), { page: 'PRACTICE_TEST', practiceDomain: 'WRITING', practiceId: id });
  assert.deepEqual(classifyStudentPage('/app/other?token=secret', state), { page: 'OTHER' });
  assert.deepEqual(classifyStudentPage(`/app/pratik/okuma/sonuc/${attempt}?token=secret`, { ...state, readingPracticeAttemptId: attempt }), { page: 'RESULT', practiceDomain: 'READING', practiceId: id, readingPracticeAttemptId: attempt });
});
