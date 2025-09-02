// types/listening.ts
export interface Answer {
  id: string;
  variantText?: string;
  answer: string;
  correct: boolean;
}

export interface Question {
  id: string;
  number: number;
  text: string;
  type: "TEXT_INPUT" | "MULTIPLE_CHOICE" | "MULTI_SELECT";
  answers: Answer[];
}

export interface Section {
  id: string;
  title: string;
  content?: string;
  imageUrl?: string | null;
  questions: Question[];
}

export interface Part {
  id: string;
  number: number;
  title: string;
  audioUrl?: string;
  sections: Section[];
}

export interface ListeningTestItem {
  id: string;
  title: string;
  description?: string;
  type: "LISTENING";
  ieltsId: string;
  parts: Part[];
}
