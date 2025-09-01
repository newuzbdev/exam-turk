// ListeningTestPage.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Play, Square, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import axiosPrivate from "@/config/api"; // for extracting global token if set
import { listeningSubmissionService, listeningTestService, type ListeningQuestion, type ListeningTestItem } from "@/services/listeningTest.service";

// ====== Konfiguratsiya ======
const AUDIO_BASE = "https://api.turkcetest.uz/files/"; // server files base
const AUTO_SAVE_KEY = "listening_test_answers_v1";

// ====== Helperlar ======
const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const rem = seconds % 60;
    return `${minutes}:${rem < 10 ? "0" : ""}${rem}`;
};

function resolveAudioUrl(url?: string | null) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    // sometimes url contains relative path like "uploads/xxx.mp3" or file name only
    return AUDIO_BASE + url;
}

function getGlobalTokenFromAxios() {
    try {
        const auth = (axiosPrivate as any).defaults?.headers?.common?.Authorization;
        if (auth && typeof auth === "string" && auth.startsWith("Bearer ")) {
            return auth.slice("Bearer ".length);
        }
    } catch (e) {
        // ignore
    }
    // also try localStorage common key 'accessToken' or 'token'
    return localStorage.getItem("accessToken") || localStorage.getItem("token") || undefined;
}

// Answers state type: either string for single answer/text, or string[] for multi-select
type AnswersState = Record<string, string | string[]>;

// ====== Component ======
export default function ListeningTestPage({ testId }: { testId: string }) {
    const navigate = useNavigate();

    const [test, setTest] = useState<ListeningTestItem | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [answers, setAnswers] = useState<AnswersState>({});
    const [currentPartIndex, setCurrentPartIndex] = useState<number>(0);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    // 40 minutes default (in seconds). You may adjust per test if needed.
    const [timeLeft, setTimeLeft] = useState<number>(40 * 60);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortCtlRef = useRef<AbortController | null>(null);

    // load saved answers from localStorage (if any)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(AUTO_SAVE_KEY + (testId ? `_${testId}` : ""));
            if (raw) {
                const parsed = JSON.parse(raw) as AnswersState;
                setAnswers(parsed);
            }
        } catch (e) {
            // ignore parse errors
        }
    }, [testId]);

    // Fetch test with full data. If token exists (global axios or localStorage) pass as answerToken
    useEffect(() => {
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
                const data = await listeningTestService.getTestWithFullData(testId); // BU SATRNI TO'G'RILADIM

                if (!data) {
                    toast.error("Test ma'lumotlari yuklanmadi.");
                    setTest(null);
                    return;
                }

                setTest(data);

                // initialize empty answers for questions not present
                const init: AnswersState = {};
                data.parts?.forEach((part) => {
                    part.sections?.forEach((section) => {
                        section.questions?.forEach((q) => {
                            // keep existing saved answer if present
                            init[q.id] = (prevAnsHasKey(answers, q.id) ? answers[q.id] : q.type === "MULTI_SELECT" ? [] : "");
                        });
                    });
                });

                // merge saved answers with new initial so user-saved not overwritten
                setAnswers(prev => ({ ...init, ...prev }));
            } catch (err: any) {
                if ((err || {}).name === "CanceledError" || err?.message === "canceled") {
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
    }, [testId]);

    // auto-save answers to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(AUTO_SAVE_KEY + (testId ? `_${testId}` : ""), JSON.stringify(answers));
        } catch (e) {
            // ignore
        }
    }, [answers, testId]);

    // timer effect
    useEffect(() => {
        if (loading) return;
        if (timeLeft <= 0) {
            // auto-submit
            toast.info("Vaqt tugadi — test avtomatik tarzda yuboriladi.");
            void onSubmit();
            return;
        }
        const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, loading]);

    // helpers
    function prevAnsHasKey(obj: AnswersState, key: string) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    }

    function handleChangeSingle(questionId: string, value: string) {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    }

    function handleToggleMulti(questionId: string, optionValue: string) {
        setAnswers(prev => {
            const cur = (prev[questionId] ?? []) as string[];
            const exists = cur.includes(optionValue);
            return { ...prev, [questionId]: exists ? cur.filter(v => v !== optionValue) : [...cur, optionValue] };
        });
    }

    // render question UI depending on type & available answers
    function renderQuestion(q: ListeningQuestion) {
        const qAns = answers[q.id];
        const variants = q.answers ?? [];

        return (
            <div key={q.id} className="p-4 rounded-xl border border-gray-200 bg-white mb-4 shadow-sm">
                <p className="font-semibold text-lg text-gray-800 mb-2">
                    {(q.number ?? "")}{q.number ? ". " : ""}{q.text ?? q.content ?? "Savol"}
                </p>

                {q.type === "MULTIPLE_CHOICE" && variants.length > 0 && (
                    <div className="flex flex-col space-y-2">
                        {variants.map(ans => (
                            <label
                                key={ans.id}
                                className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-gray-50"
                            >
                                <input
                                    type="radio"
                                    name={q.id}
                                    value={ans.answer}
                                    checked={(qAns as string) === ans.answer}
                                    onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                                    className="h-4 w-4"
                                />
                                <span className="text-gray-700">{ans.variantText ?? ans.answer}</span>
                            </label>
                        ))}
                    </div>
                )}

                {q.type === "MULTIPLE_CHOICE" && variants.length === 0 && (
                    <div className="text-sm text-gray-500 italic">Bu savol uchun javob variantlari mavjud emas — matn yuborishingiz mumkin.</div>
                )}

                {q.type === "MULTI_SELECT" && variants.length > 0 && (
                    <div className="flex flex-col space-y-2">
                        {variants.map(ans => {
                            const cur = (qAns ?? []) as string[];
                            const checked = cur.includes(ans.answer);
                            return (
                                <label key={ans.id} className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => handleToggleMulti(q.id, ans.answer)}
                                        className="h-4 w-4"
                                    />
                                    <span className="text-gray-700">{ans.variantText ?? ans.answer}</span>
                                </label>
                            );
                        })}
                    </div>
                )}

                {(q.type === "MULTI_SELECT" || q.type === "MULTIPLE_CHOICE") && variants.length === 0 && (
                    <div className="text-sm text-gray-500 italic">
                        Bu savol uchun javob variantlari mavjud emas — iltimos matn orqali javob bering.
                    </div>
                )}


                {q.type === "TEXT_INPUT" && (
                    <input
                        type="text"
                        placeholder="Javobingizni kiriting..."
                        value={(qAns as string) ?? ""}
                        onChange={(e) => handleChangeSingle(q.id, e.target.value)}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                )}
            </div>
        );
    }

    // Submit handler: transform answers into expected payload
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
            // Format answers for API: string for single or joined string for multi
            const payload = Object.entries(answers).map(([questionId, val]) => {
                if (Array.isArray(val)) return { questionId, userAnswer: val.join(", ") }; // server expects string
                return { questionId, userAnswer: val ?? "" };
            });

            // If we have a global token, pass it (submit endpoint may require auth)
            const token = getGlobalTokenFromAxios();
            await listeningSubmissionService.submitAnswers(testId, payload, token);

            toast.success("Javoblaringiz serverga yuborildi. Rahmat!");
            // clear autosave
            try {
                localStorage.removeItem(AUTO_SAVE_KEY + `_${testId}`);
            } catch (e) { }
            // navigate away or show result screen
            navigate("/test");
        } catch (err: any) {
            // handle 401/403 from service (it will throw)
            console.error("submit error", err);
            const msg = err?.message || "Javoblarni yuborishda xatolik yuz berdi.";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    // Audio controls
    function handlePlay() {
        if (!audioRef.current) {
            toast.error("Audio pleer topilmadi.");
            return;
        }
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
            toast.error("Audio faylni ijro etishda xato.");
        });
    }
    function handlePause() {
        if (!audioRef.current) return;
        audioRef.current.pause();
        setIsPlaying(false);
    }

    // navigation between parts
    const currentPart = test?.parts?.[currentPartIndex] ?? null;
    const hasPrev = !!test && currentPartIndex > 0;
    const hasNext = !!test && test.parts ? currentPartIndex < test.parts.length - 1 : false;

    // simple loading state
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
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Test topilmadi</h2>
                    <p className="text-gray-700">Test ma'lumotlarini olishda muammo bo'ldi. Iltimos, keyinroq urinib ko'ring.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden min-h-[85vh] flex flex-col">
                {/* Header */}
                <header className="flex flex-col sm:flex-row justify-between items-center p-4 sm:p-6 border-b border-gray-200">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-0">
                        {test.title}
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-blue-600 font-semibold text-lg">
                            <Clock className="h-6 w-6" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                        <motion.button
                            onClick={onSubmit}
                            className="bg-blue-600 text-white font-bold py-2 px-5 rounded-xl shadow hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={submitting}
                        >
                            {submitting ? "Yuborilmoqda..." : "Testni Tugatish"}
                        </motion.button>
                    </div>
                </header>

                <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                    <div className="lg:w-1/2 p-6 flex flex-col bg-white border-b lg:border-r border-gray-200">
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <h2 className="text-xl font-bold text-gray-800 mb-2">
                                {currentPart?.title ?? `Qism ${currentPart?.number ?? currentPartIndex + 1}`}
                            </h2>
                            {currentPart?.description && <p className="text-gray-600 mb-4">{currentPart.description}</p>}

                            {currentPart?.audioUrl ? (
                                <div className="space-y-4 w-full max-w-md">
                                    <audio
                                        ref={audioRef}
                                        src={resolveAudioUrl(currentPart.audioUrl)}
                                        controls={false}
                                        onEnded={() => setIsPlaying(false)}
                                    />
                                    <div className="flex gap-4 justify-center">
                                        <motion.button
                                            onClick={handlePlay}
                                            disabled={isPlaying}
                                            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Play className="h-5 w-5" /> Tinglash
                                        </motion.button>
                                        <motion.button
                                            onClick={handlePause}
                                            disabled={!isPlaying}
                                            className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Square className="h-5 w-5" /> To'xtatish
                                        </motion.button>
                                    </div>
                                    <p className="text-sm text-gray-500">{isPlaying ? "Audio o'ynayapti..." : "Audio to'xtagan."}</p>
                                </div>
                            ) : (
                                <p className="text-red-500 font-medium">Audio fayl topilmadi. Keyingi qismga o'ting.</p>
                            )}
                        </div>

                        <div className="flex justify-between mt-auto pt-6 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    if (!hasPrev) return;
                                    setCurrentPartIndex(prev => prev - 1);
                                    setIsPlaying(false);
                                    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                disabled={!hasPrev}
                                className="flex items-center gap-2 px-4 py-2 border rounded-md font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                <ArrowLeft className="h-4 w-4" /> Oldingi qism
                            </button>

                            <button
                                onClick={() => {
                                    if (!hasNext) return;
                                    setCurrentPartIndex(prev => prev + 1);
                                    setIsPlaying(false);
                                    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                disabled={!hasNext}
                                className="flex items-center gap-2 px-4 py-2 border rounded-md font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Keyingi qism <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Right: Questions */}
                    <div className="lg:w-1/2 p-6 overflow-y-auto">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Savollar</h2>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentPartIndex}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.25 }}
                            >
                                {currentPart?.sections?.length ? (
                                    currentPart.sections.map(section => (
                                        <div key={section.id} className="mb-8">
                                            {section.title && <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">{section.title}</h3>}
                                            {section.imageUrl && (
                                                <div className="my-4">
                                                    <img src={resolveAudioUrl(section.imageUrl)} alt="Bo'lim rasmi" className="rounded-lg shadow-md max-w-full h-auto" />
                                                </div>
                                            )}
                                            {section.questions?.length ? (
                                                section.questions.map(q => renderQuestion(q))
                                            ) : (
                                                <p className="text-gray-500 italic">Bu bo'limda savollar mavjud emas.</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 italic">Bu qismda bo‘limlar mavjud emas.</p>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}