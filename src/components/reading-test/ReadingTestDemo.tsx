import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { overallTestFlowStore } from "@/services/overallTest.service";
import { Button } from "../ui/button";
import { ConfirmationModal } from "../ui/confirmation-modal";
import { readingTestService, type ReadingTestItem } from "@/services/readingTest.service";
import ReadingPart1 from "./ui/ReadingPart1";
import ReadingPart2 from "./ui/ReadingPart2";
import ReadingPart3 from "./ui/ReadingPart3";
import ReadingPart4 from "./ui/ReadingPart4";
import ReadingPart5 from "./ui/ReadingPart5";

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
      // Only exit fullscreen if not in overall test flow
      const hasActiveOverallTest = overallTestFlowStore.hasActive();
      if (!hasActiveOverallTest && document.fullscreenElement) {
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
        
        // First try to get pre-loaded data from sessionStorage
        const cachedData = sessionStorage.getItem(`test_data_READING_${testId}`);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          if (mounted) {
            setTestData(data);
            setIsLoading(false);
          }
          return;
        }

        // Fallback to API call if no cached data
        const data = await readingTestService.getTestWithFullData(testId);
        if (mounted) {
          setTestData(data);
        }
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
      
      // Store answers locally for later submission
      if (testData?.id) {
        const answersData = {
          testId: testData.id,
          answers: answers,
          timestamp: new Date().toISOString()
        };
        // Store in sessionStorage for later submission
        sessionStorage.setItem(`reading_answers_${testData.id}`, JSON.stringify(answersData));
      }

      // Just navigate to next test without submitting
      const nextPath = overallTestFlowStore.onTestCompleted("READING", testData?.id || "");
      if (nextPath) {
        // Ensure exam mode and fullscreen stay active for next test
        if (typeof document !== "undefined") {
          document.body.classList.add("exam-mode");
          // Immediately re-enter fullscreen before navigation
          const enterFullscreen = async () => {
            try {
              const el: any = document.documentElement as any;
              if (el.requestFullscreen) await el.requestFullscreen();
              else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
              else if (el.msRequestFullscreen) await el.msRequestFullscreen();
            } catch {}
          };
          await enterFullscreen();
        }
        navigate(nextPath);
        return;
      }
      
      // If no next test, we're at the end - submit all tests
      const overallId = overallTestFlowStore.getOverallId();
      if (overallId && overallTestFlowStore.isAllDone()) {
        // Submit all tests at once
        await submitAllTests(overallId);
        return;
      }
      
      // Fallback to single test results
      navigate(`/reading-test/results/temp`, { state: { summary: { testId: testData?.id } } });
    } catch (error) {
      console.error("Reading navigation error", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAllTests = async (overallId: string) => {
    try {
      // toast.info("Submitting all tests...");
      
      // Submit all individual tests first
      const { readingSubmissionService } = await import("@/services/readingTest.service");
      const { listeningSubmissionService } = await import("@/services/listeningTest.service");
      const { writingSubmissionService } = await import("@/services/writingSubmission.service");
      const axiosPrivate = (await import("@/config/api")).default;
      
      // Submit reading test - look for reading answers from any test
      const readingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('reading_answers_'));
      for (const key of readingAnswersKeys) {
        const readingAnswers = sessionStorage.getItem(key);
        if (readingAnswers) {
          const readingData = JSON.parse(readingAnswers);
          console.log("Submitting reading test:", readingData.testId, "with answers:", readingData.answers);
          const payload = Object.entries(readingData.answers).map(([questionId, userAnswer]) => ({ 
            questionId, 
            userAnswer: String(userAnswer) 
          }));
          await readingSubmissionService.submitAnswers(readingData.testId, payload);
        }
      }
      
      // Submit listening test - look for listening answers from any test
      const listeningAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('listening_answers_'));
      for (const key of listeningAnswersKeys) {
        const listeningAnswers = sessionStorage.getItem(key);
        if (listeningAnswers) {
          const listeningData = JSON.parse(listeningAnswers);
          console.log("Submitting listening test:", listeningData.testId, "with answers:", listeningData.answers);
          await listeningSubmissionService.submitAnswers(listeningData.testId, listeningData.answers);
        }
      }
      
      // Submit writing test - look for writing answers from any test
      const writingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('writing_answers_'));
      for (const key of writingAnswersKeys) {
        const writingAnswers = sessionStorage.getItem(key);
        if (writingAnswers) {
          const writingData = JSON.parse(writingAnswers);
          console.log("Submitting writing test:", writingData.testId, "with answers:", writingData.answers);
          const payload = {
            writingTestId: writingData.testId,
            sections: writingData.sections.map((section: any, sectionIndex: number) => {
              const sectionData = {
                description: section.title || section.description || `Section ${section.order || 1}`,
                answers: [] as any[],
                subParts: [] as any[],
              };
              // Handle sections with subParts
              if (section.subParts && section.subParts.length > 0) {
                sectionData.subParts = section.subParts.map((subPart: any, subPartIndex: number) => {
                  const questionId = subPart.questions?.[0]?.id || subPart.id;
                  const userAnswer = writingData.answers[`${sectionIndex}-${subPartIndex}-${subPart.id}`] || "";
                  return {
                    description: subPart.label || subPart.description,
                    answers: [{ questionId, userAnswer }],
                  };
                });
              }
              // Handle sections with questions
              if (section.questions && section.questions.length > 0) {
                let questionAnswer = "";
                const possibleKeys = [
                  `${sectionIndex}-0-${section.questions[0].id}`,
                  `${sectionIndex}-${section.questions[0].id}`,
                  `${sectionIndex}-${section.id}`,
                  section.questions[0].id,
                  section.id,
                ];
                for (const key of possibleKeys) {
                  if (writingData.answers[key]) {
                    questionAnswer = writingData.answers[key];
                    break;
                  }
                }
                sectionData.answers = [{ questionId: section.questions[0].id, userAnswer: questionAnswer }];
              }
              return sectionData;
            }),
          };
          await writingSubmissionService.create(payload);
        }
      }
      
      // Submit speaking test - look for speaking answers from any test
      const speakingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('speaking_answers_'));
      for (const key of speakingAnswersKeys) {
        const speakingAnswers = sessionStorage.getItem(key);
        if (speakingAnswers) {
          const speakingData = JSON.parse(speakingAnswers);
          console.log("Submitting speaking test:", speakingData.testId, "with recordings:", speakingData.recordings?.length || 0);
          // Process speaking recordings and submit
          const answerMap = new Map();
          for (const [qid, rec] of speakingData.recordings) {
            try {
              const fd = new FormData();
              fd.append("audio", rec.blob, "recording.webm");
              const res = await axiosPrivate.post("/api/speaking-submission/speech-to-text", fd, {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 30000,
              });
              const text = res.data?.text || "[Ses metne dönüştürülemedi]";
              answerMap.set(qid, { text, duration: rec.duration });
            } catch (e) {
              answerMap.set(qid, { text: "[Ses metne dönüştürülemedi]", duration: rec.duration || 0 });
            }
          }
          
          const parts = speakingData.sections.map((s: any) => {
            const p: any = { description: s.description, image: "" };
            if (s.subParts?.length) {
              const subParts = s.subParts.map((sp: any) => {
                const questions = sp.questions.map((q: any) => {
                  const a = answerMap.get(q.id);
                  return {
                    questionId: q.id,
                    userAnswer: a?.text ?? "[Cevap bulunamadı]",
                    duration: a?.duration ?? 0,
                  };
                });
                const duration = questions.reduce((acc: number, q: any) => acc + (q.duration || 0), 0);
                return { image: sp.images?.[0] || "", duration, questions };
              });
              const duration = subParts.reduce((acc: number, sp: any) => acc + (sp.duration || 0), 0);
              p.subParts = subParts;
              p.duration = duration;
            } else {
              const questions = s.questions.map((q: any) => {
                const a = answerMap.get(q.id);
                return {
                  questionId: q.id,
                  userAnswer: a?.text ?? "[Cevap bulunamadı]",
                  duration: a?.duration ?? 0,
                };
              });
              const duration = questions.reduce((acc: number, q: any) => acc + (q.duration || 0), 0);
              p.questions = questions;
              p.duration = duration;
              if (s.type === "PART3") p.type = "DISADVANTAGE";
            }
            return p;
          });
          
          await axiosPrivate.post("/api/speaking-submission", {
            speakingTestId: speakingData.testId,
            parts,
          });
        }
      }
      
      // Now complete the overall test
      if (!overallTestFlowStore.isCompleted()) {
        const { overallTestService } = await import("@/services/overallTest.service");
        await overallTestService.complete(overallId);
        overallTestFlowStore.markCompleted();
      }
      
      // Exit fullscreen and go to results
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
      navigate(`/overall-results/${overallId}`);
    } catch (error) {
      console.error("Error submitting all tests:", error);
      // toast.error("Error submitting tests, but continuing to results...");
      navigate(`/overall-results/${overallId}`);
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
      {/* Header - Responsive like listening test */}
      <div className="bg-white px-3 sm:px-6 py-2 sm:py-3 border-b-2 border-gray-200 sticky top-0 z-50">
        {/* Mobile Header - Single Line Layout */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-sm">
              TURKISHMOCK
            </div>
            <div className="font-bold text-base">Reading</div>
            <div className="flex items-center gap-2">
              <div className="font-bold text-sm">{formatTime(timeLeft)}</div>
              <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs font-bold">
                GÖNDER
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Header - Horizontal Layout */}
        <div className="hidden lg:flex items-center justify-between">
          <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-lg">
            TURKISHMOCK
          </div>
          <div className="font-bold text-2xl">Reading</div>
          <div className="flex items-center gap-4">
            <div className="font-bold text-lg">{formatTime(timeLeft)}</div>
            <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">
              GÖNDER
            </Button>
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
        <ReadingPart4 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange} 
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 5 && (
        <ReadingPart5 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange} 
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 2 && (
        <ReadingPart2 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange} 
        />
      )}

      {/* Footer navigation: Responsive like listening test */}
      {!isLoading && !error && testData && (
        <>
          {/* Desktop Layout - Tabs */}
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
                        onClick={() => {
                          setCurrentPartNumber(partNum);
                          // Smooth scroll to top of content
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
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

        {/* Mobile Layout - Prev/Next controls */}
        <div className="lg:hidden fixed bottom-2 right-2 left-2 grid grid-cols-3 items-center gap-2 px-2 pointer-events-none bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="justify-self-start">
              <Button 
                onClick={handlePrevPart}
                disabled={currentPartNumber <= 1}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-3 py-2 pointer-events-auto disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                Önceki
              </Button>
            </div>
            <div className="justify-self-center text-xs font-bold pointer-events-none">
              {currentPartNumber}. BÖLÜM
            </div>
            <div className="justify-self-end">
              <Button 
                onClick={handleNextPart}
                disabled={currentPartNumber >= 5}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 pointer-events-auto disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                Sonraki
              </Button>
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
