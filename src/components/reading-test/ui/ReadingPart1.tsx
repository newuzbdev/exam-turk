import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface Question {
  id: string;
  text?: string;
  content?: string;
  answers: Array<{
    id: string;
    variantText: string;
    answer: string;
  }>;
}

interface ReadingPart1Props {
  testData: {
    parts: Array<{
      number: number;
      sections: Array<{
        content: string;
        questions: Question[];
      }>;
    }>;
  };
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
}

export default function ReadingPart1({ testData, answers, onAnswerChange }: ReadingPart1Props) {
  const part1 = testData.parts.find((p) => p.number === 1) || testData.parts[0];
  const section1 = part1?.sections && part1.sections[0];
  const content = section1?.content || "";
  const questions = (section1?.questions || []);
  
  // Build options from answers
  const optionMap = new Map<string, { variantText: string; answer: string }>();
  (section1?.questions || []).forEach((q) => {
    (q.answers || []).forEach((a) => {
      if (a.variantText && !optionMap.has(a.variantText)) {
        optionMap.set(a.variantText, { variantText: a.variantText, answer: a.answer });
      }
    });
  });
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));


  return (
    <div className="mx-2 pb-24 max-h-[calc(100vh-120px)] overflow-y-auto overscroll-contain pr-2">
      <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-gray-300 shadow-lg">
        {/* Left: Passage */}
        <ResizablePanel defaultSize={60} minSize={30} className="bg-[#fffef5]">
          <div className="h-full p-6 overflow-visible pb-32">
            <div className="space-y-4 leading-relaxed">
              <p className="whitespace-pre-line">{content}</p>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

        {/* Right: Answers */}
        <ResizablePanel defaultSize={45} minSize={20} className="bg-white min-h-0">
          <div className="h-full max-h-full p-6 overflow-visible pb-32">
            <div className="space-y-4 mb-8">
              {questions.map((q, idx) => (
                <div key={q.id} className="flex items-center gap-4">
                  <label className="font-bold text-lg w-12">S{idx + 1}.</label>
                  <Select
                    value={answers[q.id] || ""}
                    onValueChange={(value) => onAnswerChange(q.id, value)}
                  >
                    <SelectTrigger className="flex-1 bg-white border border-gray-400 rounded px-2 py-1 h-8 min-w-[10rem]">
                      <SelectValue placeholder="" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionList.map((opt) => (
                        <SelectItem key={opt.variantText} value={opt.variantText}>
                          {opt.variantText}) {opt.answer}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {optionList.map((opt) => (
                <div key={opt.variantText} className="flex items-center gap-3 text-lg">
                  <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-bold bg-white">
                    {opt.variantText}
                  </div>
                  <span>{opt.answer}</span>
                </div>
              ))}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
