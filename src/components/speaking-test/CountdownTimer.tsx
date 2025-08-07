import { useState, useEffect } from "react";
import { Mic, Play } from "lucide-react";

interface CountdownTimerProps {
  seconds: number;
  onComplete: () => void;
  message?: string;
}

export const CountdownTimer = ({
  seconds,
  onComplete,
  message = "Başlıyor...",
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(seconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, onComplete]);

  // Calculate progress percentage
  const progressPercentage = ((seconds - timeLeft) / seconds) * 100;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/90 to-black/95 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white to-gray-100 rounded-3xl p-8 text-center shadow-2xl border border-gray-200 max-w-md w-full mx-4">
        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Mic className="h-12 w-12 text-white" />
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">{message}</h2>

        <div className="relative mb-6">
          <div className="text-7xl font-bold text-transparent bg-gradient-to-r from-red-500 to-red-600 bg-clip-text">
            {timeLeft}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-28 h-28 rounded-full border-4 ${
                timeLeft <= 3 ? "border-red-500 animate-pulse" : "border-blue-500"
              } transition-all duration-300`}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
          <Play className="h-5 w-5 text-red-500" />
          <p className="text-lg font-medium">saniye sonra başlayacak</p>
        </div>

        {/* Progress indicator */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-red-500 h-2 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        <p className="text-gray-500 text-sm">
          Hazırlanın ve net konuşmaya dikkat edin
        </p>
      </div>
    </div>
  );
};

export default CountdownTimer;
