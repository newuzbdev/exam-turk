import { useEffect, useState } from "react";
import { listeningTestService } from "@/services/listeningTest.service";
import type { ListeningTestItem } from "@/services/listeningTest.service";

interface UserAnswers {
  [questionId: string]: string;
}

export default function ListeningTestDemo({ testId }: { testId: string }) {
  const [testData, setTestData] = useState<ListeningTestItem | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [currentPartNumber, setCurrentPartNumber] = useState<number>(1);
  const [loading, setLoading] = useState(true);

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

    return (
      <div key={`bolum-${bolum}`} className="w-full mx-auto bg-white border-gray-800 rounded-lg overflow-hidden">
        {/* Static Yellow Header */}
        <div className="bg-yellow-200 border-2 border-yellow-400 px-6 py-4">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            BÖLÜM {bolum} - DİNLEME METNİ
          </h2>
          <p className="text-xl text-gray-700 leading-relaxed whitespace-pre-line">
            {staticHeader || "Header not found"}
          </p>
        </div>

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
    // Always render 6 bölüm tabs, map to existing parts by number
    const partNumbers = [1, 2, 3, 4, 5, 6];
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-center gap-2 flex-wrap">
            {partNumbers.map((num) => {
              const partQuestions = getQuestionsForPartNumber(num);
              const answeredInPart = partQuestions.filter(q => userAnswers[q.id]).length;
              const isActive = currentPartNumber === num;

              return (
                <button
                  key={`bolum-${num}`}
                  onClick={() => setCurrentPartNumber(num)}
                  className={`px-4 py-2 rounded-lg border-2 font-medium transition-colors ${
                    isActive
                      ? "bg-blue-500 text-white border-blue-500"
                      : answeredInPart > 0
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  <div className="text-sm font-bold">Bölüm {num}</div>
                  <div className="text-xs">
                    {answeredInPart}/{partQuestions.length} soru
                  </div>
                </button>
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
      <div className="max-w-6xl mx-auto p-6">
        {/* Test Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{testData.title}</h1>
        </div>

        {/* Current Part */}
        {renderPart(bolum)}
      </div>
      
      {/* Bottom Tabs */}
      {renderTabs()}
    </div>
  );
}