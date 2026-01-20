import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";

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

  return (
    <div className="mx-2 h-[calc(100vh-200px)]">
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden h-full">
        <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden h-full flex flex-col">
          {/* Questions Section - More scroll space for mobile */}
          <div className="bg-[#fffef5] flex-1 overflow-y-auto p-4 pb-40">
            <h4 className="text-base font-bold text-gray-800 mb-3">Paragraflar</h4>
            <div className="space-y-4">
              {paragraphQuestions.map((q: any, idx: number) => {
                const displayNum = q.number || (15 + idx); // Use actual question number from API
                const displayText = q.text || q.content || "";
                const romans = ["I", "II", "III", "IV", "V", "VI"];
                const label = `S${displayNum}. ${romans[idx]}. paragraf`;
                return (
                  <div key={q.id} className="rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-sm font-bold text-gray-800">{label}</div>
                      <Select
                        value={answers[q.id] || ""}
                        onValueChange={(value) => onAnswerChange(q.id, value)}
                      >
                        <SelectTrigger className="w-20 bg-white border border-gray-300 rounded-md px-2 py-1 h-8 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                          <SelectValue placeholder="Seç">
                            {answers[q.id] ? answers[q.id] : "Seç"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white max-h-48 overflow-y-auto z-50">
                          {optionList.map((opt) => (
                            <SelectItem key={opt.letter} value={opt.letter} className="cursor-pointer text-xs py-1">
                              {opt.letter}) {opt.text}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {displayText && (
                      <div className="text-base lg:text-lg leading-6 text-gray-800 font-serif text-justify">
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
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
          {/* Left: Paragraphs 15–20, select above text with green bg */}
          <ResizablePanel defaultSize={60} minSize={30} className="bg-[#fffef5]">
            <div className="h-full p-6 overflow-y-auto pb-24 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <div className="space-y-6">
                {paragraphQuestions.map((q: any, idx: number) => {
                  const displayNum = q.number || (15 + idx); // Use actual question number from API
                  const displayText = q.text || q.content || "";
                  const romans = ["I", "II", "III", "IV", "V", "VI"];
                  const label = `S${displayNum}. ${romans[idx]}. paragraf`;
                  return (
                    <div key={q.id} className="rounded-xl p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="text-xl font-bold text-gray-800">{label}</div>
                            <Select
                              value={answers[q.id] || ""}
                              onValueChange={(value) => onAnswerChange(q.id, value)}
                            >
                              <SelectTrigger className="w-28 bg-white border border-gray-300 rounded-md px-3 py-2 h-10 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                                <SelectValue placeholder="Seçiniz">
                                  {answers[q.id] ? answers[q.id] : "Seçiniz"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-white max-h-64 overflow-y-auto z-50">
                                {optionList.map((opt) => (
                                  <SelectItem key={opt.letter} value={opt.letter} className="cursor-pointer py-1">
                                    {opt.letter}) {opt.text}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {displayText && (
                            <div className="">
                              <div className="text-base leading-7 text-gray-800 font-serif text-justify">
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

          <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

          {/* Right: Headings legend A..H (no question labels next to variants) */}
          <ResizablePanel defaultSize={40} minSize={25} className="bg-white">
            <div className="h-full p-6 flex flex-col">
              <div className="space-y-3">
                {optionList.map((opt) => (
                  <div key={opt.letter} className="flex items-start gap-3 p-3 bg-white rounded border border-gray-200">
                    <div className="w-7 h-7 rounded-full border-2 border-gray-400 flex items-center justify-center font-bold bg-white text-gray-700 flex-shrink-0 text-base">
                      {opt.letter}
                    </div>
                    <span className="text-lg leading-snug text-gray-800 pt-0.5">{opt.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

