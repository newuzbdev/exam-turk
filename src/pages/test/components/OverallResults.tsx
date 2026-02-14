import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosPrivate from "@/config/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { overallTestService } from "@/services/overallTest.service";
import { ConfettiSideCannons } from "@/components/ui/confetti-side-cannons";
import { normalizeDisplayText, normalizeFeedbackText } from "@/utils/text";

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

  const normalizeLevelLabel = (value?: string) => {
    if (!value) return value;
    const normalized = value.trim().replace(/\s+/g, " ");
    const upper = normalized.toUpperCase();
    if (
      upper === "A0" ||
      upper === "B1_ALTI" ||
      upper === "B1 ALTI" ||
      /^B1[\s_-]*alt[ıi]$/i.test(normalized) ||
      /^B1\s*alt[ıi](?:\s+alt[ıi])+$/i.test(normalized)
    ) {
      return "B1 altı";
    }
    return normalized;
  };
  const removeLowValueStrengthSentences = (text: string) => {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    if (!source) return "";
    const sentences = source
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    const noisyPatterns = [
      /en az bir (?:karakter|kelime)/i,
      /boş bırakmam(?:ış|is)/i,
      /bos birakmam(?:is|ış)/i,
      /motivasyonunuzun olduğunu göstermektedir/i,
      /motivasyonunuzun oldugunu gostermektedir/i,
      /yazma sürecine başlama motivasyonu/i,
      /yazma surecine baslama motivasyonu/i,
      /tamamen boş bırakmamanız açısından olumlu/i,
      /tamamen bos birakmamaniz acisindan olumlu/i,
    ];
    return sentences
      .filter((sentence) => !noisyPatterns.some((pattern) => pattern.test(sentence)))
      .join(" ")
      .trim();
  };
  const sanitizeNarrativeArtifacts = (text: string) => {
    return removeLowValueStrengthSentences(
      String(text || "")
        .replace(/\bB1\s*alt[ıi]\s+alt[ıi]\b/gi, "B1 altı")
        .replace(/\bB1\s*alti\b/gi, "B1 altı")
        .replace(/\b(A1|A2|B1|B2|C1|C2)\s+\1\b/gi, "$1")
        .replace(/güçlü yönler(?:\s+olarak)?[^.?!]*(?:[.?!]|$)/gi, " ")
        .replace(/guclu yonler(?:\s+olarak)?[^.?!]*(?:[.?!]|$)/gi, " ")
        .replace(/her bir bölüme en az bir (?:karakter|kelime)[^.?!]*(?:[.?!]|$)/gi, " ")
        .replace(/en az bir kelimeyle de olsa[^.?!]*(?:[.?!]|$)/gi, " ")
        .replace(/\s{2,}/g, " ")
        .trim()
    );
  };
  const displayLevel = (level?: string) => {
    return normalizeLevelLabel(level);
  };
  const levelFrom75 = (score?: number | null) => {
    if (typeof score !== "number" || Number.isNaN(score)) return undefined;
    if (score >= 65) return "C1";
    if (score >= 51) return "B2";
    if (score >= 38) return "B1";
    return "B1 altı";
  };
  const wholeScore = (value: unknown): number => {
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : NaN;
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  };
  const parseUserAnswerList = (value?: string): string[] => {
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => String(item ?? "").trim())
            .filter(Boolean);
        }
        if (typeof parsed === "string" && parsed.trim()) {
          return [parsed.trim()];
        }
      } catch {
        // Fallback to raw string handling below.
      }
    }

    return [trimmed];
  };
  const normalizeAnswerList = (values: string[]): string[] =>
    values.map((item) => item.trim().toLowerCase()).filter(Boolean);
  const isExactAnswerSetMatch = (correct: string[], user: string[]) => {
    if (!correct.length || !user.length) return false;
    if (correct.length !== user.length) return false;
    return correct.every((answer) => user.includes(answer)) && user.every((answer) => correct.includes(answer));
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
      const correctNormalized = normalizeAnswerList(correctTexts);
      const userAnswers = parseUserAnswerList(q.userAnswer);
      const userNormalized = normalizeAnswerList(userAnswers);
      const isCorrect = isExactAnswerSetMatch(correctNormalized, userNormalized);
      const userAnswerDisplay = userAnswers.length > 0 ? userAnswers.join(" / ") : "Seçilmedi";
      return {
        no: q.questionNumber || index + 1,
        userAnswer: userAnswerDisplay,
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
          {!isMultiTest && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground ml-2">
              <span>Katılımcı: {data.user.name}</span>
              <span className="text-xs sm:text-sm">Tarih: {new Date(data.listening.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " "}</span>
            </div>
          )}

          {/* Listening Score with Level */}
          {!isMultiTest && (
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
      const correctNormalized = normalizeAnswerList(correctTexts);
      const userAnswers = parseUserAnswerList(q.userAnswer);
      const userNormalized = normalizeAnswerList(userAnswers);
      const isCorrect = isExactAnswerSetMatch(correctNormalized, userNormalized);
      const userAnswerDisplay = userAnswers.length > 0 ? userAnswers.join(" / ") : "Seçilmedi";
      return {
        no: q.questionNumber || index + 1,
        userAnswer: userAnswerDisplay,
        correctAnswer,
        result: isCorrect ? "Doğru" : "Yanlış"
      };
    });

    return (
      <div className="space-y-6">
        {/* Report Info */}
        {!isMultiTest && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-muted-foreground ml-2">
            <span>Katılımcı: {data.user.name}</span>
            <span className="text-xs sm:text-sm">Tarih: {new Date(data.reading.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " "}</span>
          </div>
        )}

        {/* Reading Score with Level */}
        {!isMultiTest && (
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
    
    // Bullet cleanup + Turkish text normalization + repeated sentence dedupe
    const cleanBullets = (text: string): string => {
      if (!text) return "";
      return normalizeFeedbackText(
        text
          .replace(/[•\u2022\u25CF\u25E6\u25A0\u25AA\uF0B7]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      );
    };

    // Remove raw AI metadata blocks from general feedback text
    const sanitizeGeneralFeedback = (text: string): string => {
      if (!text) return text;
      return sanitizeNarrativeArtifacts(cleanBullets(
        text
          .replace(/\[[^\]]+\]/g, " ")
          .replace(/GENEL PUAN\s*:[^\n\r]*/gi, " ")
          .replace(/BELİRLENEN SEVİYE\s*:[^\n\r]*/gi, " ")
          .replace(/AI GERİ BİLDİRİMİ\s*\(EĞİTMEN NOTU\)\s*:/gi, " ")
          .replace(/GENEL DEĞERLENDİRME\s*:/gi, " ")
      ));
    };

    const pickFirstText = (...values: any[]): string | undefined => {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) {
          return normalizeFeedbackText(value.trim());
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
            return normalizeFeedbackText(candidate.trim());
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
          return normalizeFeedbackText(value.trim());
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
    const activeCriteria = {
      coherence: criteriaFromObject.coherence || criteriaFromNarrative.coherence || criteriaFromGeneral.coherence || "Kısa değerlendirme yok",
      grammar: criteriaFromObject.grammar || criteriaFromNarrative.grammar || criteriaFromGeneral.grammar || "Kısa değerlendirme yok",
      lexical: criteriaFromObject.lexical || criteriaFromNarrative.lexical || criteriaFromGeneral.lexical || "Kısa değerlendirme yok",
      achievement: criteriaFromObject.achievement || criteriaFromNarrative.achievement || criteriaFromGeneral.achievement || "Kısa değerlendirme yok",
    };

    const scores = {
      overall: wholeScore(writing?.score),
      part1: 0,
      part2: 0,
      coherence: extractScoreFromFeedback(getFeedbackText('coherenceAndCohesion')) || 0,
      grammar: extractScoreFromFeedback(getFeedbackText('grammaticalRangeAndAccuracy')) || 0,
      lexical: extractScoreFromFeedback(getFeedbackText('lexicalResource')) || 0,
      achievement: extractScoreFromFeedback(getFeedbackText('taskAchievement')) || 0,
    };

    // Prefer score-derived writing level to avoid mixed/overall-level mismatches in this tab
    const level = levelFrom75(scores.overall) || displayLevel(data?.level);
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
    
    type WritingTaskKey = "bolum_1_1" | "bolum_1_2" | "bolum_2";
    const toTaskHint = (value: unknown) =>
      String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const getTaskKeyFromAnswer = (answer: any): WritingTaskKey | null => {
      const hints = [
        answer?.questionText,
        answer?.question,
        answer?.description,
        answer?.subPart?.label,
        answer?.subPart?.description,
        answer?.section?.title,
        answer?.section?.description,
      ]
        .map(toTaskHint)
        .join(" ");

      if (/(^|\s)(1[.,]?\s*1|gorev\s*1[.,]?\s*1|bolum\s*1[.,]?\s*1)(\s|$)/.test(hints)) {
        return "bolum_1_1";
      }
      if (/(^|\s)(1[.,]?\s*2|gorev\s*1[.,]?\s*2|bolum\s*1[.,]?\s*2)(\s|$)/.test(hints)) {
        return "bolum_1_2";
      }
      if (
        /(gorev\s*2|bolum\s*2|tez|antitez|sentez|kompozisyon|blog|essay)/.test(hints)
      ) {
        return "bolum_2";
      }

      return null;
    };

    const getAnswerLength = (answer: any) =>
      typeof answer?.userAnswer === "string" ? answer.userAnswer.trim().length : 0;

    const hasMeaningfulAnswer = (answer?: any) => {
      if (!answer || typeof answer !== "object") return false;
      const value = typeof answer.userAnswer === "string" ? answer.userAnswer.trim() : "";
      return value.length > 0 && value !== "Cevap verilmedi";
    };

    const pickBestAnswer = (group: any[]) =>
      group.find((ans: any) => hasMeaningfulAnswer(ans)) || group[0];

    const groupedAnswers = (() => {
      const groups: Record<WritingTaskKey, any[]> = {
        bolum_1_1: [],
        bolum_1_2: [],
        bolum_2: [],
      };
      const unresolved: any[] = [];

      answers.forEach((answer: any) => {
        const taskKey = getTaskKeyFromAnswer(answer);
        if (taskKey) groups[taskKey].push(answer);
        else unresolved.push(answer);
      });

      if (unresolved.length > 0 && groups.bolum_2.length === 0) {
        const longest = [...unresolved].sort(
          (a, b) => getAnswerLength(b) - getAnswerLength(a)
        )[0];
        if (longest) {
          groups.bolum_2.push(longest);
          unresolved.splice(unresolved.indexOf(longest), 1);
        }
      }

      if (unresolved.length > 0) {
        const sortedByLen = [...unresolved].sort(
          (a, b) => getAnswerLength(a) - getAnswerLength(b)
        );

        if (groups.bolum_1_1.length === 0 && sortedByLen.length > 0) {
          const shortest = sortedByLen.shift();
          if (shortest) groups.bolum_1_1.push(shortest);
        }
        if (groups.bolum_1_2.length === 0 && sortedByLen.length > 0) {
          groups.bolum_1_2.push(sortedByLen[sortedByLen.length - 1]);
        }
      }

      return groups;
    })();

    const task11Answers = groupedAnswers.bolum_1_1;
    const task12Answers = groupedAnswers.bolum_1_2;
    const task1Answers = [pickBestAnswer(task11Answers), pickBestAnswer(task12Answers)];
    const task2Answers = groupedAnswers.bolum_2;

    const answeredTask11 = hasMeaningfulAnswer(task1Answers[0]);
    const answeredTask12 = hasMeaningfulAnswer(task1Answers[1]);
    const answeredTask2 = task2Answers.some((a: any) => hasMeaningfulAnswer(a));
    const answeredTaskCount = [answeredTask11, answeredTask12, answeredTask2].filter(Boolean).length;

    const sanitizeWritingGeneralFeedback = (rawText: string) => {
      if (!rawText || typeof rawText !== "string") return "";
      let text = sanitizeNarrativeArtifacts(cleanBullets(rawText));

      if (answeredTask11) {
        text = text.replace(/(?:bölüm|görev)\s*1[.,]?\s*1(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
      }
      if (answeredTask12) {
        text = text.replace(/(?:bölüm|görev)\s*1[.,]?\s*2(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
      }
      if (answeredTask2) {
        text = text.replace(/(?:bölüm|görev)\s*2(?:'de|'da|de|da)?[^.?!]*(?:yanıt\s*yok|cevap\s*yok|hiç\s*yanıt\s*vermemi\w*|boş\s*bırak\w*|hiç\s*yaz\w*)[^.?!]*[.?!]?\s*/gi, " ");
      }

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

      return sanitizeNarrativeArtifacts(text.replace(/\s{2,}/g, " ").trim());
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
          feedback = aiFeedback?.part2 || "Görev 2 geri bildirimi burada gösterilecek";
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
            {!isMultiTest && (
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
                  <p className="text-gray-700 leading-relaxed">{normalizeDisplayText(currentData.question)}</p>
                </div>
              </div>
            </div>

            {/* Answer Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Cevabınız</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{normalizeDisplayText(currentData.answer)}</p>
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
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{normalizeFeedbackText(generalFeedback)}</p>
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
      return normalizeFeedbackText(text
        .replace(/[•\u2022\u25E6\uF0B7]/g, '') // Remove various bullet symbols
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim());
    };

    // Remove raw AI metadata blocks from general feedback text
    const sanitizeGeneralFeedback = (text: string): string => {
      if (!text) return text;
      return sanitizeNarrativeArtifacts(removeBullets(
        text
          .replace(/\[[^\]]+\]/g, " ")
          .replace(/GENEL PUAN\s*:[^\n\r]*/gi, " ")
          .replace(/BELİRLENEN SEVİYE\s*:[^\n\r]*/gi, " ")
          .replace(/AI GERİ BİLDİRİMİ\s*\(EĞİTMEN NOTU\)\s*:/gi, " ")
          .replace(/GENEL DEĞERLENDİRME\s*:/gi, " ")
      ));
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
      overall: wholeScore(speaking?.score),
      coherence: extractScoreFromFeedback(aiFeedback?.coherenceAndCohesion) || 0,
      grammar: extractScoreFromFeedback(aiFeedback?.grammaticalRangeAndAccuracy) || 0,
      lexical: extractScoreFromFeedback(aiFeedback?.lexicalResource) || 0,
      achievement: extractScoreFromFeedback(aiFeedback?.taskAchievement) || 0,
    };

    // Use level from overall data
    const level = displayLevel(data?.level);

    type SpeakingAnswerItem = {
      questionId: string | null;
      questionText: string;
      userAnswer: string;
    };

    const toAnswerItem = (
      question: any,
      fallbackText: string
    ): SpeakingAnswerItem => ({
      questionId:
        (typeof question?.questionId === "string" && question.questionId) ||
        (typeof question?.id === "string" && question.id) ||
        null,
      questionText:
        (typeof question?.questionText === "string" && question.questionText) ||
        (typeof question?.question === "string" && question.question) ||
        fallbackText,
      userAnswer:
        typeof question?.userAnswer === "string" ? question.userAnswer : "",
    });

    const extractQuestionsFromPart = (part: any): SpeakingAnswerItem[] => {
      const collected: SpeakingAnswerItem[] = [];
      if (!part || typeof part !== "object") return collected;

      const sections = Array.isArray(part.sections) ? part.sections : [];
      sections.forEach((section: any) => {
        const directQuestions = Array.isArray(section?.questions)
          ? section.questions
          : [];
        directQuestions.forEach((q: any) => {
          collected.push(toAnswerItem(q, `Soru ${collected.length + 1}`));
        });

        const subParts = Array.isArray(section?.subParts) ? section.subParts : [];
        subParts.forEach((subPart: any) => {
          const subQuestions = Array.isArray(subPart?.questions)
            ? subPart.questions
            : [];
          subQuestions.forEach((q: any) => {
            collected.push(toAnswerItem(q, `Soru ${collected.length + 1}`));
          });
        });
      });

      const partQuestions = Array.isArray(part.questions) ? part.questions : [];
      partQuestions.forEach((q: any) => {
        collected.push(toAnswerItem(q, `Soru ${collected.length + 1}`));
      });

      return collected;
    };

    const buildPartsFromBackend = () => {
      const part11: SpeakingAnswerItem[] = [];
      const part12: SpeakingAnswerItem[] = [];

      const part1Sections = Array.isArray(speaking?.part1?.sections)
        ? speaking.part1.sections
        : [];
      part1Sections.forEach((section: any) => {
        const subParts = Array.isArray(section?.subParts) ? section.subParts : [];
        if (subParts.length > 0) {
          const firstSubPartQuestions = Array.isArray(subParts[0]?.questions)
            ? subParts[0].questions
            : [];
          firstSubPartQuestions.forEach((q: any) => {
            part11.push(toAnswerItem(q, `Soru ${part11.length + 1}`));
          });

          const secondSubPartQuestions = Array.isArray(subParts[1]?.questions)
            ? subParts[1].questions
            : [];
          secondSubPartQuestions.forEach((q: any) => {
            part12.push(toAnswerItem(q, `Soru ${part12.length + 1}`));
          });
        } else {
          const directQuestions = Array.isArray(section?.questions)
            ? section.questions
            : [];
          directQuestions.forEach((q: any) => {
            part11.push(toAnswerItem(q, `Soru ${part11.length + 1}`));
          });
        }
      });

      const part2 = extractQuestionsFromPart(speaking?.part2);
      const part3 = extractQuestionsFromPart(speaking?.part3);

      return [part11, part12, part2, part3];
    };

    const buildLegacyParts = () => {
      const legacyAnswers = Array.isArray(speaking?.answers) ? speaking.answers : [];
      const legacyPart = legacyAnswers.map((answer: any, index: number) =>
        toAnswerItem(answer, `Soru ${index + 1}`)
      );
      return [legacyPart, [], [], []];
    };

    const parts = (() => {
      const structured = buildPartsFromBackend();
      const hasStructuredData = structured.some((part) => part.length > 0);
      return hasStructuredData ? structured : buildLegacyParts();
    })();

    const visiblePartEntries = parts
      .map((questions, index) => ({ index, questions }))
      .filter((entry) => entry.questions.length > 0);

    const effectiveActiveSpeakingPart =
      parts[activeSpeakingPart]?.length > 0
        ? activeSpeakingPart
        : (visiblePartEntries[0]?.index ?? 0);
    
    // Get part label based on index
    const getPartLabel = (index: number) => {
      if (index === 0) return { main: "Bölüm 1.1", sub: "Part 1.1" };
      if (index === 1) return { main: "Bölüm 1.2", sub: "Part 1.2" };
      if (index === 2) return { main: "Bölüm 2", sub: "Part 2" };
      if (index === 3) return { main: "Bölüm 3", sub: "Part 3" };
      return { main: `Bölüm ${index + 1}`, sub: `Part ${index + 1}` };
    };

    type SpeakingSectionKey = "bolum_1_1" | "bolum_1_2" | "bolum_2" | "bolum_3";

    const getSpeakingSectionKey = (partIndex: number): SpeakingSectionKey => {
      if (partIndex === 0) return "bolum_1_1";
      if (partIndex === 1) return "bolum_1_2";
      if (partIndex === 2) return "bolum_2";
      return "bolum_3";
    };

    const getSpeakingFeedbackKey = (partIndex: number): "part1" | "part2" | "part3" => {
      if (partIndex === 0 || partIndex === 1) return "part1";
      if (partIndex === 2) return "part2";
      return "part3";
    };

    const isPlaceholderText = (value?: string) => {
      if (!value || typeof value !== "string") return true;
      const normalized = value.trim().toLowerCase().replace(/\./g, "");
      return (
        normalized === "yanit yok" ||
        normalized === "yanıt yok" ||
        normalized.startsWith("yanit yok ") ||
        normalized.startsWith("yanıt yok ") ||
        normalized === "degerlendirme yok" ||
        normalized === "değerlendirme yok" ||
        normalized === "yok" ||
        normalized === "-"
      );
    };

    const pickMeaningfulText = (...values: any[]): string | undefined => {
      for (const value of values) {
        if (typeof value === "string" && value.trim() && !isPlaceholderText(value)) {
          return normalizeFeedbackText(value.trim());
        }
      }
      return undefined;
    };

    const getSectionFromFeedbackObject = (sectionKey: SpeakingSectionKey) => {
      if (!aiFeedback || typeof aiFeedback !== "object") return undefined;
      const bolumler = (aiFeedback as any)?.bolumler || (aiFeedback as any)?.["bölümler"];
      const turkishKey = sectionKey.replace("bolum", "bölüm");
      return (
        bolumler?.[sectionKey] ||
        bolumler?.[turkishKey] ||
        (aiFeedback as any)?.[sectionKey] ||
        (aiFeedback as any)?.[turkishKey]
      );
    };

    const getSpeakingSectionCriteriaFromObject = (sectionKey: SpeakingSectionKey) => {
      const section = getSectionFromFeedbackObject(sectionKey);
      const criteria = section?.kriterler || section?.criteria || section;
      return {
        coherence: pickMeaningfulText(
          criteria?.coherenceAndCohesion,
          criteria?.coherence_and_cohesion,
          criteria?.tutarlilikVeBaglilik,
          criteria?.tutarlilik_ve_baglilik,
          criteria?.["Akıcılık ve Bağlılık"],
          criteria?.["Tutarlılık ve Bağlılık"]
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

    const extractSpeakingCriteriaFromNarrative = (text?: string) => {
      if (!text || typeof text !== "string") return {};
      const source = removeBullets(text);
      const sentences = source
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
      const pickSentence = (patterns: RegExp[]) =>
        pickMeaningfulText(
          ...sentences.filter((sentence) => patterns.some((pattern) => pattern.test(sentence)))
        );
      return {
        coherence: pickMeaningfulText(
          source.match(/(?:Akıcılık|Akicilik|Tutarlılık|Tutarlilik)(?:\s*ve\s*(?:Bağlılık|Baglilik))?[:\s-]*([^\n\r]+)/i)?.[1],
          pickSentence([/akıcılık/i, /akicilik/i, /tutarl/i, /bağlılık/i, /baglilik/i, /akış/i, /akis/i])
        ),
        grammar: pickMeaningfulText(
          source.match(/Dil Bilgisi[:\s-]*([^\n\r]+)/i)?.[1],
          pickSentence([/dil\s*bilg/i, /gramer/i, /cümle/i, /cumle/i])
        ),
        lexical: pickMeaningfulText(
          source.match(/Kelime Kaynağı[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/Kelime Kaynagi[:\s-]*([^\n\r]+)/i)?.[1],
          pickSentence([/kelime/i, /söz varlığı/i, /soz varligi/i, /vocabulary/i])
        ),
        achievement: pickMeaningfulText(
          source.match(/(?:Görev Başarısı|Görev Yanıtı)[:\s-]*([^\n\r]+)/i)?.[1],
          source.match(/(?:Gorev Basarisi|Gorev Yaniti)[:\s-]*([^\n\r]+)/i)?.[1],
          pickSentence([/görev/i, /gorev/i, /yanıt/i, /yanit/i, /talimat/i, /konu/i, /başarı/i, /basari/i])
        ),
      };
    };

    const getSpeakingSectionNarrative = (partIndex: number) => {
      const sectionKey = getSpeakingSectionKey(partIndex);
      const section = getSectionFromFeedbackObject(sectionKey);
      const feedbackKey = getSpeakingFeedbackKey(partIndex);
      return pickMeaningfulText(
        section?.degerlendirme,
        section?.["değerlendirme"],
        section?.feedback,
        section?.yorum,
        section?.analysis,
        typeof aiFeedback === "string" ? extractFeedbackSection(aiFeedback, feedbackKey) : undefined,
        typeof aiFeedback === "object" ? (aiFeedback as any)?.[feedbackKey] : undefined
      );
    };

    const activeSpeakingSectionKey = getSpeakingSectionKey(effectiveActiveSpeakingPart);
    const criteriaFromSectionObject = getSpeakingSectionCriteriaFromObject(activeSpeakingSectionKey);
    const criteriaFromSectionNarrative = extractSpeakingCriteriaFromNarrative(
      getSpeakingSectionNarrative(effectiveActiveSpeakingPart)
    );
    const fallbackGlobalSpeakingCriteria = {
      coherence: pickMeaningfulText(
        typeof aiFeedback === "object" ? (aiFeedback as any)?.coherenceAndCohesion : undefined
      ),
      grammar: pickMeaningfulText(
        typeof aiFeedback === "object" ? (aiFeedback as any)?.grammaticalRangeAndAccuracy : undefined
      ),
      lexical: pickMeaningfulText(
        typeof aiFeedback === "object" ? (aiFeedback as any)?.lexicalResource : undefined
      ),
      achievement: pickMeaningfulText(
        typeof aiFeedback === "object" ? (aiFeedback as any)?.taskAchievement : undefined
      ),
    };
    const activeSpeakingCriteria = {
      coherence:
        criteriaFromSectionObject.coherence ||
        criteriaFromSectionNarrative.coherence ||
        fallbackGlobalSpeakingCriteria.coherence ||
        "Kısa değerlendirme yok",
      grammar:
        criteriaFromSectionObject.grammar ||
        criteriaFromSectionNarrative.grammar ||
        fallbackGlobalSpeakingCriteria.grammar ||
        "Kısa değerlendirme yok",
      lexical:
        criteriaFromSectionObject.lexical ||
        criteriaFromSectionNarrative.lexical ||
        fallbackGlobalSpeakingCriteria.lexical ||
        "Kısa değerlendirme yok",
      achievement:
        criteriaFromSectionObject.achievement ||
        criteriaFromSectionNarrative.achievement ||
        fallbackGlobalSpeakingCriteria.achievement ||
        "Kısa değerlendirme yok",
    };
    
    // Get current question and answer based on active part
    const getCurrentQuestionAndAnswer = () => {
      if (
        visiblePartEntries.length > 0 &&
        parts[effectiveActiveSpeakingPart] &&
        parts[effectiveActiveSpeakingPart].length > 0
      ) {
        const partQuestions = parts[effectiveActiveSpeakingPart];
        const currentQuestionIndex = Math.min(activeSpeakingQuestion, partQuestions.length - 1);
        const currentAnswer = partQuestions[currentQuestionIndex];
        const partLabel = getPartLabel(effectiveActiveSpeakingPart);
        
        // Map part index to feedback key
        // Code organizes into: part1_1 (index 0), part1_2 (index 1), part2 (index 2), part3 (index 3)
        // Feedback string has: [BÖLÜM 1 ANALİZİ], [BÖLÜM 2 ANALİZİ], [BÖLÜM 3 ANALİZİ]
        // Map: part1_1 (index 0) -> part1, part1_2 (index 1) -> part1 (both use BÖLÜM 1), 
        //      part2 (index 2) -> part2, part3 (index 3) -> part3
        let feedbackKey: string;
        if (effectiveActiveSpeakingPart === 0 || effectiveActiveSpeakingPart === 1) {
          // Both Part 1.1 and Part 1.2 use BÖLÜM 1 feedback
          feedbackKey = 'part1';
        } else if (effectiveActiveSpeakingPart === 2) {
          feedbackKey = 'part2';
        } else if (effectiveActiveSpeakingPart === 3) {
          feedbackKey = 'part3';
        } else {
          feedbackKey = `part${effectiveActiveSpeakingPart + 1}`;
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
            {!isMultiTest && (
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
          {visiblePartEntries.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4 sm:mb-6">
                Konuşma Bölümleri
              </h3>

              {/* All Parts - 2x2 on mobile, 4 columns on tablet+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {visiblePartEntries.map(({ index }) => {
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
                        effectiveActiveSpeakingPart === index
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
              {parts[effectiveActiveSpeakingPart] && 
               parts[effectiveActiveSpeakingPart].length > 1 && 
               (effectiveActiveSpeakingPart === 0 || effectiveActiveSpeakingPart === 1) && (
                <div className="flex flex-wrap gap-2">
                  {parts[effectiveActiveSpeakingPart].map((_, index: number) => (
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
                {getPartLabel(effectiveActiveSpeakingPart).main}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Akıcılık ve Bağlılık</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {removeBullets(activeSpeakingCriteria.coherence)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Dil Bilgisi</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {removeBullets(activeSpeakingCriteria.grammar)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Kelime Kaynağı</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {removeBullets(activeSpeakingCriteria.lexical)}
                </div>
              </div>
              <div className="w-full rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Görev Yanıtı</div>
                <div className="min-h-[92px] rounded-lg bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {removeBullets(activeSpeakingCriteria.achievement)}
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
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Performans Özeti</h2>
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
  const availableTests: Array<"listening" | "reading" | "writing" | "speaking"> = [];
  if (data?.listening) availableTests.push('listening');
  if (data?.reading) availableTests.push('reading');
  if (data?.writing) availableTests.push('writing');
  if (data?.speaking) availableTests.push('speaking');

  const testInfoByType = {
    listening: { label: "Dinleme", score: wholeScore(data?.listening?.score) },
    reading: { label: "Okuma", score: wholeScore(data?.reading?.score) },
    writing: { label: "Yazma", score: wholeScore(data?.writing?.score) },
    speaking: { label: "Konuşma", score: wholeScore(data?.speaking?.score) },
  } as const;

  const safeActiveTab = availableTests.includes(activeTab as any) ? activeTab : (availableTests[0] || "listening");
  const tabGridClass =
    availableTests.length === 2 ? "grid-cols-2" :
    availableTests.length === 3 ? "grid-cols-3" :
    "grid-cols-4";

  const scoreList = availableTests
    .map((type) => testInfoByType[type].score)
    .filter((score): score is number => typeof score === "number" && !Number.isNaN(score));
  const rawOverallScore = (data as any)?.overallScore ?? (data as any)?.score ?? (data as any)?.totalScore;
  const parsedOverallScore =
    typeof rawOverallScore === "number"
      ? rawOverallScore
      : typeof rawOverallScore === "string"
        ? Number(rawOverallScore)
        : NaN;
  const overallScore =
    !Number.isNaN(parsedOverallScore)
      ? wholeScore(parsedOverallScore)
      : scoreList.length > 0
        ? Math.round(scoreList.reduce((sum, score) => sum + score, 0) / scoreList.length)
        : 0;
  const overallLevel = levelFrom75(overallScore) || displayLevel(data?.level) || "B1 altı";

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
              className="theme-important bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
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
            className="theme-important bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-2" />
            {downloadingPDF ? "İndiriliyor..." : "PDF İndir"}
          </Button>
        </div>

        <Tabs value={safeActiveTab} onValueChange={setActiveTab} className="w-full">
          <div className="sticky top-0 z-40 bg-gray-50 pb-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-muted-foreground">
                <span>Katılımcı: {data.user.name}</span>
                <span>Tarih: {new Date(data.completedAt || data.startedAt).toISOString().replace('T', ' ').substring(0, 19) + " "}</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_168px] items-center gap-3">
                <TabsList className={`grid h-auto w-full ${tabGridClass} items-start justify-start gap-1 bg-gray-50/80 border border-gray-200 rounded-lg p-1`}>
                  {availableTests.map((testType) => {
                    const score = testInfoByType[testType].score;
                    return (
                      <TabsTrigger
                        key={testType}
                        value={testType}
                        className="h-12 sm:h-14 flex flex-col items-center justify-center gap-0.5 px-2 sm:px-3 rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-gray-800">{testInfoByType[testType].label}</span>
                        <span className="text-xs sm:text-sm font-bold text-red-600 leading-none">
                          {score}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                <div className="flex items-center justify-center">
                  <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-gray-200 bg-gray-50 shadow-sm flex flex-col items-center justify-center text-center px-2">
                    <div className="text-[10px] text-gray-500 leading-none">Toplam</div>
                    <div className="mt-1 flex flex-col items-center leading-tight">
                      <span className="text-2xl sm:text-[28px] font-bold text-red-600">{overallScore}</span>
                      <span className="text-[11px] sm:text-xs font-semibold text-black">{overallLevel}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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





