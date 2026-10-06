import type { ReactNode } from "react";

import { ResizablePanelGroup, ResizablePanel } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
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

interface ReadingPart1Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
  fontScale?: number;
}

export default function ReadingPart1({
  testData,
  answers,
  onAnswerChange,
  partNumber,
  fontScale = 1,
}: ReadingPart1Props) {
  const review = useReadingReviewContext();
  const part1 = (testData.parts || []).find((p: any) => (p.number || 0) === 1) || (testData.parts || [])[0];
  const section1 = part1?.sections && part1.sections[0];
  const content = fixMojibake(section1?.content || "");
  const contentTitle = fixMojibake(section1?.title || "").trim();
  const contentBody = String(content).trim();
  const questions = section1?.questions || [];

  const optionMap = new Map<string, { variantText: string; answer: string }>();
  questions.forEach((q: any) => {
    (q.answers || []).forEach((a: any) => {
      const variantText = fixMojibake(String(a.variantText || "")).trim();
      const answer = fixMojibake(String(a.displayText ?? a.answer ?? "")).trim();
      if (variantText && !optionMap.has(variantText)) {
        optionMap.set(variantText, { variantText, answer });
      }
    });
  });
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));
  const reviewOptions = optionList.map((option) => ({
    value: option.variantText,
    label: `${option.variantText}. ${option.answer}`,
  }));
  const questionIds = questions.map((question: any) => String(question.id));
  const normalizeSelectedVariant = (value: unknown) =>
    String(value || "").trim().replace(/\.$/, "");
  const questionByNumber = new Map<number, any>();
  questions.forEach((q: any, idx: number) => {
    const num = typeof q.number === "number" ? q.number : idx + 1;
    questionByNumber.set(num, q);
  });

  const renderInlineText = (
    text: string,
    isMobile: boolean,
    keyPrefix: string,
    sourceOffset: number,
  ) => {
    const parts: ReactNode[] = [];
    const pattern = /_{3,}\s*\(S(\d+)\)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      if (start > lastIndex) {
        const chunk = text.slice(lastIndex, start);
        parts.push(
          <HighlightableText
            key={`${keyPrefix}-t-${lastIndex}`}
            text={chunk}
            partNumber={partNumber}
            as="span"
            wrapperAs="span"
            className="reading-text"
            reviewSourceText={contentBody}
            reviewSourceOffset={sourceOffset + lastIndex}
          />
        );
      }

      const qNum = Number(match[1]);
      const q = questionByNumber.get(qNum);
      if (q) {
        const normalizedSelectedVariant = normalizeSelectedVariant(answers[q.id]);
        const selectedOption = optionMap.get(normalizedSelectedVariant);
        const currentSelectValue = selectedOption ? selectedOption.variantText : "__none__";
        const mobileSelectedText = selectedOption
          ? `${selectedOption.variantText}. ${selectedOption.answer}`
          : "Seçiniz";
        const desktopSelectedText = selectedOption
          ? `${selectedOption.answer}`
          : "";
        parts.push(
          <span key={`${keyPrefix}-b-${qNum}`} className="inline-block align-middle mx-1">
            <Select
              value={currentSelectValue}
              onValueChange={(value) => onAnswerChange(q.id, value === "__none__" ? "" : value)}
            >
              <SelectTrigger
                id={isMobile ? undefined : `reading-question-desktop-${qNum}`}
                aria-label={
                  isMobile
                    ? undefined
                    : selectedOption
                      ? `S${qNum}: ${selectedOption.answer}`
                      : `S${qNum} için cevap seç`
                }
                className={
                  isMobile
                    ? `reading-inline-select-trigger !h-[1.65em] !min-h-0 min-w-[8rem] w-auto rounded-md px-2 !py-0 !text-[length:calc(16px*var(--reading-font-scale,1))] leading-none ${
                        selectedOption ? "reading-select-trigger-selected" : ""
                      }`
                    : `reading-inline-select-trigger reading-inline-select-trigger-desktop !h-[1.75em] !min-h-0 min-w-[6.5rem] max-w-[13rem] w-auto rounded-sm px-1.5 !py-0 !text-[length:calc(var(--reading-body-size,17px)*var(--reading-font-scale,1))] leading-none ${
                        selectedOption ? "reading-select-trigger-selected" : ""
                      }`
                }
              >
                <span className="truncate">
                  {isMobile ? (
                    <span className="font-semibold">{`S${qNum}.`}</span>
                  ) : (
                    <ReadingQuestionNumber
                      number={qNum}
                      className="min-w-0 align-middle"
                    />
                  )}{" "}
                  <span className={selectedOption ? "reading-inline-selected-answer font-normal" : undefined}>
                    {isMobile ? mobileSelectedText : desktopSelectedText}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent
                style={
                  isMobile
                    ? undefined
                    : ({ ["--reading-font-scale" as any]: fontScale } as React.CSSProperties)
                }
                className={`bg-white border border-gray-200 shadow-sm rounded-md reading-select-content max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y scrollbar-ultra-thin reading-scroll-ultra scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50 ${
                  isMobile
                    ? ""
                    : "reading-part1-letter-menu w-[104px] min-w-[104px] max-w-[104px]"
                }`}
              >
                {(isMobile || selectedOption) && (
                  <SelectItem
                    value="__none__"
                    className={`cursor-pointer py-1 focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333] ${
                      isMobile
                        ? "!text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))]"
                        : "!text-[length:calc(15px*var(--reading-font-scale,1))] !font-medium text-[#6f6d67]"
                    }`}
                  >
                    {isMobile ? `Se\u00e7iniz` : "Temizle"}
                  </SelectItem>
                )}
                {optionList.map((opt) => (
                    <SelectItem
                      key={opt.variantText}
                      value={opt.variantText}
                      className={`cursor-pointer py-1 text-[#37352f] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333] ${
                        isMobile
                          ? "!text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))]"
                          : "!text-[length:calc(16px*var(--reading-font-scale,1))]"
                      }`}
                    >
                    {isMobile ? (
                      `${opt.variantText}. ${opt.answer}`
                    ) : (
                      <span className="font-semibold">{opt.variantText}</span>
                    )}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </span>
        );
      } else {
        parts.push(<span key={`${keyPrefix}-u-${qNum}`}>{match[0]}</span>);
      }
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(
        <HighlightableText
          key={`${keyPrefix}-t-end`}
          text={text.slice(lastIndex)}
          partNumber={partNumber}
          as="span"
          wrapperAs="span"
          className="reading-text"
          reviewSourceText={contentBody}
          reviewSourceOffset={sourceOffset + lastIndex}
        />
      );
    }

    return parts;
  };

  const renderContentWithBlanks = (isMobile: boolean) => {
    if (!contentBody) return null;
    const paragraphs: Array<{ text: string; start: number }> = [];
    const separator = /\r?\n[ \t]*\r?\n/g;
    let start = 0;
    let match: RegExpExecArray | null;

    while ((match = separator.exec(contentBody)) !== null) {
      if (match.index > start) {
        paragraphs.push({
          text: contentBody.slice(start, match.index),
          start,
        });
      }
      start = separator.lastIndex;
    }
    if (start < contentBody.length) {
      paragraphs.push({ text: contentBody.slice(start), start });
    }

    return paragraphs.map((paragraph, idx) => (
      <p key={`p-${idx}`} className="leading-relaxed">
        {renderInlineText(
          paragraph.text,
          isMobile,
          `p-${idx}`,
          paragraph.start,
        )}
      </p>
    ));
  };

  return (
    <div className="mx-2 reading-body reading-body-part1-mobile overflow-hidden pr-2 text-slate-800">
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden">
        <div className="overflow-hidden rounded-md border reading-surface">
          <div className="reading-surface p-3">
            {contentTitle && (
              <div className="reading-passage-title">
                {contentTitle}
              </div>
            )}
            <div className={contentTitle ? "mt-3" : ""}>
              <div className="space-y-4 reading-text reading-primary-copy">
                {contentBody && renderContentWithBlanks(true)}
              </div>
              <ReadingReviewOptionList
                options={reviewOptions}
                className="mt-4"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Resizable */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full overflow-hidden border-y border-[#e5e5e2]">
          <ResizablePanel defaultSize={60} minSize={30} className="reading-surface">
            <div className="h-full overflow-y-auto overscroll-contain p-5 pb-32 scrollbar-ultra-thin reading-scroll-ultra scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll touch-pan-y">
              <div className="space-y-4 reading-text reading-primary-copy reading-passage-copy">
                {contentTitle && (
                  <div className="reading-passage-title mb-3">
                    <HighlightableText text={contentTitle} partNumber={partNumber} />
                  </div>
                )}
                {contentBody && renderContentWithBlanks(false)}
              </div>
            </div>
          </ResizablePanel>

          <ReadingSplitHandle />

          <ResizablePanel defaultSize={40} minSize={20} className="reading-surface-alt min-h-0">
            <div className="h-full max-h-full overflow-y-auto overscroll-contain p-5 pb-32 scrollbar-ultra-thin reading-scroll-ultra scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll touch-pan-y">
              <div className="reading-options-heading mb-3">{`Se\u00e7enekler`}</div>
              {review ? (
                <ReadingReviewOptionList options={reviewOptions} />
              ) : (
                <div className="space-y-2">
                  {optionList.map((opt) => {
                    return (
                    <ReadingOptionLegendRow
                      key={opt.variantText}
                      letter={opt.variantText}
                      text={opt.answer}
                      selectionCount={countOptionSelections(answers, questionIds, opt.variantText)}
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
