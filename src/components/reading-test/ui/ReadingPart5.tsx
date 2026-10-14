import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  getReadingReviewOptionState,
  getReadingReviewQuestion,
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

interface ReadingPart5Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart5({ testData, answers, onAnswerChange, partNumber }: ReadingPart5Props) {
  const review = useReadingReviewContext();
  const part5 = (testData.parts || []).find((p: any) => (p.number || 0) === 5) || (testData.parts || [])[4];
  const section5 = part5?.sections && part5.sections[0];
  const contentTitle = fixMojibake(section5?.title || "").trim();
  const content = section5?.content || "";
  const questions = (section5?.questions || []);
  const orderedQuestions = [...questions].sort((a: any, b: any) => {
    const an = typeof a.number === 'number' ? a.number : 0;
    const bn = typeof b.number === 'number' ? b.number : 0;
    return an - bn;
  });
  
  // Build options from answers for paragraph matching (A-E)
  const optionMap = new Map<string, { variantText: string; answer: string }>();
  questions.forEach((q: any) => {
    (q.answers || []).forEach((a: any) => {
      if (a.variantText && !optionMap.has(a.variantText)) {
        optionMap.set(a.variantText, { variantText: a.variantText, answer: a.displayText ?? a.answer });
      }
    });
  });
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));
  // Helper: per-question options (A-D)
  const getQuestionOptions = (question: any) => {
    const opts = (question.answers || []).map((a: any) => ({
      variantText: a.variantText,
      answer: a.displayText ?? a.answer,
    }));
    return opts.sort((a: any, b: any) => a.variantText.localeCompare(b.variantText));
  };

  // Parse content to extract paragraphs A-E in multiple possible formats
  const parseParagraphs = (rawContent: string) => {
    const paragraphs: { letter: string; text: string }[] = [];
    if (!rawContent) return paragraphs;

    // Normalize Windows/Mac newlines to \n
    const content = rawContent.replace(/\r\n?|\r/g, '\n');

    // Strategy 1: Regex capture for formats like "A) ...", "A. ...", "A - ..."
    const blockRegex = /(\n|^)\s*([A-E])[)\.-]?\s+([\s\S]*?)(?=(\n\s*[A-E][)\.-]?\s+|$))/g;
    const matched: { letter: string; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(content)) !== null) {
      const letter = m[2];
      const text = (m[3] || '').trim();
      if (letter && text) matched.push({ letter, text });
    }
    if (matched.length >= 1) {
      // Keep only first five A-E and sort by letter
      const unique = new Map<string, string>();
      for (const { letter, text } of matched) {
        if (!unique.has(letter) && letter >= 'A' && letter <= 'E') unique.set(letter, text);
      }
      const ordered = Array.from(unique.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([letter, text]) => ({ letter, text }));
      return ordered;
    }

    // Strategy 2: Letter on its own line followed by text lines until next letter line
    const lines = content.split('\n');
    let currentLetter = '';
    let buffer: string[] = [];
    const pushIfValid = () => {
      const text = buffer.join(' ').trim();
      if (currentLetter && text) paragraphs.push({ letter: currentLetter, text });
    };
    for (const line of lines) {
      const trimmed = line.trim();
      const singleLetter = /^[A-E]$/.test(trimmed);
      const letterHeader = /^[A-E][)\.-]?$/.test(trimmed);
      if (singleLetter || letterHeader) {
        // flush previous
        pushIfValid();
        currentLetter = trimmed[0];
        buffer = [];
      } else if (trimmed.length) {
        buffer.push(trimmed);
      }
    }
    pushIfValid();
    if (paragraphs.length >= 1) {
      // Ensure A-E order and limit to five
      const unique = new Map<string, string>();
      for (const p of paragraphs) {
        if (!unique.has(p.letter) && p.letter >= 'A' && p.letter <= 'E') unique.set(p.letter, p.text);
      }
      return Array.from(unique.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([letter, text]) => ({ letter, text }));
    }

    // Strategy 3: Fallback split by double newlines (first five chunks become A-E)
    const sections = content.split(/\n\n+/).filter((s) => s.trim());
    if (sections.length) {
      return sections.slice(0, 5).map((section, index) => ({
        letter: String.fromCharCode(65 + index),
        text: section.trim(),
      }));
    }

    return paragraphs;
  };

  const paragraphs = parseParagraphs(content);
  const activeReviewQuestion = getReadingReviewQuestion(
    review,
    review?.activeQuestionId || "",
  );
  const showParagraphAnswerState =
    Number(activeReviewQuestion?.number) >= 33;

  return (
    <div className="mx-2 reading-body pr-2 text-slate-800">
   

      {/* Mobile Layout - Split */}
      <div className="reading-mobile-layout block lg:hidden h-[calc(100svh-14rem)]">
        <ResizablePanelGroup direction="vertical" className="h-full reading-surface">
          <ResizablePanel defaultSize={50} minSize={25} maxSize={75} className="reading-surface min-h-0">
            <div className="h-full p-4 border-b border-gray-200 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
              {contentTitle && (
                <div className="reading-passage-title mb-3">
                  <HighlightableText text={contentTitle} annotationId="title" partNumber={partNumber} />
                </div>
              )}
              <div className="space-y-4">
                {paragraphs.map((para) => (
                  <div
                    key={`${para.letter}.`}
                    data-reading-review-option-state={
                      showParagraphAnswerState
                        ? getReadingReviewOptionState(
                            review,
                            activeReviewQuestion?.questionId || "",
                            para.letter,
                          )
                        : "neutral"
                    }
                    className={`flex items-start gap-3 p-2 ${
                      showParagraphAnswerState &&
                      getReadingReviewOptionState(
                        review,
                        activeReviewQuestion?.questionId || "",
                        para.letter,
                      ) === "correct"
                        ? "text-[#2f6f3d]"
                        : showParagraphAnswerState &&
                            getReadingReviewOptionState(
                              review,
                              activeReviewQuestion?.questionId || "",
                              para.letter,
                            ) === "incorrect"
                          ? "text-[#a33737]"
                          : "text-[#37352f]"
                    }`}
                  >
                    <span className="font-semibold text-slate-800 min-w-[1.5rem]">
                      {`${para.letter}.`}
                    </span>
                    <div className="reading-text leading-relaxed flex-1">
                      <HighlightableText annotationId={`paragraph:${para.letter}`}
                        text={fixMojibake(para.text)} partNumber={partNumber} />
                    </div>
                  </div>
                ))}
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

          <ResizablePanel defaultSize={50} minSize={25} maxSize={75} className="reading-surface-alt min-h-0">
            <div className="h-full p-4 space-y-4 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll pb-[calc(10rem+env(safe-area-inset-bottom))]">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 tracking-wide">Sorular</h4>
            {/* Static instruction for 30-32 (always visible at top) */}
            <div className="p-2 mb-2">
              <p className="reading-text font-semibold font-sans leading-relaxed">
                {review
                  ? "Sorular 30–32. Cümlelerin doğru tamamlanışını inceleyin."
                  : `${officialReadingInstructions.groups["30-32"].heading}. ${officialReadingInstructions.groups["30-32"].description}`}
              </p>
            </div>
            {/* S33-35 instruction will appear right before question 33 */}
            {orderedQuestions.map((q: any, idx: number) => {
              const questionNumber = q.number || (30 + idx);
              const isParagraphQuestion = questionNumber >= 33; // Questions 33-35 are paragraph matching
              
              return (
                <div key={q.id} className="py-2 space-y-2 border-b border-gray-200 last:border-b-0">

                  {/* Static instruction for 33-35 (render once above S33) */}
                  {isParagraphQuestion && questionNumber === 33 && (
                    <div className="p-2 mb-2 bg-gray-50">
                      <p className="reading-text font-semibold font-sans leading-relaxed">
                        {review
                          ? "Sorular 33–35. Her cümlenin ait olduğu paragrafı inceleyin."
                          : `${officialReadingInstructions.groups["33-35"].heading}. ${officialReadingInstructions.groups["33-35"].description}`}
                      </p>
                    </div>
                  )}

                  {/* Render question types */}
                  {isParagraphQuestion ? (
                    <>
                      <div className="flex items-center gap-2">
                      <span className="font-semibold">S{questionNumber}.</span>
                        <div className="w-20">
                          <Select value={(answers[q.id] || "")} onValueChange={(v) => onAnswerChange(q.id, v)}>
                            <SelectTrigger className={`h-8 text-xs border rounded-md cursor-pointer transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                              answers[q.id] ? "border-gray-400 bg-gray-100 text-[#333333]" : "border-gray-200 bg-white text-[#333333] hover:border-gray-300"
                            } focus:ring-1 focus:ring-black/15 focus:ring-offset-0 focus:border-gray-400`}>
                              <SelectValue placeholder="Seç">
                                  {answers[q.id] ? `${answers[q.id]}.` : "Seç"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-sm rounded-md reading-select-content reading-select-content">
                              {(optionList.length ? optionList.map(o => o.variantText) : ["A","B","C","D","E"]).map((letter) => (
                                <SelectItem key={letter} value={String(letter)} className="text-[#37352f] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">{String(letter)}.</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <ReadingReviewAnswerNote
                        questionId={q.id}
                        blankOnly
                      />
                      <div className="reading-text font-medium">
                        <HighlightableText
                          annotationId={`question:${q.id}:prompt`}
                                text={fixMojibake(q.text || q.question || "Hangi paragrafta yer almaktadır?")}
                          partNumber={partNumber}
                        />
                      </div>
                      <ReadingReviewQuestionExplanation
                        questionId={q.id}
                        className="mt-1"
                      />
                    </>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-semibold reading-text">S{questionNumber}. <span className="font-normal">{q.text || q.question || ''}</span></div>
                      <ReadingReviewAnswerNote
                        questionId={q.id}
                        blankOnly
                      />
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
                          <div
                            data-reading-review-option-state={reviewState}
                            className={`flex w-full items-center gap-2 rounded-md p-2 text-left transition-colors ${
                              reviewState === "correct"
                                ? "text-[#2f6f3d]"
                                : reviewState === "incorrect"
                                  ? "text-[#a33737]"
                                  : selected
                                    ? "bg-[#f7f7f5] text-[#37352f]"
                                    : "text-[#37352f]"
                            }`}
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
                            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 reading-text">
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
                  )}
                </div>
              );
            })}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Desktop Layout - Resizable */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden border-y border-[#e5e5e2]">
          {/* Left: Passage (fixed) */}
          <ResizablePanel defaultSize={60} minSize={50} maxSize={70} className="reading-surface">
            <div className="h-full p-8 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
              <div className="space-y-6 leading-relaxed">
                {contentTitle && (
                  <div className="reading-passage-title">
                    <HighlightableText text={contentTitle} annotationId="title" partNumber={partNumber} />
                  </div>
                )}
                <div className="space-y-6">
                  {paragraphs.map((para) => {
                    const reviewState = showParagraphAnswerState
                      ? getReadingReviewOptionState(
                          review,
                          activeReviewQuestion?.questionId || "",
                          para.letter,
                        )
                      : null;
                    return (
                    <div
                      key={`${para.letter}.`}
                      data-reading-review-option-state={reviewState || "neutral"}
                      className={`reading-text reading-primary-copy reading-passage-copy leading-relaxed ${
                        reviewState === "correct"
                          ? "text-[#2f6f3d]"
                          : reviewState === "incorrect"
                            ? "text-[#a33737]"
                            : ""
                      }`}
                    >
                      <span className="mr-2 font-semibold text-[#242424]">
                        {`${para.letter}.`}
                      </span>
                      <HighlightableText
                        annotationId={`paragraph:${para.letter}`}
                        text={fixMojibake(para.text)}
                        partNumber={partNumber}
                        as="span"
                        wrapperAs="span"
                      />
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ReadingSplitHandle />

          {/* Right: Answers (scrollable & resizable) */}
          <ResizablePanel defaultSize={40} minSize={20} className="reading-surface-alt min-h-0">
            <div className="h-full max-h-full px-6 pt-8 pb-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
              {/* Static instruction for 30-32 (always visible at top) */}
              <div className="reading-question-instruction">
                <p className="reading-question-instruction-heading">
                  {officialReadingInstructions.groups["30-32"].heading}
                </p>
                <p className="reading-question-instruction-copy">
                  {review ? (
                    <>Cümlelerin doğru tamamlanışını inceleyin.</>
                  ) : (
                    <>{officialReadingInstructions.groups["30-32"].description}</>
                  )}
                </p>
              </div>
              {/* S33-35 instruction will appear right before question 33 */}

              <div className="mb-8">
                {orderedQuestions.map((q: any, idx: number) => {
                  const questionNumber = q.number || (30 + idx);
                  const isParagraphQuestion = questionNumber >= 33;

                  return (
                    <div
                      key={q.id}
                      id={`reading-question-desktop-${questionNumber}`}
                      className="space-y-2 border-b border-[#e5e5e2] py-5 first:pt-2 last:border-b-0"
                    >
                      {isParagraphQuestion && questionNumber === 33 && (
                        <div className="reading-question-instruction mb-5">
                          <p className="reading-question-instruction-heading">
                            {officialReadingInstructions.groups["33-35"].heading}
                          </p>
                          <p className="reading-question-instruction-copy">
                            {review ? (
                              <>Her cümlenin ait olduğu paragrafı inceleyin.</>
                            ) : (
                              <>{officialReadingInstructions.groups["33-35"].description}</>
                            )}
                          </p>
                        </div>
                      )}

                      {isParagraphQuestion ? (
                        <>
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex shrink-0 items-start gap-3">
                              <ReadingQuestionNumber number={questionNumber} />
                              <div className="w-[72px] shrink-0">
                              <Select
                                value={answers[q.id] || "__none__"}
                                onValueChange={(v) => onAnswerChange(q.id, v === "__none__" ? "" : v)}
                              >
                                <SelectTrigger
                                  aria-label={`Soru ${questionNumber} için seçenek`}
                                  className={`reading-select-trigger reading-part5-compact-select !h-9 !min-h-9 w-full ${
                                    answers[q.id] ? "reading-select-trigger-selected" : ""
                                  }`}
                                >
                                  <SelectValue placeholder="">
                                    <span className="font-semibold">
                                      {answers[q.id] || "Seç"}
                                    </span>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="reading-select-content reading-part5-letter-menu z-50 max-h-[60vh] w-[72px] min-w-[72px] max-w-[72px] overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white shadow-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/40">
                                  <SelectItem
                                    value="__none__"
                                    className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                                  >
                                    Seç
                                  </SelectItem>
                                  {(optionList.length ? optionList.map((o) => o.variantText) : ["A", "B", "C", "D", "E"]).map((letter) => (
                                    <SelectItem
                                      key={letter}
                                      value={String(letter)}
                                      className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] text-[#37352f] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                                    >
                                      <span className="font-semibold">{String(letter)}</span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              </div>
                            </div>
                            <span className="reading-text reading-primary-copy min-w-0 !leading-6">
                              <HighlightableText
                                annotationId={`question:${q.id}:prompt`}
                                text={fixMojibake(q.text || q.question || "Hangi paragrafta yer almaktadır?")}
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
                          <ReadingReviewQuestionExplanation
                            questionId={q.id}
                            className="mt-3"
                          />
                        </>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2.5 font-sans reading-text">
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
                          <div role="radiogroup" aria-label={`Soru ${questionNumber}`} className="space-y-1">
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
                      )}
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













