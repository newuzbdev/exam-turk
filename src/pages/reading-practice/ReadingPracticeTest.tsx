import { readAccessOwner } from '@/hooks/use-access-link';
import { readOwnedAccess } from '@/utils/access-link-context';
import PresentationImage from "@/components/practice/PresentationImage";
import {
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cloneElement, isValidElement } from "react";
import type { CSSProperties } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock3,
  Eraser,
  Highlighter,
  KeyRound,
  Maximize2,
  Minimize2,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { countOptionSelections } from "@/utils/selection-count";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ReadingQuestionNumber from "@/components/reading-test/ui/ReadingQuestionNumber";
import ReadingSplitHandle from "@/components/reading-test/ui/ReadingSplitHandle";
import NotesPanel from "@/components/reading-test/NotesPanel";
import ReadingPracticeBlankSelect from "./ReadingPracticeBlankSelect";
import {
  splitPracticeHighlights,
  type PracticeHighlight,
  restorePracticeHighlights,
} from "./reading-practice-highlights";
import {
  ReadingNotesProvider,
  useReadingNotes,
  useAnnotationState,
  textAnnotationScope,
} from "@/contexts/ReadingNotesContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  readingPracticeService,
  type ReadingPracticeAttemptResult,
  type ReadingPracticeGlossaryEntry,
  type ReadingPracticeLearningCheckResult,
  type ReadingPracticeLearningQuestionCheck,
  type ReadingPracticePassage,
  type ReadingPracticeQuestion,
} from "@/services/readingPractice.service";
import {
  PRACTICE_NAVIGATION_REQUEST_EVENT,
  setPracticePresentation,
} from "./practice-presentation";
import {
  buildStableDisplayOptions,
  displayLetterForValue,
  stableShuffle,
  type DisplayReadingPracticeOption,
} from "./reading-practice-option-order";
import {
  normalizeWordKey,
  splitDictionaryText,
  wordOccurrenceAt,
} from "./reading-practice-dictionary";
import {
  getReadingNoteEditorPosition,
  getReadingSelectionEndRect,
  getReadingSelectionToolbarPosition,
} from "@/lib/reading-selection-toolbar-position";

type AnswerValue = string;
type DragItem =
  | { type: "heading"; questionId: string }
  | { type: "word"; scope: string; value: string };
type DictionaryCard = {
  term: string;
  baseForm?: string;
  baseMeaning?: string;
};

function dictionaryParts(entry: ReadingPracticeGlossaryEntry) {
  let baseForm = entry.baseForm?.trim() || "";
  let baseMeaning = entry.baseMeaning?.trim() || "";
  const legacyText = entry.simpleDefinition?.trim() || "";

  if ((!baseForm || !baseMeaning) && legacyText) {
    const marker = " Metindeki kullanımı:";
    const markerIndex = legacyText.indexOf(marker);
    const leadingText =
      markerIndex >= 0 ? legacyText.slice(0, markerIndex).trim() : legacyText;
    const baseMatch = leadingText.match(/^Temel biçim [“"](.+?)[”"]:\s*(.+)$/u);

    if (baseMatch) {
      if (!baseForm) baseForm = baseMatch[1].trim();
      if (!baseMeaning) baseMeaning = baseMatch[2].trim();
    } else if (!baseMeaning) {
      baseMeaning = leadingText;
    }
  }

  if (!baseMeaning) baseMeaning = entry.definition?.trim() || "";
  return { baseForm, baseMeaning };
}
type SavedPracticeProgress = {
  ownerId?: string;
  accessContextId?: string;
  passageId: string;
  attemptId?: string;
  answers: Record<string, string>;
  answeredCount: number;
  timerEnabled: boolean;
  timerMinutes: number;
  timeLeft: number;
  learningCheck?: ReadingPracticeLearningCheckResult | null;
  revealedPlacedAnswers?: Record<string, string>;
  updatedAt: number;
};
type QuestionMeta = {
  altBolum?: string;
  altBaslik?: string;
  inlineTarget?: string;
  inlineTargets?: string[];
  inlineTargetStart?: number;
  blankNumber?: number;
  guideSnippet?: string;
  hint?: string;
  keywords?: string[];
  sectionParagraphLabel?: string;
};

const parseOptions = (options: unknown) => {
  if (!Array.isArray(options)) return [] as { label: string; value: string }[];
  return options.map((option, index) => {
    if (typeof option === "string") return { label: option, value: option };
    if (option && typeof option === "object") {
      const item = option as Record<string, unknown>;
      const value = String(
        item.value ?? item.id ?? item.key ?? item.label ?? index + 1,
      );
      const label = String(item.label ?? item.title ?? item.text ?? value);
      return { label, value };
    }
    return { label: String(option), value: String(option) };
  });
};

const parseLetteredChoiceOptions = (options: unknown) => {
  const parsed = parseOptions(options);
  if (!Array.isArray(options)) return parsed;

  return parsed.map((option, index) => ({
    ...option,
    value:
      typeof options[index] === "string"
        ? String.fromCharCode(65 + index)
        : option.value,
  }));
};

function PracticeOptionLegendRow({
  letter,
  text,
  selectionCount,
  onTextSelection,
}: {
  letter: string;
  text: ReactNode;
  selectionCount: number;
  onTextSelection?: (selection: {
    x: number;
    y: number;
    top: number;
    boundaryLeft?: number;
    boundaryRight?: number;
    text: string;
  }) => void;
}) {
  const textRef = useRef<HTMLSpanElement>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !textRef.current) return;

    const range = selection.getRangeAt(0);
    if (
      !textRef.current.contains(range.startContainer) ||
      !textRef.current.contains(range.endContainer)
    ) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    const endRect = getReadingSelectionEndRect(range);
    const boundaryRect = textRef.current
      .closest(".reading-option-legend")
      ?.getBoundingClientRect();
    onTextSelection?.({
      x: endRect.right,
      y: endRect.bottom,
      top: endRect.top,
      boundaryLeft: boundaryRect?.left,
      boundaryRight: boundaryRect?.right,
      text: selectedText,
    });
  };

  return (
    <div
      className={`reading-option-legend grid min-h-10 grid-cols-[minmax(0,1fr)_18px] items-start gap-x-2 rounded-md px-2.5 py-2 ${
        selectionCount > 0 ? "bg-[#f1f1ef] text-[#8a8881]" : "text-[#37352f]"
      }`}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="reading-option-letter shrink-0 font-semibold tabular-nums">
          {letter}.
        </span>
        <span
          ref={textRef}
          className="reading-text reading-option-copy min-w-0 select-text font-normal"
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        >
          {text}
        </span>
      </span>
      {selectionCount > 1 ? (
        <span className="mt-0.5 text-center text-[#8a8881]" aria-label="Birden fazla soruda seçildi">?</span>
      ) : selectionCount === 1 ? (
        <Check className="mt-1 h-4 w-4 shrink-0 text-[#8a8881]" aria-label="Bir soruda seçildi" />
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}

export default function ReadingPracticeTest() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const attemptId = params.get("attemptId");
  return (
    <ReadingNotesProvider key={`${id}:${attemptId}`} scopeKey={textAnnotationScope("reading-practice", id, attemptId)}>
      <ReadingPracticeTestContent />
    </ReadingNotesProvider>
  );
}

const glossaryOptionParagraphLabel = (
  groupType: string,
  groupOrder: number,
  questionOrder: number,
  optionValue: string,
) =>
  groupType === "MATCHING_HEADINGS"
    ? `__option__:${groupOrder}:${optionValue}`
    : `__option__:${groupOrder}:${questionOrder}:${optionValue}`;

const glossaryQuestionPromptLabel = (
  groupOrder: number,
  questionOrder: number,
) => `__question__:${groupOrder}:${questionOrder}`;

function PracticeChoiceOption({
  letter,
  text,
  accessibleText,
  selected,
  reviewState,
  disabled,
  onSelect,
  onTextSelection,
}: {
  letter: string;
  text: ReactNode;
  accessibleText: string;
  selected: boolean;
  reviewState: "neutral" | "correct" | "incorrect";
  disabled?: boolean;
  onSelect: () => void;
  onTextSelection?: (selection: {
    x: number;
    y: number;
    top: number;
    boundaryLeft?: number;
    boundaryRight?: number;
    text: string;
  }) => void;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const answerGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragged: boolean;
  } | null>(null);
  const suppressNextPlainClickRef = useRef(false);

  const emitNativeSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !textRef.current) {
      return false;
    }
    const range = selection.getRangeAt(0);
    if (
      !textRef.current.contains(range.startContainer) ||
      !textRef.current.contains(range.endContainer)
    ) {
      return false;
    }
    const selectedText = selection.toString().trim();
    if (!selectedText) return false;

    const endRect = getReadingSelectionEndRect(range);
    const selectionBoundary =
      textRef.current.closest(".reading-option-row") || textRef.current;
    const boundaryRect = selectionBoundary.getBoundingClientRect();
    suppressNextPlainClickRef.current = true;
    onTextSelection?.({
      x: endRect.right,
      y: endRect.bottom,
      top: endRect.top,
      boundaryLeft: boundaryRect.left,
      boundaryRight: boundaryRect.right,
      text: selectedText,
    });
    return true;
  };

  const handleTextPointerDown = (
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => {
    if (
      event.pointerType === "touch" ||
      event.button !== 0 ||
      (event.target as Element).closest(
        'button,mark,[data-exam-selection-ignore="true"]',
      )
    ) {
      return;
    }
    answerGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragged: false,
    };
  };

  const handleTextPointerMove = (
    event: ReactPointerEvent<HTMLSpanElement>,
  ) => {
    const gesture = answerGestureRef.current;
    if (
      gesture &&
      gesture.pointerId === event.pointerId &&
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >=
        6
    ) {
      gesture.dragged = true;
    }
  };

  const handleTextPointerUp = () => {
    if (answerGestureRef.current?.dragged) emitNativeSelection();
  };

  const handleTextTouchEnd = (_event: ReactTouchEvent<HTMLSpanElement>) => {
    emitNativeSelection();
  };

  const handleTextClick = (event: ReactMouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    const gesture = answerGestureRef.current;
    answerGestureRef.current = null;

    if (suppressNextPlainClickRef.current) {
      suppressNextPlainClickRef.current = false;
      return;
    }
    if (
      disabled ||
      gesture?.dragged ||
      (event.target as Element).closest(
        'button,mark,[data-exam-selection-ignore="true"]',
      ) ||
      emitNativeSelection()
    ) {
      return;
    }
    onSelect();
  };

  const rowTone =
    reviewState === "correct"
      ? "text-[#2f6f3d]"
      : reviewState === "incorrect"
        ? "text-[#a33737]"
        : selected
          ? "bg-[#f7f7f5] text-[#37352f]"
          : "text-[#37352f]";
  const ringTone = selected
    ? reviewState === "correct"
      ? "border-[#438553]"
      : "border-[#5f5e5a]"
    : "border-[#a9a7a1]";
  const dotTone = selected
    ? reviewState === "correct"
      ? "bg-[#438553]"
      : "bg-[#5f5e5a]"
    : "bg-transparent";

  return (
    <div
      className={`reading-option-row grid min-h-10 w-full items-start gap-x-2 rounded-md px-2.5 py-2 text-left transition-colors ${rowTone}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`${letter}. ${accessibleText}`}
        disabled={disabled}
        onClick={onSelect}
        className="reading-option-radio-slot rounded transition-colors hover:bg-[#eeeeeb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1 disabled:cursor-default"
      >
        <span
          aria-hidden="true"
          className={`reading-option-radio-ring rounded-full border-[1.5px] ${ringTone}`}
        >
          <span
            className={`reading-option-radio-dot rounded-full ${dotTone}`}
          />
        </span>
      </button>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="reading-option-letter shrink-0 font-semibold">
          {letter}.
        </span>
        <span
          ref={textRef}
          className={`reading-text reading-option-copy min-w-0 select-text font-normal ${disabled ? "cursor-default" : "cursor-pointer"}`}
          onClick={handleTextClick}
          onPointerDown={handleTextPointerDown}
          onPointerMove={handleTextPointerMove}
          onPointerUp={handleTextPointerUp}
          onTouchEnd={handleTextTouchEnd}
        >
          {text}
        </span>
      </span>
    </div>
  );
}

const metaOf = (question: ReadingPracticeQuestion): QuestionMeta =>
  question.meta && typeof question.meta === "object"
    ? (question.meta as QuestionMeta)
    : {};

const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const progressStorageKey = (id: string) => `reading-practice-progress:${id}`;
const PRACTICE_HOME_PATH = "/app/pratik";
type LearningFeedbackLanguage = "tr" | "uz";
type SectionMatchingPanelView = "options" | "methods";
const LEARNING_FEEDBACK_LANGUAGE_KEY = "reading-practice-feedback-language";
const LEARNING_FEEDBACK_COPY = {
  tr: {
    retry: "Tekrar dene",
    correct: "Doğru",
    incorrect: "Yanlış",
    unanswered: "Boş",
    pending: "Kontrol bekliyor",
    shown: "Gösterildi",
    method: "Yöntem",
    yourChoice: "Seçimin",
    whyCorrect: "Neden doğru",
    placeAnswer: "Boşluğa koy",
    placedAnswer: "Boşluğa koyuldu · Gösterildi",
    answerShown: "Cevap gösterildi",
    showAnswer: "Cevabı göster",
    completeQuestion: "Bu soruyu tamamla",
    leftBlank: "Boş bırakıldı",
    correctAnswers: "Doğru cevaplar",
    allMethods: "Tüm yöntemler",
    choices: "Seçenekler",
    questions: "Sorular",
    methods: "Yöntemler",
  },
  uz: {
    retry: "Yana urinib ko‘ring",
    correct: "To‘g‘ri",
    incorrect: "Noto‘g‘ri",
    unanswered: "Bo‘sh",
    pending: "Tekshiruv kutilmoqda",
    shown: "Ko‘rsatildi",
    method: "Ko‘rsatma",
    yourChoice: "Siz tanlagan",
    whyCorrect: "Nega to‘g‘ri",
    placeAnswer: "Bo‘sh joyga qo‘y",
    placedAnswer: "Bo‘sh joyga qo‘yildi · Ko‘rsatildi",
    answerShown: "Javob ko‘rsatildi",
    showAnswer: "Javobni ko‘rsat",
    completeQuestion: "Bu savolni to‘ldiring",
    leftBlank: "Bo‘sh qoldirildi",
    correctAnswers: "To‘g‘ri javoblar",
    allMethods: "Barcha ko‘rsatmalar",
    choices: "Variantlar",
    questions: "Savollar",
    methods: "Ko‘rsatmalar",
  },
} as const;

const readLearningFeedbackLanguage = (): LearningFeedbackLanguage => {
  if (typeof window === "undefined") return "tr";
  try {
    return window.localStorage.getItem(LEARNING_FEEDBACK_LANGUAGE_KEY) === "uz"
      ? "uz"
      : "tr";
  } catch {
    return "tr";
  }
};

const learningMethodText = (
  question: ReadingPracticeLearningQuestionCheck,
  language: LearningFeedbackLanguage,
) =>
  language === "uz"
    ? question.methodUz ||
      question.transferTipUz ||
      question.strategyUz ||
      question.method ||
      question.transferTip ||
      question.strategy ||
      question.hint
    : question.method ||
      question.transferTip ||
      question.strategy ||
      question.hint;

const learningExplanationText = (
  question: ReadingPracticeLearningQuestionCheck,
  language: LearningFeedbackLanguage,
) =>
  language === "uz"
    ? question.explanationUz || question.explanation
    : question.explanation;

const learningDistractorText = (
  question: ReadingPracticeLearningQuestionCheck,
  language: LearningFeedbackLanguage,
) =>
  language === "uz"
    ? question.distractorExplanationUz || question.distractorExplanation
    : question.distractorExplanation;

function stripTurkishSuffixes(value: string) {
  const forms = new Set([value]);
  const suffixes = [
    "lerine",
    "larına",
    "lığine",
    "liğine",
    "lüğüne",
    "luğuna",
    "nın",
    "nin",
    "nun",
    "nün",
    "na",
    "ne",
    "ya",
    "ye",
    "a",
    "e",
    "ı",
    "i",
    "u",
    "ü",
  ];
  let current = value;
  for (const suffix of suffixes) {
    if (
      current.length > suffix.length + 2 &&
      current.toLocaleLowerCase("tr").endsWith(suffix)
    ) {
      current = current.slice(0, -suffix.length);
      forms.add(current);
    }
  }
  return Array.from(forms);
}

function inlineTargets(question: ReadingPracticeQuestion) {
  const meta = metaOf(question);
  const candidates: string[] = [];
  if (typeof meta.inlineTarget === "string") candidates.push(meta.inlineTarget);
  if (Array.isArray(meta.inlineTargets)) {
    candidates.push(
      ...meta.inlineTargets.filter(
        (item): item is string => typeof item === "string",
      ),
    );
  }
  return Array.from(
    new Set(candidates.flatMap((item) => stripTurkishSuffixes(item.trim()))),
  ).filter(Boolean);
}

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function singleAnswer(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : "";
  return typeof value === "string" ? value : "";
}

function userAnswerOf(
  result: ReadingPracticeAttemptResult | null,
  questionId: string,
) {
  return singleAnswer(
    result?.questionResults.find((item) => item.questionId === questionId)
      ?.userAnswer,
  );
}

function passageFromAttemptResult(
  result: ReadingPracticeAttemptResult,
): ReadingPracticePassage {
  return {
    id: result.passage.id,
    title: result.passage.title,
    passageTitle: result.passage.passageTitle,
    description: result.passage.description,
    topic: result.passage.topic,
    level: result.passage.level,
    coinCost: result.passage.coinCost,
    estimatedMinutes: result.passage.estimatedMinutes,
    isPublished: true,
    paragraphs: result.passage.paragraphs || [],
    glossaryEntries: result.glossaryEntries || [],
    questionGroups: (result.groups || [])
      .map((group) => ({
        id: group.id,
        order: group.order,
        title: group.title,
        type: group.type,
        instructions: group.instructions,
        questions: result.questionResults
          .filter((question) => question.groupId === group.id)
          .map((question) => ({
            id: question.questionId,
            order: question.order,
            prompt: question.prompt,
            options: question.options,
            meta: question.meta,
            explanation: question.explanation,
            evidenceParagraphs: question.evidenceParagraphs,
          })),
      }))
      .sort((left, right) => left.order - right.order),
  };
}

function reviewAnswerNote(
  userValue: string,
  correctValue: string,
  emptyLabel = "Boş bıraktın",
) {
  const cleanUser = String(userValue || "").trim();
  const cleanCorrect = String(correctValue || "").trim();
  if (!cleanUser) return emptyLabel;
  if (cleanUser === cleanCorrect) return "";
  return cleanUser;
}

function bestSentenceForPrompt(text: string, prompt: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const promptWords = prompt
    .toLocaleLowerCase("tr")
    .split(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]+/g)
    .filter((word) => word.length > 3);

  if (!sentences.length) return text;
  if (!promptWords.length) return sentences[0];

  const scored = sentences.map((sentence) => {
    const lowered = sentence.toLocaleLowerCase("tr");
    const score = promptWords.reduce(
      (total, word) => total + (lowered.includes(word) ? 1 : 0),
      0,
    );
    return { sentence, score };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.score ? scored[0].sentence : sentences[0];
}

function hintTextForQuestion(
  question: ReadingPracticeQuestion,
  groupType: string,
) {
  const meta = metaOf(question);
  if (typeof meta.hint === "string" && meta.hint.trim())
    return meta.hint.trim();

  if (groupType === "MATCHING_HEADINGS") {
    if ((meta.keywords || []).length) {
      return `Anahtar kelimeler: ${(meta.keywords || []).join(", ")}`;
    }
    return "Paragrafın ana fikrini ve tekrar eden kavramları bul.";
  }

  if (groupType === "FILL_BLANK") {
    return `Boşluğun geçtiği cümlede anlam akışına bak. İlgili paragraf: ${question.evidenceParagraphs?.join(", ") || "-"}.`;
  }

  if (groupType === "TRUE_FALSE_NOT_GIVEN") {
    return `İfadeyi metinle birebir karşılaştır. İlgili bilgi şu paragraflarda aranmalı: ${question.evidenceParagraphs?.join(", ") || "-"}.`;
  }

  if (groupType === "PARAGRAPH_REFERENCE") {
    return `Anahtar düşünceyi ve tekrar eden kavramı bul. En güçlü eşleşen paragrafı seç.`;
  }

  return "";
}

function BlankSlot({
  number,
  value,
  onDrop,
  onClear,
  onActivate,
  readOnly = false,
  locked = false,
  selected = false,
  highlighted = false,
  feedback,
  questionId,
}: {
  number: number;
  value: string;
  onDrop: (event: DragEvent<HTMLSpanElement>) => void;
  onClear?: () => void;
  onActivate?: () => void;
  readOnly?: boolean;
  locked?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  feedback?: "correct" | "incorrect" | "revealed";
  questionId?: string;
}) {
  const emphasized = selected || highlighted;

  return (
    <span
      id={questionId ? `reading-question-${questionId}` : undefined}
      role={!value && onActivate && !readOnly && !locked ? "button" : undefined}
      tabIndex={!value && onActivate && !readOnly && !locked ? 0 : undefined}
      aria-label={
        !value && onActivate && !readOnly && !locked
          ? selected
            ? `${number}. seçili boşluk`
            : highlighted
              ? `${number}. boşluğa seçili kelimeyi yerleştir`
              : `${number}. boşluk`
          : undefined
      }
      className={`mx-1 inline-flex items-center justify-center align-baseline font-medium transition-colors ${
        feedback === "correct"
          ? "border border-transparent bg-transparent text-[#35784a]"
          : feedback === "incorrect"
            ? "border border-transparent bg-transparent text-[#b24a43]"
            : feedback === "revealed"
              ? "border border-transparent bg-transparent text-[#4f4e49]"
              : emphasized
                ? "rounded-[4px] border border-dashed border-[#686762] bg-white text-[#37352f] leading-none"
                : value
                  ? "rounded-[4px] border border-[#b4bdc3] bg-white text-[#37352f] leading-none"
                  : "rounded-[4px] border border-dashed border-[#aeb7bd] bg-white text-[#6f777d] leading-none"
      } ${!value && onActivate && !readOnly && !locked ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b8b86]" : ""}`}
      style={{
        minWidth: feedback ? "fit-content" : value ? "fit-content" : "6.6em",
        height: feedback ? "auto" : "1.6em",
        paddingInline: feedback ? "0.1em" : value ? "0.65em" : "0.75em",
        fontSize: "1em",
        lineHeight: feedback ? "inherit" : undefined,
      }}
      onClick={
        !value && onActivate && !readOnly && !locked ? onActivate : undefined
      }
      onKeyDown={
        !value && onActivate && !readOnly && !locked
          ? (event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onActivate();
            }
          : undefined
      }
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      {value ? (
        <span
          className={`relative inline-flex items-center gap-2 truncate whitespace-nowrap ${
            feedback === "incorrect" ? "pl-[1.8em]" : ""
          }`}
        >
          {feedback === "incorrect" ? (
            <span
              className="absolute left-0 top-1/2 inline-flex h-[1.45em] w-[1.45em] -translate-y-1/2 items-center justify-center rounded-full bg-[#f1f1ef] text-[0.72em] font-bold leading-none text-[#2f2e2a]"
              aria-label={`${number}. soru`}
            >
              {number}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onActivate}
            disabled={!onActivate}
            aria-label={`${value} cevabı${locked ? "; kilitli" : ""}`}
            aria-disabled={locked && !onActivate}
            className={`truncate whitespace-nowrap ${feedback ? "leading-[inherit]" : "leading-none"} ${
              feedback === "incorrect"
                ? "line-through decoration-[#b24a43] decoration-1"
                : ""
            } ${onActivate ? "cursor-pointer" : "cursor-default"}`}
          >
            {value}
          </button>
          {!readOnly && !locked && onClear ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              className="inline-flex h-[1.45em] w-[1.45em] shrink-0 self-center items-center justify-center rounded-full leading-none text-[#5f5d58] transition-colors hover:bg-[#e5e5e1] hover:text-[#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b8b86]"
              title="Cevabı kaldır"
              aria-label={`${value} cevabını kaldır`}
            >
              <X className="h-[0.92em] w-[0.92em]" />
            </button>
          ) : null}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`text-[0.95em] text-[#2f2e2a] ${onActivate && !readOnly && !locked ? "cursor-pointer" : "cursor-default"}`}
        >
          {number}
        </span>
      )}
    </span>
  );
}

function ToolbarIconButton({
  label,
  active = false,
  onClick,
  children,
  className = "",
  ariaLabel,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || label}
      className={`group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-[background-color,color,box-shadow] [&>svg]:h-4 [&>svg]:w-4 ${
        active
          ? "bg-white text-[#242424] shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
          : "bg-transparent text-[#64645f] hover:bg-white hover:text-[#242424] hover:shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
      } ${className}`}
    >
      {children}
      <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-[#111827] px-2.5 py-1 text-[12px] font-medium text-white shadow-sm group-hover:block">
        {label}
      </span>
    </button>
  );
}

function ReadingPracticeTestContent() {
  const { notes, addNote, updateNote, deleteNote } = useReadingNotes();
  const activeNoteIds = new Set(notes.map((note) => note.id));
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locationState = location.state as {
    result?: ReadingPracticeAttemptResult;
  } | null;
  const startedAtRef = useRef(Date.now());
  const progressReadyRef = useRef(false);
  const skipPracticeTimerResetRef = useRef(false);
  const popHandlerRef = useRef<((event: PopStateEvent) => void) | null>(null);
  const beforeUnloadRef = useRef<((event: BeforeUnloadEvent) => void) | null>(
    null,
  );
  const pendingExitActionRef = useRef<(() => void) | null>(null);
  const allowHistoryBackRef = useRef(false);
  const rightPanelScrollRef = useRef<HTMLDivElement | null>(null);
  const [passage, setPassage] = useState<ReadingPracticePassage | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerMinutes, setTimerMinutes] = useState(20);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [selectedBlankWord, setSelectedBlankWord] = useState<string | null>(
    null,
  );
  const [selectedBlankQuestionId, setSelectedBlankQuestionId] = useState<
    string | null
  >(null);
  const [revealedPlacedAnswers, setRevealedPlacedAnswers] = useState<
    Record<string, string>
  >({});
  const [dictionaryMode, setDictionaryMode] = useState(false);
  const [guideMode, setGuideMode] = useState(false);
  const [selectedDictionary, setSelectedDictionary] =
    useState<DictionaryCard | null>(null);
  const [dictionaryPanelVisible, setDictionaryPanelVisible] = useState(false);
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const [customTimerMinutes, setCustomTimerMinutes] = useState("20");
  const [timeExpiredWarningShown, setTimeExpiredWarningShown] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [openHintId, setOpenHintId] = useState<string | null>(null);
  const [activeGuideQuestionIds, setActiveGuideQuestionIds] = useState<
    string[]
  >([]);
  const [reviewResult, setReviewResult] =
    useState<ReadingPracticeAttemptResult | null>(null);
  const [learningCheck, setLearningCheck] =
    useState<ReadingPracticeLearningCheckResult | null>(null);
  const [learningFeedbackLanguage, setLearningFeedbackLanguage] =
    useState<LearningFeedbackLanguage>(readLearningFeedbackLanguage);
  const [sectionMatchingPanelView, setSectionMatchingPanelView] =
    useState<SectionMatchingPanelView>("options");
  const [selectionMenu, setSelectionMenu] = useState<{
    x: number;
    y: number;
    top: number;
    boundaryLeft?: number;
    boundaryRight?: number;
    text: string;
    paragraphLabel: string;
  } | null>(null);
  const [selectionNoteEditor, setSelectionNoteEditor] = useState<{
    x: number;
    y: number;
    top: number;
    boundaryLeft?: number;
    boundaryRight?: number;
    text: string;
    paragraphLabel: string;
    note: string;
    noteId?: string;
  } | null>(null);
  const noteEditorRef = useRef<HTMLDivElement>(null);
  const [noteEditorPosition, setNoteEditorPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [manualHighlights, setManualHighlights] = useAnnotationState<Record<string, PracticeHighlight[]>>(
    "practice-highlights", {}, restorePracticeHighlights,
  );
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [focusedPresentation, setFocusedPresentation] = useState(true);
  const [showSectionDescription, setShowSectionDescription] = useState(() =>
    typeof window === "undefined" || !window.matchMedia("(max-width: 767px)").matches,
  );
  const [mobileScreen, setMobileScreen] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobileScreen(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const mode = searchParams.get("mod") === "sinav" ? "sinav" : "calisma";
  const reviewAttemptId = searchParams.get("attemptId");
  const reviewRequested = searchParams.get("incele") === "1";
  const accessOwnerId = readAccessOwner();
  const activeAttemptId = !reviewRequested
    ? searchParams.get("attemptId") || ""
    : "";
  const practiceToolsEnabled = mode === "calisma";
  const presentationFontScale = mobileScreen ? 1 : fontScale;
  const bodyFontSize = `${17 * presentationFontScale}px`;
  const headingFontSize = `${17 * presentationFontScale}px`;
  const reviewMode = Boolean(reviewResult);
  const selectionMenuStyle =
    selectionMenu && typeof window !== "undefined"
      ? getReadingSelectionToolbarPosition({
          anchorX: selectionMenu.x,
          selectionTop: selectionMenu.top,
          selectionBottom: selectionMenu.y,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          boundaryLeft: selectionMenu.boundaryLeft,
          boundaryRight: selectionMenu.boundaryRight,
        })
      : undefined;
  useLayoutEffect(() => {
    if (!selectionNoteEditor) {
      setNoteEditorPosition(null);
      return;
    }
    const editor = noteEditorRef.current;
    if (!editor) return;
    const paragraph = Array.from(
      document.querySelectorAll<HTMLElement>("[data-paragraph-label]"),
    ).find(
      (element) =>
        element.dataset.paragraphLabel === selectionNoteEditor.paragraphLabel,
    );
    const positionEditor = () => {
      const editorRect = editor.getBoundingClientRect();
      const boundaryRect = paragraph?.getBoundingClientRect();
      const position = getReadingNoteEditorPosition({
        anchorX: selectionNoteEditor.x,
        selectionTop: selectionNoteEditor.top,
        selectionBottom: selectionNoteEditor.y,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        editorWidth: editorRect.width,
        editorHeight: editorRect.height,
        boundaryLeft: boundaryRect?.left ?? selectionNoteEditor.boundaryLeft,
        boundaryRight: boundaryRect?.right ?? selectionNoteEditor.boundaryRight,
      });
      setNoteEditorPosition((current) =>
        current?.left === position.left && current?.top === position.top
          ? current
          : position,
      );
    };
    positionEditor();
    window.addEventListener("resize", positionEditor);
    const observer = new ResizeObserver(positionEditor);
    observer.observe(editor);
    if (paragraph) observer.observe(paragraph);
    return () => {
      window.removeEventListener("resize", positionEditor);
      observer.disconnect();
    };
  }, [selectionNoteEditor]);
  const isSectionPractice =
    passage?.practiceType === "SECTION" && Boolean(passage.sectionNumber);
  const sectionNumber = isSectionPractice
    ? Number(passage?.sectionNumber || 0)
    : 0;
  const practiceShuffleSeed =
    reviewAttemptId ||
    activeAttemptId ||
    passage?.id ||
    id ||
    "reading-practice";
  const shouldShufflePracticeOptions = mode === "calisma" && isSectionPractice;
  const sectionLearningMode =
    mode === "calisma" && isSectionPractice && !reviewMode;
  const sectionMatchingMode =
    isSectionPractice && (sectionNumber === 2 || sectionNumber === 3);
  const mobileSplit = mobileScreen && isSectionPractice && (sectionNumber === 4 || sectionNumber === 5);
  const leftPanelDefaultSize =
    sectionNumber === 1 || sectionNumber === 2
      ? 65
      : sectionNumber === 3
        ? 50
        : 60;
  const rightPanelDefaultSize = 100 - leftPanelDefaultSize;
  const practiceGridHeight = isSectionPractice
    ? focusedPresentation
      ? "min-h-[calc(100dvh-140px)] lg:min-h-0 lg:h-auto lg:flex-1"
      : "min-h-[calc(100dvh-196px)] lg:min-h-0 lg:h-auto lg:flex-1"
    : focusedPresentation
      ? "min-h-[calc(100dvh-60px)] lg:min-h-0 lg:h-auto lg:flex-1"
      : "min-h-[calc(100dvh-116px)] lg:min-h-0 lg:h-auto lg:flex-1";
  const answeredCount = useMemo(
    () =>
      Object.values(answers).filter(
        (value) => String(value || "").trim().length > 0,
      ).length,
    [answers],
  );
  const hasUnsavedProgress =
    mode === "calisma" && !reviewMode && answeredCount > 0;
  const shouldWarnOnExit = mode === "calisma" && !reviewMode;

  useEffect(() => {
    setPracticePresentation(true);
    return () => setPracticePresentation(false);
  }, []);

  const toggleFocusedPresentation = () => {
    setFocusedPresentation((current) => {
      const next = !current;
      setPracticePresentation(next);
      return next;
    });
  };

  useEffect(() => {
    const body = document.body;
    body.classList.add("exam-mode");
    return () => {
      body.classList.remove("exam-mode");
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) return;
      if (reviewRequested) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setPassage(null);
      progressReadyRef.current = false;
      if (!activeAttemptId) {
        toast.error(
          "Bu çalışma oturumu başlatılmadı. Lütfen pratiği yeniden başlat.",
        );
        setLoading(false);
        navigate(PRACTICE_HOME_PATH);
        return;
      }
      const data = await readingPracticeService.getSolveDetail(
        id,
        activeAttemptId,
      );
      if (!mounted) return;
      if (!data) {
        setLoading(false);
        return;
      }
      const requestedMinutes = Number(searchParams.get("sure") || 0);
      const normalizedMinutes = Number.isFinite(requestedMinutes)
        ? Math.min(180, Math.max(1, Math.round(requestedMinutes)))
        : 20;
      const shouldUseTimer =
        mode === "sinav" ? true : searchParams.get("sayac") === "1";
      setPassage(data);
      setTimerMinutes(mode === "sinav" ? 60 : normalizedMinutes);
      setTimerEnabled(reviewRequested ? false : shouldUseTimer);
      setTimeLeft(
        reviewRequested
          ? 0
          : (mode === "sinav" ? 60 : shouldUseTimer ? normalizedMinutes : 0) *
              60,
      );
      if (
        mode === "calisma" &&
        !reviewRequested &&
        typeof window !== "undefined"
      ) {
        try {
          const raw = window.localStorage.getItem(progressStorageKey(id));
          if (raw) {
            const saved = JSON.parse(raw) as SavedPracticeProgress;
            if (
              saved &&
              typeof saved === "object" &&
              saved.answers &&
              saved.attemptId === activeAttemptId
            ) {
              skipPracticeTimerResetRef.current = true;
              setAnswers(saved.answers || {});
              setLearningCheck(saved.learningCheck || null);
              setRevealedPlacedAnswers(saved.revealedPlacedAnswers || {});
              setTimerEnabled(Boolean(saved.timerEnabled));
              setTimerMinutes(
                Math.max(
                  1,
                  Math.min(
                    180,
                    Number(saved.timerMinutes || normalizedMinutes),
                  ),
                ),
              );
              setTimeLeft(Math.max(0, Number(saved.timeLeft || 0)));
            }
          }
        } catch {
          // ignore broken local progress
        }
      }
      startedAtRef.current = Date.now();
      progressReadyRef.current = true;
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [activeAttemptId, id, mode, navigate, reviewRequested, searchParams]);

  useEffect(() => {
    if (
      !id ||
      mode !== "calisma" ||
      reviewRequested ||
      reviewMode ||
      !progressReadyRef.current
    )
      return;
    if (typeof window === "undefined") return;

    const answeredCount = Object.values(answers).filter(
      (value) => String(value || "").trim().length > 0,
    ).length;
    if (!answeredCount) {
      window.localStorage.removeItem(progressStorageKey(id));
      return;
    }

    const payload: SavedPracticeProgress = {
      passageId: id,
      ownerId: accessOwnerId || undefined,
      accessContextId: accessOwnerId ? readOwnedAccess(accessOwnerId, { scope: 'PRACTICE_READING', targetId: `${id}:attempt:${activeAttemptId}` })?.contextId : undefined,
      attemptId: activeAttemptId || undefined,
      answers,
      answeredCount,
      timerEnabled,
      timerMinutes,
      timeLeft,
      learningCheck,
      revealedPlacedAnswers,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(
      progressStorageKey(id),
      JSON.stringify(payload),
    );
  }, [
    accessOwnerId,
    activeAttemptId,
    answers,
    id,
    learningCheck,
    mode,
    revealedPlacedAnswers,
    reviewMode,
    reviewRequested,
    timeLeft,
    timerEnabled,
    timerMinutes,
  ]);

  useEffect(() => {
    if (!reviewRequested) {
      setReviewResult(null);
      return;
    }

    if (locationState?.result) {
      setReviewResult(locationState.result);
      setPassage(passageFromAttemptResult(locationState.result));
      setGuideMode(false);
      setDictionaryMode(false);
      return;
    }

    if (!reviewAttemptId) return;
    let mounted = true;
    (async () => {
      const result = await readingPracticeService.getAttempt(reviewAttemptId);
      if (!mounted || !result) return;
      setReviewResult(result);
      setPassage(passageFromAttemptResult(result));
      setGuideMode(false);
      setDictionaryMode(false);
    })();

    return () => {
      mounted = false;
    };
  }, [locationState?.result, reviewAttemptId, reviewRequested]);

  useEffect(() => {
    if (!timerEnabled || timeLeft <= 0 || submitting) return;
    const interval = window.setInterval(
      () => setTimeLeft((current) => (current > 0 ? current - 1 : 0)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [timerEnabled, timeLeft, submitting]);

  useEffect(() => {
    if (mode !== "calisma") return;
    if (skipPracticeTimerResetRef.current) {
      skipPracticeTimerResetRef.current = false;
      return;
    }
    if (!timerEnabled) {
      setTimeLeft(0);
      return;
    }
    setTimeExpiredWarningShown(false);
    setTimeLeft(timerMinutes * 60);
  }, [mode, timerEnabled, timerMinutes]);

  useEffect(() => {
    const closeMenu = () => setSelectionMenu(null);
    window.addEventListener("mousedown", closeMenu);
    return () => window.removeEventListener("mousedown", closeMenu);
  }, []);

  useEffect(() => {
    if (!dictionaryMode && !guideMode) {
      setSelectedDictionary(null);
    }
  }, [dictionaryMode, guideMode]);

  useEffect(() => {
    if (!dictionaryMode) {
      setDictionaryPanelVisible(false);
      return;
    }
    setSelectedBlankWord(null);
    setSelectedBlankQuestionId(null);
  }, [dictionaryMode]);

  useEffect(() => {
    setSelectedBlankWord(null);
    setSelectedBlankQuestionId(null);
    setRevealedPlacedAnswers({});
    setLearningCheck(null);
  }, [activeAttemptId, id]);

  useEffect(() => {
    if (!guideMode) {
      setOpenHintId(null);
      setActiveGuideQuestionIds([]);
    }
  }, [guideMode]);

  useEffect(() => {
    if (practiceToolsEnabled) return;
    setDictionaryMode(false);
    setGuideMode(false);
    setSelectedDictionary(null);
    setOpenHintId(null);
    setActiveGuideQuestionIds([]);
    setTimerMenuOpen(false);
  }, [practiceToolsEnabled]);

  useEffect(() => {
    if (mode !== "sinav") return;
    setDictionaryMode(false);
    setGuideMode(false);
    setSelectedDictionary(null);
    setOpenHintId(null);
    setActiveGuideQuestionIds([]);
  }, [mode]);

  useEffect(() => {
    if (!hasUnsavedProgress) {
      if (popHandlerRef.current) {
        window.removeEventListener("popstate", popHandlerRef.current);
        popHandlerRef.current = null;
      }
      if (beforeUnloadRef.current) {
        window.removeEventListener("beforeunload", beforeUnloadRef.current);
        beforeUnloadRef.current = null;
      }
      return;
    }

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const popHandler = () => {
      if (allowHistoryBackRef.current) return;
      window.history.pushState(
        { readingPracticeGuard: true },
        "",
        window.location.href,
      );
      pendingExitActionRef.current = () => {
        allowHistoryBackRef.current = true;
        window.history.back();
      };
      setShowExitDialog(true);
    };

    window.history.pushState(
      { readingPracticeGuard: true },
      "",
      window.location.href,
    );
    beforeUnloadRef.current = beforeUnload;
    popHandlerRef.current = popHandler;
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("popstate", popHandler);

    return () => {
      if (popHandlerRef.current) {
        window.removeEventListener("popstate", popHandlerRef.current);
        popHandlerRef.current = null;
      }
      if (beforeUnloadRef.current) {
        window.removeEventListener("beforeunload", beforeUnloadRef.current);
        beforeUnloadRef.current = null;
      }
    };
  }, [hasUnsavedProgress]);

  const groups = passage?.questionGroups || [];
  const headingGroup =
    groups.find((group) => group.type === "MATCHING_HEADINGS") || null;
  const multipleChoiceGroup =
    groups.find((group) => group.type === "MULTIPLE_CHOICE") || null;
  const trueFalseGroup =
    groups.find((group) => group.type === "TRUE_FALSE_NOT_GIVEN") || null;
  const fillBlankGroup =
    groups.find((group) => group.type === "FILL_BLANK") || null;
  const paragraphReferenceGroup =
    groups.find((group) => group.type === "PARAGRAPH_REFERENCE") || null;
  const vocabularyGroup =
    groups.find((group) => group.type === "KELIME_CALISMASI") || null;
  const allQuestions = useMemo(
    () =>
      groups
        .flatMap((group) => group.questions)
        .sort((a, b) => a.order - b.order),
    [groups],
  );
  const headingOptions = useMemo(
    () =>
      headingGroup
        ? [...headingGroup.questions]
            .sort((left, right) => left.order - right.order)
            .map((question, index) => ({
              question,
              letter: String.fromCharCode(65 + index),
            }))
        : [],
    [headingGroup],
  );
  const sectionMatchingOptions = useMemo(() => {
    if (!sectionMatchingMode || !headingGroup)
      return [] as { label: string; value: string }[];
    for (const question of headingGroup.questions) {
      const options = parseOptions(question.options).filter(
        (option) => option.value.trim() && option.label.trim(),
      );
      if (options.length) return options;
    }
    return [];
  }, [headingGroup, sectionMatchingMode]);
  const sectionMatchingDisplayOptions = useMemo<
    DisplayReadingPracticeOption[]
  >(() => {
    if (!sectionMatchingOptions.length) return [];
    if (shouldShufflePracticeOptions) {
      return buildStableDisplayOptions(
        sectionMatchingOptions,
        practiceShuffleSeed,
        `section-matching:${headingGroup?.id || sectionNumber}`,
      );
    }
    return sectionMatchingOptions.map((option, index) => ({
      ...option,
      displayLetter: String.fromCharCode(65 + index),
    }));
  }, [
    headingGroup?.id,
    practiceShuffleSeed,
    sectionMatchingOptions,
    sectionNumber,
    shouldShufflePracticeOptions,
  ]);
  const multipleChoiceDisplayOptionsByQuestion = useMemo(() => {
    const result = new Map<string, DisplayReadingPracticeOption[]>();
    (multipleChoiceGroup?.questions || []).forEach((question) => {
      const options = parseLetteredChoiceOptions(question.options);
      result.set(
        question.id,
        shouldShufflePracticeOptions
          ? buildStableDisplayOptions(
              options,
              practiceShuffleSeed,
              `multiple-choice:${question.id}`,
            )
          : options.map((option, index) => ({
              ...option,
              displayLetter: String.fromCharCode(65 + index),
            })),
      );
    });
    return result;
  }, [multipleChoiceGroup, practiceShuffleSeed, shouldShufflePracticeOptions]);
  const sectionMatchingQuestionsByParagraph = useMemo(() => {
    const byParagraph = new Map<string, ReadingPracticeQuestion>();
    if (!sectionMatchingMode || !headingGroup) return byParagraph;
    headingGroup.questions.forEach((question, index) => {
      const configuredLabel =
        question.evidenceParagraphs?.[0] ||
        metaOf(question).sectionParagraphLabel ||
        passage?.paragraphs[index]?.label ||
        question.prompt;
      if (configuredLabel) byParagraph.set(String(configuredLabel), question);
    });
    return byParagraph;
  }, [headingGroup, passage?.paragraphs, sectionMatchingMode]);
  const reviewCorrectAnswers = useMemo(
    () =>
      reviewResult
        ? Object.fromEntries(
            reviewResult.questionResults.map((question) => [
              question.questionId,
              singleAnswer(question.correctAnswer),
            ]),
          )
        : {},
    [reviewResult],
  );
  const displayAnswers = reviewMode ? reviewCorrectAnswers : answers;
  const sectionMatchingQuestionIds = useMemo(
    () =>
      Array.from(sectionMatchingQuestionsByParagraph.values()).map(
        (question) => question.id,
      ),
    [sectionMatchingQuestionsByParagraph],
  );
  const headingAssignments = useMemo(() => {
    if (!headingGroup) return {} as Record<string, ReadingPracticeQuestion>;
    return headingGroup.questions.reduce(
      (acc, question) => {
        const value = displayAnswers[question.id];
        if (typeof value === "string") acc[value] = question;
        return acc;
      },
      {} as Record<string, ReadingPracticeQuestion>,
    );
  }, [displayAnswers, headingGroup]);

  const sectionInstruction = useMemo(() => {
    if (!isSectionPractice) return "";
    return (
      passage?.description?.trim() ||
      groups
        .find((group) => group.questions.length > 0)
        ?.instructions?.trim() ||
      "Metni okuyun ve soruları cevaplayın."
    );
  }, [groups, isSectionPractice, passage?.description]);

  const multipleChoiceInstruction =
    sectionNumber === 4
      ? "Sorular 21–24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz."
      : sectionNumber === 5
        ? "Sorular 30–32. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz."
        : "";
  const trueFalseInstruction =
    sectionNumber === 4
      ? "Sorular 25–29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz."
      : "";
  const paragraphReferenceInstruction =
    sectionNumber === 5
      ? "Sorular 33–35. Aşağıdaki cümleleri okuyunuz. Cümlelerin hangi paragraflara (A–E) ait olduğunu bulunuz. Seçilmemesi gereken iki paragraf bulunmaktadır."
      : "";

  const blankQuestionsByParagraph = useMemo(
    () =>
      (fillBlankGroup?.questions || []).reduce(
        (acc, question) => {
          const label = question.evidenceParagraphs?.[0];
          if (!label) return acc;
          if (!acc[label]) acc[label] = [];
          acc[label].push(question);
          acc[label].sort(
            (left, right) =>
              Number(metaOf(left).blankNumber || 0) -
              Number(metaOf(right).blankNumber || 0),
          );
          return acc;
        },
        {} as Record<string, ReadingPracticeQuestion[]>,
      ),
    [fillBlankGroup],
  );
  const glossaryByParagraph = useMemo(
    () =>
      (passage?.glossaryEntries || []).reduce(
        (acc, entry) => {
          const key = entry.paragraphLabel || "_genel";
          if (!acc[key]) acc[key] = [];
          acc[key].push(entry);
          return acc;
        },
        {} as Record<string, ReadingPracticeGlossaryEntry[]>,
      ),
    [passage],
  );

  const paragraphTextMap = useMemo(
    () =>
      new Map(
        (passage?.paragraphs || []).map((paragraph) => [
          paragraph.label,
          paragraph.text,
        ]),
      ),
    [passage],
  );
  const questionById = useMemo(
    () => new Map(allQuestions.map((question) => [question.id, question])),
    [allQuestions],
  );
  const questionTypeById = useMemo(
    () =>
      new Map(
        groups.flatMap((group) =>
          group.questions.map((question) => [question.id, group.type] as const),
        ),
      ),
    [groups],
  );
  const answerLabelForQuestion = (questionId: string, rawValue: unknown) => {
    const value = singleAnswer(rawValue);
    if (!value) return "";
    const question = questionById.get(questionId);
    if (!question) return value;
    const type = String(questionTypeById.get(questionId) || "").toUpperCase();
    const options =
      type === "MULTIPLE_CHOICE"
        ? multipleChoiceDisplayOptionsByQuestion.get(questionId) || []
        : type === "MATCHING_HEADINGS" && sectionMatchingMode
          ? sectionMatchingDisplayOptions
          : parseOptions(question.options);
    return options.find((option) => option.value === value)?.label || value;
  };
  const activeGuideHighlightsByParagraph = useMemo(() => {
    if (!guideMode || !activeGuideQuestionIds.length)
      return {} as Record<
        string,
        Array<{ order: number; snippet: string; showOrder: boolean }>
      >;
    return activeGuideQuestionIds.reduce(
      (acc, questionId) => {
        const question = questionById.get(questionId);
        if (!question) return acc;
        const label = question.evidenceParagraphs?.[0];
        if (!label) return acc;
        const paragraphText = String(paragraphTextMap.get(label) || "");
        const meta = metaOf(question);
        const snippet =
          String(meta.guideSnippet || "").trim() ||
          bestSentenceForPrompt(paragraphText, question.prompt);
        const showOrder = !(paragraphReferenceGroup?.questions || []).some(
          (item) => item.id === question.id,
        );
        if (!acc[label]) acc[label] = [];
        acc[label].push({ order: question.order, snippet, showOrder });
        return acc;
      },
      {} as Record<
        string,
        Array<{ order: number; snippet: string; showOrder: boolean }>
      >,
    );
  }, [
    activeGuideQuestionIds,
    guideMode,
    paragraphReferenceGroup,
    paragraphTextMap,
    questionById,
  ]);

  const groupedVocabularyQuestions = useMemo(
    () =>
      vocabularyGroup?.questions.reduce(
        (acc, question) => {
          const meta = metaOf(question);
          const key = String(meta.altBolum || "genel");
          const title = String(meta.altBaslik || "Kelime çalışması");
          if (!acc[key])
            acc[key] = { title, questions: [] as ReadingPracticeQuestion[] };
          acc[key].questions.push(question);
          return acc;
        },
        {} as Record<
          string,
          { title: string; questions: ReadingPracticeQuestion[] }
        >,
      ) || {},
    [vocabularyGroup],
  );

  const vocabularyPools = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(groupedVocabularyQuestions).map(([key, item]) => [
          key,
          stableShuffle(
            Array.from(
              new Set(
                item.questions.flatMap((question) =>
                  parseOptions(question.options).map((option) => option.value),
                ),
              ),
            ),
            `${practiceShuffleSeed}:vocabulary:${key}`,
          ),
        ]),
      ) as Record<string, string[]>,
    [groupedVocabularyQuestions, practiceShuffleSeed],
  );

  const blankPool = useMemo(() => {
    const list = (fillBlankGroup?.questions || []).flatMap((question) =>
      parseOptions(question.options).map((option) => option.value),
    );
    const pool = Array.from(new Set(list));
    return shouldShufflePracticeOptions
      ? stableShuffle(pool, `${practiceShuffleSeed}:fill-blank`)
      : pool;
  }, [fillBlankGroup, practiceShuffleSeed, shouldShufflePracticeOptions]);
  const setAnswer = (questionId: string, value: string | undefined) =>
    setAnswers((current) => {
      const next = { ...current };
      if (!value) delete next[questionId];
      else next[questionId] = value;
      return next;
    });

  const learningCheckByQuestion = useMemo(
    () =>
      new Map(
        (learningCheck?.questions || []).map((question) => [
          question.questionId,
          question,
        ]),
      ),
    [learningCheck],
  );

  const currentLearningCheck = (
    questionId: string,
    value: string,
  ): ReadingPracticeLearningQuestionCheck | undefined => {
    const result = learningCheckByQuestion.get(questionId);
    if (!result || String(result.userAnswer ?? "") !== String(value || ""))
      return undefined;
    return result;
  };

  const isRevealedPlaced = (questionId: string, value: string) => {
    return Boolean(value) && revealedPlacedAnswers[questionId] === value;
  };

  const isQuestionLocked = (questionId: string, value: string) =>
    Boolean(currentLearningCheck(questionId, value)?.isCorrect) ||
    isRevealedPlaced(questionId, value);

  const learningReviewState = (
    questionId: string,
    value: string,
  ): "neutral" | "correct" | "incorrect" => {
    if (!learningCheck || !value) return "neutral";
    if (isRevealedPlaced(questionId, value)) return "correct";
    const checked = currentLearningCheck(questionId, value);
    if (!checked) return "neutral";
    return checked.isCorrect ? "correct" : "incorrect";
  };

  const clearAnswer = (questionId: string) => {
    const value = String(answers[questionId] || "");
    if (isQuestionLocked(questionId, value)) return;
    setAnswer(questionId, undefined);
    if (selectedBlankWord === value) setSelectedBlankWord(null);
  };

  const openBlankWordMeaning = async (word: string) => {
    if (!dictionaryMode || !passage) return;
    const relatedQuestion = (fillBlankGroup?.questions || []).find((question) =>
      parseOptions(question.options).some((option) => option.value === word),
    );
    const paragraphLabel =
      relatedQuestion?.evidenceParagraphs?.[0] ||
      passage.paragraphs[0]?.label ||
      "";
    await openDictionaryEntry(
      word,
      [
        ...(glossaryByParagraph[paragraphLabel] || []),
        ...(glossaryByParagraph._genel || []),
      ],
      0,
    );
  };

  const selectHeadingForParagraph = (
    paragraphLabel: string,
    questionId?: string,
  ) => {
    if (!headingGroup) return;
    setAnswers((current) => {
      const next = { ...current };
      headingGroup.questions.forEach((question) => {
        if (next[question.id] === paragraphLabel) delete next[question.id];
      });
      if (questionId) next[questionId] = paragraphLabel;
      return next;
    });
  };

  const selectSectionMatchingOption = (
    paragraphLabel: string,
    optionValue?: string,
  ) => {
    const question = sectionMatchingQuestionsByParagraph.get(paragraphLabel);
    if (!question) return;
    const currentValue = String(answers[question.id] || "");
    if (isQuestionLocked(question.id, currentValue)) return;
    setAnswers((current) => {
      const next = { ...current };
      if (optionValue) next[question.id] = optionValue;
      else delete next[question.id];
      return next;
    });
  };

  const assignWord = (
    questions: ReadingPracticeQuestion[],
    questionId: string,
    value: string,
  ) => {
    const targetValue = String(answers[questionId] || "");
    if (isQuestionLocked(questionId, targetValue)) return false;
    const sourceQuestion = questions.find(
      (question) =>
        question.id !== questionId && answers[question.id] === value,
    );
    if (sourceQuestion && isQuestionLocked(sourceQuestion.id, value))
      return false;

    setAnswers((current) => {
      const next = { ...current };
      questions.forEach((question) => {
        if (question.id !== questionId && next[question.id] === value)
          delete next[question.id];
      });
      next[questionId] = value;
      return next;
    });
    setSelectedBlankWord(null);
    setSelectedBlankQuestionId(null);
    return true;
  };

  const activateBlank = (questionId: string, value: string) => {
    if (practiceToolsEnabled && dictionaryMode && value) {
      void openBlankWordMeaning(value);
      return;
    }
    if (reviewMode || isQuestionLocked(questionId, value)) return;
    if (selectedBlankWord) {
      if (
        value === selectedBlankWord &&
        answers[questionId] === selectedBlankWord
      ) {
        setSelectedBlankWord(null);
        return;
      }
      assignWord(
        fillBlankGroup?.questions || [],
        questionId,
        selectedBlankWord,
      );
      return;
    }
    setSelectedBlankQuestionId((current) =>
      current === questionId ? null : questionId,
    );
  };

  const placeRevealedAnswer = (
    question: ReadingPracticeLearningQuestionCheck,
  ) => {
    const correctAnswer = singleAnswer(question.correctAnswer);
    if (!correctAnswer) return;
    const placed = fillBlankGroup
      ? assignWord(
          fillBlankGroup.questions || [],
          question.questionId,
          correctAnswer,
        )
      : true;
    if (!placed) return;
    if (!fillBlankGroup) setAnswer(question.questionId, correctAnswer);
    setRevealedPlacedAnswers((current) => ({
      ...current,
      [question.questionId]: correctAnswer,
    }));
  };

  const sectionLearningStats = useMemo(() => {
    const stats = {
      correct: 0,
      incorrect: 0,
      unanswered: 0,
      pending: 0,
      revealed: 0,
    };
    (learningCheck?.questions || []).forEach((question) => {
      const currentValue = String(answers[question.questionId] || "");
      const checkedValue = String(question.userAnswer ?? "");
      const isCurrentCorrect =
        question.isCorrect && currentValue === checkedValue;
      const isCurrentRevealed =
        revealedPlacedAnswers[question.questionId] === currentValue;

      if (isCurrentRevealed) stats.revealed += 1;
      else if (isCurrentCorrect) stats.correct += 1;
      else if (!currentValue) stats.unanswered += 1;
      else if (currentValue !== checkedValue) stats.pending += 1;
      else stats.incorrect += 1;
    });
    return stats;
  }, [answers, learningCheck, revealedPlacedAnswers]);

  const sectionLearningReadyToComplete = Boolean(
    sectionLearningMode &&
    learningCheck &&
    allQuestions.length > 0 &&
    allQuestions.every((question) => {
      const value = String(answers[question.id] || "");
      return isQuestionLocked(question.id, value);
    }),
  );

  const sectionLearningMethodQuestions = (() => {
    const questions = learningCheck?.questions || [];
    if (sectionLearningReadyToComplete) return questions;
    return questions.filter(
      (question) =>
        question.isCorrect &&
        !isRevealedPlaced(
          question.questionId,
          String(answers[question.questionId] || ""),
        ),
    );
  })();

  const learningCopy = LEARNING_FEEDBACK_COPY[learningFeedbackLanguage];
  const sectionLearningTabsVisible = Boolean(
    sectionLearningMode &&
      learningCheck &&
      (sectionMatchingMode || sectionNumber === 4 || sectionNumber === 5),
  );
  const changeSectionMatchingPanelView = (view: SectionMatchingPanelView) => {
    setSectionMatchingPanelView(view);
    window.requestAnimationFrame(() => {
      rightPanelScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  useEffect(() => {
    if (!sectionLearningTabsVisible) {
      setSectionMatchingPanelView("options");
    }
  }, [sectionLearningTabsVisible]);

  const changeLearningFeedbackLanguage = (
    language: LearningFeedbackLanguage,
  ) => {
    setLearningFeedbackLanguage(language);
    try {
      window.localStorage.setItem(LEARNING_FEEDBACK_LANGUAGE_KEY, language);
    } catch {
      // The preference remains active for this session when storage is unavailable.
    }
  };

  const rightPanelHeading =
    learningCheck && !sectionLearningReadyToComplete
      ? learningCopy.retry
      : sectionNumber >= 1 && sectionNumber <= 3
        ? "Seçenekler"
        : headingGroup
          ? "Seçenekler"
          : "Sorular";

  const submit = async () => {
    if (!id || !passage || submitting) return;
    if (!activeAttemptId) {
      toast.error(
        "Bu çalışma oturumu başlatılmadı. Lütfen pratiği yeniden başlat.",
      );
      return;
    }
    setSubmitting(true);
    const payload = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    const durationSeconds = Math.max(
      1,
      Math.floor((Date.now() - startedAtRef.current) / 1000),
    );
    const result = await readingPracticeService.submit(
      id,
      activeAttemptId,
      payload,
      durationSeconds,
    );
    setSubmitting(false);
    if (!result) return;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(progressStorageKey(id));
    }
    toast.success("Çalışma tamamlandı.");
    navigate(PRACTICE_HOME_PATH, { replace: true });
  };

  const checkSectionPractice = async (revealQuestionIds: string[] = []) => {
    if (!id || !passage || submitting || !activeAttemptId) return;
    setSubmitting(true);
    const payload = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));
    const result = await readingPracticeService.check(
      id,
      activeAttemptId,
      payload,
      revealQuestionIds,
    );
    setSubmitting(false);
    if (!result) return;
    const previousQuestionsById = new Map(
      (learningCheck?.questions || []).map((question) => [
        question.questionId,
        question,
      ]),
    );
    const resultWithRevealedFeedback = {
      ...result,
      questions: result.questions.map((question) => {
        const previousQuestion = previousQuestionsById.get(
          question.questionId,
        );
        const answerWasRevealed = Boolean(
          revealedPlacedAnswers[question.questionId],
        );
        if (
          !answerWasRevealed ||
          previousQuestion?.correctAnswer === undefined
        ) {
          return question;
        }
        return {
          ...question,
          userAnswer: previousQuestion.userAnswer,
          wrongAttempts: Math.max(
            question.wrongAttempts,
            previousQuestion.wrongAttempts,
          ),
          canReveal: false,
          correctAnswer: previousQuestion.correctAnswer,
          method: previousQuestion.method || question.method,
          methodUz: previousQuestion.methodUz || question.methodUz,
          explanation:
            previousQuestion.explanation || question.explanation,
          explanationUz:
            previousQuestion.explanationUz || question.explanationUz,
          distractorExplanation:
            previousQuestion.distractorExplanation ||
            question.distractorExplanation,
          distractorExplanationUz:
            previousQuestion.distractorExplanationUz ||
            question.distractorExplanationUz,
        };
      }),
    };
    setLearningCheck(resultWithRevealedFeedback);
    setSelectedBlankWord(null);
    setSelectedBlankQuestionId(null);

    if (sectionNumber !== 1 && revealQuestionIds.length > 0) {
      const revealedQuestions = result.questions.filter(
        (question) =>
          revealQuestionIds.includes(question.questionId) &&
          question.correctAnswer !== undefined,
      );
      if (revealedQuestions.length > 0) {
        setAnswers((current) => {
          const next = { ...current };
          revealedQuestions.forEach((question) => {
            const correctAnswer = singleAnswer(question.correctAnswer);
            if (!correctAnswer) return;
            if (
              questionTypeById.get(question.questionId) === "MATCHING_HEADINGS"
            ) {
              allQuestions.forEach((item) => {
                if (
                  item.id !== question.questionId &&
                  next[item.id] === correctAnswer
                ) {
                  delete next[item.id];
                }
              });
            }
            next[question.questionId] = correctAnswer;
          });
          return next;
        });
        setRevealedPlacedAnswers((current) => ({
          ...current,
          ...Object.fromEntries(
            revealedQuestions
              .map((question) => [
                question.questionId,
                singleAnswer(question.correctAnswer),
              ])
              .filter(([, value]) => Boolean(value)),
          ),
        }));
      }
    }

    const firstNeedsAttention = result.questions.find(
      (question) => !question.isCorrect,
    );
    if (firstNeedsAttention) {
      window.setTimeout(() => {
        document
          .getElementById(`reading-question-${firstNeedsAttention.questionId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 80);
    }
  };

  const handlePrimaryAction = async () => {
    if (sectionLearningMode) {
      if (sectionLearningReadyToComplete) {
        await submit();
        return;
      }
      await checkSectionPractice();
      return;
    }
    await submit();
  };

  const applyCustomTimer = () => {
    const parsed = Number(customTimerMinutes);
    if (!Number.isFinite(parsed) || parsed < 5) {
      toast.error("En az 5 dakika seçmelisin.");
      return;
    }
    const minutes = Math.min(180, Math.round(parsed));
    setCustomTimerMinutes(String(minutes));
    setTimerEnabled(true);
    setTimerMinutes(minutes);
    setTimeLeft(minutes * 60);
    setTimeExpiredWarningShown(false);
    setTimerMenuOpen(false);
  };

  const adjustTimerMinutes = (change: number) => {
    const current = Number(customTimerMinutes) || timerMinutes || 20;
    setCustomTimerMinutes(String(Math.min(180, Math.max(5, current + change))));
  };

  useEffect(() => {
    if (!passage || !timerEnabled || timeLeft !== 0 || submitting) return;

    if (mode === "sinav") {
      void submit();
      return;
    }

    if (!timeExpiredWarningShown) {
      toast.info(
        "Süre bitti. Çalışmaya devam edebilir veya hazır olduğunda gönderebilirsin.",
      );
      setTimeExpiredWarningShown(true);
    }
    setTimerEnabled(false);
    setTimerMenuOpen(false);
  }, [
    mode,
    passage,
    timerEnabled,
    timeExpiredWarningShown,
    timeLeft,
    submitting,
  ]);

  const requestExit = (action: () => void, forcePrompt = false) => {
    if (!forcePrompt && !hasUnsavedProgress) {
      action();
      return;
    }
    pendingExitActionRef.current = action;
    setShowExitDialog(true);
  };

  useEffect(() => {
    const handlePracticeNavigationRequest = (event: Event) => {
      const destination = (event as CustomEvent<{ to?: string }>).detail?.to;
      if (!destination) return;
      requestExit(() => navigate(destination), shouldWarnOnExit);
    };

    window.addEventListener(
      PRACTICE_NAVIGATION_REQUEST_EVENT,
      handlePracticeNavigationRequest,
    );
    return () =>
      window.removeEventListener(
        PRACTICE_NAVIGATION_REQUEST_EVENT,
        handlePracticeNavigationRequest,
      );
  }, [hasUnsavedProgress, navigate, shouldWarnOnExit]);

  const confirmExit = () => {
    setShowExitDialog(false);
    const action = pendingExitActionRef.current;
    pendingExitActionRef.current = null;
    action?.();
  };

  const openDictionaryEntry = async (
    rawWord: string,
    entries: ReadingPracticeGlossaryEntry[],
    occurrenceIndex?: number,
  ) => {
    const cleanWord = normalizeWordKey(rawWord);
    if (!cleanWord) return;

    const matchingEntries = entries.filter(
      (entry) => normalizeWordKey(entry.term) === cleanWord,
    );
    const localEntry =
      (occurrenceIndex
        ? matchingEntries.find(
            (entry) => entry.occurrenceIndex === occurrenceIndex,
          )
        : undefined) ||
      matchingEntries.find((entry) => entry.occurrenceIndex == null) ||
      matchingEntries[0];
    if (localEntry) {
      const parts = dictionaryParts(localEntry);
      setDictionaryPanelVisible(true);
      setSelectedDictionary({
        term: rawWord,
        baseForm: parts.baseForm || undefined,
        baseMeaning: parts.baseMeaning || undefined,
      });
      return;
    }

    // Sözlük sınav hazırlanırken üretilir ve admin tarafından düzenlenir.
    // Kayıtlı olmayan kelimeler için öğrenci başına yeni AI isteği gönderilmez.
  };

  const applyGuideHighlights = (
    nodes: ReactNode[],
    paragraphLabel: string,
  ): ReactNode[] => {
    if (!guideMode) return nodes;
    const items = activeGuideHighlightsByParagraph[paragraphLabel] || [];
    if (!items.length) return nodes;
    return items.reduce<ReactNode[]>((currentNodes, item) => {
      const output: ReactNode[] = [];
      currentNodes.forEach((node, nodeIndex) => {
        if (typeof node !== "string") {
          output.push(node);
          return;
        }
        const sentences = node.split(/(?<=[.!?])(\s+)/);
        let matched = false;
        sentences.forEach((fragment, fragmentIndex) => {
          if (
            !matched &&
            fragment
              .toLocaleLowerCase("tr")
              .includes(item.snippet.toLocaleLowerCase("tr"))
          ) {
            matched = true;
            output.push(
              <span
                key={`${paragraphLabel}-${item.order}-${nodeIndex}-${fragmentIndex}`}
                className="bg-[#dff2c5]"
              >
                {fragment}
                {item.showOrder ? (
                  <span className="ml-1 inline-flex h-[1.15em] min-w-[1.15em] translate-y-[-0.03em] items-center justify-center rounded-[3px] bg-[#1f5d1d] px-[0.22em] text-[0.85em] font-bold leading-none text-white align-middle">
                    {item.order}
                  </span>
                ) : null}
              </span>,
            );
            return;
          }
          output.push(fragment);
        });
      });
      return output;
    }, nodes);
  };

  const applyManualHighlights = (
    nodes: ReactNode[],
    paragraphLabel: string,
  ): ReactNode[] => {
    const snippets = manualHighlights[paragraphLabel] || [];
    if (!snippets.length) return nodes;
    return nodes.flatMap<ReactNode>((node, nodeIndex) => {
      // Guide spans keep their green background; saved notes remain distinct inside them.
      if (
        isValidElement<{ children?: ReactNode; className?: string }>(node) &&
        node.type === "span" && node.props.className === "bg-[#dff2c5]"
      ) {
        const children = node.props.children;
        return [cloneElement(
          node,
          undefined,
          ...applyManualHighlights(Array.isArray(children) ? children : [children], paragraphLabel),
        )];
      }
      if (typeof node !== "string") return [node];
      return splitPracticeHighlights(node, snippets, activeNoteIds).map(
        (segment, segmentIndex) => segment.kind === "plain" ? segment.text : (
          <mark
            key={`${paragraphLabel}-${nodeIndex}-${segmentIndex}`}
            className={`rounded-[3px] px-0.5 text-inherit ${segment.kind === "note"
              ? "bg-[#edf3f7] underline decoration-[#8091a2] decoration-dashed decoration-1 underline-offset-[3px]"
              : "bg-[#fff0a8]"}`}
            title={segment.noteId ? notes.find((note) => note.id === segment.noteId)?.text : undefined}
          >
            {segment.text}
          </mark>
        ),
      );
    });
  };

  const applyDictionaryHighlights = (
    nodes: ReactNode[],
    entries: ReadingPracticeGlossaryEntry[],
    paragraphLabel: string,
    paragraphText: string,
    sourceCursor: { offset: number } = { offset: 0 },
  ): ReactNode[] => {
    if (!dictionaryMode) return nodes;
    const selectedWord = normalizeWordKey(selectedDictionary?.term || "");
    const output: ReactNode[] = [];
    nodes.forEach((node, nodeIndex) => {
      if (isValidElement<{ children?: ReactNode }>(node)) {
        const childNodes = node.props.children;
        if (!childNodes) {
          output.push(node);
          return;
        }
        const transformedChildren = applyDictionaryHighlights(
          Array.isArray(childNodes) ? childNodes : [childNodes],
          entries,
          paragraphLabel,
          paragraphText,
          sourceCursor,
        );
        output.push(cloneElement(node, undefined, transformedChildren));
        return;
      }
      if (typeof node !== "string") {
        output.push(node);
        return;
      }
      const sourceIndexFromCursor = paragraphText.indexOf(
        node,
        sourceCursor.offset,
      );
      const sourceIndex =
        sourceIndexFromCursor >= 0
          ? sourceIndexFromCursor
          : paragraphText.indexOf(node);
      if (sourceIndex >= 0) sourceCursor.offset = sourceIndex + node.length;
      let localOffset = 0;
      splitDictionaryText(node).forEach((fragment, fragmentIndex) => {
        const fragmentStart =
          sourceIndex >= 0 ? sourceIndex + localOffset : 0;
        localOffset += fragment.length;
        const cleanWord = normalizeWordKey(fragment);
        if (!cleanWord) {
          output.push(fragment);
          return;
        }
        const occurrenceIndex = wordOccurrenceAt(
          paragraphText,
          fragment,
          fragmentStart,
        );
        const matchingEntries = entries.filter(
          (entry) => normalizeWordKey(entry.term) === cleanWord,
        );
        const glossaryEntry =
          matchingEntries.find(
            (entry) => entry.occurrenceIndex === occurrenceIndex,
          ) ||
          matchingEntries.find((entry) => entry.occurrenceIndex == null) ||
          matchingEntries[0];
        const shortMeaning = glossaryEntry
          ? String(
              glossaryEntry.simpleDefinition ||
                glossaryEntry.definition ||
                "",
            ).trim()
          : "";
        if (!glossaryEntry || !shortMeaning) {
          output.push(fragment);
          return;
        }
        const isSelected = selectedWord !== "" && cleanWord === selectedWord;
        output.push(
          <button
            key={`${paragraphLabel}-${nodeIndex}-${fragmentIndex}-${cleanWord}`}
            type="button"
            data-exam-selection-ignore="true"
            onClick={() =>
              void openDictionaryEntry(fragment, entries, occurrenceIndex)
            }
            aria-label={`${fragment}: ${shortMeaning}`}
            className={`reading-dictionary-word relative cursor-pointer rounded-[3px] transition hover:underline hover:decoration-black hover:underline-offset-2 focus-visible:underline focus-visible:underline-offset-2 ${
              isSelected ? "bg-[#dff2c5] text-[#242424]" : "text-inherit"
            }`}
            style={{
              padding: isSelected ? "0.01em 0.14em" : 0,
              margin: 0,
              lineHeight: isSelected ? 1.15 : "inherit",
              boxShadow: "none",
              verticalAlign: "baseline",
            }}
          >
            {fragment}
          </button>,
        );
      });
    });
    return output;
  };

  const appendManualHighlight = (paragraphLabel: string, text: string, noteId?: string) => {
    setManualHighlights((current) => {
      const items = current[paragraphLabel] || [];
      const existing = items.find((item) => item.text === text);
      return {
        ...current,
        [paragraphLabel]: existing
          ? items.map((item) => item === existing && noteId ? { ...item, noteId } : item)
          : [...items, { text, ...(noteId ? { noteId } : {}) }],
      };
    });
  };

  const addManualHighlight = () => {
    if (!selectionMenu) return;
    appendManualHighlight(selectionMenu.paragraphLabel, selectionMenu.text);
    window.getSelection()?.removeAllRanges();
    setSelectionMenu(null);
  };

  const clearManualHighlight = () => {
    if (!selectionMenu) return;
    const overlapsSelection = (item: PracticeHighlight) =>
      item.text.toLocaleLowerCase("tr").includes(selectionMenu.text.toLocaleLowerCase("tr")) ||
      selectionMenu.text.toLocaleLowerCase("tr").includes(item.text.toLocaleLowerCase("tr"));
    (manualHighlights[selectionMenu.paragraphLabel] || [])
      .filter(overlapsSelection)
      .forEach((item) => { if (item.noteId) deleteNote(item.noteId); });
    setManualHighlights((current) => ({
      ...current,
      [selectionMenu.paragraphLabel]: (
        current[selectionMenu.paragraphLabel] || []
      ).filter((item) => !overlapsSelection(item)),
    }));
    window.getSelection()?.removeAllRanges();
    setSelectionMenu(null);
  };

  const openSelectionNoteEditor = () => {
    if (!selectionMenu) return;
    const highlight = (manualHighlights[selectionMenu.paragraphLabel] || []).find(
      (item) => item.text === selectionMenu.text && item.noteId && activeNoteIds.has(item.noteId),
    );
    const note = notes.find((item) => item.id === highlight?.noteId);
    setSelectionNoteEditor({
      ...selectionMenu,
      note: note?.text || "",
      noteId: note?.id,
    });
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
  };

  const saveSelectionNote = () => {
    if (!selectionNoteEditor) return;
    const noteText = selectionNoteEditor.note.trim();
    if (!noteText) return;

    if (selectionNoteEditor.noteId && activeNoteIds.has(selectionNoteEditor.noteId)) {
      updateNote(selectionNoteEditor.noteId, noteText);
      setSelectionNoteEditor(null);
      return;
    }

    const note = addNote({
      text: noteText,
      partNumber: sectionNumber || undefined,
      highlightedText: selectionNoteEditor.text,
      highlightId: `practice-${selectionNoteEditor.paragraphLabel}-${Date.now()}`,
    });
    appendManualHighlight(
      selectionNoteEditor.paragraphLabel,
      selectionNoteEditor.text,
      note.id,
    );
    setSelectionNoteEditor(null);
  };

  const toggleGuideQuestions = (questions: ReadingPracticeQuestion[]) => {
    const ids = questions.map((question) => question.id);
    setActiveGuideQuestionIds((current) =>
      ids.every((id) => current.includes(id))
        ? current.filter((id) => !ids.includes(id))
        : Array.from(new Set([...current, ...ids])),
    );
  };

  const buildParagraphContent = (paragraphLabel: string, text: string) => {
    const paragraphQuestions = blankQuestionsByParagraph[paragraphLabel] || [];
    const positionedQuestions = paragraphQuestions.every((question) =>
      Number.isInteger(Number(metaOf(question).inlineTargetStart)),
    )
      ? [...paragraphQuestions].sort(
          (left, right) =>
            Number(metaOf(right).inlineTargetStart) -
            Number(metaOf(left).inlineTargetStart),
        )
      : paragraphQuestions;
    let nodes: ReactNode[] = [text];
    const unresolved: ReadingPracticeQuestion[] = [];

    positionedQuestions.forEach((question) => {
      const value = String(displayAnswers[question.id] || "");
      const learningResult = currentLearningCheck(question.id, value);
      const revealedPlaced = isRevealedPlaced(question.id, value);
      const locked = Boolean(learningResult?.isCorrect) || revealedPlaced;
      const wrongValue = reviewMode
        ? reviewAnswerNote(userAnswerOf(reviewResult, question.id), value)
        : "";
      const blankNumber = Number(
        metaOf(question).blankNumber || question.order,
      );
      const targets = inlineTargets(question);
      const positionedStart = Number(metaOf(question).inlineTargetStart);
      const usesExactPosition = Number.isInteger(positionedStart);
      let replaced = false;
      nodes = nodes.flatMap((node, nodeIndex) => {
        if (replaced || typeof node !== "string") return [node];
        const target = usesExactPosition
          ? String(metaOf(question).inlineTarget || "")
          : targets.find((item) =>
              node
                .toLocaleLowerCase("tr")
                .includes(item.toLocaleLowerCase("tr")),
            );
        if (!target) return [node];
        const match = usesExactPosition
          ? nodeIndex === 0 &&
            node.slice(positionedStart, positionedStart + target.length) ===
              target
            ? { index: positionedStart, 0: target }
            : null
          : node.match(new RegExp(escapePattern(target), "i"));
        if (!match || typeof match.index !== "number") return [node];
        replaced = true;
        return [
          node.slice(0, match.index),
          <ReadingPracticeBlankSelect
            key={`${paragraphLabel}-${question.id}-${nodeIndex}`}
            number={blankNumber}
            value={value}
            keepLegacyInteraction={reviewMode || locked || (dictionaryMode && Boolean(value))}
            choices={blankPool.map((word) => {
              const usedQuestion = (fillBlankGroup?.questions || []).find((item) => answers[item.id] === word);
              return {
                value: word,
                disabled: Boolean(usedQuestion && usedQuestion.id !== question.id && isQuestionLocked(usedQuestion.id, word)),
                usedInBlank: usedQuestion ? Number(metaOf(usedQuestion).blankNumber || usedQuestion.order) : undefined,
              };
            })}
            onSelect={(word) => {
              if (word) assignWord(fillBlankGroup?.questions || [], question.id, word);
              else clearAnswer(question.id);
            }}
          >
            <BlankSlot
              key={`${paragraphLabel}-${question.id}-${nodeIndex}`}
              number={blankNumber}
              value={value}
              readOnly={reviewMode}
              locked={locked}
              selected={selectedBlankQuestionId === question.id && !locked}
              highlighted={
                Boolean(selectedBlankWord) && !dictionaryMode && !locked
              }
              questionId={question.id}
              feedback={
                revealedPlaced
                  ? "revealed"
                  : learningResult?.isCorrect
                    ? "correct"
                    : learningResult?.answered
                      ? "incorrect"
                      : undefined
              }
              onActivate={
                !reviewMode &&
                ((practiceToolsEnabled && dictionaryMode) || !locked)
                  ? () => activateBlank(question.id, value)
                  : undefined
              }
              onClear={() => clearAnswer(question.id)}
              onDrop={(event) => {
                event.preventDefault();
                if (
                  locked ||
                  !dragItem ||
                  dragItem.type !== "word" ||
                  dragItem.scope !== "bosluk"
                )
                  return;
                assignWord(
                  fillBlankGroup?.questions || [],
                  question.id,
                  dragItem.value,
                );
                setDragItem(null);
              }}
            />
          </ReadingPracticeBlankSelect>,
          reviewMode && wrongValue ? (
            <span
              key={`${paragraphLabel}-${question.id}-${nodeIndex}-user`}
              className="ml-1 inline-flex align-middle text-[#dc2626]"
              style={{ fontSize: "0.92em" }}
            >
              ({wrongValue})
            </span>
          ) : null,
          node.slice(match.index + match[0].length),
        ];
      });
      if (!replaced) unresolved.push(question);
    });

    return { nodes, unresolved };
  };

  const splitContentIntoVisualParagraphs = (
    nodes: ReactNode[],
    splitSingleLineBreak = false,
    preserveInnerLineBreaks = false,
  ) => {
    const paragraphs: ReactNode[][] = [[]];
    const separatorPattern = splitSingleLineBreak
      ? /(\r?\n[ \t]*)/
      : /(\r?\n[ \t]*\r?\n)/;

    nodes.forEach((node) => {
      if (typeof node !== "string") {
        paragraphs[paragraphs.length - 1].push(node);
        return;
      }

      node.split(separatorPattern).forEach((part) => {
        if (/^\r?\n/.test(part)) {
          if (paragraphs[paragraphs.length - 1].length) paragraphs.push([]);
          return;
        }
        if (part) {
          paragraphs[paragraphs.length - 1].push(
            preserveInnerLineBreaks ? part : part.replace(/\r?\n/g, " "),
          );
        }
      });
    });

    return paragraphs.filter((paragraph) => paragraph.length > 0);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafb]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2f7d4c]" />
      </div>
    );
  }

  if (!passage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafb]">
        <div className="max-w-lg border border-[#e5ebef] bg-white p-8 text-center">
          <p className="text-xl font-semibold text-[#37352f]">
            Metin bulunamadı
          </p>
          <Button
            className="mt-6 bg-red-600 text-white hover:bg-red-700"
            onClick={() => navigate(PRACTICE_HOME_PATH)}
          >
            Listeye dön
          </Button>
        </div>
      </div>
    );
  }

  const visiblePassageTitle = isSectionPractice
    ? passage.passageTitle?.trim()
    : passage.passageTitle?.trim() || passage.title;
  const showVisiblePassageTitle = Boolean(
    visiblePassageTitle &&
    !(isSectionPractice && sectionNumber === 2),
  );
  const textImage = passage.paragraphs.find((paragraph) =>
    paragraph.imageUrl?.trim(),
  );
  const imagePositionPercent = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50;
  };
  const textImagePosition = textImage
    ? `${imagePositionPercent(textImage.imagePositionX)}% ${imagePositionPercent(textImage.imagePositionY)}%`
    : "50% 50%";

  return (
    <div
      className="notranslate reading-exam-page reading-practice-page min-h-screen bg-white font-sans text-[#37352f] lg:flex lg:h-[100dvh] lg:min-h-0 lg:flex-col lg:overflow-hidden"
      translate="no"
      data-exam-translation="disabled"
      data-mobile-split={mobileSplit || undefined}
      data-focused-presentation={focusedPresentation}
      style={{ "--reading-font-scale": presentationFontScale } as CSSProperties}
    >
      <header
        className={`sticky w-full shrink-0 border-b border-[#e5e5e2] bg-white ${focusedPresentation ? "top-0 z-[100]" : "top-14 z-30 lg:top-0"}`}
      >
        <div className="px-2 sm:px-4">
          <div className="reading-practice-header-row relative grid min-h-[60px] grid-cols-[auto_1fr_auto] items-center gap-3 py-2 lg:h-[60px] lg:py-0">
            <div className="flex items-center gap-3">
              {focusedPresentation ? (
                <>
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo11.svg"
                      alt="TURKISHMOCK"
                      className="block h-10 w-auto shrink-0 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <span
                    data-exam-section-divider
                    className="hidden h-5 w-px shrink-0 bg-[#dededb] sm:block"
                    aria-hidden="true"
                  />
                </>
              ) : null}
              <span data-exam-section-title className="hidden truncate text-[17px] font-semibold text-[#37352f] sm:inline">
                Okuma
              </span>
            </div>

            <div className="reading-practice-timer pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              {timerEnabled ? (
                <span className="rounded-md border border-[#e5e5e2] bg-[#f7f7f5] px-3 py-1.5 text-sm font-semibold tabular-nums text-[#242424]">
                  {formatCountdown(timeLeft)}
                </span>
              ) : null}
            </div>

            <div className="reading-practice-tools flex items-center gap-2 justify-self-end">
              <div className="flex items-center gap-0.5 rounded-lg border border-[#e5e5e2] bg-[#f7f7f5] p-1">
                {practiceToolsEnabled ? (
                  <>
                    <ToolbarIconButton
                      label="Sözlük"
                      active={dictionaryMode}
                      onClick={() =>
                        setDictionaryMode((current) => {
                          const next = !current;
                          setDictionaryPanelVisible(next);
                          if (!next) setSelectedDictionary(null);
                          return next;
                        })
                      }
                    >
                      <BookOpen className="h-5 w-5" strokeWidth={1.75} />
                    </ToolbarIconButton>
                    <NotesPanel currentPartNumber={sectionNumber || undefined} variant="practice" />
                    <div className="relative">
                      <ToolbarIconButton
                        label="Süre"
                        active={timerEnabled}
                        onClick={() =>
                          setTimerMenuOpen((current) => {
                            const next = !current;
                            if (next)
                              setCustomTimerMinutes(
                                String(timerEnabled ? timerMinutes : 20),
                              );
                            return next;
                          })
                        }
                      >
                        <Clock3 className="h-5 w-5" strokeWidth={1.75} />
                      </ToolbarIconButton>
                      {timerMenuOpen ? (
                        <div className="reading-practice-timer-menu isolate absolute right-0 top-[calc(100%+12px)] z-50 w-[228px] overflow-hidden rounded-xl border border-[#d8d8d4] bg-[#ffffff] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.22)]">
                          <div>
                            <p className="text-sm font-semibold text-[#242424]">
                              Süre
                            </p>
                            <p className="mt-0.5 text-xs leading-5 text-[#777570]">
                              Çalışma süreni ayarla.
                            </p>
                          </div>

                          <div className="mt-3 flex h-11 items-center justify-between rounded-lg border border-[#dededb] bg-[#f7f7f5] p-1">
                            <button
                              type="button"
                              onClick={() => adjustTimerMinutes(-5)}
                              disabled={Number(customTimerMinutes) <= 5}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-xl font-medium leading-none text-[#37352f] shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors hover:bg-[#eeeeeb] disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="Süreyi 5 dakika azalt"
                            >
                              −
                            </button>
                            <span className="text-sm font-semibold tabular-nums text-[#242424]">
                              {customTimerMinutes} dakika
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustTimerMinutes(5)}
                              disabled={Number(customTimerMinutes) >= 180}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white text-xl font-medium leading-none text-[#37352f] shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-colors hover:bg-[#eeeeeb] disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label="Süreyi 5 dakika artır"
                            >
                              +
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTimerEnabled(false);
                                setTimerMenuOpen(false);
                              }}
                              className="h-9 rounded-md border border-[#dededb] bg-white px-3 text-xs font-semibold text-[#5f5e5a] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f]"
                            >
                              Süresiz
                            </button>
                            <button
                              type="button"
                              onClick={applyCustomTimer}
                              className="h-9 rounded-md bg-[var(--tm-accent)] px-3 text-xs font-semibold text-white transition-colors hover:bg-[var(--tm-accent-hover)]"
                            >
                              Uygula
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <ToolbarIconButton
                      label="Yazıyı küçült"
                      onClick={() =>
                        setFontScale((current) =>
                          Math.max(0.9, Number((current - 0.05).toFixed(2))),
                        )
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="text-[12px] font-medium tracking-[-0.02em]"
                      >
                        A−
                      </span>
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      label="Yazıyı büyüt"
                      onClick={() =>
                        setFontScale((current) =>
                          Math.min(1.15, Number((current + 0.05).toFixed(2))),
                        )
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="text-[12px] font-medium tracking-[-0.02em]"
                      >
                        A+
                      </span>
                    </ToolbarIconButton>
                  </>
                ) : null}
                <ToolbarIconButton
                  label={
                    focusedPresentation
                      ? "Pratiği küçült"
                      : "Pratiği tam sayfa aç"
                  }
                  onClick={toggleFocusedPresentation}
                >
                  {focusedPresentation ? (
                    <Minimize2 className="h-4 w-4" strokeWidth={1.75} />
                  ) : (
                    <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </ToolbarIconButton>
              </div>
              <button
                type="button"
                onClick={() =>
                  requestExit(
                    () => navigate(PRACTICE_HOME_PATH),
                    shouldWarnOnExit,
                  )
                }
                className="group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#777570] transition-colors hover:bg-[#f1f1ee] hover:text-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9b9b96] focus-visible:ring-offset-2"
                aria-label="Çalışmadan çık"
              >
                <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
                <span className="pointer-events-none absolute right-0 top-[calc(100%+8px)] z-50 hidden whitespace-nowrap rounded-full bg-[#111827] px-2.5 py-1 text-[12px] font-medium text-white shadow-sm group-hover:block">
                  Çalışmadan çık
                </span>
              </button>
              <Button
                onClick={() => void handlePrimaryAction()}
                disabled={submitting || reviewMode}
                className="h-9 min-h-9 gap-1.5 rounded-md bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700"
              >
                <Check
                  className="h-3.5 w-3.5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {reviewMode
                  ? "Kontrol Edildi"
                  : submitting
                    ? "Kontrol Ediliyor"
                    : sectionLearningMode && sectionLearningReadyToComplete
                      ? "Çalışmayı Tamamla"
                      : sectionLearningMode && learningCheck
                        ? "Tekrar Kontrol Et"
                        : "Kontrol Et"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {isSectionPractice ? (
        <section className="practice-section-heading mx-2 mt-2 shrink-0 border-b border-[#e5e5e2] bg-white px-3 py-3.5 sm:mx-4 sm:px-4">
          <div
            className={`flex items-center justify-between gap-3 ${showSectionDescription ? "mb-1.5" : ""}`}
          >
            <h2 className="reading-part-heading">
              Bölüm {passage.sectionNumber}
            </h2>
            <button
              type="button"
              onClick={() => setShowSectionDescription((current) => !current)}
              aria-expanded={showSectionDescription}
              className="inline-flex h-8 w-8 items-center justify-center rounded text-[#777570] transition-colors hover:bg-[#f7f7f5] hover:text-[#37352f]"
              aria-label={
                showSectionDescription
                  ? "Bölüm açıklamasını gizle"
                  : "Bölüm açıklamasını göster"
              }
            >
              {showSectionDescription ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
          {showSectionDescription ? (
            <p className="reading-part-description max-w-6xl">
              {sectionInstruction}
            </p>
          ) : null}
        </section>
      ) : null}

      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              {answeredCount > 0
                ? "Testten çıkılsın mı?"
                : "Çıkmak istiyor musun?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {answeredCount > 0
                ? "Şu ana kadarki cevapların kaydedilir. Daha sonra kaldığın yerden devam edebilirsin."
                : "Henüz cevap vermedin. Daha sonra tekrar başlayabilirsin."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              onClick={() => {
                pendingExitActionRef.current = null;
                setShowExitDialog(false);
              }}
            >
              Kal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmExit}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Çık
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className={`reading-practice-panel-space ${practiceGridHeight}`}>
        <ResizablePanelGroup
          key={mobileSplit ? "mobile-vertical" : "standard-horizontal"}
          direction={mobileSplit ? "vertical" : "horizontal"}
          className={mobileSplit ? "reading-practice-vertical !flex h-full overflow-hidden" : "!grid h-full grid-cols-1 overflow-hidden lg:!flex"}
        >
          <ResizablePanel
            defaultSize={mobileSplit ? 45 : leftPanelDefaultSize}
            minSize={mobileSplit ? 25 : sectionNumber === 2 ? 30 : 25}
            maxSize={
              mobileSplit ? 75 : sectionNumber === 1 ? undefined : sectionNumber >= 4 ? 70 : 75
            }
            className={`reading-surface min-w-0 ${
              sectionNumber === 2 ? "reading-part2-panel" : ""
            }`}
          >
            <div
              className={`reading-scroll-ultra pb-32 lg:h-full lg:overflow-y-auto ${sectionNumber === 1 ? "p-5" : sectionNumber >= 4 ? "p-8" : "p-6"}`}
            >
              <div className="max-w-[1180px]">
                {showVisiblePassageTitle ? (
                  <h3
                    className={`reading-passage-title ${isSectionPractice ? "text-left" : "text-center"}`}
                  >
                    {visiblePassageTitle}
                  </h3>
                ) : null}
                {textImage?.imageUrl ? (
                  <div
                    className={`${showVisiblePassageTitle ? "mt-3" : "mt-0"} aspect-[4/1] w-full overflow-hidden rounded-[4px] border border-[#e5e5e2] bg-[#f7f7f5]`}
                  >
                    <PresentationImage
                      src={textImage.imageUrl}
                      alt={visiblePassageTitle || passage.title}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: textImagePosition }}
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <div
                  className={`${textImage?.imageUrl ? "mt-4" : showVisiblePassageTitle ? "mt-3" : "mt-0"} ${sectionNumber === 2 ? "reading-part2-ad-grid" : "space-y-4"}`}
                >
                  {passage.paragraphs.map((paragraph) => {
                    const { nodes, unresolved } = buildParagraphContent(
                      paragraph.label,
                      paragraph.text,
                    );
                    const guideNodes = applyGuideHighlights(
                      nodes,
                      paragraph.label,
                    );
                    const manualNodes = applyManualHighlights(
                      guideNodes,
                      paragraph.label,
                    );
                    const dictionaryNodes = applyDictionaryHighlights(
                      manualNodes,
                      [
                        ...(glossaryByParagraph[paragraph.label] || []),
                        ...(glossaryByParagraph._genel || []),
                      ],
                      paragraph.label,
                      paragraph.text,
                    );
                    const visualParagraphs = splitContentIntoVisualParagraphs(
                      dictionaryNodes,
                      false,
                      sectionNumber === 2,
                    );
                    const sectionMatchingQuestion =
                      sectionMatchingQuestionsByParagraph.get(paragraph.label);
                    const sectionMatchingValue = sectionMatchingQuestion
                      ? String(
                          displayAnswers[sectionMatchingQuestion.id] || "",
                        ).trim()
                      : "";
                    const sectionMatchingReviewState = sectionMatchingQuestion
                      ? learningReviewState(
                          sectionMatchingQuestion.id,
                          sectionMatchingValue,
                        )
                      : "neutral";
                    const sectionMatchingLocked = sectionMatchingQuestion
                      ? isQuestionLocked(
                          sectionMatchingQuestion.id,
                          sectionMatchingValue,
                        )
                      : false;
                    const matchedHeading = headingAssignments[paragraph.label];
                    const headingWrongValue = matchedHeading
                      ? reviewMode
                        ? reviewAnswerNote(
                            userAnswerOf(reviewResult, matchedHeading.id),
                            paragraph.label,
                          )
                        : ""
                      : "";
                    const showParagraphLabel =
                      String(paragraph.label || "")
                        .trim()
                        .toLocaleLowerCase("tr") !== "metin";
                    const showParagraphTitle =
                      isSectionPractice &&
                      passage.sectionNumber === 2 &&
                      Boolean(paragraph.title?.trim());
                    const showInlineParagraphLabel =
                      isSectionPractice &&
                      sectionNumber === 5 &&
                      showParagraphLabel;
                    return (
                      <article
                        key={paragraph.label}
                        id={
                          sectionMatchingQuestion
                            ? `reading-question-${sectionMatchingQuestion.id}`
                            : undefined
                        }
                        className={
                          sectionMatchingMode && sectionNumber === 2
                            ? "reading-part2-ad-card"
                            : `space-y-3 ${
                                sectionMatchingMode
                                  ? `border-b border-[#e5e5e2] px-1 ${sectionNumber === 3 ? "py-6" : "py-5"} first:pt-0 last:border-b-0`
                                  : ""
                              }`
                        }
                        data-paragraph-label={paragraph.label}
                        onMouseUp={(event) => {
                          const selection = window.getSelection();
                          const selectedText =
                            selection?.toString().trim() || "";
                          if (!selectedText) {
                            setSelectionMenu(null);
                            return;
                          }
                          const range = selection?.getRangeAt(0);
                          const selectionEndRect = range
                            ? getReadingSelectionEndRect(range)
                            : null;
                          const boundaryRect =
                            event.currentTarget.getBoundingClientRect();
                          setSelectionMenu({
                            x: selectionEndRect?.right ?? event.clientX,
                            y: selectionEndRect?.bottom ?? event.clientY,
                            top: selectionEndRect?.top ?? event.clientY,
                            boundaryLeft: boundaryRect.left,
                            boundaryRight: boundaryRect.right,
                            text: selectedText,
                            paragraphLabel: paragraph.label,
                          });
                        }}
                      >
                        {sectionMatchingMode && sectionMatchingQuestion ? (
                          <div
                            className={
                              sectionNumber === 2
                                ? "reading-matching-select-header reading-part2-ad-header"
                                : "reading-matching-select-header flex items-start justify-start gap-3"
                            }
                          >
                            <div
                              className={
                                sectionNumber === 2
                                  ? "reading-part2-ad-title"
                                  : "flex min-w-0 flex-1 items-center gap-2.5"
                              }
                            >
                              <ReadingQuestionNumber
                                number={sectionMatchingQuestion.order}
                                className="!leading-6"
                              />
                              {sectionNumber === 3 ? (
                                <span className="reading-strong-title whitespace-nowrap">
                                  · {String(paragraph.label).replace(/\.$/, "")}
                                  . paragraf
                                </span>
                              ) : showParagraphTitle ? (
                                <span className="reading-strong-title min-w-0 italic">
                                  {paragraph.title}
                                </span>
                              ) : null}
                            </div>
                            <Select
                              value={sectionMatchingValue || "__none__"}
                              disabled={reviewMode || sectionMatchingLocked}
                              onValueChange={(value) => {
                                selectSectionMatchingOption(
                                  paragraph.label,
                                  value === "__none__" ? undefined : value,
                                );
                              }}
                            >
                              <SelectTrigger
                                className={`reading-matching-answer-trigger reading-select-trigger ${
                                  sectionNumber === 2
                                    ? "reading-part2-compact-select"
                                    : "reading-part3-compact-select"
                                } ${mobileScreen ? "" : "!h-9 !min-h-9"} w-[88px] shrink-0 ${
                                  sectionMatchingValue
                                    ? "reading-select-trigger-selected"
                                    : ""
                                } ${
                                  sectionMatchingReviewState === "correct"
                                    ? "!border-[#6f9b72] !bg-[#f4faf4] !text-[#2f6f3d]"
                                    : sectionMatchingReviewState === "incorrect"
                                      ? "!border-[#c87570] !bg-[#fff6f5] !text-[#a33737]"
                                      : ""
                                }`}
                                aria-label={`Soru ${sectionMatchingQuestion.order} için seçenek`}
                              >
                                <SelectValue placeholder="">
                                  <span className="font-semibold">
                                    {sectionMatchingValue
                                      ? displayLetterForValue(
                                          sectionMatchingDisplayOptions,
                                          sectionMatchingValue,
                                        )
                                      : "Seç"}
                                  </span>
                                  {sectionMatchingValue ? (
                                    <span className="reading-matching-answer-label" style={{ display: "none" }}>
                                      {" · "}{sectionMatchingDisplayOptions.find(option => option.value === sectionMatchingValue)?.label}
                                    </span>
                                  ) : null}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent
                                position="popper"
                                sideOffset={6}
                                className="reading-matching-answer-menu reading-select-content z-50 max-h-[60vh] w-[88px] min-w-[88px] max-w-[88px] overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white shadow-sm"
                              >
                                <SelectItem
                                  value="__none__"
                                  className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                                >
                                  Seç
                                </SelectItem>
                                {sectionMatchingDisplayOptions.map((option) => {
                                  return (
                                    <SelectItem
                                      key={`${paragraph.label}-${option.value}`}
                                      value={option.value}
                                      className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] text-[#37352f] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                                    >
                                      <span className="font-semibold">
                                        {option.displayLetter}
                                      </span>
                                      <span className="reading-matching-answer-label" style={{ display: "none" }}>
                                        {" · "}{option.label}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : (showParagraphLabel && !showInlineParagraphLabel) ||
                          showParagraphTitle ||
                          headingGroup ? (
                          <div className="reading-matching-select-header flex items-center gap-3">
                            {showParagraphLabel || headingGroup ? (
                              <div className="reading-strong-title">
                                {headingGroup
                                  ? `${String(paragraph.label).replace(/\.$/, "")}. paragraf`
                                  : paragraph.label}
                              </div>
                            ) : null}
                            {showParagraphTitle ? (
                              <div className="reading-strong-title">
                                {paragraph.title}
                              </div>
                            ) : null}
                            {headingGroup ? (
                              <Select
                                value={matchedHeading?.id || "__none__"}
                                disabled={reviewMode}
                                onValueChange={(value) =>
                                  selectHeadingForParagraph(
                                    paragraph.label,
                                    value === "__none__" ? undefined : value,
                                  )
                                }
                              >
                                <SelectTrigger
                                  className={`reading-matching-answer-trigger reading-select-trigger reading-part3-compact-select ${mobileScreen ? "" : "!h-9 !min-h-9"} w-[88px] shrink-0 ${
                                    matchedHeading
                                      ? "reading-select-trigger-selected"
                                      : ""
                                  }`}
                                  aria-label={`${paragraph.label} için başlık seç`}
                                >
                                  <SelectValue placeholder="Seç" />
                                </SelectTrigger>
                                <SelectContent
                                  position="popper"
                                  sideOffset={6}
                                  className="reading-matching-answer-menu reading-select-content reading-part3-letter-menu z-50 max-h-[60vh] w-[88px] min-w-[88px] max-w-[88px] overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white shadow-sm"
                                >
                                  <SelectItem
                                    value="__none__"
                                    className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                                  >
                                    Seç
                                  </SelectItem>
                                  {headingOptions.map(
                                    ({ question, letter }) => {
                                      const usedElsewhere =
                                        typeof displayAnswers[question.id] ===
                                          "string" &&
                                        displayAnswers[question.id] !==
                                          paragraph.label;
                                      return (
                                        <SelectItem
                                          key={`${paragraph.label}-${question.id}`}
                                          value={question.id}
                                          className={`cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] focus:bg-gray-100 focus:opacity-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333] ${
                                            usedElsewhere
                                              ? "text-[#8a8881] opacity-60"
                                              : "text-[#37352f]"
                                          }`}
                                        >
                                          <span className="font-semibold">
                                            {letter}
                                          </span>
                                          <span className="reading-matching-answer-label" style={{ display: "none" }}>
                                            {" · "}{question.prompt}
                                          </span>
                                        </SelectItem>
                                      );
                                    },
                                  )}
                                </SelectContent>
                              </Select>
                            ) : null}
                          </div>
                        ) : null}

                        {reviewMode &&
                        sectionMatchingQuestion &&
                        userAnswerOf(
                          reviewResult,
                          sectionMatchingQuestion.id,
                        ) &&
                        userAnswerOf(
                          reviewResult,
                          sectionMatchingQuestion.id,
                        ) !== sectionMatchingValue ? (
                          <div
                            className="text-[#a33737]"
                            style={{ fontSize: bodyFontSize }}
                          >
                            Senin seçtiğin:{" "}
                            {displayLetterForValue(
                              sectionMatchingDisplayOptions,
                              userAnswerOf(
                                reviewResult,
                                sectionMatchingQuestion.id,
                              ),
                            )}
                          </div>
                        ) : null}

                        {reviewMode && headingWrongValue ? (
                          <div
                            className="text-[#dc2626]"
                            style={{ fontSize: bodyFontSize }}
                          >
                            Senin seçtiğin paragraf: {headingWrongValue}
                          </div>
                        ) : null}

                        <div
                          className={
                            sectionNumber === 2
                              ? "reading-part2-ad-body"
                              : "space-y-4"
                          }
                        >
                          {visualParagraphs.map(
                            (visualParagraph, visualParagraphIndex) => (
                              <div
                                key={`${paragraph.label}-visual-${visualParagraphIndex}`}
                                className={`reading-text reading-primary-copy ${
                                  sectionNumber === 2 &&
                                  visualParagraphs.length > 1 &&
                                  visualParagraphIndex ===
                                    visualParagraphs.length - 1
                                    ? "reading-part2-ad-contact"
                                    : ""
                                }`}
                              >
                                {showInlineParagraphLabel &&
                                visualParagraphIndex === 0 ? (
                                  <span className="mr-2 font-semibold text-[#242424]">
                                    {`${String(paragraph.label).replace(/\.$/, "")}.`}
                                  </span>
                                ) : null}
                                {visualParagraph}
                              </div>
                            ),
                          )}
                        </div>

                        {unresolved.length ? (
                          <div className="space-y-3">
                            {unresolved.map((question) => {
                              const value = String(answers[question.id] || "");
                              const learningResult = currentLearningCheck(
                                question.id,
                                value,
                              );
                              const revealedPlaced = isRevealedPlaced(
                                question.id,
                                value,
                              );
                              const locked =
                                Boolean(learningResult?.isCorrect) ||
                                revealedPlaced;
                              return (
                                <div
                                  key={question.id}
                                  className="rounded-[7px] border border-dashed border-[#c7d2d9] px-4 py-3"
                                  onDragOver={(event) => event.preventDefault()}
                                  onDrop={(event) => {
                                    event.preventDefault();
                                    if (
                                      locked ||
                                      !dragItem ||
                                      dragItem.type !== "word" ||
                                      dragItem.scope !== "bosluk"
                                    )
                                      return;
                                    assignWord(
                                      fillBlankGroup?.questions || [],
                                      question.id,
                                      dragItem.value,
                                    );
                                    setDragItem(null);
                                  }}
                                >
                                  <div
                                    className="font-semibold text-[#264653]"
                                    style={{ fontSize: bodyFontSize }}
                                  >
                                    {question.prompt}
                                  </div>
                                  <div className="mt-2">
                                    <BlankSlot
                                      number={Number(
                                        metaOf(question).blankNumber ||
                                          question.order,
                                      )}
                                      value={value}
                                      readOnly={reviewMode}
                                      locked={locked}
                                      selected={
                                        selectedBlankQuestionId ===
                                          question.id && !locked
                                      }
                                      highlighted={
                                        Boolean(selectedBlankWord) &&
                                        !dictionaryMode &&
                                        !locked
                                      }
                                      questionId={question.id}
                                      feedback={
                                        revealedPlaced
                                          ? "revealed"
                                          : learningResult?.isCorrect
                                            ? "correct"
                                            : learningResult?.answered
                                              ? "incorrect"
                                              : undefined
                                      }
                                      onActivate={
                                        !reviewMode &&
                                        ((practiceToolsEnabled &&
                                          dictionaryMode) ||
                                          !locked)
                                          ? () =>
                                              activateBlank(question.id, value)
                                          : undefined
                                      }
                                      onClear={() => clearAnswer(question.id)}
                                      onDrop={(event) => {
                                        event.preventDefault();
                                        if (
                                          locked ||
                                          !dragItem ||
                                          dragItem.type !== "word" ||
                                          dragItem.scope !== "bosluk"
                                        )
                                          return;
                                        assignWord(
                                          fillBlankGroup?.questions || [],
                                          question.id,
                                          dragItem.value,
                                        );
                                        setDragItem(null);
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </ResizablePanel>
          <ReadingSplitHandle direction={mobileSplit ? "vertical" : "horizontal"} className={mobileSplit ? "" : "hidden lg:flex"} />
          <ResizablePanel
            defaultSize={mobileSplit ? 55 : rightPanelDefaultSize}
            minSize={mobileSplit ? 25 : sectionNumber >= 4 ? 20 : 25}
            maxSize={
              mobileSplit ? 75 : sectionNumber === 1 ? undefined : sectionNumber >= 4 ? 50 : 75
            }
            className="reading-surface-alt min-w-0"
          >
            <div
              ref={rightPanelScrollRef}
              className={`reading-scroll-ultra pb-32 lg:h-full lg:overflow-y-auto ${sectionNumber === 1 ? "p-5" : sectionNumber >= 4 ? "px-6 pb-6 pt-8" : "p-6"}`}
            >
              <div className="max-w-[980px]">
                {sectionLearningTabsVisible ? (
                  <div
                    className="mb-4 flex items-center gap-6 border-b border-[#e5e5e2]"
                    role="tablist"
                    aria-label={`Bölüm ${sectionNumber} çalışma görünümü`}
                  >
                    {(["options", "methods"] as const).map((view) => {
                      const selected = sectionMatchingPanelView === view;
                      return (
                        <button
                          key={view}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          aria-controls={`section-matching-${view}-panel`}
                          onClick={() => changeSectionMatchingPanelView(view)}
                          className={`-mb-px border-b-2 px-0.5 pb-2.5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b8b86] focus-visible:ring-offset-2 ${
                            selected
                              ? "border-[#242424] text-[#242424]"
                              : "border-transparent text-[#777570] hover:text-[#37352f]"
                          }`}
                        >
                          {view === "options"
                            ? sectionNumber === 4 || sectionNumber === 5
                              ? learningCopy.questions
                              : learningCopy.choices
                            : learningCopy.methods}
                        </button>
                      );
                    })}
                  </div>
                ) : [4, 5].includes(sectionNumber) ? null : (
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="reading-options-heading">
                        {rightPanelHeading}
                      </h2>
                    </div>
                    <div />
                  </div>
                )}
                <div className="space-y-6">
                  {fillBlankGroup && !reviewMode ? (
                    <section className="border-b border-[#e5e5e2] pb-6">
                      <div
                        className="flex flex-wrap gap-2"
                        onDragOver={(event) => event.preventDefault()}
                      >
                        {blankPool.map((word) => {
                          const usedQuestion = (
                            fillBlankGroup.questions || []
                          ).find((question) => answers[question.id] === word);
                          const used = Boolean(usedQuestion);
                          const locked = Boolean(
                            usedQuestion &&
                            isQuestionLocked(usedQuestion.id, word),
                          );
                          const selected =
                            selectedBlankWord === word && !dictionaryMode;
                          const highlighted =
                            Boolean(selectedBlankQuestionId) && !locked;
                          return (
                            <button
                              key={word}
                              type="button"
                              draggable={!locked}
                              aria-pressed={selected}
                              aria-disabled={locked}
                              onDragStart={() => {
                                if (locked) return;
                                setSelectedBlankWord(null);
                                setSelectedBlankQuestionId(null);
                                setDragItem({
                                  type: "word",
                                  scope: "bosluk",
                                  value: word,
                                });
                              }}
                              onClick={() => {
                                if (practiceToolsEnabled && dictionaryMode) {
                                  if (selectedBlankQuestionId && !locked) {
                                    assignWord(
                                      fillBlankGroup.questions || [],
                                      selectedBlankQuestionId,
                                      word,
                                    );
                                    return;
                                  }
                                  void openBlankWordMeaning(word);
                                  return;
                                }
                                if (locked) return;
                                if (selectedBlankQuestionId) {
                                  assignWord(
                                    fillBlankGroup.questions || [],
                                    selectedBlankQuestionId,
                                    word,
                                  );
                                  return;
                                }
                                setSelectedBlankWord((current) =>
                                  current === word ? null : word,
                                );
                              }}
                              className={`inline-flex min-h-9 items-center rounded-[4px] border px-3 text-[length:calc(15px*var(--reading-font-scale,1))] font-medium leading-[calc(22px*var(--reading-font-scale,1))] transition-[border-color,background-color,color,box-shadow] ${
                                locked
                                  ? "cursor-not-allowed border-[#d3d6d4] bg-[#e9ebe9] text-[#666a68]"
                                  : selected
                                    ? "cursor-pointer border-dashed border-[#686762] bg-white text-[#37352f]"
                                    : highlighted
                                      ? "cursor-pointer border-dashed border-[#686762] bg-white text-[#37352f]"
                                      : used
                                        ? "border-[#cfd3d4] bg-[#f1f1ef] text-[#5f625f] hover:border-[#aeb4b6] hover:bg-white hover:text-[#37352f]"
                                        : "border-[#d9e0e5] bg-white text-[#37352f] hover:border-[#aeb4b6] hover:bg-[#fafaf9]"
                              } ${practiceToolsEnabled && dictionaryMode ? "cursor-pointer" : !locked ? "cursor-grab" : ""}`}
                              style={{ width: "fit-content" }}
                              title={
                                practiceToolsEnabled && dictionaryMode
                                  ? "Anlamını göster"
                                  : locked
                                    ? "Doğru cevap kilitlendi"
                                    : selected
                                      ? "Seçimi kaldır"
                                      : highlighted
                                        ? "Seçilen boşluğa yerleştir"
                                        : "Seç ve bir boşluğa yerleştir"
                              }
                            >
                              {word}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {sectionLearningMode &&
                  learningCheck &&
                  (!sectionLearningTabsVisible ||
                    sectionMatchingPanelView === "methods") ? (
                    <section
                      id={
                        sectionLearningTabsVisible
                          ? "section-matching-methods-panel"
                          : undefined
                      }
                      role={
                        sectionLearningTabsVisible
                          ? "tabpanel"
                          : undefined
                      }
                      className="w-full"
                    >
                      <div
                        className={`border-b border-[#e8e8e4] pb-4 ${
                          sectionLearningReadyToComplete
                            ? "text-[#214b2b]"
                            : "text-[#37352f]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div
                            className="flex flex-wrap items-center gap-3 text-[13px] font-medium text-[#65635f]"
                            role="status"
                            aria-live="polite"
                            aria-label={`${learningCopy.correct} ${sectionLearningStats.correct}, ${learningCopy.incorrect} ${sectionLearningStats.incorrect}, ${learningCopy.unanswered} ${sectionLearningStats.unanswered}, ${learningCopy.pending} ${sectionLearningStats.pending}, ${learningCopy.shown} ${sectionLearningStats.revealed}`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[#6f9b72]"
                                aria-hidden="true"
                              />
                              {learningCopy.correct}{" "}
                              {sectionLearningStats.correct}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[#c87570]"
                                aria-hidden="true"
                              />
                              {learningCopy.incorrect}{" "}
                              {sectionLearningStats.incorrect}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-1.5 w-1.5 rounded-full bg-[#aaa7a1]"
                                aria-hidden="true"
                              />
                              {learningCopy.unanswered}{" "}
                              {sectionLearningStats.unanswered}
                            </span>
                            {sectionLearningStats.pending ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-[#777570]"
                                  aria-hidden="true"
                                />
                                {learningCopy.pending}{" "}
                                {sectionLearningStats.pending}
                              </span>
                            ) : null}
                            {sectionLearningStats.revealed ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-[#8a8881]"
                                  aria-hidden="true"
                                />
                                {learningCopy.shown}{" "}
                                {sectionLearningStats.revealed}
                              </span>
                            ) : null}
                          </div>
                          <div
                            className="inline-flex items-center rounded-md border border-[var(--tm-border-subtle)] bg-[var(--tm-bg-muted)] p-0.5"
                            role="group"
                            aria-label="Öğretici açıklama dili"
                          >
                            {(["tr", "uz"] as const).map((language) => (
                              <button
                                key={language}
                                type="button"
                                onClick={() =>
                                  changeLearningFeedbackLanguage(language)
                                }
                                aria-pressed={
                                  learningFeedbackLanguage === language
                                }
                                className={`inline-flex h-7 min-w-11 items-center justify-center gap-1 rounded px-2 text-[11px] font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)] ${
                                  learningFeedbackLanguage === language
                                    ? "bg-white text-[var(--tm-text-primary)] shadow-sm"
                                    : "text-[var(--tm-text-tertiary)] hover:text-[var(--tm-text-primary)]"
                                }`}
                              >
                                {learningFeedbackLanguage === language ? (
                                  <Check
                                    className="h-3 w-3"
                                    strokeWidth={2.5}
                                    aria-hidden="true"
                                  />
                                ) : null}
                                {language.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {!sectionLearningReadyToComplete &&
                      !learningCheck.allCorrect ? (
                        <div className="divide-y divide-[#e8e8e4]">
                          {learningCheck.questions
                            .filter(
                              (question) =>
                                !question.isCorrect ||
                                isRevealedPlaced(
                                  question.questionId,
                                  String(
                                    answers[question.questionId] || "",
                                  ),
                                ),
                            )
                            .map((question) => {
                              const solutionVisible =
                                question.correctAnswer !== undefined;
                              const revealedPlaced = isRevealedPlaced(
                                question.questionId,
                                String(answers[question.questionId] || ""),
                              );
                              if (question.answered && solutionVisible) {
                                return (
                                  <details
                                    key={question.questionId}
                                    open
                                    className="group/revealed-solution py-4"
                                  >
                                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                                      <span className="flex min-w-0 items-start gap-3">
                                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1f1ef] text-sm font-bold text-[#2f2e2a]">
                                          {question.order}
                                        </span>
                                        <span className="flex flex-wrap items-center gap-2 text-[length:calc(var(--reading-question-size,16px)*var(--reading-font-scale,1))] font-semibold leading-[calc(var(--reading-question-line-height,24px)*var(--reading-font-scale,1))]">
                                          <span className="text-[#b24a43] line-through decoration-1">
                                            {answerLabelForQuestion(
                                              question.questionId,
                                              question.userAnswer,
                                            )}
                                          </span>
                                          <span
                                            className="text-[#9a9891]"
                                            aria-hidden="true"
                                          >
                                            →
                                          </span>
                                          <span className="text-[#37352f]">
                                            {answerLabelForQuestion(
                                              question.questionId,
                                              question.correctAnswer,
                                            )}
                                          </span>
                                        </span>
                                      </span>
                                      <ChevronDown
                                        className="h-5 w-5 shrink-0 text-[#777570] transition-transform group-open/revealed-solution:rotate-180"
                                        aria-hidden="true"
                                      />
                                    </summary>
                                    <div className="ml-11 mt-3 space-y-4 pr-8 text-[length:calc(15px*var(--reading-font-scale,1))] leading-[calc(22px*var(--reading-font-scale,1))] text-[#242424]">
                                      <div>
                                        {revealedPlaced ? (
                                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#65635f]">
                                            <Check
                                              className="h-4 w-4"
                                              aria-hidden="true"
                                            />
                                            {sectionNumber === 1
                                              ? learningCopy.placedAnswer
                                              : learningCopy.answerShown}
                                          </span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              placeRevealedAnswer(question)
                                            }
                                            className="inline-flex min-h-9 items-center rounded-md border border-[#cfcfca] bg-white px-3 text-sm font-semibold text-[#37352f] transition-colors hover:bg-[#f4f4f1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b8b86] focus-visible:ring-offset-2"
                                          >
                                            {sectionNumber === 1
                                              ? learningCopy.placeAnswer
                                              : learningCopy.showAnswer}
                                          </button>
                                        )}
                                      </div>
                                      {learningMethodText(
                                        question,
                                        learningFeedbackLanguage,
                                      ) ||
                                      learningDistractorText(
                                        question,
                                        learningFeedbackLanguage,
                                      ) ||
                                      learningExplanationText(
                                        question,
                                        learningFeedbackLanguage,
                                      ) ? (
                                        <section className="space-y-2">
                                          {learningMethodText(
                                            question,
                                            learningFeedbackLanguage,
                                          ) ? (
                                            <p>
                                              <strong className="font-semibold text-[#242424]">
                                                {learningCopy.method}:
                                              </strong>{" "}
                                              {learningMethodText(
                                                question,
                                                learningFeedbackLanguage,
                                              )}
                                            </p>
                                          ) : null}
                                          {learningDistractorText(
                                            question,
                                            learningFeedbackLanguage,
                                          ) ? (
                                            <p>
                                              <strong className="font-semibold text-[#242424]">
                                                {learningCopy.yourChoice}:
                                              </strong>{" "}
                                              {learningDistractorText(
                                                question,
                                                learningFeedbackLanguage,
                                              )}
                                            </p>
                                          ) : null}
                                          {learningExplanationText(
                                            question,
                                            learningFeedbackLanguage,
                                          ) ? (
                                            <p>
                                              <strong className="font-semibold text-[#242424]">
                                                {learningCopy.whyCorrect}:
                                              </strong>{" "}
                                              {learningExplanationText(
                                                question,
                                                learningFeedbackLanguage,
                                              )}
                                            </p>
                                          ) : null}
                                        </section>
                                      ) : null}
                                    </div>
                                  </details>
                                );
                              }
                              return (
                                <article
                                  key={question.questionId}
                                  className="py-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-3">
                                      <span
                                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                          question.answered
                                            ? "bg-[#f1f1ef] text-[#2f2e2a]"
                                            : "bg-[#f1f1ef] text-[#2f2e2a]"
                                        }`}
                                      >
                                        {question.order}
                                      </span>
                                      {question.answered ? (
                                        <div className="min-w-0 space-y-2 text-[length:calc(15px*var(--reading-font-scale,1))] leading-[calc(22px*var(--reading-font-scale,1))] text-[#242424]">
                                          <p>
                                            <strong className="font-semibold text-[#242424]">
                                              {learningCopy.method}:
                                            </strong>{" "}
                                            {learningMethodText(
                                              question,
                                              learningFeedbackLanguage,
                                            )}
                                          </p>
                                          {learningDistractorText(
                                            question,
                                            learningFeedbackLanguage,
                                          ) ? (
                                            <p>
                                              <strong className="font-semibold text-[#242424]">
                                                {learningCopy.yourChoice}:
                                              </strong>{" "}
                                              {learningDistractorText(
                                                question,
                                                learningFeedbackLanguage,
                                              )}
                                            </p>
                                          ) : null}
                                        </div>
                                      ) : (
                                        <div>
                                          <p className="text-[length:calc(15px*var(--reading-font-scale,1))] font-normal leading-[calc(22px*var(--reading-font-scale,1))] text-[#242424]">
                                            {learningCopy.completeQuestion}
                                          </p>
                                          <p className="mt-0.5 text-xs font-medium text-[#777570]">
                                            {learningCopy.leftBlank}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    {question.canReveal && !solutionVisible ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          void checkSectionPractice([
                                            question.questionId,
                                          ])
                                        }
                                        className="shrink-0 rounded-md border border-[#d7d7d2] bg-white px-3 py-1.5 text-xs font-semibold text-[#37352f] hover:bg-[#f7f7f5]"
                                      >
                                        {learningCopy.showAnswer}
                                      </button>
                                    ) : null}
                                  </div>
                                </article>
                              );
                            })}
                        </div>
                      ) : null}

                      {sectionLearningMethodQuestions.length > 0 ? (
                        <details
                          className="group border-t border-[#e8e8e4]"
                          open={sectionLearningReadyToComplete}
                        >
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4">
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="inline-flex shrink-0 items-center justify-center text-[#2f7d4c]">
                                <Check className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <span className="text-[length:calc(15px*var(--reading-font-scale,1))] font-semibold leading-[calc(22px*var(--reading-font-scale,1))] text-[#2f2e2a]">
                                {sectionLearningReadyToComplete
                                  ? learningCopy.allMethods
                                  : learningCopy.correctAnswers}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#65635f]">
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-[#6f9b72]"
                                  aria-hidden="true"
                                />
                                {sectionLearningReadyToComplete
                                  ? sectionLearningMethodQuestions.length
                                  : sectionLearningStats.correct}
                              </span>
                            </span>
                            <ChevronDown
                              className="h-5 w-5 shrink-0 text-[#777570] transition-transform group-open:rotate-180"
                              aria-hidden="true"
                            />
                          </summary>
                          <div className="divide-y divide-[#e8e8e4] border-t border-[#e8e8e4]">
                            {sectionLearningMethodQuestions.map((question) => (
                              <details
                                key={`correct-method-${question.questionId}`}
                                className="group/correct-item"
                              >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4">
                                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f1f1ef] text-sm font-bold text-[#2f2e2a]">
                                    {question.order}
                                  </span>
                                  <span className="min-w-0 flex-1 text-[length:calc(15px*var(--reading-font-scale,1))] font-medium leading-[calc(22px*var(--reading-font-scale,1))] text-[#2f2e2a]">
                                    “
                                    {answerLabelForQuestion(
                                      question.questionId,
                                      question.correctAnswer ??
                                        question.userAnswer,
                                    )}
                                    ”
                                  </span>
                                  <ChevronDown
                                    className="h-5 w-5 shrink-0 text-[#777570] transition-transform group-open/correct-item:rotate-180"
                                    aria-hidden="true"
                                  />
                                </summary>
                                <div className="pb-5 pl-11 pr-8">
                                  <div className="min-w-0 space-y-4 text-[length:calc(15px*var(--reading-font-scale,1))] leading-[calc(22px*var(--reading-font-scale,1))] text-[#242424]">
                                    {learningMethodText(
                                      question,
                                      learningFeedbackLanguage,
                                    ) ? (
                                      <section>
                                        <p>
                                          <strong className="font-semibold text-[#242424]">
                                            {learningCopy.method}:
                                          </strong>{" "}
                                          {learningMethodText(
                                            question,
                                            learningFeedbackLanguage,
                                          )}
                                        </p>
                                      </section>
                                    ) : null}
                                  </div>
                                </div>
                              </details>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </section>
                  ) : null}

                  {headingGroup &&
                  (!sectionLearningTabsVisible ||
                    sectionMatchingPanelView === "options") ? (
                    <section
                      id={
                        sectionLearningTabsVisible
                          ? "section-matching-options-panel"
                          : undefined
                      }
                      role={
                        sectionLearningTabsVisible
                          ? "tabpanel"
                          : undefined
                      }
                      className={
                        sectionMatchingMode
                          ? ""
                          : "border-b border-[#e5e5e2] pb-8"
                      }
                    >
                      <div className="space-y-2">
                        {sectionMatchingMode
                          ? sectionMatchingDisplayOptions.map((option) => {
                              const glossaryLabel =
                                glossaryOptionParagraphLabel(
                                  headingGroup.type,
                                  headingGroup.order,
                                  headingGroup.questions[0]?.order || 0,
                                  option.value,
                                );
                              return (
                                <PracticeOptionLegendRow
                                  key={option.value}
                                  letter={option.displayLetter}
                                  text={applyDictionaryHighlights(
                                    applyManualHighlights(
                                      [option.label],
                                      glossaryLabel,
                                    ),
                                    [
                                      ...(glossaryByParagraph[
                                        glossaryLabel
                                      ] || []),
                                      ...(glossaryByParagraph._genel || []),
                                    ],
                                    glossaryLabel,
                                    option.label,
                                  )}
                                  selectionCount={countOptionSelections(
                                    displayAnswers,
                                    sectionMatchingQuestionIds,
                                    option.value,
                                  )}
                                  onTextSelection={(selection) =>
                                    setSelectionMenu({
                                      ...selection,
                                      paragraphLabel: glossaryLabel,
                                    })
                                  }
                                />
                              );
                            })
                          : headingOptions.map(({ question, letter }) => {
                              const used =
                                typeof displayAnswers[question.id] === "string";
                              const hint = hintTextForQuestion(
                                question,
                                "MATCHING_HEADINGS",
                              );
                              const keywords = (
                                metaOf(question).keywords || []
                              ).slice(0, 3);
                              return (
                                <div key={question.id}>
                                  <div
                                    className={`reading-option-legend grid min-h-10 grid-cols-[minmax(0,1fr)_18px] items-start gap-x-2 rounded-md px-2.5 py-2 ${
                                      used
                                        ? "bg-[#f1f1ef] text-[#8a8881]"
                                        : "text-[#37352f]"
                                    }`}
                                  >
                                    <span className="flex min-w-0 items-baseline gap-2">
                                      <span className="reading-option-letter shrink-0 font-semibold tabular-nums">
                                        {letter}.
                                      </span>
                                      <span className="reading-text reading-option-copy min-w-0 font-normal">
                                        {question.prompt}
                                      </span>
                                    </span>
                                    {used ? (
                                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#8a8881]" aria-label="Seçildi" />
                                    ) : (
                                      <span aria-hidden="true" />
                                    )}
                                  </div>
                                  {guideMode && (keywords.length || hint) ? (
                                    <div
                                      className="ml-9 mt-1 flex flex-wrap items-center gap-2 px-2 text-[#51606d]"
                                      style={{ fontSize: bodyFontSize }}
                                    >
                                      <KeyRound className="h-3.5 w-3.5 shrink-0" />
                                      {keywords.length ? (
                                        keywords.map((keyword) => (
                                          <span
                                            key={`${question.id}-${keyword}`}
                                            className="inline-flex items-center rounded-full bg-[#f5f8fa] px-2.5 py-1 font-medium"
                                          >
                                            {keyword}
                                          </span>
                                        ))
                                      ) : (
                                        <span>{hint}</span>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                      </div>
                    </section>
                  ) : null}

                  {multipleChoiceGroup &&
                  (!sectionLearningTabsVisible ||
                    sectionMatchingPanelView === "options") ? (
                    <section className="border-b border-[#e5e5e2] pb-8">
                      <div className="reading-question-instruction">
                        <div className="flex items-start gap-2">
                          {multipleChoiceInstruction ? (
                            <div>
                              <p className="reading-question-instruction-heading">
                                {sectionNumber === 4
                                  ? "Sorular 21–24"
                                  : "Sorular 30–32"}
                              </p>
                              <p className="reading-question-instruction-copy">
                                Metne göre doğru seçeneği{" "}
                                <strong>(A, B, C veya D)</strong> işaretleyiniz.
                              </p>
                            </div>
                          ) : (
                            <h3
                              className="font-semibold text-[#37352f]"
                              style={{ fontSize: headingFontSize }}
                            >
                              Çoktan seçmeli
                            </h3>
                          )}
                          {guideMode ? (
                            <button
                              type="button"
                              onClick={() =>
                                toggleGuideQuestions(
                                  multipleChoiceGroup.questions,
                                )
                              }
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                multipleChoiceGroup.questions.every(
                                  (question) =>
                                    activeGuideQuestionIds.includes(
                                      question.id,
                                    ),
                                )
                                  ? "bg-[#eef4f6] text-[#48616f]"
                                  : "bg-[#f5f7f9] text-[#9aa7b3]"
                              }`}
                              title="İlgili cümleleri göster"
                            >
                              <CircleHelp className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mb-8">
                        {multipleChoiceGroup.questions.map((question) => {
                          const currentValue = displayAnswers[question.id];
                          const userValue = userAnswerOf(
                            reviewResult,
                            question.id,
                          );
                          const wrongValue =
                            reviewMode &&
                            userValue &&
                            userValue !== currentValue
                              ? userValue
                              : "";
                          const learningState = learningReviewState(
                            question.id,
                            String(currentValue || ""),
                          );
                          const locked = isQuestionLocked(
                            question.id,
                            String(currentValue || ""),
                          );
                          return (
                            <div
                              id={`reading-question-${question.id}`}
                              key={question.id}
                              className="space-y-2 border-b border-[#e5e5e2] py-5 first:pt-2 last:border-b-0"
                            >
                              <div className="flex items-baseline gap-2.5 font-sans reading-text text-[#37352f]">
                                <ReadingQuestionNumber
                                  number={question.order}
                                />
                                <p className="reading-primary-copy min-w-0 !leading-6">
                                  {question.prompt}
                                </p>
                              </div>
                              <div
                                className="mt-1 space-y-1"
                                role="radiogroup"
                                aria-label={`Soru ${question.order}`}
                              >
                                {(
                                  multipleChoiceDisplayOptionsByQuestion.get(
                                    question.id,
                                  ) || []
                                ).map((option) => {
                                  const glossaryLabel =
                                    glossaryOptionParagraphLabel(
                                      multipleChoiceGroup.type,
                                      multipleChoiceGroup.order,
                                      question.order,
                                      option.value,
                                    );
                                  return (
                                    <PracticeChoiceOption
                                      key={`${question.id}-${option.value}`}
                                      letter={option.displayLetter}
                                      text={applyDictionaryHighlights(
                                        applyManualHighlights(
                                          [option.label],
                                          glossaryLabel,
                                        ),
                                        [
                                          ...(glossaryByParagraph[
                                            glossaryLabel
                                          ] || []),
                                          ...(glossaryByParagraph._genel || []),
                                        ],
                                        glossaryLabel,
                                        option.label,
                                      )}
                                      accessibleText={option.label}
                                      selected={currentValue === option.value}
                                      reviewState={
                                        reviewMode &&
                                        currentValue === option.value
                                          ? "correct"
                                          : reviewMode &&
                                              wrongValue === option.value
                                            ? "incorrect"
                                            : currentValue === option.value
                                              ? learningState
                                              : "neutral"
                                      }
                                      disabled={reviewMode || locked}
                                      onSelect={() => {
                                        if (!reviewMode && !locked)
                                          setAnswer(question.id, option.value);
                                      }}
                                      onTextSelection={(selection) =>
                                        setSelectionMenu({
                                          ...selection,
                                          paragraphLabel: glossaryLabel,
                                        })
                                      }
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {trueFalseGroup &&
                  (!sectionLearningTabsVisible ||
                    sectionMatchingPanelView === "options") ? (
                    <section className="border-b border-[#e5e5e2] pb-8">
                      <div
                        className={
                          sectionNumber === 4
                            ? "reading-question-instruction"
                            : "mb-4"
                        }
                      >
                        <div className="flex items-start gap-2">
                          {trueFalseInstruction ? (
                            <div>
                              <p className="reading-question-instruction-heading">
                                Sorular 25–29
                              </p>
                              <p className="reading-question-instruction-copy">
                                Sorulardaki cümleler metne göre{" "}
                                <strong>DOĞRU</strong>, <strong>YANLIŞ</strong>{" "}
                                ya da <strong>VERİLMEMİŞ</strong> olabilir.
                                İlgili seçeneği işaretleyiniz.
                              </p>
                            </div>
                          ) : (
                            <h3
                              className="font-semibold text-[#37352f]"
                              style={{ fontSize: headingFontSize }}
                            >
                              Doğru / yanlış
                            </h3>
                          )}
                          {guideMode ? (
                            <button
                              type="button"
                              onClick={() =>
                                toggleGuideQuestions(trueFalseGroup.questions)
                              }
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                trueFalseGroup.questions.every((question) =>
                                  activeGuideQuestionIds.includes(question.id),
                                )
                                  ? "bg-[#eef4f6] text-[#48616f]"
                                  : "bg-[#f5f7f9] text-[#9aa7b3]"
                              }`}
                              title="İlgili cümleleri göster"
                            >
                              <CircleHelp className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                        {sectionNumber === 4 ? (
                          <div className="reading-question-definition-list">
                            <span className="reading-question-definition-term">
                              DOĞRU
                            </span>
                            <span className="reading-question-definition-copy">
                              cümle, metindeki bilgilerle uygun ve/veya
                              tutarlıysa
                            </span>
                            <span className="reading-question-definition-term">
                              YANLIŞ
                            </span>
                            <span className="reading-question-definition-copy">
                              cümle, metindeki bilgilerle tutarsız ve/veya
                              çelişkiliyse
                            </span>
                            <span className="reading-question-definition-term">
                              VERİLMEMİŞ
                            </span>
                            <span className="reading-question-definition-copy">
                              cümle, metindeki bilgilerde yer almıyor ve/veya
                              belirtilmemişse
                            </span>
                          </div>
                        ) : null}
                      </div>
                      {sectionNumber === 4 ? (
                        <div className="mb-8">
                          {trueFalseGroup.questions.map((question) => {
                            const currentValue = displayAnswers[question.id];
                            const userValue = userAnswerOf(
                              reviewResult,
                              question.id,
                            );
                            const wrongValue =
                              reviewMode &&
                              userValue &&
                              userValue !== currentValue
                                ? userValue
                                : "";
                            const learningState = learningReviewState(
                              question.id,
                              String(currentValue || ""),
                            );
                            const locked = isQuestionLocked(
                              question.id,
                              String(currentValue || ""),
                            );
                            return (
                              <div
                                id={`reading-question-${question.id}`}
                                key={question.id}
                                className="space-y-2 border-b border-[#e5e5e2] py-5 first:pt-2 last:border-b-0"
                              >
                                <div className="flex items-baseline gap-2.5 font-sans reading-text text-[#37352f]">
                                  <ReadingQuestionNumber
                                    number={question.order}
                                  />
                                  <p className="reading-primary-copy min-w-0 !leading-6">
                                    {question.prompt}
                                  </p>
                                </div>
                                <div
                                  className="mt-1 space-y-1"
                                  role="radiogroup"
                                  aria-label={`Soru ${question.order}`}
                                >
                                  {parseOptions(question.options).map(
                                    (option, optionIndex) => {
                                      const optionLetter = String.fromCharCode(
                                        65 + optionIndex,
                                      );
                                      const glossaryLabel =
                                        glossaryOptionParagraphLabel(
                                          trueFalseGroup.type,
                                          trueFalseGroup.order,
                                          question.order,
                                          optionLetter,
                                        );
                                      return (
                                        <PracticeChoiceOption
                                          key={`${question.id}-${option.value}`}
                                          letter={optionLetter}
                                          text={applyDictionaryHighlights(
                                            applyManualHighlights(
                                              [option.label],
                                              glossaryLabel,
                                            ),
                                            [
                                              ...(glossaryByParagraph[
                                                glossaryLabel
                                              ] || []),
                                              ...(glossaryByParagraph._genel ||
                                                []),
                                            ],
                                            glossaryLabel,
                                            option.label,
                                          )}
                                          accessibleText={option.label}
                                          selected={
                                            currentValue === option.value
                                          }
                                          reviewState={
                                            reviewMode &&
                                            currentValue === option.value
                                              ? "correct"
                                              : reviewMode &&
                                                  wrongValue === option.value
                                                ? "incorrect"
                                                : currentValue === option.value
                                                  ? learningState
                                                  : "neutral"
                                          }
                                          disabled={reviewMode || locked}
                                          onSelect={() => {
                                            if (!reviewMode && !locked)
                                              setAnswer(
                                                question.id,
                                                option.value,
                                              );
                                          }}
                                          onTextSelection={(selection) =>
                                            setSelectionMenu({
                                              ...selection,
                                              paragraphLabel: glossaryLabel,
                                            })
                                          }
                                        />
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-[24px] border border-[#e5e5e2]">
                          <div
                            className="grid grid-cols-[minmax(0,1fr)_56px_56px] border-b border-[#e5e5e2] bg-[#f7fafb] text-center font-semibold text-[#7b8793]"
                            style={{ fontSize: bodyFontSize }}
                          >
                            <div className="px-4 py-4 text-left">İfade</div>
                            {parseOptions(
                              trueFalseGroup.questions[0]?.options || [],
                            ).map((option) => (
                              <div key={option.value} className="px-2 py-4">
                                {option.label}
                              </div>
                            ))}
                          </div>
                          {trueFalseGroup.questions.map((question) => {
                            const currentValue = displayAnswers[question.id];
                            const userValue = userAnswerOf(
                              reviewResult,
                              question.id,
                            );
                            const wrongValue =
                              reviewMode &&
                              userValue &&
                              userValue !== currentValue
                                ? userValue
                                : "";
                            return (
                              <div
                                key={question.id}
                                className="grid grid-cols-[minmax(0,1fr)_56px_56px] items-stretch border-b border-[#e5e5e2] bg-white last:border-b-0"
                              >
                                <div
                                  className="px-4 py-4 leading-7 text-[#2b3948]"
                                  style={{ fontSize: bodyFontSize }}
                                >
                                  <span className="mr-2 font-semibold text-[#264653]">
                                    {question.order}.
                                  </span>
                                  {question.prompt}
                                  {wrongValue ? (
                                    <div className="mt-2 text-[#dc2626]">
                                      Senin işaretlediğin: {wrongValue}
                                    </div>
                                  ) : null}
                                </div>
                                {parseOptions(question.options).map(
                                  (option) => (
                                    <label
                                      key={`${question.id}-${option.value}`}
                                      className={`flex items-center justify-center border-l border-[#e5e5e2] ${reviewMode ? "cursor-default" : "cursor-pointer"}`}
                                    >
                                      <input
                                        type="radio"
                                        name={question.id}
                                        disabled={reviewMode}
                                        className="h-4 w-4 accent-[#2f7d4c]"
                                        checked={currentValue === option.value}
                                        onChange={() =>
                                          setAnswer(question.id, option.value)
                                        }
                                      />
                                    </label>
                                  ),
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  ) : null}
                  {paragraphReferenceGroup &&
                  (!sectionLearningTabsVisible ||
                    sectionMatchingPanelView === "options") ? (
                    <section className="border-b border-[#e5e5e2] pb-8">
                      <div
                        className={
                          sectionNumber === 5
                            ? "reading-question-instruction"
                            : "mb-4"
                        }
                      >
                        <div className="flex items-start gap-2">
                          {paragraphReferenceInstruction ? (
                            <div>
                              <p className="reading-question-instruction-heading">
                                Sorular 33–35
                              </p>
                              <p className="reading-question-instruction-copy">
                                Aşağıdaki cümleleri okuyunuz ve ait oldukları
                                paragrafı <strong>(A–E)</strong> seçiniz.
                                Seçilmemesi gereken iki paragraf bulunmaktadır.
                              </p>
                            </div>
                          ) : (
                            <h3
                              className="font-semibold text-[#37352f]"
                              style={{ fontSize: headingFontSize }}
                            >
                              Hangi paragrafta geçiyor?
                            </h3>
                          )}
                          {guideMode ? (
                            <button
                              type="button"
                              onClick={() =>
                                toggleGuideQuestions(
                                  paragraphReferenceGroup.questions,
                                )
                              }
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                                paragraphReferenceGroup.questions.every(
                                  (question) =>
                                    activeGuideQuestionIds.includes(
                                      question.id,
                                    ),
                                )
                                  ? "bg-[#eef4f6] text-[#48616f]"
                                  : "bg-[#f5f7f9] text-[#9aa7b3]"
                              }`}
                              title="İlgili cümleleri göster"
                            >
                              <CircleHelp className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mb-8">
                        {paragraphReferenceGroup.questions.map((question) => {
                          const currentValue = String(
                            displayAnswers[question.id] || "",
                          );
                          const questionPromptLabel =
                            glossaryQuestionPromptLabel(
                              paragraphReferenceGroup.order,
                              question.order,
                            );
                          const questionGlossaryEntries = [
                            ...(glossaryByParagraph[questionPromptLabel] || []),
                            ...Array.from(
                              new Set(question.evidenceParagraphs || []),
                            ).flatMap(
                              (paragraphLabel) =>
                                glossaryByParagraph[paragraphLabel] || [],
                            ),
                            ...(glossaryByParagraph._genel || []),
                          ];
                          const questionPromptNodes =
                            applyDictionaryHighlights(
                              applyManualHighlights(
                                [question.prompt],
                                questionPromptLabel,
                              ),
                              questionGlossaryEntries,
                              questionPromptLabel,
                              question.prompt,
                            );
                          const learningState = learningReviewState(
                            question.id,
                            currentValue,
                          );
                          const locked = isQuestionLocked(
                            question.id,
                            currentValue,
                          );
                          return (
                            <div
                              id={`reading-question-${question.id}`}
                              key={question.id}
                              className="space-y-2 border-b border-[#e5e5e2] py-5 first:pt-2 last:border-b-0"
                            >
                              <div className="flex min-w-0 items-start gap-3">
                                <ReadingQuestionNumber
                                  number={question.order}
                                />
                                <Select
                                  value={currentValue || "__none__"}
                                  disabled={reviewMode || locked}
                                  onValueChange={(value) =>
                                    setAnswer(
                                      question.id,
                                      value === "__none__" ? undefined : value,
                                    )
                                  }
                                >
                                  <SelectTrigger
                                    aria-label={`Soru ${question.order} için paragraf`}
                                    className={`reading-select-trigger reading-part5-compact-select !h-9 !min-h-9 w-[72px] shrink-0 ${
                                      currentValue
                                        ? "reading-select-trigger-selected"
                                        : ""
                                    } ${
                                      learningState === "correct"
                                        ? "!border-[#6f9b72] !bg-[#f4faf4] !text-[#2f6f3d]"
                                        : learningState === "incorrect"
                                          ? "!border-[#c87570] !bg-[#fff6f5] !text-[#a33737]"
                                          : ""
                                    }`}
                                  >
                                    <SelectValue placeholder="Seç">
                                      <span className="font-semibold">
                                        {currentValue || "Seç"}
                                      </span>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="reading-select-content reading-part5-letter-menu z-50 max-h-[60vh] w-[72px] min-w-[72px] max-w-[72px] overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white shadow-sm">
                                    <SelectItem value="__none__">
                                      Seç
                                    </SelectItem>
                                    {parseOptions(question.options).map(
                                      (option) => (
                                        <SelectItem
                                          key={`${question.id}-${option.value}`}
                                          value={option.value}
                                        >
                                          <span className="font-semibold">
                                            {option.label}
                                          </span>
                                        </SelectItem>
                                      ),
                                    )}
                                  </SelectContent>
                                </Select>
                                <div
                                  className="reading-text reading-primary-copy min-w-0 select-text !leading-6 text-[#37352f]"
                                  data-paragraph-label={questionPromptLabel}
                                  onMouseUp={(event) => {
                                    const selection = window.getSelection();
                                    const selectedText =
                                      selection?.toString().trim() || "";
                                    if (!selectedText) {
                                      setSelectionMenu(null);
                                      return;
                                    }
                                    const range = selection?.getRangeAt(0);
                                    if (
                                      !range ||
                                      !event.currentTarget.contains(
                                        range.startContainer,
                                      ) ||
                                      !event.currentTarget.contains(
                                        range.endContainer,
                                      )
                                    ) {
                                      return;
                                    }
                                    const selectionEndRect =
                                      getReadingSelectionEndRect(range);
                                    const boundaryRect =
                                      event.currentTarget.getBoundingClientRect();
                                    setSelectionMenu({
                                      x: selectionEndRect.right,
                                      y: selectionEndRect.bottom,
                                      top: selectionEndRect.top,
                                      boundaryLeft: boundaryRect.left,
                                      boundaryRight: boundaryRect.right,
                                      text: selectedText,
                                      paragraphLabel: questionPromptLabel,
                                    });
                                  }}
                                >
                                  {questionPromptNodes}
                                </div>
                              </div>
                              {reviewMode &&
                              userAnswerOf(reviewResult, question.id) &&
                              userAnswerOf(reviewResult, question.id) !==
                                String(displayAnswers[question.id] || "") ? (
                                <div
                                  className="ml-[7.75rem] text-[#a33737]"
                                  style={{ fontSize: bodyFontSize }}
                                >
                                  Senin seçtiğin:{" "}
                                  {userAnswerOf(reviewResult, question.id)}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}

                  {vocabularyGroup
                    ? Object.entries(groupedVocabularyQuestions).map(
                        ([key, item]) => {
                          const scope = `kelime-${key}`;
                          const pool = vocabularyPools[key] || [];
                          return (
                            <section
                              key={scope}
                              className="border-b border-[#e5e5e2] pb-8"
                            >
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                  <h3
                                    className="font-semibold text-[#37352f]"
                                    style={{ fontSize: headingFontSize }}
                                  >
                                    {item.title}
                                  </h3>
                                </div>
                              </div>
                              {!reviewMode ? (
                                <div className="flex flex-wrap gap-2">
                                  {pool.map((word) => {
                                    const used = item.questions.some(
                                      (question) =>
                                        answers[question.id] === word,
                                    );
                                    return (
                                      <button
                                        key={`${scope}-${word}`}
                                        type="button"
                                        draggable={!used}
                                        disabled={used}
                                        onDragStart={() =>
                                          setDragItem({
                                            type: "word",
                                            scope,
                                            value: word,
                                          })
                                        }
                                        className={`inline-flex items-center rounded-[4px] border px-3 font-medium ${used ? "cursor-not-allowed border-[#e4ebf0] bg-[#eef3f5] text-[#9aa7b3]" : "border-[#d9e0e5] bg-white text-[#37352f]"}`}
                                        style={{
                                          width: "fit-content",
                                          minHeight: "1.95em",
                                          fontSize: bodyFontSize,
                                        }}
                                      >
                                        {word}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : null}
                              <div className="mt-4 space-y-0 border border-[#e5e5e2]">
                                {item.questions.map((question) => (
                                  <div
                                    key={question.id}
                                    className="reading-matching-row grid grid-cols-[minmax(180px,220px)_1fr] items-center border-b border-[#e5e5e2] px-4 py-3 last:border-b-0"
                                    onDragOver={(event) =>
                                      event.preventDefault()
                                    }
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      if (
                                        !dragItem ||
                                        dragItem.type !== "word" ||
                                        dragItem.scope !== scope
                                      )
                                        return;
                                      assignWord(
                                        item.questions,
                                        question.id,
                                        dragItem.value,
                                      );
                                      setDragItem(null);
                                    }}
                                  >
                                    <div
                                      className="flex items-center gap-2 font-medium text-[#37352f]"
                                      style={{ fontSize: bodyFontSize }}
                                    >
                                      <span>{question.prompt}</span>
                                      {practiceToolsEnabled && guideMode ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenHintId((current) =>
                                              current === question.id
                                                ? null
                                                : question.id,
                                            );
                                          }}
                                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef4f6] text-[#48616f]"
                                          title="İpucu"
                                        >
                                          <CircleHelp className="h-4 w-4" />
                                        </button>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-col items-start gap-2">
                                      <BlankSlot
                                        number={question.order}
                                        value={String(
                                          displayAnswers[question.id] || "",
                                        )}
                                        readOnly={reviewMode}
                                        onClear={() => clearAnswer(question.id)}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          if (
                                            !dragItem ||
                                            dragItem.type !== "word" ||
                                            dragItem.scope !== scope
                                          )
                                            return;
                                          assignWord(
                                            item.questions,
                                            question.id,
                                            dragItem.value,
                                          );
                                          setDragItem(null);
                                        }}
                                      />
                                      {reviewMode &&
                                      userAnswerOf(reviewResult, question.id) &&
                                      userAnswerOf(
                                        reviewResult,
                                        question.id,
                                      ) !==
                                        String(
                                          displayAnswers[question.id] || "",
                                        ) ? (
                                        <div
                                          className="text-[#dc2626]"
                                          style={{ fontSize: bodyFontSize }}
                                        >
                                          Senin yerleştirdiğin:{" "}
                                          {userAnswerOf(
                                            reviewResult,
                                            question.id,
                                          )}
                                        </div>
                                      ) : null}
                                      {practiceToolsEnabled &&
                                      guideMode &&
                                      openHintId === question.id ? (
                                        <div
                                          className="leading-6 text-[#5f5e5a]"
                                          style={{ fontSize: bodyFontSize }}
                                        >
                                          {String(metaOf(question).hint || "")}
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </section>
                          );
                        },
                      )
                    : null}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {selectionMenu ? (
        <div
          className="fixed z-[80] flex w-[148px] max-w-[calc(100vw-1rem)] flex-col items-stretch gap-0.5 rounded-md border border-[#dededb] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
          style={selectionMenuStyle}
          role="toolbar"
          aria-label="Metin araçları"
          data-exam-selection-ignore="true"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={addManualHighlight}
            className="flex h-8 w-full items-center justify-start gap-1.5 rounded px-2.5 text-left text-sm font-medium text-[#37352f] hover:bg-[#f5f5f3]"
          >
            <Highlighter className="h-4 w-4 text-[#9a7914]" />
            Vurgula
          </button>
          <button
            type="button"
            onClick={clearManualHighlight}
            disabled={!(manualHighlights[selectionMenu.paragraphLabel] || []).some(
              (item) =>
                item.text
                  .toLocaleLowerCase("tr")
                  .includes(selectionMenu.text.toLocaleLowerCase("tr")) ||
                selectionMenu.text
                  .toLocaleLowerCase("tr")
                  .includes(item.text.toLocaleLowerCase("tr")),
            )}
            className="flex h-8 w-full items-center justify-start gap-1.5 rounded px-2.5 text-left text-sm font-medium text-[#37352f] hover:bg-[#f5f5f3] disabled:opacity-35"
          >
            <Eraser className="h-4 w-4 text-[#6f6e69]" />
            Temizle
          </button>
          <button
            type="button"
            onClick={openSelectionNoteEditor}
            className="flex h-8 w-full items-center justify-start gap-1.5 rounded px-2.5 text-left text-sm font-medium text-[#37352f] hover:bg-[#f5f5f3]"
          >
            <Pencil className="h-4 w-4 text-[#657789]" />
            Not al
          </button>
        </div>
      ) : null}

      {selectionNoteEditor ? (
        <div
          ref={noteEditorRef}
          role="dialog"
          aria-label="Metin notu"
          data-exam-selection-ignore="true"
          className="fixed z-[90] flex max-h-[calc(100dvh-1.5rem)] w-[min(21rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-md border border-[#dededb] bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.16)]"
          style={{
            left: noteEditorPosition?.left ?? 12,
            top: noteEditorPosition?.top ?? 12,
            visibility: noteEditorPosition ? "visible" : "hidden",
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#37352f]">Not al</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#787774]">
                “{selectionNoteEditor.text}”
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectionNoteEditor(null)}
              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#787774] hover:bg-[#f3f3f1] hover:text-[#37352f]"
              aria-label="Notu kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto">
            <Textarea
              value={selectionNoteEditor.note}
              onChange={(event) =>
                setSelectionNoteEditor((current) =>
                  current ? { ...current, note: event.target.value } : current,
                )
              }
              placeholder="Notunuzu yazın"
              className="min-h-[88px] resize-none border-[#d9d9d6] bg-white text-sm leading-6 text-[#37352f] shadow-none placeholder:text-[#9b9a97] focus-visible:ring-1 focus-visible:ring-[#9b9a97]"
              autoFocus
            />
          </div>
          <div className="mt-3 flex shrink-0 justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectionNoteEditor(null)}
              className="h-8 px-3 text-xs text-[#5f5e5a] hover:bg-[#f3f3f1]"
            >
              İptal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveSelectionNote}
              disabled={!selectionNoteEditor.note.trim()}
              className="h-8 bg-[#37352f] px-3 text-xs text-white shadow-none hover:bg-[#2f2f2c] disabled:bg-[#e3e3e0] disabled:text-[#9b9a97]"
            >
              Kaydet
            </Button>
          </div>
        </div>
      ) : null}

      {practiceToolsEnabled && dictionaryMode && dictionaryPanelVisible ? (
        <aside
          className="fixed bottom-4 left-4 right-4 z-50 max-h-[42dvh] overflow-y-auto rounded-[4px] border border-[#d4d4cf] bg-white p-4 opacity-100 shadow-[0_10px_28px_rgba(15,23,42,0.12)] sm:left-auto sm:w-[360px]"
        >
          <div className="sticky top-0 flex items-center justify-between gap-3 bg-white pb-3 text-[#242424]">
            <div className="min-w-0 truncate text-xl font-semibold leading-7">
              {selectedDictionary?.term || "Bir kelime seçin"}
            </div>
            <button
              type="button"
              onClick={() => {
                setDictionaryPanelVisible(false);
                setSelectedDictionary(null);
              }}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6b7783] hover:bg-[#eef3f5] hover:text-[#37352f]"
              aria-label="Sözlük kartını kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedDictionary ? (
            <div className="border-t border-[#e5e5e2] pt-4 text-[#242424]">
              <p className="text-sm leading-6">
                {selectedDictionary.baseForm ? (
                  <>
                    <strong>Temel biçim:</strong> {selectedDictionary.baseForm}
                    <br />
                  </>
                ) : null}
                {selectedDictionary.baseMeaning ? (
                  <>
                    <strong>Anlamı:</strong>{" "}
                    {selectedDictionary.baseMeaning}{" "}
                  </>
                ) : null}
              </p>
            </div>
          ) : null}

          {!selectedDictionary ? (
            <p className="text-sm leading-5 text-[#667480]">
              Metindeki altı çizilen bir kelimeye tıkladığınızda anlamı burada
              görünür.
            </p>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
