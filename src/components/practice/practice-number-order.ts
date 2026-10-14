export type PracticeNumberOrder = "number-asc" | "number-desc";

const numberCollator = new Intl.Collator("tr", {
  numeric: true,
  sensitivity: "base",
});

export function sortNumberedPractices<T extends { title: string }>(
  items: readonly T[],
  order: PracticeNumberOrder,
): T[] {
  const direction = order === "number-asc" ? 1 : -1;
  return [...items].sort(
    (a, b) => direction * numberCollator.compare(a.title, b.title),
  );
}
