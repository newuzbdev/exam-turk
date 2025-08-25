import { motion, AnimatePresence } from "framer-motion"
import { X, Award, MessageSquare, Sparkles, TrendingUp } from "lucide-react"

interface SubmissionResult {
    id: string
    score: number
    aiFeedback: string
    submittedAt: string
    speakingTestId: string
    userId: string
}

interface ResultModalProps {
    isOpen: boolean
    onClose: () => void
    result: SubmissionResult | null
}

export default function ResultModal({ isOpen, onClose, result }: ResultModalProps) {
    if (!isOpen || !result) return null

    const getScoreColor = (score: number) => {
        if (score >= 80) return "from-emerald-500 to-teal-600"
        if (score >= 60) return "from-blue-500 to-indigo-600"
        if (score >= 40) return "from-amber-500 to-orange-600"
        return "from-red-500 to-pink-600"
    }

    const getPerformanceLevel = (score: number) => {
        if (score >= 80) return "Mukammal"
        if (score >= 60) return "Yaxshi"
        if (score >= 40) return "O'rtacha"
        return "Yaxshilanishi kerak"
    }

    return (
        <AnimatePresence mode="wait">
            {isOpen && (
                <motion.div
                    className="fixed inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-lg flex items-center justify-center z-[999999] p-4"

                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={onClose}
                >
                    <motion.div

                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden border border-white/20"
                        style={{ perspective: "1000px" }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/20 to-transparent rounded-full blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full blur-xl" />

                        <div className="relative p-8">
                            <motion.button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:text-gray-900 hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl border border-gray-200/50"
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X className="w-5 h-5" />
                            </motion.button>

                            <motion.div className="text-center mb-8">
                                <motion.div className="inline-flex items-center gap-3 mb-2" whileHover={{ scale: 1.05 }}>
                                    <Sparkles className="w-6 h-6 text-blue-600" />
                                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                        Test Natijalari
                                    </h2>
                                    <Sparkles className="w-6 h-6 text-purple-600" />
                                </motion.div>
                                <p className="text-gray-600 text-sm">Sizning natijangiz tayyor!</p>
                            </motion.div>

                            <motion.div

                                className={`relative p-8 bg-gradient-to-br ${getScoreColor(result.score)} text-white rounded-2xl shadow-2xl mb-6 overflow-hidden`}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full blur-lg" />

                                <div className="relative flex flex-col items-center text-center">
                                    <motion.div className="mb-4">
                                        <Award className="w-16 h-16 drop-shadow-lg" />
                                    </motion.div>

                                    <motion.p

                                        className="text-sm font-semibold uppercase tracking-wider opacity-90 mb-2"
                                    >
                                        Umumiy Ball
                                    </motion.p>

                                    <motion.div className="flex items-baseline gap-2 mb-3" >
                                        <span className="text-6xl font-black drop-shadow-lg">{result.score}</span>
                                        <span className="text-2xl font-bold opacity-80">/100</span>
                                    </motion.div>

                                    <motion.div

                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm"
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        <span className="text-sm font-semibold">{getPerformanceLevel(result.score)}</span>
                                    </motion.div>
                                </div>
                            </motion.div>

                            <motion.div

                                className="relative p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-lg border border-gray-200/50 mb-6 overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100/50 rounded-full blur-xl" />

                                <div className="relative">
                                    <motion.div
                                        className="flex items-center gap-3 mb-4"
                                        whileHover={{ x: 5 }}
                                        transition={{ type: "spring", stiffness: 400 }}
                                    >
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <MessageSquare className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-800">AI Tahlili</h3>
                                    </motion.div>

                                    <motion.p className="text-gray-700 leading-relaxed whitespace-pre-line" >
                                        {result.aiFeedback}
                                    </motion.p>
                                </div>
                            </motion.div>

                            <motion.div

                                className="text-center p-4 bg-gray-50/50 rounded-xl border border-gray-200/30"
                            >
                                <p className="text-sm text-gray-500">
                                    Yakunlangan sana:{" "}
                                    <span className="font-semibold text-gray-700">
                                        {new Date(result.submittedAt).toLocaleString("tr-TR")}
                                    </span>
                                </p>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
