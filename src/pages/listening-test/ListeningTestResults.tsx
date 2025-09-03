"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Trophy,
  Target,
  Clock,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";

interface TestResultData {
  id: string;
  userId: string;
  testId: string;
  score: number;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  userAnswers: UserAnswerResult[];
}

interface UserAnswerResult {
  id: string;
  resultId: string;
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  createdAt: string;
  updatedAt: string;
  question: {
    id: string;
    sectionId: string;
    number: number;
    content: string | null;
    text: string;
    type: string;
    createdAt: string;
    updatedAt: string;
    answers: {
      id: string;
      questionId: string;
      variantText: string;
      answer: string;
      correct: boolean;
      createdAt: string;
      updatedAt: string;
    }[];
  };
}

export default function ListeningResultPage() {
  const { resultId } = useParams<{ resultId: string }>();
  const [data, setData] = useState<TestResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useNavigate();

  useEffect(() => {
    if (!resultId) return;

    // Mock data for demo - replace with actual API call
    const mockData: TestResultData = {
      id: "mock-result-id",
      userId: "user-123",
      testId: "test-456",
      score: 7.5,
      startedAt: "2025-01-09T10:00:00Z",
      completedAt: "2025-01-09T10:40:00Z",
      createdAt: "2025-01-09T10:40:00Z",
      updatedAt: "2025-01-09T10:40:00Z",
      userAnswers: [
        {
          id: "answer-1",
          resultId: "mock-result-id",
          questionId: "q1",
          userAnswer: "Mushuk",
          isCorrect: true,
          createdAt: "2025-01-09T10:40:00Z",
          updatedAt: "2025-01-09T10:40:00Z",
          question: {
            id: "q1",
            sectionId: "s1",
            number: 1,
            content: null,
            text: "S1 - Multiple choice savol",
            type: "MULTIPLE_CHOICE",
            createdAt: "2025-01-09T10:00:00Z",
            updatedAt: "2025-01-09T10:00:00Z",
            answers: [
              {
                id: "a1",
                questionId: "q1",
                variantText: "A",
                answer: "Mushuk",
                correct: true,
                createdAt: "2025-01-09T10:00:00Z",
                updatedAt: "2025-01-09T10:00:00Z",
              },
            ],
          },
        },
        {
          id: "answer-2",
          resultId: "mock-result-id",
          questionId: "q2",
          userAnswer: "FALSE",
          isCorrect: false,
          createdAt: "2025-01-09T10:40:00Z",
          updatedAt: "2025-01-09T10:40:00Z",
          question: {
            id: "q2",
            sectionId: "s2",
            number: 2,
            content: null,
            text: "True/False savol",
            type: "TRUE_FALSE",
            createdAt: "2025-01-09T10:00:00Z",
            updatedAt: "2025-01-09T10:00:00Z",
            answers: [
              {
                id: "a2",
                questionId: "q2",
                variantText: "True",
                answer: "TRUE",
                correct: true,
                createdAt: "2025-01-09T10:00:00Z",
                updatedAt: "2025-01-09T10:00:00Z",
              },
            ],
          },
        },
      ],
    };

    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, [resultId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Natijalar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Natijalar topilmadi</h2>
          <p className="text-muted-foreground mb-4">
            Iltimos, qaytadan urinib ko'ring
          </p>
          <Button onClick={() => router("/tests")} variant="outline">
            Testlarga qaytish
          </Button>
        </Card>
      </div>
    );
  }

  const correctAnswers = data.userAnswers.filter((ua) => ua.isCorrect).length;
  const totalQuestions = data.userAnswers.length;
  const accuracyPercentage =
    totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const testDuration =
    new Date(data.completedAt).getTime() - new Date(data.startedAt).getTime();
  const durationMinutes = Math.floor(testDuration / (1000 * 60));

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 8)
      return {
        variant: "default" as const,
        text: "Excellent",
        color: "bg-green-100 text-green-800",
      };
    if (score >= 6.5)
      return {
        variant: "secondary" as const,
        text: "Good",
        color: "bg-yellow-100 text-yellow-800",
      };
    return {
      variant: "destructive" as const,
      text: "Needs Improvement",
      color: "bg-red-100 text-red-800",
    };
  };

  const scoreBadge = getScoreBadge(data.score);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router(-1)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Orqaga
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Test Natijalari
                </h1>
                <p className="text-muted-foreground">
                  Listening Test - Batafsil hisobot
                </p>
              </div>
            </div>
            <Badge className={scoreBadge.color}>{scoreBadge.text}</Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Score Overview */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Trophy
                      className={`w-10 h-10 ${getScoreColor(data.score)}`}
                    />
                  </div>
                  <CardTitle className="text-3xl font-bold">
                    <span className={getScoreColor(data.score)}>
                      {data.score}
                    </span>
                    <span className="text-muted-foreground text-lg">
                      {" "}
                      / 9.0
                    </span>
                  </CardTitle>
                  <p className="text-muted-foreground">Umumiy Ball</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* <Separator /> */}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Target className="w-4 h-4 text-green-600" />
                        <span className="font-semibold text-green-600">
                          {correctAnswers}
                        </span>
                      </div>
                      <p className="text-muted-foreground">To'g'ri</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="font-semibold text-red-600">
                          {totalQuestions - correctAnswers}
                        </span>
                      </div>
                      <p className="text-muted-foreground">Noto'g'ri</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Aniqlik</span>
                      <span className="font-semibold">
                        {accuracyPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={accuracyPercentage} className="h-2" />
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Vaqt: {durationMinutes} daqiqa</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Performance Insights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Tahlil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Multiple Choice</span>
                      <Badge variant="outline" className="text-xs">
                        {
                          data.userAnswers.filter(
                            (ua) =>
                              ua.question.type === "MULTIPLE_CHOICE" &&
                              ua.isCorrect
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
                    <div className="flex items-center justify-between">
                      <span className="text-sm">True/False</span>
                      <Badge variant="outline" className="text-xs">
                        {
                          data.userAnswers.filter(
                            (ua) =>
                              ua.question.type === "TRUE_FALSE" && ua.isCorrect
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
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Detailed Results */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Batafsil Javoblar
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    Har bir savol uchun sizning javobingiz va to'g'ri javob
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.userAnswers.map((ua, index) => (
                      <motion.div
                        key={ua.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card
                          className={`border-l-4 ${
                            ua.isCorrect
                              ? "border-l-green-500 bg-green-50/50"
                              : "border-l-red-500 bg-red-50/50"
                          }`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Savol {ua.question.number}
                                </Badge>
                                <Badge
                                  variant={
                                    ua.question.type === "MULTIPLE_CHOICE"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {ua.question.type.replace("_", " ")}
                                </Badge>
                              </div>
                              {ua.isCorrect ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                              )}
                            </div>

                            <h4 className="font-semibold text-foreground mb-3">
                              {ua.question.text}
                            </h4>

                            <div className="space-y-2">
                              <div className="flex items-start gap-2">
                                <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                                  Sizning javob:
                                </span>
                                <span
                                  className={`text-sm font-medium ${
                                    ua.isCorrect
                                      ? "text-green-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {ua.userAnswer}
                                </span>
                              </div>

                              {!ua.isCorrect &&
                                ua.question.answers.length > 0 && (
                                  <div className="flex items-start gap-2">
                                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">
                                      To'g'ri javob:
                                    </span>
                                    <span className="text-sm font-medium text-green-700">
                                      {ua.question.answers
                                        .filter((a) => a.correct)
                                        .map((a) => a.answer)
                                        .join(", ")}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-center gap-4 mt-8"
        >
          <Button variant="outline" onClick={() => router("/tests")}>
            Boshqa testlar
          </Button>
          <Button onClick={() => window.print()}>Natijani chop etish</Button>
        </motion.div>
      </div>
    </div>
  );
}
