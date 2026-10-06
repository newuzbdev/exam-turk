import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleSlash2,
  XCircle,
} from "lucide-react";
import {
  flattenReviewQuestions,
  formatCorrectAnswers,
  formatReviewAnswer,
  getQuestionEvidenceSnippets,
  getSelectedDistractorExplanation,
  isBlankReviewAnswer,
  type MockReviewQuestion,
  type MockReviewV1,
} from "./evidence-review-utils";
import ReadingEvidenceExplanation from "./ReadingEvidenceExplanation";

type ReviewFilter = "incorrect" | "all";

interface EvidenceReviewPanelProps {
  review?: MockReviewV1 | null;
  reviewAvailable?: boolean;
  sourceLabel: string;
  renderQuestionAction?: (question: MockReviewQuestion) => ReactNode;
  title?: string;
  description?: string;
  onClose?: () => void;
  closeLabel?: string;
}

const legacyMessage = "Bu eski sonuç için ayrıntılı kanıt incelemesi bulunmuyor.";

export default function EvidenceReviewPanel({
  review,
  reviewAvailable,
  sourceLabel,
  renderQuestionAction,
  title = "Kanıtlı cevap incelemesi",
  description = "Cevabınızı, doğru yanıtı ve sınav metnindeki kanıtı karşılaştırın.",
  onClose,
  closeLabel = "Cevaplara dön",
}: EvidenceReviewPanelProps) {
  const [filter, setFilter] = useState<ReviewFilter>("incorrect");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const questions = useMemo(() => flattenReviewQuestions(review), [review]);
  const filteredQuestions = useMemo(
    () =>
      filter === "all"
        ? questions
        : questions.filter((question) => !question.isCorrect),
    [filter, questions],
  );

  useEffect(() => {
    if (!filteredQuestions.some((question) => question.questionId === selectedQuestionId)) {
      setSelectedQuestionId(filteredQuestions[0]?.questionId || "");
    }
  }, [filteredQuestions, selectedQuestionId]);

  if (!reviewAvailable || !review || questions.length === 0) {
    return (
      <div className="rounded-[8px] border border-[var(--tm-border-subtle)] bg-white px-4 py-3 text-[13px] leading-5 text-[var(--tm-text-secondary)]">
        {legacyMessage}
      </div>
    );
  }

  const selectedQuestion =
    filteredQuestions.find((question) => question.questionId === selectedQuestionId) ||
    filteredQuestions[0];
  const evidenceSnippets = getQuestionEvidenceSnippets(selectedQuestion);
  const distractorExplanation = selectedQuestion
    ? getSelectedDistractorExplanation(selectedQuestion)
    : null;

  return (
    <section className="overflow-hidden rounded-[8px] border border-[var(--tm-border-subtle)] bg-white shadow-[var(--tm-shadow-card)]">
      <div className="flex flex-col gap-4 border-b border-[var(--tm-border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="mb-3 inline-flex min-h-9 items-center gap-2 rounded-[6px] border border-[var(--tm-border-card)] bg-white px-3 text-[12px] font-medium text-[var(--tm-text-primary)] transition-colors hover:bg-[#f4f3f0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d8793] focus-visible:ring-offset-1"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {closeLabel}
            </button>
          )}
          <h2 className="text-[17px] font-semibold text-[var(--tm-text-primary)]">
            {title}
          </h2>
          <p className="mt-1 text-[13px] leading-5 text-[var(--tm-text-secondary)]">
            {description}
          </p>
        </div>
        <div className="inline-flex w-full rounded-[6px] border border-[var(--tm-border-subtle)] bg-[#f7f7f5] p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setFilter("incorrect")}
            aria-label="Yanlış ve boş sorular"
            className={`min-h-9 flex-1 rounded-[5px] px-3 text-[12px] font-medium transition-colors sm:flex-none ${
              filter === "incorrect"
                ? "bg-white text-[var(--tm-text-primary)] shadow-sm"
                : "text-[var(--tm-text-secondary)]"
            }`}
          >
            Yanlış ve boş
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`min-h-9 flex-1 rounded-[5px] px-3 text-[12px] font-medium transition-colors sm:flex-none ${
              filter === "all"
                ? "bg-white text-[var(--tm-text-primary)] shadow-sm"
                : "text-[var(--tm-text-secondary)]"
            }`}
          >
            Tüm sorular
          </button>
        </div>
      </div>

      {filteredQuestions.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <CheckCircle2 className="mx-auto h-5 w-5 text-[#438553]" aria-hidden="true" />
          <p className="mt-3 text-[14px] font-medium text-[var(--tm-text-primary)]">
            Yanlış veya boş cevabınız yok.
          </p>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="mt-2 text-[12px] font-medium text-[#48687a] underline underline-offset-4"
          >
            Tüm soruları incele
          </button>
        </div>
      ) : (
        <div className="grid min-w-0 lg:grid-cols-[224px_minmax(0,1fr)]">
          <nav
            className="max-h-[600px] overflow-y-auto border-b border-[var(--tm-border-subtle)] bg-[#fbfbfa] lg:border-b-0 lg:border-r"
            aria-label="İncelenecek sorular"
          >
            {filteredQuestions.map((question) => {
              const blank = isBlankReviewAnswer(question.userAnswer);
              const active = question.questionId === selectedQuestion?.questionId;
              const statusLabel = question.isCorrect
                ? "Doğru"
                : blank
                  ? "Boş"
                  : "Yanlış";
              return (
                <button
                  key={question.questionId}
                  type="button"
                  onClick={() => setSelectedQuestionId(question.questionId)}
                  aria-current={active ? "true" : undefined}
                  className={`flex min-h-14 w-full items-center gap-3 border-b border-[var(--tm-border-subtle)] px-4 py-3 text-left transition-colors last:border-b-0 ${
                    active
                      ? "bg-[#eef4f6]"
                      : "hover:bg-white/70"
                  }`}
                >
                  {question.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#438553]" aria-hidden="true" />
                  ) : blank ? (
                    <CircleSlash2 className="h-4 w-4 shrink-0 text-[#77766f]" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-[#c74646]" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-[var(--tm-text-primary)]">
                      S{question.number}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--tm-text-tertiary)]">
                      {statusLabel}
                    </span>
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${active ? "text-[#48687a]" : "text-[#aaa9a2]"}`} aria-hidden="true" />
                </button>
              );
            })}
          </nav>

          {selectedQuestion && (
            <div className="min-w-0 space-y-5 p-4 sm:p-6">
              <div className="flex flex-col gap-3 border-b border-[var(--tm-border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--tm-text-tertiary)]">
                    {selectedQuestion.sectionTitle || "Soru"}
                  </p>
                  <h3 className="mt-1 text-[16px] font-semibold leading-6 text-[var(--tm-text-primary)]">
                    {selectedQuestion.text || `Soru ${selectedQuestion.number}`}
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-[5px] px-2 py-1 text-[11px] font-semibold ${
                      selectedQuestion.isCorrect
                        ? "bg-[#e7f1e8] text-[#2f6f3d]"
                        : isBlankReviewAnswer(selectedQuestion.userAnswer)
                          ? "bg-[#efefed] text-[var(--tm-text-secondary)]"
                          : "bg-[#f8e8e8] text-[#a93636]"
                    }`}
                  >
                    {selectedQuestion.isCorrect
                      ? "Doğru"
                      : isBlankReviewAnswer(selectedQuestion.userAnswer)
                        ? "Boş"
                        : "Yanlış"}
                  </span>
                  {renderQuestionAction?.(selectedQuestion)}
                </div>
              </div>

              <div className="grid overflow-hidden rounded-[7px] border border-[var(--tm-border-subtle)] sm:grid-cols-2">
                <div className="min-w-0 bg-[#fbfbfa] px-4 py-3">
                  <p className="text-[11px] font-medium text-[var(--tm-text-tertiary)]">Cevabınız</p>
                  <p className="mt-1 break-words text-[13px] font-medium text-[var(--tm-text-primary)]">
                    {formatReviewAnswer(selectedQuestion.userAnswer)}
                  </p>
                </div>
                <div className="min-w-0 border-t border-[var(--tm-border-subtle)] bg-[#f5faf5] px-4 py-3 sm:border-l sm:border-t-0">
                  <p className="text-[11px] font-medium text-[var(--tm-text-tertiary)]">Doğru cevap</p>
                  <p className="mt-1 break-words text-[13px] font-semibold text-[#2f6f3d]">
                    {formatCorrectAnswers(selectedQuestion.answers)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--tm-text-primary)]">{sourceLabel}</p>
                <div className="max-h-[280px] space-y-2 overflow-y-auto rounded-[7px] border border-[#eadca2] bg-[#fffdf5] p-3 text-[13px] leading-6 text-[var(--tm-text-primary)]">
                  {evidenceSnippets.length > 0 ? (
                    evidenceSnippets.map((snippet, index) => (
                      <blockquote
                        key={`${index}-${snippet}`}
                        className="border-l-2 border-[#d7ad18] px-3 py-1.5"
                      >
                        <mark className="whitespace-pre-wrap rounded-[2px] bg-[#ffefad] px-0.5 text-inherit">
                          {snippet}
                        </mark>
                      </blockquote>
                    ))
                  ) : (
                    <p className="px-1 py-2 text-[12px] text-[var(--tm-text-tertiary)]">
                      Bu soru için metin kanıtı eklenmemiş.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-[7px] border border-[var(--tm-border-subtle)] bg-[#fbfbfa] px-4 py-3">
                <p className="text-[12px] font-semibold text-[var(--tm-text-primary)]">Neden doğru?</p>
                <ReadingEvidenceExplanation
                  value={selectedQuestion.explanation}
                  className="mt-1 block text-[13px] leading-6 text-[var(--tm-text-secondary)]"
                />
                {distractorExplanation && (
                  <div className="mt-3 border-t border-[var(--tm-border-subtle)] pt-3">
                    <p className="text-[11px] font-semibold text-[#a93636]">
                      Seçtiğiniz cevap neden uygun değil?
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-[var(--tm-text-secondary)]">
                      {distractorExplanation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
