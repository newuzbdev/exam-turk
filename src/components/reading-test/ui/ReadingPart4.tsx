import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";

interface ReadingPart4Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart4({ testData, answers, onAnswerChange, partNumber }: ReadingPart4Props) {
  const part4 = (testData.parts || []).find((p: any) => (p.number || 0) === 4) || (testData.parts || [])[3];
  const section4 = part4?.sections && part4.sections[0];
  const content = section4?.content || "";
  const questions = (section4?.questions || []);
  
  // Build options for each question individually
  const getQuestionOptions = (question: any) => {
    const options = (question.answers || []).map((a: any) => ({
      variantText: a.variantText,
      answer: a.answer,
      correct: a.correct
    }));
    return options.sort((a: any, b: any) => a.variantText.localeCompare(b.variantText));
  };

  return (
    <div
      className="mx-2 pb-32 h-[calc(100dvh-180px)] lg:h-[calc(100vh-200px)] overflow-y-auto overscroll-contain pr-2 text-[#333333]"
      style={{ color: "#333333" }}
    >
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden">
        <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden">
          {/* Passage Section - Fixed */}
          <div className="bg-[#F6F5F2] p-4">
            <div className="space-y-4 leading-relaxed">
              <div className="text-base lg:text-lg font-sans text-[#333333] leading-relaxed" style={{ color: "#333333" }}>
                <HighlightableText text={content || ""} partNumber={partNumber} />
              </div>
            </div>
          </div>
          
          {/* Questions Section - More scroll space for mobile */}
          <div className="bg-[#F4F4F4] p-4 space-y-4 pb-32">
            <h4 className="text-base font-bold text-[#333333] mb-3">Sorular</h4>
            
            {/* Instructions for Questions 21-24 */}
            <div className="bg-gray-100 border border-gray-200 p-3 mb-3 rounded-lg">
              <p className="text-sm font-semibold text-[#333333] leading-relaxed">
                Sorular 21-24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
              </p>
            </div>
            
            {questions.map((q: any, idx: number) => {
              const questionNumber = q.number || (idx + 21);
              const isTrueFalseQuestion = questionNumber >= 25;
              
              return (
                <div key={q.id} className="bg-white rounded-lg border border-gray-200 p-3">
                  {/* Show instructions for questions 25-29 before the first True/False question */}
                  {isTrueFalseQuestion && questionNumber === 25 && (
                    <div className="bg-gray-100 border border-gray-200 p-3 mb-3 rounded-lg">
                      <p className="text-sm font-semibold text-[#333333] mb-2">
                         Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                      </p>
                      <div className="text-xs text-[#333333] space-y-1 font-sans" style={{ color: "#333333" }}>
                        <p><span className="font-bold">DOĞRU</span> – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                        <p><span className="font-bold">YANLIŞ</span> – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                        <p><span className="font-bold">VERİLMEMİŞ</span> – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="font-bold text-base font-sans">
                      S{questionNumber}.{" "}
                      <span className="font-normal">
                        <HighlightableText text={q.text || q.question || ""} partNumber={partNumber} />
                      </span>
                    </div>
                    <div className={`${isTrueFalseQuestion ? 'flex gap-2' : 'space-y-1'}`}>
                      {getQuestionOptions(q).map((opt: any) => (
                        <div
                          key={opt.variantText}
                          className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer ${isTrueFalseQuestion ? 'flex-1 justify-center' : ''}`}
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop Layout - Fixed Left, Resizable Right */}
      <div className="hidden lg:block">
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-gray-300 shadow-lg" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Left: Passage - Fixed Size */}
          <ResizablePanel defaultSize={60} minSize={50} maxSize={70} className="bg-[#F6F5F2]">
            <div className="h-full p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-32">
              <div className="space-y-6 leading-relaxed">
                <div className="text-lg font-sans text-[#333333] leading-relaxed" style={{ color: "#333333" }}>
                  <HighlightableText text={content || ""} partNumber={partNumber} />
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-gray-200/40 hover:bg-gray-300/60 transition-colors w-px" />

          {/* Right: Answers - Resizable */}
          <ResizablePanel defaultSize={40} minSize={30} maxSize={50} className="bg-[#F4F4F4] min-h-0">
            <div className="h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-32">
              {/* Instructions for Questions 21-24 */}
              <div className="bg-gray-100 border border-gray-200 p-3 mb-2 rounded-lg">
                <p className="text-lg font-semibold text-[#333333] font-sans leading-relaxed">
                  Sorular 21-24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
                </p>
              </div>
              
              <div className="space-y-3 mb-8">
                {questions.map((q: any, idx: number) => {
                  const questionNumber = q.number || (idx + 21);
                  const isTrueFalseQuestion = questionNumber >= 25;
                  
                  return (
                    <div key={q.id}>
                      {/* Show instructions for questions 25-29 before the first True/False question */}
                      {isTrueFalseQuestion && questionNumber === 25 && (
                        <div className="bg-gray-100 border border-gray-200 p-4 mb-3 rounded-lg">
                          <p className="text-lg font-semibold text-[#333333] mb-2 font-sans">
                             Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                          </p>
                          <div className="text-base text-[#333333] space-y-1 font-sans" style={{ color: "#333333" }}>
                            <p><span className="font-bold">DOĞRU</span> – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                            <p><span className="font-bold">YANLIŞ</span> – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                            <p><span className="font-bold">VERİLMEMİŞ</span> – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="font-bold text-lg font-sans">
                          S{questionNumber}.{" "}
                          <span className="font-normal">
                            <HighlightableText text={q.text || q.question || ""} partNumber={partNumber} />
                          </span>
                        </div>
                        <div className="space-y-1">
                          {getQuestionOptions(q).map((opt: any) => (
                            <div
                              key={opt.variantText}
                              className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer`}
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
                                <span className="font-bold text-lg">{opt.variantText}.</span>
                                <span className="text-lg font-normal">{opt.answer}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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












