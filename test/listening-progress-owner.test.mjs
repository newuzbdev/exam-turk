import assert from 'node:assert/strict';
import test from 'node:test';
import { React, act, loadOfflineComponent, mount } from './helpers/offline-react.mjs';

test('listening practice keeps answers isolated after logout and account change', async t => {
window.HTMLElement.prototype.scrollTo = function() {};
const content = { id: 'audit-listening', title: 'Synthetic audit', audioUrl: null, parts: [{ id: 'part-1', number: 1, sections: [{ id: 'section-1', questions: [{ id: 'question-1', number: 1, text: 'Synthetic question', type: 'MULTIPLE_CHOICE', answers: [{ id: 'answer-1', variantText: 'A', answer: 'Synthetic answer' }, { id: 'answer-2', variantText: 'B', answer: 'Another answer' }] }] }] }] };
const timerMath = await loadOfflineComponent('src/services/overallTest.service.ts');
const { default: Listening } = await loadOfflineComponent('src/components/listening-test/ListeningTestDemo.tsx', {
  '@/hooks/use-overall-section-heartbeat': { useOverallSectionHeartbeat() {} },
  '@/services/listeningPractice.service': { default: { solve: async () => ({ sectionCode: 'PART_1', content }) } },
  '@/services/listeningTest.service': { listeningTestService: { getTestWithFullData: async () => content }, listeningSubmissionService: { getSessionResult: async () => null, getDraft: async () => ({ answers: {} }) } },
  '@/services/overallTest.service': {
    createBackendSyncedTimerState: timerMath.createBackendSyncedTimerState,
    getBackendSyncedRemainingSeconds: timerMath.getBackendSyncedRemainingSeconds,
    getOverallSectionTimerErrorCode: () => null, getOverallSectionTimerErrorMessage: error => error.message,
    overallTestTokenStore: { getByTestId: () => null },
    overallTestFlowStore: { getOverallId: () => null, hasActive: () => false },
    overallTestService: {},
  },
});
const { authService } = await loadOfflineComponent('src/services/auth.service.ts', {
  '@/config/api': { default: {} }, '@/utils/toast': { toast: { error() {}, success() {}, info() {} } },
});
sessionStorage.clear(); localStorage.clear();
sessionStorage.setItem('userId','synthetic-owner-a');
const props = { testId: 'audit-listening', practiceMode: true };
function Harness(props) {
 const [context,setContext]=React.useState(props.accessContextId);
 return React.createElement(React.Fragment,null,
  React.createElement('button',{onClick:()=>setContext('switched-context')},'Other context'),
  React.createElement('button',{onClick:()=>setContext(undefined)},'Study context'),
  React.createElement(Listening,{...props,accessContextId:context}));
}

let view = await mount(Harness,{props}); t.after(()=>view.unmount());
await act(async () => view.container.querySelector('[role="radio"]').click());
const selectedBefore = [...view.container.querySelectorAll('[role="radio"]')].findIndex(node => node.getAttribute('aria-checked') === 'true');
assert.equal(selectedBefore,0);
await act(async()=>[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Other context').click());
assert.equal(view.container.querySelector('[role="radio"][aria-checked="true"]'),null,'changing context in the mounted screen starts empty');
await act(async()=>[...view.container.querySelectorAll('button')].find(b=>b.textContent==='Study context').click());
assert.equal([...view.container.querySelectorAll('[role="radio"]')].findIndex(n=>n.getAttribute('aria-checked')==='true'),0,'returning to the original context restores its own answer');

await view.unmount();
view = await mount(Harness,{props});
assert.equal([...view.container.querySelectorAll('[role="radio"]')].findIndex(node=>node.getAttribute('aria-checked')==='true'),0,'same owner restores their answer');
await view.unmount();
view = await mount(Harness,{props:{...props,accessContextId:'another-owned-context'}});
assert.equal(view.container.querySelector('[role="radio"][aria-checked="true"]'),null,'another access context does not inherit the previous run');
await view.unmount();
authService.clearStoredTokens();
sessionStorage.setItem('userId','synthetic-owner-b');
view = await mount(Harness,{props});
const selectedAfter = [...view.container.querySelectorAll('[role="radio"]')].findIndex(node => node.getAttribute('aria-checked') === 'true');
assert.equal(selectedAfter,-1,'a second account must start without the first account answers');


});
