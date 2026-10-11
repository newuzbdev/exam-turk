export type HomeResultScope = "ALL" | "LISTENING" | "READING" | "WRITING" | "SPEAKING" | "FULL";

export interface HomeResult {
  id: string;
  name: string;
  avatarUrl?: string;
  date: string;
  dinleme: number | null;
  okuma: number | null;
  yazma: number | null;
  konusma: number | null;
  overallScore: number;
  level: string;
  isExample?: true;
}

// Fictional, explicitly labelled UI examples. Never persisted as users or tests.
const example = (
  id: string, name: string, date: string,
  scores: [number | null, number | null, number | null, number | null],
  avatarUrl?: string,
): HomeResult => {
  const completed = scores.filter((score): score is number => score !== null);
  const overallScore = Math.round(completed.reduce((sum, score) => sum + score, 0) / completed.length);
  return {
    id: `example-${id}`, name, date, avatarUrl,
    dinleme: scores[0], okuma: scores[1], yazma: scores[2], konusma: scores[3],
    overallScore, level: overallScore >= 65 ? "C1" : overallScore >= 51 ? "B2" : "B1",
    isExample: true,
  };
};

export const HOME_RESULT_EXAMPLES: readonly HomeResult[] = [
  example("diyor", "Diyor", "05.09.2026", [70, 68, 65, 69]),
  example("zarina", "Zarina Karimova", "03.04.2026", [66, 65, 61, 64]),
  example("gulnoza", "Gulnoza Rustamova", "28.09.2026", [64, 65, 58, 61]),
  example("samarkand", "Azizbek Rasulov", "04.08.2026", [61, 62, 55, 58], "/generated/home-result-examples/azizbek-park-20261009.png"),
  example("kamola", "Kamola Sobirova", "20.03.2026", [60, 59, 54, 59], "/generated/home-result-examples/kamola-20261009.png"),
  example("jasur", "Jasur Ismoilov", "16.03.2026", [54, 55, 47, 52], "/generated/home-result-examples/jasur-20261009.png"),
  example("nilufar", "nilufar", "13.09.2026", [null, null, null, 66], "/generated/home-result-examples/nilufar-window-20261009.png"),
  example("aziza", "Aziza Rahimova", "23.08.2026", [null, 64, null, null]),
  example("umid", "umid", "10.04.2026", [null, 62, null, null]),
  example("asilbek", "asilbek", "22.09.2026", [null, 60, null, null]),
  example("alina", "alina", "12.07.2026", [null, null, null, 57]),
  example("sardor", "sardor_7", "26.03.2026", [null, null, null, 55]),
  example("behruz", "behruz", "24.04.2026", [null, null, 53, null]),
];

const isFull = (result: HomeResult) =>
  [result.dinleme, result.okuma, result.yazma, result.konusma].every(score => score !== null);

export function fillWithExampleResults(
  realResults: readonly HomeResult[], scope: HomeResultScope, limit = 15,
): HomeResult[] {
  const size = Math.max(0, Math.floor(limit));
  const real = realResults.slice(0, size);
  if (real.length === size) return real;
  const field = { LISTENING: "dinleme", READING: "okuma", WRITING: "yazma", SPEAKING: "konusma" } as const;
  const matching = HOME_RESULT_EXAMPLES.filter(result =>
    scope === "ALL" || (scope === "FULL" ? isFull(result) : result[field[scope]] !== null));
  // All actual API results retain their order and take slots before examples.
  // Full examples come first in ALL; each example group is ordered by score.
  const ordered = [...matching].sort((a, b) =>
    (scope === "ALL" ? Number(isFull(b)) - Number(isFull(a)) : 0) || b.overallScore - a.overallScore);
  return [...real, ...ordered.slice(0, size - real.length)];
}
