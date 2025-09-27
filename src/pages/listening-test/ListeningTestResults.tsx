import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, useParams } from "react-router-dom";
import { listeningSubmissionService, type TestResultData } from "@/services/listeningTest.service";

export default function ListeningResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [data, setData] = useState<TestResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportId, setReportId] = useState(resultId || "");
  const location = useLocation();
  const navState: any = (location && (location as any).state) || {};
  const summary = navState?.summary || null;

  useEffect(() => {
    if (!resultId) return;
    (async () => {
      setLoading(true);
      const res = await listeningSubmissionService.getExamResults(resultId);
      setData(res);
      setLoading(false);
    })();
  }, [resultId]);

  const handleGetReport = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const res = await listeningSubmissionService.getExamResults(reportId);
      setData(res);
    } catch (error) {
      console.error("Error fetching report:", error);
    }
    setLoading(false);
  };

  // Transform data to match the table format
  const examData = data?.userAnswers.map((ua, index) => {
    const correctAnswer = ua.question.answers.find(a => a.correct);
    return {
      no: index + 1,
      userAnswer: ua.userAnswer || "",
      correctAnswer: correctAnswer?.variantText || correctAnswer?.answer || "",
      result: ua.isCorrect ? "Correct" : "Wrong"
    };
  }) || [];

  const score = summary?.score ?? data?.score ?? 0;
  const userName = "JAXONGIRMIRZO"; // You can get this from user context or API
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19) + " GMT+5";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Exam results</h1>
        <div className="flex items-center gap-3">
          <Input
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            className="w-48"
            placeholder="Enter report ID"
          />
          <Button 
            onClick={handleGetReport}
            className="bg-red-600 hover:bg-red-700 text-white px-6"
          >
            Get Report
          </Button>
        </div>
      </div>

      {/* Report Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-6">
          <span>Report ID: {reportId}</span>
          <span>Name: {userName}</span>
        </div>
        <span>Date: {currentDate}</span>
      </div>

      {/* Listening Score */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Listening score: {score}</h2>
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
                    <td className="px-4 py-3 text-gray-600">{item.userAnswer || ""}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{item.correctAnswer}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.result === "Correct" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
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
}
