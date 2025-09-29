import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import ReadingPart1 from "./ui/ReadingPart1";
import ReadingPart2 from "./ui/ReadingPart2";
import ReadingPart3 from "./ui/ReadingPart3";
import ReadingPart4 from "./ui/ReadingPart4";
import ReadingPart5 from "./ui/ReadingPart5";

export default function ReadingPage() {
  const [timeLeft, setTimeLeft] = useState(60 * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const sections = [
    { id: 1, numbers: [1, 2, 3, 4, 5, 6] },
    { id: 2, numbers: [7, 8, 9, 10, 11, 12, 13, 14] },
    { id: 3, numbers: [15, 16, 17, 18, 19, 20] },
    { id: 4, numbers: [21, 22, 23, 24, 25, 26, 27, 28, 29] },
    { id: 5, numbers: [30, 31, 32, 33, 34, 35] },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header (Listening style) */}
      <div className="bg-white px-6 py-3 border-b-2 border-gray-200 flex items-center justify-between sticky top-0 z-10">
        <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-lg">TURKISHMOCK</div>
        <div className="font-bold text-2xl">Reading</div>
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg">{formatTime(timeLeft)}</div>
          <Button className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">GÖNDER</Button>
        </div>
      </div>

      {/* Parts with fake data */}
      <ReadingPart1 />
      <ReadingPart2 />
      <ReadingPart3 />
      <ReadingPart4 />
      <ReadingPart5 />

      {/* Footer navigation (Listening-like) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-3">
        <div className="max-w-7xl mx-auto flex justify-center gap-2 flex-wrap">
          {sections.map((section) => (
            <div key={section.id} className="text-center border-2 rounded-lg p-2 min-w-fit bg-gray-50">
              <div className="flex gap-1 mb-1 justify-center flex-wrap">
                {section.numbers.map((q) => (
                  <div key={q} className="w-6 h-6 rounded-full border-2 border-gray-800 flex items-center justify-center text-xs font-bold bg-white">
                    {q}
                  </div>
                ))}
              </div>
              <div className="text-xs font-bold">{section.id}. BÖLÜM</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
