import { useState, useEffect, useCallback } from "react";
import { Clock, Play, Pause, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  onStart?: () => void;
  autoStart?: boolean;
  showControls?: boolean;
  type: "preparation" | "answer";
  isActive?: boolean;
}

export const Timer = ({
  duration,
  onComplete,
  onStart,
  autoStart = false,
  showControls = false,
  type,
  isActive = true,
}: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [hasStarted, setHasStarted] = useState(autoStart);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const startTimer = useCallback(() => {
    if (!hasStarted && onStart) {
      onStart();
    }
    setIsRunning(true);
    setHasStarted(true);
  }, [hasStarted, onStart]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resetTimer = useCallback(() => {
    setTimeLeft(duration);
    setIsRunning(false);
    setHasStarted(false);
  }, [duration]);

  useEffect(() => {
    setTimeLeft(duration);
    setIsRunning(autoStart);
    setHasStarted(autoStart);
  }, [duration, autoStart]);

  useEffect(() => {
    if (!isActive) {
      setIsRunning(false);
      return;
    }

    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            // Only auto-complete for preparation phase
            if (type === "preparation") {
              onComplete();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, onComplete, isActive, type]);

  const getTimerColor = () => {
    if (type === "preparation") {
      return timeLeft <= 10 ? "text-orange-600" : "text-blue-600";
    } else {
      return timeLeft <= 10 ? "text-red-600" : "text-green-600";
    }
  };

  const getBackgroundColor = () => {
    if (type === "preparation") {
      return timeLeft <= 10
        ? "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
        : "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200";
    } else {
      return timeLeft <= 10
        ? "bg-gradient-to-br from-red-50 to-red-100 border-red-200"
        : "bg-gradient-to-br from-green-50 to-green-100 border-green-200";
    }
  };

  const getProgressPercentage = () => {
    return ((duration - timeLeft) / duration) * 100;
  };

  return (
    <div
      className={`p-5 rounded-lg border ${getBackgroundColor()} transition-all duration-300 max-w-md mx-auto`}
    >
      <div className="flex flex-col items-center justify-center mb-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
            type === "preparation"
              ? timeLeft <= 10
                ? "bg-orange-500"
                : "bg-blue-500"
              : timeLeft <= 10
              ? "bg-red-500"
              : "bg-green-500"
          }`}
        >
          <Clock className="h-6 w-6 text-white" />
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-gray-700 mb-1">
            {type === "preparation" ? "Hazırlanma Süresi" : "Cevap Süresi"}
          </p>
          <p className={`text-3xl font-bold ${getTimerColor()} font-mono`}>
            {formatTime(timeLeft)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-white/50 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            type === "preparation"
              ? timeLeft <= 10
                ? "bg-orange-500"
                : "bg-blue-500"
              : timeLeft <= 10
              ? "bg-red-500"
              : "bg-green-500"
          }`}
          style={{ width: `${getProgressPercentage()}%` }}
        ></div>
      </div>

      {showControls && (
        <div className="flex justify-center gap-2 mb-4">
          {!isRunning ? (
            <Button
              onClick={startTimer}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm"
              disabled={!isActive}
            >
              <Play className="h-3.5 w-3.5" />
              Başlat
            </Button>
          ) : (
            <Button
              onClick={pauseTimer}
              className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 text-sm"
            >
              <Pause className="h-3.5 w-3.5" />
              Duraklat
            </Button>
          )}
          <Button
            onClick={resetTimer}
            variant="outline"
            className="px-3 py-1.5 text-sm border-gray-300"
            disabled={!isActive}
          >
            Sıfırla
          </Button>
        </div>
      )}

      {timeLeft <= 10 && timeLeft > 0 && (
        <div className="flex items-center justify-center gap-1.5 p-2.5 bg-white/70 rounded-lg border border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-600 animate-pulse" />
          <p className="text-xs font-semibold text-orange-700 text-center">
            Süre bitiyor! Son {timeLeft} saniye
          </p>
        </div>
      )}

      {timeLeft === 0 && (
        <div className="flex items-center justify-center gap-1.5 p-2.5 bg-white/70 rounded-lg border border-red-200">
          <Clock className="h-4 w-4 text-red-600" />
          <p className="text-xs font-semibold text-red-700">Süre doldu!</p>
        </div>
      )}
    </div>
  );
};

export default Timer;
