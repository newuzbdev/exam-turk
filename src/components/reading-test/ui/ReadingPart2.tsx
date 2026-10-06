import { ResizablePanelGroup, ResizablePanel } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  ReadingReviewOptionList,
  useReadingReviewContext,
} from "@/components/results/ReadingReviewContext";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import { fixMojibake } from "@/utils/text";
import { protectedImageProps } from "@/utils/mediaProtection";
import ReadingOptionLegendRow from "./ReadingOptionLegendRow";
import { countOptionSelections } from "@/utils/selection-count";
import ReadingQuestionNumber from "./ReadingQuestionNumber";
import ReadingSplitHandle from "./ReadingSplitHandle";

interface ReadingPart2Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

const SELECT_PLACEHOLDER = "Se\u00e7";

const API_BASE_URL = ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, ""))
  || (import.meta.env.DEV ? "http://localhost:3000" : "https://api.turkishmock.uz");

const toApiUrl = (path: string) => `${API_BASE_URL}/${path.replace(/^\//, "")}`;

export default function ReadingPart2({ testData, answers, onAnswerChange, partNumber }: ReadingPart2Props) {
  const review = useReadingReviewContext();
  const part2 = (testData.parts || []).find((p: any) => (p.number || 0) === 2) || (testData.parts || [])[1];
  const sections = part2?.sections || [];
  
  // Build options list across part 2 sections (A..J)
  const optionMap = new Map<string, { variantText: string; answer: string }>();
  sections.forEach((s: any) => (s.questions || []).forEach((q: any) => (q.answers || []).forEach((a: any) => {
    const variantText = fixMojibake(String(a.variantText || "")).trim();
    const answer = fixMojibake(String(a.displayText ?? a.answer ?? "")).trim();
    if (variantText && !optionMap.has(variantText)) {
      optionMap.set(variantText, { variantText, answer });
    }
  })));
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));
  const reviewOptions = optionList.map((option) => ({
    value: option.variantText,
    label: `${option.variantText}. ${option.answer}`,
  }));
  // Flatten questions and show all available questions for this part
  const allQuestions = sections.flatMap((s: any) => s.questions || []);
  const numbered = allQuestions.sort((a: any, b: any) => {
    const aNum = typeof a.number === 'number' ? a.number : 0;
    const bNum = typeof b.number === 'number' ? b.number : 0;
    return aNum - bNum;
  });
  const questionIds = numbered.map((question: any) => String(question.id));
  const normalizeSelectedVariant = (value: unknown) =>
    String(value || "").trim().replace(/\.$/, "");
  const makeImageSrc = (u: string) => {
    let src = u.trim();
    if (/^(?:\/)?uploads\//i.test(src)) {
      src = toApiUrl(src.replace(/^\//, ""));
    }
    return src;
  };

  const renderContent = (raw: string, qNum: number) => {
    const normalizedRaw = fixMojibake(raw);
    if (!normalizedRaw) return null;
    const nodes: any[] = [];
    const pattern = /!\[[^\]]*\]\(([^)]+)\)|@?(https?:\/\/[^\s)]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s)]*)?)|@?(?:^|\s)(\/??uploads\/[\w\-./]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s)]*)?)/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(normalizedRaw)) !== null) {
      const start = match.index;
      if (start > lastIndex) {
        const textChunk = normalizedRaw.slice(lastIndex, start).trim();
        if (textChunk) nodes.push(
          <div key={`t-${lastIndex}`} className="mb-2">
            <HighlightableText text={textChunk} partNumber={partNumber} />
          </div>
        );
      }
      const urlFromMd = match[1];
      const urlFromHttp = match[2];
      const urlFromUploads = match[3];
      let src = urlFromMd || urlFromHttp || urlFromUploads || "";
      src = src.replace(/^\(|\)/g, "");
      if (/^(?:\/)?uploads\//i.test(src)) {
        src = toApiUrl(src.replace(/^\//, ""));
      }
      if (src) {
        nodes.push(
          <img
            {...protectedImageProps}
            key={`i-${start}`}
            src={src}
            alt={`S${qNum} görseli`}
            className="w-full max-w-[520px] h-auto max-h-[340px] object-contain border border-gray-200 rounded my-2 mx-auto"
            onError={(e) => {
              const el = e.target as HTMLImageElement;
              el.style.display = "none";
            }}
          />
        );
      }
      lastIndex = pattern.lastIndex;
    }
    if (lastIndex < normalizedRaw.length) {
      const tail = normalizedRaw.slice(lastIndex).trim();
      if (tail) nodes.push(
        <div key={`t-tail`} className="mb-2">
          <HighlightableText text={tail} partNumber={partNumber} />
        </div>
      );
    }
    return nodes.length ? <div className="reading-text reading-primary-copy reading-passage-copy text-left font-sans">{nodes}</div> : null;
  };

  return (
    <div
      className="mx-2 reading-body overflow-hidden text-slate-800"
    >
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden h-[calc(100svh-14rem)]">
        <div className="h-full flex flex-col">
          {/* Questions Section - More scroll space for mobile */}
          <div className="bg-gray-50 flex-1 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent p-3 pb-[calc(9rem+env(safe-area-inset-bottom))] reading-scroll">
            <h4 className="text-[13px] font-bold text-slate-700 mb-2">Sorular</h4>
            <ReadingReviewOptionList
              options={reviewOptions}
              className="mb-3"
            />
            <div className="space-y-3">
              {numbered.map((q: any, idx: number) => {
                const qNum = q.number || (7 + idx);
                const hasImage = typeof q.imageUrl === 'string' && q.imageUrl.length > 0;
                const selectedVariant = normalizeSelectedVariant(answers[q.id]);
                const selectedOption = optionMap.get(selectedVariant);
                const mobileCardWidthClass = hasImage ? "w-[clamp(300px,88vw,380px)] max-w-full mx-auto" : "w-full";
                const selectValue = selectedVariant || "__none__";

                return (
                    <div
                      key={q.id}
                      className={`rounded-lg p-2.5 border border-gray-200 bg-white ${mobileCardWidthClass}`}
                  >
                    <Select
                      value={selectValue}
                      onValueChange={(value) => onAnswerChange(q.id, value === "__none__" ? "" : value)}
                    >
                      <SelectTrigger className={`reading-select-trigger mb-2 w-full ${
                        selectedOption ? "reading-select-trigger-selected" : ""
                      }`}>
                        <SelectValue placeholder="">
                          <span className="block min-w-0 pr-5 text-left leading-snug whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2">
                            <span className="font-bold">{`S${qNum}.`}</span>
                            <span>{selectedOption ? ` ${selectedOption.variantText}. ${selectedOption.answer}` : ` ${SELECT_PLACEHOLDER}`}</span>
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={8}
                        collisionPadding={12}
                        className="bg-white border border-gray-200 shadow-sm rounded-md reading-select-content w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] max-h-[65vh] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50"
                      >
                        <SelectItem value="__none__" className="cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                          {SELECT_PLACEHOLDER}
                        </SelectItem>
                        {optionList.map((opt) => (
                            <SelectItem
                              key={opt.variantText}
                              value={opt.variantText}
                              className="cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] text-[#37352f] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                            >
                            <span className="block whitespace-normal break-words [overflow-wrap:anywhere]">
                              {opt.variantText}. {opt.answer}
                            </span>
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasImage ? (
                      <div className="space-y-2">
                        <div className="flex justify-center">
                          <img
                            {...protectedImageProps}
                            src={makeImageSrc(q.imageUrl as string)}
                            alt={`S${qNum} görseli`}
                            className="w-full h-auto object-contain rounded"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = 'none';
                            }}
                          />
                        </div>
                        {q.text && (
                          <p className="reading-text bg-gray-50 px-2 py-1 rounded text-center text-slate-600">
                            <HighlightableText text={fixMojibake(q.text || "")} partNumber={partNumber} />
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {q.text && (
                          <h3 className="font-medium italic leading-snug text-[14px] text-slate-700">
                            <HighlightableText text={fixMojibake(q.text || "")} partNumber={partNumber} />
                          </h3>
                        )}
                        <div className="reading-text">
                          {renderContent(q.content || "", qNum)}
                        </div>
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
          {/* Left: Questions 7–14 with selects */}
          <ResizablePanel defaultSize={40} minSize={30} className="reading-surface">
            <div className="h-full p-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-44 reading-scroll">
              <div className="divide-y divide-[#e5e5e2]">
                {numbered.map((q: any, idx: number) => {
                  const qNum = q.number || (7 + idx);
                  const hasImage = typeof q.imageUrl === 'string' && q.imageUrl.length > 0;
                  const selectedVariant = normalizeSelectedVariant(answers[q.id]);
                  const selectedOption = optionMap.get(selectedVariant);
                  const selectValue = selectedVariant || "__none__";

                  return (
                    <div
                      key={q.id}
                      id={`reading-question-desktop-${qNum}`}
                      className={`py-5 first:pt-0 ${
                        hasImage ? "mx-auto w-[520px] max-w-full" : ""
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
                          <ReadingQuestionNumber number={qNum} />
                          {q.text && (
                            <h3 className="reading-strong-title min-w-0 font-semibold italic leading-snug text-[#37352f]">
                              <HighlightableText
                                text={fixMojibake(q.text || "")}
                                partNumber={partNumber}
                              />
                            </h3>
                          )}
                        </div>
                        <Select
                          value={selectValue}
                          onValueChange={(value) =>
                            onAnswerChange(q.id, value === "__none__" ? "" : value)
                          }
                        >
                          <SelectTrigger
                            aria-label={`Soru ${qNum} için seçenek`}
                            className={`reading-select-trigger reading-part2-compact-select !h-9 !min-h-9 w-[88px] shrink-0 ${
                              selectedOption ? "reading-select-trigger-selected" : ""
                            }`}
                          >
                            <SelectValue placeholder="">
                              <span className="font-semibold">
                                {selectedOption?.variantText || SELECT_PLACEHOLDER}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="reading-select-content reading-part2-letter-menu z-50 max-h-[60vh] w-[88px] min-w-[88px] max-w-[88px] overflow-y-auto overscroll-contain rounded-md border border-gray-200 bg-white shadow-sm scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300/40">
                            <SelectItem
                              value="__none__"
                              className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                            >
                              {SELECT_PLACEHOLDER}
                            </SelectItem>
                            {optionList.map((opt) => (
                                <SelectItem
                                  key={opt.variantText}
                                  value={opt.variantText}
                                  className="cursor-pointer py-1 !text-[length:calc(16px*var(--reading-font-scale,1))] text-[#37352f] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                                >
                                <span className="font-semibold">{opt.variantText}</span>
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {hasImage ? (
                        <div className="relative overflow-hidden rounded-md">
                          <img
                            {...protectedImageProps}
                            src={makeImageSrc(q.imageUrl as string)}
                            alt={`S${qNum} görseli`}
                            className="h-auto max-h-[700px] w-full max-w-none object-contain"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : (
                        renderContent(q.content || "", qNum)
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ResizablePanel>

          <ReadingSplitHandle />

          {/* Right: Options legend A..J - Fixed Sidebar */}
          <ResizablePanel defaultSize={60} minSize={25} className="reading-surface-alt">
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
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
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
