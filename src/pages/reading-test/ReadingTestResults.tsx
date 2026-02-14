import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation, useParams } from "react-router-dom";
import { readingSubmissionService, readingTestService, type ReadingTestItem, type TestResultData } from "@/services/readingTest.service";
import { Download } from "lucide-react";
import { overallTestService, overallTestFlowStore } from "@/services/overallTest.service";

export default function ReadingTestResults() {
  const { resultId } = useParams<{ resultId: string }>();
  const [data, setData] = useState<TestResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportId, setReportId] = useState(resultId || "");
  const [testData, setTestData] = useState<ReadingTestItem | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const location = useLocation();
  const navState: any = (location && (location as any).state) || {};
  const summary = navState?.summary || null;

  const handleDownloadPDF = async () => {
    // Try to get overall test result ID from session storage, otherwise use individual result ID
    const overallId = overallTestFlowStore.getOverallId() || resultId;
    if (!overallId) return;
    
    setDownloadingPDF(true);
    try {
      await overallTestService.downloadPDF(overallId, `reading-certificate-${overallId}.pdf`);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setDownloadingPDF(false);
    }
  };

  useEffect(() => {
    if (!resultId) {
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const res = await readingSubmissionService.getExamResults(resultId);
        setData(res);
        const effectiveTestId = res?.testId || summary?.testId;
        if (effectiveTestId) {
          try {
            const td = await readingTestService.getTestWithFullData(effectiveTestId);
            setTestData(td);
          } catch {}
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
      const res = await readingSubmissionService.getExamResults(reportId);
      setData(res);
    } catch (error) {
      console.error("Error fetching report:", error);
    }
    setLoading(false);
  };

  const examData = data?.userAnswers?.map((ua: any, index: number) => {
    const doğruAnswer = ua.question.answers.find((a: any) => a.correct);
    return {
      no: index + 1,
      userAnswer: ua.userAnswer || "Seçilmedi",
      doğruAnswer: doğruAnswer?.variantText || doğruAnswer?.answer || "",
      result: ua.isCorrect ? "Doğru" : "Yanlış"
    };
  }) || [];

  const fullExamData = useMemo(() => {
    if (!testData) return null;
    const byId: Record<string, { userAnswer?: string; isCorrect?: boolean }> = {};
    const byNumber: Record<number, { userAnswer?: string; isCorrect?: boolean }> = {};
    const byText: Record<string, { userAnswer?: string; isCorrect?: boolean }> = {};
    const detailed = (data?.userAnswers || []);
    detailed.forEach((ua: any) => {
      if (ua?.questionId) byId[ua.questionId] = { userAnswer: ua.userAnswer, isCorrect: ua.isCorrect };
      const num = ua?.question?.number;
      if (typeof num === 'number') byNumber[num] = { userAnswer: ua.userAnswer, isCorrect: ua.isCorrect };
      const txt = (ua?.question?.text || ua?.question?.content || '').toString().trim().toLowerCase();
      if (txt) byText[txt] = { userAnswer: ua.userAnswer, isCorrect: ua.isCorrect };
    });

    let flatQuestions: any[] = [];
    (testData.parts || []).forEach(p => (p.sections || []).forEach(s => (s.questions || []).forEach(q => flatQuestions.push(q))));
    // Prefer ordering by question.number if present
    flatQuestions = flatQuestions.sort((a, b) => {
      const na = typeof a.number === 'number' ? a.number : 1e9;
      const nb = typeof b.number === 'number' ? b.number : 1e9;
      if (na !== nb) return na - nb;
      return 0;
    });

    const rows: { no: number; userAnswer: string; doğruAnswer: string; result: string; _qid?: string }[] = [];
    const usedDetailed = new Set<number>();

    for (let i = 0; i < flatQuestions.length; i++) {
      const q = flatQuestions[i];
      const doğru = (q.answers || []).find((a: any) => a.doğru);
      let ua = byId[q.id];
      if (!ua && typeof q.number === 'number') ua = byNumber[q.number];
      if (!ua) {
        const key = (q.text || q.content || '').toString().trim().toLowerCase();
        if (key && byText[key]) ua = byText[key];
      }
      if (!ua) {
        // Try to match by index to at least show selected ones if ordering matches
        if (detailed[i]) {
          ua = { userAnswer: detailed[i].userAnswer, isCorrect: detailed[i].isCorrect };
          usedDetailed.add(i);
        }
      }
      const userAnswer = ua?.userAnswer || "Seçilmedi";
      const result = ua?.userAnswer ? (ua?.isCorrect ? "Doğru" : "Yanlış") : "Seçilmedi";
      rows.push({
        no: (typeof q.number === 'number' ? q.number : (i + 1)),
        userAnswer,
        doğruAnswer: String(doğru?.variantText || doğru?.answer || ""),
        result,
        _qid: q.id,
      });
    }

    // Append any remaining detailed answers that didn't match by id/number/index
    for (let i = 0; i < detailed.length; i++) {
      if (usedDetailed.has(i)) continue;
      const ua = detailed[i];
      if (!ua) continue;
      // Skip if we already have a row with this questionId
      if (ua.questionId && rows.some(r => r._qid === ua.questionId)) continue;
      const cAns = (ua.question?.answers || []).find((a: any) => a.doğru);
      rows.push({
        no: typeof ua.question?.number === 'number' ? ua.question.number : (rows.length + 1),
        userAnswer: ua.userAnswer || "Seçilmedi",
        doğruAnswer: String(cAns?.variantText || cAns?.answer || ""),
        result: ua.userAnswer ? (ua.isCorrect ? "Doğru" : "Yanlış") : "Seçilmedi",
      });
    }

    // Sort by No. at the end for consistent display
    return rows
      .map(({ _qid, ...rest }) => rest)
      .sort((a, b) => a.no - b.no);
  }, [testData, data]);

  const hasDetailedData = data && data.userAnswers && data.userAnswers.length > 0;
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
  // Prefer reconstructed rows, but if most are "Seçilmedi", fall back to raw API rows
  const finalRows = useMemo(() => {
    if (fullExamData && fullExamData.length) {
      const notSelectedCount = fullExamData.filter(r => !r.userAnswer || r.userAnswer === "Seçilmedi").length;
      const ratio = notSelectedCount / fullExamData.length;
      if (ratio <= 0.5) return fullExamData;
      // Too many missing matches -> use raw mapping
    }
    return examData;
  }, [fullExamData, examData]);
  const computedDoğruFromFull = useMemo(() => {
    if (finalRows) return finalRows.filter(r => r.result === "Doğru").length;
    if (hasDetailedData) return (data!.userAnswers || []).filter(u => u.isCorrect).length;
    return undefined;
  }, [finalRows, hasDetailedData, data]);
  const computedTotalFromFull = useMemo(() => {
    if (finalRows) return finalRows.length;
    if (hasDetailedData) return (data!.userAnswers || []).length;
    return undefined;
  }, [finalRows, hasDetailedData, data]);
  const doğruCount = summary?.doğruCount ?? computedDoğruFromFull;
  const totalQuestions = summary?.totalQuestions ?? computedTotalFromFull;
  const userName = "JAXONGIRMIRZO";
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19) + " GMT+5";

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

  if (!hasDetailedData && hasSummaryData) {
    return (
      <div className="max-w-6xl mx-auto space-y-5 p-4 sm:p-6">
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

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Okuma Puanı: {score}
            {typeof doğruCount === "number" && typeof totalQuestions === "number" && (
              <span className="ml-3 text-base text-muted-foreground">(
                {doğruCount} / {totalQuestions} doğru
              )</span>
            )}
          </h2>
        </div>

        {finalRows && finalRows.length ? (
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
                    {finalRows.map((item: any, index: number) => (
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
                <h3 className="text-lg font-semibold text-foreground mb-2">Test Completed Successfully</h3>
                <p className="text-muted-foreground mb-4">
                  Your test has been submitted and scored. Detailed question-by-question results are being processed.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">Score: {score}</p>
                  {summary?.totalQuestions && (
                    <p className="text-green-700 text-sm mt-1">
                      Total Questions: {summary.totalQuestions}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download PDF Button */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
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
            Raporu Al
          </Button>
        </div>
      </div>

      {/* Download PDF Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleDownloadPDF}
          disabled={downloadingPDF}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
        </Button>
      </div>

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

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground">Okuma Puanı: {score}
          {typeof doğruCount === "number" && typeof totalQuestions === "number" && (
            <span className="ml-3 text-base text-muted-foreground">(
              {doğruCount} / {totalQuestions} doğru
            )</span>
          )}
        </h2>
      </div>

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
                {(fullExamData || examData).map((item, index) => (
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

      {/* Download PDF Button */}
      <div className="flex justify-end mt-6">
        <Button
          onClick={handleDownloadPDF}
          disabled={downloadingPDF}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          {downloadingPDF ? "İndiriliyor..." : "Sertifikayı İndir (PDF)"}
        </Button>
      </div>
    </div>
  );
}
