import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Eraser,
  Highlighter,
  Pencil,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useReadingNotes, useTextHighlights } from "@/contexts/ReadingNotesContext";
import {
  ReadingReviewEvidenceText,
  useReadingReviewContext,
} from "@/components/results/ReadingReviewContext";
import { useExamTextSelection } from "@/hooks/use-exam-text-selection";
import {
  getReadingSelectionEndRect,
  getReadingSelectionToolbarPosition,
} from "@/lib/reading-selection-toolbar-position";

interface Highlight {
  id: string;
  start: number;
  end: number;
  noteId?: string; // Reference to note in context
}

interface HighlightableTextProps {
  text: string;
  annotationId?: string;
  partNumber?: number;
  onPlainClick?: () => void;
  as?: "p" | "span";
  className?: string;
  wrapperAs?: "div" | "span";
  reviewSourceText?: string;
  reviewSourceOffset?: number;
}

export default function HighlightableText({
  text,
  annotationId,
  partNumber,
  onPlainClick,
  as = "p",
  className,
  reviewSourceOffset,
  reviewSourceText,
  wrapperAs = "div",
}: HighlightableTextProps) {
  const readingReview = useReadingReviewContext();
  const { notes, addNote, updateNote, deleteNote } = useReadingNotes();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [highlights, setHighlights, annotationKey] = useTextHighlights(text, `part-${partNumber ?? 0}:${annotationId || "text"}`);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    viewportX: number;
    viewportTop: number;
    viewportBottom: number;
    viewportY: number;
    boundaryLeft?: number;
    boundaryRight?: number;
    start: number;
    end: number;
  } | null>(null);
  const [notePreview, setNotePreview] = useState<{
    x: number;
    y: number;
    noteText: string;
  } | null>(null);
  const [noteDialog, setNoteDialog] = useState<{
    highlightId?: string;
    isStandalone?: boolean;
    noteId?: string;
    note: string;
    highlightedText?: string; // For standalone notes with selected text
    selectionStart?: number; // Exact start position from tooltip
    selectionEnd?: number; // Exact end position from tooltip
    anchorX?: number;
    anchorY?: number;
  } | null>(null);
  const [noteEditorPosition, setNoteEditorPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  useEffect(() => {
    setTooltip(null);
    setNotePreview(null);
    setNoteDialog(null);
  }, [annotationKey]);

  const containerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const noteEditorRef = useRef<HTMLDivElement>(null);
  const answerGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragged: boolean;
  } | null>(null);
  const suppressNextPlainClickRef = useRef(false);

  const { previewSelection, selectionHandlers } = useExamTextSelection({
    containerRef,
    anchorAtSelectionEnd: true,
    disabled: !!readingReview,
    text,
    onSelectionStart: () => setTooltip(null),
    onSelection: (selection) => {
      const containerRect = containerRef.current?.getBoundingClientRect();
      const selectionBoundary =
        containerRef.current?.closest(".reading-option-row") ||
        containerRef.current;
      const boundaryRect = selectionBoundary?.getBoundingClientRect();
      setTooltip({
        x: containerRect
          ? selection.viewportX - containerRect.left
          : selection.viewportX,
        y: containerRect
          ? selection.viewportTop - containerRect.top - 10
          : selection.viewportTop,
        viewportX: selection.viewportX,
        viewportTop: selection.viewportTop,
        viewportBottom: selection.viewportBottom,
        viewportY: selection.viewportBottom + 8,
        boundaryLeft: boundaryRect?.left,
        boundaryRight: boundaryRect?.right,
        start: selection.start,
        end: selection.end,
      });
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobileViewport(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  // Sync highlights with notes that have highlightedText - automatically highlight noted text
  useEffect(() => {
    if (!text || !partNumber) return;

    const notesWithHighlights = notes.filter(
      (n) => n.highlightedText && n.partNumber === partNumber && (!n.annotationKey || n.annotationKey === annotationKey)
    );

    setHighlights((prev) => {
      const newHighlights = [...prev];
      let hasChanges = false;

      notesWithHighlights.forEach((note) => {
        if (!note.highlightedText) return;

        // Find the text in the reading passage
        const searchText = note.highlightedText.trim();
        if (!searchText || searchText.length < 2) return; // Skip very short text

        // Check if highlight already exists for this note
        const existingHighlight = newHighlights.find((h) => h.noteId === note.id);
        if (existingHighlight) return; // Already highlighted

        // Try to find the text (normalize whitespace for better matching)
        const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
        const normalizedText = text.replace(/\s+/g, ' ');
        
        // Try exact match first
        let index = normalizedText.toLowerCase().indexOf(normalizedSearch.toLowerCase());
        
        // If not found, try without case sensitivity and with original text
        if (index === -1) {
          index = text.toLowerCase().indexOf(searchText.toLowerCase());
        }

        if (index !== -1) {
          // Check if this exact position already has a highlight (link it to note)
          const positionHighlight = newHighlights.find(
            (h) => Math.abs(h.start - index) < 5 && Math.abs(h.end - (index + searchText.length)) < 5
          );
          
          if (positionHighlight) {
            // Update existing highlight to link to note
            const idx = newHighlights.indexOf(positionHighlight);
            newHighlights[idx] = { ...positionHighlight, noteId: note.id };
            hasChanges = true;
          } else {
            // Create new highlight for this noted text
            const highlightId = `note-${note.id}`;
            newHighlights.push({
              id: highlightId,
              start: index,
              end: index + searchText.length,
              noteId: note.id,
            });
            hasChanges = true;
          }
        }
      });

      return hasChanges ? newHighlights : prev;
    });
  }, [notes, text, partNumber, annotationKey, setHighlights]);

  useEffect(() => {
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
      const endRect = getReadingSelectionEndRect(range);
      const containerRect = containerRef.current.getBoundingClientRect();
      const selectionBoundary =
        containerRef.current.closest(".reading-option-row") ||
        containerRef.current;
      const boundaryRect = selectionBoundary.getBoundingClientRect();

      setTooltip({
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 10,
        viewportX: endRect.right,
        viewportTop: endRect.top,
        viewportBottom: endRect.bottom,
        viewportY: endRect.bottom + 8,
        boundaryLeft: boundaryRect.left,
        boundaryRight: boundaryRect.right,
        start,
        end,
      });
    };

    document.addEventListener("touchend", handleNativeTouchSelection, {
      passive: true,
    });
    return () => {
      document.removeEventListener("touchend", handleNativeTouchSelection);
    };
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
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

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = answerGestureRef.current;
    if (
      gesture &&
      gesture.pointerId === event.pointerId &&
      Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) >=
        6
    ) {
      gesture.dragged = true;
    }
    selectionHandlers.onPointerMove(event);
  };

  const handlePlainClick = (event: ReactMouseEvent<HTMLElement>) => {
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

  useLayoutEffect(() => {
    if (!noteDialog || isMobileViewport || typeof window === "undefined") {
      setNoteEditorPosition(null);
      return;
    }

    const positionEditor = () => {
      const editor = noteEditorRef.current;
      if (!editor) return;

      const viewportMargin = 12;
      const anchorX = noteDialog.anchorX ?? window.innerWidth / 2;
      const anchorY = noteDialog.anchorY ?? window.innerHeight / 3;
      const editorRect = editor.getBoundingClientRect();
      const editorWidth = editorRect.width || 336;
      const editorHeight = Math.min(
        editorRect.height,
        window.innerHeight - viewportMargin * 2,
      );
      const left = Math.min(
        Math.max(viewportMargin, anchorX - editorWidth / 2),
        window.innerWidth - editorWidth - viewportMargin,
      );
      const belowTop = anchorY;
      const aboveTop = anchorY - editorHeight - 12;
      const top =
        belowTop + editorHeight <= window.innerHeight - viewportMargin
          ? belowTop
          : aboveTop >= viewportMargin
            ? aboveTop
            : Math.max(
                viewportMargin,
                window.innerHeight - editorHeight - viewportMargin,
              );

      setNoteEditorPosition({ left, top });
    };

    positionEditor();
    window.addEventListener("resize", positionEditor);
    return () => window.removeEventListener("resize", positionEditor);
  }, [
    isMobileViewport,
    noteDialog?.anchorX,
    noteDialog?.anchorY,
    noteDialog?.highlightedText,
  ]);

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const target = event.target as Node | null;
      if (!target) return;
      const inTooltip =
        (tooltipRef.current && tooltipRef.current.contains(target)) ||
        (noteEditorRef.current && noteEditorRef.current.contains(target));
      const inMark = (target as HTMLElement)?.closest?.("mark");
      // Clear when clicking anywhere that's not tooltip or a highlight
      if (!inTooltip && !inMark) {
        setTooltip(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleHighlight = () => {
    if (!tooltip) return;

    const exists = highlights.some(
      (h) => h.start === tooltip.start && h.end === tooltip.end
    );

    if (!exists) {
      setHighlights((prev) => [
        ...prev,
        { id: Date.now().toString(), start: tooltip.start, end: tooltip.end },
      ]);
    }

    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleClearSelection = () => {
    if (!tooltip) return;

    const matchingHighlights = highlights.filter(
      (highlight) =>
        highlight.start === tooltip.start && highlight.end === tooltip.end
    );

    matchingHighlights.forEach((highlight) => {
      if (highlight.noteId) deleteNote(highlight.noteId);
    });

    setHighlights((prev) =>
      prev.filter(
        (highlight) =>
          highlight.start !== tooltip.start || highlight.end !== tooltip.end
      )
    );
    setTooltip(null);
    setNotePreview(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleAddNote = () => {
    if (!tooltip) return;

    // Get the selected text
    const selectedText = text.substring(tooltip.start, tooltip.end).trim();
    if (!selectedText) return;

    // Find or create highlight for this selection
    let highlight = highlights.find(
      (h) => h.start === tooltip.start && h.end === tooltip.end
    );

    // If no highlight exists, create one
    if (!highlight) {
      const highlightId = `highlight-${Date.now()}`;
      const newHighlight: Highlight = {
        id: highlightId,
        start: tooltip.start,
        end: tooltip.end,
      };
      setHighlights((prev) => [...prev, newHighlight]);
      highlight = newHighlight;
    }

    // Get existing note if one exists
    const existingNote = highlight.noteId
      ? notes.find((n) => n.id === highlight.noteId)
      : null;

    // Always use the selected text from the current selection
    const currentSelectedText = text.substring(tooltip.start, tooltip.end).trim();

    setNoteDialog({
      highlightId: highlight.id,
      noteId: highlight.noteId,
      note: existingNote?.text || "",
      highlightedText: currentSelectedText || selectedText, // Always include the selected text
      selectionStart: tooltip.start,
      selectionEnd: tooltip.end,
      anchorX: tooltip.viewportX,
      anchorY: tooltip.viewportY,
    });
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleAddStandaloneNote = () => {
    let selectedText = "";
    let selectionStart: number | undefined;
    let selectionEnd: number | undefined;
    
    // First, try to get selected text from tooltip (most reliable when tooltip is showing)
    if (tooltip) {
      selectedText = text.substring(tooltip.start, tooltip.end).trim();
      selectionStart = tooltip.start;
      selectionEnd = tooltip.end;
    }
    
    // If no tooltip, try to get from current selection
    if (!selectedText) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (containerRef.current && containerRef.current.contains(range.startContainer)) {
          selectedText = selection.toString().trim();
          
          // Calculate positions from selection
          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(containerRef.current);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          selectionStart = preSelectionRange.toString().length;
          selectionEnd = selectionStart + selectedText.length;
        }
      }
    }

    setNoteDialog({
      isStandalone: true,
      note: "",
      // If there's selected text, we'll use it as highlightedText
      highlightedText: selectedText || undefined,
      selectionStart,
      selectionEnd,
      anchorX: tooltip?.viewportX,
      anchorY: tooltip?.viewportY,
    });
    
    // Clear tooltip and selection after capturing
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleSaveNote = () => {
    if (!noteDialog) return;

    const noteText = noteDialog.note.trim();
    if (!noteText) {
      setNoteDialog(null);
      return;
    }

    if (noteDialog.isStandalone) {
      // Add standalone note - if there's selected text, include it
      const selectedText = noteDialog.highlightedText?.trim();
      
      if (selectedText && selectedText.length > 0) {
        // Use exact positions from tooltip if available (most accurate)
        let highlightStart = noteDialog.selectionStart;
        let highlightEnd = noteDialog.selectionEnd;
        
        // If we have exact positions, use them directly
        if (highlightStart !== undefined && highlightEnd !== undefined && highlightStart >= 0 && highlightEnd > highlightStart) {
          // Create highlight with exact positions
          const highlightId = `standalone-${Date.now()}`;
          const highlight: Highlight = {
            id: highlightId,
            start: highlightStart,
            end: highlightEnd,
          };
          
          setHighlights((prev) => [...prev, highlight]);
          
          // Create note with highlightedText
          const newNote = addNote({
            annotationKey,
            text: noteText,
            partNumber,
            highlightedText: selectedText,
            highlightId: highlight.id,
          });
          
          // Link highlight to note
          if (newNote && newNote.id) {
            setHighlights((prev) =>
              prev.map((h) =>
                h.id === highlight.id ? { ...h, noteId: newNote.id } : h
              )
            );
          }
        } else {
          // No exact positions, try to find text in passage
          const textLower = text.toLowerCase();
          const searchLower = selectedText.toLowerCase();
          const index = textLower.indexOf(searchLower);
          
          if (index !== -1) {
            // Create highlight at found position
            const highlightId = `standalone-${Date.now()}`;
            const highlight: Highlight = {
              id: highlightId,
              start: index,
              end: index + selectedText.length,
            };
            
            setHighlights((prev) => [...prev, highlight]);
            
            // Create note with highlightedText
            const newNote = addNote({
            annotationKey,
              text: noteText,
              partNumber,
              highlightedText: selectedText,
              highlightId: highlight.id,
            });
            
            // Link highlight to note
            if (newNote && newNote.id) {
              setHighlights((prev) =>
                prev.map((h) =>
                  h.id === highlight.id ? { ...h, noteId: newNote.id } : h
                )
              );
            }
          } else {
            // Text not found in passage, but still save highlightedText
            addNote({
            annotationKey,
              text: noteText,
              partNumber,
              highlightedText: selectedText, // Still save it even if not found
            });
          }
        }
      } else {
        // No selected text, create general note
        addNote({
            annotationKey,
          text: noteText,
          partNumber,
        });
      }
    } else if (noteDialog.highlightId) {
      // Add/update note for highlight
      const highlight = highlights.find((h) => h.id === noteDialog.highlightId);
      if (highlight) {
        // Get the highlighted text - prioritize dialog (from selection), then extract from highlight
        const highlightedText = (noteDialog.highlightedText?.trim() || text.substring(highlight.start, highlight.end).trim());

        if (noteDialog.noteId) {
          // Update existing note - use the highlightedText from dialog or preserve existing
          const existingNote = notes.find((n) => n.id === noteDialog.noteId);
          updateNote(noteDialog.noteId, noteText, highlightedText || existingNote?.highlightedText);
        } else {
          // Create new note - ensure highlight exists first
          setHighlights((prev) => {
            const exists = prev.find((h) => h.id === highlight.id);
            if (!exists) {
              return [...prev, highlight];
            }
            return prev;
          });

          const newNote = addNote({
            annotationKey,
            text: noteText,
            partNumber,
            highlightId: highlight.id,
            highlightedText: highlightedText, // Always include the highlighted text
          });
          
          // Link highlight to note
          if (newNote && newNote.id) {
            setHighlights((prev) =>
              prev.map((h) =>
                h.id === highlight.id ? { ...h, noteId: newNote.id } : h
              )
            );
          }
        }
      }
    }

    setNoteDialog(null);
  };

  const handleDeleteNote = () => {
    if (!noteDialog) return;

    if (noteDialog.noteId) {
      deleteNote(noteDialog.noteId);
      // Remove note reference from highlight
      if (noteDialog.highlightId) {
        setHighlights((prev) =>
          prev.map((h) =>
            h.id === noteDialog.highlightId ? { ...h, noteId: undefined } : h
          )
        );
      }
    }

    setNoteDialog(null);
  };

  const renderText = () => {
    const parts = [];
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
      const note = h.noteId ? notes.find((n) => n.id === h.noteId) : null;
      const hasNote = !!note;

      parts.push(
        <mark
          key={h.id}
          className={`relative cursor-pointer select-none rounded-[3px] px-0.5 text-inherit transition-colors ${
            hasNote
              ? "bg-[#edf3f7] underline decoration-[#8091a2] decoration-dashed decoration-1 underline-offset-[3px]"
              : "bg-[#fff0a8]"
          }`}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const rect = target.getBoundingClientRect();
            const lineRects = Array.from(target.getClientRects()).filter(
              (lineRect) => lineRect.width > 0 || lineRect.height > 0,
            );
            const endRect = lineRects[lineRects.length - 1] || rect;
            const containerRect = containerRef.current!.getBoundingClientRect();
            const selectionBoundary =
              containerRef.current!.closest(".reading-option-row") ||
              containerRef.current!;
            const boundaryRect = selectionBoundary.getBoundingClientRect();

            setTooltip({
              x: rect.left - containerRect.left + rect.width / 2,
              y: rect.top - containerRect.top - 10,
              viewportX: endRect.right,
              viewportTop: endRect.top,
              viewportBottom: endRect.bottom,
              viewportY: endRect.bottom + 8,
              boundaryLeft: boundaryRect.left,
              boundaryRight: boundaryRect.right,
              start: h.start,
              end: h.end,
            });
          }}
          onMouseEnter={(e) => {
            if (hasNote && note) {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setNotePreview({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 8,
                noteText: note.text,
              });
            }
          }}
          onMouseLeave={() => {
            setNotePreview(null);
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

  const selectionToolbarStyle = (() => {
    if (!tooltip || typeof window === "undefined" || isMobileViewport) {
      return undefined;
    }

    return getReadingSelectionToolbarPosition({
      anchorX: tooltip.viewportX,
      selectionTop: tooltip.viewportTop,
      selectionBottom: tooltip.viewportBottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      boundaryLeft: tooltip.boundaryLeft,
      boundaryRight: tooltip.boundaryRight,
      bottomReserved: 64,
    });
  })();

  const Component = as === "span" ? "span" : "p";
  const Wrapper = wrapperAs === "span" ? "span" : "div";

  if (readingReview) {
    return (
      <ReadingReviewEvidenceText
        text={text}
        as={as}
        className={className}
        sourceOffset={reviewSourceOffset}
        sourceText={reviewSourceText}
        wrapperAs={wrapperAs}
      />
    );
  }

  return (
    <>
      <Wrapper
        ref={containerRef as any}
        className={`relative select-text lg:select-none ${onPlainClick ? "cursor-pointer" : ""}`}
        translate="no"
        {...selectionHandlers}
        onClick={handlePlainClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <Component className={`reading-text font-sans whitespace-pre-line ${className || ""}`}>
          {renderText()}
        </Component>
      </Wrapper>

      {typeof document !== "undefined" && createPortal(
        <>
        {tooltip && (
        <div
          ref={tooltipRef}
          className={`${isMobileViewport
            ? "fixed bottom-[max(5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2"
            : "fixed"
          } z-[80] flex w-[148px] max-w-[calc(100vw-1rem)] flex-col items-stretch gap-0.5 rounded-md border border-[#dededb] bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]`}
          style={isMobileViewport
            ? undefined
            : selectionToolbarStyle}
          role="toolbar"
          aria-label="Metin araçları"
          data-exam-selection-ignore="true"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-full justify-start gap-1.5 rounded px-2.5 text-sm font-medium text-[#37352f] hover:bg-[#f5f5f3]"
            onClick={handleHighlight}
            disabled={isHighlighted}
            title="Seçili metni vurgula"
          >
            <Highlighter className="h-4 w-4 text-[#9a7914]" />
            Vurgula
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-full justify-start gap-1.5 rounded px-2.5 text-sm font-medium text-[#37352f] hover:bg-[#f5f5f3] disabled:opacity-35"
            onClick={handleClearSelection}
            disabled={!isHighlighted}
            title="Seçili işareti temizle"
          >
            <Eraser className="h-4 w-4 text-[#6f6e69]" />
            Temizle
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-full justify-start gap-1.5 rounded px-2.5 text-sm font-medium text-[#37352f] hover:bg-[#f5f5f3]"
            onClick={isHighlighted ? handleAddNote : handleAddStandaloneNote}
            title="Seçili metne not ekle"
          >
            <Pencil className="h-4 w-4 text-[#657789]" />
            Not al
          </Button>
        </div>
      )}

      {/* Note Preview Tooltip - Shows note content when hovering over highlighted text with note */}
      {notePreview && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs rounded-md border border-[#d9e0e6] bg-white px-3 py-2.5 text-xs text-[#37352f] shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
          style={{
            top: notePreview.y,
            left: notePreview.x,
            transform: "translate(-50%, 0)",
          }}
        >
          <div className="flex items-start gap-2">
            <StickyNote className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#657789]" />
            <div className="flex-1 min-w-0">
              <p className="mb-1 text-[11px] font-semibold text-[#657789]">Not</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                {notePreview.noteText.length > 100 
                  ? notePreview.noteText.substring(0, 100) + "..." 
                  : notePreview.noteText}
              </p>
            </div>
          </div>
        </div>
      )}

      {noteDialog && (
        <div
          ref={noteEditorRef}
          role="dialog"
          aria-label="Metin notu"
          className={`fixed z-[90] flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-md border border-[#dededb] bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.16)] ${
            isMobileViewport
              ? "bottom-[max(5rem,env(safe-area-inset-bottom))] left-3 right-3"
              : "w-[min(21rem,calc(100vw-1.5rem))]"
          }`}
          style={
            isMobileViewport
              ? undefined
              : {
                  left: noteEditorPosition?.left ?? 12,
                  top: noteEditorPosition?.top ?? 12,
                  visibility: noteEditorPosition ? "visible" : "hidden",
                }
          }
        >
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <StickyNote className="h-4 w-4 shrink-0 text-[#657789]" />
              <span className="text-sm font-semibold text-[#37352f]">
                {noteDialog.noteId ? "Notu düzenle" : "Not ekle"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setNoteDialog(null)}
              className="flex h-7 w-7 items-center justify-center rounded text-[#787774] hover:bg-[#f1f1ef] hover:text-[#37352f]"
              aria-label="Not panelini kapat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {noteDialog.highlightedText ? (
            <blockquote className="reading-text mb-3 min-h-0 max-h-24 overflow-y-auto whitespace-pre-wrap border-l-2 border-[#b8b7b2] pl-3 pr-1 font-sans">
              {noteDialog.highlightedText}
            </blockquote>
          ) : null}
          <div className="shrink-0">
            <Textarea
              id="highlight-note-textarea"
              placeholder={`Notunuzu buraya yaz\u0131n...`}
              value={noteDialog.note}
              onChange={(event) =>
                setNoteDialog((current) =>
                  current ? { ...current, note: event.target.value } : current
                )
              }
              className="min-h-[84px] resize-none border-[#dededb] bg-white text-sm leading-relaxed shadow-none focus-visible:ring-1 focus-visible:ring-[#a8a8a3]"
              autoFocus
            />
          </div>
          <div className="mt-3 flex shrink-0 items-center justify-between gap-2">
            {noteDialog.noteId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteNote}
                className="h-8 gap-1.5 px-2 text-xs text-[#9f3f3f] hover:bg-[#fff1f1] hover:text-[#8e3030]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Notu Sil
              </Button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setNoteDialog(null)}
                variant="ghost"
                className="h-8 px-3 text-xs text-[#6f6e69] hover:bg-[#f5f5f3]"
              >
                İptal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNote}
                disabled={!noteDialog.note.trim()}
                className="h-8 bg-[#37352f] px-3 text-xs text-white hover:bg-[#262521] disabled:bg-[#d8d8d5]"
              >
                {noteDialog.noteId ? "Kaydet" : "Ekle"}
              </Button>
            </div>
          </div>
        </div>
        )}
        </>,
        document.body,
      )}
    </>
  );
}
