import type { CSSProperties, ReactNode } from "react";

import type { WritingRichTextNode } from "@/services/writingTest.service";

const ALLOWED_TEXT_COLORS = new Set([
  "#242424",
  "#1f2937",
  "#2563eb",
  "#166534",
  "#b91c1c",
  "#92400e",
]);

const renderMarkedText = (
  node: WritingRichTextNode,
  key: string,
): ReactNode => {
  let content: ReactNode = node.text || "";

  for (const [index, mark] of (node.marks || []).entries()) {
    const markKey = `${key}-mark-${index}`;
    if (mark.type === "bold") {
      content = (
        <strong key={markKey} className="font-semibold text-[#242424]">
          {content}
        </strong>
      );
    } else if (mark.type === "italic") {
      content = <em key={markKey}>{content}</em>;
    } else if (mark.type === "underline") {
      content = <u key={markKey}>{content}</u>;
    } else if (mark.type === "textStyle") {
      const requestedColor = String(mark.attrs?.color || "").toLowerCase();
      const style: CSSProperties = ALLOWED_TEXT_COLORS.has(requestedColor)
        ? { color: requestedColor }
        : {};
      content = (
        <span key={markKey} style={style}>
          {content}
        </span>
      );
    }
  }

  return <span key={key}>{content}</span>;
};

const getNodeText = (node: WritingRichTextNode): string => {
  if (node.type === "text") return node.text || "";
  return (node.content || []).map(getNodeText).join("");
};

const containsNodeType = (
  node: WritingRichTextNode,
  nodeType: string,
): boolean =>
  node.type === nodeType ||
  (node.content || []).some((child) => containsNodeType(child, nodeType));

const isQuotedParagraph = (node: WritingRichTextNode) => {
  if (node.type !== "paragraph") return false;
  const text = getNodeText(node).trim();
  return (
    (text.startsWith("“") && text.endsWith("”")) ||
    (text.startsWith('"') && text.endsWith('"'))
  );
};

const renderNode = (
  node: WritingRichTextNode,
  key: string,
  boxQuotedParagraph: boolean,
): ReactNode => {
  if (node.type === "text") return renderMarkedText(node, key);
  if (node.type === "hardBreak") return <br key={key} />;

  const children = (node.content || []).map((child, index) =>
    renderNode(child, `${key}-${index}`, boxQuotedParagraph),
  );

  if (node.type === "doc") return children;
  if (node.type === "blockquote") {
    return (
      <blockquote
        key={key}
        className="box-border w-full space-y-3 rounded-[4px] border border-[#cececa] bg-white px-4 py-3"
      >
        {children}
      </blockquote>
    );
  }
  if (node.type === "paragraph") {
    const boxed = boxQuotedParagraph && isQuotedParagraph(node);
    return (
      <p
        key={key}
        className={
          boxed
            ? "box-border min-h-[1.5em] w-full rounded-[4px] border border-[#cececa] bg-white px-4 py-3"
            : "min-h-[1.5em]"
        }
      >
        {children}
      </p>
    );
  }
  if (node.type === "heading") {
    const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
    const className =
      level === 2
        ? "text-[1.18em] font-semibold leading-[1.45]"
        : "text-[1.05em] font-semibold leading-[1.5]";
    if (level === 2)
      return (
        <h2 key={key} className={className}>
          {children}
        </h2>
      );
    if (level === 3)
      return (
        <h3 key={key} className={className}>
          {children}
        </h3>
      );
    return (
      <h4 key={key} className={className}>
        {children}
      </h4>
    );
  }
  if (node.type === "bulletList") {
    return (
      <ul key={key} className="list-disc space-y-1 pl-5">
        {children}
      </ul>
    );
  }
  if (node.type === "orderedList") {
    return (
      <ol key={key} className="list-decimal space-y-1 pl-5">
        {children}
      </ol>
    );
  }
  if (node.type === "listItem") return <li key={key}>{children}</li>;
  return children;
};

export default function WritingRichText({
  document,
  className = "",
  spacing = "default",
  boxQuotedParagraph = false,
}: {
  document?: WritingRichTextNode | null;
  className?: string;
  spacing?: "default" | "roomy";
  boxQuotedParagraph?: boolean;
}) {
  const hasExplicitBox = document
    ? containsNodeType(document, "blockquote")
    : false;
  const useLegacyQuotedParagraphBox = boxQuotedParagraph && !hasExplicitBox;

  return (
    <div
      className={`${spacing === "roomy" ? "space-y-5" : "space-y-3"} ${className}`}
    >
      {document
        ? renderNode(document, "root", useLegacyQuotedParagraphBox)
        : null}
    </div>
  );
}
