import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
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
  flattenReviewQuestions,
  formatCorrectAnswers,
  formatReviewAnswer,
  isBlankReviewAnswer,
  type MockReviewV1,
  type ReviewQuestionView,
} from "./evidence-review-utils";

interface ReadingAnswerSummaryProps {
  review: MockReviewV1;
  onOpenExamReview: () => void;
  resultId?: string;
  title?: string;
  reviewButtonLabel?: string;
  tone?: "reading" | "listening";
  showOutcomeCounts?: boolean;
}

const ANSWERS_REVEALED_STORAGE_PREFIX =
  "turkishmock:result-answers-revealed:v1:";

const readAnswersRevealed = (storageKey: string) => {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
};

const storeAnswersRevealed = (storageKey: string) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // The warning can still work for the current page when storage is unavailable.
  }
};

export default function ReadingAnswerSummary({
  review,
  onOpenExamReview,
  resultId,
  title = "Cevaplar",
  reviewButtonLabel = "Kanıtlarla incele",
  tone = "reading",
  showOutcomeCounts = false,
}: ReadingAnswerSummaryProps) {
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [reviewWarningOpen, setReviewWarningOpen] = useState(false);
  const [revealedQuestionIds, setRevealedQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const answersRevealedStorageKey = `${ANSWERS_REVEALED_STORAGE_PREFIX}${tone}:${
    resultId || review.testId
  }`;
  const [answersHaveBeenRevealed, setAnswersHaveBeenRevealed] = useState(() =>
    readAnswersRevealed(answersRevealedStorageKey),
  );
  const questions = useMemo(
    () =>
      [...flattenReviewQuestions(review)].sort(
        (left, right) => left.number - right.number,
      ),
    [review],
  );
  const sectionGroups = useMemo(() => {
    const sections = review.sections || [];
    const sectionLookup = new Map<
      string,
      { groupKey: string; label: string }
    >();

    sections.forEach((section, index) => {
      const title = String(section.title || section.partTitle || "").trim();
      const label = section.partNumber
        ? `Bölüm ${section.partNumber}`
        : /^Bölüm\s+\d+/i.test(title)
          ? title
          : `Bölüm ${index + 1}`;
      const groupKey = section.partNumber
        ? `part-${section.partNumber}`
        : `label-${label.toLocaleLowerCase("tr-TR")}`;

      sectionLookup.set(section.sectionId, {
        groupKey,
        label,
      });
    });

    const groupedQuestions = new Map<
      string,
      {
        groupKey: string;
        label: string;
        questions: ReviewQuestionView[];
      }
    >();

    questions.forEach((question) => {
      const meta = sectionLookup.get(question.sectionId);
      const groupKey = meta?.groupKey || `section-${question.sectionId}`;
      const group = groupedQuestions.get(groupKey);

      if (group) {
        group.questions.push(question);
        return;
      }

      groupedQuestions.set(groupKey, {
        groupKey,
        label: meta?.label || question.sectionTitle || "Bölüm",
        questions: [question],
      });
    });

    return Array.from(groupedQuestions.values());
  }, [questions, review.sections]);
  const outcomeCounts = useMemo(() => {
    const blank = questions.filter((question) =>
      isBlankReviewAnswer(question.userAnswer),
    ).length;
    const correct = questions.filter(
      (question) =>
        !isBlankReviewAnswer(question.userAnswer) && question.isCorrect,
    ).length;
    return {
      correct,
      wrong: questions.length - correct - blank,
      blank,
    };
  }, [questions]);
  const everyCorrectAnswerIsVisible =
    questions.length > 0 &&
    questions.every((question) =>
      revealedQuestionIds.has(question.questionId),
    );

  useEffect(() => {
    setAnswersHaveBeenRevealed(
      readAnswersRevealed(answersRevealedStorageKey),
    );
  }, [answersRevealedStorageKey]);

  useEffect(() => {
    if (!showCorrectAnswers && !everyCorrectAnswerIsVisible) return;

    setAnswersHaveBeenRevealed(true);
    storeAnswersRevealed(answersRevealedStorageKey);
  }, [
    answersRevealedStorageKey,
    everyCorrectAnswerIsVisible,
    showCorrectAnswers,
  ]);

  const toggleAllCorrectAnswers = () => {
    if (showCorrectAnswers) {
      setShowCorrectAnswers(false);
      setRevealedQuestionIds(new Set());
      return;
    }

    setShowCorrectAnswers(true);
  };

  const revealCorrectAnswer = (questionId: string) => {
    setRevealedQuestionIds((current) => {
      if (current.has(questionId)) return current;
      const next = new Set(current);
      next.add(questionId);
      return next;
    });
  };

  const openExamReview = () => {
    setAnswersHaveBeenRevealed(true);
    storeAnswersRevealed(answersRevealedStorageKey);
    setReviewWarningOpen(false);
    onOpenExamReview();
  };

  const requestExamReview = () => {
    if (
      answersHaveBeenRevealed ||
      showCorrectAnswers ||
      everyCorrectAnswerIsVisible
    ) {
      openExamReview();
      return;
    }

    setReviewWarningOpen(true);
  };

  return (
    <>
      <section
        aria-labelledby="reading-answer-summary-title"
        data-reading-answer-card
        className="space-y-4"
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2
              id="reading-answer-summary-title"
              className="text-[18px] font-semibold leading-6 text-[var(--tm-text-primary)]"
            >
              {title}
            </h2>
            {showOutcomeCounts && (
              <div data-answer-outcome-counts className="flex items-center gap-3 text-[12px] font-medium text-[#65635f]" aria-label={`Doğru ${outcomeCounts.correct}, yanlış ${outcomeCounts.wrong}, boş ${outcomeCounts.blank}`}>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#6f9b72]" aria-hidden="true" />Doğru {outcomeCounts.correct}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#c87570]" aria-hidden="true" />Yanlış {outcomeCounts.wrong}</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#aaa7a1]" aria-hidden="true" />Boş {outcomeCounts.blank}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={toggleAllCorrectAnswers}
              aria-pressed={showCorrectAnswers}
              className="inline-flex min-h-10 items-center justify-center rounded-[7px] border border-[var(--tm-border-card)] bg-white px-3 text-[13px] font-medium text-[var(--tm-text-primary)] transition-colors hover:bg-[#f4f3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d8793] focus-visible:ring-offset-1"
            >
              {showCorrectAnswers
                ? "Doğru cevapları gizle"
                : "Doğru cevapları göster"}
            </button>
            <button
              type="button"
              onClick={requestExamReview}
              data-review-tone={tone}
              className="inline-flex min-h-10 items-center justify-center rounded-[7px] border border-[#d8d8d4] bg-[#f7f7f5] px-3 text-[13px] font-semibold text-[#37352f] transition-colors hover:bg-[#efefec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d8793] focus-visible:ring-offset-1"
            >
              {reviewButtonLabel}
            </button>
          </div>
        </header>

        <div className="space-y-[14px]">
          {sectionGroups.map((group, groupIndex) => {
            const sectionTitleId = `reading-answer-section-${groupIndex}`;
            const everySectionAnswerIsVisible =
              showCorrectAnswers ||
              group.questions.every((question) =>
                revealedQuestionIds.has(question.questionId),
              );

            return (
              <section
                key={group.groupKey}
                data-reading-section-card
                aria-labelledby={sectionTitleId}
                className="overflow-hidden rounded-[10px] border border-[var(--tm-border-card)] bg-white shadow-[var(--tm-shadow-card)]"
              >
                <header
                  data-reading-section-divider
                  className="flex items-baseline justify-between gap-4 border-b border-[var(--tm-border-subtle)] bg-[#f7f6f3] px-4 py-3 sm:px-5"
                >
                  <h3
                    id={sectionTitleId}
                    className="text-[15px] font-semibold leading-5 text-[var(--tm-text-primary)]"
                  >
                    {group.label}
                  </h3>
                  <span className="text-[12px] font-medium leading-5 text-[var(--tm-text-secondary)]">
                    {group.questions.length} soru
                  </span>
                </header>

                <div role="table" aria-labelledby={sectionTitleId}>
                  <div role="rowgroup" className="hidden sm:block">
                    <div
                      role="row"
                      className="grid grid-cols-[64px_minmax(140px,2fr)_minmax(260px,4fr)_80px] gap-4 border-b border-[var(--tm-border-subtle)] bg-white px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[#6f6e69]"
                    >
                      <span role="columnheader">Soru</span>
                      <span role="columnheader">Cevabınız</span>
                      <span role="columnheader">
                        {everySectionAnswerIsVisible
                          ? "Doğru cevap"
                          : "Doğru cevap (gizli)"}
                      </span>
                      <span role="columnheader">Sonuç</span>
                    </div>
                  </div>

                  <div role="rowgroup">
                    {group.questions.map((question) => {
                      const blank = isBlankReviewAnswer(question.userAnswer);
                      const answerIsVisible =
                        showCorrectAnswers ||
                        revealedQuestionIds.has(question.questionId);
                      const status = question.isCorrect
                        ? {
                            label: "Doğru",
                            color: "bg-[#edf7ef] text-[#2f6f3d]",
                          }
                        : blank
                          ? {
                              label: "Boş",
                              color: "bg-[#f1f1ef] text-[#5f5e5a]",
                            }
                          : {
                              label: "Yanlış",
                              color: "bg-[#fff1f1] text-[#a33737]",
                            };

                      return (
                        <div
                          key={question.questionId}
                          role="row"
                          className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)] gap-x-3 gap-y-3 border-b border-[var(--tm-border-subtle)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#fcfbf8] sm:grid-cols-[64px_minmax(140px,2fr)_minmax(260px,4fr)_80px] sm:items-start sm:gap-4 sm:px-5"
                        >
                          <span
                            role="cell"
                            className="inline-flex h-6 w-fit min-w-8 items-center justify-center rounded-[5px] bg-[#f1f1ee] px-1.5 text-[13px] font-semibold leading-none tabular-nums text-[var(--tm-text-primary)]"
                          >
                            S{question.number}
                          </span>

                          <div role="cell" className="min-w-0">
                            <span className="mb-1 block text-[12px] font-medium leading-[18px] text-[var(--tm-text-secondary)] sm:hidden">
                              Cevabınız
                            </span>
                            <span
                              className={`block break-words text-[13px] font-medium leading-5 ${
                                blank
                                  ? "text-[var(--tm-text-secondary)]"
                                  : "text-[var(--tm-text-primary)]"
                              }`}
                            >
                              {formatReviewAnswer(question.userAnswer)}
                            </span>
                          </div>

                          <div
                            role="cell"
                            className="col-start-2 min-w-0 sm:col-start-auto"
                          >
                            <span className="mb-1 block text-[12px] font-medium leading-[18px] text-[var(--tm-text-secondary)] sm:hidden">
                              {answerIsVisible
                                ? "Doğru cevap"
                                : "Doğru cevap (gizli)"}
                            </span>
                            {answerIsVisible ? (
                              <span className="block break-words text-[13px] font-semibold leading-5 text-[var(--tm-success)]">
                                {formatCorrectAnswers(question.answers)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                data-reading-spoiler
                                onClick={() =>
                                  revealCorrectAnswer(question.questionId)
                                }
                                aria-label={`S${question.number} doğru cevabını göster`}
                                title="Doğru cevabı göster"
                                className="reading-answer-spoiler block h-6 w-full max-w-[220px] rounded-[5px] border border-[#d4d3ce] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d8793] focus-visible:ring-offset-2"
                              >
                                <span
                                  aria-hidden="true"
                                  className="reading-answer-spoiler-label"
                                >
                                  Göster
                                </span>
                              </button>
                            )}
                          </div>

                          <span
                            role="cell"
                            className={`col-start-2 inline-flex min-h-6 w-fit items-center rounded-[5px] px-2 py-0.5 text-[12px] font-semibold leading-4 sm:col-start-auto ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {questions.length === 0 && (
          <div className="rounded-[10px] border border-[var(--tm-border-card)] bg-white px-5 py-10 text-center text-[13px] text-[var(--tm-text-secondary)] shadow-[var(--tm-shadow-card)]">
            Bu sonuçta soru bulunmuyor.
          </div>
        )}
      </section>

      <AlertDialog
        open={reviewWarningOpen}
        onOpenChange={setReviewWarningOpen}
      >
        <AlertDialogContent className="w-[calc(100%-2rem)] max-w-[440px] gap-5 rounded-[8px] border-[#dededb] bg-white p-5 shadow-[0_18px_50px_rgba(32,31,28,0.16)] sm:p-6">
          <AlertDialogHeader className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 text-left">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#f1f1ef] text-[#4f4e49]"
            >
              <Eye className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </span>
            <span className="space-y-1.5">
              <AlertDialogTitle className="text-[18px] font-semibold leading-6 text-[#242424]">
                Cevap anahtarı açılacak
              </AlertDialogTitle>
              <AlertDialogDescription className="text-[14px] font-normal leading-[21px] text-[#5f5e5a]">
                Devam ettiğinizde doğru cevaplar, kanıtlar ve açıklamalar
                görünür. Sınavı cevapları görmeden yeniden çözmek istiyorsanız
                şimdi geri dönün.
              </AlertDialogDescription>
            </span>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel className="min-h-10 rounded-[7px] border-[#d8d8d4] bg-white px-4 text-[13px] font-medium text-[#37352f] shadow-none hover:bg-[#f4f3f0]">
              Geri dön
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={openExamReview}
              className="min-h-10 rounded-[7px] bg-[#4a4945] px-4 text-[13px] font-semibold text-white shadow-none hover:bg-[#3f3e3a]"
            >
              Cevapları aç ve incele
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
