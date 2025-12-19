import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

interface Highlight {
  id: string;
  start: number;
  end: number;
}

export default function HighlightableText({ text }: { text: any }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    start: number;
    end: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      if (
        !containerRef.current ||
        !containerRef.current.contains(range.startContainer)
      ) {
        setTooltip(null);
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(containerRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);

      const start = preSelectionRange.toString().length;
      const end = start + selectedText.length;

      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      setTooltip({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 10,
        start,
        end,
      });
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setTooltip(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleHighlight = () => {
    if (!tooltip) return;

    const exists = highlights.some(
      (h) => h.start === tooltip.start && h.end === tooltip.end
    );

    if (exists) {
      setHighlights((prev) =>
        prev.filter(
          (h) => !(h.start === tooltip.start && h.end === tooltip.end)
        )
      );
    } else {
      setHighlights((prev) => [
        ...prev,
        { id: Date.now().toString(), start: tooltip.start, end: tooltip.end },
      ]);
    }

    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderText = () => {
    const parts = [];
    let lastIndex = 0;

    const sorted = [...highlights].sort((a, b) => a.start - b.start);

    for (const h of sorted) {
      if (h.start > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, h.start)}
          </span>
        );
      }
      parts.push(
        <mark
          key={h.id}
          className="bg-yellow-300 rounded-sm px-0.5 select-none cursor-pointer"
          onClick={(e) => {
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const containerRect = containerRef.current!.getBoundingClientRect();

            setTooltip({
              x: rect.left - containerRect.left + rect.width / 2,
              y: rect.top - containerRect.top - 10,
              start: h.start,
              end: h.end,
            });
          }}
        >
          {text.substring(h.start, h.end)}
        </mark>
      );
      lastIndex = h.end;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={`text-end`}>{text.substring(lastIndex)}</span>);
    }

    return parts;
  };

  const isHighlighted = tooltip
    ? highlights.some((h) => h.start === tooltip.start && h.end === tooltip.end)
    : false;

  return (
    <div ref={containerRef} className="relative">
      <p className="leading-relaxed text-gray-700 whitespace-pre-line">
        {renderText()}
      </p>

      {tooltip && (
        <div
          className="absolute bg-black text-white text-xs px-3 py-2 rounded shadow-lg flex items-center gap-2 z-50"
          style={{
            top: tooltip.y + window.scrollY,
            left: tooltip.x,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span>{isHighlighted ? "Kaldırılsın mı?" : "Vurgulansın mı?"}</span>
          <Button
            size="sm"
            className="bg-yellow-400 text-black hover:bg-yellow-500"
            onClick={handleHighlight}
          >
            {isHighlighted ? "Kaldır" : "Vurgula"}
          </Button>
        </div>
      )}
    </div>
  );
}
