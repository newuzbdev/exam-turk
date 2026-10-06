import type { ExamSession } from './exam-information';

export function uzbekistanToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
}
// Calendar entries contain dates, not an exam start time. Never infer an hourly countdown.
export function examCountdownValue(days: number) {
  return {
    value: days,
    relativeDay: days === 0 ? 'today' : days === 1 ? 'tomorrow' : null,
    urgent: days >= 0 && days <= 3,
    critical: days >= 0 && days <= 1,
    urgency: days >= 0 && days <= 1 ? 'critical' : days === 2 ? 'near' : days === 3 ? 'soon' : 'normal',
  } as const;
}
export function deadlineState(start: string, end: string, today: string) {
  const days = daysUntil(end, today);
  if (today < start) return { kind: 'upcoming', days: daysUntil(start, today) } as const;
  if (days < 0) return { kind: 'closed', days } as const;
  if (days === 0) return { kind: 'today', days } as const;
  if (days <= 3) return { kind: 'urgent', days } as const;
  return { kind: 'open', days } as const;
}
export function examState(session: ExamSession, today: string) {
  const days = daysUntil(session.examStart, today);
  if (today > session.examEnd) return { kind: 'past', days } as const;
  if (today >= session.examStart) return { kind: 'ongoing', days } as const;
  return { kind: days <= 3 ? 'urgent' : 'upcoming', days } as const;
}
