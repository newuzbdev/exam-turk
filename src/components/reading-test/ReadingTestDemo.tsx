import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../ui/resizable";
import { readingTestService, type ReadingTestItem } from "@/services/readingTest.service";

export default function ReadingPage({ testId }: { testId: string }) {
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [testData, setTestData] = useState<ReadingTestItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPartNumber, setCurrentPartNumber] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});

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
    if (partNumber === 5) {
      return "Sorular 30-35. sorular için aşağıdaki metni okuyunuz.";
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (Listening style) */}
      <div className="bg-white px-6 py-3 border-b-2 border-gray-200 flex items-center justify-between sticky top-0 z-50">
        <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-lg">TURKISHMOCK</div>
        <div className="font-bold text-2xl">{testData?.title || "Reading"}</div>
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg">{formatTime(timeLeft)}</div>
          <Button className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">GÖNDER</Button>
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
        <div className="mx-2 pb-24">
          <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-250px)] rounded-lg border border-gray-300 shadow-lg">
            {/* Left: Passage */}
            <ResizablePanel defaultSize={60} minSize={30} className="bg-green-50">
              <div className="h-full p-6 overflow-y-auto">
                {(() => {
                  const part1 = (testData.parts || []).find((p) => p.number === 1) || (testData.parts || [])[0];
                  const section1 = part1?.sections && part1.sections[0];
                  const content = section1?.content || "";
                  return (
                    <div className="space-y-4 leading-relaxed">
                      <p className="whitespace-pre-line">{content}</p>
                    </div>
                  );
                })()}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

            {/* Right: Answers */}
            <ResizablePanel defaultSize={40} minSize={20} className="bg-white">
              <div className="h-full p-6 flex flex-col">
            {(() => {
              const part1 = (testData.parts || []).find((p) => p.number === 1) || (testData.parts || [])[0];
              const section1 = part1?.sections && part1.sections[0];
              const questions = (section1?.questions || []).slice(0, 6);
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
                <>
                  <div className="space-y-4 mb-8">
                    {questions.map((q, idx) => (
                      <div key={q.id} className="flex items-center gap-4">
                        <label className="font-bold text-lg w-12">S{idx + 1}.</label>
                        <select
                          value={answers[q.id] || ""}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="flex-1 bg-white border border-gray-400 rounded px-2 py-1 h-8 min-w-[10rem]"
                        >
                          <option value="" />
                          {optionList.map((opt) => (
                            <option key={opt.variantText} value={opt.variantText}>
                              {opt.variantText}) {opt.answer}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 flex-1 overflow-auto">
                    {optionList.map((opt) => (
                      <div key={opt.variantText} className="flex items-center gap-3 text-lg">
                        <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-bold bg-white">
                          {opt.variantText}
                        </div>
                        <span>{opt.answer}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {!isLoading && !error && testData && currentPartNumber === 3 && (
        <div className="mx-2 h-[calc(100vh-200px)]">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
            {/* Left: Paragraphs 15–20, select above text with green bg */}
            <ResizablePanel defaultSize={60} minSize={30} className="bg-green-50">
              <div className="h-full p-6 overflow-y-auto">
                {(() => {
                  const part3 = (testData.parts || []).find((p) => p.number === 3) || (testData.parts || [])[2];
                  const sections = part3?.sections || [];
                  // Find the section with paragraphs/questions (the one that has questions)
                  const paragraphSection = sections.find((s) => (s.questions || []).length > 0);
                  const paragraphQuestions = (paragraphSection?.questions || []).sort((a, b) => (a.number || 0) - (b.number || 0));

                  // Build options A..H from answers if present; fallback to parsing the first section content (A) .. (H)
                  const optionMap = new Map<string, { letter: string; text: string }>();
                  (sections || []).forEach((s) => (s.questions || []).forEach((q) => (q.answers || []).forEach((a) => {
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
                    <div className="space-y-6">
                      {paragraphQuestions.map((q, idx) => {
                        const displayNum = (typeof q.number === 'number' ? q.number : 0) + 14; // 15..20
                        const displayText = q.text || q.content || "";
                        const romans = ["I", "II", "III", "IV", "V", "VI"];
                        const label = `S${displayNum}. ${romans[idx]}. paragraf`;
                        return (
                          <div key={q.id} className="rounded-xl p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="text-xl font-bold text-gray-800">{label}</div>
                                  <div>
                                    <label className="sr-only" htmlFor={`select-${q.id}`}>Seçenek</label>
                                    <select
                                      id={`select-${q.id}`}
                                      value={answers[q.id] || ""}
                                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                      className="w-28 bg-white border border-gray-400 rounded px-2 py-1 h-8 text-sm"
                                    >
                                      <option value="">Seçiniz</option>
                                      {optionList.map((opt) => (
                                        <option key={opt.letter} value={opt.letter}>
                                          {opt.letter}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                                {displayText && (
                                  <div className="">
                                    <p className="text-base leading-7 text-gray-800 font-serif text-justify whitespace-pre-line">{displayText}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

            {/* Right: Headings legend A..H (no question labels next to variants) */}
            <ResizablePanel defaultSize={40} minSize={25} className="bg-white">
              <div className="h-full p-6 flex flex-col">
                {(() => {
                  const part3 = (testData.parts || []).find((p) => p.number === 3) || (testData.parts || [])[2];
                  const sections = part3?.sections || [];
                  const optionMap = new Map<string, { letter: string; text: string }>();
                  (sections || []).forEach((s) => (s.questions || []).forEach((q) => (q.answers || []).forEach((a) => {
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
                  );
                })()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {!isLoading && !error && testData && currentPartNumber === 4 && (
        <div className="mx-2 h-[calc(100vh-200px)]">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
            {/* Left: Passage content for Part 4 */}
            <ResizablePanel defaultSize={55} minSize={30} className="bg-[#fffef5]">
              <div className="h-full p-6 overflow-y-auto">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-300 mb-4">
                  <h3 className="text-xl font-bold text-gray-800">4. OKUMA METNİ.</h3>
                  <p className="text-base text-gray-800">21-29. sorular için aşağıdaki metni okuyunuz</p>
                </div>
                {(() => {
                  const part4 = (testData.parts || []).find((p) => p.number === 4) || (testData.parts || [])[3];
                  const section = part4?.sections?.[0];
                  const content = section?.content || "";
                  const titleFromTest = part4?.title || "";
                  return (
                    <div className="space-y-4">
                      {titleFromTest && (
                        <h4 className="font-bold text-center text-lg">{titleFromTest}</h4>
                      )}
                      <div className="text-base leading-7 space-y-3 font-serif text-justify whitespace-pre-line">
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
              <div className="h-full p-6 overflow-y-auto">
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
      )}

      {!isLoading && !error && testData && currentPartNumber === 5 && (
        <div className="mx-2 h-[calc(100vh-200px)]">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
            {/* Left: Passage with paragraphs A–E each separated with space */}
            <ResizablePanel defaultSize={55} minSize={30} className="bg-gray-50">
              <div className="h-full p-6 overflow-y-auto">
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
                    <div className="space-y-6">
                      {blocks.map((b, idx) => (
                        <div key={`${b.letter || 'content'}-${idx}`} className="bg-white rounded-lg p-4 border border-gray-200">
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
              <div className="h-full p-6 overflow-y-auto">
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
                            <label key={opt.id || opt.variantText} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="radio"
                                name={q.id}
                                value={String(opt.variantText)}
                                checked={(answers[q.id] || "") === String(opt.variantText)}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                className="accent-black"
                              />
                              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-black font-bold text-base">
                                {String(opt.variantText)}
                              </div>
                              <span className="text-base">{opt.answer || opt.text || ""}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div className="space-y-6">
                      {allQuestions.map((q, i) => renderQuestion(q, i))}
                    </div>
                  );
                })()}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {!isLoading && !error && testData && currentPartNumber === 2 && (
        <div className="mx-2 h-[calc(100vh-200px)]">
          <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border border-gray-300 shadow-lg">
            {/* Left: Questions 7–14 with selects */}
            <ResizablePanel defaultSize={50} minSize={30} className="bg-gray-50">
              <div className="h-full p-6 overflow-y-auto">
                {(() => {
                  const part2 = (testData.parts || []).find((p) => p.number === 2) || (testData.parts || [])[1];
                  const sections = part2?.sections || [];
                  // Build options list across part 2 sections (A..J)
                  const optionMap = new Map<string, { variantText: string; answer: string }>();
                  sections.forEach((s) => (s.questions || []).forEach((q) => (q.answers || []).forEach((a) => {
                    if (a.variantText && !optionMap.has(a.variantText)) {
                      optionMap.set(a.variantText, { variantText: a.variantText, answer: a.answer });
                    }
                  })));
                  const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));

                  // Flatten questions and take first 8 for this matching task (backend numbers 1..8 per section)
                  const allQuestions = sections.flatMap((s) => s.questions || []);
                  const numbered = allQuestions.slice(0, 8);

                  return (
                    <div className="space-y-6">
                      {numbered.map((q, idx) => {
                        const qNum = 7 + idx; // kept for alt text only
                        const renderContent = () => {
                          const raw = q.content || "";
                          if (!raw) return null;
                          const nodes: any[] = [];
                          // Matches in priority order: markdown image, http(s) image, uploads path (with optional @ and query)
                          const pattern = /!\[[^\]]*\]\(([^)]+)\)|@?(https?:\/\/[^\s)]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s)]*)?)|@?(?:^|\s)(\/??uploads\/[\w\-./]+?\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s)]*)?)/gi;
                          let lastIndex = 0;
                          let match: RegExpExecArray | null;
                          while ((match = pattern.exec(raw)) !== null) {
                            const start = match.index;
                            if (start > lastIndex) {
                              const textChunk = raw.slice(lastIndex, start).trim();
                              if (textChunk) nodes.push(<p key={`t-${lastIndex}`} className="mb-2">{textChunk}</p>);
                            }
                            const urlFromMd = match[1];
                            const urlFromHttp = match[2];
                            const urlFromUploads = match[3];
                            let src = urlFromMd || urlFromHttp || urlFromUploads || "";
                            src = src.replace(/^\(|\)/g, "");
                            if (/^(?:\/)?uploads\//i.test(src)) {
                              src = `https://api.turkcetest.uz/${src.replace(/^\//, '')}`;
                            }
                            if (src) {
                              nodes.push(
                                <img
                                  key={`i-${start}`}
                                  src={src}
                                  alt={`S${qNum} görseli`}
                                  className="w-full max-w-[520px] h-auto max-h-[340px] object-contain border border-gray-200 rounded my-2 mx-auto"
                                  onError={(e) => {
                                    const el = e.target as HTMLImageElement;
                                    el.style.display = "none";
                                  }}
                                />
                              );
                            }
                            lastIndex = pattern.lastIndex;
                          }
                          if (lastIndex < raw.length) {
                            const tail = raw.slice(lastIndex).trim();
                            if (tail) nodes.push(<p key={`t-tail`} className="mb-2">{tail}</p>);
                          }
                          return nodes.length ? <div className="text-[13px] leading-6 text-gray-800 font-serif text-justify">{nodes}</div> : null;
                        };
                        // Prefer rendering image if provided for the question
                        const makeImageSrc = (u: string) => {
                          let src = u.trim();
                          if (/^(?:\/)?uploads\//i.test(src)) {
                            src = `https://api.turkcetest.uz/${src.replace(/^\//, '')}`;
                          }
                          return src;
                        };
                        const hasImage = typeof q.imageUrl === 'string' && q.imageUrl.length > 0;

                        return (
                          <div key={q.id} className="bg-transparent rounded-xl p-6">
                            <div className="flex items-start gap-4">
                              {hasImage ? (
                                <div className="w-full">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="text-xl font-bold text-gray-800">S{qNum}</div>
                                    <select
                                      id={`select-${q.id}`}
                                      value={answers[q.id] || ""}
                                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                                    >
                                      <option value="">Seçiniz</option>
                                      {optionList.map((opt) => (
                                        <option key={opt.variantText} value={opt.variantText}>
                                          {opt.variantText}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex items-center justify-start mb-4">
                                    <div className="relative">
                                      <img
                                        src={makeImageSrc(q.imageUrl as string)}
                                        alt={`S${qNum} görseli`}
                                        className="w-[400px] h-[300px] object-contain rounded-xl shadow-md border-2 border-gray-100"
                                        onError={(e) => {
                                          const el = e.target as HTMLImageElement;
                                          el.style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/5 to-transparent pointer-events-none"></div>
                                    </div>
                                  </div>
                                  {q.text && (
                                    <div className="text-center">
                                      <p className="text-sm text-gray-600 italic bg-gray-50 px-4 py-2 rounded-lg">{q.text}</p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  <div className="flex-1">
                                    {q.text && (
                                      <h3 className="font-semibold mb-2 leading-snug italic text-gray-900">
                                        {q.text}
                                      </h3>
                                    )}
                                    {renderContent()}
                                  </div>
                                  <div className="shrink-0 pt-1">
                                    <label className="sr-only" htmlFor={`select-${q.id}`}>Seçenek</label>
                                    <select
                                      id={`select-${q.id}`}
                                      value={answers[q.id] || ""}
                                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                      className="w-24 bg-white border border-gray-400 rounded px-2 py-1 h-8 text-sm"
                                    >
                                      <option value="" />
                                      {optionList.map((opt) => (
                                        <option key={opt.variantText} value={opt.variantText}>
                                          {opt.variantText}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle={true} className="bg-gray-300 hover:bg-gray-400 transition-colors" />

            {/* Right: Options legend A..J - Fixed Sidebar */}
            <ResizablePanel defaultSize={50} minSize={25} className="bg-white">
              <div className="h-full flex flex-col">
             
                <div className="flex-1 p-4 overflow-hidden">
                    {(() => {
                      const part2 = (testData.parts || []).find((p) => p.number === 2) || (testData.parts || [])[1];
                      const sections = part2?.sections || [];
                      const optionMap = new Map<string, { variantText: string; answer: string }>();
                      sections.forEach((s) => (s.questions || []).forEach((q) => (q.answers || []).forEach((a) => {
                        if (a.variantText && !optionMap.has(a.variantText)) {
                          optionMap.set(a.variantText, { variantText: a.variantText, answer: a.answer });
                        }
                      })));
                      const optionList = Array.from(optionMap.values()).sort((a, b) => a.variantText.localeCompare(b.variantText));

                      return (
                        <div className="space-y-2">
                          {optionList.map((opt) => (
                            <div key={opt.variantText} className="flex items-start gap-2 p-2 bg-white rounded hover:bg-gray-50 transition-all duration-200 border border-gray-200">
                              <div className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center font-bold bg-white text-gray-700 flex-shrink-0 text-xs">
                                {opt.variantText}
                              </div>
                              <span className="text-lg leading-tight text-gray-800 pt-0.5 font-medium">{opt.answer}</span>
                            </div>
                          ))}

                        </div>
                      );
                    })()}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}

      {/* Footer Tabs for Bölüm switching (like Listening) */}
      {!isLoading && !error && testData && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-800 p-2 sm:p-3 z-50">
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
      )}

      {/* Submit button (top-right already has one; optional dedicated handler) */}
      {/* Hook GÖNDER to submit current answers */}

      {/* Footer navigation removed for now (building from Part 1 only) */}
    </div>
  );
}
