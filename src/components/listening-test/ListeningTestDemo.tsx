import { useEffect, useState } from "react";
import { listeningTestService } from "@/services/listeningTest.service";
import type { ListeningTestItem } from "@/services/listeningTest.service";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";
import { overallTestFlowStore } from "@/services/overallTest.service";
import { AudioPlayer } from "@/pages/listening-test/components/AudioPlayer";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ConfirmationModal } from "../ui/confirmation-modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLg, setIsLg] = useState<boolean>(false);
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

  const renderQuestion = (question: any, questionNumber: number, partNumber?: number) => {
    const selectedAnswer = userAnswers[question.id];

    if (question.type === "TRUE_FALSE") {
      return (
        <div key={question.id} className="space-y-3">
          <div className="space-y-2">
            <p className="text-lg text-black leading-relaxed font-bold">
              {partNumber === 1 ? `${question.text}.` : `S${questionNumber}. ${question.text}`}
            </p>
            
            <div className="flex gap-6">
              <label 
                className="flex items-center gap-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnswerSelect(question.id, "A");
                }}
              >
                <span className="font-bold text-lg">A)</span>
                <div className="relative">
                  <div className="w-5 h-5 mt-1 border-2 border-gray-400 rounded-full bg-white"></div>
                  {selectedAnswer === "A" && (
                    <div className="absolute mt-1 inset-0 w-5 h-5 bg-green-500 rounded-full border-2 border-green-600"></div>
                  )}
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
                <span className="text-lg text-black ml-1">Doğru</span>
              </label>

              <label 
                className="flex items-center gap-2 cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  handleAnswerSelect(question.id, "B");
                }}
              >
                <span className="font-bold text-lg">B)</span>
                <div className="relative">
                  <div className="w-5 h-5 mt-1 border-2 border-gray-400 rounded-full bg-white"></div>
                  {selectedAnswer === "B" && (
                    <div className="absolute mt-1 inset-0 w-5 h-5 bg-green-500 rounded-full border-2 border-green-600"></div>
                  )}
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
                <span className="text-lg text-black ml-1">Yanlış</span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    // MULTIPLE_CHOICE
    return (
      <div key={question.id} className="space-y-3">
        <div className="space-y-2">
          <p className="text-lg text-black leading-relaxed font-bold">
            {partNumber === 1 ? `${question.text}.` : `S${questionNumber}. ${question.text}`}
          </p>
          
          {question.answers?.map((answer: any) => (
            <label
              key={answer.id}
              className="flex items-start gap-3 p-2 rounded cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                handleAnswerSelect(question.id, answer.variantText);
              }}
            >
              <div className="flex items-center justify-center w-5 h-5 mt-0.5">
                <span className="font-bold mr-2">{answer.variantText})</span>
                <div className="relative">
                  <div className="w-5 h-5 mt-1 border-2 border-gray-400 rounded-full bg-white"></div>
                  {selectedAnswer === answer.variantText && (
                    <div className="absolute mt-1 inset-0 w-5 h-5 bg-green-500 rounded-full border-2 border-green-600"></div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <span className="text-lg text-black ml-1">{answer.answer}</span>
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
      1: "Sorular 1-8. Dinlediğiniz cümleleri tamamlayınız. Cümleleri iki defa dinleyeceksiniz. Her cümleye cevap olabilecek en doğru seçeneği (A, B veya C)  işaretleyiniz.",
      2: "Sorular 9-14. Dinlediğiniz metne göre aşağıdaki cümleler için  DOĞRU ya da YANLIŞ seçeneklerinden birini işaretleyiniz.\nDOĞRU – cümle, dinleme metnindeki bilgilerle uyumlu ve/veya tutarlıysa \nYANLIŞ – cümle, dinleme metnindeki bilgilerle  tutarsız  ve/veya çelişkiliyse",
      3: "Sorular 15-18. Şimdi insanların farklı durumlardaki konuşmalarını dinleyeceksiniz. Her konuşmacının (15-18) konuşmalarını ait olduğu seçenekleri (A-F) işaretleyiniz. Seçmemeniz gereken İKİ seçenek bulunmaktadır.",
      4: "4. DİNLEME METNİ\nDinleme metnine göre haritadaki yerleri (A-H) işaretleyiniz (19-23).\nSeçilmemesi gereken ÜÇ seçenek bulunmaktadır.",
      5: "5. DİNLEME METNİ  \nSorular 24-29. Aşağıdaki soruları okuyunuz ve dinleme metinlerine göre doğru seçeneği (A, B ya da C) işaretleyiniz.",
      6: "6. DİNLEME METNİ\nSorular 30-35. Dinleme metnine göre doğru seçeneği (A, B ya da C) işaretleyiniz.   "
    };
    return headers[partNumber as keyof typeof headers] || `Dinleme metni ${partNumber}`;
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
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border-gray-800 rounded-lg overflow-hidden pb-28 md:pb-36 lg:pb-40">
          {/* Mobile Layout - Stacked */}
          <div className="block lg:hidden">
            {/* Questions Section */}
            <div className="p-3 border-b border-gray-300">
              <h4 className="text-base font-bold text-gray-800 mb-3">Sorular</h4>
              <div className="space-y-2">
                {questions.map((question, index) => {
                  const currentQuestionNumber = questionNumber + index;
                  return (
                    <div key={question.id} className="flex items-center gap-2 py-1">
                      <span className="font-bold text-sm">S{currentQuestionNumber}.</span>
                      <span className="text-sm flex-1">{question.text || question.content}</span>
                      <Select
                        value={userAnswers[question.id] || ""}
                        onValueChange={(value) => handleAnswerSelect(question.id, value)}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs bg-white border-gray-400 cursor-pointer">
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

            {/* Answer Options Section */}
            <div className="p-3">
              <h4 className="text-base font-bold text-gray-800 mb-3">Seçenekler</h4>
              <div className="space-y-2">
                {answerOptions.map((option: any) => (
                  <div key={option.id || option.variantText} className="flex items-start gap-2 py-1">
                    <div className="text-sm flex items-center justify-center font-bold bg-gray-100 rounded-full w-6 h-6 flex-shrink-0">
                      {option.variantText}
                    </div>
                    <p className="text-sm text-black leading-relaxed flex-1">
                      {option.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Layout - Resizable */}
          <div className="hidden lg:block">
            <ResizablePanelGroup direction="horizontal" className="w-full min-h-[400px]">
              <ResizablePanel defaultSize={50} minSize={5} maxSize={95}>
                <div className="p-4 border-r border-gray-300 h-full overflow-y-auto">
                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-gray-800 mb-3">Sorular</h4>
                    {questions.map((question, index) => {
                      const currentQuestionNumber = questionNumber + index;
                      return (
                        <div key={question.id} className="flex items-center gap-3 py-2">
                          <span className="font-bold text-lg">S{currentQuestionNumber}.</span>
                          <span className="text-lg">{question.text || question.content}</span>
                          <Select
                            value={userAnswers[question.id] || ""}
                            onValueChange={(value) => handleAnswerSelect(question.id, value)}
                          >
                            <SelectTrigger className="w-20 h-10 text-base ml-auto bg-white border-gray-400 cursor-pointer">
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
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50} minSize={5}>
                <div className="p-4 h-full overflow-y-auto">
                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-gray-800 mb-3">Seçenekler</h4>
                    {answerOptions.map((option: any) => (
                      <div key={option.id || option.variantText} className="flex items-start gap-3 py-2">
                        <div className="text-lg flex items-center justify-center font-bold bg-gray-100 rounded-full w-8 h-8 flex-shrink-0">
                          {option.variantText}
                        </div>
                        <p className="text-lg text-black leading-relaxed flex-1">
                          {option.answer}
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
      const imageUrl = questions.find(q => q.imageUrl)?.imageUrl;
      
      return (
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border-gray-800 rounded-lg overflow-hidden pb-28 md:pb-36 lg:pb-40">
          {/* Mobile Layout - Stacked */}
          <div className="block lg:hidden">
            {/* Image Section */}
            <div className="p-3 border-b border-gray-300">
              <h4 className="text-base font-bold text-gray-800 mb-3">Harita</h4>
              <div className="flex justify-center">
              {imageUrl ? (
                <img 
                  src={`https://api.turkishmock.uz/${imageUrl}`} 
                  alt="Map for questions 19-23" 
                    className="w-full max-w-[400px] h-auto"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                      el.src = "https://placehold.co/400x300?text=Görsel+Yüklenemedi";
                  }}
                />
              ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-500 rounded-lg">
                  Görsel bulunamadı
                </div>
              )}
              </div>
            </div>

            {/* Questions Section */}
            <div className="p-3">
              <h4 className="text-base font-bold text-gray-800 mb-3">Sorular</h4>
                {questions.length === 0 && (
                <div className="text-center text-gray-600 py-4">Bu bölüm için soru bulunamadı.</div>
                )}
              <div className="space-y-2">
                {questions.map((question, index) => {
                  const currentQuestionNumber = questionNumber + index;
                  return (
                    <div key={question.id} className="flex items-center gap-2 w-full py-1">
                      <span className="font-bold text-sm">S{currentQuestionNumber}.</span>
                      <span className="text-sm flex-1">{question.text}</span>
                      <Select
                        value={userAnswers[question.id] || ""}
                        onValueChange={(value) => handleAnswerSelect(question.id, value)}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs bg-white border-gray-400 cursor-pointer">
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
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop Layout - Resizable */}
          <div className="hidden lg:block">
            <ResizablePanelGroup direction="horizontal" className="w-full min-h-[500px]">
              <ResizablePanel defaultSize={60} minSize={5} maxSize={95}>
                <div className="border-r border-gray-300 p-4 h-full flex flex-col">
                  <h4 className="text-lg font-bold text-gray-800 mb-3">Harita</h4>
                  <div className="flex-1 flex items-center justify-center">
                    {imageUrl ? (
                      <img 
                        src={`https://api.turkishmock.uz/${imageUrl}`} 
                        alt="Map for questions 19-23" 
                        className="w-full h-auto max-h-[400px] object-contain"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.src = "https://placehold.co/800x600?text=Görsel+Yüklenemedi";
                        }}
                      />
                    ) : (
                      <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-500 rounded-lg">
                        Görsel bulunamadı
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={40} minSize={5}>
                <div className="p-4 h-full overflow-y-auto">
                  <div className="space-y-4">
                    <h4 className="text-lg font-bold text-gray-800 mb-3">Sorular</h4>
                    {questions.length === 0 && (
                      <div className="text-center text-gray-600 py-6">Bu bölüm için soru bulunamadı.</div>
                    )}
                    {questions.map((question, index) => {
                      const currentQuestionNumber = questionNumber + index;
                      return (
                        <div key={question.id} className="flex items-center gap-3 w-full py-2">
                          <span className="font-bold text-lg">S{currentQuestionNumber}.</span>
                          <span className="text-lg flex-1">{question.text}</span>
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
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border-gray-800 rounded-lg overflow-hidden">
          {/* Questions grouped by dialogs */}
          <div className="p-6">
            {questions.length === 0 && (
              <div className="text-center text-gray-600 py-6">Bu bölüm için soru bulunamadı.</div>
            )}
            {questions.map((question, index) => {
              const currentQuestionNumber = questionNumber + index;
              const dialogNumber = Math.floor(index / 2) + 1;
              const isFirstInDialog = index % 2 === 0;
              const isLastInDialog = index % 2 === 1;
              
              return (
                <div key={question.id}>
                  {/* Dialog Header - show before first question of each dialog */}
                  {isFirstInDialog && (
                    <div className="border-2 border-gray-800 bg-gray-100 px-3 py-1 mb-4 mt-4 first:mt-0 w-[70%]">
                      <h3 className="font-bold text-sm text-left">{dialogNumber}. diyalog</h3>
                    </div>
                  )}
                  
                  {/* Question */}
                  <div className="mb-8">
                    {renderQuestion(question, currentQuestionNumber, bolum)}
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

    // Default layout for other parts
    return (
      <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border-gray-800 rounded-lg overflow-hidden">
        {/* Questions */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {questions.length === 0 && (
              <div className="col-span-2 text-center text-gray-600 py-6">Bu bölüm için soru bulunamadı.</div>
            )}
            {questions.map((question, index) => {
              const currentQuestionNumber = questionNumber + index;
              const isDialogSection = question.sectionTitle?.includes("diyalog") || question.sectionContent?.includes("diyalog");
              
              return (
                <div key={question.id}>
                  {/* Section Header for Dialog */}
                  {isDialogSection && index === 0 && (
                    <div className="border-2 border-gray-800 bg-gray-100 px-4 py-2 mb-6 col-span-2">
                      <h3 className="font-bold text-lg">{question.sectionTitle || `${question.sectionIndex + 1}. diyalog`}</h3>
                    </div>
                  )}
                  
                  {/* Image if available - Fixed image rendering */}
                  {question.imageUrl && (
                    <div className="mb-6 col-span-2 flex justify-center">
                      <div className="w-full max-w-2xl mx-auto">
                        <div className="aspect-[4/3] bg-transparent rounded-2xl overflow-hidden flex items-center justify-center">
                          <img
                            src={`https://api.turkishmock.uz/${question.imageUrl}`}
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
                    {renderQuestion(question, currentQuestionNumber, bolum)}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-800 p-2 sm:p-3 z-50 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Layout - Scrollable */}
          <div className="block lg:hidden">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {sections.map((section) => {
                const isActive = currentPartNumber === section.number;
                
                return (
                  <div 
                    key={section.number} 
                    className={`text-center border-2 rounded-lg p-2 min-w-[80px] flex-shrink-0 cursor-pointer ${
                      isActive 
                        ? "border-blue-500 bg-blue-50" 
                        : "border-gray-300 bg-gray-50 hover:bg-gray-100"
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
                            className={`w-4 h-4 rounded-full border border-gray-800 flex items-center justify-center text-xs font-bold ${
                              isAnswered 
                                ? "bg-green-300" 
                                : "bg-white"
                            }`}
                          >
                            {q}
                          </div>
                        );
                      })}
                      {section.questions.length > 4 && (
                        <div className="w-4 h-4 rounded-full border border-gray-800 flex items-center justify-center text-xs font-bold bg-gray-200">
                          +{section.questions.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-bold">
                      {section.number}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-center text-xs text-gray-600 mt-1">
              {Object.keys(userAnswers).length} / {getTotalQuestions()} soru
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block">
          <div className="flex justify-center gap-2 flex-nowrap overflow-x-auto">
            {sections.map((section) => {
              const isActive = currentPartNumber === section.number;
              
              return (
                <div 
                  key={section.number} 
                  className={`text-center border-2 rounded-lg p-2 min-w-fit cursor-pointer ${
                    isActive 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    setCurrentPartNumber(section.number);
                    // Smooth scroll to top of content
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <div className="flex gap-1 mb-1 justify-center">
                      {section.questions.map((q) => {
                        const questionId = section.partQuestions[q - section.questions[0]]?.id;
                        const isAnswered = questionId && userAnswers[questionId];
                      
                      return (
                        <div
                          key={q}
                            className={`w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-bold ${
                              isAnswered 
                                ? "bg-green-500" 
                                : "bg-white"
                            }`}
                        >
                          {q}
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-xs font-bold">
                    {section.number}. BÖLÜM
                  </div>
                </div>
              );
            })}
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
        const answersData = {
          testId: testData.id,
          answers: Object.entries(userAnswers).map(([questionId, userAnswer]) => ({ questionId, userAnswer })),
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
      const { default: axiosPrivate } = await import("@/config/api");
      
      // Submit reading test - look for reading answers from any test
      const readingAnswersKeys = Object.keys(sessionStorage).filter(key => key.startsWith('reading_answers_'));
      for (const key of readingAnswersKeys) {
        const readingAnswers = sessionStorage.getItem(key);
        if (readingAnswers) {
          const readingData = JSON.parse(readingAnswers);
          console.log("Submitting reading test:", readingData.testId, "with answers:", readingData.answers);
          const payload = Object.entries(readingData.answers).map(([questionId, userAnswer]) => ({ questionId, userAnswer: String(userAnswer) }));
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
        <div className="bg-white px-3 sm:px-6 py-3 border-2 border-gray-300 rounded-lg mt-2 sm:mt-4">
          {/* Mobile Header - Single Line Layout */}
          <div className="block lg:hidden mb-3">
            <div className="flex items-center justify-between">
              <div className="bg-red-600 text-white px-2 py-1 rounded font-bold text-sm">
                TURKISHMOCK
              </div>
              <div className="font-bold text-base">Listening</div>
              <div className={`font-bold text-sm ${timerActive ? 'text-red-600' : 'text-gray-600'}`}>
                {timerActive ? formatTime(timeLeft) : '10:00'}
              </div>
              <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs font-bold">
                GÖNDER
              </Button>
            </div>
            {/* Removed duplicate mobile-only audio player to avoid double playback */}
          </div>

          {/* Desktop Header - Horizontal Layout */}
          <div className="hidden lg:flex items-center justify-between mb-3">
            <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-lg">
              TURKISHMOCK
            </div>
            <div className="font-bold text-2xl">Listening</div>
            <div className="flex items-center gap-4">
              <div className={`font-bold text-lg ${timerActive ? 'text-red-600' : 'text-gray-600'}`}>
                {timerActive ? formatTime(timeLeft) : '10:00'}
              </div>
              {/* Single Audio Player rendered only when isLg is true in this spot */}
              {isLg && testData?.audioUrl && (
                <AudioPlayer
                  src={`https://api.turkishmock.uz/${testData.audioUrl}`}
                  onAudioEnded={handleAudioEnded}
                />
              )}
              
              <Button onClick={handleSubmitClick} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">
                GÖNDER
              </Button>
            </div>
          </div>

          {/* Mobile: no volume changer per request */}
          
          {/* Description Section - Responsive */}
          <div className="mt-2 p-3 sm:p-5 bg-yellow-50 rounded-lg border border-yellow-300">
            <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-800 mb-2 sm:mb-3">
              BÖLÜM {bolum} - DİNLEME METNİ
            </h3>
            <p className="text-xs sm:text-sm lg:text-lg text-black leading-relaxed">
              {getStaticHeader(bolum)}
            </p>
          </div>
        </div>
        
        {/* Internal scroll to keep content accessible while exam-mode locks body scroll */}
        <div className="flex-1 overflow-y-auto p-6 pb-28 scrollbar-thin scroll-smooth listening-test-container">
          {renderPart(bolum)}
        </div>
      
      {/* Bottom Tabs - desktop only */}
      <div className="hidden lg:block">{renderTabs()}</div>

      {/* Mobile: Prev/Next bölüm controls fixed bottom with center indicator */}
      <div className="lg:hidden fixed bottom-2 right-2 left-2 grid grid-cols-3 items-center gap-2 px-2 pointer-events-none">
        <div className="justify-self-start">
          <Button 
            onClick={goToPrevBolum}
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
            onClick={goToNextBolum}
            disabled={currentPartNumber >= 6}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 pointer-events-auto disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            Sonraki
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