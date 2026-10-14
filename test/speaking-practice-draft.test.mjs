import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { React, Routes, Route, act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';
import { speakingPractice } from './fixtures/speaking-practice-fixture.mjs';
const require = createRequire(import.meta.url);
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
test('speaking practice protects active recording and restores the completed audio draft', async t => {
const tracks = [{ stop() {} }];
Object.defineProperty(navigator,'mediaDevices',{ configurable:true,value:{ getUserMedia:async()=>({getTracks:()=>tracks}) } });
globalThis.MediaRecorder = class {
  constructor(stream){ this.stream=stream;this.state='inactive';this.mimeType='audio/webm'; }
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable?.({data:new Blob(['synthetic audio'])});this.onstop?.();}
};
URL.createObjectURL=()=> 'blob:synthetic-audit';URL.revokeObjectURL=()=>{};
window.HTMLMediaElement.prototype.pause=function(){};
const { default: Speaking } = await loadOfflineComponent('src/pages/speaking-practice/SpeakingPracticeTest.tsx', {
  '@/contexts/AuthContext':{useAuth:()=>({user:{id:'synthetic-owner'},isAuthenticated:true})},
  '@/services/speakingPractice.service':{default:{solve:async()=>structuredClone(speakingPractice),evaluate:async()=>{throw new Error('AI evaluation is outside this audit')}}},
  '@/utils/examAudio':{ExamAudioController:class {async unlockFromUserGesture(){return true}async playCue(){}async destroy(){}}},
  '@/hooks/use-access-link':{ useOwnedAccessContext:()=>({forRun:()=>({})}),readAccessOwner:()=> 'synthetic-owner'},
});
sessionStorage.clear(); sessionStorage.setItem('userId','synthetic-owner');
const client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
function Harness(){return React.createElement(QueryClientProvider,{client},React.createElement(Routes,null,
 React.createElement(Route,{path:'/app/pratik/konusma/:id',element:React.createElement(Speaking)}),
 React.createElement(Route,{path:'/app/pratik',element:React.createElement('div',null,'Pratik')})));}
const options={route:'/app/pratik/konusma/speaking-practice-1',routePattern:'*'};
let view=await mount(Harness,options); t.after(async()=>{await view.unmount();client.clear();});
await act(async()=>view.container.querySelector('[aria-label="Kaydı başlat"]').click());
const activeUnload = new Event('beforeunload',{cancelable:true}); window.dispatchEvent(activeUnload);
assert.equal(activeUnload.defaultPrevented,true,'unfinished recording needs a navigation warning');
await act(async()=>view.container.querySelector('[aria-label="Kaydı bitir"]').click());
const before=view.container.querySelectorAll('[aria-label="Kaydı dinle"]').length;
assert.equal(before,1);
const unload = new Event('beforeunload',{cancelable:true});window.dispatchEvent(unload);
await view.unmount();
view=await mount(Harness,options);
const after=view.container.querySelectorAll('[aria-label="Kaydı dinle"]').length;
assert.equal(after,1,'remount must restore the recorded answer');
assert.equal(unload.defaultPrevented,false,'saved recordings do not need a navigation warning');
let finishStop;
MediaRecorder.prototype.stop=function(){this.state='inactive';finishStop=()=>{this.ondataavailable?.({data:new Blob(['second synthetic audio'])});this.onstop?.();};};
await act(async()=>view.container.querySelector('[aria-label="Kaydı başlat"]').click());
await act(async()=>view.container.querySelector('[aria-label="Çalışmadan çık"]').click());
const exit=()=>[...view.container.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent.trim()==='Çık');
await act(async()=>exit().click());
await act(async()=>exit().click());
assert.ok(view.container.querySelector('[data-section-code]'),'repeated exit confirmation must wait for the recorder to finish');
await act(async()=>{finishStop(); await new Promise(resolve=>setTimeout(resolve,20));});
await view.unmount();
view=await mount(Harness,options);
assert.equal(view.container.querySelectorAll('[aria-label="Kaydı dinle"]').length,1,'exit waits until the replacement recording is stored');
const {loadSpeakingPracticeDraft,speakingPracticeDraftScope}=await loadOfflineComponent('src/services/speakingPracticeDraft.store.ts');
const saved=await loadSpeakingPracticeDraft(speakingPracticeDraftScope('synthetic-owner','speaking-practice-1',undefined,['question-1','question-2']));
assert.equal(await saved.recordings['question-1'].blob.text(),'second synthetic audio');
const storagePrototype=Object.getPrototypeOf(sessionStorage);
const originalSet=storagePrototype.setItem;
t.after(()=>{storagePrototype.setItem=originalSet;});
MediaRecorder.prototype.stop=function(){this.state='inactive';this.ondataavailable?.({data:new Blob(['unsaved synthetic audio'])});this.onstop?.();};
storagePrototype.setItem=()=>{throw new Error('Synthetic quota exceeded');};
await act(async()=>view.container.querySelector('[aria-label="Kaydı başlat"]').click());
await act(async()=>view.container.querySelector('[aria-label="Kaydı bitir"]').click());
const failedUnload=new Event('beforeunload',{cancelable:true});window.dispatchEvent(failedUnload);
assert.equal(failedUnload.defaultPrevented,true,'a failed storage write keeps navigation protection enabled');
storagePrototype.setItem=originalSet;




});
