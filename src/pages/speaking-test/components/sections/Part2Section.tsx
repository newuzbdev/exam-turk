import { useState,  } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Section } from "@/pages/speaking-test/SpeakingTest";
import { Timer } from "@/components/speaking-test/Timer";
import CountdownTimer from "@/components/speaking-test/CountdownTimer";
import { Pause, Play, Square } from "lucide-react";

interface Part2SectionProps {
  section: Section;
  sectionIndex: number;
  totalSections: number;
  onNextSection: () => void;
  onRecord: (questionId: string) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  isRecording: boolean;
  isPaused: boolean;
  hasRecording: boolean;
  currentlyRecordingQuestionId: string | null;
  answeredQuestions: Set<string>;
  recordingDuration: number;
}

const Part2Section = ({
  section,
  sectionIndex,
  totalSections,
  onNextSection,
  onRecord,
  onStop,
  onPause,
  onResume,
  isRecording,
  isPaused,
  hasRecording,
  answeredQuestions,
}: Part2SectionProps) => {
  // State for tracking current phase and timing
  const [currentPhase, setCurrentPhase] = useState<"instructions" | "preparation" | "speaking">("instructions");
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute preparation
  console.log(timeLeft)
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(5);

  // Get the first question for recording
  const getQuestion = () => {
    if (section.subParts.length > 0 && section.subParts[0].questions.length > 0) {
      return section.subParts[0].questions[0];
    }
    return null;
  };

  // Check if question is answered
  const isQuestionAnswered = () => {
    const question = getQuestion();
    return question ? answeredQuestions.has(question.id) : false;
  };

  // Handle start preparation
  const handleStartPreparation = () => {
    setCurrentPhase("preparation");
    setTimeLeft(60); // 1 minute
    setIsTimerRunning(true);
  };

  // Handle preparation timer complete
  const handlePreparationComplete = () => {
    setIsTimerRunning(false);
    setShowCountdown(true);
    setCountdownSeconds(5);
  };

  // Handle countdown complete
  const handleCountdownComplete = async () => {
    setShowCountdown(false);
    setCurrentPhase("speaking");
    setTimeLeft(120); // 2 minutes
    setIsTimerRunning(true);
    
    // Start recording
    const question = getQuestion();
    if (question) {
      try {
        await onRecord(question.id);
      } catch (error) {
        console.error("Error starting recording after countdown:", error);
      }
    }
  };

  // Handle speaking timer complete
  const handleSpeakingComplete = () => {
    setIsTimerRunning(false);
    if (isRecording) {
      onStop();
    }
  };

  // Handle timer complete based on current phase
  const handleTimerComplete = () => {
    if (currentPhase === "preparation") {
      handlePreparationComplete();
    } else if (currentPhase === "speaking") {
      handleSpeakingComplete();
    }
  };

  const question = getQuestion();

  // If we're showing countdown, render it
  if (showCountdown) {
    return (
      <CountdownTimer
        seconds={countdownSeconds}
        onComplete={handleCountdownComplete}
        message="Konuşma Zamanı"
        type="answer"
        part={2}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {section.title} - Bölüm {sectionIndex + 1}/{totalSections}
        </h2>
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-lg font-medium text-blue-800 whitespace-pre-line">
            {section.description}
          </p>
        </div>
      </div>

      {/* Image Display */}
      {section.images && section.images.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-base font-medium text-gray-900 mb-3">Görsel</h3>
          <div className="flex justify-center">
            <img
              src={section.images[0]}
              alt="Speaking test visual"
              className="max-w-full h-auto rounded-lg border border-gray-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://placehold.co/400x300?text=Görsel+Yüklenemedi";
              }}
            />
          </div>
        </div>
      )}

      {/* Phase-specific Content */}
      {currentPhase === "instructions" && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-8 border-2 border-blue-200 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-blue-800 mb-4">Bölüm Talimatları</h3>
          </div>
          
          <div className="bg-white rounded-lg p-6 mb-6 border border-blue-200">
            <p className="text-xl leading-relaxed text-gray-800">
              Size bir konu kartı verilecek. 1 dakika hazırlanabilir ve not alabilirsiniz. 
              Sonra konu hakkında 1-2 dakika konuşacaksınız.
              <br /><br />
              <strong>IELTS Formatı:</strong> Konu kartındaki tüm noktaları ele alın.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h4 className="text-lg font-semibold text-orange-800 mb-2">⏱️ Zamanlar</h4>
              <ul className="text-orange-700 space-y-1">
                <li>• Hazırlık: 1 dakika</li>
                <li>• Konuşma: 2 dakika</li>
              </ul>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-lg font-semibold text-green-800 mb-2">📝 Yapıcınız</h4>
              <ul className="text-green-700 space-y-1">
                <li>• Konuyu inceleyin</li>
                <li>• Ana noktaları belirleyin</li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={handleStartPreparation}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              Hazırım - Başlayalım! 🚀
            </button>
          </div>
        </div>
      )}

      {/* Preparation Phase */}
      {currentPhase === "preparation" && (
        <div className="space-y-4">
          <Timer
            duration={60}
            onComplete={handleTimerComplete}
            autoStart={true}
            showControls={true}
            type="preparation"
            part={2}
            isActive={isTimerRunning}
          />
          
          <div className="text-center">
            <Button 
              onClick={() => {
                setIsTimerRunning(false);
                setCurrentPhase("instructions");
              }}
              variant="outline"
              className="mr-2"
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {/* Speaking Phase */}
      {currentPhase === "speaking" && (
        <div className="space-y-4">
          <Timer
            duration={120}
            onComplete={handleTimerComplete}
            autoStart={true}
            showControls={false}
            type="answer"
            part={2}
            isActive={isTimerRunning}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Konuşma</CardTitle>
            </CardHeader>
            <CardContent>
              {question ? (
                <div className="space-y-4">
                  <p className="text-4xl font-bold text-gray-900 mb-6 text-center leading-relaxed">
                    {question.questionText}
                  </p>
                  
                  <div className="flex justify-center gap-3">
                    {!hasRecording && !isRecording && (
                      <Button
                        onClick={() => question && onRecord(question.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3"
                        disabled={true} // Disabled because recording started automatically
                      >
                        Kayıt Devam Ediyor...
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
                          onClick={onStop}
                          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <Square className="h-6 w-6" />
                          Durdur
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
                          onClick={onStop}
                          className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg flex items-center gap-3 rounded-xl shadow-md hover:shadow-lg transition-all"
                        >
                          <Square className="h-6 w-6" />
                          Durdur
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {isRecording && (
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 text-red-600">
                        <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                        {isPaused ? "Kayıt duraklatıldı" : "Kayıt yapılıyor..."}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Soru bulunamadı</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Completion */}
      {isQuestionAnswered() && currentPhase === "speaking" && !isTimerRunning && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h3 className="text-lg font-semibold text-green-800 mb-2">
            Bölüm Tamamlandı!
          </h3>
          <p className="text-green-700 mb-4">
            Bu bölümdeki konuşmanız kaydedildi.
          </p>
          <Button 
            onClick={onNextSection}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Sonraki Bölüm
          </Button>
        </div>
      )}
    </div>
  );
};

export default Part2Section;