import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import {
  getReadingReviewOptionState,
  ReadingReviewAnswerNote,
  ReadingReviewQuestionExplanation,
  useReadingReviewContext,
} from "@/components/results/ReadingReviewContext";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import officialReadingInstructions from "@/data/official-reading-instructions.json";
import { fixMojibake } from "@/utils/text";
import { MoveVertical } from "lucide-react";
import ReadingMultipleChoiceOption from "./ReadingMultipleChoiceOption";
import ReadingQuestionNumber from "./ReadingQuestionNumber";
import ReadingSplitHandle from "./ReadingSplitHandle";

interface ReadingPart4Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart4({ testData, answers, onAnswerChange, partNumber }: ReadingPart4Props) {
  const review = useReadingReviewContext();
  const part4 = (testData.parts || []).find((p: any) => (p.number || 0) === 4) || (testData.parts || [])[3];
  const section4 = part4?.sections && part4.sections[0];
  const content = fixMojibake(section4?.content || "");
  const contentTitle = fixMojibake(section4?.title || "").trim();
  const contentBody = String(content).trim();
  const questions = (section4?.questions || []);
  const orderedQuestions = [...questions].sort((a: any, b: any) => {
    const aNum = typeof a.number === "number" ? a.number : 0;
    const bNum = typeof b.number === "number" ? b.number : 0;
    return aNum - bNum;
  });
  
  // Build options for each question individually
  const getQuestionOptions = (question: any) => {
    const options = (question.answers || []).map((a: any) => ({
      variantText: fixMojibake(String(a.variantText || "")).trim(),
      answer: fixMojibake(String(a.displayText ?? a.answer ?? "")).trim(),
      correct: a.correct
    }));
    return options.sort((a: any, b: any) => a.variantText.localeCompare(b.variantText));
  };

  return (
    <div className="mx-2 reading-body pr-2 text-slate-800">
      {/* Mobile Layout - Split */}
      <div className="reading-mobile-layout block lg:hidden h-[calc(100svh-14rem)]">
        <ResizablePanelGroup direction="vertical" className="h-full reading-surface">
          <ResizablePanel defaultSize={45} minSize={25} maxSize={75} className="reading-surface min-h-0">
            <div className="h-full p-4 border-b border-gray-200 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
              {contentTitle && (
                <div className="reading-passage-title mb-3">
                  <HighlightableText text={contentTitle} annotationId="title" partNumber={partNumber} />
                </div>
              )}
              <div className="space-y-4 leading-relaxed">
                <div className="reading-text reading-primary-copy font-sans leading-relaxed">
                  {contentBody && <HighlightableText text={contentBody} annotationId="body" partNumber={partNumber} />}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle
            withHandle={false}
            className="h-[10px] touch-none cursor-row-resize data-[panel-group-direction=vertical]:h-[10px] data-[panel-group-direction=vertical]:my-0 bg-transparent !rounded-none !shadow-none data-[resize-handle-state=hover]:!bg-transparent data-[resize-handle-state=drag]:!bg-transparent"
          >
            <div className="mx-auto flex h-full w-full items-center justify-center">
              <div className="relative w-full">
                <div className="mx-auto h-px w-full bg-black/60" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white px-1">
                  <MoveVertical className="h-3.5 w-3.5 text-black/80" strokeWidth={2.25} />
                </div>
              </div>
            </div>
          </ResizableHandle>

          <ResizablePanel defaultSize={55} minSize={25} maxSize={75} className="reading-surface-alt min-h-0">
            <div className="h-full p-4 space-y-4 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll pb-[calc(10rem+env(safe-area-inset-bottom))]">
            <h4 className="text-sm reading-strong-title text-slate-700 mb-3 tracking-wide">Sorular</h4>
            
            {/* Instructions for Questions 21-24 */}
            <div className="p-2 mb-2">
              <p className="text-sm font-semibold leading-relaxed">
                {review
                  ? "Sorular 21–24. Metne göre doğru seçeneği ve verdiğiniz cevabı karşılaştırın."
                  : `${officialReadingInstructions.groups["21-24"].heading}. ${officialReadingInstructions.groups["21-24"].description}`}
              </p>
            </div>
            
            {orderedQuestions.map((q: any, idx: number) => {
              const questionNumber = q.number || (idx + 21);
              const isTrueFalseQuestion = questionNumber >= 25;
              
              const options = getQuestionOptions(q);
              const trueFalseOrder = ["dogru", "yanlis", "verilmemis"];
              const normalizeTf = (value: string) => value
                .toLowerCase()
                .replace(/ğ/g, "g")
                .replace(/ü/g, "u")
                .replace(/ş/g, "s")
                .replace(/ı/g, "i")
                .replace(/ö/g, "o")
                .replace(/ç/g, "c")
                .replace(/[^a-z]/g, "");
              const orderedOptions = isTrueFalseQuestion
                ? [...options].sort((a, b) => {
                    const aText = normalizeTf(`${a.answer || ""} ${a.variantText || ""}`);
                    const bText = normalizeTf(`${b.answer || ""} ${b.variantText || ""}`);
                    const aKey = trueFalseOrder.findIndex((label) => aText.includes(label));
                    const bKey = trueFalseOrder.findIndex((label) => bText.includes(label));
                    return (aKey === -1 ? 99 : aKey) - (bKey === -1 ? 99 : bKey);
                  })
                : options;

              return (
                <div key={q.id} className="py-2 flex flex-col gap-3 border-b border-gray-200 last:border-b-0">
                  {/* Show instructions for questions 25-29 before the first True/False question */}
                  {isTrueFalseQuestion && questionNumber === 25 && (
                    <div className="p-2 mb-2 bg-gray-50">
                      <p className="reading-text font-semibold mb-1">
                        {review
                          ? "Sorular 25–29. Her ifadenin metne göre doğru, yanlış veya verilmemiş olma durumunu inceleyin."
                          : `${officialReadingInstructions.groups["25-29"].heading}. ${officialReadingInstructions.groups["25-29"].description}`}
                      </p>
                      <div className="reading-text space-y-0.5 font-sans text-[12px]">
                        <p><span className="font-bold">DOĞRU</span> – {officialReadingInstructions.definitions["DOĞRU"]}</p>
                        <p><span className="font-bold">YANLIŞ</span> – {officialReadingInstructions.definitions["YANLIŞ"]}</p>
                        <p><span className="font-bold">VERİLMEMİŞ</span> – {officialReadingInstructions.definitions["VERİLMEMİŞ"]}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <div className="font-medium font-sans reading-text text-slate-800">
                      <span className="font-bold">S{questionNumber}.</span>{" "}
                      <span className="font-normal">
                        <HighlightableText
                          annotationId={`question:${q.id}:prompt`}
                                text={fixMojibake(q.text || q.question || "")}
                          partNumber={partNumber}
                          as="span"
                          wrapperAs="span"
                        />
                      </span>
                    </div>
                    <ReadingReviewAnswerNote
                      questionId={q.id}
                      blankOnly
                    />
                    <div className={`${isTrueFalseQuestion ? 'flex flex-col gap-0.5' : 'flex flex-col gap-0.5'}`}>
                      {orderedOptions.map((opt: any) => {
                        const reviewState = getReadingReviewOptionState(
                          review,
                          q.id,
                          opt.variantText,
                        );
                        const selected =
                          answers[q.id] === opt.variantText;
                        return (
                        <div key={opt.variantText}>
                          <div
                            data-reading-review-option-state={reviewState}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors ${
                              reviewState === "correct"
                                ? "text-[#2f6f3d]"
                                : reviewState === "incorrect"
                                  ? "text-[#a33737]"
                                  : selected
                                    ? "bg-[#f7f7f5] text-[#37352f]"
                                    : "text-[#37352f]"
                            } ${isTrueFalseQuestion ? 'min-w-[140px]' : ''}`}
                          >
                            <button
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              aria-label={`${opt.variantText}. ${fixMojibake(String(opt.answer || ""))}`}
                              data-answer-control="true"
                              onClick={() =>
                                onAnswerChange(q.id, opt.variantText)
                              }
                              className="reading-option-radio-slot shrink-0 rounded transition-colors hover:bg-[#eeeeeb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8a8881] focus-visible:ring-offset-1"
                            >
                              <span
                                aria-hidden="true"
                                className={`reading-option-radio-ring rounded-full border-[1.5px] transition-colors ${
                                  selected
                                    ? reviewState === "correct"
                                      ? "border-[#438553]"
                                      : "border-[#5f5e5a]"
                                    : "border-[#a9a7a1]"
                                }`}
                              >
                                <span
                                  className={`reading-option-radio-dot rounded-full transition-colors ${
                                    selected
                                      ? reviewState === "correct"
                                        ? "bg-[#438553]"
                                        : "bg-[#5f5e5a]"
                                      : "bg-transparent"
                                  }`}
                                />
                              </span>
                            </button>
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 reading-text text-[12px]">
                              <span className="font-semibold">{opt.variantText}.</span>
                              <span className="font-normal">
                                <HighlightableText
                                  annotationId={`question:${q.id}:option:${opt.variantText}`}
                                  text={fixMojibake(String(opt.answer || ""))}
                                  partNumber={partNumber}
                                  onPlainClick={() =>
                                    onAnswerChange(q.id, opt.variantText)
                                  }
                                  as="span"
                                  wrapperAs="span"
                                />
                              </span>
                            </div>
                          </div>
                        </div>
                        );
                      })}
                      <ReadingReviewQuestionExplanation
                        questionId={q.id}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Desktop Layout - Fixed Left, Resizable Right */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden border-y border-[#e5e5e2]">
          {/* Left: Passage - Fixed Size */}
          <ResizablePanel defaultSize={60} minSize={50} maxSize={70} className="reading-surface">
            <div className="h-full p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-32 reading-scroll">
              <div className="space-y-6 leading-relaxed">
                <div className="reading-text reading-passage-copy font-sans leading-relaxed">
                  {contentTitle && (
                    <div className="reading-passage-title mb-3">
                      <HighlightableText text={contentTitle} annotationId="title" partNumber={partNumber} />
                    </div>
                  )}
                  {contentBody && <HighlightableText text={contentBody} annotationId="body" partNumber={partNumber} />}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ReadingSplitHandle />

          {/* Right: Answers - Resizable */}
          <ResizablePanel defaultSize={40} minSize={30} maxSize={50} className="reading-surface-alt min-h-0">
            <div className="h-full px-6 pt-8 pb-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
              {/* Instructions for Questions 21-24 */}
              <div className="reading-question-instruction">
                <p className="reading-question-instruction-heading">
                  {officialReadingInstructions.groups["21-24"].heading}
                </p>
                <p className="reading-question-instruction-copy">
                  {review ? (
                    <>Metne göre doğru seçeneği ve verdiğiniz cevabı karşılaştırın.</>
                  ) : (
                    <>{officialReadingInstructions.groups["21-24"].description}</>
                  )}
                </p>
              </div>

              <div className="mb-8">
                {orderedQuestions.map((q: any, idx: number) => {
                  const questionNumber = q.number || (idx + 21);
                  const isTrueFalseQuestion = questionNumber >= 25;
                  
                  return (
                    <div
                      key={q.id}
                      id={`reading-question-desktop-${questionNumber}`}
                      className="border-b border-[#e5e5e2] py-5 first:pt-2 last:border-b-0"
                    >
                      {/* Show instructions for questions 25-29 before the first True/False question */}
                      {isTrueFalseQuestion && questionNumber === 25 && (
                        <div className="reading-question-instruction mb-5">
                          <p className="reading-question-instruction-heading">
                            {officialReadingInstructions.groups["25-29"].heading}
                          </p>
                          <p className="reading-question-instruction-copy">
                            {review ? (
                              <>Her ifadenin metne göre doğru, yanlış veya verilmemiş olma durumunu inceleyin.</>
                            ) : (
                              <>{officialReadingInstructions.groups["25-29"].description}</>
                            )}
                          </p>
                          <div className="reading-question-definition-list">
                            <span className="reading-question-definition-term">DOĞRU</span>
                            <span className="reading-question-definition-copy">{officialReadingInstructions.definitions["DOĞRU"]}</span>
                            <span className="reading-question-definition-term">YANLIŞ</span>
                            <span className="reading-question-definition-copy">{officialReadingInstructions.definitions["YANLIŞ"]}</span>
                            <span className="reading-question-definition-term">VERİLMEMİŞ</span>
                            <span className="reading-question-definition-copy">{officialReadingInstructions.definitions["VERİLMEMİŞ"]}</span>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-baseline gap-2.5 font-sans reading-text text-slate-800">
                          <ReadingQuestionNumber number={questionNumber} />
                          <span className="reading-primary-copy min-w-0 !leading-6">
                            <HighlightableText
                              annotationId={`question:${q.id}:prompt`}
                                text={fixMojibake(q.text || q.question || "")}
                              partNumber={partNumber}
                              as="span"
                              wrapperAs="span"
                            />
                          </span>
                        </div>
                        <ReadingReviewAnswerNote
                          questionId={q.id}
                          blankOnly
                        />
                        <div className="mt-1 space-y-1" role="radiogroup" aria-label={`Soru ${questionNumber}`}>
                          {getQuestionOptions(q).map((opt: any) => {
                            const reviewState = getReadingReviewOptionState(
                              review,
                              q.id,
                              opt.variantText,
                            );
                            const selected =
                              answers[q.id] === opt.variantText;
                            return (
                              <div key={opt.variantText}>
                                <ReadingMultipleChoiceOption
                                  annotationId={`question:${q.id}:option:${opt.variantText}`}
                                  letter={opt.variantText}
                                  text={String(opt.answer || "")}
                                  selected={selected}
                                  reviewState={reviewState}
                                  partNumber={partNumber}
                                  onSelect={() => onAnswerChange(q.id, opt.variantText)}
                                />
                              </div>
                            );
                          })}
                          <ReadingReviewQuestionExplanation
                            questionId={q.id}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
