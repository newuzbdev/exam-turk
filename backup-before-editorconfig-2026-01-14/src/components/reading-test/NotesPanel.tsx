import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StickyNote, Plus, Trash2, Edit2 } from "lucide-react";
import { useReadingNotes, type Note } from "@/contexts/ReadingNotesContext";
import HighlightableText from "@/pages/reading-test/components/HighlightableText";

interface NotesPanelProps {
  currentPartNumber?: number;
}

export default function NotesPanel({ currentPartNumber }: NotesPanelProps) {
  const { notes, addNote, updateNote, deleteNote, getNotesByPart } = useReadingNotes();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [noteDialog, setNoteDialog] = useState<{
    note: Note | null;
    isNew: boolean;
  } | null>(null);

  const displayNotes = (currentPartNumber && !showAllNotes)
    ? getNotesByPart(currentPartNumber)
    : notes;

  const handleAddNote = () => {
    setNoteDialog({
      note: null,
      isNew: true,
    });
  };

  const handleEditNote = (note: Note) => {
    setNoteDialog({
      note,
      isNew: false,
    });
  };

  const handleSaveNote = () => {
    if (!noteDialog) return;

    const noteText = (document.getElementById("note-textarea") as HTMLTextAreaElement)?.value.trim() || "";

    if (!noteText) {
      setNoteDialog(null);
      return;
    }

    if (noteDialog.isNew) {
      addNote({
        text: noteText,
        partNumber: currentPartNumber,
      });
    } else if (noteDialog.note) {
      // Preserve highlightedText when updating
      updateNote(noteDialog.note.id, noteText, noteDialog.note.highlightedText);
    }

    setNoteDialog(null);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm("Bu notu silmek istediğinizden emin misiniz?")) {
      deleteNote(noteId);
    }
  };

  return (
    <>
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative bg-white hover:bg-gray-50 border-gray-300"
          >
            <StickyNote className="w-4 h-4 mr-1" />
            Notlar
            {displayNotes.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {displayNotes.length}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto bg-gray-50">
          <SheetHeader className="pb-4 border-b border-gray-200">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <StickyNote className="w-5 h-5 text-yellow-600" />
              Notlarım
            </SheetTitle>
            {currentPartNumber && (
              <p className="text-sm text-gray-600 mt-1">
                {showAllNotes ? (
                  <>Tüm notlar: {notes.length} • Bölüm {currentPartNumber}: {getNotesByPart(currentPartNumber).length}</>
                ) : (
                  <>Bölüm {currentPartNumber}: {displayNotes.length} / {notes.length} not</>
                )}
              </p>
            )}
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={handleAddNote}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Not Ekle
              </Button>
              {currentPartNumber && notes.length > getNotesByPart(currentPartNumber).length && (
                <Button
                  onClick={() => setShowAllNotes(!showAllNotes)}
                  variant={showAllNotes ? "default" : "outline"}
                  className={`px-3 ${
                    showAllNotes 
                      ? "bg-blue-600 text-white hover:bg-blue-700" 
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                  title={showAllNotes ? "Sadece bu bölümü göster" : "Tüm notları göster"}
                >
                  {showAllNotes ? "Bölüm" : "Tümü"}
                </Button>
              )}
            </div>

            {displayNotes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <StickyNote className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-sm">Henüz not eklenmedi</p>
                <p className="text-xs mt-1 text-gray-400">Not eklemek için yukarıdaki butona tıklayın</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayNotes
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((note) => (
                    <div
                      key={note.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative group"
                    >
                      {/* Noted Words at the Top - Most Prominent */}
                      {note.highlightedText ? (
                        <div className="mb-3 pb-3 border-b-2 border-yellow-300 bg-yellow-50 -mx-4 -mt-4 px-4 pt-4 rounded-t-lg">
                          <div className="flex items-start gap-2">
                            <StickyNote className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-yellow-700 font-bold mb-1.5 uppercase tracking-wide">
                                Not Alınan Metin:
                              </p>
                              <p className="text-base text-gray-900 font-semibold leading-relaxed bg-yellow-200 px-3 py-2 rounded border border-yellow-400">
                                "{note.highlightedText}"
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-3 pb-3 border-b border-gray-200">
                          <div className="flex items-center gap-2 text-gray-500">
                            <StickyNote className="w-4 h-4" />
                            <p className="text-xs font-medium">Genel Not (Metin seçilmedi)</p>
                          </div>
                        </div>
                      )}

                      {/* Part Badge */}
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          note.partNumber === currentPartNumber
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          Bölüm {note.partNumber || "?"}
                        </span>
                        {note.partNumber && note.partNumber !== currentPartNumber && (
                          <span className="text-xs text-orange-600 font-medium">
                            (Farklı bölüm)
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed">
                        <HighlightableText text={note.text} partNumber={currentPartNumber} />
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-gray-400">
                            {new Date(note.createdAt).toLocaleString("tr-TR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {note.partNumber && note.partNumber !== currentPartNumber && (
                            <span className="text-xs text-blue-600 font-medium">
                              Bu not Bölüm {note.partNumber}'den
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => handleEditNote(note)}
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteNote(note.id)}
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Note Dialog */}
      <Dialog open={!!noteDialog} onOpenChange={(open) => !open && setNoteDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {noteDialog?.isNew ? "Yeni Not Ekle" : "Notu Düzenle"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              id="note-textarea"
              placeholder="Notunuzu buraya yazın..."
              defaultValue={noteDialog?.note?.text || ""}
              className="min-h-[150px]"
              autoFocus
            />
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setNoteDialog(null)}
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              İptal
            </Button>
            <Button 
              size="sm" 
              onClick={handleSaveNote}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {noteDialog?.isNew ? "Ekle" : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
