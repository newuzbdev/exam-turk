import React from "react";
import { normalizeDisplayText } from "@/utils/text";
import { getReadingTypographyPreset } from "@/components/reading-test/reading-typography";

interface SimpleTextDisplayProps {
  text: string;
  heading?: string;
  fontScale?: number;
}

const SimpleTextDisplay: React.FC<SimpleTextDisplayProps> = ({
  text,
  heading,
  fontScale = 1,
}) => {
  const typography = getReadingTypographyPreset(fontScale);
  const displayText = normalizeDisplayText(text);
  const lines = displayText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const maybeHeading = lines[0] || "";
  const hasSectionHeading = /^bölüm\s*[-:]?\s*\d+(\.\d+)?$/i.test(maybeHeading.toLowerCase());
  const displayHeading = normalizeDisplayText(heading || maybeHeading).trim();
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
    <div
      className="flex min-h-[62vh] w-full items-center justify-center bg-white px-4 py-8"
      style={typography.style}
    >
      <div className="mx-auto w-full max-w-3xl">
        {displayHeading && (
          <h1
            data-testid="speaking-instruction-heading"
            className="mb-4 text-[length:var(--reading-passage-title-size)] font-semibold leading-[var(--reading-passage-title-line-height)] text-[var(--tm-text-primary)]"
          >
            {displayHeading}
          </h1>
        )}

        <div
          data-testid="speaking-instruction-card"
          className="rounded-md border border-[var(--tm-border-subtle)] bg-white px-6 py-7 sm:px-9 sm:py-8"
        >
          <ul
            className="space-y-3 text-left text-[length:var(--reading-body-size)] leading-[var(--reading-body-line-height)] text-[var(--tm-text-primary)]"
          >
            {bodyLines.map((line, index) => (
              <li key={index} className="flex gap-3">
                <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--tm-text-secondary)]" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SimpleTextDisplay;
