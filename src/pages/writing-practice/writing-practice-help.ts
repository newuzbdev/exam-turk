import { getPracticeErrorMessage } from "@/services/practice.types";

export const writingHelpErrorMessage = (reason: unknown, fallback: string) => {
  const code = (reason as { response?: { data?: { code?: string } } })?.response?.data?.code;
  const messages: Record<string, string> = {
    WRITING_HELP_PENDING: "Yanıt hazırlanıyor. Biraz sonra tekrar deneyin.",
    WRITING_HELP_LIMIT_REACHED: "Bu pratikteki 10 yardım hakkınız tamamlandı.",
    WRITING_HELP_NOT_READY: "Bu pratiğin yardımı henüz hazırlanmamış.",
    WRITING_HELP_INVALID_QUESTION: "Hazır sorulardan birini seçin.",
    WRITING_HELP_TEXT_TOO_LONG: "Metniniz yardım için çok uzun.",
  };
  return (code && messages[code]) || getPracticeErrorMessage(reason, fallback);
};

export type WritingHelpQuestion = { id: string; label: string };
export type WritingHelpReply = { id: string; questionId: string; reply: string; createdAt: string };
export type WritingPracticeHelpContent = {
  plan: { label: string; text: string }[];
  opening: string;
  words: { word: string; meaning: string }[];
  questions: WritingHelpQuestion[];
  limit: number;
  used: number;
  remaining: number;
  history: WritingHelpReply[];
};
export type WritingPracticeHelpAnswer = WritingHelpReply & {
  cached: boolean;
  limit: number;
  used: number;
  remaining: number;
};
