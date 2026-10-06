interface ReadingQuestionNumberProps {
  number: number;
  className?: string;
}

export default function ReadingQuestionNumber({
  number,
  className = "",
}: ReadingQuestionNumberProps) {
  return (
    <span
      className={`reading-question-number inline-flex min-w-[2.5rem] shrink-0 items-center whitespace-nowrap font-sans text-[16px] font-semibold leading-6 text-[#37352f] tabular-nums ${className}`}
    >
      S{number}
    </span>
  );
}
