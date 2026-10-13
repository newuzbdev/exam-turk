import test from 'node:test';import assert from 'node:assert/strict';import {loadOfflineComponent} from './helpers/offline-react.mjs';
const {captureSignupAttribution,readSignupAttribution,clearSignupAttribution}=await loadOfflineComponent('src/utils/signup-attribution.ts');
const now=new Date('2026-10-13T06:00:00Z');
test('ad link source survives OAuth redirect; never stores full URLs, credentials, query secrets or fragments',()=>{
 localStorage.clear();sessionStorage.clear();captureSignupAttribution('https://turkishmock.uz/?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch_01&token=private#secret','',now);
 captureSignupAttribution('https://turkishmock.uz/oauth-callback?accessToken=private','https://accounts.google.com/',new Date(+now+60000));
 assert.deepEqual(readSignupAttribution(now),{source:'INSTAGRAM',medium:'PAID',campaign:'launch_01'});assert.doesNotMatch(localStorage.getItem('signup-attribution:v1'),/private|secret|https|token/);
 clearSignupAttribution();assert.equal(localStorage.getItem('signup-attribution:v1'),null);
});
test('first touch is immutable for a day; unknown origins stay unknown, signed-in or private pages do not create attribution',()=>{
 localStorage.clear();sessionStorage.clear();captureSignupAttribution('https://turkishmock.uz/','https://t.me/channel',now);captureSignupAttribution('https://turkishmock.uz/?utm_source=instagram','',new Date(+now+60000));assert.equal(readSignupAttribution(now).source,'TELEGRAM');
 captureSignupAttribution('https://turkishmock.uz/','',new Date(+now+86400001));assert.deepEqual(readSignupAttribution(new Date(+now+86400001)),{source:'UNKNOWN',medium:'UNKNOWN'});
 clearSignupAttribution();sessionStorage.setItem('userId','existing');captureSignupAttribution('https://turkishmock.uz/?utm_source=telegram','',now);assert.equal(localStorage.getItem('signup-attribution:v1'),null);
 sessionStorage.clear();captureSignupAttribution('https://turkishmock.uz/app/profil?utm_source=telegram','',now);assert.equal(localStorage.getItem('signup-attribution:v1'),null);
});
test('invalid campaign strings and lookalike referral domains do not become trusted labels',()=>{
 localStorage.clear();captureSignupAttribution('https://turkishmock.uz/?utm_source=instagram&utm_campaign=%3Cscript%3E','',now);assert.equal(readSignupAttribution(now).campaign,undefined);
 clearSignupAttribution();captureSignupAttribution('https://turkishmock.uz/','https://instagram.com.attacker.test/',now);assert.equal(readSignupAttribution(now).source,'OTHER');
});
test('OAuth, Gmail and internal navigation are not classified as Google search',()=>{
 sessionStorage.clear();
 for (const [referrer,expected] of [
  ['https://accounts.google.com/','UNKNOWN'],
  ['https://oauth2.googleapis.com/','UNKNOWN'],
  ['https://mail.google.com/','OTHER'],
  ['https://turkishmock.uz/','UNKNOWN'],
  ['https://www.google.com/search?q=turkishmock','GOOGLE'],
 ]) {
  clearSignupAttribution();captureSignupAttribution('https://turkishmock.uz/login',referrer,now);
  assert.equal(readSignupAttribution(now).source,expected);
 }
});
