import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  ListChecks,
  BookOpen,
  Headphones,
} from "lucide-react";
import { toast } from "sonner";
import axiosPrivate from "@/config/api";
import listeningTestService, {
  listeningSubmissionService,
} from "@/services/listeningTest.service";
import DisableKeys from "@/pages/speaking-test/components/DisableKeys";


interface ListeningAnswer {
  id: string;
  questionId: string;
  variantText: string;
  answer: string;
  correct: boolean;
  createdAt: string;
  updatedAt: string;
}

type QuestionCoreType =
  | "MULTIPLE_CHOICE"
  | "MULTI_SELECT"
  | "TEXT_INPUT"
  | "TRUE_FALSE"
  | "NUMBER"
  | "MATCHING"
  | "FILL_BLANK";

interface ListeningQuestion {
  id: string;
  sectionId: string;
  number: number;
  content: string | null;
  text: string;
  type: QuestionCoreType;
  createdAt: string;
  updatedAt: string;
  answers: ListeningAnswer[];
}

interface ListeningSection {
  id: string;
  partId: string;
  title: string;
  content: string;
  hasBullets: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  questions: ListeningQuestion[];
}

interface ListeningPart {
  id: string;
  testId: string;
  number: number;
  title: string;
  description: string | null;
  audioUrl: string | null;
  createdAt: string;
  updatedAt: string;
  sections: ListeningSection[];
}

interface ListeningTestItem {
  id: string;
  title: string;
  type: "LISTENING";
  description: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  adminId: string | null;
  ieltsId: string;
  parts: ListeningPart[];
}


const FILE_BASE = "https://api.turkcetest.uz/files/";
const AUTO_SAVE_KEY = "listening_test_answers_v1";


const formatTime = (seconds: number) => {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const rem = Math.max(0, seconds) % 60;
  return `${minutes}:${rem < 10 ? "0" : ""}${rem}`;
};

function resolveFileUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return FILE_BASE + url.replace(/^\/+/, "");
}

function getGlobalTokenFromAxios() {
  try {
    const auth = axiosPrivate.defaults?.headers?.common?.Authorization;
    if (auth && typeof auth === "string" && auth.startsWith("Bearer ")) {
      return auth.slice("Bearer ".length);
    }
  } catch { }
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    undefined
  );
}

const Q = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  MULTI_SELECT: "MULTI_SELECT",
  TEXT_INPUT: "TEXT_INPUT",
  TRUE_FALSE: "TRUE_FALSE",
  NUMBER: "NUMBER",
  MATCHING: "MATCHING",
  FILL_BLANK: "FILL_BLANK",
} as const;

type AnswersState = Record<string, string | string[]>;


export default function ListeningTestPage({
  testId,
  testData,
}: {
  testId?: string;
  testData?: ListeningTestItem;
}) {
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(testData || null);
  const [loading, setLoading] = useState<boolean>(!testData);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(0);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  const [timeLeft, setTimeLeft] = useState<number>(40 * 60);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortCtlRef = useRef<AbortController | null>(null);
  useEffect(() => {
    document.body.classList.add("exam-mode");
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.warn("Fullscreen ochilmadi:", err);
      });
    }

    return () => {
      document.body.classList.remove("exam-mode");
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn("Fullscreen yopilmadi:", err);
        });
      }
    };
  }, []);

  useEffect(() => {
    const storageKey = `${AUTO_SAVE_KEY}${testId ? `_${testId}` : ""}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AnswersState;
        setAnswers(parsed);
      }
    } catch (error) {
      console.warn("Failed to restore answers:", error);
    }
  }, [testId]);

  useEffect(() => {
    if (testData) {
      setTest(testData);
      setLoading(false);
      initializeAnswers(testData);
      return;
    }

    if (!testId) {
      toast.error("Test ID mavjud emas.");
      setLoading(false);
      return;
    }

    abortCtlRef.current?.abort();
    const controller = new AbortController();
    abortCtlRef.current = controller;

    const fetch = async () => {
      setLoading(true);
      try {
        const data = await listeningTestService.getTestWithFullData(testId);
        if (!data) {
          toast.error("Test ma'lumotlari yuklanmadi.");
          setTest(null);
          return;
        }
        setTest(data);
        initializeAnswers(data);
      } catch (err: any) {
        if (err?.name !== "CanceledError" && err?.message !== "canceled") {
          console.error("fetch test error", err);
          toast.error("Testni yuklashda xatolik yuz berdi.");
        }
        setTest(null);
      } finally {
        setLoading(false);
      }
    };

    fetch();
    return () => controller.abort();
  }, [testId, testData]);

  const initializeAnswers = (t: any) => {
    const init: AnswersState = {};
    t.parts?.forEach((part: any) => {
      part.sections?.forEach((section: any) => {
        section.questions?.forEach((q: any) => {
          if (Object.prototype.hasOwnProperty.call(answers, q.id)) {
            init[q.id] = answers[q.id];
          } else if (
            q.type === Q.MULTI_SELECT ||
            q.type === Q.MATCHING
          ) {
            init[q.id] = [];
          } else {
            init[q.id] = "";
          }
        });
      });
    });
    setAnswers((prev) => ({ ...init, ...prev }));

    const firstPart = t.parts?.[0];
    const exp: Record<string, boolean> = {};
    firstPart?.sections?.forEach((s: any) => (exp[s.id] = true));
    setExpandedSections(exp);
  };

  useEffect(() => {
    try {
      localStorage.setItem(
        AUTO_SAVE_KEY + (testId ? `_${testId}` : ""),
        JSON.stringify(answers)
      );
    } catch { }
  }, [answers, testId]);

  useEffect(() => {
    if (loading) return;
    if (timeLeft <= 0) {
      toast.info("Vaqt tugadi — test avtomatik yuboriladi.");
      void onSubmit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, loading]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const currentPart: ListeningPart | null =
    test?.parts?.[currentPartIndex] ?? null;
  const hasPrev = !!test && currentPartIndex > 0;
  const hasNext =
    !!test?.parts && currentPartIndex < (test.parts?.length ?? 0) - 1;

  const totalQuestions = useMemo(() => {
    if (!test?.parts) return 0;
    let c = 0;
    test.parts.forEach((p: any) =>
      p.sections?.forEach((s: any) => (c += s.questions?.length ?? 0))
    );
    return c;
  }, [test]);

  const answeredCount = useMemo(() => {
    if (!test?.parts) return 0;
    let count = 0;
    test.parts.forEach((p: any) =>
      p.sections?.forEach((s: any) =>
        s.questions?.forEach((q: any) => {
          const v = answers[q.id];
          if (Array.isArray(v)) {
            if (v.length) count += 1;
          } else if (typeof v === "string") {
            if (v.trim() !== "") count += 1;
          }
        })
      )
    );
    return count;
  }, [test, answers]);


  function handleChangeSingle(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleToggleMulti(questionId: string, optionValue: string) {
    setAnswers((prev) => {
      const cur = (prev[questionId] ?? []) as string[];
      const exists = cur.includes(optionValue);
      return {
        ...prev,
        [questionId]: exists
          ? cur.filter((v) => v !== optionValue)
          : [...cur, optionValue],
      };
    });
  }

  async function onSubmit() {
    if (!testId) {
      toast.error("Test ID mavjud emas. Jo'natilmadi.");
      return;
    }
    if (!test) {
      toast.error("Test yuklanmagan. Qayta urinib ko'ring.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([questionId, val]) => {
        if (Array.isArray(val))
          return { questionId, userAnswer: val.join(", ") };
        return { questionId, userAnswer: (val ?? "") as string };
      });

      const token = getGlobalTokenFromAxios();
      const response = await listeningSubmissionService.submitAnswers(
        testId,
        payload,
        token
      );
      toast.success("Javoblaringiz yuborildi. Rahmat!");
      try {
        localStorage.removeItem(AUTO_SAVE_KEY + `_${testId}`);
      } catch { }
      navigate(`/listening-test/results/${response.testResultId}`);
    } catch (err: any) {
      console.error("submit error", err);
      const msg = err?.message || "Javoblarni yuborishda xatolik yuz berdi.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }


  function Badge({ children }: { children: React.ReactNode }) {
    return (
      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
        {children}
      </span>
    );
  }

  function QuestionCard({ q }: { q: ListeningQuestion }) {
    const qAns = answers[q.id];
    const variants = q.answers ?? [];
    const type = q.type;

    const hasAnswer = Array.isArray(qAns)
      ? qAns.length > 0
      : qAns && String(qAns).trim() !== "";

    const renderFillBlank = () => {
      const template = q.text || q.content || "";
      const parts = template.split(/_{3,}/);
      return (
        <div className="space-y-2">
          <div className="text-gray-800 leading-relaxed">
            {parts.length > 1 ? (
              <>
                <span>{parts[0]}</span>
                <input
                  type="text"
                  value={(qAns as string) ?? ""}
                  onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                  className="mx-2 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="javob"
                />
                <span>{parts.slice(1).join("___")}</span>
              </>
            ) : (
              <input
                type="text"
                value={(qAns as string) ?? ""}
                onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Bo'sh joyni to'ldiring"
              />
            )}
          </div>
          <div className="text-xs text-gray-500">
            Matndagi bo‘sh joyni to‘ldiring.
          </div>
        </div>
      );
    };

    return (
      <div
        id={`q-${q.id}`}
        data-qid={q.id}
        className="p-5 rounded-xl border border-gray-200 bg-white mb-5 shadow-sm hover:shadow transition-shadow"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-red-700">
              {q.number || "?"}
            </span>
          </div>

          <div className="flex-1">
            <div className="mb-3">
              <p className="font-semibold text-gray-900 mb-2">
                {q.text || q.content || "Savol"}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Badge>
                  {type === Q.MULTIPLE_CHOICE && "Bir javob tanlang"}
                  {type === Q.MULTI_SELECT && "Bir nechta javob tanlang"}
                  {type === Q.TRUE_FALSE && "To'g'ri/Noto'g'ri"}
                  {type === Q.MATCHING && "Moslashtiring"}
                  {type === Q.TEXT_INPUT && "Matn kiriting"}
                  {type === Q.NUMBER && "Raqam kiriting"}
                  {type === Q.FILL_BLANK && "Bo'sh joyni to'ldiring"}
                </Badge>

                {hasAnswer ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs">Javob berilgan</span>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">Javob berilmagan</div>
                )}
              </div>
            </div>

            {type === Q.MULTIPLE_CHOICE && variants.length > 0 && (
              <div className="space-y-2">
                {variants.map((ans) => (
                  <label
                    key={ans.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer border hover:border-red-300 hover:bg-red-50/50 transition-all"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={ans.answer}
                      checked={(qAns as string) === ans.answer}
                      onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                      className="h-4 w-4 text-red-600"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-red-700 min-w-[24px]">
                        {ans.variantText}
                      </span>
                      <span className="text-gray-800">{ans.answer}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {type === Q.MULTI_SELECT && variants.length > 0 && (
              <div className="space-y-2">
                {variants.map((ans) => {
                  const cur = (qAns ?? []) as string[];
                  const checked = cur.includes(ans.answer);
                  return (
                    <label
                      key={ans.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${checked
                        ? "bg-red-50 border-red-300"
                        : "hover:bg-gray-50 border-gray-200"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleMulti(q.id, ans.answer)}
                        className="h-4 w-4 text-red-600"
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-red-700 min-w-[24px]">
                          {ans.variantText}
                        </span>
                        <span className="text-gray-800">{ans.answer}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {type === Q.TRUE_FALSE && (
              <div className="flex items-center gap-6">
                {(variants.length ? variants : [
                  { id: `${q.id}-true`, answer: "TRUE", variantText: "True" },
                  { id: `${q.id}-false`, answer: "FALSE", variantText: "False" },
                ]).map((ans) => (
                  <label
                    key={ans.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={ans.answer}
                      checked={(qAns as string) === ans.answer}
                      onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                      className="h-4 w-4 text-red-600"
                    />
                    <span className="font-medium">{ans.variantText}</span>
                  </label>
                ))}
              </div>
            )}

            {type === Q.MATCHING && variants.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {variants.map((ans) => {
                  const cur = (qAns ?? []) as string[];
                  const checked = cur.includes(ans.answer);
                  return (
                    <label
                      key={ans.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${checked
                        ? "bg-red-50 border-red-300"
                        : "hover:bg-gray-50 border-gray-200"
                        }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleMulti(q.id, ans.answer)}
                        className="h-4 w-4 text-red-600"
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-700 min-w-[24px] text-center bg-red-100 rounded px-2 py-1">
                          {ans.variantText}
                        </span>
                        <span className="text-gray-800">{ans.answer}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {type === Q.NUMBER && (
              <div className="space-y-1">
                <input
                  type="number"
                  placeholder="Raqamli javob..."
                  value={(qAns as string) ?? ""}
                  onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <div className="text-xs text-gray-500">
                  Faqat raqam kiriting (masalan: 42, 3.14)
                </div>
              </div>
            )}

            {type === Q.TEXT_INPUT && (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Javobingiz..."
                  value={(qAns as string) ?? ""}
                  onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}

            {type === Q.FILL_BLANK && renderFillBlank()}

            {([Q.MULTI_SELECT, Q.MULTIPLE_CHOICE, Q.MATCHING] as string[]).includes(
              type
            ) &&
              (q.answers?.length ?? 0) === 0 && (
                <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Variyantlar topilmadi. Iltimos, matn orqali javob kiriting.
                    </span>
                  </div>
                  <input
                    type="text"
                    value={(qAns as string) ?? ""}
                    onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Javobingizni yozing"
                  />
                </div>
              )}
          </div>
        </div>
      </div>
    );
  }

  function BottomAnswerSheet() {
    if (!test?.parts) return null;

    let idx = 0;
    const chips: React.ReactNode[] = [];

    test.parts.forEach((part: any, partIdx: any) => {
      part.sections?.forEach((section: any) => {
        section.questions?.forEach((q: any) => {
          idx += 1;
          const val = answers[q.id];
          const hasAns = Array.isArray(val)
            ? val.length > 0
            : !!val && String(val).trim() !== "";

          chips.push(
            <button
              key={q.id}
              onClick={() => {
                if (currentPartIndex !== partIdx) setCurrentPartIndex(partIdx);
                setExpandedSections((prev) => ({ ...prev, [section.id]: true }));
                setTimeout(() => {
                  const el = document.getElementById(`q-${q.id}`);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 80);
              }}
              className={`text-xs md:text-sm px-2.5 py-1.5 rounded-lg border font-medium transition-all ${hasAns
                ? "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              title={`Qism ${partIdx + 1}, Savol ${idx}`}
            >
              {idx}
            </button>
          );
        });
      });
    });

    return (
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-6xl px-3 pb-3">
          <div className="rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2 text-gray-700">
                <ListChecks className="w-5 h-5 text-red-600" />
                <span className="font-medium hidden sm:inline">Javoblar holati</span>
                <span className="text-xs sm:text-sm text-gray-500">
                  {answeredCount}/{totalQuestions}
                </span>
              </div>

              <div className="flex-1 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 px-3">{chips}</div>
              </div>

              <motion.button
                onClick={onSubmit}
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold shadow
                 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Yuborilmoqda
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Tugatish
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 bg-white rounded-xl shadow-md text-center">
          <div className="animate-spin h-12 w-12 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-lg font-medium">Test yuklanmoqda...</div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="p-8 bg-white rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Test topilmadi</h2>
          <p className="text-gray-700">
            Test ma'lumotlarini olishda muammo bo'ldi. Iltimos, keyinroq urinib ko'ring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Headphones className="w-7 h-7 text-red-600" />
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {test?.title || "Listening Test"}
                </h1>
              </div>
              <DisableKeys />

              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => {
                    if (!hasPrev) return;
                    setCurrentPartIndex((p) => p - 1);
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current.currentTime = 0;
                    }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={!hasPrev}
                  whileHover={hasPrev ? { scale: 1.02 } : {}}
                  whileTap={hasPrev ? { scale: 0.98 } : {}}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Oldingi
                </motion.button>

                <motion.button
                  onClick={() => {
                    if (!hasNext) return;
                    setCurrentPartIndex((p) => p + 1);
                    if (audioRef.current) {
                      audioRef.current.pause();
                      audioRef.current.currentTime = 0;
                    }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={!hasNext}
                  whileHover={hasNext ? { scale: 1.02 } : {}}
                  whileTap={hasNext ? { scale: 0.98 } : {}}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
                >
                  Keyingi
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-3">
              <div className="w-full">
                {currentPart?.audioUrl ? (
                  <audio
                    ref={audioRef}
                    src={resolveFileUrl(currentPart.audioUrl)}
                    controls
                    preload="auto"
                    className="w-full h-10"
                  />
                ) : (
                  <div className="w-full rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                    ⚠️ Audio fayl topilmadi. Keyingi qismga o'ting yoki administratorga murojaat qiling.
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-4">
                <div className="hidden md:flex items-center gap-2 text-gray-700">
                  <span>Jami:</span>
                  <span className="font-semibold">{totalQuestions}</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-gray-700">
                  <span>Javob berilgan:</span>
                  <span className="font-semibold text-green-600">{answeredCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  <span className="text-red-600 font-semibold text-lg">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>

            {test?.description && (
              <p className="text-gray-600 text-sm">{test.description}</p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Qism {currentPartIndex + 1}/{test?.parts?.length || 1}
          {currentPart?.title ? (
            <span className="text-gray-500 font-normal"> — {currentPart.title}</span>
          ) : null}
        </h2>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPartIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {currentPart?.sections?.length ? (
              currentPart.sections.map((section: ListeningSection) => (
                <div
                  key={section.id}
                  className="mb-6 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm"
                >
                  <button
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        [section.id]: !prev[section.id],
                      }))
                    }
                    className="w-full text-left px-5 py-4 bg-gray-50 hover:bg-gray-100 transition flex items-start justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900">
                        {section.title || "Bo'lim"}
                      </div>
                      {section.content && (
                        <div className="text-sm text-gray-600 line-clamp-2 mt-0.5">
                          {section.content}
                        </div>
                      )}
                      <div className="text-xs text-red-600 mt-1">
                        {section.questions?.length || 0} ta savol
                      </div>
                    </div>
                    <div className="ml-4 mt-1 text-sm text-gray-500">
                      {expandedSections[section.id] ? "Yopish" : "Ochish"}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedSections[section.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="px-5 py-5"
                      >
                        {section.imageUrl && (
                          <div className="mb-5">
                            <img
                              src={resolveFileUrl(section.imageUrl) || "/placeholder.svg"}
                              alt="Bo'lim rasmi"
                              className="rounded-xl shadow max-w-full h-auto"
                            />
                          </div>
                        )}

                        {section.questions?.length ? (
                          section.questions.map((q) => (
                            <QuestionCard key={q.id} q={q} />
                          ))
                        ) : (
                          <div className="text-center py-10">
                            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 italic">
                              Bu bo'limda savollar mavjud emas.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 italic text-lg">
                  Bu qismda bo'limlar mavjud emas.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomAnswerSheet />
    </div>
  );
}
