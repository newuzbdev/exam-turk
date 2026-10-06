export type ListeningAnswerMap = Record<string, string>;

type MatchingOptionInput = {
  answers: ListeningAnswerMap;
  questionId: string;
  option: string;
};

export const assignListeningAnswer = ({
  answers,
  questionId,
  option,
}: MatchingOptionInput): ListeningAnswerMap => {
  if (answers[questionId] === option) return answers;
  return { ...answers, [questionId]: option };
};
