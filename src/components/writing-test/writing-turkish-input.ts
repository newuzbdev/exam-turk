export const TURKISH_CHARACTER_SHORTCUTS = [
  { lower: "ç", upper: "Ç", key: "C", code: "KeyC" },
  { lower: "ğ", upper: "Ğ", key: "G", code: "KeyG" },
  { lower: "ı", upper: "İ", key: "I", code: "KeyI" },
  { lower: "ö", upper: "Ö", key: "O", code: "KeyO" },
  { lower: "ş", upper: "Ş", key: "S", code: "KeyS" },
  { lower: "ü", upper: "Ü", key: "U", code: "KeyU" },
] as const;

export const TURKISH_LONG_PRESS_DELAY_MS = 420;

const TURKISH_LONG_PRESS_CHARACTERS = new Map<
  string,
  (typeof TURKISH_CHARACTER_SHORTCUTS)[number]
>(
  TURKISH_CHARACTER_SHORTCUTS.map((shortcut) => [
    shortcut.key.toLocaleLowerCase("en-US"),
    shortcut,
  ]),
);

export const getTurkishLongPressCharacter = (
  key: string,
  shiftKey: boolean,
) => {
  const shortcut = TURKISH_LONG_PRESS_CHARACTERS.get(
    key.toLocaleLowerCase("en-US"),
  );
  if (!shortcut) return null;
  return shiftKey ? shortcut.upper : shortcut.lower;
};
