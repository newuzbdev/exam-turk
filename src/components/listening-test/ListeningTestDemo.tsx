import { useEffect, useState } from "react";
import { listeningTestService } from "@/services/listeningTest.service";
import type { ListeningTestItem } from "@/services/listeningTest.service";
import { Button } from "../ui/button";
import { listeningSubmissionService } from "@/services/listeningTest.service";
import { useNavigate } from "react-router-dom";
import { AudioPlayer } from "@/pages/listening-test/components/AudioPlayer";
import { toast } from "sonner";

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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        const data = await listeningTestService.getTestWithFullData(testId);
        setTestData(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching test data:", error);
        setLoading(false);
      }
    };

    if (testId) {
      fetchTestData();
    }
  }, [testId]);

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
      for (const s of (p.sections || [])) {
        sections.push(s);
      }
    }
    return sections;
  };

  const detectBolumForQuestion = (question: any): number => {
    // Extract question number from question.text or question.content
    const text = `${question?.text || ''} ${question?.content || ''}`;
    const match = text.match(/S(\d+)/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 8) return 1;
      if (num >= 9 && num <= 14) return 2;
      if (num >= 15 && num <= 18) return 3;
      if (num >= 19 && num <= 23) return 4;
      if (num >= 24 && num <= 29) return 5;
      if (num >= 30 && num <= 35) return 6;
    }
    
    // Fallback: check question type
    if (question.type === "TRUE_FALSE") return 2; // Most TRUE_FALSE are in bölüm 2
    return 1; // Default fallback
  };

  const getQuestionsForPartNumber = (partNumber: number) => {
    const questions: any[] = [];
    const sections = getAllSections();
    
    sections.forEach((section: any, sectionIndex: number) => {
      (section.questions || []).forEach((question: any) => {
        const questionBolum = detectBolumForQuestion(question);
        if (questionBolum === partNumber) {
          questions.push({
            ...question,
            sectionTitle: section.title,
            sectionContent: section.content,
            imageUrl: section.imageUrl,
            partNumber,
            sectionIndex
          });
        }
      });
    });
    
    return questions;
  };

  const renderQuestion = (question: any, questionNumber: number) => {
    const selectedAnswer = userAnswers[question.id];

    if (question.type === "TRUE_FALSE") {
      return (
        <div key={question.id} className="space-y-3">
          <div className="font-bold text-lg">S{questionNumber}.</div>
          <div className="space-y-2">
            <p className="text-lg text-gray-700 leading-relaxed">{question.text}</p>
            
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
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
                />
                <span className="text-lg text-gray-700 ml-1">Doğru</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
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
                />
                <span className="text-lg text-gray-700 ml-1">Yanlış</span>
              </label>
            </div>
          </div>
        </div>
      );
    }

    // MULTIPLE_CHOICE
    return (
      <div key={question.id} className="space-y-3">
        <div className="font-bold text-lg">S{questionNumber}.</div>
        <div className="space-y-2">
          <p className="text-lg text-gray-700 leading-relaxed">{question.text}</p>
          
          {question.answers?.map((answer: any) => (
            <label
              key={answer.id}
              className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
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
                <span className="text-lg text-gray-700 ml-1">{answer.answer}</span>
              </div>
              <input
                type="radio"
                name={`question-${question.id}`}
                value={answer.variantText}
                checked={selectedAnswer === answer.variantText}
                onChange={() => handleAnswerSelect(question.id, answer.variantText)}
                className="sr-only"
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

    const staticHeader = getStaticHeader(bolum);

    // Special layout for Part 3 (questions on left, answer options on right)
    if (bolum === 3) {
      const answerOptions = [
        { letter: "A", text: "Terapi merkezinin tanıtım reklamı verilmiştir" },
        { letter: "B", text: "Manav ürünlerinin fiyatlarında indirim fırsatı" },
        { letter: "C", text: "Kara yolu seferleri düzenlendiğine dair bilgiler var" },
        { letter: "D", text: "İvedilik söz konusudur." },
        { letter: "E", text: "Kara yolu ulaşım aracıyla ilgili uyarı niteliğindedir" },
        { letter: "F", text: "Mesai zamanı belirtilmiştir." }
      ];

      return (
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border-gray-800 rounded-lg overflow-hidden">
          {/* Part 3 Layout: Questions on left, Answer options on right */}
          <div className="flex min-h-[400px]">
            {/* Left side - Questions */}
            <div className="w-1/2 p-3 border-r border-gray-300">
              <div className="space-y-2">
                {questions.map((question, index) => {
                  const currentQuestionNumber = questionNumber + index;
                  return (
                    <div key={question.id} className="flex items-center gap-2 py-1">
                      <span className="font-bold text-lg">S{currentQuestionNumber}.</span>
                      <span className="text-lg">1. konuşmacı ...</span>
                      <select
                        value={userAnswers[question.id] || ""}
                        onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                        className="border border-gray-400 rounded px-2 py-1 text-base"
                      >
                        <option value="">Seç</option>
                        {answerOptions.map((option) => (
                          <option key={option.letter} value={option.letter}>
                            {option.letter}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side - Answer options */}
            <div className="w-1/2 p-3">
              <div className="space-y-2">
                {answerOptions.map((option) => (
                  <div key={option.letter} className="flex items-start gap-2 py-1">
                    <div className="text-lg flex items-center justify-center font-bold bg-white">
                      {option.letter})
                    </div>
                    <p className="text-lg text-gray-700 leading-relaxed flex-1">
                      {option.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Special layout for Part 4 (image matching questions)
    if (bolum === 4) {
      const imageUrl = questions.find(q => q.imageUrl)?.imageUrl;
      
      return (
        <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border-gray-800 rounded-lg overflow-hidden">
          {/* Part 4 Layout: Image on left, Questions on right */}
          <div className="flex">
            {/* Left side - Image */}
            <div className="w-1/2 border-r border-gray-300 p-4">
              {imageUrl ? (
                <img 
                  src={`https://api.turkcetest.uz/${imageUrl}`} 
                  alt="Map for questions 19-23" 
                  className="w-full max-w-[500px] mx-auto"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.src = "https://placehold.co/800x600?text=Görsel+Yüklenemedi";
                  }}
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 flex items-center justify-center text-gray-500">
                  Görsel bulunamadı
                </div>
              )}
            </div>

            {/* Right side - Questions */}
            <div className="w-1/2 p-4">
              <div className="flex flex-col justify-center items-start space-y-3">
                {questions.length === 0 && (
                  <div className="text-center text-gray-600 py-6">Bu bölüm için soru bulunamadı.</div>
                )}
                {questions.map((question, index) => {
                  const currentQuestionNumber = questionNumber + index;
                  return (
                    <div key={question.id} className="flex items-center gap-3 w-full">
                      <span className="font-bold text-lg">S{currentQuestionNumber}.</span>
                      <span className="text-lg flex-1">{question.text}</span>
                      <select
                        className="border border-gray-400 rounded px-2 py-1 text-sm min-w-[60px]"
                        value={userAnswers[question.id] || ""}
                        onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                      >
                        <option value="">Seç</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                        <option value="F">F</option>
                        <option value="G">G</option>
                        <option value="H">H</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
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
                    {renderQuestion(question, currentQuestionNumber)}
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
                            src={`https://api.turkcetest.uz/${question.imageUrl}`}
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
                    {renderQuestion(question, currentQuestionNumber)}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-800 p-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center gap-2 flex-nowrap overflow-x-auto">
            {sections.map((section) => {
              const isActive = currentPartNumber === section.number;
              
              return (
                <div 
                  key={section.number} 
                  className={`text-center border-2 rounded-lg p-2 min-w-fit cursor-pointer transition-colors ${
                    isActive 
                      ? "border-blue-500 bg-blue-50" 
                      : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                  }`}
                  onClick={() => setCurrentPartNumber(section.number)}
                >
                  <div className="flex gap-1 mb-1 justify-center">
                    {section.questions.map((q) => {
                      const questionId = section.partQuestions[q - section.questions[0]]?.id;
                      const isAnswered = questionId && userAnswers[questionId];
                      const isFirstQuestion = q === section.questions[0];
                      
                      return (
                        <div
                          key={q}
                          className={`w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-bold ${
                            isFirstQuestion 
                              ? "bg-green-400" 
                              : isAnswered 
                              ? "bg-green-300" 
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
          
          <div className="text-center text-sm text-gray-600 mt-2">
            Toplam {Object.keys(userAnswers).length} / {getTotalQuestions()} soru cevaplandı
          </div>
        </div>
      </div>
    );
  };

  const handleSubmit = async () => {
    try {
      if (!testData?.id) {
        console.error("No testId found for submission");
        return;
      }
      const answers = Object.entries(userAnswers).map(([questionId, userAnswer]) => ({ questionId, userAnswer }));
      if (answers.length === 0) {
        // Require at least one answer to submit
        return;
      }
      const res: any = await listeningSubmissionService.submitAnswers(testData.id, answers);
      console.log("Submission response:", res); // Debug log
      
      const resultId = res?.testResultId || res?.id || res?.resultId || res?.data?.id || res?.data?.resultId;
      console.log("Extracted resultId:", resultId); // Debug log
      
      const summary = {
        score: res?.score ?? res?.data?.score,
        correctCount: res?.correctCount ?? res?.data?.correctCount,
        totalQuestions: res?.totalQuestions ?? res?.data?.totalQuestions,
        message: res?.message ?? res?.data?.message,
        testResultId: resultId,
      };
      
      if (resultId) {
        console.log("Navigating to results with ID:", resultId); // Debug log
        // Ensure results are fetched immediately after submission
        try {
          await listeningSubmissionService.getExamResults(resultId);
        } catch (error) {
          console.error("Error fetching results immediately:", error);
        }
        navigate(`/listening-test/results/${resultId}` , { state: { summary } });
        return;
      } else {
        console.error("No resultId found in submission response:", res);
        toast.error("Test natijalari olinmadi. Qaytadan urinib ko'ring.");
      }
    } catch (err) {
      console.error("Listening submit error", err);
    }
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
    <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-white px-6 py-3 border-2 border-gray-300 rounded-lg mx-4 mt-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-lg">
              TURKISHMOCK
            </div>
            <div className="font-bold text-2xl">Listening</div>
            <div className="flex items-center gap-4">
              <div className={`font-bold text-lg ${timerActive ? 'text-red-600' : 'text-gray-600'}`}>
                {timerActive ? formatTime(timeLeft) : '10:00'}
              </div>
              
              {/* Volume Control inline with timer */}
              {testData?.audioUrl && (
                <AudioPlayer 
                  src={`https://api.turkcetest.uz${testData.audioUrl}`} 
                  onAudioEnded={handleAudioEnded}
                />
              )}
              
              <Button onClick={handleSubmit} className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">
                GÖNDER
              </Button>
            </div>
          </div>
          
          {/* Description Section - Close to header */}
          <div className="mt-2 p-5 bg-yellow-50 rounded-lg border border-yellow-300">
            <h3 className="text-2xl font-bold text-gray-800 mb-3">
              BÖLÜM {bolum} - DİNLEME METNİ
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              {getStaticHeader(bolum)}
            </p>
          </div>
        </div>
        
        <div className="mx-auto p-6">
          {/* Current Part */}
          {renderPart(bolum)}
        </div>
      
      {/* Bottom Tabs */}
      {renderTabs()}
    </div>
  );
}