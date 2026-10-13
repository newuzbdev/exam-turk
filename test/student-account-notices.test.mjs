import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module,createRequire} from 'node:module';
import {resolve} from 'node:path';
const filename=resolve('test/account-notices-fixture.cjs');
const bundle=await build({entryPoints:['src/utils/account-notice-state.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const compiled=new Module(filename);compiled.require=createRequire(filename);compiled._compile(bundle.outputFiles[0].text,filename);
const {accountNoticeState}=compiled.exports;
const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
const item=id=>({id,occurredAt:'2026-10-13T05:00:00Z',title:id,body:'body'});
test('dismissed notice ids belong only to that student and no message body is stored',()=>{
 const a=accountNoticeState('a',storage);assert.equal(a.next([item('update-a')]).id,'update-a');a.dismiss('update-a');
 assert.equal(a.next([item('update-a')]),null);assert.equal(accountNoticeState('b',storage).next([item('update-a')]).id,'update-a');
 assert.doesNotMatch([...store.values()].join(''),/body|occurredAt/);
});
test('only newest unseen notice is shown; dismiss marks its displayed batch without old toast storms',()=>{
 const c=accountNoticeState('c',storage);const rows=[item('new'),item('old')];assert.equal(c.next(rows).id,'new');c.dismiss('new');assert.equal(c.next(rows),null);
 assert.equal(c.next([item('newer'),...rows]).id,'newer');
});
test('broken or unavailable storage does not break dismissal in this session',()=>{
 const denied={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
 const c=accountNoticeState('d',denied);assert.equal(c.next([item('x')]).id,'x');c.dismiss('x');assert.equal(c.next([item('x')]),null);
 store.set('student-account-updates:e','not-json');assert.equal(accountNoticeState('e',storage).next([item('y')]).id,'y');
});
