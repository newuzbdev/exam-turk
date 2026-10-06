import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {React,act,loadOfflineComponent,mount} from './helpers/offline-react.mjs';
globalThis.DocumentFragment=window.DocumentFragment;
const {QueryClient,QueryClientProvider}=createRequire(import.meta.url)('@tanstack/react-query');
let starts=[],owned=[];const overall={getCurrentSession:async()=>null,start:async p=>{starts.push(p);return null;}};
const target={scope:'MOCK_WRITING',targetId:'writing'};
const catalog={ieltsData:[{id:'package-one',title:'Satın Alınan Sınav',category:'WRITING',createdAt:'now'}],writingTests:[{id:'writing',ieltsId:'package-one',status:'PUBLISHED',formatVersion:2}],readingTests:[],listeningTests:[],speakingTests:[]};
const api={getConfig:async()=>({enabled:true}),getCatalogSummary:async()=>({groups:[]}),getDecisions:async(targets,_mode,_redemption,paidPurchaseId)=>targets.map(target=>({target,canOpen:!!paidPurchaseId,sourceKind:paidPurchaseId?'PURCHASED_PACKAGE':null,blockedReason:paidPurchaseId?null:'MEMBERSHIP_REQUIRED',remaining:{}})),createSession:async()=>{throw Error('explicit pass uses server-owned overall context');}};
const {default:Page}=await loadOfflineComponent('src/pages/test/test.tsx',{
 '@/hooks/use-billing-purchases':{useBillingPurchases:()=>({data:owned,isPending:false})},
 '@/contexts/AuthContext':{useAuth:()=>({isAuthenticated:true,user:{id:'student'},refreshUser:async()=>{}})},
 '@/services/access.service':{accessService:api},'@/config/api':{default:{get:async()=>({data:catalog})},resolveApiResourceUrl:v=>v},
 '@/services/auth.service':{authService:{getStoredTokens:()=>({})}},
 '@/services/subscription.service':{subscriptionStatusQueryKey:['subscription','status'],subscriptionService:{getStatus:async()=>({isActive:false})}},
 '@/services/overallTest.service':{default:overall,overallTestService:overall,overallTestTokenStore:{},overallTestFlowStore:{clear(){},hasActive:()=>false,getQueue:()=>[],getPendingNextSection:()=>null}},
 '@/hooks/use-student-action':{useStudentAction:()=>()=>{}},'@/components/payme/PaymeCheckoutModal':{default:()=>null},
 '@/config/billing':{isSubscriptionBillingEnabled:true},'@/services/testCoinPrice.service':{default:{getAll:async()=>[]}},
 './TestConfirmationModal':{default:p=>p.open?React.createElement('div',null,p.sourcePicker,React.createElement('button',{onClick:p.onConfirm},'Hazırım')):null},
});
const pass=(kind='MOCK_PASS')=>({purchaseId:'owned-pass',status:'ACTIVE',remainingAttempts:1,snapshot:{terms:{kind,name:'Tekil Mock',attemptLimit:1,lessonIds:[],mockSelections:[{sections:[target]}]}}});
async function setup(route,rows){owned=rows;starts=[];sessionStorage.clear();sessionStorage.setItem('userId','student');const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});const Harness=()=>React.createElement(QueryClientProvider,{client},React.createElement(Page,{workspaceMode:true}));const view=await mount(Harness,{route});await act(async()=>new Promise(r=>setTimeout(r,100)));return {...view,close:async()=>{await view.unmount();client.clear();}};}
for(const [kind,route]of [['MOCK_PASS','/app/test'],['MEMBERSHIP','/app/test?package=package-one&skills=writing&test=writing']])test(`nonmember reaches explicit purchased Mock picker from ${kind} entry without spending during admission`,async()=>{
 const v=await setup(route,[pass(kind)]);try{
 if(route==='/app/test'){const card=v.container.querySelector('.mock-test-card');assert.ok(card);await act(async()=>card.click());}
 await act(async()=>new Promise(r=>setTimeout(r,30)));
 const select=v.container.querySelector('select[aria-label="Kullanılacak Hak"]');assert.ok(select,v.container.textContent);assert.equal(starts.length,0);
 await act(async()=>{select.value='owned-pass';select.dispatchEvent(new Event('change',{bubbles:true}));});
 const start=[...v.container.querySelectorAll('button')].find(b=>b.textContent==='Teste başla');assert.ok(start,v.container.textContent);await act(async()=>start.click());
 const ready=[...v.container.querySelectorAll('button')].find(b=>b.textContent==='Hazırım');assert.ok(ready,v.container.textContent);await act(async()=>ready.click());
 assert.equal(starts.length,1);assert.equal(starts[0].paidPurchaseId,'owned-pass');assert.equal(starts[0].writingId,'writing');
 }finally{await v.close();}
});
test('exhausted or unrelated Mock purchases cannot unlock the card',async()=>{
 const exhausted={...pass(),remainingAttempts:0};const unrelated=pass();unrelated.snapshot.terms.mockSelections[0].sections[0]={...target,targetId:'different'};
 const v=await setup('/app/test',[exhausted,unrelated]);try{await act(async()=>v.container.querySelector('.mock-test-card').click());assert.equal(v.container.querySelector('select[aria-label="Kullanılacak Hak"]'),null);assert.equal(starts.length,0);assert.match(document.body.textContent,/Abone/);}finally{await v.close();}
});
