export const WORKBOOK_CATEGORIES = ['listening', 'reading', 'writing', 'speaking', 'grammar'] as const;
export const WORKBOOK_TONES = ['plain', 'gray', 'green', 'yellow'] as const;
export const WORKBOOK_COVERS = ['headphones', 'notes', 'choices', 'conversation', 'gaps', 'clock'] as const;
export const WORKBOOK_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;

export type Category = (typeof WORKBOOK_CATEGORIES)[number];
export type Tone = (typeof WORKBOOK_TONES)[number];
export type Cover = (typeof WORKBOOK_COVERS)[number];
export type WorkbookStatus = (typeof WORKBOOK_STATUSES)[number];
export type VideoSource = { kind: 'youtube'; id: string } | { kind: 'file'; url: string };
export type WorkbookStyle = {
  textColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  width?: number;
};

export type WorkbookBlock = { id: string; tone: Tone; style?: WorkbookStyle } & (
  | { kind: 'heading'; text: string; level: 2 | 3 }
  | { kind: 'text' | 'quote'; text: string }
  | { kind: 'tip'; title: string; text: string }
  | { kind: 'image'; url: string; alt: string; caption: string }
  | { kind: 'table'; headers: string[]; rows: { id: string; cells: string[]; tone: Tone }[] }
  | { kind: 'blank'; title: string; instruction: string; before: string; after: string; acceptedAnswers?: string[]; explanation?: string; exerciseId?: string; questionId?: string }
  | { kind: 'choice'; title: string; instruction: string; options: { id: string; text: string }[]; correctOptionId?: string; explanation?: string; exerciseId?: string; questionId?: string }
  | { kind: 'reflection'; title: string; instruction: string; exampleAnswer: string; checklist: string[] }
);

export type WorkbookDocument = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: Category;
  cover: Cover;
  video: VideoSource | null;
  isDemo: boolean;
  status: WorkbookStatus;
  revision: number;
  updatedAt: string;
  blocks: WorkbookBlock[];
};

export type WorkbookDocumentSummary = Omit<WorkbookDocument, 'blocks'>;
export type FixedAnswerBlock = Extract<WorkbookBlock, { kind: 'blank' | 'choice' }>;
export type ExerciseBlock = Extract<WorkbookBlock, { kind: 'blank' | 'choice' | 'reflection' }>;
export type WorkbookAnswer = { value: string; checked: boolean };
export type WorkbookFeedback = { kind: 'empty' | 'correct' | 'retry' | 'compare'; message: string };
export type StudentExerciseSubmission = {
  exerciseId: string;
  answers: Array<{ questionId: string; answer: { value: string } | { optionIndex: number } }>;
};
