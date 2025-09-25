import { Button } from "../ui/button";
import ReadingPart1 from "./ui/ReadingPart1";
import ReadingPart2 from "./ui/ReadingPart2";
import ReadingPart4 from "./ui/ReadingPart4";
import ReadingPart5 from "./ui/ReadingPart5";

export default function ReadingPage() {
  return (
    <div className="ReadingPage">
      <div className="bg-white px-6 py-3 flex items-center justify-between">
        <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-lg">
          TURKISHMOCK
        </div>
        <div className="font-bold text-2xl">Reading</div>
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg">60:00</div>

          <Button className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">
            GÖNDER
          </Button>
        </div>
      </div>
      <ReadingPart1 />
      <ReadingPart2 />
      {/* Part 3 can be added similarly */}
      <ReadingPart4 />
      <ReadingPart5 />
    </div>
  )
}
