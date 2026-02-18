import type { ReactNode } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import { fixMojibake } from "@/utils/text";

interface ReadingPart1Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart1({ testData, answers, onAnswerChange, partNumber }: ReadingPart1Props) {
  const part1 = (testData.parts || []).find((p: any) => (p.number || 0) === 1) || (testData.parts || [])[0];
  const section1 = part1?.sections && part1.sections[0];
  const content = fixMojibake(section1?.content || "");
  const [titleLine, ...bodyLines] = String(content).split(/\r?\n/);
  const contentTitle = (titleLine || "").trim();
  const contentBody = bodyLines.join("\n").trim();
  const questions = section1?.questions || [];

  const optionMap = new Map<string, { variantText: string; answer: string }>();
  questions.forEach((q: any) => {
    (q.answers || []).forEach((a: any) => {
      const variantText = fixMojibake(String(a.variantText || "")).trim();
      const answer = fixMojibake(String(a.answer || "")).trim();
      if (variantText && !optionMap.has(variantText)) {
        optionMap.set(variantText, { variantText, answer });
      }
    });
  });
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));
  const optionSet = new Set(optionList.map((o) => o.variantText));
  const selectedVariants = new Set(
    (questions || [])
      .map((q: any) => answers[q.id])
      .filter((v: unknown): v is string => typeof v === "string" && optionSet.has(v))
  );
  const questionByNumber = new Map<number, any>();
  questions.forEach((q: any, idx: number) => {
    const num = typeof q.number === "number" ? q.number : idx + 1;
    questionByNumber.set(num, q);
  });

  const renderInlineText = (text: string, isMobile: boolean, keyPrefix: string) => {
    const parts: ReactNode[] = [];
    const pattern = /_{3,}\s*\(S(\d+)\)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      if (start > lastIndex) {
        const chunk = text.slice(lastIndex, start);
        parts.push(
          <span key={`${keyPrefix}-t-${lastIndex}`} className="reading-text">
            {chunk}
          </span>
        );
      }

      const qNum = Number(match[1]);
      const q = questionByNumber.get(qNum);
      if (q) {
        const selectedVariantRaw = String(answers[q.id] || "").trim();
        const normalizedSelectedVariant = selectedVariantRaw.replace(/\.$/, "");
        const selectedOption = optionMap.get(normalizedSelectedVariant);
        const currentSelectValue = selectedOption ? selectedOption.variantText : "__none__";
        const mobileSelectedText = selectedOption
          ? `${selectedOption.variantText}. ${selectedOption.answer}`
          : "Se\u00e7iniz";
        const desktopSelectedText = selectedOption
          ? selectedOption.variantText
          : normalizedSelectedVariant || "Se\u00e7iniz";
        parts.push(
          <span key={`${keyPrefix}-b-${qNum}`} className="inline-block align-middle mx-1">
            <Select
              value={currentSelectValue}
              onValueChange={(value) => onAnswerChange(q.id, value === "__none__" ? "" : value)}
            >
              <SelectTrigger
                className={
                  isMobile
                    ? "h-7 min-w-[8rem] w-auto bg-white border border-gray-200 rounded-sm px-1.5 py-0 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] leading-none focus:ring-2 focus:ring-[#438553] focus:border-[#438553] cursor-pointer"
                    : "h-9 w-24 bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-[#438553] focus:border-[#438553] cursor-pointer"
                }
              >
                {isMobile ? (
                  <SelectValue placeholder={`Se\u00e7iniz`}>
                    {mobileSelectedText}
                  </SelectValue>
                ) : (
                  <SelectValue placeholder={`Se\u00e7iniz`}>
                    {desktopSelectedText}
                  </SelectValue>
                )}
              </SelectTrigger>
              <SelectContent className="bg-white reading-select-content max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50">
                <SelectItem
                  value="__none__"
                  className={isMobile ? "cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))]" : "cursor-pointer py-1"}
                >
                  {`Se\u00e7iniz`}
                </SelectItem>
                {optionList.map((opt) => (
                  <SelectItem
                    key={opt.variantText}
                    value={opt.variantText}
                    className={isMobile ? "cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))]" : "cursor-pointer py-1"}
                  >
                    {opt.variantText}. {opt.answer}
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
        <span key={`${keyPrefix}-t-end`} className="reading-text">
          {text.slice(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  const renderContentWithBlanks = (isMobile: boolean) => {
    if (!contentBody) return null;
    const paragraphs = contentBody.split(/\r?\n\s*\r?\n/);
    return paragraphs.map((para, idx) => (
      <p key={`p-${idx}`} className="leading-relaxed">
        {renderInlineText(para.replace(/\r?\n/g, "\n"), isMobile, `p-${idx}`)}
      </p>
    ));
  };

  return (
    <div className="mx-2 reading-body reading-body-part1-mobile overflow-hidden pr-2 text-slate-800">
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden">
        <div className="rounded-lg border reading-surface shadow-lg overflow-hidden">
          <div className="reading-surface p-3">
            <div className="text-sm reading-strong-title text-slate-800">
              {contentTitle || "Metin"}
            </div>
            <div className="mt-3">
              <div className="space-y-4 reading-text">
                {contentBody && renderContentWithBlanks(true)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout - Resizable */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-200 shadow-lg">
          <ResizablePanel defaultSize={60} minSize={30} className="reading-surface">
            <div className="h-full p-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-40 reading-scroll">
              <div className="space-y-4 reading-text">
                {contentTitle && (
                  <div className="reading-strong-title text-slate-800 mb-3">
                    <HighlightableText text={contentTitle} partNumber={partNumber} />
                  </div>
                )}
                {contentBody && renderContentWithBlanks(false)}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-gray-200/40 hover:bg-gray-300/60 transition-colors w-px" />

          <ResizablePanel defaultSize={40} minSize={20} className="reading-surface-alt min-h-0">
            <div className="h-full max-h-full p-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-40 reading-scroll">
              <div className="reading-surface-card border border-gray-200 bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-semibold text-slate-700 mb-3">{`Se\u00e7enekler`}</div>
                <div className="space-y-2">
                  {optionList.map((opt) => {
                    const isUsed = selectedVariants.has(opt.variantText);
                    return (
                    <div key={opt.variantText} className="flex items-start gap-3">
                      <span className={`font-semibold min-w-[2rem] text-right tabular-nums mt-[3px] ${isUsed ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {opt.variantText}.
                      </span>
                      <span className={`reading-text leading-tight font-normal ${isUsed ? "text-slate-400 line-through" : ""}`}>
                        {opt.answer}
                      </span>
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}




