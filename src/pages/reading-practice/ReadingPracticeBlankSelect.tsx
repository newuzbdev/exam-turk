import { useEffect, useState, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ReadingPracticeBlankSelectProps {
  number: number;
  value: string;
  choices: { value: string; disabled?: boolean; usedInBlank?: number }[];
  onSelect: (value: string) => void;
  keepLegacyInteraction?: boolean;
  children: ReactNode;
}

export default function ReadingPracticeBlankSelect({
  number,
  value,
  choices,
  onSelect,
  keepLegacyInteraction,
  children,
}: ReadingPracticeBlankSelectProps) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!mobile || keepLegacyInteraction) return children;

  return (
    <Select value={value || "__none__"} onValueChange={(next) => onSelect(next === "__none__" ? "" : next)}>
      <SelectTrigger
        aria-label={`${number}. boşluk için kelime seç`}
        className={`reading-practice-blank-select mx-1 inline-flex h-11 min-h-11 w-auto min-w-24 max-w-full items-center gap-2 px-2 py-1 align-baseline font-medium text-[#37352f] ${value ? "border-[#b4bdc3]" : "border-dashed border-[#aeb7bd]"}`}
      >
        <SelectValue>{value || number}</SelectValue>
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={5}
        collisionPadding={12}
        className="reading-practice-blank-options z-[150] min-w-[210px] max-w-[calc(100vw-24px)] border-[#d8d8d4] bg-white text-[#37352f]"
      >
        <SelectItem value="__none__" className="min-h-11 text-base text-[#777570]">
          {value ? "Seçimi temizle" : "Kelime seç"}
        </SelectItem>
        {choices.map((choice) => (
          <SelectItem
            key={choice.value}
            value={choice.value}
            disabled={choice.disabled}
            aria-label={choice.usedInBlank && choice.value !== value ? `${choice.value}, ${choice.usedInBlank}. boşlukta` : choice.value}
            className="min-h-11 text-base data-[disabled]:opacity-40"
          >
            <span>{choice.value}</span>
            {choice.usedInBlank && choice.value !== value ? (
              <span className="ml-2 text-xs text-[#777570]">{choice.usedInBlank}. boşlukta</span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
