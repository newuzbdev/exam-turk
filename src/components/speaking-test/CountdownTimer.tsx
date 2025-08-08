import { useState, useEffect } from "react";
import { Mic, Play } from "lucide-react";

interface CountdownTimerProps {
  seconds: number;
  onComplete: () => void;
  message?: string;
  type?: "preparation" | "answer";
  part?: 1 | 2 | 3;
}

export const CountdownTimer = ({
  seconds,
  onComplete,
  message = "Başlıyor...",
  type = "preparation",
  part = 1,
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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/95 to-black/95 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-10 text-center shadow-2xl border-2 border-gray-200 max-w-lg w-full mx-4">
        {/* Icon */}
        <div className="w-32 h-32 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
          <Mic className="h-16 w-16 text-white" />
        </div>

        {/* Title */}
        <h2 className="text-4xl font-bold text-gray-800 mb-6">{message}</h2>
        
        {/* Part-specific instructions */}
        <div className="bg-orange-50 rounded-xl p-6 mb-8 border-2 border-orange-200">
          <p className="text-2xl font-semibold text-orange-800">
            {type === "preparation" ? (
              part === 1 ? "Hazır olun, hemen başlayacak" : "Konuyu inceleyin ve hazırlanın"
            ) : (
              part === 1 ? "30-45 saniye doğal cevap verin" : "2 dakika süre ile konuşun"
            )}
          </p>
        </div>

        {/* Countdown Number */}
        <div className="relative mb-8">
          <div className="text-9xl font-bold text-transparent bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text animate-pulse">
            {timeLeft}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`w-40 h-40 rounded-full border-8 ${
                timeLeft <= 2 ? "border-red-500 animate-bounce" : "border-orange-500 animate-spin"
              } transition-all duration-500`}
              style={{ animationDuration: timeLeft <= 2 ? '0.5s' : '2s' }}
            ></div>
          </div>
        </div>

        {/* Message */}
        <div className="flex items-center justify-center gap-3 text-gray-700 mb-6">
          <Play className="h-8 w-8 text-orange-500" />
          <p className="text-2xl font-semibold">saniye sonra başlayacak</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 mb-6 shadow-inner">
          <div
            className="bg-gradient-to-r from-orange-400 to-orange-600 h-4 rounded-full transition-all duration-1000 ease-out shadow-sm"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>

        {/* Bottom message */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-lg font-medium text-green-800">
            🎤 Mikrofona yakın konuşun ve net sesle cevap verin
          </p>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
