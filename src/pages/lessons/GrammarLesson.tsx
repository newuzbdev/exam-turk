import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { NavLink, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Headphones,
  Image as ImageIcon,
  ListChecks,
  LoaderCircle,
  PlayCircle,
} from "lucide-react";
import AiPanelShell from "@/components/ai/ai-panel-shell";
import { Surface, tm } from "@/components/tm";
import { useStudentAction } from "@/hooks/use-student-action";
import { cn } from "@/lib/utils";
import {
  learnQueryKeys,
  useCompleteLearnLesson,
  useAskLearnAiTeacher,
  useLearnAiConversationMessages,
  useLearnAiConversations,
  useMyLearnProgress,
  usePublicLearnCourse,
  usePublicLearnLesson,
  useStartLearnLesson,
} from "./learn-api";
import LearnExerciseBlock from "./LearnExerciseBlock";
import RichLessonText from "./RichLessonText";
import type { LearnContentBlock } from "./learn-types";
import {
  canCompleteLearnLesson,
  createProgressByLessonId,
} from "./learn-progress-utils";
import {
  getLearnErrorStatus,
  getLearnLevelLabel,
  getYouTubeEmbedUrl,
  sortContentBlocks,
} from "./learn-utils";

export default function GrammarLesson({
  basePath = "/dersler",
  embeddedInApp = false,
}: {
  basePath?: string;
  embeddedInApp?: boolean;
}) {
  const { level: courseSlug, lessonSlug } = useParams();
  const courseQuery = usePublicLearnCourse(courseSlug);
  const lessonQuery = usePublicLearnLesson(courseSlug, lessonSlug);
  const progressQuery = useMyLearnProgress(embeddedInApp);
  const startMutation = useStartLearnLesson();
  const completeMutation = useCompleteLearnLesson();
  const aiTeacherMutation = useAskLearnAiTeacher();
  const queryClient = useQueryClient();
  const openStudentLesson = useStudentAction();
  const startedLessonRef = useRef<string | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [activeAiConversationId, setActiveAiConversationId] = useState<
    string | null
  >(null);
  const [isStartingNewAiConversation, setIsStartingNewAiConversation] =
    useState(false);
  const lessonId = lessonQuery.data?.id;
  const aiConversationsQuery = useLearnAiConversations(
    lessonId,
    embeddedInApp,
  );
  const aiMessagesQuery = useLearnAiConversationMessages(
    activeAiConversationId,
    embeddedInApp && Boolean(activeAiConversationId),
  );

  useEffect(() => {
    if (
      !embeddedInApp ||
      !lessonId ||
      startedLessonRef.current === lessonId
    ) {
      return;
    }

    startedLessonRef.current = lessonId;
    startMutation.mutate(lessonId);
  }, [embeddedInApp, lessonId, startMutation]);

  useEffect(() => {
    setActiveAiConversationId(null);
    setIsStartingNewAiConversation(false);
  }, [lessonId]);

  useEffect(() => {
    if (!embeddedInApp || !lessonId || isStartingNewAiConversation) {
      return;
    }

    const conversations = aiConversationsQuery.data ?? [];
    if (conversations.length === 0) {
      if (!aiConversationsQuery.isFetching && activeAiConversationId) {
        setActiveAiConversationId(null);
      }
      return;
    }

    const activeConversationStillExists = conversations.some(
      (conversation) => conversation.id === activeAiConversationId,
    );

    if (!activeAiConversationId || !activeConversationStillExists) {
      setActiveAiConversationId(conversations[0].id);
    }
  }, [
    activeAiConversationId,
    aiConversationsQuery.data,
    aiConversationsQuery.isFetching,
    embeddedInApp,
    isStartingNewAiConversation,
    lessonId,
  ]);

  if (courseQuery.isPending || lessonQuery.isPending) {
    return <LessonLoading />;
  }

  if (
    courseQuery.isError ||
    lessonQuery.isError ||
    !courseQuery.data ||
    !lessonQuery.data
  ) {
    const isNotFound =
      getLearnErrorStatus(courseQuery.error) === 404 ||
      getLearnErrorStatus(lessonQuery.error) === 404;

    return (
      <main className={tm.page}>
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <Surface className="p-6">
            <h1 className="text-xl font-semibold text-[var(--tm-text-primary)]">
              {isNotFound ? "Ders bulunamadı" : "Ders yüklenemedi"}
            </h1>
            <p className="mt-2 text-sm text-[var(--tm-text-secondary)]">
              {isNotFound
                ? "Bu ders yayından kaldırılmış veya bağlantısı değişmiş olabilir."
                : "Bağlantı sırasında bir sorun oluştu. Lütfen tekrar deneyin."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <NavLink
                to={courseSlug ? `${basePath}/${courseSlug}` : basePath}
                className={`${tm.subtleButton} inline-flex px-3 py-2 text-sm font-semibold`}
              >
                Konu listesine dön
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  void Promise.all([
                    courseQuery.refetch(),
                    lessonQuery.refetch(),
                  ]);
                }}
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
  const lesson = lessonQuery.data;
  const allLessons = course.modules.flatMap((courseModule) =>
    courseModule.lessons.map((item) => ({
      ...item,
      moduleTitle: courseModule.title,
    })),
  );
  const blocks = sortContentBlocks(lesson.contentBlocks);
  const progressByLessonId = createProgressByLessonId(progressQuery.data ?? []);
  const currentProgress =
    progressByLessonId.get(lesson.id) ??
    (startMutation.data?.lessonId === lesson.id
      ? startMutation.data
      : undefined);
  const requiredExerciseCount = blocks.filter(
    (block) => block.exercise?.isRequired,
  ).length;
  const lessonCanBeCompleted = canCompleteLearnLesson(
    requiredExerciseCount,
    currentProgress,
  );
  const lessonCompleted = currentProgress?.status === "COMPLETED";

  return (
    <main className={tm.page}>
      <section className="border-b border-[var(--tm-border-subtle)] bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8">
          <NavLink
            to={`${basePath}/${course.slug}`}
            className="mb-5 inline-flex items-center text-sm font-medium text-[var(--tm-text-secondary)] hover:text-[var(--tm-text-primary)]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Konu listesine dön
          </NavLink>
          <p className="text-sm font-medium text-[var(--tm-text-secondary)]">
            {getLearnLevelLabel(lesson.course.levelKey, lesson.course.levelLabel)}
            {" · "}
            {lesson.module.title}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-4xl">
            {lesson.title}
          </h1>
          {lesson.summary ? (
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--tm-text-secondary)]">
              {lesson.summary}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--tm-text-tertiary)]">
              <Clock className="h-4 w-4" />
              {lesson.estimatedMinutes} dakika
            </p>
            {embeddedInApp && currentProgress ? (
              <span
                className={`rounded-md px-2 py-1 text-xs font-semibold ${
                  lessonCompleted
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-[var(--tm-bg-muted)] text-[var(--tm-text-secondary)]"
                }`}
              >
                {lessonCompleted
                  ? "Tamamlandı"
                  : `%${currentProgress.progressPercent} tamamlandı`}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section
        className={`mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:px-8 ${
          embeddedInApp ? "" : "lg:grid-cols-[260px_1fr]"
        }`}
      >
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className={embeddedInApp ? "hidden" : "hidden lg:block"}>
            <LessonNavigation
              courseTitle={course.title}
              basePath={basePath}
              courseSlug={course.slug}
              lessons={allLessons}
              activeLessonId={lesson.id}
            />
          </div>
          <details
            className={`group rounded-md border border-[var(--tm-border-subtle)] bg-white ${
              embeddedInApp ? "" : "lg:hidden"
            }`}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[var(--tm-text-secondary)]">
                  Ders listesi
                </p>
                <p className="truncate text-sm font-semibold text-[var(--tm-text-primary)]">
                  {lesson.title}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--tm-text-secondary)] transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-[var(--tm-border-subtle)]">
              <LessonLinks
                basePath={basePath}
                courseSlug={course.slug}
                lessons={allLessons}
                activeLessonId={lesson.id}
                closeOnSelect
              />
            </div>
          </details>
        </aside>

        <article className="min-w-0">
          {!embeddedInApp ? (
            <Surface className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase text-[var(--tm-text-tertiary)]">
                Ders ön izlemesi
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--tm-text-primary)]">
                Bu dersi çalışma alanında aç.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--tm-text-secondary)]">
                Ders içeriğini çalışmak, alıştırmaları çözmek ve ilerlemeni
                kaydetmek için ücretsiz hesabınla oturum aç.
              </p>
              <button
                type="button"
                onClick={() =>
                  openStudentLesson(
                    `/app/dersler/${course.slug}/${lesson.slug}`,
                  )
                }
                className={`${tm.primaryButton} mt-6 inline-flex h-10 items-center px-4 text-sm font-semibold`}
              >
                Derse Başla
              </button>
              <p className="mt-3 text-xs text-[var(--tm-text-tertiary)]">
                Devam etmek için ücretsiz hesap oluşturun.
              </p>
            </Surface>
          ) : (
            <div
              className={cn(
                "transition-[padding] duration-200",
                aiPanelOpen ? "xl:pr-[430px]" : "xl:pr-16",
              )}
            >
              <div className="min-w-0">
                {blocks.length > 0 ? (
                  <div className="space-y-5">
                    {blocks.map((block) => (
                      <LearnBlock
                        key={block.id}
                        block={block}
                        interactive
                      />
                    ))}
                  </div>
                ) : (
                  <Surface className="p-8 text-center">
                    <BookOpen className="mx-auto h-6 w-6 text-[var(--tm-text-tertiary)]" />
                    <p className="mt-3 text-sm text-[var(--tm-text-secondary)]">
                      Bu dersin yayınlanmış içerik blokları henüz hazır değil.
                    </p>
                  </Surface>
                )}

                <LessonCompletion
                  completed={lessonCompleted}
                  canComplete={lessonCanBeCompleted}
                  progressPercent={currentProgress?.progressPercent ?? 10}
                  isPending={completeMutation.isPending}
                  error={completeMutation.error}
                  onComplete={() => completeMutation.mutate(lesson.id)}
                />
              </div>

              <AiPanelShell
                title="AI Öğretmen"
                roleLabel="Ders yardımcısı"
                description="Bu panel ders içeriğine göre açıklama, örnek, mini quiz ve kelime desteği verir."
                actions={[
                  {
                    label: "Bu konuyu açıkla",
                    prompt: "Bu konuyu açıkla",
                    mode: "LESSON_EXPLAIN",
                  },
                  {
                    label: "Daha basit anlat",
                    prompt: "Bu konuyu daha basit anlat",
                    mode: "SIMPLIFY",
                  },
                  {
                    label: "Örnek ver",
                    prompt: "Bu konu için örnek ver",
                    mode: "LESSON_EXAMPLE",
                  },
                  {
                    label: "Mini quiz yap",
                    prompt: "Bu konu için mini quiz yap",
                    mode: "LESSON_MINI_QUIZ",
                  },
                  {
                    label: "Kelimeleri açıkla",
                    prompt: "Bu dersteki önemli kelimeleri açıkla",
                    mode: "VOCAB_EXPLAIN",
                  },
                ]}
                onAsk={(request) =>
                  aiTeacherMutation
                    .mutateAsync({
                      lessonId: lesson.id,
                      mode: request.mode,
                      action: request.action,
                      message: request.message,
                      conversationId: activeAiConversationId ?? undefined,
                    })
                    .then((response) => {
                      if (response.conversationId) {
                        setIsStartingNewAiConversation(false);
                        setActiveAiConversationId(response.conversationId);
                        void queryClient.invalidateQueries({
                          queryKey: learnQueryKeys.aiConversations(lesson.id),
                        });
                        void queryClient.invalidateQueries({
                          queryKey: learnQueryKeys.aiConversationMessages(
                            response.conversationId,
                          ),
                        });
                      }
                      return response;
                    })
                }
                conversations={aiConversationsQuery.data ?? []}
                activeConversationId={activeAiConversationId}
                conversationMessages={aiMessagesQuery.data?.messages ?? []}
                guidedState={aiMessagesQuery.data?.guidedState ?? undefined}
                isLoadingConversations={aiConversationsQuery.isFetching}
                isLoadingMessages={
                  Boolean(activeAiConversationId) && aiMessagesQuery.isFetching
                }
                conversationsError={aiConversationsQuery.isError}
                messagesError={
                  Boolean(activeAiConversationId) && aiMessagesQuery.isError
                }
                onSelectConversation={(conversationId) => {
                  setIsStartingNewAiConversation(false);
                  setActiveAiConversationId(conversationId);
                }}
                onNewConversation={() => {
                  setIsStartingNewAiConversation(true);
                  setActiveAiConversationId(null);
                }}
                onReloadMessages={() => {
                  if (!activeAiConversationId) return;
                  void queryClient.invalidateQueries({
                    queryKey:
                      learnQueryKeys.aiConversationMessages(activeAiConversationId),
                  });
                }}
                onConversationCreated={(conversationId) => {
                  setIsStartingNewAiConversation(false);
                  setActiveAiConversationId(conversationId);
                }}
                desktopOpen={aiPanelOpen}
                onDesktopOpenChange={setAiPanelOpen}
              />
            </div>
          )}
        </article>
      </section>
    </main>
  );
}

function LearnBlock({
  block,
  interactive,
}: {
  block: LearnContentBlock;
  interactive: boolean;
}) {
  switch (block.type) {
    case "HEADING":
      return (
        <header className="pt-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--tm-text-primary)]">
            {block.title || block.text}
          </h2>
        </header>
      );

    case "TEXT":
      return (
        <section className="py-1 sm:py-2">
          {block.title ? (
            <h2 className="mb-3 text-lg font-semibold text-[var(--tm-text-primary)]">
              {block.title}
            </h2>
          ) : null}
          <BlockText text={block.text} />
        </section>
      );

    case "EXAMPLE":
      return (
        <Surface className="bg-[var(--tm-bg-app)] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase text-[var(--tm-text-tertiary)]">
            {block.title || "Örnek"}
          </p>
          <div className="mt-3">
            <BlockText text={block.text} />
          </div>
        </Surface>
      );

    case "CALLOUT":
      return (
        <div className="rounded-md border border-[var(--tm-border-subtle)] border-l-4 border-l-[var(--tm-accent)] bg-white p-5">
          {block.title ? (
            <h3 className="font-semibold text-[var(--tm-text-primary)]">
              {block.title}
            </h3>
          ) : null}
          <div className={block.title ? "mt-2" : ""}>
            <BlockText text={block.text} />
          </div>
        </div>
      );

    case "IMAGE":
      return (
        <Surface className="overflow-hidden">
          {block.mediaUrl ? (
            <img
              src={block.mediaUrl}
              alt={block.title || "Ders görseli"}
              className="max-h-[620px] w-full object-contain"
              loading="lazy"
            />
          ) : (
            <MissingMedia icon={ImageIcon} label="Görsel henüz eklenmemiş." />
          )}
          {block.title || block.text ? (
            <div className="border-t border-[var(--tm-border-subtle)] px-5 py-4">
              {block.title ? (
                <p className="font-medium text-[var(--tm-text-primary)]">{block.title}</p>
              ) : null}
              {block.text ? (
                <p className="mt-1 text-sm text-[var(--tm-text-secondary)]">{block.text}</p>
              ) : null}
            </div>
          ) : null}
        </Surface>
      );

    case "AUDIO":
      return (
        <Surface className="p-5">
          <div className="flex items-center gap-3">
            <Headphones className="h-5 w-5 text-[var(--tm-text-secondary)]" />
            <div>
              <h3 className="font-semibold text-[var(--tm-text-primary)]">
                {block.title || "Dinleme"}
              </h3>
              {block.text ? (
                <p className="mt-1 text-sm text-[var(--tm-text-secondary)]">{block.text}</p>
              ) : null}
            </div>
          </div>
          {block.mediaUrl ? (
            <audio controls preload="metadata" className="mt-4 w-full" src={block.mediaUrl}>
              Tarayıcınız ses oynatmayı desteklemiyor.
            </audio>
          ) : (
            <p className="mt-4 text-sm text-[var(--tm-text-tertiary)]">
              Ses dosyası henüz eklenmemiş.
            </p>
          )}
        </Surface>
      );

    case "VIDEO":
      return <VideoBlock block={block} />;

    case "GRAMMAR_PATTERN":
      return <GrammarPatternBlock block={block} />;

    case "COMMON_MISTAKE":
      return <CommonMistakeBlock block={block} />;

    case "EXAM_TIP":
      return <ExamTipBlock block={block} />;

    case "VOCABULARY_LIST":
      return <VocabularyListBlock block={block} />;

    case "MINI_QUESTION":
    case "FINAL_EXERCISE":
      if (block.exercise) {
        return (
          <LearnExerciseBlock
            exercise={block.exercise}
            interactive={interactive}
          />
        );
      }

      return (
        <Surface className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ListChecks className="mt-0.5 h-5 w-5 text-[var(--tm-text-secondary)]" />
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--tm-text-tertiary)]">
                Alıştırma hazırlanıyor
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--tm-text-primary)]">
                {block.title || "Ders alıştırması"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--tm-text-secondary)]">
                Bu bölüm için soru içeriği henüz yayınlanmadı.
              </p>
            </div>
          </div>
        </Surface>
      );

    default:
      return null;
  }
}

type GrammarPatternRow = {
  label: string;
  form: string;
  example: string;
  note: string;
};

type GrammarPatternExample = {
  text: string;
  explanation: string;
};

type VocabularyItem = {
  word: string;
  meaning: string;
  example: string;
  note: string;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const cleanText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const readArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const readGrammarRows = (value: unknown): GrammarPatternRow[] =>
  readArray(value)
    .map((item) => {
      const row = asRecord(item);
      return row
        ? {
            label: cleanText(row.label),
            form: cleanText(row.form),
            example: cleanText(row.example),
            note: cleanText(row.note),
          }
        : null;
    })
    .filter(
      (row): row is GrammarPatternRow =>
        Boolean(row?.label || row?.form || row?.example || row?.note),
    );

const readGrammarExamples = (value: unknown): GrammarPatternExample[] =>
  readArray(value)
    .map((item) => {
      const example = asRecord(item);
      return example
        ? {
            text: cleanText(example.text),
            explanation: cleanText(example.explanation),
          }
        : null;
    })
    .filter((example): example is GrammarPatternExample =>
      Boolean(example?.text),
    );

const readVocabularyItems = (value: unknown): VocabularyItem[] =>
  readArray(value)
    .map((item) => {
      const row = asRecord(item);
      return row
        ? {
            word: cleanText(row.word),
            meaning: cleanText(row.meaning),
            example: cleanText(row.example),
            note: cleanText(row.note),
          }
        : null;
    })
    .filter((item): item is VocabularyItem =>
      Boolean(item?.word && item?.meaning),
    );

function VisualBlockFallback({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-[var(--tm-border-subtle)] bg-white px-4 py-3 text-sm text-[var(--tm-text-secondary)]">
      {label}
    </div>
  );
}

function GrammarPatternBlock({ block }: { block: LearnContentBlock }) {
  const data = asRecord(block.data);
  const pattern = cleanText(data?.pattern);
  const explanation = cleanText(data?.explanation);
  const rows = readGrammarRows(data?.rows);
  const examples = readGrammarExamples(data?.examples);

  if (!pattern) {
    return <VisualBlockFallback label="Gramer kalıbı henüz hazırlanmadı." />;
  }

  return (
    <section className="rounded-md border border-[var(--tm-border-subtle)] bg-[var(--tm-bg-app)] px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[var(--tm-text-tertiary)]">
            {block.title || "Gramer kalıbı"}
          </p>
          <div className="mt-2 rounded-md border border-[var(--tm-border-subtle)] bg-white px-3 py-2 text-[15px] font-semibold leading-7 text-[var(--tm-text-primary)]">
            <span className="break-words">{pattern}</span>
          </div>
        </div>
      </div>

      {explanation ? (
        <p className="mt-3 text-sm leading-6 text-[var(--tm-text-secondary)]">
          {explanation}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-4">
          <div className="hidden overflow-hidden rounded-md border border-[var(--tm-border-subtle)] bg-white sm:block">
            <div className="grid grid-cols-[1fr_1.1fr_1.6fr] border-b border-[var(--tm-border-subtle)] bg-[var(--tm-bg-muted)] px-3 py-2 text-xs font-semibold text-[var(--tm-text-tertiary)]">
              <span>Parça</span>
              <span>Biçim</span>
              <span>Örnek</span>
            </div>
            {rows.map((row, index) => (
              <div
                key={`${row.label}-${row.form}-${index}`}
                className="grid grid-cols-[1fr_1.1fr_1.6fr] gap-3 border-t border-[var(--tm-border-subtle)] px-3 py-2 text-sm first:border-t-0"
              >
                <span className="break-words font-medium text-[var(--tm-text-primary)]">
                  {row.label || "-"}
                </span>
                <span className="break-words text-[var(--tm-text-secondary)]">
                  {row.form || "-"}
                </span>
                <span className="break-words text-[var(--tm-text-primary)]">
                  {row.example || row.note || "-"}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 sm:hidden">
            {rows.map((row, index) => (
              <div
                key={`${row.label}-${row.form}-mobile-${index}`}
                className="rounded-md border border-[var(--tm-border-subtle)] bg-white p-3 text-sm"
              >
                {row.label ? (
                  <p className="font-semibold text-[var(--tm-text-primary)]">
                    {row.label}
                  </p>
                ) : null}
                {row.form ? (
                  <p className="mt-1 break-words text-[var(--tm-text-secondary)]">
                    {row.form}
                  </p>
                ) : null}
                {row.example ? (
                  <p className="mt-1 break-words text-[var(--tm-text-primary)]">
                    {row.example}
                  </p>
                ) : null}
                {row.note ? (
                  <p className="mt-1 break-words text-xs text-[var(--tm-text-tertiary)]">
                    {row.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {examples.length > 0 ? (
        <div className="mt-4 space-y-2">
          {examples.map((example, index) => (
            <div
              key={`${example.text}-${index}`}
              className="rounded-md bg-white px-3 py-2 text-sm leading-6"
            >
              <p className="break-words font-medium text-[var(--tm-text-primary)]">
                {example.text}
              </p>
              {example.explanation ? (
                <p className="mt-1 break-words text-[var(--tm-text-secondary)]">
                  {example.explanation}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CommonMistakeBlock({ block }: { block: LearnContentBlock }) {
  const data = asRecord(block.data);
  const wrong = cleanText(data?.wrong);
  const correct = cleanText(data?.correct);
  const explanation = cleanText(data?.explanation);

  if (!wrong || !correct) {
    return <VisualBlockFallback label="Hata karşılaştırması henüz hazırlanmadı." />;
  }

  return (
    <section className="rounded-md border border-[var(--tm-border-subtle)] bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold text-[var(--tm-text-tertiary)]">
        {block.title || "Sık hata"}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-red-100 bg-red-50/70 p-3">
          <p className="text-xs font-semibold text-red-700">
            Yanlış
          </p>
          <p className="mt-1 break-words text-sm font-medium leading-6 text-red-900">
            {wrong}
          </p>
        </div>
        <div className="rounded-md border border-emerald-100 bg-emerald-50/70 p-3">
          <p className="text-xs font-semibold text-emerald-700">
            Doğru
          </p>
          <p className="mt-1 break-words text-sm font-medium leading-6 text-emerald-900">
            {correct}
          </p>
        </div>
      </div>
      {explanation ? (
        <p className="mt-3 text-sm leading-6 text-[var(--tm-text-secondary)]">
          {explanation}
        </p>
      ) : null}
    </section>
  );
}

function ExamTipBlock({ block }: { block: LearnContentBlock }) {
  const data = asRecord(block.data);
  const tip = cleanText(data?.tip);
  const skillTagKey = cleanText(data?.skillTagKey);
  const level = cleanText(data?.level);

  if (!tip) {
    return <VisualBlockFallback label="Sınav ipucu henüz hazırlanmadı." />;
  }

  return (
    <section className="rounded-md border border-amber-100 bg-amber-50/70 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-amber-800">
          {block.title || "Sınav ipucu"}
        </span>
        {level ? (
          <span className="rounded bg-white/70 px-2 py-0.5 text-xs font-medium text-amber-800">
            {level}
          </span>
        ) : null}
        {skillTagKey ? (
          <span className="max-w-full rounded bg-white/70 px-2 py-0.5 text-xs font-medium text-amber-800">
            <span className="break-words">{skillTagKey}</span>
          </span>
        ) : null}
      </div>
      <p className="mt-2 break-words text-sm leading-6 text-amber-950">
        {tip}
      </p>
    </section>
  );
}

function VocabularyListBlock({ block }: { block: LearnContentBlock }) {
  const data = asRecord(block.data);
  const items = readVocabularyItems(data?.items);

  if (items.length === 0) {
    return <VisualBlockFallback label="Kelime listesi henüz hazırlanmadı." />;
  }

  return (
    <section className="rounded-md border border-[var(--tm-border-subtle)] bg-white p-4 sm:p-5">
      <p className="text-xs font-semibold text-[var(--tm-text-tertiary)]">
        {block.title || "Kelime listesi"}
      </p>
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <div
            key={`${item.word}-${index}`}
            className="rounded-md border border-[var(--tm-border-subtle)] bg-[var(--tm-bg-app)] px-3 py-2"
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="break-words text-sm font-semibold text-[var(--tm-text-primary)]">
                {item.word}
              </p>
              <p className="break-words text-sm text-[var(--tm-text-secondary)]">
                {item.meaning}
              </p>
            </div>
            {item.example ? (
              <p className="mt-2 break-words text-sm leading-6 text-[var(--tm-text-primary)]">
                {item.example}
              </p>
            ) : null}
            {item.note ? (
              <p className="mt-1 break-words text-xs leading-5 text-[var(--tm-text-tertiary)]">
                {item.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function LessonCompletion({
  completed,
  canComplete,
  progressPercent,
  isPending,
  error,
  onComplete,
}: {
  completed: boolean;
  canComplete: boolean;
  progressPercent: number;
  isPending: boolean;
  error: unknown;
  onComplete: () => void;
}) {
  return (
    <Surface className="mt-6 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--tm-text-primary)]">
            {completed ? "Ders tamamlandı" : "Dersi bitirdin mi?"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--tm-text-secondary)]">
            {completed
              ? "Bu ders ilerleme kaydında tamamlandı olarak görünüyor."
              : canComplete
                ? "Dersi tamamlayarak ilerleme kaydını güncelle."
                : `Zorunlu alıştırmaları geçtikten sonra tamamlayabilirsin. Şu an %${progressPercent}.`}
          </p>
          {error ? (
            <p className="mt-2 text-sm font-medium text-red-700">
              {getCompleteErrorMessage(error)}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onComplete}
          disabled={completed || !canComplete || isPending}
          className={`${tm.primaryButton} inline-flex h-10 shrink-0 items-center justify-center gap-2 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {isPending ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Kaydediliyor
            </>
          ) : completed ? (
            <>
              <Check className="h-4 w-4" />
              Tamamlandı
            </>
          ) : (
            "Dersi tamamla"
          )}
        </button>
      </div>
    </Surface>
  );
}

const getCompleteErrorMessage = (error: unknown) => {
  const status = (
    error as {
      response?: { status?: number };
    }
  )?.response?.status;
  return status === 409
    ? "Önce zorunlu alıştırmaları geçmelisin."
    : "Ders tamamlanamadı. Lütfen tekrar dene.";
};

function BlockText({ text }: { text: string | null }) {
  return <RichLessonText text={text} />;
}

function VideoBlock({ block }: { block: LearnContentBlock }) {
  const embedUrl = block.mediaUrl ? getYouTubeEmbedUrl(block.mediaUrl) : null;

  return (
    <Surface className="overflow-hidden">
      <div className="aspect-video bg-[var(--tm-bg-app)]">
        {embedUrl ? (
          <iframe
            className="h-full w-full"
            src={embedUrl}
            title={block.title || "Video ders"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : block.mediaUrl ? (
          <video controls preload="metadata" className="h-full w-full bg-black" src={block.mediaUrl}>
            Tarayıcınız video oynatmayı desteklemiyor.
          </video>
        ) : (
          <MissingMedia icon={PlayCircle} label="Video henüz eklenmemiş." />
        )}
      </div>
      {block.title || block.text ? (
        <div className="border-t border-[var(--tm-border-subtle)] px-5 py-4">
          {block.title ? (
            <h2 className="font-semibold text-[var(--tm-text-primary)]">{block.title}</h2>
          ) : null}
          {block.text ? (
            <p className="mt-1 text-sm text-[var(--tm-text-secondary)]">{block.text}</p>
          ) : null}
        </div>
      ) : null}
    </Surface>
  );
}

function MissingMedia({
  icon: Icon,
  label,
}: {
  icon: typeof PlayCircle;
  label: string;
}) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center text-[var(--tm-text-tertiary)]">
      <Icon className="h-7 w-7" />
      <p className="mt-2 text-sm">{label}</p>
    </div>
  );
}

type LessonNavigationItem = {
  id: string;
  slug: string;
  title: string;
};

function LessonNavigation({
  courseTitle,
  basePath,
  courseSlug,
  lessons,
  activeLessonId,
}: {
  courseTitle: string;
  basePath: string;
  courseSlug: string;
  lessons: LessonNavigationItem[];
  activeLessonId: string;
}) {
  return (
    <Surface>
      <div className="px-3 py-3">
        <p className="text-sm font-semibold text-[var(--tm-text-primary)]">
          {courseTitle}
        </p>
        <p className="mt-1 text-xs text-[var(--tm-text-secondary)]">
          {lessons.length} ders
        </p>
      </div>
      <div className="border-t border-[var(--tm-border-subtle)]">
        <LessonLinks
          basePath={basePath}
          courseSlug={courseSlug}
          lessons={lessons}
          activeLessonId={activeLessonId}
        />
      </div>
    </Surface>
  );
}

function LessonLinks({
  basePath,
  courseSlug,
  lessons,
  activeLessonId,
  closeOnSelect = false,
}: {
  basePath: string;
  courseSlug: string;
  lessons: LessonNavigationItem[];
  activeLessonId: string;
  closeOnSelect?: boolean;
}) {
  return (
    <div className="max-h-80 overflow-y-auto p-1.5 lg:max-h-[calc(100vh-12rem)]">
      {lessons.map((item, index) => {
        const active = item.id === activeLessonId;
        return (
          <NavLink
            key={item.id}
            to={`${basePath}/${courseSlug}/${item.slug}`}
            onClick={(event) => {
              if (!closeOnSelect) return;
              event.currentTarget.closest("details")?.removeAttribute("open");
            }}
            className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm transition ${
              active
                ? "bg-[var(--tm-bg-active)] text-[var(--tm-text-primary)]"
                : "text-[var(--tm-text-primary)] hover:bg-[var(--tm-bg-hover)]"
            }`}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-medium text-[var(--tm-text-secondary)]">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">
              {item.title}
            </span>
            {active ? (
              <PlayCircle className="h-4 w-4 shrink-0 text-[var(--tm-text-secondary)]" />
            ) : null}
          </NavLink>
        );
      })}
    </div>
  );
}

function LessonLoading() {
  return (
    <main className={tm.page}>
      <div className="mx-auto max-w-7xl animate-pulse px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-5 w-32 rounded bg-[var(--tm-bg-muted)]" />
        <div className="mt-5 h-10 w-2/3 rounded bg-[var(--tm-bg-muted)]" />
        <div className="mt-8 h-64 rounded-md bg-[var(--tm-bg-app)]" />
      </div>
    </main>
  );
}
