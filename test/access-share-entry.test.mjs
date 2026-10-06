import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { prepareAccessEntry } from '../src/utils/access-link-entry.ts';

const target = {scope:'PRACTICE_WRITING',targetId:'one'};
test('redeem success creates an owned Practice context and never starts a timer or AI', async () => {
  const calls=[];
  const api={ getConfig:async()=>({enabled:true}), redeemShare:async()=>{calls.push('redeem');return {redemptionId:'r',target,endsAt:'later'};},createSession:async(t,input)=>{calls.push({t,input});return {contextId:'c',decision:{canOpen:true}};} };
  const result=await prepareAccessEntry(api,target,'a'.repeat(43));
  assert.equal(result.contextId,'c');assert.equal(result.target.targetId,'one');
  assert.deepEqual(calls,['redeem',{t:target,input:{shareRedemptionId:'r'}}]);
});
test('Mock single share uses actual returned target and defers immutable selection to explicit start', async()=>{
  let sessions=0;
  const actual={scope:'MOCK_WRITING',targetId:'actual-not-first'};
  const result=await prepareAccessEntry({getConfig:async()=>({enabled:true}),getDecisions:async()=>[{canOpen:true,shareTarget:actual}],redeemShare:async()=>({redemptionId:'r',target:actual}),createSession:async()=>{sessions++;}}, {scope:'MOCK_PACKAGE',targetId:'package'},'a'.repeat(43));
  assert.deepEqual(result.target,actual);assert.equal(sessions,0);
});
test('mismatched Practice target rejected; disabled flag never calls new table endpoints',async()=>{
  await assert.rejects(prepareAccessEntry({getConfig:async()=>({enabled:true}),redeemShare:async()=>({redemptionId:'r',target:{...target,targetId:'other'}})},target,'a'.repeat(43)));
  const disabled=await prepareAccessEntry({getConfig:async()=>({enabled:false}),redeemShare:()=>{throw Error('must not call');}},target,null);
  assert.equal(disabled.enabled,false);
  await assert.rejects(prepareAccessEntry({getConfig:async()=>({enabled:false})},target,'a'.repeat(43)),/ACCESS_SHARE_FEATURE_DISABLED/);
  await assert.rejects(prepareAccessEntry({getConfig:async()=>({enabled:false})},target,null,{redemptionId:'r',target}),/ACCESS_SHARE_FEATURE_DISABLED/);
});

// Real React/router surfaces with only synthetic service adapters.
const { React, act, deferred, loadOfflineComponent, mount } = await import('./helpers/offline-react.mjs');
globalThis.DocumentFragment = window.DocumentFragment;
const { captureAccessLink, readPendingShareForTarget, readOwnedAccess } = await import('../src/utils/access-link-context.ts');
let redeem = async () => ({ redemptionId: 'redemption', target, endsAt: 'later' });
let contextCalls = [], readingStarts = 0;
let verifiedShareTarget;
const api = { getDecisions: async targets => targets.map(target => ({target,canOpen:true,shareTarget:verifiedShareTarget,sourceKind:"SHARE",remaining:{MOCK_WRITING:1,MOCK_SPEAKING:1}})), getConfig: async () => ({ enabled: true }), redeemShare: async (...args) => {const result=await redeem(...args);verifiedShareTarget=result.target;return result;}, createSession: async (actual,input) => { contextCalls.push({actual,input}); return {contextId:'owned-context',decision:{canOpen:true}}; } };
const practiceMocks = {
  '@/contexts/AuthContext': { useAuth: () => ({isAuthenticated:true,user:{id:'offline-user'}}) },
  '@/services/access.service': { accessService: api },
  '@/services/readingPractice.service': { readingPracticeService: {getPreview:async()=>({title:'Okuma hedefi',isFreeAccess:false}),start:async(id,input)=>{readingStarts++;assert.equal(input.accessContextId,'owned-context');return {attemptId:'owned-attempt'};} } },
  ...Object.fromEntries(['listening','writing','speaking'].map(skill => [`@/services/${skill}Practice.service`,{default:{list:async()=>[{id:'one',title:`${skill} hedefi`,isFreeAccess:false}]}}])),
};
const { default: DirectEntry } = await loadOfflineComponent('src/components/practice/PracticeDirectEntry.tsx',practiceMocks);
const { useLocation } = await import('react-router-dom');
function DirectHarness(props) {
  const location = useLocation();
  return React.createElement(React.Fragment,null,React.createElement('output',{'data-route':true},location.pathname+location.search),React.createElement(DirectEntry,props));
}
function setupShare(skill) {
  sessionStorage.clear();localStorage.clear();sessionStorage.setItem('userId','offline-user');contextCalls=[];readingStarts=0;
  const actual={scope:`PRACTICE_${skill.toUpperCase()}`,targetId:'one'};
  captureAccessLink(`/app/pratik?bolum=${skill}&start=one&share=${'a'.repeat(43)}`);
  redeem=async()=>({redemptionId:'redemption',target:actual,endsAt:'later'});
  return actual;
}
for(const skill of ['reading','listening','writing','speaking']) test(`${skill} direct share validates, keeps target, and waits for an explicit click`,async()=>{
  setupShare(skill);
  const view=await mount(DirectHarness,{props:{skill,id:'one',hasActiveMembership:false,membershipPending:false},route:`/app/pratik?bolum=${skill}&start=one`});
  try {
    assert.equal(contextCalls.length,1);assert.equal(readingStarts,0);
    assert.equal(readPendingShareForTarget({scope:`PRACTICE_${skill.toUpperCase()}`,targetId:'one'}),null);
    const route=()=>view.container.querySelector('[data-route]').textContent;
    assert.equal(route(),`/app/pratik?bolum=${skill}&start=one`);
    assert.equal(view.container.querySelector('button').disabled,false);
    await act(async()=>view.container.querySelector('button').click());
    assert.match(route(),new RegExp(`/app/pratik/${{reading:'okuma',listening:'dinleme',writing:'yazma',speaking:'konusma'}[skill]}/one`));
    assert.equal(readingStarts,skill==='reading'?1:0);
  } finally {await view.unmount();}
});
test('transient redeem remains retryable; invalid link is scrubbed and shows exact catalog-return message',async()=>{
  const actual=setupShare('writing');
  redeem=async()=>{throw {response:{status:503}};};
  const view=await mount(DirectHarness,{props:{skill:'writing',id:'one',hasActiveMembership:false,membershipPending:false},route:'/app/pratik?bolum=writing&start=one'});
  try {
    assert.equal(readPendingShareForTarget(actual)?.length,43);assert.equal(contextCalls.length,0);
    redeem=async()=>{throw {response:{status:400}};};
    await act(async()=>[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Tekrar dene').click());
    assert.equal(readPendingShareForTarget(actual),null);
    assert.match(view.container.textContent,/Bu bağlantının süresi dolmuş veya erişime kapatılmış\./);
    assert.equal(view.container.querySelector('[data-route]').textContent,'/app/pratik?bolum=writing&start=one');
    await act(async()=>[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Kataloğa dön').click());
    assert.equal(view.container.querySelector('[data-route]').textContent,'/app/pratik?bolum=writing');
  } finally {await view.unmount();}
});
test('redeem success clears secret even if context creation fails; retry uses verified redemption',async()=>{
  const actual=setupShare('writing');
  const create=api.createSession;let redemptions=0;
  redeem=async()=>{redemptions++;return {redemptionId:'redemption',target:actual};};
  api.createSession=async()=>{throw {response:{status:503}};};
  const view=await mount(DirectHarness,{props:{skill:'writing',id:'one',hasActiveMembership:false,membershipPending:false},route:'/app/pratik?bolum=writing&start=one'});
  try {
    assert.equal(readPendingShareForTarget(actual),null);assert.equal(readOwnedAccess('offline-user',actual).redemptionId,'redemption');
    api.createSession=create;
    await act(async()=>[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Tekrar dene').click());
    assert.equal(redemptions,1);assert.equal(readOwnedAccess('offline-user',actual).contextId,'owned-context');
  } finally {api.createSession=create;await view.unmount();}
});
test('a second campaign for the same target supersedes the pending validation without an automatic start',async()=>{
  const actual=setupShare('writing');const first=deferred();let redemptions=0;
  redeem=async()=>{redemptions++;return redemptions===1?first.promise:{redemptionId:'second-redemption',target:actual};};
  const view=await mount(DirectHarness,{props:{skill:'writing',id:'one',hasActiveMembership:false,membershipPending:false},route:'/app/pratik?bolum=writing&start=one'});
  try{
    await act(async()=>captureAccessLink(`/app/pratik?bolum=writing&start=one&share=${'b'.repeat(43)}`));
    await act(async()=>first.resolve({redemptionId:'first-redemption',target:actual}));
    assert.equal(readOwnedAccess('offline-user',actual).redemptionId,'second-redemption');
    assert.equal(contextCalls.length,1);assert.equal(readingStarts,0);
  }finally{await view.unmount();}
});
test('another target never redeems the stored token; account change cannot save an in-flight context',async()=>{
  const actual=setupShare('writing');let redemptions=0;const pending=deferred();
  redeem=async()=>{redemptions++;return pending.promise;};
  const other=await mount(DirectHarness,{props:{skill:'writing',id:'other',hasActiveMembership:false,membershipPending:false},route:'/app/pratik?bolum=writing&start=other'});
  assert.equal(redemptions,0);await other.unmount();
  contextCalls=[];
  const view=await mount(DirectHarness,{props:{skill:'writing',id:'one',hasActiveMembership:false,membershipPending:false},route:'/app/pratik?bolum=writing&start=one'});
  try {
    sessionStorage.setItem('userId','another-user');
    await act(async()=>pending.resolve({redemptionId:'redemption',target:actual}));
    assert.equal(contextCalls.length,0);
    assert.equal(readOwnedAccess('offline-user',actual),null);assert.equal(readOwnedAccess('another-user',actual),null);
  } finally {await view.unmount();}
});
test('OAuth stays static, referrer/meta safe, direct entry has no auto start or evaluation',()=>{
  const login=readFileSync('src/pages/auth/login.tsx','utf8');
  assert.match(login,/callbackUrl = `\$\{window.location.origin\}\/oauth-callback`/);
  assert.doesNotMatch(login,/callbackUrl.*share/);
  assert.match(readFileSync('index.html','utf8'),/name="referrer" content="no-referrer"/);
  const hook=readFileSync('src/hooks/use-access-link.ts','utf8');
  assert.doesNotMatch(hook,/\.evaluate\(|\.start\(|startTimer/);
  const nginx=readFileSync('deploy/nginx.conf','utf8');
  assert.match(nginx,/log_format access_safe/);
  assert.doesNotMatch(nginx,/\$request(?:\s|"|')|\$request_uri|\$args|\$http_referer/);
  const startup=readFileSync('src/main.tsx','utf8');
  assert.ok(startup.indexOf('captureAccessLink(window.location)')<startup.indexOf('createRoot(document'));
});

test('Mock direct share opens the actual returned test even when another same-skill child is first',async()=>{
  sessionStorage.clear();sessionStorage.setItem('userId','offline-user');contextCalls=[];
  captureAccessLink(`/app/test?package=package-one&skills=writing,speaking&share=${'a'.repeat(43)}`);
  redeem=async()=>({redemptionId:'r',target:{scope:'MOCK_WRITING',targetId:'actual-child'},endsAt:'later'});
  let modalProps;
  const catalog={ieltsData:[{id:'package-one',title:'Paket',category:'CEFR_MOCK',createdAt:'now'}],readingTests:[],listeningTests:[],speakingTests:[{id:'speaking-child',ieltsId:'package-one'}],writingTests:[{id:'wrong-first',ieltsId:'package-one'},{id:'actual-child',ieltsId:'package-one'}]};
  const {default: TestPage}=await loadOfflineComponent('src/pages/test/test.tsx',{
    '@/contexts/AuthContext':practiceMocks['@/contexts/AuthContext'],
    '@/services/access.service':{accessService:api},
    '@/config/api':{default:{get:async()=>({data:catalog})}},
    '@/services/auth.service':{authService:{getStoredTokens:()=>({})}},
    '@/services/subscription.service':{subscriptionStatusQueryKey:['subscription','status'],subscriptionService:{getStatus:async()=>({isActive:false})}},
    '@/services/overallTest.service':{overallTestService:{getCurrentSession:async()=>null},overallTestFlowStore:{clear(){},hasActive:()=>false,getQueue:()=>[],getPendingNextSection:()=>null}},
    './components/TestModal':{default:props=>{if(props.open)modalProps=props;return null;}},
  });
  const {createRequire}=await import('node:module');
  const {QueryClient,QueryClientProvider}=createRequire(import.meta.url)('@tanstack/react-query');
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
  const Harness=()=>React.createElement(QueryClientProvider,{client},React.createElement(TestPage,{workspaceMode:true}));
  const view=await mount(Harness,{route:'/app/test?package=package-one&skills=writing,speaking'});
  try {
    assert.equal(modalProps.singleSkill,'writing');assert.deepEqual(modalProps.initialSelectedSkills,['writing']);
    assert.deepEqual(modalProps.writingTests.map(t=>t.id),['actual-child']);assert.deepEqual(modalProps.speakingTests,[]);
    assert.equal(modalProps.accessEntry.ownerId,'offline-user');assert.equal(contextCalls.length,0);
  }finally{await view.unmount();client.clear();}
});
test('Mock context is created only by explicit confirmation with exact published selection and owned pointer',async()=>{
  sessionStorage.clear();sessionStorage.setItem('userId','offline-user');contextCalls=[];
  let starts=[];
  const {default: Modal}=await loadOfflineComponent('src/pages/test/components/TestModal.tsx',{
    '@/contexts/AuthContext':{useAuth:()=>({isAuthenticated:true,user:{id:'offline-user',coin:0},refreshUser:async()=>{}})},
    '@/services/access.service':{accessService:api},
    '@/hooks/use-student-action':{useStudentAction:()=>()=>{}},
    '@/components/payme/PaymeCheckoutModal':{default:()=>null},
    '@/config/billing':{isSubscriptionBillingEnabled:false},
    '@/services/testCoinPrice.service':{default:{getAll:async()=>[{testType:'WRITING',coin:99}]}},
    '@/services/overallTest.service':{default:{getCurrentSession:async()=>null,start:async payload=>{starts.push(payload);return null;}},overallTestTokenStore:{},overallTestFlowStore:{getQueue:()=>[],getPendingNextSection:()=>null,clear(){}}},
    './TestConfirmationModal':{default:props=>props.open?React.createElement('button',{onClick:props.onConfirm},'Hazırım'):null},
  });
  const props={open:true,onOpenChange(){},workspaceMode:true,selectedTest:{id:'package',title:'Paket'},singleSkill:'writing',initialSelectedSkills:['writing'],writingTests:[{id:'actual-child'}],readingTests:[],listeningTests:[],speakingTests:[],accessEntry:{enabled:true,ownerId:'offline-user',target:{scope:'MOCK_WRITING',targetId:'actual-child'},redemptionId:'r'}};
  const {createRequire}=await import('node:module');
  const {QueryClient,QueryClientProvider}=createRequire(import.meta.url)('@tanstack/react-query');
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  const Harness=()=>React.createElement(QueryClientProvider,{client},React.createElement(Modal,props));
  const view=await mount(Harness,{route:'/app/test'});
  try{
    assert.equal(contextCalls.length,0);assert.equal(starts.length,0);
    await act(async()=>[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Hazırım').click());
    assert.deepEqual(contextCalls,[{actual:props.accessEntry.target,input:{shareRedemptionId:'r'}}]);
    assert.equal(starts[0].writingId,'actual-child');assert.equal(starts[0].accessContextId,'owned-context');
  }finally{await view.unmount();}
});
test('access services use exact body-only redeem/session/paid contracts; all Practice pointers reach protected requests',async()=>{
  const requests=[];
  const http={get:async(path,options)=>{requests.push({method:'get',path,options});return {data:{data:path==='/api/access/config'?{enabled:false}:[]}};},post:async(path,body,options)=>{requests.push({method:'post',path,body,options});return {data:{data:{attemptId:'a'}}};}};
  const mocks={'@/config/api':{default:http},'@/services/access.service':{accessService:api}};
  const {accessService:service}=await loadOfflineComponent('src/services/access.service.ts',mocks);
  await Promise.all([service.getConfig(),service.getConfig()]);
  assert.equal(requests.filter(r=>r.path==='/api/access/config').length,1);
  await service.redeemShare('a'.repeat(43));await service.getDecisions([target],undefined,'redemption');await service.getOwnAccess();
  await service.createSession(target,{mode:'PAID'});
  await service.continueMockPaid('overall',{section:'WRITING',accessContextId:'original-context'});
  assert.deepEqual(requests.find(r=>r.path==='/api/access/share/redeem').body,{token:'a'.repeat(43)});
  assert.deepEqual(requests.find(r=>r.path==='/api/access/decisions').body,{targets:[target],shareRedemptionId:'redemption'});
  assert.equal(requests.some(r=>r.path.includes('share=')||r.path.includes('a'.repeat(43))),false);
  assert.deepEqual(requests.find(r=>r.path==='/api/access/sessions').body,{target,mode:'PAID'});
  assert.deepEqual(requests.find(r=>r.path==='/api/access/sessions/mock/overall/paid').body,{section:'WRITING',accessContextId:'original-context'});
  const {readingPracticeService:reading}=await loadOfflineComponent('src/services/readingPractice.service.ts',mocks);
  await reading.start('one',{accessContextId:'c'});
  for(const skill of ['listening','writing','speaking']){
    const {default:s}=await loadOfflineComponent(`src/services/${skill}Practice.service.ts`,mocks);
    await s.solve('one',{accessContextId:'c'});
    if(skill==='listening')await s.check('one',{q:'answer'},{accessContextId:'c'});
    if(skill==='writing')await s.evaluate('one','run','answer',undefined,{accessContextId:'c'});
    if(skill==='speaking')await s.evaluate('one','run',[],{accessContextId:'c'});
  }
  assert.equal(requests.filter(r=>r.path.endsWith('/solve')).every(r=>r.options.params.accessContextId==='c'),true);
  assert.equal(requests.find(r=>r.path==='/api/listening-practice/one/check').body.accessContextId,'c');
  assert.equal(requests.find(r=>r.path==='/api/writing-practice/one/evaluate').body.accessContextId,'c');
  assert.equal(requests.find(r=>r.path==='/api/speaking-practice/one/evaluate').body.get('accessContextId'),'c');
  assert.equal(requests.find(r=>r.path==='/api/reading-practice/one/start')?.body.accessContextId,'c');
});
test('disabled rollout cannot turn a saved context into paid Practice content/start/evaluation requests',async()=>{
  let protectedCalls=0;
  const mocks={'@/config/api':{default:{post:async()=>{protectedCalls++;},get:async()=>{protectedCalls++;}},resolveApiResourceUrl:value=>value},'@/services/access.service':{accessService:{getConfig:async()=>({enabled:false})}}};
  for(const skill of ['listening','writing','speaking']){
    const {default:s}=await loadOfflineComponent(`src/services/${skill}Practice.service.ts`,mocks);
    await assert.rejects(s.solve('one',{accessContextId:'saved-context'}),/Bu erişim şu anda kullanılamıyor/);
    if(skill==='listening')await assert.rejects(s.check('one',{}, {accessContextId:'saved-context'}));
    if(skill==='writing')await assert.rejects(s.evaluate('one','run','draft',undefined,{accessContextId:'saved-context'}));
    if(skill==='speaking')await assert.rejects(s.evaluate('one','run',[],{accessContextId:'saved-context'}));
  }
  const {assertContentAccessEnabled}=await loadOfflineComponent('src/services/access-request-guard.ts',mocks);
  await assert.rejects(assertContentAccessEnabled({accessContextId:'saved-context'}));
  await assertContentAccessEnabled({});
  const {readingPracticeService:reading}=await loadOfflineComponent('src/services/readingPractice.service.ts',mocks);
  assert.equal(await reading.start('one',{accessContextId:'saved-context'}),null);
  const {overallTestService:overall}=await loadOfflineComponent('src/services/overallTest.service.ts',mocks);
  assert.equal(await overall.start({writingId:'one',accessContextId:'saved-context'}),null);
  assert.equal(protectedCalls,0);
});
test('explicit logout discards pending secret and owned IDs while transient failures remain retryable',async()=>{
  const actual=setupShare('writing');
  const {saveOwnedAccess}=await import('../src/utils/access-link-context.ts');
  saveOwnedAccess('offline-user',actual,{contextId:'owned-context',target:actual,redemptionId:'r'});
  const {authService}=await loadOfflineComponent('src/services/auth.service.ts',{'@/config/api':{default:{}}});
  authService.clearStoredTokens();
  assert.equal(readPendingShareForTarget(actual),null);
  assert.equal(readOwnedAccess('offline-user',actual),null);
  assert.equal([...Array(localStorage.length)].some((_,i)=>localStorage.getItem(localStorage.key(i))?.includes('a'.repeat(43))),false);
});

test('saved Mock redemption must receive live approval; expiry/revocation cannot become ready',async()=>{
 const t={scope:'MOCK_PACKAGE',targetId:'package'};let decisions=0;
 for(const blockedReason of ['EXPIRED','MEMBERSHIP_REQUIRED']) await assert.rejects(prepareAccessEntry({getConfig:async()=>({enabled:true}),getDecisions:async(targets,mode,redemptionId)=>{decisions++;assert.deepEqual(targets,[t]);assert.equal(redemptionId,'r');return [{target:t,shareTarget:t,canOpen:false,blockedReason}];},createSession:()=>{throw Error('no selection yet');}},t,null,{target:t,redemptionId:'r'}),/ACCESS_SHARE_CONTEXT_INVALID/);
 assert.equal(decisions,2);
 await assert.rejects(prepareAccessEntry({getConfig:async()=>({enabled:true}),getDecisions:async()=>[{target:t,canOpen:false}]},t,null),/ACCESS_ENTRY_DENIED/);
 await assert.rejects(prepareAccessEntry({getConfig:async()=>({enabled:true}),redeemShare:async()=>({target:{...t,targetId:'other-package'},redemptionId:'r'})},t,'a'.repeat(43)),/ACCESS_SHARE_CONTEXT_INVALID/);
});
let readingRecovery=async()=>({id:'one'});
practiceMocks['@/services/readingPractice.service'].readingPracticeService.getSolveDetail=(...args)=>readingRecovery(...args);
const {default: RecoveryDirectEntry}=await loadOfflineComponent('src/components/practice/PracticeDirectEntry.tsx',practiceMocks);
function RecoveryHarness(){const location=useLocation();return React.createElement(React.Fragment,null,React.createElement('output',{'data-route':true},location.pathname+location.search),React.createElement(RecoveryDirectEntry,{skill:'reading',id:'one',hasActiveMembership:false,membershipPending:false}));}
for(const own of [true,false])test(`ownerless Reading draft is ${own?'server-confirmed and resumed':'preserved when another account cannot recover'}`,async()=>{
 setupShare('reading');const draft={attemptId:'legacy-attempt',answers:{q1:'Original answer'},timerEnabled:true,timerMinutes:37,remainingSeconds:811};localStorage.setItem('reading-practice-progress:one',JSON.stringify(draft));
 let validations=0;readingRecovery=async(id,attemptId)=>{validations++;assert.equal(id,'one');assert.equal(attemptId,'legacy-attempt');return own?{id:'one'}:null;};
 const view=await mount(RecoveryHarness,{route:'/app/pratik?bolum=reading&start=one'});
 try{await act(async()=>view.container.querySelector('button').click());assert.equal(validations,1);assert.equal(readingStarts,0);const saved=JSON.parse(localStorage.getItem('reading-practice-progress:one'));assert.deepEqual(saved.answers,draft.answers);assert.equal(saved.remainingSeconds,811);assert.equal(saved.timerMinutes,37);if(own){assert.match(view.container.querySelector('[data-route]').textContent,/attemptId=legacy-attempt.*sayac=1.*sure=37/);assert.equal(saved.ownerId,'offline-user');}else{assert.match(view.container.textContent,/Taslağınız korunuyor/);assert.equal(saved.ownerId,undefined);assert.match(view.container.querySelector('[data-route]').textContent,/start=one/);}}
 finally{await view.unmount();}
});

test('saved Mock target must agree with current server campaign target even inside the same package',async()=>{
 const target={scope:'MOCK_PACKAGE',targetId:'p'},saved={target:{scope:'MOCK_WRITING',targetId:'counterfeit'},redemptionId:'r'};
 await assert.rejects(prepareAccessEntry({getConfig:async()=>({enabled:true}),getDecisions:async()=>[{canOpen:true,shareTarget:{scope:'MOCK_SPEAKING',targetId:'actual'}}]},target,null,saved),/ACCESS_SHARE_CONTEXT_INVALID/);
});

for(const scenario of ['expired','revoked','no-entitlement','wrong-package'])test(`Mock direct ${scenario} keeps target URL and never opens ready preview`,async()=>{
 sessionStorage.clear();sessionStorage.setItem('userId','offline-user');let modalOpens=0;
 const entry={scope:'MOCK_PACKAGE',targetId:'package-one'};const actual={...entry,targetId:scenario==='wrong-package'?'package-other':'package-one'};
 const {saveOwnedAccess}=await import('../src/utils/access-link-context.ts');
 if(scenario!=='no-entitlement')saveOwnedAccess('offline-user',entry,{target:actual,redemptionId:'r',endsAt:'2000-01-01T00:00:00Z'});
 const catalog={ieltsData:[{id:'package-one',title:'Paket',category:'CEFR_MOCK',createdAt:'now'}],readingTests:[],listeningTests:[],speakingTests:[],writingTests:[{id:'w',ieltsId:'package-one'}]};
 const {default:TestPage}=await loadOfflineComponent('src/pages/test/test.tsx',{
 '@/contexts/AuthContext':practiceMocks['@/contexts/AuthContext'],
 '@/services/access.service':{accessService:{getConfig:async()=>({enabled:true}),getDecisions:async()=>[{target:entry,shareTarget:actual,canOpen:false,blockedReason:scenario==='no-entitlement'?'MEMBERSHIP_REQUIRED':'EXPIRED'}]}},
 '@/config/api':{default:{get:async()=>({data:catalog})}},
 '@/services/auth.service':{authService:{getStoredTokens:()=>({})}},
 '@/services/subscription.service':{subscriptionStatusQueryKey:['subscription','status'],subscriptionService:{getStatus:async()=>({isActive:true})}},
 '@/services/overallTest.service':{overallTestService:{getCurrentSession:async()=>null},overallTestFlowStore:{clear(){},hasActive:()=>false,getQueue:()=>[],getPendingNextSection:()=>null}},
 './components/TestModal':{default:props=>{if(props.open)modalOpens++;return null;}},
 });
 const {createRequire}=await import('node:module');const {QueryClient,QueryClientProvider}=createRequire(import.meta.url)('@tanstack/react-query');
 const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 function Harness(){const location=useLocation();return React.createElement(QueryClientProvider,{client},React.createElement('output',{'data-route':true},location.pathname+location.search),React.createElement(TestPage,{workspaceMode:true}));}
 const view=await mount(Harness,{route:'/app/test?package=package-one'});
 try{assert.equal(modalOpens,0);assert.equal(view.container.querySelector('[data-route]').textContent,'/app/test?package=package-one');assert.match(view.container.textContent,scenario==='no-entitlement'?/Erişiminiz şu anda doğrulanamadı/:/Bu bağlantının süresi dolmuş veya erişime kapatılmış/);}
 finally{await view.unmount();client.clear();}
});
