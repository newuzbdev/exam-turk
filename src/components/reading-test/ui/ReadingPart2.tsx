import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import { fixMojibake } from "@/utils/text";

interface ReadingPart2Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart2({ testData, answers, onAnswerChange, partNumber }: ReadingPart2Props) {
  const part2 = (testData.parts || []).find((p: any) => (p.number || 0) === 2) || (testData.parts || [])[1];
  const sections = part2?.sections || [];
  
  // Build options list across part 2 sections (A..J)
  const optionMap = new Map<string, { variantText: string; answer: string }>();
  sections.forEach((s: any) => (s.questions || []).forEach((q: any) => (q.answers || []).forEach((a: any) => {
    const variantText = fixMojibake(String(a.variantText || "")).trim();
    const answer = fixMojibake(String(a.answer || "")).trim();
    if (variantText && !optionMap.has(variantText)) {
      optionMap.set(variantText, { variantText, answer });
    }
  })));
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));
  const optionSet = new Set(optionList.map((o) => o.variantText));
  const selectedVariants = new Set(
    (sections.flatMap((s: any) => s.questions || []) || [])
      .map((q: any) => answers[q.id])
      .filter((v: unknown): v is string => typeof v === "string" && optionSet.has(v))
  );
  // Flatten questions and show all available questions for this part
  const allQuestions = sections.flatMap((s: any) => s.questions || []);
  const numbered = allQuestions.sort((a: any, b: any) => {
    const aNum = typeof a.number === 'number' ? a.number : 0;
    const bNum = typeof b.number === 'number' ? b.number : 0;
    return aNum - bNum;
  });
  const makeImageSrc = (u: string) => {
    let src = u.trim();
    if (/^(?:\/)?uploads\//i.test(src)) {
      src = `https://api.turkishmock.uz/${src.replace(/^\//, '')}`;
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
        src = `https://api.turkishmock.uz/${src.replace(/^\//, '')}`;
      }
      if (src) {
        nodes.push(
          <img
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
    return nodes.length ? <div className="reading-text font-sans text-justify">{nodes}</div> : null;
  };

  return (
    <div
      className="mx-2 reading-body overflow-hidden text-slate-800"
    >
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden h-full">
        <div className="rounded-lg border border-gray-200 shadow-lg overflow-hidden h-full flex flex-col">
          {/* Questions Section - More scroll space for mobile */}
          <div className="reading-surface-alt flex-1 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent p-4 pb-36 reading-scroll">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 tracking-wide">Sorular</h4>
            <div className="space-y-4">
              {numbered.map((q: any, idx: number) => {
                const qNum = q.number || (7 + idx);
                const hasImage = typeof q.imageUrl === 'string' && q.imageUrl.length > 0;
                const selectedVariant = String(answers[q.id] || "").trim().replace(/\.$/, "");
                const selectedOption = optionMap.get(selectedVariant);

                return (
                  <div
                    key={q.id}
                    className="reading-surface-card rounded-lg p-3 border border-gray-200/60 bg-white/80 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
                  >
                    <div className="font-semibold text-slate-800 mb-2">S{qNum}</div>
                    <Select
                      value={selectedVariant || ""}
                      onValueChange={(value) => onAnswerChange(q.id, value === "__none__" ? "" : value)}
                    >
                      <SelectTrigger className={`w-full mb-2 border rounded-md px-3 py-2 min-h-10 h-auto text-xs cursor-pointer transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                        selectedOption ? "border-gray-400 bg-gray-100 text-[#333333]" : "border-gray-200 bg-white text-[#333333] hover:border-gray-300"
                      } focus:ring-1 focus:ring-black/15 focus:ring-offset-0 focus:border-gray-400`}>
                        <SelectValue placeholder="Seçiniz">
                          {selectedOption
                            ? `${selectedOption.variantText}. ${selectedOption.answer}`
                            : "Seçiniz"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        sideOffset={8}
                        collisionPadding={12}
                        className="bg-white border border-gray-200 shadow-sm rounded-md reading-select-content w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] max-h-[55vh] overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50"
                      >
                        <SelectItem value="__none__" className="cursor-pointer text-xs py-1 focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                          {`Seçiniz`}
                        </SelectItem>
                        {optionList.map((opt) => (
                          <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer text-xs py-1 focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                            {opt.variantText}. {opt.answer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasImage ? (
                      <div className="space-y-2">
                        <div className="flex justify-center">
                          <img
                            src={makeImageSrc(q.imageUrl as string)}
                            alt={`S${qNum} görseli`}
                            className="w-full max-w-[300px] h-auto object-contain rounded"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = 'none';
                            }}
                          />
                        </div>
                        {q.text && (
                          <p className="reading-text italic bg-gray-50 px-2 py-1 rounded text-center">
                            <HighlightableText text={fixMojibake(q.text || "")} partNumber={partNumber} />
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {q.text && (
                          <h3 className="font-semibold leading-snug italic">
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
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-200 shadow-lg">
          {/* Left: Questions 7–14 with selects */}
          <ResizablePanel defaultSize={50} minSize={30} className="reading-surface">
            <div className="h-full p-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-44 reading-scroll">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-4">
                {numbered.map((q: any, idx: number) => {
                  const qNum = q.number || (7 + idx);
                  const hasImage = typeof q.imageUrl === 'string' && q.imageUrl.length > 0;
                  const selectedVariant = String(answers[q.id] || "").trim().replace(/\.$/, "");
                  const selectedOption = optionMap.get(selectedVariant);

                  return (
                    <div
                      key={q.id}
                      className="reading-surface-card rounded-lg border border-gray-200/60 bg-white/80 p-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]"
                    >
                      <div className="flex items-start gap-4">
                        {hasImage ? (
                          <div className="w-full">
                          <div className="flex items-center gap-3 mb-2">
                              <div className="text-lg font-semibold text-slate-800">S{qNum}</div>
                                <Select
                                  value={answers[q.id] || ""}
                                  onValueChange={(value) => onAnswerChange(q.id, value === "__none__" ? "" : value)}
                                >
                                <SelectTrigger className={`w-full max-w-[360px] border rounded-md px-3 py-2 h-auto text-sm items-start cursor-pointer transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                                  selectedOption ? "border-gray-400 bg-gray-100 text-[#333333]" : "border-gray-200 bg-white text-[#333333] hover:border-gray-300"
                                } focus:ring-1 focus:ring-black/15 focus:ring-offset-0 focus:border-gray-400`}>
                                  <SelectValue placeholder={`Se\u00e7iniz`}>
                                      <span className="block text-left whitespace-normal leading-snug line-clamp-2">
                                        {selectedOption
                                          ? `${selectedOption.variantText}. ${selectedOption.answer}`
                                          : `Se\u00e7iniz`}
                                      </span>
                                    </SelectValue>
                                  </SelectTrigger>
                                <SelectContent className="bg-white border border-gray-200 shadow-sm rounded-md reading-select-content reading-select-content max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50">
                                  <SelectItem value="__none__" className="cursor-pointer py-1 focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                                    {`Se\u00e7iniz`}
                                  </SelectItem>
                                  {optionList.map((opt) => (
                                    <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer py-1 focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                                      {opt.variantText}. {opt.answer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="relative rounded-md overflow-hidden">
                                <img
                                  src={makeImageSrc(q.imageUrl as string)}
                                  alt={`S${qNum} görseli`}
                                  className="w-full max-w-none h-auto max-h-[420px] object-contain"
                                  onError={(e) => {
                                    const el = e.target as HTMLImageElement;
                                    el.style.display = 'none';
                                  }}
                                />
                              </div>
                              {q.text && (
                                <p className="text-sm text-[#333333] italic bg-gray-50/70 px-3 py-2 rounded-md">
                                  <HighlightableText text={fixMojibake(q.text || "")} partNumber={partNumber} />
                                </p>
                              )}
                            </div>
                            {/* text now rendered next to the image */}
                          </div>
                        ) : (
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="font-semibold text-slate-800">S{qNum}</div>
                              <Select
                                value={answers[q.id] || ""}
                                onValueChange={(value) => onAnswerChange(q.id, value === "__none__" ? "" : value)}
                              >
                                <SelectTrigger className={`w-full max-w-[360px] border rounded-md px-3 py-2 h-auto text-sm items-start cursor-pointer transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                                  selectedOption ? "border-gray-400 bg-gray-100 text-[#333333]" : "border-gray-200 bg-white text-[#333333] hover:border-gray-300"
                                } focus:ring-1 focus:ring-black/15 focus:ring-offset-0 focus:border-gray-400`}>
                                  <SelectValue placeholder={`Se\u00e7iniz`}>
                                    <span className="block text-left whitespace-normal leading-snug line-clamp-2">
                                      {selectedOption
                                        ? `${selectedOption.variantText}. ${selectedOption.answer}`
                                        : `Se\u00e7iniz`}
                                    </span>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-gray-200 shadow-sm rounded-md reading-select-content reading-select-content max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50">
                                  <SelectItem value="__none__" className="cursor-pointer py-1 focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                                    {`Se\u00e7iniz`}
                                  </SelectItem>
                                  {optionList.map((opt) => (
                                    <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer py-1 focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                                      {opt.variantText}. {opt.answer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {q.text && (
                              <h3 className="font-semibold mb-2 leading-snug italic">
                                <HighlightableText text={fixMojibake(q.text || "")} partNumber={partNumber} />
                              </h3>
                            )}
                            {renderContent(q.content || "", qNum)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-gray-200/40 hover:bg-gray-300/60 transition-colors w-px" />

          {/* Right: Options legend A..J - Fixed Sidebar */}
          <ResizablePanel defaultSize={50} minSize={25} className="reading-surface-alt">
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
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





