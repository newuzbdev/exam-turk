import { Button } from "@/components/ui/button";
import { Mic, Square, Pause, Play } from "lucide-react";

interface QuestionCardProps {
  question: {
    id: string;
    questionText: string;
    sectionTitle: string;
    subPartLabel?: string;
  };
  isRecording: boolean;
  isPaused: boolean;
  hasRecording: boolean;
  onRecord: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNext: () => void;
  showNextButton: boolean;
}

const QuestionCard = ({
  question,
  isRecording,
  isPaused,
  hasRecording,
  onRecord,
  onPause,
  onResume,
  onStop,
  onNext,
  showNextButton
}: QuestionCardProps) => {
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="mb-4">
        <div className="text-sm text-gray-500 mb-2">
          {question.sectionTitle}
          {question.subPartLabel && ` - ${question.subPartLabel}`}
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          {question.questionText}
        </h3>

        <div className="flex justify-center gap-3 mb-4">
          {!hasRecording && !isRecording && (
            <Button
              onClick={onRecord}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3"
            >
              <Mic className="h-4 w-4 mr-2" />
              Kaydet
            </Button>
          )}

          {isRecording && !isPaused && (
            <>
              <Button
                onClick={onPause}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3"
              >
                <Pause className="h-4 w-4 mr-2" />
                Duraklat
              </Button>
              <Button
                onClick={onStop}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3"
              >
                <Square className="h-4 w-4 mr-2" />
                Durdur
              </Button>
            </>
          )}

          {isRecording && isPaused && (
            <>
              <Button
                onClick={onResume}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
              >
                <Play className="h-4 w-4 mr-2" />
                Devam Et
              </Button>
              <Button
                onClick={onStop}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3"
              >
                <Square className="h-4 w-4 mr-2" />
                Durdur
              </Button>
            </>
          )}

          {hasRecording && !isRecording && (
            <Button
              onClick={onRecord}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
            >
              <Mic className="h-4 w-4 mr-2" />
              Tekrar Kaydet
            </Button>
          )}
        </div>

        {isRecording && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-red-600 text-sm">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              {isPaused ? "Kayıt duraklatıldı" : "Kayıt yapılıyor..."}
            </div>
          </div>
        )}

        {hasRecording && !isRecording && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-green-600 text-sm">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Kayıt tamamlandı
            </div>
          </div>
        )}

        {/* Next Question Button */}
        {showNextButton && (
          <div className="text-center">
            <Button
              onClick={onNext}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
            >
              Sonraki Soru
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard; 