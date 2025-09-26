import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Trophy,
  Clock,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { listeningSubmissionService, type TestResultData } from "@/services/listeningTest.service";

export default function ListeningResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [data, setData] = useState<TestResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useNavigate();
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


  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Natijalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <Card className="p-8 text-center shadow-lg border-red-300 bg-white">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Natijalar topilmadi</h2>
          <p className="text-muted-foreground mb-4">
            Iltimos, qaytadan urinib ko'ring
          </p>
          <Button
            onClick={() => router("/tests")}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Testlarga qaytish
          </Button>
        </Card>
      </div>
    );
  }

  const correctAnswers = data.userAnswers.filter((ua) => ua.isCorrect).length;
  const totalQuestions = data.userAnswers.length;
  const accuracyPercentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const testDuration =
    new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime();
  const durationMinutes = Math.floor(testDuration / (1000 * 60));

  const getScoreBadge = (score: number) => {
    if (score >= 8)
      return { text: "Excellent", color: "bg-green-600 text-white" };
    if (score >= 6.5)
      return { text: "Good", color: "bg-yellow-500 text-white" };
    return { text: "Needs Improvement", color: "bg-red-600 text-white" };
  };

  const scoreBadge = getScoreBadge(data.score);

  return (
    <div className="min-h-screen  ">
      <header className="bg-white border-b border-red-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router(-1)}
                className="flex items-center gap-2 border-red-300 text-red-600 "
              >
                <ArrowLeft className="w-4 h-4" />
                Orqaga
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-red-700">
                  Listening Test Natijalari
                </h1>
                <p className="text-muted-foreground text-sm">
                  IELTS uslubida hisobot
                </p>
              </div>
            </div>
            <Badge className={`${scoreBadge.color} px-3 py-1 rounded-full`}>
              {scoreBadge.text}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 bg-white" >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Score Overview */}
          <div className="lg:col-span-1 ">
            <Card className="text-center shadow-lg border-red-200 bg-white">
              <CardHeader>
                <div className="mx-auto w-20 h-20  rounded-full flex items-center justify-center mb-4">
                  <Trophy className="w-10 h-10 text-red-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-red-700">
                  {summary?.score ?? data.score} <span className="text-lg">/ 9.0</span>
                </CardTitle>
                <p className="text-muted-foreground">Umumiy Ball</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-green-600">
                      {summary?.correctCount ?? correctAnswers}
                    </p>
                    <p className="text-muted-foreground">To‘g‘ri</p>
                  </div>
                  <div>
                    <p className="font-semibold text-red-600">
                      {(summary?.totalQuestions ?? totalQuestions) - (summary?.correctCount ?? correctAnswers)}
                    </p>
                    <p className="text-muted-foreground">Noto‘g‘ri</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Aniqlik</span>
                    <span className="font-semibold">
                      {(() => {
                        const sCorrect = summary?.correctCount ?? correctAnswers;
                        const sTotal = summary?.totalQuestions ?? (totalQuestions || 1);
                        return ((sCorrect / sTotal) * 100).toFixed(1);
                      })()}%
                    </span>
                  </div>
                  <Progress
                    value={(() => {
                      const sCorrect = summary?.correctCount ?? correctAnswers;
                      const sTotal = summary?.totalQuestions ?? (totalQuestions || 1);
                      return (sCorrect / sTotal) * 100;
                    })()}
                    className="h-2"
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Vaqt: {durationMinutes} daqiqa</span>
                </div>
                {summary?.message && (
                  <div className="text-xs text-muted-foreground">{summary.message}</div>
                )}
                {summary?.testResultId && (
                  <div className="text-xs text-muted-foreground">ID: {summary.testResultId}</div>
                )}
              </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card className="mt-6 shadow-lg border-red-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-red-700">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  Tahlil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Multiple Choice</span>
                  <Badge variant="outline" className="text-xs">
                    {
                      data.userAnswers.filter(
                        (ua) =>
                          ua.question.type === "MULTIPLE_CHOICE" && ua.isCorrect
                      ).length
                    }
                    /
                    {
                      data.userAnswers.filter(
                        (ua) => ua.question.type === "MULTIPLE_CHOICE"
                      ).length
                    }
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Doğru/Yanlış</span>
                  <Badge variant="outline" className="text-xs">
                    {
                      data.userAnswers.filter(
                        (ua) => ua.question.type === "TRUE_FALSE" && ua.isCorrect
                      ).length
                    }
                    /
                    {
                      data.userAnswers.filter(
                        (ua) => ua.question.type === "TRUE_FALSE"
                      ).length
                    }
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Removed results list per requirement */}
          </div>

          <div className="lg:col-span-2">
            <Card className="shadow-lg border-red-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <BookOpen className="w-5 h-5 text-red-600" />
                  Batafsil Javoblar
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Har bir savol uchun sizning javobingiz va to‘g‘ri javob
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.userAnswers.map((ua) => (
                    <Card
                      key={ua.id}
                      className={`border-l-4 ${ua.isCorrect
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                        } shadow-sm`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              Savol {ua.question.number}
                            </Badge>
                            <Badge
                              className="text-xs bg-red-100 text-red-700 border border-red-300"
                            >
                              {ua.question.type.replace("_", " ")}
                            </Badge>
                          </div>
                          {ua.isCorrect ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <h4 className="font-semibold text-foreground mb-3">
                          {ua.question.text}
                        </h4>
                        <div className="space-y-2">
                          <p
                            className={`text-sm font-medium ${ua.isCorrect ? "text-green-700" : "text-red-700"
                              }`}
                          >
                            Sizning javob: {ua.userAnswer}
                          </p>
                          {!ua.isCorrect && ua.question.answers.length > 0 && (
                            <p className="text-sm font-medium text-green-700">
                              To‘g‘ri javob:{" "}
                              {ua.question.answers
                                .filter((a) => a.correct)
                                .map((a) => a.answer)
                                .join(", ")}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-center gap-4 mt-8"
        >
          <Button
            variant="outline"
            onClick={() => router("/test")}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Boshqa testlar
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => window.print()}
          >
            Natijani chop etish
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
