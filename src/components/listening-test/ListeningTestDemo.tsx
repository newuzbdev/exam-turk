"use client";

import type React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Play,
  Square,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ListChecks,
  BookOpen,
  Headphones,
} from "lucide-react";
import { toast } from "sonner";
import axiosPrivate from "@/config/api";
import listeningTestService, {
  listeningSubmissionService,
} from "@/services/listeningTest.service";

interface ListeningAnswer {
  id: string;
  questionId: string;
  variantText: string;
  answer: string;
  correct: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListeningQuestion {
  id: string;
  sectionId: string;
  number: number;
  content: string | null;
  text: string;
  type:
    | "MULTIPLE_CHOICE"
    | "MULTI_SELECT"
    | "TEXT_INPUT"
    | "TRUE_FALSE"
    | "NUMBER"
    | "MATCHING";
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

// ====== Konfiguratsiya ======
const FILE_BASE = "https://api.turkcetest.uz/files/"; // server files base
const AUTO_SAVE_KEY = "listening_test_answers_v1";

// ====== Helperlar ======
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
  } catch {}
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
} as const;

type QuestionType = keyof typeof Q | string;

type AnswersState = Record<string, string | string[]>;

export default function ListeningTestPage({
  testId,
  testData,
}: {
  testId?: string;
  testData?: ListeningTestItem;
}) {
  const navigate = useNavigate();

  const [test, setTest] = useState<ListeningTestItem | null>(testData || null);
  const [loading, setLoading] = useState<boolean>(!testData);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});

  const [timeLeft, setTimeLeft] = useState<number>(40 * 60);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortCtlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const storageKey = `listening_test_answers_v1${testId ? `_${testId}` : ""}`;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as AnswersState;
        setAnswers(parsed);
      }
    } catch (error) {
      console.warn("Failed to restore answers from localStorage:", error);
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
        if (err?.name === "CanceledError" || err?.message === "canceled") {
          // aborted
        } else {
          console.error("fetch test error", err);
          toast.error("Testni yuklashda xatolik yuz berdi.");
        }
        setTest(null);
      } finally {
        setLoading(false);
      }
    };

    fetch();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId, testData]);

  const initializeAnswers = (testData: ListeningTestItem) => {
    const init: AnswersState = {};
    testData.parts?.forEach((part) => {
      part.sections?.forEach((section) => {
        section.questions?.forEach((q) => {
          if (Object.prototype.hasOwnProperty.call(answers, q.id)) {
            init[q.id] = answers[q.id];
          } else if (q.type === Q.MULTI_SELECT || q.type === Q.MATCHING) {
            init[q.id] = [];
          } else {
            init[q.id] = "";
          }
        });
      });
    });
    setAnswers((prev) => ({ ...init, ...prev }));

    // Auto-expand first part sections
    const firstPart = testData.parts?.[0];
    const exp: Record<string, boolean> = {};
    firstPart?.sections?.forEach((s) => (exp[s.id] = true));
    setExpandedSections(exp);
  };

  // ====== Auto-save localStorage ======
  useEffect(() => {
    try {
      localStorage.setItem(
        AUTO_SAVE_KEY + (testId ? `_${testId}` : ""),
        JSON.stringify(answers)
      );
    } catch {}
  }, [answers, testId]);

  // ====== Timer ======
  useEffect(() => {
    if (loading) return;
    if (timeLeft <= 0) {
      toast.info("Vaqt tugadi — test avtomatik tarzda yuboriladi.");
      void onSubmit();
      return;
    }
    const t = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, loading]);

  // ====== Page leave guard ======
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ====== Helpers ======
  const currentPart: ListeningPart | null =
    test?.parts?.[currentPartIndex] ?? null;
  const hasPrev = !!test && currentPartIndex > 0;
  const hasNext =
    !!test?.parts && currentPartIndex < (test.parts?.length ?? 0) - 1;

  const totalQuestions = useMemo(() => {
    if (!test?.parts) return 0;
    let c = 0;
    test.parts.forEach((p) =>
      p.sections?.forEach((s) => (c += s.questions?.length ?? 0))
    );
    return c;
  }, [test]);

  const answeredCount = useMemo(() => {
    if (!test?.parts) return 0;
    let count = 0;
    test.parts.forEach((p) =>
      p.sections?.forEach((s) =>
        s.questions?.forEach((q) => {
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

  function renderQuestion(q: ListeningQuestion) {
    const qAns = answers[q.id];
    const variants = q.answers ?? [];
    const type: QuestionType = q.type;

    return (
      <div
        key={q.id}
        id={`q-${q.id}`}
        data-qid={q.id}
        className="p-6 rounded-xl border border-gray-200 bg-white mb-6 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-blue-600">
              {q.number || "?"}
            </span>
          </div>

          <div className="flex-1">
            <div className="mb-4">
              <p className="font-semibold text-lg text-gray-800 mb-2">
                {q.text || q.content || "Savol"}
              </p>

              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                  {type === Q.MULTIPLE_CHOICE && "Bir javob tanlang"}
                  {type === Q.MULTI_SELECT && "Bir nechta javob tanlang"}
                  {type === Q.TRUE_FALSE && "To'g'ri/Noto'g'ri"}
                  {type === Q.MATCHING && "Moslashtiring"}
                  {type === Q.TEXT_INPUT && "Matn kiriting"}
                  {type === Q.NUMBER && "Raqam kiriting"}
                </span>

                {/* Answer status indicator */}
                <div className="flex items-center gap-1">
                  {(() => {
                    const hasAnswer = Array.isArray(qAns)
                      ? qAns.length > 0
                      : qAns && String(qAns).trim() !== "";
                    return hasAnswer ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs">Javob berilgan</span>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        Javob berilmagan
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {type === Q.MULTIPLE_CHOICE && variants.length > 0 && (
              <div className="space-y-3">
                {variants.map((ans) => (
                  <label
                    key={ans.id}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={ans.answer}
                      checked={(qAns as string) === ans.answer}
                      onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-600 min-w-[24px]">
                        {ans.variantText}
                      </span>
                      <span className="text-gray-700">{ans.answer}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {type === Q.MULTI_SELECT && variants.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm text-blue-600 mb-2">
                  Bir nechta javob tanlashingiz mumkin:
                </div>
                {variants.map((ans) => {
                  const cur = (qAns ?? []) as string[];
                  const checked = cur.includes(ans.answer);
                  return (
                    <label
                      key={ans.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                        checked
                          ? "bg-blue-50 border-blue-200"
                          : "hover:bg-gray-50 border-transparent hover:border-gray-200"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleMulti(q.id, ans.answer)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-blue-600 min-w-[24px]">
                          {ans.variantText}
                        </span>
                        <span className="text-gray-700">{ans.answer}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {type === Q.TRUE_FALSE && (
              <div className="flex items-center gap-6">
                {variants.length > 0 ? (
                  variants.map((ans) => (
                    <label
                      key={ans.id}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={ans.answer}
                        checked={(qAns as string) === ans.answer}
                        onChange={(e) =>
                          handleChangeSingle(q.id, e.target.value)
                        }
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="font-medium">{ans.variantText}</span>
                      <span className="text-gray-600">({ans.answer})</span>
                    </label>
                  ))
                ) : (
                  <>
                    <label className="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name={q.id}
                        value="TRUE"
                        checked={(qAns as string) === "TRUE"}
                        onChange={(e) =>
                          handleChangeSingle(q.id, e.target.value)
                        }
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="font-medium text-green-600">True</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name={q.id}
                        value="FALSE"
                        checked={(qAns as string) === "FALSE"}
                        onChange={(e) =>
                          handleChangeSingle(q.id, e.target.value)
                        }
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="font-medium text-red-600">False</span>
                    </label>
                  </>
                )}
              </div>
            )}

            {type === Q.MATCHING && variants.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm text-blue-600 mb-3">
                  Mos keluvchi javoblarni tanlang:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {variants.map((ans) => {
                    const cur = (qAns ?? []) as string[];
                    const checked = cur.includes(ans.answer);
                    return (
                      <label
                        key={ans.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                          checked
                            ? "bg-blue-50 border-blue-200"
                            : "hover:bg-gray-50 border-gray-200"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleMulti(q.id, ans.answer)}
                          className="h-4 w-4 text-blue-600"
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600 min-w-[24px] text-center bg-blue-100 rounded px-2 py-1">
                            {ans.variantText}
                          </span>
                          <span className="text-gray-700">{ans.answer}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {type === Q.NUMBER && (
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Raqamli javobingizni kiriting..."
                  value={(qAns as string) ?? ""}
                  onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="text-xs text-gray-500">
                  Faqat raqam kiriting (masalan: 42, 3.14)
                </div>
              </div>
            )}

            {(type === Q.TEXT_INPUT ||
              ![
                Q.MULTI_SELECT,
                Q.MULTIPLE_CHOICE,
                Q.TRUE_FALSE,
                Q.NUMBER,
                Q.MATCHING,
              ].includes(type as any)) && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Javobingizni shu yerga yozing..."
                  value={(qAns as string) ?? ""}
                  onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <div className="text-xs text-gray-500">
                  Matn shaklida javob bering
                </div>
              </div>
            )}

            {(
              [Q.MULTI_SELECT, Q.MULTIPLE_CHOICE, Q.MATCHING] as string[]
            ).includes(type) &&
              (q.answers?.length ?? 0) === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Bu savol uchun javob variantlari hali yuklanmagan. Matn
                      orqali javob berishingiz mumkin.
                    </span>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    );
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
      await listeningSubmissionService.submitAnswers(testId, payload, token);

      toast.success("Javoblaringiz serverga yuborildi. Rahmat!");
      try {
        localStorage.removeItem(AUTO_SAVE_KEY + `_${testId}`);
      } catch {}
      navigate("/test");
      // navigate(`/listening-test/results/${response.totalResultsId}`);
    } catch (err: any) {
      console.error("submit error", err);
      const msg = err?.message || "Javoblarni yuborishda xatolik yuz berdi.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ====== Audio controls ======
  function handlePlay() {
    if (!audioRef.current) {
      toast.error("Audio pleer topilmadi.");
      return;
    }
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => toast.error("Audio faylni ijro etishda xato."));
  }
  function handlePause() {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  }
  function handleMuteToggle() {
    if (!audioRef.current) return;
    audioRef.current.muted = !audioRef.current.muted;
    setMuted(audioRef.current.muted);
  }

  function AnswerSheet() {
    if (!test?.parts) return null;

    let questionIndex = 0;
    const chips: React.ReactNode[] = []; // Declare JSX.Element[] as React.ReactNode[]

    test.parts.forEach((part, partIdx) => {
      part.sections?.forEach((section) => {
        section.questions?.forEach((q) => {
          questionIndex += 1;
          const val = answers[q.id];
          const hasAnswer = Array.isArray(val)
            ? val.length > 0
            : !!val && String(val).trim() !== "";

          chips.push(
            <button
              key={q.id}
              onClick={() => {
                if (currentPartIndex !== partIdx) {
                  setCurrentPartIndex(partIdx);
                }
                setExpandedSections((prev) => ({
                  ...prev,
                  [section.id]: true,
                }));
                setTimeout(() => {
                  const el = document.getElementById(`q-${q.id}`);
                  if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
              }}
              className={`text-sm px-3 py-2 rounded-lg border font-medium transition-all ${
                hasAnswer
                  ? "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
              title={`Qism ${partIdx + 1}, Savol ${questionIndex}`}
            >
              {questionIndex}
            </button>
          );
        });
      });
    });

    return (
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-700">Javoblar holati</span>
        </div>
        <div className="flex flex-wrap gap-2">{chips}</div>
        <div className="mt-3 text-xs text-gray-500">
          Yashil: javob berilgan • Kulrang: javob berilmagan
        </div>
      </div>
    );
  }

  // ====== Quick Nav (Answer Sheet) ======

  // ====== UI ======
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="p-8 bg-white rounded-xl shadow-md text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-lg font-medium">Test yuklanmoqda...</div>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="p-8 bg-white rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Test topilmadi
          </h2>
          <p className="text-gray-700">
            Test ma'lumotlarini olishda muammo bo'ldi. Iltimos, keyinroq urinib
            ko'ring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[85vh] flex flex-col">
        <header className="flex flex-col gap-4 p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Headphones className="w-8 h-8 text-blue-600" />
                {test?.title || "Listening Test"}
              </h1>
              {test?.description && (
                <p className="text-gray-600 max-w-2xl">{test.description}</p>
              )}

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-100 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                  </div>
                  <span className="text-gray-600">
                    Jami savollar:{" "}
                    <span className="font-semibold">{totalQuestions}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-2 h-2 text-green-600" />
                  </div>
                  <span className="text-gray-600">
                    Javob berilgan:{" "}
                    <span className="font-semibold text-green-600">
                      {answeredCount}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-600 font-semibold text-lg">
                    {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            </div>

            <motion.button
              onClick={onSubmit}
              className="bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Yuborilmoqda...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Testni Tugatish
                </>
              )}
            </motion.button>
          </div>

          <AnswerSheet />
        </header>

        {/* ... existing main content with enhanced styling ... */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <div className="lg:w-[40%] xl:w-[45%] p-6 flex flex-col bg-gradient-to-br from-blue-50 to-indigo-50 border-b lg:border-r border-gray-200">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
                  <Volume2 className="w-6 h-6 text-blue-600" />
                  {currentPart?.title ??
                    `Qism ${currentPart?.number ?? currentPartIndex + 1}`}
                </h2>

                {currentPart?.description && (
                  <p className="text-gray-600 mb-4">
                    {currentPart.description}
                  </p>
                )}

                {currentPart?.audioUrl ? (
                  <div className="space-y-4">
                    <audio
                      ref={audioRef}
                      src={resolveFileUrl(currentPart.audioUrl)}
                      controls={false}
                      muted={muted}
                      onEnded={() => setIsPlaying(false)}
                      preload="auto"
                    />

                    <div className="flex flex-wrap gap-2 justify-center">
                      {!isPlaying ? (
                        <motion.button
                          onClick={handlePlay}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-full font-semibold shadow-lg hover:bg-blue-600"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Play className="h-5 w-5" /> Boshlash
                        </motion.button>
                      ) : (
                        <motion.button
                          onClick={handlePause}
                          className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full font-semibold shadow-lg hover:bg-gray-700"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Pause className="h-5 w-5" /> Pauza
                        </motion.button>
                      )}

                      <motion.button
                        onClick={handleMuteToggle}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-800 rounded-full font-semibold hover:bg-gray-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {muted ? (
                          <VolumeX className="h-5 w-5" />
                        ) : (
                          <Volume2 className="h-5 w-5" />
                        )}
                      </motion.button>

                      <motion.button
                        onClick={() => {
                          if (audioRef.current)
                            audioRef.current.currentTime = 0;
                        }}
                        className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-800 rounded-full font-semibold hover:bg-gray-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Square className="h-5 w-5" />
                      </motion.button>
                    </div>

                    <div
                      className={`text-sm font-medium ${
                        isPlaying ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      {isPlaying
                        ? "🎵 Audio ijro etilmoqda..."
                        : "⏸️ Audio to'xtatilgan"}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 font-medium">
                      ⚠️ Audio fayl topilmadi
                    </p>
                    <p className="text-red-500 text-sm mt-1">
                      Keyingi qismga o'ting yoki administratorga murojaat
                      qiling.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-6 pt-6 border-t border-white/50">
              <motion.button
                onClick={() => {
                  if (!hasPrev) return;
                  setCurrentPartIndex((prev) => prev - 1);
                  setIsPlaying(false);
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={!hasPrev}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm"
                whileHover={hasPrev ? { scale: 1.02 } : {}}
                whileTap={hasPrev ? { scale: 0.98 } : {}}
              >
                <ArrowLeft className="h-4 w-4" /> Oldingi qism
              </motion.button>

              <motion.button
                onClick={() => {
                  if (!hasNext) return;
                  setCurrentPartIndex((prev) => prev + 1);
                  setIsPlaying(false);
                  if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                  }
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={!hasNext}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 shadow-sm"
                whileHover={hasNext ? { scale: 1.02 } : {}}
                whileTap={hasNext ? { scale: 0.98 } : {}}
              >
                Keyingi qism <ArrowRight className="h-4 w-4" />
              </motion.button>
            </div>
          </div>

          {/* ... existing questions section with enhanced styling ... */}
          <div className="lg:flex-1 p-6 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-emerald-500" />
              Savollar
              <span className="text-lg font-normal text-gray-500">
                ({currentPartIndex + 1}/{test?.parts?.length || 1})
              </span>
            </h2>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentPartIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentPart?.sections?.length ? (
                  currentPart.sections.map((section: ListeningSection) => (
                    <div
                      key={section.id}
                      className="mb-8 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm"
                    >
                      <button
                        onClick={() =>
                          setExpandedSections((prev) => ({
                            ...prev,
                            [section.id]: !prev[section.id],
                          }))
                        }
                        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-all"
                      >
                        <div className="text-left flex-1">
                          <div className="text-xl font-semibold text-gray-800 mb-1">
                            {section.title || "Bo'lim"}
                          </div>
                          {section.content && (
                            <div className="text-sm text-gray-600 line-clamp-2">
                              {section.content}
                            </div>
                          )}
                          <div className="text-xs text-blue-600 mt-1">
                            {section.questions?.length || 0} ta savol
                          </div>
                        </div>
                        <div className="ml-4">
                          {expandedSections[section.id] ? (
                            <ChevronUp className="w-6 h-6 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {expandedSections[section.id] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="px-6 py-6"
                          >
                            {section.imageUrl && (
                              <div className="mb-6">
                                <img
                                  src={
                                    resolveFileUrl(section.imageUrl) ||
                                    "/placeholder.svg"
                                  }
                                  alt="Bo'lim rasmi"
                                  className="rounded-xl shadow-md max-w-full h-auto"
                                />
                              </div>
                            )}

                            {section.questions?.length ? (
                              section.questions.map((q) => renderQuestion(q))
                            ) : (
                              <div className="text-center py-8">
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
          </div>
        </main>
      </div>
    </div>
  );
}
