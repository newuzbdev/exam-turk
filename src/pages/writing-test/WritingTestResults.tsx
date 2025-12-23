import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import writingSubmissionService from "@/services/writingSubmission.service";
import { overallTestService, overallTestFlowStore } from "@/services/overallTest.service";

// interface TestResult {
//   id: string;
//   score?: number;
//   aiFeedback?: {
//     taskAchievement: string;
//     coherenceAndCohesion: string;
//     lexicalResource: string;
//     grammaticalRangeAndAccuracy: string;
//   };
//   submittedAt?: string;
//   createdAt?: string;
//   updatedAt?: string;
//   userId: string;
//   writingTestId: string;
// }

export default function WritingTestResults() {
  console.log("WritingTestResults component loaded with NEW UI");
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState("task2");
  const [activeTask1Part, setActiveTask1Part] = useState("part1");
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    // Try to get overall test result ID from session storage, otherwise use individual result ID
    const overallId = overallTestFlowStore.getOverallId() || resultId;
    if (!overallId) return;
    
    setDownloadingPDF(true);
    try {
      await overallTestService.downloadPDF(overallId, `writing-certificate-${overallId}.pdf`);
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

    const loadResult = async () => {
      try {
        const data = await writingSubmissionService.getById(resultId);
        setResult(data);
      } catch (error) {
        console.error("Error loading result:", error);
        navigate("/test");
      } finally {
        setLoading(false);
      }
    };

    loadResult();
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
  const writingData = result.writing || result;
  
  // Extract scores from AI feedback or use defaults
  const extractScoreFromFeedback = (feedbackText: string) => {
    // Try to extract numeric score from feedback text
    const match = feedbackText?.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };

  // Helper to remove bullet characters when rendering (•, , etc.)
  const removeBullets = (text: string | undefined | null) => {
    if (!text) return text || "";
    // Split by lines and remove bullets from each line
    return text
      .split('\n')
      .map(line => {
        // Remove any bullet-like character at the start of the line (including the specific  character)
        return line
          .replace(/^[\s\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F\uFE00-\uFE0F\uFE30-\uFE4F\uFE50-\uFE6F\uFF00-\uFFEF\uF000-\uF8FF•●■▪□▢\u2022\u25CF\u25E6\u25A0\u25A1\u25A2\u25AA\u25AB\u2610\uF0B7\u2023\u25CB\u25CC\u25CD\u25CE\u25CF\u25D0\u25D1\u25D2\u25D3\u25D4\u25D5\u25D6\u25D7\u25D8\u25D9\u25DA\u25DB\u25DC\u25DD\u25DE\u25DF\u25E6\u25E7\u25E8\u25E9\u25EA\u25EB\u25EC\u25ED\u25EE\u25EF]+/g, "") // Remove any bullet/box/special chars at start
          .trim();
      })
      .filter(line => line.length > 0) // Remove empty lines
      .join('\n')
      .replace(/\s+/g, " ") // Normalize multiple spaces to single space
      .trim();
  };

  // Parse AI feedback string to extract sections
  const parseAIFeedback = () => {
    const feedback = writingData?.aiFeedback;
    if (!feedback) return null;

    // If feedback is an object, return it as is
    if (typeof feedback === 'object' && feedback !== null) {
      return feedback;
    }

    // If feedback is a string, parse it
    if (typeof feedback === 'string') {
      const parsed: any = {};

      // Extract GÖREV 1.1 section
      const task1_1Match = feedback.match(/\[GÖREV 1\.1 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[GÖREV 1\.2|\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i);
      if (task1_1Match) {
        parsed.part1_1 = removeBullets(task1_1Match[1].trim());
      }

      // Extract GÖREV 1.2 section
      const task1_2Match = feedback.match(/\[GÖREV 1\.2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i);
      if (task1_2Match) {
        parsed.part1_2 = removeBullets(task1_2Match[1].trim());
      }

      // Extract BÖLÜM 2 section
      const part2Match = feedback.match(/\[BÖLÜM 2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|$)/i);
      if (part2Match) {
        parsed.part2 = removeBullets(part2Match[1].trim());
      }

      // Extract AI GERİ BİLDİRİMİ (EĞİTMEN NOTU) section
      const generalMatch = feedback.match(/AI GERİ BİLDİRİMİ \(EĞİTMEN NOTU\):([\s\S]*?)(?=$)/i);
      if (generalMatch) {
        parsed.general = removeBullets(generalMatch[1].trim());
      }

      // Extract individual criteria from each section
      const extractCriteria = (text: string) => {
        const criteria: any = {};
        
        // Extract Tutarlılık
        const coherenceMatch = text.match(/Tutarlılık[:\s]*([^\n•]*)/i);
        if (coherenceMatch) {
          criteria.coherenceAndCohesion = coherenceMatch[1].trim();
        }
        
        // Extract Dil Bilgisi
        const grammarMatch = text.match(/Dil Bilgisi[:\s]*([^\n•]*)/i);
        if (grammarMatch) {
          criteria.grammaticalRangeAndAccuracy = grammarMatch[1].trim();
        }
        
        // Extract Kelime Kaynağı
        const lexicalMatch = text.match(/Kelime Kaynağı[:\s]*([^\n•]*)/i);
        if (lexicalMatch) {
          criteria.lexicalResource = lexicalMatch[1].trim();
        }
        
        // Extract Görev Başarısı
        const taskMatch = text.match(/Görev Başarısı[:\s]*([^\n•]*)/i);
        if (taskMatch) {
          criteria.taskAchievement = taskMatch[1].trim();
        }
        
        return criteria;
      };

      // Extract criteria from the full feedback text
      const allCriteria = extractCriteria(feedback);
      Object.assign(parsed, allCriteria);

      return parsed;
    }

    return null;
  };

  const parsedFeedback = parseAIFeedback();

  const scores = {
    overall: writingData?.score || 0,
    part1: 0, // We'll calculate this from individual answers
    part2: 0, // We'll calculate this from individual answers
    coherence: extractScoreFromFeedback(parsedFeedback?.coherenceAndCohesion || writingData?.aiFeedback?.coherenceAndCohesion) || 0,
    grammar: extractScoreFromFeedback(parsedFeedback?.grammaticalRangeAndAccuracy || writingData?.aiFeedback?.grammaticalRangeAndAccuracy) || 0,
    lexical: extractScoreFromFeedback(parsedFeedback?.lexicalResource || writingData?.aiFeedback?.lexicalResource) || 0,
    achievement: extractScoreFromFeedback(parsedFeedback?.taskAchievement || writingData?.aiFeedback?.taskAchievement) || 0,
  };

  // Extract answers array (supports both legacy answers[] and new sections/subParts structure)
  const extractWritingAnswers = () => {
    // 1) If top-level answers array exists and has at least one non-empty answer, use it
    if (Array.isArray(writingData?.answers)) {
      const hasNonEmpty = writingData.answers.some(
        (a: any) => a && typeof a.userAnswer === "string" && a.userAnswer.trim() !== ""
      );
      if (hasNonEmpty) {
        return writingData.answers;
      }
    }

    // 2) Otherwise, build answers from sections/subParts structure
    const extracted: any[] = [];
    const sections = Array.isArray(writingData?.sections) ? writingData.sections : [];

    sections.forEach((section: any, sectionIndex: number) => {
      // First push subPart answers (so Task 1.1 and 1.2 come first)
      if (Array.isArray(section.subParts)) {
        section.subParts.forEach((subPart: any, subPartIndex: number) => {
          const subPartAnswers = Array.isArray(subPart.answers) ? subPart.answers : [];
          subPartAnswers.forEach((ans: any) => {
            extracted.push({
              ...ans,
              // Provide a reasonable questionText for UI
              questionText:
                ans.questionText ||
                ans.question ||
                subPart.description ||
                section.description ||
                `Görev 1.${subPartIndex + 1}`,
            });
          });
        });
      }

      // Then push section-level answers (e.g. Task 2 main essay)
      if (Array.isArray(section.answers)) {
        section.answers.forEach((ans: any, answerIndex: number) => {
          extracted.push({
            ...ans,
            questionText:
              ans.questionText ||
              ans.question ||
              section.description ||
              `Görev ${sectionIndex + 1} ${answerIndex + 1}`,
          });
        });
      }
    });

    return extracted;
  };

  const answers = extractWritingAnswers();
  
  console.log("Writing results - All answers:", answers);
  console.log("Writing results - Writing data:", writingData);
  
  // Separate Task 1 and Task 2 answers
  // Task 1 typically has 2 subparts (1.1 and 1.2), Task 2 has 1 answer
  const task1Answers = answers.filter((_: any, index: number) => index < 2); // First 2 answers are Task 1
  const task2Answers = answers.filter((_: any, index: number) => index >= 2); // Remaining answers are Task 2

  console.log("Task 1 answers:", task1Answers);
  console.log("Task 2 answers:", task2Answers);

  // Get current question and answer based on active task
  const getCurrentQuestionAndAnswer = () => {
    if (activeTask === "task1") {
      // For Task 1, show the answer based on active part
      const answerIndex = activeTask1Part === "part1" ? 0 : 1;
      const currentAnswer = task1Answers[answerIndex];
      console.log("Task 1 current answer:", currentAnswer, "index:", answerIndex);
      const userAnswer = currentAnswer?.userAnswer;
      
      // Get feedback for the specific part
      const feedbackKey = activeTask1Part === "part1" ? "part1_1" : "part1_2";
      const feedback = parsedFeedback?.[feedbackKey] || 
                      writingData?.aiFeedback?.[feedbackKey] || 
                      writingData?.aiFeedback?.taskAchievement || 
                      `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1" : "Bölüm 2"} geri bildirimi burada gösterilecek`;
      
      return {
        question: currentAnswer?.questionText || `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1" : "Bölüm 2"} Sorusu`,
        answer: userAnswer && userAnswer.trim() ? userAnswer : "Cevap verilmedi",
        comment: removeBullets(feedback)
      };
    } else {
      // For Task 2, find the answer that has a non-empty userAnswer
      const task2AnswerWithContent = task2Answers.find((ans: any) => 
        ans?.userAnswer && typeof ans.userAnswer === 'string' && ans.userAnswer.trim() !== ""
      ) || task2Answers[0]; // Fallback to first if none found
      
      console.log("Task 2 answers:", task2Answers);
      console.log("Task 2 current answer with content:", task2AnswerWithContent);
      const userAnswer = task2AnswerWithContent?.userAnswer;
      
      // Get feedback for Task 2
      const feedback = parsedFeedback?.part2 || 
                      writingData?.aiFeedback?.part2 || 
                      writingData?.aiFeedback?.taskAchievement || 
                      "Görev 2 geri bildirimi burada gösterilecek";
      
      return {
        question: task2AnswerWithContent?.questionText || "Görev 2 Sorusu",
        answer: userAnswer && userAnswer.trim() ? userAnswer : "Cevap verilmedi",
        comment: removeBullets(feedback)
      };
    }
  };

  const currentData = getCurrentQuestionAndAnswer();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
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
              <h1 className="text-3xl font-bold text-gray-900">Yazma Testi Sonuçları</h1>
              <p className="text-gray-600 mt-1">Performansınızı ve geri bildirimi inceleyin</p>
            </div>
          </div>

          {/* Overall Score Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Genel Puan</h2>
                <p className="text-gray-600">Yazma testi performansınız</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-red-600">{scores.overall}</div>
                <div className="text-sm text-gray-500">75 üzerinden</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Feedback Grid - Similar to Speaking Test */}
        {parsedFeedback && (() => {
          const feedback = parsedFeedback;
          const hasPartFeedback = feedback.part1_1 || feedback.part1_2 || feedback.part2;
          const hasIELTSFeedback = feedback.coherenceAndCohesion || feedback.grammaticalRangeAndAccuracy || 
                                   feedback.lexicalResource || feedback.taskAchievement;
          
          // Eğer sadece genel eğitmen notu varsa, üst grid'i göstermeyelim;
          // bu not zaten aşağıda "Eğitmen Notu" kartında gösterilecek.
          if (!hasPartFeedback && !hasIELTSFeedback) {
            return null;
          }
          
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {feedback.part1_1 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Görev 1.1</h3>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {removeBullets(feedback.part1_1)}
                  </p>
                </div>
              )}
              {feedback.part1_2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Görev 1.2</h3>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {removeBullets(feedback.part1_2)}
                  </p>
                </div>
              )}
              {feedback.part2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Bölüm 2</h3>
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {removeBullets(feedback.part2)}
                  </p>
                </div>
              )}
              {/* Fallback to IELTS-style feedback if part feedback not available */}
              {!hasPartFeedback && hasIELTSFeedback && (
                <>
                  {feedback.coherenceAndCohesion && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Tutarlılık ve Bağlılık</h3>
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {removeBullets(feedback.coherenceAndCohesion)}
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
                        {removeBullets(feedback.grammaticalRangeAndAccuracy)}
                      </p>
                    </div>
                  )}
                  {feedback.lexicalResource && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Kelime Kaynağı</h3>
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {removeBullets(feedback.lexicalResource)}
                      </p>
                    </div>
                  )}
                  {feedback.taskAchievement && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900">Görev Başarısı</h3>
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {removeBullets(feedback.taskAchievement)}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Task Navigation - Redesigned */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Yazma Görevleri</h3>
          
          {/* All Tasks in One Row - Wider */}
          <div className="grid grid-cols-3 gap-4">
            {/* Task 1.1 */}
            <Button
              onClick={() => {
                setActiveTask("task1");
                setActiveTask1Part("part1");
              }}
              variant="outline"
              className={`h-16 rounded-lg font-medium transition-all ${
                activeTask === "task1" && activeTask1Part === "part1"
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-md border-red-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Görev 1.1</div>
                <div className="text-xs opacity-75">Bölüm 1</div>
              </div>
            </Button>

            {/* Task 1.2 */}
            <Button
              onClick={() => {
                setActiveTask("task1");
                setActiveTask1Part("part2");
              }}
              variant="outline"
              className={`h-16 rounded-lg font-medium transition-all ${
                activeTask === "task1" && activeTask1Part === "part2"
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-md border-red-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Görev 1.2</div>
                <div className="text-xs opacity-75">Bölüm 2</div>
              </div>
            </Button>

            {/* Task 2 */}
            <Button
              onClick={() => setActiveTask("task2")}
              variant="outline"
              className={`h-16 rounded-lg font-medium transition-all ${
                activeTask === "task2"
                  ? "bg-red-600 text-white hover:bg-red-700 shadow-md border-red-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Görev 2</div>
                <div className="text-xs opacity-75">Makale</div>
              </div>
            </Button>
          </div>
        </div>

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
                <h2 className="text-lg font-semibold text-gray-900">Cevabınız</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.answer}</p>
            </div>
          </div>

          {/* Comment Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">💬</span>
              </div>
                <h2 className="text-lg font-semibold text-gray-900">Eğitmen Notu</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {removeBullets(currentData.comment)}
              </p>
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
            {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
          </Button>
          <Button
            onClick={() => navigate("/test")}
            variant="outline"
            className="px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Başka Test Al
          </Button>
        </div>
      </div>
    </div>
  );
}
