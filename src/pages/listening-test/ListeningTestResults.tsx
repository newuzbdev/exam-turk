import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, useParams } from "react-router-dom";
import { listeningSubmissionService, listeningTestService, type ListeningTestItem, type TestResultData } from "@/services/listeningTest.service";

export default function ListeningResultsPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [data, setData] = useState<TestResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportId, setReportId] = useState(resultId || "");
  const [testData, setTestData] = useState<ListeningTestItem | null>(null);
  const location = useLocation();
  const navState: any = (location && (location as any).state) || {};
  const summary = navState?.summary || null;

  useEffect(() => {
    if (!resultId) {
      console.log("No resultId provided to results page");
      return;
    }
    console.log("Fetching results for resultId:", resultId);
    (async () => {
      setLoading(true);
      try {
        const res = await listeningSubmissionService.getExamResults(resultId);
        console.log("Sonuçs fetched:", res);
        setData(res);
        // Try to fetch full test to render all questions
        if (res?.testId) {
          try {
            const td = await listeningTestService.getTestWithFullData(res.testId);
            setTestData(td);
          } catch (e) {
            console.warn("Failed to fetch test for results rendering", e);
          }
        }
      } catch (error) {
        console.error("Error fetching results:", error);
      }
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
  const examData = data?.userAnswers?.map((ua: any, index: number) => {
    const doğruAnswer = ua.question.answers.find((a: any) => a.correct);
    return {
      no: index + 1,
      userAnswer: ua.userAnswer || "Seçilmedi",
      doğruAnswer: doğruAnswer?.variantText || doğruAnswer?.answer || "",
      result: ua.isCorrect ? "Doğru" : "Yanlış"
    };
  }) || [];

  // Build full results using original test structure to show unanswered as Seçilmedi
  const fullExamData = useMemo(() => {
    if (!testData) return null;
    const userAnswerByQ: Record<string, { userAnswer?: string; isCorrect?: boolean }> = {};
    (data?.userAnswers || []).forEach((ua: any) => {
      userAnswerByQ[ua.questionId] = { userAnswer: ua.userAnswer, isCorrect: ua.isCorrect };
    });
    const rows: { no: number; userAnswer: string; doğruAnswer: string; result: string }[] = [];
    let counter = 1;
    (testData.parts || []).forEach(p => {
      (p.sections || []).forEach(s => {
        (s.questions || []).forEach(q => {
          const ua = userAnswerByQ[q.id] || {};
          const doğru = (q.answers || []).find((a: any) => a.correct);
          rows.push({
            no: counter++,
            userAnswer: ua.userAnswer || "Seçilmedi",
            doğruAnswer: (doğru?.variantText || doğru?.answer || "") as string,
            result: ua.userAnswer ? (ua.isCorrect ? "Doğru" : "Yanlış") : "Seçilmedi",
          });
        });
      });
    });
    return rows;
  }, [testData, data]);

  // If we don't have detailed data but have summary, show a basic message
  const hasDetailedData = data && data.userAnswers && data.userAnswers.length > 0;
  const hasSummaryData = summary && summary.score !== undefined;

  const score = summary?.score ?? data?.score ?? 0;
  const computedDoğruFromFull = useMemo(() => {
    if (fullExamData) return fullExamData.filter(r => r.result === "Doğru").length;
    if (hasDetailedData) return (data!.userAnswers || []).filter((u: any) => u.isCorrect).length;
    return undefined;
  }, [fullExamData, hasDetailedData, data]);
  const computedTotalFromFull = useMemo(() => {
    if (fullExamData) return fullExamData.length;
    if (hasDetailedData) return (data!.userAnswers || []).length;
    return undefined;
  }, [fullExamData, hasDetailedData, data]);
  const doğruCount = summary?.doğruCount ?? computedDoğruFromFull;
  const totalQuestions = summary?.totalQuestions ?? computedTotalFromFull;
  const userName = "JAXONGIRMIRZO"; // You can get this from user context or API
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19) + " GMT+5";

  // Debug logging
  console.log("Sonuçs page state:", { resultId, data, summary, loading });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  // If no data is available, show error message
  if (!data && !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Sonuçlar Bulunamadı</h2>
          <p className="text-muted-foreground mb-4">
            Test sonuçları yüklenemedi. Lütfen sonuç ID'sini kontrol edin ve tekrar deneyin.
          </p>
          <div className="flex items-center gap-3">
            <Input
              value={reportId}
              onChange={(e) => setReportId(e.target.value)}
              className="w-48"
              placeholder="Rapor ID girin"
            />
            <Button 
              onClick={handleGetReport}
              className="bg-red-600 hover:bg-red-700 text-white px-6"
            >
              Raporu Al
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If we have summary but no detailed data, show basic results
  if (!hasDetailedData && hasSummaryData) {
    return (
      <div className="max-w-6xl mx-auto space-y-5 p-4 sm:p-6">
        <div className="mx-4 space-y-5">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">Sınav Sonuçları</h1>
          <div className="w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Input
                value={reportId}
                onChange={(e) => setReportId(e.target.value)}
                className="flex-1 sm:flex-none sm:w-64 h-9"
                placeholder="Rapor ID girin"
              />
              <Button 
                onClick={handleGetReport}
                className="bg-red-600 hover:bg-red-700 text-white h-9 px-4 sm:px-5"
              >
                Get
              </Button>
            </div>
          </div>
        </div>

        {/* Report Meta */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-medium text-gray-600">Report ID</span>
              <Button
                variant="outline"
                className="h-8 px-2 py-1 text-xs"
                onClick={() => navigator.clipboard.writeText(reportId || "")}
              >
                Copy
              </Button>
            </div>
            <div className="text-xs sm:text-sm break-all text-gray-800">{reportId}</div>
            <div className="flex items-center justify-between text-[11px] sm:text-sm text-gray-600">
              <span>Name: {userName}</span>
              <span>{currentDate}</span>
            </div>
          </div>
        </div>

        {/* Listening Score */}
        <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Dinleme Puanı: {score}
          {typeof doğruCount === "number" && typeof totalQuestions === "number" && (
            <span className="ml-3 text-base text-muted-foreground">(
              {doğruCount} / {totalQuestions} doğru
            )</span>
          )}
        </h2>
        </div>

        {/* Prefer full table using original test structure to include Seçilmedi rows */}
        {fullExamData ? (
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
                    {fullExamData.map((item, index) => (
                      <tr
                        key={item.no}
                        className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                      >
                        <td className="px-4 py-3 text-gray-700 font-medium">{item.no}</td>
                        <td className="px-4 py-3 text-gray-600">{item.userAnswer || "Seçilmedi"}</td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{item.doğruAnswer}</td>
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
        ) : (
          <Card className="overflow-hidden rounded-lg border border-gray-200">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">Test Başarıyla Tamamlandı</h3>
                <p className="text-muted-foreground mb-4">
                  Testiniz gönderildi ve puanlandı. Soru bazında detaylı sonuçlar işleniyor.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">Puan: {score}</p>
                  {summary?.totalQuestions && (
                    <p className="text-green-700 text-sm mt-1">
                      Toplam Soru: {summary.totalQuestions}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div className="mx-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Sınav Sonuçları</h1>
        <div className="flex items-center gap-3">
          <Input
            value={reportId}
            onChange={(e) => setReportId(e.target.value)}
            className="w-48"
            placeholder="Rapor ID girin"
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
        <h2 className="text-xl font-semibold text-foreground">Dinleme Puanı: {score}
          {typeof doğruCount === "number" && typeof totalQuestions === "number" && (
            <span className="ml-3 text-base text-muted-foreground">(
              {doğruCount} / {totalQuestions} doğru
            )</span>
          )}
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
                {(fullExamData || examData).map((item: any, index: number) => (
                  <tr
                    key={item.no}
                    className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="px-4 py-3 text-gray-700 font-medium">{item.no}</td>
                    <td className="px-4 py-3 text-gray-600">{item.userAnswer || "Seçilmedi"}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{item.doğruAnswer}</td>
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
    </div>
  );
}
