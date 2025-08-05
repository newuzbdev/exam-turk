import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TestHeaderProps {
  testTitle: string;
  currentQuestion: number;
  totalQuestions: number;
  onBack: () => void;
}

const TestHeader = ({ testTitle, currentQuestion, totalQuestions, onBack }: TestHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Geri Dön
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {testTitle}
            </h1>
            <p className="text-gray-600 text-sm">Konuşma Testi</p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {currentQuestion} / {totalQuestions}
        </div>
      </div>
    </div>
  );
};

export default TestHeader; 