type NumberedQuestion = {
  number?: number | string | null;
};

export function orderListeningQuestions<T extends NumberedQuestion>(
  questions: readonly T[],
): T[] {
  const position = (question: T) => {
    const number = Number(question.number);
    return Number.isInteger(number) && number > 0
      ? number
      : Number.POSITIVE_INFINITY;
  };

  return [...questions].sort((left, right) => position(left) - position(right));
}
