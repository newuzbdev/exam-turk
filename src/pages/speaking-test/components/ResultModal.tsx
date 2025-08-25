import { motion, AnimatePresence } from "framer-motion";
import { X, Award, MessageSquare } from "lucide-react";

interface SubmissionResult {
    id: string;
    score: number;
    aiFeedback: string;
    submittedAt: string;
    speakingTestId: string;
    userId: string;
}

interface ResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    result: SubmissionResult | null;
}

export default function ResultModal({ isOpen, onClose, result }: ResultModalProps) {
    if (!isOpen || !result) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[999999]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 50, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 220, damping: 24 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Title */}
                    <h2 className="text-2xl font-extrabold text-center text-gray-900 mb-6">
                        Natijangiz
                    </h2>

                    {/* Score Card */}
                    <div className="p-6 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-2xl shadow-xl shadow-red-200/50 flex flex-col items-center">
                        <Award className="w-12 h-12 mb-2 drop-shadow-md" />
                        <p className="text-sm font-bold uppercase tracking-wide opacity-90">
                            Umumiy ball
                        </p>
                        <p className="text-5xl font-extrabold mt-1 drop-shadow-lg">
                            {result.score}
                        </p>
                    </div>

                    {/* Feedback */}
                    <div className="mt-6 p-5 border rounded-xl bg-gray-50 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="w-5 h-5 text-red-600" />
                            <p className="text-sm font-bold text-gray-700">AI fikri</p>
                        </div>
                        <p className="text-gray-800 whitespace-pre-line leading-relaxed">
                            {result.aiFeedback}
                        </p>
                    </div>

                    {/* Date */}
                    <div className="mt-6 text-sm text-gray-500 text-center">
                        Yakunlangan sana:{" "}
                        <span className="font-medium text-gray-700">
                            {new Date(result.submittedAt).toLocaleString("tr-TR")}
                        </span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
