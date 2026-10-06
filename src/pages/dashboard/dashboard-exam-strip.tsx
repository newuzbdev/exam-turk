import type { ExamSession } from '@/data/exam-information';
import { daysUntil, deadlineState, examCountdownValue, examState } from '@/data/exam-calendar';
import { dashboardDate } from './dashboard-home-data';
import { sessionLabel } from './dashboard-goal-data';
import type { StudentOnboarding } from './onboarding-api';

export function DashboardExamStrip({ profile, today, onEdit, unavailable, sessions = [] }: {
  sessions?: ExamSession[];
  profile?: StudentOnboarding | null;
  today: string;
  onEdit: () => void;
  unavailable: boolean;
}) {
  const session = profile?.examTarget === 'CEFR'
    ? sessions.find(item => item.id === profile.examSessionId) : undefined;
  const date = !profile?.examSessionId && profile?.examDate ? profile.examDate.slice(0,10) : null;
  const state = session ? examState(session, today) : null;
  const remaining = session ? state!.days : date ? daysUntil(date, today) : null;
  const countdown = remaining === null ? null : examCountdownValue(remaining);
  const registration = session ? deadlineState(session.registrationStart, session.registrationEnd, today) : null;
  const paymentDays = session ? daysUntil(session.paymentEnd, today) : null;
  let reminder = '';
  if (session && state?.kind !== 'past' && registration) {
    if (registration.kind !== 'closed') {
      reminder = registration.kind === 'upcoming' ? `başvuru ${dashboardDate(session.registrationStart)} tarihinde açılır`
        : registration.kind === 'today' ? 'başvuru için son gün'
        : registration.kind === 'urgent' ? `başvuru için son ${registration.days} gün`
        : `son başvuru ${dashboardDate(session.registrationEnd)}`;
    } else if (paymentDays !== null && paymentDays >= 0) {
      reminder = paymentDays === 0 ? 'ödeme için son gün' : `son ödeme ${dashboardDate(session.paymentEnd)}`;
    }
  }
  const examName = profile?.examTarget === 'TYS' ? 'TYS' : profile?.examTarget === 'CEFR' ? 'Millî CEFR' : 'Sınav hedefi';
  return <header className="dashboard-exam-strip">
    <h1 className="sr-only">Genel bakış</h1>
    <time dateTime={today}>{new Intl.DateTimeFormat('tr-TR', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}).format(new Date(`${today}T12:00:00Z`))}</time>
    <div className="dashboard-exam-strip__target">
      <p>
        <strong>{session ? `${examName} · ${sessionLabel(session)}` : date ? `${examName} · ${dashboardDate(date)} ${date.slice(0,4)}` : profile?.targetExamYear ? `${examName} · ${profile.targetExamYear}` : 'Sınav hedefinizi seçin'}</strong>
        {remaining !== null && <span className="dashboard-exam-strip__countdown" data-active={state?.kind === 'ongoing' || undefined} data-urgent={countdown?.urgent || undefined} data-critical={countdown?.critical || undefined}> · {state?.kind === 'ongoing' ? 'Sınav dönemi devam ediyor' : state?.kind === 'past' ? 'Sınav sona erdi' : countdown?.relativeDay === 'today' ? 'Bugün' : countdown?.relativeDay === 'tomorrow' ? (session ? 'Yarın başlıyor' : 'Yarın') : remaining > 0 ? `${countdown?.value} gün kaldı` : 'sınav tarihi geçti'}</span>}
        {reminder && <span> · {reminder}</span>}
      </p>
      <button type="button" disabled={unavailable} onClick={onEdit}>{profile?.targetLevel || session || date ? 'Düzenle' : 'Hedef seç'}</button>
    </div>
  </header>;
}
