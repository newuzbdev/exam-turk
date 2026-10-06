import { useState } from "react";
import EvidenceReviewPanel from "./EvidenceReviewPanel";
import ReadingAnswerSummary from "./ReadingAnswerSummary";
import type { MockReviewV1 } from "./evidence-review-utils";
import ListeningTranscriptEvidenceView from "./ListeningTranscriptEvidenceView";

interface ListeningEvidenceReviewProps {
  resultId?: string;
  reviewAvailable?: boolean;
  review?: MockReviewV1 | null;
  showOutcomeCounts?: boolean;
}

export default function ListeningEvidenceReview({
  resultId,
  reviewAvailable,
  review,
  showOutcomeCounts = false,
}: ListeningEvidenceReviewProps) {
  const [view, setView] = useState<"questions" | "evidence">("questions");

  if (!reviewAvailable || !review || review.sections.length === 0) {
    return (
      <EvidenceReviewPanel
        reviewAvailable={reviewAvailable}
        review={review}
        sourceLabel="Transcript kanıtı"
      />
    );
  }

  if (view === "questions") {
    return (
      <ReadingAnswerSummary
        review={review}
        resultId={resultId}
        onOpenExamReview={() => setView("evidence")}
        reviewButtonLabel="Kanıtlarla incele"
        tone="listening"
        showOutcomeCounts={showOutcomeCounts}
      />
    );
  }

  return (
    <ListeningTranscriptEvidenceView
      resultId={resultId}
      review={review}
      onClose={() => setView("questions")}
    />
  );
}
