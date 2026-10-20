import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  ArrowUpRight,
  Triangle,
  Minus,
  RefreshCw,
  Target,
} from "lucide-react";
import type { ExamSession } from "@/data/exam-information";
import { uzbekistanToday } from "@/data/exam-calendar";
import { useStudentOnboarding } from "./onboarding-api";
import { useOfficialExams } from "@/data/official-exams-api";
import { useDashboardResults } from "./dashboard-results-api";
import {
  buildProgressOverview,
  dashboardDate,
  dashboardFullDate,
  dashboardNumber,
  dashboardReportPath,
} from "./dashboard-home-data";
import { DashboardExamCard } from "./dashboard-exam-card";
import { DashboardGoalDialog } from "./dashboard-goal-dialog";
import { DashboardLevelSummary } from "./dashboard-level-summary";
import { DashboardExamStrip } from "./dashboard-exam-strip";
import { dashboardAverageNumber } from "./dashboard-level-data";
import "./student-dashboard.css";
import "./dashboard-reference.css";
import "./dashboard-personalized.css";

export default function StudentDashboard() {
  const [today, setToday] = useState(() => uzbekistanToday());
  const [goalOpen, setGoalOpen] = useState(false);
  const [dateOnly, setDateOnly] = useState(false);
  const [levelOnly, setLevelOnly] = useState(false);
  const [chosenSession, setChosenSession] = useState<ExamSession>();
  const results = useDashboardResults();
  const resultsStatus = results.data !== undefined ? 'ready' : results.isPending ? 'loading' : 'error';
  const onboarding = useStudentOnboarding();
  const officialExams = useOfficialExams();
  const examSessions = officialExams.data?.sessions ?? [];
  const selectedExam = officialExams.data?.selectedSession;
  const visibleExams = selectedExam && !examSessions.some(item => item.id === selectedExam.id)
    ? [...examSessions, selectedExam] : examSessions;
  const overview = useMemo(
    () => buildProgressOverview(results.data ?? [], "all", today),
    [results.data, today],
  );
  const missingSkills = overview.skills.filter((item) => item.average === null);
  const missingLabel =
    missingSkills.length === 1
      ? missingSkills[0].label.toLocaleLowerCase("tr-TR") + " sonucu"
      : missingSkills.length + " bölüm daha";
  const latestTest = overview.reports[0];
  const latestTestStatus = latestTest?.evaluationState === "PENDING"
    ? "Değerlendiriliyor"
    : latestTest?.evaluationState === "FAILED"
      ? "Değerlendirme tamamlanamadı"
      : latestTest?.score == null ? "Puan yok" : dashboardNumber(latestTest.score) + " / 75";
  function choose(session?: ExamSession, datesOnly = false) {
    setLevelOnly(false);
    setChosenSession(session);
    setDateOnly(datesOnly);
    setGoalOpen(true);
  }
  useEffect(() => {
    const refresh = () => setToday(uzbekistanToday());
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <div className="student-home-page"><div className="student-home">
      {goalOpen && (
        <DashboardGoalDialog
          profile={onboarding.data}
          session={chosenSession}
          dateOnly={dateOnly}
          levelOnly={levelOnly}
          sessions={examSessions}
          calendarUnavailable={!officialExams.isSuccess}
          today={today}
          onClose={() => setGoalOpen(false)}
        />
      )}
      <DashboardExamStrip profile={onboarding.data} sessions={visibleExams} today={today} onEdit={() => choose(undefined, true)} unavailable={!onboarding.isSuccess}/>

      <div className="student-home__summary-grid">
        <section
          className="student-home__overview"
          aria-label="Seviye özeti"
          aria-busy={results.isPending}
        >
          {onboarding.isPending && results.isPending ? <p role="status">Bilgileriniz yükleniyor…</p> :
            <DashboardLevelSummary average={overview.average} level={overview.level} skills={overview.skills}
              target={onboarding.data?.targetLevel} currentLevel={onboarding.data?.currentLevel}
              resultsStatus={resultsStatus}
              missingLabel={missingLabel} lowEvidence={overview.lowEvidence}/>}
          <div className="dashboard-target-action">
            <button type="button" disabled={!onboarding.isSuccess}
              className={onboarding.data?.targetLevel ? 'dashboard-edit-icon' : undefined}
              aria-label={onboarding.data?.targetLevel ? 'Hedef seviyenizi değiştir' : undefined}
              title={onboarding.data?.targetLevel ? 'Hedef seviyenizi değiştir' : undefined}
              onClick={() => {
              setChosenSession(undefined);
              setDateOnly(false);
              setLevelOnly(true);
              setGoalOpen(true);
            }}>{onboarding.data?.targetLevel ? <Target size={16} aria-hidden="true"/> : 'Hedef seç'}</button>
          </div>
        </section>
      </div>
      {(results.isError || onboarding.isError) && (
        <div className="student-home__error" role="status">
          <p>
            {results.isError
              ? results.data
                ? "Sonuçlar güncellenemedi. Son yüklenen veriler gösteriliyor."
                : "Sonuçlar yüklenemedi."
              : "Hedef bilgileriniz yüklenemedi."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (results.isError) void results.refetch();
              if (onboarding.isError) void onboarding.refetch();
            }}
          >
            <RefreshCw size={14} />
            Tekrar dene
          </button>
        </div>
      )}

        <section
          className="student-home__skill-section"
          aria-labelledby="home-skill-heading"
          aria-busy={resultsStatus === 'loading'}
        >
          <div className="student-home__section-heading">
            <h2 id="home-skill-heading">Beceriler</h2>
          </div>
          <div className="student-home__skills">
            {overview.skills.map((item) => {
              const change = item.average === null || item.previousAverage === null
                ? null : item.average - item.previousAverage;
              const unchanged = change !== null && Math.abs(change) < 1e-9;
              const changeLabel = change === null || unchanged ? '0'
                : Math.abs(change) < 1 ? '<1' : dashboardNumber(Math.round(Math.abs(change)));
              const changeDescription = unchanged ? 'Önceki ortalamayla aynı'
                : `Önceki ortalamaya göre ${changeLabel === '<1' ? '1 puandan az' : `${changeLabel} puan`} ${change! > 0 ? 'artış' : 'düşüş'}`;
              return (
                <div
                  className="student-home__skill"
                  data-skill={item.key}
                  key={item.key}
                >
                  <span className="student-home__skill-name">
                    <i className="dashboard-skill-dot" aria-hidden="true"/>
                    <span>{item.label}{item.isStale && <small className="dashboard-stale-label"
                      title={`Son test: ${dashboardFullDate(item.lastTestAt!)}`}>Eski sonuç</small>}</span>
                  </span>
                  <span className="student-home__skill-value">
                    <strong>
                      {item.average === null
                        ? "—"
                        : dashboardAverageNumber(item.average)}
                    </strong>
                    {item.average !== null && <small>/ 75</small>}
                    <span>{item.level}</span>
                    {change !== null && <span className="dashboard-skill-change" data-direction={unchanged ? 'same' : change > 0 ? 'up' : 'down'}
                      title={`${changeDescription} · ${dashboardNumber(item.previousAverage!)} → ${dashboardNumber(item.average!)}`}
                      aria-label={changeDescription}>
                      {unchanged ? <Minus size={12}/> : <Triangle size={9} fill="currentColor" strokeWidth={0}/>}{changeLabel}
                    </span>}
                  </span>
                  <span className="student-home__bar" aria-hidden="true">
                    {[38,51,65].map(tick => <span className="dashboard-skill-tick" aria-hidden="true" key={tick} style={{left: `${tick / 75 * 100}%`}}/>)}
                    <i style={{ width: ((item.average ?? 0) / 75) * 100 + "%" }}/>
                  </span>
                  <span className="student-home__skill-count">
                    {resultsStatus === 'loading' ? 'Sonuçlar yükleniyor…' : resultsStatus === 'error' ? 'Sonuçlar yüklenemedi.' : item.sampleCount
                      ? item.sampleCount === 1
                        ? "1 test sonucu"
                        : item.sampleCount + " testin ortalaması"
                      : "Henüz sonuç yok"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

      <div className="student-home__layout">
          <div className="student-home__main">
            {latestTest && (
              <section className="dashboard-latest-test" aria-labelledby="home-latest-test-heading">
                <h2 id="home-latest-test-heading">Son test</h2>
                <span className="dashboard-latest-test__name">{latestTest.kind === "Tam deneme"
                  ? "Tam deneme" : latestTest.sectionLabels.join(" · ")}</span>
                <time dateTime={new Date(latestTest.timestamp).toISOString()}>{dashboardDate(latestTest.timestamp)}</time>
                <strong>{latestTestStatus}</strong>
                <NavLink to={dashboardReportPath(latestTest.result.id)}
                  aria-label="Son testin raporunu aç">Raporu aç <ArrowUpRight size={14}/></NavLink>
              </section>
            )}
          </div>
        {officialExams.isPending ? <p role="status">Sınav takvimi yükleniyor…</p>
        : officialExams.isError ? <p role="alert">Sınav takvimi yüklenemedi. <button onClick={() => void officialExams.refetch()}>Yeniden dene</button></p>
        : <DashboardExamCard
          key={`${onboarding.data?.updatedAt ?? "new"}-${selectedExam?.id ?? "none"}-${selectedExam?.version ?? 0}`}
          sessions={visibleExams}
          profile={onboarding.data}
          today={today}
          onChoose={(session) => choose(session, true)}
          unavailable={!onboarding.isSuccess}
        />}
      </div>
    </div></div>
  );
}
