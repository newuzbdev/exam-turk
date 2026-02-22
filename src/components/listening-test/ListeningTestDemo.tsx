import { useEffect, useRef, useState } from "react";
import { listeningTestService } from "@/services/listeningTest.service";
import type { ListeningTestItem } from "@/services/listeningTest.service";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { overallTestFlowStore } from "@/services/overallTest.service";
import { AudioPlayer } from "@/pages/listening-test/components/AudioPlayer";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ConfirmationModal } from "../ui/confirmation-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HighlightableTextSimple from "@/components/listening-test/HighlightableTextSimple";
import MapWithDrawing from "@/components/listening-test/MapWithDrawing";
import { toast } from "sonner";
import { fixMojibake } from "@/utils/text";

interface UserAnswers {
  [questionId: string]: string;
}

interface ListeningProgressSnapshot {
  currentPartNumber: number;
  userAnswers: UserAnswers;
  timeLeft: number;
  timerActive: boolean;
  showReviewNotice: boolean;
  updatedAt: number;
}

export default function ListeningTestDemo({ testId }: { testId: string }) {
  const [testData, setTestData] = useState<ListeningTestItem | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [currentPartNumber, setCurrentPartNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes in seconds
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [showDescription, setShowDescription] = useState(true);
  const [showReviewNotice, setShowReviewNotice] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLg, setIsLg] = useState<boolean>(false);
  const [mobilePart3OpenId, setMobilePart3OpenId] = useState<string | number | null>(null);
  const [mobilePart4MapZoomed, setMobilePart4MapZoomed] = useState(false);
  const [part4DrawEnabled, setPart4DrawEnabled] = useState(false);
  const [part4ClearToken, setPart4ClearToken] = useState(0);
  const [isProgressReady, setIsProgressReady] = useState(false);
  const [isPartSwitchAnimating, setIsPartSwitchAnimating] = useState(false);
  const [inkPulseKey, setInkPulseKey] = useState<string | null>(null);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const inkPulseTimeoutRef = useRef<number | null>(null);
  const hasRestoredProgressRef = useRef(false);
  const fullscreenRetryBoundRef = useRef(false);
  const fullscreenRetryHandlerRef = useRef<(() => void) | null>(null);
  const progressStorageKey = `listening_progress_${testId}`;
  const audioProgressStorageKey = `listening_audio_progress_${testId}`;
  // Removed exam-mode body lock for listening; keep state local if needed later
  
  const navigate = useNavigate();

  const stopAllMediaPlayback = (hardReset: boolean = false) => {
    if (typeof document === "undefined") return;
    const mediaElements = Array.from(document.querySelectorAll("audio, video")) as HTMLMediaElement[];
    mediaElements.forEach((media) => {
      try {
        media.pause();
        if (hardReset) {
          media.currentTime = 0;
          media.removeAttribute("src");
          media.load();
        }
      } catch {}
    });
  };

  useEffect(() => {
    const loadTestData = async () => {
      try {
        // First try to get pre-loaded data from sessionStorage
        const cachedData = sessionStorage.getItem(`test_data_LISTENING_${testId}`);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          setTestData(data);
          setLoading(false);
          return;
        }

        // Fallback to API call if no cached data
        const data = await listeningTestService.getTestWithFullData(testId);
        setTestData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error loading test data:", error);
        setLoading(false);
      }
    };

    if (testId) {
      loadTestData();
    }
  }, [testId]);

  useEffect(() => {
    hasRestoredProgressRef.current = false;
    setIsProgressReady(false);
    let parsed: Partial<ListeningProgressSnapshot> | null = null;
    try {
      const raw = sessionStorage.getItem(progressStorageKey);
      if (raw) parsed = JSON.parse(raw) as Partial<ListeningProgressSnapshot>;
    } catch {}

    if (parsed && typeof parsed === "object") {
      const restoredPart = Number(parsed.currentPartNumber);
      if (Number.isFinite(restoredPart)) {
        setCurrentPartNumber(Math.min(6, Math.max(1, Math.round(restoredPart))));
      }

      if (parsed.userAnswers && typeof parsed.userAnswers === "object") {
        setUserAnswers(parsed.userAnswers as UserAnswers);
      }

      const restoredTimeLeft = Number(parsed.timeLeft);
      if (Number.isFinite(restoredTimeLeft)) {
        setTimeLeft(Math.max(0, Math.min(600, Math.round(restoredTimeLeft))));
      }

      const restoredTimerActive = Boolean(parsed.timerActive) && Number(parsed.timeLeft) > 0;
      setTimerActive(restoredTimerActive);
      setShowReviewNotice(Boolean(parsed.showReviewNotice) || restoredTimerActive);
    }

    hasRestoredProgressRef.current = true;
    setIsProgressReady(true);
  }, [progressStorageKey]);

  // Track screen size (lg breakpoint: 1024px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const set = () => setIsLg(mq.matches);
    set();
    try {
      mq.addEventListener('change', set);
    } catch {
      // Safari
      // @ts-ignore
      mq.addListener(set);
    }
    return () => {
      try {
        mq.removeEventListener('change', set);
      } catch {
        // @ts-ignore
        mq.removeListener(set);
      }
    };
  }, []);

  useEffect(() => {
    if (currentPartNumber !== 3) {
      setMobilePart3OpenId(null);
    }
  }, [currentPartNumber]);
  
  useEffect(() => {
    if (currentPartNumber !== 4) {
      setMobilePart4MapZoomed(false);
      setPart4DrawEnabled(false);
    }
  }, [currentPartNumber]);

  useEffect(() => {
    const content = contentScrollRef.current;
    if (content) content.scrollTop = 0;
  }, [currentPartNumber]);

  useEffect(() => {
    setIsPartSwitchAnimating(true);
    const raf = window.requestAnimationFrame(() => {
      setIsPartSwitchAnimating(false);
    });
    return () => window.cancelAnimationFrame(raf);
  }, [currentPartNumber]);

  useEffect(() => {
    return () => {
      stopAllMediaPlayback();
      if (inkPulseTimeoutRef.current) {
        window.clearTimeout(inkPulseTimeoutRef.current);
        inkPulseTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredProgressRef.current) return;
    const snapshot: ListeningProgressSnapshot = {
      currentPartNumber,
      userAnswers,
      timeLeft,
      timerActive,
      showReviewNotice,
      updatedAt: Date.now(),
    };
    try {
      sessionStorage.setItem(progressStorageKey, JSON.stringify(snapshot));
    } catch {}
  }, [progressStorageKey, currentPartNumber, userAnswers, timeLeft, timerActive, showReviewNotice]);

  // Keep scrolling inside the test content only (prevents page-level white gap on mobile).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehaviorY;
    const prevBodyOverscroll = body.style.overscrollBehaviorY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehaviorY = "none";
    body.style.overscrollBehaviorY = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehaviorY = prevHtmlOverscroll;
      body.style.overscrollBehaviorY = prevBodyOverscroll;
    };
  }, []);
  

  // Enter fullscreen and lock navigation (exam mode)
  useEffect(() => {
    const addNavigationLock = () => {
      // Prevent back navigation within the test
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
        // toast.error("Sınav sırasında geri gidemezsiniz");
      };
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", handlePopState);

      // Warn on refresh/close
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
        if (document.fullscreenElement) return true;
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) await el.msRequestFullscreen();
        return true;
      } catch {
        return false;
      }
    };

    const cleanupNav = addNavigationLock();
    const tryEnterFullscreenWithGestureFallback = async () => {
      const ok = await enterFullscreen();
      if (ok || fullscreenRetryBoundRef.current) return;
      fullscreenRetryBoundRef.current = true;
      const tryAgain = () => {
        enterFullscreen().finally(() => {
          if (document.fullscreenElement) {
            document.removeEventListener("pointerdown", tryAgain);
            document.removeEventListener("touchstart", tryAgain);
            document.removeEventListener("keydown", tryAgain);
            fullscreenRetryBoundRef.current = false;
            fullscreenRetryHandlerRef.current = null;
          }
        });
      };
      fullscreenRetryHandlerRef.current = tryAgain;
      document.addEventListener("pointerdown", tryAgain, { once: true });
      document.addEventListener("touchstart", tryAgain, { once: true });
      document.addEventListener("keydown", tryAgain, { once: true });
    };
    tryEnterFullscreenWithGestureFallback();

    return () => {
      // Only exit fullscreen if not in overall test flow
      const hasActiveOverallTest = overallTestFlowStore.hasActive();
      if (!hasActiveOverallTest && document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
      if (fullscreenRetryHandlerRef.current) {
        document.removeEventListener("pointerdown", fullscreenRetryHandlerRef.current);
        document.removeEventListener("touchstart", fullscreenRetryHandlerRef.current);
        document.removeEventListener("keydown", fullscreenRetryHandlerRef.current);
        fullscreenRetryHandlerRef.current = null;
      }
      fullscreenRetryBoundRef.current = false;
      cleanupNav?.();
    };
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            // Auto submit when time runs out
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timerActive, timeLeft]);

  // Handle audio ended - start timer
  const handleAudioEnded = () => {
    setTimerActive(true);
    setShowReviewNotice(true);
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const triggerRadioInkPulse = (questionId: string, answer: string) => {
    const key = `${questionId}::${answer}`;
    setInkPulseKey(key);
    if (inkPulseTimeoutRef.current) {
      window.clearTimeout(inkPulseTimeoutRef.current);
    }
    inkPulseTimeoutRef.current = window.setTimeout(() => {
      setInkPulseKey((curr) => (curr === key ? null : curr));
    }, 220);
  };

  const isRadioInkActive = (questionId: string, answer: string) => inkPulseKey === `${questionId}::${answer}`;

  const handleAnswerSelect = (questionId: string, answer: string) => {
    triggerRadioInkPulse(questionId, answer);
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const scrollContentToTop = (behavior: ScrollBehavior = "auto") => {
    const content = contentScrollRef.current;
    if (content) {
      content.scrollTo({ top: 0, behavior });
      return;
    }
    window.scrollTo({ top: 0, behavior });
  };

  const goToNextBolum = () => {
    setCurrentPartNumber((prev) => Math.min(6, prev + 1));
    scrollContentToTop("smooth");
  };
  const goToPrevBolum = () => {
    setCurrentPartNumber((prev) => Math.max(1, prev - 1));
    scrollContentToTop("smooth");
  };

  const getTotalQuestions = () => {
    // Sum across normalized bölüm groups 1..6
    let total = 0;
    for (let i = 1; i <= 6; i++) {
      total += getQuestionsForPartNumber(i).length;
    }
    return total;
  };

  const getAnsweredCountForPart = (partNumber: number) => {
    const questions = getQuestionsForPartNumber(partNumber);
    return questions.reduce((count, q: any) => (userAnswers[q.id] ? count + 1 : count), 0);
  };

  const getAllSections = () => {
    const sections: any[] = [];
    if (!testData?.parts) return sections;
    for (const p of testData.parts as any[]) {
      const parentPartNumber = typeof p.number === 'number' ? p.number : undefined;
      for (const s of (p.sections || [])) {
        sections.push({
          ...s,
          partNumber: parentPartNumber,
        });
      }
    }
    return sections;
  };

  // Use actual parent part numbers from API instead of guessing by text

  const getQuestionsForPartNumber = (partNumber: number) => {
    const questions: any[] = [];
    const sections = getAllSections();
    
    sections.forEach((section: any, sectionIndex: number) => {
      if ((section.partNumber || 0) === partNumber) {
        (section.questions || []).forEach((question: any) => {
          questions.push({
            ...question,
            sectionTitle: fixMojibake(section.title || ""),
            sectionContent: fixMojibake(section.content || ""),
            imageUrl: section.imageUrl,
            partNumber,
            sectionIndex,
          });
        });
      }
    });
    
    return questions;
  };

  const renderQuestion = (question: any, _questionNumber: number, _partNumber?: number) => {
    const selectedAnswer = userAnswers[question.id];
    const isSecondBolum = _partNumber === 2;
    const questionNumber = _questionNumber || 0;

    if (question.type === "TRUE_FALSE") {
      return (
        <div key={question.id} className="space-y-2">
          <div className="space-y-1.5">
            <p className={`text-base text-[#333333] leading-relaxed ${isSecondBolum ? "" : "font-semibold"}`}>
              <span className="font-bold">S{questionNumber}. </span>
              <HighlightableTextSimple text={fixMojibake(question.text || question.content || "")} />
            </p>

            <div className="grid grid-cols-2 gap-2 max-w-[280px]">
              <label
                className="grid grid-cols-[20px_20px_1fr] items-center gap-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnswerSelect(question.id, "A");
                }}
              >
                <span className="text-[18px] font-semibold text-gray-700">A</span>
                <div
                  className={`relative overflow-hidden w-5 h-5 rounded-full border-[1.75px] flex items-center justify-center transition-all duration-150 ease-out ${
                    selectedAnswer === "A"
                      ? "border-[#438553] scale-[1.02]"
                      : "border-gray-400 scale-100"
                  } ${isRadioInkActive(question.id, "A") ? "radio-ink-hit" : ""}`}
                >
                  {isRadioInkActive(question.id, "A") && <span className="pointer-events-none absolute inset-0 rounded-full radio-ink-splash" />}
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-150 ease-out ${
                      selectedAnswer === "A" ? "bg-[#438553] scale-100 opacity-100" : "bg-transparent scale-75 opacity-0"
                    }`}
                  />
                </div>
                <span className="text-[18px] text-[#333333]">Doğru</span>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  className="sr-only"
                  checked={selectedAnswer === "A"}
                  onChange={() => handleAnswerSelect(question.id, "A")}
                  onFocus={(e) => e.target.blur()}
                  tabIndex={-1}
                />
              </label>

              <label
                className="grid grid-cols-[20px_20px_1fr] items-center gap-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnswerSelect(question.id, "B");
                }}
              >
                <span className="text-[18px] font-semibold text-gray-700">B</span>
                <div
                  className={`relative overflow-hidden w-5 h-5 rounded-full border-[1.75px] flex items-center justify-center transition-all duration-150 ease-out ${
                    selectedAnswer === "B"
                      ? "border-[#438553] scale-[1.02]"
                      : "border-gray-400 scale-100"
                  } ${isRadioInkActive(question.id, "B") ? "radio-ink-hit" : ""}`}
                >
                  {isRadioInkActive(question.id, "B") && <span className="pointer-events-none absolute inset-0 rounded-full radio-ink-splash" />}
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-150 ease-out ${
                      selectedAnswer === "B" ? "bg-[#438553] scale-100 opacity-100" : "bg-transparent scale-75 opacity-0"
                    }`}
                  />
                </div>
                <span className="text-[18px] text-[#333333]">Yanlış</span>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  className="sr-only"
                  checked={selectedAnswer === "B"}
                  onChange={() => handleAnswerSelect(question.id, "B")}
                  onFocus={(e) => e.target.blur()}
                  tabIndex={-1}
                />
              </label>
            </div>
          </div>
        </div>
      );
    }

    // MULTIPLE_CHOICE
    return (
      <div key={question.id} className="space-y-2">
        <div className="space-y-1.5">
          <p className={`text-base text-[#333333] leading-relaxed ${isSecondBolum ? "" : "font-semibold"}`}>
            <span className="font-bold">S{questionNumber}. </span>
            <HighlightableTextSimple text={fixMojibake(question.text || question.content || "")} />
          </p>

          <div className={(_partNumber === 1 || _partNumber === 5 || _partNumber === 6) ? "" : "divide-y divide-gray-200"}>
            {question.answers?.map((answer: any) => (
              <label
                key={answer.id}
                className="grid grid-cols-[22px_22px_minmax(0,1fr)] items-start gap-2 py-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnswerSelect(question.id, answer.variantText);
                }}
              >
                <span className="text-[18px] font-semibold text-gray-700">{answer.variantText}</span>
                <div
                  className={`relative overflow-hidden w-5 h-5 rounded-full border-[1.75px] flex items-center justify-center mt-0.5 transition-all duration-150 ease-out ${
                    selectedAnswer === answer.variantText
                      ? "border-[#438553] scale-[1.02]"
                      : "border-gray-400 scale-100"
                  } ${isRadioInkActive(question.id, answer.variantText) ? "radio-ink-hit" : ""}`}
                >
                  {isRadioInkActive(question.id, answer.variantText) && <span className="pointer-events-none absolute inset-0 rounded-full radio-ink-splash" />}
                  <div
                    className={`w-4 h-4 rounded-full transition-all duration-150 ease-out ${
                      selectedAnswer === answer.variantText
                        ? "bg-[#438553] scale-100 opacity-100"
                        : "bg-transparent scale-75 opacity-0"
                    }`}
                  />
                </div>
                <span className="text-[18px] text-[#333333] leading-relaxed">
                  <HighlightableTextSimple text={fixMojibake(String(answer.answer || "")).replace(/^[A-Z][.)]\s*/, '')} />
                </span>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={answer.variantText}
                  checked={selectedAnswer === answer.variantText}
                  onChange={() => handleAnswerSelect(question.id, answer.variantText)}
                  className="sr-only"
                  onFocus={(e) => e.target.blur()}
                  tabIndex={-1}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  const getStaticHeader = (partNumber: number) => {
  const headers = {
    1: "Sorular 1-8. Dinlediğiniz cümleleri tamamlayınız. Cümleleri iki defa dinleyeceksiniz. Her cümleye cevap olabilecek en doğru seçeneği (A, B veya C) işaretleyiniz.",
    2: "Sorular 9-14. Dinlediğiniz metne göre aşağıdaki cümleler için DOĞRU ya da YANLIŞ seçeneklerinden birini işaretleyiniz.\nDOĞRU – cümle, dinleme metnindeki bilgilerle uyumlu ve/veya tutarlıysa \nYANLIŞ – cümle, dinleme metnindeki bilgilerle tutarsız ve/veya çelişkiliyse",
    3: "Sorular 15-18. Şimdi insanların farklı durumlardaki konuşmalarını dinleyeceksiniz. Her konuşmacının (15-18) konuşmalarının ait olduğu seçenekleri (A-F) işaretleyiniz. Seçmemeniz gereken İKİ seçenek bulunmaktadır.",
    4: "4. DİNLEME METNİ\nDİNLEME metnine göre haritadaki yerleri (A-H) işaretleyiniz (19-23).\nSeçilmemesi gereken ÜÇ seçenek bulunmaktadır.",
    5: "5. DİNLEME METNİ\nSorular 24-29. Aşağıdaki soruları okuyunuz ve dinleme metinlerine göre doğru seçeneği (A, B ya da C) işaretleyiniz.",
    6: "6. DİNLEME METNİ\nSorular 30-35. DİNLEME metnine göre doğru seçeneği (A, B ya da C) işaretleyiniz."
  };
  return headers[partNumber as keyof typeof headers] || `DİNLEME metni ${partNumber}`;
};
const renderPart = (bolum: number) => {
    const questions = getQuestionsForPartNumber(bolum);
    // sequential numbering across parts based on their number
    let questionNumber = 1;
    for (let i = 1; i < bolum; i++) {
      questionNumber += getQuestionsForPartNumber(i).length;
    }

    

    // Special layout for Part 3 (questions on left, answer options on right)
    if (bolum === 3) {
      const optionMap = new Map<string, any>();
      questions.forEach((q: any) => {
        (q.answers || []).forEach((a: any) => {
          if (a?.variantText && !optionMap.has(a.variantText)) {
            optionMap.set(a.variantText, a);
          }
        });
      });
      const answerOptions = Array.from(optionMap.values()).sort((a: any, b: any) =>
        String(a.variantText).localeCompare(String(b.variantText))
      );

      return (
        <div key={`bolum-${bolum}`} className="w-full mx-auto pb-6 md:pb-10 lg:pb-40">
          <div className="p-3 sm:p-4 bg-white">
            <div className="border border-gray-200 bg-white max-w-[1150px] mr-auto ml-0">
              <div className="hidden lg:grid lg:grid-cols-[minmax(0,0.74fr)_560px] border-b border-gray-200 bg-gray-50/70 text-[14px] font-semibold text-gray-700">
                <div className="px-3 py-2 text-left">Sorular / Seçim</div>
                <div className="px-3 py-2 text-left border-l border-gray-200">Seçenekler</div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.74fr)_560px]">
                <div>
                  {questions.map((question, index) => {
                    const numbered = questionNumber + index;
                    return (
                      <div key={question.id} className="border-b border-gray-200 last:border-b-0 px-3 py-3">
                        <div className="inline-flex flex-wrap items-center gap-1 text-left text-[18px] text-[#333333] leading-relaxed">
                          <span className="font-bold">S{numbered}.</span>
                          <span>
                            <HighlightableTextSimple text={fixMojibake(question.text || question.content || "")} />
                          </span>
                          <Select
                            value={userAnswers[question.id] || ""}
                            onValueChange={(value) => handleAnswerSelect(question.id, value)}
                          >
                            <SelectTrigger
                              className={`w-[116px] h-10 text-[16px] cursor-pointer rounded-md border transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                                userAnswers[question.id]
                                  ? "border-gray-400 bg-gray-100 text-[#333333]"
                                  : "border-gray-300 bg-gray-50 text-[#333333] hover:border-gray-400 hover:bg-white"
                              } focus-visible:ring-1 focus-visible:ring-black/15 focus-visible:ring-offset-0 focus-visible:border-gray-400`}
                            >
                              <SelectValue placeholder="Seç" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200 shadow-sm rounded-md">
                              {answerOptions.map((option: any) => (
                                <SelectItem
                                  key={`${question.id}-${option.id || option.variantText}`}
                                  value={option.variantText}
                                  className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]"
                                >
                                  {option.variantText}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t lg:border-t-0 lg:border-l border-gray-200">
                  <div className="px-2 py-2.5 grid grid-cols-1 gap-3.5">
                    {answerOptions.map((option: any) => (
                      <div key={option.id || option.variantText} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2.5 text-left">
                        <span className="w-7 h-7 rounded-full border border-gray-300 bg-gray-100 flex items-center justify-center text-[16px] font-semibold text-gray-600">
                          {option.variantText}
                        </span>
                        <span className="text-[18px] text-[#333333] leading-[1.3] whitespace-nowrap">
                          <HighlightableTextSimple text={fixMojibake(String(option.answer || "")).replace(/^[A-Z][.)]\s*/, "")} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Special layout for Part 4 (image matching questions)
    if (bolum === 4) {
      // Get imageUrl from section, not from question
      const sections = getAllSections();
      const part4Section = sections.find((s: any) => s.partNumber === 4);
      const imageUrl = part4Section?.imageUrl || questions.find(q => q.imageUrl)?.imageUrl;
      
      return (
        <div key={`bolum-${bolum}`} className="w-full mx-auto overflow-hidden pb-0 md:pb-8 lg:pb-40">
          {/* Mobile Layout - Stacked */}
          <div className="block lg:hidden">
            <div className="flex h-[min(68dvh,640px)] min-h-[420px] flex-col bg-white">
            {/* Image Section */}
            <div className="shrink-0 p-3 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#333333]">Harita</h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMobilePart4MapZoomed((v) => !v)}
                    className="text-xs font-semibold px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-700"
                  >
                    {mobilePart4MapZoomed ? "Küçült" : "Büyüt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPart4DrawEnabled((v) => !v)}
                    className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                      part4DrawEnabled
                        ? "border-[#438553] bg-[#438553]/10 text-[#356A44]"
                        : "border-gray-300 bg-white text-gray-700"
                    }`}
                  >
                    {part4DrawEnabled ? "Çizim Açık" : "Çizim Kapalı"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPart4ClearToken((v) => v + 1)}
                    className="text-xs font-semibold px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-700"
                  >
                    Temizle
                  </button>
                </div>
              </div>
              <div
                className={`flex justify-center mt-2 ${mobilePart4MapZoomed ? "max-h-[42dvh] overflow-auto rounded-lg border border-gray-200 p-2" : ""}`}
                onClick={() => {
                  if (!part4DrawEnabled) setMobilePart4MapZoomed((v) => !v);
                }}
              >
              {imageUrl ? (
                <MapWithDrawing
                  src={
                    imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
                      ? imageUrl
                      : `https://api.turkishmock.uz/${imageUrl}`
                  }
                  alt="Map for questions 19-23"
                  className={`rounded-md border border-gray-200 transition-all duration-200 ${
                    mobilePart4MapZoomed
                      ? "min-w-[720px] min-h-[520px] shadow-lg"
                      : "w-full max-w-[340px] h-auto cursor-zoom-in"
                  }`}
                  drawEnabled={part4DrawEnabled}
                  clearToken={part4ClearToken}
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.src = "https://placehold.co/400x300?text=Görsel+Yüklenemedi";
                  }}
                />
              ) : (
                  <div className="w-full h-48 bg-gray-50 flex items-center justify-center text-gray-400 rounded-lg border border-gray-200">
                  Görsel bulunamadı
                </div>
              )}
              </div>
            </div>

            {/* Questions Section */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-24 bg-white scrollbar-thin scrollbar-thumb-gray-300/60 scrollbar-track-transparent">
              <h4 className="text-base font-bold text-[#333333] mb-3">Sorular</h4>
                {questions.length === 0 && (
                <div className="text-center text-[#333333] py-4">Bu bölüm için soru bulunamadı.</div>
                )}
              <div className="space-y-2">
                {questions.map((question, index) => {
                  const numbered = questionNumber + index;
                  return (
                    <div key={question.id} className="w-full border-b border-gray-200 last:border-b-0 py-2">
                      <div className="text-sm text-[#333333] leading-relaxed">
                        <span className="font-bold">S{numbered}. </span>
                        <HighlightableTextSimple text={fixMojibake(question.text || question.content || "")} />
                      </div>
                      <div className="mt-2">
                        <Select
                          value={userAnswers[question.id] || ""}
                          onValueChange={(value) => handleAnswerSelect(question.id, value)}
                        >
                          <SelectTrigger
                            className={`w-20 h-10 text-sm cursor-pointer rounded-md border transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                              userAnswers[question.id]
                                ? "border-gray-400 bg-gray-100 text-[#333333]"
                                : "border-gray-300 bg-gray-50 text-[#333333] hover:border-gray-400 hover:bg-white"
                            } focus-visible:ring-1 focus-visible:ring-black/15 focus-visible:ring-offset-0 focus-visible:border-gray-400`}
                          >
                            <SelectValue placeholder="Seç" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-sm rounded-md">
                            <SelectItem value="A" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">A</SelectItem>
                            <SelectItem value="B" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">B</SelectItem>
                            <SelectItem value="C" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">C</SelectItem>
                            <SelectItem value="D" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">D</SelectItem>
                            <SelectItem value="E" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">E</SelectItem>
                            <SelectItem value="F" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">F</SelectItem>
                            <SelectItem value="G" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">G</SelectItem>
                            <SelectItem value="H" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">H</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            </div>

          </div>

          {/* Desktop Layout - Resizable */}
          <div className="hidden lg:block">
            <ResizablePanelGroup direction="horizontal" className="w-full min-h-[500px]">
              <ResizablePanel defaultSize={60} minSize={5} maxSize={95}>
                <div className="border-r border-gray-200 p-4 h-full flex flex-col bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-semibold text-[#333333]">Harita</h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMobilePart4MapZoomed((v) => !v)}
                        className="text-xs font-semibold px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-700"
                      >
                        {mobilePart4MapZoomed ? "Küçült" : "Büyüt"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPart4DrawEnabled((v) => !v)}
                        className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                          part4DrawEnabled
                            ? "border-[#438553] bg-[#438553]/10 text-[#356A44]"
                            : "border-gray-300 bg-white text-gray-700"
                        }`}
                      >
                        {part4DrawEnabled ? "Çizim Açık" : "Çizim Kapalı"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPart4ClearToken((v) => v + 1)}
                        className="text-xs font-semibold px-2 py-1 rounded-md border border-gray-300 bg-white text-gray-700"
                      >
                        Temizle
                      </button>
                    </div>
                  </div>
                  <div
                    className={`flex-1 flex items-center justify-center mt-4 ${mobilePart4MapZoomed ? "overflow-auto" : ""}`}
                    onClick={() => {
                      if (!part4DrawEnabled) setMobilePart4MapZoomed((v) => !v);
                    }}
                  >
                    {imageUrl ? (
                      <MapWithDrawing
                        src={
                          imageUrl.startsWith('http://') || imageUrl.startsWith('https://')
                            ? imageUrl
                            : `https://api.turkishmock.uz/${imageUrl}`
                        }
                        alt="Map for questions 19-23"
                        className={`transition-all duration-200 ${
                          mobilePart4MapZoomed
                            ? "min-w-[980px] min-h-[680px] object-contain"
                            : "w-full h-auto max-h-[560px] object-contain cursor-zoom-in"
                        }`}
                        drawEnabled={part4DrawEnabled}
                        clearToken={part4ClearToken}
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.src = "https://placehold.co/800x600?text=Görsel+Yüklenemedi";
                        }}
                      />
                    ) : (
                      <div className="w-full h-64 bg-gray-50 flex items-center justify-center text-gray-400 rounded-lg">
                        Görsel bulunamadı
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle className="bg-gray-200 w-px" />
              <ResizablePanel defaultSize={40} minSize={5}>
                <div className="p-4 h-full overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-gray-300/60 scrollbar-track-transparent">
                    <div className="space-y-3">
                    <h4 className="text-base font-semibold text-[#333333] mb-2">Sorular</h4>
                    {questions.length === 0 && (
                      <div className="text-center text-[#333333] py-6">Bu bölüm için soru bulunamadı.</div>
                    )}
                    {questions.map((question, index) => {
                      const numbered = questionNumber + index;
                      return (
                        <div key={question.id} className="flex flex-wrap items-center gap-2 w-full py-2">
                          <span className="text-lg">
                            <span className="font-bold">S{numbered}. </span>
                            {fixMojibake(question.text || question.content || "")}
                          </span>
                          <div className="shrink-0">
                            <Select
                              value={userAnswers[question.id] || ""}
                              onValueChange={(value) => handleAnswerSelect(question.id, value)}
                            >
                              <SelectTrigger
                                className={`w-20 h-10 text-base cursor-pointer rounded-md border transition-all duration-150 ease-out data-[state=open]:scale-[1.01] ${
                                  userAnswers[question.id]
                                    ? "border-gray-400 bg-gray-100 text-[#333333]"
                                    : "border-gray-300 bg-gray-50 text-[#333333] hover:border-gray-400 hover:bg-white"
                                } focus-visible:ring-1 focus-visible:ring-black/15 focus-visible:ring-offset-0 focus-visible:border-gray-400`}
                              >
                                <SelectValue placeholder="Seç" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-gray-200 shadow-sm rounded-md">
                                <SelectItem value="A" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">A</SelectItem>
                                <SelectItem value="B" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">B</SelectItem>
                                <SelectItem value="C" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">C</SelectItem>
                                <SelectItem value="D" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">D</SelectItem>
                                <SelectItem value="E" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">E</SelectItem>
                                <SelectItem value="F" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">F</SelectItem>
                                <SelectItem value="G" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">G</SelectItem>
                                <SelectItem value="H" className="text-[15px] py-2 cursor-pointer focus:bg-gray-100 data-[state=checked]:bg-gray-100 data-[state=checked]:text-[#333333]">H</SelectItem>
                              </SelectContent>
                            </Select>
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


    // Special layout for Part 5 (group questions into dialogs)
    if (bolum === 5) {
      return (
        <div key={`bolum-${bolum}`} className="w-full mx-auto overflow-hidden">
          {/* Questions grouped by dialogs */}
          <div className="p-5 pb-3 sm:pb-5">
            {questions.length === 0 && (
              <div className="text-center text-[#333333] py-6">Bu bölüm için soru bulunamadı.</div>
            )}
            {questions.map((question, index) => {
              const dialogNumber = Math.floor(index / 2) + 1;
              const isFirstInDialog = index % 2 === 0;
              const isLastInDialog = index % 2 === 1;
              
              return (
                <div key={question.id}>
                  {/* Dialog Header - show before first question of each dialog */}
                  {isFirstInDialog && (
                    <div className="border border-gray-200 bg-gray-100 px-3 py-1 mb-4 mt-4 first:mt-0 w-[70%]">
                      <h3 className="font-bold text-sm text-left">{dialogNumber}. diyalog</h3>
                    </div>
                  )}
                  
                  {/* Question */}
                  <div className={index < questions.length - 1 ? "mb-8" : ""}>
                    {renderQuestion(question, questionNumber + index, bolum)}
                  </div>
                  
                  {/* Dialog Separator - show after second question of each dialog */}
                  {isLastInDialog && index < questions.length - 1 && (
                    <div className="border-t-2 border-gray-300 my-8"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Bölüm 1: iki sütunda 1-4 / 5-8 gibi sıralama
    if (bolum === 1) {
      const half = Math.ceil(questions.length / 2);
      const left = questions.slice(0, half);
      const right = questions.slice(half);
      return (
        <div key={`bolum-${bolum}`} className="w-full mx-auto overflow-hidden">
          <div className="p-5 pb-3 sm:pb-5">
            {questions.length === 0 ? (
              <div className="text-center text-[#333333] py-6">Bu bölüm için soru bulunamadı.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-5">
                  {left.map((question, index) => (
                    <div key={question.id} className="pb-5 border-b border-gray-200 last:border-b-0 last:pb-0">
                      {renderQuestion(question, questionNumber + index, bolum)}
                    </div>
                  ))}
                </div>
                <div className="space-y-5">
                  {right.map((question, index) => {
                    const idx = index + left.length;
                    return (
                      <div key={question.id} className="pb-5 border-b border-gray-200 last:border-b-0 last:pb-0">
                        {renderQuestion(question, questionNumber + idx, bolum)}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Bölüm 2: tablo görünümü (her soru bir satır)
    if (bolum === 2) {
      return (
        <div key={`bolum-${bolum}`} className="w-full max-w-7xl overflow-hidden">
          <div className="p-5">
            {questions.length === 0 ? (
              <div className="text-center text-[#333333] py-6">Bu bölüm için soru bulunamadı.</div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="block md:hidden space-y-3">
                  {questions.map((question, index) => {
                    const selected = userAnswers[question.id];
                    const numbered = questionNumber + index;
                    return (
                      <div key={question.id} className="py-3 border-b border-gray-200 last:border-b-0">
                        <div className="text-sm text-[#333333]">
                          <span className="font-semibold">S{numbered}. </span>
                          <HighlightableTextSimple text={fixMojibake(question.text || question.content || "")} />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-3 max-w-xs">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <div
                              className={`relative overflow-hidden w-6 h-6 rounded-full border-[1.75px] flex items-center justify-center transition-all duration-150 ease-out ${
                                selected === "A"
                                  ? "border-[#438553] scale-[1.02]"
                                  : "border-gray-400 scale-100"
                              } ${isRadioInkActive(question.id, "A") ? "radio-ink-hit" : ""}`}
                            >
                              {isRadioInkActive(question.id, "A") && <span className="pointer-events-none absolute inset-0 rounded-full radio-ink-splash" />}
                              <div
                                className={`w-5 h-5 rounded-full transition-all duration-150 ease-out ${
                                  selected === "A" ? "bg-[#438553] scale-100 opacity-100" : "bg-transparent scale-75 opacity-0"
                                }`}
                              />
                            </div>
                            <span className="text-sm text-gray-700">Doğru</span>
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              className="sr-only"
                              checked={selected === "A"}
                              onChange={() => handleAnswerSelect(question.id, "A")}
                            />
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <div
                              className={`relative overflow-hidden w-6 h-6 rounded-full border-[1.75px] flex items-center justify-center transition-all duration-150 ease-out ${
                                selected === "B"
                                  ? "border-[#438553] scale-[1.02]"
                                  : "border-gray-400 scale-100"
                              } ${isRadioInkActive(question.id, "B") ? "radio-ink-hit" : ""}`}
                            >
                              {isRadioInkActive(question.id, "B") && <span className="pointer-events-none absolute inset-0 rounded-full radio-ink-splash" />}
                              <div
                                className={`w-5 h-5 rounded-full transition-all duration-150 ease-out ${
                                  selected === "B" ? "bg-[#438553] scale-100 opacity-100" : "bg-transparent scale-75 opacity-0"
                                }`}
                              />
                            </div>
                            <span className="text-sm text-gray-700">Yanlış</span>
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              className="sr-only"
                              checked={selected === "B"}
                              onChange={() => handleAnswerSelect(question.id, "B")}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto max-w-7xl border border-gray-200 rounded-lg bg-white">
                  <table className="w-full max-w-7xl min-w-[760px] table-fixed">
                    <colgroup>
                      <col />
                      <col className="w-24" />
                      <col className="w-24" />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50/80 text-left">
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600">Soru</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-center border-l border-gray-200">Doğru</th>
                        <th className="px-4 py-2.5 text-xs font-semibold text-gray-600 text-center border-l border-gray-200">Yanlış</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/80">
                      {questions.map((question, index) => {
                        const selected = userAnswers[question.id];
                        const numbered = questionNumber + index;
                        return (
                          <tr
                            key={question.id}
                            className="odd:bg-white even:bg-gray-50/50 hover:bg-gray-100/60 transition-colors"
                          >
                            <td className="px-4 py-3.5 pr-1 text-base text-[#333333] leading-relaxed align-top">
                              <span className="font-semibold">S{numbered}. </span>
                              <HighlightableTextSimple text={fixMojibake(question.text || question.content || "")} />
                            </td>
                            <td className="px-4 py-3.5 text-center align-middle border-l border-gray-200/70">
                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                <div
                                  className={`relative overflow-hidden w-6 h-6 rounded-full border-[1.75px] flex items-center justify-center transition-all duration-150 ease-out ${
                                    selected === "A"
                                      ? "border-[#438553] scale-[1.02]"
                                      : "border-gray-400 scale-100"
                                  } ${isRadioInkActive(question.id, "A") ? "radio-ink-hit" : ""}`}
                                >
                                  {isRadioInkActive(question.id, "A") && <span className="pointer-events-none absolute inset-0 rounded-full radio-ink-splash" />}
                                  <div
                                    className={`w-5 h-5 rounded-full transition-all duration-150 ease-out ${
                                      selected === "A" ? "bg-[#438553] scale-100 opacity-100" : "bg-transparent scale-75 opacity-0"
                                    }`}
                                  />
                                </div>
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  className="sr-only"
                                  checked={selected === "A"}
                                  onChange={() => handleAnswerSelect(question.id, "A")}
                                />
                              </label>
                            </td>
                            <td className="px-4 py-3.5 text-center align-middle border-l border-gray-200/70">
                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                <div
                                  className={`relative overflow-hidden w-6 h-6 rounded-full border-[1.75px] flex items-center justify-center transition-all duration-150 ease-out ${
                                    selected === "B"
                                      ? "border-[#438553] scale-[1.02]"
                                      : "border-gray-400 scale-100"
                                  } ${isRadioInkActive(question.id, "B") ? "radio-ink-hit" : ""}`}
                                >
                                  {isRadioInkActive(question.id, "B") && <span className="pointer-events-none absolute inset-0 rounded-full radio-ink-splash" />}
                                  <div
                                    className={`w-5 h-5 rounded-full transition-all duration-150 ease-out ${
                                      selected === "B" ? "bg-[#438553] scale-100 opacity-100" : "bg-transparent scale-75 opacity-0"
                                    }`}
                                  />
                                </div>
                                <input
                                  type="radio"
                                  name={`question-${question.id}`}
                                  className="sr-only"
                                  checked={selected === "B"}
                                  onChange={() => handleAnswerSelect(question.id, "B")}
                                />
                              </label>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      );
    }

    // Default layout for other parts
    return (
      <div key={`bolum-${bolum}`} className="w-full mx-auto overflow-hidden">
        {/* Questions */}
          <div className={bolum === 6 ? "p-5 pb-3 sm:pb-5" : "p-5"}>
          <div className={bolum === 6 ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 md:grid-cols-2 gap-6"}>
            {questions.length === 0 && (
              <div className={bolum === 6 ? "col-span-1 text-center text-[#333333] py-6" : "col-span-2 text-center text-[#333333] py-6"}>
                Bu bölüm için soru bulunamadı.
              </div>
            )}
            {questions.map((question, index) => {
              const isDialogSection = question.sectionTitle?.includes("diyalog") || question.sectionContent?.includes("diyalog");
              
              return (
                <div
                  key={question.id}
                  className={(bolum === 2 || bolum === 6) && index < questions.length - 1 ? "pb-6 mb-6 border-b border-gray-200" : ""}
                >
                  {/* Section Header for Dialog */}
                  {isDialogSection && index === 0 && (
                    <div className={bolum === 6 ? "border border-gray-200 bg-gray-100 px-4 py-2 mb-6 col-span-1" : "border border-gray-200 bg-gray-100 px-4 py-2 mb-6 col-span-2"}>
                      <h3 className="font-semibold text-base">{fixMojibake(question.sectionTitle || `${question.sectionIndex + 1}. diyalog`)}</h3>
                    </div>
                  )}
                  
                  {/* Image if available - Fixed image rendering */}
                  {question.imageUrl && (
                    <div className={bolum === 6 ? "mb-6 col-span-1 flex justify-center" : "mb-6 col-span-2 flex justify-center"}>
                      <div className="w-full max-w-2xl mx-auto">
                        <div className="aspect-[4/3] bg-transparent rounded-2xl overflow-hidden flex items-center justify-center">
                          <img
                            src={
                              question.imageUrl.startsWith('http://') || question.imageUrl.startsWith('https://')
                                ? question.imageUrl
                                : `https://api.turkishmock.uz/${question.imageUrl}`
                            }
                            alt="Question image"
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.src = "https://placehold.co/800x600?text=Görsel+Yüklenemedi";
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Question */}
                  <div className={index < questions.length - 1 ? "mb-8" : ""}>
                    {renderQuestion(question, questionNumber + index, bolum)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderTabs = () => {
    // Create dynamic sections with question numbers
    const createSections = () => {
      const sections = [];
      let questionNumber = 1;
      
      for (let partNum = 1; partNum <= 6; partNum++) {
        const partQuestions = getQuestionsForPartNumber(partNum);
        const questionNumbers = [];
        
        for (let i = 0; i < partQuestions.length; i++) {
          questionNumbers.push(questionNumber + i);
        }
        
        sections.push({
          number: partNum,
          questions: questionNumbers,
          partQuestions: partQuestions
        });
        
        questionNumber += partQuestions.length;
      }
      
      return sections;
    };

    const sections = createSections();

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 border-t border-gray-200 p-2 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout - Scrollable */}
          <div className="block lg:hidden">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {sections.map((section) => {
                const isActive = currentPartNumber === section.number;

                return (
                  <div
                    key={section.number}
                    className={`text-center border rounded-md p-1 min-w-fit flex-shrink-0 cursor-pointer ${
                      isActive
                        ? "border-[#438553] bg-[#438553]/15"
                        : "border-gray-300 bg-gray-50 hover:bg-[#F6F5F2]"
                    }`}
                    onClick={() => {
                      setCurrentPartNumber(section.number);
                      // Smooth scroll to top of content
                      scrollContentToTop("smooth");
                    }}
                  >
                    <div className="flex gap-1 mb-1 justify-center flex-wrap">
                      {section.questions.slice(0, 4).map((q) => {
                        const questionId = section.partQuestions[q - section.questions[0]]?.id;
                        const isAnswered = questionId && userAnswers[questionId];

                        return (
                          <div
                            key={q}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                              isAnswered
                                ? "bg-[#438553] border-gray-800 text-white"
                                : "bg-white border-gray-800 text-gray-800"
                            }`}
                          >
                            {q}
                          </div>
                        );
                      })}
                      {section.questions.length > 4 && (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-bold bg-gray-200">
                          +{section.questions.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-center text-[10px] text-[#333333] mt-1">
              {Object.keys(userAnswers).length} / {getTotalQuestions()} soru
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="mb-2 flex items-center gap-3 px-1">
              <div className="text-[11px] font-semibold text-gray-700 min-w-[84px]">
                BÖLÜM {currentPartNumber}/6
              </div>
              <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#438553] transition-all duration-200 ease-out"
                  style={{ width: `${(currentPartNumber / 6) * 100}%` }}
                />
              </div>
              <div className="text-[11px] font-semibold text-gray-700 min-w-[78px] text-right">
                {getAnsweredCountForPart(currentPartNumber)}/{getQuestionsForPartNumber(currentPartNumber).length} cevap
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap justify-center flex-1">
                {sections.map((section) => {
                  const isActive = currentPartNumber === section.number;

                  return (
                    <div
                      key={section.number}
                      className={`text-center border rounded-md p-1 w-fit cursor-pointer ${
                        isActive
                          ? "border-[#438553] bg-[#438553]/15"
                          : "border-gray-300 bg-gray-50 hover:bg-[#F6F5F2]"
                      }`}
                      onClick={() => {
                        setCurrentPartNumber(section.number);
                        // Smooth scroll to top of content
                        scrollContentToTop("smooth");
                      }}
                    >
                      <div className="flex gap-1 mb-1 justify-center flex-wrap">
                        {section.questions.map((q) => {
                          const questionId = section.partQuestions[q - section.questions[0]]?.id;
                          const isAnswered = questionId && userAnswers[questionId];

                          return (
                          <div
                            key={q}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                              isAnswered
                                ? "bg-[#438553] border-gray-800 text-white"
                                : "bg-white border-gray-800 text-gray-800"
                            }`}
                          >
                            {q}
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={goToPrevBolum}
                  disabled={currentPartNumber <= 1}
                  className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-bold px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={goToNextBolum}
                  disabled={currentPartNumber >= 6}
                  className="bg-[#438553] hover:bg-[#356A44] active:bg-[#2d5a3a] text-white font-bold px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] touch-manipulation"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const clearListeningProgress = () => {
    try { sessionStorage.removeItem(progressStorageKey); } catch {}
    try { sessionStorage.removeItem(audioProgressStorageKey); } catch {}
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    try {
      stopAllMediaPlayback();
      setTimerActive(false);
      setShowReviewNotice(false);
      setIsSubmitting(true);
      
      // Store answers locally for later submission
      if (testData?.id) {
        // Collect all image URLs from sections
        const imageUrls: string[] = [];
        if (testData.parts) {
          testData.parts.forEach((part: any) => {
            if (part.sections) {
              part.sections.forEach((section: any) => {
                if (section.imageUrl) {
                  imageUrls.push(section.imageUrl);
                }
              });
            }
          });
        }
        
        const answersData = {
          testId: testData.id,
          answers: Object.entries(userAnswers).map(([questionId, userAnswer]) => ({ questionId, userAnswer })),
          audioUrl: testData.audioUrl || null,
          imageUrls: imageUrls,
          timestamp: new Date().toISOString()
        };
        // Store in sessionStorage for later submission
        sessionStorage.setItem(`listening_answers_${testData.id}`, JSON.stringify(answersData));
      }

      // Just navigate to next test without submitting
      const nextPath = overallTestFlowStore.onTestCompleted("LISTENING", testData?.id || "");
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
          stopAllMediaPlayback();
          clearListeningProgress();
          navigate(nextPath);
          return;
        }
      
      // If no next test, we're at the end - submit all tests
        const overallId = overallTestFlowStore.getOverallId();
        if (overallId && overallTestFlowStore.isAllDone()) {
        const submitAllOk = await submitAllTests(overallId);
        if (!submitAllOk) return;
        clearListeningProgress();
        return;
      }
      
      // Fallback to single test results
      stopAllMediaPlayback();
      clearListeningProgress();
      navigate(`/listening-test/results/temp`, { state: { summary: { testId: testData?.id } } });
    } catch (error) {
      console.error("Listening navigation error", error);
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
      stopAllMediaPlayback();
      navigate(`/overall-results/${overallId}`);
      return true;
    } catch (error) {
      console.error("Error submitting all tests:", error);
      toast.error("Testler gonderilirken hata olustu. Cevaplariniz saklandi.");
      stopAllMediaPlayback();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Test bulunamadı</div>
      </div>
    );
  }

  // current bölüm to render (1..6)
  const bolum = currentPartNumber;

  return (
    <div className="h-screen-mobile bg-white flex flex-col overflow-hidden font-sans text-[#333333] text-sm sm:text-base">
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full">
          {/* Match horizontal padding with description block below */}
          <div className="px-2 sm:px-4">
            <div className="flex justify-between items-center h-auto py-2 lg:h-[68px] lg:py-0">
              {/* Mobile Header - Single Line Layout */}
              <div className="block lg:hidden w-full">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-base sm:text-lg tracking-[0.08em]">
                    DİNLEME
                  </div>
                  <Button onClick={handleSubmitClick} className="shrink-0 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3 py-1.5 text-[16px] font-semibold min-h-[34px] touch-manipulation">
                    GÖNDER
                  </Button>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  {!isLg && testData?.audioUrl && !isSubmitting && (
                    <div className="min-w-0 flex-1 overflow-hidden rounded-lg">
                      <AudioPlayer
                        src={
                          testData.audioUrl.startsWith('http://') || testData.audioUrl.startsWith('https://')
                            ? testData.audioUrl
                            : `https://api.turkishmock.uz/${testData.audioUrl}`
                        }
                        onAudioEnded={handleAudioEnded}
                        autoPlay={isProgressReady ? !timerActive : false}
                        persistKey={audioProgressStorageKey}
                        compact
                      />
                    </div>
                  )}
                  {showReviewNotice && (
                    <div
                      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-bold leading-none ${
                        timerActive && timeLeft <= 300
                          ? "bg-red-50 border-red-200 text-red-700"
                          : timerActive && timeLeft <= 600
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-gray-50 border-gray-200 text-slate-700"
                      }`}
                    >
                      <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="tabular-nums">{timerActive ? formatTime(timeLeft) : "10:00"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop Header - Horizontal Layout */}
              <div className="hidden lg:flex items-center justify-between w-full">
                <div className="flex items-center">
                  <img 
                    src="/logo11.svg" 
                    alt="TURKISHMOCK" 
                    className="h-9 sm:h-10 md:h-11 w-auto object-contain"
                    onError={(e) => {
                      console.error("Logo failed to load");
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="font-semibold text-base sm:text-lg tracking-[0.08em]">DİNLEME</div>
                <div className="flex items-center gap-4">
                  {isLg && testData?.audioUrl && !isSubmitting && (
                    <AudioPlayer
                      src={
                        testData.audioUrl.startsWith('http://') || testData.audioUrl.startsWith('https://')
                          ? testData.audioUrl
                          : `https://api.turkishmock.uz/${testData.audioUrl}`
                      }
                      onAudioEnded={handleAudioEnded}
                      autoPlay={isProgressReady ? !timerActive : false}
                      persistKey={audioProgressStorageKey}
                    />
                  )}
                  {showReviewNotice && (
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${
                        timerActive && timeLeft <= 300
                          ? "bg-red-50 border-red-200 text-red-700"
                          : timerActive && timeLeft <= 600
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-gray-50 border-gray-200 text-slate-700"
                      }`}
                    >
                      <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="tabular-nums">{timerActive ? formatTime(timeLeft) : "10:00"}</span>
                    </div>
                  )}
                  <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-[16px] font-semibold min-h-[34px]">
                    GÖNDER
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-2 sm:px-4 lg:px-6 py-1 sm:py-2 mt-0">
          {/* Mobile: no volume changer per request */}

          {/* Description Section - Responsive */}
          <div className="mt-0 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-[19px] font-semibold text-[#333333]">
                BÖLÜM {bolum} - DİNLEME METNİ
              </h3>
              <button
                type="button"
                onClick={() => setShowDescription((v) => !v)}
                className="text-[16px] font-semibold text-gray-700 border border-gray-200 rounded-md px-2 py-1 bg-white"
              >
                {showDescription ? "Anlatımı Gizle" : "Anlatımı Göster"}
              </button>
            </div>
            {showDescription && (
              <>
                {bolum === 2 ? (
                  <div className="space-y-1.5 text-xs sm:text-sm lg:text-base text-[#333333] leading-relaxed">
                    <p>
                      Sorular 9-14. Dinlediğiniz metne göre aşağıdaki cümleler için DOĞRU ya da YANLIŞ seçeneklerinden
                      birini işaretleyiniz.
                    </p>
                    <p>DOĞRU: cümle, dinleme metnindeki bilgilerle uyumlu ve/veya tutarlıysa</p>
                    <p>YANLIŞ: cümle, dinleme metnindeki bilgilerle tutarsız ve/veya çelişkiliyse</p>
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm lg:text-base text-[#333333] leading-relaxed">
                    {getStaticHeader(bolum)}
                  </p>
                )}
              </>
            )}
          </div>
          {showReviewNotice && (
            <div className="mt-2 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs sm:text-sm text-amber-800">
              Sesli metin tamamlandı. Cevapları gözden geçirmeniz için 10 dakikanız var. Süre bittiğinde cevaplarınız
              otomatik olarak gönderilecektir.
            </div>
          )}
        </div>
        
        {/* Internal scroll to keep content accessible while exam-mode locks body scroll */}
         <div ref={contentScrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 pt-1 sm:pt-2 pb-20 sm:pb-36 scrollbar-thin scrollbar-thumb-gray-300/60 scrollbar-track-transparent scroll-smooth listening-test-container">
          <div
            className={`transition-all duration-200 ease-out ${isPartSwitchAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
          >
            {renderPart(bolum)}
          </div>
        </div>
      
      {/* Bottom Tabs - desktop only */}
      <div className="hidden lg:block">{renderTabs()}</div>

      {/* Mobile: compact prev/next with center progress */}
      <div className="lg:hidden fixed bottom-2 right-2 left-2 grid grid-cols-[auto_1fr_auto] items-center gap-2 px-2 py-2 bg-white/98 rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="justify-self-start">
          <Button
                  onClick={goToPrevBolum}
                  disabled={currentPartNumber <= 1}
                  className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-bold px-2.5 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
        </div>
        <div className="min-w-0 px-1">
          <div className="text-center text-[11px] font-semibold text-gray-800">
            BÖLÜM {currentPartNumber}/6
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#438553] transition-all duration-200 ease-out"
              style={{ width: `${(currentPartNumber / 6) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-center text-[10px] text-gray-600">
            {getAnsweredCountForPart(currentPartNumber)}/{getQuestionsForPartNumber(currentPartNumber).length} cevap
          </div>
        </div>
        <div className="justify-self-end">
          <Button
                  onClick={goToNextBolum}
                  disabled={currentPartNumber >= 6}
                  className="bg-[#438553] hover:bg-[#356A44] active:bg-[#2d5a3a] text-white font-bold px-2.5 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[36px] touch-manipulation"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
        </div>
      </div>

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










