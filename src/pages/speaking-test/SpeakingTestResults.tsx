import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import speakingSubmissionService from "@/services/speakingSubmission.service";
import axiosPrivate from "@/config/api";
import { overallTestService, overallTestFlowStore } from "@/services/overallTest.service";
import { normalizeDisplayText } from "@/utils/text";

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

  // Keep hook order stable across loading/result branches.
  useEffect(() => {
    setActiveQuestion(0);
  }, [activePart]);

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
          <p className="text-gray-600">Sonuç bulunamadý</p>
          <Button onClick={() => navigate("/test")} className="mt-4">
            Testlere Dön
          </Button>
        </div>
      </div>
    );
  }

  // Extract data from the result structure
  const speakingData = result.speaking || result;
  const cleanText = (value: unknown) =>
    normalizeDisplayText(typeof value === "string" ? value : String(value ?? ""));
  
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
      const partFeedbackRaw = (speakingData?.aiFeedback as any)?.[feedbackKey] ||
                           speakingData?.aiFeedback?.taskAchievement ||
                           `Bölüm ${activePart + 1} geri bildirimi burada gösterilecek`;
      const partFeedback = cleanText(partFeedbackRaw);
      
      return {
        question: cleanText(currentAnswer?.questionText || `Bölüm ${activePart + 1} Sorusu ${currentQuestionIndex + 1}`),
        answer: (currentAnswer?.userAnswer && typeof currentAnswer.userAnswer === 'string' && currentAnswer.userAnswer.trim() !== "") 
          ? cleanText(currentAnswer.userAnswer) 
          : "Cevap verilmedi",
        comment: partFeedback
      };
    }
    
    return {
      question: "Soru metni burada gösterilecek",
      answer: "Cevap verilmedi",
      comment: cleanText(speakingData?.aiFeedback?.part1 || speakingData?.aiFeedback?.taskAchievement || "Geri bildirim mevcut deðil")
    };
  };

  const currentData = getCurrentQuestionAndAnswer();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/test")}
              className="p-2 hover:bg-white/80 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Konuþma Testi Sonuçlarý</h1>
              <p className="text-gray-600 mt-1">Performansýnýzý ve geri bildirimi inceleyin</p>
            </div>
          </div>

          {/* Overall Score Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Genel Puan</h2>
                <p className="text-gray-600">Konuþma testi performansýnýz</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-red-600">{scores.overall}</div>
                <div className="text-sm text-gray-500">Bant Puaný</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scoring Categories Grid */}
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
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 1</h3>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cleanText(feedback.part1)}
                  </p>
                </div>
              )}
              {feedback.part2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 2</h3>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cleanText(feedback.part2)}
                  </p>
                </div>
              )}
              {feedback.part3 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 3</h3>
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cleanText(feedback.part3)}
                  </p>
                </div>
              )}
              {feedback.part4 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 4</h3>
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {cleanText(feedback.part4)}
                  </p>
                </div>
              )}
              {/* Fallback to IELTS-style feedback if part1-4 not available */}
              {!hasPartFeedback && hasIELTSFeedback && (
                <>
                  {feedback.coherenceAndCohesion && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Tutarlýlýk ve Baðlýlýk</h3>
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {cleanText(feedback.coherenceAndCohesion)}
                      </p>
                    </div>
                  )}
                  {feedback.grammaticalRangeAndAccuracy && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Dil Bilgisi</h3>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {cleanText(feedback.grammaticalRangeAndAccuracy)}
                      </p>
                    </div>
                  )}
                  {feedback.lexicalResource && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Kelime Kaynaðý</h3>
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {cleanText(feedback.lexicalResource)}
                      </p>
                    </div>
                  )}
                  {feedback.taskAchievement && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Görev Baþarýsý</h3>
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {cleanText(feedback.taskAchievement)}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">KonuÅŸma Bölümleri</h3>
            
            {/* All Parts in One Row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {parts.map((_part, index: number) => (
                <Button
                  key={index}
                  onClick={() => setActivePart(index)}
                  variant="outline"
                  className={`h-16 rounded-lg font-medium transition-all ${
                    activePart === index
                      ? "bg-red-600 text-white hover:bg-red-700 shadow-md border-red-600"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="text-center">
                    <div className="font-semibold">Bölüm {index + 1}</div>
                    <div className="text-xs opacity-75">Part {index + 1}</div>
                  </div>
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
                    className={`transition-all ${
                      activeQuestion === index
                        ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
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
        <div className="space-y-6">
          {/* Question Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">Q</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Soru</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed">{currentData.question}</p>
            </div>
          </div>

          {/* Answer Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">A</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Cevabýnýz</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.answer}</p>
            </div>
          </div>

          {/* Comment Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">N</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Eðitmen Notu</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.comment}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Download className="w-5 h-5 mr-2" />
            {downloadingPDF ? "Ýndiriliyor..." : "Sertifikayý Ýndir (PDF)"}
          </Button>
          <Button
            onClick={() => navigate("/test")}
            variant="outline"
            className="px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Baþka Test Al
          </Button>
        </div>
      </div>
    </div>
  );
}
