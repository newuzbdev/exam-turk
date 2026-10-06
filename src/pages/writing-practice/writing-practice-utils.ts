import type {
  WritingPracticeContent,
  WritingPracticeTask,
  WritingPracticeTaskCode,
} from "@/services/practice.types";

const TASK_ORDER: WritingPracticeTaskCode[] = [
  "TASK_1_1",
  "TASK_1_2",
  "TASK_2",
];

export const countWritingWords = (text: string): number =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((word) => /[\p{L}\p{N}]/u.test(word)).length;

export type WritingAnswerLimits = {
  wordLimit: number;
  characterLimit: number;
};

export const getWritingAnswerLimits = (
  task: Pick<WritingPracticeTask, "wordMax">,
): WritingAnswerLimits => {
  const recommendedMaximum = Number(task.wordMax || 0);
  const wordLimit =
    recommendedMaximum <= 50
      ? 200
      : recommendedMaximum <= 150
        ? 300
        : recommendedMaximum <= 200
          ? 350
          : Math.max(350, Math.ceil(recommendedMaximum * 1.5));
  return { wordLimit, characterLimit: wordLimit * 12 };
};

export const limitWritingAnswer = (
  value: string,
  limits: WritingAnswerLimits,
): { value: string; wasLimited: boolean } => {
  const source = String(value || "");
  const characterLimited = source.slice(0, limits.characterLimit);
  if (countWritingWords(characterLimited) <= limits.wordLimit) {
    return {
      value: characterLimited,
      wasLimited: characterLimited.length !== source.length,
    };
  }

  let words = 0;
  for (const match of characterLimited.matchAll(/\S+/gu)) {
    const token = String(match[0] || "").replace(/[^\p{L}\p{N}'-]/gu, "");
    if (!/[\p{L}\p{N}]/u.test(token)) continue;
    words += 1;
    if (words > limits.wordLimit) {
      return {
        value: characterLimited.slice(0, match.index).trimEnd(),
        wasLimited: true,
      };
    }
  }

  return { value: characterLimited, wasLimited: true };
};

export const getWritingPracticeTasks = (
  practice: WritingPracticeContent | null,
): WritingPracticeTask[] => {
  if (!practice) return [];
  const order = new Map(TASK_ORDER.map((taskCode, index) => [taskCode, index]));
  return practice.sections
    .flatMap((section) => section.subParts || [])
    .filter((task) => order.has(task.taskCode))
    .sort(
      (left, right) =>
        (order.get(left.taskCode) ?? 99) - (order.get(right.taskCode) ?? 99),
    );
};

export const getWritingTaskSectionLabel = (
  taskCode: WritingPracticeTaskCode,
): string => (taskCode === "TASK_2" ? "Bölüm 2" : "Bölüm 1");

export const getWritingWordTargetLabel = (
  task: Pick<WritingPracticeTask, "wordMin" | "wordMax">,
): string =>
  task.wordMin === task.wordMax
    ? `${task.wordMin} kelime`
    : `${task.wordMin}-${task.wordMax} kelime`;

export const getWritingStudentTaskMetadata = (
  task: Pick<WritingPracticeTask, "taskCode" | "wordMin" | "wordMax">,
): string => {
  const wordTarget = getWritingWordTargetLabel(task);
  if (task.taskCode === "TASK_1_1") {
    return `Mektup · Gayriresmî üslup · ${wordTarget}`;
  }
  if (task.taskCode === "TASK_1_2") {
    return `Mektup · Resmî üslup · ${wordTarget}`;
  }
  return `Kompozisyon · ${wordTarget}`;
};
