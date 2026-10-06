import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  answerValues,
  isBlankReviewAnswer,
  type MockReviewQuestion,
} from "./evidence-review-utils";
import ReadingEvidenceExplanation from "./ReadingEvidenceExplanation";
import { buildReadingKeywordHighlights, splitReadingKeywords } from "./reading-review-keywords";

export interface ReadingReviewQuestion extends MockReviewQuestion {
  partNumber: number;
  sourceText?: string;
}

export interface ReadingReviewContextValue {
  activeQuestionId: string;
  openEvidenceKey: string;
  questions: ReadingReviewQuestion[];
  selectQuestion: (questionId: string) => void;
  toggleEvidence: (questionId: string, evidenceKey: string) => void;
}

interface ReadingReviewProviderProps extends ReadingReviewContextValue {
  children: ReactNode;
}

interface ReadingReviewEvidenceTextProps {
  text: string;
  as?: "p" | "span";
  className?: string;
  wrapperAs?: "div" | "span";
  sourceText?: string;
  sourceOffset?: number;
}

interface ReadingReviewAnswerNoteProps {
  questionId: string;
  formatAnswer?: (value: string) => string;
  className?: string;
  blankOnly?: boolean;
}

interface ReadingReviewOptionListProps {
  options: Array<{
    value: string;
    label: string;
  }>;
  className?: string;
  questionId?: string;
}

interface ReadingReviewQuestionExplanationProps {
  questionId: string;
  className?: string;
  inOptionRow?: boolean;
}

export type ReadingReviewOptionState =
  | "correct"
  | "incorrect"
  | "neutral";

const ReadingReviewContext =
  createContext<ReadingReviewContextValue | null>(null);

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findEvidenceRange = (source: string, evidence: string) => {
  const exactIndex = source.indexOf(evidence);
  if (exactIndex >= 0) {
    return { start: exactIndex, end: exactIndex + evidence.length };
  }

  const words = evidence.trim().split(/\s+/).filter(Boolean);
  if (words.length > 0) {
    const flexiblePattern = words.map(escapeRegExp).join("\\s+");
    const match = new RegExp(flexiblePattern, "iu").exec(source);
    if (match?.index != null) {
      return { start: match.index, end: match.index + match[0].length };
    }
  }

  const trimmedSource = source.trim();
  if (trimmedSource.length >= 16 && evidence.includes(trimmedSource)) {
    const start = source.indexOf(trimmedSource);
    return { start, end: start + trimmedSource.length };
  }

  return null;
};

const evidenceTexts = (question: ReadingReviewQuestion) => {
  const spans =
    Array.isArray(question.evidenceSpans) &&
    question.evidenceSpans.length > 0
      ? question.evidenceSpans.map((span) => span.evidenceText)
      : [question.evidenceText];

  return Array.from(
    new Set(
      spans
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
};

const evidenceRanges = (
  question: ReadingReviewQuestion,
  source: string,
) => {
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

  return spans.flatMap((span) => {
    const evidence = String(span.evidenceText || "");
    const start = Number(span.textStart);
    const end = Number(span.textEnd);
    const hasExactRange =
      evidence.length > 0 &&
      Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 0 &&
      end > start &&
      end <= source.length &&
      source.slice(start, end) === evidence;

    if (hasExactRange) return [{ start, end }];

    const fallback = evidence ? findEvidenceRange(source, evidence) : null;
    return fallback ? [fallback] : [];
  });
};

export function ReadingReviewProvider({
  activeQuestionId,
  children,
  openEvidenceKey,
  questions,
  selectQuestion,
  toggleEvidence,
}: ReadingReviewProviderProps) {
  const value = useMemo(
    () => ({
      activeQuestionId,
      openEvidenceKey,
      questions,
      selectQuestion,
      toggleEvidence,
    }),
    [
      activeQuestionId,
      openEvidenceKey,
      questions,
      selectQuestion,
      toggleEvidence,
    ],
  );

  return (
    <ReadingReviewContext.Provider value={value}>
      {children}
    </ReadingReviewContext.Provider>
  );
}

export const useReadingReviewContext = () =>
  useContext(ReadingReviewContext);

const ReadingReviewEvidenceSegment = ({
  evidenceKey,
  questionId,
  startsEvidence,
  text,
}: {
  evidenceKey: string;
  questionId: string;
  startsEvidence: boolean;
  text: string;
}) => {
  const review = useReadingReviewContext();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({
    left: 12,
    top: 12,
    width: 400,
    ready: false,
  });

  const openQuestion =
    evidenceKey === review?.openEvidenceKey
      ? review.questions.find(
          (candidate) => candidate.questionId === questionId,
        )
      : null;
  const question = review?.questions.find(
    (candidate) => candidate.questionId === questionId,
  );
  const leadingEvidenceMatch = startsEvidence
    ? /^(\S+)([\s\S]*)$/u.exec(text)
    : null;
  const leadingEvidenceText = leadingEvidenceMatch?.[1] ?? text;
  const remainingEvidenceText = leadingEvidenceMatch?.[2] ?? "";

  useLayoutEffect(() => {
    if (!openQuestion) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      const tooltip = tooltipRef.current;
      if (!anchor || !tooltip) return;

      const viewportPadding = 12;
      const gap = 8;
      const width = Math.min(
        400,
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
  }, [openQuestion]);

  if (!review || !question) return <>{text}</>;

  return (
    <span ref={anchorRef} className="group relative inline">
      {startsEvidence ? (
        <>
          <span className="whitespace-nowrap">
            <button
              type="button"
              className={`reading-review-evidence -mr-px inline-flex h-[22px] w-[34px] items-center justify-center rounded-l-[3px] rounded-r-none bg-[#256b2b] px-1 align-[2px] text-[13px] font-bold leading-5 text-white transition-colors ${
                openQuestion ? "bg-[#174d20]" : "hover:bg-[#1f5d25]"
              }`}
              onClick={() =>
                review.toggleEvidence(questionId, evidenceKey)
              }
              aria-label={`S${question.number} kanıt açıklaması`}
              aria-pressed={Boolean(openQuestion)}
            >
              S{question.number}
            </button>
            <span
              role="button"
              tabIndex={remainingEvidenceText ? -1 : 0}
              className={`reading-review-evidence cursor-pointer box-decoration-clone rounded-l-none bg-[#d9f2c8] px-[2px] py-[1px] text-left text-[#242424] transition-colors hover:bg-[#caeab5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7faa70]/40 ${
                remainingEvidenceText
                  ? "rounded-r-none"
                  : "rounded-r-[2px]"
              }`}
              onClick={() =>
                review.toggleEvidence(questionId, evidenceKey)
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                review.toggleEvidence(questionId, evidenceKey);
              }}
              aria-pressed={Boolean(openQuestion)}
            >
              {leadingEvidenceText}
            </span>
          </span>
          {remainingEvidenceText ? (
            <span
              role="button"
              tabIndex={0}
              className="reading-review-evidence cursor-pointer box-decoration-clone rounded-l-none rounded-r-[2px] bg-[#d9f2c8] px-[2px] py-[1px] text-left text-[#242424] transition-colors hover:bg-[#caeab5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7faa70]/40"
              onClick={() =>
                review.toggleEvidence(questionId, evidenceKey)
              }
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                review.toggleEvidence(questionId, evidenceKey);
              }}
              aria-pressed={Boolean(openQuestion)}
            >
              {remainingEvidenceText}
            </span>
          ) : null}
        </>
      ) : (
        <span
          role="button"
          tabIndex={0}
          className="reading-review-evidence cursor-pointer box-decoration-clone rounded-[2px] bg-[#d9f2c8] px-[2px] py-[1px] text-left text-[#242424] transition-colors hover:bg-[#caeab5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7faa70]/40"
          onClick={() =>
            review.toggleEvidence(questionId, evidenceKey)
          }
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            review.toggleEvidence(questionId, evidenceKey);
          }}
          aria-pressed={Boolean(openQuestion)}
        >
          {text}
        </span>
      )}

      {openQuestion && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              style={{
                left: tooltipPosition.left,
                top: tooltipPosition.top,
                width: tooltipPosition.width,
                opacity: tooltipPosition.ready ? 1 : 0,
              }}
              className="fixed z-[160] max-h-[240px] overflow-y-auto whitespace-normal rounded-[7px] border border-[#cbdac5] bg-white px-4 py-3 text-left shadow-[0_10px_30px_rgba(15,23,42,0.14)] transition-opacity"
            >
              <span className="block text-[12px] font-semibold tracking-normal text-[#32642e]">
                Soru {openQuestion.number} · Neden doğru?
              </span>
              <ReadingEvidenceExplanation
                value={
                  openQuestion.explanation ||
                  "Bu soru için kısa açıklama eklenmemiş."
                }
                className="mt-1.5 block text-[15px] font-normal leading-[22px] text-[#242424]"
              />
            </span>,
            document.body,
          )
        : null}
    </span>
  );
};

const normalizeAnswerValue = (value: string) =>
  String(value || "").trim().replace(/\.$/, "");

export const getReadingReviewQuestion = (
  review: ReadingReviewContextValue | null,
  questionId: string,
) =>
  review?.questions.find(
    (question) => question.questionId === questionId,
  ) || null;

export const getReadingReviewOptionState = (
  review: ReadingReviewContextValue | null,
  questionId: string,
  variantText: string,
): ReadingReviewOptionState => {
  const question = getReadingReviewQuestion(review, questionId);
  if (!question) return "neutral";

  const variant = normalizeAnswerValue(variantText);
  const correct = question.answers.some(
    (answer) =>
      answer.correct &&
      normalizeAnswerValue(answer.variantText) === variant,
  );
  const selectedByUser = answerValues(question.userAnswer)
    .map(normalizeAnswerValue)
    .includes(variant);
  if (correct) {
    return "correct";
  }

  const selectedIncorrectly =
    !question.isCorrect &&
    selectedByUser;
  return selectedIncorrectly ? "incorrect" : "neutral";
};

export function ReadingReviewOptionList({
  options,
  className,
  questionId,
}: ReadingReviewOptionListProps) {
  const review = useReadingReviewContext();
  const question = getReadingReviewQuestion(
    review,
    questionId || review?.activeQuestionId || "",
  );
  if (!review || !question) return null;

  const blank = isBlankReviewAnswer(question.userAnswer);
  const sharedOptions = [1, 2, 3].includes(question.partNumber);
  const sharedPartQuestions = sharedOptions
    ? review.questions.filter(candidate => candidate.partNumber === question.partNumber)
    : [question];

  return (
    <div className={className || ""}>
      {blank ? (
        <div className="mb-2 text-[12px] font-medium text-[#78766f]">
          S{question.number}: Cevap verilmedi
        </div>
      ) : null}

      <div className={sharedOptions ? "reading-review-shared-options" : "space-y-1"}>
        {options.map((option) => {
          const owners = sharedPartQuestions.filter(candidate =>
            candidate.answers.some(answer =>
              answer.correct &&
              normalizeAnswerValue(answer.variantText) === normalizeAnswerValue(option.value),
            ),
          );
          const state = owners.length ? "correct" : getReadingReviewOptionState(
            review,
            question.questionId,
            option.value,
          );
          const normalizedValue = normalizeAnswerValue(option.value);
          const optionCopy =
            option.label.replace(
              new RegExp(
                `^${escapeRegExp(normalizedValue)}[.)]?\\s*`,
                "iu",
              ),
              "",
            ) || option.label;

          const optionSegments = owners[0]?.partNumber === 2
            ? splitReadingKeywords(
              optionCopy,
              buildReadingKeywordHighlights(
                owners[0],
                owners[0].sourceText || owners[0].questionContent || "",
                optionCopy,
              ).answerRanges,
            )
            : [{ text: optionCopy, highlighted: false }];

          const explanations = owners.map(owner => (
            <ReadingReviewQuestionExplanation
              key={owner.questionId}
              questionId={owner.questionId}
              inOptionRow={sharedOptions}
              className={sharedOptions ? "reading-review-inline-explanation" : "ml-[calc(1.5rem+0.5rem)] mt-1"}
            />
          ));

          return (
            <div key={option.value} className={sharedOptions ? "reading-review-shared-option-row" : "px-2.5 py-2"}>
              <div
                data-reading-review-option-state={state}
                data-reading-review-option-unused={sharedOptions && owners.length === 0 ? true : undefined}
                className={`reading-option-legend ${sharedOptions ? "reading-review-shared-option grid items-baseline" : "grid grid-cols-[1.5rem_minmax(0,1fr)] items-baseline gap-x-2"} ${
                  state === "correct" && !sharedOptions
                    ? "text-[#2f6f3d]"
                    : state === "incorrect"
                      ? "text-[#a33737]"
                      : "text-[#37352f]"
                }`}
              >
                {sharedOptions ? (
                  <span data-reading-review-question-number className="whitespace-nowrap font-semibold tabular-nums text-[#242424]">
                    {owners.map(owner => `S${owner.number}`).join(", ")}
                  </span>
                ) : null}
                <span className="reading-option-letter shrink-0 font-semibold tabular-nums">
                  {normalizedValue}.
                </span>
                <span className="reading-text reading-option-copy min-w-0 break-words font-normal">
                  {optionSegments.map((segment, index) => segment.highlighted ? (
                    <mark key={index} data-reading-keyword className="rounded-sm bg-[#d9f2c8] px-0.5 font-semibold text-[#242424]">
                      {segment.text}
                    </mark>
                  ) : <span key={index}>{segment.text}</span>)}
                </span>
                {sharedOptions ? explanations : null}
              </div>
              {!sharedOptions ? explanations : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ReadingReviewQuestionExplanation({
  questionId,
  className,
  inOptionRow = false,
}: ReadingReviewQuestionExplanationProps) {
  const review = useReadingReviewContext();
  const question = getReadingReviewQuestion(review, questionId);
  const [open, setOpen] = useState(false);

  if (!review || !question) return null;

  const toggle = () => {
    review.selectQuestion(questionId);
    setOpen((current) => !current);
  };

  return (
    <div className={className || ""}>
      <button
        type="button"
        data-reading-question-explanation
        onClick={toggle}
        aria-expanded={open}
        aria-label={`S${question.number}: Neden doğru?`}
        className={`reading-review-explanation-control ${inOptionRow ? "reading-review-option-explanation-control " : ""}inline-flex min-h-8 items-center rounded-[6px] border border-[#d8d8d4] bg-white px-3 text-[12px] font-semibold text-[#37352f] transition-colors hover:bg-[#f1f1ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1`}
      >
        Neden doğru?
      </button>

      {open ? (
        <div className={`${inOptionRow ? "reading-review-option-explanation-panel " : ""}mt-2 max-w-[620px] rounded-[7px] border border-[#dededb] bg-white px-4 py-3`}>
          <ReadingEvidenceExplanation
            value={
              question.explanation ||
              "Bu soru için kısa açıklama eklenmemiş."
            }
            className="reading-review-explanation-copy block font-normal text-[#242424]"
          />
        </div>
      ) : null}
    </div>
  );
}

export function ReadingReviewAnswerNote({
  questionId,
  formatAnswer = (value) => value,
  className,
  blankOnly = false,
}: ReadingReviewAnswerNoteProps) {
  const review = useReadingReviewContext();
  const question = getReadingReviewQuestion(review, questionId);
  if (!question || question.isCorrect) return null;

  if (isBlankReviewAnswer(question.userAnswer)) {
    return (
      <span
        className={`inline-flex rounded-[4px] border border-[#d9d8d2] bg-[#f5f5f3] px-2 py-1 text-[12px] font-semibold leading-none text-[#6f6e68] ${className || ""}`}
      >
        Cevap verilmedi
      </span>
    );
  }

  if (blankOnly) return null;

  const answer = answerValues(question.userAnswer)
    .map((value) => formatAnswer(normalizeAnswerValue(value)))
    .join(" / ");

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-[4px] border border-[#efb8b8] bg-[#fff1f1] px-2 py-1 text-[12px] leading-snug text-[#a33737] ${className || ""}`}
    >
      <span className="shrink-0 font-semibold">Cevabınız:</span>
      <span className="min-w-0 break-words line-through">{answer}</span>
    </span>
  );
}

export function ReadingReviewEvidenceText({
  text,
  as = "p",
  className,
  sourceOffset,
  sourceText,
  wrapperAs = "div",
}: ReadingReviewEvidenceTextProps) {
  const review = useReadingReviewContext();
  const evidenceTextId = useId();
  const ranges = useMemo(() => {
    if (!review || !text) return [];
    const activeQuestion = review.questions.find(
      (question) => question.questionId === review.activeQuestionId,
    );
    if (!activeQuestion) return [];
    // Blank completion is explained beside each option; don't paint the passage.
    if (activeQuestion.partNumber === 1) return [];
    const partQuestions = review.questions.filter(
      (question) => question.partNumber === activeQuestion.partNumber,
    );

    if (activeQuestion.partNumber === 2) {
      return partQuestions.flatMap(question => {
        const source = question.sourceText || question.questionContent || "";
        const offset = source.indexOf(text);
        if (!source || offset < 0) return [];
        return buildReadingKeywordHighlights(question, source).sourceRanges.flatMap(range => {
          const start = Math.max(range.start, offset) - offset;
          const end = Math.min(range.end, offset + text.length) - offset;
          return end > start ? [{
            start,
            end,
            questionId: question.questionId,
            evidenceKey: `${question.questionId}:keyword:${range.start}:${range.end}`,
          }] : [];
        });
      });
    }

    const usesSourceCoordinates =
      typeof sourceText === "string" &&
      Number.isInteger(sourceOffset) &&
      Number(sourceOffset) >= 0 &&
      sourceText.slice(
        Number(sourceOffset),
        Number(sourceOffset) + text.length,
      ) === text;

    if (usesSourceCoordinates) {
      const chunkStart = Number(sourceOffset);
      const chunkEnd = chunkStart + text.length;

      return partQuestions
        .flatMap((question) =>
          evidenceRanges(question, sourceText).flatMap((range) => {
            const start = Math.max(range.start, chunkStart);
            const end = Math.min(range.end, chunkEnd);
            return end > start
              ? [
                  {
                    start: start - chunkStart,
                    end: end - chunkStart,
                    questionId: question.questionId,
                    evidenceKey: `${question.questionId}:${range.start}:${range.end}:${start}:${end}`,
                  },
                ]
              : [];
          }),
        )
        .filter(
          (range) =>
            range.start >= 0 &&
            range.end > range.start &&
            range.end <= text.length,
        );
    }

    return partQuestions
      .flatMap((question) =>
        evidenceTexts(question).flatMap((evidence) => {
          const range = findEvidenceRange(text, evidence);
          return range
            ? [
                {
                  ...range,
                  questionId: question.questionId,
                  evidenceKey: `${question.questionId}:local:${range.start}:${range.end}`,
                },
              ]
            : [];
        }),
      )
      .filter(
        (range) =>
          range.start >= 0 &&
          range.end > range.start &&
          range.end <= text.length,
      );
  }, [review, sourceOffset, sourceText, text]);

  const segments = useMemo(() => {
    if (!review || ranges.length === 0) {
      return [
        {
          text,
          evidenceRefs: [] as Array<{
            questionId: string;
            evidenceKey: string;
          }>,
          startingEvidenceRefs: [] as Array<{
            questionId: string;
            evidenceKey: string;
          }>,
        },
      ];
    }

    const boundaries = Array.from(
      new Set([
        0,
        text.length,
        ...ranges.flatMap((range) => [range.start, range.end]),
      ]),
    ).sort((left, right) => left - right);

    return boundaries.slice(0, -1).flatMap((start, index) => {
      const end = boundaries[index + 1];
      const segmentText = text.slice(start, end);
      if (!segmentText) return [];

      const evidenceRefs = ranges
        .filter((range) => range.start <= start && range.end >= end)
        .map((range) => ({
          questionId: range.questionId,
          evidenceKey: range.evidenceKey,
        }))
        .filter(
          (reference, referenceIndex, references) =>
            references.findIndex(
              (candidate) =>
                candidate.questionId === reference.questionId &&
                candidate.evidenceKey === reference.evidenceKey,
            ) === referenceIndex,
        );

      const startingEvidenceRefs = ranges
        .filter((range) => range.start === start)
        .map((range) => ({
          questionId: range.questionId,
          evidenceKey: range.evidenceKey,
        }))
        .filter(
          (reference, referenceIndex, references) =>
            references.findIndex(
              (candidate) =>
                candidate.questionId === reference.questionId &&
                candidate.evidenceKey === reference.evidenceKey,
            ) === referenceIndex,
        );

      return [
        {
          text: segmentText,
          evidenceRefs,
          startingEvidenceRefs,
        },
      ];
    });
  }, [ranges, text, review]);

  if (!review) return null;

  const Component = as === "span" ? "span" : "p";
  const Wrapper = wrapperAs === "span" ? "span" : "div";

  return (
    <Wrapper className="relative select-text">
      <Component
        className={`reading-text whitespace-pre-line font-sans ${className || ""}`}
      >
        {segments.map((segment, index) => {
          if (segment.evidenceRefs.length === 0) {
            return (
              <span key={`reading-review-text-${index}`}>{segment.text}</span>
            );
          }

          const evidenceRef =
            segment.evidenceRefs.find(
              (candidate) =>
                candidate.questionId === review.activeQuestionId,
            ) || segment.evidenceRefs[0];
          const startsEvidence = segment.startingEvidenceRefs.some(
            (candidate) =>
              candidate.questionId === evidenceRef.questionId &&
              candidate.evidenceKey === evidenceRef.evidenceKey,
          );
          const displayEvidenceKey = `${evidenceTextId}:${evidenceRef.evidenceKey}:segment:${index}`;

          if (getReadingReviewQuestion(review, evidenceRef.questionId)?.partNumber === 2) {
            return (
              <mark key={`keyword-${index}`} data-reading-keyword className="rounded-sm bg-[#d9f2c8] px-0.5 font-semibold text-[#242424]">
                {segment.text}
              </mark>
            );
          }

          return (
            <ReadingReviewEvidenceSegment
              key={`reading-review-evidence-${evidenceRef.questionId}-${displayEvidenceKey}`}
              questionId={evidenceRef.questionId}
              evidenceKey={displayEvidenceKey}
              startsEvidence={startsEvidence}
              text={segment.text}
            />
          );
        })}
      </Component>
    </Wrapper>
  );
}
