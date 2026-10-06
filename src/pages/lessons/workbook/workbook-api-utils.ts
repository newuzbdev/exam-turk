import type { Category, WorkbookDocumentSummary } from './types';

export function unwrapWorkbookPayload<T>(payload: T | { success: boolean; data: T; error?: unknown }): T {
  return payload && typeof payload === 'object' && 'success' in payload && 'data' in payload ? (payload as { data: T }).data : payload as T;
}

export function filterWorkbookLessons<T extends Pick<WorkbookDocumentSummary, 'category'>>(lessons: T[], category: Category): T[] {
  return lessons.filter(lesson => lesson.category === category);
}
