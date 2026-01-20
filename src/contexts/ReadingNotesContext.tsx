import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface Note {
  id: string;
  text: string;
  partNumber?: number;
  createdAt: number;
  highlightId?: string; // If note is tied to a highlight
  highlightedText?: string; // The text that was highlighted
}

interface ReadingNotesContextType {
  notes: Note[];
  addNote: (note: Omit<Note, "id" | "createdAt">) => Note;
  updateNote: (id: string, text: string, highlightedText?: string) => void;
  deleteNote: (id: string) => void;
  getNotesByPart: (partNumber: number) => Note[];
}

const ReadingNotesContext = createContext<ReadingNotesContextType | undefined>(undefined);

export function ReadingNotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);

  const addNote = (note: Omit<Note, "id" | "createdAt">): Note => {
    const newNote: Note = {
      ...note,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
    };
    setNotes((prev) => [...prev, newNote]);
    return newNote;
  };

  const updateNote = (id: string, text: string, highlightedText?: string) => {
    setNotes((prev) =>
      prev.map((note) => 
        note.id === id 
          ? { ...note, text, ...(highlightedText !== undefined && { highlightedText }) } 
          : note
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== id));
  };

  const getNotesByPart = (partNumber: number) => {
    return notes.filter((note) => note.partNumber === partNumber);
  };

  return (
    <ReadingNotesContext.Provider
      value={{ notes, addNote, updateNote, deleteNote, getNotesByPart }}
    >
      {children}
    </ReadingNotesContext.Provider>
  );
}

export function useReadingNotes() {
  const context = useContext(ReadingNotesContext);
  if (context === undefined) {
    throw new Error("useReadingNotes must be used within a ReadingNotesProvider");
  }
  return context;
}
