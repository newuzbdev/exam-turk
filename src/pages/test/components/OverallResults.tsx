import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosPrivate from "@/config/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { overallTestService } from "@/services/overallTest.service";
import { ConfettiSideCannons } from "@/components/ui/confetti-side-cannons";

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

interface TestSonuc {
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
    section?: {
      id: string;
      title: string;
      description: string;
      order: number;
    };
  }>;
  submittedAt?: string;
  sections?: any[];
  parts?: any[];
  part1?: any;
  part2?: any;
  part3?: any;
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
  level?: string;
  listening?: TestSonuc;
  reading?: TestSonuc;
  writing?: TestSonuc;
  speaking?: TestSonuc;
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

  const displayLevel = (level?: string) => {
    if (!level) return level;
    return level === "A0" || level === "B1_ALTI" ? "B1 altı" : level;
  };
  const levelFrom75 = (score?: number | null) => {
    if (typeof score !== "number" || Number.isNaN(score)) return undefined;
    if (score >= 65) return "C1";
    if (score >= 51) return "B2";
    if (score >= 38) return "B1";
    return "B1 altı";
  };
  const isMultiTest =
    (data?.listening ? 1 : 0) +
    (data?.reading ? 1 : 0) +
    (data?.writing ? 1 : 0) +
    (data?.speaking ? 1 : 0) > 1;


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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sınav Sonuçları</h1> */}
        </div>
        
          <div className="space-y-6">

          {/* Report Info */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground ml-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <span className="break-all">Report ID: {data.id}</span>
              <span>İsim: {data.user.name}</span>
            </div>
            <span className="text-xs sm:text-sm">Tarih: {new Date(data.listening.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " "}</span>
          </div>

          {/* Listening Score with Level */}
          {isMultiTest && displayLevel(data.level) ? (
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_145px] items-stretch gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 sm:px-6 sm:py-4 h-full">
                <div className="h-full flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dinleme Puanı</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      ({examData.filter(r => r.result === "Doğru").length} / {examData.length} doğru)
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500 mb-1">Puan</div>
                    <div className="text-3xl sm:text-4xl font-bold text-red-600">{data.listening.score}</div>
                  </div>
                </div>
              </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 sm:px-6 sm:py-4 h-full flex flex-col items-center justify-center">
                <div className="text-sm text-gray-500 mb-1">Genel Seviye</div>
                <div className="text-2xl sm:text-3xl font-semibold text-gray-900">{displayLevel(data.level)}</div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 sm:px-6 sm:py-4 h-full mb-6">
              <div className="h-full flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dinleme Puanı</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    ({examData.filter(r => r.result === "Doğru").length} / {examData.length} doğru)
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <div className="text-3xl sm:text-4xl font-bold text-red-600">{data.listening.score}</div>
                    {displayLevel(data.level) && (
                      <span className="text-base sm:text-lg font-semibold text-gray-700"> / {displayLevel(data.level)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Table - Mobile Card Layout + Desktop Table */}
          <Card className="overflow-hidden rounded-lg border border-gray-200">
            <CardContent className="p-0">
              {/* Mobile Card Layout */}
              <div className="block sm:hidden">
                {examData.map((item, index: number) => (
                  <div
                    key={item.no}
                    className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Soru {item.no}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.result === "Doğru"
                          ? "bg-green-100 text-green-800"
                          : item.result === "Yanlış"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                      }`}>
                        {item.result}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-500 min-w-[90px]">Cevabınız:</span>
                        <span className="text-xs text-gray-700 break-words">{item.userAnswer}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-500 min-w-[90px]">Doğru Cevap:</span>
                        <span className="text-xs text-gray-800 font-medium break-words">{item.correctAnswer}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full min-w-[500px]">
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
      <div className="space-y-6">
        {/* Report Info */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground ml-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <span className="break-all">Report ID: {data.id}</span>
            <span>İsim: {data.user.name}</span>
          </div>
          <span className="text-xs sm:text-sm">Tarih: {new Date(data.reading.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " "}</span>
        </div>

        {/* Reading Score with Level */}
        {isMultiTest && displayLevel(data.level) ? (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_145px] items-stretch gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 sm:px-6 sm:py-4 h-full">
              <div className="h-full flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Okuma Puanı</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    ({examData.filter(r => r.result === "Doğru").length} / {examData.length} doğru)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">Puan</div>
                  <div className="text-3xl sm:text-4xl font-bold text-red-600">{data.reading.score}</div>
                </div>
              </div>
            </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 sm:px-6 sm:py-4 h-full flex flex-col items-center justify-center">
              <div className="text-sm text-gray-500 mb-1">Genel Seviye</div>
              <div className="text-2xl sm:text-3xl font-semibold text-gray-900">{displayLevel(data.level)}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 sm:px-6 sm:py-4 h-full mb-6">
            <div className="h-full flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Okuma Puanı</h2>
                <p className="text-sm text-gray-600 mt-1">
                  ({examData.filter(r => r.result === "Doğru").length} / {examData.length} doğru)
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="text-3xl sm:text-4xl font-bold text-red-600">{data.reading.score}</div>
                  {displayLevel(data.level) && (
                    <span className="text-base sm:text-lg font-semibold text-gray-700"> / {displayLevel(data.level)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        <Card className="overflow-hidden rounded-lg border border-gray-200">
          <CardContent className="p-0">
            {/* Mobile Card Layout */}
            <div className="block sm:hidden">
              {examData.map((item, index: number) => (
                <div
                  key={item.no}
                  className={`p-4 border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Soru {item.no}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.result === "Doğru"
                        ? "bg-green-100 text-green-800"
                        : item.result === "Yanlış"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                    }`}>
                      {item.result}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[90px]">Cevabınız:</span>
                      <span className="text-xs text-gray-700 break-words">{item.userAnswer}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 min-w-[90px]">Doğru Cevap:</span>
                      <span className="text-xs text-gray-800 font-medium break-words">{item.correctAnswer}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[500px]">
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
    const rawAiFeedback =
      writing.aiFeedback ??
      (writing as any).ai_feedback ??
      (writing as any).feedback ??
      (writing as any).assessment ??
      null;
    const aiFeedback =
      rawAiFeedback && typeof rawAiFeedback === "object"
        ? (rawAiFeedback as any).aiFeedback ??
          (rawAiFeedback as any).ai_feedback ??
          (rawAiFeedback as any).feedback ??
          (rawAiFeedback as any).assessment ??
          rawAiFeedback
        : rawAiFeedback;
    
    // Local helper to remove bullet / box symbols from text for writing feedback
    const cleanBullets = (text: string): string => {
      if (!text) return text;

      // Remove common bullet-like characters ANYWHERE in the text first (ensures the specific "" never shows)
      const stripAnywhere = text.replace(/[•●▪■□▢◦‣∙⋅·\u2022\u25CF\u2219\u2023\u25E6\u00B7\uF0B7]/g, "");

      // Split by lines and also remove bullets from the start of each line
      return stripAnywhere
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

    // Remove raw AI metadata blocks from general feedback text
    const sanitizeGeneralFeedback = (text: string): string => {
      if (!text) return text;
      return cleanBullets(
        text
          .replace(/\[[^\]]+\]/g, " ")
          .replace(/GENEL PUAN\s*:[^\n\r]*/gi, " ")
          .replace(/BELİRLENEN SEVİYE\s*:[^\n\r]*/gi, " ")
          .replace(/AI GERİ BİLDİRİMİ\s*\(EĞİTMEN NOTU\)\s*:/gi, " ")
          .replace(/GENEL DEĞERLENDİRME\s*:/gi, " ")
      );
    };

    const pickFirstText = (...values: any[]): string | undefined => {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
      return undefined;
    };

    const extractSectionNarrative = (section: any): string | undefined => {
      if (!section || typeof section !== "object") return undefined;
      return pickFirstText(
        section.degerlendirme,
        section["değerlendirme"],
        section.feedback,
        section.yorum,
        section.text,
        section.analysis
      );
    };

    const extractCriteriaValue = (sources: any[], keys: string[]): string | undefined => {
      for (const source of sources) {
        if (!source || typeof source !== "object") continue;
        for (const key of keys) {
          const candidate = source[key];
          if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
          }
        }
      }
      return undefined;
    };
    
    // Debug: Log the writing data structure
    console.log("Writing data structure:", {
      hasAnswers: !!writing?.answers,
      answersLength: writing?.answers?.length || 0,
      hasSections: !!writing?.sections,
      sectionsLength: writing?.sections?.length || 0,
      aiFeedbackType: typeof aiFeedback,
      aiFeedback: aiFeedback,
      writing: writing
    });
    
    // Helper function to extract feedback sections from string
    const extractFeedbackSection = (feedbackText: string | undefined, sectionName: string): string => {
      if (!feedbackText || typeof feedbackText !== 'string') {
        return `Geri bildirim mevcut değil`;
      }
      
      // Try to extract specific section from the feedback string
      const sectionPatterns: Record<string, RegExp> = {
        'part1_1': /\[GÖREV 1\.1 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[GÖREV 1\.2|\[BÖLÜM 2|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'part1_2': /\[GÖREV 1\.2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[BÖLÜM 2|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'part2': /\[BÖLÜM 2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'general': /GENEL DEĞERLENDİRME:([\s\S]*?)(?=$)/i
      };
      
      const pattern = sectionPatterns[sectionName];
      if (pattern) {
        const match = feedbackText.match(pattern);
        if (match && match[1]) {
          if (sectionName === "general") {
            return sanitizeGeneralFeedback(match[1].trim());
          }
          return match[1].trim();
        }
      }
      
      // If no specific section found, return the full feedback for general or fallback
      if (sectionName === 'general') {
        return sanitizeGeneralFeedback(feedbackText);
      }
      if (sectionName === 'taskAchievement') {
        return feedbackText;
      }
      
      return `Geri bildirim mevcut değil`;
    };

    // Extract scores from AI feedback or use defaults
    const extractScoreFromFeedback = (feedbackText: string | undefined) => {
      if (!feedbackText) return 0;
      if (typeof feedbackText === 'string') {
        const match = feedbackText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
      }
      return 0;
    };
    
    // Helper to extract specific feedback text from string format
    const getFeedbackText = (key: string): string => {
      if (typeof aiFeedback === 'string') {
        // Try to extract from the string format
        const patterns: Record<string, RegExp> = {
          'coherenceAndCohesion': /Tutarlılık(?:\s*ve\s*Bağlılık)?[:\s]*([^\n\r•]*)/i,
          'grammaticalRangeAndAccuracy': /Dil Bilgisi[:\s]*([^\n\r•]*)/i,
          'lexicalResource': /Kelime Kaynağı[:\s]*([^\n\r•]*)/i,
          'taskAchievement': /(?:Görev Başarısı|Görev Yanıtı)[:\s]*([^\n\r•]*)/i,
        };
        const pattern = patterns[key];
        if (pattern) {
          const match = aiFeedback.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
        // If not found, avoid dumping raw full feedback into criterion cards
        return '';
      } else if (aiFeedback && typeof aiFeedback === 'object') {
        return aiFeedback[key] || '';
      }
      return '';
    };

    // Parse AI feedback string to extract sections (similar to WritingTestResults)
    const parseAIFeedback = () => {
      if (!aiFeedback) return null;

      // If feedback is an object, normalize common backend shapes
      if (typeof aiFeedback === 'object' && aiFeedback !== null) {
        const feedbackObj: any = aiFeedback;
        const bolumler =
          feedbackObj?.bolumler ??
          feedbackObj?.["bölümler"] ??
          feedbackObj?.sections ??
          feedbackObj?.parts ??
          {};

        const bolum11 =
          bolumler?.bolum_1_1 ??
          bolumler?.["bölüm_1_1"] ??
          feedbackObj?.bolum_1_1 ??
          feedbackObj?.["bölüm_1_1"];
        const bolum12 =
          bolumler?.bolum_1_2 ??
          bolumler?.["bölüm_1_2"] ??
          feedbackObj?.bolum_1_2 ??
          feedbackObj?.["bölüm_1_2"];
        const bolum2 =
          bolumler?.bolum_2 ??
          bolumler?.["bölüm_2"] ??
          feedbackObj?.bolum_2 ??
          feedbackObj?.["bölüm_2"];

        const criteriaSources = [
          feedbackObj?.kriterler,
          feedbackObj?.criteria,
          bolum2?.kriterler,
          bolum2?.criteria,
          bolum12?.kriterler,
          bolum12?.criteria,
          bolum11?.kriterler,
          bolum11?.criteria,
        ];

        return {
          ...feedbackObj,
          part1_1: pickFirstText(
            feedbackObj?.part1_1,
            feedbackObj?.part1,
            extractSectionNarrative(bolum11)
          ),
          part1_2: pickFirstText(
            feedbackObj?.part1_2,
            extractSectionNarrative(bolum12)
          ),
          part2: pickFirstText(
            feedbackObj?.part2,
            feedbackObj?.part_2,
            extractSectionNarrative(bolum2)
          ),
          general: pickFirstText(
            feedbackObj?.general,
            feedbackObj?.generalFeedback,
            feedbackObj?.genel_degerlendirme,
            feedbackObj?.genelDegerlendirme,
            feedbackObj?.egitmen_notu,
            feedbackObj?.egitmenNotu,
            feedbackObj?.teacher_note,
            feedbackObj?.teacherNote,
            feedbackObj?.summary
          ),
          coherenceAndCohesion: pickFirstText(
            feedbackObj?.coherenceAndCohesion,
            extractCriteriaValue(criteriaSources, [
              "coherenceAndCohesion",
              "coherence_and_cohesion",
              "tutarlilikVeBaglilik",
              "tutarlilik_ve_baglilik",
              "Tutarlılık ve Bağlılık",
              "Tutarlılık"
            ])
          ),
          grammaticalRangeAndAccuracy: pickFirstText(
            feedbackObj?.grammaticalRangeAndAccuracy,
            extractCriteriaValue(criteriaSources, [
              "grammaticalRangeAndAccuracy",
              "grammatical_range_and_accuracy",
              "dilBilgisi",
              "dil_bilgisi",
              "Dil Bilgisi"
            ])
          ),
          lexicalResource: pickFirstText(
            feedbackObj?.lexicalResource,
            extractCriteriaValue(criteriaSources, [
              "lexicalResource",
              "lexical_resource",
              "kelimeKaynagi",
              "kelime_kaynagi",
              "Kelime Kaynağı"
            ])
          ),
          taskAchievement: pickFirstText(
            feedbackObj?.taskAchievement,
            extractCriteriaValue(criteriaSources, [
              "taskAchievement",
              "task_achievement",
              "gorevBasarisi",
              "gorev_basarisi",
              "gorevYaniti",
              "gorev_yaniti",
              "Görev Başarısı",
              "Görev Yanıtı"
            ])
          ),
        };
      }

      // If feedback is a string, parse it
      if (typeof aiFeedback === 'string') {
        const parsed: any = {};

        // Extract GÖREV 1.1 section
        const task1_1Match = aiFeedback.match(/\[GÖREV 1\.1 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[GÖREV 1\.2|\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i);
        if (task1_1Match) {
          parsed.part1_1 = cleanBullets(task1_1Match[1].trim());
        }

        // Extract GÖREV 1.2 section
        const task1_2Match = aiFeedback.match(/\[GÖREV 1\.2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=\[BÖLÜM 2|AI GERİ BİLDİRİMİ|$)/i);
        if (task1_2Match) {
          parsed.part1_2 = cleanBullets(task1_2Match[1].trim());
        }

        // Extract BÖLÜM 2 section
        const part2Match = aiFeedback.match(/\[BÖLÜM 2 DEĞERLENDİRMESİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i);
        if (part2Match) {
          parsed.part2 = cleanBullets(part2Match[1].trim());
        }

        // Extract AI GERİ BİLDİRİMİ (EĞİTMEN NOTU) section
        const generalMatch = aiFeedback.match(/AI GERİ BİLDİRİMİ \(EĞİTMEN NOTU\):([\s\S]*?)(?=$)/i);
        if (generalMatch) {
          parsed.general = cleanBullets(generalMatch[1].trim());
        }

        // Extract individual criteria from each section
        const extractCriteria = (text: string) => {
          const criteria: any = {};
          
          // Extract Tutarlılık ve Bağlılık
          const coherenceMatch = text.match(/Tutarlılık(?:\s*ve\s*Bağlılık)?[:\s]*([^\n\r•]*)/i);
          if (coherenceMatch) {
            criteria.coherenceAndCohesion = coherenceMatch[1].trim();
          }
          
          // Extract Dil Bilgisi
          const grammarMatch = text.match(/Dil Bilgisi[:\s]*([^\n\r•]*)/i);
          if (grammarMatch) {
            criteria.grammaticalRangeAndAccuracy = grammarMatch[1].trim();
          }
          
          // Extract Kelime Kaynağı
          const lexicalMatch = text.match(/Kelime Kaynağı[:\s]*([^\n\r•]*)/i);
          if (lexicalMatch) {
            criteria.lexicalResource = lexicalMatch[1].trim();
          }
          
          // Extract Görev Başarısı
          const taskMatch = text.match(/(?:Görev Başarısı|Görev Yanıtı)[:\s]*([^\n\r•]*)/i);
          if (taskMatch) {
            criteria.taskAchievement = taskMatch[1].trim();
          }
          
          return criteria;
        };

        // Extract criteria from the full feedback text
        const allCriteria = extractCriteria(aiFeedback);
        Object.assign(parsed, allCriteria);

        return parsed;
      }

      return null;
    };

    const parsedFeedback = parseAIFeedback();

    const isPlaceholderText = (value?: string) => {
      if (!value || typeof value !== "string") return true;
      const normalized = value
        .trim()
        .toLowerCase()
        .replace(/\./g, "");
      return (
        normalized === "yanit yok" ||
        normalized === "yanıt yok" ||
        normalized === "degerlendirme yok" ||
        normalized === "değerlendirme yok" ||
        normalized === "yok" ||
        normalized === "-"
      );
    };

    const pickMeaningfulText = (...values: any[]): string | undefined => {
      for (const value of values) {
        if (typeof value === "string" && value.trim() && !isPlaceholderText(value)) {
          return value.trim();
        }
      }
      return undefined;
    };

    const extractCriteriaFromNarrative = (text?: string) => {
      if (!text || typeof text !== "string") return {};
      const source = cleanBullets(text);

      return {
        coherence: pickMeaningfulText(
          source.match(/Tutarlılık(?:\s*ve\s*Bağlılık)?[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/Tutarlilik(?:\s*ve\s*Baglilik)?[:\s-]*([^\n\r]+)/i)?.[1]
        ),
        grammar: pickMeaningfulText(
          source.match(/Dil Bilgisi[:\s-]*([^\n\r]+)/i)?.[1]
        ),
        lexical: pickMeaningfulText(
          source.match(/Kelime Kaynağı[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/Kelime Kaynagi[:\s-]*([^\n\r]+)/i)?.[1]
        ),
        achievement: pickMeaningfulText(
          source.match(/(?:Görev Başarısı|Görev Yanıtı)[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/(?:Gorev Basarisi|Gorev Yaniti)[:\s-]*([^\n\r]+)/i)?.[1]
        ),
      };
    };

    const extractCriteriaFromGeneralFeedback = (text?: string) => {
      if (!text || typeof text !== "string") return {};
      const sentences = cleanBullets(text)
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const pickSentence = (patterns: RegExp[]) =>
        pickMeaningfulText(
          ...sentences.filter((sentence) => patterns.some((pattern) => pattern.test(sentence)))
        );

      return {
        coherence: pickSentence([/tutarl/i, /bağlılık/i, /baglilik/i, /akış/i, /akis/i]),
        grammar: pickSentence([/dil\s*bilg/i, /gramer/i, /cümle/i, /cumle/i]),
        lexical: pickSentence([/kelime/i, /söz varlığı/i, /soz varligi/i, /vocabulary/i]),
        achievement: pickSentence([/görev/i, /gorev/i, /yanıt/i, /yanit/i, /talimat/i, /konu/i, /başarı/i, /basari/i]),
      };
    };

    const getActiveSectionKey = (): "bolum_1_1" | "bolum_1_2" | "bolum_2" =>
      activeTask === "task1"
        ? activeTask1Part === "part1"
          ? "bolum_1_1"
          : "bolum_1_2"
        : "bolum_2";

    const getSectionCriteriaFromObject = (sectionKey: "bolum_1_1" | "bolum_1_2" | "bolum_2") => {
      if (!aiFeedback || typeof aiFeedback !== "object") return {};
      const bolumler = (aiFeedback as any)?.bolumler || (aiFeedback as any)?.["bölümler"];
      const section = bolumler?.[sectionKey] || (aiFeedback as any)?.[sectionKey];
      const criteria = section?.kriterler || section?.criteria || section;

      return {
        coherence: pickMeaningfulText(
          criteria?.coherenceAndCohesion,
          criteria?.coherence_and_cohesion,
          criteria?.tutarlilikVeBaglilik,
          criteria?.tutarlilik_ve_baglilik,
          criteria?.["Tutarlılık ve Bağlılık"],
          criteria?.["Tutarlılık"]
        ),
        grammar: pickMeaningfulText(
          criteria?.grammaticalRangeAndAccuracy,
          criteria?.grammatical_range_and_accuracy,
          criteria?.dilBilgisi,
          criteria?.dil_bilgisi,
          criteria?.["Dil Bilgisi"]
        ),
        lexical: pickMeaningfulText(
          criteria?.lexicalResource,
          criteria?.lexical_resource,
          criteria?.kelimeKaynagi,
          criteria?.kelime_kaynagi,
          criteria?.["Kelime Kaynağı"]
        ),
        achievement: pickMeaningfulText(
          criteria?.taskAchievement,
          criteria?.task_achievement,
          criteria?.gorevBasarisi,
          criteria?.gorev_basarisi,
          criteria?.gorevYaniti,
          criteria?.gorev_yaniti,
          criteria?.["Görev Başarısı"],
          criteria?.["Görev Yanıtı"]
        ),
      };
    };

    const getSectionNarrative = (sectionKey: "bolum_1_1" | "bolum_1_2" | "bolum_2") => {
      if (sectionKey === "bolum_1_1") return parsedFeedback?.part1_1;
      if (sectionKey === "bolum_1_2") return parsedFeedback?.part1_2;
      return parsedFeedback?.part2;
    };

    const activeSectionKey = getActiveSectionKey();
    const criteriaFromObject = getSectionCriteriaFromObject(activeSectionKey);
    const criteriaFromNarrative = extractCriteriaFromNarrative(getSectionNarrative(activeSectionKey));
    const criteriaFromGeneral = extractCriteriaFromGeneralFeedback(
      pickMeaningfulText(parsedFeedback?.general, extractFeedbackSection(aiFeedback, "general"))
    );
    const fallbackGlobalCriteria = {
      coherence: pickMeaningfulText(parsedFeedback?.coherenceAndCohesion, getFeedbackText("coherenceAndCohesion")),
      grammar: pickMeaningfulText(parsedFeedback?.grammaticalRangeAndAccuracy, getFeedbackText("grammaticalRangeAndAccuracy")),
      lexical: pickMeaningfulText(parsedFeedback?.lexicalResource, getFeedbackText("lexicalResource")),
      achievement: pickMeaningfulText(parsedFeedback?.taskAchievement, getFeedbackText("taskAchievement")),
    };
    const activeCriteria = {
      coherence: criteriaFromObject.coherence || criteriaFromNarrative.coherence || fallbackGlobalCriteria.coherence || criteriaFromGeneral.coherence || "Kısa değerlendirme yok",
      grammar: criteriaFromObject.grammar || criteriaFromNarrative.grammar || fallbackGlobalCriteria.grammar || criteriaFromGeneral.grammar || "Kısa değerlendirme yok",
      lexical: criteriaFromObject.lexical || criteriaFromNarrative.lexical || fallbackGlobalCriteria.lexical || criteriaFromGeneral.lexical || "Kısa değerlendirme yok",
      achievement: criteriaFromObject.achievement || criteriaFromNarrative.achievement || fallbackGlobalCriteria.achievement || criteriaFromGeneral.achievement || "Kısa değerlendirme yok",
    };

    const scores = {
      overall: writing?.score || 0,
      part1: 0,
      part2: 0,
      coherence: extractScoreFromFeedback(getFeedbackText('coherenceAndCohesion')) || 0,
      grammar: extractScoreFromFeedback(getFeedbackText('grammaticalRangeAndAccuracy')) || 0,
      lexical: extractScoreFromFeedback(getFeedbackText('lexicalResource')) || 0,
      achievement: extractScoreFromFeedback(getFeedbackText('taskAchievement')) || 0,
    };

    // Prefer score-derived writing level to avoid mixed/overall-level mismatches in this tab
    const level = levelFrom75(writing?.score) || displayLevel(data?.level);
    console.log('Using level from data:', level);

    // Extract answers from either answers array or sections structure
    const extractWritingAnswers = () => {
      const sections = Array.isArray(writing?.sections) ? writing.sections : [];
      const hasSectionAnswers = sections.some(
        (s: any) =>
          (Array.isArray(s.subParts) && s.subParts.some((sp: any) => Array.isArray(sp.answers) && sp.answers.length > 0)) ||
          (Array.isArray(s.answers) && s.answers.length > 0)
      );

      if (sections.length > 0 && hasSectionAnswers) {
        const extracted: any[] = [];
        const sortedSections = [...sections].sort((a: any, b: any) =>
          (a.order ?? a.number ?? 0) - (b.order ?? b.number ?? 0)
        );

        sortedSections.forEach((section: any, sectionIndex: number) => {
          const subParts = Array.isArray(section.subParts) ? section.subParts : [];
          const sortedSubParts = [...subParts].sort((a: any, b: any) =>
            (a.order ?? a.number ?? 0) - (b.order ?? b.number ?? 0)
          );

          sortedSubParts.forEach((subPart: any, subPartIndex: number) => {
            const subPartAnswers = Array.isArray(subPart.answers) ? subPart.answers : [];
            subPartAnswers.forEach((ans: any) => {
              extracted.push({
                ...ans,
                questionText:
                  ans.questionText ||
                  ans.question ||
                  subPart.description ||
                  section.description ||
                  `Görev 1.${subPartIndex + 1}`,
              });
            });
          });

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
      }

      if (writing?.answers && Array.isArray(writing.answers) && writing.answers.length > 0) {
        console.log("Using answers array from writing data:", writing.answers);
        return writing.answers;
      }

      return [];
    };

    const answers = extractWritingAnswers();
    
    console.log("OverallResults - Writing data:", writing);
    console.log("OverallResults - All answers:", answers);
    
    // Separate Task 1 and Task 2 answers
    // Task 1 typically has 2 subparts (1.1 and 1.2), Task 2 has 1 answer
    const task1Answers = answers.filter((_: any, index: number) => index < 2);
    const task2Answers = answers.filter((_: any, index: number) => index >= 2);

    const hasMeaningfulAnswer = (answer?: any) => {
      if (!answer || typeof answer !== "object") return false;
      const value = typeof answer.userAnswer === "string" ? answer.userAnswer.trim() : "";
      return value.length > 0 && value !== "Cevap verilmedi";
    };

    const answeredTask11 = hasMeaningfulAnswer(task1Answers[0]);
    const answeredTask12 = hasMeaningfulAnswer(task1Answers[1]);
    const answeredTask2 = task2Answers.some((a: any) => hasMeaningfulAnswer(a));
    const answeredTaskCount = [answeredTask11, answeredTask12, answeredTask2].filter(Boolean).length;

    const sanitizeWritingGeneralFeedback = (rawText: string) => {
      if (!rawText || typeof rawText !== "string") return "";
      let text = cleanBullets(rawText);

      if (answeredTaskCount >= 3) {
        text = text
          .replace(/Üçüncü bölümde[^.?!]*[.?!]?\s*/gi, " ")
          .replace(/3\.\s*bölümde[^.?!]*[.?!]?\s*/gi, " ")
          .replace(/üçüncü görevde[^.?!]*[.?!]?\s*/gi, " ")
          .replace(/3\.\s*görevde[^.?!]*[.?!]?\s*/gi, " ");
      }

      if (answeredTaskCount >= 3) {
        text = text
          .replace(/\bverilen iki bölümde\b/gi, "verilen üç görevde")
          .replace(/\biki bölümde\b/gi, "üç görevde");
      }

      if (level) {
        const levelUpper = level.toUpperCase();
        const mentionedLevels = (text.match(/\b(?:A1|A2|B1|B2|C1|C2)\b/gi) || []).map((l) => l.toUpperCase());
        const isCompatible = mentionedLevels.some((l) => levelUpper.includes(l));
        if (!isCompatible && mentionedLevels.length > 0) {
          text = text
            .replace(/\b(?:A1|A2|B1|B2|C1|C2)\s*(?:ile|ve|-)\s*(?:A1|A2|B1|B2|C1|C2)\s*arasında\b/gi, level)
            .replace(/\b(?:A1|A2|B1|B2|C1|C2)\s*düzey(?:inde|i)?\b/gi, `${level} düzeyinde`);
        }
      }

      return text.replace(/\s{2,}/g, " ").trim();
    };
    
    console.log("OverallResults - Task 1 answers:", task1Answers);
    console.log("OverallResults - Task 2 answers:", task2Answers);

    // Get current question and answer based on active task
    const getCurrentQuestionAndAnswer = () => {
      if (activeTask === "task1") {
        const answerIndex = activeTask1Part === "part1" ? 0 : 1;
        const currentAnswer = task1Answers[answerIndex];
        const userAnswer = currentAnswer?.userAnswer;
        console.log("OverallResults - Task 1 answer:", currentAnswer, "userAnswer:", userAnswer);

        // Get feedback for the specific part
        const feedbackKey = activeTask1Part === "part1" ? "part1_1" : "part1_2";
        let feedback: string;

        // Use parsed feedback if available, otherwise fall back to original logic
        if (parsedFeedback?.[feedbackKey]) {
          feedback = parsedFeedback[feedbackKey];
        } else if (typeof aiFeedback === 'string') {
          feedback = extractFeedbackSection(aiFeedback, feedbackKey);
        } else if (aiFeedback && typeof aiFeedback === 'object') {
          feedback = aiFeedback[feedbackKey] ||
                    aiFeedback?.taskAchievement ||
                    `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1.1" : "Bölüm 1.2"} geri bildirimi burada gösterilecek`;
        } else {
          feedback = `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1.1" : "Bölüm 1.2"} geri bildirimi burada gösterilecek`;
        }

        // Get description for 1.1 and 1.2
        const description = (currentAnswer as any)?.section?.description;

        return {
          question: (currentAnswer as any)?.questionText || `Görev 1 ${activeTask1Part === "part1" ? "Bölüm 1.1" : "Bölüm 1.2"} Sorusu`,
          answer: (userAnswer && typeof userAnswer === 'string' && userAnswer.trim() !== "") ? userAnswer : "Cevap verilmedi",
          comment: feedback,
          description: description
        };
      } else {
        // Find the Task 2 answer that has a non-empty userAnswer
        const task2AnswerWithContent = task2Answers.find((ans: any) => 
          ans?.userAnswer && typeof ans.userAnswer === 'string' && ans.userAnswer.trim() !== ""
        ) || task2Answers[0]; // Fallback to first if none found
        
        const userAnswer = task2AnswerWithContent?.userAnswer;
        console.log("OverallResults - Task 2 answers:", task2Answers);
        console.log("OverallResults - Task 2 answer with content:", task2AnswerWithContent, "userAnswer:", userAnswer);
        
        // Get feedback for Task 2
        let feedback: string;
        
        // Use parsed feedback if available, otherwise fall back to original logic
        if (parsedFeedback?.part2) {
          feedback = parsedFeedback.part2;
        } else if (typeof aiFeedback === 'string') {
          feedback = extractFeedbackSection(aiFeedback, 'part2');
        } else if (aiFeedback && typeof aiFeedback === 'object') {
          feedback = aiFeedback?.part2 || 
                    aiFeedback?.taskAchievement || 
                    "Görev 2 geri bildirimi burada gösterilecek";
        } else {
          feedback = "Görev 2 geri bildirimi burada gösterilecek";
        }
        
        return {
          question: (task2AnswerWithContent as any)?.questionText || "Görev 2 Sorusu",
          answer: (userAnswer && typeof userAnswer === 'string' && userAnswer.trim() !== "") ? userAnswer : "Cevap verilmedi",
          comment: feedback,
          description: null
        };
      }
    };

    const currentData = getCurrentQuestionAndAnswer();
    const activeWritingLabel =
      activeTask === "task1"
        ? `Görev 1.${activeTask1Part === "part1" ? "1" : "2"}`
        : "Görev 2";

    return (
      <div className="w-full">
        <div className="w-full">
          {/* Header Section */}
          <div className="mb-8">
            {/* Overall Score Card */}
            {isMultiTest && level ? (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_145px] items-stretch gap-4 mb-8">
                <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 h-full">
                  <div className="h-full flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Genel Puan</h2>
                      <p className="text-sm sm:text-base text-gray-600">Yazma testi performansınız</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Puan</div>
                      <div className="text-3xl sm:text-4xl font-bold text-red-600">{scores.overall}</div>
                    </div>
                  </div>
                </div>
                  <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 h-full flex flex-col items-center justify-center">
                  <div className="text-sm text-gray-500 mb-1">Genel Seviye</div>
                  <div className="text-2xl sm:text-3xl font-semibold text-gray-900">{level}</div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 h-full mb-8">
                <div className="h-full flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Genel Puan</h2>
                    <p className="text-sm sm:text-base text-gray-600">Yazma testi performansınız</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl sm:text-4xl font-bold text-red-600">{scores.overall}</div>
                      {level && <span className="text-base sm:text-lg font-semibold text-gray-700"> / {level}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Task Navigation - Simplified Design */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4 sm:mb-6">
              Yazma Görevleri
            </h3>

          {/* All Tasks - Mobile friendly layout */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Task 1.1 */}
            <Button
              onClick={() => {
                setActiveTask("task1");
                setActiveTask1Part("part1");
              }}
              variant="outline"
              className={`h-14 sm:h-16 w-full rounded-lg font-medium transition-all ${
                activeTask === "task1" && activeTask1Part === "part1"
                  ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
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
              className={`h-14 sm:h-16 w-full rounded-lg font-medium transition-all ${
                activeTask === "task1" && activeTask1Part === "part2"
                  ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Görev 1.2</div>
                <div className="text-xs opacity-75">Bölüm 1</div>
              </div>
            </Button>

            {/* Task 2 */}
            <Button
              onClick={() => setActiveTask("task2")}
              variant="outline"
              className={`h-14 sm:h-16 w-full rounded-lg font-medium transition-all ${
                activeTask === "task2"
                  ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
              }`}
            >
              <div className="text-center">
                <div className="font-semibold">Görev 2</div>
                <div className="text-xs opacity-75">Bölüm 2</div>
              </div>
            </Button>
          </div>
          </div>

          {/* Yazma Kriterleri - Konuşma düzenine benzer, yazmaya özel */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900">
                {activeWritingLabel}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Tutarlılık ve Bağlılık</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {cleanBullets(activeCriteria.coherence)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Dil Bilgisi</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {cleanBullets(activeCriteria.grammar)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Kelime Kaynağı</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {cleanBullets(activeCriteria.lexical)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Görev Başarısı</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {cleanBullets(activeCriteria.achievement)}
                </div>
              </div>
            </div>
          </div>

          {/* Content Sections - Simplified */}
          <div className="space-y-6">
            {/* Question Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Soru</h2>
              <div className="space-y-4">
                {/* Render description above question text for 1.1 and 1.2 */}
                {currentData.description && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-800 mb-2">Görev Açıklaması:</h4>
                    <p className="text-gray-700 whitespace-pre-line">{currentData.description}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 leading-relaxed">{currentData.question}</p>
                </div>
              </div>
            </div>

            {/* Answer Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Cevabınız</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.answer}</p>
              </div>
            </div>

            {/* GENEL DEĞERLENDİRME Section */}
            {(() => {
              const rawGeneralFeedback = parsedFeedback?.general || extractFeedbackSection(aiFeedback, "general");
              const generalFeedback = sanitizeWritingGeneralFeedback(rawGeneralFeedback);
              if (!generalFeedback) return null;

              return (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Genel Değerlendirme</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{generalFeedback}</p>
                  </div>
                </div>
              );
            })()}
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
    
    // Debug: Log the speaking data structure
    console.log("Speaking data structure:", {
      hasAnswers: !!speaking?.answers,
      answersLength: speaking?.answers?.length || 0,
      hasParts: !!speaking?.parts,
      partsLength: speaking?.parts?.length || 0,
      hasPart1: !!speaking?.part1,
      hasPart2: !!speaking?.part2,
      hasPart3: !!speaking?.part3,
      part1Sections: speaking?.part1?.sections?.length || 0,
      aiFeedbackType: typeof aiFeedback,
      speaking: speaking
    });
    
    // Helper function to remove bullet symbols from text
    const removeBullets = (text: string): string => {
      if (!text) return text;
      // Remove bullet symbols (•, , etc.) and clean up whitespace
      return text
        .replace(/[•\u2022\u25E6\uF0B7]/g, '') // Remove various bullet symbols
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();
    };

    // Remove raw AI metadata blocks from general feedback text
    const sanitizeGeneralFeedback = (text: string): string => {
      if (!text) return text;
      return removeBullets(
        text
          .replace(/\[[^\]]+\]/g, " ")
          .replace(/GENEL PUAN\s*:[^\n\r]*/gi, " ")
          .replace(/BELİRLENEN SEVİYE\s*:[^\n\r]*/gi, " ")
          .replace(/AI GERİ BİLDİRİMİ\s*\(EĞİTMEN NOTU\)\s*:/gi, " ")
          .replace(/GENEL DEĞERLENDİRME\s*:/gi, " ")
      );
    };
    
    // Helper function to extract feedback sections from string format
    const extractFeedbackSection = (feedbackText: string | undefined, sectionName: string): string => {
      if (!feedbackText || typeof feedbackText !== 'string') {
        return `Geri bildirim mevcut değil`;
      }
      
      // Try to extract specific section from the feedback string
      const sectionPatterns: Record<string, RegExp> = {
        'part1': /\[BÖLÜM 1 ANALİZİ\]([\s\S]*?)(?=\[BÖLÜM 2|\[BÖLÜM 3|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'part2': /\[BÖLÜM 2 ANALİZİ\]([\s\S]*?)(?=\[BÖLÜM 3|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'part3': /\[BÖLÜM 3 ANALİZİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        'general': /GENEL DEĞERLENDİRME:([\s\S]*?)(?=$)/i
      };
      
      const pattern = sectionPatterns[sectionName];
      if (pattern) {
        const match = feedbackText.match(pattern);
        if (match && match[1]) {
          if (sectionName === "general") {
            return sanitizeGeneralFeedback(match[1].trim());
          }
          return removeBullets(match[1].trim());
        }
      }
      
      // If no specific section found, return the full feedback for general or fallback
      if (sectionName === 'general') {
        return sanitizeGeneralFeedback(feedbackText);
      }
      if (sectionName === 'taskAchievement') {
        return removeBullets(feedbackText);
      }
      
      return `Geri bildirim mevcut değil`;
    };

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

    // Use level from overall data
    const level = displayLevel(data?.level);

    // Extract answers from either answers array or parts structure
    const extractAnswers = () => {
      // First try to use the answers array if it exists
      if (speaking?.answers && Array.isArray(speaking.answers) && speaking.answers.length > 0) {
        console.log("Using answers array from speaking data:", speaking.answers);
        return speaking.answers;
      }
      
      const extractedAnswers: Array<{ questionId: string; questionText: string; userAnswer: string }> = [];
      
      // Helper function to extract from a part structure
      const extractFromPart = (part: any) => {
        if (!part) return;
        
        // Handle parts with sections that have subParts (like Part 1)
        if (part.sections && Array.isArray(part.sections)) {
          part.sections.forEach((section: any) => {
            if (section.subParts && Array.isArray(section.subParts)) {
              section.subParts.forEach((subPart: any) => {
                if (subPart.questions && Array.isArray(subPart.questions)) {
                  subPart.questions.forEach((q: any) => {
                    if (q.userAnswer && typeof q.userAnswer === 'string' && q.userAnswer.trim() !== '') {
                      extractedAnswers.push({
                        questionId: q.questionId || q.id || '',
                        questionText: q.questionText || q.question || `Soru ${extractedAnswers.length + 1}`,
                        userAnswer: q.userAnswer
                      });
                    }
                  });
                }
              });
            }
            // Handle sections with direct questions (no subParts)
            else if (section.questions && Array.isArray(section.questions)) {
              section.questions.forEach((q: any) => {
                if (q.userAnswer && typeof q.userAnswer === 'string' && q.userAnswer.trim() !== '') {
                  extractedAnswers.push({
                    questionId: q.questionId || q.id || '',
                    questionText: q.questionText || q.question || `Soru ${extractedAnswers.length + 1}`,
                    userAnswer: q.userAnswer
                  });
                }
              });
            }
          });
        }
        // Handle parts with direct subParts (no sections wrapper)
        else if (part.subParts && Array.isArray(part.subParts)) {
          part.subParts.forEach((subPart: any) => {
            if (subPart.questions && Array.isArray(subPart.questions)) {
              subPart.questions.forEach((q: any) => {
                if (q.userAnswer && typeof q.userAnswer === 'string' && q.userAnswer.trim() !== '') {
                  extractedAnswers.push({
                    questionId: q.questionId || q.id || '',
                    questionText: q.questionText || q.question || `Soru ${extractedAnswers.length + 1}`,
                    userAnswer: q.userAnswer
                  });
                }
              });
            }
          });
        }
        // Handle parts with direct questions (no subParts, no sections)
        else if (part.questions && Array.isArray(part.questions)) {
          part.questions.forEach((q: any) => {
            if (q.userAnswer && typeof q.userAnswer === 'string' && q.userAnswer.trim() !== '') {
              extractedAnswers.push({
                questionId: q.questionId || q.id || '',
                questionText: q.questionText || q.question || `Soru ${extractedAnswers.length + 1}`,
                userAnswer: q.userAnswer
              });
            }
          });
        }
      };
      
      // Try to extract from part1, part2, part3 structure (new format)
      if (speaking?.part1 || speaking?.part2 || speaking?.part3) {
        console.log("Extracting answers from part1/part2/part3 structure");
        extractFromPart(speaking.part1);
        extractFromPart(speaking.part2);
        extractFromPart(speaking.part3);
        console.log("Extracted answers from part1/part2/part3:", extractedAnswers);
        if (extractedAnswers.length > 0) return extractedAnswers;
      }
      
      // If not, try to extract from parts array structure (old format)
      if (speaking?.parts && Array.isArray(speaking.parts)) {
        console.log("Extracting answers from parts array structure:", speaking.parts);
        speaking.parts.forEach((part: any) => {
          extractFromPart(part);
        });
        console.log("Extracted answers from parts array:", extractedAnswers);
        if (extractedAnswers.length > 0) return extractedAnswers;
      }
      
      console.log("No answers found in speaking data");
      return [];
    };
    
    const answers = extractAnswers();
    
    // Organize answers by parts: Part 1.1, Part 1.2, Part 2, Part 3
    const organizeAnswersByParts = () => {
      if (answers.length === 0) return [[], [], [], []];

      const totalQuestions = answers.length;
      const part1_1Count = 3; // Fixed 3 questions for Part 1.1
      const part1_2Count = 3; // Fixed 3 questions for Part 1.2
      const part1TotalCount = part1_1Count + part1_2Count; // 6 for Part 1
      const part2Count = Math.ceil(Math.max(0, totalQuestions - part1TotalCount) * 0.6); // Remaining for Part 2
      // Rest goes to Part 3

      const part1_1 = answers.slice(0, part1_1Count);
      const part1_2 = Array(part1_2Count).fill({}).map((_, i) => {
        const index = part1_1Count + i;
        return answers[index] || { questionText: `Soru ${i + 1}`, userAnswer: "Cevap verilmedi", questionId: `dummy-${i}` };
      });
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
        
        // Map part index to feedback key
        // Code organizes into: part1_1 (index 0), part1_2 (index 1), part2 (index 2), part3 (index 3)
        // Feedback string has: [BÖLÜM 1 ANALİZİ], [BÖLÜM 2 ANALİZİ], [BÖLÜM 3 ANALİZİ]
        // Map: part1_1 (index 0) -> part1, part1_2 (index 1) -> part1 (both use BÖLÜM 1), 
        //      part2 (index 2) -> part2, part3 (index 3) -> part3
        let feedbackKey: string;
        if (activeSpeakingPart === 0 || activeSpeakingPart === 1) {
          // Both Part 1.1 and Part 1.2 use BÖLÜM 1 feedback
          feedbackKey = 'part1';
        } else if (activeSpeakingPart === 2) {
          feedbackKey = 'part2';
        } else if (activeSpeakingPart === 3) {
          feedbackKey = 'part3';
        } else {
          feedbackKey = `part${activeSpeakingPart + 1}`;
        }
        
        // Get feedback for the specific part
        let partFeedback: string;
        
        // Handle both string and object formats for aiFeedback
        if (typeof aiFeedback === 'string') {
          const extracted = extractFeedbackSection(aiFeedback, feedbackKey);
          partFeedback = extracted;
        } else if (aiFeedback && typeof aiFeedback === 'object') {
          const rawFeedback = (aiFeedback as any)?.[feedbackKey] || 
                        aiFeedback?.taskAchievement || 
                        `${partLabel.main} geri bildirimi burada gösterilecek`;
          partFeedback = typeof rawFeedback === 'string' ? removeBullets(rawFeedback) : rawFeedback;
        } else {
          partFeedback = `${partLabel.main} geri bildirimi burada gösterilecek`;
        }
        
        return {
          question: currentAnswer?.questionText || `${partLabel.main} Sorusu ${currentQuestionIndex + 1}`,
          answer: (currentAnswer?.userAnswer && typeof currentAnswer.userAnswer === 'string' && currentAnswer.userAnswer.trim() !== "") 
            ? currentAnswer.userAnswer 
            : "Cevap verilmedi",
          comment: partFeedback
        };
      }
      
      // Get default feedback
      let defaultFeedback: string;
      if (typeof aiFeedback === 'string') {
        defaultFeedback = extractFeedbackSection(aiFeedback, 'general');
      } else if (aiFeedback && typeof aiFeedback === 'object') {
        const rawFeedback = (aiFeedback as any)?.part1 || aiFeedback?.taskAchievement || "Geri bildirim mevcut değil";
        defaultFeedback = typeof rawFeedback === 'string' ? removeBullets(rawFeedback) : rawFeedback;
      } else {
        defaultFeedback = "Geri bildirim mevcut değil";
      }
      
      return {
        question: "Soru metni burada gösterilecek",
        answer: "Cevap verilmedi",
        comment: defaultFeedback
      };
    };

    const currentData = getCurrentQuestionAndAnswer();

    return (
      <div className="w-full">
        <div className="w-full">
          {/* Header Section */}
          <div className="mb-8">
            {/* Overall Score Card */}
            {isMultiTest && level ? (
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_145px] items-stretch gap-4 mb-8">
                <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 h-full">
                  <div className="h-full flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Genel Puan</h2>
                      <p className="text-sm sm:text-base text-gray-600">Konuşma testi performansınız</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500 mb-1">Puan</div>
                      <div className="text-3xl sm:text-4xl font-bold text-red-600">{scores.overall}</div>
                    </div>
                  </div>
                </div>
                  <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 h-full flex flex-col items-center justify-center">
                  <div className="text-sm text-gray-500 mb-1">Genel Seviye</div>
                  <div className="text-2xl sm:text-3xl font-semibold text-gray-900">{level}</div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 h-full mb-8">
                <div className="h-full flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Genel Puan</h2>
                    <p className="text-sm sm:text-base text-gray-600">Konuşma testi performansınız</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="text-3xl sm:text-4xl font-bold text-red-600">{scores.overall}</div>
                      {level && <span className="text-base sm:text-lg font-semibold text-gray-700"> / {level}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Part Navigation - Simplified Design */}
          {parts.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4 sm:mb-6">
                Konuşma Bölümleri
              </h3>

              {/* All Parts - 2x2 on mobile, 4 columns on tablet+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
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
                      className={`h-14 sm:h-16 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                        activeSpeakingPart === index
                          ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                          : "bg-white text-gray-700 hover:bg-gray-50 border-gray-300"
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold">{partLabel.main}</div>
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

          {/* Bölüm Bazlı Özet - Ham Puan + 4 Kriter */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900">
                {getPartLabel(activeSpeakingPart).main}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Akıcılık ve Bağlılık</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {typeof aiFeedback === "object" ? (aiFeedback?.coherenceAndCohesion || "Kısa değerlendirme yok") : "Kısa değerlendirme yok"}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Dil Bilgisi</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {typeof aiFeedback === "object" ? (aiFeedback?.grammaticalRangeAndAccuracy || "Kısa değerlendirme yok") : "Kısa değerlendirme yok"}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Kelime Kaynağı</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {typeof aiFeedback === "object" ? (aiFeedback?.lexicalResource || "Kısa değerlendirme yok") : "Kısa değerlendirme yok"}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Görev Yanıtı</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {typeof aiFeedback === "object" ? (aiFeedback?.taskAchievement || "Kısa değerlendirme yok") : "Kısa değerlendirme yok"}
                </div>
              </div>
            </div>
          </div>
          {/* Content Sections - Simplified */}
          <div className="space-y-6">
            {/* Answer Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Cevabınız</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{currentData.answer}</p>
              </div>
            </div>

            {/* GENEL DEĞERLENDİRME Section - Shows general feedback */}
            {(() => {
              const generalFeedback = extractFeedbackSection(aiFeedback, 'general');
              if (!generalFeedback) return null;

              return (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Eğitmen Notu</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{removeBullets(generalFeedback)}</p>
                  </div>
                </div>
              );
            })()}
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
      <>
        {!loading && data && <ConfettiSideCannons key={`confetti-overall-${params.overallId || 'single'}`} />}
        <div className="min-h-screen bg-gray-50 py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with PDF Button */}
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
              {testType === 'listening' && 'Dinleme Testi Sonuçları'}
              {testType === 'reading' && 'Okuma Testi Sonuçları'}
              {testType === 'writing' && 'Yazma Testi Sonuçları'}
              {testType === 'speaking' && 'Konuşma Testi Sonuçları'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {testType === 'listening' && 'Dinleme testi performansınızı inceleyin'}
              {testType === 'reading' && 'Okuma testi performansınızı inceleyin'}
              {testType === 'writing' && 'Yazma testi performansınızı inceleyin'}
              {testType === 'speaking' && 'Konuşma testi performansınızı inceleyin'}
            </p>
            </div>

            {/* PDF Download Button - Top Right */}
            <Button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadingPDF ? "İndiriliyor..." : "PDF İndir"}
            </Button>
          </div>

          {testType === 'listening' && renderListeningResults()}
          {testType === 'reading' && renderReadingResults()}
          {testType === 'writing' && renderWritingResults()}
          {testType === 'speaking' && renderSpeakingResults()}

            <div className="mt-6 sm:mt-8 flex justify-center">
            <Button variant="outline" onClick={() => navigate("/test")} className="w-full sm:w-auto">
              Testlere Dön
            </Button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // If multiple test types are available, show tabs
  return (
    <>
      {!loading && data && <ConfettiSideCannons key={`confetti-overall-${params.overallId || 'multiple'}`} />}
      <div className="min-h-screen bg-gray-50 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with PDF Button */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Genel Test Sonuçları</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Tüm test sonuçlarınızı görüntüleyin</p>
            </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? "İndiriliyor..." : "PDF İndir"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 z-40 bg-gray-50 pb-4">
            <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
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
          </div>

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

        <div className="mt-6 sm:mt-8 flex justify-center">
          <Button variant="outline" onClick={() => navigate("/test")} className="w-full sm:w-auto">
            Testlere Dön
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}





