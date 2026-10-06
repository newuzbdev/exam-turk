import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfflineComponent } from './helpers/offline-react.mjs';
const { initialFreeGroup }=await loadOfflineComponent('src/utils/content-access.ts');
const groups=[{scope:'PRACTICE_READING',total:100,publicFreeCount:0},{scope:'PRACTICE_SPEAKING',total:200,publicFreeCount:1}];
test('summary can choose free domain beyond the currently loaded page',()=>assert.equal(initialFreeGroup(groups, false)?.scope,'PRACTICE_SPEAKING'));
test('explicit filter/tab/url choice wins over summary',()=>assert.equal(initialFreeGroup(groups,true),undefined));
const {React,act,mount}=await import('./helpers/offline-react.mjs');
const {createRequire}=await import('node:module');
const {QueryClient,QueryClientProvider}=createRequire(import.meta.url)('@tanstack/react-query');
globalThis.DocumentFragment=window.DocumentFragment;
let currentGroups=groups;
const mocks={
 '@/contexts/AuthContext':{useAuth:()=>({isAuthenticated:true,user:{id:'summary-user'}})},
 '@/services/access.service':{accessService:{getConfig:async()=>({enabled:true}),getCatalogSummary:async()=>({asOf:'now',groups:currentGroups}),getDecisions:async()=>[]}},
 '@/services/subscription.service':{subscriptionStatusQueryKey:['subscription','status'],subscriptionService:{getStatus:async()=>({isActive:false})}},
 '@/components/practice/PracticeList':{default:({domain})=>React.createElement('p',{'data-domain':domain},domain)},
 './ReadingPracticeList':{default:()=>React.createElement('p',{'data-domain':'READING'},'READING')},
 '@/components/practice/PracticeDirectEntry':{default:()=>React.createElement('p',null,'DIRECT')},
};
const {default:Home}=await loadOfflineComponent('src/pages/reading-practice/PracticeHome.tsx',mocks);
async function setup(route){
 sessionStorage.clear();localStorage.clear();sessionStorage.setItem('userId','summary-user');
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
 const Harness=()=>React.createElement(QueryClientProvider,{client},React.createElement(Home,{workspaceMode:true}));
 const view=await mount(Harness,{route});await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});
 return {...view,client,async unmount(){await view.unmount();client.clear();}};
}
test('actual Practice home selects global free domain once; refresh never overrides student selection',async()=>{
 currentGroups=groups;const view=await setup('/app/pratik');
 try{
  assert.equal(view.container.querySelector('[data-state="active"][role="tab"]').textContent,'Konuşma');
  const reading=[...view.container.querySelectorAll('[role="tab"]')].find(node=>node.textContent==='Okuma');
  await act(async()=>reading.dispatchEvent(new window.MouseEvent('mousedown',{bubbles:true,button:0})));
  assert.equal(view.container.querySelector('[data-state="active"][role="tab"]').textContent,'Okuma');
  await act(async()=>view.client.invalidateQueries({queryKey:['access-catalog-summary']}));
  assert.equal(view.container.querySelector('[data-state="active"][role="tab"]').textContent,'Okuma');
 }finally{await view.unmount();}
});
test('actual Practice home respects explicit URL domain despite another free domain',async()=>{
 const view=await setup('/app/pratik?bolum=writing');
 try{assert.equal(view.container.querySelector('[data-state="active"][role="tab"]').textContent,'Yazma');}finally{await view.unmount();}
});
test('Reading service concatenates server pages without client sorting; public ordering survives retrieval',async()=>{
 const requests=[];
 const {readingPracticeService}=await loadOfflineComponent('src/services/readingPractice.service.ts',{
  '@/config/api':{default:{get:async(url,{params})=>{requests.push(params);return {data:{total:101,data:params.page===1?Array.from({length:100},(_,i)=>({id:`server-${i}`,isPublicFree:i===0})): [{id:'server-100'}]}};}}},
 });
 const rows=await readingPracticeService.getAll({order:'oldest'});
 assert.equal(rows.length,101);assert.equal(rows[0].id,'server-0');assert.equal(rows[100].id,'server-100');
 assert.deepEqual(requests,[{page:1,limit:100,order:'oldest'},{page:2,limit:100,order:'oldest'}]);
});
