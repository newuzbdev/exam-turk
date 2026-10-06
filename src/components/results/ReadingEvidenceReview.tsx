import { useState } from "react";
import EvidenceReviewPanel from "./EvidenceReviewPanel";
import ReadingAnswerSummary from "./ReadingAnswerSummary";
import ReadingTextEvidenceView from "./ReadingTextEvidenceView";
import type { MockReviewV1 } from "./evidence-review-utils";

interface ReadingEvidenceReviewProps {
  resultId?: string;
  reviewAvailable?: boolean;
  review?: MockReviewV1 | null;
  showOutcomeCounts?: boolean;
}

export default function ReadingEvidenceReview({
  resultId,
  reviewAvailable,
  review,
  showOutcomeCounts = false,
}: ReadingEvidenceReviewProps) {
  const [view, setView] = useState<"questions" | "text">("questions");

  if (!reviewAvailable || !review || review.sections.length === 0) {
    return (
      <EvidenceReviewPanel
        reviewAvailable={reviewAvailable}
        review={review}
        sourceLabel="Metindeki kanıt"
      />
    );
  }

  return (
    <>
      {view === "questions" ? (
        <ReadingAnswerSummary
          review={review}
          resultId={resultId}
          onOpenExamReview={() => setView("text")}
          showOutcomeCounts={showOutcomeCounts}
        />
      ) : (
        <ReadingTextEvidenceView
          review={review}
          onClose={() => setView("questions")}
        />
      )}
    </>
  );
}
