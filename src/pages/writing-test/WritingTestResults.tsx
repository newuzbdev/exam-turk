import { ArrowLeft, FileText } from "lucide-react";
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
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/test")}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-black">
                  Writing Test Results
                </h1>
                <p className="text-gray-600">IELTS Assessment Complete</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-red-500">
                {result.score ?? "0 "}
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
              {result.score ?? "0"}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-black mb-2">
            Test Completed!
          </h2>
          <p className="text-gray-600 text-lg mb-6">
            Your IELTS Writing Assessment Results
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-2xl font-bold text-black mb-1">
                {result.score ?? "0"}
              </div>
              <div className="text-sm text-gray-600">Band Score</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-2xl font-bold text-black mb-1">4</div>
              <div className="text-sm text-gray-600">Criteria</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="text-2xl font-bold text-black mb-1">
                {new Date(
                  result.submittedAt || result.createdAt || Date.now()
                ).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>

        {/* Detailed Feedback */}
        {result.aiFeedback && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Task Achievement */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-black">Task Achievement</h3>
                  <p className="text-sm text-gray-600">
                    How well you addressed the task
                  </p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {result.aiFeedback.taskAchievement}
              </p>
            </div>

            {/* Coherence & Cohesion */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">CC</span>
                </div>
                <div>
                  <h3 className="font-bold text-black">Coherence & Cohesion</h3>
                  <p className="text-sm text-gray-600">
                    Structure and flow of your writing
                  </p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {result.aiFeedback.coherenceAndCohesion}
              </p>
            </div>

            {/* Lexical Resource */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">LR</span>
                </div>
                <div>
                  <h3 className="font-bold text-black">Lexical Resource</h3>
                  <p className="text-sm text-gray-600">
                    Vocabulary range and accuracy
                  </p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {result.aiFeedback.lexicalResource}
              </p>
            </div>

            {/* Grammar & Accuracy */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">GA</span>
                </div>
                <div>
                  <h3 className="font-bold text-black">Grammar & Accuracy</h3>
                  <p className="text-sm text-gray-600">
                    Language structure and correctness
                  </p>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {result.aiFeedback.grammaticalRangeAndAccuracy}
              </p>
            </div>
          </div>
        )}

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
