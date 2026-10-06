const normalizeOption = (value: unknown) =>
  String(value ?? "").trim().replace(/\.$/, "");

export function countOptionSelections(
  answers: Record<string, string>,
  questionIds: readonly string[],
  option: string,
): number {
  const selectedOption = normalizeOption(option);
  if (!selectedOption) return 0;

  return questionIds.reduce(
    (count, questionId) =>
      count + (normalizeOption(answers[questionId]) === selectedOption ? 1 : 0),
    0,
  );
}
