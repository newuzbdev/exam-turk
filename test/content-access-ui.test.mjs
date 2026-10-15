import test from 'node:test';
import assert from 'node:assert/strict';
import { loadOfflineComponent } from './helpers/offline-react.mjs';
const { contentAccessKey, isContentLocked, canContinuePaid, getContentStartIssue } = await loadOfflineComponent('src/utils/content-access.ts');
const open = { canOpen:true, sourceKind:'ADMIN', remaining:{}, blockedReason:null };
test('only the matching server decision unlocks a card; unknown and SHARE catalog decisions stay locked', () => {
 assert.equal(isContentLocked(open), false);
 assert.equal(isContentLocked({...open,canOpen:false}), true);
 assert.equal(isContentLocked(undefined), true);
 assert.equal(isContentLocked({...open,sourceKind:'PUBLIC'}), false);
 assert.equal(isContentLocked({...open,sourceKind:'SHARE'}), true);
 assert.notEqual(contentAccessKey({scope:'PRACTICE_WRITING',targetId:'a'}),contentAccessKey({scope:'PRACTICE_WRITING',targetId:'b'}));
});
test('mixed Mock checks every real selected target, not published available skills', () => {
 const targets=[{scope:'MOCK_READING',targetId:'r'},{scope:'MOCK_WRITING',targetId:'w'}];
 const decisions=[{...open,target:targets[0]}];
 assert.equal(getContentStartIssue(targets.slice(0,1), decisions),null);
 assert.equal(getContentStartIssue(targets, decisions),'MEMBERSHIP_REQUIRED');
 assert.equal(getContentStartIssue(targets.slice(1),[{...open,target:targets[1],remaining:{MOCK_WRITING:0}}]),'AI_LIMIT');
});
test('paid continuation needs a fresh PAID decision in the relevant bucket', () => {
 assert.equal(canContinuePaid({...open,sourceKind:'PAID',remaining:{MOCK_WRITING:1}},'PRACTICE_AI'),false);
 assert.equal(canContinuePaid({...open,sourceKind:'PUBLIC',remaining:{PRACTICE_AI:1}},'PRACTICE_AI'),false);
 assert.equal(canContinuePaid({...open,sourceKind:'PAID',remaining:{PRACTICE_AI:1}},'PRACTICE_AI'),true);
});

const { React, act, mount, typeAnswer } = await import('./helpers/offline-react.mjs');
const { createRequire } = await import('node:module');
const { QueryClient, QueryClientProvider } = createRequire(import.meta.url)('@tanstack/react-query');
const { Routes, Route, useLocation } = await import('react-router-dom');
const { writingAnswer, writingPractice, writingEvaluation } = await import('./fixtures/writing-practice-fixture.mjs');
globalThis.DocumentFragment = window.DocumentFragment;
let owner='student-a', enabled=true, expired=false, paidRemaining=2;
let sessions=[], evaluations=[], decisionsCalls=[], solves=0, continuations=[];
const target={scope:'PRACTICE_WRITING',targetId:'practice-1'};
const api={
 getConfig:async()=>({enabled}),
 getDecisions:async(targets,mode,redemption)=>{
  decisionsCalls.push({owner,targets,mode,redemption});
  return targets.map(target=>({...open,target,sourceKind:mode==='PAID'?'PAID':target.targetId==='locked'?'SHARE':'PUBLIC',canOpen:target.targetId!=='locked',isPublicFree:target.targetId!=='locked',remaining:{PRACTICE_AI:mode==='PAID'?paidRemaining:1}}));
 },
 createSession:async(target,input={})=>{sessions.push({target,input,owner});return {contextId:input.mode==='PAID'?'paid-context':'public-context',decision:open};},
 continueMockPaid:async(overallTestId,input)=>{continuations.push({overallTestId,input});return{contextId:'effective-context',decision:open};},
};
const mocks={
 '@/hooks/use-billing-purchases':{useBillingPurchases:()=>({data:[],isPending:false})},
 '@/contexts/AuthContext':{useAuth:()=>({user:{id:owner},isAuthenticated:true})},
 '@/services/access.service':{accessService:api},
 '@/services/writingPractice.service':{default:{
  list:async()=>[{...structuredClone(writingPractice),isPublicFree:true},{...structuredClone(writingPractice),id:'locked',title:'Kilitli',isFreeAccess:false}],
  solve:async(id,input)=>{solves++;assert.equal(input.accessContextId,'public-context');return structuredClone(writingPractice);},
  evaluate:async(...args)=>{evaluations.push(args);if(expired && args[4]?.accessContextId!=='paid-context')throw{response:{status:403,data:{message:'EXPIRED'}}};return {...structuredClone(writingEvaluation),answerText:args[2]};},
  getEvaluation:async()=>({status:'FAILED',result:null}),
 }},
 '@/services/listeningPractice.service':{default:{list:async()=>[]}},
 '@/services/speakingPractice.service':{default:{list:async()=>[]}},
 '@/components/practice/PracticeAllowance':{default:()=>null},
 '@/components/ui/confirmation-modal':{ConfirmationModal:({isOpen,onConfirm})=>isOpen?React.createElement('button',{onClick:onConfirm},'Onayla'):null},
 '@/components/ui/resizable':{ResizablePanelGroup:({children})=>React.createElement('div',null,children),ResizablePanel:({children})=>React.createElement('div',null,children),ResizableHandle:()=>null},
};
const {default:PracticeList}=await loadOfflineComponent('src/components/practice/PracticeList.tsx',mocks);
const {default:WritingTest}=await loadOfflineComponent('src/pages/writing-practice/WritingPracticeTest.tsx',mocks);
const {default:Recovery}=await loadOfflineComponent('src/components/subscription/ContentAccessRecovery.tsx',mocks);
const { useContentAccessDecisions }=await loadOfflineComponent('src/hooks/use-content-access.ts',mocks);
function ContentHarness(){return React.createElement(Routes,null,
 React.createElement(Route,{path:'/app/pratik/yazma/:id',element:React.createElement(WritingTest)}),
 React.createElement(Route,{path:'*',element:React.createElement(PracticeList,{domain:'WRITING'})}));}
const flush=async()=>{await act(async()=>{await new Promise(resolve=>setTimeout(resolve,20));});};
async function setup(Component=ContentHarness,props={},route='/app/pratik'){
 sessionStorage.clear();localStorage.clear();sessionStorage.setItem('userId',owner);sessions=[];evaluations=[];decisionsCalls=[];solves=0;continuations=[];
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
 function Harness(){return React.createElement(QueryClientProvider,{client},React.createElement(Component,props));}
 const view=await mount(Harness,{route});await flush();await flush();
 return {...view,client,async unmount(){await view.unmount();client.clear();}};
}
const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent===text);
async function submit(){await act(async()=>button('Değerlendir').click());await act(async()=>button('Onayla').click());await flush();}
test('normal public card binds before draft; expiry with paid capacity preserves draft and explicit paid creates a new run without reloading content',async()=>{
 owner='student-a';enabled=true;expired=false;paidRemaining=2;
 const view=await setup();
 try {
  assert.equal(view.container.querySelectorAll('[aria-label="Abonelik gerekli"]').length,1);
  assert.match(view.container.textContent,/Ücretsiz/);
  await act(async()=>view.container.querySelector('article').click());
  assert.equal(sessions.length,1);assert.deepEqual(sessions[0].input,{});assert.equal(solves,1);
  await typeAnswer(view.container.querySelector('textarea'),writingAnswer);
  expired=true;
  await submit();
  assert.equal(evaluations.length,1);assert.equal(evaluations[0][4].accessContextId,'public-context');
  assert.equal(view.container.querySelector('textarea').value,writingAnswer);
  assert.equal(sessions.length,1,'No implicit paid context');
  assert.ok(button('Üyeliğimle devam et'));
  const draft=localStorage.getItem('writing_practice_practice-1');
  await act(async()=>button('Üyeliğimle devam et').click());
  assert.equal(solves,1,'No context-driven remount or solve resets');
  assert.equal(localStorage.getItem('writing_practice_practice-1'),draft);
  assert.equal(sessions[1].input.mode,'PAID');assert.equal(evaluations.length,1,'Continuation does not automatically evaluate');
  await submit();
  assert.equal(evaluations[1][4].accessContextId,'paid-context');
  assert.notEqual(evaluations[1][1],evaluations[0][1]);
  assert.equal(evaluations[1][2],writingAnswer);
 }finally{expired=false;await view.unmount();}
});
test('explicit paid Mock continuation changes only the requested section on existing Overall',async()=>{
 const blocked={response:{status:402,data:{message:'AI_LIMIT'}}};
 const original=api.getDecisions;api.getDecisions=async targets=>targets.map(target=>({...open,target,sourceKind:'PAID',remaining:{MOCK_WRITING:1}}));
 let result;
 const view=await setup(Recovery,{error:blocked,target:{scope:'MOCK_WRITING',targetId:'writing-child'},overallTestId:'same-overall',onClose(){},onPaid:id=>{result=id;}});
 try{
  assert.equal(sessions.length,0);assert.equal(continuations.length,0);
  await act(async()=>button('Üyeliğimle devam et').click());
  assert.deepEqual(sessions[0].target,{scope:'MOCK_WRITING',targetId:'writing-child'});
  assert.deepEqual(sessions[0].input,{mode:'PAID'});
  assert.deepEqual(continuations,[{overallTestId:'same-overall',input:{section:'WRITING',accessContextId:'paid-context'}}]);
  assert.equal(result,'effective-context');
 }finally{api.getDecisions=original;await view.unmount();}
});
test('no paid offer with irrelevant or exhausted allowance; account change rejects a previously displayed offer',async()=>{
 const blocked={response:{status:402,data:{message:'AI_LIMIT'}}};
 paidRemaining=0;
 let view=await setup(Recovery,{error:blocked,target,onClose(){}});
 try{assert.equal(button('Üyeliğimle devam et'),undefined);assert.equal(sessions.length,0);}finally{await view.unmount();}
 paidRemaining=2;view=await setup(Recovery,{error:blocked,target,onClose(){}});
 try{
  assert.ok(button('Üyeliğimle devam et'));
  sessionStorage.setItem('userId','student-b');
  await act(async()=>button('Üyeliğimle devam et').click());
  assert.equal(sessions.length,0);
 }finally{await view.unmount();}
});
function QueryHarness(){const result=useContentAccessDecisions([{scope:'PRACTICE_WRITING',targetId:'same'}]);return React.createElement('output',null,result.data?.[0]?.sourceKind||'pending');}
test('per-account decisions never reuse another user; disabled installation calls no feature endpoint',async()=>{
 owner='student-a';enabled=true;const view=await setup(QueryHarness);
 try{
  assert.ok(view.client.getQueryCache().getAll().some(query=>query.queryKey[0]==='content-access'&&query.queryKey[1]==='student-a'&&query.meta.persist===false));
  owner='student-b';sessionStorage.setItem('userId',owner);
  await act(async()=>view.client.invalidateQueries({queryKey:['content-access']}));await flush();
  assert.ok(decisionsCalls.some(call=>call.owner==='student-b'));
 }finally{await view.unmount();owner='student-a';}
 enabled=false;const off=await setup(QueryHarness);
 try{assert.equal(decisionsCalls.length,0);}finally{await off.unmount();enabled=true;}
});

for(const domain of ['LISTENING','SPEAKING']) test(`${domain}: normal card binds server context before content navigation and ignores old SHARE metadata`,async()=>{
 const service={list:async()=>[{...structuredClone(writingPractice),isPublicFree:true}]};
 const localMocks={...mocks,[`@/services/${domain.toLowerCase()}Practice.service`]:{default:service}};
 const {default:List}=await loadOfflineComponent('src/components/practice/PracticeList.tsx',localMocks);
 const {readOwnedAccess,saveOwnedAccess}=await import('../src/utils/access-link-context.ts');
 function ListHarness(){const location=useLocation();return React.createElement(React.Fragment,null,React.createElement('output',{'data-path':true},location.pathname),React.createElement(List,{domain}));}
 const view=await setup(ListHarness);
 try{
  saveOwnedAccess(owner,{scope:`PRACTICE_${domain}`,targetId:'practice-1'},{target:{scope:`PRACTICE_${domain}`,targetId:'practice-1'},redemptionId:'stale-share',contextId:'stale-context'});
  await act(async()=>view.container.querySelector('article').click());
  assert.deepEqual(sessions[0],{owner,target:{scope:`PRACTICE_${domain}`,targetId:'practice-1'},input:{}});
  assert.equal(readOwnedAccess(owner,{scope:`PRACTICE_${domain}`,targetId:'practice-1'}).contextId,'public-context');
  assert.match(view.container.querySelector('[data-path]').textContent,/practice-1/);
 }finally{await view.unmount();}
});
test('Reading normal card binds before attempt; failed ownerless recovery preserves answers and never starts replacement',async()=>{
 let starts=[];
 async function ready(view){
  for(let tries=0;tries<100&&(!view.container.querySelector('article')||view.container.querySelector('article[aria-busy="true"]'));tries++)await flush();
  assert.ok(view.container.querySelector('article'));
  assert.equal(view.container.querySelector('article[aria-busy="true"]'),null);
 }
 const item={id:'reading-one',title:'Okuma',passageTitle:'Okuma',isFreeAccess:false,isPublished:true,isPublicFree:true,level:'B1',practiceType:'SECTION',sectionNumber:1,createdAt:'2026-10-01',estimatedMinutes:20};
 const {default:ReadingList}=await loadOfflineComponent('src/pages/reading-practice/ReadingPracticeList.tsx',{
  ...mocks,
  '@/contexts/AuthContext':{useAuth:()=>({user:{id:owner},isAuthenticated:true,refreshUser:async()=>{}})},
  '@/hooks/use-student-action':{useStudentAction:()=>()=>{}},
  '@/components/payme/PaymeCheckoutModal':{default:()=>null},
  '@/services/readingPractice.service':{readingPracticeService:{getAll:async()=>[item],getPage:async()=>({data:[item],total:1,page:1,limit:10}),getCompletedPassageIds:async()=>[],start:async(id,input)=>{starts.push({id,input});return {attemptId:'attempt'};},getSolveDetail:async()=>null}},
 });
 const view=await setup(ReadingList,{workspaceMode:true});
 try{
  await ready(view);
  await act(async()=>view.container.querySelector('article').click());
  assert.deepEqual(starts,[{id:'reading-one',input:{accessContextId:'public-context'}}]);
 }finally{await view.unmount();}
 starts=[];
 const draft={attemptId:'prior-attempt',answers:{q:'B'},answeredCount:1,timerMinutes:30,timerEnabled:true,remainingSeconds:421};
 const resumed=await setup(ReadingList,{workspaceMode:true});
 await resumed.unmount();
 localStorage.setItem('reading-practice-progress:reading-one',JSON.stringify(draft));
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
 const Harness=()=>React.createElement(QueryClientProvider,{client},React.createElement(ReadingList,{workspaceMode:true}));
 const view2=await mount(Harness);await flush();
 try{
  await ready(view2);
  await act(async()=>view2.container.querySelector('article').click());
  await act(async()=>button('Devam et').click());
  assert.equal(starts.length,0);
  assert.deepEqual(JSON.parse(localStorage.getItem('reading-practice-progress:reading-one')),draft);
 }finally{await view2.unmount();client.clear();}
});

test('gifted platform access renders separately and never rewrites paid period/counters',async()=>{
 const paid={isActive:true,periodEnd:'2026-11-01T00:00:00Z',practiceRemaining:7,writingMockRemaining:3,speakingMockRemaining:4,frozenAddOnAssessmentRemaining:0};
 const {SubscriptionStatusCard}=await loadOfflineComponent('src/pages/profile/subscription-status-card.tsx',{
  ...mocks,
  '@/services/access.service':{accessService:{...api,getOwnAccess:async()=>[{id:'gift',scope:'PLATFORM',endsAt:'2026-12-01T00:00:00Z',remaining:{MOCK_WRITING:10,MOCK_SPEAKING:10,PRACTICE_AI:120}}]}},
  '@/services/subscription.service':{subscriptionStatusQueryKey:['subscription','status'],subscriptionService:{getStatus:async()=>structuredClone(paid)}},
 });
 const view=await setup(SubscriptionStatusCard);
 try{
  const gift=view.container.querySelector('[aria-label="Hediye haklar"]');assert.ok(gift);
  assert.deepEqual([...gift.querySelectorAll('dd')].map(node=>node.textContent),['120','10','10']);
  assert.equal(gift.querySelector('time').getAttribute('datetime'),'2026-12-01T00:00:00Z');
  assert.deepEqual([...view.container.querySelectorAll('dd')].filter(node=>!gift.contains(node)).map(node=>node.textContent),['7','3','4']);
  const paidEnd=[...view.container.querySelectorAll('time')].find(node=>!gift.contains(node));
  assert.equal(paidEnd.getAttribute('datetime'),paid.periodEnd);
  assert.deepEqual(view.client.getQueryData(['subscription','status',owner]),paid);
  const query=view.client.getQueryCache().getAll().find(query=>query.queryKey[0]==='own-access');assert.equal(query.queryKey[1],owner);assert.equal(query.meta.persist,false);
 }finally{await view.unmount();}
});

test('exhausted Mock preflight offers explicit fresh paid selection and binds PAID only on confirmation',async()=>{
 const apiPaid={...api,getDecisions:async(targets,mode)=>targets.map(target=>({...open,target,canOpen:mode==='PAID',sourceKind:mode==='PAID'?'PAID':'PUBLIC',remaining:{MOCK_WRITING:mode==='PAID'?1:0},blockedReason:mode==='PAID'?null:'AI_LIMIT'}))};
 let starts=[];
 const {default:Modal}=await loadOfflineComponent('src/pages/test/components/TestModal.tsx',{
  ...mocks,
  '@/services/access.service':{accessService:apiPaid},
  '@/hooks/use-student-action':{useStudentAction:()=>()=>{}},
  '@/components/payme/PaymeCheckoutModal':{default:()=>null},
  '@/config/billing':{isSubscriptionBillingEnabled:true},
  '@/services/testCoinPrice.service':{default:{getAll:async()=>[]}},
  '@/services/overallTest.service':{default:{getCurrentSession:async()=>null,start:async payload=>{starts.push(payload);return null;}},overallTestTokenStore:{},overallTestFlowStore:{getQueue:()=>[],getPendingNextSection:()=>null,clear(){}}},
  './TestConfirmationModal':{default:props=>props.open?React.createElement('button',{onClick:props.onConfirm},'Hazırım'):null},
 });
 const props={open:true,onOpenChange(){},workspaceMode:true,selectedTest:{id:'package',title:'Paket'},singleSkill:'writing',initialSelectedSkills:['writing'],writingTests:[{id:'w'}],readingTests:[],listeningTests:[],speakingTests:[],accessEntry:{enabled:true,ownerId:owner,target:{scope:'MOCK_PACKAGE',targetId:'package'}}};
 const view=await setup(Modal,props);
 try{
  assert.match(document.body.textContent,/değerlendirme hakkınız kalmadı/);assert.equal(starts.length,0);assert.equal(sessions.length,0);
  await act(async()=>button('Üyeliğimle devam et').click());
  assert.ok(button('Hazırım'));assert.equal(sessions.length,0);
  await act(async()=>button('Hazırım').click());
  assert.deepEqual(sessions[0].input,{mode:'PAID',selectedTargets:[{scope:'MOCK_WRITING',targetId:'w'}]});
  assert.equal(starts[0].accessContextId,'paid-context');
 }finally{await view.unmount();}
});
test('Speaking public rejection and explicit PAID continuation retain the exact recorded blobs and question, using a new run',async()=>{
 const {speakingPractice,speakingEvaluation}=await import('./fixtures/speaking-practice-fixture.mjs');
 const calls=[];let solveCalls=0;
 class Recorder{
  state='inactive';mimeType='audio/webm';constructor(stream){this.stream=stream;}
  start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['synthetic-audio'],{type:this.mimeType})});this.onstop?.();});}
 }
 globalThis.MediaRecorder=Recorder;
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})}});
 const oldCreate=URL.createObjectURL,oldRevoke=URL.revokeObjectURL;
 URL.createObjectURL=()=>`blob:synthetic`;URL.revokeObjectURL=()=>{};
 window.HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'));};
 class Audio{async unlockFromUserGesture(){return true;}async playCue(){}async destroy(){}}
 const {default:Speaking}=await loadOfflineComponent('src/pages/speaking-practice/SpeakingPracticeTest.tsx',{
  ...mocks,
  '@/utils/examAudio':{ExamAudioController:Audio},
  '@/hooks/use-access-link':{useOwnedAccessContext:()=>({accessContextId:'public-context',forRun:()=>({accessContextId:'public-context'})}),readAccessOwner:()=>sessionStorage.getItem('userId')},
  '@/services/speakingPractice.service':{default:{solve:async()=>{solveCalls++;return structuredClone(speakingPractice);},evaluate:async(...args)=>{calls.push(args);if(args[3].accessContextId==='public-context')throw{response:{status:402,data:{message:'AI_LIMIT'}}};return structuredClone(speakingEvaluation);}}},
 });
 function Harness(){return React.createElement(Routes,null,React.createElement(Route,{path:'/app/pratik/konusma/:id',element:React.createElement(Speaking)}));}
 const view=await setup(Harness,{},'/app/pratik/konusma/speaking-practice-1');
 const click=async label=>act(async()=>view.container.querySelector(`button[aria-label="${label}"]`).click());
 try{
  for(let i=0;i<2;i++){await click('Kaydı başlat');await click('Kaydı bitir');if(!i)await click('Sonraki soru');}
  const heading=view.container.querySelector('h2').textContent;
  await act(async()=>button('Değerlendir').click());await flush();
  assert.ok(button('Üyeliğimle devam et'));assert.equal(calls.length,1);
  await act(async()=>button('Üyeliğimle devam et').click());
  assert.equal(solveCalls,1);assert.equal(view.container.querySelector('h2').textContent,heading);assert.equal(calls.length,1);
  await act(async()=>button('Değerlendir').click());
  assert.notEqual(calls[1][1],calls[0][1]);assert.equal(calls[1][3].accessContextId,'paid-context');
  assert.equal(calls[1][2][0].blob,calls[0][2][0].blob);assert.equal(calls[1][2][1].blob,calls[0][2][1].blob);
 }finally{await view.unmount();URL.createObjectURL=oldCreate;URL.revokeObjectURL=oldRevoke;}
});

test('reopening an expired public Writing draft requires explicit PAID before content retry and keeps the stored draft',async()=>{
 let solveInputs=[]; const recoveredSubmits=[];
 const {default:ExpiredWriting}=await loadOfflineComponent('src/pages/writing-practice/WritingPracticeTest.tsx',{
  ...mocks,
  '@/hooks/use-access-link':{useOwnedAccessContext:()=>({accessContextId:'expired-public',forRun:()=>({accessContextId:'expired-public'})}),readAccessOwner:()=>sessionStorage.getItem('userId')},
  '@/services/writingPractice.service':{default:{solve:async(id,input)=>{solveInputs.push(input.accessContextId);if(input.accessContextId==='expired-public')throw{response:{status:402,data:{message:'ACCESS_EXPIRED'}}};return structuredClone(writingPractice);},getEvaluation:async()=>({status:'FAILED',result:null}),evaluate:async(...args)=>{recoveredSubmits.push(args);return structuredClone(writingEvaluation);}}},
 });
 function Harness(){return React.createElement(Routes,null,React.createElement(Route,{path:'/app/pratik/yazma/:id',element:React.createElement(ExpiredWriting)}));}
 // setup() clears storage, so inject the draft in the wrapper before child mount.
 function SavedHarness(){React.useState(()=>{localStorage.setItem('writing_practice_practice-1',writingAnswer);localStorage.setItem('writing_practice_evaluation_practice-1',JSON.stringify({runId:'rejected-public-run',ownerId:owner,accessContextId:'expired-public',answerText:writingAnswer,context:JSON.stringify({version:writingEvaluation.version,content:writingPractice.content})}));return true;});return React.createElement(Harness);}
 const view=await setup(SavedHarness,{},'/app/pratik/yazma/practice-1');
 try{
  assert.deepEqual(solveInputs,['expired-public']);assert.equal(sessions.length,0);
  assert.equal(localStorage.getItem('writing_practice_practice-1'),writingAnswer);
  assert.ok(button('Üyeliğimle devam et'));
  await act(async()=>button('Üyeliğimle devam et').click());
  assert.deepEqual(solveInputs,['expired-public','paid-context']);
  assert.equal(view.container.querySelector('textarea').value,writingAnswer);
  assert.equal(evaluations.length,0);
  await submit();
  assert.notEqual(recoveredSubmits[0][1],'rejected-public-run');
  assert.equal(recoveredSubmits[0][4].accessContextId,'paid-context');
 }finally{await view.unmount();}
});

for (const savedStatus of ['NONE','FAILED','MISSING','PENDING','COMPLETED','UNKNOWN']) test(`normal direct Writing reopen preserves PUBLIC intent; explicit paid reconciles ${savedStatus} run`,async()=>{
 const oldRun={runId:'old-public-run',ownerId:owner,accessContextId:'expired-public',answerText:writingAnswer,context:JSON.stringify({version:writingEvaluation.version,content:writingPractice.content})};
 const solveInputs=[],submitCalls=[],statusCalls=[],entryCalls=[];
 const localApi={...api,createSession:async(target,input={})=>{entryCalls.push({target,input});return{contextId:input.mode==='PAID'?'chosen-paid':'fresh-auto-paid',decision:{...open,sourceKind:'PAID'}};}};
 const service={list:async()=>[structuredClone(writingPractice)],solve:async(id,input)=>{solveInputs.push(input.accessContextId);if(input.accessContextId==='expired-public')throw{response:{status:402,data:{message:'ACCESS_EXPIRED'}}};return structuredClone(writingPractice);},
  getEvaluation:async(id,runId)=>{statusCalls.push(runId);if(savedStatus==='MISSING')throw{response:{status:404}};if(savedStatus==='UNKNOWN')throw{response:{status:503}};return{status:savedStatus==='NONE'?'FAILED':savedStatus,result:savedStatus==='COMPLETED'?structuredClone(writingEvaluation):null};},
  evaluate:async(...args)=>{submitCalls.push(args);return {...structuredClone(writingEvaluation),answerText:args[2]};}};
 const localMocks={...mocks,'@/services/access.service':{accessService:localApi},'@/services/writingPractice.service':{default:service}};
 const {default:Direct}=await loadOfflineComponent('src/components/practice/PracticeDirectEntry.tsx',localMocks);
 const {default:Body}=await loadOfflineComponent('src/pages/writing-practice/WritingPracticeTest.tsx',localMocks);
 function Harness(){React.useState(()=>{
  localStorage.setItem('writing_practice_practice-1',writingAnswer);
  localStorage.setItem('writing_practice_access_practice-1',JSON.stringify({ownerId:owner,contextId:'expired-public'}));
  localStorage.setItem('practice_duration_writing_practice-1',JSON.stringify({enabled:true,minutes:45,seconds:643}));
  if(savedStatus!=='NONE')localStorage.setItem('writing_practice_evaluation_practice-1',JSON.stringify(oldRun));
  return true;
 });return React.createElement(Routes,null,
   React.createElement(Route,{path:'/app/pratik/yazma/:id',element:React.createElement(Body)}),
   React.createElement(Route,{path:'/app/pratik',element:React.createElement(Direct,{skill:'writing',id:'practice-1',hasActiveMembership:true,membershipPending:false})}));}
 const view=await setup(Harness,{},'/app/pratik?bolum=writing&start=practice-1');
 try{
  assert.equal(entryCalls[0].input.mode,undefined,'Normal direct producer creates a fresh AUTO entry');
  await act(async()=>button('Pratiğe başla / devam et').click());await flush();
  assert.deepEqual(solveInputs,['expired-public'],'The saved draft source wins before protected Solve');
  assert.equal(JSON.parse(localStorage.getItem('writing_practice_access_practice-1')).contextId,'expired-public');
  assert.equal(submitCalls.length,0);assert.equal(entryCalls.length,1);
  assert.equal(localStorage.getItem('writing_practice_practice-1'),writingAnswer);
  await act(async()=>button('Üyeliğimle devam et').click());await flush();
  assert.deepEqual(solveInputs,['expired-public','chosen-paid']);
  assert.equal(entryCalls[1].input.mode,'PAID');
  assert.equal(view.container.querySelector('[aria-label="Kalan süre"]').textContent,'10:43');
  if(savedStatus==='COMPLETED'){
   assert.ok(view.container.querySelector('del'));assert.equal(submitCalls.length,0);
  }else{
   assert.equal(view.container.querySelector('textarea').value,writingAnswer);
   await submit();
   if(savedStatus==='NONE'||savedStatus==='FAILED'||savedStatus==='MISSING'){
    assert.notEqual(submitCalls[0][1],oldRun.runId);
    assert.equal(submitCalls[0][4].accessContextId,'chosen-paid');
   }else{
    assert.equal(submitCalls[0][1],oldRun.runId);
    assert.equal(submitCalls[0][4].accessContextId,'expired-public','Accepted/pending or unknown work keeps original source');
   }
  }
  if(savedStatus!=='NONE')assert.ok(statusCalls.includes(oldRun.runId));
 }finally{await view.unmount();}
});

test('a counted purchased Writing Mock can start before its attempt AI allowance is allocated',()=>{
 const target={scope:'MOCK_WRITING',targetId:'purchased'};
 assert.equal(getContentStartIssue([target],[{...open,target,sourceKind:'PURCHASED_PACKAGE',remaining:{},remainingAttempts:1}]),null);
});
