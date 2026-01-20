import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";

interface ReadingPart5Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart5({ testData, answers, onAnswerChange, partNumber }: ReadingPart5Props) {
  const part5 = (testData.parts || []).find((p: any) => (p.number || 0) === 5) || (testData.parts || [])[4];
  const section5 = part5?.sections && part5.sections[0];
  const content = section5?.content || "";
  const questions = (section5?.questions || []);
  const orderedQuestions = [...questions].sort((a: any, b: any) => {
    const an = typeof a.number === 'number' ? a.number : 0;
    const bn = typeof b.number === 'number' ? b.number : 0;
    return an - bn;
  });
  
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

  // Helper: per-question options (A-D)
  const getQuestionOptions = (question: any) => {
    const opts = (question.answers || []).map((a: any) => ({
      variantText: a.variantText,
      answer: a.answer,
    }));
    return opts.sort((a: any, b: any) => a.variantText.localeCompare(b.variantText));
  };

  // Parse content to extract paragraphs A-E in multiple possible formats
  const parseParagraphs = (rawContent: string) => {
    const paragraphs: { letter: string; text: string }[] = [];
    if (!rawContent) return paragraphs;

    // Normalize Windows/Mac newlines to \n
    const content = rawContent.replace(/\r\n?|\r/g, '\n');

    // Strategy 1: Regex capture for formats like "A) ...", "A. ...", "A - ..."
    const blockRegex = /(\n|^)\s*([A-E])[)\.-]?\s+([\s\S]*?)(?=(\n\s*[A-E][)\.-]?\s+|$))/g;
    const matched: { letter: string; text: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(content)) !== null) {
      const letter = m[2];
      const text = (m[3] || '').trim();
      if (letter && text) matched.push({ letter, text });
    }
    if (matched.length >= 1) {
      // Keep only first five A-E and sort by letter
      const unique = new Map<string, string>();
      for (const { letter, text } of matched) {
        if (!unique.has(letter) && letter >= 'A' && letter <= 'E') unique.set(letter, text);
      }
      const ordered = Array.from(unique.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([letter, text]) => ({ letter, text }));
      return ordered;
    }

    // Strategy 2: Letter on its own line followed by text lines until next letter line
    const lines = content.split('\n');
    let currentLetter = '';
    let buffer: string[] = [];
    const pushIfValid = () => {
      const text = buffer.join(' ').trim();
      if (currentLetter && text) paragraphs.push({ letter: currentLetter, text });
    };
    for (const line of lines) {
      const trimmed = line.trim();
      const singleLetter = /^[A-E]$/.test(trimmed);
      const letterHeader = /^[A-E][)\.-]?$/.test(trimmed);
      if (singleLetter || letterHeader) {
        // flush previous
        pushIfValid();
        currentLetter = trimmed[0];
        buffer = [];
      } else if (trimmed.length) {
        buffer.push(trimmed);
      }
    }
    pushIfValid();
    if (paragraphs.length >= 1) {
      // Ensure A-E order and limit to five
      const unique = new Map<string, string>();
      for (const p of paragraphs) {
        if (!unique.has(p.letter) && p.letter >= 'A' && p.letter <= 'E') unique.set(p.letter, p.text);
      }
      return Array.from(unique.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(0, 5)
        .map(([letter, text]) => ({ letter, text }));
    }

    // Strategy 3: Fallback split by double newlines (first five chunks become A-E)
    const sections = content.split(/\n\n+/).filter((s) => s.trim());
    if (sections.length) {
      return sections.slice(0, 5).map((section, index) => ({
        letter: String.fromCharCode(65 + index),
        text: section.trim(),
      }));
    }

    return paragraphs;
  };

  const paragraphs = parseParagraphs(content);

  return (
    <div className="mx-2 pb-24 h-[calc(100vh-200px)] overflow-hidden overscroll-contain pr-2 text-[#333333]" style={{ color: "#333333" }}>
   

      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden">
        <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden">
          {/* Passage Section */}
          <div className="bg-[#F6F5F2] p-4">
            <div className="space-y-4 leading-relaxed">
              <div className="space-y-4">
                {paragraphs.map((para,) => (
                  <div key={`${para.letter}.`} className="flex items-start gap-3">
                    <span className="text-sm font-bold text-[#333333] min-w-[1.5rem]">
                      {`${para.letter}.`}
                    </span>
                    <div className="text-base lg:text-lg leading-relaxed flex-1">
                      <HighlightableText text={para.text} partNumber={partNumber} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Questions Section - More scroll space for mobile */}
          <div className="bg-[#F4F4F4] p-4 space-y-4 pb-32">
            <h4 className="text-base font-bold text-[#333333] mb-3">Sorular</h4>
            {/* Static instruction for 30-32 (always visible at top) */}
            <div className="bg-gray-100 border border-gray-200 p-3 mb-3 rounded-lg">
              <p className="text-sm font-semibold text-[#333333] font-sans leading-relaxed">
                 Sorular 30-32. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
              </p>
            </div>
            {/* S33-35 instruction will appear right before question 33 */}
            {orderedQuestions.map((q: any, idx: number) => {
              const questionNumber = q.number || (30 + idx);
              const isParagraphQuestion = questionNumber >= 33; // Questions 33-35 are paragraph matching
              
              return (
                <div key={q.id} className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">

                  {/* Static instruction for 33-35 (render once above S33) */}
                  {isParagraphQuestion && questionNumber === 33 && (
                    <div className="bg-gray-100 border border-gray-200 p-3 mb-3 rounded-lg">
                      <p className="text-xs font-semibold text-[#333333] font-sans leading-relaxed">
                         Sorular 33-35. Aşağıdaki cümleleri (33-35) okuyunuz. Cümlelerin hangi paragraflara (A-E) ait olduğunu bulunuz. Seçilmemesi gereken iki paragraf bulunmaktadır.
                      </p>
                    </div>
                  )}

                  {/* Render question types */}
                  {isParagraphQuestion ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">S{questionNumber}.</span>
                        <div className="w-20">
                          <Select value={(answers[q.id] || "")} onValueChange={(v) => onAnswerChange(q.id, v)}>
                            <SelectTrigger className="h-8 text-xs bg-white cursor-pointer">
                              <SelectValue placeholder="A-E">
                                  {answers[q.id] ? `${answers[q.id]}.` : "A-E"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {(optionList.length ? optionList.map(o => o.variantText) : ["A","B","C","D","E"]).map((letter) => (
                                <SelectItem key={letter} value={String(letter)}>{String(letter)}.</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-[#333333]">
                        <HighlightableText
                          text={q.text || q.question || "Hangi paragrafta yer almaktadır?"}
                          partNumber={partNumber}
                        />
                      </p>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-bold text-base">S{questionNumber}. <span className="font-normal">{q.text || q.question || ''}</span></div>
                      {getQuestionOptions(q).map((opt: any) => (
                        <div
                          key={opt.variantText}
                          className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => onAnswerChange(q.id, opt.variantText)}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            answers[q.id] === opt.variantText ? "border-[#438553]" : "border-gray-400"
                          }`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              answers[q.id] === opt.variantText ? "bg-[#438553]" : "bg-transparent"
                            }`} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-sm">{opt.variantText}.</span>
                            <span className="text-sm font-normal">{opt.answer}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
          </div>
        </div>
      </div>

      {/* Desktop Layout - Resizable */}
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Left: Passage (fixed) */}
          <ResizablePanel defaultSize={60} minSize={50} maxSize={70} className="bg-[#F6F5F2]">
            <div className="h-full p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-32">
              <div className="space-y-6 leading-relaxed">
                <div className="space-y-6">
                  {paragraphs.map((para) => (
                    <div key={`${para.letter}.`} className="flex items-start gap-4">
                      <span className="text-base font-bold text-[#333333] min-w-[1.75rem]">
                        {`${para.letter}.`}
                      </span>
                      <div className="text-lg md:text-xl leading-relaxed flex-1">
                        <HighlightableText text={para.text} partNumber={partNumber} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-gray-200/40 hover:bg-gray-300/60 transition-colors w-px" />

          {/* Right: Answers (scrollable & resizable) */}
          <ResizablePanel defaultSize={40} minSize={20} className="bg-[#F4F4F4] min-h-0">
            <div className="h-full max-h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-32">
              {/* Static instruction for 30-32 (always visible at top) */}
              <div className="bg-gray-100 border border-gray-200 p-3 mb-2 rounded-lg">
                <p className="text-xl font-semibold text-[#333333] font-sans leading-relaxed">
                   Sorular 30-32. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
                </p>
              </div>
              {/* S33-35 instruction will appear right before question 33 */}

              <div className="space-y-4 mb-8">
                {orderedQuestions.map((q: any, idx: number) => {
                  const questionNumber = q.number || (30 + idx);
                  const isParagraphQuestion = questionNumber >= 33; // Questions 33-35 are paragraph matching
                  
                  return (
                    <div key={q.id} className="space-y-2">
                      {/* Static instruction for 33-35 (render once above S33) */}
                      {isParagraphQuestion && questionNumber === 33 && (
                        <div className="bg-gray-100 border border-gray-200 p-3 mb-2 rounded-lg">
                          <p className="text-lg md:text-xl font-semibold text-[#333333] font-sans leading-relaxed">
                             Sorular 33-35. Aşağıdaki cümleleri (33-35) okuyunuz. Cümlelerin hangi paragraflara (A-E) ait olduğunu bulunuz. Seçilmemesi gereken iki paragraf bulunmaktadır.
                          </p>
                        </div>
                      )}

                      {isParagraphQuestion ? (
                        <>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">S{questionNumber}.</span>
                            <div className="w-28">
                              <Select value={(answers[q.id] || "")} onValueChange={(v) => onAnswerChange(q.id, v)}>
                                <SelectTrigger className="h-10 text-lg font-bold bg-white cursor-pointer">
                                  <SelectValue placeholder="A-E">
                                  {answers[q.id] ? `${answers[q.id]}.` : "A-E"}
                                </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  {(optionList.length ? optionList.map(o => o.variantText) : ["A","B","C","D","E"]).map((letter) => (
                                    <SelectItem key={letter} value={String(letter)}>{String(letter)}.</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <p className="text-base md:text-lg font-medium text-[#333333]">
                            <HighlightableText
                              text={q.text || q.question || "Hangi paragrafta yer almaktadır?"}
                              partNumber={partNumber}
                            />
                          </p>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <div className="font-bold text-lg">S{questionNumber}. <span className="font-normal">{q.text || q.question || ''}</span></div>
                          {getQuestionOptions(q).map((opt: any) => (
                            <div
                              key={opt.variantText}
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
                              onClick={() => onAnswerChange(q.id, opt.variantText)}
                            >
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                answers[q.id] === opt.variantText ? "border-[#438553]" : "border-gray-400"
                              }`}>
                                <div className={`w-3 h-3 rounded-full ${
                                  answers[q.id] === opt.variantText ? "bg-[#438553]" : "bg-transparent"
                                }`} />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{opt.variantText}.</span>
                                <span>{opt.answer}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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

















