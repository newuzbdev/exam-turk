import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TestHeaderProps {
  testTitle: string;
  currentQuestion: number;
  totalQuestions: number;
  currentSubPart?: string;
  onBack: () => void;
}

const TestHeader = ({ testTitle, currentQuestion, totalQuestions, currentSubPart, onBack }: TestHeaderProps) => {
  return (
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50 shadow-sm w-full safe-area-top">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 py-3 sm:py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Geri Dön
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                {testTitle}
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm">Konuşma Testi</p>
            </div>
          </div>
          <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-semibold">
            {currentSubPart ? `${currentSubPart} - Soru ${currentQuestion}` : `Soru ${currentQuestion} / ${totalQuestions}`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestHeader; 