import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import writingSubmissionService from "@/services/writingSubmission.service";

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
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Result not found</p>
          <Button onClick={() => navigate("/test")} className="mt-4">
            Back to Tests
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

  const scores = {
    overall: writingData?.score || 0,
    part1: 0, // We'll calculate this from individual answers
    part2: 0, // We'll calculate this from individual answers
    coherence: extractScoreFromFeedback(writingData?.aiFeedback?.coherenceAndCohesion) || 0,
    grammar: extractScoreFromFeedback(writingData?.aiFeedback?.grammaticalRangeAndAccuracy) || 0,
    lexical: extractScoreFromFeedback(writingData?.aiFeedback?.lexicalResource) || 0,
    achievement: extractScoreFromFeedback(writingData?.aiFeedback?.taskAchievement) || 0,
  };

  // Get answers array
  const answers = writingData?.answers || [];
  
  // Separate Task 1 and Task 2 answers
  const task1Answers = answers.filter((_: any, index: number) => index < 2); // First 2 answers are Task 1
  const task2Answers = answers.filter((_: any, index: number) => index >= 2); // Remaining answers are Task 2

  // Get current question and answer based on active task
  const getCurrentQuestionAndAnswer = () => {
    if (activeTask === "task1") {
      // For Task 1, show the answer based on active part
      const answerIndex = activeTask1Part === "part1" ? 0 : 1;
      const currentAnswer = task1Answers[answerIndex];
      return {
        question: currentAnswer?.questionText || `Task 1 ${activeTask1Part === "part1" ? "Part 1" : "Part 2"} Question`,
        answer: currentAnswer?.userAnswer || "No answer provided",
        comment: writingData?.aiFeedback?.taskAchievement || `Task 1 ${activeTask1Part === "part1" ? "Part 1" : "Part 2"} feedback will be shown here`
      };
    } else {
      // For Task 2, show the first Task 2 answer
      const firstTask2Answer = task2Answers[0];
      return {
        question: firstTask2Answer?.questionText || "Task 2 Question",
        answer: firstTask2Answer?.userAnswer || "No answer provided",
        comment: writingData?.aiFeedback?.taskAchievement || "Task 2 feedback will be shown here"
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
              <h1 className="text-3xl font-bold text-gray-900"></h1>
              <p className="text-gray-600 mt-1">Review your performance and feedback</p>
            </div>
          </div>

          {/* Overall Score Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Overall Score</h2>
                <p className="text-gray-600">Your writing test performance</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-red-600">{scores.overall}</div>
                <div className="text-sm text-gray-500">out of 9</div>
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
              {writingData?.aiFeedback?.coherenceAndCohesion || "No feedback available"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Grammar</h3>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {writingData?.aiFeedback?.grammaticalRangeAndAccuracy || "No feedback available"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Lexical Resource</h3>
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {writingData?.aiFeedback?.lexicalResource || "No feedback available"}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Task Achievement</h3>
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {writingData?.aiFeedback?.taskAchievement || "No feedback available"}
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
              <h2 className="text-lg font-semibold text-gray-900">Question</h2>
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
              <h2 className="text-lg font-semibold text-gray-900">Your Answer</h2>
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
              <h2 className="text-lg font-semibold text-gray-900">AI Feedback</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.comment}</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={() => navigate("/test")}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Take Another Test
          </Button>
        </div>
      </div>
    </div>
  );
}
