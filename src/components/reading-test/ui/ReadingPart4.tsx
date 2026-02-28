import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";
import { fixMojibake } from "@/utils/text";
import { MoveVertical } from "lucide-react";

interface ReadingPart4Props {
  testData: any;
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
  partNumber?: number;
}

export default function ReadingPart4({ testData, answers, onAnswerChange, partNumber }: ReadingPart4Props) {
  const part4 = (testData.parts || []).find((p: any) => (p.number || 0) === 4) || (testData.parts || [])[3];
  const section4 = part4?.sections && part4.sections[0];
  const content = fixMojibake(section4?.content || "");
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
      variantText: fixMojibake(String(a.variantText || "")).trim(),
      answer: fixMojibake(String(a.answer || "")).trim(),
      correct: a.correct
    }));
    return options.sort((a: any, b: any) => a.variantText.localeCompare(b.variantText));
  };

  return (
    <div className="mx-2 reading-body pr-2 text-slate-800">
      {/* Mobile Layout - Split */}
      <div className="block lg:hidden h-[calc(100svh-14rem)]">
        <ResizablePanelGroup direction="vertical" className="h-full reading-surface">
          <ResizablePanel defaultSize={45} minSize={25} maxSize={75} className="reading-surface min-h-0">
            <div className="h-full p-4 border-b border-gray-200 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll">
              <div className="text-sm reading-strong-title text-slate-800 mb-3">Metin</div>
              <div className="space-y-4 leading-relaxed">
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

          <ResizableHandle
            withHandle={false}
            className="h-[10px] touch-none cursor-row-resize data-[panel-group-direction=vertical]:h-[10px] data-[panel-group-direction=vertical]:my-0 bg-transparent !rounded-none !shadow-none data-[resize-handle-state=hover]:!bg-transparent data-[resize-handle-state=drag]:!bg-transparent"
          >
            <div className="mx-auto flex h-full w-full items-center justify-center">
              <div className="relative w-full">
                <div className="mx-auto h-px w-full bg-black/60" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-white px-1">
                  <MoveVertical className="h-3.5 w-3.5 text-black/80" strokeWidth={2.25} />
                </div>
              </div>
            </div>
          </ResizableHandle>

          <ResizablePanel defaultSize={55} minSize={25} maxSize={75} className="reading-surface-alt min-h-0">
            <div className="h-full p-4 space-y-4 overflow-y-auto overscroll-contain touch-pan-y scrollbar-thin scrollbar-thumb-gray-300/40 scrollbar-track-transparent reading-scroll pb-[calc(10rem+env(safe-area-inset-bottom))]">
            <h4 className="text-sm reading-strong-title text-slate-700 mb-3 tracking-wide">Sorular</h4>
            
            {/* Instructions for Questions 21-24 */}
            <div className="p-2 mb-2">
              <p className="text-sm font-semibold leading-relaxed">
                Sorular 21-24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
              </p>
            </div>
            
            {orderedQuestions.map((q: any, idx: number) => {
              const questionNumber = q.number || (idx + 21);
              const isTrueFalseQuestion = questionNumber >= 25;
              
              const options = getQuestionOptions(q);
              const trueFalseOrder = ["dogru", "yanlis", "verilmemis"];
              const normalizeTf = (value: string) => value
                .toLowerCase()
                .replace(/ğ/g, "g")
                .replace(/ü/g, "u")
                .replace(/ş/g, "s")
                .replace(/ı/g, "i")
                .replace(/ö/g, "o")
                .replace(/ç/g, "c")
                .replace(/[^a-z]/g, "");
              const orderedOptions = isTrueFalseQuestion
                ? [...options].sort((a, b) => {
                    const aText = normalizeTf(`${a.answer || ""} ${a.variantText || ""}`);
                    const bText = normalizeTf(`${b.answer || ""} ${b.variantText || ""}`);
                    const aKey = trueFalseOrder.findIndex((label) => aText.includes(label));
                    const bKey = trueFalseOrder.findIndex((label) => bText.includes(label));
                    return (aKey === -1 ? 99 : aKey) - (bKey === -1 ? 99 : bKey);
                  })
                : options;

              return (
                <div key={q.id} className="py-2 flex flex-col gap-3 border-b border-gray-200 last:border-b-0">
                  {/* Show instructions for questions 25-29 before the first True/False question */}
                  {isTrueFalseQuestion && questionNumber === 25 && (
                    <div className="p-2 mb-2 bg-gray-50">
                      <p className="reading-text font-semibold mb-1">
                         Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                      </p>
                      <div className="reading-text space-y-0.5 font-sans text-[12px]">
                        <p><span className="font-bold">DOĞRU</span> – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                        <p><span className="font-bold">YANLIŞ</span> – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                        <p><span className="font-bold">VERİLMEMİŞ</span> – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    <div className="font-medium font-sans reading-text text-slate-800">
                      <span className="font-bold">S{questionNumber}.</span>{" "}
                      <span className="font-normal">
                        <HighlightableText
                          text={fixMojibake(q.text || q.question || "")}
                          partNumber={partNumber}
                          as="span"
                          wrapperAs="span"
                        />
                      </span>
                    </div>
                    <div className={`${isTrueFalseQuestion ? 'flex flex-col gap-0.5' : 'flex flex-col gap-0.5'}`}>
                      {orderedOptions.map((opt: any) => (
                        <div
                          key={opt.variantText}
                          className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer ${isTrueFalseQuestion ? 'min-w-[140px]' : ''}`}
                          onClick={() => onAnswerChange(q.id, opt.variantText)}
                        >
                          <div className={`relative overflow-hidden w-5 h-5 rounded-full border-[1.75px] flex items-center justify-center flex-shrink-0 transition-all duration-150 ease-out ${
                            answers[q.id] === opt.variantText ? "border-[#438553] scale-[1.02]" : "border-gray-400 scale-100"
                          }`}>
                            <div className={`w-4 h-4 rounded-full transition-all duration-150 ease-out ${
                              answers[q.id] === opt.variantText ? "bg-[#438553] scale-100 opacity-100" : "bg-transparent scale-75 opacity-0"
                            }`} />
                          </div>
                          <div className="flex items-center gap-1 reading-text text-slate-600 text-[12px]">
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
          </ResizablePanel>
        </ResizablePanelGroup>
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
                              text={fixMojibake(q.text || q.question || "")}
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
                                <div className={`relative overflow-hidden w-5 h-5 rounded-full border-[1.75px] flex items-center justify-center flex-shrink-0 transition-all duration-150 ease-out ${
                                  answers[q.id] === opt.variantText ? "border-[#438553] scale-[1.02]" : "border-gray-400 scale-100"
                                }`}>
                                  <div className={`w-4 h-4 rounded-full transition-all duration-150 ease-out ${
                                    answers[q.id] === opt.variantText ? "bg-[#438553] scale-100 opacity-100" : "bg-transparent scale-75 opacity-0"
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
