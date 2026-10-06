import { useEffect, useMemo, useState } from "react";
import {
  ALargeSmall,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleSlash2,
  LayoutGrid,
  List,
  X,
  XCircle,
} from "lucide-react";
import ReadingPart1 from "@/components/reading-test/ui/ReadingPart1";
import ReadingPart2 from "@/components/reading-test/ui/ReadingPart2";
import ReadingPart3 from "@/components/reading-test/ui/ReadingPart3";
import ReadingPart4 from "@/components/reading-test/ui/ReadingPart4";
import ReadingPart5 from "@/components/reading-test/ui/ReadingPart5";
import { getReadingTypographyPreset } from "@/components/reading-test/reading-typography";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReadingNotesProvider } from "@/contexts/ReadingNotesContext";
import {
  ReadingReviewProvider,
  type ReadingReviewQuestion,
} from "./ReadingReviewContext";
import {
  isBlankReviewAnswer,
  type MockReviewQuestion,
  type MockReviewSection,
  type MockReviewV1,
} from "./evidence-review-utils";

interface ReadingTextEvidenceViewProps {
  review: MockReviewV1;
  onClose: () => void;
}

interface ReadingReviewPart {
  number: number;
  title: string;
  description: string;
  sections: MockReviewSection[];
  questions: ReadingReviewQuestion[];
}

const inferPartNumber = (section: MockReviewSection, index: number) => {
  if (Number.isInteger(section.partNumber) && Number(section.partNumber) > 0) {
    return Number(section.partNumber);
  }

  const firstQuestion = Math.min(
    ...(section.questions || []).map((question) => question.number),
  );
  if (Number.isFinite(firstQuestion)) {
    if (firstQuestion <= 6) return 1;
    if (firstQuestion <= 14) return 2;
    if (firstQuestion <= 20) return 3;
    if (firstQuestion <= 29) return 4;
    return 5;
  }

  return index + 1;
};

const reviewInstruction = (questions: ReadingReviewQuestion[]) => {
  const questionNumbers = questions
    .map((question) => Number(question.number))
    .filter((number) => Number.isFinite(number) && number > 0);

  if (!questionNumbers.length) {
    return "Bu bölümdeki cevaplarınızı inceleyin.";
  }

  const firstQuestion = Math.min(...questionNumbers);
  const lastQuestion = Math.max(...questionNumbers);

  if (firstQuestion === lastQuestion) {
    return `${firstQuestion}. soruya verdiğiniz cevabı inceleyin.`;
  }

  return `${firstQuestion}–${lastQuestion}. sorulara verdiğiniz cevapları inceleyin.`;
};

const groupReviewParts = (review: MockReviewV1): ReadingReviewPart[] => {
  const parts = new Map<number, ReadingReviewPart>();

  (review.sections || []).forEach((section, index) => {
    const number = inferPartNumber(section, index);
    const questions = (section.questions || []).map((question) => ({
      ...question,
      partNumber: number,
      sourceText: section.sourceText,
    }));
    const existing = parts.get(number);

    if (existing) {
      existing.sections.push(section);
      existing.questions.push(...questions);
      return;
    }

    parts.set(number, {
      number,
      title: section.partTitle || `${number}. Okuma Metni`,
      description: "",
      sections: [section],
      questions,
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

const toTestData = (review: MockReviewV1, parts: ReadingReviewPart[]) => ({
  id: review.testId,
  title: review.testTitle,
  type: "READING",
  parts: parts.map((part) => ({
    id: `review-part-${part.number}`,
    number: part.number,
    title: part.title,
    description: part.description,
    sections: part.sections.map((section) => ({
      id: section.sectionId,
      title: section.title,
      content: section.sourceText,
      hasBullets: section.hasBullets,
      imageUrl: section.imageUrl,
      questions: (section.questions || []).map((question) => ({
        id: question.questionId,
        number: question.number,
        text: question.text,
        content:
          question.questionContent ||
          (part.number === 2 ? section.sourceText : ""),
        imageUrl: question.questionImageUrl,
        type: question.questionType || "",
        answers: (question.answers || []).map((answer, answerIndex) => ({
          id: `${question.questionId}-answer-${answerIndex}`,
          questionId: question.questionId,
          variantText: answer.variantText,
          displayText: answer.text,
          answer: answer.text,
          correct: answer.correct,
        })),
      })),
    })),
  })),
});

const correctAnswerFor = (question: MockReviewQuestion) =>
  question.answers.find((answer) => answer.correct)?.variantText || "";

const questionStatus = (question: MockReviewQuestion) => {
  if (question.isCorrect) {
    return {
      label: "Doğru",
      icon: CheckCircle2,
      className: "border-[#438553] bg-[#438553] text-white",
    };
  }
  if (isBlankReviewAnswer(question.userAnswer)) {
    return {
      label: "Boş",
      icon: CircleSlash2,
      className: "border-[#aaa9a2] bg-white text-[#77766f]",
    };
  }
  return {
    label: "Yanlış",
    icon: XCircle,
    className: "border-[#c74646] bg-[#c74646] text-white",
  };
};

export default function ReadingTextEvidenceView({
  review,
  onClose,
}: ReadingTextEvidenceViewProps) {
  const parts = useMemo(() => groupReviewParts(review), [review]);
  const testData = useMemo(() => toTestData(review, parts), [parts, review]);
  const correctAnswers = useMemo(
    () =>
      Object.fromEntries(
        parts.flatMap((part) =>
          part.questions.map((question) => [
            question.questionId,
            correctAnswerFor(question),
          ]),
        ),
      ),
    [parts],
  );
  const [currentPartNumber, setCurrentPartNumber] = useState(
    parts[0]?.number || 1,
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState(
    parts[0]?.questions[0]?.questionId || "",
  );
  const [openEvidenceKey, setOpenEvidenceKey] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [showAllQuestionNumbers, setShowAllQuestionNumbers] = useState(false);
  const [fontScale, setFontScale] = useState(1);

  const currentPart =
    parts.find((part) => part.number === currentPartNumber) || parts[0];
  const currentPartIndex = Math.max(
    0,
    parts.findIndex((part) => part.number === currentPart?.number),
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
    if (
      currentPart &&
      !currentPart.questions.some(
        (question) => question.questionId === selectedQuestionId,
      )
    ) {
      setSelectedQuestionId(currentPart.questions[0]?.questionId || "");
      setOpenEvidenceKey("");
    }
  }, [currentPart, selectedQuestionId]);

  if (!currentPart) return null;

  const selectPart = (part: ReadingReviewPart) => {
    setCurrentPartNumber(part.number);
    setShowDescription(false);
    setSelectedQuestionId(part.questions[0]?.questionId || "");
    setOpenEvidenceKey("");
  };

  const selectQuestion = (questionId: string) => {
    setSelectedQuestionId(questionId);
    setOpenEvidenceKey("");
  };

  const toggleEvidence = (questionId: string, evidenceKey: string) => {
    setSelectedQuestionId(questionId);
    setOpenEvidenceKey((current) =>
      current === evidenceKey ? "" : evidenceKey,
    );
  };

  const selectPartByOffset = (offset: number) => {
    const part = parts[currentPartIndex + offset];
    if (part) selectPart(part);
  };

  const typographyPreset = getReadingTypographyPreset(fontScale);
  const selectedFontScale = typographyPreset.menuValue;
  const renderQuestionButton = (
    part: ReadingReviewPart,
    question: ReadingReviewQuestion,
    compact = false,
  ) => {
    const status = questionStatus(question);
    const Icon = status.icon;
    const selected =
      part.number === currentPart.number &&
      question.questionId === selectedQuestionId;

    return (
      <button
        key={question.questionId}
        type="button"
        onClick={() => {
          if (part.number !== currentPart.number) setShowDescription(false);
          setCurrentPartNumber(part.number);
          selectQuestion(question.questionId);
        }}
        className={`flex shrink-0 items-center justify-center rounded-full border font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] ${
          compact
            ? "h-7 w-7 min-w-7 text-[11px]"
            : "h-8 w-8 min-w-8 text-xs"
        } ${
          selected
            ? "border-[#6f6d67] bg-[#f1f1ef] text-[#2f2e2a] shadow-[inset_0_0_0_1px_#6f6d67]"
            : status.className
        }`}
        aria-label={`Soru ${question.number}: ${status.label}`}
        aria-current={selected ? "step" : undefined}
        title={`Soru ${question.number}: ${status.label}`}
      >
        <span aria-hidden="true">{question.number}</span>
        <Icon className="sr-only" aria-hidden="true" />
      </button>
    );
  };

  const renderPart = () => {
    const commonProps = {
      testData,
      answers: correctAnswers,
      onAnswerChange: () => undefined,
      partNumber: currentPart.number,
    };

    if (currentPart.number === 1) {
      return (
        <ReadingPart1
          {...commonProps}
          fontScale={typographyPreset.scale}
        />
      );
    }
    if (currentPart.number === 2) return <ReadingPart2 {...commonProps} />;
    if (currentPart.number === 3) return <ReadingPart3 {...commonProps} />;
    if (currentPart.number === 4) return <ReadingPart4 {...commonProps} />;
    return <ReadingPart5 {...commonProps} />;
  };

  return (
    <ReadingNotesProvider>
      <ReadingReviewProvider
        activeQuestionId={selectedQuestionId}
        openEvidenceKey={openEvidenceKey}
        questions={currentPart.questions}
        selectQuestion={selectQuestion}
        toggleEvidence={toggleEvidence}
      >
        <section
          className="reading-exam-page fixed inset-0 z-[120] flex h-[100dvh] flex-col overflow-hidden bg-white font-sans text-[#242424]"
          style={typographyPreset.style}
          aria-label="Sınav üzerinde cevap incelemesi"
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
                    Okuma
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
                        value={selectedFontScale}
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

          <section className="mx-2 mt-2 shrink-0 border-b border-[#e5e5e2] bg-white px-3 py-3.5 sm:mx-4 sm:px-4">
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
                className="flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-[#6f6d67] hover:bg-[#f1f1ef] hover:text-[#37352f]"
                aria-expanded={showDescription}
                aria-label={
                  showDescription ? "Anlatımı gizle" : "Anlatımı göster"
                }
                title={
                  showDescription ? "Anlatımı gizle" : "Anlatımı göster"
                }
              >
                Açıklama
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
          </section>

          <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-white lg:overflow-hidden">
            <div
              className="reading-review-test h-full min-h-0 w-full min-w-0 max-w-full overflow-x-hidden [&_.cursor-pointer]:cursor-default [&_.text-justify]:!text-left [&_.line-through]:!text-slate-800 [&_.line-through]:!no-underline [&_button:not(.reading-review-evidence):not(.reading-review-explanation-control)]:pointer-events-none [&_[role=combobox]]:pointer-events-none"
              style={typographyPreset.style}
            >
              {renderPart()}
            </div>
          </main>

          <footer className="z-50 shrink-0 border-t border-[#e5e5e2] bg-white">
            <div
              className={`mx-auto flex items-center gap-3 px-4 py-2 ${
                showAllQuestionNumbers ? "max-w-none" : "max-w-7xl"
              }`}
            >
              <button
                type="button"
                onClick={() => setShowAllQuestionNumbers((value) => !value)}
                aria-label={
                  showAllQuestionNumbers
                    ? "Bölüm görünümüne dön"
                    : "Tüm soruları göster"
                }
                aria-pressed={showAllQuestionNumbers}
                title={
                  showAllQuestionNumbers
                    ? "Bölüm görünümüne dön"
                    : "Tüm soruları göster"
                }
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] ${
                  showAllQuestionNumbers
                    ? "border-[#c9c9c4] bg-[#e9e9e6] text-[#2f2e2a]"
                    : "border-[#d8d8d4] bg-white text-[#5f5e5a] hover:bg-[#f7f7f5] hover:text-[#37352f]"
                }`}
              >
                {showAllQuestionNumbers ? (
                  <List className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <div className="h-6 w-px shrink-0 bg-[#e5e5e2]" />

              {showAllQuestionNumbers ? (
                <nav
                  className="flex min-w-0 flex-1 items-center overflow-x-auto"
                  aria-label="Tüm okuma sorularının sonuçları"
                >
                  {parts.map((part, groupIndex) => (
                    <div
                      key={part.number}
                      className={`flex shrink-0 items-center gap-1 ${
                        groupIndex > 0
                          ? "ml-1.5 border-l border-[#dededb] pl-1.5"
                          : ""
                      }`}
                    >
                      {part.questions.map((question) =>
                        renderQuestionButton(part, question, true),
                      )}
                    </div>
                  ))}
                </nav>
              ) : (
                <>
                  <nav
                    className="flex shrink-0 items-center gap-1"
                    aria-label="Okuma bölümleri"
                  >
                    {parts.map((part) => {
                      const active = part.number === currentPart.number;
                      return (
                        <button
                          key={part.number}
                          type="button"
                          onClick={() => selectPart(part)}
                          className={`h-8 rounded-md px-3 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-0 ${
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

                  <div className="flex min-w-0 flex-1 items-center">
                    <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                      {currentPart.questions.map((question) =>
                        renderQuestionButton(currentPart, question),
                      )}
                    </div>
                  </div>
                </>
              )}

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
      </ReadingReviewProvider>
    </ReadingNotesProvider>
  );
}
