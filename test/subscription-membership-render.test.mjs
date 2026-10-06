import assert from "node:assert/strict";
import { Module, createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";

const filename = resolve("test/subscription-render-fixture.cjs");
const require = createRequire(filename);
const { MemoryRouter } = require("react-router-dom");
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");
const fixtures = {
  "@/hooks/use-content-access": "export const useOwnAccess = () => ({data:[]});",
  "@/contexts/AuthContext": "export const useAuth = () => ({isAuthenticated:globalThis.__membershipFixture.authenticated});",
  "@/hooks/use-membership-language": "export const useMembershipLanguage = () => [globalThis.__membershipFixture.language,()=>{}];",
  "@/services/billing.service": "export const billingService={getCatalog:()=>{throw Error('SSR must not fetch');}};",
  "@/services/subscription.service": `
    export const subscriptionStatusQueryKey = ["subscription", "status"];
    const forbidden = () => { throw new Error("Rendering must not call the API"); };
    export const subscriptionService = {getConfig:forbidden,getStatus:forbidden,prepareCheckout:forbidden};
  `,
};
const bundle = await build({
  stdin: {
    contents: `export {default as PackageCard} from "../src/pages/home/ui/billing-package-card";
      export {default as Pricing} from "../src/pages/home/ui/home-membership-pricing";
      export {SubscriptionStatusCard as Membership} from "../src/pages/profile/subscription-status-card";`,
    sourcefile: filename,
    resolveDir: resolve("test"),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  jsx: "automatic",
  write: false,
  plugins: [{
    name: "membership-fixtures",
    setup(builder) {
      builder.onResolve({ filter: /.*/ }, ({ path }) =>
        fixtures[path] ? { path, namespace: "fixture" } : undefined,
      );
      builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({
        contents: fixtures[path], loader: "js",
      }));
    },
  }],
});
const compiled = new Module(filename);
compiled.require = createRequire(filename);
compiled._compile(bundle.outputFiles[0].text, filename);

const activeStatus = {
  isActive: true,
  periodEnd: "2026-11-03T00:00:00.000Z",
  practiceRemaining: 120,
  writingMockRemaining: 10,
  speakingMockRemaining: 10,
  frozenAddOnAssessmentRemaining: 0,
};
function render(component, { status = activeStatus, authenticated = true, language = "tr", configError=false } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["subscription", "status"], status);
  client.setQueryData(["subscription", "status",undefined], status);
  client.setQueryData(["subscription", "config"], {
    paymentConnected: false,
    plan: { baseMonthlyPriceUzs: 59000, quotas: { PRACTICE_AI: 120, MOCK_WRITING: 10, MOCK_SPEAKING: 10 } },
  });
  client.setQueryData(['billing','catalog'],[{packageId:'membership',versionId:'v',sortOrder:0,amountUzs:59000,discountUzs:0,terms:{kind:'MEMBERSHIP',name:'Üyelik',description:'',saleMode:'STANDALONE',periodDays:30,basePriceUzs:59000,quotas:{MOCK_WRITING:10,MOCK_SPEAKING:10,PRACTICE_AI:120},standardMockAccess:true,practiceScopes:['PRACTICE_READING','PRACTICE_LISTENING','PRACTICE_WRITING','PRACTICE_SPEAKING'],lessonIds:[],mockSelections:[],attemptLimit:0}}]);
  if(configError)client.getQueryCache().find({queryKey:["subscription","config"]}).setState({data:undefined,status:'error',error:new Error('Unavailable'),fetchStatus:'idle'});
  globalThis.__membershipFixture = { authenticated, language };
  try {
    return renderToStaticMarkup(React.createElement(MemoryRouter, null,
      React.createElement(QueryClientProvider, { client }, React.createElement(compiled.exports[component])),
    ));
  } finally {
    delete globalThis.__membershipFixture;
    client.clear();
  }
}
const counts = (html) => [...html.matchAll(/<dd[^>]*>(\d+)<\/dd>/g)].map((match) => Number(match[1]));

test("active membership shows all three separate remaining balances", () => {
  const html = render("Membership");
  assert.match(html, /Üyeliğim/);
  assert.match(html, /Kalan Haklarınız/);
  assert.deepEqual(counts(html), [120, 10, 10]);
});

test("profile balances follow updated server status, including an exhausted bucket", () => {
  const html = render("Membership", { status: { ...activeStatus, practiceRemaining: 119, writingMockRemaining: 0, speakingMockRemaining: 9 } });
  assert.deepEqual(counts(html), [119, 0, 9]);
});

test("purchase offer keeps full plan quotas when the member has spent rights", () => {
  const html = render("Pricing", { status: { ...activeStatus, practiceRemaining: 119, writingMockRemaining: 9, speakingMockRemaining: 8 } });
  assert.match(html, />120<\/p>/);
  assert.deepEqual(counts(html), [10, 10]);
  assert.match(html, />Yenile<\/button>/);
  assert.doesNotMatch(html, /Abone Ol/);
  assert.match(html, /disabled=""/);
});

test("inactive or signed-out visitors get Subscribe without a Renew label", () => {
  for (const options of [{ status: { ...activeStatus, isActive: false } }, { authenticated: false }]) {
    const html = render("Pricing", options);
    assert.match(html, />Abone Ol<\/button>/);
    assert.doesNotMatch(html, />Yenile<\/button>/);
  }
  const profile = render("Membership", { status: { ...activeStatus, isActive: false } });
  assert.match(profile, /Aktif üyeliğiniz yok/);
  assert.deepEqual(counts(profile), []);
});

test("purchase offer stays Turkish with a saved Uzbek preference and keeps renewal and balances correct", () => {
  const options = { language: "uz", status: { ...activeStatus, practiceRemaining: 117, writingMockRemaining: 8, speakingMockRemaining: 7 } };
  assert.deepEqual(counts(render("Membership", options)), [117, 8, 7]);
  const pricing = render("Pricing", options);
  assert.match(pricing, />Yenile<\/button>/);
  assert.deepEqual(counts(pricing), [10, 10]);
  assert.doesNotMatch(pricing, /Sinov Imtihon|Mashqni Baholatish|Yangilash|aria-pressed/);
});


test("every membership card shows its admin-defined package name", () => {
  const html=renderToStaticMarkup(React.createElement(compiled.exports.PackageCard,{offer:{packageId:"second",amountUzs:99000,discountUzs:0,terms:{kind:"MEMBERSHIP",name:"Geniş Paket",periodDays:30,quotas:{PRACTICE_AI:120,MOCK_WRITING:20,MOCK_SPEAKING:10},practiceScopes:["PRACTICE_WRITING","PRACTICE_SPEAKING"],standardMockAccess:true,mockSelections:[],lessonIds:[]}},activeMembership:false,busy:false,connected:true,onBuy:()=>{}}));
  assert.match(html,/<h3[^>]*>Geniş Paket<\/h3>/);
});
test("a Writing-only practice offer does not advertise Speaking access", () => {
  const html=renderToStaticMarkup(React.createElement(compiled.exports.PackageCard,{offer:{packageId:"practice",amountUzs:20000,discountUzs:0,terms:{kind:"PRACTICE_PASS",name:"Yazma Paketi",periodDays:30,quotas:{PRACTICE_AI:20,MOCK_WRITING:0,MOCK_SPEAKING:0},practiceScopes:["PRACTICE_WRITING"],standardMockAccess:false,mockSelections:[],lessonIds:[]}},activeMembership:false,busy:false,connected:true,onBuy:()=>{}}));
  assert.doesNotMatch(html,/Yazma ve Konuşma/);
});

test("a legacy config failure cannot hide the independently loaded sales catalog",()=>{
 const html=render("Pricing",{configError:true,authenticated:false});assert.match(html,/59.000/);assert.match(html,/Abone Ol/);
});
