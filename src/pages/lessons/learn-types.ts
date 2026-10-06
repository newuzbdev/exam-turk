export type LearnLevel = "STARTER" | "A1" | "A2" | "B1" | "B2" | "C1";

export type LearnContentBlockType =
  | "HEADING"
  | "TEXT"
  | "EXAMPLE"
  | "CALLOUT"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "GRAMMAR_PATTERN"
  | "COMMON_MISTAKE"
  | "EXAM_TIP"
  | "VOCABULARY_LIST"
  | "MINI_QUESTION"
  | "FINAL_EXERCISE";

export type LearnQuestionType =
  | "MULTIPLE_CHOICE"
  | "MULTI_SELECT"
  | "TRUE_FALSE"
  | "TEXT_INPUT"
  | "FILL_BLANK";

export type LearnProgressStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED";

export interface LearnCourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  levelKey: LearnLevel;
  levelLabel: string;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  sortOrder: number;
  moduleCount: number;
  lessonCount: number;
  totalEstimatedMinutes: number;
}

export interface LearnLessonSummary {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  estimatedMinutes: number;
  isPreview: boolean;
  sortOrder: number;
}

export interface LearnCourseModule {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: LearnLessonSummary[];
}

export interface LearnCourseDetail {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  levelKey: LearnLevel;
  levelLabel: string;
  thumbnailUrl: string | null;
  isFeatured: boolean;
  modules: LearnCourseModule[];
}

export interface LearnExerciseQuestion {
  id: string;
  type: LearnQuestionType;
  prompt: string;
  options: unknown;
  sortOrder: number;
  points: number;
}

export interface LearnExercise {
  id: string;
  title: string;
  instructions: string | null;
  type: string;
  isRequired: boolean;
  passingScore: number | null;
  maxAttempts: number | null;
  questions: LearnExerciseQuestion[];
}

export interface LearnContentBlock {
  id: string;
  type: LearnContentBlockType;
  sortOrder: number;
  title: string | null;
  text: string | null;
  mediaUrl: string | null;
  data: unknown;
  exercise?: LearnExercise;
}

export interface LearnLessonDetail {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  estimatedMinutes: number;
  isPreview: boolean;
  course: {
    id: string;
    slug: string;
    title: string;
    levelKey: LearnLevel;
    levelLabel: string;
  };
  module: {
    id: string;
    slug: string;
    title: string;
  };
  contentBlocks: LearnContentBlock[];
}

export interface LearnProgress {
  lessonId: string;
  status: LearnProgressStatus;
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string;
  lesson?: {
    id: string;
    slug: string;
    title: string;
  };
  module?: {
    id: string;
    slug: string;
    title: string;
  };
  course?: {
    id: string;
    slug: string;
    title: string;
    levelKey: LearnLevel;
    levelLabel: string;
  };
}

export interface LearnExerciseSubmitAnswer {
  questionId: string;
  answer:
    | { optionIndex: number }
    | { optionIndexes: number[] }
    | { value: boolean }
    | { value: string };
}

export interface LearnExerciseSubmissionResult {
  id: string;
  exerciseId: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  scorePercent: number;
  passingScore: number;
  passed: boolean;
  submittedAt: string;
  remainingAttempts: number | null;
  answers: Array<{
    questionId: string;
    isCorrect: boolean;
    earnedPoints: number;
    feedback: string;
  }>;
  progress: LearnProgress;
}

export interface LearnContinueLearning {
  lesson: {
    id: string;
    slug: string;
    title: string;
  };
  module: {
    id: string;
    slug: string;
    title: string;
  };
  course: {
    id: string;
    slug: string;
    title: string;
    levelKey: LearnLevel;
    levelLabel: string;
  };
  progress: LearnProgress | null;
}

export interface LearnSummary {
  completedLessons: number;
  inProgressLessons: number;
  totalTrackedLessons: number;
  submittedAttempts: number;
  successRate: number | null;
  activeLevelKey: LearnLevel | null;
  activeLevelLabel: string | null;
  lastLearnActivityAt: string | null;
}

export type LearnWeaknessStatus = "ACTIVE" | "IMPROVING" | "RESOLVED";
export type LearnWeaknessSourceType = "LEARN_EXERCISE";
export type LearnRecommendationTargetType = "LESSON" | "EXERCISE";

export interface LearnWeakness {
  id: string;
  severity: number;
  confidence: number;
  evidenceCount: number;
  correctCount: number;
  wrongCount: number;
  lastDetectedAt: string;
  status: LearnWeaknessStatus;
  sourceType: LearnWeaknessSourceType;
  skillTag: {
    id: string;
    key: string;
    title: string;
    description: string | null;
    category: string;
    level: LearnLevel | null;
    levelLabel: string | null;
  };
}

export interface LearnRecommendation {
  skillTag: LearnWeakness["skillTag"];
  reason: string;
  priority: number;
  targetType: LearnRecommendationTargetType;
  target:
    | {
        id: string;
        title: string;
        type: "LESSON";
        href: string;
        lessonId: string;
        lessonSlug: string;
        moduleTitle: string;
        courseTitle: string;
        levelLabel: string;
      }
    | {
        id: string;
        title: string;
        type: "EXERCISE";
        href: string;
        lessonId: string;
        lessonSlug: string;
        exerciseId: string;
        moduleTitle: string;
        courseTitle: string;
        levelLabel: string;
      };
}

export type LearnAiTeacherAction =
  | "LESSON_EXPLAIN"
  | "LESSON_EXAMPLE"
  | "LESSON_MINI_QUIZ"
  | "VOCAB_EXPLAIN"
  | "SIMPLIFY"
  | "START_GUIDED_LESSON"
  | "GUIDED_STUDENT_ANSWER"
  | "GUIDED_CONTINUE"
  | "GUIDED_REPEAT"
  | "GUIDED_EXAMPLE"
  | "GUIDED_FINISH";

export interface LearnAiGuidedState {
  enabled: boolean;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  lastAction: string;
  completedAt?: string | null;
  nextActions?: LearnAiTeacherAction[];
}

export interface LearnAiTeacherRequest {
  lessonId: string;
  mode: LearnAiTeacherAction;
  message: string;
  action?: LearnAiTeacherAction;
  conversationId?: string;
}

export interface LearnAiTeacherResponse {
  answer: string;
  conversationId?: string;
  messageId?: string;
  message?: {
    id: string;
    role: "ASSISTANT";
    content: string;
    createdAt: string;
  };
  mode: LearnAiTeacherAction;
  action: LearnAiTeacherAction;
  provider?: string;
  model?: string;
  source?: string;
  guidedState?: LearnAiGuidedState | null;
}

export interface LearnAiConversationSummary {
  id: string;
  title: string | null;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface LearnAiConversationMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | "TOOL";
  content: string | null;
  createdAt: string;
  promptKey?: string | null;
  promptVersion?: string | null;
  provider?: string | null;
  model?: string | null;
}

export interface LearnAiConversationMessagesResponse {
  conversation: {
    id: string;
    title: string | null;
    sourceType: string;
    sourceId: string | null;
    lessonId: string | null;
    lastMessageAt: string | null;
    createdAt: string;
  };
  messages: LearnAiConversationMessage[];
  guidedState?: LearnAiGuidedState | null;
}
