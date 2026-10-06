import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ALargeSmall,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  MoveHorizontal,
  X,
} from "lucide-react";
import { getReadingTypographyPreset } from "@/components/reading-test/reading-typography";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { toApiUrl } from "@/config/runtime";
import { overallTestService } from "@/services/overallTest.service";
import { protectedImageProps } from "@/utils/mediaProtection";
import ReadingEvidenceExplanation from "./ReadingEvidenceExplanation";
import {
  answerValues,
  formatCorrectAnswers,
  formatReviewAnswer,
  isBlankReviewAnswer,
  type MockReviewQuestion,
  type MockReviewSection,
  type MockReviewV1,
} from "./evidence-review-utils";

type ListeningTranscriptEvidenceViewProps = {
  resultId?: string;
  review: MockReviewV1;
  onClose: () => void;
};

type ListeningReviewPart = {
  number: number;
  title: string;
  description: string;
  sections: MockReviewSection[];
  questions: MockReviewQuestion[];
};

type TranscriptRun = {
  start: number;
  end: number;
  text: string;
  bold: boolean;
  italic: boolean;
};

type TranscriptEvidenceRef = {
  key: string;
  questionId: string;
  questionNumber: number;
  audioStartMs: number | null;
  audioEndMs: number | null;
  explanation: string;
};

type TranscriptTimingRef = {
  key: string;
  audioStartMs: number;
  audioEndMs: number;
};

type TranscriptSegment = {
  key: string;
  start: number;
  end: number;
  text: string;
  bold: boolean;
  italic: boolean;
  timingRef?: TranscriptTimingRef;
  evidenceRefs: TranscriptEvidenceRef[];
  startingEvidenceRefs: TranscriptEvidenceRef[];
  endingEvidenceRefs: TranscriptEvidenceRef[];
};

type TranscriptDocument = {
  sectionId: string;
  segments: TranscriptSegment[];
};

type TranscriptSentenceGroup = {
  key: string;
  timingRef?: TranscriptTimingRef;
  segments: TranscriptSegment[];
};

const LISTENING_PART_ENDS = [8, 14, 18, 23, 29, 35] as const;

const inferPartNumber = (section: MockReviewSection, index: number) => {
  if (Number.isInteger(section.partNumber) && Number(section.partNumber) > 0) {
    return Number(section.partNumber);
  }

  const firstQuestion = Math.min(
    ...(section.questions || []).map((question) => question.number),
  );
  const inferred = LISTENING_PART_ENDS.findIndex(
    (partEnd) => firstQuestion <= partEnd,
  );
  return inferred >= 0 ? inferred + 1 : index + 1;
};

const reviewInstruction = (questions: MockReviewQuestion[]) => {
  const questionNumbers = questions
    .map((question) => question.number)
    .filter((number) => Number.isFinite(number));

  if (questionNumbers.length === 0) {
    return "Bu bölümdeki cevaplarınızı inceleyin.";
  }

  const firstQuestion = Math.min(...questionNumbers);
  const lastQuestion = Math.max(...questionNumbers);

  if (firstQuestion === lastQuestion) {
    return `${firstQuestion}. soruya verdiğiniz cevabı inceleyin.`;
  }

  return `${firstQuestion}–${lastQuestion}. sorulara verdiğiniz cevapları inceleyin.`;
};

const groupReviewParts = (review: MockReviewV1): ListeningReviewPart[] => {
  const parts = new Map<number, ListeningReviewPart>();

  (review.sections || []).forEach((section, index) => {
    const number = inferPartNumber(section, index);
    const existing = parts.get(number);
    if (existing) {
      existing.sections.push(section);
      existing.questions.push(...(section.questions || []));
      return;
    }

    parts.set(number, {
      number,
      title: section.partTitle || `Bölüm ${number}`,
      description: "",
      sections: [section],
      questions: [...(section.questions || [])],
    });
  });

  return Array.from(parts.values())
    .map((part) => {
      const questions = part.questions.sort(
        (left, right) => left.number - right.number,
      );

      return {
        ...part,
        description: reviewInstruction(questions),
        questions,
      };
    })
    .sort((left, right) => left.number - right.number);
};

const normalizeLineEndings = (value: string) =>
  String(value || "").replace(/\r\n?/g, "\n");

const parseFormattedListeningTranscript = (
  sourceText: string,
  formattedSourceText?: string,
): { text: string; runs: TranscriptRun[] } => {
  const source = normalizeLineEndings(sourceText);
  const formatted = normalizeLineEndings(formattedSourceText || source);
  const characters: Array<{ value: string; bold: boolean; italic: boolean }> =
    [];
  let bold = false;
  let italic = false;

  for (let cursor = 0; cursor < formatted.length; ) {
    if (formatted.startsWith("**", cursor)) {
      bold = !bold;
      cursor += 2;
      continue;
    }
    if (formatted[cursor] === "*") {
      italic = !italic;
      cursor += 1;
      continue;
    }

    characters.push({
      value: formatted[cursor],
      bold,
      italic,
    });
    cursor += 1;
  }

  const parsedText = characters.map((character) => character.value).join("");
  if (parsedText !== source) {
    return {
      text: source,
      runs: source
        ? [
            {
              start: 0,
              end: source.length,
              text: source,
              bold: false,
              italic: false,
            },
          ]
        : [],
    };
  }

  const runs: TranscriptRun[] = [];
  characters.forEach((character, index) => {
    const previous = runs[runs.length - 1];
    if (
      previous &&
      previous.bold === character.bold &&
      previous.italic === character.italic
    ) {
      previous.text += character.value;
      previous.end = index + 1;
      return;
    }

    runs.push({
      start: index,
      end: index + 1,
      text: character.value,
      bold: character.bold,
      italic: character.italic,
    });
  });

  return { text: source, runs };
};

const evidenceSpansForQuestion = (question: MockReviewQuestion) => {
  const spans =
    Array.isArray(question.evidenceSpans) &&
    question.evidenceSpans.length > 0
      ? question.evidenceSpans
      : [
          {
            evidenceText: question.evidenceText,
            textStart: question.textStart,
            textEnd: question.textEnd,
          },
        ];

  return spans
    .map((span) => ({
      start: Number(span.textStart),
      end: Number(span.textEnd),
      evidenceText: String(span.evidenceText || ""),
    }))
    .filter(
      (span) =>
        Number.isInteger(span.start) &&
        Number.isInteger(span.end) &&
        span.start >= 0 &&
        span.end > span.start,
    );
};

const buildTranscriptDocuments = (
  part: ListeningReviewPart,
): TranscriptDocument[] =>
  part.sections.map((section) => {
    const formatted = parseFormattedListeningTranscript(
      section.sourceText,
      section.formattedSourceText,
    );
    const ranges = ([1, 5].includes(part.number) ? [] : section.questions || []).flatMap((question) =>
      evidenceSpansForQuestion(question).flatMap((span) => {
        const exact =
          span.end <= formatted.text.length &&
          formatted.text.slice(span.start, span.end) === span.evidenceText;
        if (!exact) return [];

        return [
          {
            start: span.start,
            end: span.end,
            ref: {
              key: `${question.questionId}:${span.start}:${span.end}`,
              questionId: question.questionId,
              questionNumber: question.number,
              audioStartMs:
                question.audioStartMs == null
                  ? null
                  : Number(question.audioStartMs),
              audioEndMs:
                question.audioEndMs == null
                  ? null
                  : Number(question.audioEndMs),
              explanation: String(question.explanation || ""),
            } satisfies TranscriptEvidenceRef,
          },
        ];
      }),
    );
    const timingRanges = (section.transcriptSegments || []).flatMap(
      (timing, index) => {
        const start = Number(timing.textStart);
        const end = Number(timing.textEnd);
        const audioStartMs = Number(timing.audioStartMs);
        const audioEndMs = Number(timing.audioEndMs);
        const exact =
          Number.isInteger(start) &&
          Number.isInteger(end) &&
          start >= 0 &&
          end > start &&
          end <= formatted.text.length &&
          formatted.text.slice(start, end) === String(timing.text || "");
        const validAudio =
          Number.isFinite(audioStartMs) &&
          Number.isFinite(audioEndMs) &&
          audioStartMs >= 0 &&
          audioEndMs > audioStartMs;

        if (!exact || !validAudio) return [];

        return [
          {
            start,
            end,
            ref: {
              key: `${section.sectionId}:timing:${index}:${start}:${end}`,
              audioStartMs,
              audioEndMs,
            } satisfies TranscriptTimingRef,
          },
        ];
      },
    );

    const boundaries = Array.from(
      new Set([
        0,
        formatted.text.length,
        ...formatted.runs.flatMap((run) => [run.start, run.end]),
        ...ranges.flatMap((range) => [range.start, range.end]),
        ...timingRanges.flatMap((range) => [range.start, range.end]),
      ]),
    ).sort((left, right) => left - right);

    const segments = boundaries.slice(0, -1).flatMap((start, index) => {
      const end = boundaries[index + 1];
      if (end <= start) return [];
      const run = formatted.runs.find(
        (candidate) => candidate.start <= start && candidate.end >= end,
      );
      const matchingRanges = ranges.filter(
        (range) => range.start <= start && range.end >= end,
      );
      const timingRange = timingRanges.find(
        (range) => range.start <= start && range.end >= end,
      );

      return [
        {
          key: `${section.sectionId}:${start}:${end}`,
          start,
          end,
          text: formatted.text.slice(start, end),
          bold: run?.bold || false,
          italic: run?.italic || false,
          timingRef: timingRange?.ref,
          evidenceRefs: matchingRanges.map((range) => range.ref),
          startingEvidenceRefs: matchingRanges
            .filter((range) => range.start === start)
            .map((range) => range.ref),
          endingEvidenceRefs: matchingRanges
            .filter((range) => range.end === end)
            .map((range) => range.ref),
        } satisfies TranscriptSegment,
      ];
    });

    return {
      sectionId: section.sectionId,
      segments,
    };
  });

const groupTranscriptSegments = (
  segments: TranscriptSegment[],
): TranscriptSentenceGroup[] =>
  segments.reduce<TranscriptSentenceGroup[]>((groups, segment) => {
    const previous = groups[groups.length - 1];
    const timingKey = segment.timingRef?.key || "";
    const previousTimingKey = previous?.timingRef?.key || "";
    const canJoinPrevious =
      Boolean(previous) &&
      (timingKey
        ? timingKey === previousTimingKey
        : previousTimingKey === "");

    if (canJoinPrevious) {
      previous.segments.push(segment);
      return groups;
    }

    groups.push({
      key: `${segment.key}:group`,
      timingRef: segment.timingRef,
      segments: [segment],
    });
    return groups;
  }, []);

const normalizedAnswer = (value: string) =>
  String(value || "").trim().toLocaleLowerCase("tr-TR");

const selectedAnswerMatches = (
  question: MockReviewQuestion,
  variant: string,
  text: string,
) => {
  const targets = new Set([
    normalizedAnswer(variant),
    normalizedAnswer(text),
  ]);
  return answerValues(question.userAnswer).some((value) =>
    targets.has(normalizedAnswer(value)),
  );
};

const questionStatusClass = (question: MockReviewQuestion) => {
  if (question.isCorrect) {
    return "border-[#438553] bg-[#438553] text-white";
  }
  if (isBlankReviewAnswer(question.userAnswer)) {
    return "border-[#aaa9a2] bg-white text-[#77766f]";
  }
  return "border-[#c74646] bg-[#c74646] text-white";
};

function ListeningSplitHandle() {
  return (
    <ResizableHandle
      withHandle={false}
      aria-label="Panelleri yeniden boyutlandır"
      title="Panelleri yeniden boyutlandır"
      className="group !mx-0 !w-3 !cursor-ew-resize !rounded-none !bg-transparent !shadow-none"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[#deded9] transition-colors group-hover:bg-[#9b9a96]"
      />
      <span className="pointer-events-none relative z-10 flex h-7 w-7 shrink-0 items-center justify-center text-[#5f6670] transition-colors group-hover:text-[#2f2e2a]">
        <MoveHorizontal className="h-4 w-4" strokeWidth={1.8} />
      </span>
    </ResizableHandle>
  );
}

const renderStyledTranscriptText = (
  text: string,
  bold: boolean,
  italic: boolean,
): ReactNode => {
  if (bold && italic) {
    return (
      <strong className="font-semibold">
        <em>{text}</em>
      </strong>
    );
  }
  if (bold) return <strong className="font-semibold">{text}</strong>;
  if (italic) return <em>{text}</em>;
  return <Fragment>{text}</Fragment>;
};

function TranscriptSentenceGroupMark({
  children,
  group,
  onActivate,
}: {
  children: ReactNode;
  group: TranscriptSentenceGroup;
  onActivate: (audioStartMs: number, audioEndMs: number) => void;
}) {
  if (!group.timingRef) return <Fragment>{children}</Fragment>;

  const activate = () =>
    onActivate(group.timingRef!.audioStartMs, group.timingRef!.audioEndMs);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate();
  };

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={activate}
      onKeyDown={onKeyDown}
      title="Bu cümleden dinle"
      className="listening-transcript-sentence-group cursor-pointer rounded-[2px] box-decoration-clone text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881]/45"
    >
      {children}
    </span>
  );
}

function TranscriptEvidenceMark({
  active,
  evidence,
  evidenceLabel,
  open,
  segment,
  typographyStyle,
  onActivate,
}: {
  active: boolean;
  evidence: TranscriptEvidenceRef;
  evidenceLabel: string;
  open: boolean;
  segment: TranscriptSegment;
  typographyStyle: CSSProperties;
  onActivate: (
    evidence: TranscriptEvidenceRef,
    segmentKey: string,
  ) => void;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    left: 12,
    top: 12,
    width: 380,
    ready: false,
  });
  const startsEvidence = segment.startingEvidenceRefs.some(
    (candidate) => candidate.key === evidence.key,
  );
  const endsEvidence = segment.endingEvidenceRefs.some(
    (candidate) => candidate.key === evidence.key,
  );
  const leadingMatch = startsEvidence
    ? /^(\S+)([\s\S]*)$/u.exec(segment.text)
    : null;
  const leadingText = leadingMatch?.[1] ?? segment.text;
  const remainingText = leadingMatch?.[2] ?? "";
  const roundedClass = `${startsEvidence ? "rounded-l-none" : "rounded-l-[2px]"} ${
    endsEvidence ? "rounded-r-[2px]" : "rounded-r-none"
  }`;
  const highlightClass = `reading-review-evidence listening-transcript-evidence-text cursor-pointer box-decoration-clone bg-[#d9f2c8] px-[2px] py-[1px] text-left text-[#242424] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7faa70]/40 ${roundedClass} ${
    active ? "bg-[#caeab5]" : ""
  }`;

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;

      const viewportPadding = 12;
      const gap = 8;
      const width = Math.min(
        380,
        Math.max(260, window.innerWidth - viewportPadding * 2),
      );
      const anchorRect = anchor.getBoundingClientRect();
      const tooltipHeight = tooltip.getBoundingClientRect().height;
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - width - viewportPadding,
      );
      const left = Math.min(
        Math.max(viewportPadding, anchorRect.left),
        maxLeft,
      );
      const roomBelow = window.innerHeight - anchorRect.bottom;
      const roomAbove = anchorRect.top;
      const showAbove =
        roomBelow < tooltipHeight + gap + viewportPadding &&
        roomAbove > roomBelow;
      const preferredTop = showAbove
        ? anchorRect.top - tooltipHeight - gap
        : anchorRect.bottom + gap;
      const maxTop = Math.max(
        viewportPadding,
        window.innerHeight - tooltipHeight - viewportPadding,
      );
      const top = Math.min(
        Math.max(viewportPadding, preferredTop),
        maxTop,
      );

      setTooltipPosition({ left, top, width, ready: true });
    };

    updatePosition();
    const animationFrame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  const activate = () =>
    onActivate(
      segment.timingRef
        ? {
            ...evidence,
            audioStartMs: segment.timingRef.audioStartMs,
            audioEndMs: segment.timingRef.audioEndMs,
          }
        : evidence,
      segment.key,
    );
  const onKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    activate();
  };
  const onClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    activate();
  };

  return (
    <span ref={anchorRef} className="relative inline">
      {startsEvidence ? (
        <>
          <span className="whitespace-nowrap">
            <button
              type="button"
              onClick={onClick}
              className={`reading-review-evidence listening-transcript-evidence-label -mr-px inline-flex h-[22px] min-w-[34px] items-center justify-center rounded-l-[3px] rounded-r-none bg-[#256b2b] px-1.5 align-[2px] text-[13px] font-bold leading-5 text-white transition-colors ${
                active ? "bg-[#174d20]" : ""
              }`}
              aria-label={`${evidenceLabel} kanıtını dinle ve açıkla`}
              aria-pressed={open}
            >
              {evidenceLabel}
            </button>
            <span
              role="button"
              tabIndex={remainingText ? -1 : 0}
              onClick={onClick}
              onKeyDown={onKeyDown}
              className={highlightClass}
              aria-pressed={open}
            >
              {renderStyledTranscriptText(
                leadingText,
                segment.bold,
                segment.italic,
              )}
            </span>
          </span>
          {remainingText ? (
            <span
              role="button"
              tabIndex={0}
              onClick={onClick}
              onKeyDown={onKeyDown}
              className={highlightClass}
              aria-pressed={open}
            >
              {renderStyledTranscriptText(
                remainingText,
                segment.bold,
                segment.italic,
              )}
            </span>
          ) : null}
        </>
      ) : (
        <span
          role="button"
          tabIndex={0}
          onClick={onClick}
          onKeyDown={onKeyDown}
          className={highlightClass}
          aria-pressed={open}
        >
          {renderStyledTranscriptText(
            segment.text,
            segment.bold,
            segment.italic,
          )}
        </span>
      )}

      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              style={{
                ...typographyStyle,
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                width: tooltipPosition.width,
                opacity: tooltipPosition.ready ? 1 : 0,
              }}
              className="fixed z-[160] max-h-[220px] overflow-y-auto whitespace-normal rounded-[7px] border border-[#cbdac5] bg-white px-4 py-3 text-left shadow-[0_10px_30px_rgba(15,23,42,0.14)] transition-opacity"
            >
              <span className="block text-[12px] font-semibold text-[#32642e]">
                Soru {evidence.questionNumber} · Neden doğru?
              </span>
              <ReadingEvidenceExplanation
                value={
                  evidence.explanation ||
                  "Bu soru için kısa açıklama eklenmemiş."
                }
                className="listening-review-explanation-copy mt-1.5 block font-normal text-[#242424]"
              />
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

function useDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateLayout = () => setIsDesktop(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  return isDesktop;
}

export default function ListeningTranscriptEvidenceView({
  resultId,
  review,
  onClose,
}: ListeningTranscriptEvidenceViewProps) {
  const parts = useMemo(() => groupReviewParts(review), [review]);
  const [currentPartNumber, setCurrentPartNumber] = useState(
    parts[0]?.number || 1,
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    parts[0]?.questions[0]?.questionId || "",
  );
  const [activeEvidenceKey, setActiveEvidenceKey] = useState("");
  const [openEvidenceSegmentKey, setOpenEvidenceSegmentKey] = useState("");
  const [openQuestionExplanationId, setOpenQuestionExplanationId] =
    useState("");
  const [showDescription, setShowDescription] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const sentenceEndMsRef = useRef<number | null>(null);
  const sentenceFrameRef = useRef<number | null>(null);
  const startSentenceWatchRef = useRef<(() => void) | null>(null);
  const playbackRequestRef = useRef(0);
  const isDesktopLayout = useDesktopLayout();

  const currentPart =
    parts.find((part) => part.number === currentPartNumber) || parts[0];
  const currentPartIndex = Math.max(
    0,
    parts.findIndex((part) => part.number === currentPart?.number),
  );
  const transcriptDocuments = useMemo(
    () => (currentPart ? buildTranscriptDocuments(currentPart) : []),
    [currentPart],
  );
  const typographyPreset = getReadingTypographyPreset(fontScale);

  const firstAudioQuestion = useMemo(
    () =>
      (review.sections || [])
        .flatMap((section) => section.questions || [])
        .find(
          (question) =>
            question.audioStartMs != null && question.audioEndMs != null,
        ),
    [review.sections],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (!resultId || !firstAudioQuestion) {
      setAudioError(true);
      return;
    }

    let cancelled = false;
    let objectUrl = "";
    setAudioLoading(true);
    setAudioError(false);

    void overallTestService
      .getListeningEvidenceAudioBlob(
        resultId,
        firstAudioQuestion.questionId,
      )
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setAudioError(true);
      })
      .finally(() => {
        if (!cancelled) setAudioLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [firstAudioQuestion, resultId]);

  useEffect(() => {
    if (
      currentPart &&
      !currentPart.questions.some(
        (question) => question.questionId === selectedQuestionId,
      )
    ) {
      setSelectedQuestionId(currentPart.questions[0]?.questionId || "");
      setActiveEvidenceKey("");
      setOpenEvidenceSegmentKey("");
      setOpenQuestionExplanationId("");
    }
  }, [currentPart, selectedQuestionId]);

  const clearSentencePlayback = useCallback(() => {
    sentenceEndMsRef.current = null;
    if (sentenceFrameRef.current != null) {
      window.cancelAnimationFrame(sentenceFrameRef.current);
      sentenceFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const stopAtSentenceEnd = () => {
      const endMs = sentenceEndMsRef.current;
      if (endMs == null || audio.currentTime * 1000 < endMs) return;
      clearSentencePlayback();
      audio.pause();
      audio.currentTime = endMs / 1000;
    };
    const watchSentence = () => {
      sentenceFrameRef.current = null;
      stopAtSentenceEnd();
      if (sentenceEndMsRef.current != null && !audio.paused) {
        sentenceFrameRef.current = window.requestAnimationFrame(watchSentence);
      }
    };
    const onPlay = () => {
      if (sentenceEndMsRef.current != null && sentenceFrameRef.current == null) {
        sentenceFrameRef.current = window.requestAnimationFrame(watchSentence);
      }
    };
    startSentenceWatchRef.current = onPlay;
    audio.addEventListener("play", onPlay);
    audio.addEventListener("timeupdate", stopAtSentenceEnd);
    audio.addEventListener("pause", clearSentencePlayback);
    audio.addEventListener("ended", clearSentencePlayback);
    audio.addEventListener("error", clearSentencePlayback);
    return () => {
      playbackRequestRef.current += 1;
      clearSentencePlayback();
      startSentenceWatchRef.current = null;
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("timeupdate", stopAtSentenceEnd);
      audio.removeEventListener("pause", clearSentencePlayback);
      audio.removeEventListener("ended", clearSentencePlayback);
      audio.removeEventListener("error", clearSentencePlayback);
    };
  }, [audioUrl, clearSentencePlayback]);

  const seekToMs = useCallback((timeMs: number, endMs: number | null) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(timeMs)) return;
    // A preview playing another sentence remains a preview. Only playback
    // started with the main controls continues beyond the clicked sentence.
    const continuePlaying = !audio.paused && sentenceEndMsRef.current == null;
    if (!continuePlaying && (endMs == null || !Number.isFinite(endMs) || endMs <= timeMs)) {
      return;
    }
    clearSentencePlayback();
    sentenceEndMsRef.current = continuePlaying ? null : endMs;
    audio.currentTime = Math.max(0, timeMs) / 1000;
    const request = ++playbackRequestRef.current;
    void audio.play().then(() => {
      if (request === playbackRequestRef.current && !audio.paused) {
        startSentenceWatchRef.current?.();
      }
    }).catch(() => {
      if (request === playbackRequestRef.current) clearSentencePlayback();
    });
  }, [clearSentencePlayback]);

  const selectPart = (part: ListeningReviewPart) => {
    setCurrentPartNumber(part.number);
    setSelectedQuestionId(part.questions[0]?.questionId || "");
    setActiveEvidenceKey("");
    setOpenEvidenceSegmentKey("");
    setOpenQuestionExplanationId("");
  };

  const selectQuestion = (question: MockReviewQuestion) => {
    setSelectedQuestionId(question.questionId);
    const matchingEvidence = transcriptDocuments
      .flatMap((document) => document.segments)
      .flatMap((segment) => segment.evidenceRefs)
      .find((evidence) => evidence.questionId === question.questionId);
    setActiveEvidenceKey(matchingEvidence?.key || "");
    setOpenEvidenceSegmentKey("");
    setOpenQuestionExplanationId("");
  };

  const toggleQuestionExplanation = (question: MockReviewQuestion) => {
    setSelectedQuestionId(question.questionId);
    const matchingEvidence = transcriptDocuments
      .flatMap((document) => document.segments)
      .flatMap((segment) => segment.evidenceRefs)
      .find((evidence) => evidence.questionId === question.questionId);
    setActiveEvidenceKey(matchingEvidence?.key || "");
    setOpenEvidenceSegmentKey("");
    setOpenQuestionExplanationId((current) =>
      current === question.questionId ? "" : question.questionId,
    );
  };

  const activateEvidence = (
    evidence: TranscriptEvidenceRef,
    segmentKey: string,
  ) => {
    setSelectedQuestionId(evidence.questionId);
    setActiveEvidenceKey(evidence.key);
    setOpenQuestionExplanationId("");
    const displayKey = `${segmentKey}:${evidence.key}`;
    setOpenEvidenceSegmentKey((current) =>
      current === displayKey ? "" : displayKey,
    );
    if (evidence.audioStartMs != null) {
      seekToMs(evidence.audioStartMs, evidence.audioEndMs);
    }
    window.requestAnimationFrame(() => {
      document
        .getElementById(
          `listening-review-question-${evidence.questionNumber}`,
        )
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  };

  const selectPartByOffset = (offset: number) => {
    const part = parts[currentPartIndex + offset];
    if (part) selectPart(part);
  };

  if (!currentPart) return null;

  const renderQuestion = (question: MockReviewQuestion) => {
    const selected = question.questionId === selectedQuestionId;
    const matching =
      currentPart.number === 3 || currentPart.number === 4;
    const blank = isBlankReviewAnswer(question.userAnswer);
    const explanationOpen =
      openQuestionExplanationId === question.questionId;
    const userAnswerClass = question.isCorrect
      ? "text-[#2f6f3d]"
      : blank
        ? "text-[#77766f]"
        : "text-[#a33737]";

    return (
      <article
        key={question.questionId}
        id={`listening-review-question-${question.number}`}
        className={`scroll-mt-4 border-b border-[#e5e5e2] px-5 py-4 transition-colors last:border-b-0 ${
          selected ? "bg-[#fafaf8]" : "bg-white"
        }`}
      >
        <button
          type="button"
          onClick={() => selectQuestion(question)}
          className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-2"
        >
          <span className="inline-flex h-7 min-w-9 shrink-0 items-center justify-center rounded-[5px] bg-[#f1f1ee] px-1.5 text-[13px] font-semibold leading-none tabular-nums text-[#242424]">
            S{question.number}
          </span>
          <span className="listening-review-question-copy min-w-0 flex-1 pt-0.5 font-normal text-[#242424]">
            {question.text?.trim() || `Soru ${question.number}`}
          </span>
        </button>

        {matching ? (
          <div className="ml-12 mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-[6px] border border-[#dededb] bg-white px-3 py-2">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#787774]">
                Cevabınız
              </span>
              <span
                className={`listening-review-answer-copy mt-0.5 block font-semibold ${userAnswerClass}`}
              >
                {formatReviewAnswer(question.userAnswer)}
              </span>
            </div>
            <div className="rounded-[6px] border border-[#dededb] bg-white px-3 py-2">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#787774]">
                Doğru cevap
              </span>
              <span className="listening-review-answer-copy mt-0.5 block font-semibold text-[#2f6f3d]">
                {formatCorrectAnswers(question.answers)}
              </span>
            </div>
          </div>
        ) : (
          <div className="ml-12 mt-3 space-y-1.5">
            {(question.answers || []).map((answer, index) => {
              const variant = String(
                answer.variantText || String.fromCharCode(65 + index),
              );
              const answerText = String(answer.text || "").replace(
                /^[A-ZÇĞİÖŞÜ][.)]\s*/i,
                "",
              );
              const userSelected = selectedAnswerMatches(
                question,
                variant,
                answerText,
              );
              const wrongSelection = userSelected && !answer.correct;
              const rowClass = answer.correct
                ? "text-[#2f6f3d]"
                : wrongSelection
                  ? "text-[#a33737]"
                  : "text-[#37352f]";
              const radioClass = answer.correct
                ? "border-[#438553]"
                : wrongSelection
                  ? "border-[#c74646]"
                  : "border-[#b9b9b5]";
              const dotClass = answer.correct
                ? "bg-[#438553]"
                : wrongSelection
                  ? "bg-[#c74646]"
                  : "bg-[#5f5e5a]";

              return (
                <button
                  key={`${question.questionId}-${variant}`}
                  type="button"
                  onClick={() => selectQuestion(question)}
                  className={`reading-option-row grid min-h-10 w-full items-start gap-x-2 px-2.5 py-2 text-left transition-colors focus-visible:rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1 ${rowClass}`}
                >
                  <span
                    aria-hidden="true"
                    className="reading-option-radio-slot"
                  >
                    <span
                      className={`reading-option-radio-ring rounded-full border ${radioClass}`}
                    >
                      {userSelected || answer.correct ? (
                        <span
                          className={`reading-option-radio-dot rounded-full ${dotClass}`}
                        />
                      ) : null}
                    </span>
                  </span>
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="reading-option-letter shrink-0 font-semibold">
                      {variant}
                    </span>
                    <span className="reading-option-copy min-w-0 font-normal !text-inherit">
                      {answerText || variant}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="ml-12 mt-3">
          <button
            type="button"
            data-listening-question-explanation
            onClick={() => toggleQuestionExplanation(question)}
            aria-expanded={explanationOpen}
            className="inline-flex min-h-8 items-center rounded-[6px] border border-[#d8d8d4] bg-white px-3 text-[12px] font-semibold text-[#37352f] transition-colors hover:bg-[#f1f1ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1"
          >
            Neden doğru?
          </button>

          {explanationOpen ? (
            <div className="mt-2 max-w-[620px] rounded-[7px] border border-[#dededb] bg-white px-4 py-3">
              <ReadingEvidenceExplanation
                value={
                  question.explanation ||
                  "Bu soru için kısa açıklama eklenmemiş."
                }
                className="listening-review-explanation-copy block font-normal text-[#242424]"
              />
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <section
      className="reading-exam-page fixed inset-0 z-[120] flex h-[100dvh] flex-col overflow-hidden bg-white font-sans text-[#242424]"
      style={typographyPreset.style}
      aria-label="Dinleme sonuç incelemesi"
    >
      <header className="shrink-0 border-b border-[#e5e5e2] bg-white">
        <div className="px-2 sm:px-4">
          <div className="grid h-[60px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 lg:grid-cols-[auto_1fr_auto] lg:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/logo11.svg"
                alt="TURKISHMOCK"
                className="hidden h-10 w-auto shrink-0 object-contain sm:block"
              />
              <span
                aria-hidden="true"
                className="hidden h-5 w-px shrink-0 bg-[#dededb] sm:block"
              />
              <span className="truncate text-[17px] font-semibold text-[#37352f]">
                Dinleme
              </span>
            </div>

            <div className="justify-self-center rounded-md border border-[#e5e5e2] bg-[#f7f7f5] px-3 py-1.5 text-sm font-semibold text-[#37352f]">
              Sonuç inceleme
            </div>

            <div className="flex items-center justify-self-end gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f]"
                    aria-label="Yazı boyutu"
                    title="Yazı boyutu"
                  >
                    <ALargeSmall className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="z-[180] w-40 border-[#dededb] bg-white text-[#37352f] shadow-md"
                >
                  <DropdownMenuRadioGroup
                    value={typographyPreset.menuValue}
                    onValueChange={(value) => setFontScale(Number(value))}
                  >
                    <DropdownMenuRadioItem value="0.9">
                      Küçük
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="1">
                      Standart
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="1.1">
                      Büyük
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded border border-[#dededb] bg-white text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f]"
                aria-label="İncelemeyi kapat"
                title="Soru listesine dön"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-2 mt-2 shrink-0 border-b border-[#e5e5e2] bg-white px-3 py-3 sm:mx-4 sm:px-4">
        <div
          className={`flex items-center justify-between gap-3 ${
            showDescription ? "mb-1.5" : ""
          }`}
        >
          <h2 className="reading-part-heading">
            Bölüm {currentPart.number}
          </h2>
          <button
            type="button"
            onClick={() => setShowDescription((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#6f6d67] hover:bg-[#f1f1ef] hover:text-[#37352f]"
            aria-expanded={showDescription}
            aria-label={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
            title={showDescription ? "Anlatımı gizle" : "Anlatımı göster"}
          >
            {showDescription ? (
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {showDescription ? (
          <p className="reading-part-description max-w-6xl">
            {currentPart.description}
          </p>
        ) : null}

        <div className="mt-3 flex min-h-11 items-center rounded-[8px] border border-[#d6e3d6] bg-[#f7faf7] px-3 py-2">
          {audioLoading ? (
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#526b57]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Ses yükleniyor
            </div>
          ) : audioError || !audioUrl ? (
            <p className="text-[13px] font-medium text-[#7c4545]">
              Ses kaydı şu anda oynatılamıyor.
            </p>
          ) : (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              preload="metadata"
              className="h-10 w-full"
              onError={() => setAudioError(true)}
            />
          )}
        </div>
      </section>

      <main className="min-h-0 flex-1 overflow-y-auto bg-white lg:overflow-hidden">
        {isDesktopLayout ? (
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full min-h-[420px] overflow-hidden border-y border-[#e5e5e2]"
          >
            <ResizablePanel defaultSize={52} minSize={36}>
              <section
                className="reading-scroll h-full overflow-y-auto bg-white px-6 py-5"
                aria-label="Tam transkript"
              >
                <TranscriptPanel
                  documents={transcriptDocuments}
                  activeEvidenceKey={activeEvidenceKey}
                  openEvidenceSegmentKey={openEvidenceSegmentKey}
                  selectedQuestionId={selectedQuestionId}
                  typographyStyle={typographyPreset.style}
                  onActivateEvidence={activateEvidence}
                  onActivateSentence={seekToMs}
                />
              </section>
            </ResizablePanel>
            <ListeningSplitHandle />
            <ResizablePanel defaultSize={48} minSize={34}>
              <section
                className="reading-scroll h-full overflow-y-auto bg-white"
                aria-label="Sorular ve cevaplar"
              >
                {currentPart.number === 4 &&
                currentPart.sections.find((section) => section.imageUrl)
                  ?.imageUrl ? (
                  <div className="border-b border-[#e5e5e2] bg-[#fafaf8] p-5">
                    <img
                      {...protectedImageProps}
                      src={toApiUrl(
                        currentPart.sections.find(
                          (section) => section.imageUrl,
                        )?.imageUrl,
                      )}
                      alt="Sorular 19-23 için harita"
                      className="mx-auto block max-h-[380px] w-full object-contain"
                    />
                  </div>
                ) : null}
                {currentPart.questions.map(renderQuestion)}
              </section>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="grid min-h-full">
            <section
              className="border-b border-[#e5e5e2] bg-white px-4 py-5"
              aria-label="Tam transkript"
            >
              <TranscriptPanel
                documents={transcriptDocuments}
                activeEvidenceKey={activeEvidenceKey}
                openEvidenceSegmentKey={openEvidenceSegmentKey}
                selectedQuestionId={selectedQuestionId}
                typographyStyle={typographyPreset.style}
                onActivateEvidence={activateEvidence}
                onActivateSentence={seekToMs}
              />
            </section>
            <section
              className="bg-white"
              aria-label="Sorular ve cevaplar"
            >
              {currentPart.number === 4 &&
              currentPart.sections.find((section) => section.imageUrl)
                  ?.imageUrl ? (
                <img
                  {...protectedImageProps}
                  src={toApiUrl(
                    currentPart.sections.find((section) => section.imageUrl)
                      ?.imageUrl,
                  )}
                  alt="Sorular 19-23 için harita"
                  className="mx-auto max-h-[360px] w-full object-contain p-4"
                />
              ) : null}
              {currentPart.questions.map(renderQuestion)}
            </section>
          </div>
        )}
      </main>

      <footer className="z-50 shrink-0 border-t border-[#e5e5e2] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2">
          <nav
            className="flex shrink-0 items-center gap-1"
            aria-label="Dinleme bölümleri"
          >
            {parts.map((part) => {
              const active = part.number === currentPart.number;
              return (
                <button
                  key={part.number}
                  type="button"
                  onClick={() => selectPart(part)}
                  className={`h-8 rounded-md px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] ${
                    active
                      ? "bg-[#e9e9e6] text-[#2f2e2a] shadow-[inset_0_0_0_1px_#c9c9c4]"
                      : "text-[#6f6d67] hover:bg-[#f1f1ef] hover:text-[#37352f]"
                  }`}
                >
                  Bölüm {part.number}
                </button>
              );
            })}
          </nav>

          <div className="h-6 w-px shrink-0 bg-[#e5e5e2]" />

          <nav
            className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto"
            aria-label={`Bölüm ${currentPart.number} soruları`}
          >
            {currentPart.questions.map((question) => {
              const selected =
                question.questionId === selectedQuestionId;
              return (
                <button
                  key={question.questionId}
                  type="button"
                  onClick={() => selectQuestion(question)}
                  className={`flex h-8 w-8 min-w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] ${
                    selected
                      ? "border-[#6f6d67] bg-[#f1f1ef] text-[#2f2e2a] shadow-[inset_0_0_0_1px_#6f6d67]"
                      : questionStatusClass(question)
                  }`}
                  aria-current={selected ? "step" : undefined}
                  aria-label={`Soru ${question.number}`}
                >
                  {question.number}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => selectPartByOffset(-1)}
              disabled={currentPartIndex === 0}
              className="flex h-9 min-h-9 w-9 items-center justify-center rounded border border-[#d8d8d4] bg-white p-0 text-[#37352f] hover:bg-[#f1f1ef] disabled:opacity-40"
              aria-label="Önceki bölüm"
              title="Önceki bölüm"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => selectPartByOffset(1)}
              disabled={currentPartIndex >= parts.length - 1}
              className="flex h-9 min-h-9 w-9 items-center justify-center rounded border border-[#d8d8d4] bg-white p-0 text-[#37352f] hover:bg-[#f1f1ef] disabled:opacity-40"
              aria-label="Sonraki bölüm"
              title="Sonraki bölüm"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </footer>
    </section>
  );
}

function TranscriptPanel({
  documents,
  activeEvidenceKey,
  openEvidenceSegmentKey,
  selectedQuestionId,
  typographyStyle,
  onActivateEvidence,
  onActivateSentence,
}: {
  documents: TranscriptDocument[];
  activeEvidenceKey: string;
  openEvidenceSegmentKey: string;
  selectedQuestionId: string;
  typographyStyle: CSSProperties;
  onActivateEvidence: (
    evidence: TranscriptEvidenceRef,
    segmentKey: string,
  ) => void;
  onActivateSentence: (audioStartMs: number, audioEndMs: number) => void;
}) {
  const hasTranscript = documents.some((document) =>
    document.segments.some((segment) => segment.text),
  );

  return (
    <div className="mx-auto w-full max-w-[880px]">
      <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-[#e5e5e2] pb-3">
        <h3 className="reading-part-heading">
          Transkript
        </h3>
        <span className="text-[12px] font-medium text-[#787774]">
          Bir cümleye tıklayarak o noktadan dinleyin
        </span>
      </div>

      {hasTranscript ? (
        <div className="space-y-6">
          {documents.map((document, documentIndex) => (
            <div
              key={document.sectionId}
              className={`reading-passage-copy whitespace-pre-wrap font-normal text-[#242424] ${
                documentIndex > 0
                  ? "border-t border-[#e5e5e2] pt-6"
                  : ""
              }`}
            >
              {groupTranscriptSegments(document.segments).map((group) => (
                <TranscriptSentenceGroupMark
                  key={group.key}
                  group={group}
                  onActivate={onActivateSentence}
                >
                  {group.segments.map((segment) => {
                    if (segment.evidenceRefs.length === 0) {
                      return (
                        <span
                          key={segment.key}
                          className="listening-transcript-sentence-piece rounded-[2px] transition-colors"
                        >
                          {renderStyledTranscriptText(
                            segment.text,
                            segment.bold,
                            segment.italic,
                          )}
                        </span>
                      );
                    }

                    const evidence =
                      segment.evidenceRefs.find(
                        (candidate) =>
                          candidate.questionId === selectedQuestionId,
                      ) || segment.evidenceRefs[0];
                    const startingQuestionNumbers = Array.from(
                      new Set(
                        segment.startingEvidenceRefs.map(
                          (candidate) => candidate.questionNumber,
                        ),
                      ),
                    );
                    const evidenceLabel =
                      startingQuestionNumbers.length > 0
                        ? startingQuestionNumbers
                            .map((number) => `S${number}`)
                            .join(" · ")
                        : `S${evidence.questionNumber}`;
                    const displayKey = `${segment.key}:${evidence.key}`;

                    return (
                      <TranscriptEvidenceMark
                        key={segment.key}
                        active={activeEvidenceKey === evidence.key}
                        evidence={evidence}
                        evidenceLabel={evidenceLabel}
                        open={openEvidenceSegmentKey === displayKey}
                        segment={segment}
                        typographyStyle={typographyStyle}
                        onActivate={onActivateEvidence}
                      />
                    );
                  })}
                </TranscriptSentenceGroupMark>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[7px] border border-[#dededb] bg-white px-4 py-8 text-center text-[13px] text-[#787774]">
          Bu bölüm için transkript bulunmuyor.
        </p>
      )}
    </div>
  );
}
