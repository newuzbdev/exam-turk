import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";

interface ReadingPart1Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart1({ testData, answers, onAnswerChange, partNumber }: ReadingPart1Props) {
  const part1 = (testData.parts || []).find((p: any) => (p.number || 0) === 1) || (testData.parts || [])[0];
  const section1 = part1?.sections && part1.sections[0];
  const content = section1?.content || "";
  const questions = (section1?.questions || []);
  
  // Build options from answers
  const optionMap = new Map<string, { variantText: string; answer: string }>();
  (section1?.questions || []).forEach((q: any) => {
    (q.answers || []).forEach((a: any) => {
      if (a.variantText && !optionMap.has(a.variantText)) {
        optionMap.set(a.variantText, { variantText: a.variantText, answer: a.answer });
      }
    });
  });
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));


  return (
    <div className="mx-2 pb-24 h-[calc(100vh-200px)] overflow-hidden overscroll-contain pr-2 text-[#333333]" style={{ color: "#333333" }}>
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden">
        <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden">
          {/* Passage Section */}
          <div className="bg-[#F6F5F2] p-4">
            <div className="space-y-4 leading-relaxed">
              <HighlightableText text={content || ""} partNumber={partNumber} />
            </div>
          </div>
          
          {/* Questions Section - More scroll space for mobile */}
          <div className="bg-[#F4F4F4] p-4 space-y-4 pb-32">
            <h4 className="text-base font-bold text-[#333333] mb-3">Sorular</h4>
            {questions.map((q: any, idx: number) => (
              <div key={q.id} className="flex items-center gap-2">
                <label className="font-bold text-base w-8">S{idx + 1}.</label>
                <Select
                  value={answers[q.id] || ""}
                  onValueChange={(value) => onAnswerChange(q.id, value)}
                >
                  <SelectTrigger className="flex-1 bg-white border border-gray-300 rounded-md px-2 py-1 h-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                    <SelectValue placeholder="Seçiniz">
                        {answers[q.id] ? `${answers[q.id]}.` : "Seçiniz"}
                      </SelectValue>
                  </SelectTrigger>
                        <SelectContent className="bg-white max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent z-50">
                          {optionList.map((opt) => (
                            <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer text-sm py-1">
                              {opt.variantText}. {opt.answer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Resizable */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
          {/* Left: Passage */}
          <ResizablePanel defaultSize={60} minSize={30} className="bg-[#F6F5F2]">
            <div className="h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-32">
              <div className="space-y-4 leading-relaxed">
                <HighlightableText text={content || ""} partNumber={partNumber} />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-gray-200/40 hover:bg-gray-300/60 transition-colors w-px" />

          {/* Right: Answers */}
          <ResizablePanel defaultSize={45} minSize={20} className="bg-[#F4F4F4] min-h-0">
            <div className="h-full max-h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-32">
              <div className="space-y-4 mb-8">
                {questions.map((q: any, idx: number) => (
                  <div key={q.id} className="flex items-center gap-4">
                    <label className="font-bold text-lg w-12">S{idx + 1}.</label>
                    <Select
                      value={answers[q.id] || ""}
                      onValueChange={(value) => onAnswerChange(q.id, value)}
                    >
                      <SelectTrigger className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 h-10 min-w-[10rem] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
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
                ))}
              </div>

              <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-6 gap-y-2">
                  {optionList.map((opt) => (
                    <div key={opt.variantText} className="inline-flex items-baseline gap-2 text-lg whitespace-nowrap">
                      <span className="text-base font-bold text-[#333333]">{opt.variantText}.</span>
                      <span>{opt.answer}</span>
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














