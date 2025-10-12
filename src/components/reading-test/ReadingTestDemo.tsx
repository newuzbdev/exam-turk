import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../ui/resizable";
import { ConfirmationModal } from "../ui/confirmation-modal";
import { readingTestService, readingSubmissionService, type ReadingTestItem } from "@/services/readingTest.service";
import ReadingPart1 from "./ui/ReadingPart1";
import ReadingPart2 from "./ui/ReadingPart2";
import ReadingPart3 from "./ui/ReadingPart3";

export default function ReadingPage({ testId }: { testId: string }) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [testData, setTestData] = useState<ReadingTestItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPartNumber, setCurrentPartNumber] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Enter fullscreen and lock navigation (exam mode)
  useEffect(() => {
    const addNavigationLock = () => {
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);

      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = "";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        window.removeEventListener("popstate", handlePopState);
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    };

    const enterFullscreen = async () => {
      try {
        const el: any = document.documentElement as any;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) await el.msRequestFullscreen();
      } catch {}
    };

    const cleanup = addNavigationLock();
    enterFullscreen();
    return () => {
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const data = await readingTestService.getTestWithFullData(testId);
        if (mounted) setTestData(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load reading test");
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [testId]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (!testData?.id) {
        console.error("No testId found for submission");
        return;
      }
      const payload = Object.entries(answers).map(([questionId, userAnswer]) => ({ questionId, userAnswer }));
      const res: any = await readingSubmissionService.submitAnswers(testData.id, payload);
      const resultId = res?.testResultId || res?.id || res?.resultId || res?.data?.id || res?.data?.resultId;
      const summary = {
        score: res?.score ?? res?.data?.score,
        correctCount: res?.correctCount ?? res?.data?.correctCount,
        totalQuestions: res?.totalQuestions ?? res?.data?.totalQuestions,
        message: res?.message ?? res?.data?.message,
        testResultId: resultId,
        testId: testData.id,
      } as any;
      if (resultId) {
        try { await readingSubmissionService.getExamResults(resultId); } catch {}
        navigate(`/reading-test/results/${resultId}`, { state: { summary } });
      } else {
        console.error("No resultId found in reading submission response:", res);
      }
    } catch (error) {
      console.error("Reading submit error", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    handleSubmit();
  };

  const handleNextPart = () => {
    const ordered = (testData?.parts || [])
      .map((p) => p.number || 0)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    const unique = Array.from(new Set(ordered));
    if (!unique.length) return;
    const idx = unique.indexOf(currentPartNumber);
    const next = idx >= 0 && idx < unique.length - 1 ? unique[idx + 1] : unique[idx] ?? unique[0];
    setCurrentPartNumber(next);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPart = () => {
    const ordered = (testData?.parts || [])
      .map((p) => p.number || 0)
      .filter((n) => n > 0)
      .sort((a, b) => a - b);
    const unique = Array.from(new Set(ordered));
    if (!unique.length) return;
    const idx = unique.indexOf(currentPartNumber);
    const prev = idx > 0 ? unique[idx - 1] : unique[0];
    setCurrentPartNumber(prev);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const getStaticHeader = (partNumber: number) => {
    if (partNumber === 1) {
      return "Sorular 1-6. Aşağıdaki metni okuyunuz ve alttaki sözcükleri (A–H) kullanarak boşlukları (1-6) doldurunuz. Her sözcük yalnızca bir defa kullanılabilir. Seçmemeniz gereken İKİ seçenek bulunmaktadır.";
    }
    if (partNumber === 2) {
      return "Sorular 7-14. Aşağıda verilen durumları (A–J) ve bilgi metinlerini (7–14) okuyunuz. Her durum için uygun olan metni bulup uygun seçeneği işaretleyiniz. Her seçenek yalnız bir defa kullanılabilir. Seçilmemesi gereken İKİ seçenek bulunmaktadır.";
    }
    if (partNumber === 3) {
      return "Sorular 15-20. Aşağıdaki başlıkları (A–H) ve paragrafları (15–20) okuyunuz. Her paragraf için uygun başlığı seçiniz.";
    }
    if (partNumber === 4) {
      return "21-29. sorular için aşağıdaki metni okuyunuz";
    }
    if (partNumber === 5) {
      return "Sorular 30-35. sorular için aşağıdaki metni okuyunuz.";
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (Listening style) */}
      <div className="bg-white px-3 sm:px-6 py-2 sm:py-3 border-b-2 border-gray-200 grid grid-cols-3 items-center sticky top-0 z-50 gap-2">
        <div className="justify-self-start">
          <div className="bg-red-600 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded font-bold text-base sm:text-lg">TURKISHMOCK</div>
        </div>
        <div className="min-w-0 text-center mx-1 sm:mx-4">
          <div className="font-bold truncate text-base sm:text-2xl leading-tight">
            {/* {testData?.title || "Reading"} */}
            Reading
          </div>
        </div>
        <div className="justify-self-end">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="font-bold text-sm sm:text-lg">{formatTime(timeLeft)}</div>
            <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-1 text-xs sm:text-sm font-bold">GÖNDER</Button>
          </div>
        </div>
      </div>

      {/* Description Section - Responsive */}
      <div className="mx-2 sm:mx-4 mt-2">
        <div className="p-3 sm:p-5 bg-yellow-50 rounded-lg border border-yellow-300">
          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
            {currentPartNumber}. OKUMA METNİ.
          </h3>
          <p className="text-sm sm:text-base lg:text-lg text-gray-700 leading-relaxed">
            {getStaticHeader(currentPartNumber)}
          </p>
        </div>
      </div>

      {/* Minimal info to verify network call */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        {isLoading && <div className="text-sm text-gray-600">Loading reading test...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {/* Dynamic Part Content */}
      {!isLoading && !error && testData && currentPartNumber === 1 && (
        <ReadingPart1 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange} 
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 3 && (
        <ReadingPart3 testData={testData} answers={answers} onAnswerChange={handleAnswerChange} />
      )}

      {!isLoading && !error && testData && currentPartNumber === 4 && (
        <div className="mx-2 h-[calc(100vh-150px)]">
          {/* Desktop/Tablet: side-by-side */}
          <div className="hidden sm:block">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
            {/* Left: Passage content for Part 4 */}
            <ResizablePanel defaultSize={55} minSize={30} className="bg-[#fffef5]">
              <div className="h-full p-6 overflow-y-auto pb-24" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {/* <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-300 mb-4">
                  <h3 className="text-xl font-bold text-gray-800">4. OKUMA METNİ.</h3>
                  <p className="text-base text-gray-800">21-29. sorular için aşağıdaki metni okuyunuz</p>
                </div> */}
                {(() => {
                  const part4 = (testData.parts || []).find((p) => p.number === 4) || (testData.parts || [])[3];
                  const section = part4?.sections?.[0];
                  const content = section?.content || "";
                  return (
                    <div className="space-y-4">
                     
                      <div className="text-base leading-7 space-y-3 font-serif text-justify whitespace-pre-line min-h-[800px]">
                        {content}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

            {/* Right: Questions and static instructions */}
            <ResizablePanel defaultSize={45} minSize={25} className="bg-white">
              <div className="h-full p-6 pb-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ height: 'calc(100vh - 150px)', maxHeight: 'calc(100vh - 150px)' }}>
                <div className="space-y-6">
                  <p className="text-xl font-semibold font-serif">Sorular 21-24. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.</p>

                  {(() => {
                    const part4 = (testData.parts || []).find((p) => p.number === 4) || (testData.parts || [])[3];
                    const section = part4?.sections?.[0];
                    const allQuestions = (section?.questions || []).slice();
                    // In many datasets, question.number resets per part. Map by order: first 4 => 21–24, next 5 => 25–29
                    const firstBlock = allQuestions.slice(0, 4);
                    const secondBlock = allQuestions.slice(4, 9);

                    const renderQuestion = (q: any, globalIdx: number) => {
                      const options = (q.answers || [])
                        .filter((a: any) => typeof a.variantText === 'string' && a.variantText.length)
                        .sort((a: any, b: any) => String(a.variantText).localeCompare(String(b.variantText)));
                      const displayNumber = 21 + globalIdx;
                      return (
                        <div key={q.id} className="space-y-3 pb-6 border-b border-gray-200">
                          <h4 className="font-semibold text-base">S{displayNumber}. {q.text || q.content || ""}</h4>
                          <div className="space-y-2">
                            {options.map((opt: any) => (
                              <label key={opt.id || opt.variantText} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <div className="flex items-center justify-center w-8 h-8 mt-0.5">
                                  <span className="font-bold mr-2">{String(opt.variantText)})</span>
                                  <div className="relative">
                                    <div className="w-5 h-5 mt-1 border-2 border-gray-400 rounded-full bg-white"></div>
                                    {(answers[q.id] || "") === String(opt.variantText) && (
                                      <div className="absolute mt-1 inset-0 w-5 h-5 bg-green-500 rounded-full border-2 border-green-600"></div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <span className="text-base text-gray-700 ml-1">{opt.answer || opt.text || ""}</span>
                                </div>
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={String(opt.variantText)}
                                  checked={(answers[q.id] || "") === String(opt.variantText)}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  className="sr-only"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {/* S21-24 */}
                        {firstBlock.map((q, i) => renderQuestion(q, i))}

                        {/* Static instructions for S25-29 */}
                        <div className="space-y-3 pt-4">
                          <p className="text-xl font-bold font-serif">
                            Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                          </p>
                          <div className="text-base space-y-1 text-gray-700 font-serif">
                            <p>DOĞRU – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                            <p>YANLIŞ – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                            <p>VERİLMEMİŞ – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                          </div>
                        </div>

                        {/* S25-29 */}
                        {secondBlock.map((q, i) => renderQuestion(q, 4 + i))}
                      </>
                    );
                  })()}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          </div>
          {/* Mobile: stacked */}
          <div className="sm:hidden">
            {(() => {
              const part4 = (testData.parts || []).find((p) => p.number === 4) || (testData.parts || [])[3];
              const section = part4?.sections?.[0];
              const content = section?.content || "";
              const allQuestions = (section?.questions || []).slice();
              const firstBlock = allQuestions.slice(0, 4);
              const secondBlock = allQuestions.slice(4, 9);
              const renderQuestion = (q: any, globalIdx: number) => {
                const options = (q.answers || [])
                  .filter((a: any) => typeof a.variantText === 'string' && a.variantText.length)
                  .sort((a: any, b: any) => String(a.variantText).localeCompare(String(b.variantText)));
                const displayNumber = 21 + globalIdx;
                return (
                  <div key={q.id} className="space-y-2 pb-4 border-b border-gray-200">
                    <h4 className="font-semibold text-sm">S{displayNumber}. {q.text || q.content || ""}</h4>
                    <div className="space-y-1">
                      {options.map((opt: any) => (
                        <label key={opt.id || opt.variantText} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={q.id}
                            value={String(opt.variantText)}
                            checked={(answers[q.id] || "") === String(opt.variantText)}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            className="accent-black"
                          />
                          <span className="font-bold mr-1">{String(opt.variantText)})</span>
                          <span className="text-sm text-gray-700">{opt.answer || opt.text || ""}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              };
              return (
                <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden">
                  <div className="bg-[#fffef5] p-4">
                    <div className="text-[15px] leading-7 space-y-3 font-serif text-justify whitespace-pre-line">
                      {content}
                    </div>
                  </div>
                  <div className="bg-white p-4 space-y-4">
                    {firstBlock.map((q, i) => renderQuestion(q, i))}
                    <div className="space-y-1">
                      <p className="text-base font-bold font-serif">
                        Sorular 25-29. Sorulardaki cümleler metne göre DOĞRU, YANLIŞ ya da VERİLMEMİŞ olabilir. İlgili seçeneği işaretleyiniz.
                      </p>
                      <div className="text-sm space-y-1 text-gray-700 font-serif">
                        <p>DOĞRU – cümle, metindeki bilgilerle uygun ve/veya tutarlıysa,</p>
                        <p>YANLIŞ – cümle, metindeki bilgilerle tutarsız ve/veya çelişkiliyse,</p>
                        <p>VERİLMEMİŞ – cümle, metindeki bilgilerde yer almıyor ve/veya belirtilmemişse.</p>
                      </div>
                    </div>
                    {secondBlock.map((q, i) => renderQuestion(q, 4 + i))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {!isLoading && !error && testData && currentPartNumber === 5 && (
        <div className="mx-2 h-[calc(100vh-150px)]">
          {/* Desktop/Tablet: side-by-side */}
          <div className="hidden sm:block">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
            {/* Left: Passage with paragraphs A–E each separated with space */}
            <ResizablePanel defaultSize={55} minSize={30} className="bg-[#fffef5]">
              <div className="h-full p-6 overflow-y-auto pb-24" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {(() => {
                  const part5 = (testData.parts || []).find((p) => p.number === 5) || (testData.parts || [])[4];
                  const section = part5?.sections?.[0];
                  const raw = String(section?.content || "");
                  // Parse blocks starting with A) .. E)
                  const blocks: Array<{ letter: string; text: string }> = [];
                  const regex = /\n?\s*([A-E])\)\s*/g;
                  let lastIndex = 0;
                  let match: RegExpExecArray | null;
                  while ((match = regex.exec(raw)) !== null) {
                    const letter = match[1];
                    const start = match.index + match[0].length;
                    if (blocks.length > 0) {
                      // Cap previous block text at current match start
                      blocks[blocks.length - 1].text = raw.slice(lastIndex, match.index).trim();
                    }
                    blocks.push({ letter, text: "" });
                    lastIndex = start;
                  }
                  if (blocks.length) {
                    blocks[blocks.length - 1].text = raw.slice(lastIndex).trim();
                  } else if (raw.trim()) {
                    blocks.push({ letter: "", text: raw.trim() });
                  }

                  return (
                    <div className="space-y-6 min-h-[800px]">
                      {blocks.map((b, idx) => (
                        <div key={`${b.letter || 'content'}-${idx}`} className="rounded-lg p-4">
                          {b.letter && (
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 rounded-full border-2 border-gray-700 flex items-center justify-center font-bold text-base">
                                {b.letter}
                              </div>
                              <div className="font-bold">Paragraf</div>
                            </div>
                          )}
                          <div className="text-base leading-7 font-serif whitespace-pre-line text-justify">
                            {b.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

            {/* Right: Questions 30–35 with options */}
            <ResizablePanel defaultSize={45} minSize={25} className="bg-white">
              <div className="h-full p-6 pb-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ height: 'calc(100vh - 150px)', maxHeight: 'calc(100vh - 150px)' }}>
                {(() => {
                  const part5 = (testData.parts || []).find((p) => p.number === 5) || (testData.parts || [])[4];
                  const section = part5?.sections?.[0];
                  const allQuestions = (section?.questions || []).slice();

                  const renderQuestion = (q: any, idx: number) => {
                    const options = (q.answers || [])
                      .filter((a: any) => typeof a.variantText === 'string' && a.variantText.length)
                      .sort((a: any, b: any) => String(a.variantText).localeCompare(String(b.variantText)));
                    const displayNumber = 30 + idx;
                    return (
                      <div key={q.id} className="space-y-3 pb-6 border-b border-gray-200">
                        <h4 className="font-semibold text-base">S{displayNumber}. {q.text || q.content || ""}</h4>
                        <div className="space-y-2">
                          {options.map((opt: any) => (
                            <label key={opt.id || opt.variantText} className="flex items-center gap-3 cursor-pointer" onClick={() => handleAnswerChange(q.id, String(opt.variantText))}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${(answers[q.id] || "") === String(opt.variantText) ? "bg-green-500 border-black text-white" : "border-gray-300"}`}>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">{String(opt.variantText)})</span>
                                <span className="text-sm">{opt.answer || opt.text || ""}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  };

                  // Static instruction headers
                  const firstBlock = allQuestions.slice(0, 3); // 30-32
                  const secondBlock = allQuestions.slice(3, 6); // 33-35
                  return (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-xl font-semibold font-serif">
                          Sorular 30-32. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
                        </p>
                      </div>
                      {firstBlock.map((q, i) => renderQuestion(q, i))}

                      <div className="space-y-2 pt-2">
                        <p className="text-xl font-semibold font-serif">
                          Sorular 33-35. Aşağıdaki cümleleri (33-35) okuyunuz. Cümlelerin hangi paragraflara (A-E) ait olduğunu bulunuz. Seçilmemesi gereken İKİ paragraf bulunmaktadır.
                        </p>
                      </div>
                      {secondBlock.map((q, i) => renderQuestion(q, 3 + i))}
                    </div>
                  );
                })()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
          </div>
          {/* Mobile: stacked */}
          <div className="sm:hidden">
            {(() => {
              const part5 = (testData.parts || []).find((p) => p.number === 5) || (testData.parts || [])[4];
              const section = part5?.sections?.[0];
              const raw = String(section?.content || "");
              const blocks: Array<{ letter: string; text: string }> = [];
              const regex = /\n?\s*([A-E])\)\s*/g;
              let lastIndex = 0;
              let match: RegExpExecArray | null;
              while ((match = regex.exec(raw)) !== null) {
                const letter = match[1];
                const start = match.index + match[0].length;
                if (blocks.length > 0) {
                  blocks[blocks.length - 1].text = raw.slice(lastIndex, match.index).trim();
                }
                blocks.push({ letter, text: "" });
                lastIndex = start;
              }
              if (blocks.length) {
                blocks[blocks.length - 1].text = raw.slice(lastIndex).trim();
              } else if (raw.trim()) {
                blocks.push({ letter: "", text: raw.trim() });
              }
              const allQuestions = (section?.questions || []).slice();
              const renderQuestion = (q: any, idx: number) => {
                const options = (q.answers || [])
                  .filter((a: any) => typeof a.variantText === 'string' && a.variantText.length)
                  .sort((a: any, b: any) => String(a.variantText).localeCompare(String(b.variantText)));
                const displayNumber = 30 + idx;
                return (
                  <div key={q.id} className="space-y-2 pb-4 border-b border-gray-200">
                    <h4 className="font-semibold text-sm">S{displayNumber}. {q.text || q.content || ""}</h4>
                    <div className="space-y-1">
                      {options.map((opt: any) => (
                        <label key={opt.id || opt.variantText} className="flex items-center gap-2 cursor-pointer" onClick={() => handleAnswerChange(q.id, String(opt.variantText))}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2 ${(answers[q.id] || "") === String(opt.variantText) ? "bg-green-500 border-black text-white" : "border-gray-300"}`}>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{String(opt.variantText)})</span>
                            <span className="text-sm">{opt.answer || opt.text || ""}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              };
              const firstBlock = allQuestions.slice(0, 3);
              const secondBlock = allQuestions.slice(3, 6);
              return (
                <div className="rounded-lg border border-gray-300 shadow-lg overflow-hidden">
                  <div className="bg-[#fffef5] p-4 space-y-4">
                    {blocks.map((b, idx) => (
                      <div key={`${b.letter || 'content'}-${idx}`} className="rounded-lg p-3">
                        {b.letter && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-full border-2 border-gray-700 flex items-center justify-center font-bold text-xs">
                              {b.letter}
                            </div>
                            <div className="font-bold text-sm">Paragraf</div>
                          </div>
                        )}
                        <div className="text-[15px] leading-7 font-serif whitespace-pre-line text-justify">
                          {b.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white p-4 space-y-4">
                    <div className="space-y-1">
                      <p className="text-base font-semibold font-serif">
                        Sorular 30-32. Metne göre doğru seçeneği (A, B, C veya D) işaretleyiniz.
                      </p>
                    </div>
                    {firstBlock.map((q, i) => renderQuestion(q, i))}
                    <div className="space-y-1 pt-1">
                      <p className="text-base font-semibold font-serif">
                        Sorular 33-35. Aşağıdaki cümleleri (33-35) okuyunuz. Cümlelerin hangi paragraflara (A-E) ait olduğunu bulunuz. Seçilmemesi gereken İKİ paragraf bulunmaktadır.
                      </p>
                    </div>
                    {secondBlock.map((q, i) => renderQuestion(q, 3 + i))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {!isLoading && !error && testData && currentPartNumber === 2 && (
        <ReadingPart2 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange} 
        />
      )}

      {/* Footer navigation: Tabs on lg+, mobile controls on <lg */}
      {!isLoading && !error && testData && (
        <>
          {/* Large screens: keep original tabs */}
          <div className="hidden lg:block fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-800 p-2 sm:p-3 z-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-center gap-2 flex-nowrap overflow-x-auto">
                {(() => {
                  const parts = (testData.parts || []).map((p) => p.number || 0).filter((n) => n > 0).sort((a, b) => a - b);
                  const uniqueParts = Array.from(new Set(parts));

                  const buildPartQuestions = (partNum: number) => {
                    const part = (testData.parts || []).find((p) => (p.number || 0) === partNum);
                    const qs = (part?.sections || []).flatMap((s) => s.questions || []);
                    const nums = qs
                      .map((q) => q.number)
                      .filter((n): n is number => typeof n === 'number')
                      .sort((a, b) => a - b);
                    return { qs, nums };
                  };

                  return uniqueParts.map((partNum) => {
                    const { qs, nums } = buildPartQuestions(partNum);
                    const isActive = currentPartNumber === partNum;
                    return (
                      <div
                        key={partNum}
                        className={`text-center border-2 rounded-lg p-2 min-w-fit cursor-pointer ${
                          isActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                        }`}
                        onClick={() => setCurrentPartNumber(partNum)}
                      >
                        <div className="flex gap-1 mb-1 justify-center flex-wrap">
                          {(nums.length ? nums : [partNum]).map((q) => {
                            const questionId = qs.find((qq) => qq.number === q)?.id;
                            const isAnswered = !!(questionId && answers[questionId]);
                            return (
                              <div
                                key={`${partNum}-${q}`}
                                className={`w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-bold ${
                                  isAnswered ? "bg-green-500" : "bg-white"
                                }`}
                              >
                                {q}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs font-bold">{partNum}. BÖLÜM</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Small/medium screens: previous/next controls */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-2 sm:p-3 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
              <Button onClick={handlePrevPart} className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold px-3 py-2 text-sm">Önceki Bölüm</Button>
              <div className="text-xs font-bold">{currentPartNumber}. BÖLÜM</div>
              <Button onClick={handleNextPart} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 text-sm">Sonraki Bölüm</Button>
            </div>
          </div>
        </>
      )}

      {/* Submit button (top-right already has one; optional dedicated handler) */}
      {/* Hook GÖNDER to submit current answers */}

      {/* Footer navigation removed for now (building from Part 1 only) */}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Testi Gönder"
        message="Testi göndermek istediğinizden emin misiniz? Bu işlem geri alınamaz."
        confirmText="Evet, Gönder"
        cancelText="İptal"
        isLoading={isSubmitting}
      />
    </div>
  );
}
