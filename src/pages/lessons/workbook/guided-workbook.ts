import type { WorkbookBlock } from './types';

export function guidedWorkbookSteps(blocks: WorkbookBlock[]) {
  const steps: { id: string; title: string; blocks: WorkbookBlock[]; exerciseStart: number }[] = [];
  let exerciseCount = 0;
  const introduction: WorkbookBlock[] = [];
  for (const block of blocks) {
    if (block.kind === 'heading' && block.level === 2 && /^\d+\./.test(block.text)) {
      steps.push({ id:block.id, title:block.text, blocks:steps.length ? [] : introduction.filter(item => item.kind !== 'tip'), exerciseStart:exerciseCount });
    } else if (steps.length) steps[steps.length - 1].blocks.push(block);
    else introduction.push(block);
    if (['blank','choice','reflection'].includes(block.kind)) exerciseCount++;
  }
  if (steps.length) steps[0].blocks.push(...introduction.filter(item => item.kind === 'tip'));
  return steps;
}

export function stepReady(blocks: WorkbookBlock[], activity: Record<string, boolean>): boolean {
  return blocks.filter(block => ['blank','choice','reflection'].includes(block.kind)).every(block => activity[block.id]);
}
