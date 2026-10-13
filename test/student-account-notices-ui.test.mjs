import test from 'node:test';
import assert from 'node:assert/strict';
import { React,act,deferred,fakeWindowClock,loadOfflineComponent,mount } from './helpers/offline-react.mjs';
let owner='a',enabled=true,reply=()=>Promise.resolve([]),calls=[],rerender;
const {default:Updates}=await loadOfflineComponent('src/components/account-updates/student-account-updates.tsx',{
 '@/services/accountUpdates.service':{getOwnAccountUpdates(id,signal){calls.push({id,signal});return reply();}},
});
function Entry(){rerender=React.useState(0)[1];return React.createElement(Updates,{userId:owner,enabled});}
const notice=(id='n')=>({id,occurredAt:'2026-10-13T05:00:00Z',title:'3 Yazma Mock hakkı eklendi',body:'Özel yönetici notu içermez'});
function reset(){localStorage.clear();sessionStorage.setItem('userId','a');owner='a';enabled=true;calls=[];Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});}
test('student sees and dismisses own message, with seen ids scoped to that account',async()=>{
 reset();reply=()=>Promise.resolve([notice()]);const clock=fakeWindowClock(),view=await mount(Entry);
 try{assert.match(view.container.textContent,/3 Yazma Mock/);assert.equal(view.container.querySelector('aside').getAttribute('role'),'status');
 await act(async()=>view.container.querySelector('[aria-label="Hesap bildirimini kapat"]').click());assert.equal(view.container.querySelector('aside'),null);
 await clock.advance(30000);assert.equal(view.container.querySelector('aside'),null);
 owner='b';sessionStorage.setItem('userId','b');await act(async()=>rerender(n=>n+1));assert.match(view.container.textContent,/3 Yazma Mock/);
 }finally{await view.unmount();clock.restore();}
});
test('paused during exams/hidden tabs, messages remain unread until a normal page is shown',async()=>{
 reset();enabled=false;reply=()=>Promise.resolve([notice()]);const clock=fakeWindowClock(),view=await mount(Entry);
 try{assert.equal(calls.length,0);assert.equal(view.container.querySelector('aside'),null);
 enabled=true;await act(async()=>rerender(n=>n+1));assert.match(view.container.textContent,/3 Yazma Mock/);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(view.container.querySelector('aside'),null);
 const before=calls.length;await clock.advance(60000);assert.equal(calls.length,before);
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));assert.match(view.container.textContent,/3 Yazma Mock/);
 }finally{await view.unmount();clock.restore();}
});
test('pending response cannot appear after account change or entering an exam',async()=>{
 for(const change of ['account','exam']) {reset();const pending=deferred();reply=()=>pending.promise;const view=await mount(Entry);const signal=calls[0].signal;
 try {if(change==='account'){owner='b';sessionStorage.setItem('userId','b');reply=()=>Promise.resolve([]);}else enabled=false;
 await act(async()=>rerender(n=>n+1));assert.equal(signal.aborted,true);
 await act(async()=>pending.resolve([notice('private-old')]));assert.doesNotMatch(view.container.textContent,/3 Yazma Mock/);
 }finally{await view.unmount();}}
});
