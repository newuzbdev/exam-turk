export type SpeakingResultPartKey =
  | "bolum_1_1"
  | "bolum_1_2"
  | "bolum_2"
  | "bolum_3";

export const regroupSpeakingAnswersByExpectedLayout = <
  T extends { partKey?: SpeakingResultPartKey },
>(
  items: readonly T[],
): Record<SpeakingResultPartKey, Array<T & { partKey: SpeakingResultPartKey }>> => {
  const grouped: Record<
    SpeakingResultPartKey,
    Array<T & { partKey: SpeakingResultPartKey }>
  > = {
    bolum_1_1: [],
    bolum_1_2: [],
    bolum_2: [],
    bolum_3: [],
  };

  items.forEach((item, index) => {
    const partKey =
      index < 3
        ? "bolum_1_1"
        : index < 6
          ? "bolum_1_2"
          : index === 6
            ? "bolum_2"
            : "bolum_3";
    grouped[partKey].push({ ...item, partKey });
  });

  return grouped;
};
