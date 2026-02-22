import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { listeningSubmissionService, type TestResultData as ListeningTestResultData } from "@/services/listeningTest.service";
import { readingSubmissionService, type TestResultData as ReadingTestResultData } from "@/services/readingTest.service";
import writingSubmissionService from "@/services/writingSubmission.service";
import speakingSubmissionService from "@/services/speakingSubmission.service";

interface OverallResultsData {
  listeningResultId?: string;
  readingResultId?: string;
  writingResultId?: string;
  speakingResultId?: string;
}

interface WritingResult {
  id: string;
  score?: number;
  aiFeedback?: {
    taskAchievement: string;
    coherenceAndCohesion: string;
    lexicalResource: string;
    grammaticalRangeAndAccuracy: string;
  };
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  userId: string;
  writingTestId: string;
  answers?: Array<{
    questionId: string;
    questionText: string;
    section: {
      id: string;
      title: string;
      description: string;
      order: number;
    };
    userAnswer: string;
  }>;
}

interface SpeakingResult {
  id: string;
  userId: string;
  speakingTestId: string;
  score?: number;
  aiFeedback?: {
    taskAchievement?: string;
    coherenceAndCohesion?: string;
    lexicalResource?: string;
    grammaticalRangeAndAccuracy?: string;
  };
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function UnifiedTestResults() {
  const { overallId } = useParams<{ overallId: string }>();
  const [overallData, setOverallData] = useState<OverallResultsData | null>(null);
  const [listeningData, setListeningData] = useState<ListeningTestResultData | null>(null);
  const [readingData, setReadingData] = useState<ReadingTestResultData | null>(null);
  const [writingData, setWritingData] = useState<WritingResult | null>(null);
  const [speakingData, setSpeakingData] = useState<SpeakingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("listening");

  useEffect(() => {
    if (!overallId) return;

    const fetchAllResults = async () => {
      setLoading(true);
      try {
        // For now, we'll simulate the overall data structure
        // In a real implementation, you would fetch this from your API
        const overall = {
          listeningResultId: overallId + "_listening",
          readingResultId: overallId + "_reading", 
          writingResultId: overallId + "_writing",
          speakingResultId: overallId + "_speaking"
        };
        setOverallData(overall);

        // Fetch individual test results
        const promises = [];

        if (overall.listeningResultId) {
          promises.push(
            listeningSubmissionService.getExamResults(overall.listeningResultId)
              .then(data => setListeningData(data))
              .catch(err => console.error("Error fetching listening results:", err))
          );
        }

        if (overall.readingResultId) {
          promises.push(
            readingSubmissionService.getExamResults(overall.readingResultId)
              .then(data => setReadingData(data))
              .catch(err => console.error("Error fetching reading results:", err))
          );
        }

        if (overall.writingResultId) {
          promises.push(
            writingSubmissionService.getById(overall.writingResultId)
              .then(data => setWritingData(data as any))
              .catch(err => console.error("Error fetching writing results:", err))
          );
        }

        if (overall.speakingResultId) {
          promises.push(
            speakingSubmissionService.getById(overall.speakingResultId)
              .then(data => setSpeakingData(data))
              .catch(err => console.error("Error fetching speaking results:", err))
          );
        }

        await Promise.all(promises);
      } catch (error) {
        console.error("Error fetching results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllResults();
  }, [overallId]);

  const renderListeningResults = () => {
    if (!listeningData) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Dinleme testi sonuçlarý mevcut deðil</p>
        </div>
      );
    }

    const examData = listeningData.userAnswers?.map((ua, index) => {
      const correctAnswer = ua.question.answers.find(a => a.correct);
      return {
        no: index + 1,
        userAnswer: ua.userAnswer || "Seçilmedi",
        correctAnswer: correctAnswer?.variantText || correctAnswer?.answer || "",
        result: ua.isCorrect ? "Doðru" : "Yanlýþ"
      };
    }) || [];

    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Dinleme Puaný: {listeningData.score || 0}
            {listeningData.userAnswers && (
              <span className="ml-3 text-base text-muted-foreground">
                ({listeningData.userAnswers.filter(u => u.isCorrect).length} / {listeningData.userAnswers.length} doðru)
              </span>
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
                    <th className="px-4 py-3 text-left font-medium">Kullanýcý Cevabý</th>
                    <th className="px-4 py-3 text-left font-medium">Doðru Cevap</th>
                    <th className="px-4 py-3 text-left font-medium rounded-tr-lg">Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {examData.map((item, index) => (
                    <tr
                      key={item.no}
                      className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.no}</td>
                      <td className="px-4 py-3 text-gray-600">{item.userAnswer}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.correctAnswer}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.result === "Doðru" 
                            ? "bg-green-100 text-green-800" 
                            : item.result === "Yanlýþ" 
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

  const renderReadingResults = () => {
    if (!readingData) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Okuma testi sonuçlarý mevcut deðil</p>
        </div>
      );
    }

    const examData = readingData.userAnswers?.map((ua, index) => {
      const correctAnswer = ua.question.answers.find(a => a.correct);
      return {
        no: index + 1,
        userAnswer: ua.userAnswer || "Seçilmedi",
        correctAnswer: correctAnswer?.variantText || correctAnswer?.answer || "",
        result: ua.isCorrect ? "Doðru" : "Yanlýþ"
      };
    }) || [];

    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">
            Okuma Puaný: {readingData.score || 0}
            {readingData.userAnswers && (
              <span className="ml-3 text-base text-muted-foreground">
                ({readingData.userAnswers.filter(u => u.isCorrect).length} / {readingData.userAnswers.length} doðru)
              </span>
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
                    <th className="px-4 py-3 text-left font-medium">Kullanýcý Cevabý</th>
                    <th className="px-4 py-3 text-left font-medium">Doðru Cevap</th>
                    <th className="px-4 py-3 text-left font-medium rounded-tr-lg">Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {examData.map((item, index) => (
                    <tr
                      key={item.no}
                      className={`border-b border-gray-200 last:border-b-0 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                    >
                      <td className="px-4 py-3 text-gray-700 font-medium">{item.no}</td>
                      <td className="px-4 py-3 text-gray-600">{item.userAnswer}</td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{item.correctAnswer}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.result === "Doðru" 
                            ? "bg-green-100 text-green-800" 
                            : item.result === "Yanlýþ" 
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
    if (!writingData) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Yazma testi sonuçlarý mevcut deðil</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl font-bold">
              {writingData.score ?? "0"}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-black mb-2">Yazma Testi Tamamlandý!</h2>
          <p className="text-gray-600 text-lg mb-6">IELTS Yazma Deðerlendirmesi Sonuçlarýnýz</p>
        </div>

        {writingData.answers && writingData.answers.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-foreground">Cevaplarýnýz</h3>
            {writingData.answers.map((answer, index) => (
              <Card key={answer.questionId} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Soru {index + 1}</span>
                  </div>

                  {/* Render description above question text for sections 1.1 and 1.2 */}
                  {(answer.section.order === 1 || answer.section.title.includes("1.1") || answer.section.title.includes("1.2")) && answer.section.description && (
                    <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <h4 className="font-medium text-gray-800 mb-2">Görev Açýklamasý:</h4>
                      <p className="text-gray-700 whitespace-pre-line">{answer.section.description}</p>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Soru Metni:</h4>
                    <p className="text-blue-700 whitespace-pre-line">{answer.questionText}</p>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Cevabýnýz:</h4>
                    <p className="text-green-700 whitespace-pre-line">{answer.userAnswer || "Cevap verilmedi"}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {writingData.aiFeedback && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-black mb-2">Task Achievement</h3>
              <p className="text-gray-700 leading-relaxed">
                {writingData.aiFeedback.taskAchievement}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-black mb-2">Coherence & Cohesion</h3>
              <p className="text-gray-700 leading-relaxed">
                {writingData.aiFeedback.coherenceAndCohesion}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-black mb-2">Lexical Resource</h3>
              <p className="text-gray-700 leading-relaxed">
                {writingData.aiFeedback.lexicalResource}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-black mb-2">Grammar & Accuracy</h3>
              <p className="text-gray-700 leading-relaxed">
                {writingData.aiFeedback.grammaticalRangeAndAccuracy}
              </p>
            </Card>
          </div>
        )}
      </div>
    );
  };

  const renderSpeakingResults = () => {
    if (!speakingData) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Konuþma testi sonuçlarý mevcut deðil</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-3xl font-bold">
              {speakingData.score ?? "N/A"}
            </span>
          </div>
          <h2 className="text-3xl font-bold text-black mb-2">Konuþma Testi Tamamlandý!</h2>
          <p className="text-gray-600 text-lg mb-6">IELTS Konuþma Deðerlendirmesi Sonuçlarýnýz</p>
        </div>

        {speakingData.aiFeedback && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-black mb-2">Task Achievement</h3>
              <p className="text-gray-700 leading-relaxed">
                {speakingData.aiFeedback.taskAchievement}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-black mb-2">Coherence & Cohesion</h3>
              <p className="text-gray-700 leading-relaxed">
                {speakingData.aiFeedback.coherenceAndCohesion}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-black mb-2">Lexical Resource</h3>
              <p className="text-gray-700 leading-relaxed">
                {speakingData.aiFeedback.lexicalResource}
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold text-black mb-2">Grammar & Accuracy</h3>
              <p className="text-gray-700 leading-relaxed">
                {speakingData.aiFeedback.grammaticalRangeAndAccuracy}
              </p>
            </Card>
          </div>
        )}
      </div>
    );
  };

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

  if (!overallData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Sonuçlar Bulunamadý</h2>
          <p className="text-muted-foreground mb-4">
            Test sonuçlarý yüklenemedi. Lütfen sonuç ID'sini kontrol edin ve tekrar deneyin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Test Sonuçlarý</h1>
          <p className="text-muted-foreground">IELTS test performansýnýzýn kapsamlý özeti</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="listening" className="flex items-center gap-2">
              <span className="hidden sm:inline">Dinleme</span>
              <span className="sm:hidden">L</span>
              {listeningData && (
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  {listeningData.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="reading" className="flex items-center gap-2">
              <span className="hidden sm:inline">Okuma</span>
              <span className="sm:hidden">R</span>
              {readingData && (
                <span className="ml-1 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  {readingData.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="writing" className="flex items-center gap-2">
              <span className="hidden sm:inline">Yazma</span>
              <span className="sm:hidden">W</span>
              {writingData && (
                <span className="ml-1 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                  {writingData.score || 0}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="speaking" className="flex items-center gap-2">
              <span className="hidden sm:inline">Konuþma</span>
              <span className="sm:hidden">S</span>
              {speakingData && (
                <span className="ml-1 text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full">
                  {speakingData.score || 0}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listening" className="mt-6">
            <Card className="p-6">
              {renderListeningResults()}
            </Card>
          </TabsContent>

          <TabsContent value="reading" className="mt-6">
            <Card className="p-6">
              {renderReadingResults()}
            </Card>
          </TabsContent>

          <TabsContent value="writing" className="mt-6">
            <Card className="p-6">
              {renderWritingResults()}
            </Card>
          </TabsContent>

          <TabsContent value="speaking" className="mt-6">
            <Card className="p-6">
              {renderSpeakingResults()}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

