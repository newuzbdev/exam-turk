import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface ReadingPart5Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
}

export default function ReadingPart5({ testData, answers, onAnswerChange }: ReadingPart5Props) {
  const part5 = (testData.parts || []).find((p: any) => (p.number || 0) === 5) || (testData.parts || [])[4];
  const section5 = part5?.sections && part5.sections[0];
  const content = section5?.content || "";
  const questions = (section5?.questions || []);
  
  // Build options from answers for paragraph matching (A-E)
  const optionMap = new Map<string, { variantText: string; answer: string }>();
  questions.forEach((q: any) => {
    (q.answers || []).forEach((a: any) => {
      if (a.variantText && !optionMap.has(a.variantText)) {
        optionMap.set(a.variantText, { variantText: a.variantText, answer: a.answer });
      }
    });
  });
  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));

  // Parse content to extract paragraphs A-E
  const parseParagraphs = (content: string) => {
    const paragraphs: { letter: string; text: string }[] = [];
    const lines = content.split('\n');
    let currentLetter = '';
    let currentText = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^[A-E]\)/)) {
        if (currentLetter && currentText) {
          paragraphs.push({ letter: currentLetter, text: currentText.trim() });
        }
        currentLetter = trimmedLine[0];
        currentText = trimmedLine.substring(2).trim();
      } else if (currentLetter && trimmedLine) {
        currentText += ' ' + trimmedLine;
      }
    }
    
    if (currentLetter && currentText) {
      paragraphs.push({ letter: currentLetter, text: currentText.trim() });
    }
    
    // If no paragraphs found with A-E format, try to split by double newlines
    if (paragraphs.length === 0) {
      const sections = content.split('\n\n').filter(section => section.trim());
      sections.forEach((section, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C, D, E
        if (letter <= 'E') {
          paragraphs.push({ letter, text: section.trim() });
        }
      });
    }
    
    return paragraphs;
  };

  const paragraphs = parseParagraphs(content);

  return (
    <div className="mx-2 pb-24 max-h-[calc(100vh-120px)] overflow-y-auto overscroll-contain pr-2">
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden">
        <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden">
          {/* Passage Section */}
          <div className="bg-[#fffef5] p-4">
            <div className="space-y-4 leading-relaxed">
              <h3 className="text-center font-bold text-lg mb-4">E-Kitaplar Okuma Tarzını Değiştiriyor mu?</h3>
              <div className="space-y-4">
                {paragraphs.map((para, idx) => (
                  <div key={para.letter} className="flex items-start gap-3">
                    <span className="font-bold text-lg bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                      {para.letter}
                    </span>
                    <p className="text-sm leading-relaxed">{para.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Questions Section - More scroll space for mobile */}
          <div className="bg-white p-4 space-y-4 pb-32">
            <h4 className="text-base font-bold text-gray-800 mb-3">Sorular</h4>
            {questions.map((q: any, idx: number) => {
              const questionNumber = q.number || (30 + idx);
              const isParagraphQuestion = questionNumber >= 33; // Questions 33-35 are paragraph matching
              
              if (isParagraphQuestion) {
                return (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">S{questionNumber}.</span>
                      <Input 
                        value={answers[q.id] || ''} 
                        onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                        className="w-16 h-8 text-center" 
                        placeholder="A-E"
                      />
                    </div>
                    <p className="text-xs text-gray-600">{q.text || q.question || "Hangi paragrafta yer almaktadır?"}</p>
                  </div>
                );
              } else {
                return (
                  <div key={q.id} className="flex items-center gap-2">
                    <label className="font-bold text-sm w-8">S{questionNumber}.</label>
                    <Select
                      value={answers[q.id] || ""}
                      onValueChange={(value) => onAnswerChange(q.id, value)}
                    >
                      <SelectTrigger className="flex-1 bg-white border border-gray-300 rounded-md px-2 py-1 h-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                        <SelectValue placeholder="Seçiniz">
                          {answers[q.id] ? answers[q.id] : "Seçiniz"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white max-h-48 overflow-y-auto z-50">
                        {optionList.map((opt) => (
                          <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer text-sm py-1">
                            {opt.variantText}) {opt.answer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
            })}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Resizable */}
      <div className="hidden lg:block">
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-gray-300 shadow-lg">
          {/* Left: Passage */}
          <ResizablePanel defaultSize={60} minSize={30} className="bg-[#fffef5]">
            <div className="h-full p-6 overflow-visible pb-32">
              <div className="space-y-4 leading-relaxed">
                <h3 className="text-center font-bold text-lg mb-6">E-Kitaplar Okuma Tarzını Değiştiriyor mu?</h3>
                <div className="space-y-4">
                  {paragraphs.map((para, idx) => (
                    <div key={para.letter} className="flex items-start gap-4">
                      <span className="font-bold text-xl bg-gray-200 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        {para.letter}
                      </span>
                      <p className="text-sm leading-relaxed">{para.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

          {/* Right: Answers */}
          <ResizablePanel defaultSize={45} minSize={20} className="bg-white min-h-0">
            <div className="h-full max-h-full p-6 overflow-visible pb-32">
              <div className="space-y-4 mb-8">
                {questions.map((q: any, idx: number) => {
                  const questionNumber = q.number || (30 + idx);
                  const isParagraphQuestion = questionNumber >= 33; // Questions 33-35 are paragraph matching
                  
                  if (isParagraphQuestion) {
                    return (
                      <div key={q.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">S{questionNumber}.</span>
                          <Input 
                            value={answers[q.id] || ''} 
                            onChange={(e) => onAnswerChange(q.id, e.target.value)} 
                            className="w-20 h-10 text-center text-lg font-bold" 
                            placeholder="A-E"
                          />
                        </div>
                        <p className="text-sm text-gray-600">{q.text || q.question || "Hangi paragrafta yer almaktadır?"}</p>
                      </div>
                    );
                  } else {
                    return (
                      <div key={q.id} className="flex items-center gap-4">
                        <label className="font-bold text-lg w-12">S{questionNumber}.</label>
                        <Select
                          value={answers[q.id] || ""}
                          onValueChange={(value) => onAnswerChange(q.id, value)}
                        >
                          <SelectTrigger className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 h-10 min-w-[10rem] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                            <SelectValue placeholder="Seçiniz">
                              {answers[q.id] ? answers[q.id] : "Seçiniz"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="bg-white max-h-64 overflow-y-auto z-50">
                            {optionList.map((opt) => (
                              <SelectItem key={opt.variantText} value={opt.variantText} className="cursor-pointer py-1">
                                {opt.variantText}) {opt.answer}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }
                })}
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
    </div>
  );
}


