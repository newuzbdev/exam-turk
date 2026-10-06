import type { WorkbookStyle } from './types';

const STYLE_KEYS = ['textColor', 'backgroundColor', 'fontSize', 'textAlign', 'width'] as const;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const;

export function isWorkbookStyle(value: unknown): value is WorkbookStyle {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const style = value as Record<string, unknown>;
  if (Object.keys(style).some(key => !STYLE_KEYS.includes(key as never))) return false;
  return (style.textColor === undefined || (typeof style.textColor === 'string' && HEX_COLOR.test(style.textColor)))
    && (style.backgroundColor === undefined || (typeof style.backgroundColor === 'string' && HEX_COLOR.test(style.backgroundColor)))
    && (style.fontSize === undefined || (Number.isInteger(style.fontSize) && Number(style.fontSize) >= 12 && Number(style.fontSize) <= 48))
    && (style.width === undefined || (Number.isInteger(style.width) && Number(style.width) >= 25 && Number(style.width) <= 100))
    && (style.textAlign === undefined || ALIGNMENTS.includes(style.textAlign as never));
}

export function projectWorkbookStyle(value: unknown): Record<string, string> {
  if (!isWorkbookStyle(value)) return {};
  return {
    ...(value.textColor ? { color: value.textColor } : {}),
    ...(value.backgroundColor ? { backgroundColor: value.backgroundColor } : {}),
    ...(value.fontSize ? { fontSize: `${value.fontSize}px` } : {}),
    ...(value.textAlign ? { textAlign: value.textAlign } : {}),
    ...(value.width ? { width: `${value.width}%`, marginInline: 'auto' } : {}),
  };
}

export function updateWorkbookStyle<K extends keyof WorkbookStyle>(style: WorkbookStyle | undefined, key: K, value: WorkbookStyle[K] | undefined): WorkbookStyle | undefined {
  const next = { ...style };
  if (value === undefined) delete next[key]; else next[key] = value;
  return Object.keys(next).length ? next : undefined;
}
