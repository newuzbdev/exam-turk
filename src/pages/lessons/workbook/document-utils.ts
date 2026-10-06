import type {
  ExerciseBlock,
  StudentExerciseSubmission,
  WorkbookAnswer,
  WorkbookBlock,
  WorkbookFeedback,
} from './types';

export type WorkbookAnswerAction = { type: 'change'; value: string } | { type: 'check' };

export function workbookAnswerReducer(state: WorkbookAnswer, action: WorkbookAnswerAction): WorkbookAnswer {
  return action.type === 'change' ? { value: action.value, checked: false } : { ...state, checked: true };
}

const normalizeAnswer = (value: string) => value
  .normalize('NFC')
  .toLocaleLowerCase('tr-TR')
  .trim()
  .replace(/[.!?]+$/u, '')
  .trim()
  .replace(/\s+/gu, ' ');

export function checkPreviewAnswer(block: ExerciseBlock, value: string): WorkbookFeedback {
  if (!value.trim()) {
    return { kind: 'empty', message: block.kind === 'choice' ? 'Önce bir seçenek seçin.' : 'Önce cevabınızı yazın.' };
  }
  if (block.kind === 'reflection') return { kind: 'compare', message: block.exampleAnswer };
  const correct = block.kind === 'choice'
    ? value === block.correctOptionId
    : (block.acceptedAnswers ?? []).some(answer => normalizeAnswer(answer) === normalizeAnswer(value));
  return { kind: correct ? 'correct' : 'retry', message: block.explanation || (correct ? 'Cevabınız doğru.' : 'Cevabınızı yeniden düşünün.') };
}

export function buildStudentSubmission(block: ExerciseBlock, value: string): StudentExerciseSubmission | null {
  if (block.kind === 'reflection' || !block.exerciseId || !block.questionId || !value.trim()) return null;
  if (block.kind === 'choice') {
    const optionIndex = block.options.findIndex(option => option.id === value);
    if (optionIndex < 0) return null;
    return { exerciseId: block.exerciseId, answers: [{ questionId: block.questionId, answer: { optionIndex } }] };
  }
  return { exerciseId: block.exerciseId, answers: [{ questionId: block.questionId, answer: { value: value.trim() } }] };
}

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const BLOCK_LABELS: Record<WorkbookBlock['kind'], string> = {
  heading: 'Başlık', text: 'Metin', quote: 'Alıntı', tip: 'İpucu', image: 'Görsel', table: 'Tablo', blank: 'Boşluk doldurma', choice: 'Seçenekli soru', reflection: 'Açık uçlu soru',
};

export function workbookBlockLabel(kind: WorkbookBlock['kind']): string {
  return BLOCK_LABELS[kind];
}

function uniqueId(existing: WorkbookBlock[]) {
  const used = new Set(existing.map(block => block.id));
  let next = makeId();
  while (used.has(next)) next = makeId();
  return next;
}

export function createWorkbookBlock(kind: WorkbookBlock['kind'], existing: WorkbookBlock[]): WorkbookBlock {
  const id = uniqueId(existing);
  const base = { id, tone: 'plain' as const };
  switch (kind) {
    case 'heading': return { ...base, kind, text: 'Yeni başlık', level: 2 };
    case 'text': return { ...base, kind, text: '' };
    case 'quote': return { ...base, kind, text: 'Örnek veya alıntı metni.' };
    case 'tip': return { ...base, kind, title: 'İpucu', text: 'İpucunuzu yazın.' };
    case 'image': return { ...base, kind, url: '', alt: '', caption: '' };
    case 'table': return {
      ...base, kind, headers: ['Başlık 1', 'Başlık 2'],
      rows: [{ id: makeId(), tone: 'plain', cells: ['', ''] }],
    };
    case 'blank': return { ...base, kind, title: 'Boşluğu tamamlayın', instruction: '', before: '', after: '', explanation: '' };
    case 'choice': return {
      ...base, kind, title: 'Doğru seçeneği bulun', instruction: '',
      options: [{ id: makeId(), text: 'Seçenek 1' }, { id: makeId(), text: 'Seçenek 2' }], explanation: '',
    };
    case 'reflection': return { ...base, kind, title: 'Kendi cümlenizle yazın', instruction: '', exampleAnswer: '', checklist: [''] };
  }
}

export function moveBlock(blocks: WorkbookBlock[], blockId: string, direction: -1 | 1): WorkbookBlock[] {
  const from = blocks.findIndex(block => block.id === blockId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= blocks.length) return blocks;
  const next = [...blocks];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function replaceBlock(blocks: WorkbookBlock[], nextBlock: WorkbookBlock): WorkbookBlock[] {
  return blocks.map(block => block.id === nextBlock.id ? nextBlock : block);
}

export function isSafeMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/')) return !trimmed.startsWith('//');
  try { return ['http:', 'https:'].includes(new URL(trimmed).protocol); } catch { return false; }
}

export function numberedExerciseTitle(number: number, title: string): string {
  return /^\s*\d+[.)]\s+/u.test(title) ? title : `${number}. ${title}`;
}

export function insertWorkbookBlock(blocks: WorkbookBlock[], index: number, kind: WorkbookBlock['kind']) {
  const block = createWorkbookBlock(kind, blocks);
  const safeIndex = Math.max(0, Math.min(index, blocks.length));
  return { blocks: [...blocks.slice(0, safeIndex), block, ...blocks.slice(safeIndex)], blockId: block.id };
}

export function duplicateWorkbookBlock(block: WorkbookBlock, existing: WorkbookBlock[]): WorkbookBlock {
  const id = uniqueId(existing);
  if (block.kind === 'table') return { ...block, id, rows: block.rows.map(row => ({ ...row, id: makeId(), cells: [...row.cells] })) };
  if (block.kind === 'choice') {
    const optionIds = new Map<string, string>();
    const options = block.options.map(option => { const optionId = makeId(); optionIds.set(option.id, optionId); return { ...option, id: optionId }; });
    const copy = { ...block };
    delete copy.exerciseId;
    delete copy.questionId;
    return { ...copy, id, options, ...(block.correctOptionId ? { correctOptionId: optionIds.get(block.correctOptionId) } : {}) };
  }
  if (block.kind === 'blank') {
    const copy = { ...block };
    delete copy.exerciseId;
    delete copy.questionId;
    return { ...copy, id, acceptedAnswers: copy.acceptedAnswers ? [...copy.acceptedAnswers] : undefined };
  }
  if (block.kind === 'reflection') return { ...block, id, checklist: [...block.checklist] };
  return { ...block, id };
}
