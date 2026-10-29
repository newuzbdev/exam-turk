// Synthetic account + Axios adapters only: this fixture never contacts the live API.
import React from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {BrowserRouter,Routes,Route,Link} from 'react-router';
import axios, {AxiosError} from 'axios';
import api from '../../../src/config/api';
import {AuthProvider,useAuth} from '../../../src/contexts/AuthContext';
import RequireStudentAuth from '../../../src/components/auth/require-student-auth';
import {GuestOnly} from '../../../src/routes/student-route-guards';
let mode='offline';
const expired=`fixture.${btoa(JSON.stringify({id:'offline-student',exp:1}))}.signature`;
for(const storage of [localStorage,sessionStorage]) {
 storage.setItem('accessToken',expired);storage.setItem('refreshToken','offline-refresh');
 storage.setItem('writing_answers_fixture','Saved fixture answer');
}
const user={id:'offline-student',name:'Deneme Öğrencisi',ageStatus:'ADULT_DECLARED',ageDeclaredAt:'2026-10-01',ageDeclarationVersion:'adult-self-declaration-2026-10-10-v2'};
const reply=(config:any,data:any)=>({config,data,status:200,statusText:'OK',headers:{}});
api.defaults.adapter=async config=>{
 if(mode==='offline')throw new AxiosError('Network Error','ERR_NETWORK',config);
 if(mode==='expired')throw new AxiosError('Expired','ERR_BAD_RESPONSE',config,undefined,{config,status:401,statusText:'Unauthorized',headers:{},data:{code:'JWT_EXPIRED'}});
 return reply(config,user);
};
axios.defaults.adapter=async config=>{throw new AxiosError('Revoked','ERR_BAD_RESPONSE',config,undefined,{config,status:401,statusText:'Unauthorized',headers:{},data:{}});};
function Controls(){const auth=useAuth();return <aside><strong>Yerel oturum testi · Gerçek hesap kullanılmaz</strong><nav><Link to='/'>Ana sayfa</Link><Link to='/login'>Giriş</Link><Link to='/app'>Korumalı sayfa</Link></nav><div><button onClick={()=>{mode='offline';void auth.refreshUser();}}>Bağlantıyı kes</button><button onClick={()=>{mode='online';window.dispatchEvent(new Event('online'));}}>Bağlantıyı geri getir</button><button onClick={()=>{mode='expired';void auth.refreshUser();}}>Oturumu geçersiz yap</button></div></aside>}
function Public(){return <section><h1>Herkese açık sayfa</h1><p>Hesap bağlantısı kesilse de bu sayfa kullanılabilir.</p><label>Giriş formu denemesi <input placeholder='Yazdığınız metin korunmalı'/></label></section>}
function Work(){return <section><h1>Hesabınız açıldı</h1><label>Çalışmanız <textarea defaultValue='Kaydedilmemiş cevap denemesi'/></label></section>}
createRoot(document.getElementById('root')!).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><AuthProvider><BrowserRouter><Controls/><Routes><Route path='/' element={<GuestOnly><Public/></GuestOnly>}/><Route path='/login' element={<GuestOnly><Public/></GuestOnly>}/><Route element={<RequireStudentAuth/>}><Route path='/app' element={<Work/>}/></Route></Routes></BrowserRouter></AuthProvider></QueryClientProvider>);
