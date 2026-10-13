import test from 'node:test';import assert from 'node:assert/strict';import axios from 'axios';
import {React,act,deferred,fakeWindowClock,loadOfflineComponent,mount} from './helpers/offline-react.mjs';
let auth,request,clearCount,rerender;const source={source:'INSTAGRAM',medium:'PAID',campaign:'launch_01'};
const {default:Capture}=await loadOfflineComponent('src/components/account-updates/signup-origin-capture.tsx',{
 '@/contexts/AuthContext':{useAuth:()=>auth},
 '@/utils/studentAgeEligibility':{hasAdultDeclaration:user=>user?.ageStatus==='ADULT_DECLARED'},
 '@/utils/signup-attribution':{readSignupAttribution:()=>source,clearSignupAttribution:()=>{clearCount++;}},
 '@/services/signupOrigin.service':{captureOwnSignupOrigin:(...args)=>request(...args)},
},{env:{VITE_ADMIN_LAUNCH_FEATURES_ENABLED:'true'}});
function Entry(){rerender=React.useState(0)[1];return React.createElement(Capture);}
function reset(){auth={isAuthenticated:true,user:{id:'a',role:'USER',ageStatus:'ADULT_DECLARED'}};clearCount=0;sessionStorage.setItem('userId','a');Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});}
test('only declared adult students submit; retry is bounded and success clears anonymous data once',async()=>{
 reset();let calls=0;request=async()=>{calls++;if(calls<3) throw Error('offline');return true;};const clock=fakeWindowClock(),view=await mount(Entry);
 try{assert.equal(calls,1);await clock.advance(15000);assert.equal(calls,2);await clock.advance(15000);assert.equal(calls,3);assert.equal(clearCount,1);await clock.advance(120000);assert.equal(calls,3);}finally{await view.unmount();clock.restore();}
 for(const user of [{id:'a',role:'ADMIN',ageStatus:'ADULT_DECLARED'},{id:'a',role:'USER',ageStatus:'UNKNOWN'}]){reset();auth.user=user;request=()=>{throw Error('must not send')};const denied=await mount(Entry);await denied.unmount();}
});
test('account switch aborts an old capture and its late response cannot clear the new browser context',async()=>{
 reset();const pending=deferred();let signal;request=(_id,_source,s)=>{signal=s;return pending.promise;};const view=await mount(Entry);
 try{const oldSignal=signal;auth={isAuthenticated:true,user:{id:'b',role:'USER',ageStatus:'ADULT_DECLARED'}};sessionStorage.setItem('userId','b');request=async()=>false;await act(async()=>rerender(n=>n+1));assert.equal(oldSignal.aborted,true);assert.equal(clearCount,1);await act(async()=>pending.resolve(true));assert.equal(clearCount,1);}finally{await view.unmount();}
});
test('actual metadata transport sends only allowed labels with captured credentials and rejects owner replacement',async()=>{
 reset();sessionStorage.setItem('accessToken','token-a');let transport;
 const {captureOwnSignupOrigin}=await loadOfflineComponent('src/services/signupOrigin.service.ts',{
 axios:{default:{create(options){transport=axios.create(options);return transport;}}},'@/config/api':{default:{defaults:{baseURL:'http://offline.invalid'}}},'@/utils/authTokenStorage':{readStoredAccessToken:()=>sessionStorage.getItem('accessToken')},
 });
 const pending=deferred();let config;transport.defaults.adapter=async c=>{config=c;await pending.promise;return {status:200,statusText:'OK',config:c,headers:{},data:{success:true,data:{recorded:true}}};};
 const response=captureOwnSignupOrigin('a',{...source,userId:'other',city:'private',ip:'192.0.2.1'},new AbortController().signal);const rejection=assert.rejects(response,/Account changed/);await Promise.resolve();sessionStorage.setItem('userId','b');sessionStorage.setItem('accessToken','token-b');pending.resolve();await rejection;
 assert.equal(config.headers.Authorization,'Bearer token-a');assert.deepEqual(JSON.parse(config.data),source);assert.equal(config.url,'/api/me/registration-origin');assert.equal(config.timeout,5000);assert.equal(config.withCredentials,false);
});
