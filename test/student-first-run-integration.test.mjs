import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { React, act, deferred, loadOfflineComponent, mount } from './helpers/offline-react.mjs';
import { useLocation, useNavigate } from 'react-router-dom';
const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');

const Auth = React.createContext(null);
let request;
const api = Object.fromEntries(['get','post','patch'].map(method=>[method,(url,input)=>request(method,url,input)]));
const {default: Gate}=await loadOfflineComponent('src/components/first-run/student-first-run.tsx',{
  '@/contexts/AuthContext':{useAuth:()=>React.useContext(Auth)},
  '@/config/api':{default:api},
});
const {useStudentOnboarding}=await loadOfflineComponent('src/pages/dashboard/onboarding-api.ts',{
  '@/contexts/AuthContext':{useAuth:()=>React.useContext(Auth)}, '@/config/api':{default:api},
});
const profile={id:'p',userId:'a',goal:'EXAM_PREPARATION',currentLevel:'A2',supportLanguage:'TURKISH',examTarget:'CEFR',dailyStudyMinutes:20,examDate:null,targetLevel:'B2',targetExamYear:null,examSessionId:null,onboardingCompleted:true,createdAt:'2026-10-19',updatedAt:'2026-10-19'};
const tick=()=>act(async()=>{await new Promise(r=>setTimeout(r,25));});

async function setup({owner='a',route='/app',profiles={},getProfile,saveProfile,Content}={}) {
  const writes=[]; const reads=[];
  let currentOwner=owner; let changeOwner; let changeRoute;
  request=async(method,url,input)=>{
    if(method==='get') {
      reads.push(url);
      if(url==='/api/me/onboarding') return {data:{success:true,data:getProfile ? await getProfile(currentOwner) : profiles[currentOwner]??null}};
      if(url==='/api/me/official-exams') return {data:{success:true,data:{sessions:[],selectedSession:null}}};
    } else if(url==='/api/me/onboarding') {
      writes.push({method,input,owner:currentOwner});
      return {data:{success:true,data:saveProfile ? await saveProfile(input) : {...profile,...input,userId:currentOwner}}};
    }
    throw Error(`Unexpected network boundary: ${method} ${url}`);
  };
  const client=new QueryClient({defaultOptions:{queries:{retry:false,retryDelay:0},mutations:{retry:false}}});
  function Dashboard() {
    const location=useLocation(); const data=useStudentOnboarding();
    return React.createElement('div',{'data-dashboard':true},`Dashboard · Hedef: ${data.data?.targetLevel??'yok'} · ${location.pathname}${location.search}`);
  }
  function App() {
    changeRoute=useNavigate();
    const [user,setUser]=React.useState({id:owner,role:'USER'});
    changeOwner=next=>{currentOwner=next;setUser({id:next,role:'USER'});};
    return React.createElement(QueryClientProvider,{client},React.createElement(Auth.Provider,{value:{user,isAuthenticated:true}},React.createElement(Gate,null,React.createElement(Content??Dashboard))));
  }
  const view=await mount(App,{route}); await tick();
  return {...view,writes,reads,client,async owner(next){await act(async()=>changeOwner(next));await tick();},async go(path){await act(async()=>changeRoute(path));await tick();},async close(){await view.unmount();client.clear();}};
}
async function click(view,text) {
  const button=[...view.container.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
  assert.ok(button,`Missing ${text}`); await act(async()=>button.click());
}
async function answer(view,name,value) {
  const input=view.container.querySelector(`input[name="${name}"][value="${value}"]`); assert.ok(input);
  await act(async()=>input.click());
}
async function complete(view) {
  await answer(view,'current-level','A2'); await click(view,'Devam');
  await answer(view,'target-level','B1'); await click(view,'Devam');
  await answer(view,'exam-period','undecided'); await click(view,'Kaydet ve devam et'); await tick();
}

test('existing completed profiles and practice deep links do not show or save onboarding',async()=>{
  const old=await setup({profiles:{a:profile}});
  try {assert.ok(old.container.querySelector('[data-dashboard]'));assert.equal(old.container.querySelector('form'),null);assert.equal(old.writes.length,0);} finally {await old.close();}
  const link=await setup({route:'/app/pratik?bolum=listening&start=free-map'});
  try {assert.ok(link.container.querySelector('[data-dashboard]'));assert.equal(link.reads.includes('/api/me/official-exams'),false);} finally {await link.close();}
});

test('loading is not treated as an empty profile and profile failures leave the app accessible',async()=>{
  const pending=deferred(); const view=await setup({getProfile:()=>pending.promise});
  try {
    assert.equal(view.container.querySelector('form'),null); assert.match(view.container.textContent,/hazırlanıyor/);
    await act(async()=>pending.reject(Error('offline'))); await tick(); await tick();
    assert.equal(view.container.querySelector('form'),null); assert.ok(view.container.querySelector('[data-dashboard]'));
    assert.match(view.container.textContent,/Profil bilgileri yüklenemedi/);
  } finally {await view.close();}
});

test('saving from every normal entry opens the dashboard directly without a practice step or catalogue request',async()=>{
  for (const route of ['/app','/app/test','/app/pratik?bolum=listening']) {
  const owner=`saved-${route}`;
  const view=await setup({owner,route});
  try {
    await complete(view);
    assert.equal(Boolean(view.container.querySelector('form')),false);
    assert.doesNotMatch(view.container.textContent,/İlk pratiğiniz hazır|Pratiğe başla|Platformu keşfet/);
    assert.equal(view.container.querySelector('[data-dashboard]').parentElement.hidden,false);
    assert.equal(view.writes.length,1); assert.equal(view.writes[0].method,'post');
    assert.equal(view.writes[0].input.examTarget,'CEFR');
    assert.equal(view.client.getQueryData(['student','me','onboarding','owner',owner]).targetLevel,'B1');
    assert.equal(view.container.querySelector('[data-dashboard]').textContent,'Dashboard · Hedef: B1 · /app');
    assert.equal(view.reads.includes('/api/listening-practice'),false);
  } finally {await view.close();}
  }
});

test('skip is account-scoped, persists after remount, and makes no profile write',async()=>{
  const view=await setup({owner:'skip-a'});
  try {
    await click(view,'Şimdilik geç'); assert.ok(view.container.querySelector('[data-dashboard]')); assert.equal(view.writes.length,0);
    await view.owner('skip-b'); assert.ok(view.container.querySelector('form'));
    await view.owner('skip-a'); assert.ok(view.container.querySelector('[data-dashboard]'));
  } finally {await view.close();}
  const reopened=await setup({owner:'skip-a'});
  try {assert.equal(reopened.container.querySelector('form'),null);} finally {await reopened.close();}
});

test('a late save from a different account cannot dismiss the new account wizard',async()=>{
  const pending=deferred(); const view=await setup({owner:'late-a',saveProfile:()=>pending.promise});
  try {
    await complete(view); await view.owner('late-b');
    await act(async()=>pending.resolve({...profile,userId:'late-a',targetLevel:'B1'})); await tick();
    assert.match(view.container.textContent,/Türkçe seviyeniz/); assert.doesNotMatch(view.container.textContent,/İlk pratiğiniz hazır/);
    assert.equal(view.client.getQueryData(['student','me','onboarding','owner','late-b']),null);
  } finally {await view.close();}
});

test('a failed save keeps the answers on the current entry, and retry opens the dashboard only after success',async()=>{
  let tries=0;
  const view=await setup({owner:'retry-save',route:'/app/test',saveProfile:async input=>{
    if(++tries===1)throw Error('offline');
    return {...profile,...input,userId:'retry-save'};
  }});
  try {
    await complete(view);
    assert.ok(view.container.querySelector('[role="alert"]'));
    assert.equal(view.container.querySelector('input[value="undecided"]').checked,true);
    assert.match(view.container.querySelector('[data-dashboard]').textContent,/\/app\/test$/);
    assert.equal(view.container.querySelector('[data-dashboard]').parentElement.hidden,true);
    await click(view,'Kaydet ve devam et');await tick();
    assert.equal(view.container.querySelector('form'),null);
    assert.equal(view.container.querySelector('[data-dashboard]').textContent,'Dashboard · Hedef: B1 · /app');
    assert.equal(view.writes.length,2);
    assert.equal(view.reads.includes('/api/listening-practice'),false);
  } finally {await view.close();}
});

test('mock package query cleanup preserves the opened modal for completed and incomplete profiles',async()=>{
  for (const completed of [false,true]) {
    let mounts=0;
    function MockEntry() {
      const location=useLocation(), navigate=useNavigate();
      const [open,setOpen]=React.useState(false);
      React.useEffect(()=>{mounts++;},[]);
      React.useEffect(()=>{
        if(new URLSearchParams(location.search).get('package')) {
          setOpen(true); navigate('/app/test',{replace:true});
        }
      },[location.search,navigate]);
      return React.createElement('p',null,open?'Requested mock modal open':'Modal lost');
    }
    const view=await setup({owner:`package-${completed}`,route:'/app/test?package=mock-1',profiles:completed?{[`package-${completed}`]:profile}:{},Content:MockEntry});
    try {
      assert.equal(mounts,1); assert.match(view.container.textContent,/Requested mock modal open/);
      assert.equal(view.container.querySelector('form'),null);
      assert.equal(view.container.querySelector('p').parentElement.hidden,false);
    } finally {await view.close();}
  }
});

test('external profile completion closes a mounted wizard without another save',async()=>{
  const view=await setup({owner:'completed-elsewhere'});
  try {
    assert.ok(view.container.querySelector('form'));
    await act(async()=>view.client.setQueryData(['student','me','onboarding','owner','completed-elsewhere'],{...profile,userId:'completed-elsewhere'}));
    await tick();
    assert.equal(Boolean(view.container.querySelector('form')),false);
    assert.equal(view.container.querySelector('[data-dashboard]').parentElement.hidden,false);
    assert.equal(view.writes.length,0);
  } finally {await view.close();}
});

test('a save finishing after leaving setup does not redirect the new route or reopen the wizard on return',async()=>{
  const pending=deferred(); const view=await setup({owner:'leave-during-save',saveProfile:()=>pending.promise});
  try {
    await complete(view); await view.go('/app/fiyatlar');
    await act(async()=>pending.resolve({...profile,userId:'leave-during-save',targetLevel:'B1'})); await tick();
    assert.match(view.container.querySelector('[data-dashboard]').textContent,/\/app\/fiyatlar$/);
    await view.go('/app');
    assert.equal(Boolean(view.container.querySelector('form')),false);
    assert.doesNotMatch(view.container.textContent,/İlk pratiğiniz hazır/);
    assert.equal(view.container.querySelector('[data-dashboard]').parentElement.hidden,false);
  } finally {await view.close();}
});

test('failed background profile refresh keeps the current step and answers intact',async()=>{
  let fail=false;
  const view=await setup({owner:'refetch-error',getProfile:async()=>{if(fail)throw Error('offline');return null;}});
  try {
    await answer(view,'current-level','A2'); await click(view,'Devam'); await answer(view,'target-level','B2');
    fail=true;
    await act(async()=>view.client.invalidateQueries({queryKey:['student','me','onboarding','owner','refetch-error']})); await tick();
    assert.equal(view.container.querySelector('input[value="B2"]').checked,true);
    assert.match(view.container.textContent,/Hedef seviyeniz/);
  } finally {await view.close();}
});
