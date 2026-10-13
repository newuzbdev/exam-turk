import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import { loadOfflineComponent,deferred } from './helpers/offline-react.mjs';
async function fixture(){let transport;const source=await loadOfflineComponent('src/services/accountUpdates.service.ts',{
 axios:{default:{create(options){transport=axios.create(options);return transport;}}},
 '@/config/api':{default:{defaults:{baseURL:'http://offline.invalid'}}},
 '@/utils/authTokenStorage':{readStoredAccessToken:()=>sessionStorage.getItem('accessToken')},
});return {...source,transport};}
test('own notice read captures authentication, never refreshes or mutates accounts, and rejects late data after account replacement',async()=>{
 sessionStorage.setItem('userId','a');sessionStorage.setItem('accessToken','token-a');const {getOwnAccountUpdates,transport}=await fixture();const pending=deferred();let config;
 transport.defaults.adapter=async c=>{config=c;await pending.promise;return {config:c,status:200,statusText:'OK',headers:{},data:{success:true,data:{items:[{id:'event-a',title:'A notice',body:'A body',occurredAt:'2026-10-13T05:00:00Z'}]}}};};
 const response=getOwnAccountUpdates('a',new AbortController().signal);
 const rejected=assert.rejects(response,/Account changed/);
 await Promise.resolve();sessionStorage.setItem('accessToken','token-b');sessionStorage.setItem('userId','b');pending.resolve();await rejected;
 assert.equal(config.method,'get');assert.equal(config.url,'/api/me/account-updates');assert.equal(config.headers.Authorization,'Bearer token-a');assert.equal(config.params,undefined);assert.equal(config.timeout,5000);assert.equal(config.withCredentials,false);
});
test('different owner and aborted calls do not reach the transport',async()=>{
 const {getOwnAccountUpdates,transport}=await fixture();let calls=0;transport.defaults.adapter=()=>{calls++;throw Error('transport unexpectedly reached');};sessionStorage.setItem('userId','b');
 await assert.rejects(()=>getOwnAccountUpdates('a',new AbortController().signal),/Account changed/);
 const aborted=new AbortController();aborted.abort();await assert.rejects(()=>getOwnAccountUpdates('b',aborted.signal),/Account changed/);assert.equal(calls,0);
});
