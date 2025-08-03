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

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/80 to-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-12 text-center shadow-2xl border border-gray-200 max-w-md w-full mx-4">
        <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
          <Mic className="h-12 w-12 text-white" />
        </div>

        <h2 className="text-3xl font-bold text-gray-800 mb-6">{message}</h2>

        <div className="relative mb-8">
          <div className="text-8xl font-bold text-transparent bg-gradient-to-r from-red-500 to-red-600 bg-clip-text">
            {timeLeft}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-32 h-32 rounded-full border-4 border-gray-200 ${
                timeLeft <= 1 ? "border-red-500" : "border-blue-500"
              } transition-all duration-300`}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-600">
          <Play className="h-5 w-5 text-red-500" />
          <p className="text-lg font-medium">saniye sonra başlayacak</p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center gap-1 mt-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full animate-pulse ${
                i < 3 - timeLeft ? "bg-red-500" : "bg-gray-300"
              }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
