import { useState } from "react";

type RichLessonTextProps = {
  text: string | null;
};

type RichBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

type InlineToken =
  | { type: "text"; value: string }
  | { type: "blank"; placeholder: string | null }
  | { type: "code"; value: string }
  | { type: "link"; label: string; href: string; safe: boolean; external: boolean }
  | { type: "strong" | "em" | "strike" | "mark" | "underline"; value: string };

type InlinePattern = {
  type: InlineToken["type"];
  regex: RegExp;
  build: (match: RegExpExecArray) => InlineToken;
};

type InlineMatch = {
  index: number;
  raw: string;
  token: InlineToken;
  priority: number;
};

const inlinePatterns: InlinePattern[] = [
  {
    type: "code",
    regex: /`([^`\n]+)`/g,
    build: (match) => ({ type: "code", value: match[1] ?? "" }),
  },
  {
    type: "blank",
    regex: /\{\{blank(?::([^}]+))?\}\}/g,
    build: (match) => ({
      type: "blank",
      placeholder: match[1]?.trim() || null,
    }),
  },
  {
    type: "link",
    regex: /\[([^\]\n]+)\]\(([^)\s]+)\)/g,
    build: (match) => {
      const href = match[2]?.trim() ?? "";
      const safe = isSafeRichLessonUrl(href);
      return {
        type: "link",
        label: match[1] ?? "",
        href,
        safe,
        external: safe && isExternalRichLessonUrl(href),
      };
    },
  },
  {
    type: "strong",
    regex: /\*\*([^*\n]+)\*\*/g,
    build: (match) => ({ type: "strong", value: match[1] ?? "" }),
  },
  {
    type: "mark",
    regex: /==([^=\n]+)==/g,
    build: (match) => ({ type: "mark", value: match[1] ?? "" }),
  },
  {
    type: "strike",
    regex: /~~([^~\n]+)~~/g,
    build: (match) => ({ type: "strike", value: match[1] ?? "" }),
  },
  {
    type: "underline",
    regex: /\+\+([^+\n]+)\+\+/g,
    build: (match) => ({ type: "underline", value: match[1] ?? "" }),
  },
  {
    type: "em",
    regex: /\*([^*\n]+)\*/g,
    build: (match) => ({ type: "em", value: match[1] ?? "" }),
  },
];

export default function RichLessonText({ text }: RichLessonTextProps) {
  if (!text?.trim()) return null;

  const blocks = parseRichLessonMarkdown(text);
  if (blocks.length === 0) {
    return <PlainLessonText text={text} />;
  }

  return (
    <div className="rich-lesson-content space-y-4 text-[15px] leading-7 text-[var(--tm-text-primary)]">
      {blocks.map((block, index) => (
        <RichLessonBlock
          key={`${block.type}-${index}`}
          block={block}
          blockIndex={index}
        />
      ))}
    </div>
  );
}

export function parseRichLessonMarkdown(text: string): RichBlock[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: RichBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (isTableStart(lines, index)) {
      const table = parseTable(lines, index);
      blocks.push(table.block);
      index = table.nextIndex;
      continue;
    }

    if (/^\s*>\s+/.test(line)) {
      const collected: string[] = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index] ?? "")) {
        collected.push((lines[index] ?? "").replace(/^\s*>\s?/, "").trim());
        index += 1;
      }
      blocks.push({ type: "blockquote", text: collected.join(" ") });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*[-*]\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "unordered-list", items });
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*\d+[.)]\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !isBlockStart(lines, index)
    ) {
      paragraphLines.push(lines[index]?.trim() ?? "");
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks.filter((block) => {
    if (block.type === "table") return block.headers.length > 0;
    if ("items" in block) return block.items.length > 0;
    return block.text.trim().length > 0;
  });
}

export function parseRichLessonInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const next = findNextInlineToken(text, cursor);

    if (!next) {
      tokens.push({ type: "text", value: text.slice(cursor) });
      break;
    }

    if (next.index > cursor) {
      tokens.push({ type: "text", value: text.slice(cursor, next.index) });
    }

    tokens.push(next.token);
    cursor = next.index + next.raw.length;
  }

  return tokens.filter((token) => token.type !== "text" || token.value.length > 0);
}

export function isSafeRichLessonUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return true;

  try {
    const url = new URL(trimmed, "https://turkishmock.local");
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function RichLessonBlock({
  block,
  blockIndex,
}: {
  block: RichBlock;
  blockIndex: number;
}) {
  if (block.type === "heading") {
    const HeadingTag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
    const className =
      block.level === 1
        ? "text-2xl font-semibold tracking-[-0.02em]"
        : block.level === 2
          ? "text-xl font-semibold tracking-[-0.01em]"
          : "text-lg font-semibold";

    return (
      <HeadingTag className={`${className} text-[var(--tm-text-primary)]`}>
        <InlineContent text={block.text} blockIndex={blockIndex} />
      </HeadingTag>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p className="whitespace-normal break-words">
        <InlineContent text={block.text} blockIndex={blockIndex} />
      </p>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote className="border-l-4 border-[var(--tm-border-default)] bg-[var(--tm-bg-app)] px-4 py-3 text-[var(--tm-text-secondary)]">
        <InlineContent text={block.text} blockIndex={blockIndex} />
      </blockquote>
    );
  }

  if (block.type === "unordered-list") {
    return (
      <ul className="list-disc space-y-2 pl-6">
        {block.items.map((item, itemIndex) => (
          <li key={`${item}-${itemIndex}`} className="pl-1">
            <InlineContent
              text={item}
              blockIndex={blockIndex}
              tokenPrefix={`ul-${itemIndex}`}
            />
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "ordered-list") {
    return (
      <ol className="list-decimal space-y-2 pl-6">
        {block.items.map((item, itemIndex) => (
          <li key={`${item}-${itemIndex}`} className="pl-1">
            <InlineContent
              text={item}
              blockIndex={blockIndex}
              tokenPrefix={`ol-${itemIndex}`}
            />
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-[var(--tm-border-subtle)]">
      <table className="min-w-full border-collapse bg-white text-left text-sm">
        <thead className="bg-[var(--tm-bg-muted)] text-[var(--tm-text-secondary)]">
          <tr>
            {block.headers.map((header, headerIndex) => (
              <th
                key={`${header}-${headerIndex}`}
                className="border-b border-[var(--tm-border-subtle)] px-3 py-2 font-semibold"
              >
                <InlineContent
                  text={header}
                  blockIndex={blockIndex}
                  tokenPrefix={`th-${headerIndex}`}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="border-t border-[var(--tm-border-subtle)]">
              {block.headers.map((_, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="min-w-32 px-3 py-2 align-top text-[var(--tm-text-primary)]"
                >
                  <InlineContent
                    text={row[cellIndex] ?? ""}
                    blockIndex={blockIndex}
                    tokenPrefix={`td-${rowIndex}-${cellIndex}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InlineContent({
  text,
  blockIndex,
  tokenPrefix = "inline",
}: {
  text: string;
  blockIndex: number;
  tokenPrefix?: string;
}) {
  return (
    <>
      {parseRichLessonInline(text).map((token, tokenIndex) => (
        <InlineTokenView
          key={`${blockIndex}-${tokenPrefix}-${tokenIndex}`}
          token={token}
          tokenId={`${blockIndex}-${tokenPrefix}-${tokenIndex}`}
        />
      ))}
    </>
  );
}

function InlineTokenView({
  token,
  tokenId,
}: {
  token: InlineToken;
  tokenId: string;
}) {
  switch (token.type) {
    case "text":
      return <>{token.value}</>;
    case "blank":
      return <InlineBlankInput tokenId={tokenId} placeholder={token.placeholder} />;
    case "code":
      return (
        <code className="rounded bg-[var(--tm-bg-muted)] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--tm-text-primary)]">
          {token.value}
        </code>
      );
    case "link":
      if (!token.safe) {
        return <>{token.label}</>;
      }
      return (
        <a
          href={token.href}
          target={token.external ? "_blank" : undefined}
          rel={token.external ? "noreferrer noopener" : undefined}
          className="font-medium text-[var(--tm-accent)] underline underline-offset-4"
        >
          <InlineContent text={token.label} blockIndex={0} tokenPrefix={`link-${tokenId}`} />
        </a>
      );
    case "strong":
      return (
        <strong className="font-semibold">
          <InlineContent text={token.value} blockIndex={0} tokenPrefix={`strong-${tokenId}`} />
        </strong>
      );
    case "em":
      return (
        <em>
          <InlineContent text={token.value} blockIndex={0} tokenPrefix={`em-${tokenId}`} />
        </em>
      );
    case "strike":
      return (
        <s>
          <InlineContent text={token.value} blockIndex={0} tokenPrefix={`strike-${tokenId}`} />
        </s>
      );
    case "mark":
      return (
        <mark className="rounded bg-yellow-100 px-1 text-[var(--tm-text-primary)]">
          <InlineContent text={token.value} blockIndex={0} tokenPrefix={`mark-${tokenId}`} />
        </mark>
      );
    case "underline":
      return (
        <u className="underline-offset-2">
          <InlineContent text={token.value} blockIndex={0} tokenPrefix={`underline-${tokenId}`} />
        </u>
      );
    default:
      return null;
  }
}

function InlineBlankInput({
  tokenId,
  placeholder,
}: {
  tokenId: string;
  placeholder: string | null;
}) {
  const [value, setValue] = useState("");

  return (
    <input
      aria-label="Boşluk doldurma"
      type="text"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder ?? ""}
      className="mx-1 inline-flex h-8 min-w-20 max-w-[11rem] rounded-md border border-[var(--tm-border-default)] bg-white px-2 text-sm align-baseline text-[var(--tm-text-primary)] outline-none transition placeholder:text-[var(--tm-text-tertiary)] focus:border-[var(--tm-text-secondary)] focus:ring-2 focus:ring-[var(--tm-bg-muted)]"
      data-blank-id={tokenId}
    />
  );
}

function PlainLessonText({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-7 text-[var(--tm-text-primary)]">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p
          key={`${paragraph.slice(0, 24)}-${index}`}
          className="whitespace-pre-line break-words"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function findNextInlineToken(text: string, cursor: number): InlineMatch | null {
  let bestMatch: InlineMatch | null = null;

  inlinePatterns.forEach((pattern, priority) => {
    pattern.regex.lastIndex = cursor;
    const match = pattern.regex.exec(text);
    if (!match?.[0]) return;
    if (
      !bestMatch ||
      match.index < bestMatch.index ||
      (match.index === bestMatch.index && priority < bestMatch.priority)
    ) {
      bestMatch = {
        index: match.index,
        raw: match[0],
        token: pattern.build(match),
        priority,
      };
    }
  });

  return bestMatch;
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? "";
  return (
    /^(#{1,3})\s+/.test(line) ||
    /^\s*>\s+/.test(line) ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    isTableStart(lines, index)
  );
}

function isTableStart(lines: string[], index: number) {
  const header = lines[index] ?? "";
  const divider = lines[index + 1] ?? "";
  return header.includes("|") && isTableDivider(divider);
}

function isTableDivider(line: string) {
  const cells = splitTableRow(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
  );
}

function parseTable(lines: string[], index: number) {
  const headers = splitTableRow(lines[index] ?? "");
  const rows: string[][] = [];
  let nextIndex = index + 2;

  while (nextIndex < lines.length && (lines[nextIndex] ?? "").includes("|")) {
    const row = splitTableRow(lines[nextIndex] ?? "");
    if (row.length === 0) break;
    rows.push(row);
    nextIndex += 1;
  }

  return {
    block: { type: "table" as const, headers, rows },
    nextIndex,
  };
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isExternalRichLessonUrl(value: string) {
  const trimmed = value.trim();
  return /^(https?:)?\/\//i.test(trimmed) || /^mailto:/i.test(trimmed);
}
