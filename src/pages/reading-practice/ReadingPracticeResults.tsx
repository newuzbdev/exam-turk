import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  BookMarked,
  CheckCircle2,
  Clock3,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  readingPracticeService,
  type ReadingPracticeAttemptResult,
} from "@/services/readingPractice.service";
import { StatusPill, Surface, tm } from "@/components/tm";

const PRACTICE_HOME_PATH = "/app/pratik";
const PRACTICE_BASE_PATH = "/app/pratik/okuma";

function groupTypeLabel(type: string) {
  const labels: Record<string, string> = {
    MATCHING_HEADINGS: "Paragraf Başlığı Eşleştirme",
    MULTIPLE_CHOICE: "Çoktan Seçmeli",
    TRUE_FALSE_NOT_GIVEN: "Doğru / Yanlış / Verilmemiş",
    FILL_BLANK: "Boşluk Doldurma",
    KELIME_CALISMASI: "Kelime Çalışması",
  };
  return labels[type] || type;
}

function answerText(value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  if (value === null || value === undefined || value === "") return "Boş";
  if (value === "TRUE") return "D";
  if (value === "FALSE") return "Y";
  if (value === "NOT GIVEN") return "V";
  return String(value);
}

function durationText(durationSeconds?: number | null) {
  if (!durationSeconds) return "Süre bilgisi yok";
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes} dk ${seconds} sn`;
}

export default function ReadingPracticeResults() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as { result?: ReadingPracticeAttemptResult; mode?: string } | null;
  const [result, setResult] = useState<ReadingPracticeAttemptResult | null>(state?.result || null);
  const [loading, setLoading] = useState(!state?.result);
  const mode = state?.mode === "sinav" || searchParams.get("mod") === "sinav" ? "sinav" : "calisma";
  const detailsOpen = false;

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    body.classList.remove("exam-mode");
    html.style.overflowY = "";
    body.style.overflowY = "";
  }, []);

  useEffect(() => {
    if (state?.result || !attemptId) return;
    let mounted = true;
    (async () => {
      const data = await readingPracticeService.getAttempt(attemptId);
      if (!mounted) return;
      setResult(data);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [attemptId, state?.result]);

  const paragraphMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const paragraph of result?.passage.paragraphs || []) {
      map.set(paragraph.label, paragraph.text);
    }
    return map;
  }, [result]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--tm-bg-app)]">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[var(--tm-accent)]" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--tm-bg-app)] px-4">
        <Surface className="max-w-lg p-8 text-center">
            <p className="text-xl font-semibold text-[var(--tm-text-primary)]">Sonuç verisi bulunamadı</p>
            <p className="mt-2 text-sm text-[var(--tm-text-secondary)]">
              Bu deneme kaydı silinmiş olabilir veya bağlantı eksik olabilir.
            </p>
            <Button
              className={`${tm.primaryButton} mt-6`}
              onClick={() => navigate(PRACTICE_HOME_PATH)}
            >
              Listeye dön
            </Button>
        </Surface>
      </div>
    );
  }

  return (
    <div className={`${tm.page} min-h-screen bg-[var(--tm-bg-app)] py-8`}>
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <Surface className="p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <StatusPill tone="success">
                  {mode === "sinav" ? "Sınav Modu Sonucu" : "Çalışma Sonucu"}
                </StatusPill>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--tm-text-primary)]">{result.passage.title}</h1>
                {result.passage.passageTitle ? (
                  <p className="mt-2 text-base text-[var(--tm-text-secondary)]">{result.passage.passageTitle}</p>
                ) : null}
                <p className="mt-4 text-sm leading-6 text-[var(--tm-text-secondary)]">
                  {mode === "sinav"
                    ? "Cevapların gönderildi. Sonuç özeti ve soru analizi aşağıda yer alır."
                    : "Önce hata sayını görebilir, istersen aşağıdan doğru cevapları ve açıklamaları açabilirsin."}
                </p>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:w-auto">
                <div className="rounded-md bg-[var(--tm-bg-app)] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--tm-text-tertiary)]">Puan</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--tm-text-primary)]">{result.score}</p>
                </div>
                <div className="rounded-md bg-[var(--tm-bg-app)] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--tm-text-tertiary)]">Doğru</p>
                  <p className="mt-2 text-3xl font-semibold text-green-700">
                    {result.correctAnswers}/{result.totalQuestions}
                  </p>
                </div>
                <div className="rounded-md bg-[var(--tm-bg-app)] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--tm-text-tertiary)]">Hata</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--tm-accent)]">
                    {result.totalQuestions - result.correctAnswers}
                  </p>
                </div>
                <div className="rounded-md bg-[var(--tm-bg-app)] p-5">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--tm-text-tertiary)]">Süre</p>
                  <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-[var(--tm-text-primary)]">
                    <Clock3 className="h-4 w-4 text-[var(--tm-text-secondary)]" />
                    {durationText(result.durationSeconds)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className={tm.primaryButton}
                onClick={() => navigate(`${PRACTICE_BASE_PATH}/${result.passage.id}?mod=${mode}`)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Aynı metni tekrar çöz
              </Button>
              <Button variant="outline" className={tm.subtleButton} onClick={() => navigate(PRACTICE_HOME_PATH)}>
                Listeye dön
              </Button>
              {mode === "calisma" ? (
                <Button
                  variant="outline"
                  className={tm.subtleButton}
                  onClick={() =>
                    navigate(
                      `${PRACTICE_BASE_PATH}/${result.passage.id}?mod=${mode}&incele=1&attemptId=${result.attemptId}`,
                      { state: { result } },
                    )
                  }
                >
                  Hataları ve doğru cevapları aç
                </Button>
              ) : null}
            </div>
        </Surface>

        {detailsOpen ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-gray-200 bg-white">
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-6 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-700" />
                    <h2 className="text-2xl font-bold text-gray-900">Soru analizi</h2>
                  </div>

                  <div className="space-y-5">
                    {result.questionResults.map((question) => (
                      <div
                        key={question.questionId}
                        className={`rounded-3xl border p-5 ${
                          question.isCorrect
                            ? "border-green-200 bg-green-50/40"
                            : "border-red-200 bg-red-50/40"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                                question.isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"
                              }`}
                            >
                              {question.order}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="rounded-full">
                                  {question.groupTitle}
                                </Badge>
                                <Badge variant="outline" className="rounded-full">
                                  {groupTypeLabel(question.questionType)}
                                </Badge>
                              </div>
                              <p className="mt-3 text-sm font-semibold leading-6 text-gray-900">
                                {question.prompt}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
                              question.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {question.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            {question.isCorrect ? "Doğru" : "Yanlış"}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-white bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Senin cevabın</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                              {answerText(question.userAnswer)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white bg-white p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Doğru cevap</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-gray-900">
                              {answerText(question.correctAnswer)}
                            </p>
                          </div>
                        </div>

                        {question.explanation ? (
                          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-amber-700">Açıklama</p>
                            <p className="mt-2 text-sm leading-6 text-amber-900">{question.explanation}</p>
                          </div>
                        ) : null}

                        {question.evidenceParagraphs?.length ? (
                          <div className="mt-4 space-y-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-400">Metinden kanıt</p>
                            {question.evidenceParagraphs.map((label) => (
                              <div
                                key={`${question.questionId}-${label}`}
                                className="rounded-2xl border border-gray-200 bg-white p-4"
                              >
                                <div className="mb-2 inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                                  Paragraf {label}
                                </div>
                                <p className="text-sm leading-6 text-gray-700">
                                  {paragraphMap.get(label) || "Bu paragraf metinde bulunamadı."}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="rounded-[2rem] border-gray-200 bg-white">
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <BookMarked className="h-5 w-5 text-red-600" />
                    <h2 className="text-xl font-bold text-gray-900">Metindeki kelimeler ve anlamları</h2>
                  </div>
                  <div className="space-y-4">
                    {result.glossaryEntries.length ? (
                      result.glossaryEntries.map((entry) => (
                        <div
                          key={`${entry.term}-${entry.order}`}
                          className="rounded-3xl border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-bold text-gray-900">{entry.term}</p>
                            {entry.paragraphLabel ? (
                              <Badge variant="outline" className="rounded-full">
                                {entry.paragraphLabel}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-gray-700">{entry.definition}</p>
                          {entry.simpleDefinition ? (
                            <p className="mt-2 text-sm text-gray-600">Basit anlam: {entry.simpleDefinition}</p>
                          ) : null}
                          {entry.example ? (
                            <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-sm italic text-gray-600">
                              {entry.example}
                            </p>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                        Bu metin için kelime açıklaması eklenmemiş.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
