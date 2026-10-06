export type MockPackageCategory = "CEFR_MOCK" | "LISTENING" | "READING" | "WRITING" | "SPEAKING";
export type MockSkill = "listening" | "reading" | "writing" | "speaking";

export const packageTabs: { value: MockPackageCategory; label: string }[] = [
  { value: "CEFR_MOCK", label: "CEFR MOCK" },
  { value: "LISTENING", label: "Dinleme" },
  { value: "READING", label: "Okuma" },
  { value: "WRITING", label: "Yazma" },
  { value: "SPEAKING", label: "Konuşma" },
];

export const categorySkill: Partial<Record<MockPackageCategory, MockSkill>> = {
  LISTENING: "listening",
  READING: "reading",
  WRITING: "writing",
  SPEAKING: "speaking",
};

export const getPackageTab = (test: { category?: MockPackageCategory }): MockPackageCategory =>
  test.category ?? "CEFR_MOCK";

type Package = { id: string; category?: MockPackageCategory };
type PublishedTest = { ieltsId: string };

export function getAvailablePackageTabs(
  packages: Package[],
  tests: Record<MockSkill, PublishedTest[]>,
): Set<MockPackageCategory> {
  const idsBySkill = {
    listening: new Set(tests.listening.map((test) => test.ieltsId)),
    reading: new Set(tests.reading.map((test) => test.ieltsId)),
    writing: new Set(tests.writing.map((test) => test.ieltsId)),
    speaking: new Set(tests.speaking.map((test) => test.ieltsId)),
  };
  return new Set(packages.filter((test) => {
    const category = getPackageTab(test);
    const skill = categorySkill[category];
    return skill
      ? idsBySkill[skill].has(test.id)
      : Object.values(idsBySkill).some((ids) => ids.has(test.id));
  }).map(getPackageTab));
}
