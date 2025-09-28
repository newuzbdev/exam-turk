import { Button } from "@/components/ui/button";
import { Mic, Square, Pause, Play } from "lucide-react";
import { useState, } from "react";

// Add CSS for animation
interface QuestionCardProps {
  question: {
    id: string;
    questionText: string;
    sectionTitle: string;
    sectionDescription?: string;
    subPartLabel?: string;
  };
  isRecording: boolean;
  isPaused: boolean;
  hasRecording: boolean;
  recordingDuration: number; // Add this prop to track recording duration
  onRecord: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNext: () => void;
  showNextButton: boolean;
  showCountdownAfterStop?: boolean;
  showCountdownAfterNext?: boolean;
}

const QuestionCard = ({
  question,
  isRecording,
  isPaused,
  hasRecording,
  recordingDuration,
  onRecord,
  onPause,
  onResume,
  onStop,
  onNext,
  showNextButton,
  showCountdownAfterStop = false,
  showCountdownAfterNext = false
}: QuestionCardProps) => {
  // Wrapper function for onStop that triggers countdown
  const handleStop = () => {
    onStop();
    if (showCountdownAfterStop) {
      setShowCountdownTimer(true);
      setCountdown(5);
      
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            setShowCountdownTimer(false);
            // After finishing a question, automatically go to next and start recording
            // This mirrors the behavior in handleNext when showCountdownAfterNext is enabled
            setTimeout(() => {
              onNext();
              // Small delay to let UI update to next question
              setTimeout(() => {
                onRecord();
              }, 300);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Wrapper function for onNext that triggers countdown
  const handleNext = () => {
    onNext();
    if (showCountdownAfterNext) {
      setShowCountdownTimer(true);
      setCountdown(5);
      
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            setShowCountdownTimer(false);
            // Automatically start recording after countdown completes
            setTimeout(() => {
              onRecord();
            }, 300);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };
  const [countdown, setCountdown] = useState(5);
  const [showCountdownTimer, setShowCountdownTimer] = useState(false);


  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 sm:p-5 border-b border-red-200">
        <div className="text-lg sm:text-xl text-red-800 font-semibold flex items-center gap-2">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          {question.sectionTitle}
          {question.subPartLabel && ` - ${question.subPartLabel}`}
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? isPaused
                  ? "bg-yellow-100 ring-4 ring-yellow-300"
                  : "bg-red-100 ring-4 ring-red-300 animate-pulse"
                : hasRecording
                  ? "bg-green-100 ring-4 ring-green-300"
                  : "bg-gray-100 ring-4 ring-gray-300"
            }`}>
              {isRecording ? (
                isPaused ? (
                  <Pause className="h-12 w-12 text-yellow-600" />
                ) : (
                  <Mic className="h-12 w-12 text-red-600 animate-pulse" />
                )
              ) : hasRecording ? (
                <svg className="h-12 w-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <Mic className="h-12 w-12 text-gray-600" />
              )}
            </div>
            
            {isRecording && (
              <div className="absolute -top-2 -right-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Question with large text - Centered and Black */}
        <div className="mb-8">
          <h3 className="text-4xl font-bold text-black mb-6 text-center leading-relaxed">
            {question.questionText}
          </h3>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          {!isRecording && !hasRecording && (
            <Button
              onClick={onRecord}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              <Mic className="h-6 w-6" />
              Kaydet
            </Button>
          )}

          {isRecording && !isPaused && (
            <>
              <Button
                onClick={onPause}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <Pause className="h-6 w-6" />
                Duraklat
              </Button>
              <Button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <Square className="h-6 w-6" />
                Durdur ve Gönder
              </Button>
            </>
          )}

          {isRecording && isPaused && (
            <>
              <Button
                onClick={onResume}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <Play className="h-6 w-6" />
                Devam Et
              </Button>
              <Button
                onClick={handleStop}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <Square className="h-6 w-6" />
                Durdur ve Gönder
              </Button>
            </>
          )}

          {hasRecording && !isRecording && (
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={onRecord}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <Mic className="h-6 w-6" />
                Yeni Kayıt
              </Button>
              <Button
                onClick={onNext}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Gönder
              </Button>
            </div>
          )}
        </div>

        {isRecording && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-red-600 font-medium text-lg">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              {isPaused ? "Kayıt duraklatıldı" : "Kayıt yapılıyor..."}
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-800">
              Süre: {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
            </div>
          </div>
        )}

        {hasRecording && !isRecording && (
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 text-green-600 font-medium text-lg">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Kayıt tamamlandı ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}s)
            </div>
          </div>
        )}

        {/* Next Question Button */}
        {showNextButton && (
          <div className="text-center">
            {showCountdownTimer ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-600 text-white text-2xl font-bold animate-pulse">
                {countdown}
              </div>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-red-600 hover:bg-red-700 text-white px-4 sm:px-5 py-2 text-sm sm:text-base"
              >
                Sonraki Soru
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard; 