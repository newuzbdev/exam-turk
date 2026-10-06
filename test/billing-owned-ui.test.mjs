import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module,createRequire} from 'node:module';
import {resolve} from 'node:path';
const fixtureRequire=createRequire(import.meta.url);
const {JSDOM}=fixtureRequire(fixtureRequire.resolve('jsdom',{paths:[resolve('../admin')]}));
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
const {QueryClient,QueryClientProvider}=fixtureRequire('@tanstack/react-query');
const {MemoryRouter}=fixtureRequire('react-router-dom');
const filename=resolve('test/billing-owned-fixture.cjs');
const stubs={
 '@/contexts/AuthContext':"export const useAuth=()=>({user:{id:globalThis.__billingOwner},isAuthenticated:true});",
 '@/services/billing.service':"export const billingService={getOwnPurchases:async()=>structuredClone(globalThis.__billingOwned[globalThis.__billingOwner])};"
};
const bundle=await build({stdin:{contents:"export {default as Purchased} from '../src/pages/profile/purchased-packages';",resolveDir:resolve('test'),sourcefile:filename,loader:'ts'},bundle:true,platform:'node',format:'cjs',packages:'external',jsx:'automatic',write:false,plugins:[{name:'owned-boundary',setup(b){b.onResolve({filter:/.*/},a=>a.path in stubs?{path:a.path,namespace:'stub'}:null);b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:stubs[a.path],loader:'js'}));}}]});
const compiled=new Module(filename);compiled.require=createRequire(filename);compiled._compile(bundle.outputFiles[0].text,filename);
test('owned UI refreshes consumed counters and never displays another account’s purchases',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'https://fixture.invalid'});
 const originals=new Map();for(const key of ['window','document','HTMLElement','IS_REACT_ACT_ENVIRONMENT']){originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value:key==='IS_REACT_ACT_ENVIRONMENT'?true:dom.window[key],configurable:true,writable:true});}
 const purchase=(name,n)=>({purchaseId:name,status:'ACTIVE',endsAt:'2026-11-06T00:00:00Z',remainingPractice:n,snapshot:{terms:{name,kind:'PRACTICE_PASS',attemptLimit:0,lessonIds:[]}}});
 globalThis.__billingOwner='A';globalThis.__billingOwned={A:[purchase('A Writing',49)],B:[purchase('B Writing',7)]};
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});const container=document.getElementById('root'),root=createRoot(container);
 const render=()=>root.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(compiled.exports.Purchased))));
 const settled=async()=>{await act(async()=>{await new Promise(r=>setTimeout(r,30));});};
 try{
  await act(async()=>render());await settled();assert.match(container.textContent,/49 Pratik değerlendirmesi/);
  globalThis.__billingOwned.A[0].remainingPractice=48;await act(async()=>window.dispatchEvent(new window.Event('access:allowance-changed')));await settled();assert.match(container.textContent,/48 Pratik değerlendirmesi/);assert.doesNotMatch(container.textContent,/49 Pratik/);
  globalThis.__billingOwner='B';await act(async()=>render());assert.doesNotMatch(container.textContent,/A Writing/);await settled();assert.match(container.textContent,/B Writing/);assert.match(container.textContent,/7 Pratik değerlendirmesi/);
 }finally{await act(async()=>root.unmount());client.clear();dom.window.close();delete globalThis.__billingOwner;delete globalThis.__billingOwned;for(const [k,d]of originals)d?Object.defineProperty(globalThis,k,d):delete globalThis[k];}
});

test('hidden-catalog owned normal and workbook lessons have individual usable routes',async()=>{
 const {renderToStaticMarkup}=await import('react-dom/server');globalThis.__billingOwner='lessons';
 const p={purchaseId:'lesson-pass',status:'ACTIVE',remainingAttempts:0,snapshot:{terms:{name:'Ders Paketi',kind:'LESSON_PACKAGE',attemptLimit:0,lessonIds:['n','w']}},lessons:[{id:'n',title:'Normal Ders',slug:'normal',courseSlug:'b1',workbook:false},{id:'w',title:'Video Ders',slug:'video-slug',courseSlug:'workbooks',workbook:true}]};
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});client.setQueryData(['billing','purchases','lessons'],[p]);
 try{const html=renderToStaticMarkup(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(compiled.exports.Purchased))));assert.match(html,/href="\/app\/dersler\/b1\/normal"/);assert.match(html,/href="\/app\/dersler\/video\/video-slug"/);assert.match(html,/Normal Ders/);}finally{client.clear();delete globalThis.__billingOwner;}
});
