import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import speakingSubmissionService from "@/services/speakingSubmission.service";
import axiosPrivate from "@/config/api";
import { overallTestService, overallTestFlowStore } from "@/services/overallTest.service";

interface SpeakingAIFeedback {
  taskAchievement?: string;
  coherenceAndCohesion?: string;
  lexicalResource?: string;
  grammaticalRangeAndAccuracy?: string;
  part1?: string;
  part2?: string;
  part3?: string;
  part4?: string;
}

interface SpeakingAnswer {
  questionId: string;
  questionText: string;
  userAnswer: string | null;
  questionOrder?: number;
}

interface SpeakingResult {
  id: string;
  userId: string;
  speakingTestId: string;
  score?: number;
  aiFeedback?: SpeakingAIFeedback;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  speaking?: any;
  parts?: any[];
  answers?: SpeakingAnswer[];
  test?: {
    id: string;
    title: string;
  };
}

interface OverallTestResult {
  id: string;
  speaking?: SpeakingResult;
  [key: string]: any;
}

export default function SpeakingTestResults() {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePart, setActivePart] = useState(0);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    // Try to get overall test result ID from session storage, otherwise use individual result ID
    const overallId = overallTestFlowStore.getOverallId() || resultId;
    if (!overallId) return;
    
    setDownloadingPDF(true);
    try {
      await overallTestService.downloadPDF(overallId, `speaking-certificate-${overallId}.pdf`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    if (!resultId) {
      navigate("/test");
      return;
    }

    (async () => {
      try {
        // Try to fetch as overall test result first
        try {
          const overallRes = await axiosPrivate.get(`/api/overal-test-result/${resultId}/results`);
          const overallData = (overallRes?.data?.data || overallRes?.data) as OverallTestResult;
          
          if (overallData?.speaking) {
            // Extract speaking data from overall result
            setResult(overallData.speaking);
            return;
          }
        } catch (e) {
          // If it fails, try as direct speaking submission
          console.log("Not an overall test result, trying direct submission...");
        }

        // Try direct speaking submission
        const data = await speakingSubmissionService.getById(resultId);
        setResult(data);
      } catch (e) {
        console.error("Error loading speaking result:", e);
        navigate("/test");
      } finally {
        setLoading(false);
      }
    })();
  }, [resultId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Sonuç bulunamadı</p>
          <Button onClick={() => navigate("/test")} className="mt-4">
            Testlere Dön
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from the result structure
  const speakingData = result.speaking || result;
  
  // Extract scores from AI feedback or use defaults
  const extractScoreFromFeedback = (feedbackText: string) => {
    // Try to extract numeric score from feedback text
    const match = feedbackText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  const scores = {
    overall: speakingData?.score || 0,
    coherence: extractScoreFromFeedback(speakingData?.aiFeedback?.coherenceAndCohesion) || 0,
    grammar: extractScoreFromFeedback(speakingData?.aiFeedback?.grammaticalRangeAndAccuracy) || 0,
    lexical: extractScoreFromFeedback(speakingData?.aiFeedback?.lexicalResource) || 0,
    achievement: extractScoreFromFeedback(speakingData?.aiFeedback?.taskAchievement) || 0,
  };

  // Get answers array
  const answers = speakingData?.answers || result.answers || [];
  
  // Organize answers by parts (typically 3 parts for speaking tests)
  // Part 1: Usually first 6-8 questions
  // Part 2: Middle questions
  // Part 3: Last questions
  const organizeAnswersByParts = () => {
    if (answers.length === 0) return [[], [], []];
    
    const totalQuestions = answers.length;
    const part1Count = Math.ceil(totalQuestions * 0.4); // ~40% for Part 1
    const part2Count = Math.ceil(totalQuestions * 0.3); // ~30% for Part 2
    // Rest goes to Part 3
    
    const part1 = answers.slice(0, part1Count);
    const part2 = answers.slice(part1Count, part1Count + part2Count);
    const part3 = answers.slice(part1Count + part2Count);
    
    return [part1, part2, part3].filter(part => part.length > 0);
  };

  const parts = organizeAnswersByParts();
  
  // Get current question and answer based on active part
  const getCurrentQuestionAndAnswer = () => {
    if (parts.length > 0 && parts[activePart] && parts[activePart].length > 0) {
      const partQuestions = parts[activePart];
      const currentQuestionIndex = Math.min(activeQuestion, partQuestions.length - 1);
      const currentAnswer = partQuestions[currentQuestionIndex];
      
      // Map part index to feedback key
      // Code organizes into 3 parts: part1 (index 0), part2 (index 1), part3 (index 2)
      // User feedback has: part1, part2, part3, part4
      // Map: part1 -> part1, part2 -> part2, part3 -> part3
      const feedbackKey = `part${activePart + 1}`;
      const partFeedback = (speakingData?.aiFeedback as any)?.[feedbackKey] || 
                           speakingData?.aiFeedback?.taskAchievement || 
                           `Bölüm ${activePart + 1} geri bildirimi burada gösterilecek`;
      
      return {
        question: currentAnswer?.questionText || `Bölüm ${activePart + 1} Sorusu ${currentQuestionIndex + 1}`,
        answer: (currentAnswer?.userAnswer && typeof currentAnswer.userAnswer === 'string' && currentAnswer.userAnswer.trim() !== "") 
          ? currentAnswer.userAnswer 
          : "Cevap verilmedi",
        comment: partFeedback
      };
    }
    
    return {
      question: "Soru metni burada gösterilecek",
      answer: "Cevap verilmedi",
      comment: speakingData?.aiFeedback?.part1 || speakingData?.aiFeedback?.taskAchievement || "Geri bildirim mevcut değil"
    };
  };

  const currentData = getCurrentQuestionAndAnswer();
  
  // Reset active question when part changes
  useEffect(() => {
    setActiveQuestion(0);
  }, [activePart]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/test")}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Konuşma Testi Sonuçları</h1>
              <p className="text-gray-600 mt-1 text-sm">Performansınızı ve geri bildirimi inceleyin</p>
            </div>
          </div>

          {/* Overall Score Card */}
          <div className="border border-gray-300 rounded-lg px-4 py-3 mt-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-800">Genel Puan</div>
                <div className="text-xs text-gray-500">Konuşma testi performansınız</div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600">{scores.overall}</div>
                <div className="text-xs text-gray-500">Bant Puanı</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Categories Grid - Simplified Design */}
        {speakingData?.aiFeedback && (() => {
          const feedback = speakingData.aiFeedback as any;
          const hasPartFeedback = feedback.part1 || feedback.part2 || feedback.part3 || feedback.part4;
          const hasIELTSFeedback = feedback.coherenceAndCohesion || feedback.grammaticalRangeAndAccuracy ||
                                   feedback.lexicalResource || feedback.taskAchievement;

          if (!hasPartFeedback && !hasIELTSFeedback) {
            return null;
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {feedback.part1 && (
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3">Bölüm 1</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feedback.part1}
                  </p>
                </div>
              )}
              {feedback.part2 && (
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3">Bölüm 2</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feedback.part2}
                  </p>
                </div>
              )}
              {feedback.part3 && (
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3">Bölüm 3</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feedback.part3}
                  </p>
                </div>
              )}
              {feedback.part4 && (
                <div className="border border-gray-300 rounded-lg p-4 bg-white">
                  <h3 className="font-semibold text-gray-900 mb-3">Bölüm 4</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feedback.part4}
                  </p>
                </div>
              )}
              {/* Fallback to IELTS-style feedback if part1-4 not available */}
              {!hasPartFeedback && hasIELTSFeedback && (
                <>
                  {feedback.coherenceAndCohesion && (
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                      <h3 className="font-semibold text-gray-900 mb-3">Tutarlılık ve Bağlılık</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feedback.coherenceAndCohesion}
                      </p>
                    </div>
                  )}
                  {feedback.grammaticalRangeAndAccuracy && (
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                      <h3 className="font-semibold text-gray-900 mb-3">Dil Bilgisi</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feedback.grammaticalRangeAndAccuracy}
                      </p>
                    </div>
                  )}
                  {feedback.lexicalResource && (
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                      <h3 className="font-semibold text-gray-900 mb-3">Kelime Kaynağı</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feedback.lexicalResource}
                      </p>
                    </div>
                  )}
                  {feedback.taskAchievement && (
                    <div className="border border-gray-300 rounded-lg p-4 bg-white">
                      <h3 className="font-semibold text-gray-900 mb-3">Görev Başarısı</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {feedback.taskAchievement}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Part Navigation - Redesigned */}
        {parts.length > 0 && (
          <div className="mb-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">Konuşma Bölümleri</div>
            <div className="flex flex-wrap gap-2 mb-3">
              {parts.map((_part, index: number) => (
                <Button
                  key={index}
                  onClick={() => setActivePart(index)}
                  variant="outline"
                  className={`h-9 px-4 text-sm font-medium transition-colors ${
                    activePart === index
                      ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                      : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
                  }`}
                >
                  Bölüm {index + 1}
                </Button>
              ))}
            </div>

            {/* Question Navigation within Part */}
            {parts[activePart] && parts[activePart].length > 1 && (
              <div className="flex flex-wrap gap-2">
                {parts[activePart].map((_question: any, index: number) => (
                  <Button
                    key={index}
                    onClick={() => setActiveQuestion(index)}
                    variant="outline"
                    size="sm"
                    className={`transition-colors ${
                      activeQuestion === index
                        ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                        : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
                    }`}
                  >
                    Soru {index + 1}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Sections */}
        <div className="space-y-4">
          {/* Question Section */}
          <div className="border border-gray-300 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Soru</div>
            <div className="text-gray-800">{currentData.question}</div>
          </div>

          {/* Answer Section */}
          <div className="border border-gray-300 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Cevabınız</div>
            <div className="text-gray-800 whitespace-pre-wrap">{currentData.answer}</div>
          </div>

          {/* Comment Section */}
          <div className="border border-gray-300 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Eğitmen Notu</div>
            <div className="text-gray-800 whitespace-pre-wrap">{currentData.comment}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 text-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
          </Button>
          <Button
            onClick={() => navigate("/test")}
            variant="outline"
            className="h-9 px-4 text-sm"
          >
            Başka Test Al
          </Button>
        </div>
      </div>
    </div>
  );
}
