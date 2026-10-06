import { diffWritingCorrection } from "@/components/results/writing-result-display";

export default function SpeakingCorrectionText({
  original,
  corrected,
  side,
}: {
  original: string;
  corrected: string;
  side: "original" | "corrected";
}) {
  if (!corrected) return <>{original}</>;

  return <>{diffWritingCorrection(original, corrected).map((segment, index) => {
    if (segment.type === (side === "original" ? "added" : "removed")) return null;
    if (segment.type === "equal") return <span key={index}>{segment.text}</span>;
    return (
      <span key={index} className={side === "original" ? "font-medium text-[#b84a45]" : "font-medium text-[#356b40]"}>
        {segment.text}
      </span>
    );
  })}</>;
}
