import { useEffect, useState } from "react";
import { listeningTestService } from "@/services/listeningTest.service";
import type { ListeningTestItem } from "@/services/listeningTest.service";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { overallTestFlowStore } from "@/services/overallTest.service";
import { AudioPlayer } from "@/pages/listening-test/components/AudioPlayer";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ConfirmationModal } from "../ui/confirmation-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HighlightableTextSimple from "@/components/listening-test/HighlightableTextSimple";
import MapWithDrawing from "@/components/listening-test/MapWithDrawing";

interface UserAnswers {
  [questionId: string]: string;
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
  // Removed exam-mode body lock for listening; keep state local if needed later
  
  const navigate = useNavigate();

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
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        else if (el.msRequestFullscreen) await el.msRequestFullscreen();
      } catch {}
    };

    const cleanupNav = addNavigationLock();
    enterFullscreen();

    return () => {
      // Only exit fullscreen if not in overall test flow
      const hasActiveOverallTest = overallTestFlowStore.hasActive();
      if (!hasActiveOverallTest && document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
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

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const goToNextBolum = () => {
    setCurrentPartNumber((prev) => Math.min(6, prev + 1));
  };
  const goToPrevBolum = () => {
    setCurrentPartNumber((prev) => Math.max(1, prev - 1));
  };

  const getTotalQuestions = () => {
    // Sum across normalized bölüm groups 1..6
    let total = 0;
    for (let i = 1; i <= 6; i++) {
      total += getQuestionsForPartNumber(i).length;
    }
    return total;
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
            sectionTitle: section.title,
            sectionContent: section.content,
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
              <HighlightableTextSimple text={question.text || question.content || ""} />
            </p>
            
            <div className="flex gap-4">
              <label 
                className="flex items-center gap-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnswerSelect(question.id, "A");
                }}
              >
                <span className="font-semibold text-base">A.</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedAnswer === "A" ? "border-[#438553]" : "border-gray-400"
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedAnswer === "A" ? "bg-[#438553]" : "bg-transparent"
                    }`}
                  />
                </div>
              <input
                type="radio"
                name={`question-${question.id}`}
                className="sr-only"
                checked={selectedAnswer === "A"}
                onChange={() => handleAnswerSelect(question.id, "A")}
                onFocus={(e) => e.target.blur()}
                tabIndex={-1}
              />
                <span className="text-base text-[#333333] ml-1">Doğru</span>
              </label>

              <label 
                className="flex items-center gap-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnswerSelect(question.id, "B");
                }}
              >
                <span className="font-semibold text-base">B.</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedAnswer === "B" ? "border-[#438553]" : "border-gray-400"
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedAnswer === "B" ? "bg-[#438553]" : "bg-transparent"
                    }`}
                  />
                </div>
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  className="sr-only"
                  checked={selectedAnswer === "B"}
                  onChange={() => handleAnswerSelect(question.id, "B")}
                  onFocus={(e) => e.target.blur()}
                  tabIndex={-1}
                />
                <span className="text-base text-[#333333] ml-1">Yanlış</span>
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
            <HighlightableTextSimple text={question.text || question.content || ""} />
          </p>
          
          {question.answers?.map((answer: any) => (
            <label
              key={answer.id}
              className="flex items-start gap-3 p-1.5 rounded cursor-pointer hover:bg-gray-50"
              onClick={(e) => {
                e.preventDefault();
                handleAnswerSelect(question.id, answer.variantText);
              }}
            >
              <div className="flex items-center">
                <span className="font-semibold mr-2">{answer.variantText}.</span>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedAnswer === answer.variantText ? "border-[#438553]" : "border-gray-400"
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedAnswer === answer.variantText ? "bg-[#438553]" : "bg-transparent"
                    }`}
                  />
                </div>
              </div>
              <div className="flex-1">
                <span className="text-base text-[#333333] ml-1">
                  <HighlightableTextSimple text={answer.answer.replace(/^[A-Z][.)]\s*/, '')} />
                </span>
              </div>
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
      // Build options dynamically from API answers (union across questions)
      const optionMap = new Map<string, any>();
      questions.forEach((q: any) => {
        (q.answers || []).forEach((a: any) => {
          if (a?.variantText && !optionMap.has(a.variantText)) {
            optionMap.set(a.variantText, a);
          }
        });
      });
      const answerOptions = Array.from(optionMap.values()).sort((a: any, b: any) => String(a.variantText).localeCompare(String(b.variantText)));

      return (
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border border-gray-200 rounded-lg overflow-visible lg:overflow-hidden pb-6 md:pb-10 lg:pb-40">
          {/* Mobile Layout - Stacked */}
          <div className="block lg:hidden">
            {/* Questions Section */}
            <div className="p-3 bg-white">
              <h4 className="text-base font-semibold text-[#333333] mb-2">Sorular</h4>
              <div className="space-y-2">
                {questions.map((question, index) => {
                  const numbered = questionNumber + index;
                  const selected = userAnswers[question.id];
                  const isOpen = mobilePart3OpenId === question.id;
                  return (
                    <div key={question.id} className="rounded-lg border border-gray-200 bg-white">
                      <button
                        type="button"
                        onClick={() => setMobilePart3OpenId(isOpen ? null : question.id)}
                        className="w-full text-left px-3 py-2 flex items-start gap-2"
                      >
                        <span className="font-bold text-sm">S{numbered}.</span>
                        <span className="text-sm text-[#333333] flex-1">
                          <HighlightableTextSimple text={question.text || question.content || ""} />
                        </span>
                        <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 rounded px-2 py-1">
                          {selected || "Seç"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 pt-1 space-y-2">
                          {answerOptions.map((option: any) => {
                            const isSelected = selected === option.variantText;
                            return (
                              <button
                                key={option.id || option.variantText}
                                type="button"
                                onClick={() => {
                                  handleAnswerSelect(question.id, option.variantText);
                                  setMobilePart3OpenId(null);
                                }}
                                className={`w-full flex items-start gap-2 rounded-md border px-2 py-2 text-left transition-colors ${
                                  isSelected
                                    ? "border-[#438553] bg-[#438553]/10"
                                    : "border-gray-200 bg-white hover:bg-gray-50"
                                }`}
                              >
                                <div
                                  className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? "border-[#438553]" : "border-gray-400"
                                  }`}
                                >
                                  <div
                                    className={`h-2 w-2 rounded-full ${
                                      isSelected ? "bg-[#438553]" : "bg-transparent"
                                    }`}
                                  />
                                </div>
                                <div className="text-sm text-[#333333] leading-relaxed">
                                  <span className="font-semibold mr-2">{option.variantText}</span>
                                  <HighlightableTextSimple text={option.answer.replace(/^[A-Z][.)]\s*/, '')} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop Layout - Resizable */}
          <div className="hidden lg:block">
            <ResizablePanelGroup direction="horizontal" className="w-full min-h-[400px]">
              <ResizablePanel defaultSize={50} minSize={5} maxSize={95}>
                <div className="p-4 border-r border-gray-200 h-full overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-gray-300/60 scrollbar-track-transparent">
                  <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-[#333333] mb-2">Sorular</h4>
          {questions.map((question, index) => {
            const numbered = questionNumber + index;
            return (
              <div key={question.id} className="flex items-center gap-3 py-2">
                <span className="text-base">
                  <span className="font-bold">S{numbered}. </span>
                  <HighlightableTextSimple text={question.text || question.content || ""} />
                </span>
                <Select
                  value={userAnswers[question.id] || ""}
                  onValueChange={(value) => handleAnswerSelect(question.id, value)}
                >
                  <SelectTrigger className="w-20 h-10 text-base bg-white border-gray-400 cursor-pointer">
                              <SelectValue placeholder="Seç" />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {answerOptions.map((option: any) => (
                                <SelectItem key={option.id || option.variantText} value={option.variantText}>
                                  {option.variantText}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle className="bg-gray-200 w-px" />
              <ResizablePanel defaultSize={50} minSize={5}>
                <div className="p-4 h-full overflow-y-auto bg-white scrollbar-thin scrollbar-thumb-gray-300/60 scrollbar-track-transparent">
                  <div className="space-y-2">
                    <h4 className="text-base font-semibold text-[#333333] mb-2">Seçenekler</h4>
                    {answerOptions.map((option: any) => (
                      <div key={option.id || option.variantText} className="flex items-start gap-3 py-2">
                        <div className="text-lg flex items-center justify-center font-bold bg-gray-100 rounded-full w-8 h-8 flex-shrink-0">
                          {option.variantText}
                        </div>
                        <p className="text-lg text-[#333333] leading-relaxed flex-1">
                          <HighlightableTextSimple text={option.answer.replace(/^[A-Z][.)]\s*/, '')} />
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
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
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden pb-28 md:pb-36 lg:pb-40">
          {/* Mobile Layout - Stacked */}
          <div className="block lg:hidden">
            {/* Image Section */}
            <div className="p-3 border-b border-gray-200 bg-white">
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
                className={`flex justify-center mt-2 ${mobilePart4MapZoomed ? "max-h-[60vh] overflow-auto rounded-lg border border-gray-200 p-2" : ""}`}
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
            <div className="p-3 pb-52 bg-white max-h-[36vh] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-gray-300/60 scrollbar-track-transparent">
              <h4 className="text-base font-bold text-[#333333] mb-3">Sorular</h4>
                {questions.length === 0 && (
                <div className="text-center text-[#333333] py-4">Bu bölüm için soru bulunamadı.</div>
                )}
              <div className="space-y-2">
                {questions.map((question, index) => {
                  const numbered = questionNumber + index;
                  return (
                    <div key={question.id} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2">
                      <div className="text-sm text-[#333333] leading-relaxed">
                        <span className="font-bold">S{numbered}. </span>
                        <HighlightableTextSimple text={question.text || ""} />
                      </div>
                      <div className="mt-2">
                        <Select
                          value={userAnswers[question.id] || ""}
                          onValueChange={(value) => handleAnswerSelect(question.id, value)}
                        >
                          <SelectTrigger className="w-20 h-10 text-sm bg-white border-gray-400 cursor-pointer">
                            <SelectValue placeholder="Seç" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                            <SelectItem value="F">F</SelectItem>
                            <SelectItem value="G">G</SelectItem>
                            <SelectItem value="H">H</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
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
                            {question.text}
                          </span>
                          <div className="shrink-0">
                            <Select
                              value={userAnswers[question.id] || ""}
                              onValueChange={(value) => handleAnswerSelect(question.id, value)}
                            >
                              <SelectTrigger className="w-20 h-10 text-base bg-white border-gray-400 cursor-pointer">
                                <SelectValue placeholder="Seç" />
                              </SelectTrigger>
                              <SelectContent className="bg-white">
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                                <SelectItem value="C">C</SelectItem>
                                <SelectItem value="D">D</SelectItem>
                                <SelectItem value="E">E</SelectItem>
                                <SelectItem value="F">F</SelectItem>
                                <SelectItem value="G">G</SelectItem>
                                <SelectItem value="H">H</SelectItem>
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
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Questions grouped by dialogs */}
          <div className="p-5">
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
                  <div className="mb-8">
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
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-5">
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
        <div key={`bolum-${bolum}`} className="w-full max-w-7xl bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                      <div key={question.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="text-sm text-[#333333]">
                          <span className="font-semibold">S{numbered}. </span>
                          <HighlightableTextSimple text={question.text || question.content || ""} />
                        </div>
                        <div className="mt-3 flex items-center gap-6">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selected === "A" ? "border-[#438553]" : "border-gray-400"
                              }`}
                            >
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                  selected === "A" ? "bg-[#438553]" : "bg-transparent"
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
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selected === "B" ? "border-[#438553]" : "border-gray-400"
                              }`}
                            >
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                  selected === "B" ? "bg-[#438553]" : "bg-transparent"
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
                <div className="hidden md:block overflow-x-auto max-w-7xl">
                  <table className="w-full max-w-7xl min-w-[640px] table-fixed">
                    <colgroup>
                      <col />
                      <col className="w-16" />
                      <col className="w-16" />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Soru</th>
                        <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Doğru</th>
                        <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Yanlış</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {questions.map((question, index) => {
                        const selected = userAnswers[question.id];
                        const numbered = questionNumber + index;
                        return (
                          <tr
                            key={question.id}
                            className="odd:bg-white even:bg-gray-50/60 hover:bg-gray-100/70 transition-colors"
                          >
                            <td className="px-4 py-4 pr-1 text-base text-[#333333] leading-relaxed align-top">
                              <span className="font-semibold">S{numbered}. </span>
                              <HighlightableTextSimple text={question.text || question.content || ""} />
                            </td>
                            <td className="px-4 py-4 text-center align-top">
                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    selected === "A" ? "border-[#438553]" : "border-gray-400"
                                  }`}
                                >
                                  <div
                                    className={`w-2.5 h-2.5 rounded-full ${
                                      selected === "A" ? "bg-[#438553]" : "bg-transparent"
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
                            <td className="px-4 py-4 text-center align-top">
                              <label className="inline-flex items-center gap-2 cursor-pointer">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    selected === "B" ? "border-[#438553]" : "border-gray-400"
                                  }`}
                                >
                                  <div
                                    className={`w-2.5 h-2.5 rounded-full ${
                                      selected === "B" ? "bg-[#438553]" : "bg-transparent"
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
      <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Questions */}
          <div className="p-5">
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
                      <h3 className="font-semibold text-base">{question.sectionTitle || `${question.sectionIndex + 1}. diyalog`}</h3>
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
                  <div className="mb-8">
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
                      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                                ? "bg-[#438553] border-gray-800"
                                : "bg-white border-gray-800"
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
                    <div className="text-[9px] font-semibold text-gray-700">
                      {section.number}. BÖLÜM
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
                        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                                ? "bg-[#438553] border-gray-800"
                                : "bg-white border-gray-800"
                            }`}
                          >
                            {q}
                          </div>
                        );
                      })}
                    </div>
                      <div className="text-[9px] font-semibold text-gray-700">
                        {section.number}. BÖLÜM
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

  const handleSubmit = async () => {
    try {
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
      navigate(`/listening-test/results/temp`, { state: { summary: { testId: testData?.id } } });
    } catch (error) {
      console.error("Listening navigation error", error);
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
      const { overallTestTokenStore } = await import("@/services/overallTest.service");
      const { default: axiosPrivate } = await import("@/config/api");
      
      // Submit reading test - look for reading answers from any test
      const readingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('reading_answers_'));
      for (const key of readingAnswersKeys) {
        const readingAnswers = sessionStorage.getItem(key);
        if (readingAnswers) {
          const readingData = JSON.parse(readingAnswers);
          console.log("Submitting reading test:", readingData.testId, "with answers:", readingData.answers);
          const payload = Object.entries(readingData.answers).map(([questionId, userAnswer]) => ({ questionId, userAnswer: String(userAnswer) }));
          const overallToken = overallTestTokenStore.getByTestId(readingData.testId);
          if (!overallToken) {
            console.warn("Skipping reading submit-all; overall token not found for testId:", readingData.testId);
            continue;
          }
          await readingSubmissionService.submitAnswers(readingData.testId, payload, overallToken);
        }
      }
      
      // Submit listening test - look for listening answers from any test
      const listeningAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('listening_answers_'));
      for (const key of listeningAnswersKeys) {
        const listeningAnswers = sessionStorage.getItem(key);
        if (listeningAnswers) {
          const listeningData = JSON.parse(listeningAnswers);
          console.log("Submitting listening test:", listeningData.testId, "with answers:", listeningData.answers, "audioUrl:", listeningData.audioUrl, "imageUrls:", listeningData.imageUrls);
          const overallToken = overallTestTokenStore.getByTestId(listeningData.testId);
          if (!overallToken) {
            console.warn("Skipping listening submit-all; overall token not found for testId:", listeningData.testId);
            continue;
          }
          await listeningSubmissionService.submitAnswers(
            listeningData.testId, 
            listeningData.answers,
            overallToken,
            listeningData.audioUrl,
            listeningData.imageUrls
          );
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
    <div className="h-screen bg-white flex flex-col overflow-hidden font-sans text-[#333333] text-sm sm:text-base">
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full">
          {/* Match horizontal padding with description block below */}
          <div className="px-2 sm:px-4">
            <div className="flex justify-between items-center h-20 sm:h-24">
              {/* Mobile Header - Single Line Layout */}
              <div className="block lg:hidden w-full">
                <div className="flex items-center justify-between">
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
                  <div className="font-semibold text-sm sm:text-base">DİNLEME</div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    {!isLg && testData?.audioUrl && (
                      <div className="block">
                        <AudioPlayer
                          src={
                            testData.audioUrl.startsWith('http://') || testData.audioUrl.startsWith('https://')
                              ? testData.audioUrl
                              : `https://api.turkishmock.uz/${testData.audioUrl}`
                          }
                          onAudioEnded={handleAudioEnded}
                        />
                      </div>
                    )}
                    <div
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-bold ${
                        timerActive && timeLeft <= 300
                          ? "bg-red-50 border-red-200 text-red-700"
                          : timerActive && timeLeft <= 600
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-gray-50 border-gray-200 text-slate-700"
                      }`}
                    >
                      <span className="text-[10px]">⏱</span>
                      <span className="tabular-nums">{timerActive ? formatTime(timeLeft) : "10:00"}</span>
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
                <div className="font-semibold text-xl">DİNLEME</div>
                <div className="flex items-center gap-4">
                  {isLg && testData?.audioUrl && (
                    <AudioPlayer
                      src={
                        testData.audioUrl.startsWith('http://') || testData.audioUrl.startsWith('https://')
                          ? testData.audioUrl
                          : `https://api.turkishmock.uz/${testData.audioUrl}`
                      }
                      onAudioEnded={handleAudioEnded}
                    />
                  )}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-bold ${
                      timerActive && timeLeft <= 300
                        ? "bg-red-50 border-red-200 text-red-700"
                        : timerActive && timeLeft <= 600
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-gray-50 border-gray-200 text-slate-700"
                    }`}
                  >
                    <span className="text-sm">⏱</span>
                    <span className="tabular-nums">{timerActive ? formatTime(timeLeft) : "10:00"}</span>
                  </div>
                  <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">
                    GÖNDER
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 mt-2 sm:mt-4">
          {/* Mobile: no volume changer per request */}

          {/* Description Section - Responsive */}
          <div className="mt-2 p-3 sm:p-5 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-[#333333]">
                BÖLÜM {bolum} - DİNLEME METNİ
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
        <div className="flex-1 overflow-y-auto p-6 pb-36 scrollbar-thin scrollbar-thumb-gray-300/60 scrollbar-track-transparent scroll-smooth listening-test-container">
          {renderPart(bolum)}
        </div>
      
      {/* Bottom Tabs - desktop only */}
      <div className="hidden lg:block">{renderTabs()}</div>

      {/* Mobile: Prev/Next bölüm controls fixed bottom with center indicator */}
      <div className="lg:hidden fixed bottom-2 right-2 left-2 grid grid-cols-3 items-center gap-2 px-2 py-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="justify-self-start">
          <Button
                  onClick={goToPrevBolum}
                  disabled={currentPartNumber <= 1}
                  className="bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 font-bold px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
        </div>
        <div className="justify-self-center text-xs sm:text-sm font-semibold">
          {currentPartNumber}. BÖLÜM
        </div>
        <div className="justify-self-end">
          <Button
                  onClick={goToNextBolum}
                  disabled={currentPartNumber >= 6}
                  className="bg-[#438553] hover:bg-[#356A44] active:bg-[#2d5a3a] text-white font-bold px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] touch-manipulation"
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
