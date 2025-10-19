import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosPrivate from "@/config/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface TestResult {
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
  listening?: TestResult;
  reading?: TestResult;
  writing?: TestResult;
  speaking?: TestResult;
}

export default function OverallResults() {
  const params = useParams<{ overallId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OverallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("listening");

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
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Overall results not found</p>
          <Button onClick={() => navigate("/test")} className="mt-4">Back to Tests</Button>
        </div>
      </div>
    );
  }

  // Render functions using the original UI but with new data structure
  const renderListeningResults = () => {
    if (!data?.listening || !data.listening.questions) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No listening test results available</p>
        </div>
      );
    }

    const examData = data.listening.questions.map((q, index) => {
      const correctAnswer = q.correctAnswers[0]?.text || "";
      return {
        no: q.questionNumber || index + 1,
        userAnswer: q.userAnswer || "Not selected",
        correctAnswer: correctAnswer,
        result: q.correctAnswers.some(ca => ca.text === q.userAnswer) ? "Correct" : "Wrong"
      };
    });

    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Exam results</h1>
        </div>

        {/* Report Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            <span>Report ID: {data.id}</span>
            <span>Name: {data.user.name}</span>
          </div>
          <span>Date: {new Date(data.listening.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " GMT+5"}</span>
        </div>

        {/* Listening Score */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Listening score: {data.listening.score}
            <span className="ml-3 text-base text-muted-foreground">
              ({examData.filter(r => r.result === "Correct").length} / {examData.length} correct)
            </span>
          </h2>
        </div>

        {/* Results Table */}
        <Card className="overflow-hidden rounded-lg border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-600 text-white">
                    <th className="px-4 py-3 text-left font-medium rounded-tl-lg">No.</th>
                    <th className="px-4 py-3 text-left font-medium">User Answer</th>
                    <th className="px-4 py-3 text-left font-medium">Correct Answer</th>
                    <th className="px-4 py-3 text-left font-medium rounded-tr-lg">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {examData.map((item, index) => (
                    <tr
                      key={item.no}
                      className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.no}</td>
                      <td className="px-4 py-3 text-gray-600">{item.userAnswer}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.correctAnswer}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.result === "Correct" 
                            ? "bg-green-100 text-green-800" 
                            : item.result === "Wrong" 
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

  const renderReadingResults = () => {
    if (!data?.reading || !data.reading.questions) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No reading test results available</p>
        </div>
      );
    }

    const examData = data.reading.questions.map((q, index) => {
      const correctAnswer = q.correctAnswers[0]?.text || "";
      return {
        no: q.questionNumber || index + 1,
        userAnswer: q.userAnswer || "Not selected",
        correctAnswer: correctAnswer,
        result: q.correctAnswers.some(ca => ca.text === q.userAnswer) ? "Correct" : "Wrong"
      };
    });

    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Exam results</h1>
        </div>

        {/* Report Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            <span>Report ID: {data.id}</span>
            <span>Name: {data.user.name}</span>
          </div>
          <span>Date: {new Date(data.reading.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " GMT+5"}</span>
        </div>

        {/* Reading Score */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Reading score: {data.reading.score}
            <span className="ml-3 text-base text-muted-foreground">
              ({examData.filter(r => r.result === "Correct").length} / {examData.length} correct)
            </span>
          </h2>
        </div>

        {/* Results Table */}
        <Card className="overflow-hidden rounded-lg border border-gray-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-600 text-white">
                    <th className="px-4 py-3 text-left font-medium rounded-tl-lg">No.</th>
                    <th className="px-4 py-3 text-left font-medium">User Answer</th>
                    <th className="px-4 py-3 text-left font-medium">Correct Answer</th>
                    <th className="px-4 py-3 text-left font-medium rounded-tr-lg">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {examData.map((item, index) => (
                    <tr
                      key={item.no}
                      className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.no}</td>
                      <td className="px-4 py-3 text-gray-600">{item.userAnswer}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.correctAnswer}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.result === "Correct" 
                            ? "bg-green-100 text-green-800" 
                            : item.result === "Wrong" 
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
          <p className="text-gray-600">No writing test results available</p>
        </div>
      );
    }

    const { writing } = data;
    const aiFeedback = writing.aiFeedback;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black">Writing Test Results</h1>
                <p className="text-gray-600">IELTS Assessment Complete</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-red-500">
                  {writing.score || "0"}
                </div>
                <div className="text-sm text-gray-600">Band Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 mb-8 text-center">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl font-bold">
                {writing.score || "0"}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-black mb-2">Test Completed!</h2>
            <p className="text-gray-600 text-lg mb-6">Your IELTS Writing Assessment Results</p>
          </div>

          {/* AI Feedback Section */}
          {aiFeedback && (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
              <h3 className="text-2xl font-bold text-black mb-6 text-center">AI Assessment Feedback</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Task Achievement */}
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                    <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                    Task Achievement
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    {aiFeedback.taskAchievement || "No feedback available for task achievement."}
                  </p>
                </div>

                {/* Coherence and Cohesion */}
                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                    <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                    Coherence and Cohesion
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    {aiFeedback.coherenceAndCohesion || "No feedback available for coherence and cohesion."}
                  </p>
                </div>

                {/* Lexical Resource */}
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                    <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                    Lexical Resource
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    {aiFeedback.lexicalResource || "No feedback available for lexical resource."}
                  </p>
                </div>

                {/* Grammatical Range and Accuracy */}
                <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                  <h4 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
                    <span className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                    Grammatical Range and Accuracy
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    {aiFeedback.grammaticalRangeAndAccuracy || "No feedback available for grammatical range and accuracy."}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  const renderSpeakingResults = () => {
    if (!data?.speaking) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No speaking test results available</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-black">Speaking Test Results</h1>
                <p className="text-gray-600">IELTS Assessment Complete</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-red-500">
                  {data.speaking.score || "N/A"}
                </div>
                <div className="text-sm text-gray-600">Band Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 p-8 mb-8 text-center">
            <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-white text-3xl font-bold">
                {data.speaking.score || "N/A"}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-black mb-2">Test Completed!</h2>
            <p className="text-gray-600 text-lg mb-6">Your IELTS Speaking Assessment Results</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Overall Results</h1>
          <p className="text-muted-foreground">Comprehensive overview of your IELTS test performance</p>
                    </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="listening" className="flex items-center gap-2">
              <span className="hidden sm:inline">Listening</span>
              <span className="sm:hidden">L</span>
              {data?.listening && (
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  {data.listening.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex items-center gap-2">
              <span className="hidden sm:inline">Reading</span>
              <span className="sm:hidden">R</span>
              {data?.reading && (
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  {data.reading.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="writing" className="flex items-center gap-2">
              <span className="hidden sm:inline">Writing</span>
              <span className="sm:hidden">W</span>
              {data?.writing && (
                <span className="ml-1 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                  {data.writing.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="speaking" className="flex items-center gap-2">
              <span className="hidden sm:inline">Speaking</span>
              <span className="sm:hidden">S</span>
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

        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={() => navigate("/test")}>
            Back to Tests
                    </Button>
        </div>
      </div>
    </div>
  );
}


