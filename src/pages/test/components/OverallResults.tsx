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

    type StructuredGeneralFeedback = {
      ozet: string;
      tekrar_eden_eksikler: string[];
      alinti_duzeltme: Array<{ alinti: string; duzeltilmis: string; neden: string }>;
      egzersizler: Array<{ baslik: string; uygulama: string }>;
      kapanis: string;
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
          generalStructured:
            feedbackObj?.general_structured ??
            feedbackObj?.generalStructured ??
            feedbackObj?.genel_degerlendirme_yapilandirilmis,
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
    const extractStructuredGeneralFeedback = (): StructuredGeneralFeedback | null => {
      const raw =
        (parsedFeedback as any)?.generalStructured ??
        (parsedFeedback as any)?.general_structured ??
        (parsedFeedback as any)?.genel_degerlendirme_yapilandirilmis ??
        (aiFeedback as any)?.generalStructured ??
        (aiFeedback as any)?.general_structured ??
        (aiFeedback as any)?.genel_degerlendirme_yapilandirilmis;

      if (!raw || typeof raw !== "object") return null;
      const src: any = raw;
      const clean = (value: any) => cleanBullets(typeof value === "string" ? value : "");

      const structured: StructuredGeneralFeedback = {
        ozet: clean(src?.ozet),
        tekrar_eden_eksikler: Array.isArray(src?.tekrar_eden_eksikler)
          ? src.tekrar_eden_eksikler.map((v: any) => clean(v)).filter(Boolean).slice(0, 6)
          : [],
        alinti_duzeltme: Array.isArray(src?.alinti_duzeltme)
          ? src.alinti_duzeltme
              .map((item: any) => ({
                alinti: clean(item?.alinti),
                duzeltilmis: clean(item?.duzeltilmis),
                neden: clean(item?.neden),
              }))
              .filter((item: any) => item.alinti || item.duzeltilmis || item.neden)
              .slice(0, 6)
          : [],
        egzersizler: Array.isArray(src?.egzersizler)
          ? src.egzersizler
              .map((item: any) => ({
                baslik: clean(item?.baslik),
                uygulama: clean(item?.uygulama),
              }))
              .filter((item: any) => item.baslik || item.uygulama)
              .slice(0, 4)
          : [],
        kapanis: clean(src?.kapanis),
      };

      const hasContent =
        structured.ozet ||
        structured.kapanis ||
        structured.tekrar_eden_eksikler.length > 0 ||
        structured.alinti_duzeltme.length > 0 ||
        structured.egzersizler.length > 0;

      return hasContent ? structured : null;
    };
    const structuredGeneralFeedback = extractStructuredGeneralFeedback();

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
      const explicitKey = String(
        answer?.taskKey ?? answer?.task_key ?? answer?.sectionKey ?? "",
      ).trim() as WritingTaskKey | "";
      if (
        explicitKey === "bolum_1_1" ||
        explicitKey === "bolum_1_2" ||
        explicitKey === "bolum_2"
      ) {
        return explicitKey;
      }

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
              if (!generalFeedback && !structuredGeneralFeedback) return null;

              return (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Genel Değerlendirme</h2>
                  {structuredGeneralFeedback ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {structuredGeneralFeedback.ozet && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Özet</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {normalizeDisplayText(structuredGeneralFeedback.ozet)}
                          </p>
                        </div>
                      )}

                      {structuredGeneralFeedback.tekrar_eden_eksikler.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Tekrar Eden Eksikler</h4>
                          <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {structuredGeneralFeedback.tekrar_eden_eksikler.map((item, idx) => (
                              <li key={`overall-eksik-${idx}`}>{normalizeDisplayText(item)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {structuredGeneralFeedback.alinti_duzeltme.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-2">İyileştirmeler</h4>
                          <div className="space-y-3">
                            {structuredGeneralFeedback.alinti_duzeltme.map((item, idx) => (
                              <div
                                key={`overall-rewrite-${idx}`}
                                className="rounded-lg border border-gray-200 bg-gray-100 p-3"
                              >
                                {item.alinti && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Alıntı</p>
                                    <p className="text-red-600 font-medium whitespace-pre-wrap mb-2">
                                      "{normalizeDisplayText(item.alinti)}"
                                    </p>
                                  </>
                                )}
                                {item.duzeltilmis && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Düzeltilmiş Versiyon</p>
                                    <p className="text-green-700 whitespace-pre-wrap mb-2">
                                      {normalizeDisplayText(item.duzeltilmis)}
                                    </p>
                                  </>
                                )}
                                {item.neden && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Neden Düzelttik?</p>
                                    <p className="text-gray-700 whitespace-pre-wrap">
                                      {normalizeDisplayText(item.neden)}
                                    </p>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {structuredGeneralFeedback.egzersizler.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Önerilen Egzersizler</h4>
                          <div className="space-y-2">
                            {structuredGeneralFeedback.egzersizler.map((item, idx) => (
                              <div
                                key={`overall-exercise-${idx}`}
                                className="rounded-md border border-gray-200 bg-white p-3"
                              >
                                <p className="font-semibold text-black">
                                  {idx + 1}. {normalizeDisplayText(item.baslik || "Egzersiz")}
                                </p>
                                {item.uygulama && (
                                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                                    {normalizeDisplayText(item.uygulama)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {structuredGeneralFeedback.kapanis && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Son Not</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {normalizeDisplayText(structuredGeneralFeedback.kapanis)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {normalizeFeedbackText(generalFeedback)}
                      </p>
                    </div>
                  )}
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
    const rawSpeakingAiFeedback =
      (speaking as any)?.aiFeedback ??
      (speaking as any)?.ai_feedback ??
      (speaking as any)?.feedback ??
      (speaking as any)?.assessment ??
      null;

    const parseJsonCandidate = (value: unknown): unknown => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      if (!trimmed) return value;

      const cleaned = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      if (!(cleaned.startsWith("{") || cleaned.startsWith("["))) return value;
      try {
        return JSON.parse(cleaned);
      } catch {
        return value;
      }
    };

    const unwrapAiFeedback = (value: unknown): unknown => {
      let current: any = parseJsonCandidate(value);
      for (let i = 0; i < 3; i += 1) {
        if (!current || typeof current !== "object") break;
        const next =
          current?.aiFeedback ??
          current?.ai_feedback ??
          current?.feedback ??
          current?.assessment;
        if (!next || next === current) break;
        current = parseJsonCandidate(next);
      }
      return current;
    };

    const aiFeedback: any = unwrapAiFeedback(rawSpeakingAiFeedback);
    
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
    const normalizeQuestionRefs = (text: string): string =>
      text
        .replace(/\bQ\s*([0-9]{1,2})\s*['’`]?\s*(de|da|te|ta)\b/gi, (_m, n) => `${n}. soruda`)
        .replace(/\bQ\s*([0-9]{1,2})\b/gi, (_m, n) => `${n}. soru`);

    const removeBullets = (text: string): string => {
      if (!text) return text;
      // Remove bullet symbols (•, , etc.) and clean up whitespace
      return normalizeFeedbackText(
        normalizeQuestionRefs(
          text
            .replace(/[•\u2022\u25E6\uF0B7]/g, '') // Remove various bullet symbols
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(),
        ),
      );
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

    type StructuredGeneralFeedback = {
      ozet: string;
      tekrar_eden_eksikler: string[];
      alinti_duzeltme: Array<{ alinti: string; duzeltilmis: string; neden: string }>;
      egzersizler: Array<{ baslik: string; uygulama: string }>;
      kapanis: string;
    };

    const extractStructuredGeneralFeedback = (): StructuredGeneralFeedback | null => {
      const raw =
        (aiFeedback as any)?.generalStructured ??
        (aiFeedback as any)?.general_structured ??
        (aiFeedback as any)?.genel_degerlendirme_yapilandirilmis;

      if (!raw || typeof raw !== "object") return null;
      const src: any = raw;
      const clean = (value: any) => removeBullets(typeof value === "string" ? value : "");

      const structured: StructuredGeneralFeedback = {
        ozet: clean(src?.ozet),
        tekrar_eden_eksikler: Array.isArray(src?.tekrar_eden_eksikler)
          ? src.tekrar_eden_eksikler.map((v: any) => clean(v)).filter(Boolean).slice(0, 6)
          : [],
        alinti_duzeltme: Array.isArray(src?.alinti_duzeltme)
          ? src.alinti_duzeltme
              .map((item: any) => ({
                alinti: clean(item?.alinti),
                duzeltilmis: clean(item?.duzeltilmis),
                neden: clean(item?.neden),
              }))
              .filter((item: any) => item.alinti || item.duzeltilmis || item.neden)
              .slice(0, 6)
          : [],
        egzersizler: Array.isArray(src?.egzersizler)
          ? src.egzersizler
              .map((item: any) => ({
                baslik: clean(item?.baslik),
                uygulama: clean(item?.uygulama),
              }))
              .filter((item: any) => item.baslik || item.uygulama)
              .slice(0, 4)
          : [],
        kapanis: clean(src?.kapanis),
      };

      const hasContent =
        structured.ozet ||
        structured.kapanis ||
        structured.tekrar_eden_eksikler.length > 0 ||
        structured.alinti_duzeltme.length > 0 ||
        structured.egzersizler.length > 0;

      return hasContent ? structured : null;
    };

    const structuredGeneralFeedback = extractStructuredGeneralFeedback();
    
    // Helper function to extract feedback sections from string format
    const extractFeedbackSection = (feedbackSource: any, sectionName: string): string => {
      if (!feedbackSource) {
        return `Geri bildirim mevcut değil`;
      }

      if (typeof feedbackSource === "object") {
        const feedbackObj: any = feedbackSource;
        const bolumler =
          feedbackObj?.bolumler ??
          feedbackObj?.["bölümler"] ??
          feedbackObj?.sections ??
          feedbackObj?.parts ??
          {};

        const getSectionNarrative = (section: any): string | undefined => {
          if (!section || typeof section !== "object") return undefined;
          const candidate =
            section?.degerlendirme ??
            section?.["değerlendirme"] ??
            section?.feedback ??
            section?.yorum ??
            section?.analysis;
          return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
        };

        if (sectionName === "general") {
          const directGeneral =
            feedbackObj?.genel_degerlendirme ??
            feedbackObj?.genelDegerlendirme ??
            feedbackObj?.general ??
            feedbackObj?.generalFeedback ??
            feedbackObj?.summary ??
            feedbackObj?.teacherNote ??
            feedbackObj?.teacher_note;
          if (typeof directGeneral === "string" && directGeneral.trim()) {
            return sanitizeGeneralFeedback(directGeneral.trim());
          }
          return `Geri bildirim mevcut değil`;
        }

        if (sectionName === "part1") {
          const part1_1 = getSectionNarrative(bolumler?.bolum_1_1 ?? bolumler?.["bölüm_1_1"]);
          const part1_2 = getSectionNarrative(bolumler?.bolum_1_2 ?? bolumler?.["bölüm_1_2"]);
          const merged = [part1_1, part1_2].filter(Boolean).join(" ");
          if (merged) return removeBullets(merged);
        }

        const objectFallback =
          sectionName === "part2"
            ? getSectionNarrative(bolumler?.bolum_2 ?? bolumler?.["bölüm_2"])
            : sectionName === "part3"
              ? getSectionNarrative(bolumler?.bolum_3 ?? bolumler?.["bölüm_3"])
              : feedbackObj?.[sectionName];

        if (typeof objectFallback === "string" && objectFallback.trim()) {
          return removeBullets(objectFallback.trim());
        }
      }

      if (typeof feedbackSource !== "string") {
        return `Geri bildirim mevcut değil`;
      }

      // Try to extract specific section from string format
      const feedbackText = feedbackSource;
      const sectionPatterns: Record<string, RegExp> = {
        part1: /\[BÖLÜM 1 ANALİZİ\]([\s\S]*?)(?=\[BÖLÜM 2|\[BÖLÜM 3|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        part2: /\[BÖLÜM 2 ANALİZİ\]([\s\S]*?)(?=\[BÖLÜM 3|AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        part3: /\[BÖLÜM 3 ANALİZİ\]([\s\S]*?)(?=AI GERİ BİLDİRİMİ|GENEL DEĞERLENDİRME|$)/i,
        general: /GENEL DEĞERLENDİRME:([\s\S]*?)(?=$)/i,
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

      if (sectionName === "general") {
        return sanitizeGeneralFeedback(feedbackText);
      }
      if (sectionName === "taskAchievement") {
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
      questionOrder?: number;
    };

    const extractNumericOrder = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return Math.floor(value);
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const direct = Number(trimmed);
        if (Number.isFinite(direct) && direct > 0) return Math.floor(direct);
        const fromText = trimmed.match(/(?:Soru|Question|Q)\s*#?\s*(\d{1,2})/i)?.[1];
        if (fromText) {
          const parsed = Number(fromText);
          if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
        }
      }
      return undefined;
    };

    const pickFirstNonEmptyText = (...values: unknown[]): string => {
      for (const value of values) {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed) return trimmed;
          continue;
        }
        if (value && typeof value === "object") {
          const nested = value as any;
          const nestedText = [
            nested?.text,
            nested?.userAnswer,
            nested?.answer,
            nested?.transcript,
            nested?.content,
            nested?.response,
          ].find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
          if (typeof nestedText === "string") return nestedText.trim();
        }
      }
      return "";
    };

    const toAnswerItem = (
      question: any,
      fallbackText: string,
      fallbackOrder?: number
    ): SpeakingAnswerItem => ({
      questionId:
        (typeof question?.questionId === "string" && question.questionId) ||
        (typeof question?.questionId === "number" && String(question.questionId)) ||
        (typeof question?.id === "string" && question.id) ||
        (typeof question?.id === "number" && String(question.id)) ||
        (typeof question?.question?.id === "string" && question.question.id) ||
        (typeof question?.question?.id === "number" && String(question.question.id)) ||
        null,
      questionText: pickFirstNonEmptyText(
        question?.questionText,
        question?.question?.questionText,
        question?.question?.text,
        question?.prompt,
        typeof question?.question === "string" ? question.question : "",
        typeof question?.text === "string" ? question.text : "",
        fallbackText
      ),
      userAnswer: pickFirstNonEmptyText(
        question?.userAnswer,
        question?.answer,
        question?.text,
        question?.transcript,
        question?.content,
        question?.response,
        question?.answerText
      ),
      questionOrder:
        extractNumericOrder(question?.questionOrder) ??
        extractNumericOrder(question?.order) ??
        extractNumericOrder(question?.question?.order) ??
        extractNumericOrder(question?.questionNumber) ??
        extractNumericOrder(question?.questionText) ??
        extractNumericOrder(question?.question) ??
        fallbackOrder,
    });

    const splitAnswersByOrder = (items: SpeakingAnswerItem[]) => {
      const groups: [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] = [
        [],
        [],
        [],
        [],
      ];
      const unresolved: SpeakingAnswerItem[] = [];

      items.forEach((item) => {
        const order = extractNumericOrder(item.questionOrder);
        if (!order) {
          unresolved.push(item);
          return;
        }
        if (order <= 3) groups[0].push(item);
        else if (order <= 6) groups[1].push(item);
        else if (order === 7) groups[2].push(item);
        else groups[3].push(item);
      });

      unresolved.forEach((item) => {
        if (groups[0].length < 3) groups[0].push(item);
        else if (groups[1].length < 3) groups[1].push(item);
        else if (groups[2].length < 1) groups[2].push(item);
        else groups[3].push(item);
      });

      return groups;
    };

    const isMeaningfulSpeakingAnswer = (value?: string) => {
      const text = String(value || "").trim();
      if (!text) return false;
      const normalized = text
        .toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ")
        .replace(/[^\p{L}\p{N}\s[\]]/gu, "")
        .trim();
      if (!normalized) return false;
      if (normalized.includes("cevap bulunamad")) return false;
      if (normalized === "yanit yok" || normalized === "yanıt yok") return false;
      if (normalized === "[cevap bulunamadi]" || normalized === "[cevap bulunamadı]") return false;
      return true;
    };

    const countMeaningfulAnswers = (groups: SpeakingAnswerItem[][]) =>
      groups
        .flat()
        .filter((item) => isMeaningfulSpeakingAnswer(item.userAnswer)).length;

    const emptySpeakingParts = (): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => [
      [],
      [],
      [],
      [],
    ];

    const collectQuestionCatalog = () => {
      const byId = new Map<string, { questionText: string; questionOrder?: number }>();
      const seen = new WeakSet<object>();

      const remember = (candidate: any) => {
        const normalized = toAnswerItem(candidate, "");
        if (!normalized.questionId) return;
        const existing = byId.get(normalized.questionId);
        const nextText = pickFirstNonEmptyText(
          normalized.questionText,
          existing?.questionText,
          `Soru ${byId.size + 1}`
        );
        byId.set(normalized.questionId, {
          questionText: nextText,
          questionOrder: normalized.questionOrder ?? existing?.questionOrder,
        });
      };

      const walk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node !== "object") return;
        if (seen.has(node)) return;
        seen.add(node);

        remember(node);
        walk((node as any).questions);
        walk((node as any).subParts);
        walk((node as any).sections);
        walk((node as any).parts);
        walk((node as any).answers);
      };

      walk(speaking);
      return byId;
    };

    const extractSessionSpeakingAnswers = (): SpeakingAnswerItem[] => {
      try {
        const questionCatalog = collectQuestionCatalog();
        const speakingTestId = pickFirstNonEmptyText(
          (speaking as any)?.speakingTestId,
          (speaking as any)?.test?.id,
          (speaking as any)?.testId
        );

        const prioritizedKeys = [
          speakingTestId ? `speaking_answers_${speakingTestId}` : "",
          params.overallId ? `speaking_answers_${params.overallId}` : "",
        ].filter(Boolean);
        const allSpeakingKeys = speakingTestId
          ? []
          : Object.keys(sessionStorage).filter((key) => key.startsWith("speaking_answers_"));
        const candidateKeys = Array.from(new Set([...prioritizedKeys, ...allSpeakingKeys]));
        if (candidateKeys.length === 0) return [];

        const byQuestionId = new Map<string, SpeakingAnswerItem>();
        const upsert = (questionIdRaw: unknown, rawValue: unknown) => {
          const questionId = String(questionIdRaw ?? "").trim();
          if (!questionId) return;

          const answerText = pickFirstNonEmptyText(
            rawValue,
            (rawValue as any)?.userAnswer,
            (rawValue as any)?.answer,
            (rawValue as any)?.text,
            (rawValue as any)?.transcript,
            (rawValue as any)?.content,
            (rawValue as any)?.response
          );
          if (!isMeaningfulSpeakingAnswer(answerText)) return;

          const fromCatalog = questionCatalog.get(questionId);
          const normalized = toAnswerItem(
            {
              questionId,
              questionText: fromCatalog?.questionText || "",
              userAnswer: answerText,
              questionOrder: fromCatalog?.questionOrder,
            },
            fromCatalog?.questionText || `Soru ${byQuestionId.size + 1}`,
            fromCatalog?.questionOrder
          );

          const existing = byQuestionId.get(questionId);
          if (!existing || normalized.userAnswer.length >= existing.userAnswer.length) {
            byQuestionId.set(questionId, normalized);
          }
        };

        candidateKeys.forEach((key) => {
          const raw = sessionStorage.getItem(key);
          if (!raw) return;

          try {
            const parsed = JSON.parse(raw);
            const parsedTestId = pickFirstNonEmptyText(parsed?.testId);
            if (speakingTestId && parsedTestId && parsedTestId !== speakingTestId) {
              return;
            }

            if (parsed?.transcripts && typeof parsed.transcripts === "object") {
              Object.entries(parsed.transcripts).forEach(([qid, value]) => {
                upsert(qid, value);
              });
            }

            if (Array.isArray(parsed?.answers)) {
              parsed.answers.forEach((item: any) => {
                upsert(item?.questionId ?? item?.id, item);
              });
            } else if (parsed?.answers && typeof parsed.answers === "object") {
              Object.entries(parsed.answers).forEach(([qid, value]) => {
                upsert(qid, value);
              });
            }
          } catch {
            // Ignore corrupted session data and continue with other keys.
          }
        });

        return Array.from(byQuestionId.values()).sort(
          (a, b) => (a.questionOrder || 0) - (b.questionOrder || 0)
        );
      } catch {
        return [];
      }
    };

    const buildSessionParts = (): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => {
      const sessionAnswers = extractSessionSpeakingAnswers();
      if (sessionAnswers.length === 0) return emptySpeakingParts();
      const grouped = splitAnswersByOrder(sessionAnswers);
      const hasAny = grouped.some((group) => group.length > 0);
      return hasAny ? grouped : [sessionAnswers, [], [], []];
    };

    const extractQuestionsFromPart = (part: any): SpeakingAnswerItem[] => {
      const collected: SpeakingAnswerItem[] = [];
      if (!part || typeof part !== "object") return collected;

      let sequence = 1;
      const pushWithOrder = (question: any) => {
        collected.push(toAnswerItem(question, `Soru ${collected.length + 1}`, sequence));
        sequence += 1;
      };

      const sections = Array.isArray(part.sections) ? part.sections : [];
      sections.forEach((section: any) => {
        const directQuestions = Array.isArray(section?.questions)
          ? section.questions
          : [];
        directQuestions.forEach((q: any) => {
          pushWithOrder(q);
        });

        const subParts = Array.isArray(section?.subParts) ? section.subParts : [];
        subParts.forEach((subPart: any) => {
          const subQuestions = Array.isArray(subPart?.questions)
            ? subPart.questions
            : [];
          subQuestions.forEach((q: any) => {
            pushWithOrder(q);
          });
        });
      });

      const topLevelSubParts = Array.isArray(part.subParts) ? part.subParts : [];
      topLevelSubParts.forEach((subPart: any) => {
        const subQuestions = Array.isArray(subPart?.questions) ? subPart.questions : [];
        subQuestions.forEach((q: any) => {
          pushWithOrder(q);
        });
      });

      const partQuestions = Array.isArray(part.questions) ? part.questions : [];
      partQuestions.forEach((q: any) => {
        pushWithOrder(q);
      });

      return collected;
    };

    const buildPartsFromBackend = (): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => {
      const part11: SpeakingAnswerItem[] = [];
      const part12: SpeakingAnswerItem[] = [];
      const dedupeByQuestionId = (items: SpeakingAnswerItem[]) => {
        const byId = new Map<string, SpeakingAnswerItem>();
        const withoutId: SpeakingAnswerItem[] = [];

        items.forEach((item) => {
          const qid = String(item?.questionId || "").trim();
          if (!qid) {
            withoutId.push(item);
            return;
          }

          const existing = byId.get(qid);
          if (!existing) {
            byId.set(qid, item);
            return;
          }

          const existingAnswer = String(existing.userAnswer || "").trim();
          const nextAnswer = String(item.userAnswer || "").trim();
          const shouldReplace =
            isMeaningfulSpeakingAnswer(nextAnswer) &&
            (!isMeaningfulSpeakingAnswer(existingAnswer) || nextAnswer.length >= existingAnswer.length);
          if (shouldReplace) {
            byId.set(qid, item);
          }
        });

        return [...Array.from(byId.values()), ...withoutId];
      };
      const resolvePart1BucketFromHint = (node: any): 0 | 1 | undefined => {
        const hint = String(
          [node?.label, node?.title, node?.description].filter(Boolean).join(" ")
        )
          .toLocaleLowerCase("tr-TR")
          .replace(/\s+/g, " ")
          .trim();

        if (!hint) return undefined;
        const isPart12 = /(?:^|[^0-9])1[.\s_-]?2(?:[^0-9]|$)/.test(hint);
        const isPart11 = /(?:^|[^0-9])1[.\s_-]?1(?:[^0-9]|$)/.test(hint);
        if (isPart12 && !isPart11) return 1;
        if (isPart11 && !isPart12) return 0;
        return undefined;
      };

      const appendSplitPart1 = (items: SpeakingAnswerItem[]) => {
        if (!items || items.length === 0) return;
        const [group11, group12] = splitAnswersByOrder(items);
        part11.push(...group11);
        part12.push(...group12);
      };

      const addPart1FromSubParts = (subParts: any[]) => {
        if (!Array.isArray(subParts) || subParts.length === 0) return;

        if (subParts.length >= 2) {
          subParts.forEach((subPart: any, index: number) => {
            const hintedBucket = resolvePart1BucketFromHint(subPart);
            const bucket = hintedBucket ?? (index === 0 ? 0 : 1);
            const collected = extractQuestionsFromPart(subPart);
            if (bucket === 0) part11.push(...collected);
            else part12.push(...collected);
          });
          return;
        }

        const singleSubPart = subParts[0];
        const singleCollected = extractQuestionsFromPart(singleSubPart);
        const hintedBucket = resolvePart1BucketFromHint(singleSubPart);
        if (hintedBucket === 0) {
          part11.push(...singleCollected);
          return;
        }
        if (hintedBucket === 1) {
          part12.push(...singleCollected);
          return;
        }

        // Unknown hint: keep 1.1/1.2 balanced instead of sending all to 1.1.
        if (part11.length <= part12.length) {
          part11.push(...singleCollected);
        } else {
          part12.push(...singleCollected);
        }
      };

      const part1Sections = Array.isArray(speaking?.part1?.sections)
        ? speaking.part1.sections
        : [];
      part1Sections.forEach((section: any) => {
        const subParts = Array.isArray(section?.subParts) ? section.subParts : [];
        addPart1FromSubParts(subParts);

        const directQuestions = Array.isArray(section?.questions)
          ? section.questions
          : [];
        if (subParts.length === 0 && directQuestions.length > 0) {
          appendSplitPart1(
            directQuestions.map((q: any, index: number) =>
              toAnswerItem(q, `Soru ${part11.length + part12.length + index + 1}`)
            )
          );
        }
      });

      if (part11.length === 0 && part12.length === 0 && speaking?.part1) {
        const topLevelSubParts = Array.isArray((speaking as any)?.part1?.subParts)
          ? (speaking as any).part1.subParts
          : [];
        addPart1FromSubParts(topLevelSubParts);

        const topLevelQuestions = Array.isArray((speaking as any)?.part1?.questions)
          ? (speaking as any).part1.questions
          : [];
        if (topLevelSubParts.length === 0 && topLevelQuestions.length > 0) {
          appendSplitPart1(
            topLevelQuestions.map((q: any, index: number) =>
              toAnswerItem(q, `Soru ${part11.length + part12.length + index + 1}`)
            )
          );
        }
      }

      const part2 = extractQuestionsFromPart(speaking?.part2);
      const part3 = extractQuestionsFromPart(speaking?.part3);

      if (
        part11.length === 0 &&
        part12.length === 0 &&
        part2.length === 0 &&
        part3.length === 0
      ) {
        const structuredParts = Array.isArray((speaking as any)?.parts)
          ? (speaking as any).parts
          : Array.isArray((speaking as any)?.sections)
            ? (speaking as any).sections
            : [];

        if (structuredParts.length > 0) {
          const firstPart =
            structuredParts.find((part: any) =>
              String(part?.type || "").toUpperCase().includes("PART1")
            ) || structuredParts[0];
          const secondPart =
            structuredParts.find((part: any) =>
              String(part?.type || "").toUpperCase().includes("PART2")
            ) || structuredParts[1];
          const thirdPart =
            structuredParts.find((part: any) =>
              String(part?.type || "").toUpperCase().includes("PART3")
            ) || structuredParts[2];

          const firstSubParts = Array.isArray(firstPart?.subParts) ? firstPart.subParts : [];
          if (firstSubParts.length > 0) {
            addPart1FromSubParts(firstSubParts);
          } else {
            const firstCollected = extractQuestionsFromPart(firstPart);
            appendSplitPart1(firstCollected);
          }

          part2.push(...extractQuestionsFromPart(secondPart));
          part3.push(...extractQuestionsFromPart(thirdPart));

          const trailingParts = structuredParts.filter(
            (part: any) => part !== firstPart && part !== secondPart && part !== thirdPart
          );
          trailingParts.forEach((part: any) => {
            part3.push(...extractQuestionsFromPart(part));
          });
        }
      }

      let normalizedPart11 = dedupeByQuestionId(part11);
      let normalizedPart12 = dedupeByQuestionId(part12);
      if (normalizedPart12.length === 0 && normalizedPart11.length > 3) {
        normalizedPart12 = normalizedPart11.slice(3);
        normalizedPart11 = normalizedPart11.slice(0, 3);
      } else {
        if (normalizedPart11.length > 3 && normalizedPart12.length < 3) {
          const needed = 3 - normalizedPart12.length;
          const overflow = normalizedPart11.slice(3, 3 + needed);
          normalizedPart12 = [...normalizedPart12, ...overflow];
        }
        normalizedPart11 = normalizedPart11.slice(0, 3);
        normalizedPart12 = normalizedPart12.slice(0, 3);
      }

      return [
        normalizedPart11,
        normalizedPart12,
        dedupeByQuestionId(part2),
        dedupeByQuestionId(part3),
      ];
    };

    const buildLegacyParts = (): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => {
      const legacyAnswers = Array.isArray((speaking as any)?.answers)
        ? (speaking as any).answers
        : Array.isArray((speaking as any)?.questions)
          ? (speaking as any).questions
          : [];
      const normalizedLegacy = legacyAnswers.map((answer: any, index: number) =>
        toAnswerItem(answer, `Soru ${index + 1}`, index + 1)
      );
      const grouped = splitAnswersByOrder(normalizedLegacy);
      const hasGroupedContent = grouped.some((group) => group.length > 0);
      return hasGroupedContent
        ? grouped
        : ([normalizedLegacy, [], [], []] as [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]]);
    };

    const collectStructuredAnswerSources = (): SpeakingAnswerItem[] => {
      const collected: SpeakingAnswerItem[] = [];
      const seen = new WeakSet<object>();

      const walk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        if (typeof node !== "object") return;
        if (seen.has(node)) return;
        seen.add(node);

        const questions = Array.isArray((node as any).questions) ? (node as any).questions : [];
        questions.forEach((question: any, index: number) => {
          collected.push(toAnswerItem(question, `Soru ${collected.length + index + 1}`));
        });

        walk((node as any).subParts);
        walk((node as any).sections);
        walk((node as any).parts);
      };

      walk((speaking as any)?.part1);
      walk((speaking as any)?.part2);
      walk((speaking as any)?.part3);
      walk((speaking as any)?.parts);
      walk((speaking as any)?.sections);
      return collected;
    };

    const parts = (() => {
      const structured = buildPartsFromBackend();
      const legacy = buildLegacyParts();
      const sessionBased = buildSessionParts();

      const structuredTotal = structured.reduce((sum, group) => sum + group.length, 0);
      const legacyTotal = legacy.reduce((sum, group) => sum + group.length, 0);
      const sessionTotal = sessionBased.reduce((sum, group) => sum + group.length, 0);
      const legacyMeaningful = countMeaningfulAnswers(legacy);
      const sessionMeaningful = countMeaningfulAnswers(sessionBased);

      // Keep section mapping stable: prefer backend structured layout whenever present.
      let selected: [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] =
        structuredTotal > 0 ? structured : legacy;

      if (structuredTotal === 0) {
        if (sessionMeaningful > legacyMeaningful) {
          selected = sessionBased;
        } else if (legacyTotal > 0) {
          selected = legacy;
        } else if (sessionTotal > 0) {
          selected = sessionBased;
        }
      }

      return selected;
    })();

    const repairSpeakingPartAnswers = (
      baseParts: [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]]
    ): [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]] => {
      const sources = [
        ...baseParts.flat(),
        ...collectStructuredAnswerSources(),
        ...buildSessionParts().flat(),
        ...buildLegacyParts().flat(),
        ...buildPartsFromBackend().flat(),
      ];

      const byQuestionId = new Map<string, string>();

      const setIfBetter = (target: Map<string, string>, key: string, value: string) => {
        const existing = target.get(key);
        if (!existing || value.length >= existing.length) {
          target.set(key, value);
        }
      };

      sources.forEach((item) => {
        const text = String(item?.userAnswer ?? "").trim();
        if (!isMeaningfulSpeakingAnswer(text)) return;

        const qid = String(item?.questionId || "").trim();
        if (qid) setIfBetter(byQuestionId, qid, text);
      });

      const repaired = baseParts.map((group) =>
        group.map((item) => {
          const existing = String(item?.userAnswer || "").trim();
          if (isMeaningfulSpeakingAnswer(existing)) return item;

          const qid = String(item?.questionId || "").trim();
          if (!qid || !byQuestionId.has(qid)) return item;
          const replacement = String(byQuestionId.get(qid) || "").trim();
          if (!isMeaningfulSpeakingAnswer(replacement)) return item;
          return { ...item, userAnswer: replacement };
        })
      ) as [SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[], SpeakingAnswerItem[]];

      return repaired;
    };

    const displayParts = repairSpeakingPartAnswers(parts);

    const visiblePartEntries = displayParts
      .map((questions, index) => ({ index, questions }))
      .filter((entry) => entry.questions.length > 0);

    const effectiveActiveSpeakingPart =
      displayParts[activeSpeakingPart]?.length > 0
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
        displayParts[effectiveActiveSpeakingPart] &&
        displayParts[effectiveActiveSpeakingPart].length > 0
      ) {
        const partQuestions = displayParts[effectiveActiveSpeakingPart];
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
        const sectionNarrative = getSpeakingSectionNarrative(effectiveActiveSpeakingPart);
        
        // Handle both string and object formats for aiFeedback
        if (typeof aiFeedback === 'string') {
          const extracted = extractFeedbackSection(aiFeedback, feedbackKey);
          partFeedback = extracted;
        } else if (aiFeedback && typeof aiFeedback === 'object') {
          const rawFeedback =
            sectionNarrative ||
            (aiFeedback as any)?.[feedbackKey] ||
            (aiFeedback as any)?.taskAchievement ||
            `${partLabel.main} geri bildirimi burada gösterilecek`;
          partFeedback = typeof rawFeedback === 'string' ? removeBullets(rawFeedback) : rawFeedback;
        } else {
          partFeedback = `${partLabel.main} geri bildirimi burada gösterilecek`;
        }
        
        return {
          question: currentAnswer?.questionText || `${partLabel.main} Sorusu ${currentQuestionIndex + 1}`,
          answer: isMeaningfulSpeakingAnswer(currentAnswer?.userAnswer)
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
        const rawFeedback =
          extractFeedbackSection(aiFeedback, "general") ||
          (aiFeedback as any)?.part1 ||
          (aiFeedback as any)?.taskAchievement ||
          "Geri bildirim mevcut değil";
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
              {displayParts[effectiveActiveSpeakingPart] && 
               displayParts[effectiveActiveSpeakingPart].length > 1 && 
               (effectiveActiveSpeakingPart === 0 || effectiveActiveSpeakingPart === 1) && (
                <div className="flex flex-wrap gap-2">
                  {displayParts[effectiveActiveSpeakingPart].map((question: SpeakingAnswerItem, index: number) => {
                    const orderLabel =
                      extractNumericOrder(question?.questionOrder) || index + 1;
                    return (
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
                      Soru {orderLabel}
                    </Button>
                    );
                  })}
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
              const rawGeneralFeedback = extractFeedbackSection(aiFeedback, "general");
              const generalFeedback =
                rawGeneralFeedback && !isPlaceholderText(rawGeneralFeedback)
                  ? sanitizeGeneralFeedback(rawGeneralFeedback)
                  : "";
              if (!generalFeedback && !structuredGeneralFeedback) return null;

              return (
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-base sm:text-lg font-semibold tracking-tight text-gray-900 mb-4">Performans Özeti</h2>
                  {structuredGeneralFeedback ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      {structuredGeneralFeedback.ozet && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Özet</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {structuredGeneralFeedback.ozet}
                          </p>
                        </div>
                      )}

                      {structuredGeneralFeedback.tekrar_eden_eksikler.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Tekrar Eden Eksikler</h4>
                          <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {structuredGeneralFeedback.tekrar_eden_eksikler.map((item, idx) => (
                              <li key={`overall-speaking-eksik-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {structuredGeneralFeedback.alinti_duzeltme.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-2">İyileştirmeler</h4>
                          <div className="space-y-3">
                            {structuredGeneralFeedback.alinti_duzeltme.map((item, idx) => (
                              <div
                                key={`overall-speaking-rewrite-${idx}`}
                                className="rounded-lg border border-gray-200 bg-gray-100 p-3"
                              >
                                {item.alinti && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Alıntı</p>
                                    <p className="text-red-600 font-medium whitespace-pre-wrap mb-2">
                                      "{item.alinti}"
                                    </p>
                                  </>
                                )}
                                {item.duzeltilmis && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Düzeltilmiş Versiyon</p>
                                    <p className="text-green-700 whitespace-pre-wrap mb-2">
                                      {item.duzeltilmis}
                                    </p>
                                  </>
                                )}
                                {item.neden && (
                                  <>
                                    <p className="text-xs font-semibold text-black mb-1">Neden Düzelttik?</p>
                                    <p className="text-gray-700 whitespace-pre-wrap">{item.neden}</p>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {structuredGeneralFeedback.egzersizler.length > 0 && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Önerilen Egzersizler</h4>
                          <div className="space-y-2">
                            {structuredGeneralFeedback.egzersizler.map((item, idx) => (
                              <div
                                key={`overall-speaking-exercise-${idx}`}
                                className="rounded-md border border-gray-200 bg-white p-3"
                              >
                                <p className="font-semibold text-black">{idx + 1}. {item.baslik || "Egzersiz"}</p>
                                {item.uygulama && (
                                  <p className="text-gray-700 mt-1 whitespace-pre-wrap">{item.uygulama}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {structuredGeneralFeedback.kapanis && (
                        <div>
                          <h4 className="font-bold text-black mb-1">Son Not</h4>
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {structuredGeneralFeedback.kapanis}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{removeBullets(generalFeedback)}</p>
                    </div>
                  )}
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





