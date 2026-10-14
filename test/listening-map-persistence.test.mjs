import assert from 'node:assert/strict';
import test from 'node:test';
import { act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';
test('listening mock restores map drawings after switching sections', async t => {
window.HTMLElement.prototype.scrollTo=function(){};
globalThis.DocumentFragment=window.DocumentFragment;
Object.defineProperty(window.HTMLImageElement.prototype,'clientWidth',{get:()=>300});
Object.defineProperty(window.HTMLImageElement.prototype,'clientHeight',{get:()=>200});
const contexts=new WeakMap();
window.HTMLCanvasElement.prototype.getContext=function(){
  if(!contexts.has(this))contexts.set(this,{strokes:0,clearRect(){this.strokes=0},beginPath(){},moveTo(){},lineTo(){},closePath(){},drawImage(other){this.strokes=contexts.get(other)?.strokes??0},stroke(){this.strokes++}});
  return contexts.get(this);
};
const timerMath=await loadOfflineComponent('src/services/overallTest.service.ts');
const content={id:'audit-map',title:'Synthetic map audit',audioUrl:null,parts:[3,4].map(number=>({id:`part-${number}`,number,sections:[{id:`section-${number}`,imageUrl:number===4?'https://synthetic.example.test/map.svg':undefined,questions:[{id:`q-${number}`,number,text:'Synthetic question',type:'MATCHING',answers:[{id:`a-${number}`,variantText:'A',answer:'Synthetic place'}]}]}]}))};
const {default:Listening}=await loadOfflineComponent('src/components/listening-test/ListeningTestDemo.tsx',{
  '@/hooks/use-overall-section-heartbeat':{useOverallSectionHeartbeat(){}},
  '@/services/listeningTest.service':{listeningTestService:{getTestWithFullData:async()=>content},listeningSubmissionService:{getSessionResult:async()=>null,getDraft:async()=>({answers:{}})}},
  '@/services/overallTest.service':{
    createBackendSyncedTimerState:timerMath.createBackendSyncedTimerState,getBackendSyncedRemainingSeconds:timerMath.getBackendSyncedRemainingSeconds,
    getOverallSectionTimerErrorCode:()=>null,getOverallSectionTimerErrorMessage:error=>error.message,
    overallTestTokenStore:{getByTestId:()=> 'synthetic-map-session'},overallTestFlowStore:{getOverallId:()=> 'synthetic-map-attempt',hasActive:()=>true},
    overallTestService:{prepareSectionForTest:async()=>({requiresStart:false,phase:'REVIEW',serverNow:new Date().toISOString(),remainingReviewSeconds:600,remainingSeconds:600})},
  },
});
sessionStorage.setItem('userId','synthetic-map-owner');
let view=await mount(Listening,{props:{testId:'audit-map'}}); t.after(()=>view.unmount());
const click=async name=>act(async()=>[...view.container.querySelectorAll('button')].find(b=>(b.getAttribute('aria-label')||b.textContent.trim())===name).click());
await click('Bölüm 4');await click('Harita üzerinde çiz');
let canvas=view.container.querySelector('canvas');assert.ok(canvas);
const down=new window.MouseEvent('pointerdown',{bubbles:true,cancelable:true,clientX:10,clientY:10});
for(const [key,value] of Object.entries({isPrimary:true,pointerId:1,pointerType:'mouse'}))Object.defineProperty(down,key,{value});
await act(async()=>canvas.dispatchEvent(down));
await act(async()=>canvas.dispatchEvent(new window.MouseEvent('pointerup',{bubbles:true})));
const before=contexts.get(canvas)?.strokes;assert.ok(before>0);
await click('Bölüm 3');await click('Bölüm 4');
canvas=view.container.querySelector('canvas');
const after=contexts.get(canvas)?.strokes;
assert.equal(after,before,'returning to part 4 must restore the drawing');
await view.unmount();
view=await mount(Listening,{props:{testId:'audit-map'}});
await click('Bölüm 4');
assert.equal(contexts.get(view.container.querySelector('canvas'))?.strokes,1,'the same mock session restores drawings after reload');



});
