import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useState } from "react";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";

interface ReadingPart4Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart4({ testData, answers, onAnswerChange, partNumber }: ReadingPart4Props) {
  const [showPassage, setShowPassage] = useState(true);
  const part4 = (testData.parts || []).find((p: any) => (p.number || 0) === 4) || (testData.parts || [])[3];
  const section4 = part4?.sections && part4.sections[0];
  const content = section4?.content || "";
  const [titleLine, ...bodyLines] = String(content).split(/\r?\n/);
  const contentTitle = (titleLine || "").trim();
  const contentBody = bodyLines.join("\n").trim();
  const questions = (section4?.questions || []);
  const orderedQuestions = [...questions].sort((a: any, b: any) => {
    const aNum = typeof a.number === "number" ? a.number : 0;
    const bNum = typeof b.number === "number" ? b.number : 0;
    return aNum - bNum;
  });
  
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
    <div className="mx-2 reading-body overflow-hidden pr-2 text-slate-800">
      {/* Mobile Layout - Stacked */}
      <div className="block lg:hidden h-full">
        <div className="rounded-lg border border-gray-200 shadow-lg overflow-hidden h-full flex flex-col">
          {/* Passage Section - Fixed */}
          <div className="reading-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm reading-strong-title text-slate-800">Metin</div>
              <button
                type="button"
                className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-md px-2 py-1 bg-white"
                onClick={() => setShowPassage((v) => !v)}
              >
                {showPassage ? "Metni Gizle" : "Metni Göster"}
              </button>
            </div>
            {showPassage && (
              <div className="space-y-4 leading-relaxed max-h-[38vh] overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
                <div className="reading-text font-sans leading-relaxed">
                  {contentTitle && (
                    <div className="reading-strong-title text-slate-800 mb-3">
                      <HighlightableText text={contentTitle} partNumber={partNumber} />
                    </div>
                  )}
                  {contentBody && <HighlightableText text={contentBody} partNumber={partNumber} />}
                </div>
              </div>
            )}
          </div>
          
          {/* Questions Section - More scroll space for mobile */}
          <div className="reading-surface-alt p-4 space-y-4 flex-1 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
            <h4 className="text-sm reading-strong-title text-slate-700 mb-3 tracking-wide">Sorular</h4>
            
            {/* Instructions for Questions 21-24 */}
            <div className="reading-surface-card border p-3 mb-3 rounded-lg">
              <p className="text-sm font-semibold leading-relaxed">
                Sorular 21-24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
              </p>
            </div>
            
            {orderedQuestions.map((q: any, idx: number) => {
              const questionNumber = q.number || (idx + 21);
              const isTrueFalseQuestion = questionNumber >= 25;
              
              return (
                <div key={q.id} className="reading-surface-card rounded-lg border p-3">
                  {/* Show instructions for questions 25-29 before the first True/False question */}
                  {isTrueFalseQuestion && questionNumber === 25 && (
                    <div className="reading-surface-card border p-3 mb-3 rounded-lg">
                      <p className="reading-text font-semibold mb-2">
                         Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                      </p>
                      <div className="reading-text space-y-1 font-sans">
                        <p><span className="font-bold">DOĞRU</span> – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                        <p><span className="font-bold">YANLIŞ</span> – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                        <p><span className="font-bold">VERİLMEMİŞ</span> – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                      </div>
                    </div>
                  )}
                    <div className="space-y-2">
                    <div className="font-medium font-sans reading-text text-slate-800">
                      <span className="font-bold">S{questionNumber}.</span>{" "}
                      <span className="font-normal">
                        <HighlightableText
                          text={q.text || q.question || ""}
                          partNumber={partNumber}
                          as="span"
                          wrapperAs="span"
                        />
                      </span>
                    </div>
                    <div className={`${isTrueFalseQuestion ? 'flex gap-2 flex-wrap' : 'space-y-1'}`}>
                      {getQuestionOptions(q).map((opt: any) => (
                        <div
                          key={opt.variantText}
                          className={`flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer ${isTrueFalseQuestion ? 'flex-1 min-w-[140px] justify-center' : ''}`}
                          onClick={() => onAnswerChange(q.id, opt.variantText)}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            answers[q.id] === opt.variantText ? "border-[#438553]" : "border-gray-400"
                          }`}>
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              answers[q.id] === opt.variantText ? "bg-[#438553]" : "bg-transparent"
                            }`} />
                          </div>
                          <div className="flex items-center gap-1 reading-text text-slate-600">
                            <span className="font-semibold">{opt.variantText}.</span>
                            <span className="font-normal">{opt.answer}</span>
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
      <div className="hidden lg:block h-full">
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-gray-200 shadow-lg h-full">
          {/* Left: Passage - Fixed Size */}
          <ResizablePanel defaultSize={60} minSize={50} maxSize={70} className="reading-surface">
            <div className="h-full p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent pb-32 reading-scroll">
              <div className="space-y-6 leading-relaxed">
                <div className="reading-text font-sans leading-relaxed">
                  {contentTitle && (
                    <div className="reading-strong-title text-slate-800 mb-3">
                      <HighlightableText text={contentTitle} partNumber={partNumber} />
                    </div>
                  )}
                  {contentBody && <HighlightableText text={contentBody} partNumber={partNumber} />}
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle={true} className="bg-gray-200/40 hover:bg-gray-300/60 transition-colors w-px" />

          {/* Right: Answers - Resizable */}
          <ResizablePanel defaultSize={40} minSize={30} maxSize={50} className="reading-surface-alt min-h-0">
            <div className="h-full p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
              {/* Instructions for Questions 21-24 */}
              <div className="bg-gray-50 border border-gray-200/60 p-3 mb-3 rounded-lg">
                <p className="text-sm font-semibold font-sans leading-relaxed text-slate-700">
                  Sorular 21-24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {orderedQuestions.map((q: any, idx: number) => {
                  const questionNumber = q.number || (idx + 21);
                  const isTrueFalseQuestion = questionNumber >= 25;
                  
                  return (
                    <div key={q.id} className="rounded-lg border border-gray-200/60 bg-white/90 p-3">
                      {/* Show instructions for questions 25-29 before the first True/False question */}
                      {isTrueFalseQuestion && questionNumber === 25 && (
                        <div className="bg-gray-50 border border-gray-200/60 p-4 mb-3 rounded-lg">
                          <p className="text-sm font-semibold mb-2 font-sans text-slate-700">
                             Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                          </p>
                          <div className="text-sm space-y-1 font-sans text-slate-600">
                            <p><span className="font-semibold">DOĞRU</span> – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                            <p><span className="font-semibold">YANLIŞ</span> – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                            <p><span className="font-semibold">VERİLMEMİŞ</span> – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                          </div>
                        </div>
                      )}
                      <div className="space-y-2">
                        <div className="font-medium font-sans reading-text text-slate-800">
                          <span className="font-bold">S{questionNumber}.</span>{" "}
                          <span className="font-normal">
                            <HighlightableText
                              text={q.text || q.question || ""}
                              partNumber={partNumber}
                              as="span"
                              wrapperAs="span"
                            />
                          </span>
                        </div>
                        <div className={`${isTrueFalseQuestion ? 'flex gap-2 flex-wrap' : 'space-y-1'} mt-1`}>
                          {getQuestionOptions(q).map((opt: any) => (
                            <div
                              key={opt.variantText}
                              className={`flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer ${isTrueFalseQuestion ? 'flex-1 min-w-[140px]' : ''}`}
                              onClick={() => onAnswerChange(q.id, opt.variantText)}
                            >
                              <div className="flex items-center gap-2 text-[15px] reading-text text-slate-600">
                                <span className="font-semibold">{opt.variantText}.</span>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  answers[q.id] === opt.variantText ? "border-[#438553]" : "border-gray-400"
                                }`}>
                                  <div className={`w-2.5 h-2.5 rounded-full ${
                                    answers[q.id] === opt.variantText ? "bg-[#438553]" : "bg-transparent"
                                  }`} />
                                </div>
                                <span className="font-normal">{opt.answer}</span>
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


