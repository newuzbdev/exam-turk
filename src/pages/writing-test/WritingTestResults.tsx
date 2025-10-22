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
    <div className="w-full bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        {/* Debug info - remove this later */}
      
        {/* Back button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/test")}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Header with overall score */}
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-foreground">
            Writing overall score: {scores.overall}{" "}
        
          </h1>
        </div>

        {/* Scoring categories */}
        <div className="mb-8 grid grid-cols-4 gap-6">
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-foreground">Coherence cohesion</p>
            <p className="text-sm text-gray-700 leading-relaxed">{writingData?.aiFeedback?.coherenceAndCohesion || "No feedback available"}</p>
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-foreground">Grammar</p>
            <p className="text-sm text-gray-700 leading-relaxed">{writingData?.aiFeedback?.grammaticalRangeAndAccuracy || "No feedback available"}</p>
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-foreground">Lexical resource</p>
            <p className="text-sm text-gray-700 leading-relaxed">{writingData?.aiFeedback?.lexicalResource || "No feedback available"}</p>
          </div>
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-foreground">Task achievement</p>
            <p className="text-sm text-gray-700 leading-relaxed">{writingData?.aiFeedback?.taskAchievement || "No feedback available"}</p>
          </div>
        </div>

        {/* Task tabs */}
        <div className="mb-8 flex gap-4">
          <Button
            onClick={() => setActiveTask("task1")}
            variant={activeTask === "task1" ? "default" : "outline"}
            className={`flex-1 rounded-lg py-2 font-medium ${
              activeTask === "task1"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-200 text-foreground hover:bg-gray-300"
            }`}
          >
            Task 1
          </Button>
          <Button
            onClick={() => setActiveTask("task2")}
            variant={activeTask === "task2" ? "default" : "outline"}
            className={`flex-1 rounded-lg py-2 font-medium ${
              activeTask === "task2"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-200 text-foreground hover:bg-gray-300"
            }`}
          >
            Task 2
          </Button>
        </div>

        {/* Task 1 sub-tabs (only show when Task 1 is active) */}
        {activeTask === "task1" && task1Answers.length > 1 && (
          <div className="mb-8 flex gap-4">
            <Button
              onClick={() => setActiveTask1Part("part1")}
              variant={activeTask1Part === "part1" ? "default" : "outline"}
              className={`flex-1 rounded-lg py-2 font-medium ${
                activeTask1Part === "part1"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-200 text-foreground hover:bg-gray-300"
              }`}
            >
              Part 1.1
            </Button>
            <Button
              onClick={() => setActiveTask1Part("part2")}
              variant={activeTask1Part === "part2" ? "default" : "outline"}
              className={`flex-1 rounded-lg py-2 font-medium ${
                activeTask1Part === "part2"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-200 text-foreground hover:bg-gray-300"
              }`}
            >
              Part 1.2
            </Button>
          </div>
        )}

        {/* Question section */}
        <div className="mb-8 rounded-lg bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Question:</h2>
          <p className="text-sm text-gray-700">{currentData.question}</p>
        </div>

        {/* Answer section */}
        <div className="mb-8 rounded-lg bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Answer:</h2>
          <p className="text-sm text-gray-700">{currentData.answer}</p>
        </div>

        {/* Comment section */}
        <div className="rounded-lg bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Comment:</h2>
          <p className="text-sm text-gray-700">{currentData.comment}</p>
        </div>

        {/* Action Button */}
        <div className="mt-8">
          <Button
            onClick={() => navigate("/test")}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-md font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Take Another Test
          </Button>
        </div>
      </div>
    </div>
  );
}
