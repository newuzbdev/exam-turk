import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TestHeaderProps {
  testTitle: string;
  currentQuestion: number;
  totalQuestions: number;
  currentSubPart?: string;
  onBack: () => void;
}

const TestHeader = ({ currentQuestion, totalQuestions, currentSubPart, onBack }: TestHeaderProps) => {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full safe-area-top">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between gap-3 h-16 sm:h-[68px]">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo11.svg" alt="TURKISHMOCK" className="h-9 sm:h-10 md:h-11 w-auto object-contain" />
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-1.5 text-gray-600 hover:text-red-600 px-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri Dön
            </Button>
            <h1 className="font-semibold text-base sm:text-lg tracking-[0.08em] text-gray-900 truncate">
              KONUÞMA
            </h1>
          </div>
          <div className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
            {currentSubPart ? `${currentSubPart} - Soru ${currentQuestion}` : `Soru ${currentQuestion} / ${totalQuestions}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestHeader;

