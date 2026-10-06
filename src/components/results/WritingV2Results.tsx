import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent,
} from "react";
import {
  ChevronDown,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WritingRichText from "@/components/writing-test/WritingRichText";
import { maskWritingReportText } from "./writing-language-mask";
import RawScoreHelp from "./RawScoreHelp";
import { countWritingWords } from "@/components/writing-test/writing-v2";
import {
  buildWritingReviewItems,
  buildWritingCorrectionSentenceContexts,
  normalizeWritingFeedbackForDisplay,
  splitWritingFeedbackEmphasis,
  splitWritingFeedbackHighlights,
  splitWritingFeedbackInlineCode,
  diffWritingCorrection,
  getWritingCorrectionChangePresentation,
  getWritingCorrectionContrastsForDisplay,
  getWritingGeneralEvaluationForDisplay,
  getWritingReviewDetails,
  locateWritingReviewItemRanges,
  partitionWritingReviewRanges,
  type WritingReviewItem,
  type WritingReviewTextRange,
  writingCorrectionCategoryLabel,
} from "@/components/results/writing-result-display";
import type { WritingRichTextNode } from "@/services/writingTest.service";

type TaskCode = "TASK_1_1" | "TASK_1_2" | "TASK_2";
const visibleWritingFeedback = (value: unknown) =>
  maskWritingReportText(normalizeWritingFeedbackForDisplay(value));
type TaskKey = "bolum_1_1" | "bolum_1_2" | "bolum_2";

interface WritingV2Correction {
  errorTitle?: string | null;
  issueKind?: "objective_error" | "register_issue" | "naturalness";
  category?: string;
  sourceUnitId?: string;
  original?: string;
  corrected?: string;
  reason?: string;
  contrast?: {
    left?: string;
    right?: string;
    explanation?: string;
  } | null;
  examples?: string[];
  naturalAlternative?: string;
  additionalOccurrences?: Array<{
    sourceUnitId?: string;
    original?: string;
    corrected?: string;
  }>;
}

type WritingV2EvidenceType = "strength" | "issue" | "development";

interface WritingV2Evidence {
  type?: WritingV2EvidenceType;
  criterion?: string;
  sourceUnitId?: string | null;
  original?: string | null;
  explanation?: string;
  suggestion?: string;
  exampleSentence?: string;
}

type WritingV2ReviewItem = WritingReviewItem;

interface WritingV2TaskFeedback {
  puan?: number;
  wordCount?: number;
  kriterler?: Record<string, string>;
  metinKaniti?: WritingV2Evidence[];
  duzeltmeler?: WritingV2Correction[];
  sourceUnits?: Array<{
    id?: string;
    start?: number;
    end?: number;
    text?: string;
  }>;
}

interface WritingV2Feedback {
  schemaVersion?: number;
  feedbackComplete?: boolean;
  evaluationStatus?: string;
  ham_puan?: number;
  cefr_puan?: number;
  seviye?: string;
  wordCounts?: Record<string, number>;
  tasks?: Partial<Record<TaskCode, WritingV2TaskFeedback>>;
  bolumler?: Partial<Record<TaskKey, WritingV2TaskFeedback>>;
  general?: string;
  genel_degerlendirme?: string;
}

interface WritingV2Answer {
  questionId?: string | null;
  questionText?: string;
  userAnswer?: string;
  answer?: string;
  taskKey?: string | null;
  taskCode?: string | null;
  subPart?: {
    label?: string | null;
    description?: string | null;
    question?: string | null;
    taskCode?: string | null;
    promptJson?: WritingRichTextNode | null;
    wordMin?: number | null;
    wordMax?: number | null;
    maxRawScore?: number | null;
  } | null;
}

export interface WritingV2ResultData {
  id?: string;
  submissionId?: string;
  score?: number | null;
  aiFeedback?: unknown;
  evaluationStatus?: string;
  evaluationErrorCode?: string | null;
  evaluationAttempts?: number;
  canRetryEvaluation?: boolean;
  answers?: WritingV2Answer[];
  questions?: WritingV2Answer[];
  writingTest?: {
    formatVersion?: number;
    sourceEmail?: WritingRichTextNode | null;
  };
  test?: {
    formatVersion?: number;
    sourceEmail?: WritingRichTextNode | null;
  };
}

interface WritingV2ResultsProps {
  data: WritingV2ResultData;
  showOverallSummary?: boolean;
  summaryMode?: "full" | "general-only";
  retrying?: boolean;
  onRetry?: () => void | Promise<void>;
}

const TASK_DEFINITIONS: Array<{
  code: TaskCode;
  key: TaskKey;
  label: string;
  maxScore: number;
  fallbackMin: number;
  fallbackMax: number;
}> = [
  {
    code: "TASK_1_1",
    key: "bolum_1_1",
    label: "Görev 1.1",
    maxScore: 5,
    fallbackMin: 50,
    fallbackMax: 50,
  },
  {
    code: "TASK_1_2",
    key: "bolum_1_2",
    label: "Görev 1.2",
    maxScore: 5,
    fallbackMin: 120,
    fallbackMax: 150,
  },
  {
    code: "TASK_2",
    key: "bolum_2",
    label: "Bölüm 2",
    maxScore: 6,
    fallbackMin: 180,
    fallbackMax: 200,
  },
];

export const shouldForwardWritingPanelWheel = (
  deltaY: number,
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
) => {
  if (deltaY === 0) return false;
  if (deltaY < 0) return scrollTop <= 0;
  return scrollTop + clientHeight >= scrollHeight - 1;
};

const forwardWritingPanelWheel = (event: WheelEvent<HTMLElement>) => {
  const element = event.currentTarget;
  if (
    !shouldForwardWritingPanelWheel(
      event.deltaY,
      element.scrollTop,
      element.clientHeight,
      element.scrollHeight,
    )
  ) {
    return;
  }

  event.preventDefault();
  const pageScroller = document.scrollingElement ?? document.documentElement;
  pageScroller.scrollTop += event.deltaY;
  pageScroller.scrollLeft += event.deltaX;
};

const CRITERIA = [
  ["taskAchievement", "Görevi karşılama"],
  ["toneAndRegister", "Üslup ve hitap"],
  ["coherenceAndOrganisation", "Tutarlılık ve düzen"],
  ["lexicalResource", "Kelime kullanımı"],
  ["languageAccuracy", "Dil doğruluğu"],
] as const;

const evidenceTypeLabel = (item: WritingV2ReviewItem) => {
  if (item.type === "strength") return "Başarılı nokta";
  if (item.type === "development") return "Geliştirme önerisi";
  return item.category
    ? writingCorrectionCategoryLabel(item.category)
    : "Sorun";
};

const evidenceLabelClass = (type: WritingV2EvidenceType) => {
  if (type === "strength") {
    return "border border-[#d9e8d6] bg-[#f3f8f1] text-[#2f6f3d]";
  }
  if (type === "development") {
    return "border border-[#eadfc5] bg-[#fbf8ef] text-[#7a5b19]";
  }
  return "bg-[#f7f7f5] text-[#242424]";
};

const evidenceHighlightClass = (
  item: WritingV2ReviewItem,
  selected: boolean,
) => {
  if (selected) return "bg-[#eeeeec]";
  if (item.type === "strength") {
    return "bg-[#e7f3e5] hover:bg-[#dbeed8]";
  }
  if (item.type === "development") {
    return "bg-[#fff1c9] hover:bg-[#fbe8b4]";
  }
  return "bg-[#fbe7e5] hover:bg-[#f8dcd9]";
};

const unwrapFeedback = (value: unknown): WritingV2Feedback | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const nested =
    source.aiFeedback ||
    source.ai_feedback ||
    source.feedback ||
    source.assessment;
  if (nested && typeof nested === "object") return nested as WritingV2Feedback;
  return source as WritingV2Feedback;
};

export const isWritingV2Result = (
  value: WritingV2ResultData | null | undefined,
) => {
  const feedback = unwrapFeedback(value?.aiFeedback);
  return (
    Number(feedback?.schemaVersion) === 3 ||
    Number(feedback?.schemaVersion) === 2 ||
    Number(value?.writingTest?.formatVersion) === 2 ||
    Number(value?.test?.formatVersion) === 2
  );
};

const resolveTaskCode = (answer: WritingV2Answer): TaskCode | null => {
  const explicit = String(
    answer.taskCode || answer.subPart?.taskCode || "",
  ).toUpperCase();
  if (
    explicit === "TASK_1_1" ||
    explicit === "TASK_1_2" ||
    explicit === "TASK_2"
  ) {
    return explicit;
  }

  const taskKey = String(answer.taskKey || "").toLowerCase();
  if (taskKey === "bolum_1_1") return "TASK_1_1";
  if (taskKey === "bolum_1_2") return "TASK_1_2";
  if (taskKey === "bolum_2") return "TASK_2";
  return null;
};

const answerText = (answer?: WritingV2Answer) =>
  String(answer?.userAnswer ?? answer?.answer ?? "");

const wordTarget = (min: number, max: number) =>
  min === max ? `${min} kelime` : `${min}–${max} kelime`;

const finiteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeLevelLabel = (value: unknown) => {
  const normalized = String(value || "B1 altı")
    .trim()
    .replace(/\s+/g, " ");
  const upper = normalized.toUpperCase();
  if (/\bC(?:1|2)\b/.test(upper)) return "C1";
  if (/\bB2\b/.test(upper)) return "B2";
  if (upper === "B1") return "B1";
  if (
    upper === "A0" ||
    upper === "B1_ALTI" ||
    upper === "B1 ALTI" ||
    /^B1[\s_-]*alt[ıi]$/i.test(normalized)
  ) {
    return "B1 altı";
  }
  return "B1 altı";
};

const resultStatus = (
  data: WritingV2ResultData,
  feedback: WritingV2Feedback | null,
) =>
  String(
    data.evaluationStatus || feedback?.evaluationStatus || "PENDING",
  ).toUpperCase();

const answersByTask = (data: WritingV2ResultData) => {
  const allAnswers = Array.isArray(data.answers)
    ? data.answers
    : Array.isArray(data.questions)
      ? data.questions
      : [];
  const answerMap = new Map<TaskCode, WritingV2Answer>();
  for (const answer of allAnswers) {
    const code = resolveTaskCode(answer);
    if (code && !answerMap.has(code)) answerMap.set(code, answer);
  }
  return answerMap;
};

const taskFeedback = (
  feedback: WritingV2Feedback | null,
  code: TaskCode,
  key: TaskKey,
) => feedback?.tasks?.[code] || feedback?.bolumler?.[key] || {};

const taskWordCount = (
  feedback: WritingV2Feedback | null,
  task: WritingV2TaskFeedback,
  key: TaskKey,
  text: string,
) =>
  finiteNumber(task.wordCount) ??
  finiteNumber(feedback?.wordCounts?.[key]) ??
  countWritingWords(text);

function AnnotatedWritingAnswer({
  text,
  items,
  ranges,
  selectedIndex,
  onSelect,
  registerItem,
}: {
  text: string;
  items: WritingV2ReviewItem[];
  ranges: WritingReviewTextRange[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  registerItem: (
    index: number,
    occurrenceIndex: number,
    element: HTMLSpanElement | null,
  ) => void;
}) {
  // Mask before slicing: an annotation can cover only part of a word.
  const visibleText = maskWritingReportText(text);
  if (!text.trim()) {
    return (
      <p className="text-[15px] leading-6 text-[var(--tm-text-secondary)]">
        Bu görev yanıtlanmadı.
      </p>
    );
  }

  if (ranges.length === 0) {
    return (
      <p className="whitespace-pre-wrap break-words text-[16px] font-normal [line-height:26px] text-[#242424]">
        {visibleText}
      </p>
    );
  }

  const output: ReactNode[] = [];
  let cursor = 0;
  for (const range of partitionWritingReviewRanges(ranges, selectedIndex)) {
    if (range.start > cursor) output.push(visibleText.slice(cursor, range.start));
    const selected = selectedIndex === range.itemIndex;
    const originalText = visibleText.slice(range.start, range.end);
    output.push(
      <span
        key={`${range.start}-${range.itemIndex}-${range.occurrenceIndex}`}
        ref={(element) =>
          registerItem(range.itemIndex, range.occurrenceIndex, element)
        }
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label="Geri bildirimi incele"
        onClick={() => onSelect(range.itemIndex)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onSelect(range.itemIndex);
        }}
        className={`reading-review-evidence group cursor-pointer box-decoration-clone rounded-[2px] px-[2px] py-[1px] text-left text-[#242424] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#242424] focus-visible:ring-offset-1 ${evidenceHighlightClass(
          items[range.itemIndex],
          selected,
        )}`}
      >
        {originalText}
      </span>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) output.push(visibleText.slice(cursor));

  return (
    <p className="whitespace-pre-wrap break-words text-[16px] font-normal [line-height:26px] text-[#242424]">
      {output}
    </p>
  );
}

function WritingCorrectionDiff({
  original,
  corrected,
  issueKind,
}: {
  original: string;
  corrected: string;
  issueKind?: WritingV2ReviewItem["issueKind"];
}) {
  const presentation = getWritingCorrectionChangePresentation(issueKind);
  return (
    <>
      {diffWritingCorrection(maskWritingReportText(original), maskWritingReportText(corrected)).map((segment, index) => {
        if (segment.type === "equal")
          return <span key={index}>{segment.text}</span>;
        if (segment.type === "removed") {
          return (
            <del
              key={index}
              aria-label={`${presentation.removedLabel}: ${segment.text}`}
              className={`mr-1 decoration-[0.75px] ${presentation.removedClass}`}
            >
              {segment.text}
            </del>
          );
        }
        return (
          <ins
            key={index}
            aria-label={`${presentation.addedLabel}: ${segment.text}`}
            className="font-medium text-[#356b40] no-underline"
          >
            {segment.text}
          </ins>
        );
      })}
    </>
  );
}

function WritingCorrectionInlineSentence({
  original,
  corrected,
  issueKind,
}: {
  original: string;
  corrected: string;
  issueKind?: WritingV2ReviewItem["issueKind"];
}) {
  return (
    <span data-writing-inline-correction className="block">
      <WritingCorrectionDiff
        original={original}
        corrected={corrected}
        issueKind={issueKind}
      />
    </span>
  );
}

function WritingFeedbackDetail({
  value,
  correctedValues,
}: {
  value: string;
  correctedValues: readonly string[];
}) {
  const normalized = normalizeWritingFeedbackForDisplay(value);
  return (
    <>
      {splitWritingFeedbackEmphasis(normalized).flatMap(
        (emphasisSegment, emphasisIndex) =>
          splitWritingFeedbackInlineCode(emphasisSegment.text).flatMap(
            (codeSegment, codeIndex) => {
              if (codeSegment.code) {
                return (
                  <code
                    key={`${emphasisIndex}-${codeIndex}-${codeSegment.text}`}
                    data-writing-teaching-note
                    className="mx-0.5 inline rounded-[5px] bg-[#f1f1ef] px-1.5 py-0.5 font-mono text-[0.92em] font-medium text-[#4f4f4a]"
                  >
                    {maskWritingReportText(codeSegment.text)}
                  </code>
                );
              }

              return splitWritingFeedbackHighlights(
                codeSegment.text,
                correctedValues,
              ).map((segment, segmentIndex) => {
                const emphasized =
                  emphasisSegment.emphasized || segment.highlighted;
                return emphasized ? (
                  <span
                    key={`${emphasisIndex}-${codeIndex}-${segmentIndex}-${segment.text}`}
                    {...(emphasisSegment.emphasized
                      ? { "data-writing-teaching-emphasis": true }
                      : { "data-writing-corrected-form": true })}
                    className="font-semibold text-[#242424]"
                  >
                    {maskWritingReportText(segment.text)}
                  </span>
                ) : (
                  <span
                    key={`${emphasisIndex}-${codeIndex}-${segmentIndex}-${segment.text}`}
                  >
                    {maskWritingReportText(segment.text)}
                  </span>
                );
              });
            },
          ),
      )}
    </>
  );
}

export function WritingV2Summary({
  data,
  mode = "full",
}: {
  data: WritingV2ResultData;
  mode?: "full" | "general-only";
}) {
  const feedback = unwrapFeedback(data.aiFeedback);
  const status = resultStatus(data, feedback);
  const isPending = status === "PENDING";
  const isFailed = status === "FAILED";
  const statusLabel = isPending
    ? "Değerlendiriliyor"
    : isFailed
      ? "Tamamlanamadı"
      : null;
  const standardScore = finiteNumber(feedback?.cefr_puan ?? data.score) ?? 0;
  const rawTotal = finiteNumber(feedback?.ham_puan) ?? 0;
  const level = normalizeLevelLabel(feedback?.seviye);
  const general = getWritingGeneralEvaluationForDisplay(
    feedback?.general,
    feedback?.genel_degerlendirme,
  );
  const generalOnly = mode === "general-only";

  return (
    <div
      data-writing-v2-summary
      data-summary-mode={mode}
      className={`grid gap-3 ${
        generalOnly
          ? "grid-cols-1"
          : general
          ? "lg:grid-cols-[minmax(220px,0.62fr)_minmax(0,1.7fr)] lg:grid-rows-2"
          : "max-w-[320px]"
      }`}
    >
      {!generalOnly && <section className="relative z-10 order-2 flex min-h-[96px] flex-col justify-between rounded-[12px] border border-[#e3cad5] bg-[var(--tm-cat-writing-bg)] px-4 py-3.5 shadow-[var(--tm-shadow-card)] lg:col-start-1 lg:row-start-2">
        <div className="flex items-center justify-between gap-3">
          <span className="whitespace-nowrap text-[13px] font-semibold leading-5 text-[#292724]">
            Yazma puanı
          </span>
          {!statusLabel && (
            <div className="text-[#5f5a54]">
              <RawScoreHelp rawScore={rawTotal} maximum={16} score={standardScore} skill="yazma" />
            </div>
          )}
        </div>
        {statusLabel ? (
          <span className="self-start text-left text-[18px] font-semibold leading-6 text-[#292724]">
            {statusLabel}
          </span>
        ) : (
          <div className="flex items-end self-start gap-1.5">
            <span className="text-[36px] font-semibold leading-none tabular-nums text-[#292724]">
              {standardScore}
            </span>
            <span className="pb-0.5 text-[13px] font-medium text-[#716b63]">
              / 75
            </span>
          </div>
        )}
      </section>}

      {!generalOnly && <section className="order-1 flex min-h-[96px] flex-col justify-between rounded-[12px] border border-[#ded9d2] bg-[#f7f5f2] px-4 py-3.5 shadow-[var(--tm-shadow-card)] lg:col-start-1 lg:row-start-1">
        <span className="text-[13px] font-semibold leading-5 text-[#292724]">
          Seviye
        </span>
        <span className="flex items-baseline gap-1.5 self-start text-left font-semibold leading-none text-[#292724]">
          {statusLabel ? (
            <span className="text-[34px]">—</span>
          ) : level.match(/^(.+?)\s+altı$/i) ? (
            <>
              <span className="text-[34px]">{level.match(/^(.+?)\s+altı$/i)?.[1]}</span>
              <span className="text-[16px] font-semibold text-[#5f5a54]">altı</span>
            </>
          ) : (
            <span className="text-[34px]">{level}</span>
          )}
        </span>
      </section>}

      {general && (
        <section data-writing-general-evaluation data-evaluation-tone="neutral" className={`order-3 rounded-[8px] border border-[#dddcd8] bg-[#f3f3f1] px-5 py-4 shadow-[var(--tm-shadow-card)] ${generalOnly ? "min-h-[148px]" : "min-h-[204px] lg:col-start-2 lg:row-span-2 lg:row-start-1"}`}>
          <h2 className="text-[13px] font-semibold leading-5 text-[#2f2f2d]">
            Genel değerlendirme
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-[14px] font-normal leading-6 text-[#454541]">
            {maskWritingReportText(general)}
          </p>
        </section>
      )}
    </div>
  );
}

export default function WritingV2Results({
  data,
  showOverallSummary = false,
  summaryMode = "full",
  retrying = false,
  onRetry,
}: WritingV2ResultsProps) {
  const feedback = unwrapFeedback(data.aiFeedback);
  const status = resultStatus(data, feedback);
  const [activeTask, setActiveTask] = useState<TaskCode>("TASK_1_1");
  const [selectedEvidence, setSelectedEvidence] = useState<
    Partial<Record<TaskCode, number>>
  >({});
  const reviewItemRefs = useRef<
    Partial<Record<TaskCode, Array<HTMLButtonElement | null>>>
  >({});
  const answerItemRefs = useRef<
    Partial<Record<TaskCode, Array<HTMLSpanElement | null>>>
  >({});
  const answerScrollRef = useRef<HTMLDivElement | null>(null);
  const feedbackScrollRef = useRef<HTMLDivElement | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const answerMap = answersByTask(data);

  useEffect(() => {
    if (answerScrollRef.current) {
      answerScrollRef.current.scrollTop = 0;
    }
    if (feedbackScrollRef.current) {
      feedbackScrollRef.current.scrollTop = 0;
    }
  }, [activeTask]);

  if (status === "PENDING") {
    return (
      <div className="space-y-5">
        {showOverallSummary && <WritingV2Summary data={data} mode={summaryMode} />}
        <section
          data-writing-evaluation-pending
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="flex min-h-[190px] items-center justify-center rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-5 py-8 text-center shadow-[var(--tm-shadow-card)] animate-in fade-in duration-300"
        >
          <div className="max-w-md">
            <Loader2
              aria-hidden="true"
              strokeWidth={1.75}
              className="mx-auto h-7 w-7 animate-spin text-[var(--tm-cat-writing-fg)] motion-reduce:animate-none"
            />
            <h2 className="mt-4 text-[17px] font-semibold leading-6 text-[var(--tm-text-primary)]">
              Yazmanız değerlendiriliyor
            </h2>
            <p className="mt-1 text-[14px] leading-6 text-[var(--tm-text-secondary)]">
              Sonuç hazır olduğunda otomatik olarak gösterilecek.
            </p>
            {data.canRetryEvaluation === true && onRetry && (
              <div className="mt-4">
                <p className="text-[13px] leading-5 text-[var(--tm-text-secondary)]">
                  Beklenenden uzun sürüyor; kaydedilmiş yanıtınızla yeniden deneyebilirsiniz.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={retrying}
                  onClick={() => void onRetry()}
                  className="mt-3 h-10 rounded-[7px] border-[var(--tm-border-default)] bg-white px-3 text-[13px] font-semibold text-[var(--tm-text-primary)] hover:bg-[#f5f5f3]"
                >
                  {retrying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Değerlendirmeyi yeniden başlat
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (status === "FAILED") {
    return (
      <div className="space-y-5">
        {showOverallSummary && <WritingV2Summary data={data} mode={summaryMode} />}
        <section className="rounded-[8px] border border-[#e4c9c9] bg-[#fffafa] px-5 py-6 shadow-[var(--tm-shadow-card)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--tm-text-primary)]">
                Puanınız henüz hazırlanamadı
              </h2>
              <p className="mt-1 max-w-2xl text-[14px] leading-6 text-[var(--tm-text-secondary)]">
                Yanıtlarınız güvende. Değerlendirme sırasında geçici bir sorun
                oluştu. Aynı yanıtları tekrar değerlendirmek için “Yeniden
                değerlendir” düğmesine basın.
              </p>
              <p className="mt-2 text-[13px] leading-5 text-[var(--tm-text-secondary)]">
                Tekrar değerlendirme de tamamlanmazsa{" "}
                <a
                  href="https://t.me/turkishmock_admin"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--tm-text-primary)] underline decoration-[var(--tm-border-default)] underline-offset-4 hover:decoration-[var(--tm-text-primary)]"
                >
                  Telegram üzerinden destek alın
                </a>
                .
              </p>
            </div>
            {onRetry && (
              <Button
                type="button"
                variant="outline"
                disabled={retrying}
                onClick={() => void onRetry()}
                className="h-10 shrink-0 rounded-[7px] border-[var(--tm-border-default)] bg-white px-3 text-[13px] font-semibold text-[var(--tm-text-primary)] hover:bg-[#f5f5f3]"
              >
                {retrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Yeniden değerlendir
              </Button>
            )}
          </div>
        </section>
      </div>
    );
  }

  if (!feedback) return null;

  if (feedback?.feedbackComplete === false) {
    return (
      <div className="space-y-5">
        {showOverallSummary && <WritingV2Summary data={data} mode={summaryMode} />}
        <div className="grid gap-3 sm:grid-cols-3" aria-label="Kaydedilen görev puanları">
          {TASK_DEFINITIONS.map((definition) => {
            const task = taskFeedback(feedback, definition.code, definition.key);
            const score = task.puan == null ? null : finiteNumber(task.puan);
            if (score === null || score < 0 || score > definition.maxScore) return null;
            return (
              <section key={definition.code} className="rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-5 py-4 shadow-[var(--tm-shadow-card)]">
                <h3 className="text-[13px] font-semibold">{definition.label}</h3>
                <p className="mt-2 text-[20px] font-semibold tabular-nums">
                  {score} <span className="text-[13px] font-normal text-[var(--tm-text-secondary)]">/ {definition.maxScore}</span>
                </p>
              </section>
            );
          })}
        </div>
        <section
          role="status"
          className="rounded-[8px] border border-[#e8dcc0] bg-[#fffdf7] px-5 py-6 shadow-[var(--tm-shadow-card)]"
          data-writing-feedback-incomplete
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold leading-6 text-[var(--tm-text-primary)]">
                Puanınız hazır
              </h2>
              <p className="mt-1 max-w-2xl text-[14px] leading-6 text-[var(--tm-text-secondary)]">
                Ayrıntılı geri bildirim henüz tamamlanamadı. Yanıtlarınız ve
                görev puanlarınız kaydedildi; aynı yanıtları yeniden
                değerlendirebilirsiniz.
              </p>
            </div>
            {onRetry && (
              <Button
                type="button"
                variant="outline"
                disabled={retrying}
                onClick={() => void onRetry()}
                className="h-10 shrink-0 rounded-[7px] border-[var(--tm-border-default)] bg-white px-3 text-[13px] font-semibold text-[var(--tm-text-primary)] hover:bg-[#f5f5f3]"
              >
                {retrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Yeniden değerlendir
              </Button>
            )}
          </div>
        </section>
      </div>
    );
  }

  const taskRows = TASK_DEFINITIONS.map((definition) => {
    const task = taskFeedback(feedback, definition.code, definition.key);
    const answer = answerMap.get(definition.code);
    const text = answerText(answer);
    const min =
      finiteNumber(answer?.subPart?.wordMin) ?? definition.fallbackMin;
    const max =
      finiteNumber(answer?.subPart?.wordMax) ?? definition.fallbackMax;
    const words = taskWordCount(feedback, task, definition.key, text);
    return { definition, task, answer, text, min, max, words };
  });
  const allTasksEmpty = taskRows.every(({ text }) => !text.trim());
  const activeTaskDefinition =
    taskRows.find(({ definition }) => definition.code === activeTask) ||
    taskRows[0];

  if (!activeTaskDefinition) return null;

  const { definition, task, text, words } = activeTaskDefinition;
  const reviewItems = buildWritingReviewItems(
    task.metinKaniti,
    task.duzeltmeler,
    text,
    task.sourceUnits,
  );
  const reviewItemRanges = locateWritingReviewItemRanges(
    reviewItems,
    text,
    task.sourceUnits,
    { allowSharedRanges: true },
  );
  const promptDocument = activeTaskDefinition.answer?.subPart?.promptJson;
  const promptText = String(
    activeTaskDefinition.answer?.subPart?.description ||
      activeTaskDefinition.answer?.subPart?.question ||
      activeTaskDefinition.answer?.questionText ||
      "",
  ).trim();
  const sourceEmailDocument =
    data.writingTest?.sourceEmail || data.test?.sourceEmail || null;
  const hasPrompt = Boolean(
    promptDocument ||
    promptText ||
    (definition.code !== "TASK_2" && sourceEmailDocument),
  );
  const selectedIndex =
    selectedEvidence[definition.code] ?? (reviewItems.length > 0 ? 0 : null);
  const selectEvidence = (index: number) => {
    setSelectedEvidence((current) => ({
      ...current,
      [definition.code]: index,
    }));
    window.requestAnimationFrame(() => {
      answerItemRefs.current[definition.code]?.[index]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      reviewItemRefs.current[definition.code]?.[index]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };
  return (
    <div
      className="space-y-5 animate-in fade-in duration-300"
      data-writing-v2-results
    >
      {showOverallSummary && <WritingV2Summary data={data} mode={summaryMode} />}

      {allTasksEmpty ? (
        <section className="flex min-h-[190px] items-center justify-center rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-5 py-10 text-center shadow-[var(--tm-shadow-card)]">
          <div>
            <h2 className="text-[17px] font-semibold leading-6 text-[var(--tm-text-primary)]">
              Yazılı yanıt bulunmuyor
            </h2>
            <p className="mt-1 text-[14px] leading-6 text-[var(--tm-text-secondary)]">
              Bu sınavda yazılı yanıt bulunmuyor.
            </p>
          </div>
        </section>
      ) : (
        <section
          aria-label="Görev incelemesi"
          className="space-y-3"
          data-writing-evidence-review
        >
          <div
            role="tablist"
            aria-label="Yazma görevleri"
            className="grid gap-3 sm:grid-cols-3"
          >
            {taskRows.map((row) => {
              const selected = activeTask === row.definition.code;
              return (
                <button
                  key={row.definition.code}
                  id={`writing-task-tab-${row.definition.code}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`writing-task-panel-${row.definition.code}`}
                  onClick={() => setActiveTask(row.definition.code)}
                  className={`min-w-0 rounded-[8px] border px-5 py-4 text-left shadow-[var(--tm-shadow-card)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8f8d87]/40 ${
                    selected
                      ? "border-[#c9c8c4] bg-[#efefed] text-[var(--tm-text-primary)]"
                      : "border-[var(--tm-border-subtle)] bg-white text-[var(--tm-text-primary)] hover:bg-[#f7f7f5]"
                  }`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="truncate text-[13px] font-semibold leading-5">
                      {row.definition.label}
                    </span>
                    <span className="shrink-0 text-[22px] font-semibold leading-6 tabular-nums">
                      {finiteNumber(row.task.puan) ?? 0}
                      <span className="ml-1 text-[11px] font-medium text-[var(--tm-text-secondary)]">
                        / {row.definition.maxScore}
                      </span>
                    </span>
                  </span>
                  <span className="mt-2 block text-[12px] leading-5 text-[var(--tm-text-secondary)]">
                    {row.min === row.max
                      ? `${row.words} kelime · yaklaşık ${wordTarget(row.min, row.max)}`
                      : `${row.words} kelime · hedef ${wordTarget(row.min, row.max)}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id={`writing-task-panel-${definition.code}`}
            role="tabpanel"
            aria-labelledby={`writing-task-tab-${definition.code}`}
          >
            {hasPrompt && (
              <section
                data-writing-task-prompt
                className="mb-3 overflow-hidden rounded-[8px] border border-[var(--tm-border-subtle)] bg-white"
              >
                <button
                  type="button"
                  aria-expanded={promptVisible}
                  aria-controls={`writing-task-prompt-${definition.code}`}
                  onClick={() => setPromptVisible((current) => !current)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] font-semibold text-[var(--tm-text-primary)] transition-colors hover:bg-[#f7f7f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#777773]/35"
                >
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{promptVisible ? "Görevi gizle" : "Görevi göster"}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 transition-transform ${promptVisible ? "rotate-180" : ""}`}
                  />
                </button>
                <div
                  id={`writing-task-prompt-${definition.code}`}
                  hidden={!promptVisible}
                  className="border-t border-[var(--tm-border-subtle)] px-4 py-4 text-[14px] leading-6 text-[var(--tm-text-primary)]"
                >
                  {definition.code !== "TASK_2" && sourceEmailDocument && (
                    <div className="mb-4 border-b border-[var(--tm-border-subtle)] pb-4">
                      <h3 className="mb-2 text-[14px] font-semibold">Gelen e-posta</h3>
                      <WritingRichText document={sourceEmailDocument} />
                    </div>
                  )}
                  {(promptDocument || promptText) && (
                    <div>
                      <h3 className="mb-2 text-[14px] font-semibold">Göreviniz</h3>
                      {promptDocument ? (
                        <WritingRichText document={promptDocument} />
                      ) : (
                        <p className="whitespace-pre-wrap">{promptText}</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
            {!text.trim() ? (
              <section className="flex min-h-[170px] items-center justify-center rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-5 py-10 text-center shadow-[var(--tm-shadow-card)]">
                <p className="text-[14px] leading-6 text-[var(--tm-text-secondary)]">
                  Bu görev yanıtlanmadı.
                </p>
              </section>
            ) : (
              <div className="grid items-stretch gap-3 lg:grid-cols-12">
                <article
                  className={`flex flex-col rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-5 py-5 shadow-[var(--tm-shadow-card)] sm:px-6 lg:h-[560px] ${
                    reviewItems.length > 0 ? "lg:col-span-7" : "lg:col-span-12"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <h2 className="min-w-0 text-[16px] font-semibold leading-6 text-[var(--tm-text-primary)]">
                      Metniniz
                    </h2>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[12px] leading-4 text-[var(--tm-text-tertiary)]">
                        {words} kelime
                      </span>
                    </div>
                  </div>
                  <div
                    ref={answerScrollRef}
                    data-writing-answer-scroll
                    onWheel={forwardWritingPanelWheel}
                    className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-[var(--tm-border-subtle)] pt-4 pr-2 [scrollbar-gutter:stable]"
                  >
                    <AnnotatedWritingAnswer
                      text={text}
                      items={reviewItems}
                      ranges={reviewItemRanges}
                      selectedIndex={selectedIndex}
                      onSelect={selectEvidence}
                      registerItem={(index, occurrenceIndex, element) => {
                        const refs =
                          answerItemRefs.current[definition.code] || [];
                        if (occurrenceIndex === 0 || !refs[index]) {
                          refs[index] = element;
                        }
                        answerItemRefs.current[definition.code] = refs;
                      }}
                    />
                  </div>
                </article>

                {reviewItems.length > 0 && (
                  <aside className="flex flex-col rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-5 py-5 shadow-[var(--tm-shadow-card)] sm:px-6 lg:col-span-5 lg:h-[560px]">
                    <h3 className="text-[16px] font-semibold leading-6 text-[var(--tm-text-primary)]">
                      Ayrıntılı geri bildirim
                    </h3>
                    <div
                      ref={feedbackScrollRef}
                      data-writing-feedback-scroll
                      onWheel={forwardWritingPanelWheel}
                      className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-gutter:stable]"
                    >
                      {reviewItems.map((item, index) => {
                        const selected = selectedIndex === index;
                        const details = getWritingReviewDetails(item);
                        const correctedValues = Array.from(
                          new Set(
                            [
                              item.corrected,
                              ...(item.corrections || []).map(
                                (correction) => correction.corrected,
                              ),
                            ]
                              .map((value) => String(value || "").trim())
                              .filter(Boolean),
                          ),
                        );
                        const correctionOccurrences =
                          item.corrected
                            ? item.occurrences?.length
                              ? item.occurrences
                              : [
                                  {
                                    original: String(item.original || ""),
                                    corrected: item.corrected,
                                  },
                                ]
                            : [];
                        const contrasts = getWritingCorrectionContrastsForDisplay(
                          item.corrections,
                        );
                        const correctionContexts =
                          correctionOccurrences.length > 0
                              ? buildWritingCorrectionSentenceContexts(
                                  text,
                                  item,
                                  reviewItemRanges,
                                  index,
                                  task.sourceUnits,
                                )
                            : [];
                        const developmentExamples = Array.from(new Set(
                          (item.exampleSentence
                            ? [item.exampleSentence]
                            : correctionContexts.length
                              ? correctionContexts.map((context) => context.correctedText)
                              : [item.corrected || item.naturalAlternative])
                            .map((value) => visibleWritingFeedback(value))
                            .filter(Boolean),
                        ));
                        const labels: Array<{
                          label: string;
                          type: WritingV2EvidenceType;
                        }> =
                          item.type === "issue" && item.categories?.length
                            ? Array.from(
                                new Set(
                                  item.categories.map((category) =>
                                    writingCorrectionCategoryLabel(category),
                                  ),
                                ),
                              ).map((label) => ({ label, type: "issue" }))
                            : [
                                {
                                  label: evidenceTypeLabel(item),
                                  type: item.type,
                                },
                              ];
                        (item.relatedEvidence || []).forEach((evidence) => {
                          const label = evidenceTypeLabel(evidence);
                          if (!labels.some((entry) => entry.label === label)) {
                            labels.push({ label, type: evidence.type });
                          }
                        });
                        return (
                          <button
                            key={`${item.original || "kanit"}-${index}`}
                            ref={(element) => {
                              const refs =
                                reviewItemRefs.current[definition.code] || [];
                              refs[index] = element;
                              reviewItemRefs.current[definition.code] = refs;
                            }}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => selectEvidence(index)}
                            className={`block w-full px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#242424] focus-visible:ring-offset-1 ${
                              item.type === "strength"
                                ? `rounded-[9px] border bg-[#f3f8f1] ${selected ? "border-[#8fad85]" : "border-[#d9e8d6]"}`
                                : item.type === "development"
                                  ? `rounded-[9px] border bg-[#fbf8ef] ${selected ? "border-[#c4a766]" : "border-[#eadfc5]"}`
                                  : `rounded-[9px] border bg-white ${selected
                                    ? "border-[#d7c9de]"
                                    : "border-[var(--tm-border-subtle)] hover:border-[var(--tm-border-default)]"}`
                            } ${selected ? "border-dashed shadow-[var(--tm-shadow-card)]" : ""}`}
                          >
                            <span className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${item.type === "issue" ? "mb-3 border-b border-[var(--tm-border-subtle)] pb-3" : ""}`}>
                              {labels.map(({ label, type }) => (
                                <span
                                  key={label}
                                  className={`inline-flex text-[12px] ${
                                    item.type === "issue"
                                      ? `rounded-[4px] px-1.5 py-0.5 font-medium leading-5 ${evidenceLabelClass(type)}`
                                      : `font-semibold leading-4 ${type === "strength" ? "text-[#2f6f3d]" : "text-[#7a5b19]"}`
                                  }`}
                                >
                                  {label}
                                </span>
                              ))}
                            </span>
                            {item.type === "development" ? (
                              <span data-writing-development-content className="block text-[14px] leading-[22px] text-[var(--tm-text-primary)]">
                                {item.original ? (
                                  <span data-writing-feedback-correction className="mt-1 block text-[14px] font-medium leading-[22px] text-[var(--tm-text-primary)]">
                                    “{maskWritingReportText(item.original)}”
                                  </span>
                                ) : null}
                                {details.map((detail, detailIndex) => (
                                  <span key={`${detail}-${detailIndex}`} data-writing-feedback-detail className="mt-1.5 block break-words text-[14px] font-normal leading-[22px] text-[var(--tm-text-primary)]">
                                    <WritingFeedbackDetail value={detail} correctedValues={[]} />
                                  </span>
                                ))}
                                {developmentExamples.map((example) => (
                                  <span key={example} className="mt-1.5 block break-words font-normal">
                                    <strong className="font-semibold">Örnek:</strong>{" "}{example}
                                  </span>
                                ))}
                              </span>
                            ) : (<>
                            {correctionContexts.length > 0 ? (
                              <span
                                data-writing-feedback-correction
                                className="mt-2 block break-words text-[14px] font-medium leading-[22px] text-[var(--tm-text-primary)]"
                              >
                                {correctionContexts.map(
                                  (context, occurrenceIndex) => (
                                    <span
                                      key={`${context.start}-${context.end}-${occurrenceIndex}`}
                                      data-writing-correction-sentence
                                      className={`block ${
                                        occurrenceIndex > 0 ? "mt-2" : ""
                                      }`}
                                    >
                                      <WritingCorrectionInlineSentence
                                        original={context.originalText}
                                        corrected={context.correctedText}
                                        issueKind={item.issueKind}
                                      />
                                    </span>
                                  ),
                                )}
                              </span>
                            ) : item.original && item.corrected ? (
                              <span
                                data-writing-feedback-correction
                                data-writing-correction-sentence
                                className="mt-2 block break-words text-[14px] font-medium leading-[22px] text-[var(--tm-text-primary)]"
                              >
                                <WritingCorrectionInlineSentence
                                  original={String(item.original)}
                                  corrected={String(item.corrected)}
                                  issueKind={item.issueKind}
                                />
                              </span>
                            ) : item.original ? (
                              <span
                                data-writing-feedback-correction
                                className="mt-2 block break-words text-[14px] font-medium leading-[22px] text-[var(--tm-text-primary)]"
                              >
                                “{maskWritingReportText(item.original)}”
                              </span>
                            ) : null}
                            {details.length > 0 && (
                              <span
                                data-writing-feedback-reason
                                className="mt-3 block"
                              >
                                {item.corrected && (
                                  <span className="block text-[13px] font-semibold leading-5 text-[var(--tm-text-primary)]">
                                    Neden?
                                  </span>
                                )}
                                {details.map((detail, detailIndex) => (
                                  <span
                                    key={`${detail}-${detailIndex}`}
                                    data-writing-feedback-detail
                                    className={`${
                                      detailIndex > 0
                                        ? "mt-3"
                                        : item.corrected ? "mt-1" : ""
                                    } block break-words text-[14px] font-normal leading-[22px] text-[var(--tm-text-primary)]`}
                                  >
                                    {item.corrected && details.length > 1 && (
                                      <span className="mr-1 font-semibold text-[var(--tm-text-primary)]">
                                        {detailIndex + 1}.
                                      </span>
                                    )}
                                    <WritingFeedbackDetail
                                      value={detail}
                                      correctedValues={correctedValues}
                                    />
                                  </span>
                                ))}
                              </span>
                            )}
                            {contrasts.map((contrast, contrastIndex) => (
                              <span
                                key={`${contrast?.left}-${contrast?.right}-${contrastIndex}`}
                                data-writing-feedback-contrast
                                className="mt-2 block rounded-[5px] bg-[#f5f5f3] px-3 py-2 text-[14px] font-normal leading-[22px] text-[var(--tm-text-primary)]"
                              >
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-semibold text-[var(--tm-text-primary)]">
                                    {visibleWritingFeedback(
                                      contrast?.left,
                                    )}
                                  </span>
                                  <span
                                    aria-hidden="true"
                                    className="text-[var(--tm-text-tertiary)]"
                                  >
                                    →
                                  </span>
                                  <span className="font-semibold text-[var(--tm-text-primary)]">
                                    {visibleWritingFeedback(
                                      contrast?.right,
                                    )}
                                  </span>
                                </span>
                                <span className="mt-1 block">
                                  {visibleWritingFeedback(
                                    contrast?.explanation,
                                  )}
                                </span>
                              </span>
                            ))}
                            {item.naturalAlternative && (
                              <span className="mt-2 block break-words text-[14px] font-normal leading-[22px] text-[var(--tm-text-primary)]">
                                <span className="font-semibold">
                                  Alternatif ifade:
                                </span>{" "}
                                {visibleWritingFeedback(
                                  item.naturalAlternative,
                                )}
                              </span>
                            )}
                            {item.exampleSentence && (
                              <span className="mt-2 block break-words text-[14px] font-normal leading-[22px] text-[var(--tm-text-primary)]">
                                <span className="font-semibold">Örnek:</span>{" "}
                                {visibleWritingFeedback(
                                  item.exampleSentence,
                                )}
                              </span>
                            )}
                            </>)}
                          </button>
                        );
                      })}
                    </div>
                  </aside>
                )}

                <section className="pt-1 lg:col-span-12">
                  <h3 className="mb-4 text-[16px] font-semibold leading-6 text-[var(--tm-text-primary)]">
                    Rubrik değerlendirmesi
                  </h3>
                  <dl className="grid gap-3 md:grid-cols-2">
                    {CRITERIA.map(([key, label]) => (
                      <div
                        key={key}
                        className="min-w-0 rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-4 py-3 text-[14px] leading-[22px] shadow-[var(--tm-shadow-card)]"
                      >
                        <dt className="font-semibold text-[var(--tm-text-primary)]">
                          {label}
                        </dt>
                        <dd className="mt-2 text-[var(--tm-text-primary)]">
                          {visibleWritingFeedback(
                            task.kriterler?.[key],
                          ) || "Değerlendirme bulunmuyor."}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
