import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

interface Highlight {
  id: string;
  text: any;
}

export default function HighlightableText({ text }: { text: any }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: any;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // tanlangan textni olish
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const selectedText = selection.toString();
      if (selectedText.trim().length === 0) return;

      const rect = selection.getRangeAt(0).getBoundingClientRect();

      setTooltip({
        x: rect.left + rect.width / 2,
        y: rect.top - 30,
        text: selectedText,
      });
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // highlight qilish
  const handleHighlight = () => {
    if (!tooltip) return;

    const exists = highlights.find((h) => h.text === tooltip.text);

    if (exists) {
      // agar allaqachon mavjud bo‘lsa → o‘chirib tashlaymiz
      setHighlights((prev) => prev.filter((h) => h.id !== exists.id));
    } else {
      // yangi highlight qo‘shamiz
      setHighlights((prev) => [
        ...prev,
        { id: Date.now().toString(), text: tooltip.text },
      ]);
    }

    setTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  // textni render qilish (highlightlarni qo‘yib)
  const getHighlightedText = () => {
    if (highlights.length === 0) return text;

    let modified = text;
    highlights.forEach((h) => {
      // oddiy replace → birinchi topilganini highlight qiladi
      // ko‘proq moslashtirish uchun regex ishlatish mumkin
      modified = modified.replace(
        h.text,
        `<mark class="bg-yellow-300">${h.text}</mark>`
      );
    });
    return modified;
  };

  return (
    <div ref={containerRef} className="relative">
      <p
        className="leading-relaxed text-gray-700 whitespace-pre-line"
        dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
      />

      {tooltip && (
        <div
          className="absolute bg-black text-white text-xs px-3 py-2 rounded shadow-lg flex items-center gap-2 z-50"
          style={{
            top:
              tooltip.y +
              window.scrollY -
              containerRef.current!.getBoundingClientRect().top,
            left:
              tooltip.x - containerRef.current!.getBoundingClientRect().left,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span>
            {highlights.find((h) => h.text === tooltip.text)
              ? "Olib tashlansinmi?"
              : "Belgilansinmi?"}
          </span>
          <Button
            size="sm"
            className="bg-yellow-400 text-black hover:bg-yellow-500"
            onClick={handleHighlight}
          >
            {highlights.find((h) => h.text === tooltip.text)
              ? "Olib tashla"
              : "Belgila"}
          </Button>
        </div>
      )}
    </div>
  );
}
