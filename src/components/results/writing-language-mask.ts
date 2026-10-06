// Display only: mirror speaking's severe-language mask without changing its code.
const roots = [
  "sik", "orospu", "piç", "yarrak", "yarrağ", "ibne", "kahpe",
  "amın", "amcık", "göt", "fuck", "motherfuck",
];
const exceptions = ["siklet", "sikke", "siklon", "götür"];

export const maskWritingReportText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.replace(/\p{L}+/gu, (token) => {
    const lower = token.toLocaleLowerCase("tr-TR");
    if (exceptions.some((prefix) => lower.startsWith(prefix)) ||
        !roots.some((prefix) => lower.startsWith(prefix))) return token;
    // Retain UTF-16 length so annotation offsets still point to the same text.
    return token.length <= 2 ? "*".repeat(token.length)
      : `${token[0]}${"*".repeat(token.length - 2)}${token[token.length - 1]}`;
  });
};
