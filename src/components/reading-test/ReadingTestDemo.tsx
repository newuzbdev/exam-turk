import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { overallTestFlowStore } from "@/services/overallTest.service";
import { Button } from "../ui/button";
import { ConfirmationModal } from "../ui/confirmation-modal";
import { readingTestService, type ReadingTestItem } from "@/services/readingTest.service";
import { ReadingNotesProvider } from "@/contexts/ReadingNotesContext";
import ReadingPart1 from "./ui/ReadingPart1";
import ReadingPart2 from "./ui/ReadingPart2";
import ReadingPart3 from "./ui/ReadingPart3";
import ReadingPart4 from "./ui/ReadingPart4";
import ReadingPart5 from "./ui/ReadingPart5";
import NotesPanel from "./NotesPanel";
import { toast } from "sonner";
import { Clock3 } from "lucide-react";

interface ReadingProgressSnapshot {
  currentPartNumber: number;
  answers: Record<string, string>;
  timeLeft: number;
  showDescription: boolean;
  fontScale: number;
  updatedAt: number;
}

export default function ReadingPage({ testId }: { testId: string }) {
  const navigate = useNavigate();
  const TOTAL_TIME = 60 * 60;
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [testData, setTestData] = useState<ReadingTestItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPartNumber, setCurrentPartNumber] = useState<number>(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [fontScale, setFontScale] = useState(1);
  const hasRestoredProgressRef = useRef(false);
  const progressStorageKey = `reading_progress_${testId}`;

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

  useEffect(() => {
    hasRestoredProgressRef.current = false;
    let parsed: Partial<ReadingProgressSnapshot> | null = null;
    try {
      const raw = sessionStorage.getItem(progressStorageKey);
      if (raw) parsed = JSON.parse(raw) as Partial<ReadingProgressSnapshot>;
    } catch {}

    if (parsed && typeof parsed === "object") {
      const restoredPart = Number(parsed.currentPartNumber);
      if (Number.isFinite(restoredPart)) {
        setCurrentPartNumber(Math.min(5, Math.max(1, Math.round(restoredPart))));
      }

      if (parsed.answers && typeof parsed.answers === "object") {
        setAnswers(parsed.answers as Record<string, string>);
      }

      const restoredTimeLeft = Number(parsed.timeLeft);
      if (Number.isFinite(restoredTimeLeft)) {
        setTimeLeft(Math.max(0, Math.min(TOTAL_TIME, Math.round(restoredTimeLeft))));
      }

      if (typeof parsed.showDescription === "boolean") {
        setShowDescription(parsed.showDescription);
      }

      const restoredFontScale = Number(parsed.fontScale);
      if (Number.isFinite(restoredFontScale)) {
        setFontScale(Math.min(1.2, Math.max(0.9, Math.round(restoredFontScale * 100) / 100)));
      }
    }

    hasRestoredProgressRef.current = true;
  }, [progressStorageKey, TOTAL_TIME]);

  useEffect(() => {
    if (!hasRestoredProgressRef.current) return;
    const snapshot: ReadingProgressSnapshot = {
      currentPartNumber,
      answers,
      timeLeft,
      showDescription,
      fontScale,
      updatedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(progressStorageKey, JSON.stringify(snapshot));
    } catch {}
  }, [progressStorageKey, currentPartNumber, answers, timeLeft, showDescription, fontScale]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const clearReadingProgress = () => {
    try { sessionStorage.removeItem(progressStorageKey); } catch {}
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
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
        if (nextPath !== "/overall-section-ready" && typeof document !== "undefined") {
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
        clearReadingProgress();
        navigate(nextPath);
        return;
      }
      
      // If no next test, we're at the end - submit all tests
      const overallId = overallTestFlowStore.getOverallId();
      if (overallId && overallTestFlowStore.isAllDone()) {
        const submitAllOk = await submitAllTests(overallId);
        if (!submitAllOk) return;
        clearReadingProgress();
        return;
      }
      
      // Fallback to single test results
      clearReadingProgress();
      navigate(`/reading-test/results/temp`, { state: { summary: { testId: testData?.id } } });
    } catch (error) {
      console.error("Reading navigation error", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitAllTests = async (overallId: string): Promise<boolean> => {
    try {
      // toast.info("Submitting all tests...");
      
      // Submit all individual tests first
      const { readingSubmissionService } = await import("@/services/readingTest.service");
      const { listeningSubmissionService } = await import("@/services/listeningTest.service");
      const { writingSubmissionService } = await import("@/services/writingSubmission.service");
      const { speakingSubmissionService } = await import("@/services/speakingSubmission.service");
      const { overallTestTokenStore } = await import("@/services/overallTest.service");
      const failedSubmissions: string[] = [];
      const successfulSubmissions: string[] = [];

      const runWithRetries = async <T,>(
        runner: () => Promise<T>,
        isSuccess?: (value: T) => boolean,
        attempts: number = 3
      ): Promise<T> => {
        let lastError: any = null;
        let lastValue: T | null = null;

        for (let attempt = 1; attempt <= attempts; attempt++) {
          try {
            const value = await runner();
            lastValue = value;
            if (!isSuccess || isSuccess(value)) {
              return value;
            }
            lastError = new Error("Submission returned unsuccessful result");
          } catch (error) {
            lastError = error;
          }

          if (attempt < attempts) {
            await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
          }
        }

        if (lastValue !== null) {
          return lastValue;
        }
        throw lastError || new Error("Submission failed after retries");
      };
      
      // Submit reading test - look for reading answers from any test
      const readingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('reading_answers_'));
      for (const key of readingAnswersKeys) {
        const readingAnswers = sessionStorage.getItem(key);
        if (readingAnswers) {
          const readingData = JSON.parse(readingAnswers);
          const rawReadingAnswers = readingData.answers;
          const payload = Array.isArray(rawReadingAnswers)
            ? rawReadingAnswers.map((item: any) => ({
                questionId: String(item?.questionId ?? ""),
                userAnswer: String(item?.userAnswer ?? ""),
              }))
            : Object.entries(rawReadingAnswers || {}).map(([questionId, userAnswer]) => ({
                questionId,
                userAnswer: String(userAnswer),
              }));
          const sanitizedPayload = payload.filter((item) => item.questionId);
          const overallToken = overallTestTokenStore.getByTestId(readingData.testId);
          if (!overallToken) {
            console.warn(
              "Reading submit-all without overall token; falling back to standard auth:",
              readingData.testId
            );
          }
          try {
            await runWithRetries(
              () =>
                readingSubmissionService.submitAnswers(
                  readingData.testId,
                  sanitizedPayload,
                  overallToken || undefined
                ),
              undefined,
              3
            );
            successfulSubmissions.push(`Okuma (${readingData.testId})`);
            try { sessionStorage.removeItem(key); } catch {}
          } catch (submitError) {
            console.error("Reading submit-all failed:", submitError);
            failedSubmissions.push(`Okuma (${readingData.testId})`);
          }
        }
      }
      
      // Submit listening test - look for listening answers from any test
      const listeningAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('listening_answers_'));
      for (const key of listeningAnswersKeys) {
        const listeningAnswers = sessionStorage.getItem(key);
        if (listeningAnswers) {
          const listeningData = JSON.parse(listeningAnswers);
          const rawListeningAnswers = listeningData.answers;
          const payload = Array.isArray(rawListeningAnswers)
            ? rawListeningAnswers.map((item: any) => ({
                questionId: String(item?.questionId ?? ""),
                userAnswer: String(item?.userAnswer ?? ""),
              }))
            : Object.entries(rawListeningAnswers || {}).map(([questionId, userAnswer]) => ({
                questionId,
                userAnswer: String(userAnswer),
              }));
          const sanitizedPayload = payload.filter((item) => item.questionId);
          const overallToken = overallTestTokenStore.getByTestId(listeningData.testId);
          if (!overallToken) {
            console.warn(
              "Listening submit-all without overall token; falling back to standard auth:",
              listeningData.testId
            );
          }
          try {
            await runWithRetries(
              () =>
                listeningSubmissionService.submitAnswers(
                  listeningData.testId, 
                  sanitizedPayload,
                  overallToken || undefined,
                  listeningData.audioUrl,
                  listeningData.imageUrls
                ),
              undefined,
              3
            );
            successfulSubmissions.push(`Dinleme (${listeningData.testId})`);
            try { sessionStorage.removeItem(key); } catch {}
          } catch (submitError) {
            console.error("Listening submit-all failed:", submitError);
            failedSubmissions.push(`Dinleme (${listeningData.testId})`);
          }
        }
      }
      
      // Submit writing test - look for writing answers from any test
      const writingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('writing_answers_'));
      for (const key of writingAnswersKeys) {
        const writingAnswers = sessionStorage.getItem(key);
        if (writingAnswers) {
          const writingData = JSON.parse(writingAnswers);
          const overallToken = overallTestTokenStore.getByTestId(writingData.testId);
          if (!overallToken) {
            console.warn(
              "Writing submit-all without overall token; falling back to standard auth:",
              writingData.testId
            );
          }

          const getWritingAnswer = (
            questionId: string,
            sectionIndex: number,
            fallbackId?: string,
            itemIndex?: number
          ) => {
            const direct = writingData.answers?.[questionId];
            if (typeof direct === "string") return direct;
            const fallback = typeof fallbackId === "string" ? fallbackId : "";
            const idx = typeof itemIndex === "number" ? String(itemIndex) : "";
            const keys = [
              `${sectionIndex}-${questionId}`,
              `${sectionIndex}-${fallback}`,
              fallback,
              idx && fallback ? `${sectionIndex}-${idx}-${fallback}` : "",
              idx ? `${sectionIndex}-${idx}-${questionId}` : "",
            ].filter(Boolean);
            for (const k of keys) {
              const v = writingData.answers?.[k];
              if (typeof v === "string") return v;
            }
            return "";
          };

          const payload = {
            writingTestId: writingData.testId,
            sections: (writingData.sections || []).map((section: any, sectionIndex: number) => {
              const sectionDescription =
                (typeof section?.title === "string" && section.title.trim()) ||
                (typeof section?.description === "string" && section.description.trim()) ||
                `Section ${section?.order || sectionIndex + 1}`;
              const sectionData: any = {
                description: sectionDescription,
              };

              if (Array.isArray(section.subParts) && section.subParts.length > 0) {
                sectionData.subParts = section.subParts.map((subPart: any, subPartIndex: number) => {
                  const questions = Array.isArray(subPart.questions) ? subPart.questions : [];
                  const subPartDescription =
                    (typeof subPart?.label === "string" && subPart.label.trim()) ||
                    (typeof subPart?.description === "string" && subPart.description.trim()) ||
                    `Sub Part ${subPart?.order || subPartIndex + 1}`;
                  const answersArr = questions
                    .map((q: any) => {
                      const rawQuestionId = q?.id || q?.questionId;
                      const qid =
                        typeof rawQuestionId === "string"
                          ? rawQuestionId
                          : String(rawQuestionId || "").trim();
                      if (!qid) return null;
                      return { questionId: qid, userAnswer: getWritingAnswer(qid, sectionIndex, subPart?.id, subPartIndex) };
                    })
                    .filter(Boolean);
                  return {
                    description: subPartDescription,
                    answers: answersArr,
                  };
                });
              }

              if (Array.isArray(section.questions) && section.questions.length > 0) {
                sectionData.answers = section.questions
                  .map((q: any, questionIndex: number) => {
                    const rawQuestionId = q?.id || q?.questionId;
                    const qid =
                      typeof rawQuestionId === "string"
                        ? rawQuestionId
                        : String(rawQuestionId || "").trim();
                    if (!qid) return null;
                    return { questionId: qid, userAnswer: getWritingAnswer(qid, sectionIndex, section?.id, questionIndex) };
                  })
                  .filter(Boolean);
              }

              return sectionData;
            }),
          };
          if (overallToken) {
            (payload as any).sessionToken = overallToken;
          }
          try {
            await runWithRetries(
              () => writingSubmissionService.create(payload as any),
              (value) => !!value,
              3
            );
            successfulSubmissions.push(`Yazma (${writingData.testId})`);
            try { sessionStorage.removeItem(key); } catch {}
          } catch (submitError) {
            console.error("Writing submit-all failed:", submitError);
            failedSubmissions.push(`Yazma (${writingData.testId})`);
          }
        }
      }
      
      // Submit speaking test - look for speaking answers from any test
      const speakingAnswersKeys = Object.keys(sessionStorage).filter((key) => key.startsWith("speaking_answers_"));
      for (const key of speakingAnswersKeys) {
        const speakingAnswers = sessionStorage.getItem(key);
        if (!speakingAnswers) continue;

        const speakingData = JSON.parse(speakingAnswers);
        const answerTextRecord: Record<string, string> = {};
        const isMeaningfulText = (value: unknown) => {
          if (typeof value !== "string") return false;
          const trimmed = value.trim();
          return (
            trimmed.length > 0 &&
            trimmed !== "[Cevap bulunamadı]" &&
            trimmed !== "[Ses metne dönüştürülemedi]"
          );
        };

        if (speakingData.transcripts && typeof speakingData.transcripts === "object") {
          for (const [qid, t] of Object.entries(speakingData.transcripts)) {
            if (isMeaningfulText(t)) answerTextRecord[qid] = String(t).trim();
          }
        }

        if (speakingData.answers && typeof speakingData.answers === "object") {
          for (const [qid, val] of Object.entries(speakingData.answers)) {
            const maybeObj: any = val;
            const text = typeof val === "string" ? val : maybeObj?.text;
            if (isMeaningfulText(text)) {
              answerTextRecord[qid] = String(text).trim();
            }
          }
        }

        const formattedSubmission = speakingSubmissionService.formatSubmissionData(
          speakingData,
          answerTextRecord
        );
        const overallToken = overallTestTokenStore.getByTestId(speakingData.testId);
        if (overallToken) {
          formattedSubmission.sessionToken = overallToken;
        } else {
          console.warn(
            "Speaking submit-all without overall token; falling back to standard auth:",
            speakingData.testId
          );
        }

        if (!speakingSubmissionService.validateSubmissionData(formattedSubmission)) {
          console.warn("Skipping speaking submit-all; formatted submission is invalid.");
          continue;
        }

        const submissionResult = await speakingSubmissionService.submitSpeakingTest(formattedSubmission);
        if (!submissionResult.success) {
          console.error("Speaking submit-all failed:", submissionResult.error);
          failedSubmissions.push(`Konusma (${speakingData.testId})`);
          continue;
        }

        successfulSubmissions.push(`Konusma (${speakingData.testId})`);
        try {
          sessionStorage.removeItem(key);
        } catch {}
      }

      if (failedSubmissions.length > 0) {
        toast.error(
          `Bazi bolumler gecici olarak kaydedilemedi: ${failedSubmissions.join(", ")}. Cevaplariniz saklandi.`
        );
        if (successfulSubmissions.length > 0) {
          toast.message(`Kaydedilen bolumler: ${successfulSubmissions.join(", ")}`);
        }
        return false;
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
      clearReadingProgress();
      navigate(`/overall-results/${overallId}`);
      return true;
    } catch (error) {
      console.error("Error submitting all tests:", error);
      toast.error("Testler gonderilirken hata olustu. Cevaplariniz saklandi.");
      return false;
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
      return "Sorular 1-6. Aşağıdaki metni okuyunuz ve alttaki sözcükleri (A-H) kullanarak boşlukları (1-6) doldurunuz. Her sözcük yalnızca bir defa kullanılabilir. Seçilmemesi gereken iki seçenek bulunmaktadır.";
    }
    if (partNumber === 2) {
      return "Sorular 7-14. Aşağıda verilen durumları (A-J) ve bilgi metinlerini (7-14) okuyunuz. Her durum için uygun olan metni bulup uygun seçeneği işaretleyiniz. Her seçenek yalnız bir defa kullanılabilir. Seçilmemesi gereken iki seçenek bulunmaktadır.";
    }
    if (partNumber === 3) {
      return "Sorular 15-20. Aşağıdaki başlıkları (A-H) ve paragrafları (15-20) okuyunuz. Her paragraf için uygun başlığı seçiniz.";
    }
    if (partNumber === 4) {
      return "Sorular 21-29 için aşağıdaki metni okuyunuz.";
    }
    if (partNumber === 5) {
      return "Sorular 30-35 için aşağıdaki metni okuyunuz.";
    }
    return "";
  };

  return (
    <ReadingNotesProvider>
      <div
        className="min-h-screen h-full overflow-y-auto bg-gray-50 font-sans text-[#333333] pb-44 sm:pb-52"
        style={{ color: "#333333", ["--reading-font-scale" as any]: fontScale }}
      >
        {/* Header - Same height and logic as main navbar */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full">
          {/* Match horizontal padding with description block below */}
          <div className="px-2 sm:px-4">
            <div className="flex justify-between items-center h-20 sm:h-24">
              {/* Mobile Header - Single Line Layout */}
              <div className="block lg:hidden w-full">
                <div className="flex items-center justify-between">
              <div className="font-extrabold text-base sm:text-lg tracking-wider">OKUMA</div>
              <div className="flex items-center gap-2">
                  <div className="hidden lg:block">
                    <NotesPanel currentPartNumber={currentPartNumber} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="h-8 w-8 rounded border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                      onClick={() => setFontScale((v) => Math.max(0.9, Math.round((v - 0.05) * 100) / 100))}
                      aria-label="Metni küçült"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      className="h-8 w-8 rounded border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                      onClick={() => setFontScale((v) => Math.min(1.2, Math.round((v + 0.05) * 100) / 100))}
                      aria-label="Metni büyült"
                    >
                      A+
                    </button>
                  </div>
                  <div
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-bold ${
                      timeLeft <= 300
                        ? "bg-red-50 border-red-200 text-red-700"
                        : timeLeft <= 600
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-gray-50 border-gray-200 text-slate-700"
                    }`}
                  >
                    <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="tabular-nums">{formatTime(timeLeft)}</span>
                  </div>
                <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold min-h-[44px] touch-manipulation">
                  GÖNDER
                </Button>
              </div>
                </div>
              </div>

              {/* Desktop Header - Horizontal Layout */}
              <div className="hidden lg:flex items-center justify-between w-full">
                <div className="flex items-center">
                  <img 
                    src="/logo11.svg" 
                    alt="TURKISHMOCK" 
                    className="h-10 sm:h-11 md:h-12 w-auto object-contain"
                    onError={(e) => {
                      console.error("Logo failed to load");
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="font-extrabold text-3xl tracking-wider">OKUMA</div>
                <div className="flex items-center gap-4">
                  <NotesPanel currentPartNumber={currentPartNumber} />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="h-9 w-9 rounded border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                      onClick={() => setFontScale((v) => Math.max(0.9, Math.round((v - 0.05) * 100) / 100))}
                      aria-label="Metni küçült"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      className="h-9 w-9 rounded border border-gray-200 bg-white text-xs font-semibold text-gray-700"
                      onClick={() => setFontScale((v) => Math.min(1.2, Math.round((v + 0.05) * 100) / 100))}
                      aria-label="Metni büyült"
                    >
                      A+
                    </button>
                  </div>
                  <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${
                      timeLeft <= 300
                        ? "bg-red-50 border-red-200 text-red-700"
                        : timeLeft <= 600
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-gray-50 border-gray-200 text-slate-700"
                    }`}
                  >
                    <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="tabular-nums">{formatTime(timeLeft)}</span>
                  </div>
                  <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">
                    GÖNDER
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Description Section - Responsive */}
      <div className="mx-2 sm:mx-4 mt-2">
        <div className="p-3 sm:p-5 bg-gray-100 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-[#333333]">
              {currentPartNumber}. OKUMA METNİ
            </h3>
            <button
              type="button"
              onClick={() => setShowDescription((v) => !v)}
              className="text-xs sm:text-sm font-semibold text-gray-700 border border-gray-200 rounded-md px-2 py-1 bg-white"
            >
              {showDescription ? "Anlatımı Gizle" : "Anlatımı Göster"}
            </button>
          </div>
          {showDescription && (
            <p className="text-sm sm:text-base lg:text-lg text-[#333333] leading-relaxed">
              {getStaticHeader(currentPartNumber)}
            </p>
          )}
        </div>
      </div>

      {/* Minimal info to verify network call */}
      <div className="max-w-7xl mx-auto px-6 py-3">
        {isLoading && <div className="text-sm text-[#333333]">Loading reading test...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {/* Dynamic Part Content */}
      {!isLoading && !error && testData && currentPartNumber === 1 && (
        <ReadingPart1 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 3 && (
        <ReadingPart3 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 4 && (
        <ReadingPart4 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 5 && (
        <ReadingPart5 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

      {!isLoading && !error && testData && currentPartNumber === 2 && (
        <ReadingPart2 
          testData={testData} 
          answers={answers} 
          onAnswerChange={handleAnswerChange}
          partNumber={currentPartNumber}
        />
      )}

      {/* Footer navigation: Responsive like listening test */}
      {!isLoading && !error && testData && (
        <>
          {/* Desktop Layout - Tabs */}
          <div className="hidden lg:block fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-300 shadow-sm p-1.5 sm:p-2 z-50">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between gap-4">
                <div className="flex justify-center gap-2 flex-nowrap overflow-x-auto flex-1">
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
                        className={`text-center border-2 rounded-lg p-1.5 min-w-fit cursor-pointer ${
                          isActive ? "border-[#438553] bg-[#438553]/15" : "border-gray-300 bg-gray-50 hover:bg-[#F6F5F2]"
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
                                className={`w-5.5 h-5.5 rounded-full border-2 border-gray-800 flex items-center justify-center text-[11px] font-bold ${
                                  isAnswered ? "bg-[#438553]" : "bg-white"
                                }`}
                              >
                                {q}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-[11px] font-bold">{partNum}. BÖLÜM</div>
                      </div>
                    );
                  });
                })()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handlePrevPart}
                    disabled={currentPartNumber <= 1}
                    className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 font-bold w-9 h-9 p-0 text-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    aria-label="Önceki"
                  >
                    ‹
                  </Button>
                  <Button
                    onClick={handleNextPart}
                    disabled={currentPartNumber >= 5}
                    className="bg-[#438553] hover:bg-[#356A44] active:bg-[#2d5a3a] text-white font-bold w-9 h-9 p-0 text-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    aria-label="Sonraki"
                  >
                    ›
                  </Button>
                </div>
              </div>
            </div>
          </div>

        {/* Mobile Layout - Prev/Next controls */}
        <div className="lg:hidden fixed bottom-2 right-2 left-2 grid grid-cols-3 items-center gap-2 px-2.5 py-1.5 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-300/80 z-50">
            <div className="justify-self-start">
              <Button
                onClick={handlePrevPart}
                disabled={currentPartNumber <= 1}
                className="bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 font-bold w-10 h-9 p-0 text-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Önceki"
              >
                ‹
              </Button>
            </div>
            <div className="justify-self-center text-xs sm:text-sm font-bold">
              {currentPartNumber}. BÖLÜM
            </div>
            <div className="justify-self-end">
              <Button
                onClick={handleNextPart}
                disabled={currentPartNumber >= 5}
                className="bg-[#438553] hover:bg-[#356A44] active:bg-[#2d5a3a] text-white font-bold w-10 h-9 p-0 text-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Sonraki"
              >
                ›
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
    </ReadingNotesProvider>
  );
}











