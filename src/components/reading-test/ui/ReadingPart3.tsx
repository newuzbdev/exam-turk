import type { ReactNode } from "react";
import { ResizablePanelGroup, ResizablePanel } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ReadingReviewOptionList,
  useReadingReviewContext,
} from "@/components/results/ReadingReviewContext";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import { fixMojibake } from "@/utils/text";
import ReadingOptionLegendRow from "./ReadingOptionLegendRow";
import { countOptionSelections } from "@/utils/selection-count";
import ReadingQuestionNumber from "./ReadingQuestionNumber";
import ReadingSplitHandle from "./ReadingSplitHandle";

interface ReadingPart3Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
  renderParagraphText?: (text: string, paragraphLabel: string) => ReactNode;
}

export default function ReadingPart3({
  testData,
  answers,
  onAnswerChange,
  partNumber,
  renderParagraphText,
}: ReadingPart3Props) {
  const review = useReadingReviewContext();
  const part3 = (testData.parts || []).find((p: any) => (p.number || 0) === 3) || (testData.parts || [])[2];
  const sections = part3?.sections || [];
  
  // Find the section with paragraphs/questions (the one that has questions)
  const paragraphSection = sections.find((s: any) => (s.questions || []).length > 0);
  const paragraphQuestions = (paragraphSection?.questions || []).sort((a: any, b: any) => (a.number || 0) - (b.number || 0));

  // Build options A..H from answers if present; fallback to parsing the first section content (A) .. (H)
  const optionMap = new Map<string, { letter: string; text: string }>();
  (sections || []).forEach((s: any) => (s.questions || []).forEach((q: any) => (q.answers || []).forEach((a: any) => {
    const answerText = a.displayText ?? a.answer;
    if (a.variantText && answerText && !optionMap.has(a.variantText)) {
      optionMap.set(a.variantText, { letter: a.variantText, text: answerText });
    }
  })));

  if (optionMap.size === 0 && sections[0]?.content) {
    const lines = String(sections[0].content).split(/\n+/);
    lines.forEach((line) => {
      const m = line.trim().match(/^([A-H])\)\s*(.+)$/);
      if (m) {
        const letter = m[1];
        const text = m[2];
        if (!optionMap.has(letter)) optionMap.set(letter, { letter, text });
      }
    });
  }

  const optionList = Array.from(optionMap.values()).sort((a, b) => a.letter.localeCompare(b.letter));
  const reviewOptions = optionList.map((option) => ({
    value: option.letter,
    label: `${option.letter}. ${fixMojibake(option.text)}`,
  }));
  const questionIds = (paragraphQuestions || []).map((question: any) => String(question.id));
  const normalizeSelectedLetter = (value: unknown) =>
    String(value || "").trim().replace(/\.$/, "");
  return (
    <div className="mx-2 reading-body overflow-hidden text-slate-800">
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden h-[calc(100svh-14rem)]">
        <div className="reading-surface flex h-full flex-col overflow-hidden rounded-md border border-[#e5e5e2]">
          {/* Questions Section - More scroll space for mobile */}
          <div className="reading-surface-alt flex-1 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent p-4 pb-[calc(10rem+env(safe-area-inset-bottom))] reading-scroll">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 tracking-wide">Paragraflar</h4>
            <ReadingReviewOptionList
              options={reviewOptions}
              className="mb-3"
            />
            <div className="space-y-4">
              {paragraphQuestions.map((q: any, idx: number) => {
                const displayNum = q.number || (15 + idx); // Use actual question number from API
                const displayText = fixMojibake(q.text || q.content || "");
                const romans = ["I", "II", "III", "IV", "V", "VI"];
                const label = `S${displayNum}. ${romans[idx]}. paragraf`;
                const selectedLetter = String(answers[q.id] || "").trim().replace(/\.$/, "");
                const selectedOption = optionList.find((opt) => opt.letter === selectedLetter);
                return (
                  <div
                    key={q.id}
                    className="p-3"
                  >
                    <div className="font-semibold text-slate-800 mb-2">{label}</div>
                    <div className="mt-2">
                      <Select
                        value={selectedLetter || ""}
                        onValueChange={(value) => {
                          const nextValue = value === "__none__" ? "" : value;
                          onAnswerChange(q.id, nextValue);
                        }}
                      >
                        <SelectTrigger className={`reading-select-trigger w-full ${
                          selectedOption ? "reading-select-trigger-selected" : ""
                        }`}>
                          <SelectValue placeholder="Seç">
                            <span className="block min-w-0 pr-5 text-left leading-snug whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2">
                              {selectedOption ? `${selectedOption.letter}. ${fixMojibake(selectedOption.text)}` : "Seç"}
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          sideOffset={8}
                          collisionPadding={16}
                          className="bg-white border border-gray-200 shadow-sm rounded-md reading-select-content w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] max-h-[65vh] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50"
                        >
                          <SelectItem value="__none__" className="cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                            {`Se\u00e7`}
                          </SelectItem>
                          {optionList.map((opt) => (
                            <SelectItem key={opt.letter} value={opt.letter} className="cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] text-[#37352f] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                              <span className="block whitespace-normal break-words [overflow-wrap:anywhere]">
                                {opt.letter}. {fixMojibake(opt.text)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {displayText && (
                      <div className="reading-text reading-primary-copy reading-passage-copy mt-3 text-left font-sans">
                        {renderParagraphText
                          ? renderParagraphText(displayText, String(q.paragraphLabel || romans[idx]))
                          : <HighlightableText text={displayText} partNumber={partNumber} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Resizable */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden border-y border-[#e5e5e2]">
          {/* Left: Paragraphs 15–20, select above text with green bg */}
          <ResizablePanel defaultSize={50} minSize={30} className="reading-surface">
            <div className="h-full p-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-24 reading-scroll">
              <div className="space-y-6">
                {paragraphQuestions.map((q: any, idx: number) => {
                  const displayNum = q.number || (15 + idx); // Use actual question number from API
                  const displayText = fixMojibake(q.text || q.content || "");
                  const romans = ["I", "II", "III", "IV", "V", "VI"];
                  const selectedLetter = normalizeSelectedLetter(answers[q.id]);
                  const selectedOption = optionList.find((opt) => opt.letter === selectedLetter);
                  return (
                    <div
                      key={q.id}
                      id={`reading-question-desktop-${displayNum}`}
                      className="border-b border-[#e5e5e2] px-1 py-6 first:pt-0 last:border-b-0"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="mb-3 flex items-center justify-start gap-3">
                            <div className="flex items-center whitespace-nowrap text-[length:calc(16px*var(--reading-font-scale,1))] font-semibold leading-6 text-[#242424]">
                              <ReadingQuestionNumber number={displayNum} className="!leading-6" />
                              <span aria-hidden="true">·&nbsp;</span>
                              <span>{romans[idx]}. paragraf</span>
                            </div>
                            <Select
                              value={selectedLetter || "__none__"}
                              onValueChange={(value) => {
                                const nextValue = value === "__none__" ? "" : value;
                                onAnswerChange(q.id, nextValue);
                              }}
                            >
                              <SelectTrigger
                                aria-label={`Soru ${displayNum} için başlık`}
                                className={`reading-select-trigger reading-part3-compact-select !h-9 !min-h-9 w-[88px] shrink-0 ${
                                  selectedOption ? "reading-select-trigger-selected" : ""
                                }`}
                              >
                                <SelectValue placeholder="">
                                  <span className="font-semibold">
                                    {selectedOption?.letter || "Seç"}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="reading-select-content reading-part3-letter-menu z-50 max-h-[60vh] w-[88px] min-w-[88px] max-w-[88px] overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white shadow-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/40">
                                <SelectItem value="__none__" className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                                  {`Se\u00e7`}
                                </SelectItem>
                                {optionList.map((opt) => (
                                  <SelectItem
                                    key={opt.letter}
                                    value={opt.letter}
                                    className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] text-[#37352f] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                                  >
                                    <span className="font-semibold">{opt.letter}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {displayText && (
                            <div className="">
                              <div className="reading-text reading-primary-copy reading-passage-copy px-1 text-left font-sans text-[#37352f]">
                                {renderParagraphText
                                  ? renderParagraphText(displayText, String(q.paragraphLabel || romans[idx]))
                                  : <HighlightableText text={displayText} partNumber={partNumber} />}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ResizablePanel>

          <ReadingSplitHandle />

          {/* Right: Headings legend A..H (no question labels next to variants) */}
          <ResizablePanel defaultSize={50} minSize={25} className="reading-surface-alt">
            <div className="h-full p-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent flex flex-col reading-scroll">
              <div className="reading-options-heading mb-3">{`Se\u00e7enekler`}</div>
              {review ? (
                <ReadingReviewOptionList options={reviewOptions} />
              ) : (
                <div className="space-y-2">
                  {optionList.map((opt) => {
                    return (
                      <ReadingOptionLegendRow
                        key={opt.letter}
                        letter={opt.letter}
                        text={opt.text}
                        selectionCount={countOptionSelections(answers, questionIds, opt.letter)}
                        partNumber={partNumber}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}


