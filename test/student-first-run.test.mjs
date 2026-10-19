import assert from 'node:assert/strict';
import test from 'node:test';
import { act, deferred, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const model = await loadOfflineComponent('src/components/first-run/first-run-model.ts');
const { FirstRunSetup } = await loadOfflineComponent('src/components/first-run/first-run-setup.tsx');
const session = { id: 'cefr-2026-nov', examStart: '2026-11-21', examEnd: '2026-11-22', registrationStart: '2026-10-01', registrationEnd: '2026-11-01', paymentEnd: '2026-11-02', sourceUrl: 'https://example.test/calendar', published: true, version: 1 };
const profile = { id:'p1', userId:'student-a', goal:'GENERAL_TURKISH', currentLevel:'A2', supportLanguage:'UZBEK', examTarget:'UNDECIDED', dailyStudyMinutes:30, examDate:null, targetLevel:null, targetExamYear:null, examSessionId:null, onboardingCompleted:false, createdAt:'2026-10-19', updatedAt:'2026-10-19' };
const practice = { id:'free-map', title:'Harita', level:'B1', sectionCode:'PART_4', estimatedMinutes:5, isFreeAccess:true, createdAt:'2026-10-01' };

test('onboarding never intercepts active work, payment returns, or access deep links', () => {
  for (const [pathname, search, expected] of [
    ['/app','',true], ['/app/test','',true], ['/app/pratik','?bolum=listening',true],
    ['/app/pratik/dinleme/abc','',false], ['/app/listening-test/abc','',false],
    ['/app/overall-results/abc','',false], ['/app/fiyatlar','',false],
    ['/app/test','?accessToken=private',false], ['/app/pratik','?bolum=listening&start=abc',false],
  ]) assert.equal(model.isFirstRunEntry(pathname, search), expected, pathname + search);
  assert.equal(model.needsFirstRun(null), true);
  assert.equal(model.needsFirstRun(profile), true);
  assert.equal(model.needsFirstRun({...profile, onboardingCompleted:true}), false);
});

test('calendar uses only published upcoming official periods and saves canonical date, preserving other profile settings', () => {
  const periods = model.upcomingPeriods([session, {...session,id:'hidden',published:false}, {...session,id:'past',examEnd:'2026-10-18'}], '2026-10-19');
  assert.deepEqual(periods.map(p => p.id), ['cefr-2026-nov']);
  assert.deepEqual(model.firstRunInput(profile, 'A1', 'B2', session), {
    goal:'EXAM_PREPARATION', currentLevel:'A1', targetLevel:'B2', supportLanguage:'UZBEK', dailyStudyMinutes:30,
    examTarget:'CEFR', targetExamYear:2026, examSessionId:'cefr-2026-nov', examDate:'2026-11-21',
  });
  const undecided = model.firstRunInput(null, 'UNSURE', 'B1', undefined);
  assert.equal(undecided.examSessionId, null);
  assert.equal(undecided.examDate, null);
  assert.equal(undecided.targetExamYear, null);
  assert.equal(undecided.examTarget, 'CEFR');
});

test('starter never selects a paid practice or trusts legacy free status over a current access decision', () => {
  assert.equal(model.firstFreeMap([{...practice,id:'paid',isFreeAccess:false}, {...practice,id:'revoked',isPublicFree:false}, {...practice,id:'other-section',sectionCode:'PART_1'}]), undefined);
  assert.equal(model.firstFreeMap([{...practice,id:'later',createdAt:'2026-10-02'},practice])?.id, 'free-map');
  assert.equal(model.firstPracticePath('id &/1'), '/app/pratik?bolum=listening&start=id+%26%2F1');
});

async function click(view, text) {
  const button = [...view.container.querySelectorAll('button')].find(b => b.textContent.trim() === text);
  assert.ok(button, `Missing button ${text}`);
  await act(async () => button.click());
}
async function radio(view, name, value) {
  const input = view.container.querySelector(`input[name="${name}"][value="${value}"]`);
  assert.ok(input, `Missing ${name}:${value}`);
  await act(async () => input.click());
}
test('three explicit choices save once, support unknown level/date, and keep the draft after a failed save', async () => {
  const inputs=[];
  const pending=deferred();
  const view=await mount(FirstRunSetup,{props:{profile:null,sessions:[session],today:'2026-10-19',onSkip(){},onSave:input=>{inputs.push(input);return pending.promise;}}});
  try {
    assert.equal([...view.container.querySelectorAll('button')].find(b=>b.textContent==='Devam').disabled,true);
    await radio(view,'current-level','UNSURE'); await click(view,'Devam');
    await radio(view,'target-level','B2'); await click(view,'Devam');
    assert.equal(view.container.textContent.includes('TYS'),false);
    await radio(view,'exam-period','undecided');
    await click(view,'Kaydet ve devam et'); await click(view,'Kaydediliyor…');
    assert.equal(inputs.length,1);
    assert.equal(inputs[0].currentLevel,'UNSURE'); assert.equal(inputs[0].targetLevel,'B2');
    assert.equal(inputs[0].examDate,null);
    await act(async()=>pending.reject(new Error('offline')));
    assert.ok(view.container.querySelector('[role="alert"]'));
    await click(view,'Geri');
    assert.equal(view.container.querySelector('input[value="B2"]').checked,true);
  } finally {await view.unmount();}
});

test('published periods are selectable directly, without choosing a year, and their identity/date are saved', async () => {
  const inputs=[];
  const view=await mount(FirstRunSetup,{props:{profile,sessions:[session,{...session,id:'hidden',published:false}],today:'2026-10-19',onSkip(){},onSave:async input=>{inputs.push(input);}}});
  try {
    await click(view,'Devam'); await radio(view,'target-level','B1'); await click(view,'Devam');
    assert.equal(Boolean(view.container.querySelector('select')),false);
    assert.equal(Boolean(view.container.querySelector('input[value="hidden"]')),false);
    assert.equal([...view.container.querySelectorAll('button')].find(b=>b.textContent==='Kaydet ve devam et').disabled,true);
    await radio(view,'exam-period','cefr-2026-nov');
    await click(view,'Kaydet ve devam et'); assert.equal(inputs.length,1);
    assert.equal(inputs[0].examSessionId,'cefr-2026-nov');
    assert.equal(inputs[0].targetExamYear,2026);
    assert.equal(inputs[0].examDate,'2026-11-21');
  } finally {await view.unmount();}
});

test('the single undecided option clears any previous period and preserves CEFR preparation intent', async () => {
  const inputs=[];
  const previous={...profile,goal:'EXAM_PREPARATION',examTarget:'CEFR',examSessionId:session.id,examDate:session.examStart,targetExamYear:2026};
  const view=await mount(FirstRunSetup,{props:{profile:previous,sessions:[session],today:'2026-10-19',onSkip(){},onSave:async input=>{inputs.push(input);}}});
  try {
    await click(view,'Devam'); await radio(view,'target-level','B1'); await click(view,'Devam');
    assert.equal(Boolean(view.container.querySelector('input[value="not-planning"]')),false);
    await radio(view,'exam-period','undecided'); await click(view,'Kaydet ve devam et');
    assert.equal(inputs[0].goal,'EXAM_PREPARATION');
    assert.equal(inputs[0].examTarget,'CEFR');
    assert.equal(inputs[0].examSessionId,null);
    assert.equal(inputs[0].examDate,null);
    assert.equal(inputs[0].targetExamYear,null);
  } finally {await view.unmount();}
});

test('beginner level stays an honest self-assessment while the available target/content starts at B1', async () => {
  const view=await mount(FirstRunSetup,{props:{profile:null,sessions:[session],today:'2026-10-19',onSkip(){},onSave:async()=>{}}});
  try {
    await radio(view,'current-level','A2');
    assert.match(view.container.querySelector('[data-level-scope]')?.textContent ?? '',/B1.*başl/);
    await click(view,'Devam');
    assert.deepEqual([...view.container.querySelectorAll('input[name="target-level"]')].map(input=>input.value),['B1','B2','C1']);
  } finally {await view.unmount();}
});
