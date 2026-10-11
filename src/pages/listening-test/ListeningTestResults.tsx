import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, useParams } from "react-router-dom";
import { listeningSubmissionService, type TestResultData } from "@/services/listeningTest.service";
import { useResultScreenProtection } from "@/hooks/use-result-screen-protection";

export default function ListeningResultsPage() {
  useResultScreenProtection();
  const { resultId } = useParams<{ resultId: string }>();
  const [data, setData] = useState<TestResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportId, setReportId] = useState(resultId || "");
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

  const fullExamData = useMemo(() => {
    const snapshotQuestions = (data?.review?.sections || []).flatMap((section) => section.questions || []);
    // The completed result owns its questions and answer key. Solving content
    // hides the key and may belong to a later authoring revision.
    if (snapshotQuestions.length > 0) {
      return snapshotQuestions.map((question, index) => ({
        no: question.number || index + 1,
        userAnswer: (Array.isArray(question.userAnswer) ? question.userAnswer.join(" / ") : question.userAnswer) || "Seçilmedi",
        correctAnswer: question.answers.filter((answer) => answer.correct)
          .map((answer) => answer.variantText || answer.text).join(" / ") || "Belirtilmedi",
        result: !question.userAnswer || (Array.isArray(question.userAnswer) && question.userAnswer.length === 0)
          ? "Seçilmedi" : question.isCorrect ? "Doğru" : "Yanlış",
      })).sort((a, b) => a.no - b.no);
    }
    return (data?.userAnswers || []).map((answer, index) => ({
      no: answer.question?.number || index + 1,
      userAnswer: answer.userAnswer || "Seçilmedi",
      correctAnswer: (answer.question?.answers || []).filter((option) => option.correct)
        .map((option) => option.variantText || option.answer).join(" / ") || "Belirtilmedi",
      result: !answer.userAnswer ? "Seçilmedi" : answer.isCorrect ? "Doğru" : "Yanlış",
    })).sort((a, b) => a.no - b.no);
  }, [data]);

  const hasDetailedData = fullExamData.length > 0;
  const hasSummaryData = summary && summary.score !== undefined;

  const score = summary?.score ?? data?.score ?? 0;
  const normalizeLevel = (raw?: string | null) => {
    if (!raw) return undefined;
    const value = String(raw).trim().toUpperCase();
    if (value === "A0" || value === "B1_ALTI" || value === "B1 ALTI") return "B1 altı";
    return value;
  };
  const levelFromScore = (value: number) => {
    if (value >= 65) return "C1";
    if (value >= 51) return "B2";
    if (value >= 38) return "B1";
    return "B1 altı";
  };
  const resolvedLevel =
    normalizeLevel((summary as any)?.level ?? (data as any)?.level) ||
    levelFromScore(Number(score) || 0);
  const computedCorrectFromFull = useMemo(() => {
    if (fullExamData) return fullExamData.filter(r => r.result === "Doğru").length;
    if (hasDetailedData) return (data!.userAnswers || []).filter((u: any) => u.isCorrect).length;
    return undefined;
  }, [fullExamData, hasDetailedData, data]);
  const computedTotalFromFull = useMemo(() => {
    if (fullExamData) return fullExamData.length;
    if (hasDetailedData) return (data!.userAnswers || []).length;
    return undefined;
  }, [fullExamData, hasDetailedData, data]);
  const correctCount = (summary as any)?.dogruCount ?? (summary as any)?.doğruCount ?? (summary as any)?.correctCount ?? computedCorrectFromFull;
  const totalQuestions = summary?.totalQuestions ?? computedTotalFromFull;
  const userName = "JAXONGIRMIRZO"; // You can get this from user context or API
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19) + " GMT+5";
  const rowsForDisplay = fullExamData;

  const renderSplitResultsTable = (rows: Array<{ no: number; userAnswer: string; correctAnswer: string; result: string }>) => {
    const firstColumnRows = rows.slice(0, 18);
    const secondColumnRows = rows.slice(18, 35);
    const resolvedCorrect =
      typeof correctCount === "number"
        ? correctCount
        : rows.filter((r) => r.result === "Doğru").length;
    const resolvedTotal = typeof totalQuestions === "number" ? totalQuestions : rows.length;

    const renderColumn = (columnRows: typeof rows) => (
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className="px-3 py-2 text-left font-medium w-[70px]">No.</th>
              <th className="px-3 py-2 text-left font-medium">Kullanıcı Cevabı</th>
              <th className="px-3 py-2 text-left font-medium">Doğru Cevap</th>
              <th className="px-3 py-2 text-left font-medium w-[90px]">Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {columnRows.map((item, index) => (
              <tr
                key={item.no}
                className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
              >
                <td className="px-3 py-2 text-gray-700 font-medium">{item.no}</td>
                <td className="px-3 py-2 text-gray-600">{item.userAnswer || "Seçilmedi"}</td>
                <td className="px-3 py-2 text-gray-800 font-medium">{item.correctAnswer}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.result === "Doğru"
                        ? "bg-green-100 text-green-800"
                        : item.result === "Yanlış"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {item.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    return (
      <Card className="overflow-hidden rounded-lg border border-gray-200">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 text-sm sm:text-base font-semibold text-gray-800">
            Doğru Sayısı: {resolvedCorrect} / {resolvedTotal}
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-2 gap-4 min-w-[1080px]">
              {renderColumn(firstColumnRows)}
              {renderColumn(secondColumnRows)}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Puan</p>
              <p className="text-2xl font-bold text-gray-900">{score}</p>
            </CardContent>
          </Card>
          <Card className="border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">Seviye</p>
              <p className="text-2xl font-bold text-red-600">{resolvedLevel}</p>
            </CardContent>
          </Card>
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
          {typeof correctCount === "number" && typeof totalQuestions === "number" && (
            <span className="ml-3 text-base text-muted-foreground">(
              {correctCount} / {totalQuestions} doğru
            )</span>
          )}
        </h2>
        </div>

        {/* Prefer full table using original test structure to include Seçilmedi rows */}
        {fullExamData ? (
          renderSplitResultsTable(fullExamData)
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="border border-gray-200 rounded-lg">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Puan</p>
            <p className="text-2xl font-bold text-gray-900">{score}</p>
          </CardContent>
        </Card>
        <Card className="border border-gray-200 rounded-lg">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Seviye</p>
            <p className="text-2xl font-bold text-red-600">{resolvedLevel}</p>
          </CardContent>
        </Card>
      </div>

      {/* Listening Score */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Dinleme Puanı: {score}
          {typeof correctCount === "number" && typeof totalQuestions === "number" && (
            <span className="ml-3 text-base text-muted-foreground">(
              {correctCount} / {totalQuestions} doğru
            )</span>
          )}
        </h2>
      </div>

      {/* Sonuçs Table */}
      {renderSplitResultsTable(rowsForDisplay)}

      </div>
    </div>
  );
}

