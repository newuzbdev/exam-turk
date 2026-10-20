import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  EXAM_SOURCES,
  type ExamSession,
} from "@/data/exam-information";
import { daysUntil, deadlineState, examCountdownValue, examState } from "@/data/exam-calendar";
import { calendarDays, dashboardDate } from "./dashboard-home-data";
import type { StudentOnboarding } from "./onboarding-api";
import { sessionLabel } from "./dashboard-goal-data";

function ExamCountdown({ days, period = false }: { days: number; period?: boolean }) {
  const countdown = examCountdownValue(days);

  return (
    <div
      className="student-home__countdown"
      data-urgent={countdown.urgent || undefined}
      data-critical={countdown.critical || undefined}
      aria-live="polite"
    >
      {countdown.relativeDay ? <strong className="student-home__status-word">{countdown.relativeDay === "today" ? "Bugün" : period ? "Yarın başlıyor" : "Yarın"}</strong> : <>
        <strong>{countdown.value}</strong>
        <span>gün kaldı</span>
      </>}
    </div>
  );
}

export function DashboardExamCard({
  profile,
  today,
  onChoose,
  unavailable,
  sessions = [],
}: {
  profile?: StudentOnboarding | null;
  today: string;
  onChoose: (session?: ExamSession) => void;
  unavailable?: boolean;
  sessions?: ExamSession[];
}) {
  const savedSession =
    profile?.examTarget === "CEFR"
      ? sessions.find(
          (session) => session.id === profile.examSessionId,
        )
      : undefined;
  const initialMonth =
    savedSession?.examStart.slice(0, 7) ??
    profile?.examDate?.slice(0, 7) ??
    (profile?.targetExamYear &&
    profile.targetExamYear !== Number(today.slice(0, 4))
      ? `${profile.targetExamYear}-01`
      : today.slice(0, 7));
  const [month, setMonth] = useState(initialMonth);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = sessions.find(
    (session) => session.id === previewId,
  );
  const session = preview ?? savedSession;
  const changeMonth = (delta: number) => {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(date.toISOString().slice(0, 7));
    setPreviewId(null);
  };
  const monthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  const state = session ? examState(session, today) : null;
  const registration = session
    ? deadlineState(session.registrationStart, session.registrationEnd, today)
    : null;
  const paymentDays = session ? daysUntil(session.paymentEnd, today) : null;
  const isSaved = session?.id === savedSession?.id;
  const personalDate =
    !profile?.examSessionId && profile?.examDate
      ? profile.examDate.slice(0, 10)
      : null;
  const personalDays = personalDate ? daysUntil(personalDate, today) : null;
  const hasDate = Boolean(savedSession || personalDate);
  return (
    <aside className="student-home__exam" aria-labelledby="home-exam-title">
      <div className="student-home__section-heading">
        <h2 id="home-exam-title">Sınav takvimi</h2>
        <button type="button" className={`student-home__text-button dashboard-exam-edit${hasDate ? ' dashboard-edit-icon' : ''}`}
          aria-label={hasDate ? 'Sınav tarihini değiştir' : undefined}
          title={hasDate ? 'Sınav tarihini değiştir' : undefined}
          disabled={unavailable} onClick={() => onChoose(preview && state?.kind !== "past" ? preview : undefined)}>
          {hasDate ? <CalendarDays size={16} aria-hidden="true"/> : "Tarih belirle"}
        </button>
      </div>
      <div className="dashboard-exam-body">
      <div className="student-home__exam-detail" data-empty={!session && !personalDate} aria-live="polite">
        {session ? (
          <>
            <p>{isSaved ? "Millî CEFR" : "Millî CEFR · Ön izleme"}</p>
            <h3>{sessionLabel(session)}</h3>
            {!session.published && <p>Bu dönem artık yayımlanmıyor.</p>}
            {state?.kind === "past" || state?.kind === "ongoing" ? <div className="student-home__countdown" data-active={state.kind === "ongoing" || undefined}>
              {state?.kind === "past" ? (
                <strong className="student-home__status-word">
                  Sınav sona erdi
                </strong>
              ) : state?.kind === "ongoing" ? (
                <strong className="student-home__status-word">
                  Sınav dönemi devam ediyor
                </strong>
              ) : null}
            </div> : <ExamCountdown days={state?.days ?? 0} period />}
            <dl className="dashboard-exam-deadlines">
              <div>
                <dt>Başvuru</dt>
                <dd>{dashboardDate(session.registrationStart)} – {dashboardDate(session.registrationEnd)}
                  {registration?.kind === "closed" ? <small>Başvuru kapandı</small>
                    : registration?.kind === "today" ? <small data-urgent="true">Başvuru için son gün</small>
                    : registration?.kind === "urgent" ? <small data-urgent="true">Başvuru için {registration.days} gün kaldı</small>
                    : registration?.kind === "upcoming" ? <small>Başvuru {registration.days} gün sonra açılıyor</small>
                    : registration?.kind === "open" ? <small>Başvurunun kapanmasına {registration.days} gün kaldı</small>
                    : null}
                </dd>
              </div>
              <div>
                <dt>Son ödeme</dt>
                <dd>{dashboardDate(session.paymentEnd)}
                  {paymentDays! < 0 ? <small>Ödeme süresi doldu</small>
                    : paymentDays === 0 ? <small data-urgent="true">Ödeme için son gün</small>
                    : <small data-urgent={paymentDays! <= 3 || undefined}>Ödeme için {paymentDays} gün kaldı</small>}
                </dd>
              </div>
            </dl>
          </>
        ) : personalDate ? (
          <>
            <p>
              Planladığınız sınav ·{" "}
              {profile?.examTarget === "TYS" ? "TYS" : "Millî CEFR"}
            </p>
            <h3>
              {dashboardDate(personalDate)} {personalDate.slice(0, 4)}
            </h3>
            {personalDays! >= 0 ? (
              <ExamCountdown days={personalDays!} />
            ) : (
              <div className="student-home__countdown">
                <strong className="student-home__status-word">
                  Planladığınız tarih geçti
                </strong>
              </div>
            )}
          </>
        ) : profile?.targetExamYear && !sessions.some(item =>
          item.examStart.startsWith(String(profile.targetExamYear))) ? (
          <p>{profile.targetExamYear} takvimi henüz açıklanmadı.</p>
        ) : <p>Henüz tarih belirlemediniz.</p>}
      </div>
      <div className="dashboard-exam-month-panel">
      <div className="student-home__month">
        <button
          type="button"
          aria-label="Önceki ay"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <h3 aria-live="polite">{monthLabel}</h3>
        <button
          type="button"
          aria-label="Sonraki ay"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div
        className="student-home__calendar"
        role="group"
        aria-label={monthLabel}
      >
        {['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'].map(day => <span className="student-home__weekday" key={day} aria-hidden="true">{day}</span>)}
        {calendarDays(month).map((day, index) => {
          const exam = day
            ? sessions.find(
                (item) => day >= item.examStart && day <= item.examEnd,
              )
            : undefined;
          return day ? (
            <button
              type="button"
              key={day}
              className="student-home__day"
              data-exam={Boolean(exam)}
              data-personal={day === personalDate}
              data-past={Boolean(exam && exam.examEnd < today)}
              data-selected={Boolean(
                exam && session?.id === exam.id,
              )}
              aria-current={day === today ? "date" : undefined}
              aria-pressed={Boolean(
                exam && session?.id === exam.id,
              )}
              disabled={!exam}
              aria-label={`${dashboardDate(day)}${exam ? " · Sınav dönemi" : ""}${day === personalDate ? " · Planladığınız tarih" : ""}${day === today ? " · Bugün" : ""}`}
              onClick={() => setPreviewId(exam!.id)}
            >
              <span aria-hidden="true">{Number(day.slice(-2))}</span>
            </button>
          ) : (
            <span key={`empty-${index}`} data-calendar-empty aria-hidden="true"/>
          );
        })}
      </div>
      <div className="dashboard-exam-footer">
      <p className="student-home__calendar-key">
        <i />
        Sınav günleri <span>·</span> <b>Bugün</b>
      </p>
      <details className="student-home__exam-note">
        <summary>Tarihler hakkında</summary>
        <p>
          Günler resmî sınav dönemini gösterir. Kendi sınav gününüz ve konuşma
          tarihiniz giriş belgenizde yer alır.
        </p>
      </details>
      <div className="student-home__exam-links">
        <NavLink to="/app/sinav-bilgileri?bolum=tarihler">Tüm tarihler</NavLink>
        <a href={session?.sourceUrl ?? EXAM_SOURCES.agency} target="_blank" rel="noreferrer">
          Resmî duyuru ↗
        </a>
      </div>
      </div>
      </div>
      </div>
    </aside>
  );
}
