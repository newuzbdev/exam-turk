export const fixMojibake = (input: string) => {
  if (!input) return input;
  return input
    .replace(/Ã¼/g, "ü")
    .replace(/Ãœ/g, "Ü")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã–/g, "Ö")
    .replace(/Ã§/g, "ç")
    .replace(/Ã‡/g, "Ç")
    .replace(/Ä±/g, "ı")
    .replace(/Ä°/g, "İ")
    .replace(/ÅŸ/g, "ş")
    .replace(/Åž/g, "Ş")
    .replace(/ÄŸ/g, "ğ")
    .replace(/Äž/g, "Ğ")
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€�/g, "”")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—");
};
