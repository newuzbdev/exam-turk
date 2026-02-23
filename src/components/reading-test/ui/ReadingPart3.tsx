import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import { fixMojibake } from "@/utils/text";

interface ReadingPart3Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart3({ testData, answers, onAnswerChange, partNumber }: ReadingPart3Props) {
  const part3 = (testData.parts || []).find((p: any) => (p.number || 0) === 3) || (testData.parts || [])[2];
  const sections = part3?.sections || [];
  
  // Find the section with paragraphs/questions (the one that has questions)
  const paragraphSection = sections.find((s: any) => (s.questions || []).length > 0);
  const paragraphQuestions = (paragraphSection?.questions || []).sort((a: any, b: any) => (a.number || 0) - (b.number || 0));

  // Build options A..H from answers if present; fallback to parsing the first section content (A) .. (H)
  const optionMap = new Map<string, { letter: string; text: string }>();
  (sections || []).forEach((s: any) => (s.questions || []).forEach((q: any) => (q.answers || []).forEach((a: any) => {
    if (a.variantText && a.answer && !optionMap.has(a.variantText)) {
      optionMap.set(a.variantText, { letter: a.variantText, text: a.answer });
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
  const optionSet = new Set(optionList.map((o) => o.letter));
  const selectedVariants = new Set(
    (paragraphQuestions || [])
      .map((q: any) => answers[q.id])
      .filter((v: unknown): v is string => typeof v === "string" && optionSet.has(v))
  );
  return (
    <div className="mx-2 reading-body overflow-hidden text-slate-800">
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden h-full">
        <div className="rounded-lg border border-gray-200 shadow-lg overflow-hidden h-full flex flex-col">
          {/* Questions Section - More scroll space for mobile */}
          <div className="reading-surface-alt flex-1 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent p-4 reading-scroll">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 tracking-wide">Paragraflar</h4>
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
                        onValueChange={(value) => onAnswerChange(q.id, value === "__none__" ? "" : value)}
                      >
                        <SelectTrigger className={`w-full border rounded-md px-3 py-2 min-h-10 h-auto !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] items-start cursor-pointer transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                          selectedOption ? "border-gray-400 bg-gray-100 text-[#333333]" : "border-gray-200 bg-white text-[#333333] hover:border-gray-300"
                        } focus:ring-1 focus:ring-black/15 focus:ring-offset-0 focus:border-gray-400`}>
                          <SelectValue placeholder="Seçiniz">
                            <span className="block min-w-0 pr-5 text-left leading-snug whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2">
                              {selectedOption ? `${selectedOption.letter}. ${fixMojibake(selectedOption.text)}` : "Seçiniz"}
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
                            {`Se\u00e7iniz`}
                          </SelectItem>
                          {optionList.map((opt) => (
                            <SelectItem key={opt.letter} value={opt.letter} className="cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                              <span className="block whitespace-normal break-words [overflow-wrap:anywhere]">
                                {opt.letter}. {fixMojibake(opt.text)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {displayText && (
                      <div className="reading-text font-sans text-justify mt-3">
                        <HighlightableText text={displayText} partNumber={partNumber} />
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
          {/* Left: Paragraphs 15–20, select above text with green bg */}
          <ResizablePanel defaultSize={60} minSize={30} className="reading-surface">
            <div className="h-full p-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-24 reading-scroll">
              <div className="space-y-6">
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
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="font-semibold text-slate-800">{label}</div>
                            <Select
                              value={answers[q.id] || ""}
                              onValueChange={(value) => onAnswerChange(q.id, value === "__none__" ? "" : value)}
                            >
                              <SelectTrigger className={`w-full max-w-[520px] border rounded-md px-3 py-2 h-auto min-h-10 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] items-start cursor-pointer transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                                answers[q.id] ? "border-gray-400 bg-gray-100 text-[#333333]" : "border-gray-200 bg-white text-[#333333] hover:border-gray-300"
                              } focus:ring-1 focus:ring-black/15 focus:ring-offset-0 focus:border-gray-400`}>
                                <SelectValue placeholder="Seçiniz">
                                  <span className="block min-w-0 pr-5 text-left leading-snug whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-2">
                                    {selectedOption ? `${selectedOption.letter}. ${fixMojibake(selectedOption.text)}` : "Seçiniz"}
                                  </span>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-gray-200 shadow-sm rounded-md reading-select-content reading-select-content max-h-[60vh] overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50">
                                <SelectItem value="__none__" className="cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                                  {`Se\u00e7iniz`}
                                </SelectItem>
                                {optionList.map((opt) => (
                                  <SelectItem key={opt.letter} value={opt.letter} className="cursor-pointer py-1 !text-[length:calc(clamp(15px,1.6vw,18px)*var(--reading-font-scale,1))] focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">
                                    {opt.letter}. {opt.text}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {displayText && (
                            <div className="">
                              <div className="text-base leading-7 text-[#333333] font-sans text-justify px-1" style={{ color: "#333333" }}>
                                <HighlightableText text={displayText} partNumber={partNumber} />
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

          <ResizableHandle withHandle={true} className="bg-gray-200/40 hover:bg-gray-300/60 transition-colors w-px" />

          {/* Right: Headings legend A..H (no question labels next to variants) */}
          <ResizablePanel defaultSize={40} minSize={25} className="reading-surface-alt">
            <div className="h-full p-6 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent flex flex-col reading-scroll">
              <div className="text-sm font-semibold text-slate-700 mb-3">{`Se\u00e7enekler`}</div>
              <div className="space-y-2">
                {optionList.map((opt) => {
                  const isUsed = selectedVariants.has(opt.letter);
                  return (
                    <div key={opt.letter} className="flex items-start gap-3">
                      <span className={`font-semibold min-w-[2rem] text-right tabular-nums mt-[3px] ${isUsed ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {opt.letter}.
                      </span>
                      <span className={`reading-text leading-tight font-normal ${isUsed ? "text-slate-400 line-through" : ""}`}>
                        {opt.text}
                      </span>
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






