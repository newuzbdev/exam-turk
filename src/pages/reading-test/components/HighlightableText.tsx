import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StickyNote } from "lucide-react";
import { useReadingNotes } from "@/contexts/ReadingNotesContext";

interface Highlight {
  id: string;
  start: number;
  end: number;
  noteId?: string; // Reference to note in context
}

interface HighlightableTextProps {
  text: string;
  partNumber?: number;
  as?: "p" | "span";
  className?: string;
  wrapperAs?: "div" | "span";
}

export default function HighlightableText({
  text,
  partNumber,
  as = "p",
  className,
  wrapperAs = "div",
}: HighlightableTextProps) {
  const { notes, addNote, updateNote, deleteNote } = useReadingNotes();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
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
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Sync highlights with notes that have highlightedText - automatically highlight noted text
  useEffect(() => {
    if (!text || !partNumber) return;

    const notesWithHighlights = notes.filter(
      (n) => n.highlightedText && n.partNumber === partNumber
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
  }, [notes, text, partNumber]);

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

    const handleTouchEnd = () => {
      // Reuse same logic for mobile long-press selection
      handleMouseUp();
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const target = event.target as Node;
      const inTooltip = tooltipRef.current && tooltipRef.current.contains(target);
      const inMark = (target as HTMLElement)?.closest?.("mark");
      // Clear when clicking anywhere that's not tooltip or a highlight
      if (!inTooltip && !inMark) {
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
    });
    
    // Clear tooltip and selection after capturing
    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  const handleSaveNote = () => {
    if (!noteDialog) return;

    const textarea = document.getElementById("highlight-note-textarea") as HTMLTextAreaElement;
    const noteText = textarea?.value.trim() || noteDialog.note.trim();
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
              text: noteText,
              partNumber,
              highlightedText: selectedText, // Still save it even if not found
            });
          }
        }
      } else {
        // No selected text, create general note
        addNote({
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

    const sorted = [...highlights].sort((a, b) => a.start - b.start);

    for (const h of sorted) {
      if (h.start > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {text.substring(lastIndex, h.start)}
          </span>
        );
      }
      const note = h.noteId ? notes.find((n) => n.id === h.noteId) : null;
      const hasNote = !!note;

      parts.push(
        <mark
          key={h.id}
          className={`${hasNote ? 'bg-yellow-400' : 'bg-yellow-300'} rounded-sm px-0.5 select-none cursor-pointer relative group`}
          onClick={(e) => {
            // If clicking on the note icon, open note dialog directly
            if ((e.target as HTMLElement).closest('.note-icon')) {
              if (note) {
                setNoteDialog({
                  highlightId: h.id,
                  noteId: h.noteId,
                  note: note.text || "",
                });
              }
              return;
            }

            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const containerRect = containerRef.current!.getBoundingClientRect();

            setTooltip({
              x: rect.left - containerRect.left + rect.width / 2,
              y: rect.top - containerRect.top - 10,
              start: h.start,
              end: h.end,
            });
          }}
          onMouseEnter={(e) => {
            if (hasNote && note) {
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              const containerRect = containerRef.current!.getBoundingClientRect();
              setNotePreview({
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top - 10,
                noteText: note.text,
              });
            }
          }}
          onMouseLeave={() => {
            setNotePreview(null);
          }}
        >
          {text.substring(h.start, h.end)}
          {hasNote && (
            <StickyNote 
              className="note-icon inline-block ml-1 w-3 h-3 text-yellow-800 opacity-80 hover:opacity-100 cursor-pointer" 
              onClick={(e) => {
                e.stopPropagation();
                if (note) {
                  setNoteDialog({
                    highlightId: h.id,
                    noteId: h.noteId,
                    note: note.text || "",
                  });
                }
              }}
            />
          )}
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

  const Component = as === "span" ? "span" : "p";
  const Wrapper = wrapperAs === "span" ? "span" : "div";

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setTooltip(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <Wrapper ref={containerRef as any} className="relative" onMouseDown={handleContainerClick}>
      <Component className={`reading-text font-sans whitespace-pre-line ${className || ""}`}>
        {renderText()}
      </Component>

      {tooltip && (
        <div
          ref={tooltipRef}
          className="absolute bg-black text-white text-xs px-3 py-2 rounded shadow-lg flex items-center gap-2 z-50"
          style={{
            top: tooltip.y + window.scrollY,
            left: tooltip.x,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span>{isHighlighted ? `Kald\u0131r\u0131ls\u0131n m\u0131?` : `Vurgulans\u0131n m\u0131?`}</span>
          <Button
            size="sm"
            className="bg-yellow-400 text-black hover:bg-yellow-500"
            onClick={handleHighlight}
          >
            {isHighlighted ? `Kald\u0131r` : `Vurgula`}
          </Button>
          {isHighlighted && (
            <Button
              size="sm"
              className="bg-blue-500 text-white hover:bg-blue-600"
              onClick={handleAddNote}
            >
              <StickyNote className="w-3 h-3 mr-1" />
              Not
            </Button>
          )}
          <Button
            size="sm"
            className="bg-green-500 text-white hover:bg-green-600"
            onClick={handleAddStandaloneNote}
          >
            <StickyNote className="w-3 h-3 mr-1" />
            Not Ekle
          </Button>
        </div>
      )}

      {/* Note Preview Tooltip - Shows note content when hovering over highlighted text with note */}
      {notePreview && (
        <div
          className="absolute bg-yellow-50 border-2 border-yellow-400 text-gray-800 text-xs px-3 py-2.5 rounded-lg shadow-xl z-50 max-w-xs pointer-events-none"
          style={{
            top: notePreview.y + window.scrollY + 15,
            left: notePreview.x,
            transform: "translate(-50%, 0)",
          }}
        >
          <div className="flex items-start gap-2">
            <StickyNote className="w-4 h-4 text-yellow-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-yellow-800 mb-1.5 text-[11px] uppercase tracking-wide">Notunuz:</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">
                {notePreview.noteText.length > 100 
                  ? notePreview.noteText.substring(0, 100) + "..." 
                  : notePreview.noteText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Note Dialog */}
      <Dialog open={!!noteDialog} onOpenChange={(open) => !open && setNoteDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
          <DialogTitle>{`Not Ekle/D\u00fczenle`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              id="highlight-note-textarea"
              placeholder={`Notunuzu buraya yaz\u0131n...`}
              defaultValue={noteDialog?.note || ""}
              className="min-h-[100px]"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            {noteDialog?.noteId && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteNote}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Notu Sil
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setNoteDialog(null)}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              {`\u0130ptal`}
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveNote}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {noteDialog?.isStandalone ? "Ekle" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}
