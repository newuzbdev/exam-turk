import type { WorkbookDocument } from './types';
import { isWorkbookStyle } from './block-style.ts';

export const EDITOR_CHANNEL = 'turkishmock-lesson-editor';
export const EDITOR_VERSION = 1 as const;

type ParentLoadMessage = { channel: typeof EDITOR_CHANNEL; version: typeof EDITOR_VERSION; type: 'load'; sessionId: string; document: WorkbookDocument; mode: 'edit' | 'preview' };
type ParentModeMessage = { channel: typeof EDITOR_CHANNEL; version: typeof EDITOR_VERSION; type: 'mode'; sessionId: string; mode: 'edit' | 'preview' };
type ParentMediaMessage = { channel: typeof EDITOR_CHANNEL; version: typeof EDITOR_VERSION; type: 'media-result'; sessionId: string; requestId: string; url?: string; error?: string };
export type EditorParentMessage = ParentLoadMessage | ParentModeMessage | ParentMediaMessage;

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const onlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
const exactKeys = (value: Record<string, unknown>, required: readonly string[]) => onlyKeys(value, required) && required.every(key => key in value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 50_000;
const identified = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 150;
const strings = (value: unknown) => Array.isArray(value) && value.length <= 100 && value.every(text);
const tone = (value: unknown) => ['plain', 'gray', 'green', 'yellow'].includes(String(value));
const optionalText = (value: unknown) => value === undefined || text(value);
const optionalId = (value: unknown) => value === undefined || identified(value);
const fields: Record<string, string[]> = {
  heading: ['text', 'level'], text: ['text'], quote: ['text'], tip: ['title', 'text'], image: ['url', 'alt', 'caption'], table: ['headers', 'rows'],
  blank: ['title', 'instruction', 'before', 'after', 'acceptedAnswers', 'explanation', 'exerciseId', 'questionId'],
  choice: ['title', 'instruction', 'options', 'correctOptionId', 'explanation', 'exerciseId', 'questionId'],
  reflection: ['title', 'instruction', 'exampleAnswer', 'checklist'],
};

function validBlock(value: unknown): boolean {
  if (!record(value) || !identified(value.id) || !tone(value.tone) || typeof value.kind !== 'string' || !Object.prototype.hasOwnProperty.call(fields, value.kind)) return false;
  if (!onlyKeys(value, ['id', 'kind', 'tone', 'style', ...fields[value.kind]]) || (value.style !== undefined && !isWorkbookStyle(value.style))) return false;
  if (!optionalText(value.explanation) || !optionalId(value.exerciseId) || !optionalId(value.questionId)) return false;
  switch (value.kind) {
    case 'heading': return text(value.text) && (value.level === 2 || value.level === 3);
    case 'text': case 'quote': return text(value.text);
    case 'tip': return text(value.title) && text(value.text);
    case 'image': return text(value.url) && text(value.alt) && text(value.caption);
    case 'table': return strings(value.headers) && Array.isArray(value.rows) && value.rows.length <= 100 && value.rows.every(row => record(row) && exactKeys(row, ['id', 'cells', 'tone']) && identified(row.id) && strings(row.cells) && tone(row.tone));
    case 'blank': return text(value.title) && text(value.instruction) && text(value.before) && text(value.after) && (value.acceptedAnswers === undefined || strings(value.acceptedAnswers));
    case 'choice': return text(value.title) && text(value.instruction) && Array.isArray(value.options) && value.options.length <= 100 && value.options.every(option => record(option) && exactKeys(option, ['id', 'text']) && identified(option.id) && text(option.text)) && optionalText(value.correctOptionId);
    case 'reflection': return text(value.title) && text(value.instruction) && text(value.exampleAnswer) && strings(value.checklist);
    default: return false;
  }
}

export function isWorkbookDocument(value: unknown): value is WorkbookDocument {
  if (!record(value) || !exactKeys(value, ['id', 'slug', 'title', 'summary', 'category', 'cover', 'video', 'isDemo', 'status', 'revision', 'updatedAt', 'blocks'])) return false;
  return identified(value.id) && identified(value.slug) && text(value.title) && text(value.summary)
    && ['listening', 'reading', 'writing', 'speaking', 'grammar'].includes(String(value.category)) && ['headphones', 'notes', 'choices', 'conversation', 'gaps', 'clock'].includes(String(value.cover)) && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(String(value.status))
    && typeof value.isDemo === 'boolean' && Number.isSafeInteger(value.revision) && Number(value.revision) >= 0 && text(value.updatedAt)
    && (value.video === null || (record(value.video) && ((value.video.kind === 'youtube' && exactKeys(value.video, ['kind', 'id']) && text(value.video.id)) || (value.video.kind === 'file' && exactKeys(value.video, ['kind', 'url']) && text(value.video.url)))))
    && Array.isArray(value.blocks) && value.blocks.length <= 200 && value.blocks.every(validBlock)
    && new Set(value.blocks.map(block => record(block) ? block.id : null)).size === value.blocks.length;
}

export function configuredAdminOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (url.username || url.password || !(url.protocol === 'https:' || (url.protocol === 'http:' && local))) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function readyEditorMessage() {
  return { channel: EDITOR_CHANNEL, version: EDITOR_VERSION, type: 'ready' as const };
}

export function acceptEditorMessage(
  event: { origin: string; source: unknown; data: unknown },
  trustedOrigin: string,
  expectedSource: unknown,
  currentSessionId?: string,
): EditorParentMessage | null {
  if (!trustedOrigin || event.origin !== trustedOrigin || event.source !== expectedSource || !record(event.data)) return null;
  try { if (JSON.stringify(event.data).length > 2_000_000) return null; } catch { return null; }
  const data = event.data;
  if (data.channel !== EDITOR_CHANNEL || data.version !== EDITOR_VERSION || !identified(data.sessionId)) return null;
  if (data.type !== 'load' && data.sessionId !== currentSessionId) return null;
  if (data.type === 'load' && exactKeys(data, ['channel', 'version', 'type', 'sessionId', 'document', 'mode']) && isWorkbookDocument(data.document) && (data.mode === 'edit' || data.mode === 'preview')) return data as ParentLoadMessage;
  if (data.type === 'mode' && exactKeys(data, ['channel', 'version', 'type', 'sessionId', 'mode']) && (data.mode === 'edit' || data.mode === 'preview')) return data as ParentModeMessage;
  if (data.type === 'media-result' && onlyKeys(data, ['channel', 'version', 'type', 'sessionId', 'requestId', 'url', 'error']) && ['channel', 'version', 'type', 'sessionId', 'requestId'].every(key => key in data) && identified(data.requestId) && optionalText(data.url) && optionalText(data.error) && (data.url !== undefined || data.error !== undefined)) return data as ParentMediaMessage;
  return null;
}
