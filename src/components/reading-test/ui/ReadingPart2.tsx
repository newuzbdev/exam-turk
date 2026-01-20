import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";

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
    if (a.variantText && !optionMap.has(a.variantText)) {
      optionMap.set(a.variantText, { variantText: a.variantText, answer: a.answer });
    }
  })));
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));

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
    if (!raw) return null;
    const nodes: any[] = [];
    const pattern = /!\[[^\]]*\]\(([^)]+)\)|@?(https?:\/\/[^\s)]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s)]*)?)|@?(?:^|\s)(\/??uploads\/[\w\-./]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s)]*)?)/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw)) !== null) {
      const start = match.index;
      if (start > lastIndex) {
        const textChunk = raw.slice(lastIndex, start).trim();
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
    if (lastIndex < raw.length) {
      const tail = raw.slice(lastIndex).trim();
      if (tail) nodes.push(
        <div key={`t-tail`} className="mb-2">
          <HighlightableText text={tail} partNumber={partNumber} />
        </div>
      );
    }
    return nodes.length ? <div className="text-[13px] leading-6 text-[#333333] font-sans text-justify" style={{ color: "#333333" }}>{nodes}</div> : null;
  };

  return (
    <div className="mx-2 h-[calc(100vh-200px)] text-[#333333]" style={{ color: "#333333" }}>
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden h-full">
        <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden h-full flex flex-col">
          {/* Questions Section - More scroll space for mobile */}
          <div className="bg-[#F4F4F4] flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent p-4 pb-40">
            <h4 className="text-base font-bold text-[#333333] mb-3">Sorular</h4>
            <div className="space-y-4">
              {numbered.map((q: any, idx: number) => {
                const qNum = q.number || (7 + idx);
                const hasImage = typeof q.imageUrl === 'string' && q.imageUrl.length > 0;

                return (
                  <div key={q.id} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-sm font-bold text-[#333333]" style={{ color: "#333333" }}>S{qNum}</div>
                      <Select
                        value={answers[q.id] || ""}
                        onValueChange={(value) => onAnswerChange(q.id, value)}
                      >
                        <SelectTrigger className="w-20 bg-white border border-gray-300 rounded-md px-2 py-1 h-8 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                          <SelectValue placeholder="Seçiniz">
                                  {answers[q.id] ? `${answers[q.id]}.` : "Seçiniz"}
                                </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50">
                          {optionList.map((opt) => (
                            <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer text-xs py-1">
                              {opt.variantText}. {opt.answer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
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
                          <p className="text-xs text-[#333333] italic bg-gray-50 px-2 py-1 rounded text-center">
                            <HighlightableText text={q.text} partNumber={partNumber} />
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {q.text && (
                          <h3 className="font-semibold text-base leading-snug italic text-[#333333]">
                            <HighlightableText text={q.text} partNumber={partNumber} />
                          </h3>
                        )}
                        <div className="text-sm">
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
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
          {/* Left: Questions 7â€“14 with selects */}
          <ResizablePanel defaultSize={50} minSize={30} className="bg-[#F6F5F2]">
            <div className="h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-24">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-4">
                {numbered.map((q: any, idx: number) => {
                  const qNum = q.number || (7 + idx);
                  const hasImage = typeof q.imageUrl === 'string' && q.imageUrl.length > 0;

                  return (
                    <div key={q.id} className="bg-white/70 rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start gap-4">
                        {hasImage ? (
                          <div className="w-full">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="text-xl font-bold text-[#333333]" style={{ color: "#333333" }}>S{qNum}</div>
                              <Select
                                value={answers[q.id] || ""}
                                onValueChange={(value) => onAnswerChange(q.id, value)}
                              >
                                <SelectTrigger className="w-28 bg-white border border-gray-300 rounded-md px-3 py-2 h-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                                  <SelectValue placeholder="Seçiniz">
                                  {answers[q.id] ? `${answers[q.id]}.` : "Seçiniz"}
                                </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50">
                                  {optionList.map((opt) => (
                                    <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer py-1">
                                      {opt.variantText}. {opt.answer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-3 mb-4">
                              <div className="relative bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                                <img
                                  src={makeImageSrc(q.imageUrl as string)}
                                  alt={`S${qNum} görseli`}
                                  className="w-full max-w-none h-auto max-h-[420px] object-contain bg-white"
                                  onError={(e) => {
                                    const el = e.target as HTMLImageElement;
                                    el.style.display = 'none';
                                  }}
                                />
                              </div>
                              {q.text && (
                                <p className="text-sm text-[#333333] italic bg-gray-50 px-4 py-2 rounded-lg">
                                  <HighlightableText text={q.text} partNumber={partNumber} />
                                </p>
                              )}
                            </div>
                            {/* text now rendered next to the image */}
                          </div>
                        ) : (
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="text-xl font-bold text-[#333333]" style={{ color: "#333333" }}>S{qNum}</div>
                              <Select
                                value={answers[q.id] || ""}
                                onValueChange={(value) => onAnswerChange(q.id, value)}
                              >
                                <SelectTrigger className="w-28 bg-white border border-gray-300 rounded-md px-3 py-2 h-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                                  <SelectValue placeholder="Seçiniz">
                                  {answers[q.id] ? `${answers[q.id]}.` : "Seçiniz"}
                                </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50">
                                  {optionList.map((opt) => (
                                    <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer py-1">
                                      {opt.variantText}. {opt.answer}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {q.text && (
                              <h3 className="font-semibold mb-2 leading-snug italic text-[#333333]">
                                <HighlightableText text={q.text} partNumber={partNumber} />
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
          <ResizablePanel defaultSize={50} minSize={25} className="bg-[#F4F4F4]">
            <div className="h-full flex flex-col">
              <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent">
                <div className="space-y-2">
                  {optionList.map((opt) => (
                    <div key={opt.variantText} className="flex items-start gap-2 p-2 bg-white rounded hover:bg-gray-50 transition-all duration-200 border border-gray-200">
                      <span className="text-sm font-bold text-[#333333] min-w-[1.5rem]">{opt.variantText}.</span>
                      <span className="text-lg leading-tight text-[#333333] pt-0.5 font-normal">{opt.answer}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}














