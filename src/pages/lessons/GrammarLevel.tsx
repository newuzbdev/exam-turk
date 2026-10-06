import { NavLink, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock } from "lucide-react";
import { Surface, tm } from "@/components/tm";
import { useMyLearnProgress, usePublicLearnCourse } from "./learn-api";
import { createProgressByLessonId } from "./learn-progress-utils";
import { getLearnLevelLabel } from "./learn-utils";

export default function GrammarLevel({
  basePath = "/dersler",
  studentMode = false,
}: {
  basePath?: string;
  studentMode?: boolean;
}) {
  const { level: courseSlug } = useParams();
  const courseQuery = usePublicLearnCourse(courseSlug);
  const progressQuery = useMyLearnProgress(studentMode);

  if (courseQuery.isPending) {
    return <CourseLoading />;
  }

  if (courseQuery.isError || !courseQuery.data) {
    return (
      <main className={tm.page}>
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <Surface className="p-6">
            <h1 className="text-xl font-semibold text-[var(--tm-text-primary)]">
              Kurs bulunamadı
            </h1>
            <p className="mt-2 text-sm text-[var(--tm-text-secondary)]">
              Kurs yayından kaldırılmış veya şu anda yüklenemiyor olabilir.
            </p>
            <div className="mt-5 flex gap-3">
              <NavLink to={basePath} className={`${tm.subtleButton} px-3 py-2 text-sm font-semibold`}>
                Derslere dön
              </NavLink>
              <button
                type="button"
                onClick={() => courseQuery.refetch()}
                className={`${tm.primaryButton} px-3 py-2 text-sm font-semibold`}
              >
                Tekrar dene
              </button>
            </div>
          </Surface>
        </div>
      </main>
    );
  }

  const course = courseQuery.data;
  const lessonCount = course.modules.reduce(
    (total, courseModule) => total + courseModule.lessons.length,
    0,
  );
  const totalMinutes = course.modules.reduce(
    (total, courseModule) =>
      total +
      courseModule.lessons.reduce(
        (moduleTotal, lesson) => moduleTotal + lesson.estimatedMinutes,
        0,
      ),
    0,
  );
  const progressByLessonId = createProgressByLessonId(progressQuery.data ?? []);

  return (
    <main className={tm.page}>
      <section className="border-b border-[var(--tm-border-subtle)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <NavLink
            to={basePath}
            className="mb-5 inline-flex items-center text-sm font-medium text-[var(--tm-text-secondary)] hover:text-[var(--tm-text-primary)]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Derslere dön
          </NavLink>

          <p className="text-sm font-semibold text-[var(--tm-text-secondary)]">
            {getLearnLevelLabel(course.levelKey, course.levelLabel)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-4xl">
            {course.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--tm-text-secondary)]">
            {course.description || "Bu kursun yayınlanmış modül ve dersleri."}
          </p>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--tm-text-secondary)]">
            <span>{course.modules.length} modül</span>
            <span>{lessonCount} ders</span>
            <span>{totalMinutes} dakika</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Surface className="bg-[var(--tm-bg-app)] p-2">
            {course.modules.length > 0 ? (
              course.modules.map((courseModule) => (
                <a
                  key={courseModule.id}
                  href={`#module-${courseModule.slug}`}
                  className="block rounded-md px-3 py-3 transition hover:bg-[var(--tm-bg-hover)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--tm-text-primary)]">
                      {courseModule.title}
                    </span>
                    <span className="text-xs text-[var(--tm-text-secondary)]">
                      {courseModule.lessons.length}
                    </span>
                  </div>
                </a>
              ))
            ) : (
              <p className="px-3 py-4 text-sm text-[var(--tm-text-secondary)]">
                Yayınlanmış modül yok.
              </p>
            )}
          </Surface>
        </aside>

        <div className="space-y-8">
          {course.modules.length > 0 ? (
            course.modules.map((courseModule) => (
              <section
                key={courseModule.id}
                id={`module-${courseModule.slug}`}
                className="scroll-mt-24"
              >
                <div className="mb-3">
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="text-xl font-semibold text-[var(--tm-text-primary)]">
                      {courseModule.title}
                    </h2>
                    <span className="text-sm text-[var(--tm-text-secondary)]">
                      {courseModule.lessons.length} ders
                    </span>
                  </div>
                  {courseModule.description ? (
                    <p className="mt-2 text-sm leading-6 text-[var(--tm-text-secondary)]">
                      {courseModule.description}
                    </p>
                  ) : null}
                </div>

                <Surface className="overflow-hidden">
                  {courseModule.lessons.length > 0 ? (
                    courseModule.lessons.map((lesson, index) => {
                      const progress = progressByLessonId.get(lesson.id);

                      return (
                        <NavLink
                          key={lesson.id}
                          to={`${basePath}/${course.slug}/${lesson.slug}`}
                          className="group grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-[var(--tm-border-subtle)] px-4 py-3 transition last:border-b-0 hover:bg-[var(--tm-bg-hover)] sm:grid-cols-[32px_1fr_auto_20px] sm:px-5"
                        >
                          <span className="text-right text-xs font-medium tabular-nums text-[var(--tm-text-tertiary)]">
                            {progress?.status === "COMPLETED" ? (
                              <Check className="ml-auto h-4 w-4 text-emerald-600" />
                            ) : (
                              index + 1
                            )}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium leading-6 text-[var(--tm-text-primary)] sm:text-[15px]">
                              {lesson.title}
                            </h3>
                            <p className="truncate text-xs text-[var(--tm-text-secondary)]">
                              {progress
                                ? progress.status === "COMPLETED"
                                  ? "Tamamlandı"
                                  : `%${progress.progressPercent} tamamlandı`
                                : lesson.summary}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--tm-text-tertiary)]">
                            <Clock className="h-3.5 w-3.5" />
                            {lesson.estimatedMinutes} dk
                          </span>
                          <ArrowRight className="hidden h-3.5 w-3.5 text-[var(--tm-text-tertiary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--tm-text-primary)] sm:block" />
                        </NavLink>
                      );
                    })
                  ) : (
                    <p className="px-5 py-6 text-sm text-[var(--tm-text-secondary)]">
                      Bu modülde henüz yayınlanmış ders yok.
                    </p>
                  )}
                </Surface>
              </section>
            ))
          ) : (
            <Surface className="p-8 text-center">
              <BookOpen className="mx-auto h-6 w-6 text-[var(--tm-text-tertiary)]" />
              <p className="mt-3 text-sm text-[var(--tm-text-secondary)]">
                Bu kursun yayınlanmış içeriği henüz hazır değil.
              </p>
            </Surface>
          )}
        </div>
      </section>
    </main>
  );
}

function CourseLoading() {
  return (
    <main className={tm.page}>
      <div className="mx-auto max-w-6xl animate-pulse px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-5 w-28 rounded bg-[var(--tm-bg-muted)]" />
        <div className="mt-6 h-10 w-2/3 rounded bg-[var(--tm-bg-muted)]" />
        <div className="mt-4 h-20 max-w-2xl rounded bg-[var(--tm-bg-app)]" />
      </div>
    </main>
  );
}
