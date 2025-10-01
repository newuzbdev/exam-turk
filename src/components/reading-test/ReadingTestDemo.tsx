import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { readingTestService, readingSubmissionService, type ReadingTestItem } from "@/services/readingTest.service";

export default function ReadingPage({ testId }: { testId: string }) {
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [testData, setTestData] = useState<ReadingTestItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPartNumber, setCurrentPartNumber] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

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
    return "";
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header (Listening style) */}
      <div className="bg-white px-6 py-3 border-b-2 border-gray-200 flex items-center justify-between sticky top-0 z-10">
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
        <div className="flex border-2 border-black m-2 bg-white">
          {/* Left: Passage */}
          <div className="flex-1 p-6 border-r-2 border-black overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">1. OKUMA METNİ.</h2>
            <p className="mb-6 leading-relaxed">
              {getStaticHeader(1)}
            </p>

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

          {/* Right: Answers */}
          <div className="w-full max-w-[400px] bg-[#f5f5f0] p-6 flex flex-col">
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
        </div>
      )}

      {!isLoading && !error && testData && currentPartNumber === 2 && (
        <div className="flex border-2 border-black m-2 bg-white">
          {/* Left: Questions 7–14 with selects */}
          <div className="flex-1 p-6 border-r-2 border-black overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">2. OKUMA METNİ.</h2>
            <p className="mb-6 leading-relaxed">
              {getStaticHeader(2)}
            </p>

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
                              className="w-full h-auto object-contain border border-gray-200 rounded my-2"
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
                    return (
                      <div key={q.id} className="bg-white">
                        <div className="flex items-start justify-between gap-4">
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Right: Options legend A..J */}
          <div className="w-full max-w-[450px] bg-[#f5f5f0] p-8 flex flex-col overflow-y-auto">
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
                <div className="space-y-3 flex-1">
                  {optionList.map((opt) => (
                    <div key={opt.variantText} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center font-bold bg-white flex-shrink-0">
                        {opt.variantText}
                      </div>
                      <span className="text-base leading-relaxed pt-1">{opt.answer}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Footer Tabs for Bölüm switching (like Listening) */}
      {!isLoading && !error && testData && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-800 p-2 sm:p-3">
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
