import React from "react";
import { normalizeDisplayText } from "@/utils/text";

interface SimpleTextDisplayProps {
  text: string;
  isPlaying: boolean;
}

const SimpleTextDisplay: React.FC<SimpleTextDisplayProps> = ({ text, isPlaying }) => {
  const displayText = normalizeDisplayText(text);
  const lines = displayText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const maybeHeading = lines[0] || "";
  const hasSectionHeading = /^bölüm\s*[-:]?\s*\d+(\.\d+)?$/i.test(maybeHeading.toLowerCase());
  const rawBodyLines = hasSectionHeading ? lines.slice(1) : lines;

  // Keep comma-continued lines in the same bullet item.
  const bodyLines = rawBodyLines.reduce<string[]>((acc, line) => {
    const current = line.trim();
    if (!current) return acc;
    if (!acc.length) {
      acc.push(current);
      return acc;
    }

    const prev = acc[acc.length - 1];
    if (/[,:;]$/.test(prev)) {
      acc[acc.length - 1] = `${prev} ${current}`.replace(/\s+/g, " ").trim();
      return acc;
    }

    acc.push(current);
    return acc;
  }, []);

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center bg-white py-6 sm:py-10">
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm px-4 sm:px-8 py-5 sm:py-7">
          {!isPlaying && (
            <h1
              className="text-center font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight"
              style={{ fontSize: "clamp(1.3rem, 3.6vw, 2.1rem)" }}
            >
              Bölüm Açıklaması
            </h1>
          )}

          {hasSectionHeading && (
            <h2
              className="text-center font-semibold text-gray-900 mb-3 sm:mb-5"
              style={{ fontSize: "clamp(1rem, 2.4vw, 1.35rem)" }}
            >
              {maybeHeading}
            </h2>
          )}

          <ul
            className="mx-auto text-gray-800 text-left list-disc list-inside space-y-2 sm:space-y-3"
            style={{
              fontSize: "clamp(1rem, 2.2vw, 1.35rem)",
              lineHeight: 1.72,
              letterSpacing: "0.002em",
              maxWidth: "72ch",
            }}
          >
            {bodyLines.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleTextDisplay;
