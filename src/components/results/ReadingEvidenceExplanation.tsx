import { Fragment, type ReactNode } from "react";

type ReadingEvidenceExplanationProps = {
  value: string;
  className?: string;
};

type InlineFormatRule = {
  open: string;
  close: string;
  render: (children: ReactNode, key: string) => ReactNode;
};

const formatRules: InlineFormatRule[] = [
  {
    open: "**",
    close: "**",
    render: (children, key) => (
      <strong key={key} className="font-bold text-inherit">
        {children}
      </strong>
    ),
  },
  {
    open: "[green]",
    close: "[/green]",
    render: (children, key) => (
      <span key={key} className="font-medium text-[#2f6f3d]">
        {children}
      </span>
    ),
  },
  {
    open: "[blue]",
    close: "[/blue]",
    render: (children, key) => (
      <span key={key} className="font-semibold text-[#2454a6]">
        {children}
      </span>
    ),
  },
  {
    open: "*",
    close: "*",
    render: (children, key) => (
      <em key={key} className="italic text-inherit">
        {children}
      </em>
    ),
  },
];

const nextFormatRule = (value: string, from: number) => {
  const matches = formatRules
    .map((rule) => ({ rule, index: value.indexOf(rule.open, from) }))
    .filter((match) => match.index >= 0)
    .sort(
      (left, right) =>
        left.index - right.index ||
        right.rule.open.length - left.rule.open.length,
    );

  return matches[0] || null;
};

const renderFormattedText = (
  value: string,
  keyPrefix = "evidence-explanation",
): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let nodeIndex = 0;

  while (cursor < value.length) {
    const match = nextFormatRule(value, cursor);
    if (!match) {
      nodes.push(
        <Fragment key={`${keyPrefix}-text-${nodeIndex}`}>
          {value.slice(cursor)}
        </Fragment>,
      );
      break;
    }

    if (match.index > cursor) {
      nodes.push(
        <Fragment key={`${keyPrefix}-text-${nodeIndex}`}>
          {value.slice(cursor, match.index)}
        </Fragment>,
      );
      nodeIndex += 1;
    }

    const contentStart = match.index + match.rule.open.length;
    const contentEnd = value.indexOf(match.rule.close, contentStart);
    if (contentEnd < 0) {
      nodes.push(
        <Fragment key={`${keyPrefix}-text-${nodeIndex}`}>
          {value.slice(match.index)}
        </Fragment>,
      );
      break;
    }

    const key = `${keyPrefix}-format-${nodeIndex}`;
    nodes.push(
      match.rule.render(
        renderFormattedText(value.slice(contentStart, contentEnd), key),
        key,
      ),
    );
    nodeIndex += 1;
    cursor = contentEnd + match.rule.close.length;
  }

  return nodes;
};

export default function ReadingEvidenceExplanation({
  value,
  className,
}: ReadingEvidenceExplanationProps) {
  return (
    <span className={`whitespace-pre-wrap ${className || ""}`}>
      {renderFormattedText(String(value || ""))}
    </span>
  );
}
