import { useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { ArrowUpRight, Info, X } from "lucide-react";
import { useStudentLessonsEnabled } from "@/config/studentFeatures";
import { useDashboardCalendar } from "./dashboard-calendar-api";
import "./dashboard-study-calendar.css";

const dayLabel = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortDayLabel = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function DashboardStudyCalendar({ today, latestTestHref }: { today: string; latestTestHref?: string }) {
  const query = useDashboardCalendar(today);
  const data = query.data;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedDate, setFocusedDate] = useState<string>();
  const [selectedDate, setSelectedDate] = useState<string>();
  const lessons=useStudentLessonsEnabled();
  const days = useMemo(() => {
    if (!data) return [];
    const records = new Map(data.days.map((day) => [day.date, day.activities]));
    const start = new Date(`${today}T00:00:00Z`).getTime() - 27 * 86_400_000;
    return Array.from({ length: 28 }, (_, index) => {
      const date = new Date(start + index * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const future = date > today;
      return {
        date,
        future,
        activities: future ? [] : (records.get(date) ?? []),
      };
    });
  }, [data, today]);
  const selected = days.find((day) => day.date === selectedDate);
  const focusDate =
    focusedDate && days.some((day) => day.date === focusedDate && !day.future)
      ? focusedDate
      : today;
  const recordedDays = days.filter((day) => day.activities.length > 0).length;
  const latestDay = [...days].reverse().find((day) => day.activities.length > 0);
  const latestActivity = latestDay?.activities[0];
  const repeatsLatestTest = latestActivity?.kind === 'test' && latestTestHref
    && latestActivity.href.split(/[?#]/)[0] === latestTestHref.split(/[?#]/)[0];

  return (
    <section
      className="student-home__study student-home__study--compact"
      aria-labelledby="home-study-title"
      aria-busy={query.isPending}
    >
      <div className="student-home__study-heading">
        <div className="student-home__study-title">
          <h2 id="home-study-title">Çalışma ritmi</h2>
          <details className="student-home__estimate-note">
            <summary aria-label="Çalışma günleri nasıl belirleniyor?">
              <Info size={14} />
            </summary>
            <div>
              <strong>Her kutu bir gün</strong>
              <p>
                Tamamladığınız test, pratik, alıştırma veya ders o günü yeşil
                yapar. Yalnızca giriş yapmak sayılmaz.
              </p>
              <p>Yeşilin tonu o günkü kayıt sayısını gösterir.</p>
              {(!data || !data.historyComplete) && (
                <p>
                  Eski kayıtlar eksik olabilir. Kayıt olmayan günler
                  çalışmadığınız anlamına gelmez.
                </p>
              )}
            </div>
          </details>
        </div>
        <nav
          className="student-home__study-links"
          aria-label="Çalışmaya devam edin"
        >
          {lessons.enabled ? (
            <NavLink to="/app/dersler">
              Dersler <ArrowUpRight size={13} />
            </NavLink>
          ) : (
            <span aria-disabled="true" className="cursor-not-allowed text-[var(--tm-text-tertiary)]">
              Dersler <span className="text-[10px]">Yakında</span>
            </span>
          )}
          <NavLink to="/app/pratik">
            Pratik <ArrowUpRight size={13} />
          </NavLink>
        </nav>
      </div>
      {query.isPending ? (
        <p className="student-home__study-state" role="status">
          Çalışma günleriniz yükleniyor…
        </p>
      ) : !data ? (
        <div className="student-home__study-state" role="status">
          <p>Çalışma günleri yüklenemedi.</p>
          <button
            className="student-home__text-button"
            type="button"
            onClick={() => void query.refetch()}
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        <>
          <div className="student-home__study-body">
            <div className="student-home__study-heatmap">
                <div
                  className="student-home__study-days"
                  role="group"
                  aria-label="Son 4 haftanın çalışma günleri"
                >
                  {days.map((day, index) => {
                    const label = dayLabel.format(
                      new Date(`${day.date}T00:00:00Z`),
                    );
                    const description = day.future
                      ? "henüz gelmedi"
                      : day.activities.length
                        ? `${day.activities.length} çalışma kaydı`
                        : "çalışma kaydı yok";
                    return (
                      <button
                        key={day.date}
                        type="button"
                        ref={(element) => {
                          buttons.current[index] = element;
                        }}
                        data-calendar-day={day.date}
                        data-recorded={day.activities.length > 0}
                        data-level={Math.min(day.activities.length, 3)}
                        data-today={day.date === today}
                        disabled={day.future}
                        aria-label={`${label}, ${description}`}
                        title={`${label} · ${description}`}
                        aria-pressed={selectedDate === day.date}
                        tabIndex={day.date === focusDate ? 0 : -1}
                        onFocus={() => setFocusedDate(day.date)}
                        onClick={() =>
                          setSelectedDate(
                            selectedDate === day.date ? undefined : day.date,
                          )
                        }
                        onKeyDown={(event) => {
                          const moves: Record<string, number> = {
                            ArrowLeft: -1,
                            ArrowRight: 1,
                            ArrowUp: -1,
                            ArrowDown: 1,
                          };
                          if (event.key === "Escape") {
                            setSelectedDate(undefined);
                            return;
                          }
                          let next = index;
                          if (event.key in moves) next += moves[event.key];
                          else if (event.key === "Home") next = 0;
                          else if (event.key === "End")
                            next = days.findIndex(
                              (item) => item.date === today,
                            );
                          else return;
                          event.preventDefault();
                          if (next >= 0 && next < days.length && !days[next].future)
                            buttons.current[next]?.focus();
                        }}
                      >
                        <span aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
            </div>
            <div className="student-home__study-summary">
              <p className="student-home__study-count">
                {recordedDays ? (
                  <>Son 4 haftada <strong>{recordedDays} gün</strong> çalıştınız.</>
                ) : (
                  "Son 4 haftada çalışma kaydı yok"
                )}
              </p>
              {latestDay && !repeatsLatestTest && (
                <div className="student-home__study-latest">
                  <span>
                    Son çalışma · <time dateTime={latestDay.date}>
                      {shortDayLabel.format(
                        new Date(`${latestDay.date}T00:00:00Z`),
                      )}
                    </time>
                  </span>
                  <NavLink to={latestDay.activities[0].href}>
                    {latestDay.activities[0].title}
                    <ArrowUpRight size={14} />
                  </NavLink>
                </div>
              )}
            </div>
          </div>
          {query.isError && (
            <p className="student-home__study-stale" role="status">
              Güncellenemedi. Son kayıtlar gösteriliyor.{" "}
              <button
                type="button"
                className="student-home__text-button"
                onClick={() => void query.refetch()}
              >
                Tekrar dene
              </button>
            </p>
          )}
          {selected && (
            <div className="student-home__study-detail" aria-live="polite">
              <div className="student-home__section-heading">
                <h3>
                  {dayLabel.format(new Date(`${selected.date}T00:00:00Z`))}
                </h3>
                <button
                  type="button"
                  aria-label="Gün ayrıntısını kapat"
                  onClick={() => {
                    setSelectedDate(undefined);
                    buttons.current[days.indexOf(selected)]?.focus();
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              {selected.activities.length ? (
                <ul>
                  {selected.activities.map((activity) => (
                    <li key={activity.id}>
                      <NavLink to={activity.href}>
                        {activity.title}
                        <ArrowUpRight size={14} />
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Bu gün için kayıt bulunmuyor.</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
