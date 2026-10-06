import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { deadlineState, examCountdownValue, examState, uzbekistanToday } from '@/data/exam-calendar';
import { EXAM_COPY, EXAM_SOURCES, examDateLabel, type ExamLanguage, type ExamSession } from '@/data/exam-information';
import { useOfficialExams } from '@/data/official-exams-api';
import { useSaveStudentOnboarding, useStudentOnboarding } from '@/pages/dashboard/onboarding-api';
import { SourceLink, focus, surface } from './exam-information-sections';

const quietBadge = 'bg-[#f1f1ee] text-[var(--tm-text-primary)]';
const urgentBadge = 'bg-[var(--tm-cat-speaking-bg)] text-[var(--tm-text-primary)]';

function Deadline({ start, end, today, language }: { start: string; end: string; today: string; language: ExamLanguage }) {
  const state = deadlineState(start, end, today);
  const tr = language === 'tr';
  const text = state.kind === 'upcoming' ? (tr ? 'Henüz başlamadı' : 'Hali boshlanmagan')
    : state.kind === 'closed' ? (tr ? 'Süre bitti' : 'Muddat tugagan')
    : state.kind === 'today' ? (tr ? 'Bugün son gün' : 'Bugun oxirgi kun')
    : state.kind === 'urgent' ? (tr ? `${state.days} gün kaldı` : `${state.days} kun qoldi`)
    : (tr ? 'Takvime göre açık' : 'Taqvim bo‘yicha ochiq');
  const color = state.kind === 'today' || state.kind === 'urgent' ? urgentBadge : state.kind === 'open' ? 'bg-[var(--tm-cat-listening-bg)]' : quietBadge;
  return <span className={`inline-flex rounded-[5px] px-2 py-1 text-[12px] font-medium leading-4 ${color}`}>{text}</span>;
}

export function ExamSessionCard({ session, today, language, selected = false, hideYear = false, selecting = false, selectionReady = true, onSelect }: { session: ExamSession; today: string; language: ExamLanguage; selected?: boolean; hideYear?: boolean; selecting?: boolean; selectionReady?: boolean; onSelect?: () => void }) {
  const tr = language === 'tr';
  const copy = EXAM_COPY[language];
  const state = examState(session, today);
  const countdown = examCountdownValue(state.days);
  const label = (date: string) => examDateLabel(date, language);
  const registration = deadlineState(session.registrationStart, session.registrationEnd, today);
  const payment = deadlineState(session.registrationStart, session.paymentEnd, today);
  const messages = [
    { state: registration, today: tr ? 'Başvuru için bugün son gün.' : 'Ro‘yxatdan o‘tish uchun bugun oxirgi kun.', soon: tr ? `Başvurunun kapanmasına ${registration.days} gün kaldı.` : `Ro‘yxatdan o‘tish tugashiga ${registration.days} kun qoldi.` },
    { state: payment, today: tr ? 'Başvurduysanız ödemenizi bugün tamamlayın.' : 'Ariza topshirgan bo‘lsangiz, to‘lovni bugun yakunlang.', soon: tr ? `Başvurduysanız son ödeme gününe ${payment.days} gün kaldı.` : `Ariza topshirgan bo‘lsangiz, to‘lov muddatiga ${payment.days} kun qoldi.` },
  ].filter(item => item.state.kind === 'today' || item.state.kind === 'urgent');
  const status = state.kind === 'past' ? (tr ? 'Sınav sona erdi' : 'Imtihon yakunlangan')
    : state.kind === 'ongoing' ? (tr ? 'Sınav dönemi devam ediyor' : 'Imtihon davri davom etmoqda')
    : countdown.relativeDay === 'tomorrow' ? (tr ? 'Yarın başlıyor' : 'Ertaga boshlanadi')
    : (tr ? `Sınava ${countdown.value} gün kaldı` : `Imtihongacha ${countdown.value} kun qoldi`);
  return <article className="exam-session-row" data-selected={selected || undefined}>
    <div className="exam-session-date">
    <h3 className="text-[16px] font-semibold leading-6"><time dateTime={session.examStart}>{label(session.examStart)}</time> – <time dateTime={session.examEnd}>{label(session.examEnd)}</time>{!hideYear && <span className="ml-2 text-[13px] font-medium">{session.examStart.slice(0, 4)}</span>}</h3>
    {selected && <span className="exam-selected-label">{tr ? 'Seçtiğiniz sınav' : 'Tanlagan imtihoningiz'}</span>}
    </div>
    <dl className="exam-session-deadlines">
      <div><dt>{copy.registration}</dt><dd><span><time dateTime={session.registrationStart}>{label(session.registrationStart)}</time> – <time dateTime={session.registrationEnd}>{label(session.registrationEnd)}</time></span><Deadline start={session.registrationStart} end={session.registrationEnd} today={today} language={language} /></dd></div>
      <div><dt>{copy.payment}</dt><dd><time dateTime={session.paymentEnd}>{label(session.paymentEnd)}</time><Deadline start={session.registrationStart} end={session.paymentEnd} today={today} language={language} /></dd></div>
    </dl>
    <div className="exam-session-status">
      <p className="exam-status-text" data-urgency={state.kind === 'ongoing' ? 'active' : countdown.urgency}>{status}</p>
      {messages.length > 0 && <div className="exam-deadline-notice">{messages.map((item, index) => <p key={index}>{item.state.kind === 'today' ? item.today : item.soon}</p>)}</div>}
      {state.kind !== 'past' && (selected
        ? <span className="exam-session-selected-action">{tr ? 'Seçildi' : 'Tanlangan'}</span>
        : <button type="button" className="exam-session-select" disabled={selecting || !selectionReady} onClick={onSelect}>{selecting || !selectionReady ? (tr ? 'Hazırlanıyor…' : 'Tayyorlanmoqda…') : (tr ? 'Bu sınavı seç' : 'Bu imtihonni tanlash')}</button>)}
    </div>
  </article>;
}

export function ExamCalendar({ language }: { language: ExamLanguage }) {
  const calendar = useOfficialExams();
  const onboarding = useStudentOnboarding();
  const save = useSaveStudentOnboarding(onboarding.data);
  const [selectionError, setSelectionError] = useState(false);
  const [today, setToday] = useState(uzbekistanToday);
  useEffect(() => {
    const refresh = () => setToday(uzbekistanToday());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const copy = EXAM_COPY[language];
  const sessions = calendar.data?.sessions ?? [];
  const upcoming = sessions.filter(session => session.examEnd >= today);
  const past = sessions.filter(session => session.examEnd < today).reverse();
  const sources = [...new Set(sessions.map(session => session.sourceUrl))];
  const sessionYears = [...new Set(sessions.map(session => session.examStart.slice(0, 4)))].sort();
  const years = sessionYears.join(' · ');
  const selectSession = async (session: ExamSession) => {
    setSelectionError(false);
    const profile = onboarding.data;
    try {
      await save.mutateAsync({
        goal: 'EXAM_PREPARATION',
        currentLevel: profile?.currentLevel ?? 'UNSURE',
        supportLanguage: profile?.supportLanguage ?? 'TURKISH',
        examTarget: 'CEFR',
        dailyStudyMinutes: profile?.dailyStudyMinutes ?? 20,
        examDate: session.examStart,
        targetLevel: profile?.targetLevel ?? null,
        targetExamYear: Number(session.examStart.slice(0, 4)),
        examSessionId: session.id,
      });
    } catch {
      setSelectionError(true);
    }
  };
  if (calendar.isPending) return <p role="status">{language === 'tr' ? 'Takvim yükleniyor…' : 'Taqvim yuklanmoqda…'}</p>;
  if (calendar.isError) return <p role="alert">{language === 'tr' ? 'Takvim yüklenemedi.' : 'Taqvim yuklanmadi.'} <button onClick={() => void calendar.refetch()}>{language === 'tr' ? 'Yeniden dene' : 'Qayta urinish'}</button></p>;
  return <>
    {years && <h2 className="exam-period-heading text-[14px] font-medium text-[var(--tm-text-secondary)]">{language === 'tr' ? `${years} dönemleri` : `${years}-yil imtihonlari`}</h2>}
    <div className="exam-session-list">{upcoming.map(session => <ExamSessionCard key={session.id} session={session} today={today} language={language} hideYear={sessionYears.length === 1} selected={calendar.data?.selectedSession?.id === session.id} selecting={save.isPending} selectionReady={onboarding.isSuccess} onSelect={() => void selectSession(session)} />)}</div>
    {selectionError && <p className="exam-session-error" role="alert">{language === 'tr' ? 'Sınav seçimi kaydedilemedi. Tekrar deneyin.' : 'Imtihon tanlovi saqlanmadi. Qayta urinib ko‘ring.'}</p>}
    {!upcoming.length && <p className={`${surface} p-5`}>{language === 'tr' ? 'Yeni sınav tarihleri henüz eklenmedi. Güncel duyuruyu resmî siteden kontrol edin.' : 'Yangi imtihon sanalari hali qo‘shilmagan. So‘nggi e’lonni rasmiy saytdan tekshiring.'}</p>}
    {past.length > 0 && <details className="group">
      <summary className={`flex cursor-pointer list-none items-center gap-2 rounded py-2 font-semibold [&::-webkit-details-marker]:hidden ${focus}`}><ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />{language === 'tr' ? 'Geçmiş sınavlar' : 'O‘tgan imtihonlar'}</summary>
      <div className="exam-session-list">{past.map(session => <ExamSessionCard key={session.id} session={session} today={today} language={language} hideYear={sessionYears.length === 1} selected={calendar.data?.selectedSession?.id === session.id} />)}</div>
    </details>}
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      {sources.map((source, index) => <SourceLink key={source} href={source}>{language === 'tr' ? 'Tarihlerin resmî kaynağı' : 'Sanalarning rasmiy manbasi'}{sources.length > 1 ? ` ${index + 1}` : ''}</SourceLink>)}
      <SourceLink href={EXAM_SOURCES.application}>{copy.apply}</SourceLink>
    </div>
    <p className="text-[13px]">{copy.dateNote}</p>
  </>;
}
