export interface MockReviewAnswer {
  variantText: string;
  text: string;
  correct: boolean;
}

export interface MockReviewEvidenceSpan {
  evidenceText: string;
  textStart: number;
  textEnd: number;
}

export interface MockReviewTranscriptSegment {
  text: string;
  textStart: number;
  textEnd: number;
  audioStartMs: number;
  audioEndMs: number;
  confidence: number;
}

export interface MockReviewQuestion {
  questionId: string;
  number: number;
  text: string;
  questionType?: string;
  questionContent?: string;
  questionImageUrl?: string | null;
  userAnswer: string | string[];
  isCorrect: boolean;
  answers: MockReviewAnswer[];
  evidenceText: string;
  explanation: string;
  textStart: number;
  textEnd: number;
  evidenceSpans?: MockReviewEvidenceSpan[];
  audioStartMs: number | null;
  audioEndMs: number | null;
  distractorExplanations: Record<string, string> | null;
}

export interface MockReviewSection {
  sectionId: string;
  title: string;
  partNumber?: number;
  partTitle?: string;
  instruction?: string;
  hasBullets?: boolean;
  imageUrl?: string | null;
  sourceText: string;
  formattedSourceText?: string;
  transcriptSegments?: MockReviewTranscriptSegment[];
  questions: MockReviewQuestion[];
}

export interface MockReviewV1 {
  version: 1;
  testId: string;
  testType: "READING" | "LISTENING";
  testTitle: string;
  contentRevision: number;
  sections: MockReviewSection[];
}

export interface ReviewQuestionView extends MockReviewQuestion {
  sectionId: string;
  sectionTitle: string;
  sourceText: string;
}

export interface EvidenceTextSegment {
  text: string;
  questionIds: string[];
  highlighted: boolean;
}

export const flattenReviewQuestions = (
  review?: MockReviewV1 | null,
): ReviewQuestionView[] =>
  (review?.sections || []).flatMap((section) =>
    (section.questions || []).map((question) => ({
      ...question,
      sectionId: section.sectionId,
      sectionTitle: section.title,
      sourceText: section.sourceText,
    })),
  );

export const answerValues = (value: string | string[]): string[] =>
  (Array.isArray(value) ? value : [value])
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);

export const isBlankReviewAnswer = (value: string | string[]): boolean =>
  answerValues(value).length === 0;

export const formatReviewAnswer = (value: string | string[]): string => {
  const values = answerValues(value);
  return values.length > 0 ? values.join(" / ") : "Cevap verilmedi";
};

export const formatCorrectAnswers = (answers: MockReviewAnswer[]): string => {
  const values = (answers || [])
    .filter((answer) => answer.correct)
    .map((answer) => {
      const variant = String(answer.variantText || "").trim();
      const text = String(answer.text || "").trim();
      if (variant && text && variant !== text) return `${variant} - ${text}`;
      return variant || text;
    })
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  return values.length > 0 ? values.join(" / ") : "Belirtilmedi";
};

export const getQuestionEvidenceSnippets = (
  question?: MockReviewQuestion | null,
): string[] => {
  if (!question) return [];

  const candidates =
    Array.isArray(question.evidenceSpans) &&
    question.evidenceSpans.length > 0
      ? question.evidenceSpans.map((span) => span.evidenceText)
      : [question.evidenceText];

  return Array.from(
    new Set(
      candidates
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
};

export const summarizeReviewQuestions = (
  review?: MockReviewV1 | null,
): { correct: number; total: number } => {
  const questions = flattenReviewQuestions(review);
  return {
    correct: questions.filter((question) => question.isCorrect).length,
    total: questions.length,
  };
};

export const buildEvidenceSegments = (
  section: MockReviewSection,
): EvidenceTextSegment[] => {
  const source = String(section.sourceText || "");
  if (!source) return [];

  const ranges = (section.questions || [])
    .flatMap((question) => {
      const spans =
        Array.isArray(question.evidenceSpans) &&
        question.evidenceSpans.length > 0
          ? question.evidenceSpans
          : [
              {
                evidenceText: question.evidenceText,
                textStart: question.textStart,
                textEnd: question.textEnd,
              },
            ];
      return spans.map((span) => ({
        questionId: question.questionId,
        start: span.textStart,
        end: span.textEnd,
        evidenceText: span.evidenceText,
      }));
    })
    .filter(
      (range) =>
        Number.isInteger(range.start) &&
        Number.isInteger(range.end) &&
        range.start >= 0 &&
        range.end > range.start &&
        range.end <= source.length &&
        source.slice(range.start, range.end) === range.evidenceText,
    )
    .sort((left, right) => left.start - right.start || left.end - right.end);

  if (ranges.length === 0) {
    return [{ text: source, questionIds: [], highlighted: false }];
  }

  const boundaries = Array.from(
    new Set([0, source.length, ...ranges.flatMap((range) => [range.start, range.end])]),
  ).sort((left, right) => left - right);

  const segments = boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const questionIds = ranges
      .filter((range) => range.start <= start && range.end >= end)
      .map((range) => range.questionId);

    return {
      text: source.slice(start, end),
      questionIds,
      highlighted: questionIds.length > 0,
    };
  });

  return segments.reduce<EvidenceTextSegment[]>((merged, segment) => {
    if (!segment.text) return merged;
    const previous = merged[merged.length - 1];
    const sameQuestions =
      previous &&
      previous.questionIds.length === segment.questionIds.length &&
      previous.questionIds.every(
        (questionId, index) => questionId === segment.questionIds[index],
      );

    if (sameQuestions) {
      previous.text += segment.text;
      return merged;
    }

    merged.push(segment);
    return merged;
  }, []);
};

export const splitEvidenceText = (
  source: string,
  start: number,
  end: number,
  expectedEvidence: string,
): { before: string; evidence: string; after: string; valid: boolean } => {
  const valid =
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    end > start &&
    end <= source.length &&
    source.slice(start, end) === expectedEvidence;

  if (!valid) {
    return { before: source, evidence: "", after: "", valid: false };
  }

  return {
    before: source.slice(0, start),
    evidence: source.slice(start, end),
    after: source.slice(end),
    valid: true,
  };
};

export const getSelectedDistractorExplanation = (
  question: MockReviewQuestion,
): string | null => {
  const explanations = question.distractorExplanations;
  if (!explanations) return null;
  for (const answer of answerValues(question.userAnswer)) {
    const explanation = explanations[answer];
    if (typeof explanation === "string" && explanation.trim()) {
      return explanation.trim();
    }
  }
  return null;
};
