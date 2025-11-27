import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosPrivate from "@/config/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { overallTestService } from "@/services/overallTest.service";

interface Question {
  questionId: string;
  questionNumber: number;
  questionText: string;
  questionContent: string;
  questionType: string;
  userAnswer: string;
  correctAnswers: Array<{
    id: string;
    text: string;
  }>;
}

interface TestSonuç {
  aiFeedback?: any;
  test: {
    id: string;
    title: string;
    type: string;
  };
  score: number;
  completedAt?: string;
  questions?: Question[];
  overallScore?: number;
  answers?: Array<{
    questionText: string;
    questionId: string;
    userAnswer: string;
  }>;
  submittedAt?: string;
}

interface OverallResponse {
  id: string;
  status: string;
  isCompleted: boolean;
  completedAt?: string;
  startedAt: string;
  totalCoinSpent: number;
  user: {
    id: string;
    name: string;
  };
  listening?: TestSonuç;
  reading?: TestSonuç;
  writing?: TestSonuç;
  speaking?: TestSonuç;
}

export default function OverallResults() {
  const params = useParams<{ overallId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OverallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("listening");
  const [activeTask, setActiveTask] = useState("task2");
  const [activeTask1Part, setActiveTask1Part] = useState("part1");
  const [activeSpeakingPart, setActiveSpeakingPart] = useState(0);
  const [activeSpeakingQuestion, setActiveSpeakingQuestion] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const id = params.overallId;
    if (!id) return;
    
    setDownloadingPDF(true);
    try {
      await overallTestService.downloadPDF(id, `certificate-${id}.pdf`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    const id = params.overallId;
    if (!id) { navigate("/test"); return; }

    const fetchOverallResults = async () => {
      setLoading(true);
      try {
        console.log("Fetching overall results for ID:", id);
        const res = await axiosPrivate.get(`/api/overal-test-result/${id}/results`);
        console.log("Overall results response:", res.data);
        const payload = (res?.data?.data || res?.data || null) as OverallResponse | null;
        setData(payload);
      } catch (e) {
        console.error("Error fetching overall results:", e);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    // exit exam mode on entering overall results
    try { document?.body?.classList?.remove("exam-mode"); } catch {}
    fetchOverallResults();
  }, [params.overallId, navigate]);


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

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Genel sonuçlar bulunamadı</p>
          <Button onClick={() => navigate("/test")} className="mt-4">Testlere Dön</Button>
        </div>
      </div>
    );
  }

  // Render functions using the original UI but with new data structure
  const renderListeningResults = () => {
    if (!data?.listening || !data.listening.questions) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Dinleme testi sonuçları mevcut değil</p>
        </div>
      );
    }

    const examData = data.listening.questions.map((q, index: number) => {
      const correctTexts = (q.correctAnswers || []).map(a => a.text).filter(Boolean);
      const correctAnswer = correctTexts.join(" / ");
      const isCorrect = correctTexts.length > 0
        ? correctTexts.includes(q.userAnswer)
        : false;
      return {
        no: q.questionNumber || index + 1,
        userAnswer: q.userAnswer || "Seçilmedi",
        correctAnswer,
        result: isCorrect ? "Doğru" : "Yanlış"
      };
    });

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mx-4 gap-3">
          {/* <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sınav Sonuçları</h1> */}
        </div>
        
        <div className="mx-4 space-y-6">

          {/* Report Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <span className="break-all">Report ID: {data.id}</span>
              <span>İsim: {data.user.name}</span>
            </div>
            <span className="text-xs sm:text-sm">Tarih: {new Date(data.listening.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " "}</span>
          </div>

          {/* Listening Score */}
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              Dinleme Puanı: {data.listening.score}
              <span className="ml-2 sm:ml-3 text-sm sm:text-base text-muted-foreground">
                ({examData.filter(r => r.result === "Doğru").length} / {examData.length} doğru)
              </span>
            </h2>
          </div>

          {/* Sonuçs Table */}
          <Card className="overflow-hidden rounded-lg border border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="bg-green-600 text-white">
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium rounded-tl-lg text-xs sm:text-base">No.</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-xs sm:text-base">Kullanıcı Cevabı</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-xs sm:text-base">Doğru Cevap</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium rounded-tr-lg text-xs sm:text-base">Sonuç</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examData.map((item, index: number) => (
                      <tr
                        key={item.no}
                        className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-700 font-medium text-xs sm:text-sm">{item.no}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-600 text-xs sm:text-sm break-words">{item.userAnswer}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-gray-800 font-medium text-xs sm:text-sm break-words">{item.correctAnswer}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                            item.result === "Doğru" 
                              ? "bg-green-100 text-green-800" 
                              : item.result === "Yanlış" 
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-700"
                          }`}>
                            {item.result}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderReadingResults = () => {
    if (!data?.reading || !data.reading.questions) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Okuma testi sonuçları mevcut değil</p>
        </div>
      );
    }

    const examData = data.reading.questions.map((q, index: number) => {
      const correctTexts = (q.correctAnswers || []).map(a => a.text).filter(Boolean);
      const correctAnswer = correctTexts.join(" / ");
      const isCorrect = correctTexts.length > 0
        ? correctTexts.includes(q.userAnswer)
        : false;
      return {
        no: q.questionNumber || index + 1,
        userAnswer: q.userAnswer || "Seçilmedi",
        correctAnswer,
        result: isCorrect ? "Doğru" : "Yanlış"
      };
    });

    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Sınav Sonuçları</h1>
        </div>

        {/* Report Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            <span>Report ID: {data.id}</span>
            <span>İsim: {data.user.name}</span>
          </div>
          <span>Tarih: {new Date(data.reading.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " GMT+5"}</span>
        </div>

        {/* Reading Score */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Okuma Puanı: {data.reading.score}
            <span className="ml-3 text-base text-muted-foreground">
              ({examData.filter(r => r.result === "Doğru").length} / {examData.length} doğru)
            </span>
          </h2>
        </div>

        {/* Sonuçs Table */}
        <Card className="overflow-hidden rounded-lg border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-600 text-white">
                    <th className="px-4 py-3 text-left font-medium rounded-tl-lg">No.</th>
                    <th className="px-4 py-3 text-left font-medium">Kullanıcı Cevabı</th>
                    <th className="px-4 py-3 text-left font-medium">Doğru Cevap</th>
                    <th className="px-4 py-3 text-left font-medium rounded-tr-lg">Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {examData.map((item, index: number) => (
                    <tr
                      key={item.no}
                      className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.no}</td>
                      <td className="px-4 py-3 text-gray-600">{item.userAnswer}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.correctAnswer}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.result === "Doğru" 
                            ? "bg-green-100 text-green-800" 
                            : item.result === "Yanlış" 
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-700"
                        }`}>
                          {item.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderWritingResults = () => {
    if (!data?.writing) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Yazma testi sonuçları mevcut değil</p>
        </div>
      );
    }

    const { writing } = data;
    const aiFeedback = writing.aiFeedback;

    // Extract scores from AI feedback or use defaults
    const extractScoreFromFeedback = (feedbackText: string) => {
      const match = feedbackText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const scores = {
      overall: writing?.score || 0,
      part1: 0,
      part2: 0,
      coherence: extractScoreFromFeedback(aiFeedback?.coherenceAndCohesion) || 0,
      grammar: extractScoreFromFeedback(aiFeedback?.grammaticalRangeAndAccuracy) || 0,
      lexical: extractScoreFromFeedback(aiFeedback?.lexicalResource) || 0,
      achievement: extractScoreFromFeedback(aiFeedback?.taskAchievement) || 0,
    };

    // Get answers array
    const answers = writing?.answers || [];
    
    // Separate Task 1 and Task 2 answers
    const task1Answers = answers.filter((_: any, index: number) => index < 2);
    const task2Answers = answers.filter((_: any, index: number) => index >= 2);

    // Get current question and answer based on active task
    const getCurrentQuestionAndAnswer = () => {
      if (activeTask === "task1") {
        const answerIndex = activeTask1Part === "part1" ? 0 : 1;
        const currentAnswer = task1Answers[answerIndex];
        return {
          question: (currentAnswer as any)?.questionText || `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1" : "Bölüm 2"} Sorusu`,
          answer: currentAnswer?.userAnswer || "Cevap verilmedi",
          comment: aiFeedback?.taskAchievement || `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1" : "Bölüm 2"} geri bildirimi burada gösterilecek`
        };
      } else {
        const firstTask2Answer = task2Answers[0];
        return {
          question: (firstTask2Answer as any)?.questionText || "Görev 2 Sorusu",
          answer: firstTask2Answer?.userAnswer || "Cevap verilmedi",
          comment: aiFeedback?.taskAchievement || "Görev 2 geri bildirimi burada gösterilecek"
        };
      }
    };

    const currentData = getCurrentQuestionAndAnswer();

    return (
      <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header Section */}
          <div className="mb-8">
            {/* <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Writing Test Sonuçs</h1>
              <p className="text-gray-600 mt-1">Review your performance and feedback</p>
            </div> */}

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

          {/* Scoring Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Coherence & Cohesion</h3>
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiFeedback?.coherenceAndCohesion || "No feedback available"}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Grammar</h3>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiFeedback?.grammaticalRangeAndAccuracy || "No feedback available"}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Lexical Resource</h3>
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiFeedback?.lexicalResource || "No feedback available"}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Task Achievement</h3>
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiFeedback?.taskAchievement || "No feedback available"}
              </p>
            </div>
          </div>

          {/* Task Navigation - Redesigned */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Writing Tasks</h3>
            
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
                <div className="font-semibold">Task 1.1</div>
                <div className="text-xs opacity-75">Part 1</div>
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
                <div className="font-semibold">Task 1.2</div>
                <div className="text-xs opacity-75">Part 2</div>
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
                <div className="font-semibold">Task 2</div>
                <div className="text-xs opacity-75">Essay</div>
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
                <h2 className="text-lg font-semibold text-gray-900">AI Geri Bildirimi</h2>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.comment}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSpeakingResults = () => {
    if (!data?.speaking) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Konuşma testi sonuçları mevcut değil</p>
        </div>
      );
    }

    const { speaking } = data;
    const aiFeedback = speaking.aiFeedback;

    // Extract scores from AI feedback or use defaults
    const extractScoreFromFeedback = (feedbackText: string) => {
      const match = feedbackText?.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    };

    const scores = {
      overall: speaking?.score || 0,
      coherence: extractScoreFromFeedback(aiFeedback?.coherenceAndCohesion) || 0,
      grammar: extractScoreFromFeedback(aiFeedback?.grammaticalRangeAndAccuracy) || 0,
      lexical: extractScoreFromFeedback(aiFeedback?.lexicalResource) || 0,
      achievement: extractScoreFromFeedback(aiFeedback?.taskAchievement) || 0,
    };

    // Get answers array
    const answers = speaking?.answers || [];
    
    // Organize answers by parts: Part 1.1, Part 1.2, Part 2, Part 3
    const organizeAnswersByParts = () => {
      if (answers.length === 0) return [[], [], [], []];
      
      const totalQuestions = answers.length;
      const part1TotalCount = Math.ceil(totalQuestions * 0.4); // ~40% for Part 1 total
      const part1_1Count = Math.ceil(part1TotalCount / 2); // Split Part 1 into 1.1 and 1.2
      const part2Count = Math.ceil(totalQuestions * 0.3); // ~30% for Part 2
      // Rest goes to Part 3
      
      const part1_1 = answers.slice(0, part1_1Count);
      const part1_2 = answers.slice(part1_1Count, part1TotalCount);
      const part2 = answers.slice(part1TotalCount, part1TotalCount + part2Count);
      const part3 = answers.slice(part1TotalCount + part2Count);
      
      return [part1_1, part1_2, part2, part3].filter(part => part.length > 0);
    };

    const parts = organizeAnswersByParts();
    
    // Get part label based on index
    const getPartLabel = (index: number) => {
      if (index === 0) return { main: "Bölüm 1.1", sub: "Part 1.1" };
      if (index === 1) return { main: "Bölüm 1.2", sub: "Part 1.2" };
      if (index === 2) return { main: "Bölüm 2", sub: "Part 2" };
      if (index === 3) return { main: "Bölüm 3", sub: "Part 3" };
      return { main: `Bölüm ${index + 1}`, sub: `Part ${index + 1}` };
    };
    
    // Get current question and answer based on active part
    const getCurrentQuestionAndAnswer = () => {
      if (parts.length > 0 && parts[activeSpeakingPart] && parts[activeSpeakingPart].length > 0) {
        const partQuestions = parts[activeSpeakingPart];
        const currentQuestionIndex = Math.min(activeSpeakingQuestion, partQuestions.length - 1);
        const currentAnswer = partQuestions[currentQuestionIndex];
        const partLabel = getPartLabel(activeSpeakingPart);
        
        return {
          question: currentAnswer?.questionText || `${partLabel.main} Sorusu ${currentQuestionIndex + 1}`,
          answer: (currentAnswer?.userAnswer && typeof currentAnswer.userAnswer === 'string' && currentAnswer.userAnswer.trim() !== "") 
            ? currentAnswer.userAnswer 
            : "Cevap verilmedi",
          comment: aiFeedback?.taskAchievement || `${partLabel.main} geri bildirimi burada gösterilecek`
        };
      }
      
      return {
        question: "Soru metni burada gösterilecek",
        answer: "Cevap verilmedi",
        comment: aiFeedback?.taskAchievement || "Geri bildirim mevcut değil"
      };
    };

    const currentData = getCurrentQuestionAndAnswer();

    return (
      <div className="w-full bg-gradient-to-br from-gray-50 to-gray-100 p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header Section */}
          <div className="mb-8">
            {/* Overall Score Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Genel Puan</h2>
                  <p className="text-gray-600">Konuşma testi performansınız</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-red-600">{scores.overall}</div>
                  <div className="text-sm text-gray-500">Bant Puanı</div>
                </div>
              </div>
            </div>
          </div>

          {/* Scoring Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Tutarlılık ve Bağlılık</h3>
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiFeedback?.coherenceAndCohesion || "Geri bildirim mevcut değil"}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Dil Bilgisi</h3>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiFeedback?.grammaticalRangeAndAccuracy || "Geri bildirim mevcut değil"}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Kelime Kaynağı</h3>
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiFeedback?.lexicalResource || "Geri bildirim mevcut değil"}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Görev Başarısı</h3>
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiFeedback?.taskAchievement || "Geri bildirim mevcut değil"}
              </p>
            </div>
          </div>

          {/* Part Navigation - Redesigned */}
          {parts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Konuşma Bölümleri</h3>
              
              {/* All Parts in One Row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {parts.map((_part, index: number) => {
                  const partLabel = getPartLabel(index);
                  return (
                    <Button
                      key={index}
                      onClick={() => {
                        setActiveSpeakingPart(index);
                        setActiveSpeakingQuestion(0);
                      }}
                      variant="outline"
                      className={`h-16 rounded-lg font-medium transition-all ${
                        activeSpeakingPart === index
                          ? "bg-red-600 text-white hover:bg-red-700 shadow-md border-red-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{partLabel.main}</div>
                        <div className="text-xs opacity-75">{partLabel.sub}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Question Navigation within Part - Only for Part 1.1 and Part 1.2 */}
              {parts[activeSpeakingPart] && 
               parts[activeSpeakingPart].length > 1 && 
               (activeSpeakingPart === 0 || activeSpeakingPart === 1) && (
                <div className="flex flex-wrap gap-2">
                  {parts[activeSpeakingPart].map((_, index: number) => (
                    <Button
                      key={index}
                      onClick={() => setActiveSpeakingQuestion(index)}
                      variant="outline"
                      size="sm"
                      className={`transition-all ${
                        activeSpeakingQuestion === index
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
                <h2 className="text-lg font-semibold text-gray-900">AI Geri Bildirimi</h2>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.comment}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Check which test types are available
  const availableTests = [];
  if (data?.listening) availableTests.push('listening');
  if (data?.reading) availableTests.push('reading');
  if (data?.writing) availableTests.push('writing');
  if (data?.speaking) availableTests.push('speaking');

  // If only one test type is available, show it directly without tabs
  if (availableTests.length === 1) {
    const testType = availableTests[0];
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8 mx-4">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {testType === 'listening' && 'Dinleme Testi Sonuçları'}
              {testType === 'reading' && 'Okuma Testi Sonuçları'}
              {testType === 'writing' && 'Yazma Testi Sonuçları'}
              {testType === 'speaking' && 'Konuşma Testi Sonuçları'}
            </h1>
            <p className="text-muted-foreground">
              {testType === 'listening' && 'Dinleme testi performansınızı inceleyin'}
              {testType === 'reading' && 'Okuma testi performansınızı inceleyin'}
              {testType === 'writing' && 'Yazma testi performansınızı inceleyin'}
              {testType === 'speaking' && 'Konuşma testi performansınızı inceleyin'}
            </p>
          </div>
          
          {testType === 'listening' && renderListeningResults()}
          {testType === 'reading' && renderReadingResults()}
          {testType === 'writing' && renderWritingResults()}
          {testType === 'speaking' && renderSpeakingResults()}

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-4 justify-center mx-4">
            <Button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/test")} className="w-full sm:w-auto">
              Testlere Dön
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If multiple test types are available, show tabs
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div></div>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="listening" className="flex items-center gap-2">
              <span className="hidden sm:inline">Dinleme</span>
              <span className="sm:hidden">D</span>
              {data?.listening && (
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  {data.listening.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex items-center gap-2">
              <span className="hidden sm:inline">Okuma</span>
              <span className="sm:hidden">O</span>
              {data?.reading && (
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  {data.reading.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="writing" className="flex items-center gap-2">
              <span className="hidden sm:inline">Yazma</span>
              <span className="sm:hidden">Y</span>
              {data?.writing && (
                <span className="ml-1 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                  {data.writing.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="speaking" className="flex items-center gap-2">
              <span className="hidden sm:inline">Konuşma</span>
              <span className="sm:hidden">K</span>
              {data?.speaking && (
                <span className="ml-1 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                  {data.speaking.score || 0}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listening" className="mt-6">
            {renderListeningResults()}
          </TabsContent>

          <TabsContent value="reading" className="mt-6">
            {renderReadingResults()}
          </TabsContent>

          <TabsContent value="writing" className="mt-6">
            {renderWritingResults()}
          </TabsContent>

          <TabsContent value="speaking" className="mt-6">
            {renderSpeakingResults()}
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/test")}>
            Testlere Dön
          </Button>
        </div>
      </div>
    </div>
  );
}


