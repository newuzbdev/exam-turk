import { useState } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  StickyNote,
  FileText,
  Plus,
  Trash2,
  Edit2,
  X,
} from "lucide-react";
import { useReadingNotes, type Note } from "@/contexts/ReadingNotesContext";

interface NotesPanelProps {
  currentPartNumber?: number;
  variant?: "default" | "practice";
}

interface NoteEditorState {
  note: Note | null;
  value: string;
}

export default function NotesPanel({
  currentPartNumber,
  variant = "default",
}: NotesPanelProps) {
  const { notes, addNote, updateNote, deleteNote, getNotesByPart } = useReadingNotes();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [editor, setEditor] = useState<NoteEditorState | null>(null);
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);

  const currentPartNotes = currentPartNumber
    ? getNotesByPart(currentPartNumber)
    : notes;
  const isPractice = variant === "practice";
  const displayNotes = isPractice
    ? currentPartNotes
    : showAllNotes
      ? notes
      : currentPartNotes;
  const sortedDisplayNotes = [...displayNotes].sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      setEditor(null);
      setDeletePendingId(null);
    }
  };

  const handleAddNote = () => {
    setDeletePendingId(null);
    setEditor({
      note: null,
      value: "",
    });
  };

  const handleEditNote = (note: Note) => {
    setDeletePendingId(null);
    setEditor({
      note,
      value: note.text,
    });
  };

  const handleSaveNote = () => {
    const noteText = editor?.value.trim();
    if (!editor || !noteText) return;

    if (!editor.note) {
      addNote({
        text: noteText,
        partNumber: currentPartNumber,
      });
    } else {
      updateNote(editor.note.id, noteText, editor.note.highlightedText);
    }

    setEditor(null);
  };

  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    setDeletePendingId(null);
    if (editor?.note?.id === noteId) {
      setEditor(null);
    }
  };

  return (
    <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
      <SheetTrigger asChild>
        {isPractice ? (
          <button
            type="button"
            aria-label="Notlar"
            className={`group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent transition-[background-color,color,box-shadow] ${
              isSheetOpen
                ? "bg-white text-[#242424] shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
                : "bg-transparent text-[#64645f] hover:bg-white hover:text-[#242424] hover:shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
            }`}
          >
            <FileText className="h-4 w-4" strokeWidth={1.75} />
            <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-[#111827] px-2.5 py-1 text-[12px] font-medium text-white shadow-sm group-hover:block">
              Notlar
            </span>
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-[#d9d9d6] bg-white px-3 text-[#37352f] shadow-none hover:bg-[#f7f7f5]"
          >
            <StickyNote className="mr-1.5 h-4 w-4" />
            Notlar
            {notes.length > 0 && (
              <span className="ml-2 min-w-5 border-l border-[#dededb] pl-2 text-xs font-medium tabular-nums text-[#787774]">
                {notes.length}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        className="reading-notes-sheet flex w-full flex-col border-l border-[#e5e5e2] bg-white p-0 sm:max-w-[420px]"
      >
        <SheetHeader className="border-b border-[#e9e9e6] px-5 py-4 pr-12 text-left">
          <SheetTitle className="text-[17px] font-semibold tracking-normal text-[#2f2f2c]">
            Notlar
          </SheetTitle>
          <SheetClose
            aria-label="Notları kapat"
            className="reading-notes-mobile-close absolute right-4 top-3 hidden h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-[#5f5e5a] hover:bg-[#f3f3f1]"
          >
            Kapat <X className="h-4 w-4" aria-hidden="true" />
          </SheetClose>
          <SheetDescription className="sr-only">
            {isPractice
              ? "Pratik sırasında aldığınız notları görüntüleyin ve düzenleyin."
              : "Sınav sırasında aldığınız notları görüntüleyin ve düzenleyin."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
          <div className="sticky top-0 z-10 -mx-5 border-b border-[#eeeeeb] bg-white px-5 py-3">
            <div
              className={`flex items-center gap-2 ${isPractice ? "justify-end" : ""}`}
            >
              {currentPartNumber && !isPractice && (
                <div className="grid min-w-0 flex-1 grid-cols-2 rounded-md bg-[#f3f3f1] p-0.5">
                  <button
                    type="button"
                    onClick={() => setShowAllNotes(false)}
                    className={`h-8 rounded-[5px] px-2 text-xs font-medium transition-colors ${
                      !showAllNotes
                        ? "bg-white text-[#37352f] shadow-[0_1px_2px_rgba(15,15,15,0.08)]"
                        : "text-[#787774] hover:text-[#37352f]"
                    }`}
                  >
                    Bu bölüm
                    <span className="ml-1 tabular-nums text-[#9b9a97]">
                      {currentPartNotes.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAllNotes(true)}
                    className={`h-8 rounded-[5px] px-2 text-xs font-medium transition-colors ${
                      showAllNotes
                        ? "bg-white text-[#37352f] shadow-[0_1px_2px_rgba(15,15,15,0.08)]"
                        : "text-[#787774] hover:text-[#37352f]"
                    }`}
                  >
                    Tümü
                    <span className="ml-1 tabular-nums text-[#9b9a97]">
                      {notes.length}
                    </span>
                  </button>
                </div>
              )}

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddNote}
                className="h-9 shrink-0 border-[#d9d9d6] bg-white px-3 text-xs font-medium text-[#37352f] shadow-none hover:bg-[#f7f7f5]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Yeni not
              </Button>
            </div>
          </div>

          {editor && (
            <div className="border-b border-[#eeeeeb] py-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-[#5f5e5a]">
                  {editor.note
                    ? "Notu düzenle"
                    : isPractice
                      ? "Yeni not"
                      : `Bölüm ${currentPartNumber ?? ""} için yeni not`}
                </p>
                {editor.note?.highlightedText && (
                  <span className="text-[11px] text-[#9b9a97]">Seçili metne bağlı</span>
                )}
              </div>

              {editor.note?.highlightedText && (
                <blockquote className="reading-text mb-3 max-h-24 overflow-y-auto whitespace-pre-wrap border-l-2 border-[#b8b7b2] pl-3 pr-1 font-sans">
                  {editor.note.highlightedText}
                </blockquote>
              )}

              <Textarea
                value={editor.value}
                onChange={(event) => setEditor({ ...editor, value: event.target.value })}
                placeholder="Notunuzu yazın"
                className="min-h-[92px] resize-none border-[#d9d9d6] bg-white text-sm leading-6 text-[#37352f] shadow-none placeholder:text-[#9b9a97] focus-visible:ring-1 focus-visible:ring-[#9b9a97]"
                autoFocus
              />

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditor(null)}
                  className="h-8 px-3 text-xs text-[#5f5e5a] hover:bg-[#f3f3f1]"
                >
                  İptal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={!editor.value.trim()}
                  className="h-8 bg-[#37352f] px-3 text-xs text-white shadow-none hover:bg-[#2f2f2c] disabled:bg-[#e3e3e0] disabled:text-[#9b9a97]"
                >
                  {editor.note ? "Kaydet" : "Ekle"}
                </Button>
              </div>
            </div>
          )}

          {sortedDisplayNotes.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-[#5f5e5a]">
                {isPractice
                  ? "Bu pratikte henüz not yok."
                  : showAllNotes
                    ? "Henüz not yok."
                    : "Bu bölümde not yok."}
              </p>
              <p className="mx-auto mt-1 max-w-[260px] text-xs leading-5 text-[#9b9a97]">
                Metni seçerek not ekleyebilir veya yukarıdan yeni bir not yazabilirsiniz.
              </p>
            </div>
          ) : (
            <div className="mt-1">
              {sortedDisplayNotes.map((note) => (
                <article
                  key={note.id}
                  className="border-b border-[#eeeeeb] py-4 last:border-b-0"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-[11px] text-[#9b9a97]">
                      {!isPractice ? (
                        <>
                          <span className="font-medium text-[#787774]">
                            Bölüm {note.partNumber ?? "—"}
                          </span>
                          <span aria-hidden="true">·</span>
                        </>
                      ) : null}
                      <time>
                        {new Date(note.createdAt).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-[#787774] hover:bg-[#f3f3f1] hover:text-[#37352f]"
                        onClick={() => handleEditNote(note)}
                        title="Notu düzenle"
                        aria-label="Notu düzenle"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-[#787774] hover:bg-[#fbeceb] hover:text-[#b42318]"
                        onClick={() => {
                          setEditor(null);
                          setDeletePendingId(note.id);
                        }}
                        title="Notu sil"
                        aria-label="Notu sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {note.highlightedText && (
                    <blockquote className="reading-text mb-2 max-h-24 overflow-y-auto whitespace-pre-wrap border-l-2 border-[#b8b7b2] pl-3 pr-1 font-sans">
                      {note.highlightedText}
                    </blockquote>
                  )}

                  <p className="whitespace-pre-wrap text-sm leading-6 text-[#37352f]">
                    {note.text}
                  </p>

                  {deletePendingId === note.id && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-[#f7f7f5] px-3 py-2">
                      <span className="text-xs text-[#5f5e5a]">Bu not silinsin mi?</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletePendingId(null)}
                          className="h-7 px-2 text-xs text-[#5f5e5a] hover:bg-white"
                        >
                          Vazgeç
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteNote(note.id)}
                          className="h-7 px-2 text-xs text-[#b42318] hover:bg-[#fbeceb]"
                        >
                          Sil
                        </Button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
