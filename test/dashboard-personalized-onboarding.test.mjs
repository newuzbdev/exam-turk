import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { React, act, deferred, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

const { dashboardDeclaredLevel } = await loadOfflineComponent('src/pages/dashboard/dashboard-level-data.ts');
const { DashboardLevelSummary } = await loadOfflineComponent('src/pages/dashboard/dashboard-level-summary.tsx');
const { DashboardExamCard } = await loadOfflineComponent('src/pages/dashboard/dashboard-exam-card.tsx');
const emptySkills = ['listening','reading','writing','speaking'].map((key,index)=>({key,label:['Dinleme','Okuma','Yazma','Konuşma'][index],average:null,previousAverage:null,level:null,points:[],sampleCount:0,sample:[],isStale:false,lastTestAt:null}));
const session = { id:'cefr-nov',examStart:'2026-11-08',examEnd:'2026-11-10',registrationStart:'2026-10-01',registrationEnd:'2026-10-25',paymentEnd:'2026-10-26',published:true,version:1,sourceUrl:'https://example.test/calendar' };
const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
const calendar = await loadOfflineComponent('src/data/exam-calendar.ts');
let savedProfile=null;
let readResults=async()=>[];
const reads=[];
const api={
  async get(url) {
    reads.push(url);
    if(url==='/api/me/onboarding')return {data:{success:true,data:savedProfile}};
    if(url==='/api/me/official-exams')return {data:{success:true,data:{sessions:[session],selectedSession:savedProfile?.examSessionId===session.id?session:null}}};
    if(url==='/api/listening-practice')return {data:[{id:'existing-free-map',title:'Mevcut ücretsiz harita pratiği',sectionCode:'PART_4',isPublicFree:true,createdAt:'2026-10-01'}]};
    if(url.startsWith('/api/overal-test-result/get-users?')) {const data=await readResults();return {data:{data,total:data.length,page:1,limit:50}};}
    throw Error(`Unexpected request: ${url}`);
  },
  async post(url,input) {assert.equal(url,'/api/me/onboarding');savedProfile={...input,id:'example-profile',userId:'example-student',onboardingCompleted:true,updatedAt:'2026-10-20T09:00:00Z'};return {data:{success:true,data:savedProfile}};},
};
const boundaries={
  '@/contexts/AuthContext':{useAuth:()=>({isAuthenticated:true,user:{id:'example-student',role:'USER'}})},
  '@/config/api':{default:api},
  '@/data/exam-calendar':{...calendar,uzbekistanToday:()=> '2026-10-20'},
};
const {default:Dashboard}=await loadOfflineComponent('src/pages/dashboard/student-dashboard.tsx',boundaries);
const {default:FirstRun}=await loadOfflineComponent('src/components/first-run/student-first-run.tsx',boundaries);

test('questionnaire levels map to display bands without generating test scores',()=>{
  for(const level of ['NONE','A1','A2']) assert.equal(dashboardDeclaredLevel(level),'B1 altı');
  for(const level of ['B1','B2','C1']) assert.equal(dashboardDeclaredLevel(level),level);
  for(const level of ['UNSURE',null,undefined]) assert.equal(dashboardDeclaredLevel(level),null);
});

test('a new student sees the declared level and target before having any results',async()=>{
  const view=await mount(DashboardLevelSummary,{props:{average:null,level:null,skills:emptySkills,target:'B2',currentLevel:'A2',missingLabel:'4 bölüm daha',lowEvidence:true}});
  try {
    assert.equal(view.container.querySelector('.dashboard-level__value').textContent,'B1 altı');
    assert.match(view.container.textContent,/Hedefiniz.*B2/);
    assert.match(view.container.textContent,/seçiminiz/i);
    assert.ok(view.container.querySelector('[aria-label="Seçtiğiniz seviye: B1 altı"]'));
    assert.equal(Boolean(view.container.querySelector('[aria-label^="Genel ortalama:"]')),false);
    assert.equal(Boolean(view.container.querySelector('[aria-label^="Ortalama puan:"]')),false);
  } finally {await view.unmount();}
});

test('actual result averages retain precedence and are never replaced by self assessment',async()=>{
  const skills=emptySkills.map(skill=>({...skill,average:65,level:'C1',sampleCount:1,sample:[{timestamp:Date.parse('2026-10-19'),score:65,id:'example'}]}));
  const view=await mount(DashboardLevelSummary,{props:{average:65,level:'C1',skills,target:'C1',currentLevel:'A1',missingLabel:'',lowEvidence:true}});
  try {
    assert.equal(view.container.querySelector('.dashboard-level__value').textContent,'C1');
    assert.ok(view.container.querySelector('[aria-label="Ortalama puan: 65 / 75"]'));
    assert.equal(Boolean(view.container.querySelector('[aria-label^="Seçtiğiniz seviye:"]')),false);
  } finally {await view.unmount();}
});

test('an undecided self assessment never becomes B1 or a zero score',async()=>{
  const view=await mount(DashboardLevelSummary,{props:{average:null,level:null,skills:emptySkills,target:'B1',currentLevel:'UNSURE',missingLabel:'4 bölüm daha',lowEvidence:true}});
  try {
    assert.equal(view.container.querySelector('.dashboard-level__value').textContent,'Henüz belirlenmedi');
    assert.equal(Boolean(view.container.querySelector('[aria-label^="Seçtiğiniz seviye:"]')),false);
    assert.match(view.container.textContent,/Hedefiniz.*B1/);
  } finally {await view.unmount();}
});

test('the selected official period opens its month in an aligned seven day calendar',async()=>{
  const profile={examTarget:'CEFR',examSessionId:session.id,examDate:session.examStart,targetExamYear:2026};
  const view=await mount(DashboardExamCard,{props:{profile,sessions:[session],today:'2026-10-20',onChoose(){}}});
  try {
    assert.match(view.container.querySelector('.student-home__month').textContent,/Kasım 2026/i);
    const grid=view.container.querySelector('.student-home__calendar');
    assert.equal(grid.querySelectorAll('.student-home__weekday').length,7);
    assert.equal(grid.querySelectorAll('[data-calendar-empty]').length,12);
    assert.equal(grid.querySelectorAll('[aria-pressed="true"]').length,3);
    const previous=view.container.querySelector('[aria-label="Önceki ay"]');
    await act(async()=>previous.click());
    assert.match(view.container.querySelector('.student-home__month').textContent,/Ekim 2026/i);
  } finally {await view.unmount();}
});

test('questionnaire save opens the actual dashboard directly, without requesting study rhythm or a practice catalogue',async()=>{
  savedProfile=null;reads.length=0;
  const client=new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}});
  function App(){return React.createElement(QueryClientProvider,{client},React.createElement(FirstRun,null,React.createElement(Dashboard)));}
  const view=await mount(App,{route:'/app'});
  const tick=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,25));});
  async function click(text){const button=[...view.container.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert.ok(button,text);await act(async()=>button.click());}
  async function answer(name,value){await act(async()=>view.container.querySelector(`input[name="${name}"][value="${value}"]`).click());}
  try {
    await tick();await answer('current-level','A2');await click('Devam');
    await answer('target-level','B2');await click('Devam');
    await answer('exam-period',session.id);await click('Kaydet ve devam et');await tick();
    assert.equal(Boolean(view.container.querySelector('.first-run')),false);
    assert.doesNotMatch(view.container.textContent,/İlk pratiğiniz hazır|Pratiğe başla|Platformu keşfet/);
    assert.equal(reads.includes('/api/listening-practice'),false);
    assert.equal(view.container.querySelector('.dashboard-level__value').textContent,'B1 altı');
    assert.match(view.container.querySelector('.dashboard-level__goal').textContent,/B2/);
    assert.deepEqual([...view.container.querySelectorAll('.student-home__skill')].map(card=>card.dataset.skill),['listening','reading','writing','speaking']);
    assert.equal(view.container.querySelectorAll('.student-home__skill-count').length,4);
    assert.equal(Boolean(view.container.querySelector('.student-home__study')),false);
    assert.equal(reads.some(url=>url.includes('activity-calendar')),false);
    assert.match(view.container.querySelector('.student-home__month').textContent,/Kasım 2026/i);
    assert.equal(view.container.querySelectorAll('.student-home__calendar [aria-pressed="true"]').length,3);
    assert.equal(Boolean(view.container.querySelector('.dashboard-skill-action')),false);
    assert.equal(Boolean(view.container.querySelector('#home-progress')),false);
  } finally {await view.unmount();client.clear();}
});

test('unresolved and failed results stay distinct from an empty history while keeping the selected level',async()=>{
  const pending=deferred();readResults=()=>pending.promise;
  savedProfile={currentLevel:'A2',targetLevel:'B2',onboardingCompleted:true,examTarget:'CEFR',examSessionId:session.id,examDate:session.examStart};
  const client=new QueryClient({defaultOptions:{queries:{retry:false,retryDelay:0}}});
  function App(){return React.createElement(QueryClientProvider,{client},React.createElement(Dashboard));}
  const view=await mount(App,{route:'/app'});
  const tick=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,25));});
  try {
    await tick();
    assert.equal(view.container.querySelector('.dashboard-level__value').textContent,'B1 altı');
    assert.match(view.container.querySelector('.dashboard-level__result-status').textContent,/yükleniyor/);
    assert.ok([...view.container.querySelectorAll('.student-home__skill-count')].every(el=>el.textContent.includes('yükleniyor')));
    assert.doesNotMatch(view.container.textContent,/Henüz sonuç yok|Henüz test sonucu yok/);
    await act(async()=>pending.reject(Error('offline')));await tick();await tick();
    assert.equal(view.container.querySelector('.dashboard-level__value').textContent,'B1 altı');
    assert.match(view.container.querySelector('.dashboard-level__result-status').textContent,/yüklenemedi/);
    assert.ok([...view.container.querySelectorAll('.student-home__skill-count')].every(el=>el.textContent.includes('yüklenemedi')));
    assert.doesNotMatch(view.container.textContent,/Henüz sonuç yok|Henüz test sonucu yok/);
  } finally {await view.unmount();client.clear();readResults=async()=>[];}
});
