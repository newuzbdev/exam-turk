import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Eraser, Highlighter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTextHighlights } from "@/contexts/ReadingNotesContext";
import { useExamTextSelection } from "@/hooks/use-exam-text-selection";

interface HighlightableTextSimpleProps {
  text: string;
  annotationId?: string;
  onPlainClick?: () => void;
}

export default function HighlightableTextSimple({
  text,
  annotationId = "text",
  onPlainClick,
}: HighlightableTextSimpleProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const answerGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragged: boolean;
  } | null>(null);
  const suppressNextPlainClickRef = useRef(false);
  const [highlights, setHighlights] = useTextHighlights(text, annotationId);
  const [tooltip, setTooltip] = useState<{
    viewportX: number;
    viewportTop: number;
    viewportBottom: number;
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (
        tooltip &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !toolbarRef.current?.contains(event.target as Node)
      ) {
        setTooltip(null);
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [tooltip]);

  useEffect(() => {
    setTooltip(null);
  }, [text, annotationId]);

  const handleNativeTouchSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (
      !containerRef.current ||
      !containerRef.current.contains(range.startContainer) ||
      !containerRef.current.contains(range.endContainer)
    ) {
      setTooltip(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    suppressNextPlainClickRef.current = true;

    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerRef.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);

    const start = preSelectionRange.toString().length;
    const end = start + selectedText.length;

    const rect = range.getBoundingClientRect();
    setTooltip({
      viewportX: rect.left + rect.width / 2,
      viewportTop: rect.top,
      viewportBottom: rect.bottom,
      start,
      end,
    });
  };

  const { previewSelection, selectionHandlers } = useExamTextSelection({
    containerRef,
    text,
    onSelectionStart: () => setTooltip(null),
    onSelection: (selection) => setTooltip(selection),
  });

  const handlePointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.pointerType !== "touch" && event.button === 0) {
      answerGestureRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragged: false,
      };
    }
    selectionHandlers.onPointerDown(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    const gesture = answerGestureRef.current;
    if (
      gesture &&
      gesture.pointerId === event.pointerId &&
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >= 6
    ) {
      gesture.dragged = true;
    }
    selectionHandlers.onPointerMove(event);
  };

  const handlePlainClick = (event: ReactMouseEvent<HTMLSpanElement>) => {
    event.stopPropagation();
    const gesture = answerGestureRef.current;
    answerGestureRef.current = null;

    if (suppressNextPlainClickRef.current) {
      suppressNextPlainClickRef.current = false;
      return;
    }
    if (
      gesture?.dragged ||
      (event.target as Element).closest(
        'mark,[data-exam-selection-ignore="true"]',
      )
    ) {
      return;
    }
    onPlainClick?.();
  };

  const handleHighlight = () => {
    if (!tooltip) return;

    setHighlights((current) => {
      let start = tooltip.start;
      let end = tooltip.end;
      const remaining = current.filter((highlight) => {
        const overlaps = highlight.start <= end && highlight.end >= start;
        if (overlaps) {
          start = Math.min(start, highlight.start);
          end = Math.max(end, highlight.end);
        }
        return !overlaps;
      });

      return [
        ...remaining,
        {
          id: Date.now().toString(),
          start,
          end,
        },
      ];
    });

    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleClearHighlight = () => {
    if (!tooltip) return;

    setHighlights((current) =>
      current.filter(
        (highlight) =>
          highlight.start !== tooltip.start || highlight.end !== tooltip.end,
      ),
    );
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderText = () => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    const activeSelection =
      previewSelection ??
      (tooltip &&
      !highlights.some(
        (highlight) =>
          highlight.start === tooltip.start && highlight.end === tooltip.end,
      )
        ? { start: tooltip.start, end: tooltip.end }
        : null);

    const pushPlainText = (start: number, end: number, key: string) => {
      if (end <= start) return;

      if (
        !activeSelection ||
        activeSelection.end <= start ||
        activeSelection.start >= end
      ) {
        parts.push(<span key={key}>{text.substring(start, end)}</span>);
        return;
      }

      const selectedStart = Math.max(start, activeSelection.start);
      const selectedEnd = Math.min(end, activeSelection.end);

      if (selectedStart > start) {
        parts.push(
          <span key={`${key}-before`}>
            {text.substring(start, selectedStart)}
          </span>,
        );
      }
      parts.push(
        <span
          key={`${key}-selected`}
          data-exam-selection-preview
          className="rounded-[2px] bg-[#dce8f5] text-inherit"
        >
          {text.substring(selectedStart, selectedEnd)}
        </span>,
      );
      if (selectedEnd < end) {
        parts.push(
          <span key={`${key}-after`}>
            {text.substring(selectedEnd, end)}
          </span>,
        );
      }
    };

    const sorted = [...highlights].sort((a, b) => a.start - b.start);

    for (const h of sorted) {
      if (h.start > lastIndex) {
        pushPlainText(lastIndex, h.start, `text-${lastIndex}`);
      }

      parts.push(
        <mark
          key={h.id}
          className="cursor-pointer select-none rounded-[3px] bg-[#fff0a8] px-0.5 text-inherit"
          style={{ fontSize: "inherit", lineHeight: "inherit" }}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            setTooltip({
              viewportX: rect.left + rect.width / 2,
              viewportTop: rect.top,
              viewportBottom: rect.bottom,
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
      pushPlainText(lastIndex, text.length, "text-end");
    }

    return parts;
  };

  const isHighlighted = tooltip
    ? highlights.some((h) => h.start === tooltip.start && h.end === tooltip.end)
    : false;

  const toolbarStyle = (() => {
    if (!tooltip || typeof window === "undefined") return undefined;

    const toolbarWidth = 166;
    const toolbarHeight = 44;
    const left = Math.min(
      Math.max(8, tooltip.viewportX - toolbarWidth / 2),
      window.innerWidth - toolbarWidth - 8,
    );
    const top =
      tooltip.viewportBottom + toolbarHeight + 8 <= window.innerHeight
        ? tooltip.viewportBottom + 8
        : Math.max(8, tooltip.viewportTop - toolbarHeight - 8);

    return { left, top };
  })();

  return (
    <>
      <span
        ref={containerRef}
        className="relative select-text lg:select-none"
        translate="no"
        {...selectionHandlers}
        onClick={handlePlainClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onTouchEnd={handleNativeTouchSelection}
      >
        {renderText()}
      </span>

      {tooltip && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={toolbarRef}
              className="fixed z-[80] flex max-w-[calc(100vw-1rem)] items-center gap-1 rounded-md border border-[#dededb] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
              style={toolbarStyle}
              role="toolbar"
              aria-label="Metin araçları"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 rounded px-2.5 text-xs font-medium text-[#37352f] hover:bg-[#f5f5f3] disabled:opacity-35"
                onClick={handleHighlight}
                disabled={isHighlighted}
                title="Seçili metni vurgula"
              >
                <Highlighter className="h-3.5 w-3.5 text-[#9a7914]" />
                Vurgula
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 rounded px-2.5 text-xs font-medium text-[#37352f] hover:bg-[#f5f5f3] disabled:opacity-35"
                onClick={handleClearHighlight}
                disabled={!isHighlighted}
                title="Seçili işareti temizle"
              >
                <Eraser className="h-3.5 w-3.5 text-[#6f6e69]" />
                Temizle
              </Button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
