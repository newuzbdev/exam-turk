
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface ReadingPart4Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
}

export default function ReadingPart4({ testData, answers, onAnswerChange }: ReadingPart4Props) {
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
    return options.sort((a, b) => a.variantText.localeCompare(b.variantText));
  };

  return (
    <div className="mx-2 pb-24 max-h-[calc(100vh-120px)] overflow-y-auto overscroll-contain pr-2">
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden">
        <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden">
          {/* Passage Section - Fixed */}
          <div className="bg-[#fffef5] p-4 h-64 overflow-y-auto">
            <div className="space-y-4 leading-relaxed">
              <p className="whitespace-pre-line text-base">{content}</p>
            </div>
          </div>
          
          {/* Questions Section - More scroll space for mobile */}
          <div className="bg-white p-4 space-y-4 pb-32">
            <h4 className="text-base font-bold text-gray-800 mb-3">Sorular</h4>
            
            {/* Instructions for Questions 21-24 */}
            <div className="bg-white p-3 mb-4">
              <p className="text-lg font-semibold text-black mb-2 italic">
                Sorular 21-24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
              </p>
            </div>
            
            {questions.map((q: any, idx: number) => {
              const questionNumber = q.number || (idx + 21);
              const isTrueFalseQuestion = questionNumber >= 25;
              
              return (
                <div key={q.id}>
                  {/* Show instructions for questions 25-29 before the first True/False question */}
                  {isTrueFalseQuestion && questionNumber === 25 && (
                    <div className="bg-white p-4 mb-4">
                      <p className="text-lg font-medium text-gray-800 mb-3">
                        Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                      </p>
                      <div className="text-lg text-gray-700 space-y-1 font-sans">
                        <p><span className="font-bold">DOĞRU</span> – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                        <p><span className="font-bold">YANLIŞ</span> – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                        <p><span className="font-bold">VERİLMEMİŞ</span> – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                      </div>
                    </div>
                  )}
                    <div className="space-y-2">
                      <div className="font-bold text-sm">S{questionNumber}. {q.text || q.question || ""}</div>
                    <div className={`${isTrueFalseQuestion ? 'flex gap-4' : 'space-y-2'}`}>
                      {getQuestionOptions(q).map((opt) => (
                        <div
                          key={opt.variantText}
                          className={`flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer ${isTrueFalseQuestion ? 'flex-1 justify-center' : ''}`}
                          onClick={() => onAnswerChange(q.id, opt.variantText)}
                        >
                          <div className={`w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            answers[q.id] === opt.variantText ? "bg-green-500 border-green-500" : "bg-white"
                          }`}>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{opt.variantText})</span>
                            <span className="text-sm">{opt.answer}</span>
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
          <ResizablePanel defaultSize={60} minSize={60} maxSize={60} className="bg-[#fffef5]">
            <div className="h-full p-6 overflow-y-auto">
              <div className="space-y-4 leading-relaxed">
                <p className="whitespace-pre-line text-lg">{content}</p>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

          {/* Right: Answers - Resizable */}
          <ResizablePanel defaultSize={40} minSize={20} maxSize={80} className="bg-white min-h-0">
            <div className="h-full p-6 overflow-y-auto pb-32">
              {/* Instructions for Questions 21-24 */}
              <div className="bg-white p-4 mb-4">
                <p className="text-lg font-semibold text-black mb-2 italic">
                  Sorular 21-24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
                </p>
              </div>
              
              <div className="space-y-4 mb-8">
                {questions.map((q: any, idx: number) => {
                  const questionNumber = q.number || (idx + 21);
                  const isTrueFalseQuestion = questionNumber >= 25;
                  
                  return (
                    <div key={q.id}>
                      {/* Show instructions for questions 25-29 before the first True/False question */}
                      {isTrueFalseQuestion && questionNumber === 25 && (
                        <div className="bg-white p-4 mb-4">
                          <p className="text-lg font-medium text-gray-800 mb-3">
                            Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                          </p>
                          <div className="text-lg text-gray-700 space-y-1 font-sans">
                            <p><span className="font-bold">DOĞRU</span> – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                            <p><span className="font-bold">YANLIŞ</span> – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                            <p><span className="font-bold">VERİLMEMİŞ</span> – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-3">
                        <div className="font-bold text-lg">S{questionNumber}. {q.text || q.question || ""}</div>
                        <div className={`${isTrueFalseQuestion ? 'flex gap-4' : 'space-y-2'}`}>
                          {getQuestionOptions(q).map((opt) => (
                            <div
                              key={opt.variantText}
                              className={`flex items-center gap-4 p-3 rounded hover:bg-gray-50 cursor-pointer ${isTrueFalseQuestion ? 'flex-1 justify-center' : ''}`}
                              onClick={() => onAnswerChange(q.id, opt.variantText)}
                            >
                              <div className={`w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                answers[q.id] === opt.variantText ? "bg-green-500 border-green-500" : "bg-white"
                              }`}>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{opt.variantText})</span>
                                <span className="text-lg">{opt.answer}</span>
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


