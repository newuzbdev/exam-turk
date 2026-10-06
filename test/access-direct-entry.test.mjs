import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {React,act,loadOfflineComponent,mount} from './helpers/offline-react.mjs';
globalThis.DocumentFragment=window.DocumentFragment;
const {QueryClient,QueryClientProvider}=createRequire(import.meta.url)('@tanstack/react-query');
let enabled=true,starts=[],contexts=[],redemptions=0,decisions=[];
const catalog={ieltsData:[{id:'package-one',title:'Paket',category:'CEFR_MOCK',createdAt:'now'}],...Object.fromEntries(['reading','listening','writing','speaking'].map(skill=>[`${skill}Tests`,[{id:`${skill}-first`,ieltsId:'package-one',status:'PUBLISHED',...(skill==='writing'||skill==='speaking'?{formatVersion:2}:{})},{id:`${skill}-second`,ieltsId:'package-one',status:'PUBLISHED',...(skill==='writing'||skill==='speaking'?{formatVersion:2}:{})}]]))};
catalog.readingTests.push({id:'foreign-reading',ieltsId:'package-other',status:'PUBLISHED'});
const overall={getCurrentSession:async()=>null,start:async payload=>{starts.push(payload);return null;}};
const api={getConfig:async()=>({enabled}),getCatalogSummary:async()=>({groups:[]}),getDecisions:async targets=>{decisions.push(...targets);return targets.map(target=>({target,canOpen:true,sourceKind:'PAID',remaining:{MOCK_WRITING:10,MOCK_SPEAKING:10}}));},redeemShare:async()=>{redemptions++;throw Error('ordinary copy cannot redeem');},createSession:async(target,input)=>{contexts.push({target,input});return{contextId:'exact-context'};}};
const {default:TestPage}=await loadOfflineComponent('src/pages/test/test.tsx',{
 '@/hooks/use-billing-purchases':{useBillingPurchases:()=>({data:[],isPending:false})},
 '@/contexts/AuthContext':{useAuth:()=>({isAuthenticated:true,user:{id:'offline-user',coin:100},refreshUser:async()=>{}})},
 '@/services/access.service':{accessService:api},'@/config/api':{default:{get:async()=>({data:catalog})},resolveApiResourceUrl:value=>value},
 '@/services/auth.service':{authService:{getStoredTokens:()=>({})}},
 '@/services/subscription.service':{subscriptionStatusQueryKey:['subscription','status'],subscriptionService:{getStatus:async()=>({isActive:true,writingMockRemaining:10,speakingMockRemaining:10})}},
 '@/services/overallTest.service':{default:overall,overallTestService:overall,overallTestTokenStore:{},overallTestFlowStore:{clear(){},hasActive:()=>false,getQueue:()=>[],getPendingNextSection:()=>null}},
 '@/hooks/use-student-action':{useStudentAction:()=>()=>{}},'@/components/payme/PaymeCheckoutModal':{default:()=>null},
 '@/config/billing':{isSubscriptionBillingEnabled:false},'@/services/testCoinPrice.service':{default:{getAll:async()=>[]}},
 './TestConfirmationModal':{default:props=>props.open?React.createElement('button',{onClick:props.onConfirm},'Hazırım'):null},
});
async function setup(route,rollout=true){sessionStorage.clear();localStorage.clear();sessionStorage.setItem('userId','offline-user');enabled=rollout;starts=[];contexts=[];redemptions=0;decisions=[];const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});const Harness=()=>React.createElement(QueryClientProvider,{client},React.createElement(TestPage,{workspaceMode:true}));const view=await mount(Harness,{route});for(let i=0;i<20&&!view.container.querySelector('[role=alert]')&&!/Bölüm seçin|Hazırım/.test(view.container.textContent);i++)await act(async()=>new Promise(resolve=>setTimeout(resolve,5)));return{...view,async close(){await view.unmount();client.clear();}};}
async function confirm(view){let ready=[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Hazırım');if(!ready){const start=[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Teste başla');assert.ok(start,view.container.textContent);await act(async()=>start.click());ready=[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Hazırım');}assert.ok(ready);await act(async()=>ready.click());}
for(const skill of ['reading','listening','writing','speaking'])test(`ordinary ${skill} copy binds second published sibling in real page/modal Start`,async()=>{
 const view=await setup(`/app/test?package=package-one&skills=${skill}&test=${skill}-second`);
 try{assert.equal(starts.length,0);assert.equal(contexts.length,0);await confirm(view);assert.equal(starts.length,1);assert.equal(starts[0][`${skill}Id`],`${skill}-second`);assert.equal(starts[0].accessContextId,'exact-context');const target={scope:`MOCK_${skill.toUpperCase()}`,targetId:`${skill}-second`};assert.deepEqual(contexts,[{target,input:{}}]);assert.ok(decisions.some(t=>t.scope===target.scope&&t.targetId===target.targetId));assert.equal(redemptions,0);}finally{await view.close();}
});
for(const suffix of ['skills=reading&test=missing','skills=reading&test=foreign-reading','skills=writing&test=reading-second','skills=reading,speaking&test=reading-second','skills=reading&test=reading-second&test=reading-first','test=reading-second'])test(`invalid exact ordinary target cannot open Start: ${suffix}`,async()=>{
 const view=await setup(`/app/test?package=package-one&${suffix}`);try{assert.equal([...view.container.querySelectorAll('button')].some(b=>b.textContent==='Hazırım'),false);assert.match(view.container.textContent,/Bu bağlantının süresi dolmuş veya erişime kapatılmış/);assert.equal(starts.length,0);assert.equal(contexts.length,0);assert.equal(redemptions,0);}finally{await view.close();}
});
test('flag-off ordinary exact link still narrows selected test without timed access requests',async()=>{const view=await setup('/app/test?package=package-one&skills=reading&test=reading-second',false);try{await confirm(view);assert.equal(starts[0].readingId,'reading-second');assert.equal(starts[0].accessContextId,undefined);assert.equal(contexts.length,0);assert.equal(redemptions,0);assert.equal(decisions.length,0);}finally{await view.close();}});
test('ordinary package URL preserves existing multi-section entry and package authority',async()=>{const view=await setup('/app/test?package=package-one&skills=reading');try{await confirm(view);assert.equal(starts[0].readingId,'reading-first');assert.deepEqual(contexts[0],{target:{scope:'MOCK_PACKAGE',targetId:'package-one'},input:{selectedTargets:[{scope:'MOCK_READING',targetId:'reading-first'}]}});assert.equal(redemptions,0);}finally{await view.close();}});
